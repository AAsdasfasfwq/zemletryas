// Helpers shared by the act files.
import * as THREE from 'three';
import { V, grade, dof } from './dsl.js';
import { timeCard } from '../overlay/overlay.js';
import { mx, mz } from '../assets/regionmap.js';
import { clamp, ease, smooth, lerp, noise1 } from '../engine/util.js';

export const GOLD = { tod: 'golden', windows: 0, lamps: 0 };
export const DAY = { tod: 'day', windows: 0, lamps: 0 };
export const WINTER_DUSK = { tod: 'winterDusk', windows: 0.7, lamps: 1, snow: 1, snowCover: 1, traffic: 0.5, people: 'few' };
export const NIGHT_SNOW = { tod: 'night', windows: 0.9, lamps: 1, snow: 0.8, snowCover: 1, traffic: 0.25, people: 'none' };
export const NIGHT_RAIN = { tod: 'stormNight', windows: 0.85, lamps: 1, snow: 0.35, rain: 1, wet: true, snowCover: 1, traffic: 0.12, people: 'none' };
export const SLEEP = { tod: 'night', windows: 0.12, lamps: 1, snow: 0.6, snowCover: 1, traffic: 0, people: 'none' };
export const BLACKOUT = { tod: 'blackout', windows: 0, lamps: 0, snow: 0.6, rain: 0.4, snowCover: 1, traffic: 0, people: 'none', destroyed: true, haze: 0.5, hazeColor: [0.13, 0.125, 0.125], fires: true, smoke: true, fogMul: 1.0, fogColor: [0.07, 0.08, 0.11] };
export const RUINS_DAY = { tod: 'overcast', windows: 0, lamps: 0, traffic: 0, people: 'none', destroyed: true, haze: 0.6, smoke: true, snowCover: 1, fogMul: 1.25 };

export function city(c, o) { const s = c.use('city'); s.update(c.t, { camera: c.cam, ...o }); c.post.exposure = s.exposure; return s; }
export function mapSet(c, o) { const s = c.use('map'); s.update(c.t, { camera: c.cam, ...o }); return s; }
export function mp(lon, lat, h = 0) { return V(mx(lon), h, mz(lat)); }

export function card(D, t0, big, small, opts = {}) {
  D.S(t0, (c) => { const g = c.only2D(); timeCard(g, c.lt, c.dur, { big, small, ...opts }); c.post.grain = 0.05; c.post.vignette = 0.2; });
  D.cue(t0, 'card', {});
}
