// Shared props: materials, trees, street furniture, vehicles, rubble.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RNG, TAU, noise2, clamp, lerp } from '../engine/util.js';

const matCache = new Map();
export function mat(color, o = {}) {
  const key = (typeof color === 'object' ? color.getHexString() : color) + JSON.stringify(o);
  if (!matCache.has(key)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough === undefined ? 0.75 : o.rough, metalness: o.metal || 0, flatShading: !!o.flat, ...(o.emissive ? { emissive: new THREE.Color(o.emissive), emissiveIntensity: o.ei || 1 } : {}), ...(o.transparent ? { transparent: true, opacity: o.opacity } : {}), side: o.side || THREE.FrontSide });
    if (o.vc) m.vertexColors = true;
    matCache.set(key, m);
  }
  return matCache.get(key);
}
// emissive materials that should change intensity per shot are created fresh (not cached)
export function glowMat(color, intensity = 2) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) }); }

export function jitterGeo(g, amt, seed = 1) {
  const p = g.attributes.position; const r = new RNG(seed);
  const map = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!map.has(k)) map.set(k, [(r.next() - 0.5) * amt, (r.next() - 0.5) * amt, (r.next() - 0.5) * amt]);
    const j = map.get(k); p.setXYZ(i, p.getX(i) + j[0], p.getY(i) + j[1], p.getZ(i) + j[2]);
  }
  g.computeVertexNormals(); return g;
}
export function box(w, h, d, m, x = 0, y = 0, z = 0) { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); return me; }
export function rbox(w, h, d, r, m, x = 0, y = 0, z = 0, seg = 2) { const me = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), m); me.position.set(x, y, z); return me; }
export function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 12) { const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); me.position.set(x, y, z); return me; }
export function sph(r, m, x = 0, y = 0, z = 0, ws = 16, hs = 12) { const me = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), m); me.position.set(x, y, z); return me; }
export function shadowAll(o, cast = true, recv = true) { o.traverse((c) => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = recv; } }); return o; }

// ---------------- trees ----------------
const LEAF = ['#4f8a2f', '#5e9a35', '#3f7a2a', '#6aa23c', '#47812e', '#2f6b2a'];
export function makeTree(seed = 1, { winter = false, snow = false, scale = 1, kind = 'round' } = {}) {
  const r = new RNG(seed); const g = new THREE.Group();
  const trunkM = mat('#5b4331', { rough: 0.95 });
  const h = (2.2 + r.next() * 1.6) * scale;
  const trunk = cyl(0.09 * scale, 0.16 * scale, h, trunkM, 0, h / 2, 0, 7); g.add(trunk);
  if (kind === 'pine') {
    const lm = mat(r.pick(['#2f5f34', '#2a5530', '#35663a']), { rough: 0.9, flat: true });
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.5 - i * 0.35) * scale, 2.2 * scale, 8), lm); c.position.y = h * 0.6 + i * 1.1 * scale; g.add(c); if (snow) { const sc = new THREE.Mesh(new THREE.ConeGeometry((1.2 - i * 0.3) * scale, 0.7 * scale, 8), mat('#eef3f8', { rough: 0.8 })); sc.position.y = c.position.y + 0.8 * scale; g.add(sc); } }
    return shadowAll(g);
  }
  if (winter) {
    const bm = mat('#4a3a2e', { rough: 0.95 });
    for (let i = 0; i < 6; i++) {
      const b = cyl(0.02 * scale, 0.06 * scale, 1.6 * scale, bm, 0, 0, 0, 5);
      const a = (i / 6) * TAU + r.next(); b.position.set(Math.cos(a) * 0.35 * scale, h * (0.75 + r.next() * 0.2), Math.sin(a) * 0.35 * scale);
      b.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); g.add(b);
    }
    if (snow) { const s = sph(0.5 * scale, mat('#e8eef5'), 0, h + 0.1, 0, 8, 6); s.scale.set(1.4, 0.35, 1.4); g.add(s); }
    return shadowAll(g);
  }
  const lm = mat(r.pick(LEAF), { rough: 0.85, flat: true });
  const n = 3 + r.int(0, 2);
  for (let i = 0; i < n; i++) {
    const rad = (0.9 + r.next() * 0.7) * scale;
    const geo = jitterGeo(new THREE.IcosahedronGeometry(rad, 1), 0.35 * scale, seed * 10 + i);
    const m = new THREE.Mesh(geo, lm); const a = r.next() * TAU;
    m.position.set(Math.cos(a) * 0.6 * scale * (i ? 1 : 0), h + (r.next() - 0.2) * 0.9 * scale, Math.sin(a) * 0.6 * scale * (i ? 1 : 0));
    g.add(m);
    if (snow) { const s = new THREE.Mesh(geo, mat('#eef2f7', { rough: 0.8, flat: true })); s.scale.set(0.95, 0.45, 0.95); s.position.copy(m.position).add(new THREE.Vector3(0, rad * 0.45, 0)); g.add(s); }
  }
  return shadowAll(g);
}
export function makeCypress(seed = 1, scale = 1) {
  const g = new THREE.Group(); const r = new RNG(seed);
  const m = mat(r.pick(['#2c5531', '#2f5c35']), { rough: 0.9, flat: true });
  const c = new THREE.Mesh(jitterGeo(new THREE.ConeGeometry(0.8 * scale, 7 * scale, 8, 4), 0.2, seed), m); c.position.y = 4 * scale; g.add(c);
  g.add(cyl(0.12, 0.15, 1.2, mat('#5b4331'), 0, 0.6, 0, 6));
  return shadowAll(g);
}

