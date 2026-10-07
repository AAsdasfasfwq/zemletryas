// Procedural sound design with the Web Audio API.
// Every cue is synthesized (no samples). The same code drives:
//   - live preview (AudioContext, scheduled slightly ahead of the playhead)
//   - offline export (OfflineAudioContext over the whole film, sliced into WAV chunks for Puppeteer)
import { mulberry32 } from '../engine/util.js';
import { DURATION } from '../timing.js';

const MASTER = 0.85;
const BUS = { sfx: 0.55, bed: 0.32, music: 0.26 };

function makeNoise(sr, seconds, kind, seed = 7) {
  const len = Math.floor(sr * seconds); const b = new AudioBuffer({ numberOfChannels: 2, length: len, sampleRate: sr });
  for (let ch = 0; ch < 2; ch++) {
    const r = mulberry32(seed + ch * 101); const d = b.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = r() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else if (kind === 'pink') { b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
      else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    }
  }
  return b;
}
function makeImpulse(sr, seconds = 3.2, decay = 2.6, seed = 3) {
  const len = Math.floor(sr * seconds); const b = new AudioBuffer({ numberOfChannels: 2, length: len, sampleRate: sr });
  for (let ch = 0; ch < 2; ch++) { const r = mulberry32(seed + ch); const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- context wrapper ----------
class Rig {
  constructor(ctx, dest) {
    this.ctx = ctx; const sr = ctx.sampleRate;
    this.master = ctx.createGain(); this.master.gain.value = MASTER;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.25;
    this.master.connect(comp); comp.connect(dest);
    this.verb = ctx.createConvolver(); this.verb.buffer = Rig.cache(sr, 'ir', () => makeImpulse(sr)); const vg = ctx.createGain(); vg.gain.value = 0.35; this.verb.connect(vg); vg.connect(this.master);
    this.bus = {};
    for (const k of Object.keys(BUS)) { const g = ctx.createGain(); g.gain.value = BUS[k]; g.connect(this.master); this.bus[k] = g; }
    this.musicSend = ctx.createGain(); this.musicSend.gain.value = 0.9; this.musicSend.connect(this.verb); this.bus.music.connect(this.musicSend);
    this.sfxSend = ctx.createGain(); this.sfxSend.gain.value = 0.25; this.sfxSend.connect(this.verb); this.bus.sfx.connect(this.sfxSend);
    this.noise = { white: Rig.cache(sr, 'white', () => makeNoise(sr, 6, 'white', 11)), pink: Rig.cache(sr, 'pink', () => makeNoise(sr, 8, 'pink', 12)), brown: Rig.cache(sr, 'brown', () => makeNoise(sr, 8, 'brown', 13)) };
  }
  static cache(sr, k, fn) { Rig._c = Rig._c || {}; const key = sr + k; if (!Rig._c[key]) Rig._c[key] = fn(); return Rig._c[key]; }
  // looping noise source starting at `when`, phase-shifted by off
  src(kind, when, dur, off = 0, rate = 1) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noise[kind]; s.loop = true; s.playbackRate.value = rate;
    s.start(Math.max(when, 0), (off * rate) % s.buffer.duration); s.stop(Math.max(when, 0) + dur + 0.1); return s;
  }
  osc(type, freq, when, dur) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.start(Math.max(when, 0)); o.stop(Math.max(when, 0) + dur + 0.1); return o; }
  filt(type, f, q = 0.7) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  gain(v = 0) { const g = this.ctx.createGain(); g.gain.value = v; return g; }
  pan(v) { const p = this.ctx.createStereoPanner(); p.pan.value = v; return p; }
}
// envelope helper with offset support (skips the part already elapsed)
function env(param, when, off, pts) {
  // pts: [[t, v], ...] relative times from sound start, linear ramps
  const vAt = (t) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + (v1 - v0) * (t - t0) / (t1 - t0 || 1); } return pts[pts.length - 1][1]; };
  const w = Math.max(when, 0);
  param.setValueAtTime(vAt(off), w);
  for (const [t, v] of pts) if (t > off) param.linearRampToValueAtTime(v, w + (t - off));
}
function expDecay(param, when, peak, decay, attack = 0.005) { const w = Math.max(when, 0); param.setValueAtTime(0.0001, w); param.linearRampToValueAtTime(peak, w + attack); param.exponentialRampToValueAtTime(0.0001, w + attack + decay); }

