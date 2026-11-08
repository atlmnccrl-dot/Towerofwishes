// Bannerborn — every menu screen: shell, camp, campaign, heroes, hero, recruit, team, forge, shop, results, story.
(function () {
  const BB = window.BB;
  const UI = BB.UI = {};
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const click = (e, f) => e && e.addEventListener('click', (ev) => { BB.audioUnlock(); BB.sfx('click'); f(ev); });
  const fmt = (n) => n >= 100000 ? Math.round(n / 1000) + 'k' : n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(Math.floor(n));
  Object.assign(UI, { $, el, esc, click, fmt });
  const now = () => Date.now();
  const copyCanvas = (src) => { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); return c; };
  UI.copyCanvas = copyCanvas;

  // ---------------------------------------------------------------- screens, modals, toast
  const MAIN = ['home', 'heroes', 'team', 'forge', 'shop', 'campaign', 'hero', 'recruit'];
  UI.show = function (id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
    UI.current = id;
    $('shell').classList.toggle('on', MAIN.includes(id));
    $('tabbar').style.display = ['hero', 'recruit', 'campaign'].includes(id) ? 'none' : '';
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === id));
    $('tbTitle').textContent = { home: 'Camp', heroes: 'Heroes', team: 'Team', forge: 'Forge', shop: 'Shop', campaign: 'Campaign', hero: 'Hero', recruit: 'Recruit' }[id] || '';
    UI.refreshTop();
  };
  UI.modal = (id, on) => $(id).classList.toggle('on', on !== false);
  let toastT = 0;
  UI.toast = function (msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); };
  UI.confirm = function (html, yes) {
    $('confText').innerHTML = html; UI.modal('mConfirm');
    $('confYes').onclick = () => { UI.modal('mConfirm', false); yes(); };
    $('confNo').onclick = () => UI.modal('mConfirm', false);
  };
  UI.refreshTop = function () {
    const S = BB.save; if (!S) return;
    $('tbPower').textContent = fmt(BB.teamPower(BB.teamHeroes(S)));
    $('tbCrys').textContent = fmt(S.crystals); $('tbGold').textContent = fmt(S.gold);
    // a red dot where something is waiting
    const canRecruit = BB.heroTiers(BB.ROSTER).some(({ tier, heroes }) => BB.tierOpen(S, tier) && S.crystals >= tier.cost && heroes.some((e) => !S.heroes.some((h) => h.recruit === e.key)));
    const canLevel = S.heroes.some((h) => h.level < BB.levelCap(h) && S.gold >= BB.levelCost(h) * 3);
    const set = (tab, on) => { const t = document.querySelector('.tab[data-tab="' + tab + '"]'); let b = t.querySelector('.badge'); if (on && !b) { b = el('span', 'badge', '!'); t.appendChild(b); } if (!on && b) b.remove(); };
    set('heroes', canRecruit || canLevel);
    set('shop', BB.shopLeft(S, BB.SHOP[0], now()) > 0);
    set('team', BB.teamIds(S).length < Math.min(5, S.heroes.length));
  };

  // ---------------------------------------------------------------- banner art, item icons, stats
  function sigilPath(g, s, cx, cy, r) {
    g.beginPath();
    const star = (n, r1, r2, rot) => { for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n; const rr = i % 2 ? r2 : r1; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); };
    switch (s) {
      case 'crown': g.moveTo(cx - r, cy + r * 0.6); g.lineTo(cx - r, cy - r * 0.4); g.lineTo(cx - r * 0.5, cy + r * 0.05); g.lineTo(cx, cy - r * 0.8); g.lineTo(cx + r * 0.5, cy + r * 0.05); g.lineTo(cx + r, cy - r * 0.4); g.lineTo(cx + r, cy + r * 0.6); g.closePath(); break;
      case 'sword': g.moveTo(cx, cy - r * 1.1); g.lineTo(cx + r * 0.16, cy - r * 0.8); g.lineTo(cx + r * 0.16, cy + r * 0.35); g.lineTo(cx + r * 0.6, cy + r * 0.35); g.lineTo(cx + r * 0.6, cy + r * 0.5); g.lineTo(cx + r * 0.14, cy + r * 0.5); g.lineTo(cx + r * 0.14, cy + r * 1.0); g.lineTo(cx - r * 0.14, cy + r * 1.0); g.lineTo(cx - r * 0.14, cy + r * 0.5); g.lineTo(cx - r * 0.6, cy + r * 0.5); g.lineTo(cx - r * 0.6, cy + r * 0.35); g.lineTo(cx - r * 0.16, cy + r * 0.35); g.lineTo(cx - r * 0.16, cy - r * 0.8); g.closePath(); break;
      case 'tower': g.rect(cx - r * 0.5, cy - r * 0.5, r, r * 1.4); for (let i = 0; i < 3; i++) g.rect(cx - r * 0.65 + i * r * 0.5, cy - r * 0.85, r * 0.3, r * 0.4); g.rect(cx - r * 0.65, cy - r * 0.55, r * 1.3, r * 0.15); break;
      case 'sun': g.arc(cx, cy, r * 0.42, 0, 7); g.moveTo(cx + r, cy); star(12, r * 1.0, r * 0.55, 0); break;
      case 'star': star(5, r, r * 0.42, -Math.PI / 2); break;
      case 'wolf': g.moveTo(cx - r * 0.75, cy - r * 0.9); g.lineTo(cx - r * 0.3, cy - r * 0.35); g.lineTo(cx + r * 0.3, cy - r * 0.35); g.lineTo(cx + r * 0.75, cy - r * 0.9); g.lineTo(cx + r * 0.7, cy + r * 0.1); g.lineTo(cx + r * 0.2, cy + r * 0.95); g.lineTo(cx - r * 0.2, cy + r * 0.95); g.lineTo(cx - r * 0.7, cy + r * 0.1); g.closePath(); break;
      case 'flame': g.moveTo(cx, cy - r * 1.1); g.bezierCurveTo(cx + r * 0.9, cy - r * 0.2, cx + r * 0.8, cy + r * 1.0, cx, cy + r); g.bezierCurveTo(cx - r * 0.8, cy + r * 1.0, cx - r * 0.9, cy - r * 0.1, cx - r * 0.2, cy - r * 0.5); g.bezierCurveTo(cx - r * 0.2, cy, cx + r * 0.1, cy - r * 0.4, cx, cy - r * 1.1); break;
      case 'moon': g.arc(cx, cy, r * 0.9, 0.35 * Math.PI, 1.65 * Math.PI, false); g.arc(cx + r * 0.38, cy, r * 0.72, 1.6 * Math.PI, 0.4 * Math.PI, true); g.closePath(); break;
    }
  }
  UI.drawBanner = function (g, b, w, h, t) {
    t = t || 0;
    g.clearRect(0, 0, w, h);
    const pole = w * 0.06, top = h * 0.05;
    g.fillStyle = '#4a3220'; g.fillRect(w * 0.12, top, pole, h * 0.95);
    g.fillStyle = b.trim; g.beginPath(); g.arc(w * 0.12 + pole / 2, top, pole * 0.9, 0, 7); g.fill();
    g.fillRect(w * 0.08, top + h * 0.05, w * 0.84, h * 0.025);
    const x0 = w * 0.16, x1 = w * 0.9, y0 = top + h * 0.075, y1 = h * 0.82;
    const wave = (x, y) => y + Math.sin(t * 3 + x * 0.05) * h * 0.012 * ((x - x0) / (x1 - x0));
    g.beginPath(); g.moveTo(x0, y0);
    for (let x = x0; x <= x1; x += 4) g.lineTo(x, wave(x, y0));
    g.lineTo(x1, wave(x1, y1)); g.lineTo((x0 + x1) / 2, wave((x0 + x1) / 2, y1 - h * 0.12)); g.lineTo(x0, y1); g.closePath();
    const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, shade(b.color, -0.25)); gr.addColorStop(0.4, b.color); gr.addColorStop(1, shade(b.color, -0.35));
    g.fillStyle = gr; g.fill();
    g.lineWidth = Math.max(2, w * 0.025); g.strokeStyle = b.trim; g.stroke();
    g.save(); g.fillStyle = b.trim; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = w * 0.03;
    sigilPath(g, b.sigil, (x0 + x1) / 2, (y0 + y1) / 2 - h * 0.05, w * 0.22); g.fill('evenodd'); g.restore();
  };
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.round(Math.max(0, Math.min(255, k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  UI.bannerCanvas = function (b, w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; UI.drawBanner(c.getContext('2d'), b, w, h, 0); return c; };


  const iconCache = {};
  UI.itemIcon = function (it, size) {
    size = size || 30;
    const key = it.slot + (it.look || it.wtype) + it.tint + size;
    if (iconCache[key]) return iconCache[key];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    let layer = it.look, clip = 'Idle', dir = 2, fr = 0;
    if (it.slot === 'weapon') { layer = { sword: 'sword', axe: 'axe' }[it.wtype] || null; dir = 0; }
    if (it.slot === 'weapon' && !layer) drawWeapon(g, it.wtype, size, BB.RARITY[it.rarity].color);
    else if (layer && BB.A.chars[layer]) {
      const a = BB.A.chars[layer], n = a.meta.clips[clip], r = a.meta.f[clip][dir * n + fr];
      const img = BB.atlasImg(layer, BB.tintSpec(layer, it.tint), it.tint);
      const k = Math.min((size - 4) / r[2], (size - 4) / r[3]);
      g.shadowColor = 'rgba(255,240,210,0.55)'; g.shadowBlur = Math.max(2, size / 14);
      g.drawImage(img, r[0], r[1], r[2], r[3], (size - r[2] * k) / 2, (size - r[3] * k) / 2, r[2] * k, r[3] * k);
      g.shadowBlur = 0;
    } else {
      const col = BB.RARITY[it.rarity].color;
      const gr = g.createRadialGradient(size * 0.4, size * 0.35, 1, size / 2, size / 2, size * 0.42);
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, col); gr.addColorStop(1, 'rgba(0,0,0,0.6)');
      g.fillStyle = gr;
      if (it.slot === 'charm') { g.beginPath(); g.moveTo(size / 2, 3); g.lineTo(size - 5, size / 2); g.lineTo(size / 2, size - 3); g.lineTo(5, size / 2); g.closePath(); g.fill(); }
      else { g.beginPath(); g.arc(size / 2, size / 2, size * 0.36, 0, 7); g.fill(); }
    }
    if (layer && !BB.A.chars[layer]) { BB.loadChar(layer).catch(() => null); return c; } // not cached: drawn properly once the art is in
    iconCache[key] = c; return c;
  };
  function drawWeapon(g, w, s, col) {
    g.save(); g.translate(s / 2, s / 2); g.rotate(-Math.PI / 4); g.lineCap = 'round'; g.lineJoin = 'round';
    const k = s / 40;
    if (w === 'bow') {
      g.strokeStyle = '#8a5a2a'; g.lineWidth = 3.2 * k; g.beginPath(); g.arc(-4 * k, 0, 15 * k, -1.2, 1.2); g.stroke();
      g.strokeStyle = '#e8dcc0'; g.lineWidth = 1 * k; g.beginPath(); g.moveTo(-4 * k + Math.cos(-1.2) * 15 * k, Math.sin(-1.2) * 15 * k); g.lineTo(-4 * k + Math.cos(1.2) * 15 * k, Math.sin(1.2) * 15 * k); g.stroke();
      g.strokeStyle = col; g.lineWidth = 1.6 * k; g.beginPath(); g.moveTo(-6 * k, 0); g.lineTo(15 * k, 0); g.stroke();
    } else if (w === 'spear') {
      g.strokeStyle = '#7a5230'; g.lineWidth = 2.6 * k; g.beginPath(); g.moveTo(-17 * k, 0); g.lineTo(9 * k, 0); g.stroke();
      g.fillStyle = '#d8dde4'; g.beginPath(); g.moveTo(8 * k, -3.5 * k); g.lineTo(18 * k, 0); g.lineTo(8 * k, 3.5 * k); g.closePath(); g.fill();
      g.fillStyle = col; g.fillRect(5 * k, -2 * k, 3 * k, 4 * k);
    } else if (w === 'focus') {
      g.strokeStyle = '#6a4a2a'; g.lineWidth = 2.4 * k; g.beginPath(); g.moveTo(-16 * k, 0); g.lineTo(6 * k, 0); g.stroke();
      const gr = g.createRadialGradient(10 * k, -2 * k, 1, 11 * k, 0, 7 * k); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, col); gr.addColorStop(1, 'rgba(0,0,0,.4)');
      g.fillStyle = gr; g.beginPath(); g.arc(11 * k, 0, 6.5 * k, 0, 7); g.fill();
    } else { // fist wraps
      g.rotate(Math.PI / 4); g.fillStyle = '#b8a07a'; g.fillRect(-9 * k, -6 * k, 18 * k, 14 * k);
      g.fillStyle = col; for (let i = 0; i < 4; i++) g.fillRect(-9 * k + i * 4.6 * k, -10 * k, 3.8 * k, 5 * k);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-9 * k, 3 * k, 18 * k, 2 * k);
    }
    g.restore();
  }
  // numbers for stats: whole numbers, one decimal below ten, percent for crit and speed
  UI.num = (k, v) => (k === 'crit' || k === 'spd') ? Math.round(v * 100) + '%' : v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
  UI.statLine = function (s) {
    const out = [];
    if (s.atk) out.push('+' + UI.num('atk', s.atk) + ' ATK'); if (s.hp) out.push('+' + Math.round(s.hp) + ' HP'); if (s.def) out.push('+' + UI.num('def', s.def) + ' DEF');
    if (s.crit) out.push('+' + Math.round(s.crit * 100) + '% CRIT'); if (s.spd) out.push('+' + Math.round(s.spd * 100) + '% SPD');
    return out.join(' · ');
  };


  UI.story = function (lines, done) {
    if (!lines || !lines.length || (BB.save && BB.save.settings.skipStory)) { done && done(); return; }
    let i = 0;
    const card = document.querySelector('#story .card');
    const cv = document.querySelector('#story canvas'), g = cv.getContext('2d');
    const prev = UI.current;
    const show = () => {
      const [who, text] = lines[i];
      g.clearRect(0, 0, 78, 78);
      let name = '', col = '#e8c66a';
      if (who === 'narr') { cv.style.display = 'none'; }
      else {
        cv.style.display = '';
        let hero = null;
        if (who === 'captain') hero = BB.save.heroes.find((h) => h.captain);
        else if (BB.LEGENDS[who]) hero = BB.save.heroes.find((h) => h.legend === who) || BB.newHero({ legend: who });
        if (hero) { g.drawImage(BB.portrait(hero, 78), 0, 0); name = hero.name; col = BB.heroColor(hero); }
      }
      card.querySelector('.who').textContent = name; card.querySelector('.who').style.color = col;
      const say = card.querySelector('.say'); say.textContent = text; say.classList.toggle('narr', who === 'narr');
    };
    show();
    document.querySelectorAll('.screen').forEach((s) => { if (s.id === 'story') s.classList.add('on'); });
    const s = $('story');
    s.onclick = () => {
      BB.audioUnlock(); BB.sfx('click');
      i++;
      if (i >= lines.length) { s.classList.remove('on'); s.onclick = null; done && done(); } else show();
    };
  };


  // ---------------------------------------------------------------- hero cards
  const RCLS = (r) => 'r' + (r || 0);
  UI.heroCard = function (h, opts) {
    opts = opts || {};
    const c = el(opts.tag || 'button', 'hc ' + RCLS(h.rarity) + (opts.inteam ? ' inteam' : ''));
    c.appendChild(copyCanvas(BB.portrait(h, 64)));
    c.appendChild(el('div', 'lv', 'Lv ' + h.level));
    c.appendChild(el('div', 'st', '★'.repeat(h.stars || 1)));
    c.appendChild(el('div', 'cl', BB.CALLINGS[h.calling].name));
    c.appendChild(el('div', 'nm', esc(BB.shortName(h))));
    if (!opts.noPower) c.appendChild(el('div', 'pw', '⚔ ' + fmt(BB.power(h))));
    if (opts.onClick) click(c, opts.onClick);
    return c;
  };
  UI.thumb = function (key, size) {
    const c = document.createElement('canvas'); c.width = c.height = size || 40;
    const P = BB.A.portraits; if (!P) return c; const r = P.meta.f[key]; if (!r) return c;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(P.img, r[0], r[1], r[2], r[3], 0, 0, c.width, c.height);
    return c;
  };
  const sortHeroes = (list) => list.slice().sort((a, b) => BB.power(b) - BB.power(a));

  // ---------------------------------------------------------------- home (camp)
  const H = UI.home = { t: 0 };
  UI.leader = function () {
    const S = BB.save; let h = S.heroes.find((x) => x.id === S.leader);
    if (!h) { h = sortHeroes(S.heroes)[0]; S.leader = h.id; }
    return h;
  };
  UI.renderHome = function () {
    const S = BB.save, h = UI.leader();
    $('hmStars').textContent = '★'.repeat(h.stars);
    $('hmName').textContent = h.name;
    $('hmMeta').textContent = 'Lv ' + h.level + ' · ' + BB.HERO_RARITY[h.rarity].name + ' ' + BB.CALLINGS[h.calling].name + ' · ⚔ ' + fmt(BB.power(h));
    const ni = BB.nextStageIdx(S), st = BB.MISSIONS[ni];
    $('bContinue').textContent = BB.campaignDone(S) ? '▶ Campaign' : '▶ Stage ' + st.code;
    $('hmNext').textContent = BB.campaignDone(S) ? 'The Cantor is silenced. Replay any stage.' : st.name + ' · recommended ⚔ ' + fmt(BB.recPower(st));
    UI.updateSpoils();
    const open = BB.heroTiers(BB.ROSTER).filter(({ tier }) => BB.tierOpen(S, tier));
    const cheapest = open.length ? Math.min(...open.map(({ tier }) => tier.cost)) : 0;
    $('recruitT').textContent = '◆ ' + cheapest;
    $('bRecruitH').classList.toggle('glow', S.crystals >= cheapest);
    const qn = BB.questsReady(S); $('questT').textContent = qn ? qn + ' ready' : BB.QUESTS.filter((q) => BB.questState(S, q) === 'claimed').length + ' / ' + BB.QUESTS.length;
    $('bQuests').classList.toggle('glow', qn > 0);
    H.t = 0;
  };
  UI.updateSpoils = function () {
    const S = BB.save; if (!S) return;
    const p = BB.idlePending(S, now()), m = Math.floor(p.ms / 60000);
    $('spoilsT').textContent = (m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm') + (p.ms >= BB.IDLE_CAP ? ' · full' : '');
    $('bSpoils').classList.toggle('glow', p.gold >= 50);
  };
  UI.homeRender = function (dt) {
    const c = $('homeHero'); if (!c || !BB.save) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'); g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false;
    H.t += dt;
    const hero = UI.leader(), layers = BB.heroLayers(hero), key = layers[0].key;
    const cyc = H.t % 8, clip = cyc > 6.3 ? (BB.hasClip(key, 'Taunt') ? 'Taunt' : 'Special1') : 'Idle';
    const n = BB.clipLen(key, clip) || 15;
    const fr = clip === 'Idle' ? Math.floor(H.t * 9) % n : Math.min(n - 1, Math.floor((cyc - 6.3) * 13));
    const sc = Math.max(2, Math.round(h / 125));
    const cx = w / 2, cy = h * 0.9, gr = Math.min(w, h) * 0.48;
    const gl = g.createRadialGradient(cx, cy - 26 * sc, 0, cx, cy - 26 * sc, gr);
    gl.addColorStop(0, 'rgba(255,190,90,0.28)'); gl.addColorStop(1, 'rgba(255,190,90,0)'); g.fillStyle = gl; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(cx, cy, 16 * sc, 6 * sc, 0, 0, 7); g.fill();
    BB.drawLayers(g, layers, clip, 2, fr, cx, cy, sc, { noSlash: clip === 'Idle' });
  };

  // ---------------------------------------------------------------- campaign
  const C = UI.camp = { ch: 1, sel: 0, nodes: [] };
  UI.openCampaign = function (idx) {
    const S = BB.save;
    C.sel = idx !== undefined ? idx : BB.nextStageIdx(S);
    C.ch = BB.MISSIONS[C.sel].chapter;
    UI.renderCampaign(); UI.show('campaign');
  };
  UI.renderCampaign = function () {
    const S = BB.save, box = $('chapters'); box.innerHTML = '';
    for (const ch of BB.CHAPTERS) {
      const first = BB.MISSIONS.findIndex((m) => m.chapter === ch.id), open = BB.stageUnlocked(S, first);
      const b = el('button', 'chip' + (C.ch === ch.id ? ' on' : ''), (open ? '' : '🔒 ') + ch.id + ' · ' + esc(ch.name)); b.disabled = !open;
      click(b, () => { C.ch = ch.id; const ms = BB.MISSIONS.map((m, i) => [m, i]).filter(([m]) => m.chapter === ch.id); const nx = ms.find(([m, i]) => !S.cleared[m.id] && BB.stageUnlocked(S, i)); C.sel = (nx || ms[ms.length - 1])[1]; UI.renderCampaign(); });
      box.appendChild(b);
    }
    UI.renderStageCard();
  };
  UI.pathRender = function () {
    const c = $('pathCv'); if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'), S = BB.save, t = performance.now() / 1000;
    const ch = BB.CHAPTERS.find((x) => x.id === C.ch);
    // backdrop: a painted strip for the chapter
    const bg = g.createLinearGradient(0, 0, 0, h);
    const tone = { 1: ['#2e3b22', '#141a0f'], 2: ['#4a3a20', '#1c140b'], 3: ['#2c2c33', '#121216'], 4: ['#2a1d3a', '#100a16'] }[ch.id];
    bg.addColorStop(0, tone[0]); bg.addColorStop(1, tone[1]); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const r = BB.rng(ch.id * 99);
    for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,240,200,' + r.range(0.02, 0.06) + ')'; const x = r() * w, y = r() * h, s = r.range(2, 7) * dpr; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
    g.font = '900 ' + Math.round(26 * dpr) + 'px Cinzel, serif'; g.fillStyle = 'rgba(240,207,120,0.12)'; g.textAlign = 'left'; g.fillText(ch.name.toUpperCase(), 16 * dpr, h - 16 * dpr);
    // nodes along a winding road
    const ms = BB.MISSIONS.map((m, i) => [m, i]).filter(([m]) => m.chapter === ch.id);
    C.nodes = ms.map(([m, i], k) => {
      const u = (k + 0.5) / ms.length;
      return { i, m, x: (0.07 + u * 0.86) * w, y: h * (0.5 + Math.sin(u * Math.PI * 2.2 + 0.6) * 0.26) };
    });
    g.lineWidth = 5 * dpr; g.lineCap = 'round';
    for (let k = 0; k < C.nodes.length - 1; k++) {
      const a = C.nodes[k], b = C.nodes[k + 1];
      g.strokeStyle = S.cleared[a.m.id] ? 'rgba(240,207,120,0.75)' : 'rgba(255,255,255,0.15)';
      g.setLineDash(S.cleared[a.m.id] ? [] : [6 * dpr, 7 * dpr]);
      g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 18 * dpr, b.x, b.y); g.stroke();
    }
    g.setLineDash([]);
    for (const n of C.nodes) {
      const open = BB.stageUnlocked(S, n.i), done = S.cleared[n.m.id], boss = n.m.type === 'boss' || n.m.type === 'duel', sel = C.sel === n.i;
      const R = (boss ? 26 : 19) * dpr;
      if (sel) { g.strokeStyle = 'rgba(255,240,180,' + (0.55 + Math.sin(t * 5) * 0.35) + ')'; g.lineWidth = 3 * dpr; g.beginPath(); g.arc(n.x, n.y, R + 7 * dpr, 0, 7); g.stroke(); }
      const gr = g.createRadialGradient(n.x - R * 0.3, n.y - R * 0.4, 1, n.x, n.y, R);
      if (!open) { gr.addColorStop(0, '#6b645a'); gr.addColorStop(1, '#2a2620'); }
      else if (done) { gr.addColorStop(0, '#fff0b0'); gr.addColorStop(1, '#a87a26'); }
      else if (boss) { gr.addColorStop(0, '#ff9a80'); gr.addColorStop(1, '#8a1e14'); }
      else { gr.addColorStop(0, '#9fd0ff'); gr.addColorStop(1, '#1e4f8c'); }
      g.fillStyle = gr; g.beginPath(); g.arc(n.x, n.y, R, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2 * dpr; g.stroke();
      g.fillStyle = done ? '#3a2606' : '#fff'; g.font = '900 ' + Math.round((boss ? 14 : 12) * dpr) + 'px Cinzel, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(boss ? '☠' : !open ? '🔒' : n.m.code, n.x, n.y + 1);
      if (n.m.legend && !done) { g.fillStyle = '#9fe0ff'; g.font = '900 ' + Math.round(12 * dpr) + 'px sans-serif'; g.fillText('★', n.x + R * 0.8, n.y - R * 0.8); }
    }
    g.textBaseline = 'alphabetic';
  };
  UI.pathClick = function (ev) {
    const c = $('pathCv'), rc = c.getBoundingClientRect(), d = c.width / rc.width;
    const x = (ev.clientX - rc.left) * d, y = (ev.clientY - rc.top) * d;
    let best = null, bd = 44 * d;
    for (const n of C.nodes) { const q = Math.hypot(n.x - x, n.y - y); if (q < bd) { bd = q; best = n; } }
    if (best) { C.sel = best.i; BB.sfx('click'); UI.renderStageCard(); }
  };
  UI.foeIcons = function (stage, size) {
    const kinds = []; if (stage.boss) kinds.push(stage.boss);
    stage.waves.forEach((w) => { for (let i = 0; i < w.length; i += 2) if (!kinds.includes(w[i])) kinds.push(w[i]); });
    const box = el('div', 'foes');
    for (const k of kinds.slice(0, 6)) {
      const F = BB.FOES[k]; let art = F.art;
      if (!art && F.pool) { const keys = F.poolPick ? ['h/' + F.poolPick] : BB.poolKeys(F.pool); art = keys.find((q) => BB.A.chars[q]); if (!art && keys[0]) BB.loadChar(keys[0]).then(() => UI.current === 'campaign' && UI.renderStageCard()); }
      let cv;
      if (art && BB.A.chars[art]) cv = copyCanvas(BB.foePortrait(art, F.tint || '', size || 44));
      else { cv = document.createElement('canvas'); cv.width = cv.height = size || 44; if (F.turret) BB.drawFx(cv.getContext('2d'), 'turret', 0, 22, 27, 0.6); else if (F.gate) BB.drawFx(cv.getContext('2d'), 'portal', 0, 22, 22, 0.3); }
      cv.title = F.name; box.appendChild(cv);
    }
    return box;
  };
  const TYPE = { rout: 'Rout every wave', gates: 'Destroy the Gravegates', defend: 'Hold out', boss: 'Boss', duel: 'Duel' };
  UI.renderStageCard = function () {
    const S = BB.save, st = BB.MISSIONS[C.sel], box = $('stageCard'); box.innerHTML = '';
    const open = BB.stageUnlocked(S, C.sel), first = !S.cleared[st.id];
    box.appendChild(el('div', 'code', 'STAGE ' + st.code + (S.cleared[st.id] ? ' · CLEARED' : '')));
    box.appendChild(el('div', 'bigname', esc(st.name)));
    box.appendChild(el('div', 'mute', '<span style="font-size:13px">' + TYPE[st.type] + (st.type === 'defend' ? ' for ' + st.time + ' s' : '') + ' · enemy level ' + st.level + '</span>'));
    const tp = BB.teamPower(BB.teamHeroes(S)), rp = BB.recPower(st);
    box.appendChild(el('div', 'powcmp', '<div class="' + (tp >= rp ? 'ok' : 'lo') + '"><span class="lbl">Your team</span><b>⚔ ' + fmt(tp) + '</b></div><div><span class="lbl">Recommended</span><b>⚔ ' + fmt(rp) + '</b></div>'));
    box.appendChild(el('div', 'lbl', 'Enemies'));
    box.appendChild(UI.foeIcons(st));
    const rw = BB.stageRewards(st, first);
    box.appendChild(el('div', 'lbl', first ? 'First victory' : 'Replay'));
    const rr = el('div', 'rewards');
    rr.innerHTML = '<span class="rw"><span class="ico gold pill" style="width:22px;height:22px">●</span>' + fmt(rw.gold) + '</span>' +
      (rw.crystals ? '<span class="rw"><span class="ico crys" style="width:22px;height:22px;display:inline-block"></span>' + rw.crystals + '</span>' : '') +
      (rw.sigils ? '<span class="rw"><span class="ico sig" style="width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center">✧</span>' + rw.sigils + '</span>' : '') +
      '<span class="rw">🎁 ' + rw.items + ' gear</span>' + (st.legend && first ? '<span class="rw" style="color:#9fe0ff">★ ' + esc(BB.LEGENDS[st.legend].name) + '</span>' : '');
    box.appendChild(rr);
    const b = el('button', 'btn xl', open ? 'Battle ▸' : '🔒 Locked'); b.style.marginTop = 'auto'; b.disabled = !open;
    click(b, () => UI.openTeam(C.sel));
    box.appendChild(b);
  };

  // ---------------------------------------------------------------- heroes
  UI.renderHeroes = function () {
    const S = BB.save, box = $('heroList'); box.innerHTML = '';
    const tiers = BB.heroTiers(BB.ROSTER);
    const total = tiers.reduce((a, t) => a + t.heroes.length, 0) + Object.keys(BB.LEGENDS).length + 1;
    $('hrCount').textContent = 'Heroes ' + S.heroes.length + ' / ' + total + ' · ◆ ' + S.crystals;
    box.appendChild(el('div', 'sect', 'Your heroes'));
    const own = el('div', 'hcards');
    const team = BB.teamIds(S);
    for (const h of sortHeroes(S.heroes)) own.appendChild(UI.heroCard(h, { inteam: team.includes(h.id), onClick: () => UI.openHero(h.id) }));
    box.appendChild(own);
    // the collection: who is still out there, by tier
    for (const { tier, heroes } of tiers) {
      const missing = heroes.filter((e) => !S.heroes.some((h) => h.recruit === e.key));
      if (!missing.length) continue;
      const open = BB.tierOpen(S, tier);
      box.appendChild(el('div', 'sect', '<span style="color:var(--r' + tier.rarity + ')">' + tier.name + '</span> <span class="mute" style="font:700 12px Alegreya Sans;letter-spacing:0">' + (open ? missing.length + ' to recruit · ◆ ' + tier.cost : '🔒 opens after chapter ' + tier.chapter) + '</span>'));
      const g = el('div', 'hcards');
      for (const e of missing) {
        const c = el('button', 'hc locked ' + RCLS(tier.rarity));
        c.appendChild(UI.thumb(e.key, 48)); c.appendChild(el('div', 'cl', open ? BB.CALLINGS[e.calling].name : '???'));
        c.appendChild(el('div', 'nm', open ? esc(e.name.split(' ')[0]) : '???'));
        click(c, () => UI.openRecruit());
        g.appendChild(c);
      }
      box.appendChild(g);
    }
    const leg = Object.keys(BB.LEGENDS).filter((id) => !S.heroes.some((h) => h.legend === id));
    if (leg.length) {
      box.appendChild(el('div', 'sect', '<span style="color:var(--r3)">Legends</span> <span class="mute" style="font:700 12px Alegreya Sans;letter-spacing:0">join through the story</span>'));
      const g = el('div', 'hcards');
      for (const id of leg) {
        const st = BB.MISSIONS.find((m) => m.legend === id);
        const c = el('div', 'hc locked r3');
        if (BB.A.chars[BB.LEGENDS[id].art]) c.appendChild(copyCanvas(BB.portrait(BB.newHero({ legend: id }), 64)));
        c.appendChild(el('div', 'cl', 'Stage ' + (st ? st.code : '?'))); c.appendChild(el('div', 'nm', '???'));
        g.appendChild(c);
      }
      box.appendChild(g);
    }
  };

  // ---------------------------------------------------------------- hero detail
  const D = UI.hd = { id: null, t: 0 };
  UI.openHero = function (id) { D.id = id; D.t = 0; UI.renderHero(); UI.show('hero'); };
  UI.renderHero = function () {
    const S = BB.save, h = S.heroes.find((x) => x.id === D.id); if (!h) return;
    const Cl = BB.CALLINGS[h.calling], R = BB.HERO_RARITY[h.rarity];
    $('hrShow').className = 'show ' + RCLS(h.rarity);
    $('hrRk').textContent = R.name + (h.legend ? ' · Legend' : h.captain ? ' · Banner-Captain' : '');
    $('hrNm').textContent = h.name; $('hrCl').textContent = Cl.name + ' · ' + Cl.role + (BB.heroElem(h) && Cl.ranged ? ' · ' + BB.ELEMENTS[BB.heroElem(h)].name : '');
    $('hrStars').textContent = '★'.repeat(h.stars) + '☆'.repeat(BB.MAX_STARS - h.stars);
    const team = BB.teamHeroes(S), st = BB.heroStats(h, BB.teamIds(S).includes(h.id) ? team.map((x) => x.calling) : null);
    const box = $('hrInfo'); box.innerHTML = '';
    box.appendChild(el('div', 'power', '<span class="lbl">Power</span><b>⚔ ' + fmt(BB.power(h)) + '</b><span class="mute">Lv ' + h.level + ' / ' + BB.levelCap(h) + '</span>'));
    box.appendChild(el('div', 'stats', '<div>Health<b>' + fmt(st.hp) + '</b></div><div>Attack<b>' + Math.round(st.atk) + '</b></div><div>Defence<b>' + Math.round(st.def) + '</b></div><div>Crit<b>' + Math.round(st.crit * 100) + '%</b></div><div>Speed<b>' + st.spd.toFixed(1) + '</b></div><div>Range<b>' + (Cl.ranged ? 'Far' : 'Melee') + '</b></div>'));
    box.appendChild(el('div', 'ult ' + RCLS(h.rarity), '<div class="gem"></div><div><b>Ultimate · ' + Cl.skill.name + '</b><p>' + Cl.skill.desc + '</p></div>'));
    // upgrade buttons
    const ups = el('div', 'ups');
    const capped = h.level >= BB.levelCap(h);
    const lv = el('button', 'btn', capped ? 'Level cap' : 'Level up<span class="cost">● ' + fmt(BB.levelCost(h)) + '</span>');
    lv.disabled = capped || S.gold < BB.levelCost(h);
    click(lv, () => { if (BB.levelUp(S, h)) { BB.sfx('levelup'); BB.persist(); UI.renderHero(); UI.refreshTop(); D.flash = 0.5; } });
    const maxS = h.stars >= BB.MAX_STARS;
    const as = el('button', 'btn blue', maxS ? 'Max stars' : 'Ascend ★<span class="cost">✧ ' + S.sigils + ' / ' + BB.ascendCost(h) + '</span>');
    as.disabled = maxS || S.sigils < BB.ascendCost(h);
    click(as, () => { if (BB.ascend(S, h)) { BB.sfx('rally'); BB.persist(); UI.renderHero(); UI.refreshTop(); D.flash = 1; UI.toast(h.name + ' ascends to ' + h.stars + ' stars! Level cap ' + BB.levelCap(h)); } });
    const mx = el('button', 'btn dark', 'Max'); mx.style.flex = '0 0 auto'; mx.disabled = lv.disabled; mx.title = 'Level up as far as your gold allows';
    click(mx, () => { const n = BB.levelMax(S, h); if (n) { BB.sfx('levelup'); BB.persist(); UI.renderHero(); UI.refreshTop(); D.flash = 0.7; UI.toast(h.name + ' +' + n + ' level' + (n > 1 ? 's' : '')); } });
    ups.appendChild(lv); ups.appendChild(mx); ups.appendChild(as);
    box.appendChild(ups);
    if (capped && !maxS) box.appendChild(el('div', 'mute', '<span style="font-size:12px">Ascend to raise the level cap. Sigils come from bosses, idle spoils and the shop.</span>'));
    // gear
    const gh = el('div', 'row'); gh.appendChild(el('div', 'lbl grow', 'Gear')); const eb = el('button', 'btn dark sm', 'Equip best'); click(eb, () => { BB.equipBest(S, h); BB.persist(); UI.renderHero(); UI.refreshTop(); }); gh.appendChild(eb);
    box.appendChild(gh);
    const g4 = el('div', 'gear4');
    for (const slot of BB.SLOTS) {
      const it = h.gear[slot];
      const b = el('button', 'gs');
      if (it) { b.style.setProperty('--ic', BB.RARITY[it.rarity].color); b.appendChild(UI.itemIcon(it, 40)); if (it.plus) b.appendChild(el('span', 'plus', '+' + it.plus)); }
      else { b.appendChild(el('span', 'glyph', { weapon: '⚔', chest: '⛨', head: '⛑', charm: '✦' }[slot])); if (S.inventory.some((x) => x.slot === slot && BB.canEquip(h, x))) b.appendChild(el('span', 'new', '+')); }
      b.appendChild(el('small', '', BB.SLOT_NAME[slot]));
      click(b, () => UI.pickGear(h, slot));
      g4.appendChild(b);
    }
    box.appendChild(g4);
    const row = el('div', 'row'); row.style.marginTop = 'auto';
    const lead = el('button', 'btn dark sm', S.leader === h.id ? '✔ Shown at camp' : 'Show at camp'); click(lead, () => { S.leader = h.id; BB.persist(); UI.renderHero(); }); row.appendChild(lead);
    row.appendChild(el('div', 'grow'));
    const back = el('button', 'btn dark sm', '‹ Heroes'); click(back, () => UI.go('heroes')); row.appendChild(back);
    box.appendChild(row);
  };
  UI.heroStep = function (d) {
    const S = BB.save, list = sortHeroes(S.heroes), i = list.findIndex((x) => x.id === D.id);
    D.id = list[(i + d + list.length) % list.length].id; D.t = 0; UI.renderHero();
  };
  UI.heroRender = function (dt) {
    const c = $('hrCv'); if (!c) return; const S = BB.save, h = S.heroes.find((x) => x.id === D.id); if (!h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), hh = Math.round(c.clientHeight * dpr); if (!w || !hh) return;
    if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh; }
    const g = c.getContext('2d'); g.clearRect(0, 0, w, hh); g.imageSmoothingEnabled = false;
    D.t += dt;
    const layers = BB.heroLayers(h), key = layers[0].key, ult = BB.CALLINGS[h.calling];
    const cyc = D.t % 7, clip = cyc > 5 ? (BB.hasClip(key, 'Special1') ? 'Special1' : 'Taunt') : cyc > 3.4 && cyc < 4.3 ? ult.basic[0] : 'Idle';
    const n = BB.clipLen(key, clip) || 15;
    const fr = clip === 'Idle' ? Math.floor(D.t * 9) % n : Math.min(n - 1, Math.floor((cyc - (clip === 'Idle' ? 0 : cyc > 5 ? 5 : 3.4)) * 15));
    const sc = Math.max(2, Math.round(hh / 118));
    const cx = w / 2, cy = hh * 0.88;
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(cx, cy, 16 * sc, 6 * sc, 0, 0, 7); g.fill();
    BB.drawLayers(g, layers, clip, Math.floor(D.t / 2.4) % 2 ? 1 : 2, fr, cx, cy, sc, { noSlash: clip === 'Idle', flash: D.flash > 0 ? D.flash : 0 });
    if (D.flash > 0) D.flash = Math.max(0, D.flash - dt * 1.5);
  };
  UI.pickGear = function (h, slot) {
    const S = BB.save, body = $('pickBody'); body.innerHTML = '';
    body.appendChild(el('h3', 'gold', BB.SLOT_NAME[slot] + ' for ' + esc(BB.shortName(h))));
    const cur = h.gear[slot];
    if (cur) body.appendChild(el('div', 'mute', 'Equipped: <span style="color:' + BB.RARITY[cur.rarity].color + '">' + esc(cur.name) + (cur.plus ? ' +' + cur.plus : '') + '</span> · ' + UI.statLine(BB.itemStats(cur))));
    const list = S.inventory.filter((it) => it.slot === slot && BB.canEquip(h, it)).sort((a, b) => BB.itemScore(b) - BB.itemScore(a));
    const grid = el('div', 'pick scroll');
    if (!list.length) grid.appendChild(el('div', 'mute', 'Nothing in the armory for this slot yet. Gear drops from stages and chests, and the shop sells it.'));
    for (const it of list) {
      const b = el('button', 'prow'); b.style.setProperty('--ic', BB.RARITY[it.rarity].color);
      const ic = el('div', 'it'); ic.appendChild(UI.itemIcon(it, 40)); if (it.plus) ic.appendChild(el('span', 'plus', '+' + it.plus)); b.appendChild(ic);
      b.appendChild(el('div', 'grow', '<b style="color:' + BB.RARITY[it.rarity].color + '">' + esc(it.name) + (it.plus ? ' +' + it.plus : '') + '</b><small>' + UI.statLine(BB.itemStats(it)) + '</small>'));
      const diff = BB.itemScore(it) - BB.itemScore(cur);
      b.appendChild(el('span', 'delta ' + (diff >= 0 ? 'up' : 'down'), (diff >= 0 ? '▲ ' : '▼ ') + Math.abs(diff)));
      click(b, () => { S.inventory.splice(S.inventory.indexOf(it), 1); if (cur) S.inventory.push(cur); h.gear[slot] = it; BB.persist(); BB.sfx('forge'); UI.modal('mPick', false); UI.renderHero(); UI.refreshTop(); });
      grid.appendChild(b);
    }
    body.appendChild(grid);
    const row = el('div', 'row'); row.style.justifyContent = 'flex-end';
    if (cur) { const u = el('button', 'btn dark sm', 'Take off'); click(u, () => { S.inventory.push(cur); h.gear[slot] = null; BB.persist(); UI.modal('mPick', false); UI.renderHero(); UI.refreshTop(); }); row.appendChild(u); }
    const x = el('button', 'btn sm', 'Close'); click(x, () => UI.modal('mPick', false)); row.appendChild(x);
    body.appendChild(row);
    UI.modal('mPick');
  };

  // ---------------------------------------------------------------- recruit
  const RC = UI.rec = { t: 0, cvs: [] };
  UI.openRecruit = async function () { await BB.loadPortraits(); UI.renderRecruit(); UI.show('recruit'); };
  UI.renderRecruit = function () {
    const S = BB.save, box = $('altars'); box.innerHTML = ''; RC.cvs = [];
    for (const { tier, heroes } of BB.heroTiers(BB.ROSTER)) {
      const open = BB.tierOpen(S, tier), left = heroes.filter((e) => !S.heroes.some((h) => h.recruit === e.key)).length;
      const a = el('div', 'altar ' + RCLS(tier.rarity) + (open ? '' : ' locked'));
      const cv = document.createElement('canvas'); a.appendChild(cv); RC.cvs.push({ cv, r: tier.rarity, open });
      a.appendChild(el('h3', '', tier.name));
      a.appendChild(el('div', 'mute', open ? (BB.TIERS.indexOf(tier) ? '★'.repeat(tier.rarity + 1) + ' heroes, stronger base stats' : 'Steady recruits to fill your ranks') : '🔒 Clear chapter ' + tier.chapter + ' · ' + esc(BB.CHAPTERS[tier.chapter - 1].name)));
      a.appendChild(el('div', 'left', left + ' left to recruit'));
      const faces = el('div', 'faces');
      for (const e of heroes.filter((x) => !S.heroes.some((h) => h.recruit === x.key)).slice(0, 5)) faces.appendChild(UI.thumb(e.key, 40));
      a.appendChild(faces);
      const b = el('button', 'btn', 'Recruit <span class="cost">◆ ' + tier.cost + '</span>');
      b.disabled = !open || !left || S.crystals < tier.cost;
      click(b, () => {
        const h = BB.summon(S, BB.ROSTER, tier.id); if (!h) return;
        BB.persist(); UI.refreshTop();
        BB.loadChar('h/' + h.recruit).then(() => UI.reveal(h, () => UI.renderRecruit()));
      });
      a.appendChild(b);
      box.appendChild(a);
    }
  };
  UI.recruitRender = function (dt) {
    RC.t += dt;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const k of RC.cvs) {
      const c = k.cv, w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (!w || !h) continue;
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const g = c.getContext('2d'); g.clearRect(0, 0, w, h);
      if (!k.open) { BB.drawFx(g, 'portal', 0, w / 2, h / 2, h / 80, { alpha: 0.3 }); continue; }
      BB.drawFx(g, 'portal', Math.floor(RC.t * 12) % (BB.fxLen('portal') || 1), w / 2, h / 2, h / 70, { add: true, hue: [0, 170, 30, -160][k.r] });
    }
  };
  // the reveal: a gate tears open, light pours down, the hero steps out
  const RV = UI.rv = { on: false };
  UI.reveal = function (h, done) {
    RV.on = true; RV.t = 0; RV.h = h; RV.done = done;
    const R = BB.HERO_RARITY[h.rarity];
    $('reveal').style.setProperty('--rc', R.color);
    $('rvRk').textContent = '★'.repeat(h.stars) + ' ' + R.name + (h.legend ? ' Legend' : '');
    $('rvNm').textContent = h.name; $('rvCl').textContent = BB.CALLINGS[h.calling].name + ' · ' + BB.CALLINGS[h.calling].role;
    $('reveal').classList.remove('done'); $('reveal').classList.add('on');
    BB.sfx('portal'); setTimeout(() => BB.sfx(h.rarity >= 2 ? 'rally' : 'levelup'), 900);
  };
  click($('rvOk'), () => { RV.on = false; $('reveal').classList.remove('on'); RV.done && RV.done(); });
  UI.revealRender = function (dt) {
    if (!RV.on) return;
    RV.t += dt;
    const c = $('revealCv'), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'); g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false;
    const cx = w / 2, cy = h * 0.54, hue = [0, 170, 30, -160][RV.h.rarity || 0];
    const k = Math.min(1, RV.t / 0.9);
    BB.drawFx(g, k < 1 ? 'portalopen' : 'portal', Math.floor(RV.t * 14) % (BB.fxLen(k < 1 ? 'portalopen' : 'portal') || 1), cx, cy - h * 0.16, h / 200 * (0.6 + k * 0.6), { add: true, hue });
    if (RV.t > 0.7) {
      const a = Math.min(1, (RV.t - 0.7) * 2);
      for (let i = -3; i <= 3; i++) BB.drawOther(g, 'GodRay', cx + i * 40 * dpr, cy - h * 0.45, h / 600 * 1.2, { add: true, alpha: a * (0.5 - Math.abs(i) * 0.06), sx: 3, rot: i * 0.1 });
      const layers = BB.heroLayers(RV.h), key = layers[0].key, clip = RV.t < 2.2 ? (BB.hasClip(key, 'Taunt') ? 'Taunt' : 'Special1') : 'Idle';
      const n = BB.clipLen(key, clip) || 15, fr = clip === 'Idle' ? Math.floor(RV.t * 9) % n : Math.min(n - 1, Math.floor((RV.t - 0.9) * 12));
      g.globalAlpha = a;
      g.fillStyle = 'rgba(0,0,0,' + 0.5 * a + ')'; g.beginPath(); g.ellipse(cx, cy, h * 0.07, h * 0.022, 0, 0, 7); g.fill();
      BB.drawLayers(g, layers, clip, 2, fr, cx, cy, Math.max(2, Math.round(h / 165)), { flash: Math.max(0, 1 - (RV.t - 0.7) * 1.5) });
      g.globalAlpha = 1;
    }
    if (RV.t > 1.3) $('reveal').classList.add('done');
  };

  // ---------------------------------------------------------------- team (formation)
  const T = UI.tm = { sel: null, stage: null };
  UI.openTeam = function (stageIdx) { T.stage = stageIdx === undefined ? null : stageIdx; T.sel = null; UI.renderTeam(); UI.show('team'); $('tabbar').style.display = T.stage !== null ? 'none' : ''; };
  UI.renderTeam = function () {
    const S = BB.save, ids = BB.teamIds(S);
    const slotBox = (row, box) => {
      box.innerHTML = '';
      S.formation[row].forEach((id, i) => {
        const h = id && S.heroes.find((x) => x.id === id);
        const s = el('button', 'slot' + (T.sel && T.sel.row === row && T.sel.i === i ? ' sel' : ''), h ? '' : '+');
        if (h) s.appendChild(UI.heroCard(h, { tag: 'div', noPower: true }));
        click(s, () => {
          if (h) { BB.removeHero(S, id); BB.persist(); T.sel = { row, i }; }
          else T.sel = T.sel && T.sel.row === row && T.sel.i === i ? null : { row, i };
          UI.renderTeam();
        });
        box.appendChild(s);
      });
    };
    slotBox('front', $('slotsF')); slotBox('back', $('slotsB'));
    const top = $('teamTop'); top.innerHTML = '';
    const team = BB.teamHeroes(S), tp = BB.teamPower(team);
    const bonds = BB.bondsFor(team.map((h) => h.calling));
    if (T.stage !== null) {
      const st = BB.MISSIONS[T.stage], rp = BB.recPower(st);
      top.appendChild(el('div', 'code', 'STAGE ' + st.code + ' · ' + esc(st.name)));
      const vs = el('div', 'vs'); vs.appendChild(el('div', 'powcmp grow', '<div class="' + (tp >= rp ? 'ok' : 'lo') + '"><span class="lbl">Team</span><b>⚔ ' + fmt(tp) + '</b></div><div><span class="lbl">Recommended</span><b>⚔ ' + fmt(rp) + '</b></div>'));
      top.appendChild(vs);
      top.appendChild(UI.foeIcons(st, 36));
      const row = el('div', 'row'); row.style.marginTop = '8px';
      const back = el('button', 'btn dark sm', '‹ Back'); click(back, () => UI.openCampaign(T.stage)); row.appendChild(back);
      row.appendChild(el('div', 'grow'));
      const go = el('button', 'btn xl', 'Fight ▸'); go.disabled = !team.length; click(go, () => BB.deploy(T.stage)); row.appendChild(go);
      top.appendChild(row);
    } else {
      top.appendChild(el('div', 'power', '<span class="lbl">Team power</span><b>⚔ ' + fmt(tp) + '</b><span class="mute">' + team.length + ' / 5</span>'));
    }
    const af = el('button', 'btn dark sm', '⚡ Auto-fill'); af.style.alignSelf = 'flex-start'; af.title = 'The strongest five: fighters in front, the rest behind';
    click(af, () => { BB.autoFill(S); T.sel = null; BB.persist(); UI.renderTeam(); UI.refreshTop(); });
    top.appendChild(af);
    top.appendChild(el('div', 'bondrow', bonds.length ? bonds.map((b) => '<span class="bond" title="' + esc(b.desc) + '">✦ ' + b.name + '</span>').join('') : '<span class="mute" style="font-size:12px">Mix callings to unlock team bonds.</span>'));
    const ro = $('teamRoster'); ro.innerHTML = '';
    for (const h of sortHeroes(S.heroes)) {
      const inT = ids.includes(h.id);
      ro.appendChild(UI.heroCard(h, { inteam: inT, onClick: () => {
        if (inT) BB.removeHero(S, h.id);
        else if (T.sel) BB.placeHero(S, h.id, T.sel.row, T.sel.i);
        else if (!BB.placeHero(S, h.id)) { UI.toast('The team is full. Tap a hero on the board to make room.'); return; }
        T.sel = null; BB.persist(); UI.renderTeam(); UI.refreshTop();
      } }));
    }
  };

  // ---------------------------------------------------------------- forge
  const F = UI.fg = { filter: 'all', sel: null };
  UI.renderForge = function () {
    const S = BB.save;
    const all = S.inventory.map((it) => ({ it, by: null })).concat(...S.heroes.map((h) => BB.SLOTS.filter((s) => h.gear[s]).map((s) => ({ it: h.gear[s], by: h }))));
    const fb = $('forgeFilter'); fb.innerHTML = '';
    for (const [id, nm] of [['all', 'All']].concat(BB.SLOTS.map((s) => [s, BB.SLOT_NAME[s]]))) {
      const b = el('button', 'chip' + (F.filter === id ? ' on' : ''), nm); click(b, () => { F.filter = id; UI.renderForge(); }); fb.appendChild(b);
    }
    const list = all.filter((x) => F.filter === 'all' || x.it.slot === F.filter).sort((a, b) => b.it.rarity - a.it.rarity || BB.itemScore(b.it) - BB.itemScore(a.it));
    const grid = $('forgeGrid'); grid.innerHTML = '';
    if (!list.length) grid.appendChild(el('div', 'mute', 'No gear yet. Stages drop it, chests hold it, the shop sells it.'));
    if (!F.sel || !all.some((x) => x.it === F.sel)) F.sel = list[0] ? list[0].it : null;
    for (const x of list) {
      const b = el('button', 'it' + (x.it === F.sel ? ' sel' : '')); b.style.setProperty('--ic', BB.RARITY[x.it.rarity].color);
      b.appendChild(UI.itemIcon(x.it, 40)); if (x.it.plus) b.appendChild(el('span', 'plus', '+' + x.it.plus));
      if (x.by) b.appendChild(el('span', 'eq', esc(BB.shortName(x.by))));
      click(b, () => { F.sel = x.it; UI.renderForge(); });
      grid.appendChild(b);
    }
    const det = $('forgeDet'); det.innerHTML = '';
    const it = F.sel; if (!it) { det.appendChild(el('div', 'mute', 'Select a piece of gear.')); return; }
    const by = (all.find((x) => x.it === it) || {}).by;
    const row = el('div', 'row'); const ic = el('div', 'it'); ic.style.cssText = 'width:64px;--ic:' + BB.RARITY[it.rarity].color; ic.appendChild(UI.itemIcon(it, 48)); row.appendChild(ic);
    row.appendChild(el('div', 'grow', '<div class="bigname" style="font-size:18px;color:' + BB.RARITY[it.rarity].color + '">' + esc(it.name) + (it.plus ? ' +' + it.plus : '') + '</div><div class="mute" style="font-size:13px">' + BB.RARITY[it.rarity].name + ' ' + BB.SLOT_NAME[it.slot] + ' · item level ' + it.level + (by ? ' · on ' + esc(BB.shortName(by)) : '') + '</div>'));
    det.appendChild(row);
    const cur = BB.itemStats(it), next = BB.itemStats(Object.assign({}, it, { plus: (it.plus || 0) + 1 }));
    det.appendChild(el('div', 'statl', Object.keys(cur).map((k) => '<div><span>' + ({ atk: 'Attack', hp: 'Health', def: 'Defence', crit: 'Crit', spd: 'Speed' }[k] || k) + '</span><b>' + UI.num(k, cur[k]) + ((it.plus || 0) < BB.MAX_PLUS ? ' <i>→ ' + UI.num(k, next[k]) + '</i>' : '') + '</b></div>').join('')));
    const ups = el('div', 'ups'); ups.style.marginTop = 'auto';
    const maxed = (it.plus || 0) >= BB.MAX_PLUS;
    const up = el('button', 'btn', maxed ? 'Fully forged' : 'Forge +' + ((it.plus || 0) + 1) + '<span class="cost">● ' + fmt(BB.upgradeCost(it)) + '</span>');
    up.disabled = maxed || S.gold < BB.upgradeCost(it);
    click(up, () => { if (BB.upgradeItem(S, it)) { BB.sfx('forge'); BB.persist(); UI.renderForge(); UI.refreshTop(); } });
    ups.appendChild(up);
    if (!by) {
      const sv = el('button', 'btn dark', 'Salvage<span class="cost">+● ' + BB.salvageValue(it) + '</span>');
      click(sv, () => UI.confirm('Salvage <b>' + esc(it.name) + '</b> for ' + BB.salvageValue(it) + ' gold?', () => { S.inventory.splice(S.inventory.indexOf(it), 1); S.gold += BB.salvageValue(it); F.sel = null; BB.sfx('coin'); BB.persist(); UI.renderForge(); UI.refreshTop(); }));
      ups.appendChild(sv);
    }
    det.appendChild(ups);
  };

  // ---------------------------------------------------------------- shop
  UI.renderShop = function () {
    const S = BB.save, box = $('offers'); box.innerHTML = '';
    const d = new Date(), mid = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1), left = mid - now();
    $('shopReset').textContent = 'New offers in ' + Math.floor(left / 3600000) + 'h ' + Math.floor(left / 60000) % 60 + 'm';
    const art = { free: ['◆', 'radial-gradient(circle at 40% 30%,#d6f4ff,#2f78c8)'], chest: ['🎁', 'radial-gradient(circle at 40% 30%,#ffe7a3,#8a5a1a)'], sigils: ['✧', 'radial-gradient(circle at 40% 30%,#ffe0ff,#6a2aa0)'], crystals: ['◆', 'radial-gradient(circle at 40% 30%,#e0f7ff,#1e4f8c)'] };
    for (const o of BB.SHOP) {
      const left = BB.shopLeft(S, o, now());
      const c = el('div', 'offer frame');
      c.appendChild(el('div', 'art', art[o.id][0])); c.querySelector('.art').style.background = art[o.id][1];
      c.appendChild(el('h3', '', o.name)); c.appendChild(el('p', '', o.desc));
      c.appendChild(el('div', 'left', left > 0 ? left + ' left today' : 'Sold out · back tomorrow'));
      const b = el('button', 'btn sm', o.cost ? '● ' + fmt(o.cost.gold) : 'Claim'); b.disabled = left <= 0 || (o.cost && S.gold < o.cost.gold);
      click(b, () => {
        const got = BB.buy(S, o.id, now()); if (!got) return;
        BB.sfx('coin'); BB.persist(); UI.renderShop(); UI.refreshTop();
        UI.toast(got.item ? 'Got ' + got.item.name + ' (' + BB.RARITY[got.item.rarity].name + ')' : got.crystals ? '+' + got.crystals + ' crystals' : '+' + got.sigils + ' sigils');
      });
      c.appendChild(b);
      box.appendChild(c);
    }
  };

  // ---------------------------------------------------------------- milestones
  UI.openQuests = function () {
    const S = BB.save, body = $('pickBody'); body.innerHTML = '';
    body.appendChild(el('h3', 'gold', 'Milestones'));
    body.appendChild(el('div', 'mute', '<span style="font-size:13px">Goals along the road. Each pays out once.</span>'));
    const list = el('div', 'pick scroll');
    const order = { ready: 0, open: 1, claimed: 2 };
    const qs = BB.QUESTS.slice().sort((a, b) => order[BB.questState(S, a)] - order[BB.questState(S, b)]);
    const rw = (r) => [r.crystals ? '◆ ' + r.crystals : '', r.gold ? '● ' + fmt(r.gold) : '', r.sigils ? '✧ ' + r.sigils : ''].filter(Boolean).join('  ');
    for (const q of qs) {
      const st = BB.questState(S, q);
      const row = el('div', 'prow quest ' + st);
      row.appendChild(el('div', 'grow', '<b>' + esc(q.name) + '</b><small>' + esc(q.desc) + '</small>'));
      row.appendChild(el('span', 'rwd', rw(q.reward)));
      if (st === 'ready') { const b = el('button', 'btn sm', 'Claim'); click(b, () => { BB.claimQuest(S, q.id); BB.sfx('coin'); BB.persist(); UI.refreshTop(); UI.renderHome(); UI.openQuests(); }); row.appendChild(b); }
      else row.appendChild(el('span', 'qst', st === 'claimed' ? '✔' : '…'));
      list.appendChild(row);
    }
    body.appendChild(list);
    const row = el('div', 'row'); row.style.justifyContent = 'flex-end';
    const x = el('button', 'btn sm', 'Close'); click(x, () => UI.modal('mPick', false)); row.appendChild(x);
    body.appendChild(row);
    UI.modal('mPick');
  };

  // ---------------------------------------------------------------- tabs
  UI.go = function (tab) {
    if (tab === 'home') { BB.goCamp(); return; }
    if (tab === 'heroes') UI.renderHeroes();
    if (tab === 'team') { UI.openTeam(); return; }
    if (tab === 'forge') UI.renderForge();
    if (tab === 'shop') UI.renderShop();
    UI.show(tab);
  };
  document.querySelectorAll('.tab').forEach((t) => click(t, () => UI.go(t.dataset.tab)));

  // ---------------------------------------------------------------- results
  UI.results = function (res, actions) {
    const body = $('resBody'); body.innerHTML = '';
    body.appendChild(el('div', 'res-h ' + (res.win ? 'win' : 'lose'), '<h2>' + (res.win ? 'Victory' : 'Defeat') + '</h2><div class="mute">Stage ' + res.code + ' · ' + esc(res.title) + '</div>'));
    if (!res.win) body.appendChild(el('div', 'mute', '<div style="text-align:center;font-size:14px">Nothing is lost. Level up your heroes, forge gear, try another formation, and fight again.</div>'));
    const hs = el('div', 'res-heroes');
    for (const h of res.heroes) { const c = UI.heroCard(h, { tag: 'div' }); if (res.mvp === h) c.appendChild(el('div', 'mvp', 'MVP')); hs.appendChild(c); }
    body.appendChild(hs);
    const rw = el('div', 'res-rw');
    if (res.gold) rw.appendChild(el('span', 'rw', '<span class="ico gold" style="width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center">●</span>+' + fmt(res.gold)));
    if (res.crystals) rw.appendChild(el('span', 'rw', '<span class="ico crys" style="width:24px;height:24px;display:inline-block"></span>+' + res.crystals));
    if (res.sigils) rw.appendChild(el('span', 'rw', '<span class="ico sig" style="width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center">✧</span>+' + res.sigils));
    if (res.kills) rw.appendChild(el('span', 'rw mute', '☠ ' + res.kills));
    body.appendChild(rw);
    if (res.items && res.items.length) {
      const its = el('div', 'res-items');
      for (const it of res.items) { const b = el('div', 'it'); b.style.setProperty('--ic', BB.RARITY[it.rarity].color); b.appendChild(UI.itemIcon(it, 40)); b.title = it.name; its.appendChild(b); }
      body.appendChild(its);
    }
    if (res.unlock) body.appendChild(el('div', 'newhero', res.unlock));
    const bt = el('div', 'res-btns');
    for (const [label, cls, fn] of actions) { const b = el('button', 'btn ' + (cls || ''), label); click(b, () => { UI.modal('mResults', false); fn(); }); bt.appendChild(b); }
    body.appendChild(bt);
    UI.modal('mResults');
  };
})();
