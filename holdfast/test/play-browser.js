// HOLDFAST - plays the opening and the first days in a headless browser through the real UI
// (taps on the world, buttons, dialogs), fast-forwarding time, and takes screenshots.
// Usage: NODE_PATH=$(npm root -g) node holdfast/test/play-browser.js [outdir] [url]
const { chromium } = require('playwright');
const out = process.argv[2] || '/tmp/holdfast-play';
const url = process.argv[3] || 'http://localhost:8765/holdfast/index.html';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  let n = 0; const shot = async name => { await page.screenshot({ path: out + '/' + String(++n).padStart(2, '0') + '-' + name + '.png' }); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  // Fast-forward the simulation by game seconds (with events handled by the game).
  const ff = async (sec) => { await ev(s => { const { G, S } = HF.debug; for (let t = 0; t < s && !G.st.gameOver; t += 0.05) { if (G.st.pending.length) break; S.step(G.st, 0.05); } }, sec); await page.waitForTimeout(300); };
  const answerAll = async () => { for (let k = 0; k < 10; k++) { const p = await ev(() => HF.debug.G.st.pending.length); if (!p) return; await page.waitForTimeout(400); const b = await page.$('#modal [data-act="choose"]:not(.off)'); if (b) { await b.click(); await page.waitForTimeout(400); const ok = await page.$('#modal [data-act="resultOk"]'); if (ok) { await ok.click(); } } else break; } };
  const skip = async () => { await ev(() => { while (HF.C.busy() || HF.C.queue.length) { if (HF.C.busy()) HF.C.skip(); else HF.C.update(0.01, HF.debug.G.st); } }); await page.waitForTimeout(150); };
  const click = async sel => { await skip(); await page.click(sel); await page.waitForTimeout(250); };
  const tapWorld = async (wx, wy) => { await skip(); await ev(([x, y]) => { HF.R.cam.x = x; HF.R.cam.y = y + 40; }, [wx, wy]); await page.waitForTimeout(80); const p = await ev(([x, y]) => HF.R.w2s(x, y), [wx, wy]); await page.mouse.click(p.x, p.y); await page.waitForTimeout(250); };
  const state = () => ev(() => { const { G, S } = HF.debug; const st = G.st; return { obj: HF.D.OBJ[st.obj].id, day: S.day(st), hour: Math.round(S.hour(st) * 10) / 10, res: Object.fromEntries(Object.entries(st.res).map(([k, v]) => [k, Math.round(v)])), pop: S.survivors(st).length, era: st.era, raids: st.stats.raids, deaths: st.stats.deaths, foes: S.foes(st).length }; });

  await page.goto(url);
  await page.waitForFunction(() => document.getElementById('loading').style.display === 'none', null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.click('#t-new'); await page.waitForTimeout(300); await page.click('#p-begin');
  await page.waitForTimeout(3500); await shot('opening-flyover');
  await page.waitForTimeout(7000); await shot('opening-title');
  await page.mouse.click(420, 200); await page.waitForTimeout(1200);
  await shot('play-start');
  // 1. Make camp: tap the clearing.
  const c = await ev(() => HF.debug.G.st.clearing);
  await ev(([x, y]) => { HF.R.cam.x = x; HF.R.cam.y = y; }, [(c.x + 0.5) * 32, (c.y + 0.5) * 32]);
  await page.waitForTimeout(300); await shot('clearing-beacon');
  await tapWorld((c.x + 0.5) * 32, (c.y + 0.5) * 32);
  console.log('after camp', JSON.stringify(await state()));
  // 2. Gather: tap the nearest tree, then a rock.
  const near = await ev(([cx, cy]) => { const st = HF.debug.G.st; const by = t => Object.values(st.nodes).filter(n => n.type === t).sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0]; return { tree: by('tree'), rock: by('rock'), bush: by('bush') }; }, [c.x, c.y]);
  await tapWorld((near.tree.x + 0.5) * 32, (near.tree.y + 1) * 32 - 8);
  await ff(8); await page.waitForTimeout(400); await shot('chopping');
  await ff(40);
  await tapWorld((near.rock.x + 0.5) * 32, (near.rock.y + 1) * 32 - 8);
  await ff(50);
  console.log('after gather', JSON.stringify(await state()));
  // 3. Campfire via the build drawer.
  await click('#act-build'); await page.waitForTimeout(400); await shot('build-drawer');
  await click('.card[data-type="heart"]'); await page.waitForTimeout(300);
  await tapWorld((c.x + 0.5) * 32, (c.y + 0.5) * 32); await page.waitForTimeout(200);
  await shot('placing-fire');
  await click('#place-ok'); await page.waitForTimeout(300);
  await ff(20); await page.waitForTimeout(2500); await shot('fire-lit');
  await page.mouse.click(420, 200); await page.waitForTimeout(800);
  // 4. Lean-to.
  await ff(30);
  await click('#act-build'); await page.waitForTimeout(300); await click('.card[data-type="tent"]'); await page.waitForTimeout(200);
  await tapWorld((c.x - 3) * 32, (c.y - 2) * 32); await click('#place-ok'); await page.waitForTimeout(200);
  await ff(30);
  // 5. Forage.
  await tapWorld((near.bush.x + 0.5) * 32, (near.bush.y + 1) * 32 - 8);
  await ff(60);
  console.log('before night', JSON.stringify(await state()));
  await shot('camp-day1');
  // 6. Night.
  for (let k = 0; k < 12; k++) { const s = await state(); if (s.hour >= 21.3 || s.day > 1) break; await ff(30); }
  await page.waitForTimeout(3500); await page.mouse.click(420, 200); await page.waitForTimeout(500);
  await ff(4); await page.waitForTimeout(500); await shot('night-one');
  for (let k = 0; k < 20; k++) { const s = await state(); if (s.foes === 0) break; await ff(3); }
  await shot('night-after');
  console.log('night', JSON.stringify(await state()));
  for (let k = 0; k < 40; k++) { const s = await state(); const p = await ev(() => HF.debug.G.st.pending.length); if (p || (s.day >= 2 && s.hour >= 11)) break; await ff(5); }
  await page.waitForTimeout(3000); await page.mouse.click(420, 200); await page.waitForTimeout(800);
  await shot('stranger');
  await answerAll();
  console.log('day2', JSON.stringify(await state()));
  // Jobs through the people screen.
  await click('#act-people'); await page.waitForTimeout(400); await shot('people');
  await page.click('#modal .prow:nth-child(2) [data-act="jobPick"]'); await page.waitForTimeout(300); await shot('jobs');
  await page.click('#modal [data-job="forage"]'); await page.waitForTimeout(300);
  // Stockpile, rain barrel, lookout, barricades: placed through the API helpers the UI uses.
  const placeNear = async (type, dx, dy) => { await ev(([t, dx, dy]) => { const { G, S } = HF.debug; const h = S.heart(G.st); for (let r = 0; r < 10; r++) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; const x = h.x + dx + Math.round(Math.cos(a) * r), y = h.y + dy + Math.round(Math.sin(a) * r); if (S.canPlace(G.st, t, x, y)) { G.cmd('place', { type: t, x, y }); return; } } }, [type, dx, dy]); };
  await ff(120);
  await placeNear('stockpile', 6, 2); await placeNear('water', -4, 3); await ff(120);
  console.log('stock', JSON.stringify(await state()));
  await ff(200);
  await placeNear('tower', -6, -3);
  await ev(() => { const { G, S } = HF.debug; const h = S.heart(G.st); const tiles = []; for (let k = -3; k < 4; k++) tiles.push([h.x + 9, h.y + k]); G.cmd('placeLine', { type: 'wall', tiles }); });
  await ff(150); await shot('defenses');
  await ev(() => { const { G, S } = HF.debug; const g = S.present(G.st)[0]; G.cmd('job', { id: g.id, job: 'guard' }); });
  // Wait for the raid.
  for (let k = 0; k < 60; k++) { const s = await state(); if (s.foes > 0 && s.day >= 3) break; await ff(15); await answerAll(); }
  await page.waitForTimeout(2000); await shot('raid-cine'); await page.mouse.click(420, 200); await page.waitForTimeout(600);
  await ff(6); await shot('raid-fight');
  for (let k = 0; k < 40; k++) { const s = await state(); if (s.foes === 0) break; await ff(3); }
  await page.waitForTimeout(500); await shot('raid-over');
  console.log('raid', JSON.stringify(await state()));
  await ff(100); await answerAll();
  // Expedition.
  await click('#act-map'); await page.waitForTimeout(500);
  const mem = await page.$('#modal .mem'); if (mem) await mem.click(); await page.waitForTimeout(300);
  await shot('expedition');
  const dep = await page.$('#modal [data-act="depart"]'); if (dep) await dep.click(); await page.waitForTimeout(300);
  for (let k = 0; k < 30; k++) { const p = await ev(() => HF.debug.G.st.pending.length); if (p) break; await ff(20); }
  await page.waitForTimeout(800); await shot('encounter');
  const ch = await page.$('#modal [data-act="choose"]:not(.off)'); if (ch) { await ch.click(); await page.waitForTimeout(500); await shot('result'); const ok = await page.$('#modal [data-act="resultOk"]'); if (ok) await ok.click(); }
  await answerAll();
  for (let k = 0; k < 30; k++) { const s = await ev(() => HF.debug.G.st.exps.length); if (!s) break; await ff(20); await answerAll(); }
  console.log('after expedition', JSON.stringify(await state()));
  await ev(() => { HF.debug.G.save(true); });
  // Night overview, zoomed out.
  await ev(() => { const { G, S } = HF.debug; const h = S.heart(G.st); HF.R.cam.x = (h.x + 2.5) * 32; HF.R.cam.y = (h.y + 1.5) * 32; HF.R.cam.z = 0.9; });
  await page.waitForTimeout(500); await shot('overview');
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
})();
