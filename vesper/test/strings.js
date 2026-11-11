// Every string the game shows, for translation (js/i18n.js): harvested from the game's data (names, titles, texts,
// the story's lines) and from a browser run through every screen (the menus' text and everything drawn on the
// canvas). Writes a JSON list, most frequent first. Usage (the repository served on :8765):
//   NODE_PATH=$(npm root -g) node vesper/test/strings.js out.json
const { chromium } = require('playwright'); const fs = require('fs');
const out = process.argv[2] || '/tmp/strings.json';
const KEYS = new Set(['name', 'title', 'text', 'blurb', 'desc', 'sub', 'say', 'eyebrow', 'top', 'label', 'role', 'tip', 'hint', 'goal', 'line', 'btn', 'card', 'what', 'info', 'flavor', 'lore', 'kind', 'weapon', 'num', 'short', 'long', 'help']);
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => {
    window.__S = new Map(); const add = (s) => { if (typeof s !== 'string') return; s = s.trim(); if (!/[A-Za-z]{2}/.test(s)) return; window.__S.set(s, (window.__S.get(s) || 0) + 1); };
    for (const m of ['fillText', 'strokeText']) { const o = CanvasRenderingContext2D.prototype[m]; CanvasRenderingContext2D.prototype[m] = function (t, ...a) { add(t); return o.call(this, t, ...a); }; }
    const walkDom = (n) => { if (n.nodeType === 3) add(n.textContent); else if (n.nodeType === 1) { for (const at of ['title', 'placeholder', 'aria-label']) if (n.getAttribute && n.getAttribute(at)) add(n.getAttribute(at)); n.childNodes.forEach(walkDom); } };
    new MutationObserver((ms) => { for (const m of ms) { m.addedNodes.forEach(walkDom); if (m.type === 'characterData') add(m.target.textContent); } }).observe(document, { childList: true, subtree: true, characterData: true });
    window.__walk = walkDom;
  });
  await pg.goto('http://127.0.0.1:8765/vesper/index.html?map');
  await pg.waitForFunction(() => window.VS && VS.main && VS.main.state === 'map' && VS.main.bgDone, null, { timeout: 180000 });
  // The data: every string under a text-like key, anywhere in the game's objects.
  await pg.evaluate((keys) => { keys = new Set(keys); const seen = new Set();
    const walk = (o, d, key) => { if (d > 9 || o == null) return; if (typeof o === 'string') { if (keys.has(key) && o.length < 400) { const s = o.trim(); if (/[A-Za-z]{2}/.test(s)) window.__S.set(s, (window.__S.get(s) || 0) + 1); } return; }
      if (typeof o === 'function' || typeof o !== 'object' || seen.has(o)) return; seen.add(o); for (const k in o) walk(o[k], d + 1, Array.isArray(o) ? key : k); };
    for (const k of ['DATA', 'PROG', 'LOOT', 'MODES', 'STORY', 'SHOP', 'ARENAS']) walk(VS[k], 0, null); }, [...KEYS]);
  // A late-game profile, then every screen.
  await pg.evaluate(() => { const P = VS.PROG, p = VS.main.save; for (const n of P.NODES) { if (n.act > 4) break; if (n.type === 'shrine') { P.claimShrine(p, n.id); continue; } P.finish(p, n.id, { win: true, time: 40, hpFrac: 0.8, bossHits: 0, maxCombo: 40, kills: 30, chests: ['wood'], rand: Math.random }); } P.soulsInit(p); p.shards = 999; });
  const visit = async (code, wait) => { try { await pg.evaluate(code); await pg.waitForTimeout(wait || 900); await pg.evaluate(() => window.__walk(document.body)); } catch (e) { errs.push(code + ': ' + e.message); } };
  for (const c of ['VS.main.title()', 'VS.main.map(VS.PROG.nextNode(VS.main.save))', 'VS.main.map("a0-t")', 'VS.main.map("a5-b")', 'VS.main.skills()', 'VS.main.roster()', 'VS.main.souls()', 'VS.main.gear()',
    'VS.main.gear("bag")', 'VS.main.gear("forge")', 'VS.main.shop()', 'VS.main.modes()', 'VS.main.settings()', 'VS.main.theatre()', 'VS.main.cutscenes(() => {})']) await visit(c);
  // Fights: a battle, a guardian, the pause menu, a win and a loss.
  for (const [node, end] of [['a1-3', 'win'], ['a2-b', 'lose'], ['a0-t', null], ['a5-b', 'win']]) {
    await visit(`VS.main.startNode('${node}')`, 2500); await pg.waitForFunction(() => VS.main.state === 'fight', null, { timeout: 60000 }).catch(() => {});
    await visit('VS.main.fight.auto = true', 5000);
    if (end) { await visit(`VS.main.endFight('${end}')`, 1500); await visit('0', 1500); }
  }
  // Story scenes: each act's pieces and the ending, run through quickly.
  const defs = await pg.evaluate(() => Object.keys(VS.STORY).filter((k) => VS.STORY[k] && VS.STORY[k].shots));
  for (const d of defs) { await visit(`VS.main.startScene(5, VS.STORY.${d}, () => {}, true)`, 400); for (let i = 0; i < 12; i++) await visit(`(() => { const sc = VS.main.scene && VS.main.scene.sc; if (sc) { sc.i = ${i}; sc.t = 1.2; } })()`, 250); }
  const list = await pg.evaluate(() => [...window.__S.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]));
  fs.writeFileSync(out, JSON.stringify(list, null, 1)); console.log(list.length, 'strings; errors:', errs.length ? errs.slice(0, 5) : 'none'); await b.close();
})();