// ---------- sound library: f(R, when, p, off) ----------
const L = {};
L.whoosh = (R, w, p) => { const s = R.src('white', w, 0.6, w * 3.1); const f = R.filt('bandpass', 400, 1.2); f.frequency.setValueAtTime(300, w); f.frequency.exponentialRampToValueAtTime(3500, w + 0.4); const g = R.gain(); env(g.gain, w, 0, [[0, 0], [0.25, 0.5 * (p.gain || 1)], [0.5, 0]]); const pn = R.pan(p.pan || 0); s.connect(f).connect(g).connect(pn).connect(R.bus.sfx); };
L.boomCore = (R, w, { gain = 1, f0 = 70, f1 = 32, decay = 2.2, noise = 0.6, lp = 500 } = {}) => {
  const o = R.osc('sine', f0, w, decay + 0.5); o.frequency.setValueAtTime(f0, w); o.frequency.exponentialRampToValueAtTime(f1, w + decay * 0.7);
  const g = R.gain(); expDecay(g.gain, w, 0.9 * gain, decay); o.connect(g).connect(R.bus.sfx);
  const n = R.src('brown', w, decay + 0.5, w * 1.7); const f = R.filt('lowpass', lp); f.frequency.setValueAtTime(lp * 2, w); f.frequency.exponentialRampToValueAtTime(lp * 0.3, w + decay); const gn = R.gain(); expDecay(gn.gain, w, noise * gain, decay * 1.2, 0.01); n.connect(f).connect(gn).connect(R.bus.sfx);
};
L.card = (R, w, p) => { // riser into a deep cinematic hit
  const big = p.big ? 1.3 : 1;
  const s = R.src('pink', w - 0.9, 1.0, w); const f = R.filt('bandpass', 500, 0.8); f.frequency.setValueAtTime(200, w - 0.9); f.frequency.exponentialRampToValueAtTime(4000, w); const g = R.gain(); env(g.gain, w - 0.9, 0, [[0, 0], [0.88, 0.22], [0.9, 0]]); s.connect(f).connect(g).connect(R.bus.sfx);
  L.boomCore(R, w, { gain: 0.9 * big, f0: 85, f1: 30, decay: 3.2 * big, noise: 0.35, lp: 400 });
  const o = R.osc('triangle', 55, w, 4); const og = R.gain(); expDecay(og.gain, w, 0.12, 4); o.connect(og).connect(R.bus.music);
};
L.pop = (R, w, p) => { const o = R.osc('sine', 880, w, 0.15); o.frequency.exponentialRampToValueAtTime(440, w + 0.08); const g = R.gain(); expDecay(g.gain, w, 0.25 * (p.gain || 1), 0.12); o.connect(g).connect(R.bus.sfx); };
L.beep = (R, w, p) => { for (const d of [0, 0.16]) { const o = R.osc('sine', 1320, w + d, 0.12); const g = R.gain(); env(g.gain, w + d, 0, [[0, 0], [0.01, 0.12 * (p.gain || 1) * 2], [0.09, 0.1], [0.11, 0]]); o.connect(g).connect(R.bus.sfx); } };
L.thud = (R, w, p) => L.boomCore(R, w, { gain: 0.5 * (p.gain || 1), f0: 90, f1: 45, decay: 0.6, noise: 0.4, lp: 600 });
L.impact = (R, w, p) => L.boomCore(R, w, { gain: 0.9 * (p.gain || 1), f0: 75, f1: 30, decay: 2.0, noise: 0.8, lp: 700 });
L.boom = (R, w, p) => L.boomCore(R, w, { gain: 1.0 * (p.gain || 1), f0: 70, f1: 28, decay: 3.0, noise: 1.0, lp: 600 });
L.boomLow = (R, w, p) => L.boomCore(R, w, { gain: 0.8 * (p.gain || 1), f0: 55, f1: 28, decay: 4.0, noise: 0.25, lp: 250 });
L.distantBoom = (R, w, p) => { for (const [d, k] of [[0, 1], [1.4, 0.5], [3.1, 0.7]]) L.boomCore(R, w + d, { gain: 0.35 * k * (p.gain || 1), f0: 60, f1: 30, decay: 2.5, noise: 0.6, lp: 220 }); };
L.thump = (R, w, p) => { L.boomCore(R, w, { gain: 1.2 * (p.gain || 1), f0: 65, f1: 25, decay: 1.6, noise: 1.0, lp: 900 }); L.rattle(R, w, { dur: 1.6, gain: 0.5 }); };
L.rattle = (R, w, p) => { const r = mulberry32(Math.floor(w * 100)); const n = Math.floor((p.dur || 1) * 28); for (let i = 0; i < n; i++) { const t = w + r() * (p.dur || 1); const s = R.src('white', t, 0.05, t * 7); const f = R.filt('bandpass', 1500 + r() * 3000, 3); const g = R.gain(); expDecay(g.gain, t, 0.06 * (p.gain || 1), 0.04); s.connect(f).connect(g).connect(R.bus.sfx); } };
L.crack = (R, w, p) => { const k = p.gain || 1; const s = R.src('white', w, 0.15, w * 5); const f = R.filt('highpass', 1200); const g = R.gain(); expDecay(g.gain, w, 0.9 * k, 0.08, 0.001); s.connect(f).connect(g).connect(R.bus.sfx);
  const s2 = R.src('white', w + 0.01, 0.4, w * 3); const f2 = R.filt('bandpass', 380, 1.5); const g2 = R.gain(); expDecay(g2.gain, w + 0.01, 0.8 * k, 0.3, 0.002); s2.connect(f2).connect(g2).connect(R.bus.sfx);
  L.boomCore(R, w + 0.02, { gain: 0.7 * k, f0: 80, f1: 35, decay: 1.8, noise: 0.6, lp: 500 }); };
L.crackle = (R, w, p, off) => { const dur = p.dur || 2; const r = mulberry32(Math.floor(w * 77)); const n = Math.floor(dur * 45); for (let i = 0; i < n; i++) { const t = w + Math.pow(r(), 0.7) * dur; if (t < w + off) continue; const s = R.src('white', t, 0.03, t * 9); const f = R.filt('highpass', 2000 + r() * 4000); const g = R.gain(); expDecay(g.gain, t, (0.05 + r() * 0.12) * (p.gain || 1), 0.012 + r() * 0.02, 0.0005); const pn = R.pan(r() * 1.4 - 0.7); s.connect(f).connect(g).connect(pn).connect(R.bus.sfx); } };
L.rumble = (R, w, p, off) => { const dur = p.dur || 6; const s = R.src('brown', w, dur - off, w + off); const f = R.filt('lowpass', 110); const g = R.gain(); env(g.gain, w, off, [[0, 0], [Math.min(2, dur / 3), 0.9 * (p.gain || 1)], [dur - 1.5, 0.8 * (p.gain || 1)], [dur, 0]]); s.connect(f).connect(g).connect(R.bus.bed); };
L.swell = (R, w, p, off) => { const dur = p.dur || 4; for (const [m, d] of [[45, 0], [52, 7], [57, -5]]) { const o = R.osc('sawtooth', mtof(m), w, dur); o.detune.value = d; const f = R.filt('lowpass', 300); f.frequency.setValueAtTime(200, Math.max(w, 0)); f.frequency.linearRampToValueAtTime(1600, w + dur); const g = R.gain(); env(g.gain, w, off, [[0, 0], [dur * 0.8, 0.08 * (p.gain || 1)], [dur, 0]]); o.connect(f).connect(g).connect(R.bus.music); } };
L.riser = (R, w, p, off) => { const dur = p.dur || 3; const s = R.src('white', w, dur, w); const f = R.filt('bandpass', 300, 2); f.frequency.setValueAtTime(200, Math.max(w, 0)); f.frequency.exponentialRampToValueAtTime(6000, w + dur); const g = R.gain(); env(g.gain, w, off, [[0, 0], [dur * 0.95, 0.3 * (p.gain || 1)], [dur, 0]]); s.connect(f).connect(g).connect(R.bus.sfx);
  const o = R.osc('sine', 80, w, dur); o.frequency.exponentialRampToValueAtTime(320, w + dur); const og = R.gain(); env(og.gain, w, off, [[0, 0], [dur, 0.15 * (p.gain || 1)], [dur + 0.05, 0]]); o.connect(og).connect(R.bus.sfx); };
