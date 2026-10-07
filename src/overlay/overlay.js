// 2D overlay layer (text cards, infographics, map labels). Drawn in 1920x1080 logical
// coordinates every frame, uploaded as a texture and composited inside the final shader.
import * as THREE from 'three';
import { clamp, ease, smooth, RNG, lerp, TAU } from '../engine/util.js';

export const FONT = {
  title: '"Bebas Neue", "Oswald", Impact, sans-serif',
  sans: 'Inter, "Helvetica Neue", Arial, sans-serif',
  serif: '"Playfair Display", Georgia, serif',
  mono: '"JetBrains Mono", "Courier New", monospace',
};

export class Overlay {
  constructor(scale = 1) {
    this.scale = scale;
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(1920 * scale); this.canvas.height = Math.round(1080 * scale);
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.minFilter = THREE.LinearFilter; this.tex.generateMipmaps = false;
    this.used = false;
  }
  begin() {
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0); g.globalAlpha = 1; g.filter = 'none'; g.shadowBlur = 0; g.shadowColor = 'transparent';
    g.globalCompositeOperation = 'source-over';
    this.used = false;
  }
  use() { this.used = true; return this.g; }
  end() { if (this.used) this.tex.needsUpdate = true; return this.used ? this.tex : null; }
}

// ---------- text helpers ----------
export function setFont(g, family, size, weight = '', style = '') { g.font = `${style} ${weight} ${size}px ${family}`.trim(); }

// per-letter reveal with motion-blur smear. p = progress (seconds since start)
export function revealText(g, text, x, y, o = {}) {
  const {
    family = FONT.sans, size = 80, weight = '800', style = '', color = '#fff', align = 'center', p = 1,
    stagger = 0.035, dur = 0.45, from = 'up', dist = 40, blur = true, tracking = 0, alpha = 1, baseline = 'middle',
    shadow = null, out = null, // out: {p, dur, to}
  } = o;
  setFont(g, family, size, weight, style);
  g.textBaseline = baseline;
  const chars = [...text]; const widths = chars.map((c) => g.measureText(c).width + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (let i = 0; i < chars.length; i++) {
    const lt = p - i * stagger;
    let k = ease.outCubic(lt / dur);
    let oa = 1, ody = 0, odx = 0, ob = 0;
    if (out) { const ot = out.p - i * (out.stagger || stagger * 0.6); const ko = ease.inCubic(ot / (out.dur || 0.35)); oa = 1 - ko; ody = (out.to === 'down' ? 1 : -1) * ko * dist; ob = ko; }
    const a = clamp(k) * oa * alpha;
    if (a <= 0.001) { cx += widths[i]; continue; }
    let dx = 0, dy = 0, sc = 1;
    if (from === 'up') dy = (1 - k) * dist; else if (from === 'down') dy = -(1 - k) * dist;
    else if (from === 'left') dx = -(1 - k) * dist; else if (from === 'right') dx = (1 - k) * dist;
    else if (from === 'scale') sc = 1 + (1 - k) * 0.6;
    dy += ody; dx += odx;
    const smear = blur ? (1 - k) + ob : 0;
    g.save();
    g.translate(cx + widths[i] / 2 + dx, y + dy); g.scale(sc, sc);
    if (shadow) { g.shadowColor = shadow.color; g.shadowBlur = shadow.blur; g.shadowOffsetY = shadow.y || 0; }
    g.fillStyle = color; g.textAlign = 'center';
    if (smear > 0.02) {
      const n = 5; g.globalAlpha = a / n * 1.6;
      for (let s = 0; s < n; s++) { const off = (s / (n - 1) - 0.5) * smear * (from === 'left' || from === 'right' ? 0 : 1) * 30; const offx = (s / (n - 1) - 0.5) * smear * (from === 'left' || from === 'right' ? 1 : 0) * 40; g.fillText(chars[i], offx, off); }
    } else { g.globalAlpha = a; g.fillText(chars[i], 0, 0); }
    g.restore();
    cx += widths[i];
  }
  return total;
}

export function textWidth(g, text, family, size, weight = '', tracking = 0, style = '') {
  setFont(g, family, size, weight, style); return g.measureText(text).width + tracking * (text.length - 1);
}

// rolling number counter
export function formatNum(n, decimals = 0) {
  const s = n.toFixed(decimals); const [a, b] = s.split('.');
  const withSep = a.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return b ? withSep + '.' + b : withSep;
}

// ---------- black time card ("1 YEAR BEFORE") ----------
// p = seconds since card start, d = card duration
export function timeCard(g, p, d, { big, small, accent = '#d8402f', style = 'before' }) {
  g.fillStyle = '#000'; g.fillRect(0, 0, 1920, 1080);
  const fadeOut = clamp((d - p) / 0.35);
  const inK = ease.outCubic(p / 0.9);
  // subtle drifting dust glow
  const gr = g.createRadialGradient(960, 540, 10, 960, 540, 900);
  gr.addColorStop(0, `rgba(40,30,25,${0.55 * fadeOut})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 1920, 1080);
  const zoom = 1 + p * 0.012;
  g.save(); g.translate(960, 540); g.scale(zoom, zoom); g.translate(-960, -540);
  revealText(g, big, 960, 510, { family: FONT.title, size: 168, weight: '400', color: '#f3efe8', p, stagger: 0.05, dur: 0.6, from: 'up', dist: 26, tracking: 14, alpha: fadeOut });
  // accent line
  const lw = 520 * ease.inOutCubic((p - 0.35) / 0.9);
  g.globalAlpha = fadeOut; g.fillStyle = accent; g.fillRect(960 - lw / 2, 612, lw, 3);
  if (small) revealText(g, small, 960, 668, { family: FONT.sans, size: 34, weight: '600', color: '#c9c2b8', p: p - 0.55, stagger: 0.025, dur: 0.5, from: 'up', dist: 14, tracking: 10, alpha: fadeOut * 0.95 });
  g.restore();
  g.globalAlpha = 1;
  return inK;
}
