/* =========================================================================
 * entities.js — Player, Enemy (Kanto Mačevac), Boss (Morski Grgo),
 * Friend (Bubling), Pickup. Global klase.
 * ========================================================================= */
class Entity {
  constructor(x, y, r) { this.x = x; this.y = y; this.r = r; this.vx = 0; this.vy = 0; this.dead = false; this.animT = 0; this.hurtT = 0; }
  applyKnockback(fromX, fromY, force) {
    const d = Utils.dist(this.x, this.y, fromX, fromY) || 1;
    this.vx += (this.x - fromX) / d * force; this.vy += (this.y - fromY) / d * force;
  }
  integrate(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 0.86; this.vy *= 0.86; }
}

/* ----------------------------------------------------------------- PLAYER */
class Player extends Entity {
  constructor(x, y) {
    super(x, y, CONFIG.player.radius);
    const p = CONFIG.player;
    this.health = p.startHealth; this.hunger = p.startHunger; this.stamina = p.startStamina;
    this.facing = -Math.PI / 2; this.moving = false;
    this.attackT = 0; this.attackCD = 0; this.invulnT = 0;
    this.isRunning = false; this.speedMult = 1;
  }
  update(dt, game) {
    const cfg = CONFIG.player, inp = game.input;
    this.animT += dt;
    this.attackT = Math.max(0, this.attackT - dt / cfg.attackDuration);
    this.attackCD = Math.max(0, this.attackCD - dt);
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);

    // Kretanje
    const mv = inp.move;
    this.moving = (mv.x || mv.y) ? true : false;
    // Kazna za glad: spor i slab kad je gladan
    const hungry = this.hunger < CONFIG.hunger.lowThreshold;
    this.speedMult = hungry ? 0.82 : 1;
    this.isRunning = inp.running && this.stamina > 1 && this.moving && !hungry;
    let speed = cfg.walkSpeed * this.speedMult * (this.isRunning ? cfg.runMult : 1);
    if (this.moving) {
      this.x += mv.x * speed * dt;
      this.y += mv.y * speed * dt;
      this.facing = Math.atan2(mv.y, mv.x);
    }
    this.integrate(dt);
    game.world.clampWorld(this);

    // Napad (Space / dugme NAPAD)
    if (inp.held('attack') && this.attackCD <= 0 && this.stamina >= cfg.attackCost && !hungry) {
      this.attackT = 1; this.attackCD = cfg.attackCooldown;
      this.stamina -= cfg.attackCost;
      this.hunger = Math.max(0, this.hunger - CONFIG.hunger.attackExtra);
      game.onPlayerAttack(this);
    } else if (inp.held('attack') && this.attackCD <= 0 && hungry && this.stamina >= cfg.attackCost) {
      // slab napad kad je gladan (manja šteta, sporiji)
      this.attackT = 1; this.attackCD = cfg.attackCooldown * 1.5;
      this.stamina -= cfg.attackCost;
      this.hunger = Math.max(0, this.hunger - CONFIG.hunger.attackExtra);
      game.onPlayerAttack(this, 0.65);
    }
  }
  hurt(dmg, fromX, fromY, source, game) {
    if (this.invulnT > 0 || this.dead) return;
    this.health = Math.max(0, this.health - dmg);
    this.hurtT = 0.5; this.invulnT = CONFIG.player.invulnTime;
    this.applyKnockback(fromX, fromY, 130);
    game.lastDamageSource = source;
    game.shake = 8;
    if (this.health <= 0) this.dead = true;
  }
  get attackDamage() { return CONFIG.player.attackDamage; }
}

/* ----------------------------------------------------------------- ENEMY */
class Enemy extends Entity {
  constructor(x, y) {
    super(x, y, CONFIG.enemy.radius);
    this.health = CONFIG.enemy.health; this.facing = 0; this.moving = false;
    this.home = { x, y }; this.target = { x, y }; this.wanderT = 0;
    this.attackCD = 0; this.swinging = false; this.swingT = 0; this.didHit = false; this.attackAnim = 0;
    this.defeatT = 0; this.dropSignal = false;
  }
  update(dt, game) {
    this.animT += dt;
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.defeatT > 0) {                  // animacija nestajanja
      this.defeatT -= dt;
      if (this.defeatT <= 0) this.dead = true;
      this.integrate(dt); return;
    }
    const cfg = CONFIG.enemy, p = game.player;
    const detect = game.dayNight.isNight ? cfg.detectRangeNight : cfg.detectRange;
    const spd = cfg.speed * (game.dayNight.isNight ? cfg.speedNightMult : 1);
    const dToP = Utils.dist(this.x, this.y, p.x, p.y);
    const playerSafe = game.world.isInBurrow(p.x, p.y);

