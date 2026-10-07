// 3D relief map of the Eastern Mediterranean / Middle East with tectonic plates, faults,
// cities, rupture animation, InSAR fringes, seismic gap and Istanbul fault.
import * as THREE from 'three';
import { REGION_LAND, REGION_COUNTRIES } from '../data/geo.js';
import { makeCanvas, canvasTex, glowTexture, puffTexture } from '../engine/textures.js';
import { SkyDome } from '../engine/sky.js';
import { Sprites } from '../engine/particles.js';
import { RNG, fbm2, noise2, clamp, lerp, smooth, TAU, ease } from '../engine/util.js';

export const LON0 = 36.5, LAT0 = 37.5, KX = 10 * Math.cos(37.5 * Math.PI / 180), KZ = 10;
export const mx = (lon) => (lon - LON0) * KX;
export const mz = (lat) => -(lat - LAT0) * KZ;
const BB = { lon0: 14, lon1: 60, lat0: 22, lat1: 50 };
const VEXAG = 1.15; // map units per km of elevation (heavily exaggerated relief)

export const FAULTS = {
  NAF: [[23, 40.0], [26.3, 40.5], [27.4, 40.7], [28.4, 40.8], [29.3, 40.8], [29.9, 40.75], [31.0, 40.7], [31.6, 40.75], [33.0, 40.95], [34, 41.0], [35.5, 40.85], [37, 40.6], [38.3, 40.15], [39.5, 39.75], [41, 39.3]],
  EAF: [[41, 39.3], [40.5, 38.9], [39.9, 38.7], [39.4, 38.45], [38.85, 38.2], [38.3, 38.0], [37.65, 37.78], [37.0, 37.38], [36.6, 37.0], [36.4, 36.6], [36.15, 36.2], [36.0, 36.0]],
  DSF: [[36.0, 36.0], [36.3, 35.3], [36.2, 34.5], [35.6, 33.0], [35.5, 31.5], [35.0, 29.5], [34.6, 28.0]],
  BZ: [[41, 39.3], [42.5, 38.4], [44.5, 37.5], [46, 35.5], [48, 33.5], [50.5, 30.5], [53, 28.3], [56.5, 27.0], [60, 25.6]],
  ARC: [[36.0, 36.0], [35, 35.3], [33, 34.6], [31, 35.4], [28.5, 35.3], [26, 34.6], [23, 35.3], [21, 37], [20, 39], [19.3, 40.5]],
  CARDAK: [[36.3, 37.95], [36.8, 38.0], [37.3, 38.06], [37.8, 38.12], [38.3, 38.15], [38.7, 38.2]],
};
export const RUPTURE = [[36.0, 36.0], [36.15, 36.2], [36.4, 36.6], [36.6, 37.0], [37.0, 37.38], [37.65, 37.78], [38.3, 38.0], [38.85, 38.2], [39.1, 38.32]];
export const EPI1 = [37.01, 37.23], EPI2 = [37.2, 38.07];
export const GAP = [[36.6, 37.0], [37.0, 37.38], [37.65, 37.78], [38.3, 38.0]];
export const MARMARA = [[27.3, 40.68], [27.9, 40.78], [28.6, 40.82], [29.2, 40.82], [29.6, 40.78]];
export const CITIES = {
  Gaziantep: [37.38, 37.07], Kahramanmaras: [36.93, 37.58], Antakya: [36.16, 36.20], Malatya: [38.31, 38.35], Adiyaman: [38.28, 37.76], Osmaniye: [36.25, 37.07], Iskenderun: [36.17, 36.59], Aleppo: [37.16, 36.20], Idlib: [36.63, 35.93], Jindires: [36.70, 36.39], Istanbul: [28.98, 41.01], Ankara: [32.86, 39.93], Adana: [35.32, 37.0], Elbistan: [37.2, 38.2],
};
const PLATE = {
  africa: [[14, 22], [38, 22], [34.6, 28.0], [35.0, 29.5], [35.5, 31.5], [35.6, 33.0], [36.2, 34.5], [36.3, 35.3], [36.0, 36.0], [35, 35.3], [33, 34.6], [31, 35.4], [28.5, 35.3], [26, 34.6], [23, 35.3], [21, 37], [20, 39], [19.3, 40.5], [16, 41.5], [14, 41.5]],
  anatolia: [[23, 40.0], ...FAULTS.NAF.slice(1), ...FAULTS.EAF.slice(1), [35, 35.3], [33, 34.6], [31, 35.4], [28.5, 35.3], [26, 34.6], [23, 35.3], [21, 37], [20, 39], [19.3, 40.5]],
  arabia: [[36.0, 36.0], ...FAULTS.EAF.slice().reverse().slice(1), ...FAULTS.BZ.slice(1), [60, 22], [38, 22], [34.6, 28.0], [35.0, 29.5], [35.5, 31.5], [35.6, 33.0], [36.2, 34.5], [36.3, 35.3]],
};
// mountain ridges: [polyline, height(km), width(deg)]
const RIDGES = [
  [[[29.5, 36.8], [31.5, 37.3], [33, 37.0], [34.5, 37.3], [35.5, 37.7], [36.5, 38.1], [38, 38.4], [39.5, 38.6], [41, 38.5]], 2.6, 0.55], // Taurus
  [[[30.5, 41.0], [32, 41.3], [34, 41.4], [36, 41.0], [37.5, 40.8], [39.5, 40.6], [41.5, 41.0], [42.5, 41.2]], 2.4, 0.5], // Pontic
  [[[38, 44.3], [40, 43.6], [42, 43.1], [44.5, 42.7], [46.5, 41.9], [48.5, 41.0], [49.5, 40.5]], 4.2, 0.55], // Caucasus
  [[[43.8, 37.6], [45.5, 35.9], [47, 34.4], [48.5, 33.0], [50, 31.6], [51.8, 30.0], [54, 28.8], [56.5, 27.8]], 3.2, 0.9], // Zagros
  [[[48.5, 37.4], [50, 36.6], [52, 36.0], [54, 36.5], [56, 37.3], [58, 37.6]], 3.4, 0.45], // Alborz
  [[[41, 39.7], [42.5, 39.5], [44, 39.6], [44.3, 39.7]], 3.6, 0.7], // E. Anatolia / Ararat
  [[[35.9, 33.2], [36.4, 34.3], [36.2, 34.9]], 2.2, 0.25], // Lebanon
  [[[36.1, 36.3], [36.4, 36.9], [36.7, 37.3]], 1.8, 0.2], // Amanos (Nur)
  [[[34.8, 28.3], [36.5, 26.0], [38.5, 23.5], [39.5, 22.0]], 2.0, 0.55], // Hejaz
  [[[20.5, 41.0], [21.3, 39.8], [21.8, 38.6], [22.2, 37.2]], 2.0, 0.4], // Pindus
  [[[22.6, 42.8], [24.5, 42.7], [26.5, 42.75]], 1.9, 0.35], // Balkan
  [[[15.5, 45.0], [17.5, 43.8], [19.5, 42.5]], 1.8, 0.5], // Dinaric
  [[[32.5, 34.9], [33.0, 34.95]], 1.6, 0.15], // Troodos
  [[[42.5, 37.3], [43.5, 37.4], [44.0, 37.1]], 2.6, 0.4], // SE Taurus
];
function distSeg(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; const L2 = dx * dx + dy * dy; if (L2 < 1e-12) return Math.hypot(px - ax, py - ay); const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)); const qx = ax + dx * t - px, qy = ay + dy * t - py; return Math.sqrt(qx * qx + qy * qy); }
function distLine(lon, lat, line) { const c = 0.8; let m = 1e9; for (let i = 0; i < line.length - 1; i++) m = Math.min(m, distSeg(lon * c, lat, line[i][0] * c, line[i][1], line[i + 1][0] * c, line[i + 1][1])); return m; }

