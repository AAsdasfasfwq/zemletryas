// QA helper: node tools/snap.js out_dir scale t1 t2 ...   (renders frames to PNG)
const path = require('path'); const fs = require('fs');
let puppeteer; try { puppeteer = require('puppeteer'); } catch (e) { puppeteer = require('puppeteer-core'); }
const { createServer } = require('./serve.js');
(async () => {
  const [out, scaleS, ...ts] = process.argv.slice(2); const scale = parseFloat(scaleS);
  fs.mkdirSync(out, { recursive: true });
  const server = createServer(path.join(__dirname, '..')).listen(0); const port = server.address().port;
  const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await puppeteer.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-features=CanvasNoise,FingerprintingProtection'] });
  const page = await browser.newPage();
  page.on('console', (m) => { const t = m.text(); if (!/GPU stall|WebGL-/.test(t)) console.log('[page]', t.slice(0, 300)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.setViewport({ width: Math.round(1920 * scale), height: Math.round(1080 * scale) });
  const t0 = Date.now();
  await page.goto(`http://localhost:${port}/index.html?render=1&scale=${scale}`, { waitUntil: 'load' });
  await page.evaluate(() => window.__ready);
  console.log('ready in', Date.now() - t0, 'ms');
  for (const t of ts) {
    const s = Date.now();
    await page.evaluate((ms) => window.seekTo(ms), parseFloat(t) * 1000);
    const el = await page.$('#gl');
    await el.screenshot({ path: path.join(out, `f_${String(t).padStart(7, '0')}.jpg`), type: 'jpeg', quality: 88 });
    console.log('t', t, Date.now() - s, 'ms');
  }
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
