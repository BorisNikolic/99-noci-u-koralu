/* =========================================================================
 * world.js — Mapa: pozadina (jednom u offscreen platno), jazbina (safe zone),
 * zone hrane, tačke pojavljivanja neprijatelja, kavez. Global: World
 * ========================================================================= */
class World {
  constructor() {
    const C = CONFIG.colors;
    this.w = CONFIG.world.w; this.h = CONFIG.world.h;
    // Jazbina (kružna bezbedna zona) — levo-centralno
    this.burrow = { x: 700, y: 980, r: 210 };
    this.start = { x: this.burrow.x, y: this.burrow.y + 40 };
    // Zone u kojima raste hrana (svaka ima nekoliko tačaka)
    this.foodZones = [
      { x: 1180, y: 720, r: 120, n: 4 },
      { x: 1500, y: 1280, r: 140, n: 4 },
      { x: 1980, y: 1040, r: 130, n: 4 },
      { x: 980, y: 1320, r: 110, n: 3 },
    ];
    // Dodatna zona hrane (mapa je veća zbog 5 prijatelja)
    this.foodZones.push({ x: 2260, y: 1180, r: 120, n: 3 });
    // Patrolne tačke običnih neprijatelja
    this.enemyPosts = [
      { x: 1320, y: 900 }, { x: 1750, y: 1320 }, { x: 1320, y: 1350 },
    ];
    // 5 prijatelja — svaki u svom kavezu sa čuvarima (raspoređeni po mapi)
    // Bubling čuva i boss (gore-desno, „dublji kanal").
    this.friends = [
      { name: 'Bubling', type: 'fish',     cage: { x: 2250, y: 360 },  guards: [{ x: 2110, y: 450 }, { x: 2370, y: 470 }] },
      { name: 'Kora',    type: 'octopus',  cage: { x: 1620, y: 250 },  guards: [{ x: 1530, y: 360 }] },
      { name: 'Šiljo',   type: 'urchin',   cage: { x: 2380, y: 980 },  guards: [{ x: 2250, y: 1020 }] },
      { name: 'Perla',   type: 'clam',     cage: { x: 1420, y: 1540 }, guards: [{ x: 1540, y: 1450 }] },
      { name: 'Flopsi',  type: 'cucumber', cage: { x: 2180, y: 1540 }, guards: [{ x: 2050, y: 1460 }] },
    ];
    this.bossStart = { x: 2050, y: 720 };
    // Voda (dublji kanal) — vizuelno
    this.water = { x: 2050, y: 560, rx: 620, ry: 540 };
    this._decals = [];
    this._scatter();
    this.bg = this._buildBackground();
  }

  isInBurrow(x, y) { return Utils.dist2(x, y, this.burrow.x, this.burrow.y) < this.burrow.r * this.burrow.r; }

  // Drži entiteta unutar granica sveta
  clampWorld(e) {
    e.x = Utils.clamp(e.x, e.r, this.w - e.r);
    e.y = Utils.clamp(e.y, e.r, this.h - e.r);
  }

  // Gura entiteta van jazbine (za neprijatelje/bossa)
  pushOutOfBurrow(e) {
    const b = this.burrow, minD = b.r + e.r;
    const d = Utils.dist(e.x, e.y, b.x, b.y);
    if (d < minD && d > 0.001) {
      const nx = (e.x - b.x) / d, ny = (e.y - b.y) / d;
      e.x = b.x + nx * minD; e.y = b.y + ny * minD;
    }
  }

