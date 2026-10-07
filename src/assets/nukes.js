// "Several thousand atomic bombs": a field of mushroom clouds on a desert plain at dusk.
import * as THREE from 'three';
import { SkyDome } from '../engine/sky.js';
import { Sprites, dustBurst } from '../engine/particles.js';
import { concreteTexture, glowTexture, puffTexture } from '../engine/textures.js';
import { RNG, TAU, clamp, lerp, smooth, ease, fbm2 } from '../engine/util.js';
import { mat, jitterGeo } from './kit.js';

const FIRE_VERT = `varying vec3 vN; varying vec3 vP; varying vec3 vL; void main(){ vN = normalize(normalMatrix*normal); vL = position; vec4 mv = modelViewMatrix*vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix*mv; }`;
const FIRE_FRAG = /* glsl */`
uniform float uT, uHeat, uSeed; varying vec3 vN; varying vec3 vP; varying vec3 vL;
float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x), mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x), f.y), mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x), mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x), f.y), f.z); }
float fbm(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*n3(p); p*=2.07; a*=0.5;} return s; }
void main(){
  vec3 v = normalize(-vP); float fr = clamp(dot(v, normalize(vN)), 0.0, 1.0);
  float n = fbm(vL * 2.2 + vec3(0.0, -uT * 0.8, uSeed));
  float core = pow(fr, 1.5);
  vec3 hot = vec3(9.0, 7.5, 5.0), mid = vec3(6.0, 2.6, 0.7), cool = vec3(1.6, 0.35, 0.08), smoke = vec3(0.12, 0.09, 0.08);
  float k = uHeat * (0.55 + 0.6 * n) * (0.4 + 0.6 * core);
  vec3 c = mix(smoke, cool, smoothstep(0.05, 0.3, k)); c = mix(c, mid, smoothstep(0.3, 0.6, k)); c = mix(c, hot, smoothstep(0.6, 0.95, k));
  gl_FragColor = vec4(c, 1.0);
}`;

class Mushroom extends THREE.Group {
  constructor(seed = 1, lite = false) {
    super(); this.seed = seed; this.lite = lite; const r = new RNG(seed);
    this.fireU = { uT: { value: 0 }, uHeat: { value: 1 }, uSeed: { value: r.next() * 10 } };
    this.fire = new THREE.Mesh(new THREE.SphereGeometry(1, lite ? 24 : 48, lite ? 16 : 32), new THREE.ShaderMaterial({ vertexShader: FIRE_VERT, fragmentShader: FIRE_FRAG, uniforms: this.fireU }));
    this.add(this.fire);
    const NC = lite ? 36 : 140, NS = lite ? 14 : 60;
    this.capData = []; for (let i = 0; i < NC; i++) this.capData.push({ a: r.next() * TAU, b: r.next() * TAU, s: 0.7 + r.next() * 0.6, sh: 0.75 + r.next() * 0.4 });
    this.cap = new Sprites(NC, (i) => ({ pos: [0, 0, 0], birth: -1, life: 1e9, size0: 1, size1: 1, color: [1, 1, 1], alpha: 0.95 }), { seed, fadeIn: 0, fadeOut: 0, puffSeed: (seed % 3) + 1 });
    this.add(this.cap);
    this.stemData = []; for (let i = 0; i < NS; i++) this.stemData.push({ u: r.next(), a: r.next() * TAU, rr: r.next(), s: 0.7 + r.next() * 0.6 });
    this.stem = new Sprites(NS, () => ({ pos: [0, 0, 0], birth: -1, life: 1e9, size0: 1, size1: 1, color: [1, 1, 1], alpha: 0.9 }), { seed: seed + 1, fadeIn: 0, fadeOut: 0 });
    this.add(this.stem);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(6, 3.5, 1.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); this.add(this.glow);
    if (!lite) {
      this.skirt = dustBurst({ count: 120, center: [0, 0, 0], radius: 20, height: 4, speed: 60, spread: 0.8, life: [6, 10], size: [15, 50], color: [0.75, 0.62, 0.48], seed: seed + 5, opacity: 0.85, rise: 0.4 }); this.add(this.skirt);
      this.wave = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, TAU, 0, Math.PI / 2), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { a: { value: 0 } }, vertexShader: FIRE_VERT.replace('vL = position;', 'vL = position;'), fragmentShader: `uniform float a; varying vec3 vN; varying vec3 vP; void main(){ float f = pow(1.0 - abs(dot(normalize(-vP), normalize(vN))), 3.0); gl_FragColor = vec4(vec3(1.0,0.95,0.9)*f*a, f*a); }` }));
      this.add(this.wave);
      this.light = new THREE.PointLight(0xffb070, 0, 3000, 1.2); this.add(this.light);
    }
  }
  // tau: seconds since detonation, S: scale (metres-ish)
  update(tau, S = 1) {
    this.visible = tau > 0; if (!this.visible) return;
    const rise = (1 - Math.exp(-tau * 0.45)) * 260 + tau * 6; // fireball altitude
    const R = (1 - Math.exp(-tau * 3)) * 55 + tau * 4;
    const heat = clamp(1.2 - tau * 0.22);
    this.fire.position.y = (40 + rise * smooth(tau / 1.5)) * S; this.fire.scale.setScalar(R * S * (1 - smooth((tau - 4) / 3) * 0.3));
    this.fire.visible = tau < 9; this.fireU.uT.value = tau; this.fireU.uHeat.value = heat;
    this.glow.position.copy(this.fire.position); const gs = (R * 6 + 300 * Math.exp(-tau * 2)) * S; this.glow.scale.set(gs, gs, 1); this.glow.material.opacity = clamp(Math.exp(-tau * 0.35));
    // cap torus: rolling puffs
    const capY = this.fire.position.y; const majR = (R * 0.9 + tau * 6) * S, minR = (R * 0.55 + tau * 3) * S; const capK = smooth((tau - 0.6) / 2.0);
    const P = this.cap.geometry.attributes.aPos, L = this.cap.geometry.attributes.aLife, C = this.cap.geometry.attributes.aColor;
    const roll = tau * 0.35;
    for (let i = 0; i < this.capData.length; i++) {
      const d = this.capData[i]; const b = d.b + roll; const rr = majR * capK + minR * Math.cos(b) * capK;
      P.setXYZ(i, Math.cos(d.a) * rr, capY + minR * Math.sin(b) * 0.8 * capK, Math.sin(d.a) * rr);
      const sz = (minR * 0.9 + 4 * S) * d.s * Math.max(capK, 0.05); L.setXYZW(i, -1, 1e9, sz, sz);
      const under = clamp(-Math.sin(b) * 0.5 + 0.5); const hotK = clamp(heat * 1.4 - 0.2) * (0.5 + under * 0.5);
      const base = 0.42 * d.sh; C.setXYZ(i, lerp(base, 3.2, hotK), lerp(base * 0.85, 1.2, hotK), lerp(base * 0.75, 0.35, hotK));
    }
    P.needsUpdate = L.needsUpdate = C.needsUpdate = true; this.cap.setTime(0); this.cap.visible = capK > 0.01;
    // stem
    const SP = this.stem.geometry.attributes.aPos, SL = this.stem.geometry.attributes.aLife, SC = this.stem.geometry.attributes.aColor; const stemK = smooth((tau - 0.3) / 2.5);
    for (let i = 0; i < this.stemData.length; i++) {
      const d = this.stemData[i]; const y = d.u * capY * stemK; const w = (10 + d.u * 14 + tau * 1.5) * S * (1.4 - d.u * 0.6);
      SP.setXYZ(i, Math.cos(d.a) * w * 0.35 * d.rr, y, Math.sin(d.a) * w * 0.35 * d.rr); const sz = w * d.s * 1.3; SL.setXYZW(i, -1, 1e9, sz, sz);
      const hotK = clamp(heat - d.u * 0.4) * 0.8; const base = 0.38; SC.setXYZ(i, lerp(base, 2.4, hotK), lerp(base * 0.85, 0.9, hotK), lerp(base * 0.75, 0.3, hotK));
    }
    SP.needsUpdate = SL.needsUpdate = SC.needsUpdate = true; this.stem.visible = stemK > 0.01; this.stem.setTime(0);
    if (this.skirt) { this.skirt.setTime(tau); this.skirt.scale.setScalar(S); }
    if (this.wave) { const wr = tau * 340 * S; this.wave.scale.set(wr, wr * 0.55, wr); this.wave.material.uniforms.a.value = clamp(1 - tau / 2.2) * 0.9; this.wave.visible = tau < 2.3; }
    if (this.light) { this.light.position.copy(this.fire.position); this.light.intensity = 4e6 * Math.exp(-tau * 0.8) * S * S + 2e5 * S * S; }
  }
}

