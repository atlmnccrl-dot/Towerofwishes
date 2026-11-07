// VESPER — menus as real buttons over the game: title, settings, credits, the boon pick after an
// hour, defeat, pause. Arrow keys move between buttons, Enter or Space presses, Esc goes back.
(function () {
  const VS = window.VS;
  const U = VS.ui = { current: null, back: null };
  const root = () => document.getElementById('ui');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // items: [{ label, sub, act, cls }]
  function buttons(items, cls) {
    return `<nav class="menu ${cls || ''}">` + items.map((it, i) => `<button class="btn ${it.cls || ''}" data-i="${i}" type="button"><span class="btn-label">${esc(it.label)}</span>${it.sub ? `<span class="btn-sub">${esc(it.sub)}</span>` : ''}</button>`).join('') + '</nav>';
  }
  function wire(el, items) {
    el.querySelectorAll('.btn').forEach((b) => b.addEventListener('click', () => { VS.audio.unlock(); VS.audio.sfx('clang_0', 0.4); items[+b.dataset.i].act(); }));
    el.querySelectorAll('.btn').forEach((b) => b.addEventListener('pointerenter', () => b.focus({ preventScroll: true })));
  }
  U.show = function (id, html, items, opts) {
    const r = root(); r.innerHTML = `<section class="screen screen-${id}${opts && opts.cls ? ' ' + opts.cls : ''}">${html}</section>`; r.hidden = false;
    U.current = id; U.back = (opts && opts.back) || null;
    const el = r.firstElementChild; if (items) wire(el, items);
    const first = el.querySelector('.btn.focus-first') || el.querySelector('.btn');
    if (first) first.focus({ preventScroll: true });
    requestAnimationFrame(() => el.classList.add('in'));
    return el;
  };
  U.hide = function () { const r = root(); r.innerHTML = ''; r.hidden = true; U.current = null; U.back = null; };
  U.key = function (e) {
    if (!U.current) return false;
    const btns = [...root().querySelectorAll('.btn')]; const i = btns.indexOf(document.activeElement);
    const horiz = root().querySelector('.cards');
    const next = { ArrowDown: 1, KeyS: 1, ArrowUp: -1, KeyW: -1, ArrowRight: 1, KeyD: 1, ArrowLeft: -1, KeyA: -1 }[e.code];
    if (next) { e.preventDefault(); const j = i < 0 ? 0 : (i + next + btns.length) % btns.length; if (btns[j]) btns[j].focus(); VS.audio.sfx('step_0', 0.3); return true; }
    if (e.code === 'KeyJ' && i >= 0) { e.preventDefault(); btns[i].click(); return true; }
    if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); if (U.back) U.back(); return true; }
    void horiz; return false;
  };

  // ---- screens ----------------------------------------------------------------------------------
  U.title = function (o) {
    const items = [];
    if (o.cont) items.push({ label: 'Continue', sub: o.cont, act: o.onContinue, cls: 'focus-first' });
    items.push({ label: 'New night', sub: o.cont ? 'Start from dusk' : 'Six hours, six bosses', act: o.onNew });
    items.push({ label: 'Heroes', sub: 'Playing as ' + o.heroName, act: o.onHeroes });
    items.push({ label: 'Theatre', sub: 'Watch your hero\'s ultimate', act: o.onTheatre });
    items.push({ label: 'Settings', act: o.onSettings });
    items.push({ label: 'Credits', act: o.onCredits });
    const keys = o.touch ? '' : `<div class="keys"><span><kbd>WASD</kbd> Move</span><span><kbd>Left click</kbd> Cut</span><span><kbd>Right click</kbd> Heavy</span><span><kbd>Q</kbd> Parry</span><span><kbd>Space</kbd> Dash</span><span><kbd>R</kbd><kbd>F</kbd> Skills</span><span><kbd>E</kbd> Ultimate</span></div>`;
    U.show('title', `<div class="title-col"><header class="logo"><h1>VESPER</h1><p>A last ditch effort</p></header>${buttons(items)}${keys}</div>`, items);
  };
  U.settings = function (o) {
    const v = o.opts;
    const items = [
      { label: 'Music', sub: v.music ? (v.music < 1 ? 'Low' : 'On') : 'Off', act: () => o.set('music') },
      { label: 'Sound effects', sub: v.sfx ? 'On' : 'Off', act: () => o.set('sfx') },
      { label: 'Screen shake', sub: v.shake ? 'On' : 'Off', act: () => o.set('shake') },
      { label: 'Auto battle', sub: v.auto ? 'On' : 'Off', act: () => o.set('auto') },
      { label: 'Reset progress', sub: o.confirmReset ? 'Press again to erase your night' : 'Start over from dusk', act: () => o.set('reset'), cls: o.confirmReset ? 'danger' : '' },
      { label: 'Back', act: o.onBack }];
    const el = U.show('settings', `<div class="panel"><h2>Settings</h2>${buttons(items, 'rows')}<p class="note">Auto battle lets Vesper fight on his own; any button you press still works.</p></div>`, items, { back: o.onBack });
    if (o.focus != null) { const b = el.querySelectorAll('.btn')[o.focus]; if (b) b.focus({ preventScroll: true }); }
  };
  U.credits = function (o) {
    const items = [{ label: 'Back', act: o.onBack }];
    U.show('credits', `<div class="panel"><h2>Credits</h2><dl class="credits">
      <dt>Characters</dt><dd>Character Creator 2D Fantasy (SmallScaleInt)</dd>
      <dt>Effects</dt><dd>Pixel VFX Essentials; KILN FX Free Sampler; Magic Spells VFX Lite by Willosuna; FX packs 6 and 13</dd>
      <dt>Tiles</dt><dd>Pixel Art Top Down - Basic (Cainos); TopDownFantasy Forest; reodesuxz tilesets; EPIC RPG World; Dark World</dd>
      <dt>Fonts</dt><dd>Chakra Petch and Barlow (SIL Open Font License); Adventurer by Brian J Smith (CC BY 3.0)</dd>
      <dt>Music</dt><dd>"Heartfelt Battle", OpenGameArt.org (CC0)</dd>
      <dt>Sound</dt><dd>Fight sounds and ambience synthesised for these games</dd></dl>${buttons(items)}</div>`, items, { back: o.onBack });
  };
  U.boon = function (o) {
    const st = o.stats, items = o.boons.map((b) => ({ label: b.name, sub: b.desc, act: () => o.pick(b) }));
    const stat = (n, l) => `<div class="stat"><b>${esc(n)}</b><span>${esc(l)}</span></div>`;
    const cards = `<nav class="cards">` + items.map((it, i) => `<button class="btn card" data-i="${i}" type="button"><span class="card-moon"></span><span class="btn-label">${esc(it.label)}</span><span class="btn-sub">${esc(it.sub)}</span></button>`).join('') + '</nav>';
    U.show('boon', `<div class="boon-wrap"><p class="eyebrow">${esc(o.hour)}</p><h2>Hour cleared</h2>
      <div class="stats">${stat(o.time.toFixed(1) + 's', 'Time')}${stat(st.maxCombo, 'Best combo')}${stat(st.parries, 'Parries')}${stat(st.perfects, 'Perfect dodges')}${stat(st.arts, 'Moon arts')}</div>
      <p class="lead">The moon offers you one of these.</p>${cards}
      ${o.carried.length ? `<p class="carried">Carried: ${o.carried.map(esc).join(' · ')}</p>` : ''}</div>`, items);
  };
  U.lost = function (o) {
    const items = [{ label: 'Try the hour again', act: o.onRetry, cls: 'focus-first' }, { label: 'Title', act: o.onTitle }];
    U.show('lost', `<div class="center"><h2 class="big">You fell</h2><p class="quote">“Then fall forward.”</p><p class="note">Nothing is lost. Your boons stay with you.</p>${buttons(items, 'center')}</div>`, items, { back: o.onTitle });
  };
  U.pause = function (o) {
    const items = [{ label: 'Resume', act: o.onResume }, { label: 'Restart hour', act: o.onRestart }, { label: 'Auto battle', sub: o.auto ? 'On' : 'Off', act: o.onAuto }, { label: 'Quit to title', act: o.onQuit }];
    U.show('pause', `<div class="center"><h2>Paused</h2>${buttons(items, 'center')}</div>`, items, { back: o.onResume, cls: 'dim' });
  };
  // Choose a hero: a card each with their figure, weapon, skills and ultimate.
  U.heroes = function (o) {
    const D = VS.DATA, items = D.HERO_ORDER.map((id) => ({ label: D.HEROES[id].name, act: () => o.pick(id) }));
    const cards = '<nav class="cards heroes">' + D.HERO_ORDER.map((id, i) => { const H = D.HEROES[id]; return `<button class="btn card hero${id === o.current ? ' focus-first' : ''}" data-i="${i}" type="button" style="--hc:${H.color}">
      <canvas class="hero-fig" width="96" height="96" data-hero="${id}"></canvas><span class="btn-label">${esc(H.name)}</span><span class="hero-title">${esc(H.title)} · ${esc(H.weapon)}</span>
      <span class="btn-sub">${esc(H.blurb)}</span><span class="hero-kit">${H.skills.map((k, j) => `<b>${j ? 'F' : 'R'}</b> ${esc(k.name)}`).join('<br>')}<br><b>E</b> ${esc(VS.ART[H.art === 'moon' ? 'moon' : H.art].name)}</span></button>`; }).join('') + '</nav>';
    const el = U.show('heroes', `<div class="boon-wrap"><p class="eyebrow">Choose your hero</p><h2>Who climbs tonight?</h2>${cards}</div>`, items, { back: o.onBack });
    el.querySelectorAll('canvas.hero-fig').forEach((c) => { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const H = D.HEROES[c.dataset.hero]; let t = 0;
      const draw = () => { if (!c.isConnected) return; g.clearRect(0, 0, 96, 96); VS.A.actor(g, H.set, 'Idle4', Math.floor(t * 8) % 15, Math.PI * 0.25, 48, 88, 1.7, {}); t += 1 / 30; setTimeout(draw, 33); }; draw(); });
  };
  U.loading = function (p) {
    const r = root(); let el = r.querySelector('.screen-loading');
    if (!el) el = U.show('loading', `<div class="center"><div class="loader"><span></span></div><p class="eyebrow">VESPER</p></div>`);
    el.querySelector('.loader span').style.width = Math.round(p * 100) + '%';
  };
})();
