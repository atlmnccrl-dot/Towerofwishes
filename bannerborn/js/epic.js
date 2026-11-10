// Bannerborn — battle spectacle. Kills that land (bodies launched spinning, bone shards, dust), slash arcs on every
// melee hit, impacts that light the ground, an ultimate that stops time for a cinematic beat, slow motion on the last
// kill of a wave, a war horn and a red edge when the next wave comes, a boss arriving under letterbox bars with its name
// slammed in serif, carnage call-outs for chain kills, weather, and a heartbeat vignette when a hero is near death.
// Loaded after battle.js; battle.js calls in through optional hooks.
(function () {
  const BB = window.BB, B = BB.Battle.prototype, hyp = Math.hypot, TAU = Math.PI * 2;
  const SERIF = 'Cinzel, "Cormorant Garamond", Georgia, serif';
  const clamp01 = (k) => Math.max(0, Math.min(1, k)), easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const isFx = (b) => b.save && b.save.settings && b.save.settings.shake === false ? 0.4 : 1;
  function epic(b) { return b.ep || (b.ep = { debris: [], arcs: [], lights: [], calls: [], kills: [], ult: null, cine: null, edge: null, weather: null, beat: 0 }); }

  // ---------------------------------------------------------------- hooks
  B.onHit = function (src, tgt, dmg, crit, o) {
    if (this.peaceful || !src || dmg <= 0) return;
    const E = epic(this);
    if (!src.ranged && !o.aoe && !o.counter) { // a crescent where the blade went through
      const a = Math.atan2(tgt.y - src.y, tgt.x - src.x), s = BB.iso(Math.cos(a), Math.sin(a));
      E.arcs.push({ x: tgt.x, y: tgt.y, a: Math.atan2(s.y, s.x), t: 0, col: src.side === 'hero' ? (src.ench && BB.TRAIT_COL && BB.TRAIT_COL[src.ench] ? BB.TRAIT_COL[src.ench][1] : (src.color || '#ffe7a3')) : '#ff6a5a', big: crit || o.heavy, flip: this.r() < 0.5 });
    }
    if ((crit || o.heavy) && E.lights.length < 5) { E.lights.push({ x: tgt.x, y: tgt.y, t: 0, dur: 0.35, col: crit ? '255,220,140' : '255,160,90', r: crit ? 1.6 : 1.2 }); tgt.flash = Math.max(tgt.flash || 0, 0.25); }
    if (crit && src.side === 'hero' && E.debris.length < 90) for (let i = 0; i < 3; i++) E.debris.push(spark(tgt, '#ffe7a3', 3.5));
  };
  function spark(e, col, sp) { const a = Math.random() * TAU; return { x: e.x, y: e.y, z: 0.9, vx: Math.cos(a) * sp * (0.4 + Math.random()), vy: Math.sin(a) * sp * (0.4 + Math.random()), vz: 1 + Math.random() * 3, t: 0, life: 0.4 + Math.random() * 0.3, col, s: 1.5, glow: true }; }
  B.onKill = function (e, src) {
    if (this.peaceful) return;
    const E = epic(this);
    // launched away from whoever did it, spinning
    if (!e.boss && !e.gate && !e.turret && !e.prop) {
      const dx = e.x - (src ? src.x : e.x - 1), dy = e.y - (src ? src.y : e.y), l = hyp(dx, dy) || 1, f = 2.5 + this.r() * 2.5;
      e.launch = { vx: dx / l * f, vy: dy / l * f, vz: 4 + this.r() * 3, bounced: false }; e.spin = 0; e.spinV = (this.r() < 0.5 ? -1 : 1) * (8 + this.r() * 8);
    }
    // shards and dust
    const bony = /skel|warden|ghoul|necro/.test(e.art || '') || /skel/.test(e.kind || '');
    for (let i = 0, nD = E.debris.length > 80 ? 3 : e.boss ? 30 : 7; i < nD; i++) { const a = this.r() * TAU, sp = 1.5 + this.r() * 4; E.debris.push({ x: e.x, y: e.y, z: 0.6 + this.r() * 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 2 + this.r() * 4, t: 0, life: 0.8 + this.r() * 0.8, col: bony ? (this.r() < 0.6 ? '#e8e2d2' : '#9a907e') : (this.r() < 0.5 ? '#c8a070' : '#6a5040'), s: 1.5 + this.r() * 2.5, bounce: true }); }
    E.lights.push({ x: e.x, y: e.y, t: 0, dur: 0.5, col: '255,190,120', r: e.boss ? 3 : 1.4 });
    // chain kills: carnage
    E.kills = E.kills.filter((k) => this.time - k < 2.2); E.kills.push(this.time);
    const n = E.kills.length; if (n >= 8 && n > (E.lastCall || 0)) { E.lastCall = n; E.lastCall = 99; E.calls.push({ text: 'MASSACRE', t: 0 }); BB.score && BB.score('boom', 1); this.shake = Math.max(this.shake, 0.4); }
    if (n < 3) E.lastCall = 0;
    // the field is clear: slow motion on the last one
    if (!e.boss && !this.result && this.foesAlive().filter((o) => !o.gate && !o.turret).length === 0) {
      this.slow = Math.max(this.slow, 0.4); this.zoomPulse(1.1, 0.8); this.camFocus = { x: e.x, y: e.y, t: 0.6 };
      E.calls.push({ text: 'WAVE CLEARED', t: 0, big: true }); BB.score && BB.score('braam', 0.8); this.flash = Math.max(this.flash, 0.35);
    }
  };
  B.onUlt = function (e) {
    const E = epic(this);
    E.ult = { e, t: 0, dur: 0.95, name: BB.CALLINGS[e.calling].skill.name, col: e.color || '#ffbe55' };
    if (this.time - (E.lastFreeze === undefined ? -99 : E.lastFreeze) > 9) { E.lastFreeze = this.time; this.freeze = 0.2; }
    BB.score && BB.score('hit', 1); BB.score && BB.score('riser', 0.5);
  };
  B.onWave = function (spots) {
    if (this.waveIdx <= 1) return;
    const E = epic(this), c = this.warCenter || this.map.heroSpawn, s = (spots && spots[0]) || this.map.foeSpawns[0];
    E.edge = { a: Math.atan2(BB.iso(s.x - c.x, s.y - c.y).y, BB.iso(s.x - c.x, s.y - c.y).x), t: 0 };
    BB.score && BB.score('horn'); // the horn and the red edge say it; no words this.shake = Math.max(this.shake, 0.25);
  };
  B.onBoss = function (boss) {
    const E = epic(this), n = boss.F.name.split(','); E.cine = { t: 0, dur: 2.6, title: n[0].toUpperCase(), sub: (n[1] || '').trim() };
    this.slow = Math.max(this.slow, 1.4); BB.score && BB.score('braam', 1.2); if (BB.foeVoice) BB.foeVoice(boss, 'enrage');
  };

  // ---------------------------------------------------------------- update
  B.updateEpic = function (dtReal, dt) {
    const E = epic(this);
    for (const d of E.debris) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vz -= 14 * dt; d.z += d.vz * dt; if (d.z < 0) { if (d.bounce && d.vz < -2) { d.z = 0; d.vz *= -0.35; d.vx *= 0.6; d.vy *= 0.6; } else { d.z = 0; d.vx *= 0.8; d.vy *= 0.8; } } }
    E.debris = E.debris.filter((d) => d.t < d.life); if (E.debris.length > 500) E.debris.splice(0, E.debris.length - 500);
    for (const a of E.arcs) a.t += dt; E.arcs = E.arcs.filter((a) => a.t < 0.22);
    for (const l of E.lights) l.t += dt; E.lights = E.lights.filter((l) => l.t < l.dur);
    for (const c of E.calls) c.t += dtReal; E.calls = E.calls.filter((c) => c.t < 1.6);
    if (E.ult) { E.ult.t += dtReal; if (E.ult.t >= E.ult.dur) E.ult = null; else if (E.ult.t > 0.62 && !E.ult.boom) { E.ult.boom = true; const e = E.ult.e; this.flash = Math.max(this.flash, 0.6); this.shake = Math.max(this.shake, 0.7 * isFx(this)); E.lights.push({ x: e.x, y: e.y, t: 0, dur: 0.8, col: '255,230,170', r: 4 }); E.rings = (E.rings || []).concat([{ x: e.x, y: e.y, t: 0 }]); BB.score && BB.score('braam', 0.9); } }
    for (const r of E.rings || []) r.t += dt; if (E.rings) E.rings = E.rings.filter((r) => r.t < 0.7);
    if (E.cine) { E.cine.t += dtReal; if (E.cine.t >= E.cine.dur) E.cine = null; }
    if (E.edge) { E.edge.t += dtReal; if (E.edge.t > 1.8) E.edge = null; }
    // a hero at death's door: the heartbeat
    const low = this.heroesAlive().some((h) => h.hp < h.maxhp * 0.25);
    E.low = low ? Math.min(1, (E.low || 0) + dtReal * 2) : Math.max(0, (E.low || 0) - dtReal * 2);
    if (low && !this.result) { E.beat -= dtReal; if (E.beat <= 0) { E.beat = 0.85; BB.score && BB.score('tick', 0.6); BB.score && BB.score('boom', 0.35); } }
  };
  // bodies in flight
  B.updateLaunch = function (e, dt) {
    const L = e.launch; if (!L) return;
    e.x += L.vx * dt; e.y += L.vy * dt; L.vz -= 18 * dt; e.z = (e.z || 0) + L.vz * dt; e.spin += e.spinV * dt;
    if (e.z <= 0) { e.z = 0; if (!L.bounced && L.vz < -3) { L.bounced = true; L.vz *= -0.3; L.vx *= 0.4; L.vy *= 0.4; e.spinV *= 0.3; const E = epic(this); for (let i = 0; i < 6; i++) E.debris.push({ x: e.x, y: e.y, z: 0.1, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: 1 + Math.random() * 2, t: 0, life: 0.6, col: 'rgba(150,130,110,0.8)', s: 3 }); } else { e.launch = null; e.spinV = 0; e.spin = Math.round(e.spin / Math.PI) * Math.PI * 0.5; } }
    BB.collide && BB.collide(this.map, e);
  };

  // ---------------------------------------------------------------- drawing
  // on the ground, under everyone: light from impacts
  B.drawGroundLights = function (ctx) {
    const E = epic(this); if (!E.lights.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const l of E.lights) { const s = BB.iso(l.x, l.y), k = 1 - l.t / l.dur, r = l.r * 26 * (1 + (1 - k) * 0.5); BB.drawGlow(ctx, l.col, s.x, s.y, r, r * 0.5, 0.7 * k); }
    ctx.restore();
  };
  // in the world, over everyone: shards, slash arcs, shock rings
  B.drawWorldEpic = function (ctx) {
    const E = epic(this);
    for (const d of E.debris) { const s = BB.iso(d.x, d.y), y = s.y - d.z * 24, a = Math.min(1, (d.life - d.t) * 3); ctx.globalAlpha = a; if (d.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = d.col; ctx.fillRect(s.x - 1, y - 1, 2.2, 2.2); ctx.globalCompositeOperation = 'source-over'; } else { ctx.fillStyle = d.col; ctx.fillRect(s.x - d.s / 2, y - d.s / 2, d.s, d.s * 0.7); } }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const a of E.arcs) { const s = BB.iso(a.x, a.y), k = a.t / 0.22, r = (a.big ? 20 : 14) * (0.7 + k * 0.5); ctx.save(); ctx.translate(s.x, s.y - 18); ctx.rotate(a.a + (a.flip ? 1.2 : -1.2)); ctx.scale(1, 0.55);
      ctx.strokeStyle = a.col; ctx.beginPath(); ctx.arc(0, 0, r, -1.1 + k * 0.6, 1.1 + k * 0.6); ctx.globalAlpha = (1 - k) * 0.3; ctx.lineWidth = (a.big ? 9 : 6.5) * (1 - k * 0.6); ctx.stroke(); ctx.globalAlpha = 1 - k; ctx.lineWidth = (a.big ? 4 : 2.6) * (1 - k * 0.6); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r, -0.8 + k * 0.6, 0.8 + k * 0.6); ctx.stroke(); ctx.restore(); }
    for (const r of E.rings || []) { const s = BB.iso(r.x, r.y), k = r.t / 0.7; ctx.strokeStyle = 'rgba(255,230,170,' + (1 - k) + ')'; ctx.lineWidth = 6 * (1 - k); ctx.beginPath(); ctx.ellipse(s.x, s.y, k * 160, k * 80, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(s.x, s.y, k * 110, k * 55, 0, 0, TAU); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
  };
  // on the screen, over everything
  B.drawEpic = function (ctx, W, H, dpr) {
    const E = epic(this), u = H / 720;
    // weather by land
    if (!E.weather) E.weather = this.map.skin ? BB.LANDSKINS[this.map.skin].weather : this.map.biome === 'sand' ? 'sand' : /gate|tombs|march|throne/.test(this.mission && this.mission.layout || '') ? 'ash' : 'embers';
    const t = this.time;
    ctx.save();
    for (let i = 0, nW = BB.lowFx ? 14 : 30; i < nW; i++) { const h1 = Math.abs(Math.sin(i * 91.7)) % 1, h2 = Math.abs(Math.sin(i * 37.3)) % 1;
      if (E.weather === 'sand') { const x = ((h1 * W + t * W * 0.35) % (W + 60)) - 30, y = (h2 * H + Math.sin(t * 2 + i) * 10); ctx.fillStyle = 'rgba(240,210,150,0.35)'; ctx.fillRect(x, y, 6 * u, 1.2 * u); }
      else if (E.weather === 'snow') { const x = ((h1 * W - t * 26 * u * (0.6 + h2) + Math.sin(t * 0.9 + i) * 24 * u) % W + W) % W, y = (h2 * H + t * (34 + h1 * 40) * u) % H, sz = (1.6 + (i % 3)) * u; ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.3 * h1) + ')'; ctx.fillRect(x, y, sz, sz); }
      else if (E.weather === 'cinders') { if (i % 2) { const x = ((h1 * W + Math.sin(t * 0.7 + i) * 30) % W + W) % W, y = (h2 * H + t * 26 * u) % H; ctx.fillStyle = 'rgba(190,186,182,0.45)'; ctx.fillRect(x, y, 2 * u, 2 * u); } else { const x = ((h1 * W + Math.sin(t + i) * 26) % W + W) % W, y = H - ((h2 * H + t * 52 * u) % H); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,130,40,' + (0.35 + 0.3 * Math.sin(t * 4 + i)) + ')'; ctx.fillRect(x, y, 2.4 * u, 2.4 * u); ctx.globalCompositeOperation = 'source-over'; } }
      else if (E.weather === 'spores' || E.weather === 'motes') { const x = ((h1 * W + Math.sin(t * 0.5 + i * 1.7) * 36 * u) % W + W) % W, y = H - ((h2 * H + t * 14 * u * (0.5 + h1)) % H); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = (E.weather === 'spores' ? 'rgba(150,220,110,' : 'rgba(214,130,255,') + (0.22 + 0.2 * Math.sin(t * 1.6 + i)) + ')'; ctx.fillRect(x, y, 2.4 * u, 2.4 * u); ctx.globalCompositeOperation = 'source-over'; }
      else if (E.weather === 'ash') { const x = ((h1 * W + Math.sin(t * 0.7 + i) * 30) % W + W) % W, y = (h2 * H + t * 30 * u) % H; ctx.fillStyle = 'rgba(200,200,205,0.4)'; ctx.fillRect(x, y, 2 * u, 2 * u); }
      else { const x = ((h1 * W + Math.sin(t + i) * 20) % W + W) % W, y = H - ((h2 * H + t * 40 * u) % H); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,80,' + (0.25 + 0.25 * Math.sin(t * 3 + i)) + ')'; ctx.fillRect(x, y, 2 * u, 2 * u); ctx.globalCompositeOperation = 'source-over'; } }
    // the next wave's direction flares red at the screen edge
    if (E.edge) { const k = E.edge.t, a = Math.min(1, k * 4) * Math.max(0, 1 - (k - 1) * 1.25), cx = W / 2 + Math.cos(E.edge.a) * W * 0.55, cy = H / 2 + Math.sin(E.edge.a) * H * 0.55; const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.5); gr.addColorStop(0, 'rgba(255,40,30,' + 0.45 * a * (0.7 + 0.3 * Math.sin(k * 14)) + ')'); gr.addColorStop(1, 'rgba(255,40,30,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
    // near death: a red heartbeat at the edges
    if (E.low > 0) { const p = 0.6 + 0.4 * Math.pow(Math.max(0, Math.sin(t * 7.4)), 6), vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7); vg.addColorStop(0, 'rgba(160,0,0,0)'); vg.addColorStop(1, 'rgba(160,0,0,' + 0.4 * E.low * p + ')'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); }
    // the ultimate: time stops, a band sweeps across with the hero, the name slams in
    if (E.ult) {
      const k = E.ult.t, e = E.ult.e, inK = easeOut(clamp01(k / 0.18)), outK = clamp01((k - 0.85) / 0.3), band = H * 0.34, cy = H * 0.5, sl = W * 0.06;
      ctx.fillStyle = 'rgba(0,0,0,' + 0.45 * (1 - outK) + ')'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate((1 - inK) * -W + outK * W, 0);
      ctx.beginPath(); ctx.moveTo(-sl, cy - band / 2); ctx.lineTo(W + sl, cy - band / 2 - sl * 0.4); ctx.lineTo(W + sl, cy + band / 2 - sl * 0.4); ctx.lineTo(-sl, cy + band / 2); ctx.closePath();
      const gr = ctx.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#000'); gr.addColorStop(0.5, E.ult.col); gr.addColorStop(1, '#000'); ctx.fillStyle = gr; ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1; ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 40; i++) { const y = cy - band / 2 + Math.abs(Math.sin(i * 12.9)) % 1 * band, x = ((Math.abs(Math.sin(i * 7.7)) % 1) * W + k * W * 3) % W; ctx.fillRect(x, y, W * 0.12, 1.5 * u); }
      const S = Math.max(4, Math.round(band * 1.5 / 42)); ctx.imageSmoothingEnabled = false; if (e.layers) BB.drawLayers(ctx, e.layers, BB.hasClip(e.layers[0].key, 'Special1') ? 'Special1' : 'Attack1', 1, Math.min(10, Math.floor(k * 16)), W * 0.3, cy + band * 0.95, S, { noSlash: true }); ctx.imageSmoothingEnabled = true;
      ctx.restore(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * u; ctx.stroke(); ctx.restore();
      const tk = clamp01((k - 0.12) / 0.15), ts = 1 + (1 - tk) * 1.5; ctx.save(); ctx.globalAlpha = tk * (1 - outK); ctx.translate(W * 0.66, cy); ctx.scale(ts, ts); ctx.font = '800 ' + Math.round(H * 0.075) + 'px ' + SERIF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = E.ult.col; ctx.shadowBlur = H * 0.04; ctx.fillText(E.ult.name.toUpperCase(), 0, 0); ctx.font = '600 ' + Math.round(H * 0.026) + 'px Outfit, sans-serif'; ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(e.hero.name.toUpperCase(), 0, H * 0.065); ctx.restore();
    }
    // the boss arrives: bars, its name slammed in
    if (E.cine) {
      const k = E.cine.t, bars = Math.min(1, k * 4) * Math.min(1, (E.cine.dur - k) * 3), bh = H * 0.11 * bars; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
      const tk = clamp01((k - 0.5) / 0.2), a = tk * Math.min(1, (E.cine.dur - k) * 2.5), sc = 1 + (1 - easeOut(tk)) * 2.2;
      if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * 0.3); ctx.scale(sc, sc); ctx.font = '800 ' + Math.round(H * 0.1) + 'px ' + SERIF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe2c8'; ctx.shadowColor = '#ff4a2a'; ctx.shadowBlur = H * 0.05; ctx.fillText(E.cine.title, 0, 0); ctx.shadowBlur = 0; ctx.font = '600 ' + Math.round(H * 0.03) + 'px "Cormorant Garamond", Georgia, serif'; ctx.fillStyle = '#e8d8c8'; ctx.fillText(E.cine.sub, 0, H * 0.075); ctx.restore(); }
      if (tk > 0 && !E.cine.hit) { E.cine.hit = true; this.shake = Math.max(this.shake, 0.8 * isFx(this)); this.flash = Math.max(this.flash, 0.5); }
    }
    // call-outs
    for (const c of E.calls) { const k = c.t / 1.6, a = Math.min(1, c.t * 6) * Math.min(1, (1.6 - c.t) * 3), sc = 1 + (1 - easeOut(clamp01(c.t / 0.2))) * 1.4;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * (c.big ? 0.4 : c.small ? 0.24 : 0.3)); ctx.scale(sc, sc); ctx.font = '800 ' + Math.round(H * (c.big ? 0.085 : c.small ? 0.04 : 0.06)) + 'px ' + SERIF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = c.small ? '#ffb0a0' : '#ffe7a3'; ctx.shadowColor = c.small ? '#ff3020' : '#ff9a2a'; ctx.shadowBlur = H * 0.03; ctx.fillText(c.text, 0, 0); ctx.restore(); void k; }
    ctx.restore();
  };
})();
