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
    let blinks = [], dissolves = [];
    let heals = [], hazards = [], hazHits = []; // healing threads; boss area marks and their impacts
    let groundDone = false; // hazard marks are painted once per scene pass, under the fighters
    const combo = { n: 0, last: -9, pop: 0 }; // the heroes' run of hits
    const slashTilt = new WeakMap(); let slashFlip = 1; // per swing: which way the arc leans
    const lanceState = new WeakMap(); // cutscene -> {hit: Set of unit ids}
    let GLYPH = '169,139,255', lanceHex = '#a98bff'; const GLYPH_CORE = '#efe8ff';

    // ------------------------------------------------------------ events
    let lastMatch = null;
    function consume(s) {
      const cam = V.cam;
      // A new match: drop marks and threads left over from the last one.
      if (s.units && s !== lastMatch) { lastMatch = s; heals = []; hazards = []; hazHits = []; }
      for (const e of s.fx) {
        if (e.type === 'hit') {
          // Everything scales with the damage: sparks thrown along the blow,
          // the flash, the number, the shake. Big blows get a cut-flash and
          // an impact frame; the biggest read as crits (gold lettering).
          const hero = e.from === 'hero', dmg = e.dmg || 0;
          const q = Math.max(0.6, Math.min(2.2, dmg / 16));
          const crit = !s.cutscene && dmg >= 24;
          const a = blowDir(s, e);
          shards(e.x, e.y, 1.15, Math.round(4 + 4 * q), hero ? PAL.white : PAL.glow, 3 + 2.2 * q, a);
          parts.push({ star: true, x: e.x, y: e.y, z: 1.15, t: 0, life: 0.12 + 0.08 * q, r: 0.35 + 0.3 * q, col: hero ? '#ffffff' : '#ffd0d4', rays: crit });
          if (e.big || crit) parts.push({ cut: true, x: e.x, y: e.y, z: 1.15, t: 0, life: 0.16, a, len: 0.55 + 0.35 * q, col: crit ? '#ffe7a8' : '#ffffff', seed: R() });
          texts.push({ x: e.x, y: e.y, z: 2.1, t: 0, life: crit ? 1.15 : 0.9, text: String(dmg), col: crit ? (hero ? '#ffd166' : '#ff6b78') : hero ? PAL.bone : PAL.glow, size: q, crit, vx: (R() - 0.5) * 0.8 });
          cam.shake = Math.max(cam.shake, 1.8 + 3.2 * q); // restrained: the pose carries the blow
          if (e.big && !s.cutscene) dust(e.x, e.y, 3);
          hitstop = Math.max(hitstop, crit ? 0.12 : e.big ? 0.08 : 0.04);
          if (e.big || crit) impact = Math.max(impact, crit ? 0.06 : 0.04);
          if (!s.cutscene) nudge(e.x, e.y, a, 2 + 3 * q);
          if (hero && !s.cutscene) {
            combo.n = V.time - combo.last < 1.3 ? combo.n + 1 : 1;
            combo.last = V.time; combo.pop = 0;
          }
        } else if (e.type === 'parry') {
          // Steel on steel: a clash star, a ring, sparks raining off.
          parts.push({ star: true, x: e.x, y: e.y, z: 1.25, t: 0, life: 0.3, r: 1.3, col: PAL.heroGlow, rays: true });
          parts.push({ ring: true, x: e.x, y: e.y, z: 1.25, t: 0, life: 0.28, col: '#ffffff' });
          for (let i = 0; i < 14; i++) {
            const a = R() * Math.PI * 2, v = 2.5 + R() * 4;
            parts.push({ spark: true, x: e.x, y: e.y, z: 1.25, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 1 + R() * 3, t: 0, life: 0.3 + R() * 0.25 });
          }
          texts.push({ x: e.x, y: e.y, z: 2.4, t: 0, life: 0.85, text: 'PARRY', col: PAL.heroGlow, word: true });
          cam.shake = Math.max(cam.shake, 6); hitstop = Math.max(hitstop, 0.12);
          impact = Math.max(impact, 0.03);
        } else if (e.type === 'dodge') {
          dust(e.x, e.y, 5);
          texts.push({ x: e.x, y: e.y, z: 2.0, t: 0, life: 0.7, text: 'DODGE', col: '#dfe8e4', word: true });
        } else if (e.type === 'ko') {
          // The finishing blow on a fighter: a freeze, an impact frame, a
          // burst of lines and lettering over where they fell.
          dust(e.x, e.y, 12);
          parts.push({ ring: true, x: e.x, y: e.y, z: 0.05, t: 0, life: 0.5, col: PAL.bone, ground: true });
          let v = null, bd = 1.5;
          for (const o of s.units) { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd && (o.state === 'out' || o.hp <= 0)) { bd = d; v = o; } }
          const foe = !v || v.team !== 'hero';
          impact = Math.max(impact, 0.08);
          if (!s.cutscene) {
            hitstop = Math.max(hitstop, 0.16);
            cam.shake = Math.max(cam.shake, 10);
            parts.push({ burst: true, x: e.x, y: e.y, z: 1.0, t: 0, life: 0.3, col: foe ? '#ffffff' : PAL.glow });
            texts.push({ x: e.x, y: e.y, z: 2.5, t: 0, life: 1.4, text: foe ? 'K.O.' : 'DOWN', col: foe ? PAL.white : PAL.glow, ko: true });
          }
          if (foe && s.result && s.result.outcome === 'win') banner = { text: 'FINISH', sub: 'The last one falls', t: 0, life: 1.5, col: PAL.white };
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
        } else if (e.type === 'blink') {
          // Teleport: ink burst where they stood, a streak, a flash where they land.
          const u = s.byId[e.unit], hero = !!u && u.team === 'hero';
          const h = u ? 1.75 * Math.sqrt(u.r / 0.36) : 1.8;
          blinks.push({ x0: e.x0, y0: e.y0, x1: e.x1, y1: e.y1, t: 0, life: 0.55, hero, h, w: u ? u.r : 0.35 });
          inkBurst(e.x0, e.y0, h * 0.55, 12, hero);
          shards(e.x1, e.y1, h * 0.55, 8, hero ? PAL.heroGlow : '#ffb3bd', 5);
          parts.push({ star: true, x: e.x1, y: e.y1, z: h * 0.55, t: 0, life: 0.2, r: 0.8, col: hero ? '#ffffff' : '#ffd0d4', rays: true });
          parts.push({ ring: true, x: e.x1, y: e.y1, z: 0.03, t: 0, life: 0.35, col: hero ? PAL.hero : PAL.glow, ground: true });
          cam.shake = Math.max(cam.shake, 3);
        } else if (e.type === 'heal') {
          // A thread of green-white light from the healer's hands to the
          // wound, a soft bloom there and the amount in green.
          const from = s.byId[e.unit], to = s.byId[e.target] || null;
          heals.push({ from, to, x: e.x, y: e.y, t: 0, life: 0.95, seed: R() });
          texts.push({ x: e.x, y: e.y, z: 2.2, t: 0, life: 1.0, text: '+' + e.amt, col: '#9ff5bf', size: 0.85, vx: (R() - 0.5) * 0.5 });
          for (let i = 0; i < 10; i++) {
            const a = R() * Math.PI * 2, rr = 0.15 + R() * 0.35;
            parts.push({ mote: true, float: true, x: e.x + Math.cos(a) * rr, y: e.y + Math.sin(a) * rr, z: 0.3 + R() * 1.2, vx: 0, vy: 0, vz: 0.6 + R() * 0.9, t: -0.12 - R() * 0.3, life: 0.6 + R() * 0.5, r: 0.03 + R() * 0.03, col: R() < 0.6 ? '168,240,192' : '240,255,246' });
          }
        } else if (e.type === 'hazard') {
          // A boss's area attack: a mark on the ground that fills over the wind-up.
          const fire = e.kind === 'fire';
          hazards.push({ x: e.x, y: e.y, r: e.r, windup: e.windup || 1, kind: e.kind, t: 0, seed: R() });
          if (e.name) texts.push({ x: e.x, y: e.y, z: 0.6, t: 0, life: Math.min(1.1, (e.windup || 1) * 0.9), text: String(e.name).toUpperCase(), col: fire ? '#ffb27a' : '#bfe6ff', word: true });
        } else if (e.type === 'hazardHit') {
          const fire = e.kind === 'fire';
          for (let i = hazards.length - 1; i >= 0; i--) if (Math.hypot(hazards[i].x - e.x, hazards[i].y - e.y) < 0.05) hazards.splice(i, 1);
          hazHits.push({ x: e.x, y: e.y, r: e.r, kind: e.kind, t: 0, life: fire ? 2.4 : 1.4, seed: R() });
          const n = fire ? 26 : 30;
          for (let i = 0; i < n; i++) {
            const a = R() * Math.PI * 2, rr = R() * e.r * 0.8, v = 2 + R() * 4;
            if (fire) parts.push({ shard: true, x: e.x + Math.cos(a) * rr, y: e.y + Math.sin(a) * rr, z: 0.2, vx: Math.cos(a) * v * 0.6, vy: Math.sin(a) * v * 0.6, vz: 3 + R() * 5, t: 0, life: 0.5 + R() * 0.5, col: R() < 0.5 ? '#ff8a2a' : '#ffd27a', w: 0.6 + R() });
            else parts.push({ drop: true, x: e.x + Math.cos(a) * rr, y: e.y + Math.sin(a) * rr, z: 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 2 + R() * 6, t: 0, life: 0.6 + R() * 0.5, r: 0.04 + R() * 0.05 });
          }
          parts.push({ ring: true, x: e.x, y: e.y, z: 0.03, t: 0, life: 0.6, col: fire ? '#ff9a3a' : '#e6f6ff', ground: true });
          cam.shake = Math.max(cam.shake, fire ? 11 : 13);
          hitstop = Math.max(hitstop, 0.05);
          flash = Math.max(flash, 0.22); flashCol = fire ? '255,140,60' : '190,230,255';
        } else if (e.type === 'dissolve') {
          // A Tower fragment comes apart into black-violet ash and rising light.
          const big = !!e.big, h = big ? 3.0 : 1.8, w = big ? 0.85 : 0.36;
          dissolves.push({ x: e.x, y: e.y, t: 0, life: big ? 1.7 : 1.1, big, h, w });
          for (let i = 0; i < (big ? 70 : 34); i++) {
            const a = R() * Math.PI * 2, rr = R() * w, z = R() * h;
            parts.push({ ash: true, float: true, x: e.x + Math.cos(a) * rr, y: e.y + Math.sin(a) * rr, z, vx: Math.cos(a) * (0.2 + R() * 0.6), vy: Math.sin(a) * (0.2 + R() * 0.6), vz: 0.4 + R() * 1.4, t: -R() * 0.35, life: 0.9 + R() * (big ? 1.2 : 0.7), w: 0.06 + R() * (big ? 0.16 : 0.1), rot: R() * 6, spin: (R() - 0.5) * 8, col: R() < 0.55 ? '#1a0f22' : '#3b2350' });
          }
          for (let i = 0; i < (big ? 40 : 18); i++) {
            const a = R() * Math.PI * 2, rr = R() * w * 0.8;
            parts.push({ mote: true, float: true, x: e.x + Math.cos(a) * rr, y: e.y + Math.sin(a) * rr, z: R() * h * 0.8, vx: (R() - 0.5) * 0.3, vy: (R() - 0.5) * 0.3, vz: 0.8 + R() * 1.6, t: -R() * 0.5, life: 0.8 + R() * 1.0, r: 0.025 + R() * 0.04, col: R() < 0.5 ? GLYPH : '255,236,226' });
          }
          parts.push({ ring: true, x: e.x, y: e.y, z: 0.03, t: 0, life: big ? 0.9 : 0.6, col: '#7a5cc8', ground: true });
          cam.shake = Math.max(cam.shake, big ? 12 : 4);
          if (big) { impact = Math.max(impact, 0.08); flash = Math.max(flash, 0.35); flashCol = '220,205,255'; }
        }
      }
      s.fx.length = 0;
    }
    // Which way a blow travelled (world angle): from the nearest fighter of
    // the striking team to the point of impact.
    function blowDir(s, e) {
      let best = null, bd = Infinity;
      for (const u of s.units) {
        if (u.team !== e.from || u.fled || u.state === 'out') continue;
        const d = Math.hypot(u.x - e.x, u.y - e.y) - (u.state === 'attack' ? 1 : 0);
        if (d < bd) { bd = d; best = u; }
      }
      if (!best) return null;
      const a = Math.atan2(e.y - best.y, e.x - best.x);
      return isFinite(a) && (best.x !== e.x || best.y !== e.y) ? a : best.facing;
    }
    // A short kick of the whole frame along the blow, springing back (core.js).
    function nudge(x, y, a, mag) {
      if (a == null) return;
      const p0 = P(x, y, 0), p1 = P(x + Math.cos(a), y + Math.sin(a), 0);
      const dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.hypot(dx, dy) || 1;
      const cam = V.cam;
      cam.kx = Math.max(-12, Math.min(12, cam.kx + (dx / l) * mag));
      cam.ky = Math.max(-12, Math.min(12, cam.ky + (dy / l) * mag));
    }
    // dir: optional world angle; most shards fly along it.
    function shards(x, y, z, n, col, sp, dir) {
      for (let i = 0; i < n; i++) {
        const a = dir != null && i % 4 ? dir + (R() - 0.5) * 1.5 : R() * Math.PI * 2, v = sp * (0.5 + R());
        parts.push({ shard: true, x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: (R() - 0.1) * v, t: 0, life: 0.22 + R() * 0.22, col, w: 0.5 + R() });
      }
    }
    // Ink drops thrown off a vanishing body.
    function inkBurst(x, y, z, n, hero) {
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, v = 1.2 + R() * 2.8;
        parts.push({ shard: true, x, y, z: z * (0.4 + R() * 1.2), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: (R() - 0.2) * v, t: 0, life: 0.25 + R() * 0.25, col: hero ? '#2a3440' : '#2a0f18', w: 0.8 + R() * 0.8 });
      }
    }
    function dust(x, y, n) {
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, v = 0.6 + R() * 1.2;
        parts.push({ puff: true, x, y, z: 0.1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 0.4 + R() * 0.5, t: 0, life: 0.5 + R() * 0.4, col: 'rgba(120,112,98,0.7)' });
      }
    }

    // ------------------------------------------------------------ per unit
    function underUnit(u, s) {
      if (u.fled) return;
      const sc = V.cam.sc;
      if (!groundDone) { groundDone = true; drawHazardMarks(s); }
      if (V.follow === u.id && u.state !== 'out') {
        // Followed fighter: a bright ring on the ground.
        const p = P(u.x, u.y, 0.01), r = sc * 0.62;
        ctx.strokeStyle = INK; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * V.cam.pitch, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#f6f0ec'; ctx.lineWidth = 2; ctx.stroke();
      }
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

    // The swing ribbon: oldest end thin and faint, the leading end bright.
    function drawTrail(u, pts, sc) {
      const hero = u.team === 'hero', ao = u.allOut > 0;
      const rgb = ao ? '227,38,58' : hero ? '170,205,228' : '255,150,150';
      const now = V.time, n = pts.length;
      const P2 = pts.map((p) => P(p.x, p.y, p.z));
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 1; i < n; i++) {
        const age = (now - pts[i].t) / 0.2;
        if (age >= 1) continue;
        const k = i / (n - 1);
        const a = (1 - age) * Math.pow(k, 0.8);
        const w = Math.max(1.5, sc * 0.11 * Math.pow(k, 1.2) * (1 - age * 0.5));
        ctx.strokeStyle = `rgba(${rgb},${(0.5 * a).toFixed(3)})`; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(P2[i - 1].x, P2[i - 1].y); ctx.lineTo(P2[i].x, P2[i].y); ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${(0.85 * a).toFixed(3)})`; ctx.lineWidth = Math.max(1, w * 0.3);
        ctx.beginPath(); ctx.moveTo(P2[i - 1].x, P2[i - 1].y); ctx.lineTo(P2[i].x, P2[i].y); ctx.stroke();
      }
      ctx.restore();
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
      // Weapon trail: the real path of the blade tip (or fist, or foot) over the last
      // moments of the swing, a tapered ribbon with a bright core.
      const CBm = window.TowRender && window.TowRender.combat;
      const trail = CBm && CBm.trailOf(u);
      const trailing = trail && u.state === 'attack' && u.act && !u.act.A.projectile;
      if (trailing) drawTrail(u, trail, sc);
      // Slash: a tapered ink-brush crescent with a white core.
      if (!trailing && u.state === 'attack' && u.act && (u.act.phase === 'strike' || (u.act.phase === 'recover' && u.act.t < 0.12)) && !u.act.A.projectile) {
        // A sharp crescent: a needle point at the blade's leading edge, the
        // body swelling behind it and the tail fading out. Each swing is
        // tilted a little (alternating), so combos read as separate cuts.
        const A = u.act.A, f = u.facing, act = u.act;
        const strike = act.phase === 'strike';
        const prog = strike ? Math.min(1, act.t / A.active) : 1;
        const fade = strike ? 1 : 1 - act.t / 0.12;
        let tilt = slashTilt.get(act);
        if (tilt == null) { tilt = (slashFlip = -slashFlip) * (0.15 + R() * 0.2); slashTilt.set(act, tilt); }
        const sweep = 4.0, head = 2.3 - sweep * prog, tail = Math.min(2.3, head + Math.min(sweep * prog, 2.8) + 0.2);
        const hero = u.team === 'hero';
        const rgb = u.allOut > 0 ? '227,38,58' : hero ? '156,195,221' : '255,141,141';
        const r = A.range * 0.92, z = 1.0;
        const N = 16, outer = [], inner = [];
        for (let i = 0; i <= N; i++) {
          const k = i / N, aa = f + tail + (head - tail) * k; // k = 1 at the head
          const thick = 0.3 * Math.pow(k, 1.3) * (k > 0.88 ? (1 - k) / 0.12 : 1) + 0.01;
          const zz = z + tilt * (k - 0.5) * 2;
          outer.push(P(u.x + Math.cos(aa) * r, u.y + Math.sin(aa) * r, zz + 0.04));
          inner.push(P(u.x + Math.cos(aa) * r * (1 - thick), u.y + Math.sin(aa) * r * (1 - thick), zz));
        }
        const crescent = () => {
          ctx.beginPath(); ctx.moveTo(outer[0].x, outer[0].y);
          for (const q of outer) ctx.lineTo(q.x, q.y);
          for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
          ctx.closePath();
        };
        const t0 = outer[0], t1 = outer[N];
        const g = ctx.createLinearGradient(t0.x, t0.y, t1.x, t1.y);
        g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(0.55, `rgba(${rgb},0.55)`); g.addColorStop(1, `rgba(${rgb},1)`);
        ctx.globalAlpha = fade;
        ctx.lineJoin = 'round';
        // ink only under the leading half, so the tail stays clean
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, sc * 0.05);
        ctx.beginPath(); for (let i = N >> 1; i <= N; i++) i > N >> 1 ? ctx.lineTo(outer[i].x, outer[i].y) : ctx.moveTo(outer[i].x, outer[i].y); ctx.stroke();
        ctx.fillStyle = g; crescent(); ctx.fill();
        // white core on the leading edge
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.2, sc * 0.035); ctx.lineCap = 'round';
        ctx.beginPath(); for (let i = Math.round(N * 0.45); i <= N; i++) i > Math.round(N * 0.45) ? ctx.lineTo(outer[i].x, outer[i].y) : ctx.moveTo(outer[i].x, outer[i].y); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // ------------------------------------------------------------ world fx
    function drawWorld(s, dt) {
      const cam = V.cam, sc = cam.sc;
      if (!groundDone) drawHazardMarks(s);
      groundDone = false;
      for (const p of s.projectiles) drawProjectile(p, sc);
      drawHeals(dt, sc);
      drawHazardsAbove(s, dt, sc);
      drawBlinks(dt, sc);
      drawDissolves(dt, sc);
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
        if (p.t < 0) continue; // not started yet
        if (p.float) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 1 - dt * 0.8; p.vy *= 1 - dt * 0.8; }
        else if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z + p.vz * dt); p.vz -= 7 * dt; }
        const k = p.t / p.life, q = P(p.x, p.y, p.z);
        ctx.globalAlpha = Math.max(0, 1 - k);
        if (p.ash) {
          // A flake of black-violet ash, tumbling as it rises.
          const r = Math.max(1.5, p.w * sc * (1 - k * 0.5)), a = p.rot + p.spin * p.t;
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(a);
          ctx.fillStyle = p.col;
          ctx.beginPath(); ctx.moveTo(-r, -r * 0.3); ctx.lineTo(r * 0.2, -r * 0.6); ctx.lineTo(r, r * 0.2); ctx.lineTo(-r * 0.3, r * 0.5); ctx.closePath(); ctx.fill();
          if (k < 0.5) { ctx.strokeStyle = `rgba(${GLYPH},${0.6 * (1 - k * 2)})`; ctx.lineWidth = 1; ctx.stroke(); }
          ctx.restore();
        } else if (p.mote) {
          // A rising mote of light: a bright point with a faint halo.
          const r = Math.max(1, p.r * sc * 0.6) * (1 + 0.3 * Math.sin(p.t * 20));
          ctx.fillStyle = `rgba(${p.col},0.25)`;
          ctx.fillRect(q.x - r * 2.2, q.y - r * 2.2, r * 4.4, r * 4.4);
          ctx.fillStyle = `rgba(${p.col},1)`;
          ctx.beginPath(); ctx.moveTo(q.x, q.y - r * 1.6); ctx.lineTo(q.x + r * 0.7, q.y); ctx.lineTo(q.x, q.y + r * 1.6); ctx.lineTo(q.x - r * 0.7, q.y); ctx.closePath(); ctx.fill();
        } else if (p.ring) {
          const r = (0.3 + k * 1.6) * sc;
          ctx.strokeStyle = p.col; ctx.lineWidth = 3 * (1 - k) + 1;
          ctx.beginPath(); ctx.ellipse(q.x, q.y, r, p.ground ? r * cam.pitch : r, 0, 0, Math.PI * 2); ctx.stroke();
        } else if (p.drop) {
          // A drop of thrown water: a bright bead with a short streak.
          const b = P(p.x - p.vx * 0.03, p.y - p.vy * 0.03, Math.max(0, p.z - p.vz * 0.03)), r = Math.max(1.2, p.r * sc);
          ctx.strokeStyle = 'rgba(200,236,255,0.7)'; ctx.lineWidth = r; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          ctx.fillStyle = '#f2fbff'; ctx.beginPath(); ctx.arc(q.x, q.y, r * 0.6, 0, Math.PI * 2); ctx.fill();
        } else if (p.puff) {
          ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(q.x, q.y, (0.1 + k * 0.25) * sc, 0, Math.PI * 2); ctx.fill();
        } else if (p.spark) {
          // A hot streak of metal: a short line along its flight, white head.
          const b = P(p.x - p.vx * 0.035, p.y - p.vy * 0.035, Math.max(0, p.z - p.vz * 0.035));
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#ffc06a'; ctx.lineWidth = Math.max(1.5, sc * 0.03);
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(q.x - 1, q.y - 1, 2, 2);
        } else if (p.cut) {
          // Cut-flash: a thin lens of light across the body, opening then gone.
          const ang = p.a == null ? -0.6 : screenAng(p.x, p.y, p.a) + Math.PI / 2 + (p.seed - 0.5) * 0.8;
          const L = p.len * sc * (0.6 + 0.6 * Math.min(1, k * 3)), w = sc * 0.07 * Math.sin(Math.min(1, k * 1.4) * Math.PI);
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(ang);
          ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-L - 2, 0); ctx.quadraticCurveTo(0, -w - 3, L + 2, 0); ctx.quadraticCurveTo(0, w + 3, -L - 2, 0); ctx.fill();
          ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.quadraticCurveTo(0, -w, L, 0); ctx.quadraticCurveTo(0, w, -L, 0); ctx.fill();
          ctx.restore();
        } else if (p.burst) {
          // Radial speed lines bursting out of a knockout.
          const r0 = sc * (0.4 + k * 0.9), r1 = sc * (1.2 + k * 1.8);
          ctx.strokeStyle = p.col; ctx.lineWidth = Math.max(1.5, sc * 0.03);
          ctx.beginPath();
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + (i % 2) * 0.1, rr = i % 3 ? r1 : r1 * 1.3;
            ctx.moveTo(q.x + Math.cos(a) * r0, q.y + Math.sin(a) * r0 * 0.8); ctx.lineTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr * 0.8);
          }
          ctx.stroke();
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
      if (parts.length > 600) parts.splice(0, parts.length - 600);
      for (const t of texts) {
        t.t += dt;
        // Lettering: slams in oversized, settles, drifts up and fades.
        const k = t.t / t.life, q = P(t.x + (t.vx || 0) * k, t.y, t.z + k * (t.ko ? 0.3 : 0.8));
        const slam = t.ko ? 2.2 : t.crit ? 1.8 : 1.35;
        const pop = k < 0.1 ? slam - (slam - 1) * (k / 0.1) : 1;
        const base = t.word ? 0.3 : t.ko ? 0.62 : 0.3 + 0.1 * (t.size || 1) + (t.crit ? 0.08 : 0);
        const fs = Math.max(11, Math.round(sc * base * pop));
        ctx.font = `800 ${fs}px ${t.word ? FONT.ui : FONT.display}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = Math.max(0, 1 - Math.pow(k, t.ko ? 4 : 2));
        ctx.save(); ctx.translate(q.x, q.y); ctx.transform(1, 0, t.ko ? -0.3 : -0.15, 1, 0, 0);
        ctx.lineJoin = 'round';
        if (t.crit || t.ko) {
          // a crimson drop shadow under the ink, manhwa lettering
          ctx.fillStyle = PAL.crimson; ctx.fillText(t.text, fs * 0.08, fs * 0.08);
          ctx.lineWidth = Math.max(4, fs * 0.2); ctx.strokeStyle = PAL.crimson; ctx.strokeText(t.text, fs * 0.08, fs * 0.08);
        }
        ctx.lineWidth = Math.max(3.5, fs * 0.2); ctx.strokeStyle = INK; ctx.strokeText(t.text, 0, 0);
        ctx.fillStyle = t.col; ctx.fillText(t.text, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      texts = texts.filter((t) => t.t < t.life);
    }

    // ------------------------------------------------------------ projectiles
    // Arrows, force bolts, pressure glyphs and thrown stones each read differently.
    function drawProjectile(p, sc) {
      const name = p.A && p.A.name;
      const sp = Math.hypot(p.vx, p.vy) || 1, dx = p.vx / sp, dy = p.vy / sp;
      const q = P(p.x, p.y, p.z);
      V.shadow(p.x, p.y, name === 'Arrow' ? 0.06 : 0.12, 0.35);
      if (name === 'Arrow') {
        // A thin shaft with a dark head and pale fletching, a faint red streak behind.
        const tail = P(p.x - dx * 0.75, p.y - dy * 0.75, p.z), head = P(p.x + dx * 0.12, p.y + dy * 0.12, p.z);
        const streak = P(p.x - dx * 2.2, p.y - dy * 2.2, p.z);
        ctx.strokeStyle = 'rgba(227,38,58,0.3)'; ctx.lineWidth = Math.max(1, sc * 0.04);
        ctx.beginPath(); ctx.moveTo(streak.x, streak.y); ctx.lineTo(tail.x, tail.y); ctx.stroke();
        ctx.lineCap = 'round';
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.5, sc * 0.06);
        ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.stroke();
        ctx.strokeStyle = '#a58a66'; ctx.lineWidth = Math.max(1.2, sc * 0.025); ctx.stroke();
        const a = Math.atan2(head.y - tail.y, head.x - tail.x), hl = Math.max(4, sc * 0.16);
        ctx.save(); ctx.translate(head.x, head.y); ctx.rotate(a);
        ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(hl * 0.7, 0); ctx.lineTo(-hl * 0.4, hl * 0.35); ctx.lineTo(-hl * 0.4, -hl * 0.35); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.translate(tail.x, tail.y); ctx.rotate(a);
        ctx.fillStyle = '#d9cbb6'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
        for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hl * 0.9, 0); ctx.lineTo(hl * 0.2, sgn * hl * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        ctx.restore();
        return;
      }
      if (name === 'Force Bolt' || name === 'Pressure Glyph') {
        const glyph = name === 'Pressure Glyph';
        const rgb = glyph ? GLYPH : '156,195,221', core = glyph ? GLYPH_CORE : PAL.heroGlow;
        // Trail: a tapering ribbon of light.
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
          const f = i / 6, a = P(p.x - dx * (0.15 + f * 1.4), p.y - dy * (0.15 + f * 1.4), p.z);
          ctx.fillStyle = `rgba(${rgb},${0.35 * (1 - f)})`;
          ctx.beginPath(); ctx.arc(a.x, a.y, Math.max(1.5, sc * (0.13 - f * 0.1)), 0, Math.PI * 2); ctx.fill();
        }
        const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, sc * 0.5);
        g.addColorStop(0, `rgba(${rgb},0.55)`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(q.x - sc * 0.5, q.y - sc * 0.5, sc, sc);
        ctx.restore();
        const r = Math.max(4, sc * 0.17);
        if (glyph) {
          // A spinning violet glyph: ring, inner triangle, tick marks.
          const t = V.time * 9;
          ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, 0.75);
          ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = PAL.glyph; ctx.lineWidth = 2; ctx.stroke();
          ctx.strokeStyle = core; ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < 3; i++) { const a = t + (i / 3) * Math.PI * 2; i ? ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7) : ctx.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); }
          ctx.closePath();
          for (let i = 0; i < 6; i++) { const a = -t * 0.6 + (i / 6) * Math.PI * 2; ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35); }
          ctx.stroke();
          ctx.restore();
        } else {
          // A compressed orb of force with a pulsing shell.
          const pulse = 1 + 0.15 * Math.sin(V.time * 30);
          ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(q.x, q.y, r * 0.9 + 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = PAL.hero; ctx.beginPath(); ctx.arc(q.x, q.y, r * 0.9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(q.x - r * 0.15, q.y - r * 0.15, r * 0.45, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = core; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(q.x, q.y, r * 1.4 * pulse, r * 0.7 * pulse, Math.atan2(dy, dx), 0, Math.PI * 2); ctx.stroke();
        }
        return;
      }
      if (name === 'Pressure') {
        // Invisible force: nothing glows. The air folds into rings standing
        // across the flight, each a bright hairline over a dark one, like a
        // lens; the rings behind it spread and thin out.
        const ang = Math.atan2(P(p.x + dx, p.y + dy, p.z).y - q.y, P(p.x + dx, p.y + dy, p.z).x - q.x);
        for (let i = 0; i < 3; i++) {
          const back = i * 0.45, c = P(p.x - dx * back, p.y - dy * back, p.z);
          const rr = sc * (0.22 + back * 0.4), a = 0.8 * (1 - back / 1.4);
          if (a <= 0) continue;
          ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(ang);
          ctx.lineWidth = Math.max(1, sc * 0.03);
          ctx.strokeStyle = `rgba(12,10,16,${(a * 0.7).toFixed(3)})`;
          ctx.beginPath(); ctx.ellipse(1.5, 1.5, rr * 0.32, rr, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = `rgba(236,242,252,${a.toFixed(3)})`;
          ctx.beginPath(); ctx.ellipse(0, 0, rr * 0.32, rr, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
        // the squeezed core
        ctx.fillStyle = 'rgba(236,242,252,0.35)'; ctx.beginPath(); ctx.arc(q.x, q.y, sc * 0.08, 0, Math.PI * 2); ctx.fill();
        return;
      }
      if (name === 'Light' || name === 'Push of Light' || name === 'Water Bullet') {
        const rgb = name === 'Light' ? '255,232,170' : name === 'Push of Light' ? '168,240,192' : '150,210,255';
        const len = name === 'Light' ? 1.6 : name === 'Water Bullet' ? 0.9 : 0.7;
        const w = sc * (name === 'Light' ? 0.09 : name === 'Water Bullet' ? 0.13 : 0.12);
        const tail = P(p.x - dx * len, p.y - dy * len, p.z), head = P(p.x + dx * 0.1, p.y + dy * 0.1, p.z);
        ctx.save(); ctx.lineCap = 'round';
        if (name !== 'Water Bullet') ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(${rgb},0.25)`; ctx.lineWidth = w * 3.2;
        ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.stroke();
        ctx.restore();
        if (name === 'Water Bullet') {
          // a dense bead of water, inked, with spray peeling off behind
          ctx.lineCap = 'round';
          ctx.strokeStyle = INK; ctx.lineWidth = w * 2 + 4; ctx.beginPath(); ctx.moveTo((tail.x + q.x) / 2, (tail.y + q.y) / 2); ctx.lineTo(head.x, head.y); ctx.stroke();
          ctx.strokeStyle = '#3f86c0'; ctx.lineWidth = w * 2; ctx.stroke();
          ctx.strokeStyle = '#eef8ff'; ctx.lineWidth = w * 0.6; ctx.beginPath(); ctx.moveTo((tail.x + q.x * 3) / 4, (tail.y + q.y * 3) / 4 - w * 0.3); ctx.lineTo(head.x, head.y - w * 0.3); ctx.stroke();
          ctx.fillStyle = 'rgba(200,236,255,0.8)';
          for (let i = 0; i < 4; i++) { const b = P(p.x - dx * (0.4 + i * 0.25), p.y - dy * (0.4 + i * 0.25), p.z + Math.sin(V.time * 30 + i) * 0.12); ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(1, w * 0.3), 0, Math.PI * 2); ctx.fill(); }
        } else {
          ctx.strokeStyle = `rgba(${rgb},0.9)`; ctx.lineWidth = w; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.2, w * 0.4); ctx.stroke();
          star(head.x, head.y, sc * 0.18, '#ffffff', 1.8, 0.35);
        }
        return;
      }
      // A thrown stone.
      const tl = P(p.x - p.vx * 0.05, p.y - p.vy * 0.05, p.z);
      ctx.strokeStyle = 'rgba(230,220,200,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(2.5, sc * 0.08) + 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d6d0c2'; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(2.5, sc * 0.08), 0, Math.PI * 2); ctx.fill();
    }

    // ------------------------------------------------------------ healing
    function drawHeals(dt, sc) {
      for (const h of heals) {
        h.t += dt;
        const k = h.t / h.life;
        if (k >= 1) continue;
        const to = h.to, fr = h.from;
        const tx = to ? to.x : h.x, ty = to ? to.y : h.y;
        const b = P(tx, ty, 1.05);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        if (fr && fr !== to) {
          // the thread: out from the hands, arcing over, fading from the root
          const a = P(fr.x + Math.cos(fr.facing) * 0.45, fr.y + Math.sin(fr.facing) * 0.45, 1.25);
          const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - sc * (0.5 + 0.2 * h.seed);
          const head = Math.min(1, h.t / 0.22), tail = Math.max(0, (h.t - 0.35) / 0.5);
          const N = 18;
          const pt = (u) => ({ x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * cx + u * u * b.x, y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * cy + u * u * b.y });
          for (const [w, col] of [[sc * 0.16, 'rgba(120,230,160,0.22)'], [sc * 0.06, 'rgba(168,240,192,0.75)'], [Math.max(1.2, sc * 0.02), 'rgba(250,255,250,0.95)']]) {
            ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, w * (1 - tail * 0.7));
            ctx.beginPath();
            for (let i = 0; i <= N; i++) { const u = tail + (head - tail) * (i / N); const q = pt(u); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
            ctx.stroke();
          }
          // motes spiralling along the thread
          ctx.fillStyle = 'rgba(230,255,236,0.9)';
          for (let i = 0; i < 5; i++) {
            const u = tail + (head - tail) * ((i / 5 + h.t * 2.2) % 1), q = pt(u), w = Math.sin(u * 20 + i) * sc * 0.06;
            ctx.fillRect(q.x - 1.5, q.y + w - 1.5, 3, 3);
          }
        }
        // the bloom on the wound
        if (h.t > 0.15) {
          const kb = Math.min(1, (h.t - 0.15) / 0.25), fade = 1 - Math.max(0, (k - 0.5) / 0.5);
          const r = sc * (0.35 + 0.45 * kb);
          const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
          g.addColorStop(0, `rgba(240,255,244,${0.7 * fade})`); g.addColorStop(0.4, `rgba(168,240,192,${0.4 * fade})`); g.addColorStop(1, 'rgba(120,230,160,0)');
          ctx.fillStyle = g; ctx.fillRect(b.x - r, b.y - r, r * 2, r * 2);
          const gp = P(tx, ty, 0.02), rr = sc * (0.3 + 0.9 * kb);
          ctx.strokeStyle = `rgba(168,240,192,${0.7 * fade})`; ctx.lineWidth = Math.max(1, 3 * (1 - kb) + 1);
          ctx.beginPath(); ctx.ellipse(gp.x, gp.y, rr, rr * V.cam.pitch, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
          if (kb < 1) star(b.x, b.y - sc * 0.2, sc * 0.35 * (1 - kb) * fade, '#e8fff0', 2.2, 0.3);
        } else ctx.restore();
      }
      heals = heals.filter((h) => h.t < h.life);
    }

    // ------------------------------------------------------------ boss area attacks
    // Progress of a mark through its wind-up: the sim's own timer when it is
    // still counting, else ours.
    function hazardK(s, h) {
      const z = s.hazards && s.hazards.find((q) => Math.abs(q.x - h.x) < 0.05 && Math.abs(q.y - h.y) < 0.05);
      if (z) return Math.max(0, Math.min(1, 1 - z.t / (z.h.windup || h.windup)));
      return Math.min(1, h.t / h.windup);
    }
    function ringPath(c, r, pitch) { ctx.beginPath(); ctx.ellipse(c.x, c.y, r, r * pitch, 0, 0, Math.PI * 2); }
    // On the ground, under the fighters: the marked circle filling up, and
    // what an impact leaves behind (scorch, a wet stain).
    function drawHazardMarks(s) {
      const sc = V.cam.sc, pitch = V.cam.pitch, t = V.time;
      for (const d of hazHits) {
        const k = d.t / d.life, c = P(d.x, d.y, 0.02), r = d.r * sc;
        if (d.kind === 'fire') {
          ctx.fillStyle = `rgba(20,8,6,${0.55 * (1 - k)})`; ringPath(c, r * 0.95, pitch); ctx.fill();
          // glowing cracks cooling
          ctx.strokeStyle = `rgba(255,${Math.round(150 - 90 * k)},40,${0.9 * (1 - k)})`; ctx.lineWidth = Math.max(1, sc * 0.03);
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            let a = i * 0.785 + d.seed * 3, x = c.x, y = c.y; ctx.moveTo(x, y);
            for (let j = 0; j < 3; j++) { a += Math.sin(i * 3 + j * 5) * 0.5; x += Math.cos(a) * r * 0.28; y += Math.sin(a) * r * 0.28 * pitch; ctx.lineTo(x, y); }
          }
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(20,40,60,${0.4 * (1 - k)})`; ringPath(c, r * (1 + 0.2 * k), pitch); ctx.fill();
          ctx.strokeStyle = `rgba(230,246,255,${0.8 * (1 - k)})`; ctx.lineWidth = Math.max(1, sc * 0.04 * (1 - k));
          ringPath(c, r * (1 + 0.7 * k), pitch); ctx.stroke();
          ringPath(c, r * (0.6 + 0.9 * k), pitch); ctx.stroke();
        }
      }
      for (const h of hazards) {
        const k = hazardK(s, h), fire = h.kind === 'fire';
        const c = P(h.x, h.y, 0.02), r = h.r * sc;
        const rgb = fire ? '255,96,40' : '130,200,255', hot = fire ? '255,210,120' : '235,248,255';
        ctx.fillStyle = `rgba(${rgb},${0.12 + 0.1 * k})`; ringPath(c, r, pitch); ctx.fill();
        // the fill grows from the centre to the rim as the blow nears
        ctx.fillStyle = `rgba(${rgb},${0.18 + 0.3 * k})`; ringPath(c, r * (0.12 + 0.88 * k), pitch); ctx.fill();
        ctx.save(); ringPath(c, r, pitch); ctx.clip();
        ctx.strokeStyle = `rgba(${rgb},${0.3 + 0.3 * k})`; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = -10; i <= 10; i++) { const o = i * sc * 0.25; ctx.moveTo(c.x + o - r, c.y - r); ctx.lineTo(c.x + o + r, c.y + r); }
        ctx.stroke(); ctx.restore();
        // inked rim, brighter and heavier at the end; a turning dashed ring inside
        ringPath(c, r, pitch);
        ctx.strokeStyle = INK; ctx.lineWidth = 3 + 4 * k; ctx.stroke();
        ctx.strokeStyle = `rgba(${hot},${0.55 + 0.45 * k})`; ctx.lineWidth = 1.5 + 2.5 * k; ctx.stroke();
        ctx.setLineDash([sc * 0.18, sc * 0.14]); ctx.lineDashOffset = -t * sc * (fire ? 0.8 : -0.6);
        ctx.strokeStyle = `rgba(${hot},${0.5 + 0.3 * k})`; ctx.lineWidth = 1.5;
        ringPath(c, r * 0.72, pitch); ctx.stroke();
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
        if (k > 0.75 && Math.sin(t * 40) > 0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ringPath(c, r, pitch); ctx.stroke(); }
      }
    }
    // Above the fighters: the skyfire gathering overhead or the slab of ocean
    // lifting, then the impact.
    function drawHazardsAbove(s, dt, sc) {
      for (const h of hazards) h.t += dt;
      hazards = hazards.filter((h) => h.t < h.windup + 0.4 || (s.hazards && s.hazards.some((q) => Math.abs(q.x - h.x) < 0.05 && Math.abs(q.y - h.y) < 0.05)));
      const t = V.time;
      for (const h of hazards) {
        const k = hazardK(s, h), r = h.r * sc;
        if (h.kind === 'fire') {
          // Skyfire: a churning knot of flame high over the mark, growing,
          // then tongues of fire reaching down.
          const c = P(h.x, h.y, 5.2 - 0.6 * k), R0 = r * (0.25 + 0.55 * k);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R0 * 1.6);
          g.addColorStop(0, `rgba(255,236,170,${0.75 * k + 0.15})`); g.addColorStop(0.35, `rgba(255,120,40,${0.55 * k + 0.1})`); g.addColorStop(1, 'rgba(160,20,20,0)');
          ctx.fillStyle = g; ctx.fillRect(c.x - R0 * 1.6, c.y - R0 * 1.6, R0 * 3.2, R0 * 3.2);
          ctx.restore();
          ctx.lineCap = 'round';
          for (let i = 0; i < 6; i++) {
            const a0 = t * (2.5 + i * 0.3) + i * 1.05, rr = R0 * (0.5 + (i % 3) * 0.2);
            ctx.strokeStyle = i % 2 ? `rgba(255,190,90,${0.5 + 0.4 * k})` : `rgba(227,38,58,${0.5 + 0.4 * k})`; ctx.lineWidth = Math.max(1.5, sc * 0.05);
            ctx.beginPath(); ctx.ellipse(c.x, c.y, rr, rr * 0.55, 0, a0, a0 + 1.6); ctx.stroke();
          }
          if (k > 0.55) {
            const kk = (k - 0.55) / 0.45, g0 = P(h.x, h.y, 0);
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 7; i++) {
              const ox = (((i * 37 + Math.floor(t * 12) * 13) % 100) / 100 - 0.5) * r * 1.4;
              const y1 = c.y + (g0.y - c.y) * Math.min(1, kk * (0.6 + (i % 3) * 0.2));
              ctx.strokeStyle = `rgba(255,${150 + (i % 3) * 30},70,${0.35 + 0.4 * kk})`; ctx.lineWidth = Math.max(1.5, sc * (0.03 + (i % 2) * 0.03));
              ctx.beginPath(); ctx.moveTo(c.x + ox * 0.3, c.y); ctx.lineTo(c.x + ox, y1); ctx.stroke();
            }
            ctx.restore();
          }
        } else {
          // Moving ocean: a slab of dark water heaving up over the mark,
          // foam on its lip, water pouring off its underside.
          const c = P(h.x, h.y, 2.4 + 1.6 * k), g0 = P(h.x, h.y, 0);
          const hw = r * (0.9 + 0.15 * k), th = sc * (0.5 + 1.1 * k);
          const top = c.y - th / 2, bot = c.y + th / 2;
          const wave = (y, amp, ph) => { const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push([c.x - hw + u * hw * 2, y + Math.sin(u * 9 + t * 4 + ph) * amp * (0.6 + 0.4 * Math.sin(u * Math.PI))]); } return pts; };
          const tp = wave(top, sc * 0.12, 0), bp = wave(bot, sc * 0.08, 2);
          const slab = () => { ctx.beginPath(); tp.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); for (let i = bp.length - 1; i >= 0; i--) ctx.lineTo(bp[i][0], bp[i][1]); ctx.closePath(); };
          ctx.globalAlpha = Math.min(1, 0.35 + k);
          ctx.lineJoin = 'round';
          slab(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
          const lg = ctx.createLinearGradient(0, top, 0, bot);
          lg.addColorStop(0, '#4c8fc0'); lg.addColorStop(0.5, '#1f4f78'); lg.addColorStop(1, '#0e2a44');
          ctx.fillStyle = lg; slab(); ctx.fill();
          // light bands running through the water
          ctx.save(); slab(); ctx.clip();
          ctx.strokeStyle = 'rgba(190,230,255,0.35)'; ctx.lineWidth = Math.max(1, sc * 0.03);
          for (let j = 1; j < 4; j++) { const w = wave(top + th * j / 4, sc * 0.06, j * 1.3); ctx.beginPath(); w.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); }
          ctx.restore();
          // foam lip
          ctx.strokeStyle = '#eef8ff'; ctx.lineWidth = Math.max(2, sc * 0.07); ctx.lineCap = 'round';
          ctx.beginPath(); tp.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
          // streams falling from the underside onto the mark
          ctx.strokeStyle = 'rgba(190,230,255,0.55)'; ctx.lineWidth = Math.max(1, sc * 0.025);
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const x = c.x - hw * 0.8 + (i / 5) * hw * 1.6, ph = (t * 1.8 + i * 0.37) % 1;
            const y0 = bot + ph * (g0.y - bot) * 0.6;
            ctx.moveTo(x, y0); ctx.lineTo(x, y0 + sc * 0.3);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      // Impacts.
      for (const d of hazHits) {
        d.t += dt;
        const k = d.t / d.life, c = P(d.x, d.y, 0), r = d.r * sc;
        if (d.kind === 'fire') {
          const kk = Math.min(1, d.t / 0.5);
          if (kk < 1) {
            // the fall: a column of fire, then the burst
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const R1 = r * (0.6 + 0.9 * kk);
            const g = ctx.createRadialGradient(c.x, c.y - r * 0.3, 0, c.x, c.y - r * 0.3, R1);
            g.addColorStop(0, `rgba(255,244,200,${1 - kk})`); g.addColorStop(0.4, `rgba(255,130,40,${0.8 * (1 - kk)})`); g.addColorStop(1, 'rgba(180,20,20,0)');
            ctx.fillStyle = g; ctx.fillRect(c.x - R1, c.y - r * 0.3 - R1, R1 * 2, R1 * 2);
            if (d.t < 0.15) { const top = P(d.x, d.y, 6); ctx.fillStyle = `rgba(255,200,120,${1 - d.t / 0.15})`; ctx.fillRect(c.x - r * 0.25, top.y, r * 0.5, c.y - top.y); }
            ctx.restore();
          }
          // flame tongues licking up off the scorch, dying down
          if (k < 0.7) {
            const a = 1 - k / 0.7;
            for (let i = 0; i < 7; i++) {
              const ox = (i / 6 - 0.5) * r * 1.4, hgt = sc * (0.5 + ((i * 7) % 5) * 0.18) * a * (0.8 + 0.2 * Math.sin(V.time * 14 + i));
              const b = { x: c.x + ox, y: c.y + Math.sin(i * 1.7) * r * 0.25 * V.cam.pitch };
              const w = sc * 0.14;
              ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(b.x - w - 2, b.y); ctx.quadraticCurveTo(b.x - w * 0.3, b.y - hgt * 0.6, b.x + Math.sin(V.time * 9 + i) * w * 0.5, b.y - hgt - 3); ctx.quadraticCurveTo(b.x + w * 0.5, b.y - hgt * 0.5, b.x + w + 2, b.y); ctx.closePath(); ctx.fill();
              ctx.fillStyle = i % 2 ? '#ff8a2a' : '#e3263a'; ctx.beginPath(); ctx.moveTo(b.x - w, b.y); ctx.quadraticCurveTo(b.x - w * 0.3, b.y - hgt * 0.6, b.x + Math.sin(V.time * 9 + i) * w * 0.5, b.y - hgt); ctx.quadraticCurveTo(b.x + w * 0.5, b.y - hgt * 0.5, b.x + w, b.y); ctx.closePath(); ctx.fill();
              ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.moveTo(b.x - w * 0.4, b.y); ctx.quadraticCurveTo(b.x, b.y - hgt * 0.5, b.x + w * 0.4, b.y); ctx.closePath(); ctx.fill();
            }
          }
        } else if (d.t < 0.45) {
          // the slab comes down: a curtain of water slamming into the mark,
          // a crown of spray thrown up round the rim
          const kk = d.t / 0.45;
          if (kk < 0.35) {
            const f = 1 - kk / 0.35, top = P(d.x, d.y, 3 * f + 0.3);
            ctx.fillStyle = INK; ctx.fillRect(c.x - r - 2, top.y - 2, r * 2 + 4, c.y - top.y + 4);
            ctx.fillStyle = '#2a6696'; ctx.fillRect(c.x - r, top.y, r * 2, c.y - top.y);
            ctx.fillStyle = '#eef8ff'; ctx.fillRect(c.x - r, top.y, r * 2, Math.max(2, sc * 0.08));
          }
          ctx.fillStyle = `rgba(238,248,255,${1 - kk})`; ctx.strokeStyle = INK; ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2 + d.seed, rr = r * (0.9 + 0.4 * kk), hgt = sc * (0.6 + (i % 3) * 0.35) * Math.sin(Math.min(1, kk * 1.6) * Math.PI);
            const bx = c.x + Math.cos(a) * rr, by = c.y + Math.sin(a) * rr * V.cam.pitch, w = sc * 0.1;
            ctx.moveTo(bx - w, by); ctx.lineTo(bx + Math.cos(a) * w, by - hgt); ctx.lineTo(bx + w, by); ctx.closePath();
          }
          ctx.stroke(); ctx.fill();
        }
      }
      hazHits = hazHits.filter((d) => d.t < d.life);
    }

    // ------------------------------------------------------------ blink
    function drawBlinks(dt, sc) {
      for (const b of blinks) {
        b.t += dt;
        const k = b.t / b.life;
        if (k >= 1) continue;
        const ang = Math.atan2(b.y1 - b.y0, b.x1 - b.x0), ca = Math.cos(ang), sa = Math.sin(ang);
        const edge = b.hero ? '156,195,221' : '227,38,58', body = b.hero ? '18,22,30' : '26,10,22';
        // Afterimage at the origin: the silhouette tears into horizontal
        // slices that slide toward the destination and thin out.
        const n = 7;
        for (let i = 0; i < n; i++) {
          const z0 = (i / n) * b.h, z1 = ((i + 1) / n) * b.h;
          const shift = k * k * (1.2 + ((i * 37) % 7) * 0.25);
          const thin = Math.max(0, 1 - k * (1.4 + (i % 3) * 0.4));
          if (thin <= 0) continue;
          const w = b.w * (0.75 + Math.sin(((i + 0.5) / n) * Math.PI) * 0.45) * thin;
          const cx = b.x0 + ca * shift, cy = b.y0 + sa * shift;
          const a0 = P(cx, cy, z0), c0 = P(cx, cy, z1), hw = w * sc;
          ctx.fillStyle = `rgba(${body},${0.9 * thin})`;
          ctx.fillRect(a0.x - hw, c0.y, hw * 2, a0.y - c0.y + 1);
          ctx.fillStyle = `rgba(${edge},${0.8 * thin})`;
          ctx.fillRect(a0.x + hw, c0.y, Math.max(1.5, sc * 0.03), a0.y - c0.y + 1);
        }
        // The streak: a wedge of light from origin to landing, gone in a blink.
        if (k < 0.4) {
          const f = 1 - k / 0.4, zm = b.h * 0.55;
          const p0 = P(b.x0, b.y0, zm), p1 = P(b.x1, b.y1, zm);
          const l = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1, nx = -(p1.y - p0.y) / l, ny = (p1.x - p0.x) / l;
          const w1 = sc * 0.24 * f, w0 = sc * 0.03;
          const wedge = (g) => { ctx.beginPath(); ctx.moveTo(p0.x + nx * (w0 + g), p0.y + ny * (w0 + g)); ctx.lineTo(p1.x + nx * (w1 + g), p1.y + ny * (w1 + g)); ctx.lineTo(p1.x - nx * (w1 + g), p1.y - ny * (w1 + g)); ctx.lineTo(p0.x - nx * (w0 + g), p0.y - ny * (w0 + g)); ctx.closePath(); };
          wedge(2.5); ctx.fillStyle = `rgba(12,8,8,${0.85 * f})`; ctx.fill();
          wedge(0); ctx.fillStyle = `rgba(${edge},${0.9 * f})`; ctx.fill();
          wedge(-w1 * 0.55); ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fill();
          // parallel speed lines above and below
          ctx.strokeStyle = `rgba(246,240,236,${0.6 * f})`; ctx.lineWidth = Math.max(1, sc * 0.02);
          ctx.beginPath();
          for (const [o, zz] of [[-0.25, 0.25], [0.3, 0.85], [0.1, 1.25]]) {
            const q0 = P(b.x0 + ca * 0.6 - sa * o, b.y0 + sa * 0.6 + ca * o, b.h * zz), q1 = P(b.x1 - ca * 0.4 - sa * o, b.y1 - sa * 0.4 + ca * o, b.h * zz);
            ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y);
          }
          ctx.stroke();
        }
        // Landing: a vertical slit of light that snaps shut.
        if (k < 0.3) {
          const f = 1 - k / 0.3, a = P(b.x1, b.y1, 0), c = P(b.x1, b.y1, b.h * 1.25);
          ctx.fillStyle = `rgba(255,255,255,${f})`;
          const w = sc * 0.1 * f;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + w, (a.y + c.y) / 2); ctx.lineTo(c.x, c.y); ctx.lineTo(a.x - w, (a.y + c.y) / 2); ctx.closePath(); ctx.fill();
        }
      }
      blinks = blinks.filter((b) => b.t < b.life);
    }

    // ------------------------------------------------------------ dissolve
    function drawDissolves(dt, sc) {
      for (const d of dissolves) {
        d.t += dt;
        const k = d.t / d.life;
        if (k >= 1) continue;
        // The body that is no longer there: a black-violet column whose
        // slices drift apart and burn away from the top down.
        const n = d.big ? 12 : 9;
        for (let i = 0; i < n; i++) {
          const f = (i + 0.5) / n;
          const local = Math.min(1, Math.max(0, k * 1.6 - (1 - f) * 0.6));
          if (local >= 1) continue;
          const z0 = (i / n) * d.h, z1 = ((i + 1) / n) * d.h * 0.98;
          const w = d.w * (0.7 + Math.sin(f * Math.PI) * 0.5) * (1 - local);
          const drift = local * local * (i % 2 ? 1 : -1) * 0.6, rise = local * 0.5;
          const a = P(d.x + drift, d.y, z0 + rise), c = P(d.x + drift, d.y, z1 + rise);
          const hw = w * sc;
          ctx.fillStyle = `rgba(22,10,30,${0.95 * (1 - local)})`;
          ctx.fillRect(a.x - hw, c.y, hw * 2, a.y - c.y + 1);
          // a glowing burn edge on each slice
          ctx.fillStyle = `rgba(${GLYPH},${0.85 * (1 - local)})`;
          ctx.fillRect(a.x - hw, c.y, hw * 2, Math.max(1, sc * 0.025));
          ctx.fillStyle = `rgba(255,236,226,${0.7 * (1 - local)})`;
          ctx.fillRect(a.x - hw - sc * 0.02, c.y, Math.max(1, sc * 0.03), a.y - c.y);
        }
        // A seam of light splitting it at the start.
        if (k < 0.25) {
          const f = 1 - k / 0.25, a = P(d.x, d.y, 0), c = P(d.x, d.y, d.h * 1.3);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(${GLYPH},${0.6 * f})`; ctx.fillRect(a.x - sc * 0.18 * f, c.y, sc * 0.36 * f, a.y - c.y);
          ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(a.x - sc * 0.03, c.y, sc * 0.06, a.y - c.y);
          ctx.restore();
        }
        // A broken glyph ring on the ground, fading.
        const g = P(d.x, d.y, 0.02), r = sc * (d.big ? 1.6 : 0.9) * (0.8 + k * 0.4);
        ctx.strokeStyle = `rgba(${GLYPH},${0.7 * (1 - k)})`; ctx.lineWidth = Math.max(1.5, sc * 0.03);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a0 = (i / 6) * Math.PI * 2 + k * 1.5; ctx.moveTo(g.x + Math.cos(a0) * r, g.y + Math.sin(a0) * r * V.cam.pitch); ctx.ellipse(g.x, g.y, r, r * V.cam.pitch, 0, a0, a0 + 0.7); }
        ctx.stroke();
      }
      dissolves = dissolves.filter((d) => d.t < d.life);
    }

    // Screen angle of a world direction a at (x, y).
    function screenAng(x, y, a) {
      const p0 = P(x, y, 0), p1 = P(x + Math.cos(a), y + Math.sin(a), 0);
      return Math.atan2(p1.y - p0.y, p1.x - p0.x);
    }
    // Where a fighter's eyes are on screen (roughly: the head's front).
    function eyeOf(u) {
      const L = NS.fighters.LOOK[u.key], h = 1.72 * (L ? L.h : 1);
      return P(u.x + Math.cos(u.facing) * 0.07, u.y + Math.sin(u.facing) * 0.07, h * 0.9);
    }
    // Darken the screen except a soft hole around p.
    function darkAround(p, r, a) {
      const W = V.W, H = V.H;
      const g = ctx.createRadialGradient(p.x, p.y, r * 0.35, p.x, p.y, r * 2.2);
      g.addColorStop(0, 'rgba(6,4,6,0)'); g.addColorStop(0.45, `rgba(6,4,6,${a * 0.75})`); g.addColorStop(1, `rgba(6,4,6,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
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

    // Heavy art: a full cinematic, no close-ups of faces.
    //   charge  0 .. 1.1   aura pillar, ground cracks, rising debris, energy streams
    //   gleam   1.1 .. 1.35 the screen goes dark, one line of light across it
    //   dash    1.35 .. impact  afterimage streak, speed lines, slashes across the enemies
    //   impact  white frame, black frame
    //   after   crescent, shockwaves, dust, the move's name
    const CUT = { charge: 1.1, gleam: 1.35 };
    function cutPhase(c) {
      if (c.t < CUT.charge) return 'charge';
      if (c.t < CUT.gleam) return 'gleam';
      if (c.t < c.impactAt) return 'dash';
      return c.t < c.impactAt + 0.12 ? 'impact' : 'after';
    }
    // ------------------------------------------------------------ lance
    // Line heavy arts (Lattice Lance, Force Lance): a narrow lance of force.
    //   charge  the glyph lattice builds in front of the caster, a circle on the ground
    //   gleam   darkness; the lattice burns, one line of light along the aim
    //   dash    the beam fires along the facing, flashes as it passes through targets
    //   impact  white frame, then the beam as a white line on black
    //   after   the beam thins out, lattice shards drift, shockwaves on the hit
    function lanceOf(s, c) {
      const u = c.unit, H = V.Sim.heavyOf(u), f = u.facing;
      const F = [Math.cos(f), Math.sin(f)];
      let st = lanceState.get(c);
      if (!st) {
        // Who the lance passes through (the sim's test), nearest first.
        const hits = [];
        for (const o of s.units) {
          if (o.team === u.team || o.fled || o.beaten || o.state === 'out') continue;
          const d = Math.hypot(o.x - c.x0, o.y - c.y0);
          let da = Math.atan2(o.y - c.y0, o.x - c.x0) - f;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          if (d <= H.radius && Math.abs(da) <= H.arc / 2) hits.push({ x: o.x, y: o.y, d, r: o.r });
        }
        hits.sort((a, b) => a.d - b.d);
        st = { hits, done: 0 };
        lanceState.set(c, st);
      }
      // The beam runs past the last target to the end of the reach.
      return { u, F, len: H.radius + 1.5, mz: 1.3, mx: c.x0 + F[0] * 0.7, my: c.y0 + F[1] * 0.7, st };
    }
    // A glyph ring standing across the aim: in the plane perpendicular to F.
    function aimRing(x, y, z, F, r, rot, n) {
      const pts = [], rx = -F[1], ry = F[0];
      n = n || 28;
      for (let i = 0; i <= n; i++) {
        const a = rot + (i / n) * Math.PI * 2, c = Math.cos(a) * r;
        pts.push(P(x + rx * c, y + ry * c, z + Math.sin(a) * r));
      }
      return pts;
    }
    function glowStroke(paths, w, a) {
      // ink under, violet glow, pale core
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = `rgba(12,8,8,${0.8 * a})`; ctx.lineWidth = w * 2.2;
      for (const p of paths) ctx.stroke(p);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${GLYPH},${0.35 * a})`; ctx.lineWidth = w * 4;
      for (const p of paths) ctx.stroke(p);
      ctx.strokeStyle = `rgba(${GLYPH},${0.95 * a})`; ctx.lineWidth = w * 1.4;
      for (const p of paths) ctx.stroke(p);
      ctx.strokeStyle = `rgba(239,232,255,${a})`; ctx.lineWidth = Math.max(1, w * 0.5);
      for (const p of paths) ctx.stroke(p);
      ctx.restore();
    }
    const toPath = (pts, close) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y))); if (close) p.closePath(); return p; };
    // The lattice: tapering rings along the aim, joined by struts, a
    // triangle turning in the first ring. grow: 0..1 (rings appear in turn).
    function lattice(L, t, grow, a) {
      const { F, mx, my, mz } = L, sc = V.cam.sc;
      const rings = [[0.0, 0.62], [0.42, 0.5], [0.8, 0.4], [1.12, 0.3]];
      const paths = [], pts = [];
      rings.forEach(([d, r], i) => {
        const g = Math.min(1, Math.max(0, grow * 4 - i));
        if (g <= 0) return;
        const rot = (i % 2 ? -1 : 1) * t * (1.1 + i * 0.3);
        const ring = aimRing(mx + F[0] * d, my + F[1] * d, mz, F, r * (0.4 + 0.6 * g), rot, 30);
        paths.push(toPath(ring));
        pts.push({ ring, rot, d, r, g });
        // tick glyphs on the ring
        const tp = new Path2D();
        for (let k = 0; k < 6; k++) {
          const q = ring[Math.round((k / 6) * 30)], q2 = aimRing(mx + F[0] * d, my + F[1] * d, mz, F, r * (0.4 + 0.6 * g) * 1.22, rot + (k / 6) * Math.PI * 2, 1)[0];
          tp.moveTo(q.x, q.y); tp.lineTo(q2.x, q2.y);
        }
        paths.push(tp);
      });
      // struts between consecutive rings (a hex lattice)
      const sp = new Path2D();
      for (let i = 0; i + 1 < pts.length; i++) {
        const A = pts[i], B = pts[i + 1];
        for (let k = 0; k < 3; k++) {
          const ia = Math.round(((k / 3) * 30 + 2.5) % 30), ib = Math.round(((k / 3) * 30 + 5 * (i % 2 ? -1 : 1) + 30) % 30);
          sp.moveTo(A.ring[ia].x, A.ring[ia].y); sp.lineTo(B.ring[ib].x, B.ring[ib].y);
        }
      }
      paths.push(sp);
      if (pts.length) {
        const A = pts[0], tri = [];
        for (let k = 0; k < 3; k++) tri.push(aimRing(mx, my, mz, F, A.r * 0.75 * A.g, -t * 3 + (k / 3) * Math.PI * 2, 1)[0]);
        paths.push(toPath(tri, true));
      }
      glowStroke(paths, Math.max(1.2, sc * 0.022), a);
      // the charge gathering at the muzzle
      const tip = P(mx + F[0] * 1.3, my + F[1] * 1.3, mz), rr = sc * (0.08 + 0.22 * grow) * (1 + 0.15 * Math.sin(t * 40));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, rr * 3);
      g.addColorStop(0, `rgba(239,232,255,${a})`); g.addColorStop(0.3, `rgba(${GLYPH},${0.6 * a})`); g.addColorStop(1, `rgba(${GLYPH},0)`);
      ctx.fillStyle = g; ctx.fillRect(tip.x - rr * 3, tip.y - rr * 3, rr * 6, rr * 6);
      ctx.restore();
      return tip;
    }
    function groundCircle(L, t, k) {
      const u = L.u, sc = V.cam.sc;
      const paths = [];
      for (const [r, dir] of [[1.15, 1], [1.45, -1]]) {
        const pts = [];
        for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2 * Math.min(1, k * 1.6) + dir * t * 0.8; pts.push(P(u.x + Math.cos(a) * r, u.y + Math.sin(a) * r, 0.02)); }
        paths.push(toPath(pts));
      }
      const tk = new Path2D();
      for (let i = 0; i < 16 * Math.min(1, k * 1.6); i++) {
        const a = (i / 16) * Math.PI * 2 + t * 0.8, q0 = P(u.x + Math.cos(a) * 1.18, u.y + Math.sin(a) * 1.18, 0.02), q1 = P(u.x + Math.cos(a + 0.12) * 1.42, u.y + Math.sin(a + 0.12) * 1.42, 0.02);
        tk.moveTo(q0.x, q0.y); tk.lineTo(q1.x, q1.y);
      }
      paths.push(tk);
      glowStroke(paths, Math.max(1, sc * 0.018), Math.min(1, k * 2));
    }
    // The beam from the muzzle to `reach` metres along the aim.
    function beam(L, reach, w, a, white) {
      const { F, mx, my, mz } = L, sc = V.cam.sc;
      const p0 = P(mx + F[0] * 0.95, my + F[1] * 0.95, mz), p1 = P(mx + F[0] * reach, my + F[1] * reach, mz);
      const dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      const band = (hw, col) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(p0.x + nx * hw * 0.6, p0.y + ny * hw * 0.6); ctx.lineTo(p1.x + nx * hw, p1.y + ny * hw);
        ctx.arc(p1.x, p1.y, hw, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
        ctx.lineTo(p0.x - nx * hw * 0.6, p0.y - ny * hw * 0.6); ctx.closePath(); ctx.fill();
      };
      const W = sc * w;
      if (white) { band(W * 1.2, '#f6f0ec'); return { p0, p1 }; }
      band(W + 3, `rgba(12,8,8,${a})`);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      band(W * 2.6, `rgba(${GLYPH},${0.25 * a})`);
      ctx.restore();
      band(W, `rgba(${GLYPH},${a})`);
      band(W * 0.45, `rgba(255,255,255,${a})`);
      return { p0, p1 };
    }
    function drawLance(s, c, phase) {
      const W = V.W, H = V.H, t = c.t, cam = V.cam, sc = cam.sc;
      const L = lanceOf(s, c), u = L.u;
      const chest = P(u.x, u.y, 1.2);
      if (phase === 'charge') {
        const k = t / CUT.charge;
        const vg = ctx.createRadialGradient(chest.x, chest.y, Math.min(W, H) * 0.12, chest.x, chest.y, Math.max(W, H) * 0.7);
        vg.addColorStop(0, 'rgba(6,4,8,0)'); vg.addColorStop(1, `rgba(6,4,8,${0.4 + 0.45 * k})`);
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        groundCircle(L, t, k);
        const tip = lattice(L, t, Math.min(1, k * 1.25), 1);
        // Motes of force streaming into the muzzle.
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) {
          const ph = (t * 1.4 + i * 0.137) % 1, a0 = i * 2.39;
          const r0 = Math.max(W, H) * 0.5 * (1 - ph);
          const sx = tip.x + Math.cos(a0) * r0, sy = tip.y + Math.sin(a0) * r0 * 0.7;
          ctx.strokeStyle = `rgba(${GLYPH},${0.5 * ph})`; ctx.lineWidth = 1 + 2 * ph;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (tip.x - sx) * 0.25, sy + (tip.y - sy) * 0.25); ctx.stroke();
        }
        ctx.restore();
        speedLines(chest.x, chest.y, 60, Math.min(W, H) * (0.6 - 0.3 * k), Math.max(W, H), `rgba(220,210,255,${0.05 + 0.1 * k})`, Math.floor(t * 24));
        V.cam.shake = Math.max(V.cam.shake, 1 + 3 * k);
      } else if (phase === 'gleam') {
        const k = (t - CUT.charge) / (CUT.gleam - CUT.charge);
        const eye = eyeOf(u);
        darkAround(eye, Math.min(W, H) * 0.3, Math.min(0.88, 0.55 + k));
        star(eye.x, eye.y, H * 0.07 * Math.min(1, k * 3), lanceHex, 3, 0.2);
        const tip = lattice(L, t, 1, 1);
        // One line of light along the aim, across the whole screen.
        const far = P(L.mx + L.F[0] * 30, L.my + L.F[1] * 30, L.mz);
        const dx = far.x - tip.x, dy = far.y - tip.y, l = Math.hypot(dx, dy) || 1;
        const reach = Math.hypot(W, H) * Math.min(1, k * 2.4);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(${GLYPH},0.9)`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(tip.x - (dx / l) * reach * 0.3, tip.y - (dy / l) * reach * 0.3); ctx.lineTo(tip.x + (dx / l) * reach, tip.y + (dy / l) * reach); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
        star(tip.x, tip.y, H * 0.13 * Math.min(1, k * 3), lanceHex, 3, 0.2);
      } else if (phase === 'dash') {
        const k = (t - CUT.gleam) / (c.impactAt - CUT.gleam);
        const reach = 1.2 + (L.len - 1.2) * Math.min(1, k * 3.2);
        // Speed lines along the beam.
        const a0 = P(L.mx, L.my, L.mz), a1 = P(L.mx + L.F[0] * 3, L.my + L.F[1] * 3, L.mz);
        const ang = Math.atan2(a1.y - a0.y, a1.x - a0.x);
        ctx.fillStyle = `rgba(${GLYPH},0.09)`; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(a0.x, a0.y); ctx.rotate(ang);
        ctx.fillStyle = 'rgba(239,232,255,0.22)';
        for (let i = 0; i < 30; i++) {
          const y = (((i * 97) % 100) / 100 - 0.5) * Math.max(W, H) * 1.2, x = (((i * 61 + t * 1400) % 100) / 100 - 0.2) * W * 1.6;
          ctx.fillRect(x, y, W * (0.12 + (i % 4) * 0.06), 1 + (i % 3));
        }
        ctx.restore();
        // Scorch along the ground under the beam.
        const g0 = P(L.mx + L.F[0] * 1.2, L.my + L.F[1] * 1.2, 0.02), g1 = P(L.mx + L.F[0] * reach, L.my + L.F[1] * reach, 0.02);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(12,8,8,0.35)'; ctx.lineWidth = sc * 0.12; ctx.beginPath(); ctx.moveTo(g0.x, g0.y); ctx.lineTo(g1.x, g1.y); ctx.stroke();
        ctx.setLineDash([sc * 0.25, sc * 0.18]);
        ctx.strokeStyle = `rgba(${GLYPH},0.35)`; ctx.lineWidth = sc * 0.025; ctx.stroke();
        ctx.setLineDash([]);
        lattice(L, t, 1, Math.max(0.45, 1 - k * 1.5));
        const bm = beam(L, reach, 0.13 * (1 + 0.12 * Math.sin(t * 60)), 1);
        // Rings of force sliding down the beam.
        const rp = [];
        for (let i = 0; i < 4; i++) {
          const d = 1.4 + (((k * 2.4 + i * 0.25) % 1) * (reach - 1.4));
          rp.push(toPath(aimRing(L.mx + L.F[0] * d, L.my + L.F[1] * d, L.mz, L.F, 0.32 + 0.1 * Math.sin(i + t * 9), t * 5 + i, 20)));
        }
        glowStroke(rp, Math.max(1, sc * 0.016), 0.9);
        // Flashes where it passes through a target.
        const st = L.st;
        while (st.done < st.hits.length && st.hits[st.done].d <= reach + 0.2) {
          const h = st.hits[st.done++];
          parts.push({ star: true, x: h.x, y: h.y, z: L.mz, t: 0, life: 0.35, r: 1.5, col: '#ffffff', rays: true });
          parts.push({ ring: true, x: h.x, y: h.y, z: L.mz, t: 0, life: 0.4, col: lanceHex });
          shards(h.x, h.y, L.mz, 14, lanceHex, 8);
          impact = Math.max(impact, 0.05);
          V.cam.shake = Math.max(V.cam.shake, 14);
        }
        // the beam head
        star(bm.p1.x, bm.p1.y, sc * 0.5 * (1 + 0.2 * Math.sin(t * 50)), '#efe8ff', 2.2, 0.3);
        V.cam.shake = Math.max(V.cam.shake, 5);
      } else if (phase === 'impact') {
        const ft = t - c.impactAt;
        if (ft < 0.06) { ctx.fillStyle = '#f6f0ec'; ctx.fillRect(0, 0, W, H); }
        else {
          ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
          const m = P(L.mx, L.my, L.mz);
          speedLines(m.x, m.y, 70, Math.min(W, H) * 0.08, Math.max(W, H), '#f6f0ec', 3);
          beam(L, L.len, 0.16, 1, true);
        }
        V.cam.shake = 16;
      } else {
        const k = (t - c.impactAt - 0.12) / 0.9;
        if (k < 1) {
          const e = 1 - k;
          beam(L, L.len, 0.13 * e * e, e);
          // Lattice shards drifting apart.
          const sp = [];
          for (let i = 0; i < 10; i++) {
            const d = 0.2 + (i % 5) * 0.3, a = i * 1.7 + k * 2, r = 0.4 + k * 1.2 * (0.5 + (i % 3) * 0.3);
            const rx = -L.F[1], ry = L.F[0];
            const x = L.mx + L.F[0] * d + rx * Math.cos(a) * r, y = L.my + L.F[1] * d + ry * Math.cos(a) * r, z = L.mz + Math.sin(a) * r;
            const q0 = P(x, y, z), q1 = P(x + rx * 0.15, y + ry * 0.15, z + 0.1);
            const p = new Path2D(); p.moveTo(q0.x, q0.y); p.lineTo(q1.x, q1.y); sp.push(p);
          }
          glowStroke(sp, Math.max(1, sc * 0.02), e);
          // Shockwaves where it hit.
          for (const h of L.st.hits) {
            const b = P(h.x, h.y, 0.02);
            for (const [delay, col] of [[0, lanceHex], [0.15, PAL.bone]]) {
              const kk = Math.max(0, k - delay), rr = (0.4 + kk * 3.5) * sc;
              ctx.globalAlpha = Math.max(0, 1 - kk);
              ctx.strokeStyle = col; ctx.lineWidth = 7 * (1 - kk) + 1;
              ctx.beginPath(); ctx.ellipse(b.x, b.y, rr, rr * cam.pitch, 0, 0, Math.PI * 2); ctx.stroke();
            }
          }
          ctx.globalAlpha = 1;
        }
        if (!c.dusted) {
          c.dusted = true;
          for (const h of L.st.hits) { dust(h.x, h.y, 10); shards(h.x, h.y, 1, 10, lanceHex, 6); }
        }
      }
    }

    function drawCutscene(s) {
      const c = s.cutscene;
      if (!c) return;
      const W = V.W, H = V.H, t = c.t, u = c.unit, cam = V.cam, sc = cam.sc;
      const hero = u.team === 'hero';
      // Line heavies are force glyph-work: they read violet.
      const lineCol = u.key === 'aerys' ? '#ffe7a8' : PAL.glyph;
      const glow = c.line ? lineCol : hero ? PAL.heroGlow : PAL.glow, edge = c.line ? lineCol : hero ? PAL.hero : PAL.glow;
      const glowRGB = hero ? '217,240,255' : '227,38,58';
      const phase = cutPhase(c);
      const F = [Math.cos(u.facing), Math.sin(u.facing)];
      const bars = Math.min(1, t / 0.2) * Math.min(1, (c.dur - t) / 0.3) * H * 0.11;
      const base = P(u.x, u.y, 0), chest = P(u.x, u.y, 1.2);
      if (c.line) {
        // Aerys's Spear of Light is light, not glyph-work: white-gold.
        const lit = u.key === 'aerys';
        if (lit) { GLYPH = '255,226,150'; lanceHex = '#ffe7a8'; }
        drawLance(s, c, phase);
        GLYPH = '169,139,255'; lanceHex = '#a98bff';
      }
      else if (phase === 'charge') {
        const k = t / CUT.charge, e = k * k;
        // Darken everything but the fighter.
        const vg = ctx.createRadialGradient(chest.x, chest.y, Math.min(W, H) * 0.12, chest.x, chest.y, Math.max(W, H) * 0.7);
        vg.addColorStop(0, 'rgba(6,4,6,0)'); vg.addColorStop(1, `rgba(6,4,6,${0.35 + 0.45 * k})`);
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        // Ground cracks radiating out, glowing.
        ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          const a = i * 0.698 + 0.3, len = (0.6 + ((i * 37) % 10) / 10) * 2.6 * Math.min(1, k * 1.6);
          const pts = [];
          for (let j = 0; j <= 4; j++) {
            const r = 0.35 + (len * j) / 4, wob = Math.sin(i * 7 + j * 3) * 0.18 * (j / 4);
            pts.push(P(u.x + Math.cos(a + wob) * r, u.y + Math.sin(a + wob) * r, 0.02));
          }
          for (const [w, col] of [[Math.max(3, sc * 0.04), INK], [Math.max(1.5, sc * 0.016), `rgba(${glowRGB},${0.35 + 0.45 * k})`]]) {
            ctx.strokeStyle = col; ctx.lineWidth = w;
            ctx.beginPath(); pts.forEach((q, j) => (j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
          }
        }
        // A pillar of light from the ground.
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // (thin and faint: it must not wash out the fighter in the close-up)
        const pw = sc * (0.45 + 0.6 * e);
        const pg = ctx.createLinearGradient(0, base.y, 0, 0);
        pg.addColorStop(0, `rgba(${glowRGB},${0.28 * k})`); pg.addColorStop(1, `rgba(${glowRGB},0)`);
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.moveTo(base.x - pw, base.y); ctx.lineTo(base.x - pw * 0.4, 0); ctx.lineTo(base.x + pw * 0.4, 0); ctx.lineTo(base.x + pw, base.y); ctx.closePath(); ctx.fill();
        // Energy streams spiralling in toward the fighter; they stop at an
        // aura's edge so the face and body stay clean.
        const halo = sc * 0.75;
        for (let i = 0; i < 7; i++) {
          const a0 = i * 0.628 + t * 3.2, r0 = Math.max(W, H) * (0.6 - 0.4 * ((t * 1.3 + i * 0.1) % 1));
          const sx = chest.x + Math.cos(a0) * r0, sy = chest.y + Math.sin(a0) * r0 * 0.6;
          const mx = chest.x + Math.cos(a0 + 0.9) * r0 * 0.5, my = chest.y + Math.sin(a0 + 0.9) * r0 * 0.3;
          const ea = Math.atan2(my - chest.y, mx - chest.x), ex = chest.x + Math.cos(ea) * halo, ey = chest.y + Math.sin(ea) * halo;
          ctx.strokeStyle = `rgba(${glowRGB},${0.2 + 0.35 * k})`; ctx.lineWidth = 1.5 + 2 * k;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        }
        // The aura's edge: a thin ring of light around the fighter.
        ctx.strokeStyle = `rgba(${glowRGB},${0.35 * k})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(chest.x, chest.y - sc * 0.1, halo * 0.8, halo * 1.25, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        // Debris lifting off the ground (behind and beside, not over the body).
        for (let i = 0; i < 10; i++) {
          const a = i * 2.39, r = 0.9 + ((i * 53) % 17) / 10;
          const z = Math.max(0, (k - ((i * 7) % 5) / 12)) * (0.8 + (i % 4) * 0.5);
          if (z <= 0) continue;
          const q = P(u.x + Math.cos(a) * r, u.y + Math.sin(a) * r, z);
          const sz = sc * (0.05 + (i % 3) * 0.03);
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(t * (2 + i % 3) + i);
          ctx.fillStyle = INK; ctx.fillRect(-sz - 1.5, -sz - 1.5, sz * 2 + 3, sz * 1.4 + 3);
          ctx.fillStyle = '#5a5254'; ctx.fillRect(-sz, -sz, sz * 2, sz * 1.4);
          ctx.fillStyle = `rgba(${glowRGB},0.6)`; ctx.fillRect(-sz, -sz, sz * 2, sz * 0.3);
          ctx.restore();
        }
        speedLines(chest.x, chest.y, 70, Math.min(W, H) * (0.55 - 0.3 * k), Math.max(W, H), `rgba(246,240,236,${0.06 + 0.12 * k})`, Math.floor(t * 24));
        V.cam.shake = Math.max(V.cam.shake, 2 + 4 * k);
      } else if (phase === 'gleam') {
        // The world goes dark around the face; a line of light across the
        // eyes and a glint in them.
        const k = (t - CUT.charge) / (CUT.gleam - CUT.charge);
        const eye = eyeOf(u);
        darkAround(eye, Math.min(W, H) * 0.32, Math.min(0.9, 0.55 + k));
        const gy = eye.y, gw = W * Math.min(1, k * 2.2);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const lg = ctx.createLinearGradient(eye.x - gw, 0, eye.x + gw, 0);
        lg.addColorStop(0, `rgba(${glowRGB},0)`); lg.addColorStop(0.5, `rgba(${glowRGB},0.8)`); lg.addColorStop(1, `rgba(${glowRGB},0)`);
        ctx.fillStyle = lg; ctx.fillRect(eye.x - gw, gy - 2, gw * 2, 4);
        ctx.restore();
        star(eye.x, gy, H * 0.1 * Math.min(1, k * 3), glow, 3, 0.2);
      } else if (phase === 'dash') {
        const k = (t - CUT.gleam) / (c.impactAt - CUT.gleam);
        // Screen-wide speed lines along the dash.
        const a0 = P(c.x0, c.y0, 1), a1 = P(c.x0 + F[0] * 2, c.y0 + F[1] * 2, 1);
        const ang = Math.atan2(a1.y - a0.y, a1.x - a0.x);
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ang);
        ctx.fillStyle = 'rgba(246,240,236,0.18)';
        for (let i = 0; i < 26; i++) {
          const y = ((i * 97) % 100 / 100 - 0.5) * Math.max(W, H) * 1.2, x = (((i * 61 + t * 900) % 100) / 100 - 0.5) * W * 1.6;
          ctx.fillRect(x, y, W * (0.15 + (i % 4) * 0.06), 1 + (i % 3));
        }
        ctx.restore();
        // Afterimage streak from where the fighter stood.
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const tip = { x: c.x0 + F[0] * 1.6 * Math.min(1, k * 1.5), y: c.y0 + F[1] * 1.6 * Math.min(1, k * 1.5) };
        for (let z = 0.15; z < 1.9; z += 0.18) {
          const p0 = P(c.x0, c.y0, z), p1 = P(tip.x, tip.y, z);
          ctx.strokeStyle = `rgba(${glowRGB},${0.15 + 0.2 * Math.sin(z * 2)})`; ctx.lineWidth = Math.max(2, sc * 0.08); ctx.lineCap = 'butt';
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
        }
        ctx.restore();
        // Slashes across each enemy in front, one after another.
        const targets = s.units.filter((o) => o.team !== u.team && !o.fled && o.state !== 'out' && Math.hypot(o.x - u.x, o.y - u.y) < 4.2);
        targets.forEach((o, i) => {
          const tk = k * 1.6 - i * 0.22;
          if (tk <= 0 || tk > 1.2) return;
          const q = P(o.x, o.y, 1.1), L = Math.min(W, H) * 0.55, a = -0.6 + (i % 2) * 1.1;
          const grow = Math.min(1, tk * 3), fade = tk > 0.8 ? 1 - (tk - 0.8) / 0.4 : 1;
          const dx = Math.cos(a) * L * grow, dy = Math.sin(a) * L * grow;
          ctx.globalAlpha = fade;
          ctx.lineCap = 'round';
          ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(q.x - dx, q.y - dy); ctx.lineTo(q.x + dx, q.y + dy); ctx.stroke();
          ctx.strokeStyle = edge; ctx.lineWidth = 6; ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
          ctx.globalAlpha = 1;
        });
        V.cam.shake = Math.max(V.cam.shake, 6);
      } else if (phase === 'impact') {
        const ft = t - c.impactAt;
        if (ft < 0.06) { ctx.fillStyle = '#f6f0ec'; ctx.fillRect(0, 0, W, H); }
        else { ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H); speedLines(chest.x, chest.y, 70, Math.min(W, H) * 0.08, Math.max(W, H), '#f6f0ec', 3); }
        V.cam.shake = 16;
      } else {
        const k = (t - c.impactAt - 0.12) / 0.8;
        if (k < 1) {
          ctx.save();
          ctx.globalAlpha = 1 - k;
          // Huge brush crescent.
          const N = 28, outer = [], inner = [];
          for (let i = 0; i <= N; i++) {
            const q = i / N, a = u.facing - 1.8 + 3.6 * q;
            const th = Math.sin(q * Math.PI) * 0.5, zz = 1.1 + Math.sin(q * Math.PI) * 1.1;
            outer.push(P(u.x + Math.cos(a) * 3, u.y + Math.sin(a) * 3, zz));
            inner.push(P(u.x + Math.cos(a) * 3 * (1 - th), u.y + Math.sin(a) * 3 * (1 - th), zz * 0.9));
          }
          ctx.beginPath(); ctx.moveTo(outer[0].x, outer[0].y);
          for (const q of outer) ctx.lineTo(q.x, q.y);
          for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
          ctx.closePath();
          ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.stroke();
          ctx.fillStyle = edge; ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(3, sc * 0.08);
          ctx.beginPath(); outer.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
          // Two shockwaves on the ground.
          for (const [delay, col] of [[0, glow], [0.15, PAL.bone]]) {
            const kk = Math.max(0, k - delay);
            const rr = (0.5 + kk * 5.5) * sc;
            ctx.strokeStyle = col; ctx.lineWidth = 9 * (1 - kk) + 1;
            ctx.beginPath(); ctx.ellipse(base.x, base.y, rr, rr * cam.pitch, 0, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.restore();
        }
        if (!c.dusted) { c.dusted = true; dust(u.x, u.y, 22); shards(u.x, u.y, 0.6, 18, glow, 7); }
      }
      // Letterbox
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, W, bars); ctx.fillRect(0, H - bars, W, bars);
      // The move's name after the impact.
      if (phase === 'after' && t > c.impactAt + 0.47) {
        const tk = Math.min(1, (t - c.impactAt - 0.47) / 0.22), ease = 1 - Math.pow(1 - tk, 3);
        ctx.globalAlpha = Math.min(1, (c.dur - t) / 0.4);
        const fs = Math.round(Math.min(W, H) * 0.14);
        // Lettering on the side of the frame the caster leaves open.
        const left = cam.ax > 0.52;
        ctx.save();
        ctx.translate(left ? 30 + (1 - ease) * W * 0.4 : W - 24 - (1 - ease) * W * 0.4, H - bars - fs * 0.3);
        ctx.transform(1, 0, -0.2, 1, 0, 0);
        ctx.textAlign = left ? 'left' : 'right'; ctx.textBaseline = 'alphabetic';
        ctx.font = `800 ${fs}px ${FONT.display}`;
        ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.14; ctx.strokeStyle = INK;
        ctx.strokeText(c.name.toUpperCase(), 0, 0);
        ctx.fillStyle = PAL.white; ctx.fillText(c.name.toUpperCase(), 0, 0);
        ctx.font = `800 ${Math.round(fs * 0.26)}px ${FONT.ui}`;
        ctx.lineWidth = 5; ctx.strokeText(u.name.toUpperCase() + '  ·  HEAVY ART', 0, -fs * 0.95);
        ctx.fillStyle = edge; ctx.fillText(u.name.toUpperCase() + '  ·  HEAVY ART', 0, -fs * 0.95);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      if (t > 0.4 && phase !== 'impact') {
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
      ctx.fillStyle = banner.col || PAL.glow; ctx.fillText(banner.text, 0, 0);
      ctx.font = `800 ${Math.round(fs * 0.18)}px ${FONT.ui}`;
      ctx.fillStyle = PAL.bone; ctx.fillText(banner.sub.toUpperCase(), 0, fs * 0.6);
      ctx.restore();
    }

    // The heroes' combo: from the third hit in a row, slanted lettering at
    // the right edge, punched on every hit, gone a beat after the run ends.
    function drawCombo(dt) {
      const since = V.time - combo.last;
      if (combo.n < 3 || since > 1.6) return;
      combo.pop += dt;
      const W = V.W, H = V.H, fs = Math.round(Math.min(W, H) * 0.12);
      const punch = combo.pop < 0.08 ? 1.35 - combo.pop * 4.4 : 1;
      ctx.save();
      ctx.globalAlpha = since > 1.2 ? Math.max(0, 1 - (since - 1.2) / 0.4) : 1;
      ctx.translate(W - Math.max(22, W * 0.03), H * 0.56);
      ctx.transform(1, 0, -0.25, 1, 0, 0);
      ctx.scale(punch, punch);
      ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
      ctx.font = `800 ${fs}px ${FONT.display}`;
      const n = String(combo.n);
      ctx.fillStyle = PAL.crimson; ctx.fillText(n, fs * 0.06, fs * 0.06);
      ctx.lineWidth = fs * 0.16; ctx.strokeStyle = INK; ctx.strokeText(n, 0, 0);
      ctx.fillStyle = PAL.white; ctx.fillText(n, 0, 0);
      ctx.font = `800 ${Math.round(fs * 0.24)}px ${FONT.ui}`;
      ctx.lineWidth = 4; ctx.strokeText('HIT COMBO', 0, fs * 0.3);
      ctx.fillStyle = PAL.heroGlow; ctx.fillText('HIT COMBO', 0, fs * 0.3);
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
      if (!s.cutscene && !V.show) drawCombo(dt || 0);
    }

    function takeHitstop() { const h = hitstop; hitstop = 0; return h; }

    return { consume, underUnit, overUnit, drawWorld, drawScreen, takeHitstop, panel, speedLines, star, portrait, cutPhase };
  }

  NS.fx = { create };
})();
