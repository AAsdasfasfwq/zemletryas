#!/usr/bin/env node
// Frame-accurate exporter: renders the film frame by frame in headless Chrome (Puppeteer),
// encodes 30 s segments with ffmpeg (resumable, parallel workers), renders the Web Audio SFX
// track offline, re-times the voice-over (inserting the silent "breathing" gaps) and muxes
// everything into a YouTube-ready 1920x1080 MP4.
//
//   node render.js                      # full film -> out/earthquake_2023.mp4
//   node render.js --workers 3          # parallel browsers (good GPUs: 2-4)
//   node render.js --from 480 --to 520  # render only a range (preview a sequence)
//   node render.js --scale 0.5          # half-resolution draft
//   node render.js --gl swiftshader     # CPU rendering (no GPU available; slow)
//   node render.js --audio-only         # only re-mix/re-mux the soundtrack (segments must exist)
//
// Requirements: Node 18+, `npm install`, ffmpeg in PATH (or `npm i ffmpeg-static`).
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

let puppeteer;
try { puppeteer = require('puppeteer'); } catch (e) { puppeteer = require('puppeteer-core'); }
const { createServer } = require('./tools/serve.js');

// ---------------- options ----------------
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf('--' + name); if (i < 0) return def; const v = argv[i + 1]; return v === undefined || v.startsWith('--') ? true : v; };
const FPS = parseFloat(opt('fps', 30));
const WORKERS = parseInt(opt('workers', Math.max(1, Math.min(3, Math.floor(os.cpus().length / 4)))), 10);
const SCALE = parseFloat(opt('scale', 1));
const OUT = path.resolve(opt('out', 'out/earthquake_2023.mp4'));
const WORK = path.resolve(opt('work', path.join(path.dirname(OUT), 'work')));
const CRF = String(opt('crf', 17));
const PRESET = String(opt('preset', 'medium'));
const JPEG_Q = parseInt(opt('quality', 95), 10);
const SEG_SECONDS = parseFloat(opt('segment', 30));
const SFX_VOL = parseFloat(opt('sfx-volume', 0.9));
const VOICE_VOL = parseFloat(opt('voice-volume', 1.0));
const GL = String(opt('gl', 'gpu'));
const HEADFUL = !!opt('headful', false);
const NO_AUDIO = !!opt('no-audio', false);
const CHROME = opt('chrome', process.env.CHROME_PATH || null);
let FFMPEG = opt('ffmpeg', null);
if (!FFMPEG) { try { FFMPEG = require('ffmpeg-static'); } catch (e) { FFMPEG = 'ffmpeg'; } }

const W = Math.round(1920 * SCALE), H = Math.round(1080 * SCALE);
const ROOT = __dirname;

function log(...a) { console.log(new Date().toISOString().slice(11, 19), ...a); }
function checkFfmpeg() { const r = spawnSync(FFMPEG, ['-version']); if (r.error || r.status !== 0) { console.error(`ffmpeg not found ("${FFMPEG}"). Install ffmpeg or run: npm i ffmpeg-static`); process.exit(1); } }

function chromeArgs() {
  const a = ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--mute-audio', '--disable-features=CanvasNoise,FingerprintingProtection', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--force-color-profile=srgb', `--window-size=${W},${H}`];
  if (GL === 'swiftshader') a.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  else a.push('--ignore-gpu-blocklist', '--enable-gpu', '--enable-gpu-rasterization', '--use-gl=angle');
  return a;
}
async function launch() {
  const o = { headless: HEADFUL ? false : 'new', args: chromeArgs(), defaultViewport: { width: W, height: H, deviceScaleFactor: 1 }, protocolTimeout: 0 };
  const exe = CHROME || findChrome(); if (exe) o.executablePath = exe;
  return puppeteer.launch(o);
}
// puppeteer's own Chrome first; if it was not downloaded, fall back to an installed Chrome/Chromium
function findChrome() {
  try { const p = puppeteer.executablePath(); if (p && fs.existsSync(p)) return null; } catch (e) { /* not downloaded */ }
  const c = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const pw = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(pw)) if (/^chromium-\d+/.test(d)) c.push(path.join(pw, d, 'chrome-linux/chrome')); } catch (e) { /* none */ }
  const hit = c.find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });
  if (hit) console.log('using browser', hit);
  return hit || null;
}
async function openPage(browser, port) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => log('[page error]', e.message));
  page.on('console', (m) => { const t = m.text(); if (/error|not found/i.test(t) && !/favicon|GPU stall/i.test(t)) log('[page]', t.slice(0, 300)); });
  await page.goto(`http://127.0.0.1:${port}/index.html?render=1&scale=${SCALE}`, { waitUntil: 'load', timeout: 0 });
  await page.waitForFunction('window.__ready !== undefined', { timeout: 0 });
  await page.evaluate(() => window.__ready);
  return page;
}

