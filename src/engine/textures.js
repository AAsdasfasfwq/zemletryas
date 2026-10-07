// Procedural canvas textures (generated once at load, fully deterministic)
import * as THREE from 'three';
import { RNG, fbm2, noise2, clamp, lerp } from './util.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
export function canvasTex(w, h, draw, { srgb = true, repeat = null, aniso = 8, mips = true } = {}) {
  const c = makeCanvas(w, h); const g = c.getContext('2d'); draw(g, w, h, c);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = aniso; t.generateMipmaps = mips;
  if (!mips) t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
// fill an ImageData pixel by pixel: fn(u, v, x, y) -> [r,g,b,a] in 0..255
export function pixelTex(w, h, fn, opts = {}) {
  return canvasTex(w, h, (g) => {
    const img = g.createImageData(w, h); const d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = fn(x / w, y / h, x, y); const i = (y * w + x) * 4;
      d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = p[3] === undefined ? 255 : p[3];
    }
    g.putImageData(img, 0, 0);
  }, opts);
}

const cache = new Map();
export function cached(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }

// soft round puff with noisy edges — used for smoke / dust / clouds sprites (alpha in red channel too)
export function puffTexture(seed = 1) {
  return cached('puff' + seed, () => pixelTex(128, 128, (u, v) => {
    const dx = u - 0.5, dy = v - 0.5; const r = Math.sqrt(dx * dx + dy * dy) * 2;
    const n = fbm2(u * 5 + seed * 3.1, v * 5 - seed, 4) * 0.5 + 0.5;
    let a = clamp(1 - r) ** 1.6 * (0.55 + 0.75 * n);
    a = clamp(a * 1.25);
    const s = 200 + 55 * n;
    return [s, s, s, a * 255];
  }, { srgb: false }));
}
export function glowTexture() {
  return cached('glow', () => pixelTex(128, 128, (u, v) => {
    const r = Math.hypot(u - 0.5, v - 0.5) * 2; const a = clamp(1 - r) ** 2.2;
    return [255, 255, 255, a * 255];
  }, { srgb: false }));
}
export function sparkTexture() {
  return cached('spark', () => pixelTex(64, 64, (u, v) => {
    const r = Math.hypot(u - 0.5, v - 0.5) * 2; const a = clamp(1 - r) ** 3 + clamp(1 - r * 3) * 0.6;
    return [255, 255, 255, clamp(a) * 255];
  }, { srgb: false }));
}

// tiled ground textures ---------------------------------------------------------------
export function asphaltTexture(seed = 3, wet = 0) {
  return cached('asphalt' + seed + wet, () => pixelTex(512, 512, (u, v) => {
    const n = fbm2(u * 40 + seed, v * 40, 3) * 0.5 + 0.5; const big = fbm2(u * 4, v * 4 + seed, 3) * 0.5 + 0.5;
    const grit = noise2(u * 400, v * 400) * 0.5 + 0.5;
    let c = 52 + n * 22 + big * 18 + grit * 14 - wet * 18;
    return [c, c * 1.0, c * 1.04];
  }, { repeat: [1, 1] }));
}
export function concreteTexture(seed = 5, base = [170, 165, 155]) {
  return cached('concrete' + seed + base.join(','), () => pixelTex(512, 512, (u, v) => {
    const n = fbm2(u * 12 + seed, v * 12, 4) * 0.5 + 0.5; const fine = noise2(u * 300, v * 300) * 0.5 + 0.5;
    const stain = clamp((fbm2(u * 3, v * 3 + seed, 3) + 0.2) * 2);
    const k = 0.8 + n * 0.25 + fine * 0.08 - stain * 0.08;
    return [base[0] * k, base[1] * k, base[2] * k];
  }, { repeat: [1, 1] }));
}
export function grassTexture(seed = 7, base = [86, 128, 52]) {
  return cached('grass' + seed + base.join(','), () => pixelTex(512, 512, (u, v) => {
    const n = fbm2(u * 16 + seed, v * 16, 4) * 0.5 + 0.5; const fine = noise2(u * 220, v * 260) * 0.5 + 0.5;
    const k = 0.7 + n * 0.45 + fine * 0.18;
    return [base[0] * k * (0.9 + fine * 0.2), base[1] * k, base[2] * k];
  }, { repeat: [1, 1] }));
}
export function snowTexture() {
  return cached('snow', () => pixelTex(512, 512, (u, v) => {
    const n = fbm2(u * 10, v * 10, 4) * 0.5 + 0.5; const sp = noise2(u * 500, v * 500) > 0.86 ? 18 : 0;
    const c = 222 + n * 26 + sp;
    return [c * 0.96, c * 0.985, c];
  }, { repeat: [1, 1] }));
}
export function gravelTexture(seed = 11) {
  return cached('gravel' + seed, () => canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8d8578'; g.fillRect(0, 0, w, h);
    const r = new RNG(seed);
    for (let i = 0; i < 9000; i++) {
      const x = r.next() * w, y = r.next() * h, s = 1 + r.next() * 4; const k = 90 + r.next() * 110;
      g.fillStyle = `rgb(${k * 1.05 | 0},${k | 0},${k * 0.9 | 0})`; g.beginPath(); g.ellipse(x, y, s, s * (0.6 + r.next() * 0.4), r.next() * 3, 0, 7); g.fill();
    }
  }, { repeat: [1, 1] }));
}

