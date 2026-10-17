/*
 * Tower of Wishes — callouts layer: in-world UI over fighters' heads.
 * Health ticks, reaction icons (! read, ? saw through a feint, ✦ feint,
 * … drained) and speech balloons.
 *
 * API (called by core.js):
 *   draw(s, dt)   drawn after the scene, before screen-space effects
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  function create(V) {
    const { ctx, FONT } = V;
    const P = V.P;

    function heightOf(u) {
      const L = NS.fighters.LOOK[u.key];
      return 1.72 * (L ? L.h : 1);
    }

    const INK = '#0c0808';

    function drawOne(u) {
      if (u.fled || u.state === 'out') return;
      const top = P(u.x, u.y, heightOf(u) + 0.45);
      const sc = V.cam.sc;
      // Health tick: a short skewed bar with an ink edge.
      // Only show it once someone is hurt, or for the fighter being followed.
      if (!u.beaten && (u.hp < u.maxHp || V.follow === u.id)) {
        const w = 0.75 * sc, h = Math.max(2.5, sc * 0.05), x = top.x - w / 2, y = top.y;
        ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, -0.35, 1, 0, 0);
        ctx.fillStyle = INK; ctx.fillRect(-1.5, -1.5, w + 3, h + 3);
        ctx.fillStyle = 'rgba(246,240,236,0.12)'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = u.team === 'hero' ? (u.guest ? V.PAL.guest : '#d9e8f0') : V.PAL.glow;
        ctx.fillRect(0, 0, w * Math.max(0, u.hp / u.maxHp), h);
        ctx.restore();
      }
      // Reaction mark: bold lettering that pops and rises.
      if (u.iconT > 0 && u.icon) {
        const col = { '!': '#ffd166', '?': V.PAL.heroGlow, '✦': V.PAL.glow, '…': '#b8c0c8' }[u.icon] || '#fff';
        const k = 0.8 - u.iconT;
        const pop = k < 0.1 ? 1.4 - k * 4 : 1;
        const y = top.y - sc * 0.35 - k * sc * 0.25;
        ctx.save(); ctx.translate(top.x, y); ctx.scale(pop, pop); ctx.transform(1, 0, -0.18, 1, 0, 0);
        ctx.font = `800 ${Math.round(sc * 0.5)}px ${FONT.display}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(4, sc * 0.09); ctx.strokeStyle = INK;
        ctx.strokeText(u.icon, 0, 0); ctx.fillStyle = col; ctx.fillText(u.icon, 0, 0);
        ctx.restore();
      }
      // Speech: a caption by the speaker, no balloon; shouts hit harder.
      if (u.bark && u.barkT > 0 && !(u.barkDelay > 0)) {
        const shout = /!$/.test(u.bark);
        const fs = Math.max(12, Math.round(sc * (shout ? 0.34 : 0.28)));
        ctx.font = `italic 800 ${fs}px ${FONT.display}`;
        const tw = ctx.measureText(u.bark).width;
        const bx = Math.max(tw / 2 + 10, Math.min(V.W - tw / 2 - 10, top.x + sc * 0.2));
        const by = top.y - sc * 0.8;
        ctx.save();
        ctx.globalAlpha = Math.min(1, u.barkT * 2.5);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(4, fs * 0.28); ctx.strokeStyle = INK; ctx.strokeText(u.bark, bx, by);
        ctx.fillStyle = shout ? '#ffd9d2' : '#f6f0ec'; ctx.fillText(u.bark, bx, by);
        ctx.strokeStyle = '#e3263a'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(bx - tw * 0.3, by + fs * 0.85); ctx.lineTo(bx + tw * 0.3, by + fs * 0.85); ctx.stroke();
        ctx.restore();
      }
    }

    function draw(s) {
      if (s.cutscene) return;
      for (const u of s.units) drawOne(u);
    }

    return { draw };
  }

  NS.callouts = { create };
})();
