/* =========================================================================
 * art.js — Sva grafika se crta programski (bez učitavanja slika), u stilu
 * asset sheet-ova: vedar crtani izgled, debela tamna kontura, paleta mora.
 * Sve funkcije crtaju u SVETSKIM koordinatama (kameru postavlja pozivalac).
 * Global: Art
 * ========================================================================= */
const Art = (() => {
  const C = CONFIG.colors;
  const OUTLINE = '#2c2419';

  function ol(ctx, lw = 3) { ctx.lineWidth = lw; ctx.strokeStyle = OUTLINE; ctx.stroke(); }
  function shadow(ctx, x, y, rx, ry) {
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.2832); ctx.fill(); ctx.restore();
  }
  function circle(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = fill; ctx.fill(); }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---------------------------------------------------------------- GLAVNI JUNAK
  function player(ctx, p) {
    const flip = Math.cos(p.facing) < -0.01 ? -1 : 1;
    const bob = p.moving ? Math.sin(p.animT * 11) * 2 : Math.sin(p.animT * 3) * 0.8;
    const legSwing = p.moving ? Math.sin(p.animT * 11) * 4 : 0;
    shadow(ctx, p.x, p.y + 16, 17, 7);
    ctx.save();
    ctx.translate(p.x, p.y - 6 + bob);
    ctx.scale(flip, 1);
    if (p.hurtT > 0 && Math.floor(p.hurtT * 20) % 2) ctx.globalAlpha = 0.55;

    // noge
    ctx.fillStyle = C.skin;
    rr(ctx, -9 + legSwing, 10, 8, 14, 4); ctx.fill(); ol(ctx, 2);
    rr(ctx, 2 - legSwing, 10, 8, 14, 4); ctx.fill(); ol(ctx, 2);
    // šorts (zeleno-plavi)
    const g = ctx.createLinearGradient(0, 2, 0, 16);
    g.addColorStop(0, C.shortsTop); g.addColorStop(1, C.shortsBot);
    ctx.fillStyle = g; rr(ctx, -11, 2, 22, 14, 5); ctx.fill(); ol(ctx, 2.5);
    // telo (koža)
    ctx.fillStyle = C.skin; rr(ctx, -9, -12, 18, 18, 7); ctx.fill(); ol(ctx, 2.5);
    // ogrlica + školjka
    ctx.beginPath(); ctx.arc(0, -11, 7, 0.15, Math.PI - 0.15); ol(ctx, 2);
    circle(ctx, 0, -4, 3.2, C.shell); ol(ctx, 1.5);
    // glava
    circle(ctx, 0, -22, 11, C.skin); ol(ctx, 2.5);
    // kosa (čupava braon)
    ctx.fillStyle = C.hair;
    ctx.beginPath();
    ctx.moveTo(-11, -24);
    ctx.quadraticCurveTo(-12, -36, -4, -33);
    ctx.quadraticCurveTo(-2, -39, 3, -34);
    ctx.quadraticCurveTo(8, -40, 10, -31);
    ctx.quadraticCurveTo(13, -30, 11, -23);
    ctx.quadraticCurveTo(6, -29, 0, -28);
    ctx.quadraticCurveTo(-6, -29, -11, -24);
    ctx.closePath(); ctx.fill(); ol(ctx, 2);
    // lice
    circle(ctx, 3, -22, 1.8, '#2c2419');
    circle(ctx, -3, -22, 1.8, '#2c2419');
    ctx.beginPath(); ctx.arc(0, -19, 4, 0.15, Math.PI - 0.15); ctx.lineWidth = 1.6; ctx.strokeStyle = '#2c2419'; ctx.stroke();
    ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.6); circle(ctx, 7, -20, 2.4, '#f09a86'); ctx.globalAlpha = 1;

    // koplje (ruka) — drži ga sa strane, zamah napred pri napadu
    const atk = p.attackT > 0 ? Math.sin((1 - p.attackT) * Math.PI) : 0;
    ctx.save();
    ctx.translate(14, 2);
    ctx.rotate(-0.12 - atk * 1.42);
    ctx.strokeStyle = '#8a5a36'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -28 - atk * 8); ctx.stroke();
    // vrh koplja
    ctx.fillStyle = C.stoneLight; ctx.beginPath();
    ctx.moveTo(0, -36 - atk * 8); ctx.lineTo(-5, -27 - atk * 8); ctx.lineTo(5, -27 - atk * 8); ctx.closePath();
    ctx.fill(); ol(ctx, 1.5);
    ctx.restore();
    ctx.restore();
  }

  // ---------------------------------------------------------------- KANTO MAČEVAC
  function enemy(ctx, e) {
    if (e.defeatT > 0) return enemyDefeated(ctx, e);
    const flip = e.facing < -0.01 || (Math.cos(e.facing) < 0) ? -1 : 1;
    const bob = e.moving ? Math.sin(e.animT * 12) * 1.6 : 0;
    const legSwing = e.moving ? Math.sin(e.animT * 12) * 3 : 0;
    shadow(ctx, e.x, e.y + 15, 15, 6);
    ctx.save();
    ctx.translate(e.x, e.y - 4 + bob);
    ctx.scale(flip, 1);
    if (e.hurtT > 0 && Math.floor(e.hurtT * 22) % 2) ctx.globalAlpha = 0.5;
    // noge (zelene)
    ctx.fillStyle = C.enemyBody;
    rr(ctx, -8 + legSwing, 8, 7, 11, 3); ctx.fill(); ol(ctx, 2);
    rr(ctx, 2 - legSwing, 8, 7, 11, 3); ctx.fill(); ol(ctx, 2);
    // suknjica od algi
    ctx.fillStyle = C.seaweed;
    for (let i = -8; i <= 6; i += 4) { ctx.beginPath(); ctx.moveTo(i, 4); ctx.lineTo(i + 2, 12); ctx.lineTo(i + 4, 4); ctx.closePath(); ctx.fill(); }
    // pojas
    ctx.fillStyle = '#6b4423'; rr(ctx, -9, 1, 18, 5, 2); ctx.fill(); ol(ctx, 1.5);
    // telo/ruke
    ctx.fillStyle = C.enemyBody; rr(ctx, -8, -10, 16, 13, 5); ctx.fill(); ol(ctx, 2);
    // kanta-glava (trapez)
    ctx.fillStyle = C.bucket;
    ctx.beginPath(); ctx.moveTo(-11, -28); ctx.lineTo(11, -28); ctx.lineTo(8, -10); ctx.lineTo(-8, -10); ctx.closePath();
    ctx.fill(); ol(ctx, 2.5);
    ctx.fillStyle = C.bucketDark; rr(ctx, -11, -30, 22, 4, 2); ctx.fill(); ol(ctx, 2);
    // koralni čuperak na vrhu
    ctx.strokeStyle = C.coralOrange; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(2, -30); ctx.lineTo(4, -38); ctx.moveTo(4, -38); ctx.lineTo(0, -36); ctx.moveTo(4, -38); ctx.lineTo(7, -36); ctx.stroke();
    // ljute oči (prorez)
    ctx.fillStyle = '#1a1a1a'; rr(ctx, -6, -22, 12, 4, 1.5); ctx.fill();
    ctx.fillStyle = '#fff'; circle(ctx, -3, -20, 1.4, '#fff'); circle(ctx, 3, -20, 1.4, '#fff');
    // mač
    const atk = e.attackAnim > 0 ? Math.sin(e.attackAnim * Math.PI) : 0;
    ctx.save(); ctx.translate(9, -4); ctx.rotate(-0.3 - atk * 1.1);
    ctx.fillStyle = C.stoneLight; rr(ctx, -2, -26, 4, 26, 1.5); ctx.fill(); ol(ctx, 1.5);
    ctx.fillStyle = '#6b4423'; rr(ctx, -3, -2, 6, 5, 1.5); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function enemyDefeated(ctx, e) {
    const t = e.defeatT;                  // 1 -> 0
    shadow(ctx, e.x, e.y + 12, 16, 6);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.globalAlpha = Math.max(0, t);
    ctx.rotate((1 - t) * 1.4);
    ctx.fillStyle = C.bucket;
    ctx.beginPath(); ctx.moveTo(-11, -8); ctx.lineTo(11, -8); ctx.lineTo(8, 8); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill(); ol(ctx, 2);
    ctx.fillStyle = '#1a1a1a'; ctx.font = '10px sans-serif'; ctx.fillText('x x', -7, -2);
    ctx.restore();
    // zvezdice
    ctx.save(); ctx.globalAlpha = Math.max(0, t);
    ctx.fillStyle = '#f4c842';
    for (let i = 0; i < 3; i++) { const a = (1 - t) * 6 + i * 2; star(ctx, e.x + Math.cos(a) * (12 + (1 - t) * 14), e.y - 18 - (1 - t) * 12 + Math.sin(a) * 4, 4); }
    ctx.restore();
  }

  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45);
    }
    ctx.closePath(); ctx.fill();
  }

  // ---------------------------------------------------------------- BOSS: MORSKI GRGO
  function boss(ctx, b) {
    const flip = b.facing < -0.01 || Math.cos(b.facing) < 0 ? -1 : 1;
    const R = b.r;
    shadow(ctx, b.x, b.y + R * 0.7, R * 1.1, R * 0.4);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(flip, 1);
    if (b.hurtT > 0 && Math.floor(b.hurtT * 18) % 2) ctx.globalAlpha = 0.5;
    if (b.state === 'defeated') ctx.rotate(0.5);

    // rep
    ctx.fillStyle = C.boss;
    ctx.beginPath(); ctx.moveTo(-R * 0.9, 0); ctx.lineTo(-R * 1.6, -R * 0.5); ctx.lineTo(-R * 1.4, 0); ctx.lineTo(-R * 1.6, R * 0.5); ctx.closePath(); ctx.fill(); ol(ctx, 2.5);
    // telo
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.15, R * 0.92, 0, 0, 6.2832); ctx.fillStyle = C.boss; ctx.fill(); ol(ctx, 3);
    // svetli stomak
    ctx.beginPath(); ctx.ellipse(R * 0.15, R * 0.28, R * 0.85, R * 0.5, 0, 0, 6.2832); ctx.fillStyle = C.bossLight; ctx.fill();
    // pege
    ctx.fillStyle = 'rgba(20,60,60,0.35)';
    for (const s of [[-.3, -.4, .16], [.1, -.5, .12], [.4, -.2, .14], [-.1, -.1, .1]]) { circle(ctx, R * s[0], R * s[1], R * s[2], 'rgba(20,60,60,0.35)'); }
    // peraja
    ctx.fillStyle = C.boss;
    ctx.beginPath(); ctx.ellipse(R * 0.1, R * 0.85, R * 0.3, R * 0.5, 0.5, 0, 6.2832); ctx.fill(); ol(ctx, 2);
    ctx.beginPath(); ctx.moveTo(R * 0.1, -R * 0.85); ctx.lineTo(R * 0.45, -R * 1.3); ctx.lineTo(R * 0.55, -R * 0.7); ctx.closePath(); ctx.fill(); ol(ctx, 2);
    // medveđe uši
    circle(ctx, R * 0.55, -R * 0.75, R * 0.22, C.boss); ol(ctx, 2.5);
    circle(ctx, R * 0.95, -R * 0.6, R * 0.2, C.boss); ol(ctx, 2.5);
    // njuška
    circle(ctx, R * 0.95, R * 0.05, R * 0.42, C.bossSnout); ol(ctx, 2.5);
    circle(ctx, R * 1.2, R * 0.0, R * 0.1, '#2c2419');   // nos
    // usta — otvorena pri jurišu/ riku
    if (b.state === 'charge' || b.state === 'bite' || b.attackAnim > 0) {
      ctx.beginPath(); ctx.ellipse(R * 1.0, R * 0.32, R * 0.3, R * 0.22, 0, 0, 6.2832); ctx.fillStyle = '#7a2433'; ctx.fill(); ol(ctx, 2);
      ctx.fillStyle = '#fff';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(R * (0.86 + i * 0.06), R * 0.2); ctx.lineTo(R * (0.83 + i * 0.06), R * 0.32); ctx.lineTo(R * (0.89 + i * 0.06), R * 0.32); ctx.closePath(); ctx.fill(); }
    }
    // oči (ljute)
    ctx.fillStyle = '#fff'; circle(ctx, R * 0.45, -R * 0.18, R * 0.13, '#fff'); circle(ctx, R * 0.8, -R * 0.22, R * 0.12, '#fff');
    ctx.fillStyle = '#1a1a1a'; circle(ctx, R * 0.48, -R * 0.16, R * 0.06, '#1a1a1a'); circle(ctx, R * 0.82, -R * 0.2, R * 0.06, '#1a1a1a');
    if (b.state === 'defeated') { ctx.fillStyle = '#1a1a1a'; ctx.font = `${R * 0.3}px sans-serif`; ctx.fillText('x  x', R * 0.35, -R * 0.1); }
    // obrve
    ctx.strokeStyle = '#1a4b46'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(R * 0.34, -R * 0.4); ctx.lineTo(R * 0.58, -R * 0.28); ctx.moveTo(R * 0.7, -R * 0.42); ctx.lineTo(R * 0.92, -R * 0.34); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- PRIJATELJI (5 vrsta)
  function friend(ctx, f, bobT) {
    const bob = Math.sin(bobT * 3 + (f.index || 0)) * 3;
    ctx.save();
    ctx.translate(f.x, f.y + bob);
    // mehur oko prijatelja
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, 6.2832);
    ctx.fillStyle = 'rgba(150,220,240,0.28)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    const t = f.type || 'fish';
    if (t === 'octopus') friendOctopus(ctx, bobT);
    else if (t === 'urchin') friendUrchin(ctx);
    else if (t === 'clam') friendClam(ctx);
    else if (t === 'cucumber') friendCucumber(ctx);
    else friendFish(ctx);
    ctx.restore();
  }
  function smile(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0.1, Math.PI - 0.1); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a1a1a'; ctx.stroke(); }
  function eyes(ctx, lx, rx, y, r) { ctx.fillStyle = '#fff'; circle(ctx, lx, y, r, '#fff'); circle(ctx, rx, y, r, '#fff'); ctx.fillStyle = '#1a1a1a'; circle(ctx, lx, y, r * 0.5, '#1a1a1a'); circle(ctx, rx, y, r * 0.5, '#1a1a1a'); }

  function friendFish(ctx) {                 // Bubling
    circle(ctx, 0, 0, 12, C.friend); ol(ctx, 2.5);
    ctx.fillStyle = C.friendFin;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-16, -7); ctx.lineTo(-16, 7); ctx.closePath(); ctx.fill(); ol(ctx, 2);
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(4, -16); ctx.lineTo(7, -9); ctx.closePath(); ctx.fill(); ol(ctx, 2);
    eyes(ctx, 4, 9, -3, 3.4); smile(ctx, 5, 4, 4);
  }
  function friendOctopus(ctx, t) {           // Kora
    const pink = '#d96fa0';
    ctx.fillStyle = pink; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) { const x = i * 5; ctx.beginPath(); ctx.moveTo(x - 2, 5); ctx.quadraticCurveTo(x + Math.sin(t * 4 + i) * 3, 15, x + 2, 16); ctx.quadraticCurveTo(x + 4, 11, x + 2, 5); ctx.closePath(); ctx.fill(); }
    circle(ctx, 0, -2, 12, pink); ol(ctx, 2.5);
    ctx.strokeStyle = '#2c5f8a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-4, -3, 4, 0, 6.2832); ctx.stroke(); ctx.beginPath(); ctx.arc(5, -3, 4, 0, 6.2832); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.5, -3); ctx.lineTo(1.5, -3); ctx.stroke();
    ctx.fillStyle = '#1a1a1a'; circle(ctx, -4, -3, 1.5, '#1a1a1a'); circle(ctx, 5, -3, 1.5, '#1a1a1a');
    smile(ctx, 1, 3, 3);
  }
  function friendUrchin(ctx) {               // Šiljo
    const pur = C.coralPurple;
    ctx.strokeStyle = pur; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); ctx.stroke(); }
    circle(ctx, 0, 0, 9, pur); ol(ctx, 2.5);
    ctx.fillStyle = C.seaweed; rr(ctx, -9, -6, 18, 4, 2); ctx.fill();
    eyes(ctx, -3, 3, 1, 2.4);
  }
  function friendClam(ctx) {                 // Perla
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath(); ctx.moveTo(-13, 6); ctx.quadraticCurveTo(0, 18, 13, 6); ctx.quadraticCurveTo(0, 10, -13, 6); ctx.closePath(); ctx.fill(); ol(ctx, 2.5);
    circle(ctx, 0, 0, 8, '#f0a6c0'); ol(ctx, 2);
    ctx.fillStyle = '#fff'; rr(ctx, -7, -13, 14, 6, 2); ctx.fill(); ol(ctx, 1.5);
    ctx.strokeStyle = '#e8503a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -8); ctx.moveTo(-2, -10); ctx.lineTo(2, -10); ctx.stroke();
    ctx.fillStyle = '#1a1a1a'; circle(ctx, -3, -1, 1.4, '#1a1a1a'); circle(ctx, 3, -1, 1.4, '#1a1a1a'); smile(ctx, 0, 2, 2.5);
  }
  function friendCucumber(ctx) {             // Flopsi
    const grn = '#5fae8f';
    ctx.fillStyle = grn; rr(ctx, -8, -8, 16, 22, 8); ctx.fill(); ol(ctx, 2.5);
    ctx.fillStyle = 'rgba(40,90,70,0.4)'; circle(ctx, -3, 2, 1.6, 'rgba(40,90,70,0.4)'); circle(ctx, 4, 7, 1.6, 'rgba(40,90,70,0.4)');
    ctx.fillStyle = '#c9a14a'; rr(ctx, -7, -13, 14, 5, 2); ctx.fill(); ol(ctx, 1.5);
    eyes(ctx, -3, 4, -3, 2.6); smile(ctx, 0, 1, 3);
  }

  function cage(ctx, x, y, broken) {
    shadow(ctx, x, y + 22, 26, 8);
    ctx.save(); ctx.translate(x, y);
    // baza
    ctx.fillStyle = C.stoneDark; rr(ctx, -24, 16, 48, 8, 3); ctx.fill(); ol(ctx, 2);
    if (!broken) {
      ctx.strokeStyle = C.stoneLight; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 7, 16); ctx.lineTo(i * 7, -22); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(0, -22, 24, 10, 0, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -32, 5, 0, 6.2832); ctx.stroke();   // kuka
    } else {
      ctx.strokeStyle = C.stoneLight; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-20, 16); ctx.lineTo(-22, -10); ctx.moveTo(18, 16); ctx.lineTo(24, -6); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- HRANA / PICKUP
  function coral(ctx, x, y, t) {
    const pulse = 1 + Math.sin(t * 4) * 0.08;
    ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
    // sjaj
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, 6.2832); ctx.fillStyle = 'rgba(255,220,150,0.25)'; ctx.fill();
    ctx.strokeStyle = C.coralPink; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(-7, -6); ctx.moveTo(0, 9); ctx.lineTo(0, -10);
    ctx.moveTo(5, 8); ctx.lineTo(8, -5); ctx.stroke();
    ctx.strokeStyle = C.coralOrange; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-2, 8); ctx.lineTo(-3, -2); ctx.moveTo(3, 8); ctx.lineTo(4, 0); ctx.stroke();
    ctx.restore();
  }

  function shellFood(ctx, x, y, t) {
    const pulse = 1 + Math.sin(t * 4 + 1) * 0.08;
    ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, 6.2832); ctx.fillStyle = 'rgba(180,230,255,0.25)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 8);
    ctx.lineTo(-11, 2); ctx.quadraticCurveTo(-12, -6, -5, -8);
    ctx.quadraticCurveTo(0, -11, 5, -8); ctx.quadraticCurveTo(12, -6, 11, 2); ctx.closePath();
    ctx.fillStyle = '#cfe8f5'; ctx.fill(); ol(ctx, 2.5);
    ctx.strokeStyle = '#9ec4d8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(0, 7); ctx.lineTo(i * 5, -7); } ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- DEKORACIJE
  function decoration(ctx, d) {
    const x = d.x, y = d.y;
    shadow(ctx, x, y + 14, 14, 5);
    ctx.save(); ctx.translate(x, y);
    if (d.type === 'lampa') {
      ctx.strokeStyle = C.coralPink; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6, 14); ctx.lineTo(-8, -2); ctx.moveTo(-2, 14); ctx.lineTo(-2, -6); ctx.stroke();
      ctx.fillStyle = '#8a5a36'; rr(ctx, 2, -16, 9, 16, 2); ctx.fill(); ol(ctx, 2);
      ctx.fillStyle = '#ffd98a'; circle(ctx, 6.5, -8, 4, '#ffd98a');
      ctx.save(); ctx.globalAlpha = .4; circle(ctx, 6.5, -8, 10, '#ffe9b0'); ctx.restore();
    } else if (d.type === 'zastava') {
      ctx.strokeStyle = '#8a5a36'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-8, 14); ctx.lineTo(-8, -20); ctx.stroke();
      ctx.fillStyle = '#3a93ad'; ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(12, -15); ctx.lineTo(-8, -8); ctx.closePath(); ctx.fill(); ol(ctx, 2);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-2, -16); ctx.lineTo(2, -10); ctx.lineTo(-6, -10); ctx.closePath(); ctx.fill();
    } else if (d.type === 'krevet') {
      ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.ellipse(0, 6, 18, 9, 0, 0, 6.2832); ctx.fill(); ol(ctx, 2.5);
      ctx.fillStyle = C.coralPurple; ctx.beginPath(); ctx.ellipse(0, 2, 13, 6, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fff'; circle(ctx, -4, 0, 4, '#fff');
    } else if (d.type === 'sanduk') {
      ctx.fillStyle = '#8a5a36'; rr(ctx, -13, -6, 26, 18, 3); ctx.fill(); ol(ctx, 2.5);
      ctx.fillStyle = '#6b4423'; rr(ctx, -13, -14, 26, 10, 3); ctx.fill(); ol(ctx, 2.5);
      ctx.fillStyle = '#d4a23a'; circle(ctx, 0, -2, 2.5, '#d4a23a');
    } else { // biljka
      ctx.fillStyle = C.stone; rr(ctx, -9, 2, 18, 12, 3); ctx.fill(); ol(ctx, 2);
      ctx.strokeStyle = C.seaweed; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-3, 2); ctx.quadraticCurveTo(-8, -10, -4, -16);
      ctx.moveTo(3, 2); ctx.quadraticCurveTo(8, -8, 5, -16); ctx.stroke();
      ctx.strokeStyle = C.coralOrange; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -10); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- DEKORI POZADINE
  function seaweed(ctx, x, y, h, sway) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = C.seaweedDark; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * 5, 0);
      ctx.quadraticCurveTo(i * 5 + sway, -h * 0.5, i * 4 + sway * 1.5, -h);
      ctx.stroke();
    }
    ctx.restore();
  }

  function coralBush(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    const cols = [C.coralPink, C.coralOrange, C.coralPurple];
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = cols[i % 3]; ctx.lineWidth = 5; ctx.lineCap = 'round';
      const bx = (i - 2) * 6;
      ctx.beginPath(); ctx.moveTo(bx, 4); ctx.lineTo(bx + (i - 2), -10 - (i % 2) * 6); ctx.stroke();
    }
    ctx.restore();
  }

  function rock(ctx, x, y, r) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = C.stone; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.78, 0, 0, 6.2832); ctx.fill(); ol(ctx, 2.5);
    ctx.fillStyle = C.stoneLight; ctx.beginPath(); ctx.ellipse(-r * 0.25, -r * 0.25, r * 0.4, r * 0.3, 0, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  return { player, enemy, boss, friend, cage, coral, shellFood, decoration, seaweed, coralBush, rock, shadow, star, rr, circle };
})();