function elevationKm(lon, lat) {
  let h = 0.25;
  // plateaus
  const anat = smooth((lon - 29) / 3) * smooth((44 - lon) / 2) * smooth((lat - 37.3) / 0.8) * smooth((41.0 - lat) / 0.6);
  h += anat * (0.8 + smooth((lon - 37) / 6) * 1.1);
  const iran = smooth((lon - 47) / 3) * smooth((lat - 29) / 2) * smooth((38 - lat) / 1.5); h += iran * 1.0;
  const arab = smooth((lat - 22) / 1) * smooth((33 - lat) / 4) * smooth((lon - 37) / 2) * smooth((47 - lon) / 3); h += arab * 0.45;
  const meso = Math.exp(-((distLine(lon, lat, [[38.5, 36.8], [41, 35.5], [44, 33.3], [47.5, 31.0]]) / 1.1) ** 2)); h -= meso * 0.45;
  for (const [line, H, W] of RIDGES) { const d = distLine(lon, lat, line); if (d < W * 3) h += H * Math.exp(-((d / W) ** 2)) * (0.55 + 0.65 * (fbm2(lon * 1.7, lat * 1.7, 4) * 0.5 + 0.5)); }
  h += (fbm2(lon * 0.9 + 3, lat * 0.9, 5) * 0.5 + 0.3) * 0.5 * clamp(h / 1.5);
  return Math.max(0.02, h);
}

const MAP_FRAG_EXTRA = /* glsl */`
uniform sampler2D plateMap; uniform sampler2D borderMap; uniform vec4 plateW; uniform float borders; uniform float time;
uniform sampler2D landMap; uniform sampler2D detailMap; uniform float insar; uniform vec4 faultSeg[8]; uniform float slip; uniform float area; uniform vec3 areaColor; uniform float darken;
varying vec2 vGeoUv; varying vec3 vWPos;
vec3 hue2rgb(float h){ return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0); }
`;