L.grind = (R, w, p, off) => { const dur = p.dur || 2; const s = R.src('brown', w, dur, w); const f = R.filt('bandpass', 260, 1.2); const am = R.osc('square', 17, w, dur); const amg = R.gain(0.4); am.connect(amg); const g = R.gain(0.4 * (p.gain || 1)); amg.connect(g.gain); s.connect(f).connect(g).connect(R.bus.sfx); L.rumble(R, w, { dur, gain: 0.5 * (p.gain || 1) }, off); };
L.squeeze = (R, w, p) => { const dur = p.dur || 2; const o = R.osc('sawtooth', 70, w, dur); const r = mulberry32(5); for (let i = 0; i < 30; i++) o.frequency.setValueAtTime(60 + r() * 30, w + i * dur / 30); const f = R.filt('bandpass', 700, 4); const g = R.gain(); env(g.gain, w, 0, [[0, 0], [0.3, 0.09 * (p.gain || 1)], [dur - 0.2, 0.12 * (p.gain || 1)], [dur, 0]]); o.connect(f).connect(g).connect(R.bus.sfx); };
L.zip = (R, w, p) => { const s = R.src('white', w, 0.5, w); const f = R.filt('bandpass', 800, 3); f.frequency.setValueAtTime(800, w); f.frequency.exponentialRampToValueAtTime(7000, w + 0.25); const g = R.gain(); env(g.gain, w, 0, [[0, 0], [0.05, 0.5 * (p.gain || 1)], [0.3, 0]]); s.connect(f).connect(g).connect(R.bus.sfx); L.pop(R, w, { gain: 0.5 }); };
L.clunk = (R, w, p) => { const o = R.osc('sine', 140, w, 0.5); o.frequency.exponentialRampToValueAtTime(70, w + 0.3); const g = R.gain(); expDecay(g.gain, w, 0.7 * (p.gain || 1), 0.35); o.connect(g).connect(R.bus.sfx); L.rattle(R, w, { dur: 0.4, gain: 0.8 }); };
L.creak = (R, w, p, off) => { const dur = p.dur || 3; const o = R.osc('sawtooth', 85, w, dur); const lfo = R.osc('sine', 0.7, w, dur); const lg = R.gain(18); lfo.connect(lg).connect(o.frequency); const f = R.filt('bandpass', 520, 6); const g = R.gain(); env(g.gain, w, off, [[0, 0], [0.8, 0.07 * (p.gain || 1)], [dur - 0.5, 0.06 * (p.gain || 1)], [dur, 0]]); o.connect(f).connect(g).connect(R.bus.sfx); L.rumble(R, w, { dur, gain: 0.35 }, off); };
L.spring = (R, w, p, off) => { const dur = p.dur || 3; const o = R.osc('sine', 1650, w, dur); o.frequency.linearRampToValueAtTime(2300, w + dur); const tr = R.osc('sine', 9, w, dur); const tg = R.gain(0.5); tr.connect(tg); const g = R.gain(); env(g.gain, w, off, [[0, 0], [dur * 0.5, 0.03 * (p.gain || 1)], [dur, 0.05 * (p.gain || 1)], [dur + 0.05, 0]]); tg.connect(g.gain); o.connect(g).connect(R.bus.sfx);
  const h = R.osc('sawtooth', 55, w, dur); h.frequency.linearRampToValueAtTime(75, w + dur); const hf = R.filt('lowpass', 300); const hg = R.gain(); env(hg.gain, w, off, [[0, 0], [dur, 0.12 * (p.gain || 1)], [dur + 0.05, 0]]); h.connect(hf).connect(hg).connect(R.bus.sfx); };
L.snap = (R, w, p) => { const k = p.gain || 1; for (const [f, d, a] of [[310, 1.6, 0.4], [743, 0.9, 0.25], [1290, 0.6, 0.18], [2210, 0.4, 0.12]]) { const o = R.osc('sine', f, w, d); o.frequency.exponentialRampToValueAtTime(f * 0.92, w + d); const g = R.gain(); expDecay(g.gain, w, a * k, d); o.connect(g).connect(R.bus.sfx); } L.crack(R, w, { gain: 0.8 * k }); };
L.wind = (R, w, p, off) => { const dur = p.dur || 6; const s = R.src('pink', w, dur - off, w + off); const f = R.filt('bandpass', 500, 0.8); const lfo = R.osc('sine', 0.13, w, dur); const lg = R.gain(300); lfo.connect(lg).connect(f.frequency); const g = R.gain(); env(g.gain, w, off, [[0, 0], [1.5, 0.5 * (p.gain || 1)], [dur - 1.5, 0.5 * (p.gain || 1)], [dur, 0]]); s.connect(f).connect(g).connect(R.bus.bed); };
L.lava = (R, w, p, off) => { const dur = p.dur || 6; L.rumble(R, w, { dur, gain: 0.6 * (p.gain || 1) }, off); const r = mulberry32(31); for (let i = 0; i < dur * 6; i++) { const t = w + r() * dur; if (t < w + off) continue; const o = R.osc('sine', 70 + r() * 120, t, 0.15); o.frequency.exponentialRampToValueAtTime(200 + r() * 200, t + 0.1); const g = R.gain(); expDecay(g.gain, t, 0.08 * (p.gain || 1), 0.1); o.connect(g).connect(R.bus.sfx); } };
L.stamp = (R, w, p) => { L.boomCore(R, w, { gain: 0.5 * (p.gain || 1), f0: 120, f1: 60, decay: 0.35, noise: 0.5, lp: 1500 }); const s = R.src('white', w, 0.1, w); const f = R.filt('bandpass', 2500, 1); const g = R.gain(); expDecay(g.gain, w, 0.3, 0.06); s.connect(f).connect(g).connect(R.bus.sfx); };
L.coins = (R, w, p) => { const r = mulberry32(9); for (let i = 0; i < 7; i++) { const t = w + i * 0.07 + r() * 0.04; for (const m of [1, 2.76, 5.4]) { const o = R.osc('sine', (2200 + r() * 800) * m / 2, t, 0.5); const g = R.gain(); expDecay(g.gain, t, 0.05 * (p.gain || 1) / m, 0.4); o.connect(g).connect(R.bus.sfx); } } };
L.drill = (R, w, p, off) => { const dur = p.dur || 2; const s = R.src('white', w, dur, w); const f = R.filt('bandpass', 1800, 1.5); const am = R.osc('square', 21, w, dur); const ag = R.gain(0.5); am.connect(ag); const g = R.gain(); env(g.gain, w, off, [[0, 0], [0.1, 0.18 * (p.gain || 1)], [dur - 0.1, 0.18 * (p.gain || 1)], [dur, 0]]); ag.connect(g.gain); s.connect(f).connect(g).connect(R.bus.sfx); };
L.tick = (R, w, p) => { const s = R.src('white', w, 0.05, w); const f = R.filt('bandpass', 3500, 4); const g = R.gain(); expDecay(g.gain, w, 0.5 * (p.gain || 1), 0.03, 0.0005); s.connect(f).connect(g).connect(R.bus.sfx); const o = R.osc('sine', 1800, w, 0.1); const og = R.gain(); expDecay(og.gain, w, 0.08, 0.05); o.connect(og).connect(R.bus.sfx); };
L.heartbeat = (R, w, p, off) => { const dur = p.dur || 6; const bpm = 64; for (let t = 0; t < dur; t += 60 / bpm) { if (t < off) continue; const k = (p.gain || 1) * (0.6 + 0.4 * t / dur); L.boomCore(R, w + t, { gain: 0.45 * k, f0: 62, f1: 40, decay: 0.25, noise: 0.05, lp: 200 }); L.boomCore(R, w + t + 0.24, { gain: 0.32 * k, f0: 55, f1: 38, decay: 0.3, noise: 0.05, lp: 200 }); } };
L.catRun = (R, w, p) => { const r = mulberry32(4); for (let i = 0; i < 18; i++) { const t = w + i * 0.07 + r() * 0.02; const s = R.src('white', t, 0.03, t); const f = R.filt('bandpass', 900, 2); const g = R.gain(); expDecay(g.gain, t, 0.08 * (p.gain || 1), 0.02); s.connect(f).connect(g).connect(R.bus.sfx); } };
L.dogHowl = (R, w, p) => { const r = mulberry32(17); for (let k = 0; k < 3; k++) { const t = w + k * 1.1 + r() * 0.4; const d = 2.4 + r(); const base = 420 + r() * 140; const o = R.osc('sawtooth', base, t, d); o.frequency.setValueAtTime(base * 0.8, t); o.frequency.linearRampToValueAtTime(base * 1.35, t + d * 0.35); o.frequency.linearRampToValueAtTime(base * 1.05, t + d);
  const vib = R.osc('sine', 5.5, t, d); const vg = R.gain(8); vib.connect(vg).connect(o.frequency); const f1 = R.filt('bandpass', 900, 5); const f2 = R.filt('lowpass', 1800); const g = R.gain(); env(g.gain, t, 0, [[0, 0], [0.4, 0.05 * (p.gain || 1)], [d - 0.6, 0.06 * (p.gain || 1)], [d, 0]]); const pn = R.pan(r() * 1.6 - 0.8); o.connect(f1).connect(f2).connect(g).connect(pn).connect(R.bus.sfx); R.sfxSend && g.connect(R.verb); } };
