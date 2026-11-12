// Bannerborn — the hero screen. The hero stands in the muster itself: the camera closes in on whoever was called
// forward, with their gear on either side of them, and beside them a page of three leaves: Growth (level, stars,
// what they do), Gear (the four pieces, and the armoury for each) and Skills (the tree).
(function () {
  const BB = window.BB, UI = BB.UI, $ = UI.$, el = UI.el, esc = UI.esc, click = UI.click, fmt = UI.fmt;
  const HS = UI.hs = { id: null, tab: 'grow', slot: null, node: null, sig: '', pop: null };
  const RC = ['#c4ccd8', '#4da3ff', '#b57cff', '#ffae2b'], ACC = '#ffbe55';
  const SVG = (d, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + (extra || '') + '</svg>';
  const ICO = {
    hp: SVG('<path d="M12 20s-7-4.6-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.4-7 10-7 10z" fill="currentColor"/>'),
    atk: SVG('<path d="M20 4L9 15M7 13l4 4M4 20l3-3M20 4h-3M20 4v3"/>'),
    def: SVG('<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" fill="currentColor"/>'),
  };
  const SLOT_GLYPH = { weapon: SVG('<path d="M20 4L9 15M7 13l4 4M4 20l3-3"/>'), chest: SVG('<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/>'), head: SVG('<path d="M4 17V8l4 4 4-7 4 7 4-4v9z"/>'), charm: SVG('<path d="M12 2l2.6 6.6L21 11l-6.4 2.4L12 20l-2.6-6.6L3 11l6.4-2.4z"/>') };

  // procedural icons for the tree's nodes, centred on (x, y), fitting radius r
  function icon(g, name, x, y, r, col) {
    g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1.5, r * 0.14); g.lineCap = 'round'; g.lineJoin = 'round';
    const k = r / 10;
    const star = (n, r1, r2) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r2 : r1; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill(); };
    switch (name) {
      case 'sword': g.beginPath(); g.moveTo(-6 * k, 6 * k); g.lineTo(7 * k, -7 * k); g.stroke(); g.beginPath(); g.moveTo(-6 * k, 1 * k); g.lineTo(-1 * k, 6 * k); g.stroke(); g.beginPath(); g.moveTo(-8 * k, 8 * k); g.lineTo(-5 * k, 5 * k); g.stroke(); break;
      case 'eye': g.beginPath(); g.moveTo(-9 * k, 0); g.quadraticCurveTo(0, -8 * k, 9 * k, 0); g.quadraticCurveTo(0, 8 * k, -9 * k, 0); g.stroke(); g.beginPath(); g.arc(0, 0, 2.8 * k, 0, 7); g.fill(); break;
      case 'bolt': g.beginPath(); g.moveTo(2 * k, -9 * k); g.lineTo(-5 * k, 1 * k); g.lineTo(0, 1 * k); g.lineTo(-2 * k, 9 * k); g.lineTo(5 * k, -1 * k); g.lineTo(0, -1 * k); g.closePath(); g.fill(); break;
      case 'skull': g.beginPath(); g.arc(0, -1.5 * k, 7 * k, Math.PI * 0.85, Math.PI * 2.15); g.lineTo(4 * k, 7 * k); g.lineTo(-4 * k, 7 * k); g.closePath(); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(-2.7 * k, -1 * k, 1.9 * k, 0, 7); g.arc(2.7 * k, -1 * k, 1.9 * k, 0, 7); g.fill(); break;
      case 'heart': g.beginPath(); g.moveTo(0, 8 * k); g.bezierCurveTo(-11 * k, 0, -6 * k, -9 * k, 0, -4 * k); g.bezierCurveTo(6 * k, -9 * k, 11 * k, 0, 0, 8 * k); g.fill(); break;
      case 'shield': g.beginPath(); g.moveTo(0, -9 * k); g.lineTo(7 * k, -6 * k); g.lineTo(7 * k, 0); g.quadraticCurveTo(6 * k, 6 * k, 0, 9 * k); g.quadraticCurveTo(-6 * k, 6 * k, -7 * k, 0); g.lineTo(-7 * k, -6 * k); g.closePath(); g.fill(); break;
      case 'drop': g.beginPath(); g.moveTo(0, -9 * k); g.quadraticCurveTo(7 * k, 1 * k, 6 * k, 3 * k); g.arc(0, 3 * k, 6 * k, 0, Math.PI); g.quadraticCurveTo(-7 * k, 1 * k, 0, -9 * k); g.fill(); break;
      case 'ankh': g.beginPath(); g.ellipse(0, -4.5 * k, 3.5 * k, 4.5 * k, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 9 * k); g.moveTo(-6 * k, 1.5 * k); g.lineTo(6 * k, 1.5 * k); g.stroke(); break;
      case 'star': star(5, 9 * k, 3.8 * k); break;
      case 'spark': star(4, 9.5 * k, 2.6 * k); break;
      case 'flag': g.beginPath(); g.moveTo(-5 * k, 9 * k); g.lineTo(-5 * k, -9 * k); g.stroke(); g.beginPath(); g.moveTo(-5 * k, -8 * k); g.lineTo(7 * k, -5 * k); g.lineTo(-5 * k, -1 * k); g.closePath(); g.fill(); break;
      case 'crown': g.beginPath(); g.moveTo(-8 * k, 5 * k); g.lineTo(-8 * k, -5 * k); g.lineTo(-4 * k, 0); g.lineTo(0, -7 * k); g.lineTo(4 * k, 0); g.lineTo(8 * k, -5 * k); g.lineTo(8 * k, 5 * k); g.closePath(); g.fill(); break;
      case 'weave': g.beginPath(); g.arc(-3 * k, 0, 5 * k, 0, 7); g.stroke(); g.beginPath(); g.arc(3 * k, 0, 5 * k, 0, 7); g.stroke(); break;
      case 'lock': g.beginPath(); g.arc(0, -3 * k, 4.5 * k, Math.PI, 0); g.stroke(); g.beginPath(); g.rect(-6.5 * k, -3 * k, 13 * k, 11 * k); g.fill(); break;
      default: g.beginPath(); g.arc(0, 0, 6 * k, 0, 7); g.fill();
    }
    g.restore();
  }
  const nodeIcon = (name, col) => { const c = document.createElement('canvas'); c.width = c.height = 56; icon(c.getContext('2d'), name, 28, 28, 15, col); return c; };

  // ---------------------------------------------------------------- state
  const hero = () => BB.save && BB.save.heroes.find((x) => x.id === HS.id);
  const sorted = () => BB.save.heroes.slice().sort((a, b) => BB.power(b) - BB.power(a));
  const save = () => { BB.persist(); UI.refreshTop(); };
  const show = (kind, hue) => { if (BB.musterShow) BB.musterShow(kind, hue); };
  UI.openHero = function (id, tab) {
    HS.id = id; HS.slot = null; HS.node = null; if (tab) HS.tab = tab;
    if (UI.heroSelSet) UI.heroSelSet(id);
    UI.show('hero'); UI.renderHero(); if (BB.sceneFor) BB.sceneFor('hero');
  };
  UI.heroStep = function (d) {
    const list = sorted(), i = list.findIndex((x) => x.id === HS.id); HS.id = list[(i + d + list.length) % list.length].id; HS.slot = null; HS.node = null;
    if (UI.heroSelSet) UI.heroSelSet(HS.id); if (BB.musterSelect) BB.musterSelect(HS.id);
    BB.sfx('click'); UI.renderHero();
  };
  UI.pickGear = function (h, slot) { HS.slot = slot; UI.openHero(h.id, 'gear'); HS.slot = slot; UI.renderHero(); };
  // the page is redrawn when something it shows changes under it (a battle's experience, a purchase)
  const sigOf = (h) => [h.id, h.level, h.xp || 0, h.stars, BB.save.sigils, BB.save.inventory.length, BB.save.leader, BB.talentSpent(h), BB.SLOTS.map((s) => (h.gear[s] ? h.gear[s].name + (h.gear[s].plus || '') : '')).join()].join('|');
  UI.heroRender = function () { const h = hero(); if (h && HS.sig !== sigOf(h)) UI.renderHero(); };

  // ---------------------------------------------------------------- pieces
  const statWords = { atk: 'ATK', hp: 'HP', def: 'DEF', crit: 'CRIT', spd: 'SPD' };
  const statVal = (k, v) => (k === 'crit' || k === 'spd' ? Math.round(v * 100) + '%' : k === 'hp' ? Math.round(v) : UI.num ? UI.num(k, v) : Math.round(v));
  function deltas(it, cur) { // what changing to this piece does, stat by stat
    const a = BB.itemStats(it), b = cur ? BB.itemStats(cur) : {}, out = [];
    for (const k in statWords) { const d = (a[k] || 0) - (b[k] || 0); if (Math.abs(d) < 1e-6) continue; out.push('<i class="' + (d > 0 ? 'up' : 'dn') + '">' + statWords[k] + ' ' + (d > 0 ? '+' : '−') + statVal(k, Math.abs(d)) + '</i>'); }
    return out.join('');
  }
  const bestInBag = (h, slot) => { const cur = h.gear[slot], sc = cur ? BB.itemScore(cur) : 0; let best = 0; for (const it of BB.save.inventory) if (it.slot === slot && BB.canEquip(h, it)) best = Math.max(best, BB.itemScore(it) - sc); return best; };
  function itemPlate(it, size) {
    const d = el('div', 'it hx-it' + (it ? '' : ' none')); d.style.setProperty('--ic', it ? BB.RARITY[it.rarity].color : 'rgba(255,255,255,.25)');
    if (it) { d.appendChild(UI.itemIcon(it, size || 64)); if (it.plus) d.appendChild(el('span', 'plus', '+' + it.plus)); }
    return d;
  }
  const itemText = (it) => '<b style="color:' + BB.RARITY[it.rarity].color + '">' + esc(it.name) + (it.plus ? ' +' + it.plus : '') + '</b><span>' + BB.RARITY[it.rarity].name + ' · ' + UI.statLine(BB.itemStats(it)) + '</span>' +
    (it.ench ? '<em style="color:' + BB.ECOL[it.ench][1] + '">✦ ' + BB.ELEMENTS[it.ench].name + ' · ' + esc(BB.ENCH[it.ench].desc) + '</em>' : '');
  function equip(h, slot, it) {
    const S = BB.save, cur = h.gear[slot];
    S.inventory.splice(S.inventory.indexOf(it), 1); if (cur) S.inventory.push(cur); h.gear[slot] = it;
    if (it.ench) { BB.sfx('enchant'); UI.toast(it.name + ' · ' + BB.ELEMENTS[it.ench].name + ' enchant'); } else BB.sfx('forge');
    show('equip', { fire: 20, frost: 200, storm: 55, venom: 110, holy: 45, shadow: 280 }[it.ench]);
    HS.slot = null; HS.pop = 'sock-' + slot; save(); UI.renderHero();
  }

  // ---------------------------------------------------------------- the page
  UI.renderHero = function () {
    const S = BB.save, h = hero(); if (!h || !$('hxBody')) return;
    HS.sig = sigOf(h);
    const C = BB.CALLINGS[h.calling], R = BB.HERO_RARITY[h.rarity || 0], col = RC[h.rarity || 0], I = BB.identityOf ? BB.identityOf(h) : null;
    const scr = $('hero'); scr.style.setProperty('--rc', col);
    // who they are
    $('hxId').innerHTML = '<div class="rk">' + R.name + (h.legend ? ' · Legend' : h.captain ? ' · Banner-Captain' : '') + '</div><h1>' + esc(h.name) + '</h1>' +
      '<div class="cl">' + UI.callIcon(h.calling) + (I ? '<b style="color:' + BB.CLASSES[I.cls].col + '">' + BB.CLASSES[I.cls].name + '</b> · ' + BB.TEMPERS[I.temper].name + ' · ' + C.name : C.name + ' · ' + C.role) + '</div>' +
      '<div class="stars' + (HS.pop === 'stars' ? ' pop' : '') + '">' + '<i class="on">★</i>'.repeat(h.stars) + '<i>★</i>'.repeat(BB.MAX_STARS - h.stars) + '</div>';
    // their gear, either side of them
    const socks = $('hxSocks'); socks.innerHTML = ''; socks.className = 'hx-socks' + (HS.pop === 'socks' ? ' pop' : '');
    BB.SLOTS.forEach((slot, i) => {
      const it = h.gear[slot], b = el('button', 'hx-sock s' + i + (HS.tab === 'gear' && HS.slot === slot ? ' on' : '') + (HS.pop === 'sock-' + slot ? ' pop' : '')); b.dataset.r = 'sock-' + slot;
      b.style.setProperty('--ic', it ? BB.RARITY[it.rarity].color : 'rgba(255,255,255,.3)');
      const face = el('span', 'face' + (it ? '' : ' none')); if (it) { face.appendChild(UI.itemIcon(it, 64)); if (it.plus) face.appendChild(el('span', 'plus', '+' + it.plus)); } else face.innerHTML = SLOT_GLYPH[slot];
      b.appendChild(face); b.appendChild(el('small', '', BB.SLOT_NAME[slot]));
      if (bestInBag(h, slot) > 0) b.appendChild(el('i', 'dot'));
      click(b, () => { HS.tab = 'gear'; HS.slot = slot; BB.sfx('click'); UI.renderHero(); });
      socks.appendChild(b);
    });
    const list = sorted(), idx = list.findIndex((x) => x.id === h.id);
    $('hxPow').textContent = BB.power(h).toLocaleString(); $('hxIdx').textContent = (idx + 1) + ' / ' + list.length;
    $('hxPrev').style.visibility = $('hxNext').style.visibility = list.length > 1 ? '' : 'hidden';
    // the leaves
    const tabs = $('hxTabs'); tabs.innerHTML = '';
    const free = BB.talentFree(h), better = BB.SLOTS.some((s) => bestInBag(h, s) > 0);
    for (const [id, label, badge] of [['grow', 'Growth', 0], ['gear', 'Gear', better ? '!' : 0], ['tree', 'Skills', free]]) {
      const b = el('button', 'hx-tab' + (HS.tab === id ? ' on' : ''), label + (badge ? '<i>' + badge + '</i>' : '')); b.dataset.r = 'tab-' + id;
      click(b, () => { HS.tab = id; HS.slot = null; BB.sfx('click'); UI.renderHero(); }); tabs.appendChild(b);
    }
    tabs.appendChild(el('div', 'grow'));
    const back = el('button', 'btn dark sm', '‹ Heroes'); back.dataset.r = 'back'; click(back, () => UI.go('heroes')); tabs.appendChild(back);
    const body = $('hxBody'), keep = body.dataset.leaf === HS.tab + (HS.slot || '') ? body.scrollTop : 0;
    body.innerHTML = ''; body.dataset.leaf = HS.tab + (HS.slot || ''); body.className = 'hx-body scroll leaf-' + HS.tab;
    if (HS.tab === 'grow') leafGrowth(body, S, h, C, I); else if (HS.tab === 'gear') (HS.slot ? leafArmoury : leafGear)(body, S, h); else leafTree(body, S, h);
    body.scrollTop = keep; HS.pop = null;
  };

  // ---- Growth: level and experience, stars and ascension, what they are made of, what they do
  function leafGrowth(body, S, h, C, I) {
    const cap = BB.levelCap(h), st = BB.heroStats(h), capped = h.level >= cap, need = BB.xpNeed(h), xp = Math.min(h.xp || 0, need), fr = capped ? 1 : xp / need;
    const nx = h.level < cap ? BB.heroStats(Object.assign({}, h, { level: h.level + 1 })) : null, nm = esc(BB.shortName(h)), maxS = h.stars >= BB.MAX_STARS, ac = BB.ascendCost(h);
    const lv = el('div', 'hx-lv' + (HS.pop === 'level' ? ' pop' : ''),
      '<div class="ring" style="--p:' + fr.toFixed(3) + '"><span><b>' + h.level + '</b><small>of ' + cap + '</small></span></div>' +
      '<div class="grow"><div class="lbl">' + (capped ? 'Level cap' : 'Experience') + '<span>' + (capped ? (maxS ? 'fully grown' : 'ascend to keep growing') : fmt(xp) + ' / ' + fmt(need)) + '</span></div><div class="xbar"><i style="width:' + Math.round(fr * 100) + '%"></i></div>' +
      '<div class="hint">' + (capped ? 'Experience waits for the next star.' : 'Every level gives a skill point.') + '</div></div>');
    body.appendChild(lv);
    const asc = el('div', 'hx-asc', '<div class="st5">' + '<i class="on">★</i>'.repeat(h.stars) + '<i>★</i>'.repeat(BB.MAX_STARS - h.stars) + '</div><div class="grow"><b>' + (maxS ? 'Fully ascended' : 'Ascension') + '</b><small>' + (maxS ? 'No star left to earn.' : 'The next star raises the level cap to ' + BB.levelCap(Object.assign({}, h, { stars: h.stars + 1 })) + '.') + '</small></div>');
    const ab = el('button', 'btn blue', maxS ? 'Max stars' : 'Ascend<span class="cost">✧ ' + S.sigils + ' / ' + ac + '</span>'); ab.dataset.r = 'asc'; ab.disabled = maxS || S.sigils < ac;
    click(ab, () => { if (!BB.ascend(S, h)) return; BB.sfx('rally'); show('cheer', 210); HS.pop = 'stars'; UI.toast(h.name + ' rises to ' + h.stars + ' stars'); save(); UI.renderHero(); });
    asc.appendChild(ab); body.appendChild(asc);
    const big = (k, name, v, plus, c) => '<div class="st" style="--c:' + c + '">' + ICO[k] + '<small>' + name + '</small><b>' + v + '</b>' + '' + '</div>';
    body.appendChild(el('div', 'hx-stats', big('hp', 'Health', fmt(Math.round(st.hp)), nx && Math.round(nx.hp - st.hp), '#ff6b6b') + big('atk', 'Attack', Math.round(st.atk), nx && Math.round(nx.atk - st.atk), '#ffbe55') + big('def', 'Defence', Math.round(st.def), nx && Math.round(nx.def - st.def), '#5aa8ff')));
    body.appendChild(el('div', 'hx-minor', '<span>Crit <b>' + Math.round(st.crit * 100) + '%</b></span><span>Attack speed <b>' + st.aspd.toFixed(2) + '</b></span><span>Range <b>' + (C.ranged ? 'Far' : 'Melee') + '</b></span>'));
    const abil = (cls, kind, title, name, desc, r) => { const d = el('div', 'hx-abil ' + cls, '<div class="grow"><small>' + title + '</small><b>' + esc(name) + '</b><p>' + esc(desc) + '</p></div>'); const b = el('button', 'play', '▶'); b.dataset.r = r; b.title = 'Watch'; click(b, () => { BB.sfx('click'); show(kind, cls === 'u' ? 275 : 40); }); d.insertBefore(b, d.firstChild); return d; };
    body.appendChild(abil('u', 'ult', 'Ultimate', C.skill.name, C.skill.desc, 'show-ult'));
    if (I) {
      const S2 = BB.SIGNATURES[I.sig], T2 = BB.TEMPERS[I.temper];
      body.appendChild(abil('s', 'sig', 'Signature · every 10 s or so', S2.name, S2.line.charAt(0).toUpperCase() + S2.line.slice(1) + '.', 'show-sig'));
      body.appendChild(el('p', 'hx-temper', '<b>' + T2.name + '</b> — ' + esc(T2.line(BB.shortName(h))) + (BB.ENTRANCES && BB.ENTRANCES[I.entrance] ? ' <span>Entrance: ' + BB.ENTRANCES[I.entrance].name + '.</span>' : '')));
    }
    const row = el('div', 'row hx-end'), lead = el('button', 'btn dark sm', S.leader === h.id ? '✓ Shown at camp' : 'Show at camp'); lead.dataset.r = 'lead';
    click(lead, () => { S.leader = h.id; BB.sfx('click'); save(); UI.renderHero(); }); row.appendChild(lead); body.appendChild(row);
  }

  // ---- Gear: the four pieces they carry
  function leafGear(body, S, h) {
    const head = el('div', 'hx-gh', '<div class="sect grow">What ' + esc(BB.shortName(h)) + ' carries</div>'), eb = el('button', 'btn sm', 'Equip best'); eb.dataset.r = 'best';
    eb.disabled = !BB.SLOTS.some((s) => bestInBag(h, s) > 0);
    click(eb, () => { BB.equipBest(S, h); BB.sfx('forge'); show('equip'); HS.pop = 'socks'; save(); UI.renderHero(); });
    head.appendChild(eb); body.appendChild(head);
    for (const slot of BB.SLOTS) {
      const it = h.gear[slot], up = bestInBag(h, slot), n = S.inventory.filter((q) => q.slot === slot && BB.canEquip(h, q)).length;
      const b = el('button', 'hx-slot'); b.dataset.r = 'slot-' + slot; b.style.setProperty('--ic', it ? BB.RARITY[it.rarity].color : 'rgba(255,255,255,.22)');
      b.appendChild(itemPlate(it, 64));
      b.appendChild(el('div', 'grow txt', '<small>' + BB.SLOT_NAME[slot] + '</small>' + (it ? itemText(it) : '<b class="none">Empty</b><span>' + (n ? n + ' in the armoury would fit' : 'Stages, chests and the smith give gear') + '</span>')));
      b.appendChild(el('div', 'go', (up > 0 ? '<i class="up">▲ ' + up + ' better</i>' : n ? '<i>' + n + ' in the armoury</i>' : '') + '<u>›</u>'));
      click(b, () => { HS.slot = slot; BB.sfx('click'); UI.renderHero(); });
      body.appendChild(b);
    }
  }
  // ---- the armoury for one slot: what they wear now, and everything in the bag that would fit, with what it changes
  function leafArmoury(body, S, h) {
    const slot = HS.slot, cur = h.gear[slot];
    const head = el('div', 'hx-gh'), back = el('button', 'btn dark sm', '‹ Gear'); back.dataset.r = 'gear-back'; click(back, () => { HS.slot = null; BB.sfx('click'); UI.renderHero(); });
    head.appendChild(back); head.appendChild(el('div', 'sect grow', 'The armoury · ' + BB.SLOT_NAME[slot])); body.appendChild(head);
    const now = el('div', 'hx-slot cur'); now.style.setProperty('--ic', cur ? BB.RARITY[cur.rarity].color : 'rgba(255,255,255,.22)');
    now.appendChild(itemPlate(cur, 64)); now.appendChild(el('div', 'grow txt', '<small>Wearing now</small>' + (cur ? itemText(cur) : '<b class="none">Nothing</b>')));
    if (cur) { const off = el('button', 'btn dark sm', 'Take off'); off.dataset.r = 'unequip'; click(off, () => { S.inventory.push(cur); h.gear[slot] = null; BB.sfx('click'); save(); UI.renderHero(); }); now.appendChild(off); }
    body.appendChild(now);
    const list = S.inventory.filter((it) => it.slot === slot && BB.canEquip(h, it)).sort((a, b) => BB.itemScore(b) - BB.itemScore(a));
    if (!list.length) { body.appendChild(el('div', 'hx-empty', 'Nothing in the armoury for this slot yet.<br>Stages and chests drop gear, and the smith at the market sells it.')); return; }
    const box = el('div', 'hx-items');
    list.forEach((it, i) => {
      const diff = BB.itemScore(it) - (cur ? BB.itemScore(cur) : 0), b = el('button', 'hx-slot item'); b.dataset.r = 'item-' + i; b.style.setProperty('--ic', BB.RARITY[it.rarity].color);
      b.appendChild(itemPlate(it, 64));
      b.appendChild(el('div', 'grow txt', itemText(it) + '<div class="dl">' + deltas(it, cur) + '</div>'));
      b.appendChild(el('div', 'go', '<i class="' + (diff >= 0 ? 'up' : 'dn') + ' big">' + (diff >= 0 ? '▲ ' : '▼ ') + Math.abs(diff) + '</i><u>Equip</u>'));
      click(b, () => equip(h, slot, it));
      box.appendChild(b);
    });
    body.appendChild(box);
  }

  // ---- Skills: three branches of linked nodes, two bridges between them, a capstone at the foot of each
  const NX = (n) => 17 + n.x * 33, NY = (n) => 15 + n.y * 24.5;
  function leafTree(body, S, h) {
    const free = BB.talentFree(h), spent = BB.talentSpent(h);
    const head = el('div', 'hx-gh', '<div class="pts' + (free ? ' has' : '') + '"><b>' + free + '</b><span>skill point' + (free === 1 ? '' : 's') + ' to spend<small>' + spent + ' spent · one a level</small></span></div><div class="grow"></div>');
    const rs = el('button', 'btn dark sm', 'Reset'); rs.dataset.r = 'reset'; rs.disabled = !spent; click(rs, () => { BB.resetTalents(h); HS.node = null; BB.sfx('click'); save(); UI.renderHero(); }); head.appendChild(rs); body.appendChild(head);
    const tree = el('div', 'hx-tree');
    let lines = '';
    for (const n of BB.TREE) for (const q of n.req || []) {
      const a = BB.TREE_BY_ID[q], ra = BB.talentRank(h, q) > 0, rb = BB.talentRank(h, n.id) > 0, c = n.b >= 0 ? BB.TREE_BRANCHES[n.b].col : ACC;
      lines += '<line x1="' + NX(a) + '" y1="' + NY(a) + '" x2="' + NX(n) + '" y2="' + NY(n) + '" class="' + (rb ? 'lit' : ra ? 'half' : '') + '" style="--c:' + c + '"/>';
    }
    tree.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none">' + lines + '</svg>';
    BB.TREE_BRANCHES.forEach((b, i) => { const t = el('div', 'bh', b.name); t.style.left = (17 + i * 33) + '%'; t.style.color = b.col; tree.appendChild(t); });
    for (const n of BB.TREE) {
      const rank = BB.talentRank(h, n.id), open = BB.talentOpen(h, n), can = BB.canLearn(h, n.id), c = n.b >= 0 ? BB.TREE_BRANCHES[n.b].col : ACC;
      const b = el('button', 'nd' + (rank ? ' got' : '') + (rank >= n.max ? ' full' : '') + (open || rank ? '' : ' shut') + (can ? ' can' : '') + (n.cap ? ' cap' : '') + (n.b < 0 ? ' bridge' : '') + (HS.node === n.id ? ' sel' : '') + (HS.pop === 'node-' + n.id ? ' pop' : ''));
      b.dataset.r = 'node-' + n.id; b.style.left = NX(n) + '%'; b.style.top = NY(n) + '%'; b.style.setProperty('--c', c);
      const face = el('span', 'face'); face.appendChild(nodeIcon(open || rank ? n.icon : 'lock', rank ? '#0b0e15' : open ? c : 'rgba(255,255,255,.3)')); b.appendChild(face);
      if (n.max > 1) b.appendChild(el('span', 'pips', '<i class="on"></i>'.repeat(rank) + '<i></i>'.repeat(n.max - rank)));
      click(b, () => { HS.node = n.id; BB.sfx('click'); UI.renderHero(); });
      tree.appendChild(b);
    }
    body.appendChild(tree);
    const sel = HS.node && BB.TREE_BY_ID[HS.node], info = el('div', 'hx-node');
    if (sel) {
      const r = BB.talentRank(h, sel.id), c = sel.b >= 0 ? BB.TREE_BRANCHES[sel.b].col : ACC, open = BB.talentOpen(h, sel), can = BB.canLearn(h, sel.id);
      const now = r ? BB.talentDesc(sel, r) : '', next = r < sel.max ? BB.talentDesc(sel, r + 1) : '';
      info.style.setProperty('--c', c);
      info.appendChild(el('div', 'grow', '<b>' + esc(BB.talentName(sel, h)) + '</b><small>Rank ' + r + ' of ' + sel.max + (sel.cap ? ' · capstone' : sel.b < 0 ? ' · bridge' : '') + '</small><p>' + (r < sel.max ? (r ? 'Now ' + now + '. ' : '') + 'Next: ' + next + '.' : 'Mastered: ' + now + '.') + (!open && !r ? ' <span>Learn the node above it first.</span>' : '') + '</p>'));
      const lb = el('button', 'btn', r >= sel.max ? 'Mastered' : !open ? 'Locked' : 'Learn<span class="cost">1 point</span>'); lb.dataset.r = 'learn'; lb.disabled = !can;
      click(lb, () => { if (!BB.learn(h, sel.id)) return; BB.sfx('levelup'); show('learn', { '#ff7a59': 15, '#5aa8ff': 210, '#b57cff': 275 }[c] || 45); HS.pop = 'node-' + sel.id; save(); UI.renderHero(); });
      info.appendChild(lb);
    } else info.appendChild(el('div', 'grow hint', free ? 'Tap a glowing node to see what it gives, then learn it.' : 'Win battles with this hero to earn skill points.'));
    body.appendChild(info);
  }

  // ---------------------------------------------------------------- fixed controls
  if ($('hxPrev')) {
    click($('hxPrev'), () => UI.heroStep(-1)); click($('hxNext'), () => UI.heroStep(1));
    $('hxStage').addEventListener('click', (ev) => { if (ev.target.closest('button')) return; BB.audioUnlock(); show('flourish'); }); // tap the hero: they show off
  }
})();
