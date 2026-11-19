// BLACKLINE — effects: muzzle flashes, tracers, explosions, debris, smoke, sparks, blood.
// Turns sim events into particles (pooled) and sound cues. Restrained: visibility first.
(function () {
  const BL = window.BL;
  const { R, PAL, clamp, heightAt } = BL;
  const { sx, sy, hash, addShake } = BL.render;

  const MAX = 900;
  const MAX_SMOKE = 260;
  const P = [];      // fast particles (ring buffer)
  let head = 0;
  const SM = [];     // smoke puffs (ring buffer)
  let smHead = 0;
  const notices = [];
  const flares = [];

  function add(o) {
    const cap = Math.floor(MAX * (R.quality < 1 ? 0.65 : 1));
    if (P.length < cap) { P.push(o); return o; }
    P[head] = o; head = (head + 1) % cap;
    return o;
  }

  function smoke(x, y, r, life, vx, vy, a, dark) {
    const cap = Math.floor(MAX_SMOKE * (R.quality < 1 ? 0.6 : 1));
    const o = { x, y, r, r0: r, life, max: life, vx, vy, a, dark: !!dark, seed: Math.random() * 1000 };
    if (SM.length < cap) SM.push(o); else { SM[smHead] = o; smHead = (smHead + 1) % cap; }
  }

  function reset() { P.length = 0; SM.length = 0; head = 0; smHead = 0; notices.length = 0; flares.length = 0; }

  // ---------------------------------------------------------------- illumination flares
  // Fired up from the ground, they burst high, drift down under a small chute and light
  // the ground below them for a few seconds.
  function flare(x, gy) {
    if (flares.length > 5) flares.shift();
    flares.push({ x, y: gy + 4, vy: 260, vx: (Math.random() - 0.5) * 30, t: 0, life: 9 + Math.random() * 3, lit: false, seed: Math.random() * 100 });
    if (BL.audio) BL.audio.ping(0.4);
  }

  function tickFlares(dt, field) {
    for (const f of flares) {
      f.t += dt;
      if (!f.lit) {
        f.vy -= 260 * dt;
        f.y += f.vy * dt; f.x += f.vx * dt;
        if (f.vy < 40) f.lit = true;
      } else {
        f.y -= 9 * dt;
        f.x += BL.world.WX.wind * 12 * dt;
      }
    }
    for (let i = flares.length - 1; i >= 0; i--) if (flares[i].t > flares[i].life) flares.splice(i, 1);
  }

  function flareLight(f) {
    if (!f.lit) return 0;
    const k = f.t / f.life;
    return clamp(Math.min((f.t - 0.4) * 3, (1 - k) * 4), 0, 1) * (0.85 + Math.random() * 0.15);
  }

  // Pools of light on the ground (drawn after the terrain, before the units).
  function drawLight(ctx) {
    if (!flares.length) return;
    const z = R.cam.z;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of flares) {
      const L = flareLight(f);
      if (L <= 0) continue;
      const px = sx(f.x), py = sy(f.y);
      const r = 330 * z;
      if (px < -r || px > R.W + r) continue;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(235,228,210,${0.16 * L})`);
      g.addColorStop(0.45, `rgba(235,228,210,${0.06 * L})`);
      g.addColorStop(1, 'rgba(235,228,210,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  function drawFlares(ctx) {
    const z = R.cam.z;
    for (const f of flares) {
      const px = sx(f.x), py = sy(f.y);
      if (px < -40 || px > R.W + 40) continue;
      if (!f.lit) {
        ctx.strokeStyle = 'rgba(240,233,214,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - f.vx * 0.04 * z, py + f.vy * 0.06 * z); ctx.stroke();
        continue;
      }
      const L = flareLight(f);
      // chute and line
      ctx.strokeStyle = `rgba(235,228,210,${0.5 * L})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(px, py - 9 * Math.max(0.6, z), 4 * Math.max(0.6, z), Math.PI, 0);
      ctx.moveTo(px - 4 * Math.max(0.6, z), py - 9 * Math.max(0.6, z)); ctx.lineTo(px, py);
      ctx.lineTo(px + 4 * Math.max(0.6, z), py - 9 * Math.max(0.6, z));
      ctx.stroke();
      ctx.fillStyle = `rgba(255,250,236,${L})`;
      const s = 2.2 + Math.random();
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
      // a few sparks falling
      if (Math.random() < 0.5) add({ k: 'dot', x: f.x, y: f.y, vx: (Math.random() - 0.5) * 10, vy: -10, life: 0.6, max: 0.6, s: 0.8 });
    }
  }

  // ---------------------------------------------------------------- events

  function onScreen(x, pad) {
    const px = sx(x);
    return px > -(pad || 120) && px < R.W + (pad || 120);
  }

  function nearCam(x) {
    const d = Math.abs(x - R.cam.x) * R.cam.z / R.W;
    return clamp(1.2 - d * 1.4, 0, 1);
  }

  function consume(S, field, playerTeam) {
    const A = BL.audio;
    for (const e of S.events) {
      switch (e.t) {
        case 'shot': {
          if (A) A.shot(e, nearCam(e.x));
          if (!onScreen(e.x)) break;
          const big = e.w === 'shell';
          add({ k: 'flash', x: e.x, y: e.y, a: e.a, s: big ? 9 : e.w === 'rocket' ? 5 : 2.6, life: big ? 0.09 : 0.05, max: big ? 0.09 : 0.05, team: e.team });
          if (big) {
            for (let i = 0; i < 4; i++) smoke(e.x + Math.cos(e.a) * 6, e.y + Math.sin(e.a) * 6, 4, 2.2, Math.cos(e.a) * 20, 6, 0.22);
            const g = heightAt(field, e.x);
            for (let i = 0; i < 8; i++) add({ k: 'dirt', x: e.x + (Math.random() - 0.5) * 30, y: g + 1, vx: (Math.random() - 0.5) * 40, vy: 20 + Math.random() * 30, life: 0.6, max: 0.6, s: 1 });
            addShake(0.08 * nearCam(e.x));
          } else if (e.w === 'rocket') {
            smoke(e.x - Math.cos(e.a) * 4, e.y - Math.sin(e.a) * 4, 3, 1.4, -Math.cos(e.a) * 30, 4, 0.25);
          }
          break;
        }
        case 'dirt':
          if (!onScreen(e.x)) break;
          for (let i = 0; i < 3; i++) add({ k: 'dirt', x: e.x, y: e.y + 1, vx: (Math.random() - 0.5) * 30, vy: 15 + Math.random() * 25, life: 0.4, max: 0.4, s: 0.9 });
          break;
        case 'spark':
          if (A) A.ping(nearCam(e.x));
          if (!onScreen(e.x)) break;
          for (let i = 0; i < 4; i++) { const a = Math.random() * 6.28; add({ k: 'spark', x: e.x, y: e.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 + 20, life: 0.14, max: 0.14 }); }
          break;
        case 'hit':
          if (A && e.armor !== 'inf') A.ping(nearCam(e.x) * 1.2);
          if (!onScreen(e.x)) break;
          for (let i = 0; i < (e.big ? 10 : 3); i++) { const a = Math.random() * 6.28; add({ k: 'spark', x: e.x, y: e.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 + 30, life: 0.18, max: 0.18 }); }
          if (e.big) for (let i = 0; i < 6; i++) add({ k: 'dot', x: e.x, y: e.y, vx: (Math.random() - 0.5) * 120, vy: 40 + Math.random() * 80, life: 1.4, max: 1.4, s: 1.4, red: Math.random() < 0.3 });
          break;
        case 'blood':
          if (!onScreen(e.x)) break;
          for (let i = 0; i < 3; i++) add({ k: 'dot', x: e.x, y: e.y, vx: (Math.random() - 0.5) * 30, vy: 10 + Math.random() * 30, life: 0.7, max: 0.7, s: 1, red: true });
          break;
        case 'boom':
          explosion(e, field);
          if (A) A.boom(e.r, nearCam(e.x));
          break;
        case 'vehDie':
          if (A) A.boom(60, nearCam(e.x));
          if (api.onBig && onScreen(e.x, 0)) api.onBig(e);
          if (onScreen(e.x, 300)) {
            addShake(0.45 * nearCam(e.x));
            for (let i = 0; i < 26; i++) add({ k: 'dot', x: e.x, y: e.y + 8, vx: (Math.random() - 0.5) * 260, vy: 60 + Math.random() * 220, life: 2.4, max: 2.4, s: 1.2 + Math.random() * 2.2, red: Math.random() < 0.2 });
            add({ k: 'ring', x: e.x, y: e.y + 8, life: 0.5, max: 0.5, r: 90 });
            for (let i = 0; i < 10; i++) smoke(e.x + (Math.random() - 0.5) * 30, e.y + 10 + Math.random() * 20, 8 + Math.random() * 8, 6 + Math.random() * 4, (Math.random() - 0.5) * 20, 14 + Math.random() * 12, 0.35, true);
            // a delayed secondary blast
            add({ k: 'delay', x: e.x + (Math.random() - 0.5) * 16, y: e.y + 10, life: 0.45 + Math.random() * 0.3, max: 1, cb: true });
          }
          if (e.team === playerTeam) note(`${BL.UNITS[e.type].short} LOST`, true);
          else if (playerTeam >= 0) note(`ENEMY ${BL.UNITS[e.type].short} DESTROYED`, false);
          break;
        case 'heliHit':
          if (onScreen(e.x)) for (let i = 0; i < 8; i++) add({ k: 'spark', x: e.x, y: e.y, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.25, max: 0.25 });
          if (playerTeam >= 0) note(e.team === playerTeam ? 'HELICOPTER GOING DOWN' : 'ENEMY HELICOPTER HIT', e.team === playerTeam);
          break;
        case 'land':
          if (onScreen(e.x)) for (let i = 0; i < 4; i++) add({ k: 'dirt', x: e.x, y: e.y + 1, vx: (Math.random() - 0.5) * 30, vy: 10 + Math.random() * 10, life: 0.4, max: 0.4, s: 0.9 });
          break;
        case 'artyWarn':
          if (playerTeam >= 0) note(e.team === playerTeam ? 'FIRE MISSION — SHELLS IN 3' : 'ARTILLERY INCOMING', e.team !== playerTeam);
          if (A) A.radio();
          break;
        case 'artyShell':
          if (A) A.whistle(nearCam(e.x));
          break;
        case 'sector':
          if (playerTeam >= 0) {
            if (e.owner === playerTeam) note(`SECTOR ${e.id} SECURED`, false);
            else if (e.owner === 1 - playerTeam) note(`SECTOR ${e.id} LOST`, true);
            else if (e.from === playerTeam) note(`SECTOR ${e.id} CONTESTED`, true);
          }
          if (A) A.radio();
          break;
        case 'wave':
          if (playerTeam >= 0) note(e.n === e.of ? 'FINAL ASSAULT — HOLD' : 'ENEMY ATTACK ' + e.n + ' OF ' + e.of, true);
          if (A) A.radio();
          break;
        case 'insert':
          if (playerTeam >= 0 && e.team !== playerTeam) note('ENEMY AIR INSERTION', true);
          break;
        case 'unitLost':
          if (playerTeam >= 0 && e.team === playerTeam && BL.UNITS[e.type].kind === 'inf') note(`${BL.UNITS[e.type].short} SQUAD LOST`, true);
          break;
      }
    }
    S.events.length = 0;
  }

  function explosion(e, field) {
    if (!onScreen(e.x, 200)) return;
    const r = e.r;
    const g = heightAt(field, e.x);
    const ground = e.y - g < r * 0.6;
    add({ k: 'boomflash', x: e.x, y: e.y, r: r * 0.8, life: 0.12, max: 0.12 });
    if (r >= 20) add({ k: 'ring', x: e.x, y: e.y, r: r * 2.2, life: 0.35, max: 0.35 });
    const n = Math.min(28, Math.round(r * 0.6));
    for (let i = 0; i < n; i++) {
      add({ k: 'dot', x: e.x, y: e.y + 2, vx: (Math.random() - 0.5) * r * 6, vy: 30 + Math.random() * r * 6, life: 1 + Math.random() * 1.4, max: 2.4, s: 0.8 + Math.random() * (r > 30 ? 2.4 : 1.4), red: Math.random() < 0.12 });
    }
    if (ground) {
      // dirt plume: thin lines thrown up
      for (let i = 0; i < Math.min(10, r / 3); i++) add({ k: 'plume', x: e.x + (Math.random() - 0.5) * r * 0.6, y: g, h: r * (0.8 + Math.random() * 1.4), lean: (Math.random() - 0.5) * 0.6, life: 0.7, max: 0.7 });
    }
    const puffs = Math.min(8, Math.round(r / 5));
    for (let i = 0; i < puffs; i++) smoke(e.x + (Math.random() - 0.5) * r * 0.6, e.y + Math.random() * r * 0.4, r * (0.25 + Math.random() * 0.25), 3 + Math.random() * 3, (Math.random() - 0.5) * 16, 8 + Math.random() * 10, 0.28);
    addShake((r >= 30 ? 0.3 : r >= 18 ? 0.12 : 0.04) * nearCam(e.x));
  }

  function note(text, bad) {
    notices.push({ text, bad, t: 0 });
    if (notices.length > 4) notices.shift();
  }

  // ---------------------------------------------------------------- per-frame emitters

  function emitters(S, dt, viewTeam) {
    const wind = BL.world.WX.wind;
    // wrecks burn, then smoke
    for (const w of S.wrecks) {
      if (!onScreen(w.x, 200)) continue;
      const age = S.t - w.t;
      const g = heightAt(S.field, w.x);
      const rate = age < 50 ? 5 : age < 120 ? 2 : 0.7;
      if (Math.random() < rate * dt) smoke(w.x + (Math.random() - 0.5) * 10, g + 10, 5 + Math.random() * 5, 7 + Math.random() * 5, wind * 18, 12 + Math.random() * 8, age < 50 ? 0.3 : 0.18, true);
      w.fire = age < 50;
    }
    // damaged vehicles trail smoke
    for (const u of S.units) {
      if (u.kind === 'inf' || !u.alive) continue;
      if (viewTeam >= 0 && u.team !== viewTeam && !BL.visible(S, viewTeam, u)) continue;
      const m = u.members[0];
      if (!m.smoke && !m.falling) continue;
      if (!onScreen(m.x)) continue;
      if (Math.random() < (m.falling ? 30 : 6) * dt) smoke(m.x - m.face * 8, m.y + (u.kind === 'air' ? 2 : u.def.hgt), 3 + Math.random() * 3, 3 + Math.random() * 3, -m.vx * 0.3 + wind * 15, 10, 0.3, true);
    }
    // rockets leave a stippled trail; artillery shells whistle down
    for (const p of S.proj) {
      if (!p.on) continue;
      if (p.kind === 'rocket' && Math.random() < 0.85 && onScreen(p.x)) smoke(p.x, p.y, 1.6, 1.2, wind * 10, 4, 0.3);
    }
  }

  // ---------------------------------------------------------------- draw

  function draw(ctx, S, dt, field) {
    const z = R.cam.z;
    // smoke first (behind sparks)
    for (const o of SM) {
      if (o.life <= 0) continue;
      o.life -= dt;
      o.x += o.vx * dt; o.y += o.vy * dt;
      o.vx += BL.world.WX.wind * 6 * dt;
      o.vy *= 1 - 0.15 * dt;
      o.r += dt * (3 + o.r0 * 0.25);
      if (!onScreen(o.x, 80)) continue;
      const k = o.life / o.max;
      const a = o.a * Math.min(1, k * 1.5) * Math.min(1, (o.max - o.life) * 4);
      const px = sx(o.x), py = sy(o.y), pr = o.r * z;
      ctx.fillStyle = o.dark ? `rgba(14,13,12,${a * 1.4})` : `rgba(200,194,182,${a * 0.12})`;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.283); ctx.fill();
      // stipple: the smoke reads as dots, like the clouds
      ctx.fillStyle = `rgba(235,228,210,${a * (o.dark ? 0.55 : 0.8)})`;
      const nd = Math.min(22, 5 + pr * 0.6);
      for (let i = 0; i < nd; i++) {
        const ang = hash(o.seed + i) * 6.283, rr = Math.sqrt(hash(o.seed + i * 2.1)) * pr;
        ctx.fillRect(px + Math.cos(ang) * rr, py + Math.sin(ang) * rr, 1.1, 1.1);
      }
    }

    // wreck fires: small flickering red strokes
    for (const w of S.wrecks) {
      if (!w.fire || !onScreen(w.x)) continue;
      const g = heightAt(field, w.x);
      ctx.strokeStyle = Math.random() < 0.5 ? PAL.red : 'rgba(235,200,170,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const fx = w.x + (Math.random() - 0.5) * 14, fh = 3 + Math.random() * 7;
        ctx.moveTo(sx(fx), sy(g + 6)); ctx.lineTo(sx(fx + (Math.random() - 0.5) * 2), sy(g + 6 + fh));
      }
      ctx.stroke();
    }

    // projectiles
    ctx.lineCap = 'round';
    for (const p of S.proj) {
      if (!p.on) continue;
      if (!onScreen(p.x, 60)) continue;
      const red = p.team === 1;
      if (p.kind === 'bullet') {
        ctx.strokeStyle = red ? 'rgba(200,80,66,0.9)' : 'rgba(240,233,214,0.9)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx(p.x - p.vx * 0.018), sy(p.y - p.vy * 0.018)); ctx.lineTo(sx(p.x), sy(p.y)); ctx.stroke();
      } else if (p.kind === 'shell') {
        ctx.strokeStyle = red ? PAL.red : PAL.ink;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(sx(p.x - p.vx * 0.03), sy(p.y - p.vy * 0.03)); ctx.lineTo(sx(p.x), sy(p.y)); ctx.stroke();
      } else if (p.kind === 'rocket') {
        ctx.fillStyle = PAL.ink;
        ctx.fillRect(sx(p.x) - 1.2, sy(p.y) - 1.2, 2.4, 2.4);
        ctx.fillStyle = red ? PAL.red : 'rgba(240,220,190,0.9)';
        ctx.fillRect(sx(p.x - p.vx * 0.012) - 1, sy(p.y - p.vy * 0.012) - 1, 2, 2);
      } else if (p.kind === 'arty') {
        ctx.strokeStyle = 'rgba(235,228,210,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx(p.x - p.vx * 0.08), sy(p.y - p.vy * 0.08)); ctx.lineTo(sx(p.x), sy(p.y)); ctx.stroke();
      }
    }

    // fast particles
    for (let i = 0; i < P.length; i++) {
      const o = P[i];
      if (o.life <= 0) continue;
      o.life -= dt;
      const k = Math.max(0, o.life / o.max);
      switch (o.k) {
        case 'flash': {
          const px = sx(o.x), py = sy(o.y), s = o.s * Math.max(1, z);
          ctx.strokeStyle = o.team === 1 ? 'rgba(220,120,100,0.95)' : 'rgba(255,248,230,0.95)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          const ca = Math.cos(-o.a), sa = Math.sin(-o.a);
          ctx.moveTo(px, py); ctx.lineTo(px + ca * s * 1.8, py + sa * s * 1.8);
          ctx.moveTo(px + ca * s * 0.5 - sa * s * 0.6, py + sa * s * 0.5 + ca * s * 0.6); ctx.lineTo(px + ca * s * 0.5 + sa * s * 0.6, py + sa * s * 0.5 - ca * s * 0.6);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,250,236,0.9)';
          ctx.fillRect(px - 1, py - 1, 2, 2);
          break;
        }
        case 'dot':
        case 'dirt': {
          o.vy -= 220 * dt; o.x += o.vx * dt; o.y += o.vy * dt;
          const g = heightAt(field, o.x);
          if (o.y < g) { o.y = g; o.vx *= 0.4; o.vy = Math.abs(o.vy) * 0.25; if (o.k === 'dirt') o.life = 0; }
          if (!onScreen(o.x, 20)) break;
          const s = Math.max(1, o.s * Math.min(1.6, z));
          ctx.fillStyle = o.red ? `rgba(184,67,58,${Math.min(1, k * 2)})` : o.k === 'dirt' ? `rgba(235,228,210,${k * 0.6})` : `rgba(240,233,214,${Math.min(1, k * 2)})`;
          ctx.fillRect(sx(o.x), sy(o.y), s, s);
          break;
        }
        case 'spark': {
          o.vy -= 200 * dt; o.x += o.vx * dt; o.y += o.vy * dt;
          ctx.strokeStyle = `rgba(255,245,220,${k})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx(o.x), sy(o.y)); ctx.lineTo(sx(o.x - o.vx * 0.03), sy(o.y - o.vy * 0.03)); ctx.stroke();
          break;
        }
        case 'boomflash': {
          // a brief burst: soft core, a small red heart and rays, never a flat disc
          const px = sx(o.x), py = sy(o.y), rr = o.r * z;
          ctx.fillStyle = `rgba(255,246,226,${k * 0.35})`;
          ctx.beginPath(); ctx.arc(px, py, rr * (0.9 - k * 0.3), 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(255,250,236,${k * 0.9})`;
          ctx.beginPath(); ctx.arc(px, py, rr * 0.3, 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(184,67,58,${k})`;
          ctx.beginPath(); ctx.arc(px, py, rr * 0.16, 0, 6.283); ctx.fill();
          ctx.strokeStyle = `rgba(255,246,226,${k * 0.8})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < 9; i++) { const a = hash(o.x + i) * 6.283, r0 = rr * 0.35, r1 = rr * (0.8 + hash(o.y + i) * 0.7) * (1.3 - k * 0.5); ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0); ctx.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1); }
          ctx.stroke();
          break;
        }
        case 'ring': {
          ctx.strokeStyle = `rgba(235,228,210,${k * 0.6})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(sx(o.x), sy(o.y), o.r * z * (1 - k * 0.85), 0, 6.283); ctx.stroke();
          break;
        }
        case 'plume': {
          const t = 1 - k;
          const top = o.h * Math.min(1, t * 3);
          ctx.strokeStyle = `rgba(235,228,210,${k * 0.6})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx(o.x + o.lean * top * 0.2), sy(o.y + top * 0.35 * t));
          ctx.lineTo(sx(o.x + o.lean * top), sy(o.y + top));
          ctx.stroke();
          break;
        }
        case 'delay':
          if (o.life <= 0 && o.cb) {
            explosion({ x: o.x, y: o.y, r: 22 }, field);
            if (BL.audio) BL.audio.boom(22, nearCam(o.x));
          }
          break;
      }
    }
  }

  const api = { consume, emitters, draw, reset, notices, note, flare, tickFlares, drawLight, drawFlares, flares, onBig: null };
  BL.fx = api;
})();
