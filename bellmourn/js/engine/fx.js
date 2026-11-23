// Effects: sword trails, pixel particles (sparks, blood, mist, embers), blood on the stones,
// ground telegraphs for foe attacks and hazards, projectiles, dash afterimages, shock rings, and the
// tonic's healing motes, rings and glow.
import * as THREE from '../../vendor/three.module.min.js';
import * as T from './textures.js';

const MAXP = 1600;
const MAXM = 192; // tonic motes
const TAU = Math.PI * 2;
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const lerpN = (a, b, k) => a + (b - a) * k;
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
// pixel textures drawn once: a ritual sigil (rings, a seven-pointed star, runes) and a web. Nearest
// filtering keeps them on the 16 texel/m grid of everything else.
let _sigilTex = null, _webTex = null;
function pixTex(n, draw) {
  const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); g.fillStyle = '#fff'; draw(g, n);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
}
function pixLine(g, x0, y0, x1, y1, w = 1) { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))); for (let i = 0; i <= n; i++) { const k = i / Math.max(1, n); g.fillRect(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k), w, w); } }
function pixRing(g, cx, cy, r, w = 1) { const n = Math.ceil(r * 7); for (let i = 0; i < n; i++) { const a = i / n * TAU; g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), w, w); } }
function sigilTex() {
  return _sigilTex || (_sigilTex = pixTex(84, (g, n) => {
    const c = n / 2 - 0.5; pixRing(g, c, c, 40, 2); pixRing(g, c, c, 33, 1); pixRing(g, c, c, 14, 1);
    const pts = []; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU - Math.PI / 2; pts.push([c + Math.cos(a) * 32, c + Math.sin(a) * 32]); }
    for (let i = 0; i < 7; i++) { const p = pts[i], q = pts[(i + 3) % 7]; pixLine(g, p[0], p[1], q[0], q[1], 1); }
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; const x = c + Math.cos(a) * 36.5, y = c + Math.sin(a) * 36.5; if (i % 2) g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); else { g.fillRect(Math.round(x), Math.round(y) - 2, 1, 5); g.fillRect(Math.round(x) - 1, Math.round(y) - 2, 3, 1); } }
    g.fillRect(Math.round(c) - 2, Math.round(c) - 2, 5, 5);
  }));
}
function webTex() {
  return _webTex || (_webTex = pixTex(32, (g, n) => {
    const c = n / 2 - 0.5; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; pixLine(g, c, c, c + Math.cos(a) * 15, c + Math.sin(a) * 15); }
    for (const r of [5, 9, 13]) { const pts = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]); } for (let i = 0; i < 8; i++) pixLine(g, pts[i][0], pts[i][1], pts[(i + 1) % 8][0], pts[(i + 1) % 8][1]); }
  }));
}
// shared, kept geometry and materials for the solid bits of hazards (spikes, mounds, chunks)
const KEEP = {};
function kept(key, make) { if (!KEEP[key]) { const o = make(); o.userData.keep = true; KEEP[key] = o; } return KEEP[key]; }
const SOLID = { ice: [0xc8f0ff, 0x3a90c0], frost: [0xe0f8ff, 0x4aa0d0], bone: [0xe8e2d0, 0x3a3428], sand: [0xc8a46a, 0x2a1a08], mound: [0xb08a58, 0x000000] };
const solidMat = (k) => kept('m' + k, () => new THREE.MeshLambertMaterial({ color: SOLID[k][0], emissive: SOLID[k][1], emissiveIntensity: 0.6 }));
// hazards that only mark the stones (no red warning, nothing to dodge)
const MARKS = new Set(['mound', 'sandburst', 'bind', 'raise', 'sigil', 'sigilGo', 'curse',
  // Act III: a wisp's lure, a bubble of slow time, a troll regrowing, the Bog Mother's wake, a bell tolling,
  // the Clockmaster's rewind, the Voice's circles of song
  'lure', 'bubble', 'regrow', 'wake', 'bellmark', 'rewind', 'song']);
const MARKC = { lure: [1.0, 2.8, 1.8], bubble: [1.0, 1.8, 3.2], regrow: [0.8, 2.6, 0.5], wake: [0.3, 0.5, 0.45], bellmark: [1.6, 2.4, 1.6], rewind: [1.2, 2.0, 3.2], song: [3.2, 2.6, 1.2] };