export class RegionMapSet {
  constructor() { this.scene = new THREE.Scene(); }
  build(director) {
    const s = this.scene;
    this.sky = new SkyDome('day'); this.sky.setPreset('day', { cloudCover: 0.2 }); s.add(this.sky);
    s.environment = this.sky.makeEnv(director.renderer);
    s.fog = new THREE.FogExp2(0xa9bfd6, 0.0011);
    this.sun = new THREE.DirectionalLight(0xfff0dc, 3.0); this.sun.position.set(-120, 90, 60); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096); this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.05; s.add(this.sun); s.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xcfe0ff, 0x4a3a2a, 0.9); s.add(this.hemi);

    // ---- land mask + borders + plates (canvas, lon/lat equirect over BB) ----
    const TW = 2048, TH = Math.round(TW * (BB.lat1 - BB.lat0) / (BB.lon1 - BB.lon0) / Math.cos(37 * Math.PI / 180));
    const toPx = (lon, lat, w, h) => [((lon - BB.lon0) / (BB.lon1 - BB.lon0)) * w, ((BB.lat1 - lat) / (BB.lat1 - BB.lat0)) * h];
    const mask = makeCanvas(2048, Math.round(2048 * TH / TW) & ~1); const mg = mask.getContext('2d');
    mg.fillStyle = '#000'; mg.fillRect(0, 0, mask.width, mask.height); mg.fillStyle = '#fff';
    for (const ring of REGION_LAND) { mg.beginPath(); ring.forEach(([lo, la], i) => { const [x, y] = toPx(lo, la, mask.width, mask.height); i ? mg.lineTo(x, y) : mg.moveTo(x, y); }); mg.closePath(); mg.fill(); }
    const md = mg.getImageData(0, 0, mask.width, mask.height).data; const MW = mask.width, MH = mask.height;
    const landAt = (lon, lat) => { // bilinear, smooth coastlines
      const [x, y] = toPx(lon, lat, MW, MH); const fx = clamp(x - 0.5, 0, MW - 1.001), fy = clamp(y - 0.5, 0, MH - 1.001); const ix = Math.floor(fx), iy = Math.floor(fy); const ux = fx - ix, uy = fy - iy;
      const g = (a, b) => md[(b * MW + a) * 4] / 255; return lerp(lerp(g(ix, iy), g(ix + 1, iy), ux), lerp(g(ix, iy + 1), g(ix + 1, iy + 1), ux), uy);
    };
    // coast distance proxy (blurred mask)
    const BW = Math.floor(MW / 2), BH = Math.floor(MH / 2);
    const blur = makeCanvas(BW, BH); const bg = blur.getContext('2d'); bg.filter = 'blur(6px)'; bg.drawImage(mask, 0, 0, BW, BH); const bd = bg.getImageData(0, 0, BW, BH).data;
    const nearLand = (lon, lat) => { const [x, y] = toPx(lon, lat, BW, BH); const xi = clamp(Math.round(x), 0, BW - 1), yi = clamp(Math.round(y), 0, BH - 1); return bd[(yi * BW + xi) * 4] / 255; };

    // ---- terrain geometry ----
    const x0 = mx(BB.lon0), x1 = mx(BB.lon1), z0 = mz(BB.lat1), z1 = mz(BB.lat0);
    const W = x1 - x0, H = z1 - z0; const SX = 420, SZ = Math.round(SX * H / W);
    const geo = new THREE.PlaneGeometry(W, H, SX, SZ); geo.rotateX(-Math.PI / 2); geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const pos = geo.attributes.position; const uv2 = new Float32Array(pos.count * 2);
    const hGrid = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i); const lon = x / KX + LON0, lat = -z / KZ + LAT0;
      const land = landAt(lon, lat); const near = nearLand(lon, lat);
      const lk = smooth((land - 0.3) / 0.4);
      const yl = elevationKm(lon, lat) * VEXAG * smooth(near * 1.6 - 0.2) + 0.06;
      const ys = -0.25 - (1 - near) * 1.4 - (fbm2(lon, lat, 3) * 0.5 + 0.5) * 0.3;
      let y = lerp(ys, yl, lk);
      if (!Number.isFinite(y)) { console.warn('NaN height', lon, lat, land, near); y = 0; }
      pos.setY(i, y); hGrid[i] = y;
      uv2[i * 2] = (lon - BB.lon0) / (BB.lon1 - BB.lon0); uv2[i * 2 + 1] = (lat - BB.lat0) / (BB.lat1 - BB.lat0);
    }
    geo.setAttribute('mapUv', new THREE.BufferAttribute(uv2, 2));
    geo.computeVertexNormals();
    this.heightAt = (lon, lat) => {
      const x = mx(lon), z = mz(lat); const fx = (x - x0) / W * SX, fz = (z - z0) / H * SZ; const ix = clamp(Math.floor(fx), 0, SX - 1), iz = clamp(Math.floor(fz), 0, SZ - 1);
      const ux = fx - ix, uz = fz - iz; const g = (a, b) => hGrid[b * (SX + 1) + a];
      return lerp(lerp(g(ix, iz), g(ix + 1, iz), ux), lerp(g(ix, iz + 1), g(ix + 1, iz + 1), ux), uz);
    };
    this.at = (lon, lat, lift = 0) => new THREE.Vector3(mx(lon), Math.max(this.heightAt(lon, lat), 0) + lift, mz(lat));

    // ---- colour texture ----
    const colorTex = canvasTex(TW, TH, (g, w, h) => {
      const img = g.createImageData(w, h); const d = img.data;
      for (let py = 0; py < h; py++) {
        const lat = BB.lat1 - (py / h) * (BB.lat1 - BB.lat0);
        for (let px = 0; px < w; px++) {
          const lon = BB.lon0 + (px / w) * (BB.lon1 - BB.lon0);
          const land = landAt(lon, lat); const i = (py * w + px) * 4;
          const n = fbm2(lon * 3.1, lat * 3.1, 4) * 0.5 + 0.5; const n2 = noise2(lon * 40, lat * 40) * 0.5 + 0.5;
          const lk = smooth((land - 0.35) / 0.3);
          let c, cs;
          { const near = nearLand(lon, lat); cs = mix3([0.03, 0.13, 0.30], [0.10, 0.42, 0.55], smooth(near * 1.8)); cs = mix3(cs, [0.04, 0.17, 0.36], n * 0.3); }
          if (lk > 0.001) {
            const e = elevationKm(lon, lat);
            const desert = smooth((35.5 - lat) / 2.5) * smooth((lon - 35.6) / 0.6) + smooth((31.5 - lat) / 1.5) * (1 - smooth((lon - 35) / 1)) * 0.9 + smooth((33 - lat) / 2) * smooth((lon - 44) / 2);
            const green = smooth((lat - 40.6) / 0.8) * (1 - smooth((lon - 42) / 2)) + smooth((37.2 - lat) / 0.5) * smooth((lat - 35.8) / 0.3) * smooth((36.8 - lon) / 2) * 0.7 + smooth((lat - 43) / 2) * 0.8;
            c = [0.62, 0.55, 0.38]; // steppe ochre
            c = mix3(c, [0.36, 0.48, 0.24], clamp(green));
            c = mix3(c, [0.86, 0.72, 0.50], clamp(desert));
            c = mix3(c, [0.52, 0.44, 0.34], smooth((e - 1.2) / 1.0) * 0.8);
            c = mix3(c, [0.42, 0.37, 0.32], smooth((e - 2.2) / 0.8) * 0.6);
            c = mix3(c, [0.96, 0.97, 1.0], smooth((e - 3.3 - n * 0.9) / 0.35) * (0.6 + 0.4 * n2));
            const k = 0.82 + n * 0.3 + n2 * 0.06; c = [c[0] * k, c[1] * k, c[2] * k];
            c = mix3(cs, c, lk);
          } else c = cs;
          d[i] = c[0] * 255; d[i + 1] = c[1] * 255; d[i + 2] = c[2] * 255; d[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
    });
    const borderTex = canvasTex(TW, TH, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 2.2; g.setLineDash([6, 4]);
      for (const c of REGION_COUNTRIES) for (const ring of c.rings) { g.beginPath(); ring.forEach(([lo, la], i) => { const [x, y] = toPx(lo, la, w, h); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); }
      g.setLineDash([]); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5;
      for (const ring of REGION_LAND) { g.beginPath(); ring.forEach(([lo, la], i) => { const [x, y] = toPx(lo, la, w, h); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); }
    }, { srgb: false });
    const plateTex = canvasTex(1024, Math.round(1024 * TH / TW), (g, w, h) => {
      g.fillStyle = 'rgba(0,0,255,0)'; g.clearRect(0, 0, w, h);
      const fillP = (poly, col) => { g.fillStyle = col; g.beginPath(); poly.forEach(([lo, la], i) => { const [x, y] = toPx(lo, la, w, h); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); };
      g.fillStyle = 'rgb(0,0,255)'; g.fillRect(0, 0, w, h); // eurasia = blue
      g.globalCompositeOperation = 'source-over';
      fillP(PLATE.africa, 'rgba(0,0,0,1)'); // africa = alpha... we use black + separate channel trick below
      fillP(PLATE.anatolia, 'rgb(0,255,0)');
      fillP(PLATE.arabia, 'rgb(255,0,0)');
    }, { srgb: false });

    const mat = new THREE.MeshStandardMaterial({ map: colorTex, roughness: 0.92, metalness: 0 });
    const landTex = new THREE.CanvasTexture(mask); landTex.flipY = true;
    const detailTex = canvasTex(256, 256, (g, w, h) => { const img = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = (fbm2(x / 16, y / 16, 4) * 0.5 + 0.5) * 255; const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); }, { srgb: false, repeat: [1, 1] });
    this.u = {
      landMap: { value: landTex }, detailMap: { value: detailTex },
      plateMap: { value: plateTex }, borderMap: { value: borderTex }, plateW: { value: new THREE.Vector4() }, borders: { value: 0 }, time: { value: 0 },
      insar: { value: 0 }, faultSeg: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) }, slip: { value: 1 }, area: { value: 0 }, areaColor: { value: new THREE.Color(1, 0.2, 0.08) }, darken: { value: 0 },
    };
    // InSAR fault segments (2023 rupture) in map xz
    RUPTURE.slice(0, 9).forEach((p, i) => { if (i < 8) { const q = RUPTURE[i + 1]; this.u.faultSeg.value[i].set(mx(p[0]), mz(p[1]), mx(q[0]), mz(q[1])); } });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 mapUv; varying vec2 vGeoUv; varying vec3 vWPos;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGeoUv = mapUv; vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + MAP_FRAG_EXTRA)
        .replace('#include <map_fragment>', `#include <map_fragment>
          float det = texture2D(detailMap, vWPos.xz * 0.35).r * 0.6 + texture2D(detailMap, vWPos.xz * 0.05).r * 0.4;
          diffuseColor.rgb *= 0.78 + det * 0.44;
          float landK = smoothstep(0.35, 0.65, texture2D(landMap, vGeoUv).r);
          vec4 pl = texture2D(plateMap, vGeoUv);
          float wEu = pl.b * (1.0 - pl.g) * (1.0 - pl.r); float wAn = pl.g * (1.0 - pl.r); float wAr = pl.r; float wAf = (1.0 - pl.b) * (1.0 - pl.g) * (1.0 - pl.r);
          vec3 tint = vec3(0.0); float tw = 0.0;
          tint += vec3(0.25,0.45,0.95) * wEu * plateW.z; tw += wEu * plateW.z;
          tint += vec3(0.15,0.80,0.70) * wAn * plateW.y; tw += wAn * plateW.y;
          tint += vec3(1.00,0.42,0.06) * wAr * plateW.x; tw += wAr * plateW.x;
          tint += vec3(0.55,0.75,0.25) * wAf * plateW.w; tw += wAf * plateW.w;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.25 + tint * 0.95, clamp(tw, 0.0, 1.0) * 0.9);
          float bl = texture2D(borderMap, vGeoUv).a; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), bl * borders * 0.55);
          if(insar > 0.0){
            vec2 p = vWPos.xz; float best = 1e9; float sgn = 1.0; float along = 0.0; float acc = 0.0; float total = 0.0;
            for(int i=0;i<8;i++){ vec4 sg = faultSeg[i]; vec2 a = sg.xy, b = sg.zw; vec2 ab = b-a; float L = length(ab); total += L;
              float tt = clamp(dot(p-a, ab)/(L*L), 0.0, 1.0); vec2 q = a + ab*tt; float dd = length(p-q);
              if(dd < best){ best = dd; sgn = sign(ab.x*(p.y-a.y) - ab.y*(p.x-a.x)); along = acc + tt*L; } acc += L; }
            float taper = smoothstep(0.0, 6.0, along) * smoothstep(0.0, 6.0, total - along);
            float disp = sgn * atan(best / 2.0) / 1.5708 * slip * (0.4 + 0.6*taper) + 0.15*taper * exp(-best/8.0);
            float ph = fract(disp * 3.5 + 0.5);
            vec3 fr = hue2rgb(ph) * 0.9 + 0.1;
            float fade = smoothstep(26.0, 6.0, best) * smoothstep(-10.0, 0.0, along) * smoothstep(-10.0, 0.0, total - along + 4.0);
            diffuseColor.rgb = mix(diffuseColor.rgb, fr * (0.55 + 0.45*diffuseColor.rgb), fade * insar * 0.85 * landK);
          }
          if(area > 0.0){
            vec2 p = vWPos.xz; float best = 1e9;
            for(int i=0;i<8;i++){ vec4 sg = faultSeg[i]; vec2 a = sg.xy, b = sg.zw; vec2 ab = b-a; float tt = clamp(dot(p-a, ab)/dot(ab,ab), 0.0, 1.0); best = min(best, length(p - a - ab*tt)); }
            float n = sin(p.x*0.7 + time)*0.5 + sin(p.y*0.9 - time*0.7)*0.5;
            float k = smoothstep(16.0 + n*1.5, 4.0, best) * area;
            diffuseColor.rgb = mix(diffuseColor.rgb, areaColor * (0.7 + 0.3*sin(time*3.0 - best*0.6)), k * 0.6);
          }
          diffuseColor.rgb *= 1.0 - darken;
        `);
    };
    this.terrain = new THREE.Mesh(geo, mat); this.terrain.castShadow = true; this.terrain.receiveShadow = true; s.add(this.terrain);
    this.terrainMat = mat;
    // water
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(W * 3, H * 3), new THREE.MeshStandardMaterial({ color: 0x0c4a73, roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.62 }));
    this.water.rotation.x = -Math.PI / 2; this.water.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); this.water.receiveShadow = true; s.add(this.water);

    // ---- faults ----
    this.faults = {};
    for (const [name, line] of Object.entries(FAULTS)) this.faults[name] = this.makeLine(line, name === 'ARC' || name === 'BZ' ? 0.22 : 0.26, [3.2, 0.9, 0.25]);
    this.rupture = this.makeLine(RUPTURE, 0.42, [4.5, 2.2, 1.0], true);
    this.gapLine = this.makeLine(GAP, 0.8, [2.6, 1.6, 0.2], false, true);
    this.marmara = this.makeLine(MARMARA, 0.35, [4.0, 0.7, 0.2]);
    this.cardak = this.makeLine(FAULTS.CARDAK, 0.38, [4.5, 2.0, 0.8], true);

    // ---- plate arrows ----
    this.arrows = {
      arabia: this.makeArrow([[40.8, 30.5], [40.2, 33.0], [39.6, 35.9]], '#ff8a1c', 7.5),
      eurasia: this.makeArrow([[37.5, 46.5], [37.5, 44.5], [37.5, 42.6]], '#4d86ff', 6.5),
      anatolia: this.makeArrow([[36.0, 39.2], [33.5, 39.1], [30.5, 38.7], [27.8, 38.1]], '#24d1b8', 7.0),
      africa: this.makeArrow([[29.5, 28.5], [29.5, 30.8], [29.5, 32.6]], '#8fd14f', 5.0),
      satSW: this.makeArrow([[37.3, 37.7], [36.9, 37.35]], '#ffffff', 0.9),
      satNE: this.makeArrow([[36.6, 37.1], [37.0, 37.45]], '#ffffff', 0.9),
    };
    // ---- city markers ----
    this.markers = {};
    for (const [name, [lo, la]] of Object.entries(CITIES)) {
      const g = new THREE.Group(); const p = this.at(lo, la, 0.05); g.position.copy(p);
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) })); g.add(dot);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 0.8, 0.3), transparent: true, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; g.add(ring);
      g.userData = { ring, dot }; g.visible = false; s.add(g); this.markers[name] = g;
    }
    // ---- small quake pops along faults (not in the gap) ----
    const popPts = []; const rr = new RNG(31);
    const addPops = (line, n) => { for (let k = 0; k < n; k++) { const i = rr.int(0, line.length - 2); const u = rr.next(); const a = line[i], b = line[i + 1]; popPts.push([lerp(a[0], b[0], u) + (rr.next() - 0.5) * 0.3, lerp(a[1], b[1], u) + (rr.next() - 0.5) * 0.3, rr.next() * 5, 0.5 + rr.next() * 0.9]); } };
    addPops(FAULTS.EAF.slice(0, 6), 26); addPops([[36.4, 36.6], [36.15, 36.2], [36.0, 36.0], [36.3, 35.3]], 10); addPops(FAULTS.NAF.slice(6), 24); addPops(FAULTS.BZ.slice(0, 5), 14);
    const popGeo = new THREE.CircleGeometry(1, 32); popGeo.rotateX(-Math.PI / 2);
    this.pops = new THREE.InstancedMesh(popGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 1.4, 0.4), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }), popPts.length);
    this.popPts = popPts.map(([lo, la, ph, sz]) => ({ p: this.at(lo, la, 0.12), ph, sz })); this.pops.frustumCulled = false; s.add(this.pops);
    // ---- shock rings ----
    this.rings = [];
    const ringMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { r: { value: 0 }, w: { value: 1 }, a: { value: 0 }, color: { value: new THREE.Color(3, 1.2, 0.4) } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float r, w, a; uniform vec3 color; varying vec2 vP; void main(){ float d = length(vP); float k = exp(-pow((d - r)/w, 2.0)) + 0.25*exp(-pow((d - r*0.82)/(w*2.0), 2.0)); gl_FragColor = vec4(color*k*a, k*a); }` });
    for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), ringMat()); m.rotation.x = -Math.PI / 2; m.visible = false; s.add(m); this.rings.push(m); }
    // ---- epicentre flash ----
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(4, 2.5, 1.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.flash.visible = false; s.add(this.flash);
    // ---- clouds ----
    const cr = new RNG(8);
    this.clouds = new Sprites(90, (i, r) => ({ pos: [lerp(-120, 150, r.next()), 9 + r.next() * 8, lerp(-90, 110, r.next())], vel: [0.4, 0, 0.1], birth: -1000, life: 1e6, size0: 10 + r.next() * 18, size1: 10 + r.next() * 18, color: [1, 1, 1], alpha: 0.35 + r.next() * 0.4 }), { seed: 4, fadeIn: 0, fadeOut: 0, opacity: 0.85, drag: 0 });
    s.add(this.clouds);
  }

  makeLine(line, radius, color, rupture = false, hatched = false) {
    // subdivide along great-circle-ish straight segments and drape onto terrain
    const pts = [];
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i], b = line[i + 1]; const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05));
      for (let k = 0; k < n; k++) { const u = k / n; const lo = lerp(a[0], b[0], u) + noise2(i * 7 + k * 0.3, 1) * 0.02, la = lerp(a[1], b[1], u) + noise2(1, i * 7 + k * 0.3) * 0.02; pts.push(this.at(lo, la, 0.08)); }
    }
    pts.push(this.at(line[line.length - 1][0], line[line.length - 1][1], 0.08));
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, pts.length * 2, radius, 6, false);
    const m = new THREE.ShaderMaterial({
      uniforms: { reveal: { value: 0 }, intensity: { value: 1 }, time: { value: 0 }, color: { value: new THREE.Color(...color) }, front: { value: -1 }, front2: { value: 2 }, hatch: { value: hatched ? 1 : 0 }, alpha: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float reveal, intensity, time, front, front2, hatch, alpha; uniform vec3 color; varying vec2 vUv;
        void main(){ if(vUv.x > reveal) discard;
          float flick = 0.85 + 0.15*sin(vUv.x*140.0 - time*4.0);
          vec3 c = color * intensity * flick;
          if(front > -0.5){ // rupture: lit only between the two fronts (bilateral from epicentre)
            float lit = step(front2, vUv.x) * step(vUv.x, front); if(front2 > vUv.x || vUv.x > front) { c *= 0.08; }
            float head = exp(-pow((vUv.x - front)*60.0, 2.0)) + exp(-pow((vUv.x - front2)*60.0, 2.0)); c += vec3(6.0,5.0,4.0) * head * intensity;
          }
          if(hatch > 0.5){ float st = step(0.5, fract(vUv.x*60.0 + vUv.y*2.0 - time*0.5)); c *= 0.4 + 0.6*st; }
          gl_FragColor = vec4(c, alpha); }`,
      transparent: true, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, m); mesh.visible = false; mesh.renderOrder = 5; this.scene.add(mesh);
    mesh.userData.curve = curve;
    return mesh;
  }
  makeArrow(line, color, width) {
    const pts = line.map(([lo, la]) => new THREE.Vector3(mx(lo), 0, mz(la)));
    const curve = new THREE.CatmullRomCurve3(pts); const N = 60; const L = curve.getLength();
    const headLen = Math.min(width * 1.6, L * 0.4);
    // build a flat ribbon with arrow head, extruded slightly
    const shapePts = [], left = [], right = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N; const p = curve.getPointAt(u); const tg = curve.getTangentAt(u); const nrm = new THREE.Vector3(-tg.z, 0, tg.x);
      const along = u * L; const inHead = along > L - headLen; const hw = inHead ? width * 1.1 * (L - along) / headLen : width * 0.42;
      left.push(p.clone().addScaledVector(nrm, hw)); right.push(p.clone().addScaledVector(nrm, -hw));
    }
    const pos = [], uvs = [], idx = [];
    for (let i = 0; i <= N; i++) { pos.push(left[i].x, 0, left[i].z, right[i].x, 0, right[i].z); uvs.push(i / N, 0, i / N, 1); }
    for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      uniforms: { grow: { value: 0 }, time: { value: 0 }, color: { value: new THREE.Color(color) }, alpha: { value: 1 }, glow: { value: 1.6 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float grow, time, alpha, glow; uniform vec3 color; varying vec2 vUv;
        void main(){ if(vUv.x > grow) discard; float stripe = 0.75 + 0.25*step(0.5, fract(vUv.x*8.0 - time*1.2));
          float edge = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
          vec3 c = color * glow * stripe * (0.7 + 0.3*edge); gl_FragColor = vec4(c, alpha * (0.55 + 0.45*edge)); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, m); mesh.position.y = 4.2; mesh.visible = false; mesh.renderOrder = 8; this.scene.add(mesh);
    // soft shadow under the arrow
    const sh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })); sh.position.y = -3.9; mesh.add(sh);
    return mesh;
  }

  // o: { plates:[ar,an,eu,af], borders, faults:{NAF:1,...}, arrows:{arabia:grow,...}, markers:{name:1}, rupture:{t (seconds since)}, gap, pops, insar, area, marmara, cardak:{t}, sunAngle, darken, clouds }
  update(t, o = {}) {
    const u = this.u; u.time.value = t;
    const pw = o.plates || [0, 0, 0, 0]; u.plateW.value.set(pw[0], pw[1], pw[2], pw[3] || 0);
    u.borders.value = o.borders || 0; u.insar.value = o.insar || 0; u.area.value = o.area || 0; u.darken.value = o.darken || 0;
    u.slip.value = o.slip !== undefined ? o.slip : 1;
    this.sky.setTime(t);
    const night = o.night || 0;
    this.sun.intensity = lerp(3.0, 0.25, night); this.hemi.intensity = lerp(0.9, 0.25, night);
    this.sun.color.setRGB(1, lerp(0.94, 0.8, night), lerp(0.86, 1.0, night));
    if (o.focus) { const [fx, fz, fr] = o.focus; this.sun.target.position.set(fx, 0, fz); this.sun.position.set(fx - 120, 90, fz + 60); const c = this.sun.shadow.camera; c.left = -fr; c.right = fr; c.top = fr; c.bottom = -fr; c.near = 1; c.far = 400; c.updateProjectionMatrix(); }
    const F = o.faults || {};
    for (const [n, m] of Object.entries(this.faults)) { const v = F[n] || 0; m.visible = v > 0.001; m.material.uniforms.reveal.value = Math.min(1, v); m.material.uniforms.intensity.value = F[n + '_i'] !== undefined ? F[n + '_i'] : 1; m.material.uniforms.time.value = t; }
    // gap
    this.gapLine.visible = (o.gap || 0) > 0; this.gapLine.material.uniforms.reveal.value = clamp(o.gap || 0); this.gapLine.material.uniforms.time.value = t; this.gapLine.material.uniforms.alpha.value = o.gapAlpha !== undefined ? o.gapAlpha : 0.9;
    this.marmara.visible = (o.marmara || 0) > 0; this.marmara.material.uniforms.reveal.value = clamp(o.marmara || 0); this.marmara.material.uniforms.intensity.value = 0.6 + 0.4 * Math.sin(t * 3); this.marmara.material.uniforms.time.value = t;
    // rupture (bilateral from epicentre index ~0.42 along the polyline)
    const ruptureStart = 0.43;
    this.rupture.visible = !!o.rupture; this.flash.visible = false;
    for (const r of this.rings) r.visible = false;
    if (o.rupture) {
      const rt = o.rupture.t; const speedNE = 0.57 / 9, speedSW = 0.43 / 12; // fraction per second (exaggerated by caller time scale)
      const sc = o.rupture.scale || 1;
      const fNE = Math.min(1, ruptureStart + Math.max(0, rt) * speedNE * sc), fSW = Math.max(0, ruptureStart - Math.max(0, rt) * speedSW * sc);
      const mu = this.rupture.material.uniforms; mu.reveal.value = 1; mu.front.value = fNE; mu.front2.value = fSW; mu.time.value = t; mu.intensity.value = 1 + Math.exp(-rt * 0.8) * 2;
      const ep = this.at(EPI1[0], EPI1[1], 0.3);
      this.flash.visible = rt > 0; this.flash.position.copy(ep).add(new THREE.Vector3(0, 1, 0)); const fl = Math.exp(-rt * 1.3) * 26 + 6; this.flash.scale.set(fl, fl, 1);
      this.flash.material.opacity = 0.5 + 0.5 * Math.exp(-rt);
      this.rings.forEach((m, k) => { const tt = rt - k * 0.55; if (tt <= 0) return; m.visible = true; m.position.set(ep.x, 0.6 + k * 0.01, ep.z); const R = tt * 9 * (o.rupture.ringSpeed || 1); m.material.uniforms.r.value = R; m.material.uniforms.w.value = 0.8 + R * 0.04; m.material.uniforms.a.value = Math.exp(-tt * 0.35) * 1.2; });
    }
    this.cardak.visible = !!o.cardak;
    if (o.cardak) { const ct = o.cardak.t; const mu = this.cardak.material.uniforms; mu.reveal.value = 1; mu.front.value = Math.min(1, 0.4 + ct * 0.12); mu.front2.value = Math.max(0, 0.4 - ct * 0.12); mu.time.value = t; mu.intensity.value = 1.2; mu.color.value.setRGB(4.5, 1.4, 0.5); }
    // arrows
    const A = o.arrows || {};
    for (const [n, m] of Object.entries(this.arrows)) { const g = A[n] || 0; m.visible = g > 0.001; m.material.uniforms.grow.value = g; m.material.uniforms.time.value = t; m.material.uniforms.alpha.value = A[n + '_a'] !== undefined ? A[n + '_a'] : 1; }
    // markers
    const M = o.markers || {};
    for (const [n, g] of Object.entries(this.markers)) {
      const k = M[n] || 0; g.visible = k > 0.001; if (!g.visible) continue;
      const pulse = (t * 0.8 + n.length * 0.1) % 1; g.userData.ring.scale.setScalar(0.5 + pulse * 2.5); g.userData.ring.material.opacity = (1 - pulse) * k; g.scale.setScalar(ease.outBack(k));
    }
    // pops
    const pk = o.pops || 0; this.pops.visible = pk > 0; const dm = new THREE.Object3D();
    if (pk > 0) this.popPts.forEach((pp, i) => { const ph = ((t + pp.ph) / 2.6) % 1; const s = ph < 0.6 ? ease.outCubic(ph / 0.6) * pp.sz * 1.4 * pk : 0.0001; dm.position.copy(pp.p); dm.scale.setScalar(Math.max(0.0001, s)); dm.updateMatrix(); this.pops.setMatrixAt(i, dm.matrix); });
    this.pops.instanceMatrix.needsUpdate = true; this.pops.material.opacity = 0.85 * pk;
    this.clouds.visible = o.clouds !== false; this.clouds.setTime(t);
    this.water.material.opacity = 0.62;
  }
}
function mix3(a, b, t) { t = clamp(t); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
