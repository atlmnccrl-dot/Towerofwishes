// Tiny static server for the headless checks. Usage: const {start} = require('./serve'); const srv = await start(root)
const http = require('http'), fs = require('fs'), path = require('path');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
exports.start = (root, port = 0) => new Promise((res) => {
  const srv = http.createServer((req, rsp) => {
    const p = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!p.startsWith(root)) { rsp.writeHead(403); return rsp.end(); }
    fs.readFile(p, (e, d) => { if (e) { rsp.writeHead(404); return rsp.end(); } rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); rsp.end(d); });
  });
  srv.listen(port, () => res(srv));
});