// ---------------- video ----------------
function encoder(file, frames) {
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF, '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-tune', 'film', '-g', String(FPS * 2), '-bf', '2', '-movflags', '+faststart', '-frames:v', String(frames), file];
  const p = spawn(FFMPEG, args, { stdio: ['pipe', 'inherit', 'inherit'] });
  return p;
}
function write(stream, buf) { return new Promise((res) => { if (!stream.write(buf)) stream.once('drain', res); else res(); }); }

async function renderSegment(page, seg) {
  const tmp = seg.file + '.part.mp4';
  const enc = encoder(tmp, seg.n);
  let encErr = null; enc.stdin.on('error', (e) => { encErr = e; });
  const done = new Promise((res, rej) => enc.on('close', (code) => (code === 0 ? res() : rej(new Error('ffmpeg exited ' + code)))));
  const t0 = Date.now();
  for (let i = 0; i < seg.n; i++) {
    const f = seg.start + i; const ms = (f / FPS) * 1000;
    await page.evaluate((m) => window.seekTo(m), ms);
    const jpg = await page.screenshot({ type: 'jpeg', quality: JPEG_Q, optimizeForSpeed: true, clip: { x: 0, y: 0, width: W, height: H } });
    if (encErr) throw encErr;
    await write(enc.stdin, jpg);
  }
  enc.stdin.end(); await done;
  fs.renameSync(tmp, seg.file);
  return (Date.now() - t0) / seg.n;
}

// ---------------- audio ----------------
async function renderSfx(page, duration, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 1000) { log('SFX track exists, skipping'); return; }
  log('rendering SFX track (offline Web Audio)…');
  const SR = 44100; const fd = fs.openSync(file + '.part', 'w'); const step = 60;
  for (let s = 0; s < duration; s += step) {
    const b64 = await page.evaluate((a, b, sr) => window.renderSfxWav(a, b, sr), s, Math.min(step, duration - s), SR);
    fs.writeSync(fd, Buffer.from(b64, 'base64'));
  }
  fs.closeSync(fd); fs.renameSync(file + '.part', file);
}
const VOICE_CHAIN = 'highpass=f=75,acompressor=threshold=0.06:ratio=3:attack=6:release=140:knee=4';
function measureLoudness(args) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', ...args, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const m = /I:\s+(-?[\d.]+) LUFS/.exec(r.stderr || ''); return m ? parseFloat(m[1]) : null;
}
function buildAudio(info, sfxRaw, outFile) {
  // voice: compressed and normalised to TARGET LUFS, cut at each gap with inserted silence;
  // SFX ducked under the voice (sidechain), then everything through a true-peak-safe limiter.
  const voice = path.join(ROOT, 'assets', 'voice.mp3');
  const target = parseFloat(opt('loudness', -16));
  const measured = measureLoudness(['-i', voice, '-af', `${VOICE_CHAIN},ebur128=framelog=quiet`]);
  const vGain = measured === null ? 6 : Math.max(-6, Math.min(18, target - measured));
  log(`voice loudness ${measured} LUFS → gain ${vGain.toFixed(1)} dB (target ${target} LUFS)`);
  const gaps = info.gaps; const parts = []; const filters = []; let prev = 0; let k = 0;
  filters.push(`[0:a]${VOICE_CHAIN},volume=${(vGain + 20 * Math.log10(VOICE_VOL)).toFixed(2)}dB,aresample=44100,aformat=channel_layouts=stereo,asplit=${gaps.length + 1}${gaps.map((_, i) => `[vi${i}]`).join('')}[vi${gaps.length}]`);
  for (const g of gaps) { filters.push(`[vi${k}]atrim=start=${prev}:end=${g.at},asetpts=PTS-STARTPTS[v${k}]`); parts.push(`[v${k}]`);
    filters.push(`aevalsrc=0|0:d=${g.dur}:s=44100,aformat=channel_layouts=stereo[s${k}]`); parts.push(`[s${k}]`); prev = g.at; k++; }
  filters.push(`[vi${k}]atrim=start=${prev},asetpts=PTS-STARTPTS[v${k}]`); parts.push(`[v${k}]`);
  filters.push(`${parts.join('')}concat=n=${parts.length}:v=0:a=1,apad=whole_dur=${info.duration},asplit=2[voice][vkey]`);
  filters.push(`[1:a]volume=${(SFX_VOL * Math.pow(10, (vGain - 8) / 20)).toFixed(3)}[sfxraw]`);
  if (opt('duck', 'on') !== 'off') filters.push(`[sfxraw][vkey]sidechaincompress=threshold=0.04:ratio=3.5:attack=25:release=420:knee=3[sfx]`);
  else filters.push(`[sfxraw]anull[sfx]; [vkey]anullsink`);
  filters.push(`[voice][sfx]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89:attack=4:release=80:level=false,atrim=end=${info.duration}[out]`);
  const args = ['-y', '-loglevel', 'error', '-i', voice, '-f', 's16le', '-ar', '44100', '-ac', '2', '-i', sfxRaw, '-filter_complex', filters.join(';'), '-map', '[out]', '-c:a', 'pcm_s16le', outFile];
  const r = spawnSync(FFMPEG, args, { stdio: 'inherit' }); if (r.status !== 0) throw new Error('audio mix failed');
  const fin = measureLoudness(['-i', outFile, '-af', 'ebur128=framelog=quiet']); log(`final mix loudness: ${fin} LUFS`);
}

