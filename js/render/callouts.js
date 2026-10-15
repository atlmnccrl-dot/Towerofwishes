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

    function drawOne(u) {
      if (u.fled || u.state === 'out') return;
      const top = P(u.x, u.y, heightOf(u) + 0.45);
      const sc = V.cam.sc;
      // Small health bar
      const w = 0.9 * sc, h = Math.max(3, sc * 0.07);
      ctx.fillStyle = 'rgba(10,12,14,0.65)'; ctx.fillRect(top.x - w / 2, top.y, w, h);
      ctx.fillStyle = u.team === 'hero' ? (u.guest ? '#b9a6ff' : '#7fd0a0') : '#e4644f';
      ctx.fillRect(top.x - w / 2, top.y, w * Math.max(0, u.hp / u.maxHp), h);
      // Reaction icon
      if (u.iconT > 0 && u.icon) {
        const col = { '!': '#ffd166', '?': '#7fe0ff', '✦': '#ff6a52', '…': '#b8c0c8' }[u.icon] || '#fff';
        const y = top.y - sc * 0.32 - (0.8 - u.iconT) * sc * 0.25;
        ctx.font = `800 ${Math.round(sc * 0.42)}px ${FONT.ui}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(12,10,14,0.85)';
        ctx.strokeText(u.icon, top.x, y); ctx.fillStyle = col; ctx.fillText(u.icon, top.x, y);
      }
      if (u.drained > 0 && (!u.iconT || u.iconT <= 0)) {
        ctx.font = `700 ${Math.round(sc * 0.3)}px ${FONT.ui}`; ctx.textAlign = 'center';
        ctx.fillStyle = '#b8c0c8'; ctx.fillText('…', top.x, top.y - sc * 0.25);
      }
      // Speech
      if (u.bark && u.barkT > 0 && !(u.barkDelay > 0)) {
        const fs = Math.max(11, Math.round(sc * 0.26));
        ctx.font = `600 ${fs}px ${FONT.ui}`;
        const tw = ctx.measureText(u.bark).width;
        const bx = top.x, by = top.y - sc * 0.75;
        const pw = tw + fs * 1.1, ph = fs * 1.7;
        ctx.globalAlpha = Math.min(1, u.barkT * 2);
        ctx.fillStyle = 'rgba(243,234,214,0.96)';
        V.roundRect(bx - pw / 2, by - ph / 2, pw, ph, ph / 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx - 5, by + ph / 2 - 1); ctx.lineTo(bx + 3, by + ph / 2 + 8); ctx.lineTo(bx + 6, by + ph / 2 - 1); ctx.fill();
        ctx.fillStyle = '#1a1612'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(u.bark, bx, by + 1);
        ctx.globalAlpha = 1;
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
