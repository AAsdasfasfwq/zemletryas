// Tiny static server for previewing: node tools/serve.js [port]  ->  http://localhost:8080/?t=0
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav' };

function createServer(root) {
  return http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(root, url === '/' ? 'index.html' : url);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
      const type = MIME[path.extname(file)] || 'application/octet-stream';
      const range = req.headers.range;
      if (range) { // needed for <audio> seeking
        const [s, e] = range.replace('bytes=', '').split('-'); const start = parseInt(s, 10); const end = e ? parseInt(e, 10) : st.size - 1;
        res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
        fs.createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
        fs.createReadStream(file).pipe(res);
      }
    });
  });
}
module.exports = { createServer };

if (require.main === module) {
  const port = parseInt(process.argv[2] || '8080', 10);
  createServer(path.join(__dirname, '..')).listen(port, () => console.log(`Preview: http://localhost:${port}/   (add ?t=SECONDS to start later)`));
}
