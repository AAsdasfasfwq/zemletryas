// Geological block diagram of a strike-slip fault (East Anatolian Fault stand-in).
// Physically motivated: elastic rebound (locked: u = S/pi*atan(z/D); ruptured: step),
// strain heat-map, shrinking locked asperity, micro-cracks, frictional melt, P/S waves.
import * as THREE from 'three';
import { canvasTex, strataTexture, glowTexture, makeCanvas } from '../engine/textures.js';
import { RNG, TAU, clamp, lerp, smooth, ease, fbm2, noise2 } from '../engine/util.js';
import { mat, box, cyl, makeTree, shadowAll } from './kit.js';
import { dustBurst, sparkBurst, Sprites } from '../engine/particles.js';

const LX = 44, HZ = 16, DEPTH = 18; // block size
const DISP_GLSL = /* glsl */`
uniform float uS, uD, uSnap, uWaveT, uPAmp, uSAmp, uHeat, uTime, uShake;
uniform vec3 uHypo;
varying vec3 vBP; varying float vStrain;
float dispX(vec3 p){
  float z = p.z;
  float locked = uS / 3.14159 * atan(z / uD);
  float rup = uS * 0.5 * sign(z) * (1.0 - exp(-abs(z) * 4.0));
  float k = uSnap; // 0 locked -> 1 ruptured (with overshoot handled by caller)
  float depthK = 1.0;
  return mix(locked, rup, k) * depthK;
}
vec3 waves(vec3 p){
  vec3 o = vec3(0.0);
  if(uWaveT > 0.0){
    float d = length(p - uHypo);
    float rp = uWaveT * 22.0, rs = uWaveT * 12.0;
    float P = exp(-pow((d - rp) / 2.2, 2.0)) * sin((d - rp) * 1.6);
    float S = exp(-pow((d - rs) / 3.0, 2.0)) * sin((d - rs) * 1.1);
    o.y += P * uPAmp * 0.6;
    o.x += S * uSAmp * 0.8; o.z += S * uSAmp * 0.4;
    // surface rolling waves after S arrives at the top
    float surf = smoothstep(0.0, 1.0, rs - (-uHypo.y)) * exp(-max(0.0, uWaveT - 3.0) * 0.5);
    o.y += surf * sin(length(p.xz - uHypo.xz) * 0.9 - uWaveT * 9.0) * 0.35 * uSAmp * smoothstep(-2.0, 0.0, p.y);
  }
  o.x += sin(uTime * 37.0) * uShake * 0.08 + sin(uTime * 23.0 + 1.0) * uShake * 0.05;
  o.y += sin(uTime * 29.0 + 2.0) * uShake * 0.04;
  return o;
}`;

