// Quick screenshots of the main screens (for eyeballing the layout).
// Usage: NODE_PATH=$(npm root -g) node test/look.js /tmp/bl-look [--phone]
const { chromium, devices } = require('playwright');
const path = require('path'); const fs = require('fs');
const out = process.argv[2] || '/tmp/bl-look'; const phone = process.argv.includes('--phone');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(phone ? { ...devices['iPhone 13 landscape'] } : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.waitForTimeout(3000);
  const pre = phone ? 'phone-' : '';
  const shot = (n) => p.screenshot({ path: path.join(out, pre + n + '.png') });
  await shot('l1-title');
  await p.evaluate(() => window.__BL_GAME.api.toCampaign()); await p.waitForTimeout(400); await shot('l2-campaign');
  await p.evaluate(() => { const G = window.__BL_GAME; G.api.startMission(window.BL.campaign.MISSIONS[0]); });
  await p.waitForTimeout(6500); await shot('l3-intro');
  await p.evaluate(() => window.BL.cinema.skip()); await p.waitForTimeout(2500); await shot('l4-play');
  const r = await p.evaluate(() => window.BL.hud.regions.find((q) => q.id === 'unit'));
  await p.mouse.click(r.x + 30, r.y + 10); await p.waitForTimeout(300);
  const w = await p.evaluate(() => { const S = window.__BL_GAME.S; const a = S.field.sectors[0]; return { x: window.BL.render.sx(a.x - 200), y: window.BL.render.sy(a.y, window.BL.heightAt(S.field, a.x - 200, a.y)) }; });
  await p.waitForTimeout(400); await shot('l5-selected');
  const d = await p.evaluate(() => window.BL.hud.regions.find((q) => q.id === 'deploy'));
  await p.mouse.click(d.x + 20, d.y + 10); await p.waitForTimeout(300); await shot('l6-deploy');
  await p.evaluate(() => { const G = window.__BL_GAME; G.deployOpen = false; G.S.ai[0] = window.BL.createAI(G.S, 0); for (let i = 0; i < 30 * 60; i++) window.BL.step(G.S, window.BL.DT); const u = G.S.units.find((k) => k.team === 0); window.BL.R.cam.tx = u.x + 100; window.BL.R.cam.ty = u.y; window.BL.R.cam.tz = 1.6; });
  await p.waitForTimeout(1500); await shot('l7-fight');
  await p.evaluate(() => { const G = window.__BL_GAME; G.progress.stars = { m1: 1, m2: 1, m3: 1, m4: 1 }; G.api.startMission(window.BL.campaign.MISSIONS[3]); window.BL.cinema.skip(); const S = G.S; S.ai[0] = window.BL.createAI(S, 0); S.teams[0].rp = 2000; for (let i = 0; i < 30 * 70; i++) window.BL.step(S, window.BL.DT); const u = S.units.find((k) => k.team === 0 && k.kind === 'veh') || S.units.find((k) => k.team === 0); window.BL.R.cam.tx = u.x + 60; window.BL.R.cam.ty = u.y; window.BL.R.cam.tz = 2.2; });
  await p.waitForTimeout(1500); await shot('l8-armour');
  await p.evaluate(() => { window.BL.R.cam.tz = 0.3; }); await p.waitForTimeout(1200); await shot('l9-overview');
  console.log(JSON.stringify({ errors }));
  await b.close();
})();
