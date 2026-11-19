// Close-up screenshots of every unit, both sides, mid-fight (for checking the drawings).
// Usage: NODE_PATH=$(npm root -g) node test/gallery.js /tmp/bl-gallery
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const out = process.argv[2] || '/tmp/bl-gallery';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const G = window.__BL_GAME, BL = window.BL;
    G.api.startBattle(); G.help = false;
    const S = G.S;
    S.ai[1] = null;
    function place(team, type, x) {
      S.teams[team].rp = 5000; S.teams[team].cds = {};
      const r = BL.deploy(S, team, type, S.field.bases[team]);
      const u = r.unit; const dx = x - u.x; u.x = x;
      for (const m of u.members) { m.x += dx; m.y = BL.heightAt(S.field, m.x) + (m.veh && u.kind === 'air' ? 150 : 0); }
      u.order = { type: 'hold', x, target: 0 };
      return u;
    }
    // a skirmish line in the valley east of A
    place(0, 'rifle', 1560); place(0, 'mg', 1500); place(0, 'tank', 1610); place(0, 'apc', 1450); place(0, 'heli', 1530);
    place(1, 'rifle', 1880); place(1, 'scout', 1940); place(1, 'tank', 1990); place(1, 'apc', 2050); place(1, 'heli', 2010);
    BL.deploy(S, 0, 'insert', 1700);
    window.__gal = true;
  });
  const look = async (name, x, z, wait) => {
    await page.evaluate(([x, z]) => { const R = window.BL.R; R.cam.tx = R.cam.x = x; R.cam.tz = R.cam.z = z; R.cam.yOff = 0; }, [x, z]);
    await page.waitForTimeout(wait || 900);
    await page.screenshot({ path: path.join(out, name + '.png') });
  };
  await page.waitForTimeout(4000);
  await look('g1-friendly', 1540, 3.2);
  await look('g2-enemy', 1980, 3.2);
  await look('g3-line', 1760, 1.5, 2500);
  // wait until soldiers are on the rope
  await page.waitForFunction(() => { const t = window.__BL_GAME.S.transports[0]; return t && t.unit.members.some((m) => m.rappel && m.rappel.stage === 'down'); }, null, { timeout: 30000 });
  await page.evaluate(() => { const R = window.BL.R; R.cam.yOff = 60; });
  await look('g4-rope', 1700, 1.9, 600);
  console.log(JSON.stringify({ errors }));
  await browser.close();
})();
