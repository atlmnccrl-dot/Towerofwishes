// Paints the battle effects (tools/vfx/gen.js) and packs them into assets/fx/vfx.webp + assets/fx/vfx.json, in the
// same form as the other effect sheets: { n: { key: frames }, f: { key: [[x, y, w, h, ox, oy], ...] } }, where (ox, oy)
// is where the frame's top left sits from the effect's anchor, in sprite pixels. Transparent edges are trimmed.
//   NODE_PATH=$(npm root -g) node tools/make-vfx.js [preview.png]
// Needs Playwright (for a canvas) and Python with Pillow (to write the WebP). With a path, it also writes a preview
// sheet: every effect's frames in a row, three times their size, on a dark ground.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..'), preview = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<html><body></body></html>'); await p.addScriptTag({ path: path.join(__dirname, 'vfx', 'gen.js') });
  const out = await p.evaluate((wantPreview) => {
    const keys = Object.keys(window.VFX), frames = [];
    for (const key of keys) { const e = window.VFX[key]; window.vfxFrames(key).forEach((c, i) => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      frames.push({ key, i, c, empty: x1 < 0, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, ax: e.ax, ay: e.ay }); }); }
    // shelf packing, tallest first, a pixel apart
    const W = 2048, list = frames.filter((f) => !f.empty).sort((a, b) => b.h - a.h || b.w - a.w); let x = 0, y = 0, row = 0;
    for (const f of list) { if (x + f.w > W) { x = 0; y += row + 1; row = 0; } f.px = x; f.py = y; x += f.w + 1; row = Math.max(row, f.h); }
    const H = y + row; const sheet = document.createElement('canvas'); sheet.width = W; sheet.height = H; const g = sheet.getContext('2d');
    for (const f of list) g.drawImage(f.c, f.x0, f.y0, f.w, f.h, f.px, f.py, f.w, f.h);
    const meta = { n: {}, f: {} }; for (const key of keys) { meta.n[key] = window.VFX[key].n; meta.f[key] = []; }
    for (const f of frames) meta.f[f.key][f.i] = f.empty ? [0, 0, 1, 1, 0, 0] : [f.px, f.py, f.w, f.h, f.x0 - f.ax, f.y0 - f.ay];
    let prev = null;
    if (wantPreview) { const S = 2, gap = 6, MAXF = 8, pick = (e) => Array.from({ length: Math.min(e.n, MAXF) }, (_, j) => Math.round(j * (e.n - 1) / Math.max(1, Math.min(e.n, MAXF) - 1))), rows = keys.map((k) => window.VFX[k]), PW = Math.max(...rows.map((e) => Math.min(e.n, MAXF) * (e.w * S + gap))) + 150, PH = rows.reduce((a, e) => a + e.h * S + gap + 14, 0);
      const c = document.createElement('canvas'); c.width = Math.min(PW, 8000); c.height = PH; const q = c.getContext('2d'); q.fillStyle = '#20242c'; q.fillRect(0, 0, c.width, c.height); q.imageSmoothingEnabled = false; let yy = 4;
      for (const key of keys) { const e = window.VFX[key]; q.fillStyle = '#9aa3b5'; q.font = '12px monospace'; q.fillText(key + ' (' + e.n + ')', 4, yy + 11); yy += 14;
        const mine = frames.filter((f) => f.key === key); pick(e).map((j) => mine[j]).forEach((f, i) => { const xx = 4 + i * (e.w * S + gap); q.fillStyle = '#2b313c'; q.fillRect(xx, yy, e.w * S, e.h * S); q.drawImage(f.c, 0, 0, e.w, e.h, xx, yy, e.w * S, e.h * S); q.fillStyle = '#ff5a5a'; q.fillRect(xx + e.ax * S - 1, yy + e.ay * S - 1, 3, 3); });
        yy += e.h * S + gap; }
      prev = c.toDataURL('image/png'); }
    return { png: sheet.toDataURL('image/png'), meta, size: [W, H], count: frames.length, keys: keys.length, prev };
  }, !!preview);
  await b.close();
  const dir = path.join(root, 'assets', 'fx'), png = path.join(dir, 'vfx.png');
  fs.writeFileSync(png, Buffer.from(out.png.split(',')[1], 'base64'));
  execFileSync('python3', ['-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).save(sys.argv[2], "WEBP", lossless=True, quality=100, method=6)', png, path.join(dir, 'vfx.webp')]);
  fs.rmSync(png); fs.writeFileSync(path.join(dir, 'vfx.json'), JSON.stringify(out.meta));
  if (preview) fs.writeFileSync(preview, Buffer.from(out.prev.split(',')[1], 'base64'));
  console.log('vfx: ' + out.keys + ' effects, ' + out.count + ' frames, sheet ' + out.size.join('x') + ', ' + (fs.statSync(path.join(dir, 'vfx.webp')).size / 1024).toFixed(0) + ' KB');
})().catch((e) => { console.error(e); process.exit(1); });
