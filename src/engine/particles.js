// GPU particle systems with analytic (seekable) motion.
// Every particle's state is a closed-form function of (uTime - birth), so any frame can be
// rendered in any order — required for frame-by-frame Puppeteer export.
import * as THREE from 'three';
import { RNG, TAU } from './util.js';
import { puffTexture, sparkTexture, glowTexture } from './textures.js';

const SPRITE_VERT = /* glsl */`
attribute vec3 aPos; attribute vec3 aVel; attribute vec4 aLife; // birth, life, size0, size1
attribute vec4 aExtra; // seed, rot, spin, alpha
attribute vec3 aColor;
uniform float uTime; uniform vec3 uGravity; uniform float uDrag; uniform float uFadeIn; uniform float uFadeOut;
uniform float uStretch; uniform vec3 uWind; uniform float uTurb; uniform float uFloorY;
varying vec2 vUv; varying float vAlpha; varying vec3 vColor; varying float vAge;
void main(){
  float age = uTime - aLife.x; float life = aLife.y;
  vUv = uv; vColor = aColor;
  if(age < 0.0 || age > life){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vAlpha = 0.0; return; }
  float k = age / life; vAge = k;
  float f = uDrag > 0.0 ? (1.0 - exp(-uDrag * age)) / uDrag : age;
  vec3 p = aPos + aVel * f + 0.5 * uGravity * age * age + uWind * age;
  p += uTurb * vec3(sin(age*1.3 + aExtra.x*6.28), sin(age*0.9 + aExtra.x*3.1)*0.5, cos(age*1.1 + aExtra.x*4.7)) * age;
  p.y = max(p.y, uFloorY);
  float size = mix(aLife.z, aLife.w, sqrt(k));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float r = aExtra.y + aExtra.z * age;
  vec2 c = position.xy;
  if(uStretch > 0.0){
    vec3 vel = aVel * exp(-uDrag*age) + uGravity * age;
    vec3 vv = (modelViewMatrix * vec4(vel, 0.0)).xyz; vec2 d = vv.xy; float L = length(d);
    vec2 dir = L > 1e-4 ? d / L : vec2(0.0, 1.0); vec2 nrm = vec2(-dir.y, dir.x);
    vec2 cc = nrm * c.x * size + dir * c.y * (size + L * uStretch);
    mv.xy += cc;
  } else {
    mv.xy += vec2(c.x*cos(r) - c.y*sin(r), c.x*sin(r) + c.y*cos(r)) * size;
  }
  gl_Position = projectionMatrix * mv;
  float fi = uFadeIn > 0.0 ? smoothstep(0.0, uFadeIn, k) : 1.0;
  float fo = uFadeOut > 0.0 ? 1.0 - smoothstep(1.0 - uFadeOut, 1.0, k) : 1.0;
  vAlpha = aExtra.w * fi * fo;
}`;
const SPRITE_FRAG = /* glsl */`
uniform sampler2D map; uniform vec3 uColor; uniform float uOpacity; uniform vec3 uHot; uniform float uHotFade;
varying vec2 vUv; varying float vAlpha; varying vec3 vColor; varying float vAge;
void main(){
  vec4 t = texture2D(map, vUv);
  vec3 c = uColor * vColor * (0.65 + 0.35 * t.r);
  if(uHotFade > 0.0) c = mix(uHot, c, smoothstep(0.0, uHotFade, vAge));
  float a = t.a * vAlpha * uOpacity;
  if(a < 0.003) discard;
  gl_FragColor = vec4(c, a);
}`;

/**
 * spawn(i, rng) must return { pos:[x,y,z], vel:[x,y,z], birth, life, size0, size1, color:[r,g,b], alpha, rot, spin }
 */
