// Planet Earth set: real coastlines (Natural Earth), biome colouring, clouds, atmosphere,
// night lights, glowing plate boundaries, cut-away interior (crust/mantle/core) with convection.
import * as THREE from 'three';
import { GLOBE_LAND } from '../data/geo.js';
import { canvasTex, makeCanvas, glowTexture } from '../engine/textures.js';
import { RNG, fbm2, noise2, clamp, lerp, smooth, TAU } from '../engine/util.js';

export const R = 10;
export function lonLatToVec(lon, lat, r = R, out = new THREE.Vector3()) {
  const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
  return out.set(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

// approximate major plate boundaries [lon, lat] (artistic but geographically plausible)
export const PLATE_LINES = [
  // Mid-Atlantic Ridge
  [[-20, 72], [-17, 65], [-28, 57], [-33, 50], [-29, 42], [-38, 32], [-46, 22], [-44, 12], [-33, 5], [-17, 0], [-13, -8], [-14, -20], [-13, -32], [-16, -45], [-10, -54], [0, -55], [15, -54], [30, -50]],
  // SW Indian ridge -> Central Indian ridge -> Carlsberg -> Gulf of Aden -> Red Sea
  [[30, -50], [45, -42], [58, -33], [67, -25], [68, -12], [66, 0], [60, 10], [51, 13], [44, 12], [40, 17], [36, 23], [33, 28], [35, 31], [36, 35]],
  // SE Indian ridge
  [[68, -25], [78, -35], [95, -44], [115, -50], [140, -55], [160, -60], [180, -64]],
  // East African Rift
  [[42, 11], [39, 6], [36, 0], [35, -8], [34, -16], [35, -24]],
  // Alpine - Himalayan belt
  [[-28, 38], [-12, 36], [0, 36.5], [10, 37], [16, 38], [20, 36], [24, 34.5], [29, 35], [33, 34.5], [36, 36], [38.5, 37.5], [42, 38.3], [44.5, 37], [47, 34], [51, 30], [56, 27], [62, 25], [66, 26], [69, 30], [73, 34], [78, 33], [84, 29], [90, 28], [95, 27], [96, 20], [94, 12], [93, 5], [97, 1], [101, -4], [106, -8], [115, -10], [123, -10], [130, -7], [134, -4], [142, -3], [150, -6], [156, -8], [165, -12], [172, -16], [178, -18]],
  // North Anatolian fault
  [[41, 39.3], [39.5, 39.75], [37, 40.6], [34, 41.0], [31.6, 40.75], [29.9, 40.75], [28, 40.8], [26.3, 40.5], [24, 39.5]],
  // West Pacific: Kuril-Japan-Izu-Mariana-Philippines
  [[163, 56], [158, 51], [152, 46], [146, 42], [143, 37], [142, 32], [142, 25], [145, 17], [146, 11], [138, 8], [128, 6], [126, 12], [122, 19], [122, 24], [126, 29], [131, 33], [136, 34]],
  // Aleutians - Alaska - NA west coast
  [[163, 56], [175, 52], [-175, 51], [-165, 53], [-155, 56], [-147, 59], [-137, 57], [-131, 52], [-127, 47], [-125, 41], [-121, 36], [-116, 32], [-110, 24], [-107, 20]],
  // East Pacific Rise
  [[-107, 20], [-104, 10], [-103, 0], [-108, -10], [-112, -22], [-113, -32], [-116, -45], [-118, -55], [-130, -62], [-150, -64], [-180, -64]],
  // Central/South America trench
  [[-107, 20], [-100, 16], [-92, 13], [-86, 10], [-80, 5], [-81, -3], [-78, -10], [-72, -18], [-71, -28], [-74, -38], [-76, -46], [-75, -53], [-68, -57]],
  // Tonga - Kermadec - New Zealand
  [[-172, -15], [-174, -22], [-177, -30], [-179, -37], [176, -42], [170, -47], [163, -52], [158, -58]],
  // Caribbean & Scotia (short)
  [[-86, 10], [-82, 17], [-74, 19], [-64, 18], [-61, 15], [-60, 11], [-64, 10], [-74, 11], [-80, 9]],
  [[-68, -57], [-55, -54], [-30, -56], [-27, -59], [-40, -61], [-58, -61]],
];

// Biomes: soft, noise-distorted regions (no hard edges)
function softBox(lon, lat, lo0, lo1, la0, la1, w) {
  const sx = smooth((lon - lo0) / w) * smooth((lo1 - lon) / w); const sy = smooth((lat - la0) / w) * smooth((la1 - lat) / w); return sx * sy;
}
function biome(lon, lat, n, n2) {
  const a = Math.abs(lat);
  const dl = (n - 0.5) * 9, dt = (n2 - 0.5) * 6; const L = lon + dl, A = lat + dt;
  let desert = Math.max(
    softBox(L, A, -17, 58, 15, 33, 5) * 1.0, softBox(L, A, 44, 70, 24, 40, 5) * 0.85, softBox(L, A, 118, 146, -32, -19, 5) * 0.95,
    softBox(L, A, 85, 118, 37, 47, 5) * 0.8, softBox(L, A, -118, -103, 25, 38, 4) * 0.7, softBox(L, A, -73, -66, -30, -15, 3) * 0.75,
    softBox(L, A, 12, 26, -30, -17, 4) * 0.65, softBox(L, A, 52, 75, 36, 46, 5) * 0.55);
  desert = clamp(desert * (0.85 + n * 0.3));
  const savanna = clamp(Math.max(softBox(L, A, -17, 50, 6, 17, 6), softBox(L, A, 12, 40, -20, -8, 6), softBox(L, A, 125, 150, -22, -12, 5), softBox(L, A, -65, -40, -22, -8, 6)) * (1 - desert));
  const rain = clamp(Math.max(softBox(L, A, -78, -48, -14, 6, 6), softBox(L, A, 8, 31, -6, 6, 5), softBox(L, A, 95, 155, -10, 12, 6)) * (1 - desert));
  const boreal = clamp((a - 52 + dt) / 10) * (lat > 0 ? 1 : 0);
  const tundra = clamp((a - 64 + dt) / 6);
  const ice = (lat < -62) || (lat > 60 && lon > -55 && lon < -18) ? 1 : clamp((a - 74) / 5);
  let c = [0.34, 0.47, 0.22];
  c = mixc(c, [0.62, 0.58, 0.30], savanna * 0.85);
  c = mixc(c, [0.12, 0.33, 0.12], rain);
  c = mixc(c, [0.83, 0.68, 0.45], desert);
  c = mixc(c, [0.22, 0.34, 0.20], boreal * (1 - desert));
  c = mixc(c, [0.52, 0.50, 0.40], tundra);
  c = mixc(c, [0.55, 0.47, 0.36], clamp((n2 - 0.6) * 1.5) * 0.5);
  c = mixc(c, [0.94, 0.96, 1.0], ice);
  return c;
}
function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

function buildEarthTextures() {
  const W = 2048, H = 1024;
  // land mask
  const mask = makeCanvas(W, H); const mg = mask.getContext('2d');
  mg.fillStyle = '#000'; mg.fillRect(0, 0, W, H); mg.fillStyle = '#fff';
  const px = (lon, lat) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
  for (const ring of GLOBE_LAND) {
    // unwrap longitudes so rings crossing the antimeridian stay continuous, then draw shifted copies
    const un = []; let off = 0;
    ring.forEach(([lo, la], i) => { if (i > 0) { const d = lo - ring[i - 1][0]; if (d > 180) off -= 360; else if (d < -180) off += 360; } un.push([lo + off, la]); });
    for (const shift of [-360, 0, 360]) {
      mg.beginPath();
      un.forEach(([lo, la], i) => { const [x, y] = px(lo + shift, la); if (i === 0) mg.moveTo(x, y); else mg.lineTo(x, y); });
      mg.closePath(); mg.fill();
    }
  }
  // Antarctica is partially missing from 50m rings near the pole: fill polar cap
  mg.fillRect(0, H * (155 / 180), W, H);
  const md = mg.getImageData(0, 0, W, H).data;
  // blurred mask for shallow water halo
  const blur = makeCanvas(W / 4, H / 4); const bg = blur.getContext('2d'); bg.filter = 'blur(3px)'; bg.drawImage(mask, 0, 0, W / 4, H / 4);
  const bd = bg.getImageData(0, 0, W / 4, H / 4).data;

  const colorC = makeCanvas(W, H); const cg = colorC.getContext('2d'); const cimg = cg.createImageData(W, H); const cd = cimg.data;
  const roughC = makeCanvas(W, H); const rg = roughC.getContext('2d'); const rimg = rg.createImageData(W, H); const rd = rimg.data;
  const bumpC = makeCanvas(W, H); const bmg = bumpC.getContext('2d'); const bimg = bmg.createImageData(W, H); const bmd = bimg.data;
  const nightC = makeCanvas(W, H); const ng = nightC.getContext('2d'); ng.fillStyle = '#000'; ng.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y++) {
    const lat = 90 - (y / H) * 180;
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * 360 - 180; const i = (y * W + x) * 4;
      const land = md[i] / 255;
      const sx = Math.floor(x / 4), sy = Math.floor(y / 4); const near = bd[(sy * (W / 4) + sx) * 4] / 255;
      const n = fbm2(x / 90, y / 90, 4) * 0.5 + 0.5; const n2 = fbm2(x / 25 + 9, y / 25, 3) * 0.5 + 0.5;
      let c;
      if (land > 0.5) {
        c = biome(lon, lat, n, n2);
        const k = 0.82 + n2 * 0.3; c = [c[0] * k, c[1] * k, c[2] * k];
        rd[i] = rd[i + 1] = rd[i + 2] = 235;
        const mount = clamp((fbm2(x / 40 + 3, y / 40, 5) - 0.05) * 2.2);
        bmd[i] = bmd[i + 1] = bmd[i + 2] = 60 + mount * 195;
      } else {
        const deep = [0.03, 0.12, 0.33], shallow = [0.07, 0.40, 0.55];
        c = mixc(deep, shallow, smooth(near * 1.4) * 0.9);
        c = mixc(c, [0.04, 0.16, 0.38], n * 0.3);
        rd[i] = rd[i + 1] = rd[i + 2] = 95 + n * 30;
        bmd[i] = bmd[i + 1] = bmd[i + 2] = 40;
      }
      cd[i] = c[0] * 255; cd[i + 1] = c[1] * 255; cd[i + 2] = c[2] * 255; cd[i + 3] = 255;
      rd[i + 3] = 255; bmd[i + 3] = 255;
    }
  }
  cg.putImageData(cimg, 0, 0); rg.putImageData(rimg, 0, 0); bmg.putImageData(bimg, 0, 0);
  // night lights: clusters on populated land bands
  const r = new RNG(42);
  const hubs = [[-74, 40.7], [-87, 41.8], [-118, 34], [-0.1, 51.5], [2.3, 48.8], [13.4, 52.5], [37.6, 55.7], [28.9, 41], [32.8, 39.9], [37.4, 37.1], [36.9, 37.6], [36.2, 36.2], [37.2, 36.2], [31.2, 30], [44.4, 33.3], [51.4, 35.7], [77.2, 28.6], [72.8, 19], [88.3, 22.5], [116.4, 39.9], [121.5, 31.2], [113.3, 23.1], [139.7, 35.7], [126.9, 37.5], [-46.6, -23.5], [-43.2, -22.9], [-58.4, -34.6], [151.2, -33.9], [18.4, -33.9], [3.4, 6.5], [-99.1, 19.4], [100.5, 13.7], [106.8, -6.2], [9.2, 45.4], [-3.7, 40.4], [12.5, 41.9], [23.7, 37.9], [35.2, 31.8], [46.7, 24.7], [55.3, 25.2]];
  ng.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 9000; k++) {
    let lon, lat;
    if (r.next() < 0.6) { const h = r.pick(hubs); lon = h[0] + r.gauss() * 3.5; lat = h[1] + r.gauss() * 2.5; }
    else { lon = r.range(-130, 150); lat = r.range(-40, 62); }
    const [x, y] = px(lon, lat); const i = (Math.floor(y) * W + Math.floor(x)) * 4;
    if (md[i] < 128 || lat < -55) continue;
    const s = r.next() < 0.1 ? 2.2 : 1.1;
    ng.fillStyle = `rgba(255,${180 + r.int(0, 50)},${100 + r.int(0, 60)},${0.35 + r.next() * 0.6})`;
    ng.beginPath(); ng.arc(x, y, s, 0, TAU); ng.fill();
  }
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  return { map: mk(colorC, true), rough: mk(roughC, false), bump: mk(bumpC, false), night: mk(nightC, true) };
}

