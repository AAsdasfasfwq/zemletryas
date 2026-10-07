// Bundles src/ into dist/app.js (IIFE, works from file:// and in Puppeteer)
const esbuild = require('esbuild');
const path = require('path');
const watch = process.argv.includes('--watch');
const opts = {
  entryPoints: [path.join(__dirname, '../src/main.js')],
  bundle: true, format: 'iife', target: ['chrome100'],
  outfile: path.join(__dirname, '../dist/app.js'),
  minify: !process.argv.includes('--dev'), sourcemap: false, logLevel: 'info',
  legalComments: 'none',
};
(async () => {
  if (watch) { const ctx = await esbuild.context(opts); await ctx.watch(); console.log('watching…'); }
  else await esbuild.build(opts);
})();
