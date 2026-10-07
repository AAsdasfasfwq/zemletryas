// Stylised low-poly people with a hierarchical rig and procedural poses.
import * as THREE from 'three';
import { RNG, TAU, clamp, lerp, smooth, noise1 } from '../engine/util.js';
import { mat } from './kit.js';

const SKIN = ['#e9c4a0', '#d9a77f', '#c68d63', '#a96f4c', '#f0cfb0', '#b98262'];
const HAIR = ['#1e1612', '#2d1f17', '#3b2a1e', '#5a3d27', '#141010', '#6b4e2e', '#8a8580'];
const SHIRT = ['#c0392b', '#2e86ab', '#e6a23c', '#3b8d5a', '#6c5b7b', '#f1e3c8', '#34495e', '#d35400', '#8e44ad', '#16a085', '#b03a48', '#2c3e50', '#e0d5c1', '#5d6d7e', '#a04000'];
const PANTS = ['#2c3e50', '#34495e', '#1f2a36', '#4a3b2a', '#5d6d7e', '#212121', '#3e4a5a', '#6b5b45'];
const PAJAMA = ['#7fa7c9', '#c98fa5', '#9ec79a', '#d8c27a', '#a59bd6', '#e8a07c'];
const VEST = ['#ff7a00', '#ffb300', '#ff5722'];

const G = {
  torso: new THREE.CapsuleGeometry(0.17, 0.36, 4, 10),
  hips: new THREE.CapsuleGeometry(0.155, 0.08, 4, 10),
  head: new THREE.SphereGeometry(0.115, 16, 12),
  limbU: new THREE.CapsuleGeometry(0.055, 0.24, 3, 8),
  limbL: new THREE.CapsuleGeometry(0.048, 0.24, 3, 8),
  legU: new THREE.CapsuleGeometry(0.075, 0.33, 3, 8),
  legL: new THREE.CapsuleGeometry(0.06, 0.34, 3, 8),
  hand: new THREE.SphereGeometry(0.045, 8, 6),
  foot: new THREE.BoxGeometry(0.1, 0.07, 0.24),
  eye: new THREE.SphereGeometry(0.014, 6, 4),
  hairCap: new THREE.SphereGeometry(0.125, 14, 10, 0, TAU, 0, Math.PI * 0.55),
  hijab: new THREE.SphereGeometry(0.135, 14, 10, 0, TAU, 0, Math.PI * 0.75),
  helmet: new THREE.SphereGeometry(0.135, 14, 10, 0, TAU, 0, Math.PI * 0.5),
  nose: new THREE.ConeGeometry(0.018, 0.04, 5),
};
G.nose.rotateX(Math.PI / 2);

function limb(geo, m, len) { const g = new THREE.Group(); const me = new THREE.Mesh(geo, m); me.position.y = -len / 2; me.castShadow = true; g.add(me); return g; }

