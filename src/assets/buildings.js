// Apartment buildings built floor-by-floor so they can sway, pancake, tip over or sink.
import * as THREE from 'three';
import { facadeTextures, concreteTexture } from '../engine/textures.js';
import { RNG, TAU, clamp, lerp, smooth, ease, noise1 } from '../engine/util.js';
import { mat, box, cyl, mergeGeometries } from './kit.js';
import { dustBurst } from '../engine/particles.js';

export const CELL = 3.2; // metres per window cell
export const FLOOR_H = 3.0;
const ROWS = 16;

export const STYLES = [
  { wall: '#efe3cc', accent: '#c8693f', frame: '#faf7f0', glassTint: [62, 88, 112], shopColor: '#1f6f8b' },
  { wall: '#f2d3b3', accent: '#9c4a2e', frame: '#fbf6ef', glassTint: [58, 80, 104], shopColor: '#b0352b' },
  { wall: '#e6e1d3', accent: '#5f7f6a', frame: '#ffffff', glassTint: [70, 96, 118], shopColor: '#2d7a46' },
  { wall: '#f4e7b8', accent: '#b07d2a', frame: '#fffaf0', glassTint: [60, 84, 110], shopColor: '#c0392b' },
  { wall: '#d9e3e8', accent: '#46677e', frame: '#ffffff', glassTint: [66, 92, 120], shopColor: '#e67e22' },
  { wall: '#e8c7b8', accent: '#8a3b33', frame: '#f8f2ec', glassTint: [60, 82, 105], shopColor: '#34495e' },
  { wall: '#d8d2c6', accent: '#7a6a58', frame: '#f0ece6', glassTint: [64, 86, 108], shopColor: '#8e44ad' },
  { wall: '#f0efe9', accent: '#d35445', frame: '#ffffff', glassTint: [55, 85, 115], shopColor: '#16a085' },
];
export const TOWER_STYLES = [
  { wall: '#dfe4e8', accent: '#2c3e50', frame: '#cfd6dc', glassTint: [70, 110, 140], style: 'tower' },
  { wall: '#efe9df', accent: '#a0522d', frame: '#e8e0d4', glassTint: [80, 112, 136], style: 'tower' },
  { wall: '#e9eef0', accent: '#1f6f8b', frame: '#ffffff', glassTint: [60, 104, 138], style: 'tower' },
];

const styleMats = new Map();
function facadeMaterial(styleIdx, tower = false, shop = true) {
  const key = (tower ? 't' : 's') + styleIdx + (shop ? 'S' : 'n');
  if (!styleMats.has(key)) {
    const st = tower ? TOWER_STYLES[styleIdx % TOWER_STYLES.length] : STYLES[styleIdx % STYLES.length];
    const tx = facadeTextures({ seed: styleIdx * 13 + (tower ? 7 : 1), cols: 6, rows: ROWS, ...st, shopFloor: shop && !tower, balcony: !tower, litRatio: 0.62 });
    for (const t of [tx.map, tx.emissive, tx.rough]) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; }
    const m = new THREE.MeshStandardMaterial({ map: tx.map, emissiveMap: tx.emissive, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0, roughnessMap: tx.rough, roughness: 1, metalness: 0.05, envMapIntensity: 1.0 });
    m.userData.baseEmissive = 0;
    styleMats.set(key, { m, st });
  }
  return styleMats.get(key);
}
// global night factor applied to every facade material
export function setCityWindowLight(k) { for (const { m } of styleMats.values()) m.emissiveIntensity = k; }
export function forEachFacadeMat(fn) { for (const { m } of styleMats.values()) fn(m); }

function floorBox(w, d, i, rows) {
  const g = new THREE.BoxGeometry(w, FLOOR_H, d);
  const uv = g.attributes.uv; const v0 = i / rows, v1 = (i + 1) / rows;
  // faces: +x, -x, +y, -y, +z, -z ; 4 verts each
  const faceW = [d, d, w, w, w, w];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const idx = f * 4 + k; const u = uv.getX(idx), v = uv.getY(idx);
      if (f === 2 || f === 3) { uv.setXY(idx, 0.004 + u * 0.002, v0 + 0.5 / rows + v * 0.001); continue; }
      uv.setXY(idx, u * (faceW[f] / (CELL * 6)), lerp(v0, v1, v));
    }
  }
  return g;
}

