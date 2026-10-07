// Continental slabs floating on a simmering mantle: collide (mountains rise), grind past, pull apart.
import * as THREE from 'three';
import { strataTexture, glowTexture } from '../engine/textures.js';
import { RNG, TAU, clamp, lerp, smooth, ease, fbm2, noise2 } from '../engine/util.js';
import { mat, box, jitterGeo, shadowAll } from './kit.js';
import { dustBurst, sparkBurst, loopStream, Sprites } from '../engine/particles.js';

const LAVA_FRAG = /* glsl */`
uniform float time, glow; varying vec2 vP;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<6;i++){ s+=a*n2(p); p=p*2.03+vec2(3.1,1.7); a*=0.5;} return s; }
void main(){
  vec2 p = vP * 0.05;
  vec2 q = vec2(fbm(p + time*0.03), fbm(p + vec2(5.2,1.3) - time*0.025));
  float n = fbm(p * 1.5 + q * 2.0 + time * 0.02);
  float veins = smoothstep(0.02, 0.0, abs(fbm(p * 3.0 + q * 3.0) - 0.5)) ;
  vec3 crust = vec3(0.08, 0.03, 0.02);
  vec3 hot = mix(vec3(0.7, 0.1, 0.01), vec3(2.0, 0.75, 0.12), n);
  vec3 c = mix(crust, hot, smoothstep(0.35, 0.7, n)) + vec3(2.4, 1.0, 0.25) * veins * 0.6;
  gl_FragColor = vec4(c * glow, 1.0);
}`;

function slabShape(seed, R, flatSide) {
  const r = new RNG(seed); const sh = new THREE.Shape(); const n = 14; const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; let rr = R * (0.75 + r.next() * 0.4); let x = Math.cos(a) * rr * 1.25, y = Math.sin(a) * rr; if (flatSide && x * flatSide > R * 0.55) x = flatSide * (R * 0.55 + Math.abs(y) * 0.05 + (r.next() - 0.5) * 1.2); pts.push([x, y]); }
  pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  return sh;
}