// ---------------- main ----------------
(async () => {
  checkFfmpeg();
  fs.mkdirSync(WORK, { recursive: true }); fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const server = createServer(ROOT).listen(0, '127.0.0.1'); await new Promise((r) => server.once('listening', r)); const port = server.address().port;
  log(`server on :${port}, ${W}x${H} @ ${FPS} fps, workers=${WORKERS}, gl=${GL}`);

  const b0 = await launch(); const p0 = await openPage(b0, port);
  const info = await p0.evaluate(() => ({ duration: window.totalDuration / 1000, gaps: window.videoGaps, voice: window.voiceDuration, renderer: (() => { const gl = document.getElementById('gl').getContext('webgl2'); const d = gl && gl.getExtension('WEBGL_debug_renderer_info'); return gl ? gl.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : 'n/a'; })() }));
  log(`film duration ${info.duration.toFixed(2)} s, GPU: ${info.renderer}`);
  if (/swiftshader/i.test(info.renderer) && GL !== 'swiftshader') log('WARNING: Chrome is using the software rasterizer (no GPU). Rendering will be slow.');

  const from = parseFloat(opt('from', 0)), to = Math.min(parseFloat(opt('to', info.duration)), info.duration);
  const F0 = Math.round(from * FPS), F1 = Math.round(to * FPS);
  const segLen = Math.round(SEG_SECONDS * FPS); const segs = [];
  for (let f = F0, i = 0; f < F1; f += segLen, i++) segs.push({ i, start: f, n: Math.min(segLen, F1 - f), file: path.join(WORK, `seg_${String(f).padStart(6, '0')}_${Math.min(segLen, F1 - f)}_${W}.mp4`) });
  const AUDIO_ONLY = !!opt('audio-only', false);
  const todo = AUDIO_ONLY ? [] : segs.filter((s) => !fs.existsSync(s.file));
  if (AUDIO_ONLY && segs.some((s) => !fs.existsSync(s.file))) { console.error('--audio-only: some video segments are missing; render them first'); process.exit(1); }
  log(`${segs.length} segments, ${todo.length} to render (${segs.length - todo.length} already done)`);

  // audio first (fast), on the first page
  const sfxRaw = path.join(WORK, 'sfx_44k_s16le.raw');
  if (!NO_AUDIO) await renderSfx(p0, info.duration, sfxRaw);

  // workers
  const pages = [p0]; const browsers = [b0];
  for (let k = 1; k < WORKERS && k < todo.length; k++) { const b = await launch(); browsers.push(b); pages.push(await openPage(b, port)); }
  let next = 0, done = 0; const tStart = Date.now();
  await Promise.all(pages.map(async (page, k) => {
    while (next < todo.length) {
      const seg = todo[next++];
      const msPerFrame = await renderSegment(page, seg);
      done++;
      const el = (Date.now() - tStart) / 1000; const eta = (el / done) * (todo.length - done);
      log(`worker ${k}: segment ${seg.i + 1}/${segs.length} done (${msPerFrame.toFixed(0)} ms/frame) — ${done}/${todo.length}, ETA ${(eta / 60).toFixed(1)} min`);
    }
  }));
  for (const b of browsers) await b.close();
  server.close();

  // concat
  const list = path.join(WORK, 'segments.txt'); fs.writeFileSync(list, segs.map((s) => `file '${s.file.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
  const videoOnly = path.join(WORK, 'video_only.mp4');
  let r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', videoOnly], { stdio: 'inherit' }); if (r.status !== 0) throw new Error('concat failed');
  if (NO_AUDIO) { fs.copyFileSync(videoOnly, OUT); log('done (no audio):', OUT); return; }
  const mixed = path.join(WORK, 'mix.wav');
  buildAudio(info, sfxRaw, mixed);
  const audioArgs = from > 0 || to < info.duration ? ['-ss', String(from), '-t', String(to - from)] : [];
  r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', videoOnly, ...audioArgs, '-i', mixed, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('mux failed');
  log('DONE →', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
