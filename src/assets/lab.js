// Seismology monitoring centre + geology conference hall. Screens are live canvases.
import * as THREE from 'three';
import { makeCanvas, canvasTex, glowTexture } from '../engine/textures.js';
import { RNG, TAU, clamp, lerp, smooth, noise1, fbm1 } from '../engine/util.js';
import { mat, box, cyl, rbox, shadowAll, makeChair } from './kit.js';
import { Person } from './people.js';
import { Sprites } from '../engine/particles.js';

function screen(w, h, cw = 640, ch = 360) {
  const c = makeCanvas(cw, ch); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.5, 1.5, 1.5), toneMapped: false }));
  m.userData = { c, t, g: c.getContext('2d'), cw, ch }; return m;
}
function drawSeismogram(sc, t, { amp = 0.1, color = '#4fe3ff', title = 'STATION KMRS  BHZ', burst = -1 } = {}) {
  const { g, cw, ch } = sc.userData; g.fillStyle = '#04101a'; g.fillRect(0, 0, cw, ch);
  g.strokeStyle = 'rgba(80,160,220,0.15)'; g.lineWidth = 1; for (let x = 0; x < cw; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ch); g.stroke(); } for (let y = 0; y < ch; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke(); }
  for (let row = 0; row < 3; row++) {
    const cy = 80 + row * 100; g.strokeStyle = row === 0 ? color : row === 1 ? '#7dffb0' : '#ffd36a'; g.lineWidth = 1.6; g.beginPath();
    for (let x = 0; x < cw; x++) { const tt = t * 2 - (cw - x) / 90 + row * 7; let a = amp * (0.4 + 0.6 * Math.abs(fbm1(tt * 0.3)));
      if (burst >= 0) { const bt = tt - burst; if (bt > 0) a += Math.exp(-bt * 0.6) * 1.2 * (bt < 0.4 ? bt / 0.4 : 1); }
      const y = cy + (Math.sin(tt * 47 + row) * 0.5 + fbm1(tt * 13 + row * 3) * 0.8) * a * 60; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  g.fillStyle = '#9fd6ff'; g.font = '600 16px "JetBrains Mono", monospace'; g.fillText(title, 14, 22); g.fillText('UTC ' + (2 + (t % 60) / 100).toFixed(4), cw - 170, 22);
  sc.userData.t.needsUpdate = true;
}
function drawGPS(sc, t, k = 1) {
  const { g, cw, ch } = sc.userData; g.fillStyle = '#071019'; g.fillRect(0, 0, cw, ch);
  g.fillStyle = '#cfe6ff'; g.font = '700 18px Inter'; g.fillText('GNSS STATION DISPLACEMENT  (mm/yr)', 16, 28);
  g.strokeStyle = 'rgba(120,170,220,0.25)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(40, 60 + i * 50); g.lineTo(cw - 20, 60 + i * 50); g.stroke(); }
  const series = [['#ff8a3a', 1.0], ['#4fe3ff', 0.15], ['#7dffb0', 0.6]];
  series.forEach(([c, slope], s) => { g.strokeStyle = c; g.lineWidth = 2.2; g.beginPath(); for (let x = 0; x < cw - 60; x += 3) { const y = 300 - x * slope * 0.35 * k + Math.sin(x * 0.3 + s) * 3 + fbm1(x * 0.05 + s * 9) * 6 - s * 40; x ? g.lineTo(40 + x, y) : g.moveTo(40 + x, y); } g.stroke(); });
  sc.userData.t.needsUpdate = true;
}
function drawMapScreen(sc, t, { gap = 1, label = 'EAST ANATOLIAN FAULT' } = {}) {
  const { g, cw, ch } = sc.userData; g.fillStyle = '#0b1b2a'; g.fillRect(0, 0, cw, ch);
  g.fillStyle = '#2a3a2a'; g.beginPath(); g.moveTo(0, 120); g.bezierCurveTo(200, 90, 400, 140, cw, 100); g.lineTo(cw, ch); g.lineTo(0, ch); g.fill();
  g.strokeStyle = '#ff6a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(60, 300); g.lineTo(200, 230); g.lineTo(330, 190); g.lineTo(450, 150); g.lineTo(600, 110); g.stroke();
  if (gap) { g.strokeStyle = `rgba(255,210,60,${0.5 + 0.5 * Math.sin(t * 4)})`; g.lineWidth = 14; g.setLineDash([12, 8]); g.beginPath(); g.moveTo(200, 230); g.lineTo(330, 190); g.lineTo(450, 150); g.stroke(); g.setLineDash([]); g.fillStyle = '#ffd23c'; g.font = '800 22px Inter'; g.fillText('SEISMIC GAP', 260, 140); }
  for (let i = 0; i < 9; i++) { const ph = (t * 0.7 + i * 0.37) % 1; const x = [90, 130, 170, 480, 520, 560, 590, 70, 110][i], y = [285, 265, 245, 140, 130, 118, 112, 295, 275][i]; g.strokeStyle = `rgba(255,140,60,${1 - ph})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 4 + ph * 18, 0, TAU); g.stroke(); }
  g.fillStyle = '#cfe6ff'; g.font = '700 18px Inter'; g.fillText(label, 16, 28);
  sc.userData.t.needsUpdate = true;
}
function drawSlide(sc, t) {
  const { g, cw, ch } = sc.userData; g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, cw, ch);
  g.fillStyle = '#1d2b3a'; g.font = '800 34px Inter'; g.fillText('Kahramanmaraş: next major', 30, 52); g.fillText('earthquake zone', 30, 92);
  g.fillStyle = '#c9b48e'; g.fillRect(30, 120, 380, 210); g.strokeStyle = '#c0392b'; g.lineWidth = 5; g.beginPath(); g.moveTo(50, 300); g.lineTo(160, 240); g.lineTo(260, 200); g.lineTo(390, 140); g.stroke();
  const pulse = 0.5 + 0.5 * Math.sin(t * 3); g.strokeStyle = `rgba(200,20,20,${0.6 + 0.4 * pulse})`; g.lineWidth = 6; g.beginPath(); g.arc(210, 220, 40 + pulse * 6, 0, TAU); g.stroke();
  g.fillStyle = '#c0392b'; g.font = '800 20px Inter'; g.fillText('M 7+ EXPECTED', 440, 170); g.fillStyle = '#333'; g.font = '500 18px Inter'; g.fillText('• Seismic gap 120+ yrs', 440, 210); g.fillText('• Strain accumulating', 440, 240); g.fillText('• Buildings unprepared', 440, 270);
  sc.userData.t.needsUpdate = true;
}

export class LabSet {
  constructor() { this.scene = new THREE.Scene(); }
  build() {
    const s = this.scene; s.background = new THREE.Color(0x020408);
    s.add(new THREE.HemisphereLight(0x2a4a7a, 0x05070a, 0.35));
    // ---------- monitoring centre (origin) ----------
    const C = new THREE.Group(); s.add(C); this.centre = C;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), new THREE.MeshStandardMaterial({ color: 0x0e1218, roughness: 0.35, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; C.add(fl);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), mat('#0c1118', { rough: 0.8 })); wall.position.set(0, 4, -6); C.add(wall);
    this.big = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const sc = screen(3.6, 2.0); sc.position.set(-3.8 + i * 3.8, 2.4 + j * 2.15, -5.9); C.add(sc); this.big.push(sc); C.add(box(3.7, 2.1, 0.08, mat('#05070a'), sc.position.x, sc.position.y, -5.95)); }
    this.desks = []; this.deskScreens = [];
    for (let k = 0; k < 3; k++) {
      const d = new THREE.Group(); d.position.set(-4 + k * 4, 0, -1.5); C.add(d);
      d.add(box(3.2, 0.06, 1.2, mat('#2a2f36', { metal: 0.4, rough: 0.4 }), 0, 0.75, 0)); d.add(box(0.06, 0.75, 1.1, mat('#1a1d22'), -1.5, 0.37, 0)); d.add(box(0.06, 0.75, 1.1, mat('#1a1d22'), 1.5, 0.37, 0));
      for (let m = 0; m < 2; m++) { const sc = screen(1.0, 0.6, 480, 288); sc.position.set(-0.6 + m * 1.2, 1.2, -0.3); sc.rotation.y = (m ? -1 : 1) * 0.12; d.add(sc); d.add(box(1.05, 0.65, 0.04, mat('#0a0a0c'), sc.position.x, 1.2, -0.33)); this.deskScreens.push(sc); }
      const ch = makeChair('#22262c'); ch.position.set(0, 0, 0.6); ch.rotation.y = Math.PI; d.add(ch);
      const p = new Person(1500 + k, { shirt: ['#3a4a6a', '#e0d5c1', '#5a3a4a'][k], female: k === 1 }); p.position.set(0, 0.02, 0.62); p.rotation.y = Math.PI; d.add(p); p.userData.k = k; this.desks.push(p);
      const L = new THREE.PointLight(0x4fb0ff, 3, 5, 2); L.position.set(0, 1.3, 0.3); d.add(L);
    }
    const wallGlow = new THREE.RectAreaLight ? null : null;
    this.centreLight = new THREE.PointLight(0x3a8cff, 14, 16, 1.5); this.centreLight.position.set(0, 3.2, -3.5); C.add(this.centreLight);
    this.redAlert = new THREE.PointLight(0xff3020, 0, 20, 1.5); this.redAlert.position.set(0, 5, 0); C.add(this.redAlert);
    // floating dust motes in the screen light
    this.motes = new Sprites(120, (i, r) => ({ pos: [(r.next() - 0.5) * 14, r.next() * 5, -5 + r.next() * 8], vel: [0.02, 0.01, 0], birth: -1e5, life: 1e9, size0: 0.02 + r.next() * 0.03, color: [0.6, 0.8, 1.2], alpha: 0.5 }), { map: glowTexture(), additive: true, fadeIn: 0, fadeOut: 0, turb: 0.02 });
    C.add(this.motes);

    // ---------- conference hall (x = 60) ----------
    const H = new THREE.Group(); H.position.set(60, 0, 0); s.add(H); this.hall = H;
    const hf = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat('#3a1e1e', { rough: 0.9 })); hf.rotation.x = -Math.PI / 2; hf.receiveShadow = true; H.add(hf);
    H.add(box(40, 12, 0.3, mat('#151820'), 0, 6, -10)); H.add(box(14, 0.6, 5, mat('#2a2018'), 0, 0.3, -7.5));
    this.slide = screen(9, 5.06, 960, 540); this.slide.position.set(0, 4.6, -9.8); H.add(this.slide);
    H.add(rbox(1.0, 1.2, 0.6, 0.05, mat('#3a2a1e'), -3.5, 1.2, -6.2));
    this.speaker = new Person(1600, { shirt: '#e8e2d6', coat: '#2c3440' }); this.speaker.position.set(-3.5, 0.6, -6.9); H.add(this.speaker);
    this.audience = [];
    for (let row = 0; row < 6; row++) for (let c = 0; c < 9; c++) { if ((row * 9 + c) % 7 === 3) continue; const x = -8 + c * 2, z = -2 + row * 2.2; const ch = makeChair('#5a1f1f'); ch.position.set(x, 0, z); ch.rotation.y = Math.PI; H.add(ch); const p = new Person(1700 + row * 9 + c, {}); p.position.set(x, 0.02, z + 0.05); p.rotation.y = Math.PI; H.add(p); this.audience.push(p); }
    const spot = new THREE.SpotLight(0xfff2dd, 120, 30, 0.35, 0.6, 1.2); spot.position.set(-3.5, 10, -1); spot.target.position.set(-3.5, 1, -6.8); spot.castShadow = true; H.add(spot, spot.target);
    this.hallLight = new THREE.PointLight(0xaab8ff, 8, 30, 1.5); this.hallLight.position.set(0, 5, -8); H.add(this.hallLight);
    const proj = new THREE.Mesh(new THREE.ConeGeometry(2.6, 18, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.28, 0.35), transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    proj.rotation.x = -Math.PI / 2 + 0.12; proj.position.set(0, 5.8, 0); H.add(proj);
    shadowAll(C); shadowAll(H);
  }
  // o: { area:'centre'|'hall', alarm (0..1), burst (sec), gpsK }
  update(t, o = {}) {
    const alarm = o.alarm || 0;
    this.motes.setTime(t);
    if (o.area !== 'hall') {
      this.big.forEach((sc, i) => { if (i === 0) drawMapScreen(sc, t, { gap: alarm > 0.3 ? 1 : 0 }); else if (i === 3) drawGPS(sc, t, o.gpsK || 1); else drawSeismogram(sc, t + i * 3, { amp: 0.08 + (i === 1 ? alarm * 0.2 : 0), title: ['', 'STATION KMRS  BHZ', 'STATION GAZ  BHN', '', 'STATION ANTK  BHE', 'STATION MLTY  BHZ'][i] || 'STATION', burst: o.burst !== undefined ? o.burst : -1, color: alarm > 0.5 && i === 1 ? '#ff6a4a' : '#4fe3ff' }); });
      this.deskScreens.forEach((sc, i) => { if (i % 2) drawGPS(sc, t + i, o.gpsK || 1); else drawSeismogram(sc, t + i * 5, { amp: 0.1, title: 'BHZ ' + i }); });
      this.redAlert.intensity = alarm * (Math.sin(t * 5) * 0.5 + 0.5) * 30;
      this.desks.forEach((p) => p.pose('sit', t));
      this.desks.forEach((p, k) => { p.head.rotation.x = -0.1; p.head.rotation.y = Math.sin(t * 0.5 + k) * 0.3; });
    } else {
      drawSlide(this.slide, t);
      this.speaker.pose('point', t);
      this.audience.forEach((p) => p.pose('sit', t));
    }
  }
}
