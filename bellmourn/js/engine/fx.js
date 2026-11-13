// Effects: sword trails, pixel particles (sparks, blood, mist, embers), blood on the stones,
// ground telegraphs for foe attacks and hazards, projectiles, dash afterimages, shock rings, and the
// tonic's healing motes, rings and glow.
import * as THREE from '../../vendor/three.module.min.js';
import * as T from './textures.js';

const MAXP = 1600;
const MAXM = 192; // tonic motes
const TAU = Math.PI * 2;
const easeOut = (k) => 1 - (1 - k) * (1 - k);
// procedural textures for the tonic: a soft ring (for a plane on the ground) and a column of light
let _ringTex = null, _colTex = null;
function ringTex() {
  if (_ringTex) return _ringTex;
  const n = 64, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); const img = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = Math.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2); const a = Math.exp(-(((d - 0.82) / 0.08) ** 2)) + 0.16 * Math.max(0, 1 - d);
    const i = (y * n + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(Math.min(1, d > 1 ? 0 : a) * 255);
  }
  g.putImageData(img, 0, 0); _ringTex = new THREE.CanvasTexture(c); _ringTex.colorSpace = THREE.SRGBColorSpace; _ringTex.minFilter = THREE.LinearFilter; _ringTex.generateMipmaps = false; return _ringTex;
}
function columnTex() {
  if (_colTex) return _colTex;
  const w = 16, h = 64, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = Math.abs(x - w / 2 + 0.5) / (w / 2), v = y / (h - 1); // v: 0 top, 1 bottom
    const a = Math.max(0, 1 - u) ** 1.6 * Math.min(1, v * 1.4) * Math.min(1, (1 - v) * 8); // brightest low, fading upwards
    const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(Math.min(1, a) * 255);
  }
  g.putImageData(img, 0, 0); _colTex = new THREE.CanvasTexture(c); _colTex.colorSpace = THREE.SRGBColorSpace; _colTex.minFilter = THREE.LinearFilter; _colTex.generateMipmaps = false; return _colTex;
}
// remove an object and free what it alone owns (geometries/materials marked userData.keep are shared)
function free(group, o) {
  group.remove(o);
  o.traverse((c) => {
    if (c.geometry && !c.geometry.userData.keep) c.geometry.dispose();
    const ms = Array.isArray(c.material) ? c.material : (c.material ? [c.material] : []);
    for (const m of ms) if (!m.userData.keep) m.dispose();
  });
}

