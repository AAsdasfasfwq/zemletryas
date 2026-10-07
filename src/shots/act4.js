// "1 MONTH BEFORE" + "24 HOURS BEFORE": micro-cracks, harsh winter, camps, families, animals, melting barrier.
import * as THREE from 'three';
import { T, TE } from '../timing.js';
import { V, dolly, orbit, path, push, grade, dof, fadeIn, fadeOut } from './dsl.js';
import { WINTER_DUSK, NIGHT_SNOW, NIGHT_RAIN, city, mapSet, mp, card } from './common.js';
import { ease, clamp, lerp, smooth, noise1 } from '../engine/util.js';
import { FONT, revealText } from '../overlay/overlay.js';
import * as INFO from '../overlay/info.js';

function depthOverlay(c, label, from, to, p) {
  const g = c.use2D(); const a = c.project(from), b = c.project(to); if (a.behind || b.behind) return;
  const k = ease.outCubic(p / 0.8); const yb = a.y + (b.y - a.y) * k;
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3; g.setLineDash([12, 10]); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x + (b.x - a.x) * k, yb); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#ff6a3a'; g.beginPath(); g.arc(a.x + (b.x - a.x) * k, yb, 9, 0, Math.PI * 2); g.fill(); g.restore();
  revealText(g, label, a.x + 40, (a.y + yb) / 2, { family: FONT.title, size: 110, color: '#fff', p: p - 0.4, align: 'left', shadow: { color: 'rgba(0,0,0,0.6)', blur: 20 } });
}