// rock strata texture for geological cross sections (horizontal bands)
export function strataTexture(seed = 2, palette = null) {
  const pal = palette || ['#8a5a3c', '#b07a4f', '#6f4a33', '#c9955f', '#7d6a58', '#5b4636', '#a5683f', '#8f7b62', '#4f3b2c', '#b5835a'];
  return cached('strata' + seed + pal.join(), () => {
    const r = new RNG(seed);
    const bands = []; let y = 0;
    while (y < 1.2) { const hgt = 0.02 + r.next() * 0.09; bands.push({ y, h: hgt, c: new THREE.Color(r.pick(pal)) }); y += hgt; }
    return pixelTex(512, 512, (u, v) => {
      const warp = fbm2(u * 3 + seed, v * 2, 3) * 0.05 + Math.sin(u * 6.28 + seed) * 0.01;
      const vv = v + warp;
      let b = bands[0]; for (const bb of bands) if (vv >= bb.y) b = bb;
      const n = fbm2(u * 40, v * 40 + seed, 3) * 0.5 + 0.5; const fine = noise2(u * 300, v * 300) * 0.5 + 0.5;
      const k = 0.78 + n * 0.3 + fine * 0.1;
      const edge = Math.abs(vv - b.y) < 0.004 ? 0.75 : 1;
      return [b.c.r * 255 * k * edge, b.c.g * 255 * k * edge, b.c.b * 255 * k * edge];
    }, { repeat: [1, 1] });
  });
}