// ---------------- street furniture ----------------
export function makeStreetLamp(lightOn = 1) {
  const g = new THREE.Group(); const pm = mat('#2e3236', { rough: 0.5, metal: 0.6 });
  g.add(cyl(0.06, 0.09, 6, pm, 0, 3, 0, 8));
  const arm = box(1.4, 0.07, 0.07, pm, 0.65, 5.95, 0); g.add(arm);
  const head = box(0.6, 0.12, 0.26, pm, 1.3, 5.9, 0); g.add(head);
  const bulbM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.72, 0.38).multiplyScalar(4 * lightOn) });
  const bulb = box(0.5, 0.04, 0.2, bulbM, 1.3, 5.83, 0); g.add(bulb); g.userData.bulb = bulb; g.userData.bulbMat = bulbM;
  return shadowAll(g, true, false);
}
export function makeBench() {
  const g = new THREE.Group(); const wm = mat('#8a5a34'); const im = mat('#2a2a2a', { metal: 0.5, rough: 0.5 });
  for (let i = 0; i < 3; i++) g.add(box(1.6, 0.05, 0.12, wm, 0, 0.45, -0.15 + i * 0.15));
  for (let i = 0; i < 2; i++) g.add(box(1.6, 0.12, 0.04, wm, 0, 0.7 + i * 0.17, -0.25));
  g.add(box(0.06, 0.45, 0.4, im, -0.7, 0.22, 0)); g.add(box(0.06, 0.45, 0.4, im, 0.7, 0.22, 0));
  return shadowAll(g);
}
export function makeUmbrellaTable(seed = 1) {
  const r = new RNG(seed); const g = new THREE.Group();
  const cloth = mat(r.pick(['#c0392b', '#e6a23c', '#2e86ab', '#f1e3c8', '#3b8d5a']), { rough: 0.8, side: THREE.DoubleSide });
  g.add(cyl(0.45, 0.45, 0.04, mat('#e8e2d6'), 0, 0.74, 0, 16));
  g.add(cyl(0.03, 0.03, 0.74, mat('#333'), 0, 0.37, 0, 6));
  g.add(cyl(0.025, 0.025, 2.3, mat('#ddd'), 0, 1.15, 0, 6));
  const u = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.45, 8, 1, true), cloth); u.position.y = 2.35; g.add(u);
  // tea glasses
  for (let i = 0; i < 2; i++) { const tg = cyl(0.03, 0.022, 0.08, mat('#a8321e', { rough: 0.2 }), -0.15 + i * 0.3, 0.8, 0.1, 8); g.add(tg); }
  return shadowAll(g);
}
export function makeChair(color = '#6b4a2e') {
  const g = new THREE.Group(); const m = mat(color);
  g.add(box(0.42, 0.04, 0.42, m, 0, 0.45, 0)); g.add(box(0.42, 0.45, 0.04, m, 0, 0.68, -0.19));
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) g.add(box(0.03, 0.45, 0.03, m, x, 0.22, z));
  return shadowAll(g);
}
export function makeStall(seed = 1) {
  const r = new RNG(seed); const g = new THREE.Group();
  const w = 2.6, d = 1.6;
  const tm = mat('#7a5534');
  g.add(box(w, 0.08, d, tm, 0, 0.85, 0));
  for (const [x, z] of [[-w / 2 + 0.05, -d / 2 + 0.05], [w / 2 - 0.05, -d / 2 + 0.05], [-w / 2 + 0.05, d / 2 - 0.05], [w / 2 - 0.05, d / 2 - 0.05]]) g.add(box(0.06, 2.4, 0.06, tm, x, 1.2, z));
  const stripeA = r.pick(['#d9412b', '#2b6cd9', '#2f9e5b', '#e2a417', '#8e3fb0']);
  const can = canvasStripes(stripeA, '#f4eee2');
  const aw = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.4, d + 0.6), new THREE.MeshStandardMaterial({ map: can, side: THREE.DoubleSide, roughness: 0.85 }));
  aw.rotation.x = -Math.PI / 2 + 0.25; aw.position.set(0, 2.45, 0.1); g.add(aw);
  // produce: piles of coloured goods
  const goods = ['#e8642c', '#d62d20', '#f2c12e', '#7cb342', '#8d4b2a', '#c2185b', '#ff9800', '#a1887f'];
  for (let i = 0; i < 6; i++) {
    const gm = mat(r.pick(goods), { rough: 0.6 });
    const pile = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 6, 0, TAU, 0, Math.PI / 2), gm);
    pile.scale.set(1, 0.7, 0.8); pile.position.set(-w / 2 + 0.35 + (i % 3) * 0.95, 0.89, (i < 3 ? -0.35 : 0.35)); g.add(pile);
    const crate = box(0.7, 0.12, 0.55, mat('#a77b4f'), pile.position.x, 0.95, pile.position.z); crate.scale.y = 0.6; g.add(crate);
  }
  return shadowAll(g);
}
function canvasStripes(a, b) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 16; const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 16, 0, 16, 16); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------- vehicles ----------------
const CAR_COLORS = ['#c8c8c4', '#2b2f36', '#8d1c1c', '#f4f4f0', '#1f4e79', '#6c757d', '#b7410e', '#2e5e3e', '#d9d4c7', '#444a52'];
function carBodyGeo(len, wid, h, cabinH, cabinFrac = 0.55, cabinOff = -0.05) {
  const s = new THREE.Shape();
  const L = len / 2;
  s.moveTo(-L, 0.25); s.lineTo(-L, h * 0.85); s.quadraticCurveTo(-L, h, -L + 0.25, h);
  s.lineTo(L - 0.2, h); s.quadraticCurveTo(L, h, L, h * 0.8); s.lineTo(L, 0.25); s.lineTo(-L, 0.25);
  const body = new THREE.ExtrudeGeometry(s, { depth: wid, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 });
  body.translate(0, 0, -wid / 2);
  const c = new THREE.Shape(); const cl = len * cabinFrac / 2; const co = len * cabinOff;
  c.moveTo(-cl + co, h); c.lineTo(-cl * 0.65 + co, h + cabinH); c.lineTo(cl * 0.55 + co, h + cabinH); c.lineTo(cl + co + 0.2, h); c.lineTo(-cl + co, h);
  const cab = new THREE.ExtrudeGeometry(c, { depth: wid * 0.86, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
  cab.translate(0, 0, -wid * 0.43);
  return { body, cab };
}
const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 16); wheelGeo.rotateX(Math.PI / 2);
const hubGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.26, 10); hubGeo.rotateX(Math.PI / 2);