export class PlatesSet {
  constructor() { this.scene = new THREE.Scene(); }
  build() {
    const s = this.scene; s.background = new THREE.Color(0x0a0302); s.fog = new THREE.FogExp2(0x1a0804, 0.0065);
    this.lavaU = { time: { value: 0 }, glow: { value: 1 } };
    const lava = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.ShaderMaterial({ uniforms: this.lavaU, vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }', fragmentShader: LAVA_FRAG }));
    lava.rotation.x = -Math.PI / 2; lava.position.y = -3.2; s.add(lava);
    s.add(new THREE.HemisphereLight(0x6a5a7a, 0xff5a1a, 0.9));
    this.key = new THREE.DirectionalLight(0xffe6c8, 2.2); this.key.position.set(-40, 60, 30); this.key.castShadow = true; this.key.shadow.mapSize.set(2048, 2048); const sc = this.key.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.far = 200; s.add(this.key);
    this.under = new THREE.PointLight(0xff5a10, 120, 120, 1.4); this.under.position.set(0, -2, 0); s.add(this.under);
    this.riftLight = new THREE.PointLight(0xff8a30, 0, 60, 1.5); s.add(this.riftLight);
    const side = strataTexture(31, ['#5a3f2e', '#6f4c36', '#4a3426', '#7d5a40', '#3e2c22']); side.repeat.set(0.06, 0.25);
    this.slabs = [];
    [[-1, 101], [1, 202]].forEach(([sideSign, seed]) => {
      const g = new THREE.Group(); s.add(g);
      const shape = slabShape(seed, 26, -sideSign);
      const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.5, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ map: side, roughness: 0.95 }));
      body.rotation.x = -Math.PI / 2; body.position.y = -5; body.castShadow = true; body.receiveShadow = true; g.add(body);
      // terrain top: subdivided shape with heights (mountains rise near the colliding edge)
      const top = new THREE.ShapeGeometry(shape, 1); const tg = this.tessellate(shape, 1.0);
      const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
      const tm = new THREE.Mesh(tg, m); tm.rotation.x = -Math.PI / 2; tm.position.y = 0.02; tm.castShadow = true; tm.receiveShadow = true; g.add(tm);
      // tiny city & forests on top
      const cityG = new THREE.Group(); g.add(cityG); const r = new RNG(seed + 7);
      const houseM = mat('#efe6d6', { rough: 0.8 }); const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 1.7, 0.8) });
      const TP = tg.attributes.position; const vtx = (k) => { const i = Math.floor(r.next() * TP.count); return [TP.getX(i), TP.getZ(i), -TP.getY(i)]; };
      for (let k = 0; k < 40; k++) { let v = vtx(); for (let tries = 0; tries < 20 && !(v[0] * sideSign < -2 && v[0] * sideSign > -11); tries++) v = vtx(); const h = 0.4 + r.next() * 1.2; const b = box(0.6, h, 0.6, houseM, v[0], v[1] + h / 2, v[2]); cityG.add(b); if (r.chance(0.5)) cityG.add(box(0.62, 0.08, 0.62, winM, v[0], v[1] + h * 0.6, v[2])); }
      const treeM = mat('#2f5d2a', { rough: 0.9, flat: true }); const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(0.35, 1.0, 6), treeM, 160); const dm = new THREE.Object3D();
      for (let k = 0; k < 160; k++) { const v = vtx(); dm.position.set(v[0], v[1] + 0.5, v[2]); dm.scale.setScalar(0.7 + r.next() * 0.8); dm.updateMatrix(); trees.setMatrixAt(k, dm.matrix); } trees.castShadow = true; g.add(trees);
      g.userData = { side: sideSign, tm, tg, base: tg.attributes.position.array.slice(), cityG, trees, shape };
      this.slabs.push(g);
    });
    this.dust = dustBurst({ count: 160, center: [0, 1, 0], radius: 6, height: 4, speed: 8, spread: 3, life: [4, 9], size: [3, 14], color: [0.55, 0.42, 0.32], seed: 6, opacity: 0.85 }); s.add(this.dust);
    this.sparks = sparkBurst({ count: 200, center: [0, 0.5, 0], speed: 10, seed: 3, spread: 3.5, color: [1, 0.6, 0.25] }); s.add(this.sparks);
    this.steam = loopStream({ count: 80, origin: [0, -2, 0], jitter: 6, vel: [0, 3, 0], velJitter: 0.8, life: 5, size: [2, 9], color: [0.9, 0.6, 0.45], seed: 9, opacity: 0.35 }); s.add(this.steam);
    this.embers = new Sprites(220, (i, r) => ({ pos: [(r.next() - 0.5) * 200, -3 + r.next() * 30, (r.next() - 0.5) * 200], vel: [0.2, 0.6, 0], birth: -r.next() * 50, life: 50, size0: 0.15, size1: 0.05, color: [3, 1.2, 0.3], alpha: 0.8 }), { map: glowTexture(), additive: true, fadeIn: 0.1, fadeOut: 0.3, turb: 0.3 });
    s.add(this.embers);
  }
  tessellate(shape, step) {
    const g = new THREE.ShapeGeometry(shape, 1); g.computeBoundingBox(); const bb = g.boundingBox;
    const pts = shape.getPoints(64); const inside = (x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const pos = [], col = []; const nx = Math.ceil((bb.max.x - bb.min.x) / step), ny = Math.ceil((bb.max.y - bb.min.y) / step);
    const H = (x, y) => (fbm2(x * 0.06, y * 0.06, 4) * 0.5 + 0.5) * 1.2;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const x0 = bb.min.x + i * step, y0 = bb.min.y + j * step; const c = [[x0, y0], [x0 + step, y0], [x0 + step, y0 + step], [x0, y0 + step]];
      if (!c.every(([x, y]) => inside(x, y))) continue;
      for (const tri of [[0, 1, 2], [0, 2, 3]]) for (const k of tri) { pos.push(c[k][0], c[k][1], H(c[k][0], c[k][1])); col.push(0.3, 0.45, 0.2); }
    }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); out.computeVertexNormals(); return out;
  }
  // o: { mode: 'drift'|'collide'|'grind'|'apart', p (0..1 progress), impactT, quakeCity (0..1) }
  update(t, o = {}) {
    this.lavaU.time.value = t; this.embers.setTime(t);
    const mode = o.mode || 'drift'; const p = o.p || 0;
    const [A, B] = this.slabs;
    let gap = 14, slideZ = 0, mount = 0;
    if (mode === 'drift') { gap = 14 - p * 4; }
    else if (mode === 'collide') { gap = Math.max(0, 10 * (1 - ease.inQuad(clamp(p * 1.4)))); mount = clamp((p - 0.6) / 0.4) * (o.mountMax || 1); }
    else if (mode === 'grind') { gap = 0.2; slideZ = (p - 0.5) * 18; }
    else if (mode === 'apart') { gap = p * 12; }
    if (o.mount !== undefined) mount = o.mount;
    A.position.set(-gap / 2 - 14, 0, slideZ / 2); B.position.set(gap / 2 + 14, 0, -slideZ / 2);
    const bob = Math.sin(t * 0.4) * 0.15; A.position.y = bob; B.position.y = -bob;
    // mountains along the colliding edges (+x edge of A, -x edge of B)
    for (const S of this.slabs) {
      const { tg, base, side } = S.userData; const P = tg.attributes.position, C = tg.attributes.color;
      for (let i = 0; i < P.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1], z0 = base[i * 3 + 2];
        const edgeX = -side * 14.3; const d = Math.abs(x - edgeX); const ridge = Math.exp(-(d * d) / 22) * (0.6 + 0.7 * (noise2(x * 0.4, y * 0.4) * 0.5 + 0.5)) * 9 * mount;
        const z = z0 + ridge; P.setZ(i, z);
        const snow = smooth((z - 9.5) / 2.0) * 0.8; const rock = smooth((z - 2.2) / 2);
        C.setXYZ(i, lerp(lerp(0.30, 0.42, rock), 0.92, snow), lerp(lerp(0.46, 0.33, rock), 0.93, snow), lerp(lerp(0.2, 0.26, rock), 0.97, snow));
      }
      P.needsUpdate = C.needsUpdate = true; tg.computeVertexNormals();
      // tiny city wobble / collapse when 'wipe out cities'
      const qc = o.quakeCity || 0; S.userData.cityG.children.forEach((b, k) => { b.rotation.z = qc > 0 ? Math.sin(t * 30 + k) * 0.08 * qc : 0; b.scale.y = 1 - clamp(qc * 1.6 - (k % 5) * 0.12) * 0.85; });
    }
    const imp = o.impactT;
    this.dust.visible = imp !== undefined && imp >= 0; if (this.dust.visible) this.dust.setTime(imp);
    this.sparks.visible = mode === 'grind' || (imp !== undefined && imp >= 0 && imp < 3); this.sparks.setTime(mode === 'grind' ? (t % 3) : imp || 0);
    this.steam.visible = mode === 'apart'; this.steam.setTime(t);
    this.riftLight.intensity = mode === 'apart' ? 200 * p : 0; this.riftLight.position.set(0, 1, 0);
    this.lavaU.glow.value = o.glow !== undefined ? o.glow : 1;
  }
}
