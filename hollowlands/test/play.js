// End-to-end playthrough of the Ashwick slice in headless Chromium.
// A bot really fights (attacks, heavy blows, rolls through telegraphs, heals); locks are checked
// with a walkability search before and after they open; then the save is reloaded.
// NODE_PATH=$(npm root -g) node test/play.js
const { chromium } = require('playwright');
const path = require('path');
const { start } = require('./serve');

const SIM = () => {
  const G = HL.G, T = (t) => t * 8 + 4;
  const blank = () => ({ mx: 0, my: 0, attack: false, attackDown: false, attackUp: false, dodge: false, interact: false, ult: false, item: false, menu: false, map: false, esc: false, swap: false });
  const S = (window.SIM = { log: [] });
  const covers = (e, p) => {
    const tl = e.tele; if (!tl || tl.q < 0.45) return null;
    if (tl.k === 'ring') return HL.dist(p.x, p.y, tl.x, tl.y) < tl.r + 6 ? Math.atan2(p.y - tl.y, p.x - tl.x) : null;
    if (tl.k === 'arc') { const d = HL.dist(p.x, p.y, tl.x, tl.y); return d < tl.r + 6 ? Math.atan2(p.y - tl.y, p.x - tl.x) : null; }
    if (tl.k === 'line') { const dx = p.x - e.x, dy = p.y - e.y, along = dx * Math.cos(tl.a) + dy * Math.sin(tl.a), perp = -dx * Math.sin(tl.a) + dy * Math.cos(tl.a); return along > 0 && Math.abs(perp) < 7 && tl.q > 0.7 ? tl.a + Math.PI / 2 * Math.sign(perp || 1) : null; }
    return null;
  };
  let pressed = false, hold = 0, frame = 0;
  S.bot = (opt = {}) => {
    const p = G.player, inp = blank(); frame++;
    if (hold > 0) { hold--; inp.attackDown = hold > 0; return inp; }
    if (pressed) { pressed = false; return inp; }
    const foes = G.enemies.filter((e) => !e.dead);
    let tgt = null, bd = 1e9;
    const reso = G.bossAwake && G.world.objects.find((o) => o.t === 'resonator' && o.charge > 1.2);
    if (reso) tgt = { x: reso.x, y: reso.y + 4, r: 3, reso: true };
    else for (const e of foes) { const d = HL.dist(p.x, p.y, e.x, e.y); if (d < bd) { bd = d; tgt = e; } }
    if (!tgt) { if (opt.goal) { const a = Math.atan2(opt.goal[1] - p.y, opt.goal[0] - p.x); inp.mx = Math.cos(a); inp.my = Math.sin(a); } return inp; }
    // danger?
    let flee = null;
    for (const e of foes) {
      const c = covers(e, p); if (c != null) { flee = c; break; }
      const d = HL.dist(p.x, p.y, e.x, e.y);
      if ((e.type === 'drifter' && e.state === 'tele' && e.t > 0.32 && d < 28) || (e.type === 'hound' && e.state === 'tele' && e.t > 0.2 && d < 50)) { flee = Math.atan2(p.y - e.y, p.x - e.x) + 1.3; break; }
      if (e.wave && Math.abs(d - e.wave.r) < 16 && e.wave.r < d) { flee = Math.atan2(e.y - p.y, e.x - p.x); break; }
    }
    const canRoll = p.state === 'move' || (p.state === 'attack' && p.atk && p.atk.phase === 'rec');
    if (flee != null && p.st > 18 && canRoll) { inp.dodge = true; inp.mx = Math.cos(flee); inp.my = Math.sin(flee); S.dodges = (S.dodges || 0) + 1; return inp; }
    if (p.hp < 45 && G.inv.poultice && p.state === 'move') {
      if (bd > 30 || !foes.length) { G.quick = 'poultice'; inp.item = true; return inp; }
      const near = foes.reduce((m, e) => (HL.dist(p.x, p.y, e.x, e.y) < HL.dist(p.x, p.y, m.x, m.y) ? e : m)), aw = Math.atan2(p.y - near.y, p.x - near.x);
      inp.mx = Math.cos(aw); inp.my = Math.sin(aw); if (p.st > 40 && bd < 16) inp.dodge = true; return inp;
    }
    const w = p.weaponDef(), d = HL.dist(p.x, p.y, tgt.x, tgt.y), a = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    if (p.ult >= 100 && d < 26 && !tgt.reso) { inp.ult = true; inp.mx = Math.cos(a); inp.my = Math.sin(a); return inp; }
    const want = tgt.hidden ? 0 : w.reach * 0.7 + (tgt.r || 3);
    if (d > want) { inp.mx = Math.cos(a); inp.my = Math.sin(a); return inp; }
    if (p.st < 14) { inp.mx = -Math.cos(a) * 0.6; inp.my = -Math.sin(a) * 0.6; return inp; } // back off to breathe
    if (tgt.type === 'guard' && tgt.state === 'tele') { inp.mx = -Math.cos(a); inp.my = -Math.sin(a); return inp; } // never trade with the slam
    if (tgt.type === 'guard' && tgt.state !== 'stagger' && p.st < 30) { inp.mx = -Math.cos(a); inp.my = -Math.sin(a); return inp; }
    if (p.state === 'move' || (p.state === 'attack' && p.atk && p.atk.phase === 'rec')) {
      inp.attack = true; inp.attackDown = true;
      if (tgt.type === 'guard' && tgt.state !== 'stagger') hold = 54; else pressed = true;
    }
    return inp;
  };
  S.step = (n, fn) => { for (let i = 0; i < n; i++) { if (G.state === 'dialog') G.advanceDialog(); if (G.state !== 'play') G.state = 'play'; G.update(1 / 60, fn ? fn() : blank()); } };
  S.fight = (maxT, opt = {}) => {
    let t = 0;
    while (t < maxT) {
      if (G.state === 'dialog') G.advanceDialog();
      if (G.state !== 'play') G.state = 'play';
      if (G.player.state === 'dead') return { dead: true, t };
      G.update(1 / 60, S.bot(opt)); t += 1 / 60;
      if (opt.until ? opt.until() : !G.enemies.some((e) => !e.dead && (!opt.near || HL.dist(e.x, e.y, G.player.x, G.player.y) < opt.near))) return { ok: true, t };
    }
    return { ok: false, t };
  };
  // like a player: if you fall, get up and go again (deaths are counted and reported)
  S.fightRetry = (maxT, opt = {}, onDeath) => {
    let deaths = 0;
    for (let k = 0; k < 5; k++) {
      const r = S.fight(maxT, opt);
      if (!r.dead) return Object.assign(r, { deaths });
      deaths++;
      if (onDeath) onDeath(); else { const pl = G.player; pl.hp = pl.maxhp; pl.st = pl.maxst; pl.state = 'move'; pl.inv = 1; G.inv.poultice = (G.inv.poultice || 0) + 2; }
    }
    return { ok: false, deaths };
  };
  S.frames = (n) => { for (let i = 0; i < n; i++) G.frame(1 / 60); };
  S.tp = (x, y) => { G.player.x = x; G.player.y = y; G.player.vx = G.player.vy = 0; G.snapCam(); };
  S.use = (id, from) => {
    const o = G.world.obj(id); if (!o) return 'no object ' + id;
    for (const [dx, dy] of from || [[0, 6], [0, 8], [0, -6], [7, 0], [-7, 0], [0, 11], [5, 5], [-5, 5], [0, -10]]) {
      if (!G.world.blocked(o.x + dx, o.y + dy, 3)) { S.tp(o.x + dx, o.y + dy); break; }
    }
    G.state = 'play'; G.player.state = 'move';
    const it = G.interactables();
    if (!it || it.o !== o) return 'prompt mismatch for ' + id + ' (got ' + (it && it.o.id) + ')';
    G.interact(it);
    while (G.state === 'dialog') G.advanceDialog();
    return null;
  };
  S.cleanFoes = () => { G.enemies = []; };
  // walkability search on the collision grid (radius 3 = the Wayfarer)
  S.reach = (x0, y0, x1, y1) => {
    const w = G.world, cw = w.cw, ch = w.chh, seen = new Uint8Array(cw * ch);
    const ok = (i, j) => !w.blocked(i * 4 + 2, j * 4 + 2, 3);
    const si = Math.floor(x0 / 4), sj = Math.floor(y0 / 4), ti = Math.floor(x1 / 4), tj = Math.floor(y1 / 4);
    const q = [si + sj * cw]; seen[q[0]] = 1;
    while (q.length) {
      const k = q.shift(), i = k % cw, j = (k / cw) | 0;
      if (Math.abs(i - ti) <= 2 && Math.abs(j - tj) <= 2) return true;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + a, nj = j + b; if (ni < 0 || nj < 0 || ni >= cw || nj >= ch) continue; const nk = ni + nj * cw; if (!seen[nk] && ok(ni, nj)) { seen[nk] = 1; q.push(nk); } }
    }
    return false;
  };
  S.near = (id) => { const o = G.world.obj(id); for (const [dx, dy] of [[0, 7], [0, 10], [0, -7], [8, 0], [-8, 0], [0, 13]]) if (!G.world.blocked(o.x + dx, o.y + dy, 3)) return [o.x + dx, o.y + dy]; return [o.x, o.y]; };
  S.T = T;
};

