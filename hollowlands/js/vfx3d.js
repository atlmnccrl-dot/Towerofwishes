'use strict';
// HOLLOWLANDS — effects engine for the 3D view: glowing particles, weapon trails, shockwaves, debris,
// light flashes, light pillars, afterimages, scorch marks, and screen-level punches (flash, colour split,
// zoom kick, slow motion). Game code calls HL.vfx.*; without WebGL the calls fall back to the 2D effects.
HL.vfx = (() => {
  const P = HL.P;
  const fb = { // 2D fallback
    hit: (x, y, a, pw, col) => HL.fx.burst(x, y - 5, col || P.cream, 4 + pw * 3, 40 + pw * 20),
    shock: (x, y, r, col) => HL.fx.ring(x, y, r, col || P.cream, 0.4, 2),
    burst: (x, y, z, col, n) => HL.fx.burst(x, y - (z || 4), col || P.cream, n || 8, 50),
    embers: (x, y, n) => HL.fx.burst(x, y - 4, P.fire, n || 6, 30), dust: (x, y, n) => HL.fx.dust(x, y, n || 3),
    debris: (x, y, n) => HL.fx.burst(x, y, P.st1, n || 6, 50), beam() {}, flash() {}, chroma() {}, kick() {}, light() {}, scorch() {}, death(e) { HL.fx.burst(e.x, e.y - 4, P.red1, 12, 50, 0.6); },
    trail() {}, trailEnd() {}, ghost() {}, orb() {}, ring3d() {}, crack() {},
  };
  const api = Object.assign({}, fb, { ok: false });
  const T = window.THREE;
  if (!T) return api;
  let scene, R;
  const C = (h) => new T.Color(h);

  // ---------------------------------------------------------------- glowing particle system (additive) + smoke (normal)
  function makeSystem(N, additive) {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.setAttribute('size', new T.BufferAttribute(size, 1)); g.setAttribute('alpha', new T.BufferAttribute(alpha, 1));
    const m = new T.ShaderMaterial({
      uniforms: { attn: { value: 0 } },
      vertexShader: 'uniform float attn; attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * mix(1.0, clamp(70.0 / -mv.z, 0.35, 2.6), attn); }',
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vC * (1.15 - r * 0.5), vA * (1.0 - r * 0.35)); }',
      transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
    });
    const pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = additive ? 8 : 7;
    return { pts, pos, col, size, alpha, N, list: [] };
  }
  let glow, smoke;
  function spawn(sys, o) {
    if (sys.list.length >= sys.N) sys.list.shift();
    const c = C(o.col || P.cream);
    sys.list.push({ x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, t: 0, life: o.life || 0.5, s0: o.s0 || 3, s1: o.s1 == null ? 0 : o.s1, r: c.r, g: c.g, b: c.b, drag: o.drag == null ? 2 : o.drag, grav: o.grav == null ? 0 : o.grav, a: o.a == null ? 1 : o.a, floor: o.floor !== false });
  }
  function stepSystem(sys, dt) {
    let n = 0;
    for (const p of sys.list) {
      p.t += dt;
      const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; p.vy -= p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.floor && p.y < 0.2) { p.y = 0.2; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
    }
    sys.list = sys.list.filter((p) => p.t < p.life);
    for (const p of sys.list) {
      const q = p.t / p.life;
      sys.pos[n * 3] = p.x; sys.pos[n * 3 + 1] = p.y; sys.pos[n * 3 + 2] = p.z;
      sys.col[n * 3] = p.r; sys.col[n * 3 + 1] = p.g; sys.col[n * 3 + 2] = p.b;
      sys.size[n] = Math.max(1, p.s0 + (p.s1 - p.s0) * q); sys.alpha[n] = p.a * (1 - q * q);
      n++;
    }
    const g = sys.pts.geometry;
    g.setDrawRange(0, n);
    for (const k of ['position', 'color', 'size', 'alpha']) g.attributes[k].needsUpdate = true;
  }

  // ---------------------------------------------------------------- pools: shockwaves, debris, lights, beams, decals, ghosts, orbs
  const rings = [], debris = [], lights = [], beams = [], decals = [], ghosts = [], trails = {}, orbs = [];
  let ringGeo, ringGeoThick, beamGeo, debrisGeo, decalGeo, ghostMat;
  function ring(x, y, z, r, col, dur, flat = true, width = 0.12, dark = false) {
    const add = api.dark && !dark;
    let o = rings.find((q) => !q.on && q.add === add && q.thick === dark);
    if (!o) { const m = new T.Mesh(dark ? ringGeoThick : ringGeo, new T.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending, side: T.DoubleSide })); m.renderOrder = dark ? 8 : 9; scene.add(m); o = { m, add, thick: dark }; rings.push(o); }
    Object.assign(o, { on: true, t: 0, x, y, z, r, dur, flat, width, op: dark ? 0.45 : 1 }); o.m.material.color.set(col); o.m.visible = true;
    return o;
  }
  function light(x, y, col, intensity, dur, h = 10) {
    let o = lights.find((q) => !q.on) || lights.reduce((a, b) => (a.t / a.dur > b.t / b.dur ? a : b));
    Object.assign(o, { on: true, t: 0, dur, i: intensity }); o.l.color.set(col); o.l.position.set(x, h, y); o.l.intensity = intensity;
  }
  function beam(x, y, col, dur, r = 6, h = 160) {
    let o = beams.find((q) => !q.on);
    if (!o) { const m = new T.Mesh(beamGeo, new T.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide })); m.renderOrder = 9; scene.add(m); o = { m }; beams.push(o); }
    if (api.tpOn) r *= 0.35; // seen from behind the shoulder, a top-view pillar would fill the screen
    const add = api.dark || api.tpOn; o.m.material.blending = add ? T.AdditiveBlending : T.NormalBlending; o.m.material.vertexColors = add; o.m.material.needsUpdate = true;
    Object.assign(o, { on: true, t: 0, dur, r, h }); o.m.material.color.set(col); o.m.position.set(x, 0, y); o.m.visible = true;
  }
  function decal(x, y, r, col, dur) {
    let o = decals.find((q) => !q.on) || decals[0];
    if (!o || decals.length < 40 && o.on) { const m = new T.Mesh(decalGeo, new T.MeshBasicMaterial({ transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.renderOrder = 1; scene.add(m); o = { m }; decals.push(o); }
    Object.assign(o, { on: true, t: 0, dur }); o.m.material.color.set(col); o.m.position.set(x, 0.12 + decals.indexOf(o) * 0.002, y); o.m.scale.setScalar(r); o.m.rotation.z = Math.random() * 6; o.m.visible = true;
  }
  function chunk(x, y, z, vx, vy, vz, col, s) {
    let o = debris.find((q) => !q.on);
    if (!o) { if (debris.length > 160) o = debris[0]; else { const m = new T.Mesh(debrisGeo, new T.MeshLambertMaterial({ color: col, flatShading: true })); m.castShadow = true; scene.add(m); o = { m }; debris.push(o); } }
    Object.assign(o, { on: true, t: 0, x, y, z, vx, vy, vz, life: 1.4 + Math.random(), rx: Math.random() * 10, ry: Math.random() * 10 }); o.m.material.color.set(col); o.m.scale.setScalar(s); o.m.visible = true;
  }

  // ---------------------------------------------------------------- public API
  Object.assign(api, {
    init(sc, renderer3) {
      scene = sc; R = renderer3; api.ok = true;
      glow = makeSystem(1400, true); smoke = makeSystem(700, false); scene.add(glow.pts, smoke.pts);
      ringGeo = new T.RingGeometry(0.84, 1, 48); ringGeoThick = new T.RingGeometry(0.55, 1.08, 40);
      const bg = new T.CylinderGeometry(1, 1, 1, 12, 4, true).translate(0, 0.5, 0), cc = [];
      for (let i = 0; i < bg.attributes.position.count; i++) { const y = bg.attributes.position.getY(i); const a = Math.pow(1 - y, 1.6); cc.push(a, a, a); }
      bg.setAttribute('color', new T.Float32BufferAttribute(cc, 3)); beamGeo = bg;
      debrisGeo = new T.BoxGeometry(1, 1, 1);
      const dc = HL.canvas(32, 32), dg = dc.g; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const d = Math.hypot(x - 16, y - 16) / 16 + (HL.hash(x, y, 7) - 0.5) * 0.35; if (d < 1) { dg.fillStyle = 'rgba(255,255,255,' + Math.min(1, (1 - d) * 1.8) + ')'; dg.fillRect(x, y, 1, 1); } }
      const tx = new T.CanvasTexture(dc); tx.magFilter = T.NearestFilter; decalGeo = new T.PlaneGeometry(2, 2);
      api._decalTex = tx;
      for (let i = 0; i < 5; i++) { const l = new T.PointLight(0xffffff, 0, 90, 1.5); scene.add(l); lights.push({ l, on: false, t: 0, dur: 1, i: 0 }); }
      ghostMat = new T.MeshBasicMaterial({ color: P.cream, transparent: true, opacity: 0.4, depthWrite: false, blending: T.AdditiveBlending });
    },
    // a strike lands: sparks along the blow, a hot core, a quick light
    hit(x, y, a, pw = 1, col = P.cream) {
      const n = 6 + pw * 6;
      for (let i = 0; i < n; i++) { const d = a + (Math.random() - 0.5) * 1.6, s = 60 + Math.random() * 90 * pw; spawn(glow, { x, y: 6 + Math.random() * 3, z: y, vx: Math.cos(d) * s, vy: 20 + Math.random() * 60, vz: Math.sin(d) * s, col: i % 3 ? col : '#ffd27a', life: 0.3 + Math.random() * 0.25, s0: 4.5, s1: 1.5, drag: 5, grav: 160 }); }
      spawn(glow, { x, y: 7, z: y, col: '#fff3c4', life: 0.1, s0: 18 + pw * 10, s1: 6, drag: 0, floor: false });
      spawn(glow, { x, y: 7, z: y, col: col, life: 0.16, s0: 10 + pw * 6, s1: 14 + pw * 8, drag: 0, floor: false, a: 0.6 });
      if (pw > 1.2) { ring(x, 0.6, y, 9, col, 0.3); ring(x, 0.5, y, 10, '#4a4038', 0.35, true, 0.12, true); }
      light(x, y, col === P.cream ? 0xffe2b0 : col, 30 + pw * 25, 0.15);
    },
    shock(x, y, r, col = P.cream, dur = 0.45) { ring(x, 0.4, y, r * 1.05, '#4a4038', dur * 1.1, true, 0.12, true); ring(x, 0.5, y, r, col, dur); ring(x, 0.55, y, r * 0.7, '#fff3c4', dur * 0.8); for (let i = 0; i < r * 0.8; i++) { const a = Math.random() * 6.3; spawn(smoke, { x: x + Math.cos(a) * r * 0.3, y: 1.5, z: y + Math.sin(a) * r * 0.3, vx: Math.cos(a) * r * 3, vy: 6, vz: Math.sin(a) * r * 3, col: P.ash2, life: 0.6, s0: 5, s1: 9, drag: 4, a: 0.6 }); } },
    ring3d(x, y, z, r, col, dur, w) { ring(x, z, y, r, col, dur, true, w); },
    burst(x, y, z, col = P.cream, n = 10, sp = 60, life = 0.6) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, e = Math.random() * 1.2, s = sp * (0.3 + Math.random() * 0.7); spawn(glow, { x, y: z || 6, z: y, vx: Math.cos(a) * Math.cos(e) * s, vy: Math.sin(e) * s + 10, vz: Math.sin(a) * Math.cos(e) * s, col, life: life * (0.5 + Math.random() * 0.6), s0: 4.5, s1: 0.5, drag: 3, grav: 40 }); } },
    embers(x, y, n = 8, col = P.fire) { for (let i = 0; i < n; i++) spawn(glow, { x: x + (Math.random() - 0.5) * 8, y: 2 + Math.random() * 6, z: y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 10, vy: 15 + Math.random() * 25, vz: (Math.random() - 0.5) * 10, col: Math.random() < 0.3 ? '#ffd27a' : col, life: 0.8 + Math.random() * 0.9, s0: 3.5, s1: 0.8, drag: 0.8, floor: false }); },
    dust(x, y, n = 4) { for (let i = 0; i < n; i++) spawn(smoke, { x: x + (Math.random() - 0.5) * 4, y: 1, z: y + (Math.random() - 0.5) * 3, vx: (Math.random() - 0.5) * 16, vy: 8 + Math.random() * 8, vz: (Math.random() - 0.5) * 16, col: P.ash1, life: 0.5 + Math.random() * 0.3, s0: 3, s1: 7, drag: 3, a: 0.7 }); },
    debris(x, y, n = 8, col = P.st1, pw = 1) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, s = (30 + Math.random() * 60) * pw; chunk(x, 2, y, Math.cos(a) * s, 50 + Math.random() * 70 * pw, Math.sin(a) * s, Math.random() < 0.3 ? P.st3 : col, 1.8 + Math.random() * 2.4); } },
    beam(x, y, col = P.lt0, dur = 1, r = 6, h = 160) { beam(x, y, col, dur, r, h); },
    light(x, y, col, i, dur, h) { light(x, y, col, i, dur, h); },
    scorch(x, y, r = 10, col = '#1c1414') { decal(x, y, r, col, 9); },
    crack(x, y, r = 22) { decal(x, y, r, '#120c0c', 12); for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.3 + Math.random() * 0.5; decal(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.35, '#1a1212', 12); } },
    flash(col = '#fff6e0', amt = 0.6) { R.post.flashCol.set(col); R.post.flash = Math.max(R.post.flash, amt); },
    chroma(amt = 1) { R.post.chroma = Math.max(R.post.chroma, amt); },
    kick(amt = 1) { R.post.kick = Math.max(R.post.kick, amt); },
    slowmo(dur = 0.5, scale = 0.25) { const G = HL.G; G.slowT = Math.max(G.slowT || 0, dur); G.slowScale = scale; },
    // the hollow come apart as ash and embers; armour as broken iron; the Keeper as a storm
    death(e) {
      const big = e.type === 'keeper' ? 3 : e.type === 'brute' || e.type === 'guard' ? 1.6 : 1;
      api.embers(e.x, e.y, 12 * big, e.type === 'wraith' ? '#9fb4c8' : P.fire);
      for (let i = 0; i < 14 * big; i++) spawn(smoke, { x: e.x + (Math.random() - 0.5) * 6 * big, y: 2 + Math.random() * 10 * big, z: e.y + (Math.random() - 0.5) * 6 * big, vx: (Math.random() - 0.5) * 20, vy: 10 + Math.random() * 20, vz: (Math.random() - 0.5) * 20, col: Math.random() < 0.5 ? P.ch0 : P.st3, life: 0.9 + Math.random() * 0.6, s0: 4 * big, s1: 9 * big, drag: 2, a: 0.75, floor: false });
      if (e.type === 'guard' || e.type === 'brute') api.debris(e.x, e.y, 10, P.st2, 1.2);
      if (e.type !== 'wraith') api.scorch(e.x, e.y, 6 * big, e.type === 'hound' || e.type === 'drifter' ? '#3a1414' : '#1c1414');
      light(e.x, e.y, P.fire, 40 * big, 0.4);
    },
    // weapon trails: a ribbon through the last positions of a blade's base and tip
    trail(id, ax, ay, az, bx, by, bz, col) {
      let t = trails[id];
      if (!t) {
        const N = 14, g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(N * 2 * 3), 3)); g.setAttribute('color', new T.BufferAttribute(new Float32Array(N * 2 * 3), 3));
        const idx = []; for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
        const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide })); m.frustumCulled = false; m.renderOrder = 9; scene.add(m);
        t = trails[id] = { m, N, pts: [], col: C(col) };
      }
      t.col.set(col); t.live = true;
      if (t.m.material.blending !== (api.dark ? T.AdditiveBlending : T.NormalBlending)) { t.m.material.blending = api.dark ? T.AdditiveBlending : T.NormalBlending; t.m.material.needsUpdate = true; }
      t.pts.unshift({ a: [ax, ay, az], b: [bx, by, bz], age: 0 }); if (t.pts.length > t.N) t.pts.pop();
    },
    trailEnd(id) { if (trails[id]) trails[id].live = false; },
    ghost(fig, col = P.cream) {
      const g = fig.g.clone(true); g.traverse((o) => { if (o.isMesh) { o.material = ghostMat.clone(); o.material.color.set(api.dark ? col : col === P.cream ? '#3a3030' : col); o.material.blending = api.dark ? T.AdditiveBlending : T.NormalBlending; o.castShadow = false; } });
      scene.add(g); ghosts.push({ g, t: 0, dur: 0.32 });
    },
    // glowing orb projectiles drawn by the game each frame (bolts, wraith orbs, arrows)
    // ash streams from a fallen foe into the Wayfarer
    motes(x, y, p, n = 6) { for (let i = 0; i < n; i++) { const life = 0.45 + Math.random() * 0.25, sx = x + (Math.random() - 0.5) * 8, sy = y + (Math.random() - 0.5) * 6, sz = 6 + Math.random() * 8; spawn(glow, { x: sx, y: sz, z: sy, vx: (p.x - sx) / life, vy: (8 - sz) / life + 30, vz: (p.y - sy) / life, col: Math.random() < 0.5 ? '#ff9a6a' : '#ffd0a0', life, s0: 3.5, s1: 1.5, drag: 0, grav: 60, floor: false }); } },
    orb(x, y, z, col, size = 6, trail = true) { spawn(glow, { x, y: z, z: y, col: '#fff3c4', life: 0.04, s0: size * 0.6, s1: size * 0.6, drag: 0, floor: false }); spawn(glow, { x, y: z, z: y, col, life: 0.05, s0: size * 1.4, s1: size * 1.4, drag: 0, floor: false, a: 0.85 }); if (trail) spawn(glow, { x, y: z, z: y, col, life: 0.25, s0: size, s1: 0, drag: 0, floor: false, a: 0.7 }); },
    update(dt) {
      if (!api.ok) return;
      stepSystem(glow, dt); stepSystem(smoke, dt);
      for (const o of rings) if (o.on) {
        o.t += dt; const q = o.t / o.dur; if (q >= 1) { o.on = false; o.m.visible = false; continue; }
        const e = 1 - Math.pow(1 - q, 3), r = Math.max(0.5, o.r * (0.15 + 0.85 * e));
        o.m.position.set(o.x, o.y, o.z); o.m.rotation.set(-Math.PI / 2, 0, 0); o.m.scale.set(r, r, 1);
        o.m.material.opacity = (1 - q) * o.op;
      }
      for (const o of lights) if (o.on) { o.t += dt; const q = o.t / o.dur; if (q >= 1) { o.on = false; o.l.intensity = 0; } else o.l.intensity = o.i * (1 - q) * (1 - q); }
      for (const o of beams) if (o.on) { o.t += dt; const q = o.t / o.dur; if (q >= 1) { o.on = false; o.m.visible = false; continue; } const s = q < 0.15 ? q / 0.15 : 1; o.m.scale.set(o.r * (q < 0.15 ? 2 - s : 1 - q * 0.6), o.h * s, o.r * (q < 0.15 ? 2 - s : 1 - q * 0.6)); o.m.material.opacity = (1 - q) * (api.dark ? 1 : api.tpOn ? 0.6 : 0.8); }
      for (const o of decals) if (o.on) { o.t += dt; const q = o.t / o.dur; if (q >= 1) { o.on = false; o.m.visible = false; continue; } o.m.material.opacity = Math.min(0.75, (1 - q) * 1.4); if (!o.m.material.alphaMap) { o.m.material.alphaMap = api._decalTex; o.m.material.needsUpdate = true; } }
      for (const o of debris) if (o.on) {
        o.t += dt; if (o.t > o.life) { o.on = false; o.m.visible = false; continue; }
        o.vy -= 220 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
        if (o.y < 0.6) { o.y = 0.6; o.vy *= -0.35; o.vx *= 0.6; o.vz *= 0.6; } else { o.rx += dt * 9; o.ry += dt * 7; }
        o.m.position.set(o.x, o.y, o.z); o.m.rotation.set(o.rx, o.ry, 0);
        if (o.t > o.life - 0.3) o.m.scale.multiplyScalar(0.92);
      }
      for (const gh of ghosts) { gh.t += dt; const q = gh.t / gh.dur; gh.g.traverse((o) => { if (o.isMesh) o.material.opacity = (api.dark ? 0.45 : 0.55) * (1 - q); }); if (q >= 1) { scene.remove(gh.g); gh.done = true; } }
      for (let i = ghosts.length - 1; i >= 0; i--) if (ghosts[i].done) ghosts.splice(i, 1);
      for (const id in trails) {
        const t = trails[id];
        for (const p of t.pts) p.age += dt;
        if (!t.live) t.pts = t.pts.filter((p) => p.age < 0.12);
        const pos = t.m.geometry.attributes.position.array, col = t.m.geometry.attributes.color.array;
        const n = t.pts.length;
        for (let i = 0; i < t.N; i++) {
          const p = t.pts[Math.min(i, n - 1)];
          const k = n > 1 ? Math.max(0, 1 - i / (n - 1)) * Math.max(0, 1 - p.age * 6) : 0;
          for (let s = 0; s < 2; s++) { const v = s ? p ? p.b : [0, -99, 0] : p ? p.a : [0, -99, 0]; pos[(i * 2 + s) * 3] = v[0]; pos[(i * 2 + s) * 3 + 1] = v[1]; pos[(i * 2 + s) * 3 + 2] = v[2]; const kk = api.dark ? (s ? k : k * 0.15) : 1, wk = api.dark ? 0 : (1 - k) * 0.35; col[(i * 2 + s) * 3] = t.col.r * kk + wk; col[(i * 2 + s) * 3 + 1] = t.col.g * kk + wk; col[(i * 2 + s) * 3 + 2] = t.col.b * kk + wk; }
          if (!api.dark && i >= n - 1) { for (let s = 0; s < 2; s++) { const v = p ? p.a : [0, -99, 0]; pos[(i * 2 + s) * 3] = v[0]; pos[(i * 2 + s) * 3 + 1] = v[1]; pos[(i * 2 + s) * 3 + 2] = v[2]; } }
        }
        t.m.visible = n > 1;
        t.m.geometry.attributes.position.needsUpdate = true; t.m.geometry.attributes.color.needsUpdate = true;
      }
    },
    attn(on) { api.tpOn = !!on; if (!api.ok) return; glow.pts.material.uniforms.attn.value = on ? 1 : 0; smoke.pts.material.uniforms.attn.value = on ? 1 : 0; },
    setDark(d) { api.dark = !!d; if (!api.ok) return; glow.pts.material.blending = d ? T.AdditiveBlending : T.NormalBlending; glow.pts.material.needsUpdate = true; },
    clear() {
      if (!api.ok) return;
      glow.list = []; smoke.list = [];
      for (const pool of [rings, beams, decals, debris]) for (const o of pool) { o.on = false; o.m.visible = false; }
      for (const o of lights) { o.on = false; o.l.intensity = 0; }
      for (const gh of ghosts) scene.remove(gh.g); ghosts.length = 0;
      for (const id in trails) { trails[id].pts = []; trails[id].m.visible = false; }
    },
  });
  return api;
})();
