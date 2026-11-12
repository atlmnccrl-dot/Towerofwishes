// Bannerborn — boot, loop, input, camp and title scenes, battles from deploy to rewards, saving.
(function () {
  const BB = window.BB, UI = BB.UI, $ = UI.$;
  const KEY = 'bannerborn.save.v2';
  const cv = $('game'), ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  let scene = null;        // a Battle (peaceful for title and camp)
  let mode = 'boot';       // boot | title | camp | battle
  const now = () => Date.now();

  // ---------------------------------------------------------------- save
  BB.persist = function () { const j = JSON.stringify(BB.save); try { localStorage.setItem(KEY, j); } catch (e) { /* storage blocked */ } if (BB.nativeMirror) BB.nativeMirror(j); };
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === BB.SAVE_V && s.heroes && s.heroes.length) {
        const d = BB.newSave();
        const out = Object.assign(d, s);
        out.settings = Object.assign(BB.newSave().settings, s.settings || {});
        out.stats = Object.assign({ kills: 0, gates: 0 }, s.stats || {});
        out.rank = s.rank || 0;
        out.formation = s.formation && s.formation.front && s.formation.back ? s.formation : d.formation;
        out.place = s.place || {}; BB.fixFormation(out);
        for (const h of out.heroes) if (h.captain && h.look && h.look.head === 'hair' && h.look.chest === 'chestA' && h.look.chestTint === 'natural') h.look = Object.assign({}, BB.CAPTAIN_LOOK); // a Captain from before the opening's knight: the same armour now
        // drop formation ids of heroes that no longer exist
        for (const row of ['front', 'back']) out.formation[row] = out.formation[row].map((id) => (id && out.heroes.some((h) => h.id === id) ? id : null));
        BB.fixFormation(out);
        if (!BB.teamIds(out).length) BB.placeHero(out, out.heroes[0].id);
        return out;
      }
    } catch (e) { /* none */ }
    return null;
  }

  // ---------------------------------------------------------------- canvas
  // How sharp the battlefield is drawn. 'sharp' is the screen's own pixels (two per point at most); 'fast' is one per
  // point; 'auto' starts sharp and steps down, for good, whenever a fight cannot hold its frame rate: on a phone the
  // number of pixels painted is what a big fight costs.
  let rScale = 1, autoScale = 0;
  const GFX_KEY = 'bannerborn.gfx.scale';
  function gfxMode() { return (BB.save && BB.save.settings && BB.save.settings.gfx) || 'auto'; }
  function applyGfx() {
    const m = gfxMode();
    if (m === 'sharp') rScale = 1; else if (m === 'fast') rScale = 0.5;
    else { let v = autoScale; if (!v) { try { v = +localStorage.getItem(GFX_KEY) || 1; } catch (e) { v = 1; } } autoScale = rScale = Math.max(0.5, Math.min(1, v)); } // what this device settled on, remembered
    BB.lowFx = m === 'fast' ? 2 : rScale <= 0.62 ? 2 : rScale <= 0.82 ? 1 : 0;
    resize();
  }
  BB.applyGfx = applyGfx;
  function resize() {
    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1) * rScale);
    W = Math.round(window.innerWidth * DPR); H = Math.round(window.innerHeight * DPR);
    cv.width = W; cv.height = H;
  }
  window.addEventListener('resize', resize); resize();
  function camZoom() {
    const cssW = W / DPR, cssH = H / DPR;
    const z = Math.min(cssW / (10.5 * BB.TW), cssH / (8.5 * BB.TH));
    return Math.max(0.8, Math.min(2.6, z * (mode === 'battle' ? 1 : 0.92)));
  }

  // ---------------------------------------------------------------- art for heroes and foes
  BB.heroArt = (h) => h.legend ? BB.LEGENDS[h.legend].art : h.recruit ? 'h/' + h.recruit : null;
  BB.loadHeroes = (list) => Promise.all(list.map((h) => BB.heroArt(h)).filter(Boolean).map((k) => BB.loadChar(k).catch(() => null)));
  function pickLoad(keys, n, r) { const out = []; const pool = keys.slice(); while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); return Promise.all(out.map((k) => BB.loadChar(k).catch(() => null))); }

  // ---------------------------------------------------------------- the camp and the title scene
  function campHeroes() {
    const S = BB.save, lead = UI.leader();
    const team = BB.teamHeroes(S).filter((h) => h !== lead);
    const others = S.heroes.filter((h) => h !== lead && !team.includes(h));
    return team.concat(others).slice(0, 7);
  }
  function titleHeroes() {
    const r = BB.rng(7), out = [BB.newCaptain()];
    const pool = BB.ROSTER.filter((c) => c.role === 'hero');
    for (const a of ['knight', 'mage', 'monk', 'spearman', 'rogue', 'ranger', 'barbarian']) {
      const opts = pool.filter((c) => c.arch === a);
      if (opts.length) { const e = r.pick(opts); out.push(BB.newHero({ calling: e.calling, recruit: e.key, name: e.name, elem: e.elem, arch: e.arch })); }
    }
    return out.slice(0, 8);
  }
  async function buildCampScene(isTitle) {
    const S = BB.save;
    const m = BB.buildMap(isTitle ? 'title' : 'camp', 'vale', isTitle ? 11 : 23, { night: true });
    const c = m.w / 2;
    m.add('Misc B8_S', c, c, { biome: 'vale', r: 0.45 });
    m.anim('fire', c + 0.03, c + 0.03, { sc: 0.75, fps: 14 });
    m.lights.push({ x: c, y: c, rad: 5.5, col: '255,160,70' });
    m.bannerProp = { x: c - 1.6, y: c - 1.9, banner: S ? S.banner : { color: '#b3242c', sigil: 'crown', trim: '#e8c66a' } };
    // the camp grows with the campaign: more tents, a forge, a shrine, a market
    const cleared = S ? Object.keys(S.cleared).length : 30;
    const tents = ['Misc B46_S', 'Misc B12_S', 'Misc B19_S', 'Misc B43_S'];
    const spots = [[c - 3.5, c - 3], [c + 1.5, c - 4], [c - 4.5, c + 0.5], [c + 4, c - 1.5]];
    for (let i = 0; i < 1 + Math.min(3, Math.floor(cleared / 4)); i++) m.add(tents[i], spots[i][0], spots[i][1], { biome: 'vale' });
    if (cleared >= 2) { m.add('Misc C2_S', c + 3.3, c + 2, { biome: 'vale', r: 0.3 }); m.anim('fire2', c + 4.2, c + 1.5, { sc: 0.5 }); m.lights.push({ x: c + 4.2, y: c + 1.5, rad: 2.5, col: '255,120,40' }); m.add('Misc B3_S', c + 4.6, c + 2.8, { biome: 'vale' }); }
    if (cleared >= 5) { m.add('Misc B15_S', c - 3.5, c + 3.6, { biome: 'vale', r: 0.25 }); m.add('Misc B57_S', c - 2.4, c + 4.4, { biome: 'vale', r: 0.25 }); }
    if (cleared >= 8) m.add('Misc C5_S', c + 0.5, c + 4.6, { biome: 'vale', r: 0.4 });
    if (cleared >= 12) { m.add('Misc B17_S', c + 4.5, c - 4.4, { biome: 'vale' }); m.add('Misc B6_S', c + 5.4, c - 2.6, { biome: 'vale' }); }
    if (cleared >= 16) { m.add('Misc B14_S', c - 0.5, c - 5.6, { biome: 'vale' }); m.add('Misc B45_S', c + 0.8, c - 5.2, { biome: 'vale', r: 0.2 }); }
    if (cleared >= 22) { m.add('Misc B55_S', c - 5.6, c - 4.6, { biome: 'vale' }); m.add('Stone A6_S', c + 2.4, c + 5, { biome: 'vale', r: 0.8 }); }
    m.add('Torch2', c - 2.5, c + 2.2, { biome: 'vale' }); m.anim('torch', c - 2.48, c + 2.22, { sc: 0.7, pole: 1 }); m.lights.push({ x: c - 2.5, y: c + 2.2, rad: 2.5, col: '255,170,80' });
    for (const p of m.props) { const s = BB.iso(p.x, p.y); p.depth = p.x + p.y; p.sx = s.x; p.sy = s.y; }
    m.props.sort((a, b) => a.depth - b.depth);
    rebuildGrid(m);
    BB.renderGround(m);
    const heroes = isTitle ? titleHeroes() : campHeroes();
    await BB.loadHeroes(heroes);
    const npcKeys = BB.npcKeys();
    if (!isTitle && cleared >= 3) await pickLoad(npcKeys, 3, BB.rng(now() & 0xffff));
    const sc = new BB.Battle({ map: m, heroes: [], peaceful: true, save: S, seed: 3 });
    const loadedNpc = npcKeys.filter((k) => BB.A.chars[k]);
    sc.npcs = (isTitle || cleared < 3 ? [] : [[c + 4, c + 3.4], [c - 4.6, c - 1], [c + 2, c - 5]]).slice(0, loadedNpc.length)
      .map(([x, y], i) => ({ x, y, home: { x, y }, art: loadedNpc[i], clip: 'Idle', dir: 2, ct: 0, walker: true, wait: 1 + i }));
    // heroes sit around the fire; on the camp screen the leader stands in front, so the ring opens wider
    const ring = isTitle ? [[-1.4, 1.1], [1.3, 1.2], [-1.8, -0.4], [1.9, -0.2], [0, 1.9], [-0.4, -1.8], [2.2, 1.9], [-2.4, 1.8]]
      : [[-2.6, 0.6], [2.4, 0.9], [-2.2, -1.6], [2.6, -1.0], [-3.2, 2.4], [3.4, 2.2], [0.4, -2.6]];
    heroes.forEach((h, i) => {
      const e = sc.spawnHero(h, BB.heroStats(h), c + ring[i][0], c + ring[i][1]);
      e.home = { x: e.x, y: e.y }; e.lookAt = { x: c, y: c };
      sc.face(e, c, c);
    });
    sc.cam = { x: c + 0.6, y: c + 0.4, zoom: 1 };
    sc.isTitle = isTitle;
    return sc;
  }
  BB.rebuildGrid = (m) => rebuildGrid(m);
  function rebuildGrid(m) {
    m.grid = []; for (let i = 0; i < m.w * m.h; i++) m.grid.push([]);
    for (const p of m.props) {
      p.solid = p.r > 0.05; if (!p.solid) continue;
      const rr = Math.ceil(p.r + 0.5);
      for (let y = Math.floor(p.y) - rr; y <= Math.floor(p.y) + rr; y++) for (let x = Math.floor(p.x) - rr; x <= Math.floor(p.x) + rr; x++)
        if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.grid[y * m.w + x].push(p);
    }
    BB.buildBlock(m);
  }

  // the banner on its pole, drawn in the world after the battlefield
  const origRender = BB.Battle.prototype.render;
  BB.Battle.prototype.render = function (c2, w, h, dpr) {
    origRender.call(this, c2, w, h, dpr);
    const bp = this.map.bannerProp;
    if (bp && this.view) {
      const v = this.view; c2.setTransform(v.z, 0, 0, v.z, v.ox, v.oy);
      if (!bp.cv) { bp.cv = document.createElement('canvas'); bp.cv.width = 100; bp.cv.height = 140; }
      UI.drawBanner(bp.cv.getContext('2d'), bp.banner, 100, 140, this.time);
      const s = BB.iso(bp.x, bp.y);
      c2.drawImage(bp.cv, s.x - 8, s.y - 68, 50, 70);
      c2.setTransform(1, 0, 0, 1, 0, 0);
    }
  };

  // ---------------------------------------------------------------- flows
  // The title is a battle that never ends: a full warband (your own strongest five, once you have a save) holding a
  // ring of ruins at night while the Gravegates keep rising. It is the real engine, so everything in it is alive:
  // ultimates, signatures, gates breaking and coming back. Nothing is won and nobody falls for good.
  async function buildTitleFight() {
    const mine = BB.save ? BB.save.heroes.slice().sort((a, b) => BB.power(b) - BB.power(a)).slice(0, 5) : [];
    const hold = (sc) => { // the fight is held where it looks best: early waves, a fixed level, never a pile of foes
      const o = sc.obj; if (o && o.endlessWave > 2) o.endlessWave = 2; sc.level = sc.titleLevel || sc.level;
      let n = 0; for (const e of sc.ents) if (e.side === 'foe' && !e.dead && !e.gate && ++n > 12) e.hp = Math.min(e.hp, e.maxhp * 0.12);
      for (const e of sc.heroList) if (e.dead && sc.reviveHero) sc.reviveHero(e);
    };
    const sc = await BB.stageScene({ idx: 23, over: 4, night: true, warm: 6, tick: ['ults', 'sigs', 'sturdy', hold],
      archs: ['knight', 'barbarian', 'mage', 'ranger', 'paladin'], ench: ['holy', 'fire', 'storm', 'frost', 'shadow'],
      mission: (st) => Object.assign({}, BB.ENDLESS, { level: st.level }),
      heroes: (S) => mine.length >= 3 ? mine.map((h, i) => { const c = JSON.parse(JSON.stringify(h)), like = S.heroes[i % S.heroes.length]; c.stars = 5; c.level = like.level; return c; }) : null });
    sc.titleFight = true; sc.titleLevel = sc.level; sc.titleT = 0; sc.noBars = true; sc.silent = true;
    return sc;
  }
  async function goTitle() {
    mode = 'title';
    const S = BB.save;
    $('bPlay').textContent = S ? 'Continue' : 'Raise the Banner';
    $('bTitleSet').style.display = S ? '' : 'none'; // settings (and a new game) need a save to belong to
    if (S) { const st = BB.MISSIONS[BB.nextStageIdx(S)]; $('tCont').innerHTML = (BB.campaignDone(S) ? '<b>Campaign won</b>' : 'Stage <b>' + st.code + '</b> · ' + UI.esc(st.name)) + ' · <b>' + S.heroes.length + '</b> hero' + (S.heroes.length === 1 ? '' : 'es'); }
    else $('tCont').textContent = 'A new banner, a first captain, a road to the Gravegates';
    const em = $('tEmbers');
    if (!em.children.length) for (let i = 0; i < 16; i++) { const e = document.createElement('i'); e.style.left = (4 + Math.random() * 92) + '%'; e.style.setProperty('--dx', Math.round(Math.random() * 120 - 60) + 'px'); e.style.animationDuration = (6 + Math.random() * 7).toFixed(1) + 's'; e.style.animationDelay = (-Math.random() * 12).toFixed(1) + 's'; if (i % 3 === 0) { e.style.width = e.style.height = '2px'; } em.appendChild(e); }
    { const v = document.querySelector('#title .ver'); if (v && BB.CONFIG) v.textContent = 'v' + BB.CONFIG.version; }
    const lg = $('tLogo'); if (!lg.children.length) lg.innerHTML = [...'BANNERBORN'].map((ch, i) => '<span style="--i:' + i + '">' + ch + '</span>').join('');
    const tb = $('tBanner'); tb.innerHTML = ''; tb.appendChild(UI.bannerCanvas(S ? S.banner : { color: '#b3242c', sigil: 'crown', trim: '#e8c66a' }, 92, 130));
    try { scene = await buildTitleFight(); } catch (e) { scene = await buildCampScene(true); }
    UI.show('title');
    BB.music('battle');
  }
  let guideDue = false;
  // ---- menus that are places. The shop is the quartermaster's stall at night; the heroes' page is the muster, every
  // hero you have standing in ranks under the banner. Both are small scenes in the battle engine, alive behind the page.
  let shopScene = null, musterScene = null, musterKey = '';
  const dress = (m) => { for (const p of m.props) { const q = BB.iso(p.x, p.y); p.depth = p.x + p.y; p.sx = q.x; p.sy = q.y; } m.props.sort((a, b) => a.depth - b.depth); rebuildGrid(m); BB.renderGround(m); };
  const lamp = (m, x, y) => { m.add('Torch2', x, y, { biome: 'vale' }); m.anim('torch', x + 0.02, y + 0.02, { sc: 0.7, pole: 1 }); m.lights.push({ x, y, rad: 2.6, col: '255,170,80' }); };
  // the market: an open square at night, a trader at each station under their own light. Places are given as (a, b):
  // a tile-widths to the right of the middle, b tile-heights down the screen.
  const MARKET_AT = { smith: [-3.5, -1.0], quarter: [-1.1, -2.2], gems: [1.7, -2.0], seer: [3.9, -0.6], treasury: [-1.9, 1.5] };
  async function buildMarket(S0) {
    const S = S0 || BB.save, m = BB.buildMap('camp', 'vale', 61, { night: true }), c = m.w / 2;
    const P = (a, b) => ({ x: c + a + b, y: c - a + b }), AB = (x, y) => [(x - y) / 2, (x + y) / 2 - c];
    m.props = m.props.filter((p) => { const q = AB(p.x, p.y); return Math.abs(q[0]) > 7.4 || Math.abs(q[1]) > 5.2; }); m.anims = []; m.lights = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const q = AB(x + 0.5, y + 0.5); m.set(x, y, (q[0] / 6.6) ** 2 + (q[1] / 4.5) ** 2 < 1 + Math.sin(x * 1.7 + y * 2.3) * 0.12 ? 2 : m.at(x, y) === 2 ? 0 : m.at(x, y)); }
    const put = (n, a, b, r) => { const q = P(a, b), name = /^(Torch|Stone|Tree)/.test(n) ? n : 'Misc ' + n + '_S'; if (BB.envHas('vale', name)) m.add(name, q.x, q.y, { biome: 'vale', r: r == null ? 0.25 : r }); };
    const glow = (a, b, rad, col) => { const q = P(a, b); m.lights.push({ x: q.x, y: q.y, rad, col }); };
    const torch = (a, b) => { const q = P(a, b); lamp(m, q.x, q.y); };
    // the smith: the stall of blades, the anvil, the forge, shields on their stands
    put('B18', -4.3, -2.3); put('C2', -2.6, -0.7); put('C8', -4.7, -0.5); put('B16', -2.5, -2.0); put('B30', -5.4, -1.5); put('B32', -5.7, -0.3); put('B3', -5.2, -2.9); put('C4', -3.6, 0.2, 0.1);
    { const q = P(-4.7, -0.45); m.anim('fire', q.x, q.y, { sc: 0.5, fps: 14, lift: 20 }); } glow(-4.2, -0.8, 3.6, '255,120,40');
    // the quartermaster: the red tent, the banner, crates and barrels of the company's stores
    put('B46', -1.3, -3.9); put('B45', -2.5, -3.0, 0.1); put('B3', 0.1, -3.4); put('B2', -0.2, -2.6); put('A3', -2.2, -2.2); put('A4', 0.6, -2.9); put('B1', -0.6, -1.9, 0.1);
    { const q = P(-0.2, -1.5); m.bannerProp = { x: q.x, y: q.y, banner: S.banner }; } glow(-1.1, -2.4, 3.4, '255,190,110'); torch(-2.0, -1.6);
    // the gem-trader: the blue stall, a handcart, jars
    put('B14', 2.0, -3.2); put('B11', 3.2, -2.5); put('A2', 0.9, -2.3); put('A6', 2.9, -1.6, 0.1); put('A8', 1.0, -1.7, 0.1); put('B28', 2.6, -3.6);
    glow(1.8, -2.2, 3.4, '110,190,255'); torch(0.9, -3.0);
    // the seer: the violet canopy, the standing ring, the table of glass
    put('B12', 4.4, -1.8); put('C14', 5.4, -0.2); put('B61', 3.2, -0.1, 0.1); put('C13', 5.0, -2.2); put('C12', 5.7, 0.7, 0.1);
    { const q = P(5.4, -0.15); m.anim('portal', q.x, q.y, { sc: 0.5, fps: 12, lift: 6, add: true }); } glow(4.4, -0.6, 3.8, '180,110,255');
    // the square itself: the well, stalls of the townsfolk, hay and baskets, a signpost on the way in
    put('B42', 0.6, 1.2, 0.5); put('B19', -4.4, 2.7); put('B10', 4.6, 2.9); put('E2', -5.6, 1.4); put('E1', -2.6, 3.3, 0.1); put('B20', -3.2, 2.2, 0.1); put('B52', 1.9, 3.3, 0.1); put('A9', 5.4, 1.9, 0.1); put('B27', 3.2, 2.2, 0.1); put('B55', -6.6, -2.6);
    // the treasurer: the stall of fine goods, a strongbox, a lamp of his own (only where something is for sale)
    const paid = BB.marketStations().some((x) => x.paid);
    if (paid) { put('B17', -2.6, 0.5); put('B1', -3.1, 1.6, 0.1); glow(-2.0, 1.4, 3.0, '255,225,150'); m.chests = [{ x: P(-1.2, 1.1).x, y: P(-1.2, 1.1).y, gold: true }]; }
    glow(0.4, 1.4, 4.2, '255,180,100'); torch(-1.2, 3.6); torch(2.4, 1.2); torch(-5.0, 0.9); torch(5.6, 3.3); torch(-3.2, -3.4); torch(3.6, -3.6);
    dress(m);
    const keys = BB.npcKeys(); await pickLoad(keys, 8, BB.rng(5));
    const leader = S.heroes.find((h) => h.id === S.leader) || S.heroes[0]; await BB.loadHeroes([leader]);
    const sc = new BB.Battle({ map: m, heroes: [], peaceful: true, save: S, seed: 4 });
    const have = keys.filter((k) => BB.A.chars[k]);
    const M = sc.market = { c, P, at: {}, focus: null, cur: { x: P(0, -1).x, y: P(0, -1).y, k: 1, ox: 0 }, mid: P(0, -1), last: 0 };
    sc.npcs = [];
    Object.keys(MARKET_AT).filter((id) => id !== 'treasury' || paid).forEach((id, i) => { const q = P(MARKET_AT[id][0], MARKET_AT[id][1]); M.at[id] = q; if (have[i]) sc.npcs.push({ x: q.x, y: q.y, home: q, art: have[i], clip: 'Idle', dir: BB.dirFromVec(1, 1), ct: i * 0.4, walker: false, wait: 0, trader: id }); });
    [[2.6, 1.6], [3.4, 3.0], [0.6, 3.6]].forEach((ab, i) => { const q = P(ab[0], ab[1]); if (have[5 + i]) sc.npcs.push({ x: q.x, y: q.y, home: q, art: have[4 + i], clip: 'Idle', dir: 2, ct: 0, walker: true, wait: 1 + i * 2 }); });
    // your own hero walks the square, and goes up to whoever you choose to talk to
    { const q = P(0.2, 2.5), e = sc.spawnHero(leader, BB.heroStats(leader), q.x, q.y); e.home = q; e.idleT = 1e9; M.hero = e; M.rest = q; }
    sc.fixCam = { x: M.mid.x, y: M.mid.y }; sc.zoomK = sc.zoomTarget = 1;
    return sc;
  }
  // which trader the market looks at (null: the whole square); your hero walks over
  BB.marketFocus = function (id) {
    const sc = shopScene; if (!sc || !sc.market) return; const M = sc.market, e = M.hero;
    M.focus = id && M.at[id] ? id : null;
    const to = M.focus ? { x: M.at[id].x + 0.25, y: M.at[id].y + 1.05 } : M.rest;
    if (e) { e.route = [to]; e.routeSp = 3.2; }
    for (const n of sc.npcs) if (n.trader) { n.clip = n.trader === M.focus && BB.hasClip(n.art, 'Taunt') ? 'Taunt' : 'Idle'; n.ct = 0; }
  };
  BB.marketAt = function (cx, cy) { // which trader stands under a point of the screen (canvas pixels)
    const sc = shopScene; if (!sc || scene !== sc || !sc.view) return null;
    const v = sc.view; let best = null, bd = 64 * v.z / (sc.cam.zoom || 1) * (sc.zoomK || 1);
    for (const id in sc.market.at) { const q = sc.market.at[id], p = BB.iso(q.x, q.y), sx = p.x * v.z + v.ox, sy = p.y * v.z + v.oy - 26 * v.z, d = Math.hypot(sx - cx, (sy - cy) * 0.8); if (d < bd) { bd = d; best = id; } }
    return best;
  };
  function marketFrame(sc) { // each frame: the camera glides to the trader in focus, and the name plates follow their traders
    const M = sc.market, small = innerHeight < 520, f = M.focus && M.at[M.focus], now = performance.now(), dt = Math.min(0.1, (now - (M.last || now)) / 1000); M.last = now;
    const tk = f ? 1.5 : small ? 0.9 : 1, k = Math.min(1, dt * 4.5), C = M.cur, up = small && !f ? 0.9 : 0; // a phone is short: the square sits lower, under the top bar
    const tx = f ? f.x - 0.1 : M.mid.x - up, ty = f ? f.y - 0.1 : M.mid.y - up, tox = f ? -0.22 : 0;
    C.x += (tx - C.x) * k; C.y += (ty - C.y) * k; C.k += (tk - C.k) * k; C.ox += (tox - C.ox) * k;
    sc.fixCam.x = C.x; sc.fixCam.y = C.y; sc.zoomK = sc.zoomTarget = C.k; sc.cam.zoom = camZoom() * C.k;
    sc.viewOff = { x: W * C.ox, y: 0 };
    const e = M.hero; if (e) { e.idleT = 1e9; if (!(e.route && e.route.length) && f) sc.face(e, f.x, f.y); }
    if (UI.marketPlates) UI.marketPlates((id) => { const q = M.at[id], p = BB.iso(q.x, q.y), z = sc.cam.zoom * DPR, cs = BB.iso(sc.cam.x, sc.cam.y); return { x: (W / 2 + (p.x - cs.x) * z + sc.viewOff.x) / DPR, y: (H / 2 + (p.y - cs.y) * z - 20 * z + sc.viewOff.y - 52 * z) / DPR }; }, M.focus);
  }
  const musterKeyOf = () => BB.save.heroes.map((h) => h.id + ':' + BB.layerSig(h)).join(',') + '|' + BB.save.banner.color;
  async function buildMuster(S0) {
    const S = S0 || BB.save, m = BB.buildMap('camp', 'vale', 53, { night: true }), c = m.w / 2;
    m.anims = []; m.lights = [];
    const list = S.heroes.slice().sort((a, b) => BB.power(b) - BB.power(a)), cols = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(list.length * 1.7)))), rows = Math.ceil(list.length / cols), q = Math.SQRT1_2;
    const GX = 1.2 * q, GY = 1.25 * q, back = c + 0.6 - (rows - 1) * GY, wing = (cols / 2 + 0.5) * GX;
    m.props = m.props.filter((p) => Math.hypot(p.x - c, p.y - c) > 4.5 + Math.max(rows * 1.3, cols * 0.9));
    m.bannerProp = { x: back - 1.5, y: back - 1.5, banner: S.banner };
    for (const [x, y] of [[c + 1.2 + wing, c + 1.2 - wing], [c + 1.2 - wing, c + 1.2 + wing], [back - 0.9 + wing, back - 0.9 - wing], [back - 0.9 - wing, back - 0.9 + wing]]) lamp(m, x, y);
    m.lights.push({ x: (c + 0.6 + back) / 2, y: (c + 0.6 + back) / 2, rad: 4 + rows + cols * 0.4, col: '255,190,110' });
    dress(m);
    await BB.loadHeroes(S.heroes);
    const sc = new BB.Battle({ map: m, heroes: [], peaceful: true, save: S, seed: 6 });
    // ranks across the screen, the strongest in front; one step ahead of them all, the place of the hero chosen
    sc.muster = { byId: {}, front: { x: c + 2.2, y: c + 2.2 }, sel: null, cols, rows };
    list.forEach((h, i) => {
      const row = Math.floor(i / cols), n = Math.min(cols, list.length - row * cols), col = (i % cols) - (n - 1) / 2;
      const x = c + 0.6 + col * GX - row * GY, y = c + 0.6 - col * GX - row * GY;
      const e = sc.spawnHero(h, BB.heroStats(h), x, y); e.rank = { x, y }; e.home = { x, y }; e.idleT = 1e9; sc.face(e, x + 1, y + 1);
      sc.muster.byId[h.id] = e;
    });
    const mid = (back - 3.6 + c + 2.55) / 2; sc.fixCam = { x: mid, y: mid }; sc.muster.mid = mid; // half way from the banner's top to the feet of the hero called forward sc.zoomK = sc.zoomTarget = 1.3;
    return sc;
  }
  function menuScene(sc) { // each frame: where the place sits on the screen, and how large
    if (sc.market) { marketFrame(sc); return; }
    const M = sc.muster, close = UI.current === 'hero', st = document.getElementById(close ? 'hxStage' : 'hsStage'), rc = st && st.getBoundingClientRect(); if (!M || !rc || !rc.width) return;
    const small = innerHeight < 520, z1 = camZoom(), T = {};
    if (close) { // the hero's own page: the camera closes in on whoever stands in front, their feet two thirds of the way down
      const tall = Math.min(rc.height * (small ? 0.5 : 0.42), rc.width * 0.52); T.k = tall / (46 * z1); // a hero is about 46 world pixels from boots to crest
      T.x = M.front.x; T.y = M.front.y; T.vx = (rc.left + rc.width / 2) * DPR - W / 2; T.vy = (rc.top + rc.height * (small ? 0.7 : 0.66) + 20 * z1 * T.k) * DPR - H / 2;
    } else { // the ranks are (cols) wide and (rows) deep; above them the banner, below them the place of the hero called forward
      const needW = ((M.cols + 1) * 0.85 + 0.4) * BB.TW, needH = (M.rows - 1) * 0.884 * BB.TH + 166, top = small ? 4 : rc.top, roomH = rc.bottom - top - (small ? 96 : 132);
      T.k = Math.max(0.5, Math.min(1.6, rc.width / (needW * z1), roomH / (needH * z1)));
      T.x = M.mid; T.y = M.mid; T.vx = (rc.left + rc.width / 2) * DPR - W / 2; T.vy = (top + roomH * 0.5 + 20 * z1 * T.k) * DPR - H / 2;
    }
    const now = performance.now(), dt = Math.min(0.1, (now - (M.last || now)) / 1000), C = M.cur || (M.cur = Object.assign({}, T)), a = M.snap ? 1 : Math.min(1, dt * 5); M.last = now; M.snap = false;
    for (const q in T) C[q] += (T[q] - C[q]) * a;
    sc.fixCam.x = C.x; sc.fixCam.y = C.y; sc.zoomK = sc.zoomTarget = C.k; sc.cam.zoom = z1 * C.k; sc.viewOff = { x: C.vx, y: C.vy };
    M.pace = close ? 7 : 3;
    for (const L of sc.map.lights) if (L.spot) L.rad = close ? 1.7 : 2.6;
    sc.closeK = (sc.closeK || 0) + ((close ? 1 : 0) - (sc.closeK || 0)) * a; sc.spotEnt = M.byId[M.sel] || null;
    for (const id in M.byId) { const e = M.byId[id]; e.idleT = 1e9; if (!(e.route && e.route.length)) { const at = id === M.sel ? M.front : e.rank; if (Math.hypot(e.x - at.x, e.y - at.y) > 0.5) { e.route = [{ x: at.x, y: at.y }]; e.routeSp = M.pace; } else if (e.state !== 'attack') e.dir = BB.dirFromVec(1, 1); } }
  }
  // the hero chosen on the page steps out of the ranks into the light; the one before goes back
  BB.musterSelect = function (id) {
    const sc = musterScene; if (!sc || !sc.muster) return;
    const M = sc.muster, was = M.sel && M.byId[M.sel], e = M.byId[id];
    if (was && was !== e) { was.route = [{ x: was.rank.x, y: was.rank.y }]; was.routeSp = M.pace || 3; }
    if (e) { e.route = [{ x: M.front.x, y: M.front.y }]; e.routeSp = M.pace || 3; M.sel = id; const R = BB.UI.rgba[e.hero.rarity || 0].replace('rgba(', '').replace(',A)', ''); sc.map.lights = sc.map.lights.filter((L) => !L.spot); sc.map.lights.push({ x: M.front.x, y: M.front.y, rad: 2.6, col: R, spot: true }); }
  };
  BB.musterShow = function (kind, hue) {
    const sc = musterScene; if (!sc || scene !== sc) return; const M = sc.muster, e = M.byId[M.sel]; if (!e || (e.route && e.route.length)) return;
    const key = sc.artKey(e), pick = (list) => list.find((c) => BB.hasClip(key, c));
    const clip = kind === 'ult' ? pick(['Special1', 'Attack3', 'Taunt', 'Attack1']) : kind === 'sig' ? pick(['Taunt', 'Attack2', 'Attack1']) : kind === 'cheer' || kind === 'learn' ? pick(['Taunt', 'Special1', 'Attack1'])
      : kind === 'flourish' ? pick([['Attack1', 'Attack2', 'Taunt', 'Attack3'][Math.floor(Math.random() * 4)], 'Attack1']) : pick(['Attack1', 'Attack2', 'Taunt']);
    if (clip) { e.dir = BB.dirFromVec(1, 1); e.state = 'attack'; e.lock = sc.clipLen(e, clip) / 16; e.atkDur = e.lock; e.hitAt = 99; e.hitDone = true; sc.setClip(e, clip, true); }
    const fx = { ult: ['aoe', 1], sig: ['buff1', 0.8], cheer: ['levelup', 1], equip: ['buff9', 0.8], learn: ['buff3', 0.8] }[kind];
    if (fx && BB.fxLen(fx[0])) sc.addFx(fx[0], e.x, e.y, { sc: fx[1], add: true, hue });
    if (kind === 'ult') sc.shake = 0.5;
  };
  BB.musterAt = function (cx, cy) { // which hero stands under a point of the screen (canvas pixels)
    const sc = musterScene; if (!sc || scene !== sc || !sc.view) return null;
    const v = sc.view; let best = null, bd = 46 * DPR * (v.z / DPR);
    for (const id in sc.muster.byId) { const e = sc.muster.byId[id], p = BB.iso(e.x, e.y), sx = p.x * v.z + v.ox, sy = p.y * v.z + v.oy - 22 * v.z, d = Math.hypot(sx - cx, (sy - cy) * 0.7); if (d < bd) { bd = d; best = id; } }
    return best;
  };
  BB.sceneFor = async function (tab) {
    if (mode === 'battle' || !BB.save) return;
    try {
      if (tab === 'shop') { const k = (BB.save.leader || '') + '|' + BB.save.banner.color + '|' + BB.marketStations().length; if (!shopScene || shopScene.marketKey !== k) { shopScene = await buildMarket(); shopScene.marketKey = k; } if (UI.current === 'shop') { scene = shopScene; mode = 'camp'; BB.marketFocus(UI.marketSel ? UI.marketSel() : null); } }
      else if (tab === 'heroes' || tab === 'hero') {
        const k = musterKeyOf(); if (!musterScene || musterKey !== k) { musterScene = await buildMuster(); musterKey = k; }
        if (UI.current === tab) { if (scene !== musterScene) musterScene.muster.snap = true; scene = musterScene; mode = 'camp'; for (const id in musterScene.muster.byId) { const e = musterScene.muster.byId[id]; e.idleT = 1e9; } BB.musterSelect(UI.heroSel()); }
      }
    } catch (e) { /* the page still works over the camp */ }
  };
  let campBuilt = null; // the camp is rebuilt only when it changes (new heroes, new stages)
  let campScene = null, drillScene = null;
  BB.liveScene = () => scene;
  // the team screen opens onto the land the campaign is in, the formation's heroes living on it
  BB.openDrill = async function (idx) {
    const S = BB.save, M = BB.drillStage(S, idx);
    if (scene && scene.drill && scene.drill.stage.id === M.id) return;
    if (!(drillScene && drillScene.drill.stage.id === M.id)) {
      try { drillScene = await BB.buildDrillScene(S, idx); } catch (e) { return; }
      await BB.loadHeroes(BB.teamHeroes(S));
    }
    if (UI.current === 'team') { scene = drillScene; mode = 'camp'; }
  };
  function campKey() { const S = BB.save; return S.leader + '|' + campHeroes().map((h) => h.id).join(',') + '|' + Object.keys(S.cleared).length; }
  async function goCamp() {
    const wasDev = Bot.on ? false : devExit(); // leaving a Development battle: back to the real save, and to the list (the bot stays in its own)
    const S = BB.save;
    mode = 'camp';
    await BB.loadHeroes(S.heroes);
    if (campScene && campBuilt === campKey()) scene = campScene;
    else { scene = campScene = await buildCampScene(false); campBuilt = campKey(); }
    drawTopBanner();
    UI.renderHome();
    UI.show('home');
    BB.music('calm'); BB.ambience(null);
    BB.persist();
    if (wasDev) openTheater();
    if (guideDue) { guideDue = false; UI.modal('mGuide'); }
    if (!devReal) { const n = BB.writClaim(S, now()); if (n) { BB.persist(); UI.refreshTop(); UI.toast('The Quartermaster\'s Writ: +' + n + ' crystals · ' + BB.writLeft(S, now()) + ' days left'); } }
  }
  BB.goCamp = goCamp;
  function drawTopBanner() { const bc = $('tbBanner'); UI.drawBanner(bc.getContext('2d'), BB.save.banner, bc.width, bc.height, 0); }

  function newGame() {
    BB.save = BB.newSave(now());
    campBuilt = null; campScene = null; drillScene = null; shopScene = null; musterScene = null;
    BB.persist();
    BB.Cinema.play('intro', { music: 'boss' }, () => goCamp());
  }

  // ---------------------------------------------------------------- deploy and finish
  let current = null; // { stage, idx }
  BB.deploy = function (idx) {
    const S = BB.save;
    if (!BB.teamHeroes(S).length) { UI.toast('Place at least one hero in the formation.'); return; }
    if (!BB.stageUnlocked(S, idx)) { UI.toast('Clear the stage before it first.'); return; }
    const stage = BB.MISSIONS[idx];
    current = { stage, idx };
    // first time only: a chapter's opening fly-over, a boss's entrance
    const first = BB.MISSIONS.findIndex((m) => m.chapter === stage.chapter) === idx;
    const queue = [];
    if (first && stage.chapter > 1 && !S.seen['cine_ch' + stage.chapter]) { S.seen['cine_ch' + stage.chapter] = 1; queue.push(['chapter', { chapter: BB.CHAPTERS[stage.chapter - 1], music: 'calm' }]); }
    if (stage.boss && !S.seen['cine_' + stage.id]) { S.seen['cine_' + stage.id] = 1; queue.push(['boss', { stage }]); }
    BB.persist();
    const next = () => { const q = queue.shift(); if (q) BB.Cinema.play(q[0], q[1], next); else startBattle(); };
    next();
  };
  async function startBattle() {
    const S = BB.save, M = current.stage;
    applyGfx();
    const team = BB.teamHeroes(S);
    UI.show('boot'); $('bootmsg').textContent = 'Stage ' + M.code + ' · ' + M.name;
    document.querySelector('#boot .bar i').style.width = '100%';
    const held = UI.versus(M, team); // who marches against whom, for as long as the field takes to load (and a breath more)
    const region = BB.REGIONS.find((r) => r.id === M.region) || BB.REGIONS[0];
    const biome = region.biome;
    const arts = ['ghoul', 'warden', 'necro'];
    const pools = new Set();
    const addFoe = (k) => { const F = BB.FOES[k]; if (!F) return; if (F.art) arts.push(F.art); if (F.pool) pools.add(F.pool); if (F.poolPick) arts.push('h/' + F.poolPick); };
    M.waves.forEach((w) => { for (let i = 0; i < w.length; i += 2) addFoe(w[i]); });
    if (M.boss) addFoe(M.boss);
    if (M.boss && (BB.FOES[M.boss].moves || []).includes('summonw')) { pools.add('skel'); pools.add('wraith'); }
    const rr = BB.rng(now() & 0xffff);
    try {
      await Promise.all([BB.loadLand(region), BB.loadOther(), BB.loadHeroes(team)]
        .concat([...new Set(arts)].map((a) => BB.loadChar(a).catch(() => null)), [...pools].map((p) => pickLoad(BB.poolKeys(p), 4, rr))));
    } catch (e) { UI.versusOut(true); UI.toast('Could not load the battlefield.'); goCamp(); return; }
    UI.versusFoes(M); // their faces are loaded now
    await held;
    const seed = BB.hashStr(M.id) % 9000 + (S.cleared[M.id] ? Math.floor(Math.random() * 999) : 1);
    const map = BB.buildMap(M.layout, biome, seed, { night: !!region.night, floor: region.floor, skin: region.skin });
    BB.renderGround(map);
    scene = new BB.Battle({ map, mission: M, formation: BB.formationList(S), heroes: team, level: BB.foeLevel(M), save: S, seed, intro: true });
    scene.cam.zoom = 1;
    if (devReal && devOpts && devOpts.tick) { const ticks = devOpts.tick.map((k) => DEV_TICK[k]); scene.devTick = (sc, dt) => ticks.forEach((f) => f(sc, dt)); }
    if (devReal && devOpts && devOpts.bench) { const sc0 = scene; scene.benchAt = 9; const tk = scene.devTick; scene.devTick = (sc, dt) => { tk && tk(sc, dt); if (sc === sc0 && sc.benchAt && sc.time > sc.benchAt) { sc.benchAt = 0; benchStart(); } }; }
    campBuilt = null;
    mode = 'battle';
    buildHud();
    UI.show('hud');
    UI.versusOut();
    BB.music(M.type === 'boss' || M.type === 'duel' ? 'boss' : region.skin || 'battle'); BB.ambience(region.skin || null); // a far march has its own score, and its own air under it
    tutorial = M.tutorial && !S.seen.tutorial ? 0 : -1; tutT = 0;
  }

  function finishBattle() {
    if (current.trek) return finishTrek();
    if (current.stage.type === 'endless') return finishEndless();
    const S = BB.save, B = scene, M = current.stage, win = !!B.result.win;
    const first = win && !S.cleared[M.id];
    if (win && M.type === 'survive') { const sv = first ? 2 : 1; S.salvage = (S.salvage || 0) + sv; UI.toast('⛭ +' + sv + ' salvage for the camp'); }
    const heroes = B.heroList.map((e) => e.hero);
    let mvp = null; for (const e of B.heroList) if (!mvp || (e.dealt || 0) > (mvp.dealt || 0)) mvp = e;
    if (BB.Ads && !devReal) BB.Ads.battleDone();
    const res = BB.lastRes = { win, code: M.code, title: M.name, heroes, mvp: mvp && mvp.hero, kills: B.kills, gold: 0, crystals: 0, sigils: 0, items: [] };
    // experience: every hero who fought learns, by the share of the work they did (damage, healing, blows taken)
    const work = (e) => (e.dealt || 0) + (e.mended || 0) * 1.2 + (e.soaked || 0) * 0.6;
    const allWork = B.heroList.reduce((a, e) => a + work(e), 0) || 1;
    res.xp = B.heroList.map((e) => { const before = e.hero.level, got = BB.battleXp(M, win, work(e) / allWork * B.heroList.length / 2.5, e === mvp, e.hero.level); return { hero: e.hero, xp: got, levels: BB.gainXp(e.hero, got), from: before }; });
    // gold picked up on the field is kept even in defeat
    res.gold = Math.round(B.goldGot);
    if (B.loot && B.loot.length) res.items.push(...B.loot);
    if (win) {
      const rw = BB.stageRewards(M, first);
      res.gold += rw.gold; res.crystals = rw.crystals; res.sigils = rw.sigils;
      res.items.push(...BB.rollLoot(BB.rng(now() & 0xffffff), M.level, S.heroes, rw.items));
      let relic = null; if (first && BB.RELICS[M.boss]) { relic = BB.makeRelic(M.boss, M.level); res.items.push(relic); }
      const chBefore = BB.TIERS.filter((t) => BB.tierOpen(S, t)).length, slotsBefore = BB.teamMax(S);
      S.cleared[M.id] = (S.cleared[M.id] || 0) + 1;
      if (first && current.idx === 0 && !devReal) guideDue = true; // after the very first victory: how the rest works, once
      const notes = [];
      if (relic) notes.push('✦ A relic: ' + relic.name);
      if (BB.teamMax(S) > slotsBefore) notes.push('⚑ A new place in the team: ' + BB.teamMax(S) + ' heroes can march now.');
      if (first && M.legend) {
        const L = BB.joinLegend(S, M.legend);
        if (L) { res.legend = L; notes.push('★ ' + L.name + ' joins your banner!'); }
      }
      const opened = BB.TIERS.filter((t) => BB.tierOpen(S, t));
      if (opened.length > chBefore) notes.push('New recruits: the ' + opened[opened.length - 1].name + ' tier is open.');
      if (first && M.chapter < BB.CHAPTERS.length && BB.chapterCleared(S, M.chapter)) notes.push('Chapter ' + (M.chapter + 1) + ' · ' + BB.CHAPTERS[M.chapter].name + ' is open.');
      if (first && BB.campaignDone(S)) notes.push('The campaign is won. Every stage can be replayed for loot.');
      res.unlock = notes.join('<br>');
    }
    S.gold += res.gold; S.crystals += res.crystals; S.sigils += res.sigils;
    S.inventory.push(...res.items);
    S.stats.kills += B.kills;
    if (M.tutorial) S.seen.tutorial = 1;
    BB.persist();

    const after = (then) => {
      if (res.legend) BB.loadHeroes([res.legend]).then(() => UI.reveal(res.legend, then)); else then();
    };
    const actions = [];
    if (win) {
      const ni = current.idx + 1;
      if (ni < BB.MISSIONS.length) actions.push(['Next ▸ ' + BB.MISSIONS[ni].code, '', () => after(() => { UI.openTeam(ni); })]);
      actions.push(['Camp', 'dark', () => after(goCamp)]);
    } else {
      actions.push(['Retry', '', () => UI.openTeam(current.idx)]);
      actions.push(['Heroes', 'dark', () => { goCamp().then(() => UI.go('heroes')); }]);
    }
    if (Bot.on) actions.length = 0; // the bot presses nothing: it reads the result and walks on
    else if (devReal) { const o = devOpts; actions.length = 0; actions.push(['Development', '', () => after(goCamp)]); actions.push(['Watch again', 'dark', () => { devExit(); devBattle(o); }]); }
    if (win && M.boss && first) {
      const show = () => { BB.music(M.type === 'boss' ? 'calm' : 'battle'); UI.results(res, actions); BB.sfx('levelup'); };
      const coda = devReal && !Bot.on ? null : BB.campaignDone(S) ? 'ending' : M.boss === 'vesh' ? 'bridge' : null; // after the Cantor, the road on; after the last gate, the end
      BB.Cinema.play('bossDown', { stage: M, music: 'calm' }, () => (coda ? BB.Cinema.play(coda, { music: 'calm' }, show) : show()));
    }
    else { UI.results(res, actions); BB.sfx(win ? 'levelup' : 'click'); }
  }

  // ---- the Endless Gate: outside the campaign, at the level of the team that goes in. It ends when the banner falls;
  // what it pays is counted in waves held
  BB.deployEndless = function () {
    const S = BB.save, team = BB.teamHeroes(S);
    if (!team.length) { UI.toast('Place at least one hero in the formation.'); return; }
    const lv = Math.max(3, Math.round(team.reduce((a, h) => a + h.level, 0) / team.length));
    current = { stage: Object.assign({}, BB.ENDLESS, { level: lv }), idx: -1 };
    startBattle();
  };
  // ---- expeditions (js/modes.js): one great map, three gates, a choice at each, the land's lord at the way out
  BB.deployTrek = function () {
    const S = BB.save, team = BB.teamHeroes(S);
    if (!team.length) { UI.toast('Place at least one hero in the formation.'); return; }
    const ch = Math.max(1, BB.CHAPTERS.filter((c) => BB.chapterCleared(S, c.id)).length), lv = Math.max(2, Math.round(team.reduce((a, h) => a + h.level, 0) / team.length) - 1);
    current = { stage: BB.expedition(ch, lv, now() & 0xffffff), idx: -1, trek: true };
    startBattle();
  };
  function trekChoice() { // the battle stops; the player decides; it goes on
    const B = scene, c = B.choice; if (!c || c.shown) return; c.shown = true; B.paused = true;
    $('trekHead').textContent = c.title; $('trekSub').textContent = c.text;
    [$('trekL'), $('trekR')].forEach((b, k) => { b.querySelector('b').textContent = c.opts[k].label; b.querySelector('span').textContent = c.opts[k].hint; b.onclick = () => { UI.modal('mTrek', false); BB.sfx('click'); B.paused = false; B.trekChoose(k); }; });
    UI.modal('mTrek');
  }
  function finishTrek() {
    const S = BB.save, B = scene, M = current.stage, o = B.obj, win = !!B.result.win, gates = o.gatesOpen || 0, mult = BB.trekMult(o), heroes = B.heroList.map((e) => e.hero), first = win && !(S.stats.trekLands || {})[M.chapter];
    const work = (e) => (e.dealt || 0) + (e.mended || 0) * 1.2 + (e.soaked || 0) * 0.6, all = B.heroList.reduce((a, e) => a + work(e), 0) || 1;
    let mvp = null; for (const e of B.heroList) if (!mvp || work(e) > work(mvp)) mvp = e;
    const res = { win, head: win ? 'The way out' : gates ? gates + ' gate' + (gates > 1 ? 's' : '') + ' opened' : 'Turned back', code: '', title: 'Expedition · ' + BB.CHAPTERS[M.chapter - 1].name + (mult > 1 ? ' · spoils ×' + mult.toFixed(2).replace(/0$/, '') : ''), heroes, mvp: mvp && mvp.hero, kills: B.kills, gold: 0, crystals: 0, sigils: 0, items: [] };
    const part = win ? 1 : 0.2 + gates * 0.2; // a road half walked still teaches, and pays, half
    res.xp = B.heroList.map((e) => { const before = e.hero.level, got = Math.round(BB.battleXp(M, true, work(e) / all * B.heroList.length / 2.5, e === mvp, e.hero.level) * 3.2 * part); return { hero: e.hero, xp: got, levels: BB.gainXp(e.hero, got), from: before }; });
    res.gold = Math.round(((B.goldGot || 0) + (160 + M.level * 30) * part) * (win ? mult : 1));
    res.crystals = first ? 60 : win ? 10 : 0; res.sigils = win ? 1 : 0;
    if (B.loot && B.loot.length) res.items.push(...B.loot);
    const rolls = win ? 2 + (o.caches || 0) * 2 + (o.horn ? 1 : 0) + (o.greed || 0) : 0; if (rolls) res.items.push(...BB.rollLoot(BB.rng(now() & 0xffffff), M.level + 2, S.heroes, rolls)); // a vault is only yours if you walk out with it
    { const sv = win ? 4 + (o.caches || 0) * 2 + (o.greed || 0) + (o.horn ? 1 : 0) : gates; if (sv) { S.salvage = (S.salvage || 0) + sv; res.title += ' · ⛭ +' + sv + ' salvage'; } }
    if (win) { const got = BB.gainRelic(S, M.chapter); if (got) res.title += ' · relic: ' + got.name; }
    if (win) { S.stats.treks = (S.stats.treks || 0) + 1; S.stats.trekLands = S.stats.trekLands || {}; S.stats.trekLands[M.chapter] = 1; }
    S.gold += res.gold; S.crystals += res.crystals; S.sigils += res.sigils; S.inventory.push(...res.items); S.stats.kills += B.kills;
    BB.persist(); UI.modal('mTrek', false);
    UI.results(res, [['Again', '', () => { UI.modal('mResults', false); BB.deployTrek(); }], ['Camp', 'dark', () => goCamp()]]); BB.sfx(win ? 'levelup' : 'click');
  }
  function finishEndless() {
    const S = BB.save, B = scene, M = current.stage, waves = (B.obj && B.obj.endlessWave) || 0, best = S.stats.endless || 0;
    const heroes = B.heroList.map((e) => e.hero);
    let mvp = null; for (const e of B.heroList) if (!mvp || (e.dealt || 0) > (mvp.dealt || 0)) mvp = e;
    const res = { win: waves > 0, head: waves ? 'Wave ' + waves : 'Overrun', code: M.code, title: M.name + (waves > best ? ' · a new best' : best ? ' · best ' + best : ''), heroes, mvp: mvp && mvp.hero, kills: B.kills, gold: 0, crystals: 0, sigils: 0, items: [] };
    const work = (e) => (e.dealt || 0) + (e.mended || 0) * 1.2 + (e.soaked || 0) * 0.6, allWork = B.heroList.reduce((a, e) => a + work(e), 0) || 1;
    const lvl = Object.assign({}, M, { level: M.level + (waves >> 1) }); // the gate grew stronger as it went: so does what it teaches
    res.xp = B.heroList.map((e) => { const before = e.hero.level, got = Math.round(BB.battleXp(lvl, waves >= 3, work(e) / allWork * B.heroList.length / 2.5, e === mvp, e.hero.level) * (1 + Math.min(waves, 20) * 0.08)); return { hero: e.hero, xp: got, levels: BB.gainXp(e.hero, got), from: before }; });
    res.gold = Math.round(B.goldGot + waves * (30 + M.level * 6));
    res.sigils = Math.floor(waves / 5);
    res.crystals = waves > best ? (waves - best) * 5 : 0; // crystals only for ground never held before
    if (B.loot && B.loot.length) res.items.push(...B.loot);
    if (waves >= 4) res.items.push(...BB.rollLoot(BB.rng(now() & 0xffffff), M.level + (waves >> 1), S.heroes, Math.min(3, waves >> 2)));
    S.stats.endless = Math.max(best, waves);
    S.gold += res.gold; S.crystals += res.crystals; S.sigils += res.sigils; S.inventory.push(...res.items); S.stats.kills += B.kills;
    BB.persist();
    UI.results(res, [['Again', '', () => { UI.modal('mResults', false); BB.deployEndless(); }], ['Camp', 'dark', () => goCamp()]]); BB.sfx(waves ? 'levelup' : 'click');
  }
  // ---- a save as a code: copy it somewhere safe, paste it on another device
  BB.saveCode = () => 'BB1.' + btoa(unescape(encodeURIComponent(JSON.stringify(devReal || BB.save))));
  BB.readCode = function (code) {
    try { const m = String(code).trim().match(/^BB1\.([A-Za-z0-9+/=]+)$/); if (!m) return null; const s = JSON.parse(decodeURIComponent(escape(atob(m[1])))); return s && s.v === BB.SAVE_V && Array.isArray(s.heroes) && s.heroes.length ? s : null; } catch (e) { return null; }
  };
  BB.restoreCode = function (code) { const s = BB.readCode(code); if (!s) return false; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { return false; } return true; };

  // ---------------------------------------------------------------- the battle HUD: heroes fight on their own, you call the ultimates
  let tutorial = -1, tutT = 0;
  const TUT = [
    ['Your heroes fight on their own. When a card glows, tap it to unleash that hero\'s ultimate.', (b) => b.usedSkill],
    ['Heroes charge their ultimates by fighting and taking hits. AUTO casts them for you.', (b) => b.waveIdx >= 2 || b.time > 30],
  ];
  function buildHud() {
    const box = $('cards'); box.innerHTML = '';
    scene.heroList.forEach((e, i) => {
      const b = UI.el('button', 'ucard');
      b.style.setProperty('--rc', BB.HERO_RARITY[e.hero.rarity || 0].color);
      b.appendChild(UI.copyCanvas(BB.portrait(e.hero, 76)));
      b.appendChild(UI.el('div', 'cic', UI.callIcon(e.calling)));
      b.appendChild(UI.el('div', 'rdy', 'ULTIMATE'));
      b.appendChild(UI.el('div', 'hp', '<i></i>'));
      b.appendChild(UI.el('div', 'en', '<i></i>'));
      b.title = BB.CALLINGS[e.calling].skill.name + ' (' + (i + 1) + ')';
      b.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); ev.preventDefault(); BB.audioUnlock(); cast(i); });
      box.appendChild(b); e.chip = b; e.chipHp = b.querySelector('.hp i'); e.chipEn = b.querySelector('.en i');
    });
    $('bSpeed').textContent = (BB.save.settings.speed || 1) + '×';
    $('bAuto').classList.toggle('on', !!scene.autoSkills);
    $('cutin').classList.remove('on');
    $('hudStage').textContent = 'Stage ' + current.stage.code + ' · ' + current.stage.name;
    $('hudObj').textContent = '';
    $('bossbar').style.display = 'none';
    $('bnr').style.opacity = 0; $('bnr').dataset.t = '';
    letterbox(true, current.stage.name, 'Stage ' + current.stage.code);
  }
  function cast(i) {
    if (!scene || scene.peaceful) return;
    if (scene.castSkill(i)) scene.usedSkill = true;
    else { const c = scene.heroList[i] && scene.heroList[i].chip; if (c) { c.classList.add('nope'); setTimeout(() => c.classList.remove('nope'), 250); } }
  }
  function letterbox(on, title, sub) {
    $('hud').classList.toggle('cine', on);
    if (title !== undefined) { $('lbTitle').textContent = title || ''; $('lbSub').textContent = sub || ''; }
  }
  let cutShown = null;
  function updateHud(dt) {
    const B = scene;
    for (const e of B.heroList) {
      const c = e.chip; if (!c) continue;
      const ready = !e.dead && (e.energy || 0) >= 100;
      const st = (e.dead ? 1 : 0) + (ready && !B.result ? 2 : 0), hp = Math.round(Math.max(0, e.hp / e.maxhp * 100)), en = Math.round(Math.min(100, e.energy || 0));
      if (e.chipSt !== st) { e.chipSt = st; c.classList.toggle('dead', !!e.dead); c.classList.toggle('ready', ready && !B.result); }
      if (e.chipHpV !== hp) { e.chipHpV = hp; e.chipHp.style.width = hp + '%'; }
      if (e.chipEnV !== en) { e.chipEnV = en; e.chipEn.style.width = en + '%'; }
    }
    const ot = B.obj ? objText(B) : ''; if (B.hudObjT !== ot) { B.hudObjT = ot; $('hudObj').textContent = ot; }
    const boss = B.ents.find((e) => e.boss && !e.dead);
    const bb = $('bossbar');
    if (boss && !B.intro) { bb.style.display = 'block'; bb.querySelector('.nm').textContent = boss.F.name + (boss.brokenT > 0 ? ' — BROKEN' : boss.enraged ? ' — enraged' : ''); bb.querySelector('.b i').style.width = Math.max(0, boss.hp / boss.maxhp * 100) + '%'; bb.querySelector('.p i').style.width = (boss.brokenT > 0 ? 100 : Math.max(0, boss.poise / boss.maxPoise * 100)) + '%'; bb.classList.toggle('broken', boss.brokenT > 0); }
    else bb.style.display = 'none';
    // cinematic bars for the intro and the victory moment
    if (B.intro) letterbox(true);
    else if (B.result && B.result.win && !B.result.shown) letterbox(true, 'Victory', 'Stage ' + current.stage.code);
    else letterbox(false);
    // the ultimate cut-in
    const ci = B.cutins[B.cutins.length - 1];
    const cut = $('cutin');
    if (ci && ci.t < 1.1) {
      if (cutShown !== ci) {
        cutShown = ci;
        const ccv = cut.querySelector('canvas'), g = ccv.getContext('2d'); g.clearRect(0, 0, ccv.width, ccv.height); g.drawImage(BB.portrait(ci.hero, 96), 0, 0);
        cut.querySelector('.ciName').textContent = ci.hero.name; cut.querySelector('.ciSkill').textContent = ci.name;
        cut.style.setProperty('--hc', ci.color);
        cut.classList.remove('on'); void cut.offsetWidth; cut.classList.add('on');
      }
    } else if (cut.classList.contains('on') && (!ci || ci.t >= 1.1)) cut.classList.remove('on');
    if (B.cutins.length > 4) B.cutins.splice(0, B.cutins.length - 4);
    // banners
    const bn = $('bnr'); const top = B.banners[B.banners.length - 1];
    if (top && !B.intro && top.t < top.dur) {
      const k = top.t / top.dur; const a = Math.max(0, Math.min(1, top.t * 4, (1 - k) * 4));
      if (bn.dataset.t !== top.text) { bn.innerHTML = '<div class="' + top.kind + '">' + UI.esc(top.text) + '</div>'; bn.dataset.t = top.text; }
      bn.style.opacity = a; bn.firstChild.style.transform = 'scale(' + (1 + (1 - Math.min(1, top.t * 3)) * 0.3) + ')';
    } else { bn.style.opacity = 0; bn.dataset.t = ''; }
    // first-battle hints
    const tut = $('tut');
    if (tutorial >= 0 && tutorial < TUT.length && !B.intro && !B.result) {
      tutT += dt;
      tut.style.display = tutT > 1.2 ? 'block' : 'none'; tut.textContent = TUT[tutorial][0];
      if (TUT[tutorial][1](B) && tutT > 3) { tutorial++; tutT = 0; }
    } else tut.style.display = 'none';
  }
  const objText = (B) => B.obj.text.replace(' — ', ' · ');

  // ---------------------------------------------------------------- input
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    BB.audioUnlock();
    if (mode === 'battle' && scene && !scene.peaceful) {
      if (/^Digit[1-5]$/.test(e.code)) cast(+e.code.slice(5) - 1);
      if (e.code === 'KeyA') toggleAuto();
      if (e.code === 'KeyF') toggleSpeed();
      if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Space') { togglePause(); e.preventDefault(); }
    } else if (e.code === 'Escape') { if (goBack()) e.preventDefault(); }
  });
  function toggleSpeed() {
    const s = BB.save.settings; s.speed = ((s.speed || 1) % 3) + 1; BB.persist();
    $('bSpeed').textContent = s.speed + '×';
  }
  function toggleAuto() {
    const s = BB.save.settings; s.auto = !s.auto; BB.persist();
    if (scene && !scene.peaceful) scene.autoSkills = s.auto;
    $('bAuto').classList.toggle('on', s.auto);
    UI.toast(s.auto ? 'AUTO on: heroes cast ultimates as soon as they are ready' : 'AUTO off: tap a glowing card to cast');
  }
  function togglePause() {
    if (mode !== 'battle' || !scene || scene.result) return;
    scene.paused = !scene.paused; UI.modal('mPause', scene.paused);
  }
  // Stepping back (Android's back button; Escape outside a battle): close whatever is open on top, then go up one
  // level. Returns false only at the camp or the title, where there is nothing left to step back from.
  function goBack() {
    const on = (id) => { const e = $(id); return !!(e && e.classList.contains('on')); };
    if (document.getElementById('adCard')) return true;                                   // an ad has the screen
    if (Bot.on) { $('botStop').click(); return true; }
    if (BB.Trailer && BB.Trailer.on) { $('trailerSkip').click(); return true; }
    if (BB.Cinema && BB.Cinema.on) { if (!BB.Cinema.loading) $('cineSkip').click(); return true; }
    if (on('reveal')) { $('rvOk').click(); return true; }
    if (on('mConfirm')) { $('confNo').click(); return true; }
    for (const id of ['mPick', 'mSpoils', 'mRoll', 'mBackup', 'mGuide', 'mTheater', 'mSettings']) if (on(id)) { UI.modal(id, false); return true; }
    if (on('mResults')) return true;                                                      // a battle's results want an answer, not a way round
    if (mode === 'battle') { togglePause(); return true; }
    switch (UI.current) {
      case 'hero': case 'recruit': UI.go('heroes'); return true;
      case 'campaign': goCamp(); return true;
      case 'shop': if (UI.marketSel && UI.marketSel()) UI.marketOpen(null); else UI.go('home'); return true;
      case 'heroes': case 'team': UI.go('home'); return true;
    }
    return false;
  }
  BB.goBack = goBack;
  // pause when the page is hidden (a phone call, switching apps)
  document.addEventListener('visibilitychange', () => {
    if (BB.audioSleep) BB.audioSleep(document.hidden);
    if (document.hidden && mode === 'battle' && scene && !scene.result && !scene.paused) togglePause();
    if (!document.hidden && UI.current === 'home') UI.updateSpoils();
  });

  // ---------------------------------------------------------------- buttons
  UI.click($('bPlay'), () => { if (BB.save) goCamp(); else newGame(); });
  UI.click($('bTrailer'), () => playTrailer());
  UI.click($('bGuide'), () => { UI.modal('mSettings', false); UI.modal('mGuide'); });
  UI.click($('bGuideClose'), () => UI.modal('mGuide', false));
  // the muster roll: the week laid out, today's gift lit
  const rollText = (g) => (g.gold ? '● ' + g.gold : g.sigils ? '✧ ' + g.sigils : '◆ ' + g.crystals) + (g.chest ? '<i>+ a chest</i>' : '');
  function openRoll() {
    const S = BB.save, st = BB.rollState(S, now()), box = $('rollDays'); box.innerHTML = '';
    BB.ROLL.forEach((g, i) => { const d = document.createElement('div'); d.className = 'd' + (i < st.day ? ' done' : i === st.day ? ' now' : '') + (i === 6 ? ' last' : ''); d.innerHTML = '<small>Day ' + (i + 1) + '</small><b>' + rollText(g) + '</b>'; box.appendChild(d); });
    $('rollClaim').disabled = !st.ready; UI.modal('mRoll');
  }
  UI.click($('bRoll'), openRoll);
  UI.click($('rollClose'), () => UI.modal('mRoll', false));
  UI.click($('rollClaim'), () => {
    const S = BB.save, g = BB.rollClaim(S, now()); if (!g) return;
    BB.sfx('levelup'); BB.persist(); UI.refreshTop(); UI.renderHome(); UI.modal('mRoll', false);
    UI.toast('Muster roll, day ' + (g.day + 1) + ': ' + [g.gold && '+' + g.gold + ' gold', g.sigils && '+' + g.sigils + ' sigils', g.crystals && '+' + g.crystals + ' crystals', g.item && g.item.name].filter(Boolean).join(' · '));
  });
  UI.click($('bDiag'), async () => { UI.modal('mSettings', false); $('diagText').value = 'Measuring…'; UI.modal('mDiag'); $('diagText').value = await BB.diagReport(); });
  UI.click($('diagClose'), () => UI.modal('mDiag', false));
  UI.click($('diagCopy'), () => { const t = $('diagText'); t.select(); try { if (navigator.clipboard) navigator.clipboard.writeText(t.value); else document.execCommand('copy'); UI.toast('Copied.'); } catch (e) { UI.toast('Select the text and copy it by hand.'); } });
  UI.click($('bRestore'), async () => { const ok = await BB.IAP.restore(); UI.toast(ok ? 'Purchases checked: anything you own is yours again.' : 'The store could not be reached. Try again later.'); UI.refreshTop(); });
  UI.click($('bPrivacyAds'), async () => { if (!(await BB.Ads.privacy())) UI.toast('Ad choices are set in the app, where Google asks for them.'); });
  UI.click($('bPolicy'), () => { if (!BB.openLink(BB.CONFIG.links.privacy)) UI.toast('The privacy policy link is not set yet (js/config.js).'); });
  UI.click($('bTerms'), () => { if (!BB.openLink(BB.CONFIG.links.terms)) UI.toast('The terms link is not set yet (js/config.js).'); });
  if (BB.IAP) BB.IAP.onGrant = (out) => { // something bought has arrived
    const P = BB.product(out.id); BB.sfx('levelup'); UI.refreshTop(); if (UI.current === 'shop') UI.renderShop();
    UI.toast(P.name + ': ' + [out.crystals && '+' + UI.fmt(out.crystals) + ' crystals', out.gold && '+' + UI.fmt(out.gold) + ' gold', out.sigils && '+' + out.sigils + ' sigils', out.item && out.item.name, out.days && out.days + ' days', P.id === 'noads' && 'no more ads'].filter(Boolean).join(' · '));
  };
  UI.click($('tbCrysBtn'), () => { if (BB.marketStations().some((x) => x.paid) && !BB.dev) { UI.go('shop'); setTimeout(() => UI.marketOpen('treasury'), 60); } });
  UI.click($('bBackup'), () => { UI.modal('mSettings', false); $('bkCode').value = BB.saveCode(); $('bkMsg').textContent = 'This code is your whole save. Keep it somewhere safe, or paste it on another device.'; UI.modal('mBackup'); });
  UI.click($('bkCopy'), () => { const t = $('bkCode'); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* not allowed */ } if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(() => { $('bkMsg').textContent = 'Copied.'; }, () => { $('bkMsg').textContent = ok ? 'Copied.' : 'Select the code and copy it by hand.'; }); else $('bkMsg').textContent = ok ? 'Copied.' : 'Select the code and copy it by hand.'; });
  UI.click($('bkRestore'), () => { const code = $('bkCode').value; if (!BB.readCode(code)) { $('bkMsg').textContent = 'That is not a Bannerborn save code.'; return; } UI.confirm('Replace this device\'s save with the one in the code? What is here now will be lost.', () => { devExit(); if (BB.restoreCode(code)) location.reload(); else $('bkMsg').textContent = 'Could not store the save on this device.'; }); });
  UI.click($('bkClose'), () => UI.modal('mBackup', false));
  UI.click($('bContinue'), () => (BB.campaignDone(BB.save) ? UI.openCampaign() : UI.openTeam(BB.nextStageIdx(BB.save))));
  UI.click($('bCampBack'), () => goCamp());
  UI.click($('bWorks'), () => UI.openWorks());
  UI.click($('worksClose'), () => UI.modal('mWorks', false));
  UI.click($('bFormation'), () => UI.openTeam());
  UI.click($('bQuests'), () => UI.openQuests());
  UI.click($('bRecruit'), () => UI.openRecruit());
  UI.click($('bRecBack'), () => UI.go('heroes'));
  UI.click($('hrPrev'), () => UI.heroStep(-1));
  UI.click($('hrNext'), () => UI.heroStep(1));
  $('pathCv').addEventListener('pointerdown', (e) => UI.pathClick(e));
  $('boardCv').addEventListener('pointerdown', (e) => UI.boardClick(e));
  UI.click($('bSpoils'), () => {
    const S = BB.save, p = BB.idlePending(S, now());
    if (p.gold < 1 && p.sigils < 1) { UI.toast('The camp is still gathering. Come back a little later.'); return; }
    const take = (k) => { const got = BB.idleClaim(S, now()); if (BB.Notify) BB.Notify.sync(); if (k > 1) { S.gold += got.gold; S.sigils += got.sigils; } BB.sfx('coin'); BB.persist(); UI.refreshTop(); UI.updateSpoils(); UI.renderHome(); UI.modal('mSpoils', false);
      UI.toast('Spoils: +' + UI.fmt(got.gold * k) + ' gold' + (got.sigils ? ', +' + got.sigils * k + ' sigils' : '') + (k > 1 ? ' (doubled)' : '')); };
    // worth an ad only when there is something to double
    const can = BB.Ads && BB.Ads.offers() && !BB.dev && BB.adLeft(S, 'spoils', now()) > 0 && p.gold >= 100;
    if (!can) { take(1); return; }
    $('spText').innerHTML = '<b>+' + UI.fmt(p.gold) + '</b> gold' + (p.sigils ? ' · <b>+' + p.sigils + '</b> sigils' : '') + (BB.writActive(S, now()) ? '<br><small>The Quartermaster\'s Writ has already doubled it.</small>' : '');
    $('spDouble').innerHTML = (BB.hasNoAds(S) ? '' : '▶ ') + 'Double it <span class="cost">' + BB.adLeft(S, 'spoils', now()) + ' left today</span>';
    $('spTake').onclick = () => take(1);
    $('spDouble').onclick = async () => { if (await BB.Ads.rewarded('spoils') && BB.adUse(S, 'spoils', now())) take(2); };
    UI.modal('mSpoils');
  });
  UI.click($('bPause'), togglePause);
  UI.click($('bResume'), togglePause);
  UI.click($('bSpeed'), toggleSpeed);
  UI.click($('bAuto'), toggleAuto);
  UI.click($('bRetreat'), () => { UI.modal('mPause', false); scene.paused = false; scene.lose('Retreated'); });
  const openSettings = () => {
    const s = BB.save.settings;
    $('sMusic').value = s.music; $('sSfx').value = s.sfx; $('sShake').checked = s.shake !== false; $('sDmg').checked = !!s.numbers; $('sGfx').value = s.gfx || 'auto';
    $('sNotifyRow').style.display = BB.Notify && BB.Notify.available() ? '' : 'none'; $('sNotify').checked = !!s.notify;
    UI.modal('mSettings');
  };
  UI.click($('bSettings'), openSettings);
  UI.click($('bTitleSet'), () => { if (BB.save) openSettings(); });
  UI.click($('bSetClose'), () => {
    const s = BB.save.settings; s.music = +$('sMusic').value; s.sfx = +$('sSfx').value; s.shake = $('sShake').checked; s.numbers = $('sDmg').checked; s.gfx = $('sGfx').value;
    if (s.gfx !== 'auto') { autoScale = 0; try { localStorage.removeItem(GFX_KEY); } catch (e) { /* blocked */ } }
    BB.setVolumes(); BB.persist(); applyGfx(); UI.modal('mSettings', false);
    if (BB.Notify && BB.Notify.available()) { const want = $('sNotify').checked; (want && !s.notify ? BB.Notify.enable() : Promise.resolve(want)).then((ok) => { s.notify = !!(want && ok); BB.persist(); BB.Notify.sync(); if (want && !ok) UI.toast('The phone did not allow notifications. You can change that in its settings.'); }); }
  });
  ['sMusic', 'sSfx'].forEach((id) => $(id).addEventListener('input', () => { BB.save.settings.music = +$('sMusic').value; BB.save.settings.sfx = +$('sSfx').value; BB.setVolumes(); }));
  // ---- the theater: every cutscene, unlocked, for watching again
  // ---------------------------------------------------------------- Development (temporary, for building the game)
  // Everything worth reviewing without playing to it: every cutscene, every boss fight and late-game battle played
  // live by a full-strength team, the battle spectacle on demand (ultimates back to back, signatures, weapon traits),
  // every summoning, and each land's team field. Battles run in a sandbox: a throwaway save that is never stored.
  let devReal = null, devOpts = null;
  const realPersist = BB.persist;
  BB.persist = function () { if (!devReal) realPersist(); };
  function devSave(o) {
    const S = BB.newSave(now()), st = BB.MISSIONS[o.idx]; S.allSlots = true; // a showcase team is always five
    S.settings = Object.assign({}, devReal.settings, { auto: true, speed: 1 }); S.banner = devReal.banner; S.seen.tutorial = 1;
    BB.MISSIONS.slice(0, o.idx).forEach((m) => (S.cleared[m.id] = 1));
    BB.MISSIONS.forEach((m) => { if (!(o.cine && m === st)) S.seen['cine_' + m.id] = 1; }); BB.CHAPTERS.forEach((c) => (S.seen['cine_ch' + c.id] = 1));
    const all = [].concat(...BB.heroTiers(BB.ROSTER).map((t) => t.heroes));
    const used = new Set();
    for (const arch of o.archs || ['knight', 'barbarian', 'mage', 'ranger', 'paladin']) {
      const e = all.find((c) => c.arch === arch && !used.has(c.key)); if (!e) continue; used.add(e.key);
      S.heroes.push(BB.heroFromEntry(S, Object.assign({}, e, { rarity: 3 })));
    }
    const r = BB.rng(o.idx * 31 + 7), ench = o.ench || [];
    const gearLv = Math.round(1 + (1.6 * (1 + (st.level - 1) * 0.14) - 1) / 0.14); // gear a good way above the stage, as a late-game team's would be
    S.heroes.forEach((h, i) => {
      h.stars = 5; h.level = Math.min(BB.levelCap(h), st.level + (o.over === undefined ? 3 : o.over));
      for (const slot of BB.SLOTS) { const it = BB.makeItem(r, slot, gearLv, 3, slot === 'weapon' ? BB.weaponType(h.calling) : undefined); if (slot === 'weapon' && ench.length) it.ench = ench[i % ench.length]; h.gear[slot] = it; }
    });
    BB.autoFill(S);
    return S;
  }
  function devEnter(o) { if (!devReal) devReal = BB.save; devOpts = o; BB.save = devSave(o); BB.dev = true; campBuilt = null; drillScene = null; musterScene = null; document.body.classList.add('dev'); UI.refreshTop(); }
  function devExit() { if (!devReal) return false; BB.save = devReal; devReal = null; devOpts = null; BB.dev = false; campBuilt = null; drillScene = null; musterScene = null; document.body.classList.remove('dev'); UI.refreshTop(); return true; }
  // what keeps a showcase battle showing its subject
  const DEV_TICK = {
    ults: (sc, dt) => { sc.devT = (sc.devT || 1.5) - dt; if (sc.devT > 0 || (sc.ep && sc.ep.ult)) return; sc.devT = 3.4; const hs = sc.heroesAlive(); if (!hs.length) return; const h = hs[(sc.devN = (sc.devN || 0) + 1) % hs.length]; h.energy = 100; sc.useSkill(h, true); },
    sigs: (sc) => { for (const e of sc.heroList) if (!e.dead && e.sigCd > 1.6) e.sigCd = 1.6; },
    sturdy: (sc) => { for (const e of sc.heroList) if (!e.dead && e.hp < e.maxhp * 0.5) e.hp = e.maxhp * 0.5; },
  };
  function devBattle(o) { devEnter(o); BB.deploy(o.idx); }

  // ---------------------------------------------------------------- the bot
  // Plays the game by itself, in a throwaway save, through the same screens a player uses: the camp (spoils, goals),
  // the shop, the recruiting gates, heroes (gear, stars, skills), the team field, the campaign, the fight on AUTO.
  // After two defeats at a stage it trains once on the stage before and tries again; after nine it stops and says so.
  // Everything it does is written to a log (Development shows it after), which doubles as a balance report.
  const Bot = BB.Bot = { on: false, stop: false, log: [], fails: {}, trained: {}, pace: 1 };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const botWait = async (fn, ms, hard) => { const t = now(); while (!fn()) { if ((Bot.stop && !hard) || now() - t > (ms || 900000)) return false; await sleep(120); } return true; };
  const P = (ms) => Math.round(ms * Bot.pace);
  const say = (t) => { $('botSay').textContent = t; };
  const note = (t) => { Bot.log.push(t); if (Bot.log.length > 500) Bot.log.shift(); };
  const botReveal = (h) => new Promise((res) => { const R = $('reveal'); UI.reveal(h, res); (async () => { await botWait(() => R.classList.contains('done') || !R.classList.contains('on'), 20000, true); await sleep(P(2200)); if (R.classList.contains('on')) $('rvOk').click(); })(); });
  async function botManage() {
    const S = BB.save;
    say('At the camp: spoils and goals');
    if (BB.idlePending(S, now()).gold >= 1) BB.idleClaim(S, now());
    for (const q of BB.QUESTS) if (BB.questState(S, q) === 'ready') { BB.claimQuest(S, q.id); note('  goal: ' + q.name); }
    UI.refreshTop(); UI.renderHome(); await sleep(P(1500)); if (Bot.stop) return;
    // the shop: the gift, sigils, a chest, the purse; a weapon when nobody is left to recruit; then the war chest
    UI.go('shop'); say('At the market'); await sleep(P(1100)); UI.marketOpen('smith'); await sleep(P(1100));
    const open = () => BB.heroTiers(BB.ROSTER).filter(({ tier, heroes }) => BB.tierOpen(S, tier) && heroes.some((e) => !S.heroes.some((h) => h.recruit === e.key)));
    const want = { free: () => true, sigils: () => S.gold >= 500, chest: () => S.gold >= 700, crystals: () => S.gold >= 1400, arms: () => S.crystals >= 160 && !open().length };
    for (const o of BB.SHOP) while (BB.shopLeft(S, o, now()) > 0 && want[o.id] && want[o.id]() && BB.buy(S, o.id, now())) note('  shop: ' + o.name);
    while ((S.rank || 0) < BB.RANK_MAX && S.gold >= BB.rankCost(S.rank || 0) + 600 && BB.raiseRank(S)) note('  war chest: rank ' + S.rank);
    UI.marketOpen('quarter'); UI.refreshTop(); await sleep(P(1300)); UI.marketOpen(null); if (Bot.stop) return;
    // the gates: the rarest that can be paid for
    for (let n = 0; n < 6 && !Bot.stop; n++) {
      const can = open().filter(({ tier }) => S.crystals >= tier.cost); if (!can.length) break;
      const T = can[can.length - 1].tier;
      say('Recruiting at the ' + T.name + ' gate'); UI.openRecruit(BB.TIERS.indexOf(T)); await sleep(P(1100));
      const h = BB.summon(S, BB.ROSTER, T.id); if (!h) break;
      note('  recruited ' + h.name + ' (' + BB.HERO_RARITY[h.rarity].name + ' ' + BB.CALLINGS[h.calling].name + ')');
      await BB.loadHeroes([h]); await botReveal(h);
    }
    if (Bot.stop) return;
    // heroes: the best gear on everyone, the best five on the field, stars for those at their cap, a skill for every point
    say('Heroes: gear, stars and skills');
    for (const h of S.heroes) BB.equipBest(S, h);
    BB.autoFill(S);
    const team = BB.teamHeroes(S);
    for (const h of team) while (h.level >= BB.levelCap(h) && BB.ascend(S, h)) note('  ' + BB.shortName(h) + ' ascends to ' + h.stars + ' stars');
    for (const h of team) for (let k = 0; k < 40 && BB.talentFree(h) > 0; k++) { const nd = BB.TREE.find((q) => BB.canLearn(h, q.id)); if (!nd || !BB.learn(h, nd.id)) break; }
    await BB.loadHeroes(S.heroes);
    UI.go('heroes'); await sleep(P(1400)); if (Bot.stop) return;
    if (team[0]) { UI.openHero(team.slice().sort((a, b) => BB.power(b) - BB.power(a))[0].id); await sleep(P(1700)); if (Bot.stop) return; }
    say('The team takes the field'); UI.go('team'); await sleep(P(2000));
  }
  async function botFight(idx) {
    const S = BB.save, M = BB.MISSIONS[idx], team = BB.teamHeroes(S);
    say('Campaign: ' + M.code + ' · ' + M.name); UI.openCampaign(idx); await sleep(P(2400)); if (Bot.stop) return null;
    UI.openTeam(idx); await sleep(P(1500)); if (Bot.stop) return null;
    if (Bot.skip) { BB.MISSIONS.forEach((m) => (S.seen['cine_' + m.id] = 1)); BB.CHAPTERS.forEach((c) => (S.seen['cine_ch' + c.id] = 1)); }
    BB.lastRes = null; BB.deploy(idx); say('Stage ' + M.code + ' · ' + M.name);
    if (!(await botWait(() => BB.lastRes && $('mResults').classList.contains('on')))) return null; // cutscenes, the versus card, the fight, a boss's fall: all play by themselves
    const res = BB.lastRes, secs = scene && scene.time ? Math.round(scene.time) : 0;
    note(M.code + ' ' + M.name + ': ' + (res.win ? 'won' : 'LOST') + ' in ' + secs + ' s · ' + team.length + ' heroes, level ' + Math.round(team.reduce((a, h) => a + h.level, 0) / team.length) + ' against ' + M.level + ' · power ' + BB.teamPower(team) + ' of ' + BB.recPower(M) + ' asked' + ' · lowest ' + Math.round((scene && scene.lowHp !== undefined ? scene.lowHp : 1) * 100) + '% health, ' + (scene ? scene.heroList.filter((e) => e.dead).length : 0) + ' fell' + ' · stars ' + (team.reduce((a, h) => a + h.stars, 0) / team.length).toFixed(1) + ', gear ' + team.reduce((a, h) => a + BB.SLOTS.filter((k) => h.gear[k]).length, 0) + '/' + team.length * 4 + ', chest ' + (S.rank || 0) + ', skills ' + team.reduce((a, h) => a + BB.talentSpent(h), 0));
    say(M.code + ': ' + (res.win ? 'won' : 'lost')); await sleep(P(2800)); UI.modal('mResults', false);
    if (res.legend && !Bot.stop) { note('  ' + res.legend.name + ' joins'); await BB.loadHeroes([res.legend]); await botReveal(res.legend); }
    return res.win;
  }
  async function botRun(o) {
    if (Bot.on) return;
    if (mode === 'battle' && !devReal) { UI.toast('Finish or leave this battle first.'); return; }
    UI.modal('mTheater', false);
    if (!devReal) devReal = BB.save; devOpts = null; BB.dev = true; document.body.classList.add('dev');
    let S;
    if (o.from) { S = devSave({ idx: o.from, over: 1 }); }
    else { S = BB.newSave(now()); S.settings = Object.assign({}, devReal.settings, { auto: true }); S.banner = devReal.banner; }
    S.settings.auto = true; S.settings.speed = o.speed || 2; S.seen.tutorial = 1;
    BB.save = S; campBuilt = null; drillScene = null;
    Object.assign(Bot, { on: true, stop: false, log: [], fails: {}, trained: {}, pace: o.pace || 1, skip: !!o.skip });
    $('botBar').classList.add('on'); $('botSpeed').textContent = S.settings.speed + '×';
    note('The bot starts ' + (o.from ? 'at ' + BB.MISSIONS[o.from].code + ' with a full-strength team' : 'with a new banner') + ', battles at ' + S.settings.speed + '×.');
    try {
      await BB.loadHeroes(S.heroes);
      while (!Bot.stop) {
        await goCamp(); if (Bot.stop) break;
        await botManage(); if (Bot.stop) break;
        if (BB.campaignDone(S)) { note('The campaign is won: ' + BB.MISSIONS.length + ' stages.'); say('The campaign is won'); await sleep(2500); break; }
        const idx = BB.nextStageIdx(S), f = Bot.fails[idx] || 0;
        if (f >= 9) { note('Stuck at ' + BB.MISSIONS[idx].code + ' after nine defeats. The bot stops here.'); break; }
        if (f >= 2 && f % 2 === 0 && idx > 0 && Bot.trained[idx] !== f) { Bot.trained[idx] = f; note('  training on ' + BB.MISSIONS[idx - 1].code + ' before another try'); await botFight(idx - 1); continue; }
        const win = await botFight(idx);
        if (win === false) Bot.fails[idx] = f + 1;
      }
    } catch (e) { note('The bot hit an error: ' + e.message); console.error(e); }
    if (Bot.stop) note('Stopped by hand.');
    // leave cleanly: nothing half-started may carry on into the real save
    await botWait(() => { if (BB.Cinema && BB.Cinema.on) { $('cineSkip').click(); return false; } return !$('versus').classList.contains('on'); }, 20000, true);
    UI.modal('mResults', false); if ($('reveal').classList.contains('on')) $('rvOk').click();
    Bot.on = false; $('botBar').classList.remove('on');
    const cl = Object.keys(S.cleared).length;
    $('botOut').style.display = 'block'; $('botOut').textContent = 'BOT LOG · ' + cl + ' of ' + BB.MISSIONS.length + ' stages cleared · ' + S.heroes.length + ' heroes · war chest rank ' + (S.rank || 0) + '\n' + Bot.log.join('\n');
    await goCamp(); // back to the real save, and to this list
  }
  UI.click($('botStop'), () => { Bot.stop = true; say('Stopping…'); });
  UI.click($('botSpeed'), () => { toggleSpeed(); $('botSpeed').textContent = BB.save.settings.speed + '×'; });
  // A stage as a scene on its own, outside the campaign's flow (the trailer cuts several together): a full-strength
  // team already fighting. o.warm seconds are played unseen and unheard first (o.until 'boss': until the boss is on
  // the field); the fight cannot end, so a clip never lands on a victory screen.
  BB.titleCamp = () => buildCampScene(true);
  // a showcase save (a full-strength team at a stage), made without touching the player's own
  BB.showSave = function (o) {
    const keep = devReal; let S;
    if (!devReal) { const t = BB.save || BB.newSave(now()); devReal = { settings: t.settings, banner: t.banner }; }
    try { S = devSave(o); } finally { devReal = keep; }
    return S;
  };
  BB.placeScene = (which, save) => (which === 'market' ? buildMarket(save) : buildMuster(save));
  BB.stageScene = async function (o) {
    let S = BB.showSave(o);
    if (o.heroes) { const own = o.heroes(S); if (own && own.length) { S.heroes = own; S.formation = { front: [], back: [] }; S.place = {}; BB.fixFormation(S); BB.autoFill(S); } }
    const M = o.mission ? o.mission(BB.MISSIONS[o.idx]) : BB.MISSIONS[o.idx], team = BB.teamHeroes(S), region = BB.REGIONS.find((r) => r.id === M.region) || BB.REGIONS[0], biome = region.biome;
    const arts = ['ghoul', 'warden', 'necro'], pools = new Set();
    const addFoe = (k) => { const F = BB.FOES[k]; if (!F) return; if (F.art) arts.push(F.art); if (F.pool) pools.add(F.pool); if (F.poolPick) arts.push('h/' + F.poolPick); };
    M.waves.forEach((w) => { for (let i = 0; i < w.length; i += 2) addFoe(w[i]); }); if (M.boss) addFoe(M.boss); if (M.boss && (BB.FOES[M.boss].moves || []).includes('summonw')) { pools.add('skel'); pools.add('wraith'); }
    const rr = BB.rng(o.idx * 7 + 3);
    await Promise.all([BB.loadLand(region), BB.loadOther(), BB.loadHeroes(team)]
      .concat([...new Set(arts)].map((a) => BB.loadChar(a).catch(() => null)), [...pools].map((p) => pickLoad(BB.poolKeys(p), 4, rr))));
    const seed = BB.hashStr(M.id) % 9000 + 1, map = BB.buildMap(M.layout, biome, seed, { night: !!region.night || !!o.night, floor: region.floor, skin: region.skin });
    BB.renderGround(map);
    const sc = new BB.Battle({ map, mission: M, formation: BB.formationList(S), heroes: team, level: BB.foeLevel(M), save: S, seed });
    sc.autoSkills = true; sc.win = function () {}; sc.lose = function () {};
    const ticks = (o.tick || []).map((k) => (typeof k === 'function' ? k : DEV_TICK[k])); sc.tick = (dt) => ticks.forEach((f) => f(sc, dt));
    const mute = BB.sfxMute; BB.sfxMute = true;
    try {
      const st = 1 / 30; let t = 0; const lim = o.until === 'boss' ? 150 : (o.warm || 0);
      while (t < lim) { sc.tick(st); sc.update(st, null); t += st; if (o.until === 'boss' && sc.ents.some((e) => e.boss && !e.dead && e.side === 'foe')) { for (let i = 0; i < 30 * (o.warm || 0); i++) { sc.tick(st); sc.update(st, null); } break; } }
    } finally { BB.sfxMute = mute; }
    return sc;
  };
  function playTrailer(back, opts) {
    const prev = UI.current; ['mTheater', 'mSettings'].forEach((m) => UI.modal(m, false));
    BB.audioUnlock(); BB.music(null);
    BB.Trailer.play(() => { UI.show(prev); BB.music(mode === 'battle' ? 'battle' : 'calm'); back && back(); }, opts);
  }
  BB.playTrailer = playTrailer;
  // frame-rate readout (Development battles only): what the device is doing right now
  let fpsT = 0, fpsF = 0;
  function fpsReadout(real) {
    const el = $('fps'); if (!el) return;
    if (!devReal || mode !== 'battle' || !scene) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
    fpsT += real; fpsF++;
    if (fpsT < 0.5) return;
    el.style.display = 'block';
    el.textContent = Math.round(fpsF / fpsT) + ' fps · ' + W + '×' + H + ' · ' + scene.ents.filter((e) => !e.dead && e.side !== 'none').length + ' units · ' + scene.fx.length + ' fx · ' + ((scene.tr ? scene.tr.parts.length : 0) + (scene.ep ? scene.ep.debris.length : 0)) + ' bits';
    fpsT = 0; fpsF = 0;
  }
  // Performance check: a busy fight is frozen and drawn again and again with one part switched off at a time, on this
  // device, to see what each part costs here. The numbers are milliseconds per frame drawn (16 is the budget).
  let bench = null;
  function benchStart() {
    const sc = scene, P = BB.Battle.prototype, K = 4, out = [];
    sc.paused = true;
    const stub = (obj, names) => { const old = names.map((n) => obj[n]); names.forEach((n) => (obj[n] = function () {})); return () => names.forEach((n, i) => (obj[n] = old[i])); };
    const tests = [
      ['The whole frame', () => () => {}],
      ['without particles and impacts', () => stub(P, ['drawTraitWorld', 'drawWorldEpic', 'drawGroundLights'])],
      ['without auras and status effects', () => { const a = stub(BB, ['drawAuraFront', 'drawAuraBack', 'auraGlow']), b = stub(P, ['drawTrait', 'drawTraitBack']); return () => { a(); b(); }; }],
      ['without effect sprites', () => stub(BB, ['drawFx'])],
      ['without glows', () => stub(BB, ['drawGlow'])],
      ['without the lighting pass', () => stub(P, ['drawLight'])],
      ['without the screen layer (weather, bands)', () => stub(P, ['drawEpic'])],
      ['without units and their bars', () => stub(P, ['drawEnt', 'drawBars'])],
      ['without scenery (trees, rocks)', () => stub(BB, ['drawEnv'])],
      ['without the ground', () => { const g = sc.map.groundCanvas; sc.map.groundCanvas = null; return () => { sc.map.groundCanvas = g; }; }],
      ['with no additive blending', () => { Object.defineProperty(ctx, 'globalCompositeOperation', { configurable: true, get: () => 'source-over', set: () => {} }); return () => { delete ctx.globalCompositeOperation; }; }],
      ['at half resolution', () => { const r = rScale; rScale = 0.5; resize(); return () => { rScale = r; resize(); }; }],
      ['drawing nothing at all', () => stub(P, ['renderField'])],
    ];
    bench = { i: 0, n: 0, acc: [], undo: null, step(real) {
      if (this.i >= tests.length) { bench = null; benchDone(out, sc); return; }
      if (!this.undo) { this.undo = tests[this.i][1](); this.n = 0; this.acc = []; }
      for (let k = 0; k < K; k++) sc.render(ctx, W, H, DPR);
      if (++this.n > 8) this.acc.push(real * 1000);
      if (this.n >= 44) { this.undo(); this.undo = null; const a = this.acc.sort((x, y) => x - y), med = a[Math.floor(a.length / 2)]; out.push([tests[this.i][0], med / K]); this.i++; }
    } };
    $('fps').style.display = 'block'; $('fps').textContent = 'Measuring… about 20 seconds';
  }
  function benchDone(out, sc) {
    // the fight itself (no drawing): how long one step of the simulation takes
    sc.paused = false; let t0 = performance.now(), n = 0; while (n < 60 && !sc.result) { sc.update(1 / 60, null); n++; } const sim = (performance.now() - t0) / Math.max(1, n);
    const base = out[0][1], floor = 1000 / 60 / 4;
    const fmt = (v) => (v <= floor * 1.08 ? '≤ ' + floor.toFixed(1) : v.toFixed(1)) + ' ms';
    const lines = ['PERFORMANCE CHECK — ' + new Date().toISOString().slice(0, 16).replace('T', ' '), 'Screen ' + Math.round(W / DPR) + '×' + Math.round(H / DPR) + ' points, pixel ratio ' + (window.devicePixelRatio || 1) + ', canvas ' + W + '×' + H,
      'Units ' + sc.ents.filter((e) => !e.dead && e.side !== 'none').length + ', effect sprites ' + sc.fx.length + ', bits ' + ((sc.tr ? sc.tr.parts.length : 0) + (sc.ep ? sc.ep.debris.length : 0)), '',
      'One frame drawn (budget 16.7 ms):'];
    out.forEach(([name, v], i) => lines.push('  ' + fmt(v).padStart(10) + '  ' + name + (i && v < base * 0.93 ? '   (saves ' + (base - v).toFixed(1) + ')' : '')));
    lines.push('', 'One step of the fight itself: ' + sim.toFixed(2) + ' ms', '', (navigator.userAgent || '').slice(0, 120));
    $('perfOut').textContent = lines.join('\n'); $('perfOut').style.display = 'block';
    goCamp();
  }
  BB.benchResult = () => $('perfOut').textContent;
  function devList() {
    const bosses = BB.MISSIONS.filter((m) => m.boss), idxOf = (m) => BB.MISSIONS.indexOf(m);
    const tint = (m) => ({ vesh: '#7dffb0', regent: '#c9a8ff', sallow: '#ffd27a' }[m.boss] || '#ff7a6a');
    const bn = (m) => BB.FOES[m.boss].name.split(',')[0];
    const ix = (code) => BB.MISSIONS.findIndex((m) => m.code === code);
    const list = [];
    list.push({ group: 'Boss fights — played live by a full-strength team (entrance, the fight, the fall)', items: bosses.map((m) => ({ t: bn(m), s: 'Stage ' + m.code + ' · ' + m.name, c: tint(m), battle: { idx: idxOf(m), cine: true, over: 2 } })) });
    list.push({ group: 'Diagnostics', items: [{ t: 'Performance check', s: 'Measures this device: what each part of a busy fight costs. Takes about 30 seconds; send me the result', c: '#8fd88a', battle: { idx: ix('4-5'), over: 2, tick: ['sturdy'], bench: true } }] });
    list.push({ group: 'Battle spectacle', items: [
      { t: 'Ultimates, back to back', s: 'Every hero\'s ultimate in turn, with its cut-in', c: '#d9b8ff', battle: { idx: ix('4-4'), tick: ['ults', 'sturdy'], archs: ['knight', 'mage', 'ranger', 'paladin', 'rogue'] } },
      { t: 'Signature moves', s: 'Whirlwinds, meteors, chain lightning — non-stop', c: '#ffd27a', battle: { idx: ix('4-4'), tick: ['sigs', 'sturdy'], archs: ['barbarian', 'mage', 'duelist', 'spearman', 'paladin'] } },
      { t: 'Weapon traits I', s: 'Fire, frost, storm, shadow, poison blades', c: '#ff8a4a', battle: { idx: ix('3-4'), tick: ['sturdy'], ench: ['holy', 'fire', 'frost', 'storm', 'shadow', 'poison'], archs: ['barbarian', 'duelist', 'spearman', 'monk', 'knight'] } },
      { t: 'Weapon traits II', s: 'Holy, poison and storm on archers and casters', c: '#a6f04a', battle: { idx: ix('2-3'), tick: ['sturdy'], ench: ['holy', 'poison', 'storm', 'holy', 'fire', 'frost'], archs: ['ranger', 'mage', 'ranger', 'knight', 'rogue'] } },
      { t: 'The last horde', s: 'Stage 4-5 · the biggest waves in the game', c: '#ff7a6a', battle: { idx: ix('4-5'), over: 2 } },
      { t: 'Gravegates', s: 'Stage 4-2 · gates pouring out the dead', c: '#b57cff', battle: { idx: ix('4-2'), over: 2 } },
      { t: 'A fight on the edge', s: 'Under-levelled: heartbeat, rescues, last stands', c: '#ff4a5a', battle: { idx: ix('3-7'), over: -3 } },
    ].filter((x) => x.battle.idx >= 0) });
    list.push({ group: 'The bot — plays the game by itself in a throwaway save. Watch; stop it when you like; its log stays here', items: [
      { t: 'Bot: the whole game', s: 'From a new banner, battles at 2×', c: '#8fd88a', bot: {} },
      { t: 'Bot: the whole game, fast', s: 'Battles at 3×, cutscenes skipped, short stops', c: '#8fd88a', bot: { speed: 3, skip: true, pace: 0.45 } },
      { t: 'Bot: the far marches', s: 'A full-strength team, from chapter 5', c: '#cfe4ff', bot: { from: 30 } }] });
    list.push({ group: 'The trailer', items: [{ t: 'Bannerborn — the trailer', s: 'Under a minute: the gates, the banner, the fights', c: '#ffbe55', trailer: true }] });
    list.push({ group: 'The story', items: [{ t: 'The Opening', s: 'Nine banners, the Gravegates', c: '#ffbe55', play: ['intro', {}] }, { t: 'The Far Marches', s: 'After the Cantor falls', c: '#cfe4ff', play: ['bridge', {}] }, { t: 'The Ending', s: 'The last gate is shut', c: '#ffe7a3', play: ['ending', {}] }]
      .concat(BB.CHAPTERS.map((ch, i) => ({ t: 'Chapter ' + BB.roman(i + 1) + ' · ' + ch.name, s: ch.blurb.length > 46 ? ch.blurb.slice(0, 45) + '…' : ch.blurb, c: '#ffcf7a', play: ['chapter', { chapter: ch, music: 'calm' }] }))) });
    list.push({ group: 'Boss entrances (cutscene only)', items: bosses.map((m) => ({ t: bn(m), s: 'Stage ' + m.code + ' · ' + m.name, c: tint(m), play: ['boss', { stage: m }] })) });
    list.push({ group: 'Boss falls (cutscene only)', items: bosses.map((m) => ({ t: bn(m) + ' falls', s: 'Stage ' + m.code, c: tint(m), play: ['bossDown', { stage: m, music: 'calm' }] })) });
    list.push({ group: 'Summoning — by rarity', items: BB.TIERS.map((t) => ({ t: t.name + ' summon', s: 'The gate climbs to ' + t.name.toLowerCase(), c: ['#c4ccd8', '#4da3ff', '#b57cff', '#ffae2b'][t.rarity], reveal: { rarity: t.rarity } }))
      .concat(Object.keys(BB.LEGENDS).map((id) => ({ t: BB.LEGENDS[id].name, s: 'Legend · ' + BB.LEGENDS[id].title, c: BB.LEGENDS[id].color || '#ffae2b', reveal: { legend: id } }))) });
    if (BB.SIGNATURES && BB.identityAll) list.push({ group: 'Summoning — every signature move', items: Object.keys(BB.SIGNATURES).map((k) => ({ t: BB.SIGNATURES[k].name, s: BB.SIGNATURES[k].line, c: '#ffd27a', reveal: { sig: k } })) });
    if (BB.ENTRANCES && BB.identityAll) list.push({ group: 'Summoning — every entrance', items: Object.keys(BB.ENTRANCES).map((k) => ({ t: BB.ENTRANCES[k].name, s: BB.ENTRANCES[k].line, c: '#86ccff', reveal: { entrance: k } })) });
    list.push({ group: 'Lands — the team field in each chapter', items: BB.CHAPTERS.map((ch, i) => ({ t: ch.name, s: 'A full team training there', c: '#8fd88a', field: { idx: BB.MISSIONS.findIndex((m) => m.chapter === i + 1) + 2, ench: ['fire', 'frost', 'storm', 'shadow', 'poison', 'holy'] } })) });
    return list;
  }
  function openTheater() {
    const box = $('theaterList'); box.innerHTML = '';
    for (const G of devList()) {
      const h = document.createElement('div'); h.className = 'th-group'; h.textContent = G.group; box.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'th-grid'; box.appendChild(grid);
      for (const it of G.items) {
        const b = document.createElement('button'); b.className = 'th-tile' + (it.battle || it.field ? ' live' : ''); b.style.setProperty('--tc', it.c);
        b.innerHTML = '<b></b><span></span>'; b.querySelector('b').textContent = it.t; b.querySelector('span').textContent = it.s;
        b.addEventListener('click', () => watch(it)); grid.appendChild(b);
      }
    }
    UI.modal('mSettings', false); UI.modal('mTheater');
  }
  BB.openDev = openTheater;
  function watch(it) {
    BB.sfx('click');
    if ((it.battle || it.field) && mode === 'battle' && !devReal) { UI.toast('Finish or leave this battle first.'); return; }
    UI.modal('mTheater', false);
    const back = () => { BB.music(mode === 'battle' ? 'battle' : 'calm'); UI.modal('mTheater'); };
    if (it.trailer) { playTrailer(() => UI.modal('mTheater')); return; }
    if (it.bot) { botRun(it.bot); return; }
    if (it.battle) { devBattle(it.battle); return; }
    if (it.field) { devEnter(it.field); BB.loadHeroes(BB.save.heroes).then(() => UI.openTeam(it.field.idx)); return; }
    if (it.reveal) { // a summoning, played on a hero who fits; nobody joins the save
      const R = it.reveal, tab = BB.identityAll ? BB.identityAll() : {}; let h = null;
      if (R.legend) { h = BB.newHero({ legend: R.legend }); h.stars = 5; }
      else {
        const pool = BB.ROSTER.filter((r) => r.role === 'hero');
        const c = R.sig ? pool.find((r) => tab[r.key] && tab[r.key].sig === R.sig) : R.entrance ? pool.find((r) => tab[r.key] && tab[r.key].entrance === R.entrance)
          : (BB.heroTiers(BB.ROSTER).find((t) => t.tier.rarity === R.rarity) || { heroes: pool }).heroes[0];
        if (!c) { back(); return; }
        h = BB.heroFromEntry(BB.save, Object.assign({}, c, { rarity: R.rarity === undefined ? 2 : R.rarity })); h.stars = R.rarity === 3 ? 5 : (R.rarity || 0) + 1;
      }
      BB.loadHeroes([h]).then(() => UI.reveal(h, back));
      return;
    }
    BB.Cinema.play(it.play[0], it.play[1], back);
  }
  UI.click($('bTheater'), () => { const s = BB.save.settings; s.music = +$('sMusic').value; s.sfx = +$('sSfx').value; s.shake = $('sShake').checked; s.numbers = $('sDmg').checked; s.gfx = $('sGfx').value; BB.setVolumes(); BB.persist(); applyGfx(); openTheater(); });
  UI.click($('bTheaterClose'), () => { UI.modal('mTheater', false); });
  // a new game lives in Settings, behind a question: it erases the banner and everything won under it
  UI.click($('bNew'), () => UI.confirm('Start a new game? Your heroes and all progress will be erased for good.', () => {
    devExit(); UI.modal('mSettings', false);
    try { localStorage.removeItem(KEY); } catch (e) { /* blocked */ }
    newGame();
  }));

  // ---------------------------------------------------------------- loop
  let lastT = performance.now(), spoilT = 0;
  // the camp keeps living behind every menu (dimmed by each screen's backdrop)
  const SCENE_UNDER = ['title', 'home', 'hud', 'cine', 'heroes', 'hero', 'team', 'shop', 'campaign', 'recruit'];
  const DIMMED = ['campaign', 'recruit']; let dimAcc = 0, dimN = 0;
  // frame-rate watch for 'auto' graphics: the average of the last stretch of battle frames
  let fpsAcc = 0, fpsN = 0, fpsHold = 0;
  function watchFrames(real) {
    if (mode !== 'battle' || !scene || scene.intro || scene.result || scene.paused || gfxMode() !== 'auto' || real > 0.5) { fpsAcc = 0; fpsN = 0; return; }
    if (fpsHold > 0) { fpsHold -= real; return; }
    fpsAcc += real; fpsN++;
    if (fpsN < 50 && fpsAcc < 1.2) return; // about a second of fighting at a time
    const avg = fpsAcc / fpsN; fpsAcc = 0; fpsN = 0;
    if (avg > 0.027 && rScale > 0.5) { // under about 37 frames a second: draw fewer pixels, thin the particles
      rScale = Math.max(0.5, rScale * (avg > 0.05 ? 0.64 : 0.8)); // badly behind: two steps at once
      autoScale = rScale; try { localStorage.setItem(GFX_KEY, String(rScale)); } catch (e) { /* blocked */ }
      applyGfx(); fpsHold = 1.5;
    }
  }
  function frame(t) {
    if (t - lastT < 12) { requestAnimationFrame(frame); return; } // 120 Hz screens: sixty frames a second is the game's pace
    const real = (t - lastT) / 1000, dt = Math.min(0.1, real); lastT = t;
    watchFrames(real);
    // a cutscene owns the screen. It runs on the real clock (within reason), so that when a frame is late the picture
    // catches up with the sound instead of drifting behind it
    if (BB.Cinema && BB.Cinema.on) { BB.Cinema.render(Math.min(0.3, real)); requestAnimationFrame(frame); return; }
    if (BB.Trailer && BB.Trailer.on) { BB.Trailer.frame(dt, ctx, W, H, DPR, camZoom()); requestAnimationFrame(frame); return; }
    if (bench) { bench.step(real); requestAnimationFrame(frame); return; } // the performance check owns the frame
    fpsReadout(real);
    const visible = SCENE_UNDER.includes(UI.current);
    // behind a menu the camp is dim and blurred: draw it a few times a second, not sixty (a phone re-blurs the
    // whole screen each time the picture under the glass changes)
    let sdt = dt, skip = false;
    if (mode !== 'battle' && DIMMED.includes(UI.current)) { dimAcc += dt; if (++dimN % 8) skip = true; else { sdt = Math.min(0.25, dimAcc); dimAcc = 0; } } else { dimAcc = 0; dimN = 0; }
    if (skip) { /* keep the last picture */ }
    else if (scene && (visible || mode === 'battle')) {
      scene.cam.zoom = camZoom() * (scene.zoomK || 1);
      const fight = scene.titleFight && mode === 'title', wasMute = BB.sfxMute;
      if (fight) { scene.titleT += dt; const q = Math.min(1, scene.titleT / 3.6), e = 1 - (1 - q) ** 3; scene.cam.zoom *= (H / DPR < 520 ? 0.95 : 1.1) * (1.5 - 0.5 * e); scene.viewOff = { x: 0, y: H * 0.115 }; if (scene.tick) scene.tick(sdt); BB.sfxMute = true; }
      if (scene.isTitle) { scene.cam.x = scene.map.w / 2 + Math.sin(t / 9000) * 1.6 - 1.2; scene.cam.y = scene.map.h / 2 + Math.cos(t / 11000) * 0.8 + 0.4; }
      else if (scene.drill) { if (UI.current === 'team' && UI.teamLayout) UI.teamLayout(scene, W, H, DPR); }
      else if (scene.fixCam) { { const sw = Math.sin(t / 7000) * 0.1 / Math.max(1, (scene.zoomK || 1) ** 2); scene.cam.x = scene.fixCam.x + sw; scene.cam.y = scene.fixCam.y - sw; } menuScene(scene); }
      else if (scene.peaceful) { scene.cam.x = scene.map.w / 2 - 1.8 + Math.sin(t / 14000) * 0.4; scene.cam.y = scene.map.h / 2 + 1.6; }
      const reps = mode === 'battle' && !scene.intro && !scene.result ? Math.min(3, Math.max(1, BB.save.settings.speed || 1)) : 1;
      if (scene.devTick && mode === 'battle' && !scene.intro && !scene.result && !scene.paused) scene.devTick(scene, dt);
      for (let i = 0; i < reps; i++) scene.update(sdt, null);
      if (fight) BB.sfxMute = wasMute;
      if (visible) scene.render(ctx, W, H, DPR);
      if (mode === 'battle' && UI.current === 'hud') {
        updateHud(dt);
        if (scene.result && scene.result.t > 2.6 && !scene.result.shown) { scene.result.shown = true; finishBattle(); }
        if (scene.choice && !scene.choice.shown && !scene.result) trekChoice();
      }
    } else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0d0a08'; ctx.fillRect(0, 0, W, H); }
    if (UI.current === 'home') { UI.homeRender(dt); spoilT += dt; if (spoilT > 20) { spoilT = 0; UI.updateSpoils(); } }
    if (UI.current === 'campaign') UI.pathRender(dt);
    if (UI.current === 'heroes') UI.heroesRender(dt);
    if (UI.current === 'hero') UI.heroRender(dt);
    if (UI.current === 'recruit') UI.recruitRender(dt);
    if (UI.current === 'team') UI.teamRender(dt);
    UI.revealRender(dt);
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- boot
  async function boot() {
    if (BB.nativeRestore) await BB.nativeRestore(); // inside the app: the save's second copy, if the page's own is gone
    BB.save = loadSave();
    try {
      await BB.loadBase((p) => { document.querySelector('#boot .bar i').style.width = Math.round(p * 100) + '%'; });
      await BB.loadPortraits();
    } catch (e) { $('bootmsg').textContent = 'Could not load the art: ' + e.message; throw e; }
    if (BB.save) BB.setVolumes();
    applyGfx();
    requestAnimationFrame(frame);
    ['ghoul', 'warden', 'necro'].forEach((k) => BB.loadChar(k).catch(() => null));
    const q = new URLSearchParams(location.search);
    if (q.has('test')) BB.testHooks = { goCamp, newGame, scene: () => scene, finish: finishBattle, mode: () => mode, deploy: (i) => BB.deploy(i) };
    if (BB.BUILD && BB.BUILD.native) document.body.classList.add('native');
    if (document.fonts && document.fonts.load) await Promise.race([Promise.all(['800 20px Cinzel', '600 20px Cinzel', '600 16px Outfit', '800 16px Outfit', '500 14px Inter', 'italic 500 14px Inter', '600 20px "Cormorant Garamond"', 'italic 600 20px "Cormorant Garamond"'].map((f) => document.fonts.load(f).catch(() => null))), new Promise((r) => setTimeout(r, 1500))]);
    await goTitle();
    if (BB.storeInit) BB.storeInit().then(() => { if (UI.current === 'shop') UI.renderShop(); }); // ads and the store wake up behind the title
  }
  boot();
})();