L.birds = (R, w, p) => { const r = mulberry32(23); for (let i = 0; i < 26; i++) { const t = w + r() * 2.2; const s = R.src('white', t, 0.06, t); const f = R.filt('bandpass', 700 + r() * 500, 1.5); const g = R.gain(); expDecay(g.gain, t, 0.12 * (p.gain || 1), 0.05); s.connect(f).connect(g).connect(R.pan(r() * 2 - 1)).connect(R.bus.sfx); }
  for (let i = 0; i < 10; i++) { const t = w + 0.3 + r() * 3; const o = R.osc('sine', 2500 + r() * 1500, t, 0.12); o.frequency.exponentialRampToValueAtTime(3800 + r() * 1200, t + 0.08); const g = R.gain(); expDecay(g.gain, t, 0.03 * (p.gain || 1), 0.09); o.connect(g).connect(R.pan(r() * 2 - 1)).connect(R.bus.sfx); } };
L.sizzle = (R, w, p, off) => { const dur = p.dur || 3; const s = R.src('white', w, dur - off, w + off); const f = R.filt('highpass', 3000); const g = R.gain(); env(g.gain, w, off, [[0, 0], [1, 0.08 * (p.gain || 1)], [dur, 0.12 * (p.gain || 1)], [dur + 0.2, 0]]); s.connect(f).connect(g).connect(R.bus.sfx); L.crackle(R, w, { dur, gain: 0.5 * (p.gain || 1) }, off); };
L.groan = (R, w, p, off) => { const dur = p.dur || 3; const o = R.osc('sawtooth', 48, w, dur); o.frequency.linearRampToValueAtTime(36, w + dur); const f = R.filt('lowpass', 260, 3); const g = R.gain(); env(g.gain, w, off, [[0, 0], [1, 0.2 * (p.gain || 1)], [dur, 0.25 * (p.gain || 1)], [dur + 0.2, 0]]); o.connect(f).connect(g).connect(R.bus.sfx); L.rumble(R, w, { dur, gain: 0.6 }, off); };
L.rupture = (R, w, p) => { // the 4-second silence: suck-in, then the planet cracks
  const s = R.src('pink', w - 0.6, 0.65, w); const f = R.filt('lowpass', 3000); f.frequency.setValueAtTime(6000, w - 0.6); f.frequency.exponentialRampToValueAtTime(200, w); const g = R.gain(); env(g.gain, w - 0.6, 0, [[0, 0.0], [0.55, 0.25], [0.6, 0]]); s.connect(f).connect(g).connect(R.bus.sfx);
  L.crack(R, w + 0.02, { gain: 1.3 }); L.boomCore(R, w + 0.02, { gain: 1.5, f0: 60, f1: 22, decay: 5, noise: 1.2, lp: 400 });
  L.rumble(R, w + 0.3, { dur: 9, gain: 1.4 }); L.crackle(R, w + 0.2, { dur: 3.5, gain: 1.2 }); L.rattle(R, w + 0.4, { dur: 3, gain: 1.0 });
  L.boomCore(R, w + 0.9, { gain: 1.0, f0: 70, f1: 30, decay: 3, noise: 0.9, lp: 700 }); L.boomCore(R, w + 2.4, { gain: 0.9, f0: 55, f1: 25, decay: 4, noise: 0.9, lp: 500 }); };
