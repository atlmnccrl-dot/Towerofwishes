// Capture one trailer segment frame by frame on a paused clock (exactly 30 fps of game time), logging every
// sound the game asks for. Usage: node capture.js spec.json outDir
const { chromium } = require('playwright'); const fs = require('fs');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), out = process.argv[3];
const W = spec.w || 1280, H = spec.h || 720, FPS = 30;
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: W, height: H } }); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript((save) => { try { if (save) localStorage.setItem('vesper.save.v2', JSON.stringify(save)); } catch (e) {} }, spec.save || null);
  await page.goto('http://127.0.0.1:8765/vesper/index.html' + spec.url);
  await page.waitForFunction((st) => window.VS && VS.main && VS.main.state === st && (VS.main.bgDone || st === 'intro'), spec.state, { timeout: 180000 });
  await page.evaluate(() => { window.__ev = []; window.__fr = 0; const A = VS.audio, o = A.sfx; A.sfx = function (n, v) { window.__ev.push({ f: window.__fr, n, v: v == null ? 1 : v, ft: VS.INTRO && VS.INTRO.st ? VS.INTRO.st.t : null }); return o.apply(this, arguments); }; });
  if (spec.setup) await page.evaluate(spec.setup);
  await page.waitForTimeout(300);
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
  let n = 0;
  const step = async (k) => { await page.clock.runFor(k % 3 === 0 ? 34 : 33); };
  for (const part of spec.parts) {
    if (part.before) await page.evaluate(part.before);
    for (let i = 0; i < Math.round((part.skip || 0) * FPS); i++) await step(i);
    if (part.after) await page.evaluate(part.after);
    await page.evaluate((n) => { window.__fr = n; window.__ev = window.__ev.filter(() => false); }, n);   // sounds before the capture do not count
    const frames = Math.round(part.dur * FPS);
    for (let i = 0; i < frames; i++) {
      await page.evaluate((n) => { window.__fr = n; }, n);
      await step(i);
      if (part.during) await page.evaluate(part.during);
      await page.screenshot({ path: `${out}/${spec.name}_${String(n).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
      n++;
    }
    part.ev = await page.evaluate(() => window.__ev.splice(0));
    if (part.filmFrom != null) part.ev = part.ev.filter((e) => e.ft == null || (e.ft >= part.filmFrom - 0.05 && e.ft <= part.filmFrom + part.dur + 0.05));
  }
  const ev = [].concat(...spec.parts.map((p) => p.ev));
  fs.writeFileSync(`${out}/${spec.name}.json`, JSON.stringify({ frames: n, ev }));
  console.log(spec.name, n, 'frames', ev.length, 'sounds', 'errors', errs); await b.close();
})();
