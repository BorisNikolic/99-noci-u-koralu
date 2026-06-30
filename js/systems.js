/* =========================================================================
 * systems.js — Sistemi igre (modularno, kao u opisu): glad, energija, zdravlje,
 * inventar, hrana, resursi, dan/noć, signal-zadatak, spasavanje, dekoracija.
 * ========================================================================= */

class HungerSystem {
  update(dt, game) {
    const p = game.player, h = CONFIG.hunger;
    let rate = game.dayNight.isNight ? h.decayNight : h.decayDay;
    if (p.isRunning) rate += h.runExtraPerSec;
    p.hunger = Utils.clamp(p.hunger - rate * dt, 0, CONFIG.player.maxHunger);
  }
}

class StaminaSystem {
  update(dt, game) {
    const p = game.player, s = CONFIG.stamina, h = CONFIG.hunger;
    if (p.isRunning) p.stamina -= CONFIG.player.runCostPerSec * dt;
    else {
      let regen = p.hunger > h.midThreshold ? s.regenFull : p.hunger > h.lowThreshold ? s.regenMid : s.regenLow;
      if (game.world.isInBurrow(p.x, p.y)) regen += s.burrowBonus;
      p.stamina += regen * dt;
    }
    p.stamina = Utils.clamp(p.stamina, 0, CONFIG.player.maxStamina);
  }
}

class HealthSystem {
  update(dt, game) {
    const p = game.player, hp = CONFIG.health;
    if (p.hunger <= 0) {                         // umire od gladi
      p.health -= hp.starveDrain * dt;
      if (!game.lastDamageSource || p.health <= 0) game.lastDamageSource = 'hunger';
    } else if (game.world.isInBurrow(p.x, p.y) && p.hunger > CONFIG.hunger.lowThreshold) {
      p.health += hp.burrowRegen * dt;           // isceljenje u jazbini
    }
    p.health = Utils.clamp(p.health, 0, CONFIG.player.maxHealth);
    if (p.health <= 0) p.dead = true;
  }
}

class InventorySystem {
  constructor() { this.items = { coral: 0, shell: 0, seaweed: 0, stone: 0, token: 0 }; }
  add(kind, n = 1) { if (kind in this.items) this.items[kind] += n; }
  has(kind, n = 1) { return (this.items[kind] || 0) >= n; }
  spend(kind, n = 1) { if (this.has(kind, n)) { this.items[kind] -= n; return true; } return false; }
}

class FoodSystem {
  // Pojedi najbolju dostupnu hranu (školjka > koral)
  eat(game) {
    const p = game.player, inv = game.inventory, f = CONFIG.food;
    if (p.hunger >= CONFIG.player.maxHunger - 0.5) { game.toast('Nisi gladan! 😊'); return false; }
    let kind = inv.has('shell') ? 'shell' : inv.has('coral') ? 'coral' : null;
    if (!kind) { game.toast('Nemaš hrane! Skupi korale 🪸 ili školjke 🐚'); return false; }
    inv.spend(kind, 1);
    p.hunger = Utils.clamp(p.hunger + f[kind].hunger, 0, CONFIG.player.maxHunger);
    p.stamina = Utils.clamp(p.stamina + f[kind].stamina, 0, CONFIG.player.maxStamina);
    game.toast(`Pojeo si ${f[kind].label}! +${f[kind].hunger} glad${f[kind].stamina ? `, +${f[kind].stamina} energija 💪` : ''}`);
    game.spawnEat(p.x, p.y);
    return true;
  }
}

class DayNightCycle {
  constructor() {
    const d = CONFIG.dayNight;
    this.phase = 'day'; this.t = 0; this.dayNum = 1; this.isNight = false;
    this.nightsSurvived = 0; this.total = d.totalNights;
  }
  get progress() { return this.t / (this.isNight ? CONFIG.dayNight.nightLength : CONFIG.dayNight.dayLength); }
  // 0 (svetlo) .. 1 (mrak) za zatamnjenje
  get darkness() {
    if (this.isNight) return 0.55 * Math.min(1, this.t * 2) * (this.t > CONFIG.dayNight.nightLength - 0.5 ? Math.max(0, (CONFIG.dayNight.nightLength - this.t) * 2) : 1);
    // sumrak na kraju dana
    const left = CONFIG.dayNight.dayLength - this.t;
    return left < 3 ? (3 - left) / 3 * 0.25 : 0;
  }
  update(dt, game) {
    const d = CONFIG.dayNight;
    this.t += dt;
    if (this.phase === 'day' && this.t >= d.dayLength) {
      this.phase = 'night'; this.t = 0; this.isNight = true; game.onNightStart(this.dayNum);
    } else if (this.phase === 'night' && this.t >= d.nightLength) {
      this.phase = 'day'; this.t = 0; this.isNight = false;
      this.nightsSurvived++; this.dayNum++; game.onNightEnd(this.nightsSurvived);
    }
  }
}

