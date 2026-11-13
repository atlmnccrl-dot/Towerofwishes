// Effects: sword trails, pixel particles (sparks, blood, mist, embers), blood on the stones,
// ground telegraphs for foe attacks and hazards, projectiles, dash afterimages, shock rings.
import * as THREE from 'three';
import * as T from './textures.js';

const MAXP = 1600;

export class FX {
  constructor(scene) {
    this.scene = scene; this.group = new THREE.Group(); scene.add(this.group);
    this._particles(); this.trails = []; this.decals = []; this.teles = new Map(); this.hz = new Map(); this.projs = new Map(); this.ghosts = []; this.rings = []; this.bolts = []; this.slashes = [];
    this.decalGeo = new THREE.CircleGeometry(0.5, 7);
    this.decalMat = new THREE.MeshLambertMaterial({ color: 0x3a0606, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  }

  // ---------------------------------------------------------------- particles (pixel points)
  _particles() {
    const g = new THREE.BufferGeometry();
    this.pPos = new Float32Array(MAXP * 3); this.pCol = new Float32Array(MAXP * 4); this.pSize = new Float32Array(MAXP);
    this.pVel = new Float32Array(MAXP * 3); this.pLife = new Float32Array(MAXP); this.pMax = new Float32Array(MAXP); this.pGrav = new Float32Array(MAXP); this.pKind = new Uint8Array(MAXP); this.pBase = new Float32Array(MAXP * 4); this.pDrag = new Float32Array(MAXP);
    g.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.pCol, 4)); g.setAttribute('size', new THREE.BufferAttribute(this.pSize, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      vertexShader: `attribute float size; attribute vec4 color; varying vec4 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size; }`,
      fragmentShader: `varying vec4 vC; void main(){ if (vC.a < 0.01) discard; gl_FragColor = vC; }`,
    });
    this.points = new THREE.Points(g, m); this.points.frustumCulled = false; this.group.add(this.points); this.pI = 0;
    for (let i = 0; i < MAXP; i++) this.pPos[i * 3 + 1] = -999;
  }

  emit(x, y, z, o = {}) {
    const n = o.n || 1;
    for (let k = 0; k < n; k++) {
      const i = this.pI++ % MAXP; const sp = (o.speed || 2) * (0.4 + Math.random() * 0.8);
      const a = (o.ang ?? Math.random() * Math.PI * 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2); const up = o.up ?? 0.6;
      this.pPos[i * 3] = x + (Math.random() - 0.5) * (o.jit || 0); this.pPos[i * 3 + 1] = y + (Math.random() - 0.5) * (o.jitY || 0); this.pPos[i * 3 + 2] = z + (Math.random() - 0.5) * (o.jit || 0);
      this.pVel[i * 3] = Math.sin(a) * sp; this.pVel[i * 3 + 1] = (o.vy ?? 0) + (Math.random() * up) * sp; this.pVel[i * 3 + 2] = Math.cos(a) * sp;
      const c = o.color || [1, 1, 1]; const cv = o.colorVar || 0;
      this.pBase[i * 4] = c[0] * (1 - Math.random() * cv); this.pBase[i * 4 + 1] = c[1] * (1 - Math.random() * cv); this.pBase[i * 4 + 2] = c[2] * (1 - Math.random() * cv); this.pBase[i * 4 + 3] = o.alpha ?? 1;
      this.pLife[i] = this.pMax[i] = (o.life || 0.5) * (0.6 + Math.random() * 0.6); this.pGrav[i] = o.grav ?? 9; this.pSize[i] = o.size || 1; this.pKind[i] = o.kind || 0; this.pDrag[i] = o.drag ?? 1.5;
    }
  }

