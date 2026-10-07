// Editorial motion-graphics templates (light "magazine" style + dark variants) and
// 2.5D callouts that track 3D positions.
import { FONT, revealText, setFont, textWidth, formatNum } from './overlay.js';
import { clamp, ease, smooth, lerp, TAU, RNG, noise1 } from '../engine/util.js';

export const INK = '#1d1f22', RED = '#d8312f', PAPER = '#ececea', MUTED = '#8a8d92';

// ---------- backgrounds ----------
export function paperBG(g, p, { tone = PAPER, vignette = 0.22, grid = true, ribbon = null } = {}) {
  g.fillStyle = tone; g.fillRect(0, 0, 1920, 1080);
  const gr = g.createRadialGradient(960, 480, 200, 960, 540, 1150); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, `rgba(0,0,0,${vignette})`);
  g.fillStyle = gr; g.fillRect(0, 0, 1920, 1080);
  if (grid) { g.strokeStyle = 'rgba(0,0,0,0.05)'; g.lineWidth = 1; for (let x = 0; x <= 1920; x += 96) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1080); g.stroke(); } for (let y = 0; y <= 1080; y += 96) { g.beginPath(); g.moveTo(0, y); g.lineTo(1920, y); g.stroke(); } }
  if (ribbon) drawRibbon(g, p, ribbon);
}
export function darkBG(g, p, { tone = '#0b0b0d', glow = 'rgba(216,49,47,0.22)', cx = 960, cy = 540 } = {}) {
  g.fillStyle = tone; g.fillRect(0, 0, 1920, 1080);
  const gr = g.createRadialGradient(cx, cy, 50, cx, cy, 1000); gr.addColorStop(0, glow); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 1920, 1080);
  g.strokeStyle = 'rgba(255,255,255,0.03)'; g.lineWidth = 1; for (let x = 0; x <= 1920; x += 96) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1080); g.stroke(); }
}
function drawRibbon(g, p, { color = 'rgba(216,49,47,0.18)', width = 70, y = 640, amp = 120 } = {}) {
  g.save(); g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.beginPath();
  for (let x = -100; x <= 2020; x += 20) { const yy = y + Math.sin(x / 420 + p * 0.25) * amp; x === -100 ? g.moveTo(x, yy) : g.lineTo(x, yy); }
  g.stroke(); g.restore();
}
export function dashedCircle(g, x, y, r, p, { color = 'rgba(0,0,0,0.45)', dash = [10, 10], width = 2, spin = 0.15, k = 1 } = {}) {
  g.save(); g.translate(x, y); g.rotate(p * spin); g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash); g.beginPath(); g.arc(0, 0, r, 0, TAU * clamp(k)); g.stroke(); g.restore();
}
export function shadowed(g, fn, { blur = 40, y = 20, color = 'rgba(0,0,0,0.28)' } = {}) { g.save(); g.shadowColor = color; g.shadowBlur = blur; g.shadowOffsetY = y; fn(); g.restore(); }
// camera drift for 2D scenes: slow push + subtle float
export function drift(g, p, d, { zoom = 0.04, cx = 960, cy = 540 } = {}) {
  const z = 1 + zoom * (p / Math.max(d, 0.01)); g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy); g.translate(noise1(p * 0.4) * 4, noise1(p * 0.33 + 5) * 3);
}
// editorial header: italic serif kicker + big bold word(s)
export function header(g, p, x, y, kicker, big, { color = INK, accent = RED, size = 150, align = 'center', bigColor = null, delay = 0 } = {}) {
  if (kicker) revealText(g, kicker, x, y - size * 0.8, { family: FONT.serif, style: 'italic', weight: '400', size: size * 0.32, color: MUTED, p: p - delay, stagger: 0.02, from: 'up', dist: 16, align });
  revealText(g, big, x, y, { family: FONT.sans, weight: '900', size, color: bigColor || color, p: p - 0.15 - delay, stagger: 0.045, dur: 0.5, from: 'right', dist: 60, align, tracking: -2 });
}
export function counter(p, d0, d1, v0, v1, e = ease.outExpo) { return lerp(v0, v1, e(clamp((p - d0) / (d1 - d0)))); }