export function makeCar(seed = 1, { kind = 'sedan', color = null, lights = 0 } = {}) {
  const r = new RNG(seed); const g = new THREE.Group();
  let len = 4.3, wid = 1.75, h = 0.95, cabH = 0.55, cabinFrac = 0.55;
  let col = color || r.pick(CAR_COLORS);
  if (kind === 'taxi') col = '#f2c200';
  if (kind === 'van' || kind === 'ambulance' || kind === 'police') { if (kind === 'van') { len = 5; h = 1.9; cabH = 0; } }
  if (kind === 'ambulance') { len = 5.4; h = 2.3; cabH = 0; col = '#f4f4f2'; }
  if (kind === 'police') col = '#f4f4f2';
  if (kind === 'firetruck') { len = 8; h = 2.6; cabH = 0; col = '#b31b1b'; wid = 2.4; }
  if (kind === 'minibus') { len = 6; h = 2.3; cabH = 0; col = r.pick(['#f2f2f0', '#e8d9a8', '#5c88b0']); wid = 2.0; }
  const paint = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.32, metalness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const glass = mat('#1b2229', { rough: 0.08, metal: 0.4 });
  const { body, cab } = carBodyGeo(len, wid, h, cabH, cabinFrac);
  const b = new THREE.Mesh(body, paint); g.add(b);
  if (cabH > 0) { const c = new THREE.Mesh(cab, glass); g.add(c); const roof = new THREE.Mesh(cab, paint); roof.scale.set(0.82, 1.0, 1.04); roof.position.y = 0.05; roof.scale.y = 1; }
  else {
    // windows band for vans / trucks
    g.add(box(len * 0.98, h * 0.3, wid + 0.13, glass, 0, h * 0.72, 0));
    g.add(box(len * 0.7, h * 0.3, wid + 0.14, paint, -len * 0.14, h * 0.72, 0));
  }
  // wheels
  const tyre = mat('#151515', { rough: 0.9 }); const hub = mat('#9aa0a6', { metal: 0.8, rough: 0.3 });
  const wx = len / 2 - 0.85;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = new THREE.Mesh(wheelGeo, tyre); w.position.set(sx * wx, 0.33, sz * (wid / 2 + 0.02)); g.add(w);
    const hh = new THREE.Mesh(hubGeo, hub); hh.position.copy(w.position); g.add(hh);
  }
  // lights
  const hl = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.85).multiplyScalar(0.6 + lights * 5) });
  const tl = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.05, 0.03).multiplyScalar(0.5 + lights * 3) });
  for (const sz of [-1, 1]) { g.add(box(0.06, 0.14, 0.32, hl, len / 2 + 0.07, h * 0.7, sz * (wid / 2 - 0.25))); g.add(box(0.06, 0.14, 0.3, tl, -len / 2 - 0.07, h * 0.7, sz * (wid / 2 - 0.25))); }
  g.userData.headMat = hl; g.userData.tailMat = tl;
  if (kind === 'taxi') { const sign = box(0.6, 0.18, 0.3, mat('#222'), 0, h + cabH + 0.1, 0); g.add(sign); g.add(box(0.5, 0.1, 0.32, new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.8, 0.6) }), 0, h + cabH + 0.12, 0)); }
  if (kind === 'ambulance' || kind === 'police' || kind === 'firetruck') {
    const red = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.1, 0.05) }), blue = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.3, 3) });
    const top = h + cabH + 0.08;
    const a = box(0.3, 0.14, 0.5, kind === 'firetruck' ? red : blue, len * 0.25, top, -0.35), c = box(0.3, 0.14, 0.5, red, len * 0.25, top, 0.35);
    g.add(a, c); g.userData.beacons = [a, c]; g.userData.beaconMats = [a.material, c.material];
    if (kind === 'ambulance') { g.add(box(len * 0.9, 0.22, wid + 0.13, mat('#c0262d'), 0, h * 0.42, 0)); g.add(box(len * 0.9, 0.08, wid + 0.135, mat('#1d4fa0'), 0, h * 0.3, 0)); }
    if (kind === 'police') { g.add(box(len * 0.9, 0.18, wid + 0.13, mat('#1d4fa0'), 0, h * 0.45, 0)); }
    if (kind === 'firetruck') { g.add(box(len * 0.55, 0.12, 0.8, mat('#c9c9c9', { metal: 0.8, rough: 0.3 }), -len * 0.1, h + 0.25, 0)); }
  }
  return shadowAll(g);
}
// animate beacons: phase flashing
export function flashBeacons(car, t, on = 1) {
  if (!car.userData.beaconMats) return;
  const [a, b] = car.userData.beaconMats; const p = (t * 2.4) % 1;
  a.color.setRGB(0.1, 0.3, 3).multiplyScalar(on * (p < 0.5 ? 2 : 0.15) + 0.05);
  b.color.setRGB(3, 0.1, 0.05).multiplyScalar(on * (p >= 0.5 ? 2 : 0.15) + 0.05);
}