export class NukeSet {
  constructor() { this.scene = new THREE.Scene(); }
  build(director) {
    const s = this.scene;
    this.sky = new SkyDome('golden'); this.sky.setPreset('golden', { cloudCover: 0.15, zenith: [0.06, 0.09, 0.2], horizon: [0.75, 0.45, 0.3], sunGlow: 0.6 }); this.sky.setSun(new THREE.Vector3(-0.7, 0.04, -0.7)); s.add(this.sky);
    s.environment = this.sky.makeEnv(director.renderer); s.environmentIntensity = 0.5;
    s.fog = new THREE.FogExp2(0x6a4a3a, 0.00022);
    const gt = concreteTexture(66, [168, 136, 98]); gt.repeat.set(400, 400);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshStandardMaterial({ map: gt, roughness: 1 })); ground.rotation.x = -Math.PI / 2; s.add(ground);
    // distant mesas / mountains
    const r = new RNG(5);
    for (let k = 0; k < 24; k++) { const a = r.next() * TAU, d = 9000 + r.next() * 6000; const m = new THREE.Mesh(jitterGeo(new THREE.ConeGeometry(800 + r.next() * 1500, 400 + r.next() * 900, 7, 2), 150, k), mat('#5a4636', { rough: 1, flat: true })); m.position.set(Math.cos(a) * d, 150, Math.sin(a) * d); s.add(m); }
    s.add(new THREE.HemisphereLight(0x5a6a9a, 0x3a2a1e, 0.6));
    this.dirL = new THREE.DirectionalLight(0xffa070, 0.6); this.dirL.position.set(-1, 0.1, -1); s.add(this.dirL);
    this.hero = new Mushroom(1, false); s.add(this.hero);
    this.field = []; const fr = new RNG(9);
    for (let i = -6; i <= 6; i++) for (let j = 1; j <= 7; j++) {
      if (fr.next() < 0.15) continue;
      const m = new Mushroom(100 + i * 10 + j, true); m.position.set(i * 1400 + (fr.next() - 0.5) * 700, 0, -j * 1500 + (fr.next() - 0.5) * 600); m.userData.delay = fr.next() * 2.2 + j * 0.15; m.userData.S = 0.9 + fr.next() * 0.5; s.add(m); this.field.push(m);
    }
  }
  // o: { tau (hero), fieldTau, field: bool }
  update(t, o = {}) {
    this.sky.setTime(t);
    this.hero.update(o.tau !== undefined ? o.tau : -1, o.heroScale || 1);
    for (const m of this.field) { m.visible = !!o.field; if (o.field) m.update((o.fieldTau || 0) - m.userData.delay, m.userData.S); }
  }
}