export function act4(D) {
  const { S, whip, flash, dip, cue } = D;
  card(D, T('one month before the earthquake'), '1 MONTH BEFORE', 'JANUARY 2023');
  cue(T('nine miles beneath'), 'music', { mood: 'dread', dur: 40 });
  cue(T('nine miles beneath'), 'rumble', { dur: 26, gain: 0.3 });
  S(T('nine miles beneath'), (c) => { const b = c.use('block'); c.cam.fov = 40; path(c, [V(6, 14, 34), V(4, 2, 30), V(2, -10, 26)], [V(0, 0, 10), V(0, -6, 12), V(0, -12, 12)]);
    b.update(c.t, { S: 14, heat: 0.4, hypo: smooth((c.lt - 1) / 1) * 0.6 }); grade(c, 'neutral', { temperature: 0.1 }); depthOverlay(c, '9 MILES', V(0, 0, 16), V(0, -12, 16), c.lt - 0.6); });
  S(T('the rock can no longer'), (c) => { const b = c.use('block'); c.cam.fov = 34; dolly(c, V(-8, -6, 26), V(-4, -9, 20), V(0, -11, 0), V(0, -12, 0)); b.update(c.t, { S: 14, hideSouth: true, locked: lerp(0.55, 0.42, c.u), stress: 0.9, glow: 0.3, crack: 0.15 }); c.shake(0.05); grade(c, 'blood'); });
  S(T('invisible ominous changes'), (c) => { const b = c.use('block'); c.cam.fov = 30; c.look(V(2 - c.u * 4, -11, 14 - c.u * 3), V(0, -12, 0)); b.update(c.t, { S: 14, hideSouth: true, locked: 0.42, stress: 0.9, glow: 0.3, crack: 0.15 + c.u * 0.15 }); grade(c, 'blood'); dof(c, 12, 0.5); });
  // ruler
  S(T('imagine bending a wooden ruler'), (c) => { const m = c.use('macro'); c.cam.fov = 30; dolly(c, V(0, 4, 13), V(0, 3, 10.5), V(0, 1.4, 0), V(0, 1.5, 0)); m.update(c.t, { prop: 'ruler', bend: ease.inOutCubic(c.u) * 0.9 }); grade(c, 'macro'); dof(c, 10.5, 0.5); });
  cue(T('you hear a faint crackling'), 'crackle', { dur: 2.2, gain: 0.55 });
  S(T('you hear a faint crackling'), (c) => { const m = c.use('macro'); c.cam.fov = 22; c.look(V(0.8, 2.6, 4.2), V(0, 2.2, 0)); m.update(c.t, { prop: 'ruler', bend: 0.92 + Math.sin(c.t * 40) * 0.004, crackGlow: 0.25 + 0.25 * Math.max(0, Math.sin(c.t * 23)) }); c.handheld(1.2); grade(c, 'macro'); dof(c, 4.4, 1.2); });
  S(T('the same thing is happening underground'), (c) => { const b = c.use('block'); c.cam.fov = 32; dolly(c, V(0, -9, 20), V(0, -11, 15), V(0, -12, 0), V(0, -12, 0)); b.update(c.t, { S: 14, hideSouth: true, locked: 0.4, stress: 0.95, glow: 0.35, crack: 0.3 + c.u * 0.1 }); grade(c, 'blood'); });
  const tUnder = T('under enormous pressure billions');
  cue(T('billions of microscopic cracks'), 'crackle', { dur: 6, gain: 0.45 });
  S(tUnder, (c) => { const b = c.use('block'); c.cam.fov = 30; dolly(c, V(-3, -10.5, 14), V(-1, -11.6, 6), V(0, -12, 0), V(0, -12, 0)); b.update(c.t, { S: 14, hideSouth: true, locked: 0.38, stress: 1, glow: 0.4, crack: 0.4 + c.u * 0.45 }); grade(c, 'blood'); dof(c, 8, 0.5); });
  S(T('it is coming apart'), (c) => { const b = c.use('block'); c.cam.fov = 24; c.look(V(0.5 - c.u, -11.8, 4.5 - c.u * 1.5), V(0, -12, 0)); b.update(c.t, { S: 14, hideSouth: true, locked: 0.36, stress: 1, glow: 0.45, crack: 0.85 + c.u * 0.15 }); c.handheld(1); grade(c, 'blood'); dof(c, 3.5, 1.0); });
  cue(T('ultra sensitive instruments'), 'seismo', { dur: 3.5, gain: 0.4 });
  S(T('ultra sensitive instruments'), (c) => { const m = c.use('macro'); c.cam.fov = 30; dolly(c, V(4, 4.5, 7), V(2.5, 3.6, 5.5), V(0, 2.3, 0), V(0, 2.3, 0.5)); m.update(c.t, { prop: 'seismo', amp: 0.08 + 0.12 * smooth(c.u * 1.5) }); grade(c, 'macro'); dof(c, 6, 0.6); });
  S(T('but scientists still cannot predict'), (c) => { const l = c.use('lab'); c.cam.fov = 36; c.look(V(3 - c.u, 1.9, 3), V(-1, 2.0, -3)); l.update(c.t, { area: 'centre', alarm: 0.2 }); grade(c, 'cold'); dof(c, 4.5, 0.4); });
  // winter
  cue(T('above ground a harsh winter'), 'music', { mood: 'cold', dur: 26 });
  cue(T('above ground a harsh winter'), 'bed', { type: 'blizzard', dur: 18, gain: 0.6 });
  S(T('above ground a harsh winter'), (c) => { orbit(c, V(0, 0, 0), 160, 80, 2.6, 2.85); c.cam.fov = 40; city(c, { ...WINTER_DUSK, focus: [0, 0, 140] }); grade(c, 'cold'); });
  S(T('a cold weather system'), (c) => { c.cam.fov = 40; c.look(V(-20 + c.u * 4, 1.7, -19.5), V(20, 2.5, -21)); c.handheld(1.2); city(c, { ...WINTER_DUSK, snow: 1.4, focus: [0, -20, 40], feat: [0, 1].map((i) => ({ kind: 'day', i: i + 4, pos: [-8 + i * 4, 0.18, -15 + i * 0.6], ry: Math.PI / 2, pose: 'walk', walk: { t0: c.shot.t0, v: 1.6 } })) }); grade(c, 'cold'); dof(c, 9, 0.35); });
  cue(T('in syrian displacement camps'), 'fire', { dur: 7, gain: 0.45 });
  S(T('in syrian displacement camps'), (c) => { c.cam.fov = 36; dolly(c, V(300 - 26, 4, 30), V(300 - 20, 3.5, 22), V(300 - 3, 1.5, 6), V(300, 1.4, 6)); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'camp', mood: 'winterDusk', snow: 1, fires: true }); grade(c, 'cold', { saturation: 1.0 }); });
  S(T('trying to keep their children warm'), (c) => { c.cam.fov = 30; c.look(V(300 - 10 + 2.2 + c.u * 0.4, 1.0, 4 + 2.6), V(300 - 10, 1.0, 4)); const s = c.use('syria'); s.update(c.t, { camera: c.cam, area: 'camp', mood: 'winterDusk', snow: 0.8, fires: true }); grade(c, 'warm', { saturation: 1.05 }); dof(c, 3, 0.8); });
  S(T('in turkish cities residents shut'), (c) => { const r = c.use('room'); c.cam.fov = 34; dolly(c, V(0.2, 1.5, 0.5), V(0.9, 1.5, -1.0), V(1.75, 1.5, -3), V(1.75, 1.5, -3)); r.update(c.t, { room: 'living', tv: 'weather', family: 'sit' }); grade(c, 'warm'); dof(c, 2.2, 0.5); });
  S(T('and turn up their heaters'), (c) => { const r = c.use('room'); c.cam.fov = 28; c.look(V(2.6, 0.7, -1.2), V(3.0, 0.5, -2.4)); r.update(c.t, { room: 'living', tv: 'weather', family: 'tea' }); grade(c, 'warm'); dof(c, 1.2, 1.0); });
  S(T('the cold keeps millions indoors'), (c) => { orbit(c, V(0, 0, 0), 120, 55, 0.4, 0.6); c.cam.fov = 40; city(c, { ...NIGHT_SNOW, focus: [0, 0, 120] }); grade(c, 'night'); });
  S(T('each evening in those same'), (c) => { c.cam.fov = 30; push(c, V(-6.5, 14, 6.5), V(10, -6, 36), 0.25); city(c, { ...NIGHT_SNOW, focus: [-6, 6, 40], colsRemoved: 3 }); grade(c, 'night'); });
  // 24 hours before
  card(D, T('24 hours before the earthquake'), '24 HOURS BEFORE', 'SUNDAY, FEBRUARY 5, 2023');
  cue(T('the weather is miserable'), 'bed', { type: 'rain', dur: 9, gain: 0.6 });
  S(T('the weather is miserable'), (c) => { c.cam.fov = 38; c.look(V(-14 + c.u * 3, 6, 34), V(10, 3, 20)); city(c, { ...NIGHT_RAIN, focus: [0, 20, 50] }); grade(c, 'night'); });
  S(T('freezing rain mixes'), (c) => { c.cam.fov = 28; c.look(V(20, 1.2, 31), V(15.5, 4.5, 18)); city(c, { ...NIGHT_RAIN, snow: 0.7, focus: [16, 20, 30] }); grade(c, 'night'); dof(c, 13, 0.4); });
  S(T('streets empty earlier'), (c) => { c.cam.fov = 40; dolly(c, V(-60, 2.2, 22), V(-50, 2.4, 22), V(60, 3, 22), V(60, 3, 22)); city(c, { ...NIGHT_RAIN, traffic: 0, focus: [-20, 22, 60] }); grade(c, 'night'); });
  S(T('people head home'), (c) => { c.cam.fov = 36; c.look(V(-14, 1.8, 19), V(0, 1.6, 14.5)); city(c, { ...NIGHT_RAIN, traffic: 0.3, focus: [-8, 14, 30], feat: [{ kind: 'day', i: 5, pos: [-12 + 0, 0.18, 14.3], ry: Math.PI / 2, pose: 'walk', walk: { t0: c.shot.t0, v: 1.3 } }, { kind: 'day', i: 2, pos: [-13.2, 0.18, 13.6], ry: Math.PI / 2, pose: 'walk', walk: { t0: c.shot.t0, v: 1.3 } }] }); grade(c, 'night'); dof(c, 11, 0.4); });
  cue(T('eat dinner'), 'bed', { type: 'home', dur: 7, gain: 0.5 });
  S(T('eat dinner'), (c) => { const r = c.use('room'); c.cam.fov = 38; dolly(c, V(-0.4, 1.7, 1.8), V(-0.2, 1.6, 1.5), V(1.7, 0.8, 0.3), V(1.7, 0.8, 0.3)); r.update(c.t, { room: 'living', tv: 'news', family: 'tea' }); grade(c, 'warm'); dof(c, 2.4, 0.5); });
  S(T('watch television'), (c) => { const r = c.use('room'); c.cam.fov = 40; c.look(V(-1.3, 1.3, 3.2 - c.u * 0.3), V(-1.3, 1.0, -2.6)); r.update(c.t, { room: 'living', tv: 'weather', family: 'sit' }); grade(c, 'warm'); });
  S(T('and put their children to bed'), (c) => { const r = c.use('room'); c.cam.fov = 40; dolly(c, V(14 + 1.6, 1.6, 2.0), V(14 + 1.3, 1.5, 1.6), V(14 - 0.8, 0.6, 0.0), V(14 - 0.8, 0.6, 0.0)); r.update(c.t, { room: 'kids', parentPose: 'stand' }); grade(c, 'warm'); dof(c, 2.3, 0.5); });
  S(T('a new work week'), (c) => { c.cam.fov = 34; c.look(V(36, 18, 48), V(-6, 12, 6)); const k = 0.9 - c.u * 0.6; city(c, { ...NIGHT_SNOW, windows: k, focus: [-6, 6, 50] }); grade(c, 'night'); });
  cue(T('there are no sirens'), 'silence', {});
  S(T('there are no sirens'), (c) => { c.cam.fov = 30; c.look(V(-2.5 + c.u * 0.5, 2, 24), V(8.5, 8.4, 15.1)); city(c, { ...NIGHT_SNOW, windows: 0.3, focus: [6, 22, 30] }); grade(c, 'night', { saturation: 0.8 }); dof(c, 14, 0.4); });
  S(T('science cannot predict'), (c) => { const l = c.use('lab'); c.cam.fov = 38; c.look(V(4, 2.2, 4), V(-1, 1.6, -3)); l.update(c.t, { area: 'centre', alarm: 0 }); l.desks.forEach((p) => (p.visible = false)); grade(c, 'cold'); });
  S(T('but nature offers clues'), (c) => { orbit(c, V(-44, 0, 44), 70, 26, 1.0, 1.25); c.cam.fov = 40; city(c, { ...NIGHT_SNOW, windows: 0.25, focus: [-44, 44, 60] }); c.sets.room && null; grade(c, 'night'); });
  // animals
  S(T('later survivors will describe'), (c) => { const r = c.use('room'); c.cam.fov = 34; c.look(V(-3 + c.u * 0.5, 0.6, 3), V(-1, 0.5, 1)); r.update(c.t, { room: 'living', tv: 'off', power: 0.4, family: 'sit', cat: 'run', catT: -1 }); r.family.forEach((p) => (p.visible = false)); grade(c, 'night', { temperature: 0.1 }); });
  cue(T('cats raced through'), 'catRun', { gain: 0.4 });
  S(T('cats raced through'), (c) => { const r = c.use('room'); c.cam.fov = 40; c.look(V(-2 + c.u * 3, 0.35, 2.4), V(0.5 + c.u * 2, 0.2, 0.9)); r.update(c.t, { room: 'living', tv: 'off', power: 0.4, cat: 'run', catT: c.lt * 1.1 }); r.family.forEach((p) => (p.visible = false)); c.handheld(1.5, 1.5); grade(c, 'night', { temperature: 0.1 }); c.post.whip = 0.015; });
  S(T('refused to be held'), (c) => { const r = c.use('room'); c.cam.fov = 34; c.look(V(24 + 0.8, 0.35, 1.2), V(24 - 0.5, 0.2, -0.55)); r.update(c.t, { room: 'bath', catIn: smooth(c.lt / 2), power: 0.7 }); grade(c, 'cold', { saturation: 1 }); dof(c, 1.9, 1.0); });
  cue(T('stray dogs gathered'), 'dogHowl', { gain: 0.45 });
  S(T('stray dogs gathered'), (c) => { c.cam.fov = 32; c.look(V(-44 + 2 + 7, 1.2, 44 + 2), V(-44 + 6.5, 0.8, 44 - 5)); city(c, { ...NIGHT_SNOW, windows: 0.2, dogs: true, focus: [-38, 40, 30] }); grade(c, 'night'); dof(c, 8, 0.5); });
  S(T('howling into the darkness'), (c) => { c.cam.fov = 26; c.look(V(-44 + 4, 0.5, 44 - 2.5), V(-44 + 5.5, 1.1, 44 - 5)); city(c, { ...NIGHT_SNOW, windows: 0.2, dogs: true, focus: [-38, 40, 30] }); grade(c, 'night'); dof(c, 3, 1.0); });
  const tDespite = T('despite the freezing rain');
  const tBirds = T('birds took flight');
  cue(tBirds, 'birds', { gain: 0.5 });
  S(tDespite, (c) => { c.cam.fov = 38; c.look(V(-30, 2, 30), V(-44, 9, 44)); city(c, { ...NIGHT_RAIN, windows: 0.2, birds: { t0: tBirds, center: [-44, 4, 44] }, focus: [-44, 44, 40] }); grade(c, 'night'); });
  S(T('and wheeled erratically'), (c) => { c.cam.fov = 44; c.look(V(-36, 4, 36), V(-44, 20, 44)); city(c, { ...NIGHT_RAIN, windows: 0.2, birds: { t0: tBirds, center: [-44, 4, 44] }, focus: [-44, 44, 40] }); grade(c, 'night'); });
  S(T('most likely the animals'), (c) => { const b = c.use('block'); c.cam.fov = 34; orbit(c, V(0, -2, 0), 50, 18, 0.5, 0.7); b.update(c.t, { S: 14, waveT: ((c.lt * 0.25) % 0.8) + 0.05, pAmp: 0.08, sAmp: 0, ringsA: 0.6, hypo: 0.5, heat: 0.3 }); grade(c, 'neutral'); });
  S(T('the tiny fractures spreading'), (c) => { const b = c.use('block'); c.cam.fov = 28; c.look(V(1, -11.5, 7 - c.u * 2), V(0, -12, 0)); b.update(c.t, { S: 14, hideSouth: true, locked: 0.3, stress: 1, glow: 0.5, crack: 1 }); grade(c, 'blood'); dof(c, 6, 0.6); });
  S(T('beyond the range of human hearing'), (c) => { const b = c.use('block'); c.cam.fov = 40; c.look(V(-14, 6, 30), V(0, -6, 0)); b.update(c.t, { S: 14, waveT: ((c.lt * 0.3) % 0.8) + 0.05, pAmp: 0.05, ringsA: 0.5, hypo: 0.6, heat: 0.5 });
    const g = c.use2D(); INFO.tag(g, c.lt - 0.5, 960, 940, 'HIGH-FREQUENCY VIBRATIONS', { size: 34 }); grade(c, 'neutral'); });
  // last barrier
  cue(T('deep beneath them the barrier'), 'music', { mood: 'dread', dur: 30 });
  S(T('deep beneath them the barrier'), (c) => { const b = c.use('block'); c.cam.fov = 34; dolly(c, V(12, -7, 26), V(6, -9, 20), V(0, -12, 0), V(0, -12, 0)); b.update(c.t, { S: 14, hideSouth: true, locked: lerp(0.3, 0.12, c.u), stress: 1, glow: 0.5, crack: 1 }); grade(c, 'blood'); });
  cue(T('is down to one final'), 'heartbeat', { dur: 8, gain: 0.45 });
  S(T('is down to one final'), (c) => { const b = c.use('block'); c.cam.fov = 22; c.look(V(0.6, -11.6, 6 - c.u * 1.2), V(0, -12, 0)); b.update(c.t, { S: 14, hideSouth: true, locked: lerp(0.1, 0.06, c.u), stress: 1, glow: 0.6, crack: 1 }); c.handheld(0.8); grade(c, 'blood'); dof(c, 5, 0.8); });
  const tStrain = T('the strain is so intense');
  cue(T('friction begins to melt'), 'sizzle', { dur: 5, gain: 0.45 });
  S(tStrain, (c) => { const b = c.use('block'); c.cam.fov = 26; dolly(c, V(-3, -11, 9), V(-1.5, -11.6, 6), V(0, -12, 0), V(0, -12, 0)); b.update(c.t, { S: 14, hideSouth: true, locked: 0.06, stress: 1, glow: 0.6 + c.u * 0.5, crack: 1, melt: smooth((c.lt - 1.5) / 2.5) * 0.7 }); c.shake(0.08); grade(c, 'hell'); });
}
