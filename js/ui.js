/* =========================================================================
 * ui.js — UIManager: HUD, kontrole na ekranu (joystick + dugmad), strelica
 * zadatka, boss bar, poruke (toast), i ekrani (start/pauza/inventar/win/lose).
 * Sve se crta u EKRANSKIM (logičkim) koordinatama. Global: UIManager
 * ========================================================================= */
class UIManager {
  constructor() { this.menuButtons = []; this.font = 'system-ui, sans-serif'; this._lastObj = ''; this._objChangeAt = -9; }

  // ---- pomoćno crtanje ----
  panel(ctx, x, y, w, h, r = 12, a = 0.5) {
    ctx.fillStyle = `rgba(30,40,55,${a})`; Art.rr(ctx, x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.stroke();
  }
  text(ctx, s, x, y, size, col = '#fff', align = 'left', weight = '700') {
    ctx.font = `${weight} ${size}px ${this.font}`; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }
  wrap(ctx, s, x, y, size, maxW, col = '#fff', align = 'center') {
    ctx.font = `700 ${size}px ${this.font}`; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'middle';
    const words = s.split(' '); let line = '', yy = y;
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += size + 6; }
      else line = t;
    }
    ctx.fillText(line, x, yy); return yy;
  }
  heartPath(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
    ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.85, x, y + s);
    ctx.bezierCurveTo(x, y + s * 0.85, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
    ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
    ctx.closePath();
  }

  // ===================================================== HUD (tokom igre)
  drawHUD(ctx, game) {
    const C = CONFIG.colors, p = game.player, W = CONFIG.view.w;
    // --- levo: avatar, srca, energija, glad ---
    this.panel(ctx, 10, 10, 312, 116, 14, 0.42);
    this._avatar(ctx, 48, 52, 30);
    // srca
    const hpEach = CONFIG.player.maxHealth / 5;
    for (let i = 0; i < 5; i++) {
      const x = 92 + i * 30, y = 26, frac = Utils.clamp((p.health - i * hpEach) / hpEach, 0, 1);
      this.heartPath(ctx, x, y, 22); ctx.fillStyle = '#5b3a3a'; ctx.fill();
      if (frac > 0) { ctx.save(); this.heartPath(ctx, x, y, 22); ctx.clip(); ctx.fillStyle = C.heart; ctx.fillRect(x - 12, y, 24 * frac, 24); ctx.restore(); }
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#2c2419'; this.heartPath(ctx, x, y, 22); ctx.stroke();
    }
    // energija (mehurići)
    const stEach = CONFIG.player.maxStamina / 5;
    for (let i = 0; i < 5; i++) {
      const x = 92 + i * 28, y = 70, frac = Utils.clamp((p.stamina - i * stEach) / stEach, 0, 1);
      ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.2832); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
      if (frac > 0.05) { ctx.beginPath(); ctx.arc(x, y, 9 * Math.max(0.35, frac), 0, 6.2832); ctx.fillStyle = C.stamina; ctx.fill(); }
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.2832); ctx.stroke();
    }
    // glad (istaknuta traka — glavna mehanika)
    const hf = p.hunger / CONFIG.player.maxHunger, low = p.hunger < CONFIG.hunger.lowThreshold;
    const blink = low && Math.floor(game.time * 4) % 2 === 0;
    this.text(ctx, 'GLAD', 92, 100, 12, blink ? '#ffd24a' : '#cfe', 'left');
    const bx = 134, bw = 174;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; Art.rr(ctx, bx, 92, bw, 16, 8); ctx.fill();
    const col = hf > 0.5 ? '#6ec06e' : hf > 0.25 ? '#e8b54a' : '#e8503a';
    ctx.fillStyle = col; Art.rr(ctx, bx, 92, Math.max(2, bw * hf), 16, 8); ctx.fill();
    this.coralIcon(ctx, bx - 2, 100, 0); // sitna ikonica
    if (low) this.text(ctx, '⚠ GLADAN!', bx + bw / 2, 100, 11, '#fff', 'center');

    // --- centar gore: brojač noći ---
    this._nightCounter(ctx, game, W / 2, 18);

    // --- resursi (centar, ispod noći) ---
    const items = [['coral', '🪸'], ['shell', '🐚'], ['seaweed', '🌿'], ['stone', '🪨'], ['token', '⭐']];
    const rx0 = W / 2 - (items.length * 56) / 2 + 28;
    this.panel(ctx, W / 2 - 150, 78, 300, 30, 10, 0.4);
    items.forEach(([k, g], i) => {
      const x = rx0 + i * 56;
      this.text(ctx, g, x - 14, 93, 16, '#fff', 'center');
      this.text(ctx, '×' + game.inventory.items[k], x + 8, 93, 14, '#fff', 'left');
    });

    // --- zadatak (objective) — pulsira kad se promeni ---
    if (game.quest.objective !== this._lastObj) { this._lastObj = game.quest.objective; this._objChangeAt = game.time; }
    const fresh = game.time - this._objChangeAt < 1.4;
    const opulse = fresh && Math.floor(game.time * 6) % 2 === 0;
    this.panel(ctx, W / 2 - 330, 116, 660, 42, 12, opulse ? 0.78 : 0.5);
    if (opulse) { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3; Art.rr(ctx, W / 2 - 330, 116, 660, 42, 12); ctx.stroke(); }
    this.wrap(ctx, '🎯 ' + game.quest.objective, W / 2, 137, 17, 624, fresh ? '#fff3c4' : '#fff');
    // brojač čuvara kod kaveza (kad imaš signal a prijatelj je još zarobljen)
    if (game.quest.hasSignal && game.friend.state === 'caged') {
      const gr = game.guardsRemaining();
      if (gr > 0) this.text(ctx, `⚔️ Pobedi čuvare kod kaveza: ${gr}`, W / 2, 170, 14, '#ffd24a', 'center');
    }

    // --- boss bar ---
    if (game.boss && !game.boss.dead && game.boss.engaged) this._bossBar(ctx, game);

    // --- toasts ---
    this._toasts(ctx, game);

    // --- kontrole ---
    if (game.input.touchActive) this.drawTouchControls(ctx, game);
    else this._keyHints(ctx);
  }

  _avatar(ctx, x, y, r) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
    ctx.fillStyle = '#7fd0e0'; ctx.fill(); ctx.clip();
    // mini lice
    ctx.fillStyle = CONFIG.colors.skin; ctx.beginPath(); ctx.arc(x, y + 4, r * 0.7, 0, 6.2832); ctx.fill();
    ctx.fillStyle = CONFIG.colors.hair; ctx.beginPath(); ctx.arc(x, y - r * 0.3, r * 0.6, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#2c2419'; ctx.beginPath(); ctx.arc(x - 6, y + 2, 2.5, 0, 6.2832); ctx.arc(x + 6, y + 2, 2.5, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#2c2419'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y + 6, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = '#e8a23a'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.stroke();
  }

  _nightCounter(ctx, game, cx, y) {
    const dn = game.dayNight;
    this.panel(ctx, cx - 90, y, 180, 52, 12, 0.45);
    // mesec/sunce
    ctx.beginPath(); ctx.arc(cx - 60, y + 26, 17, 0, 6.2832);
    ctx.fillStyle = dn.isNight ? '#dfe6ff' : '#ffd54a'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#2c2419'; ctx.stroke();
    if (dn.isNight) { ctx.fillStyle = '#0b1f4d'; ctx.beginPath(); ctx.arc(cx - 54, y + 22, 14, 0, 6.2832); ctx.fill(); }
    this.text(ctx, dn.isNight ? 'NOĆ' : 'DAN', cx + 18, y + 16, 15, '#fff', 'center');
    this.text(ctx, `${Math.min(dn.dayNum, dn.total)} / ${dn.total}`, cx + 18, y + 36, 17, dn.isNight ? '#9fb8ff' : '#ffe08a', 'center');
    // traka faze
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; Art.rr(ctx, cx - 36, y + 42, 110, 5, 2.5); ctx.fill();
    ctx.fillStyle = dn.isNight ? '#6f86d6' : '#ffd54a'; Art.rr(ctx, cx - 36, y + 42, 110 * Utils.clamp(dn.progress, 0, 1), 5, 2.5); ctx.fill();
  }

  _bossBar(ctx, game) {
    const W = CONFIG.view.w, H = CONFIG.view.h, b = game.boss, y = H - 96;
    this.panel(ctx, W / 2 - 230, y, 460, 36, 10, 0.55);
    ctx.beginPath(); ctx.arc(W / 2 - 210, y + 18, 15, 0, 6.2832); ctx.fillStyle = CONFIG.colors.boss; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#2c2419'; ctx.stroke();
    this.text(ctx, 'MORSKI GRGO', W / 2 - 188, y + 12, 12, '#fff', 'left');
    const bx = W / 2 - 188, bw = 396;
    ctx.fillStyle = '#3a1418'; Art.rr(ctx, bx, y + 18, bw, 12, 6); ctx.fill();
    ctx.fillStyle = '#e8503a'; Art.rr(ctx, bx, y + 18, Math.max(0, bw * (b.health / b.maxHealth)), 12, 6); ctx.fill();
  }

  _toasts(ctx, game) {
    const W = CONFIG.view.w; let y = CONFIG.view.h - 150;
    for (let i = game.toasts.length - 1; i >= 0; i--) {
      const t = game.toasts[i], a = Math.min(1, t.life);
      ctx.globalAlpha = a;
      const w = Math.min(560, ctx.measureText(t.msg).width + 40);
      this.panel(ctx, W / 2 - 300, y, 600, 34, 10, 0.6 * a);
      this.text(ctx, t.msg, W / 2, y + 17, 16, '#fff', 'center');
      ctx.globalAlpha = 1; y -= 40;
    }
  }

  _keyHints(ctx) {
    const H = CONFIG.view.h;
    this.text(ctx, 'WASD/strelice: kreći se   Shift: trči   Space: napad   E: spasi   F: jedi   Q: signal   Tab: inventar   B: ukrasi   Esc: pauza',
      CONFIG.view.w / 2, H - 16, 13, 'rgba(255,255,255,0.75)', 'center', '600');
  }

  // ===================================================== KONTROLE NA EKRANU
  drawTouchControls(ctx, game) {
    const inp = game.input;
    // joystick
    if (inp.joy.active) {
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(inp.joy.baseX, inp.joy.baseY, inp.maxJoy, 0, 6.2832); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(inp.joy.x, inp.joy.y, 34, 0, 6.2832); ctx.fillStyle = 'rgba(127,208,224,0.8)'; ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(150, CONFIG.view.h - 150, inp.maxJoy, 0, 6.2832); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      this.text(ctx, 'kreći', 150, CONFIG.view.h - 150, 14, '#fff', 'center');
      ctx.globalAlpha = 1;
    }
    // dugmad
    for (const b of inp.buttons) {
      if (b.onlyBurrow && !inp.showDecorate) continue;
      const held = inp.held(b.id);
      const cooling = b.id === 'attack' && game.player && game.player.attackCD > 0;
      ctx.globalAlpha = (b.small ? 0.7 : 0.85) * (cooling ? 0.5 : 1);
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832);
      ctx.fillStyle = held ? '#fff' : b.color; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
      ctx.globalAlpha = 1;
      const lab = b.glyph || b.label;
      this.text(ctx, lab, b.x, b.y, b.small ? 22 : (b.id === 'attack' ? 20 : 16), held ? '#2c2419' : '#fff', 'center');
      if (!b.small && b.id !== 'attack') this.text(ctx, b.label, b.x, b.y + 16, 11, held ? '#2c2419' : '#fff', 'center');
    }
  }

  // ===================================================== SVETSKI OVERLAY (strelica)
  drawWorldOverlay(ctx, game, cam) {
    const p = game.player, q = game.quest, W = CONFIG.view.w, H = CONFIG.view.h;
    // --- kućni far: pokaži pravac jazbine kad je van ekrana ---
    if (!game.world.isInBurrow(p.x, p.y)) {
      const br = game.world.burrow, hx = br.x - cam.x, hy = br.y - cam.y;
      if (hx < 36 || hx > W - 36 || hy < 96 || hy > H - 100) {
        const cxs = Utils.clamp(hx, 36, W - 36), cys = Utils.clamp(hy, 96, H - 100);
        ctx.save(); ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(cxs, cys, 17, 0, 6.2832); ctx.fillStyle = 'rgba(60,147,173,0.92)'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
        this.text(ctx, '🏠', cxs, cys + 1, 17, '#fff', 'center');
        ctx.restore();
      }
    }
    // --- strelica zadatka ---
    const tgt = q.target(game);
    if (!tgt) return;
    const sx = p.x - cam.x, sy = p.y - cam.y - 46;
    const a = Utils.angle(p.x, p.y, tgt.x, tgt.y);
    const pulse = q.pingT > 0 ? 1.25 + Math.sin(game.time * 16) * 0.15 : 1;
    const dist = Utils.dist(p.x, p.y, tgt.x, tgt.y);
    if (dist < 80) return;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a); ctx.scale(pulse, pulse);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = q.pingT > 0 ? '#ffd24a' : '#f4c842';
    ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(2, -12); ctx.lineTo(6, 0); ctx.lineTo(2, 12); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#2c2419'; ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // ===================================================== EKRANI
  screen(ctx, game) {
    this.menuButtons = [];
    const W = CONFIG.view.w, H = CONFIG.view.h;
    if (game.state === 'start') {
      this._bg(ctx, '#103a5a');
      this.text(ctx, '99 NOĆI U KORALU', W / 2, H * 0.26, 64, '#ffd24a', 'center', '800');
      this.text(ctx, '2D podvodna survival avantura', W / 2, H * 0.26 + 48, 22, '#bfe6f0', 'center');
      this.wrap(ctx, 'Preživi 3 noći • jedi korale i školjke da ne ogladniš • pobedi kanto-mačevce • nađi signal • spasi Bublinga • ukrasi jazbinu!', W / 2, H * 0.44, 18, 760, '#e8f6fb');
      this.text(ctx, game.input.touchActive
        ? '🕹️ levo = kretanje    •    desna dugmad = NAPAD · E (spasi) · JEDI · SIGNAL'
        : '⌨️ WASD = kretanje · Space = napad · E = spasi · F = jedi · Q = signal · B = ukrasi',
        W / 2, H * 0.54, 16, '#bfe6f0', 'center', '600');
      this._btn(ctx, 'IGRAJ ▶', W / 2, H * 0.64, 'start');
      this.text(ctx, game.input.touchActive ? 'Tapni IGRAJ' : 'Pritisni IGRAJ ili ENTER', W / 2, H * 0.64 + 64, 15, 'rgba(255,255,255,0.7)', 'center');
    } else if (game.state === 'paused') {
      this._dim(ctx); this.text(ctx, 'PAUZA', W / 2, H * 0.34, 56, '#fff', 'center', '800');
      this._btn(ctx, 'NASTAVI', W / 2, H * 0.5, 'resume');
      this._btn(ctx, 'IZNOVA', W / 2, H * 0.5 + 86, 'restart', '#9b6fc4');
    } else if (game.state === 'inventory') {
      this._dim(ctx); this._inventory(ctx, game);
    } else if (game.state === 'win') {
      this._bg(ctx, '#0e5a3a');
      this.text(ctx, '🎉 POBEDA! 🎉', W / 2, H * 0.28, 60, '#ffd24a', 'center', '800');
      this.wrap(ctx, `Preživeo si ${CONFIG.dayNight.totalNights} noći, spasio Bublinga i ukrasio jazbinu!`, W / 2, H * 0.44, 22, 720, '#e8f6fb');
      this.text(ctx, `Spašeni prijatelji: ${game.friend && game.friend.state !== 'caged' ? 1 : 0}   •   Ukrasi: ${game.decoration.count()}   •   Boss: ${game.bossDefeated ? 'pobeđen!' : 'pobegao'}`, W / 2, H * 0.55, 17, '#bfe6f0', 'center');
      this._btn(ctx, 'IGRAJ PONOVO', W / 2, H * 0.68, 'restart');
    } else if (game.state === 'lose') {
      this._bg(ctx, '#3a1620');
      this.text(ctx, 'KRAJ IGRE', W / 2, H * 0.3, 58, '#e8503a', 'center', '800');
      this.wrap(ctx, game.loseReason, W / 2, H * 0.45, 22, 720, '#f6dde2');
      this._btn(ctx, 'PROBAJ PONOVO', W / 2, H * 0.65, 'restart');
    }
  }

  _inventory(ctx, game) {
    const W = CONFIG.view.w, H = CONFIG.view.h;
    this.panel(ctx, W / 2 - 280, H / 2 - 200, 560, 400, 18, 0.85);
    this.text(ctx, '🎒 INVENTAR', W / 2, H / 2 - 165, 32, '#ffd24a', 'center', '800');
    const inv = game.inventory.items;
    const rows = [
      ['🪸 Koral (hrana +15 glad)', inv.coral],
      ['🐚 Školjka (hrana +35 glad, +20 energija)', inv.shell],
      ['🌿 Alga (za ukrašavanje)', inv.seaweed],
      ['🪨 Kamen (resurs)', inv.stone],
      ['⭐ Token (specijalni)', inv.token],
    ];
    rows.forEach((r, i) => {
      const y = H / 2 - 110 + i * 46;
      this.panel(ctx, W / 2 - 250, y - 18, 500, 38, 8, 0.3);
      this.text(ctx, r[0], W / 2 - 235, y, 18, '#fff', 'left');
      this.text(ctx, '×' + r[1], W / 2 + 230, y, 20, '#ffd24a', 'right');
    });
    this.text(ctx, game.quest.hasSignal ? '📡 Imaš signalnu školjku!' : '📡 Signal: još ga nemaš', W / 2, H / 2 + 135, 16, '#bfe6f0', 'center');
    this._btn(ctx, 'ZATVORI', W / 2, H / 2 + 172, 'resume', '#7b828c', 150, 40);
  }

  _btn(ctx, label, cx, cy, action, color = '#f08a3c', w = 280, h = 64) {
    Art.rr(ctx, cx - w / 2, cy - h / 2, w, h, 14); ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.stroke();
    this.text(ctx, label, cx, cy, h > 50 ? 26 : 18, '#fff', 'center', '800');
    this.menuButtons.push({ x: cx - w / 2, y: cy - h / 2, w, h, action });
  }
  _bg(ctx, col) {
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.view.h);
    g.addColorStop(0, col); g.addColorStop(1, '#06243a'); ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.view.w, CONFIG.view.h);
    // mehurići dekor
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 30; i++) ctx.beginPath(), ctx.arc((i * 137) % CONFIG.view.w, (i * 211) % CONFIG.view.h, 4 + (i % 5) * 3, 0, 6.2832), ctx.fill();
  }
  _dim(ctx) { ctx.fillStyle = 'rgba(6,20,30,0.72)'; ctx.fillRect(0, 0, CONFIG.view.w, CONFIG.view.h); }

  coralIcon(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(0.5, 0.5);
    ctx.strokeStyle = CONFIG.colors.coralPink; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -8); ctx.moveTo(-4, 6); ctx.lineTo(-6, -4); ctx.moveTo(4, 6); ctx.lineTo(6, -4); ctx.stroke();
    ctx.restore();
  }
}