L.tear = (R, w, p, off) => { const dur = p.dur || 6; const s = R.src('white', w, dur - off, w + off); const f = R.filt('bandpass', 300, 1.5); f.frequency.setValueAtTime(250, Math.max(w, 0)); f.frequency.linearRampToValueAtTime(900, w + dur); const g = R.gain(); env(g.gain, w, off, [[0, 0], [0.3, 0.35 * (p.gain || 1)], [dur - 1, 0.25 * (p.gain || 1)], [dur, 0]]); s.connect(f).connect(g).connect(R.bus.sfx); L.rumble(R, w, { dur, gain: 1.0 * (p.gain || 1) }, off); L.crackle(R, w, { dur, gain: 0.7 }, off); };
L.nuke = (R, w, p) => { const k = p.gain || 1; L.boomCore(R, w, { gain: 0.7 * k, f0: 120, f1: 50, decay: 0.8, noise: 0.6, lp: 3000 }); L.boomCore(R, w + 0.9, { gain: 1.6 * k, f0: 50, f1: 18, decay: 6, noise: 1.5, lp: 350 }); L.rumble(R, w + 0.9, { dur: 8, gain: 1.2 * k }); L.wind(R, w + 1.1, { dur: 5, gain: 0.8 * k }); };
L.nukeField = (R, w, p) => { const r = mulberry32(44); for (let i = 0; i < 14; i++) { const t = w + r() * (p.dur || 4); L.boomCore(R, t, { gain: (0.25 + r() * 0.35) * (p.gain || 1), f0: 55, f1: 25, decay: 3, noise: 0.8, lp: 260 + r() * 200 }); } L.rumble(R, w, { dur: (p.dur || 4) + 3, gain: 1.0 }); };
L.glass = (R, w, p) => { const r = mulberry32(Math.floor(w * 13)); for (let i = 0; i < 40; i++) { const t = w + Math.pow(r(), 2) * 1.2; const o = R.osc('sine', 3000 + r() * 6000, t, 0.25); const g = R.gain(); expDecay(g.gain, t, (0.02 + r() * 0.04) * (p.gain || 1), 0.1 + r() * 0.15); o.connect(g).connect(R.pan(r() * 2 - 1)).connect(R.bus.sfx); } const s = R.src('white', w, 0.5, w); const f = R.filt('highpass', 4000); const g = R.gain(); expDecay(g.gain, w, 0.25 * (p.gain || 1), 0.35); s.connect(f).connect(g).connect(R.bus.sfx); };
L.roar = (R, w, p, off) => { const dur = p.dur || 5; L.rumble(R, w, { dur, gain: 1.4 * (p.gain || 1) }, off); const s = R.src('brown', w, dur, w * 2 + off); const f = R.filt('bandpass', 180, 0.8); f.frequency.setValueAtTime(120, Math.max(w, 0)); f.frequency.linearRampToValueAtTime(320, w + dur); const g = R.gain(); env(g.gain, w, off, [[0, 0], [dur * 0.7, 0.9 * (p.gain || 1)], [dur, 0.5]]); s.connect(f).connect(g).connect(R.bus.sfx); };
L.collapse = (R, w, p) => { const k = p.gain || 1; const r = mulberry32(Math.floor(w * 3)); let t = w; for (let i = 0; i < 9; i++) { L.boomCore(R, t, { gain: (0.5 + 0.4 * (i / 9)) * k, f0: 80 - i * 3, f1: 30, decay: 1.2, noise: 1.0, lp: 600 + r() * 500 }); t += 0.38 * Math.pow(0.86, i); }
  L.crumble(R, w + 0.2, { gain: 1.2 * k, dur: 3.5 }); L.rattle(R, w, { dur: 2.5, gain: 0.8 * k }); L.wind(R, w + 1.5, { dur: 4, gain: 0.6 * k }); L.glass(R, w + 0.3, { gain: 0.5 * k }); };
