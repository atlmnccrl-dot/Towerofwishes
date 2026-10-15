/*
 * Tower of Wishes — arena renderer (prototype 0.1)
 *
 * Draws the simulation from an elevated, slowly drifting "coliseum" camera.
 * Reads sim state only; never changes it. Placeholder figures are drawn
 * procedurally until approved character art exists.
 */
(function () {
  'use strict';
  const Sim = window.TowSim;

  const LOOK = {
    kael:    { coat: '#2f5f8a', trim: '#d8b45a', skin: '#e9c3a0', hair: '#3a2a20', h: 1.0,  w: 1.0,  weapon: 'sword',   hairStyle: 'short' },
    eiryn:   { coat: '#2b2a36', trim: '#4fae7a', skin: '#f1d3bd', hair: '#e9e7f2', h: 0.93, w: 0.88, weapon: 'branch',  hairStyle: 'long' },
    brute:   { coat: '#6b4a33', trim: '#3d2a1d', skin: '#c99a76', hair: '#4a3324', h: 1.12, w: 1.45, weapon: 'club',    hairStyle: 'bald' },
    knife:   { coat: '#4a3a36', trim: '#b8423a', skin: '#d9ad8a', hair: '#1f1a18', h: 0.97, w: 0.85, weapon: 'knife',   hairStyle: 'short' },
    hatchet: { coat: '#4d5b34', trim: '#2f3820', skin: '#d4a684', hair: '#2a2a1e', h: 1.0,  w: 1.05, weapon: 'hatchet', hairStyle: 'hood' },
    lookout: { coat: '#5b5f66', trim: '#3a3d42', skin: '#dcb490', hair: '#6a5038', h: 0.95, w: 0.9,  weapon: 'sling',   hairStyle: 'short' },
  };
  const COL = {
    hero: '#8fd3ff', bandit: '#ff6a52', ember: '#ff9a3d', violet: '#a98bff',
    ink: '#0c1114', paper: '#f3ead6',
  };
  const DISPLAY = '"Shippori Mincho", "Hiragino Mincho ProN", Georgia, serif';
  const UI = '"M PLUS 1p", "Hiragino Sans", "Segoe UI", system-ui, sans-serif';

  function createRenderer(canvas) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    const cam = { x: 0, y: 0, sc: 40, ang: -0.32, pitch: 0.56, shake: 0, time: 0 };
    let particles = [], texts = [], flash = 0, flashCol = '#fff', hitstop = 0, banner = null;
    const R = Sim.makeRng(7);

    // Static decoration, generated once.
    const tufts = [];
    for (let i = 0; i < 260; i++) {
      const a = R() * Math.PI * 2, k = Math.sqrt(R()) * 1.05;
      tufts.push({ x: Math.cos(a) * Sim.ARENA.rx * k, y: Math.sin(a) * Sim.ARENA.ry * k, s: 0.5 + R() * 0.8, c: R() });
    }
    const ring = [];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + R() * 0.08;
      const k = 1.18 + R() * 0.45;
      const x = Math.cos(a) * Sim.ARENA.rx * k, y = Math.sin(a) * Sim.ARENA.ry * k;
      if (Math.hypot(x - Sim.ARENA.exit.x, y - Sim.ARENA.exit.y) < 3.2) continue; // keep the road open
      ring.push({ x, y, r: 0.9 + R() * 0.8, h: 3.4 + R() * 1.6, c: R() });
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }

    function P(x, y, z) {
      const dx = x - cam.x, dy = y - cam.y;
      const c = Math.cos(cam.ang), s = Math.sin(cam.ang);
      const rx = dx * c - dy * s, ry = dx * s + dy * c;
      return { x: W / 2 + rx * cam.sc, y: H * 0.56 + ry * cam.sc * cam.pitch - (z || 0) * cam.sc * 0.9, d: ry };
    }

    // ------------------------------------------------------------ camera
    function updateCamera(s, dt) {
      cam.time += dt;
      const live = s.units.filter((u) => Sim.alive(u) && !u.fled);
      let tx = 0, ty = 0, wsum = 0;
      for (const u of live) { const w = u.id === 'kael' ? 2.2 : 1; tx += u.x * w; ty += u.y * w; wsum += w; }
      if (wsum) { tx /= wsum; ty /= wsum; }
      let spread = 3;
      for (const u of live) spread = Math.max(spread, Math.hypot(u.x - tx, u.y - ty));
      let sc = Math.min(W / (spread * 2 + 7), H / ((spread * 2 + 6) * cam.pitch + 2.6));
      sc = Math.max(Math.min(sc, Math.min(W, H) / 7), Math.min(W, H) / 26);
      let ang = -0.32 + Math.sin(cam.time * 0.05) * 0.16;
      const c = s.cutscene;
      if (c) {
        const u = c.unit;
        tx = u.x + Math.cos(u.facing) * 0.9; ty = u.y + Math.sin(u.facing) * 0.9;
        sc = Math.min(W, H) / 4.2;
        ang = u.facing - Math.PI / 2 + 0.9 - (c.t / c.dur) * 0.7;
      }
      const k = c ? 0.12 : Math.min(1, dt * 2.2);
      cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
      cam.sc += (sc - cam.sc) * k;
      cam.ang += (ang - cam.ang) * (c ? 0.08 : Math.min(1, dt * 0.8));
      cam.shake *= Math.pow(0.002, dt);
    }

    // ------------------------------------------------------------ world
    function drawGround() {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0d1712'); g.addColorStop(1, '#16241a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      // Clearing
      const A = Sim.ARENA;
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const p = P(Math.cos(a) * A.rx * 1.08, Math.sin(a) * A.ry * 1.08, 0);
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      const c0 = P(0, 0, 0);
      const rg = ctx.createRadialGradient(c0.x, c0.y, 0, c0.x, c0.y, A.rx * cam.sc * 1.1);
      rg.addColorStop(0, '#5d7a3e'); rg.addColorStop(0.7, '#48663a'); rg.addColorStop(1, '#2c4429');
      ctx.fillStyle = rg; ctx.fill();

      // Road path toward the exit
      const e = A.exit;
      const pth = [[6.5, -3.4], [9.5, -5.2], [e.x + 3, e.y - 2.4]];
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [w, col] of [[1.9, '#6f6447'], [1.4, '#86795a']]) {
        ctx.beginPath();
        pth.forEach(([x, y], i) => { const p = P(x, y, 0); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
        ctx.strokeStyle = col; ctx.lineWidth = w * cam.sc * 0.75; ctx.stroke();
      }

      // Grass tufts
      for (const t of tufts) {
        const p = P(t.x, t.y, 0);
        if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue;
        const h = t.s * cam.sc * 0.18;
        ctx.strokeStyle = t.c < 0.5 ? '#6f8f47' : '#3d5a30';
        ctx.lineWidth = Math.max(1, cam.sc * 0.03);
        ctx.beginPath();
        ctx.moveTo(p.x - h * 0.4, p.y); ctx.lineTo(p.x - h * 0.6, p.y - h);
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + h * 0.1, p.y - h * 1.2);
        ctx.moveTo(p.x + h * 0.4, p.y); ctx.lineTo(p.x + h * 0.7, p.y - h * 0.9);
        ctx.stroke();
      }
    }

    function shadow(x, y, r, a) {
      const p = P(x, y, 0);
      ctx.fillStyle = `rgba(8,14,10,${a == null ? 0.35 : a})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * cam.sc, r * cam.sc * cam.pitch, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawTree(t, fade) {
      shadow(t.x + 0.4, t.y + 0.3, t.r * 1.5, 0.28);
      const b = P(t.x, t.y, 0), top = P(t.x, t.y, t.h * 0.62);
      ctx.strokeStyle = '#2f2219'; ctx.lineCap = 'butt';
      ctx.lineWidth = t.r * 0.42 * cam.sc;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      ctx.globalAlpha = fade;
      const cols = t.c < 0.5 ? ['#1e3a24', '#28492c', '#335a35'] : ['#1b3322', '#244229', '#2f5232'];
      for (let i = 0; i < 3; i++) {
        const p = P(t.x + (i - 1) * 0.25 * t.r, t.y - (i - 1) * 0.2, t.h * (0.7 + i * 0.13));
        ctx.fillStyle = cols[i];
        ctx.beginPath(); ctx.arc(p.x, p.y, t.r * (1.5 - i * 0.28) * cam.sc, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawBush(t) {
      const p = P(t.x, t.y, 0.25);
      ctx.fillStyle = t.c < 0.5 ? 'rgba(20,38,25,0.9)' : 'rgba(26,46,30,0.9)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, t.r * 1.3 * cam.sc, t.r * 0.55 * cam.sc, 0, Math.PI, 0);
      ctx.fill();
    }

    function drawRock(o) {
      shadow(o.x + 0.15, o.y + 0.1, o.r * 1.15, 0.3);
      const p = P(o.x, o.y, o.r * 0.45);
      ctx.fillStyle = '#6d726c';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, o.r * cam.sc, o.r * cam.sc * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8d928a';
      ctx.beginPath();
      ctx.ellipse(p.x - o.r * cam.sc * 0.2, p.y - o.r * cam.sc * 0.25, o.r * cam.sc * 0.55, o.r * cam.sc * 0.35, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawTrunkPiece(o, t0, t1) {
      const x0 = o.ax + (o.bx - o.ax) * t0, y0 = o.ay + (o.by - o.ay) * t0;
      const x1 = o.ax + (o.bx - o.ax) * t1, y1 = o.ay + (o.by - o.ay) * t1;
      const a = P(x0, y0, o.r), b = P(x1, y1, o.r);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3b2a1e'; ctx.lineWidth = o.r * 2 * cam.sc;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = '#5a4130'; ctx.lineWidth = o.r * 1.1 * cam.sc;
      ctx.beginPath(); ctx.moveTo(a.x, a.y - o.r * cam.sc * 0.35); ctx.lineTo(b.x, b.y - o.r * cam.sc * 0.35); ctx.stroke();
      ctx.fillStyle = '#4f7a3c';
      const m = P((x0 + x1) / 2, (y0 + y1) / 2, o.r * 1.8);
      ctx.beginPath(); ctx.ellipse(m.x, m.y, o.r * cam.sc * 0.5, o.r * cam.sc * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    }

    // ------------------------------------------------------------ fighters
    function pose(u) {
      // rel: weapon angle relative to facing; pitch: weapon elevation; lean
      let rel = 0.9, pitch = 0.55, lean = 0, crouch = 0;
      const a = u.act;
      switch (u.state) {
        case 'attack':
          if (a.phase === 'windup' || a.phase === 'feint') {
            const k = a.phase === 'feint' ? 1 : Math.min(1, a.t / a.wind);
            rel = 0.9 + k * 1.5; pitch = 0.55 + k * 0.45; lean = -0.12 * k; crouch = 0.06 * k;
          } else if (a.phase === 'strike') {
            const k = Math.min(1, a.t / Math.max(0.05, a.A.active));
            rel = 2.4 - k * 3.8; pitch = 0.25; lean = 0.22;
          } else {
            const k = Math.min(1, a.t / Math.max(0.05, a.A.recover));
            rel = -1.4 + k * 2.3; pitch = 0.1 + k * 0.4; lean = 0.2 * (1 - k);
          }
          break;
        case 'parry': rel = 0.15; pitch = 1.05; lean = -0.05; break;
        case 'dodge': lean = 0.3; crouch = 0.1; break;
        case 'hurt': case 'stagger': rel = 1.7; pitch = -0.2; lean = -0.25; break;
        case 'recover': rel = -0.6; pitch = 0.1; lean = 0.15; break;
        case 'circle': rel = 0.7; pitch = 0.65; crouch = 0.04; break;
      }
      if (u.fleeing) { rel = 2.8; pitch = 1.2; lean = 0.2; }
      if (u.drained > 0) { pitch -= 0.5; lean = 0.18; crouch = 0.08; }
      return { rel, pitch, lean, crouch };
    }

    function drawFighter(u, s) {
      const L = LOOK[u.key];
      const sc = cam.sc;
      const lying = u.state === 'down' || u.state === 'out';
      const ghost = u.fled ? 0 : 1;
      if (!ghost) return;
      const alpha = u.state === 'out' ? 0.55 : 1;

      // All Out aura / drained haze under the feet
      if (u.allOut > 0) {
        const p = P(u.x, u.y, 0);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sc * 1.1);
        g.addColorStop(0, 'rgba(255,154,61,0.55)'); g.addColorStop(1, 'rgba(255,154,61,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, sc * 1.1, sc * 1.1 * cam.pitch, 0, 0, Math.PI * 2); ctx.fill();
      }
      shadow(u.x, u.y, u.r * 1.25 * (lying ? 1.8 : 1), 0.38);

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

      ctx.globalAlpha = alpha;
      const f = u.facing, fx = Math.cos(f), fy = Math.sin(f);
      const H = 1.72 * L.h;
      const outline = '#141012';

      if (lying) {
        // Laid out along the facing axis (fell backward).
        const hx = u.x - fx * 0.75 * L.h, hy = u.y - fy * 0.75 * L.h;
        const a = P(u.x + fx * 0.15, u.y + fy * 0.15, 0.18), b = P(hx, hy, 0.2);
        ctx.lineCap = 'round';
        ctx.strokeStyle = outline; ctx.lineWidth = 0.42 * sc * L.w;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.strokeStyle = L.coat; ctx.lineWidth = 0.34 * sc * L.w;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const hp = P(hx - fx * 0.18, hy - fy * 0.18, 0.18);
        ctx.fillStyle = L.hairStyle === 'bald' ? L.skin : L.hair;
        ctx.beginPath(); ctx.arc(hp.x, hp.y, 0.14 * sc, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }

      const ps = pose(u);
      const sx = -fy, sy = fx; // body's right-hand side
      const bob = u.state === 'move' ? Math.abs(Math.sin(u.walk * 3.2)) * 0.04 : 0;
      const hipZ = H * (0.52 - ps.crouch) + bob;
      const hip = { x: u.x, y: u.y, z: hipZ };
      const sh = { x: u.x + fx * ps.lean, y: u.y + fy * ps.lean, z: H * (0.83 - ps.crouch) + bob };
      if (u.state === 'dodge' && u.dodgeDir != null) { sh.x += Math.cos(u.dodgeDir) * 0.25; sh.y += Math.sin(u.dodgeDir) * 0.25; }
      if (u.state === 'hurt' || u.state === 'stagger') { const sh2 = (Math.sin(u.st * 60) * 0.03); sh.x += sx * sh2; sh.y += sy * sh2; }

      // Legs
      const sw = u.state === 'move' || u.fleeing ? Math.sin(u.walk * 3.2) * 0.32 : u.state === 'circle' ? Math.sin(u.walk * 3.2) * 0.16 : 0;
      const legs = [-1, 1].map((side) => {
        const fwd = side * sw + (u.state === 'attack' && u.act && u.act.phase !== 'windup' ? side * 0.18 : 0);
        return { x: u.x + sx * side * 0.13 * L.w + fx * fwd, y: u.y + sy * side * 0.13 * L.w + fy * fwd, z: 0 };
      });
      const hip2 = (side) => ({ x: hip.x + sx * side * 0.1 * L.w, y: hip.y + sy * side * 0.1 * L.w, z: hip.z });

      // weapon hand and tip
      const ha = f + ps.rel * 0.55;
      const hand = { x: sh.x + Math.cos(ha) * 0.42 + sx * 0.12, y: sh.y + Math.sin(ha) * 0.42 + sy * 0.12, z: sh.z - 0.18 + ps.pitch * 0.12 };
      const wl = { sword: 1.05, branch: 1.1, club: 1.0, knife: 0.42, hatchet: 0.62, sling: 0.5 }[L.weapon];
      const wa = f + ps.rel;
      const cp = Math.cos(ps.pitch);
      let tip = { x: hand.x + Math.cos(wa) * wl * cp, y: hand.y + Math.sin(wa) * wl * cp, z: hand.z + Math.sin(ps.pitch) * wl };
      if (u.state === 'parry') { // blade held across the body
        tip = { x: hand.x - sx * wl * 0.9, y: hand.y - sy * wl * 0.9, z: hand.z + 0.35 };
      }

      // depth: draw the far-side limbs first
      const P0 = (q) => P(q.x, q.y, q.z);
      const pHip = P0(hip), pSh = P0(sh), pHand = P0(hand), pTip = P0(tip);
      const handFront = pHand.d > pSh.d;

      const strokeLimb = (a, b, w, col) => {
        ctx.lineCap = 'round';
        ctx.strokeStyle = outline; ctx.lineWidth = w * sc + 2.2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = w * sc;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      };
      const drawWeapon = () => {
        const wc = { sword: '#dfe7ee', branch: '#7a5a3a', club: '#6a4a2c', knife: '#cfd6dc', hatchet: '#b9bfc4', sling: '#8a6a48' }[L.weapon];
        const ww = { sword: 0.07, branch: 0.09, club: 0.16, knife: 0.06, hatchet: 0.07, sling: 0.04 }[L.weapon];
        strokeLimb(pHand, pTip, ww, wc);
        if (L.weapon === 'hatchet' || L.weapon === 'club') {
          ctx.fillStyle = L.weapon === 'club' ? '#5a3c22' : '#c9cfd4';
          ctx.beginPath(); ctx.arc(pTip.x, pTip.y, (L.weapon === 'club' ? 0.13 : 0.1) * sc, 0, Math.PI * 2); ctx.fill();
        }
        if (L.weapon === 'sword') {
          const g = { x: hand.x + Math.cos(wa) * 0.1 * cp, y: hand.y + Math.sin(wa) * 0.1 * cp, z: hand.z };
          const pa = P0({ x: g.x + sx * 0.12, y: g.y + sy * 0.12, z: g.z }), pb = P0({ x: g.x - sx * 0.12, y: g.y - sy * 0.12, z: g.z });
          strokeLimb(pa, pb, 0.04, '#d8b45a');
        }
      };

      if (!handFront) { strokeLimb(pSh, pHand, 0.1, L.coat); drawWeapon(); }
      legs.forEach((ft, i) => strokeLimb(P0(hip2(i ? 1 : -1)), P0(ft), 0.13 * L.w, i ? '#2a2420' : '#332b25'));
      // torso
      strokeLimb(pHip, pSh, 0.36 * L.w, u.flash > 0 ? '#ffffff' : L.coat);
      // trim / collar
      const col = P0({ x: sh.x, y: sh.y, z: sh.z - 0.04 });
      ctx.fillStyle = L.trim;
      ctx.beginPath(); ctx.ellipse(col.x, col.y, 0.15 * sc * L.w, 0.06 * sc, 0, 0, Math.PI * 2); ctx.fill();
      // head
      const head = P0({ x: sh.x + fx * 0.04, y: sh.y + fy * 0.04, z: sh.z + 0.25 });
      const hr = 0.15 * sc;
      ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(head.x, head.y, hr + 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = u.flash > 0 ? '#fff' : L.skin; ctx.beginPath(); ctx.arc(head.x, head.y, hr, 0, Math.PI * 2); ctx.fill();
      // hair, placed on the side away from the face
      const back = P0({ x: sh.x - fx * 0.06, y: sh.y - fy * 0.06, z: sh.z + 0.3 });
      ctx.fillStyle = L.hair;
      if (L.hairStyle === 'long') {
        const tail = P0({ x: sh.x - fx * 0.2, y: sh.y - fy * 0.2, z: sh.z - 0.25 });
        ctx.beginPath(); ctx.arc(back.x, back.y, hr * 1.02, 0, Math.PI * 2); ctx.fill();
        ctx.lineCap = 'round'; ctx.strokeStyle = L.hair; ctx.lineWidth = hr * 1.4;
        ctx.beginPath(); ctx.moveTo(back.x, back.y); ctx.lineTo(tail.x, tail.y); ctx.stroke();
      } else if (L.hairStyle === 'hood') {
        ctx.fillStyle = L.coat; ctx.beginPath(); ctx.arc(back.x, back.y, hr * 1.18, 0, Math.PI * 2); ctx.fill();
      } else if (L.hairStyle === 'short') {
        ctx.beginPath(); ctx.arc(back.x, back.y - hr * 0.15, hr * 0.95, 0, Math.PI * 2); ctx.fill();
      }
      if (handFront) { strokeLimb(pSh, pHand, 0.1, L.coat); drawWeapon(); }

      // Slash trail during the strike
      if (u.state === 'attack' && u.act && (u.act.phase === 'strike' || (u.act.phase === 'recover' && u.act.t < 0.1)) && !u.act.A.projectile) {
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
        ctx.globalAlpha = alpha;
      }
      ctx.globalAlpha = 1;
    }

    function drawOverhead(u) {
      if (u.fled || u.state === 'out') return;
      const L = LOOK[u.key];
      const top = P(u.x, u.y, 1.72 * L.h + 0.45);
      const sc = cam.sc;
      // small health bar
      const w = 0.9 * sc, h = Math.max(3, sc * 0.07);
      ctx.fillStyle = 'rgba(10,12,14,0.65)'; ctx.fillRect(top.x - w / 2, top.y, w, h);
      ctx.fillStyle = u.team === 'hero' ? (u.guest ? '#b9a6ff' : '#7fd0a0') : '#e4644f';
      ctx.fillRect(top.x - w / 2, top.y, w * Math.max(0, u.hp / u.maxHp), h);
      // reaction icon
      if (u.iconT > 0 && u.icon) {
        const col = { '!': '#ffd166', '?': '#7fe0ff', '✦': '#ff6a52', '…': '#b8c0c8' }[u.icon] || '#fff';
        const y = top.y - sc * 0.32 - (0.8 - u.iconT) * sc * 0.25;
        ctx.font = `800 ${Math.round(sc * 0.42)}px ${UI}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(12,10,14,0.85)';
        ctx.strokeText(u.icon, top.x, y); ctx.fillStyle = col; ctx.fillText(u.icon, top.x, y);
      }
      if (u.drained > 0 && (!u.iconT || u.iconT <= 0)) {
        ctx.font = `700 ${Math.round(sc * 0.3)}px ${UI}`; ctx.textAlign = 'center';
        ctx.fillStyle = '#b8c0c8'; ctx.fillText('…', top.x, top.y - sc * 0.25);
      }
      // speech
      if (u.bark && u.barkT > 0 && !(u.barkDelay > 0)) {
        const fs = Math.max(11, Math.round(sc * 0.26));
        ctx.font = `600 ${fs}px ${UI}`;
        const tw = ctx.measureText(u.bark).width;
        const bx = top.x, by = top.y - sc * 0.75;
        const pw = tw + fs * 1.1, ph = fs * 1.7;
        ctx.globalAlpha = Math.min(1, u.barkT * 2);
        ctx.fillStyle = 'rgba(243,234,214,0.96)';
        roundRect(bx - pw / 2, by - ph / 2, pw, ph, ph / 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx - 5, by + ph / 2 - 1); ctx.lineTo(bx + 3, by + ph / 2 + 8); ctx.lineTo(bx + 6, by + ph / 2 - 1); ctx.fill();
        ctx.fillStyle = '#1a1612'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(u.bark, bx, by + 1);
        ctx.globalAlpha = 1;
      }
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    // ------------------------------------------------------------ effects
    function consumeFx(s) {
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
    function drawParticles(dt) {
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
        ctx.font = `${t.word ? 800 : 900} ${fs}px ${t.word ? UI : DISPLAY}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = Math.max(0, 1 - k * k);
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(14,10,12,0.85)'; ctx.strokeText(t.text, q.x, q.y);
        ctx.fillStyle = t.col; ctx.fillText(t.text, q.x, q.y);
      }
      ctx.globalAlpha = 1;
      texts = texts.filter((t) => t.t < t.life);
    }

    function drawProjectiles(s) {
      for (const p of s.projectiles) {
        shadow(p.x, p.y, 0.1, 0.4);
        const q = P(p.x, p.y, p.z), tl = P(p.x - p.vx * 0.04, p.y - p.vy * 0.04, p.z);
        ctx.strokeStyle = 'rgba(230,220,200,0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        ctx.fillStyle = '#d6d0c2'; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(2.5, cam.sc * 0.08), 0, Math.PI * 2); ctx.fill();
      }
    }

    // ------------------------------------------------------------ cutscene
    function drawCutsceneOverlay(s) {
      const c = s.cutscene;
      if (!c) return;
      const t = c.t, u = c.unit;
      const bars = Math.min(1, t / 0.25) * Math.min(1, (c.dur - t) / 0.3) * H * 0.12;
      const up = P(u.x, u.y, 1.0);
      if (t < c.impactAt) {
        // energy gathering: lines rushing inward
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
        // vignette
        const vg = ctx.createRadialGradient(up.x, up.y, Math.min(W, H) * 0.15, up.x, up.y, Math.max(W, H) * 0.75);
        vg.addColorStop(0, 'rgba(6,10,16,0)'); vg.addColorStop(1, `rgba(6,10,16,${0.55 * Math.min(1, t * 3)})`);
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      } else {
        const k = (t - c.impactAt) / 0.5;
        if (k < 1) {
          // crescent slash and shockwave
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
      // white-out at impact
      const fk = (t - c.impactAt) / 0.22;
      if (fk >= 0 && fk < 1) { ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - fk)})`; ctx.fillRect(0, 0, W, H); }
      // letterbox
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 0, W, bars); ctx.fillRect(0, H - bars, W, bars);
      // title card
      const tk = Math.min(1, t / 0.35);
      const ease = 1 - Math.pow(1 - tk, 3);
      const fadeOut = Math.min(1, (c.dur - t) / 0.35);
      ctx.globalAlpha = fadeOut;
      const fs = Math.round(Math.min(W, H) * 0.11);
      ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.font = `800 ${fs}px ${DISPLAY}`;
      const x = W - 24 - (1 - ease) * W * 0.4, y = H - bars - fs * 0.35;
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(5,7,10,0.9)';
      ctx.strokeText(c.name.toUpperCase(), x, y);
      ctx.fillStyle = '#eaf6ff'; ctx.fillText(c.name.toUpperCase(), x, y);
      ctx.font = `700 ${Math.round(fs * 0.3)}px ${UI}`;
      ctx.fillStyle = COL.hero;
      ctx.fillText(u.name.toUpperCase() + '  ·  HEAVY ART', x, y - fs * 0.95);
      ctx.globalAlpha = 1;
      if (t > 0.4) {
        ctx.font = `600 12px ${UI}`; ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(234,246,255,0.6)';
        ctx.fillText('Tap to skip', 16, bars + 20);
      }
    }

    function drawBanner(dt) {
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
      ctx.font = `900 ${fs}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(20,8,2,0.85)'; ctx.strokeText(banner.text, 0, 0);
      ctx.fillStyle = banner.col; ctx.fillText(banner.text, 0, 0);
      ctx.font = `700 ${Math.round(fs * 0.2)}px ${UI}`;
      ctx.fillStyle = '#fff3e0'; ctx.fillText(banner.sub.toUpperCase(), 0, fs * 0.62);
      ctx.restore();
    }

    // ------------------------------------------------------------ frame
    function draw(s, dt, quiet) {
      if (!W) resize();
      consumeFx(s);
      updateCamera(s, dt);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const shx = (R() - 0.5) * cam.shake, shy = (R() - 0.5) * cam.shake;
      ctx.save();
      ctx.translate(shx, shy);
      drawGround();

      // Depth-sorted scene
      const items = [];
      for (const t of ring) {
        const p = P(t.x, t.y, 0);
        // Trees between the camera and the arena become low undergrowth so
        // they never hide the fight.
        items.push({ d: p.d, f: () => (p.d > -1 ? drawBush(t) : drawTree(t, 0.95)) });
      }
      for (const o of Sim.ARENA.obstacles) {
        if (o.kind === 'trunk') {
          for (let i = 0; i < 6; i++) {
            const t0 = i / 6, t1 = (i + 1) / 6;
            const m = P(o.ax + (o.bx - o.ax) * (t0 + t1) / 2, o.ay + (o.by - o.ay) * (t0 + t1) / 2, 0);
            items.push({ d: m.d, f: () => drawTrunkPiece(o, t0, t1) });
          }
        } else if (o.kind === 'rock') {
          items.push({ d: P(o.x, o.y, 0).d, f: () => drawRock(o) });
        } else {
          const t = { x: o.x, y: o.y, r: o.r * 1.6, h: 4.6, c: 0.3 };
          const p = P(o.x, o.y, 0);
          const behind = s.units.some((u) => Sim.alive(u) && P(u.x, u.y, 0).d < p.d && Math.abs(P(u.x, u.y, 0).x - p.x) < cam.sc * 2.2 && p.d - P(u.x, u.y, 0).d < 5);
          items.push({ d: p.d, f: () => drawTree(t, behind ? 0.4 : 0.92) });
        }
      }
      for (const u of s.units) {
        const p = P(u.x, u.y, 0);
        items.push({ d: p.d + (u.state === 'out' ? -0.3 : 0), f: () => drawFighter(u, s) });
      }
      items.sort((a, b) => a.d - b.d);
      for (const it of items) it.f();
      drawProjectiles(s);
      if (!quiet) for (const u of s.units) drawOverhead(u);
      drawParticles(dt);
      ctx.restore();
      drawCutsceneOverlay(s);
      drawBanner(dt);
    }

    function takeHitstop() { const h = hitstop; hitstop = 0; return h; }

    window.addEventListener('resize', resize);
    resize();
    return { draw, resize, takeHitstop };
  }

  window.TowRender = { createRenderer, LOOK };
})();