export function makeExcavator() {
  const g = new THREE.Group(); const y = mat('#e3a514', { rough: 0.5, metal: 0.2 }); const dk = mat('#2a2a2a', { rough: 0.8 });
  // tracks
  for (const s of [-1, 1]) { g.add(rbox(4.2, 0.8, 0.8, 0.3, dk, 0, 0.4, s * 1.2)); }
  const upper = new THREE.Group(); upper.position.y = 0.9; g.add(upper);
  upper.add(rbox(3.2, 1.2, 2.6, 0.1, y, -0.3, 0.7, 0));
  upper.add(rbox(1.3, 1.5, 1.2, 0.08, y, 0.6, 1.95, -0.6));
  upper.add(box(1.1, 1.0, 0.05, mat('#223', { rough: 0.1 }), 0.62, 2.1, -0.02 - 0.6 + 0.6));
  upper.add(box(1.2, 0.9, 2.4, mat('#333'), -1.6, 0.8, 0));
  const boom = new THREE.Group(); boom.position.set(1.0, 1.4, 0.5); upper.add(boom);
  const b1 = box(3.8, 0.45, 0.4, y, 1.9, 0, 0); boom.add(b1);
  const stick = new THREE.Group(); stick.position.set(3.7, 0, 0); boom.add(stick);
  stick.add(box(0.4, 2.8, 0.35, y, 0, -1.3, 0));
  const bucket = new THREE.Group(); bucket.position.set(0, -2.7, 0); stick.add(bucket);
  bucket.add(box(0.9, 0.7, 1.1, dk, 0.3, -0.2, 0));
  g.userData = { upper, boom, stick, bucket };
  return shadowAll(g);
}
export function poseExcavator(ex, t, phase = 0) {
  const { upper, boom, stick, bucket } = ex.userData; const s = Math.sin(t * 0.8 + phase);
  upper.rotation.y = Math.sin(t * 0.25 + phase) * 0.6;
  boom.rotation.z = 0.35 + s * 0.25; stick.rotation.z = -0.6 - s * 0.35; bucket.rotation.z = -0.3 + Math.cos(t * 0.8 + phase) * 0.5;
}