export class Building extends THREE.Group {
  constructor(o = {}) {
    super();
    const r = new RNG(o.seed || 1); this.r = r;
    this.w = o.w || 16; this.d = o.d || 12; this.floors = o.floors || 7; this.tower = !!o.tower;
    this.styleIdx = o.style !== undefined ? o.style : r.int(0, 7);
    const shop = o.shop !== undefined ? o.shop : true;
    const { m, st } = facadeMaterial(this.styleIdx, this.tower, shop);
    this.facadeMat = m; this.st = st;
    this.body = new THREE.Group(); this.add(this.body); // pivot for tip/sink
    this.floorGroups = [];
    const slabM = mat('#bdb6aa', { rough: 0.9 });
    const balM = mat(st.frame || '#f4f1ea', { rough: 0.6 }); const railM = mat('#3d4248', { rough: 0.4, metal: 0.6 });
    const accentM = mat(st.accent, { rough: 0.8 });
    for (let i = 0; i < this.floors; i++) {
      const fg = new THREE.Group(); fg.position.y = i * FLOOR_H + FLOOR_H / 2; this.body.add(fg);
      const fm = new THREE.Mesh(floorBox(this.w, this.d, i, ROWS), m); fm.castShadow = true; fm.receiveShadow = true; fg.add(fm);
      // balconies (merged per floor)
      if (!this.tower && i > 0 && o.balconies !== false) {
        const parts = []; const n = Math.floor(this.w / CELL);
        for (let k = 0; k < n; k++) {
          if (k % 3 !== 1) continue; const x = -this.w / 2 + (k + 0.5) * CELL;
          for (const sz of [1, -1]) {
            const slab = new THREE.BoxGeometry(CELL * 0.95, 0.14, 1.1); slab.translate(x, -FLOOR_H / 2 + 0.07, sz * (this.d / 2 + 0.55)); parts.push(slab);
          }
        }
        if (parts.length) { const bm = new THREE.Mesh(mergeGeometries(parts), balM); bm.castShadow = true; bm.receiveShadow = true; fg.add(bm); }
        const rails = [];
        for (let k = 0; k < n; k++) {
          if (k % 3 !== 1) continue; const x = -this.w / 2 + (k + 0.5) * CELL;
          for (const sz of [1, -1]) { const rg = new THREE.BoxGeometry(CELL * 0.95, 0.9, 0.05); rg.translate(x, -FLOOR_H / 2 + 0.6, sz * (this.d / 2 + 1.08)); rails.push(rg); }
        }
        if (rails.length) { const rm = new THREE.Mesh(mergeGeometries(rails), new THREE.MeshStandardMaterial({ color: '#2b3036', roughness: 0.3, metalness: 0.5, transparent: true, opacity: 0.75 })); fg.add(rm); }
      }
      if (i === 0 && shop && !this.tower) { // awning band
        const aw = box(this.w + 0.2, 0.25, 1.4, accentM, 0, 0.9, this.d / 2 + 0.7); aw.castShadow = true; fg.add(aw);
      }
      this.floorGroups.push(fg);
    }
    // roof: parapet + rooftop kit (Turkish solar water heaters, tanks, dishes)
    const roof = new THREE.Group(); roof.position.y = FLOOR_H / 2; this.floorGroups[this.floors - 1].add(roof); this.roof = roof;
    const pm = mat(st.wall, { rough: 0.9 });
    roof.add(box(this.w + 0.2, 0.6, 0.25, pm, 0, 0.3, this.d / 2)); roof.add(box(this.w + 0.2, 0.6, 0.25, pm, 0, 0.3, -this.d / 2));
    roof.add(box(0.25, 0.6, this.d, pm, this.w / 2, 0.3, 0)); roof.add(box(0.25, 0.6, this.d, pm, -this.w / 2, 0.3, 0));
    roof.add(box(this.w - 0.2, 0.1, this.d - 0.2, mat('#8d8a84', { rough: 0.95 }), 0, 0.05, 0));
    if (o.roofKit !== false) {
      const panelM = mat('#1d3a5f', { rough: 0.15, metal: 0.4 }); const tankM = mat('#e8e8e6', { rough: 0.4, metal: 0.3 }); const frameM = mat('#9a9a9a', { metal: 0.6, rough: 0.4 });
      const nSolar = Math.max(1, Math.floor(this.w / 4)) + r.int(0, 2);
      const parts = [], tanks = [], frames = [];
      for (let k = 0; k < nSolar; k++) {
        const x = -this.w / 2 + 2 + r.next() * (this.w - 4), z = -this.d / 2 + 2 + r.next() * (this.d - 4);
        const p = new THREE.BoxGeometry(1.0, 0.05, 1.8); p.rotateX(-0.6); p.translate(x, 0.75, z); parts.push(p);
        const tk = new THREE.CylinderGeometry(0.28, 0.28, 1.4, 10); tk.rotateZ(Math.PI / 2); tk.translate(x, 1.2, z - 0.85); tanks.push(tk);
        const f = new THREE.BoxGeometry(0.05, 1.1, 0.05); f.translate(x - 0.45, 0.55, z - 0.8); frames.push(f); const f2 = f.clone(); f2.translate(0.9, 0, 0); frames.push(f2);
      }
      roof.add(new THREE.Mesh(mergeGeometries(parts), panelM), new THREE.Mesh(mergeGeometries(tanks), tankM), new THREE.Mesh(mergeGeometries(frames), frameM));
      if (r.chance(0.7)) { const st2 = box(3, 2.4, 3, pm, this.w / 2 - 2.2, 1.2, -this.d / 2 + 2.2); st2.castShadow = true; roof.add(st2); }
      for (let k = 0; k < 2 + r.int(0, 3); k++) { const dish = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 6, 0, TAU, 0, 1.0), mat('#ececec', { rough: 0.4, side: THREE.DoubleSide })); dish.position.set(-this.w / 2 + 1 + r.next() * (this.w - 2), 1.0, this.d / 2 - 0.6); dish.rotation.x = -1.2; roof.add(dish); }
      if (r.chance(0.5)) roof.add(cyl(0.6, 0.6, 1.4, mat('#4b6b8a', { rough: 0.5 }), -this.w / 2 + 1.6, 0.8, 1, 12));
      roof.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    }
    this.height = this.floors * FLOOR_H;
    this.state = 'intact';
    this.collapseSeed = r.next() * 100;
    this.tilts = Array.from({ length: this.floors }, () => [(r.next() - 0.5) * 0.12, (r.next() - 0.5) * 0.12, (r.next() - 0.5) * 1.2, (r.next() - 0.5) * 1.2]);
  }
  addDust(o = {}) {
    this.dust = dustBurst({ center: [0, 0, 0], radius: Math.max(this.w, this.d) * 0.6, height: this.height * 0.6, speed: 7, spread: 2.5, life: [7, 14], size: [5, Math.max(this.w, this.d) * 1.3], seed: (this.collapseSeed * 1000) | 0, count: o.count || 120, color: o.color || [0.78, 0.74, 0.66], opacity: o.opacity || 0.9 });
    this.dust.visible = false; this.add(this.dust);
    return this.dust;
  }
  _resetPose() {
    this.body.position.set(0, 0, 0); this.body.rotation.set(0, 0, 0);
    for (let i = 0; i < this.floors; i++) { const fg = this.floorGroups[i]; fg.position.set(0, i * FLOOR_H + FLOOR_H / 2, 0); fg.rotation.set(0, 0, 0); fg.scale.set(1, 1, 1); fg.visible = true; }
  }
  // mode: 'intact' | 'sway' | 'pancake' | 'tip' | 'sink' | 'crumble' | 'gone' | 'damaged'
  // tau: seconds since the event started; amp: shaking amplitude (0..1); shakeT: absolute time
  setState(mode, tau = 0, { amp = 0, t = 0, dir = 1, partial = 1 } = {}) {
    this._resetPose(); this.visible = mode !== 'gone';
    if (this.dust) { this.dust.visible = false; }
    const n = this.floors;
    // shaking sway (resonance) applies to all modes while the ground shakes
    if (amp > 0) {
      const ph = this.collapseSeed;
      const f = 1.6 + (10 - Math.min(n, 10)) * 0.12;
      for (let i = 0; i < n; i++) {
        const h = (i + 1) / n; const k = Math.pow(h, 1.4) * amp;
        const sx = (Math.sin(t * f * TAU * 0.5 + ph) + 0.35 * Math.sin(t * 9.3 + ph * 2)) * k * 0.55;
        const sz = Math.sin(t * f * TAU * 0.41 + ph * 1.7) * k * 0.3;
        this.floorGroups[i].position.x += sx; this.floorGroups[i].position.z += sz;
        this.floorGroups[i].rotation.z = -sx * 0.02; this.floorGroups[i].rotation.x = sz * 0.02;
      }
    }
    if (mode === 'intact' || mode === 'sway') return;
    if (mode === 'pancake' || mode === 'crumble' || mode === 'damaged') {
      const crumble = mode === 'crumble';
      const c = FLOOR_H * (crumble ? 0.12 : 0.24); const l = FLOOR_H - c;
      const maxCrush = mode === 'damaged' ? Math.floor(n * 0.5) : n * partial;
      const pre = 0.45; // columns buckling
      let D;
      if (mode === 'damaged') D = maxCrush * l;
      else { const tt = Math.max(0, tau - pre); D = Math.min(0.5 * 9.8 * (crumble ? 0.9 : 0.62) * tt * tt + (tau > 0 ? Math.min(tau / pre, 1) * 0.6 : 0), maxCrush * l); }
      const m = Math.floor(D / l); const frac = D / l - m;
      let y = 0;
      for (let i = 0; i < n; i++) {
        const fg = this.floorGroups[i]; const tl = this.tilts[i];
        let hgt;
        if (i < m) hgt = c; else if (i === m) hgt = FLOOR_H - frac * l; else hgt = FLOOR_H;
        const crushed = i < m ? 1 : i === m ? frac : 0;
        fg.scale.y = hgt / FLOOR_H; fg.position.y = y + hgt / 2;
        fg.rotation.x += tl[0] * crushed; fg.rotation.z += tl[1] * crushed;
        fg.position.x += tl[2] * crushed * (crumble ? 2.5 : 1); fg.position.z += tl[3] * crushed * (crumble ? 2.5 : 1);
        if (crumble) { const s = 1 - crushed * 0.25; fg.scale.x = s; fg.scale.z = s; }
        y += hgt;
      }
      // the falling upper mass leans a little
      if (mode !== 'damaged') { const lean = clamp(D / (n * l)) * 0.06 * (this.collapseSeed % 2 > 1 ? 1 : -1); this.body.rotation.z = lean; }
      else this.body.rotation.z = 0.03;
      if (this.dust && tau > 0 && mode !== 'damaged') { this.dust.visible = true; this.dust.setTime(tau - 0.3); }
      return;
    }
    if (mode === 'tip') {
      // rotate about base edge; liquefaction lets it fall slowly then thud
      const T = 4.5; const p = clamp(tau / T); const a = ease.inCubic(p) * 1.38 + (p >= 1 ? Math.sin(Math.min((tau - T) * 9, Math.PI)) * 0.02 * Math.exp(-(tau - T) * 2) : 0);
      const pivotX = dir * this.w / 2;
      // rotate around the pivot edge (x=pivotX, y=0)
      this.body.rotation.z = -a * dir;
      const cx = Math.cos(-a * dir), sx = Math.sin(-a * dir);
      this.body.position.set(pivotX - (pivotX * cx), -(pivotX * sx) - smooth(p) * 1.4, 0);
      if (this.dust && tau > T - 0.4) { this.dust.visible = true; this.dust.setTime(tau - T + 0.4); }
      return;
    }
    if (mode === 'sink') {
      const p = ease.outCubic(tau / 5); this.body.position.y = -p * FLOOR_H * 1.6; this.body.rotation.z = p * 0.12 * dir; this.body.rotation.x = p * 0.05;
      if (this.dust && tau > 0) { this.dust.visible = true; this.dust.setTime(tau * 0.5 - 1); }
    }
  }
}

