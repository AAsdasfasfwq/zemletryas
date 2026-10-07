// Apartment interiors: living/dining room, kid's room, bathroom, bedroom. Night, winter.
import * as THREE from 'three';
import { canvasTex, makeCanvas, glowTexture, concreteTexture } from '../engine/textures.js';
import { RNG, TAU, clamp, lerp, smooth, ease, fbm2, noise2, noise1 } from '../engine/util.js';
import { mat, box, cyl, sph, rbox, jitterGeo, shadowAll, makeChair } from './kit.js';
import { Person, makeCat, poseCat } from './people.js';
import { Sprites, dustBurst, sparkBurst } from '../engine/particles.js';

function wallpaper(seed, base, motif) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); const r = new RNG(seed);
    g.globalAlpha = 0.18; g.fillStyle = motif;
    for (let y = 0; y < h; y += 64) for (let x = (y / 64) % 2 ? 32 : 0; x < w; x += 64) { g.beginPath(); g.ellipse(x, y, 10, 18, 0, 0, TAU); g.fill(); g.fillRect(x - 1, y + 18, 2, 14); }
    g.globalAlpha = 0.06; for (let i = 0; i < 4000; i++) { g.fillStyle = r.chance(0.5) ? '#000' : '#fff'; g.fillRect(r.next() * w, r.next() * h, 2, 2); }
  }, { repeat: [3, 1.5] });
}
function rugTexture() {
  return canvasTex(1024, 768, (g, w, h) => {
    g.fillStyle = '#8c1c1c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1f3a5f'; g.lineWidth = 40; g.strokeRect(30, 30, w - 60, h - 60);
    g.strokeStyle = '#d9b26a'; g.lineWidth = 8; g.strokeRect(70, 70, w - 140, h - 140); g.strokeRect(20, 20, w - 40, h - 40);
    g.fillStyle = '#1f3a5f'; g.beginPath(); g.moveTo(w / 2, 150); g.lineTo(w - 230, h / 2); g.lineTo(w / 2, h - 150); g.lineTo(230, h / 2); g.closePath(); g.fill();
    g.fillStyle = '#d9b26a'; g.beginPath(); g.moveTo(w / 2, 230); g.lineTo(w - 330, h / 2); g.lineTo(w / 2, h - 230); g.lineTo(330, h / 2); g.closePath(); g.fill();
    g.fillStyle = '#8c1c1c'; g.beginPath(); g.arc(w / 2, h / 2, 70, 0, TAU); g.fill();
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#d9b26a' : '#f2e6c9'; g.fillRect(110 + i * 51, 100, 20, 20); g.fillRect(110 + i * 51, h - 120, 20, 20); }
    const img = g.getImageData(0, 0, w, h); const rr = new RNG(77); for (let i = 0; i < img.data.length; i += 4) { const n = (rr.next() - 0.5) * 18; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; } g.putImageData(img, 0, 0);
  });
}
function floorTexture() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const r = new RNG(4);
    for (let y = 0; y < h; y += 64) { let x = -r.next() * 300; while (x < w) { const L = 250 + r.next() * 250; const k = 0.8 + r.next() * 0.3; g.fillStyle = `rgb(${150 * k | 0},${105 * k | 0},${68 * k | 0})`; g.fillRect(x, y, L - 3, 61); g.fillStyle = 'rgba(60,35,15,0.25)'; for (let s = 0; s < 6; s++) g.fillRect(x, y + 8 + s * 9 + r.next() * 3, L - 3, 1); x += L; } }
  }, { repeat: [2, 2] });
}
function tileTexture() {
  return canvasTex(512, 512, (g, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 5 === 0 ? '#4c8fb0' : '#d9e8ee'; g.fillRect(x * 64, y * 64, 62, 62); } }, { repeat: [3, 2] });
}
function nightView() {
  return canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#05070d'); gr.addColorStop(0.6, '#141c2e'); gr.addColorStop(1, '#1e2230'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = new RNG(9);
    for (let i = 0; i < 40; i++) { const bw = 40 + r.next() * 90, bh = 120 + r.next() * 260, x = r.next() * w, y = h - bh; g.fillStyle = `rgb(${18 + r.int(0, 14)},${20 + r.int(0, 14)},${30 + r.int(0, 14)})`; g.fillRect(x, y, bw, bh);
      for (let yy = y + 10; yy < h - 10; yy += 16) for (let xx = x + 6; xx < x + bw - 8; xx += 13) if (r.next() < 0.35) { g.fillStyle = r.chance(0.8) ? `rgba(255,${190 + r.int(0, 50)},${110 + r.int(0, 60)},0.9)` : 'rgba(170,200,255,0.8)'; g.fillRect(xx, yy, 7, 9); } }
    for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,190,110,0.8)'; g.beginPath(); g.arc(r.next() * w, h - 20 - r.next() * 30, 2 + r.next() * 3, 0, TAU); g.fill(); }
  });
}
function tvCanvas() { return makeCanvas(512, 288); }

