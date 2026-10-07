// Entry point. Two modes:
//  - preview (default): plays in real time, synced with assets/voice.mp3 + live Web Audio SFX.
//    Keys: Space = pause, ←/→ = ∓5 s, Shift+←/→ = ∓30 s, M = mute SFX.
//  - render (?render=1): no autoplay; Puppeteer drives window.seekTo(ms) frame by frame and pulls the
//    SFX track through window.renderSfxWav(start, dur).
import * as THREE from 'three';
import { Director } from './director.js';
import { DURATION, GAPS, VOICE_DURATION } from './timing.js';
import { registerAll } from './shots/index.js';
import { SfxEngine } from './audio/sfx.js';

const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
const scale = parseFloat(params.get('scale') || '1');
const startAt = parseFloat(params.get('t') || '0');

const canvas = document.getElementById('gl');
const director = new Director(canvas, { scale, samples: parseInt(params.get('samples') || '4', 10) });
window.director = director;
window.totalDuration = Math.round(DURATION * 1000);
window.videoGaps = GAPS.map((g) => ({ at: g.at, dur: g.dur }));
window.voiceDuration = VOICE_DURATION;

const sfx = new SfxEngine();
window.sfx = sfx;

async function loadFonts() {
  const fams = ['400 40px "Bebas Neue"', '400 40px Inter', '600 40px Inter', '700 40px Inter', '800 40px Inter', '900 40px Inter',
    'italic 400 40px "Playfair Display"', 'italic 700 40px "Playfair Display"', '700 40px "Playfair Display"', '800 40px "Playfair Display"',
    '400 40px "JetBrains Mono"', '700 40px "JetBrains Mono"'];
  try { await Promise.all(fams.map((f) => document.fonts.load(f))); await document.fonts.ready; } catch (e) { console.warn('font load', e); }
}

const ready = (async () => {
  await loadFonts();
  const shots = registerAll(director);
  director.setShots(shots);
  await director.buildAll((p, n) => { const el = document.getElementById('loading'); if (el) el.textContent = `building ${n} ${(p * 100) | 0}%`; });
  director.compileAll();
  sfx.build(director);
  const el = document.getElementById('loading'); if (el) el.remove();
  return true;
})();
window.__ready = ready.then(() => true).catch((e) => { console.error(e); window.__error = String(e && e.stack || e); throw e; });

window.seekTo = function (ms) {
  director.frame(ms / 1000);
  return true;
};
// WAV (16-bit PCM, base64) for SFX in [start, start+dur) video seconds
window.renderSfxWav = async function (start, dur, sampleRate = 48000) {
  return sfx.renderWavBase64(start, dur, sampleRate);
};

// ---------------- preview player ----------------
if (!RENDER) {
  const audio = new Audio('assets/voice.mp3'); audio.preload = 'auto';
  let playing = true, t = startAt, last = performance.now(), sfxMuted = false;
  const voiceTimeAt = (vt) => { // video time -> {voice time, inGap}
    let v = vt;
    for (const g of GAPS) { if (vt >= g.videoAt + g.dur) v -= g.dur; else if (vt >= g.videoAt) return { v: g.at, gap: true }; }
    return { v, gap: false };
  };
  let actx = null;
  function ensureAudio() {
    if (!actx) { actx = new (window.AudioContext || window.webkitAudioContext)(); sfx.startLive(actx, t); }
    if (actx.state === 'suspended') actx.resume();
  }
  function syncVoice(force) {
    const { v, gap } = voiceTimeAt(t);
    if (!playing || gap || v >= VOICE_DURATION) { if (!audio.paused) audio.pause(); return; }
    if (force || Math.abs(audio.currentTime - v) > 0.12) audio.currentTime = v;
    if (audio.paused) audio.play().catch(() => {});
  }
  function seek(nt) { t = Math.max(0, Math.min(DURATION, nt)); syncVoice(true); if (actx) sfx.startLive(actx, t); }
  // autoplay policies need a gesture for sound; visuals start immediately regardless
  const unlock = () => { ensureAudio(); syncVoice(true); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', (e) => {
    unlock();
    if (e.code === 'Space') { playing = !playing; if (!playing) { audio.pause(); sfx.stopLive(); } else { seek(t); } }
    if (e.code === 'ArrowRight') seek(t + (e.shiftKey ? 30 : 5));
    if (e.code === 'ArrowLeft') seek(t - (e.shiftKey ? 30 : 5));
    if (e.code === 'KeyM') { sfxMuted = !sfxMuted; sfx.setMuted(sfxMuted); }
  });
  ready.then(() => {
    last = performance.now(); syncVoice(true);
    try { ensureAudio(); } catch (e) { /* needs gesture */ }
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (playing) {
        t += dt;
        // follow the voice clock when it is running (keeps lip-tight sync)
        const { v, gap } = voiceTimeAt(t);
        if (!gap && !audio.paused && audio.readyState >= 2) {
          const drift = audio.currentTime - v; if (Math.abs(drift) < 0.5) t += drift * 0.1; else syncVoice(true);
        } else syncVoice(false);
        if (actx) sfx.pumpLive(actx, t);
      }
      if (t >= DURATION) { playing = false; audio.pause(); }
      director.frame(t);
      const hud = document.getElementById('time'); if (hud) hud.textContent = t.toFixed(2);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