// skeletal concrete frame under construction (columns + slabs), grows with p (0..1)
export class ConstructionFrame extends THREE.Group {
  constructor({ w = 18, d = 14, floors = 12, seed = 3 } = {}) {
    super(); this.floorsN = floors; this.levels = [];
    const cm = mat('#b9b4aa', { rough: 0.95 }); const rebar = mat('#6b4a35', { metal: 0.5, rough: 0.6 });
    const cols = []; for (let x = -w / 2 + 0.3; x <= w / 2; x += w / 4) for (let z = -d / 2 + 0.3; z <= d / 2; z += d / 3) cols.push([x, z]);
    for (let i = 0; i < floors; i++) {
      const g = new THREE.Group(); g.position.y = i * FLOOR_H; this.add(g);
      for (const [x, z] of cols) g.add(box(0.5, FLOOR_H, 0.5, cm, x, FLOOR_H / 2, z));
      g.add(box(w + 0.6, 0.3, d + 0.6, cm, 0, FLOOR_H, 0));
      if (i % 2 === 0) for (const [x, z] of cols.slice(0, 6)) g.add(box(0.03, 1.2, 0.03, rebar, x + 0.1, FLOOR_H + 0.6, z));
      g.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      this.levels.push(g);
    }
    // scaffolding sheet (green mesh) on one face
    this.net = new THREE.Mesh(new THREE.PlaneGeometry(w + 1, floors * FLOOR_H), new THREE.MeshStandardMaterial({ color: '#2f7a4a', transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.9 }));
    this.net.position.set(0, floors * FLOOR_H / 2, d / 2 + 0.8); this.add(this.net);
  }
  setProgress(p) {
    const f = p * this.floorsN;
    this.levels.forEach((g, i) => { const k = clamp(f - i); g.visible = k > 0; g.scale.y = Math.max(0.001, ease.outCubic(k)); });
    this.net.scale.y = Math.max(0.01, clamp(f / this.floorsN)); this.net.position.y = this.net.scale.y * this.floorsN * FLOOR_H / 2;
  }
}