export class Sprites extends THREE.Mesh {
  constructor(count, spawn, o = {}) {
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    const aPos = new Float32Array(count * 3), aVel = new Float32Array(count * 3), aLife = new Float32Array(count * 4), aExtra = new Float32Array(count * 4), aColor = new Float32Array(count * 3);
    const rng = new RNG(o.seed || 1);
    for (let i = 0; i < count; i++) {
      const s = spawn(i, rng);
      aPos.set(s.pos, i * 3); aVel.set(s.vel || [0, 0, 0], i * 3);
      aLife.set([s.birth || 0, s.life || 1, s.size0 || 1, s.size1 === undefined ? s.size0 || 1 : s.size1], i * 4);
      aExtra.set([rng.next(), s.rot === undefined ? rng.next() * TAU : s.rot, s.spin || 0, s.alpha === undefined ? 1 : s.alpha], i * 4);
      aColor.set(s.color || [1, 1, 1], i * 3);
    }
    g.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3));
    g.setAttribute('aVel', new THREE.InstancedBufferAttribute(aVel, 3));
    g.setAttribute('aLife', new THREE.InstancedBufferAttribute(aLife, 4));
    g.setAttribute('aExtra', new THREE.InstancedBufferAttribute(aExtra, 4));
    g.setAttribute('aColor', new THREE.InstancedBufferAttribute(aColor, 3));
    g.instanceCount = count;
    const m = new THREE.ShaderMaterial({
      vertexShader: SPRITE_VERT, fragmentShader: SPRITE_FRAG,
      uniforms: {
        map: { value: o.map || puffTexture(o.puffSeed || 1) }, uTime: { value: 0 }, uGravity: { value: new THREE.Vector3(...(o.gravity || [0, 0, 0])) },
        uDrag: { value: o.drag || 0 }, uFadeIn: { value: o.fadeIn === undefined ? 0.1 : o.fadeIn }, uFadeOut: { value: o.fadeOut === undefined ? 0.5 : o.fadeOut },
        uColor: { value: new THREE.Color(...(o.color || [1, 1, 1])) }, uOpacity: { value: o.opacity === undefined ? 1 : o.opacity },
        uStretch: { value: o.stretch || 0 }, uWind: { value: new THREE.Vector3(...(o.wind || [0, 0, 0])) }, uTurb: { value: o.turb || 0 },
        uHot: { value: new THREE.Color(...(o.hot || [1, 1, 1])) }, uHotFade: { value: o.hotFade || 0 }, uFloorY: { value: o.floorY === undefined ? -1e5 : o.floorY },
      },
      transparent: true, depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    super(g, m);
    this.frustumCulled = false; this.renderOrder = o.renderOrder || 10;
  }
  setTime(t) { this.material.uniforms.uTime.value = t; }
  set opacity(v) { this.material.uniforms.uOpacity.value = v; }
  get opacity() { return this.material.uniforms.uOpacity.value; }
}

// ------ presets ------
// Dust/smoke burst (e.g. collapsing building). Births spread over `spread` seconds.
export function dustBurst({ count = 160, center = [0, 0, 0], radius = 8, height = 20, speed = 6, spread = 2.5, life = [6, 12], size = [6, 22], color = [0.75, 0.70, 0.62], seed = 1, opacity = 0.85, rise = 0.6 } = {}) {
  return new Sprites(count, (i, r) => {
    const a = r.next() * TAU, rr = Math.sqrt(r.next()) * radius;
    const y = r.next() * height;
    const out = speed * (0.4 + r.next() * 0.8);
    const shade = 0.85 + r.next() * 0.3;
    return {
      pos: [center[0] + Math.cos(a) * rr, center[1] + y, center[2] + Math.sin(a) * rr],
      vel: [Math.cos(a) * out, rise * (r.next() * 3), Math.sin(a) * out],
      birth: Math.pow(r.next(), 1.6) * spread, life: life[0] + r.next() * (life[1] - life[0]),
      size0: size[0] * (0.6 + r.next() * 0.6), size1: size[1] * (0.7 + r.next() * 0.6),
      color: [color[0] * shade, color[1] * shade, color[2] * shade], alpha: 0.5 + r.next() * 0.5, spin: (r.next() - 0.5) * 0.3,
    };
  }, { seed, drag: 0.6, fadeIn: 0.08, fadeOut: 0.6, opacity, gravity: [0, 0.15, 0], turb: 0.25 });
}