// the run's bosses (bosses5.js, the reworked Gaoler and Tallow): props and marks drawn by _mark5Mesh, blows with
// decorations of their own (_hz5Decor), set pieces of their entrances (_piece5)
const MARK5 = new Set(['cagewall', 'cagehold', 'waxwall', 'voice', 'kamae']);
const H5 = new Set(['iai', 'limb', 'cage', 'grin', 'pyre', 'brand', 'holyfire', 'tide', 'petal', 'chain']);
const PIECE5 = new Set(['descent', 'pyre', 'chandelier']);

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
    this._auras(ents, time); this._boss5(ents, time);
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
      v.position.set(h.x, 0.04, h.z);
      if (ud.mark) { this._markUpdate(h, v, Math.min(1, h.t / Math.max(0.01, h.life + h.warn)), dt, time); continue; }
      if (ud.mark5) { this._mark5Update(h, v, dt, time); continue; }
      if (ud.spikes) this._spikeUpdate(h, ud, warn, k);
      if (ud.spear) { ud.spear.position.y = warn ? 1.3 + 9 * (1 - k * k) : 1.3 - Math.min(1, k * 3) * 0.6; ud.spear.visible = !warn || k > 0.25; }
      if (h.shape === 'line') {
        ud.pivot.rotation.y = h.face || 0;
        if (ud.fan) { ud.fan.visible = warn; ud.fan.material.opacity = 0.1 + k * 0.25 + 0.06 * Math.sin(time * 30); }
        if (ud.core) { ud.core.visible = !warn; ud.core.material.opacity = 1 - k * 0.5; ud.core.scale.x = 0.7 + 0.3 * Math.sin(time * 60); }
        ud.lane.material.color.copy(warn ? ud.warnC : ud.hotC); ud.lane.material.opacity = warn ? 0.15 + k * 0.3 : 0.85 * (1 - k * 0.7);
        if (!warn && Math.random() < dt * 50) { const d = Math.random() * (h.len || 4), o = (Math.random() - 0.5) * (h.width || 1); const fx = Math.sin(h.face || 0), fz = Math.cos(h.face || 0); this.emit(h.x + fx * d + fz * o, 0.15, h.z + fz * d - fx * o, { n: 1, speed: 0.6, up: 1.5, vy: 2, life: 0.5, grav: -1, color: ud.hotC.toArray(), size: 1 }); }
      } else if (h.shape === 'circle') {
        ud.ring.visible = true; ud.fill.scale.setScalar(warn ? Math.max(0.01, k) : 1);
        ud.fill.material.opacity = warn ? 0.18 + k * 0.25 : 0.65 * (1 - k);
        ud.fill.material.color.copy(warn ? ud.warnC : ud.hotC);
        if (!warn && !ud.burst) { ud.burst = true; this._hazardBurst(h); }
        if (!warn && (h.kind === 'acid' || h.kind === 'frost') && Math.random() < dt * 14) { const a = Math.random() * TAU, r = Math.random() * h.r; this.emit(h.x + Math.sin(a) * r, 0.08, h.z + Math.cos(a) * r, h.kind === 'acid' ? { n: 1, speed: 0.2, up: 1, vy: 0.9, life: 0.5, grav: 1, color: [0.8, 2.4, 0.4], size: 1 } : { n: 1, speed: 0.15, up: 0.4, vy: 0.4, life: 0.7, grav: -0.2, color: [1.6, 2.4, 2.8], size: 1 }); }
        if (!warn && h.kind === 'hellfire' && Math.random() < dt * 60) this.emit(h.x + (Math.random() - 0.5) * h.r * 1.6, 0.1, h.z + (Math.random() - 0.5) * h.r * 1.6, { n: 1, speed: 0.6, up: 1, vy: 3, life: 0.5, grav: -3, color: Math.random() < 0.5 ? [3.4, 1.6, 0.3] : [3, 0.5, 0.1], size: 2 });
        if (!warn && h.kind === 'fire' && Math.random() < dt * 30) this.emit(h.x + (Math.random() - 0.5) * h.r * 1.6, 0.1, h.z + (Math.random() - 0.5) * h.r * 1.6, { n: 1, speed: 0.4, up: 1, vy: 2, life: 0.6, grav: -2, color: [3, 1.2, 0.2], size: 1 });
      } else if (h.shape === 'ring') {
        const r = h.r0 + (h.r1 - h.r0) * (warn ? 0 : k);
        ud.wave.scale.setScalar(Math.max(0.01, r)); ud.wave.visible = !warn; ud.wave.material.opacity = 0.75 * (1 - k * 0.6);
        ud.ring.visible = warn; ud.ring.material.opacity = 0.3;
        if (!warn && Math.random() < dt * 40) { const a = Math.random() * Math.PI * 2; this.emit(h.x + Math.sin(a) * r, 0.1, h.z + Math.cos(a) * r, { n: 1, speed: 1, up: 1.5, life: 0.4, grav: 5, color: ud.dust, size: 1 }); }
      }
      if (H5.has(h.kind)) this._hz5Update(h, v, warn, k, dt, time);
    }
    for (const [h, v] of this.hz) if (!seen.has(h)) { free(this.group, v); this.hz.delete(h); }
  }

  // spikes (ice, bone) that burst up out of a circle when it goes hot and sink away at its end
  _spikeUpdate(h, ud, warn, k) {
    const up = warn ? 0 : Math.min(1, (h.t - h.warn) / 0.07) * (k > 0.7 ? Math.max(0, 1 - (k - 0.7) / 0.3) : 1);
    ud.spikes.visible = up > 0.01;
    for (const m of ud.spikes.children) m.scale.set(1, Math.max(0.01, up * m.userData.h), 1);
  }

  // the marks: a burrow mound, a spray of sand, a web or grave-cloth at the hero's feet, the glow where a
  // skeleton will rise, a ritual sigil turning, the flash when a ritual completes, a curse where the dead
  // lie. k: 0..1 through the mark's life.
  _markUpdate(h, v, k, dt, time) {
    const ud = v.userData; const kind = h.kind; const fade = Math.min(1, (1 - k) * 4);
    if (kind === 'mound') { const s = Math.sin(Math.min(1, k * 1.6) * Math.PI); ud.m.scale.set(h.r, Math.max(0.02, s), h.r); if (!ud.dust) { ud.dust = true; this.emit(h.x, 0.08, h.z, { n: 4, speed: 1.2, up: 1.4, life: 0.45, grav: 9, color: [1.4, 1.1, 0.7], size: 1, jit: h.r }); } }
    else if (kind === 'sandburst') { ud.m.material.opacity = 0.7 * fade; ud.m.scale.setScalar(0.6 + k * 0.6); if (!ud.dust) { ud.dust = true; this.emit(h.x, 0.1, h.z, { n: 36, speed: 2.4, up: 2.2, vy: 2, life: 0.8, grav: 9, color: [1.5, 1.15, 0.7], colorVar: 0.3, size: 2, jit: h.r * 0.8 }); } }
    else if (kind === 'bind') { const g = Math.min(1, k * 8); ud.m.scale.setScalar(h.r * (0.4 + 0.6 * g)); ud.m.material.opacity = 0.9 * fade; ud.m.rotation.z += dt * 0.3; }
    else if (kind === 'raise' || kind === 'curse') {
      const pulse = 0.5 + 0.5 * Math.sin(time * 14); ud.m.material.opacity = (0.35 + 0.4 * pulse * k) * fade; ud.m.scale.setScalar(h.r * (1.1 - k * 0.3));
      const c = kind === 'raise' ? [0.7, 2.6, 0.5] : [1.8, 0.6, 2.6];
      if (Math.random() < dt * 30) { const a = Math.random() * TAU, r = Math.random() * h.r; this.emit(h.x + Math.sin(a) * r, 0.1, h.z + Math.cos(a) * r, { n: 1, speed: 0.1, up: 0.2, vy: 1.6, life: 0.6, grav: -1, color: c, size: 1 }); }
    } else if (kind === 'sigil') {
      const g = Math.min(1, h.t / 0.3); ud.m.scale.setScalar(h.r * (0.6 + 0.4 * g)); ud.m.rotation.z += dt * (0.6 + k * 3); ud.m.material.opacity = (0.55 + 0.3 * Math.sin(time * 9)) * g;
      ud.m2.rotation.z -= dt * 1.4; ud.m2.material.opacity = 0.3 * g;
      if (Math.random() < dt * 40) { const a = Math.random() * TAU; this.emit(h.x + Math.sin(a) * h.r * 0.9, 0.1, h.z + Math.cos(a) * h.r * 0.9, { n: 1, speed: 0.1, up: 0.2, vy: 2.2 + k * 2, life: 0.6, grav: -1, color: [2.8, 0.4, 1.4], size: 1 }); }
    } else if (MARKC[kind]) {
      const c = MARKC[kind];
      if (ud.thread) { ud.m.material.opacity = (0.4 + 0.4 * Math.sin(time * 18)) * fade; if (Math.random() < dt * 30) { const d = Math.random() * (h.len || 3); this.emit(h.x + Math.sin(h.face) * d, 0.9, h.z + Math.cos(h.face) * d, { n: 1, speed: 0.2, life: 0.4, grav: 0, color: c, size: 1 }); } return; }
      const g = Math.min(1, h.t / 0.25); const pulse = 0.5 + 0.5 * Math.sin(time * (kind === 'bubble' ? 3 : 10));
      ud.m.scale.setScalar(h.r * (kind === 'wake' ? 0.6 + k * 0.8 : (kind === 'rewind' ? 1.3 - k * 0.6 : 1.05))); ud.m.material.opacity = (kind === 'wake' ? 0.5 : 0.35 + 0.35 * pulse) * g * fade;
      if (kind === 'bubble' || kind === 'rewind') ud.m.rotation.z -= dt * (kind === 'rewind' ? 6 : 0.4);
      if (ud.m2) ud.m2.material.opacity = (kind === 'song' ? 0.22 + 0.1 * pulse : 0.14) * g * fade;
      if (kind !== 'wake' && Math.random() < dt * (kind === 'song' ? 40 : 18)) { const a = Math.random() * TAU, r = Math.random() * h.r; this.emit(h.x + Math.sin(a) * r, 0.1, h.z + Math.cos(a) * r, { n: 1, speed: 0.1, up: 0.2, vy: kind === 'song' ? 2.4 : 1.2, life: 0.7, grav: -0.6, color: c, size: 1 }); }
      if (kind === 'bellmark' && !ud.burst) { ud.burst = true; this.shockRing(h.x, h.z, 2.4, c, 0.5); }
    } else if (kind === 'sigilGo') {
      ud.m.scale.setScalar(h.r * (0.8 + k * 1.4)); ud.m.material.opacity = 0.9 * (1 - k);
      if (!ud.burst) { ud.burst = true; this.shockRing(h.x, h.z, h.r * 2.2, [3, 0.4, 1.6], 0.5); this.emit(h.x, 0.2, h.z, { n: 40, speed: 2.5, up: 2, vy: 3, life: 0.8, grav: -1, color: [3, 0.5, 1.6], size: 1, jit: h.r }); }
    }
  }

  _hazardMesh(h) {
    if (h.vis && MARK5.has(h.kind)) return this._mark5Mesh(h);
    const g = this._hazardMesh0(h); if (!h.vis && H5.has(h.kind)) this._hz5Decor(h, g); return g;
  }
  _hazardMesh0(h) {
    const kinds = { fire: [3, 0.8, 0.15], poison: [0.5, 2.0, 0.3], beam: [3, 1.4, 0.3], bone: [2.2, 2.0, 1.6], slam: [1.6, 0.15, 0.1], water: [0.3, 1.6, 1.6], wax: [2, 1.8, 1.2], toll: [1.8, 1.8, 2.2], lightning: [1.6, 1.8, 3], shock: [1.8, 1.0, 0.6],
      frost: [0.9, 1.9, 2.8], ice: [1.3, 2.2, 3.0], sand: [2.2, 1.5, 0.6], venom: [0.9, 2.6, 0.3], acid: [0.9, 2.6, 0.35], hellfire: [3.4, 0.8, 0.15], holy: [3.0, 2.6, 1.4], eyebeam: [3.2, 2.9, 2.0], curse: [1.6, 0.5, 2.4],
      bog: [0.7, 1.4, 0.35], wispfire: [0.9, 2.8, 1.8], steam: [1.1, 1.2, 1.3], spark: [3.2, 1.9, 0.6], saw: [2.6, 2.4, 2.0], chrono: [0.55, 1.1, 2.1], radiant: [2.4, 2.2, 1.5], choir: [3.0, 1.6, 2.6], spear: [3.2, 3.0, 2.0], spoke: [2.2, 1.9, 1.0], discord: [2.4, 0.4, 2.8],
      iai: [3.4, 3.4, 3.8], limb: [2.4, 2.3, 2.1], cage: [1.6, 1.3, 1.0], grin: [3, 3, 3], pyre: [3.4, 1.2, 0.2], brand: [3.4, 0.9, 0.15], holyfire: [3.4, 2.5, 0.9], tide: [0.6, 1.9, 2.1], petal: [3.0, 1.3, 1.8], chain: [1.6, 1.5, 1.4], drop: [1.4, 1.3, 1.2] };
    const hot = kinds[h.kind] || kinds.slam;
    const g = new THREE.Group();
    const mat = (c, o, blend = THREE.AdditiveBlending) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), transparent: true, opacity: o, depthWrite: false, blending: blend, fog: false, side: THREE.DoubleSide });
    const flat = (m) => { m.rotation.x = -Math.PI / 2; return m; };
    if (h.vis && MARKS.has(h.kind)) { // marks: no warning colours
      let m = null; const ud = { mark: true };
      if (h.kind === 'mound') { m = new THREE.Mesh(kept('gMound', () => new THREE.ConeGeometry(1, 0.28, 6)), solidMat('mound')); m.position.y = 0.0; m.castShadow = true; }
      else if (h.kind === 'sandburst') m = flat(new THREE.Mesh(new THREE.CircleGeometry(h.r, 10), mat([0.16, 0.1, 0.05], 0.7, THREE.NormalBlending)));
      else if (h.kind === 'bind') { m = flat(new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ map: webTex(), color: new THREE.Color(1.6, 1.55, 1.4), transparent: true, opacity: 0.9, depthWrite: false, fog: false }))); m.position.y = 0.02; }
      else if (h.kind === 'raise') m = flat(new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ map: ringTex(), color: new THREE.Color(0.6, 2.4, 0.4), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
      else if (h.kind === 'curse') m = flat(new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ map: ringTex(), color: new THREE.Color(1.6, 0.5, 2.4), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
      else if (h.kind === 'sigil') {
        m = flat(new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ map: sigilTex(), color: new THREE.Color(2.8, 0.25, 1.1), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); m.position.y = 0.02;
        const m2 = flat(new THREE.Mesh(new THREE.CircleGeometry(h.r, 7), mat([0.9, 0.05, 0.3], 0.3))); g.add(m2); ud.m2 = m2;
      } else if (MARKC[h.kind]) {
        if (h.shape === 'line') { // a thread of light (the lure)
          const pg = new THREE.PlaneGeometry(h.width || 0.25, h.len || 4); pg.translate(0, (h.len || 4) / 2, 0);
          m = new THREE.Mesh(pg, mat(MARKC[h.kind], 0.8)); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI; const pv = new THREE.Group(); pv.rotation.y = h.face || 0; pv.add(m); g.add(pv); ud.m = m; ud.thread = true; g.userData = ud; return g;
        }
        m = flat(new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ map: ringTex(), color: new THREE.Color(...MARKC[h.kind]), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
        if (h.kind === 'bubble' || h.kind === 'song') { const f = flat(new THREE.Mesh(new THREE.CircleGeometry(h.r, 28), mat(MARKC[h.kind], 0.16))); g.add(f); ud.m2 = f; }
        if (h.kind === 'wake') { m.material = mat([0.25, 0.4, 0.38], 0.5, THREE.NormalBlending); }
      } else m = flat(new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ map: ringTex(), color: new THREE.Color(3, 0.5, 1.6), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); // sigilGo
      g.add(m); ud.m = m; g.userData = ud; return g;
    }
    if (h.shape === 'line') {
      const pg = new THREE.PlaneGeometry(h.width || 1, h.len || 4); pg.translate(0, (h.len || 4) / 2, 0);
      const lane = new THREE.Mesh(pg, mat([1.6, 0.12, 0.08], 0.25)); lane.rotation.x = -Math.PI / 2; lane.rotation.z = Math.PI;
      const pivot = new THREE.Group(); pivot.rotation.y = h.face || 0; pivot.add(lane); g.add(pivot);
      g.userData = { lane, pivot, warnC: new THREE.Color(1.6, 0.12, 0.08), hotC: new THREE.Color(...hot), line: true };
      if (h.kind === 'eyebeam') { // a white-hot core down the middle of the beam
        const cg = new THREE.PlaneGeometry((h.width || 1) * 0.35, h.len || 4); cg.translate(0, (h.len || 4) / 2, 0);
        const core = new THREE.Mesh(cg, mat([3.4, 3.2, 2.6], 1)); core.rotation.x = -Math.PI / 2; core.rotation.z = Math.PI; core.position.y = 0.01; pivot.add(core); g.userData.core = core;
      }
      if (h.sweep) { // the whole fan the beam will sweep, shown while it warns
        const a0 = Math.min(h.sweep.a0, h.sweep.a1), a1 = Math.max(h.sweep.a0, h.sweep.a1);
        const fan = new THREE.Mesh(new THREE.RingGeometry(0.4, h.len || 4, 24, 1, a0 - Math.PI / 2, a1 - a0), mat([1.6, 0.12, 0.08], 0.2)); fan.rotation.x = -Math.PI / 2; g.add(fan); g.userData.fan = fan;
      }
      return g;
    }
    if (h.shape === 'circle') {
      const ring = new THREE.Mesh(new THREE.RingGeometry(h.r - 0.1, h.r, 24), mat([1.6, 0.12, 0.08], 0.4)); ring.rotation.x = -Math.PI / 2; g.add(ring);
      const fill = new THREE.Mesh(new THREE.CircleGeometry(h.r, 24), mat([1.6, 0.12, 0.08], 0.2)); fill.rotation.x = -Math.PI / 2; g.add(fill);
      g.userData = { ring, fill, warnC: new THREE.Color(1.6, 0.12, 0.08), hotC: new THREE.Color(...hot) };
      if (h.kind === 'spear') { // a spear of light that comes down from above as the warning runs out
        const sp = new THREE.Mesh(kept('gSpear', () => new THREE.BoxGeometry(0.12, 2.6, 0.12)), kept('mSpear', () => new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.0, 2.0), fog: false })));
        sp.position.y = 9; g.add(sp); g.userData.spear = sp;
      }
      if (h.kind === 'ice' || h.kind === 'bone' || h.kind === 'sand') { // spikes (or a burst of rock) that come up when it strikes
        const sp = new THREE.Group(); sp.visible = false; const n = Math.max(4, Math.min(9, Math.round(h.r * 6)));
        const geo = kept('gSpike', () => new THREE.ConeGeometry(0.13, 0.7, 4)); geo.translate && !geo.userData.moved && (geo.translate(0, 0.35, 0), geo.userData.moved = true);
        const m0 = solidMat(h.kind);
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU + Math.random() * 0.5, r = (i === 0 ? 0 : 0.35 + Math.random() * 0.5) * h.r;
          const m = new THREE.Mesh(geo, m0); m.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
          const sc = h.kind === 'sand' ? 0.9 + Math.random() * 0.6 : 0.8 + Math.random() * 0.7; m.userData.h = (i === 0 ? 1.5 : 1) * sc * (h.kind === 'sand' ? 0.7 : 1);
          m.rotation.set((Math.random() - 0.5) * 0.5 + Math.cos(a) * 0.25 * (r > 0 ? 1 : 0), Math.random() * 3, (Math.random() - 0.5) * 0.5 - Math.sin(a) * 0.25 * (r > 0 ? 1 : 0)); m.castShadow = true;
          if (h.kind === 'sand') m.scale.x = 2;
          sp.add(m);
        }
        g.add(sp); g.userData.spikes = sp;
      }
    } else {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.6, 24), mat([1.6, 0.12, 0.08], 0.3)); ring.rotation.x = -Math.PI / 2; g.add(ring);
      const wave = new THREE.Mesh(new THREE.RingGeometry(0.88, 1.0, 40), mat(hot, 0.7)); wave.rotation.x = -Math.PI / 2; g.add(wave);
      g.userData = { ring, wave, dust: hot.map((v) => v * 0.4) };
    }
    return g;
  }

  _hazardBurst(h) {
    const at = (o) => this.emit(h.x, 0.1, h.z, { jit: h.r * 0.9, size: 1, ...o });
    if (h.kind === 'ice' || h.kind === 'frost') { at({ n: 26, speed: 2.2, up: 2.2, vy: 2, life: 0.6, grav: 10, color: [1.8, 2.6, 3], colorVar: 0.3 }); at({ n: 8, speed: 1.2, up: 1.5, life: 0.8, grav: 6, color: [2.4, 2.8, 3], size: 2 }); return; }
    if (h.kind === 'sand') { at({ n: 34, speed: 1.6, up: 3, vy: 4.5, life: 0.9, grav: 11, color: [1.6, 1.2, 0.7], colorVar: 0.35, size: 2 }); at({ n: 14, speed: 3, up: 1, life: 0.5, grav: 8, color: [1.1, 0.8, 0.5], size: 1 }); return; }
    if (h.kind === 'bone') { at({ n: 22, speed: 2.4, up: 1.8, vy: 2, life: 0.55, grav: 12, color: [2.2, 2.1, 1.8], size: 1 }); at({ n: 10, speed: 0.4, up: 1, vy: 1.2, life: 0.8, grav: -0.5, color: [0.6, 2.2, 0.5], size: 1 }); return; }
    if (h.kind === 'acid' || h.kind === 'venom') { at({ n: 22, speed: 2, up: 2, vy: 1.5, life: 0.6, grav: 10, color: [0.8, 2.6, 0.35], size: 1 }); return; }
    if (h.kind === 'hellfire') { at({ n: 30, speed: 1.4, up: 2, vy: 3, life: 0.7, grav: -2, color: [3.4, 1.0, 0.15], size: 2 }); return; }
    if (h.kind === 'holy') { at({ n: 24, speed: 2, up: 2, vy: 2, life: 0.6, grav: -1, color: [3, 2.6, 1.4] }); return; }
    if (h.kind === 'pyre' || h.kind === 'brand' || h.kind === 'holyfire') { at({ n: 22, speed: 1.4, up: 2, vy: 3, life: 0.7, grav: -2, color: h.kind === 'holyfire' ? [3.4, 2.6, 1.0] : [3.4, 1.2, 0.2], size: 2 }); return; }
    if (h.kind === 'grin') { at({ n: 18, speed: 2.4, up: 1, vy: 1, life: 0.3, grav: 4, color: [3, 3, 3] }); return; }
    if (h.kind === 'cage') { at({ n: 20, speed: 2.6, up: 1, life: 0.4, grav: 8, color: [0.5, 0.48, 0.45], size: 1 }); return; }
    if (h.kind === 'drop') { at({ n: 30, speed: 2.6, up: 1, life: 0.5, grav: 6, color: [0.6, 0.58, 0.55], size: 1 }); return; }
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
      const ud = v.userData;
      if (ud.spin) { v.rotation.x = time * ud.spin; v.rotation.z = time * ud.spin * 0.7; }
      if (ud.disc) ud.disc.rotation.y = time * 18;
      if (p.kind === 'wrap') v.rotation.z = Math.sin(time * 18) * 0.5;
      if (p.kind === 'fireball') { this.emit(p.x, (p.y ?? 1.1), p.z, { n: 2, speed: 0.4, up: 1, vy: 0.8, life: 0.45, grav: -2, color: Math.random() < 0.5 ? [3.4, 1.6, 0.3] : [3, 0.5, 0.1], size: Math.random() < 0.3 ? 2 : 1, jit: 0.15 }); }
      else if (Math.random() < (ud.rich ? 1 : 0.5)) { const c = ud.trail; this.emit(p.x, (p.y ?? 1.1), p.z, { n: 1, speed: 0.2, life: ud.rich ? 0.45 : 0.3, grav: ud.rich ? 1.5 : 0, color: c, size: 1, alpha: 0.8, jit: ud.rich ? 0.12 : 0 }); }
      if (p.team === 'hero' && v.userData.team !== 'hero') { v.userData.team = 'hero'; v.traverse((o) => { if (o.material) o.material.color.setRGB(3, 0.4, 0.3); }); }
    }
    for (const [id, v] of this.projs) if (!seen.has(id)) { free(this.group, v); this.projs.delete(id); }
  }

  _projMesh(p) {
    const g = new THREE.Group();
    const cols = { orb: [3, 0.25, 0.3], flame: [3.2, 1.6, 0.3], soul: [0.4, 2.6, 2.4], bolt: [2, 1.9, 1.7], wave: [3, 0.35, 0.3], hbolt: [2.4, 2.2, 1.8], hfire: [3.4, 1.5, 0.3], wisp: [2.6, 2.2, 1.0], flask: [3, 1.3, 0.3], spit: [0.7, 2.4, 0.4],
      frostbolt: [1.2, 2.4, 3.2], iceshard: [1.8, 2.6, 3.2], boulder: [1.8, 2.2, 2.6], wrap: [2.2, 2.0, 1.5], web: [2.4, 2.4, 2.3], fireball: [3.4, 1.4, 0.25], hex: [2.6, 0.4, 2.2], sandspit: [1.8, 1.3, 0.7],
      wispbolt: [0.9, 2.8, 1.8], hexbolt: [1.0, 2.4, 0.9], weed: [0.6, 1.4, 0.5], mud: [0.5, 0.6, 0.3], fist: [3, 1.8, 0.6], saw: [2.6, 2.6, 2.6], halo: [3.2, 2.6, 1.0], gear: [2.8, 2.0, 0.8], bell: [1.8, 1.4, 0.7], bubble: [1.4, 2.2, 2.4] };
    const c = cols[p.kind] || cols.orb;
    const basic = (col, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...col), fog: false, ...o });
    const halo = (col, s) => { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#ffffff', 32, 1.5), color: new THREE.Color(col[0] * 0.3, col[1] * 0.3, col[2] * 0.3), blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); h.scale.set(s, s, 1); return h; };
    const NEW = {
      frostbolt: () => { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.56), basic(c))); const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), basic([2.6, 3, 3.2])); m.rotation.z = Math.PI / 4; m.position.z = 0.2; g.add(m); g.add(halo(c, 1.2)); return { rich: true }; },
      iceshard: () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), basic(c)); m.rotation.set(0.6, 0.6, 0); g.add(m); g.add(halo(c, 0.9)); return { spin: 9 }; },
      boulder: () => { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 0.6), new THREE.MeshLambertMaterial({ color: 0xdce8f4, emissive: 0x30506a }))); const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), basic([1.6, 2.4, 3])); m.position.set(0.22, 0.2, 0.1); g.add(m); return { spin: 4, rich: true }; },
      wrap: () => { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.56), basic([1.5, 1.35, 1.0]))); const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.6), basic([0.4, 1.6, 1.0])); m.position.x = 0.1; g.add(m); g.add(halo([2.2, 2, 1.4], 1.0)); return { rich: true }; },
      web: () => { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), basic(c))); for (const r of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.035, 0.035), basic([2, 2, 1.9])); m.rotation.y = r; g.add(m); } return { spin: 6, rich: true }; },
      fireball: () => { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), basic([3.4, 0.9, 0.15]))); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), basic([3.6, 3.0, 1.2]))); g.add(halo(c, 2.0)); return { spin: 5 }; },
      hex: () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), basic(c)); g.add(m); const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), basic([3, 2, 3])); g.add(m2); g.add(halo(c, 1.5)); return { spin: 8, rich: true }; },
      wispbolt: () => { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), basic([2.8, 3.2, 3.0]))); g.add(halo(c, 1.6)); return { rich: true }; },
      hexbolt: () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), basic(c)); m.rotation.z = Math.PI / 4; g.add(m); g.add(halo(c, 1.3)); return { spin: 6, rich: true }; },
      weed: () => { for (const r of [0, 1.2, 2.4]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.6), basic(c)); m.rotation.z = r; g.add(m); } return { spin: 5, rich: true }; },
      mud: () => { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.5), new THREE.MeshLambertMaterial({ color: 0x3a3a22, emissive: 0x0a1206 }))); const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshLambertMaterial({ color: 0x4a6a2a })); m.position.set(0.2, 0.2, 0); g.add(m); return { spin: 4, rich: true }; },
      fist: () => { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.42), new THREE.MeshLambertMaterial({ color: 0xc8963a, emissive: 0x3a2008 }))); const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.4), basic([3.2, 1.6, 0.4])); m.position.z = -0.4; g.add(m); g.add(halo([3, 1.4, 0.4], 1.2)); return { rich: true }; },
      saw: () => { const d = new THREE.Group(); for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.62), basic(c)); m.rotation.y = i / 8 * Math.PI; d.add(m); } g.add(d); g.userData.disc = d; return { disc: d, rich: true }; },
      halo: () => { const d = new THREE.Group(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), basic(c)); m.position.set(Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4); m.rotation.y = a + Math.PI / 2; d.add(m); } g.add(d); g.add(halo(c, 1.6)); return { disc: d, rich: true }; },
      gear: () => { const d = new THREE.Group(); d.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.34), new THREE.MeshLambertMaterial({ color: 0xc8963a, emissive: 0x2a1404 }))); for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.56), new THREE.MeshLambertMaterial({ color: 0xc8963a, emissive: 0x2a1404 })); m.rotation.y = i / 6 * Math.PI; d.add(m); } g.add(d); return { disc: d }; },
      bell: () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 0.48, 8), new THREE.MeshLambertMaterial({ color: 0x8a6a2a, emissive: 0x1a1406 })); g.add(m); const v = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), basic([0.8, 2.4, 1.6])); v.position.y = -0.24; g.add(v); return { spin: 3, rich: true }; },
      bubble: () => { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.6, 1.8), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), basic([2.6, 3, 3])); m.position.set(0.1, 0.12, 0); g.add(m); return { spin: 2, rich: true }; },
      sandspit: () => { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.3), new THREE.MeshLambertMaterial({ color: 0xc8a46a, emissive: 0x3a2a10 }))); return { spin: 7, rich: true }; },
    };
    if (NEW[p.kind]) { const o = NEW[p.kind](); g.userData = { trail: c.map((v) => v * 0.6), team: p.team, ...o }; return g; }
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
    this._pieces(dt); this._debris(dt);
    for (const s of this.slashes) { s.t -= dt; s.l.material.opacity = Math.max(0, s.t / s.life); }
    this.slashes = this.slashes.filter((s) => { if (s.t <= 0) { free(this.group, s.l); return false; } return true; });
  }

  // ---------------------------------------------------------------- Ascended bosses (New Game+)
  // A crown of light over the boss, a ring in its colour under it, a soft glow round it and motes rising;
  // all of it brighter and bigger in its last phase (e.ascPeak). The Wheel's true form (e.voice) gets a gold
  // aura of its own. Read from the entities each frame (ascColor is set by bosses4.js).
  _auras(ents, time) {
    const map = this.auraMap || (this.auraMap = new Map()); const seen = new Set();
    const dt = Math.min(0.1, Math.max(0, time - (this._auraT ?? time))); this._auraT = time;
    for (const e of ents) {
      if (!e.boss || e.dead || !(e.ascended || e.voice)) continue; seen.add(e.id);
      let a = map.get(e.id); const col = e.voice && !e.ascended ? 0xffe08a : (e.ascColor || 0xfff0c0);
      if (!a || a.col !== col) { if (a) free(this.group, a.g); a = this._auraMake(e, col); map.set(e.id, a); this.group.add(a.g); }
      const sc = e.def.scale || 1; const peak = e.ascPeak || e.voice ? 1 : 0; const c = new THREE.Color(col);
      a.g.visible = !e.hidden; a.g.position.set(e.x, (e.leapH || 0), e.z);
      a.crown.position.y = 2.05 * sc + (e.def.hover ? 0.4 : 0) + Math.sin(time * 2) * 0.05; a.crown.rotation.y = time * (1.2 + peak * 1.5); a.crown.scale.setScalar(sc * (0.75 + peak * 0.3));
      const pulse = 0.5 + 0.5 * Math.sin(time * (4 + peak * 4));
      a.ring.scale.setScalar((e.r + 0.7) * (1 + 0.06 * pulse)); a.ring.material.opacity = 0.4 + 0.35 * pulse;
      a.ring2.visible = !!peak; a.ring2.rotation.z = -time * 0.8; a.ring2.scale.setScalar((e.r + 1.5) * (1 + 0.1 * Math.sin(time * 3)));
      a.halo.position.y = 1.1 * sc; a.halo.scale.set(2.4 * sc * (1 + peak * 0.3), 3.0 * sc * (1 + peak * 0.3), 1); a.halo.material.opacity = 0.35 + 0.15 * pulse + peak * 0.2;
      if (!e.hidden && Math.random() < dt * (14 + peak * 30)) { const ang = Math.random() * TAU, r = (e.r + 0.4) * Math.random(); this.emit(e.x + Math.sin(ang) * r, 0.2 + Math.random() * 1.5 * sc, e.z + Math.cos(ang) * r, { n: 1, speed: 0.15, vy: 1.6 + peak, up: 0.2, life: 0.9, grav: -0.8, color: [c.r * 3, c.g * 3, c.b * 3], size: Math.random() < 0.2 + peak * 0.3 ? 2 : 1 }); }
    }
    for (const [id, a] of map) if (!seen.has(id)) { free(this.group, a.g); map.delete(id); }
  }
  _auraMake(e, col) {
    const c = new THREE.Color(col); const g = new THREE.Group();
    const add = (m) => new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(m), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    const crown = new THREE.Group(); g.add(crown);
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, i % 3 ? 0.16 : 0.28, 0.07), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(3), fog: false })); b.position.set(Math.sin(a) * 0.3, i % 3 ? 0.08 : 0.14, Math.cos(a) * 0.3); crown.add(b); }
    const band = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.33, 18), add(2.4)); band.rotation.x = -Math.PI / 2; crown.add(band);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 36), add(2)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
    const ring2 = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ map: sigilTex(), color: c.clone().multiplyScalar(2.2), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.04; g.add(ring2);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#ffffff', 32, 1.4), color: c.clone().multiplyScalar(0.55), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true })); g.add(halo);
    return { g, crown, ring, ring2, halo, col };
  }

  // ---------------------------------------------------------------- set pieces for the boss entrances
  // setPiece(kind, x, z, face, o): a temporary prop built here and animated over its own life (o.life): a
  // brick wall that bursts, a cage of candles that comes down and melts, a chain out of the water, a pool
  // that floods, bones that gather, a furnace that bursts, a staircase of light, a glacier block, the wheel's
  // eye in the sky, drowned bells rising, a clock face that swings open, a column of light. It fades or sinks
  // away by itself. debris(x, y, z, n, colour, o): chunks that fly, fall, bounce and shrink away.
  setPiece(kind, x, z, face = 0, o = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = face; this.group.add(g);
    const lam = (hex, em = 0) => new THREE.MeshLambertMaterial({ color: hex, emissive: em });
    const glow = (rgb, op = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), transparent: op < 1, opacity: op, depthWrite: op >= 1, blending: op < 1 ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false, side: THREE.DoubleSide });
    const boxm = (w, h, d, m, px, py, pz, parent = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); b.castShadow = true; parent.add(b); return b; };
    const P = { kind, g, t: 0, life: o.life || 4, o, ud: {} }; const U = P.ud;
    if (PIECE5.has(kind)) { this._piece5(kind, P); (this.pieceList || (this.pieceList = [])).push(P); return P; }
    if (kind === 'wall') {
      const sm = lam(0x6a5e56), dk = lam(0x4a403a); U.bricks = [];
      for (let r = 0; r < 6; r++) for (let i = -4; i <= 4; i++) { const b = boxm(0.44, 0.24, 0.5, (r + i) % 3 ? sm : dk, i * 0.46 + (r % 2) * 0.23, 0.13 + r * 0.26, 0); U.bricks.push(b); }
      U.stub = boxm(4.4, 0.4, 0.55, dk, 0, 0.2, 0); U.stub.visible = false;
    } else if (kind === 'cage') {
      const iron = lam(0x2a2620); U.cage = new THREE.Group(); g.add(U.cage); U.bars = [];
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; U.bars.push(boxm(0.07, 2.8, 0.07, iron, Math.sin(a) * 1.25, 1.4, Math.cos(a) * 1.25, U.cage)); }
      boxm(2.6, 0.1, 2.6, iron, 0, 2.85, 0, U.cage); boxm(0.06, 6, 0.06, iron, 0, 5.8, 0, U.cage);
      U.candles = []; for (let i = 0; i < 10; i++) { const a = (i + 0.5) / 10 * TAU; const cnd = boxm(0.1, 0.22, 0.1, lam(0xe8dcc0), Math.sin(a) * 1.25, 2.98, Math.cos(a) * 1.25, U.cage); boxm(0.06, 0.08, 0.06, glow([3.2, 2.2, 0.8]), 0, 0.15, 0, cnd); U.candles.push(cnd); }
    } else if (kind === 'chain') {
      U.pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), glow([0.08, 0.2, 0.24], 0.9)); U.pool.material.blending = THREE.NormalBlending; U.pool.rotation.x = -Math.PI / 2; U.pool.position.y = 0.03; g.add(U.pool);
      U.links = []; for (let i = 0; i < 14; i++) U.links.push(boxm(0.12, 0.2, 0.06, lam(0x6a6e72, 0x101418), 0, 0, 0));
    } else if (kind === 'pool') {
      U.pool = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(...(o.color || [0.1, 0.3, 0.3])), transparent: true, opacity: 0.88, depthWrite: false, fog: false })); U.pool.rotation.x = -Math.PI / 2; U.pool.position.y = 0.03; g.add(U.pool);
      U.ripples = []; const rc = (o.color || [0.1, 0.3, 0.3]).map((v) => Math.min(1.2, v * 3 + 0.15)); for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 32), glow(rc, 0.35)); r.rotation.x = -Math.PI / 2; r.position.y = 0.05; g.add(r); U.ripples.push(r); }
    } else if (kind === 'bones') {
      U.bones = []; const bm = lam(0xe0d8c4);
      for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, r = 2 + Math.random() * 2.6; const b = boxm(0.12 + Math.random() * 0.08, 0.09, 0.45 + Math.random() * 0.4, bm, Math.sin(a) * r, 0.05, Math.cos(a) * r); b.rotation.y = Math.random() * 3; U.bones.push({ b, x: b.position.x, z: b.position.z, ty: 0.3 + Math.random() * 1.6 }); }
    } else if (kind === 'furnace') {
      U.body = new THREE.Group(); g.add(U.body); const br = lam(0x5a3a2a), dk = lam(0x2a1a12);
      boxm(2.4, 2.2, 1.6, br, 0, 1.1, 0, U.body); boxm(2.6, 0.3, 1.8, dk, 0, 2.3, 0, U.body); boxm(0.6, 1.6, 0.6, dk, 0.6, 3.1, 0, U.body);
      U.mouth = boxm(1.2, 1.1, 0.05, glow([3.2, 1.4, 0.3]), 0, 0.8, 0.82, U.body); boxm(0.5, 0.06, 0.5, glow([3.2, 1.6, 0.4]), 0.6, 3.92, 0, U.body);
    } else if (kind === 'stairs') {
      U.steps = []; const n = o.steps || 5, L = o.len || 4.6, H = o.height || 2.4; const m = lam(0xe8e2f0, 0x201830), edge = glow([2.4, 2.0, 3.0]);
      for (let i = 0; i < n; i++) { const z = -L * (i + 0.5) / n, h = H * (i + 1) / n; const b = boxm(2.2, h, L / n + 0.02, m, 0, h / 2, z); boxm(2.24, 0.05, 0.06, edge, 0, h / 2, L / n / 2, b); U.steps.push(b); }
    } else if (kind === 'glacier') {
      const W = o.w || 3, Hh = o.h || 4.4;
      U.ice = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, W * 0.9), new THREE.MeshLambertMaterial({ color: 0xb8e4ff, emissive: 0x1a3a50, transparent: true, opacity: 0.55, depthWrite: false })); U.ice.position.y = Hh / 2; g.add(U.ice);
      U.cracks = []; for (let i = 0; i < 6; i++) { const c = boxm(0.05, 0.8 + Math.random(), 0.05, glow([1.8, 2.8, 3.2]), (Math.random() - 0.5) * W, 0.6 + Math.random() * (Hh - 1.2), W * 0.46); c.rotation.z = (Math.random() - 0.5) * 1.6; c.visible = false; U.cracks.push(c); }
    } else if (kind === 'eye') {
      const y = o.y || 10; U.sky = new THREE.Group(); U.sky.position.y = y; g.add(U.sky); U.sky.rotation.x = 0; g.rotation.y = 0;
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; boxm(0.3, 0.08, 0.12, glow(i % 2 ? [3, 2.4, 1.2] : [3, 0.6, 0.3]), Math.sin(a) * 2.8, 0, Math.cos(a) * 2.8, U.sky).rotation.y = a; }
      U.eye = new THREE.Group(); U.sky.add(U.eye); boxm(2.2, 0.06, 1.0, glow([3, 3, 2.8]), 0, -0.05, 0, U.eye); boxm(0.6, 0.08, 0.6, glow([3.2, 0.8, 0.3]), 0, -0.08, 0, U.eye);
      U.col = new THREE.Mesh(new THREE.BoxGeometry(1.4, y, 1.4), glow([1.4, 1.2, 0.7], 0.15)); U.col.position.y = y / 2; g.add(U.col);
    } else if (kind === 'bells') {
      U.bells = []; const n = o.n || 5, R = o.R || 3;
      for (let i = 0; i < n; i++) { const a = i / n * TAU; const bg = new THREE.Group(); bg.position.set(Math.sin(a) * R, -1, Math.cos(a) * R); g.add(bg); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.4, 0.56, 8), lam(0x6a5a2a, 0x10140a)); m.position.y = 0.3; m.castShadow = true; bg.add(m); boxm(0.4, 0.04, 0.4, glow([0.6, 2.2, 1.4]), 0, 0.02, 0, bg); U.bells.push(bg); }
    } else if (kind === 'clock') {
      const R = o.r || 2; U.hinge = new THREE.Group(); U.hinge.position.set(-R, 0, 0); g.add(U.hinge);
      U.face = new THREE.Group(); U.face.position.set(R, R + 0.3, 0); U.hinge.add(U.face);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.2, 24), lam(0xe8e0c8, 0x201a10)); disc.rotation.x = Math.PI / 2; U.face.add(disc);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 4, 24), lam(0xc8963a, 0x2a1404)); U.face.add(rim);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; boxm(0.08, i % 3 ? 0.2 : 0.38, 0.06, lam(0x2a1e10), Math.sin(a) * R * 0.82, Math.cos(a) * R * 0.82, 0.12, U.face).rotation.z = -a; }
      U.hh = new THREE.Group(); U.face.add(U.hh); boxm(0.12, R * 0.5, 0.05, lam(0x2a1e10), 0, R * 0.25, 0.16, U.hh);
      U.mh = new THREE.Group(); U.face.add(U.mh); boxm(0.08, R * 0.78, 0.05, lam(0x8a1a1a), 0, R * 0.39, 0.18, U.mh);
      U.door = boxm(R * 1.6, R * 1.6, 0.05, glow([0.02, 0.04, 0.08]), 0, R + 0.3, -0.14); U.door.material.opacity = 1;
      boxm(0.3, 0.3, 0.06, glow([1.2, 2, 3.2]), 0, R + 0.3, -0.2);
    } else if (kind === 'beam') {
      U.col = new THREE.Mesh(new THREE.BoxGeometry(1.5, 20, 1.5), glow(o.color || [3, 2.6, 1.4], 0.1)); U.col.position.y = 10; g.add(U.col);
      U.ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.7, 36), glow(o.color || [3, 2.6, 1.4], 0.7)); U.ring.rotation.x = -Math.PI / 2; U.ring.position.y = 0.05; g.add(U.ring);
    }
    (this.pieceList || (this.pieceList = [])).push(P);
    return P;
  }
  _pieces(dt) {
    const L = this.pieceList || []; const ez = (k) => k * k * (3 - 2 * k); const cl = (k) => Math.max(0, Math.min(1, k));
    for (const P of L) {
      P.t += dt; if (P.update5) { P.update5(dt); continue; }
      const t = P.t, o = P.o, U = P.ud, g = P.g; const end = cl((t - (P.life - 0.6)) / 0.6);
      if (P.kind === 'wall') {
        const hit = t >= o.burst; for (const b of U.bricks) b.visible = !hit; U.stub.visible = hit;
        if (!hit) { const shake = (Math.abs(t - 0.35) < 0.08 || Math.abs(t - 0.8) < 0.08) ? Math.sin(t * 90) * 0.05 : 0; g.children.forEach((c) => { if (c !== U.stub) c.position.x += shake * 0.2; }); }
        g.position.y = -end * 0.5;
      } else if (P.kind === 'cage') {
        const [t0, t1, y0] = o.drop || [0, 2, 9]; const k = cl((t - t0) / (t1 - t0)); U.cage.position.y = (1 - (1 - k) * (1 - k)) * (0.4 - y0) + y0;
        const m = cl((t - (o.melt || 2.2)) / 0.9); for (const b of U.bars) { b.scale.y = Math.max(0.01, 1 - m); b.position.y = 1.4 * (1 - m) + 0.02; }
        for (const c of U.candles) c.position.y = 2.98 - m * 2.9; U.cage.children.forEach((c) => { if (!U.bars.includes(c) && !U.candles.includes(c)) c.visible = m < 0.95; });
        if (m > 0 && m < 1 && Math.random() < dt * 40) { const a = Math.random() * TAU; this.emit(g.position.x + Math.sin(a) * 1.2, 1 + Math.random() * 1.5, g.position.z + Math.cos(a) * 1.2, { n: 1, speed: 0.2, life: 0.7, grav: 6, color: [2.4, 2.2, 1.7], size: 1 }); }
        g.visible = end < 1;
      } else if (P.kind === 'chain') {
        const pulls = o.pulls || [0.6, 1.2, 1.8, 2.4]; let h = -(o.depth || 2.6); pulls.forEach((p0) => { h += ez(cl((t - p0) / 0.35)) * (o.depth || 2.6) / pulls.length; });
        const bot = { x: 0, y: Math.min(0, h) + 1.7, z: 0.2 }, top = { x: 0, y: 7, z: -1.6 };
        U.links.forEach((l, i) => { const k = i / (U.links.length - 1); l.position.set(lerpN(bot.x, top.x, k), lerpN(bot.y, top.y, k), lerpN(bot.z, top.z, k)); l.rotation.y = i % 2 ? Math.PI / 2 : 0; l.rotation.x = Math.atan2(top.z - bot.z, top.y - bot.y); });
        U.pool.material.opacity = 0.9 * (1 - end); g.visible = end < 1;
      } else if (P.kind === 'pool') {
        const r = (o.r || 4) * ez(cl(t / (o.grow || 1))); U.pool.scale.setScalar(Math.max(0.01, r)); U.pool.material.opacity = 0.88 * (1 - end);
        U.ripples.forEach((rp, i) => { const k = ((t * 0.7 + i / 3) % 1); rp.scale.setScalar(Math.max(0.01, r * k)); rp.material.opacity = 0.35 * (1 - k) * (1 - end); });
      } else if (P.kind === 'bones') {
        const [g0, g1] = o.gather || [0.3, 1.8];
        for (const B of U.bones) { const k = cl((t - g0) / (g1 - g0)); const kk = ez(k); B.b.position.set(B.x * (1 - kk), 0.05 + Math.sin(k * Math.PI) * 1.2 + kk * B.ty, B.z * (1 - kk)); B.b.rotation.x = k * 8; B.b.visible = t < g1 + 0.05; }
      } else if (P.kind === 'furnace') {
        const hit = t >= o.burst; U.mouth.material.color.setRGB(3.2 * (1 + Math.sin(t * 20) * 0.2), 1.4, 0.3);
        if (hit) { const k = cl((t - o.burst) / 0.3); U.body.scale.set(1 + k * 0.2, Math.max(0.01, 1 - k), 1 + k * 0.2); U.body.visible = k < 1; }
      } else if (P.kind === 'stairs') {
        U.steps.forEach((b, i) => { b.position.y = (b.geometry.parameters.height / 2) - end * 3 - Math.max(0, t - 2.8 - i * 0.12) * 0.0; b.visible = end < 1; });
      } else if (P.kind === 'glacier') {
        U.cracks.forEach((c, i) => { c.visible = t > 0.8 + (i % 2) * 0.7; });
        g.visible = t < o.burst;
      } else if (P.kind === 'eye') {
        const k = ez(cl(t / (o.open || 1))); U.eye.scale.set(1, 1, Math.max(0.02, k)); U.sky.rotation.y = t * 0.4;
        U.col.visible = t > (o.open || 1) * 0.8; U.col.material.opacity = 0.15 * (1 - end) * (0.8 + 0.2 * Math.sin(t * 12)); U.sky.visible = end < 1;
      } else if (P.kind === 'bells') {
        const [r0, r1] = o.rise || [1, 2]; U.bells.forEach((b, i) => { const k = ez(cl((t - r0 - i * 0.06) / (r1 - r0))); b.position.y = -1 + k * 1.2 + Math.sin(t * 3 + i) * 0.06 * k - end * 1.3; b.rotation.z = Math.sin(t * 4 + i) * 0.15; });
      } else if (P.kind === 'clock') {
        const sp = t < (o.open || 1.2) ? 14 : 2; U.mh.rotation.z -= dt * sp; U.hh.rotation.z -= dt * sp / 12;
        U.hinge.rotation.y = -ez(cl((t - (o.open || 1.2)) / 0.6)) * 1.9; g.position.y = -end * 4.5;
      } else if (P.kind === 'beam') {
        const k = cl(t / 1.2); U.col.material.opacity = 0.1 * k * (1 - end) * (0.85 + 0.15 * Math.sin(t * 10)); U.ring.scale.setScalar(0.4 + k * 0.6 + Math.sin(t * 3) * 0.05); U.ring.material.opacity = 0.7 * k * (1 - end);
      }
    }
    this.pieceList = L.filter((P) => { if (P.t >= P.life) { free(this.group, P.g); return false; } return true; });
  }
  debris(x, y, z, n = 16, color = [0.5, 0.45, 0.4], o = {}) {
    const list = this.chunks || (this.chunks = []); const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(...color) });
    for (let i = 0; i < n; i++) {
      const s = (o.size || 0.18) * (0.6 + Math.random() * 0.8); const b = new THREE.Mesh(kept('gChunk', () => new THREE.BoxGeometry(1, 1, 1)), m); b.scale.set(s, s * (0.6 + Math.random() * 0.6), s); b.castShadow = true;
      b.position.set(x + (Math.random() - 0.5) * 1.2, y + (Math.random() - 0.5) * 1.2, z + (Math.random() - 0.5) * 1.2); this.group.add(b);
      const a = o.ang !== undefined ? o.ang + (Math.random() - 0.5) * 1.6 : Math.random() * TAU; const sp = (o.speed || 5) * (0.4 + Math.random() * 0.8);
      list.push({ m: b, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, vy: 2 + Math.random() * 4, t: 0, life: 1.6 + Math.random() * 0.8, s, spin: (Math.random() - 0.5) * 12 });
    }
    if (list.length > 160) for (const d of list.splice(0, list.length - 160)) free(this.group, d.m);
  }
  _debris(dt) {
    const L = this.chunks || [];
    for (const d of L) {
      d.t += dt; const b = d.m; d.vy -= 16 * dt; b.position.x += d.vx * dt; b.position.y += d.vy * dt; b.position.z += d.vz * dt; b.rotation.x += d.spin * dt; b.rotation.z += d.spin * 0.7 * dt;
      if (b.position.y < d.s * 0.5) { b.position.y = d.s * 0.5; d.vy *= -0.3; d.vx *= 0.6; d.vz *= 0.6; d.spin *= 0.6; }
      const k = Math.max(0, (d.t - d.life + 0.4) / 0.4); if (k > 0) b.scale.multiplyScalar(Math.max(0.5, 1 - k * 0.3));
    }
    this.chunks = L.filter((d) => { if (d.t >= d.life) { free(this.group, d.m); return false; } return true; });
  }

  // ================================================================ the run's bosses (game/bosses5.js, the reworked Gaoler and Tallow)
  // Hazard kinds of their own, drawn here: a line of light before the Ronin's cut, the tide's wall of water, a
  // pale limb thrust out of the dark, teeth closing, a cage falling from the dark, fire that stays (the Pyre
  // Saint's rings and brands, the cross of flame), petals on the wind, a chain lying taut. Props they leave
  // standing (marks with a solid under them): the Gaoler's cages, Tallow's walls of wax, a cage shut round the
  // hero; and the marks of their rites: the voices in the dark, the Ronin's guard. Read from the entities every
  // frame (_boss5): the dark and the flicker of the lights (e.dark, e.flicker), the Guest's smile hanging in
  // the dark and the frames it skips, the Ronin's petals and the line where he passed, the Saint's flames, her
  // cross and her pillar of fire, Tallow's candles while she is snuffed, dust falling from the vault.
  _mark5Mesh(h) {
    const g = new THREE.Group(); const ud = { mark5: true }; g.userData = ud;
    const lam = (hex, em = 0) => kept('l5' + hex + em, () => new THREE.MeshLambertMaterial({ color: hex, emissive: em }));
    const glow = (rgb, op = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    const add = (geo, m, x, y, z, p = g) => { const b = new THREE.Mesh(geo, m); b.position.set(x, y, z); b.castShadow = true; p.add(b); return b; };
    if (h.kind === 'cagewall' || h.kind === 'cagehold') { // a gibbet cage of black iron, dropped from the dark above
      const r = h.kind === 'cagehold' ? 0.75 : h.r, H = h.kind === 'cagehold' ? 2.0 : 2.2; const iron = lam(0x2a2622, 0x080604);
      ud.cage = new THREE.Group(); g.add(ud.cage);
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; add(kept('gBar', () => new THREE.BoxGeometry(0.06, 1, 0.06)), iron, Math.sin(a) * r, H / 2, Math.cos(a) * r, ud.cage).scale.y = H; }
      for (const y of [0.06, H * 0.55, H]) { const ring = add(new THREE.TorusGeometry(r, 0.04, 4, 12), iron, 0, y, 0, ud.cage); ring.rotation.x = Math.PI / 2; }
      add(new THREE.ConeGeometry(r * 0.9, 0.4, 10), iron, 0, H + 0.2, 0, ud.cage); add(kept('gChainV', () => new THREE.BoxGeometry(0.05, 6, 0.05)), iron, 0, H + 3.4, 0, ud.cage);
      ud.h = H; ud.drop = h.kind === 'cagewall' ? 0.0 : 0.0;
    } else if (h.kind === 'waxwall') { // a heap of hardened wax with candle stubs still burning in it
      const wax = lam(0xe8dcc0, 0x302418), drip = lam(0xd8c8a0, 0x201810);
      ud.wall = new THREE.Group(); g.add(ud.wall);
      add(new THREE.CylinderGeometry(h.r * 0.75, h.r * 1.05, 1.1, 8), wax, 0, 0.55, 0, ud.wall); add(new THREE.CylinderGeometry(h.r * 0.5, h.r * 0.78, 0.6, 7), drip, 0.05, 1.35, -0.04, ud.wall);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; add(kept('gDrip', () => new THREE.BoxGeometry(0.1, 0.4, 0.1)), drip, Math.sin(a) * h.r * 0.95, 0.3, Math.cos(a) * h.r * 0.95, ud.wall); }
      ud.flames = []; for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; const c = add(kept('gStub', () => new THREE.BoxGeometry(0.08, 0.2, 0.08)), wax, Math.sin(a) * 0.22, 1.72, Math.cos(a) * 0.22, ud.wall); const f = add(kept('gFlame', () => new THREE.BoxGeometry(0.07, 0.12, 0.07)), kept('mFl5', () => new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.0, 0.6), fog: false })), 0, 0.16, 0, c); ud.flames.push(f); }
      ud.wall.scale.y = 0.05;
    } else if (h.kind === 'voice') { // where the Hushed's voices call from: a pale ripple and a mouth in the dark
      ud.ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ map: ringTex(), color: new THREE.Color(1.8, 1.7, 1.6), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      ud.ring.rotation.x = -Math.PI / 2; ud.ring.position.y = 0.03; g.add(ud.ring);
      ud.mouth = add(kept('gMouth5', () => new THREE.BoxGeometry(0.06, 0.4, 0.02)), glow([1.6, 0.2, 0.25], 0.8), 0, 1.4, 0);
    } else if (h.kind === 'kamae') { // the reach of the Ronin's guard: a thin pale circle, and a second one breathing
      ud.ring = new THREE.Mesh(new THREE.RingGeometry(h.r - 0.05, h.r, 40), glow([2.2, 2.0, 2.6], 0.35)); ud.ring.rotation.x = -Math.PI / 2; ud.ring.position.y = 0.04; g.add(ud.ring);
      ud.ring2 = new THREE.Mesh(new THREE.RingGeometry(h.r - 0.03, h.r, 40), glow([3, 1.6, 2.2], 0.25)); ud.ring2.rotation.x = -Math.PI / 2; ud.ring2.position.y = 0.05; g.add(ud.ring2);
    }
    return g;
  }
  _mark5Update(h, v, dt, time) {
    const ud = v.userData; const life = h.life + h.warn; const age = h.t; const end = Math.min(1, Math.max(0, (life - age) / 0.5));
    if (ud.cage) { // falls, bounces, stands; lifts away at its end
      const fall = Math.min(1, age / 0.18); ud.cage.position.y = (1 - fall) * 7 - end * 0 + (end < 1 ? (1 - end) * 7 : 0);
      if (!ud.landed && fall >= 1) { ud.landed = true; this.dust(h.x, h.z, 14); this.shockRing(h.x, h.z, h.r + 0.8, [1.4, 1.2, 1.0], 0.3); this.sparks(h.x, 0.2, h.z, 0, 10, [2.8, 2.2, 1.4]); }
    } else if (ud.wall) { const g2 = Math.min(1, age / 0.45); ud.wall.scale.y = Math.max(0.05, g2 * end); ud.wall.position.y = 0; for (const f of ud.flames) { f.scale.y = 0.8 + Math.random() * 0.6; f.visible = end > 0.2; }
      if (Math.random() < dt * 6) this.emit(h.x + (Math.random() - 0.5) * 0.4, 1.9, h.z + (Math.random() - 0.5) * 0.4, { n: 1, speed: 0.1, vy: 0.8, life: 0.6, grav: -0.5, color: [3, 1.6, 0.4], size: 1 }); }
    else if (ud.mouth) { const pulse = 0.5 + 0.5 * Math.sin(time * 9 + h.x); ud.ring.scale.setScalar(h.r * (1 + pulse * 0.3)); ud.ring.material.opacity = 0.5 * end; ud.mouth.scale.y = 0.4 + pulse; ud.mouth.material.opacity = 0.8 * end;
      if (Math.random() < dt * 10) this.emit(h.x + (Math.random() - 0.5) * 0.6, 0.6 + Math.random(), h.z + (Math.random() - 0.5) * 0.6, { n: 1, speed: 0.1, vy: 0.4, life: 0.8, grav: -0.2, color: [1.2, 1.1, 1.1], size: 1, alpha: 0.6 }); }
    else if (ud.ring2) { ud.ring.material.opacity = 0.35 * end; const k = (time * 0.8) % 1; ud.ring2.scale.setScalar(0.3 + k * 0.7); ud.ring2.material.opacity = 0.3 * (1 - k) * end; }
  }
  // decorations on the new kinds of blow (built once with the hazard's mesh, posed every frame)
  _hz5Decor(h, g) {
    const ud = g.userData; const glow = (rgb, op = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    if (h.kind === 'iai' && h.shape === 'line') { // a single line of light: thin while he waits, a blinding blade when he passes
      const L = h.len || 6; const pg = new THREE.PlaneGeometry(0.07, L); pg.translate(0, L / 2, 0); const m = new THREE.Mesh(pg, glow([3.4, 3.4, 3.8], 0.2)); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI; m.position.y = 0.06; ud.pivot.add(m); ud.light = m;
      const bg = new THREE.PlaneGeometry(h.width || 1.2, L); bg.translate(0, L / 2, 0); const b = new THREE.Mesh(bg, glow([3.4, 3.4, 3.8], 0)); b.rotation.x = -Math.PI / 2; b.rotation.z = Math.PI; b.position.y = 0.07; ud.pivot.add(b); ud.blade = b;
      ud.lane.material.opacity = 0; ud.iai = true;
    } else if (h.kind === 'limb' && h.shape === 'line') { // a long pale limb thrust out of the dark down the lane
      const L = h.len || 8; const lg = new THREE.BoxGeometry(0.12, 0.12, L); lg.translate(0, 0, -L / 2); const m = new THREE.Mesh(lg, kept('mLimb', () => new THREE.MeshLambertMaterial({ color: 0xe8e2d6, emissive: 0x222018 }))); m.position.y = 0.9; m.castShadow = true;
      const hold = new THREE.Group(); hold.rotation.y = 0; ud.pivot.add(hold); hold.add(m); ud.limb = m; ud.limbLen = L; m.visible = false;
    } else if (h.kind === 'cage' && h.shape === 'circle') { // the cage seen falling out of the dark while the circle warns
      const cg = new THREE.Group(); const iron = kept('mIron5', () => new THREE.MeshLambertMaterial({ color: 0x2a2622, emissive: 0x080604 }));
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const b = new THREE.Mesh(kept('gBar', () => new THREE.BoxGeometry(0.06, 1, 0.06)), iron); b.scale.y = 2.1; b.position.set(Math.sin(a) * h.r * 0.7, 1.05, Math.cos(a) * h.r * 0.7); cg.add(b); }
      const top = new THREE.Mesh(new THREE.ConeGeometry(h.r * 0.75, 0.4, 8), iron); top.position.y = 2.3; cg.add(top); g.add(cg); ud.fall = cg; cg.position.y = 12;
    } else if (h.kind === 'grin' && h.shape === 'circle') { // teeth: two white rows that close on the circle
      const tg = new THREE.Group(); const tm = kept('mTooth', () => new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3), fog: false }));
      const n = Math.max(5, Math.round(h.r * 7)); for (let row = 0; row < 2; row++) for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI; const t = new THREE.Mesh(kept('gTooth', () => new THREE.BoxGeometry(0.1, 0.22, 0.08)), tm); t.position.set(Math.cos(a) * h.r, 0.12, (row ? -1 : 1) * Math.sin(a) * h.r * 0.2); t.userData.row = row; t.userData.a = a; tg.add(t); }
      g.add(tg); ud.teeth = tg;
    } else if ((h.kind === 'pyre' || h.kind === 'brand' || h.kind === 'holyfire') && !h.vis) { ud.fire = true; }
    else if (h.kind === 'tide' && h.shape === 'line') ud.tide = true;
    else if (h.kind === 'petal' && h.shape === 'line') ud.petal = true;
    else if (h.kind === 'chain' && h.shape === 'line') { const L = h.len || 8; const cg = new THREE.Group(); const iron = kept('mIron5', () => new THREE.MeshLambertMaterial({ color: 0x2a2622, emissive: 0x080604 })); for (let i = 0; i < Math.round(L / 0.22); i++) { const l = new THREE.Mesh(kept('gLink', () => new THREE.BoxGeometry(0.08, 0.05, 0.16)), iron); l.position.set(0, 0.3, i * 0.22); l.rotation.z = i % 2 ? Math.PI / 2 : 0; cg.add(l); } ud.pivot.add(cg); ud.chain = cg; cg.visible = false; }
  }
  _hz5Update(h, v, warn, k, dt, time) {
    const ud = v.userData; const fx = Math.sin(h.face || 0), fz = Math.cos(h.face || 0);
    if (ud.iai) {
      ud.lane.material.opacity = 0;
      if (warn) { ud.light.material.opacity = 0.25 + 0.75 * k * k + 0.1 * Math.sin(time * 40) * k; ud.blade.material.opacity = 0.05 * k; }
      else { ud.light.material.opacity = 1 - k; ud.blade.material.opacity = 0.9 * (1 - k); if (!ud.cut) { ud.cut = true; const L = h.len || 6; for (let i = 0; i < 24; i++) { const d = Math.random() * L; this.emit(h.x + fx * d, 1.0, h.z + fz * d, { n: 1, speed: 1.4, up: 0.6, life: 0.5, grav: 1, color: [3.2, 3.2, 3.6], size: 1 }); } this.sparks(h.x + fx * L, 1.1, h.z + fz * L, h.face, 12, [3.2, 3.2, 3.6]); } }
    }
    if (ud.limb) { // out of the dark: thrust in at the strike, hold, withdraw
      ud.limb.visible = !warn; if (!warn) { const out = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7 * 0.6; ud.limb.position.z = ud.limbLen * (out - 0.02); ud.limb.scale.z = 1; }
    }
    if (ud.fall) { ud.fall.position.y = warn ? 12 * (1 - k * k) : 0; ud.fall.visible = warn; }
    if (ud.teeth) { const c = warn ? 1 - k * 0.35 : 0.25; for (const t of ud.teeth.children) { t.position.z = (t.userData.row ? -1 : 1) * Math.sin(t.userData.a) * h.r * c; } ud.teeth.visible = warn || k < 0.4; ud.ring.visible = false; }
    if (ud.fire && !warn && Math.random() < dt * (h.shape === 'line' ? 60 : 24)) {
      const d = h.shape === 'line' ? Math.random() * (h.len || 6) : 0; const o = (Math.random() - 0.5) * (h.shape === 'line' ? h.width || 1 : h.r * 1.6);
      const px = h.shape === 'line' ? h.x + fx * d + fz * o : h.x + o, pz = h.shape === 'line' ? h.z + fz * d - fx * o : h.z + (Math.random() - 0.5) * h.r * 1.6;
      this.emit(px, 0.1, pz, { n: 1, speed: 0.4, up: 1, vy: 2.5 + Math.random() * 2, life: 0.55, grav: -2.5, color: h.kind === 'holyfire' ? [3.4, 2.6, 1.0] : (Math.random() < 0.5 ? [3.4, 1.5, 0.25] : [3, 0.55, 0.1]), size: Math.random() < 0.25 ? 2 : 1 });
    }
    if (ud.tide && Math.random() < dt * (warn ? 20 * k : 90)) { const d = Math.random() * (h.len || 6), o = (Math.random() - 0.5) * (h.width || 1); this.emit(h.x + fx * d + fz * o, 0.1, h.z + fz * d - fx * o, warn ? { n: 1, speed: 0.3, up: 1, vy: 1.4, life: 0.4, grav: 8, color: [0.5, 1.2, 1.4], size: 1 } : { n: 2, speed: 1.2, up: 2, vy: 4.5, life: 0.7, grav: 10, color: [0.8, 1.8, 2.0], size: 2 }); }
    if (ud.petal && Math.random() < dt * (warn ? 18 : 70)) { const d = Math.random() * (h.len || 6), o = (Math.random() - 0.5) * (h.width || 1); this.emit(h.x + fx * d + fz * o, 0.5 + Math.random() * 1.2, h.z + fz * d - fx * o, { n: 1, speed: warn ? 0.3 : 2.5, vx: fx * (warn ? 0.6 : 7), vz: fz * (warn ? 0.6 : 7), life: 0.6, grav: 0.3, color: [3.0, 1.3, 1.8], size: 1, drag: 0.5 }); }
    if (ud.chain) { ud.chain.visible = !warn; if (!warn) ud.chain.position.y = Math.sin(time * 30) * 0.02; }
  }
  // the lights of the scene, dimmed for the dark (the warden's own light is kept); restored when it lifts
  _lights5(dark, flick, hero) {
    const want = Math.max(0, Math.min(0.95, dark)) ; const f = flick ? (Math.random() < 0.35 ? 0.92 : (Math.random() < 0.5 ? 0.4 : 0)) : 0;
    const k = 1 - Math.max(want, f);
    if (k >= 0.999 && !this._dimmed) return;
    this._dimmed = k < 0.999;
    this.scene.traverse((o) => {
      if (!o.isLight) return; const ud = o.userData;
      if (hero && o.isPointLight && Math.hypot(o.position.x - hero.x - 0.5, o.position.z - hero.z - 0.8) < 0.8) return; // the warden's own light
      if (ud.bm5Set === undefined || Math.abs(o.intensity - ud.bm5Set) > 1e-4) ud.bm5Base = o.intensity; // someone else set it since
      o.intensity = ud.bm5Base * k; ud.bm5Set = o.intensity;
      if (k >= 0.999) { o.intensity = ud.bm5Base; delete ud.bm5Set; delete ud.bm5Base; }
    });
  }
  _boss5(ents, time) {
    const dt = Math.min(0.1, Math.max(0, time - (this._b5T ?? time))); this._b5T = time;
    const st = this.b5 || (this.b5 = { dark: 0, last: new Map(), grin: new Map(), cols: new Map() });
    let dark = 0, flick = false; let hero = null; const seen = new Set();
    for (const e of ents) {
      if (e.team === 'hero' && !e.ally && !hero) hero = e;
      if (e.dead || e.team !== 'foe') continue;
      if (e.dark) dark = Math.max(dark, e.dark); if (e.flicker) flick = true;
      const T = e.type; if (!T) continue;
      const sc = (e.def && e.def.scale) || 1; const last = st.last.get(e.id); st.last.set(e.id, { x: e.x, z: e.z }); seen.add(e.id);
      // the frames it skips: a smear where it was
      if ((T === 'smiling' || T === 'guestmask') && last && Math.hypot(e.x - last.x, e.z - last.z) > 0.45) {
        for (let i = 0; i < 3; i++) this.emit(last.x, 0.5 + i * 0.6 * sc, last.z, { n: 6, speed: 0.4, life: 0.35, grav: 0, color: i === 2 ? [2.6, 2.6, 2.6] : [0.05, 0.05, 0.06], size: 2, alpha: 0.9, jit: 0.2 });
      }
      // the Guest's smile hangs in the dark while the rest of it is gone
      if (T === 'smiling') {
        let gm = st.grin.get(e.id); const on = e.hidden && e.grin;
        if (!gm && on) { gm = this._grinSprite(); st.grin.set(e.id, gm); this.group.add(gm); }
        if (gm) { gm.visible = !!on; gm.position.set(e.x, 1.6 * sc, e.z); gm.material.opacity = 0.85 + 0.15 * Math.sin(time * 7); }
      }
      // the Ronin passes along his line: a white trail where he was
      if (T === 'ronin') {
        if (last && Math.hypot(e.x - last.x, e.z - last.z) > 1.2) { const n = Math.ceil(Math.hypot(e.x - last.x, e.z - last.z) / 0.3); for (let i = 0; i <= n; i++) { const k = i / n; this.emit(last.x + (e.x - last.x) * k, 1.0 + Math.random() * 0.6, last.z + (e.z - last.z) * k, { n: 1, speed: 0.3, life: 0.45, grav: 0, color: [3.2, 3.2, 3.6], size: 1 }); } this.slash5(last.x, last.z, e.x, e.z); }
        if (Math.random() < dt * 9) { const a = Math.random() * TAU, r = 1 + Math.random() * 6; this.emit(e.x + Math.sin(a) * r - 3, 2.5 + Math.random() * 2, e.z + Math.cos(a) * r, { n: 1, speed: 0.2, vx: 1.8, vy: -0.35, life: 2.6, grav: 0.2, color: [2.8, 1.2, 1.6], size: 1, drag: 0.3 }); }
        if (e.stance && Math.random() < dt * 6) this.emit(e.x + Math.sin(e.face + 1.2) * 0.3, 0.9 * sc, e.z + Math.cos(e.face + 1.2) * 0.3, { n: 1, speed: 0.05, life: 0.25, grav: 0, color: [3.4, 3.4, 3.8], size: 2 });
      }
      // the Pyre Saint: flames off her hem always; her cross of light; her pillar of fire
      if (T === 'pyresaint') {
        if (!e.hidden && Math.random() < dt * 30) this.emit(e.x + (Math.random() - 0.5) * 0.7, 0.3 + (e.leapH || 0) + 0.3, e.z + (Math.random() - 0.5) * 0.7, { n: 1, speed: 0.3, up: 1, vy: 2.2, life: 0.6, grav: -2, color: Math.random() < 0.5 ? [3.4, 1.6, 0.3] : [3, 0.6, 0.12], size: Math.random() < 0.3 ? 2 : 1 });
        let col = st.cols.get(e.id); if (!col) { col = this._pyreColumn(); st.cols.set(e.id, col); this.group.add(col.g); }
        const on = !!e.pillar; col.k += ((on ? 1 : 0) - col.k) * Math.min(1, dt * 5); col.g.visible = col.k > 0.02; col.g.position.set(e.x, 0, e.z);
        col.inner.material.opacity = 0.55 * col.k; col.outer.material.opacity = 0.25 * col.k * (0.85 + 0.15 * Math.sin(time * 14)); col.g.scale.set(0.6 + col.k * 0.4, 1, 0.6 + col.k * 0.4); col.inner.rotation.y = time * 3;
        if (on && Math.random() < dt * 90) this.emit(e.x + (Math.random() - 0.5) * 1.6, 0.2 + Math.random() * 4, e.z + (Math.random() - 0.5) * 1.6, { n: 1, speed: 0.5, vy: 4 + Math.random() * 3, life: 0.6, grav: -3, color: Math.random() < 0.5 ? [3.4, 1.6, 0.3] : [3.2, 0.6, 0.1], size: Math.random() < 0.4 ? 2 : 1 });
        col.cross.visible = !!e.crossed; if (e.crossed) { col.cross.position.set(0, 1.5 * sc + (e.leapH || 0), 0); col.cross.rotation.y = e.face; col.cross.children.forEach((m) => { m.material.opacity = 0.55 + 0.25 * Math.sin(time * 12); }); }
      }
      // Tallow snuffed: only her candles show, drifting in the dark
      if (T === 'tallow' && e.hidden && Math.random() < dt * 40) { const a = Math.random() * TAU; this.emit(e.x + Math.sin(a) * 0.5, 2.6 + Math.random() * 0.3, e.z + Math.cos(a) * 0.5, { n: 1, speed: 0.05, life: 0.3, grav: -0.3, color: [3.2, 2.2, 0.7], size: 1 }); }
      // the Mother in the vault: dust and grit falling from above where she crawls
      if (T === 'hollowmother' && e.hidden && hero && Math.random() < dt * 14) { const a = Math.random() * TAU, r = Math.random() * 5; this.emit(hero.x + Math.sin(a) * r, 7, hero.z + Math.cos(a) * r, { n: 2, speed: 0.1, life: 1.2, grav: 7, color: [0.45, 0.42, 0.4], size: 1 }); }
    }
    for (const [id, gm] of st.grin) if (!seen.has(id)) { free(this.group, gm); st.grin.delete(id); }
    for (const [id, c] of st.cols) if (!seen.has(id)) { free(this.group, c.g); st.cols.delete(id); }
    for (const id of [...st.last.keys()]) if (!seen.has(id)) st.last.delete(id);
    st.dark += (dark - st.dark) * Math.min(1, dt * (dark > st.dark ? 6 : 2.5));
    this._lights5(st.dark, flick, hero);
  }
  _grinSprite() { // a wide white smile and two pin-point eyes, drawn in pixels
    const tex = kept('tGrin', () => { const t = pixTex(32, (g, n) => { g.clearRect(0, 0, n, n); g.fillStyle = '#fff'; for (let x = 4; x <= 27; x++) { const y = 18 + Math.round(Math.sin((x - 4) / 23 * Math.PI) * 4); g.fillRect(x, y, 1, 2); if (x % 3 === 0) g.fillRect(x, y - 1, 1, 1); } g.fillRect(10, 10, 2, 2); g.fillRect(20, 10, 2, 2); }); t.userData = t.userData || {}; const m = new THREE.Object3D(); m.userData.tex = t; return m; }).userData.tex;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(2.4, 2.4, 2.4), transparent: true, depthWrite: false, depthTest: false, fog: false })); s.scale.set(1.6, 1.6, 1); s.renderOrder = 12; return s;
  }
  _pyreColumn() {
    const g = new THREE.Group();
    const mk = (r, h, c, op) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, h, 10, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide })); m.position.y = h / 2; g.add(m); return m; };
    const inner = mk(0.55, 5.5, [3.4, 1.8, 0.5], 0); const outer = mk(1.0, 6.5, [3.0, 0.7, 0.12], 0);
    const cross = new THREE.Group(); g.add(cross); const cm = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.4, 1.0), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    const v = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 3.2), cm()); cross.add(v); const hz = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.22), cm()); hz.position.y = 0.55; cross.add(hz); cross.visible = false;
    g.visible = false; return { g, inner, outer, cross, k: 0 };
  }
  // a straight line of light from (x0, z0) to (x1, z1): where a blade passed
  slash5(x0, z0, x1, z1, color = [3.4, 3.4, 3.8], life = 0.35) {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, 1.0, z0), new THREE.Vector3(x1, 1.0, z1)]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(...color), transparent: true, fog: false, depthTest: false })); l.renderOrder = 10; this.group.add(l); this.slashes.push({ l, t: life, life });
  }
  // set pieces of the new entrances: limbs uncurling down from the vault, the burning stake, Tallow's chandelier
  _piece5(kind, P) {
    const g = P.g, o = P.o, U = P.ud;
    const boxm = (w, h, d, m, px, py, pz, parent = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); b.castShadow = true; parent.add(b); return b; };
    const lam = (hex, em = 0) => new THREE.MeshLambertMaterial({ color: hex, emissive: em });
    const glow = (rgb, op = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), transparent: op < 1, opacity: op, depthWrite: op >= 1, blending: op < 1 ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false, side: THREE.DoubleSide });
    if (kind === 'descent') { U.limbs = []; const m = lam(0xe8e2d6, 0x1a1814); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const L = 3 + Math.random() * 2; const b = boxm(0.1, L, 0.1, m, Math.sin(a) * 1.2, (o.y || 10) + L / 2, Math.cos(a) * 1.2); b.rotation.z = Math.sin(a) * 0.2; U.limbs.push({ b, L, d: i * 0.12 }); } }
    else if (kind === 'pyre') { U.stake = new THREE.Group(); g.add(U.stake); const wd = lam(0x2a1a10, 0x200800); boxm(0.22, 3.4, 0.22, wd, 0, 1.7, -0.25, U.stake); boxm(1.9, 0.18, 0.18, wd, 0, 2.6, -0.25, U.stake);
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; boxm(0.9, 0.16, 0.16, lam(0x3a2414, 0x301004), Math.sin(a) * 0.6, 0.12, Math.cos(a) * 0.6, U.stake).rotation.y = a; }
      U.col = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 7, 10, 1, true), glow([3.2, 1.2, 0.2], 0.0)); U.col.position.y = 3.5; g.add(U.col); U.stake.position.y = -3.6; }
    else if (kind === 'chandelier') { U.ch = new THREE.Group(); g.add(U.ch); const iron = lam(0x2a2620); const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.06, 4, 18), iron); ring.rotation.x = Math.PI / 2; U.ch.add(ring);
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; const s = boxm(0.04, 3.2, 0.04, iron, Math.sin(a) * 0.7, 1.5, Math.cos(a) * 0.7, U.ch); s.rotation.set(Math.cos(a) * 0.42, 0, -Math.sin(a) * 0.42); }
      boxm(0.06, 7, 0.06, iron, 0, 6.5, 0, U.ch); U.candles = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; const c = boxm(0.1, 0.3, 0.1, lam(0xe8dcc0), Math.sin(a) * 1.4, 0.2, Math.cos(a) * 1.4, U.ch); boxm(0.06, 0.08, 0.06, glow([3.2, 2.2, 0.8]), 0, 0.2, 0, c); U.candles.push(c); } }
    P.update5 = (dt) => {
      const t = P.t; const cl = (k) => Math.max(0, Math.min(1, k)); const ez = (k) => k * k * (3 - 2 * k); const end = cl((t - (P.life - 0.6)) / 0.6);
      if (kind === 'descent') { for (const L of U.limbs) { const k = ez(cl((t - L.d) / 1.8)); L.b.position.y = (o.y || 10) + L.L / 2 - k * (o.y || 10) * 0.75; L.b.rotation.x = Math.sin(t * 3 + L.d * 9) * 0.15; } g.visible = end < 1; }
      else if (kind === 'pyre') { const r = ez(cl((t - (o.rise || [0, 1])[0]) / ((o.rise || [0, 1])[1] - (o.rise || [0, 1])[0]))); U.stake.position.y = -3.6 + r * 3.6; const b = cl((t - (o.blaze || 1.2)) / 0.5); U.col.material.opacity = 0.35 * b * (1 - end) * (0.85 + 0.15 * Math.sin(t * 20)); U.col.scale.set(1 + 0.1 * Math.sin(t * 9), 1, 1 + 0.1 * Math.sin(t * 9));
        if (r > 0.2 && Math.random() < dt * 60) this.emit(g.position.x + (Math.random() - 0.5) * 1.5, 0.2 + Math.random() * 3 * b, g.position.z + (Math.random() - 0.5) * 1.5, { n: 1, speed: 0.4, vy: 3 + Math.random() * 3, life: 0.7, grav: -2, color: Math.random() < 0.5 ? [3.4, 1.6, 0.3] : [3, 0.6, 0.1], size: Math.random() < 0.3 ? 2 : 1 }); U.stake.visible = end < 0.8; }
      else if (kind === 'chandelier') { const [t0, t1, y0] = o.drop || [0, 2, 9]; const k = cl((t - t0) / (t1 - t0)); U.ch.position.y = (1 - (1 - k) * (1 - k)) * (2.6 - y0) + y0; U.ch.rotation.y = t * 0.6; const m = cl((t - (o.melt || 2.4)) / 0.8); for (const c of U.candles) c.scale.y = Math.max(0.05, 1 - m); g.visible = end < 1; }
    };
    return P;
  }

  clear() {
    for (const d of this.decals) free(this.group, d.m); this.decals = [];
    for (const [, m] of this.teles) free(this.group, m); this.teles.clear();
    for (const [, m] of this.hz) free(this.group, m); this.hz.clear();
    for (const [, m] of this.projs) free(this.group, m); this.projs.clear();
    for (const [, m] of this.zv) free(this.group, m); this.zv.clear();
    for (const tr of this.trails) free(this.group, tr.mesh); this.trails = [];
    for (const p of this.pieceList || []) free(this.group, p.g); this.pieceList = [];
    for (const d of this.chunks || []) free(this.group, d.m); this.chunks = [];
    for (const [, a] of this.auraMap || []) free(this.group, a.g); if (this.auraMap) this.auraMap.clear();
    if (this.b5) { for (const [, gm] of this.b5.grin) free(this.group, gm); for (const [, c] of this.b5.cols) free(this.group, c.g); this.b5 = null; } this._lights5(0, false, null);
    for (let i = 0; i < MAXP; i++) this.pLife[i] = 0;
    this._tonicClear();
  }
}

// B's element visuals (js/engine/fx_elements.js, a mixin installed on FX.prototype), loaded after FX exists so the
// mixin may import it; a missing file changes nothing
import('./fx_elements.js').then((m) => { const f = m && (m.installElements || m.install || m.default); if (typeof f === 'function') f(FX); }).catch(() => {});