// facade texture for an apartment block: returns {map, emissive, rough, cols, rows}
export function facadeTextures(opts) {
  const {
    seed = 1, cols = 6, rows = 8, wall = '#e8d9bf', accent = '#c96f4a', frame = '#f4f1ea', glassTint = [70, 96, 120],
    balcony = true, shopFloor = true, shopColor = '#2f6f8f', style = 'apartment', litRatio = 0.55, curtains = true,
  } = opts;
  const key = 'facade' + JSON.stringify(opts);
  return cached(key, () => {
    const cw = 64, ch = 64; const W = cols * cw, H = rows * ch;
    const r = new RNG(seed);
    const winInfo = [];
    const map = canvasTex(W, H, (g) => {
      g.fillStyle = wall; g.fillRect(0, 0, W, H);
      // wall noise / dirt streaks
      const img = g.getImageData(0, 0, W, H); const d = img.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const n = fbm2(x / 30 + seed, y / 30, 3) * 0.06 + noise2(x / 2.5, y / 2.5) * 0.025 - (y / H) * 0.04;
        const streak = Math.max(0, noise2(x / 6 + seed * 3, 0.5) - 0.55) * 0.25 * (1 - y / H);
        const i = (y * W + x) * 4; const k = 1 + n - streak;
        d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
      }
      g.putImageData(img, 0, 0);
      // horizontal floor bands
      for (let fy = 0; fy < rows; fy++) {
        const y0 = fy * ch;
        g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, y0 + ch - 5, W, 5);
        g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, y0 + ch - 7, W, 2);
      }
      if (style === 'tower') { // modern glass tower: wide sweeping windows
        for (let fy = 0; fy < rows; fy++) {
          const y0 = fy * ch;
          const gr = g.createLinearGradient(0, y0, 0, y0 + ch);
          gr.addColorStop(0, `rgb(${glassTint[0] + 60},${glassTint[1] + 70},${glassTint[2] + 80})`);
          gr.addColorStop(1, `rgb(${glassTint[0]},${glassTint[1]},${glassTint[2]})`);
          g.fillStyle = gr; g.fillRect(0, y0 + 8, W, ch - 20);
          g.fillStyle = frame; for (let x = 0; x <= cols; x++) g.fillRect(x * cw - 2, y0 + 8, 4, ch - 20);
          g.fillStyle = accent; g.fillRect(0, y0 + ch - 12, W, 6);
          for (let x = 0; x < cols; x++) winInfo.push({ x: x * cw + 2, y: y0 + 8, w: cw - 4, h: ch - 20, fy, lit: r.next() < litRatio, hue: r.next() });
        }
        return;
      }
      for (let fy = 0; fy < rows; fy++) for (let cx = 0; cx < cols; cx++) {
        const x0 = cx * cw, y0 = fy * ch; const isShop = shopFloor && fy === rows - 1;
        if (isShop) continue;
        const wide = balcony && cx % 3 === 1;
        const ww = wide ? 44 : 30, wh = wide ? 46 : 36;
        const wx = x0 + (cw - ww) / 2, wy = y0 + 10;
        // recess shadow
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
        g.fillStyle = frame; g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
        const gr = g.createLinearGradient(wx, wy, wx + ww, wy + wh);
        gr.addColorStop(0, `rgb(${glassTint[0] + 70},${glassTint[1] + 75},${glassTint[2] + 80})`);
        gr.addColorStop(0.55, `rgb(${glassTint[0]},${glassTint[1]},${glassTint[2]})`);
        gr.addColorStop(1, `rgb(${glassTint[0] - 20},${glassTint[1] - 20},${glassTint[2] - 15})`);
        g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
        // mullion
        g.fillStyle = frame; g.fillRect(wx + ww / 2 - 1, wy, 2, wh);
        if (curtains && r.next() < 0.6) {
          const cc = r.pick(['#d9c7a3', '#b9a0c8', '#e6d3b0', '#c8b58f', '#9fb7c9', '#e0b7a0']);
          g.fillStyle = cc; g.globalAlpha = 0.85;
          g.fillRect(wx + 1, wy + 1, ww * (0.18 + r.next() * 0.2), wh - 2);
          g.fillRect(wx + ww - ww * (0.15 + r.next() * 0.2) - 1, wy + 1, ww * 0.2, wh - 2);
          g.globalAlpha = 1;
        }
        // sill
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(wx - 4, wy + wh + 2, ww + 8, 3);
        if (!wide && r.next() < 0.18) { // AC unit
          g.fillStyle = '#e9e9e4'; g.fillRect(wx + ww + 3, wy + wh - 14, 12, 12); g.fillStyle = '#9a9a96'; g.fillRect(wx + ww + 5, wy + wh - 12, 8, 8);
        }
        winInfo.push({ x: wx, y: wy, w: ww, h: wh, fy, lit: r.next() < litRatio, hue: r.next() });
      }
      if (shopFloor) {
        const y0 = (rows - 1) * ch;
        g.fillStyle = '#3a3633'; g.fillRect(0, y0, W, ch);
        for (let cx = 0; cx < cols; cx++) {
          const x0 = cx * cw;
          const gr = g.createLinearGradient(0, y0 + 18, 0, y0 + ch);
          gr.addColorStop(0, '#6d8597'); gr.addColorStop(1, '#2a3640');
          g.fillStyle = gr; g.fillRect(x0 + 4, y0 + 20, cw - 8, ch - 22);
          g.fillStyle = 'rgba(255,240,200,0.35)'; g.fillRect(x0 + 8, y0 + 40, cw - 16, 4);
        }
        g.fillStyle = shopColor; g.fillRect(0, y0 + 2, W, 16);
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = 'bold 12px Inter, Arial'; g.textBaseline = 'middle';
        const names = ['MARKET', 'ECZANE', 'KAFE', 'BAKKAL', 'FIRIN', 'BERBER', 'LOKANTA', 'TEKSTIL'];
        for (let cx = 0; cx < cols; cx += 2) g.fillText(r.pick(names), cx * cw + 8, y0 + 10);
        winInfo.push({ shop: true, x: 0, y: y0 + 18, w: W, h: ch - 18, fy: rows - 1, lit: true, hue: 0.1 });
      }
    });
    const emissive = canvasTex(W, H, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      for (const wi of winInfo) {
        if (!wi.lit) continue;
        if (wi.shop) {
          const gr = g.createLinearGradient(0, wi.y, 0, wi.y + wi.h); gr.addColorStop(0, '#ffe2a8'); gr.addColorStop(1, '#c98a3c');
          g.fillStyle = gr; for (let cx = 0; cx < cols; cx++) g.fillRect(cx * cw + 4, wi.y + 2, cw - 8, wi.h - 4);
          g.fillStyle = shopColor; g.fillRect(0, wi.y - 16, W, 16); continue;
        }
        const warm = wi.hue < 0.75;
        const c1 = warm ? (wi.hue < 0.4 ? '#ffd9a0' : '#ffc27a') : '#bfe0ff';
        const gr = g.createRadialGradient(wi.x + wi.w / 2, wi.y + wi.h * 0.7, 2, wi.x + wi.w / 2, wi.y + wi.h / 2, wi.w);
        gr.addColorStop(0, c1); gr.addColorStop(1, warm ? '#b0602a' : '#406a90');
        g.fillStyle = gr; g.fillRect(wi.x, wi.y, wi.w, wi.h);
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(wi.x + wi.w / 2 - 1, wi.y, 2, wi.h);
      }
    }, { srgb: true });
    const rough = canvasTex(W, H, (g) => {
      g.fillStyle = '#e0e0e0'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#262626'; for (const wi of winInfo) g.fillRect(wi.x, wi.y, wi.w, wi.h);
    }, { srgb: false });
    return { map, emissive, rough, cols, rows, winInfo };
  });
}

// sky gradient texture for backgrounds (vertical)
export function gradientTex(stops, h = 256) {
  return canvasTex(4, h, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    for (const [p, c] of stops) gr.addColorStop(p, c);
    g.fillStyle = gr; g.fillRect(0, 0, 4, h);
  }, { mips: false });
}

// text label texture (for signs/billboards)
export function textTexture(lines, { w = 512, h = 256, bg = '#c0392b', fg = '#fff', font = 'bold 64px Inter, Arial', sub = null, subFont = '28px Inter, Arial', align = 'center', border = null } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (border) { g.strokeStyle = border; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); }
    g.fillStyle = fg; g.textAlign = align; g.textBaseline = 'middle'; g.font = font;
    const L = Array.isArray(lines) ? lines : [lines];
    const lh = h / (L.length + (sub ? 1 : 0) + 0.5);
    L.forEach((l, i) => g.fillText(l, align === 'center' ? w / 2 : 24, lh * (i + 0.9)));
    if (sub) { g.font = subFont; g.globalAlpha = 0.9; g.fillText(sub, align === 'center' ? w / 2 : 24, lh * (L.length + 0.9)); }
  });
}