export class Person extends THREE.Group {
  constructor(seed = 1, o = {}) {
    super();
    const r = new RNG(seed);
    this.seed = seed;
    const child = !!o.child; const female = o.female !== undefined ? o.female : r.chance(0.5);
    const skin = mat(o.skin || r.pick(SKIN), { rough: 0.7 });
    const shirtC = o.pajama ? r.pick(PAJAMA) : o.shirt || r.pick(SHIRT);
    const shirt = mat(shirtC, { rough: 0.85 });
    const pants = mat(o.pajama ? shirtC : o.pants || r.pick(PANTS), { rough: 0.85 });
    const hairM = mat(o.hair || r.pick(HAIR), { rough: 0.9 });
    const shoes = mat(o.barefoot ? (o.skin || '#d9a77f') : r.pick(['#1a1a1a', '#3b2a1e', '#efefef', '#5a2d1a']), { rough: 0.6 });
    const sc = (o.scale || 1) * (child ? 0.62 : female ? 0.95 : 1.0) * (0.95 + r.next() * 0.1);
    this.root = new THREE.Group(); this.add(this.root); this.root.scale.setScalar(sc);
    this.hip = new THREE.Group(); this.hip.position.y = 0.95; this.root.add(this.hip);
    const hips = new THREE.Mesh(G.hips, pants); hips.castShadow = true; this.hip.add(hips);
    this.spine = new THREE.Group(); this.spine.position.y = 0.08; this.hip.add(this.spine);
    const torso = new THREE.Mesh(G.torso, o.vest ? mat(r.pick(VEST), { rough: 0.6 }) : shirt); torso.position.y = 0.27; torso.scale.set(1.05, 1, 0.75); torso.castShadow = true; this.spine.add(torso);
    if (o.coat) { const coat = new THREE.Mesh(G.torso, mat(o.coat, { rough: 0.9 })); coat.position.y = 0.2; coat.scale.set(1.15, 1.25, 0.85); coat.castShadow = true; this.spine.add(coat); }
    this.neck = new THREE.Group(); this.neck.position.y = 0.56; this.spine.add(this.neck);
    this.head = new THREE.Group(); this.head.position.y = 0.11; this.neck.add(this.head);
    const head = new THREE.Mesh(G.head, skin); head.scale.set(0.95, 1.08, 1); head.castShadow = true; this.head.add(head);
    const eyeM = mat('#141414', { rough: 0.3 });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(G.eye, eyeM); e.position.set(s * 0.042, 0.015, 0.103); this.head.add(e); }
    const nose = new THREE.Mesh(G.nose, skin); nose.position.set(0, -0.012, 0.115); this.head.add(nose);
    if (o.helmet) { const h = new THREE.Mesh(G.helmet, mat(o.helmet, { rough: 0.35 })); h.position.y = 0.03; h.scale.set(1.05, 1.0, 1.1); this.head.add(h); }
    else if (female && !child && (o.hijab || r.chance(0.35))) { const h = new THREE.Mesh(G.hijab, mat(r.pick(['#5b3a5e', '#2f4b6e', '#7a4b3a', '#3a5a40', '#a0522d', '#d8c7a8']), { rough: 0.9 })); h.position.y = -0.02; h.scale.set(1.08, 1.1, 1.08); this.head.add(h); }
    else { const h = new THREE.Mesh(G.hairCap, hairM); h.position.set(0, 0.02, -0.012); h.rotation.x = -0.25; if (female) h.scale.set(1.05, 1.15, 1.12); this.head.add(h); if (female) { const tail = new THREE.Mesh(G.limbL, hairM); tail.position.set(0, -0.08, -0.09); tail.scale.set(1.6, 0.6, 1); this.head.add(tail); } }
    if (o.headlamp) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.8, 3.2) })); l.position.set(0, 0.07, 0.125); this.head.add(l); }
    const sleeve = o.shortSleeve ? skin : shirt;
    this.armL = this._arm(1, sleeve, skin); this.armR = this._arm(-1, sleeve, skin);
    this.legL = this._leg(1, pants, shoes); this.legR = this._leg(-1, pants, shoes);
    this.phase = r.next() * TAU; this.speed = 0.9 + r.next() * 0.3;
    this.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; } });
  }
  _arm(side, sleeve, skin) {
    const sh = new THREE.Group(); sh.position.set(side * 0.215, 0.5, 0); this.spine.add(sh);
    const up = limb(G.limbU, sleeve, 0.3); sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.3; up.add(el);
    const lo = limb(G.limbL, sleeve === skin ? skin : sleeve, 0.28); el.add(lo);
    const hand = new THREE.Mesh(G.hand, skin); hand.position.y = -0.32; lo.add(hand);
    return { sh, up, el, lo, hand };
  }
  _leg(side, pants, shoes) {
    const hp = new THREE.Group(); hp.position.set(side * 0.09, -0.04, 0); this.hip.add(hp);
    const up = limb(G.legU, pants, 0.42); hp.add(up);
    const kn = new THREE.Group(); kn.position.y = -0.42; up.add(kn);
    const lo = limb(G.legL, pants, 0.42); kn.add(lo);
    const foot = new THREE.Mesh(G.foot, shoes); foot.position.set(0, -0.45, 0.05); lo.add(foot);
    return { hp, up, kn, lo, foot };
  }
  _reset() {
    this.hip.position.set(0, 0.95, 0); this.hip.rotation.set(0, 0, 0); this.spine.rotation.set(0, 0, 0); this.neck.rotation.set(0, 0, 0); this.head.rotation.set(0, 0, 0);
    for (const a of [this.armL, this.armR]) { a.sh.rotation.set(0, 0, 0); a.el.rotation.set(0, 0, 0); }
    for (const l of [this.legL, this.legR]) { l.hp.rotation.set(0, 0, 0); l.kn.rotation.set(0, 0, 0); l.foot.rotation.set(0, 0, 0); }
    this.armL.sh.rotation.z = 0.08; this.armR.sh.rotation.z = -0.08;
  }
  // t: absolute time; returns this
  pose(name, t, k = {}) {
    this._reset(); const ph = this.phase; const s = t * this.speed;
    const A = this.armL, B = this.armR, L = this.legL, R = this.legR;
    const breathe = Math.sin(s * 1.6 + ph) * 0.015;
    switch (name) {
      case 'walk': case 'run': {
        const run = name === 'run'; const f = run ? 9 : 5.5; const w = s * f + ph; const amp = run ? 0.9 : 0.5;
        L.hp.rotation.x = Math.sin(w) * amp; R.hp.rotation.x = -Math.sin(w) * amp;
        L.kn.rotation.x = Math.max(0, -Math.cos(w)) * amp * 1.3; R.kn.rotation.x = Math.max(0, Math.cos(w)) * amp * 1.3;
        A.sh.rotation.x = -Math.sin(w) * amp * 0.8; B.sh.rotation.x = Math.sin(w) * amp * 0.8; A.el.rotation.x = -0.3 - (run ? 0.9 : 0); B.el.rotation.x = -0.3 - (run ? 0.9 : 0);
        this.hip.position.y = 0.95 + Math.abs(Math.cos(w)) * (run ? 0.06 : 0.03); this.spine.rotation.x = run ? 0.25 : 0.04;
        break;
      }
      case 'sit': case 'tea': {
        this.hip.position.y = 0.5; L.hp.rotation.x = -1.5; R.hp.rotation.x = -1.45; L.kn.rotation.x = 1.5; R.kn.rotation.x = 1.45;
        A.sh.rotation.x = -0.5; A.el.rotation.x = -0.9; B.sh.rotation.x = -0.45; B.el.rotation.x = -0.8;
        this.spine.rotation.x = breathe + 0.05;
        if (name === 'tea') { const c = (Math.sin(s * 0.7 + ph) * 0.5 + 0.5); const lift = smooth(clamp((c - 0.55) * 4)); B.sh.rotation.x = -0.5 - lift * 0.9; B.el.rotation.x = -0.8 - lift * 1.1; this.head.rotation.x = -lift * 0.15; }
        this.head.rotation.y = Math.sin(s * 0.4 + ph) * 0.35;
        break;
      }
      case 'stand': default: {
        this.spine.rotation.x = breathe; this.head.rotation.y = noise1(s * 0.3 + ph) * 0.5; A.sh.rotation.x = Math.sin(s + ph) * 0.03; B.sh.rotation.x = -Math.sin(s + ph) * 0.03;
        if (k.look) this.head.rotation.x = k.look;
        break;
      }
      case 'shiver': {
        const tr = Math.sin(s * 40 + ph) * 0.02;
        this.spine.rotation.x = 0.12; A.sh.rotation.set(-1.0, 0.0, -0.5 + tr); A.el.rotation.x = -1.9; B.sh.rotation.set(-1.0, 0.0, 0.5 - tr); B.el.rotation.x = -1.9;
        this.head.rotation.x = 0.25 + tr; this.root.rotation.z = tr * 0.5; L.hp.rotation.z = 0.04; R.hp.rotation.z = -0.04;
        break;
      }
      case 'dig': {
        const w = s * 3 + ph; this.hip.position.y = 0.45; L.hp.rotation.x = -1.3; L.kn.rotation.x = 2.2; R.hp.rotation.x = 0.2; R.kn.rotation.x = 2.3;
        this.spine.rotation.x = 0.75 + Math.sin(w) * 0.12; this.head.rotation.x = -0.3;
        A.sh.rotation.x = -1.2 + Math.sin(w) * 0.6; A.el.rotation.x = -0.4 + Math.cos(w) * 0.3; B.sh.rotation.x = -1.2 + Math.sin(w + 1.6) * 0.6; B.el.rotation.x = -0.4 + Math.cos(w + 1.6) * 0.3;
        break;
      }
      case 'carry': {
        A.sh.rotation.x = -1.2; A.el.rotation.x = -0.6; B.sh.rotation.x = -1.2; B.el.rotation.x = -0.6; this.spine.rotation.x = -0.05;
        const w = s * 4.5 + ph; L.hp.rotation.x = Math.sin(w) * 0.35; R.hp.rotation.x = -Math.sin(w) * 0.35; L.kn.rotation.x = Math.max(0, -Math.cos(w)) * 0.4; R.kn.rotation.x = Math.max(0, Math.cos(w)) * 0.4;
        break;
      }
      case 'point': { B.sh.rotation.x = -1.5; B.sh.rotation.z = -0.2; this.head.rotation.y = 0.2; break; }
      case 'phone': { B.sh.rotation.set(-0.6, 0, -0.9); B.el.rotation.x = -2.3; this.head.rotation.z = -0.15; this.spine.rotation.x = breathe; break; }
      case 'cry': { A.sh.rotation.set(-1.3, 0, -0.3); A.el.rotation.x = -2.2; B.sh.rotation.set(-1.3, 0, 0.3); B.el.rotation.x = -2.2; this.head.rotation.x = 0.4; this.spine.rotation.x = 0.35 + Math.sin(s * 5) * 0.03; break; }
      case 'lookup': { this.head.rotation.x = -0.5; this.spine.rotation.x = -0.1; A.sh.rotation.x = 0.05; break; }
      case 'kneel': { this.hip.position.y = 0.5; L.hp.rotation.x = -1.4; L.kn.rotation.x = 1.4; R.hp.rotation.x = 0.1; R.kn.rotation.x = 1.6; this.spine.rotation.x = 0.4; A.sh.rotation.x = -0.9; B.sh.rotation.x = -0.9; A.el.rotation.x = -0.5; B.el.rotation.x = -0.5; break; }
      case 'lie': case 'jolt': { // lying on back with legs forward (+z); 'jolt' sits up abruptly (k.p 0..1)
        const p = name === 'jolt' ? (k.p || 0) : 0;
        this.hip.position.y = 0.16; L.hp.rotation.x = -1.57; R.hp.rotation.x = -1.57;
        this.spine.rotation.x = -1.57 * (1 - p) + 0.12 * p; this.neck.rotation.x = 0.15 * (1 - p);
        A.sh.rotation.set(-p * 1.1, 0, 0.15); B.sh.rotation.set(-p * 1.3, 0, -0.15); A.el.rotation.x = -p * 0.7;
        this.head.rotation.x = -0.25 * p; this.head.rotation.y = (1 - p) * Math.sin(s * 0.2 + ph) * 0.25;
        break;
      }
      case 'wave': { B.sh.rotation.set(-2.6, 0, -0.3 + Math.sin(s * 8) * 0.3); B.el.rotation.x = -0.4; this.head.rotation.x = -0.3; break; }
      case 'hug': { A.sh.rotation.set(-1.3, 0, 0.6); A.el.rotation.x = -1.2; B.sh.rotation.set(-1.3, 0, -0.6); B.el.rotation.x = -1.2; this.head.rotation.x = 0.2; break; }
    }
    return this;
  }
}

