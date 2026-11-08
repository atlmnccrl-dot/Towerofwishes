// Bannerborn — screens: banner editor, Hero Forge, warband, stronghold, war map, results, story.
(function () {
  const BB = window.BB;
  const UI = BB.UI = {};
  const $ = (id) => document.getElementById(id);
  UI.$ = $;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  UI.el = el; UI.esc = esc;
  const click = (e, f) => e.addEventListener('click', (ev) => { BB.audioUnlock(); BB.sfx('click'); f(ev); });
  UI.click = click;

  UI.show = function (id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
    UI.current = id;
  };
  UI.modal = function (id, on) { $(id).classList.toggle('on', on !== false); };
  let toastT = 0;
  UI.toast = function (msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); };
  UI.confirm = function (text, yes) {
    $('confText').innerHTML = text; UI.modal('mConfirm');
    $('confYes').onclick = () => { UI.modal('mConfirm', false); yes(); };
    $('confNo').onclick = () => UI.modal('mConfirm', false);
  };

  // ---------------------------------------------------------------- banner art
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

  // ---------------------------------------------------------------- banner editor
  UI.openBannerEdit = function (done) {
    const S = BB.save, b = S.banner;
    $('bandName').value = b.name;
    const cw = $('bandColors'); cw.innerHTML = '';
    BB.BANNER_COLORS.forEach((c) => { const x = el('button'); x.style.background = c; x.classList.toggle('on', b.color === c); click(x, () => { b.color = c; redraw(); }); cw.appendChild(x); });
    const tw = $('bandTrims'); tw.innerHTML = '';
    ['#e8c66a', '#e8e1cf', '#c0c6cc', '#1c1c24', '#b3242c'].forEach((c) => { const x = el('button'); x.style.background = c; click(x, () => { b.trim = c; redraw(); }); tw.appendChild(x); });
    const sg = $('bandSigils'); sg.innerHTML = '';
    BB.SIGILS.forEach((s) => { const x = el('button', '', s[0].toUpperCase() + s.slice(1)); click(x, () => { b.sigil = s; redraw(); }); sg.appendChild(x); });
    function redraw() {
      [...cw.children].forEach((x, i) => x.classList.toggle('on', BB.BANNER_COLORS[i] === b.color));
      [...tw.children].forEach((x) => x.classList.toggle('on', x.style.background && b.trim && sameColor(x.style.background, b.trim)));
      [...sg.children].forEach((x, i) => x.classList.toggle('on', BB.SIGILS[i] === b.sigil));
    }
    UI.bannerAnim = () => { const c = $('bannerPrev'); UI.drawBanner(c.getContext('2d'), b, c.width, c.height, performance.now() / 1000); };
    redraw();
    $('bBannerOk').onclick = () => { BB.audioUnlock(); b.name = ($('bandName').value || 'The Last Banner').slice(0, 24); UI.bannerAnim = null; done(); };
    UI.show('bannerEdit');
  };
  function sameColor(css, hex) { const n = parseInt(hex.slice(1), 16); return css.replace(/\s/g, '') === 'rgb(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ')'; }

  // ---------------------------------------------------------------- item icons from the art layers
  const iconCache = {};
  UI.itemIcon = function (it, size) {
    size = size || 30;
    const key = it.slot + (it.look || it.wtype) + it.tint + size;
    if (iconCache[key]) return iconCache[key];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    let layer = it.look, clip = 'Idle', dir = 2, fr = 0;
    if (it.slot === 'weapon') { layer = { sword: 'sword', axe: 'axe', bow: 'sword', focus: null }[it.wtype]; if (it.wtype === 'bow') { clip = 'Attack3'; fr = 8; dir = 0; } else dir = 0; }
    if (layer && BB.A.chars[layer]) {
      const a = BB.A.chars[layer], n = a.meta.clips[clip], r = a.meta.f[clip][dir * n + fr];
      const img = BB.atlasImg(layer, BB.tintSpec(layer, it.tint), it.tint);
      const k = Math.min((size - 4) / r[2], (size - 4) / r[3]);
      g.drawImage(img, r[0], r[1], r[2], r[3], (size - r[2] * k) / 2, (size - r[3] * k) / 2, r[2] * k, r[3] * k);
    } else {
      const col = BB.RARITY[it.rarity].color;
      const gr = g.createRadialGradient(size * 0.4, size * 0.35, 1, size / 2, size / 2, size * 0.42);
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, col); gr.addColorStop(1, 'rgba(0,0,0,0.6)');
      g.fillStyle = gr;
      if (it.slot === 'charm') { g.beginPath(); g.moveTo(size / 2, 3); g.lineTo(size - 5, size / 2); g.lineTo(size / 2, size - 3); g.lineTo(5, size / 2); g.closePath(); g.fill(); }
      else { g.beginPath(); g.arc(size / 2, size / 2, size * 0.36, 0, 7); g.fill(); }
    }
    iconCache[key] = c; return c;
  };
  UI.statLine = function (s) {
    const out = [];
    if (s.atk) out.push('+' + s.atk + ' ATK'); if (s.hp) out.push('+' + Math.round(s.hp) + ' HP'); if (s.def) out.push('+' + s.def + ' DEF');
    if (s.crit) out.push('+' + Math.round(s.crit * 100) + '% CRIT'); if (s.spd) out.push('+' + Math.round(s.spd * 100) + '% SPD');
    return out.join(' · ');
  };

  // ---------------------------------------------------------------- Hero Forge
  const F = UI.forge = { dir: 2, anim: 'Idle', t: 0, tab: 'calling' };
  UI.openForge = function (opts) {
    F.opts = opts;
    F.hero = opts.hero || BB.newHero({ calling: opts.calling, captain: opts.captain });
    if (opts.captain) F.hero.captain = true;
    F.dir = 2; F.anim = 'Idle'; F.t = 0; F.tab = 'calling';
    $('forgeTitle').textContent = opts.title || 'Forge a Hero';
    $('fConfirm').textContent = opts.confirm || 'Forge Hero';
    $('bForgeBack').style.visibility = opts.back ? 'visible' : 'hidden';
    $('bForgeBack').onclick = () => opts.back && opts.back();
    $('forgeGold').style.display = opts.cost ? '' : 'none';
    $('forgeGold').textContent = opts.cost ? opts.cost + ' to forge' : '';
    UI.forgeTabs();
    UI.show('forge');
  };
  UI.forgeTabs = function () {
    document.querySelectorAll('#forge .tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === F.tab));
    const box = $('forgeOpts'); box.innerHTML = '';
    const h = F.hero, lk = h.look;
    if (F.tab === 'calling') {
      const grid = el('div', 'callings');
      for (const id of BB.CALLING_ORDER) {
        const C = BB.CALLINGS[id];
        const card = el('button', 'callcard' + (h.calling === id ? ' on' : ''),
          '<b style="color:' + C.color + '">' + C.name + '</b><i class="mute">' + C.role + '</i><p>' + C.blurb + '</p><div class="sk">✦ ' + C.skill.name + '</div>');
        click(card, () => { h.calling = id; F.anim = 'attack'; F.t = 0; UI.forgeTabs(); });
        grid.appendChild(card);
      }
      box.appendChild(grid);
      const C = BB.CALLINGS[h.calling], s = BB.heroStats(h, null, null);
      box.appendChild(el('div', 'lbl', 'Skill — ' + C.skill.name));
      box.appendChild(el('div', '', '<span style="font-size:14px">' + C.skill.desc + '</span>'));
      box.appendChild(el('div', 'lbl', 'Level 1 stats'));
      box.appendChild(el('div', 'stats', '<div>Health<b>' + s.hp + '</b></div><div>Attack<b>' + Math.round(s.atk) + '</b></div><div>Defence<b>' + Math.round(s.def) + '</b></div><div>Range<b>' + (C.ranged ? 'Far' : 'Melee') + '</b></div><div>Crit<b>' + Math.round(s.crit * 100) + '%</b></div><div>Speed<b>' + s.spd.toFixed(1) + '</b></div>'));
    } else if (F.tab === 'look') {
      const sw = (label, list, cur, set, colorOf) => {
        box.appendChild(el('div', 'lbl', label));
        const w = el('div', 'sw');
        for (const it of list) {
          const b = el('button'); b.title = it.name; b.style.background = colorOf(it); b.classList.toggle('on', it.id === cur);
          click(b, () => { set(it.id); UI.forgeTabs(); }); w.appendChild(b);
        }
        box.appendChild(w);
      };
      const chips = (label, list, cur, set) => {
        box.appendChild(el('div', 'lbl', label));
        const w = el('div', 'chips');
        for (const [id, name] of list) { const b = el('button', id === cur ? 'on' : '', name); click(b, () => { set(id); UI.forgeTabs(); }); w.appendChild(b); }
        box.appendChild(w);
      };
      const skinCol = (s) => { const c = BB.hsl2rgb(28 + s.h, 0.45 * s.s, 0.62 * s.l); return 'rgb(' + c.join(',') + ')'; };
      const tintCol = (t) => { if (!t.col) return 'linear-gradient(135deg,#e2b84a 50%,#2f86c6 50%)'; const c = BB.hsl2rgb(t.col.h, Math.min(1, t.col.s + 0.15), 0.5 * t.l); return 'rgb(' + c.join(',') + ')'; };
      const hairCol = (t) => { if (!t.col) return '#c8642a'; const c = BB.hsl2rgb(t.col.h, Math.min(1, t.col.s + 0.1), 0.42 * t.l); return 'rgb(' + c.join(',') + ')'; };
      sw('Skin', BB.SKINS, lk.skin, (v) => (lk.skin = v), skinCol);
      chips('Head', [['hair', 'Hair'], ['helm', 'Helm'], ['none', 'Bare']], lk.head, (v) => (lk.head = v));
      if (lk.head === 'hair') sw('Hair colour', BB.HAIRS, lk.hair, (v) => (lk.hair = v), hairCol);
      if (lk.head === 'helm') sw('Helm colour', BB.TINTS, lk.headTint, (v) => (lk.headTint = v), tintCol);
      chips('Armour', [['chestA', 'Gilded'], ['chestB', 'Plate'], ['none', 'None']], lk.chest, (v) => (lk.chest = v));
      if (lk.chest !== 'none') sw('Armour colour', BB.TINTS, lk.chestTint, (v) => (lk.chestTint = v), tintCol);
      chips('Legs', [['legsA', 'Gilded'], ['legsB', 'Plate'], ['none', 'None']], lk.legs, (v) => (lk.legs = v));
      if (lk.legs !== 'none') sw('Legs colour', BB.TINTS, lk.legsTint, (v) => (lk.legsTint = v), tintCol);
      if (BB.CALLINGS[h.calling].offhand) sw('Shield colour', BB.TINTS, lk.shieldTint, (v) => (lk.shieldTint = v), tintCol);
    } else {
      box.appendChild(el('div', 'lbl', 'Name'));
      const inp = el('input', 'name'); inp.maxLength = 22; inp.value = h.name; inp.oninput = () => (h.name = inp.value || h.name);
      box.appendChild(inp);
      const r = el('div', 'row'); r.style.marginTop = '8px';
      const d = el('button', 'btn dark sm', '🎲 Another name'); click(d, () => { h.name = BB.randomName(); inp.value = h.name; }); r.appendChild(d);
      box.appendChild(r);
      box.appendChild(el('div', 'lbl', 'Who they are'));
      box.appendChild(el('div', '', '<span style="font-size:15px;line-height:1.4">' + esc(h.captain ? 'The banner-captain: the last officer of the Nine Banners, and the one who carries the flag into every fight.' : 'A volunteer who heard the war-horn and came to your fire. Every hero levels, learns perks and wears what you give them.') + '</span>'));
    }
  };
  UI.forgeRandom = function () {
    const r = BB.rng(Math.random() * 1e9);
    F.hero.look = BB.randomLook(r, F.hero.calling);
    if (F.tab !== 'name') F.hero.calling = r.pick(BB.CALLING_ORDER);
    F.hero.name = BB.randomName(r);
    F.anim = 'Taunt'; F.t = 0;
    UI.forgeTabs();
  };
  UI.forgeRender = function (dt) {
    const c = $('forgeCv'); if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
    if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'); g.clearRect(0, 0, w, h);
    F.t += dt;
    const h0 = F.hero, layers = BB.heroLayers(h0);
    let clip = F.anim;
    if (clip === 'attack') clip = BB.CALLINGS[h0.calling].basic[0];
    const n = BB.clipLen('body', clip) || 15;
    const fps = clip === 'Idle' ? 10 : 18;
    let fr = Math.floor(F.t * fps);
    if (clip !== 'Idle' && clip !== 'Run' && fr >= n + 8) { F.anim = 'Idle'; F.t = 0; fr = 0; clip = 'Idle'; }
    fr = clip === 'Idle' || clip === 'Run' ? fr % n : Math.min(n - 1, fr);
    const sc = Math.max(2, Math.floor(h / 115));
    const cx = w / 2, cy = h * 0.76;
    // pedestal
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(cx, cy, 22 * sc, 9 * sc, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(232,198,106,0.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, 30 * sc, 12 * sc, 0, 0, 7); g.stroke();
    const glow = g.createRadialGradient(cx, cy - 20 * sc, 0, cx, cy - 20 * sc, 60 * sc);
    glow.addColorStop(0, BB.CALLINGS[h0.calling].color + '33'); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, 0, w, h);
    g.imageSmoothingEnabled = false;
    BB.drawLayers(g, layers, clip, F.dir, fr, cx, cy, sc);
    g.font = '800 ' + Math.round(16 * dpr) + 'px Cinzel, serif'; g.textAlign = 'center'; g.fillStyle = '#e8c66a';
    g.fillText(h0.name, cx, h * 0.08);
    g.font = '600 ' + Math.round(11 * dpr) + 'px Cinzel, serif'; g.fillStyle = BB.CALLINGS[h0.calling].color;
    g.fillText((h0.captain ? 'BANNER-CAPTAIN · ' : '') + BB.CALLINGS[h0.calling].name.toUpperCase(), cx, h * 0.08 + 18 * dpr);
  };

  // ---------------------------------------------------------------- warband
  const W = UI.wb = { sel: null, slot: null };
  UI.openWarband = function () {
    const S = BB.save;
    if (!W.sel || !S.heroes.find((h) => h.id === W.sel)) W.sel = S.team[0] || (S.heroes[0] && S.heroes[0].id);
    UI.renderWarband(); UI.show('warband');
  };
  UI.heroById = (id) => BB.save.heroes.find((h) => h.id === id);
  UI.renderWarband = function () {
    const S = BB.save;
    $('wbGold').textContent = S.gold; $('wbCount').textContent = S.heroes.length + ' / ' + BB.rosterCap(S) + ' heroes';
    const ts = $('teamSlots'); ts.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const h = UI.heroById(S.team[i]);
      const s = el('button', 'slot' + (W.slot === i ? ' sel' : ''));
      if (h) {
        s.appendChild(BB.portrait(h, 64).cloneNode ? copyCanvas(BB.portrait(h, 64)) : null);
        s.appendChild(el('div', 'n', esc(h.name.split(' ')[0])));
        s.appendChild(el('div', 'lv', 'L' + h.level));
        if (h.captain) s.appendChild(el('div', 'cap', '⚑'));
        s.style.boxShadow = W.sel === h.id ? 'inset 0 0 0 2px ' + BB.heroColor(h) : '';
      } else s.appendChild(el('div', 'mute', '+'));
      click(s, () => { W.slot = W.slot === i ? null : i; if (h) W.sel = h.id; UI.renderWarband(); });
      ts.appendChild(s);
    }
    const team = S.team.map(UI.heroById).filter(Boolean);
    const cs = team.map((h) => h.calling);
    const bd = $('bonds'); bd.innerHTML = '';
    for (const b of BB.BONDS) { const on = b.test(cs); const x = el('span', 'bond' + (on ? '' : ' off'), (on ? '✦ ' : '') + b.name); x.title = b.desc; click(x, () => UI.toast(b.name + ': ' + b.desc)); bd.appendChild(x); }
    const ro = $('roster'); ro.innerHTML = '';
    for (const h of S.heroes) {
      const s = el('button', 'slot' + (W.sel === h.id ? ' sel' : ''));
      s.appendChild(copyCanvas(BB.portrait(h, 64)));
      s.appendChild(el('div', 'n', esc(h.name.split(' ')[0])));
      s.appendChild(el('div', 'lv', 'L' + h.level));
      if (S.team.includes(h.id)) s.appendChild(el('div', 'cap', '★'));
      if (h.pendingPerks) s.appendChild(el('div', 'badge', h.pendingPerks));
      click(s, () => {
        if (W.slot !== null) {
          const old = S.team.indexOf(h.id);
          if (old >= 0) S.team[old] = S.team[W.slot];
          S.team[W.slot] = h.id; S.team = S.team.filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 4);
          W.slot = null; BB.persist();
        }
        W.sel = h.id; UI.renderWarband();
      });
      ro.appendChild(s);
    }
    UI.renderHeroDetail();
  };
  function copyCanvas(src) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); return c; }
  UI.copyCanvas = copyCanvas;

  UI.renderHeroDetail = function () {
    const S = BB.save, h = UI.heroById(W.sel), box = $('heroDetail');
    box.innerHTML = '';
    if (!h) { box.appendChild(el('div', 'mute', 'Forge heroes at the camp.')); return; }
    const team = S.team.map(UI.heroById).filter(Boolean).map((x) => x.calling);
    const st = BB.heroStats(h, S.team.includes(h.id) ? team : null, S);
    const C = BB.CALLINGS[h.calling];
    const head = el('div', 'row');
    head.appendChild(copyCanvas(BB.portrait(h, 64)));
    head.appendChild(el('div', 'grow', '<div class="cz" style="font-size:18px;font-weight:800;color:' + BB.heroColor(h) + '">' + esc(h.name) + '</div><div class="mute" style="font-size:13px">Level ' + h.level + ' ' + C.name + ' · ' + esc(BB.heroTitle(h)) + '</div>' +
      '<div class="xpbar"><i style="width:' + (h.level >= BB.MAX_LEVEL ? 100 : Math.round(h.xp / BB.xpNext(h.level) * 100)) + '%"></i></div>'));
    box.appendChild(head);
    if (h.legend) box.appendChild(el('div', 'mute', '<i style="font-size:13px">' + esc(BB.LEGENDS[h.legend].lore) + '</i>'));
    if (h.pendingPerks) { const b = el('button', 'btn', '✦ Choose a perk (' + h.pendingPerks + ')'); click(b, () => UI.openPerk(h)); box.appendChild(b); }
    box.appendChild(el('div', 'stats', '<div>Health<b>' + st.hp + '</b></div><div>Attack<b>' + Math.round(st.atk) + '</b></div><div>Defence<b>' + Math.round(st.def) + '</b></div><div>Crit<b>' + Math.round(st.crit * 100) + '%</b></div><div>Speed<b>' + st.spd.toFixed(1) + '</b></div><div>Skill CD<b>' + st.cd.toFixed(1) + 's</b></div>'));
    box.appendChild(el('div', 'lbl', '✦ ' + C.skill.name + ' — <span style="text-transform:none;letter-spacing:0;font-family:Alegreya Sans">' + C.skill.desc + '</span>'));
    if (h.perks.length) {
      const all = BB.PERKS.any.concat(BB.PERKS[h.calling] || []);
      box.appendChild(el('div', 'bonds', h.perks.map((p) => '<span class="bond">' + esc((all.find((x) => x.id === p) || {}).name || p) + '</span>').join('')));
    }
    box.appendChild(el('div', 'lbl', 'Gear'));
    const gr = el('div', 'gearrow');
    for (const slot of BB.SLOTS) {
      if (slot === 'offhand' && !C.offhand) continue;
      const it = h.gear[slot];
      const b = el('button', 'gslot', '<small>' + BB.SLOT_NAME[slot] + '</small>' + (it ? '<span style="color:' + BB.RARITY[it.rarity].color + '">' + esc(it.name) + '</span>' : '<span class="mute">—</span>'));
      if (it) click(b, () => { S.inventory.push(it); h.gear[slot] = null; BB.persist(); UI.renderWarband(); });
      gr.appendChild(b);
    }
    box.appendChild(gr);
    const usable = S.inventory.filter((it) => BB.canEquip(h, it)).sort((a, b) => BB.itemScore(b) - BB.itemScore(a));
    box.appendChild(el('div', 'lbl', 'Armory — ' + usable.length + ' usable of ' + S.inventory.length));
    const inv = el('div', 'inv');
    for (const it of usable.slice(0, 40)) {
      const cur = h.gear[it.slot]; const diff = BB.itemScore(it) - BB.itemScore(cur);
      const b = el('button', 'item');
      const ic = el('div', 'ico'); ic.appendChild(UI.itemIcon(it, 30)); b.appendChild(ic);
      b.appendChild(el('div', 'grow', '<span style="color:' + BB.RARITY[it.rarity].color + '">' + esc(it.name) + '</span> <span class="mute" style="font-size:11px">' + BB.SLOT_NAME[it.slot] + ' · L' + it.level + '</span><div class="st">' + UI.statLine(it.stats) + '</div>'));
      b.appendChild(el('div', diff >= 0 ? 'up' : 'dn', (diff >= 0 ? '▲' : '▼') + Math.abs(diff)));
      click(b, () => {
        S.inventory.splice(S.inventory.indexOf(it), 1);
        if (cur) S.inventory.push(cur);
        h.gear[it.slot] = it; BB.persist(); BB.sfx('forge'); UI.renderWarband();
      });
      inv.appendChild(b);
    }
    box.appendChild(inv);
    const row = el('div', 'row'); row.style.marginTop = '8px';
    const sell = S.inventory.filter((it) => it.rarity === 0).length;
    if (sell) { const b = el('button', 'btn dark sm', 'Sell ' + sell + ' common items'); click(b, () => { const g = S.inventory.filter((it) => it.rarity === 0).reduce((a, it) => a + 6 + it.level * 2, 0); S.inventory = S.inventory.filter((it) => it.rarity > 0); S.gold += g; BB.sfx('coin'); BB.persist(); UI.toast('+' + g + ' gold'); UI.renderWarband(); }); row.appendChild(b); }
    const best = el('button', 'btn dark sm', 'Equip best'); click(best, () => { UI.equipBest(h); UI.renderWarband(); }); row.appendChild(best);
    if (!h.captain && !h.legend) {
      const d = el('button', 'btn red sm', 'Dismiss'); click(d, () => UI.confirm('Dismiss <b>' + esc(h.name) + '</b>? Their gear returns to the armory.', () => {
        for (const s of BB.SLOTS) if (h.gear[s]) S.inventory.push(h.gear[s]);
        S.heroes = S.heroes.filter((x) => x !== h); S.team = S.team.filter((x) => x !== h.id); W.sel = null; BB.persist(); UI.openWarband();
      })); row.appendChild(el('div', 'grow')); row.appendChild(d);
    }
    box.appendChild(row);
  };
  UI.equipBest = function (h) {
    const S = BB.save;
    for (const slot of BB.SLOTS) {
      const cands = S.inventory.filter((it) => it.slot === slot && BB.canEquip(h, it));
      let best = h.gear[slot], bs = BB.itemScore(best);
      for (const it of cands) if (BB.itemScore(it) > bs) { best = it; bs = BB.itemScore(it); }
      if (best !== h.gear[slot]) { S.inventory.splice(S.inventory.indexOf(best), 1); if (h.gear[slot]) S.inventory.push(h.gear[slot]); h.gear[slot] = best; }
    }
    BB.persist();
  };
  UI.openPerk = function (h, after) {
    const ch = BB.perkChoices(h, h.level * 131 + h.perks.length * 17 + h.id.charCodeAt(1));
    const body = $('perkBody'); body.innerHTML = '';
    body.appendChild(el('h2', 'gold', esc(h.name) + ' — choose a perk'));
    const pp = el('div', 'perkpick');
    for (const p of ch) {
      const b = el('button', '', '<b>' + esc(p.name) + '</b>' + esc(p.desc));
      click(b, () => { h.perks.push(p.id); h.pendingPerks--; BB.persist(); BB.sfx('levelup'); UI.modal('mPerk', false); if (h.pendingPerks > 0) UI.openPerk(h, after); else { if (UI.current === 'warband') UI.renderWarband(); after && after(); } });
      pp.appendChild(b);
    }
    body.appendChild(pp);
    UI.modal('mPerk');
  };

  // ---------------------------------------------------------------- stronghold
  UI.openStronghold = function () { UI.renderStronghold(); UI.show('stronghold'); };
  UI.renderStronghold = function () {
    const S = BB.save; $('shGold').textContent = S.gold;
    const box = $('buildings'); box.innerHTML = '';
    for (const id in BB.BUILDINGS) {
      const B = BB.BUILDINGS[id], lv = S.buildings[id] || 0, max = B.costs.length - 1;
      const c = el('div', 'bcard');
      c.appendChild(el('h3', '', B.name));
      c.appendChild(el('div', 'lvl', [1, 2, 3].map((i) => '<i class="' + (i <= lv ? 'on' : '') + '"></i>').join('')));
      c.appendChild(el('div', '', '<span style="font-size:14px">' + B.desc + '</span>'));
      c.appendChild(el('div', 'gold', '<span style="font-size:13px">Now: ' + B.effect(lv) + (lv < max ? ' → ' + B.effect(lv + 1) : '') + '</span>'));
      if (lv < max) {
        const cost = B.costs[lv + 1];
        const b = el('button', 'btn sm', 'Build · <span class="coin">' + cost + '</span>'); b.disabled = S.gold < cost;
        click(b, () => { S.gold -= cost; S.buildings[id] = lv + 1; BB.persist(); BB.sfx('forge'); UI.toast(B.name + ' raised to level ' + (lv + 1)); UI.renderStronghold(); BB.rebuildCamp && BB.rebuildCamp(); });
        c.appendChild(b);
      } else c.appendChild(el('div', 'mute', 'Fully built'));
      box.appendChild(c);
    }
  };

  // ---------------------------------------------------------------- war map
  const MAPPOS = [[0.12, 0.72], [0.2, 0.52], [0.13, 0.32], [0.28, 0.22], [0.36, 0.42], [0.48, 0.66], [0.58, 0.8], [0.68, 0.62], [0.62, 0.42], [0.76, 0.5], [0.8, 0.28], [0.9, 0.14]];
  const M = UI.mapState = { sel: null };
  UI.openMap = function () {
    const S = BB.save;
    if (M.sel === null || M.sel === undefined) { M.sel = 0; for (let i = 0; i < BB.MISSIONS.length; i++) if (BB.missionUnlocked(S, i)) M.sel = i; }
    $('mapGold').textContent = S.gold;
    UI.renderBrief(); UI.show('map');
  };
  UI.mapNodes = function (w, h) {
    const nodes = BB.MISSIONS.map((m, i) => ({ i, x: MAPPOS[i][0] * w, y: MAPPOS[i][1] * h, m }));
    if (BB.save.cleared.m5) nodes.push({ i: 'endless', x: 0.47 * w, y: 0.16 * h, m: null });
    return nodes;
  };
  let mapBg = null;
  UI.mapRender = function () {
    const c = $('mapCv'); if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
    if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; mapBg = null; }
    const g = c.getContext('2d');
    if (!mapBg) mapBg = paintMap(w, h, dpr);
    g.drawImage(mapBg, 0, 0);
    const S = BB.save, nodes = UI.mapNodes(w, h), t = performance.now() / 1000;
    // road
    g.save(); g.strokeStyle = 'rgba(70,40,18,0.75)'; g.lineWidth = 2.2 * dpr; g.setLineDash([7 * dpr, 6 * dpr]);
    g.beginPath(); nodes.filter((n) => n.m).forEach((n, k) => (k ? g.lineTo(n.x, n.y) : g.moveTo(n.x, n.y))); g.stroke(); g.restore();
    for (const n of nodes) {
      const unlocked = n.m ? BB.missionUnlocked(S, n.i) : true;
      const done = n.m && S.cleared[n.m.id];
      const boss = n.m && (n.m.type === 'boss' || n.m.type === 'duel');
      const r = (boss ? 15 : 11) * dpr;
      const sel = M.sel === n.i;
      if (sel) { g.strokeStyle = 'rgba(255,230,140,' + (0.6 + Math.sin(t * 5) * 0.3) + ')'; g.lineWidth = 3 * dpr; g.beginPath(); g.arc(n.x, n.y, r + 6 * dpr, 0, 7); g.stroke(); }
      const col = !unlocked ? '#6a6258' : n.i === 'endless' ? '#6a3aa0' : done ? '#c7952b' : '#a8241c';
      const gr = g.createRadialGradient(n.x - r * 0.3, n.y - r * 0.3, 1, n.x, n.y, r);
      gr.addColorStop(0, shade(col, 0.35)); gr.addColorStop(1, shade(col, -0.35));
      g.fillStyle = gr; g.beginPath();
      for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, rr = r * (k % 2 ? 0.92 : 1.04); g.lineTo(n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr); }
      g.closePath(); g.fill(); g.strokeStyle = 'rgba(40,10,5,0.6)'; g.lineWidth = 1 * dpr; g.stroke();
      g.fillStyle = 'rgba(255,240,210,0.9)'; g.font = '900 ' + Math.round((boss ? 13 : 11) * dpr) + 'px Cinzel, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(n.i === 'endless' ? '∞' : boss ? '☠' : done ? '✓' : String(n.i + 1), n.x, n.y + 1);
      if (n.m && (sel || boss)) {
        g.font = '700 ' + Math.round(11 * dpr) + 'px Cinzel, serif'; g.fillStyle = 'rgba(50,28,10,0.9)';
        g.fillText(n.m.name, n.x, n.y + r + 11 * dpr);
      }
    }
    g.textBaseline = 'alphabetic';
  };
  function paintMap(w, h, dpr) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const bg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    bg.addColorStop(0, '#ead8b0'); bg.addColorStop(1, '#b89a68'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const r = BB.rng(42);
    const wash = (cx, cy, rad, col, n) => { for (let i = 0; i < n; i++) { const x = cx + r.range(-rad, rad), y = cy + r.range(-rad * 0.6, rad * 0.6), rr = r.range(rad * 0.25, rad * 0.6); const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); } };
    wash(w * 0.22, h * 0.45, w * 0.2, 'rgba(70,120,50,0.22)', 40);
    wash(w * 0.65, h * 0.62, w * 0.2, 'rgba(210,150,60,0.22)', 40);
    wash(w * 0.86, h * 0.22, w * 0.12, 'rgba(60,30,80,0.25)', 30);
    // trees and dunes as ink marks
    g.strokeStyle = 'rgba(60,40,20,0.45)'; g.lineWidth = 1 * dpr;
    for (let i = 0; i < 140; i++) {
      const x = r.range(0.02, 0.42) * w, y = r.range(0.1, 0.9) * h;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4 * dpr, y + 8 * dpr); g.lineTo(x + 4 * dpr, y + 8 * dpr); g.closePath(); g.stroke();
    }
    for (let i = 0; i < 70; i++) {
      const x = r.range(0.46, 0.8) * w, y = r.range(0.45, 0.95) * h;
      g.beginPath(); g.moveTo(x - 8 * dpr, y); g.quadraticCurveTo(x, y - 5 * dpr, x + 8 * dpr, y); g.stroke();
    }
    for (let i = 0; i < 30; i++) {
      const x = r.range(0.78, 0.98) * w, y = r.range(0.04, 0.4) * h;
      g.beginPath(); g.moveTo(x - 6 * dpr, y + 6 * dpr); g.lineTo(x, y - 6 * dpr); g.lineTo(x + 6 * dpr, y + 6 * dpr); g.stroke();
    }
    g.fillStyle = 'rgba(60,35,15,0.75)'; g.textAlign = 'center';
    g.font = '800 ' + Math.round(17 * dpr) + 'px Cinzel, serif';
    g.fillText('GREENVALE', w * 0.2, h * 0.92); g.fillText('THE SUNSCAR', w * 0.62, h * 0.96); g.fillText('CANTOR\'S GATE', w * 0.86, h * 0.06 + 14 * dpr);
    // speckle + edge burn
    for (let i = 0; i < 1600; i++) { g.fillStyle = 'rgba(80,50,20,' + r.range(0.02, 0.08) + ')'; g.fillRect(r() * w, r() * h, 1.5 * dpr, 1.5 * dpr); }
    const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    v.addColorStop(0, 'rgba(80,40,10,0)'); v.addColorStop(1, 'rgba(70,35,10,0.55)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
    // compass
    g.save(); g.translate(w * 0.92, h * 0.86); g.strokeStyle = 'rgba(60,35,15,0.7)'; g.fillStyle = 'rgba(120,30,20,0.7)';
    g.beginPath(); g.moveTo(0, -18 * dpr); g.lineTo(5 * dpr, 0); g.lineTo(0, 18 * dpr); g.lineTo(-5 * dpr, 0); g.closePath(); g.fill(); g.stroke();
    g.font = '800 ' + Math.round(10 * dpr) + 'px Cinzel, serif'; g.fillStyle = 'rgba(60,35,15,0.9)'; g.fillText('N', 0, -22 * dpr); g.restore();
    return c;
  }
  UI.mapClick = function (ev) {
    const c = $('mapCv'), rc = c.getBoundingClientRect();
    const dpr = c.width / rc.width;
    const x = (ev.clientX - rc.left) * dpr, y = (ev.clientY - rc.top) * dpr;
    let best = null, bd = 40 * dpr;
    for (const n of UI.mapNodes(c.width, c.height)) { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n; } }
    if (best) { M.sel = best.i; BB.sfx('click'); UI.renderBrief(); }
  };
  UI.renderBrief = function () {
    const S = BB.save, box = $('brief'); box.innerHTML = '';
    const team = S.team.map(UI.heroById).filter(Boolean);
    if (M.sel === 'endless') {
      box.appendChild(el('h3', '', 'The Endless Gate'));
      box.appendChild(el('p', '', 'Gates without end. Every wave is stronger than the last; every fifth brings a warden of the dead. How long can your banner stand?'));
      box.appendChild(el('div', 'gold', 'Best: wave ' + (S.endlessBest || 0)));
    } else {
      const m = BB.MISSIONS[M.sel], unlocked = BB.missionUnlocked(S, M.sel);
      const R = BB.REGIONS.find((r) => r.id === m.region);
      box.appendChild(el('div', 'lbl', R.name + ' · Mission ' + (M.sel + 1)));
      box.appendChild(el('h3', '', esc(m.name)));
      box.appendChild(el('p', '', unlocked ? esc(m.brief) : '<span class="mute">Clear the previous mission to march here.</span>'));
      const type = { rout: 'Rout every wave', gates: 'Destroy ' + m.gates + ' Gravegate' + (m.gates > 1 ? 's' : ''), defend: 'Defend for ' + m.time + ' s', boss: 'Boss battle', duel: 'Duel' }[m.type];
      box.appendChild(el('div', 'gold', '<span style="font-size:14px">⚔ ' + type + ' · Foe level ' + BB.foeLevel(m, team) + (S.cleared[m.id] ? ' · <span style="color:#6fdc7b">Cleared</span>' : '') + '</span>'));
      const kinds = []; m.waves.forEach((w) => { for (let i = 0; i < w.length; i += 2) if (!kinds.includes(w[i])) kinds.push(w[i]); });
      if (m.boss) kinds.unshift(m.boss);
      const fs = el('div', 'foes');
      for (const k of kinds) {
        const Fd = BB.FOES[k]; let cv;
        if (Fd.art) cv = copyCanvas(BB.foePortrait(Fd.art, Fd.tint || '', 42)); else { cv = document.createElement('canvas'); cv.width = cv.height = 42; const gg = cv.getContext('2d'); BB.drawFx(gg, 'turret', 0, 21, 26, 0.6); }
        cv.title = Fd.name; fs.appendChild(cv);
      }
      box.appendChild(fs);
      if (m.recruit && !S.cleared[m.id]) box.appendChild(el('div', '', '<span style="color:#9fe0ff;font-size:14px">★ A legendary hero may join: ' + esc(BB.LEGENDS[m.recruit].name) + '</span>'));
      box.appendChild(el('div', 'mute', '<span style="font-size:13px">Reward: <span class="coin">' + m.reward.gold + '</span>+ gold, gear, experience</span>'));
    }
    box.appendChild(el('div', 'lbl', 'Marching'));
    const tr = el('div', 'row');
    for (const h of team) { const c = copyCanvas(BB.portrait(h, 48)); c.style.cssText = 'width:42px;height:42px;border-radius:6px;background:rgba(0,0,0,.35);image-rendering:pixelated'; tr.appendChild(c); }
    const edit = el('button', 'btn dark sm', 'Change'); click(edit, () => UI.openWarband()); tr.appendChild(edit);
    box.appendChild(tr);
    const go = el('button', 'btn', 'Deploy ▸'); go.style.marginTop = 'auto';
    go.disabled = !team.length || (M.sel !== 'endless' && !BB.missionUnlocked(S, M.sel));
    click(go, () => BB.deploy(M.sel));
    box.appendChild(go);
  };

  // ---------------------------------------------------------------- story cards
  UI.story = function (lines, done) {
    if (!lines || !lines.length) { done && done(); return; }
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

  // ---------------------------------------------------------------- results
  UI.results = function (res, onContinue, onRetry) {
    const body = $('resBody'); body.innerHTML = '';
    body.appendChild(el('h2', '', '<span style="color:' + (res.win ? '#e8c66a' : '#ff7a6a') + ';font-size:28px">' + (res.win ? 'Victory' : 'Defeat') + '</span> <span class="mute" style="font-size:15px">' + esc(res.title) + '</span>'));
    if (!res.win) body.appendChild(el('div', 'mute', esc(res.why || '') + ' — nothing is lost. Heroes keep the experience they earned. Re-equip, train, and march again.'));
    const g = el('div', 'resgrid');
    for (const r of res.heroes) {
      const c = el('div', 'reshero');
      c.appendChild(copyCanvas(BB.portrait(r.hero, 56)));
      c.appendChild(el('div', '', '<b>' + esc(r.hero.name.split(' ')[0]) + '</b>'));
      c.appendChild(el('div', 'mute', '+' + r.xp + ' XP'));
      c.appendChild(el('div', 'xpbar', '<i style="width:' + (r.hero.level >= BB.MAX_LEVEL ? 100 : Math.round(r.hero.xp / BB.xpNext(r.hero.level) * 100)) + '%"></i>'));
      if (r.levels.length) c.appendChild(el('div', 'lvup', 'LEVEL ' + r.hero.level + '!'));
      g.appendChild(c);
    }
    body.appendChild(g);
    const line = el('div', 'row'); line.style.flexWrap = 'wrap';
    line.appendChild(el('span', 'pill coin', '+' + res.gold));
    line.appendChild(el('span', 'pill', '☠ ' + res.kills + ' slain'));
    if (res.endlessWave) line.appendChild(el('span', 'pill', 'Wave ' + res.endlessWave));
    if (res.bench) line.appendChild(el('span', 'pill mute', 'Bench heroes +' + res.bench + ' XP'));
    body.appendChild(line);
    if (res.items && res.items.length) {
      body.appendChild(el('div', 'lbl', 'Spoils'));
      const inv = el('div', 'inv');
      for (const it of res.items) {
        const b = el('div', 'item'); const ic = el('div', 'ico'); ic.appendChild(UI.itemIcon(it, 30)); b.appendChild(ic);
        b.appendChild(el('div', 'grow', '<span style="color:' + BB.RARITY[it.rarity].color + '">' + esc(it.name) + '</span> <span class="mute" style="font-size:11px">' + BB.RARITY[it.rarity].name + ' ' + BB.SLOT_NAME[it.slot] + '</span><div class="st">' + UI.statLine(it.stats) + '</div>'));
        inv.appendChild(b);
      }
      body.appendChild(inv);
    }
    if (res.recruit) body.appendChild(el('div', '', '<span style="color:#9fe0ff;font-size:16px;font-weight:800">★ ' + esc(BB.LEGENDS[res.recruit].name) + ', ' + esc(BB.LEGENDS[res.recruit].title) + ', joins the warband!</span>'));
    const row = el('div', 'row'); row.style.justifyContent = 'flex-end';
    if (onRetry) { const b = el('button', 'btn dark', 'Retry'); click(b, () => { UI.modal('mResults', false); onRetry(); }); row.appendChild(b); }
    const c = el('button', 'btn', 'Continue'); click(c, () => { UI.modal('mResults', false); onContinue(); }); row.appendChild(c);
    body.appendChild(row);
    UI.modal('mResults');
  };
})();
