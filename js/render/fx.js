/*
 * Tower of Wishes — effects layer in manhwa style: brushed telegraphs, ink
 * slash crescents, hit shards, parry starbursts, the crimson All Out aura,
 * impact frames, and the heavy-art cutscene built from slanted panels.
 *
 * API (called by core.js):
 *   consume(s)            turn s.fx events into effects (and clear s.fx)
 *   underUnit(u, s)       drawn just before a fighter (telegraphs, auras)
 *   overUnit(u, s)        drawn just after a fighter (slashes, wisps)
 *   drawWorld(s, dt)      world-space effects after the scene
 *   drawScreen(s, dt)     screen-space overlays (cutscene, banners, flashes)
 *   takeHitstop()         seconds of hit-stop requested since last call
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});
  const INK = '#0c0808';

  function create(V) {
    const { ctx, PAL, FONT } = V;
    const P = V.P;
    const R = V.Sim.makeRng(23);
    let parts = [], texts = [], streaks = [], flash = 0, flashCol = '255,255,255', hitstop = 0, banner = null, impact = 0;
    const fizzles = []; // {unit, t}

    // ------------------------------------------------------------ events
    function consume(s) {
      const cam = V.cam;
      for (const e of s.fx) {
        if (e.type === 'hit') {
          shards(e.x, e.y, 1.15, e.big ? 11 : 7, e.from === 'hero' ? PAL.white : PAL.glow, e.big ? 6 : 4);
          parts.push({ star: true, x: e.x, y: e.y, z: 1.15, t: 0, life: e.big ? 0.28 : 0.18, r: e.big ? 0.9 : 0.55, col: e.from === 'hero' ? '#ffffff' : '#ffd0d4' });
          texts.push({ x: e.x, y: e.y, z: 2.2, t: 0, life: 0.95, text: String(e.dmg), col: e.from === 'hero' ? PAL.bone : PAL.glow, big: e.big, vx: (R() - 0.5) * 0.8 });
          cam.shake = Math.max(cam.shake, e.big ? 11 : 5);
          hitstop = Math.max(hitstop, e.big ? 0.09 : 0.05);
          if (e.big) impact = Math.max(impact, 0.07);
        } else if (e.type === 'parry') {
          parts.push({ star: true, x: e.x, y: e.y, z: 1.25, t: 0, life: 0.38, r: 1.4, col: PAL.heroGlow, rays: true });
          shards(e.x, e.y, 1.25, 12, PAL.heroGlow, 7);
          texts.push({ x: e.x, y: e.y, z: 2.4, t: 0, life: 0.85, text: 'PARRY', col: PAL.heroGlow, word: true });
          cam.shake = Math.max(cam.shake, 6); hitstop = Math.max(hitstop, 0.12);
        } else if (e.type === 'dodge') {
          dust(e.x, e.y, 5);
          texts.push({ x: e.x, y: e.y, z: 2.0, t: 0, life: 0.7, text: 'DODGE', col: '#dfe8e4', word: true });
        } else if (e.type === 'ko') {
          dust(e.x, e.y, 12);
          parts.push({ ring: true, x: e.x, y: e.y, z: 0.05, t: 0, life: 0.5, col: PAL.bone, ground: true });
          impact = Math.max(impact, 0.06);
        } else if (e.type === 'thunk') {
          shards(e.x, e.y, 0.9, 5, '#bdb6a6', 2.5);
        } else if (e.type === 'whiff') {
          // nothing: the slash trail already reads
        } else if (e.type === 'allout') {
          flash = 0.55; flashCol = '227,38,58';
          banner = { text: 'ALL OUT', sub: 'Everything they have', t: 0, life: 1.5 };
          cam.shake = 12; impact = 0.08;
        } else if (e.type === 'dash') {
          const u = s.byId[e.unit];
          if (u) streaks.push({ u, t: 0, life: 0.6, x: e.x, y: e.y });
        } else if (e.type === 'fizzle') {
          const u = s.byId[e.unit];
          if (u) fizzles.push({ u, t: 0 });
        }
      }
      s.fx.length = 0;
    }
    function shards(x, y, z, n, col, sp) {
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, v = sp * (0.5 + R());
        parts.push({ shard: true, x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: (R() - 0.1) * v, t: 0, life: 0.22 + R() * 0.22, col, w: 0.5 + R() });
      }
    }
    function dust(x, y, n) {
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, v = 0.6 + R() * 1.2;
        parts.push({ puff: true, x, y, z: 0.1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 0.4 + R() * 0.5, t: 0, life: 0.5 + R() * 0.4, col: 'rgba(120,112,98,0.7)' });
      }
    }

    // ------------------------------------------------------------ per unit
    function underUnit(u) {
      if (u.fled) return;
      const sc = V.cam.sc;
      if (u.allOut > 0) aura(u, sc, true);
      // Telegraph: a brushed zone that charges up; the edge sharpens as the blow nears.
      if (u.state === 'attack' && u.act && (u.act.phase === 'windup' || u.act.phase === 'feint') && !u.act.A.projectile) {
        const k = u.act.phase === 'feint' ? 1 : Math.min(1, u.act.t / u.act.wind);
        const A = u.act.A, hero = u.team === 'hero';
        const col = hero ? '156,195,221' : '227,38,58';
        const rr = A.range + 0.3;
        const wedge = (frac) => {
          ctx.beginPath();
          const o = P(u.x, u.y, 0.02);
          ctx.moveTo(o.x, o.y);
          for (let i = 0; i <= 18; i++) {
            const a = u.facing - A.arc / 2 + (A.arc * i) / 18;
            const p = P(u.x + Math.cos(a) * rr * frac, u.y + Math.sin(a) * rr * frac, 0.02);
            ctx.lineTo(p.x, p.y);
          }
          ctx.closePath();
        };
        wedge(1);
        ctx.fillStyle = `rgba(${col},${0.1 + 0.12 * k})`; ctx.fill();
        // Charge fill grows from the fighter outward.
        wedge(0.25 + 0.75 * k);
        ctx.fillStyle = `rgba(${col},${0.12 + 0.25 * k})`; ctx.fill();
        // Hatching inside, like screentone.
        ctx.save(); wedge(1); ctx.clip();
        const c = P(u.x, u.y, 0);
        ctx.strokeStyle = `rgba(${col},${0.25 + 0.25 * k})`; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = -8; i <= 8; i++) { const ox = i * sc * 0.22; ctx.moveTo(c.x + ox - sc * 2, c.y - sc * 2); ctx.lineTo(c.x + ox + sc * 2, c.y + sc * 2); }
        ctx.stroke(); ctx.restore();
        // Edge: an inked rim, thicker and brighter as the strike nears.
        ctx.beginPath();
        for (let i = 0; i <= 18; i++) {
          const a = u.facing - A.arc / 2 + (A.arc * i) / 18;
          const p = P(u.x + Math.cos(a) * rr, u.y + Math.sin(a) * rr, 0.02);
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 2 + 4 * k; ctx.stroke();
        ctx.strokeStyle = `rgba(${col},${0.5 + 0.5 * k})`; ctx.lineWidth = 1 + 2.5 * k; ctx.stroke();
      }
      if (u.state === 'attack' && u.act && u.act.phase === 'windup' && u.act.A.projectile && u.act.target) {
        const k = Math.min(1, u.act.t / u.act.wind);
        const a = P(u.x, u.y, 0.05), b = P(u.act.target.x, u.act.target.y, 0.05);
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = `rgba(227,38,58,${0.2 + 0.5 * k})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.setLineDash([]);
      }
      // Opening dash: speed lines streaming behind.
      for (const st of streaks) if (st.u === u) dashLines(u, st, sc);
    }

    function dashLines(u, st, sc) {
      const k = st.t / st.life;
      const a = Math.atan2(u.y - st.y, u.x - st.x);
      if (!isFinite(a)) return;
      ctx.strokeStyle = u.team === 'hero' ? `rgba(220,240,255,${0.6 * (1 - k)})` : `rgba(255,190,190,${0.5 * (1 - k)})`;
      ctx.lineWidth = Math.max(1, sc * 0.03);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const off = (i - 2.5) * 0.12, z = 0.3 + i * 0.22;
        const p0 = P(u.x - Math.cos(a) * 0.3 - Math.sin(a) * off, u.y - Math.sin(a) * 0.3 + Math.cos(a) * off, z);
        const p1 = P(u.x - Math.cos(a) * (1.4 + (i % 3) * 0.5), u.y - Math.sin(a) * (1.4 + (i % 3) * 0.5), z);
        ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
      }
      ctx.stroke();
    }

    // Crimson energy rising off a fighter in All Out, like ink smoke.
    function aura(u, sc, under) {
      const p = P(u.x, u.y, 0);
      if (under) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sc * 1.2);
        g.addColorStop(0, 'rgba(227,38,58,0.55)'); g.addColorStop(1, 'rgba(227,38,58,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, sc * 1.2, sc * 1.2 * V.cam.pitch, 0, 0, Math.PI * 2); ctx.fill();
        return;
      }
      const t = V.time;
      for (let i = 0; i < 5; i++) {
        const ph = t * 2.2 + i * 1.3 + u.x;
        const base = P(u.x + Math.cos(i * 2.1) * 0.35, u.y + Math.sin(i * 2.1) * 0.35, 0.2);
        const top = P(u.x + Math.cos(i * 2.1) * 0.5 + Math.sin(ph) * 0.3, u.y + Math.sin(i * 2.1) * 0.5, 1.8 + ((t * 0.9 + i * 0.3) % 1) * 1.2);
        const mx = (base.x + top.x) / 2 + Math.sin(ph * 1.3) * sc * 0.3, my = (base.y + top.y) / 2;
        const w = sc * 0.12;
        ctx.fillStyle = i % 2 ? 'rgba(142,22,33,0.75)' : 'rgba(227,38,58,0.65)';
        ctx.beginPath();
        ctx.moveTo(base.x - w, base.y);
        ctx.quadraticCurveTo(mx - w * 1.4, my, top.x, top.y);
        ctx.quadraticCurveTo(mx + w * 0.6, my, base.x + w, base.y);
        ctx.closePath(); ctx.fill();
      }
    }

    function overUnit(u) {
      if (u.fled) return;
      const sc = V.cam.sc;
      if (u.allOut > 0) aura(u, sc, false);
      if (u.drained > 0) {
        // Drained: breath clouds and a sweat drop.
        const h = P(u.x, u.y, 1.75);
        const k = (V.time * 1.5) % 1;
        ctx.fillStyle = `rgba(220,220,225,${0.5 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(h.x + Math.cos(u.facing) * sc * (0.2 + k * 0.4), h.y - k * sc * 0.3, sc * (0.06 + k * 0.08), 0, Math.PI * 2); ctx.fill();
      }
      // Slash: a tapered ink-brush crescent with a white core.
      if (u.state === 'attack' && u.act && (u.act.phase === 'strike' || (u.act.phase === 'recover' && u.act.t < 0.12)) && !u.act.A.projectile) {
        const A = u.act.A, f = u.facing;
        const from = 2.5, to = u.act.phase === 'strike' ? 2.5 - Math.min(1, u.act.t / A.active) * 4.1 : -1.6;
        const fade = u.act.phase === 'strike' ? 1 : 1 - u.act.t / 0.12;
        const hero = u.team === 'hero';
        const edge = u.allOut > 0 ? PAL.glow : hero ? PAL.hero : '#ff8d8d';
        const r = A.range * 0.9, z = 1.0;
        const N = 18, outer = [], inner = [];
        for (let i = 0; i <= N; i++) {
          const k = i / N, aa = f + from + (to - from) * k;
          const thick = Math.sin(k * Math.PI) * 0.32 + 0.02; // thickest mid-swing
          const po = P(u.x + Math.cos(aa) * r, u.y + Math.sin(aa) * r, z + 0.05);
          const pi = P(u.x + Math.cos(aa) * r * (1 - thick), u.y + Math.sin(aa) * r * (1 - thick), z);
          outer.push(po); inner.push(pi);
        }
        const crescent = () => {
          ctx.beginPath(); ctx.moveTo(outer[0].x, outer[0].y);
          for (const q of outer) ctx.lineTo(q.x, q.y);
          for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
          ctx.closePath();
        };
        ctx.globalAlpha = fade;
        ctx.lineJoin = 'round';
        ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, sc * 0.05); crescent(); ctx.stroke();
        ctx.fillStyle = edge; crescent(); ctx.fill();
        // white core along the outer edge
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, sc * 0.045);
        ctx.beginPath(); outer.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // ------------------------------------------------------------ world fx
    function drawWorld(s, dt) {
      const cam = V.cam, sc = cam.sc;
      for (const p of s.projectiles) {
        V.shadow(p.x, p.y, 0.1, 0.4);
        const q = P(p.x, p.y, p.z), tl = P(p.x - p.vx * 0.05, p.y - p.vy * 0.05, p.z);
        ctx.strokeStyle = 'rgba(230,220,200,0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        ctx.fillStyle = '#d6d0c2'; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(2.5, sc * 0.08), 0, Math.PI * 2); ctx.fill();
      }
      // Eiryn's failed glyph: a violet line curls into half a circle, then winks out.
      for (const fz of fizzles) {
        fz.t += dt;
        const u = fz.u, k = fz.t / 0.75;
        if (k >= 1) continue;
        const hand = P(u.x + Math.cos(u.facing) * 0.62, u.y + Math.sin(u.facing) * 0.62, 1.45);
        const r = sc * 0.22;
        const sweep = Math.min(1, k / 0.55) * Math.PI;
        ctx.strokeStyle = PAL.glyph; ctx.lineWidth = Math.max(1.5, sc * 0.035);
        ctx.globalAlpha = k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.4) * (Math.sin(fz.t * 60) > 0 ? 1 : 0.3);
        ctx.beginPath(); ctx.arc(hand.x, hand.y, r, Math.PI * 0.5, Math.PI * 0.5 + sweep); ctx.stroke();
        ctx.fillStyle = '#e6dcff'; ctx.beginPath(); ctx.arc(hand.x + Math.cos(Math.PI * 0.5 + sweep) * r, hand.y + Math.sin(Math.PI * 0.5 + sweep) * r, Math.max(1.5, sc * 0.03), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      for (let i = fizzles.length - 1; i >= 0; i--) if (fizzles[i].t > 0.8) fizzles.splice(i, 1);
      for (const st of streaks) st.t += dt;
      streaks = streaks.filter((st) => st.t < st.life);

      for (const p of parts) {
        p.t += dt;
        if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z + p.vz * dt); p.vz -= 7 * dt; }
        const k = p.t / p.life, q = P(p.x, p.y, p.z);
        ctx.globalAlpha = Math.max(0, 1 - k);
        if (p.ring) {
          const r = (0.3 + k * 1.6) * sc;
          ctx.strokeStyle = p.col; ctx.lineWidth = 3 * (1 - k) + 1;
          ctx.beginPath(); ctx.ellipse(q.x, q.y, r, p.ground ? r * cam.pitch : r, 0, 0, Math.PI * 2); ctx.stroke();
        } else if (p.puff) {
          ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(q.x, q.y, (0.1 + k * 0.25) * sc, 0, Math.PI * 2); ctx.fill();
        } else if (p.star) {
          // Four-point starburst with long rays (manhwa glint).
          const r = p.r * sc * (0.6 + 0.6 * (1 - k));
          star(q.x, q.y, r, p.col, p.rays ? 2.4 : 1.6, 0.4 + k * 0.3);
        } else if (p.shard) {
          // A thin ink-edged shard pointing along its flight.
          const a = Math.atan2(p.vy * cam.pitch - p.vz, p.vx), l = sc * 0.18 * p.w, w = sc * 0.035;
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(a);
          ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(l + 2, 0); ctx.lineTo(0, w + 2); ctx.lineTo(-l * 0.4 - 2, 0); ctx.lineTo(0, -w - 2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(l, 0); ctx.lineTo(0, w); ctx.lineTo(-l * 0.4, 0); ctx.lineTo(0, -w); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      parts = parts.filter((p) => p.t < p.life);
      for (const t of texts) {
        t.t += dt;
        const k = t.t / t.life, q = P(t.x + (t.vx || 0) * k, t.y, t.z + k * 0.8);
        const pop = k < 0.12 ? 1.35 - k * 2.9 : 1;
        const fs = Math.round(sc * (t.word ? 0.32 : t.big ? 0.58 : 0.42) * pop);
        ctx.font = `${t.word ? 800 : 800} ${fs}px ${t.word ? FONT.ui : FONT.display}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = Math.max(0, 1 - k * k);
        ctx.save(); ctx.translate(q.x, q.y); ctx.transform(1, 0, -0.15, 1, 0, 0);
        ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, fs * 0.22); ctx.strokeStyle = INK; ctx.strokeText(t.text, 0, 0);
        ctx.fillStyle = t.col; ctx.fillText(t.text, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      texts = texts.filter((t) => t.t < t.life);
    }

    function star(x, y, r, col, rays, thin) {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 4;
        const rr = i % 2 ? r * thin * 0.5 : r * (i % 4 === 0 ? rays : 1);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r * 0.25, 0, Math.PI * 2); ctx.fill();
    }

    // ------------------------------------------------------------ panels
    // Render the scene inside a polygon with its own camera.
    function panel(s, poly, camSet, border) {
      const cam = V.cam, saved = { ...cam };
      ctx.save();
      ctx.beginPath(); poly.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath();
      ctx.clip();
      Object.assign(cam, camSet);
      V.renderScene(s, { noAtmosphere: true });
      for (const k of Object.keys(camSet)) if (!(k in saved)) delete cam[k];
      Object.assign(cam, saved);
      ctx.restore();
      ctx.strokeStyle = border || INK; ctx.lineWidth = 5; ctx.lineJoin = 'miter';
      ctx.beginPath(); poly.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = '#f6f0ec'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    function speedLines(cx, cy, n, r0, r1, col, seed) {
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.sin(i * 12.9898 + seed) * 0.08;
        const w = 0.006 + ((i * 7) % 5) * 0.003;
        const ri = r0 * (0.85 + ((i * 13) % 7) / 20);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1);
        ctx.lineTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri);
        ctx.lineTo(cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1);
        ctx.closePath(); ctx.fill();
      }
    }

    // A manhwa close-up of the eyes, drawn flat into a slanted strip: the face
    // in deep shadow, sharp bangs, glowing slit eyes with starburst glints.
    // poly: strip corners; t: seconds since it appeared (for the glint).
    function portrait(u, poly, t, slide) {
      const L = NS.fighters.LOOK[u.key] || {};
      const hero = u.team === 'hero';
      const glow = u.key === 'eiryn' ? PAL.glyph : hero ? PAL.heroGlow : PAL.glow;
      const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const strip = () => { ctx.beginPath(); poly.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); };
      ctx.save();
      strip(); ctx.fillStyle = hero ? '#10151c' : '#1a0b0d'; ctx.fill();
      ctx.clip();
      speedLines(cx, cy, 70, w * 0.16, w, hero ? 'rgba(156,195,221,0.16)' : 'rgba(227,38,58,0.2)', 5);
      // Face: a wide shadowed oval; only the eye band shows in the strip.
      const fw = Math.min(w * 0.36, h * 2.1), fh = fw * 1.25;
      const skin = (L.skin || ['#c8a090', '#6a4c48'])[1];
      ctx.fillStyle = skin; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(cx, cy + fh * 0.32, fw * 0.5, fh * 0.62, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Deep shadow across most of the face (lit from behind), rim on one edge.
      ctx.fillStyle = 'rgba(10,6,8,0.62)';
      ctx.beginPath(); ctx.ellipse(cx + fw * 0.08, cy + fh * 0.32, fw * 0.47, fh * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(246,236,232,0.7)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(cx, cy + fh * 0.32, fw * 0.5, fh * 0.62, 0, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
      // Eyes: sharp, slanted toward the centre.
      const ey = cy + h * 0.08, gap = fw * 0.2, ew = fw * 0.15, eh = fw * 0.045;
      const tilt = u.key === 'eiryn' ? 0.05 : 0.22;
      for (const sx of [-1, 1]) {
        const ex = cx + sx * gap;
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(sx * tilt);
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.moveTo(-ew * 1.15, eh * 0.2); ctx.quadraticCurveTo(0, -eh * 2.1, ew * 1.15, -eh * 0.3); ctx.quadraticCurveTo(0, eh * 1.6, -ew * 1.15, eh * 0.2); ctx.fill();
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.moveTo(-ew * 0.85, eh * 0.15); ctx.quadraticCurveTo(0, -eh * 1.4, ew * 0.85, -eh * 0.2); ctx.quadraticCurveTo(0, eh * 1.0, -ew * 0.85, eh * 0.15); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -eh * 0.1, ew * 0.18, eh * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        // brow
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, fw * 0.03); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-sx * ew * 0.2 - ew * 0.9, -eh * 3.4 - sx * 0); ctx.lineTo(ew * 1.0, -eh * 2.3); ctx.stroke();
        ctx.restore();
      }
      // Hair across the top: sharp bangs in the hair colours (or hood / brow ridge).
      const hc = L.hairC || ['#222', '#111'];
      if (L.hair === 'bald') {
        ctx.fillStyle = 'rgba(10,6,8,0.75)';
        ctx.beginPath(); ctx.ellipse(cx, y0 - fh * 0.05, fw * 0.55, fh * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        const hood = L.hair === 'hood';
        const n = hood ? 1 : L.hair === 'long' ? 11 : 9;
        ctx.lineJoin = 'miter';
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < n; i++) {
            const k = (i + 0.5) / n;
            const bx = cx - fw * 0.62 + k * fw * 1.24;
            const len = hood ? 0 : h * (0.32 + ((i * 7) % 5) * 0.06) + (Math.abs(k - 0.5) < 0.15 ? h * 0.1 : 0);
            const bw = fw * 0.13;
            const lean = (k - 0.5) * fw * 0.25;
            ctx.beginPath();
            ctx.moveTo(bx - bw, y0 - 4); ctx.lineTo(bx + lean * 0.4, y0 + len + (pass ? 0 : 4)); ctx.lineTo(bx + bw, y0 - 4); ctx.closePath();
            if (pass === 0) { ctx.fillStyle = INK; ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(); ctx.fill(); }
            else { ctx.fillStyle = i % 3 === 0 ? hc[1] : hc[0]; ctx.fill(); }
          }
        }
        if (hood) {
          ctx.fillStyle = (L.hood || hc)[1]; ctx.strokeStyle = INK; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.ellipse(cx, y0, fw * 0.75, h * 0.42, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
        }
        if (L.hair === 'long' || u.key === 'eiryn') {
          // a highlight band on pale hair
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(cx - fw * 0.5, y0 + h * 0.12); ctx.quadraticCurveTo(cx, y0 + h * 0.2, cx + fw * 0.5, y0 + h * 0.1); ctx.stroke();
        }
      }
      ctx.restore();
      // Glints over everything, once the eyes have appeared.
      const gk = Math.min(1, Math.max(0, (t - 0.1) / 0.12));
      if (gk > 0) for (const sx of [-1, 1]) star(cx + sx * gap, ey, Math.min(h * 0.22, fw * 0.16) * gk, glow, 3.4, 0.22);
      // Panel border.
      ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineJoin = 'miter'; strip(); ctx.stroke();
      ctx.strokeStyle = hero ? PAL.hero : PAL.glow; ctx.lineWidth = 2; strip(); ctx.stroke();
      void slide;
    }

    // Heavy art: (a) slanted panels — eyes, then the fighter low and close;
    // (b) charge in the main view; (c) impact frame, crescent, title.
    function drawCutscene(s) {
      const c = s.cutscene;
      if (!c) return;
      const W = V.W, H = V.H, t = c.t, u = c.unit, cam = V.cam;
      const bars = Math.min(1, t / 0.2) * Math.min(1, (c.dur - t) / 0.3) * H * 0.1;
      const up = P(u.x, u.y, 1.0);
      const headZ = 1.6;
      const hero = u.team === 'hero';
      const glow = hero ? PAL.heroGlow : PAL.glow;
      if (t < 0.85) {
        // Panel 1: the eyes, a full-width slanted strip.
        const k = Math.min(1, t / 0.12);
        ctx.fillStyle = 'rgba(8,5,6,0.88)'; ctx.fillRect(0, 0, W, H);
        speedLines(W / 2, H / 2, 70, W * 0.18, W, 'rgba(246,240,236,0.07)', 1);
        const y0 = H * 0.08, y1 = H * 0.42, sl = W * 0.04;
        const slide = (1 - k) * W * 0.5;
        portrait(u, [[-slide, y0 + sl], [W - slide, y0], [W - slide, y1 - sl], [-slide, y1]], t);
        // Panel 2: low angle on the fighter, slams in from below.
        if (t > 0.3) {
          const k2 = Math.min(1, (t - 0.3) / 0.12);
          const yy0 = H * 0.46, yy1 = H * 0.94;
          const off = (1 - k2) * H * 0.6;
          const poly2 = [[W * 0.06, yy0 + sl + off], [W * 0.94, yy0 + off], [W * 0.94, yy1 + off], [W * 0.06, yy1 - sl * 0.5 + off]];
          panel(s, poly2, { x: u.x, y: u.y, sc: Math.min(W, H) * 0.95, cx: W / 2, cy: yy1 + off - H * 0.06, ang: Math.PI / 2 - u.facing + 0.6, pitch: 0.35 });
        }
      } else if (t < c.impactAt) {
        // Charge: the main view, darkened, energy rushing in.
        const k = (t - 0.85) / (c.impactAt - 0.85);
        const vg = ctx.createRadialGradient(up.x, up.y, Math.min(W, H) * 0.12, up.x, up.y, Math.max(W, H) * 0.7);
        vg.addColorStop(0, 'rgba(6,4,6,0)'); vg.addColorStop(1, `rgba(6,4,6,${0.75})`);
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        speedLines(up.x, up.y, 90, Math.min(W, H) * (0.45 - 0.25 * k), Math.max(W, H), `rgba(220,240,255,${0.18 + 0.2 * k})`, Math.floor(t * 30));
      } else {
        const k = (t - c.impactAt) / 0.6;
        // Impact frame: two flipped monochrome frames.
        const ft = t - c.impactAt;
        if (ft < 0.05) { ctx.fillStyle = '#f6f0ec'; ctx.fillRect(0, 0, W, H); }
        else if (ft < 0.1) {
          ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
          speedLines(up.x, up.y, 60, Math.min(W, H) * 0.1, Math.max(W, H), '#f6f0ec', 3);
        } else if (k < 1) {
          // Huge brush crescent and shockwave.
          ctx.save();
          ctx.globalAlpha = 1 - k;
          const N = 26, outer = [], inner = [];
          for (let i = 0; i <= N; i++) {
            const q = i / N, a = u.facing - 1.7 + 3.4 * q;
            const th = Math.sin(q * Math.PI) * 0.5;
            const zz = 1.1 + Math.sin(q * Math.PI) * 0.9;
            outer.push(P(u.x + Math.cos(a) * 2.6, u.y + Math.sin(a) * 2.6, zz));
            inner.push(P(u.x + Math.cos(a) * 2.6 * (1 - th), u.y + Math.sin(a) * 2.6 * (1 - th), zz * 0.9));
          }
          ctx.beginPath(); ctx.moveTo(outer[0].x, outer[0].y);
          for (const q of outer) ctx.lineTo(q.x, q.y);
          for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
          ctx.closePath();
          ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke();
          ctx.fillStyle = hero ? PAL.hero : PAL.glow; ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(3, cam.sc * 0.08);
          ctx.beginPath(); outer.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
          const g = P(u.x, u.y, 0), rr = (0.6 + k * 4.5) * cam.sc;
          ctx.strokeStyle = glow; ctx.lineWidth = 8 * (1 - k) + 1;
          ctx.beginPath(); ctx.ellipse(g.x, g.y, rr, rr * cam.pitch, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
      }
      // Letterbox
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, W, bars); ctx.fillRect(0, H - bars, W, bars);
      // Title lettering (after the panels).
      if (t > 0.85) {
        const tk = Math.min(1, (t - 0.85) / 0.2), ease = 1 - Math.pow(1 - tk, 3);
        ctx.globalAlpha = Math.min(1, (c.dur - t) / 0.35);
        const fs = Math.round(Math.min(W, H) * 0.13);
        ctx.save();
        ctx.translate(W - 24 - (1 - ease) * W * 0.4, H - bars - fs * 0.3);
        ctx.transform(1, 0, -0.2, 1, 0, 0);
        ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
        ctx.font = `800 ${fs}px ${FONT.display}`;
        ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.14; ctx.strokeStyle = INK;
        ctx.strokeText(c.name.toUpperCase(), 0, 0);
        ctx.fillStyle = PAL.white; ctx.fillText(c.name.toUpperCase(), 0, 0);
        ctx.font = `800 ${Math.round(fs * 0.26)}px ${FONT.ui}`;
        ctx.lineWidth = 5; ctx.strokeText(u.name.toUpperCase() + '  ·  HEAVY ART', 0, -fs * 0.95);
        ctx.fillStyle = hero ? PAL.hero : PAL.glow; ctx.fillText(u.name.toUpperCase() + '  ·  HEAVY ART', 0, -fs * 0.95);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      if (t > 0.4) {
        ctx.font = `700 12px ${FONT.ui}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = 'rgba(246,240,236,0.6)';
        ctx.fillText('Tap to skip', 16, Math.max(bars, 8) + 18);
      }
    }

    function drawBanner(dt) {
      const W = V.W, H = V.H;
      if (!banner) return;
      banner.t += dt;
      const k = banner.t / banner.life;
      if (k >= 1) { banner = null; return; }
      const slide = Math.min(1, banner.t / 0.14);
      const out = k > 0.8 ? (k - 0.8) / 0.2 : 0;
      const fs = Math.round(Math.min(W, H) * 0.17);
      // A slanted black panel slams across the screen.
      const y = H * 0.42, h = fs * 1.45;
      ctx.save();
      ctx.globalAlpha = 1 - out;
      ctx.translate((1 - slide) * -W + out * W * 0.3, 0);
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.moveTo(0, y - h * 0.55); ctx.lineTo(W, y - h * 0.7); ctx.lineTo(W, y + h * 0.5); ctx.lineTo(0, y + h * 0.65); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = PAL.glow; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.clip();
      speedLines(W * 0.5, y, 40, W * 0.25, W, 'rgba(227,38,58,0.25)', 7);
      ctx.restore();
      ctx.translate(W / 2, y);
      ctx.transform(1, 0, -0.22, 1, 0, 0);
      ctx.font = `800 ${fs}px ${FONT.display}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.12; ctx.strokeStyle = '#000'; ctx.strokeText(banner.text, 0, 0);
      ctx.fillStyle = PAL.glow; ctx.fillText(banner.text, 0, 0);
      ctx.font = `800 ${Math.round(fs * 0.18)}px ${FONT.ui}`;
      ctx.fillStyle = PAL.bone; ctx.fillText(banner.sub.toUpperCase(), 0, fs * 0.6);
      ctx.restore();
    }

    function drawScreen(s, dt) {
      const W = V.W, H = V.H;
      drawCutscene(s);
      if (impact > 0) {
        // Small impact frame for big hits: a brief inverted flash.
        ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, 0, W, H); ctx.restore();
        impact -= dt || 0.016;
      }
      if (flash > 0) { ctx.fillStyle = `rgba(${flashCol},${flash * 0.6})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - (dt || 0) * 1.6); }
      drawBanner(dt || 0);
    }

    function takeHitstop() { const h = hitstop; hitstop = 0; return h; }

    return { consume, underUnit, overUnit, drawWorld, drawScreen, takeHitstop, panel, speedLines, star, portrait };
  }

  NS.fx = { create };
})();