  _scatter() {
    // Determinističko raspoređivanje dekora (stabilan izgled)
    let seed = 1337;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const farFromBurrow = (x, y) => Utils.dist(x, y, this.burrow.x, this.burrow.y) > this.burrow.r + 50;
    for (let i = 0; i < 90; i++) {
      const x = rnd() * this.w, y = rnd() * this.h;
      if (!farFromBurrow(x, y)) continue;
      if (this.friends.some(f => Utils.dist(x, y, f.cage.x, f.cage.y) < 90)) continue;
      const t = rnd();
      if (t < 0.5) this._decals.push({ k: 'seaweed', x, y, h: 26 + rnd() * 26, p: rnd() * 6 });
      else if (t < 0.8) this._decals.push({ k: 'coral', x, y });
      else this._decals.push({ k: 'rock', x, y, r: 10 + rnd() * 16 });
    }
  }

  _buildBackground() {
    const C = CONFIG.colors;
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d');

    // Pesak
    ctx.fillStyle = C.sand; ctx.fillRect(0, 0, this.w, this.h);
    let seed = 99;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    ctx.fillStyle = C.sandDark; ctx.globalAlpha = 0.5;
    for (let i = 0; i < 700; i++) { ctx.beginPath(); ctx.arc(rnd() * this.w, rnd() * this.h, 2 + rnd() * 5, 0, 6.2832); ctx.fill(); }
    ctx.globalAlpha = 1;

    // Dublji kanal (voda)
    const wt = this.water;
    const grad = ctx.createRadialGradient(wt.x, wt.y, 50, wt.x, wt.y, wt.rx);
    grad.addColorStop(0, C.waterDeep); grad.addColorStop(0.7, C.waterShallow); grad.addColorStop(1, 'rgba(127,208,224,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(wt.x, wt.y, wt.rx, wt.ry, 0, 0, 6.2832); ctx.fill();

    // Dekori
    for (const d of this._decals) {
      if (d.k === 'seaweed') Art.seaweed(ctx, d.x, d.y, d.h, Math.sin(d.p) * 6);
      else if (d.k === 'coral') Art.coralBush(ctx, d.x, d.y);
      else Art.rock(ctx, d.x, d.y, d.r);
    }

    // Oznake zona hrane (mehur prsten)
    for (const z of this.foodZones) {
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 6.2832);
      ctx.strokeStyle = 'rgba(127,208,224,0.4)'; ctx.lineWidth = 3; ctx.setLineDash([10, 12]); ctx.stroke(); ctx.setLineDash([]);
    }

    this._drawBurrow(ctx);
    return cv;
  }

  _drawBurrow(ctx) {
    const C = CONFIG.colors, b = this.burrow;
    // Unutrašnji pesak (svetliji) + senka oboda
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832);
    ctx.fillStyle = '#efe0bd'; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.stroke();
    // Tepih sa zvezdom (kao u referenci)
    ctx.beginPath(); ctx.arc(b.x, b.y, 52, 0, 6.2832); ctx.fillStyle = '#7fae8f'; ctx.fill();
    ctx.strokeStyle = '#5e8c6e'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#e7a93a'; Art.star(ctx, b.x, b.y, 22);
    // Kameni zid (prsten od kamenova), sa otvorom za vrata (desno)
    const stones = 34;
    for (let i = 0; i < stones; i++) {
      const a = i / stones * Math.PI * 2;
      if (a > 0.18 && a < 0.72) continue;            // otvor (vrata) na desnoj strani
      const sx = b.x + Math.cos(a) * (b.r + 6), sy = b.y + Math.sin(a) * (b.r + 6);
      Art.rock(ctx, sx, sy, 15 + (i % 3) * 3);
    }
    // Zastava na zidu (gore)
    const fx = b.x + Math.cos(-1.4) * (b.r + 6), fy = b.y + Math.sin(-1.4) * (b.r + 6);
    ctx.strokeStyle = '#8a5a36'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 46); ctx.stroke();
    ctx.fillStyle = '#3a93ad'; ctx.beginPath(); ctx.moveTo(fx, fy - 46); ctx.lineTo(fx + 30, fy - 40); ctx.lineTo(fx, fy - 30); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#2c2419'; ctx.stroke();
    ctx.fillStyle = '#fff'; Art.star(ctx, fx + 9, fy - 38, 4);
  }
}
