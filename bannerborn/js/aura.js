// Bannerborn — what a hero's gear and skills look like on them: a glow in the colour of their best gear,
// the weapon's enchant swirling around them, and a mark for each capstone. Stateless: everything is driven by time,
// so the same hero looks the same in the camp, the hero screen, the team field and battle.
(function () {
  const BB = window.BB;
  const ECOL = { fire: ['#ffb347', '#ff5a1f'], frost: ['#dff6ff', '#7cc8ff'], storm: ['#e8ffff', '#5cd3ff'], shadow: ['#c9a8ff', '#5a2fa8'], holy: ['#fff5c4', '#ffcf5a'], poison: ['#d6ff8a', '#5fbf2a'] };
  BB.ECOL = ECOL;
  BB.auraOf = function (h) {
    const A = { glow: null, glowK: 0, ench: null, halo: false, runes: false, embers: false, stars: h.stars || 1, seed: (h.id || 'x').length * 7 };
    let best = -1, plus = 0;
    for (const s of BB.SLOTS) { const it = h.gear && h.gear[s]; if (it) { best = Math.max(best, it.rarity); plus += it.plus || 0; } }
    if (best >= 1) { A.glow = BB.RARITY[best].color; A.glowK = 0.45 + best * 0.25 + Math.min(0.6, plus / 18); }
    A.ench = BB.heroEnch ? BB.heroEnch(h) : null;
    const t = h.talents || {};
    A.halo = !!t.g4; A.runes = !!t.u4; A.embers = !!t.m4;
    return A;
  };
  // a soft round glow, painted once per colour and stretched wherever light is needed. Canvas blur (shadowBlur) and a
  // fresh gradient for every glow every frame were the slowest things on the battlefield.
  const glows = {};
  BB.glowSprite = function (col) {
    let c = glows[col]; if (c) return c;
    c = glows[col] = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    const rgb = /^#/.test(col) ? [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)].join(',') : col; // '#rrggbb' or 'r,g,b'
    gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.45, 'rgba(' + rgb + ',0.42)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  };
  // draw one: centre (x, y), radii rx, ry, strength a. The caller sets the blend mode
  BB.drawGlow = function (g, col, x, y, rx, ry, a) {
    if (a <= 0) return; const ga = g.globalAlpha; g.globalAlpha = Math.min(1, a) * ga;
    g.drawImage(BB.glowSprite(col), x - rx, y - ry, rx * 2, ry * 2); g.globalAlpha = ga;
  };
  const fr = (x) => x - Math.floor(x);
  const rnd = (n) => fr(Math.sin(n * 127.1 + 311.7) * 43758.5453);
  // under the feet: the Mastery rune circle, the enchant's light on the ground
  BB.drawAuraBack = function (g, A, x, y, sc, t) {
    if (!A) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    if (A.ench) {
      BB.drawGlow(g, ECOL[A.ench][1], x, y, 24 * sc, 9 * sc, 0.45);
    }
    if (A.runes) {
      g.strokeStyle = 'rgba(190,140,255,0.75)'; g.lineWidth = Math.max(1, 0.8 * sc);
      g.beginPath(); g.ellipse(x, y, 19 * sc, 7 * sc, 0, 0, 7); g.stroke();
      g.setLineDash([3 * sc, 2.5 * sc]); g.lineDashOffset = -t * 12 * sc; g.beginPath(); g.ellipse(x, y, 23 * sc, 8.5 * sc, 0, 0, 7); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(210,170,255,0.85)';
      for (let i = 0; i < 6; i++) { const a = t * 0.8 + i * Math.PI / 3; g.fillRect(x + Math.cos(a) * 21 * sc - 0.8 * sc, y + Math.sin(a) * 7.7 * sc - 0.8 * sc, 1.6 * sc, 1.6 * sc); }
    }
    g.restore();
  };
  // a glow behind the body in the colour of the hero's best gear (pulses gently)
  BB.auraGlow = function (g, A, x, y, sc, t) {
    if (!A || !A.glow) return false;
    const gc = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
    BB.drawGlow(g, A.glow, x, y - 22 * sc, 20 * sc, 30 * sc, (0.2 + Math.sin(t * 2.5) * 0.05) * Math.min(1.6, A.glowK));
    g.globalCompositeOperation = gc;
    return true;
  };
  // around and above the body: the enchant, the Undying halo, the Executioner's embers
  BB.drawAuraFront = function (g, A, x, y, sc, t) {
    if (!A) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    const s = A.seed;
    if (A.ench === 'fire') {
      for (let i = 0; i < 14; i++) { const p = fr(t * 0.9 + rnd(i + s)), px = x + Math.sin(i * 12.9 + t * 3) * 11 * sc, py = y - 4 * sc - p * 52 * sc, r = (1 - p) * 2.2 * sc + 0.4 * sc;
        g.fillStyle = p < 0.4 ? '#ffd27a' : p < 0.7 ? '#ff8a2a' : '#ff3d1a'; g.globalAlpha = (1 - p) * 0.9; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); }
    } else if (A.ench === 'frost') {
      for (let i = 0; i < 10; i++) { const a = t * 1.1 + i * Math.PI * 0.2, px = x + Math.cos(a) * 15 * sc, py = y - 24 * sc + Math.sin(a) * 6 * sc + Math.sin(t * 2 + i) * 6 * sc;
        g.globalAlpha = 0.55 + Math.sin(t * 5 + i) * 0.35; g.strokeStyle = '#dff6ff'; g.lineWidth = Math.max(1, 0.6 * sc);
        const q = 1.6 * sc; g.beginPath(); g.moveTo(px - q, py); g.lineTo(px + q, py); g.moveTo(px, py - q); g.lineTo(px, py + q); g.stroke(); }
      for (let i = 0; i < 6; i++) { const p = fr(t * 0.35 + rnd(i + s)); g.globalAlpha = (1 - p) * 0.8; g.fillStyle = '#9fdcff'; g.fillRect(x + (rnd(i * 3 + s) - 0.5) * 30 * sc, y - 56 * sc + p * 52 * sc, 1.2 * sc, 1.2 * sc); }
    } else if (A.ench === 'storm') {
      const k = Math.floor(t * 9);
      for (let j = 0; j < 2; j++) {
        if (rnd(k * 3 + j + s) < 0.35) continue;
        let px = x + (rnd(k + j * 7 + s) - 0.5) * 26 * sc, py = y - (8 + rnd(k * 5 + j) * 44) * sc;
        g.beginPath(); g.moveTo(px, py);
        for (let q = 0; q < 4; q++) { px += (rnd(k * 11 + q + j) - 0.5) * 9 * sc; py += (rnd(k * 13 + q + j) - 0.3) * 7 * sc; g.lineTo(px, py); }
        g.globalAlpha = 0.35; g.strokeStyle = '#5cd3ff'; g.lineWidth = Math.max(2, 2.4 * sc); g.stroke();
        g.globalAlpha = 0.9; g.strokeStyle = '#d8ffff'; g.lineWidth = Math.max(1, 0.7 * sc); g.stroke();
      }
      for (let i = 0; i < 5; i++) { const a = t * 3 + i * 1.26; g.globalAlpha = 0.7; g.fillStyle = '#9ff'; g.beginPath(); g.arc(x + Math.cos(a) * 13 * sc, y - 26 * sc + Math.sin(a * 1.3) * 16 * sc, 0.9 * sc, 0, 7); g.fill(); }
    } else if (A.ench === 'shadow') {
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 10; i++) { const p = fr(t * 0.45 + rnd(i + s)), px = x + Math.sin(i * 7.3 + t * 1.5) * 12 * sc, py = y - 2 * sc - p * 46 * sc, r = (2 + p * 4) * sc;
        g.globalAlpha = (1 - p) * 0.55; g.fillStyle = i % 3 ? '#3a1a70' : '#6a3ac8'; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); }
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const p = fr(t * 0.7 + rnd(i * 5 + s)); g.globalAlpha = (1 - p) * 0.8; g.fillStyle = '#c9a8ff'; g.fillRect(x + (rnd(i * 9) - 0.5) * 24 * sc, y - p * 50 * sc, 1.3 * sc, 1.3 * sc); }
    } else if (A.ench === 'poison') { // venom: green drips off the body, bubbles rising and popping
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 8; i++) { const p = fr(t * 0.8 + rnd(i + s)), px = x + (rnd(i * 4 + s) - 0.5) * 18 * sc, py = y - (40 - p * 38) * sc;
        g.globalAlpha = (1 - p) * 0.85; g.fillStyle = i % 2 ? '#7ad43a' : '#b8f060'; g.beginPath(); g.ellipse(px, py, 1 * sc, (1.2 + p * 1.6) * sc, 0, 0, 7); g.fill(); }
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) { const p = fr(t * 0.55 + rnd(i * 7 + s)), px = x + Math.sin(i * 3.7 + t * 2) * 12 * sc, py = y - 6 * sc - p * 44 * sc, r = (0.8 + p * 1.8) * sc;
        g.globalAlpha = p > 0.85 ? (1 - p) * 4 : 0.6; g.strokeStyle = '#c6ff7a'; g.lineWidth = Math.max(0.8, 0.5 * sc); g.beginPath(); g.arc(px, py, r, 0, 7); g.stroke(); }
    } else if (A.ench === 'holy') {
      for (let i = 0; i < 12; i++) { const p = fr(t * 0.5 + rnd(i + s)), px = x + Math.sin(i * 5.1 + t) * 13 * sc, py = y - p * 56 * sc;
        g.globalAlpha = Math.sin(p * Math.PI) * 0.9; g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(px, py, 1.1 * sc, 0, 7); g.fill(); }
      g.globalAlpha = 1; BB.drawGlow(g, '255,230,150', x, y - 26 * sc, 20 * sc, 32 * sc, 0.2);
    }
    g.globalAlpha = 1;
    if (A.embers) { // Executioner: a red smoulder at the shoulders
      for (let i = 0; i < 6; i++) { const p = fr(t * 1.4 + rnd(i * 2 + s)), side = i % 2 ? 1 : -1; g.globalAlpha = (1 - p) * 0.85; g.fillStyle = '#ff4040';
        g.beginPath(); g.arc(x + side * (6 + p * 3) * sc, y - (36 + p * 14) * sc, (1 - p) * 1.6 * sc, 0, 7); g.fill(); }
    }
    if (A.halo) { // Undying: a halo
      const hy = y - 53 * sc + Math.sin(t * 2) * 1.2 * sc;
      g.beginPath(); g.ellipse(x, hy, 7 * sc, 2.2 * sc, 0, 0, 7);
      g.globalAlpha = 0.3; g.strokeStyle = '#ffcf5a'; g.lineWidth = Math.max(2.5, 3 * sc); g.stroke();
      g.globalAlpha = 0.85 + Math.sin(t * 3) * 0.15; g.strokeStyle = '#ffe27a'; g.lineWidth = Math.max(1, 1.1 * sc); g.stroke();
    }
    if (A.stars >= 4) { // ascended heroes sparkle
      for (let i = 0; i < A.stars; i++) { const p = fr(t * 0.6 + i / A.stars); g.globalAlpha = Math.sin(p * Math.PI) * 0.8; g.fillStyle = '#fff3c4';
        const px = x + Math.cos(i * 2.4 + t * 0.5) * 16 * sc, py = y - 20 * sc - p * 30 * sc, q = 1.6 * sc * Math.sin(p * Math.PI);
        g.beginPath(); g.moveTo(px, py - q * 2); g.lineTo(px + q * 0.5, py); g.lineTo(px, py + q * 2); g.lineTo(px - q * 0.5, py); g.closePath(); g.fill(); }
    }
    g.restore();
  };
  // draw a hero with everything on them, at foot position (x, y), sprite scale sc
  BB.drawHeroDressed = function (g, hero, A, clip, dir, frame, x, y, sc, t, opts) {
    BB.drawAuraBack(g, A, x, y, sc, t);
    BB.auraGlow(g, A, x, y, sc, t);
    BB.drawLayers(g, opts && opts.layers || BB.heroLayers(hero), clip, dir, frame, x, y, sc, opts);
    BB.drawAuraFront(g, A, x, y, sc, t);
  };
})();
