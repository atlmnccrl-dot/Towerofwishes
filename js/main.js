/*
 * Tower of Wishes — game shell
 * Menus, the story campaign (scenes, choices, character select, chapters),
 * HUD, input, the fixed-step loop, and saving hearts/injuries/story.
 */
(function () {
  'use strict';
  const Sim = window.TowSim, Pg = window.TowProgress, Render = window.TowRender, Story = window.TowStory;
  const Camp = window.TowCampaign, Prog = window.TowProgression;
  const $ = (id) => document.getElementById(id);
  const DT = 1 / 60;
  const SAVE_KEY = 'tow.save.v1';

  // ------------------------------------------------------------ save
  function loadSave() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { raw = null; }
    return Pg.tick(Pg.normalise(raw, Date.now()), Date.now());
  }
  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable: progress lasts this visit */ }
  }
  let save = loadSave(), story = null;
  let prog = null;
  function bindStory() { story = Story.normalise(save.story); save.story = story; prog = Prog.normalise(save.prog); save.prog = prog; }
  bindStory();

  // ------------------------------------------------------------ state
  const renderer = Render.createRenderer($('arena'));
  let match = null, mode = 'practice', speed = 1, paused = false;
  let frozen = false; // test hook: draw without advancing the fight
  let faceoff = null; // face-off presentation state while it plays
  const INTRO = window.TowRender.intro.T;
  let acc = 0, hitstop = 0, last = performance.now(), resultShownAt = 0, lastLog = 0;
  // An idle background fight plays behind the menu.
  let showcase = null; // character select: the menu fight stars this starter
  function makeAttract(seed) {
    return showcase ? Sim.createMatch({ seed, scenario: 'clearing', party: [{ key: showcase, level: 3 }] }) : Sim.createMatch({ seed });
  }
  let attract = makeAttract(11);
  let view = 'menu';
  const backdrop = Render.backdrop.create($('arena'));
  let sceneBg = 'tower', sceneT = 0;
  // Staged scenes: story nodes listed in window.TowStages play out with the
  // fighters on a real arena (js/render/stage.js), beat by beat with the lines.
  let stage = null, stageKey = null;
  function stageFor(id) { return Render.stage && window.TowStages && window.TowStages[id] ? id : null; }
  let storyBattle = null; // the story battle being fought, if any
  let lines = [], lineIdx = 0, lineFull = '', typeT = 0, cardShownAt = 0;

  // ------------------------------------------------------------ menu
  const HEART_SVG = '<svg class="heart" viewBox="0 0 26 24" aria-hidden="true"><path d="M13 22 3.2 12.6A6 6 0 0 1 13 4.6a6 6 0 0 1 9.8 8L13 22Z"/></svg>';
  function fmt(ms) {
    const s = Math.ceil(ms / 1000), m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }
  function renderMenu() {
    const now = Date.now();
    Pg.tick(save, now);
    $('hearts').innerHTML = Array.from({ length: Pg.HEART_MAX }, (_, i) =>
      HEART_SVG.replace('class="heart"', `class="heart${i < save.hearts ? '' : ' empty'}"`)).join('');
    $('hearts').setAttribute('aria-label', `${save.hearts} of ${Pg.HEART_MAX} hearts`);
    $('heart-timer').textContent = save.hearts >= Pg.HEART_MAX ? 'Full' : `Next heart in ${fmt(Pg.nextHeartIn(save, now))}`;
    const team = Story.roster(story);
    $('cond-label').textContent = team.length ? `Team · level ${Story.teamLevel(story)}` : 'Team';
    $('cond').innerHTML = team.length ? team.map((m) => {
      const f = Pg.hpFrac(save, m.key, now);
      const name = Sim.DEFS[m.key].name.split(' ')[0];
      const note = f >= 1 ? `Lv ${m.level} · ready` : `${Math.round(f * 100)}% · ${fmt(Pg.fullHealIn(save, m.key, now))}`;
      return `<div class="cond-row"><span>${name}</span><div class="bar"><i style="transform:scaleX(${f.toFixed(3)})"></i></div><span class="card-num">${note}</span></div>`;
    }).join('') : '<p class="fine">Your team forms twenty-two years after the Reset.</p>';
    const n = Story.node(story), ch = Story.CHAPTERS.find((c) => c.id === n.chapter);
    $('menu-chapter').textContent = `${ch.label} · ${ch.title}`;
    $('story-btn-label').textContent = (story.node === 'p.lore' || story.node === 'p.open') ? 'Begin the story' : n.type === 'end' ? 'The story so far' : 'Continue the story';
    const needsHeart = n.type === 'battle' && Story.battle(story).hearts;
    const ok = !needsHeart || Pg.canStartStory(save);
    $('btn-story').disabled = !ok;
    $('story-note').textContent = !ok ? 'No hearts left — try Practice' : needsHeart ? 'Next: a battle · a heart only on a wipe' : `${ch.label}`;
  }

  function show(id) {
    for (const s of ['menu', 'result', 'paused', 'story', 'select', 'map', 'world', 'team-screen', 'cine']) $(s).hidden = s !== id;
    $('hud').hidden = !(id === null || id === 'paused');
    view = id || 'fight';
  }

  // ------------------------------------------------------------ story
  function chapterLabel(n) {
    const ch = Story.CHAPTERS.find((c) => c.id === n.chapter);
    return ch ? `${ch.label} · ${ch.title}` : '';
  }
  function setShowcase(key) {
    if (showcase === key) return;
    showcase = key; attract = makeAttract((Math.random() * 1e9) | 0); acc = 0;
    renderer.setFollow(key);
  }
  // Show whatever the story is at now.
  function runStory() {
    const n = Story.node(story);
    writeSave();
    match = null; storyBattle = null;
    if (n.type !== 'select') setShowcase(null);
    if (n.type !== 'scene' && n.type !== 'choice') { stage = null; stageKey = null; renderer.setCameraOverride(null); }
    // Between chapters the story waits on the world map.
    if (!story.side && (Story.atGate(story) || n.type === 'end')) return showWorld();
    if (n.type === 'battle') return startStoryBattle();
    if (n.type === 'select') return showSelect();
    if (n.type === 'cinematic') return startCinematic(n);
    sceneBg = n.bg || 'tower'; sceneT = 0;
    // A node can stage itself, or keep the stage of the scene before it (stage: 'same').
    const sid = stageFor(Story.cur(story));
    if (sid && sid !== stageKey) { stage = Render.stage.start(window.TowStages[sid], Sim); stageKey = sid; }
    else if (!sid && !(window.TowStages && window.TowStages[Story.cur(story)] === 'same')) { stage = null; stageKey = null; renderer.setCameraOverride(null); }
    $('story-chapter').textContent = chapterLabel(n);
    $('story-card').hidden = n.type !== 'card';
    $('dialogue').hidden = n.type !== 'scene';
    $('choices').hidden = n.type !== 'choice';
    $('btn-skip').hidden = n.type !== 'scene';
    if (n.type === 'card') {
      $('card-title').textContent = n.title; $('card-sub').textContent = n.sub || '';
      // Restart the entrance animation.
      for (const el of [$('card-title'), $('card-sub')]) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
      cardShownAt = performance.now();
    } else if (n.type === 'scene') {
      lines = Story.lines(story); lineIdx = 0; showLine();
    } else if (n.type === 'choice') {
      $('prompt').textContent = n.prompt;
      $('options').innerHTML = n.options.map((o, i) => {
        const open = Story.optionOpen(story, o);
        return `<button class="btn" type="button" data-i="${i}" ${open ? '' : 'disabled'}><b>${o.label}</b><small>${open ? o.hint : o.needText}</small></button>`;
      }).join('');
    }
    show('story');
  }
  function showLine() {
    const l = lines[lineIdx];
    const d = $('dialogue');
    d.className = 'dialogue ' + (l.speaker ? l.speaker.tone : 'narr');
    $('who').textContent = l.speaker ? l.speaker.name : '';
    $('who').hidden = !l.speaker;
    lineFull = l.speaker ? `“${l.text}”` : l.text;
    if (stage) stage.beat(lineIdx, lines.length);
    typeT = 0; $('line').textContent = '';
  }
  function typing() { return $('line').textContent.length < lineFull.length; }
  // Full-screen cinematics (TowRender.cinematics[name], e.g. js/render/opening.js):
  //   create(canvas) -> { update(dt) -> true when finished, draw(), skip() }
  let cine = null;
  function startCinematic(n) {
    const C = Render.cinematics && Render.cinematics[n.name];
    if (!C) { storyStep(() => Story.advance(story)); return; }
    cine = C.create($('arena'));
    show('cine');
  }
  function endCinematic() {
    if (!cine) return;
    cine = null;
    storyStep(() => Story.advance(story));
  }
  $('btn-cine-skip').addEventListener('click', (e) => { e.stopPropagation(); if (cine && cine.skip) cine.skip(); endCinematic(); });
  $('cine').addEventListener('click', () => { tryLandscape(); $('btn-cine-skip').classList.add('shown'); });

  function storyTap() {
    const n = Story.node(story);
    if (n.type === 'card') {
      if (performance.now() - cardShownAt < 900) return;
      storyStep(() => Story.advance(story));
    } else if (n.type === 'scene') {
      if (typing()) { $('line').textContent = lineFull; return; }
      if (++lineIdx < lines.length) showLine();
      else storyStep(() => Story.advance(story));
    }
  }
  // Move the story on; a side episode that just ended returns to the map.
  function storyStep(fn) {
    const wasSide = !!story.side;
    fn();
    if (wasSide && !story.side) showWorld(); else runStory();
  }
  $('story').addEventListener('click', (e) => {
    tryLandscape();
    if (e.target.closest('button')) return;
    storyTap();
  });
  $('options').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b || b.disabled) return;
    storyStep(() => Story.choose(story, Number(b.dataset.i)));
  });
  $('btn-skip').addEventListener('click', () => {
    storyStep(() => {
      const side = !!story.side;
      while (Story.node(story).type === 'scene' && !!story.side === side) { Story.advance(story); if (!story.side && Story.atGate(story)) break; }
    });
  });
  $('btn-story-menu').addEventListener('click', () => { writeSave(); renderMenu(); show('menu'); });

  // Character select: the fight behind the cards stars whoever you look at.
  function showSelect() {
    const keys = Object.keys(Story.STARTERS);
    $('starters').innerHTML = keys.map((k) => {
      const c = Story.STARTERS[k];
      return `<button class="starter" type="button" data-k="${k}"><b>${c.name}</b><small>${c.role}</small></button>`;
    }).join('');
    // In the tavern: the three starters are staged there and the camera
    // visits whoever you look at (falls back to a showcase fight).
    const sid = stageFor('p.select');
    if (sid) { stage = Render.stage.start(window.TowStages[sid], Sim); stageKey = sid; selectStaged = true; }
    pickShowcase(showcase && Story.STARTERS[showcase] ? showcase : keys[0]);
    show('select');
  }
  let selectStaged = false;
  function pickShowcase(k) {
    const c = Story.STARTERS[k];
    for (const b of document.querySelectorAll('.starter')) b.classList.toggle('on', b.dataset.k === k);
    const pips = (n) => Array.from({ length: 5 }, (_, i) => `<span class="p${i < n ? ' on' : ''}"></span>`).join('');
    $('starter-info').innerHTML = `
      <span class="role">${c.role}</span>
      <h2 style="font-size:24px">${c.name}</h2>
      <p>${c.blurb}</p>
      <p>${c.style}</p>
      <div class="pips">${Object.entries(c.stats).map(([n, v]) => `<span>${n[0].toUpperCase() + n.slice(1)}</span><i>${pips(v)}</i>`).join('')}</div>
      <span class="label">Heavy art</span><span class="heavy">${c.heavy}</span>
      <button class="btn primary" id="btn-choose" type="button" data-k="${k}"><b>Climb as ${c.name.split(' ')[0]}</b><small>Begin</small></button>`;
    if (selectStaged && stage) { if (stage.focus) stage.focus(k); } else setShowcase(k);
  }
  $('starters').addEventListener('click', (e) => { const b = e.target.closest('.starter'); if (b) pickShowcase(b.dataset.k); });
  $('starter-info').addEventListener('click', (e) => {
    const b = e.target.closest('#btn-choose');
    if (!b) return;
    Story.pickStarter(story, b.dataset.k);
    setShowcase(null);
    selectStaged = false;
    runStory();
  });

  function renderMap() {
    const list = Story.chapters(story);
    $('chapter-list').innerHTML = list.map((c) => `
      <div class="chap ${c.status}"><span class="mark">${c.status === 'done' ? '✓' : c.status === 'current' ? '▶' : '·'}</span>
        <div><small>${c.label}</small><b>${c.title}</b></div>
        <span class="state">${c.status === 'done' ? 'Cleared' : c.status === 'current' ? 'Now' : ''}</span></div>`).join('');
    const end = Story.node(story).type === 'end';
    $('btn-map-continue').disabled = end;
    $('map-note').textContent = end ? 'Waiting on the next chapter' : chapterLabel(Story.node(story));
  }
  $('btn-chapters').addEventListener('click', () => { save = loadSave(); bindStory(); showWorld(); });
  $('btn-team').addEventListener('click', () => { save = loadSave(); bindStory(); showTeam('menu'); });
  $('btn-map-continue').addEventListener('click', () => runStory());
  $('btn-map-back').addEventListener('click', () => { renderMenu(); show('menu'); });

  // ------------------------------------------------------------ world map
  const mapR = Render.map ? Render.map.create($('arena')) : null;
  let worldSel = null, worldT = 0, worldView = null;
  const KIND_TEXT = {
    story: 'The main story. Uses a heart only if the whole team falls.',
    contract: 'A Guild contract. No hearts. Pays in gear.',
    side: 'A side story. No hearts. Something rare waits at the end.',
    dungeon: 'Three chambers in a row; health carries between them. No hearts. Repeatable for loot.',
    training: 'Practice in the Guild yard. No hearts. Repeatable.',
    arcade: 'Endless waves for a high score. No hearts. More waves, better loot.',
    locked: 'Beyond the written story.',
  };
  const LOOT_TEXT = { yard: 'Common gear', contract: 'Gear, sometimes fine', beast: 'The Stray’s Tooth (first clear) · fine gear', relic: 'A relic (first clear) · rare gear', deep: 'Gear from each chamber', chief: 'The Miller’s Cleaver (first clear) · rare and relic gear', gauntlet: 'One piece of gear per 3 waves', story: 'Experience and gear' };
  function showWorld(sel) {
    match = null; storyBattle = null; setShowcase(null);
    stage = null; stageKey = null; renderer.setCameraOverride(null); renderer.setFollow(null);
    writeSave();
    worldView = Camp.view(Story, story);
    worldSel = sel || worldView.current || worldSel;
    const ch = Story.CHAPTERS.find((c) => c.id === Story.NODES[story.node].chapter);
    $('world-title').textContent = ch ? `${ch.label} · ${ch.title}` : '';
    $('world-hearts').innerHTML = Array.from({ length: Pg.HEART_MAX }, (_, i) => HEART_SVG.replace('class="heart"', `class="heart${i < save.hearts ? '' : ' empty'}"`)).join('');
    $('world-fallback').hidden = !!mapR;
    if (!mapR) $('world-fallback').innerHTML = worldView.nodes.map((n) => `<button type="button" data-id="${n.id}">${n.title} <small>· ${n.status}</small></button>`).join('');
    renderNodeCard();
    show('world');
  }
  function renderNodeCard() {
    const n = worldView && worldView.nodes.find((x) => x.id === worldSel);
    $('node-card').hidden = !n;
    if (!n) return;
    const ep = n.episode && Story.EPISODES[n.episode];
    $('nc-sub').textContent = n.sub;
    $('nc-title').textContent = n.title;
    $('nc-text').textContent = n.status === 'locked' ? (n.lock || 'Locked') : KIND_TEXT[n.kind] || '';
    const lootKey = { yard: 'yard', gauntlet: 'gauntlet', cart: 'contract', stray: 'beast', crossing: 'relic', deep: 'chief' }[n.episode] || (n.kind === 'story' ? 'story' : null);
    $('nc-reward').textContent = (lootKey ? 'Rewards: ' + LOOT_TEXT[lootKey] : '') + (n.kind === 'arcade' && n.best ? ` · Best: ${n.best} waves` : '') + (n.cleared && ep && ep.repeat ? ` · Cleared ${n.cleared}×` : '');
    const go = $('btn-node-go');
    let label = 'Go', note = '', ok = true;
    if (n.status === 'locked') { label = 'Locked'; ok = false; }
    else if (n.kind === 'story') {
      if (n.status === 'done') { label = 'Cleared'; ok = false; }
      else if (n.id === 'prologue') { label = 'Played'; ok = false; }
      else { label = Story.atGate(story) ? 'Begin chapter' : 'Continue'; note = 'Story'; }
    } else if (n.status === 'done') { label = 'Cleared'; ok = false; }
    else { label = n.cleared ? 'Run again' : 'Start'; note = 'No hearts'; }
    $('nc-go').textContent = label; $('nc-note').textContent = note; go.disabled = !ok;
  }
  function goNode(id) {
    const n = Camp.NODES.find((x) => x.id === id);
    if (!n) return;
    const st = Camp.status(Story, story, n);
    if (st === 'locked') return;
    if (n.kind === 'story') {
      if (st !== 'current') return;
      Story.openChapter(story);
      runStory();
    } else if (n.episode && st !== 'done') {
      Story.startSide(story, n.episode);
      runStory();
    }
  }
  function pickWorld(id) { if (!id) return; worldSel = id; renderNodeCard(); }
  $('btn-node-go').addEventListener('click', () => goNode(worldSel));
  $('btn-world-menu').addEventListener('click', () => { renderMenu(); show('menu'); });
  $('btn-world-team').addEventListener('click', () => showTeam('world'));
  $('world-fallback').addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) pickWorld(b.dataset.id); });

  // ------------------------------------------------------------ team: gear and skills
  let teamKey = null, teamSlot = 'weapon', teamBack = 'menu';
  function showTeam(back) {
    teamBack = back || 'menu';
    const r = Story.roster(story);
    if (!r.length) { renderMenu(); show('menu'); return; }
    if (!teamKey || !r.some((m) => m.key === teamKey)) teamKey = r[0].key;
    renderTeam();
    show('team-screen');
  }
  function renderTeam() {
    const r = Story.roster(story);
    $('team-tabs').innerHTML = r.map((m) => `<button class="tab${m.key === teamKey ? ' on' : ''}" type="button" data-k="${m.key}">${Sim.DEFS[m.key].name.split(' ')[0]}<small>Lv ${m.level}</small></button>`).join('');
    const d = Sim.DEFS[teamKey], mods = Prog.modsFor(prog, teamKey);
    const m = r.find((x) => x.key === teamKey);
    $('tm-name').textContent = d.name;
    const hp = Math.round(d.hp * (1 + 0.1 * (m.level - 1)) * (1 + (mods.hp || 0)));
    $('tm-stats').textContent = `Level ${m.level} · ${hp} health · heavy art: ${(d.heavy && d.heavy.name) || 'Rising Cut'}` + (Object.keys(mods).length ? ' · ' + Prog.describe(mods) : ' · no bonuses yet');
    const eq = prog.equip[teamKey] || {};
    $('tm-slots').innerHTML = Prog.SLOTS.map((sl) => {
      const it = eq[sl] && Prog.item(prog, eq[sl]);
      const I = it && Prog.ITEMS[it.id];
      return `<button class="slot${sl === teamSlot ? ' on' : ''}" type="button" data-slot="${sl}"><span>${sl}</span><b style="color:${I ? Prog.RARITY[I.rarity].color : 'inherit'}">${I ? I.name : '— empty —'}<i>${I ? Prog.describe(I.mods) : ''}</i></b></button>`;
    }).join('');
    const fits = prog.inv.filter((it) => Prog.ITEMS[it.id].slot === teamSlot && Prog.canEquip(teamKey, it.id));
    $('tm-inv').innerHTML = fits.length ? fits.map((it) => {
      const I = Prog.ITEMS[it.id], who = Prog.wearer(prog, it.uid);
      const on = who === teamKey;
      return `<button type="button" data-uid="${it.uid}" style="color:${Prog.RARITY[I.rarity].color}">${on ? '✓ ' : ''}${I.name}${who && !on ? ` (on ${Sim.DEFS[who].name.split(' ')[0]})` : ''}<i>${Prog.RARITY[I.rarity].label} · ${Prog.describe(I.mods)}</i></button>`;
    }).join('') : `<p class="statline">No ${teamSlot === 'weapon' ? 'weapons this fighter can use' : teamSlot} yet. Missions and contracts drop gear.</p>`;
    const pts = Prog.points(prog, teamKey, m.level) - Prog.spent(prog, teamKey);
    $('tm-points').textContent = `${pts} point${pts === 1 ? '' : 's'} to spend · one per level`;
    const have = prog.skills[teamKey] || [];
    $('tm-tree').innerHTML = (Prog.TREES[teamKey] || []).map((b) => `<div class="branch"><span>${b.name}</span>${b.nodes.map((n) => {
      const id = Prog.skillId(b.name, n.i), own = have.includes(id), can = Prog.canLearn(prog, teamKey, m.level, b.name, n.i);
      return `<button class="skill${own ? ' have' : can ? ' can' : ''}" type="button" data-b="${b.name}" data-i="${n.i}" ${own || can ? '' : 'disabled'}>${n.name}<i>${Prog.describe(n.mods)}</i></button>`;
    }).join('')}</div>`).join('');
  }
  $('team-tabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) { teamKey = b.dataset.k; renderTeam(); } });
  $('tm-slots').addEventListener('click', (e) => { const b = e.target.closest('.slot'); if (b) { teamSlot = b.dataset.slot; renderTeam(); } });
  $('tm-inv').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-uid]');
    if (!b) return;
    const uid = Number(b.dataset.uid);
    if (Prog.wearer(prog, uid) === teamKey) Prog.unequip(prog, teamKey, teamSlot); else Prog.equip(prog, teamKey, uid);
    writeSave(); renderTeam();
  });
  $('tm-tree').addEventListener('click', (e) => {
    const b = e.target.closest('.skill');
    if (!b || b.disabled) return;
    const m = Story.roster(story).find((x) => x.key === teamKey);
    if (Prog.learn(prog, teamKey, m.level, b.dataset.b, Number(b.dataset.i))) { writeSave(); renderTeam(); }
  });
  $('btn-respec').addEventListener('click', () => { Prog.respec(prog, teamKey); writeSave(); renderTeam(); });
  $('btn-team-back').addEventListener('click', () => { if (teamBack === 'world') showWorld(); else { renderMenu(); show('menu'); } });

  // ------------------------------------------------------------ guided tutorial (the prologue fight)
  let coach = { i: 0, on: false, enabled: false };
  const COACH = [
    { when: (m) => m.t > 0.8, title: 'You watch. They fight.', text: 'Every fighter reads wind-ups, parries, dodges and feints on their own. Your job is timing.' },
    { when: (m) => m.t > 3 && Sim.allOutReady(m), title: 'ALL OUT', text: 'Tap ALL OUT now. Everyone burns their stamina and power into a flurry — then they’re drained and can’t dodge or block until they recover.', target: '#btn-allout', wait: 'allout' },
    { when: (m) => m.t > 9, title: 'Follow a fighter', text: 'Tap the climber, or their card at the top left, to follow them with the camera. Tap again to let go.', target: '#team .card', wait: 'follow' },
    { when: (m) => m.t > 14, title: 'Heavy arts', text: 'When the bar under a name fills, that fighter unleashes a heavy art as a cutscene. Tap the screen to jump to the impact.' },
    { when: (m) => m.t > 19, title: 'Withdraw', text: 'Hold the flag to leave a story fight. No heart lost, but your team leaves injured.', target: '#btn-withdraw' },
  ];
  function coachTick() {
    if (!coach.enabled || !match || match.result || faceoff || match.phase !== 'fight') return;
    if (coach.on) {
      const c = COACH[coach.i];
      if ((c.wait === 'allout' && match.allOut.uses > 0) || (c.wait === 'follow' && renderer.follow)) coachDone();
      else placeRing(c);
      return;
    }
    if (match.cutscene || coach.i >= COACH.length) return;
    const c = COACH[coach.i];
    if (!c.when(match)) return;
    coach.on = true;
    $('coach-title').textContent = c.title; $('coach-text').textContent = c.text;
    $('coach-ok').hidden = c.wait === 'allout';
    $('coach').hidden = false;
    placeRing(c);
  }
  function placeRing(c) {
    const el = c.target && document.querySelector(c.target);
    const ring = $('coach-ring');
    if (!el || !el.getClientRects().length) { ring.hidden = true; return; }
    const b = el.getBoundingClientRect(), pad = 8, d = Math.max(b.width, b.height) + pad * 2;
    ring.hidden = false;
    Object.assign(ring.style, { left: `${b.left + b.width / 2 - d / 2}px`, top: `${b.top + b.height / 2 - d / 2}px`, width: `${d}px`, height: `${d}px` });
  }
  function coachDone() { coach.on = false; coach.i++; $('coach').hidden = true; }
  $('coach-ok').addEventListener('click', coachDone);

  function startStoryBattle() {
    const spec = Story.battle(story);
    save = loadSave(); bindStory();
    if (spec.hearts && !Pg.canStartStory(save)) { renderMenu(); show('menu'); return; }
    const now = Date.now();
    const hp = (k, f) => Math.min(f == null ? 1 : f, spec.hearts ? Pg.hpFrac(save, k, now) : 1);
    const party = spec.party.map((m) => Object.assign({}, m, { hpFrac: hp(m.key, m.hpFrac), mods: Prog.modsFor(prog, m.key) }));
    startMatch(spec.hearts ? 'story' : spec.side ? 'side' : 'tutorial', undefined, {
      scenario: spec.scenario, party, mods: spec.mods,
      heroHp: spec.hearts ? { kael: hp('kael'), eiryn: 1 } : {},
    });
    storyBattle = Object.assign(spec, { node: Story.cur(story) });
    coach = { i: 0, on: false, enabled: !!spec.tutorial };
  }

  // ------------------------------------------------------------ match
  function startMatch(m, seed, opts) {
    mode = m;
    const now = Date.now();
    const heroHp = mode === 'story' ? { kael: Pg.hpFrac(save, 'kael', now), eiryn: Pg.hpFrac(save, 'eiryn', now) } : {};
    match = Sim.createMatch(Object.assign({ heroHp, seed, intro: true }, opts));
    storyBattle = null;
    coach = { i: 0, on: false, enabled: false }; $('coach').hidden = true;
    $('tip').hidden = true;
    faceoff = { t: 0 }; // face-off and countdown before the fight
    acc = 0; hitstop = 0; resultShownAt = 0; lastLog = 0; paused = false;
    $('feed').innerHTML = '';
    buildHud();
    renderer.setFollow(null);
    show(null);
    $('btn-withdraw').querySelector('small').textContent = mode === 'story' ? 'No heart lost · team leaves injured' : mode === 'tutorial' ? 'Leave the prologue' : 'Practice · nothing is saved';
  }

  function finishMatch() {
    const r = match.result;
    const now = Date.now();
    const frac = (u) => (u.state === 'out' ? 0 : u.hp / u.maxHp);
    const fracs = {};
    for (const u of match.units) if (u.team === 'hero') fracs[u.key] = frac(u);
    const before = save.hearts;
    Pg.applyResult(save, mode, r.outcome, fracs, now);
    let growth = null, loot = [];
    if (storyBattle) {
      const sb = storyBattle;
      growth = Story.finishBattle(story, r.outcome, fracs, r.waves);
      // Loot on a win (arcade: by waves cleared). First clears add their set piece.
      const table = sb.loot || (mode === 'story' ? 'story' : null);
      if (table && (r.outcome === 'win' || sb.arcade)) {
        const first = !prog.firsts[sb.node];
        prog.firsts[sb.node] = 1;
        loot = Prog.addItems(prog, Prog.rollLoot(table, Math.random, { first, score: r.waves, extra: sb.greed && sb.node === 'deep.3' ? 1 : 0 }));
      }
    }
    writeSave();
    const st = match.stats, lead = match.lead.name.split(' ')[0];
    let text;
    if (storyBattle && storyBattle.arcade) {
      text = `Cleared ${r.waves || 0} waves. Best: ${story.best[storyBattle.node] || 0}.`;
    } else if (mode === 'side') {
      text = r.outcome === 'win' ? storyBattle.outro || `${match.title}: won.` : r.outcome === 'loss' ? 'The team falls back to regroup. Side missions never cost hearts.' : 'You pull back. The job will wait.';
    } else if (mode === 'tutorial') {
      text = r.outcome === 'win' ? 'The guardian breaks apart into ash and light. Above the final steps, a brightness waits.'
        : r.outcome === 'loss' ? 'Even broken, the climber rises, and keeps climbing toward the light.'
        : 'The climber steps back from the edge — for now.';
    } else if (mode === 'story') {
      text = {
        win: (storyBattle && storyBattle.outro) || `${match.title}: won.`,
        loss: 'The whole team has fallen. They regroup and can try again.',
        surrender: `${lead} pulls the team back to regroup. The fight will be waiting.`,
      }[r.outcome];
    } else {
      text = {
        win: 'The bandits are beaten or gone. Kael sheathes his sword and offers Eiryn his waterskin.',
        loss: 'Kael goes down in the clearing. The whole team has fallen.',
        surrender: 'Kael pulls Eiryn clear and heads for the road. They’ll be back.',
      }[r.outcome];
    }
    $('result-head').className = 'result-head ' + r.outcome;
    $('result-mode').textContent = mode === 'practice' ? 'Practice match' : `${match.chapter} · ${match.title}`;
    $('result-title').textContent = storyBattle && storyBattle.arcade ? 'Gauntlet over' : { win: 'Victory', loss: mode === 'tutorial' ? 'Fallen' : 'Defeat', surrender: 'Withdrew' }[r.outcome];
    $('result-loot').innerHTML = loot.length ? '<span class="label" style="align-self:center">Found</span>' + loot.map((it) => {
      const I = Prog.ITEMS[it.id];
      return `<span style="color:${Prog.RARITY[I.rarity].color}">${I.name}</span>`;
    }).join('') : '';
    $('result-text').textContent = text;
    const stats = [
      [fmt(r.time * 1000), 'Time'], [st.parries, 'Parries'], [st.dodges, 'Dodges'],
      [st.feintsRead, 'Feints read'], [st.beaten + st.fled, 'Foes beaten'], [st.supers, 'Heavy arts'],
    ];
    $('result-stats').innerHTML = stats.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
    let heartLine = 'Practice match: hearts and injuries are unchanged.';
    if (mode === 'tutorial') heartLine = 'The prologue never costs hearts.';
    if (mode === 'side') heartLine = 'Side missions never cost hearts.';
    if (mode === 'story') {
      if (r.outcome === 'loss') heartLine = `Lost 1 heart (${before} → ${save.hearts}). The team is back on its feet.`;
      else if (r.outcome === 'win') heartLine = 'No heart lost. Winning restores the whole team to full health.';
      else heartLine = 'No heart lost. The team is injured and will heal over the next few minutes.';
    }
    $('result-hearts').innerHTML = heartLine + (growth && growth.xp ? ` <span class="levelup">+${growth.xp} XP${growth.levelUp ? ` · Team level ${growth.level}!` : ''}</span>` : '');
    // Next step.
    const again = $('btn-again');
    if (storyBattle && (r.outcome === 'win' || mode === 'tutorial' || storyBattle.arcade || (storyBattle.carry && !story.side))) {
      again.dataset.action = 'continue'; again.disabled = false;
      const toMap = storyBattle.side && !story.side;
      again.querySelector('b').textContent = toMap ? 'Back to the map' : 'Continue';
      $('again-note').textContent = toMap ? 'Choose where to go next' : chapterLabel(Story.node(story));
    } else if (storyBattle) {
      const ok = mode !== 'story' || Pg.canStartStory(save);
      again.dataset.action = 'retry'; again.disabled = !ok;
      again.querySelector('b').textContent = 'Try again'; $('again-note').textContent = ok ? 'Same fight' : 'No hearts — wait or practice';
    } else {
      again.dataset.action = 'practice'; again.disabled = false;
      again.querySelector('b').textContent = 'Watch another match'; $('again-note').textContent = 'Practice match again';
    }
    show('result');
  }

  // ------------------------------------------------------------ HUD
  let hudEls = {};
  function bar(cls) { return `<div class="bar ${cls || ''}"><i></i></div>`; }
  function buildHud() {
    const team = match.units.filter((u) => u.team === 'hero');
    const foes = match.units.filter((u) => u.team === 'bandit');
    $('team').innerHTML = team.map((u) => `
      <div class="card hero" data-id="${u.id}" role="button" tabindex="0" aria-label="Follow ${u.name}">
        <div class="card-head"><span class="card-name">${u.name}</span>${u.guest ? '<span class="card-tag">Guest</span>' : ''}<span class="chip" hidden></span><span class="card-num"></span></div>
        ${bar('hp')}${bar('sta')}${u.def.superMeter ? bar('super') : ''}
      </div>`).join('');
    $('foes').innerHTML = foes.map((u) => `
      <div class="card foe" data-id="${u.id}">
        <div class="card-head"><span class="card-name">${u.name}</span><span class="chip" hidden></span></div>
        ${bar('hp')}
      </div>`).join('');
    hudEls = {};
    for (const el of document.querySelectorAll('#team .card, #foes .card')) {
      hudEls[el.dataset.id] = {
        el, hp: el.querySelector('.bar.hp > i'), sta: el.querySelector('.bar.sta'), staI: el.querySelector('.bar.sta > i'),
        sup: el.querySelector('.bar.super'), supI: el.querySelector('.bar.super > i'),
        chip: el.querySelector('.chip'), num: el.querySelector('.card-num'),
      };
    }
  }
  function setChip(chip, text, cls) {
    if (!text) { chip.hidden = true; return; }
    chip.hidden = false; chip.textContent = text; chip.className = 'chip ' + (cls || '');
  }
  function updateHud() {
    if (!match) return;
    if (Object.keys(hudEls).length !== match.units.length) buildHud();
    for (const u of match.units) {
      const h = hudEls[u.id];
      if (!h) continue;
      h.hp.style.transform = `scaleX(${Math.max(0, u.hp / u.maxHp).toFixed(3)})`;
      if (h.num) h.num.textContent = `${Math.max(0, Math.ceil(u.hp))}`;
      if (h.staI) {
        h.staI.style.transform = `scaleX(${(u.sta / u.maxSta).toFixed(3)})`;
        h.sta.classList.toggle('drained', u.drained > 0);
      }
      if (h.supI) {
        h.supI.style.transform = `scaleX(${(u.superMeter / 100).toFixed(3)})`;
        h.sup.classList.toggle('full', u.superMeter >= 100);
      }
      if (u.state === 'out') setChip(h.chip, 'Down', 'down');
      else if (u.fled) setChip(h.chip, u.beaten ? 'Beaten' : 'Fled', '');
      else if (u.beaten) setChip(h.chip, 'Beaten', 'down');
      else if (u.fleeing) setChip(h.chip, 'Running', 'run');
      else if (u.allOut > 0) setChip(h.chip, 'All out', 'allout');
      else if (u.drained > 0) setChip(h.chip, 'Drained', 'drained');
      else setChip(h.chip, null);
      h.el.classList.toggle('gone', u.state === 'out' || !!u.fled || !!u.beaten);
    }
    // Prologue tips, one at a time once the fight is on.
    const tips = storyBattle && !coach.enabled && storyBattle.tips;
    const ti = tips && match.phase === 'fight' && !match.result ? Math.floor(match.t / 6) : -1;
    $('tip').hidden = !(ti >= 0 && ti < tips.length);
    if (!$('tip').hidden) $('tip-text').textContent = tips[ti];
    // Heavy arts get the whole screen.
    $('hud').classList.toggle('cine', !coach.on && (!!match.cutscene || !!(faceoff && faceoff.t < INTRO.fight) || renderer.cinematic()));
    const A = match.allOut, b = $('btn-allout');
    const spent = A.uses >= A.maxUses;
    b.style.setProperty('--fill', A.active ? 1 : spent ? 0 : A.meter.toFixed(3));
    const ready = Sim.allOutReady(match);
    b.disabled = !ready;
    b.classList.toggle('ready', ready);
    b.classList.toggle('active', A.active > 0);
    b.classList.toggle('used', spent && !A.active);
    $('allout-state').textContent = A.active ? 'Go!' : `${A.maxUses - A.uses} left`;
    // commentary
    if (match.log.length) {
      const feed = $('feed');
      for (const l of match.log) {
        const p = document.createElement('p');
        p.textContent = l.text;
        feed.appendChild(p);
      }
      match.log.length = 0;
      while (feed.children.length > 2) feed.removeChild(feed.firstChild);
      [...feed.children].forEach((p, i, a) => p.classList.toggle('old', i < a.length - 1));
      lastLog = performance.now();
    }
    if (performance.now() - lastLog > 2600) $('feed').innerHTML = '';
    // Follow indicator
    const fid = renderer.follow;
    $('follow-chip').hidden = !fid || !!match.result;
    if (fid) $('follow-name').textContent = match.byId[fid].name;
    for (const el of document.querySelectorAll('#team .card')) el.classList.toggle('followed', el.dataset.id === fid);
  }

  // ------------------------------------------------------------ input
  function tryAllOut() {
    if (match && !paused && !match.result) Sim.triggerAllOut(match);
  }
  $('btn-allout').addEventListener('click', tryAllOut);
  $('btn-story').addEventListener('click', () => { tryLandscape(); save = loadSave(); bindStory(); runStory(); });
  $('btn-practice').addEventListener('click', () => startMatch('practice'));
  $('btn-again').addEventListener('click', (e) => {
    const a = e.currentTarget.dataset.action;
    if (a === 'continue') { if (storyBattle && storyBattle.side && !story.side) showWorld(); else runStory(); }
    else if (a === 'retry') startStoryBattle();
    else startMatch('practice');
  });
  $('btn-camp').addEventListener('click', () => {
    // Leaving a side mission part-way drops it; the map keeps it open.
    if (story.side && storyBattle && storyBattle.side) { Story.leaveSide(story); writeSave(); }
    match = null; storyBattle = null; renderer.setFollow(null); renderMenu(); show('menu');
  });
  $('btn-speed').addEventListener('click', () => { speed = speed === 1 ? 2 : 1; $('btn-speed').innerHTML = `${speed}&times;`; });
  $('btn-pause').addEventListener('click', () => setPaused(true));
  $('btn-resume').addEventListener('click', () => setPaused(false));
  $('btn-reset').addEventListener('click', () => { $('reset-confirm').hidden = false; });
  $('btn-reset-yes').addEventListener('click', () => {
    save = Pg.fresh(Date.now()); bindStory(); writeSave(); $('reset-confirm').hidden = true; renderMenu();
  });
  function setPaused(p) {
    if (!match || match.result) return;
    paused = p;
    show(p ? 'paused' : null);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });

  // Withdraw needs a deliberate hold so it can't be hit by accident.
  const HOLD_MS = 900;
  let holdStart = 0, holdTimer = 0;
  const wd = $('btn-withdraw');
  function holdTick() {
    const k = Math.min(1, (performance.now() - holdStart) / HOLD_MS);
    wd.style.setProperty('--hold', k.toFixed(3));
    if (k >= 1) { endHold(); if (match && !match.result) { Sim.surrender(match); faceoff = null; } return; }
    holdTimer = requestAnimationFrame(holdTick);
  }
  function endHold() { cancelAnimationFrame(holdTimer); holdStart = 0; wd.style.setProperty('--hold', 0); wd.classList.remove('holding'); }

  // Landscape only: try to lock the orientation where the browser allows it,
  // and pause while the phone is upright.
  let triedLock = false;
  function tryLandscape() {
    if (triedLock) return;
    triedLock = true;
    try {
      const el = document.documentElement;
      const lock = () => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {});
      if (el.requestFullscreen && matchMedia('(pointer: coarse)').matches) el.requestFullscreen().then(lock, () => {});
      else lock();
    } catch (e) { /* not supported: the rotate overlay covers it */ }
  }
  const portrait = matchMedia('(orientation: portrait)');
  const onOrient = () => { if (portrait.matches && match && !match.result) setPaused(true); };
  if (portrait.addEventListener) portrait.addEventListener('change', onOrient);
  wd.addEventListener('pointerdown', (e) => { if (!match || match.result) return; e.preventDefault(); holdStart = performance.now(); wd.classList.add('holding'); holdTick(); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) wd.addEventListener(ev, endHold);

  // Tap the arena during a heavy art to skip to its impact.
  // Tap one of your fighters to follow them; tap elsewhere to let go.
  function toggleFollow(id) { renderer.setFollow(renderer.follow === id ? null : id); }
  $('team').addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (card && match && !match.result) toggleFollow(card.dataset.id);
  });
  $('follow-chip').addEventListener('click', () => renderer.setFollow(null));
  $('arena').addEventListener('pointerdown', (e) => {
    tryLandscape();
    if (view === 'world' && mapR) {
      const r = $('arena').getBoundingClientRect();
      pickWorld(mapR.pick(e.clientX - r.left, e.clientY - r.top));
      return;
    }
    // Tap during the face-off to jump to the countdown.
    if (faceoff && faceoff.t < INTRO.vsEnd) { faceoff.t = INTRO.vsEnd; return; }
    if (match && !match.cutscene && !match.result && match.phase === 'fight') {
      const r = $('arena').getBoundingClientRect();
      const hit = renderer.pick(match, e.clientX - r.left, e.clientY - r.top);
      if (hit) { toggleFollow(hit.id); return; }
      if (renderer.follow) { renderer.setFollow(null); return; }
    }
    const c = match && match.cutscene;
    if (c && c.t > 0.4 && c.t < c.impactAt) c.t = c.impactAt;
    else if (c && c.t > c.impactAt + 0.3) c.t = c.dur;
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && match && !$('hud').hidden && !paused) { e.preventDefault(); tryAllOut(); }
    else if (e.code === 'KeyP' || (e.code === 'Space' && paused)) { e.preventDefault(); setPaused(!paused); }
    else if (e.code === 'KeyF' && match) $('btn-speed').click();
  });

  // ------------------------------------------------------------ loop
  function frame(now) {
    const real = Math.min(0.05, (now - last) / 1000);
    last = now;
    const s = match || attract;
    if (!match && view === 'select' && selectStaged && stage) {
      stage.update(real);
      renderer.setCameraOverride(stage.camera());
      renderer.draw(stage.match, real, true, null);
      requestAnimationFrame(frame);
      return;
    }
    if (!match && view === 'cine' && cine) {
      if (cine.update(real)) endCinematic(); else cine.draw();
      requestAnimationFrame(frame);
      return;
    }
    if (!match && view === 'world' && mapR) {
      worldT += real;
      mapR.draw(worldView, worldT, worldSel);
      requestAnimationFrame(frame);
      return;
    }
    if (!match && view === 'story') {
      // Story scenes: a painted backdrop and the typewriter.
      sceneT += real;
      if (stage) {
        stage.update(real);
        renderer.setCameraOverride(stage.camera());
        renderer.draw(stage.match, real, true, null);
      } else backdrop.draw(sceneBg, sceneT);
      if (!$('dialogue').hidden && typing()) {
        typeT += real;
        $('line').textContent = lineFull.slice(0, Math.floor(typeT * 60));
      }
      requestAnimationFrame(frame);
      return;
    }
    if (!match) {
      // Menu backdrop: an endless practice bout, restarted when it ends.
      acc += real;
      while (acc >= DT) { Sim.step(attract, DT); acc -= DT; }
      if (attract.result) { attract = makeAttract((Math.random() * 1e9) | 0); if (showcase) renderer.setFollow(showcase); }
      attract.log.length = 0;
    } else if (faceoff && !paused && !frozen) {
      // Face-off, then 3-2-1; the fight starts on FIGHT.
      faceoff.t += real;
      if (faceoff.t >= INTRO.fight && match.phase !== 'fight') Sim.begin(match);
      if (match.phase === 'fight') {
        acc += real;
        while (acc >= DT) { Sim.step(match, DT); acc -= DT; }
      }
      if (faceoff.t >= INTRO.end) faceoff = null;
    } else if (!paused && !frozen && !coach.on) {
      if (hitstop > 0) hitstop -= real;
      else {
        // The director can slow time for a beat on big moments.
        acc += real * (match.cutscene ? 1 : speed * renderer.timeScale());
        let n = 0;
        while (acc >= DT && n < 8) { Sim.step(match, DT); acc -= DT; n++; }
      }
      if (match.result && !resultShownAt) resultShownAt = now;
      if (resultShownAt && now - resultShownAt > 1800 && $('result').hidden) finishMatch();
    }
    renderer.draw(s, paused ? 0 : real, !match, match ? faceoff : null);
    const hs = renderer.takeHitstop();
    if (match) hitstop += hs;
    updateHud();
    coachTick();
    requestAnimationFrame(frame);
  }

  // Handle for automated browser checks (test/browser-check.js, test/art-shots.js).
  window.__tow = {
    get match() { return match; },
    get save() { return save; },
    get story() { return story; },
    get view() { return view; },
    get drawMs() { return renderer.stats.drawMs; },
    debug: {
      start(m, seed, opts) { startMatch(m || 'practice', seed == null ? 1 : seed, opts); },
      introAt(t) { if (faceoff) faceoff.t = t; },
      skipIntro() { if (faceoff) { faceoff = null; Sim.begin(match); } },
      freeze(on) { frozen = !!on; },
      get faceoff() { return faceoff; },
      advance(seconds) { for (let i = 0; i < Math.round(seconds / DT) && match && !match.result; i++) Sim.step(match, DT); },
      advanceUntil(fnSrc, maxSeconds) {
        const fn = new Function('s', 'return (' + fnSrc + ')(s)');
        for (let i = 0; i < Math.round((maxSeconds || 30) / DT); i++) { if (!match || match.result) return false; if (fn(match)) return true; Sim.step(match, DT); }
        return false;
      },
      camera(o) { renderer.setCameraOverride(o); },
      follow(id) { renderer.setFollow(id); },
      cutIn(id, caption) { if (match) renderer.cutIn(match.byId[id], caption); },
      superNow() { if (match) match.lead.superMeter = 100; },
      world() { showWorld(); },
      team() { showTeam('menu'); },
      pickNode(id) { pickWorld(id); },
      goNode(id) { goNode(id); },
      give(ids) { Prog.addItems(prog, ids); writeSave(); },
      storyGo(node, starter, flags) {
        story.node = node; if (starter) story.starter = starter; else if (!story.starter) story.starter = 'ren';
        Object.assign(story.flags, flags || {}); runStory();
      },
      allOutNow() { if (match) { match.allOut.meter = 1; Sim.triggerAllOut(match); } },
    },
  };

  renderMenu();
  setInterval(() => { if (!$('menu').hidden) renderMenu(); }, 1000);
  show('menu');
  requestAnimationFrame(frame);
})();