(async () => {
  const srv = await start(path.resolve(__dirname, '..'));
  const url = `http://localhost:${srv.address().port}/index.html`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.stack || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url); await page.waitForTimeout(1500);
  await page.evaluate(SIM);
  let fails = 0;
  const check = (name, cond, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // ---- 1. Ashwick
  const r1 = await ev(() => {
    const G = HL.G, S = SIM, T = S.T, out = {};
    G.newGame(); S.cleanFoes();
    out.noWeapon = !G.eq.weapon;
    const sw = G.world.obj('p_sword'); S.tp(sw.x, sw.y + 1); S.step(5);
    out.sword = G.eq.weapon === 'rusted_sword';
    out.cart = S.use('c_cart'); out.ledger = G.journal.includes('cart_ledger'); out.poultice = G.inv.poultice;
    const start = G.world.def.start;
    out.reachSmithy = S.reach(start.x, start.y, ...S.near('c_smithy'));
    out.reachWell = S.reach(start.x, start.y, ...S.near('well'));
    out.storeLockedReach = S.reach(start.x, start.y, ...S.near('c_store'));
    out.wellNoCrank = S.use('well'); out.noKeyYet = !G.inv.storehouse_key;
    out.smithy = S.use('c_smithy'); out.crank = !!G.inv.winch_crank;
    out.well = S.use('well'); out.key = !!G.inv.storehouse_key && G.flags.well_done;
    out.storeDoor = S.use('d_store'); out.storeOpen = G.flags['d:d_store'];
    out.storeReach = S.reach(start.x, start.y, ...S.near('c_store'));
    out.store = S.use('c_store'); out.spear = !!G.inv.ashwood_spear;
    out.again = (() => { const n = G.inv.ashwood_spear; S.use('c_store'); return G.inv.ashwood_spear === n; })();
    out.chapelInside = S.reach(T(36), T(30), T(38), T(37));
    out.reachTower = S.reach(start.x, start.y, ...S.near('x_tower'));
    out.reachStones = S.reach(start.x, start.y, ...S.near('stone1'));
    out.gladeBlocked = !S.reach(T(120), T(30), ...S.near('c_glade'));
    out.reachCamp = S.reach(start.x, start.y, ...S.near('c_traveller'));
    for (const id of ['c_houseA', 'c_shelfB', 'c_crateB', 'c_corpseC', 'c_brlA', 'c_smithCrate', 'c_storeBrl', 'c_storeCrate', 'c_hollow', 'c_campCrate'])
      if (!S.reach(start.x, start.y, ...S.near(id))) out['unreachable_' + id] = true;
    return out;
  });
  check('start without a weapon', r1.noWeapon);
  check('pick up the Rusted Sword (auto-equips)', r1.sword);
  check('search the cart: 2 poultices + ledger note', !r1.cart && r1.ledger && r1.poultice === 2, r1.cart || '');
  check('smithy, well, storehouse door reachable from the start', r1.reachSmithy && r1.reachWell);
  check('storehouse chest unreachable while locked', !r1.storeLockedReach);
  check('well without the crank gives nothing', !r1.wellNoCrank && r1.noKeyYet);
  check('smithy chest -> Winch Crank', !r1.smithy && r1.crank, r1.smithy || '');
  check('crank on the well -> Storehouse Key', !r1.well && r1.key, r1.well || '');
  check('unlock the storehouse', !r1.storeDoor && r1.storeOpen && r1.storeReach, r1.storeDoor || '');
  check('storehouse chest -> Ashwood Spear, no duplicate on re-search', !r1.store && r1.spear && r1.again);
  check('chapel interior sealed from the square', !r1.chapelInside);
  check('tower, stones and camp reachable through the forest', r1.reachTower && r1.reachStones && r1.reachCamp);
  check('glade sealed by roots before the puzzle', r1.gladeBlocked);
  const unr = Object.keys(r1).filter((k) => k.startsWith('unreachable_'));
  check('every village/forest container reachable', !unr.length, unr.join(', '));

  // ---- 2. combat balance: each foe alone, each weapon, bot plays
  const bal = await ev(() => {
    const G = HL.G, S = SIM, T = S.T, res = {};
    for (const wpn of ['rusted_sword', 'ashwood_spear']) for (const foe of ['drifter', 'hound', 'archer', 'guard', 'lurker']) {
      let wins = 0, time = 0, hpLost = 0, n = 6;
      for (let k = 0; k < n; k++) {
        G.loadMap('ashwick', T(40), T(56)); S.cleanFoes(); G.eq.weapon = wpn; G.eq.armor = 'tattered_cloak';
        const p = G.player; p.hp = 100; p.st = 100; p.state = 'move'; p.inv = 0; G.inv.poultice = 0;
        const e = G.spawnEnemy({ foe, x: T(40) + (foe === 'lurker' ? 30 : 45), y: T(56) - 8 });
        e.state = foe === 'lurker' ? 'hidden' : 'chase'; e.aggro = true;
        const r = S.fight(90);
        if (r.ok) { wins++; time += r.t; }
        hpLost += 100 - Math.max(0, p.hp);
      }
      res[wpn + ':' + foe] = { win: wins / n, t: wins ? +(time / wins).toFixed(1) : null, hpLost: Math.round(hpLost / n) };
    }
    return res;
  });
  console.log('combat (bot, 1v1, no healing):');
  for (const [k, v] of Object.entries(bal)) console.log('   ', k.padEnd(24), 'win', (v.win * 100).toFixed(0) + '%', ' time', v.t + 's', ' hp lost', v.hpLost);
  check('every foe is beatable 1v1 by the bot with both weapons', Object.values(bal).every((v) => v.win >= 0.5));

  // ---- 3. forest: stones, glade, the guard, the key
  const r3 = await ev(() => {
    const G = HL.G, S = SIM, T = S.T, out = {};
    G.loadMap('ashwick', T(120), T(31)); S.cleanFoes(); G.eq.weapon = 'ashwood_spear';
    const p = G.player; p.hp = 100;
    for (let i = 0; i < 3; i++) { const o = G.world.obj('stone' + i); let guard = 0; while (o.face !== i && guard++ < 5) { const m = S.use('stone' + i); if (m) out.err = m; } }
    out.stones = !!G.flags.stones_done; out.journalStones = G.journal.includes('stones_hint');
    out.gladeOpen = S.reach(T(120), T(30), ...S.near('c_glade'));
    out.glade = S.use('c_glade'); out.coat = !!G.inv.gravecloth_coat;
    G.eq.armor = 'gravecloth_coat';
    // the camp: guard + drifters, fought for real
    G.loadMap('ashwick', T(134), T(58)); G.enemies = G.enemies.filter((e) => HL.dist(e.x, e.y, T(141), T(63)) < 70);
    G.player.hp = 100; G.inv.poultice = 3;
    const f = S.fightRetry(150);
    out.campFight = f; out.hpAfterCamp = Math.round(G.player.hp);
    out.guardDead = !!G.flags['k:guard_camp'];
    const plate = G.world.obj('p_plate'); if (plate) { S.tp(plate.x, plate.y); S.step(30); }
    out.plate = !!G.inv.rustbound_plate;
    out.trav = S.use('c_traveller'); out.gateKey = !!G.inv.gate_key;
    out.tower1 = S.use('x_tower'); out.towerUnlocked = !!G.flags['d:d_tower'];
    out.tower2 = S.use('x_tower'); S.frames(50);
    out.map = G.world.id;
    return out;
  });
  check('ring of stones: eye, bell, moon opens the roots', r3.stones && r3.gladeOpen && r3.journalStones, r3.err || '');
  check('glade chest -> Gravecloth Coat', !r3.glade && r3.coat);
  check('bot clears the armoured guard camp', r3.campFight.ok && r3.guardDead, JSON.stringify(r3.campFight) + ' hp ' + r3.hpAfterCamp);
  check('guard drops Rustbound Plate', r3.plate);
  check('traveller corpse -> Gate Key', !r3.trav && r3.gateKey);
  check('gate key opens the tower, entering goes underground', r3.towerUnlocked && r3.map === 'crypt1', r3.tower1 || r3.tower2 || '');

  // ---- 4. the underchapel
  const r4 = await ev(() => {
    const G = HL.G, S = SIM, T = S.T, out = {};
    const p = G.player; p.hp = 100; G.inv.poultice = 4; G.eq.weapon = 'rusted_sword';
    out.fire = S.use('fire_crypt'); out.fireSet = G.fire.map === 'crypt1'; G.state = 'play';
    out.crankLocked = !S.reach(T(23), T(41), T(23), T(16));
    out.vaultLocked = !S.reach(T(41), T(27), T(41), T(16));
    // clear the hall and ossuary by fighting
    S.tp(T(23), T(30)); out.hall = S.fightRetry(120, { near: 70 });
    S.tp(T(9), T(28)); out.ossuary = S.fightRetry(120, { near: 60 });
    out.oss = S.use('c_ossuary'); out.cryptKey = !!G.inv.crypt_key;
    out.iron = S.use('d_iron'); out.crankOpen = S.reach(T(23), T(41), T(23), T(16));
    S.tp(T(41), T(28)); out.reso = S.fightRetry(120, { near: 60 });
    out.wrong = (S.use('bell0'), S.use('bell1'), S.use('bell2'), !G.flags.bells_done);
    S.use('bell1'); S.use('bell2'); S.use('bell0');
    out.bells = !!G.flags.bells_done; out.vaultOpen = S.reach(T(41), T(27), T(41), T(16));
    const sh = G.world.obj('p_shard'); S.tp(sh.x, sh.y); S.step(30); while (G.state === 'dialog') G.advanceDialog();
    out.shard = G.eq.relic === 'bell_shard';
    out.vault = S.use('c_vault'); out.truth = G.journal.includes('bell_truth');
    G.player.hp = 100; G.inv.poultice = 4;
    out.crank = S.use('crank'); out.ironShut = !G.world.obj('d_iron').open;
    out.waves = S.fightRetry(300, { until: () => G.flags.waves_done, goal: [T(23), T(13)] }, () => {
      const pl = G.player; pl.hp = pl.maxhp; pl.st = pl.maxst; pl.state = 'move'; G.inv.poultice = 4;
      G.loadMap(G.fire.map, G.fire.x, G.fire.y); out.waveReset = !G.waves && !G.flags.waves_done; S.use('crank');
    });
    out.wavesDone = !!G.flags.waves_done; out.hpAfterWaves = Math.round(G.player.hp); out.ultUsed = G.player.ult;
    out.stairsOpen = S.reach(T(23), T(16), ...S.near('x_down1'));
    out.down = S.use('x_down1'); S.frames(50); out.map = G.world.id;
    return out;
  });
  check('crypt fire becomes the respawn point', !r4.fire && r4.fireSet);
  check('crank hall locked behind the iron door; vault sealed', r4.crankLocked && r4.vaultLocked);
  check('bot clears hall, ossuary and resonance chamber', r4.hall.ok && r4.ossuary.ok && r4.reso.ok, JSON.stringify([r4.hall, r4.ossuary, r4.reso]));
  check('ossuary chest -> Crypt Key; iron door opens', !r4.oss && r4.cryptKey && !r4.iron && r4.crankOpen);
  check('bells: a wrong order fails, low-high-middle opens the vault', r4.wrong && r4.bells && r4.vaultOpen);
  check('Bell Shard equips as relic (ultimate unlocked)', r4.shard);
  check('vault chest + warden\'s page', !r4.vault && r4.truth);
  check('crank starts the waves and shuts the iron door', !r4.crank && r4.ironShut);
  check('bot survives 3 waves; gate opens to the stairs', r4.wavesDone && r4.stairsOpen, JSON.stringify(r4.waves) + ' hp ' + r4.hpAfterWaves);
  check('stairs lead to the Keeper\'s hall', r4.map === 'crypt2');

  // ---- 5. the Bellworn Keeper
  const r5 = await ev(() => {
    const G = HL.G, S = SIM, T = S.T, out = { tries: [] };
    out.exitLocked = !S.reach(T(19), T(31), T(19), T(2));
    for (let k = 0; k < 4 && !G.flags.boss_dead; k++) {
      G.player.hp = 100; G.player.st = 100; G.player.state = 'move'; G.inv.poultice = 3; G.player.ult = 0;
      if (k) G.loadMap('crypt2', T(19), T(31));
      S.tp(T(19) + 4, T(22));
      S.step(2);
      out.awake = G.bossAwake; out.portShut = !G.world.obj('d_port').open;
      const f = S.fight(240, { until: () => G.flags.boss_dead || G.player.state === 'dead' });
      const boss = G.enemies.find((e) => e.type === 'keeper');
      out.tries.push({ t: +f.t.toFixed(1), dead: G.player.state === 'dead', bossHp: boss ? Math.round(boss.hp) : 0, hp: Math.round(G.player.hp) });
    }
    out.bossDead = !!G.flags.boss_dead;
    S.step(30); for (const id of ['p_bellkey', 'p_breaker']) { const o = G.world.obj(id); if (o) { S.tp(o.x, o.y); S.step(30); } }
    while (G.state === 'dialog') G.advanceDialog();
    out.key = !!G.inv.bell_key; out.breaker = !!G.inv.bellbreaker;
    out.portOpen = G.world.obj('d_port').open;
    out.door = S.use('d_bell'); out.exitOpen = S.reach(T(19), T(20), T(19), T(3));
    out.up = S.use('x_chapelUp'); S.frames(50); out.map = G.world.id;
    out.chapelOutside = (S.use('d_chapel', [[0, 6]]), !G.flags.chapel_open);
    out.chapel = S.use('d_chapel', [[0, -8]]); out.chapelOpen = !!G.flags.chapel_open;
    out.shortcut = S.reach(T(37), T(31), T(40), T(52));
    out.maren = S.use('maren'); S.frames(5);
    out.end = G.state === 'end' && G.flags.maren_end;
    G.state = 'play';
    out.saved = G.save();
    out.snapshot = { inv: JSON.stringify(G.inv), journal: G.journal.length };
    return out;
  });
  check('Keeper\'s exit sealed before the fight', r5.exitLocked);
  check('entering the hall wakes the Keeper and shuts the bars', r5.awake && r5.portShut);
  check('bot defeats the Bellworn Keeper', r5.bossDead, JSON.stringify(r5.tries));
  check('Keeper drops Bell Key + Bellbreaker; bars reopen', r5.key && r5.breaker && r5.portOpen);
  check('Bell Key opens the way up', !r5.door && r5.exitOpen);
  check('climb into the chapel; lift the bar: shortcut to the square', r5.map === 'ashwick' && r5.chapelOutside && r5.chapelOpen && r5.shortcut, r5.chapel || '');
  check('Maren\'s last words end the slice', !r5.maren && r5.end);

  // ---- 6. reload the page and continue
  await page.reload(); await page.waitForTimeout(1500); await page.evaluate(SIM);
  const r6 = await ev((snap) => {
    const G = HL.G, S = SIM, out = {};
    out.hasSave = !!G.saved;
    G.continueGame();
    out.map = G.world.id; out.inv = JSON.stringify(G.inv) === snap.inv; out.journal = G.journal.length === snap.journal;
    out.flags = G.flags.boss_dead && G.flags.chapel_open && G.flags.waves_done && G.flags.stones_done;
    out.storeLooted = G.world.obj('c_store').opened; out.swordGone = G.world.obj('p_sword').taken;
    out.chapelDoor = G.world.obj('d_chapel').open; out.well = G.world.obj('well').sprite === HL.ART.spr.wellBucket;
    out.guardGone = !G.enemies.some((e) => e.id === 'guard_camp');
    G.loadMap('crypt2', S.T(19), S.T(31)); out.keeperGone = !G.enemies.some((e) => e.type === 'keeper');
    // death costs nothing
    G.loadMap('ashwick', S.T(40), S.T(56)); S.cleanFoes();
    const before = JSON.stringify(G.inv); G.player.hp = 5; G.player.inv = 0;
    const e = G.spawnEnemy({ foe: 'drifter', x: G.player.x + 12, y: G.player.y }); e.state = 'chase';
    S.step(240); out.died = G.player.state === 'dead';
    G.respawn(); S.frames(60);
    out.respawned = G.player.state === 'move' && G.player.hp === G.player.maxhp && JSON.stringify(G.inv) === before;
    return out;
  }, r5.snapshot);
  check('save survives a page reload', r6.hasSave && r6.map === 'ashwick' && r6.inv && r6.journal && r6.flags);
  check('opened chests, taken items, doors, well stay as left', r6.storeLooted && r6.swordGone && r6.chapelDoor && r6.well);
  check('unique foes stay dead (guard, Keeper)', r6.guardGone && r6.keeperGone);
  check('death: respawn at the fire with nothing lost', r6.died && r6.respawned);

  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.slice(0, 10).join('\n') : 'no page errors');
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close(); srv.close();
  process.exit(fails || errors.length ? 1 : 0);
})();
