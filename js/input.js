/* =========================================================================
 * input.js — Objedinjeni unos: tastatura (desktop) + multi-touch (tablet).
 * Crta se preko UIManager-a, a logika/hit-test stoje ovde.
 * Global: Input (klasa). Akcije: move {x,y}, running, pressed(id), held(id).
 * ========================================================================= */
class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();           // trenutno pritisnuti kodovi
    this.keyEdge = new Set();        // pritisnuti baš u ovom frejmu
    this.touchDown = new Set();      // akcije aktivne preko ekrana
    this.touchEdge = new Set();      // ekran-akcije ovog frejma
    this.pointers = new Map();       // pointerId -> {role, x, y}
    this.joyId = null;               // pointerId koji kontroliše joystick
    this.joy = { active: false, baseX: 0, baseY: 0, x: 0, y: 0, mag: 0, dx: 0, dy: 0 };
    this.touchActive = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.buttons = [];
    this.maxJoy = 78;
    this.showDecorate = false;       // postavlja GameManager kad je igrač u jazbini
    this._layout();
    this._bind();
  }

  // Mapiranje tastera -> akcija
  static KEYMAP = {
    Space: 'attack', KeyE: 'interact', KeyF: 'eat', KeyQ: 'signal',
    Tab: 'inventory', KeyB: 'decorate', Escape: 'pause', Enter: 'confirm',
  };

  _layout() {
    const { w, h } = CONFIG.view;
    // Donji-desni klaster za glavne akcije
    this.buttons = [
      { id: 'attack',    x: w - 120, y: h - 120, r: 62, label: 'NAPAD',  key: 'Space', color: '#ef6f5c' },
      { id: 'interact',  x: w - 252, y: h - 150, r: 46, label: 'E',      key: 'E',     color: '#4cb3c9', glyph: '✋' },
      { id: 'eat',       x: w - 150, y: h - 268, r: 46, label: 'JEDI',   key: 'F',     color: '#5fae4e', glyph: '🍴' },
      { id: 'signal',    x: w - 286, y: h - 272, r: 44, label: 'SIGNAL', key: 'Q',     color: '#e8a23a', glyph: '📡' },
      // Gornji-desni: meni dugmad
      { id: 'pause',     x: w - 52,  y: 52, r: 30, label: '⏸', key: 'Esc',  color: '#7b828c', small: true },
      { id: 'inventory', x: w - 126, y: 52, r: 30, label: '🎒', key: 'Tab',  color: '#7b828c', small: true },
      { id: 'decorate',  x: w - 200, y: 52, r: 30, label: '✨', key: 'B',    color: '#9b6fc4', small: true, onlyBurrow: true },
    ];
  }

  _bind() {
    addEventListener('keydown', e => {
      if (Input.KEYMAP[e.code] || ['Tab', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.keyEdge.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.pointers.clear(); this.joy.active = false; });

    const c = this.canvas;
    const opt = { passive: false };
    c.addEventListener('pointerdown', e => this._down(e), opt);
    c.addEventListener('pointermove', e => this._move(e), opt);
    c.addEventListener('pointerup', e => this._up(e), opt);
    c.addEventListener('pointercancel', e => this._up(e), opt);
    c.addEventListener('contextmenu', e => e.preventDefault());
  }

  // Klijent koordinate -> logičke koordinate platna
  _toLogical(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * CONFIG.view.w,
      y: (e.clientY - r.top) / r.height * CONFIG.view.h,
    };
  }

  _btnAt(x, y) {
    for (const b of this.buttons) {
      if (b.onlyBurrow && !this.showDecorate) continue;
      if (Utils.dist2(x, y, b.x, b.y) <= b.r * b.r) return b;
    }
    return null;
  }

  _down(e) {
    if (e.pointerType === 'touch') this.touchActive = true;
    this.canvas.setPointerCapture?.(e.pointerId);
    const p = this._toLogical(e);
    const btn = this._btnAt(p.x, p.y);
    if (btn) {
      this.pointers.set(e.pointerId, { role: 'btn:' + btn.id, x: p.x, y: p.y });
      this.touchDown.add(btn.id);
      this.touchEdge.add(btn.id);
    } else if (p.x < CONFIG.view.w * 0.55 && this.joyId == null) {
      // Levi/srednji deo = pokretni joystick (samo jedan prst kontroliše)
      this.joyId = e.pointerId;
      this.pointers.set(e.pointerId, { role: 'joy', x: p.x, y: p.y });
      this.joy.active = true; this.joy.baseX = p.x; this.joy.baseY = p.y;
      this.joy.x = p.x; this.joy.y = p.y; this.joy.dx = 0; this.joy.dy = 0; this.joy.mag = 0;
    } else {
      this.pointers.set(e.pointerId, { role: 'none', x: p.x, y: p.y });
    }
    e.preventDefault();
  }

  _move(e) {
    const ptr = this.pointers.get(e.pointerId);
    if (!ptr) return;
    const p = this._toLogical(e);
    ptr.x = p.x; ptr.y = p.y;
    if (ptr.role.startsWith('btn:')) {
      // ako prst sklizne sa dugmeta, otpusti ga (da se napad ne "zaglavi")
      const id = ptr.role.slice(4), b = this.buttons.find(b => b.id === id);
      if (b && Utils.dist2(p.x, p.y, b.x, b.y) > (b.r * 1.35) * (b.r * 1.35)) { this.touchDown.delete(id); ptr.role = 'none'; }
    } else if (ptr.role === 'joy') {
      let dx = p.x - this.joy.baseX, dy = p.y - this.joy.baseY;
      const len = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(len, this.maxJoy);
      this.joy.dx = dx / len; this.joy.dy = dy / len;
      this.joy.mag = clamped / this.maxJoy;
      this.joy.x = this.joy.baseX + this.joy.dx * clamped;
      this.joy.y = this.joy.baseY + this.joy.dy * clamped;
    }
    e.preventDefault();
  }

  _up(e) {
    const ptr = this.pointers.get(e.pointerId);
    if (ptr) {
      if (ptr.role === 'joy') { this.joy.active = false; this.joy.mag = 0; this.joy.dx = 0; this.joy.dy = 0; this.joyId = null; }
      else if (ptr.role.startsWith('btn:')) this.touchDown.delete(ptr.role.slice(4));
      this.pointers.delete(e.pointerId);
    }
    if (e.pointerId === this.joyId) this.joyId = null;
    e.preventDefault();
  }

  // --- Upiti koje koristi ostatak igre ---
  // Vektor kretanja (-1..1), spojeni tastatura + joystick
  get move() {
    let x = 0, y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    if (this.joy.active && this.joy.mag > 0.12) return { x: this.joy.dx * this.joy.mag, y: this.joy.dy * this.joy.mag };
    return { x: 0, y: 0 };
  }

  get running() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || (this.joy.active && this.joy.mag > 0.85);
  }

  // Da li je akcija upravo pritisnuta (jedan okidač)
  pressed(id) {
    if (this.touchEdge.has(id)) return true;
    for (const code in Input.KEYMAP)
      if (Input.KEYMAP[code] === id && this.keyEdge.has(code)) return true;
    return false;
  }

  // Da li je akcija trenutno držana (npr. napad)
  held(id) {
    if (this.touchDown.has(id)) return true;
    for (const code in Input.KEYMAP)
      if (Input.KEYMAP[code] === id && this.keys.has(code)) return true;
    return false;
  }

  // Pozvati na KRAJU svakog frejma da se obrišu "edge" događaji
  endFrame() { this.keyEdge.clear(); this.touchEdge.clear(); }
}