export function makeTowerCrane(height = 40, jib = 30) {
  const g = new THREE.Group(); const y = mat('#e8b923', { rough: 0.5, metal: 0.3 });
  // lattice mast approximated by box + diagonal stripes texture-free (thin boxes)
  const mast = new THREE.Group(); g.add(mast);
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) mast.add(box(0.15, height, 0.15, y, x, height / 2, z));
  for (let i = 0; i < height / 2; i++) { const b = box(1.7, 0.08, 0.08, y, 0, i * 2 + 1, -0.8); b.rotation.z = 0.8; mast.add(b); const b2 = box(0.08, 0.08, 1.7, y, 0.8, i * 2 + 1, 0); b2.rotation.x = 0.8; mast.add(b2); }
  const top = new THREE.Group(); top.position.y = height; g.add(top);
  top.add(box(jib, 0.6, 0.8, y, jib / 2 - 6, 0.6, 0));
  top.add(box(7, 0.5, 0.8, y, -8, 0.6, 0));
  top.add(box(2.5, 1.6, 2, mat('#d0d0d0'), -10, 0.2, 0)); // counterweight
  top.add(box(1.4, 1.4, 1.4, mat('#2b5797', { rough: 0.3 }), 0, -0.6, 1.1)); // cabin
  const apex = box(0.3, 5, 0.3, y, 0, 3, 0); top.add(apex);
  const hook = new THREE.Group(); hook.position.set(jib * 0.6, 0, 0); top.add(hook);
  const cable = box(0.04, 1, 0.04, mat('#222'), 0, -0.5, 0); hook.add(cable);
  const load = box(3, 0.4, 1.2, mat('#8a8f96'), 0, -1, 0); hook.add(load);
  g.userData = { top, hook, cable, load, jib };
  return shadowAll(g);
}
export function poseCrane(cr, t, phase = 0) {
  const u = cr.userData; u.top.rotation.y = Math.sin(t * 0.08 + phase) * 0.9 + phase;
  const drop = 12 + Math.sin(t * 0.2 + phase) * 8; u.cable.scale.y = drop; u.cable.position.y = -drop / 2; u.load.position.y = -drop - 0.2;
  u.hook.position.x = u.jib * (0.45 + 0.2 * Math.sin(t * 0.13 + phase));
}

