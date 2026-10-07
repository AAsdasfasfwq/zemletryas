// Procedural sky dome (gradient + sun + soft clouds + stars) and matching PMREM environment.
import * as THREE from 'three';

const SKY_VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_FRAG = /* glsl */`
uniform vec3 zenith, horizon, ground, sunColor, cloudColor, cloudShadow; uniform vec3 sunDir;
uniform float sunSize, sunGlow, cloudCover, cloudSpeed, time, stars, horizonSharp, moon;
varying vec3 vDir;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<6;i++){ s+=a*n2(p); p=p*2.02+vec2(1.7,9.2); a*=0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float y = d.y;
  float hk = pow(clamp(1.0 - max(y, 0.0), 0.0, 1.0), horizonSharp);
  vec3 col = mix(zenith, horizon, hk);
  if(y < 0.0) col = mix(horizon, ground, smoothstep(0.0, -0.15, y));
  float sd = max(dot(d, normalize(sunDir)), 0.0);
  col += sunColor * (pow(sd, 6.0) * 0.35 + pow(sd, 64.0) * 0.8) * sunGlow;
  col += sunColor * smoothstep(1.0 - sunSize, 1.0 - sunSize*0.6, sd) * (moon > 0.5 ? 1.2 : 8.0);
  // clouds on a virtual plane
  if(y > 0.0 && cloudCover > 0.0){
    vec2 uv = d.xz / (y + 0.12) * 1.2 + vec2(time * cloudSpeed, time * cloudSpeed * 0.3);
    float c = fbm(uv * 0.9);
    float cov = smoothstep(1.0 - cloudCover, 1.0 - cloudCover + 0.35, c);
    float shade = fbm(uv * 0.9 + normalize(sunDir).xz * 0.15);
    vec3 cc = mix(cloudColor, cloudShadow, clamp((shade - c) * 4.0 + 0.4, 0.0, 1.0));
    cc += sunColor * pow(sd, 8.0) * 0.6 * (1.0 - cov*0.5);
    col = mix(col, cc, cov * smoothstep(0.0, 0.18, y));
  }
  if(stars > 0.0 && y > 0.0){
    vec2 sp = d.xz / (y + 0.3) * 160.0; vec2 cell = floor(sp); float rnd = h(cell);
    float star = step(0.985, rnd) * smoothstep(0.35, 0.0, length(fract(sp) - 0.5)) * (0.5 + 0.5*h(cell+3.1));
    col += vec3(star) * stars * smoothstep(0.0, 0.3, y);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export const SKY_PRESETS = {
  day: { zenith: [0.16, 0.36, 0.78], horizon: [0.78, 0.84, 0.92], ground: [0.35, 0.32, 0.30], sunColor: [1.0, 0.86, 0.62], cloudColor: [1.0, 0.97, 0.94], cloudShadow: [0.62, 0.66, 0.74], sunSize: 0.0012, sunGlow: 1.0, cloudCover: 0.42, stars: 0, horizonSharp: 4.0 },
  golden: { zenith: [0.14, 0.27, 0.58], horizon: [1.0, 0.70, 0.42], ground: [0.30, 0.22, 0.18], sunColor: [1.0, 0.62, 0.30], cloudColor: [1.0, 0.82, 0.66], cloudShadow: [0.55, 0.45, 0.52], sunSize: 0.0016, sunGlow: 1.6, cloudCover: 0.38, stars: 0, horizonSharp: 3.0 },
  overcast: { zenith: [0.42, 0.46, 0.52], horizon: [0.68, 0.70, 0.72], ground: [0.30, 0.30, 0.30], sunColor: [0.55, 0.55, 0.55], cloudColor: [0.70, 0.72, 0.76], cloudShadow: [0.45, 0.48, 0.53], sunSize: 0.0, sunGlow: 0.2, cloudCover: 0.95, stars: 0, horizonSharp: 2.0 },
  winterDusk: { zenith: [0.10, 0.14, 0.26], horizon: [0.46, 0.44, 0.52], ground: [0.12, 0.12, 0.14], sunColor: [0.9, 0.5, 0.35], cloudColor: [0.36, 0.38, 0.46], cloudShadow: [0.16, 0.17, 0.23], sunSize: 0.0, sunGlow: 0.5, cloudCover: 0.85, stars: 0, horizonSharp: 2.5 },
  night: { zenith: [0.006, 0.010, 0.030], horizon: [0.05, 0.07, 0.13], ground: [0.01, 0.01, 0.02], sunColor: [0.65, 0.75, 1.0], cloudColor: [0.06, 0.07, 0.11], cloudShadow: [0.02, 0.025, 0.04], sunSize: 0.0009, sunGlow: 0.25, cloudCover: 0.55, stars: 0.9, horizonSharp: 3.0, moon: 1 },
  stormNight: { zenith: [0.012, 0.016, 0.03], horizon: [0.09, 0.08, 0.10], ground: [0.01, 0.01, 0.015], sunColor: [0.3, 0.3, 0.4], cloudColor: [0.08, 0.08, 0.10], cloudShadow: [0.03, 0.03, 0.04], sunSize: 0.0, sunGlow: 0.0, cloudCover: 0.95, stars: 0, horizonSharp: 2.0 },
  dawnGrey: { zenith: [0.25, 0.28, 0.34], horizon: [0.62, 0.58, 0.55], ground: [0.22, 0.21, 0.2], sunColor: [0.9, 0.7, 0.5], cloudColor: [0.62, 0.62, 0.64], cloudShadow: [0.38, 0.39, 0.42], sunSize: 0.0, sunGlow: 0.4, cloudCover: 0.9, stars: 0, horizonSharp: 2.2 },
  dusty: { zenith: [0.45, 0.42, 0.38], horizon: [0.85, 0.72, 0.55], ground: [0.4, 0.33, 0.25], sunColor: [1.0, 0.75, 0.45], cloudColor: [0.85, 0.75, 0.62], cloudShadow: [0.55, 0.48, 0.42], sunSize: 0.002, sunGlow: 1.2, cloudCover: 0.3, stars: 0, horizonSharp: 2.5 },
};

export class SkyDome extends THREE.Mesh {
  constructor(preset = 'day') {
    const u = {};
    for (const k of ['zenith', 'horizon', 'ground', 'sunColor', 'cloudColor', 'cloudShadow']) u[k] = { value: new THREE.Color() };
    for (const k of ['sunSize', 'sunGlow', 'cloudCover', 'stars', 'horizonSharp', 'moon']) u[k] = { value: 0 };
    u.sunDir = { value: new THREE.Vector3(0.5, 0.3, -0.6).normalize() }; u.time = { value: 0 }; u.cloudSpeed = { value: 0.004 };
    const m = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: u, side: THREE.BackSide, depthWrite: false });
    super(new THREE.SphereGeometry(4000, 48, 24), m);
    this.frustumCulled = false; this.renderOrder = -100;
    this.onBeforeRender = (r, sc, cam) => { this.position.copy(cam.position); this.updateMatrixWorld(); };
    this.setPreset(preset);
  }
  setPreset(name, overrides = {}) {
    const p = { ...SKY_PRESETS[name], ...overrides }; const u = this.material.uniforms;
    for (const k of ['zenith', 'horizon', 'ground', 'sunColor', 'cloudColor', 'cloudShadow']) u[k].value.setRGB(...p[k]);
    for (const k of ['sunSize', 'sunGlow', 'cloudCover', 'stars', 'horizonSharp']) u[k].value = p[k];
    u.moon.value = p.moon || 0;
    this.preset = name;
  }
  setSun(dir) { this.material.uniforms.sunDir.value.copy(dir).normalize(); }
  setTime(t) { this.material.uniforms.time.value = t; }
  // render the dome alone into a PMREM env map
  makeEnv(renderer) {
    const sc = new THREE.Scene(); const clone = new THREE.Mesh(this.geometry, this.material); sc.add(clone);
    const pm = new THREE.PMREMGenerator(renderer);
    const rt = pm.fromScene(sc, 0.02, 0.1, 5000);
    pm.dispose();
    return rt.texture;
  }
}
