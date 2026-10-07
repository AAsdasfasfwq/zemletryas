// Small DSL for writing the shot list: shots, transitions, sound cues, camera moves, colour grades.
import * as THREE from 'three';
import { clamp, lerp, ease, smooth, lerpV, pathAt, noise1 } from '../engine/util.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function createDSL(director) {
  const shots = []; const cues = [];
  const api = {
    shots, cues,
    S(t0, fn) { if (!Number.isFinite(t0)) console.error('bad shot time', t0, fn.toString().slice(0, 80)); shots.push({ t0, fn }); },
    whip(t, dir = [1, 0], len = 0.16) { director.transitions.push({ t, kind: 'whip', len, dir }); cues.push({ t: t - 0.12, name: 'whoosh', p: { gain: 0.5 } }); },
    flash(t, len = 0.6, color = [1, 1, 1], amount = 1) { director.transitions.push({ t, kind: 'flash', len, color, amount }); },
    dip(t, len = 0.35) { director.transitions.push({ t, kind: 'dip', len }); },
    zoom(t, len = 0.25) { director.transitions.push({ t, kind: 'zoom', len }); },
    cue(t, name, p = {}) { if (Number.isFinite(t)) cues.push({ t, name, p }); },
  };
  return api;
}

// ---------- camera moves (all driven by c.u = 0..1 over the shot) ----------
export function dolly(c, p0, p1, l0, l1, e = ease.inOutCubic, u = c.u) { const k = e(u); c.look(lerpV(p0, p1, k), lerpV(l0, l1 || l0, k)); }
export function orbit(c, center, r, h, a0, a1, e = ease.inOutCubic, u = c.u) { const a = lerp(a0, a1, e(u)); c.look(V(center.x + Math.cos(a) * r, center.y + h, center.z + Math.sin(a) * r), center); }
export function path(c, pts, looks, e = ease.inOutCubic, u = c.u) { const k = e(u); const p = pathAt(pts, k); const l = Array.isArray(looks) ? pathAt(looks, k) : looks; c.look(p, l); }
// "push in" on a target from a given offset direction
export function push(c, target, from, amount = 0.25, e = ease.outCubic) { const k = e(c.u); const p = target.clone().add(from.clone().multiplyScalar(1 - amount * k)); c.look(p, target); }

// ---------- colour grades ----------
const GRADES = {
  warm: { saturation: 1.18, contrast: 1.1, temperature: 0.35, tint: 0.05, lift: [0.01, 0.005, 0.0], gain: [1.03, 1.0, 0.95], vignette: 0.45, bloomStrength: 0.55 },
  golden: { saturation: 1.22, contrast: 1.12, temperature: 0.5, tint: 0.08, lift: [0.015, 0.008, 0.0], gain: [1.05, 1.0, 0.92], vignette: 0.5, bloomStrength: 0.7 },
  neutral: { saturation: 1.1, contrast: 1.08, temperature: 0, tint: 0, vignette: 0.42, bloomStrength: 0.5 },
  cold: { saturation: 0.95, contrast: 1.1, temperature: -0.45, tint: -0.02, lift: [0.0, 0.01, 0.025], gain: [0.95, 1.0, 1.06], vignette: 0.55, bloomStrength: 0.6 },
  night: { saturation: 1.05, contrast: 1.12, temperature: -0.3, tint: 0.0, lift: [0.0, 0.006, 0.02], gain: [1.0, 1.0, 1.05], vignette: 0.6, bloomStrength: 0.85, bloomThreshold: 0.8 },
  dust: { saturation: 0.82, contrast: 1.05, temperature: 0.15, tint: 0.02, lift: [0.02, 0.018, 0.012], gain: [1.0, 0.98, 0.93], vignette: 0.55, bloomStrength: 0.5 },
  grey: { saturation: 0.78, contrast: 1.08, temperature: -0.05, tint: 0, lift: [0.01, 0.012, 0.016], vignette: 0.55, bloomStrength: 0.45 },
  space: { saturation: 1.15, contrast: 1.12, temperature: -0.05, tint: 0, vignette: 0.6, bloomStrength: 0.9, bloomThreshold: 0.85 },
  hell: { saturation: 1.2, contrast: 1.15, temperature: 0.2, tint: 0.04, vignette: 0.6, bloomStrength: 0.6, bloomThreshold: 1.1, exposure: 0.85 },
  macro: { saturation: 1.15, contrast: 1.14, temperature: 0.2, tint: 0.02, vignette: 0.65, bloomStrength: 0.6 },
  map: { saturation: 1.12, contrast: 1.08, temperature: 0.05, tint: 0, vignette: 0.45, bloomStrength: 0.6 },
  blood: { saturation: 1.1, contrast: 1.18, temperature: 0.3, tint: 0.05, lift: [0.02, 0.0, 0.0], vignette: 0.65, bloomStrength: 0.8 },
  flat: { saturation: 1.0, contrast: 1.0, temperature: 0, tint: 0, vignette: 0.15, grain: 0.02, bloomStrength: 0, chroma: 0 },
};
export function grade(c, name, extra = {}) { const g = GRADES[name] || GRADES.neutral; Object.assign(c.post, g, extra); }
export function dof(c, focus, aperture = 0.6, maxBlur = 14) { c.post.focus = focus; c.post.aperture = aperture; c.post.maxBlur = maxBlur; }
// fade from/to black within a shot
export function fadeIn(c, len = 0.5) { c.post.fade = Math.max(c.post.fade, 1 - smooth(c.lt / len)); }
export function fadeOut(c, len = 0.5) { c.post.fade = Math.max(c.post.fade, 1 - smooth((c.dur - c.lt) / len)); }
// quake envelope helper: rise, sustain, decay
export function quakeAmp(t, t0, { rise = 2, hold = 40, decay = 20, peak = 1 } = {}) {
  const x = t - t0; if (x < 0) return 0; if (x < rise) return peak * smooth(x / rise); if (x < rise + hold) return peak * (0.85 + 0.15 * noise1(x * 0.7)); return peak * Math.max(0, 1 - (x - rise - hold) / decay);
}
