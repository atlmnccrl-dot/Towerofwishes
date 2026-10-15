/*
 * Tower of Wishes — fighters layer: cel-shaded anime figures.
 *
 * API (called by core.js):
 *   update(s, dt)       hair and cloth springs
 *   drawUnit(u, s)      draw one fighter at its depth slot
 *   LOOK                per-character appearance table
 *
 * Each figure is a 3D skeleton (metres) projected through V.P, then drawn
 * as tapered shapes in three passes per layer: ink outline, flat base
 * colour, hard-edged shadow on the side away from the light, then a thin
 * rim light. Detail (faces, hair strands) scales with zoom.
 *
 * Canon from the manuscript: Eiryn's long silver-white hair, dark travel-worn
 * outfit with green at the collar; Kael's armour with a shoulder plate and his
 * sword; the broad man's fists; the third man unarmed; the ogre's stone-coloured
 * skin, stoop and the beam from the loading frame. Everything else here is a
 * placeholder design (Proposal; see docs/ART_DIRECTION.md).
 *
 * Appearance is data-driven: a LOOK entry lists features (coat, cape, plate,
 * beard, ears, glyph hands, shield…) and the drawing code reads the features,
 * never the unit key. A key without a LOOK entry falls back to a plain figure.
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  const INK = '#0c0808';
  const GLYPH = '#a98bff';
  // tone = [base, shadow]
  const LOOK = {
    kael: {
      h: 1.0, w: 1.0, build: 1.0, weapon: 'sword', hair: 'spiky',
      skin: ['#e9c6b0', '#a97f78'], hairC: ['#2b2327', '#141012'],
      body: ['#262a36', '#15171f'], legs: ['#1f2129', '#111217'], boots: ['#3a2d26', '#1d1613'],
      armor: ['#5b6772', '#2d343c'], accent: '#9cc3dd', coat: ['#2a2f3d', '#151820'], eye: '#9cc3dd',
      pauldron: 'L', chestV: true, strap: '#3a2d26',
    },
    eiryn: {
      h: 0.94, w: 0.86, build: 0.85, weapon: 'branch', hair: 'long',
      skin: ['#f4dccf', '#c29e98'], hairC: ['#f3eef2', '#a99abb'],
      body: ['#25222c', '#131118'], legs: ['#1d1a22', '#0f0d12'], boots: ['#3b2f2a', '#1c1513'],
      accent: '#4fae7a', skirt: ['#2a2631', '#141218'], eye: '#a98bff', collar: '#4fae7a',
    },
    // Eiryn with her mana partly back: same look, no branch, violet glyph hands.
    eirynMage: {
      h: 0.94, w: 0.86, build: 0.85, weapon: 'glyph', glyphHands: 'both', hair: 'long',
      skin: ['#f4dccf', '#c29e98'], hairC: ['#f3eef2', '#a99abb'],
      body: ['#25222c', '#131118'], legs: ['#1d1a22', '#0f0d12'], boots: ['#3b2f2a', '#1c1513'],
      accent: '#4fae7a', skirt: ['#2a2631', '#141218'], eye: '#a98bff', collar: '#4fae7a', glyph: GLYPH,
    },
    brute: {
      h: 1.12, w: 1.5, build: 1.45, weapon: 'fists', hair: 'bald',
      skin: ['#c3906f', '#7f5444'], hairC: ['#3a2a22', '#1c1410'],
      body: ['#4d3326', '#2a1b14'], legs: ['#2e2622', '#171310'], boots: ['#2a201b', '#140f0c'],
      wraps: ['#d9c8b4', '#8f7f70'], accent: '#8e1621', eye: '#e3263a', bareArms: true, sash: '#8e1621',
    },
    knife: {
      h: 0.98, w: 0.84, build: 0.82, weapon: 'knife', hair: 'messy',
      skin: ['#d8ab8c', '#94675a'], hairC: ['#171214', '#0a0708'],
      body: ['#3a2e2c', '#1d1616'], legs: ['#26201f', '#131010'], boots: ['#2a201c', '#140f0d'],
      scarf: ['#a3192a', '#5a0d17'], accent: '#e3263a', eye: '#e3263a',
    },
    grabber: {
      h: 1.0, w: 1.05, build: 1.05, weapon: 'fists', hair: 'hood',
      skin: ['#d2a283', '#8d6253'], hairC: ['#232019', '#100f0b'],
      body: ['#3e4635', '#20251b'], legs: ['#272820', '#131410'], boots: ['#2a221c', '#15110e'],
      hood: ['#353d2e', '#1a1e16'], accent: '#8e1621', eye: '#e3263a', belt: '#8e1621',
    },
    lookout: {
      h: 0.95, w: 0.9, build: 0.9, weapon: 'none', hair: 'short',
      skin: ['#d9b391', '#94705d'], hairC: ['#4a3426', '#22170f'],
      body: ['#4a4d52', '#26282b'], legs: ['#2d2c2c', '#161515'], boots: ['#2d241d', '#15110d'],
      accent: '#8e1621', eye: '#c9b6a6', belt: '#8e1621',
    },
    // ---- Proposals (placeholder designs for the author to approve).
    ren: {
      h: 0.98, w: 0.88, build: 0.84, weapon: 'twin', hair: 'messy',
      skin: ['#efd6cc', '#a98a88'], hairC: ['#1a1418', '#09070a'],
      body: ['#1d1416', '#0e0909'], legs: ['#181214', '#0b0809'], boots: ['#231a1a', '#100b0b'],
      coat: ['#5a1820', '#2c0a0f'], coatLen: 0.3, trim: '#8e1621', accent: '#e3263a', eye: '#e3263a',
      belt: '#3a2a26',
    },
    mara: {
      h: 0.95, w: 0.84, build: 0.8, weapon: 'glyph', glyphHands: 'L', hair: 'bob',
      skin: ['#f0d2c2', '#ae8a86'], hairC: ['#3d2b57', '#1d1430'],
      body: ['#1e1b26', '#0f0d14'], legs: ['#1a1820', '#0c0b10'], boots: ['#2a2230', '#140f18'],
      coat: ['#24202e', '#110f17'], coatLen: 0.05, coatW: 0.26, trim: GLYPH, accent: GLYPH, eye: GLYPH, glyph: GLYPH,
      belt: '#3a2f4a',
    },
    brannoc: {
      h: 0.8, w: 1.5, build: 1.42, headK: 1.28, weapon: 'hammer', off: 'shield', bash: true, hair: 'helm',
      skin: ['#e0b293', '#9a6c5a'], hairC: ['#a4502a', '#5e2a14'],
      body: ['#6c7782', '#363d45'], legs: ['#3a3430', '#1c1816'], boots: ['#4a3a2c', '#211912'],
      armor: ['#8792a0', '#3f4750'], sleeve: ['#5b6670', '#2e343a'], accent: '#9cc3dd', eye: '#9cc3dd',
      beard: ['#a4502a', '#5e2a14'], braids: true, pauldron: 'both', plate: true, belt: '#4a3a2c',
      shield: { r: 0.36, c: ['#5a3f2a', '#2e2015'], rimC: '#8792a0', boss: ['#c0c8d0', '#5b6772'] },
    },
    climber: {
      h: 1.05, w: 1.0, build: 0.98, weapon: 'greatsword', hair: 'hood', cowl: true,
      skin: ['#cfc6c4', '#6e6466'], hairC: ['#d8d3d4', '#7c7478'], hood: ['#d8d3d4', '#7c7478'],
      body: ['#2c2a30', '#151318'], legs: ['#232127', '#111014'], boots: ['#2a2328', '#131013'],
      cape: ['#c9c3c6', '#6f676c'], tatter: 7, trim: '#8e1621', accent: '#e3263a', eye: '#e3263a', glowEyes: 1,
      belt: '#8e1621',
    },
    shade: {
      h: 0.96, w: 0.92, build: 0.8, weapon: 'claws', hair: 'spiky', faceless: true, ghost: 0.88, wisp: true,
      cape: ['#1c1426', '#0a070e'], tatter: 9, capeLen: 0.22,
      skin: ['#1d1426', '#0b0710'], hairC: ['#231830', '#0d0812'], hood: ['#231830', '#0d0812'],
      body: ['#1c1424', '#0a070e'], legs: ['#170f1e', '#08050b'], boots: ['#120b18', '#060408'],
      accent: '#e3263a', eye: '#ff3a4c', glowEyes: 2, shards: ['#2a1d3a', '#0d0812'],
    },
    veil: {
      h: 1.8, w: 2.0, build: 2.0, form: 'veil', weapon: 'none', hair: 'hood',
      skin: ['#140c18', '#07050a'], hairC: ['#140c18', '#07050a'], hood: ['#140c18', '#07050a'],
      body: ['#140c18', '#07050a'], legs: ['#140c18', '#07050a'], boots: ['#140c18', '#07050a'],
      accent: '#e3263a', eye: '#ffffff',
    },
    goblin: {
      h: 0.7, w: 0.86, build: 0.8, headK: 1.4, weapon: 'knife', hair: 'bald', ears: true, hunch: 0.1,
      skin: ['#8a9670', '#525c42'], hairC: ['#2a2a1e', '#15150f'],
      body: ['#4f3f2e', '#2a2018'], legs: ['#3a3026', '#1e1813'], boots: ['#2e2419', '#17110c'],
      accent: '#8e1621', eye: '#f0c43a', belt: '#6b4c33', scraps: true,
    },
    goblinSpear: {
      h: 0.74, w: 0.9, build: 0.84, headK: 1.38, weapon: 'spear', hair: 'messy', ears: true, hunch: 0.08,
      skin: ['#7f8c6c', '#4b5440'], hairC: ['#1e1d16', '#0e0d0a'],
      body: ['#5a4632', '#2e2419'], legs: ['#3a3026', '#1e1813'], boots: ['#2e2419', '#17110c'],
      armor: ['#6b5a44', '#3a2f22'], pauldron: 'L', accent: '#8e1621', eye: '#f0c43a', sash: '#8e1621', scraps: true,
    },
    goblinArcher: {
      h: 0.7, w: 0.82, build: 0.78, headK: 1.4, weapon: 'bow', hair: 'hood', ears: true, hunch: 0.1,
      skin: ['#86926e', '#4f5940'], hairC: ['#3d3a2a', '#1d1b13'], hood: ['#3d3a2a', '#1d1b13'],
      body: ['#4a3e30', '#261f17'], legs: ['#352d24', '#1b1712'], boots: ['#2e2419', '#17110c'],
      accent: '#8e1621', eye: '#f0c43a', belt: '#6b4c33', quiver: true,
    },
    ogre: {
      h: 1.9, w: 2.1, build: 2.0, headK: 0.62, weapon: 'beam', hair: 'bald', stoop: 0.2, tusks: true,
      skin: ['#8f8a80', '#55514b'], hairC: ['#3a3530', '#1c1916'],
      body: ['#8f8a80', '#55514b'], legs: ['#7d786f', '#4a4640'], boots: ['#6e6a62', '#3f3c37'],
      skirt: ['#4d3a2a', '#271d15'], wraps: ['#5e4a38', '#2f251c'], bareArms: true, accent: '#8e1621', eye: '#e3263a',
      belt: '#3a2a1e', bareChest: true,
    },
  };
  const FALLBACK = LOOK.kael; // unknown keys draw as a plain swordsman
  const lookOf = (key) => LOOK[key] || FALLBACK;

  // Weapon geometry: len in metres; grip: 'one' | 'two' (off hand on the grip)
  // | 'shaft' (off hand forward on a spear shaft).
  const WEAPON = {
    sword: { len: 1.1 }, branch: { len: 1.05 }, knife: { len: 0.36 }, twin: { len: 0.5 },
    hammer: { len: 0.78 }, greatsword: { len: 1.35, grip: 'two' }, beam: { len: 2.3, grip: 'two' },
    spear: { len: 1.5, grip: 'shaft', thrust: true }, claws: { len: 0.3 },
  };

  // ------------------------------------------------------------------ pose
  // rel: weapon angle from facing; pitch: weapon elevation; lean; crouch;
  // off: off-hand mode; stance: foot spread multiplier.
  function pose(u, V) {
    const L = lookOf(u.key);
    const Wd = WEAPON[L.weapon];
    let rel = 0.75, pitch = 0.5, lean = 0, crouch = 0.03, off = 'guard', stance = 1, twist = 0;
    const a = u.act;
    const intro = V.introPhase;
    const caster = L.weapon === 'glyph' || L.weapon === 'bow';
    switch (u.state) {
      case 'attack':
        if (a.phase === 'windup' || a.phase === 'feint') {
          const k = a.phase === 'feint' ? 1 : Math.min(1, a.t / a.wind);
          const e = k * k * (3 - 2 * k);
          rel = 0.75 + e * 1.75; pitch = 0.5 + e * 0.6; lean = -0.16 * e; crouch = 0.03 + 0.1 * e; twist = -0.5 * e; stance = 1.3;
          if (L.bash) { rel = 1.4; pitch = 1.3; lean = -0.12 * e; twist = -0.3 * e; }
          if (caster) { lean = -0.06 * e; twist = -0.25 * e; off = 'cast'; }
        } else if (a.phase === 'strike') {
          const k = Math.min(1, a.t / Math.max(0.05, a.A.active));
          rel = 2.5 - k * 4.1; pitch = 0.15; lean = 0.32; crouch = 0.12; twist = 0.6; stance = 1.55;
          if (L.bash) { rel = 1.2; pitch = 1.2; lean = 0.36; twist = -0.2; }
          if (caster) { lean = 0.14; twist = 0.1; off = 'cast'; }
        } else {
          const k = Math.min(1, a.t / Math.max(0.05, a.A.recover));
          const e = 1 - Math.pow(1 - k, 2);
          rel = -1.6 + e * 2.35; pitch = 0.05 + e * 0.45; lean = 0.28 * (1 - e); crouch = 0.12 - 0.09 * e; twist = 0.6 * (1 - e); stance = 1.5 - 0.5 * e;
          if (L.bash) { rel = 1.2 - e * 0.45; pitch = 1.2 - e * 0.7; twist = 0; }
          if (caster) { lean = 0.1 * (1 - e); twist = 0; }
        }
        break;
      case 'parry': rel = 0.1; pitch = 1.1; lean = -0.06; crouch = 0.1; stance = 1.4; break;
      case 'dodge': lean = 0.35; crouch = 0.2; stance = 1.6; off = 'out'; break;
      case 'hurt': case 'stagger': rel = 1.8; pitch = -0.3; lean = -0.3; crouch = 0.05; off = 'flail'; break;
      case 'recover': rel = -0.7; pitch = 0.1; lean = 0.18; crouch = 0.08; break;
      case 'circle': rel = 0.6; pitch = 0.6; crouch = 0.1; stance = 1.3; break;
      case 'opener': lean = 0.38; crouch = 0.14; stance = 1.5; rel = 1.6; pitch = 0.2; off = 'back'; break;
      case 'distracted': twist = 1.1; rel = 0.4; pitch = 0.3; break;
      case 'cast': off = 'cast'; lean = 0.1; crouch = 0.05; stance = 1.2; break;
      case 'pickup': crouch = 0.32; lean = 0.25; off = 'down'; break;
    }
    if (u.fleeing || u.beaten) { rel = 2.9; pitch = 1.2; lean = 0.32; crouch = 0.08; off = 'flail'; }
    if (u.drained > 0) { pitch -= 0.6; lean = 0.24; crouch = 0.14; off = 'knee'; }
    if (intro) {
      // Face-off: a signature pose, stronger in the spotlight.
      const k = V.spotlight === u.id || V.spotlight === u.team ? 1 : 0.55;
      switch (u.key) {
        case 'kael': rel = 0.25; pitch = 1.25 * k + 0.2; crouch = 0.12 * k; stance = 1.5; lean = 0.05; break;
        case 'eiryn': off = 'cast'; lean = -0.12; crouch = 0.04; break;
        case 'brute': off = 'fistup'; rel = 0.6; pitch = 1.0; stance = 1.6; crouch = 0.08 * k; twist = -0.2; break;
        case 'knife': rel = -0.4 + Math.sin(V.time * 9) * 0.5 * k; pitch = 0.3; crouch = 0.2 * k; stance = 1.5; lean = 0.12; break;
        case 'grabber': crouch = 0.24 * k; lean = 0.3; off = 'reach'; rel = 0.3; pitch = 0.1; stance = 1.4; break;
        case 'lookout': twist = 1.3; crouch = 0.06; lean = -0.05; break;
        // Proposals
        case 'ren': rel = -0.9; pitch = -0.1; crouch = 0.24 * k; lean = 0.34; stance = 1.7; off = 'back'; twist = 0.2; break;
        case 'mara': off = 'cast'; rel = 0.2; pitch = 0.4 + 0.5 * k; lean = -0.04; crouch = 0.03; stance = 1.15; twist = -0.25 * k; break;
        case 'eirynMage': off = 'cast'; rel = 0.3; pitch = 0.9 * k; lean = -0.1; crouch = 0.04; break;
        case 'brannoc': off = 'guard'; rel = 1.5; pitch = 1.35; stance = 1.7; crouch = 0.1 * k; lean = 0.06; break;
        case 'climber': rel = 0.15; pitch = 1.35; crouch = 0.1 * k; lean = 0.08; stance = 1.6; twist = -0.3 * k; break;
        case 'shade': crouch = 0.28 * k; lean = 0.36; off = 'reach'; rel = -0.2; pitch = 0.0; stance = 1.6; twist = Math.sin(V.time * 5) * 0.2; break;
        case 'goblin': rel = -0.4 + Math.sin(V.time * 11) * 0.4 * k; pitch = 0.4; crouch = 0.22 * k; stance = 1.5; lean = 0.2; break;
        case 'goblinSpear': crouch = 0.14 * k; stance = 1.6; lean = 0.12; break;
        case 'goblinArcher': off = 'cast'; crouch = 0.06; stance = 1.35; lean = -0.02; break;
        case 'ogre': rel = 2.2; pitch = 1.35; crouch = 0.08 * k; stance = 1.5; twist = -0.25 * k; lean = 0.02; break;
      }
      // A hero's signature beat (intro.js) overrides the stance while it plays.
      const o = V.introPose && V.introPose(u);
      if (o) ({ rel = rel, pitch = pitch, lean = lean, crouch = crouch, off = off, stance = stance, twist = twist } = o);
    }
    if (L.weapon === 'fists' && off === 'guard') off = 'fistup';
    if (Wd && Wd.thrust && !(u.fleeing || u.beaten) && u.state !== 'hurt' && u.state !== 'stagger') { rel = 0.12; pitch = 0.1; }
    return { rel, pitch, lean, crouch, off, stance, twist };
  }

  // Attack progress for hand placement: phase and eased 0..1.
  function attackK(u) {
    const a = u.act;
    if (u.state !== 'attack' || !a) return null;
    if (a.phase === 'windup' || a.phase === 'feint') {
      const k = a.phase === 'feint' ? 1 : Math.min(1, a.t / a.wind);
      return { ph: 'wind', e: k * k * (3 - 2 * k) };
    }
    if (a.phase === 'strike') return { ph: 'strike', e: 1 };
    const k = Math.min(1, a.t / Math.max(0.05, a.A.recover));
    return { ph: 'rec', e: 1 - Math.pow(1 - k, 2) };
  }

  function create(V) {
    const { ctx } = V;
    const P = V.P;
    const springs = new WeakMap(); // per unit: hair/cloth lag

    function spring(u) {
      let sp = springs.get(u);
      if (!sp) { sp = { hx: 0, hy: 0, cx: 0, cy: 0 }; springs.set(u, sp); }
      return sp;
    }

    function update(s, dt) {
      if (!dt) return;
      for (const u of s.units) {
        const sp = spring(u);
        // Hair and cloth trail opposite to motion, with a little sway.
        const tx = -u.vx * 0.09 - u.kx * 0.05, ty = -u.vy * 0.09 - u.ky * 0.05;
        const k = 1 - Math.pow(0.0008, dt);
        sp.hx += (tx - sp.hx) * k; sp.hy += (ty - sp.hy) * k;
        sp.cx += (tx * 1.3 - sp.cx) * k * 0.8; sp.cy += (ty * 1.3 - sp.cy) * k * 0.8;
      }
    }

    // ---------------------------------------------------------------- shapes
    let lx = -0.55, ly = -0.835, inkW = 2;

    // Tapered segment between two screen points.
    function seg(a, b, wa, wb) {
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l;
      return { a, b, wa, wb, nx, ny, kind: 'seg' };
    }
    function pathSeg(sh) {
      const { a, b, wa, wb, nx, ny } = sh;
      ctx.moveTo(a.x + nx * wa, a.y + ny * wa);
      ctx.lineTo(b.x + nx * wb, b.y + ny * wb);
      ctx.arc(b.x, b.y, wb, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
      ctx.lineTo(a.x - nx * wa, a.y - ny * wa);
      ctx.arc(a.x, a.y, wa, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
      ctx.closePath();
    }
    function pathPoly(pts) {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
    }
    function pathShape(sh) {
      if (sh.kind === 'seg') pathSeg(sh);
      else if (sh.kind === 'poly') pathPoly(sh.pts);
      else if (sh.kind === 'ell') ctx.ellipse(sh.x, sh.y, sh.rx, sh.ry, sh.rot || 0, 0, Math.PI * 2);
    }
    // The half of a shape that faces away from the light, as a hard cel shadow.
    function pathShadow(sh) {
      if (sh.kind === 'seg') {
        const { a, b, wa, wb } = sh;
        let { nx, ny } = sh;
        if (nx * lx + ny * ly > 0) { nx = -nx; ny = -ny; }
        const f = 0.12;
        ctx.moveTo(a.x + nx * wa * f, a.y + ny * wa * f);
        ctx.lineTo(b.x + nx * wb * f, b.y + ny * wb * f);
        ctx.lineTo(b.x + nx * wb, b.y + ny * wb);
        ctx.lineTo(a.x + nx * wa, a.y + ny * wa);
        ctx.closePath();
      } else if (sh.kind === 'ell') {
        const off = Math.min(sh.rx, sh.ry) * 0.38;
        ctx.save(); ctx.beginPath();
        ctx.ellipse(sh.x, sh.y, sh.rx, sh.ry, sh.rot || 0, 0, Math.PI * 2); ctx.clip();
        ctx.beginPath();
        ctx.ellipse(sh.x - lx * off * 2.2, sh.y - ly * off * 2.2, sh.rx * 1.05, sh.ry * 1.05, sh.rot || 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
      } else if (sh.kind === 'poly' && sh.shadeFrom != null) {
        // shadeFrom: polygon split; first half of points is the lit side
        const pts = sh.pts;
        ctx.moveTo(pts[sh.shadeFrom[0]].x, pts[sh.shadeFrom[0]].y);
        for (const i of sh.shadeFrom.slice(1)) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
      }
    }
    function pathRim(sh) {
      if (sh.kind !== 'seg') return;
      const { a, b, wa, wb } = sh;
      let { nx, ny } = sh;
      if (nx * lx + ny * ly < 0) { nx = -nx; ny = -ny; }
      ctx.moveTo(a.x + nx * wa * 0.78, a.y + ny * wa * 0.78);
      ctx.lineTo(b.x + nx * wb * 0.78, b.y + ny * wb * 0.78);
    }

    // Hit flash: the base colour pushed most of the way to white.
    const lightCache = {};
    function lighten(hex) {
      if (lightCache[hex]) return lightCache[hex];
      const n = parseInt(hex.slice(1), 16);
      const m = (c) => Math.round(c + (255 - c) * 0.7);
      return (lightCache[hex] = `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`);
    }
    const rgbaCache = {};
    function rgba(hex, a) {
      const key = hex + a;
      if (rgbaCache[key]) return rgbaCache[key];
      const n = parseInt(hex.slice(1), 16);
      return (rgbaCache[key] = `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`);
    }

    // Draw a layer of shapes: ink outline under everything, then fills,
    // shadows and rim light. Shapes: {…geometry, c: [base, shadow], rim}
    function layer(shapes, flash) {
      if (!shapes.length) return;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 2;
      for (const sh of shapes) { ctx.beginPath(); pathShape(sh); ctx.stroke(); ctx.fill(); }
      for (const sh of shapes) {
        ctx.fillStyle = flash ? lighten(sh.c[0]) : sh.c[0];
        ctx.beginPath(); pathShape(sh); ctx.fill();
        if (!flash && sh.c[1]) {
          ctx.fillStyle = sh.c[1];
          ctx.beginPath(); pathShadow(sh); ctx.fill();
        }
      }
      if (!flash) {
        ctx.strokeStyle = 'rgba(246,236,232,0.55)'; ctx.lineWidth = Math.max(0.8, inkW * 0.55);
        ctx.beginPath();
        for (const sh of shapes) if (sh.rim !== false) pathRim(sh);
        ctx.stroke();
      }
    }

    // A small hash so per-unit flicker is stable but not in sync.
    function hashId(id) { let h = 7; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997; return h; }

    // ---------------------------------------------------------------- figure
    function drawUnit(u, s) {
      if (u.fled) return;
      const L = lookOf(u.key);
      const sc = V.cam.sc;
      lx = V.light.sx; ly = V.light.sy;
      inkW = Math.max(1, sc * 0.022);
      V.introPhase = s.phase === 'intro';
      const lying = u.state === 'down' || u.state === 'out';
      if (L.form === 'veil') { drawVeil(u, L, sc); return; }
      V.shadow(u.x, u.y, u.r * 1.3 * (lying ? 1.7 : 1) * L.build ** 0.5 / (L.build > 1.6 ? 1.2 : 1), L.ghost ? 0.25 : 0.42);
      let alpha = u.state === 'out' ? 0.6 : 1;
      if (L.ghost) {
        // Fragments flicker: mostly solid, with brief drop-outs. (Drawn
        // straight to the canvas; an offscreen pass per fragment cost too much.)
        const t = V.time * 9 + hashId(u.id);
        alpha *= L.ghost + 0.06 * Math.sin(t * 2.3) + (Math.sin(t * 0.7) > 0.93 ? -0.4 : 0);
      }
      ctx.globalAlpha = Math.max(0.15, alpha);
      if (lying) drawLying(u, L, sc);
      else drawStanding(u, L, sc);
      ctx.globalAlpha = 1;
    }

    function drawLying(u, L, sc) {
      const f = u.facing, F = [Math.cos(f), Math.sin(f)], Rt = [-F[1], F[0]];
      const H = 1.75 * L.h;
      const W = (x, y, z) => P(u.x + F[0] * x + Rt[0] * y, u.y + F[1] * x + Rt[1] * y, z);
      const head = W(-H * 0.42, 0, 0.14), chest = W(-H * 0.2, 0, 0.16), hip = W(0.05, 0, 0.14);
      const k1 = W(0.3, 0.12, 0.14), k2 = W(0.3, -0.12, 0.24), f1 = W(0.55, 0.15, 0.08), f2 = W(0.5, -0.2, 0.08);
      const hand1 = W(-H * 0.18, 0.4, 0.08), hand2 = W(-H * 0.1, -0.38, 0.08);
      const px = sc * 0.06 * L.build;
      const hr = sc * 0.12 * (L.headK || 1) * Math.min(1.2, L.h);
      const arm = L.bareArms ? L.skin : L.sleeve || L.coat || L.body;
      layer([
        { ...seg(hip, k1, px * 1.1, px * 0.9), c: L.legs }, { ...seg(k1, f1, px * 0.9, px * 0.75), c: L.boots },
        { ...seg(hip, k2, px * 1.1, px * 0.9), c: L.legs }, { ...seg(k2, f2, px * 0.9, px * 0.75), c: L.boots },
        { ...seg(chest, hand1, px * 0.7, px * 0.6), c: arm }, { ...seg(chest, hand2, px * 0.7, px * 0.6), c: arm },
        { ...seg(hip, chest, px * 1.5, px * 1.8), c: L.body },
        { kind: 'ell', x: head.x, y: head.y, rx: hr, ry: hr, c: L.hair === 'bald' ? L.skin : L.hair === 'helm' ? L.armor : L.hood || L.hairC },
      ], false);
      if (L.shield) {
        // the shield lies flat beside him
        const c = W(-H * 0.12, -0.55, 0.04), R = L.shield.r * sc;
        layer([{ kind: 'ell', x: c.x, y: c.y, rx: R, ry: R * 0.45, c: L.shield.c }], false);
      }
    }

    function drawStanding(u, L, sc) {
      const ps = pose(u, V);
      const sp = spring(u);
      const H = 1.78 * L.h;
      const f = u.facing + ps.twist * 0.35;
      const F = [Math.cos(f), Math.sin(f)], Rt = [-F[1], F[0]];
      const W = (x, y, z) => ({ x: u.x + F[0] * x + Rt[0] * y, y: u.y + F[1] * x + Rt[1] * y, z });
      const bob = u.state === 'move' || u.fleeing ? Math.abs(Math.sin(u.walk * 3.2)) * 0.05 : Math.sin((u.walk + u.x) * 0.5 + V.time * 2.2) * 0.008;
      const jitter = u.state === 'hurt' || u.state === 'stagger' ? Math.sin(u.st * 70) * 0.03 : 0;
      const cz = 1 - ps.crouch;
      const bw = 0.215 * L.w;
      const stoop = L.stoop || 0, hunch = L.hunch || 0;
      const AK = attackK(u);
      const Wd = WEAPON[L.weapon];

      // Skeleton (world metres, relative to facing)
      const lean = ps.lean + stoop * 0.6 + hunch;
      const pelvis = W(0, 0, H * 0.5 * cz + bob);
      const chest = W(lean * 0.55, jitter, H * 0.71 * cz + bob);
      const neck = W(lean * 0.8 + stoop * 0.25, jitter, H * (0.82 - stoop * 0.06) * cz + bob);
      const headC = W(lean * 0.9 + 0.02 + stoop * 0.45, jitter, H * (0.905 - stoop * 0.14) * cz + bob);
      const twist = ps.twist * 0.25;
      const shR = W(lean * 0.75 - twist * bw, bw, H * 0.79 * cz + bob);
      const shL = W(lean * 0.75 + twist * bw, -bw, H * 0.79 * cz + bob);
      const hipR = W(0, bw * 0.55, H * 0.5 * cz + bob), hipL = W(0, -bw * 0.55, H * 0.5 * cz + bob);
      // Feet: stride when moving, wide stance when fighting.
      const stride = (u.state === 'move' || u.fleeing || u.state === 'opener' ? Math.sin(u.walk * 3.2) * 0.34 : u.state === 'circle' ? Math.sin(u.walk * 3.2) * 0.16 : 0) * Math.sqrt(L.h);
      const spread = 0.13 * L.w * ps.stance;
      const footR = W(stride + (ps.stance > 1.2 ? 0.18 : 0), spread, 0);
      const footL = W(-stride - (ps.stance > 1.2 ? 0.16 : 0), -spread, 0);
      const knee = (hip, foot, side) => ({
        x: (hip.x + foot.x) / 2 + F[0] * (0.1 + ps.crouch * 0.5) * L.h + Rt[0] * side * 0.03,
        y: (hip.y + foot.y) / 2 + F[1] * (0.1 + ps.crouch * 0.5) * L.h + Rt[1] * side * 0.03,
        z: (hip.z + foot.z) / 2 + 0.02,
      });
      const kneeR = knee(hipR, footR, 1), kneeL = knee(hipL, footL, -1);

      // Weapon hand from the attack arc.
      let wa = f + ps.rel, cp = Math.cos(ps.pitch), wpitch = ps.pitch;
      const reach = (L.weapon === 'fists' || L.weapon === 'none' || L.weapon === 'glyph' ? 0.5 : 0.42) * Math.sqrt(L.h);
      const handR = {
        x: shR.x + Math.cos(f + ps.rel * 0.6) * reach + Rt[0] * 0.05,
        y: shR.y + Math.sin(f + ps.rel * 0.6) * reach + Rt[1] * 0.05,
        z: shR.z - 0.22 * L.h + ps.pitch * 0.2 * L.h,
      };
      if (u.state === 'parry') Object.assign(handR, W(0.38, 0.08, H * 0.74 * cz));
      const Hc = H * cz;
      let handL;
      switch (ps.off) {
        case 'fistup': handL = W(0.32, -0.12, H * 0.76 * cz); break;
        case 'cast': handL = W(0.62 * L.h, -0.1, H * 0.8 * cz); break;
        case 'reach': handL = W(0.6 * L.h, -0.15, H * 0.6 * cz); break;
        case 'flail': handL = W(-0.1, -0.42 * L.h, H * (0.8 + Math.sin(V.time * 14) * 0.08) * cz); break;
        case 'back': handL = W(-0.42 * L.h, -0.22, H * 0.55 * cz); break;
        case 'out': handL = W(0.05, -0.5 * L.h, H * 0.66 * cz); break;
        case 'down': handL = W(0.5, -0.12, 0.25); break;
        case 'knee': handL = W(0.18, -0.15, H * 0.42 * cz); break;
        default: handL = W(0.26 * L.h, -0.16 * L.w, H * 0.6 * cz);
      }
      if (u.state === 'pickup') Object.assign(handR, W(0.45, 0.1, 0.18));
      if (L.weapon === 'fists' && AK && AK.ph !== 'wind') {
        // a punch: the fist drives straight along the facing
        const k = AK.ph === 'strike' ? 1 : Math.max(0, 1 - u.act.t / 0.3);
        Object.assign(handR, W(0.25 + 0.55 * k, 0.05, H * 0.74 * cz));
      }
      const free = !(u.fleeing || u.beaten) && !(u.drained > 0) && u.state !== 'hurt' && u.state !== 'stagger';
      // Shield: held in front; a bash drives it forward.
      if (L.shield && free && (ps.off === 'guard' || ps.off === 'fistup')) {
        let fwd = 0.34, side = -0.14, z = 0.62;
        if (AK) {
          if (AK.ph === 'wind') { fwd = 0.34 - 0.2 * AK.e; side = -0.14 - 0.1 * AK.e; }
          else if (AK.ph === 'strike') { fwd = 0.72; side = -0.02; z = 0.66; }
          else { fwd = 0.72 - 0.38 * AK.e; side = -0.02 - 0.12 * AK.e; }
        }
        if (u.state === 'parry') { fwd = 0.5; side = -0.04; z = 0.68; }
        handL = W(fwd * L.h + lean * 0.5, side * L.w, H * z * cz);
      }
      // Glyph casters: the casting hand comes up and pushes the glyph out.
      if (L.weapon === 'glyph' && free && u.state !== 'pickup') {
        if (AK) {
          const fw = AK.ph === 'wind' ? 0.25 + 0.2 * AK.e : AK.ph === 'strike' ? 0.66 : 0.66 - 0.36 * AK.e;
          const zz = AK.ph === 'wind' ? 0.66 + 0.1 * AK.e : AK.ph === 'strike' ? 0.78 : 0.78 - 0.14 * AK.e;
          Object.assign(handR, W(fw * L.h + lean * 0.5, 0.1, H * zz * cz));
        } else if (u.state !== 'parry') {
          Object.assign(handR, W(0.2 + Math.max(0, ps.pitch) * 0.2, 0.26, H * (0.56 + Math.max(0, ps.pitch) * 0.12) * cz));
        }
      }
      // Bow: the bow hand reaches out, the string hand draws back to the cheek.
      let bowDraw = 0;
      if (L.weapon === 'bow' && free) {
        const aim = AK || (V.introPhase && ps.off === 'cast');
        if (aim) {
          bowDraw = AK ? (AK.ph === 'wind' ? AK.e : AK.ph === 'strike' ? 0 : 0) : 0.85;
          handL = W(0.5 * L.h + lean * 0.5, -0.06, H * 0.77 * cz);
          const rel = AK && AK.ph !== 'wind';
          Object.assign(handR, rel ? W(-0.08, 0.2, H * 0.8 * cz) : W(0.48 * L.h - bowDraw * 0.5 * L.h + lean * 0.5, 0.02 + bowDraw * 0.05, H * 0.77 * cz));
        } else {
          handL = W(0.22, -0.2, H * 0.55 * cz);
        }
      }
      // Thrust weapons point along the facing; the hand drives forward.
      if (Wd && Wd.thrust && free) {
        let fw = 0.08, z = 0.6;
        if (AK) fw = AK.ph === 'wind' ? 0.08 - 0.3 * AK.e : AK.ph === 'strike' ? 0.6 : 0.6 - 0.52 * AK.e;
        if (V.introPhase) { fw = 0.0; z = 0.62; }
        Object.assign(handR, W(fw * L.h + lean * 0.5, 0.16, H * z * cz));
        wa = f; cp = Math.cos(0.08); wpitch = 0.08;
      }

      // Weapon tip (world) and two-handed grips.
      let tipW = null;
      if (Wd) {
        const len = Wd.len * (L.weapon === 'spear' || L.weapon === 'beam' ? 1 : Math.min(1.15, Math.max(0.85, L.h)));
        tipW = { x: handR.x + Math.cos(wa) * len * cp, y: handR.y + Math.sin(wa) * len * cp, z: handR.z + Math.sin(wpitch) * len };
        if (u.state === 'parry') tipW = { x: handR.x - Rt[0] * len * 0.9, y: handR.y - Rt[1] * len * 0.9, z: handR.z + 0.38 };
        if (tipW.z < 0.02) {
          // blades that point down rest their tip on the ground
          tipW.z = 0.02;
        }
        if (free && (ps.off === 'guard' || ps.off === 'fistup') && (Wd.grip === 'two' || Wd.grip === 'shaft')) {
          const dx = tipW.x - handR.x, dy = tipW.y - handR.y, dz = tipW.z - handR.z, l = Math.hypot(dx, dy, dz) || 1;
          const g = Wd.grip === 'two' ? -0.2 : 0.46;
          handL = { x: handR.x + dx / l * g, y: handR.y + dy / l * g, z: handR.z + dz / l * g };
        }
      }

      const elbow = (sh, hand, side) => ({
        x: (sh.x + hand.x) / 2 + Rt[0] * side * 0.12 * L.w,
        y: (sh.y + hand.y) / 2 + Rt[1] * side * 0.12 * L.w,
        z: (sh.z + hand.z) / 2 - 0.08 * L.h,
      });
      const elR = elbow(shR, handR, 1), elL = elbow(shL, handL, -1);

      const p = (q) => P(q.x, q.y, q.z);
      const S = {
        pelvis: p(pelvis), chest: p(chest), neck: p(neck), head: p(headC),
        shR: p(shR), shL: p(shL), hipR: p(hipR), hipL: p(hipL),
        kneeR: p(kneeR), kneeL: p(kneeL), footR: p(footR), footL: p(footL),
        elR: p(elR), elL: p(elL), handR: p(handR), handL: p(handL),
      };
      const px = sc * 0.082 * L.build * Math.min(1, 0.55 + 0.45 * L.h); // limb half-width unit
      const headR = sc * H * 0.068 * (L.headK || 1);
      const flash = u.flash > 0;
      const G = { u, L, S, F, Rt, sc, px, H, cz, sp, ps, handR, handL, elL, tipW, bowDraw, flash, f };

      // Which side is nearer the camera decides the drawing order.
      const rightNear = S.shR.d > S.shL.d;
      const near = rightNear ? 'R' : 'L', far = rightNear ? 'L' : 'R';
      const leg = (side) => L.wisp ? [
        // legs that thin out to nothing above the ground
        { ...seg(S['hip' + side], S['knee' + side], px * 1.25, px * 0.8), c: L.legs, rim: false },
        { ...seg(S['knee' + side], { x: S['foot' + side].x, y: S['foot' + side].y - px * 1.2 }, px * 0.8, px * 0.08), c: L.legs, rim: false },
      ] : [
        { ...seg(S['hip' + side], S['knee' + side], px * 1.25, px * 0.85), c: L.legs, rim: false },
        { ...seg(S['knee' + side], S['foot' + side], px * 0.85, px * 0.55), c: L.legs, rim: false },
        { ...seg(S['foot' + side], P(...footTip(side)), px * 0.6, px * 0.45), c: L.boots },
      ];
      function footTip(side) {
        const ft = side === 'R' ? footR : footL;
        return [ft.x + F[0] * 0.14 * Math.sqrt(L.w), ft.y + F[1] * 0.14 * Math.sqrt(L.w), 0.02];
      }
      const armColor = L.bareArms ? L.skin : L.sleeve || L.coat || L.body;
      const fistK = L.weapon === 'fists' ? 1 : L.weapon === 'beam' ? 1.1 : 0;
      const arm = (side) => {
        const hand = S['hand' + side];
        return [
          { ...seg(S['sh' + side], S['el' + side], px * 0.8, px * 0.65), c: armColor, rim: false },
          { ...seg(S['el' + side], hand, px * 0.65, px * 0.5), c: L.wraps || armColor, rim: false },
          { kind: 'ell', x: hand.x, y: hand.y, rx: px * (fistK ? 0.95 * fistK : 0.55), ry: px * (fistK ? 0.9 * fistK : 0.5), c: L.wraps || L.skin, rim: false },
        ];
      };
      // Shield in front of the body, or behind it when the bearer faces away.
      const shieldFront = L.shield ? S.handL.d >= S.chest.d - 0.02 : false;

      // Back layer: far leg, far arm, hair behind, cloth behind.
      const back = [];
      const hairTail = hairTailPoints(u, L, S, F, headC, sp, H, cz);
      if (L.hair === 'long') back.push(hairTail.shape);
      const capeSh = L.cape ? cape(L, shL, shR, F, Rt, sp, H, cz, u) : null;
      const coatSh = L.coat ? coatTail(L, pelvis, F, Rt, sp, H, cz) : null;
      if (capeSh) back.push(capeSh);
      if (coatSh) back.push(coatSh);
      if (L.quiver) back.push(quiver(L, shL, pelvis, F, Rt));
      back.push(...leg(far));
      back.push(...arm(far));
      layer(back, flash);
      if (L.trim && !flash) { hemTrim(capeSh, L.trim); hemTrim(coatSh, L.trim); }
      if (far === 'R') drawWeapon(G);
      if (far === 'L') drawOffHand(G);
      if (L.shield && !shieldFront) drawShield(G);

      // Body layer: near leg, torso, head.
      const body = [];
      body.push(...leg(near));
      if (L.skirt) body.push(skirt(L, pelvis, F, Rt, sp, H, cz));
      if (L.coat && L.coatLen != null && L.coatLen < 0.12) body.push(coatSkirt(L, pelvis, F, Rt, sp, H, cz));
      // Torso: wide at the shoulders, narrow at the waist.
      const wst = 0.05 * L.w;
      const torso = [S.shL, S.shR, P((hipR.x + pelvis.x) / 2 + Rt[0] * wst, (hipR.y + pelvis.y) / 2 + Rt[1] * wst, pelvis.z + 0.04), P((hipL.x + pelvis.x) / 2 - Rt[0] * wst, (hipL.y + pelvis.y) / 2 - Rt[1] * wst, pelvis.z + 0.04)];
      const lightRight = (S.shR.x - S.shL.x) * lx + (S.shR.y - S.shL.y) * ly > 0;
      const midTop = { x: (S.shL.x + S.shR.x) / 2, y: (S.shL.y + S.shR.y) / 2 }, midBot = { x: (torso[2].x + torso[3].x) / 2, y: (torso[2].y + torso[3].y) / 2 };
      body.push({ kind: 'poly', pts: torso, c: L.body });
      body.push({ ...seg(S.pelvis, S.chest, px * 1.25, px * 1.55), c: L.body, rim: true });
      layer(body, flash);
      // Torso cel shadow: the half away from the light.
      if (!flash) {
        ctx.fillStyle = L.body[1];
        ctx.beginPath();
        if (lightRight) pathPoly([midTop, torso[0], torso[3], midBot]); else pathPoly([midTop, torso[1], torso[2], midBot]);
        ctx.fill();
      }
      drawCostume(u, L, S, F, Rt, sc, px, shR, shL, pelvis, chest, H, cz, lightRight);
      drawHead(u, L, S, F, sc, headR, hairTail, lightRight);
      if (L.shards) drawShards(G);

      // Front layer: near arm and the weapon.
      if (far === 'L') drawWeapon(G);
      layer(arm(near), flash);
      if (far === 'R') drawOffHand(G);
      if (L.shield && shieldFront) drawShield(G);
      if (L.glyph) drawGlyphHands(G);
    }

    function hairTailPoints(u, L, S, F, headC, sp, H, cz) {
      // Long hair hangs from the back of the head and trails behind motion.
      const back = { x: headC.x - F[0] * 0.08, y: headC.y - F[1] * 0.08, z: headC.z + 0.02 };
      const tip = { x: back.x - F[0] * 0.16 + sp.hx * 1.6, y: back.y - F[1] * 0.16 + sp.hy * 1.6, z: H * 0.46 * cz };
      const mid = { x: (back.x + tip.x) / 2 - F[0] * 0.06, y: (back.y + tip.y) / 2 - F[1] * 0.06, z: (back.z + tip.z) / 2 };
      const pb = P(back.x, back.y, back.z), pm = P(mid.x, mid.y, mid.z), pt = P(tip.x, tip.y, tip.z);
      const w = V.cam.sc * 0.17;
      const shape = { kind: 'poly', pts: [
        { x: pb.x - w, y: pb.y }, { x: pm.x - w * 0.95, y: pm.y }, { x: pt.x - w * 0.25, y: pt.y }, { x: pt.x + w * 0.25, y: pt.y + 2 },
        { x: pm.x + w * 0.95, y: pm.y }, { x: pb.x + w, y: pb.y },
      ], c: L.hairC, shadeFrom: [0, 1, 2, 3] };
      return { shape, pb, pm, pt };
    }

    function coatTail(L, pelvis, F, Rt, sp, H, cz) {
      const cw = L.coatW || 0.2;
      const hem = H * (L.coatLen == null ? 0.16 : L.coatLen) * cz;
      const top = (side) => P(pelvis.x + Rt[0] * side * 0.16 * L.w - F[0] * 0.05, pelvis.y + Rt[1] * side * 0.16 * L.w - F[1] * 0.05, pelvis.z + 0.05);
      const lg = clampLag(sp, 0.32);
      const back = L.coatLen != null && L.coatLen < 0.12 ? 0.14 : 0.2;
      const bot = (side) => P(pelvis.x + Rt[0] * side * cw - F[0] * back + lg.x, pelvis.y + Rt[1] * side * cw - F[1] * back + lg.y, hem);
      return { kind: 'poly', pts: [top(-1), top(1), bot(1), bot(-1)], c: L.coat, shadeFrom: [1, 2, 3], hem: [2, 3] };
    }

    // The front panels of a long coat, hanging open around the legs.
    function coatSkirt(L, pelvis, F, Rt, sp, H, cz) {
      const hem = H * L.coatLen * cz + 0.04;
      const lag = clampLag(sp, 0.18);
      const at = (side, fwd, z, k) => P(pelvis.x + Rt[0] * side * L.w + F[0] * fwd + lag.x * k, pelvis.y + Rt[1] * side * L.w + F[1] * fwd + lag.y * k, z);
      const pts = [at(-0.17, 0.02, pelvis.z + 0.06, 0), at(0.17, 0.02, pelvis.z + 0.06, 0), at(0.27, 0.0, hem + 0.06, 1), at(0.12, 0.06, hem, 1), at(-0.12, 0.06, hem, 1), at(-0.27, 0.0, hem + 0.06, 1)];
      return { kind: 'poly', pts, c: L.coat, shadeFrom: [1, 2, 3], hem: [2, 3, 4, 5] };
    }
    function clampLag(sp, max) {
      const l = Math.hypot(sp.cx, sp.cy);
      const k = l > max ? max / l : 1;
      return { x: sp.cx * k, y: sp.cy * k };
    }

    // A long cloak from the shoulders with a torn hem.
    function cape(L, shL, shR, F, Rt, sp, H, cz, u) {
      const n = L.tatter || 5;
      const top = (q, side) => P(q.x - F[0] * 0.1 + Rt[0] * side * 0.04, q.y - F[1] * 0.1 + Rt[1] * side * 0.04, q.z + 0.02);
      const pts = [top(shL, -1), top(shR, 1)];
      const t = V.time * 3 + u.x;
      const lg = clampLag(sp, 0.3);
      for (let i = 0; i <= n; i++) {
        const k = i / n, side = 1 - 2 * k; // right to left
        const torn = i % 2 ? 0.0 : 0.09 + 0.05 * Math.sin(i * 2.1 + t);
        const sway = Math.sin(t + i) * 0.03;
        pts.push(P(
          (shL.x + shR.x) / 2 + Rt[0] * side * 0.36 * L.w - F[0] * (0.3 + sway) + lg.x * 1.4,
          (shL.y + shR.y) / 2 + Rt[1] * side * 0.36 * L.w - F[1] * (0.3 + sway) + lg.y * 1.4,
          Math.max(0.03, H * (L.capeLen || 0.08) * cz + torn)));
      }
      const half = [1]; for (let i = 2; i <= 2 + Math.floor(n / 2); i++) half.push(i);
      const hem = []; for (let i = 2; i < pts.length; i++) hem.push(i);
      return { kind: 'poly', pts, c: L.cape, shadeFrom: half, hem };
    }

    // A thin coloured line along a coat or cloak hem.
    function hemTrim(sh, color) {
      if (!sh || !sh.hem) return;
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, inkW * 0.8); ctx.lineJoin = 'miter';
      ctx.beginPath();
      sh.hem.forEach((i, j) => (j ? ctx.lineTo(sh.pts[i].x, sh.pts[i].y) : ctx.moveTo(sh.pts[i].x, sh.pts[i].y)));
      ctx.stroke();
    }

    function quiver(L, shL, pelvis, F, Rt) {
      const a = P(shL.x - F[0] * 0.12, shL.y - F[1] * 0.12, shL.z + 0.12), b = P(pelvis.x - F[0] * 0.14 + Rt[0] * 0.08, pelvis.y - F[1] * 0.14 + Rt[1] * 0.08, pelvis.z + 0.02);
      return { ...seg(a, b, V.cam.sc * 0.07, V.cam.sc * 0.055), c: ['#6b4c33', '#3a281a'] };
    }

    function skirt(L, pelvis, F, Rt, sp, H, cz) {
      const sw = L.w;
      const at = (side, fwd, z, lag) => P(pelvis.x + Rt[0] * side * sw + F[0] * fwd + sp.cx * lag, pelvis.y + Rt[1] * side * sw + F[1] * fwd + sp.cy * lag, z);
      return { kind: 'poly', pts: [at(-0.15, 0, pelvis.z + 0.06, 0), at(0.15, 0, pelvis.z + 0.06, 0), at(0.24, 0.05, H * 0.27 * cz, 1), at(-0.24, 0.05, H * 0.27 * cz, 1)], c: L.skirt, shadeFrom: [1, 2, 3] };
    }

    function drawCostume(u, L, S, F, Rt, sc, px, shR, shL, pelvis, chest, H, cz, lightRight) {
      const big = sc > 70;
      const flash = u.flash > 0;
      // Belt line
      ctx.strokeStyle = INK; ctx.lineWidth = inkW;
      const hw = 0.17 * L.w;
      const bl = P(pelvis.x - Rt[0] * hw, pelvis.y - Rt[1] * hw, pelvis.z + 0.07), br = P(pelvis.x + Rt[0] * hw, pelvis.y + Rt[1] * hw, pelvis.z + 0.07);
      ctx.beginPath(); ctx.moveTo(bl.x, bl.y); ctx.lineTo(br.x, br.y); ctx.stroke();
      if (L.bareChest && !flash) {
        // Heavy pecs and a gut line on bare skin.
        ctx.strokeStyle = 'rgba(12,8,8,0.6)'; ctx.lineWidth = Math.max(1, inkW * 0.8);
        const c = S.chest;
        ctx.beginPath();
        ctx.moveTo(S.shL.x * 0.5 + c.x * 0.5, S.shL.y * 0.5 + c.y * 0.5 + px * 0.6); ctx.quadraticCurveTo(c.x, c.y + px * 1.4, S.shR.x * 0.5 + c.x * 0.5, S.shR.y * 0.5 + c.y * 0.5 + px * 0.6);
        ctx.moveTo(c.x, c.y + px * 0.9); ctx.lineTo(c.x, c.y + px * 1.8);
        ctx.stroke();
      }
      if (L.plate && !flash) {
        // Breastplate: a raised centre ridge and plate edges.
        const c1 = P(chest.x + F[0] * 0.12, chest.y + F[1] * 0.12, chest.z + 0.05);
        ctx.strokeStyle = 'rgba(230,236,242,0.5)'; ctx.lineWidth = Math.max(1, inkW * 0.8);
        ctx.beginPath(); ctx.moveTo(S.neck.x, S.neck.y + px * 0.5); ctx.lineTo(c1.x, c1.y); ctx.lineTo(S.pelvis.x, S.pelvis.y - px * 0.6); ctx.stroke();
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, inkW * 0.7);
        ctx.beginPath(); ctx.moveTo(bl.x, bl.y - px * 0.8); ctx.lineTo(br.x, br.y - px * 0.8); ctx.stroke();
      }
      if (L.pauldron) {
        const sides = L.pauldron === 'both' ? [shL, shR] : [shL];
        const sh = sides.map((q) => { const o = P(q.x, q.y, q.z + 0.05); const k = L.pauldron === 'both' ? 0.72 : 1; return { kind: 'ell', x: o.x, y: o.y, rx: px * 2.0 * k, ry: px * 1.5 * k, rot: -0.3, c: L.armor }; });
        layer(sh, flash);
      }
      if (L.chestV) {
        const c1 = P(chest.x + F[0] * 0.1, chest.y + F[1] * 0.1, chest.z + 0.02);
        ctx.strokeStyle = L.accent; ctx.lineWidth = Math.max(1, inkW * 0.9);
        ctx.beginPath(); ctx.moveTo(S.shL.x, S.shL.y + px); ctx.lineTo(c1.x, c1.y); ctx.lineTo(S.shR.x, S.shR.y + px); ctx.stroke();
      }
      if (L.strap) {
        // Sword strap across the chest.
        ctx.strokeStyle = L.strap; ctx.lineWidth = Math.max(1.5, px * 0.5);
        ctx.beginPath(); ctx.moveTo(S.shL.x, S.shL.y); ctx.lineTo(br.x, br.y); ctx.stroke();
      }
      if (L.quiver) {
        ctx.strokeStyle = '#3a281a'; ctx.lineWidth = Math.max(1.2, px * 0.4);
        ctx.beginPath(); ctx.moveTo(S.shR.x, S.shR.y); ctx.lineTo(bl.x, bl.y); ctx.stroke();
      }
      if (L.collar) {
        // Green ornamentation at the collar, and the ornament itself.
        const n = S.neck;
        ctx.strokeStyle = L.collar; ctx.lineWidth = Math.max(1.2, px * 0.45);
        ctx.beginPath(); ctx.moveTo(S.shL.x * 0.6 + n.x * 0.4, S.shL.y * 0.6 + n.y * 0.4 + px * 0.3); ctx.lineTo(n.x, n.y + px * 1.1); ctx.lineTo(S.shR.x * 0.6 + n.x * 0.4, S.shR.y * 0.6 + n.y * 0.4 + px * 0.3); ctx.stroke();
        ctx.fillStyle = '#7fe0a8'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, inkW * 0.6);
        ctx.beginPath(); ctx.arc(n.x, n.y + px * 1.3, Math.max(1.5, px * 0.38), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (L.coat && L.trim) {
        // Open coat front: two trim lines from the collar down.
        const n = S.neck;
        ctx.strokeStyle = L.trim; ctx.lineWidth = Math.max(1, px * 0.32);
        ctx.beginPath();
        ctx.moveTo(S.shL.x * 0.55 + n.x * 0.45, S.shL.y * 0.55 + n.y * 0.45); ctx.lineTo(bl.x * 0.7 + br.x * 0.3, bl.y * 0.7 + br.y * 0.3 + px * 0.6);
        ctx.moveTo(S.shR.x * 0.55 + n.x * 0.45, S.shR.y * 0.55 + n.y * 0.45); ctx.lineTo(bl.x * 0.3 + br.x * 0.7, bl.y * 0.3 + br.y * 0.7 + px * 0.6);
        ctx.stroke();
      }
      if (L.scarf) {
        // Scarf with a tail that trails.
        const sp = spring(u);
        const n = S.neck, tail = P(chest.x - F[0] * 0.25 + sp.hx * 2, chest.y - F[1] * 0.25 + sp.hy * 2, H * 0.62 * cz);
        layer([{ ...seg(n, tail, px * 1.1, px * 0.4), c: L.scarf }, { kind: 'ell', x: n.x, y: n.y + px * 0.5, rx: px * 1.5, ry: px * 0.9, c: L.scarf, rim: false }], flash);
      }
      const band = L.sash || L.belt;
      if (band) {
        ctx.strokeStyle = band; ctx.lineWidth = Math.max(1.2, px * (L.sash ? 0.7 : 0.45));
        ctx.beginPath(); ctx.moveTo(bl.x, bl.y); ctx.lineTo(br.x, br.y); ctx.stroke();
      }
      if (L.scraps && !flash) {
        // Scrappy leathers: a few stitched patches.
        ctx.strokeStyle = 'rgba(200,170,130,0.55)'; ctx.lineWidth = Math.max(0.8, inkW * 0.5);
        const c = S.chest;
        ctx.beginPath();
        ctx.moveTo(c.x - px * 0.8, c.y - px * 0.2); ctx.lineTo(c.x + px * 0.4, c.y + px * 0.1);
        ctx.moveTo(c.x - px * 0.2, c.y + px * 0.8); ctx.lineTo(c.x + px * 0.9, c.y + px * 0.6);
        ctx.stroke();
      }
      if (big) {
        // Cloth fold lines at close zoom.
        ctx.strokeStyle = 'rgba(12,8,8,0.55)'; ctx.lineWidth = Math.max(1, inkW * 0.6);
        ctx.beginPath();
        ctx.moveTo(S.chest.x, S.chest.y); ctx.lineTo(S.pelvis.x + (lightRight ? -px : px), S.pelvis.y);
        ctx.stroke();
      }
    }

    function drawHead(u, L, S, F, sc, r, hairTail, lightRight) {
      const h = S.head;
      // Facing on screen: a point ahead of the head.
      const ahead = P(u.x + F[0] * 0.3, u.y + F[1] * 0.3, 0), base = P(u.x, u.y, 0);
      let fx = ahead.x - base.x, fy = ahead.y - base.y;
      const fl = Math.hypot(fx, fy) || 1; fx /= fl; fy /= fl;
      const towardCam = ahead.d > base.d; // face visible
      const flash = u.flash > 0;
      if (L.ears) drawEars(L, h, r, fx, flash, towardCam);
      // Neck
      layer([{ ...seg(S.neck, { x: h.x, y: h.y + r * 0.4 }, r * 0.32 * (L.stoop ? 1.6 : 1), r * 0.3 * (L.stoop ? 1.6 : 1)), c: L.skin, rim: false }], flash);
      // Head: slightly tall, chin toward the facing side.
      const chin = { x: h.x + fx * r * 0.35, y: h.y + r * 0.95 };
      ctx.lineJoin = 'round';
      const headPath = () => {
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, r * 0.92, r, 0, 0, Math.PI * 2);
        ctx.moveTo(h.x - r * 0.6, h.y + r * 0.45);
        ctx.quadraticCurveTo(chin.x - r * 0.3, chin.y, chin.x, chin.y);
        ctx.quadraticCurveTo(chin.x + r * 0.3, chin.y - r * 0.1, h.x + r * 0.62, h.y + r * 0.45);
      };
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 2;
      headPath(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = flash ? lighten(L.skin[0]) : L.skin[0]; headPath(); ctx.fill();
      if (!flash) {
        // Face shadow on the side away from the light.
        ctx.save(); headPath(); ctx.clip();
        ctx.fillStyle = L.skin[1];
        ctx.beginPath(); ctx.ellipse(h.x - lx * r * 0.95, h.y - ly * r * 0.5, r * 0.85, r * 1.2, 0, 0, Math.PI * 2); ctx.fill();
        if (L.cowl || L.faceless) {
          // the face lost in shadow
          ctx.fillStyle = L.faceless ? '#06040a' : '#100c10';
          ctx.beginPath(); ctx.ellipse(h.x + fx * r * 0.2, h.y + r * 0.1, r * 0.95, r * 1.1, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      const glowEyes = L.glowEyes;
      // Eyes at close zoom when the face is toward us.
      if (!glowEyes && towardCam && sc > 55 && !flash) {
        const ex = h.x + fx * r * 0.42, ey = h.y + r * 0.12;
        const gap = r * 0.36, ew = Math.max(1.5, r * 0.2), eh = Math.max(1, r * 0.1);
        ctx.fillStyle = INK;
        for (const sgn of [-1, 1]) {
          const x = ex + sgn * gap * Math.abs(fy) * 0.9;
          ctx.beginPath(); ctx.ellipse(x, ey, ew, eh, sgn * -0.25, 0, Math.PI * 2); ctx.fill();
          if (sc > 90) {
            ctx.fillStyle = L.eye; ctx.beginPath(); ctx.ellipse(x + fx * ew * 0.2, ey, ew * 0.45, eh * 0.95, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + fx * ew * 0.35, ey - eh * 0.35, Math.max(0.8, eh * 0.35), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = INK;
          }
        }
        // brows
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(ex - gap - ew, ey - eh * 3.2); ctx.lineTo(ex - gap * 0.3, ey - eh * 2.2);
        ctx.moveTo(ex + gap + ew, ey - eh * 3.2); ctx.lineTo(ex + gap * 0.3, ey - eh * 2.2);
        ctx.stroke();
      }
      if (L.tusks && towardCam && !flash) {
        ctx.fillStyle = '#e8dcc4'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, inkW * 0.6);
        for (const sgn of [-1, 1]) {
          const x = chin.x + sgn * r * 0.32 * Math.max(0.4, Math.abs(fy)), y = chin.y - r * 0.25;
          ctx.beginPath(); ctx.moveTo(x - r * 0.1, y); ctx.lineTo(x + sgn * r * 0.04, y - r * 0.38); ctx.lineTo(x + r * 0.1, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      if (L.beard) drawBeard(L, h, r, chin, fx, flash);
      drawHair(u, L, h, r, fx, fy, towardCam, flash, hairTail);
      if (glowEyes && !flash && (towardCam || L.faceless)) drawGlowEyes(L, h, r, fx, fy, glowEyes, u);
    }

    function drawEars(L, h, r, fx, flash, towardCam) {
      // Big pointed ears sweeping out and back.
      const ear = (sgn) => {
        const bx = h.x + sgn * r * 0.7 - fx * r * 0.15, by = h.y + r * 0.05;
        return { kind: 'poly', pts: [{ x: bx, y: by - r * 0.32 }, { x: bx + sgn * r * 1.25 - fx * r * 0.35, y: by - r * 0.55 }, { x: bx, y: by + r * 0.3 }], c: L.skin, shadeFrom: [0, 1, 2] };
      };
      layer([ear(-1), ear(1)], flash);
      if (!flash) {
        ctx.fillStyle = L.skin[1];
        for (const sgn of [-1, 1]) {
          const bx = h.x + sgn * r * 0.72 - fx * r * 0.15, by = h.y + r * 0.05;
          ctx.beginPath(); ctx.moveTo(bx, by - r * 0.12); ctx.lineTo(bx + sgn * r * 0.85 - fx * r * 0.25, by - r * 0.4); ctx.lineTo(bx, by + r * 0.14); ctx.closePath(); ctx.fill();
        }
      }
    }

    function drawBeard(L, h, r, chin, fx, flash) {
      const c = flash ? [lighten(L.beard[0])] : L.beard;
      const pts = [
        { x: h.x - r * 0.88 + fx * r * 0.1, y: h.y + r * 0.1 },
        { x: h.x - r * 0.75 + fx * r * 0.2, y: h.y + r * 0.95 },
        { x: chin.x - r * 0.3, y: chin.y + r * 0.75 },
        { x: chin.x + fx * r * 0.2, y: chin.y + r * 1.05 },
        { x: chin.x + r * 0.35, y: chin.y + r * 0.72 },
        { x: h.x + r * 0.78 + fx * r * 0.2, y: h.y + r * 0.95 },
        { x: h.x + r * 0.88 + fx * r * 0.1, y: h.y + r * 0.1 },
        // mouth opening edge
        { x: h.x + r * 0.35 + fx * r * 0.3, y: h.y + r * 0.42 },
        { x: h.x - r * 0.35 + fx * r * 0.3, y: h.y + r * 0.42 },
      ];
      const sh = [{ kind: 'poly', pts, c, shadeFrom: lx < 0 ? [3, 4, 5, 6, 7] : [0, 1, 2, 3, 8] }];
      if (L.braids) {
        // two braids hanging from the beard
        for (const o of [-0.25, 0.25]) {
          const a = { x: chin.x + o * r, y: chin.y + r * 0.7 }, b = { x: chin.x + o * r * 1.3 + fx * r * 0.1, y: chin.y + r * 1.75 };
          sh.push({ ...seg(a, b, r * 0.16, r * 0.1), c, rim: false });
        }
      }
      layer(sh, flash);
      if (!flash && L.braids) {
        ctx.fillStyle = '#c9a24a';
        for (const o of [-0.25, 0.25]) { ctx.beginPath(); ctx.arc(chin.x + o * r * 1.2 + fx * r * 0.06, chin.y + r * 1.35, Math.max(1, r * 0.11), 0, Math.PI * 2); ctx.fill(); }
      }
    }

    // Glowing eyes in a shadowed face: one under a cowl, or slits.
    function drawGlowEyes(L, h, r, fx, fy, n, u) {
      const ex = h.x + fx * r * 0.42, ey = h.y + r * 0.16;
      const gap = r * 0.3 * Math.max(0.35, Math.abs(fy));
      const flick = L.faceless ? 0.75 + 0.25 * Math.sin(V.time * 17 + hashId(u.id)) : 1;
      const xs = n === 1 ? [ex + gap * 0.6] : [ex - gap, ex + gap];
      for (const x of xs) {
        ctx.fillStyle = rgba(L.eye, 0.22 * flick);
        ctx.beginPath(); ctx.ellipse(x, ey, r * 0.55, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = L.eye;
        ctx.beginPath();
        if (L.faceless) { ctx.moveTo(x - r * 0.3, ey - r * 0.08); ctx.lineTo(x + r * 0.3, ey - r * 0.02 * (x < ex ? -1 : 1) - r * 0.06); ctx.lineTo(x + r * 0.05, ey + r * 0.06); ctx.closePath(); }
        else ctx.ellipse(x, ey, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff3f0';
        ctx.beginPath(); ctx.arc(x, ey - r * 0.01, Math.max(0.8, r * 0.05), 0, Math.PI * 2); ctx.fill();
      }
    }

    function drawHair(u, L, h, r, fx, fy, towardCam, flash, hairTail) {
      if (L.hair === 'bald') {
        if (!flash) { ctx.fillStyle = 'rgba(20,14,12,0.35)'; ctx.beginPath(); ctx.ellipse(h.x - fx * r * 0.2, h.y - r * 0.35, r * 0.8, r * 0.5, 0, Math.PI, 0); ctx.fill(); }
        return;
      }
      const helm = L.hair === 'helm';
      const hood = L.hair === 'hood';
      const bob = L.hair === 'bob';
      const src = helm ? L.armor : hood && L.hood ? L.hood : L.hairC;
      const c = flash ? [lighten(src[0]), lighten(src[0])] : src;
      // Hair mass sits on top and toward the back of the head (away from the face).
      const bx = h.x - fx * r * (helm ? 0.05 : 0.25), by = h.y - r * (helm ? 0.18 : 0.28);
      const spikes = L.hair === 'spiky' ? 7 : L.hair === 'messy' ? 8 : L.hair === 'long' ? 9 : 6;
      const pts = [];
      const cowl = L.cowl ? 1.12 : 1;
      for (let i = 0; i <= spikes; i++) {
        const a = Math.PI + (i / spikes) * Math.PI; // across the top
        const spike = L.hair === 'short' || L.hair === 'long' || hood || helm || bob ? 1.0 : i % 2 ? 1.0 : 1.32;
        const rr = r * (hood ? 1.2 * cowl : helm ? 1.04 : bob ? 1.1 : 1.05) * spike;
        pts.push({ x: bx + Math.cos(a) * rr, y: by + Math.sin(a) * rr * 0.95 * (hood && L.cowl ? 1.15 : 1) });
      }
      if (hood && L.cowl) {
        // a peaked cowl
        const mid = pts[Math.floor(spikes / 2)];
        mid.y -= r * 0.25; mid.x -= fx * r * 0.2;
      }
      // Bangs falling over the forehead on the face side.
      const bangs = [];
      if (!hood && !helm) {
        const n = 4;
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          const x = h.x - r * 0.95 + t * r * 1.9 + fx * r * 0.2;
          bangs.push({ x, y: h.y - r * 0.6 }, { x: x + fx * r * 0.18 + (i % 2 ? 2 : -2), y: h.y + (towardCam ? -r * 0.05 : r * 0.2) + (i % 2) * r * 0.15 });
        }
      }
      const drop = hood ? (L.cowl ? 1.25 : 0.9) : bob ? 1.05 : helm ? 0.4 : 0.35;
      ctx.lineJoin = 'miter';
      const massPath = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y + r * drop);
        if (bob) ctx.lineTo(pts[0].x + r * 0.15, pts[0].y + r * drop + r * 0.12);
        for (const q of pts) ctx.lineTo(q.x, q.y);
        if (bob) ctx.lineTo(pts[pts.length - 1].x - r * 0.15, pts[pts.length - 1].y + r * drop + r * 0.12);
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y + r * drop);
        if (hood && L.cowl) {
          // the cowl's opening frames the shadowed face
          ctx.lineTo(h.x + r * 0.62 + fx * r * 0.3, h.y + r * 0.85);
          ctx.lineTo(h.x + r * 0.5 + fx * r * 0.35, h.y - r * 0.25);
          ctx.quadraticCurveTo(h.x + fx * r * 0.4, h.y - r * 0.7, h.x - r * 0.5 + fx * r * 0.35, h.y - r * 0.25);
          ctx.lineTo(h.x - r * 0.62 + fx * r * 0.3, h.y + r * 0.85);
        }
        if (!hood && !helm) for (let i = bangs.length - 1; i >= 0; i -= 2) { ctx.lineTo(bangs[i].x, bangs[i].y); ctx.lineTo(bangs[i - 1].x, bangs[i - 1].y); }
        ctx.closePath();
      };
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 2;
      massPath(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = c[0]; massPath(); ctx.fill();
      if (!flash) {
        ctx.save(); massPath(); ctx.clip();
        ctx.fillStyle = c[1];
        ctx.beginPath(); ctx.ellipse(bx - lx * r * 1.1, by - ly * r * 0.6 + r * 0.3, r * 1.1, r * 1.0, 0, 0, Math.PI * 2); ctx.fill();
        // A glossy highlight band, anime style.
        if (V.cam.sc > 45) {
          ctx.strokeStyle = L.hair === 'long' || helm ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.22)';
          ctx.lineWidth = Math.max(1, r * 0.12);
          ctx.beginPath(); ctx.arc(bx + lx * r * 0.2, by + r * 0.05, r * 0.7, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
        }
        ctx.restore();
      }
      if (helm && !flash) {
        // brow band and a nasal guard
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, inkW);
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y + r * 0.3); ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y + r * 0.3); ctx.stroke();
        if (towardCam) {
          const nx = h.x + fx * r * 0.42;
          layer([{ ...seg({ x: nx, y: h.y - r * 0.5 }, { x: nx, y: h.y + r * 0.35 }, r * 0.12, r * 0.09), c: L.armor, rim: false }], false);
        }
      }
      if (L.hair === 'long' && V.cam.sc > 45 && !flash) {
        // Strand lines down the long hair.
        const t = hairTail;
        ctx.strokeStyle = 'rgba(120,104,140,0.7)'; ctx.lineWidth = Math.max(0.8, r * 0.07);
        ctx.beginPath();
        for (const o of [-0.5, 0, 0.5]) {
          ctx.moveTo(t.pb.x + o * r, t.pb.y); ctx.quadraticCurveTo(t.pm.x + o * r * 1.1, t.pm.y, t.pt.x + o * r * 0.3, t.pt.y);
        }
        ctx.stroke();
      }
    }

    // ---------------------------------------------------------------- weapons
    function drawWeapon(G) {
      const { u, L, S, sc, px, tipW, flash } = G;
      if (!tipW) return;
      if (L.weapon === 'branch' && !u.armed) return;
      const h = S.handR, t = P(tipW.x, tipW.y, tipW.z);
      const dx = t.x - h.x, dy = t.y - h.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, ux = dx / l, uy = dy / l;
      switch (L.weapon) {
        case 'branch': {
          layer([{ ...seg(h, t, px * 0.55, px * 0.32), c: ['#6b4c33', '#3a281a'] }], flash);
          // a twig
          const m = { x: h.x + dx * 0.6, y: h.y + dy * 0.6 };
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, px * 0.3);
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + dy * 0.12, m.y - dx * 0.12); ctx.stroke();
          return;
        }
        case 'hammer': {
          // haft, then a squared head across the tip
          layer([{ ...seg({ x: h.x - ux * px * 0.9, y: h.y - uy * px * 0.9 }, t, px * 0.3, px * 0.3), c: ['#5a3f2a', '#2e2015'] }], flash);
          const hw = Math.max(3, px * 0.95), hl = Math.max(4, px * 1.7);
          const head = [
            { x: t.x + nx * hl - ux * hw, y: t.y + ny * hl - uy * hw }, { x: t.x + nx * hl + ux * hw, y: t.y + ny * hl + uy * hw },
            { x: t.x - nx * hl * 0.8 + ux * hw, y: t.y - ny * hl * 0.8 + uy * hw }, { x: t.x - nx * hl * 0.8 - ux * hw, y: t.y - ny * hl * 0.8 - uy * hw },
          ];
          layer([{ kind: 'poly', pts: head, c: ['#8f99a4', '#454c55'], shadeFrom: [1, 2, 3] }], flash);
          return;
        }
        case 'spear': {
          // shaft runs back past the hand; leaf blade at the tip
          const butt = { x: h.x - dx * 0.35, y: h.y - dy * 0.35 };
          const neck = { x: t.x - ux * px * 1.8, y: t.y - uy * px * 1.8 };
          layer([{ ...seg(butt, neck, px * 0.24, px * 0.22), c: ['#7a5a3c', '#3e2c1d'] }], flash);
          const bw = Math.max(2, px * 0.5);
          const blade = () => { ctx.beginPath(); ctx.moveTo(neck.x - ux * px * 0.3, neck.y - uy * px * 0.3); ctx.lineTo(neck.x + nx * bw + ux * px * 0.6, neck.y + ny * bw + uy * px * 0.6); ctx.lineTo(t.x + ux * px * 0.9, t.y + uy * px * 0.9); ctx.lineTo(neck.x - nx * bw + ux * px * 0.6, neck.y - ny * bw + uy * px * 0.6); ctx.closePath(); };
          ctx.lineJoin = 'miter';
          ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 1.6; blade(); ctx.stroke(); ctx.fill();
          ctx.fillStyle = flash ? '#fff' : '#a6a49a'; blade(); ctx.fill();
          if (!flash) {
            // binding and a rag tied below the head
            ctx.strokeStyle = '#8e1621'; ctx.lineWidth = Math.max(1.2, px * 0.35);
            ctx.beginPath(); ctx.moveTo(neck.x - ux * px * 0.5, neck.y - uy * px * 0.5); ctx.lineTo(neck.x - ux * px * 0.5 - ny * px * 0.2 + nx * px * 1.4, neck.y - uy * px * 0.5 + px * 1.2); ctx.stroke();
          }
          return;
        }
        case 'beam': {
          // A heavy timber from the loading frame, with iron brackets.
          const back = { x: h.x - ux * px * 0.6, y: h.y - uy * px * 0.6 };
          layer([{ ...seg(back, t, px * 0.55, px * 0.7), c: ['#6e5236', '#3a2a1a'] }], flash);
          if (!flash) {
            ctx.lineCap = 'butt';
            for (const k of [0.62, 0.93]) {
              const m = { x: back.x + (t.x - back.x) * k, y: back.y + (t.y - back.y) * k };
              const w = px * (0.55 + 0.15 * k) + inkW;
              ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, px * 0.45);
              ctx.beginPath(); ctx.moveTo(m.x + nx * w, m.y + ny * w); ctx.lineTo(m.x - nx * w, m.y - ny * w); ctx.stroke();
              ctx.strokeStyle = '#5b5f66'; ctx.lineWidth = Math.max(1.5, px * 0.25);
              ctx.beginPath(); ctx.moveTo(m.x + nx * w * 0.9, m.y + ny * w * 0.9); ctx.lineTo(m.x - nx * w * 0.9, m.y - ny * w * 0.9); ctx.stroke();
            }
            // grain
            ctx.strokeStyle = 'rgba(20,12,8,0.45)'; ctx.lineWidth = Math.max(0.8, inkW * 0.5);
            ctx.beginPath(); ctx.moveTo(back.x + (t.x - back.x) * 0.15 + nx * px * 0.2, back.y + (t.y - back.y) * 0.15 + ny * px * 0.2); ctx.lineTo(back.x + (t.x - back.x) * 0.55 + nx * px * 0.25, back.y + (t.y - back.y) * 0.55 + ny * px * 0.25); ctx.stroke();
            ctx.lineCap = 'round';
          }
          return;
        }
        case 'claws': {
          // Shadow talons from both hands.
          for (const hand of [S.handR, S.handL]) {
            const ax = hand === S.handR ? ux : (S.handL.x - S.elL.x), ay = hand === S.handR ? uy : (S.handL.y - S.elL.y);
            const al = Math.hypot(ax, ay) || 1;
            talons(hand, ax / al, ay / al, px * 2.2, flash);
          }
          return;
        }
      }
      // Blades: a tapered sliver with a bright edge.
      const kind = L.weapon;
      const bw = Math.max(1.5, px * (kind === 'sword' ? 0.42 : kind === 'greatsword' ? 0.95 : 0.38));
      const g = { x: h.x + dx * 0.1, y: h.y + dy * 0.1 };
      ctx.lineJoin = 'miter';
      let blade;
      if (kind === 'greatsword') {
        // broad and snapped off: a jagged end instead of a point
        const b1 = { x: g.x + dx * 0.78, y: g.y + dy * 0.78 }, b2 = { x: g.x + dx * 0.9, y: g.y + dy * 0.9 };
        blade = () => {
          ctx.beginPath(); ctx.moveTo(g.x + nx * bw, g.y + ny * bw);
          ctx.lineTo(b2.x + nx * bw * 0.9, b2.y + ny * bw * 0.9);
          ctx.lineTo(b1.x + nx * bw * 0.25, b1.y + ny * bw * 0.25);
          ctx.lineTo(b2.x - nx * bw * 0.35, b2.y - ny * bw * 0.35);
          ctx.lineTo(b1.x - nx * bw * 0.9, b1.y - ny * bw * 0.9);
          ctx.lineTo(g.x - nx * bw, g.y - ny * bw); ctx.closePath();
        };
      } else {
        blade = () => { ctx.beginPath(); ctx.moveTo(g.x + nx * bw, g.y + ny * bw); ctx.lineTo(t.x, t.y); ctx.lineTo(g.x - nx * bw, g.y - ny * bw); ctx.closePath(); };
      }
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 1.6; blade(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = flash ? '#ffffff' : kind === 'greatsword' ? '#dcd8da' : '#c9d2da'; blade(); ctx.fill();
      if (!flash) {
        ctx.save(); blade(); ctx.clip();
        ctx.fillStyle = kind === 'greatsword' ? '#7a7176' : '#6d7782';
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(t.x, t.y); ctx.lineTo(t.x - nx * bw * 2, t.y - ny * bw * 2); ctx.lineTo(g.x - nx * bw * 2, g.y - ny * bw * 2); ctx.closePath(); ctx.fill();
        ctx.restore();
        const edge = kind === 'greatsword' ? 0.86 : 1;
        ctx.strokeStyle = kind === 'greatsword' || kind === 'twin' ? '#ff5a68' : '#ffffff'; ctx.lineWidth = Math.max(0.8, bw * (kind === 'greatsword' ? 0.18 : 0.3));
        ctx.beginPath(); ctx.moveTo(g.x + nx * bw * 0.6, g.y + ny * bw * 0.6); ctx.lineTo(g.x + dx * edge * 0.88 + nx * bw * 0.4, g.y + dy * edge * 0.88 + ny * bw * 0.4); ctx.stroke();
      }
      if (kind === 'sword' || kind === 'greatsword') {
        // cross-guard and grip
        const k = kind === 'greatsword' ? 1.7 : 3;
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, px * 0.75); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(g.x + nx * bw * k, g.y + ny * bw * k); ctx.lineTo(g.x - nx * bw * k, g.y - ny * bw * k); ctx.stroke();
        ctx.strokeStyle = kind === 'greatsword' ? '#8e1621' : '#8a8f96'; ctx.lineWidth = Math.max(1, px * 0.4);
        ctx.beginPath(); ctx.moveTo(g.x + nx * bw * k * 0.87, g.y + ny * bw * k * 0.87); ctx.lineTo(g.x - nx * bw * k * 0.87, g.y - ny * bw * k * 0.87); ctx.stroke();
        if (kind === 'greatsword') {
          // long wrapped grip behind the guard
          const pm = { x: h.x - ux * px * 1.6, y: h.y - uy * px * 1.6 };
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, px * 0.55);
          ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(pm.x, pm.y); ctx.stroke();
          ctx.strokeStyle = '#43171b'; ctx.lineWidth = Math.max(1, px * 0.3);
          ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(pm.x, pm.y); ctx.stroke();
        }
      }
    }

    function talons(hand, ux, uy, len, flash) {
      const nx = -uy, ny = ux;
      ctx.lineJoin = 'miter';
      const path = () => {
        ctx.beginPath();
        for (const o of [-0.45, 0, 0.45]) {
          const bx = hand.x + nx * o * len * 0.35, by = hand.y + ny * o * len * 0.35;
          ctx.moveTo(bx + nx * len * 0.07, by + ny * len * 0.07);
          ctx.lineTo(bx + ux * len + nx * o * len * 0.3, by + uy * len + ny * o * len * 0.3);
          ctx.lineTo(bx - nx * len * 0.07, by - ny * len * 0.07);
          ctx.closePath();
        }
      };
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 1.4; path(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = flash ? '#fff' : '#3a2650'; path(); ctx.fill();
      if (!flash) {
        ctx.strokeStyle = 'rgba(255,58,76,0.8)'; ctx.lineWidth = Math.max(0.7, inkW * 0.45);
        ctx.beginPath();
        for (const o of [-0.45, 0, 0.45]) { const bx = hand.x + nx * o * len * 0.35, by = hand.y + ny * o * len * 0.35; ctx.moveTo(bx, by); ctx.lineTo(bx + ux * len * 0.85 + nx * o * len * 0.26, by + uy * len * 0.85 + ny * o * len * 0.26); }
        ctx.stroke();
      }
    }

    // The off hand's item: a second blade, or the bow.
    function drawOffHand(G) {
      const { u, L, S, F, px, handL, elL, flash, bowDraw, H, cz } = G;
      if (L.weapon === 'twin') {
        // reverse grip: the blade runs back along the forearm
        const dx = handL.x - elL.x, dy = handL.y - elL.y, dz = handL.z - elL.z, l = Math.hypot(dx, dy, dz) || 1;
        const k = 0.42;
        const tip = P(handL.x - dx / l * k + F[0] * 0.04, handL.y - dy / l * k + F[1] * 0.04, handL.z - dz / l * k - 0.06);
        const h = S.handL;
        const tx = tip.x - h.x, ty = tip.y - h.y, tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
        const bw = Math.max(1.5, px * 0.36);
        const blade = () => { ctx.beginPath(); ctx.moveTo(h.x + nx * bw, h.y + ny * bw); ctx.lineTo(tip.x, tip.y); ctx.lineTo(h.x - nx * bw, h.y - ny * bw); ctx.closePath(); };
        ctx.lineJoin = 'miter';
        ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 1.6; blade(); ctx.stroke(); ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#c9d2da'; blade(); ctx.fill();
        if (!flash) {
          ctx.strokeStyle = '#ff5a68'; ctx.lineWidth = Math.max(0.8, bw * 0.3);
          ctx.beginPath(); ctx.moveTo(h.x + nx * bw * 0.5, h.y + ny * bw * 0.5); ctx.lineTo(tip.x, tip.y); ctx.stroke();
        }
      } else if (L.weapon === 'bow') {
        // A rough wooden bow, upright in the bow hand; the string runs to the
        // drawing hand while it pulls.
        const len = 0.5 * Math.max(0.8, L.h);
        const bend = 0.12 + bowDraw * 0.1;
        const top = P(handL.x + F[0] * bend, handL.y + F[1] * bend, handL.z + len);
        const bot = P(handL.x + F[0] * bend, handL.y + F[1] * bend, handL.z - len);
        const h = S.handL;
        const tTop = P(handL.x - F[0] * 0.02, handL.y - F[1] * 0.02, handL.z + len * 0.95);
        const tBot = P(handL.x - F[0] * 0.02, handL.y - F[1] * 0.02, handL.z - len * 0.95);
        const string = bowDraw > 0.05 ? S.handR : { x: (tTop.x + tBot.x) / 2, y: (tTop.y + tBot.y) / 2 };
        if (!flash) {
          ctx.strokeStyle = 'rgba(230,220,200,0.8)'; ctx.lineWidth = Math.max(0.8, inkW * 0.5);
          ctx.beginPath(); ctx.moveTo(tTop.x, tTop.y); ctx.lineTo(string.x, string.y); ctx.lineTo(tBot.x, tBot.y); ctx.stroke();
        }
        const limb = () => {
          ctx.beginPath(); ctx.moveTo(tTop.x, tTop.y);
          ctx.quadraticCurveTo(top.x, top.y + (h.y - top.y) * 0.3, h.x + (top.x - h.x) * 0.4, h.y);
          ctx.quadraticCurveTo(bot.x, bot.y - (bot.y - h.y) * 0.3, tBot.x, tBot.y);
        };
        ctx.lineCap = 'round';
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, px * 0.7); limb(); ctx.stroke();
        ctx.strokeStyle = flash ? '#fff' : '#7a5a3c'; ctx.lineWidth = Math.max(1.5, px * 0.35); limb(); ctx.stroke();
        if (bowDraw > 0.05 && !flash) {
          // the nocked arrow
          const head = P(handL.x + F[0] * 0.14, handL.y + F[1] * 0.14, handL.z);
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, px * 0.3);
          ctx.beginPath(); ctx.moveTo(S.handR.x, S.handR.y); ctx.lineTo(head.x, head.y); ctx.stroke();
          ctx.strokeStyle = '#c8b090'; ctx.lineWidth = Math.max(1, px * 0.14);
          ctx.beginPath(); ctx.moveTo(S.handR.x, S.handR.y); ctx.lineTo(head.x, head.y); ctx.stroke();
          ctx.fillStyle = '#c9d2da'; ctx.beginPath(); ctx.arc(head.x, head.y, Math.max(1.2, px * 0.22), 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // A round shield on the off arm: a disc facing forward, iron rim and boss.
    function drawShield(G) {
      const { L, F, Rt, handL, sc, flash, ps } = G;
      const sh = L.shield;
      const R = sh.r;
      const c = { x: handL.x + F[0] * 0.06, y: handL.y + F[1] * 0.06, z: handL.z };
      // tilt it a little across the body
      const ax = [Rt[0], Rt[1]];
      const n = 16, pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const ca = Math.cos(a) * R, sa = Math.sin(a) * R;
        pts.push(P(c.x + ax[0] * ca + F[0] * ca * 0.12, c.y + ax[1] * ca + F[1] * ca * 0.12, c.z + sa * 1.05));
      }
      // shade the half away from the light (screen space)
      let best = 0, bd = -1e9;
      for (let i = 0; i < n; i++) { const d = -(pts[i].x * lx + pts[i].y * ly); if (d > bd) { bd = d; best = i; } }
      const half = []; for (let i = -4; i <= 4; i++) half.push((best + i + n) % n);
      layer([{ kind: 'poly', pts, c: sh.c, shadeFrom: half }], flash);
      if (flash) return;
      // planks
      const cc = P(c.x, c.y, c.z);
      ctx.save(); ctx.beginPath(); pathPoly(pts); ctx.clip();
      ctx.strokeStyle = 'rgba(12,8,8,0.55)'; ctx.lineWidth = Math.max(1, inkW * 0.6);
      ctx.beginPath();
      for (const o of [-0.5, 0, 0.5]) {
        const a = P(c.x + ax[0] * R * o, c.y + ax[1] * R * o, c.z + R * 1.1), b = P(c.x + ax[0] * R * o, c.y + ax[1] * R * o, c.z - R * 1.1);
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
      ctx.restore();
      // iron rim
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.5, sc * 0.06); ctx.lineJoin = 'round';
      ctx.beginPath(); pathPoly(pts); ctx.stroke();
      ctx.strokeStyle = sh.rimC; ctx.lineWidth = Math.max(1.2, sc * 0.03);
      ctx.beginPath(); pathPoly(pts); ctx.stroke();
      // boss
      const bx = pts[0].x - cc.x, by = pts[4].y - cc.y;
      const brx = Math.max(2, Math.abs(bx) * 0.3), bry = Math.max(2, Math.abs(by) * 0.3);
      layer([{ kind: 'ell', x: cc.x, y: cc.y, rx: Math.max(brx, bry * 0.4), ry: bry, c: sh.boss }], false);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(cc.x + lx * brx * 0.35, cc.y + ly * bry * 0.35, Math.max(0.8, bry * 0.22), 0, Math.PI * 2); ctx.fill();
      void ps;
    }

    // Violet glyph circles on the casting hands; brighter while charging.
    function drawGlyphHands(G) {
      const { u, L, S, sc, flash } = G;
      const AK = attackK(u);
      const casting = u.state === 'cast' || AK || (V.introPhase && G.ps.off === 'cast');
      const hands = L.glyphHands === 'both' ? [S.handL, S.handR] : [S.handL];
      if (AK && L.glyphHands !== 'both') hands.push(S.handR);
      const k = AK ? (AK.ph === 'wind' ? AK.e : AK.ph === 'strike' ? 1.2 : 1 - AK.e) : casting ? 0.8 : 0.25;
      const t = V.time;
      for (let i = 0; i < hands.length; i++) {
        const hd = hands[i];
        const main = AK ? hd === S.handR : hd === S.handL;
        const r = sc * (main ? 0.1 + 0.1 * k : 0.08 + 0.04 * k);
        const a = (main ? 0.45 + 0.5 * Math.min(1, k) : 0.35 + 0.3 * Math.min(1, k)) * (flash ? 0.5 : 1);
        ctx.fillStyle = rgba(L.glyph, (0.16 * a).toFixed(2));
        ctx.beginPath(); ctx.arc(hd.x, hd.y, r * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = rgba(L.glyph, a.toFixed(2)); ctx.lineWidth = Math.max(1, r * 0.12);
        ctx.beginPath(); ctx.ellipse(hd.x, hd.y, r, r * 0.92, 0, 0, Math.PI * 2); ctx.stroke();
        if (r > 4) {
          // inner ring with rune ticks, turning
          ctx.beginPath(); ctx.ellipse(hd.x, hd.y, r * 0.62, r * 0.57, 0, 0, Math.PI * 2);
          const rot = t * (i ? -1.6 : 1.2);
          for (let j = 0; j < 6; j++) {
            const q = rot + (j / 6) * Math.PI * 2;
            ctx.moveTo(hd.x + Math.cos(q) * r * 0.62, hd.y + Math.sin(q) * r * 0.57);
            ctx.lineTo(hd.x + Math.cos(q + 0.35) * r * 0.95, hd.y + Math.sin(q + 0.35) * r * 0.88);
          }
          ctx.stroke();
        }
        ctx.fillStyle = rgba('#f4eeff', Math.min(1, a + 0.2).toFixed(2));
        ctx.beginPath(); ctx.arc(hd.x, hd.y, Math.max(1, r * 0.16), 0, Math.PI * 2); ctx.fill();
      }
    }

    // Jagged dark shards breaking off a fragment's silhouette.
    function drawShards(G) {
      const { u, L, S, px, flash } = G;
      const step = Math.floor(V.time * 8 + hashId(u.id)) % 4; // flickers in steps
      const anchors = [[S.shL, -1, -1.2], [S.shR, 1, -1.1], [S.pelvis, -1, 0.6], [S.chest, 1, 0.2], [S.head, 1, -1.6], [S.kneeL, -1, 0.4]];
      const shapes = [];
      anchors.forEach(([q, sgn, up], i) => {
        if ((i + step) % 4 === 0) return;
        const len = px * (2.4 + ((i * 5 + step) % 3) * 0.9);
        const ax = sgn * 0.9, ay = up * 0.5;
        const l = Math.hypot(ax, ay);
        const ux = ax / l, uy = ay / l, nx = -uy, ny = ux;
        shapes.push({ kind: 'poly', pts: [
          { x: q.x + nx * px * 0.5, y: q.y + ny * px * 0.5 },
          { x: q.x + ux * len * 0.55 + nx * px * 0.5, y: q.y + uy * len * 0.55 + ny * px * 0.5 },
          { x: q.x + ux * len, y: q.y + uy * len },
          { x: q.x + ux * len * 0.35 - nx * px * 0.35, y: q.y + uy * len * 0.35 - ny * px * 0.35 },
          { x: q.x - nx * px * 0.5, y: q.y - ny * px * 0.5 },
        ], c: L.shards, shadeFrom: [2, 3, 4] });
      });
      layer(shapes, flash);
      if (!flash) {
        ctx.strokeStyle = 'rgba(227,38,58,0.55)'; ctx.lineWidth = Math.max(0.8, inkW * 0.5);
        ctx.beginPath();
        for (const sh of shapes) { const q = sh.pts; ctx.moveTo(q[1].x, q[1].y); ctx.lineTo(q[2].x, q[2].y); }
        ctx.stroke();
        // a red seam glowing through the body
        ctx.strokeStyle = 'rgba(227,38,58,0.65)'; ctx.lineWidth = Math.max(0.8, px * 0.18); ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(S.neck.x, S.neck.y + px * 0.6);
        ctx.lineTo(S.chest.x + px * 0.5, S.chest.y);
        ctx.lineTo(S.chest.x - px * 0.3, (S.chest.y + S.pelvis.y) / 2);
        ctx.lineTo(S.pelvis.x + px * 0.2, S.pelvis.y);
        ctx.stroke();
      }
    }

    // ---------------------------------------------------------------- the Unseen
    // Never shown whole: a towering shroud of darkness with a halo of light,
    // a rift down its centre and many glowing points. Long sleeves reach out
    // as arms; the wind-up raises them, the strike brings them crashing down.
    function drawVeil(u, L, sc) {
      const H = 1.78 * L.h;
      const sp = spring(u);
      const t = V.time + hashId(u.id) * 0.1;
      const f = u.facing, F = [Math.cos(f), Math.sin(f)], Rt = [-F[1], F[0]];
      const W = (x, y, z) => P(u.x + F[0] * x + Rt[0] * y, u.y + F[1] * x + Rt[1] * y, z);
      const flash = u.flash > 0;
      V.shadow(u.x, u.y, u.r * 1.6, 0.5);
      const AK = attackK(u);
      let raise = 0, slam = 0;
      if (AK) { if (AK.ph === 'wind') raise = AK.e; else if (AK.ph === 'strike') slam = 1; else slam = 1 - AK.e; }
      const hurt = u.state === 'hurt' || u.state === 'stagger' ? Math.sin(u.st * 50) * 0.04 : 0;
      const breathe = Math.sin(t * 1.3) * 0.04;
      const lean = 0.1 * slam - 0.08 * raise + hurt;
      ctx.globalAlpha = u.state === 'out' ? 0.6 : 1;

      // Halo / rift of light behind the head.
      const hc = W(lean * 0.9 - 0.08, 0, H * (0.86 + breathe * 0.2));
      const hr = sc * 0.62;
      if (!flash) {
        ctx.fillStyle = 'rgba(237,202,192,0.07)';
        ctx.beginPath(); ctx.ellipse(hc.x, hc.y, hr * 1.25, hr * 1.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(246,240,236,0.85)'; ctx.lineWidth = Math.max(1.5, sc * 0.035);
        ctx.beginPath(); ctx.ellipse(hc.x, hc.y, hr, hr * 1.08, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(227,38,58,0.7)'; ctx.lineWidth = Math.max(1, sc * 0.018);
        ctx.beginPath(); ctx.ellipse(hc.x, hc.y, hr * 0.82, hr * 0.88, 0, 0, Math.PI * 2); ctx.stroke();
        // shards of light radiating, turning slowly
        ctx.fillStyle = 'rgba(246,240,236,0.8)';
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = t * 0.25 + (i / 12) * Math.PI * 2, l1 = hr * 1.08, l2 = hr * (1.3 + (i % 3) * 0.18), w = 0.04;
          ctx.moveTo(hc.x + Math.cos(a - w) * l1, hc.y + Math.sin(a - w) * l1 * 1.08);
          ctx.lineTo(hc.x + Math.cos(a) * l2, hc.y + Math.sin(a) * l2 * 1.08);
          ctx.lineTo(hc.x + Math.cos(a + w) * l1, hc.y + Math.sin(a + w) * l1 * 1.08);
          ctx.closePath();
        }
        ctx.fill();
      }

      // Arms: long sleeves from the shoulders.
      const shZ = H * 0.74;
      const armPts = (side) => {
        const sh = W(lean * 0.6, side * 0.42, shZ);
        let hand;
        if (raise > 0) hand = W(0.2 + lean, side * (0.7 - 0.2 * raise), shZ + 0.2 + raise * 1.0);
        else if (slam > 0) hand = W(1.2 * slam + 0.3, side * 0.35, 0.3 + (1 - slam) * 0.6);
        else hand = W(0.32 + Math.sin(t * 1.1 + side) * 0.05, side * 0.68, H * 0.32 + Math.sin(t * 0.9 + side) * 0.05);
        const el = W(lean * 0.5 + (raise > 0 ? 0.1 : 0.25), side * 0.7, (sh.z == null ? shZ : shZ) * 0.5 + (raise > 0 ? H * 0.35 + raise * 0.3 : slam > 0 ? 0.6 : H * 0.12));
        return { sh, el, hand };
      };
      const shroud = ['#160d1a', '#07050a'];
      const arms = [armPts(-1), armPts(1)];
      const armShapes = (a) => [
        { ...seg(a.sh, a.el, sc * 0.2, sc * 0.16), c: shroud, rim: false },
        { ...seg(a.el, a.hand, sc * 0.16, sc * 0.09), c: shroud, rim: false },
      ];
      // far arm first
      const rightNear = arms[1].sh.d > arms[0].sh.d;
      const farA = rightNear ? arms[0] : arms[1], nearA = rightNear ? arms[1] : arms[0];
      layer(armShapes(farA), flash);
      if (!flash) veilClaws(farA, sc);

      // The shroud: wide hem, narrow shoulders, a peaked hood; the hem tears
      // and drifts.
      const base = P(u.x, u.y, 0);
      const pts = [];
      const n = 9;
      const hemW = 0.95, shW = 0.48;
      pts.push(W(lean * 0.6, -shW, shZ));
      pts.push(W(lean * 0.8 - 0.05, -0.3, H * 0.84));
      pts.push(W(lean * 0.9 - 0.06, -0.22, H * 0.95));
      pts.push(W(lean * 0.95 - 0.12, 0.02, H * 1.03 + breathe * 0.3));
      pts.push(W(lean * 0.9 - 0.06, 0.22, H * 0.95));
      pts.push(W(lean * 0.8 - 0.05, 0.3, H * 0.84));
      pts.push(W(lean * 0.6, shW, shZ));
      for (let i = 0; i <= n; i++) {
        const k = i / n, side = 1 - 2 * k;
        const torn = i % 2 ? 0.0 : 0.12 + 0.08 * Math.sin(t * 2 + i * 1.7);
        const drift = Math.sin(t * 1.6 + i * 0.9) * 0.08;
        pts.push(P(u.x + Rt[0] * side * hemW + F[0] * drift + sp.cx * 1.5, u.y + Rt[1] * side * hemW + F[1] * drift + sp.cy * 1.5, torn));
      }
      // shade: the side away from the light
      const lightRight = (pts[6].x - pts[0].x) * lx + (pts[6].y - pts[0].y) * ly > 0;
      const shadeIdx = lightRight ? [0, 1, 2, 3, ...Array.from({ length: Math.ceil((n + 1) / 2) }, (_, j) => 7 + n - j).reverse()] : [3, 4, 5, 6, ...Array.from({ length: Math.ceil((n + 1) / 2) }, (_, j) => 7 + j)];
      layer([{ kind: 'poly', pts, c: shroud, shadeFrom: shadeIdx.length > 2 ? shadeIdx : null }], flash);
      if (!flash) {
        // Rim light on the lit edge, crimson on the dark one.
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(237,202,192,0.6)'; ctx.lineWidth = Math.max(1, sc * 0.02);
        const lit = lightRight ? [6, 5, 4, 3] : [0, 1, 2, 3];
        ctx.beginPath(); lit.forEach((i, j) => (j ? ctx.lineTo(pts[i].x, pts[i].y) : ctx.moveTo(pts[i].x, pts[i].y))); ctx.stroke();
        ctx.strokeStyle = 'rgba(227,38,58,0.45)';
        const dark = lightRight ? [0, 1, 2] : [6, 5, 4];
        ctx.beginPath(); dark.forEach((i, j) => (j ? ctx.lineTo(pts[i].x, pts[i].y) : ctx.moveTo(pts[i].x, pts[i].y))); ctx.stroke();

        // The hood's void, with a cluster of light points for eyes.
        const face = W(lean * 0.95 + 0.04, 0, H * 0.9);
        ctx.fillStyle = '#020103';
        ctx.beginPath(); ctx.ellipse(face.x, face.y, sc * 0.15, sc * 0.2, 0, 0, Math.PI * 2); ctx.fill();
        const blink = Math.sin(t * 0.8) > 0.97 ? 0.2 : 1;
        for (const [ox, oy, rr, col] of [[-0.06, -0.02, 0.035, '#ffffff'], [0.06, -0.035, 0.028, '#ff4a5a'], [0.0, 0.07, 0.02, '#ffffff']]) {
          ctx.fillStyle = rgba(col, (0.25 * blink).toFixed(2));
          ctx.beginPath(); ctx.arc(face.x + ox * sc, face.y + oy * sc, rr * sc * 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = col; ctx.globalAlpha = blink;
          ctx.beginPath(); ctx.arc(face.x + ox * sc, face.y + oy * sc, Math.max(1, rr * sc), 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }

        // The rift: a jagged seam of light down the body.
        const rz = [H * 0.78, H * 0.66, H * 0.55, H * 0.42, H * 0.3, H * 0.16];
        const rp = rz.map((z, i) => W(lean * (z / H) * 0.7 + 0.05, (i % 2 ? 0.07 : -0.05) * (1 + Math.sin(t * 3 + i) * 0.3), z));
        const open = 0.6 + 0.4 * Math.sin(t * 2.1) + raise * 0.6;
        ctx.strokeStyle = rgba('#e3263a', 0.35); ctx.lineWidth = Math.max(2, sc * 0.09 * open);
        ctx.beginPath(); rp.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
        ctx.strokeStyle = '#f6f0ec'; ctx.lineWidth = Math.max(1, sc * 0.025 * open);
        ctx.beginPath(); rp.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();

        // Many glowing points scattered through the dark (batched per colour).
        const cols = ['#f6f0ec', '#a98bff', '#e3263a'];
        for (let pass = 0; pass < 2; pass++) {
          for (let ci = 0; ci < 3; ci++) {
            ctx.fillStyle = pass ? cols[ci] : rgba(cols[ci], 0.18);
            ctx.beginPath();
            for (let i = 0; i < 18; i++) {
              if ((i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0) !== ci) continue;
              const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + (i % 4) * 0.7) + i * 2.3);
              if (tw < 0.2) continue;
              const zk = (i * 0.618) % 1, sk = ((i * 0.377) % 1) * 2 - 1;
              const z = 0.15 + zk * H * 0.75;
              const wd = shW + (hemW - shW) * (1 - z / shZ) * 0.9;
              const q = W(lean * (z / H) * 0.7 + 0.12, sk * Math.max(0.15, wd) * 0.8, z);
              const rr = Math.max(0.8, sc * (0.012 + (i % 3) * 0.006) * tw) * (pass ? 1 : 3);
              ctx.moveTo(q.x + rr, q.y); ctx.arc(q.x, q.y, rr, 0, Math.PI * 2);
            }
            ctx.fill();
          }
        }
      }
      layer(armShapes(nearA), flash);
      if (!flash) veilClaws(nearA, sc);

      // Floating shards of light orbiting the figure.
      if (!flash) {
        ctx.fillStyle = 'rgba(246,240,236,0.85)'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, inkW);
        for (let i = 0; i < 5; i++) {
          const a = t * 0.5 + i * 1.257;
          const q = P(u.x + Math.cos(a) * 1.3, u.y + Math.sin(a) * 1.3 * 0.8, H * (0.35 + 0.12 * i) + Math.sin(t * 1.7 + i) * 0.1);
          const s2 = sc * (0.05 + (i % 2) * 0.03);
          ctx.beginPath(); ctx.moveTo(q.x, q.y - s2 * 1.6); ctx.lineTo(q.x + s2 * 0.6, q.y); ctx.lineTo(q.x, q.y + s2 * 1.6); ctx.lineTo(q.x - s2 * 0.6, q.y); ctx.closePath();
          ctx.stroke(); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      void base;
    }

    function veilClaws(a, sc) {
      // splayed fingers of light at the sleeve's end
      const dx = a.hand.x - a.el.x, dy = a.hand.y - a.el.y, l = Math.hypot(dx, dy) || 1;
      const ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
      ctx.strokeStyle = 'rgba(246,240,236,0.9)'; ctx.lineWidth = Math.max(1, sc * 0.02); ctx.lineCap = 'round';
      ctx.beginPath();
      for (const o of [-0.5, 0, 0.5]) {
        ctx.moveTo(a.hand.x, a.hand.y);
        ctx.lineTo(a.hand.x + (ux + nx * o) * sc * 0.28, a.hand.y + (uy + ny * o) * sc * 0.28);
      }
      ctx.stroke();
    }

    return { update, drawUnit, LOOK };
  }

  NS.fighters = { create, LOOK, pose };
})();
