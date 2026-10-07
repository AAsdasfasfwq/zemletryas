// "3 YEARS AFTER": erased neighbourhoods, container cities, Syria's tents, the released fault,
// Istanbul's waiting fault, and the closing argument.
import * as THREE from 'three';
import { T, TE, TP } from '../timing.js';
import { DURATION } from '../timing.js';
import { V, dolly, orbit, path, push, grade, dof, fadeIn, fadeOut } from './dsl.js';
import { GOLD, RUINS_DAY, city, mapSet, mp, card } from './common.js';
import { ease, clamp, lerp, smooth, noise1 } from '../engine/util.js';
import { FONT, revealText, timeCard } from '../overlay/overlay.js';
import * as INFO from '../overlay/info.js';
import { CITIES, mx, mz } from '../assets/regionmap.js';

const LATER = { tod: 'day', windows: 0, lamps: 0, later: true, traffic: 0.3, people: 'none' };
export function act7(D) {
  const { S, whip, flash, dip, cue } = D;
  card(D, T('three years after the earthquake'), '3 YEARS AFTER', '2026');
  cue(T('the devastated cities'), 'music', { mood: 'reflect', dur: 60 });
  cue(T('the devastated cities'), 'bed', { type: 'wind', dur: 30, gain: 0.45 });
  S(T('the devastated cities'), (c) => { orbit(c, V(0, 0, 0), 230, 120, 0.8, 1.0); c.cam.fov = 40; city(c, { ...LATER, focus: [0, 0, 180] }); grade(c, 'neutral', { saturation: 0.95 }); fadeIn(c, 0.5); });
  S(T('antakya an ancient city'), (c) => { c.cam.fov = 38; dolly(c, V(-150, 40, 80), V(-120, 34, 40), V(0, 0, -20), V(10, 0, -40)); city(c, { ...LATER, focus: [-40, 0, 150] }); grade(c, 'neutral', { saturation: 0.9 });
    const g = c.use2D(); INFO.lowerThird(g, c.lt - 0.3, c.dur, 'ANTAKYA', 'over 2,000 years of history'); });
  S(T('has effectively ceased to exist'), (c) => { c.cam.fov = 40; c.look(V(-44 + 30, 30, -44 + 60), V(-44, 20, -44)); city(c, { ...LATER, focus: [-44, -44, 80] }); grade(c, 'neutral', { saturation: 0.85 }); });
  S(T('where neighborhoods once stood'), (c) => { c.cam.fov = 44; dolly(c, V(-60, 6, 60), V(40, 7, 60), V(-20, 0, 0), V(80, 0, 0), ease.linear); city(c, { ...LATER, focus: [0, 30, 100] }); grade(c, 'neutral', { saturation: 0.85 }); });
  cue(T('millions of tons of concrete rubble'), 'truck', { dur: 6, gain: 0.35 });
  S(T('millions of tons of concrete rubble'), (c) => { c.cam.fov = 36; c.look(V(150 - c.u * 30, 50, 140), V(300, 20, -150)); city(c, { ...LATER, focus: [200, -50, 200], fogMul: 0.6 }); grade(c, 'neutral', { saturation: 0.85 }); });
  S(T('hundreds of thousands of turkish citizens'), (c) => { c.cam.fov = 40; orbit(c, V(-3.5 * 44 + 10, 0, 3 * 44 - 4), 90, 45, 0.9, 1.15); city(c, { ...LATER, focus: [-140, 128, 90] }); grade(c, 'neutral');
    const g = c.use2D(); INFO.tag(g, c.lt - 1.0, 960, 940, 'TEMPORARY CONTAINER CITIES', { size: 38 }); });
  S(T('in syria the situation is even bleaker'), (c) => { c.cam.fov = 40; orbit(c, V(300, 0, 0), 80, 30, 2.0, 2.2); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'camp', mood: 'winterDusk', snow: 0.8, fires: true }); grade(c, 'cold'); });
  S(T('many families are still spending'), (c) => { c.cam.fov = 32; c.look(V(300 + 12 - c.u * 2, 1.8, 12), V(300 + 3, 1.2, 3)); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'camp', mood: 'winterDusk', snow: 1, fires: true }); grade(c, 'cold'); dof(c, 10, 0.4); });
  S(T('waiting for permanent homes'), (c) => { c.cam.fov = 30; c.look(V(300 - 10 + 2.6, 1.2, 4 + 2.2), V(300 - 10, 1.0, 4)); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'camp', mood: 'winterDusk', snow: 0.8, fires: true }); grade(c, 'warm', { saturation: 0.9 }); dof(c, 3, 0.8); });
  S(T('the psychological scars'), (c) => { const r = c.use('room'); c.cam.fov = 38; c.look(V(-0.5 + c.u * 0.6, 1.6, 2.6), V(1.7, 1.0, -0.5)); r.update(c.t, { room: 'living', tv: 'off', power: 0, crack: 1 }); r.family.forEach((p) => (p.visible = false)); grade(c, 'cold', { saturation: 0.45 }); });
  // geology
  cue(T('geologically the east anatolian'), 'music', { mood: 'calm', dur: 14 });
  S(T('geologically the east anatolian'), (c) => { const b = c.use('block'); c.cam.fov = 36; orbit(c, V(0, -4, 0), 60, 26, 2.0, 2.25); b.update(c.t, { S: 15, snap: 1, heat: 1 - smooth(c.lt / 2.5), trace: 0.2 }); grade(c, 'neutral'); });
  S(T('it has discharged pressure'), (c) => { const b = c.use('block'); c.cam.fov = 26; c.look(V(2, 3, 11), V(0, 1.7, 0)); b.update(c.t, { S: 15, snap: 1, spring: { snapT: 5 + c.lt, stretch: 0 } }); grade(c, 'neutral'); dof(c, 11, 0.6); });
  S(T('this stretch will not see'), (c) => { c.cam.fov = 38; c.look(V(mx(37.4) - 10, 50, mz(37.2) + 40), V(mx(37.4), 0, mz(37.6))); mapSet(c, { faults: { EAF: 1, EAF_i: 0.35 }, plates: [0.3, 0.3, 0, 0], focus: [mx(37.4), mz(37.6), 60] }); grade(c, 'map', { saturation: 0.95 }); });
  // Istanbul
  cue(T('but near istanbul'), 'music', { mood: 'tension', dur: 22 });
  cue(T('but near istanbul'), 'bed', { type: 'sea', dur: 12, gain: 0.45 });
  S(T('but near istanbul'), (c) => { const s = c.use('istanbul'); c.cam.fov = 40; dolly(c, V(600, 180, 1200), V(300, 140, 900), V(-700, 60, 200), V(-800, 60, 300)); s.update(c.t, {}); grade(c, 'golden'); });
  S(T('a city of millions'), (c) => { const s = c.use('istanbul'); c.cam.fov = 34; c.look(V(-300 + c.u * 60, 70, 900), V(-850, 80, 420)); s.update(c.t, {}); grade(c, 'golden'); });
  S(T('another fault has been quiet'), (c) => { c.cam.fov = 38; const I = CITIES.Istanbul; dolly(c, V(mx(28.6), 40, mz(40.2) + 25), V(mx(28.6), 26, mz(40.4) + 16), V(mx(28.6), 0, mz(40.8)), V(mx(28.7), 0, mz(40.85)));
    mapSet(c, { marmara: smooth(c.lt / 1.5), markers: { Istanbul: 1 }, faults: { NAF: 1, NAF_i: 0.4 }, focus: [mx(28.7), mz(40.8), 40] }); grade(c, 'map');
    const g = c.use2D(); const p = c.project(mp(28.98, 41.01, 0.3)); INFO.callout(g, c.lt - 0.5, p, 'ISTANBUL', '16 million people', { side: 1, len: 180, rise: 90 }); INFO.tag(g, c.lt - 1.6, 960, 940, 'QUIET FOR 250+ YEARS', { size: 42, bg: 'rgba(216,49,47,0.85)' }); });
  S(T('there the spring is stretched'), (c) => { const s = c.use('istanbul'); c.cam.fov = 36; c.look(V(200, 50, 400), V(-200, -10, -1400)); s.update(c.t, { faultGlow: smooth(c.lt / 1) }); grade(c, 'golden', { temperature: 0.2 }); });
  S(T('the tragedy of 2023'), (c) => { orbit(c, V(0, 0, 0), 160, 70, 5.2, 5.4); c.cam.fov = 40; city(c, { ...RUINS_DAY, haze: 0.6, focus: [0, 0, 120] }); grade(c, 'grey', { saturation: 0.6 }); });
  S(T('and a preview of what could happen'), (c) => { const s = c.use('istanbul'); c.cam.fov = 30; c.look(V(-300, 60, 300 + c.u * 40), V(-900, 30, 100)); s.update(c.t, { faultGlow: 0.4 }); grade(c, 'golden', { saturation: 1.0 }); });
  S(T('if its older buildings'), (c) => { const s = c.use('istanbul'); c.cam.fov = 26; c.look(V(-500, 90, -150), V(-900, 40, -350)); s.update(c.t, { faultGlow: 0.3 }); grade(c, 'golden', { saturation: 0.95 }); dof(c, 450, 0.25); });
  // closing argument
  cue(T('planet earth is not trying'), 'music', { mood: 'finale', dur: 32 });
  S(T('planet earth is not trying'), (c) => { const g = c.use('globe'); c.cam.fov = 30; c.look(V(0, 4, 32 - c.u * 4), V(0, 0, 0)); g.update(c.t, { spin: -50 + c.lt * 2, tilt: 18, camera: c.cam, sunDir: [0.9, 0.3, 0.5] }); grade(c, 'space'); });
  S(T('plate tectonics and continental'), (c) => { const g = c.use('globe'); c.cam.fov = 30; orbit(c, V(0, 0, 0), 30, 9, 0.2, 0.55); g.update(c.t, { spin: -20, tilt: 20, camera: c.cam, cracks: 1, crackIntensity: 0.7, sunDir: [0.9, 0.3, 0.5] }); grade(c, 'space'); });
  S(T('they give our planet its mountains'), (c) => { c.cam.fov = 46; const ms = c.sets.map; const cp = (lo, la, h) => { const p = ms.at(lo, la, 0); return V(p.x, Math.max(p.y, 0) + h, p.z); };
    path(c, [cp(42.5, 41.6, 8), cp(44.0, 42.6, 9), cp(45.5, 42.4, 10)], [cp(43.5, 43.0, 2), cp(45, 42.9, 2), cp(47, 42.0, 2)], ease.linear); mapSet(c, { focus: [mx(44), mz(42.5), 30] }); grade(c, 'map', { saturation: 1.15, temperature: 0.25 }); dof(c, 14, 0.3); });
  S(T('and oceans'), (c) => { c.cam.fov = 44; c.look(V(mx(31) + c.u * 6, 7, mz(34.5)), V(mx(30), 0, mz(36.5))); mapSet(c, { focus: [mx(30), mz(36), 40] }); grade(c, 'map', { saturation: 1.15, temperature: 0.2 }); });
  S(T('they help make life possible'), (c) => { c.cam.fov = 36; c.look(V(16 - c.u * 2, 1.7, 20), V(5, 1.0, 12)); city(c, { ...GOLD, focus: [8, 12, 25] }); grade(c, 'golden'); dof(c, 9, 0.6); });
  S(T('what kills people'), (c) => { c.cam.fov = 34; c.look(V(HP0 + 14, 3, 26), V(HP0, 2, 6)); city(c, { ...RUINS_DAY, haze: 0.5, focus: [-6, 6, 30] }); grade(c, 'grey', { saturation: 0.55 }); });
  S(T('made with cheap concrete'), (c) => { const m = c.use('macro'); c.cam.fov = 28; c.look(V(3 - c.u, 2.6, 5), V(0, 1, 0)); m.update(c.t, { prop: 'concrete', crumble: 0.3 + c.u * 0.5, key: 260 }); grade(c, 'macro'); dof(c, 5.5, 0.7); });
  S(T('in defiance of building codes'), (c) => { c.cam.fov = 32; c.look(V(-4, 1.6, 20), V(-6.5, 2, 12)); city(c, { tod: 'golden', windows: 0.3, focus: [-6, 10, 30], colsRemoved: 3, colGhost: 1 }); grade(c, 'grey', { saturation: 0.4 }); });
  S(T('until we learn to respect'), (c) => { c.cam.fov = 40; c.look(V(-60, 120, 240), V(0, 300, -1500)); city(c, { ...GOLD, focus: [0, -200, 300], fogMul: 0.25 }); grade(c, 'golden'); });
  S(T('and build homes that shelter people'), (c) => { const r = c.use('room'); c.cam.fov = 36; dolly(c, V(-0.6, 1.7, 1.9), V(-0.3, 1.6, 1.6), V(1.7, 0.8, 0.3), V(1.7, 0.8, 0.3)); r.update(c.t, { room: 'living', tv: 'off', family: 'tea' }); grade(c, 'warm'); dof(c, 2.4, 0.5); });
  S(T('becoming mass graves'), (c) => { c.cam.fov = 32; c.look(V(HP0 + 8, 2, 20 + c.u), V(HP0, 1.5, 6.5)); city(c, { ...RUINS_DAY, tod: 'dawnGrey', haze: 0.8, focus: [-6, 6, 25] }); grade(c, 'grey', { saturation: 0.4 }); });
  const tEnd = T('this story will repeat itself');
  cue(tEnd, 'card', { big: true });
  cue(tEnd + 2.5, 'rumble', { dur: 4, gain: 0.35 });
  S(tEnd, (c) => { const g = c.only2D(); g.fillStyle = '#000'; g.fillRect(0, 0, 1920, 1080);
    const out = clamp((DURATION - c.t) / 1.2);
    revealText(g, 'THIS STORY', 960, 470, { family: FONT.title, size: 150, color: '#f3efe8', p: c.lt, stagger: 0.05, tracking: 14, alpha: out });
    revealText(g, 'WILL REPEAT ITSELF', 960, 620, { family: FONT.title, size: 150, color: '#d8402f', p: c.lt - 0.7, stagger: 0.05, tracking: 14, alpha: out });
    c.post.grain = 0.05; });
}
const HP0 = -6.5;
