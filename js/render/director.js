/*
 * Tower of Wishes — the anime director.
 *
 * Watches the fight and directs it like an episode: it cuts the camera in on
 * clashes and knockdowns, slows time for a beat on the big moments, and
 * slams in manhwa cut-in panels (a close-up of the eyes, glinting) when a
 * fighter reads a feint, when the broad man charges, or when a fighter is
 * about to unleash something. One system, every fight; nothing is scripted
 * per match.
 *
 * API (called by core.js):
 *   observe(s, dt)        look at this frame's events (before fx consumes them)
 *   camera(s)             camera override {focus|x,y, zoom, angOff} or null
 *   drawScreen(s, dt)     cut-in panels over the scene
 *   timeScale()           slow-motion factor for the simulation (main.js)
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});
  const INK = '#0c0808';

  function create(V, fx) {
    const { ctx, PAL, FONT } = V;
    let shot = null;      // {focus|x,y, zoom, angOff, t, dur, prio}
    let queue = [];       // follow-up shots
    let cutin = null;     // {unit, t, dur, caption}
    let slow = { k: 1, t: 0 };
    let lastCutin = -99, clock = 0;
    const seen = new WeakMap(); // per unit: last icon, state, flags

    function setShot(o, prio) {
      if (shot && shot.prio > prio && shot.t < shot.dur) return false;
      shot = Object.assign({ t: 0, prio }, o);
      queue = o.then || [];
      return true;
    }
    function slowmo(k, t) { if (k < slow.k || slow.t <= 0) slow = { k, t }; }
    // Eye cut-in panels are switched off (author's call); kept for later use.
    const CUTINS = false;
    function cut(unit, caption, force) {
      if (!CUTINS) return;
      if (!force && clock - lastCutin < 5) return;
      lastCutin = clock;
      cutin = { unit, t: 0, dur: 1.1, caption };
    }

    function observe(s, dt) {
      clock += dt;
      if (slow.t > 0) { slow.t -= dt; if (slow.t <= 0) slow.k = 1; }
      if (shot) {
        shot.t += dt;
        if (shot.t >= shot.dur) shot = queue.length ? Object.assign({ t: 0, prio: shot.prio }, queue.shift()) : null;
      }
      if (cutin) { cutin.t += dt; if (cutin.t >= cutin.dur) cutin = null; }
      if (s.phase !== 'fight' || s.cutscene) return;

      for (const e of s.fx) {
        if (e.type === 'parry') {
          if (setShot({ x: e.x, y: e.y, zoom: 1.9, angOff: 0.25, dur: 0.95 }, 2)) slowmo(0.3, 0.35);
        } else if (e.type === 'hit' && e.big) {
          // Big blows: a quick push-in and a breath of slow motion; the
          // heaviest (crit-like, see fx.js) always get the slow beat.
          if (setShot({ x: e.x, y: e.y, zoom: 1.45, dur: 0.55 }, 1)) slowmo(0.4, 0.12);
          if (e.dmg >= 24) slowmo(0.35, 0.18);
        } else if (e.type === 'ko') {
          if (setShot({ x: e.x, y: e.y, zoom: 1.7, angOff: -0.2, dur: 1.0 }, 3)) slowmo(0.3, 0.55);
        } else if (e.type === 'fizzle') {
          setShot({ focus: e.unit, zoom: 2.1, dur: 1.0 }, 1);
        } else if (e.type === 'allout') {
          setShot({ focus: s.lead.id, zoom: 1.6, angOff: 0.3, dur: 1.2 }, 4);
        }
      }

      // State changes the event list doesn't carry.
      for (const u of s.units) {
        const prev = seen.get(u) || {};
        const now = { icon: u.iconT > 0 ? u.icon : null, state: u.state, fleeing: !!u.fleeing, distracted: u.state === 'distracted' };
        if (now.icon === '?' && prev.icon !== '?' && u.team === 'hero') {
          // Read the feint: eyes cut-in, a beat of slow motion.
          cut(u, 'READ');
          slowmo(0.3, 0.5);
          setShot({ focus: u.id, zoom: 1.8, dur: 0.9 }, 2);
        }
        if (now.distracted && !prev.distracted) {
          // Kael glances at the runner; the broad man charges.
          const look = s.units.find((o) => o.def.noncombat);
          const brute = s.units.find((o) => o.def.punisher && V.Sim.alive(o)) || null;
          setShot({ focus: look ? look.id : u.id, zoom: 1.5, dur: 0.55, then: brute ? [{ focus: brute.id, zoom: 1.8, angOff: -0.3, dur: 0.9 }] : [] }, 3);
          if (brute) cut(brute, null, true);
        }
        if (u.def.punisher && u.target && u.target.drained > 0 && !prev.punish) {
          now.punish = true;
          cut(u, null, true);
          setShot({ focus: u.id, zoom: 1.7, dur: 0.9 }, 3);
        } else now.punish = prev.punish && u.target && u.target.drained > 0;
        seen.set(u, now);
      }
      // The finishing blow: hold on the winner in slow motion.
      if (s.result && s.result.outcome === 'win' && !observe.won) {
        observe.won = s;
        setShot({ focus: s.lead.id, zoom: 1.9, angOff: 0.35, dur: 3 }, 5);
        slowmo(0.35, 1.2);
      }
      if (observe.won && observe.won !== s) observe.won = null;
    }

    function camera(s) {
      if (!shot || s.cutscene) return null;
      // Ease the zoom in quickly and out at the end of the shot.
      const k = Math.min(1, shot.t / 0.12) * Math.min(1, (shot.dur - shot.t) / 0.25 + 0.4);
      const o = { zoom: 1 + (shot.zoom - 1) * Math.max(0, Math.min(1, k)), angOff: (shot.angOff || 0) * k };
      if (shot.focus) o.focus = shot.focus; else { o.x = shot.x; o.y = shot.y; }
      return o;
    }

    function timeScale() { return slow.t > 0 ? slow.k : 1; }
    function cinematic() { return !!cutin; }

    // Eyes cut-in: a slanted strip slams in across the top of the screen.
    function drawScreen(s) {
      if (!cutin || s.cutscene || !fx.panel) return;
      const W = V.W, H = V.H, u = cutin.unit;
      if (u.fled) { cutin = null; return; }
      const t = cutin.t, d = cutin.dur;
      const inK = Math.min(1, t / 0.12), outK = Math.max(0, (t - (d - 0.18)) / 0.18);
      const hero = u.team === 'hero';
      const glow = hero ? PAL.heroGlow : PAL.glow;
      const y0 = H * 0.22, y1 = H * 0.5, sl = W * 0.025;
      const dir = hero ? -1 : 1;
      const slide = ((1 - inK) * dir - outK * dir) * W;
      fx.portrait(u, [[W * 0.06 + slide, y0 + sl], [W * 0.94 + slide, y0], [W * 0.92 + slide, y1 - sl], [W * 0.04 + slide, y1]], t);
      if (cutin.caption) {
        const fs = Math.round(H * 0.09);
        ctx.save();
        ctx.translate(W * 0.9 + slide, y1 - fs * 0.15);
        ctx.transform(1, 0, -0.22, 1, 0, 0);
        ctx.font = `800 ${fs}px ${FONT.display}`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
        ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.16; ctx.strokeStyle = INK; ctx.strokeText(cutin.caption, 0, 0);
        ctx.fillStyle = glow; ctx.fillText(cutin.caption, 0, 0);
        ctx.restore();
      }
    }

    return { observe, camera, drawScreen, timeScale, cinematic, forceCut: (u, cap) => cut(u, cap, true) };
  }

  NS.director = { create };
})();
