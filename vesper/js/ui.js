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
    items.push({ label: 'New game', sub: o.confirmNew ? 'Press again: this erases your climb' : o.cont ? 'Start the climb over' : 'Climb the Spire before dawn', act: o.onNew, cls: o.confirmNew ? 'danger' : (o.cont ? '' : 'focus-first') });
    items.push({ label: 'Theatre', sub: 'Watch an ultimate', act: o.onTheatre });
    items.push({ label: 'Settings', act: o.onSettings });
    items.push({ label: 'Credits', act: o.onCredits });
    const el = U.show('title', `<div class="title-col"><header class="logo"><h1>VESPER</h1><p>A last ditch effort</p></header>${buttons(items)}</div>`, items);
    if (o.confirmNew) { const b = el.querySelectorAll('.btn')[o.cont ? 1 : 0]; if (b) b.focus({ preventScroll: true }); }
  };
  U.settings = function (o) {
    const v = o.opts;
    const items = [
      { label: 'Music', sub: v.music ? (v.music < 1 ? 'Low' : 'On') : 'Off', act: () => o.set('music') },
      { label: 'Sound effects', sub: v.sfx ? 'On' : 'Off', act: () => o.set('sfx') },
      { label: 'Screen shake', sub: v.shake ? 'On' : 'Off', act: () => o.set('shake') },
      { label: 'Auto battle', sub: v.auto ? 'On' : 'Off', act: () => o.set('auto') },
      { label: 'Reset progress', sub: o.confirmReset ? 'Press again to erase your climb' : 'Erase levels, skills and the map', act: () => o.set('reset'), cls: o.confirmReset ? 'danger' : '' },
      { label: 'Back', act: o.onBack }];
    const el = U.show('settings', `<div class="panel"><h2>Settings</h2>${buttons(items, 'rows')}<p class="note">Auto battle lets your hero fight alone; any button you press still works.</p></div>`, items, { back: o.onBack });
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
    const items = [{ label: 'Resume', act: o.onResume }, { label: 'Restart fight', act: o.onRestart }, { label: 'Auto battle', sub: o.auto ? 'On' : 'Off', act: o.onAuto }, { label: 'Leave the fight', sub: 'Back to the map', act: o.onQuit }];
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

  // ---- the campaign hub ------------------------------------------------------------------------------
  const P = () => VS.PROG, DD = () => VS.DATA;
  const starsHtml = (n, of, cls) => Array.from({ length: of }, (_, i) => `<i class="st ${i < n ? 'on' : ''} ${cls || ''}"></i>`).join('');
  function figure(c, set, opts) {
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; let t = 0; const W = c.width, H = c.height;
    const draw = () => { if (!c.isConnected) return; g.clearRect(0, 0, W, H); VS.A.actor(g, set, 'Idle4', Math.floor(t * 8) % 15, Math.PI * 0.25, W / 2, H - 8, W / 56, opts || {}); t += 1 / 30; setTimeout(draw, 33); }; draw();
  }
  // The map's top bar and the panel for the chosen node.
  U.map = function (o) {
    const p = o.p, PR = P(), need = PR.need(p.lvl), H = DD().HEROES[p.hero];
    const bar = `<div class="map-bar">
      <div class="lvl"><div class="lvl-num">${p.lvl}</div><div class="lvl-info"><b>Level ${p.lvl}</b><div class="xpbar"><i style="width:${p.lvl >= PR.MAX_LVL ? 100 : Math.round(p.xp / need * 100)}%"></i></div><small>${p.lvl >= PR.MAX_LVL ? 'Max level' : p.xp + ' / ' + need + ' XP'}</small></div></div>
      <button class="chip ${p.sp ? 'hot' : ''}" data-act="skills" type="button">Skills ${p.sp ? `<span class="badge">${p.sp}</span>` : ''}</button>
      <button class="chip" data-act="heroes" type="button" style="--hc:${H.color}"><span class="dot"></span>${esc(H.name)}</button>
      <span class="chip" style="cursor:default">★ ${PR.totalStars(p)} / ${PR.maxStars()}</span>
      <button class="chip icon" data-act="menu" type="button" aria-label="Menu">☰</button></div>`;
    const n = o.sel && PR.node(o.sel);
    let panel;
    if (!n) panel = `<p class="np-empty">Choose a place on the Spire.</p>`;
    else {
      const st = PR.state(p, n.id), T = PR.TYPES[n.type], A = PR.ACTS[n.act], rec = PR.rec(p, n.id), goals = PR.goals(n), got = rec && rec.stars ? rec.stars : [];
      let body = `<span class="np-type" style="--tc:${T.col}">${esc(T.label)}</span><h2>${esc(n.name)}</h2>${n.sub ? `<p class="np-sub">${esc(n.sub)}</p>` : ''}`;
      body += `<p class="np-h">Act ${A.num} · ${esc(A.name)}</p>`;
      if (n.type === 'shrine') body += `<p class="tip">A quiet place on the climb. Kneel here for a skill point and experience.</p>`;
      else {
        const b = PR.build(n);
        if (n.rule) body += `<div class="np-rule">${esc(PR.RULES[n.rule](n.n))}</div>`;
        const foes = {}; for (const w of b.node.waves) for (const k of w) if (k !== '+') { const f = DD().FOES[k]; foes[f.name] = foes[f.name] || !!f.boss; }
        body += `<p class="np-h">Foes</p><div class="np-foes">${Object.keys(foes).map((nm) => `<span class="${foes[nm] ? 'boss' : ''}">${esc(nm)}</span>`).join('')}${b.node.rules.elites || n.act >= 1 ? '<span class="boss">Elites</span>' : ''}</div>`;
        body += `<p class="np-h">Goals</p><ul class="goals">${goals.map((g, i) => `<li class="${got[i] ? 'on' : ''}"><i class="st"></i>${esc(g.text)}</li>`).join('')}</ul>`;
        if (rec && rec.best) body += `<p class="tip">Best time ${rec.best}s · won ${rec.wins}×</p>`;
      }
      const xp = PR.baseXp(n), sp = PR.spOf(n), cleared = st === 'cleared';
      body += `<p class="np-h">Reward</p><div class="np-reward"><span><b>+${cleared && n.type !== 'shrine' ? Math.round(xp * 0.3) : xp}</b> XP</span>${!cleared && sp ? `<span><b>+${sp}</b> skill point</span>` : ''}${!cleared && n.type !== 'shrine' && n.type !== 'trial' ? '<span><b>+25%</b> XP per new star</span>' : ''}</div>`;
      for (const id in PR.UNLOCKS) { const u = PR.UNLOCKS[id]; if (((u.kind === 'boss' && u.node === n.id) || (u.kind === 'feat' && n.rule === 'nohit')) && !PR.heroOk(p, id)) body += `<div class="np-unlock" style="--hc:${DD().HEROES[id].color}">Unlocks a new hero: ${esc(DD().HEROES[id].name)}</div>`; }
      let go;
      if (st === 'locked') go = `<button class="big-btn" disabled type="button">Locked</button><p class="np-as">Clear a node below to reach this one.</p>`;
      else if (n.type === 'shrine') go = cleared ? `<button class="big-btn" disabled type="button">Claimed</button>` : `<button class="big-btn gold" data-act="go" type="button">Kneel</button>`;
      else go = `<button class="big-btn" data-act="go" type="button">${cleared ? 'Fight again' : n.type === 'trial' ? 'Begin' : 'Fight'}</button><p class="np-as" style="--hc:${H.color}">As ${esc(H.name)} · <button data-act="heroes" type="button">change</button></p>`;
      panel = body + `<div class="np-go">${go}</div>`;
    }
    const el = U.show('map', bar + `<aside class="map-panel">${panel}</aside>`, null, { back: o.onMenu });
    el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => { VS.audio.unlock(); VS.audio.sfx('clang_0', 0.4); ({ skills: o.onSkills, heroes: o.onHeroes, menu: o.onMenu, go: o.onGo })[b.dataset.act](); }));
    const go = el.querySelector('[data-act="go"]'); if (go) go.focus({ preventScroll: true });
    return el;
  };
  // The skill tree: three branches, bought with skill points from the level shown.
  U.skills = function (o) {
    const p = o.p, PR = P(), H = DD().HEROES[p.hero], heroName = (k) => (k.hero != null && H.skills ? ' · ' + H.skills[k.hero].name : k.id === 'art' ? ' · ' + VS.ART[H.art === 'moon' ? 'moon' : H.art].name : '');
    const cols = PR.BRANCHES.map((b) => `<div class="branch" style="--bc:${b.col}"><div class="branch-h"><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></div>` +
      PR.SKILLS.filter((k) => k.br === b.id).map((k) => {
        const c = PR.canBuy(p, k.id), cls = c.owned ? 'owned' : c.ok ? 'can' : 'locked';
        return `<button class="sk ${cls}${k.core ? ' core' : ''}${o.flash === k.id ? ' flash' : ''}" data-id="${k.id}" type="button"><span class="sk-ic">${k.core ? '◆' : k.cost}</span><span class="sk-name">${esc(k.name)}<small style="color:var(--dim);letter-spacing:.04em;text-transform:none;font-family:var(--f-body)">${esc(heroName(k))}</small></span>
          <span class="sk-cost">${c.owned ? 'LEARNED' : c.ok ? k.cost + ' SP' : esc(c.why)}</span><span class="sk-desc">${esc(k.desc)}</span></button>`;
      }).join('') + '</div>').join('');
    const el = U.show('skills', `<div class="tree-wrap"><div class="tree-head"><div><p class="eyebrow">Level ${p.lvl}</p><h2>Skill tree</h2></div>
      <span class="sp"><b>${p.sp}</b>skill point${p.sp === 1 ? '' : 's'} · ${PR.spent(p)} spent</span>
      <div class="tree-actions"><button class="chip" data-act="respec" type="button">${o.confirm ? 'Press again to refund all' : 'Refund all'}</button><button class="chip" data-act="back" type="button">Back to map</button></div></div>
      <div class="tree">${cols}</div><p class="tip">Every level gives a skill point; shrines and guardians give more. ◆ marks the abilities: start with dodge and the heavy attack.</p></div>`, null, { back: o.onBack });
    el.querySelectorAll('.sk').forEach((b) => b.addEventListener('click', () => { VS.audio.unlock(); o.onBuy(b.dataset.id); }));
    el.querySelector('[data-act="back"]').addEventListener('click', () => { VS.audio.sfx('clang_0', 0.4); o.onBack(); });
    el.querySelector('[data-act="respec"]').addEventListener('click', () => o.onRespec());
    const f = el.querySelector('.sk.can') || el.querySelector('[data-act="back"]'); if (f) f.focus({ preventScroll: true });
    return el;
  };
  // The roster: every hero, locked ones as silhouettes with what it takes to earn them.
  U.roster = function (o) {
    const p = o.p, PR = P(), D = DD();
    const html = D.HERO_ORDER.map((id, i) => {
      const H = D.HEROES[id], ok = PR.heroOk(p, id), g = PR.heroGoal(p, id);
      const kit = H.skills.map((k, j) => `<b>${j ? 'F' : 'R'}</b> ${esc(k.name)}`).join('<br>') + `<br><b>E</b> ${esc(VS.ART[H.art === 'moon' ? 'moon' : H.art].name)}`;
      return `<button class="btn card hero${ok ? '' : ' locked'}${id === p.hero ? ' focus-first' : ''}" data-i="${i}" type="button" style="--hc:${H.color}"><canvas class="hero-fig" width="96" height="96" data-set="${H.set}" data-lock="${ok ? '' : 1}"></canvas>
        <span class="btn-label">${ok ? esc(H.name) : '???'}</span><span class="hero-title">${ok ? esc(H.title) + ' · ' + esc(H.weapon) : 'Locked'}</span>
        ${ok ? `<span class="btn-sub">${esc(H.blurb)}</span><span class="hero-kit">${kit}</span>${id === p.hero ? '<span class="hero-cur">Climbing now</span>' : ''}` : `<span class="lockreq">${esc(g.text)}</span><span class="lockbar"><i style="width:${Math.round(g.now / g.of * 100)}%"></i></span><span class="btn-sub">${g.of > 1 ? g.now + ' / ' + g.of : ''}</span>`}</button>`;
    }).join('');
    const items = D.HERO_ORDER.map((id) => ({ act: () => { if (PR.heroOk(p, id)) o.pick(id); else VS.audio.sfx('thud', 0.5); } }));
    const el = U.show('roster', `<div class="boon-wrap"><p class="eyebrow">${p.heroes.length} of ${D.HERO_ORDER.length} heroes</p><h2>Who climbs tonight?</h2><nav class="cards heroes roster">${html}</nav><nav class="menu center"><button class="btn" data-i="${D.HERO_ORDER.length}" type="button"><span class="btn-label">Back</span></button></nav></div>`, items.concat([{ act: o.onBack }]), { back: o.onBack });
    el.querySelectorAll('canvas.hero-fig').forEach((c) => figure(c, c.dataset.set, c.dataset.lock ? { shade: '#05030a' } : {}));
  };
  // After a fight: stars, experience filling the bar, level-ups, new heroes.
  U.result = function (o) {
    const r = o.r, PR = P(), p = o.p, win = o.win;
    const goals = r.goals || [], stars = r.stars || [];
    let body = `<p class="eyebrow">${esc(o.node.name)}</p><h2 class="${win ? 'win' : 'lose'}">${win ? 'Victory' : 'You fell'}</h2>`;
    if (win && goals.length) body += `<div class="res-stars">${goals.map((g, i) => `<i class="st ${stars[i] ? 'on' : ''} ${r.newStars && r.newStars[i] ? 'new' : ''}" style="animation-delay:${0.15 + i * 0.18}s"></i>`).join('')}</div><ul class="goals">${goals.map((g, i) => `<li class="${stars[i] ? 'on' : ''}"><i class="st"></i>${esc(g.text)}${r.newStars && r.newStars[i] ? ' <b style="color:var(--gold);font-family:var(--f-display);font-size:11px;letter-spacing:.14em">NEW</b>' : ''}</li>`).join('')}</ul>`;
    if (!win) body += `<p class="quote">“Then fall forward.”</p><p class="tip">${esc(o.tip || 'Nothing is lost. Try again, or learn something new in the skill tree.')}</p>`;
    if (o.stats) body += `<div class="stats">${o.stats.map(([v, l]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>`;
    const need = PR.need(p.lvl), pct = p.lvl >= PR.MAX_LVL ? 100 : Math.round(p.xp / need * 100);
    body += `<div class="res-xp"><div class="row"><span>Level ${p.lvl}</span><b>+${r.xp} XP${r.sp ? ` · +${r.sp} SP` : ''}</b></div><div class="xpbar"><i style="width:${r.ups ? 0 : Math.max(0, pct - 20)}%" data-to="${pct}"></i></div></div>`;
    if (r.ups) body += `<p class="lvlup">Level up! · ${r.ups > 1 ? r.ups + ' levels' : 'level ' + r.lvl} · +${r.ups} skill point${r.ups > 1 ? 's' : ''}</p>`;
    for (const id of r.heroes || []) { const H = DD().HEROES[id]; body += `<div class="unlock-card" style="--hc:${H.color}"><canvas width="64" height="64" data-set="${H.set}"></canvas><div><b>New hero · ${esc(H.name)}</b><span>${esc(H.title)}. Choose them from Heroes on the map.</span></div></div>`; }
    const items = (o.buttons || []).map((b, i) => Object.assign({ cls: i === 0 ? 'focus-first' : '' }, b));
    const el = U.show('result', `<div class="res">${body}${buttons(items, 'center')}</div>`, items, { back: items[items.length - 1] && items[items.length - 1].act });
    setTimeout(() => { const i = el.querySelector('.xpbar i'); if (i) i.style.width = i.dataset.to + '%'; }, 250);
    el.querySelectorAll('.unlock-card canvas').forEach((c) => figure(c, c.dataset.set));
  };
  U.menu = function (o) {
    const items = [{ label: 'Back to the map', act: o.onBack, cls: 'focus-first' }, { label: 'Settings', act: o.onSettings }, { label: 'Title screen', act: o.onTitle }];
    U.show('pause', `<div class="center"><h2>Menu</h2>${buttons(items, 'center')}</div>`, items, { back: o.onBack, cls: 'dim' });
  };
})();