L.crumble = (R, w, p) => { const dur = p.dur || 2; const r = mulberry32(Math.floor(w * 5)); for (let i = 0; i < dur * 60; i++) { const t = w + r() * dur; const s = R.src('brown', t, 0.08, t * 3); const f = R.filt('bandpass', 300 + r() * 1200, 2); const g = R.gain(); expDecay(g.gain, t, (0.1 + r() * 0.2) * (p.gain || 1), 0.05 + r() * 0.08); s.connect(f).connect(g).connect(R.bus.sfx); } };
L.zap = (R, w, p) => { const r = mulberry32(8); for (let i = 0; i < 5; i++) { const t = w + i * 0.3 + r() * 0.2; const o = R.osc('sawtooth', 100 + r() * 30, t, 0.25); const f = R.filt('highpass', 800); const g = R.gain(); env(g.gain, t, 0, [[0, 0], [0.01, 0.2 * (p.gain || 1)], [0.2, 0.1], [0.25, 0]]); o.connect(f).connect(g).connect(R.bus.sfx); L.crackle(R, t, { dur: 0.25, gain: 1.5 }, 0); } };
L.explosion = (R, w, p) => { L.crack(R, w, { gain: 0.9 * (p.gain || 1) }); L.boomCore(R, w, { gain: 1.2 * (p.gain || 1), f0: 70, f1: 25, decay: 3.5, noise: 1.3, lp: 600 }); L.zap(R, w + 0.1, { gain: 0.6 }); };
L.carAlarm = (R, w, p, off) => { const dur = p.dur || 5; const o = R.osc('square', 760, w, dur); for (let t = 0; t < dur; t += 0.5) if (t >= off) o.frequency.setValueAtTime(Math.floor(t * 2) % 2 ? 940 : 760, w + t - off); const f = R.filt('lowpass', 2500); const g = R.gain(); env(g.gain, w, off, [[0, 0], [0.05, 0.035 * (p.gain || 1)], [dur - 0.2, 0.035 * (p.gain || 1)], [dur, 0]]); o.connect(f).connect(g).connect(R.pan(0.4)).connect(R.bus.sfx); };
L.hiss = (R, w, p, off) => { const dur = p.dur || 3; const s = R.src('white', w, dur - off, w + off); const f = R.filt('highpass', 3500); const g = R.gain(); env(g.gain, w, off, [[0, 0], [0.2, 0.18 * (p.gain || 1)], [dur - 0.3, 0.18 * (p.gain || 1)], [dur, 0]]); s.connect(f).connect(g).connect(R.bus.sfx); };
L.cries = (R, w, p, off) => { const dur = p.dur || 5; const s = R.src('pink', w, dur - off, w + off); const f = R.filt('bandpass', 700, 6); const lfo = R.osc('sine', 0.7, w, dur); const lg = R.gain(220); lfo.connect(lg).connect(f.frequency); const g = R.gain(); env(g.gain, w, off, [[0, 0], [1, 0.08 * (p.gain || 1)], [dur - 1, 0.08 * (p.gain || 1)], [dur, 0]]); s.connect(f).connect(g).connect(R.bus.bed); };
L.dig = (R, w, p) => L.crumble(R, w, { dur: p.dur || 3, gain: 0.5 * (p.gain || 1) });
L.quake2 = (R, w, p) => { L.thump(R, w, { gain: 0.9 }); L.roar(R, w + 0.3, { dur: p.dur || 6, gain: 0.9 }, 0); L.rattle(R, w + 0.5, { dur: 4, gain: 0.8 }); };
L.rupture2 = (R, w, p) => L.tear(R, w, { dur: 3, gain: 0.7 * (p.gain || 1) }, 0);
L.applause = (R, w, p) => { const r = mulberry32(12); const dur = p.dur || 4; for (let i = 0; i < dur * 40; i++) { const t = w + r() * dur; const s = R.src('white', t, 0.03, t * 11); const f = R.filt('bandpass', 1200 + r() * 1500, 1.2); const g = R.gain(); expDecay(g.gain, t, 0.04 * (p.gain || 1) * Math.min(1, (t - w) * 2) * Math.min(1, (w + dur - t)), 0.02); s.connect(f).connect(g).connect(R.pan(r() * 2 - 1)).connect(R.bus.sfx); } };
L.excavator = (R, w, p, off) => { const dur = p.dur || 6; const o = R.osc('sawtooth', 38, w, dur); const f = R.filt('lowpass', 220); const g = R.gain(); env(g.gain, w, off, [[0, 0], [0.8, 0.22 * (p.gain || 1)], [dur - 0.8, 0.22 * (p.gain || 1)], [dur, 0]]); o.connect(f).connect(g).connect(R.bus.sfx); const wh = R.osc('sine', 600, w, dur); const wg = R.gain(); env(wg.gain, w, off, [[0, 0], [2, 0.02], [4, 0.04], [dur, 0]]); wh.connect(wg).connect(R.bus.sfx); L.crumble(R, w + 1, { dur: dur - 2, gain: 0.4 }); };
L.truck = (R, w, p, off) => L.excavator(R, w, { dur: p.dur || 5, gain: 0.6 * (p.gain || 1) }, off);
L.seismo = (R, w, p, off) => { const dur = p.dur || 3; const s = R.src('white', w, dur - off, w + off); const f = R.filt('bandpass', 4000, 3); const g = R.gain(); env(g.gain, w, off, [[0, 0], [0.2, 0.05 * (p.gain || 1)], [dur, 0.05 * (p.gain || 1)], [dur + 0.1, 0]]); s.connect(f).connect(g).connect(R.bus.sfx); for (let t = 0; t < dur; t += 0.5) if (t >= off) L.tick(R, w + t - off, { gain: 0.25 }); };
L.fire = (R, w, p, off) => { const dur = p.dur || 5; L.rumble(R, w, { dur, gain: 0.3 }, off); L.crackle(R, w, { dur, gain: 0.8 * (p.gain || 1) }, off); };
L.alarm = (R, w, p) => { for (let i = 0; i < 4; i++) { const o = R.osc('triangle', i % 2 ? 660 : 880, w + i * 0.35, 0.3); const g = R.gain(); env(g.gain, w + i * 0.35, 0, [[0, 0], [0.02, 0.07 * (p.gain || 1)], [0.28, 0.05], [0.3, 0]]); o.connect(g).connect(R.bus.sfx); } };
L.cough = () => {};
L.silence = () => {};

