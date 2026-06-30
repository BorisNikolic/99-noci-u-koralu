/* =========================================================================
 * utils.js — matematički i pomoćni alati. Global: Utils
 * ========================================================================= */
const Utils = {
  clamp: (v, lo, hi) => v < lo ? lo : v > hi ? hi : v,
  lerp: (a, b, t) => a + (b - a) * t,
  dist2: (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; },
  dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
  angle: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  choice: arr => arr[Math.floor(Math.random() * arr.length)],

  // Razlika dva ugla normalizovana na [-PI, PI]
  angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  },

  // Krug-krug sudar
  circlesHit: (ax, ay, ar, bx, by, br) => Utils.dist2(ax, ay, bx, by) < (ar + br) * (ar + br),

  // Da li je tačka u rotiranom isečku (za zamah kopljem): dist <= range i ugao u luku
  inArc(px, py, ox, oy, facing, range, halfArc) {
    if (Utils.dist2(px, py, ox, oy) > range * range) return false;
    return Math.abs(Utils.angleDiff(Utils.angle(ox, oy, px, py), facing)) <= halfArc;
  },

  // Pomeranje vrednosti ka cilju brzinom rate*dt
  approach(v, target, step) {
    if (v < target) return Math.min(v + step, target);
    if (v > target) return Math.max(v - step, target);
    return v;
  },
};
