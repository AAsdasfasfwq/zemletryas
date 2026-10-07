// Deterministic helpers: everything in the film is a pure function of time,
// so randomness is always seeded and noise is stateless.
import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const remap = (x, a, b, c, d) => lerp(c, d, invLerp(a, b, x));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const smoother = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const step01 = (x, a, b) => smooth(invLerp(a, b, x));
export const fract = (x) => x - Math.floor(x);
export const TAU = Math.PI * 2;
export const deg = (d) => (d * Math.PI) / 180;

export const ease = {
  linear: (t) => clamp(t),
  inQuad: (t) => clamp(t) ** 2,
  outQuad: (t) => 1 - (1 - clamp(t)) ** 2,
  inOut: (t) => smooth(t),
  inCubic: (t) => clamp(t) ** 3,
  outCubic: (t) => 1 - (1 - clamp(t)) ** 3,
  inOutCubic: (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; },
  outQuart: (t) => 1 - (1 - clamp(t)) ** 4,
  inQuart: (t) => clamp(t) ** 4,
  outExpo: (t) => { t = clamp(t); return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
  inExpo: (t) => { t = clamp(t); return t === 0 ? 0 : Math.pow(2, 10 * t - 10); },
  inOutExpo: (t) => { t = clamp(t); if (t === 0 || t === 1) return t; return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2; },
  outBack: (t, s = 1.70158) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; },
  outElastic: (t) => { t = clamp(t); if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1; },
  outBounce: (t) => {
    t = clamp(t); const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

// ---------- seeded random ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class RNG {
  constructor(seed = 1) { this.r = mulberry32(seed * 9973 + 17); }
  next() { return this.r(); }
  range(a, b) { return a + (b - a) * this.r(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.r() * arr.length) % arr.length]; }
  chance(p) { return this.r() < p; }
  sign() { return this.r() < 0.5 ? -1 : 1; }
  gauss() { let u = 0, v = 0; while (u === 0) u = this.r(); v = this.r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
}
export function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
export function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; return s - Math.floor(s); }

// ---------- value noise ----------
export function noise1(x) {
  const i = Math.floor(x), f = x - i; const u = f * f * (3 - 2 * f);
  return lerp(hash1(i), hash1(i + 1), u) * 2 - 1;
}
export function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y); const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}
export function fbm2(x, y, oct = 5, lac = 2.0, gain = 0.5) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise2(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= gain; f *= lac; }
  return s / n;
}
export function ridged2(x, y, oct = 6) {
  let s = 0, a = 0.5, f = 1, n = 0, w = 1;
  for (let i = 0; i < oct; i++) { let v = 1 - Math.abs(noise2(x * f + i * 5.3, y * f - i * 2.9)); v = v * v * w; w = clamp(v * 1.6); s += a * v; n += a; a *= 0.5; f *= 2.1; }
  return s / n;
}
export function fbm1(x, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise1(x * f + i * 31.7); n += a; a *= 0.5; f *= 2; }
  return s / n;
}

// envelope: 0 before a, ramps up over fi, holds, ramps down over fo ending at b
export function envelope(t, a, b, fi = 0.3, fo = 0.3) {
  if (t <= a || t >= b) return 0;
  return Math.min(fi > 0 ? smooth((t - a) / fi) : 1, fo > 0 ? smooth((b - t) / fo) : 1);
}

// ---------- three helpers ----------
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const col = (c) => new THREE.Color(c);
export function lerpV(a, b, t, out = new THREE.Vector3()) { return out.set(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t)); }
export function bezier3(p0, p1, p2, p3, t, out = new THREE.Vector3()) {
  const it = 1 - t;
  return out.set(
    it * it * it * p0.x + 3 * it * it * t * p1.x + 3 * it * t * t * p2.x + t * t * t * p3.x,
    it * it * it * p0.y + 3 * it * it * t * p1.y + 3 * it * t * t * p2.y + t * t * t * p3.y,
    it * it * it * p0.z + 3 * it * it * t * p1.z + 3 * it * t * t * p2.z + t * t * t * p3.z);
}
// Catmull-Rom path through points (array of Vector3), t in 0..1
export function pathAt(points, t, out = new THREE.Vector3()) {
  const n = points.length - 1; const f = clamp(t) * n; const i = Math.min(Math.floor(f), n - 1); const u = f - i;
  const p0 = points[Math.max(i - 1, 0)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(i + 2, n)];
  const u2 = u * u, u3 = u2 * u;
  const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u2 + (-a + 3 * b - 3 * c2 + d) * u3);
  return out.set(c(p0.x, p1.x, p2.x, p3.x), c(p0.y, p1.y, p2.y, p3.y), c(p0.z, p1.z, p2.z, p3.z));
}

export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); });
  });
}

// merge an array of {geometry, matrix?, color?} into one BufferGeometry with vertex colors
export function mergeColored(parts) {
  let vCount = 0, iCount = 0;
  const prepared = parts.map((p) => {
    let g = p.geometry.index ? p.geometry : p.geometry; // keep indexed if present
    g = g.toNonIndexed ? g : g;
    return g;
  });
  for (const g of prepared) { vCount += g.attributes.position.count; iCount += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3), colr = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2);
  const idx = new Uint32Array(iCount);
  let vo = 0, io = 0; const v = new THREE.Vector3(), nm = new THREE.Matrix3(); const c = new THREE.Color();
  parts.forEach((p, k) => {
    const g = prepared[k]; const m = p.matrix || new THREE.Matrix4(); nm.getNormalMatrix(m);
    c.set(p.color !== undefined ? p.color : 0xffffff);
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m); pos.set([v.x, v.y, v.z], (vo + i) * 3);
      if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (vo + i) * 3); }
      colr.set([c.r, c.g, c.b], (vo + i) * 3);
      if (U) uv.set([U.getX(i), U.getY(i)], (vo + i) * 2);
    }
    if (g.index) { for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo; io += g.index.count; }
    else { for (let i = 0; i < P.count; i++) idx[io + i] = vo + i; io += P.count; }
    vo += P.count;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

export function m4(pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
  return m.compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...(typeof scl === 'number' ? [scl, scl, scl] : scl)));
}
