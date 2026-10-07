// Istanbul at sunset: Bosphorus, historic peninsula skyline (domes & minarets), bridge,
// dense old apartment blocks, ferries, and the North Anatolian fault glowing beneath the Marmara.
import * as THREE from 'three';
import { SkyDome } from '../engine/sky.js';
import { Sprites } from '../engine/particles.js';
import { glowTexture } from '../engine/textures.js';
import { RNG, TAU, clamp, lerp, smooth, fbm2, noise1 } from '../engine/util.js';
import { mat, box, cyl, sph, jitterGeo, shadowAll } from './kit.js';
import { makeMosque, Building } from './buildings.js';
import { makeBird, flapBird } from './people.js';

function grandMosque(scale = 1, minarets = 6, color = '#e6dccb') {
  const g = new THREE.Group(); const stone = mat(color, { rough: 0.85 }); const lead = mat('#6f7a84', { rough: 0.4, metal: 0.6 });
  g.add(box(60, 18, 60, stone, 0, 9, 0));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(18, 40, 20, 0, TAU, 0, Math.PI / 2), lead); dome.position.y = 26; g.add(dome); g.add(cyl(18, 18, 8, stone, 0, 22, 0, 32));
  for (const [x, z] of [[22, 0], [-22, 0], [0, 22], [0, -22]]) { const d = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12, 0, TAU, 0, Math.PI / 2), lead); d.position.set(x, 18, z); g.add(d); }
  for (const [x, z] of [[24, 24], [-24, 24], [24, -24], [-24, -24]]) { const d = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 8, 0, TAU, 0, Math.PI / 2), lead); d.position.set(x, 18, z); g.add(d); }
  const pos = [[34, 34], [-34, 34], [34, -34], [-34, -34], [55, 20], [55, -20]].slice(0, minarets);
  for (const [x, z] of pos) { const m = new THREE.Group(); m.position.set(x, 0, z); g.add(m); m.add(cyl(2, 2.4, 60, stone, 0, 30, 0, 12)); for (let k = 0; k < 3; k++) m.add(cyl(3, 2.2, 1.2, stone, 0, 32 + k * 12, 0, 12)); const c = new THREE.Mesh(new THREE.ConeGeometry(2.2, 12, 12), lead); c.position.y = 66; m.add(c); }
  g.scale.setScalar(scale); return shadowAll(g);
}