// ---------- icons (vector) ----------
export function iconPerson(g, x, y, s, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y - s * 0.78, s * 0.2, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x - s * 0.28, y); g.quadraticCurveTo(x - s * 0.3, y - s * 0.55, x, y - s * 0.55); g.quadraticCurveTo(x + s * 0.3, y - s * 0.55, x + s * 0.28, y); g.closePath(); g.fill(); }
export function iconBuilding(g, x, y, w, h, color, win = 'rgba(255,255,255,0.55)') { g.fillStyle = color; g.fillRect(x - w / 2, y - h, w, h); g.fillStyle = win; const cw = w / 4; for (let yy = y - h + cw * 0.6; yy < y - cw; yy += cw * 1.2) for (let k = 0; k < 3; k++) g.fillRect(x - w / 2 + cw * 0.5 + k * cw * 1.05, yy, cw * 0.55, cw * 0.6); }
export function iconBomb(g, x, y, s, color) { g.fillStyle = color; g.beginPath(); g.ellipse(x, y - s * 0.75, s * 0.42, s * 0.24, 0, 0, TAU); g.fill(); g.fillRect(x - s * 0.1, y - s * 0.6, s * 0.2, s * 0.6); g.beginPath(); g.ellipse(x, y, s * 0.35, s * 0.08, 0, 0, TAU); g.fill(); }

// ---------- 2.5D callout tracking a 3D point ----------
export function callout(g, p, pt, title, sub = null, { side = 1, len = 160, rise = 90, color = '#ffffff', accent = RED, size = 34, box = true, dot = true } = {}) {
  if (!pt || pt.behind) return;
  const k = ease.outCubic(p / 0.5); if (k <= 0) return;
  const x0 = pt.x, y0 = pt.y; const x1 = x0 + side * len * 0.5 * k, y1 = y0 - rise * k; const x2 = x1 + side * len * 0.6 * k;
  g.save();
  if (dot) { g.fillStyle = accent; g.beginPath(); g.arc(x0, y0, 7 * k, 0, TAU); g.fill(); g.strokeStyle = accent; g.lineWidth = 2; g.globalAlpha = 0.5; g.beginPath(); g.arc(x0, y0, 7 + 20 * ((p * 0.8) % 1), 0, TAU); g.stroke(); g.globalAlpha = 1; }
  g.strokeStyle = color; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x2, y1); g.stroke();
  const tx = x2 + side * 14; const align = side > 0 ? 'left' : 'right';
  setFont(g, FONT.sans, size, '800'); const tw = g.measureText(title).width;
  if (box) { g.fillStyle = 'rgba(10,12,16,0.55)'; const bx = side > 0 ? tx - 10 : tx - tw - 10; g.fillRect(bx, y1 - size * 0.8, tw + 20, size * (sub ? 1.9 : 1.25)); }
  g.restore();
  revealText(g, title, tx, y1 - size * 0.18, { family: FONT.sans, weight: '800', size, color, p: p - 0.2, stagger: 0.02, from: 'up', dist: 10, align, tracking: 1 });
  if (sub) revealText(g, sub, tx, y1 + size * 0.62, { family: FONT.sans, weight: '600', size: size * 0.55, color: '#d9d4cc', p: p - 0.35, stagger: 0.012, from: 'up', dist: 8, align, tracking: 2 });
}
// simple floating label (no leader)
export function tag(g, p, x, y, text, { size = 30, color = '#fff', bg = 'rgba(10,12,16,0.5)', align = 'center', family = FONT.sans, weight = '800', tracking = 3 } = {}) {
  const k = ease.outCubic(p / 0.4); if (k <= 0) return;
  setFont(g, family, size, weight); const w = g.measureText(text).width + tracking * text.length;
  g.save(); g.globalAlpha = k; g.fillStyle = bg; const bx = align === 'center' ? x - w / 2 - 14 : align === 'left' ? x - 14 : x - w - 14; g.fillRect(bx, y - size * 0.75, w + 28, size * 1.5); g.restore();
  revealText(g, text, x, y, { family, weight, size, color, p, stagger: 0.015, from: 'up', dist: 8, align, tracking });
}
export function lowerThird(g, p, d, title, sub, { x = 120, y = 930 } = {}) {
  const k = ease.outCubic(p / 0.6) * clamp((d - p) / 0.4);
  g.save(); g.globalAlpha = k; g.fillStyle = RED; g.fillRect(x, y - 52, 8 * k, 92); g.restore();
  revealText(g, title, x + 28, y - 12, { family: FONT.sans, weight: '900', size: 46, color: '#fff', p, align: 'left', from: 'left', dist: 30, tracking: 2, alpha: clamp((d - p) / 0.4) });
  if (sub) revealText(g, sub, x + 30, y + 30, { family: FONT.serif, style: 'italic', weight: '400', size: 28, color: '#e6e0d6', p: p - 0.25, align: 'left', from: 'left', dist: 20, alpha: clamp((d - p) / 0.4) });
}