  sparks(x, y, z, ang, n = 10, color = [3, 2.6, 1.6]) { this.emit(x, y, z, { n, ang, spread: 2.2, speed: 6, up: 0.6, life: 0.28, grav: 12, color, size: 1, drag: 3 }); }
  blood(x, y, z, ang, n = 14) {
    this.emit(x, y, z, { n, ang, spread: 1.4, speed: 3.6, up: 0.7, life: 0.55, grav: 14, color: [0.42, 0.03, 0.04], colorVar: 0.3, size: 1, kind: 1, drag: 1 });
  }
  mist(x, y, z, n = 10, color = [0.5, 0.56, 0.66]) { this.emit(x, y, z, { n, speed: 0.8, up: 0.8, life: 1.2, grav: -0.6, color, size: 2, alpha: 0.5, jit: 1.2, jitY: 0.6, drag: 1 }); }
  embers(x, y, z, n = 8, color = [2.6, 1.2, 0.3]) { this.emit(x, y, z, { n, speed: 1.2, up: 1, vy: 1, life: 1.1, grav: -1.5, color, size: 1, jit: 0.6, drag: 0.6 }); }
  dust(x, z, n = 6) { this.emit(x, 0.05, z, { n, speed: 1.4, up: 0.3, life: 0.4, grav: 2, color: [0.45, 0.5, 0.58], size: 1, alpha: 0.7, drag: 4 }); }
  splash(x, z, n = 8) { this.emit(x, 0.05, z, { n, speed: 1.8, up: 1.2, life: 0.35, grav: 12, color: [0.6, 0.68, 0.8], size: 1, alpha: 0.8 }); }

  bloodPool(x, z, s = 1) {
    if (this.decals.length > 70) { const d = this.decals.shift(); this.group.remove(d.m); }
    const m = new THREE.Mesh(this.decalGeo, this.decalMat.clone()); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6;
    m.position.set(x + (Math.random() - 0.5) * 0.4, 0.015 + this.decals.length * 0.0002, z + (Math.random() - 0.5) * 0.4); const k = (0.35 + Math.random() * 0.5) * s; m.scale.set(k, k * (0.6 + Math.random() * 0.6), 1);
    m.receiveShadow = true; this.group.add(m); this.decals.push({ m, t: 0 });
  }

