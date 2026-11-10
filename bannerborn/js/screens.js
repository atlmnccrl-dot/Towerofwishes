// Bannerborn — every menu screen: shell, camp, campaign, heroes, hero, recruit, team, shop, results.
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
  const MAIN = ['home', 'heroes', 'team', 'shop', 'campaign', 'hero', 'recruit'];
  UI.show = function (id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
    if (UI.current !== id && MAIN.includes(id)) { const sc = $(id); sc.classList.remove('enter'); void sc.offsetWidth; sc.classList.add('enter'); } // the panels rise into place
    UI.current = id; document.body.dataset.screen = id;
    $('shell').classList.toggle('on', MAIN.includes(id));
    $('tabbar').style.display = ['hero', 'recruit', 'campaign'].includes(id) ? 'none' : '';
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === id));
    $('tbTitle').textContent = { home: 'Camp', heroes: 'Heroes', team: 'Team', shop: 'Shop', campaign: 'Campaign', hero: 'Hero', recruit: 'Recruit' }[id] || '';
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
    const canLevel = S.heroes.some((h) => (h.stars < BB.MAX_STARS && h.level >= BB.levelCap(h) && S.sigils >= BB.ascendCost(h)) || (BB.talentFree && BB.talentFree(h) > 0));
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
  UI.sigilPath = sigilPath;
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
  // every piece of gear gets a drawn icon: metal, its dye, a rarity glint
  const tintHex = (id) => { const t = BB.TINTS.find((q) => q.id === id); return t && t.col ? 'hsl(' + t.col.h + ',' + Math.round(t.col.s * 100) + '%,48%)' : null; };
  UI.itemIcon = function (it, size) {
    size = size || 30;
    const key = it.slot + (it.look || it.wtype) + it.tint + it.rarity + (it.ench || '') + size;
    if (iconCache[key]) return copyCanvas(iconCache[key]); // a fresh node each time: one canvas can't sit in two tiles
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    const col = BB.RARITY[it.rarity].color, dye = tintHex(it.tint) || col;
    if (it.ench && BB.ECOL) { g.shadowColor = BB.ECOL[it.ench][1]; g.shadowBlur = size / 6; g.shadowOffsetY = 0; }
    else { g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = size / 12; g.shadowOffsetY = size / 30; }
    if (it.slot === 'weapon') drawWeapon(g, it.wtype, size, col);
    else drawGear(g, it.slot, it.look, size, dye, col);
    iconCache[key] = c; return copyCanvas(c);
  };
  function drawGear(g, slot, look, s, dye, col) {
    const k = s / 40; g.save(); g.translate(s / 2, s / 2); g.lineJoin = 'round'; g.lineCap = 'round';
    const metal = (y0, y1) => { const m = g.createLinearGradient(0, y0 * k, 0, y1 * k); m.addColorStop(0, '#f2f4f8'); m.addColorStop(0.5, '#9aa3b0'); m.addColorStop(1, '#4a525e'); return m; };
    if (slot === 'charm') {
      g.strokeStyle = '#d8b25a'; g.lineWidth = 1.6 * k; g.beginPath(); g.arc(0, -8 * k, 8 * k, Math.PI * 0.15, Math.PI * 0.85, true); g.stroke();
      const gr = g.createRadialGradient(-3 * k, 0, 1, 0, 3 * k, 11 * k); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, col); gr.addColorStop(1, 'rgba(0,0,0,.6)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, -6 * k); g.lineTo(10 * k, 4 * k); g.lineTo(0, 16 * k); g.lineTo(-10 * k, 4 * k); g.closePath(); g.fill();
      g.strokeStyle = '#3a2a10'; g.lineWidth = 1.2 * k; g.stroke();
    } else if (slot === 'head' && look === 'hair') { // a circlet with a gem
      g.strokeStyle = metal(-6, 6); g.lineWidth = 4 * k; g.beginPath(); g.ellipse(0, 2 * k, 14 * k, 7 * k, 0, Math.PI, Math.PI * 2.0001); g.stroke();
      g.strokeStyle = '#d8b25a'; g.lineWidth = 3 * k; g.beginPath(); g.ellipse(0, 4 * k, 14 * k, 7 * k, 0, 0, Math.PI); g.stroke();
      g.fillStyle = dye; g.beginPath(); g.moveTo(0, -11 * k); g.lineTo(5 * k, -4 * k); g.lineTo(0, 2 * k); g.lineTo(-5 * k, -4 * k); g.closePath(); g.fill();
      g.strokeStyle = '#2a1a08'; g.lineWidth = 1 * k; g.stroke();
    } else if (slot === 'head') { // a great helm
      g.fillStyle = metal(-15, 14); g.beginPath(); g.moveTo(-12 * k, 14 * k); g.lineTo(-12 * k, -3 * k); g.quadraticCurveTo(-12 * k, -15 * k, 0, -15 * k); g.quadraticCurveTo(12 * k, -15 * k, 12 * k, -3 * k); g.lineTo(12 * k, 14 * k); g.closePath(); g.fill();
      g.strokeStyle = '#1e2228'; g.lineWidth = 1.3 * k; g.stroke();
      g.fillStyle = '#14171c'; g.fillRect(-9 * k, -2 * k, 18 * k, 3 * k); g.fillRect(-1.2 * k, 1 * k, 2.4 * k, 9 * k);
      g.fillStyle = dye; g.beginPath(); g.moveTo(-2 * k, -15 * k); g.quadraticCurveTo(6 * k, -24 * k, 13 * k, -18 * k); g.quadraticCurveTo(6 * k, -17 * k, 2 * k, -14 * k); g.fill();
    } else { // armour: a jerkin (chestA) or plate (chestB)
      const plate = look === 'chestB';
      g.fillStyle = plate ? metal(-14, 15) : dye;
      g.beginPath(); g.moveTo(-6 * k, -14 * k); g.lineTo(-15 * k, -9 * k); g.lineTo(-13 * k, 1 * k); g.lineTo(-10 * k, 0); g.lineTo(-10 * k, 15 * k); g.lineTo(10 * k, 15 * k); g.lineTo(10 * k, 0); g.lineTo(13 * k, 1 * k); g.lineTo(15 * k, -9 * k); g.lineTo(6 * k, -14 * k); g.quadraticCurveTo(0, -9 * k, -6 * k, -14 * k); g.closePath(); g.fill();
      g.strokeStyle = '#1e1810'; g.lineWidth = 1.3 * k; g.stroke();
      if (plate) { g.fillStyle = dye; g.fillRect(-10 * k, 5 * k, 20 * k, 3 * k); g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(0, -9 * k); g.lineTo(0, 4 * k); g.stroke(); }
      else { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-10 * k, 4 * k, 20 * k, 3 * k); g.fillStyle = '#d8b25a'; g.fillRect(-2 * k, 4 * k, 4 * k, 3 * k); }
    }
    g.restore();
  }
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
    } else if (w === 'sword') {
      const m = g.createLinearGradient(0, -3 * k, 0, 3 * k); m.addColorStop(0, '#ffffff'); m.addColorStop(1, '#8a94a2');
      g.fillStyle = m; g.beginPath(); g.moveTo(-6 * k, -2.6 * k); g.lineTo(15 * k, -2.6 * k); g.lineTo(19 * k, 0); g.lineTo(15 * k, 2.6 * k); g.lineTo(-6 * k, 2.6 * k); g.closePath(); g.fill();
      g.strokeStyle = '#2a2e36'; g.lineWidth = 1 * k; g.stroke();
      g.fillStyle = '#d8b25a'; g.fillRect(-8 * k, -7 * k, 3 * k, 14 * k);
      g.fillStyle = '#5a3a1e'; g.fillRect(-16 * k, -1.8 * k, 8 * k, 3.6 * k);
      g.fillStyle = col; g.beginPath(); g.arc(-17 * k, 0, 2.6 * k, 0, 7); g.fill();
    } else if (w === 'axe') {
      g.strokeStyle = '#6a4424'; g.lineWidth = 3 * k; g.beginPath(); g.moveTo(-17 * k, 0); g.lineTo(16 * k, 0); g.stroke();
      const m = g.createLinearGradient(0, -12 * k, 0, 12 * k); m.addColorStop(0, '#f4f6fa'); m.addColorStop(1, '#7a8492');
      g.fillStyle = m; g.beginPath(); g.moveTo(6 * k, -2 * k); g.quadraticCurveTo(10 * k, -14 * k, 18 * k, -12 * k); g.quadraticCurveTo(14 * k, 0, 18 * k, 12 * k); g.quadraticCurveTo(10 * k, 14 * k, 6 * k, 2 * k); g.closePath(); g.fill();
      g.strokeStyle = '#2a2e36'; g.lineWidth = 1 * k; g.stroke();
      g.fillStyle = col; g.fillRect(4 * k, -2.5 * k, 3 * k, 5 * k);
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





  // ---------------------------------------------------------------- hero cards, calling icons, full-body art
  const RCLS = (r) => 'r' + (r || 0);
  const CICON = {
    vanguard: 'M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z',
    berserker: 'M5 21.5L2.5 19l9-9-1.2-1.2 2.2-2.2 1.2 1.2 2.8-2.8c2.9.9 5 3.1 6 6l-2.8 2.8 1.2 1.2-2.2 2.2-1.2-1.2z',
    ranger: 'M6 2.5c6.5 2.6 10 8 10 9.5s-3.5 6.9-10 9.5l-.8-1.2c5.6-2.6 8.8-7.2 8.8-8.3S10.8 6.3 5.2 3.7zM4.5 3.5h1.2v17H4.5zM2 11.4h15.5l-2.6-2.2v5.6l2.6-2.2H2z',
    arcanist: 'M12 2c.9 4 6 6.2 6 12a6 6 0 0 1-12 0c0-3 1.6-5 3-6.2.1 2 1 3.2 2.2 3.4C11 7.2 12 5 12 2z',
    warpriest: 'M10 2h4v6h6v4h-6v10h-4V12H4V8h6z',
    monk: 'M7 9.5a1.8 1.8 0 0 1 3.6 0V8.3a1.8 1.8 0 0 1 3.6 0v1.2a1.8 1.8 0 0 1 3.6 0v5.8c0 3.9-2.8 6.7-6.6 6.7-3.6 0-6-2.6-6-6v-4.1a1.8 1.8 0 0 1 1.8-1.8z',
    shadowblade: 'M15.5 2l2.2 2.2-6.4 9.6 2 2-1.9 1.9-1-1-4.6 5.3-2.4-2.4 5.3-4.6-1-1 1.9-1.9 2 2z',
    lancer: 'M21.5 2l-.9 6.4-2-1L6.2 19.8l1.7 1.7-1.6 1.1-3.9-3.9 1.1-1.6 1.7 1.7L17.6 6.4l-1-2z',
  };
  const SI = {
    lock: '<path d="M7 11V8a5 5 0 0 1 10 0v3"/><rect x="5" y="11" width="14" height="10" rx="2.5"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M4 13h16M12 9v11M12 9c-2-4-6-4-6-1.5S9 9 12 9zm0 0c2-4 6-4 6-1.5S15 9 12 9z"/>',
    bolt: '<path d="M13 2L5 13.5h6L10 22l9-12h-6z"/>',
    skull: '<path d="M12 3a8 8 0 0 0-5 14.2V20h10v-2.8A8 8 0 0 0 12 3z"/><circle cx="9" cy="11.5" r="1.6"/><circle cx="15" cy="11.5" r="1.6"/><path d="M10 20v-2M14 20v-2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  };
  UI.si = (n, size) => '<svg class="i" viewBox="0 0 24 24" style="width:' + (size || 14) + 'px;height:' + (size || 14) + 'px;vertical-align:-2px">' + SI[n] + '</svg>';
  UI.callPath = (calling) => CICON[calling] || CICON.vanguard;
  UI.callIcon = (calling, cls) => '<svg class="ci ' + (cls || '') + '" viewBox="0 0 24 24"><path d="' + (CICON[calling] || CICON.vanguard) + '"/></svg>';
  // a hero standing, crisp pixels: one integer scale, feet near the bottom (cached once the art is in)
  const bodyCache = {};
  UI.body = function (h, w, hh, dir) {
    w = w || 54; hh = hh || 60; dir = dir === undefined ? 1 : dir;
    const layers = BB.heroLayers(h), key = (h.legend || BB.layerSig(h)) + '|' + w + 'x' + hh + dir;
    if (bodyCache[key]) return bodyCache[key];
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const ready = layers.every((L) => BB.A.chars[L.key]);
    BB.drawLayers(g, layers, 'Idle', dir, 0, w / 2, hh - 3, 1, { noSlash: true });
    if (ready) bodyCache[key] = c; else Promise.all(layers.map((L) => BB.loadChar(L.key).catch(() => null))).then(() => UI.current && UI.rerender && UI.rerender());
    return c;
  };
  UI.heroCard = function (h, opts) {
    opts = opts || {};
    const c = el(opts.tag || 'button', 'hc ' + RCLS(h.rarity) + (opts.inteam ? ' inteam' : ''));
    const art = UI.body(h); const cv = copyCanvas(art); c.appendChild(cv);
    c.appendChild(el('div', 'lv', String(h.level)));
    c.appendChild(el('div', 'cic', UI.callIcon(h.calling)));
    c.appendChild(el('div', 'st', '★'.repeat(h.stars || 1)));
    if (h.rarity >= 3) c.appendChild(el('i', 'shine'));
    c.appendChild(el('div', 'plate', '<div class="nm">' + esc(BB.shortName(h)) + '</div>' + (opts.noPower ? '<div class="pw" style="color:var(--mute)">' + BB.CALLINGS[h.calling].name + '</div>' : '<div class="pw">⚔ ' + fmt(BB.power(h)) + '</div>')));
    c.title = h.name + ' · ' + BB.HERO_RARITY[h.rarity].name + ' ' + BB.CALLINGS[h.calling].name;
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
  // light rays and a stone podium under a showcased hero
  // a light platform under a showcased hero: soft floor glow, thin rings, a faint beam, drifting motes
  UI.podium = function (g, cx, cy, rw, col, t) {
    g.save();
    const ry = rw * 0.3;
    const gl = g.createRadialGradient(cx, cy, 0, cx, cy, rw * 1.25);
    gl.addColorStop(0, col.replace('A', '0.35')); gl.addColorStop(1, col.replace('A', '0'));
    g.fillStyle = gl; g.beginPath(); g.ellipse(cx, cy, rw * 1.25, ry * 1.25, 0, 0, 7); g.fill();
    const beamH = Math.min(cy * 0.95, rw * 2.6);
    const bm = g.createLinearGradient(0, cy - beamH, 0, cy);
    bm.addColorStop(0, col.replace('A', '0')); bm.addColorStop(1, col.replace('A', '0.12'));
    g.fillStyle = bm; g.beginPath(); g.moveTo(cx - rw * 0.7, cy); g.lineTo(cx - rw * 0.45, cy - beamH); g.lineTo(cx + rw * 0.45, cy - beamH); g.lineTo(cx + rw * 0.7, cy); g.closePath(); g.fill();
    g.lineWidth = Math.max(1, rw * 0.012);
    g.strokeStyle = col.replace('A', '0.9'); g.beginPath(); g.ellipse(cx, cy, rw * 0.78, ry * 0.78, 0, 0, 7); g.stroke();
    g.strokeStyle = col.replace('A', '0.35'); g.beginPath(); g.ellipse(cx, cy, rw, ry, 0, 0, 7); g.stroke();
    g.setLineDash([rw * 0.08, rw * 0.06]); g.lineDashOffset = -t * rw * 0.12;
    g.strokeStyle = col.replace('A', '0.55'); g.beginPath(); g.ellipse(cx, cy, rw * 1.18, ry * 1.18, 0, 0, 7); g.stroke();
    g.setLineDash([]);
    for (let i = 0; i < 14; i++) {
      const k = ((t * 0.18 + i / 14) % 1), x = cx + Math.sin(i * 2.3 + t * 0.4) * rw * 0.7, y = cy - k * beamH * 0.9, sz = Math.max(1.2, rw * 0.014);
      g.fillStyle = col.replace('A', String((1 - k) * 0.8)); g.beginPath(); g.arc(x, y, sz, 0, 7); g.fill();
    }
    g.restore();
  };
  const RGBA = ['rgba(200,210,225,A)', 'rgba(77,163,255,A)', 'rgba(181,124,255,A)', 'rgba(255,174,43,A)'];
  UI.rgba = RGBA;

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
    const done = BB.campaignDone(S), ni = BB.nextStageIdx(S), st = BB.MISSIONS[ni];
    $('hmNext').textContent = done ? 'Campaign won · replay any stage' : 'Stage ' + st.code + ' · ' + st.name;
    const cleared = BB.MISSIONS.filter((m) => S.cleared[m.id]).length;
    $('hmProg').style.width = (cleared / BB.MISSIONS.length * 100) + '%';
    const tp = BB.teamPower(BB.teamHeroes(S)), rp = BB.recPower(st);
    $('hmRec').innerHTML = done ? '' : 'Team <b class="' + (tp >= rp ? '' : 'lo') + '">⚔ ' + fmt(tp) + '</b> · needs ⚔ ' + fmt(rp);
    UI.updateSpoils();
    const open = BB.heroTiers(BB.ROSTER).filter(({ tier }) => BB.tierOpen(S, tier));
    const cheapest = open.length ? Math.min(...open.map(({ tier }) => tier.cost)) : 0;
    $('recruitT').textContent = '◆ ' + cheapest + ' · you have ' + fmt(S.crystals);
    $('bRecruitH').classList.toggle('glow', S.crystals >= cheapest);
    const qn = BB.questsReady(S); $('questT').textContent = qn ? qn + ' to claim' : BB.QUESTS.filter((q) => BB.questState(S, q) === 'claimed').length + ' / ' + BB.QUESTS.length + ' done';
    $('bQuests').classList.toggle('glow', qn > 0);
  };
  UI.updateSpoils = function () {
    const S = BB.save; if (!S) return;
    const p = BB.idlePending(S, now()), m = Math.floor(p.ms / 60000);
    $('spoilsT').textContent = '● ' + fmt(p.gold) + ' · ' + (m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm') + (p.ms >= BB.IDLE_CAP ? ' · full' : '');
    $('spoilsFill').style.width = Math.min(100, p.ms / BB.IDLE_CAP * 100) + '%';
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
    const cyc = H.t % 9, clip = cyc > 7.2 ? (BB.hasClip(key, 'Taunt') ? 'Taunt' : 'Special1') : 'Idle';
    const n = BB.clipLen(key, clip) || 15;
    const fr = clip === 'Idle' ? Math.floor(H.t * 9) % n : Math.min(n - 1, Math.floor((cyc - 7.2) * 12));
    const sc = Math.max(2, Math.round(h / 100));
    const cx = w / 2, cy = h * 0.9;
    UI.podium(g, cx, cy, Math.min(w * 0.42, 30 * sc), RGBA[hero.rarity || 0], H.t);
    BB.drawHeroDressed(g, hero, BB.auraOf(hero), clip, 1, fr, cx, cy, sc, H.t, { noSlash: clip === 'Idle', layers });
  };

  // ---------------------------------------------------------------- campaign
  const C = UI.camp = { ch: 1, sel: 0, nodes: [] };
  UI.openCampaign = function (idx) {
    const S = BB.save;
    C.sel = idx !== undefined ? idx : BB.nextStageIdx(S);
    C.ch = BB.MISSIONS[C.sel].chapter; J.free = false;
    UI.renderCampaign(); UI.show('campaign');
  };
  UI.renderCampaign = function () {
    const S = BB.save, box = $('chapters'); box.innerHTML = '';
    for (const ch of BB.CHAPTERS) {
      const first = BB.MISSIONS.findIndex((m) => m.chapter === ch.id), open = BB.stageUnlocked(S, first);
      const b = el('button', 'chip' + (C.ch === ch.id ? ' on' : ''), (open ? '' : UI.si('lock', 13) + ' ') + ch.id + ' · ' + esc(ch.name)); b.disabled = !open;
      click(b, () => { C.ch = ch.id; const ms = BB.MISSIONS.map((m, i) => [m, i]).filter(([m]) => m.chapter === ch.id); const nx = ms.find(([m, i]) => !S.cleared[m.id] && BB.stageUnlocked(S, i)); C.sel = (nx || ms[ms.length - 1])[1]; UI.renderCampaign(); });
      box.appendChild(b);
    }
    UI.renderStageCard();
  };
  // ---- the chapter map: a painted land seen from a hill. A strip of sky and far ridges at the top, the country below
  // it, a road that narrows as it runs away, and on the road the stages: your banner where you have won, your hero
  // by a fire at the stage to fight, stone waymarks ahead, and at the end of the road the boss's gate.
  const mapCache = {};
  const ROADS = { 1: [0.56, 0.2, 2.2], 2: [0.6, 0.2, 1.6], 3: [0.55, 0.21, 2.6], 4: [0.57, 0.19, 1.9] };
  const LAND = {
    1: { sky: ['#2a4e72', '#7fb0c2', '#f4e2ac'], sun: ['255,244,200', 0.8, 0.13], far: ['#2f5a48', '#234636'], ground: ['#4d7a34', '#2f5220', '#182c12'], road: ['#a08a5e', '#6e5c3c'], speck: '255,255,220' },
    2: { sky: ['#3a1c14', '#c8703a', '#ffd9a0'], sun: ['255,225,160', 0.3, 0.15], far: ['#b9864c', '#96683a'], ground: ['#dcb574', '#b0854c', '#6a4a28'], road: ['#f0d9aa', '#b8935e'], speck: '255,240,200' },
    3: { sky: ['#120c1e', '#4a2a40', '#b8604e'], sun: ['240,236,255', 0.76, 0.1], far: ['#241a2a', '#17101c'], ground: ['#63605a', '#3f3d39', '#1e1d1b'], road: ['#9a958a', '#5e5a52'], speck: '255,255,255' },
    4: { sky: ['#07060c', '#1a1030', '#4a2a6a'], sun: ['125,255,176', 0.86, 0.17], far: ['#181028', '#0e0a18'], ground: ['#45355a', '#281c3a', '#100a18'], road: ['#7a6896', '#44365a'], speck: '200,180,255' },
    5: { sky: ['#24384e', '#8fb4cc', '#eef4fa'], sun: ['255,255,255', 0.7, 0.12], far: ['#9fb4c8', '#7c94ac'], ground: ['#e6eef8', '#b8c8dc', '#7f93ab'], road: ['#aab6c6', '#7f8b9d'], speck: '255,255,255' },
    6: { sky: ['#140808', '#5a1c10', '#e0662a'], sun: ['255,150,70', 0.5, 0.16], far: ['#2a1a18', '#1a100e'], ground: ['#4a4442', '#2e2a28', '#141110'], road: ['#7a4a30', '#3e2a22'], speck: '255,150,60' },
    7: { sky: ['#0e1a16', '#2f4a3a', '#9ab07a'], sun: ['220,240,190', 0.3, 0.1], far: ['#1e3428', '#14241c'], ground: ['#4a5e36', '#2c3c24', '#141e12'], road: ['#6a6244', '#3c3828'], speck: '170,230,120' },
    8: { sky: ['#100a1a', '#3a2450', '#a880c0'], sun: ['230,200,255', 0.78, 0.13], far: ['#2a2038', '#1a1426'], ground: ['#6a5a7a', '#42364e', '#1e1826'], road: ['#8a7a9a', '#4e4258'], speck: '220,150,255' },
  };
  const HZ = 0.2; // the horizon: this much of the picture is sky
  const depthK = (y, h) => 0.55 + 0.75 * Math.max(0, (y / h - HZ) / (1 - HZ)); // how big things are drawn, by how far down (near) they stand
  function chapterNodes(ch, w, h) {
    const ms = BB.MISSIONS.map((m, i) => [m, i]).filter(([m]) => m.chapter === ch.id), R = ROADS[ch.id] || ROADS[1];
    return ms.map(([m, i], k) => { const u = (k + 0.5) / ms.length; return { i, m, x: (0.07 + u * 0.84) * w, y: h * (R[0] + Math.sin(u * Math.PI * R[2] + 0.6) * R[1]) }; });
  }
  function roadPoints(nodes, w, h) { // the road as a smooth run of points through the stages, in from the left edge
    const pts = [], P = [{ x: -40, y: nodes[0].y + h * 0.06 }].concat(nodes);
    for (let k = 0; k < P.length - 1; k++) { const p0 = P[Math.max(0, k - 1)], p1 = P[k], p2 = P[k + 1], p3 = P[Math.min(P.length - 1, k + 2)];
      for (let j = 0; j < 12; j++) { const t = j / 12, t2 = t * t, t3 = t2 * t; // Catmull-Rom
        pts.push({ x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3), k }); } }
    pts.push({ x: P[P.length - 1].x, y: P[P.length - 1].y, k: P.length - 2 });
    return pts;
  }
  function chapterBackdrop(ch, w, h, dpr) {
    const key = ch.id + '|' + w + 'x' + h;
    if (mapCache[key]) return mapCache[key];
    const biome = (ch.skin && BB.A.env[ch.skin]) ? ch.skin : ch.biome || 'vale', L = LAND[ch.id] || LAND[1];
    if (!BB.A.env[biome]) { BB.loadEnv(biome).then(() => { for (const k in mapCache) if (k.startsWith(ch.id + '|')) delete mapCache[k]; }); }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), r = BB.rng(ch.id * 77), hz = h * HZ;
    // sky, its light, clouds
    const sky = g.createLinearGradient(0, 0, 0, hz * 1.15); sky.addColorStop(0, L.sky[0]); sky.addColorStop(0.6, L.sky[1]); sky.addColorStop(1, L.sky[2]); g.fillStyle = sky; g.fillRect(0, 0, w, hz * 1.2);
    if (ch.id >= 3) for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,255,255,' + r.range(0.2, 0.8) + ')'; g.fillRect(r() * w, r() * hz * 0.8, dpr, dpr); }
    const sx = w * L.sun[1], sy = hz * (ch.id === 2 ? 0.55 : 0.5), sr = h * L.sun[2] * 0.45;
    g.save(); g.globalCompositeOperation = 'lighter'; if (BB.drawGlow) { BB.drawGlow(g, L.sun[0], sx, sy, sr * 5, sr * 3.2, 0.5); BB.drawGlow(g, L.sun[0], sx, sy, sr * 2, sr * 2, 0.7); } g.restore();
    if (ch.id !== 4) { g.fillStyle = 'rgb(' + L.sun[0] + ')'; g.beginPath(); g.arc(sx, sy, sr, 0, 7); g.fill(); }
    if (BB.drawGlow) for (let i = 0; i < 7; i++) BB.drawGlow(g, ch.id === 2 ? '255,200,150' : ch.id === 1 ? '255,255,255' : '90,70,110', r() * w, r.range(0.1, 0.75) * hz, w * r.range(0.08, 0.18), hz * r.range(0.12, 0.22), ch.id <= 2 ? 0.28 : 0.4);
    // the far country: two ridges, each land's own
    const ridge = (y0, amp, seed, col, fn) => { g.fillStyle = col; g.beginPath(); g.moveTo(-10, hz * 1.3);
      for (let i = 0; i <= 80; i++) { const x = i / 80 * (w + 20) - 10, u = x / w; g.lineTo(x, y0 - amp * fn(u, seed)); } g.lineTo(w + 10, hz * 1.3); g.closePath(); g.fill(); };
    const hills = (u, s2) => Math.sin(u * 5.3 + s2) * 0.5 + Math.sin(u * 13.1 + s2 * 2) * 0.3 + Math.sin(u * 31 + s2) * 0.12 + 0.6;
    const peaks = (u, s2) => Math.abs(Math.sin(u * 9 + s2)) * 0.9 + Math.abs(Math.sin(u * 23 + s2 * 3)) * 0.4;
    const dunes = (u, s2) => Math.sin(u * 3.1 + s2) * 0.6 + Math.sin(u * 7.3 + s2 * 2) * 0.25 + 0.7;
    const fn = ch.id === 2 ? dunes : ch.id === 4 ? peaks : hills;
    ridge(hz * 0.98, hz * 0.34, ch.id * 3.1, L.far[0], fn); ridge(hz * 1.04, hz * 0.22, ch.id * 5.7 + 2, L.far[1], fn);
    if (ch.id === 1) { g.fillStyle = '#1a3426'; for (let i = 0; i < 90; i++) { const x = r() * w, y = hz * (0.98 + r() * 0.08), s2 = hz * r.range(0.05, 0.1); g.beginPath(); g.moveTo(x - s2 * 0.45, y); g.lineTo(x, y - s2 * 1.6); g.lineTo(x + s2 * 0.45, y); g.closePath(); g.fill(); } }
    if (ch.id === 2) { g.fillStyle = '#7a5630'; for (const [px, ps] of [[0.62, 1], [0.7, 0.62], [0.16, 0.5]]) { const x = w * px, s2 = hz * 0.42 * ps, y = hz * 1.02; g.beginPath(); g.moveTo(x - s2, y); g.lineTo(x, y - s2 * 0.95); g.lineTo(x + s2, y); g.closePath(); g.fill(); g.fillStyle = '#93693c'; g.beginPath(); g.moveTo(x, y - s2 * 0.95); g.lineTo(x + s2, y); g.lineTo(x + s2 * 0.25, y); g.closePath(); g.fill(); g.fillStyle = '#7a5630'; } }
    if (ch.id === 3) { let x = -10; while (x < w + 10) { const bw = w * r.range(0.018, 0.045), bh = hz * r.range(0.18, 0.62); g.fillStyle = '#0e0912'; g.fillRect(x, hz * 1.04 - bh, bw, bh + 4); if (r() < 0.35) { g.beginPath(); g.moveTo(x, hz * 1.04 - bh); g.lineTo(x + bw / 2, hz * 1.04 - bh - hz * 0.14); g.lineTo(x + bw, hz * 1.04 - bh); g.fill(); }
        for (let q = 0; q < 3; q++) if (r() < 0.4) { g.fillStyle = 'rgba(255,190,110,0.8)'; g.fillRect(x + bw * r.range(0.15, 0.7), hz * 1.04 - bh * r.range(0.2, 0.85), 1.6 * dpr, 2.2 * dpr); } x += bw + r.range(0, 3) * dpr; } }
    if (ch.id === 4) { g.strokeStyle = '#06040a'; g.lineCap = 'round'; for (let i = 0; i < 9; i++) { const x = r() * w, y = hz * 1.06, s2 = hz * r.range(0.2, 0.42); g.lineWidth = Math.max(1, s2 * 0.07); g.beginPath(); g.moveTo(x, y); g.lineTo(x + s2 * 0.08, y - s2); g.moveTo(x + s2 * 0.04, y - s2 * 0.5); g.lineTo(x - s2 * 0.3, y - s2 * 0.85); g.moveTo(x + s2 * 0.06, y - s2 * 0.7); g.lineTo(x + s2 * 0.34, y - s2 * 0.98); g.stroke(); } }
    // the land itself, lit from the horizon, darker towards the eye
    const gd = g.createLinearGradient(0, hz, 0, h); gd.addColorStop(0, L.ground[0]); gd.addColorStop(0.45, L.ground[1]); gd.addColorStop(1, L.ground[2]); g.fillStyle = gd; g.fillRect(0, hz * 1.02, w, h);
    const hazeC = L.sky[2], haze = g.createLinearGradient(0, hz * 0.95, 0, hz * 1.9); haze.addColorStop(0, hazeC + '70'); haze.addColorStop(1, hazeC + '00'); g.fillStyle = haze; g.fillRect(0, hz * 0.95, w, hz);
    for (let i = 0; i < 420; i++) { // the grain of the ground: small near the horizon, larger close by
      const y = hz * 1.05 + Math.pow(r(), 0.8) * (h - hz), k = depthK(y, h), x = r() * w, s2 = r.range(2, 9) * dpr * k;
      g.fillStyle = r() < 0.5 ? 'rgba(' + L.speck + ',' + r.range(0.02, 0.07) + ')' : 'rgba(0,0,0,' + r.range(0.04, 0.11) + ')'; g.fillRect(x - s2, y - s2 * 0.22, s2 * 2, s2 * 0.44); }
    // the road: wider as it comes near, a dark verge, a worn centre
    const nodes = chapterNodes(ch, w, h), pts = roadPoints(nodes, w, h);
    const band = (wd, col, dash) => { g.fillStyle = col; for (let i = 0; i < pts.length - 1; i++) { if (dash && i % 3 !== 0) continue; const a = pts[i], b2 = pts[i + 1], ka = depthK(a.y, h) * wd * dpr, kb = depthK(b2.y, h) * wd * dpr, dx = b2.x - a.x, dy = b2.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      g.beginPath(); g.moveTo(a.x + nx * ka, a.y + ny * ka * 0.6); g.lineTo(b2.x + nx * kb, b2.y + ny * kb * 0.6); g.lineTo(b2.x - nx * kb, b2.y - ny * kb * 0.6); g.lineTo(a.x - nx * ka, a.y - ny * ka * 0.6); g.closePath(); g.fill(); g.beginPath(); g.ellipse(a.x, a.y, ka, ka * 0.6, 0, 0, 7); g.fill(); } };
    band(13, 'rgba(0,0,0,0.32)'); band(10.5, L.road[1]); band(8, L.road[0]); band(1.1, 'rgba(255,255,255,0.13)', true);
    // what grows and stands there, kept off the road, sized by distance, nearest last
    if (BB.A.env[biome]) {
      const pick = { 1: ['Tree A1_S', 'Tree A2_S', 'Tree A3_S', 'Tree B4_S', 'Tree B5_S', 'Tree D1_S', 'Tree D3_S', 'Tree E1_S', 'Stone A1_S', 'Stone A9_S'],
        2: ['Tree A1_S', 'Tree A2_S', 'Tree A4_S', 'Tree E1_S', 'Tree E2_S', 'Stone B1_S', 'Stone B5_S', 'Stone A23_S', 'Stone B7_S', 'Stone A2_S'],
        3: ['Stone A14_S', 'Stone A15_S', 'Stone A6_S', 'Stone A10_S', 'Tree D2_S', 'Tree B4_S', 'Stone A2_S', 'Stone A21_S', 'TreeTrunkBroken'],
        4: ['TreeTrunkBroken', 'Stone A14_S', 'Stone A15_S', 'Stone A4_S', 'Stone A13_S', 'Stone A6_S', 'Stone A10_S', 'TreeTrunkBroken'] }[ch.id > 4 ? 1 : ch.id];
      const near = (x, y, d) => pts.some((q) => Math.hypot(q.x - x, (q.y - y) * 1.5) < d);
      const props = [];
      const U = Math.max(0.5, Math.min(1, h / (520 * dpr))); // a small panel (a phone) gets smaller scenery, not a road buried in trees
      for (let i = 0; i < 500 && props.length < 64; i++) { const y = hz * 1.12 + Math.pow(r(), 0.75) * (h * 1.04 - hz * 1.12), x = r() * w, k = depthK(y, h) * U; if (!near(x, y, 46 * dpr * k / Math.sqrt(U)) && !props.some((p) => Math.hypot(p.x - x, (p.y - y) * 2) < 24 * dpr * k)) props.push({ x, y, n: r.pick(pick), s: r.range(0.5, 0.72) * dpr * k }); }
      props.sort((p, q) => p.y - q.y);
      for (const p of props) { if (BB.drawGlow) BB.drawGlow(g, '0,0,0', p.x, p.y, 20 * p.s, 7 * p.s, 0.45); BB.drawEnv(g, biome, p.n, p.x, p.y, p.s); }
    }
    // the eye is drawn down the road: dark at the corners and the near edge
    const vg = g.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.38, w / 2, h * 0.55, Math.max(w, h) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(4,5,9,0.72)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    const top = g.createLinearGradient(0, 0, 0, hz * 0.9); top.addColorStop(0, 'rgba(4,5,9,0.4)'); top.addColorStop(1, 'rgba(4,5,9,0)'); g.fillStyle = top; g.fillRect(0, 0, w, hz * 0.9);
    if (BB.A.env[biome]) mapCache[key] = c;
    return c;
  }
  const BOSS_COL = { vesh: '#7dffb0', regent: '#c9a8ff', sallow: '#ffd27a' };
  // ---- the chapter as a built land (the same engine, tiles and props as the battlefields): the road runs through it,
  // every stage is a place on the road, the enemy waits at the ones not yet won, and your team walks from stage to
  // stage as you choose them. Drag to look around; the view returns to the stage you pick.
  const J = UI.journey = { scenes: {}, loading: {}, cam: null, free: false, drag: null, ch: 0 };
  const PARTY_AT = [[0.1, 0.5], [-0.8, 0.9], [0.8, 0.9], [-0.3, 1.6], [0.9, 1.7]];
  function journeyOf(ch) {
    const E = J.scenes[ch.id]; if (E && BB.landReady(ch)) return E;
    if (E) delete J.scenes[ch.id]; // its skin's art was let go while another land was visited: build it again
    if (!J.loading[ch.id]) { J.loading[ch.id] = true;
      (async () => {
        const stages = BB.MISSIONS.filter((m) => m.chapter === ch.id), biome = ch.biome || 'vale';
        await BB.loadLand(ch);
        const map = BB.buildJourney(stages, biome, 100 + ch.id, { night: !!ch.night, skin: ch.skin });
        BB.renderGround(map, 1);
        const sc = new BB.Battle({ map, heroes: [], peaceful: true, save: BB.save, seed: 9 }); sc.journey = true; sc.npcs = [];
        map.baseAnims = map.anims.slice(); map.baseLights = map.lights.slice();
        J.scenes[ch.id] = { sc, map, party: null, state: null, at: -1 };
      })().catch(() => {}).then(() => { J.loading[ch.id] = false; });
    }
    return null;
  }
  function journeySync(E, ch) {
    const S = BB.save, sc = E.sc, map = E.map, stops = map.stops;
    sc.save = S;
    // what the land shows depends on what has been won: open Gravegates, and who is waiting where
    const wayOpen = BB.chapterCleared(S, ch.id);
    const state = stops.map((st) => (S.cleared[st.m.id] ? 1 : 0)).join('') + '|' + Object.keys(BB.A.chars).length + (wayOpen ? '|open' : '');
    if (state !== E.state) {
      E.state = state;
      const openGates = map.gates.filter((q) => !S.cleared[stops[q.k].m.id]);
      map.anims = map.baseAnims.concat(openGates.map((q) => ({ key: 'portal', x: q.x, y: q.y, sc: 0.5, t: 0, fps: 12 })));
      map.lights = map.baseLights.concat(openGates.map((q) => ({ x: q.x, y: q.y, rad: 2.6, col: '170,90,255' })));
      if (wayOpen && map.exit) { map.anims.push({ key: 'portal', x: map.exit.ring.x, y: map.exit.ring.y, sc: 0.72, t: 0, fps: 12, hueWay: 1 }); map.lights.push({ x: map.exit.x, y: map.exit.y, rad: 4, col: '120,220,255' }); }
      const npcs = [];
      stops.forEach((st, k) => {
        if (S.cleared[st.m.id]) return;
        const M = st.m, kinds = []; M.waves.forEach((wv) => { for (let i = 0; i < wv.length; i += 2) if (!kinds.includes(wv[i])) kinds.push(wv[i]); });
        const artOf = (kind) => { const F = BB.FOES[kind]; if (!F || F.turret || F.gate) return null; const a = F.art || (F.poolPick ? 'h/' + F.poolPick : null) || (F.pool ? BB.poolKeys(F.pool).find((q) => BB.A.chars[q]) : null); return a && BB.A.chars[a] ? a : null; };
        const arts = kinds.map(artOf).filter(Boolean); if (!arts.length) arts.push('ghoul');
        st.foeAt.forEach((q, i) => { const art = arts[i % arts.length]; if (BB.A.chars[art]) npcs.push({ x: q.x, y: q.y, home: { x: q.x, y: q.y }, art, clip: 'Idle', dir: [2, 1, 3][i % 3], ct: i * 0.7 + k, walker: false, wait: 9e9 }); });
        if (M.boss && st.bossAt) { const F = BB.FOES[M.boss], art = F.art || (F.poolPick ? 'h/' + F.poolPick : null);
          if (art && BB.A.chars[art]) npcs.push({ x: st.bossAt.x, y: st.bossAt.y, home: st.bossAt, art, clip: 'Idle', dir: 2, ct: 0, walker: false, wait: 9e9, boss: true });
          else if (art && !E['ld' + art]) { E['ld' + art] = 1; BB.loadChar(art).then(() => { E.state = null; }).catch(() => {}); } }
      });
      sc.npcs = npcs;
    }
    // your team, standing at the chosen stage; when another is chosen they walk the road to it
    const team = BB.teamHeroes(S), pk = team.map((x) => x.id).join(',');
    if (pk !== E.party) {
      if (team.every((x) => BB.heroLayers(x).every((l) => BB.A.chars[l.key]))) {
        E.party = pk; sc.ents = sc.ents.filter((e) => e.side !== 'hero'); sc.heroList = []; E.at = -1;
        team.forEach((x) => { const e = sc.spawnHero(x, BB.heroStats(x), 0, 0); if (!sc.ents.includes(e)) sc.ents.push(e); sc.heroList.push(e); });
      } else if (!E.ldParty) { E.ldParty = true; BB.loadHeroes(team).then(() => { E.ldParty = false; }); }
    }
    const k = Math.max(0, stops.findIndex((st) => BB.MISSIONS[C.sel] === st.m));
    if (k !== E.at && sc.heroList.length) {
      const st = stops[k], from = E.at < 0 ? null : stops[E.at];
      sc.heroList.forEach((e, i) => {
        const o = PARTY_AT[i % PARTY_AT.length], hx = st.x + o[0], hy = st.y + o[1];
        e.home = { x: hx, y: hy }; e.lookAt = st.site; e.wander = null;
        if (!from) { e.x = hx; e.y = hy; e.route = null; sc.face(e, st.site.x, st.site.y); }
        else { const u0 = from.u, u1 = st.u, lo = Math.min(u0, u1), hi = Math.max(u0, u1), pts = map.road.filter((q) => q.u > lo && q.u < hi).map((q) => ({ x: q.x + o[0] * 0.5, y: q.y + o[1] * 0.5 })); if (u1 < u0) pts.reverse();
          e.route = pts.filter((q, j) => j % 3 === 0).concat([{ x: hx, y: hy }]); e.routeSp = 1.5 + Math.min(1.5, pts.length / 40); }
      });
      E.at = k;
    }
  }
  UI.pathRender = function (dt) {
    const c = $('pathCv'); if (!c) return;
    dt = Math.min(0.1, dt || 0.016);
    const dpr = Math.min(2, window.devicePixelRatio || 1) * (BB.lowFx ? 0.75 : 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'), S = BB.save, t = performance.now() / 1000;
    const ch = BB.CHAPTERS.find((x) => x.id === C.ch);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const E = journeyOf(ch);
    if (!E) { // while the land is being built: the painted map
      g.imageSmoothingEnabled = true; g.drawImage(chapterBackdrop(ch, w, h, dpr), 0, 0); C.nodes = chapterNodes(ch, w, h);
      g.font = '600 ' + Math.round(12 * dpr) + 'px Outfit, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.7)'; g.textAlign = 'center'; g.fillText('Raising the land…', w / 2, h - 16 * dpr); return;
    }
    journeySync(E, ch);
    const sc = E.sc, map = E.map, stops = map.stops, selK = Math.max(0, stops.findIndex((st) => BB.MISSIONS[C.sel] === st.m)), sel = stops[selK];
    // the camera rests a little above the chosen stage (its site is up the screen), unless you have dragged it away
    const want = { x: sel.x - 1.7, y: sel.y - 1.7 };
    if (!J.cam || J.ch !== ch.id) { J.cam = { x: want.x, y: want.y }; J.ch = ch.id; J.free = false; }
    if (!J.free && !J.drag) { const q = Math.min(1, dt * 3.2); J.cam.x += (want.x - J.cam.x) * q; J.cam.y += (want.y - J.cam.y) * q; }
    sc.cam.x = J.cam.x; sc.cam.y = J.cam.y; sc.cam.zoom = Math.max(0.6, Math.min(0.95, c.clientHeight / 420));
    sc.update(dt, null);
    sc.render(g, w, h, dpr);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const v = sc.view, P2 = (x, y) => { const q = BB.iso(x, y); return { x: q.x * v.z + v.ox, y: q.y * v.z + v.oy }; }, k = v.z;
    // what is written over the land: your banner where you have won, each stage's plate, the next fight marked
    if (!C.flag) { C.flag = document.createElement('canvas'); C.flag.width = 60; C.flag.height = 84; }
    UI.drawBanner(C.flag.getContext('2d'), S.banner, 60, 84, t);
    const cur = stops.find((st) => BB.stageUnlocked(S, BB.MISSIONS.indexOf(st.m)) && !S.cleared[st.m.id]) || null;
    C.nodes = [];
    stops.forEach((st, i) => {
      const idx = BB.MISSIONS.indexOf(st.m), open = BB.stageUnlocked(S, idx), done = !!S.cleared[st.m.id], boss = st.m.type === 'boss' || st.m.type === 'duel', p = P2(st.x, st.y), ps = P2(st.site.x, st.site.y);
      C.nodes.push({ i: idx, m: st.m, x: p.x, y: p.y, x2: ps.x, y2: ps.y });
      if (p.x < -80 * dpr || p.x > w + 80 * dpr) return;
      if (i === selK) { g.strokeStyle = 'rgba(255,190,85,0.95)'; g.lineWidth = 2 * dpr; g.setLineDash([6 * dpr, 5 * dpr]); g.lineDashOffset = -t * 16 * dpr; g.beginPath(); g.ellipse(p.x, p.y + 10 * k, 46 * k, 23 * k, 0, 0, 7); g.stroke(); g.setLineDash([]); }
      if (done) { g.fillStyle = '#3a2c1c'; g.fillRect(ps.x - 1.2 * k, ps.y - 58 * k, 2.4 * k, 58 * k); g.drawImage(C.flag, ps.x + 1 * k, ps.y - 60 * k, 24 * k, 34 * k); }
      if (st === cur) { const by = p.y - 66 * k + Math.sin(t * 4) * 3 * dpr; g.fillStyle = '#ffbe55'; g.beginPath(); g.moveTo(p.x - 7 * dpr, by - 7 * dpr); g.lineTo(p.x + 7 * dpr, by - 7 * dpr); g.lineTo(p.x, by + 3 * dpr); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = dpr; g.stroke(); }
      const label = boss ? BB.FOES[st.m.boss].name.split(',')[0].replace(/^The /, '').toUpperCase() : st.m.code, fs = Math.round(11 * dpr);
      g.font = '700 ' + fs + 'px Outfit, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const lock = !open, tw = g.measureText(label).width + (lock ? 22 : 12) * dpr, ty = p.y + 40 * k;
      g.fillStyle = done ? 'rgba(60,44,12,0.92)' : 'rgba(10,12,18,0.86)'; g.beginPath(); g.roundRect ? g.roundRect(p.x - tw / 2, ty - fs * 0.8, tw, fs * 1.6, fs * 0.8) : g.rect(p.x - tw / 2, ty - fs * 0.8, tw, fs * 1.6); g.fill();
      g.strokeStyle = i === selK ? 'rgba(255,190,85,0.9)' : done ? 'rgba(255,210,122,0.5)' : boss ? (BOSS_COL[st.m.boss] || '#ff9a8a') : 'rgba(255,255,255,0.18)'; g.lineWidth = 1 * dpr; g.stroke();
      g.fillStyle = lock ? 'rgba(255,255,255,0.45)' : done ? '#ffd27a' : boss ? (BOSS_COL[st.m.boss] || '#ff9a8a') : '#fff'; g.fillText(label, p.x + (lock ? 5 * dpr : 0), ty + dpr * 0.5);
      if (lock) { const lx = p.x - tw / 2 + 9 * dpr, u = 2.6 * dpr; g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.2 * dpr; g.beginPath(); g.arc(lx, ty - u * 0.5, u * 0.8, Math.PI, 0); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(lx - u, ty - u * 0.5, u * 2, u * 1.5); }
      if (st.m.legend && !done) { const sx2 = p.x + tw / 2 + 8 * dpr, sy2 = ty; g.fillStyle = '#5cd3ff'; g.beginPath(); for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, q = (j % 2 ? 2.2 : 5) * dpr; g.lineTo(sx2 + Math.cos(a) * q, sy2 + Math.sin(a) * q); } g.closePath(); g.fill(); }
    });
    if (map.exit) { // the way on, at the end of the road
      const nextCh = BB.CHAPTERS.find((x) => x.id === ch.id + 1), open = BB.chapterCleared(S, ch.id), p = P2(map.exit.x, map.exit.y), pr = P2(map.exit.ring.x, map.exit.ring.y);
      C.nodes.push({ exit: true, x: p.x, y: p.y, x2: pr.x, y2: pr.y - 30 * k });
      if (p.x > -120 * dpr && p.x < w + 120 * dpr) {
        if (open) { g.save(); g.globalCompositeOperation = 'lighter'; if (BB.drawGlow) BB.drawGlow(g, '120,220,255', pr.x, pr.y - 26 * k, 60 * k, 60 * k, 0.35 + 0.15 * Math.sin(t * 3)); g.restore(); }
        const label = nextCh ? (open ? 'TO ' + nextCh.name.toUpperCase() + '  ▸' : 'THE WAY ON') : (open ? 'THE ROAD ENDS HERE' : 'THE LAST GATE'), fs = Math.round(11 * dpr);
        g.font = '700 ' + fs + 'px Outfit, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        const tw = g.measureText(label).width + (open ? 14 : 24) * dpr, ty = p.y + 40 * k;
        g.fillStyle = open ? 'rgba(10,34,44,0.92)' : 'rgba(10,12,18,0.86)'; g.beginPath(); g.roundRect ? g.roundRect(p.x - tw / 2, ty - fs * 0.8, tw, fs * 1.6, fs * 0.8) : g.rect(p.x - tw / 2, ty - fs * 0.8, tw, fs * 1.6); g.fill();
        g.strokeStyle = open ? 'rgba(120,220,255,0.9)' : 'rgba(255,255,255,0.18)'; g.lineWidth = dpr; g.stroke();
        g.fillStyle = open ? '#bdeeff' : 'rgba(255,255,255,0.45)'; g.fillText(label, p.x + (open ? 0 : 5 * dpr), ty + dpr * 0.5);
        if (!open) { const lx = p.x - tw / 2 + 9 * dpr, u2 = 2.6 * dpr; g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.2 * dpr; g.beginPath(); g.arc(lx, ty - u2 * 0.5, u2 * 0.8, Math.PI, 0); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(lx - u2, ty - u2 * 0.5, u2 * 2, u2 * 1.5); }
      }
    }
    // the land's name, set over a shade at the top; an arrow at an edge when the next fight is out of sight
    const sh = g.createLinearGradient(0, 0, 0, 70 * dpr); sh.addColorStop(0, 'rgba(4,5,9,0.7)'); sh.addColorStop(1, 'rgba(4,5,9,0)'); g.fillStyle = sh; g.fillRect(0, 0, w, 70 * dpr);
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.font = '700 ' + Math.round(10 * dpr) + 'px Outfit, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.65)'; if (g.letterSpacing !== undefined) g.letterSpacing = (3 * dpr) + 'px'; g.fillText('CHAPTER ' + BB.roman(ch.id), 18 * dpr, 22 * dpr);
    g.font = '700 ' + Math.round(22 * dpr) + 'px Cinzel, Georgia, serif'; g.fillStyle = '#f4ead2'; if (g.letterSpacing !== undefined) g.letterSpacing = (2 * dpr) + 'px'; g.fillText(ch.name.toUpperCase(), 18 * dpr, 46 * dpr);
    if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
    if (cur) { const p = P2(cur.x, cur.y), off = p.x < 20 * dpr ? -1 : p.x > w - 20 * dpr ? 1 : 0;
      if (off) { const ax = off < 0 ? 18 * dpr : w - 18 * dpr, ay = h / 2, a = 0.6 + 0.4 * Math.sin(t * 5); g.fillStyle = 'rgba(255,190,85,' + a + ')'; g.beginPath(); g.moveTo(ax + off * 8 * dpr, ay); g.lineTo(ax - off * 5 * dpr, ay - 9 * dpr); g.lineTo(ax - off * 5 * dpr, ay + 9 * dpr); g.closePath(); g.fill(); } }
  };
  // press and drag to look along the road; a tap chooses the stage under it
  UI.pathClick = function (ev) {
    const c = $('pathCv'), rc = c.getBoundingClientRect(), d = c.width / rc.width;
    J.drag = { x: ev.clientX, y: ev.clientY, moved: false, d, px: (ev.clientX - rc.left) * d, py: (ev.clientY - rc.top) * d };
    try { c.setPointerCapture(ev.pointerId); } catch (e) { /* not a real pointer */ }
  };
  UI.pathMove = function (ev) {
    const D = J.drag; if (!D) return;
    const dx = ev.clientX - D.x, dy = ev.clientY - D.y;
    if (!D.moved && Math.hypot(dx, dy) < 7) return;
    D.moved = true; D.x = ev.clientX; D.y = ev.clientY;
    const E = J.scenes[C.ch]; if (!E || !E.sc.view || !J.cam) return;
    const q = BB.unIso(-dx * D.d / E.sc.view.z, -dy * D.d / E.sc.view.z); J.free = true;
    let nx = J.cam.x + q.x, ny = J.cam.y + q.y;
    // the view stays with the road
    let best = null, bd = 1e9; for (const r of E.map.road) { const dd = Math.hypot(r.x - nx, r.y - ny); if (dd < bd) { bd = dd; best = r; } }
    if (bd > 5.5) { nx = best.x + (nx - best.x) * 5.5 / bd; ny = best.y + (ny - best.y) * 5.5 / bd; }
    J.cam.x = nx; J.cam.y = ny;
  };
  UI.pathUp = function () {
    const D = J.drag; if (!D) return; J.drag = null;
    if (D.moved) return;
    let best = null, bd = 52 * D.d;
    for (const n of C.nodes) { const q = Math.min(Math.hypot(n.x - D.px, n.y - D.py), n.x2 !== undefined ? Math.hypot(n.x2 - D.px, n.y2 - D.py) : 1e9, Math.hypot(n.x - D.px, n.y - 22 * D.d - D.py)); if (q < bd) { bd = q; best = n; } }
    if (best && best.exit) { // through the ring, to the next land
      const S = BB.save, ch = BB.CHAPTERS.find((x) => x.id === C.ch), nextCh = BB.CHAPTERS.find((x) => x.id === C.ch + 1);
      if (!BB.chapterCleared(S, ch.id)) { BB.sfx('click'); UI.toast('The way is shut until this land is won.'); return; }
      if (!nextCh) { UI.toast('The road ends here. The campaign is won.'); return; }
      const ms = BB.MISSIONS.map((m, i) => [m, i]).filter(([m]) => m.chapter === nextCh.id), nx = ms.find(([m, i]) => !S.cleared[m.id] && BB.stageUnlocked(S, i));
      BB.sfx('portal'); C.ch = nextCh.id; C.sel = (nx || ms[0])[1]; J.free = false; UI.renderCampaign(); return;
    }
    if (best) { C.sel = best.i; J.free = false; BB.sfx('click'); UI.renderStageCard(); }
  };
  (function () { const c = $('pathCv'); if (!c) return; c.addEventListener('pointermove', (e) => UI.pathMove(e)); c.addEventListener('pointerup', () => UI.pathUp()); c.addEventListener('pointercancel', () => { J.drag = null; }); c.style.touchAction = 'none'; })();
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
  // ---- the versus card: shown while a battlefield is made ready, then it parts down the middle onto the fight
  UI.versusFoes = function (st) { const b = $('vsFoes'); b.innerHTML = ''; b.appendChild(UI.foeIcons(st, 84)); };
  UI.versus = function (st, team) {
    const v = $('versus'), hb = $('vsHeroes'); hb.innerHTML = '';
    for (const h of team) { const c = copyCanvas(BB.portrait(h, 84)); c.style.setProperty('--rc', BB.HERO_RARITY[h.rarity || 0].color); c.title = h.name; hb.appendChild(c); }
    UI.versusFoes(st);
    const boss = st.boss && BB.FOES[st.boss];
    $('vsFoeLbl').textContent = boss ? boss.name : st.type === 'gates' ? 'The Gravegates' : 'The horde';
    $('vsPow').innerHTML = '⚔ ' + fmt(BB.teamPower(team)) + '<small>' + team.length + (team.length === 1 ? ' hero' : ' heroes') + '</small>';
    $('vsRec').innerHTML = '<small style="margin:0 8px 0 0">needs</small>⚔ ' + fmt(BB.recPower(st));
    $('vsCode').textContent = 'STAGE ' + st.code; $('vsName').textContent = st.name;
    $('vsObj').textContent = TYPE[st.type] + (st.type === 'defend' ? ' for ' + st.time + ' s' : '');
    v.classList.remove('out'); v.classList.add('on');
    BB.sfx('slam');
    return new Promise((res) => setTimeout(res, 1500));
  };
  UI.versusOut = function (now) {
    const v = $('versus'); if (!v.classList.contains('on')) return;
    if (now) { v.classList.remove('on', 'out'); return; }
    v.classList.add('out'); BB.sfx('swing');
    setTimeout(() => v.classList.remove('on', 'out'), 460);
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
      '<span class="rw">' + UI.si('gift', 16) + ' ' + rw.items + ' gear</span>' + (st.legend && first ? '<span class="rw" style="color:#9fe0ff">★ ' + esc(BB.LEGENDS[st.legend].name) + '</span>' : '');
    box.appendChild(rr);
    const b = el('button', 'btn xl', open ? 'Battle ▸' : UI.si('lock', 16) + ' Locked'); b.style.marginTop = 'auto'; b.disabled = !open;
    click(b, () => UI.openTeam(C.sel));
    box.appendChild(b);
  };

  // ---------------------------------------------------------------- heroes
  const HF = { f: 'all' };
  UI.renderHeroes = function () {
    const S = BB.save, box = $('heroList'); box.innerHTML = '';
    const tiers = BB.heroTiers(BB.ROSTER);
    const total = tiers.reduce((a, t) => a + t.heroes.length, 0) + Object.keys(BB.LEGENDS).length + 1;
    $('hrCount').textContent = 'Collection ' + S.heroes.length + ' / ' + total;
    $('hrColl').style.width = (S.heroes.length / total * 100) + '%';
    const fb = $('hrFilters'); fb.innerHTML = '';
    for (const id of ['all'].concat(BB.CALLING_ORDER)) {
      const b = el('button', 'fbtn' + (HF.f === id ? ' on' : ''), id === 'all' ? 'ALL' : UI.callIcon(id));
      b.title = id === 'all' ? 'All callings' : BB.CALLINGS[id].name;
      click(b, () => { HF.f = id; UI.renderHeroes(); }); fb.appendChild(b);
    }
    const ok = (c) => HF.f === 'all' || c === HF.f;
    box.appendChild(el('div', 'sect', 'Your heroes <small>tap to bring one forward · tap again to open</small>'));
    const own = el('div', 'hcards');
    const team = BB.teamIds(S);
    const shown = sortHeroes(S.heroes).filter((h) => ok(h.calling));
    if (!shown.some((h) => h.id === HF.sel)) HF.sel = shown[0] ? shown[0].id : null;
    for (const h of shown) {
      const card = UI.heroCard(h, { inteam: team.includes(h.id), onClick: () => {
        if (HF.sel === h.id) { UI.openHero(h.id); return; } // the hero already standing in the light: open them
        HF.sel = h.id;
        own.querySelectorAll('.hc.sel').forEach((x) => x.classList.remove('sel')); card.classList.add('sel');
        UI.heroSpot();
      } });
      if (h.id === HF.sel) card.classList.add('sel');
      own.appendChild(card);
    }
    UI.heroSpot();
    if (!own.children.length) own.appendChild(el('div', 'mute', 'No heroes of this calling yet.'));
    box.appendChild(own);
    // the ones still to find: one compact strip per gate instead of a wall of silhouettes
    const strips = [];
    for (const { tier, heroes } of tiers) {
      const missing = heroes.filter((e) => !S.heroes.some((h) => h.recruit === e.key) && ok(e.calling));
      if (!missing.length) continue;
      const open = BB.tierOpen(S, tier);
      const st = el('button', 'tstrip' + (open ? '' : ' shut'));
      st.appendChild(el('div', 'tl', '<b style="color:var(--r' + tier.rarity + ')">' + tier.name + '</b><small>' + (open ? missing.length + ' to recruit' : 'Clear chapter ' + tier.chapter) + '</small>'));
      const av = el('div', 'av'); for (const e of missing.slice(0, 7)) { const t = UI.thumb(e.key, 40); av.appendChild(t); }
      if (missing.length > 7) av.appendChild(el('span', 'more', '+' + (missing.length - 7)));
      st.appendChild(av); st.appendChild(el('span', 'go', open ? '◆ ' + tier.cost + ' ›' : UI.si('lock', 13)));
      click(st, () => UI.openRecruit(BB.TIERS.indexOf(tier)));
      strips.push(st);
    }
    const leg = Object.keys(BB.LEGENDS).filter((id) => !S.heroes.some((h) => h.legend === id) && ok(BB.LEGENDS[id].calling));
    if (leg.length) {
      const st = el('div', 'tstrip shut');
      st.appendChild(el('div', 'tl', '<b style="color:var(--r3)">Legends</b><small>join as you clear their stages</small>'));
      const av = el('div', 'av'); for (const id of leg) { const m = BB.MISSIONS.find((x) => x.legend === id); av.appendChild(el('span', 'more', m ? m.code : '?')); }
      st.appendChild(av); strips.push(st);
    }
    if (strips.length) { box.appendChild(el('div', 'sect', 'Still to find')); const w = el('div', 'tstrips'); strips.forEach((x) => w.appendChild(x)); box.appendChild(w); }
  };

  // the chosen hero, large, on a podium of their rarity's light
  UI.heroSpot = function () {
    const S = BB.save, h = S.heroes.find((x) => x.id === HF.sel), box = $('hsSpot');
    box.style.visibility = h ? '' : 'hidden'; if (!h) return;
    const Cl = BB.CALLINGS[h.calling], R = BB.HERO_RARITY[h.rarity];
    box.className = 'spot frame ' + RCLS(h.rarity);
    $('hsRk').textContent = R.name + (h.legend ? ' · Legend' : h.captain ? ' · Captain' : '');
    $('hsLv').textContent = h.level;
    $('hsStars').textContent = '★'.repeat(h.stars || 1);
    $('hsNm').textContent = h.name;
    $('hsCl').textContent = Cl.name + ' · ' + Cl.role;
    $('hsPw').textContent = '⚔ ' + fmt(BB.power(h));
    HF.t = 0;
  };
  click($('hsSpot'), () => { if (HF.sel) UI.openHero(HF.sel); });
  UI.heroesRender = function (dt) {
    const c = $('hsCv'), S = BB.save; if (!c || !S) return;
    const hero = S.heroes.find((x) => x.id === HF.sel); if (!hero) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'); g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false;
    HF.t = (HF.t || 0) + dt;
    const layers = BB.heroLayers(hero), key = layers[0].key;
    if (!layers.every((L) => BB.A.chars[L.key])) return;
    // they step forward with a flourish, then stand easy; every so often, the flourish again
    const cyc = (HF.t + 7.6) % 9, clip = cyc > 7.2 ? (BB.hasClip(key, 'Taunt') ? 'Taunt' : 'Special1') : 'Idle';
    const n = BB.clipLen(key, clip) || 15;
    const fr = clip === 'Idle' ? Math.floor(HF.t * 9) % n : Math.min(n - 1, Math.floor((cyc - 7.2) * 12));
    const sc = Math.max(2, Math.min(Math.round(h / 125), Math.round(w / 84)));
    const cx = w / 2, cy = h * 0.62;
    UI.podium(g, cx, cy, Math.min(w * 0.4, 34 * sc), RGBA[hero.rarity || 0], HF.t);
    BB.drawHeroDressed(g, hero, BB.auraOf(hero), clip, 1, fr, cx, cy, sc, HF.t, { noSlash: clip === 'Idle', layers });
  };

  // ---------------------------------------------------------------- hero detail
  const D = UI.hd = { id: null, t: 0 };
  UI.openHero = function (id) { D.id = id; D.t = 0; UI.renderHero(); UI.show('hero'); };
  UI.renderHero = function () {
    const S = BB.save, h = S.heroes.find((x) => x.id === D.id); if (!h) return;
    const Cl = BB.CALLINGS[h.calling], R = BB.HERO_RARITY[h.rarity];
    $('hrShow').className = 'show frame ' + RCLS(h.rarity);
    $('hrRk').textContent = R.name + (h.legend ? ' · Legend' : h.captain ? ' · Banner-Captain' : '');
    $('hrNm').textContent = h.name;
    $('hrCl').innerHTML = UI.callIcon(h.calling) + Cl.name + ' · ' + Cl.role + (BB.heroElem(h) && Cl.ranged ? ' · ' + BB.ELEMENTS[BB.heroElem(h)].name : '');
    $('hrStars').textContent = '★'.repeat(h.stars) + '☆'.repeat(BB.MAX_STARS - h.stars);
    const team = BB.teamHeroes(S), st = BB.heroStats(h, BB.teamIds(S).includes(h.id) ? team.map((x) => x.calling) : null);
    const box = $('hrInfo'); box.innerHTML = '';
    const cap = BB.levelCap(h);
    box.appendChild(el('div', 'power', '<span class="ico pow">⚔</span><b>' + fmt(BB.power(h)) + '</b><div class="lvbar"><span>Level ' + h.level + ' / ' + cap + '</span><div class="bar"><i style="width:' + (h.level / cap * 100) + '%"></i></div></div>'));
    const stat = (ic, nm, v) => '<div><i>' + ic + '</i><span>' + nm + '<b>' + v + '</b></span></div>';
    box.appendChild(el('div', 'stats', stat('♥', 'Health', fmt(st.hp)) + stat('⚔', 'Attack', Math.round(st.atk)) + stat('⛨', 'Defence', Math.round(st.def)) +
      stat('✦', 'Crit', Math.round(st.crit * 100) + '%') + stat('➶', 'Speed', st.spd.toFixed(1)) + stat('◎', 'Range', Cl.ranged ? 'Far' : 'Melee')));
    box.appendChild(el('div', 'ult ' + RCLS(h.rarity), '<div class="gem">' + UI.callIcon(h.calling) + '</div><div><b>Ultimate · ' + Cl.skill.name + '</b><p>' + Cl.skill.desc + '</p></div>'));
    const ups = el('div', 'ups');
    const capped = h.level >= cap;
    const lv = el('div', 'mute', '<span style="font-size:13px">' + (capped ? 'Level cap reached.' : 'Experience ' + (h.xp || 0) + ' / ' + BB.xpNeed(h) + ' — fight with ' + BB.shortName(h) + ' to level up.') + '</span>'); lv.style.flex = '1 1 auto';
    const maxS = h.stars >= BB.MAX_STARS;
    const as = el('button', 'btn blue', maxS ? 'Max stars' : 'Ascend ★<span class="cost">✧ ' + S.sigils + ' / ' + BB.ascendCost(h) + '</span>');
    as.disabled = maxS || S.sigils < BB.ascendCost(h);
    click(as, () => { if (BB.ascend(S, h)) { BB.sfx('rally'); BB.persist(); UI.renderHero(); UI.refreshTop(); D.flash = 1; UI.toast(h.name + ' ascends to ' + h.stars + ' stars! Level cap ' + BB.levelCap(h)); } });
    ups.appendChild(lv); ups.appendChild(as);
    box.appendChild(ups);
    if (capped && !maxS) box.appendChild(el('div', 'mute', '<span style="font-size:13px">Ascend to raise the level cap. Sigils come from bosses, spoils, goals and the shop.</span>'));
    const gh = el('div', 'row'); gh.appendChild(el('div', 'ph grow', 'Gear')); const eb = el('button', 'btn dark sm', 'Equip best'); click(eb, () => { BB.equipBest(S, h); BB.sfx('forge'); BB.persist(); UI.renderHero(); UI.refreshTop(); }); gh.appendChild(eb);
    box.appendChild(gh);
    const g4 = el('div', 'gear4');
    for (const slot of BB.SLOTS) {
      const it = h.gear[slot];
      const b = el('button', 'gs');
      if (it) { b.style.setProperty('--ic', BB.RARITY[it.rarity].color); b.appendChild(UI.itemIcon(it, 40)); if (it.plus) b.appendChild(el('span', 'plus', '+' + it.plus)); b.title = it.name + ' · ' + UI.statLine(BB.itemStats(it)); }
      else { b.appendChild(el('span', 'glyph', { weapon: '⚔', chest: '⛨', head: '⛑', charm: '✦' }[slot])); if (S.inventory.some((x) => x.slot === slot && BB.canEquip(h, x))) b.appendChild(el('span', 'new', '+')); }
      b.appendChild(el('small', '', BB.SLOT_NAME[slot]));
      click(b, () => UI.pickGear(h, slot));
      g4.appendChild(b);
    }
    box.appendChild(g4);
    const row = el('div', 'row'); row.style.marginTop = 'auto';
    const lead = el('button', 'btn dark sm', S.leader === h.id ? UI.si('check', 14) + ' Shown at camp' : 'Show at camp'); click(lead, () => { S.leader = h.id; BB.persist(); UI.renderHero(); }); row.appendChild(lead);
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
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    D.t += dt;
    const col = RGBA[h.rarity || 0];
    const bg = g.createRadialGradient(w / 2, hh * 0.55, 0, w / 2, hh * 0.55, Math.max(w, hh) * 0.75);
    bg.addColorStop(0, col.replace('A', '0.2')); bg.addColorStop(0.55, '#111520'); bg.addColorStop(1, '#090b10');
    g.fillStyle = bg; g.fillRect(0, 0, w, hh);
    const layers = BB.heroLayers(h), key = layers[0].key, ult = BB.CALLINGS[h.calling];
    const cyc = D.t % 7, clip = cyc > 5 ? (BB.hasClip(key, 'Special1') ? 'Special1' : 'Taunt') : cyc > 3.4 && cyc < 4.3 ? ult.basic[0] : 'Idle';
    const n = BB.clipLen(key, clip) || 15;
    const fr = clip === 'Idle' ? Math.floor(D.t * 9) % n : Math.min(n - 1, Math.floor((cyc - (cyc > 5 ? 5 : 3.4)) * 15));
    const sc = Math.max(2, Math.round(hh / 105));
    const cx = w / 2, cy = hh * 0.84;
    UI.podium(g, cx, cy, Math.min(w * 0.38, 30 * sc), col, D.t);
    BB.drawLayers(g, layers, clip, Math.floor(D.t / 3) % 2 ? 1 : 2, fr, cx, cy, sc, { noSlash: clip === 'Idle', flash: D.flash > 0 ? D.flash : 0 });
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

  // ---------------------------------------------------------------- recruit: one great gate, a tab per tier
  const RC = UI.rec = { t: 0, tier: 0, loaded: {}, pool: [], feat: 0, featT: 0 };
  UI.openRecruit = async function (tierIdx) {
    await BB.loadPortraits();
    const S = BB.save;
    if (tierIdx !== undefined) RC.tier = tierIdx;
    else { const open = BB.TIERS.map((t, i) => [t, i]).filter(([t]) => BB.tierOpen(S, t)); RC.tier = open.length ? open[open.length - 1][1] : 0; }
    UI.renderRecruit(); UI.show('recruit');
  };
  UI.renderRecruit = function () {
    const S = BB.save, tiers = BB.heroTiers(BB.ROSTER), tabs = $('tierTabs'); tabs.innerHTML = '';
    tiers.forEach(({ tier, heroes }, i) => {
      const open = BB.tierOpen(S, tier), left = heroes.filter((e) => !S.heroes.some((h) => h.recruit === e.key)).length;
      const b = el('button', 'tier ' + RCLS(tier.rarity) + (RC.tier === i ? ' on' : '') + (open ? '' : ' locked'),
        '<span class="gem"></span><span><b>' + tier.name + '</b><small>' + (open ? (left ? '◆ ' + tier.cost + ' · ' + left + ' left' : 'All recruited') : UI.si('lock', 12) + ' Clear chapter ' + tier.chapter) + '</small></span>');
      click(b, () => { RC.tier = i; UI.renderRecruit(); });
      tabs.appendChild(b);
    });
    const { tier, heroes } = tiers[RC.tier], open = BB.tierOpen(S, tier);
    const left = heroes.filter((e) => !S.heroes.some((h) => h.recruit === e.key));
    $('altar2').className = 'altar2 frame ' + RCLS(tier.rarity);
    const info = $('altarInfo'); info.innerHTML = '';
    info.appendChild(el('h2', '', tier.name + ' Gate'));
    info.appendChild(el('div', 'mute', open ? (tier.rarity ? BB.HERO_RARITY[tier.rarity].name + ' heroes: ×' + BB.HERO_RARITY[tier.rarity].mult + ' to every stat. ' : 'Steady recruits to fill your ranks. ') + 'You get a hero you don\'t have yet.' : 'Clear chapter ' + tier.chapter + ' · ' + esc(BB.CHAPTERS[tier.chapter - 1].name) + ' to open this gate.'));
    info.appendChild(el('div', 'lbl', left.length + ' of ' + heroes.length + ' still to find'));
    RC.pool = (left.length ? left : heroes).slice(0, 7); RC.open = open; RC.feat = 0; RC.featT = 0;
    for (const e of RC.pool) if (!RC.loaded[e.key]) { RC.loaded[e.key] = 'loading'; BB.loadChar('h/' + e.key).then(() => { RC.loaded[e.key] = 1; }).catch(() => {}); }
    const row = el('div', 'row');
    const b = el('button', 'btn xl', !open ? UI.si('lock', 16) + ' Locked' : !left.length ? 'All recruited' : 'Recruit <span class="cost">◆ ' + tier.cost + '</span>');
    b.disabled = !open || !left.length || S.crystals < tier.cost;
    click(b, () => {
      const h = BB.summon(S, BB.ROSTER, tier.id); if (!h) return;
      BB.persist(); UI.refreshTop();
      BB.loadChar('h/' + h.recruit).then(() => UI.reveal(h, () => UI.renderRecruit()));
    });
    row.appendChild(b);
    info.appendChild(row);
    info.appendChild(el('div', 'lbl', 'You have ◆ ' + fmt(S.crystals) + (open && left.length && S.crystals < tier.cost ? ' · crystals come from first victories, goals and the shop' : '')));
  };
  UI.recruitRender = function (dt) {
    RC.t += dt;
    const c = $('altarCv'); if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'); if (BB.softGlow) BB.softGlow(g); g.setTransform(1, 0, 0, 1, 0, 0);
    const T = BB.TIERS[RC.tier], open = BB.tierOpen(BB.save, T), col = T.rarity ? RGBA[T.rarity] : 'rgba(150,200,255,A)', C = (a) => (open ? col : 'rgba(150,160,175,A)').replace('A', String(a));
    const bg = g.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.4, Math.max(w, h) * 0.75);
    bg.addColorStop(0, C(open ? 0.22 : 0.06)); bg.addColorStop(0.55, '#0e1119'); bg.addColorStop(1, '#07080c'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const infoH = ($('altarInfo').offsetHeight || 0) * dpr, room = Math.max(h * 0.42, h - infoH);
    const base = room * 0.76, gh = Math.min(room * 0.64, w * 0.3), cx = w / 2, ro = gh * 0.42, ri = ro * 0.7, ys = base - gh + ro;
    if (open) { // an open gate is alive: rays turn behind it, the ground is split at its foot, embers rise, lightning finds it
      const t = RC.t, R = Math.max(w, h) * 0.8, gy = base - gh * 0.45, u = dpr;
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(cx, gy);
      for (let i = 0; i < 10; i++) { const a = t * 0.12 + i / 10 * Math.PI * 2, wd = 0.05 + 0.03 * Math.sin(i * 3.1 + 1); g.fillStyle = C((0.05 + 0.035 * Math.sin(i * 5.3 + t * 1.3)).toFixed(3));
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - wd) * R, Math.sin(a - wd) * R); g.lineTo(Math.cos(a + wd) * R, Math.sin(a + wd) * R); g.closePath(); g.fill(); }
      g.restore();
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = C((0.3 + 0.12 * Math.sin(t * 2.2)).toFixed(3)); g.lineWidth = Math.max(1.2, 1.6 * u); g.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const a = Math.PI * (0.08 + i / 6 * 0.84), len = (60 + ((i * 53) % 50)) * u * (gh / (260 * u)); let px = cx + (i - 3) * 7 * u, py = base + 3 * u; g.beginPath(); g.moveTo(px, py);
        for (let q = 1; q <= 5; q++) { px += Math.cos(a) * len / 5 * 1.7 + Math.sin(i * 7 + q * 3.3) * 4 * u; py += Math.sin(a) * len / 5 * 0.3 + Math.cos(i * 5 + q * 2.1) * 1.5 * u; g.lineTo(px, py); } g.stroke(); }
      for (let i = 0; i < 22; i++) { const q = (t * (0.1 + (i % 5) * 0.025) + i * 0.137) % 1, ex = cx + Math.sin(i * 12.9) * w * 0.4 + Math.sin(t * 0.8 + i) * 10 * u, ey = base * (1.04 - q * 1.05), r = (1 + (i % 3) * 0.7) * u;
        g.globalAlpha = Math.sin(q * Math.PI) * 0.7; g.fillStyle = C(1); g.fillRect(ex - r, ey - r, r * 2, r * 2); }
      const bt = t % 4.3; if (bt < 0.22) { const a = (1 - bt / 0.22) * (Math.floor(bt * 40) % 3 ? 1 : 0.4), seed = Math.floor(t / 4.3) * 7.7, off = Math.sin(seed) * gh * 0.9;
        g.beginPath(); g.moveTo(cx + off, -10); const ty = base - gh * 0.98; for (let q = 1; q <= 8; q++) g.lineTo(cx + off * (1 - q / 8) + (q < 8 ? Math.sin(seed + q * 4.7 + Math.floor(bt * 30)) * 12 * u : 0), -10 + (ty + 10) * q / 8);
        g.globalAlpha = a * 0.3; g.strokeStyle = C(1); g.lineWidth = 9 * u; g.stroke(); g.globalAlpha = a; g.strokeStyle = '#fff'; g.lineWidth = 2.2 * u; g.stroke(); }
      g.restore();
    }
    gateArch(g, { cx, base, gh, C, t: RC.t, open, dpr, power: 1, runes: 1, side: (RC.pool || []), feat: RC.pool && RC.pool.length ? RC.pool[RC.feat % RC.pool.length] : null });
    const pool = RC.pool || [], feat = pool.length ? pool[RC.feat % pool.length] : null, ready = (e) => RC.loaded[e.key] === 1, S = Math.max(2, Math.round(gh * 0.55 / 42));
    // the featured hero steps into the light, fully seen; a new one every few seconds
    if (feat && ready(feat) && open) {
      RC.featT += dt; if (RC.featT > 3.2) { RC.featT = 0; RC.feat = (RC.feat + 1) % pool.length; }
      const k = Math.min(1, RC.featT / 0.5), out = RC.featT > 2.9 ? (RC.featT - 2.9) / 0.3 : 0, key = 'h/' + feat.key, fr = Math.floor(RC.t * 8) % (BB.clipLen(key, 'Idle') || 15), fy = base + ro * 0.06;
      g.save(); g.globalCompositeOperation = 'lighter'; const sp = g.createRadialGradient(cx, fy, 0, cx, fy, ro * 1.1); sp.addColorStop(0, C(0.35)); sp.addColorStop(1, C(0)); g.fillStyle = sp; g.beginPath(); g.ellipse(cx, fy, ro * 1.1, ro * 0.3, 0, 0, 7); g.fill(); g.restore();
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(cx, fy, S * 12, S * 3.5, 0, 0, 7); g.fill();
      g.save(); g.globalAlpha = Math.max(0, 1 - out); g.imageSmoothingEnabled = false;
      if (k < 1) silhouetteChar(g, key, fr, cx, fy, S, 2, C(1));
      g.globalAlpha = k * Math.max(0, 1 - out); BB.drawChar(g, key, '', 'Idle', 2, fr, cx, fy, S, k < 1 ? (1 - k) * 0.8 : 0); g.restore();
      const I = BB.identityOf ? BB.identityOf({ recruit: feat.key, calling: feat.calling, name: feat.name }) : null;
      g.save(); g.globalAlpha = k * Math.max(0, 1 - out); g.textAlign = 'center'; g.font = '700 ' + Math.round(14 * dpr) + 'px Outfit, sans-serif'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 8; g.fillText(feat.name, cx, fy + 22 * dpr);
      if (I && h > 520 * dpr) { g.font = '600 ' + Math.round(11 * dpr) + 'px Outfit, sans-serif'; g.fillStyle = BB.CLASSES[I.cls].col; g.fillText(BB.CLASSES[I.cls].name.toUpperCase() + ' · ' + BB.SIGNATURES[I.sig].name.toUpperCase(), cx, fy + 36 * dpr); }
      g.restore();
    }
    if (!open) { g.save(); g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = '700 ' + Math.round(13 * dpr) + 'px Outfit, sans-serif'; g.textAlign = 'center'; g.fillText('SEALED', cx, (ys + base) / 2); g.restore(); }
  };
  // the gate, shared by the recruit screen and the summoning: a stone arch on its platform, a vortex in the tier's colour,
  // runes that light in turn (o.runes 0..1), a vortex that grows with o.power, recruits waiting at its sides (o.side)
  function gateArch(g, o) {
    const { cx, base, gh, C, t, open, dpr } = o, ro = gh * 0.42, ri = ro * 0.7, ys = base - gh + ro, pw = o.power === undefined ? 1 : o.power;
    const RC = { t, loaded: UI.rec.loaded };
    const RCt = t;
    // light from above and motes rising
    if (open) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = -2; i <= 2; i++) { const x = cx + i * ro * 0.5, gr = g.createLinearGradient(x, 0, x, base); gr.addColorStop(0, C(0.1)); gr.addColorStop(1, C(0)); g.fillStyle = gr; g.beginPath(); g.moveTo(x - ro * 0.1, 0); g.lineTo(x + ro * 0.1, 0); g.lineTo(x + ro * 0.35 + i * ro * 0.1, base); g.lineTo(x - ro * 0.35 + i * ro * 0.1, base); g.closePath(); g.fill(); }
      for (let i = 0; i < 30; i++) { const k = (RCt * 0.18 + i / 30) % 1, a = i * 2.4; g.fillStyle = C((1 - k) * 0.8); g.fillRect(cx + Math.cos(a) * ro * (0.4 + k * 1.6), base - k * gh * 1.1, 2 * dpr, 2 * dpr); } g.restore(); }
    // the platform
    for (const [k, al] of [[1, 0.6], [1.3, 0.3], [1.65, 0.14]]) { g.strokeStyle = C(al); g.lineWidth = Math.max(1, dpr * 1.2); g.beginPath(); g.ellipse(cx, base, ro * 1.6 * k, ro * 0.32 * k, 0, 0, 7); g.stroke(); }
    g.setLineDash([8 * dpr, 6 * dpr]); g.lineDashOffset = -RCt * 20 * dpr; g.strokeStyle = C(0.4); g.beginPath(); g.ellipse(cx, base, ro * 1.9, ro * 0.38, 0, 0, 7); g.stroke(); g.setLineDash([]);
    // those waiting at the sides: silhouettes, rim-lit by the gate
    const pool = o.side || [], feat = o.feat, ready = (e) => RC.loaded[e.key] === 1;
    const S = Math.max(2, Math.round(gh * 0.55 / 42)), waiting = pool.filter((e) => e !== feat).slice(0, 6);
    waiting.forEach((e, i) => { if (!ready(e)) return; const side = i % 2 ? 1 : -1, n = Math.floor(i / 2), x = cx + side * (ro * 1.55 + n * ro * 0.85), y = base - ro * 0.18 - n * ro * 0.08, sc = Math.max(1, S - 1 - Math.floor(n / 2));
      const fr = Math.floor(RCt * 6 + i) % (BB.clipLen('h/' + e.key, 'Idle') || 15); silhouetteChar(g, 'h/' + e.key, fr, x, y, sc, side < 0 ? 3 : 1, C(open ? 0.85 : 0.3)); });
    // the gate: a vortex in the arch
    const opening = () => { g.beginPath(); g.moveTo(cx - ri, base); g.lineTo(cx - ri, ys); g.arc(cx, ys, ri, Math.PI, Math.PI * 2); g.lineTo(cx + ri, base); g.closePath(); };
    g.save(); opening(); g.clip(); g.fillStyle = '#05060a'; g.fillRect(cx - ri, ys - ri, ri * 2, base - ys + ri);
    if (open && pw > 0) { const vy = (ys - ri + base) / 2, R = (base - ys + ri) * 0.62 * Math.min(1.25, 0.25 + pw * 0.75); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, pw);
      for (let n = 0; n < 7; n++) { const q = 1 - ((RCt * 0.45 + n / 7) % 1); g.strokeStyle = C((0.55 * q).toFixed(3)); g.lineWidth = Math.max(1, R * 0.03 * q); g.beginPath(); g.ellipse(cx, vy, ri * q * 1.05, R * q, 0, 0, 7); g.stroke(); }
      for (let a = 0; a < 6; a++) { g.strokeStyle = a % 2 ? 'rgba(255,255,255,0.35)' : C(0.55); g.lineWidth = Math.max(1, R * 0.018); g.beginPath(); for (let st = 2; st <= 26; st++) { const q = st / 26, an = a / 6 * 6.28 + q * 4.6 + RCt * 1.8, px = cx + Math.cos(an) * ri * (1 - q), py = vy + Math.sin(an) * R * (1 - q); st === 2 ? g.moveTo(px, py) : g.lineTo(px, py); } g.stroke(); }
      const core = g.createRadialGradient(cx, vy, 0, cx, vy, R * 0.6); core.addColorStop(0, 'rgba(255,255,255,0.85)'); core.addColorStop(0.35, C(0.6)); core.addColorStop(1, C(0)); g.fillStyle = core; g.fillRect(cx - ri, ys - ri, ri * 2, base - ys + ri); }
    g.restore();
    // the arch stones and their runes
    g.beginPath(); g.moveTo(cx - ro, base); g.lineTo(cx - ro, ys); g.arc(cx, ys, ro, Math.PI, Math.PI * 2); g.lineTo(cx + ro, base); g.lineTo(cx + ri, base); g.lineTo(cx + ri, ys); g.arc(cx, ys, ri, Math.PI * 2, Math.PI, true); g.lineTo(cx - ri, base); g.closePath();
    const sg = g.createLinearGradient(cx - ro, 0, cx + ro, 0); sg.addColorStop(0, '#1a1c26'); sg.addColorStop(0.5, '#2c2f3c'); sg.addColorStop(1, '#16171f'); g.fillStyle = sg; g.fill(); g.strokeStyle = '#05060a'; g.lineWidth = dpr; g.stroke();
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = C(open ? 0.7 + 0.25 * Math.sin(RCt * 3) : 0.15); g.shadowColor = C(1); g.shadowBlur = open ? 12 * dpr : 0; g.lineWidth = Math.max(1.2, dpr * 1.4);
    for (let r = 0; r < 9; r++) { if (r / 9 >= (o.runes === undefined ? 1 : o.runes)) continue; const an = Math.PI + (r + 0.5) / 9 * Math.PI, rr = (ri + ro) / 2, rs = (ro - ri) * 0.18, rx = cx + Math.cos(an) * rr, ry = ys + Math.sin(an) * rr; g.beginPath(); if (r % 3 === 0) { g.moveTo(rx, ry - rs); g.lineTo(rx, ry + rs); g.moveTo(rx - rs * 0.6, ry); g.lineTo(rx + rs * 0.6, ry); } else if (r % 3 === 1) { g.arc(rx, ry, rs * 0.6, 0, 7); } else { g.moveTo(rx - rs * 0.6, ry + rs); g.lineTo(rx, ry - rs); g.lineTo(rx + rs * 0.6, ry + rs); } g.stroke(); }
    for (const sx of [-1, 1]) for (let r = 0; r < 4; r++) { if ((r + 0.5) / 4 >= (o.runes === undefined ? 1 : o.runes)) continue; const x = cx + sx * (ro + ri) / 2, y = ys + (r + 0.6) * (base - ys) / 4.4, rs = (ro - ri) * 0.15; g.beginPath(); g.moveTo(x - rs, y - rs); g.lineTo(x + rs, y + rs); g.moveTo(x + rs, y - rs); g.lineTo(x - rs, y + rs); g.stroke(); }
    if (open) { g.shadowBlur = 20 * dpr; opening(); g.stroke(); }
    g.restore();
    return { ro, ri, ys, vy: (ys - ri + base) / 2 };
  }
  const silCv = document.createElement('canvas');
  function silhouetteChar(g, key, fr, x, y, sc, dir, rim) { // a recruit as a dark shape with a rim of light
    const S = Math.ceil(128 * sc); if (silCv.width !== S) { silCv.width = S; silCv.height = S; }
    const x2 = silCv.getContext('2d'); x2.globalCompositeOperation = 'source-over'; x2.clearRect(0, 0, S, S); x2.imageSmoothingEnabled = false;
    BB.drawChar(x2, key, '', 'Idle', dir, fr, S / 2, 90 * sc, sc); x2.globalCompositeOperation = 'source-in'; x2.fillStyle = rim; x2.fillRect(0, 0, S, S);
    g.save(); g.imageSmoothingEnabled = false; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]]) g.drawImage(silCv, x - S / 2 + dx * sc, y - 90 * sc + dy * sc);
    x2.fillStyle = '#05060a'; x2.fillRect(0, 0, S, S); g.drawImage(silCv, x - S / 2, y - 90 * sc); g.restore();
  }
  // ---------------------------------------------------------------- the summoning: energy gathers into a gate, the gate climbs
  // through the rarity colours, bursts, and the hero steps out of the light as a silhouette that fills with colour
  const RV = UI.rv = { on: false };
  const RCOL = ['#d9e0ea', '#4da3ff', '#b57cff', '#ffae2b'], RHUE = [150, 170, 30, -160];
  UI.reveal = function (h, done) {
    Object.assign(RV, { on: true, t: 0, h, done, parts: [], rings: [], bolts: [], shake: 0, flash: 0, step: -1, burst: false, stars: 0, sil: null, pip: false });
    if (BB.Preview) BB.Preview.stop(); $('reveal').classList.remove('pip');
    RV.steps = (h.rarity || 0) + 1;
    RV.tB = 1.4 + RV.steps * 0.6; RV.tS = RV.tB + 0.3; RV.tG = RV.tS + 1.5; RV.tC = RV.tG + 1.7;
    // energy motes rush in from the edges
    for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, d = 0.65 + Math.random() * 0.5; RV.parts.push({ kind: 'in', a, d, delay: Math.random() * 1.1, sp: 0.5 + Math.random() * 0.6 }); }
    const R = BB.HERO_RARITY[h.rarity || 0];
    $('reveal').style.setProperty('--rc', RCOL[h.rarity || 0]);
    $('rvRk').textContent = R.name + (h.legend ? ' · Legend' : '');
    const I = BB.identityOf ? BB.identityOf(h) : null; RV.ent = I ? I.entrance : 'stride'; RV.sig = I ? I.sig : null; RV.landed = false; RV.sigHit = false; RV.sparks = [];
    $('rvNm').textContent = h.name;
    $('rvCl').innerHTML = I ? '<b style="color:' + BB.CLASSES[I.cls].col + '">' + BB.CLASSES[I.cls].name + '</b> · ' + BB.TEMPERS[I.temper].name : BB.CALLINGS[h.calling].name;
    if ($('rvDs')) $('rvDs').innerHTML = I ? '<span class="sig">' + BB.SIGNATURES[I.sig].name + '</span> — ' + esc(BB.SIGNATURES[I.sig].line) : '';
    $('reveal').classList.remove('done'); $('reveal').classList.add('on');
    BB.sfx('portal'); BB.sfx('charge');
  };
  click($('rvOk'), (ev) => { ev.stopPropagation(); RV.on = false; if (BB.Preview) BB.Preview.stop(); $('reveal').classList.remove('on', 'pip'); RV.done && RV.done(); });
  $('reveal').addEventListener('click', () => { if (!RV.on) return; if (RV.t < RV.tB) RV.t = RV.tB - 0.01; else if (RV.t > RV.tS + 0.8 && RV.t < RV.tC) RV.t = RV.tC; }); // tap to skip ahead
  const sil = (layers, clip, dir, fr) => { // the hero as a black cut-out, for the backlit moment: made at sprite size, stretched when drawn
    const S = 128, c = RV.sil || (RV.sil = document.createElement('canvas')); if (c.width !== S) { c.width = S; c.height = S; }
    const x = c.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, S, S); x.imageSmoothingEnabled = false;
    BB.drawLayers(x, layers, clip, dir, fr, S / 2, 90, 1, { noSlash: true });
    x.globalCompositeOperation = 'source-in'; x.fillStyle = '#05060a'; x.fillRect(0, 0, S, S); return c;
  };
  // ---- the signature showcase: after arriving, the new hero shows what they do best
  const cl01 = (v) => Math.max(0, Math.min(1, v)), eio = (k) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const SIG_HIT = { whirlwind: [0.1, 'slash'], groundpound: [0.5, 'slam'], blinkstrike: [0.45, 'blink'], warcry: [0.12, 'rally'], shieldtoss: [0.2, 'swing'], multishot: [0.3, 'bow'],
    snare: [0.3, 'bow'], chainbolt: [0.3, 'cast'], meteor: [0.62, 'boom'], smite: [0.35, 'burst'], bloodrush: [0.1, 'charge'], vault: [0.72, 'slam'], decoy: [0.2, 'blink'], flurry: [0.1, 'slash'], barrier: [0.2, 'guard'] };
  function sigPose(sig, k) { // how the hero moves during their showcase: clip, offset in sprite pixels, visibility
    const P = { clip: 'Special1', dx: 0, dy: 0, vis: 1, flip: 0 };
    if (sig === 'groundpound') { P.clip = 'Attack4'; P.dy = k < 0.35 ? -Math.sin(k / 0.35 * Math.PI / 2) * 34 : k < 0.5 ? -34 * (1 - (k - 0.35) / 0.15) : 0; }
    else if (sig === 'blinkstrike') { P.clip = 'Attack1'; P.vis = k > 0.15 && k < 0.45 ? 0 : 1; P.dx = k >= 0.45 ? 0 : 0; }
    else if (sig === 'warcry') P.clip = 'Taunt';
    else if (sig === 'shieldtoss' || sig === 'multishot' || sig === 'snare') P.clip = 'Attack1';
    else if (sig === 'vault') { const q = cl01((k - 0.1) / 0.62); P.clip = 'AttackRun'; P.dy = -Math.sin(q * Math.PI) * 34; P.dx = Math.sin(q * Math.PI * 2) * 6; }
    else if (sig === 'decoy') { P.vis = k > 0.2 && k < 0.9 ? 0.35 : 1; P.dx = k > 0.2 ? 18 * eio(cl01((k - 0.2) / 0.5)) * (1 - cl01((k - 1.0) / 0.4)) : 0; }
    else if (sig === 'flurry') P.clip = k < 0.7 ? 'Attack1' : 'Attack4';
    return P;
  }
  function sigFx(g, sig, k, o) { // and the effect that goes with it
    const { cx, fy, sc, u, w, h } = o, hy = fy - 22 * sc, top = fy - 48 * sc;
    const al = Math.max(0, 1 - cl01((k - 1.1) / 0.4));
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const ring = (x, y, r, col, lw, a) => { g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.ellipse(x, y, r, r * 0.34, 0, 0, 7); g.stroke(); };
    const slash = (x, y, len, ang, col, lw, a) => { g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len); g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); g.stroke(); g.lineWidth = lw * 0.35; g.strokeStyle = '#fff'; g.stroke(); };
    const bolt = (x0, y0, x1, y1, seed, lw, a) => { g.globalAlpha = a; g.beginPath(); g.moveTo(x0, y0); for (let i = 1; i < 8; i++) { const q = i / 8; g.lineTo(x0 + (x1 - x0) * q + Math.sin(seed * 7 + i * 13.7) * 18 * u, y0 + (y1 - y0) * q + Math.cos(seed * 5 + i * 9.1) * 10 * u); } g.lineTo(x1, y1);
      g.strokeStyle = '#7fd8ff'; g.lineWidth = lw * 2.4; g.shadowColor = '#4cc9ff'; g.shadowBlur = 20 * u; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = lw; g.stroke(); g.shadowBlur = 0; };
    switch (sig) {
      case 'whirlwind': {
        for (let i = 0; i < 4; i++) { const a0 = k * 16 + i * Math.PI / 2, r = (34 + i * 7) * sc * (0.6 + cl01(k * 3) * 0.4);
          g.globalAlpha = al * (0.9 - i * 0.15); g.strokeStyle = i % 2 ? '#ffffff' : '#bfe9ff'; g.lineWidth = (5 - i) * u * 1.4; g.beginPath(); g.ellipse(cx, hy + 6 * sc, r, r * 0.32, 0, a0, a0 + 1.6); g.stroke(); }
        break;
      }
      case 'groundpound': if (k > 0.5) { const q = (k - 0.5) / 0.9; for (let i = 0; i < 3; i++) ring(cx, fy, (q * 120 + i * 18) * sc * 0.9, i ? '#ffcf8a' : '#fff', (8 - i * 2) * u * (1 - q), al * (1 - q)); } break;
      case 'blinkstrike': {
        if (k > 0.1 && k < 0.6) { const a = 1 - cl01((k - 0.1) / 0.5); g.globalAlpha = a * 0.5; g.fillStyle = '#9fd0ff'; g.beginPath(); g.ellipse(cx, hy, 14 * sc * (1 + (k - 0.1) * 3), 30 * sc * (1 - (k - 0.1)), 0, 0, 7); g.fill(); }
        if (k > 0.45) { const q = cl01((k - 0.45) / 0.18), a = al * (1 - cl01((k - 0.7) / 0.6)); slash(cx + 16 * sc, hy, 46 * sc * q, -0.7, '#7fc8ff', 7 * u, a); slash(cx + 16 * sc, hy, 46 * sc * q, 0.7, '#7fc8ff', 7 * u, a); }
        break;
      }
      case 'warcry': for (let i = 0; i < 4; i++) { const q = cl01((k - 0.1 - i * 0.18) / 0.8); if (q <= 0 || q >= 1) continue; g.globalAlpha = (1 - q) * al; g.strokeStyle = i % 2 ? '#ff7a4a' : '#ffd27a'; g.lineWidth = 6 * u * (1 - q); g.beginPath(); g.arc(cx, top + 6 * sc, q * 90 * sc, 0, 7); g.stroke(); }
        for (let i = 0; i < 12; i++) { const a = i / 12 * 7, q = cl01((k - 0.1) / 0.5); g.globalAlpha = al * 0.7 * (1 - q * 0.5); g.strokeStyle = '#ffd27a'; g.lineWidth = 2.5 * u; g.beginPath(); g.moveTo(cx + Math.cos(a) * 40 * sc * q, top + 6 * sc + Math.sin(a) * 40 * sc * q); g.lineTo(cx + Math.cos(a) * (40 * q + 16) * sc, top + 6 * sc + Math.sin(a) * (40 * q + 16) * sc); g.stroke(); }
        break;
      case 'shieldtoss': if (k > 0.2 && k < 1.3) { const q = (k - 0.2) / 1.1; for (let j = 0; j < 6; j++) { const qq = Math.max(0, q - j * 0.025), a = qq * Math.PI * 2, x = cx + Math.sin(a) * 90 * sc, y = hy - Math.sin(a * 2) * 16 * sc + (1 - Math.cos(a)) * 6 * sc;
          g.globalAlpha = al * (j ? 0.25 : 1); g.fillStyle = j ? '#9fd0ff' : '#e8f2ff'; g.beginPath(); g.ellipse(x, y, 8 * sc, 5 * sc, a * 3, 0, 7); g.fill(); } } break;
      case 'multishot': if (k > 0.3) { const q = cl01((k - 0.3) / 0.5); for (let i = 0; i < 5; i++) { const a = -0.55 + i * 0.27, d = q * w * 0.55, x = cx + 14 * sc + Math.cos(a) * d, y = hy + Math.sin(a) * d * 0.6;
          g.globalAlpha = al; g.strokeStyle = '#fff3c4'; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(a) * 60 * u, y - Math.sin(a) * 36 * u); g.stroke(); } } break;
      case 'snare': if (k > 0.3) { const q = cl01((k - 0.3) / 0.45), x = cx + q * 150 * sc, y = hy - Math.sin(q * Math.PI) * 40 * sc + q * 20 * sc, r = (6 + q * 30) * sc;
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = al; g.strokeStyle = '#d8c79a'; g.lineWidth = 2 * u;
          for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(x + i * r / 3, y - r * 0.6); g.lineTo(x + i * r / 3, y + r * 0.6); g.stroke(); g.beginPath(); g.moveTo(x - r, y + i * r / 5); g.lineTo(x + r, y + i * r / 5); g.stroke(); } } break;
      case 'chainbolt': if (k > 0.3 && k < 1.3) { const pts = [[cx + 10 * sc, hy - 10 * sc], [w * 0.78, h * 0.3], [w * 0.88, h * 0.55], [w * 0.2, h * 0.28], [w * 0.1, h * 0.58]];
          for (let i = 0; i < 4; i++) { const t0 = 0.3 + i * 0.12; if (k < t0) break; const fl = Math.floor(k * 30) % 3 ? 1 : 0.4; bolt(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], i + Math.floor(k * 20), 2.5 * u, fl * al * (1 - cl01((k - t0 - 0.4) / 0.4)));
            g.globalAlpha = al; const gl = g.createRadialGradient(pts[i + 1][0], pts[i + 1][1], 0, pts[i + 1][0], pts[i + 1][1], 40 * u); gl.addColorStop(0, 'rgba(200,245,255,0.8)'); gl.addColorStop(1, 'rgba(80,200,255,0)'); g.fillStyle = gl; g.fillRect(pts[i + 1][0] - 40 * u, pts[i + 1][1] - 40 * u, 80 * u, 80 * u); } } break;
      case 'meteor': { const tx = cx + w * 0.16, ty = fy + 4 * sc;
        if (k > 0.1 && k < 0.62) { const q = (k - 0.1) / 0.52, x = tx + (1 - q) * w * 0.35, y = ty - (1 - q) * h * 0.9;
          const gl = g.createRadialGradient(x, y, 0, x, y, 26 * u); gl.addColorStop(0, '#fff6c0'); gl.addColorStop(0.4, '#ff9a3a'); gl.addColorStop(1, 'rgba(255,60,10,0)'); g.globalAlpha = 1; g.fillStyle = gl; g.beginPath(); g.arc(x, y, 26 * u, 0, 7); g.fill();
          g.strokeStyle = 'rgba(255,140,40,0.6)'; g.lineWidth = 16 * u; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.12, y - h * 0.3); g.stroke(); }
        if (k > 0.62) { const q = cl01((k - 0.62) / 0.7); const R0 = (70 + q * 180) * u, gl = g.createRadialGradient(tx, ty - 30 * u, 0, tx, ty - 30 * u, R0); gl.addColorStop(0, 'rgba(255,250,210,' + (1 - q * 0.8) + ')'); gl.addColorStop(0.35, 'rgba(255,150,40,' + 0.85 * (1 - q) + ')'); gl.addColorStop(1, 'rgba(255,60,10,0)');
          g.globalAlpha = 1; g.fillStyle = gl; g.beginPath(); g.arc(tx, ty - 30 * u, R0, 0, 7); g.fill(); ring(tx, ty, q * 260 * u, '#ffb060', 10 * u * (1 - q), 1 - q);
          for (let i = 0; i < 14; i++) { const qq = (k * 1.4 + i / 14) % 1; g.globalAlpha = (1 - qq) * (1 - q * 0.6); g.fillStyle = i % 2 ? '#ff9a3a' : '#ffd27a'; g.beginPath(); g.arc(tx + Math.sin(i * 2.7) * 50 * u, ty - qq * 120 * u, (3 + (1 - qq) * 6) * u, 0, 7); g.fill(); } }
        break; }
      case 'smite': if (k > 0.2) { const q = cl01((k - 0.2) / 0.15), a = al * (1 - cl01((k - 0.6) / 0.8)), bw = 26 * sc * q;
          const gl = g.createLinearGradient(0, 0, 0, fy); gl.addColorStop(0, 'rgba(255,240,180,0)'); gl.addColorStop(0.6, 'rgba(255,230,140,' + 0.5 * a + ')'); gl.addColorStop(1, 'rgba(255,255,230,' + 0.9 * a + ')');
          g.fillStyle = gl; for (const [f, al2] of [[1, 0.3], [0.62, 0.45], [0.3, 0.8]]) { g.globalAlpha = al2; g.fillRect(cx - bw * f, 0, bw * 2 * f, fy); }
          g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,240,' + 0.7 * a + ')'; g.fillRect(cx - bw * 0.1, 0, bw * 0.2, fy); ring(cx, fy, 40 * sc * (0.6 + q * 0.6), '#ffe48a', 5 * u, a); } break;
      case 'bloodrush': { const p = 0.5 + Math.sin(k * 18) * 0.5; const gl = g.createRadialGradient(cx, hy, 0, cx, hy, 60 * sc); gl.addColorStop(0, 'rgba(255,40,50,' + 0.4 * al * p + ')'); gl.addColorStop(1, 'rgba(255,0,20,0)'); g.globalAlpha = 1; g.fillStyle = gl; g.fillRect(cx - 60 * sc, hy - 60 * sc, 120 * sc, 120 * sc);
        for (let i = 0; i < 16; i++) { const q = (k * 1.2 + i / 16) % 1; g.globalAlpha = (1 - q) * al; g.fillStyle = i % 2 ? '#ff3a4a' : '#ff8a8a'; g.beginPath(); g.arc(cx + Math.sin(i * 2.9 + k * 4) * 26 * sc, fy - q * 70 * sc, (2 + (1 - q) * 3) * u, 0, 7); g.fill(); } break; }
      case 'vault': if (k > 0.72) { const q = cl01((k - 0.72) / 0.6); ring(cx, fy, q * 80 * sc, '#e8d8b0', 6 * u * (1 - q), al * (1 - q)); } break;
      case 'decoy': if (k > 0.2 && k < 1.2) { g.globalCompositeOperation = 'source-over'; for (let i = 0; i < 10; i++) { const q = cl01((k - 0.9) / 0.3); g.globalAlpha = 0.35 * (1 - q) * al; g.fillStyle = '#2a1840'; g.beginPath(); g.arc(cx - 20 * sc + Math.sin(i * 3.1) * 12 * sc, fy - (8 + i * 5) * sc, (5 + q * 10) * sc, 0, 7); g.fill(); } } break;
      case 'flurry': for (let i = 0; i < 5; i++) { const t0 = 0.1 + i * 0.12, q = cl01((k - t0) / 0.1); if (q <= 0) continue; const a = al * (1 - cl01((k - t0 - 0.15) / 0.3)); slash(cx + 18 * sc + (i % 2 ? 6 : -4) * sc, hy + ((i * 7) % 11 - 5) * sc, (i === 4 ? 52 : 34) * sc * q, [-0.6, 0.5, -0.2, 0.8, -0.9][i], i === 4 ? '#ffd27a' : '#ffffff', (i === 4 ? 8 : 5) * u, a); } break;
      case 'barrier': { const q = eio(cl01((k - 0.2) / 0.4)), r = 40 * sc * q, sh = 0.6 + Math.sin(k * 10) * 0.2;
        g.globalAlpha = al * 0.25 * q; g.fillStyle = '#9fd8ff'; g.beginPath(); g.ellipse(cx, fy - 22 * sc, r * 0.8, r, 0, 0, 7); g.fill();
        g.globalAlpha = al * sh * q; g.strokeStyle = '#d8f2ff'; g.lineWidth = 2.5 * u; g.beginPath(); g.ellipse(cx, fy - 22 * sc, r * 0.8, r, 0, 0, 7); g.stroke();
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + k; g.beginPath(); g.moveTo(cx, fy - 22 * sc - r); g.quadraticCurveTo(cx + Math.cos(a) * r * 0.8, fy - 22 * sc, cx + Math.cos(a) * r * 0.5, fy); g.globalAlpha = al * 0.25 * q; g.stroke(); } break; }
    }
    g.restore(); g.globalAlpha = 1;
  }
  UI.revealRender = function (dt) {
    if (!RV.on) return;
    const prevT = RV.t; RV.t += dt; const T = RV.t;
    const c = $('revealCv'), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'); if (BB.softGlow) BB.softGlow(g); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false;
    const rar = RV.h.rarity || 0, u = Math.min(w, h) / 600;
    // which colour step we are on (it climbs: silver → blue → purple → gold)
    const step = T < 1.4 ? -1 : Math.min(RV.steps - 1, Math.floor((T - 1.4) / 0.6));
    if (step > RV.step) { RV.step = step; RV.flash = Math.max(RV.flash, 0.35 + step * 0.1); RV.shake = 0.25 + step * 0.15; RV.rings.push({ t: 0, col: RCOL[step], big: false }); BB.sfx('chime');
      for (let i = 0; i <= step; i++) RV.bolts.push({ t: -i * 0.07, x: (Math.random() - 0.5) * 0.5, seed: Math.random() * 99, col: RCOL[step] }); if (step > 0) BB.sfx('slam'); }
    if (!RV.burst && T >= RV.tB) { RV.burst = true; RV.flash = 1; RV.shake = 0.6 + rar * 0.2; RV.rings.push({ t: 0, col: RCOL[rar], big: true }); BB.sfx('burst');
      for (let i = 0; i < 90 + rar * 40; i++) { const a = Math.random() * Math.PI * 2, v = (250 + Math.random() * 500) * u; RV.parts.push({ kind: 'out', x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120 * u, t: 0, life: 0.9 + Math.random() * 0.9, col: Math.random() < 0.7 ? RCOL[rar] : '#ffffff', r: (1.5 + Math.random() * 3) * u }); } }
    const col = step < 0 ? '#9aa6b8' : RCOL[step];
    // shake
    if (RV.shake > 0) { RV.shake = Math.max(0, RV.shake - dt * 1.4); g.translate((Math.random() - 0.5) * RV.shake * 26 * u, (Math.random() - 0.5) * RV.shake * 26 * u); }
    const txt = document.querySelector('#reveal .txt'), cardTop = txt ? txt.offsetTop * dpr : h * 0.7;
    const fy = Math.min(h * 0.62, cardTop - 46 * u), cx = w / 2, gh = Math.min(fy * 0.74, w * 0.3), gro = gh * 0.42, cy = (fy - gh + gro - gro * 0.7 + fy) / 2;
    const hx = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }, cc = hx(col), C = (a) => 'rgba(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ',' + a + ')';
    // the dark, tinted by the gate's colour
    const glow = T < 1.4 ? T / 1.4 * 0.25 : 0.35 + Math.min(0.3, step * 0.1);
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7); bg.addColorStop(0, col + Math.round(glow * 255).toString(16).padStart(2, '0')); bg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = bg; g.fillRect(-50, -50, w + 100, h + 100);
    { // rays turning behind the gate: a whisper while it gathers, blazing from the burst on
      const since = T - RV.tB, rayA = since < 0 ? 0.03 + 0.07 * Math.min(1, T / RV.tB) : Math.max(0.1, 0.34 - since * 0.07), R = Math.max(w, h) * 0.9;
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(cx, cy);
      for (let i = 0; i < 12; i++) { const a = T * 0.22 + i / 12 * Math.PI * 2, wd = 0.05 + 0.035 * Math.sin(i * 3.1 + 1); g.fillStyle = C((rayA * (0.55 + 0.45 * Math.sin(i * 5.3 + T * 1.7))).toFixed(3));
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - wd) * R, Math.sin(a - wd) * R); g.lineTo(Math.cos(a + wd) * R, Math.sin(a + wd) * R); g.closePath(); g.fill(); }
      g.restore();
      // the ground splits from the gate's foot as the power builds
      const grow = Math.min(1, T / Math.max(0.6, RV.tB)) * (since > 0 ? 1.25 : 1), hot = since > 0 ? Math.max(0.25, 1 - since * 0.5) : 0.35 + 0.4 * Math.min(1, T / RV.tB);
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = C(hot.toFixed(3)); g.shadowColor = col; g.shadowBlur = 10 * u; g.lineWidth = Math.max(1.5, 2.2 * u); g.lineCap = 'round';
      for (let i = 0; i < 9; i++) { const a = Math.PI * (0.06 + i / 8 * 0.88), len = (120 + ((i * 53) % 90)) * u * grow; let px = cx + (i - 4) * 9 * u, py = fy + 4 * u; g.beginPath(); g.moveTo(px, py);
        for (let q = 1; q <= 6; q++) { px += Math.cos(a) * len / 6 * 1.7 + Math.sin(i * 7 + q * 3.3) * 6 * u; py += Math.sin(a) * len / 6 * 0.3 + Math.cos(i * 5 + q * 2.1) * 2 * u; g.lineTo(px, py); } g.stroke(); }
      g.restore();
      // the beam: for a moment after the burst a column of light joins the gate to the sky
      if (since > 0 && since < 0.9) { const a = 1 - since / 0.9, bw = gh * (0.34 - since * 0.22); g.save(); g.globalCompositeOperation = 'lighter';
        const bm = g.createLinearGradient(cx - bw, 0, cx + bw, 0); bm.addColorStop(0, C(0)); bm.addColorStop(0.35, C((0.5 * a).toFixed(3))); bm.addColorStop(0.5, 'rgba(255,255,255,' + (0.85 * a).toFixed(3) + ')'); bm.addColorStop(0.65, C((0.5 * a).toFixed(3))); bm.addColorStop(1, C(0));
        g.fillStyle = bm; g.fillRect(cx - bw, -20, bw * 2, fy + 20); g.restore(); }
    }
    // gather: motes stream into the gate
    for (const p of RV.parts) if (p.kind === 'in') {
      const k = Math.max(0, Math.min(1, (T - p.delay) * p.sp)); if (k <= 0 || k >= 1) continue;
      const e = k * k, R = Math.max(w, h) * p.d * (1 - e), x = cx + Math.cos(p.a + e * 1.2) * R, y = cy + Math.sin(p.a + e * 1.2) * R * 0.75;
      const tail = 18 * u * (1 - e) + 4 * u;
      g.strokeStyle = col; g.globalAlpha = Math.sin(k * Math.PI); g.lineWidth = 2 * u; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(p.a) * tail, y + Math.sin(p.a) * tail * 0.75); g.stroke();
    }
    g.globalAlpha = 1;
    // the gate: its runes light as it gathers, the vortex spins up through the rarity colours and tears wide on the burst
    const pw = T < 1.4 ? 0.15 + T / 1.4 * 0.45 : RV.burst ? Math.max(1, 1.6 - (T - RV.tB) * 0.8) : 0.6 + step * 0.18;
    const back = cl01((T - RV.tG + 0.3) / 0.7); g.globalAlpha = 1 - back * 0.6;
    gateArch(g, { cx, base: fy, gh, C, t: T * (1 + step * 0.3), open: true, dpr, power: pw, runes: Math.min(1, T / Math.max(0.5, RV.tB - 0.3)) });
    g.globalAlpha = 1;
    // lightning: one bolt per colour the gate has climbed through
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const b of RV.bolts) { b.t += dt; if (b.t < 0 || b.t > 0.3) continue; const a = (1 - b.t / 0.3) * (Math.floor(b.t * 40) % 3 ? 1 : 0.4), bx = cx + b.x * gh;
      g.beginPath(); let px = bx + (b.x * 2.2) * gh, py = -10; g.moveTo(px, py); const ty = fy - gh * 0.98; for (let q = 1; q <= 9; q++) { px = bx + (b.x * 2.2) * gh * (1 - q / 9) + Math.sin(b.seed + q * 4.7 + Math.floor(b.t * 30)) * 16 * u * (q < 9 ? 1 : 0); py = -10 + (ty + 10) * q / 9; g.lineTo(px, py); }
      g.globalAlpha = a * 0.3; g.strokeStyle = b.col; g.lineWidth = 12 * u; g.stroke(); g.globalAlpha = a; g.strokeStyle = '#fff'; g.lineWidth = 3 * u; g.stroke(); }
    g.globalAlpha = 1;
    if (T > RV.tB) { // embers rising in the gate's colour from here on
      const since = T - RV.tB, n = 26 + rar * 10;
      for (let i = 0; i < n; i++) { const q = (since * (0.16 + (i % 5) * 0.035) + i * 0.137) % 1, ex = cx + Math.sin(i * 12.9) * w * 0.42 + Math.sin(since * 0.9 + i) * 14 * u, ey = h * (1.02 - q * 1.05), r = (1.2 + (i % 3)) * u;
        g.globalAlpha = Math.sin(q * Math.PI) * Math.min(1, since * 2) * 0.8; g.fillStyle = i % 4 ? RCOL[rar] : '#ffffff'; g.fillRect(ex - r, ey - r, r * 2, r * 2); }
      g.globalAlpha = 1;
    }
    g.restore();
    g.save(); g.globalCompositeOperation = 'lighter';
    // shockwave rings
    for (const r of RV.rings) { r.t += dt; const k = r.t / (r.big ? 1.1 : 0.7); if (k >= 1) continue; g.globalAlpha = 1 - k; g.strokeStyle = r.col; g.lineWidth = (r.big ? 10 : 5) * u * (1 - k); g.beginPath(); g.ellipse(cx, cy, k * (r.big ? 700 : 300) * u, k * (r.big ? 520 : 220) * u, 0, 0, 7); g.stroke(); }
    g.restore(); g.globalAlpha = 1;
    // the hero steps out: black against the light, then colour floods in
    if (T >= RV.tS) {
      const k = T - RV.tS, layers = BB.heroLayers(RV.h), key = layers[0].key;
      const ks = T - RV.tG, SP = ks >= 0 && ks < 1.6 && RV.sig ? sigPose(RV.sig, ks) : null;
      let clip = SP ? SP.clip : k < 1.3 ? (BB.hasClip(key, 'Taunt') ? 'Taunt' : 'Special1') : 'Idle';
      if (!BB.hasClip(key, clip)) clip = BB.hasClip(key, 'Special1') ? 'Special1' : 'Idle';
      const n = BB.clipLen(key, clip) || 15, fr = clip === 'Idle' ? Math.floor(T * 9) % n : SP ? (RV.sig === 'whirlwind' ? Math.floor(ks * 18) % n : Math.min(n - 1, Math.floor(ks * 13))) : Math.min(n - 1, Math.floor(k * 11));
      // the camera pushes in as the showcase begins: the hero fills the frame and the gate falls back
      const push = eio(cl01((T - RV.tG + 0.3) / 0.7)), sc = Math.max(2, Math.round(gh * 0.8 / 42)) * (1 + push * 0.3);
      if (SP && RV.sig && !RV.sigHit && ks >= SIG_HIT[RV.sig][0]) { RV.sigHit = true; BB.sfx(SIG_HIT[RV.sig][1]);
        if (/groundpound|meteor|vault|smite/.test(RV.sig)) { RV.shake = RV.sig === 'meteor' ? 0.9 : 0.6; RV.flash = RV.sig === 'smite' ? 0.6 : 0.35; }
        if (/groundpound|meteor|vault/.test(RV.sig)) for (let i = 0; i < 40; i++) { const a = Math.PI + Math.random() * Math.PI, v = (150 + Math.random() * 300) * u, ox2 = RV.sig === 'meteor' ? w * 0.22 : 0;
          RV.parts.push({ kind: 'out', x: ox2 + Math.cos(a) * 20 * u, y: fy - cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 180 * u, t: 0, life: 0.6 + Math.random() * 0.6, col: RV.sig === 'meteor' ? '#ffb060' : '#d8c6a0', r: (2 + Math.random() * 3) * u }); }
        if (/chainbolt|blinkstrike/.test(RV.sig)) RV.flash = 0.45; }
      // each hero arrives their own way
      const ent = RV.ent;
      let rise = Math.max(0, 1 - k * 3) * 40 * u, ox = 0, vis = Math.min(1, k * 3);
      if (ent === 'slam') { const q = cl01(k / 0.32); rise = -(1 - q) * (1 - q) * 520 * u; vis = 1; if (q >= 1 && !RV.landed) { RV.landed = true; RV.shake = 0.9; RV.flash = 0.5; RV.rings.push({ t: 0, col: '#ffd9a0', big: true }); BB.sfx('slam'); } }
      else if (ent === 'charge') { const q = cl01(k / 0.38); ox = -(1 - q) * (1 - q) * w * 0.7; rise = 0; vis = 1; if (q >= 1 && !RV.landed) { RV.landed = true; RV.shake = 0.4; BB.sfx('dodge'); } }
      else if (ent === 'holy') { const q = cl01(k / 0.9); rise = -(1 - q) * (1 - q) * 200 * u; vis = Math.min(1, k * 2); }
      else if (ent === 'shadow') { const q = cl01(k / 0.7); rise = (1 - q) * 70 * sc; vis = 1; }
      else if (ent === 'blink' || ent === 'lightning' || ent === 'flame' || ent === 'frost' || ent === 'leaves') { vis = k < 0.18 ? 0 : 1; rise = 0; if (k >= 0.18 && !RV.landed) { RV.landed = true; RV.flash = ent === 'lightning' ? 0.9 : 0.45; RV.shake = ent === 'lightning' ? 0.6 : 0.3; BB.sfx(ent === 'lightning' ? 'slam' : ent === 'flame' ? 'burst' : ent === 'frost' ? 'guard' : ent === 'blink' ? 'slash' : 'enchant'); } }
      else if (ent === 'stride') { const q = cl01(k / 1.0); rise = 0; vis = q; }
      if (SP) { ox += SP.dx * sc; rise += SP.dy * sc; vis *= SP.vis; }
      if (k > 0.3 && BB.drawGlow) { // their rarity burning at their feet
        const fa = Math.min(1, (k - 0.3) * 2); g.save(); g.globalCompositeOperation = 'lighter';
        BB.drawGlow(g, RCOL[rar], cx + ox, fy - 4 * sc, 46 * sc, 16 * sc, 0.5 * fa);
        for (let i = 0; i < 9; i++) { const q = (T * (0.7 + (i % 3) * 0.2) + i * 0.31) % 1, fx2 = cx + ox + Math.sin(i * 2.4 + T * 1.3) * 26 * sc; BB.drawGlow(g, i % 3 ? RCOL[rar] : '#ffffff', fx2, fy - q * 46 * sc, (7 - q * 5) * sc, (12 - q * 8) * sc, (1 - q) * 0.5 * fa); }
        g.restore();
      }
      g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.ellipse(cx, fy, 34 * sc * (SP && SP.dy < 0 ? 0.7 : 1), 10 * sc, 0, 0, 7); g.fill();
      if (SP && RV.sig === 'barrier') sigFx(g, RV.sig, ks, { cx, fy, sc, u, w, h });
      g.globalAlpha = vis;
      const reveal = Math.min(1, Math.max(0, (k - (ent === 'stride' ? 0.7 : 0.45)) / 0.7));
      g.save(); if (ent === 'shadow') { g.beginPath(); g.rect(0, 0, w, fy + 2 * sc); g.clip(); }
      if (reveal < 1) { const sv = sil(layers, clip, 2, fr); g.drawImage(sv, cx + ox - 64 * sc, fy - 90 * sc + rise, 128 * sc, 128 * sc); }
      if (reveal > 0) { g.globalAlpha = reveal * vis; BB.drawLayers(g, layers, clip, 2, fr, cx + ox, fy + rise, sc, { noSlash: true, flash: Math.max(0, 1 - reveal) * 0.8 }); }
      g.restore(); g.globalAlpha = 1;
      // and what comes with them
      g.save(); g.globalCompositeOperation = 'lighter'; const top = fy - 100 * sc;
      if (ent === 'lightning' && k < 0.5) { g.strokeStyle = 'rgba(210,235,255,' + (1 - k * 2) + ')'; g.lineWidth = 6 * u; g.shadowColor = '#9fdcff'; g.shadowBlur = 30 * u; g.beginPath(); let px = cx; g.moveTo(px, 0); for (let i = 1; i <= 12; i++) { px = cx + (i < 12 ? Math.sin(i * 9.1 + RV.h.name.length) * 40 * u : 0); g.lineTo(px, fy * i / 12); } g.stroke(); }
      if (ent === 'flame' && k < 1.2) { const a = Math.max(0, 1 - k / 1.2); const fg = g.createLinearGradient(0, top - 60 * u, 0, fy); fg.addColorStop(0, 'rgba(255,90,20,0)'); fg.addColorStop(0.6, 'rgba(255,120,30,' + 0.6 * a + ')'); fg.addColorStop(1, 'rgba(255,220,120,' + 0.9 * a + ')'); g.fillStyle = fg; g.fillRect(cx - 40 * sc, top - 60 * u, 80 * sc, fy - top + 60 * u);
        for (let i = 0; i < 18; i++) { const q = (T * 1.6 + i / 18) % 1; g.fillStyle = 'rgba(255,' + (140 + i * 5) + ',40,' + (1 - q) * a + ')'; g.beginPath(); g.arc(cx + Math.sin(i * 2.3 + T * 3) * 30 * sc, fy - q * 120 * sc, (3 + (1 - q) * 5) * u, 0, 7); g.fill(); } }
      if (ent === 'frost' && k < 0.9) { const a = k < 0.18 ? 1 : Math.max(0, 1 - (k - 0.18) / 0.5); g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(170,220,255,' + 0.45 * a + ')'; g.strokeStyle = 'rgba(230,248,255,' + a + ')'; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(cx - 34 * sc, fy); g.lineTo(cx - 38 * sc, top + 10 * sc); g.lineTo(cx, top - 6 * sc); g.lineTo(cx + 38 * sc, top + 10 * sc); g.lineTo(cx + 34 * sc, fy); g.closePath(); if (k < 0.18) { g.fill(); g.stroke(); }
        if (k >= 0.18) { for (let i = 0; i < 26; i++) { const an = i / 26 * 7, d = (k - 0.18) * 900 * u; g.fillStyle = 'rgba(220,245,255,' + a + ')'; g.fillRect(cx + Math.cos(an) * d, fy - 50 * sc + Math.sin(an) * d * 0.7, 6 * u, 6 * u); } } }
      if (ent === 'leaves' && k < 1.4) { const a = Math.max(0, 1 - k / 1.4); for (let i = 0; i < 40; i++) { const an = i / 40 * 7 + T * 5, r = (40 + (i % 5) * 12) * sc * (0.4 + a * 0.6); g.fillStyle = i % 3 ? 'rgba(140,220,90,' + a + ')' : 'rgba(230,200,90,' + a + ')'; g.beginPath(); g.ellipse(cx + Math.cos(an) * r, fy - 45 * sc + Math.sin(an) * r * 0.45 - (1 - a) * 60 * u, 6 * u, 3 * u, an, 0, 7); g.fill(); } }
      if (ent === 'blink' && k < 0.6) { const a = Math.max(0, 1 - k / 0.6); g.strokeStyle = 'rgba(160,220,255,' + a + ')'; g.lineWidth = 10 * u * a; g.beginPath(); g.moveTo(cx - 260 * u, fy - 140 * sc * 0.4); g.lineTo(cx + 260 * u, fy - 20 * sc); g.stroke(); for (let i = 1; i <= 3; i++) { g.globalAlpha = a * 0.3 / i; const sv = sil(layers, clip, 2, fr); g.drawImage(sv, cx - 64 * sc - i * 40 * u, fy - 90 * sc, 128 * sc, 128 * sc); } g.globalAlpha = 1; }
      if (ent === 'charge' && k < 0.5) { const a = Math.max(0, 1 - k / 0.5); g.strokeStyle = 'rgba(255,255,255,' + 0.5 * a + ')'; g.lineWidth = 3 * u; for (let i = 0; i < 9; i++) { const yy = fy - (10 + i * 12) * sc * 0.9; g.beginPath(); g.moveTo(cx + ox - 30 * sc, yy); g.lineTo(cx + ox - (120 + i * 30) * sc, yy); g.stroke(); } }
      if (ent === 'shadow' && k < 1.0) { g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(20,0,30,' + 0.7 * Math.max(0, 1 - k) + ')'; g.beginPath(); g.ellipse(cx, fy, 60 * sc, 16 * sc, 0, 0, 7); g.fill(); }
      if (ent === 'stride') { g.globalCompositeOperation = 'source-over'; for (let i = 0; i < 12; i++) { const q = (T * 0.25 + i / 12) % 1; g.fillStyle = 'rgba(70,64,72,' + 0.35 * (1 - q) * Math.max(0, 1 - k / 2.4) + ')'; g.beginPath(); g.arc(cx + (i - 6) * 26 * sc * 0.4, fy - q * 70 * sc, (16 + q * 30) * sc * 0.5, 0, 7); g.fill(); }
}
      if (ent === 'slam' && RV.landed && k < 1.0) { g.globalCompositeOperation = 'source-over'; for (let i = 0; i < 16; i++) { const an = Math.PI + i / 15 * Math.PI, d = (k - 0.32) * 500 * u, yy = fy + Math.sin(an) * d * 0.25 - Math.sin((k - 0.32) * 4) * 40 * u * (i % 3 + 1); g.fillStyle = 'rgba(60,50,40,' + Math.max(0, 1 - k) + ')'; g.fillRect(cx + Math.cos(an) * d, yy, 7 * u, 5 * u); } }
      g.restore();
      if (SP && RV.sig !== 'barrier') sigFx(g, RV.sig, ks, { cx: cx + ox, fy, sc, u, w, h });
      // the signature's name, slammed in as it plays
      if (ks > 0.05 && ks < 2.2 && RV.sig) { const q = cl01((ks - 0.05) / 0.2), a = Math.min(q, cl01((2.2 - ks) / 0.4)); g.save(); g.globalAlpha = a; g.font = '700 ' + Math.round(26 * u * (1 + (1 - q) * 0.6)) + 'px Cinzel, Outfit, serif'; g.textAlign = 'center'; g.letterSpacing = Math.round(6 * u) + 'px';
        g.fillStyle = '#ffe7a3'; g.shadowColor = 'rgba(0,0,0,0.95)'; g.shadowBlur = 14 * u; g.fillText(BB.SIGNATURES[RV.sig].name.toUpperCase(), cx, Math.max(40 * u, fy - 112 * sc)); g.restore(); }
      // the entrance's name under the hero
      if (k > 0.35 && k < 1.5) { g.save(); g.globalAlpha = Math.min(1, (k - 0.35) * 3) * Math.min(1, (1.5 - k) * 3); g.font = '700 ' + Math.round(14 * u) + 'px Outfit, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffe7a3'; g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 8; g.fillText((BB.ENTRANCES[ent] ? BB.ENTRANCES[ent].name : '').toUpperCase(), cx, fy + 26 * u); g.restore(); }
      // rim light on the silhouette
      if (reveal < 1) { g.save(); g.globalCompositeOperation = 'lighter'; const rl = g.createRadialGradient(cx, fy - 45 * sc, 0, cx, fy - 45 * sc, 60 * sc); rl.addColorStop(0, col + '55'); rl.addColorStop(1, col + '00'); g.fillStyle = rl; g.fillRect(cx - 70 * sc, fy - 110 * sc, 140 * sc, 120 * sc); g.restore(); }
    }
    // burst sparks
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of RV.parts) if (p.kind === 'out') { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * u * dt; p.vx *= 0.985; const a = Math.max(0, 1 - p.t / p.life); if (a <= 0) continue; g.globalAlpha = a; g.fillStyle = p.col; g.beginPath(); g.arc(cx + p.x, cy + p.y, p.r, 0, 7); g.fill(); }
    g.restore(); g.globalAlpha = 1;
    // stars pop in one by one under the name
    if (T >= RV.tC) {
      const want = Math.min(RV.h.stars || 1, Math.floor((T - RV.tC) / 0.22) + 1);
      if (want > RV.stars) { RV.stars = want; BB.sfx('coin'); }
      const sy = cardTop - 16 * u, sp = 30 * u;
      for (let i = 0; i < (RV.h.stars || 1); i++) {
        const k = Math.min(1, (T - RV.tC - i * 0.22) / 0.25); if (k <= 0) continue;
        const sx = cx + (i - ((RV.h.stars || 1) - 1) / 2) * sp, r = 11 * u * (k < 1 ? 1 + (1 - k) * 1.2 : 1);
        g.save(); g.shadowColor = RCOL[rar]; g.shadowBlur = 14 * u; g.fillStyle = '#ffd36b'; g.beginPath();
        for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, q = j % 2 ? r * 0.45 : r; g.lineTo(sx + Math.cos(a) * q, sy + Math.sin(a) * q); }
        g.closePath(); g.fill(); g.restore();
      }
      $('reveal').classList.add('done');
    }
    if (!RV.pip && T >= RV.tS + 0.9 && BB.Preview) { RV.pip = true; $('reveal').classList.add('pip'); BB.Preview.start(RV.h, $('pipCv'), $('pipCap')); }
    if (BB.Preview && BB.Preview.on) BB.Preview.render(dt);
    // white flashes
    if (RV.flash > 0) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(255,255,255,' + Math.min(1, RV.flash) * 0.85 + ')'; g.fillRect(0, 0, w, h); RV.flash = Math.max(0, RV.flash - dt * 2.2); }
    void prevT;
  };

  // ---------------------------------------------------------------- team: an open field; heroes are placed anywhere on it by dragging
  const T = UI.tm = { sel: null, stage: null, t: 0, drag: null, marks: [] };
  UI.openTeam = function (stageIdx) {
    T.stage = stageIdx === undefined ? null : stageIdx; T.sel = null; T.drag = null; BB.fixFormation(BB.save);
    UI.renderTeam(); UI.show('team'); $('tabbar').style.display = T.stage !== null ? 'none' : ''; $('team').classList.toggle('pre', T.stage !== null);
    if (BB.openDrill) BB.openDrill(T.stage);
  };
  // the part of the board heroes can stand on, in fractions of it: u runs left (rear) to right (the enemy), v top to bottom
  const ZONE = { x0: 0.1, x1: 0.76, y0: 0.24, y1: 0.84 };
  const zx = (u) => ZONE.x0 + u * (ZONE.x1 - ZONE.x0), zy = (v) => ZONE.y0 + v * (ZONE.y1 - ZONE.y0);
  const DUMMIES = [{ fx: 0.88, fy: 0.34 }, { fx: 0.92, fy: 0.66 }];
  const CAMP = { fire: { fx: 0.045, fy: 0.6 }, banner: { fx: 0.03, fy: 0.3 } }; // the team's fire and banner, behind the rear line
  const CLEAR = []; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 5; j++) CLEAR.push({ fx: zx(i / 6), fy: zy(j / 5) });
  const teamPlaces = (S) => BB.teamIds(S).map((id) => { const p = BB.placeOf(S, id); return { id, u: p.u, v: p.v, fx: zx(p.u), fy: zy(p.v) }; });
  // the living field: the main scene's camera frames the board and each hero's place is a point on its ground
  UI.teamLayout = function (scene, W, H, dpr) {
    const c = $('boardCv'); if (!c) return; const rc = c.getBoundingClientRect(); if (!rc.width) return;
    const board = { x: rc.left * dpr, y: rc.top * dpr, w: rc.width * dpr, h: rc.height * dpr };
    scene.drill.dragId = T.drag && T.drag.moved ? T.drag.id : null;
    scene.drillLayout(board, W, H, dpr, teamPlaces(BB.save), DUMMIES, CLEAR, CAMP);
    scene.drillSync(BB.save);
  };
  const liveScene = () => { const s = BB.liveScene && BB.liveScene(); return s && s.drill && s.drill.spots ? s : null; };
  UI.teamRender = function (dt) {
    const c = $('boardCv'); if (!c || !BB.save) return;
    const S = BB.save, dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    T.t += dt;
    const scene = liveScene(), live = !!scene;
    $('team').classList.toggle('live', live);
    if (live) g.clearRect(0, 0, w, h);
    else { const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#121722'); bg.addColorStop(1, '#0b0e15'); g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    // a soft shade at the top so the labels read over the ground; the line that splits rear from front
    const sh = g.createLinearGradient(0, 0, 0, 56 * dpr); sh.addColorStop(0, 'rgba(6,8,12,0.6)'); sh.addColorStop(1, 'rgba(6,8,12,0)'); g.fillStyle = sh; g.fillRect(0, 0, w, 56 * dpr);
    const mid = zx(0.5) * w, dragging = T.drag && T.drag.moved;
    g.strokeStyle = 'rgba(255,255,255,' + (dragging ? 0.4 : 0.16) + ')'; g.lineWidth = 1 * dpr; g.setLineDash([5 * dpr, 7 * dpr]);
    g.beginPath(); g.moveTo(mid, zy(-0.12) * h); g.lineTo(mid, zy(1.08) * h); g.stroke(); g.setLineDash([]);
    if (dragging) { // the edge of the field shows while a hero is being moved
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.setLineDash([3 * dpr, 6 * dpr]); g.strokeRect(zx(0) * w - 26 * dpr, zy(0) * h - 30 * dpr, (zx(1) - zx(0)) * w + 52 * dpr, (zy(1) - zy(0)) * h + 48 * dpr); g.setLineDash([]);
    }
    g.font = '600 ' + Math.round(11 * dpr) + 'px Outfit, sans-serif'; g.textAlign = 'center';
    const tl = (txt, x, col) => { g.save(); g.letterSpacing = (2 * dpr) + 'px'; g.fillStyle = col; g.fillText(txt, x, 24 * dpr); g.restore(); };
    tl('REAR', (zx(0) + zx(0.5)) / 2 * w, 'rgba(235,240,248,0.8)'); tl('FRONT LINE', (zx(0.5) + zx(1)) / 2 * w, 'rgba(235,240,248,0.8)');
    g.textAlign = 'right'; tl('ENEMY  →', w - 16 * dpr, 'rgba(255,130,120,0.9)'); g.textAlign = 'center';
    const sc = Math.max(1, Math.round(h / (250 * dpr))) * dpr, rw = Math.min(w * 0.07, 30 * sc);
    const rc = c.getBoundingClientRect();
    T.marks = teamPlaces(S).map((p) => {
      const m = { id: p.id, x: p.fx * w, y: p.fy * h, r: rw, hx: p.fx * w, hy: p.fy * h };
      if (scene) { const q = scene.drillScreen(p.id); if (q) { m.hx = q.x - rc.left * dpr; m.hy = q.y - rc.top * dpr; } } // where the hero really is right now
      return m;
    }).sort((a, b) => a.y - b.y);
    for (const m of T.marks) {
      const hero = S.heroes.find((x) => x.id === m.id); if (!hero) continue;
      const held = T.drag && T.drag.id === m.id && T.drag.moved, sel = T.sel === m.id;
      const col = UI.rgba[hero.rarity || 0];
      // nothing is left on the ground where a hero stands: a ring shows only under the one being carried or chosen
      if (held || sel || !live) {
        const gl = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, rw * 1.2);
        gl.addColorStop(0, col.replace('A', held ? '0.4' : '0.22')); gl.addColorStop(1, col.replace('A', '0'));
        g.fillStyle = gl; g.beginPath(); g.ellipse(m.x, m.y, rw * 1.2, rw * 0.44, 0, 0, 7); g.fill();
        if (held || !live) { g.lineWidth = (held ? 2.2 : 1.5) * dpr; g.strokeStyle = col.replace('A', held ? '1' : '0.9'); g.beginPath(); g.ellipse(m.x, m.y, rw, rw * 0.36, 0, 0, 7); g.stroke(); }
        if (sel && !held) { g.strokeStyle = 'rgba(255,190,85,' + (0.55 + Math.sin(T.t * 6) * 0.4) + ')'; g.lineWidth = 2 * dpr; g.setLineDash([6 * dpr, 5 * dpr]); g.lineDashOffset = -T.t * 20 * dpr; g.beginPath(); g.ellipse(m.x, m.y, rw * 1.1, rw * 0.42, 0, 0, 7); g.stroke(); g.setLineDash([]); }
      }
      if (!live) { const layers = BB.heroLayers(hero), n = BB.clipLen(layers[0].key, 'Idle') || 15;
        BB.drawHeroDressed(g, hero, BB.auraOf(hero), 'Idle', 1, Math.floor(T.t * 9) % n, m.x, m.y + rw * 0.05, sc, T.t, { noSlash: true, layers }); }
      // the name goes with the hero, wherever on the field they are
      const nx = live ? m.hx : m.x, ny = (live ? m.hy : m.y) + 13 * dpr;
      g.save(); g.textAlign = 'center'; g.font = '600 ' + Math.round(11 * dpr) + 'px Outfit, sans-serif';
      g.lineWidth = 3 * dpr; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.strokeText(BB.shortName(hero), nx, ny); g.fillStyle = sel || held ? '#ffe7a3' : col.replace('A', '1'); g.fillText(BB.shortName(hero), nx, ny);
      g.restore();
      if (sel && !held) { // the chosen hero can be sent back to the roster
        const bw = 84 * dpr, bh = 24 * dpr, bx = Math.max(4 * dpr, Math.min(w - bw - 4 * dpr, m.x - bw / 2)), by = Math.max(30 * dpr, m.y - rw * 2.9 - bh);
        m.out = { x: bx, y: by, w: bw, h: bh };
        g.fillStyle = 'rgba(14,16,24,0.92)'; g.beginPath(); g.roundRect ? g.roundRect(bx, by, bw, bh, bh / 2) : g.rect(bx, by, bw, bh); g.fill();
        g.strokeStyle = 'rgba(255,120,110,0.8)'; g.lineWidth = 1.2 * dpr; g.stroke();
        g.font = '700 ' + Math.round(11 * dpr) + 'px Outfit, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffb0a6'; g.fillText('✕  TAKE OUT', bx + bw / 2, by + bh * 0.68);
      }
    }
  };
  // ---- picking heroes up: press one (the hero, or the ring at their place), drag anywhere on the field, let go
  const boardPt = (ev) => { const c = $('boardCv'), rc = c.getBoundingClientRect(), d = c.width / rc.width; return { x: (ev.clientX - rc.left) * d, y: (ev.clientY - rc.top) * d, d, w: c.width, h: c.height }; };
  const markAt = (p) => {
    let best = null, bd = 1e9;
    for (const m of T.marks) for (const [x, y] of [[m.hx, m.hy], [m.x, m.y]]) {
      const dx = Math.abs(p.x - x), top = y - m.r * 2.8, bot = y + m.r * 0.9;
      if (dx > m.r * 1.15 || p.y < top || p.y > bot) continue;
      const q = dx + Math.abs(p.y - (y - m.r * 0.7)) * 0.5; if (q < bd) { bd = q; best = m; }
    }
    return best;
  };
  UI.boardDown = function (ev) {
    const p = boardPt(ev), S = BB.save;
    BB.audioUnlock();
    const selM = T.marks.find((m) => m.id === T.sel && m.out);
    if (selM && p.x >= selM.out.x && p.x <= selM.out.x + selM.out.w && p.y >= selM.out.y && p.y <= selM.out.y + selM.out.h) { // TAKE OUT
      BB.removeHero(S, T.sel); T.sel = null; BB.sfx('click'); BB.persist(); UI.renderTeam(); UI.refreshTop(); return;
    }
    const m = markAt(p);
    if (!m) { if (T.sel) { T.sel = null; UI.renderTeam(); } return; }
    T.drag = { id: m.id, sx: p.x, sy: p.y, moved: false, ox: m.x - p.x, oy: m.y - p.y, grabHero: Math.hypot(p.x - m.hx, p.y - m.hy) < Math.hypot(p.x - m.x, p.y - m.y) };
    try { $('boardCv').setPointerCapture(ev.pointerId); } catch (e) { /* not a real pointer */ }
  };
  UI.boardMove = function (ev) {
    const D = T.drag; if (!D) return;
    const p = boardPt(ev), S = BB.save;
    if (!D.moved) { if (Math.hypot(p.x - D.sx, p.y - D.sy) < 7 * p.d) return; D.moved = true; T.sel = null; if (D.grabHero) { D.ox = 0; D.oy = 10 * p.d; } BB.sfx('click'); }
    const u = ((p.x + D.ox) / p.w - ZONE.x0) / (ZONE.x1 - ZONE.x0), v = ((p.y + D.oy) / p.h - ZONE.y0) / (ZONE.y1 - ZONE.y0);
    BB.setPlace(S, D.id, u, v);
  };
  UI.boardUp = function () {
    const D = T.drag; if (!D) return; T.drag = null;
    if (D.moved) { BB.sfx('guard'); BB.persist(); } else { T.sel = T.sel === D.id ? null : D.id; BB.sfx('click'); }
    UI.renderTeam(); UI.refreshTop();
  };
  UI.boardClick = UI.boardDown;
  (function () { const c = $('boardCv'); if (!c) return; c.addEventListener('pointermove', (e) => UI.boardMove(e)); c.addEventListener('pointerup', () => UI.boardUp()); c.addEventListener('pointercancel', () => UI.boardUp()); })();
  UI.renderTeam = function () {
    const S = BB.save, ids = BB.teamIds(S);
    $('boardHint').textContent = !ids.length ? 'Tap a hero in the roster to bring them onto the field' : T.sel ? 'Drag to move them · or take them out' : 'Drag heroes anywhere · right of the line they fight in front';
    const top = $('teamTop'); top.innerHTML = '';
    const team = BB.teamHeroes(S), tp = BB.teamPower(team);
    const bonds = BB.bondsFor(team.map((h) => h.calling));
    if (T.stage !== null) {
      const st = BB.MISSIONS[T.stage], rp = BB.recPower(st);
      top.appendChild(el('div', 'code', 'STAGE ' + st.code));
      top.appendChild(el('div', 'bigname', esc(st.name)));
      top.appendChild(el('div', 'powcmp', '<div class="' + (tp >= rp ? 'ok' : 'lo') + '"><span class="lbl">Team</span><b>⚔ ' + fmt(tp) + '</b></div><div><span class="lbl">Recommended</span><b>⚔ ' + fmt(rp) + '</b></div>'));
      const vs = el('div', 'vs'); vs.appendChild(el('span', 'lbl', 'Foes')); vs.appendChild(UI.foeIcons(st, 40)); top.appendChild(vs);
    } else top.appendChild(el('div', 'power', '<span class="ico pow">⚔</span><b>' + fmt(tp) + '</b><span class="mute">' + team.length + ' / 5 heroes</span>'));
    if (bonds.length) top.appendChild(el('div', 'bondrow', bonds.map((b) => '<span class="bond" title="' + esc(b.desc) + '">✦ ' + b.name + '</span>').join('')));
    if (BB.teamBalance) { // the team at a glance: one chip per class, and what it is missing
      const bal = BB.teamBalance(team), chips = Object.keys(BB.CLASSES).filter((k) => bal.counts[k]).map((k) => { const n = bal.counts[k] || 0; return '<span class="cls' + (n ? ' on' : '') + '" style="--cc:' + BB.CLASSES[k].col + '" title="' + esc(BB.CLASSES[k].job) + '">' + BB.CLASSES[k].name + (n > 1 ? ' ×' + n : '') + '</span>'; }).join('');
      top.appendChild(el('div', 'clsrow', chips + (team.length ? '<span class="clstip' + (bal.balanced ? ' good' : '') + '">' + (bal.balanced ? '✓ Balanced team' : esc(bal.tips[0] || '')) + '</span>' : '')));
    }
    const row = el('div', 'row');
    const af = el('button', 'btn dark sm', UI.si('bolt', 14) + ' Auto-fill'); af.title = 'The strongest five: fighters in front, the rest behind';
    click(af, () => { BB.autoFill(S); T.sel = null; BB.persist(); UI.renderTeam(); UI.refreshTop(); });
    row.appendChild(af);
    if (T.stage !== null) {
      const back = el('button', 'btn dark sm', BB.dev ? '‹ Development' : '‹ Map'); click(back, () => (BB.dev ? BB.goCamp() : UI.openCampaign(T.stage))); row.appendChild(back);
      row.appendChild(el('div', 'grow'));
      const go = el('button', 'btn xl', 'Fight ▸'); go.disabled = !team.length; click(go, () => BB.deploy(T.stage)); row.appendChild(go);
    }
    top.appendChild(row);
    const ro = $('teamRoster'); ro.innerHTML = '';
    for (const h of sortHeroes(S.heroes)) {
      const inT = ids.includes(h.id);
      ro.appendChild(UI.heroCard(h, { inteam: inT, onClick: () => {
        if (inT) BB.removeHero(S, h.id);
        else if (!BB.placeHero(S, h.id)) { UI.toast('Five heroes at most. Take one out to make room.'); return; }
        T.sel = null; BB.persist(); UI.renderTeam(); UI.refreshTop();
      } }));
    }
  };

  // ---------------------------------------------------------------- shop
  let shopBlade = null;
  UI.renderShop = function () {
    const S = BB.save, box = $('offers'); box.innerHTML = '';
    const d = new Date(), mid = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1), left = mid - now();
    const sell = $('bSellGear'); sell.style.display = S.inventory.length ? '' : 'none'; sell.textContent = 'Sell spare gear · ' + S.inventory.length;
    $('shopReset').textContent = 'Restocks in ' + Math.floor(left / 3600000) + 'h ' + Math.floor(left / 60000) % 60 + 'm';
    // each offer is a relic on the table: its own light, and the thing itself rather than a glyph
    const col = { free: '#5cb8ff', chest: '#ffb648', sigils: '#b57cff', crystals: '#63d6ff', arms: '#ff7a4d' };
    const gem = '<span class="gem"></span>';
    const art = {
      free: () => gem,
      crystals: () => '<span class="gems">' + gem + gem + gem + '</span>',
      sigils: () => '<svg viewBox="0 0 24 24"><path d="M12 2l2.6 6.6L21 11l-6.4 2.4L12 20l-2.6-6.6L3 11l6.4-2.4z"/><circle cx="12" cy="11" r="1.6"/></svg>',
      arms: () => UI.itemIcon(shopBlade || (shopBlade = Object.assign(BB.makeItem(BB.rng(7), 'weapon', 1, 3, 'sword'), { ench: 'fire' })), 68),
      chest: () => { const c = document.createElement('canvas'); c.width = c.height = 68; const E = BB.A.env && BB.A.env.ground; const r = E && E.meta.f['Chest B1_S']; if (r) { const g = c.getContext('2d'), k = 60 / Math.max(r[2], r[3]); g.imageSmoothingEnabled = false; g.drawImage(E.img, r[0], r[1], r[2], r[3], (68 - r[2] * k) / 2, (68 - r[3] * k) / 2, r[2] * k, r[3] * k); } else if (!E) BB.loadEnv('ground').then(() => UI.current === 'shop' && UI.renderShop()).catch(() => null); return c; },
    };
    for (const o of BB.SHOP) {
      const left = BB.shopLeft(S, o, now());
      const c = el('div', 'offer frame' + (left > 0 ? '' : ' sold')); c.style.setProperty('--oc', col[o.id] || '#ffbe55');
      const a = el('div', 'art'), pic = (art[o.id] || art.free)(); if (typeof pic === 'string') a.innerHTML = pic; else a.appendChild(pic);
      c.appendChild(a);
      c.appendChild(el('h3', '', o.name)); c.appendChild(el('p', '', o.desc));
      c.appendChild(el('div', 'left', left > 0 ? left + ' left today' : 'Sold out · back tomorrow'));
      const b = el('button', 'btn sm', !o.cost ? 'Claim' : o.cost.crystals ? '◆ ' + fmt(o.cost.crystals) : '● ' + fmt(o.cost.gold)); b.disabled = left <= 0 || (o.cost && (S.gold < (o.cost.gold || 0) || S.crystals < (o.cost.crystals || 0)));
      click(b, () => {
        const got = BB.buy(S, o.id, now()); if (!got) return;
        BB.sfx('coin'); BB.persist(); UI.renderShop(); UI.refreshTop();
        UI.toast(got.item ? 'Got ' + got.item.name + ' (' + BB.RARITY[got.item.rarity].name + ')' : got.crystals ? '+' + got.crystals + ' crystals' : '+' + got.sigils + ' sigils');
      });
      c.appendChild(b);
      box.appendChild(c);
    }
  };

  // the quartermaster buys what nobody carries: one piece at a time, or every plain Common piece at once
  UI.openSell = function () {
    const S = BB.save, body = $('pickBody'); body.innerHTML = '';
    const again = () => { BB.sfx('coin'); BB.persist(); UI.refreshTop(); UI.renderShop(); if (S.inventory.length) UI.openSell(); else UI.modal('mPick', false); };
    body.appendChild(el('h3', 'gold', 'Sell spare gear'));
    body.appendChild(el('div', 'mute', '<span style="font-size:13px">Only what is in the bag. Gear your heroes carry is never listed.</span>'));
    const list = el('div', 'pick scroll');
    for (const it of S.inventory.slice().sort((a, b) => a.rarity - b.rarity || BB.itemScore(a) - BB.itemScore(b))) {
      const row = el('div', 'prow');
      const ic = el('div', 'it'); ic.style.setProperty('--ic', BB.RARITY[it.rarity].color); ic.appendChild(UI.itemIcon(it, 40)); row.appendChild(ic);
      row.appendChild(el('div', 'grow', '<b style="color:' + BB.RARITY[it.rarity].color + '">' + esc(it.name) + (it.plus ? ' +' + it.plus : '') + '</b><small>' + BB.RARITY[it.rarity].name + ' ' + BB.SLOT_NAME[it.slot] + ' · ' + UI.statLine(BB.itemStats(it)) + '</small>'));
      const b = el('button', 'btn dark sm', '● ' + fmt(BB.salvageValue(it)));
      click(b, () => { S.inventory.splice(S.inventory.indexOf(it), 1); S.gold += BB.salvageValue(it); again(); });
      row.appendChild(b); list.appendChild(row);
    }
    body.appendChild(list);
    const row = el('div', 'row'); row.style.justifyContent = 'flex-end';
    const plain = S.inventory.filter((it) => it.rarity === 0);
    if (plain.length > 1) {
      const worth = plain.reduce((a, it) => a + BB.salvageValue(it), 0);
      const all = el('button', 'btn dark sm', 'Sell all Common · ● ' + fmt(worth)); all.id = 'bSellCommon';
      click(all, () => { S.inventory = S.inventory.filter((it) => it.rarity !== 0); S.gold += worth; again(); });
      row.appendChild(all);
    }
    const x = el('button', 'btn sm', 'Close'); click(x, () => UI.modal('mPick', false)); row.appendChild(x);
    body.appendChild(row);
    UI.modal('mPick');
  };
  click($('bSellGear'), () => UI.openSell());

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
      else row.appendChild(el('span', 'qst', st === 'claimed' ? UI.si('check', 16) : '—'));
      list.appendChild(row);
    }
    body.appendChild(list);
    const row = el('div', 'row'); row.style.justifyContent = 'flex-end';
    const x = el('button', 'btn sm', 'Close'); click(x, () => UI.modal('mPick', false)); row.appendChild(x);
    body.appendChild(row);
    UI.modal('mPick');
  };

  // ---------------------------------------------------------------- tabs
  UI.rerender = function () {
    clearTimeout(UI._rr); UI._rr = setTimeout(() => {
      const c = UI.current;
      if (c === 'heroes') UI.renderHeroes(); else if (c === 'team') UI.renderTeam(); else if (c === 'hero') UI.renderHero();
    }, 60);
  };
  UI.go = function (tab) {
    if (tab === 'home') { BB.goCamp(); return; }
    if (tab === 'heroes') UI.renderHeroes();
    if (tab === 'team') { UI.openTeam(); return; }
    if (tab === 'shop') UI.renderShop();
    UI.show(tab);
  };
  document.querySelectorAll('.tab').forEach((t) => click(t, () => UI.go(t.dataset.tab)));

  // ---------------------------------------------------------------- results
  UI.results = function (res, actions) {
    const body = $('resBody'); body.innerHTML = '';
    body.appendChild(el('div', 'res-h ' + (res.win ? 'win' : 'lose'), '<h2>' + (res.win ? 'Victory' : 'Defeat') + '</h2><div class="mute">Stage ' + res.code + ' · ' + esc(res.title) + '</div>'));
    if (!res.win) body.appendChild(el('div', 'mute', '<div style="text-align:center;font-size:14px">Nothing is lost, and every hero still learned from it. Change your gear, try another formation, and fight again.</div>'));
    const hs = el('div', 'res-heroes');
    for (const h of res.heroes) {
      const c = UI.heroCard(h, { tag: 'div' }); if (res.mvp === h) c.appendChild(el('div', 'mvp', 'MVP'));
      const x = res.xp && res.xp.find((q) => q.hero === h);
      if (x) {
        const capped = h.level >= BB.levelCap(h), fr = capped ? 1 : Math.min(1, (h.xp || 0) / BB.xpNeed(h));
        const xb = el('div', 'xpb' + (x.levels ? ' up' : ''), (x.levels ? '<b>LEVEL ' + h.level + '</b>' : '<span>+' + x.xp + ' xp</span>') + '<i><s style="width:0%"></s></i>');
        const w = el('div', 'res-hero'); w.appendChild(c); w.appendChild(xb); hs.appendChild(w);
        setTimeout(() => { const s = xb.querySelector('s'); if (s) s.style.width = (fr * 100) + '%'; }, 250);
      } else hs.appendChild(c);
    }
    body.appendChild(hs);
    const rw = el('div', 'res-rw');
    if (res.gold) rw.appendChild(el('span', 'rw', '<span class="ico gold" style="width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center">●</span>+' + fmt(res.gold)));
    if (res.crystals) rw.appendChild(el('span', 'rw', '<span class="ico crys" style="width:24px;height:24px;display:inline-block"></span>+' + res.crystals));
    if (res.sigils) rw.appendChild(el('span', 'rw', '<span class="ico sig" style="width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center">✧</span>+' + res.sigils));
    if (res.kills) rw.appendChild(el('span', 'rw mute', UI.si('skull', 15) + ' ' + res.kills));
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