    this.attackCD = Math.max(0, this.attackCD - dt);
    if (this.swinging) {
      this.swingT += dt; this.attackAnim = Utils.clamp(this.swingT / 0.55, 0, 1);
      if (this.swingT >= cfg.attackWindup && !this.didHit) {
        this.didHit = true;
        if (!game.world.isInBurrow(p.x, p.y) && Utils.dist(this.x, this.y, p.x, p.y) <= cfg.attackRange + 10)
          p.hurt(cfg.damage, this.x, this.y, 'enemy', game);
      }
      if (this.swingT >= 0.6) { this.swinging = false; this.attackAnim = 0; }
      this.moving = false;
    } else if (dToP < detect && !playerSafe) {       // juri igrača
      this.moving = true; this.facing = Utils.angle(this.x, this.y, p.x, p.y);
      if (dToP <= cfg.attackRange && this.attackCD <= 0) {
        this.swinging = true; this.swingT = 0; this.didHit = false; this.attackCD = cfg.attackCooldown;
      } else if (dToP > cfg.attackRange - 4) {
        this.x += Math.cos(this.facing) * spd * dt; this.y += Math.sin(this.facing) * spd * dt;
      }
    } else {                                          // patrola/lutanje
      this.wanderT -= dt;
      if (this.wanderT <= 0 || Utils.dist(this.x, this.y, this.target.x, this.target.y) < 16) {
        this.wanderT = Utils.rand(1.4, 3.2);
        this.target = { x: this.home.x + Utils.rand(-cfg.wanderRadius, cfg.wanderRadius), y: this.home.y + Utils.rand(-cfg.wanderRadius, cfg.wanderRadius) };
      }
      const a = Utils.angle(this.x, this.y, this.target.x, this.target.y);
      this.facing = a; this.moving = true;
      this.x += Math.cos(a) * spd * 0.55 * dt; this.y += Math.sin(a) * spd * 0.55 * dt;
    }
    this.integrate(dt);
    game.world.clampWorld(this);
    game.world.pushOutOfBurrow(this);
  }
  hurt(dmg, fromX, fromY, game) {
    if (this.defeatT > 0) return;
    this.health -= dmg; this.hurtT = 0.3;
    this.applyKnockback(fromX, fromY, CONFIG.enemy.knockback);
    if (this.health <= 0) this.die(game);
  }
  die(game) { this.defeatT = 0.6; game.onEnemyDefeated(this); }
}

/* ----------------------------------------------------------------- BOSS */
class Boss extends Entity {
  constructor(x, y) {
    super(x, y, CONFIG.boss.radius);
    this.health = CONFIG.boss.health; this.maxHealth = CONFIG.boss.health;
    this.facing = Math.PI; this.state = 'roam';
    this.home = { x, y }; this.target = { x, y }; this.wanderT = 0;
    this.chargeCD = CONFIG.boss.chargeCooldown; this.biteCD = 0;
    this.windupT = 0; this.actionT = 0; this.chargeDir = 0; this.attackAnim = 0;
    this.engaged = false; this.defeatTimer = 0;
  }
  update(dt, game) {
    const cfg = CONFIG.boss, p = game.player;
    this.animT += dt; this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.state === 'defeated') {
      this.defeatTimer -= dt; this.integrate(dt);
      if (this.defeatTimer <= 0 && !this.dead) { this.dead = true; game.onBossDefeated(); }
      return;
    }
    this.chargeCD = Math.max(0, this.chargeCD - dt);
    this.biteCD = Math.max(0, this.biteCD - dt);
    const dToP = Utils.dist(this.x, this.y, p.x, p.y);
    const playerSafe = game.world.isInBurrow(p.x, p.y);
    this.engaged = dToP < cfg.detectRange + 80 && !playerSafe;

