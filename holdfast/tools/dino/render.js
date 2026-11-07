const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const OUT = process.argv[2];
const srv = http.createServer((q, r) => fs.readFile(path.join(__dirname, decodeURIComponent(q.url.split('?')[0])), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': q.url.split('?')[0].endsWith('.js') ? 'text/javascript' : q.url.includes('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); })).listen(8777);
const STD = [['Idle', 'Idle', 6, 1], ['Walk', 'Walk', 8, 1], ['Run', 'Run', 8, 1], ['Attack', 'Attack', 8, 1], ['Die', 'Death', 8, 0]];
const SPECIES = [
  { id: 'dino_raptor', m: 'Velociraptor', k: 0.062, pal: { Brown: '#b5794c', LightBrown: '#e8c08e', Black: '#1c1612' } },
  { id: 'dino_trex', m: 'Trex', k: 0.058, pal: { Green: '#5f7f3c', LightGreen: '#c3b874', Black: '#1a1612', Red: '#a3302c', LightYellow: '#f0c878' } },
  { id: 'dino_trike', m: 'Triceratops', k: 0.042, pal: { Purple: '#8c8470', LightBrown: '#e2cb9e', Brown: '#7a5232' } },
  { id: 'dino_stego', m: 'Stegosaurus', k: 0.04, pal: { DarkBrown: '#6e6a3e', LightBrown: '#d6b070', Brown: '#a8582e' } },
  { id: 'dino_para', m: 'Parasaurolophus', k: 0.058, pal: { Green: '#6f9150', LightGreen: '#b9cf86', LightYellow: '#ead796', Red: '#c4482f' } },
];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage();
  p.on('pageerror', e => console.log('[err]', e.message)); p.on('console', m => console.log('[page]', m.text()));
  const only = process.argv.slice(3);
  for (const s of SPECIES) {
    if (only.length && !only.includes(s.id)) continue;
    const t0 = Date.now();
    await p.goto('http://localhost:8777/render.html?m=' + s.m + '&k=' + s.k + '&id=' + s.id + '&pal=' + encodeURIComponent(JSON.stringify(s.pal)) + '&clips=' + encodeURIComponent(JSON.stringify(STD)));
    await p.waitForFunction(() => window.done, null, { timeout: 600000 });
    const r = await p.evaluate(() => window.result);
    fs.writeFileSync(path.join(OUT, s.id + '.json'), JSON.stringify(r.json));
    fs.writeFileSync(path.join(OUT, s.id + '.png'), Buffer.from(r.png.split(',')[1], 'base64'));
    console.log(s.id, 'anchor', r.json.anchor, Date.now() - t0, 'ms');
  }
  await b.close(); srv.close();
})();
