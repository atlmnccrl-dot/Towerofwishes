// Makes the store screenshots from the game itself, at the sizes the stores ask for.
//   (serve the game:  python3 -m http.server 8123   from this folder's parent)
//   node tools/store-shots.js [outDir=store] [http://localhost:8123]
// Writes store/screenshots/{iphone,ipad,android}/NN-name.jpg and store/feature-graphic.jpg.
// Needs Playwright (npm i -D playwright, or a global one on NODE_PATH).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const out = path.resolve(process.argv[2] || path.join(__dirname, '..', 'store')), base = process.argv[3] || 'http://localhost:8123';
const SIZES = { iphone: [896, 414, 3], ipad: [1376, 1032, 2], android: [960, 540, 2] }; // viewport × scale = 2688×1242, 2752×2064, 1920×1080
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;

async function session(browser, w, h, scale) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, hasTouch: true });
  const p = await ctx.newPage(), wait = (ms) => p.waitForTimeout(ms);
  await p.goto(base + '/index.html?test&store=off'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(() => window.BB && BB.UI && BB.UI.current === 'title', null, { timeout: 60000 });
  return { ctx, p, wait };
}
// a save far into the war: a full team at five stars, a roster to muster, gear worn
const richSave = () => {
  const S = BB.save; S.allSlots = true; S.gold = 48200; S.crystals = 1460; S.sigils = 60; S.rank = 12; S.seen.tutorial = 1;
  BB.MISSIONS.forEach((m) => { S.cleared[m.id] = 1; S.seen['cine_' + m.id] = 1; }); BB.CHAPTERS.forEach((c) => (S.seen['cine_ch' + c.id] = 1));
  const ts = BB.heroTiers(BB.ROSTER), pick = [].concat(ts[3].heroes.slice(0, 6), ts[2].heroes.slice(0, 6), ts[1].heroes.slice(0, 5), ts[0].heroes.slice(0, 4));
  for (const e of pick) { const h = BB.heroFromEntry(S, e); h.stars = 3 + (h.rarity > 1 ? 2 : h.rarity); h.level = 30 + h.rarity * 5; S.heroes.push(h); }
  S.heroes[0].stars = 5; S.heroes[0].level = 46;
  const r = BB.rng(11); for (const h of S.heroes) for (const slot of BB.SLOTS) h.gear[slot] = BB.makeItem(r, slot, h.level, Math.min(3, h.rarity + (r() < 0.4 ? 1 : 0)), slot === 'weapon' ? BB.weaponType(h.calling) : undefined);
  for (let i = 0; i < 9; i++) S.inventory.push(BB.makeItem(r, BB.SLOTS[i % 4], 44, 1 + (i % 3)));
  S.salvage = 14; S.works = { forge: 3, shrine: 2, barracks: 4 }; S.relics = ['r1', 'r2', 'r3', 'r4', 'r5']; S.relic = 'r3'; S.stats.treks = 6; S.stats.endless = 23;
  for (const k of ['relic', 'survive', 'trek', 'works']) S.seen['tip_' + k] = 1; // no first-time cards over a screenshot
  BB.autoFill(S); BB.persist();
};
// the same save in the middle of the war (the Cinderfields ahead), for the screens that show where you are
const midWar = () => { const S = BB.save, at = BB.MISSIONS.findIndex((m) => m.code === '6-3'); BB.MISSIONS.forEach((m, i) => { if (i >= at) delete S.cleared[m.id]; }); BB.persist(); };

