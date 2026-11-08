// Bannerborn — what a hero's gear and skills look like on them: a glow in the colour of their best gear,
// the weapon's enchant swirling around them, and a mark for each capstone. Stateless: everything is driven by time,
// so the same hero looks the same in the camp, the hero screen, the team field and battle.
(function () {
  const BB = window.BB;
  const ECOL = { fire: ['#ffb347', '#ff5a1f'], frost: ['#dff6ff', '#7cc8ff'], storm: ['#e8ffff', '#5cd3ff'], shadow: ['#c9a8ff', '#5a2fa8'], holy: ['#fff5c4', '#ffcf5a'] };
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
  const fr = (x) => x - Math.floor(x);
  const rnd = (n) => fr(Math.sin(n * 127.1 + 311.7) * 43758.5453);
  // under the feet: the Mastery rune circle, the enchant's light on the ground
  BB.drawAuraBack = function (g, A, x, y, sc, t) {
    if (!A) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    if (A.ench) {
      const c = ECOL[A.ench][1], gr = g.createRadialGradient(x, y, 0, x, y, 22 * sc);
      gr.addColorStop(0, c + '66'); gr.addColorStop(1, c + '00'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 22 * sc, 8 * sc, 0, 0, 7); g.fill();
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
  // a glow around the body in the colour of the hero's best gear (pulses gently)
  BB.auraGlow = function (g, A, sc, t) {
    if (!A || !A.glow) return false;
    g.shadowColor = A.glow; g.shadowBlur = Math.max(2, (3 + Math.sin(t * 2.5) * 1) * A.glowK * sc); g.shadowOffsetX = 0; g.shadowOffsetY = 0;
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
      g.strokeStyle = '#d8ffff'; g.lineWidth = Math.max(1, 0.7 * sc); g.shadowColor = '#5cd3ff'; g.shadowBlur = 6 * sc;
      for (let j = 0; j < 2; j++) {
        if (rnd(k * 3 + j + s) < 0.35) continue;
        let px = x + (rnd(k + j * 7 + s) - 0.5) * 26 * sc, py = y - (8 + rnd(k * 5 + j) * 44) * sc;
        g.globalAlpha = 0.9; g.beginPath(); g.moveTo(px, py);
        for (let q = 0; q < 4; q++) { px += (rnd(k * 11 + q + j) - 0.5) * 9 * sc; py += (rnd(k * 13 + q + j) - 0.3) * 7 * sc; g.lineTo(px, py); }
        g.stroke();
      }
      for (let i = 0; i < 5; i++) { const a = t * 3 + i * 1.26; g.globalAlpha = 0.7; g.fillStyle = '#9ff'; g.beginPath(); g.arc(x + Math.cos(a) * 13 * sc, y - 26 * sc + Math.sin(a * 1.3) * 16 * sc, 0.9 * sc, 0, 7); g.fill(); }
    } else if (A.ench === 'shadow') {
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 10; i++) { const p = fr(t * 0.45 + rnd(i + s)), px = x + Math.sin(i * 7.3 + t * 1.5) * 12 * sc, py = y - 2 * sc - p * 46 * sc, r = (2 + p * 4) * sc;
        g.globalAlpha = (1 - p) * 0.55; g.fillStyle = i % 3 ? '#3a1a70' : '#6a3ac8'; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); }
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const p = fr(t * 0.7 + rnd(i * 5 + s)); g.globalAlpha = (1 - p) * 0.8; g.fillStyle = '#c9a8ff'; g.fillRect(x + (rnd(i * 9) - 0.5) * 24 * sc, y - p * 50 * sc, 1.3 * sc, 1.3 * sc); }
    } else if (A.ench === 'holy') {
      for (let i = 0; i < 12; i++) { const p = fr(t * 0.5 + rnd(i + s)), px = x + Math.sin(i * 5.1 + t) * 13 * sc, py = y - p * 56 * sc;
        g.globalAlpha = Math.sin(p * Math.PI) * 0.9; g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(px, py, 1.1 * sc, 0, 7); g.fill(); }
      const gr = g.createRadialGradient(x, y - 26 * sc, 0, x, y - 26 * sc, 30 * sc); gr.addColorStop(0, 'rgba(255,230,150,0.16)'); gr.addColorStop(1, 'rgba(255,230,150,0)');
      g.globalAlpha = 1; g.fillStyle = gr; g.beginPath(); g.ellipse(x, y - 26 * sc, 20 * sc, 32 * sc, 0, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    if (A.embers) { // Executioner: a red smoulder at the shoulders
      for (let i = 0; i < 6; i++) { const p = fr(t * 1.4 + rnd(i * 2 + s)), side = i % 2 ? 1 : -1; g.globalAlpha = (1 - p) * 0.85; g.fillStyle = '#ff4040';
        g.beginPath(); g.arc(x + side * (6 + p * 3) * sc, y - (36 + p * 14) * sc, (1 - p) * 1.6 * sc, 0, 7); g.fill(); }
    }
    if (A.halo) { // Undying: a halo
      g.globalAlpha = 0.85 + Math.sin(t * 3) * 0.15; g.strokeStyle = '#ffe27a'; g.lineWidth = Math.max(1, 1.1 * sc); g.shadowColor = '#ffcf5a'; g.shadowBlur = 6 * sc;
      g.beginPath(); g.ellipse(x, y - 53 * sc + Math.sin(t * 2) * 1.2 * sc, 7 * sc, 2.2 * sc, 0, 0, 7); g.stroke();
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
    g.save();
    BB.auraGlow(g, A, sc, t);
    BB.drawLayers(g, opts && opts.layers || BB.heroLayers(hero), clip, dir, frame, x, y, sc, opts);
    g.restore();
    BB.drawAuraFront(g, A, x, y, sc, t);
  };
})();
