// Bannerborn — weapon traits you can see. An enchanted weapon (fire, frost, storm, shadow, holy, poison) leaves a
// coloured trail on every swing, its own impact on every blow (a flame burst, ice shards, a bolt from the sky, a dark
// cross-cut, a pillar of light, a venom splash), links where the trait jumps (a chain of lightning to the next foe, a
// stream of light to the healed ally), and marks the foes it touched: burning bodies, frost crusts, venom bubbles,
// shadow wisps. Loaded after battle.js; battle.js calls in through optional hooks. Visual only: never touches the
// fight's random stream.
(function () {
  const BB = window.BB, B = BB.Battle.prototype, TAU = Math.PI * 2;
  const COL = {
    fire: ['#fff1a8', '#ffb347', '#ff5a1f'], frost: ['#ffffff', '#bfe9ff', '#5cb8ff'], storm: ['#ffffff', '#c8ffff', '#4cc9ff'],
    shadow: ['#e2ccff', '#8a5ae0', '#2a0f55'], holy: ['#fffbe0', '#ffe48a', '#ffbf3a'], poison: ['#eaffb0', '#a6f04a', '#3f8f1a'],
  };
  BB.TRAIT_COL = COL;
  const R = Math.random, fr = (x) => x - Math.floor(x);
  const rnd = (n) => fr(Math.sin(n * 127.1 + 311.7) * 43758.5453);
  function T(b) { return b.tr || (b.tr = { parts: [], fx: [] }); }
  const MAXP = 420;
  function part(b, o) { const P = T(b).parts; if (P.length < (BB.lowFx ? (BB.lowFx > 1 ? 90 : 200) : MAXP)) P.push(Object.assign({ z: 0.9, vx: 0, vy: 0, vz: 0, t: 0, life: 0.6, s: 1.4, grav: 0, add: true, kind: 'dot' }, o)); }
  function burst(b, e, n, o) {
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, sp = (o.sp || 2.5) * (0.35 + R());
      part(b, Object.assign({}, o, { x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: (o.up || 1.5) * (0.4 + R()), life: (o.life || 0.6) * (0.6 + R() * 0.7), col: o.cols ? o.cols[i % o.cols.length] : o.col }));
    }
  }

  // ---------------------------------------------------------------- hooks from battle.js
  B.onTrait = function (src, tgt, elem, dmg, crit) {
    if ((this.peaceful && !this.drill) || !COL[elem] || !tgt) return;
    const F = T(this), C = COL[elem], big = !(tgt.trCd > this.time) || crit;
    if (big) tgt.trCd = this.time + 0.22;
    const k = crit ? 1.5 : 1;
    switch (elem) {
      case 'fire':
        burst(this, tgt, big ? 12 : 4, { cols: C, sp: 1.6 * k, up: 3.2, life: 0.7, s: 1.8, kind: 'ember', grav: -1.5 });
        if (big) F.fx.push({ kind: 'flare', x: tgt.x, y: tgt.y, t: 0, dur: 0.32, k, col: C });
        break;
      case 'frost':
        burst(this, tgt, big ? 9 : 3, { cols: C, sp: 3.2 * k, up: 2.5, life: 0.55, s: 1.6, kind: 'shard', grav: 9 });
        if (big) F.fx.push({ kind: 'spikes', x: tgt.x, y: tgt.y, t: 0, dur: 0.5, k, rot: R() * TAU, col: C });
        break;
      case 'storm':
        burst(this, tgt, big ? 8 : 3, { cols: C, sp: 4 * k, up: 2, life: 0.3, s: 1.2, kind: 'spark' });
        if (big) F.fx.push({ kind: 'strike', x: tgt.x, y: tgt.y, t: 0, dur: 0.24, k, seed: R() * 99, col: C });
        break;
      case 'shadow':
        burst(this, tgt, big ? 8 : 3, { cols: [C[1], C[2], C[2]], sp: 1.2, up: 1.6, life: 0.8, s: 2.6, kind: 'wisp', add: false, grav: -1 });
        if (big) F.fx.push({ kind: 'cross', x: tgt.x, y: tgt.y, t: 0, dur: 0.3, k, rot: (R() - 0.5) * 0.6, col: C });
        break;
      case 'holy':
        burst(this, tgt, big ? 10 : 3, { cols: C, sp: 1.2, up: 3.5, life: 0.8, s: 1.3, kind: 'mote', grav: -2 });
        if (big) F.fx.push({ kind: 'pillar', x: tgt.x, y: tgt.y, t: 0, dur: 0.45, k, col: C });
        break;
      case 'poison':
        burst(this, tgt, big ? 11 : 4, { cols: C, sp: 2.4 * k, up: 3, life: 0.65, s: 1.7, kind: 'drop', grav: 8, add: false });
        if (big) F.fx.push({ kind: 'cloud', x: tgt.x, y: tgt.y, t: 0, dur: 0.7, k, col: C });
        break;
    }
  };
  B.traitLink = function (kind, a, b) {
    if (this.peaceful || !a || !b) return;
    T(this).fx.push({ kind: kind === 'storm' ? 'chain' : 'stream', x: a.x, y: a.y, x2: b.x, y2: b.y, t: 0, dur: kind === 'storm' ? 0.28 : 0.55, seed: R() * 99, col: COL[kind] });
  };
  B.updateTraits = function (dt) {
    const F = T(this);
    for (const p of F.parts) {
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.grav * dt;
      p.vx *= 1 - dt * 2.2; p.vy *= 1 - dt * 2.2;
      if (p.z < 0) { p.z = 0; p.vz = 0; p.vx *= 0.5; p.vy *= 0.5; }
    }
    F.parts = F.parts.filter((p) => p.t < p.life);
    for (const f of F.fx) f.t += dt;
    F.fx = F.fx.filter((f) => f.t < f.dur);
    if (this.peaceful) return;
    // enchanted shots leave a trail of their element
    for (const p of this.projs) if (p.elem && COL[p.elem] && p.side !== 'foe' && R() < dt * 40)
      part(this, { x: p.x, y: p.y, z: p.z || 0.9, vz: 0.3, life: 0.35, s: 1.5, col: COL[p.elem][R() < 0.5 ? 1 : 0], kind: p.elem === 'poison' ? 'drop' : p.elem === 'shadow' ? 'wisp' : 'dot', add: p.elem !== 'shadow' && p.elem !== 'poison', grav: p.elem === 'poison' ? 6 : 0 });
    // burning, frozen, poisoned foes shed their state
    for (const e of this.ents) {
      if (e.dead || !e.buffs) continue;
      if (e.buffs.burn > 0 && R() < dt * 9) part(this, { x: e.x + (R() - 0.5) * 0.3, y: e.y + (R() - 0.5) * 0.3, z: 0.4 + R() * 0.8, vz: 1.4 + R(), life: 0.6, s: 1.5, col: COL.fire[R() < 0.5 ? 1 : 2], kind: 'ember', grav: -1 });
      if (e.buffs.poison > 0 && R() < dt * 4 * (e.poisonN || 1)) part(this, { x: e.x + (R() - 0.5) * 0.35, y: e.y + (R() - 0.5) * 0.35, z: 0.3 + R() * 0.9, vz: 0.6, life: 0.9, s: 1.6, col: COL.poison[1], kind: 'bubble', grav: -0.4 });
      if (e.buffs.slow > 0 && R() < dt * 3) part(this, { x: e.x + (R() - 0.5) * 0.5, y: e.y + (R() - 0.5) * 0.5, z: 1.6, vz: -0.6, life: 1, s: 1.2, col: '#e8f8ff', kind: 'flake' });
    }
  };

  // ---------------------------------------------------------------- drawing
  const iso = (x, y) => BB.iso(x, y);
  // behind the body: the swing of an enchanted blade, a crescent in the element's colours
  B.drawTraitBack = function (g, e, x, y) {
    if (!e.ench || !(e.swingT > 0) || this.peaceful) return;
    const C = COL[e.ench]; if (!C) return;
    e.swingT -= 1 / 60; // the draw runs once a frame; good enough for a 0.28 s flourish
    const k = 1 - e.swingT / 0.28, sc = e.sc || 1, t = e.atkTgt;
    let ang;
    if (t && !t.dead) { const d = iso(t.x - e.x, t.y - e.y); ang = Math.atan2(d.y, d.x); } else ang = [0.5, 1.5, 2.6, -2.6, -1.6, -0.6, 3.1, 0][e.dir || 0] || 0;
    const flip = (e.swingN || 0) % 2 ? 1 : -1, cy = y - 18 * sc, r = 20 * sc, sweep = 2.4;
    const a0 = ang - flip * sweep / 2, a1 = a0 + flip * sweep * Math.min(1, k * 1.6);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const al = Math.max(0, 1 - Math.max(0, k - 0.5) * 2);
    for (let i = 0; i < 3; i++) {
      g.globalAlpha = al * [0.35, 0.6, 0.95][i]; g.strokeStyle = C[2 - i]; g.lineWidth = [7, 4, 1.6][i] * sc;
      g.beginPath(); g.ellipse(x, cy, r, r * 0.55, 0, Math.min(a0, a1), Math.max(a0, a1)); g.stroke();
    }
    g.restore();
  };
  // on the body: what the trait left on this one
  // Everything here is squares and sprites: a phone's canvas draws those by the thousand, and curves by the dozen.
  B.drawTrait = function (g, e, x, y) {
    if (!e.buffs || this.peaceful) return;
    const B = e.buffs; if (!(B.burn > 0 || B.slow > 0 || B.poison > 0 || B.rend > 0)) return;
    const sc = e.sc || 1, h = 40 * sc * (e.boss ? 1.25 : 1), t = this.time, s = (e.id ? e.id.length : 3) * 3.7 + (e.x * 7 | 0);
    const gc = g.globalCompositeOperation, ga = g.globalAlpha;
    g.globalCompositeOperation = 'lighter';
    if (B.burn > 0) { // on fire: the flame sprite over the body, embers shed by updateTraits
      BB.drawGlow(g, '255,130,40', x, y - h * 0.4, h * 0.65, h * 0.65, 0.45);
      const n = BB.fxLen('fire'); if (n) BB.drawFx(g, 'fire', Math.floor(t * 14 + s) % n, x, y - h * 0.42, 0.42 * sc * (e.boss ? 1.3 : 1), { add: true, alpha: 0.9 });
    }
    if (B.slow > 0) { // frost: a pale sheen and a crust of ice at the feet
      BB.drawGlow(g, '170,225,255', x, y - h * 0.35, 11 * sc, h * 0.55, 0.3 + Math.sin(t * 4 + s) * 0.06);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.9;
      for (let i = 0; i < 5; i++) { const px = x + (i - 2) * 3.4 * sc, hh = (3 + rnd(i + s) * 5) * sc; g.fillStyle = i % 2 ? '#e6f7ff' : '#8fd0ff'; g.fillRect(px - 1.1 * sc, y - hh + Math.abs(i - 2) * 0.8 * sc, 2.2 * sc, hh); }
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1;
    }
    if (B.poison > 0) { // venom: a sick green glow and its stacks over the head
      const n = e.poisonN || 1; BB.drawGlow(g, '135,228,55', x, y - h * 0.4, h * 0.6, h * 0.6, 0.16 + n * 0.1);
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < n; i++) { const px = x + (i - (n - 1) / 2) * 5 * sc, py = y - h - 6 * sc; g.fillStyle = '#1d3a0a'; g.fillRect(px - 2 * sc, py - 2 * sc, 4 * sc, 4 * sc); g.fillStyle = COL.poison[1]; g.fillRect(px - 1.2 * sc, py - 1.2 * sc, 2.4 * sc, 2.4 * sc); }
    }
    if (B.rend > 0) { // shadow: the wound stays open, dark smoke curling off it
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 4; i++) { const p = fr(t * 0.9 + rnd(i * 3 + s)), r = (2 + p * 3) * sc; g.globalAlpha = (1 - p) * 0.55 * Math.min(1, B.rend * 2); g.fillStyle = i % 2 ? '#2a0f55' : '#5a2fa8';
        g.fillRect(x + Math.sin(i * 4 + t * 2) * 6 * sc - r, y - h * 0.45 - p * h * 0.6 - r, r * 2, r * 2); }
    }
    g.globalCompositeOperation = gc; g.globalAlpha = ga;
  };
  // in the world: impacts, links and loose particles (drawn as squares, the glowing ones first, in two passes so the
  // blend mode changes twice a frame, not once a particle)
  B.drawTraitWorld = function (g) {
    const F = this.tr; if (!F) return;
    g.save();
    for (const f of F.fx) drawFx(g, f);
    for (let pass = 0; pass < 2; pass++) {
      g.globalCompositeOperation = pass ? 'source-over' : 'lighter';
      for (const p of F.parts) {
        if (!!p.add === !!pass) continue;
        const s = iso(p.x, p.y), y = s.y - p.z * 24, k = p.t / p.life, a = Math.max(0, 1 - k);
        let r = p.s, w = 0, hh = 0;
        switch (p.kind) {
          case 'shard': w = r * 1.1; hh = r * 2.6; break;
          case 'spark': w = r * 2.4; hh = r * 0.8; break;
          case 'wisp': r = p.s * (1 + k * 1.5); g.globalAlpha = a * 0.6; g.fillStyle = p.col; g.fillRect(s.x - r, y - r, r * 2, r * 2); continue;
          case 'bubble': r = p.s * (0.6 + k); g.globalAlpha = k > 0.85 ? (1 - k) * 5 : 0.8; g.strokeStyle = p.col; g.lineWidth = 0.8; g.strokeRect(s.x - r, y - r, r * 2, r * 2); continue;
          case 'drop': w = r * 1.4; hh = r * 2.2; break;
          case 'flake': w = hh = 1.6; break;
          case 'ember': w = hh = r * 2 * (1 - k * 0.6); break;
          default: w = hh = r * 2;
        }
        g.globalAlpha = a; g.fillStyle = p.col; g.fillRect(s.x - w / 2, y - hh / 2, w, hh);
      }
    }
    g.restore();
  };
  // a heal you can see: green motes rising off the one mended
  B.onHeal = function (tgt, a) {
    if (this.peaceful && !this.drill) return;
    if (tgt.healFxT > this.time) return; tgt.healFxT = this.time + 0.25;
    for (let i = 0; i < 5; i++) part(this, { x: tgt.x + (R() - 0.5) * 0.5, y: tgt.y + (R() - 0.5) * 0.5, z: 0.3 + R() * 0.8, vz: 1.2 + R(), life: 0.7, s: 1.5, col: i % 2 ? '#9dffb0' : '#5fe07a', kind: 'ember', grav: -0.5 });
    T(this).fx.push({ kind: 'mend', x: tgt.x, y: tgt.y, t: 0, dur: 0.4, k: 1, col: COL.holy });
  };
  function bolt(g, x0, y0, x1, y1, seed, segs, jag) {
    g.beginPath(); g.moveTo(x0, y0);
    for (let i = 1; i < segs; i++) { const q = i / segs; g.lineTo(x0 + (x1 - x0) * q + (rnd(seed + i) - 0.5) * jag, y0 + (y1 - y0) * q + (rnd(seed + i * 3) - 0.5) * jag * 0.5); }
    g.lineTo(x1, y1); g.stroke();
  }
  function drawFx(g, f) {
    const s = iso(f.x, f.y), k = f.t / f.dur, C = f.col, a = Math.max(0, 1 - k), q = f.k || 1;
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1;
    switch (f.kind) {
      case 'flare': { // a bloom of flame at the wound and a scorch of light on the ground
        const r = (10 + k * 16) * q, gl = g.createRadialGradient(s.x, s.y - 18, 0, s.x, s.y - 18, r);
        gl.addColorStop(0, 'rgba(255,240,170,' + a + ')'); gl.addColorStop(0.4, 'rgba(255,140,40,' + a * 0.8 + ')'); gl.addColorStop(1, 'rgba(255,60,10,0)');
        g.fillStyle = gl; g.beginPath(); g.arc(s.x, s.y - 18, r, 0, TAU); g.fill();
        const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, 26 * q); gr.addColorStop(0, 'rgba(255,120,30,' + a * 0.45 + ')'); gr.addColorStop(1, 'rgba(255,120,30,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(s.x, s.y, 26 * q, 11 * q, 0, 0, TAU); g.fill(); break;
      }
      case 'spikes': { // ice bursts out of the ground around the foe
        const grow = Math.min(1, k * 5), fade = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
        g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 6; i++) {
          const an = f.rot + i * TAU / 6, px = s.x + Math.cos(an) * 8 * q, py = s.y + Math.sin(an) * 3.5 * q, hh = (9 + (i % 2) * 6) * q * grow, w = 2.6 * q;
          g.globalAlpha = fade * 0.95; g.fillStyle = i % 2 ? '#dff4ff' : '#8fd0ff';
          g.beginPath(); g.moveTo(px - w, py); g.lineTo(px + Math.cos(an) * 3 * q, py - hh); g.lineTo(px + w, py); g.closePath(); g.fill();
          g.globalAlpha = fade * 0.6; g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(px - w * 0.3, py); g.lineTo(px + Math.cos(an) * 3 * q, py - hh); g.lineTo(px, py); g.closePath(); g.fill();
        }
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.6; g.strokeStyle = '#bfe9ff'; g.lineWidth = 1.5;
        g.beginPath(); g.ellipse(s.x, s.y, (8 + k * 18) * q, (3.5 + k * 8) * q, 0, 0, TAU); g.stroke(); break;
      }
      case 'strike': { // a bolt out of the sky
        const flick = rnd(Math.floor(f.t * 40) + f.seed) > 0.25 ? 1 : 0.3;
        g.globalAlpha = a * flick * 0.3; g.strokeStyle = '#4cc9ff'; g.lineWidth = 8 * q; bolt(g, s.x + 10, s.y - 150, s.x, s.y - 16, f.seed + Math.floor(f.t * 30), 7, 22);
        g.globalAlpha = a * flick; g.strokeStyle = C[1]; g.lineWidth = 3 * q; bolt(g, s.x + 10, s.y - 150, s.x, s.y - 16, f.seed + Math.floor(f.t * 30), 7, 22);
        g.strokeStyle = '#ffffff'; g.lineWidth = 1.2 * q; bolt(g, s.x + 10, s.y - 150, s.x, s.y - 16, f.seed + Math.floor(f.t * 30), 7, 22);
        const gl = g.createRadialGradient(s.x, s.y - 10, 0, s.x, s.y - 10, 30 * q); gl.addColorStop(0, 'rgba(200,250,255,' + a * 0.6 + ')'); gl.addColorStop(1, 'rgba(80,200,255,0)');
        g.fillStyle = gl; g.beginPath(); g.ellipse(s.x, s.y - 6, 30 * q, 16 * q, 0, 0, TAU); g.fill(); break;
      }
      case 'chain': { // lightning leaps to the next foe
        const b = iso(f.x2, f.y2), flick = rnd(Math.floor(f.t * 40) + f.seed) > 0.2 ? 1 : 0.35;
        g.globalAlpha = a * flick * 0.3; g.strokeStyle = '#4cc9ff'; g.lineWidth = 6.5; bolt(g, s.x, s.y - 20, b.x, b.y - 20, f.seed + Math.floor(f.t * 30), 6, 16);
        g.globalAlpha = a * flick; g.strokeStyle = C[1]; g.lineWidth = 2.4; bolt(g, s.x, s.y - 20, b.x, b.y - 20, f.seed + Math.floor(f.t * 30), 6, 16);
        g.strokeStyle = '#fff'; g.lineWidth = 0.9; bolt(g, s.x, s.y - 20, b.x, b.y - 20, f.seed + Math.floor(f.t * 30), 6, 16);
        break;
      }
      case 'cross': { // shadow: two dark cuts crossing the foe, rimmed in violet
        const grow = Math.min(1, k * 6), len = 22 * q * grow;
        g.save(); g.translate(s.x, s.y - 20); g.rotate(f.rot);
        for (const d of [1, -1]) {
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = a * 0.85; g.strokeStyle = '#14052e'; g.lineWidth = 4.5 * q; g.lineCap = 'round';
          g.beginPath(); g.moveTo(-len * d, -len * 0.7); g.lineTo(len * d, len * 0.7); g.stroke();
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.strokeStyle = C[1]; g.lineWidth = 1.4 * q;
          g.beginPath(); g.moveTo(-len * d, -len * 0.7); g.lineTo(len * d, len * 0.7); g.stroke();
        }
        g.restore(); break;
      }
      case 'pillar': { // holy: a column of light falls on the foe
        const w = 7 * q * (k < 0.2 ? k / 0.2 : 1) * (1 - k * 0.5), gl = g.createLinearGradient(0, s.y - 140, 0, s.y);
        gl.addColorStop(0, 'rgba(255,240,180,0)'); gl.addColorStop(0.7, 'rgba(255,230,140,' + a * 0.32 + ')'); gl.addColorStop(1, 'rgba(255,250,220,' + a * 0.6 + ')');
        g.fillStyle = gl; g.fillRect(s.x - w, s.y - 140, w * 2, 140);
        g.fillStyle = 'rgba(255,255,240,' + a * 0.55 + ')'; g.fillRect(s.x - w * 0.3, s.y - 140, w * 0.6, 140);
        const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, 24 * q); gr.addColorStop(0, 'rgba(255,230,140,' + a * 0.6 + ')'); gr.addColorStop(1, 'rgba(255,230,140,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(s.x, s.y, 24 * q, 10 * q, 0, 0, TAU); g.fill(); break;
      }
      case 'stream': { // holy: motes of light fly from the struck foe to the healed ally
        const b = iso(f.x2, f.y2);
        for (let i = 0; i < 7; i++) {
          const p = Math.min(1, k * 1.6 - i * 0.08); if (p <= 0) continue;
          const px = s.x + (b.x - s.x) * p, py = s.y - 20 + (b.y - s.y) * p - Math.sin(p * Math.PI) * 26;
          g.globalAlpha = (p < 1 ? 1 : a) * 0.9; g.fillStyle = i % 2 ? C[0] : C[1]; g.beginPath(); g.arc(px, py, 1.8 - i * 0.12, 0, TAU); g.fill();
        }
        if (k > 0.55) { const gr = g.createRadialGradient(b.x, b.y - 18, 0, b.x, b.y - 18, 18); gr.addColorStop(0, 'rgba(255,240,170,' + a * 0.7 + ')'); gr.addColorStop(1, 'rgba(255,240,170,0)'); g.globalAlpha = 1; g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y - 18, 18, 0, TAU); g.fill(); }
        break;
      }
      case 'mend': BB.drawGlow(g, '120,255,150', s.x, s.y - 16, 16 + k * 10, 20 + k * 10, a * 0.5); break;
      case 'cloud': { // poison: a green puff that hangs a moment
        g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 3; i++) { const an = i * 2.1 + f.x, r = (9 + k * 12 + i * 2) * q; BB.drawGlow(g, i % 2 ? '111,194,58' : '166,240,74', s.x + Math.cos(an) * 8 * q * (0.5 + k), s.y - 12 - k * 8 + Math.sin(an) * 4 * q, r, r, a * 0.4); }
        break;
      }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
})();
