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

  // ---------------------------------------------------------------- scenes
  function sceneHeroes() {
    const S = BB.save;
    const team = (S && S.team.length ? S.team.map(UI.heroById).filter(Boolean) : []);
    const others = S ? S.heroes.filter((h) => !S.team.includes(h.id)) : [];
    return team.concat(others).slice(0, 8);
  }
  function titleHeroes() {
    const r = BB.rng(7);
    return ['vanguard', 'arcanist', 'ranger', 'berserker', 'warpriest'].map((c, i) => BB.newHero({ calling: c, seed: 100 + i * 17, name: 'x' }));
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
    m.add('Torch2', c - 2.5, c + 2.2, { biome: 'vale' }); m.anim('torch', c - 2.48, c + 2.22, { sc: 0.7, pole: 1 }); m.lights.push({ x: c - 2.5, y: c + 2.2, rad: 2.5, col: '255,170,80' });
    for (const p of m.props) { const s = BB.iso(p.x, p.y); p.depth = p.x + p.y; p.sx = s.x; p.sy = s.y; }
    m.props.sort((a, b2) => a.depth - b2.depth);
    rebuildGrid(m);
    BB.renderGround(m);
    const heroes = isTitle ? titleHeroes() : sceneHeroes();
    const sc = new BB.Battle({ map: m, heroes: [], peaceful: true, save: S, seed: 3 });
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
    $('bHire').textContent = S.freeHires > 0 ? 'Forge Hero (free)' : 'Forge Hero';
    let hint = '';
    if (!cleared) hint = 'Your warband is ready. Open the War Map and march on Ashford.';
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
    UI.story(BB.STORY.intro, () => {
      UI.openBannerEdit(() => {
        BB.persist();
        UI.openForge({ captain: true, calling: 'vanguard', title: 'Forge Your Captain', confirm: 'This is my captain', back: null });
        forgeDone = (h) => {
          h.captain = true; BB.save.heroes.push(h); BB.save.team = [h.id]; BB.persist();
          forgeCompanion(1);
        };
      });
    });
    BB.music('calm');
  }
  function forgeCompanion(n) {
    const S = BB.save;
    const calling = n === 1 ? 'ranger' : 'warpriest';
    UI.openForge({ calling, title: 'Forge Companion ' + n + ' of 2', confirm: n === 1 ? 'Recruit & next' : 'Recruit & march', back: null });
    UI.toast('Every banner needs a warband. Forge two companions.');
    forgeDone = (h) => {
      S.heroes.push(h); S.team.push(h.id); S.freeHires = Math.max(0, S.freeHires - 1); BB.persist();
      if (n === 1) forgeCompanion(2); else goCamp();
    };
  }
  let forgeDone = null;
  function hire() {
    const S = BB.save;
    if (S.heroes.length >= BB.rosterCap(S)) { UI.toast('The barracks are full. Build more in the Stronghold.'); return; }
    const cost = S.freeHires > 0 ? 0 : BB.HIRE_COST(S.heroes.length);
    if (S.gold < cost) { UI.toast('You need ' + cost + ' gold to forge another hero.'); return; }
    const avg = Math.max(1, Math.round(S.heroes.reduce((a, h) => a + h.level, 0) / Math.max(1, S.heroes.length)) - 1);
    UI.openForge({ title: 'Forge a Hero', confirm: cost ? 'Forge · ' + cost + ' gold' : 'Forge (free)', cost: cost || 0, back: goCamp, hero: BB.newHero({ level: avg }) });
    forgeDone = (h) => {
      if (cost) S.gold -= cost; else S.freeHires--;
      S.heroes.push(h); if (S.team.length < 4) S.team.push(h.id);
      BB.persist(); UI.toast(h.name + ' joins the warband at level ' + h.level + '.'); BB.sfx('levelup'); goCamp();
    };
  }

  // ---------------------------------------------------------------- deploy and finish
  let current = null; // {mission, idx}
  BB.deploy = async function (idx) {
    const S = BB.save;
    const team = S.team.map(UI.heroById).filter(Boolean);
    if (!team.length) { UI.toast('Choose who marches in the Warband.'); return; }
    let mission;
    if (idx === 'endless') mission = { id: 'endless', name: 'The Endless Gate', type: 'endless', level: Math.max(3, Math.round(team.reduce((a, h) => a + h.level, 0) / team.length)), layout: 'endless', waves: [['ghoul', 4], ['warden', 1, 'ghoul', 3]], reward: { gold: 40 }, region: 'vale' };
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
    const arts = ['ghoul', 'warden', 'necro'].concat(team.filter((h) => h.legend).map((h) => BB.LEGENDS[h.legend].art));
    if (M.boss) arts.push(BB.FOES[M.boss].art);
    await Promise.all([BB.loadEnv(biome), BB.loadEnv('vale')].concat(arts.map((a) => BB.loadChar(a))));
    const seed = (M.id.charCodeAt(1) || 7) * 1000 + (S.cleared[M.id] ? Math.floor(Math.random() * 999) : 1);
    const map = BB.buildMap(M.layout, biome, seed, { night: region.night || M.id === 'm12' });
    BB.renderGround(map);
    scene = new BB.Battle({ map, mission: M, heroes: team, level: BB.foeLevel(M, team), save: S, seed });
    scene.cam.zoom = 1;
    mode = 'battle';
    buildHud();
    UI.show('hud');
    BB.music(M.type === 'boss' || M.type === 'duel' ? 'boss' : 'battle');
    scene.banner(M.name, 2.2, 'small');
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
    for (const h of team) { const xp = Math.round(base * yard); const lv = BB.grantXp(h, xp); res.heroes.push({ hero: h, xp, levels: lv }); if (lv.length) BB.sfx('levelup'); }
    const bench = Math.round(base * yard * 0.3);
    if (bench) { for (const h of S.heroes) if (!team.includes(h)) BB.grantXp(h, bench); res.bench = bench; }
    let gold = Math.round(B.goldGot * market);
    if (win) gold += Math.round(M.reward.gold * (firstClear ? 1 : 0.5) * market);
    res.gold = gold; S.gold += gold;
    S.stats.kills += B.kills;
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
      if (M.id === 'm11' && !S.heroes.find((h) => h.legend === 'talia')) { const L = BB.newHero({ legend: 'talia', level: M.level }); S.heroes.push(L); res.recruit = 'talia'; }
    }
    if (M.tutorial) S.seen.tutorial = 1;
    BB.persist();
    const after = () => {
      const post = win && firstClear ? BB.STORY[M.id + 'post'] : null;
      const next = () => { const pp = S.heroes.find((h) => h.pendingPerks > 0 && S.team.includes(h.id)); if (pp) UI.openPerk(pp, goCamp); else goCamp(); };
      if (post) UI.story(post, next); else next();
    };
    UI.results(res, after, M.id !== 'endless' ? () => BB.deploy(current.idx) : null);
  }

  // ---------------------------------------------------------------- HUD
  let tutorial = -1, tutT = 0;
  const TUT = [
    ['Move with the left thumb (or WASD).', (b) => b.moved],
    ['Hold ATTACK (or J) to strike the nearest foe.', (b) => b.kills > 0],
    ['Use your SKILL (K) — every calling has one.', (b) => b.usedSkill],
    ['DODGE (Space) through a blow for a Perfect Dodge.', (b) => b.dodged],
    ['Tap a portrait (1-4) to take command of another hero.', (b) => b.swapped],
    ['When the banner gauge fills, raise it: R or the ⚑ button.', (b) => b.rallied || b.waveIdx >= 3],
  ];
  function buildHud() {
    const box = $('party'); box.innerHTML = '';
    const hs = scene.ents.filter((e) => e.side === 'hero' && !e.ward);
    hs.forEach((e, i) => {
      const b = UI.el('button', 'pchip');
      b.appendChild(UI.copyCanvas(BB.portrait(e.hero, 54)));
      b.appendChild(UI.el('div', 'hp', '<i></i>')); b.appendChild(UI.el('div', 'cd', '<i></i>'));
      b.appendChild(UI.el('div', 'k', i + 1));
      b.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); scene.swapTo(i); scene.swapped = true; });
      box.appendChild(b); e.chip = b;
    });
    $('keys').style.display = matchMedia('(pointer:coarse)').matches ? 'none' : '';
    $('bAuto').classList.toggle('on', !!BB.save.settings.auto);
    $('bAuto').style.color = BB.save.settings.auto ? '#e8c66a' : '';
  }
  function updateHud() {
    const B = scene;
    for (const e of B.ents) {
      if (!e.chip) continue;
      e.chip.classList.toggle('on', e === B.controlled);
      e.chip.classList.toggle('dead', !!e.dead);
      e.chip.querySelector('.hp i').style.width = Math.max(0, e.hp / e.maxhp * 100) + '%';
      e.chip.querySelector('.cd i').style.width = (e.cd > 0 ? (1 - e.cd / e.cdMax) * 100 : 100) + '%';
    }
    $('objText').textContent = B.obj ? B.obj.text : '';
    const boss = B.ents.find((e) => e.boss && !e.dead);
    const bb = $('bossbar');
    if (boss) { bb.style.display = 'block'; bb.querySelector('.nm').textContent = boss.F.name + (boss.enraged ? ' — ENRAGED' : ''); bb.querySelector('i').style.width = (boss.hp / boss.maxhp * 100) + '%'; }
    else bb.style.display = 'none';
    const c = B.controlled;
    if (c) {
      const C = BB.CALLINGS[c.calling];
      $('aSkillName').textContent = C.skill.name.split(' ')[0].toUpperCase();
      $('aSkill').querySelector('.cdm').style.setProperty('--p', (c.cd > 0 ? c.cd / c.cdMax * 100 : 0) + '%');
    }
    const r = $('aRally'); r.classList.toggle('ready', B.rally >= 100 && B.rallyT <= 0);
    r.querySelector('.fill').style.height = (B.rallyT > 0 ? B.rallyT / 8 * 100 : B.rally) + '%';
    // banners
    const bn = $('bnr'); const top = B.banners[B.banners.length - 1];
    if (top) {
      const k = top.t / top.dur; const a = Math.min(1, top.t * 4, (1 - k) * 4);
      if (bn.dataset.t !== top.text) { bn.innerHTML = '<div class="' + top.kind + '">' + UI.esc(top.text) + '</div>'; bn.dataset.t = top.text; }
      bn.style.opacity = a; bn.firstChild.style.transform = 'scale(' + (1 + (1 - Math.min(1, top.t * 3)) * 0.3) + ')';
    } else { bn.style.opacity = 0; bn.dataset.t = ''; }
    // tutorial
    const tut = $('tut');
    if (tutorial >= 0 && tutorial < TUT.length) {
      B.waveIdx = B.waveIdx || 0;
      tut.style.display = 'block'; tut.textContent = TUT[tutorial][0];
      tutT += 1 / 60;
      if (TUT[tutorial][1](B) && tutT > 1.2) { tutorial++; tutT = 0; BB.sfx('click'); }
    } else tut.style.display = 'none';
  }

  // ---------------------------------------------------------------- input
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    keys[e.code] = true; BB.audioUnlock();
    if (mode === 'battle' && scene) {
      if (e.code === 'KeyK' || e.code === 'KeyE') edge.skill = true;
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'KeyL') edge.dodge = true;
      if (e.code === 'KeyR' || e.code === 'KeyQ') edge.rally = true;
      if (/Digit[1-4]/.test(e.code)) { scene.swapTo(+e.code.slice(5) - 1); scene.swapped = true; }
      if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
      if (e.code === 'Space') e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  const edge = { skill: false, dodge: false, rally: false };
  let joy = null, atkHeld = false;
  const joyEl = $('joy'), base = joyEl.querySelector('.base'), knob = joyEl.querySelector('.knob');
  joyEl.addEventListener('pointerdown', (e) => {
    BB.audioUnlock();
    joy = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
    const r = joyEl.getBoundingClientRect();
    base.style.left = knob.style.left = (e.clientX - r.left) + 'px'; base.style.top = knob.style.top = (e.clientY - r.top) + 'px';
    base.style.display = knob.style.display = 'block';
    joyEl.setPointerCapture(e.pointerId);
  });
  joyEl.addEventListener('pointermove', (e) => {
    if (!joy || e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.x, dy = e.clientY - joy.y; const d = Math.hypot(dx, dy), max = 52;
    if (d > max) { joy.x += dx - dx / d * max; joy.y += dy - dy / d * max; dx = dx / d * max; dy = dy / d * max; const r = joyEl.getBoundingClientRect(); base.style.left = (joy.x - r.left) + 'px'; base.style.top = (joy.y - r.top) + 'px'; }
    joy.dx = dx / max; joy.dy = dy / max;
    const r = joyEl.getBoundingClientRect();
    knob.style.left = (joy.x + dx - r.left) + 'px'; knob.style.top = (joy.y + dy - r.top) + 'px';
  });
  const joyEnd = (e) => { if (joy && e.pointerId === joy.id) { joy = null; base.style.display = knob.style.display = 'none'; } };
  joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);
  const hold = (id, on, off) => {
    const b = $(id);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); BB.audioUnlock(); on(); b.setPointerCapture(e.pointerId); });
    const up = () => off && off();
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  };
  hold('aAtk', () => (atkHeld = true), () => (atkHeld = false));
  hold('aSkill', () => (edge.skill = true));
  hold('aDodge', () => (edge.dodge = true));
  hold('aRally', () => (edge.rally = true));
  function readInput() {
    let mx = 0, my = 0;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
    if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1;
    if (mx || my) { const l = Math.hypot(mx, my); mx /= l; my /= l; }
    if (joy) { mx = joy.dx; my = joy.dy; }
    input.mx = mx; input.my = my;
    input.atk = atkHeld || !!keys.KeyJ || !!keys.Enter;
    input.skill = edge.skill; input.dodge = edge.dodge; input.rally = edge.rally;
    edge.skill = edge.dodge = edge.rally = false;
    if (scene && !scene.peaceful) {
      if (Math.hypot(mx, my) > 0.3) scene.moved = true;
      if (input.skill && scene.controlled && scene.controlled.cd <= 0) scene.usedSkill = true;
      if (input.dodge) scene.dodged = true;
    }
    return input;
  }
  function togglePause() {
    if (mode !== 'battle' || !scene || scene.result) return;
    scene.paused = !scene.paused; UI.modal('mPause', scene.paused);
  }

  // ---------------------------------------------------------------- buttons
  UI.click($('bNew'), () => { if (BB.save && BB.save.heroes.length) UI.confirm('Start a new warband? Your current save will be replaced.', newGame); else newGame(); });
  UI.click($('bContinue'), () => goCamp());
  UI.click($('bWarMap'), () => { mode = 'menu'; UI.openMap(); });
  UI.click($('bWarband'), () => { mode = 'menu'; UI.openWarband(); });
  UI.click($('bStronghold'), () => { UI.openStronghold(); });
  UI.click($('bHire'), () => { mode = 'menu'; hire(); });
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
  UI.click($('bAuto'), () => { BB.save.settings.auto = !BB.save.settings.auto; BB.persist(); $('bAuto').style.color = BB.save.settings.auto ? '#e8c66a' : ''; UI.toast(BB.save.settings.auto ? 'Full auto: your hero fights alone' : 'You command the hero'); });
  UI.click($('bRetreat'), () => { UI.modal('mPause', false); scene.paused = false; scene.lose('Retreated'); });
  const openSettings = () => {
    const s = BB.save ? BB.save.settings : BB.newSave().settings;
    $('sMusic').value = s.music; $('sSfx').value = s.sfx; $('sShake').checked = s.shake; $('sAuto').checked = s.auto;
    UI.modal('mSettings');
  };
  ['bSettings1', 'bSettings2', 'bSettings3'].forEach((id) => UI.click($(id), openSettings));
  UI.click($('bSetClose'), () => {
    if (!BB.save) BB.save = BB.newSave();
    const s = BB.save.settings; s.music = +$('sMusic').value; s.sfx = +$('sSfx').value; s.shake = $('sShake').checked; s.auto = $('sAuto').checked;
    BB.setVolumes(); BB.persist(); UI.modal('mSettings', false);
  });
  ['sMusic', 'sSfx'].forEach((id) => $(id).addEventListener('input', () => { if (BB.save) { BB.save.settings.music = +$('sMusic').value; BB.save.settings.sfx = +$('sSfx').value; BB.setVolumes(); } }));
  UI.click($('bWipe'), () => UI.confirm('Erase the warband for good?', () => { localStorage.removeItem(KEY); location.reload(); }));

  // ---------------------------------------------------------------- loop
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    if (scene && (mode === 'title' || mode === 'camp' || mode === 'battle' || mode === 'menu')) {
      const inp = mode === 'battle' ? readInput() : null;
      if (mode === 'battle' && inp) {
        if (inp.rally && scene.useRally()) scene.rallied = true;
      }
      scene.cam.zoom = camZoom();
      if (scene.isTitle) { scene.cam.x = scene.map.w / 2 + Math.sin(now / 9000) * 1.6 - 1.2; scene.cam.y = scene.map.h / 2 + Math.cos(now / 11000) * 0.8 + 0.4; }
      scene.update(dt, inp);
      const visibleScene = !['forge', 'warband', 'stronghold', 'map', 'bannerEdit', 'boot'].includes(UI.current);
      if (visibleScene) scene.render(ctx, W, H, DPR);
      if (mode === 'battle') {
        updateHud();
        if (scene.result && scene.result.t > 2.6 && !scene.result.shown) { scene.result.shown = true; finishBattle(); }
      }
    } else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0d0a08'; ctx.fillRect(0, 0, W, H); }
    if (UI.current === 'forge') UI.forgeRender(dt);
    if (UI.current === 'map') UI.mapRender();
    if (UI.current === 'bannerEdit' && UI.bannerAnim) UI.bannerAnim();
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- boot
  async function boot() {
    BB.save = loadSave();
    try {
      await BB.loadBase((p) => { document.querySelector('#boot .bar i').style.width = Math.round(p * 100) + '%'; });
    } catch (e) { $('bootmsg').textContent = 'Could not load the art: ' + e.message; throw e; }
    requestAnimationFrame(frame);
    ['ghoul', 'warden', 'necro', 'witch', 'sunguard', 'shade', 'sunblade'].forEach((k) => BB.loadChar(k));
    BB.loadEnv('sand');
    const q = new URLSearchParams(location.search);
    if (q.has('test')) { BB.testHooks = { goCamp, newGame, startBattle: (idx) => BB.deploy(idx), scene: () => scene, finish: finishBattle, mode: () => mode }; }
    await goTitle();
  }
  boot();
})();
