// Narration timing: word lookup + inserted silent "breathing" gaps for epic moments.
// Voice time  = time inside voice.mp3.
// Video time  = voice time + sum of gaps inserted before it.
import { WORDS } from './data/words.js';

// Gaps are inserted right after the given word (voice time = word end) — the
// voice track is cut there and silence of `dur` seconds is inserted (render.js does the same).
export const GAP_SPECS = [
  { after: 'the earthquake 4 17 a .m', dur: 4.0, label: 'rupture' },
  { after: 'several thousand atomic bombs', dur: 3.0, label: 'bombs' },
  { after: 'millions of people knew disappears', dur: 3.0, label: 'dust' },
  { after: 'with a magnitude of 7 .5', dur: 2.0, label: 'second' },
];
export const OUTRO = 5.0; // seconds after the last word
export const VOICE_DURATION = 947.75;

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9.' ]/g, ' ').split(/\s+/).filter(Boolean);

// find index of phrase starting at or after word index `from`
export function findPhraseIndex(phrase, from = 0) {
  const p = norm(phrase);
  for (let i = from; i <= WORDS.length - p.length; i++) {
    let ok = true;
    for (let k = 0; k < p.length; k++) {
      const w = WORDS[i + k][0];
      if (w !== p[k] && !(p[k].length > 3 && w.startsWith(p[k]))) { ok = false; break; }
    }
    if (ok) return i;
  }
  return -1;
}

// resolve gaps in voice time
export const GAPS = [];
{
  let cursor = 0;
  for (const g of GAP_SPECS) {
    const i = findPhraseIndex(g.after, cursor);
    if (i < 0) { console.warn('gap phrase not found', g.after); continue; }
    const last = i + norm(g.after).length - 1;
    const next = WORDS[last + 1];
    // cut in the silence between the last word and the next one
    const at = next ? Math.min(WORDS[last][2] + 0.05, (WORDS[last][2] + next[1]) / 2) : WORDS[last][2];
    GAPS.push({ at, dur: g.dur, label: g.label, videoAt: 0 });
    cursor = last + 1;
  }
  let acc = 0;
  for (const g of GAPS) { g.videoAt = g.at + acc; acc += g.dur; }
}
export const TOTAL_GAP = GAPS.reduce((s, g) => s + g.dur, 0);
export const DURATION = VOICE_DURATION + TOTAL_GAP + OUTRO;

export function v2t(v) { let t = v; for (const g of GAPS) if (v >= g.at) t += g.dur; return t; }
export function gapTime(label) { const g = GAPS.find((x) => x.label === label); return g ? { t0: g.videoAt, t1: g.videoAt + g.dur } : null; }

// Sequential phrase cursor used by the shot list: T('some words') returns the
// video time of the first word of the next occurrence after the previous lookup.
let _cursor = 0;
export function resetCursor() { _cursor = 0; }
export function T(phrase, offset = 0) {
  const i = findPhraseIndex(phrase, _cursor);
  if (i < 0) { console.error('PHRASE NOT FOUND:', phrase, 'after word', _cursor, WORDS[_cursor]); return NaN; }
  _cursor = i; // inclusive: looking up the same phrase twice returns the same occurrence
  return v2t(WORDS[i][1]) + offset;
}
// end time of phrase (last word end)
export function TE(phrase, offset = 0) {
  const i = findPhraseIndex(phrase, _cursor);
  if (i < 0) { console.error('PHRASE NOT FOUND:', phrase); return NaN; }
  const last = i + norm(phrase).length - 1;
  _cursor = i;
  return v2t(WORDS[last][2]) + offset;
}
// look ahead from the cursor without moving it (for anchors used by later shots)
export function TP(phrase, offset = 0) {
  const i = findPhraseIndex(phrase, _cursor);
  if (i < 0) { console.error('PHRASE NOT FOUND (peek):', phrase); return NaN; }
  return v2t(WORDS[i][1]) + offset;
}
// look up without moving cursor
export function peek(phrase, from = 0) {
  const i = findPhraseIndex(phrase, from);
  return i < 0 ? NaN : v2t(WORDS[i][1]);
}
export function wordAt(t) {
  // returns index of word being spoken at video time t (or -1)
  for (let i = 0; i < WORDS.length; i++) { const s = v2t(WORDS[i][1]), e = v2t(WORDS[i][2]); if (t >= s && t <= e) return i; if (s > t) return -1; }
  return -1;
}
export { WORDS };
