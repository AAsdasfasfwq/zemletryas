// The Turkish city set (Kahramanmaras / Gaziantep / Antakya stand-in).
// One layout, many states: golden day 2022, winter dusk, snowy night, 4:17 quake, blackout,
// destroyed overcast day, three-years-later gravel lots.
import * as THREE from 'three';
import { SkyDome } from '../engine/sky.js';
import { Precip, dustBurst, loopStream, fireStream, smokeStream, sparkBurst, Sprites } from '../engine/particles.js';
import { asphaltTexture, concreteTexture, grassTexture, gravelTexture, snowTexture, canvasTex, glowTexture, puffTexture } from '../engine/textures.js';
import { RNG, TAU, clamp, lerp, smooth, ease, fbm2, noise2, noise1, ridged2 } from '../engine/util.js';
import { mat, box, cyl, makeTree, makeCypress, makeStreetLamp, makeBench, makeUmbrellaTable, makeChair, makeStall, makeCar, flashBeacons, makeExcavator, poseExcavator, makeTowerCrane, poseCrane, makeRubble, makeHelicopter, Debris, shadowAll } from './kit.js';
import { Person, makeCat, makeDog, poseDog, makeBird, flapBird } from './people.js';
import { Building, ConstructionFrame, makeMosque, makeBillboard, setCityWindowLight, forEachFacadeMat, FLOOR_H, STYLES } from './buildings.js';

const P = 44; // block pitch
const BLOCK = 31; // block size (sidewalk incl.)
const NB = 4; // blocks from -NB..NB

const TOD = {
  golden: { sky: 'golden', sun: [0.55, 0.32, -0.62], sunColor: 0xffc890, sunI: 3.4, hemiSky: 0xbcd4ff, hemiGround: 0x8a6a50, hemiI: 0.9, fog: 0xe9c9a8, fogD: 0.0011, env: 0.9, exposure: 1.0 },
  day: { sky: 'day', sun: [0.4, 0.6, -0.5], sunColor: 0xfff1df, sunI: 3.2, hemiSky: 0xcfe1ff, hemiGround: 0x8a7a66, hemiI: 1.0, fog: 0xcfd9e6, fogD: 0.0010, env: 1.0, exposure: 1.0 },
  overcast: { sky: 'overcast', sun: [0.2, 0.8, -0.4], sunColor: 0xdfe3ea, sunI: 1.1, hemiSky: 0xc8ccd4, hemiGround: 0x6a665f, hemiI: 1.5, fog: 0x9da3aa, fogD: 0.0026, env: 1.2, exposure: 1.1 },
  winterDusk: { sky: 'winterDusk', sun: [0.7, 0.08, -0.6], sunColor: 0x8f9bc0, sunI: 0.5, hemiSky: 0x5a6890, hemiGround: 0x2a2a35, hemiI: 0.9, fog: 0x4a5064, fogD: 0.0028, env: 0.8, exposure: 1.15 },
  night: { sky: 'night', sun: [-0.4, 0.55, 0.5], sunColor: 0x8fa6d8, sunI: 0.38, hemiSky: 0x24325a, hemiGround: 0x0e0e14, hemiI: 0.55, fog: 0x0b1020, fogD: 0.0022, env: 0.6, exposure: 1.2 },
  stormNight: { sky: 'stormNight', sun: [-0.4, 0.6, 0.5], sunColor: 0x6a7490, sunI: 0.22, hemiSky: 0x1a2030, hemiGround: 0x09090c, hemiI: 0.5, fog: 0x0c0e14, fogD: 0.003, env: 0.5, exposure: 1.25 },
  blackout: { sky: 'stormNight', sun: [-0.45, 0.55, 0.5], sunColor: 0x8196cc, sunI: 0.55, hemiSky: 0x33425f, hemiGround: 0x1c1712, hemiI: 0.8, fog: 0x121725, fogD: 0.0026, env: 0.5, exposure: 1.3 },
  dawnGrey: { sky: 'dawnGrey', sun: [0.6, 0.25, -0.5], sunColor: 0xe8d2b8, sunI: 1.2, hemiSky: 0xb7bcc6, hemiGround: 0x5e5a54, hemiI: 1.3, fog: 0x8f8f92, fogD: 0.0030, env: 1.0, exposure: 1.1 },
};

export class CitySet {
  constructor() { this.scene = new THREE.Scene(); }
  build(director) {
    const s = this.scene; const r = new RNG(2023);
    this.sky = new SkyDome('golden'); s.add(this.sky);
    this.envs = {};
    for (const k of Object.keys(TOD)) { this.sky.setPreset(TOD[k].sky); this.envs[k] = this.sky.makeEnv(director.renderer); }
    this.sun = new THREE.DirectionalLight(0xffffff, 3); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.04;
    s.add(this.sun); s.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbcd4ff, 0x8a6a50, 1); s.add(this.hemi);
    s.fog = new THREE.FogExp2(0xe9c9a8, 0.0011);
    // practical lights pool (shots position them)
    this.points = []; for (let i = 0; i < 6; i++) { const L = new THREE.PointLight(0xffaa66, 0, 30, 2); s.add(L); this.points.push(L); }
    this.spots = []; for (let i = 0; i < 3; i++) { const L = new THREE.SpotLight(0xfff2dd, 0, 60, 0.32, 0.5, 1.5); s.add(L); s.add(L.target); this.spots.push(L); }

