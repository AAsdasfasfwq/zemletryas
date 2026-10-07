// "1 HOUR BEFORE" + "THE EARTHQUAKE 04:17": rupture, energy, P/S waves, collapse, liquefaction, Syria.
import * as THREE from 'three';
import { T, TE, TP, gapTime } from '../timing.js';
import { V, dolly, orbit, path, push, grade, dof, fadeIn, fadeOut, quakeAmp } from './dsl.js';
import { SLEEP, NIGHT_SNOW, city, mapSet, mp, card } from './common.js';
import { ease, clamp, lerp, smooth, noise1 } from '../engine/util.js';
import { FONT, revealText, timeCard } from '../overlay/overlay.js';
import * as INFO from '../overlay/info.js';
import { CITIES, EPI1, mx, mz } from '../assets/regionmap.js';

export function act5(D) {
  const { S, whip, flash, dip, cue, zoom } = D;
  card(D, T('one hour before the earthquake'), '1 HOUR BEFORE', '03:17 A.M.');
  cue(T('cities across southern turkey'), 'music', { mood: 'dread', dur: 34 });
  cue(T('cities across southern turkey'), 'bed', { type: 'night', dur: 30, gain: 0.45 });
  S(T('cities across southern turkey'), (c) => { orbit(c, V(0, 0, 0), 190, 120, 3.3, 3.55); c.cam.fov = 38; city(c, { ...SLEEP, focus: [0, 0, 150] }); grade(c, 'night'); });
  S(T('more than 15 million'), (c) => { const g = c.only2D(); INFO.infoMillions(g, c.lt, c.dur); });
  S(T('eleven miles underground'), (c) => { const b = c.use('block'); c.cam.fov = 40; path(c, [V(-4, 10, 36), V(-2, -2, 30), V(0, -11, 24)], [V(0, 0, 10), V(0, -7, 8), V(0, -12, 4)]);
    b.update(c.t, { S: 14, hideSouth: c.u > 0.6, locked: 0.05, stress: 1, glow: 0.7, crack: 1, melt: 0.6, hypo: 0.8, heat: 0.6 }); grade(c, 'hell');
    const g = c.use2D(); if (c.u < 0.65) { const a = c.project(V(0, 0, 16)), bb = c.project(V(0, -12, 16)); if (!a.behind) revealText(g, '11 MILES', a.x + 40, (a.y + bb.y) / 2, { family: FONT.title, size: 110, color: '#fff', p: c.lt - 0.3, align: 'left', shadow: { color: 'rgba(0,0,0,0.6)', blur: 20 } }); } });
  cue(T('the last barrier between'), 'crumble', { gain: 0.6 });
  S(T('the last barrier between'), (c) => { const b = c.use('block'); c.cam.fov = 26; c.look(V(0.4, -11.7, 5.5 - c.u), V(0, -12, 0)); b.update(c.t, { S: 14, hideSouth: true, locked: lerp(0.05, 0, smooth(c.lt / 1.2)), stress: 1, glow: 0.9, crack: 1, melt: 0.7, sparks: c.lt - 0.3 }); c.shake(0.3); grade(c, 'hell'); });
  S(T('extreme pressure and friction'), (c) => { const b = c.use('block'); c.cam.fov = 32; dolly(c, V(8, -8, 16), V(4, -10, 12), V(0, -12, 0), V(0, -12, 0)); b.update(c.t, { S: 14, hideSouth: true, locked: 0, stress: 1, glow: 1.2, crack: 1, melt: 0.7 + c.u * 0.3 }); grade(c, 'hell');
    const g = c.use2D(); INFO.tag(g, c.lt - 2.0, 960, 930, 'THOUSANDS OF DEGREES', { size: 40, bg: 'rgba(120,20,0,0.6)' }); });
  S(T('turning it into a liquid'), (c) => { const b = c.use('block'); c.cam.fov = 24; c.look(V(-1 + c.u * 2, -12.5, 4.5), V(0, -12, 0)); b.update(c.t, { S: 14, hideSouth: true, locked: 0, stress: 1, glow: 1.4, crack: 1, melt: 1 }); grade(c, 'hell'); dof(c, 4.5, 0.8); });
  cue(T('the fault loses its grip'), 'groan', { dur: 4, gain: 0.5 });
  S(T('the fault loses its grip'), (c) => { const b = c.use('block'); c.cam.fov = 36; orbit(c, V(0, -4, 0), 58, 22, 0.7, 0.8); b.update(c.t, { S: 14, snap: 0.04 + Math.sin(c.t * 30) * 0.01, heat: 1, trace: 1, shake: 0.15, glow: 0.6 }); c.shake(0.15); grade(c, 'blood'); });
  S(T('nothing is left to stop'), (c) => { const b = c.use('block'); c.cam.fov = 22; c.look(V(2, 3, 11 - c.u), V(0, 1.7, 0)); b.update(c.t, { S: 15, heat: 1, spring: { stretch: 1 }, shake: 0.2 + c.u * 0.2 }); c.handheld(2); grade(c, 'blood'); dof(c, 11, 1.0); });
  cue(T('for dozens of cities'), 'heartbeat', { dur: 9, gain: 0.5 });
  S(T('for dozens of cities'), (c) => { const r = c.use('room'); c.cam.fov = 34; dolly(c, V(-14 + 2.4, 1.6, 2.8), V(-14 + 1.8, 1.3, 2.2), V(-14, 0.6, -0.5), V(-14, 0.55, -0.4)); r.update(c.t, { room: 'bed', clock: '4:16', power: 0 }); grade(c, 'night'); dof(c, 3, 0.5); });
  S(T('these are the final minutes'), (c) => { c.cam.fov = 34; c.look(V(30, 28 + c.u * 4, 60), V(-6, 10, 6)); city(c, { ...SLEEP, focus: [-6, 6, 50] }); grade(c, 'night'); });
  const tBroken = T('the continental spring has broken free'); const tFree = T('broken free');
  cue(tFree, 'snap', { gain: 0.9 });
  S(tBroken, (c) => { const b = c.use('block'); c.cam.fov = 26; const st = c.t - tFree - 0.15; c.look(V(3, 3.2, 12), V(0, 1.7, 0)); b.update(c.t, { S: 15, heat: 1, spring: st < 0 ? { stretch: 1 } : { snapT: st, stretch: 0.4 }, shake: st < 0 ? 0.3 : 0.6 }); if (st >= 0 && st < 0.2) { c.post.flash = 0.7 * (1 - st / 0.2); } c.shake(st > 0 ? 1.2 : 0.4); grade(c, 'blood'); dof(c, 12, 0.7); });
  // ---------------- THE EARTHQUAKE 04:17 ----------------
  const tCard = T('the earthquake 4 17'); const t17 = T('17'); const gap = gapTime('rupture');
  cue(tCard, 'card', { big: true });
  S(tCard, (c) => { const g = c.only2D(); timeCard(g, c.lt, c.dur, { big: 'THE EARTHQUAKE', small: 'MONDAY, FEBRUARY 6, 2023' }); c.post.grain = 0.06; });
  cue(t17 + 0.25, 'tick', { gain: 0.7 });
  S(t17, (c) => { const m = c.use('macro'); c.cam.fov = 26; c.look(V(0, 1.5, 6.2 - c.u * 0.8), V(0, 1.35, 0)); m.update(c.t, { prop: 'clock', text: c.lt > 0.25 ? '4:17' : '4:16', solid: true, key: 30, bokeh: true }); grade(c, 'night', { saturation: 1.2 }); dof(c, 6, 0.7); if (c.lt > 0.9) c.shake((c.lt - 0.9) * 0.6); });
  // the inserted 4-second silence: the epic rupture
  const G0 = gap.t0;
  cue(G0, 'rupture', { gain: 1.0 });
  S(G0, (c) => { const b = c.use('block'); c.cam.fov = 30; c.look(V(-1.5, -11.2, 6.5 - c.lt * 2), V(0, -12, 0)); b.update(c.t, { S: 15, hideSouth: true, locked: 0, stress: 1, glow: 2, crack: 1, melt: 1, sparks: c.lt, hypo: 1.5 }); c.shake(1.8, 14); grade(c, 'hell'); c.post.flash = Math.max(0, 1 - c.lt / 0.35); c.post.zoomBlur = 0.2 * Math.exp(-c.lt * 3); });
  S(G0 + 0.85, (c) => { const b = c.use('block'); c.cam.fov = 40; const st = c.lt; c.look(V(-30 - st * 2, 16 - st, 46 - st * 3), V(0, -5, 0));
    b.update(c.t, { S: 15, snap: Math.min(1, st * 2.2) + Math.sin(st * 25) * 0.08 * Math.exp(-st * 2), waveT: st * 0.9, pAmp: 1.2, sAmp: 1.4, heat: 1 - smooth(st / 1.5) * 0.6, trace: 1, hypo: 1.2, dust: st, sparks: st, glow: 1, collapseHouses: smooth((st - 0.6) / 0.8), shake: 1 });
    c.shake(1.6, 11); grade(c, 'blood'); });
  S(G0 + 2.35, (c) => { c.cam.fov = 40; const e = mp(EPI1[0], EPI1[1], 0); c.look(V(e.x - 10 - c.lt * 4, 24 + c.lt * 6, e.z + 30 + c.lt * 6), V(e.x + 2, 0, e.z - 2));
    mapSet(c, { rupture: { t: c.lt * 1.2, scale: 1.6 }, faults: { EAF: 1, EAF_i: 0.4 }, area: smooth(c.lt / 1.5) * 0.4, focus: [e.x, e.z, 50] }); c.shake(0.6); grade(c, 'map', { temperature: 0.2 });
    const g = c.use2D(); INFO.tag(g, c.lt - 0.4, 1600, 160, 'MAGNITUDE 7.8', { size: 46, bg: 'rgba(170,20,10,0.8)' }); });
  // after the silence: the narration resumes
  const tRock = T('the rock breaks'); const tCrack = T('deafening crack');
  cue(tCrack, 'crack', { gain: 0.9 });
  S(tRock, (c) => { const b = c.use('block'); c.cam.fov = 34; c.look(V(-8 + c.lt * 1.5, 3, 7), V(0, 0, 0)); const st = c.t - tCrack;
    b.update(c.t, { S: 15, snap: st < 0 ? 0.5 : Math.min(1, 0.5 + st * 1.5) + Math.sin(st * 20) * 0.1 * Math.exp(-st * 2), trace: 1, glow: 0.6, dust: st > 0 ? st : undefined, sparks: st > 0 ? st : undefined, waveT: 1.5 + c.lt * 0.5, sAmp: 0.6, shake: 0.8 });
    c.shake(st > 0 && st < 0.6 ? 2 : 0.8, 12); grade(c, 'blood'); dof(c, 9, 0.5); });
  S(T('the underground seam gives way'), (c) => { const b = c.use('block'); c.cam.fov = 34; c.look(V(-12 + c.u * 24, -9, 14), V(-6 + c.u * 24, -12, 0)); b.update(c.t, { S: 15, hideSouth: true, locked: 0, stress: 1, glow: 1.5, crack: 1, melt: 1, sparks: c.lt % 1.2 }); c.shake(1.0); grade(c, 'hell'); c.post.whip = 0.03; c.post.whipDir = [1, 0]; });
  const tRace = T('the rupture races'); const tTwo = TP('nearly two miles per second');
  cue(tRace, 'tear', { dur: 7, gain: 0.7 });
  S(tRace, (c) => { c.cam.fov = 40; const e = mp(EPI1[0], EPI1[1], 0); c.look(V(e.x + 30 - c.u * 20, 30 + c.u * 10, e.z + 40), V(e.x + 6, 0, e.z - 4));
    mapSet(c, { rupture: { t: 2 + c.lt * 1.0, scale: 1.6 }, faults: { EAF: 1, EAF_i: 0.3 }, area: 0.35, markers: { Kahramanmaras: 1, Gaziantep: 1, Antakya: 1, Malatya: 1, Adiyaman: 1 }, focus: [e.x + 5, e.z, 60] }); c.shake(0.4); grade(c, 'map');
    const g = c.use2D(); INFO.infoSpeed(g, c.t - tTwo, c.dur); });
  S(T('tearing along the fault'), (c) => { c.cam.fov = 44; orbit(c, mp(37.4, 37.3, 0), 70, 30, 1.9, 2.15);
    mapSet(c, { rupture: { t: 6 + c.lt, scale: 1.6, ringSpeed: 1.6 }, faults: { EAF: 1, EAF_i: 0.3 }, area: 0.5 + c.u * 0.3, focus: [mx(37.4), mz(37.3), 80] }); c.shake(0.3); grade(c, 'map', { temperature: 0.25 });
    const g = c.use2D(); INFO.tag(g, c.lt - 1.0, 960, 950, 'HUNDREDS OF MILES IN AN INSTANT', { size: 38 }); });
  // atomic bombs
  const tEnergy = T('it releases energy'); const tBombs = T('atomic bombs'); const gb = gapTime('bombs');
  cue(tEnergy + 0.1, 'nuke', { gain: 1.0 });
  S(tEnergy, (c) => { const n = c.use('nukes'); c.cam.fov = 38; const tau = c.lt * 0.9; c.look(V(-2600 - c.lt * 60, 60 + c.lt * 10, 2600), V(0, 260 + tau * 70, 0)); n.update(c.t, { tau, heroScale: 1 }); grade(c, 'hell', { temperature: 0.15 }); c.post.flash = Math.max(0, 1 - c.lt / 0.4); c.shake(c.lt > 1.6 && c.lt < 3.5 ? 0.6 : 0.1);
    const g = c.use2D(); if (c.t > tBombs - 1.2) revealText(g, '× THOUSANDS', 960, 920, { family: FONT.title, size: 120, color: '#ffe2b0', p: c.t - tBombs + 1.2, tracking: 20, shadow: { color: 'rgba(0,0,0,0.6)', blur: 30 } }); });
  cue(gb.t0 - 0.3, 'nukeField', { gain: 0.9, dur: 4 });
  S(gb.t0 - 0.3, (c) => { const n = c.use('nukes'); c.cam.fov = 50; const k = ease.inOutCubic(c.u); c.look(V(lerp(-4200, -2000, k), lerp(700, 3200, k), lerp(5200, 9000, k)), V(0, 600, -5000));
    n.update(c.t, { tau: 4 + c.lt, field: true, fieldTau: c.lt * 1.1 + 0.3 }); grade(c, 'hell', { temperature: 0.15 }); c.shake(0.25); });
  // P wave / S wave
  const tFirst = T('the first faster wave');
  cue(tFirst, 'bed', { type: 'quake', dur: 95, gain: 0.8 });
  S(tFirst, (c) => { const b = c.use('block'); c.cam.fov = 40; c.look(V(-36, 8, 40), V(0, -6, 0)); const wt = c.lt * 0.45;
    b.update(c.t, { S: 15, snap: 1, waveT: wt, pAmp: 1.2, sAmp: 0, ringsA: 1, trace: 1, hypo: 0.8 }); c.shake(0.4);
    const g = c.use2D(); INFO.tag(g, c.lt - 0.3, 360, 160, 'P-WAVE', { size: 44, bg: 'rgba(30,90,200,0.75)' }); grade(c, 'neutral'); });
  // city quake timeline
  const tP = T('it strikes from below'); const tS = TP('seconds later the second wave'); const tDev = TP('it brings devastation'); const tBuckle = TP('the ground floor buckles');
  const tTip = TP('entire apartment buildings tip'); const tSink = TP('or sink into the ground'); const tSyr = TP('in syria in cities like'); const tLasts = TP('the shaking lasts');
  const Q0 = tDev - 3; let delays = null;
  const amp = (t) => { let a = 0; if (t > tP) a += 0.55 * Math.exp(-(t - tP) * 1.6) + 0.12; if (t > tS + 0.8) a = Math.max(a, quakeAmp(t, tS + 0.8, { rise: 3, hold: tLasts + 8 - tS, decay: 6, peak: 1 })); return a; };
  const Q = (c) => {
    if (!delays) { const s = c.sets.city; delays = new Map(); const r = [3, 9, 14, 20, 26, 31, 37, 44]; let k = 0;
      for (const b of s.buildings) { if (b.fate === 'intact') continue; delays.set(b, Math.max(b.delay * 0.9, 2) + 6); }
      delays.set(s.hero, tBuckle - Q0 - 0.2);
      const tipB = s.buildings.find((b) => b.fate === 'tip'); if (tipB) delays.set(tipB, tTip - Q0 - 1.0);
      const sinkB = s.buildings.find((b) => b.fate === 'sink'); if (sinkB) delays.set(sinkB, tSink - Q0 - 0.5);
    }
    return { t0: Q0, amp, delays };
  };
  const QN = { ...NIGHT_SNOW, windows: 0.25, traffic: 0, people: 'none' };
  cue(tP, 'thump', { gain: 1.0 });
  S(tP, (c) => { c.cam.fov = 36; c.look(V(16, 1.4, 26), V(-6, 6, 10)); const j = Math.max(0, 1 - (c.t - tP) / 0.5); c.cam.position.y += Math.sin((c.t - tP) * 60) * j * 0.25; city(c, { ...QN, quake: Q(c), focus: [-6, 6, 40] }); c.shake(1.4 * j + 0.2); grade(c, 'night'); c.post.flash = j * 0.25; });
  cue(T('people jolt awake'), 'glass', { gain: 0.4 });
  S(T('people jolt awake'), (c) => { const r = c.use('room'); c.cam.fov = 38; c.look(V(-14 + 1.8, 1.3, 2.4), V(-14, 0.7, -0.3)); const jp = ease.outBack(clamp(c.lt / 0.6)); r.update(c.t, { room: 'bed', clock: '4:17', power: 0, jolt: jp, shake: 0.4, quakeT: c.lt }); c.shake(0.6 + 0.6 * Math.exp(-c.lt * 2)); grade(c, 'night'); });
  S(T('as though a giant sledgehammer'), (c) => { const r = c.use('room'); c.cam.fov = 32; c.look(V(-14 + 1.0, 1.2, 1.4), V(-14 - 0.4, 0.9, -0.6)); r.update(c.t, { room: 'bed', clock: '4:17', power: 0, jolt: 1, shake: 0.5, crack: 0.2 + c.u * 0.3, quakeT: 2 + c.lt }); c.shake(0.7); grade(c, 'night'); });
  cue(T('a deep guttural roar'), 'roar', { dur: 6, gain: 0.8 });
  S(T('a deep guttural roar'), (c) => { c.cam.fov = 30; c.look(V(8, 0.4, 24), V(-30, 8, 18)); city(c, { ...QN, quake: Q(c), alarmCar: true, focus: [-10, 18, 40] }); c.shake(0.5, 7); grade(c, 'night'); dof(c, 18, 0.3); });
  S(tS, (c) => { const b = c.use('block'); c.cam.fov = 40; c.look(V(36, 10, 38), V(0, -6, 0)); const wt = 0.9 + c.lt * 0.35;
    b.update(c.t, { S: 15, snap: 1, waveT: wt, pAmp: 0.3, sAmp: 1.6, ringsA: 1, trace: 1, shake: 0.5, collapseHouses: smooth((c.lt - 1) / 1.5) }); c.shake(0.6);
    const g = c.use2D(); INFO.tag(g, c.lt - 0.3, 1560, 160, 'S-WAVE', { size: 44, bg: 'rgba(210,90,20,0.8)' }); grade(c, 'neutral'); });
  S(tDev, (c) => { orbit(c, V(0, 0, 0), 120, 70, 0.9, 1.05); c.cam.fov = 40; city(c, { ...QN, quake: Q(c), focus: [0, 0, 100] }); c.shake(0.9); grade(c, 'night'); });
  S(T('the ground lurches'), (c) => { c.cam.fov = 40; c.look(V(30, 1.8, 22), V(-10, 4, 22)); c.cam.position.x += Math.sin(c.t * 7) * 0.6; city(c, { ...QN, quake: Q(c), alarmCar: true, focus: [10, 22, 40] }); c.shake(2.0, 6); grade(c, 'night'); });
  S(T('pavement and soil ripple'), (c) => { c.cam.fov = 44; c.look(V(-6 + c.u * 4, 2.2, 52), V(-6, 0, 20)); city(c, { ...QN, quake: Q(c), ripple: 0.55, focus: [-6, 30, 40] }); c.shake(1.0, 6); grade(c, 'night'); });
  S(T('concrete apartment buildings never designed'), (c) => { c.cam.fov = 30; c.look(V(-2, 0.6, 30), V(-18, 30, -10)); city(c, { ...QN, quake: Q(c), focus: [-10, 0, 60] }); c.shake(0.8); grade(c, 'night'); });
  S(T('the motion builds'), (c) => { c.cam.fov = 34; c.look(V(14, 6, 34), V(-6, 14, 6)); city(c, { ...QN, quake: Q(c), focus: [-6, 6, 40] }); c.shake(1.0); grade(c, 'night'); });
  cue(T('where support columns have been removed'), 'glass', { gain: 0.6 });
  S(T('where support columns have been removed'), (c) => { c.cam.fov = 34; c.look(V(-2, 1.4, 19), V(-6.5, 1.6, 12)); city(c, { ...QN, quake: Q(c), colsRemoved: 3, colGhost: 0.8 + 0.2 * Math.sin(c.t * 20), focus: [-6, 10, 30] }); c.shake(1.2, 8); grade(c, 'night', { saturation: 1.1 }); });
  cue(tBuckle, 'collapse', { gain: 1.0 });
  S(tBuckle, (c) => { c.cam.fov = 34; c.look(V(8, 1.8, 26), V(-6.5, 5, 10)); city(c, { ...QN, quake: Q(c), colsRemoved: 3, focus: [-6, 10, 30] }); c.shake(1.4, 8); grade(c, 'night'); });
  S(T('the upper stories come crashing'), (c) => { c.cam.fov = 30; c.look(V(-24, 2, 30), V(-6.5, 12, 6.5)); city(c, { ...QN, quake: Q(c), focus: [-6, 10, 40] }); c.shake(1.2); grade(c, 'night'); });
  S(T('floor after floor'), (c) => { c.cam.fov = 34; c.look(V(-6.5 + 20, 34, 6.5 + 26), V(-6.5, 6, 6.5)); city(c, { ...QN, quake: Q(c), focus: [-6, 6, 40] }); c.shake(0.8); grade(c, 'night'); });
  cue(T('crushing everything'), 'impact', { gain: 0.9 });
  S(T('crushing everything'), (c) => { c.cam.fov = 40; c.look(V(2, 1.7, 22 + c.lt * 0.5), V(-6.5, 2, 8)); city(c, { ...QN, quake: Q(c), focus: [-6, 10, 30] }); c.shake(1.2); grade(c, 'night'); dof(c, 6, 0.5); });
  S(T('inside that grinding mass'), (c) => { c.cam.fov = 30; c.look(V(-3 + c.u, 2.0, 15 - c.u * 2), V(-6.5, 0.8, 6.5)); city(c, { ...QN, quake: Q(c), haze: 0.6, hazeColor: [0.3, 0.29, 0.28], focus: [-6, 8, 30] }); c.shake(0.6); grade(c, 'night', { saturation: 0.6 }); dof(c, 6, 0.8); });
  cue(T('concrete made with cheap sea sand'), 'crumble', { gain: 0.6 });
  S(T('concrete made with cheap sea sand'), (c) => { const m = c.use('macro'); c.cam.fov = 30; dolly(c, V(5, 3.5, 7), V(3.5, 2.6, 5.5), V(0, 1, 0), V(0, 0.8, 0.5)); m.update(c.t, { prop: 'concrete', crumble: smooth(c.lt / 2.2), key: 280, keyColor: 0xcfd8ff }); c.shake(0.15); grade(c, 'cold'); dof(c, 6, 0.6); });
  // liquefaction
  S(T('in some neighborhoods'), (c) => { const s = c.sets.city; const tb = s.buildings.find((b) => b.fate === 'tip') || s.hero; const p = tb.position; orbit(c, p, 80, 50, 0.4, 0.6); c.cam.fov = 38; city(c, { ...QN, quake: Q(c), focus: [p.x, p.z, 70] }); c.shake(0.7); grade(c, 'night'); });
  S(T('the ground turns into slurry'), (c) => { const s = c.sets.city; const tb = s.buildings.find((b) => b.fate === 'tip') || s.hero; const p = tb.position; s.mud.position.set(p.x, 0.2, p.z); s.mud.scale.setScalar(0.3 + smooth(c.lt / 2) * 0.7);
    c.cam.fov = 36; c.look(V(p.x + 18, 3, p.z + 20), V(p.x, 0, p.z + 8)); city(c, { ...QN, quake: Q(c), mud: true, ripple: 0, focus: [p.x, p.z, 40] }); c.shake(0.9); grade(c, 'night'); });
  S(T('violent shaking causes'), (c) => { const s = c.sets.city; const tb = s.buildings.find((b) => b.fate === 'tip') || s.hero; const p = tb.position; s.mud.position.set(p.x, 0.2, p.z); s.mud.scale.setScalar(1);
    c.cam.fov = 30; c.look(V(p.x + 9, 1.2, p.z + 12), V(p.x + 2, 0.2, p.z + 6)); city(c, { ...QN, quake: Q(c), mud: true, focus: [p.x, p.z, 30] }); c.shake(1.0, 7); grade(c, 'night'); dof(c, 9, 0.5); });
  cue(tTip + 2.5, 'thud', { gain: 1.0 });
  S(tTip, (c) => { const s = c.sets.city; const tb = s.buildings.find((b) => b.fate === 'tip') || s.hero; const p = tb.position; s.mud.position.set(p.x, 0.2, p.z);
    c.cam.fov = 40; c.look(V(p.x - 40 * tb.tipDir, 8, p.z + 40), V(p.x + 6 * tb.tipDir, 8, p.z)); city(c, { ...QN, quake: Q(c), mud: true, focus: [p.x, p.z, 50] }); c.shake(0.7); grade(c, 'night'); });
  S(tSink, (c) => { const s = c.sets.city; const sb = s.buildings.find((b) => b.fate === 'sink') || s.hero; const p = sb.position; s.mud.position.set(p.x, 0.2, p.z);
    c.cam.fov = 36; c.look(V(p.x + 22, 4, p.z + 26), V(p.x, 6, p.z)); city(c, { ...QN, quake: Q(c), mud: true, focus: [p.x, p.z, 50] }); c.shake(0.7); grade(c, 'night'); });
  // Syria
  const SQ0 = tSyr - 1.5; const samp = (t) => quakeAmp(t, SQ0, { rise: 1.5, hold: 30, decay: 8, peak: 1 });
  cue(tSyr, 'collapse', { gain: 0.8 });
  S(tSyr, (c) => { c.cam.fov = 40; dolly(c, V(-70, 30, 90), V(-55, 26, 75), V(0, 8, 0), V(0, 8, 0)); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'aleppo', mood: 'stormNight', quake: { t0: SQ0, amp: samp }, haze: true }); c.shake(0.7); grade(c, 'night', { temperature: 0.2 }); });
  cue(T('buildings weakened by years'), 'collapse', { gain: 0.9 });
  S(T('buildings weakened by years'), (c) => { c.cam.fov = 38; c.look(V(30, 6, 40), V(0, 6, -5)); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'aleppo', mood: 'stormNight', quake: { t0: SQ0, amp: samp }, megaDust: c.lt + 0.5 }); c.shake(0.9); grade(c, 'night', { temperature: 0.25, saturation: 0.8 }); });
  S(tLasts, (c) => { const m = c.use('macro'); c.cam.fov = 30; c.look(V(2, 4, 6), V(0, 2.3, 0)); m.update(c.t, { prop: 'seismo', amp: 1.0, key: 250 }); c.shake(0.5);
    const g = c.use2D(); const secs = Math.min(80, Math.floor(18 + c.lt * 22)); INFO.tag(g, c.lt, 1640, 140, `0:${String(Math.floor(secs / 60))}${secs >= 60 ? ':' + String(secs % 60).padStart(2, '0') : String(secs).padStart(2, '0')}`.replace('0:0:', '1:'), { size: 64, family: FONT.mono, weight: '700', bg: 'rgba(170,20,10,0.8)' }); grade(c, 'macro'); });
  cue(T('in those long seconds'), 'music', { mood: 'elegy', dur: 14 });
  S(T('in those long seconds'), (c) => { orbit(c, V(0, 0, 0), 220, 110, 3.9, 4.05); c.cam.fov = 40; city(c, { ...QN, quake: Q(c), haze: smooth(c.lt / 2) * 0.8, hazeColor: [0.35, 0.33, 0.3], focus: [0, 0, 160] }); c.shake(0.5); grade(c, 'night'); });
  const gd = gapTime('dust');
  cue(gd.t0, 'swell', { dur: 3.5, gain: 0.6 });
  S(gd.t0, (c) => { c.cam.fov = 34; c.look(V(-260 + c.lt * 10, 40, 260), V(0, 30, 0)); city(c, { ...QN, quake: Q(c), destroyed: c.lt > 1.3, haze: 1, hazeColor: [0.4, 0.37, 0.33], smoke: true, fires: true, boom: { t0: gd.t0 + 0.6, pos: [140, 0, -120], size: 2 }, focus: [0, 0, 200], fogMul: 1.5, fogColor: [0.18, 0.17, 0.16] }); c.shake(0.25); grade(c, 'night', { saturation: 0.75 }); fadeOut(c, 0.6); });
}