  // ---------------------------------------------------------------- sword trail
  // A ribbon between the hand and the tip over the last few frames, white-hot fading to the cloak's red.
  trail(id, hand, tip, color = [2.2, 2.2, 2.4], width = 1) {
    let tr = this.trails.find((t) => t.id === id);
    if (!tr) {
      const N = 12; const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 2 * 4), 4));
      const idx = []; for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
      const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; this.group.add(mesh);
      tr = { id, mesh, N, pts: [], live: 0 }; this.trails.push(tr);
    }
    tr.pts.unshift({ h: hand.clone(), t: tip.clone(), age: 0 }); if (tr.pts.length > tr.N) tr.pts.pop(); tr.live = 0.15; tr.color = color;
  }
  _trails(dt) {
    for (const tr of this.trails) {
      tr.live -= dt; for (const p of tr.pts) p.age += dt;
      tr.pts = tr.pts.filter((p) => p.age < 0.14);
      const pos = tr.mesh.geometry.attributes.position.array, col = tr.mesh.geometry.attributes.color.array; const c = tr.color;
      for (let i = 0; i < tr.N; i++) {
        const p = tr.pts[Math.min(i, tr.pts.length - 1)];
        if (!p) { pos.fill(0); col.fill(0); break; }
        const k = 1 - p.age / 0.14; const fade = Math.max(0, k) * (1 - i / tr.N);
        const hx = p.h.x + (p.t.x - p.h.x) * 0.35, hy = p.h.y + (p.t.y - p.h.y) * 0.35, hz = p.h.z + (p.t.z - p.h.z) * 0.35;
        pos.set([hx, hy, hz, p.t.x, p.t.y, p.t.z], i * 6);
        const red = i / tr.N; // white near the blade, deep red at the tail
        col.set([c[0] * fade * (1 - red * 0.2) * 0.5, c[1] * fade * (1 - red) * 0.4, c[2] * fade * (1 - red) * 0.45, 1, c[0] * fade, c[1] * fade * (1 - red * 0.85), c[2] * fade * (1 - red * 0.9), 1], i * 8);
      }
      tr.mesh.geometry.attributes.position.needsUpdate = true; tr.mesh.geometry.attributes.color.needsUpdate = true;
      tr.mesh.visible = tr.pts.length > 1;
    }
  }

  // ---------------------------------------------------------------- telegraphs (on the ground)
  _teleMesh(t) {
    const red = new THREE.Color(1.6, 0.12, 0.08);
    const mk = (geo) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: red, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); m.rotation.x = -Math.PI / 2; return m; };
    const g = new THREE.Group(); let outer, inner;
    if (t.shape === 'arc') { outer = mk(new THREE.RingGeometry(0.3, t.range, 24, 1, -t.arc / 2, t.arc)); inner = mk(new THREE.RingGeometry(0.3, t.range, 24, 1, -t.arc / 2, t.arc)); }
    else if (t.shape === 'circle') { outer = mk(new THREE.RingGeometry(t.radius - 0.12, t.radius, 28)); inner = mk(new THREE.CircleGeometry(t.radius, 28)); }
    else if (t.shape === 'line' || t.shape === 'ray') { const w = t.shape === 'ray' ? 0.08 : (t.width || 1); const pg = new THREE.PlaneGeometry(w, t.range); pg.translate(0, t.range / 2, 0); outer = mk(pg); inner = mk(pg.clone()); }
    else return null;
    // the sector geometry is built around +X in the plane; rotate so 0 rad = facing +Z
    if (t.shape === 'arc') { outer.rotation.z = inner.rotation.z = -Math.PI / 2; }
    g.add(outer); g.add(inner); inner.material.opacity = 0.25; outer.material.opacity = 0.18;
    g.userData = { outer, inner, shape: t.shape };
    return g;
  }

  updateTeles(ents, time) {
    const seen = new Set();
    for (const e of ents) {
      if (!e.tele || e.dead) continue; seen.add(e.id);
      let m = this.teles.get(e.id);
      if (!m || m.userData.key !== e.tele) { if (m) this.group.remove(m); m = this._teleMesh(e.tele); if (!m) continue; m.userData.key = e.tele; this.group.add(m); this.teles.set(e.id, m); }
      const t = e.tele; const k = Math.min(1, e.t / Math.max(0.05, t.dur));
      const ox = t.offset ? Math.sin(e.face) * t.offset : 0, oz = t.offset ? Math.cos(e.face) * t.offset : 0;
      if (t.at) m.position.set(t.at.x, 0.03, t.at.z); else m.position.set(e.x + ox, 0.03, e.z + oz);
      m.rotation.y = t.shape === 'circle' ? 0 : e.face;
      const { inner, outer } = m.userData;
      if (t.shape === 'circle') inner.scale.setScalar(Math.max(0.01, k));
      else if (t.shape === 'arc') inner.scale.setScalar(Math.max(0.01, k));
      else { inner.scale.set(1, Math.max(0.01, k), 1); }
      if (t.shape === 'line' || t.shape === 'ray') { outer.rotation.z = inner.rotation.z = Math.PI; }
      const pulse = 0.5 + 0.5 * Math.sin(time * 30);
      outer.material.opacity = 0.16 + pulse * 0.1 + k * 0.15; inner.material.opacity = 0.18 + k * 0.32;
    }
    for (const [id, m] of this.teles) if (!seen.has(id)) { this.group.remove(m); this.teles.delete(id); }
  }

  // ---------------------------------------------------------------- hazards
  updateHazards(list, dt, time) {
    const seen = new Set();
    for (const h of list) {
      seen.add(h); let v = this.hz.get(h);
      if (!v) { v = this._hazardMesh(h); this.hz.set(h, v); this.group.add(v); }
      const warn = h.t < h.warn; const k = warn ? h.t / Math.max(0.01, h.warn) : (h.t - h.warn) / h.life;
      const ud = v.userData;
      if (h.shape === 'circle') {
        ud.ring.visible = true; ud.fill.scale.setScalar(warn ? Math.max(0.01, k) : 1);
        ud.fill.material.opacity = warn ? 0.18 + k * 0.25 : 0.65 * (1 - k);
        ud.fill.material.color.copy(warn ? ud.warnC : ud.hotC);
        if (!warn && !ud.burst) { ud.burst = true; this._hazardBurst(h); }
        if (!warn && h.kind === 'fire' && Math.random() < dt * 30) this.emit(h.x + (Math.random() - 0.5) * h.r * 1.6, 0.1, h.z + (Math.random() - 0.5) * h.r * 1.6, { n: 1, speed: 0.4, up: 1, vy: 2, life: 0.6, grav: -2, color: [3, 1.2, 0.2], size: 1 });
      } else if (h.shape === 'ring') {
        const r = h.r0 + (h.r1 - h.r0) * (warn ? 0 : k);
        ud.wave.scale.setScalar(Math.max(0.01, r)); ud.wave.visible = !warn; ud.wave.material.opacity = 0.75 * (1 - k * 0.6);
        ud.ring.visible = warn; ud.ring.material.opacity = 0.3;
        if (!warn && Math.random() < dt * 40) { const a = Math.random() * Math.PI * 2; this.emit(h.x + Math.sin(a) * r, 0.1, h.z + Math.cos(a) * r, { n: 1, speed: 1, up: 1.5, life: 0.4, grav: 5, color: ud.dust, size: 1 }); }
      }
      v.position.set(h.x, 0.04, h.z);
    }
    for (const [h, v] of this.hz) if (!seen.has(h)) { this.group.remove(v); this.hz.delete(h); }
  }

  _hazardMesh(h) {
    const kinds = { fire: [3, 0.8, 0.15], slam: [1.6, 0.15, 0.1], water: [0.3, 1.6, 1.6], wax: [2, 1.8, 1.2], toll: [1.8, 1.8, 2.2], lightning: [1.6, 1.8, 3], shock: [1.8, 1.0, 0.6] };
    const hot = kinds[h.kind] || kinds.slam;
    const g = new THREE.Group();
    const mat = (c, o) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    if (h.shape === 'circle') {
      const ring = new THREE.Mesh(new THREE.RingGeometry(h.r - 0.1, h.r, 24), mat([1.6, 0.12, 0.08], 0.4)); ring.rotation.x = -Math.PI / 2; g.add(ring);
      const fill = new THREE.Mesh(new THREE.CircleGeometry(h.r, 24), mat([1.6, 0.12, 0.08], 0.2)); fill.rotation.x = -Math.PI / 2; g.add(fill);
      g.userData = { ring, fill, warnC: new THREE.Color(1.6, 0.12, 0.08), hotC: new THREE.Color(...hot) };
    } else {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.6, 24), mat([1.6, 0.12, 0.08], 0.3)); ring.rotation.x = -Math.PI / 2; g.add(ring);
      const wave = new THREE.Mesh(new THREE.RingGeometry(0.88, 1.0, 40), mat(hot, 0.7)); wave.rotation.x = -Math.PI / 2; g.add(wave);
      g.userData = { ring, wave, dust: hot.map((v) => v * 0.4) };
    }
    return g;
  }

  _hazardBurst(h) {
    if (h.kind === 'lightning') { this.bolt(h.x, h.z); }
    else if (h.kind === 'water') { this.emit(h.x, 0.1, h.z, { n: 40, speed: 2, up: 3, vy: 3, life: 0.9, grav: 10, color: [0.5, 1.2, 1.3], size: 1, jit: h.r }); }
    else if (h.kind === 'fire') { this.emit(h.x, 0.1, h.z, { n: 24, speed: 1.5, up: 2, vy: 2, life: 0.7, grav: -1, color: [3, 1.1, 0.2], size: 1, jit: h.r }); }
    else { this.emit(h.x, 0.1, h.z, { n: 30, speed: 3, up: 1, life: 0.5, grav: 6, color: [0.6, 0.6, 0.66], size: 1, jit: h.r * 0.8 }); }
  }

  // a lightning strike: a jagged line from the sky
  bolt(x, z) {
    const pts = []; let px = x + (Math.random() - 0.5) * 2, pz = z + (Math.random() - 0.5) * 2;
    for (let y = 22; y >= 0; y -= 2) { pts.push(new THREE.Vector3(px, y, pz)); px += (Math.random() - 0.5) * 1.2; pz += (Math.random() - 0.5) * 1.2; if (y <= 2) { px = x; pz = z; } }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(3, 3.2, 4), transparent: true, fog: false }));
    this.group.add(l); this.bolts.push({ l, t: 0.25 });
    this.emit(x, 0.1, z, { n: 30, speed: 4, up: 1.4, life: 0.5, grav: 8, color: [2.4, 2.6, 3.2], size: 1 });
  }

  shockRing(x, z, r = 3, color = [1.6, 1.6, 1.9], life = 0.4) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, z); this.group.add(m); this.rings.push({ m, t: 0, life, r });
  }

  // a crimson slash line drawn across a point (the Requiem, finishers, parries)
  slashLine(x, y, z, len = 2.4, color = [3, 0.3, 0.25], life = 0.22) {
    const a = Math.random() * Math.PI; const dx = Math.cos(a) * len / 2, dz = Math.sin(a) * len / 2, dy = (Math.random() - 0.5) * 0.8;
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x - dx, y - dy, z - dz), new THREE.Vector3(x + dx, y + dy, z + dz)]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(...color), transparent: true, fog: false, depthTest: false }));
    l.renderOrder = 10; this.group.add(l); this.slashes.push({ l, t: life, life });
  }

  // ---------------------------------------------------------------- projectiles
  updateProjs(list, time) {
    const seen = new Set();
    for (const p of list) {
      seen.add(p.id); let v = this.projs.get(p.id);
      if (!v) { v = this._projMesh(p); this.projs.set(p.id, v); this.group.add(v); }
      v.position.set(p.x, p.y ?? 1.1, p.z); v.rotation.y = Math.atan2(p.vx, p.vz);
      if (p.kind === 'wave') { const k = 1 - p.life / 0.55; v.scale.setScalar(1 + k * 0.6); v.children[0].material.opacity = 0.9 * (1 - k); }
      if (Math.random() < 0.5) { const c = v.userData.trail; this.emit(p.x, (p.y ?? 1.1), p.z, { n: 1, speed: 0.2, life: 0.3, grav: 0, color: c, size: 1, alpha: 0.8 }); }
      if (p.team === 'hero' && v.userData.team !== 'hero') { v.userData.team = 'hero'; v.traverse((o) => { if (o.material) o.material.color.setRGB(3, 0.4, 0.3); }); }
    }
    for (const [id, v] of this.projs) if (!seen.has(id)) { this.group.remove(v); this.projs.delete(id); }
  }

  _projMesh(p) {
    const g = new THREE.Group();
    const cols = { orb: [3, 0.25, 0.3], flame: [3.2, 1.6, 0.3], soul: [0.4, 2.6, 2.4], bolt: [2, 1.9, 1.7], wave: [3, 0.35, 0.3] };
    const c = cols[p.kind] || cols.orb;
    if (p.kind === 'bolt') {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.7), new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), fog: false })); g.add(m);
    } else if (p.kind === 'wave') {
      // the crimson crescent of a fully charged heavy
      const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.15, 20, 1, Math.PI * 0.15, Math.PI * 0.7), new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = -0.6; g.add(m);
    } else {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), fog: false })); g.add(m);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#ffffff', 32, 1.5), color: new THREE.Color(c[0] * 0.3, c[1] * 0.3, c[2] * 0.3), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      halo.scale.set(1.3, 1.3, 1); g.add(halo);
    }
    g.userData = { trail: c.map((v) => v * 0.6), team: p.team };
    return g;
  }

  // ---------------------------------------------------------------- afterimages
  ghost(rig, color = [1.6, 0.15, 0.15], life = 0.28) {
    // a frozen copy of the figure: the rig's own geometry at its current world transforms
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    rig.root.updateMatrixWorld(true);
    rig.root.traverse((o) => { if (o.isMesh && o.visible) { const m = new THREE.Mesh(o.geometry, mat); o.matrixWorld.decompose(m.position, m.quaternion, m.scale); g.add(m); } });
    this.group.add(g); this.ghosts.push({ g, mat, t: life, life });
  }

  update(dt, time) {
    // particles
    const P = this.pPos, Vv = this.pVel, C = this.pCol;
    for (let i = 0; i < MAXP; i++) {
      if (this.pLife[i] <= 0) { if (C[i * 4 + 3] !== 0) { C[i * 4 + 3] = 0; P[i * 3 + 1] = -999; } continue; }
      this.pLife[i] -= dt; const k = this.pLife[i] / this.pMax[i];
      const drag = Math.exp(-this.pDrag[i] * dt);
      Vv[i * 3] *= drag; Vv[i * 3 + 2] *= drag; Vv[i * 3 + 1] -= this.pGrav[i] * dt;
      P[i * 3] += Vv[i * 3] * dt; P[i * 3 + 1] += Vv[i * 3 + 1] * dt; P[i * 3 + 2] += Vv[i * 3 + 2] * dt;
      if (P[i * 3 + 1] < 0.02 && this.pGrav[i] > 0) {
        P[i * 3 + 1] = 0.02; Vv[i * 3 + 1] *= -0.25; Vv[i * 3] *= 0.5; Vv[i * 3 + 2] *= 0.5;
        if (this.pKind[i] === 1 && Math.random() < 0.08) this.bloodPool(P[i * 3], P[i * 3 + 2], 0.6);
      }
      C[i * 4] = this.pBase[i * 4]; C[i * 4 + 1] = this.pBase[i * 4 + 1]; C[i * 4 + 2] = this.pBase[i * 4 + 2]; C[i * 4 + 3] = this.pBase[i * 4 + 3] * Math.min(1, k * 2.5);
    }
    const g = this.points.geometry; g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.attributes.size.needsUpdate = true;
    this._trails(dt);
    for (const d of this.decals) { d.t += dt; if (d.t > 25) d.m.material.opacity = Math.max(0, 0.85 - (d.t - 25) / 10); }
    this.decals = this.decals.filter((d) => { if (d.t > 35) { this.group.remove(d.m); return false; } return true; });
    for (const gh of this.ghosts) { gh.t -= dt; gh.mat.opacity = 0.55 * Math.max(0, gh.t / gh.life); }
    this.ghosts = this.ghosts.filter((gh) => { if (gh.t <= 0) { this.group.remove(gh.g); gh.mat.dispose(); return false; } return true; });
    for (const r of this.rings) { r.t += dt; const k = r.t / r.life; r.m.scale.setScalar(0.3 + k * r.r); r.m.material.opacity = 0.8 * (1 - k); }
    this.rings = this.rings.filter((r) => { if (r.t >= r.life) { this.group.remove(r.m); return false; } return true; });
    for (const b of this.bolts) { b.t -= dt; b.l.material.opacity = Math.max(0, b.t / 0.25); b.l.visible = Math.floor(b.t * 40) % 2 === 0 || b.t > 0.15; }
    this.bolts = this.bolts.filter((b) => { if (b.t <= 0) { this.group.remove(b.l); return false; } return true; });
    for (const s of this.slashes) { s.t -= dt; s.l.material.opacity = Math.max(0, s.t / s.life); }
    this.slashes = this.slashes.filter((s) => { if (s.t <= 0) { this.group.remove(s.l); return false; } return true; });
  }

  clear() {
    for (const d of this.decals) this.group.remove(d.m); this.decals = [];
    for (const [, m] of this.teles) this.group.remove(m); this.teles.clear();
    for (const [, m] of this.hz) this.group.remove(m); this.hz.clear();
    for (const [, m] of this.projs) this.group.remove(m); this.projs.clear();
    for (let i = 0; i < MAXP; i++) this.pLife[i] = 0;
  }
}
