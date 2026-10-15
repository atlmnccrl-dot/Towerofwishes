/*
 * Tower of Wishes — face-off intro and countdown, as manhwa panels.
 *
 * Timeline (seconds), driven by main.js through `show.t`:
 *   0.0 – 1.2   establishing shot of the arena
 *   1.2 – 6.2   face-off: each fighter in INTRO_ORDER gets a close-up strip,
 *               their name and (where the book gives one) their line
 *   6.2 – 7.0   VS: Kael against the broad man, split screen
 *   7.0 – 9.4   3 · 2 · 1 · FIGHT   (Sim.begin is called at 9.4)
 *
 * API (called by core.js):
 *   cameraFor(s, show) -> camera override | null
 *   spotlight(s, show) -> id of the fighter being introduced | null
 *   draw(s, show, dt)  -> screen-space overlay
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});
  const INK = '#0c0808';

  const T = { establish: 1.2, cardsEnd: 6.2, vsEnd: 7.0, count: 0.6, fight: 9.4, end: 10.0 };

  function cardTimes(order) {
    // Kael, last in, gets a longer beat.
    const n = order.length, span = T.cardsEnd - T.establish;
    const each = span / (n + 0.5);
    return order.map((id, i) => ({ id, t0: T.establish + i * each, t1: T.establish + (i + 1) * each + (i === n - 1 ? each * 0.5 : 0) }));
  }

  function create(V) {
    const { ctx, FONT, PAL, Sim } = V;
    // Card timings depend on who is in the match; cache them per match.
    let cardsFor = null, cards = [];
    function sync(s) { if (cardsFor !== s) { cardsFor = s; cards = cardTimes(s.introOrder || Sim.INTRO_ORDER); } }
    let fx = null; // resolved lazily (core creates fx before intro)

    function current(t) { return cards.find((c) => t >= c.t0 && t < c.t1) || null; }

    function spotlight(s, show) {
      if (!show || show.t >= T.cardsEnd) return null;
      sync(s);
      const c = current(show.t);
      return c ? c.id : null;
    }

    function cameraFor(s, show) {
      if (!show || show.t >= T.end) return null;
      const id = spotlight(s, show);
      if (id) {
        const c = current(show.t), k = (show.t - c.t0) / (c.t1 - c.t0);
        return { focus: id, zoom: 2.2 + k * 0.35, angOff: (s.byId[id].team === 'hero' ? 0.35 : -0.35) * (1 - k) };
      }
      if (show.t < T.establish) return { zoom: 0.85 + show.t * 0.12, angOff: 0.5 - show.t * 0.3 };
      return null;
    }

    function lettering(text, x, y, fs, fill, align, skew) {
      ctx.save();
      ctx.translate(x, y);
      ctx.transform(1, 0, skew == null ? -0.2 : skew, 1, 0, 0);
      ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = `800 ${fs}px ${FONT.display}`;
      ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.16; ctx.strokeStyle = INK;
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = fill; ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    // Manhwa speech balloon pointing at a spot on screen.
    function balloon(text, tx, ty, side) {
      const W = V.W, H = V.H;
      const fs = Math.round(Math.min(W, H) * 0.045);
      ctx.font = `700 ${fs}px ${FONT.ui}`;
      const tw = ctx.measureText(text).width;
      const bw = tw + fs * 2.2, bh = fs * 2.4;
      let bx = tx + side * (bw * 0.35 + fs), by = ty - bh * 1.1;
      bx = Math.max(bw / 2 + 12, Math.min(W - bw / 2 - 12, bx));
      by = Math.max(bh / 2 + 12, by);
      ctx.save();
      ctx.lineJoin = 'round';
      const shape = () => {
        ctx.beginPath(); ctx.ellipse(bx, by, bw / 2, bh / 2, 0, 0, Math.PI * 2);
        ctx.moveTo(bx - side * bw * 0.12, by + bh * 0.38); ctx.lineTo(tx, ty - fs * 0.6); ctx.lineTo(bx + side * bw * 0.05, by + bh * 0.45);
      };
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 6; shape(); ctx.stroke();
      ctx.fillStyle = '#f6f0ec'; shape(); ctx.fill();
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, bx, by + 1);
      ctx.restore();
    }

    function draw(s, show) {
      if (!show || show.t >= T.end) return;
      fx = fx || V.fxApi;
      const W = V.W, H = V.H, t = show.t;
      // Letterbox throughout the face-off.
      const lb = H * 0.07 * Math.min(1, t / 0.3) * (t < T.vsEnd ? 1 : Math.max(0, 1 - (t - T.vsEnd) / 0.3));
      if (t < T.establish) {
        lettering((s.chapter || '').toUpperCase(), W * 0.06, H * 0.8, Math.round(Math.min(W, H) * 0.06), PAL.bone, 'left');
        lettering(s.title || '', W * 0.06, H * 0.8 + Math.min(W, H) * 0.11, Math.round(Math.min(W, H) * 0.1), PAL.white, 'left');
      }
      sync(s);
      const c = current(t);
      if (c && t < T.cardsEnd) {
        const u = s.byId[c.id], d = u.def, hero = u.team === 'hero';
        const k = Math.min(1, (t - c.t0) / 0.16), ease = 1 - Math.pow(1 - k, 3);
        const dir = hero ? -1 : 1;
        const slide = (1 - ease) * dir * W * 0.8;
        // Close-up strip of the eyes slams in.
        const y0 = H * 0.1, y1 = H * 0.36, sl = W * 0.03;
        const poly = hero
          ? [[W * 0.02 + slide, y0 + sl], [W * 0.62 + slide, y0], [W * 0.6 + slide, y1 - sl * 0.5], [W * 0.0 + slide, y1]]
          : [[W * 0.38 + slide, y0], [W * 0.98 + slide, y0 + sl], [W * 1.0 + slide, y1], [W * 0.4 + slide, y1 - sl * 0.5]];
        if (fx && fx.portrait) fx.portrait(u, poly, t - c.t0);
        // Name and epithet.
        const fs = Math.round(Math.min(W, H) * 0.13);
        const nx = hero ? W * 0.05 - slide * 0.3 : W * 0.95 - slide * 0.3;
        const ny = H * 0.36 + fs * 1.2;
        ctx.save();
        ctx.font = `800 ${Math.round(fs * 0.24)}px ${FONT.ui}`;
        ctx.textAlign = hero ? 'left' : 'right'; ctx.textBaseline = 'alphabetic';
        ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
        const ep = (d.intro.epithet || '').toUpperCase();
        ctx.strokeText(ep, nx, ny - fs * 0.95); ctx.fillStyle = hero ? PAL.hero : PAL.glow; ctx.fillText(ep, nx, ny - fs * 0.95);
        ctx.restore();
        lettering(u.name.toUpperCase(), nx, ny, fs, PAL.white, hero ? 'left' : 'right');
        // Their line, from the book, in a balloon by the fighter.
        if (d.intro.line && t - c.t0 > 0.25) {
          const head = V.P(u.x, u.y, 1.9);
          balloon('“' + d.intro.line + '”', head.x, head.y, hero ? 1 : -1);
        }
      } else if (t >= T.cardsEnd && t < T.vsEnd) {
        // VS: split screen, the newcomer against the man reaching for Eiryn.
        const k = Math.min(1, (t - T.cardsEnd) / 0.15);
        ctx.fillStyle = 'rgba(8,5,6,0.9)'; ctx.fillRect(0, 0, W, H);
        const [lu, bu] = (s.vs || ['kael', 'brute']).map((id) => s.byId[id]);
        if (fx) {
          const off = (1 - k) * W * 0.8, sl = H * 0.05;
          fx.portrait(lu, [[W * 0.02 - off, H * 0.1 + sl], [W * 0.9 - off, H * 0.08], [W * 0.88 - off, H * 0.42 - sl], [-off, H * 0.44]], t - T.cardsEnd + 0.3);
          fx.portrait(bu, [[W * 0.1 + off, H * 0.58], [W + off, H * 0.56 + sl], [W * 0.98 + off, H * 0.9], [W * 0.12 + off, H * 0.92 - sl]], t - T.cardsEnd + 0.3);
        }
        const fs = Math.round(Math.min(W, H) * 0.28 * (1.4 - 0.4 * k));
        lettering('VS', W / 2, H / 2 + fs * 0.35, fs, PAL.glow, 'center', -0.15);
        const ns = Math.round(Math.min(W, H) * 0.08);
        lettering(lu.name.toUpperCase(), W * 0.88, H * 0.42 - ns * 0.1, ns, PAL.white, 'right');
        lettering(bu.name.toUpperCase(), W * 0.14, H * 0.58 + ns * 0.95, ns, PAL.white, 'left');
      } else if (t >= T.vsEnd) {
        const i = Math.floor((t - T.vsEnd) / T.count);
        const label = ['3', '2', '1', 'FIGHT!'][Math.min(3, i)];
        const local = Math.min(1, ((t - T.vsEnd) - Math.min(3, i) * T.count) / T.count);
        const fight = label === 'FIGHT!';
        const punch = 1.5 - 0.5 * Math.min(1, local * 5);
        const fade = fight ? Math.max(0, 1 - (t - T.fight) / 0.6) : 1;
        const fs = Math.round(Math.min(W, H) * (fight ? 0.24 : 0.36) * punch);
        ctx.save();
        ctx.globalAlpha = fade;
        // A slanted black band behind the number, with speed lines.
        const bh = Math.min(W, H) * (fight ? 0.34 : 0.42);
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.moveTo(0, H * 0.45 - bh * 0.45); ctx.lineTo(W, H * 0.45 - bh * 0.6); ctx.lineTo(W, H * 0.45 + bh * 0.45); ctx.lineTo(0, H * 0.45 + bh * 0.6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = fight ? PAL.glow : PAL.bone; ctx.lineWidth = 3; ctx.stroke();
        if (fx) { ctx.save(); ctx.clip(); fx.speedLines(W / 2, H * 0.45, 50, W * 0.18, W, fight ? 'rgba(227,38,58,0.3)' : 'rgba(246,240,236,0.12)', i); ctx.restore(); }
        lettering(label, W / 2, H * 0.45 + fs * 0.36, fs, fight ? PAL.glow : PAL.white, 'center', -0.12);
        ctx.restore();
        // Impact flash on FIGHT.
        if (fight && t - T.fight < 0.08 && t >= T.fight) { ctx.fillStyle = 'rgba(246,240,236,0.85)'; ctx.fillRect(0, 0, W, H); }
      }
      if (lb > 0) { ctx.fillStyle = INK; ctx.fillRect(0, 0, W, lb); ctx.fillRect(0, H - lb, W, lb); }
      if (t < T.vsEnd) {
        ctx.font = `700 12px ${FONT.ui}`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = 'rgba(246,240,236,0.55)'; ctx.fillText('Tap to skip', W - 14, H - Math.max(lb, 6) - 8);
      }
    }

    return { draw, cameraFor, spotlight };
  }

  NS.intro = { create, T };
})();
