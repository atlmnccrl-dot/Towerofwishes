// Title cards for the trailers in the game's own 5x7 pixel font, as transparent PNGs at the final video size.
//   NODE_PATH=$(npm root -g) node cards.js <cards.json> <outdir> [base]
// cards.json: { "L": { "w":1920, "h":1080, "bw":384, "bh":216 }, "V": {...}, "cards": [ { "name", "fmt":"L"|"V", "items": [
//   { "t": "TEXT", "y": 0.5, "x": 0.5, "s": 2, "c": "#e6dccb", "a": "center"|"left"|"right" } | { "logo": true, "y": 0.4, "s": 4 } ] } ] }
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const [specFile, outDir, base = 'http://localhost:8791/bellmourn/'] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  await p.goto(base + 'index.html', { waitUntil: 'load' });
  await p.waitForFunction(() => window.BM && window.BM.game && window.BM.game.ui, null, { timeout: 60000 });
  for (const card of spec.cards) {
    const F = spec[card.fmt];
    const png = await p.evaluate(({ card, F }) => {
      const ui = window.BM.game.ui; const c = document.createElement('canvas'); c.width = F.bw; c.height = F.bh;
      const g0 = ui.g; ui.g = c.getContext('2d'); ui.g.imageSmoothingEnabled = false;
      const logo = (cx, cy, s) => {
        ui.text('BELLMOURN', cx + Math.max(1, s / 3 | 0), cy + Math.max(1, s / 3 | 0), { align: 'center', scale: s, color: '#000000', shadow: false });
        ui.text('BELLMOURN', cx, cy, { align: 'center', scale: s, color: '#e6dccb', shadow: '#2a0a0c' });
        const half = Math.round(9 * 6 * s / 2) - 8 * s / 3; const y = cy + 9 * s; const L = Math.round(half - 6);
        ui.rect(cx - 6 - L, y, L, 1, '#6a1418'); ui.rect(cx + 7, y, L, 1, '#6a1418');
        const bell = ['..###..', '.#####.', '.#####.', '.#####.', '#######', '...#...'];
        bell.forEach((row, r) => [...row].forEach((ch, k) => { if (ch === '#') ui.rect(cx - 3 + k, y - 3 + r, 1, 1, r === 4 ? '#c8242a' : '#d8b860'); }));
      };
      for (const it of card.items) {
        const x = Math.round((it.x ?? 0.5) * F.bw), y = Math.round(it.y * F.bh);
        if (it.logo) logo(x, y, it.s || 3);
        else ui.text(it.t, x, y, { align: it.a || 'center', scale: it.s || 1, color: it.c || '#e6dccb', shadow: it.sh || '#000000' });
      }
      ui.g = g0;
      const o = document.createElement('canvas'); o.width = F.w; o.height = F.h; const og = o.getContext('2d'); og.imageSmoothingEnabled = false;
      og.drawImage(c, 0, 0, F.bw, F.bh, 0, 0, F.w, F.h); return o.toDataURL('image/png');
    }, { card, F });
    fs.writeFileSync(path.join(outDir, card.name + '.png'), Buffer.from(png.split(',')[1], 'base64'));
  }
  console.log(`${spec.cards.length} cards`); await b.close();
})();
