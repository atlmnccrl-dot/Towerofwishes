// Bannerborn — the hero screen, drawn as a game screen on its own canvas: the hero on a stage, gear sockets,
// attributes with level-up and ascension, and the skill tree. Everything here is painted and hit-tested by hand.
(function () {
  const BB = window.BB, UI = BB.UI;
  const DW = 1000, DH = 560; // design space; scaled to fit the canvas
  const HS = UI.hs = { id: null, tab: 'attr', sel: null, pick: null, t: 0, parts: [], floats: [], regions: [], press: null, hover: null, holdT: 0, flash: 0, S: 1, ox: 0, oy: 0, dpr: 1 };
  const FONT_H = 'Outfit, system-ui, sans-serif', FONT_B = 'Inter, system-ui, sans-serif';
  const RC = ['#c4ccd8', '#4da3ff', '#b57cff', '#ffae2b'];
  const ACC = '#ffbe55';

  // ---------------------------------------------------------------- drawing kit
  const chamfer = (g, x, y, w, h, c) => { g.beginPath(); g.moveTo(x + c, y); g.lineTo(x + w - c, y); g.lineTo(x + w, y + c); g.lineTo(x + w, y + h - c); g.lineTo(x + w - c, y + h); g.lineTo(x + c, y + h); g.lineTo(x, y + h - c); g.lineTo(x, y + c); g.closePath(); };
  const rrect = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  function text(g, s, x, y, size, o) {
    o = o || {};
    g.font = (o.w || 600) + ' ' + size + 'px ' + (o.body ? FONT_B : FONT_H);
    g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
    if (o.ls) g.letterSpacing = o.ls + 'px';
    if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = o.blur || 12; }
    g.fillStyle = o.col || '#f3f5f9'; g.fillText(s, x, y);
    g.shadowBlur = 0; if (o.ls) g.letterSpacing = '0px';
    return g.measureText(s).width;
  }
  function panel(g, x, y, w, h, o) {
    o = o || {};
    chamfer(g, x, y, w, h, o.c || 14);
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(22,27,39,0.94)'); gr.addColorStop(1, 'rgba(11,13,20,0.94)');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = 1; g.stroke();
    if (o.accent) { g.fillStyle = o.accent; g.fillRect(x + (o.c || 14), y, Math.min(70, w * 0.3), 2); }
  }
  function region(id, x, y, w, h, fn, o) { HS.regions.push(Object.assign({ id, x, y, w, h, fn }, o || {})); }
  const isDown = (id) => HS.press === id, isHover = (id) => HS.hover === id;
  // a game button: chamfered, lit from above, sinks when pressed; hold-to-repeat when asked
  function button(g, id, x, y, w, h, label, o) {
    o = o || {};
    const dis = !!o.disabled, down = isDown(id) && !dis, hov = isHover(id) && !dis;
    const kind = o.kind || 'gold';
    const off = down ? 2 : 0;
    g.save(); g.translate(0, off);
    if (!dis && kind !== 'ghost') { g.shadowColor = kind === 'blue' ? 'rgba(80,150,255,0.55)' : 'rgba(255,170,60,0.55)'; g.shadowBlur = hov ? 26 : 16; g.shadowOffsetY = down ? 2 : 6; }
    chamfer(g, x, y, w, h, Math.min(12, h * 0.28));
    let gr = g.createLinearGradient(0, y, 0, y + h);
    if (dis) { gr.addColorStop(0, '#3a3f4a'); gr.addColorStop(1, '#262a33'); }
    else if (kind === 'gold') { gr.addColorStop(0, hov ? '#ffe0a0' : '#ffd27e'); gr.addColorStop(0.55, '#ffae3d'); gr.addColorStop(1, '#e5871e'); }
    else if (kind === 'blue') { gr.addColorStop(0, hov ? '#a6dcff' : '#86ccff'); gr.addColorStop(0.55, '#3d86f0'); gr.addColorStop(1, '#2a62c8'); }
    else { gr.addColorStop(0, hov ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)'); gr.addColorStop(1, 'rgba(255,255,255,0.04)'); }
    g.fillStyle = gr; g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.strokeStyle = kind === 'ghost' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.stroke();
    if (!dis && kind !== 'ghost') { g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, w, h * 0.42); g.restore(); }
    const tc = dis ? '#7b8291' : kind === 'gold' ? '#1b1206' : '#fff';
    const big = o.sub ? h * 0.3 : h * 0.36;
    text(g, label, x + w / 2, y + (o.sub ? h * 0.47 : h * 0.62), Math.round(big), { w: 800, align: 'center', col: tc, ls: 1.2 });
    if (o.sub) text(g, o.sub, x + w / 2, y + h * 0.8, Math.round(h * 0.21), { w: 600, align: 'center', col: dis ? '#6b7280' : kind === 'gold' ? 'rgba(27,18,6,0.75)' : 'rgba(255,255,255,0.85)', body: true });
    g.restore();
    region(id, x, y, w, h, o.fn, { hold: o.hold, disabled: dis });
  }
  // procedural icons, centred on (x, y), fitting radius r
  function icon(g, name, x, y, r, col) {
    g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1.5, r * 0.14); g.lineCap = 'round'; g.lineJoin = 'round';
    const k = r / 10;
    const star = (n, r1, r2) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r2 : r1; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill(); };
    switch (name) {
      case 'sword': g.beginPath(); g.moveTo(-6 * k, 6 * k); g.lineTo(7 * k, -7 * k); g.stroke(); g.beginPath(); g.moveTo(-6 * k, 1 * k); g.lineTo(-1 * k, 6 * k); g.stroke(); g.beginPath(); g.moveTo(-8 * k, 8 * k); g.lineTo(-5 * k, 5 * k); g.stroke(); break;
      case 'eye': g.beginPath(); g.moveTo(-9 * k, 0); g.quadraticCurveTo(0, -8 * k, 9 * k, 0); g.quadraticCurveTo(0, 8 * k, -9 * k, 0); g.stroke(); g.beginPath(); g.arc(0, 0, 2.8 * k, 0, 7); g.fill(); break;
      case 'bolt': g.beginPath(); g.moveTo(2 * k, -9 * k); g.lineTo(-5 * k, 1 * k); g.lineTo(0, 1 * k); g.lineTo(-2 * k, 9 * k); g.lineTo(5 * k, -1 * k); g.lineTo(0, -1 * k); g.closePath(); g.fill(); break;
      case 'skull': g.beginPath(); g.arc(0, -1.5 * k, 7 * k, Math.PI * 0.85, Math.PI * 2.15); g.lineTo(4 * k, 7 * k); g.lineTo(-4 * k, 7 * k); g.closePath(); g.fill(); g.fillStyle = '#0b0e15'; g.beginPath(); g.arc(-2.7 * k, -1 * k, 1.9 * k, 0, 7); g.arc(2.7 * k, -1 * k, 1.9 * k, 0, 7); g.fill(); break;
      case 'heart': g.beginPath(); g.moveTo(0, 8 * k); g.bezierCurveTo(-11 * k, 0, -6 * k, -9 * k, 0, -4 * k); g.bezierCurveTo(6 * k, -9 * k, 11 * k, 0, 0, 8 * k); g.fill(); break;
      case 'shield': g.beginPath(); g.moveTo(0, -9 * k); g.lineTo(7 * k, -6 * k); g.lineTo(7 * k, 0); g.quadraticCurveTo(6 * k, 6 * k, 0, 9 * k); g.quadraticCurveTo(-6 * k, 6 * k, -7 * k, 0); g.lineTo(-7 * k, -6 * k); g.closePath(); g.fill(); break;
      case 'drop': g.beginPath(); g.moveTo(0, -9 * k); g.quadraticCurveTo(7 * k, 1 * k, 6 * k, 3 * k); g.arc(0, 3 * k, 6 * k, 0, Math.PI); g.quadraticCurveTo(-7 * k, 1 * k, 0, -9 * k); g.fill(); break;
      case 'ankh': g.beginPath(); g.ellipse(0, -4.5 * k, 3.5 * k, 4.5 * k, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 9 * k); g.moveTo(-6 * k, 1.5 * k); g.lineTo(6 * k, 1.5 * k); g.stroke(); break;
      case 'star': star(5, 9 * k, 3.8 * k); break;
      case 'spark': star(4, 9.5 * k, 2.6 * k); break;
      case 'flag': g.beginPath(); g.moveTo(-5 * k, 9 * k); g.lineTo(-5 * k, -9 * k); g.stroke(); g.beginPath(); g.moveTo(-5 * k, -8 * k); g.lineTo(7 * k, -5 * k); g.lineTo(-5 * k, -1 * k); g.closePath(); g.fill(); break;
      case 'crown': g.beginPath(); g.moveTo(-8 * k, 5 * k); g.lineTo(-8 * k, -5 * k); g.lineTo(-4 * k, 0); g.lineTo(0, -7 * k); g.lineTo(4 * k, 0); g.lineTo(8 * k, -5 * k); g.lineTo(8 * k, 5 * k); g.closePath(); g.fill(); break;
      case 'weave': g.beginPath(); g.arc(-3 * k, 0, 5 * k, 0, 7); g.stroke(); g.beginPath(); g.arc(3 * k, 0, 5 * k, 0, 7); g.stroke(); break;
      case 'crit': g.beginPath(); g.arc(0, 0, 6.5 * k, 0, 7); g.stroke(); g.beginPath(); g.moveTo(0, -10 * k); g.lineTo(0, -3 * k); g.moveTo(0, 10 * k); g.lineTo(0, 3 * k); g.moveTo(-10 * k, 0); g.lineTo(-3 * k, 0); g.moveTo(10 * k, 0); g.lineTo(3 * k, 0); g.stroke(); break;
      case 'wind': for (const yy of [-5, 0, 5]) { g.beginPath(); g.moveTo(-8 * k, yy * k); g.lineTo(5 * k, yy * k); g.stroke(); } g.beginPath(); g.moveTo(3 * k, -8 * k); g.lineTo(8 * k, 0); g.lineTo(3 * k, 8 * k); g.stroke(); break;
      case 'target': g.beginPath(); g.arc(0, 0, 8 * k, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 3.5 * k, 0, 7); g.fill(); break;
      case 'lock': g.beginPath(); g.arc(0, -3 * k, 4.5 * k, Math.PI, 0); g.stroke(); rrect(g, -6.5 * k, -3 * k, 13 * k, 11 * k, 2 * k); g.fill(); break;
      case 'plus': g.beginPath(); g.moveTo(-6 * k, 0); g.lineTo(6 * k, 0); g.moveTo(0, -6 * k); g.lineTo(0, 6 * k); g.stroke(); break;
      case 'coin': g.beginPath(); g.arc(0, 0, 8 * k, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(0, 0, 5 * k, 0, 7); g.fill(); break;
      default: g.beginPath(); g.arc(0, 0, 6 * k, 0, 7); g.fill();
    }
    g.restore();
  }
  function starShape(g, x, y, r, fill, stroke) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.2; g.stroke(); } }
  function burst(x, y, col, n, spd) { for (let i = 0; i < (n || 26); i++) { const a = Math.random() * Math.PI * 2, v = (spd || 160) * (0.4 + Math.random()); HS.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, life: 0.6 + Math.random() * 0.5, col, r: 1.5 + Math.random() * 2.5 }); } }
  function float(x, y, s, col) { HS.floats.push({ x, y, s, col, t: 0 }); }

  // ---------------------------------------------------------------- screen
  const hero = () => BB.save && BB.save.heroes.find((x) => x.id === HS.id);
  const sorted = () => BB.save.heroes.slice().sort((a, b) => BB.power(b) - BB.power(a));
  UI.openHero = function (id) { HS.id = id; HS.t = 0; HS.sel = null; HS.pick = null; UI.show('hero'); };
  UI.renderHero = function () { /* the canvas redraws every frame */ };
  UI.heroStep = function (d) { const list = sorted(), i = list.findIndex((x) => x.id === HS.id); HS.id = list[(i + d + list.length) % list.length].id; HS.sel = null; HS.pick = null; HS.t = 0; };
  UI.pickGear = function (h, slot) { HS.id = h.id; HS.pick = slot; };
  const save = () => { BB.persist(); UI.refreshTop(); };

  UI.heroRender = function (dt) {
    const cv = document.getElementById('hgCv'); if (!cv) return;
    const h = hero(); if (!h) return;
    const dpr = HS.dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round(cv.clientWidth * dpr), ch = Math.round(cv.clientHeight * dpr); if (!cw || !ch) return;
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const g = cv.getContext('2d');
    HS.t += dt; HS.regions = [];
    // hold-to-repeat
    if (HS.press) { const R = HS.pressR; if (R && R.hold && !R.disabled) { HS.holdT += dt; if (HS.holdT > 0.45) { HS.rep = (HS.rep || 0) + dt; while (HS.rep > 0.11) { HS.rep -= 0.11; R.fn && R.fn(); } } } }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
    // backdrop over the dimmed camp
    const bg = g.createLinearGradient(0, 0, 0, ch); bg.addColorStop(0, 'rgba(8,10,15,0.82)'); bg.addColorStop(1, 'rgba(6,7,11,0.94)'); g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
    const S = HS.S = Math.min(cw / DW, ch / DH); HS.ox = (cw - DW * S) / 2; HS.oy = (ch - DH * S) / 2;
    g.setTransform(S, 0, 0, S, HS.ox, HS.oy);
    drawShowcase(g, h, dt);
    drawTabs(g, h);
    if (HS.tab === 'attr') drawAttributes(g, h); else drawTree(g, h);
    if (HS.pick) drawPicker(g, h);
    // particles and floating words, on top
    for (const p of HS.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; const a = Math.max(0, 1 - p.t / p.life); g.fillStyle = p.col; g.globalAlpha = a; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
    g.globalAlpha = 1; HS.parts = HS.parts.filter((p) => p.t < p.life);
    for (const f of HS.floats) { f.t += dt; const a = Math.max(0, 1 - f.t / 1.2); g.globalAlpha = a; text(g, f.s, f.x, f.y - f.t * 50, 22, { w: 800, align: 'center', col: f.col, glow: f.col, blur: 14 }); }
    g.globalAlpha = 1; HS.floats = HS.floats.filter((f) => f.t < 1.2);
    if (HS.flash > 0) HS.flash = Math.max(0, HS.flash - dt * 1.6);
  };

  // ---- left: the hero on a stage, gear sockets, name, stars, power, browse
  function drawShowcase(g, h, dt) {
    const C = BB.CALLINGS[h.calling], R = BB.HERO_RARITY[h.rarity || 0], col = RC[h.rarity || 0];
    const cx = 215, cy = 405;
    // light from below, the stage
    const rgba = UI.rgba[h.rarity || 0];
    const gl = g.createRadialGradient(cx, cy - 120, 10, cx, cy - 120, 260); gl.addColorStop(0, rgba.replace('A', '0.22')); gl.addColorStop(1, rgba.replace('A', '0'));
    g.fillStyle = gl; g.fillRect(cx - 260, cy - 380, 520, 520);
    UI.podium(g, cx, cy, 120, rgba, HS.t);
    // the hero, crisp: drawn in device pixels at a whole-number scale
    const layers = BB.heroLayers(h), key = layers[0].key;
    const cyc = HS.t % 7, clip = cyc > 5.2 ? (BB.hasClip(key, 'Special1') ? 'Special1' : 'Taunt') : 'Idle';
    const n = BB.clipLen(key, clip) || 15, fr = clip === 'Idle' ? Math.floor(HS.t * 9) % n : Math.min(n - 1, Math.floor((cyc - 5.2) * 13));
    const S = HS.S, dev = { x: HS.ox + cx * S, y: HS.oy + cy * S };
    const sc = Math.max(2, Math.round(230 * S / 62));
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    BB.drawHeroDressed(g, h, BB.auraOf(h), clip, 1, fr, dev.x, dev.y, sc, HS.t, { noSlash: clip === 'Idle', flash: HS.flash, layers });
    g.restore();
    // name block
    text(g, (R.name + (h.legend ? ' · Legend' : h.captain ? ' · Banner-Captain' : '')).toUpperCase(), 24, 32, 11, { w: 700, col, ls: 2.5 });
    text(g, h.name, 24, 66, h.name.length > 18 ? 26 : 32, { w: 700, glow: 'rgba(0,0,0,0.8)', blur: 10 });
    g.save(); g.translate(24, 76); g.fillStyle = col; const ci = new Path2D(UI.callPath(h.calling)); g.scale(0.7, 0.7); g.fill(ci); g.restore();
    const I = BB.identityOf ? BB.identityOf(h) : null;
    if (I) { const w0 = text(g, BB.CLASSES[I.cls].name, 46, 89, 14, { w: 700, col: BB.CLASSES[I.cls].col }); text(g, ' · ' + BB.TEMPERS[I.temper].name + ' · ' + C.name, 46 + w0, 89, 14, { body: true, w: 500, col: '#9aa3b3' }); }
    else text(g, C.name + ' · ' + C.role, 46, 89, 14, { body: true, w: 500, col: '#9aa3b3' });
    for (let i = 0; i < BB.MAX_STARS; i++) starShape(g, 32 + i * 24, 116, 9, i < h.stars ? ACC : 'rgba(255,255,255,0.08)', i < h.stars ? null : 'rgba(255,255,255,0.18)');
    if (I) text(g, 'ENTRANCE · ' + BB.ENTRANCES[I.entrance].name.toUpperCase(), 24, 146, 10.5, { w: 700, col: '#7b8494', ls: 1.5 });
    // gear sockets around the stage
    const sockets = { weapon: [62, 210], chest: [62, 310], head: [368, 210], charm: [368, 310] };
    for (const slot of BB.SLOTS) socket(g, h, slot, sockets[slot][0], sockets[slot][1]);
    // power + browse
    const p = BB.power(h);
    text(g, 'POWER', cx, 478, 11, { w: 700, align: 'center', col: '#9aa3b3', ls: 3 });
    text(g, p.toLocaleString(), cx, 510, 30, { w: 800, align: 'center', col: '#fff', glow: 'rgba(255,190,85,0.45)', blur: 16 });
    const list = sorted(), idx = list.findIndex((x) => x.id === h.id);
    chevron(g, 'prev', 70, 495, -1); chevron(g, 'next', 360, 495, 1);
    text(g, (idx + 1) + ' / ' + list.length, cx, 536, 12, { body: true, w: 500, align: 'center', col: '#5f6878' });
  }
  function chevron(g, id, x, y, dir) {
    const hov = isHover(id), down = isDown(id);
    g.beginPath(); g.arc(x, y, 22, 0, 7); g.fillStyle = down ? 'rgba(255,190,85,0.25)' : hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 4 * dir, y - 8); g.lineTo(x + 4 * dir, y); g.lineTo(x - 4 * dir, y + 8); g.stroke();
    region(id, x - 24, y - 24, 48, 48, () => UI.heroStep(dir));
  }
  function socket(g, h, slot, x, y) {
    const it = h.gear[slot], id = 'sock-' + slot, hov = isHover(id);
    const col = it ? BB.RARITY[it.rarity].color : 'rgba(255,255,255,0.18)';
    const r = 34;
    if (it) { const gl = g.createRadialGradient(x, y, 4, x, y, r * 1.6); gl.addColorStop(0, col + '55'); gl.addColorStop(1, col + '00'); g.fillStyle = gl; g.beginPath(); g.arc(x, y, r * 1.6, 0, 7); g.fill(); }
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath();
    g.fillStyle = hov ? 'rgba(30,36,50,0.95)' : 'rgba(14,17,25,0.92)'; g.fill();
    g.strokeStyle = col; g.lineWidth = it ? 2 : 1.2; g.stroke();
    if (it) { const ic = UI.itemIcon(it, 64); g.drawImage(ic, x - 24, y - 24, 48, 48); if (it.plus) text(g, '+' + it.plus, x + r - 4, y - r + 12, 12, { w: 800, align: 'right', col: ACC }); }
    else {
      icon(g, { weapon: 'sword', chest: 'shield', head: 'crown', charm: 'spark' }[slot], x, y, 13, 'rgba(255,255,255,0.18)');
      if (BB.save.inventory.some((q) => q.slot === slot && BB.canEquip(h, q))) { g.fillStyle = '#4ade80'; g.beginPath(); g.arc(x + r * 0.7, y - r * 0.7, 6, 0, 7); g.fill(); g.strokeStyle = '#0b0e15'; g.lineWidth = 2; g.stroke(); }
    }
    text(g, BB.SLOT_NAME[slot].toUpperCase(), x, y + r + 16, 10, { w: 700, align: 'center', col: '#7b8494', ls: 2 });
    region(id, x - r, y - r, r * 2, r * 2, () => { HS.pick = slot; BB.sfx('click'); });
  }

  // ---- right: tabs
  function drawTabs(g, h) {
    const tabs = [['attr', 'ATTRIBUTES'], ['tree', 'SKILL TREE']];
    let x = 450;
    for (const [id, label] of tabs) {
      const on = HS.tab === id, w = 180, hov = isHover('tab-' + id);
      chamfer(g, x, 14, w, 42, 10);
      if (on) { const gr = g.createLinearGradient(0, 14, 0, 56); gr.addColorStop(0, 'rgba(255,190,85,0.24)'); gr.addColorStop(1, 'rgba(255,190,85,0.06)'); g.fillStyle = gr; } else g.fillStyle = hov ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.035)';
      g.fill(); g.strokeStyle = on ? 'rgba(255,190,85,0.6)' : 'rgba(255,255,255,0.08)'; g.lineWidth = 1; g.stroke();
      if (on) { g.fillStyle = ACC; g.fillRect(x + 20, 54, w - 40, 2); }
      text(g, label, x + w / 2, 41, 14, { w: 700, align: 'center', col: on ? ACC : '#9aa3b3', ls: 2 });
      if (id === 'tree') { const f = BB.talentFree(h); if (f > 0) { g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(x + w - 16, 22, 10, 0, 7); g.fill(); text(g, String(f), x + w - 16, 26, 11, { w: 800, align: 'center' }); } }
      region('tab-' + id, x, 14, w, 42, () => { HS.tab = id; HS.sel = null; BB.sfx('click'); });
      x += w + 8;
    }
    // back to the roster
    button(g, 'back', 880, 16, 110, 38, 'HEROES', { kind: 'ghost', fn: () => UI.go('heroes') });
  }

  // ---- attributes: level, stats with the next level's gain, ultimate, level up, ascend
  function drawAttributes(g, h) {
    const S0 = BB.save, cap = BB.levelCap(h), st = BB.heroStats(h), C = BB.CALLINGS[h.calling];
    const nx = h.level < cap ? BB.heroStats(Object.assign({}, h, { level: h.level + 1 })) : null;
    panel(g, 450, 66, 540, 486, { accent: ACC });
    // level bar
    text(g, 'LEVEL', 474, 100, 11, { w: 700, col: '#9aa3b3', ls: 3 });
    text(g, String(h.level), 474, 136, 38, { w: 800 });
    text(g, '/ ' + cap, 474 + g.measureText(String(h.level)).width * 1 + 8, 136, 16, { w: 600, col: '#5f6878' });
    const segs = cap, bw = 330, bx = 640, by = 116;
    for (let i = 0; i < segs; i++) { const sx = bx + i * (bw / segs); g.fillStyle = i < h.level ? (i === h.level - 1 && HS.flash > 0 ? '#fff' : ACC) : 'rgba(255,255,255,0.08)'; g.fillRect(sx, by, bw / segs - 2, 10); }
    text(g, BB.talentFree(h) > 0 ? BB.talentFree(h) + ' skill point' + (BB.talentFree(h) > 1 ? 's' : '') + ' to spend' : 'One skill point per level', bx, by + 30, 12, { body: true, w: 500, col: BB.talentFree(h) > 0 ? '#4ade80' : '#5f6878' });
    // stats
    const rows = [['heart', 'Health', Math.round(st.hp), nx && Math.round(nx.hp - st.hp), '#ff6b6b'], ['sword', 'Attack', Math.round(st.atk), nx && Math.round(nx.atk - st.atk), '#ffbe55'], ['shield', 'Defence', Math.round(st.def), nx && Math.round(nx.def - st.def), '#5aa8ff'],
      ['crit', 'Crit chance', Math.round(st.crit * 100) + '%', null, '#ff7ad9'], ['wind', 'Attack speed', st.aspd.toFixed(2), null, '#5cd3ff'], ['target', 'Range', C.ranged ? 'Far' : 'Melee', null, '#9aa3b3']];
    rows.forEach(([ic, nm, v, plus, col], i) => {
      const x = 474 + (i % 2) * 258, y = 160 + Math.floor(i / 2) * 46;
      rrect(g, x, y, 246, 40, 10); g.fillStyle = 'rgba(255,255,255,0.035)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1; g.stroke();
      rrect(g, x + 6, y + 6, 28, 28, 8); g.fillStyle = col + '22'; g.fill(); icon(g, ic, x + 20, y + 20, 8.5, col);
      text(g, nm, x + 44, y + 17, 10.5, { body: true, w: 500, col: '#9aa3b3' });
      text(g, String(v), x + 44, y + 34, 15.5, { w: 700 });
      if (plus) text(g, '+' + plus, x + 234, y + 26, 13, { w: 700, align: 'right', col: '#4ade80' });
    });
    // ultimate
    const uy = 300, I2 = BB.identityOf ? BB.identityOf(h) : null;
    const row = (y, label, desc, c1, c2) => { rrect(g, 474, y, 504, 38, 10); const ug = g.createLinearGradient(474, 0, 978, 0); ug.addColorStop(0, c1); ug.addColorStop(1, 'rgba(255,255,255,0.02)'); g.fillStyle = ug; g.fill(); g.strokeStyle = c1.replace(/0\.\d+\)$/, '0.35)'); g.lineWidth = 1; g.stroke(); text(g, label, 486, y + 16, 11.5, { w: 700, col: c2, ls: 1.2 }); text(g, desc.length > 86 ? desc.slice(0, 85) + '…' : desc, 486, y + 31, 11, { body: true, w: 400, col: '#b9c0cc' }); };
    row(uy, 'ULTIMATE · ' + C.skill.name.toUpperCase(), C.skill.desc, 'rgba(181,124,255,0.18)', '#d9b8ff');
    if (I2) {
      const S2 = BB.SIGNATURES[I2.sig], T2 = BB.TEMPERS[I2.temper];
      row(uy + 44, 'SIGNATURE · ' + S2.name.toUpperCase(), S2.line.charAt(0).toUpperCase() + S2.line.slice(1) + '. Comes round every 10 s or so.', 'rgba(255,190,85,0.16)', '#ffd27a');
      text(g, T2.name.toUpperCase() + ' — ' + T2.line(BB.shortName(h)), 474, uy + 104, 11.5, { body: true, w: 500, col: '#9aa3b3' });
    }
    // level up (hold to keep levelling), ascend
    const capped = h.level >= cap, cost = BB.levelCost(h);
    button(g, 'lvl', 474, 420, 300, 66, capped ? 'LEVEL CAP' : 'LEVEL UP', { kind: 'gold', sub: capped ? 'Ascend to raise the cap' : '● ' + cost.toLocaleString() + ' gold · hold to repeat', disabled: capped || S0.gold < cost, hold: true, fn: () => {
      if (BB.levelUp(S0, h)) { BB.sfx('levelup'); HS.flash = 0.7; burst(215, 300, ACC, 22, 170); float(215, 250, '+1 LEVEL', ACC); save(); }
    } });
    const maxS = h.stars >= BB.MAX_STARS, ac = BB.ascendCost(h);
    button(g, 'asc', 786, 420, 192, 66, maxS ? 'MAX STARS' : 'ASCEND', { kind: 'blue', sub: maxS ? '' : '✧ ' + S0.sigils + ' / ' + ac + ' sigils', disabled: maxS || S0.sigils < ac, fn: () => {
      if (BB.ascend(S0, h)) { BB.sfx('rally'); HS.flash = 1; burst(32 + (h.stars - 1) * 24, 116, ACC, 30, 140); burst(215, 300, '#86ccff', 40, 220); float(215, 240, '★ ' + h.stars + ' STARS', '#86ccff'); save(); }
    } });
    button(g, 'best', 474, 498, 150, 40, 'EQUIP BEST', { kind: 'ghost', fn: () => { BB.equipBest(S0, h); BB.sfx('forge'); burst(215, 260, '#ffffff', 14, 120); save(); } });
    button(g, 'lead', 634, 498, 190, 40, S0.leader === h.id ? '✓ SHOWN AT CAMP' : 'SHOW AT CAMP', { kind: 'ghost', fn: () => { S0.leader = h.id; save(); } });
    button(g, 'max', 834, 498, 144, 40, 'LEVEL MAX', { kind: 'ghost', disabled: capped || S0.gold < cost, fn: () => { const n = BB.levelMax(S0, h); if (n) { BB.sfx('levelup'); HS.flash = 0.8; burst(215, 300, ACC, 40, 220); float(215, 250, '+' + n + ' LEVELS', ACC); save(); } } });
  }

  // ---- the skill tree: three branches of linked nodes, two bridges, capstones at the root
  const TX = [560, 720, 880], TY = [190, 264, 338, 414];
  const nodePos = (n) => ({ x: n.x % 1 ? (TX[Math.floor(n.x)] + TX[Math.ceil(n.x)]) / 2 : TX[n.x], y: n.y % 1 ? (TY[Math.floor(n.y)] + TY[Math.ceil(n.y)]) / 2 : TY[n.y] });
  function drawTree(g, h) {
    panel(g, 450, 66, 540, 486, { accent: '#b57cff' });
    const free = BB.talentFree(h);
    text(g, 'SKILL POINTS', 474, 98, 11, { w: 700, col: '#9aa3b3', ls: 3 });
    text(g, String(free), 474, 128, 30, { w: 800, col: free ? '#4ade80' : '#fff', glow: free ? 'rgba(74,222,128,0.5)' : null, blur: 14 });
    text(g, BB.talentSpent(h) + ' spent · 1 per level', 474 + (free > 9 ? 40 : 26), 126, 12, { body: true, w: 500, col: '#5f6878' });
    button(g, 'reset', 880, 82, 98, 34, 'RESET', { kind: 'ghost', disabled: !BB.talentSpent(h), fn: () => { BB.resetTalents(h); HS.sel = null; BB.sfx('click'); save(); } });
    // branch headers
    BB.TREE_BRANCHES.forEach((b, i) => { text(g, b.name.toUpperCase(), TX[i], TY[0] - 40, 11, { w: 700, align: 'center', col: b.col, ls: 2.5 }); });
    // links
    for (const n of BB.TREE) for (const q of n.req || []) {
      const a = nodePos(BB.TREE_BY_ID[q]), b = nodePos(n), ra = BB.talentRank(h, q) > 0, rb = BB.talentRank(h, n.id) > 0;
      const col = n.b >= 0 ? BB.TREE_BRANCHES[n.b].col : '#ffbe55';
      g.lineWidth = rb ? 4 : 2.5; g.strokeStyle = rb ? col : ra ? col + '88' : 'rgba(255,255,255,0.08)';
      if (rb) { g.shadowColor = col; g.shadowBlur = 12; }
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.shadowBlur = 0;
      if (ra && !rb) { const k = (HS.t * 0.8) % 1; g.fillStyle = col; g.beginPath(); g.arc(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 2.5, 0, 7); g.fill(); }
    }
    // nodes
    for (const n of BB.TREE) drawNode(g, h, n);
    // details of the chosen node
    const sel = HS.sel && BB.TREE_BY_ID[HS.sel];
    if (sel) {
      const r = BB.talentRank(h, sel.id), col = sel.b >= 0 ? BB.TREE_BRANCHES[sel.b].col : ACC;
      rrect(g, 474, 470, 504, 70, 12); g.fillStyle = 'rgba(255,255,255,0.04)'; g.fill(); g.strokeStyle = col + '66'; g.lineWidth = 1; g.stroke();
      text(g, BB.talentName(sel, h), 490, 496, 17, { w: 700, col });
      text(g, 'Rank ' + r + ' / ' + sel.max + (sel.cap ? ' · capstone' : ''), 490 + g.measureText(BB.talentName(sel, h)).width + 12, 496, 12, { body: true, w: 500, col: '#7b8494' });
      const now = r ? BB.talentDesc(sel, r) : '', next = r < sel.max ? BB.talentDesc(sel, r + 1) : '';
      text(g, r < sel.max ? (r ? 'Now ' + now + '  →  ' : '') + 'Next: ' + next : 'Mastered: ' + now, 490, 522, 12.5, { body: true, w: 500, col: '#c6ccd6' });
      const can = BB.canLearn(h, sel.id), open = BB.talentOpen(h, sel);
      button(g, 'learn', 838, 482, 128, 46, r >= sel.max ? 'MASTERED' : !open ? 'LOCKED' : 'LEARN', { kind: 'gold', sub: r < sel.max && open ? '1 point' : '', disabled: !can, fn: () => {
        if (BB.learn(h, sel.id)) { const p = nodePos(sel); BB.sfx('levelup'); burst(p.x, p.y, col, 30, 150); float(p.x, p.y - 30, BB.talentRank(h, sel.id) >= sel.max ? 'MASTERED' : '+1', col); save(); }
      } });
    } else text(g, free ? 'Tap a glowing node to learn it.' : 'Level up your hero to earn skill points.', 720, 512, 13, { body: true, w: 500, align: 'center', col: '#7b8494' });
  }
  function drawNode(g, h, n) {
    const p = nodePos(n), r = n.cap ? 30 : n.b < 0 ? 22 : 26, rank = BB.talentRank(h, n.id), open = BB.talentOpen(h, n), can = BB.canLearn(h, n.id);
    const col = n.b >= 0 ? BB.TREE_BRANCHES[n.b].col : ACC, sel = HS.sel === n.id, hov = isHover('node-' + n.id);
    if (can) { const pulse = 0.5 + Math.sin(HS.t * 4) * 0.5; const gl = g.createRadialGradient(p.x, p.y, r * 0.6, p.x, p.y, r * 2); gl.addColorStop(0, col + Math.round(40 + pulse * 60).toString(16)); gl.addColorStop(1, col + '00'); g.fillStyle = gl; g.beginPath(); g.arc(p.x, p.y, r * 2, 0, 7); g.fill(); }
    // shape: circles, hexagons for capstones, diamonds for bridges
    g.beginPath();
    if (n.cap) for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; g.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); }
    else if (n.b < 0) { g.moveTo(p.x, p.y - r); g.lineTo(p.x + r, p.y); g.lineTo(p.x, p.y + r); g.lineTo(p.x - r, p.y); }
    else g.arc(p.x, p.y, r, 0, 7);
    g.closePath();
    const fg = g.createRadialGradient(p.x, p.y - r * 0.4, 2, p.x, p.y, r);
    if (rank) { fg.addColorStop(0, col); fg.addColorStop(1, col + '55'); } else { fg.addColorStop(0, hov ? '#262c3b' : '#1a1f2b'); fg.addColorStop(1, '#0d1017'); }
    g.fillStyle = fg; g.fill();
    g.lineWidth = sel ? 3 : 1.8; g.strokeStyle = sel ? '#fff' : rank ? col : open ? col + 'aa' : 'rgba(255,255,255,0.14)';
    if (rank) { g.shadowColor = col; g.shadowBlur = 16; }
    g.stroke(); g.shadowBlur = 0;
    if (open || rank) icon(g, n.icon, p.x, p.y, r * 0.48, rank ? '#0b0e15' : col);
    else icon(g, 'lock', p.x, p.y, r * 0.4, 'rgba(255,255,255,0.25)');
    // rank pips
    if (n.max > 1) for (let i = 0; i < n.max; i++) { const px = p.x + (i - (n.max - 1) / 2) * 9; g.beginPath(); g.arc(px, p.y + r + 9, 3, 0, 7); g.fillStyle = i < rank ? col : 'rgba(255,255,255,0.14)'; g.fill(); }
    region('node-' + n.id, p.x - r - 4, p.y - r - 4, r * 2 + 8, r * 2 + 8, () => { HS.sel = n.id; BB.sfx('click'); });
  }

  // ---- gear picker: an overlay of item cards for one socket
  function drawPicker(g, h) {
    const slot = HS.pick, cur = h.gear[slot], S0 = BB.save;
    g.fillStyle = 'rgba(4,5,8,0.72)'; g.fillRect(-500, -500, DW + 1000, DH + 1000);
    region('pick-bg', -500, -500, DW + 1000, DH + 1000, () => { HS.pick = null; });
    const x = 170, y = 60, w = 660, hh = 440;
    panel(g, x, y, w, hh, { accent: ACC, c: 18 });
    region('pick-panel', x, y, w, hh, () => {});
    text(g, BB.SLOT_NAME[slot].toUpperCase() + ' · ' + BB.shortName(h).toUpperCase(), x + 24, y + 38, 15, { w: 700, col: ACC, ls: 2 });
    text(g, cur ? 'Equipped: ' + cur.name + (cur.plus ? ' +' + cur.plus : '') + ' · ' + UI.statLine(BB.itemStats(cur)) : 'Nothing equipped', x + 24, y + 62, 12.5, { body: true, w: 500, col: '#9aa3b3' });
    button(g, 'pick-x', x + w - 52, y + 16, 36, 36, '✕', { kind: 'ghost', fn: () => { HS.pick = null; } });
    const list = S0.inventory.filter((it) => it.slot === slot && BB.canEquip(h, it)).sort((a, b) => BB.itemScore(b) - BB.itemScore(a)).slice(0, 12);
    if (!list.length) text(g, 'Nothing in the armory for this slot yet. Stages, chests and the shop drop gear.', x + w / 2, y + 200, 14, { body: true, w: 500, align: 'center', col: '#7b8494' });
    list.forEach((it, i) => {
      const cx = x + 24 + (i % 4) * 154, cy = y + 84 + Math.floor(i / 4) * 106, id = 'item-' + i, hov = isHover(id);
      const col = BB.RARITY[it.rarity].color;
      rrect(g, cx, cy, 146, 98, 12); g.fillStyle = hov ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.035)'; g.fill(); g.strokeStyle = col + (hov ? 'cc' : '66'); g.lineWidth = 1.2; g.stroke();
      const gl = g.createRadialGradient(cx + 34, cy + 40, 2, cx + 34, cy + 40, 34); gl.addColorStop(0, col + '44'); gl.addColorStop(1, col + '00'); g.fillStyle = gl; g.fillRect(cx, cy, 70, 80);
      g.drawImage(UI.itemIcon(it, 64), cx + 12, cy + 16, 44, 44);
      if (it.plus) text(g, '+' + it.plus, cx + 58, cy + 22, 11, { w: 800, col: ACC });
      const diff = BB.itemScore(it) - BB.itemScore(cur);
      text(g, (diff >= 0 ? '▲ ' : '▼ ') + Math.abs(diff), cx + 134, cy + 24, 13, { w: 800, align: 'right', col: diff >= 0 ? '#4ade80' : '#ff6b6b' });
      const nm = it.name.length > 17 ? it.name.slice(0, 16) + '…' : it.name;
      text(g, nm, cx + 12, cy + 76, 12, { w: 600, col });
      text(g, it.ench ? '✦ ' + BB.ELEMENTS[it.ench].name + ' · ' + BB.ENCH[it.ench].desc.toLowerCase() : UI.statLine(BB.itemStats(it)).split(' · ').slice(0, 2).join(' · '), cx + 12, cy + 91, 10, { body: true, w: 500, col: it.ench ? BB.ECOL[it.ench][1] : '#7b8494' });
      region(id, cx, cy, 146, 98, () => {
        S0.inventory.splice(S0.inventory.indexOf(it), 1); if (cur) S0.inventory.push(cur); h.gear[slot] = it;
        if (it.ench) { const ec = BB.ECOL[it.ench]; BB.sfx('enchant'); burst(215, 300, ec[1], 50, 230); burst(215, 260, ec[0], 30, 140); float(215, 220, BB.ELEMENTS[it.ench].name.toUpperCase() + ' ENCHANT', ec[0]); HS.flash = 0.6; }
        else BB.sfx('forge');
        burst(215, 280, col, 24, 160); float(215, it.ench ? 255 : 230, it.name, col); HS.pick = null; save();
      });
    });
    if (cur) button(g, 'unequip', x + 24, y + hh - 58, 140, 40, 'TAKE OFF', { kind: 'ghost', fn: () => { S0.inventory.push(cur); h.gear[slot] = null; HS.pick = null; save(); } });
  }

  // ---------------------------------------------------------------- input: map the pointer into design space, find the top region
  function at(ev) {
    const cv = document.getElementById('hgCv'), rc = cv.getBoundingClientRect(), d = HS.dpr;
    const x = ((ev.clientX - rc.left) * d - HS.ox) / HS.S, y = ((ev.clientY - rc.top) * d - HS.oy) / HS.S;
    for (let i = HS.regions.length - 1; i >= 0; i--) { const R = HS.regions[i]; if (x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h) return R; }
    return null;
  }
  const cv = document.getElementById('hgCv');
  if (cv) {
    cv.addEventListener('pointerdown', (ev) => { BB.audioUnlock(); const R = at(ev); HS.press = R && !R.disabled ? R.id : null; HS.pressR = R; HS.holdT = 0; HS.rep = 0; ev.preventDefault(); });
    cv.addEventListener('pointermove', (ev) => { const R = at(ev); HS.hover = R && !R.disabled ? R.id : null; cv.style.cursor = HS.hover && !/^pick-(bg|panel)$/.test(HS.hover) ? 'pointer' : 'default'; });
    const up = (ev) => { const R = at(ev); if (R && HS.press === R.id && !R.disabled && R.fn && !(R.hold && HS.holdT > 0.45)) R.fn(); HS.press = null; HS.pressR = null; HS.holdT = 0; };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointerleave', () => { HS.press = null; HS.hover = null; });
  }
})();