export class IstanbulSet {
  constructor() { this.scene = new THREE.Scene(); }
  build(director) {
    const s = this.scene; const r = new RNG(1453);
    this.sky = new SkyDome('golden'); this.sky.setPreset('golden', { horizon: [1.0, 0.62, 0.38], zenith: [0.16, 0.22, 0.48], cloudCover: 0.45 }); this.sky.setSun(new THREE.Vector3(-0.8, 0.07, -0.5)); s.add(this.sky);
    s.environment = this.sky.makeEnv(director.renderer); s.fog = new THREE.FogExp2(0xd99a70, 0.00045);
    this.sun = new THREE.DirectionalLight(0xffb070, 3.0); this.sun.position.set(-800, 70, -500); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    const sc = this.sun.shadow.camera; sc.left = -700; sc.right = 700; sc.top = 700; sc.bottom = -700; sc.near = 10; sc.far = 3000; this.sun.shadow.bias = -0.0006; s.add(this.sun);
    s.add(new THREE.HemisphereLight(0x8fa8d8, 0x5a4030, 0.8));
    // water
    this.waterMat = new THREE.MeshStandardMaterial({ color: 0x1c4a6a, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.86 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000, 1, 1), this.waterMat); water.rotation.x = -Math.PI / 2; s.add(water);
    // fault glow under the sea (seen through the semi-transparent water)
    this.faultGlow = new THREE.Mesh(new THREE.PlaneGeometry(5000, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.4, 0.1), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.faultGlow.rotation.x = -Math.PI / 2; this.faultGlow.rotation.z = 0.05; this.faultGlow.position.set(0, -6, -1400); s.add(this.faultGlow);
    // land masses (hills) — European side (west, -x) and Asian side (east, +x) separated by the Bosphorus (z axis)
    const landM = mat('#7a7a52', { rough: 1, flat: true });
    const mkLand = (x, z, w, d, h, seed) => { const g = new THREE.PlaneGeometry(w, d, 60, 60); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const px = p.getX(i), pz = p.getZ(i); const edge = Math.min(w / 2 - Math.abs(px), d / 2 - Math.abs(pz)); p.setY(i, Math.max(-2, (fbm2((px + x) / 400 + seed, (pz + z) / 400, 4) * 0.5 + 0.5) * h * smooth(edge / 160) - 2)); } g.computeVertexNormals(); const m = new THREE.Mesh(g, landM); m.position.set(x, 0, z); m.receiveShadow = true; s.add(m); return m; };
    mkLand(-1500, 0, 2400, 4000, 70, 1); mkLand(1500, 0, 2400, 4000, 90, 7);
    const landHeight = (X, Z) => { const west = X < 0; const cx = west ? -1500 : 1500, h = west ? 70 : 90, seed = west ? 1 : 7; const edge = Math.min(1200 - Math.abs(X - cx), 2000 - Math.abs(Z)); return Math.max(-2, (fbm2(X / 400 + seed, Z / 400, 4) * 0.5 + 0.5) * h * smooth(edge / 160) - 2); };
    this.landHeight = landHeight;
    // dense old city: instanced blocks on the hills (European peninsula)
    const fac = [0, 1, 3, 5].map((k) => new Building({ w: 12, d: 10, floors: 5, style: k }).facadeMat);
    const roofM = mat('#a24a2e', { rough: 0.8 }); const dm = new THREE.Object3D();
    fac.forEach((m, mi) => {
      const N = 700; const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m, N); const rf = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 0.25, 4), roofM, N); let n = 0;
      for (let k = 0; k < N * 2 && n < N; k++) {
        const side = r.next() < 0.62 ? -1 : 1; const x = side * (320 + r.next() ** 0.8 * 1800), z = (r.next() - 0.5) * 3200; if (side < 0 && z > 700 && x > -700) continue;
        const h = 9 + r.int(0, 6) * 3; const w = 10 + r.next() * 8, d = 9 + r.next() * 8;
        const gy = landHeight(x, z) - 1;
        dm.position.set(x, gy + h / 2, z); dm.scale.set(w, h, d); dm.rotation.set(0, r.next() * 0.3, 0); dm.updateMatrix(); im.setMatrixAt(n, dm.matrix);
        dm.position.y = gy + h + 1; dm.scale.set(w * 1.4, 6, d * 1.4); dm.rotation.y += Math.PI / 4; dm.updateMatrix(); rf.setMatrixAt(n, dm.matrix); n++;
      }
      im.count = rf.count = n; im.castShadow = true; im.receiveShadow = true; s.add(im, rf);
    });
    // landmarks on the historic peninsula skyline
    this.hagia = grandMosque(1.0, 4, '#d9a98c'); this.hagia.position.set(-700, landHeight(-700, 300) - 2, 300); s.add(this.hagia);
    this.blue = grandMosque(1.05, 6, '#e8e2d6'); this.blue.position.set(-950, landHeight(-950, 520) - 2, 520); s.add(this.blue);
    for (let k = 0; k < 7; k++) { const m = makeMosque(k + 3, { minarets: 2 + (k % 3), scale: 1.6 }); { const X = -500 - r.next() * 1200, Z = -800 + r.next() * 1600; m.position.set(X, landHeight(X, Z) - 1, Z); } s.add(m); }
    const galata = new THREE.Group(); galata.position.set(-560, landHeight(-560, -500) - 2, -500); s.add(galata); galata.add(cyl(12, 13, 60, mat('#c9b89a'), 0, 30, 0, 24)); const gc = new THREE.Mesh(new THREE.ConeGeometry(14, 22, 24), mat('#4a5560', { metal: 0.5, rough: 0.4 })); gc.position.y = 71; galata.add(gc); shadowAll(galata);
    // Bosphorus bridge
    const br = new THREE.Group(); br.position.set(0, 0, -1100); s.add(br); const bm = mat('#c9ccd0', { metal: 0.6, rough: 0.4 });
    br.add(box(1400, 4, 30, bm, 0, 64, 0));
    for (const x of [-520, 520]) { br.add(box(10, 165, 10, bm, x, 82, -12)); br.add(box(10, 165, 10, bm, x, 82, 12)); br.add(box(10, 8, 34, bm, x, 160, 0)); }
    const cableM = mat('#d8dbe0', { metal: 0.7, rough: 0.3 });
    for (const zc of [-13, 13]) { const pts = []; for (let i = 0; i <= 60; i++) { const x = -700 + i * (1400 / 60); const y = x < -520 ? lerp(66, 162, (x + 700) / 180) : x > 520 ? lerp(162, 66, (x - 520) / 180) : 72 + 90 * ((x / 520) ** 2); pts.push(new THREE.Vector3(x, y, zc)); } br.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 1.2, 6), cableM)); for (let x = -500; x <= 500; x += 25) br.add(box(0.4, 72 + 90 * ((x / 520) ** 2) - 64, 0.4, cableM, x, (72 + 90 * ((x / 520) ** 2) + 64) / 2, zc)); }
    shadowAll(br);
    const deckLights = new Sprites(60, (i) => ({ pos: [-700 + i * 23.7, 68, 0], birth: -1e5, life: 1e9, size0: 8, color: [1.5, 0.9, 0.4], alpha: 0.6 }), { map: glowTexture(), additive: true, fadeIn: 0, fadeOut: 0 }); br.add(deckLights);
    // ferries
    this.ferries = []; for (let k = 0; k < 6; k++) { const f = new THREE.Group(); f.add(box(36, 6, 9, mat('#f4f4f2'), 0, 3, 0)); f.add(box(22, 5, 8, mat('#f4f4f2'), -2, 8.5, 0)); f.add(cyl(1.5, 1.5, 6, mat('#222'), 2, 13, 0, 10)); f.add(box(37, 1, 9.2, mat('#1d3a5f'), 0, 1, 0)); shadowAll(f); f.userData = { z0: (r.next() - 0.5) * 2400, x: (r.next() - 0.5) * 300, sp: (r.next() < 0.5 ? -1 : 1) * (6 + r.next() * 6) }; s.add(f); this.ferries.push(f); }
    this.gulls = []; for (let k = 0; k < 24; k++) { const b = makeBird('#e8e8e8'); b.scale.setScalar(18); s.add(b); this.gulls.push(b); }
  }
  // o: { faultGlow (0..1), fogMul }
  update(t, o = {}) {
    this.sky.setTime(t);
    this.faultGlow.material.opacity = (o.faultGlow || 0) * (0.65 + 0.35 * Math.sin(t * 2.5));
    this.waterMat.opacity = 0.86 - (o.faultGlow || 0) * 0.25;
    for (const f of this.ferries) { const u = f.userData; const z = ((u.z0 + t * u.sp * 3) % 3000 + 4500) % 3000 - 1500; f.position.set(u.x, 0, z); f.rotation.y = u.sp > 0 ? Math.PI / 2 : -Math.PI / 2; }
    this.gulls.forEach((b, k) => { const a = t * 0.15 + k; b.position.set(Math.cos(a) * (200 + k * 9) - 100, 90 + Math.sin(t * 0.7 + k) * 15 + k * 3, Math.sin(a) * (150 + k * 6) + 200); b.rotation.y = -a; flapBird(b, t, k); });
  }
}