// ---------- ambient beds ----------
L.bed = (R, w, p, off) => {
  const dur = p.dur || 10; const k = p.gain || 0.5; const type = p.type || 'wind';
  const fade = [[0, 0], [1.2, k], [dur - 1.2, k], [dur, 0]];
  const noiseLayer = (kind, ftype, freq, q, level, lfoHz = 0, lfoAmt = 0, pan = 0) => { const s = R.src(kind, w, dur - off, w * 1.3 + off + level); const f = R.filt(ftype, freq, q); if (lfoHz) { const l = R.osc('sine', lfoHz, w, dur); const lg = R.gain(lfoAmt); l.connect(lg).connect(f.frequency); } const g = R.gain(); env(g.gain, w, off, fade.map(([t, v]) => [t, v * level])); s.connect(f).connect(g).connect(R.pan(pan)).connect(R.bus.bed); };
  const r = mulberry32(Math.floor(w * 7) + 1);
  if (type === 'city') { noiseLayer('brown', 'lowpass', 380, 0.7, 0.9); noiseLayer('pink', 'bandpass', 1200, 0.6, 0.12, 0.05, 400);
    for (let t = 0; t < dur; t += 1.5 + r() * 2.5) { if (t < off) continue; L.whoosh(R, w + t - off, { gain: 0.25 * k, pan: r() * 2 - 1 }); }
    for (let t = 2; t < dur; t += 4 + r() * 6) { if (t < off) continue; const o = R.osc('square', 420 + r() * 80, w + t - off, 0.35); const f = R.filt('lowpass', 1200); const g = R.gain(); env(g.gain, w + t - off, 0, [[0, 0], [0.02, 0.015 * k], [0.3, 0.015 * k], [0.35, 0]]); o.connect(f).connect(g).connect(R.pan(r() * 2 - 1)).connect(R.bus.bed); } }
  else if (type === 'wind') { noiseLayer('pink', 'bandpass', 450, 0.8, 0.9, 0.11, 250); noiseLayer('pink', 'bandpass', 1400, 1.5, 0.25, 0.07, 500, 0.5); }
  else if (type === 'blizzard') { noiseLayer('pink', 'bandpass', 700, 0.6, 1.2, 0.2, 400, -0.3); noiseLayer('white', 'highpass', 4000, 0.7, 0.18, 0.15, 1500, 0.4); noiseLayer('brown', 'lowpass', 200, 0.7, 0.6); }
  else if (type === 'rain') { noiseLayer('pink', 'highpass', 1500, 0.7, 0.7); noiseLayer('white', 'bandpass', 6000, 0.6, 0.15); noiseLayer('brown', 'lowpass', 300, 0.7, 0.4); }
  else if (type === 'lab') { noiseLayer('brown', 'lowpass', 160, 0.7, 0.5); const o = R.osc('sine', 120, w, dur); const g = R.gain(); env(g.gain, w, off, fade.map(([t, v]) => [t, v * 0.04])); o.connect(g).connect(R.bus.bed); for (let t = 1; t < dur; t += 2.5 + r() * 3) { if (t < off) continue; L.beep(R, w + t - off, { gain: 0.25 }); } }
  else if (type === 'home') { noiseLayer('brown', 'lowpass', 250, 0.7, 0.5); for (let t = 0; t < dur; t += 1) { if (t < off) continue; L.tick(R, w + t - off, { gain: 0.08 }); } for (let t = 0.5; t < dur; t += 1.5 + r() * 2) { if (t < off) continue; L.coins(R, w + t - off, { gain: 0.15 }); } }
  else if (type === 'night') { noiseLayer('pink', 'bandpass', 380, 0.8, 0.6, 0.06, 150); for (let t = 6; t < dur; t += 9 + r() * 6) { if (t < off) continue; L.dogHowl(R, w + t - off, { gain: 0.25 }); } }
  else if (type === 'quake') { noiseLayer('brown', 'lowpass', 120, 0.7, 1.4); noiseLayer('brown', 'bandpass', 260, 1.0, 0.6, 0.3, 80);
    for (let t = 3; t < dur - 10; t += 1.2 + r() * 2.2) { if (t < off) continue; const kind = r(); if (kind < 0.4) L.crumble(R, w + t - off, { dur: 1.2, gain: 0.5 }); else if (kind < 0.6) L.glass(R, w + t - off, { gain: 0.35 }); else L.boomCore(R, w + t - off, { gain: 0.35, f0: 70, f1: 30, decay: 1.5, noise: 0.8, lp: 500 }); } }
  else if (type === 'aftermath') { noiseLayer('pink', 'bandpass', 420, 0.8, 0.8, 0.09, 200); noiseLayer('brown', 'lowpass', 140, 0.7, 0.4); for (let t = 4; t < dur; t += 7 + r() * 9) { if (t < off) continue; L.carAlarm(R, w + t - off, { dur: 3, gain: 0.25 }, 0); } }
  else if (type === 'helicopter') { const s = R.src('brown', w, dur - off, w + off); const f = R.filt('lowpass', 400); const am = R.osc('sine', 11, w, dur); const ag = R.gain(0.6); am.connect(ag); const g = R.gain(); env(g.gain, w, off, fade.map(([t, v]) => [t, v * 1.2])); ag.connect(g.gain); s.connect(f).connect(g).connect(R.bus.bed); const o = R.osc('sawtooth', 680, w, dur); const of = R.filt('bandpass', 700, 8); const og = R.gain(); env(og.gain, w, off, fade.map(([t, v]) => [t, v * 0.03])); o.connect(of).connect(og).connect(R.bus.bed); }
  else if (type === 'sea') { const s = R.src('pink', w, dur - off, w + off); const f = R.filt('lowpass', 900); const l = R.osc('sine', 0.12, w, dur); const lg = R.gain(400); l.connect(lg).connect(f.frequency); const g = R.gain(); env(g.gain, w, off, fade.map(([t, v]) => [t, v * 0.9])); s.connect(f).connect(g).connect(R.bus.bed); for (let t = 1; t < dur; t += 2 + r() * 3) { if (t < off) continue; const tt = w + t - off; const o = R.osc('sine', 1800, tt, 0.4); o.frequency.exponentialRampToValueAtTime(1100, tt + 0.35); const og = R.gain(); expDecay(og.gain, tt, 0.02 * k * 2, 0.35); o.connect(og).connect(R.pan(r() * 2 - 1)).connect(R.bus.bed); } }
};