function buildCloudTexture() {
  return canvasTex(1024, 512, (g, w, h) => {
    const img = g.createImageData(w, h); const d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const lat = 90 - (y / h) * 180;
      const band = 0.55 + 0.45 * Math.cos(lat * Math.PI / 180 * 3.0);
      const n = fbm2(x / 70, y / 50, 5) * 0.5 + 0.5; const n2 = fbm2(x / 18 + 4, y / 14, 3) * 0.5 + 0.5;
      const a = clamp((n * 0.85 + n2 * 0.25 - 0.62 + band * 0.08) * 3.2) * 0.95;
      const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
  }, { srgb: true });
}

const ATMO_VERT = `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix*mv; }`;
const ATMO_FRAG = `uniform vec3 color; uniform vec3 sunDirV; uniform float power; uniform float intensity; varying vec3 vN; varying vec3 vP;
void main(){ vec3 v = normalize(-vP); float f = pow(1.0 - abs(dot(v, vN)), power); float lit = smoothstep(-0.35, 0.6, dot(vN, sunDirV));
 gl_FragColor = vec4(color * f * intensity * (0.25 + 0.95*lit), f); }`;

const CAP_FRAG = `uniform float time; uniform float glow; uniform float shade; varying vec2 vUv; varying vec3 vLocal;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n2(p); p*=2.03; a*=0.5; } return s; }
void main(){
  vec2 p = vLocal.xy; float r = length(p) / ${R.toFixed(1)}; float ang = atan(p.y, p.x);
  vec3 c;
  // convection swirl in the mantle
  float cell = ang * 3.0; float rr = (r - 0.55) / 0.42;
  vec2 q = vec2(cos(cell*2.0 + time*0.15) * rr, sin(cell + time*0.1) + rr*3.0);
  float sw = fbm(vec2(ang*6.0 + sin(r*14.0 - time*0.4)*0.6, r*9.0 - time*0.12));
  float streak = fbm(vec2(ang*18.0 + sw*3.0, r*30.0 - time*0.3));
  if(r > 0.975){ // crust
    float k = fbm(vec2(ang*60.0, r*400.0));
    c = mix(vec3(0.42,0.30,0.20), vec3(0.62,0.47,0.30), k);
    if(r > 0.993) c = vec3(0.25,0.45,0.18);
  } else if(r > 0.55){ // mantle
    float t = (0.975 - r) / 0.425;
    vec3 a = vec3(0.55,0.12,0.03), b = vec3(1.25,0.42,0.08);
    c = (mix(a, b, t) * (0.65 + 0.7*sw) + vec3(1.0,0.5,0.1)*streak*0.35*t) * 0.55;
    c *= 1.0 + glow*0.5;
    c = mix(c, vec3(0.22,0.05,0.02), smoothstep(0.03, 0.0, 0.975 - r)*0.6);
  } else if(r > 0.19){ // outer core (liquid iron)
    float t = (0.55 - r) / 0.36;
    c = mix(vec3(1.6,0.75,0.18), vec3(2.4,1.5,0.5), t) * (0.75 + 0.5*fbm(vec2(ang*10.0 - time*0.5, r*20.0))) * 0.55;
  } else { // inner core
    c = mix(vec3(3.2,2.6,1.6), vec3(4.5,4.0,3.0), 1.0 - r/0.19) * 0.45;
  }
  // layer boundary lines
  float e = min(min(abs(r-0.975), abs(r-0.55)), abs(r-0.19));
  c *= 0.75 + 0.25*smoothstep(0.0, 0.006, e);
  c *= shade; c *= 0.8 + 0.2 * smoothstep(0.0, 0.08, abs(vLocal.x) / ${R.toFixed(1)});
  gl_FragColor = vec4(c, 1.0);
}`;
const CAP_VERT = `varying vec2 vUv; varying vec3 vLocal; void main(){ vUv = uv; vLocal = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

export class GlobeSet {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000002);
  }
  build() {
    const s = this.scene;
    const tex = buildEarthTextures();
    this.sun = new THREE.DirectionalLight(0xfff1dc, 3.2); this.sun.position.set(30, 12, 22); s.add(this.sun);
    s.add(new THREE.AmbientLight(0x1a2a44, 0.25));
    this.root = new THREE.Group(); s.add(this.root);
    this.spin = new THREE.Group(); this.root.add(this.spin);

    // clipping planes for cut-away (wedge x>0 && z>0 removed in spin-space)
    this.clipA = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
    this.clipB = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    this.clipOff = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6);

    const earthMat = new THREE.MeshStandardMaterial({
      map: tex.map, roughnessMap: tex.rough, roughness: 1, metalness: 0, bumpMap: tex.bump, bumpScale: 0.7,
      emissiveMap: tex.night, emissive: new THREE.Color(1, 0.85, 0.6), emissiveIntensity: 2.2,
      clipIntersection: true,
    });
    this.nightUniform = { value: new THREE.Vector3(1, 0, 0) };
    this.crackUniform = { value: 0 };
    earthMat.onBeforeCompile = (sh) => {
      sh.uniforms.sunDirW = this.nightUniform;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWN;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWN = normalize(mat3(modelMatrix) * normal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 sunDirW; varying vec3 vWN;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float nightK = smoothstep(0.15, -0.25, dot(normalize(vWN), sunDirW));
          totalEmissiveRadiance *= nightK;`);
    };
    this.earthMat = earthMat;
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(R, 192, 96), earthMat);
    this.spin.add(this.earth);

    this.cloudMat = new THREE.MeshStandardMaterial({ map: buildCloudTexture(), transparent: true, depthWrite: false, roughness: 1, metalness: 0, opacity: 0.9 });
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 128, 64), this.cloudMat);
    this.spin.add(this.clouds);

    this.atmoUniforms = { color: { value: new THREE.Color(0.35, 0.62, 1.0) }, sunDirV: { value: new THREE.Vector3(1, 0, 0) }, power: { value: 3.0 }, intensity: { value: 2.2 } };
    const atmoMat = new THREE.ShaderMaterial({ vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, uniforms: this.atmoUniforms, transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false });
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 96, 48), atmoMat); this.root.add(this.atmo);
    this.rimUniforms = { color: { value: new THREE.Color(0.4, 0.7, 1.0) }, sunDirV: this.atmoUniforms.sunDirV, power: { value: 4.5 }, intensity: { value: 1.2 } };
    const rimMat = new THREE.ShaderMaterial({ vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, uniforms: this.rimUniforms, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.015, 96, 48), rimMat); this.root.add(this.rim);

    // stars
    const r = new RNG(7); const N = 6000; const pos = new Float32Array(N * 3), colr = new Float32Array(N * 3), size = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3(r.gauss(), r.gauss(), r.gauss()).normalize().multiplyScalar(900);
      pos.set([v.x, v.y, v.z], i * 3); const t = r.next();
      const c = t < 0.15 ? [1.0, 0.8, 0.6] : t < 0.3 ? [0.7, 0.8, 1.0] : [1, 1, 1];
      const b = 0.3 + r.next() ** 4 * 2.5; colr.set([c[0] * b, c[1] * b, c[2] * b], i * 3); size[i] = 1.2 + r.next() ** 6 * 4;
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(colr, 3)); sg.setAttribute('size', new THREE.BufferAttribute(size, 1));
    const starMat = new THREE.ShaderMaterial({
      vertexShader: `attribute float size; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = size; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; void main(){ float d = length(gl_PointCoord-0.5)*2.0; float a = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(vC*a, 1.0); }`,
      vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    this.stars = new THREE.Points(sg, starMat); s.add(this.stars);
    // milky band glow (big sprite planes)
    const neb = canvasTex(512, 256, (g, w, h) => {
      const img = g.createImageData(w, h); const d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = (y / h - 0.5) * 2; const band = Math.exp(-v * v * 8);
        const n = fbm2(x / 40, y / 30, 5) * 0.5 + 0.5; const a = band * n * n * 0.55;
        const i = (y * w + x) * 4; d[i] = 120 + n * 60; d[i + 1] = 110 + n * 40; d[i + 2] = 160 + n * 60; d[i + 3] = a * 255;
      }
      g.putImageData(img, 0, 0);
    });
    const nebM = new THREE.Mesh(new THREE.PlaneGeometry(1600, 500), new THREE.MeshBasicMaterial({ map: neb, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 }));
    nebM.position.set(-200, 100, -800); nebM.rotation.z = 0.5; nebM.lookAt(0, 0, 0); s.add(nebM);

    // sun glow sprite
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff0d0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.sunSprite.scale.set(160, 160, 1); s.add(this.sunSprite);

    // plate boundary cracks
    this.cracks = new THREE.Group(); this.spin.add(this.cracks);
    this.crackMats = [];
    PLATE_LINES.forEach((line, li) => {
      const pts = [];
      for (let i = 0; i < line.length - 1; i++) {
        const a = lonLatToVec(line[i][0], line[i][1], 1), b = lonLatToVec(line[i + 1][0], line[i + 1][1], 1);
        const steps = Math.max(2, Math.ceil(a.angleTo(b) / 0.02));
        for (let k = 0; k < steps; k++) {
          const v = a.clone().lerp(b, k / steps).normalize();
          // jaggedness
          const j = new THREE.Vector3(noise2(li * 10 + i, k * 0.7), noise2(k * 0.7, li * 3 + i), noise2(i + k * 0.5, li)).multiplyScalar(0.004);
          pts.push(v.add(j).normalize().multiplyScalar(R * 1.002));
        }
      }
      const last = line[line.length - 1]; pts.push(lonLatToVec(last[0], last[1], R * 1.002));
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, pts.length * 2, 0.045, 5, false);
      const mat = new THREE.ShaderMaterial({
        uniforms: { reveal: { value: 0 }, intensity: { value: 0 }, time: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform float reveal; uniform float intensity; uniform float time; varying vec2 vUv;
          void main(){ if(vUv.x > reveal) discard; float flick = 0.8 + 0.2*sin(vUv.x*80.0 - time*3.0);
          vec3 c = vec3(3.5, 1.1, 0.25) * intensity * flick; float head = smoothstep(reveal-0.02, reveal, vUv.x)*2.0;
          gl_FragColor = vec4(c*(1.0+head), 1.0); }`,
        transparent: false, clippingPlanes: [], clipIntersection: true,
      });
      this.crackMats.push(mat);
      this.cracks.add(new THREE.Mesh(geo, mat));
    });

    // cut-away caps
    const capMat = new THREE.ShaderMaterial({ vertexShader: CAP_VERT, fragmentShader: CAP_FRAG, uniforms: { time: { value: 0 }, glow: { value: 0 } }, side: THREE.DoubleSide });
    this.capMat = capMat;
    this.caps = new THREE.Group();
    const half = new THREE.CircleGeometry(R * 0.999, 160, -Math.PI / 2, Math.PI); // x >= 0 half disk in XY plane
    const capZ = new THREE.Mesh(half, capMat); // lies in z=0 plane, covers x>0
    this.capMat2 = capMat.clone(); this.capMat2.uniforms = { time: capMat.uniforms.time, glow: capMat.uniforms.glow, shade: { value: 0.72 } }; capMat.uniforms.shade = { value: 1.0 };
    const capX = new THREE.Mesh(half, this.capMat2); capX.rotation.y = -Math.PI / 2; // into x=0 plane, covers z>0
    this.caps.add(capZ, capX); this.caps.visible = false; this.spin.add(this.caps);
    // inner glow light for cutaway
    this.coreLight = new THREE.PointLight(0xff7a2a, 0, 40, 1.5); this.spin.add(this.coreLight);

    // satellite (for InSAR / GNSS shots)
    this.sat = new THREE.Group(); this.sat.visible = false; this.root.add(this.sat);
    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a646, metalness: 1, roughness: 0.3 }); const panelM = new THREE.MeshStandardMaterial({ color: 0x1d3a6f, metalness: 0.6, roughness: 0.25, emissive: new THREE.Color(0.02, 0.05, 0.12) });
    this.sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.8), gold));
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.02, 0.6), panelM); p.position.x = sx * 1.2; this.sat.add(p); const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.3 })); arm.position.x = sx * 0.35; this.sat.add(arm); }
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, 1.0), new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide })); dish.rotation.x = Math.PI; dish.position.y = -0.35; this.sat.add(dish);
    this.beam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 32, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.4, 2.4), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.root.add(this.beam); this.beam.visible = false;
    // flight arcs converging on Turkey (international rescue teams)
    this.arcs = new THREE.Group(); this.spin.add(this.arcs); this.arcMats = [];
    const dest = [37.2, 37.4];
    const origins = [[-74, 40.7], [2.3, 48.8], [13.4, 52.5], [139.7, 35.7], [116.4, 39.9], [37.6, 55.7], [-3.7, 40.4], [12.5, 41.9], [72.8, 19.0], [126.9, 37.5], [31.2, 30.0], [55.3, 25.2], [-0.1, 51.5], [18.0, 59.3], [4.9, 52.4], [-99.1, 19.4], [151.2, -33.9], [28.0, -26.2]];
    for (const o of origins) {
      const a = lonLatToVec(o[0], o[1], 1), b = lonLatToVec(dest[0], dest[1], 1); const pts = [];
      const ang = a.angleTo(b); for (let i = 0; i <= 64; i++) { const u = i / 64; const v = a.clone().lerp(b, u).normalize(); const lift = 1 + Math.sin(u * Math.PI) * (0.04 + ang * 0.08); pts.push(v.multiplyScalar(R * lift)); }
      const m = new THREE.ShaderMaterial({ uniforms: { reveal: { value: 0 }, time: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader: 'uniform float reveal, time; varying vec2 vUv; void main(){ if(vUv.x > reveal) discard; float head = exp(-pow((vUv.x - reveal)*30.0, 2.0)); float dash = 0.55 + 0.45*step(0.5, fract(vUv.x*40.0 - time*2.0)); gl_FragColor = vec4(vec3(1.0,0.75,0.35)*(dash*0.8 + head*4.0), 1.0); }' });
      this.arcMats.push(m); this.arcs.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.025, 6, false), m));
    }
    this.arcs.visible = false;
    this.marker = new THREE.Group(); // generic marker at lon/lat
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.6, 0.2), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    this.markerRing = ring; this.marker.add(ring); this.marker.visible = false; this.spin.add(this.marker);
  }

  // opts: spinLon (deg longitude facing camera), tilt, cracks (0..1 reveal), crackIntensity, cutaway (bool), cloudsOpacity, atmo, night, marker
  update(t, o = {}) {
    const spinDeg = o.spin !== undefined ? o.spin : 0;
    this.spin.rotation.set(0, THREE.MathUtils.degToRad(spinDeg), 0);
    this.root.rotation.set(THREE.MathUtils.degToRad(o.tilt !== undefined ? o.tilt : 12), 0, THREE.MathUtils.degToRad(o.roll || 0));
    this.clouds.rotation.y = t * 0.004;
    const sunDir = new THREE.Vector3(...(o.sunDir || [0.8, 0.25, 0.55])).normalize();
    this.sun.position.copy(sunDir).multiplyScalar(60);
    this.sun.intensity = o.sunIntensity !== undefined ? o.sunIntensity : 3.2;
    this.sunSprite.position.copy(sunDir).multiplyScalar(700); this.sunSprite.visible = o.showSun !== false;
    this.nightUniform.value.copy(sunDir);
    this.cloudMat.opacity = o.clouds !== undefined ? o.clouds : 0.9; this.clouds.visible = this.cloudMat.opacity > 0.01;
    this.atmo.visible = this.rim.visible = o.atmo !== false;
    this.earthMat.emissiveIntensity = o.night !== undefined ? o.night : 2.2;
    const cam = o.camera;
    if (cam) {
      const v = sunDir.clone().transformDirection(cam.matrixWorldInverse);
      this.atmoUniforms.sunDirV.value.copy(v);
    }
    const crackReveal = o.cracks || 0, ci = o.crackIntensity !== undefined ? o.crackIntensity : 1;
    this.cracks.visible = crackReveal > 0.001;
    for (const m of this.crackMats) { m.uniforms.reveal.value = crackReveal; m.uniforms.intensity.value = ci; m.uniforms.time.value = t; }
    const cut = !!o.cutaway;
    const planes = cut ? [this.clipA, this.clipB] : [];
    if (cut) {
      // planes must follow the spin group's world transform
      this.spin.updateMatrixWorld(true);
      const m = this.spin.matrixWorld;
      this.clipA.set(new THREE.Vector3(-1, 0, 0), 0).applyMatrix4(m);
      this.clipB.set(new THREE.Vector3(0, 0, -1), 0).applyMatrix4(m);
    }
    this.earthMat.clippingPlanes = planes; this.cloudMat.clippingPlanes = planes; this.cloudMat.clipIntersection = true;
    for (const m of this.crackMats) m.clippingPlanes = planes;
    this.caps.visible = cut; this.capMat.uniforms.time.value = t; this.capMat.uniforms.glow.value = o.mantleGlow || 0;
    this.coreLight.intensity = cut ? 25 : 0; this.coreLight.position.set(R * 0.5, 0, R * 0.5);
    this.sat.visible = this.beam.visible = !!o.sat;
    if (o.sat) {
      // satellite orbits over the target lon/lat, in root space (independent of spin)
      this.spin.updateMatrixWorld(true); this.root.updateMatrixWorld(true);
      const tgt = this.worldPos(o.sat.lon, o.sat.lat, R); const inv = new THREE.Matrix4().copy(this.root.matrixWorld).invert(); tgt.applyMatrix4(inv);
      const up = tgt.clone().normalize(); const side = new THREE.Vector3(0, 1, 0).cross(up).normalize();
      const along = (o.sat.phase || 0); const pos = up.clone().multiplyScalar(R * 1.45).addScaledVector(side, along * R * 0.6);
      this.sat.position.copy(pos); this.sat.lookAt(tgt); this.sat.rotateX(Math.PI / 2);
      const dir = tgt.clone().sub(pos); const L = dir.length(); this.beam.position.copy(pos).addScaledVector(dir, 0.5); this.beam.scale.set(L * 0.12, L, L * 0.12);
      this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize()); this.beam.material.opacity = (o.sat.beam || 0) * (0.14 + 0.06 * Math.sin(t * 6));
      this.beam.visible = (o.sat.beam || 0) > 0;
    }
    this.arcs.visible = (o.arcs || 0) > 0; this.arcMats.forEach((m, i) => { m.uniforms.reveal.value = clamp((o.arcs || 0) * 1.3 - (i % 6) * 0.05); m.uniforms.time.value = t; });
    if (o.marker) {
      this.marker.visible = true; const p = lonLatToVec(o.marker[0], o.marker[1], R * 1.004);
      this.marker.position.copy(p); this.marker.lookAt(p.clone().multiplyScalar(2));
      const pulse = (t * 1.2) % 1; this.marker.scale.setScalar(o.markerScale || (1 + pulse * 1.5)); this.markerRing.material.opacity = 1 - pulse * 0.7;
    } else this.marker.visible = false;
  }
  // world position of lon/lat on the (rotated) globe
  worldPos(lon, lat, r = R) { this.spin.updateMatrixWorld(true); return lonLatToVec(lon, lat, r).applyMatrix4(this.spin.matrixWorld); }
}
