/*
 * Tower of Wishes — game shell (prototype 0.1)
 * Menus, HUD, input, the fixed-step loop, and saving hearts/injuries.
 */
(function () {
  'use strict';
  const Sim = window.TowSim, Pg = window.TowProgress, Render = window.TowRender;
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
  let save = loadSave();

  // ------------------------------------------------------------ state
  const renderer = Render.createRenderer($('arena'));
  let match = null, mode = 'practice', speed = 1, paused = false;
  let frozen = false; // test hook: draw without advancing the fight
  let faceoff = null; // face-off presentation state while it plays
  const INTRO = window.TowRender.intro.T;
  let acc = 0, hitstop = 0, last = performance.now(), resultShownAt = 0, lastLog = 0;
  // An idle background fight plays behind the menu.
  let attract = Sim.createMatch({ seed: 11 });

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
    $('cond').innerHTML = Pg.TEAM.map((id) => {
      const f = Pg.hpFrac(save, id, now);
      const name = Sim.DEFS[id].name;
      const note = f >= 1 ? 'Ready' : `${Math.round(f * 100)}% · full in ${fmt(Pg.fullHealIn(save, id, now))}`;
      return `<div class="cond-row"><span>${name}</span><div class="bar"><i style="transform:scaleX(${f.toFixed(3)})"></i></div><span class="card-num">${note}</span></div>`;
    }).join('');
    const ok = Pg.canStartStory(save);
    $('btn-story').disabled = !ok;
    $('story-note').textContent = ok ? 'Uses a heart only on a wipe' : 'No hearts left — try Practice';
  }

  function show(id) {
    for (const s of ['menu', 'result', 'paused']) $(s).hidden = s !== id;
    $('hud').hidden = !(id === null || id === 'paused');
  }

  // ------------------------------------------------------------ match
  function startMatch(m, seed) {
    mode = m;
    const now = Date.now();
    const heroHp = mode === 'story' ? { kael: Pg.hpFrac(save, 'kael', now), eiryn: Pg.hpFrac(save, 'eiryn', now) } : {};
    match = Sim.createMatch({ heroHp, seed, intro: true });
    faceoff = { t: 0 }; // face-off and countdown before the fight
    acc = 0; hitstop = 0; resultShownAt = 0; lastLog = 0; paused = false;
    $('feed').innerHTML = '';
    buildHud();
    show(null);
    $('btn-withdraw').querySelector('small').textContent = mode === 'story' ? 'No heart lost · team leaves injured' : 'Practice · nothing is saved';
  }

  function finishMatch() {
    const r = match.result;
    const now = Date.now();
    const frac = (id) => { const u = match.byId[id]; return u.state === 'out' ? 0 : u.hp / u.maxHp; };
    const before = save.hearts;
    Pg.applyResult(save, mode, r.outcome, { kael: frac('kael'), eiryn: frac('eiryn') }, now);
    writeSave();
    const st = match.stats;
    const text = {
      win: 'The bandits are beaten or gone. Kael sheathes his sword and offers Eiryn his waterskin.',
      loss: 'Kael goes down in the clearing. The whole team has fallen.',
      surrender: 'Kael pulls Eiryn clear and heads for the road. They’ll be back.',
    }[r.outcome];
    $('result-head').className = 'result-head ' + r.outcome;
    $('result-mode').textContent = mode === 'story' ? 'Story match · The Clearing' : 'Practice match';
    $('result-title').textContent = { win: 'Victory', loss: 'Defeat', surrender: 'Withdrew' }[r.outcome];
    $('result-text').textContent = text;
    const stats = [
      [fmt(r.time * 1000), 'Time'], [st.parries, 'Parries'], [st.dodges, 'Dodges'],
      [st.feintsRead, 'Feints read'], [st.beaten, 'Bandits beaten'], [st.supers, 'Rising Cuts'],
    ];
    $('result-stats').innerHTML = stats.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
    let heartLine = 'Practice match: hearts and injuries are unchanged.';
    if (mode === 'story') {
      if (r.outcome === 'loss') heartLine = `Lost 1 heart (${before} → ${save.hearts}). The team is back on its feet.`;
      else if (r.outcome === 'win') heartLine = 'No heart lost. Winning restores the whole team to full health.';
      else heartLine = 'No heart lost. The team is injured and will heal over the next few minutes.';
    }
    $('result-hearts').textContent = heartLine;
    const canStory = mode !== 'story' || Pg.canStartStory(save);
    $('again-note').textContent = mode === 'story' ? (canStory ? 'Story match again' : 'No hearts — practice instead') : 'Practice match again';
    $('btn-again').dataset.mode = canStory ? mode : 'practice';
    show('result');
  }

  // ------------------------------------------------------------ HUD
  let hudEls = {};
  function bar(cls) { return `<div class="bar ${cls || ''}"><i></i></div>`; }
  function buildHud() {
    const team = match.units.filter((u) => u.team === 'hero');
    const foes = match.units.filter((u) => u.team === 'bandit');
    $('team').innerHTML = team.map((u) => `
      <div class="card" data-id="${u.id}">
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
    // Heavy arts get the whole screen.
    $('hud').classList.toggle('cine', !!match.cutscene || !!(faceoff && faceoff.t < INTRO.fight));
    const A = match.allOut, b = $('btn-allout');
    b.style.setProperty('--fill', A.used ? (A.active > 0 ? (A.active / Sim.ALL_OUT.dur).toFixed(3) : 0) : A.meter.toFixed(3));
    const ready = !A.used && A.meter >= 1 && !match.result;
    b.disabled = !ready;
    b.classList.toggle('ready', ready);
    b.classList.toggle('active', A.active > 0);
    b.classList.toggle('used', A.used && A.active <= 0);
    $('allout-state').textContent = A.active > 0 ? 'Go!' : A.used ? 'Used' : ready ? 'Ready' : 'Charging';
    // commentary
    if (match.log.length) {
      const feed = $('feed');
      for (const l of match.log) {
        const p = document.createElement('p');
        p.textContent = l.text;
        feed.appendChild(p);
      }
      match.log.length = 0;
      while (feed.children.length > 3) feed.removeChild(feed.firstChild);
      [...feed.children].forEach((p, i, a) => p.classList.toggle('old', i < a.length - 1));
      lastLog = performance.now();
    }
    if (performance.now() - lastLog > 5000) $('feed').innerHTML = '';
  }

  // ------------------------------------------------------------ input
  function tryAllOut() {
    if (match && !paused && !match.result) Sim.triggerAllOut(match);
  }
  $('btn-allout').addEventListener('click', tryAllOut);
  $('btn-story').addEventListener('click', () => { save = loadSave(); if (Pg.canStartStory(save)) startMatch('story'); });
  $('btn-practice').addEventListener('click', () => startMatch('practice'));
  $('btn-again').addEventListener('click', (e) => startMatch(e.currentTarget.dataset.mode || 'practice'));
  $('btn-camp').addEventListener('click', () => { match = null; renderMenu(); show('menu'); });
  $('btn-speed').addEventListener('click', () => { speed = speed === 1 ? 2 : 1; $('btn-speed').innerHTML = `${speed}&times;`; });
  $('btn-pause').addEventListener('click', () => setPaused(true));
  $('btn-resume').addEventListener('click', () => setPaused(false));
  $('btn-reset').addEventListener('click', () => { $('reset-confirm').hidden = false; });
  $('btn-reset-yes').addEventListener('click', () => {
    save = Pg.fresh(Date.now()); writeSave(); $('reset-confirm').hidden = true; renderMenu();
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
  function endHold() { cancelAnimationFrame(holdTimer); holdStart = 0; wd.style.setProperty('--hold', 0); }
  wd.addEventListener('pointerdown', (e) => { if (!match || match.result) return; e.preventDefault(); holdStart = performance.now(); holdTick(); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) wd.addEventListener(ev, endHold);

  // Tap the arena during a heavy art to skip to its impact.
  $('arena').addEventListener('pointerdown', () => {
    // Tap during the face-off to jump to the countdown.
    if (faceoff && faceoff.t < INTRO.vsEnd) { faceoff.t = INTRO.vsEnd; return; }
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
    if (!match) {
      // Menu backdrop: an endless practice bout, restarted when it ends.
      acc += real;
      while (acc >= DT) { Sim.step(attract, DT); acc -= DT; }
      if (attract.result) attract = Sim.createMatch({ seed: (Math.random() * 1e9) | 0 });
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
    } else if (!paused && !frozen) {
      if (hitstop > 0) hitstop -= real;
      else {
        acc += real * (match.cutscene ? 1 : speed);
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
    requestAnimationFrame(frame);
  }

  // Handle for automated browser checks (test/browser-check.js, test/art-shots.js).
  window.__tow = {
    get match() { return match; },
    get save() { return save; },
    get drawMs() { return renderer.stats.drawMs; },
    debug: {
      start(m, seed) { startMatch(m || 'practice', seed == null ? 1 : seed); },
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
      superNow() { if (match) match.byId.kael.superMeter = 100; },
      allOutNow() { if (match) { match.allOut.meter = 1; Sim.triggerAllOut(match); } },
    },
  };

  renderMenu();
  setInterval(() => { if (!$('menu').hidden) renderMenu(); }, 1000);
  show('menu');
  requestAnimationFrame(frame);
})();
