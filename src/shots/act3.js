// "1 YEAR BEFORE — FEBRUARY 2022": prosperous cities, war-torn Syria, alarmed scientists,
// the seismic gap, construction amnesties and the removed columns.
import * as THREE from 'three';
import { T, TE } from '../timing.js';
import { V, dolly, orbit, path, push, grade, dof, fadeIn, fadeOut } from './dsl.js';
import { GOLD, DAY, city, mapSet, mp, card } from './common.js';
import { ease, clamp, lerp, smooth, noise1, lerpV } from '../engine/util.js';
import { FONT, revealText } from '../overlay/overlay.js';
import * as INFO from '../overlay/info.js';
import { CITIES, mx, mz } from '../assets/regionmap.js';

export function act3(D) {
  const { S, whip, flash, dip, cue } = D;
  card(D, T('one year before the earthquake'), '1 YEAR BEFORE', 'FEBRUARY 2022');
  cue(T('life goes on'), 'music', { mood: 'warm', dur: 30 });
  cue(T('life goes on'), 'bed', { type: 'city', dur: 30, gain: 0.55 });
  // map: southern Turkey & northern Syria, city names pop as they are spoken
  const tLife = T('life goes on'); const tG = T('gaziantep'); const tA = T('antakya'); const tK = T('kahraman marash');
  S(tLife, (c) => { c.cam.fov = 36; dolly(c, V(mx(36.8), 75, mz(36.4) + 55), V(mx(37.0), 38, mz(36.9) + 28), V(mx(36.9), 0, mz(37.0)), V(mx(36.9), 0, mz(37.1)));
    const k = (t0) => smooth((c.t - t0) / 0.4);
    mapSet(c, { borders: 0.7, markers: { Gaziantep: k(tG), Antakya: k(tA), Kahramanmaras: k(tK), Aleppo: k(tLife + 1.2), Idlib: k(tLife + 1.6) }, focus: [mx(37), mz(37), 60] }); grade(c, 'map', { temperature: 0.2 });
    const g = c.use2D();
    for (const [n, t0, side] of [['GAZIANTEP', tG, 1], ['ANTAKYA', tA, -1], ['KAHRAMANMARAŞ', tK, -1]]) { const key = n === 'KAHRAMANMARAŞ' ? 'Kahramanmaras' : n[0] + n.slice(1).toLowerCase(); const ll = CITIES[key]; INFO.callout(g, c.t - t0, c.project(mp(ll[0], ll[1], 0.3)), n, null, { side, len: 150, rise: 70, size: 30 }); }
    const sy = c.project(mp(38.5, 35.6, 0.2)); INFO.tag(g, c.lt - 0.6, sy.x, sy.y, 'SYRIA', { size: 34, bg: 'rgba(0,0,0,0)', tracking: 16 }); const tr = c.project(mp(35.2, 38.4, 0.2)); INFO.tag(g, c.lt - 0.3, tr.x, tr.y, 'TÜRKİYE', { size: 34, bg: 'rgba(0,0,0,0)', tracking: 16 });
  });
  S(T('are bustling'), (c) => { c.cam.fov = 40; c.look(V(30 - c.u * 6, 1.6, 22.5), V(-20, 3, 21)); c.handheld(0.8); city(c, { ...GOLD, traffic: 1.4, focus: [10, 22, 40] }); grade(c, 'golden'); dof(c, 14, 0.3); });
  S(T('this is a prosperous'), (c) => { orbit(c, V(0, 0, 0), 170, 95, -0.7, -0.45); c.cam.fov = 38; city(c, { ...GOLD, focus: [0, 0, 140] }); grade(c, 'golden'); });
  S(T('new neighborhoods'), (c) => { c.cam.fov = 38; dolly(c, V(60, 6, 80), V(66, 10, 72), V(86, 30, 44), V(86, 36, 44)); city(c, { ...GOLD, construction: 0.55 + c.u * 0.3, focus: [86, 44, 60] }); grade(c, 'golden'); });
  S(T('attractive apartment towers'), (c) => { c.cam.fov = 30; dolly(c, V(52, 2, -26), V(52, 6, -26), V(38, 6, -50), V(36, 62, -52)); city(c, { ...GOLD, focus: [40, -48, 50] }); grade(c, 'golden'); c.post.bloomStrength = 0.9; });
  cue(T('advertisements promise'), 'pop', {});
  S(T('advertisements promise'), (c) => { c.cam.fov = 34; push(c, V(24, 10.5, 16), V(-16, -6, 17), 0.35); city(c, { ...GOLD, focus: [20, 16, 40] }); grade(c, 'golden'); dof(c, 18, 0.25); });
  S(T('built to modern earthquake'), (c) => { c.cam.fov = 26; c.look(V(14 + c.u, 9.5, 24), V(26, 10.2, 14)); city(c, { ...GOLD, focus: [20, 16, 40] }); grade(c, 'golden');
    const g = c.use2D(); INFO.tag(g, c.lt - 0.4, 1420, 860, 'EARTHQUAKE STANDARDS?', { size: 34, bg: 'rgba(216,49,47,0.85)' }); });
  S(T('people drink tea'), (c) => { const m = c.use('macro'); c.cam.fov = 28; c.look(V(2.4 - c.u * 0.6, 2.4, 4.8), V(0, 1.4, 0)); m.update(c.t, { prop: 'tea', key: 220, keyColor: 0xffd6a0 }); grade(c, 'golden'); dof(c, 5.2, 1.0); });
  S(T('at sidewalk cafes'), (c) => { c.cam.fov = 34; dolly(c, V(16, 1.7, 20), V(14, 1.6, 19), V(5, 1.0, 12), V(4, 1.0, 12)); city(c, { ...GOLD, focus: [8, 12, 25] }); grade(c, 'golden'); dof(c, 9, 0.6); });
  S(T('shop in crowded bazaars'), (c) => { c.cam.fov = 38; dolly(c, V(30, 3, 14), V(34, 3.4, 12), V(44, 1.2, 0), V(46, 1.2, -2)); city(c, { ...GOLD, focus: [44, 0, 30] }); grade(c, 'golden'); dof(c, 15, 0.4); });
  S(T('and make plans for the future'), (c) => { c.cam.fov = 32; dolly(c, V(5, 1.6, 12.6), V(6.5, 1.8, 12.9), V(24, 9, 16), V(24, 10, 16));
    city(c, { ...GOLD, focus: [16, 15, 30], feat: [{ kind: 'day', i: 3, pos: [12.4, 0.18, 14.2], ry: 1.43, pose: 'stand' }, { kind: 'day', i: 4, pos: [12.6, 0.18, 13.3], ry: 1.43, pose: 'point' }] }); grade(c, 'golden'); dof(c, 8, 0.35); fadeOut(c, 0.3); });
  // ---------------- Syria ----------------
  cue(T('across the border in syria'), 'music', { mood: 'sad', dur: 28 });
  cue(T('across the border in syria'), 'bed', { type: 'wind', dur: 26, gain: 0.5 });
  S(T('across the border in syria'), (c) => { c.cam.fov = 38; dolly(c, V(mx(37), 40, mz(37.4) + 10), V(mx(37), 34, mz(36.4) + 20), V(mx(37), 0, mz(37.0)), V(mx(37), 0, mz(36.1)));
    mapSet(c, { borders: 1, markers: { Aleppo: 1, Idlib: 1 }, focus: [mx(37), mz(36.5), 50] }); grade(c, 'map', { temperature: 0.25, saturation: 0.95 });
    const g = c.use2D(); const p = c.project(mp(37.16, 36.2, 0.3)); INFO.callout(g, c.lt - 0.8, p, 'ALEPPO', null, { side: 1, len: 140, rise: 70, size: 30 }); const q = c.project(mp(36.63, 35.93, 0.3)); INFO.callout(g, c.lt - 1.2, q, 'IDLIB', null, { side: -1, len: 140, rise: 60, size: 30 }); });
  S(T('life looks very different'), (c) => { c.cam.fov = 40; dolly(c, V(-60, 40, 110), V(-40, 34, 90), V(20, 30, -200), V(20, 34, -220)); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'aleppo', mood: 'dusty', shadowR: 120 }); grade(c, 'dust'); });
  S(T('aleppo and idlib provinces'), (c) => { c.cam.fov = 36; c.look(V(-14 + c.u * 6, 1.7, 14), V(10, 4, 4)); c.handheld(0.8); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'aleppo', mood: 'dusty' }); grade(c, 'dust'); dof(c, 12, 0.35); });
  S(T('half of the ancient city'), (c) => { c.cam.fov = 36; orbit(c, V(0, 0, -40), 150, 70, 1.2, 1.5); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'aleppo', mood: 'dusty', shadowR: 140 }); grade(c, 'dust'); });
  cue(T('after repeated bombardment'), 'distantBoom', { gain: 0.35 });
  S(T('after repeated bombardment'), (c) => { c.cam.fov = 30; const b = c.sets.syria.ruinBuildings.find((x) => x.ruined && Math.abs(x.position.x) < 40 && x.position.z > 0) || c.sets.syria.ruinBuildings[0];
    const bp = b.position; const f = b.rotation.y === 0 ? 1 : -1; dolly(c, V(bp.x + 6, 5, bp.z + f * 18), V(bp.x + 3, 6, bp.z + f * 14), V(bp.x, 6, bp.z), V(bp.x, 7, bp.z)); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'aleppo', mood: 'dusty' }); grade(c, 'dust'); });
  S(T('in idlib millions'), (c) => { c.cam.fov = 38; dolly(c, V(300 - 70, 5, -40), V(300 - 62, 6, -48), V(300 - 45, 2, -80), V(300 - 40, 2, -85)); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'camp', mood: 'overcast' }); grade(c, 'grey', { saturation: 0.95 }); });
  S(T('or live in tents'), (c) => { c.cam.fov = 40; orbit(c, V(300, 0, 0), 75, 40, 0.5, 0.75); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'camp', mood: 'overcast', shadowR: 90 }); grade(c, 'grey', { saturation: 0.95 }); });
  S(T('years of fighting'), (c) => { c.cam.fov = 32; const b = c.sets.syria.ruinBuildings.find((x) => x.damageMode === 'damaged') || c.sets.syria.ruinBuildings[1]; const bp = b.position;
    dolly(c, V(bp.x - 14, 3, bp.z + 16), V(bp.x - 10, 4, bp.z + 13), V(bp.x, 4, bp.z), V(bp.x, 5, bp.z)); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'aleppo', mood: 'dusty' }); grade(c, 'dust'); });
  S(T('many are barely standing'), (c) => { c.cam.fov = 28; const b = c.sets.syria.ruinBuildings.find((x) => x.damageMode === 'damaged') || c.sets.syria.ruinBuildings[1]; const bp = b.position;
    c.look(V(bp.x + 9, 0.6, bp.z + 14 - c.u), V(bp.x, 9, bp.z)); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'aleppo', mood: 'dusty' }); grade(c, 'dust'); });
  // ---------------- scientists ----------------
  cue(T('meanwhile seismologists'), 'music', { mood: 'tension', dur: 54 });
  cue(T('meanwhile seismologists'), 'bed', { type: 'lab', dur: 15, gain: 0.5 });
  S(T('meanwhile seismologists'), (c) => { const l = c.use('lab'); c.cam.fov = 38; dolly(c, V(-5, 2.6, 6), V(-3, 2.2, 4.2), V(0, 2.4, -5), V(0, 2.6, -5.5)); l.update(c.t, { area: 'centre', alarm: 0.1 }); grade(c, 'cold'); dof(c, 9, 0.3); });
  S(T('with growing alarm'), (c) => { const l = c.use('lab'); c.cam.fov = 30; c.look(V(0.5, 2.6, -1.0 - c.u * 0.6), V(0, 2.4, -5.9)); l.update(c.t, { area: 'centre', alarm: 0.3 + c.u * 0.5 }); grade(c, 'cold'); dof(c, 4.8, 0.6); });
  cue(T('modern satellites'), 'beep', { gain: 0.3 });
  S(T('modern satellites'), (c) => { const g = c.use('globe'); c.cam.fov = 30; c.look(V(-8 + c.u * 3, 9, 20), V(0, 5, 3)); g.update(c.t, { spin: -127, tilt: 25, camera: c.cam, sat: { lon: 37, lat: 37.5, phase: -0.4 + c.u * 0.8, beam: smooth(c.lt / 0.8) }, marker: [37, 37.5], sunDir: [0.4, 0.6, 0.7] }); grade(c, 'space'); });
  S(T('down to a fraction'), (c) => { const l = c.use('lab'); c.cam.fov = 26; c.look(V(-3.4, 1.35, -0.6), V(-3.4, 1.2, -1.8)); l.update(c.t, { area: 'centre', alarm: 0.5, gpsK: 0.3 }); grade(c, 'cold'); dof(c, 1.2, 1.0); });
  cue(T('and the picture they reveal'), 'alarm', { gain: 0.25 });
  S(T('and the picture they reveal'), (c) => { const l = c.use('lab'); c.cam.fov = 34; dolly(c, V(2, 2.4, 1), V(1, 2.6, -1.5), V(-3.8, 2.4, -5.9), V(-3.8, 2.4, -5.9)); l.update(c.t, { area: 'centre', alarm: 1 }); grade(c, 'cold', { temperature: -0.1 }); dof(c, 5, 0.5); });
  // ---------------- fault map: small quakes + seismic gap ----------------
  S(T('along some stretches'), (c) => { c.cam.fov = 38; dolly(c, V(mx(37) - 20, 34, mz(37.5) + 34), V(mx(37.5) - 10, 26, mz(37.6) + 26), V(mx(37.8), 0, mz(37.9)), V(mx(38), 0, mz(38))); mapSet(c, { faults: { EAF: 1, EAF_i: 1.3 }, pops: smooth(c.lt / 2), focus: [mx(38), mz(38), 50] }); grade(c, 'map'); });
  S(T('small earthquakes happen'), (c) => { c.cam.fov = 36; c.look(V(mx(39.3) - 6 + c.u * 4, 12, mz(38.4) + 14), V(mx(39.6), 0, mz(38.6))); mapSet(c, { faults: { EAF: 1, EAF_i: 1.3 }, pops: 1, focus: [mx(39.5), mz(38.5), 30] }); grade(c, 'map'); dof(c, 16, 0.4); });
  S(T('gradually releasing'), (c) => { c.cam.fov = 36; c.look(V(mx(36.1) + 4 - c.u * 3, 10, mz(35.9) + 12), V(mx(36.2), 0, mz(36.3))); mapSet(c, { faults: { EAF: 1, DSF: 1, EAF_i: 1.2 }, pops: 1, focus: [mx(36.2), mz(36.3), 30] }); grade(c, 'map'); dof(c, 14, 0.4); });
  const tGap = T('but scientists see a stretch'); const tYears = T("that hasn't experienced");
  cue(tGap, 'swell', { dur: 5, gain: 0.5 });
  S(tGap, (c) => { c.cam.fov = 36; dolly(c, V(mx(37.4) - 10, 40, mz(37.4) + 40), V(mx(37.4) - 4, 30, mz(37.4) + 28), V(mx(37.5), 0, mz(37.5)), V(mx(37.5), 0, mz(37.5)));
    mapSet(c, { faults: { EAF: 1, EAF_i: 0.6 }, pops: 0.6, gap: smooth(c.lt / 1.5), focus: [mx(37.5), mz(37.5), 50] }); grade(c, 'map');
    const g = c.use2D(); INFO.infoGapStats(g, c.lt, c.dur, { years: c.t > tYears, yearsP: c.t - tYears }); });
  cue(T('they call it a seismic gap'), 'impact', { gain: 0.4 });
  S(T('they call it a seismic gap'), (c) => { c.cam.fov = 30; c.look(V(mx(37.2) - 3, 9, mz(37.3) + 11), V(mx(37.4), 0.5, mz(37.5))); mapSet(c, { faults: { EAF: 1, EAF_i: 0.5 }, gap: 1, gapAlpha: 0.7 + 0.3 * Math.sin(c.t * 6), focus: [mx(37.4), mz(37.5), 25] }); grade(c, 'map'); dof(c, 13, 0.5);
    const g = c.use2D(); revealText(g, 'SEISMIC GAP', 960, 900, { family: FONT.sans, weight: '900', size: 96, color: '#ffd23c', p: c.lt - 0.3, tracking: 24, shadow: { color: 'rgba(0,0,0,0.6)', blur: 30 } }); });
  const t8 = T('over those 120 years'); const tAct = T('yet the ground');
  S(t8, (c) => { const g = c.only2D(); INFO.infoEightFeet(g, c.lt, c.dur, { tActual: tAct - t8 }); });
  cue(tAct, 'pop', {});
  // ---------------- locked & strained ----------------
  cue(T('deep underground the plates are locked'), 'rumble', { dur: 14, gain: 0.35 });
  S(T('deep underground the plates are locked'), (c) => { const b = c.use('block'); c.cam.fov = 36; dolly(c, V(-10, -3, 30), V(-5, -6, 24), V(0, -10, 0), V(0, -11, 0)); b.update(c.t, { S: 8, hideSouth: true, locked: 0.7, stress: 0.7, glow: 0.25 }); grade(c, 'neutral', { temperature: 0.15 }); });
  S(T('all that movement has been converted'), (c) => { const b = c.use('block'); c.cam.fov = 34; orbit(c, V(0, -3, 0), 60, 30, 0.9, 1.15); b.update(c.t, { S: 10 + c.u * 3, heat: 1, trace: 1 }); grade(c, 'neutral'); });
  cue(T('the spring is stretched to its limit'), 'spring', { dur: 3, gain: 0.55 });
  S(T('the spring is stretched to its limit'), (c) => { const b = c.use('block'); c.cam.fov = 24; c.look(V(-3 + c.u * 2, 2.8, 11), V(0, 1.7, 0)); b.update(c.t, { S: 14, heat: 0.8, spring: { stretch: 0.95 }, shake: 0.1 }); c.handheld(1.4); grade(c, 'blood'); dof(c, 10.5, 1.0); });
  cue(T('the rock is about to break'), 'crackle', { dur: 2.5, gain: 0.5 });
  S(T('the rock is about to break'), (c) => { const b = c.use('block'); c.cam.fov = 32; dolly(c, V(4, -9, 18), V(2, -10.5, 13), V(0, -12, 0), V(0, -12, 0)); b.update(c.t, { S: 14, hideSouth: true, locked: 0.55, stress: 0.9, crack: 0.05 + c.u * 0.12, glow: 0.4 }); c.shake(0.1); grade(c, 'blood'); });
  // ---------------- geologists warn ----------------
  S(T('prominent turkish geologists'), (c) => { const l = c.use('lab'); c.cam.fov = 38; dolly(c, V(60 + 6, 2.6, 8), V(60 + 4, 2.4, 5), V(60 - 1, 3.5, -8), V(60 - 1.5, 3.6, -8.5)); l.update(c.t, { area: 'hall' }); grade(c, 'neutral', { temperature: 0.1 }); dof(c, 13, 0.3); });
  S(T('and on television'), (c) => { const r = c.use('room'); c.cam.fov = 30; c.look(V(-1.3 + c.u * 0.2, 1.05, -1.1), V(-1.3, 1.0, -2.6)); r.update(c.t, { room: 'living', tv: 'news', family: 'sit' }); grade(c, 'warm'); dof(c, 1.5, 0.8); });
  cue(T('they specifically identify'), 'beep', { gain: 0.3 });
  S(T('they specifically identify'), (c) => { c.cam.fov = 34; const K = CITIES.Kahramanmaras; dolly(c, V(mx(K[0]) + 4, 30, mz(K[1]) + 30), V(mx(K[0]) + 1, 12, mz(K[1]) + 12), V(mx(K[0]), 0, mz(K[1])), V(mx(K[0]), 0, mz(K[1])));
    mapSet(c, { faults: { EAF: 1 }, gap: 0.8, gapAlpha: 0.5, markers: { Kahramanmaras: 1 }, focus: [mx(K[0]), mz(K[1]), 30] }); grade(c, 'map');
    const g = c.use2D(); const p = c.project(mp(K[0], K[1], 0.3)); INFO.callout(g, c.lt - 0.6, p, 'KAHRAMANMARAŞ', 'predicted epicentre', { side: 1, len: 220, rise: 120, accent: '#ff3b2a' });
    if (!p.behind) for (let k = 0; k < 3; k++) { const ph = (c.lt * 0.7 + k / 3) % 1; g.strokeStyle = `rgba(255,59,42,${(1 - ph) * 0.9})`; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, 20 + ph * 140, 0, Math.PI * 2); g.stroke(); } });
  cue(T('but their warnings disappear'), 'bed', { type: 'city', dur: 6, gain: 0.8 });
  S(T('but their warnings disappear'), (c) => { c.cam.fov = 44; c.look(V(-2, 2.2, 20.5), V(30, 2, 23)); c.handheld(1); city(c, { ...DAY, traffic: 3.2, focus: [10, 22, 40], feat: [0, 1, 2, 3].map((i) => ({ kind: 'day', i, pos: [2 + i * 3.5, 0.18, 14.6 - (i % 2) * 0.6], ry: i % 2 ? Math.PI / 2 : -Math.PI / 2, pose: 'walk', ph: i, walk: { t0: c.shot.t0, v: 2.2 } })) }); grade(c, 'warm'); c.post.whip = 0.02; });
  // ---------------- amnesty ----------------
  cue(T('meanwhile turkey has a dangerous system'), 'music', { mood: 'tension', dur: 30 });
  S(T('meanwhile turkey has a dangerous system'), (c) => { const m = c.use('macro'); c.cam.fov = 34; dolly(c, V(5, 7, 6), V(3, 6, 5), V(0, 0, 0), V(0.2, 0.2, 0.3)); m.update(c.t, { prop: 'stamp', key: 350 }); grade(c, 'macro'); dof(c, 8, 0.5); });
  S(T('just four years earlier'), (c) => { const g = c.only2D(); INFO.infoAmnesty(g, c.lt, c.dur); });
  const tCon = T('constructed or altered');
  const tStamp1 = T('without proper approval');
  cue(tStamp1 + 0.15, 'stamp', { gain: 0.7 });
  S(tCon, (c) => { const m = c.use('macro'); c.cam.fov = 30; c.look(V(2.5, 4.5, 4.5), V(0.3, 0.3, 0.4)); m.update(c.t, { prop: 'stamp', slam: c.t - tStamp1, key: 380 }); grade(c, 'macro'); dof(c, 5.5, 0.6); if (Math.abs(c.t - tStamp1 - 0.15) < 0.08) c.shake(0.6); });
  S(T('without requiring a meaningful'), (c) => { const g = c.only2D(); INFO.infoNoCheck(g, c.lt, c.dur); });
  const tFee = T('owners could pay a fee'); const tAppr = T('get their paperwork approved');
  cue(tAppr + 0.15, 'stamp', { gain: 0.7 }); cue(tFee + 0.4, 'coins', { gain: 0.4 });
  S(tFee, (c) => { const m = c.use('macro'); c.cam.fov = 30; c.look(V(4 - c.u, 3.5, 5), V(1.2, 0.3, 0.8)); m.update(c.t, { prop: 'stamp', slam: c.t - tAppr, key: 380 }); grade(c, 'macro'); dof(c, 5.5, 0.6); });
  const tCut = T('even after cutting out');
  cue(T('support columns', 0.3), 'drill', { dur: 2.4, gain: 0.35 });
  S(tCut, (c) => { c.cam.fov = 32; dolly(c, V(-2, 1.5, 22), V(-4, 1.6, 19.5), V(-6.5, 1.5, 12), V(-6.5, 1.5, 12)); const rem = clamp((c.lt - 0.8) / 1.8) * 3;
    city(c, { tod: 'golden', windows: 0.3, focus: [-6, 10, 30], colsRemoved: rem, colGhost: 1 }); grade(c, 'warm'); dof(c, 9, 0.4);
    const g = c.use2D(); INFO.tag(g, c.lt - 1.2, 560, 860, 'SUPPORT COLUMNS REMOVED', { size: 34, bg: 'rgba(216,49,47,0.85)' }); });
  S(T('to make room for supermarkets'), (c) => { c.cam.fov = 36; c.look(V(-6.5 + c.u * 2, 2.0, 20), V(-6.5, 2.4, 12)); city(c, { tod: 'golden', windows: 0.6, focus: [-6, 10, 30], colsRemoved: 3 }); grade(c, 'warm'); });
  cue(T('the trap was set'), 'boomLow', { gain: 0.6 });
  S(T('the trap was set'), (c) => { c.cam.fov = 26; push(c, V(-6.5, 12, 6.5), V(16, -10.5, 34), 0.3, ease.inOutCubic); city(c, { tod: 'winterDusk', windows: 0.7, lamps: 1, traffic: 0.2, people: 'none', focus: [-6, 6, 40], colsRemoved: 3 }); grade(c, 'cold', { saturation: 0.8 }); fadeOut(c, 0.4); });
}
