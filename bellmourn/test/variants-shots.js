// Photographs every variant of every area beside the base level, in the standalone viewer (test/variant-view.html),
// and lays each area's shots side by side on one sheet: <out>/<level>-sheet.png (plus each shot on its own).
// The views are taken at the start (where the condition must show from the first step) unless --at=x,z.
// NODE_PATH=$(npm root -g) node bellmourn/test/variants-shots.js <outDir> [levelId ...] [--short]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const args = process.argv.slice(2); const out = args.find((a) => !a.startsWith('--')) || '/tmp/variants'; const short = args.includes('--short');
  const at = (args.find((a) => a.startsWith('--at=')) || '').slice(5); const port = process.env.PORT || 8790;
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://127.0.0.1:${port}/bellmourn/test/variant-view.html`); await p.waitForFunction(() => window.VV && VV.ready, null, { timeout: 60000 });
  const all = await p.evaluate(() => Object.keys(VV.variants.VARIANTS));
  const levels = args.filter((a) => !a.startsWith('--')).slice(1); const todo = levels.length ? levels : all;
  for (const lid of todo) {
    const vids = [null, ...(await p.evaluate((l) => VV.variants.variantsOf(l).map((v) => v.id), lid))]; const shots = [];
    for (const vid of vids) {
      const f = at ? { x: +at.split(',')[0], z: +at.split(',')[1] } : null;
      await p.evaluate(async ({ lid, vid, short, f }) => { await VV.load(lid, vid, short && !!vid, f); }, { lid, vid, short, f });
      await p.waitForFunction(() => VV.frames > 40, null, { timeout: 60000 });
      const file = path.join(out, `${lid}-${vid ? vid.split('.')[1] : 'base'}.png`); await p.screenshot({ path: file }); shots.push(file);
    }
    // the sheet: every shot of the area side by side (two columns)
    const q = await b.newPage({ viewport: { width: 1280, height: 360 * Math.ceil(shots.length / 2) } });
    const html = '<body style="margin:0;background:#000;display:grid;grid-template-columns:640px 640px;gap:0">' + shots.map((s) => `<img src="data:image/png;base64,${fs.readFileSync(s).toString('base64')}" width=640 height=360>`).join('') + '</body>';
    await q.setContent(html); await q.screenshot({ path: path.join(out, `${lid}-sheet.png`), fullPage: true }); await q.close();
    console.log(lid, shots.length, 'shots');
  }
  console.log('errors:', errs.length ? errs.slice(0, 10) : 'none');
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
