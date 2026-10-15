/*
 * Tower of Wishes — effects layer: telegraphs, slash trails, auras, particles,
 * damage numbers, projectiles, All Out banner and heavy-art cutscenes.
 *
 * API (called by core.js):
 *   consume(s)            turn s.fx events into effects (and clear s.fx)
 *   underUnit(u, s)       drawn just before a fighter (ground telegraphs, auras)
 *   overUnit(u, s)        drawn just after a fighter (slash trails)
 *   drawWorld(s, dt)      world-space effects after the scene (projectiles, particles, numbers)
 *   drawScreen(s, dt)     screen-space overlays (cutscene, banners, flashes)
 *   takeHitstop()         seconds of hit-stop requested since last call
 *   resize()              optional
 *
 * V.renderScene(s, opts) redraws the whole scene with the current V.cam; a
 * cutscene can temporarily swap V.cam and clip to compose panels.
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  function create(V) {
    const { ctx, FONT } = V;
    const P = V.P;
    const R = V.Sim.makeRng(23);
    let particles = [], texts = [], flash = 0, flashCol = '255,255,255', hitstop = 0, banner = null;
    const COL = { hero: '#8fd3ff', ember: '#ff9a3d' };

    // ------------------------------------------------------------ events
    function consume(s) {
      const cam = V.cam;
      for (const e of s.fx) {
        if (e.type === 'hit') {
          burst(e.x, e.y, 1.1, e.big ? 14 : 8, e.from === 'hero' ? '#fff3c4' : '#ffb3a3', e.big ? 5 : 3.5);
          texts.push({ x: e.x, y: e.y, z: 2.1, t: 0, life: 0.9, text: String(e.dmg), col: e.from === 'hero' ? '#ffe39a' : '#ff8a78', big: e.big });
          cam.shake = Math.max(cam.shake, e.big ? 9 : 4);
          hitstop = Math.max(hitstop, e.big ? 0.085 : 0.045);
        } else if (e.type === 'parry') {
          burst(e.x, e.y, 1.25, 16, '#cfefff', 6);
          particles.push({ ring: true, x: e.x, y: e.y, z: 1.2, t: 0, life: 0.35, col: '#cfefff' });
          texts.push({ x: e.x, y: e.y, z: 2.2, t: 0, life: 0.8, text: 'PARRY', col: '#a8e4ff', word: true });
          cam.shake = Math.max(cam.shake, 5); hitstop = Math.max(hitstop, 0.1);
        } else if (e.type === 'dodge') {
          dust(e.x, e.y, 6);
          texts.push({ x: e.x, y: e.y, z: 2.0, t: 0, life: 0.7, text: 'DODGE', col: '#e8f0d0', word: true });
        } else if (e.type === 'ko') {
          dust(e.x, e.y, 14);
          particles.push({ ring: true, x: e.x, y: e.y, z: 0.05, t: 0, life: 0.5, col: '#e9dcb8', ground: true });
        } else if (e.type === 'thunk') {
          burst(e.x, e.y, 0.9, 5, '#bdb6a6', 2.5);
        } else if (e.type === 'allout') {
          flash = 0.5; flashCol = '255,154,61';
          banner = { text: 'ALL OUT', sub: 'Everything they have', t: 0, life: 1.4, col: COL.ember };
          cam.shake = 10;
        }
      }
      s.fx.length = 0;
    }
    function burst(x, y, z, n, col, sp) {
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, v = sp * (0.4 + R());
        particles.push({ x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: (R() - 0.2) * v, t: 0, life: 0.25 + R() * 0.25, col, spark: true });
      }
    }
    function dust(x, y, n) {
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, v = 0.6 + R() * 1.2;
        particles.push({ x, y, z: 0.1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 0.4 + R() * 0.5, t: 0, life: 0.5 + R() * 0.4, col: '#cbbf9c', puff: true });
      }
    }

    // ------------------------------------------------------------ per unit
    function underUnit(u) {
      if (u.fled) return;
      const sc = V.cam.sc;
      if (u.allOut > 0) {
        const p = P(u.x, u.y, 0);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sc * 1.1);
        g.addColorStop(0, 'rgba(255,154,61,0.55)'); g.addColorStop(1, 'rgba(255,154,61,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, sc * 1.1, sc * 1.1 * V.cam.pitch, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Telegraph: the attack's reach glows on the ground while winding up.
      if (u.state === 'attack' && u.act && (u.act.phase === 'windup' || u.act.phase === 'feint') && !u.act.A.projectile) {
        const k = u.act.phase === 'feint' ? 1 : Math.min(1, u.act.t / u.act.wind);
        const A = u.act.A, col = u.team === 'hero' ? '143,211,255' : '255,106,82';
        ctx.beginPath();
        const o = P(u.x, u.y, 0.02);
        ctx.moveTo(o.x, o.y);
        for (let i = 0; i <= 16; i++) {
          const a = u.facing - A.arc / 2 + (A.arc * i) / 16;
          const p = P(u.x + Math.cos(a) * (A.range + 0.3), u.y + Math.sin(a) * (A.range + 0.3), 0.02);
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(${col},${0.08 + 0.22 * k})`; ctx.fill();
        ctx.strokeStyle = `rgba(${col},${0.3 + 0.5 * k})`; ctx.lineWidth = 1.5; ctx.stroke();
      }
      if (u.state === 'attack' && u.act && u.act.phase === 'windup' && u.act.A.projectile && u.act.target) {
        const k = Math.min(1, u.act.t / u.act.wind);
        const a = P(u.x, u.y, 0.05), b = P(u.act.target.x, u.act.target.y, 0.05);
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = `rgba(255,106,82,${0.15 + 0.45 * k})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    function overUnit(u) {
      // Slash trail during the strike
      if (!(u.state === 'attack' && u.act && (u.act.phase === 'strike' || (u.act.phase === 'recover' && u.act.t < 0.1)) && !u.act.A.projectile)) return;
      const sc = V.cam.sc, f = u.facing;
      const A = u.act.A, from = 2.4, to = u.act.phase === 'strike' ? 2.4 - Math.min(1, u.act.t / A.active) * 3.8 : -1.4;
      const col2 = u.allOut > 0 ? COL.ember : u.team === 'hero' ? COL.hero : '#ffd2c8';
      ctx.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? '#ffffff' : col2;
        ctx.globalAlpha = pass ? 0.9 : 0.55;
        ctx.lineWidth = (pass ? 0.04 : 0.12) * sc;
        ctx.beginPath();
        for (let i = 0; i <= 14; i++) {
          const aa = f + from + ((to - from) * i) / 14;
          const p = P(u.x + Math.cos(aa) * A.range * 0.85, u.y + Math.sin(aa) * A.range * 0.85, 1.0);
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------------ world fx
    function drawWorld(s, dt) {
      const cam = V.cam;
      for (const p of s.projectiles) {
        V.shadow(p.x, p.y, 0.1, 0.4);
        const q = P(p.x, p.y, p.z), tl = P(p.x - p.vx * 0.04, p.y - p.vy * 0.04, p.z);
        ctx.strokeStyle = 'rgba(230,220,200,0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        ctx.fillStyle = '#d6d0c2'; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(2.5, cam.sc * 0.08), 0, Math.PI * 2); ctx.fill();
      }
      for (const p of particles) {
        p.t += dt;
        if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z + p.vz * dt); p.vz -= 6 * dt; }
        const k = p.t / p.life, q = P(p.x, p.y, p.z);
        ctx.globalAlpha = Math.max(0, 1 - k);
        if (p.ring) {
          const r = (0.3 + k * 1.6) * cam.sc;
          ctx.strokeStyle = p.col; ctx.lineWidth = 3 * (1 - k) + 1;
          ctx.beginPath(); ctx.ellipse(q.x, q.y, r, p.ground ? r * cam.pitch : r, 0, 0, Math.PI * 2); ctx.stroke();
        } else if (p.puff) {
          ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(q.x, q.y, (0.1 + k * 0.25) * cam.sc, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.strokeStyle = p.col; ctx.lineWidth = 2;
          const t2 = P(p.x - p.vx * 0.03, p.y - p.vy * 0.03, p.z - p.vz * 0.03);
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(t2.x, t2.y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      particles = particles.filter((p) => p.t < p.life);
      for (const t of texts) {
        t.t += dt;
        const k = t.t / t.life, q = P(t.x, t.y, t.z + k * 0.7);
        const fs = Math.round(cam.sc * (t.word ? 0.3 : t.big ? 0.48 : 0.36));
        ctx.font = `${t.word ? 800 : 900} ${fs}px ${t.word ? FONT.ui : FONT.display}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = Math.max(0, 1 - k * k);
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(14,10,12,0.85)'; ctx.strokeText(t.text, q.x, q.y);
        ctx.fillStyle = t.col; ctx.fillText(t.text, q.x, q.y);
      }
      ctx.globalAlpha = 1;
      texts = texts.filter((t) => t.t < t.life);
    }

    // ------------------------------------------------------------ cutscene
    function drawCutscene(s) {
      const c = s.cutscene;
      if (!c) return;
      const W = V.W, H = V.H, cam = V.cam;
      const t = c.t, u = c.unit;
      const bars = Math.min(1, t / 0.25) * Math.min(1, (c.dur - t) / 0.3) * H * 0.12;
      const up = P(u.x, u.y, 1.0);
      if (t < c.impactAt) {
        // Energy gathering: lines rushing inward.
        const k = t / c.impactAt;
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.4 * k;
        ctx.strokeStyle = COL.hero; ctx.lineWidth = 2;
        for (let i = 0; i < 26; i++) {
          const a = i * 2.39996 + t * 1.5;
          const r0 = Math.max(W, H) * (0.75 - ((t * 1.6 + i * 0.037) % 1) * 0.55);
          ctx.beginPath();
          ctx.moveTo(up.x + Math.cos(a) * r0, up.y + Math.sin(a) * r0);
          ctx.lineTo(up.x + Math.cos(a) * r0 * 0.82, up.y + Math.sin(a) * r0 * 0.82);
          ctx.stroke();
        }
        ctx.restore();
        const vg = ctx.createRadialGradient(up.x, up.y, Math.min(W, H) * 0.15, up.x, up.y, Math.max(W, H) * 0.75);
        vg.addColorStop(0, 'rgba(6,10,16,0)'); vg.addColorStop(1, `rgba(6,10,16,${0.55 * Math.min(1, t * 3)})`);
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      } else {
        const k = (t - c.impactAt) / 0.5;
        if (k < 1) {
          // Crescent slash and shockwave.
          ctx.save();
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
          ctx.lineWidth = cam.sc * 0.35 * (1 - k * 0.6);
          ctx.beginPath();
          for (let i = 0; i <= 24; i++) {
            const a = u.facing - 1.6 + (3.2 * i) / 24;
            const p = P(u.x + Math.cos(a) * 2.2, u.y + Math.sin(a) * 2.2, 1.1 + Math.sin((i / 24) * Math.PI) * 0.8);
            i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
          }
          ctx.stroke();
          const g = P(u.x, u.y, 0);
          const rr = (0.6 + k * 4) * cam.sc;
          ctx.strokeStyle = COL.hero; ctx.lineWidth = 6 * (1 - k) + 1;
          ctx.beginPath(); ctx.ellipse(g.x, g.y, rr, rr * cam.pitch, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
      }
      // White-out at impact.
      const fk = (t - c.impactAt) / 0.22;
      if (fk >= 0 && fk < 1) { ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - fk)})`; ctx.fillRect(0, 0, W, H); }
      // Letterbox
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 0, W, bars); ctx.fillRect(0, H - bars, W, bars);
      // Title card
      const tk = Math.min(1, t / 0.35);
      const ease = 1 - Math.pow(1 - tk, 3);
      ctx.globalAlpha = Math.min(1, (c.dur - t) / 0.35);
      const fs = Math.round(Math.min(W, H) * 0.11);
      ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.font = `800 ${fs}px ${FONT.display}`;
      const x = W - 24 - (1 - ease) * W * 0.4, y = H - bars - fs * 0.35;
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(5,7,10,0.9)';
      ctx.strokeText(c.name.toUpperCase(), x, y);
      ctx.fillStyle = '#eaf6ff'; ctx.fillText(c.name.toUpperCase(), x, y);
      ctx.font = `700 ${Math.round(fs * 0.3)}px ${FONT.ui}`;
      ctx.fillStyle = COL.hero;
      ctx.fillText(u.name.toUpperCase() + '  ·  HEAVY ART', x, y - fs * 0.95);
      ctx.globalAlpha = 1;
      if (t > 0.4) {
        ctx.font = `600 12px ${FONT.ui}`; ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(234,246,255,0.6)';
        ctx.fillText('Tap to skip', 16, bars + 20);
      }
    }

    function drawScreen(s, dt) {
      const W = V.W, H = V.H;
      drawCutscene(s);
      if (flash > 0) { ctx.fillStyle = `rgba(${flashCol},${flash * 0.6})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 1.4); }
      if (!banner) return;
      banner.t += dt;
      const k = banner.t / banner.life;
      if (k >= 1) { banner = null; return; }
      const fs = Math.round(Math.min(W, H) * 0.14);
      const slide = Math.min(1, banner.t / 0.18);
      ctx.save();
      ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
      ctx.translate(W / 2 + (1 - slide) * -W * 0.3, H * 0.42);
      ctx.transform(1, 0, -0.18, 1, 0, 0);
      ctx.font = `900 ${fs}px ${FONT.display}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(20,8,2,0.85)'; ctx.strokeText(banner.text, 0, 0);
      ctx.fillStyle = banner.col; ctx.fillText(banner.text, 0, 0);
      ctx.font = `700 ${Math.round(fs * 0.2)}px ${FONT.ui}`;
      ctx.fillStyle = '#fff3e0'; ctx.fillText(banner.sub.toUpperCase(), 0, fs * 0.62);
      ctx.restore();
    }

    function takeHitstop() { const h = hitstop; hitstop = 0; return h; }

    return { consume, underUnit, overUnit, drawWorld, drawScreen, takeHitstop };
  }

  NS.fx = { create };
})();