    if (this.state === 'windup') {
      this.windupT -= dt; this.attackAnim = 1;
      this.facing = Utils.angle(this.x, this.y, p.x, p.y);
      if (this.windupT <= 0) { this.state = 'charge'; this.actionT = cfg.chargeDuration; this.chargeDir = this.facing; }
    } else if (this.state === 'charge') {
      this.actionT -= dt;
      this.x += Math.cos(this.chargeDir) * cfg.chargeSpeed * dt;
      this.y += Math.sin(this.chargeDir) * cfg.chargeSpeed * dt;
      if (!playerSafe && Utils.circlesHit(this.x, this.y, this.r, p.x, p.y, p.r))
        p.hurt(cfg.chargeDamage, this.x, this.y, 'boss', game);
      if (this.actionT <= 0) { this.state = 'roam'; this.attackAnim = 0; this.chargeCD = cfg.chargeCooldown; }
    } else if (dToP < cfg.detectRange && !playerSafe) {   // juri
      this.state = 'chase'; this.facing = Utils.angle(this.x, this.y, p.x, p.y);
      if (this.chargeCD <= 0 && dToP > cfg.biteRange) { this.state = 'windup'; this.windupT = cfg.chargeWindup; }
      else {
        this.x += Math.cos(this.facing) * cfg.speed * dt; this.y += Math.sin(this.facing) * cfg.speed * dt;
        if (dToP <= cfg.biteRange && this.biteCD <= 0) {
          this.biteCD = cfg.biteCooldown; this.attackAnim = 1; this.state = 'bite';
          if (!playerSafe) p.hurt(cfg.biteDamage, this.x, this.y, 'boss', game);
        }
      }
    } else {                                              // lutanje kod kaveza
      this.state = 'roam'; this.attackAnim = Math.max(0, this.attackAnim - dt * 3);
      this.wanderT -= dt;
      if (this.wanderT <= 0 || Utils.dist(this.x, this.y, this.target.x, this.target.y) < 30) {
        this.wanderT = Utils.rand(2, 4);
        this.target = { x: this.home.x + Utils.rand(-220, 220), y: this.home.y + Utils.rand(-180, 180) };
      }
      this.facing = Utils.angle(this.x, this.y, this.target.x, this.target.y);
      this.x += Math.cos(this.facing) * cfg.speed * 0.5 * dt; this.y += Math.sin(this.facing) * cfg.speed * 0.5 * dt;
    }
    if (this.state === 'bite' && this.attackAnim > 0) { this.attackAnim -= dt * 3; if (this.attackAnim <= 0) this.state = 'chase'; }
    this.integrate(dt);
    game.world.clampWorld(this);
    game.world.pushOutOfBurrow(this);
  }
  hurt(dmg, fromX, fromY, game) {
    if (this.state === 'defeated') return;
    this.health -= dmg; this.hurtT = 0.25;
    this.applyKnockback(fromX, fromY, 40);
    if (this.health <= 0) { this.state = 'defeated'; this.defeatTimer = 1.4; this.health = 0; game.shake = 14; }
  }
}

/* ----------------------------------------------------------------- FRIEND (Bubling, Kora, Šiljo, Perla, Flopsi) */
class Friend extends Entity {
  // type: 'fish'|'octopus'|'urchin'|'clam'|'cucumber'; cage: {x,y} lokacija kaveza
  constructor(x, y, name, type, index, cage) {
    super(x, y, 16);
    this.state = 'caged'; this.name = name; this.type = type; this.index = index; this.followOrder = 0;
    this.cage = cage || { x, y }; this.homeSpot = null;
  }
  update(dt, game) {
    this.animT += dt;
    if (this.state === 'following') {
      // prati igrača u koloni (svaki spašeni malo iza prethodnog)
      const p = game.player, gap = 40 + this.followOrder * 24;
      const tx = p.x - Math.cos(p.facing) * gap, ty = p.y - Math.sin(p.facing) * gap - 10;
      this.x = Utils.lerp(this.x, tx, Math.min(1, dt * 6));
      this.y = Utils.lerp(this.y, ty, Math.min(1, dt * 6));
      if (game.world.isInBurrow(this.x, this.y)) { this.state = 'home'; game.onFriendHome(this); }
    } else if (this.state === 'home' && this.homeSpot) {
      // mirno se smesti na svoje mesto u jazbini
      this.x = Utils.lerp(this.x, this.homeSpot.x, Math.min(1, dt * 3));
      this.y = Utils.lerp(this.y, this.homeSpot.y, Math.min(1, dt * 3));
    }
  }
}

/* ----------------------------------------------------------------- PICKUP */
class Pickup extends Entity {
  // kind: 'coral','shell','seaweed','stone','token','signal'
  constructor(x, y, kind, slot = null) { super(x, y, 14); this.kind = kind; this.slot = slot; this.taken = false; }
  update(dt) { this.animT += dt; }
}