export function makeHelicopter(color = '#c62828') {
  const g = new THREE.Group(); const m = mat(color, { rough: 0.35, metal: 0.3 });
  const body = sph(1.2, m, 0, 0, 0, 16, 12); body.scale.set(1.8, 1, 1); g.add(body);
  g.add(box(4.5, 0.35, 0.3, m, -3.2, 0.3, 0));
  g.add(box(0.2, 1.2, 0.08, m, -5.3, 0.8, 0));
  g.add(box(1.0, 0.6, 0.05, mat('#1a2a3a', { rough: 0.1 }), 1.3, 0.25, 0.9));
  for (const s of [-1, 1]) g.add(box(3, 0.08, 0.08, mat('#222'), 0, -1.25, s * 0.8));
  const rotor = new THREE.Group(); rotor.position.y = 1.35; g.add(rotor);
  const blade = box(10, 0.04, 0.3, new THREE.MeshStandardMaterial({ color: '#222', transparent: true, opacity: 0.55 }), 0, 0, 0); rotor.add(blade); const b2 = blade.clone(); b2.rotation.y = Math.PI / 2; rotor.add(b2);
  const tail = new THREE.Group(); tail.position.set(-5.3, 0.9, 0.12); g.add(tail); const tb = box(0.06, 1.6, 0.15, mat('#222'), 0, 0, 0); tail.add(tb);
  g.userData = { rotor, tail };
  return shadowAll(g, true, false);
}

// rubble: instanced irregular chunks spread in a mound
export function makeRubble({ count = 220, radius = 8, height = 3, seed = 3, colors = ['#9c968c', '#b5aea2', '#8a837a', '#c4b8a5', '#7d776f', '#a8826a'], rebar = true, scale = 1 } = {}) {
  const r = new RNG(seed); const g = new THREE.Group();
  const geos = [0, 1, 2, 3].map((i) => jitterGeo(new THREE.BoxGeometry(1, 1, 1, 2, 2, 2), 0.35, seed * 7 + i));
  const m = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, flatShading: true });
  const inst = geos.map((geo) => new THREE.InstancedMesh(geo, m, Math.ceil(count / 4)));
  const dummy = new THREE.Object3D(); const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const im = inst[i % 4]; const k = Math.floor(i / 4);
    const a = r.next() * TAU, rr = Math.sqrt(r.next()) * radius; const mound = Math.max(0, 1 - (rr / radius) ** 2) * height;
    dummy.position.set(Math.cos(a) * rr, mound * (0.4 + r.next() * 0.6), Math.sin(a) * rr);
    const s = (0.3 + r.next() ** 2 * 2.2) * scale; const slab = r.chance(0.3);
    dummy.scale.set(s * (slab ? 2.2 : 1), s * (slab ? 0.25 : 0.7 + r.next() * 0.5), s * (slab ? 1.6 : 1));
    dummy.rotation.set(r.next() * 0.8, r.next() * TAU, r.next() * 0.8); dummy.updateMatrix();
    im.setMatrixAt(k, dummy.matrix); c.set(r.pick(colors)).multiplyScalar(0.85 + r.next() * 0.3); im.setColorAt(k, c);
  }
  inst.forEach((im) => { im.castShadow = im.receiveShadow = true; g.add(im); });
  if (rebar) {
    const rm = mat('#5a3a28', { rough: 0.6, metal: 0.6 });
    const bars = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 4), rm, 40);
    for (let i = 0; i < 40; i++) {
      const a = r.next() * TAU, rr = Math.sqrt(r.next()) * radius * 0.8; const mound = Math.max(0, 1 - (rr / radius) ** 2) * height;
      dummy.position.set(Math.cos(a) * rr, mound * 0.8 + 0.5, Math.sin(a) * rr); dummy.scale.set(1, 1.5 + r.next() * 2.5, 1);
      dummy.rotation.set(r.next() * 1.2 - 0.6, r.next() * TAU, r.next() * 1.2 - 0.6); dummy.updateMatrix(); bars.setMatrixAt(i, dummy.matrix);
    }
    g.add(bars);
  }
  // a big low mound body so gaps aren't see-through
  const moundGeo = new THREE.SphereGeometry(radius * 0.95, 20, 10, 0, TAU, 0, Math.PI / 2); jitterGeo(moundGeo, radius * 0.08, seed);
  const mm = new THREE.Mesh(moundGeo, mat(colors[0], { rough: 0.95, flat: true })); mm.scale.y = height / radius * 0.8; mm.receiveShadow = true; g.add(mm);
  return g;
}