// Continuous emitter (smoke column / fire / steam) with N particles looping over `period`
export function stream({ count = 120, origin = [0, 0, 0], jitter = 0.5, vel = [0, 3, 0], velJitter = 0.6, life = 4, size = [0.5, 3], color = [0.2, 0.2, 0.2], additive = false, seed = 3, opacity = 1, map = null, hot = null, hotFade = 0, gravity = [0, 0, 0], drag = 0.3, wind = [0, 0, 0], loops = 400, fadeIn = 0.15, fadeOut = 0.5, stretch = 0 } = {}) {
  // births tile a long time range so the stream runs continuously for `loops * life` seconds
  const total = count;
  return new Sprites(total, (i, r) => {
    const sh = 0.8 + r.next() * 0.4;
    return {
      pos: [origin[0] + (r.next() - 0.5) * jitter, origin[1] + (r.next() - 0.5) * jitter * 0.3, origin[2] + (r.next() - 0.5) * jitter],
      vel: [vel[0] + (r.next() - 0.5) * velJitter, vel[1] * (0.7 + r.next() * 0.6), vel[2] + (r.next() - 0.5) * velJitter],
      birth: 0, life: life * (0.8 + r.next() * 0.4), size0: size[0] * (0.7 + r.next() * 0.6), size1: size[1] * (0.7 + r.next() * 0.6),
      color: [color[0] * sh, color[1] * sh, color[2] * sh], alpha: 0.6 + r.next() * 0.4, spin: (r.next() - 0.5) * 0.8,
    };
  }, { seed, additive, opacity, map, hot, hotFade, gravity, drag, wind, fadeIn, fadeOut, stretch, turb: 0.15 });
}

// A looping stream needs births that wrap: we emulate with a shader-side modulo by using
// an alternative material. Simpler: LoopSprites recomputes uTime per particle via mod.
const LOOP_VERT = SPRITE_VERT.replace('float age = uTime - aLife.x;', 'float age = mod(uTime - aLife.x, aLife.y);');
export function loopStream(o) {
  const s = stream(o);
  const r = new RNG((o.seed || 3) + 77);
  const L = s.geometry.attributes.aLife;
  for (let i = 0; i < L.count; i++) L.setX(i, -r.next() * L.getY(i)); // stagger phases
  s.material.vertexShader = LOOP_VERT; s.material.needsUpdate = true;
  return s;
}

// Falling snow / rain filling a box around a moving center (wraps seamlessly)
const PRECIP_VERT = /* glsl */`
attribute vec3 aPos; attribute vec4 aExtra;
uniform float uTime; uniform vec3 uBox; uniform vec3 uCenter; uniform float uFall; uniform vec3 uWind; uniform float uSize; uniform float uStreak; uniform float uSway;
varying vec2 vUv; varying float vA;
void main(){
  vUv = uv;
  vec3 p = aPos * uBox;
  p.y -= uTime * uFall * (0.8 + aExtra.x * 0.4);
  p.xz += uWind.xz * uTime;
  p.x += sin(uTime * (0.8 + aExtra.y) + aExtra.z * 6.28) * uSway;
  p.z += cos(uTime * (0.7 + aExtra.x) + aExtra.y * 6.28) * uSway;
  vec3 rel = p - uCenter + uBox * 0.5;
  rel = mod(rel, uBox) - uBox * 0.5;
  vec3 wp = uCenter + rel;
  vec4 mv = modelViewMatrix * vec4(wp, 1.0);
  float s = uSize * (0.6 + aExtra.w * 0.8);
  vec2 c = position.xy;
  if(uStreak > 0.0){
    vec3 vel = vec3(uWind.x, -uFall, uWind.z);
    vec2 d = (modelViewMatrix * vec4(vel, 0.0)).xy; float L = length(d); vec2 dir = L > 1e-4 ? d/L : vec2(0.0,1.0); vec2 n = vec2(-dir.y, dir.x);
    mv.xy += n * c.x * s * 0.35 + dir * c.y * (s + L * uStreak);
  } else mv.xy += c * s;
  gl_Position = projectionMatrix * mv;
  float dist = length(rel.xz) / (uBox.x*0.5);
  vA = (1.0 - smoothstep(0.7, 1.0, dist)) * (0.5 + aExtra.w*0.5);
}`;
const PRECIP_FRAG = /* glsl */`
uniform sampler2D map; uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; varying float vA;
void main(){ float a = texture2D(map, vUv).a * vA * uOpacity; if(a < 0.004) discard; gl_FragColor = vec4(uColor, a); }`;

