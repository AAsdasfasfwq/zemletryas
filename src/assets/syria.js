// Northern Syria: war-damaged Aleppo quarter (with the Citadel) and an Idlib displacement camp.
import * as THREE from 'three';
import { SkyDome } from '../engine/sky.js';
import { Precip, dustBurst, fireStream, smokeStream, loopStream } from '../engine/particles.js';
import { canvasTex, concreteTexture, gravelTexture, snowTexture, glowTexture } from '../engine/textures.js';
import { RNG, TAU, clamp, lerp, smooth, ease, fbm2, noise2, noise1 } from '../engine/util.js';
import { mat, box, cyl, sph, makeCar, makeRubble, jitterGeo, shadowAll, makeTree } from './kit.js';
import { Person } from './people.js';
import { Building, STYLES } from './buildings.js';

const SAND_STYLES = [8, 9, 10];
STYLES.push(
  { wall: '#d8c4a0', accent: '#8a6a48', frame: '#c9b48e', glassTint: [40, 46, 52], shopColor: '#5a4a3a' },
  { wall: '#cbb38c', accent: '#7a5a3a', frame: '#bca57e', glassTint: [35, 40, 46], shopColor: '#4a3a2a' },
  { wall: '#e2d2b4', accent: '#9a7a52', frame: '#d4c29e', glassTint: [44, 50, 56], shopColor: '#6a5a40' },
);

function holeGeo(seed, size) {
  const r = new RNG(seed); const sh = new THREE.Shape(); const n = 11;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const rr = size * (0.55 + r.next() * 0.6); i ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.8) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.8); }
  return new THREE.ShapeGeometry(sh);
}