function patchMaterial(m, u, { heat = true } = {}) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + DISP_GLSL)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 wp0 = (modelMatrix * vec4(transformed, 1.0)).xyz;
        float dx = dispX(wp0);
        float dz1 = dispX(wp0 + vec3(0.0,0.0,0.05)) - dispX(wp0 - vec3(0.0,0.0,0.05));
        vStrain = abs(dz1) / 0.1;
        transformed.x += dx;
        transformed += waves(wp0);
        vBP = wp0;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uHeat, uTime; varying vec3 vBP; varying float vStrain;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        ${heat ? `if(uHeat > 0.0){ float s = clamp(vStrain * 0.9, 0.0, 1.0); vec3 hc = mix(vec3(0.1,0.25,0.9), vec3(1.0,0.85,0.1), smoothstep(0.0,0.5,s)); hc = mix(hc, vec3(1.0,0.12,0.05), smoothstep(0.5,1.0,s));
          float pulse = 0.85 + 0.15*sin(uTime*4.0 - abs(vBP.z)*0.8);
          diffuseColor.rgb = mix(diffuseColor.rgb, hc * pulse, uHeat * 0.7); }` : ''}`);
  };
  return m;
}

export class GeoBlockSet {
  constructor() { this.scene = new THREE.Scene(); }
  build(director) {
    const s = this.scene;
    s.background = new THREE.Color(0x05070c);
    s.fog = new THREE.Fog(0x070a12, 90, 220);
    // backdrop gradient sphere
    const bg = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color(0x1c2a44) }, bot: { value: new THREE.Color(0x020306) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top, bot; varying vec3 vP; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.3, 0.6, vP.y)), 1.0); }' }));
    s.add(bg); this.bg = bg;
    this.key = new THREE.DirectionalLight(0xfff0dd, 3.0); this.key.position.set(-40, 60, 50); this.key.castShadow = true; this.key.shadow.mapSize.set(2048, 2048);
    const sc = this.key.shadow.camera; sc.left = -50; sc.right = 50; sc.top = 50; sc.bottom = -50; sc.near = 1; sc.far = 200; this.key.shadow.bias = -0.0005; s.add(this.key);
    this.rim = new THREE.DirectionalLight(0x7fa8ff, 1.4); this.rim.position.set(50, 20, -60); s.add(this.rim);
    s.add(new THREE.HemisphereLight(0x8fa8d0, 0x2a2018, 0.7));
    this.glowLight = new THREE.PointLight(0xff6a20, 0, 60, 1.6); this.glowLight.position.set(0, -10, 0); s.add(this.glowLight);

    this.u = { uS: { value: 0 }, uD: { value: 3 }, uSnap: { value: 0 }, uWaveT: { value: 0 }, uPAmp: { value: 0 }, uSAmp: { value: 0 }, uHeat: { value: 0 }, uTime: { value: 0 }, uShake: { value: 0 }, uHypo: { value: new THREE.Vector3(0, -12, 0) } };
    // top surface texture: fields, road across the fault, fence, river
    const topTex = canvasTex(2048, 1536, (g, w, h) => {
      const r = new RNG(12);
      g.fillStyle = '#6f8f3a'; g.fillRect(0, 0, w, h);
      // field patchwork
      for (let i = 0; i < 70; i++) {
        const x = r.next() * w, y = r.next() * h, fw = 120 + r.next() * 380, fh = 80 + r.next() * 260;
        g.fillStyle = r.pick(['#7d9a3c', '#a3a24a', '#c2a85a', '#5f7f35', '#8c6b3f', '#9db04f', '#b89a4e']); g.globalAlpha = 0.85;
        g.save(); g.translate(x, y); g.rotate((r.next() - 0.5) * 0.3); g.fillRect(-fw / 2, -fh / 2, fw, fh);
        g.globalAlpha = 0.15; g.fillStyle = '#000'; for (let k = -fw / 2; k < fw / 2; k += 9) g.fillRect(k, -fh / 2, 2, fh); g.restore();
      }
      g.globalAlpha = 1;
      // noise
      const img = g.getImageData(0, 0, w, h); const d = img.data;
      for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) { const n = noise2(x / 6, y / 6) * 10 + fbm2(x / 90, y / 90, 3) * 18; const i = (y * w + x) * 4; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.6; }
      g.putImageData(img, 0, 0);
      // road (across the fault: along canvas v == world z)
      const rx = w * 0.5;
      g.fillStyle = '#3b3b3e'; g.fillRect(rx - 34, 0, 68, h); g.fillStyle = '#c9c4b5'; g.fillRect(rx - 40, 0, 6, h); g.fillRect(rx + 34, 0, 6, h);
      g.fillStyle = '#f2d24b'; for (let y = 0; y < h; y += 50) g.fillRect(rx - 3, y, 6, 28);
      // fence line + tree row
      g.fillStyle = '#6b4a2e'; g.fillRect(w * 0.28, 0, 5, h);
      for (let y = 10; y < h; y += 40) g.fillRect(w * 0.28 - 4, y, 13, 13);
      g.fillStyle = '#c8b27a'; g.fillRect(w * 0.72 - 10, 0, 20, h); // dirt track
      // small river meander crossing
      g.strokeStyle = '#3d7fb0'; g.lineWidth = 16; g.beginPath(); g.moveTo(w * 0.85, 0); for (let y = 0; y <= h; y += 20) g.lineTo(w * 0.85 + Math.sin(y / 90) * 40, y); g.stroke();
    });
    const strat = strataTexture(4); strat.repeat.set(2, 1.2);
    this.topMat = patchMaterial(new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.95 }), this.u);
    this.sideMat = patchMaterial(new THREE.MeshStandardMaterial({ map: strat, roughness: 0.95 }), this.u);
    this.blocks = new THREE.Group(); s.add(this.blocks);
    // two halves: north z in [-HZ, 0], south z in [0, HZ]
    for (const side of [-1, 1]) {
      const g = new THREE.Group(); this.blocks.add(g);
      const top = new THREE.PlaneGeometry(LX, HZ, 220, 120); top.rotateX(-Math.PI / 2); top.translate(0, 0, side * HZ / 2);
      // UV: whole top texture spans both halves
      const uv = top.attributes.uv; const p = top.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + LX / 2) / LX, 1 - (p.getZ(i) + HZ) / (2 * HZ));
      const tm = new THREE.Mesh(top, this.topMat); tm.receiveShadow = true; tm.castShadow = true; g.add(tm);
      // side walls (subdivided for displacement)
      const front = new THREE.PlaneGeometry(LX, DEPTH, 160, 50); front.translate(0, -DEPTH / 2, 0);
      const f = new THREE.Mesh(front, this.sideMat); f.position.z = side * HZ; if (side < 0) f.rotation.y = Math.PI; g.add(f);
      for (const sx of [-1, 1]) {
        const sideG = new THREE.PlaneGeometry(HZ, DEPTH, 80, 50); sideG.translate((sx > 0 ? -side : side) * HZ / 2, -DEPTH / 2, 0);
        const sm = new THREE.Mesh(sideG, this.sideMat); sm.rotation.y = sx * Math.PI / 2; sm.position.x = sx * LX / 2; g.add(sm);
      }
      const bot = new THREE.Mesh(new THREE.PlaneGeometry(LX, HZ), mat('#2a1d14')); bot.rotation.x = Math.PI / 2; bot.position.set(0, -DEPTH, side * HZ / 2); g.add(bot);
      g.userData.side = side;
    }
    // fix side wall orientation (x walls): rebuild simply as boxes' faces via explicit placement
    // fault plane (shows locked asperity, cracks, melt). Sits at z = 0, faces +z (visible when south half hidden)
    this.crackTex = this.makeCrackTexture();
    this.faultU = { uLocked: { value: 1 }, uCrack: { value: 0 }, uMelt: { value: 0 }, uTime: { value: 0 }, uStress: { value: 0 }, crackMap: { value: this.crackTex }, rock: { value: strat } };
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(LX, DEPTH, 1, 1), new THREE.ShaderMaterial({
      uniforms: this.faultU, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: /* glsl */`
        uniform float uLocked, uCrack, uMelt, uTime, uStress; uniform sampler2D crackMap, rock; varying vec2 vUv; varying vec3 vP;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
        float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*n2(p); p*=2.03; a*=0.5;} return s; }
        void main(){
          vec2 p = vP.xy; // x along fault, y depth (0 top .. -18)
          vec3 base = texture2D(rock, vUv * vec2(2.0, 1.2)).rgb * 0.45;
          float rough = fbm(p * 2.5) * 0.6 + fbm(p * 9.0) * 0.4;
          base *= 0.55 + rough * 0.8;
          base += vec3(0.06) * smoothstep(0.6, 1.0, n2(vec2(p.x * 0.5, p.y * 7.0))); // slickensides
          vec2 hc = vec2(0.0, -12.0);
          float d = length((p - hc) * vec2(0.55, 1.0)) + (fbm(p * 0.6) - 0.5) * 3.0;
          float R = uLocked * 16.0;
          float locked = smoothstep(R + 0.6, R - 0.6, d);
          float bumps = fbm(p * 3.0 + 3.0);
          vec3 lockedRock = vec3(0.62, 0.48, 0.36) * (0.55 + bumps * 0.7);
          float pulse = 0.75 + 0.25 * sin(uTime * 4.0 - d * 0.7);
          vec3 hot = mix(vec3(1.4, 0.75, 0.15), vec3(1.6, 0.18, 0.04), uStress) * (0.3 + 0.9 * uStress) * pulse * smoothstep(0.35, 0.85, bumps + 0.2);
          vec3 c = mix(base * 0.8, lockedRock + hot, locked);
          float rim = smoothstep(1.0, 0.0, abs(d - R)) * step(0.01, uLocked);
          c += vec3(3.0, 1.1, 0.3) * rim * (0.5 + uStress);
          // micro-cracks
          vec4 cr = texture2D(crackMap, vUv);
          float crk = step(cr.r, uCrack) * cr.a;
          c = mix(c, vec3(3.5, 2.0, 0.8), crk);
          // frictional melt (glowing lubricant film)
          float m = uMelt * smoothstep(R + 6.0 * uMelt, 0.0, d) ;
          vec3 lava = mix(vec3(1.6, 0.25, 0.03), vec3(4.0, 2.6, 0.9), fbm(p * 1.3 + vec2(0.0, uTime * 0.6)));
          c = mix(c, lava, clamp(m, 0.0, 1.0));
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
    fp.position.set(0, -DEPTH / 2, 0.02); s.add(fp); this.faultPlane = fp;
    // glowing trace on the surface
    this.trace = new THREE.Mesh(new THREE.PlaneGeometry(LX, 0.25), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.8, 0.2), transparent: true, opacity: 0 })); this.trace.rotation.x = -Math.PI / 2; this.trace.position.y = 0.05; s.add(this.trace);
    // houses on top (simple village) — moved on CPU with the same displacement
    this.houses = [];
    const hr = new RNG(5);
    for (let i = 0; i < 26; i++) {
      const hgrp = new THREE.Group(); const w = 0.8 + hr.next() * 0.6, d = 0.7 + hr.next() * 0.4, hh = 0.6 + hr.next() * 0.9;
      hgrp.add(box(w, hh, d, mat(hr.pick(['#f2ece0', '#e9d8bf', '#f4e2c4', '#ddd6cc'])), 0, hh / 2, 0));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.75, 0.45, 4), mat(hr.pick(['#b5482f', '#9b3f2a', '#c45a3c']))); roof.position.y = hh + 0.2; roof.rotation.y = Math.PI / 4; hgrp.add(roof);
      let x = (hr.next() - 0.5) * LX * 0.85, z = (hr.next() - 0.5) * HZ * 1.7; if (Math.abs(z) < 1.5) z += 2 * Math.sign(z || 1); if (Math.abs(x) < 1.5) x += 3;
      hgrp.position.set(x, 0, z); hgrp.userData.base = [x, z]; hgrp.rotation.y = hr.next() * 0.4; shadowAll(hgrp); s.add(hgrp); this.houses.push(hgrp);
    }
    this.treesTop = [];
    for (let i = 0; i < 30; i++) { const tr = makeTree(i + 40, { scale: 0.35 }); const x = (hr.next() - 0.5) * LX * 0.9, z = (hr.next() - 0.5) * HZ * 1.8; tr.position.set(x, 0, z); tr.userData.base = [x, z]; s.add(tr); this.treesTop.push(tr); }
    // the "spring": helix tube spanning the fault
    this.spring = new THREE.Group(); s.add(this.spring);
    this.springMat = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.9, roughness: 0.25, emissive: new THREE.Color(0, 0, 0) });
    const anchorM = mat('#4a4f57', { metal: 0.6, rough: 0.4 });
    this.springA = box(1.4, 2.2, 1.4, anchorM); this.springB = box(1.4, 2.2, 1.4, anchorM); s.add(this.springA, this.springB);
    this.springMeshes = [];
    // seismic wave rings drawn on top surface (P and S)
    this.ringMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, hypo: { value: new THREE.Vector3(0, -12, 0) }, a: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vP,1.0); }',
      fragmentShader: `uniform float t, a; uniform vec3 hypo; varying vec3 vP; void main(){ float d = length(vP - hypo); float rp = t*22.0, rs = t*12.0;
        float P = exp(-pow((d-rp)/0.7,2.0)); float S = exp(-pow((d-rs)/1.0,2.0));
        vec3 c = vec3(0.4,0.8,3.0)*P + vec3(3.0,1.0,0.25)*S; gl_FragColor = vec4(c*a, (P+S)*a); }` });
    // a translucent box-shaped "wave volume" slice through the block (front cut) to show spherical fronts
    const slice = new THREE.Mesh(new THREE.PlaneGeometry(LX, DEPTH), this.ringMat); slice.position.set(0, -DEPTH / 2, HZ + 0.06); s.add(slice); this.waveSlice = slice;
    const sliceTop = new THREE.Mesh(new THREE.PlaneGeometry(LX, HZ * 2), this.ringMat); sliceTop.rotation.x = -Math.PI / 2; sliceTop.position.y = 0.1; s.add(sliceTop); this.waveTop = sliceTop;
    const sliceSide = new THREE.Mesh(new THREE.PlaneGeometry(HZ * 2, DEPTH), this.ringMat); sliceSide.rotation.y = Math.PI / 2; sliceSide.position.set(LX / 2 + 0.06, -DEPTH / 2, 0); s.add(sliceSide); this.waveSide = sliceSide;
    this.hypoGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(5, 2.5, 1), blending: THREE.AdditiveBlending, depthTest: false, transparent: true })); this.hypoGlow.position.set(0, -12, 0); s.add(this.hypoGlow);
    this.dust = dustBurst({ count: 140, center: [0, 0, 0], radius: 18, height: 2, speed: 5, spread: 1.2, life: [4, 9], size: [2, 9], color: [0.62, 0.55, 0.45], seed: 8, opacity: 0.7 }); s.add(this.dust);
    this.sparks = sparkBurst({ count: 160, center: [0, -10, 0.5], speed: 9, seed: 12 }); s.add(this.sparks);
    // teeth (velcro) prop
    this.teeth = this.makeTeeth(); s.add(this.teeth);
  }
  makeCrackTexture() {
    // branching crack network; r channel = birth (0..1), alpha = crack mask
    const W = 1024, H = 512; const c = makeCanvas(W, H); const g = c.getContext('2d'); g.clearRect(0, 0, W, H);
    const r = new RNG(77); const ox = W / 2, oy = H * (12 / DEPTH);
    const segs = [];
    const grow = (x, y, a, len, depth, birth) => {
      if (depth > 7 || len < 4) return;
      let px = x, py = y; const steps = 6 + r.int(0, 6);
      for (let i = 0; i < steps; i++) {
        a += (r.next() - 0.5) * 0.7; const nx = px + Math.cos(a) * len * 0.3, ny = py + Math.sin(a) * len * 0.3 * 0.6;
        const b = birth + i * 0.012 + depth * 0.03; segs.push([px, py, nx, ny, b, 4 - depth * 0.45]); px = nx; py = ny;
        if (r.next() < 0.22) grow(px, py, a + r.sign() * (0.5 + r.next() * 0.8), len * 0.75, depth + 1, b);
      }
    };
    for (let k = 0; k < 22; k++) grow(ox + (r.next() - 0.5) * 40, oy + (r.next() - 0.5) * 30, r.next() * TAU, 70 + r.next() * 50, 0, r.next() * 0.25);
    segs.sort((a, b) => b[4] - a[4]);
    for (const [x1, y1, x2, y2, b, wdt] of segs) { const v = Math.round(clamp(b) * 255); g.strokeStyle = `rgba(${v},0,0,1)`; g.lineWidth = Math.max(1, wdt); g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; return t;
  }
  makeTeeth() {
    const g = new THREE.Group(); g.visible = false;
    const rockA = strataTexture(9, ['#c48a55', '#d49a62', '#b77b48', '#e0aa70', '#a96f40']).clone(); rockA.needsUpdate = true; rockA.repeat.set(0.18, 0.18); rockA.wrapS = rockA.wrapT = THREE.RepeatWrapping;
    const rockB = strataTexture(10, ['#7d8a99', '#8e9aa8', '#6c7886', '#9fabb8', '#5f6a78']).clone(); rockB.needsUpdate = true; rockB.repeat.set(0.18, 0.18); rockB.wrapS = rockB.wrapT = THREE.RepeatWrapping;
    const mk = (sideSign, tex, seed) => {
      const r = new RNG(seed); const shp = new THREE.Shape(); const L = 40;
      shp.moveTo(-L / 2, sideSign * 12);
      let x = -L / 2; const pts = [];
      while (x < L / 2) { const w = 1.2 + r.next() * 2.4; const hgt = 0.8 + r.next() * 2.2; pts.push([x, 0], [x + w * 0.5, hgt]); x += w; }
      pts.push([L / 2, 0]);
      for (const [px, py] of pts) shp.lineTo(px, py);
      shp.lineTo(L / 2, sideSign * 12); shp.lineTo(-L / 2, sideSign * 12);
      const geo = new THREE.ExtrudeGeometry(shp, { depth: 6, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3, bevelSegments: 2 });
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, emissive: new THREE.Color(0, 0, 0) })); m.castShadow = true; m.receiveShadow = true;
      return m;
    };
    // the two blocks share the same jagged interface: generate B from A's profile mirrored
    const A = mk(-1, rockA, 3); const B = mk(1, rockB, 3); g.add(A, B); // same seed => same profile, so they interlock
    // glowing seam following the shared jagged profile
    const r = new RNG(3); const L = 40; let x = -L / 2; const seamPts = [];
    while (x < L / 2) { const w = 1.2 + r.next() * 2.4; const hgt = 0.8 + r.next() * 2.2; seamPts.push(new THREE.Vector3(x, 6.4, 0), new THREE.Vector3(x + w * 0.5, 6.4, -hgt)); x += w; }
    seamPts.push(new THREE.Vector3(L / 2, 6.4, 0));
    const seamGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seamPts, false, 'catmullrom', 0.05), 600, 0.12, 6, false);
    this.seamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.4, 0.3), transparent: true, opacity: 0 });
    const seam = new THREE.Mesh(seamGeo, this.seamMat); g.add(seam);
    g.userData = { A, B, seam };
    return g;
  }
  springGeometry(len, coils = 9, radius = 0.9, wire = 0.16) {
    const pts = []; const N = coils * 24;
    for (let i = 0; i <= N; i++) { const u = i / N; const a = u * coils * TAU; pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, u * len)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, wire, 8, false);
  }
  surfDisp(x, z) { // CPU copy of the displacement (for props on the surface)
    const u = this.u; const S = u.uS.value, D = u.uD.value;
    const locked = S / Math.PI * Math.atan(z / D); const rup = S * 0.5 * Math.sign(z) * (1 - Math.exp(-Math.abs(z) * 4));
    let dx = lerp(locked, rup, u.uSnap.value); let dy = 0;
    const t = u.uWaveT.value;
    if (t > 0) { const hy = u.uHypo.value; const d = Math.hypot(x - hy.x, -hy.y, z - hy.z); const rp = t * 22, rs = t * 12; dy += Math.exp(-(((d - rp) / 2.2) ** 2)) * Math.sin((d - rp) * 1.6) * u.uPAmp.value * 0.6; dx += Math.exp(-(((d - rs) / 3) ** 2)) * Math.sin((d - rs) * 1.1) * u.uSAmp.value * 0.8; }
    dx += Math.sin(u.uTime.value * 37) * u.uShake.value * 0.08;
    return [dx, dy];
  }
  // o: { S, snap, waveT, pAmp, sAmp, heat, shake, hideSouth, locked, crack, melt, stress, trace, spring:{show, snapT}, teeth:{show, slide, lock}, houses, glow, dust:t, sparks:t }
  update(t, o = {}) {
    const u = this.u; u.uTime.value = t; u.uS.value = o.S || 0; u.uSnap.value = o.snap || 0; u.uWaveT.value = o.waveT || 0; u.uPAmp.value = o.pAmp || 0; u.uSAmp.value = o.sAmp || 0; u.uHeat.value = o.heat || 0; u.uShake.value = o.shake || 0;
    this.blocks.children.forEach((g) => { g.visible = !(o.hideSouth && g.userData.side > 0); });
    this.blocks.visible = !o.teethOnly;
    const F = this.faultU; F.uLocked.value = o.locked !== undefined ? o.locked : 1; F.uCrack.value = o.crack || 0; F.uMelt.value = o.melt || 0; F.uTime.value = t; F.uStress.value = o.stress || 0;
    this.faultPlane.visible = !!o.hideSouth && !o.teethOnly;
    this.trace.material.opacity = o.trace || 0; this.trace.visible = (o.trace || 0) > 0;
    this.glowLight.intensity = (o.glow || 0) * 120;
    // waves overlay
    const wt = o.waveT || 0; this.ringMat.uniforms.t.value = wt; this.ringMat.uniforms.a.value = wt > 0 ? (o.ringsA !== undefined ? o.ringsA : 1) * Math.exp(-Math.max(0, wt - 1.6) * 1.5) : 0;
    this.waveSlice.visible = this.waveTop.visible = this.waveSide.visible = wt > 0 && !o.teethOnly;
    this.hypoGlow.visible = (o.hypo || 0) > 0; this.hypoGlow.scale.setScalar(6 + (o.hypo || 0) * 10); this.hypoGlow.material.opacity = clamp(o.hypo || 0);
    // props
    const showProps = o.houses !== false && !o.teethOnly;
    for (const h of [...this.houses, ...this.treesTop]) {
      const [bx, bz] = h.userData.base; h.visible = showProps && !(o.hideSouth && bz > 0);
      if (!h.visible) continue; const [dx, dy] = this.surfDisp(bx, bz); h.position.set(bx + dx, dy, bz);
      if (o.collapseHouses && this.houses.includes(h)) { const k = clamp((o.collapseHouses - Math.abs(bz) * 0.05)); h.scale.y = 1 - k * 0.75; h.rotation.z = k * 0.3 * Math.sign(bz); }
      else { h.scale.y = 1; h.rotation.z = 0; }
    }
    this.dust.visible = o.dust !== undefined; if (this.dust.visible) this.dust.setTime(o.dust);
    this.sparks.visible = o.sparks !== undefined; if (this.sparks.visible) this.sparks.setTime(o.sparks);
    // spring
    const sp = o.spring;
    this.spring.visible = this.springA.visible = this.springB.visible = !!sp && !o.teethOnly;
    if (sp) {
      const za = -6, zb = 6; const xa = this.surfDisp(-4, za)[0] - 4, xb = this.surfDisp(4, zb)[0] + 4;
      this.springA.position.set(xa, 1.1, za); this.springB.position.set(xb, 1.1, zb);
      const A = new THREE.Vector3(xa, 1.6, za + 0.7), B = new THREE.Vector3(xb, 1.6, zb - 0.7);
      let len = A.distanceTo(B);
      const snapT = sp.snapT; // seconds since snap (undefined = intact)
      while (this.spring.children.length) { const c = this.spring.children.pop(); c.geometry.dispose(); }
      const stretch = sp.stretch || 0;
      this.springMat.emissive.setRGB(1.0, 0.25, 0.05).multiplyScalar(stretch * 0.8);
      if (snapT === undefined || snapT < 0) {
        const m = new THREE.Mesh(this.springGeometry(len, 10, 0.85 * (1 - stretch * 0.25), 0.16), this.springMat); m.position.copy(A); m.lookAt(B); m.castShadow = true; this.spring.add(m);
      } else { // broken: two halves recoil toward anchors with damped oscillation
        const rec = Math.exp(-snapT * 2.2) * Math.cos(snapT * 14);
        const half = len * (0.28 + 0.12 * rec);
        const m1 = new THREE.Mesh(this.springGeometry(half, 5, 0.85, 0.16), this.springMat); m1.position.copy(A); m1.lookAt(B); this.spring.add(m1);
        const m2 = new THREE.Mesh(this.springGeometry(half, 5, 0.85, 0.16), this.springMat); m2.position.copy(B); m2.lookAt(A); this.spring.add(m2);
      }
    }
    // teeth
    const th = o.teeth; this.teeth.visible = !!th;
    if (th) {
      const { A, B } = this.teeth.userData; const slide = th.slide || 0; const sep = th.sep !== undefined ? th.sep : 0;
      A.position.set(-slide * 0.5, 0, -sep); B.position.set(slide * 0.5, 0, sep);
      const glowK = th.glow || 0; A.material.emissive.setRGB(0.9, 0.2, 0.04).multiplyScalar(glowK * 0.12); B.material.emissive.setRGB(0.9, 0.2, 0.04).multiplyScalar(glowK * 0.12);
      this.seamMat.opacity = clamp(glowK * 1.5); this.teeth.userData.seam.position.set(-slide * 0.5, 0, -sep);
      this.teeth.position.set(0, th.y !== undefined ? th.y : 0, 0);
    }
  }
}