export class Precip extends THREE.Mesh {
  constructor({ count = 6000, box = [80, 40, 80], fall = 1.5, wind = [0.5, 0, 0.2], size = 0.12, streak = 0, sway = 0.6, color = [1, 1, 1], opacity = 0.9, seed = 5, additive = false } = {}) {
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    const r = new RNG(seed); const aPos = new Float32Array(count * 3), aExtra = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) { aPos.set([r.next(), r.next(), r.next()], i * 3); aExtra.set([r.next(), r.next(), r.next(), r.next()], i * 4); }
    g.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3)); g.setAttribute('aExtra', new THREE.InstancedBufferAttribute(aExtra, 4)); g.instanceCount = count;
    const m = new THREE.ShaderMaterial({
      vertexShader: PRECIP_VERT, fragmentShader: PRECIP_FRAG, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        map: { value: streak ? glowTexture() : sparkTexture() }, uTime: { value: 0 }, uBox: { value: new THREE.Vector3(...box) }, uCenter: { value: new THREE.Vector3() },
        uFall: { value: fall }, uWind: { value: new THREE.Vector3(...wind) }, uSize: { value: size }, uStreak: { value: streak }, uSway: { value: sway },
        uColor: { value: new THREE.Color(...color) }, uOpacity: { value: opacity },
      },
    });
    super(g, m); this.frustumCulled = false; this.renderOrder = 20;
  }
  update(t, center) { this.material.uniforms.uTime.value = t; if (center) this.material.uniforms.uCenter.value.copy(center); }
  set opacity(v) { this.material.uniforms.uOpacity.value = v; this.visible = v > 0.001; }
}

// sparks: additive streaks with gravity
export function sparkBurst({ count = 120, center = [0, 0, 0], speed = 12, life = [0.6, 1.6], size = 0.08, seed = 9, color = [1, 0.7, 0.3], spread = 0.15, up = 0.5, floorY = -1e5 } = {}) {
  return new Sprites(count, (i, r) => {
    const a = r.next() * TAU, e = (r.next() * 0.9 + up * 0.1) * Math.PI * 0.5; const v = speed * (0.3 + r.next() * 0.9);
    return { pos: center, vel: [Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v * (0.5 + up), Math.sin(a) * Math.cos(e) * v], birth: r.next() * spread, life: life[0] + r.next() * (life[1] - life[0]), size0: size, size1: size * 0.5, color: [color[0] * 3, color[1] * 3, color[2] * 3], alpha: 1 };
  }, { seed, additive: true, gravity: [0, -9.8, 0], drag: 0.8, stretch: 0.05, fadeIn: 0, fadeOut: 0.4, map: sparkTexture(), floorY });
}

// fire: additive flames that cool from white-yellow to deep red
export function fireStream({ origin = [0, 0, 0], radius = 0.4, height = 2.5, count = 90, seed = 13, scale = 1 } = {}) {
  return loopStream({ count, origin, jitter: radius * 2, vel: [0, height * 1.1, 0], velJitter: radius, life: 1.1, size: [0.7 * scale, 0.15 * scale], color: [3.2, 1.25, 0.32], additive: true, seed, map: glowTexture(), hot: [4.5, 3.2, 1.6], hotFade: 0.45, drag: 0.4, fadeIn: 0.1, fadeOut: 0.55 });
}
export function smokeStream({ origin = [0, 0, 0], count = 70, seed = 17, height = 6, color = [0.1, 0.09, 0.085], size = [1, 6], life = 7, wind = [0.6, 0, 0.2], opacity = 0.75 } = {}) {
  return loopStream({ count, origin, jitter: 0.6, vel: [0, height / life * 2, 0], velJitter: 0.4, life, size, color, seed, wind, drag: 0.35, opacity, fadeIn: 0.12, fadeOut: 0.6 });
}