// a crowd placed by a caller-supplied function
export function makeCrowd(n, seed, place, o = {}) {
  const g = new THREE.Group(); const r = new RNG(seed); g.userData.people = [];
  for (let i = 0; i < n; i++) {
    const p = new Person(seed * 100 + i, typeof o === 'function' ? o(i, r) : o); const pl = place(i, r);
    p.position.set(pl.x, pl.y || 0, pl.z); p.rotation.y = pl.ry || 0; p.userData = { ...pl }; g.add(p); g.userData.people.push(p);
  }
  return g;
}

// simple animals --------------------------------------------------------------
export function makeCat(color = '#d98a3a') {
  const g = new THREE.Group(); const m = mat(color, { rough: 0.85 }); const dk = mat('#2a1d14');
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.28, 4, 10), m); body.rotation.z = Math.PI / 2; body.position.y = 0.2; g.add(body);
  const head = new THREE.Group(); head.position.set(0.22, 0.3, 0); g.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), m));
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 4), m); ear.position.set(0, 0.08, s * 0.045); head.add(ear); const e = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 4), mat('#3b6e2f', { rough: 0.2 })); e.position.set(0.07, 0.015, s * 0.03); head.add(e); }
  const tail = new THREE.Group(); tail.position.set(-0.22, 0.24, 0); g.add(tail);
  const tm = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.26, 3, 6), m); tm.position.y = 0.13; tail.add(tm); tail.rotation.z = -0.5;
  const legs = [];
  for (const [x, z] of [[0.13, 0.06], [0.13, -0.06], [-0.13, 0.06], [-0.13, -0.06]]) { const l = new THREE.Group(); l.position.set(x, 0.17, z); const lm = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.12, 3, 6), m); lm.position.y = -0.08; l.add(lm); g.add(l); legs.push(l); }
  g.userData = { head, tail, legs, body };
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}
export function poseCat(cat, t, mode = 'run') {
  const { tail, legs, head, body } = cat.userData;
  if (mode === 'run') { const w = t * 16; legs.forEach((l, i) => (l.rotation.z = Math.sin(w + (i < 2 ? 0 : Math.PI) + (i % 2) * 0.4) * 0.9)); body.position.y = 0.2 + Math.abs(Math.sin(w)) * 0.03; tail.rotation.z = -0.2 + Math.sin(w * 0.5) * 0.3; }
  else if (mode === 'hide') { legs.forEach((l) => (l.rotation.z = 0)); body.position.y = 0.12; head.position.y = 0.2; tail.rotation.z = -1.4; head.rotation.y = Math.sin(t * 0.7) * 0.3; }
  else { legs.forEach((l) => (l.rotation.z = 0)); tail.rotation.z = -0.4 + Math.sin(t * 2) * 0.2; }
}
export function makeDog(color = '#8a6a4a') {
  const g = new THREE.Group(); const m = mat(color, { rough: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), m); body.rotation.z = Math.PI / 2; body.position.y = 0.5; g.add(body);
  const head = new THREE.Group(); head.position.set(0.42, 0.68, 0); g.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), m));
  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.1, 3, 8), m); snout.rotation.z = Math.PI / 2; snout.position.set(0.14, -0.03, 0); head.add(snout);
  { const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), mat('#111')); nose.position.set(0.23, -0.02, 0); head.add(nose); }
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), m); ear.position.set(-0.02, 0.13, s * 0.07); head.add(ear); }
  const legs = [];
  for (const [x, z] of [[0.25, 0.1], [0.25, -0.1], [-0.25, 0.1], [-0.25, -0.1]]) { const l = new THREE.Group(); l.position.set(x, 0.4, z); const lm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.3, 3, 6), m); lm.position.y = -0.18; l.add(lm); g.add(l); legs.push(l); }
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.25, 3, 6), m); tail.position.set(-0.45, 0.62, 0); tail.rotation.z = 0.9; g.add(tail);
  g.userData = { head, legs, tail };
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}
export function poseDog(dog, t, mode = 'howl', ph = 0) {
  const { head, legs } = dog.userData;
  if (mode === 'howl') { const h = smooth(clamp(Math.sin(t * 0.6 + ph) * 2)); head.rotation.z = 0.2 + h * 0.75; }
  else if (mode === 'walk') { const w = t * 7 + ph; legs.forEach((l, i) => (l.rotation.z = Math.sin(w + (i < 2 ? 0 : Math.PI) + (i % 2) * Math.PI) * 0.5)); head.rotation.z = Math.sin(w * 0.5) * 0.05; }
}
// bird: two wings that flap; returns group
export function makeBird(color = '#222') {
  const g = new THREE.Group(); const m = mat(color, { rough: 0.8, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.12, 3, 6), m); body.rotation.z = Math.PI / 2; g.add(body);
  const wingGeo = new THREE.BufferGeometry(); wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.08, 0, 0.3, 0.07, 0, 0.26], 3)); wingGeo.computeVertexNormals();
  const wl = new THREE.Mesh(wingGeo, m), wr = new THREE.Mesh(wingGeo, m); wr.scale.z = -1; g.add(wl, wr);
  g.userData = { wl, wr };
  return g;
}
export function flapBird(b, t, ph = 0) { const a = Math.sin(t * 14 + ph) * 0.9; b.userData.wl.rotation.x = a; b.userData.wr.rotation.x = -a; }
