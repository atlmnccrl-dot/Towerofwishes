// BLACKLINE — effects: muzzle flashes, tracers, explosions, debris, smoke, sparks, blood,
// illumination flares. Turns sim events into pooled particles and sound cues.
(function () {
  const BL = window.BL;
  const { R, PAL, clamp, heightAt } = BL;
  const { sx, sy, hash, addShake, K } = BL.render;

  const MAX = 900, MAX_SMOKE = 260;
  const P = []; let head = 0;
  const SM = []; let smHead = 0;
  const notices = [];
  const flares = [];
  let field = null;

  function add(o) {
    const cap = Math.floor(MAX * (R.quality < 1 ? 0.65 : 1));
    if (P.length < cap) { P.push(o); return o; }
    P[head] = o; head = (head + 1) % cap;
    return o;
  }
  function smoke(x, y, z, r, life, vx, vz, a, dark) {
    const cap = Math.floor(MAX_SMOKE * (R.quality < 1 ? 0.6 : 1));
    const o = { x, y, z, r, r0: r, life, max: life, vx, vz, a, dark: !!dark, seed: Math.random() * 1000 };
    if (SM.length < cap) SM.push(o); else { SM[smHead] = o; smHead = (smHead + 1) % cap; }
  }
  function reset() { P.length = 0; SM.length = 0; head = 0; smHead = 0; notices.length = 0; flares.length = 0; }

  function onScreen(x, y, pad) {
    const px = sx(x), py = sy(y, 0);
    pad = pad || 120;
    return px > -pad && px < R.W + pad && py > -pad - 200 && py < R.H + pad + 100;
  }
  function nearCam(x, y) {
    const d = Math.hypot((x - R.cam.x) * R.cam.z / R.W, (y - R.cam.y) * R.cam.z * K / R.H);
    return clamp(1.2 - d * 1.4, 0, 1);
  }

  function note(text, bad) { notices.push({ text, bad, t: 0 }); if (notices.length > 4) notices.shift(); }

  // ---------------------------------------------------------------- events

  function consume(S, playerTeam) {
    field = S.field;
    const A = BL.audio;
    const nm = (k) => (BL.UNITS[k] || BL.SUPPORT[k]).short;
    for (const e of S.events) {
      switch (e.t) {
        case 'shot': {
          if (A) A.shot(e, nearCam(e.x, e.y));
          if (!onScreen(e.x, e.y)) break;
          const big = e.w === 'shell';
          add({ k: 'flash', x: e.x, y: e.y, z: e.z, a: e.a, s: big ? 9 : e.w === 'rocket' ? 5 : 2.6, life: big ? 0.09 : 0.05, max: big ? 0.09 : 0.05, team: e.team });
          if (big) {
            for (let i = 0; i < 4; i++) smoke(e.x + Math.cos(e.a) * 8, e.y + Math.sin(e.a) * 8, e.z, 4, 2.2, Math.cos(e.a) * 20, 6, 0.22);
            addShake(0.08 * nearCam(e.x, e.y));
          } else if (e.w === 'rocket') smoke(e.x, e.y, e.z, 3, 1.4, -Math.cos(e.a) * 30, 4, 0.25);
          break;
        }
        case 'dirt':
          if (!onScreen(e.x, e.y)) break;
          for (let i = 0; i < 3; i++) add({ k: 'dirt', x: e.x, y: e.y, z: e.z + 1, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, vz: 15 + Math.random() * 25, life: 0.4, max: 0.4, s: 0.9 });
          break;
        case 'spark':
          if (A) A.ping(nearCam(e.x, e.y));
          if (!onScreen(e.x, e.y)) break;
          for (let i = 0; i < 4; i++) { const a = Math.random() * 6.28; add({ k: 'spark', x: e.x, y: e.y, z: e.z, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, vz: 30 + Math.random() * 40, life: 0.14, max: 0.14 }); }
          break;
        case 'hit':
          if (A && e.armor !== 'inf') A.ping(nearCam(e.x, e.y) * 1.2);
          if (!onScreen(e.x, e.y)) break;
          for (let i = 0; i < (e.big ? 10 : 3); i++) { const a = Math.random() * 6.28; add({ k: 'spark', x: e.x, y: e.y, z: e.z, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, vz: 40 + Math.random() * 60, life: 0.18, max: 0.18 }); }
          if (e.big) for (let i = 0; i < 6; i++) add({ k: 'dot', x: e.x, y: e.y, z: e.z, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, vz: 40 + Math.random() * 80, life: 1.4, max: 1.4, s: 1.4, red: Math.random() < 0.3 });
          break;
        case 'blood':
          if (!onScreen(e.x, e.y)) break;
          for (let i = 0; i < 3; i++) add({ k: 'dot', x: e.x, y: e.y, z: e.z, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, vz: 10 + Math.random() * 30, life: 0.7, max: 0.7, s: 1, red: true });
          break;
        case 'boom':
          explosion(e);
          if (A) A.boom(e.r, nearCam(e.x, e.y));
          break;
        case 'vehDie':
          if (A) A.boom(60, nearCam(e.x, e.y));
          if (api.onBig && onScreen(e.x, e.y, 0)) api.onBig(e);
          if (onScreen(e.x, e.y, 300)) {
            addShake(0.45 * nearCam(e.x, e.y));
            for (let i = 0; i < 26; i++) add({ k: 'dot', x: e.x, y: e.y, z: e.z + 8, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, vz: 60 + Math.random() * 200, life: 2.4, max: 2.4, s: 1.2 + Math.random() * 2.2, red: Math.random() < 0.2 });
            add({ k: 'ring', x: e.x, y: e.y, z: e.z, life: 0.5, max: 0.5, r: 90 });
            for (let i = 0; i < 10; i++) smoke(e.x + (Math.random() - 0.5) * 30, e.y + (Math.random() - 0.5) * 20, e.z + 10 + Math.random() * 20, 8 + Math.random() * 8, 6 + Math.random() * 4, (Math.random() - 0.5) * 20, 14 + Math.random() * 12, 0.35, true);
            add({ k: 'delay', x: e.x + (Math.random() - 0.5) * 16, y: e.y, z: e.z + 10, life: 0.45 + Math.random() * 0.3, max: 1, cb: true });
          }
          if (playerTeam >= 0) note(e.team === playerTeam ? `${nm(e.type)} LOST` : `ENEMY ${nm(e.type)} DESTROYED`, e.team === playerTeam);
          break;
        case 'heliHit':
          if (onScreen(e.x, e.y)) for (let i = 0; i < 8; i++) add({ k: 'spark', x: e.x, y: e.y, z: e.z, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, vz: (Math.random() - 0.5) * 100, life: 0.25, max: 0.25 });
          if (playerTeam >= 0) note(e.team === playerTeam ? 'HELICOPTER GOING DOWN' : 'ENEMY HELICOPTER HIT', e.team === playerTeam);
          break;
        case 'land':
          if (onScreen(e.x, e.y)) for (let i = 0; i < 4; i++) add({ k: 'dirt', x: e.x, y: e.y, z: heightAt(field, e.x, e.y) + 1, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, vz: 10 + Math.random() * 10, life: 0.4, max: 0.4, s: 0.9 });
          break;
        case 'artyWarn':
          if (playerTeam >= 0) note(e.team === playerTeam ? 'FIRE MISSION — SHELLS IN 3' : 'ARTILLERY INCOMING', e.team !== playerTeam);
          if (A) A.radio();
          break;
        case 'artyShell':
          if (A) A.whistle(nearCam(e.x, e.y));
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
          if (playerTeam >= 0) note(e.n === e.of ? 'FINAL ASSAULT — HOLD' : `ENEMY ATTACK ${e.n} OF ${e.of}`, true);
          if (A) A.radio();
          break;
        case 'insert':
          if (playerTeam >= 0 && e.team !== playerTeam) note('ENEMY AIR INSERTION', true);
          break;
        case 'unitLost':
          if (playerTeam >= 0 && e.team === playerTeam && BL.UNITS[e.type].kind === 'inf') note(`${nm(e.type)} SQUAD LOST`, true);
          break;
      }
    }
    S.events.length = 0;
  }

  function explosion(e) {
    if (!onScreen(e.x, e.y, 200)) return;
    const r = e.r;
    add({ k: 'boom', x: e.x, y: e.y, z: e.z, r: r * 0.8, life: 0.13, max: 0.13 });
    if (r >= 20) add({ k: 'ring', x: e.x, y: e.y, z: e.z, r: r * 2.2, life: 0.35, max: 0.35 });
    const n = Math.min(28, Math.round(r * 0.6));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, sp = Math.random() * r * 4;
      add({ k: 'dot', x: e.x, y: e.y, z: e.z + 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 30 + Math.random() * r * 6, life: 1 + Math.random() * 1.4, max: 2.4, s: 0.8 + Math.random() * (r > 30 ? 2.4 : 1.4), red: Math.random() < 0.12 });
    }
    if (e.ground) for (let i = 0; i < Math.min(10, r / 3); i++) add({ k: 'plume', x: e.x + (Math.random() - 0.5) * r * 0.6, y: e.y + (Math.random() - 0.5) * r * 0.4, z: e.z, h: r * (0.8 + Math.random() * 1.4), lean: (Math.random() - 0.5) * 0.6, life: 0.7, max: 0.7 });
    for (let i = 0; i < Math.min(8, Math.round(r / 5)); i++) smoke(e.x + (Math.random() - 0.5) * r * 0.6, e.y + (Math.random() - 0.5) * r * 0.4, e.z + Math.random() * r * 0.4, r * (0.25 + Math.random() * 0.25), 3 + Math.random() * 3, (Math.random() - 0.5) * 16, 8 + Math.random() * 10, 0.28);
    addShake((r >= 30 ? 0.3 : r >= 18 ? 0.12 : 0.04) * nearCam(e.x, e.y));
  }

  // ---------------------------------------------------------------- flares

  function flare(x, y) {
    if (flares.length > 5) flares.shift();
    const g = heightAt(field || BL.__field, x, y);
    flares.push({ x, y, z: g + 4, vz: 260, t: 0, life: 9 + Math.random() * 3, lit: false });
    if (BL.audio) BL.audio.ping(0.4);
  }
  function tickFlares(dt) {
    for (const f of flares) {
      f.t += dt;
      if (!f.lit) { f.vz -= 260 * dt; f.z += f.vz * dt; if (f.vz < 40) f.lit = true; }
      else { f.z -= 9 * dt; f.x += BL.ground.WX.wind * 12 * dt; }
    }
    for (let i = flares.length - 1; i >= 0; i--) if (flares[i].t > flares[i].life) flares.splice(i, 1);
  }
  function flareLight(f) {
    if (!f.lit) return 0;
    const k = f.t / f.life;
    return clamp(Math.min((f.t - 0.4) * 3, (1 - k) * 4), 0, 1) * (0.85 + Math.random() * 0.15);
  }
  // pools of light on the ground (after the terrain, before the units)
  function drawLight(ctx) {
    if (!flares.length) return;
    const z = R.cam.z;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of flares) {
      const Lt = flareLight(f);
      if (Lt <= 0) continue;
      const g = heightAt(field, f.x, f.y);
      const px = sx(f.x), py = sy(f.y, g);
      const r = 300 * z;
      if (px < -r || px > R.W + r) continue;
      ctx.save();
      ctx.translate(px, py); ctx.scale(1, K);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, `rgba(235,228,210,${0.17 * Lt})`);
      gr.addColorStop(0.45, `rgba(235,228,210,${0.06 * Lt})`);
      gr.addColorStop(1, 'rgba(235,228,210,0)');
      ctx.fillStyle = gr; ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
    }
    ctx.restore();
  }
  function drawFlares(ctx) {
    const z = Math.max(0.6, R.cam.z);
    for (const f of flares) {
      const px = sx(f.x), py = sy(f.y, f.z);
      if (px < -40 || px > R.W + 40) continue;
      if (!f.lit) { ctx.strokeStyle = 'rgba(240,233,214,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + f.vz * 0.05 * z); ctx.stroke(); continue; }
      const Lt = flareLight(f);
      ctx.strokeStyle = `rgba(235,228,210,${0.5 * Lt})`; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(px, py - 9 * z, 4 * z, Math.PI, 0); ctx.moveTo(px - 4 * z, py - 9 * z); ctx.lineTo(px, py); ctx.lineTo(px + 4 * z, py - 9 * z); ctx.stroke();
      ctx.fillStyle = `rgba(255,250,236,${Lt})`;
      const s = 2.2 + Math.random();
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
      if (Math.random() < 0.5) add({ k: 'dot', x: f.x, y: f.y, z: f.z, vx: (Math.random() - 0.5) * 10, vy: 0, vz: -10, life: 0.6, max: 0.6, s: 0.8 });
    }
  }

  // ---------------------------------------------------------------- per-frame emitters

  function emitters(S, dt, viewTeam) {
    field = S.field;
    const wind = BL.ground.WX.wind;
    for (const w of S.wrecks) {
      if (!onScreen(w.x, w.y, 200)) continue;
      const age = S.t - w.t;
      const g = heightAt(field, w.x, w.y);
      const rate = age < 50 ? 5 : age < 120 ? 2 : 0.7;
      if (Math.random() < rate * dt) smoke(w.x + (Math.random() - 0.5) * 10, w.y + (Math.random() - 0.5) * 8, g + 10, 5 + Math.random() * 5, 7 + Math.random() * 5, wind * 18, 12 + Math.random() * 8, age < 50 ? 0.3 : 0.18, true);
      w.fire = age < 50;
    }
    for (const u of S.units) {
      if (u.kind === 'inf' || !u.alive) continue;
      if (viewTeam >= 0 && u.team !== viewTeam && !BL.visible(S, viewTeam, u)) continue;
      const m = u.members[0];
      if (!m.smoke && !m.falling) continue;
      if (!onScreen(m.x, m.y)) continue;
      const zz = u.kind === 'air' ? m.alt : m.z + u.def.hgt;
      if (Math.random() < (m.falling ? 30 : 6) * dt) smoke(m.x - Math.cos(m.heading) * 8, m.y - Math.sin(m.heading) * 8, zz, 3 + Math.random() * 3, 3 + Math.random() * 3, wind * 15, 10, 0.3, true);
    }
    for (const p of S.proj) if (p.on && p.kind === 'rocket' && Math.random() < 0.85 && onScreen(p.x, p.y)) smoke(p.x, p.y, p.z, 1.6, 1.2, wind * 10, 4, 0.3);
  }

  // ---------------------------------------------------------------- draw

  function draw(ctx, S, dt) {
    field = S.field;
    const z = R.cam.z;
    for (const o of SM) {
      if (o.life <= 0) continue;
      o.life -= dt;
      o.x += o.vx * dt; o.z += o.vz * dt;
      o.vx += BL.ground.WX.wind * 6 * dt; o.vz *= 1 - 0.15 * dt;
      o.r += dt * (3 + o.r0 * 0.25);
      if (!onScreen(o.x, o.y, 80)) continue;
      const k = o.life / o.max;
      const a = o.a * Math.min(1, k * 1.5) * Math.min(1, (o.max - o.life) * 4);
      const px = sx(o.x), py = sy(o.y, o.z), pr = o.r * z;
      ctx.fillStyle = o.dark ? `rgba(14,13,12,${a * 1.4})` : `rgba(200,194,182,${a * 0.12})`;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(235,228,210,${a * (o.dark ? 0.55 : 0.8)})`;
      const nd = Math.min(22, 5 + pr * 0.6);
      for (let i = 0; i < nd; i++) { const an = hash(o.seed + i) * 6.283, rr = Math.sqrt(hash(o.seed + i * 2.1)) * pr; ctx.fillRect(px + Math.cos(an) * rr, py + Math.sin(an) * rr, 1.1, 1.1); }
    }
    for (const w of S.wrecks) {
      if (!w.fire || !onScreen(w.x, w.y)) continue;
      const g = heightAt(field, w.x, w.y);
      ctx.strokeStyle = Math.random() < 0.5 ? PAL.red : 'rgba(235,200,170,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) { const fx = w.x + (Math.random() - 0.5) * 14, fy = w.y + (Math.random() - 0.5) * 8, fh = 3 + Math.random() * 8; ctx.moveTo(sx(fx), sy(fy, g + 8)); ctx.lineTo(sx(fx), sy(fy, g + 8 + fh)); }
      ctx.stroke();
    }
    // projectiles
    ctx.lineCap = 'round';
    for (const p of S.proj) {
      if (!p.on || !onScreen(p.x, p.y, 60)) continue;
      const red = p.team === 1;
      if (p.kind === 'bullet') {
        ctx.strokeStyle = red ? 'rgba(200,80,66,0.9)' : 'rgba(240,233,214,0.9)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx(p.x - p.vx * 0.018), sy(p.y - p.vy * 0.018, p.z - p.vz * 0.018)); ctx.lineTo(sx(p.x), sy(p.y, p.z)); ctx.stroke();
      } else if (p.kind === 'shell') {
        ctx.strokeStyle = red ? PAL.red : PAL.ink; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(sx(p.x - p.vx * 0.03), sy(p.y - p.vy * 0.03, p.z - p.vz * 0.03)); ctx.lineTo(sx(p.x), sy(p.y, p.z)); ctx.stroke();
      } else if (p.kind === 'rocket') {
        ctx.fillStyle = PAL.ink; ctx.fillRect(sx(p.x) - 1.2, sy(p.y, p.z) - 1.2, 2.4, 2.4);
        ctx.fillStyle = red ? PAL.red : 'rgba(240,220,190,0.9)'; ctx.fillRect(sx(p.x - p.vx * 0.012) - 1, sy(p.y - p.vy * 0.012, p.z - p.vz * 0.012) - 1, 2, 2);
      } else if (p.kind === 'arty') {
        ctx.strokeStyle = 'rgba(235,228,210,0.8)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx(p.x - p.vx * 0.08), sy(p.y - p.vy * 0.08, p.z - p.vz * 0.08)); ctx.lineTo(sx(p.x), sy(p.y, p.z)); ctx.stroke();
      }
    }
    for (let i = 0; i < P.length; i++) {
      const o = P[i];
      if (o.life <= 0) continue;
      o.life -= dt;
      const k = Math.max(0, o.life / o.max);
      switch (o.k) {
        case 'flash': {
          const px = sx(o.x), py = sy(o.y, o.z), s = o.s * Math.max(1, z);
          const ca = Math.cos(o.a), sa = Math.sin(o.a) * K;
          ctx.strokeStyle = o.team === 1 ? 'rgba(220,120,100,0.95)' : 'rgba(255,248,230,0.95)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + ca * s * 1.8, py + sa * s * 1.8);
          ctx.moveTo(px + ca * s * 0.5 - sa * s * 0.6, py + sa * s * 0.5 + ca * s * 0.6); ctx.lineTo(px + ca * s * 0.5 + sa * s * 0.6, py + sa * s * 0.5 - ca * s * 0.6);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,250,236,0.9)'; ctx.fillRect(px - 1, py - 1, 2, 2);
          break;
        }
        case 'dot': case 'dirt': {
          o.vz -= 220 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
          const g = heightAt(field, o.x, o.y);
          if (o.z < g) { o.z = g; o.vx *= 0.4; o.vy *= 0.4; o.vz = Math.abs(o.vz) * 0.25; if (o.k === 'dirt') o.life = 0; }
          if (!onScreen(o.x, o.y, 20)) break;
          const s = Math.max(1, o.s * Math.min(1.6, z));
          ctx.fillStyle = o.red ? `rgba(184,67,58,${Math.min(1, k * 2)})` : o.k === 'dirt' ? `rgba(235,228,210,${k * 0.6})` : `rgba(240,233,214,${Math.min(1, k * 2)})`;
          ctx.fillRect(sx(o.x), sy(o.y, o.z), s, s);
          break;
        }
        case 'spark':
          o.vz -= 200 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
          ctx.strokeStyle = `rgba(255,245,220,${k})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx(o.x), sy(o.y, o.z)); ctx.lineTo(sx(o.x - o.vx * 0.03), sy(o.y - o.vy * 0.03, o.z - o.vz * 0.03)); ctx.stroke();
          break;
        case 'boom': {
          const px = sx(o.x), py = sy(o.y, o.z), rr = o.r * z;
          ctx.fillStyle = `rgba(255,246,226,${k * 0.35})`; ctx.beginPath(); ctx.arc(px, py, rr * (0.9 - k * 0.3), 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(255,250,236,${k * 0.9})`; ctx.beginPath(); ctx.arc(px, py, rr * 0.3, 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(184,67,58,${k})`; ctx.beginPath(); ctx.arc(px, py, rr * 0.16, 0, 6.283); ctx.fill();
          ctx.strokeStyle = `rgba(255,246,226,${k * 0.8})`; ctx.lineWidth = 1;
          ctx.beginPath();
          for (let j = 0; j < 9; j++) { const a = hash(o.x + j) * 6.283, r0 = rr * 0.35, r1 = rr * (0.8 + hash(o.y + j) * 0.7) * (1.3 - k * 0.5); ctx.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0); ctx.lineTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1); }
          ctx.stroke();
          break;
        }
        case 'ring': {
          const g = heightAt(field, o.x, o.y), rr = o.r * z * (1 - k * 0.85);
          ctx.strokeStyle = `rgba(235,228,210,${k * 0.6})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(sx(o.x), sy(o.y, g), rr, rr * K, 0, 0, 6.283); ctx.stroke();
          break;
        }
        case 'plume': {
          const t = 1 - k, top = o.h * Math.min(1, t * 3);
          ctx.strokeStyle = `rgba(235,228,210,${k * 0.6})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx(o.x + o.lean * top * 0.2), sy(o.y, o.z + top * 0.35 * t)); ctx.lineTo(sx(o.x + o.lean * top), sy(o.y, o.z + top)); ctx.stroke();
          break;
        }
        case 'delay':
          if (o.life <= 0 && o.cb) { explosion({ x: o.x, y: o.y, z: o.z, r: 22, ground: false }); if (BL.audio) BL.audio.boom(22, nearCam(o.x, o.y)); }
          break;
      }
    }
  }

  const api = { consume, emitters, draw, reset, notices, note, flare, tickFlares, drawLight, drawFlares, flares, onBig: null };
  BL.fx = api;
})();