export class InteriorSet {
  constructor() { this.scene = new THREE.Scene(); }
  build(director) {
    const s = this.scene; s.background = new THREE.Color(0x020203);
    s.add(new THREE.HemisphereLight(0x5a6c90, 0x2a1c12, 0.55));
    this.rooms = {}; this.lights = []; this.swing = [];
    this.crackU = { crack: { value: 0 } };
    const crackTex = canvasTex(1024, 512, (g, w, h) => { g.clearRect(0, 0, w, h); const r = new RNG(5); g.strokeStyle = 'rgba(40,30,25,0.9)'; g.lineCap = 'round';
      const segs = []; const grow = (x, y, a, d, b) => { if (d > 5) return; let px = x, py = y; for (let i = 0; i < 10; i++) { a += (r.next() - 0.5) * 0.8; const nx = px + Math.cos(a) * 18, ny = py + Math.sin(a) * 18; segs.push([px, py, nx, ny, b + i * 0.025, 4 - d * 0.6]); px = nx; py = ny; if (r.next() < 0.2) grow(px, py, a + r.sign(), d + 1, b + i * 0.025); } };
      for (let k = 0; k < 7; k++) grow(r.next() * w, r.next() * h * 0.3, Math.PI / 2 + (r.next() - 0.5), 0, r.next() * 0.3);
      for (const [x1, y1, x2, y2, b, lw] of segs) { const v = Math.round(clamp(b) * 255); g.strokeStyle = `rgba(${v},0,0,1)`; g.lineWidth = Math.max(1, lw); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); } }, { srgb: false });
    const crackPatch = (m) => { m.onBeforeCompile = (sh) => { sh.uniforms.crack = this.crackU.crack; sh.uniforms.crackMap = { value: crackTex }; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float crack; uniform sampler2D crackMap;').replace('#include <map_fragment>', '#include <map_fragment>\n { vec4 cm = texture2D(crackMap, vMapUv * 0.33); float on = step(cm.r, crack) * cm.a; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12,0.09,0.07), on); }'); }; return m; };
    const viewTex = nightView();
    const mkRoom = (name, ox, W, D, H, wallMat, floorMat) => {
      const g = new THREE.Group(); g.position.x = ox; s.add(g); this.rooms[name] = g;
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
      const ce = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat('#e9e4da', { rough: 0.95 })); ce.rotation.x = Math.PI / 2; ce.position.y = H; g.add(ce);
      const walls = [[0, H / 2, -D / 2, 0, W], [0, H / 2, D / 2, Math.PI, W], [-W / 2, H / 2, 0, Math.PI / 2, D], [W / 2, H / 2, 0, -Math.PI / 2, D]];
      for (const [x, y, z, ry, len] of walls) { const wm = new THREE.Mesh(new THREE.PlaneGeometry(len, H), wallMat); wm.position.set(x, y, z); wm.rotation.y = ry; wm.receiveShadow = true; g.add(wm); }
      // skirting
      g.add(box(W, 0.12, 0.03, mat('#f3efe7'), 0, 0.06, -D / 2 + 0.02));
      // window on the back wall with the night city behind + glass + curtains
      const win = new THREE.Group(); win.position.set(W * 0.25, 1.55, -D / 2 + 0.01); g.add(win);
      const view = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), new THREE.MeshBasicMaterial({ map: viewTex, color: new THREE.Color(0.9, 0.9, 1.0) })); view.position.z = -0.02; win.add(view);
      for (const [x, y, w2, h2] of [[0, 0.78, 2.1, 0.08], [0, -0.78, 2.1, 0.08], [-1.02, 0, 0.08, 1.6], [1.02, 0, 0.08, 1.6], [0, 0, 0.06, 1.5]]) win.add(box(w2, h2, 0.08, mat('#f6f6f2', { rough: 0.4 }), x, y, 0.02));
      const curt = mat(name === 'kids' ? '#7fb3d5' : '#b55d3a', { rough: 0.95, side: THREE.DoubleSide });
      for (const sx of [-1, 1]) { const c = new THREE.Mesh(jitterGeo(new THREE.PlaneGeometry(0.7, 2.3, 6, 1), 0.08, ox + sx), curt); c.position.set(sx * 1.25, -0.1, 0.12); win.add(c); }
      g.userData = { W, D, H, win };
      return g;
    };
    const floorM = new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.55 });
    const livingWall = crackPatch(new THREE.MeshStandardMaterial({ map: wallpaper(1, '#d9c7a7', '#7a5a3a'), roughness: 0.9 }));
    const kidsWall = crackPatch(new THREE.MeshStandardMaterial({ map: wallpaper(2, '#cfe0e8', '#3a6a8a'), roughness: 0.9 }));
    const bedWall = crackPatch(new THREE.MeshStandardMaterial({ map: wallpaper(3, '#e3d3d0', '#8a5a5a'), roughness: 0.9 }));
    const tileM = crackPatch(new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.3 }));

    // ---------- living / dining ----------
    const L = mkRoom('living', 0, 7, 6, 2.8, livingWall, floorM);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-1.3, 0.01, 0.6); rug.receiveShadow = true; L.add(rug);
    const sofaM = mat('#5a6b4a', { rough: 0.95 });
    const sofa = new THREE.Group(); sofa.position.set(-1.3, 0, 2.2); L.add(sofa);
    sofa.add(rbox(2.6, 0.45, 0.9, 0.12, sofaM, 0, 0.32, 0)); sofa.add(rbox(2.6, 0.7, 0.25, 0.1, sofaM, 0, 0.75, 0.35)); sofa.add(rbox(0.25, 0.6, 0.9, 0.1, sofaM, -1.3, 0.5, 0)); sofa.add(rbox(0.25, 0.6, 0.9, 0.1, sofaM, 1.3, 0.5, 0));
    for (let i = 0; i < 3; i++) sofa.add(rbox(0.45, 0.4, 0.15, 0.08, mat(['#c0392b', '#e6a23c', '#2e86ab'][i], { rough: 0.95 }), -0.8 + i * 0.8, 0.75, 0.18));
    // TV
    this.tvCanvas = tvCanvas(); this.tvTex = new THREE.CanvasTexture(this.tvCanvas); this.tvTex.colorSpace = THREE.SRGBColorSpace;
    const tvG = new THREE.Group(); tvG.position.set(-1.3, 0, -2.6); L.add(tvG);
    tvG.add(box(1.8, 0.5, 0.45, mat('#3a2a1e'), 0, 0.25, 0));
    tvG.add(box(1.55, 0.9, 0.05, mat('#0c0c0e', { rough: 0.3 }), 0, 1.0, 0));
    this.tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.83), new THREE.MeshBasicMaterial({ map: this.tvTex, color: new THREE.Color(1.6, 1.6, 1.6) })); this.tvScreen.position.set(0, 1.0, 0.03); tvG.add(this.tvScreen);
    this.tvLight = new THREE.PointLight(0x8fb6ff, 2.5, 6, 2); this.tvLight.position.set(-1.3, 1.1, -2.0); L.add(this.tvLight);
    // dining table with dinner
    const table = new THREE.Group(); table.position.set(1.7, 0, 0.3); L.add(table);
    table.add(box(1.8, 0.06, 1.1, mat('#6b4a2e', { rough: 0.5 }), 0, 0.76, 0)); table.add(box(1.82, 0.02, 1.12, mat('#f2ece0', { rough: 0.9 }), 0, 0.795, 0));
    for (const [x, z] of [[-0.8, -0.45], [0.8, -0.45], [-0.8, 0.45], [0.8, 0.45]]) table.add(box(0.06, 0.76, 0.06, mat('#5a3a22'), x, 0.38, z));
    const plateM = mat('#f7f5f0', { rough: 0.3 });
    for (const [x, z] of [[-0.5, -0.32], [0.5, -0.32], [-0.5, 0.32], [0.5, 0.32]]) { table.add(cyl(0.16, 0.13, 0.03, plateM, x, 0.82, z, 24)); table.add(cyl(0.1, 0.1, 0.03, mat(['#c0392b', '#d98e2b', '#7a9a3a', '#c0392b'][(x > 0 ? 1 : 0) + (z > 0 ? 2 : 0)], { rough: 0.6 }), x, 0.84, z, 16)); table.add(cyl(0.03, 0.024, 0.08, mat('#a8321e', { rough: 0.15 }), x + 0.2, 0.85, z, 10)); }
    table.add(cyl(0.18, 0.15, 0.18, mat('#b03a2e', { rough: 0.4 }), 0, 0.9, 0, 20)); // pot
    table.add(rbox(0.5, 0.1, 0.18, 0.04, mat('#d9a05a', { rough: 0.8 }), 0.0, 0.85, 0.18)); // bread
    for (const [x, z, ry] of [[-0.55, -0.85, 0], [0.55, -0.85, 0], [-0.55, 0.85, Math.PI], [0.55, 0.85, Math.PI]]) { const ch = makeChair('#4a3020'); ch.position.set(x + 1.7, 0, z + 0.3); ch.rotation.y = ry; L.add(ch); }
    this.family = [];
    const fam = [{ seed: 11, female: false, shirt: '#2e4a6e' }, { seed: 12, female: true, shirt: '#8e3b46' }, { seed: 13, child: true, shirt: '#e6a23c' }, { seed: 14, child: true, female: true, shirt: '#3b8d5a' }];
    [[-0.55, -0.85, 0], [0.55, -0.85, 0], [-0.55, 0.85, Math.PI], [0.55, 0.85, Math.PI]].forEach(([x, z, ry], i) => { const p = new Person(fam[i].seed, fam[i]); p.position.set(x + 1.7, 0.02, z + 0.3 + (ry ? -0.05 : 0.05)); p.rotation.y = ry; L.add(p); this.family.push(p); });
    // ceiling pendant lamp
    const pend = new THREE.Group(); pend.position.set(1.7, 2.8, 0.3); L.add(pend);
    pend.add(box(0.01, 0.7, 0.01, mat('#222'), 0, -0.35, 0)); const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.3, 24, 1, true), mat('#e8c27a', { rough: 0.6, side: THREE.DoubleSide })); shade.position.y = -0.8; pend.add(shade);
    const bulb = sph(0.08, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.8, 2.4) }), 0, -0.86, 0); pend.add(bulb);
    const pl = new THREE.PointLight(0xffc27a, 14, 12, 1.4); pl.position.y = -0.9; pl.castShadow = true; pl.shadow.mapSize.set(1024, 1024); pl.shadow.bias = -0.002; pend.add(pl);
    this.lights.push({ light: pl, bulb, base: 14, room: 'living' }); this.swing.push(pend);
    const fl2 = new THREE.PointLight(0xffb070, 5, 7, 1.6); fl2.position.set(-3.0, 1.6, 2.4); L.add(fl2); this.lights.push({ light: fl2, base: 5, room: 'living' });
    L.add(cyl(0.03, 0.03, 1.6, mat('#2a2a2a'), -3.0, 0.8, 2.4, 6)); const lshade = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.35, 20, 1, true), mat('#f1dcb2', { side: THREE.DoubleSide, emissive: '#ffb070', ei: 0.6 })); lshade.position.set(-3.0, 1.75, 2.4); L.add(lshade);
    // floor lamp + heater (soba) glow
    const heater = new THREE.Group(); heater.position.set(3.0, 0, -2.4); L.add(heater); heater.add(rbox(0.9, 0.6, 0.15, 0.04, mat('#f2f2ee'), 0, 0.5, 0));
    for (let i = 0; i < 6; i++) heater.add(box(0.1, 0.5, 0.02, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.9, 0.2) }), -0.3 + i * 0.12, 0.5, 0.08));
    const hl = new THREE.PointLight(0xff6a20, 2.0, 4, 2); hl.position.set(3.0, 0.6, -2.0); L.add(hl); this.lights.push({ light: hl, base: 2.0, room: 'living' });
    // shelves, picture frames, plant
    L.add(box(1.2, 1.8, 0.35, mat('#5a3a22'), -3.2, 0.9, -1.5)); for (let i = 0; i < 4; i++) L.add(box(0.12, 0.25, 0.2, mat(['#c0392b', '#2e86ab', '#e6a23c', '#3b8d5a'][i]), -3.1, 1.5 - (i % 2) * 0.5, -1.5 + (i - 1.5) * 0.15));
    for (let i = 0; i < 3; i++) { const fr = box(0.5, 0.38, 0.03, mat('#2a2018'), -2.6 + i * 0.7, 1.9, -2.97); L.add(fr); L.add(box(0.42, 0.3, 0.01, mat(['#7aa6c9', '#d9b26a', '#9bbf7a'][i]), -2.6 + i * 0.7, 1.9, -2.95)); }
    const pot = cyl(0.18, 0.14, 0.3, mat('#b5522e'), 3.1, 0.15, 2.5, 16); L.add(pot); const plant = new THREE.Mesh(jitterGeo(new THREE.IcosahedronGeometry(0.35, 1), 0.15, 3), mat('#3f7a2a', { flat: true })); plant.position.set(3.1, 0.6, 2.5); L.add(plant);

    // ---------- kid's room ----------
    const K = mkRoom('kids', 14, 4.5, 4.5, 2.7, kidsWall, floorM);
    const bed = new THREE.Group(); bed.position.set(-0.8, 0, 0.6); K.add(bed);
    bed.add(box(1.0, 0.35, 2.0, mat('#e8d5b0'), 0, 0.18, 0)); bed.add(box(1.0, 0.15, 1.95, mat('#f6f2ea'), 0, 0.42, 0)); bed.add(box(1.0, 0.8, 0.08, mat('#e8d5b0'), 0, 0.5, -1.0));
    const blanket = new THREE.Mesh(jitterGeo(new THREE.BoxGeometry(1.05, 0.12, 1.3, 6, 1, 6), 0.04, 7), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g) => { g.fillStyle = '#e8a87c'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#f4d35e'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc((i * 47) % 256, (i * 83) % 256, 14, 0, TAU); g.fill(); } }), roughness: 0.95 }));
    blanket.position.set(0, 0.52, 0.35); bed.add(blanket); this.blanket = blanket;
    bed.add(rbox(0.6, 0.12, 0.35, 0.05, mat('#ffffff'), 0, 0.56, -0.75));
    this.kid = new Person(21, { child: true, pajama: true }); this.kid.position.set(0, 0.42, -0.7); this.kid.rotation.y = 0; bed.add(this.kid);
    this.parent = new Person(12, { female: true, shirt: '#8e3b46' }); this.parent.position.set(0.5, 0, 0.9); this.parent.rotation.y = -1.9; K.add(this.parent);
    const nl = new THREE.Group(); nl.position.set(0.6, 0, -1.6); K.add(nl); nl.add(box(0.4, 0.5, 0.4, mat('#f3efe7'), 0, 0.25, 0));
    const star = sph(0.12, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 0.8) }), 0, 0.62, 0); nl.add(star);
    const kl = new THREE.PointLight(0xffc06a, 2.2, 6, 2); kl.position.set(0.6, 0.8, -1.4); K.add(kl); this.lights.push({ light: kl, bulb: star, base: 2.2, room: 'kids' });
    for (let i = 0; i < 6; i++) { const toy = rbox(0.18, 0.18, 0.18, 0.04, mat(['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22'][i]), 1.2 + (i % 3) * 0.25, 0.09 + Math.floor(i / 3) * 0.18, 1.5); K.add(toy); }
    const teddy = new THREE.Group(); teddy.position.set(1.4, 0, -0.9); K.add(teddy); const tm = mat('#a0703c'); teddy.add(sph(0.2, tm, 0, 0.2, 0)); teddy.add(sph(0.14, tm, 0, 0.48, 0)); teddy.add(sph(0.05, tm, 0.09, 0.6, 0)); teddy.add(sph(0.05, tm, -0.09, 0.6, 0));

    // ---------- bathroom ----------
    const B = mkRoom('bath', 24, 3.2, 3.2, 2.6, tileM, new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.25, color: 0xdfe9ee }));
    const tub = new THREE.Group(); tub.position.set(-0.5, 0, -0.6); B.add(tub);
    const tubM = new THREE.MeshPhysicalMaterial({ color: 0xf8f8f6, roughness: 0.15, clearcoat: 1 });
    const tubBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 8, 24), tubM); tubBody.rotation.z = Math.PI / 2; tubBody.scale.set(1, 1, 0.75); tubBody.position.y = 0.62; tub.add(tubBody);
    tub.add(box(1.75, 0.04, 0.6, mat('#bcd3dc', { rough: 0.1 }), 0, 0.9, 0));
    for (const [x, z] of [[-0.6, -0.22], [0.6, -0.22], [-0.6, 0.22], [0.6, 0.22]]) tub.add(cyl(0.05, 0.03, 0.3, mat('#c9a646', { metal: 0.9, rough: 0.3 }), x, 0.15, z, 8));
    this.cat = makeCat('#d98a3a'); B.add(this.cat); this.cat.position.set(-0.5, 0, -0.55);
    const bl = new THREE.PointLight(0xdff0ff, 6, 7, 1.6); bl.position.set(0, 2.4, 0.4); B.add(bl); this.lights.push({ light: bl, base: 6, room: 'bath' });
    this.cat2 = makeCat('#3a3a3a'); L.add(this.cat2); this.cat2.visible = false;

    // ---------- bedroom (4:17 jolt) ----------
    const BR = mkRoom('bed', -14, 5, 4.5, 2.7, bedWall, floorM);
    const dbed = new THREE.Group(); dbed.position.set(0, 0, 0.3); BR.add(dbed);
    dbed.add(box(1.8, 0.35, 2.1, mat('#5a3a22'), 0, 0.18, 0)); dbed.add(box(1.8, 1.1, 0.1, mat('#5a3a22'), 0, 0.6, -1.05)); dbed.add(box(1.75, 0.15, 2.0, mat('#f3efe7'), 0, 0.42, 0));
    const duvet = new THREE.Mesh(jitterGeo(new THREE.BoxGeometry(1.85, 0.16, 1.45, 8, 1, 8), 0.05, 9), mat('#7c8fb0', { rough: 0.95 })); duvet.position.set(0, 0.56, 0.35); dbed.add(duvet); this.duvet = duvet;
    this.sleepers = [new Person(31, { pajama: true, female: false }), new Person(32, { pajama: true, female: true })];
    this.sleepers.forEach((p, i) => { p.position.set(-0.42 + i * 0.84, 0.42, -0.75); dbed.add(p); });
    const ns = box(0.5, 0.55, 0.45, mat('#5a3a22'), 1.3, 0.28, -0.6); BR.add(ns);
    this.bedClockCanvas = makeCanvas(256, 96); this.bedClockTex = new THREE.CanvasTexture(this.bedClockCanvas);
    const ck = new THREE.Group(); ck.position.set(1.3, 0.62, -0.6); BR.add(ck); ck.add(rbox(0.3, 0.14, 0.12, 0.03, mat('#111')));
    const ckFace = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.1), new THREE.MeshBasicMaterial({ map: this.bedClockTex, color: new THREE.Color(2.5, 2.5, 2.5) })); ckFace.position.z = 0.061; ck.add(ckFace);
    const cl = new THREE.PointLight(0xff3020, 0.5, 2, 2); cl.position.set(1.3, 0.75, -0.4); BR.add(cl);
    const moon = new THREE.SpotLight(0x8fa8e0, 6, 12, 0.5, 0.8, 1.2); moon.position.set(1.25, 2.2, -2.5); moon.target.position.set(0, 0, 0.5); BR.add(moon); BR.add(moon.target); this.lights.push({ light: moon, base: 6, room: 'bed', noFlicker: true });
    // falling dust from ceilings
    this.dustFall = new Sprites(160, (i, r) => ({ pos: [(r.next() - 0.5) * 6, 2.7, (r.next() - 0.5) * 5], vel: [0, -0.5, 0], birth: r.next() * 6, life: 3 + r.next() * 2, size0: 0.03, size1: 0.22, color: [0.55, 0.52, 0.48], alpha: 0.5 }), { gravity: [0, -0.6, 0], drag: 0.8, fadeIn: 0.1, fadeOut: 0.5, seed: 4, opacity: 0.45 });
    s.add(this.dustFall);
    this.glass = sparkBurst({ count: 90, center: [0, 1.5, -2.9], speed: 3, seed: 6, color: [0.8, 0.9, 1.0], life: [0.5, 1.2], size: 0.03, floorY: 0.02 }); s.add(this.glass);
    this.rooms.living.add(new THREE.AmbientLight(0x000000, 0));
    shadowAll(this.rooms.living, true, true);
  }
  drawTV(t, mode = 'news') {
    const g = this.tvCanvas.getContext('2d'); const W = 512, H = 288;
    if (mode === 'off') { g.fillStyle = '#050608'; g.fillRect(0, 0, W, H); this.tvTex.needsUpdate = true; return; }
    if (mode === 'static') { const img = g.createImageData(W, H); const rr = new RNG(Math.floor(t * 30)); for (let i = 0; i < img.data.length; i += 4) { const v = rr.next() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); this.tvTex.needsUpdate = true; return; }
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#0d2a4a'); gr.addColorStop(1, '#1d5a8a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (mode === 'weather') {
      g.fillStyle = '#e8eef5'; g.font = '800 30px Inter'; g.fillText('WEATHER', 20, 40); g.font = '600 18px Inter'; g.fillText('Monday 6 Feb', 20, 66);
      const cities = [['GAZIANTEP', '-4°'], ['K.MARAS', '-3°'], ['HATAY', '1°'], ['MALATYA', '-8°']];
      cities.forEach(([c, v], i) => { const x = 30 + (i % 2) * 240, y = 110 + Math.floor(i / 2) * 80; g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x - 10, y - 30, 220, 64); g.fillStyle = '#fff'; g.font = '700 20px Inter'; g.fillText(c, x, y); g.font = '800 30px Inter'; g.fillStyle = '#8fd0ff'; g.fillText(v + '  ❄', x, y + 28); });
    } else {
      // news anchor silhouette + ticker
      g.fillStyle = '#2b3d52'; g.fillRect(300, 60, 180, 160); g.fillStyle = '#e0b18f'; g.beginPath(); g.arc(390, 110, 32, 0, TAU); g.fill(); g.fillStyle = '#1a1a1a'; g.fillRect(345, 140, 90, 90);
      g.fillStyle = '#d32f2f'; g.fillRect(0, 220, W, 34); g.fillStyle = '#fff'; g.font = '800 20px Inter'; g.fillText('BREAKING', 10, 244);
      g.fillStyle = '#111'; g.fillRect(0, 254, W, 34); g.fillStyle = '#fff'; g.font = '600 17px Inter';
      const msg = 'EXPERTS WARN OF MAJOR EARTHQUAKE RISK ON EAST ANATOLIAN FAULT  •  KAHRAMANMARAS  •  '; const off = (t * 60) % 900; g.fillText(msg + msg, 10 - off, 277);
      g.fillStyle = '#fff'; g.font = '800 22px Inter'; g.fillText('SEISMIC GAP', 20, 60); g.font = '500 16px Inter'; g.fillText('125 miles • 120 years', 20, 84);
      g.strokeStyle = '#ff6a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(30, 180); g.lineTo(120, 140); g.lineTo(200, 120); g.lineTo(260, 90); g.stroke();
    }
    this.tvTex.needsUpdate = true;
  }
  drawBedClock(text) { const g = this.bedClockCanvas.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#ff3b2a'; g.font = '700 70px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff2a1a'; g.shadowBlur = 12; g.fillText(text, 128, 52); g.shadowBlur = 0; this.bedClockTex.needsUpdate = true; }
  // o: { room, shake (0..1), quakeT, power (0..1), flicker, crack, tv, family pose, kid, cat, sleepers jolt p, clock text }
  update(t, o = {}) {
    const shake = o.shake || 0; const power = o.power !== undefined ? o.power : 1;
    for (const L of this.lights) {
      let k = power; if (o.flicker && !L.noFlicker) k *= (noise1(t * 25 + L.base) > -0.2 ? 1 : 0.1) * (0.7 + 0.3 * noise1(t * 60));
      L.light.intensity = L.base * (L.noFlicker ? 1 : k); if (L.bulb) L.bulb.material.color.setRGB(5, 3.8, 2.4).multiplyScalar(L.noFlicker ? 1 : Math.max(k, 0.02));
    }
    for (const p of this.swing) { p.rotation.z = Math.sin(t * 3.1) * shake * 0.35; p.rotation.x = Math.sin(t * 2.3 + 1) * shake * 0.25; }
    this.crackU.crack.value = o.crack || 0;
    this.drawTV(t, power < 0.2 ? 'off' : o.tv || 'news'); this.tvLight.intensity = power > 0.2 ? 2.5 * (0.8 + 0.2 * noise1(t * 6)) : 0; this.tvScreen.visible = true;
    const famPose = o.family || 'tea';
    this.family.forEach((p) => (p.visible = true)); // shots may hide them after update()
    this.family.forEach((p) => p.pose(famPose === 'tea' ? 'tea' : famPose, t));
    if (o.kid === 'sleep') { this.kid.pose('lie', t); this.kid.rotation.x = 0; } else this.kid.pose('lie', t);
    this.parent.visible = o.parentVisible !== false; this.parent.pose(o.parentPose || 'stand', t, { look: 0.4 });
    // cat
    const cm = o.cat || 'hide';
    if (cm === 'run') { const ct = o.catT || 0; this.cat2.visible = true; this.cat2.position.set(-3 + ct * 4.5, 0, 1.2 - ct * 0.4); this.cat2.rotation.y = 0.1; poseCat(this.cat2, t, 'run'); }
    else this.cat2.visible = false;
    poseCat(this.cat, t, 'hide'); this.cat.position.set(-0.5 + (o.catIn !== undefined ? (1 - o.catIn) * 1.4 : 0), 0, -0.55 + (o.catIn !== undefined ? (1 - o.catIn) * 0.8 : 0)); this.cat.rotation.y = Math.PI + 0.6;
    // sleepers
    const jp = o.jolt || 0; this.sleepers.forEach((p, i) => p.pose(jp > 0 ? 'jolt' : 'lie', t, { p: clamp(jp * (i ? 0.9 : 1)) }));
    this.duvet.position.y = 0.56 + jp * 0.05; this.duvet.rotation.x = -jp * 0.15;
    this.drawBedClock(o.clock || '4:16');
    // shaking: physical jitter of all rooms (camera shake added by shot)
    for (const r of Object.values(this.rooms)) { r.position.y = Math.sin(t * 31) * shake * 0.02; r.rotation.z = Math.sin(t * 17 + 1) * shake * 0.004; }
    this.dustFall.visible = shake > 0.05; this.dustFall.position.set(this.rooms[o.room || 'living'].position.x, 0, 0); this.dustFall.setTime((o.quakeT || 0));
    this.glass.visible = o.glassT !== undefined; if (this.glass.visible) { this.glass.position.x = this.rooms[o.room || 'living'].position.x + this.rooms[o.room || 'living'].userData.win.position.x; this.glass.setTime(o.glassT); }
  }
}