// Mosque: square hall + drum + main dome + semi-domes + minarets
export function makeMosque(seed = 1, { minarets = 2, scale = 1 } = {}) {
  const g = new THREE.Group(); const stone = mat('#e9e0cf', { rough: 0.85 }); const lead = mat('#7d8790', { rough: 0.45, metal: 0.55 });
  g.add(box(22, 10, 22, stone, 0, 5, 0));
  g.add(cyl(8.5, 8.5, 3, stone, 0, 11.5, 0, 24));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(8.6, 32, 16, 0, TAU, 0, Math.PI / 2), lead); dome.position.y = 13; g.add(dome);
  g.add(cyl(0.12, 0.12, 2.5, mat('#c9a646', { metal: 0.9, rough: 0.3 }), 0, 22.5, 0, 6));
  for (const [x, z] of [[11, 0], [-11, 0], [0, 11], [0, -11]]) { const sd = new THREE.Mesh(new THREE.SphereGeometry(4.2, 20, 10, 0, TAU, 0, Math.PI / 2), lead); sd.position.set(x * 0.8, 10, z * 0.8); g.add(sd); }
  // windows band (dark arches)
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; const w = box(0.9, 1.6, 0.2, mat('#3a4a5a', { rough: 0.2 }), Math.cos(a) * 8.55, 11.6, Math.sin(a) * 8.55); w.rotation.y = -a + Math.PI / 2; g.add(w); }
  const mins = [[13, 13], [-13, -13], [13, -13], [-13, 13]].slice(0, minarets);
  for (const [x, z] of mins) {
    const m = new THREE.Group(); m.position.set(x, 0, z); g.add(m);
    m.add(cyl(1.3, 1.5, 4, stone, 0, 2, 0, 10)); m.add(cyl(0.95, 1.05, 30, stone, 0, 19, 0, 12));
    m.add(cyl(1.5, 1.1, 0.8, stone, 0, 26, 0, 12)); m.add(cyl(1.5, 1.5, 0.9, mat('#d9cfbd'), 0, 26.8, 0, 12));
    m.add(cyl(0.8, 0.85, 5, stone, 0, 31, 0, 12));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.0, 6, 12), lead); cone.position.y = 36.5; m.add(cone);
    m.add(cyl(0.06, 0.06, 1.5, mat('#c9a646', { metal: 0.9, rough: 0.3 }), 0, 40, 0, 6));
  }
  g.scale.setScalar(scale);
  g.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return g;
}

// Billboard with a canvas ad
export function makeBillboard(tex, w = 12, h = 6) {
  const g = new THREE.Group(); const pm = mat('#3a3f45', { metal: 0.6, rough: 0.4 });
  g.add(box(0.4, 7, 0.4, pm, -w / 3, 3.5, 0)); g.add(box(0.4, 7, 0.4, pm, w / 3, 3.5, 0));
  g.add(box(w + 0.6, h + 0.6, 0.4, pm, 0, 7 + h / 2, -0.1));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissiveMap: tex, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.15 }));
  face.position.set(0, 7 + h / 2, 0.12); g.add(face); g.userData.face = face;
  g.traverse((c) => { if (c.isMesh) { c.castShadow = true; } });
  return g;
}