// instanced debris chunks with analytic ballistic flight (for collapses / explosions)
export class Debris extends THREE.Group {
  constructor({ count = 120, seed = 5, colors = ['#a8a196', '#8f8a80', '#c9bfae', '#6f6a62'], size = [0.2, 1.2] } = {}) {
    super();
    const r = new RNG(seed);
    const geo = jitterGeo(new THREE.BoxGeometry(1, 1, 1, 2, 2, 2), 0.35, seed);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), count);
    this.mesh.castShadow = true; this.add(this.mesh);
    this.p = []; const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      this.p.push({ s: size[0] + r.next() ** 2 * (size[1] - size[0]), sx: 0.6 + r.next() * 0.8, sz: 0.6 + r.next() * 0.8, rx: r.next() * 6, ry: r.next() * 6, wx: (r.next() - 0.5) * 8, wy: (r.next() - 0.5) * 8, u: r.next(), v: r.next(), w: r.next(), d: r.next() });
      c.set(r.pick(colors)); this.mesh.setColorAt(i, c);
    }
    this.dummy = new THREE.Object3D(); this.mesh.frustumCulled = false;
  }
  // emit from a box region, launch with speed, time since event = t
  update(t, { origin = [0, 0, 0], extent = [4, 10, 4], speed = 5, up = 3, ground = 0, delay = 1.5 } = {}) {
    const d = this.dummy;
    for (let i = 0; i < this.p.length; i++) {
      const q = this.p[i]; const tt = t - q.d * delay;
      if (tt < 0) { d.scale.setScalar(0.0001); d.updateMatrix(); this.mesh.setMatrixAt(i, d.matrix); continue; }
      const x0 = origin[0] + (q.u - 0.5) * extent[0], y0 = origin[1] + q.v * extent[1], z0 = origin[2] + (q.w - 0.5) * extent[2];
      const vx = (q.u - 0.5) * speed * 2, vz = (q.w - 0.5) * speed * 2, vy = up * (0.3 + q.v);
      let y = y0 + vy * tt - 4.9 * tt * tt; let tm = tt; let x = x0 + vx * tt, z = z0 + vz * tt;
      const gy = ground + q.s * 0.3;
      if (y < gy) { // landed: solve landing time, then skid a little
        const a = -4.9, b = vy, cc = y0 - gy; const disc = b * b - 4 * a * cc; const tl = disc > 0 ? (-b - Math.sqrt(disc)) / (2 * a) : tt;
        const sk = Math.min(tt - tl, 0.4); x = x0 + vx * (tl + sk * 0.3); z = z0 + vz * (tl + sk * 0.3); y = gy; tm = tl;
      }
      d.position.set(x, y, z); d.rotation.set(q.rx + q.wx * tm, q.ry + q.wy * tm, 0); d.scale.set(q.s * q.sx, q.s * 0.6, q.s * q.sz);
      d.updateMatrix(); this.mesh.setMatrixAt(i, d.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
export { mergeGeometries, RoundedBoxGeometry };
