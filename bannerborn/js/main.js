// Bannerborn — boot, loop, input, flow between screens, saving.
(function () {
  const BB = window.BB, UI = BB.UI, $ = UI.$;
  const KEY = 'bannerborn.save.v1';
  const cv = $('game'), ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  let scene = null;        // a Battle (peaceful for title/camp)
  let mode = 'boot';       // boot | title | camp | battle | menu
  const input = { mx: 0, my: 0, atk: false, skill: false, dodge: false, rally: false };
  const keys = {};

  // ---------------------------------------------------------------- save
  BB.persist = function () { try { localStorage.setItem(KEY, JSON.stringify(BB.save)); } catch (e) { /* storage blocked */ } };
  function loadSave() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return Object.assign(BB.newSave(), s); } catch (e) { /* none */ }
    return null;
  }

  // ---------------------------------------------------------------- canvas
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
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

  // ---------------------------------------------------------------- scenes
  function sceneHeroes() {
    const S = BB.save;
    const team = (S && S.team.length ? S.team.map(UI.heroById).filter(Boolean) : []);
    const others = S ? S.heroes.filter((h) => !S.team.includes(h.id)) : [];
    return team.concat(others).slice(0, 8);
  }
  function titleHeroes() {
    const r = BB.rng(7);
    const out = ['vanguard', 'arcanist'].map((c, i) => BB.newHero({ calling: c, seed: 100 + i * 17, name: 'x' }));
    const pool = BB.ROSTER.filter((c) => c.role === 'hero');
    const want = ['knight', 'mage', 'monk', 'spearman', 'rogue', 'ranger'];
    for (const a of want) { const opts = pool.filter((c) => c.arch === a); if (opts.length) out.push(BB.makeRecruit({ key: r.pick(opts).key, calling: opts[0].calling, level: 1, stars: 1, name: 'x' })); }
    return out.slice(0, 8);
  }
  async function buildCampScene(isTitle) {
    const S = BB.save;
    const night = isTitle;
    const m = BB.buildMap(isTitle ? 'title' : 'camp', 'vale', isTitle ? 11 : 23, { night });
    const c = m.w / 2;
    // the fire and the banner
    m.add('Misc B8_S', c, c, { biome: 'vale', r: 0.45 });
    m.anim('fire', c + 0.03, c + 0.03, { sc: 0.75, fps: 14 });
    m.lights.push({ x: c, y: c, rad: 5.5, col: '255,160,70' });
    const b = S ? S.banner : { name: '', color: '#b3242c', sigil: 'crown', trim: '#e8c66a' };
    m.bannerProp = { x: c - 1.6, y: c - 1.9, banner: b };
    const B = S ? S.buildings : { barracks: 1, forge: 1, yard: 1, chapel: 1, market: 1 };
    const tents = ['Misc B46_S', 'Misc B12_S', 'Misc B19_S', 'Misc B43_S'];
    const tentSpots = [[c - 3.5, c - 3], [c + 1.5, c - 4], [c - 4.5, c + 0.5], [c + 4, c - 1.5]];
    for (let i = 0; i < 1 + Math.min(3, B.barracks + (isTitle ? 2 : 0)); i++) m.add(tents[i], tentSpots[i][0], tentSpots[i][1], { biome: 'vale' });
    if (B.forge || isTitle) { m.add('Misc C2_S', c + 3.3, c + 2, { biome: 'vale', r: 0.3 }); m.anim('fire2', c + 4.2, c + 1.5, { sc: 0.5 }); m.lights.push({ x: c + 4.2, y: c + 1.5, rad: 2.5, col: '255,120,40' }); m.add('Misc B3_S', c + 4.6, c + 2.8, { biome: 'vale' }); }
    if (B.yard) { m.add('Misc B15_S', c - 3.5, c + 3.6, { biome: 'vale', r: 0.25 }); m.add('Misc B57_S', c - 2.4, c + 4.4, { biome: 'vale', r: 0.25 }); if (B.yard > 1) m.add('Misc B53_S', c - 4.6, c + 2.6, { biome: 'vale', r: 0.25 }); }
    if (B.chapel) { m.add('Misc C5_S', c + 0.5, c + 4.6, { biome: 'vale', r: 0.4 }); if (B.chapel > 1) m.add('Stone A6_S', c + 2.4, c + 5, { biome: 'vale', r: 0.8 }); }
    if (B.market) { m.add('Misc B17_S', c + 4.5, c - 4.4, { biome: 'vale' }); if (B.market > 1) m.add('Misc B6_S', c + 5.4, c - 2.6, { biome: 'vale' }); }
    if (B.barracks > 1) m.add('Misc B55_S', c - 5.6, c - 4.6, { biome: 'vale' });
    if (B.tavern) { m.add('Misc B14_S', c - 0.5, c - 5.6, { biome: 'vale' }); m.add('Misc B45_S', c + 0.8, c - 5.2, { biome: 'vale', r: 0.2 }); if (B.tavern > 1) m.add('Misc A4_S', c - 1.8, c - 5.4, { biome: 'vale' }); }
    m.add('Torch2', c - 2.5, c + 2.2, { biome: 'vale' }); m.anim('torch', c - 2.48, c + 2.22, { sc: 0.7, pole: 1 }); m.lights.push({ x: c - 2.5, y: c + 2.2, rad: 2.5, col: '255,170,80' });
    for (const p of m.props) { const s = BB.iso(p.x, p.y); p.depth = p.x + p.y; p.sx = s.x; p.sy = s.y; }
    m.props.sort((a, b2) => a.depth - b2.depth);
    rebuildGrid(m);
    BB.renderGround(m);
    const heroes = isTitle ? titleHeroes() : sceneHeroes();
    await BB.loadHeroes(heroes);
    const npcKeys = BB.npcKeys(); await pickLoad(npcKeys, 3, BB.rng(isTitle ? 5 : Date.now() & 0xffff));
    const sc = new BB.Battle({ map: m, heroes: [], peaceful: true, save: S, seed: 3 });
    const loadedNpc = npcKeys.filter((k) => BB.A.chars[k]);
    sc.npcs = (isTitle ? [] : [[c + 4, c + 3.4], [c - 4.6, c - 1], [c + 2, c - 5]]).slice(0, loadedNpc.length).map(([x, y], i) => ({ x, y, home: { x, y }, art: loadedNpc[i], clip: 'Idle', dir: 2, ct: 0, walker: true, wait: 1 + i }));
    const ring = [[-1.4, 1.1], [1.3, 1.2], [-1.8, -0.4], [1.9, -0.2], [0, 1.9], [-0.4, -1.8], [2.2, 1.9], [-2.4, 1.8]];
    heroes.forEach((h, i) => {
      const st = BB.heroStats(h, null, S);
      const e = sc.spawnHero(h, st, c + ring[i][0], c + ring[i][1]);
      e.home = { x: e.x, y: e.y }; e.lookAt = { x: c, y: c };
      sc.face(e, c, c);
    });
    sc.cam = { x: c + 0.6, y: c + 0.4, zoom: 1 };
    sc.isTitle = isTitle;
    return sc;
  }
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
  BB.rebuildCamp = async function () { if (mode === 'camp' || UI.current === 'stronghold') scene = await buildCampScene(false); };

  // banner prop drawn in the world (hooked into battle render through map.customs)
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
    mode = 'title'; UI.show('title');
    $('bContinue').style.display = BB.save && BB.save.heroes.length ? '' : 'none';
    scene = await buildCampScene(true);
    BB.music('calm');
  }
  async function goCamp() {
    mode = 'camp';
    if (BB.save) await BB.loadHeroes(BB.save.heroes);
    scene = await buildCampScene(false);
    const S = BB.save;
    $('campName').textContent = S.banner.name;
    const lv = S.heroes.length ? Math.max(...S.heroes.map((h) => h.level)) : 1;
    const cleared = Object.keys(S.cleared).length;
    $('campSub').textContent = S.heroes.length + ' heroes · ' + cleared + ' / ' + BB.MISSIONS.length + ' missions';
    $('campGold').textContent = S.gold;
    const bc = $('campBanner'); UI.drawBanner(bc.getContext('2d'), S.banner, bc.width, bc.height, 0);
    const perks = S.heroes.reduce((a, h) => a + h.pendingPerks, 0);
    const wb = $('bWarband'); wb.querySelectorAll('.badge').forEach((b) => b.remove());
    if (perks) { const b = UI.el('span', 'badge', perks); wb.appendChild(b); }
    $('campMarks').textContent = S.marks || 0;
    const mb = $('marksBadge'); mb.textContent = S.marks || ''; mb.classList.toggle('on', (S.marks || 0) > 0);
    // the next mission, so the way forward is always one tap away
    let ni = BB.MISSIONS.findIndex((m) => !S.cleared[m.id]);
    const nm = ni >= 0 ? BB.MISSIONS[ni] : null;
    if (nm) {
      const R = BB.REGIONS.find((r) => r.id === nm.region);
      const team = S.team.map(UI.heroById).filter(Boolean);
      $('nxRegion').textContent = 'Next · ' + R.name;
      $('nxName').textContent = nm.name;
      $('nxMeta').textContent = ({ rout: 'Rout', gates: 'Gravegates', defend: 'Defend', boss: 'Boss', duel: 'Duel' }[nm.type]) + ' · foe level ' + BB.foeLevel(nm, team) + (nm.recruit ? ' · a legend may join' : '');
      UI.mapState.sel = ni;
    } else { $('nxRegion').textContent = 'Campaign won'; $('nxName').textContent = 'The Endless Gate'; $('nxMeta').textContent = 'Best: wave ' + (S.endlessBest || 0); UI.mapState.sel = 'endless'; }
    let hint = '';
    if (!cleared) hint = S.heroes.length === 1 ? 'You march alone for now. Win battles to earn Banner Marks and recruit heroes.' : 'Your warband is ready. March on Ashford.';
    else if ((S.marks || 0) > 0 && BB.heroTiers(BB.ROSTER).some(({ tier }) => BB.tierOpen(S, tier) && tier.cost <= S.marks)) hint = 'You have ⚑ ' + S.marks + ' Banner Mark' + (S.marks > 1 ? 's' : '') + '. Recruit a hero in Heroes.';
    else if (perks) hint = 'Heroes have perks to choose — open the Warband.';
    else if (S.inventory.length && cleared < 3) hint = 'New gear waits in the armory. Open the Warband to equip it.';
    else if (S.gold >= 100 && !Object.values(S.buildings).some((v) => v)) hint = 'Spend gold in the Stronghold to grow your camp.';
    else if (BB.campaignDone(S)) hint = 'The Cantor is silenced. The Endless Gate still flickers on the War Map.';
    $('campHint').textContent = hint;
    UI.show('camp');
    BB.music('calm');
    BB.persist();
  }
  BB.goCamp = goCamp;

  function newGame() {
    BB.save = BB.newSave();
    const cap = BB.newCaptain(); BB.save.heroes.push(cap); BB.save.team = [cap.id];
    BB.persist();
    UI.story(BB.STORY.intro, () => goCamp());
    BB.music('calm');
  }

  // ---------------------------------------------------------------- deploy and finish
  let current = null; // {mission, idx}
  BB.deploy = async function (idx) {
    const S = BB.save;
    const team = S.team.map(UI.heroById).filter(Boolean);
    if (!team.length) { UI.toast('Choose who marches in the Warband.'); return; }
    let mission;
    if (idx === 'endless') mission = { id: 'endless', name: 'The Endless Gate', type: 'endless', level: Math.max(2, Math.round(team.reduce((a, h) => a + h.level, 0) / team.length) - 2), layout: 'endless', waves: [['ghoul', 4], ['warden', 1, 'ghoul', 3]], reward: { gold: 40 }, region: 'vale' };
    else mission = BB.MISSIONS[idx];
    current = { mission, idx };
    const pre = BB.STORY[mission.id + 'pre'];
    if (pre && !S.seen[mission.id + 'pre']) { S.seen[mission.id + 'pre'] = 1; UI.story(pre, () => startBattle()); }
    else startBattle();
  };
  async function startBattle() {
    const S = BB.save, M = current.mission;
    const team = S.team.map(UI.heroById).filter(Boolean);
    UI.show('boot'); $('bootmsg').textContent = 'Marching to ' + M.name + '…';
    const region = BB.REGIONS.find((r) => r.id === M.region) || BB.REGIONS[0];
    const biome = M.id === 'endless' ? (Math.random() < 0.5 ? 'vale' : 'sand') : region.biome;
    const arts = ['ghoul', 'warden', 'necro'];
    if (M.boss && BB.FOES[M.boss].art) arts.push(BB.FOES[M.boss].art);
    const pools = new Set(); M.waves.forEach((w) => { for (let i = 0; i < w.length; i += 2) if (BB.FOES[w[i]].pool) pools.add(BB.FOES[w[i]].pool); });
    if (M.boss && BB.FOES[M.boss].pool) { pools.add(BB.FOES[M.boss].pool); if (BB.FOES[M.boss].poolPick) arts.push('h/' + BB.FOES[M.boss].poolPick); }
    if (M.boss === 'regent') pools.add('skel');
    if (M.id === 'endless') ['skel', 'wraith', 'skelarcher'].forEach((p) => pools.add(p));
    const rr = BB.rng(Date.now() & 0xffff);
    await Promise.all([BB.loadEnv(biome), BB.loadEnv('vale'), BB.loadEnv('ground'), BB.loadOther(), BB.loadHeroes(team)]
      .concat(arts.map((a) => BB.loadChar(a)), [...pools].map((p) => pickLoad(BB.poolKeys(p), 4, rr)), [pickLoad(BB.npcKeys(), 4, rr)]));
    const seed = (M.id.charCodeAt(1) || 7) * 1000 + (S.cleared[M.id] ? Math.floor(Math.random() * 999) : 1);
    const map = BB.buildMap(M.layout, biome, seed, { night: region.night || M.id === 'm12' });
    BB.renderGround(map);
    scene = new BB.Battle({ map, mission: M, heroes: team, level: M.id === 'endless' ? M.level : BB.foeLevel(M, team), save: S, seed, intro: true });
    scene.cam.zoom = 1;
    mode = 'battle';
    buildHud();
    UI.show('hud');
    BB.music(M.type === 'boss' || M.type === 'duel' ? 'boss' : 'battle');
    tutorial = M.tutorial && !S.seen.tutorial ? 0 : -1;
  }

  function finishBattle() {
    const S = BB.save, B = scene, M = current.mission, win = B.result.win;
    const team = B.ents.filter((e) => e.side === 'hero' && !e.ward).map((e) => e.hero);
    const yard = 1 + (S.buildings.yard || 0) * 0.15, market = 1 + (S.buildings.market || 0) * 0.12;
    const firstClear = win && !S.cleared[M.id];
    let base = (40 + M.level * 28) * (M.type === 'boss' || M.type === 'duel' ? 1.6 : 1);
    if (M.id === 'endless') base = 30 + (B.obj.endlessWave || 0) * 35 + B.level * 6;
    if (!win) base *= 0.35;
    const res = { win, why: B.result.why, title: M.name, heroes: [], kills: B.kills };
    // MVP: the hero who dealt the most; grade: how many stood at the end and how quickly
    const ents = B.heroList; let mvp = null; for (const e of ents) if (!mvp || (e.dealt || 0) > (mvp.dealt || 0)) mvp = e;
    res.mvp = mvp && mvp.hero; res.mvpDmg = mvp ? Math.round(mvp.dealt || 0) : 0;
    if (win) {
      const alive = ents.filter((e) => !e.dead).length / ents.length, fast = B.time < 75;
      res.grade = alive >= 1 && fast ? 'S' : alive >= 0.75 ? 'A' : alive >= 0.5 ? 'B' : 'C';
    }
    for (const h of team) { const xp = Math.round(base * yard); const lv = BB.grantXp(h, xp); res.heroes.push({ hero: h, xp, levels: lv }); if (lv.length) BB.sfx('levelup'); }
    const bench = Math.round(base * yard * 0.3);
    if (bench) { for (const h of S.heroes) if (!team.includes(h)) BB.grantXp(h, bench); res.bench = bench; }
    let gold = Math.round(B.goldGot * market);
    if (win) gold += Math.round(M.reward.gold * (firstClear ? 1 : 0.5) * market);
    if (res.grade === 'S') gold = Math.round(gold * 1.25); else if (res.grade === 'A') gold = Math.round(gold * 1.1);
    res.gold = gold; S.gold += gold;
    S.stats.kills += B.kills;
    if (B.loot && B.loot.length) S.inventory.push(...B.loot);
    res.marks = BB.marksFor(M, firstClear && M.id !== 'endless');
    if (win && res.grade === 'S' && !S.seen['S_' + M.id] && M.id !== 'endless') { S.seen['S_' + M.id] = 1; res.marks++; }
    S.marks = (S.marks || 0) + (win ? res.marks : 0); if (!win) res.marks = 0;
    if (M.id === 'endless') { res.endlessWave = (B.obj.endlessWave || 0) + 1; S.endlessBest = Math.max(S.endlessBest || 0, res.endlessWave); res.items = BB.rollLoot(BB.rng(Date.now()), { level: B.level, type: 'rout' }, team, S, Math.min(4, 1 + (res.endlessWave >> 1))); S.inventory.push(...res.items); }
    else if (win) {
      res.items = BB.rollLoot(BB.rng(Date.now()), M, team, S); S.inventory.push(...res.items);
      S.cleared[M.id] = (S.cleared[M.id] || 0) + 1;
      if (firstClear && M.recruit && !S.heroes.find((h) => h.legend === M.recruit)) {
        const avg = Math.max(M.level, Math.round(team.reduce((a, h) => a + h.level, 0) / team.length));
        const L = BB.newHero({ legend: M.recruit, level: avg }); S.heroes.push(L); res.recruit = M.recruit;
        if (S.team.length < 4) S.team.push(L.id);
        if (S.heroes.length > BB.rosterCap(S)) S.buildings.barracks = Math.min(3, (S.buildings.barracks || 0) + 1);
      }
      if (M.id === 'm11' && !S.heroes.find((h) => h.legend === 'talia')) { const L = BB.newHero({ legend: 'talia', level: M.level }); S.heroes.push(L); res.recruit = 'talia'; if (S.team.length < 4) S.team.push(L.id); }
    }
    if (M.tutorial) S.seen.tutorial = 1;
    if (B.loot && B.loot.length) res.items = (res.items || []).concat(B.loot);
    BB.persist();
    const after = () => {
      const post = win && firstClear ? BB.STORY[M.id + 'post'] : null;
      const next = () => { const pp = S.heroes.find((h) => h.pendingPerks > 0 && S.team.includes(h.id)); if (pp) UI.openPerk(pp, goCamp); else goCamp(); };
      if (post) UI.story(post, next); else next();
    };
    UI.results(res, after, M.id !== 'endless' ? () => BB.deploy(current.idx) : null);
  }

  // ---------------------------------------------------------------- HUD (the commander's view)
  let forgeDone = null; // the hero creator is retired; kept so its old screen stays inert
  let tutorial = -1, tutT = 0;
  const TUT = [
    ['Your warband fights on its own. Tap a hero card to unleash their skill.', (b) => b.usedSkill],
    ['Tap the ground to plant your banner. The warband holds there.', (b) => b.held],
    ['Tap an enemy to focus every blade on it.', (b) => b.focused],
    ['Two skills close together make a COMBO: the whole warband hits harder.', (b) => b.combo >= 2 || b.waveIdx >= 3],
    ['When the banner gauge fills, raise it.', (b) => b.rallied || b.waveIdx >= 3],
  ];
  const SHORT = { shieldwall: 'Wall', leap: 'Leap', volley: 'Storm', flame: 'Breath', sanctuary: 'Heal', whirlwind: 'Whirl', shadowstep: 'Step', impale: 'Impale' };
  function buildHud() {
    const box = $('cards'); box.innerHTML = '';
    scene.heroList.forEach((e, i) => {
      const b = UI.el('button', 'hcard');
      b.style.setProperty('--hc', e.color);
      b.appendChild(UI.copyCanvas(BB.portrait(e.hero, 64)));
      b.appendChild(UI.el('div', 'ring'));
      b.appendChild(UI.el('div', 'sk', SHORT[BB.CALLINGS[e.calling].skill.id] || 'Skill'));
      b.appendChild(UI.el('div', 'hp', '<i></i>'));
      b.appendChild(UI.el('div', 'k', i + 1));
      b.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); ev.preventDefault(); BB.audioUnlock(); if (!scene.castSkill(i)) b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 250); });
      box.appendChild(b); e.chip = b;
    });
    const kk = $('keys'); kk.style.display = matchMedia('(pointer:coarse)').matches ? 'none' : ''; kk.style.animation = 'none'; void kk.offsetWidth; kk.style.animation = '';
    $('bSpeed').textContent = (BB.save.settings.speed || 1) + '×';
    $('cutin').classList.remove('on');
    letterbox(true, current.mission.name, scene.obj ? scene.obj.text : '');
  }
  let lbTimer = 0;
  function letterbox(on, title, sub) {
    const h = $('hud');
    h.classList.toggle('cine', on);
    if (title !== undefined) { $('lbTitle').textContent = title || ''; $('lbSub').textContent = sub || ''; }
  }
  let cutShown = null;
  function updateHud(dt) {
    const B = scene;
    for (const e of B.heroList) {
      const c = e.chip; if (!c) continue;
      const ready = !e.dead && e.cd <= 0;
      c.classList.toggle('dead', !!e.dead); c.classList.toggle('ready', ready);
      c.classList.toggle('urge', ready && !B.autoSkills && (e.readyT || 0) > 2.5);
      c.querySelector('.hp i').style.width = Math.max(0, e.hp / e.maxhp * 100) + '%';
      c.querySelector('.ring').style.setProperty('--p', (e.cd > 0 ? (1 - e.cd / e.cdMax) * 100 : 100) + '%');
    }
    $('objText').textContent = B.obj ? B.obj.text : '';
    const boss = B.ents.find((e) => e.boss && !e.dead);
    const bb = $('bossbar');
    if (boss && !B.intro) { bb.style.display = 'block'; bb.querySelector('.nm').textContent = boss.F.name + (boss.enraged ? ' — enraged' : ''); bb.querySelector('i').style.width = (boss.hp / boss.maxhp * 100) + '%'; }
    else bb.style.display = 'none';
    const r = $('aRally'); const full = B.rally >= 100 && B.rallyT <= 0;
    r.classList.toggle('ready', full);
    r.style.setProperty('--p', (B.rallyT > 0 ? B.rallyT / 8 * 100 : B.rally) + '%');
    $('stance').classList.toggle('on', B.order.mode === 'hold' && !B.result);
    // cinematic bars: the intro and the first moments of a rally or a victory
    if (B.intro) letterbox(true);
    else if (B.result && B.result.win && !B.result.shown) letterbox(true, 'Victory', current.mission.name);
    else if (B.rallyT > 6.6) letterbox(true, '', '');
    else letterbox(false);
    // skill cut-in
    const ci = B.cutins[B.cutins.length - 1];
    const cut = $('cutin');
    if (ci && ci.t < 1.1) {
      if (cutShown !== ci) {
        cutShown = ci;
        const cv = cut.querySelector('canvas'), g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(BB.portrait(ci.hero, 96), 0, 0);
        cut.querySelector('.ciName').textContent = ci.hero.name; cut.querySelector('.ciSkill').textContent = ci.name;
        cut.style.setProperty('--hc', ci.color);
        cut.classList.remove('on'); void cut.offsetWidth; cut.classList.add('on');
      }
    } else if (cut.classList.contains('on') && (!ci || ci.t >= 1.1)) cut.classList.remove('on');
    if (B.cutins.length > 4) B.cutins.splice(0, B.cutins.length - 4);
    // banners
    const bn = $('bnr'); const top = B.banners[B.banners.length - 1];
    if (top && !B.intro) {
      const k = top.t / top.dur; const a = Math.min(1, top.t * 4, (1 - k) * 4);
      if (bn.dataset.t !== top.text) { bn.innerHTML = '<div class="' + top.kind + '">' + UI.esc(top.text) + '</div>'; bn.dataset.t = top.text; }
      bn.style.opacity = a; bn.firstChild.style.transform = 'scale(' + (1 + (1 - Math.min(1, top.t * 3)) * 0.3) + ')';
    } else { bn.style.opacity = 0; bn.dataset.t = ''; }
    // tutorial
    const tut = $('tut');
    if (tutorial >= 0 && tutorial < TUT.length && !B.intro && !B.result) {
      B.waveIdx = B.waveIdx || 0;
      tut.style.display = 'block'; tut.textContent = TUT[tutorial][0];
      tutT += dt;
      if (TUT[tutorial][1](B) && tutT > 1.5) { tutorial++; tutT = 0; BB.sfx('click'); }
    } else tut.style.display = 'none';
  }

  // ---------------------------------------------------------------- input: taps on the field are orders
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    keys[e.code] = true; BB.audioUnlock();
    if (mode === 'battle' && scene) {
      if (/Digit[1-4]/.test(e.code)) scene.castSkill(+e.code.slice(5) - 1);
      if (e.code === 'KeyR' || e.code === 'KeyQ') { if (scene.useRally()) scene.rallied = true; }
      if (e.code === 'KeyA') scene.advance();
      if (e.code === 'KeyF') toggleSpeed();
      if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Space') { togglePause(); e.preventDefault(); }
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  let tap = null;
  cv.addEventListener('pointerdown', (e) => { if (mode !== 'battle') return; BB.audioUnlock(); tap = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  cv.addEventListener('pointerup', (e) => {
    if (mode !== 'battle' || !tap || !scene) return;
    const moved = Math.hypot(e.clientX - tap.x, e.clientY - tap.y), dur = performance.now() - tap.t; tap = null;
    if (moved > 14 || dur > 600) return;
    const w = scene.screenToWorld(e.clientX * DPR, e.clientY * DPR);
    if (w) scene.commandAt(w.x, w.y);
  });
  hold('aRally', () => { if (scene && scene.useRally()) scene.rallied = true; });
  function hold(id, on) {
    const b = $(id);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); BB.audioUnlock(); on(); });
  }
  function toggleSpeed() {
    const s = BB.save.settings; s.speed = (s.speed || 1) === 1 ? 2 : 1; BB.persist();
    $('bSpeed').textContent = s.speed + '×';
  }
  function togglePause() {
    if (mode !== 'battle' || !scene || scene.result) return;
    scene.paused = !scene.paused; UI.modal('mPause', scene.paused);
  }

  // ---------------------------------------------------------------- buttons
  UI.click($('bNew'), () => { if (BB.save && BB.save.heroes.length) UI.confirm('Start a new warband? Your current save will be replaced.', newGame); else newGame(); });
  UI.click($('bContinue'), () => goCamp());
  UI.click($('bWarMap'), async () => { mode = 'menu'; await BB.loadHeroes(BB.save.heroes); UI.openMap(); });
  UI.click($('bWarband'), async () => { mode = 'menu'; await BB.loadHeroes(BB.save.heroes); UI.openWarband(); });
  UI.click($('bTavern'), () => { mode = 'menu'; UI.openTavern(); });
  UI.click($('bTvBack'), () => goCamp());
  UI.click($('bStronghold'), () => { UI.openStronghold(); });
  UI.click($('bWbBack'), () => goCamp());
  UI.click($('bShBack'), () => goCamp());
  UI.click($('bMapBack'), () => goCamp());
  $('mapCv').addEventListener('pointerdown', (e) => UI.mapClick(e));
  UI.click($('fConfirm'), () => { const h = UI.forge.hero; if (!h.name.trim()) h.name = BB.randomName(); BB.sfx('forge'); forgeDone && forgeDone(h); });
  UI.click($('fRandom'), () => UI.forgeRandom());
  UI.click($('fRotL'), () => (UI.forge.dir = (UI.forge.dir + 7) % 8));
  UI.click($('fRotR'), () => (UI.forge.dir = (UI.forge.dir + 1) % 8));
  document.querySelectorAll('#forge [data-anim]').forEach((b) => UI.click(b, () => { UI.forge.anim = b.dataset.anim; UI.forge.t = 0; }));
  document.querySelectorAll('#forge .tabs button').forEach((b) => UI.click(b, () => { UI.forge.tab = b.dataset.tab; UI.forgeTabs(); }));
  UI.click($('bPause'), togglePause);
  UI.click($('bResume'), togglePause);
  UI.click($('bSpeed'), toggleSpeed);
  UI.click($('bAdvance'), () => scene && scene.advance());
  UI.click($('bRetreat'), () => { UI.modal('mPause', false); scene.paused = false; scene.lose('Retreated'); });
  const openSettings = () => {
    const s = BB.save ? BB.save.settings : BB.newSave().settings;
    $('sMusic').value = s.music; $('sSfx').value = s.sfx; $('sShake').checked = s.shake; $('sAuto').checked = !!s.autoSkills;
    UI.modal('mSettings');
  };
  ['bSettings1', 'bSettings2', 'bSettings3'].forEach((id) => UI.click($(id), openSettings));
  UI.click($('bSetClose'), () => {
    if (!BB.save) BB.save = BB.newSave();
    const s = BB.save.settings; s.music = +$('sMusic').value; s.sfx = +$('sSfx').value; s.shake = $('sShake').checked; s.autoSkills = $('sAuto').checked; if (scene && !scene.peaceful) scene.autoSkills = s.autoSkills;
    BB.setVolumes(); BB.persist(); UI.modal('mSettings', false);
  });
  ['sMusic', 'sSfx'].forEach((id) => $(id).addEventListener('input', () => { if (BB.save) { BB.save.settings.music = +$('sMusic').value; BB.save.settings.sfx = +$('sSfx').value; BB.setVolumes(); } }));
  UI.click($('bWipe'), () => UI.confirm('Erase the warband for good?', () => { localStorage.removeItem(KEY); location.reload(); }));

  // ---------------------------------------------------------------- loop
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    if (scene && (mode === 'title' || mode === 'camp' || mode === 'battle' || mode === 'menu')) {
      scene.cam.zoom = camZoom() * (scene.zoomK || 1);
      if (scene.isTitle) { scene.cam.x = scene.map.w / 2 + Math.sin(now / 9000) * 1.6 - 1.2; scene.cam.y = scene.map.h / 2 + Math.cos(now / 11000) * 0.8 + 0.4; }
      const reps = mode === 'battle' && !scene.intro && !scene.result && BB.save && BB.save.settings.speed === 2 ? 2 : 1;
      for (let i = 0; i < reps; i++) scene.update(dt, null);
      const visibleScene = !['forge', 'warband', 'stronghold', 'map', 'bannerEdit', 'boot', 'tavern'].includes(UI.current);
      if (visibleScene) scene.render(ctx, W, H, DPR);
      if (mode === 'battle') {
        updateHud(dt);
        if (scene.result && scene.result.t > 2.6 && !scene.result.shown) { scene.result.shown = true; finishBattle(); }
      }
    } else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0d0a08'; ctx.fillRect(0, 0, W, H); }
    if (UI.current === 'forge') UI.forgeRender(dt);
    if (UI.current === 'map') UI.mapRender();
    if (UI.current === 'tavern') UI.tavernRender(dt);
    if (UI.current === 'bannerEdit' && UI.bannerAnim) UI.bannerAnim();
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- boot
  async function boot() {
    BB.save = loadSave();
    try {
      await BB.loadBase((p) => { document.querySelector('#boot .bar i').style.width = Math.round(p * 100) + '%'; });
    BB.loadPortraits();
    } catch (e) { $('bootmsg').textContent = 'Could not load the art: ' + e.message; throw e; }
    requestAnimationFrame(frame);
    ['ghoul', 'warden', 'necro', 'witch', 'sunguard', 'shade', 'sunblade', 'brenna', 'reaper'].forEach((k) => BB.loadChar(k));
    BB.loadEnv('sand');
    const q = new URLSearchParams(location.search);
    if (q.has('test')) { BB.testHooks = { goCamp, newGame, startBattle: (idx) => BB.deploy(idx), scene: () => scene, finish: finishBattle, mode: () => mode }; }
    await goTitle();
  }
  boot();
})();