// ---------- ambient score ----------
const MOODS = {
  calm: { chords: [[48, 55, 59, 64], [45, 52, 57, 60], [41, 48, 57, 60], [43, 50, 55, 62]], tempo: 6, bright: 1400, pluck: [72, 76, 79, 74, 71], level: 1 },
  warm: { chords: [[50, 57, 61, 66], [47, 54, 59, 62], [43, 50, 57, 62], [45, 52, 57, 64]], tempo: 5, bright: 1700, pluck: [74, 78, 81, 76, 73, 69], level: 1 },
  map: { chords: [[45, 52, 57, 59], [43, 50, 55, 57], [41, 48, 53, 55], [43, 50, 55, 59]], tempo: 7, bright: 1200, pluck: [69, 71, 76, 74], level: 0.9 },
  sad: { chords: [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 58], [40, 47, 52, 55]], tempo: 7, bright: 900, pluck: [69, 72, 67, 64], level: 0.9 },
  tension: { chords: [[40, 47, 52, 55], [41, 48, 53, 56], [40, 47, 52, 55], [39, 46, 51, 54]], tempo: 4, bright: 900, pulse: 2.2, level: 0.9 },
  dread: { chords: [[33, 40, 45, 46], [33, 40, 44, 47], [32, 39, 44, 45]], tempo: 9, bright: 600, pulse: 1.0, level: 1.1 },
  cold: { chords: [[45, 52, 57, 62], [43, 50, 55, 62], [41, 48, 55, 60]], tempo: 8, bright: 1100, pluck: [81, 84, 79, 76], level: 0.8 },
  elegy: { chords: [[38, 45, 50, 53], [34, 41, 46, 50], [36, 43, 48, 51], [33, 40, 45, 48]], tempo: 7, bright: 800, pluck: [62, 65, 69, 67], level: 1 },
  hope: { chords: [[48, 55, 60, 64], [43, 50, 55, 59], [45, 52, 57, 60], [41, 48, 53, 57]], tempo: 5, bright: 1600, pluck: [72, 74, 76, 79], level: 0.9 },
  reflect: { chords: [[45, 52, 57, 60], [41, 48, 55, 57], [48, 55, 60, 64], [43, 50, 55, 59]], tempo: 8, bright: 1000, pluck: [69, 72, 76, 74], level: 0.9 },
  finale: { chords: [[45, 52, 57, 60], [41, 48, 53, 60], [48, 55, 60, 64], [43, 50, 55, 62]], tempo: 6, bright: 1500, pluck: [69, 72, 76, 79, 81], level: 1.1 },
};
L.music = (R, w, p, off) => {
  const m = MOODS[p.mood] || MOODS.calm; const dur = p.dur || 20; const lvl = 0.05 * m.level * (p.gain || 1);
  const nCh = Math.ceil(dur / m.tempo);
  for (let i = 0; i < nCh; i++) {
    const t0 = i * m.tempo; const t1 = Math.min(dur, t0 + m.tempo + 2.5); if (t1 <= off) continue;
    const chord = m.chords[i % m.chords.length];
    const fadeIn = i === 0 ? 2.5 : 1.8; const fadeOut = 2.5;
    for (const [j, note] of chord.entries()) for (const det of [-7, 6]) {
      const ws = w + t0; const o = R.osc(j === 0 ? 'triangle' : 'sawtooth', mtof(note), ws - Math.min(0, 0), t1 - t0); o.detune.value = det;
      const f = R.filt('lowpass', m.bright * (j === 0 ? 0.6 : 1), 0.6); const g = R.gain();
      const endFade = i === nCh - 1 ? Math.min(4, dur - t0) : fadeOut;
      env(g.gain, ws, Math.max(0, off - t0), [[0, 0], [fadeIn, lvl * (j === 0 ? 1.2 : 0.7)], [t1 - t0 - endFade, lvl * (j === 0 ? 1.2 : 0.7)], [t1 - t0, 0]]);
      o.connect(f).connect(g).connect(R.bus.music);
    }
    if (i % 2 === 0) { const sub = R.osc('sine', mtof(chord[0] - 12), w + t0, t1 - t0); const sg = R.gain(); env(sg.gain, w + t0, Math.max(0, off - t0), [[0, 0], [2, lvl * 1.4], [t1 - t0 - 2, lvl * 1.4], [t1 - t0, 0]]); sub.connect(sg).connect(R.bus.music); }
  }
  if (m.pluck) { const r = mulberry32(Math.floor(w)); for (let t = 1.5; t < dur - 1; t += m.tempo / 4 + r() * 0.6) { if (t < off) continue; const n = m.pluck[Math.floor(r() * m.pluck.length)]; const tt = w + t; for (const [h, a] of [[1, 1], [2, 0.3], [3, 0.12]]) { const o = R.osc('sine', mtof(n) * h, tt, 2.5); const g = R.gain(); expDecay(g.gain, tt, lvl * 0.7 * a, 2.2 / h, 0.004); o.connect(g).connect(R.bus.music); } } }
  if (m.pulse) { for (let t = 0.5; t < dur - 0.5; t += 1 / m.pulse) { if (t < off) continue; const tt = w + t; const o = R.osc('sine', mtof(m.chords[0][0] - 12), tt, 0.4); const g = R.gain(); expDecay(g.gain, tt, lvl * 2.2, 0.35, 0.01); o.connect(g).connect(R.bus.music); } }
};
const LONG = new Set(['bed', 'music', 'rumble', 'swell', 'riser', 'grind', 'creak', 'spring', 'wind', 'lava', 'drill', 'heartbeat', 'sizzle', 'groan', 'tear', 'roar', 'carAlarm', 'hiss', 'cries', 'excavator', 'truck', 'seismo', 'fire', 'crackle']);
function cueDur(c) { return (c.p && c.p.dur) || (LONG.has(c.name) ? 6 : 5); }

export class SfxEngine {
  constructor() { this.cues = []; this.muted = false; this.live = null; }
  build(director) { this.cues = director.cues || []; }
  setMuted(m) { this.muted = m; if (this.live) this.live.rig.master.gain.value = m ? 0 : MASTER; }
  play(R, cue, when, off = 0) {
    const fn = L[cue.name]; if (!fn) return;
    if (!LONG.has(cue.name) && off > 0.08) return; // short sounds already passed
    try { fn(R, when, cue.p || {}, off); } catch (e) { console.warn('sfx', cue.name, e); }
  }
  // ---------- live preview ----------
  startLive(ctx, t) {
    this.stopLive();
    const rig = new Rig(ctx, ctx.destination); if (this.muted) rig.master.gain.value = 0;
    this.live = { ctx, rig, base: ctx.currentTime - t + 0.15, next: 0 };
    // start sounds already in progress
    for (let i = 0; i < this.cues.length; i++) { const c = this.cues[i]; if (c.t < t && c.t + cueDur(c) > t && LONG.has(c.name)) this.play(rig, c, ctx.currentTime + 0.15, t - c.t); }
    this.live.next = this.cues.findIndex((c) => c.t >= t); if (this.live.next < 0) this.live.next = this.cues.length;
  }
  stopLive() { if (this.live) { try { const g = this.live.rig.master.gain; g.cancelScheduledValues(0); g.value = 0; this.live.rig.master.disconnect(); } catch (e) { /* noop */ } this.live = null; } }
  pumpLive(ctx, t) {
    const L2 = this.live; if (!L2) return;
    // resync if the playhead drifted (seek / pause)
    const expected = ctx.currentTime - L2.base; if (Math.abs(expected - t) > 0.4) { this.startLive(ctx, t); return; }
    while (L2.next < this.cues.length && this.cues[L2.next].t < t + 1.5) { const c = this.cues[L2.next]; this.play(L2.rig, c, L2.base + c.t - 0.0); L2.next++; }
  }
  // ---------- offline export ----------
  async renderAll(sampleRate = 44100) {
    if (this.full && this.full.sampleRate === sampleRate) return this.full;
    const len = Math.ceil((DURATION + 1) * sampleRate);
    const ctx = new OfflineAudioContext(2, len, sampleRate);
    const rig = new Rig(ctx, ctx.destination);
    for (const c of this.cues) this.play(rig, c, c.t, 0);
    this.full = await ctx.startRendering();
    return this.full;
  }
  // 16-bit little-endian interleaved PCM of [start, start+dur) as base64
  async renderWavBase64(start, dur, sampleRate = 44100) {
    const buf = await this.renderAll(sampleRate);
    const s0 = Math.max(0, Math.floor(start * sampleRate)), s1 = Math.min(buf.length, Math.floor((start + dur) * sampleRate));
    const n = Math.max(0, s1 - s0); const L0 = buf.getChannelData(0), R0 = buf.getChannelData(1);
    const out = new Uint8Array(n * 4); const dv = new DataView(out.buffer);
    for (let i = 0; i < n; i++) { const l = Math.max(-1, Math.min(1, L0[s0 + i])), r = Math.max(-1, Math.min(1, R0[s0 + i])); dv.setInt16(i * 4, l * 32767, true); dv.setInt16(i * 4 + 2, r * 32767, true); }
    let bin = ''; const CH = 0x8000; for (let i = 0; i < out.length; i += CH) bin += String.fromCharCode.apply(null, out.subarray(i, i + CH));
    return btoa(bin);
  }
}