    // ---------- ground ----------
    const asph = asphaltTexture(3); asph.repeat.set(160, 160);
    this.asphMat = new THREE.MeshStandardMaterial({ map: asph, roughness: 0.92, metalness: 0, color: 0xffffff });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), this.asphMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    const pave = concreteTexture(5, [196, 186, 170]); pave.repeat.set(6, 6);
    this.paveMat = new THREE.MeshStandardMaterial({ map: pave, roughness: 0.9, color: 0xffffff }); this.paveMap = pave;
    const grass = grassTexture(7); grass.repeat.set(6, 6);
    this.grassMat = new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 });
    const grav = gravelTexture(11); grav.repeat.set(5, 5);
    this.gravelMat = new THREE.MeshStandardMaterial({ map: grav, roughness: 1 });
    const snowT = snowTexture(); snowT.repeat.set(8, 8);
    this.snowMat = new THREE.MeshStandardMaterial({ map: snowT, roughness: 0.75, color: 0xf2f6fb });
    this.snowLayer = new THREE.Group(); s.add(this.snowLayer); // snow cover overlays
    // lane markings (instanced)
    const markM = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.6 });
    const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, 0.18), markM, 800); let di = 0; const dm = new THREE.Object3D();
    for (let k = -NB - 1; k <= NB; k++) {
      const c = (k + 0.5) * P;
      for (let x = -NB * P - 20; x < NB * P + 20; x += 7) {
        if (Math.abs(((x - P / 2) % P + P) % P - P / 2) < 7) continue; // skip intersections
        dm.position.set(x, 0.02, c); dm.rotation.set(-Math.PI / 2, 0, 0); dm.updateMatrix(); if (di < 800) dash.setMatrixAt(di++, dm.matrix);
        dm.position.set(c, 0.02, x); dm.rotation.set(-Math.PI / 2, 0, Math.PI / 2); dm.updateMatrix(); if (di < 800) dash.setMatrixAt(di++, dm.matrix);
      }
    }
    dash.count = di; dash.receiveShadow = true; s.add(dash);
    const zebra = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.6, 4.5), markM, 1200); let zi = 0;
    for (let i = -NB; i <= NB; i++) for (let j = -NB; j <= NB; j++) {
      const cx = i * P, cz = j * P;
      for (let k = -4; k <= 4; k++) {
        if (zi + 4 > 1200) break;
        for (const [x, z, rot] of [[cx + k * 1.2, cz + BLOCK / 2 + 3.2, 0], [cx + k * 1.2, cz - BLOCK / 2 - 3.2, 0], [cx + BLOCK / 2 + 3.2, cz + k * 1.2, Math.PI / 2], [cx - BLOCK / 2 - 3.2, cz + k * 1.2, Math.PI / 2]]) {
          if ((i + j) % 2) continue;
          dm.position.set(x, 0.021, z); dm.rotation.set(-Math.PI / 2, 0, rot); dm.updateMatrix(); zebra.setMatrixAt(zi++, dm.matrix);
        }
      }
    }
    zebra.count = zi; s.add(zebra);

    // ---------- blocks ----------
    this.buildings = []; this.blocks = [];
    this.trees = []; this.lamps = []; this.parked = []; this.props = new THREE.Group(); s.add(this.props);
    const special = { '0,0': 'hero', '1,0': 'bazaar', '-1,-1': 'mosque', '1,-1': 'towers', '-1,1': 'park', '2,1': 'construction', '-2,0': 'park2', '0,-2': 'towers2', '2,-2': 'park3', '-3,2': 'mosque2' };
    for (let i = -NB; i <= NB; i++) for (let j = -NB; j <= NB; j++) {
      const cx = i * P, cz = j * P; const type = special[`${i},${j}`] || 'apartments';
      const blk = { i, j, cx, cz, type, buildings: [] }; this.blocks.push(blk);
      const isPark = type.startsWith('park');
      const base = new THREE.Mesh(new THREE.BoxGeometry(BLOCK, 0.18, BLOCK), isPark ? this.paveMat : this.paveMat); base.position.set(cx, 0.09, cz); base.receiveShadow = true; s.add(base);
      blk.base = base;
      // curb lamps / trees around the block edge
      for (let e = 0; e < 4; e++) for (let k = -1; k <= 1; k += 2) {
        const off = k * BLOCK * 0.3; const edge = BLOCK / 2 - 0.8;
        const pos = [[cx + off, cz + edge], [cx + off, cz - edge], [cx + edge, cz + off], [cx - edge, cz + off]][e];
        if ((i + j + e) % 2 === 0) { const L = makeStreetLamp(); L.position.set(pos[0], 0.18, pos[1]); L.rotation.y = [Math.PI / 2, -Math.PI / 2, 0, Math.PI][e]; s.add(L); this.lamps.push(L); }
        else { const T = { summer: makeTree(i * 31 + j * 7 + e * 3 + k, { scale: 1.1 }), winter: makeTree(i * 31 + j * 7 + e * 3 + k, { winter: true, snow: true, scale: 1.1 }) }; for (const v of [T.summer, T.winter]) { v.position.set(pos[0] + (e < 2 ? 3 : 0), 0.18, pos[1] + (e >= 2 ? 3 : 0)); s.add(v); } T.winter.visible = false; this.trees.push(T); }
      }
      if (isPark) {
        const g = new THREE.Mesh(new THREE.BoxGeometry(BLOCK - 5, 0.25, BLOCK - 5), this.grassMat); g.position.set(cx, 0.15, cz); g.receiveShadow = true; s.add(g); blk.grass = g;
        for (let k = 0; k < 9; k++) { const T = { summer: makeTree(500 + i * 13 + j * 17 + k, { scale: 1.3 }), winter: makeTree(500 + i * 13 + j * 17 + k, { winter: true, snow: true, scale: 1.3 }) }; const x = cx + (r.next() - 0.5) * 22, z = cz + (r.next() - 0.5) * 22; for (const v of [T.summer, T.winter]) { v.position.set(x, 0.25, z); s.add(v); } T.winter.visible = false; this.trees.push(T); }
        for (let k = 0; k < 4; k++) { const b = makeBench(); b.position.set(cx + (k - 1.5) * 6, 0.25, cz + 8); s.add(b); }
        if (type === 'park') { for (let k = 0; k < 3; k++) { const c = makeCypress(k + 9, 1.2); c.position.set(cx - 10 + k * 10, 0.25, cz - 10); s.add(c); } }
        continue;
      }
      if (type === 'mosque' || type === 'mosque2') { const m = makeMosque(i * 7 + j, { minarets: type === 'mosque' ? 2 : 4, scale: type === 'mosque' ? 0.95 : 0.8 }); m.position.set(cx, 0.18, cz); s.add(m); blk.mosque = m; if (type === 'mosque') this.mosque = m; continue; }
      if (type === 'bazaar') {
        this.bazaar = new THREE.Group(); this.bazaar.position.set(cx, 0.18, cz); s.add(this.bazaar);
        for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) { const st = makeStall(a * 5 + b); st.position.set(-9 + a * 6, 0, -8 + b * 8); st.rotation.y = b % 2 ? Math.PI : 0; this.bazaar.add(st); }
        // low arcade shops along the back
        const shopRow = new Building({ w: 30, d: 6, floors: 2, seed: 77, style: 3 }); shopRow.position.set(cx, 0.18, cz - 12.5); s.add(shopRow); blk.buildings.push(shopRow); this.buildings.push(shopRow);
        continue;
      }
      if (type === 'construction') {
        this.construction = new ConstructionFrame({ w: 18, d: 14, floors: 13 }); this.construction.position.set(cx - 4, 0.18, cz); s.add(this.construction);
        this.crane = makeTowerCrane(52, 34); this.crane.position.set(cx + 10, 0.18, cz + 8); s.add(this.crane);
        continue;
      }
      // apartment blocks
      const tower = type.startsWith('towers');
      const layout = tower ? [[-7, -7], [7, 7]] : [[-7.5, -7], [7.5, -7], [-7.5, 7], [7.5, 7]];
      layout.forEach(([dx, dz], k) => {
        if (!tower && type === 'hero' && k === 3) return; // cafe corner
        const seed = (i + 10) * 100 + (j + 10) * 10 + k;
        const rr = new RNG(seed);
        const dist = Math.hypot(cx, cz);
        let floors = tower ? 14 + rr.int(0, 4) : 5 + rr.int(0, 5) + (dist < 60 ? 1 : 0);
        const w = tower ? 14 : (k % 2 ? 13 : 14), d = tower ? 13 : 11;
        const bld = new Building({ w: w + rr.int(-1, 1), d, floors, seed, tower, style: tower ? rr.int(0, 2) : rr.int(0, 7) });
        bld.position.set(cx + dx * (tower ? 1 : 1), 0.18, cz + dz); bld.rotation.y = (k === 1 || k === 3) && !tower ? Math.PI : 0;
        if (type === 'hero' && k === 2) { this.hero = bld; bld.addDust({ count: 160 }); bld.position.set(cx - 6.5, 0.18, cz + 6.5); }
        s.add(bld); blk.buildings.push(bld); this.buildings.push(bld);
      });
    }
    // fates for the quake (deterministic): pancake ~40%, damaged, tip, sink
    const fr = new RNG(77);
    for (const b of this.buildings) {
      const d = Math.hypot(b.position.x, b.position.z); const x = fr.next();
      b.fate = x < 0.42 ? 'pancake' : x < 0.55 ? 'damaged' : x < 0.6 ? 'tip' : x < 0.64 ? 'sink' : 'intact';
      if (b.tower && x < 0.5) b.fate = 'pancake';
      b.delay = 3 + fr.next() * 45; b.tipDir = fr.sign();
      if (!b.dust && b.fate !== 'intact' && d < 160) b.addDust({ count: 70 });
    }
    if (this.hero) { this.hero.fate = 'pancake'; this.hero.delay = 30; }
    this.secondBuilding = this.buildings.filter((b) => b.fate === 'damaged' && b !== this.hero).sort((a, b) => a.position.distanceTo(this.hero.position) - b.position.distanceTo(this.hero.position))[0];
    if (this.secondBuilding && !this.secondBuilding.dust) this.secondBuilding.addDust({ count: 120 });

    // cafe in front of hero block corner
    this.cafe = new THREE.Group(); this.cafe.position.set(7.5, 0.18, 7); s.add(this.cafe);
    const kiosk = new Building({ w: 12, d: 8, floors: 1, seed: 5, style: 1, roofKit: false, balconies: false }); kiosk.position.set(0, 0, -2); this.cafe.add(kiosk); this.cafeBuilding = kiosk;
    this.cafeTables = [];
    for (let k = 0; k < 6; k++) { const tb = makeUmbrellaTable(k + 3); tb.position.set(-4.5 + (k % 3) * 4.5, 0, 4.2 + Math.floor(k / 3) * 3.6); this.cafe.add(tb); this.cafeTables.push(tb); for (const sx of [-1, 1]) { const ch = makeChair(['#6b4a2e', '#2c4a6e', '#8a2b2b'][k % 3]); ch.position.set(tb.position.x + sx * 0.8, 0, tb.position.z); ch.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; this.cafe.add(ch); } }

    // billboard
    this.billboardTex = canvasTex(1024, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0d3b66'); gr.addColorStop(1, '#1d6fa3'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // stylised tower illustration
      g.fillStyle = '#f2efe6'; g.fillRect(70, 110, 120, 360); g.fillRect(205, 190, 90, 280); g.fillStyle = '#7fb3d5';
      for (let y = 130; y < 450; y += 28) { for (let x = 85; x < 180; x += 26) g.fillRect(x, y, 16, 18); }
      for (let y = 205; y < 450; y += 28) { for (let x = 215; x < 285; x += 24) g.fillRect(x, y, 14, 18); }
      g.fillStyle = '#f4d35e'; g.beginPath(); g.arc(300, 110, 40, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.font = '900 92px Inter, Arial'; g.textBaseline = 'top'; g.fillText('SAFE HOMES', 340, 90);
      g.font = '600 38px Inter, Arial'; g.fillStyle = '#cfe8ff'; g.fillText('Built to the latest', 345, 210); g.fillText('earthquake code', 345, 258);
      g.fillStyle = '#f4d35e'; g.fillRect(345, 330, 470, 70); g.fillStyle = '#0d3b66'; g.font = '800 40px Inter, Arial'; g.fillText('DEPREME DAYANIKLI', 362, 345);
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '500 26px Inter, Arial'; g.fillText('Luxury residences  •  Sales office open', 345, 430);
    });
    this.billboard = makeBillboard(this.billboardTex, 14, 7); this.billboard.position.set(P / 2 + 2, 0, P / 2 - 6); this.billboard.rotation.y = -Math.PI / 4; s.add(this.billboard);

    // distant filler city (instanced) — keeps the horizon full
    this.filler = new THREE.Group(); s.add(this.filler);
    const fillMats = [0, 2, 4].map((k) => { const b = new Building({ w: 12, d: 10, floors: 6, style: k }); return b.facadeMat; });
    const fr2 = new RNG(5);
    const fm = new THREE.Object3D();
    fillMats.forEach((m, mi) => {
      const N = 260; const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m, N); let n = 0;
      for (let k = 0; k < N * 3 && n < N; k++) {
        const a = fr2.next() * TAU, rad = 215 + fr2.next() ** 0.7 * 520; const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
        const h = (4 + fr2.int(0, 9)) * FLOOR_H * (rad < 400 ? 1 : 0.8); const w = 10 + fr2.next() * 10;
        fm.position.set(x, h / 2, z); fm.scale.set(w, h, 8 + fr2.next() * 8); fm.rotation.y = Math.round(fr2.next() * 4) * Math.PI / 2 + (fr2.next() - 0.5) * 0.2; fm.updateMatrix(); im.setMatrixAt(n++, fm.matrix);
      }
      im.count = n; im.castShadow = false; im.receiveShadow = true; this.filler.add(im);
    });
    // a few distant minarets on the skyline
    for (let k = 0; k < 6; k++) { const a = fr2.next() * TAU, rad = 260 + fr2.next() * 300; const m = makeMosque(k + 40, { minarets: 2, scale: 0.8 }); m.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad); this.filler.add(m); }

    // mountains backdrop (Ahir Dagi style ridge to the north)
    this.buildMountains();

    // ---------- traffic & people ----------
    this.cars = [];
    const carKinds = ['sedan', 'sedan', 'taxi', 'sedan', 'minibus', 'taxi', 'sedan'];
    for (let k = 0; k < 34; k++) {
      const car = makeCar(k + 11, { kind: carKinds[k % carKinds.length] }); s.add(car);
      const horizontal = k % 2 === 0; const lane = (k % 4 < 2 ? 1 : -1); const street = ((k * 7) % (2 * NB)) - NB;
      car.userData.drive = { horizontal, lane, c: (street + 0.5) * P + lane * 2.6, off: fr.next() * 400, speed: (6 + fr.next() * 5) * lane };
      this.cars.push(car);
    }
    for (let k = 0; k < 46; k++) { // parked along curbs
      const car = makeCar(k + 101, { kind: k % 6 === 0 ? 'taxi' : 'sedan' }); const i = (k % 8) - 4, j = (Math.floor(k / 8) % 8) - 4;
      const side = k % 2 ? 1 : -1; car.position.set(i * P + (fr.next() - 0.5) * 16, 0, j * P + side * (BLOCK / 2 + 1.3)); car.rotation.y = side > 0 ? 0 : Math.PI;
      s.add(car); this.parked.push(car);
    }
    this.walkers = [];
    for (let k = 0; k < 44; k++) {
      const p = new Person(k + 300, { coat: null }); s.add(p);
      const j = ((k * 3) % (2 * NB)) - NB + 0.5; const side = k % 2 ? 1 : -1;
      p.userData.walk = { z: (Math.round(j - 0.5)) * P + side * (BLOCK / 2 - 1.6 - fr.next() * 1.2), dir: fr.sign(), off: fr.next() * 300, speed: 1.1 + fr.next() * 0.5, horiz: k % 3 !== 0 };
      this.walkers.push(p);
    }
    this.sitters = [];
    this.cafeTables.forEach((tb, k) => { for (const sx of [-1, 1]) { if ((k + sx) % 3 === 0) continue; const p = new Person(600 + k * 2 + (sx > 0 ? 1 : 0), { shortSleeve: true }); p.position.set(tb.position.x + sx * 0.8 + 7.5, 0.18 + 0.02, tb.position.z + 7); p.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; s.add(p); this.sitters.push(p); } });
    this.shoppers = [];
    for (let k = 0; k < 16; k++) { const p = new Person(700 + k, {}); p.userData.spot = [P + (fr.next() - 0.5) * 24, (fr.next() - 0.5) * 22]; p.position.set(p.userData.spot[0], 0.18, p.userData.spot[1]); p.rotation.y = fr.next() * TAU; s.add(p); this.shoppers.push(p); }

    // ---------- aftermath / later props ----------
    this.after = new THREE.Group(); s.add(this.after); this.after.visible = false;
    this.rubbles = [];
    for (const b of this.buildings) {
      if (b.fate === 'pancake' || b.fate === 'damaged') {
        const rb = makeRubble({ count: b === this.hero ? 320 : 120, radius: Math.max(b.w, b.d) * 0.75, height: 2 + b.floors * 0.35, seed: (b.collapseSeed * 77) | 0 });
        rb.position.copy(b.position); rb.position.y = 0.1; this.after.add(rb); this.rubbles.push(rb); rb.userData.building = b;
      }
    }
    // emergency vehicles, excavators, rescuers near hero
    const hp = this.hero.position;
    this.ambulanceCrushed = makeCar(901, { kind: 'ambulance' }); this.ambulanceCrushed.position.set(hp.x + 12, 0.0, hp.z + 15); this.ambulanceCrushed.rotation.set(0.05, 0.4, 0.08); this.ambulanceCrushed.scale.y = 0.62; this.after.add(this.ambulanceCrushed);
    const slab = box(9, 0.5, 5, mat('#a39d92', { rough: 0.95 }), hp.x + 12, 1.5, hp.z + 15); slab.rotation.z = 0.22; slab.castShadow = true; this.after.add(slab);
    this.excavators = []; for (let k = 0; k < 3; k++) { const ex = makeExcavator(); ex.position.set(hp.x - 14 + k * 30, 0.18, hp.z + 16 + (k % 2) * 6); ex.rotation.y = -0.6 + k; this.after.add(ex); this.excavators.push(ex); }
    this.rescueCrane = makeTowerCrane(30, 22); this.rescueCrane.position.set(hp.x + 22, 0.18, hp.z - 14); this.rescueCrane.visible = false; this.after.add(this.rescueCrane);
    this.emergency = []; for (let k = 0; k < 4; k++) { const v = makeCar(950 + k, { kind: ['ambulance', 'firetruck', 'police', 'ambulance'][k] }); v.position.set(hp.x + 20 + k * 7, 0, hp.z + 18.5); v.rotation.y = 0.1; this.after.add(v); this.emergency.push(v); }
    this.rescuers = []; for (let k = 0; k < 14; k++) { const p = new Person(1000 + k, { vest: true, helmet: k % 3 === 0 ? '#e8e8e8' : '#f2c200', headlamp: true }); p.userData.spot = [hp.x + (fr.next() - 0.5) * 14, hp.z + 4 + fr.next() * 8]; p.position.set(p.userData.spot[0], 1.5 + fr.next() * 2, p.userData.spot[1]); p.rotation.y = fr.next() * TAU; this.after.add(p); this.rescuers.push(p); }
    this.survivors = []; for (let k = 0; k < 18; k++) { const p = new Person(1100 + k, { pajama: true, barefoot: k % 3 !== 0, child: k % 6 === 5, coat: k % 4 === 0 ? '#5d4a3a' : null }); p.userData.spot = [hp.x + 8 + (fr.next() - 0.5) * 18, hp.z + 10 + fr.next() * 8]; p.position.set(p.userData.spot[0], 0, p.userData.spot[1]); p.rotation.y = fr.next() * TAU; this.after.add(p); this.survivors.push(p); }
    // burning barrels / fires & smoke columns in the ruins
    this.fires = new THREE.Group(); this.after.add(this.fires);
    for (let k = 0; k < 5; k++) {
      const x = hp.x + 4 + k * 9 * (k % 2 ? 1 : -1), z = hp.z + 20 + (k % 3);
      const barrel = cyl(0.3, 0.3, 0.9, mat('#3a3f45', { metal: 0.6, rough: 0.5 }), x, 0.45, z, 12); this.fires.add(barrel);
      const f = fireStream({ origin: [x, 0.95, z], radius: 0.25, height: 1.3, count: 60, seed: 50 + k, scale: 0.9 }); this.fires.add(f);
      const L = new THREE.PointLight(0xff8a3a, 0, 14, 2); L.position.set(x, 1.5, z); this.fires.add(L); f.userData.light = L;
    }
    // big fires burning on collapsed blocks (night shots read by firelight)
    this.bigFires = new THREE.Group(); this.after.add(this.bigFires);
    const fireRubbles = this.rubbles.filter((rb) => rb.userData.building !== this.hero && rb.position.distanceTo(hp) > 25).sort((a, b) => a.position.length() - b.position.length());
    const ffr = new RNG(4417);
    fireRubbles.filter((_, k) => k % 2 === 0).slice(0, 7).forEach((rb, k) => {
      const x = rb.position.x + (ffr.next() - 0.5) * 6, z = rb.position.z + (ffr.next() - 0.5) * 6; const sc = 0.8 + ffr.next() * 0.6; const y0 = 1.2 + rb.userData.building.floors * 0.22;
      const f = fireStream({ origin: [x, y0, z], radius: 1.8 * sc, height: 5.5 * sc, count: 110, seed: 140 + k, scale: 4.2 * sc }); this.bigFires.add(f);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(1.6, 0.62, 0.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 })); glow.position.set(x, y0 + 3 * sc, z); glow.scale.setScalar(26 * sc); this.bigFires.add(glow);
      const sm = smokeStream({ origin: [x, y0 + 5 * sc, z], count: 50, seed: 160 + k, height: 45, size: [5, 24], life: 14, color: [0.07, 0.065, 0.06], opacity: 0.7, wind: [1.5, 0, 0.4] }); this.bigFires.add(sm);
      if (k < 6) { const L = new THREE.PointLight(0xff7a30, 0, 110, 1.5); L.position.set(x, y0 + 4 * sc, z); L.userData.base = 420 * sc; this.bigFires.add(L); f.userData.light = L; }
    });
    this.smokeCols = new THREE.Group(); this.after.add(this.smokeCols);
    for (let k = 0; k < 7; k++) { const a = fr.next() * TAU, rad = 40 + fr.next() * 140; const sm = smokeStream({ origin: [Math.cos(a) * rad, 2, Math.sin(a) * rad], count: 60, seed: 90 + k, height: 50, size: [6, 28], life: 16, color: [0.22, 0.21, 0.2], opacity: 0.6, wind: [1.5, 0, 0.4] }); this.smokeCols.add(sm); }
    // haze puffs that hang over the ruins (dust in the air)
    this.haze = dustBurst({ count: 220, center: [0, 0, 0], radius: 180, height: 30, speed: 0.3, spread: 0, life: [100000, 100001], size: [30, 60], color: [0.7, 0.68, 0.63], seed: 4, opacity: 0.35, rise: 0 });
    this.haze.material.uniforms.uFadeIn.value = 0; this.haze.material.uniforms.uFadeOut.value = 0; s.add(this.haze); this.haze.visible = false;

    // three-years-later: gravel lots, rubble hills, container city
    this.later = new THREE.Group(); s.add(this.later); this.later.visible = false;
    for (const b of this.buildings) if (b.fate !== 'intact') { const lot = new THREE.Mesh(new THREE.BoxGeometry(b.w + 3, 0.12, b.d + 3), this.gravelMat); lot.position.set(b.position.x, 0.2, b.position.z); lot.receiveShadow = true; this.later.add(lot); }
    for (let k = 0; k < 5; k++) { const hill = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 12, 0, TAU, 0, Math.PI / 2), mat('#9a9184', { rough: 1, flat: true })); const a = -0.6 + k * 0.35; hill.position.set(Math.cos(a) * 330, -2, Math.sin(a) * 330 - 60); hill.scale.set(1.6, 0.45 + (k % 2) * 0.2, 1); this.later.add(hill); }
    // container houses (white metal units in rows)
    const contM = mat('#eef0f0', { rough: 0.5, metal: 0.2 }); const contGeo = new THREE.BoxGeometry(6, 2.6, 2.4);
    const cont = new THREE.InstancedMesh(contGeo, contM, 220); let ci = 0;
    for (let a = 0; a < 11; a++) for (let b = 0; b < 20; b++) { fm.position.set(-3.5 * P + a * 7.5 - 30, 1.3 + 0.18, 3 * P - 40 + b * 3.6); fm.scale.set(1, 1, 1); fm.rotation.set(0, 0, 0); fm.updateMatrix(); cont.setMatrixAt(ci++, fm.matrix); }
    cont.castShadow = true; cont.receiveShadow = true; this.later.add(cont);
    const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(6.2, 0.15, 2.6), mat('#5f7f9a', { rough: 0.5 }), 220); for (let k = 0; k < ci; k++) { cont.getMatrixAt(k, fm.matrix); fm.matrix.decompose(fm.position, fm.quaternion, fm.scale); fm.position.y += 1.38; fm.updateMatrix(); roofs.setMatrixAt(k, fm.matrix); } this.later.add(roofs);
    this.laterPeople = []; for (let k = 0; k < 10; k++) { const p = new Person(1400 + k, { coat: '#4a4a52' }); p.position.set(-3.5 * P - 30 + (k % 5) * 7.5 + 3.7, 0.18, 3 * P - 40 + Math.floor(k / 5) * 20 + 5); this.later.add(p); this.laterPeople.push(p); }

    // ---------- weather ----------
    this.snow = new Precip({ count: 9000, box: [90, 50, 90], fall: 1.6, wind: [1.2, 0, 0.4], size: 0.11, sway: 0.7, color: [1, 1, 1], opacity: 0.95 }); s.add(this.snow);
    this.rain = new Precip({ count: 7000, box: [70, 40, 70], fall: 14, wind: [1.5, 0, 0.5], size: 0.02, streak: 0.06, sway: 0, color: [0.75, 0.8, 0.9], opacity: 0.5, seed: 8 }); s.add(this.rain);
    // roof snow caps for winter
    this.roofSnow = [];
    for (const b of this.buildings) { const sc = box(b.w - 0.3, 0.25, b.d - 0.3, this.snowMat, 0, 0.2, 0); b.roof.add(sc); sc.visible = false; this.roofSnow.push(sc); }
    // birds over the city
    this.birds = []; for (let k = 0; k < 40; k++) { const bd = makeBird('#1a1a1a'); s.add(bd); this.birds.push(bd); bd.visible = false; }
    this.dogs = []; for (let k = 0; k < 6; k++) { const d = makeDog(['#8a6a4a', '#5a4a3a', '#c9b89a', '#3a3030'][k % 4]); d.position.set(-P + 2 + k * 2.2, 0.25, P - 6 + (k % 2) * 3); d.rotation.y = -0.4 + k * 0.4; s.add(d); this.dogs.push(d); d.visible = false; }
    // wet ground for liquefaction (shiny mud plane under a block)
    this.mud = new THREE.Mesh(new THREE.CircleGeometry(26, 48), new THREE.MeshStandardMaterial({ color: 0x3b3328, roughness: 0.15, metalness: 0.1 })); this.mud.rotation.x = -Math.PI / 2; this.mud.position.set(-P, 0.2, -2 * P + 0); this.mud.visible = false; s.add(this.mud);
    // ---------- extra quake / aftermath props ----------
    const hpos = this.hero.position;
    // rippling pavement patch (shown only while the ground waves)
    this.rippleU = { uT: { value: 0 }, uAmp: { value: 0 }, uC: { value: new THREE.Vector2(hpos.x + 30, hpos.z + 40) } };
    const rippleMat = this.asphMat.clone(); rippleMat.map = this.asphMat.map;
    rippleMat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, this.rippleU); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT, uAmp; uniform vec2 uC;').replace('#include <begin_vertex>', `#include <begin_vertex>
      vec2 wp = (modelMatrix * vec4(transformed, 1.0)).xz; float d = length(wp - uC);
      float w = sin(d * 0.35 - uT * 7.0) * 0.55 + sin(wp.x * 0.21 + uT * 5.3) * 0.25 + sin(wp.y * 0.17 - uT * 6.1) * 0.2;
      transformed.z += w * uAmp * smoothstep(80.0, 20.0, d);`); };
    this.ripple = new THREE.Mesh(new THREE.PlaneGeometry(160, 160, 220, 220), rippleMat); this.ripple.rotation.x = -Math.PI / 2; this.ripple.position.set(hpos.x + 30, 0.03, hpos.z + 40); this.ripple.receiveShadow = true; this.ripple.visible = false; s.add(this.ripple);
    // hero building: exposed ground-floor columns (some removed for the supermarket)
    this.heroCols = [];
    const colM = mat('#c9c3b8', { rough: 0.9 });
    for (let k = 0; k < 6; k++) { const c = box(0.55, FLOOR_H - 0.2, 0.55, colM, -this.hero.w / 2 + 1.2 + k * (this.hero.w - 2.4) / 5, FLOOR_H / 2, this.hero.d / 2 + 0.45); c.castShadow = true; this.hero.floorGroups[0].add(c); c.position.y = 0; this.heroCols.push(c); }
    this.colGhostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.25, 0.15), wireframe: true, transparent: true, opacity: 0 });
    this.heroColGhosts = this.heroCols.map((c) => { const g = new THREE.Mesh(c.geometry, this.colGhostMat); g.position.copy(c.position); g.scale.setScalar(1.04); this.hero.floorGroups[0].add(g); return g; });
    // warning siren pole (silent)
    this.siren = new THREE.Group(); this.siren.position.set(hpos.x + 15, 0.18, hpos.z + 8.6); s.add(this.siren);
    this.siren.add(cyl(0.12, 0.16, 9, mat('#5a6068', { metal: 0.6, rough: 0.4 }), 0, 4.5, 0, 10));
    for (let k = 0; k < 3; k++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.45, 0.9, 12, 1, true), mat('#d9dde2', { metal: 0.5, rough: 0.3, side: THREE.DoubleSide })); h.rotation.z = Math.PI / 2; h.rotation.y = k * TAU / 3; h.position.set(Math.cos(k * TAU / 3) * 0.5, 8.6, -Math.sin(k * TAU / 3) * 0.5); this.siren.add(h); }
    shadowAll(this.siren);
    // collapsed overpass on the outskirts
    this.overpass = new THREE.Group(); this.overpass.position.set(-2.5 * P, 0, 3.5 * P); this.after.add(this.overpass);
    const cm2 = mat('#a9a49a', { rough: 0.95 });
    for (const x of [-30, 0, 30]) { this.overpass.add(box(2.2, 9, 3, cm2, x, 4.5, 0)); this.overpass.add(box(4, 1, 12, cm2, x, 9.3, 0)); }
    const d1 = box(30, 1.4, 12, cm2, -15, 10.4, 0); this.overpass.add(d1);
    const d2 = box(31, 1.4, 12, cm2, 15, 5.2, 0); d2.rotation.z = -0.35; this.overpass.add(d2);
    this.overpass.add(box(30, 0.8, 0.4, mat('#d0cbc0'), -15, 11.4, 5.8)); shadowAll(this.overpass);
    // helicopter
    this.heli = makeHelicopter('#c62828'); this.heli.visible = false; s.add(this.heli);
    // substation explosion FX
    this.boom = new THREE.Group(); s.add(this.boom); this.boom.visible = false;
    this.boomGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(3, 4, 6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); this.boom.add(this.boomGlow);
    this.boomFire = dustBurst({ count: 90, center: [0, 2, 0], radius: 2, height: 3, speed: 10, spread: 0.3, life: [1.5, 3.5], size: [2, 10], color: [3.5, 1.4, 0.4], seed: 61, opacity: 1 }); this.boomFire.material.blending = THREE.AdditiveBlending; this.boomFire.material.uniforms.uHot.value.setRGB(6, 5, 4); this.boomFire.material.uniforms.uHotFade.value = 0.3; this.boom.add(this.boomFire);
    this.boomSmoke = dustBurst({ count: 70, center: [0, 3, 0], radius: 3, height: 4, speed: 4, spread: 1.5, life: [5, 9], size: [4, 16], color: [0.08, 0.08, 0.09], seed: 62, opacity: 0.9 }); this.boom.add(this.boomSmoke);
    this.boomSparks = sparkBurst({ count: 220, center: [0, 3, 0], speed: 22, seed: 63, color: [0.7, 0.85, 1.0], spread: 0.6, floorY: 0 }); this.boom.add(this.boomSparks);
    this.boomLight = new THREE.PointLight(0x9fc8ff, 0, 400, 1.2); this.boom.add(this.boomLight);
    // gas leak jet & pole sparks
    this.gas = loopStream({ count: 70, origin: [hpos.x + 9, 0.6, hpos.z + 12], jitter: 0.15, vel: [2.6, 1.4, 0.6], velJitter: 0.5, life: 1.6, size: [0.15, 2.2], color: [0.9, 0.92, 0.95], seed: 71, opacity: 0.55, drag: 0.9 }); this.gas.visible = false; s.add(this.gas);
    this.poleSparks = sparkBurst({ count: 90, center: [hpos.x + 20, 6, hpos.z + 18], speed: 6, seed: 72, color: [0.8, 0.9, 1], spread: 1.2, floorY: 0 }); this.poleSparks.visible = false; s.add(this.poleSparks);
    // phone lights glimmering inside rubble
    this.rubbleLights = new Sprites(30, (i, rr) => { const b = this.rubbles[i % this.rubbles.length]; const p0 = b ? b.position : new THREE.Vector3(); return { pos: [p0.x + (rr.next() - 0.5) * 8, 0.6 + rr.next() * 2.2, p0.z + (rr.next() - 0.5) * 8], vel: [0, 0, 0], birth: -1e5, life: 1e9, size0: 0.6, color: [0.8, 0.95, 1.6], alpha: 0.9 }; }, { map: glowTexture(), additive: true, fadeIn: 0, fadeOut: 0 });
    this.rubbleLights.visible = false; s.add(this.rubbleLights);
    // a parked car with blinking hazard lights (car alarm)
    this.alarmCar = this.parked[3];
    // volumetric flashlight beams (paired with the spot lights)
    this.beams = this.spots.map(() => { const m = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 32, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { a: { value: 0 }, color: { value: new THREE.Color(1, 0.95, 0.85) } },
      vertexShader: 'varying float vY; varying float vD; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); vD = -mv.z; gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform float a; uniform vec3 color; varying float vY; varying float vD; varying vec3 vN; varying vec3 vV; void main(){ float along = clamp(0.5 - vY, 0.0, 1.0); float edge = pow(abs(dot(vN, vV)), 1.5); float near = smoothstep(0.6, 3.5, vD) * smoothstep(0.0, 0.1, along); gl_FragColor = vec4(color * a * (1.0 - along) * (1.0-along) * edge * near * 0.16, 1.0); }' })); m.visible = false; m.frustumCulled = false; s.add(m); return m; });
    // shot-controlled characters for close-ups
    this.featured = { day: [], pj: [], resc: [] };
    for (let k = 0; k < 6; k++) { const p = new Person(2000 + k, { coat: k % 2 ? '#6b4a3a' : null }); p.visible = false; s.add(p); this.featured.day.push(p); }
    for (let k = 0; k < 6; k++) { const p = new Person(2100 + k, { pajama: true, barefoot: true, child: k === 4 }); p.visible = false; s.add(p); this.featured.pj.push(p); }
    for (let k = 0; k < 6; k++) { const p = new Person(2200 + k, { vest: true, helmet: k % 2 ? '#f2c200' : '#e8e8e8', headlamp: true }); p.visible = false; s.add(p); this.featured.resc.push(p); }
    this.applyTod('golden');
  }

  buildMountains() {
    const geo = new THREE.PlaneGeometry(5200, 5200, 220, 220); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position; const cs = new Float32Array(p.count * 3), cw = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i); const d = Math.hypot(x, z);
      const north = clamp((-z + 300) / 1500); // ridge to the north (-z)
      const ridge = smooth((d - 700) / 900);
      const n = ridged2(x / 900, z / 900, 6); const n2 = fbm2(x / 140 + 7, z / 140, 4) * 0.5 + 0.5;
      let h = ridge * (200 + north * 1000) * (0.15 + n * 1.15) + ridge * n2 * 45;
      h = Math.max(h, 0) - (d < 700 ? 3 : 0);
      p.setY(i, h);
      const hk = clamp(h / 900); const sn = smooth((h - 520 - n2 * 120) / 160);
      const base = [lerp(0.42, 0.52, n2), lerp(0.40, 0.44, n2), lerp(0.30, 0.33, n2)];
      const green = [0.32, 0.38, 0.22];
      const c = [lerp(green[0], base[0], hk + 0.2), lerp(green[1], base[1], hk + 0.2), lerp(green[2], base[2], hk + 0.2)];
      cs.set([lerp(c[0], 0.95, sn), lerp(c[1], 0.96, sn), lerp(c[2], 0.98, sn)], i * 3);
      const snw = smooth((h - 120 - n2 * 80) / 120);
      cw.set([lerp(c[0] * 0.8, 0.92, snw), lerp(c[1] * 0.8, 0.94, snw), lerp(c[2] * 0.8, 0.97, snw)], i * 3);
    }
    geo.computeVertexNormals();
    this.mtColorsSummer = new THREE.BufferAttribute(cs, 3); this.mtColorsWinter = new THREE.BufferAttribute(cw, 3);
    geo.setAttribute('color', this.mtColorsSummer);
    this.mountains = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
    this.mountains.position.y = -0.5; this.mountains.receiveShadow = false; this.scene.add(this.mountains);
  }

  applyTod(name) {
    const c = TOD[name]; this.tod = name;
    this.sky.setPreset(c.sky);
    const sd = new THREE.Vector3(...c.sun).normalize(); this.sunDir = sd; this.sky.setSun(sd);
    this.sun.color.set(c.sunColor); this.sun.intensity = c.sunI;
    this.hemi.color.set(c.hemiSky); this.hemi.groundColor.set(c.hemiGround); this.hemi.intensity = c.hemiI;
    this.scene.fog.color.set(c.fog); this.scene.fog.density = c.fogD;
    this.scene.environment = this.envs[name]; this.scene.environmentIntensity = c.env;
    this.exposure = c.exposure;
  }

  // flashlight i: from pos toward target (arrays), intensity k (0..1)
  flashlight(i, pos, target, k = 1, len = 22) {
    const L = this.spots[i]; const b = this.beams[i]; if (!L) return;
    L.position.set(...pos); L.target.position.set(...target); L.intensity = 150 * k; L.angle = 0.28; L.penumbra = 0.6; L.distance = 60; L.decay = 1.6; L.castShadow = false;
    const P = new THREE.Vector3(...pos), Tg = new THREE.Vector3(...target); const dir = Tg.clone().sub(P).normalize();
    b.visible = k > 0; b.scale.set(len * 0.29, len, len * 0.29); b.position.copy(P).addScaledVector(dir, len / 2); b.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir); b.material.uniforms.a.value = k;
  }
  // top of the rubble / collapsed slabs at (x,z), 0 on open ground; used to stand people on the piles
  surfaceAt(x, z) {
    const key = x.toFixed(2) + ',' + z.toFixed(2); if (!this._surf) this._surf = new Map(); if (this._surf.has(key)) return this._surf.get(key);
    if (!this._rc) { this._rc = new THREE.Raycaster(); this._rc.far = 120; }
    this.hero.setState('pancake', 999, {}); this.scene.updateMatrixWorld(true); // aftermath geometry (deterministic, cached)
    const targets = this.rubbles.concat([this.hero]); let best = 0;
    for (const [dx, dz] of [[0, 0], [0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35]]) {
      this._rc.set(new THREE.Vector3(x + dx, 80, z + dz), new THREE.Vector3(0, -1, 0));
      const h = this._rc.intersectObjects(targets, true).find((q) => q.object.visible !== false);
      if (h) best = Math.max(best, h.point.y);
    }
    this._surf.set(key, best); return best;
  }
  setShadowFocus(x, z, radius = 60) {
    const L = this.sun; L.target.position.set(x, 0, z); L.position.set(x + this.sunDir.x * 300, this.sunDir.y * 300, z + this.sunDir.z * 300);
    const cam = L.shadow.camera; cam.left = -radius; cam.right = radius; cam.top = radius; cam.bottom = -radius; cam.near = 10; cam.far = 700; cam.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------
  // o: { tod, windows, lamps, snow, snowCover, rain, traffic, people, quake: {t0, amp}, destroyed, later, focus:[x,z,r], haze, birds, dogs, camera }
  update(t, o = {}) {
    const tod = o.tod || 'golden'; if (tod !== this.tod) this.applyTod(tod);
    this.sky.setTime(t);
    const f = o.focus || [0, 0, 70]; this.setShadowFocus(f[0], f[1], f[2]);
    const winter = (o.snowCover || 0) > 0.5;
    // windows & lamps
    setCityWindowLight(o.windows !== undefined ? o.windows : 0);
    const lampK = o.lamps || 0;
    for (const L of this.lamps) L.userData.bulbMat.color.setRGB(1.0, 0.72, 0.38).multiplyScalar(lampK * 4 + 0.15);
    // trees summer/winter
    for (const T of this.trees) { T.summer.visible = !winter; T.winter.visible = winter; }
    this.mountains.geometry.setAttribute('color', winter ? this.mtColorsWinter : this.mtColorsSummer);
    this.roofSnow.forEach((sc) => (sc.visible = winter));
    this.asphMat.color.setScalar(o.wet ? 0.55 : winter ? 0.8 : 1); this.asphMat.roughness = o.wet ? 0.25 : 0.92;
    this.paveMat.color.set(winter ? 0xe9eef4 : 0xffffff); this.paveMat.map = winter ? this.snowMat.map : this.paveMap;
    for (const b of this.blocks) if (b.grass) b.grass.material = winter ? this.snowMat : this.grassMat;
    // precipitation follows the camera
    const cp = o.camera ? o.camera.position : new THREE.Vector3();
    this.snow.opacity = o.snow || 0; this.snow.update(t, cp);
    this.rain.opacity = (o.rain || 0) * 0.55; this.rain.update(t, cp);
    // traffic
    const traffic = o.traffic !== undefined ? o.traffic : 1;
    for (const car of this.cars) {
      const d = car.userData.drive; car.visible = traffic > 0;
      if (!car.visible) continue;
      let u = ((d.off + t * d.speed * traffic) % (2 * NB * P + 40) + (2 * NB * P + 40)) % (2 * NB * P + 40) - NB * P - 20;
      if (d.horizontal) { car.position.set(u, 0, d.c); car.rotation.y = d.speed > 0 ? 0 : Math.PI; }
      else { car.position.set(d.c, 0, u); car.rotation.y = d.speed > 0 ? -Math.PI / 2 : Math.PI / 2; }
      const lights = o.windows > 0.3 ? 1 : 0; car.userData.headMat.color.setRGB(1, 0.95, 0.85).multiplyScalar(0.6 + lights * 5); car.userData.tailMat.color.setRGB(0.9, 0.05, 0.03).multiplyScalar(0.5 + lights * 3);
    }
    // people
    const ppl = o.people || 'day';
    for (const p of this.walkers) {
      p.visible = ppl === 'day' || ppl === 'few'; if (!p.visible) continue;
      const w = p.userData.walk; if (ppl === 'few' && (p.seed % 4)) { p.visible = false; continue; }
      const span = 2 * NB * P; const u = ((w.off + t * w.speed * w.dir) % span + span) % span - NB * P;
      if (w.horiz) { p.position.set(u, 0.18, w.z); p.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2; } else { p.position.set(w.z, 0.18, u); p.rotation.y = w.dir > 0 ? 0 : Math.PI; }
      p.pose('walk', t);
    }
    for (const p of this.sitters) { p.visible = ppl === 'day'; if (p.visible) p.pose('tea', t); }
    for (const p of this.shoppers) { p.visible = ppl === 'day'; if (p.visible) p.pose(p.seed % 3 ? 'stand' : 'point', t); }
    this.bazaar.visible = true;
    // construction & cranes
    if (this.construction) this.construction.setProgress(o.construction !== undefined ? o.construction : 0.75);
    poseCrane(this.crane, t, 0.3);
    // quake: building states
    const destroyed = !!o.destroyed, later = !!o.later; const q = o.quake;
    for (const b of this.buildings) {
      if (later) { b.setState(b.fate === 'intact' ? 'intact' : 'gone'); continue; }
      if (destroyed) { const fm = b.fate === 'tip' ? 'tip' : b.fate === 'sink' ? 'sink' : b.fate === 'pancake' ? 'pancake' : b.fate === 'damaged' ? 'damaged' : 'intact'; b.setState(fm, 999, { dir: b.tipDir }); if (b.dust) b.dust.visible = false; continue; }
      if (q) {
        const tau = t - q.t0; const amp = q.amp ? q.amp(t) : 0;
        const ct = (q.delays && q.delays.get(b)) !== undefined ? q.delays.get(b) : b.delay;
        if (b.fate !== 'intact' && tau > ct && (q.collapse !== false)) {
          const mode = b.fate === 'damaged' ? 'pancake' : b.fate; b.setState(mode, tau - ct, { amp: amp * 0.3, t, dir: b.tipDir, partial: b.fate === 'damaged' ? 0.5 : 1 });
        } else b.setState('sway', 0, { amp, t });
      } else b.setState('intact');
    }
    this.construction.visible = !later; this.crane.visible = !later && !destroyed;
    this.after.visible = destroyed && !later; this.later.visible = later;
    for (const rb of this.rubbles) rb.visible = destroyed && !later;
    if (destroyed) {
      this.excavators.forEach((ex, k) => { ex.visible = !!o.excavators; poseExcavator(ex, t, k * 1.3); });
      this.rescueCrane.visible = !!o.excavators; if (o.excavators) poseCrane(this.rescueCrane, t, 1.0);
      this.emergency.forEach((v) => { v.visible = !!o.emergency; flashBeacons(v, t, 1); });
      this.ambulanceCrushed.visible = true; flashBeacons(this.ambulanceCrushed, t, o.crushedBeacon !== undefined ? o.crushedBeacon : 0.4);
      if (!this._rescSnapped) { this._rescSnapped = true; for (const p of this.rescuers) p.position.y = this.surfaceAt(p.userData.spot[0], p.userData.spot[1]); }
      for (const p of this.rescuers) { p.visible = !!o.rescuers; if (p.visible) p.pose(p.seed % 3 === 0 ? 'carry' : 'dig', t); }
      for (const p of this.survivors) { p.visible = !!o.survivors; if (p.visible) p.pose(p.seed % 4 === 0 ? 'cry' : p.seed % 4 === 1 ? 'phone' : 'shiver', t); }
      this.fires.visible = !!o.fires; this.fires.children.forEach((c) => { if (c.material && c.material.uniforms && c.material.uniforms.uTime) c.material.uniforms.uTime.value = t; if (c.userData.light) c.userData.light.intensity = o.fires ? 25 + Math.sin(t * 13 + c.id) * 6 : 0; });
      this.bigFires.visible = !!o.fires; if (o.fires) this.bigFires.children.forEach((c) => { if (c.material && c.material.uniforms && c.material.uniforms.uTime) c.material.uniforms.uTime.value = t; if (c.isPointLight) c.intensity = c.userData.base * (0.85 + 0.15 * Math.sin(t * 9 + c.id) * Math.sin(t * 5.3 + c.id * 2)); if (c.isSprite) c.material.opacity = 0.5 + 0.08 * Math.sin(t * 7 + c.id); });
      this.smokeCols.visible = !!o.smoke; this.smokeCols.children.forEach((c) => (c.material.uniforms.uTime.value = t));
    }
    this.haze.visible = (o.haze || 0) > 0; if (this.haze.visible) { this.haze.material.uniforms.uTime.value = 10 + t * 0.02; this.haze.opacity = Math.min(0.6, o.haze * 0.42); this.haze.material.uniforms.uColor.value.setRGB(...(o.hazeColor || [0.7, 0.68, 0.63])); }
    for (const p of this.laterPeople) p.pose('walk', t);
    // birds
    const birdsOn = o.birds; this.birds.forEach((b, k) => {
      b.visible = !!birdsOn; if (!b.visible) return;
      const bt = t - (birdsOn.t0 || 0); const a = k * 2.4 + bt * (0.6 + (k % 5) * 0.08); const rad = 6 + (k % 7) * 2.5 + bt * 1.5;
      const c = birdsOn.center || [0, 0, 0];
      b.position.set(c[0] + Math.cos(a) * rad + noise1(k + bt * 0.5) * 3, c[1] + 3 + Math.min(bt * 4, 12 + (k % 9) * 2) + Math.sin(bt * 2 + k) * 1.5, c[2] + Math.sin(a) * rad);
      b.rotation.y = -a; b.rotation.z = Math.sin(bt * 3 + k) * 0.4; flapBird(b, bt, k); b.scale.setScalar(1.6);
    });
    this.dogs.forEach((d, k) => { d.visible = !!o.dogs; if (d.visible) poseDog(d, t, 'howl', k * 1.7); });
    this.mud.visible = !!o.mud;
    // practical lights reset (shots set them after update)
    for (const L of this.points) L.intensity = 0; for (const L of this.spots) L.intensity = 0; if (this.beams) for (const b of this.beams) b.visible = false;
    // fog override (dust haze)
    const c = TOD[tod]; this.scene.fog.density = c.fogD * (o.fogMul || 1); if (o.fogColor) this.scene.fog.color.setRGB(...o.fogColor); else this.scene.fog.color.set(c.fog);
    this.mountains.visible = o.mountains !== false;
    // featured characters: o.feat = [{kind:'day'|'pj'|'resc', i, pos:[x,y,z], ry, pose, k}]
    for (const arr of Object.values(this.featured)) for (const p of arr) p.visible = false;
    if (o.feat) for (const f of o.feat) { const p = this.featured[f.kind || 'day'][f.i || 0]; if (!p) continue; p.visible = true; p.position.set(...f.pos); if (f.snap) p.position.y = this.surfaceAt(f.pos[0], f.pos[2]) + (f.pos[1] || 0); p.rotation.y = f.ry || 0; p.pose(f.pose || 'stand', t + (f.ph || 0), f.k || {}); if (f.walk) { p.position.x += Math.cos(f.ry - Math.PI / 2) * 0; const d = (t - (f.walk.t0 || 0)) * (f.walk.v || 1.3); p.position.x += Math.sin(f.ry || 0) * d; p.position.z += Math.cos(f.ry || 0) * d; } }
    // ripple
    this.ripple.visible = (o.ripple || 0) > 0; this.rippleU.uT.value = t; this.rippleU.uAmp.value = o.ripple || 0;
    // hero columns: o.cols = number removed (0..6), o.colGhost highlight
    const removed = o.colsRemoved || 0; this.heroCols.forEach((c, k) => { const rmK = clamp(removed - [2, 3, 1, 4, 0, 5][k]); c.visible = !(destroyed || later) && rmK < 1; c.scale.set(1, Math.max(0.001, 1 - rmK), 1); });
    this.colGhostMat.opacity = o.colGhost || 0; this.heroColGhosts.forEach((g, k) => (g.visible = (o.colGhost || 0) > 0 && !(destroyed || later) && removed > [2, 3, 1, 4, 0, 5][k]));
    this.siren.visible = !later;
    // helicopter pass
    this.heli.visible = !!o.heli; if (o.heli) { const h = o.heli; const u = (t - h.t0) * (h.speed || 14); this.heli.position.set(h.from[0] + h.dir[0] * u, h.from[1], h.from[2] + h.dir[1] * u); this.heli.rotation.y = Math.atan2(-h.dir[1], h.dir[0]); this.heli.rotation.z = -0.1; this.heli.userData.rotor.rotation.y = t * 40; this.heli.userData.tail.rotation.z = t * 60; }
    // explosion
    this.boom.visible = !!o.boom; if (o.boom) { const b = o.boom; const tau = t - b.t0; this.boom.position.set(...b.pos); this.boomFire.setTime(tau); this.boomSmoke.setTime(tau); this.boomSparks.setTime(tau);
      const fl = tau < 0 ? 0 : Math.exp(-tau * 2.5); this.boomGlow.scale.setScalar(10 + fl * 120 * (b.size || 1)); this.boomGlow.material.opacity = tau < 0 ? 0 : clamp(fl * 1.5 + 0.1); this.boomGlow.position.y = 3; this.boomLight.intensity = tau < 0 ? 0 : fl * 4e4 * (b.size || 1); this.boomLight.position.y = 4; }
    this.gas.visible = !!o.gas; this.gas.material.uniforms.uTime.value = t;
    this.poleSparks.visible = o.poleSparks !== undefined; if (this.poleSparks.visible) this.poleSparks.setTime(o.poleSparks);
    this.rubbleLights.visible = !!o.rubbleLights && destroyed; this.rubbleLights.opacity = 0.5 + 0.5 * Math.sin(t * 2);
    if (this.alarmCar) { const on = !!o.alarmCar && Math.floor(t * 2.5) % 2 === 0; this.alarmCar.userData.headMat.color.setRGB(1, 0.7, 0.2).multiplyScalar(on ? 6 : 0.6); this.alarmCar.userData.tailMat.color.setRGB(1, 0.45, 0.05).multiplyScalar(on ? 6 : 0.5); }
    // second (afternoon) collapse of a damaged building
    if (o.second && destroyed) { const b = o.second.b || this.secondBuilding; const tau = t - o.second.t0; if (b) { b.setState(tau > 0 ? 'pancake' : 'damaged', tau > 0 ? tau : 999, { amp: o.second.amp || 0, t }); } }
    return this;
  }
}
