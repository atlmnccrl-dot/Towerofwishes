/*
 * Tower of Wishes — face-off intro and countdown, as an anime cold open.
 *
 * Timeline (seconds), driven by main.js through `show.t`. The fields of `T`
 * are rewritten for each match (main.js keeps a reference to this object and
 * reads T.fight, T.vsEnd and T.end every frame):
 *
 *   0 – establish           establishing shot, chapter and title lettering
 *   establish – heroesEnd   the player's team, one fighter at a time: a moving
 *                           close-up, a signature beat that lands on an impact
 *                           frame, name, epithet and (if the book gives one)
 *                           their line. Guests get a short beat first, then the
 *                           allies, the lead last and longest.
 *   heroesEnd – foesEnd     one low sweeping pan across the whole enemy side,
 *                           red-graded, with a team or boss title
 *   foesEnd – vsEnd         VS: the lead against the opposing boss, split screen
 *   vsEnd – fight           3 · 2 · 1, then FIGHT (Sim.begin is called at T.fight)
 *   fight – end             FIGHT fades while the opening moves play
 *
 * With three heroes this runs about 9.6 s; with one, about 6.6 s.
 *
 * API (called by core.js):
 *   cameraFor(s, show) -> camera override | null
 *   spotlight(s, show) -> id of the fighter being introduced, the enemy team
 *                         name during the enemy pan, or null
 *   draw(s, show, dt)  -> screen-space overlay
 * It also sets V.introPose(u) for fighters.js (pose overrides during a beat).
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});
  const INK = '#0c0808';
  const GLYPH = '169,139,255';

  // Beat lengths (seconds).
  const D = { establish: 1.1, guest: 0.9, ally: 1.35, lead: 1.6, foes: 1.9, vs: 0, count: 0.45, fightHold: 0.55, hit: 0.4 };

  // Shared, mutated per match (see header). Defaults: three heroes.
  const T = { establish: D.establish, heroesEnd: 5.4, foesEnd: 7.3, vsEnd: 7.95, count: D.count, fight: 9.3, end: 9.85 };

  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
  const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

  // "4 BANDITS", "3 GOBLINS": the word most of the names share, pluralised.
  function groupWord(foes) {
    const count = new Map();
    const add = (w, last) => { if (!w || /^the$/i.test(w)) return; const c = count.get(w) || { n: 0, last: 0 }; c.n++; if (last) c.last++; count.set(w, c); };
    for (const u of foes) { const ws = u.name.split(/\s+/); add(ws[ws.length - 1], true); if (ws.length > 1) add(ws[0], false); }
    let best = null, bc = null;
    for (const [w, c] of count) if (!bc || c.n > bc.n || (c.n === bc.n && c.last > bc.last)) { best = w; bc = c; }
    if (!best || bc.n < 2) return foes.length > 1 ? 'ENEMIES' : (foes[0] ? foes[0].name : 'ENEMY').toUpperCase();
    const pl = /man$/i.test(best) ? best.replace(/man$/i, 'men') : /s$/i.test(best) ? best : best + 's';
    return pl.toUpperCase();
  }

  function create(V) {
    const { ctx, FONT, PAL } = V;
    let fx = null; // resolved lazily (core creates fx before intro)
    const lookOf = (u) => (NS.fighters && NS.fighters.LOOK && NS.fighters.LOOK[u.key]) || {};
    const heightOf = (u) => 1.8 * (lookOf(u).h || 1);

    // ---------------------------------------------------------- the plan
    let planFor = null, plan = null;
    function sync(s) {
      if (planFor === s) return plan;
      planFor = s;
      const heroes = s.units.filter((u) => u.team === 'hero' && !u.fled);
      const lead = s.lead && s.lead.team === 'hero' ? s.lead : heroes.find((u) => !u.guest) || heroes[0];
      const order = [
        ...heroes.filter((u) => u.guest && u !== lead).map((u) => ({ u, kind: 'guest' })),
        ...heroes.filter((u) => !u.guest && u !== lead).map((u) => ({ u, kind: 'ally' })),
        ...(lead ? [{ u: lead, kind: 'lead' }] : []),
      ];
      let t = D.establish;
      const beats = order.map((b, i) => {
        const dur = D[b.kind];
        const beat = { ...b, i, t0: t, t1: t + dur, hit: t + dur * (b.kind === 'guest' ? 0.3 : D.hit), style: b.kind === 'lead' ? 'lead' : ['orbit', 'low', 'push'][i % 3] };
        t += dur;
        return beat;
      });
      const foes = s.units.filter((u) => u.team !== 'hero' && !u.fled);
      const vsFoe = s.vs && s.byId[s.vs[1]];
      const boss = vsFoe && vsFoe.def.boss ? vsFoe : foes.find((u) => u.def.boss) || null;
      let title, sub;
      if (boss) {
        title = boss.name.toUpperCase();
        const others = foes.length - 1;
        sub = (boss.def.intro && boss.def.intro.epithet) || '';
        if (others > 0) sub += (sub ? '  ·  ' : '') + '+' + others + ' ' + groupWord(foes.filter((u) => u !== boss)).toLowerCase();
      } else if (foes.length === 1) {
        title = foes[0].name.toUpperCase();
        sub = (foes[0].def.intro && foes[0].def.intro.epithet) || '';
      } else {
        title = foes.length + ' ' + groupWord(foes);
        sub = '';
      }
      plan = { heroes, lead, beats, foes, boss, title, sub, fired: new Set(), lastT: 0 };
      T.establish = D.establish;
      T.heroesEnd = t;
      T.foesEnd = t + (foes.length ? D.foes : 0);
      T.vsEnd = T.foesEnd + D.vs;
      T.count = D.count;
      T.fight = T.vsEnd + D.count * 3;
      T.end = T.fight + D.fightHold;
      return plan;
    }
    const beatAt = (p, t) => (t >= D.establish && t < T.heroesEnd ? p.beats.find((b) => t >= b.t0 && t < b.t1) || null : null);

    // ---------------------------------------------------------- spotlight + poses
    let poseBeat = null, poseK = 0;
    function spotlight(s, show) {
      poseBeat = null;
      if (!show || show.t >= T.foesEnd) return null;
      const p = sync(s), t = show.t;
      const b = beatAt(p, t);
      if (b) { poseBeat = b; poseK = (t - b.t0) / (b.t1 - b.t0); return b.u.id; }
      if (t >= T.heroesEnd && p.foes.length) return p.foes[0].team;
      return null;
    }

    // Signature poses through a beat (k: 0..1 across the beat; h: the hit).
    V.introPose = function introPose(u) {
      const b = poseBeat;
      if (!b || b.u !== u) return null;
      const k = poseK, h = (b.hit - b.t0) / (b.t1 - b.t0);
      const pre = smooth(k / h), post = smooth((k - h) / 0.3);
      const L = lookOf(u);
      switch (u.key) {
        case 'ren':
          return { rel: -0.9, pitch: -0.1, crouch: 0.06 + 0.22 * pre, lean: 0.1 + 0.26 * pre, stance: 1.2 + 0.5 * pre, off: 'back', twist: 0.2 };
        case 'mara':
          return { off: 'cast', rel: 0.2, pitch: 0.3 + 0.7 * pre, lean: -0.04 - 0.08 * post, crouch: 0.03, stance: 1.2, twist: -0.3 * pre };
        case 'eirynMage': case 'eiryn':
          return { off: 'cast', rel: 0.3, pitch: 0.4 + 0.6 * pre, lean: -0.14 * pre, crouch: 0.04, stance: 1.15 };
        case 'brannoc':
          // Shield up, then slammed down.
          if (k < h) return { off: 'guard', rel: 1.5, pitch: 1.35, stance: 1.3, crouch: 0.0, lean: -0.16 * pre, twist: -0.3 * pre };
          return { off: 'guard', rel: 1.5, pitch: 1.35, stance: 1.8, crouch: 0.3 - 0.12 * post, lean: 0.34 - 0.2 * post, twist: 0 };
        case 'climber':
          if (k < h) return { rel: -0.4, pitch: -0.25, crouch: 0.22 * pre, lean: 0.2 * pre, stance: 1.5, twist: 0.3 * pre };
          return { rel: 0.15, pitch: 1.35, crouch: 0.12, lean: 0.08, stance: 1.6, twist: -0.3 };
        // The new manuscript's heroes.
        case 'eirynAsh':
          // one hand drawn in, then pushed out flat: the air goes with it
          if (k < h) return { off: 'cast', rel: 0.2, pitch: 0.3 + 0.4 * pre, lean: -0.1 * pre, crouch: 0.04, stance: 1.15, twist: 0.25 * pre };
          return { off: 'cast', rel: 0.2, pitch: 0.9, lean: 0.12 - 0.08 * post, crouch: 0.08, stance: 1.35, twist: -0.2 };
        case 'aerys':
          // Stillwing: palms open, a crescent stance; the spear forms over her hand
          return { off: 'cast', rel: -0.4, pitch: 0.4 + 0.9 * pre, lean: -0.08 * pre + 0.1 * post, crouch: 0.1 * pre, stance: 1.3 + 0.4 * pre, twist: -0.35 * pre };
        case 'nox':
          return { rel: -0.9, pitch: -0.1, crouch: 0.06 + 0.24 * pre, lean: 0.1 + 0.26 * pre, stance: 1.2 + 0.5 * pre, off: 'back', twist: 0.2 };
        case 'eloryn':
          return { off: 'cast', rel: 0.3, pitch: 0.2 + 0.6 * pre, lean: -0.04 * pre, crouch: 0.04 + 0.06 * post, stance: 1.1 };
        case 'braxen':
          // the altered fist raised, then driven into the ground
          if (k < h) return { off: 'fistup', rel: 0.9, pitch: 0.6 + 1.0 * pre, lean: -0.12 * pre, crouch: 0.04, stance: 1.5, twist: -0.4 * pre };
          return { off: 'fistup', rel: 0.25, pitch: -1.4, lean: 0.45 - 0.2 * post, crouch: 0.32 - 0.12 * post, stance: 1.8, twist: 0.2 };
      }
      if (L.weapon === 'glyph' || L.weapon === 'bow') return { off: 'cast', pitch: 0.4 + 0.6 * pre, lean: -0.1 * pre };
      // Swords and the rest: a flourish that ends in guard.
      const sw = clamp01((k - (h - 0.12)) / 0.12);
      if (k < h - 0.12) return { rel: 0.75 + 1.65 * pre, pitch: 0.5 + 0.5 * pre, lean: -0.12 * pre, crouch: 0.05 + 0.05 * pre, twist: -0.5 * pre, stance: 1.35 };
      if (k < h + 0.02) return { rel: 2.4 - 4.1 * sw, pitch: 0.15, lean: 0.3, crouch: 0.12, twist: 0.6, stance: 1.55 };
      return { rel: -1.7 + 1.95 * post, pitch: 0.15 + 1.3 * post, lean: 0.3 - 0.25 * post, crouch: 0.12, twist: 0.6 * (1 - post), stance: 1.55 };
    };

    // ---------------------------------------------------------- camera
    // A camera that puts world point (x, y) at screen fraction (sx, sy).
    function place(x, y, ang, sc, pitch, sx, sy) {
      const c = Math.cos(ang), s = Math.sin(ang);
      const mx = (sx - 0.5) * V.W / sc, my = (sy - V.cam.horizon) * V.H / (sc * pitch);
      return { x: x - c * mx - s * my, y: y + s * mx - c * my, sc, ang, pitch };
    }

    // Screen position of world point (x, y, z) under camera `cm` (as built by place()).
    function proj(cm, x, y, z) {
      const c = Math.cos(cm.ang), s = Math.sin(cm.ang), dx = x - cm.x, dy = y - cm.y;
      const rx = dx * c - dy * s, ry = dx * s + dy * c;
      return { x: V.W / 2 + rx * cm.sc, y: V.H * V.cam.horizon + ry * cm.sc * cm.pitch - z * cm.sc * 0.9, d: ry };
    }
    // How badly the other fighters spoil a shot: anyone nearer the camera than
    // the subject who covers them costs a lot; anyone else in frame a little.
    function clutter(cm, subject, others, H) {
      let bad = 0;
      const box = subject && { a: proj(cm, subject.x, subject.y, 0), h: heightOf(subject) * 0.9 * cm.sc };
      for (const o of others) {
        const f = proj(cm, o.x, o.y, 0), hh = heightOf(o) * 0.9 * cm.sc, hw = Math.max(cm.sc * 0.5, hh * 0.25);
        if (f.x + hw < 0 || f.x - hw > V.W || f.y < 0 || f.y - hh > H) continue; // off screen
        if (box && f.d > box.a.d - 0.2 && Math.abs(f.x - box.a.x) < hw + cm.sc * 0.45) bad += 10;
        else if (box && f.d > box.a.d) bad += 2 * (hh / H);
        else bad += box ? 0.3 : 4 * Math.min(1, hh / (H * 0.4));
      }
      return bad;
    }
    function clearAngle(p, b, sc) {
      const u = b.u, others = planFor.units.filter((o) => o !== u && !o.fled);
      let best = -0.75, bs = Infinity;
      for (const d of [-0.75, -0.45, -1.05, -1.35, -0.2, -1.65, -1.95]) {
        const cm = place(u.x, u.y, Math.PI / 2 - u.facing - d, sc, 0.4, 0.66, 0.9);
        const sc2 = clutter(cm, u, others, V.H) + Math.abs(d + 0.75) * 0.6;
        if (sc2 < bs) { bs = sc2; best = d; }
      }
      return best;
    }
    // Ground level: the camera in front of the fighter (delta 0 = they face us). Try a few
    // near-frontal positions and keep the one with the fewest fighters in the way.
    const GROUND_PITCH = 0.17;
    function frontAngle(p, b, sc) {
      const u = b.u, others = planFor.units.filter((o) => o !== u && !o.fled);
      // the arena's crates, rocks and pillars count as blockers too
      for (const ob of (planFor.arena && planFor.arena.obstacles) || []) if (ob.x != null && ob.kind !== 'trunk') others.push({ x: ob.x, y: ob.y, key: '_ob', r: ob.r || 0.5 });
      let best = 0, bs = Infinity;
      for (const d of [0, 0.3, -0.3, 0.55, -0.55, 0.8, -0.8]) {
        const cm = place(u.x, u.y, Math.PI / 2 - u.facing - d, sc, GROUND_PITCH, 0.5, 0.88);
        const sc2 = clutter(cm, u, others, V.H) + Math.abs(d) * 0.8;
        if (sc2 < bs) { bs = sc2; best = d; }
      }
      return best;
    }
    // The enemy pan looks from the heroes' side; swing wide enough that the
    // heroes stay out of frame.
    function foeAngle(p, cx, cy, th) {
      let best = 0.42, bs = Infinity;
      for (const d of [0.42, -0.42, 0.7, -0.7, 1.0, -1.0, 1.3, -1.3]) {
        const cm = place(cx, cy, Math.PI / 2 - th - d, Math.min(V.W, V.H) / 6, 0.34, 0.5, 0.8);
        const sc2 = clutter(cm, null, p.heroes, V.H) + Math.abs(d) * 0.5;
        if (sc2 < bs) { bs = sc2; best = d; }
      }
      return best;
    }

    let lastShot = null;
    function cut(id) { if (lastShot !== id) { lastShot = id; V.cutSnap = true; } }

    function cameraFor(s, show) {
      if (!show || show.t >= T.end) { lastShot = null; return null; }
      const p = sync(s), t = show.t, W = V.W, H = V.H, m = Math.min(W, H);
      if (t < D.establish) {
        cut('est');
        return { zoom: 0.85 + t * 0.12, angOff: 0.5 - t * 0.3 };
      }
      const b = beatAt(p, t);
      if (b) {
        cut('hero' + b.i);
        const u = b.u, k = (t - b.t0) / (b.t1 - b.t0), f = u.facing;
        const hgt = heightOf(u);
        // Size: the fighter stands about 55 % of the screen tall.
        let sc = Math.min(m / 3.0, H * 0.6 / (hgt * 0.9));
        if (b.kind === 'guest') sc *= 0.85;
        // delta: where the camera stands relative to the facing (negative:
        // the fighter faces screen-left, toward the lettering).
        // The base angle is picked once per beat so nobody stands in the way.
        // Ground level, face to face (the author, 2026-10-22): the camera stands at eye height
        // in front of the fighter, who faces us; a slow push in, a punch-in on the hit.
        if (b.base == null) b.base = frontAngle(p, b, sc);
        const side = b.kind === 'lead' ? 0 : (b.i % 2 ? 0.22 : -0.22);
        const delta = b.base + side * (1 - 0.5 * smooth(k));
        let zoom = 0.9 + 0.16 * easeOut(k * 1.2);
        const hk = (t - b.hit) / 0.18;
        if (hk >= 0 && hk < 1) zoom *= 1 + 0.06 * (1 - hk);
        const cm = place(u.x, u.y, Math.PI / 2 - f - delta, sc * zoom, GROUND_PITCH, b.kind === 'lead' ? 0.5 : 0.56, 0.88);
        cm.ground = true; cm.subject = u.id;
        return cm;
      }
      if (t < T.foesEnd && p.foes.length) {
        cut('foes');
        const k = (t - T.heroesEnd) / (T.foesEnd - T.heroesEnd);
        // Look at the enemies from the heroes' side, a little off-axis.
        let cx = 0, cy = 0, hx = 0, hy = 0;
        for (const u of p.foes) { cx += u.x; cy += u.y; }
        cx /= p.foes.length; cy /= p.foes.length;
        if (p.heroes.length) { for (const u of p.heroes) { hx += u.x; hy += u.y; } hx /= p.heroes.length; hy /= p.heroes.length; } else { hx = cx - 6; hy = cy; }
        const th = Math.atan2(hy - cy, hx - cx);
        if (p.foeSide == null) p.foeSide = foeAngle(p, cx, cy, th);
        const ang = Math.PI / 2 - th - p.foeSide * 0.45 * (1 - 0.3 * smooth(k));
        const c = Math.cos(ang), sn = Math.sin(ang);
        let span = 1.2, tall = 1.8;
        for (const u of p.foes) { span = Math.max(span, Math.abs((u.x - cx) * c - (u.y - cy) * sn) + u.r); tall = Math.max(tall, heightOf(u)); }
        const fit = Math.max(m / 13, Math.min(W / (span * 2 + 3.2), H * 0.56 / (tall * 0.9), m / 2.8));
        // A pan along the line from one end, pulling back to show them all;
        // a lone enemy gets a slow push-in instead.
        const one = p.foes.length === 1;
        const lat = one ? 0.6 * (1 - smooth(k)) : span * (0.75 - 0.75 * smooth(k * 1.15));
        const zoom = one ? 0.86 + 0.22 * easeOut(k) : 1.3 - 0.3 * smooth(k * 1.15);
        const cm = place(cx + c * lat, cy - sn * lat, ang, fit * zoom, GROUND_PITCH, 0.5, 0.86);
        cm.ground = true;
        return cm;
      }
      return null;
    }

    // ---------------------------------------------------------- drawing helpers
    function lettering(text, x, y, fs, fill, align, skew) {
      ctx.save();
      ctx.translate(x, y);
      ctx.transform(1, 0, skew == null ? -0.2 : skew, 1, 0, 0);
      ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = `${fs}px Adventurer, ${FONT.display}`;
      ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.16; ctx.strokeStyle = INK;
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = fill; ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    // Shrink a display size so the lettering fits in maxW.
    function fitSize(text, fs, maxW) {
      ctx.font = `${fs}px Adventurer, ${FONT.display}`;
      const w = ctx.measureText(text).width * 1.05;
      return w > maxW ? Math.floor(fs * maxW / w) : fs;
    }
    function smallCaps(text, x, y, fs, fill, align) {
      ctx.save();
      ctx.font = `800 ${fs}px ${FONT.ui}`;
      ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = Math.max(3, fs * 0.3); ctx.strokeStyle = INK; ctx.lineJoin = 'round';
      ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y);
      ctx.restore();
    }

    // Manhwa speech balloon pointing at a spot on screen.
    // A spoken line as a subtitle in the lower third (no speech bubbles).
    function balloon(text, tx, ty, side, a) {
      const W = V.W, H = V.H;
      const fs = Math.round(Math.min(W, H) * 0.04);
      ctx.save();
      ctx.globalAlpha = a == null ? 1 : Math.max(0, Math.min(1, a));
      ctx.font = `italic 600 ${fs}px ${FONT.ui}`;
      const tw = ctx.measureText(text).width, y = H * 0.86;
      const g = ctx.createLinearGradient(W / 2 - tw, 0, W / 2 + tw, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(W / 2 - tw, y - fs * 1.1, tw * 2, fs * 2.2);
      ctx.fillStyle = '#f3ead6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
      ctx.fillText(text, W / 2, y);
      ctx.restore();
    }

    // A ring of glyph light lying on the ground (or standing, if `up`).
    function glyphRing(x, y, z, r, rot, a, up, F) {
      const P = V.P, pts = (rr, n, off) => {
        const out = [];
        for (let i = 0; i <= n; i++) {
          const q = (i / n) * Math.PI * 2 + off;
          if (up) out.push(P(x + (-F[1] * Math.cos(q)) * rr, y + (F[0] * Math.cos(q)) * rr, z + Math.sin(q) * rr));
          else out.push(P(x + Math.cos(q) * rr, y + Math.sin(q) * rr, z));
        }
        return out;
      };
      const line = (ps) => { ctx.beginPath(); ps.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); };
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const w = Math.max(1.2, V.cam.sc * 0.022);
      for (const [col, lw, al] of [[`rgba(${GLYPH},`, w * 3.5, 0.25], [`rgba(${GLYPH},`, w * 1.6, 0.8], ['rgba(239,232,255,', w * 0.6, 0.95]]) {
        ctx.strokeStyle = col + (al * a).toFixed(3) + ')'; ctx.lineWidth = lw;
        line(pts(r, 48, rot)); ctx.stroke();
        line(pts(r * 0.8, 48, -rot)); ctx.stroke();
        // ticks between the rings and a six-point star inside
        ctx.beginPath();
        for (let i = 0; i < 18; i++) {
          const q = (i / 18) * Math.PI * 2 + rot;
          const p0 = up ? P(x - F[1] * Math.cos(q) * r * 0.82, y + F[0] * Math.cos(q) * r * 0.82, z + Math.sin(q) * r * 0.82) : P(x + Math.cos(q) * r * 0.82, y + Math.sin(q) * r * 0.82, z);
          const p1 = up ? P(x - F[1] * Math.cos(q) * r * 0.97, y + F[0] * Math.cos(q) * r * 0.97, z + Math.sin(q) * r * 0.97) : P(x + Math.cos(q) * r * 0.97, y + Math.sin(q) * r * 0.97, z);
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
        }
        ctx.stroke();
        const star = pts(r * 0.78, 6, -rot * 0.5);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a0 = star[i], a1 = star[(i + 2) % 6]; ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); }
        ctx.stroke();
      }
      ctx.restore();
    }

    // Crimson ink-smoke wisps rising off a fighter.
    function wisps(u, a, t) {
      const P = V.P, sc = V.cam.sc, h = heightOf(u);
      ctx.save();
      for (let i = 0; i < 7; i++) {
        const ph = t * 2.6 + i * 1.3;
        const base = P(u.x + Math.cos(i * 2.1) * 0.35, u.y + Math.sin(i * 2.1) * 0.35, 0.15);
        const top = P(u.x + Math.cos(i * 2.1) * 0.55 + Math.sin(ph) * 0.3, u.y + Math.sin(i * 2.1) * 0.55, h * (0.9 + ((t * 0.9 + i * 0.3) % 1) * 0.8));
        const mx = (base.x + top.x) / 2 + Math.sin(ph * 1.3) * sc * 0.3, my = (base.y + top.y) / 2;
        const w = sc * 0.1;
        ctx.globalAlpha = a * (i % 2 ? 0.7 : 0.55);
        ctx.fillStyle = i % 2 ? '#8e1621' : '#e3263a';
        ctx.beginPath();
        ctx.moveTo(base.x - w, base.y);
        ctx.quadraticCurveTo(mx - w * 1.4, my, top.x, top.y);
        ctx.quadraticCurveTo(mx + w * 0.6, my, base.x + w, base.y);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // The blade's arc through the flourish: an ink crescent with a white core.
    function crescent(u, from, to, a, col) {
      const P = V.P, f = u.facing, r = 1.45, z = 1.05, N = 20, outer = [], inner = [];
      for (let i = 0; i <= N; i++) {
        const k = i / N, aa = f + from + (to - from) * k, th = Math.sin(k * Math.PI) * 0.34 + 0.02;
        outer.push(P(u.x + Math.cos(aa) * r, u.y + Math.sin(aa) * r, z + 0.05));
        inner.push(P(u.x + Math.cos(aa) * r * (1 - th), u.y + Math.sin(aa) * r * (1 - th), z));
      }
      const path = () => { ctx.beginPath(); ctx.moveTo(outer[0].x, outer[0].y); for (const q of outer) ctx.lineTo(q.x, q.y); for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y); ctx.closePath(); };
      ctx.save();
      ctx.globalAlpha = a; ctx.lineJoin = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, V.cam.sc * 0.05); path(); ctx.stroke();
      ctx.fillStyle = col; path(); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, V.cam.sc * 0.04);
      ctx.beginPath(); outer.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
      ctx.restore();
    }

    // Jagged ground cracks from a slam.
    function cracks(x, y, a, seed) {
      const P = V.P;
      ctx.save();
      ctx.strokeStyle = `rgba(12,8,8,${a})`; ctx.lineWidth = Math.max(2, V.cam.sc * 0.035); ctx.lineJoin = 'miter';
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        let q = (i / 7) * Math.PI * 2 + seed, px = x, py = y;
        const p0 = P(px, py, 0.01); ctx.moveTo(p0.x, p0.y);
        for (let j = 0; j < 4; j++) {
          q += Math.sin(i * 7.1 + j * 3.3) * 0.5; const l = 0.35 + ((i * 3 + j) % 4) * 0.12;
          px += Math.cos(q) * l; py += Math.sin(q) * l;
          const p = P(px, py, 0.01); ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // Pressure: a ring of bent air, a bright hairline over a dark one (a
    // lens, not a light). Lying on the ground, or standing across F if `up`.
    function pressureRing(x, y, z, r, a, up, F) {
      if (a <= 0) return;
      const P = V.P, n = 40, pts = (rr) => {
        const out = [];
        for (let i = 0; i <= n; i++) {
          const q = (i / n) * Math.PI * 2, w = 1 + 0.04 * Math.sin(q * 5 + V.time * 6);
          if (up) out.push(P(x - F[1] * Math.cos(q) * rr * w, y + F[0] * Math.cos(q) * rr * w, z + Math.sin(q) * rr * w));
          else out.push(P(x + Math.cos(q) * rr * w, y + Math.sin(q) * rr * w, z));
        }
        return out;
      };
      const line = (ps, ox, oy) => { ctx.beginPath(); ps.forEach((q, i) => (i ? ctx.lineTo(q.x + ox, q.y + oy) : ctx.moveTo(q.x + ox, q.y + oy))); };
      ctx.save(); ctx.lineJoin = 'round';
      const w = Math.max(1.2, V.cam.sc * 0.03);
      const ps = pts(r);
      ctx.strokeStyle = `rgba(10,8,14,${(0.55 * a).toFixed(3)})`; ctx.lineWidth = w * 1.6; line(ps, 2, 3); ctx.stroke();
      ctx.strokeStyle = `rgba(238,244,252,${(0.85 * a).toFixed(3)})`; ctx.lineWidth = w; line(ps, 0, 0); ctx.stroke();
      ctx.strokeStyle = `rgba(238,244,252,${(0.3 * a).toFixed(3)})`; ctx.lineWidth = w * 3; line(pts(r * 0.9), 0, 0); ctx.stroke();
      ctx.restore();
    }

    // A spear of light along F at height z: length grows; sparks gather to it.
    function lightSpear(x, y, z, F, len, a, lt) {
      const P = V.P, sc = V.cam.sc;
      const p0 = P(x - F[0] * len * 0.45, y - F[1] * len * 0.45, z), p1 = P(x + F[0] * len * 0.55, y + F[1] * len * 0.55, z);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const [wd, col] of [[sc * 0.3, `rgba(255,220,150,${0.18 * a})`], [sc * 0.12, `rgba(255,232,170,${0.6 * a})`], [Math.max(1.5, sc * 0.04), `rgba(255,255,255,${a})`]]) {
        ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      }
      // the point: a long diamond
      const dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
      ctx.fillStyle = `rgba(255,250,235,${a})`;
      ctx.beginPath(); ctx.moveTo(p1.x + ux * sc * 0.35, p1.y + uy * sc * 0.35); ctx.lineTo(p1.x - uy * sc * 0.09, p1.y + ux * sc * 0.09); ctx.lineTo(p1.x - ux * sc * 0.15, p1.y - uy * sc * 0.15); ctx.lineTo(p1.x + uy * sc * 0.09, p1.y - ux * sc * 0.09); ctx.closePath(); ctx.fill();
      // motes drawn in toward the shaft
      ctx.fillStyle = `rgba(255,236,190,${0.9 * a})`;
      for (let i = 0; i < 10; i++) {
        const ph = (lt * 1.6 + i * 0.1) % 1, k = (i * 0.37) % 1;
        const bx = p0.x + dx * k, by = p0.y + dy * k, off = (1 - ph) * sc * (0.6 + (i % 3) * 0.3), ang = i * 2.4;
        ctx.fillRect(bx + Math.cos(ang) * off - 1.5, by + Math.sin(ang) * off - 1.5, 3, 3);
      }
      ctx.restore();
    }

    // Blue-violet pressure flickering round a fighter in a held instant.
    function flickerRing(u, a) {
      if (a <= 0) return;
      const P = V.P, sc = Math.min(V.cam.sc, 80), h = heightOf(u), step = Math.floor(V.time * 30);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'miter';
      for (let i = 0; i < 12; i++) {
        const sd = (step * 7 + i * 11) % 23, ang = (i / 12) * Math.PI * 2 + sd * 0.05, r = 0.55 + (sd % 4) * 0.1;
        const q = P(u.x + Math.cos(ang) * r, u.y + Math.sin(ang) * r * 0.8, h * (0.2 + (sd % 7) / 8));
        const l = sc * (0.15 + (sd % 3) * 0.08);
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + l * 0.4, q.y - l * 0.5); ctx.lineTo(q.x + l * 0.1, q.y - l * 0.6); ctx.lineTo(q.x + l * 0.6, q.y - l * 1.1);
        ctx.strokeStyle = `rgba(143,123,255,${0.45 * a})`; ctx.lineWidth = Math.max(2.5, sc * 0.06); ctx.stroke();
        ctx.strokeStyle = `rgba(240,236,255,${0.9 * a})`; ctx.lineWidth = Math.max(1, sc * 0.018); ctx.stroke();
      }
      ctx.restore();
    }

    // Eloryn's healing: light pooling in the hands (pre), then a bloom of
    // green-white petals on the ground and motes rising (e).
    function healBloom(u, F, pre, e) {
      const P = V.P, sc = V.cam.sc;
      const hand = P(u.x + F[0] * 0.6, u.y + F[1] * 0.6, 1.45);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const r = sc * (0.15 + 0.35 * pre) * (1 - e * 0.6);
      const g = ctx.createRadialGradient(hand.x, hand.y, 0, hand.x, hand.y, r * 2);
      g.addColorStop(0, `rgba(240,255,244,${0.9 * (1 - e)})`); g.addColorStop(0.4, `rgba(168,240,192,${0.5 * (1 - e)})`); g.addColorStop(1, 'rgba(120,230,160,0)');
      ctx.fillStyle = g; ctx.fillRect(hand.x - r * 2, hand.y - r * 2, r * 4, r * 4);
      if (e > 0) {
        const c = P(u.x, u.y, 0.02), R = sc * (0.6 + 2.2 * easeOut(e)), a = 1 - e;
        ctx.strokeStyle = `rgba(168,240,192,${0.8 * a})`; ctx.lineWidth = Math.max(1.5, sc * 0.05 * a);
        ctx.beginPath(); ctx.ellipse(c.x, c.y, R, R * V.cam.pitch, 0, 0, Math.PI * 2); ctx.stroke();
        // petals
        ctx.fillStyle = `rgba(200,250,215,${0.35 * a})`;
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 + e * 0.6, tip = { x: c.x + Math.cos(ang) * R * 0.85, y: c.y + Math.sin(ang) * R * 0.85 * V.cam.pitch };
          const sx = -Math.sin(ang) * R * 0.14, sy = Math.cos(ang) * R * 0.14 * V.cam.pitch;
          ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.quadraticCurveTo((c.x + tip.x) / 2 + sx, (c.y + tip.y) / 2 + sy, tip.x, tip.y); ctx.quadraticCurveTo((c.x + tip.x) / 2 - sx, (c.y + tip.y) / 2 - sy, c.x, c.y); ctx.fill();
        }
        ctx.fillStyle = `rgba(230,255,236,${0.9 * a})`;
        for (let i = 0; i < 14; i++) {
          const ang = i * 2.4, d = 0.3 + (i % 5) * 0.25, q = P(u.x + Math.cos(ang) * d, u.y + Math.sin(ang) * d, 0.2 + e * (1 + (i % 4) * 0.5));
          ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
        }
      }
      ctx.restore();
    }

    // One-shot world events (blinks, dust) fed to fx.js without touching the sim.
    function fire(p, key, t, at, events) {
      if (p.fired.has(key) || t < at) return;
      p.fired.add(key);
      if (t - at > 0.3 || !fx) return; // skipped past it
      fx.consume({ fx: events, byId: planFor.byId });
    }

    // ---------------------------------------------------------- hero beat
    function drawBeat(s, p, b, t, dt) {
      const W = V.W, H = V.H, m = Math.min(W, H), u = b.u, d = u.def;
      const lt = t - b.t0, dur = b.t1 - b.t0, k = lt / dur, since = t - b.hit;
      const F = [Math.cos(u.facing), Math.sin(u.facing)], Rt = [-F[1], F[0]];
      const head = V.P(u.x, u.y, heightOf(u) * 0.95), chest = V.P(u.x, u.y, heightOf(u) * 0.6);
      const L = lookOf(u);
      const heroCol = PAL.hero;

      // Left-side shade so the lettering reads.
      const g = ctx.createLinearGradient(0, 0, W * 0.6, 0);
      g.addColorStop(0, 'rgba(8,5,6,0.72)'); g.addColorStop(1, 'rgba(8,5,6,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W * 0.6, H);

      // The signature beat.
      const key = u.key;
      if (key === 'ren') {
        const pts = [[-3.2, 2.4], [2.8, 2.0], [-1.6, -2.6]];
        pts.forEach((o, i) => {
          const at = b.t0 + dur * (0.06 + i * 0.12);
          fire(p, 'blink' + b.i + '-' + i, t, at, [{ type: 'blink', unit: u.id, x0: u.x + F[0] * o[0] + Rt[0] * o[1], y0: u.y + F[1] * o[0] + Rt[1] * o[1], x1: u.x, y1: u.y }]);
        });
      } else if (key === 'mara' || key === 'eiryn') {
        const grow = easeOut(lt / (b.hit - b.t0 + 0.05));
        const flare = since > 0 ? Math.max(0, 1 - since / 0.4) : 0;
        const r = (key === 'eiryn' ? 0.8 : 1.05) * grow + flare * 0.2;
        glyphRing(u.x, u.y, 0.02, r, V.time * 1.4, (key === 'eiryn' ? 0.5 : 0.7) + flare * 0.5, false, F);
        if (flare > 0 && key === 'mara') {
          // a column of violet light off the circle
          const a0 = V.P(u.x, u.y, 0), a1 = V.P(u.x, u.y, 3.4), hw = V.cam.sc * 1.2 * flare;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const gg = ctx.createLinearGradient(0, a0.y, 0, a1.y);
          gg.addColorStop(0, `rgba(${GLYPH},${0.45 * flare})`); gg.addColorStop(1, `rgba(${GLYPH},0)`);
          ctx.fillStyle = gg; ctx.fillRect(a0.x - hw, a1.y, hw * 2, a0.y - a1.y);
          ctx.restore();
        }
      } else if (key === 'eirynAsh') {
        // Pressure: the air folds into her palm, then goes out as a ring
        // that bends everything it passes (no light, just the bend).
        const hand = [u.x + F[0] * 0.7, u.y + F[1] * 0.7];
        if (since < 0) {
          const pre = clamp01(lt / (b.hit - b.t0));
          for (let i = 0; i < 3; i++) { const ph = (lt * 2.4 + i / 3) % 1; pressureRing(hand[0], hand[1], 1.35, (1 - ph) * 0.9 * (0.4 + 0.6 * pre), ph * 0.8 * pre + 0.15, true, F); }
        } else if (since < 0.9) {
          const e = since / 0.9;
          pressureRing(hand[0] + F[0] * e * 4, hand[1] + F[1] * e * 4, 1.3, 0.4 + e * 1.6, 1 - e, true, F);
          pressureRing(u.x, u.y, 0.03, 0.5 + e * 4.5, (1 - e) * 0.9, false, F);
          pressureRing(u.x, u.y, 0.03, 0.3 + e * 3.0, (1 - e) * 0.6, false, F);
        }
      } else if (key === 'aerys') {
        // A spear of light gathers over her raised palm, then flares.
        const pre = clamp01(lt / (b.hit - b.t0)), fl = since > 0 ? Math.max(0, 1 - since / 0.6) : 0;
        const len = 2.3 * easeOut(pre), ahead = since > 0 ? easeOut(since / 0.25) * 0.6 : 0;
        const c = [u.x + F[0] * (0.15 + ahead) - Rt[0] * 0.15, u.y + F[1] * (0.15 + ahead) - Rt[1] * 0.15], z = 2.05;
        lightSpear(c[0], c[1], z, F, len, since > 0 ? 0.3 + fl * 0.7 : 0.35 + 0.65 * pre, lt);
      } else if (key === 'nox') {
        const pts = [[-2.8, 2.2], [2.4, -2.4], [-1.2, -2.8], [1.6, 2.6]];
        pts.forEach((o, i) => {
          const at = b.t0 + dur * (0.04 + i * 0.09);
          fire(p, 'nblink' + b.i + '-' + i, t, at, [{ type: 'blink', unit: u.id, x0: u.x + F[0] * o[0] + Rt[0] * o[1], y0: u.y + F[1] * o[0] + Rt[1] * o[1], x1: u.x, y1: u.y }]);
        });
        // a held instant: blue-violet pressure flickering round him
        if (since > -0.15 && since < 0.5) flickerRing(u, 1 - Math.abs(since - 0.15) / 0.4);
      } else if (key === 'eloryn') {
        // Healing light pooling in her hands, then opening like a flower.
        const pre = clamp01(lt / (b.hit - b.t0)), e = since > 0 ? clamp01(since / 0.8) : 0;
        healBloom(u, F, pre, e, lt);
      } else if (key === 'braxen') {
        const sx = u.x + F[0] * 0.75, sy = u.y + F[1] * 0.75;
        if (since > 0) {
          cracks(sx, sy, Math.max(0, 1 - since / 1.2) * 0.9, u.facing + 0.4);
          const e = clamp01(since / 0.5);
          if (e < 1) {
            const g0 = V.P(sx, sy, 0.02), rr = V.cam.sc * (0.4 + e * 3.2);
            ctx.save(); ctx.strokeStyle = `rgba(246,240,236,${0.85 * (1 - e)})`; ctx.lineWidth = Math.max(2, V.cam.sc * 0.08 * (1 - e));
            ctx.beginPath(); ctx.ellipse(g0.x, g0.y, rr, rr * V.cam.pitch, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
            // grit thrown up off the slam
            ctx.save(); ctx.fillStyle = `rgba(150,140,124,${0.8 * (1 - e)})`;
            for (let i = 0; i < 10; i++) { const a = i * 0.63 + 0.2, d = e * (0.6 + (i % 3) * 0.3), q = V.P(sx + Math.cos(a) * d, sy + Math.sin(a) * d, Math.sin(e * Math.PI) * (0.4 + (i % 4) * 0.2)); ctx.fillRect(q.x - 2, q.y - 2, 4 + (i % 2) * 2, 4); }
            ctx.restore();
          }
        }
      } else if (key === 'eirynMage' || L.weapon === 'glyph') {
        const grow = easeOut(lt / (b.hit - b.t0 + 0.05));
        const flare = since > 0 ? Math.max(0, 1 - since / 0.45) : 0;
        const c = [u.x + F[0] * 0.8 - Rt[0] * 0.25, u.y + F[1] * 0.8 - Rt[1] * 0.25];
        glyphRing(c[0], c[1], 1.15, 0.36 * grow + flare * 0.1, -V.time * 2, 0.75 + flare * 0.5, true, F);
        if (since > 0 && since < 0.5) glyphRing(c[0] + F[0] * since * 3, c[1] + F[1] * since * 3, 1.2, 0.6 + since * 1.6, V.time, (1 - since / 0.5) * 0.8, true, F);
      } else if (key === 'brannoc') {
        const sx = u.x + F[0] * 0.55, sy = u.y + F[1] * 0.55;
        fire(p, 'slam' + b.i, t, b.hit, [{ type: 'ko', x: sx, y: sy }, { type: 'ko', x: sx + Rt[0] * 0.4, y: sy + Rt[1] * 0.4 }]);
        if (since > 0) cracks(sx, sy, Math.max(0, 1 - since / 1.2) * 0.85, u.facing);
      } else if (key === 'climber') {
        wisps(u, 0.35 + 0.65 * smooth(lt / (b.hit - b.t0)), V.time);
        if (since > 0 && since < 0.5) {
          const g0 = V.P(u.x, u.y, 0.02), rr = V.cam.sc * (0.6 + since * 5);
          ctx.save(); ctx.strokeStyle = `rgba(227,38,58,${1 - since / 0.5})`; ctx.lineWidth = Math.max(2, V.cam.sc * 0.06);
          ctx.beginPath(); ctx.ellipse(g0.x, g0.y, rr, rr * V.cam.pitch, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
      } else if (L.weapon !== 'bow') {
        // Sword (and the rest): the flourish leaves an arc.
        const h = (b.hit - b.t0) / dur, sw = (k - (h - 0.12)) / 0.14;
        if (sw > 0 && sw < 1.6) crescent(u, 2.4, 2.4 - 4.1 * Math.min(1, sw), sw > 1 ? 1 - (sw - 1) / 0.6 : 1, heroCol);
      }

      // Impact frame on the hit: speed lines, a flash, a shake.
      if (since >= 0 && since < 0.4 && b.kind !== 'guest') {
        const a = 1 - since / 0.4;
        if (fx) fx.speedLines(chest.x, chest.y, 56, m * 0.28, W * 1.2, key === 'climber' ? `rgba(227,38,58,${0.35 * a})` : `rgba(246,240,236,${0.3 * a})`, b.i);
        const sig = { climber: '#ff9aa6', mara: '#d6c8ff', eirynMage: '#d6c8ff', eirynAsh: '#eef2f8', aerys: '#ffe7a8', nox: '#c4b8ff', eloryn: '#c8f8d6' }[key] || PAL.heroGlow;
        if (fx) fx.star(chest.x + F[0], chest.y - m * 0.05, m * 0.16 * a, sig, 3.2, 0.2);
        if (since < 0.06) {
          ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, 0, W, H); ctx.restore();
        }
        if (!p.fired.has('shake' + b.i)) { p.fired.add('shake' + b.i); V.cam.shake = Math.max(V.cam.shake, key === 'brannoc' || key === 'braxen' ? 16 : 9); }
      }

      // Lettering: epithet, name, a slash under it.
      const ink = easeOut((lt - 0.05) / 0.22);
      const fs = Math.round(m * (b.kind === 'lead' ? 0.15 : b.kind === 'guest' ? 0.1 : 0.13));
      const nx = W * 0.05 - (1 - ink) * W * 0.4, ny = H * 0.66;
      if (ink > 0) {
        smallCaps(((d.intro && d.intro.epithet) || '').toUpperCase(), nx + fs * 0.1, ny - fs * 0.95, Math.round(fs * 0.24), u.guest ? PAL.guest : heroCol);
        lettering(u.name.toUpperCase(), nx, ny, fitSize(u.name.toUpperCase(), fs, W * 0.5), PAL.white, 'left');
        ctx.save();
        ctx.fillStyle = u.guest ? PAL.guest : heroCol;
        const lw = W * 0.42 * ink;
        ctx.beginPath(); ctx.moveTo(nx, ny + fs * 0.2); ctx.lineTo(nx + lw, ny + fs * 0.12); ctx.lineTo(nx + lw - fs * 0.3, ny + fs * 0.26); ctx.lineTo(nx, ny + fs * 0.3); ctx.closePath();
        ctx.fill(); ctx.restore();
        if (b.kind === 'guest') smallCaps('GUEST', nx + fs * 0.1, ny + fs * 0.75, Math.round(fs * 0.22), PAL.bone);
      }
      // Their line, from the book, once the pose has landed.
      if (d.intro && d.intro.line && t > b.hit + 0.08) balloon('“' + d.intro.line + '”', head.x, head.y, -1, easeOut((t - b.hit - 0.08) / 0.1));
    }

    // ---------------------------------------------------------- enemy pan
    function drawFoes(s, p, t) {
      const W = V.W, H = V.H, m = Math.min(W, H);
      const k = (t - T.heroesEnd) / (T.foesEnd - T.heroesEnd);
      // Red grade and vignette.
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(200,120,125,1)'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      const g = ctx.createRadialGradient(W / 2, H * 0.55, m * 0.35, W / 2, H * 0.55, W * 0.75);
      g.addColorStop(0, 'rgba(67,23,27,0)'); g.addColorStop(1, 'rgba(67,23,27,0.85)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // Horizontal streaks that sell the pan.
      ctx.save();
      ctx.globalAlpha = 0.5 * (1 - k);
      ctx.fillStyle = 'rgba(227,38,58,0.6)';
      for (let i = 0; i < 9; i++) {
        const y = H * ((i * 0.137 + 0.08) % 1), x = ((i * 0.31 + k * 2.2) % 1.4 - 0.2) * W;
        ctx.fillRect(x, y, W * (0.2 + (i % 3) * 0.1), 1.5 + (i % 2));
      }
      ctx.restore();
      // Title slam.
      const ink = easeOut((k - 0.15) / 0.12);
      if (ink > 0) {
        const fs = Math.round(m * (p.boss ? 0.19 : 0.16) * (1.25 - 0.25 * ink));
        const y = H * 0.82;
        ctx.save();
        ctx.globalAlpha = ink;
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.moveTo(W * 0.38, y - fs * 1.05); ctx.lineTo(W, y - fs * 1.2); ctx.lineTo(W, y + fs * 0.55); ctx.lineTo(W * 0.42, y + fs * 0.45); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = PAL.glow; ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
        lettering(p.title, W * 0.95, y, fs, PAL.glow, 'right');
        if (p.sub) smallCaps(p.sub.toUpperCase(), W * 0.95, y + fs * 0.38, Math.round(m * 0.034), PAL.bone, 'right');
      }
      // Each enemy's name over their head.
      p.foes.forEach((u, i) => {
        const h = heightOf(u), a = clamp01((k - 0.12 - i * 0.07) / 0.15);
        const head = V.P(u.x, u.y, h * 1.08);
        if (head.y > H * 0.62) return;
        if (a > 0) {
          const fsn = Math.round(m * 0.036);
          smallCaps(u.name.toUpperCase(), head.x, head.y - 4, fsn, PAL.bone, 'center');
          ctx.save(); ctx.fillStyle = PAL.glow; ctx.globalAlpha = a;
          ctx.beginPath(); ctx.moveTo(head.x - fsn * 0.4, head.y + fsn * 0.15); ctx.lineTo(head.x + fsn * 0.4, head.y + fsn * 0.15); ctx.lineTo(head.x, head.y + fsn * 0.7); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      });
    }

    // ---------------------------------------------------------- frame
    function draw(s, show, dt) {
      if (!show || show.t >= T.end) return;
      fx = fx || V.fxApi;
      const W = V.W, H = V.H, t = show.t, m = Math.min(W, H);
      const p = sync(s);
      // Letterbox throughout the face-off.
      const lb = H * 0.07 * Math.min(1, t / 0.3) * (t < T.vsEnd ? 1 : Math.max(0, 1 - (t - T.vsEnd) / 0.3));
      if (t < D.establish) {
        const a = easeOut(t / 0.3), x = W * 0.06 - (1 - a) * W * 0.3;
        lettering((s.chapter || '').toUpperCase(), x, H * 0.76, Math.round(m * 0.06), PAL.bone, 'left');
        lettering(s.title || '', x, H * 0.76 + m * 0.12, Math.round(m * 0.11), PAL.white, 'left');
      }
      const b = beatAt(p, t);
      if (b) drawBeat(s, p, b, t, dt);
      else if (t >= T.heroesEnd && t < T.foesEnd) drawFoes(s, p, t);
      else if (t >= T.foesEnd && t < T.vsEnd) {
        // VS: split screen, the lead against the opposing boss.
        const k = Math.min(1, (t - T.foesEnd) / 0.15);
        ctx.fillStyle = 'rgba(8,5,6,0.9)'; ctx.fillRect(0, 0, W, H);
        const [lu, bu] = (s.vs || []).map((id) => s.byId[id]);
        if (fx && lu && bu) {
          const off = (1 - k) * W * 0.8, sl = H * 0.05;
          fx.portrait(lu, [[W * 0.02 - off, H * 0.1 + sl], [W * 0.9 - off, H * 0.08], [W * 0.88 - off, H * 0.42 - sl], [-off, H * 0.44]], t - T.foesEnd + 0.3);
          fx.portrait(bu, [[W * 0.1 + off, H * 0.58], [W + off, H * 0.56 + sl], [W * 0.98 + off, H * 0.9], [W * 0.12 + off, H * 0.92 - sl]], t - T.foesEnd + 0.3);
        }
        const fs = Math.round(m * 0.28 * (1.4 - 0.4 * k));
        lettering('VS', W / 2, H / 2 + fs * 0.35, fs, PAL.glow, 'center', -0.15);
        const ns = Math.round(m * 0.08);
        if (lu) lettering(lu.name.toUpperCase(), W * 0.88, H * 0.42 - ns * 0.1, ns, PAL.white, 'right');
        if (bu) lettering(bu.name.toUpperCase(), W * 0.14, H * 0.58 + ns * 0.95, ns, PAL.white, 'left');
      } else if (t >= T.vsEnd) {
        const i = Math.floor((t - T.vsEnd) / T.count);
        const label = ['3', '2', '1', 'FIGHT!'][Math.min(3, i)];
        const local = Math.min(1, ((t - T.vsEnd) - Math.min(3, i) * T.count) / T.count);
        const fight = label === 'FIGHT!';
        const punch = 1.5 - 0.5 * Math.min(1, local * 6);
        const fade = fight ? Math.max(0, 1 - (t - T.fight) / (T.end - T.fight)) : 1;
        const fs = Math.round(m * (fight ? 0.24 : 0.36) * punch);
        ctx.save();
        ctx.globalAlpha = fade;
        // A slanted black band behind the number, with speed lines.
        const bh = m * (fight ? 0.34 : 0.42);
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