export class SyriaSet {
  constructor() { this.scene = new THREE.Scene(); }
  build(director) {
    const s = this.scene; const r = new RNG(963);
    this.sky = new SkyDome('dusty'); s.add(this.sky);
    this.envs = {}; for (const k of ['dusty', 'winterDusk', 'overcast', 'stormNight']) { this.sky.setPreset(k); this.envs[k] = this.sky.makeEnv(director.renderer); }
    this.sun = new THREE.DirectionalLight(0xffd7a0, 3); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.04; s.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xd9c9b0, 0x6a5a48, 1); s.add(this.hemi);
    s.fog = new THREE.FogExp2(0xc9b08a, 0.003);
    const groundT = concreteTexture(44, [176, 158, 128]); groundT.repeat.set(80, 80);
    this.groundMat = new THREE.MeshStandardMaterial({ map: groundT, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), this.groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    this.snowGround = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), (() => { const t = snowTexture(); t.repeat.set(30, 30); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, transparent: true, opacity: 0.85 }); })());
    this.snowGround.rotation.x = -Math.PI / 2; this.snowGround.position.set(300, 0.03, 0); this.snowGround.visible = false; s.add(this.snowGround);

    // ---------- Aleppo quarter (around origin) ----------
    this.ruins = new THREE.Group(); s.add(this.ruins);
    this.ruinBuildings = [];
    const holeM = new THREE.MeshBasicMaterial({ color: 0x0b0806 });
    const scorch = new THREE.MeshBasicMaterial({ color: 0x241a12, transparent: true, opacity: 0.55, depthWrite: false });
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 2; j++) {
      if (Math.abs(i) <= 0 && j === 0) continue; // street/plaza
      const x = i * 26 + (r.next() - 0.5) * 5, z = j * 24 + (r.next() - 0.5) * 4;
      const floors = 3 + r.int(0, 4); const b = new Building({ w: 14 + r.int(0, 6), d: 11, floors, seed: 4000 + i * 10 + j, style: r.pick(SAND_STYLES), shop: r.chance(0.6), roofKit: r.chance(0.4) });
      b.position.set(x, 0, z); b.rotation.y = r.chance(0.5) ? 0 : Math.PI; this.ruins.add(b); this.ruinBuildings.push(b);
      b.ruined = r.chance(0.55);
      if (b.ruined) {
        // shell holes and scorch marks on the street-facing faces
        for (let k = 0; k < 2 + r.int(0, 4); k++) {
          const f = r.int(1, floors - 1); const hx = (r.next() - 0.5) * (b.w - 3); const size = 0.8 + r.next() * 1.8;
          const h = new THREE.Mesh(holeGeo(i * 100 + j * 10 + k, size), holeM); h.position.set(hx, f * 3 + 1.5, b.d / 2 + 0.03); b.body.add(h);
          const sc = new THREE.Mesh(holeGeo(i * 100 + j * 10 + k + 7, size * 1.8), scorch); sc.position.set(hx, f * 3 + 2.2, b.d / 2 + 0.02); b.body.add(sc);
          const h2 = h.clone(); h2.position.z = -b.d / 2 - 0.03; h2.rotation.y = Math.PI; b.body.add(h2);
        }
        b.damageMode = r.chance(0.5) ? 'damaged' : 'intact';
        const rb = makeRubble({ count: 90, radius: 6 + r.next() * 4, height: 2 + r.next() * 2, seed: 70 + i * 7 + j, colors: ['#c9b48e', '#b59e78', '#a38c68', '#d8c4a0', '#8a7a62'] });
        rb.position.set(x + b.w * 0.45 * r.sign(), 0, z + b.d * 0.6); this.ruins.add(rb);
      } else b.damageMode = 'intact';
      b.fate = b.ruined || r.chance(0.5) ? 'crumble' : 'intact'; b.delay = 2 + r.next() * 18;
      if (b.fate === 'crumble' && Math.hypot(x, z) < 70) b.addDust({ count: 90, color: [0.82, 0.74, 0.6] });
    }
    // burnt cars
    for (let k = 0; k < 8; k++) { const c = makeCar(500 + k, { color: '#2a2622' }); c.traverse((m) => { if (m.isMesh && m.material && m.material.color) { m.material = mat('#2f2a25', { rough: 1 }); } }); c.position.set((r.next() - 0.5) * 60, 0, (r.next() - 0.5) * 8 + (k % 2 ? 12 : -12)); c.rotation.y = r.next() * TAU; c.rotation.z = (r.next() - 0.5) * 0.2; this.ruins.add(c); }
    // Aleppo citadel on its mound (background, -z)
    const cit = new THREE.Group(); cit.position.set(20, 0, -230); this.ruins.add(cit);
    const mound = new THREE.Mesh(new THREE.CylinderGeometry(55, 95, 38, 40, 1), mat('#b39a74', { rough: 1, flat: true })); mound.position.y = 19; cit.add(mound);
    const wallM = mat('#d6c29c', { rough: 0.9 });
    for (let k = 0; k < 18; k++) { const a = (k / 18) * TAU; const tw = box(7, 12, 7, wallM, Math.cos(a) * 52, 44, Math.sin(a) * 52); cit.add(tw); const wl = box(16, 9, 2.5, wallM, Math.cos(a + 0.17) * 53, 42, Math.sin(a + 0.17) * 53); wl.rotation.y = -a - 0.17 + Math.PI / 2; cit.add(wl); }
    cit.add(box(18, 22, 18, wallM, 0, 49, 0)); cit.add(cyl(3, 3, 18, wallM, 10, 56, 6, 12));
    const bridge = box(8, 4, 50, wallM, 0, 26, 62); bridge.rotation.x = -0.45; cit.add(bridge);
    shadowAll(cit);
    // distant ruined skyline filler
    const fillM = mat('#bfa982', { rough: 1 }); const fill = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), fillM, 300); const dm = new THREE.Object3D(); let fi = 0;
    for (let k = 0; k < 300; k++) { const a = r.next() * TAU, d = 110 + r.next() * 350; dm.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); const h = 6 + r.next() * 18; dm.scale.set(10 + r.next() * 12, h, 10 + r.next() * 10); dm.position.y = h / 2; dm.rotation.y = r.next(); dm.updateMatrix(); fill.setMatrixAt(fi++, dm.matrix); }
    s.add(fill);
    this.ruinPeople = []; for (let k = 0; k < 8; k++) { const p = new Person(800 + k, { coat: r.pick(['#4a3f35', '#3a3a40', '#5a4a3a']) }); p.position.set((r.next() - 0.5) * 30, 0, (r.next() - 0.5) * 10); p.rotation.y = r.next() * TAU; this.ruins.add(p); this.ruinPeople.push(p); }
    this.whiteHelmets = []; for (let k = 0; k < 8; k++) { const p = new Person(850 + k, { helmet: '#f4f4f4', coat: '#3a3a3a', headlamp: true }); p.position.set(-6 + (k % 4) * 3 + r.next(), 1.2 + r.next(), 10 + Math.floor(k / 4) * 2); p.rotation.y = r.next() * TAU; this.ruins.add(p); this.whiteHelmets.push(p); p.visible = false; }

    // the pile the White Helmets dig in; rescuers stand on its surface
    this.digPile = makeRubble({ count: 170, radius: 6.5, height: 2.6, seed: 913, colors: ['#c9b48e', '#b59e78', '#a38c68', '#d8c4a0', '#8a7a62'] }); this.digPile.position.set(-1.5, 0, 10.5); this.ruins.add(this.digPile);
    this.digPile.updateMatrixWorld(true); { const rc = new THREE.Raycaster(); this.whiteHelmets.forEach((p) => { let y = 0; for (const [dx, dz] of [[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) { rc.set(new THREE.Vector3(p.position.x + dx, 30, p.position.z + dz), new THREE.Vector3(0, -1, 0)); const h = rc.intersectObject(this.digPile, true)[0]; if (h) y = Math.max(y, h.point.y); } p.position.y = y; }); }
    // flood light on a tripod + small generator (lights the night dig), fires in the rubble
    this.rig = new THREE.Group(); this.rig.position.set(5, 0, 16); this.ruins.add(this.rig); this.rig.visible = false;
    const rigM = mat('#2b2e33', { metal: 0.6, rough: 0.5 });
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU; const leg = cyl(0.04, 0.04, 4.3, rigM, Math.cos(a) * 0.7, 2.0, Math.sin(a) * 0.7, 6); leg.rotation.set(Math.sin(a) * 0.17, 0, -Math.cos(a) * 0.17); this.rig.add(leg); }
    this.rig.add(cyl(0.05, 0.05, 1.2, rigM, 0, 4.4, 0, 6));
    this.floodHead = box(1.0, 0.7, 0.25, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 5.0, 0); this.floodHead.lookAt(new THREE.Vector3(-7, 1, -7)); this.rig.add(this.floodHead);
    this.rig.add(box(1.2, 0.8, 0.7, mat('#c8a21e', { rough: 0.6 }), 1.6, 0.4, 0.8));
    const fg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(1.4, 1.35, 1.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 })); fg.position.set(0, 5.0, 0); fg.scale.setScalar(4.5); this.rig.add(fg);
    this.flood = new THREE.SpotLight(0xfff0dc, 0, 70, 0.6, 0.55, 1.5); this.flood.position.set(5, 5, 16); this.flood.target.position.set(-2, 1, 9); s.add(this.flood, this.flood.target);
    this.ruinFires = new THREE.Group(); this.ruinFires.visible = false; s.add(this.ruinFires);
    [[-22, 2.5, -6, 1.0], [24, 2.0, 4, 0.8], [-10, 3.0, -28, 1.3], [40, 2.0, -24, 1.1]].forEach(([x, y, z, sc], k) => {
      this.ruinFires.add(fireStream({ origin: [x, y, z], radius: 1.4 * sc, height: 4.5 * sc, count: 90, seed: 420 + k, scale: 3.4 * sc }));
      this.ruinFires.add(smokeStream({ origin: [x, y + 4 * sc, z], count: 40, seed: 440 + k, height: 35, size: [4, 18], life: 12, color: [0.07, 0.065, 0.06], opacity: 0.65, wind: [1.2, 0, 0.3] }));
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(1.6, 0.62, 0.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 })); gl.position.set(x, y + 2.5 * sc, z); gl.scale.setScalar(20 * sc); this.ruinFires.add(gl);
      if (k < 3) { const L = new THREE.PointLight(0xff7a30, 0, 80, 1.5); L.position.set(x, y + 3 * sc, z); L.userData.base = 260 * sc; this.ruinFires.add(L); }
    });

    // ---------- Idlib camp (x ~ 300) ----------
    this.camp = new THREE.Group(); this.camp.position.set(300, 0, 0); s.add(this.camp);
    const tentM = [mat('#f2efe6', { rough: 0.95, side: THREE.DoubleSide }), mat('#5b8fc7', { rough: 0.9, side: THREE.DoubleSide }), mat('#c9d7e8', { rough: 0.95, side: THREE.DoubleSide })];
    const tentGeo = (() => { const g = new THREE.BufferGeometry(); const w = 2.2, l = 4, h = 2.1; const v = [-w, 0, -l, 0, h, -l, w, 0, -l, -w, 0, l, 0, h, l, w, 0, l]; const idx = [0, 1, 4, 0, 4, 3, 2, 5, 4, 2, 4, 1, 0, 2, 1, 3, 4, 5]; g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; })();
    const tents = tentM.map((m) => new THREE.InstancedMesh(tentGeo, m, 120)); const counts = [0, 0, 0];
    for (let a = -7; a <= 7; a++) for (let b = -5; b <= 5; b++) { if (Math.abs(a) < 2 && Math.abs(b) < 2) continue; const k = (((a * 7 + b * 13) % 3) + 3) % 3; if (counts[k] >= 120) continue; dm.position.set(a * 7 + (r.next() - 0.5), 0, b * 10 + (r.next() - 0.5) * 2); dm.rotation.set(0, (r.next() - 0.5) * 0.15, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); tents[k].setMatrixAt(counts[k]++, dm.matrix); }
    tents.forEach((t, k) => { t.count = counts[k]; t.castShadow = true; t.receiveShadow = true; this.camp.add(t); });
    // cinder block shelters with tarp roofs
    const blockT = concreteTexture(55, [150, 148, 142]); blockT.repeat.set(2, 1);
    for (let k = 0; k < 18; k++) { const g = new THREE.Group(); g.position.set(-60 + (k % 6) * 9, 0, -70 - Math.floor(k / 6) * 9); const bw = 5 + r.next() * 2; g.add(box(bw, 2.6, 4.5, new THREE.MeshStandardMaterial({ map: blockT, roughness: 1 }), 0, 1.3, 0)); const tarp = box(bw + 0.6, 0.08, 5.1, mat(r.pick(['#2b6cb0', '#3c8dbc', '#c0392b', '#d9d0c0'])), 0, 2.7, 0); tarp.rotation.z = 0.06; g.add(tarp); g.add(box(1, 1.9, 0.05, mat('#2a2622'), 0, 0.95, 2.26)); shadowAll(g); this.camp.add(g); }
    // clotheslines
    const lineM = mat('#333'); for (let k = 0; k < 6; k++) { const x = -30 + k * 12, z = 8 + (k % 2) * 20; this.camp.add(box(0.02, 0.02, 6, lineM, x, 2.0, z)); for (let c = 0; c < 6; c++) { const cl = box(0.6, 0.7, 0.03, mat(r.pick(['#c0392b', '#2e86ab', '#e6a23c', '#3b8d5a', '#8e44ad', '#f1c40f'])), x, 1.6, z - 2.5 + c * 1); cl.rotation.y = Math.PI / 2; this.camp.add(cl); } }
    // barrels with burning tyres
    this.barrels = [];
    for (let k = 0; k < 4; k++) {
      const x = -10 + k * 7, z = 4 + (k % 2) * 4; const g = new THREE.Group(); g.position.set(x, 0, z); this.camp.add(g);
      g.add(cyl(0.32, 0.32, 0.95, mat('#3e4a52', { metal: 0.6, rough: 0.55 }), 0, 0.47, 0, 16));
      const f = fireStream({ origin: [0, 1.0, 0], radius: 0.24, height: 1.2, count: 55, seed: 300 + k, scale: 0.85 }); g.add(f);
      const sm = smokeStream({ origin: [0, 1.6, 0], count: 60, seed: 330 + k, height: 18, color: [0.05, 0.05, 0.05], size: [0.6, 7], life: 9, opacity: 0.8, wind: [1.0, 0, 0.3] }); g.add(sm);
      const L = new THREE.PointLight(0xff8a3a, 0, 12, 2); L.position.y = 1.6; g.add(L);
      const kids = []; for (let c = 0; c < 3; c++) { const p = new Person(900 + k * 3 + c, { child: c < 2, coat: r.pick(['#7a3a2a', '#2a4a6a', '#5a5a3a', '#6a2a4a']) }); const a = c / 3 * TAU + 0.4; p.position.set(Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1); p.rotation.y = -a - Math.PI / 2; g.add(p); kids.push(p); }
      this.barrels.push({ g, f, sm, L, kids });
    }
    // olive trees and hills around camp
    for (let k = 0; k < 30; k++) { const t = makeTree(700 + k, { scale: 0.9 }); t.position.set(-90 + r.next() * 180, 0, -100 - r.next() * 60); this.camp.add(t); }
    const hills = new THREE.Mesh(jitterGeo(new THREE.SphereGeometry(200, 30, 10, 0, TAU, 0, Math.PI / 2), 20, 4), mat('#8f8a6a', { rough: 1, flat: true })); hills.scale.set(2.2, 0.25, 1); hills.position.set(0, -6, -330); this.camp.add(hills);
    this.campPeople = []; for (let k = 0; k < 14; k++) { const p = new Person(950 + k, { child: k % 3 === 0, coat: r.pick(['#4a3f35', '#3a3a40', '#5a4a3a', '#6a3a3a']) }); p.position.set((r.next() - 0.5) * 70, 0, (r.next() - 0.5) * 50); p.rotation.y = r.next() * TAU; p.userData.walk = r.chance(0.5); this.camp.add(p); this.campPeople.push(p); }
    this.snow = new Precip({ count: 8000, box: [80, 40, 80], fall: 1.8, wind: [2, 0, 0.6], size: 0.11, color: [1, 1, 1], opacity: 0.9, seed: 21 }); s.add(this.snow);
    this.haze = dustBurst({ count: 90, center: [0, 0, 0], radius: 140, height: 25, speed: 0.2, spread: 0, life: [1e5, 1e5 + 1], size: [30, 70], color: [0.85, 0.75, 0.6], seed: 7, opacity: 0.18, rise: 0 }); this.haze.material.uniforms.uFadeIn.value = 0; this.haze.material.uniforms.uFadeOut.value = 0; s.add(this.haze);
    this.megaDust = dustBurst({ count: 260, center: [0, 0, -10], radius: 70, height: 20, speed: 9, spread: 6, life: [10, 18], size: [12, 45], color: [0.86, 0.76, 0.6], seed: 77, opacity: 0.95 }); s.add(this.megaDust);
  }
  // o: { area: 'aleppo'|'camp', mood: 'dusty'|'winterDusk'|'overcast'|'stormNight', snow, quake:{t0, amp}, collapse, fires, helmets, megaDust:t }
  update(t, o = {}) {
    const mood = o.mood || 'dusty';
    if (this.mood !== mood) {
      this.mood = mood; this.sky.setPreset(mood); this.scene.environment = this.envs[mood];
      const P = { dusty: [0xffd7a0, 3.2, [0.6, 0.45, -0.5], 0xd9c9b0, 0x6a5a48, 1.0, 0xc9b08a, 0.0012], winterDusk: [0x9fb0d0, 0.7, [0.6, 0.1, -0.6], 0x6a7898, 0x2a2a30, 1.0, 0x4a5064, 0.0025], overcast: [0xdfe3ea, 1.4, [0.3, 0.8, -0.3], 0xc8ccd4, 0x6a665f, 1.4, 0x9da3aa, 0.0015], stormNight: [0x8196cc, 0.6, [-0.45, 0.55, 0.5], 0x34435f, 0x1c1712, 0.85, 0x131826, 0.0022] }[mood];
      this.sun.color.set(P[0]); this.sun.intensity = P[1]; this.sunDir = new THREE.Vector3(...P[2]).normalize(); this.sky.setSun(this.sunDir);
      this.hemi.color.set(P[3]); this.hemi.groundColor.set(P[4]); this.hemi.intensity = P[5]; this.scene.fog.color.set(P[6]); this.scene.fog.density = P[7];
    }
    this.sky.setTime(t);
    const fx = o.area === 'camp' ? 300 : 0; const fr = o.shadowR || 60;
    this.sun.target.position.set(fx, 0, 0); this.sun.position.set(fx + this.sunDir.x * 300, this.sunDir.y * 300, this.sunDir.z * 300);
    const sc = this.sun.shadow.camera; sc.left = -fr; sc.right = fr; sc.top = fr; sc.bottom = -fr; sc.near = 10; sc.far = 700; sc.updateProjectionMatrix();
    const cp = o.camera ? o.camera.position : new THREE.Vector3();
    this.snow.opacity = o.snow || 0; this.snow.update(t, cp); this.snowGround.visible = (o.snow || 0) > 0 || !!o.snowGround;
    const q = o.quake;
    for (const b of this.ruinBuildings) {
      if (q) { const tau = t - q.t0; const amp = q.amp ? q.amp(t) : 0; if (b.fate === 'crumble' && tau > b.delay) b.setState('crumble', tau - b.delay, { amp: amp * 0.3, t }); else b.setState(b.damageMode === 'damaged' ? 'damaged' : 'sway', 0, { amp, t }); }
      else if (o.after) b.setState(b.fate === 'crumble' ? 'crumble' : b.damageMode, 999);
      else b.setState(b.damageMode, 0);
      if (b.dust && !q) b.dust.visible = false;
    }
    for (const b of this.barrels) { const on = !!o.fires; b.f.visible = b.sm.visible = on; b.f.material.uniforms.uTime.value = t; b.sm.material.uniforms.uTime.value = t; b.L.intensity = on ? 22 + Math.sin(t * 11 + b.g.id) * 5 : 0; b.kids.forEach((p) => p.pose('shiver', t)); }
    for (const p of this.campPeople) p.pose(p.userData.walk ? 'walk' : 'shiver', t);
    for (const p of this.ruinPeople) p.pose('walk', t);
    this.digPile.visible = !!o.helmets || !!o.after;
    this.whiteHelmets.forEach((p, k) => { p.visible = !!o.helmets; if (p.visible) p.pose(k % 3 === 0 ? 'carry' : 'dig', t); });
    this.haze.visible = o.haze !== false; this.haze.setTime(10 + t * 0.02); this.haze.material.uniforms.uColor.value.setRGB(...(mood === 'dusty' ? [0.85, 0.75, 0.6] : mood === 'stormNight' ? [0.12, 0.125, 0.14] : [0.45, 0.47, 0.52]));
    // night rescue in the Aleppo ruins: generator flood light + burning rubble
    const nightRescue = mood === 'stormNight' && !!o.after; this.rig.visible = nightRescue; this.flood.intensity = nightRescue ? 90 : 0; this.floodHead.material.color.setScalar(nightRescue ? 6 : 0.3);
    this.ruinFires.visible = nightRescue; this.ruinFires.children.forEach((c) => { if (c.material && c.material.uniforms && c.material.uniforms.uTime) c.material.uniforms.uTime.value = t; if (c.isPointLight) c.intensity = nightRescue ? c.userData.base * (0.85 + 0.15 * Math.sin(t * 9 + c.id)) : 0; });
    this.megaDust.visible = o.megaDust !== undefined; if (this.megaDust.visible) this.megaDust.setTime(o.megaDust);
  }
}