class QuestSignalSystem {
  constructor() {
    this.hasSignal = false;
    this.pingT = 0;
    this.objective = 'Istraži, skupljaj hranu (🪸/🐚) i preživi! Vrati se u jazbinu kad si u opasnosti.';
  }
  nearestCaged(game) {
    let best = null, bd = Infinity;
    for (const f of game.friends) { if (f.state !== 'caged') continue; const d = Utils.dist2(game.player.x, game.player.y, f.cage.x, f.cage.y); if (d < bd) { bd = d; best = f; } }
    return best;
  }
  // Meta tačka ka kojoj pokazuje strelica
  target(game) {
    // ako je signal ispušten a još nije pokupljen, vodi igrača do njega
    if (!this.hasSignal && game.signalDropped) {
      const sig = game.pickups.find(p => p.kind === 'signal');
      if (sig) return sig;
    }
    if (this.hasSignal) {
      const f = this.nearestCaged(game);
      return f ? f.cage : game.world.burrow;     // svi oslobođeni → kući
    }
    let best = null, bd = Infinity;               // pre signala: ka najbližoj zoni hrane
    for (const z of game.world.foodZones) { const d = Utils.dist2(game.player.x, game.player.y, z.x, z.y); if (d < bd) { bd = d; best = z; } }
    return best;
  }
  // Tekst zadatka — osvežava se svaki frejm prema napretku
  refresh(game) {
    const total = game.friends.length, freed = game.friends.filter(f => f.state !== 'caged').length;
    if (!this.hasSignal) {
      this.objective = game.signalDropped
        ? 'Pokupi SIGNAL 📡 (prati strelicu)!'
        : 'Istraži i jedi (🪸/🐚) da preživiš. Pobedi neprijatelja da dobiješ SIGNAL 📡.';
    } else if (freed < total) {
      this.objective = `Spasi prijatelje! Oslobođeno ${freed}/${total}. Prati strelicu ➡️ do kaveza pa pritisni E.`;
    } else {
      this.objective = `Svi prijatelji spašeni (${total})! 🏆 Ukrasi jazbinu (B/✨) i preživi do kraja 3. noći.`;
    }
  }
  giveSignal(game) {
    if (this.hasSignal) return;
    this.hasSignal = true;
    game.toast('Dobio si SIGNALNU ŠKOLJKU! Pritisni Q (📡) da nađeš prijatelje');
  }
  ping(game) {
    if (!this.hasSignal) { game.toast('Nemaš još signal! Pobedi neprijatelje da ga nađeš'); return; }
    this.pingT = 2.5;
    game.toast('Signal aktiviran — prati strelicu! ➡️');
  }
  update(dt) { this.pingT = Math.max(0, this.pingT - dt); }
}

class RescueSystem {
  // oslobodi najbližeg zarobljenog prijatelja (ako su mu čuvari pobeđeni)
  tryRescue(game) {
    const p = game.player;
    let best = null, bd = 70 * 70;
    for (const f of game.friends) { if (f.state !== 'caged') continue; const d = Utils.dist2(p.x, p.y, f.cage.x, f.cage.y); if (d < bd) { bd = d; best = f; } }
    if (!best) return false;
    if (game.guardsRemaining(best.index) > 0) { game.toast(`Prvo pobedi čuvare oko ${best.name} kaveza! ⚔️`); return true; }
    best.state = 'following';
    best.followOrder = game.rescuedCount++;
    game.toast(`🎉 Oslobodio si ${best.name}! Vodi ga u jazbinu 🏠`);
    game.shake = 6; game.sfx('win');
    return true;
  }
}

class DecorationSystem {
  constructor() {
    this.placed = [];
    // Mesta u jazbini gde se redom postavljaju dekoracije
    this.slots = [[-90, -70], [90, -70], [-110, 40], [110, 40], [0, 90]];
  }
  count() { return this.placed.length; }
  place(game) {
    const w = game.world, inv = game.inventory, c = CONFIG.decoration;
    if (!w.isInBurrow(game.player.x, game.player.y)) { game.toast('Dekoracije se postavljaju u jazbini! 🏠'); return; }
    if (this.placed.length >= this.slots.length) { game.toast('Jazbina je puna ukrasa! ✨'); return; }
    if (!inv.has('seaweed', c.cost.seaweed)) { game.toast(`Treba ti ${c.cost.seaweed}x alga 🌿 za ukras`); return; }
    inv.spend('seaweed', c.cost.seaweed);
    const slot = this.slots[this.placed.length];
    const type = c.types[this.placed.length % c.types.length];
    this.placed.push({ type, x: w.burrow.x + slot[0], y: w.burrow.y + slot[1] });
    game.toast('Postavljen ukras u jazbini! 🎨 (+1)');
  }
}

class SafeZoneSystem {
  isSafe(game, e) { return game.world.isInBurrow(e.x, e.y); }
}