export class FX {
  constructor(scene) {
    this.scene = scene; this.group = new THREE.Group(); scene.add(this.group);
    this._particles(); this._tonicInit(); this.trails = []; this.decals = []; this.teles = new Map(); this.hz = new Map(); this.projs = new Map(); this.ghosts = []; this.rings = []; this.bolts = []; this.slashes = [];
    this.decalGeo = new THREE.CircleGeometry(0.5, 7); this.decalGeo.userData.keep = true; this.zv = new Map();
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
    if (this.decals.length > 70) { const d = this.decals.shift(); free(this.group, d.m); }
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
  dropTrail(id) { const i = this.trails.findIndex((t) => t.id === id); if (i >= 0) { free(this.group, this.trails[i].mesh); this.trails.splice(i, 1); } }

  // the hero's area attacks: a glow on the stones while they bite (smoke, traps, pillars, rings, auras)
  updateZones(list, dt) {
    const seen = new Set();
    const C = { smoke: [1.2, 1.2, 1.3], trap: [2.2, 1.8, 0.8], pillar: [3, 1.2, 0.2], shock: [2.2, 2.0, 1.6], quake: [1.8, 1.6, 1.3], ward: [2.4, 2.0, 1.0], lantern: [3, 1.6, 0.4], fire: [3, 1.0, 0.2], bolt: [2.4, 2.2, 1.8], sun: [3.4, 2.6, 1.0] };
    for (const z of list) {
      seen.add(z); let v = this.zv.get(z); const c = C[z.kind] || [2, 2, 2];
      if (!v) {
        const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
        const g = z.shape === 'ring' ? new THREE.RingGeometry(0.85, 1, 40) : new THREE.RingGeometry(z.r * 0.82, z.r, 28);
        v = new THREE.Mesh(g, mat); v.rotation.x = -Math.PI / 2; this.group.add(v); this.zv.set(z, v);
        if (z.kind === 'pillar' || z.kind === 'sun') { const f = new THREE.Mesh(new THREE.CircleGeometry(z.r, 24), mat.clone()); f.material.opacity = 0.18; v.add(f); }
      }
      v.position.set(z.x, 0.05, z.z);
      const warn = z.t < z.warn; const k = warn ? z.t / Math.max(0.01, z.warn) : (z.t - z.warn) / Math.max(0.01, z.life);
      if (z.shape === 'ring') { const rr = z.r0 + (z.r1 - z.r0) * (warn ? 0 : k); v.scale.setScalar(Math.max(0.05, rr)); v.material.opacity = warn ? 0.15 : 0.8 * (1 - k * 0.7); }
      else if (z.trigger && !z.sprung) { v.material.opacity = 0.25 + 0.15 * Math.sin(z.t * 6); }
      else v.material.opacity = warn ? 0.2 + k * 0.4 : (z.tick ? 0.35 + 0.1 * Math.sin(z.t * 10) : 0.8 * (1 - k));
      if (!warn && !z._burst) { z._burst = true; this._zoneBurst(z, c); }
      if (z.tick && Math.random() < dt * 18) { const a = Math.random() * 6.28, r = Math.random() * z.r; this.emit(z.x + Math.sin(a) * r, 0.1, z.z + Math.cos(a) * r, { n: 1, speed: 0.3, up: 1, vy: 1.5, life: 0.5, grav: -1.5, color: c, size: 1 }); }
    }
    for (const [z, v] of this.zv) if (!seen.has(z)) { free(this.group, v); this.zv.delete(z); }
  }
  _zoneBurst(z, c) {
    if (z.shape === 'ring' || z.tick) return;
    const n = z.kind === 'bolt' ? 6 : 26;
    this.emit(z.x, 0.1, z.z, { n, speed: z.kind === 'smoke' ? 1.5 : 3, up: z.kind === 'pillar' ? 3 : 1, vy: z.kind === 'pillar' ? 4 : 0.5, life: z.kind === 'smoke' ? 1.2 : 0.5, grav: z.kind === 'smoke' ? -0.5 : 4, color: c, size: z.kind === 'smoke' ? 2 : 1, jit: z.r * 0.8, alpha: z.kind === 'smoke' ? 0.6 : 1 });
    if (z.kind === 'bolt') { this.slashLine(z.x, 0.8, z.z, 1.2, [2.4, 2.3, 2], 0.12); }
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
      if (!m || m.userData.key !== e.tele) { if (m) free(this.group, m); m = this._teleMesh(e.tele); if (!m) continue; m.userData.key = e.tele; this.group.add(m); this.teles.set(e.id, m); }
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
    for (const [id, m] of this.teles) if (!seen.has(id)) { free(this.group, m); this.teles.delete(id); }
  }

  // ---------------------------------------------------------------- hazards
  updateHazards(list, dt, time) {
    const seen = new Set();
    for (const h of list) {
      seen.add(h); let v = this.hz.get(h);
      if (!v) { v = this._hazardMesh(h); this.hz.set(h, v); this.group.add(v); }
      const warn = h.t < h.warn; const k = warn ? h.t / Math.max(0.01, h.warn) : (h.t - h.warn) / h.life;
      const ud = v.userData;
      if (h.shape === 'line') {
        ud.lane.material.color.copy(warn ? ud.warnC : ud.hotC); ud.lane.material.opacity = warn ? 0.15 + k * 0.3 : 0.85 * (1 - k * 0.7);
        if (!warn && Math.random() < dt * 50) { const d = Math.random() * (h.len || 4), o = (Math.random() - 0.5) * (h.width || 1); const fx = Math.sin(h.face || 0), fz = Math.cos(h.face || 0); this.emit(h.x + fx * d + fz * o, 0.15, h.z + fz * d - fx * o, { n: 1, speed: 0.6, up: 1.5, vy: 2, life: 0.5, grav: -1, color: ud.hotC.toArray(), size: 1 }); }
      } else if (h.shape === 'circle') {
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
    for (const [h, v] of this.hz) if (!seen.has(h)) { free(this.group, v); this.hz.delete(h); }
  }

  _hazardMesh(h) {
    const kinds = { fire: [3, 0.8, 0.15], poison: [0.5, 2.0, 0.3], beam: [3, 1.4, 0.3], bone: [2.2, 2.0, 1.6], slam: [1.6, 0.15, 0.1], water: [0.3, 1.6, 1.6], wax: [2, 1.8, 1.2], toll: [1.8, 1.8, 2.2], lightning: [1.6, 1.8, 3], shock: [1.8, 1.0, 0.6] };
    const hot = kinds[h.kind] || kinds.slam;
    const g = new THREE.Group();
    const mat = (c, o) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    if (h.shape === 'line') {
      const pg = new THREE.PlaneGeometry(h.width || 1, h.len || 4); pg.translate(0, (h.len || 4) / 2, 0);
      const lane = new THREE.Mesh(pg, mat([1.6, 0.12, 0.08], 0.25)); lane.rotation.x = -Math.PI / 2; lane.rotation.z = Math.PI;
      const pivot = new THREE.Group(); pivot.rotation.y = h.face || 0; pivot.add(lane); g.add(pivot);
      g.userData = { lane, warnC: new THREE.Color(1.6, 0.12, 0.08), hotC: new THREE.Color(...hot), line: true };
      return g;
    }
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

  // a crimson slash line drawn across a point (the Requiem, parries, bolts)
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
      if (p.kind === 'wave') { const k = 1 - p.life / 0.6; v.scale.setScalar(1 + k * 0.6); v.children[0].material.opacity = 0.9 * (1 - Math.max(0, k)); }
      if (Math.random() < 0.5) { const c = v.userData.trail; this.emit(p.x, (p.y ?? 1.1), p.z, { n: 1, speed: 0.2, life: 0.3, grav: 0, color: c, size: 1, alpha: 0.8 }); }
      if (p.team === 'hero' && v.userData.team !== 'hero') { v.userData.team = 'hero'; v.traverse((o) => { if (o.material) o.material.color.setRGB(3, 0.4, 0.3); }); }
    }
    for (const [id, v] of this.projs) if (!seen.has(id)) { free(this.group, v); this.projs.delete(id); }
  }

  _projMesh(p) {
    const g = new THREE.Group();
    const cols = { orb: [3, 0.25, 0.3], flame: [3.2, 1.6, 0.3], soul: [0.4, 2.6, 2.4], bolt: [2, 1.9, 1.7], wave: [3, 0.35, 0.3], hbolt: [2.4, 2.2, 1.8], hfire: [3.4, 1.5, 0.3], wisp: [2.6, 2.2, 1.0], flask: [3, 1.3, 0.3], spit: [0.7, 2.4, 0.4] };
    const c = cols[p.kind] || cols.orb;
    if (p.kind === 'bolt' || p.kind === 'hbolt') {
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

  // ---------------------------------------------------------------- the tonic
  // Chunky green-gold motes spiralling up a body (two strands of a helix), some drawn as little plus
  // signs; a soft ring opening at the feet; a brief additive glow and a column of light. tonicStart(e)
  // plays while the drink begins and follows the drinker; tonicBurst(x, z, amt) is the bright answer
  // when the HP lands. Everything is pooled or freed when it ends.
  _tonicInit() {
    const g = new THREE.BufferGeometry();
    this.mPos = new Float32Array(MAXM * 3); this.mCol = new Float32Array(MAXM * 4); this.mSize = new Float32Array(MAXM); this.mShape = new Float32Array(MAXM);
    for (let i = 0; i < MAXM; i++) this.mPos[i * 3 + 1] = -999;
    g.setAttribute('position', new THREE.BufferAttribute(this.mPos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.mCol, 4));
    g.setAttribute('size', new THREE.BufferAttribute(this.mSize, 1)); g.setAttribute('shape', new THREE.BufferAttribute(this.mShape, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float size; attribute float shape; attribute vec4 color; varying vec4 vC; varying float vS; varying float vZ;
        void main(){ vC = color; vS = shape; vZ = size; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = size; }`,
      // shape 1: a plus sign in the point's square (a 3 px point gives a 3x3 cross)
      fragmentShader: `varying vec4 vC; varying float vS; varying float vZ;
        void main(){ if (vC.a < 0.01) discard; if (vS > 0.5) { vec2 q = floor(gl_PointCoord * vZ); float c = floor(vZ * 0.5); if (q.x != c && q.y != c) discard; } gl_FragColor = vC; }`,
    });
    this.motes = new THREE.Points(g, m); this.motes.frustumCulled = false; this.motes.renderOrder = 5; this.group.add(this.motes);
    this.mI = 0; this.mv = []; for (let i = 0; i < MAXM; i++) this.mv.push({ life: 0, max: 1, a: 0, w: 0, r: 0, dr: 0, y: 0, vy: 0, cx: 0, cz: 0, e: null, c: [1, 1, 1], s: 1 });
    this.tEm = []; this.tRings = []; this.tGlows = [];
    this.ringGeo = new THREE.PlaneGeometry(2, 2); this.ringGeo.userData.keep = true;
  }

  // one mote: angle a (rad), radius r (m) and its drift dr, height y and rise vy, spin w (rad/s)
  _mote(o) {
    const v = this.mv[this.mI++ % MAXM];
    v.e = o.e || null; v.cx = o.x; v.cz = o.z; v.a = o.a; v.r = o.r; v.dr = o.dr || 0; v.y = o.y; v.vy = o.vy; v.w = o.w;
    v.life = v.max = o.life; v.c = o.c; v.s = o.s || 2; v.shape = o.shape || 0;
  }

  // a soft ring that opens on the ground (follows `e` if given)
  _tRing(e, x, z, r0, r1, life, color, peak = 0.9, delay = 0) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ map: ringTex(), color: new THREE.Color(...color), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); m.scale.setScalar(r0); m.renderOrder = 4; this.group.add(m);
    this.tRings.push({ m, e, t: -delay, life, r0, r1, peak });
  }
  // an additive glow sprite (tex: the round glow or the column of light), centred at height y
  _tGlow(e, x, z, y, sx, sy, life, color, peak, tex) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex || T.glow('#ffffff', 32, 1.2), color: new THREE.Color(...color), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    s.position.set(x, y, z); s.scale.set(sx, sy, 1); s.renderOrder = 6; this.group.add(s);
    this.tGlows.push({ s, e, y, t: 0, life, peak });
  }

  tonicStart(e) {
    if (!e) return;
    this._tonicE = e;
    this.tEm.push({ e, t: 0, dur: 0.8, acc: 0, rate: 30, a0: Math.random() * TAU });
    this._tRing(e, e.x, e.z, 0.25, 1.05, 0.75, [0.5, 1.8, 0.6], 0.75);
    this._tGlow(e, e.x, e.z, 1.0, 1.4, 1.8, 0.4, [0.35, 1.2, 0.45], 0.4);
  }

  tonicBurst(x, z, amt = 30) {
    // follow the drinker if the burst lands on them
    const e = this._tonicE && !this._tonicE.dead && Math.hypot(this._tonicE.x - x, this._tonicE.z - z) < 1.5 ? this._tonicE : null;
    const n = 22 + Math.min(16, Math.round((amt || 0) / 5));
    const a0 = Math.random() * TAU;
    for (let k = 0; k < n; k++) {
      const plus = k % 3 === 0; const gold = k % 2 === 1;
      this._mote({ e, x, z, a: a0 + (k / n) * TAU * 2 + Math.random() * 0.4, r: 0.25 + Math.random() * 0.25, dr: 0.45 + Math.random() * 0.3, y: 0.15 + Math.random() * 0.9, vy: 1.4 + Math.random() * 1.8, w: 5.5 + Math.random() * 1.5,
        life: 0.8 + Math.random() * 0.5, c: plus ? [0.5, 2.2, 0.6] : (gold ? [2.1, 1.6, 0.4] : [0.4, 1.9, 0.5]), s: plus ? 3 : (Math.random() < 0.25 ? 1 : 2), shape: plus ? 1 : 0 });
    }
    this.emit(x, 0.6, z, { n: 14, speed: 1.4, up: 1.4, vy: 2.2, life: 0.9, grav: -1.2, color: [1.6, 2.8, 1.0], size: 1, jit: 0.7, jitY: 0.8, drag: 1.2 });
    this._tRing(e, x, z, 0.3, 1.9, 0.6, [0.9, 2.2, 0.7], 1.0);
    this._tRing(e, x, z, 0.2, 1.25, 0.55, [2.4, 2.0, 0.6], 0.6, 0.12);
    this._tGlow(e, x, z, 1.0, 2.2, 2.8, 0.45, [0.5, 1.6, 0.55], 0.6);
    this._tGlow(e, x, z, 1.7, 1.0, 3.6, 0.55, [0.7, 1.8, 0.6], 0.55, columnTex());
  }

  _tonicUpdate(dt) {
    for (const em of this.tEm) {
      em.t += dt; em.acc += dt * em.rate;
      while (em.acc >= 1) {
        em.acc -= 1; const e = em.e;
        for (let s = 0; s < 2; s++) this._mote({ e, x: e.x, z: e.z, a: em.a0 + s * Math.PI + (Math.random() - 0.5) * 0.3, r: 0.42, dr: -0.1, y: 0.08, vy: 1.9 + Math.random() * 0.4, w: 6,
          life: 0.75 + Math.random() * 0.25, c: s ? [2.0, 1.55, 0.38] : [0.38, 1.85, 0.48], s: Math.random() < 0.2 ? 1 : 2 });
      }
    }
    this.tEm = this.tEm.filter((em) => em.t < em.dur);
    const P = this.mPos, C = this.mCol, S = this.mSize, H = this.mShape;
    for (let i = 0; i < MAXM; i++) {
      const v = this.mv[i];
      if (v.life <= 0) { if (C[i * 4 + 3] !== 0) { C[i * 4 + 3] = 0; P[i * 3 + 1] = -999; } continue; }
      v.life -= dt; if (v.e) { v.cx = v.e.x; v.cz = v.e.z; }
      v.a += v.w * dt; v.r = Math.max(0.05, v.r + v.dr * dt); v.y += v.vy * dt;
      P[i * 3] = v.cx + Math.sin(v.a) * v.r; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.cz + Math.cos(v.a) * v.r;
      const age = v.max - v.life; const k = Math.min(1, age / 0.06) * Math.min(1, v.life / (v.max * 0.4));
      const tw = v.shape ? 0.75 + 0.25 * Math.sin(age * 30 + i) : 1;
      C[i * 4] = v.c[0]; C[i * 4 + 1] = v.c[1]; C[i * 4 + 2] = v.c[2]; C[i * 4 + 3] = Math.max(0, k * tw);
      S[i] = v.s; H[i] = v.shape || 0;
    }
    const g = this.motes.geometry; for (const n of ['position', 'color', 'size', 'shape']) g.attributes[n].needsUpdate = true;
    for (const r of this.tRings) {
      r.t += dt; if (r.t < 0) continue; const k = r.t / r.life;
      if (r.e) r.m.position.set(r.e.x, 0.05, r.e.z);
      r.m.scale.setScalar(r.r0 + (r.r1 - r.r0) * easeOut(Math.min(1, k)));
      r.m.material.opacity = r.peak * Math.min(1, r.t / 0.05) * (1 - k);
    }
    this.tRings = this.tRings.filter((r) => { if (r.t >= r.life) { free(this.group, r.m); return false; } return true; });
    for (const gl of this.tGlows) {
      gl.t += dt; const k = gl.t / gl.life;
      if (gl.e) gl.s.position.set(gl.e.x, gl.y, gl.e.z);
      gl.s.material.opacity = gl.peak * Math.min(1, gl.t / 0.05) * (1 - k) * (1 - k);
    }
    this.tGlows = this.tGlows.filter((gl) => { if (gl.t >= gl.life) { free(this.group, gl.s); return false; } return true; });
  }
  _tonicClear() {
    for (const r of this.tRings) free(this.group, r.m); for (const gl of this.tGlows) free(this.group, gl.s);
    this.tRings = []; this.tGlows = []; this.tEm = []; this._tonicE = null;
    for (const v of this.mv) v.life = 0;
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
    this._tonicUpdate(dt);
    for (const d of this.decals) { d.t += dt; if (d.t > 25) d.m.material.opacity = Math.max(0, 0.85 - (d.t - 25) / 10); }
    this.decals = this.decals.filter((d) => { if (d.t > 35) { free(this.group, d.m); return false; } return true; });
    for (const gh of this.ghosts) { gh.t -= dt; gh.mat.opacity = 0.55 * Math.max(0, gh.t / gh.life); }
    this.ghosts = this.ghosts.filter((gh) => { if (gh.t <= 0) { this.group.remove(gh.g); gh.mat.dispose(); return false; } return true; }); // ghost meshes share the rig's geometry
    for (const r of this.rings) { r.t += dt; const k = r.t / r.life; r.m.scale.setScalar(0.3 + k * r.r); r.m.material.opacity = 0.8 * (1 - k); }
    this.rings = this.rings.filter((r) => { if (r.t >= r.life) { free(this.group, r.m); return false; } return true; });
    for (const b of this.bolts) { b.t -= dt; b.l.material.opacity = Math.max(0, b.t / 0.25); b.l.visible = Math.floor(b.t * 40) % 2 === 0 || b.t > 0.15; }
    this.bolts = this.bolts.filter((b) => { if (b.t <= 0) { free(this.group, b.l); return false; } return true; });
    for (const s of this.slashes) { s.t -= dt; s.l.material.opacity = Math.max(0, s.t / s.life); }
    this.slashes = this.slashes.filter((s) => { if (s.t <= 0) { free(this.group, s.l); return false; } return true; });
  }

  clear() {
    for (const d of this.decals) free(this.group, d.m); this.decals = [];
    for (const [, m] of this.teles) free(this.group, m); this.teles.clear();
    for (const [, m] of this.hz) free(this.group, m); this.hz.clear();
    for (const [, m] of this.projs) free(this.group, m); this.projs.clear();
    for (const [, m] of this.zv) free(this.group, m); this.zv.clear();
    for (const tr of this.trails) free(this.group, tr.mesh); this.trails = [];
    for (let i = 0; i < MAXP; i++) this.pLife[i] = 0;
    this._tonicClear();
  }
}
