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
  BB.persist = function () { try { localStorage.setItem(KEY, JSON.stringify(BB.save)); } catch (e) { /* storage blocked */ } };
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === BB.SAVE_V && s.heroes && s.heroes.length) {
        const d = BB.newSave();
        const out = Object.assign(d, s);
        out.settings = Object.assign(BB.newSave().settings, s.settings || {});
        out.stats = Object.assign({ kills: 0, gates: 0 }, s.stats || {});
        out.formation = s.formation && s.formation.front && s.formation.back ? s.formation : d.formation;
        out.place = s.place || {}; BB.fixFormation(out);
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
  async function goTitle() {
    mode = 'title';
    const S = BB.save;
    $('bPlay').textContent = S ? 'Continue' : 'Raise the Banner';
    $('bTitleSet').style.display = S ? '' : 'none'; // settings (and a new game) need a save to belong to
    if (S) { const st = BB.MISSIONS[BB.nextStageIdx(S)]; $('tCont').innerHTML = (BB.campaignDone(S) ? '<b>Campaign won</b>' : 'Stage <b>' + st.code + '</b> · ' + UI.esc(st.name)) + ' · <b>' + S.heroes.length + '</b> hero' + (S.heroes.length === 1 ? '' : 'es'); }
    else $('tCont').textContent = 'A new banner, a first captain, a road to the Gravegates';
    const em = $('tEmbers');
    if (!em.children.length) for (let i = 0; i < 16; i++) { const e = document.createElement('i'); e.style.left = (4 + Math.random() * 92) + '%'; e.style.setProperty('--dx', Math.round(Math.random() * 120 - 60) + 'px'); e.style.animationDuration = (6 + Math.random() * 7).toFixed(1) + 's'; e.style.animationDelay = (-Math.random() * 12).toFixed(1) + 's'; if (i % 3 === 0) { e.style.width = e.style.height = '2px'; } em.appendChild(e); }
    scene = await buildCampScene(true);
    UI.show('title');
    BB.music('calm');
  }
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
    const wasDev = devExit(); // leaving a Development battle: back to the real save, and to the list
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
  }
  BB.goCamp = goCamp;
  function drawTopBanner() { const bc = $('tbBanner'); UI.drawBanner(bc.getContext('2d'), BB.save.banner, bc.width, bc.height, 0); }

  function newGame() {
    BB.save = BB.newSave(now());
    campBuilt = null; campScene = null; drillScene = null;
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
    const S = BB.save, B = scene, M = current.stage, win = !!B.result.win;
    const first = win && !S.cleared[M.id];
    const heroes = B.heroList.map((e) => e.hero);
    let mvp = null; for (const e of B.heroList) if (!mvp || (e.dealt || 0) > (mvp.dealt || 0)) mvp = e;
    const res = { win, code: M.code, title: M.name, heroes, mvp: mvp && mvp.hero, kills: B.kills, gold: 0, crystals: 0, sigils: 0, items: [] };
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
      const chBefore = BB.TIERS.filter((t) => BB.tierOpen(S, t)).length;
      S.cleared[M.id] = (S.cleared[M.id] || 0) + 1;
      const notes = [];
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
    if (devReal) { const o = devOpts; actions.length = 0; actions.push(['Development', '', () => after(goCamp)]); actions.push(['Watch again', 'dark', () => { devExit(); devBattle(o); }]); }
    if (win && M.boss && first) BB.Cinema.play('bossDown', { stage: M, music: 'calm' }, () => { BB.music(M.type === 'boss' ? 'calm' : 'battle'); UI.results(res, actions); BB.sfx('levelup'); });
    else { UI.results(res, actions); BB.sfx(win ? 'levelup' : 'click'); }
  }

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
    }
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
  // pause when the page is hidden (a phone call, switching apps)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'battle' && scene && !scene.result && !scene.paused) togglePause();
    if (!document.hidden && UI.current === 'home') UI.updateSpoils();
  });

  // ---------------------------------------------------------------- buttons
  UI.click($('bPlay'), () => { if (BB.save) goCamp(); else newGame(); });
  UI.click($('bTrailer'), () => playTrailer());
  UI.click($('bContinue'), () => UI.openCampaign());
  UI.click($('bCampBack'), () => goCamp());
  UI.click($('bRecruitH'), () => UI.openRecruit());
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
    const got = BB.idleClaim(S, now());
    BB.sfx('coin'); BB.persist(); UI.refreshTop(); UI.updateSpoils(); UI.renderHome();
    UI.toast('Spoils: +' + UI.fmt(got.gold) + ' gold' + (got.sigils ? ', +' + got.sigils + ' sigils' : ''));
  });
  UI.click($('bPause'), togglePause);
  UI.click($('bResume'), togglePause);
  UI.click($('bSpeed'), toggleSpeed);
  UI.click($('bAuto'), toggleAuto);
  UI.click($('bRetreat'), () => { UI.modal('mPause', false); scene.paused = false; scene.lose('Retreated'); });
  const openSettings = () => {
    const s = BB.save.settings;
    $('sMusic').value = s.music; $('sSfx').value = s.sfx; $('sShake').checked = s.shake !== false; $('sDmg').checked = !!s.numbers; $('sGfx').value = s.gfx || 'auto';
    UI.modal('mSettings');
  };
  UI.click($('bSettings'), openSettings);
  UI.click($('bTitleSet'), () => { if (BB.save) openSettings(); });
  UI.click($('bSetClose'), () => {
    const s = BB.save.settings; s.music = +$('sMusic').value; s.sfx = +$('sSfx').value; s.shake = $('sShake').checked; s.numbers = $('sDmg').checked; s.gfx = $('sGfx').value;
    if (s.gfx !== 'auto') { autoScale = 0; try { localStorage.removeItem(GFX_KEY); } catch (e) { /* blocked */ } }
    BB.setVolumes(); BB.persist(); applyGfx(); UI.modal('mSettings', false);
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
    const S = BB.newSave(now()), st = BB.MISSIONS[o.idx];
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
  function devEnter(o) { if (!devReal) devReal = BB.save; devOpts = o; BB.save = devSave(o); BB.dev = true; campBuilt = null; drillScene = null; document.body.classList.add('dev'); UI.refreshTop(); }
  function devExit() { if (!devReal) return false; BB.save = devReal; devReal = null; devOpts = null; BB.dev = false; campBuilt = null; drillScene = null; document.body.classList.remove('dev'); UI.refreshTop(); return true; }
  // what keeps a showcase battle showing its subject
  const DEV_TICK = {
    ults: (sc, dt) => { sc.devT = (sc.devT || 1.5) - dt; if (sc.devT > 0 || (sc.ep && sc.ep.ult)) return; sc.devT = 3.4; const hs = sc.heroesAlive(); if (!hs.length) return; const h = hs[(sc.devN = (sc.devN || 0) + 1) % hs.length]; h.energy = 100; sc.useSkill(h, true); },
    sigs: (sc) => { for (const e of sc.heroList) if (!e.dead && e.sigCd > 1.6) e.sigCd = 1.6; },
    sturdy: (sc) => { for (const e of sc.heroList) if (!e.dead && e.hp < e.maxhp * 0.5) e.hp = e.maxhp * 0.5; },
  };
  function devBattle(o) { devEnter(o); BB.deploy(o.idx); }
  // A stage as a scene on its own, outside the campaign's flow (the trailer cuts several together): a full-strength
  // team already fighting. o.warm seconds are played unseen and unheard first (o.until 'boss': until the boss is on
  // the field); the fight cannot end, so a clip never lands on a victory screen.
  BB.titleCamp = () => buildCampScene(true);
  BB.stageScene = async function (o) {
    const keep = devReal; let S;
    if (!devReal) { const t = BB.save || BB.newSave(now()); devReal = { settings: t.settings, banner: t.banner }; }
    try { S = devSave(o); } finally { devReal = keep; }
    const M = BB.MISSIONS[o.idx], team = BB.teamHeroes(S), region = BB.REGIONS.find((r) => r.id === M.region) || BB.REGIONS[0], biome = region.biome;
    const arts = ['ghoul', 'warden', 'necro'], pools = new Set();
    const addFoe = (k) => { const F = BB.FOES[k]; if (!F) return; if (F.art) arts.push(F.art); if (F.pool) pools.add(F.pool); if (F.poolPick) arts.push('h/' + F.poolPick); };
    M.waves.forEach((w) => { for (let i = 0; i < w.length; i += 2) addFoe(w[i]); }); if (M.boss) addFoe(M.boss); if (M.boss && (BB.FOES[M.boss].moves || []).includes('summonw')) { pools.add('skel'); pools.add('wraith'); }
    const rr = BB.rng(o.idx * 7 + 3);
    await Promise.all([BB.loadLand(region), BB.loadOther(), BB.loadHeroes(team)]
      .concat([...new Set(arts)].map((a) => BB.loadChar(a).catch(() => null)), [...pools].map((p) => pickLoad(BB.poolKeys(p), 4, rr))));
    const seed = BB.hashStr(M.id) % 9000 + 1, map = BB.buildMap(M.layout, biome, seed, { night: !!region.night, floor: region.floor, skin: region.skin });
    BB.renderGround(map);
    const sc = new BB.Battle({ map, mission: M, formation: BB.formationList(S), heroes: team, level: BB.foeLevel(M), save: S, seed });
    sc.autoSkills = true; sc.win = function () {}; sc.lose = function () {};
    const ticks = (o.tick || []).map((k) => DEV_TICK[k]); sc.tick = (dt) => ticks.forEach((f) => f(sc, dt));
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
    list.push({ group: 'The trailer', items: [{ t: 'Bannerborn — the trailer', s: 'Under a minute: the gates, the banner, the fights', c: '#ffbe55', trailer: true }] });
    list.push({ group: 'The story', items: [{ t: 'The Opening', s: 'Nine banners, the Gravegates', c: '#ffbe55', play: ['intro', {}] }]
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
  const DIMMED = ['heroes', 'hero', 'shop', 'campaign', 'recruit']; let dimAcc = 0, dimN = 0;
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
      if (scene.isTitle) { scene.cam.x = scene.map.w / 2 + Math.sin(t / 9000) * 1.6 - 1.2; scene.cam.y = scene.map.h / 2 + Math.cos(t / 11000) * 0.8 + 0.4; }
      else if (scene.drill) { if (UI.current === 'team' && UI.teamLayout) UI.teamLayout(scene, W, H, DPR); }
      else if (scene.peaceful) { scene.cam.x = scene.map.w / 2 - 1.8 + Math.sin(t / 14000) * 0.4; scene.cam.y = scene.map.h / 2 + 1.6; }
      const reps = mode === 'battle' && !scene.intro && !scene.result ? Math.min(3, Math.max(1, BB.save.settings.speed || 1)) : 1;
      if (scene.devTick && mode === 'battle' && !scene.intro && !scene.result && !scene.paused) scene.devTick(scene, dt);
      for (let i = 0; i < reps; i++) scene.update(sdt, null);
      if (visible) scene.render(ctx, W, H, DPR);
      if (mode === 'battle' && UI.current === 'hud') {
        updateHud(dt);
        if (scene.result && scene.result.t > 2.6 && !scene.result.shown) { scene.result.shown = true; finishBattle(); }
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
    await goTitle();
  }
  boot();
})();
