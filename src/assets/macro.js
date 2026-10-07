// "Macro studio": dark tabletop with cinematic lighting for the narration's metaphors.
import * as THREE from 'three';
import { canvasTex, glowTexture, puffTexture, makeCanvas, concreteTexture } from '../engine/textures.js';
import { RNG, TAU, clamp, lerp, smooth, ease, fbm2, noise2, noise1 } from '../engine/util.js';
import { mat, box, cyl, sph, rbox, jitterGeo, shadowAll } from './kit.js';
import { Sprites, loopStream, dustBurst, sparkBurst } from '../engine/particles.js';

function woodTexture() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const img = g.createImageData(w, h); const d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = fbm2(x / 400, y / 40, 4); const ring = Math.sin((y / 18) + n * 6 + fbm2(x / 90, y / 300, 3) * 3) * 0.5 + 0.5;
      const k = 0.55 + ring * 0.25 + noise2(x / 3, y / 1.2) * 0.04; const i = (y * w + x) * 4;
      d[i] = 110 * k + 30; d[i + 1] = 70 * k + 18; d[i + 2] = 40 * k + 10; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: [2, 2] });
}

export class MacroSet {
  constructor() { this.scene = new THREE.Scene(); }
  build(director) {
    const s = this.scene; s.background = new THREE.Color(0x07080b);
    this.table = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.55, metalness: 0.0 }));
    this.table.rotation.x = -Math.PI / 2; this.table.receiveShadow = true; s.add(this.table);
    this.key = new THREE.SpotLight(0xffe2c0, 400, 40, 0.5, 0.6, 1.6); this.key.position.set(-5, 9, 4); this.key.castShadow = true; this.key.shadow.mapSize.set(2048, 2048); this.key.shadow.bias = -0.0003; s.add(this.key); s.add(this.key.target);
    this.rimL = new THREE.DirectionalLight(0x7fa6ff, 1.3); this.rimL.position.set(6, 4, -8); s.add(this.rimL);
    this.fill = new THREE.HemisphereLight(0x405070, 0x150d08, 0.45); s.add(this.fill);
    this.practical = new THREE.PointLight(0xff7a30, 0, 10, 2); s.add(this.practical);
    // bokeh lights in the background
    const r = new RNG(3);
    this.bokeh = new Sprites(40, (i, rr) => ({ pos: [(rr.next() - 0.5) * 40, 2 + rr.next() * 10, -14 - rr.next() * 12], vel: [0, 0, 0], birth: -1e5, life: 1e9, size0: 0.8 + rr.next() * 2.4, color: rr.chance(0.5) ? [1.4, 0.8, 0.4] : [0.4, 0.6, 1.3], alpha: 0.25 + rr.next() * 0.35 }), { map: glowTexture(), additive: true, fadeIn: 0, fadeOut: 0, seed: 5 });
    s.add(this.bokeh);
    this.props = {};
    this.props.egg = this.makeEgg(); this.props.seed = this.makeSeedHands(); this.props.nail = this.makeNail(); this.props.ruler = this.makeRuler();
    this.props.clock = this.makeClock(); this.props.concrete = this.makeConcrete(); this.props.stamp = this.makeStamp(); this.props.tea = this.makeTea();
    this.props.pot = this.makePot(); this.props.seismo = this.makeSeismo(); this.props.phone = this.makePhone(); this.props.thermo = this.makeThermo();
    for (const k in this.props) { this.props[k].visible = false; s.add(this.props[k]); }
  }
  // ---------- props ----------
  makeEgg() {
    const g = new THREE.Group();
    const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; const y = -Math.cos(t * Math.PI); const rr = Math.sin(t * Math.PI) * (1 - 0.18 * y); pts.push(new THREE.Vector2(rr * 1.0, y * 1.35)); }
    const geo = new THREE.LatheGeometry(pts, 64);
    const crack = makeCanvas(1024, 512); const cg = crack.getContext('2d'); cg.clearRect(0, 0, 1024, 512);
    // branching cracks with birth time stored in red channel
    const r = new RNG(19); const segs = [];
    const grow = (x, y, a, len, dep, b) => { if (dep > 5) return; let px = x, py = y; for (let i = 0; i < 8; i++) { a += (r.next() - 0.5) * 0.9; const nx = px + Math.cos(a) * len, ny = py + Math.sin(a) * len * 0.8; segs.push([px, py, nx, ny, b + i * 0.03 + dep * 0.06]); px = nx; py = ny; if (r.next() < 0.3) grow(px, py, a + r.sign() * 1.0, len * 0.8, dep + 1, b + i * 0.03); } };
    for (let k = 0; k < 9; k++) grow(512 + (r.next() - 0.5) * 60, 250 + (r.next() - 0.5) * 40, r.next() * TAU, 28, 0, 0);
    segs.sort((a, b) => b[4] - a[4]);
    for (const [x1, y1, x2, y2, b] of segs) { const v = Math.round(clamp(b) * 255); cg.strokeStyle = `rgb(${v},255,0)`; cg.lineWidth = 3.5; cg.beginPath(); cg.moveTo(x1, y1); cg.lineTo(x2, y2); cg.stroke(); }
    const crackTex = new THREE.CanvasTexture(crack);
    this.eggU = { crack: { value: 0 }, glow: { value: 0 }, crackMap: { value: crackTex } };
    const m = new THREE.MeshPhysicalMaterial({ color: 0xe9d6bc, roughness: 0.5, sheen: 0.3, clearcoat: 0.15 });
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, this.eggU); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float crack, glow; uniform sampler2D crackMap;').replace('#include <map_fragment>', `#include <map_fragment>
      vec4 cm = texture2D(crackMap, vUv); float on = step(cm.r, crack) * cm.g; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05,0.03,0.02), on);`).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec4 cm2 = texture2D(crackMap, vUv); float on2 = step(cm2.r, crack) * cm2.g; totalEmissiveRadiance += vec3(3.5,1.2,0.3) * on2 * glow; }`); };
    m.defines = { USE_UV: '' };
    const egg = new THREE.Mesh(geo, m); egg.position.y = 1.35; egg.castShadow = true; g.add(egg);
    const cup = cyl(0.75, 0.55, 0.8, mat('#c9c2b8', { rough: 0.3 }), 0, 0.4, 0, 32); g.add(cup); g.userData.egg = egg;
    return shadowAll(g);
  }
  makeSeedHands() {
    const g = new THREE.Group();
    const skin = new THREE.MeshPhysicalMaterial({ color: 0xe0a882, roughness: 0.48, sheen: 0.6, sheenColor: new THREE.Color(0xffb090), sheenRoughness: 0.5, clearcoat: 0.08 });
    const nailM = new THREE.MeshPhysicalMaterial({ color: 0xf6d6c8, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1 });
    // a finger = 3 tapered phalanges + nail, pointing along +x
    const mkFinger = (r) => {
      const f = new THREE.Group(); const lens = [2.4, 1.5, 1.15]; let parent = f; const joints = [];
      for (let i = 0; i < 3; i++) {
        const j = new THREE.Group(); j.position.x = i ? lens[i - 1] : 0; parent.add(j);
        const rr = r * (1 - i * 0.07); const c = new THREE.Mesh(new THREE.CapsuleGeometry(rr, lens[i], 10, 24), skin); c.rotation.z = -Math.PI / 2; c.position.x = lens[i] / 2; c.castShadow = true; c.receiveShadow = true; j.add(c);
        joints.push(j); parent = j;
      }
      const nail = new THREE.Mesh(new THREE.SphereGeometry(r * 0.82, 24, 12, 0, TAU, 0, Math.PI / 2.4), nailM); nail.scale.set(1.25, 0.42, 0.9); nail.position.set(lens[2] * 0.62, r * 0.72, 0); joints[2].add(nail);
      return { f, joints };
    };
    const thumb = mkFinger(0.62), index = mkFinger(0.52);
    thumb.f.position.set(-5.2, 1.25, 0.3); thumb.f.rotation.set(0, -0.08, 0.04);
    index.f.position.set(5.2, 1.4, -0.3); index.f.rotation.set(0, Math.PI + 0.08, -0.02);
    thumb.joints[1].rotation.z = 0.06; index.joints[1].rotation.z = -0.1; index.joints[2].rotation.z = -0.08;
    g.add(thumb.f, index.f);
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0x120a06, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08 }));
    seed.scale.set(1.55, 0.45, 1.0); seed.castShadow = true; g.add(seed);
    // watermelon slices around (colour!)
    const rind = mat('#2f7a35', { rough: 0.55 }), flesh = mat('#e8383d', { rough: 0.45 }), white = mat('#f1efd8', { rough: 0.6 });
    for (const [x, z, ry] of [[-3.5, -6, 0.4], [4.5, -7.5, -0.5], [0.5, -10, 0.1]]) {
      const sl = new THREE.Group(); sl.position.set(x, 0, z); sl.rotation.y = ry; g.add(sl);
      const r1 = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.9, 48, 1, false, 0, Math.PI), [rind, flesh, flesh]); r1.rotation.x = Math.PI / 2; r1.position.y = 0.0; r1.rotation.z = Math.PI; sl.add(r1);
      for (let k = 0; k < 9; k++) { const sd = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6), mat('#140c08', { rough: 0.2 })); const a = 0.3 + k * 0.28; sd.position.set(Math.cos(a) * 1.9, Math.sin(a) * 1.9 * 0 + 0.46, -Math.sin(a) * 1.9 * 0); sd.position.set(Math.cos(a) * (1.4 + (k % 2) * 0.6), 0.47, Math.sin(a) * 0); sl.add(sd); }
    }
    g.userData = { thumb, index, seed };
    return g;
  }
  makeNail() {
    const g = new THREE.Group(); const skin = new THREE.MeshPhysicalMaterial({ color: 0xd9a27c, roughness: 0.55, sheen: 0.5 });
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 6, 8, 24), skin); finger.rotation.z = Math.PI / 2; finger.position.set(-2, 0.9, 0); finger.castShadow = true; g.add(finger);
    const nail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.25), new THREE.MeshPhysicalMaterial({ color: 0xf1d2c4, roughness: 0.2, clearcoat: 1 })); nail.position.set(0.9, 1.78, 0); g.add(nail);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1, 0.11, 1.2), new THREE.MeshPhysicalMaterial({ color: 0xfaf3ea, roughness: 0.3, clearcoat: 0.8 })); tip.position.set(1.65, 1.78, 0); g.add(tip);
    const rulerTex = canvasTex(1024, 128, (c, w, h) => { c.fillStyle = '#e9d9a8'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2017'; c.font = 'bold 22px Inter, Arial';
      for (let i = 0; i <= 100; i++) { const x = 20 + i * 9.8; const L = i % 10 === 0 ? 48 : i % 5 === 0 ? 34 : 20; c.fillRect(x, 0, 2, L); if (i % 10 === 0) c.fillText(String(i / 10), x + 4, 74); } c.fillText('cm', 960, 110); });
    const ruler = new THREE.Mesh(new THREE.BoxGeometry(10, 0.15, 1.4), [mat('#d9c38a'), mat('#d9c38a'), new THREE.MeshStandardMaterial({ map: rulerTex, roughness: 0.6 }), mat('#d9c38a'), mat('#d9c38a'), mat('#d9c38a')]);
    ruler.position.set(2, 0.08, 1.7); ruler.receiveShadow = true; g.add(ruler);
    g.userData = { tip, nail };
    return shadowAll(g);
  }
  makeRuler() {
    const g = new THREE.Group();
    const tex = canvasTex(2048, 128, (c, w, h) => { c.fillStyle = '#c99b5a'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { c.fillStyle = `rgba(90,50,20,${0.08 + 0.08 * Math.sin(y * 0.7)})`; c.fillRect(0, y, w, 1); }
      c.fillStyle = '#2a1a0c'; c.font = 'bold 26px Inter, Arial'; for (let i = 0; i <= 300; i++) { const x = 20 + i * 6.7; const L = i % 10 === 0 ? 50 : i % 5 === 0 ? 34 : 18; c.fillRect(x, 0, 2, L); if (i % 10 === 0) c.fillText(String(i / 10), x + 3, 80); } });
    const geo = new THREE.BoxGeometry(12, 0.12, 1.2, 160, 1, 1);
    this.rulerU = { bend: { value: 0 }, snap: { value: -1 }, crackGlow: { value: 0 } };
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, this.rulerU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float bend, snap; varying float vX;').replace('#include <begin_vertex>', `#include <begin_vertex>
        vX = transformed.x;
        float x = transformed.x / 6.0; // -1..1
        float y = bend * (1.0 - x*x) * 1.6;
        if(snap >= 0.0){ float side = sign(x); float rec = exp(-snap*3.0) * cos(snap*20.0); y = bend * (1.0 - x*x) * 1.6 * max(rec, 0.0) * 0.8; transformed.x += side * snap * 0.4; transformed.y -= snap * snap * 1.5 * abs(x); }
        transformed.y += y;
        `);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float crackGlow; varying float vX;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(3.0,1.4,0.4) * crackGlow * exp(-abs(vX)*6.0);'); };
    const ruler = new THREE.Mesh(geo, m); ruler.castShadow = true; ruler.position.y = 1.2; g.add(ruler);
    // two blocks holding the ends
    g.add(rbox(1.6, 1.4, 2, 0.2, mat('#3a3a40', { metal: 0.5, rough: 0.4 }), -6.3, 0.7, 0)); g.add(rbox(1.6, 1.4, 2, 0.2, mat('#3a3a40', { metal: 0.5, rough: 0.4 }), 6.3, 0.7, 0));
    this.rulerSplinters = sparkBurst({ count: 70, center: [0, 1.6, 0], speed: 4, seed: 4, color: [1, 0.75, 0.4], life: [0.4, 1.0], size: 0.05 }); g.add(this.rulerSplinters);
    g.userData = { ruler };
    return g;
  }
  makeClock() {
    const g = new THREE.Group();
    this.clockCanvas = makeCanvas(512, 256); this.clockTex = new THREE.CanvasTexture(this.clockCanvas); this.clockTex.colorSpace = THREE.SRGBColorSpace;
    const body = rbox(5, 2.6, 2, 0.4, mat('#17181c', { rough: 0.35 }), 0, 1.3, 0); g.add(body);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 1.9), new THREE.MeshBasicMaterial({ map: this.clockTex, color: new THREE.Color(2.2, 2.2, 2.2) })); face.position.set(0, 1.35, 1.01); g.add(face);
    // nightstand bits: glass of water + phone silhouette
    const glass = cyl(0.45, 0.4, 1.6, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0.05, thickness: 0.4, transparent: true, opacity: 0.5 }), 3.8, 0.8, 0.6, 24); g.add(glass);
    g.add(rbox(1.6, 0.12, 3, 0.1, mat('#0d0d10', { rough: 0.2 }), -4, 0.06, 1));
    return shadowAll(g);
  }
  drawClock(text, colon) {
    const g = this.clockCanvas.getContext('2d'); g.fillStyle = '#050505'; g.fillRect(0, 0, 512, 256);
    g.font = '700 170px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,40,30,0.08)'; g.fillText('88:88', 256, 135);
    g.shadowColor = '#ff2a1a'; g.shadowBlur = 24; g.fillStyle = '#ff3b2a'; g.fillText(colon ? text : text.replace(':', ' '), 256, 135); g.shadowBlur = 0;
    g.font = '600 26px Inter, Arial'; g.fillStyle = '#ff3b2a'; g.fillText('AM', 470, 60);
    this.clockTex.needsUpdate = true;
  }
  makeConcrete() {
    const g = new THREE.Group(); const r = new RNG(8);
    const ct = concreteTexture(21, [178, 172, 160]);
    const chunk = new THREE.Mesh(jitterGeo(new THREE.BoxGeometry(4, 2.6, 3, 6, 4, 5), 0.5, 3), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.95, flatShading: true }));
    chunk.position.y = 1.3; chunk.castShadow = true; g.add(chunk);
    // sea shells & sand grains embedded / spilling
    const shellM = mat('#efe2cf', { rough: 0.5 });
    this.grains = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), mat('#cdb48a', { rough: 0.9, flat: true }), 900);
    this.grainData = []; const dm = new THREE.Object3D();
    for (let i = 0; i < 900; i++) { const a = r.next() * TAU, d = Math.sqrt(r.next()) * 2.2; this.grainData.push({ x0: (r.next() - 0.5) * 3.6, y0: 0.4 + r.next() * 2.2, z0: (r.next() - 0.5) * 2.6, x1: Math.cos(a) * (2 + d), z1: Math.sin(a) * (1.6 + d), d: r.next() }); }
    g.add(this.grains);
    for (let i = 0; i < 12; i++) { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 6, 0, TAU, 0, Math.PI / 2), shellM); sh.scale.set(1, 0.4, 1.2); sh.position.set((r.next() - 0.5) * 6, 0.05, 2 + r.next() * 1.5); sh.rotation.y = r.next() * 3; g.add(sh); }
    // rebar sticking out (rusty)
    const rb = mat('#6b3f26', { metal: 0.6, rough: 0.6 }); for (let i = 0; i < 3; i++) { const b = cyl(0.06, 0.06, 4, rb, -1 + i, 1.6, 0, 6); b.rotation.z = Math.PI / 2 + (i - 1) * 0.1; g.add(b); }
    this.drips = loopStream({ count: 40, origin: [0.2, 2.5, 1.3], jitter: 0.6, vel: [0, -0.2, 0], velJitter: 0.05, life: 1.4, size: [0.06, 0.05], color: [0.8, 0.9, 1.2], seed: 31, opacity: 0.9, gravity: [0, -6, 0], drag: 0, stretch: 0.02, fadeIn: 0.05, fadeOut: 0.2, additive: true }); g.add(this.drips);
    this.concreteDust = dustBurst({ count: 80, center: [0, 1.2, 0], radius: 2, height: 2, speed: 1.5, spread: 3, life: [3, 6], size: [0.6, 2.5], color: [0.8, 0.75, 0.68], seed: 9, opacity: 0.6 }); g.add(this.concreteDust);
    g.userData = { chunk };
    return shadowAll(g);
  }
  makeStamp() {
    const g = new THREE.Group();
    const paperTex = canvasTex(768, 1024, (c, w, h) => { c.fillStyle = '#f4efe3'; c.fillRect(0, 0, w, h); c.fillStyle = '#20242a'; c.font = '700 40px "Playfair Display", Georgia'; c.fillText('BUILDING REGISTRATION', 60, 110);
      c.font = '500 22px Inter, Arial'; c.fillStyle = '#555'; c.fillText('Construction amnesty  •  Zoning peace  •  2018', 60, 150);
      c.fillStyle = '#9aa0a6'; for (let y = 210; y < 900; y += 34) c.fillRect(60, y, 520 + ((y * 7) % 120), 10);
      c.strokeStyle = '#333'; c.lineWidth = 2; c.strokeRect(60, 880, 260, 90); c.font = '500 18px Inter'; c.fillStyle = '#333'; c.fillText('Fee paid:', 72, 905); c.font = '700 30px JetBrains Mono, monospace'; c.fillText('₺ ✓', 72, 950); });
    this.stampMarkCanvas = makeCanvas(512, 256); const sm = this.stampMarkCanvas.getContext('2d'); sm.clearRect(0, 0, 512, 256); sm.strokeStyle = '#c4161c'; sm.lineWidth = 12; sm.strokeRect(14, 14, 484, 228); sm.fillStyle = '#c4161c'; sm.font = '900 104px Inter, Arial'; sm.textAlign = 'center'; sm.textBaseline = 'middle'; sm.fillText('APPROVED', 256, 132);
    const markTex = new THREE.CanvasTexture(this.stampMarkCanvas); markTex.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5.6), new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.9 })); p.rotation.x = -Math.PI / 2; p.rotation.z = (i - 1.5) * 0.12; p.position.set((i - 1.5) * 0.4, 0.02 + i * 0.012, (i - 1.5) * 0.3); p.receiveShadow = true; g.add(p); }
    this.stampMark = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshStandardMaterial({ map: markTex, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 })); this.stampMark.rotation.x = -Math.PI / 2; this.stampMark.rotation.z = 0.12; this.stampMark.position.set(0.3, 0.09, 0.4); g.add(this.stampMark);
    const stamp = new THREE.Group(); g.add(stamp);
    stamp.add(cyl(0.9, 0.9, 0.5, mat('#3a2418', { rough: 0.4 }), 0, 0.25, 0, 24)); stamp.add(cyl(0.3, 0.35, 1.6, mat('#5a3a24', { rough: 0.3 }), 0, 1.3, 0, 16)); stamp.add(sph(0.55, mat('#7a2a1c', { rough: 0.3 }), 0, 2.3, 0));
    stamp.add(box(1.8, 0.1, 1.0, mat('#c4161c'), 0, 0.02, 0));
    // coins
    for (let i = 0; i < 6; i++) { const c = cyl(0.4, 0.4, 0.08, mat('#c9a646', { metal: 0.9, rough: 0.25 }), 3 + (i % 3) * 0.2, 0.05 + i * 0.08, 1.5 - (i % 2) * 0.1, 24); g.add(c); }
    g.userData = { stamp };
    return shadowAll(g);
  }
  makeTea() {
    const g = new THREE.Group();
    const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; const y = t * 2.4; const rr = 0.55 + 0.25 * Math.cos(t * Math.PI * 1.15 + 0.3) + t * 0.12; pts.push(new THREE.Vector2(rr, y)); }
    const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transmission: 0.95, thickness: 0.2, ior: 1.5, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const gl = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), glassM); gl.position.y = 0.15; g.add(gl);
    const teaPts = pts.slice(0, 26).map((p) => new THREE.Vector2(p.x * 0.94, p.y)); teaPts.push(new THREE.Vector2(0, teaPts[teaPts.length - 1].y));
    const tea = new THREE.Mesh(new THREE.LatheGeometry(teaPts, 48), new THREE.MeshPhysicalMaterial({ color: 0x9a2b0c, roughness: 0.1, transmission: 0.4, thickness: 1.2, emissive: new THREE.Color(0.25, 0.05, 0.0) })); tea.position.y = 0.17; g.add(tea);
    g.add(cyl(1.4, 1.2, 0.12, mat('#d7263d', { rough: 0.3 }), 0, 0.06, 0, 48)); // saucer (red/white Turkish style)
    g.add(cyl(1.2, 1.2, 0.13, mat('#f3efe7', { rough: 0.3 }), 0, 0.07, 0, 48));
    const spoon = box(2.2, 0.04, 0.12, mat('#c0c4c8', { metal: 0.9, rough: 0.2 }), 1.1, 0.15, 0.6); spoon.rotation.y = 0.5; g.add(spoon);
    for (let i = 0; i < 3; i++) g.add(box(0.35, 0.35, 0.35, mat('#ffffff', { rough: 0.8 }), -1.7 + i * 0.45, 0.2, 1.0));
    this.steam = loopStream({ count: 40, origin: [0, 2.5, 0], jitter: 0.5, vel: [0, 0.6, 0], velJitter: 0.15, life: 4, size: [0.3, 1.6], color: [1, 1, 1], seed: 7, opacity: 0.18, wind: [0.1, 0, 0] }); g.add(this.steam);
    return shadowAll(g);
  }
  makePot() {
    const g = new THREE.Group();
    const potM = mat('#8b8f96', { metal: 0.9, rough: 0.35 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(6, 5.6, 4, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x8b8f96, metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide })); pot.position.y = 2; g.add(pot);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(6, 0.15, 8, 64), potM).translateY(4).rotateX(Math.PI / 2));
    this.soupU = { time: { value: 0 }, heat: { value: 1 } };
    const soup = new THREE.Mesh(new THREE.CircleGeometry(5.9, 96), new THREE.ShaderMaterial({ uniforms: this.soupU,
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float time, heat; varying vec2 vP;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
        float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*n2(p); p*=2.1; a*=0.5;} return s; }
        void main(){ vec2 p = vP; float r = length(p);
          vec2 flow = vec2(sin(p.y*0.5 + time*0.3), cos(p.x*0.5 - time*0.25)) * 0.8;
          float n = fbm(p*0.9 + flow + time*0.15);
          // bubbles
          vec2 cell = floor(p*1.4); vec2 f = fract(p*1.4) - 0.5; float bt = fract(time*0.35 + h(cell)*7.0); float b = smoothstep(0.08, 0.0, abs(length(f) - bt*0.35)) * step(0.6, h(cell+3.0)) * (1.0-bt);
          vec3 c = mix(vec3(0.35,0.06,0.01), vec3(1.5,0.55,0.1), smoothstep(0.3, 0.8, n)) * heat;
          c += vec3(1.6,0.8,0.25) * b;
          c *= smoothstep(6.0, 5.2, r) * 0.6 + 0.4;
          gl_FragColor = vec4(c, 1.0); }` }));
    soup.rotation.x = -Math.PI / 2; soup.position.y = 3.3; g.add(soup);
    // ice slabs (plates!) floating
    this.slabs = [];
    const r = new RNG(17); const iceM = new THREE.MeshPhysicalMaterial({ color: 0x9fc4e0, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, emissive: new THREE.Color(0.02, 0.05, 0.09) });
    for (let i = 0; i < 14; i++) {
      const sh = new THREE.Shape(); const n = 7; const R0 = 0.6 + r.next() * 0.55;
      for (let k = 0; k < n; k++) { const a = k / n * TAU; const rr = R0 * (0.7 + r.next() * 0.5); k ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.08, bevelSegments: 2 }); geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, iceM); m.castShadow = true; g.add(m);
      const a = r.next() * TAU, d = r.next() * 3.4; m.userData = { x: Math.cos(a) * d, z: Math.sin(a) * d, ph: r.next() * TAU, sp: 0.15 + r.next() * 0.2 }; this.slabs.push(m);
    }
    this.potLight = new THREE.PointLight(0xff6a20, 0, 18, 1.5); this.potLight.position.y = 5; g.add(this.potLight);
    this.potSteam = loopStream({ count: 60, origin: [0, 3.6, 0], jitter: 8, vel: [0, 1.0, 0], velJitter: 0.3, life: 5, size: [1, 4], color: [1, 0.9, 0.85], seed: 3, opacity: 0.12, wind: [0.2, 0, 0] }); g.add(this.potSteam);
    return g;
  }
  makeSeismo() {
    const g = new THREE.Group();
    this.drumCanvas = makeCanvas(2048, 512); this.drumTex = new THREE.CanvasTexture(this.drumCanvas); this.drumTex.colorSpace = THREE.SRGBColorSpace; this.drumTex.wrapS = THREE.RepeatWrapping;
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 7, 64, 1, true), new THREE.MeshStandardMaterial({ map: this.drumTex, roughness: 0.7 })); drum.rotation.z = Math.PI / 2; drum.position.y = 2.3; g.add(drum);
    g.add(cyl(1.62, 1.62, 0.2, mat('#2b2e33', { metal: 0.7, rough: 0.3 }), -3.6, 2.3, 0, 48).rotateZ(Math.PI / 2)); g.add(cyl(1.62, 1.62, 0.2, mat('#2b2e33', { metal: 0.7, rough: 0.3 }), 3.6, 2.3, 0, 48).rotateZ(Math.PI / 2));
    g.add(box(8.5, 0.4, 3.5, mat('#22252a', { metal: 0.5, rough: 0.4 }), 0, 0.2, 0));
    const arm = new THREE.Group(); arm.position.set(0, 2.3, 3.2); g.add(arm);
    arm.add(box(0.12, 0.12, 1.6, mat('#c9ced6', { metal: 0.9, rough: 0.2 }), 0, 0, -0.8)); arm.add(box(0.05, 0.05, 0.3, mat('#b01c1c'), 0, 0, -1.65));
    g.add(box(0.3, 2.5, 0.3, mat('#2b2e33', { metal: 0.6 }), 0, 1.25, 3.3));
    g.userData = { drum, arm };
    return shadowAll(g);
  }
  drawSeismo(t, amp, offset) {
    const g = this.drumCanvas.getContext('2d'); const W = 2048, H = 512;
    g.fillStyle = '#f1ece0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(80,120,160,0.25)'; g.lineWidth = 1; for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } for (let x = 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 2.2; g.beginPath();
    for (let x = 0; x < W; x++) { const tt = (x - offset) / 120; const a = typeof amp === 'function' ? amp(tt) : amp; const y = H / 2 + (noise1(tt * 9) * 0.6 + Math.sin(tt * 37) * 0.4) * a * 200 + noise1(tt * 40) * 2; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); this.drumTex.needsUpdate = true;
  }
  makePhone() {
    const g = new THREE.Group();
    this.phoneCanvas = makeCanvas(512, 1024); this.phoneTex = new THREE.CanvasTexture(this.phoneCanvas); this.phoneTex.colorSpace = THREE.SRGBColorSpace;
    g.add(rbox(3.2, 0.3, 6.4, 0.25, mat('#121316', { metal: 0.6, rough: 0.3 }), 0, 0.15, 0));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 6.0), new THREE.MeshBasicMaterial({ map: this.phoneTex, color: new THREE.Color(1.6, 1.6, 1.6) })); scr.rotation.x = -Math.PI / 2; scr.position.y = 0.31; g.add(scr);
    // concrete dust & debris around
    const ct = concreteTexture(31, [150, 146, 138]); for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(jitterGeo(new THREE.BoxGeometry(1, 1, 1, 2, 2, 2), 0.4, i), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.95, flatShading: true })); const a = i * 2.1; c.position.set(Math.cos(a) * (3 + i % 3), 0.3, Math.sin(a) * (4 + i % 2)); c.scale.setScalar(0.6 + (i % 4) * 0.4); c.rotation.set(i, i * 2, i * 3); g.add(c); }
    return shadowAll(g);
  }
  drawPhone(t, mode = 'noservice') {
    const g = this.phoneCanvas.getContext('2d'); g.fillStyle = '#0b0e14'; g.fillRect(0, 0, 512, 1024);
    const gr = g.createLinearGradient(0, 0, 512, 1024); gr.addColorStop(0, '#1d2b4a'); gr.addColorStop(1, '#0b0e14'); g.fillStyle = gr; g.fillRect(0, 0, 512, 1024);
    g.fillStyle = '#fff'; g.font = '600 30px Inter'; g.fillText('04:31', 30, 52); g.textAlign = 'right'; g.fillText('No Service', 482, 52); g.textAlign = 'left';
    g.font = '200 150px Inter'; g.textAlign = 'center'; g.fillText('04:31', 256, 300); g.font = '500 34px Inter'; g.fillText('Monday, February 6', 256, 360);
    const blink = Math.floor(t * 1.5) % 2;
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(40, 560, 432, 150); g.fillStyle = '#ff5a4f'; g.font = '700 34px Inter'; g.fillText(blink ? 'Call Failed' : 'No Service', 256, 625); g.fillStyle = '#ddd'; g.font = '400 26px Inter'; g.fillText('Emergency calls only', 256, 675);
    g.textAlign = 'left'; this.phoneTex.needsUpdate = true;
  }
  makeThermo() {
    const g = new THREE.Group();
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, thickness: 0.3, transparent: true, opacity: 0.4 });
    g.add(cyl(0.35, 0.35, 8, glass, 0, 5, 0, 24)); g.add(sph(0.7, mat('#c8102e', { rough: 0.2, emissive: '#5a0000' }), 0, 0.8, 0));
    this.mercury = cyl(0.16, 0.16, 1, mat('#d4142e', { rough: 0.2, emissive: '#600000' }), 0, 1, 0, 12); g.add(this.mercury);
    const scale = canvasTex(256, 1024, (c, w, h) => { c.fillStyle = '#f3f0ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = '700 30px Inter';
      for (let i = 0; i <= 12; i++) { const y = h - 60 - i * 75; c.fillRect(150, y, 60, 4); c.fillText(String(-20 + i * 10) + '°F', 20, y + 10); } });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 9), new THREE.MeshStandardMaterial({ map: scale, roughness: 0.7 })); back.position.set(0, 4.6, -0.45); g.add(back);
    // frost crystals
    this.frost = new Sprites(60, (i, r) => ({ pos: [(r.next() - 0.5) * 4, r.next() * 9, 0.6], vel: [0, 0, 0], birth: -1e5, life: 1e9, size0: 0.1 + r.next() * 0.3, color: [0.8, 0.9, 1.2], alpha: 0.6 }), { additive: true, fadeIn: 0, fadeOut: 0, seed: 2 }); g.add(this.frost);
    return shadowAll(g);
  }
  // ---------- update ----------
  // o: { prop, p (progress / seconds), plus prop-specific fields }
  update(t, o = {}) {
    for (const k in this.props) this.props[k].visible = k === o.prop;
    this.bokeh.visible = o.bokeh !== false; this.bokeh.setTime(t);
    this.table.visible = o.table !== false;
    this.practical.intensity = 0;
    this.key.intensity = o.key !== undefined ? o.key : 400; this.key.color.set(o.keyColor || 0xffe2c0);
    this.key.target.position.set(0, 0, 0); this.key.position.set(...(o.keyPos || [-5, 9, 4]));
    const p = o.p || 0;
    switch (o.prop) {
      case 'egg': { this.eggU.crack.value = p; this.eggU.glow.value = o.glow || 0; const e = this.props.egg.userData.egg; e.rotation.y = t * 0.15; break; }
      case 'seed': {
        const { thumb, index, seed } = this.props.seed.userData; const sq = o.squeeze || 0; const shoot = o.shoot; // shoot = seconds since launch
        // fingertips (incl. nail) reach the seed surface at sq = 1
        const gapX = lerp(1.6, 0.0, sq);
        thumb.f.position.x = -5.4 - gapX + 0.35; index.f.position.x = 5.4 + gapX - 0.35; thumb.joints[2].rotation.z = sq * 0.08; index.joints[2].rotation.z = -0.08 - sq * 0.08;
        if (shoot === undefined || shoot < 0) { seed.position.set(Math.sin(t * 40) * sq * 0.015, 1.3, 0); seed.rotation.set(0, 0.0, sq * 0.15); seed.scale.set(1.55 * (1 - sq * 0.12), 0.45, 1.0); }
        else { const st = shoot; seed.position.set(Math.sin(st * 3) * 0.2, 1.3 + st * 1.2 - 2.5 * st * st, -st * 26); seed.rotation.set(st * 30, st * 9, 0); seed.scale.set(1.55, 0.45, 1); thumb.f.position.x = -5.05 + Math.min(st * 3, 0.3); index.f.position.x = 5.05 - Math.min(st * 3, 0.3); }
        break;
      }
      case 'nail': { const { tip } = this.props.nail.userData; const L = 1 + p * 0.8; tip.scale.x = L; tip.position.x = 1.65 + (L - 1) * 0.5; break; }
      case 'ruler': { this.rulerU.bend.value = o.bend || 0; this.rulerU.snap.value = o.snap === undefined ? -1 : o.snap; this.rulerU.crackGlow.value = o.crackGlow || 0; const sp = this.rulerSplinters; sp.visible = o.snap !== undefined && o.snap >= 0; if (sp.visible) sp.setTime(o.snap); break; }
      case 'clock': { this.drawClock(o.text || '4:16', Math.floor(t * 2) % 2 === 0 || o.solid); this.practical.intensity = 6; this.practical.color.set(0xff3020); this.practical.position.set(0, 1.5, 2.5); break; }
      case 'concrete': {
        const cr = o.crumble || 0; const { chunk } = this.props.concrete.userData; chunk.scale.set(1 - cr * 0.25, 1 - cr * 0.55, 1 - cr * 0.25); chunk.position.y = 1.3 * (1 - cr * 0.55);
        const dm = new THREE.Object3D(); this.grainData.forEach((gd, i) => { const k = clamp((cr - gd.d * 0.5) * 2); dm.position.set(lerp(gd.x0, gd.x1, ease.outCubic(k)), lerp(gd.y0, 0.06, ease.inQuad(k)) * (k > 0 ? 1 : 0) + (k > 0 ? 0 : gd.y0), lerp(gd.z0, gd.z1, ease.outCubic(k))); dm.scale.setScalar(k > 0 ? 1 : 0.0001); dm.updateMatrix(); this.grains.setMatrixAt(i, dm.matrix); });
        this.grains.instanceMatrix.needsUpdate = true; this.concreteDust.visible = cr > 0; this.concreteDust.setTime(cr * 3);
        this.drips.visible = !!o.drip; this.drips.setTime(t);
        const wet = !!o.drip; chunk.material.roughness = wet ? 0.35 : 0.95; chunk.material.color.setScalar(wet ? 0.75 : 1);
        break;
      }
      case 'stamp': {
        const { stamp } = this.props.stamp.userData; const sl = o.slam; let y = 4;
        if (sl !== undefined && sl >= 0) y = sl < 0.15 ? lerp(4, 0.05, ease.inQuad(sl / 0.15)) : sl < 0.35 ? 0.05 : lerp(0.05, 4, ease.outCubic((sl - 0.35) / 0.6));
        stamp.position.set(0.3, y, 0.4); this.stampMark.visible = sl !== undefined && sl > 0.15; break;
      }
      case 'tea': this.steam.setTime(t); break;
      case 'pot': {
        this.soupU.time.value = t; this.potLight.intensity = 12; this.potSteam.setTime(t);
        for (const sl of this.slabs) { const u = sl.userData; const a = t * u.sp + u.ph; sl.position.set(u.x + Math.cos(a) * 0.8, 3.3 + Math.sin(t * 1.3 + u.ph) * 0.03, u.z + Math.sin(a * 0.8) * 0.8); sl.rotation.y = a * 0.3; }
        break;
      }
      case 'seismo': { const { drum, arm } = this.props.seismo.userData; drum.rotation.x = t * 0.3; this.drawSeismo(t, o.amp || 0.05, t * 60); arm.rotation.y = 0; arm.position.x = Math.sin(t * 40) * (o.amp || 0) * 0.15; break; }
      case 'phone': this.drawPhone(t); this.practical.intensity = 5; this.practical.color.set(0x8fb0ff); this.practical.position.set(0, 2, 0); break;
      case 'thermo': { const temp = o.temp !== undefined ? o.temp : 40; const top = 0.63 + 0.0659 * (temp + 20); const hh = Math.max(0.05, top - 0.6); this.mercury.scale.y = hh; this.mercury.position.y = 0.6 + hh / 2; this.frost.setTime(t); break; }
    }
  }
}