(async () => {
  const browser = await chromium.launch();
  for (const [name, [w, h, scale]] of Object.entries(SIZES)) {
    if (only && !only.includes(name)) continue;
    const dir = path.join(out, 'screenshots', name); fs.mkdirSync(dir, { recursive: true });
    const { ctx, p, wait } = await session(browser, w, h, scale);
    const shot = (n) => p.screenshot({ path: path.join(dir, n + '.jpg'), type: 'jpeg', quality: 90 });
    const fight = async (code, secs) => {
      const idx = await p.evaluate((c) => BB.MISSIONS.findIndex((m) => m.code === c), code);
      await p.evaluate((i) => BB.deploy(i), idx); await p.waitForFunction(() => BB.UI.current === 'hud', null, { timeout: 60000 });
      await p.evaluate(() => { const s = BB.testHooks.scene(); for (const e of s.ents) if (e.side === 'hero') { e.hp = e.maxhp = 9e6; e.atk *= 0.3; } s.autoSkills = true; });
      await wait(secs * 1000);
    };
    const leave = async () => { await p.evaluate(() => BB.testHooks.scene().lose('shots')); await wait(300); await p.evaluate(() => BB.testHooks.goCamp()); await p.waitForFunction(() => BB.UI.current === 'home', null, { timeout: 20000 }); await p.evaluate(() => BB.UI.modal('mResults', false)); };
    await wait(7000); await shot('01-title');
    await p.click('#bPlay'); await p.waitForFunction(() => BB.Cinema.on && !BB.Cinema.loading, null, { timeout: 30000 }); await wait(400); await p.click('#cineSkip');
    await p.waitForFunction(() => BB.UI.current === 'home', null, { timeout: 20000 });
    await p.evaluate(richSave); await p.evaluate(() => BB.loadHeroes(BB.save.heroes)); await p.evaluate(() => BB.testHooks.goCamp()); await wait(800);
    await fight('7-3', 13); await shot('02-mirefen'); await leave();
    await fight('6-6', 15); await shot('03-cinder-witch'); await leave();
    await fight('2-7', 19); await shot('05-stand'); await leave();
    await p.evaluate(midWar); await p.evaluate(() => BB.testHooks.goCamp()); await wait(600);
    // an expedition, stopped at its first gate: the choice is the picture
    await p.evaluate(() => BB.deployTrek()); await p.waitForFunction(() => BB.UI.current === 'hud', null, { timeout: 60000 });
    await p.evaluate(() => { const s = BB.testHooks.scene(); for (const e of s.ents) if (e.side === 'hero') { e.hp = e.maxhp = 9e6; e.atk *= 6; } s.autoSkills = true; });
    await p.waitForFunction(() => document.getElementById('mTrek').classList.contains('on'), null, { timeout: 180000 }); await wait(700); await shot('04-expedition');
    await p.evaluate(() => { BB.UI.modal('mTrek', false); BB.testHooks.scene().paused = false; }); await leave();
    await p.click('.tab[data-tab=play]'); await wait(1200); await shot('06-play');
    await p.click('.tab[data-tab=heroes]'); await p.waitForFunction(() => BB.testHooks.scene().muster, null, { timeout: 40000 }); await wait(3000); await shot('07-muster');
    await p.click('#hsOpen'); await wait(600); await p.click('[data-r="tab-gear"]'); await wait(2400); await shot('08-hero');
    await p.click('[data-r="back"]'); await wait(500);
    await p.click('.tab[data-tab=shop]'); await p.waitForFunction(() => BB.testHooks.scene().market, null, { timeout: 40000 }); await wait(3000); await shot('09-market');
    await p.click('.tab[data-tab=home]'); await wait(800);
    await p.evaluate(() => BB.UI.openCampaign(BB.MISSIONS.findIndex((m) => m.code === '6-3'))); await wait(3500); await shot('10-campaign');
    console.log(name + ': 10 screenshots at ' + w * scale + '×' + h * scale);
    await ctx.close();
  }
  if (!only || only.includes('feature')) { // Google Play's feature graphic: the title, without its buttons
    const { ctx, p, wait } = await session(browser, 1024, 500, 1);
    await p.addStyleTag({ content: '.t-bot,.ttr,.tset,.ver,.t-banner{display:none!important} .t-top{top:22%!important} #title .logo{font-size:104px!important}' });
    await wait(7000); await p.screenshot({ path: path.join(out, 'feature-graphic.jpg'), type: 'jpeg', quality: 92 }); console.log('feature graphic 1024×500'); await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
