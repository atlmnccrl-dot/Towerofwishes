// Bannerborn — every menu screen: shell, camp, campaign, heroes, hero, recruit, team, forge, shop, results.
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
    UI.current = id; document.body.dataset.screen = id;
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
    C.ch = BB.MISSIONS[C.sel].chapter;
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
  // the chapter map: painted ground, a road between the stages, the region's trees, rocks and ruins
  const mapCache = {};
  const ROADS = { 1: [0.5, 0.26, 2.2], 2: [0.55, 0.3, 1.6], 3: [0.48, 0.28, 2.6], 4: [0.5, 0.24, 1.9] };
  function chapterNodes(ch, w, h) {
    const ms = BB.MISSIONS.map((m, i) => [m, i]).filter(([m]) => m.chapter === ch.id), R = ROADS[ch.id];
    return ms.map(([m, i], k) => { const u = (k + 0.5) / ms.length; return { i, m, x: (0.07 + u * 0.86) * w, y: h * (R[0] + Math.sin(u * Math.PI * R[2] + 0.6) * R[1]) }; });
  }
  function chapterBackdrop(ch, w, h, dpr) {
    const key = ch.id + '|' + w + 'x' + h;
    if (mapCache[key]) return mapCache[key];
    const biome = ch.biome || 'vale';
    if (!BB.A.env[biome]) { BB.loadEnv(biome).then(() => { for (const k in mapCache) if (k.startsWith(ch.id + '|')) delete mapCache[k]; }); }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const tone = { 1: ['#4a6a2e', '#2a3e1a', '#1a2810'], 2: ['#c8a36a', '#9a7a48', '#5e4526'], 3: ['#5a5a54', '#3a3a36', '#222220'], 4: ['#3e3050', '#261c36', '#130d1c'] }[ch.id];
    const bg = g.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    bg.addColorStop(0, tone[0]); bg.addColorStop(0.6, tone[1]); bg.addColorStop(1, tone[2]); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const r = BB.rng(ch.id * 77);
    for (let i = 0; i < 260; i++) { // grass and grit
      g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,' + r.range(0.015, 0.05) + ')' : 'rgba(0,0,0,' + r.range(0.03, 0.09) + ')';
      const x = r() * w, y = r() * h, s = r.range(3, 16) * dpr; g.beginPath(); g.ellipse(x, y, s, s * 0.5, 0, 0, 7); g.fill();
    }
    const nodes = chapterNodes(ch, w, h);
    // the road
    const road = (wd, col) => { g.strokeStyle = col; g.lineWidth = wd; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(nodes[0].x - 60 * dpr, nodes[0].y + 10 * dpr);
      for (let k = 0; k < nodes.length; k++) { const a = nodes[k], b = nodes[k + 1]; if (!b) { g.lineTo(a.x, a.y); break; } g.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2); } g.stroke(); };
    road(18 * dpr, 'rgba(0,0,0,0.3)'); road(12 * dpr, ch.id === 2 ? '#cdb084' : ch.id === 3 ? '#78746b' : '#7d6646');
    // props, kept off the road, drawn back to front
    if (BB.A.env[biome]) {
      const pick = { 1: ['Tree A1_S', 'Tree A2_S', 'Tree A3_S', 'Tree B4_S', 'Tree B5_S', 'Tree D1_S', 'Tree D3_S', 'Tree E1_S', 'Stone A1_S', 'Stone A9_S'],
        2: ['Tree A1_S', 'Tree A2_S', 'Tree A4_S', 'Tree E1_S', 'Tree E2_S', 'Stone B1_S', 'Stone B5_S', 'Stone A23_S', 'Stone B7_S', 'Stone A2_S'],
        3: ['Stone A14_S', 'Stone A15_S', 'Stone A6_S', 'Stone A10_S', 'Tree D2_S', 'Tree B4_S', 'Stone A2_S', 'Stone A21_S', 'TreeTrunkBroken'],
        4: ['Tree D1_S', 'Tree D3_S', 'Stone A14_S', 'Stone A15_S', 'Stone A4_S', 'Stone A13_S', 'TreeTrunkBroken', 'Tree B4_S'] }[ch.id];
      const near = (x, y) => { for (let k = 0; k < nodes.length - 1; k++) { const a = nodes[k], b = nodes[k + 1]; for (let t = 0; t <= 1; t += 0.1) if (Math.hypot(a.x + (b.x - a.x) * t - x, a.y + (b.y - a.y) * t - y) < 46 * dpr) return true; } return false; };
      const props = [];
      for (let i = 0; i < 220 && props.length < 70; i++) { const x = r() * w, y = r.range(0.08, 1.05) * h; if (!near(x, y)) props.push({ x, y, n: r.pick(pick), s: r.range(0.55, 0.9) * dpr }); }
      props.sort((a, b) => a.y - b.y);
      for (const p of props) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(p.x, p.y, 16 * p.s, 6 * p.s, 0, 0, 7); g.fill(); BB.drawEnv(g, biome, p.n, p.x, p.y, p.s); }
    }
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0.12)'); vg.addColorStop(1, 'rgba(6,8,12,0.7)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    if (BB.A.env[biome]) mapCache[key] = c;
    return c;
  }
  UI.pathRender = function () {
    const c = $('pathCv'); if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'), S = BB.save, t = performance.now() / 1000;
    const ch = BB.CHAPTERS.find((x) => x.id === C.ch);
    g.drawImage(chapterBackdrop(ch, w, h, dpr), 0, 0);
    g.font = '800 ' + Math.round(28 * dpr) + 'px Outfit, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.14)'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText(ch.name.toUpperCase(), 18 * dpr, h - 18 * dpr);
    C.nodes = chapterNodes(ch, w, h);
    for (const n of C.nodes) {
      const open = BB.stageUnlocked(S, n.i), done = S.cleared[n.m.id], boss = n.m.type === 'boss' || n.m.type === 'duel', sel = C.sel === n.i;
      const next = open && !done;
      const R = (boss ? 22 : 17) * dpr;
      const ring = !open ? 'rgba(255,255,255,0.18)' : done ? '#ffbe55' : boss ? '#ff6b6b' : '#ffffff';
      if (next) { const gl = g.createRadialGradient(n.x, n.y, R * 0.5, n.x, n.y, R * 2.4); gl.addColorStop(0, (boss ? 'rgba(255,107,107,' : 'rgba(255,255,255,') + (0.28 + Math.sin(t * 3) * 0.1) + ')'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(n.x, n.y, R * 2.4, 0, 7); g.fill(); }
      if (sel) { g.strokeStyle = 'rgba(255,190,85,0.9)'; g.lineWidth = 2 * dpr; g.setLineDash([5 * dpr, 4 * dpr]); g.lineDashOffset = -t * 14 * dpr; g.beginPath(); g.arc(n.x, n.y, R + 7 * dpr, 0, 7); g.stroke(); g.setLineDash([]); }
      g.fillStyle = done ? '#ffbe55' : 'rgba(12,14,21,0.92)'; g.beginPath(); g.arc(n.x, n.y, R, 0, 7); g.fill();
      g.strokeStyle = ring; g.lineWidth = 2 * dpr; g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (!open) { // a small padlock
        g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.6 * dpr; const u = R * 0.28;
        g.beginPath(); g.arc(n.x, n.y - u * 0.4, u * 0.8, Math.PI, 0); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(n.x - u, n.y - u * 0.4, u * 2, u * 1.6);
      } else {
        g.fillStyle = done ? '#1b1206' : boss ? '#ff8f8f' : '#fff';
        g.font = '700 ' + Math.round((boss ? 13 : 11.5) * dpr) + 'px Outfit, sans-serif';
        g.fillText(boss ? 'BOSS' : n.m.code, n.x, n.y + dpr);
      }
      if (n.m.legend && !done) { g.fillStyle = '#5cd3ff'; g.beginPath(); g.arc(n.x + R * 0.8, n.y - R * 0.8, 4.5 * dpr, 0, 7); g.fill(); g.strokeStyle = 'rgba(12,14,21,0.9)'; g.lineWidth = 2 * dpr; g.stroke(); }
      if (next) { const by = n.y - R - 14 * dpr + Math.sin(t * 4) * 3 * dpr; g.fillStyle = '#ffbe55'; g.beginPath(); g.moveTo(n.x - 6 * dpr, by - 6 * dpr); g.lineTo(n.x + 6 * dpr, by - 6 * dpr); g.lineTo(n.x, by + 2 * dpr); g.closePath(); g.fill(); }
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
    box.appendChild(el('div', 'sect', 'Your heroes <small>tap a hero to level up, ascend and equip</small>'));
    const own = el('div', 'hcards');
    const team = BB.teamIds(S);
    for (const h of sortHeroes(S.heroes)) if (ok(h.calling)) own.appendChild(UI.heroCard(h, { inteam: team.includes(h.id), onClick: () => UI.openHero(h.id) }));
    if (!own.children.length) own.appendChild(el('div', 'mute', 'No heroes of this calling yet.'));
    box.appendChild(own);
    for (const { tier, heroes } of tiers) {
      const missing = heroes.filter((e) => !S.heroes.some((h) => h.recruit === e.key) && ok(e.calling));
      if (!missing.length) continue;
      const open = BB.tierOpen(S, tier);
      box.appendChild(el('div', 'sect', '<span style="color:var(--r' + tier.rarity + ')">' + tier.name + '</span> <small>' + (open ? missing.length + ' to recruit · ◆ ' + tier.cost : UI.si('lock', 12) + ' clear chapter ' + tier.chapter + ' to open') + '</small>'));
      const g = el('div', 'hcards');
      for (const e of missing) {
        const c = el('button', 'hc locked ' + RCLS(tier.rarity));
        c.appendChild(UI.thumb(e.key, 64)); c.querySelector('canvas').style.bottom = '30%'; c.querySelector('canvas').style.width = '80%';
        c.appendChild(el('div', 'cic', UI.callIcon(e.calling)));
        c.appendChild(el('div', 'plate', '<div class="nm">' + (open ? esc(e.name.split(' ')[0]) : '???') + '</div><div class="pw" style="color:var(--mute)">' + (open ? BB.CALLINGS[e.calling].name : 'Locked') + '</div>'));
        click(c, () => UI.openRecruit(BB.TIERS.indexOf(tier)));
        g.appendChild(c);
      }
      box.appendChild(g);
    }
    const leg = Object.keys(BB.LEGENDS).filter((id) => !S.heroes.some((h) => h.legend === id) && ok(BB.LEGENDS[id].calling));
    if (leg.length) {
      box.appendChild(el('div', 'sect', '<span style="color:var(--r3)">Legends</span> <small>join as you clear their stages</small>'));
      const g = el('div', 'hcards');
      for (const id of leg) {
        const st = BB.MISSIONS.find((m) => m.legend === id);
        const c = el('div', 'hc locked r3');
        c.appendChild(copyCanvas(UI.body(BB.newHero({ legend: id }))));
        c.appendChild(el('div', 'cic', UI.callIcon(BB.LEGENDS[id].calling)));
        c.appendChild(el('div', 'plate', '<div class="nm">???</div><div class="pw" style="color:var(--mute)">Stage ' + (st ? st.code : '?') + '</div>'));
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
  const RC = UI.rec = { t: 0, tier: 0 };
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
    const faces = el('div', 'faces' + (open ? '' : ' locked'));
    for (const e of (left.length ? left : heroes).slice(0, 10)) { const f = UI.thumb(e.key, 44); f.title = open ? e.name : '???'; faces.appendChild(f); }
    info.appendChild(faces);
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
    const g = c.getContext('2d');
    const T = BB.TIERS[RC.tier], open = BB.tierOpen(BB.save, T), col = T.rarity ? RGBA[T.rarity] : 'rgba(120,190,255,A)';
    const bg = g.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.45, Math.max(w, h) * 0.7);
    bg.addColorStop(0, open ? col.replace('A', T.rarity ? '0.26' : '0.14') : 'rgba(120,130,150,0.08)'); bg.addColorStop(0.6, '#10131b'); bg.addColorStop(1, '#090b10');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const infoH = ($('altarInfo').offsetHeight || 0) * dpr, room = Math.max(h * 0.3, h - infoH); // the gate fills the space above the text
    const s = Math.min(w / 200, room / 125), cx = w / 2, cy = room * 0.5 - 6 * s;
    // standing stones either side of the gate
    g.lineWidth = Math.max(1, s * 0.6);
    for (const [k, al] of [[1, 0.5], [1.35, 0.25], [1.75, 0.12]]) { g.strokeStyle = (open ? col : 'rgba(255,255,255,A)').replace('A', String(al)); g.beginPath(); g.ellipse(cx, cy + 46 * s, 56 * s * k, 12 * s * k, 0, 0, 7); g.stroke(); }
    g.setLineDash([6 * s, 5 * s]); g.lineDashOffset = -RC.t * 10 * s; g.strokeStyle = (open ? col : 'rgba(255,255,255,A)').replace('A', '0.35'); g.beginPath(); g.ellipse(cx, cy + 46 * s, 66 * s, 14 * s, 0, 0, 7); g.stroke(); g.setLineDash([]);
    if (open) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = -1; i <= 1; i++) BB.drawOther(g, 'GodRay', cx + i * 18 * s, cy - 70 * s, s * 0.45, { add: true, alpha: 0.05 + 0.03 * Math.sin(RC.t * 2 + i), sx: 2, rot: i * 0.08 });
      g.restore();
      BB.drawFx(g, 'portal', Math.floor(RC.t * 12) % (BB.fxLen('portal') || 1), cx, cy, s * 0.95, { add: true, hue: [150, 170, 30, -160][T.rarity] });
      for (let i = 0; i < 18; i++) { const k = (RC.t * 0.25 + i / 18) % 1, a = i * 2.4 + RC.t * 0.3; g.fillStyle = col.replace('A', String((1 - k) * 0.8)); g.fillRect(cx + Math.cos(a) * (20 + k * 60) * s, cy + 30 * s - k * 90 * s, 2 * s, 2 * s); }
    } else BB.drawFx(g, 'portal', 0, cx, cy, s * 0.95, { alpha: 0.25 });
  };
  // ---------------------------------------------------------------- the summoning: energy gathers into a gate, the gate climbs
  // through the rarity colours, bursts, and the hero steps out of the light as a silhouette that fills with colour
  const RV = UI.rv = { on: false };
  const RCOL = ['#d9e0ea', '#4da3ff', '#b57cff', '#ffae2b'], RHUE = [150, 170, 30, -160];
  UI.reveal = function (h, done) {
    Object.assign(RV, { on: true, t: 0, h, done, parts: [], rings: [], shake: 0, flash: 0, step: -1, burst: false, stars: 0, sil: null });
    RV.steps = (h.rarity || 0) + 1;
    RV.tB = 1.4 + RV.steps * 0.6; RV.tS = RV.tB + 0.3; RV.tC = RV.tS + 1.3;
    // energy motes rush in from the edges
    for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, d = 0.65 + Math.random() * 0.5; RV.parts.push({ kind: 'in', a, d, delay: Math.random() * 1.1, sp: 0.5 + Math.random() * 0.6 }); }
    const R = BB.HERO_RARITY[h.rarity || 0];
    $('reveal').style.setProperty('--rc', RCOL[h.rarity || 0]);
    $('rvRk').textContent = R.name + (h.legend ? ' · Legend' : '');
    $('rvNm').textContent = h.name; $('rvCl').textContent = BB.CALLINGS[h.calling].name + ' · ' + BB.CALLINGS[h.calling].role;
    $('reveal').classList.remove('done'); $('reveal').classList.add('on');
    BB.sfx('portal'); BB.sfx('charge');
  };
  click($('rvOk'), (ev) => { ev.stopPropagation(); RV.on = false; $('reveal').classList.remove('on'); RV.done && RV.done(); });
  $('reveal').addEventListener('click', () => { if (RV.on && RV.t < RV.tB) RV.t = RV.tB - 0.01; }); // tap to skip to the burst
  const sil = (layers, clip, dir, fr, sc) => { // the hero as a black cut-out, for the backlit moment
    const c = RV.sil || (RV.sil = document.createElement('canvas')); const S = 128 * sc; if (c.width !== S) { c.width = S; c.height = S; }
    const x = c.getContext('2d'); x.clearRect(0, 0, S, S); x.imageSmoothingEnabled = false; x.globalCompositeOperation = 'source-over';
    BB.drawLayers(x, layers, clip, dir, fr, S / 2, 90 * sc, sc, { noSlash: true });
    x.globalCompositeOperation = 'source-in'; x.fillStyle = '#05060a'; x.fillRect(0, 0, S, S); return c;
  };
  UI.revealRender = function (dt) {
    if (!RV.on) return;
    const prevT = RV.t; RV.t += dt; const T = RV.t;
    const c = $('revealCv'), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false;
    const rar = RV.h.rarity || 0, u = Math.min(w, h) / 600;
    // which colour step we are on (it climbs: silver → blue → purple → gold)
    const step = T < 1.4 ? -1 : Math.min(RV.steps - 1, Math.floor((T - 1.4) / 0.6));
    if (step > RV.step) { RV.step = step; RV.flash = Math.max(RV.flash, 0.35 + step * 0.1); RV.shake = 0.25 + step * 0.15; RV.rings.push({ t: 0, col: RCOL[step], big: false }); BB.sfx('chime'); }
    if (!RV.burst && T >= RV.tB) { RV.burst = true; RV.flash = 1; RV.shake = 0.6 + rar * 0.2; RV.rings.push({ t: 0, col: RCOL[rar], big: true }); BB.sfx('burst');
      for (let i = 0; i < 90 + rar * 40; i++) { const a = Math.random() * Math.PI * 2, v = (250 + Math.random() * 500) * u; RV.parts.push({ kind: 'out', x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120 * u, t: 0, life: 0.9 + Math.random() * 0.9, col: Math.random() < 0.7 ? RCOL[rar] : '#ffffff', r: (1.5 + Math.random() * 3) * u }); } }
    const col = step < 0 ? '#9aa6b8' : RCOL[step];
    // shake
    if (RV.shake > 0) { RV.shake = Math.max(0, RV.shake - dt * 1.4); g.translate((Math.random() - 0.5) * RV.shake * 26 * u, (Math.random() - 0.5) * RV.shake * 26 * u); }
    const txt = document.querySelector('#reveal .txt'), cardTop = txt ? txt.offsetTop * dpr : h * 0.7;
    const fy = Math.min(h * 0.56, cardTop - 64 * u), cx = w / 2, cy = fy * 0.6;
    // the dark, tinted by the gate's colour
    const glow = T < 1.4 ? T / 1.4 * 0.25 : 0.35 + Math.min(0.3, step * 0.1);
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7); bg.addColorStop(0, col + Math.round(glow * 255).toString(16).padStart(2, '0')); bg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = bg; g.fillRect(-50, -50, w + 100, h + 100);
    // gather: motes stream into the gate
    for (const p of RV.parts) if (p.kind === 'in') {
      const k = Math.max(0, Math.min(1, (T - p.delay) * p.sp)); if (k <= 0 || k >= 1) continue;
      const e = k * k, R = Math.max(w, h) * p.d * (1 - e), x = cx + Math.cos(p.a + e * 1.2) * R, y = cy + Math.sin(p.a + e * 1.2) * R * 0.75;
      const tail = 18 * u * (1 - e) + 4 * u;
      g.strokeStyle = col; g.globalAlpha = Math.sin(k * Math.PI); g.lineWidth = 2 * u; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(p.a) * tail, y + Math.sin(p.a) * tail * 0.75); g.stroke();
    }
    g.globalAlpha = 1;
    // a column of light pours into the gate once it starts to climb
    if (T > 1.2) {
      const bw = (40 + Math.min(1, (T - 1.2) / 1.2) * 70 + (RV.burst ? 40 : 0)) * u * (1 + Math.sin(T * 9) * 0.04);
      const fade = T > RV.tC ? Math.max(0.25, 1 - (T - RV.tC) * 0.5) : 1;
      g.save(); g.globalCompositeOperation = 'lighter';
      const floorY = fy;
      for (let q = 0; q < 8; q++) { const wk = 1 - q * 0.11, al = 0.05; // nested shafts, each fading out toward the floor
        const vg = g.createLinearGradient(0, 0, 0, floorY); vg.addColorStop(0, col + Math.round(al * 255 * fade).toString(16).padStart(2, '0')); vg.addColorStop(0.75, col + Math.round(al * 200 * fade).toString(16).padStart(2, '0')); vg.addColorStop(1, col + '00');
        g.fillStyle = vg; g.fillRect(cx - bw * wk, 0, bw * 2 * wk, floorY);
      }
      for (let i = -3; i <= 3; i++) BB.drawOther(g, 'GodRay', cx + i * 36 * u, cy - 260 * u, u * 1.3, { add: true, alpha: (RV.burst ? 0.4 : 0.18) * fade * (1 - Math.abs(i) * 0.12), sx: 3, rot: i * 0.09 });
      g.restore();
    }
    // the gate: grows while it gathers, burns brighter with each colour, tears wide on the burst
    const gs = (T < 1.4 ? 0.35 + T / 1.4 * 0.5 : 0.85 + step * 0.08) * (RV.burst ? 1 + Math.min(0.6, (T - RV.tB) * 2) : 1) * u * 2.2;
    const ga = RV.burst ? Math.max(0, 1 - (T - RV.tB) * 0.9) : 1;
    if (ga > 0) { g.save(); g.globalAlpha = ga; BB.drawFx(g, T < 1 ? 'portalopen' : 'portal', Math.floor(T * 14) % (BB.fxLen(T < 1 ? 'portalopen' : 'portal') || 1), cx, cy, gs, { add: true, hue: step < 0 ? 170 : RHUE[step] }); g.restore(); }
    // floor rings
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { g.strokeStyle = col; g.globalAlpha = 0.5 - i * 0.14; g.lineWidth = 1.5 * u; g.beginPath(); g.ellipse(cx, fy, (90 + i * 40) * u, (22 + i * 10) * u, 0, 0, 7); g.stroke(); }
    g.setLineDash([10 * u, 8 * u]); g.lineDashOffset = -T * 40 * u; g.globalAlpha = 0.6; g.beginPath(); g.ellipse(cx, fy, 150 * u, 36 * u, 0, 0, 7); g.stroke(); g.setLineDash([]);
    // shockwave rings
    for (const r of RV.rings) { r.t += dt; const k = r.t / (r.big ? 1.1 : 0.7); if (k >= 1) continue; g.globalAlpha = 1 - k; g.strokeStyle = r.col; g.lineWidth = (r.big ? 10 : 5) * u * (1 - k); g.beginPath(); g.ellipse(cx, cy, k * (r.big ? 700 : 300) * u, k * (r.big ? 520 : 220) * u, 0, 0, 7); g.stroke(); }
    g.restore(); g.globalAlpha = 1;
    // the hero steps out: black against the light, then colour floods in
    if (T >= RV.tS) {
      const k = T - RV.tS, layers = BB.heroLayers(RV.h), key = layers[0].key;
      const clip = k < 1.6 ? (BB.hasClip(key, 'Taunt') ? 'Taunt' : 'Special1') : 'Idle';
      const n = BB.clipLen(key, clip) || 15, fr = clip === 'Idle' ? Math.floor(T * 9) % n : Math.min(n - 1, Math.floor(k * 11));
      const sc = Math.max(2, Math.round(h / 165)), rise = Math.max(0, 1 - k * 3) * 40 * u;
      g.globalAlpha = Math.min(1, k * 3);
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.ellipse(cx, fy, 34 * sc, 10 * sc, 0, 0, 7); g.fill();
      const reveal = Math.min(1, Math.max(0, (k - 0.45) / 0.7));
      if (reveal < 1) { const sv = sil(layers, clip, 2, fr, sc); g.drawImage(sv, cx - 64 * sc, fy - 90 * sc + rise); }
      if (reveal > 0) { g.globalAlpha = reveal; BB.drawLayers(g, layers, clip, 2, fr, cx, fy + rise, sc, { noSlash: true, flash: Math.max(0, 1 - reveal) * 0.8 }); }
      g.globalAlpha = 1;
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
    // white flashes
    if (RV.flash > 0) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(255,255,255,' + Math.min(1, RV.flash) * 0.85 + ')'; g.fillRect(0, 0, w, h); RV.flash = Math.max(0, RV.flash - dt * 2.2); }
    void prevT;
  };

  // ---------------------------------------------------------------- team: a field with five places; heroes stand where they will fight
  const T = UI.tm = { sel: null, stage: null, t: 0, spots: [] };
  UI.openTeam = function (stageIdx) { T.stage = stageIdx === undefined ? null : stageIdx; T.sel = null; UI.renderTeam(); UI.show('team'); $('tabbar').style.display = T.stage !== null ? 'none' : ''; };
  const SPOTS = [['front', 0, 0.63, 0.36], ['front', 1, 0.68, 0.64], ['back', 0, 0.3, 0.24], ['back', 1, 0.35, 0.5], ['back', 2, 0.4, 0.76]];
  UI.teamRender = function (dt) {
    const c = $('boardCv'); if (!c || !BB.save) return;
    const S = BB.save, dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr); if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    T.t += dt;
    // the field: dark slate, a fine diamond grid, the foe's side warmer
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#121722'); bg.addColorStop(1, '#0b0e15'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const fg = g.createLinearGradient(w * 0.72, 0, w, 0); fg.addColorStop(0, 'rgba(255,90,80,0)'); fg.addColorStop(1, 'rgba(255,90,80,0.12)'); g.fillStyle = fg; g.fillRect(w * 0.72, 0, w * 0.28, h);
    g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 1;
    const step = 42 * dpr;
    for (let x = -h; x < w + h; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h * 2, h); g.stroke(); g.beginPath(); g.moveTo(x, h); g.lineTo(x + h * 2, 0); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.setLineDash([4 * dpr, 6 * dpr]); g.beginPath(); g.moveTo(w * 0.52, 34 * dpr); g.lineTo(w * 0.52, h - 40 * dpr); g.stroke(); g.setLineDash([]);
    g.font = '600 ' + Math.round(11 * dpr) + 'px Outfit, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(160,170,185,0.8)';
    const tl = (txt, x) => { g.save(); g.letterSpacing = (2 * dpr) + 'px'; g.fillText(txt, x, 24 * dpr); g.restore(); };
    tl('BACK ROW', w * 0.35); tl('FRONT ROW', w * 0.655);
    g.fillStyle = 'rgba(255,120,110,0.85)'; g.textAlign = 'right'; g.save(); g.letterSpacing = (2 * dpr) + 'px'; g.fillText('ENEMY  →', w - 16 * dpr, 24 * dpr); g.restore();
    const sc = Math.max(1, Math.round(h / (250 * dpr))) * dpr;
    const rw = Math.min(w * 0.08, 34 * sc);
    T.spots = SPOTS.map(([row, i, fx, fy]) => ({ row, i, x: fx * w, y: fy * h, r: rw * 1.25 }));
    const list = T.spots.map((sp) => ({ sp, h: S.heroes.find((x) => x.id === S.formation[sp.row][sp.i]) })).sort((a, b) => a.sp.y - b.sp.y);
    for (const { sp, h: hero } of list) {
      const sel = T.sel && T.sel.row === sp.row && T.sel.i === sp.i;
      const col = hero ? UI.rgba[hero.rarity || 0] : 'rgba(255,255,255,A)';
      const gl = g.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, rw * 1.2);
      gl.addColorStop(0, col.replace('A', hero ? '0.28' : '0.06')); gl.addColorStop(1, col.replace('A', '0'));
      g.fillStyle = gl; g.beginPath(); g.ellipse(sp.x, sp.y, rw * 1.2, rw * 0.44, 0, 0, 7); g.fill();
      g.lineWidth = 1.5 * dpr; g.strokeStyle = col.replace('A', hero ? '0.9' : '0.22'); g.beginPath(); g.ellipse(sp.x, sp.y, rw, rw * 0.36, 0, 0, 7); g.stroke();
      if (sel) { g.strokeStyle = 'rgba(255,190,85,' + (0.55 + Math.sin(T.t * 6) * 0.4) + ')'; g.lineWidth = 2 * dpr; g.setLineDash([6 * dpr, 5 * dpr]); g.lineDashOffset = -T.t * 20 * dpr; g.beginPath(); g.ellipse(sp.x, sp.y, rw * 1.22, rw * 0.46, 0, 0, 7); g.stroke(); g.setLineDash([]); }
      if (!hero) { g.strokeStyle = 'rgba(255,255,255,' + (sel ? 0.9 : 0.3) + ')'; g.lineWidth = 2 * dpr; const q = 6 * dpr; g.beginPath(); g.moveTo(sp.x - q, sp.y); g.lineTo(sp.x + q, sp.y); g.moveTo(sp.x, sp.y - q); g.lineTo(sp.x, sp.y + q); g.stroke(); continue; }
      const layers = BB.heroLayers(hero), n = BB.clipLen(layers[0].key, 'Idle') || 15;
      BB.drawHeroDressed(g, hero, BB.auraOf(hero), 'Idle', 1, Math.floor(T.t * 9 + sp.i * 3) % n, sp.x, sp.y + rw * 0.05, sc, T.t + sp.i, { noSlash: true, layers });
      g.textAlign = 'center';
      g.font = '600 ' + Math.round(12 * dpr) + 'px Outfit, sans-serif'; g.fillStyle = '#fff'; g.fillText(BB.shortName(hero), sp.x, sp.y + rw * 0.5 + 13 * dpr);
      g.font = '500 ' + Math.round(10.5 * dpr) + 'px Inter, sans-serif'; g.fillStyle = col.replace('A', '1'); g.fillText('Lv ' + hero.level + ' · ' + BB.CALLINGS[hero.calling].name, sp.x, sp.y + rw * 0.5 + 27 * dpr);
    }
  };
  UI.boardClick = function (ev) {
    const c = $('boardCv'), rc = c.getBoundingClientRect(), d = c.width / rc.width;
    const x = (ev.clientX - rc.left) * d, y = (ev.clientY - rc.top) * d;
    let best = null, bd = 1e9;
    for (const sp of T.spots) {
      const dx = Math.abs(x - sp.x), top = sp.y - sp.r * 2.6, bot = sp.y + sp.r * 0.9;
      if (dx > sp.r * 1.1 || y < top || y > bot) continue;
      const q = dx + Math.abs(y - (sp.y - sp.r * 0.6)) * 0.5; if (q < bd) { bd = q; best = sp; }
    }
    if (!best) { if (T.sel) { T.sel = null; UI.renderTeam(); } return; }
    const S = BB.save, id = S.formation[best.row][best.i];
    BB.audioUnlock(); BB.sfx('click');
    if (id) { BB.removeHero(S, id); BB.persist(); T.sel = { row: best.row, i: best.i }; }
    else T.sel = T.sel && T.sel.row === best.row && T.sel.i === best.i ? null : { row: best.row, i: best.i };
    UI.renderTeam(); UI.refreshTop();
  };
  UI.renderTeam = function () {
    const S = BB.save, ids = BB.teamIds(S);
    $('boardHint').textContent = T.sel ? 'Now tap a hero in the roster to place them here' : ids.length ? 'Tap a hero on the field to take them out · the front row draws the blows' : 'Tap a place, then a hero';
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
    top.appendChild(el('div', 'bondrow', bonds.length ? bonds.map((b) => '<span class="bond" title="' + esc(b.desc) + '">✦ ' + b.name + '</span>').join('') : '<span class="mute" style="font-size:13px">Mix callings to unlock team bonds.</span>'));
    const row = el('div', 'row');
    const af = el('button', 'btn dark sm', UI.si('bolt', 14) + ' Auto-fill'); af.title = 'The strongest five: fighters in front, the rest behind';
    click(af, () => { BB.autoFill(S); T.sel = null; BB.persist(); UI.renderTeam(); UI.refreshTop(); });
    row.appendChild(af);
    if (T.stage !== null) {
      const back = el('button', 'btn dark sm', '‹ Map'); click(back, () => UI.openCampaign(T.stage)); row.appendChild(back);
      row.appendChild(el('div', 'grow'));
      const go = el('button', 'btn xl', 'Fight ▸'); go.disabled = !team.length; click(go, () => BB.deploy(T.stage)); row.appendChild(go);
    }
    top.appendChild(row);
    const ro = $('teamRoster'); ro.innerHTML = '';
    for (const h of sortHeroes(S.heroes)) {
      const inT = ids.includes(h.id);
      ro.appendChild(UI.heroCard(h, { inteam: inT, onClick: () => {
        if (inT) BB.removeHero(S, h.id);
        else if (T.sel) BB.placeHero(S, h.id, T.sel.row, T.sel.i);
        else if (!BB.placeHero(S, h.id)) { UI.toast('The field is full. Tap a hero on the field to make room.'); return; }
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
    if (it.ench) det.appendChild(el('div', 'ench', '<span style="color:' + BB.ECOL[it.ench][1] + '">✦ ' + BB.ELEMENTS[it.ench].name + ' enchant</span> · ' + BB.ENCH[it.ench].desc + '. The wearer glows with it.'));
    else if (it.slot === 'weapon') det.appendChild(el('div', 'ench mute', 'Forge to +' + BB.AWAKEN_AT + ' to awaken an enchant.'));
    const cur = BB.itemStats(it), next = BB.itemStats(Object.assign({}, it, { plus: (it.plus || 0) + 1 }));
    det.appendChild(el('div', 'statl', Object.keys(cur).map((k) => '<div><span>' + ({ atk: 'Attack', hp: 'Health', def: 'Defence', crit: 'Crit', spd: 'Speed' }[k] || k) + '</span><b>' + UI.num(k, cur[k]) + ((it.plus || 0) < BB.MAX_PLUS ? ' <i>→ ' + UI.num(k, next[k]) + '</i>' : '') + '</b></div>').join('')));
    const ups = el('div', 'ups'); ups.style.marginTop = 'auto';
    const maxed = (it.plus || 0) >= BB.MAX_PLUS;
    const up = el('button', 'btn', maxed ? 'Fully forged' : 'Forge +' + ((it.plus || 0) + 1) + '<span class="cost">● ' + fmt(BB.upgradeCost(it)) + '</span>');
    up.disabled = maxed || S.gold < BB.upgradeCost(it);
    click(up, () => { const r = BB.upgradeItem(S, it); if (r) { BB.sfx(r === 'awakened' ? 'enchant' : 'forge'); BB.persist(); UI.renderForge(); UI.refreshTop(); if (r === 'awakened') UI.toast('The forge awakens it: ' + it.name + ' · ' + BB.ENCH[it.ench].desc); } });
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
    const art = { free: ['◆', 'linear-gradient(160deg,#8fd2ff,#2c63d8)'], chest: ['<svg class="i" viewBox="0 0 24 24" style="width:40px;height:40px;color:#fff">' + SI.gift + '</svg>', 'linear-gradient(160deg,#ffd27e,#e0802a)'], sigils: ['✧', 'linear-gradient(160deg,#d8b0ff,#7a3fd6)'], crystals: ['◆', 'linear-gradient(160deg,#a6ecff,#2a86d6)'] };
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