// ================= specific infographics =================
// "an inch or so a year — about as fast as your fingernails grow"
export function infoInchYear(g, p, d) {
  paperBG(g, p, { ribbon: { y: 760, amp: 60, color: 'rgba(216,49,47,0.10)', width: 120 } });
  g.save(); drift(g, p, d);
  header(g, p, 960, 250, 'they move just', '1 INCH A YEAR', { size: 130 });
  const k = ease.inOutCubic((p - 0.9) / 2.2);
  // two rows: plate vs fingernail
  const rows = [['TECTONIC PLATE', '#d8312f', 1.0], ['FINGERNAIL', '#1d1f22', 0.92]];
  rows.forEach(([lab, c, val], i) => {
    const y = 520 + i * 170; const a = clamp((p - 0.6 - i * 0.25) / 0.4);
    g.globalAlpha = a; setFont(g, FONT.sans, 30, '800'); g.fillStyle = INK; g.textAlign = 'left'; g.fillText(lab, 360, y - 30);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(360, y, 1200, 46);
    shadowed(g, () => { g.fillStyle = c; g.fillRect(360, y, 1200 * val * k, 46); }, { blur: 20, y: 8, color: 'rgba(0,0,0,0.18)' });
    setFont(g, FONT.mono, 28, '700'); g.fillStyle = INK; g.fillText(`${(2.5 * val * k).toFixed(1)} cm / yr`, 360 + 1200 * val * k + 18, y + 32);
    g.globalAlpha = 1;
  });
  // ruler ticks
  g.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i <= 24; i++) g.fillRect(360 + i * 50, 870, 2, i % 4 === 0 ? 26 : 12);
  revealText(g, '≈ as fast as your fingernails grow', 960, 960, { family: FONT.serif, style: 'italic', size: 44, color: INK, p: p - 2.0, stagger: 0.02, from: 'up', dist: 14 });
  // fingernail illustration growing (top-right)
  const fk = ease.outBack(clamp((p - 2.2) / 0.6)); if (fk > 0) { g.save(); g.translate(1600, 300); g.scale(fk, fk);
    shadowed(g, () => { g.fillStyle = '#e8b896'; g.beginPath(); g.ellipse(0, 40, 90, 150, 0, 0, TAU); g.fill(); }, { blur: 30, y: 12, color: 'rgba(0,0,0,0.2)' });
    const grow = ease.inOutCubic((p - 2.6) / 2.0) * 40; g.fillStyle = '#f7d9cc'; g.beginPath(); g.roundRect(-58, -60 - grow, 116, 120 + grow, [50, 50, 18, 18]); g.fill();
    g.fillStyle = '#fff7f0'; g.beginPath(); g.roundRect(-58, -60 - grow, 116, 22 + grow, [50, 50, 0, 0]); g.fill();
    g.strokeStyle = RED; g.lineWidth = 3; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(80, -60); g.lineTo(80, -60 - grow); g.stroke(); g.setLineDash([]);
    g.restore(); }
  g.restore();
}
// "continents weighing billions upon billions of tons"
export function infoTons(g, p, d) {
  darkBG(g, p, { glow: 'rgba(255,120,40,0.20)' });
  g.save(); drift(g, p, d, { zoom: 0.06 });
  revealText(g, 'a continent weighs', 960, 330, { family: FONT.serif, style: 'italic', size: 52, color: '#cfc7bb', p, stagger: 0.02 });
  const digits = Math.floor(clamp((p - 0.3) / 2.2) * 18) + 1; let s = '1'; for (let i = 0; i < digits; i++) s += '0';
  const str = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  setFont(g, FONT.title, 170, '400'); let w = g.measureText(str).width; const sc = Math.min(1, 1700 / w);
  g.save(); g.translate(960, 560); g.scale(sc, sc); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(255,140,60,0.6)'; g.shadowBlur = 40; g.fillText(str, 0, 0); g.restore();
  revealText(g, 'TONS', 960, 720, { family: FONT.sans, weight: '900', size: 64, color: '#ff8a3a', p: p - 0.6, tracking: 30 });
  revealText(g, 'billions upon billions', 960, 830, { family: FONT.serif, style: 'italic', size: 44, color: '#9a948c', p: p - 1.3, stagger: 0.02 });
  g.restore();
}
// seismic gap stats over the map (2.5D overlay)
export function infoGapStats(g, p, d, { miles = true, years = true, yearsP = null } = {}) {
  const k = ease.outCubic(p / 0.6);
  g.save(); g.globalAlpha = k; g.fillStyle = 'rgba(8,10,14,0.55)'; g.fillRect(90, 90, 560, years ? 330 : 200); g.fillStyle = '#ffd23c'; g.fillRect(90, 90, 8, years ? 330 : 200); g.restore();
  revealText(g, 'SEISMIC GAP', 130, 150, { family: FONT.sans, weight: '900', size: 40, color: '#ffd23c', p, align: 'left', from: 'left', tracking: 4 });
  if (miles) { const v = Math.round(counter(p, 0.3, 1.8, 0, 125)); revealText(g, `${v} MILES`, 130, 240, { family: FONT.title, size: 104, color: '#fff', p: p - 0.2, align: 'left', from: 'up', stagger: 0.02 }); }
  if (years) { const yp = yearsP !== null ? yearsP : p - 1.0; const v = Math.round(counter(yp, 0.1, 2.0, 0, 120)); revealText(g, `${v}+ YEARS`, 130, 350, { family: FONT.title, size: 104, color: '#fff', p: yp, align: 'left', from: 'up', stagger: 0.02 }); revealText(g, 'without a major earthquake', 134, 405, { family: FONT.serif, style: 'italic', size: 30, color: '#cfc7bb', p: yp - 0.6, align: 'left' }); }
}
// "the arabian plate should have moved almost eight feet north... ground barely moved"
export function infoEightFeet(g, p, d, { tActual = 2.4 } = {}) {
  paperBG(g, p, {});
  g.save(); drift(g, p, d);
  header(g, p, 960, 190, 'over 120 years, Arabia should have moved', '8 FEET', { size: 140 });
  const base = 900, ft = 70; // px per foot
  // person for scale (6 ft)
  const pk = ease.outBack(clamp((p - 0.5) / 0.6));
  g.save(); g.translate(560, base); g.scale(pk, pk); iconPerson(g, 0, 0, 6 * ft * 1.0, '#9aa0a6'); g.restore();
  revealText(g, '6 FT', 560, base + 40, { family: FONT.mono, size: 26, weight: '700', color: MUTED, p: p - 0.8 });
  // expected arrow (8 ft) vs actual (~0)
  const e = ease.inOutCubic((p - 0.9) / 1.6); const h8 = 8 * ft * e;
  shadowed(g, () => { g.fillStyle = RED; g.fillRect(860, base - h8, 120, h8); g.beginPath(); g.moveTo(830, base - h8); g.lineTo(920, base - h8 - 70 * e); g.lineTo(1010, base - h8); g.fill(); }, { blur: 30, y: 14 });
  revealText(g, 'EXPECTED', 920, base + 40, { family: FONT.sans, size: 28, weight: '800', color: RED, p: p - 1.0, tracking: 4 });
  const a = ease.outCubic((p - tActual) / 0.8); const h0 = 0.15 * ft * a;
  g.fillStyle = INK; g.fillRect(1220, base - h0 - 4, 120, h0 + 4);
  revealText(g, 'ACTUAL', 1280, base + 40, { family: FONT.sans, size: 28, weight: '800', color: INK, p: p - tActual, tracking: 4 });
  revealText(g, 'barely moved at all', 1280, base - 80, { family: FONT.serif, style: 'italic', size: 40, color: INK, p: p - tActual - 0.4 });
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(380, base, 1160, 3);
  g.restore();
}
// construction amnesty 2018: big year + grid of buildings being "approved"
export function infoAmnesty(g, p, d) {
  paperBG(g, p, { ribbon: { y: 300, amp: 80, color: 'rgba(216,49,47,0.12)', width: 90 } });
  g.save(); drift(g, p, d);
  revealText(g, 'ahead of the elections', 960, 150, { family: FONT.serif, style: 'italic', size: 44, color: MUTED, p });
  revealText(g, '2018', 960, 300, { family: FONT.title, size: 230, color: INK, p: p - 0.2, from: 'scale', stagger: 0.08 });
  revealText(g, 'CONSTRUCTION AMNESTY', 960, 440, { family: FONT.sans, size: 58, weight: '900', color: RED, p: p - 0.6, tracking: 8 });
  // building grid filling with check stamps
  const cols = 26, rows = 5; const n = Math.floor(clamp((p - 1.0) / 3.0) * cols * rows); const r = new RNG(3);
  for (let i = 0; i < cols * rows; i++) {
    const x = 250 + (i % cols) * 56, y = 600 + Math.floor(i / cols) * 86; const hh = 40 + r.next() * 30;
    iconBuilding(g, x, y + 60, 34, hh, i < n ? '#3a3d42' : 'rgba(0,0,0,0.08)', i < n ? 'rgba(255,230,180,0.6)' : 'rgba(0,0,0,0)');
    if (i < n && i % 3 === 0) { g.fillStyle = RED; g.beginPath(); g.arc(x + 12, y + 60 - hh, 9, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + 7, y + 60 - hh); g.lineTo(x + 11, y + 64 - hh); g.lineTo(x + 17, y + 55 - hh); g.stroke(); }
  }
  revealText(g, 'MILLIONS OF BUILDINGS LEGALIZED', 960, 1030, { family: FONT.sans, size: 40, weight: '800', color: INK, p: p - 2.2, tracking: 6 });
  g.restore();
}
// "without requiring a meaningful engineering assessment": checklist with the safety box crossed out
export function infoNoCheck(g, p, d) {
  paperBG(g, p, {});
  g.save(); drift(g, p, d);
  header(g, p, 960, 220, 'what was checked?', 'THE PAPERWORK', { size: 120 });
  const items = [['Application form', true], ['Fee paid', true], ['Engineering assessment', false], ['Earthquake safety', false]];
  items.forEach(([t, ok], i) => {
    const y = 430 + i * 130; const a = clamp((p - 0.6 - i * 0.35) / 0.4);
    g.globalAlpha = a; shadowed(g, () => { g.fillStyle = '#fff'; g.fillRect(560, y - 50, 800, 96); }, { blur: 30, y: 10, color: 'rgba(0,0,0,0.12)' });
    g.strokeStyle = ok ? '#2e8b57' : RED; g.lineWidth = 4; g.strokeRect(600, y - 22, 40, 40);
    setFont(g, FONT.sans, 40, '700'); g.fillStyle = ok ? INK : '#9a9a9a'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(t, 680, y);
    if (ok) { g.strokeStyle = '#2e8b57'; g.lineWidth = 6; g.beginPath(); g.moveTo(606, y); g.lineTo(618, y + 12); g.lineTo(640, y - 18); g.stroke(); }
    else { const s = clamp((p - 1.6 - i * 0.35) / 0.3); g.strokeStyle = RED; g.lineWidth = 6; g.beginPath(); g.moveTo(670, y); g.lineTo(670 + 620 * s, y); g.stroke(); setFont(g, FONT.sans, 28, '900'); g.fillStyle = RED; g.globalAlpha = a * s; g.fillText('SKIPPED', 1210, y); }
    g.globalAlpha = 1;
  });
  g.restore();
}
// "more than 15 million people lie in their beds" — dark night
export function infoMillions(g, p, d) {
  darkBG(g, p, { tone: '#05070d', glow: 'rgba(60,90,160,0.25)' });
  g.save(); drift(g, p, d, { zoom: 0.05 });
  const v = counter(p, 0.2, 2.6, 0, 15000000);
  setFont(g, FONT.title, 210); g.fillStyle = '#e8eefc'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(120,160,255,0.5)'; g.shadowBlur = 40; g.fillText(formatNum(Math.round(v)), 960, 420); g.shadowBlur = 0;
  revealText(g, 'PEOPLE ASLEEP', 960, 570, { family: FONT.sans, weight: '900', size: 56, color: '#8fb0ff', p: p - 0.6, tracking: 22 });
  // field of tiny sleeping figures (windows)
  const r = new RNG(5); const n = Math.floor(clamp((p - 0.3) / 2.5) * 700);
  for (let i = 0; i < 700; i++) { const x = 160 + (i % 50) * 32 + (Math.floor(i / 50) % 2) * 16, y = 700 + Math.floor(i / 50) * 24; if (y > 1040) break; g.fillStyle = i < n ? (r.next() < 0.85 ? 'rgba(255,200,120,0.75)' : 'rgba(160,190,255,0.7)') : 'rgba(255,255,255,0.05)'; g.fillRect(x, y, 14, 9); }
  g.restore();
}
// big magnitude number (red dramatic style)
export function infoMagnitude(g, p, d, { value = '7.5', kicker = 'a second earthquake', note = 'magnitude' } = {}) {
  g.fillStyle = '#6e0d0d'; g.fillRect(0, 0, 1920, 1080);
  const gr = g.createRadialGradient(960, 540, 100, 960, 540, 1100); gr.addColorStop(0, '#b3171a'); gr.addColorStop(1, '#3a0505'); g.fillStyle = gr; g.fillRect(0, 0, 1920, 1080);
  g.save(); drift(g, p, d, { zoom: 0.08 });
  // diagonal stripes
  g.globalAlpha = 0.08; g.fillStyle = '#000'; for (let x = -1080; x < 1920; x += 140) { g.beginPath(); g.moveTo(x, 1080); g.lineTo(x + 60, 1080); g.lineTo(x + 1140, 0); g.lineTo(x + 1080, 0); g.fill(); } g.globalAlpha = 1;
  // seismogram trace
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.beginPath(); const sp = clamp(p / 1.5);
  for (let x = 0; x < 1920 * sp; x += 3) { const t = x / 1920; const a = Math.exp(-((t - 0.5) ** 2) * 30) * 260 + 6; const y = 820 + Math.sin(x * 0.31) * a * noise1(x * 0.05) ; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  revealText(g, kicker, 960, 250, { family: FONT.serif, style: 'italic', size: 54, color: '#ffd9d0', p });
  const shake = Math.max(0, 1 - (p - 0.3) / 1.2) * 14; g.save(); g.translate(noise1(p * 30) * shake, noise1(p * 27 + 3) * shake);
  revealText(g, value, 960, 520, { family: FONT.title, size: 420, color: '#ffffff', p: p - 0.25, from: 'scale', stagger: 0.07, dur: 0.35, shadow: { color: 'rgba(0,0,0,0.5)', blur: 50, y: 20 } });
  g.restore();
  revealText(g, note.toUpperCase(), 960, 760, { family: FONT.sans, weight: '900', size: 52, color: '#ffd9d0', p: p - 0.7, tracking: 26 });
  g.restore();
}
// survival window: days timeline
export function infoSurvival(g, p, d) {
  paperBG(g, p, {});
  g.save(); drift(g, p, d);
  header(g, p, 960, 200, 'without water or warmth', 'A FEW DAYS', { size: 130 });
  const x0 = 260, x1 = 1660, y0 = 880, y1 = 420; const days = 8;
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  for (let i = 0; i <= days; i++) { const x = lerp(x0, x1, i / days); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 1, y0, 2, 14); setFont(g, FONT.mono, 24, '700'); g.fillStyle = INK; g.textAlign = 'center'; g.fillText(i === 0 ? 'QUAKE' : 'DAY ' + i, x, y0 + 46); }
  const k = clamp((p - 0.6) / 2.2); g.strokeStyle = RED; g.lineWidth = 6; g.beginPath();
  for (let i = 0; i <= 200 * k; i++) { const u = i / 200; const x = lerp(x0, x1, u); const surv = Math.exp(-u * days / 1.6); const y = lerp(y0, y1, surv); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  g.fillStyle = 'rgba(216,49,47,0.08)'; g.beginPath(); g.moveTo(x0, y0); for (let i = 0; i <= 200 * k; i++) { const u = i / 200; g.lineTo(lerp(x0, x1, u), lerp(y0, y1, Math.exp(-u * days / 1.6))); } g.lineTo(lerp(x0, x1, k), y0); g.fill();
  // miracles markers day 6-7
  const m = clamp((p - 2.6) / 0.5); if (m > 0) for (const dd of [6, 7]) { const x = lerp(x0, x1, dd / days); const y = y0 - 60; g.globalAlpha = m; g.fillStyle = '#e6a23c'; g.beginPath(); g.arc(x, y, 16 * ease.outBack(m), 0, TAU); g.fill(); g.globalAlpha = 1; }
  if (m > 0) revealText(g, 'miracles', lerp(x0, x1, 6.5 / days), y0 - 120, { family: FONT.serif, style: 'italic', size: 40, color: '#b0761d', p: p - 2.7 });
  g.restore();
}
// death toll
export function infoDeathToll(g, p, d) {
  darkBG(g, p, { tone: '#070707', glow: 'rgba(255,255,255,0.06)' });
  g.save(); drift(g, p, d, { zoom: 0.035 });
  revealText(g, 'the official death toll passes', 960, 330, { family: FONT.serif, style: 'italic', size: 48, color: '#a8a29a', p });
  const v = Math.round(counter(p, 0.3, 3.0, 0, 50000, ease.outCubic));
  setFont(g, FONT.title, 300); g.fillStyle = '#f2efe9'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(formatNum(v), 960, 560);
  const lw = 700 * ease.inOutCubic((p - 1.0) / 1.5); g.fillStyle = RED; g.fillRect(960 - lw / 2, 720, lw, 4);
  revealText(g, 'AND KEEPS RISING', 960, 800, { family: FONT.sans, weight: '800', size: 40, color: '#c9c2b8', p: p - 2.2, tracking: 18 });
  g.restore();
}
// newspaper headlines stacking: arrests
export function infoHeadlines(g, p, d) {
  paperBG(g, p, { tone: '#e4e1da' });
  g.save(); drift(g, p, d, { zoom: 0.05 });
  const items = [['DEVELOPERS DETAINED', 'Hundreds of warrants issued after collapse', -0.06], ['"SAFE" TOWERS TURN TO DUST', 'Luxury blocks fall like houses of cards', 0.05], ['SEA SAND IN THE CONCRETE', 'Investigators find missing columns', -0.03]];
  items.forEach(([h, s, rot], i) => {
    const t0 = i * 0.9; const k = ease.outBack(clamp((p - t0) / 0.5)); if (k <= 0) return;
    g.save(); g.translate(960 + (i - 1) * 140, 380 + i * 210); g.rotate(rot); g.scale(lerp(1.4, 1, k), lerp(1.4, 1, k)); g.globalAlpha = clamp((p - t0) / 0.2);
    shadowed(g, () => { g.fillStyle = '#f6f3ec'; g.fillRect(-620, -110, 1240, 220); }, { blur: 50, y: 24, color: 'rgba(0,0,0,0.35)' });
    g.fillStyle = INK; g.fillRect(-590, -86, 1180, 4); setFont(g, FONT.serif, 22, '700'); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('THE DAILY  •  FEBRUARY 2023', -590, -54);
    setFont(g, FONT.sans, 70, '900'); g.fillStyle = i === 0 ? RED : INK; g.fillText(h, -590, 22);
    setFont(g, FONT.serif, 30, '400', 'italic'); g.fillStyle = '#555'; g.fillText(s, -590, 72);
    g.restore();
  });
  g.restore();
}
// cold: 23 °F
export function infoCold(g, p, d) {
  darkBG(g, p, { tone: '#06101a', glow: 'rgba(120,190,255,0.25)' });
  g.save(); drift(g, p, d, { zoom: 0.05 });
  revealText(g, 'at night temperatures drop to', 960, 300, { family: FONT.serif, style: 'italic', size: 50, color: '#a9c6e6', p });
  const v = Math.round(counter(p, 0.3, 2.0, 41, 23, ease.outCubic));
  revealText(g, `${v}°F`, 960, 520, { family: FONT.title, size: 300, color: '#e8f4ff', p: p - 0.2, from: 'scale', shadow: { color: 'rgba(120,190,255,0.6)', blur: 40 } });
  revealText(g, `${Math.round((v - 32) * 5 / 9)}°C`, 960, 720, { family: FONT.sans, weight: '800', size: 60, color: '#7fb8ee', p: p - 0.8, tracking: 10 });
  // frost crystals
  const r = new RNG(9); g.strokeStyle = 'rgba(200,230,255,0.35)'; g.lineWidth = 2; const k = clamp(p / 3);
  for (let i = 0; i < 26; i++) { const x = r.next() < 0.5 ? r.next() * 260 : 1920 - r.next() * 260, y = r.next() * 1080; const L = (20 + r.next() * 50) * k; for (let a = 0; a < 6; a++) { const an = a * Math.PI / 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L); g.stroke(); } }
  g.restore();
}
// "nearly two miles per second" speed readout over the rupture map
export function infoSpeed(g, p, d) {
  const k = ease.outCubic(p / 0.5);
  g.save(); g.globalAlpha = k; g.fillStyle = 'rgba(8,10,14,0.6)'; g.fillRect(1320, 110, 500, 250); g.fillStyle = '#ff6a3a'; g.fillRect(1320, 110, 8, 250); g.restore();
  revealText(g, 'RUPTURE SPEED', 1360, 165, { family: FONT.sans, weight: '900', size: 34, color: '#ff8a5a', p, align: 'left', tracking: 4 });
  const v = counter(p, 0.2, 1.4, 0, 2.0); revealText(g, `${v.toFixed(1)} MI/S`, 1360, 255, { family: FONT.title, size: 110, color: '#fff', p: p - 0.1, align: 'left', stagger: 0.02 });
  revealText(g, `≈ ${Math.round(v * 1.609 * 3600).toLocaleString('en-US')} km/h`, 1362, 325, { family: FONT.mono, weight: '700', size: 30, color: '#cfc7bb', p: p - 0.5, align: 'left' });
}
// displacement readout
export function infoDisplacement(g, p, d) {
  const k = ease.outCubic(p / 0.5);
  g.save(); g.globalAlpha = k; g.fillStyle = 'rgba(8,10,14,0.6)'; g.fillRect(100, 640, 640, 330); g.fillStyle = '#ffffff'; g.fillRect(100, 640, 8, 330); g.restore();
  revealText(g, 'GROUND SHIFTED', 140, 700, { family: FONT.sans, weight: '900', size: 36, color: '#fff', p, align: 'left', tracking: 4 });
  revealText(g, '10–13 FT', 140, 800, { family: FONT.title, size: 110, color: '#fff', p: p - 0.2, align: 'left', stagger: 0.03 }); revealText(g, 'on average', 470, 805, { family: FONT.serif, style: 'italic', size: 34, color: '#cfc7bb', p: p - 0.7, align: 'left' });
  revealText(g, 'UP TO 23 FT', 140, 910, { family: FONT.title, size: 90, color: '#ff8a3a', p: p - 2.6, align: 'left', stagger: 0.03 });
}
