/* =========================================================================
 * game.js — GameManager: glavna petlja, povezivanje sistema, spawnovi,
 * borba, win/lose, kamera, efekti, zvuk i pokretanje. Global: GameManager
 * ========================================================================= */
class GameManager {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.ui = new UIManager();
    this.world = new World();
    // sistemi
    this.hungerSys = new HungerSystem();
    this.staminaSys = new StaminaSystem();
    this.healthSys = new HealthSystem();
    this.foodSys = new FoodSystem();
    this.rescueSys = new RescueSystem();
    this.safeZone = new SafeZoneSystem();
    this.state = 'start';
    this.cam = { x: 0, y: 0 };
    this._initAudio();
    this.reset();
    this._bindMenu();
  }

  reset() {
    const w = this.world;
    this.player = new Player(w.start.x, w.start.y);
    this.inventory = new InventorySystem();
    this.dayNight = new DayNightCycle();
    this.quest = new QuestSignalSystem();
    this.decoration = new DecorationSystem();
    this.enemies = [];
    for (const pos of w.enemyPosts) this.enemies.push(new Enemy(pos.x, pos.y));
    for (const pos of w.cageGuards) { const e = new Enemy(pos.x, pos.y); e.isGuard = true; this.enemies.push(e); }
    this.boss = new Boss(w.bossStart.x, w.bossStart.y);
    this.friend = new Friend(w.cage.x, w.cage.y - 4);
    this.pickups = []; this.effects = []; this.toasts = [];
    this.foodSlots = [];
    for (const z of w.foodZones)
      for (let i = 0; i < z.n; i++) {
        const a = Math.random() * 7, rr = Math.random() * z.r * 0.85;
        this.foodSlots.push({ x: z.x + Math.cos(a) * rr, y: z.y + Math.sin(a) * rr, active: false, cooldown: 0 });
      }
    for (const s of this.foodSlots) this._spawnFood(s);
    // par besplatnih algi u jazbini — dete može odmah da ukrasi (bez borbe)
    const b = w.burrow;
    this.pickups.push(new Pickup(b.x - 70, b.y - 120, 'seaweed'));
    this.pickups.push(new Pickup(b.x + 80, b.y - 110, 'seaweed'));
    this.time = 0; this.shake = 0; this.lastDamageSource = null;
    this.signalDropped = false; this.bossDefeated = false; this.loseReason = '';
  }

  // ============================================================= MENI / UNOS
  _bindMenu() {
    this.canvas.addEventListener('pointerdown', e => {
      if (!['start', 'paused', 'inventory', 'win', 'lose'].includes(this.state)) return;
      const r = this.canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * CONFIG.view.w, y = (e.clientY - r.top) / r.height * CONFIG.view.h;
      for (const b of this.ui.menuButtons)
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { this._menuAction(b.action); return; }
    });
  }
  _menuAction(a) {
    this._resumeAudio();
    if (a === 'start' || a === 'restart') { if (a === 'restart') this.reset(); this.state = 'playing'; }
    else if (a === 'resume') this.state = 'playing';
  }

  handleStateInput() {
    const inp = this.input;
    if (this.state === 'start') { if (inp.pressed('confirm')) this._menuAction('start'); }
    else if (this.state === 'win' || this.state === 'lose') { if (inp.pressed('confirm')) this._menuAction('restart'); }
    else if (this.state === 'paused') { if (inp.pressed('pause') || inp.pressed('confirm')) this.state = 'playing'; }
    else if (this.state === 'inventory') { if (inp.pressed('inventory') || inp.pressed('pause')) this.state = 'playing'; }
    else if (this.state === 'playing') {
      if (inp.pressed('pause')) { this.state = 'paused'; return; }
      if (inp.pressed('inventory')) { this.state = 'inventory'; return; }
      if (inp.pressed('eat')) this.foodSys.eat(this);
      if (inp.pressed('signal')) this.quest.ping(this);
      if (inp.pressed('interact')) this.rescueSys.tryRescue(this);
      if (inp.pressed('decorate')) this.decoration.place(this);
    }
  }

  // ============================================================= UPDATE
  update(dt) {
    this.time += dt;
    this.handleStateInput();
    if (this.state === 'playing') this._updatePlay(dt);
    // toasts blede uvek
    for (const t of this.toasts) t.life -= dt;
    this.toasts = this.toasts.filter(t => t.life > 0);
    this.input.endFrame();
  }

  _updatePlay(dt) {
    const p = this.player, w = this.world;
    p.update(dt, this);
    for (const e of this.enemies) e.update(dt, this);
    this.boss.update(dt, this);
    this.friend.update(dt, this);
    for (const pk of this.pickups) pk.update(dt);
    this.hungerSys.update(dt, this);
    this.staminaSys.update(dt, this);
    this.healthSys.update(dt, this);
    this.dayNight.update(dt, this);
    this.quest.update(dt);

    this._collectPickups();
    this._updateFood(dt);
    this.enemies = this.enemies.filter(e => !e.dead);

    // efekti
    for (const fx of this.effects) { fx.t += dt; }
    this.effects = this.effects.filter(fx => fx.t < fx.life);

    // kamera prati igrača
    const vw = CONFIG.view.w, vh = CONFIG.view.h;
    this.cam.x = Utils.clamp(p.x - vw / 2, 0, Math.max(0, w.w - vw));
    this.cam.y = Utils.clamp(p.y - vh / 2, 0, Math.max(0, w.h - vh));
    this.shake = Math.max(0, this.shake - dt * 30);
    this.input.showDecorate = w.isInBurrow(p.x, p.y);

    // win/lose
    if (p.dead || p.health <= 0) this._lose();
    else if (this.dayNight.nightsSurvived >= this.dayNight.total &&
      this.friend.state !== 'caged' && this.decoration.count() >= 1) this.state = 'win';
  }

  _lose() {
    this.state = 'lose';
    const src = this.lastDamageSource;
    this.loseReason = src === 'hunger' ? 'Umro si od gladi! Sledeći put jedi više korala i školjki (F). 🪸'
      : src === 'boss' ? 'Morski Grgo te je savladao! Beži u jazbinu kad si u opasnosti. 🐻'
        : 'Neprijatelji su te savladali! Pazi na zdravlje i vrati se u jazbinu. ⚔️';
  }

  // ============================================================= POMOĆNO
  toast(msg) { this.toasts.push({ msg, life: 3.2 }); if (this.toasts.length > 3) this.toasts.shift(); }
  guardsRemaining() { return this.enemies.filter(e => e.isGuard && !e.dead && e.defeatT <= 0).length; }

  _spawnFood(slot) {
    const kind = Math.random() < 0.3 ? 'shell' : 'coral';
    slot.active = true;
    this.pickups.push(new Pickup(slot.x, slot.y, kind, slot));
  }
  _updateFood(dt) {
    for (const s of this.foodSlots) if (!s.active) { s.cooldown -= dt; if (s.cooldown <= 0) this._spawnFood(s); }
  }
  _collectPickups() {
    const p = this.player;
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      if (Utils.dist(p.x, p.y, pk.x, pk.y) < p.r + pk.r + 8) {
        pk.taken = true;
        if (pk.kind === 'signal') { this.quest.giveSignal(this); this.sfx('pickup'); }
        else { this.inventory.add(pk.kind, 1); this.sfx('pickup'); this._pop(pk.x, pk.y, this._emoji(pk.kind)); }
        if (pk.slot) { pk.slot.active = false; pk.slot.cooldown = CONFIG.spawns.foodRespawn; }
      }
    }
    this.pickups = this.pickups.filter(pk => !pk.taken);
  }
  _emoji(k) { return { coral: '🪸', shell: '🐚', seaweed: '🌿', stone: '🪨', token: '⭐' }[k] || '+1'; }
  _pop(x, y, txt) { this.effects.push({ type: 'pop', x, y, txt, t: 0, life: 0.9 }); }
  spawnEat(x, y) { this.effects.push({ type: 'eat', x, y, t: 0, life: 0.6 }); }

  // ============================================================= CALLBACKS
  onPlayerAttack(player, mult = 1) {
    const cfg = CONFIG.player, dmg = cfg.attackDamage * mult;
    this.sfx('swing');
    this.effects.push({ type: 'swing', x: player.x, y: player.y, facing: player.facing, t: 0, life: 0.2 });
    let hit = false;
    for (const e of this.enemies)
      if (e.defeatT <= 0 && Utils.inArc(e.x, e.y, player.x, player.y, player.facing, cfg.attackRange, cfg.attackArc)) { e.hurt(dmg, player.x, player.y, this); hit = true; }
    const b = this.boss;
    if (b && b.state !== 'defeated' && !b.dead && Utils.inArc(b.x, b.y, player.x, player.y, player.facing, cfg.attackRange + b.r * 0.5, cfg.attackArc)) { b.hurt(dmg, player.x, player.y, this); hit = true; }
    if (hit) this.sfx('hit');
  }
  onEnemyDefeated(e) {
    this.sfx('defeat');
    this._pop(e.x, e.y - 10, '💥');
    // plen
    this._dropLoot(e.x, e.y);
    if (!this.signalDropped) { this.signalDropped = true; this.pickups.push(new Pickup(e.x + 14, e.y, 'signal')); this.toast('Neprijatelj je ispustio SIGNAL! Pokupi ga 📡'); }
  }
  _dropLoot(x, y) {
    const drops = [Math.random() < 0.5 ? 'shell' : 'coral', 'seaweed'];
    if (Math.random() < 0.4) drops.push('stone');
    if (Math.random() < 0.25) drops.push('token');
    drops.forEach((k, i) => { const a = Math.random() * 7; this.pickups.push(new Pickup(x + Math.cos(a) * (18 + i * 8), y + Math.sin(a) * (18 + i * 8), k)); });
  }
  onBossDefeated() { this.bossDefeated = true; this.toast('🎉 Pobedio si Morskog Grgu!'); this.inventory.add('token', 3); this.sfx('win'); }
  onNightStart(dayNum) {
    this.toast(`🌙 Noć ${Math.min(dayNum, this.dayNight.total)} počinje! Neprijatelji su brži i opasniji.`); this.sfx('night');
    const b = this.world.burrow;
    for (let i = 0; i < CONFIG.dayNight.nightEnemyExtra; i++) {
      const a = Math.random() * 7, d = b.r + 180 + Math.random() * 120;
      const e = new Enemy(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d); e.isNight = true; this.enemies.push(e);
    }
  }
  onNightEnd(nights) {
    this.toast(`☀️ Preživeo si noć ${nights}! ${nights >= this.dayNight.total ? 'Svaka čast!' : 'Nastavi!'}`); this.sfx('day');
    this.enemies = this.enemies.filter(e => !e.isNight); // noćni nestaju u zoru
  }
  onFriendHome() { this.toast('🏠 Bubling je bezbedan u jazbini! Bravo!'); this.quest.objective = 'Bublinga si spasio! Ukrasi jazbinu (B/✨) i preživi do kraja 3. noći.'; }

  // ============================================================= RENDER
  render() {
    const ctx = this.ctx, cv = this.canvas, vw = CONFIG.view.w, vh = CONFIG.view.h;
    ctx.setTransform(cv.width / vw, 0, 0, cv.height / vh, 0, 0);
    ctx.clearRect(0, 0, vw, vh);

    if (this.state === 'start') { this.ui.screen(ctx, this); return; }

    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    let cx = Utils.clamp(this.cam.x + sx, 0, Math.max(0, this.world.w - vw));
    let cy = Utils.clamp(this.cam.y + sy, 0, Math.max(0, this.world.h - vh));

    // pozadina (samo vidljivi deo)
    ctx.drawImage(this.world.bg, cx, cy, vw, vh, 0, 0, vw, vh);

    ctx.save(); ctx.translate(-cx, -cy);
    // dekoracije u jazbini
    for (const d of this.decoration.placed) Art.decoration(ctx, d);
    // kavez + prijatelj
    Art.cage(ctx, this.world.cage.x, this.world.cage.y, this.friend.state !== 'caged');
    if (this.friend.state !== 'home') Art.friend(ctx, this.friend, this.time);
    // hrana / pickup
    for (const pk of this.pickups) {
      if (pk.kind === 'coral') Art.coral(ctx, pk.x, pk.y, pk.animT);
      else if (pk.kind === 'shell') Art.shellFood(ctx, pk.x, pk.y, pk.animT);
      else this._drawResource(ctx, pk);
    }
    // efekti (ispod entiteta osim swinga)
    this._drawEffects(ctx, false);
    // neprijatelji, boss, igrač
    for (const e of this.enemies) Art.enemy(ctx, e);
    if (!this.boss.dead) Art.boss(ctx, this.boss);
    Art.player(ctx, this.player);
    this._drawEffects(ctx, true);
    ctx.restore();

    // zatamnjenje noći
    const dark = this.dayNight.darkness;
    if (dark > 0.01) {
      ctx.fillStyle = CONFIG.colors.night;
      ctx.globalAlpha = dark; ctx.fillRect(0, 0, vw, vh); ctx.globalAlpha = 1;
      // svetlo oko igrača
      const px = this.player.x - cx, py = this.player.y - cy;
      const g = ctx.createRadialGradient(px, py, 30, px, py, 220);
      g.addColorStop(0, `rgba(255,240,200,${dark * 0.5})`); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 220, 0, 6.2832); ctx.fill();
    }

    // strelica zadatka + HUD
    this.ui.drawWorldOverlay(ctx, this, { x: cx, y: cy });
    if (this.state !== 'lose' && this.state !== 'win') this.ui.drawHUD(ctx, this);

    if (['paused', 'inventory', 'win', 'lose'].includes(this.state)) this.ui.screen(ctx, this);
  }

  _drawResource(ctx, pk) {
    const map = { seaweed: '🌿', stone: '🪨', token: '⭐' };
    ctx.save(); ctx.translate(pk.x, pk.y + Math.sin(pk.animT * 4) * 2);
    Art.shadow(ctx, 0, 8, 10, 4);
    ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(map[pk.kind] || '⭐', 0, 0);
    ctx.restore();
  }
  _drawEffects(ctx, top) {
    for (const fx of this.effects) {
      const k = fx.t / fx.life;
      if (fx.type === 'swing' && top) {
        ctx.save(); ctx.translate(fx.x, fx.y); ctx.rotate(fx.facing);
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(20, 0, CONFIG.player.attackRange * 0.7, -CONFIG.player.attackArc, CONFIG.player.attackArc); ctx.stroke();
        ctx.restore(); ctx.globalAlpha = 1;
      } else if (fx.type === 'pop' && !top) {
        ctx.globalAlpha = 1 - k; ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(fx.txt, fx.x, fx.y - k * 24); ctx.globalAlpha = 1;
      } else if (fx.type === 'eat' && top) {
        ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffd24a';
        for (let i = 0; i < 4; i++) Art.star(ctx, fx.x + Math.cos(i * 1.6 + k * 3) * (10 + k * 16), fx.y - 20 - k * 14, 3);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ============================================================= ZVUK (mini)
  _initAudio() { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ac = null; } }
  _resumeAudio() { if (this.ac && this.ac.state === 'suspended') this.ac.resume(); }
  sfx(name) {
    if (!this.ac) return;
    const map = { swing: [320, .08, 'square', .06], hit: [180, .1, 'sawtooth', .08], defeat: [110, .25, 'triangle', .1], pickup: [660, .08, 'sine', .07], eat: [520, .12, 'sine', .08], win: [780, .3, 'sine', .1], night: [160, .4, 'sine', .06], day: [600, .3, 'sine', .06] };
    const m = map[name]; if (!m) return;
    try {
      const o = this.ac.createOscillator(), g = this.ac.createGain();
      o.type = m[2]; o.frequency.value = m[0]; g.gain.value = m[3];
      o.connect(g); g.connect(this.ac.destination); const t = this.ac.currentTime;
      g.gain.setValueAtTime(m[3], t); g.gain.exponentialRampToValueAtTime(0.0001, t + m[1]);
      o.start(t); o.stop(t + m[1]);
    } catch (e) { }
  }
}

/* ============================================================= BOOTSTRAP */
(function () {
  const canvas = document.getElementById('game');
  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = CONFIG.view.w, vh = CONFIG.view.h, ar = vw / vh;
    let cw = window.innerWidth, ch = window.innerHeight;
    if (cw / ch > ar) cw = ch * ar; else ch = cw / ar;
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  }
  fit(); addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 100));
  // spreči pinch-zoom / dvostruki-tap zoom na tabletu
  addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

  const game = new GameManager(canvas);
  window.GAME = game;

  // Pun ekran + zaključavanje orijentacije na prvi dodir (tablet)
  function goFullscreen() {
    game._resumeAudio();
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => { });
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { });
    removeEventListener('pointerdown', goFullscreen);
  }
  addEventListener('pointerdown', goFullscreen);

  let last = performance.now();
  function loop(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;          // ograniči veliki skok (npr. tab u pozadini)
    game.update(dt);
    game.render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
