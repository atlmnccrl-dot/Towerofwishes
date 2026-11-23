'use strict';
// HOLLOWLANDS — the 3D view. A lit low-poly world with real shadows, rendered at low resolution
// and finished by a pass that adds the reference's tilt-shift focus, ordered dithering, vignette and grain.
// Game logic stays 2D on the ground plane: game (x, y) px = world (x, 0, y), 1 px = 1 unit.
HL.R3 = (() => {
  const T = window.THREE;
  const R = { ok: false };
  if (!T) return R;
  const P = HL.P;
  const PITCH = (56 * Math.PI) / 180, FOV = 22;
  let renderer, scene, cam, rt, postScene, postCam, postMat, hemi, sun, lantern, pts, ptsPos, ptsCol;
  let cur = null, W = 1, H = 1, viewH = 165, raycaster;
  const plights = [], decals = [], arrows = [], worlds = {}, figs = new Map();
  const tv = new T.Vector3(), tv2 = new T.Vector3(), tq = new T.Quaternion(), te = new T.Euler(), nm = new T.Matrix3(), tc = new T.Color();
  const col = (h) => new T.Color(h);
  const vcMat = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });

  // ---------------------------------------------------------------- geometry kit
  const geoCache = {};
  const GEO = {
    box: () => new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    cyl: () => new T.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0),
    cyl12: () => new T.CylinderGeometry(1, 1, 1, 14).translate(0, 0.5, 0),
    taper: () => new T.CylinderGeometry(0.65, 1, 1, 8).translate(0, 0.5, 0),
    cone: () => new T.ConeGeometry(1, 1, 7).translate(0, 0.5, 0),
    pyr: () => new T.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0),
    ico: () => new T.IcosahedronGeometry(1, 0),
    ico1: () => new T.IcosahedronGeometry(1, 1),
    dodec: () => new T.DodecahedronGeometry(1, 0),
    torus: () => new T.TorusGeometry(1, 0.22, 4, 12).rotateX(Math.PI / 2),
    bell: () => new T.LatheGeometry([[0, 1], [0.35, 1], [0.45, 0.85], [0.5, 0.5], [0.62, 0.15], [0.8, 0], [0.7, 0]].map(([x, y]) => new T.Vector2(x, y)), 10),
    // gable roof: ridge along x, from z -0.5..0.5, eaves at y 0, ridge at y 1
    gable: () => {
      const g = new T.BufferGeometry(), v = [];
      const q = (a, b, c, d) => v.push(...a, ...b, ...c, ...a, ...c, ...d);
      const A = [-0.5, 0, 0.5], B = [0.5, 0, 0.5], C = [0.5, 1, 0], D = [-0.5, 1, 0], E = [-0.5, 0, -0.5], F = [0.5, 0, -0.5];
      q(A, B, C, D); q(F, E, D, C); v.push(...B, ...F, ...C, ...E, ...A, ...D);
      g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
      return g;
    },
  };
  function geo(k) {
    if (!geoCache[k]) { let g = GEO[k](); if (g.index) g = g.toNonIndexed(); g.computeVertexNormals(); geoCache[k] = g; }
    return geoCache[k];
  }
  // collects coloured parts, merged later into one mesh (few draw calls)
  class Parts {
    constructor() { this.list = []; }
    add(k, x, y, z, sx, sy, sz, color, ry = 0, rx = 0, rz = 0) {
      te.set(rx, ry, rz, 'YXZ'); tq.setFromEuler(te);
      this.list.push({ g: geo(k), m: new T.Matrix4().compose(new T.Vector3(x, y, z), tq.clone(), new T.Vector3(sx, sy, sz)), c: col(color) });
      return this;
    }
    // transform everything added after index i by a base (x, z, rotation)
    place(from, x, z, ry = 0) {
      const b = new T.Matrix4().compose(new T.Vector3(x, 0, z), tq.setFromEuler(te.set(0, ry, 0)).clone(), new T.Vector3(1, 1, 1));
      for (let i = from; i < this.list.length; i++) this.list[i].m.premultiply(b);
    }
  }
  function merge(list) {
    let n = 0; for (const p of list) n += p.g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), cl = new Float32Array(n * 3);
    let o = 0;
    for (const p of list) {
      const A = p.g.attributes.position, N = p.g.attributes.normal; nm.getNormalMatrix(p.m);
      for (let i = 0; i < A.count; i++, o++) {
        tv.fromBufferAttribute(A, i).applyMatrix4(p.m); pos[o * 3] = tv.x; pos[o * 3 + 1] = tv.y; pos[o * 3 + 2] = tv.z;
        tv.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[o * 3] = tv.x; nor[o * 3 + 1] = tv.y; nor[o * 3 + 2] = tv.z;
        cl[o * 3] = p.c.r; cl[o * 3 + 1] = p.c.g; cl[o * 3 + 2] = p.c.b;
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('color', new T.BufferAttribute(cl, 3));
    g.computeBoundingSphere();
    return g;
  }
  function meshOf(parts, mat = vcMat, shadow = true) {
    const m = new T.Mesh(merge(parts.list || parts), mat);
    m.castShadow = shadow; m.receiveShadow = true;
    return m;
  }
  const jit = (x, y, s, k = 1) => (HL.hash(Math.round(x), Math.round(y), s) - 0.5) * k;

  // ---------------------------------------------------------------- props (one builder per sprite name)
  const PROPS = {
    barrel: (p) => { p.add('cyl', 0, 0, 0, 3, 8, 3, P.wd1); p.add('cyl', 0, 1.6, 0, 3.15, 0.7, 3.15, P.ch1); p.add('cyl', 0, 6, 0, 3.15, 0.7, 3.15, P.ch1); },
    crate: (p) => { p.add('box', 0, 0, 0, 7, 6.5, 7, P.wd1); p.add('box', 0, 6.4, 0, 7.4, 0.6, 7.4, P.wd0); },
    crateOpen: (p) => { p.add('box', 0, 0, 0, 7, 3, 7, P.wd2); p.add('box', 4, 0, 3, 5, 0.6, 3, P.wd1, 0.5); },
    chest: (p) => { p.add('box', 0, 0, 0, 9, 4.5, 6, P.wd1); p.add('box', 0, 4.5, 0, 9.2, 2, 6.2, P.wd0); p.add('box', -2.5, 0, 0, 1, 6.6, 6.4, P.st2); p.add('box', 2.5, 0, 0, 1, 6.6, 6.4, P.st2); p.add('box', 0, 3.5, 3.1, 1.6, 1.6, 0.4, P.cream2); },
    chestOpen: (p) => { p.add('box', 0, 0, 0, 9, 4.5, 6, P.wd1); p.add('box', 0, 4.5, -3.5, 9.2, 6, 1.4, P.wd0, 0, -0.3); p.add('box', 0, 4.4, 0, 8, 0.2, 5, P.ink); },
    urn: (p) => { p.add('taper', 0, 0, 0, 2.6, 6, 2.6, P.st1); p.add('cyl', 0, 6, 0, 1.6, 1, 1.6, P.st2); },
    urnBroken: (p) => { p.add('box', -1.5, 0, 0, 3, 2, 2, P.st1, 0.4); p.add('box', 2, 0, 1, 2, 1.4, 2, P.st2, 1); },
    corpse: (p) => { p.add('box', 0, 0, 0, 9, 2, 4, P.ch0, 0.2); p.add('box', 5, 0, 0.6, 3, 2.4, 3, P.cream3); p.add('box', -3, 0, 2, 5, 0.4, 3, P.red2); },
    corpseOpen: (p) => { p.add('box', 0, 0, 0, 9, 1.6, 4, P.ch1, 0.2); p.add('box', 5, 0, 0.6, 3, 2.2, 3, P.cream3); },
    bones: (p) => { p.add('box', 0, 0, 0, 7, 0.8, 1, P.ash1, 0.4); p.add('box', 1, 0, 1, 6, 0.8, 1, P.ash2, -0.6); p.add('box', 4, 0, -1, 2.6, 2.2, 2.4, P.ash1); },
    well: (p) => {
      for (let i = 0; i < 12; i++) { const a = (i / 12) * HL.TAU; p.add('box', Math.cos(a) * 6.2, 0, Math.sin(a) * 6.2, 3.4, 4.4, 2.6, i % 2 ? P.st1 : P.st0, -a + Math.PI / 2); }
      p.add('cyl', 0, 0, 0, 5, 0.3, 5, P.wa2);
      p.add('box', -7.5, 0, 0, 1.4, 14, 1.4, P.wd1); p.add('box', 7.5, 0, 0, 1.4, 14, 1.4, P.wd2); p.add('box', 0, 12.5, 0, 16, 1.4, 1.4, P.wd0);
      p.add('box', 0, 4, 0, 0.4, 8.5, 0.4, P.cream3);
    },
    bucket: (p) => { p.add('cyl', 0, 6, 0, 2, 3, 2, P.wd1); p.add('box', 8.8, 11, 0, 1, 3, 3, P.st1); },
    fireRing: (p) => { for (let i = 0; i < 8; i++) { const a = (i / 8) * HL.TAU; p.add('dodec', Math.cos(a) * 4, 0.8, Math.sin(a) * 4, 1.6, 1.2, 1.6, i % 2 ? P.st2 : P.st1); } p.add('box', 0, 0, 0, 5, 1, 1, P.wd2, 0.6); p.add('box', 0, 0.6, 0, 5, 1, 1, P.ch1, -0.7); },
    grave0: (p) => { p.add('box', 0, 0, 0, 5, 8, 1.6, P.st1); p.add('cyl', 0, 7.2, 0, 2.5, 1.6, 0.8, P.st1, 0, Math.PI / 2); },
    grave1: (p) => { p.add('box', 0, 0, 0, 1.2, 10, 1.2, P.st1); p.add('box', 0, 6, 0, 5, 1.2, 1.2, P.st1); },
    grave2: (p) => { p.add('box', 0, 0, 0, 6, 3.5, 3, P.st2, 0.1, 0.25); },
    mound: (p) => { p.add('ico', 0, 0, 0, 5, 1.6, 3, P.ash4); },
    fenceH: (p) => { p.add('box', -4, 0, 0, 1, 6, 1, P.wd2); p.add('box', 4, 0, 0, 1, 6, 1, P.wd2); p.add('box', 0, 2, 0, 9, 0.8, 0.6, P.wd1); p.add('box', 0, 4.4, 0, 9, 0.8, 0.6, P.wd1); },
    fenceB: (p) => { p.add('box', -4, 0, 0, 1, 6, 1, P.wd2); p.add('box', -2, 2, 0, 5, 0.8, 0.6, P.wd1, 0, 0, 0.5); },
    fenceV: (p) => { p.add('box', 0, 0, 0, 1, 7, 1, P.wd2); p.add('box', 0, 2.5, 0, 0.6, 0.8, 9, P.wd1); p.add('box', 0, 5, 0, 0.6, 0.8, 9, P.wd1); },
    anvil: (p) => { p.add('box', 0, 0, 0, 6, 2, 4, P.ch1); p.add('box', 0, 2, 0, 3, 3, 2.4, P.st3); p.add('box', 0.5, 5, 0, 8, 2, 3, P.st2); },
    forge: (p) => { p.add('box', 0, 0, 0, 13, 8, 7, P.st2); p.add('box', 0, 8, 0, 5, 9, 5, P.st3); p.add('box', 0, 3, 3.3, 7, 3.5, 0.6, P.red2); },
    wayStone: (p) => { p.add('box', 0, 0, 0, 4, 10, 2.6, P.st1, 0.15); p.add('pyr', 0, 10, 0, 2.6, 2, 1.8, P.st1, 0.15); },
    standStone: (p) => { p.add('taper', 0, 0, 0, 3.6, 17, 2.8, P.st1, 0.2); },
    log: (p) => { p.add('cyl', 0, 2.4, 0, 2.6, 24, 2.6, P.wd1, 0.15, 0, Math.PI / 2); },
    stump: (p) => { p.add('cyl', 0, 0, 0, 3, 3, 3, P.wd1); p.add('cyl', 0, 3, 0, 2.6, 0.2, 2.6, P.wd0); },
    leanTo: (p) => { p.add('box', -9, 0, 3, 1, 10, 1, P.wd2); p.add('box', 9, 0, 3, 1, 10, 1, P.wd2); p.add('box', 0, 9, -1, 21, 0.8, 11, P.cream3, 0, -0.45); p.add('box', -5, 0, 0, 6, 2, 3, P.wd1); },
    table: (p) => { p.add('box', 0, 4, 0, 11, 1, 6, P.wd0); for (const [a, b] of [[-4.5, -2], [4.5, -2], [-4.5, 2], [4.5, 2]]) p.add('box', a, 0, b, 1, 4, 1, P.wd2); },
    bed: (p) => { p.add('box', 0, 0, 0, 7, 3, 12, P.wd1); p.add('box', 0, 3, -4.4, 6, 1.2, 3, P.cream2); p.add('box', 0, 3, 1.4, 6.4, 1, 8, P.st2); },
    shelf: (p) => { p.add('box', 0, 0, 0, 11, 10, 3.4, P.wd2); p.add('box', -2, 3, 1, 3, 2.5, 2, P.cream3); p.add('box', 2.5, 6.5, 1, 4, 2.5, 2, P.st1); },
    brazier: (p) => { p.add('cyl', 0, 0, 0, 1, 6, 1, P.ch0); p.add('taper', 0, 6, 0, 2.6, 2.2, 2.6, P.st3, 0, Math.PI); p.add('cyl', 0, 0, 0, 2.4, 0.6, 2.4, P.ch1); },
    pillar: (p) => { p.add('box', 0, 0, 0, 9, 2.4, 9, P.st3); p.add('cyl', 0, 2.4, 0, 3.6, 22, 3.6, P.st2); p.add('box', 0, 24, 0, 9, 2.4, 9, P.st1); },
    bellS: (p) => bellFrame(p, 3.5, '#b9a57e'), bellM: (p) => bellFrame(p, 4.6, '#ad9872'), bellL: (p) => bellFrame(p, 5.8, '#a08b66'),
    bigBell: (p) => { p.add('bell', 0, 9.5, 0, 12, 12, 12, P.bronze, 0.4, 0, 1.75); p.add('ico', 0, 0, 0, 10, 1.6, 7, P.ash4); },
    resonator: (p) => { p.add('box', 0, 0, 0, 7, 2, 7, P.ch1); p.add('cyl', 0, 2, 0, 2.6, 16, 2.6, P.st2); p.add('torus', 0, 18, 0, 3.6, 3.6, 3.6, P.bronze); },
    crank: (p) => { p.add('box', 0, 0, 0, 3, 8, 3, P.st3); p.add('torus', 0, 9, 0, 4.4, 4.4, 4.4, P.st2, 0, Math.PI / 2); p.add('box', 0, 9, 0, 9, 0.8, 0.8, P.st1); p.add('box', 0, 4.6, 0, 0.8, 9, 0.8, P.st1); },
    stairsDown: (p) => { for (let i = 0; i < 4; i++) p.add('box', 0, -i * 0.01, -4 + i * 2.2, 16 - i * 2, 0.4, 2.2, [P.st2, P.st3, P.ch1, P.ink][i]); p.add('box', -8.5, 0, 0, 1.5, 2, 9, P.st3); p.add('box', 8.5, 0, 0, 1.5, 2, 9, P.st3); },
    stairsUp: (p) => { for (let i = 0; i < 4; i++) p.add('box', 0, 0, 3 - i * 2.4, 12, (i + 1) * 2.2, 2.4, [P.st2, P.st1, P.st1, P.st0][i]); },
    lamp: (p) => { p.add('box', 0, 0, 0, 1, 16, 1, P.ch0); p.add('box', 1.5, 15, 0, 4, 0.8, 0.8, P.ch0); p.add('box', 3, 12, 0, 2, 3, 2, P.ch1); },
    rubble: (p) => { for (let i = 0; i < 6; i++) p.add('box', (HL.hash(i, 1, 7) - 0.5) * 10, 0, (HL.hash(i, 2, 7) - 0.5) * 6, 2 + HL.hash(i, 3, 7) * 3, 1 + HL.hash(i, 4, 7) * 2, 2 + HL.hash(i, 5, 7) * 2, [P.st1, P.st2, P.ash3][i % 3], i); },
    rock0: (p) => { p.add('dodec', 0, 2, 0, 6, 4.4, 4.6, P.st2, 0.4); },
    rock1: (p) => { p.add('dodec', 0, 1.4, 0, 3.4, 2.6, 2.8, P.st1, 1.2); },
    tent: (p) => { p.add('pyr', 0, 0, 0, 10, 13, 6, P.cream3); p.add('box', 0, 0, 5.6, 3, 6, 0.4, P.ink); },
    pedestal: (p) => { p.add('box', 0, 0, 0, 8, 7, 6, P.st2); p.add('box', 0, 7, 0, 9.4, 1.4, 7.4, P.st1); },
    cart: (p) => { p.add('box', 0, 3, 0, 18, 1.4, 8, P.wd1, 0, 0, 0.12); p.add('box', 0, 4.4, -3.6, 18, 3, 0.8, P.wd2, 0, 0, 0.12); p.add('cyl', -7, 0, 4.5, 3.2, 0.8, 3.2, P.wd2, 0, Math.PI / 2); p.add('box', 11, 1, 0, 8, 0.8, 0.8, P.wd1, 0.3); p.add('box', 11, 1, 3, 8, 0.8, 0.8, P.wd1, -0.2); p.add('box', -2, 4.6, 0, 6, 3, 4, P.cream3); p.add('cyl', 6, 0, 7, 3, 0.6, 3, P.wd2, 0, 0, Math.PI / 2 - 0.1); },
    roots: (p) => { for (let i = 0; i < 26; i++) { const x = (HL.hash(i, 1, 9) - 0.5) * 30, z = (HL.hash(i, 2, 9) - 0.5) * 10; p.add('cyl', x, 0, z, 0.9, 10 + HL.hash(i, 3, 9) * 14, 0.9, i % 3 ? P.mo3 : P.wd2, 0, (HL.hash(i, 4, 9) - 0.5) * 0.9, (HL.hash(i, 5, 9) - 0.5) * 0.9); } p.add('box', 0, 8, 2, 1, 1, 1, P.red1); },
    rootsGone: (p) => { for (let i = 0; i < 12; i++) p.add('cyl', (HL.hash(i, 1, 9) - 0.5) * 30, 0, (HL.hash(i, 2, 9) - 0.5) * 8, 0.8, 1.5, 0.8, P.mo3); },
    scratch: (p) => { p.add('box', 0, 0, 0, 9, 7, 2, P.st2); },
    gateBars: (p) => { p.add('box', 0, 14, 0, 16, 2, 2, P.st3); for (let x = -7; x <= 7; x += 2.8) p.add('box', x, 0, 0, 0.9, 14, 0.9, P.st1); p.add('box', 0, 7, 0, 16, 0.9, 0.9, P.st2); },
    doorIron: (p) => { p.add('box', 0, 0, 0, 16, 15, 3, P.ch0); for (let x = -5; x <= 5; x += 5) p.add('box', x, 0, 1.6, 1, 15, 0.4, P.st2); p.add('box', 0, 6, 1.7, 1.6, 1.6, 0.4, P.cream2); },
    doorVault: (p) => { p.add('box', 0, 0, 0, 16, 15, 3, P.st3); p.add('cyl', 0, 7.5, 1.4, 4, 0.6, 4, P.bronze, 0, Math.PI / 2); },
    bush0: (p) => { p.add('ico', 0, 2.5, 0, 4, 3, 4, P.mo2); }, bush1: (p) => { p.add('ico', 0, 3, 0, 5, 3.6, 5, P.mo1); p.add('ico', 3, 2, 1, 3, 2.4, 3, P.mo2); },
  };
  function bellFrame(p, s, tone) { p.add('box', -s - 2, 0, 0, 1, s * 2 + 10, 1, P.wd2); p.add('box', s + 2, 0, 0, 1, s * 2 + 10, 1, P.wd2); p.add('box', 0, s * 2 + 9, 0, s * 2 + 6, 1.2, 1.2, P.wd1); p.add('bell', 0, 7, 0, s * 2, s * 2, s * 2, tone); }
  function tree(p, x, z, s, seed, dark) {
    const r = HL.rng(seed), h = (9 + r() * 6) * s;
    if (s < 1.25) p.add('box', x, 0, z, 2 * s, h * 0.6, 2 * s, P.ch1, r());
    const ramp = dark ? [P.mo3, P.mo2, '#3e4239'] : [P.mo2, P.mo1, '#575b50'];
    const n = s >= 1.25 ? 2 : 3 + ((r() * 2) | 0);
    for (let i = 0; i < n; i++) {
      const a = r() * HL.TAU, d = i ? (2 + r() * 3) * s : 0, rr = (i ? 4 + r() * 2.5 : 6.5 + r() * 2) * s;
      p.add('ico', x + Math.cos(a) * d, h + (i ? r() * 3 - 1 : 2) * s, z + Math.sin(a) * d, rr, rr * 0.82, rr, ramp[(i + (r() * 3) | 0) % 3], r() * 3);
    }
  }
  function deadTree(p, x, z, seed) {
    const r = HL.rng(seed), h = 14 + r() * 8;
    p.add('taper', x, 0, z, 1.3, h, 1.3, P.ch0);
    const br = (bx, by, bz, a, el, len, d) => {
      const ex = bx + Math.cos(a) * Math.cos(el) * len, ey = by + Math.sin(el) * len, ez = bz + Math.sin(a) * Math.cos(el) * len;
      tv.set(ex - bx, ey - by, ez - bz); const L = tv.length();
      te.set(0, 0, 0); const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), tv.normalize());
      const m = new T.Matrix4().compose(new T.Vector3(bx, by, bz), q, new T.Vector3(0.45 * (d + 1) * 0.6, L, 0.45 * (d + 1) * 0.6));
      p.list.push({ g: geo('cyl'), m, c: col(P.ch0) });
      if (d > 0) for (let k = 0; k < 2; k++) br(ex, ey, ez, a + (r() - 0.5) * 1.6, el + (r() - 0.3) * 0.6, len * 0.62, d - 1);
    };
    for (let i = 0; i < 3; i++) br(x, h * 0.75, z, r() * HL.TAU, 0.6 + r() * 0.4, h * 0.38, 2);
  }

  // ---------------------------------------------------------------- textures
  function canvasTex(c, rep) { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; t.minFilter = T.LinearMipmapLinearFilter; if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; } return t; }
  function towerTexture() {
    const c = HL.canvas(128, 256), g = c.g, ramp = [P.ink, P.ch1, P.ch0, P.st3, P.st2, P.st1, P.st0];
    for (let y = 0; y < 256; y++) for (let x = 0; x < 128; x++) {
      const by = Math.floor(y / 5), bx = Math.floor((x + (by % 2) * 4) / 8);
      let v = 0.62 + (HL.hash(bx, by, 9) - 0.5) * 0.16;
      if (y % 5 === 0 || (x + (by % 2) * 4) % 8 === 0) v -= 0.2;
      if (HL.fbm(bx * 0.6, by * 0.35, 21, 2) > 0.6) v -= 0.3;
      g.fillStyle = ramp[HL.clamp(Math.floor(v * 6 + HL.bayer(x, y) * 0.6), 0, 6)]; g.fillRect(x, y, 1, 1);
    }
    for (const [wx, wy] of [[20, 40], [70, 90], [40, 150], [100, 200], [10, 220]]) { g.fillStyle = P.ink; g.fillRect(wx, wy, 3, 9); }
    const t = canvasTex(c, true); t.repeat.set(2, 1); return t;
  }
  // the ground, rendered once per map: smooth tones, details, no muddy dithering
  function groundCanvas(w) {
    const TL = HL.TILE, Wd = w.pw, Ht = w.ph, c = HL.canvas(Wd, Ht), img = c.g.createImageData(Wd, Ht), d = img.data;
    const C = (h) => HL.rgb(P[h] || h);
    const ash0 = C('ash0'), ash1 = C('ash1'), ash2 = C('ash2'), ash3 = C('ash3'), ash4 = C('ash4'), st1 = C('st1'), st2 = C('st2'), st3 = C('st3'), ch0 = C('ch0'), ch1 = C('ch1'), ink = C('ink'), mo0 = C('mo0'), mo2 = C('mo2'), mo3 = C('mo3'), wa1 = C('wa1'), wa2 = C('wa2'), wd1 = C('wd1'), wd2 = C('wd2'), voidc = C('void');
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const walk = (t) => t === TL.ASH || t === TL.PATH || t === TL.GRASS || t === TL.COBBLE || t === TL.FIELD;
    for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) {
      let t = w.tile(x >> 3, y >> 3);
      if (walk(t)) { const n1 = HL.vnoise(x * 0.15, y * 0.15, 31), t2 = w.tile(Math.floor((x + (n1 - 0.5) * 7) / 8), Math.floor((y + (HL.vnoise(x * 0.15, y * 0.15, 37) - 0.5) * 7) / 8)); if (walk(t2)) t = t2; }
      const big = HL.vnoise(x * 0.018, y * 0.018, 41), mid = HL.vnoise(x * 0.09, y * 0.09, 43), h = HL.hash(x, y, 1);
      let o;
      switch (t) {
        case TL.ASH: o = mix(ash1, ash0, HL.clamp(big * 0.8 + mid * 0.3 - 0.15, 0, 1)); if (h < 0.006) o = ash4; else if (h < 0.02) o = ash2; break;
        case TL.GRASS: o = mix(mix(ash2, mo0, 0.3), ash1, big * 0.5 + mid * 0.3); if (h < 0.035) o = mix(ash4, mo0, 0.4); else if (HL.hash(x, y + 1, 1) < 0.035) o = ash3; break;
        case TL.PATH: o = mix(ash3, ash2, HL.clamp(big * 0.5 + mid * 0.5, 0, 1)); if (h < 0.03) o = ash1; else if (h > 0.975) o = ash4; break;
        case TL.COBBLE: { const row = Math.floor(y / 4), seam = y % 4 === 0 || (x + (row % 2) * 3) % 6 === 0; o = seam ? mix(ash4, ash3, 0.5) : mix(ash3, ash1, HL.hash(Math.floor((x + (row % 2) * 3) / 6), row, 3) * 0.8); break; }
        case TL.FIELD: o = y % 5 < 2 ? mix(wd2, st3, mid) : mix(st3, ash4, mid); break;
        case TL.WATER: o = mix(wa2, wa1, big); if (Math.sin(x * 0.35 + y * 0.12 + mid * 7) > 0.9) o = mix(o, ash4, 0.5); break;
        case TL.BRIDGE: { const seam = x % 7 === 0 || y % 5 === 0; o = seam ? st3 : mix(st2, st1, HL.hash(Math.floor(x / 7), Math.floor(y / 5), 12)); if (HL.vnoise(x * 0.2, y * 0.2, 55) > 0.78) o = wa2; break; }
        case TL.FOREST: o = mix(mo3, ink, HL.clamp(mid * 0.8, 0, 1)); if (h < 0.05) o = mo2; break;
        case TL.ROCK: o = mix(st3, st2, mid); break;
        case TL.FLOOR: { const off = (Math.floor(y / 8) % 2) * 4, seam = (x + off) % 8 === 0 || y % 8 === 0; o = seam ? ch1 : mix(ch0, st3, HL.hash(Math.floor((x + off) / 8), Math.floor(y / 8), 21) * 0.7 + mid * 0.3); if (h < 0.025) o = st2; break; }
        case TL.WALL: o = ink; break;
        default: o = voidc;
      }
      const k = (y * Wd + x) * 4; d[k] = o[0]; d[k + 1] = o[1]; d[k + 2] = o[2]; d[k + 3] = 255;
    }
    c.g.putImageData(img, 0, 0);
    return c;
  }

  // ---------------------------------------------------------------- building a world
  function buildWorld(w) {
    const group = new T.Group(), chunks = {}, dyn = new Map(), occluders = [], buildings = [];
    const chunk = (x, z) => { const k = Math.floor(x / 160) + ',' + Math.floor(z / 160); return chunks[k] || (chunks[k] = new Parts()); };
    // ground
    const gc = groundCanvas(w); w._g = gc;
    const gtex = canvasTex(gc); gtex.minFilter = T.LinearFilter; gtex.generateMipmaps = false;
    const ground = new T.Mesh(new T.PlaneGeometry(w.pw, w.ph), new T.MeshLambertMaterial({ map: gtex }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(w.pw / 2, 0, w.ph / 2); ground.receiveShadow = true;
    group.add(ground);
    const TL = HL.TILE;
    // tiles that stand up: forest, rock, dungeon walls
    for (let ty = 0; ty < w.H; ty++) for (let tx = 0; tx < w.W; tx++) {
      const t = w.tile(tx, ty), x = tx * 8 + 4, z = ty * 8 + 4;
      if (t === TL.FOREST) {
        let near = 9;
        for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (!HL.SOLID[w.tile(tx + i, ty + j)] || w.tile(tx + i, ty + j) === TL.WATER) near = Math.min(near, Math.max(Math.abs(i), Math.abs(j)));
        const hsh = HL.hash(tx, ty, 77);
        if (near <= 2 ? hsh < 0.72 : (tx + ty) % 2 === 0 && hsh < 0.6) tree(chunk(x, z), x + jit(tx, ty, 3, 6), z + jit(tx, ty, 4, 6), near <= 2 ? 0.95 + hsh * 0.3 : 1.3 + hsh * 0.4, tx * 977 + ty, HL.hash(tx, ty, 5) < 0.45);
      } else if (t === TL.ROCK) {
        const p = chunk(x, z), hgt = 7 + HL.hash(tx, ty, 6) * 8;
        p.add('box', x, 0, z, 8, hgt * 0.7, 8, P.st3);
        p.add('dodec', x + jit(tx, ty, 2, 3), hgt * 0.55, z + jit(tx, ty, 3, 3), 5.5, hgt * 0.5, 5.5, HL.hash(tx, ty, 8) < 0.5 ? P.st2 : P.st1, HL.hash(tx, ty, 9) * 3);
      } else if (t === TL.WALL) {
        const p = chunk(x, z), face = w.tile(tx, ty + 1) === TL.FLOOR;
        p.add('box', x, 0, z, 8, 15, 8, face ? (HL.hash(tx, ty, 2) < 0.5 ? P.st3 : P.ch0) : P.ch1);
        p.add('box', x, 15, z, 8.1, 1, 8.1, P.ink);
      }
    }
    // props and trees placed by hand
    for (const o of w.def.objects) {
      if (o.t === 'tree') { deadTree(chunk(o.x, o.y), o.x, o.y, o.x * 31 + o.y); continue; }
      if (o.t !== 'prop' || !PROPS[o.spr]) continue;
      const p = chunk(o.x, o.y), from = p.list.length;
      PROPS[o.spr](p); p.place(from, o.x, o.y - 2, o.spr === 'cart' ? 0.2 : 0);
    }
    // buildings: base (back/side walls, floor), front wall and roof fade separately when you step inside
    for (const b of w.buildings) {
      const d = b.def, x0 = b.x0, z0 = b.y0, x1 = b.x1, z1 = b.y1, WH = (d.H || 12) * 1.55, stone = d.roof === 'slate';
      const wall = stone ? P.st2 : P.ch0, trim = stone ? P.st1 : P.wd2;
      const base = new Parts(), front = new Parts(), roof = new Parts();
      base.add('box', (x0 + x1) / 2, 0, z0 + 2, x1 - x0, WH, 4, wall);
      base.add('box', x0 + 2, 0, (z0 + z1) / 2, 4, WH, z1 - z0, wall);
      base.add('box', x1 - 2, 0, (z0 + z1) / 2, 4, WH, z1 - z0, wall);
      base.add('box', (x0 + x1) / 2, 0.05, (z0 + z1) / 2, x1 - x0 - 6, 0.3, z1 - z0 - 6, stone ? P.st3 : P.wd1);
      const dx0 = x0 + d.door.x * 8, dx1 = dx0 + d.door.w * 8;
      front.add('box', (x0 + dx0) / 2, 0, z1 - 2, dx0 - x0, WH, 4, wall);
      front.add('box', (dx1 + x1) / 2, 0, z1 - 2, x1 - dx1, WH, 4, wall);
      front.add('box', (dx0 + dx1) / 2, WH * 0.72, z1 - 2, dx1 - dx0, WH * 0.28, 4, wall);
      if (!stone) for (const x of [x0 + 1, x1 - 1, dx0, dx1]) front.add('box', x, 0, z1 - 0.5, 1.6, WH, 1.6, trim);
      else for (let y = 3; y < WH; y += 4) front.add('box', (x0 + x1) / 2, y, z1 + 0.05, x1 - x0, 0.5, 0.2, P.st3);
      for (let x = x0 + 8; x < x1 - 8; x += 14) if (x + 3 < dx0 || x > dx1) front.add('box', x, WH * 0.4, z1 + 0.1, 3, 4, 0.4, P.ink);
      if (d.roof !== 'none') {
        const RH = (z1 - z0) * 0.42, rc = d.roof === 'slate' ? [P.ch1, P.ch0] : d.roof === 'wood' ? [P.wd2, P.wd1] : [P.ash4, P.ash3];
        const segs = Math.max(2, Math.round((x1 - x0) / 10)), sw = (x1 - x0 + 4) / segs;
        for (let i = 0; i < segs; i++) {
          if (d.ruined && HL.hash(i, x0, 4) < 0.4) { roof.add('box', x0 - 2 + sw * (i + 0.5), WH + RH * 0.5, (z0 + z1) / 2, 1.5, 1.5, z1 - z0, P.wd2); continue; }
          roof.add('gable', x0 - 2 + sw * (i + 0.5), WH, (z0 + z1) / 2, sw + 0.05, RH, z1 - z0 + 5, rc[i % 2]);
        }
        roof.add('box', (x0 + x1) / 2, WH + RH - 0.6, (z0 + z1) / 2, x1 - x0 + 4, 1.2, 1.4, P.ink);
        if (d.belfry) { const bx = (x0 + x1) / 2; roof.add('box', bx, WH, (z0 + z1) / 2, 14, RH + 12, 14, P.st2); roof.add('pyr', bx, WH + RH + 12, (z0 + z1) / 2, 11, 10, 11, P.ch1); roof.add('box', bx, WH + RH + 2, (z0 + z1) / 2 + 7, 7, 7, 0.5, P.ink); roof.add('bell', bx, WH + RH + 2, (z0 + z1) / 2 + 3, 5, 5, 5, P.bronze); }
      }
      const mb = meshOf(base), mf = meshOf(front, vcMat.clone()), mr = roof.list.length ? meshOf(roof, vcMat.clone()) : null;
      group.add(mb, mf); if (mr) group.add(mr);
      occluders.push(mf); if (mr) occluders.push(mr);
      buildings.push({ b, front: mf, roof: mr });
    }
    // dynamic objects: one small mesh per state
    const mk = (fn, x, z, ry = 0) => { const p = new Parts(); fn(p); p.place(0, x, z, ry); const m = meshOf(p); group.add(m); return m; };
    for (const o of w.objects) {
      const e = {};
      const S = (name) => PROPS[name];
      switch (o.t) {
        case 'container': if (o.spr && S(o.spr)) { e.closed = mk(S(o.spr), o.x, o.y - 2); e.open = mk(S(o.open || o.spr), o.x, o.y - 2); } break;
        case 'note': case 'anvil': case 'crank': if (S(o.spr)) e.base = mk(S(o.spr), o.x, o.y - 2); if (o.glyph != null) e.glyph = glyphSprite(o.glyph, o.x, 13, o.y); break;
        case 'well': e.base = mk(S('well'), o.x, o.y - 5); e.bucket = mk(S('bucket'), o.x, o.y - 5); break;
        case 'stone': e.base = mk(S('standStone'), o.x, o.y - 2); e.glyphs = [0, 1, 2, 3].map((k) => glyphSprite(k, o.x, 21, o.y - 1)); break;
        case 'roots': e.closed = mk(S('roots'), o.x, o.y - 6); e.open = mk(S('rootsGone'), o.x, o.y - 6); break;
        case 'bell': e.base = mk(S(o.spr), o.x, o.y - 3); break;
        case 'resonator': {
          e.base = mk(S('resonator'), o.x, o.y - 2);
          e.glow = new T.Mesh(geo('torus'), new T.MeshBasicMaterial({ color: P.lt0 })); e.glow.scale.set(5, 5, 5); e.glow.position.set(o.x, 18, o.y - 2); group.add(e.glow);
          break;
        }
        case 'door': {
          if (o.building) { const p = new Parts(); p.add('box', 0, 0, 0, o.w, (o.building.def.H || 12) * 1.55 * 0.72, 2, P.wd1); if (o.chained) { p.add('box', 0, 5, 1.2, o.w * 1.2, 0.8, 0.6, P.st0, 0, 0, 0.6); p.add('box', 0, 5, 1.2, o.w * 1.2, 0.8, 0.6, P.st0, 0, 0, -0.6); } else p.add('box', 0, 5, 1.2, 1.4, 1.4, 0.4, P.cream2); p.place(0, o.x, o.y - 2); e.closed = meshOf(p); group.add(e.closed); }
          else if (S(o.spr)) { e.closed = mk(S(o.spr), o.x, o.y); if (o.spr === 'gateBars') { e.open = mk(S('gateBars'), o.x, o.y); e.open.position.y = 13; } }
          break;
        }
        case 'exit': if (o.spr && S(o.spr)) e.base = mk(S(o.spr), o.x, o.y - 5); break;
        case 'fire': e.base = mk(S('fireRing'), o.x, o.y); e.flame = flame(o.x, o.y, 1); group.add(e.flame); break;
        case 'brazier': e.base = mk(S('brazier'), o.x, o.y - 2); e.flame = flame(o.x, o.y - 2, 0.6, 8); group.add(e.flame); break;
        case 'npc': { e.fig = humanoid({ c0: P.st2, c1: P.st3, c2: P.tan1, face: P.cream2, leg: P.ink }); e.fig.g.position.set(o.x, 0, o.y); e.fig.g.rotation.y = Math.PI / 2; e.fig.rig.scale.y = 0.8; group.add(e.fig.g); break; }
        case 'pickup': if (o.pedestal) e.base = mk(S('pedestal'), o.x, o.y + 1); break;
        case 'tower': {
          const tex = towerTexture(), m = new T.Mesh(new T.CylinderGeometry(29, 31, 190, 28, 1, true), new T.MeshLambertMaterial({ map: tex }));
          m.position.set(o.x, 95, o.y - 2); m.castShadow = true; m.receiveShadow = true; group.add(m); occluders.push(m);
          const p = new Parts();
          for (let i = 0; i < 14; i++) { const a = (i / 14) * HL.TAU; if (HL.hash(i, 3, 3) < 0.25) continue; p.add('box', Math.cos(a) * 28, 190, Math.sin(a) * 28, 7, 5 + HL.hash(i, 4, 3) * 5, 5, P.st2, -a); }
          p.add('cyl12', 0, 186, 0, 27, 1, 27, P.ink);
          p.place(0, o.x, o.y - 2); const top = meshOf(p); group.add(top);
          e.door = new T.Mesh(new T.PlaneGeometry(10, 15), new T.MeshBasicMaterial({ color: P.ink })); e.door.position.set(o.x, 7.5, o.y - 2 + 31.2); group.add(e.door);
          e.doorLight = new T.PointLight(0xf0d8a0, 0, 70, 1.6); e.doorLight.position.set(o.x, 8, o.y + 36); group.add(e.doorLight);
          break;
        }
      }
      if (Object.keys(e).length) dyn.set(o, e);
    }
    for (const k in chunks) { const m = meshOf(chunks[k]); group.add(m); occluders.push(m); }
    return { group, dyn, occluders, buildings, w, dark: w.dark };
  }
  function glyphSprite(k, x, y, z) {
    const glyphs = ['.###./#.#.#/.###.', '..#../.###./#####', '.##../#..../.##..', '#.#.#/.###./#.#.#'];
    const c = HL.canvas(7, 5);
    glyphs[k].split('/').forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') { c.g.fillStyle = P.cream; c.g.fillRect(i + 1, j, 1, 1); } });
    const s = new T.Sprite(new T.SpriteMaterial({ map: canvasTex(c), transparent: true }));
    s.scale.set(7, 5, 1); s.position.set(x, y, z); s.renderOrder = 5;
    pendingSprites.push(s);
    return s;
  }
  let pendingSprites = [];
  function flame(x, z, s, y = 0) {
    const g = new T.Group();
    const mats = [P.lt0, P.fire, P.red1].map((c) => new T.MeshBasicMaterial({ color: c }));
    for (let i = 0; i < 5; i++) { const m = new T.Mesh(geo('cone'), mats[i % 3]); m.userData.ph = i * 1.3; g.add(m); }
    g.position.set(x, y + 1, z); g.userData.s = s;
    return g;
  }
  function animFlame(g, t) {
    const s = g.userData.s;
    g.children.forEach((m, i) => { const k = 0.6 + 0.4 * Math.sin(t * 9 + m.userData.ph); m.scale.set((2.4 - i * 0.35) * s, (5 + i * 0.6) * s * k, (2.4 - i * 0.35) * s); m.position.set(Math.sin(t * 5 + i) * 0.8 * s, 0, Math.cos(t * 4 + i) * 0.8 * s); });
  }

  // ---------------------------------------------------------------- figures
  const boxGeo = {};
  const bx = (w, h, d) => { const k = w + ',' + h + ',' + d; return boxGeo[k] || (boxGeo[k] = new T.BoxGeometry(w, h, d)); };
  function figMat(c, mats) { const m = new T.MeshLambertMaterial({ color: c, flatShading: true }); mats.push(m); return m; }
  function humanoid(look, opt = {}) {
    const g = new T.Group(), rig = new T.Group(), mats = []; g.add(rig);
    const M = (c) => figMat(c, mats), mesh = (geom, c) => { const m = new T.Mesh(geom, M(c)); m.castShadow = true; return m; };
    const s = opt.scale || 1;
    const legs = [-1, 1].map((sd) => { const piv = new T.Group(); piv.position.set(sd * 1.1, 3.4, 0); const l = mesh(bx(1.4, 3.4, 1.6), look.leg); l.position.y = -1.7; piv.add(l); rig.add(piv); return piv; });
    const body = mesh(new T.CylinderGeometry(look.plate ? 2.3 : 1.8, look.hem ? 3.2 : 2.7, 5.6, 7), look.c0); body.position.y = 6.1; rig.add(body);
    const belt = mesh(new T.CylinderGeometry(2.25, 2.35, 0.7, 7), look.c2); belt.position.y = 5.6; rig.add(belt);
    if (look.plate) { for (const sd of [-1, 1]) { const sh = mesh(bx(2, 1.6, 2.6), look.c1); sh.position.set(sd * 2.6, 8.6, 0); rig.add(sh); } }
    const head = new T.Group(); head.position.y = 10.3; rig.add(head);
    const hm = mesh(bx(2.9, 2.9, 2.9), look.helm ? P.st1 : look.c0); head.add(hm);
    const hood = mesh(bx(3.3, 1.1, 3.3), look.helm ? P.st0 : look.c1); hood.position.y = 1.4; head.add(hood);
    const face = mesh(bx(1.5, 1.6, 0.3), look.face); face.position.set(0, -0.2, 1.5); head.add(face);
    const eyes = new T.Mesh(bx(1.6, 0.5, 0.3), new T.MeshBasicMaterial({ color: P.red0 })); eyes.position.set(0, 0.1, 1.62); eyes.visible = false; head.add(eyes);
    if (look.hunch) { head.position.set(0, 9.6, 0.9); }
    if (opt.tabard) { const tb = mesh(bx(1.8, 4.6, 0.3), opt.tabard); tb.position.set(0, 6.2, 2.4); rig.add(tb); }
    if (opt.shield) { const sh = mesh(bx(0.8, 5.5, 4.2), P.st2); sh.position.set(-2.9, 6.4, 1); rig.add(sh); const boss = mesh(bx(0.4, 1, 1), P.rust); boss.position.set(-3.4, 6.4, 1); rig.add(boss); }
    const arm = new T.Group(); arm.position.set(2.2, 7.6, 0.3); rig.add(arm);
    const hand = mesh(bx(1.1, 1.1, 1.1), look.c1); arm.add(hand);
    g.scale.setScalar(s);
    return { g, rig, legs, body, head, eyes, arm, mats, weapon: null, wkind: null };
  }
  function weaponMesh(kind, mats) {
    const g = new T.Group(), M = (c) => figMat(c, mats), add = (geom, c, x, y, z) => { const m = new T.Mesh(geom, M(c)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    // chunky on purpose: anything thinner than ~1.3 units vanishes at this resolution
    if (kind === 'sword') { add(bx(1.5, 1.3, 9), P.cream2, 0, 0, 5.6); add(bx(3.4, 1.3, 1.3), P.st2, 0, 0, 0.8); add(bx(1.3, 1.3, 2), P.wd1, 0, 0, -0.4); }
    else if (kind === 'spear') { add(bx(1.3, 1.3, 16), P.wd0, 0, 0, 4.5); const tip = add(new T.ConeGeometry(1.4, 3.6, 4), P.cream, 0, 0, 14); tip.rotation.x = Math.PI / 2; }
    else if (kind === 'axe') { add(bx(1.3, 1.3, 9), P.wd1, 0, 0, 3.8); add(bx(1.4, 4.6, 3.4), P.bronze, 0, 0.8, 7.6); }
    else if (kind === 'maul') { add(bx(1.3, 1.3, 8), P.wd2, 0, 0, 3.5); add(bx(3, 3, 3.6), P.st1, 0, 0, 7.5); }
    else if (kind === 'bow') { const b = add(new T.TorusGeometry(3.4, 0.7, 3, 8, Math.PI), P.wd1, 0, 0, 1); b.rotation.set(0, Math.PI / 2, Math.PI / 2); }
    return g;
  }
  function hound(mats) {
    const g = new T.Group(), rig = new T.Group(); g.add(rig);
    const mesh = (geom, c, x, y, z) => { const m = new T.Mesh(geom, figMat(c, mats)); m.position.set(x, y, z); m.castShadow = true; rig.add(m); return m; };
    mesh(bx(3.6, 3, 8), P.red1, 0, 4.6, 0); mesh(bx(3.8, 1, 6), P.red0, 0, 6.4, -0.4);
    const head = mesh(bx(3, 3, 3.6), P.red2, 0, 6, 5); mesh(bx(1.2, 1.2, 2), P.red2, 0, 5.4, 7.4);
    const legs = [[-1.3, 2.8], [1.3, 2.8], [-1.3, -2.8], [1.3, -2.8]].map(([x, z]) => { const p = new T.Group(); p.position.set(x, 3.2, z); const l = new T.Mesh(bx(1, 3.2, 1.1), figMat(P.red3, mats)); l.position.y = -1.6; l.castShadow = true; p.add(l); rig.add(p); return p; });
    const eyes = new T.Mesh(bx(2.6, 0.5, 0.3), new T.MeshBasicMaterial({ color: P.cream })); eyes.position.set(0, 6.6, 6.9); eyes.visible = false; rig.add(eyes);
    void head;
    return { g, rig, legs, eyes, mats };
  }
  function lurker(mats) {
    const g = new T.Group(), rig = new T.Group(); g.add(rig);
    const mound = new T.Mesh(geo('ico'), figMat(P.ash4, mats)); mound.scale.set(4.5, 1.6, 3.6); mound.position.y = 0.4; g.add(mound);
    const segs = [];
    for (let i = 0; i < 6; i++) { const m = new T.Mesh(bx(2.6 - i * 0.2, 2.4, 2.6 - i * 0.2), figMat(i % 2 ? P.mo3 : P.wd2, mats)); m.castShadow = true; rig.add(m); segs.push(m); }
    const eyes = new T.Mesh(bx(2, 0.6, 0.4), new T.MeshBasicMaterial({ color: P.red0 })); rig.add(eyes);
    return { g, rig, segs, eyes, mound, mats };
  }
  function keeper(mats) {
    const g = new T.Group(), rig = new T.Group(); g.add(rig);
    const mesh = (geom, c, x, y, z, par = rig) => { const m = new T.Mesh(geom, figMat(c, mats)); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; };
    const legs = [-1, 1].map((s) => mesh(bx(4.5, 9, 5), P.ink, s * 4.5, 4.5, 0));
    mesh(bx(20, 16, 11), P.ch1, 0, 16, 0); mesh(bx(20.5, 3, 11.5), P.ch0, 0, 23.5, 0);
    for (let i = 0; i < 4; i++) mesh(bx(1, 8, 0.6), P.st3, -6 + i * 4, 15, 5.6);
    const arms = [-1, 1].map((s) => { const p = new T.Group(); p.position.set(s * 12, 22, 0); rig.add(p); mesh(bx(4.5, 13, 5), P.ch1, 0, -6, 0, p); mesh(bx(5.5, 4.5, 6), P.st3, 0, -13, 0, p); return p; });
    const head = new T.Group(); head.position.set(0, 25, 0); rig.add(head);
    const bell = new T.Mesh(geo('bell'), figMat('#7b6a4d', mats)); bell.scale.set(17, 14, 17); bell.castShadow = true; head.add(bell);
    const core = new T.Mesh(new T.SphereGeometry(2.6, 8, 6), new T.MeshBasicMaterial({ color: P.red0 })); core.position.set(0, 3, 3); head.add(core);
    const chains = [];
    for (let i = 0; i < 12; i++) { const m = mesh(bx(1.2, 1.2, 1.2), i % 2 ? P.st1 : P.st3, 0, 0.6, 0, g); chains.push(m); }
    return { g, rig, legs, arms, head, core, chains, mats };
  }
  function figFor(e) {
    const mats = [];
    let f;
    if (e === 'player') f = humanoid(HL.LOOKS.player);
    else if (e.type === 'hound') f = hound(mats);
    else if (e.type === 'lurker') f = lurker(mats);
    else if (e.type === 'keeper') f = keeper(mats);
    else f = humanoid(HL.LOOKS[e.type], { shield: e.type === 'guard', tabard: e.type === 'guard' ? P.red0 : null, scale: e.type === 'guard' ? 1.18 : 1 });
    if (!f.mats) f.mats = mats; else f.mats.push(...mats);
    const sh = new T.Mesh(new T.CircleGeometry(1, 10), new T.MeshBasicMaterial({ color: 0x140e0f, transparent: true, opacity: 0.35, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.15; sh.scale.setScalar(e !== 'player' && e.type === 'keeper' ? 14 : e !== 'player' && e.type === 'hound' ? 4.5 : 3.6); f.shadow = sh;
    return f;
  }
  function setFlash(f, on, color = P.cream) {
    if (f.flashOn === on) return; f.flashOn = on;
    for (const m of f.mats) { if (on) m.emissive.set(color); else m.emissive.setRGB(0, 0, 0); }
  }
  function equipWeapon(f, kind) {
    if (f.wkind === kind) return;
    if (f.weapon) f.arm.remove(f.weapon);
    f.wkind = kind; f.weapon = kind && kind !== 'claw' ? weaponMesh(kind, f.mats) : null;
    if (f.weapon) f.arm.add(f.weapon);
  }
  const rotFor = (a) => Math.PI / 2 - a;
  function poseHumanoid(f, o) {
    f.g.position.set(o.x, 0, o.y);
    f.g.rotation.y = rotFor(o.face);
    const sw = o.moving ? Math.sin(o.walkT * Math.PI * 2) : 0;
    f.legs[0].rotation.x = sw * 0.75; f.legs[1].rotation.x = -sw * 0.75;
    f.rig.position.y = o.moving ? Math.abs(sw) * 0.5 : 0;
    f.rig.rotation.set(0, 0, 0); f.rig.position.z = 0;
    if (o.pose === 'roll') { f.rig.rotation.x = (o.t || 0) * Math.PI * 2 * 1.4; f.rig.position.y = 2; }
    if (o.pose === 'dead') { f.rig.rotation.x = -Math.PI / 2; f.rig.position.y = 1.4; f.rig.position.z = -5; }
    if (o.lean) f.rig.rotation.x = o.lean;
    if (o.wang != null) { f.arm.rotation.set(o.wtilt != null ? o.wtilt : 0.25, o.face - o.wang, 0); if (f.weapon) f.weapon.position.z = o.thrust || 0; }
    f.eyes.visible = !!o.glint;
  }

  // ---------------------------------------------------------------- telegraphs (ground decals)
  const decalGeo = { disc: new T.CircleGeometry(1, 40), ring: new T.RingGeometry(0.9, 1, 48), line: new T.PlaneGeometry(1, 1).translate(0.5, 0, 0), arcs: {} };
  function decal(kind, arc) {
    let d = decals.find((x) => !x.used && x.kind === kind && x.arc === arc);
    if (!d) {
      const gm = kind === 'slash' ? (decalGeo.arcs['s' + arc] || (decalGeo.arcs['s' + arc] = new T.RingGeometry(0.5, 1.05, 24, 1, 0, arc))) : kind === 'arc' ? (decalGeo.arcs[arc] || (decalGeo.arcs[arc] = new T.CircleGeometry(1, 32, 0, arc))) : kind === 'arcRing' ? (decalGeo.arcs['r' + arc] || (decalGeo.arcs['r' + arc] = new T.RingGeometry(0.93, 1, 32, 1, 0, arc))) : decalGeo[kind];
      const m = new T.Mesh(gm, new T.MeshBasicMaterial({ color: P.red0, transparent: true, opacity: 0.4, depthWrite: false, side: T.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.renderOrder = 2;
      d = { kind, arc, m }; decals.push(d); scene.add(m);
    }
    d.used = true; d.m.visible = true;
    return d.m;
  }
  function drawTele(e) {
    const tl = e.tele;
    if (e.wave) { const m = decal('ring'); m.position.set(e.x, 0.5, e.y); m.scale.setScalar(Math.max(1, e.wave.r)); m.material.opacity = 0.9; m.material.color.set(P.red0); }
    if (!tl || e.dead) return;
    const q = HL.clamp(tl.q, 0, 1);
    if (tl.k === 'ring') {
      const a = decal('disc'); a.position.set(tl.x, 0.35, tl.y); a.scale.setScalar(tl.r); a.material.opacity = 0.12 + q * 0.3; a.material.color.set(P.red1);
      const b = decal('ring'); b.position.set(tl.x, 0.45, tl.y); b.scale.setScalar(tl.r); b.material.opacity = 0.8; b.material.color.set(q > 0.8 ? P.red0 : P.red1);
      const c = decal('disc'); c.position.set(tl.x, 0.4, tl.y); c.scale.setScalar(Math.max(0.5, tl.r * q)); c.material.opacity = 0.35; c.material.color.set(P.red0);
    } else if (tl.k === 'arc') {
      const a = decal('arc', tl.arc); a.position.set(tl.x, 0.35, tl.y); a.scale.setScalar(tl.r); a.rotation.set(-Math.PI / 2, 0, -(tl.a + tl.arc / 2)); a.material.opacity = 0.12 + q * 0.35; a.material.color.set(P.red1);
      const b = decal('arcRing', tl.arc); b.position.set(tl.x, 0.45, tl.y); b.scale.setScalar(tl.r); b.rotation.set(-Math.PI / 2, 0, -(tl.a + tl.arc / 2)); b.material.opacity = 0.85; b.material.color.set(P.red0);
    } else if (tl.k === 'line') {
      const a = decal('line'); let len = tl.len * Math.min(1, q * 1.5);
      for (let i = 6; i < len; i += 3) if (cur.w.sightBlocked(e.x + Math.cos(tl.a) * i, e.y - 4 + Math.sin(tl.a) * i)) { len = i; break; }
      a.position.set(e.x, 0.5, e.y); a.scale.set(len, 1.2, 1); a.rotation.set(-Math.PI / 2, 0, -tl.a); a.material.opacity = q > 0.7 ? 0.95 : 0.55; a.material.color.set(P.red0);
    } else if (tl.k === 'glow') { const b = decal('ring'); b.position.set(tl.x, 0.5, tl.y); b.scale.setScalar(10 + (q % 0.3) * 30); b.material.opacity = 0.8; b.material.color.set(P.red0); }
  }

  // ---------------------------------------------------------------- setup
  R.init = function (canvas) {
    try {
      renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    } catch (e) { return false; }
    if (!renderer.getContext()) return false;
    renderer.setPixelRatio(1); renderer.info.autoReset = false;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
    scene = new T.Scene();
    cam = new T.PerspectiveCamera(FOV, 2, 20, 3000);
    hemi = new T.HemisphereLight(0xe4ddd2, 0x3b3434, 2.1); scene.add(hemi);
    sun = new T.DirectionalLight(0xfff1df, 2.4); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = -150; sc.right = 150; sc.top = 150; sc.bottom = -150; sc.near = 10; sc.far = 900;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
    scene.add(sun, sun.target);
    lantern = new T.PointLight(0xf2c890, 0, 95, 1.3); scene.add(lantern);
    for (let i = 0; i < 6; i++) { const l = new T.PointLight(0xf0a050, 0, 80, 1.4); scene.add(l); plights.push(l); }
    // particles
    const N = 1600; ptsPos = new Float32Array(N * 3); ptsCol = new Float32Array(N * 3);
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(ptsPos, 3)); pg.setAttribute('color', new T.BufferAttribute(ptsCol, 3));
    pts = new T.Points(pg, new T.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, depthWrite: false })); pts.frustumCulled = false; pts.renderOrder = 6; scene.add(pts);
    raycaster = new T.Raycaster();
    // post pass
    rt = new T.WebGLRenderTarget(4, 4, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true });
    postMat = new T.ShaderMaterial({
      uniforms: { tD: { value: rt.texture }, res: { value: new T.Vector2(4, 4) }, time: { value: 0 }, tilt: { value: 1 }, hurt: { value: 0 }, fade: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tD; uniform vec2 res; uniform float time, tilt, hurt, fade; varying vec2 vUv;
        float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
        float bayer(vec2 a){ return b2(0.5 * a) * 0.25 + b2(a); }
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 uv = vUv;
          float blur = (smoothstep(0.66, 1.0, uv.y) * 1.0 + smoothstep(0.22, 0.0, uv.y) * 0.6) * tilt;
          vec3 c = texture2D(tD, uv).rgb;
          if (blur > 0.02) {
            vec3 a = c; float r = blur * 2.2;
            a += texture2D(tD, uv + vec2( r, 0.0) / res).rgb; a += texture2D(tD, uv + vec2(-r, 0.0) / res).rgb;
            a += texture2D(tD, uv + vec2(0.0,  r) / res).rgb; a += texture2D(tD, uv + vec2(0.0, -r) / res).rgb;
            a += texture2D(tD, uv + vec2( r,  r) * 0.7 / res).rgb; a += texture2D(tD, uv + vec2(-r, -r) * 0.7 / res).rgb;
            a += texture2D(tD, uv + vec2( r, -r) * 0.7 / res).rgb; a += texture2D(tD, uv + vec2(-r,  r) * 0.7 / res).rgb;
            c = a / 9.0;
          }
          c = pow(max(c, 0.0), vec3(1.0 / 2.2));
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          float redness = smoothstep(0.08, 0.25, c.r - max(c.g, c.b));
          c = mix(vec3(l), c, mix(0.72, 1.15, redness));
          c *= vec3(1.03, 0.995, 0.965);
          float d = bayer(gl_FragCoord.xy) - 0.5;
          c = floor(c * 22.0 + 0.5 + d * 0.9) / 22.0;
          vec2 q = abs(uv - 0.5) * 2.0;
          float v = pow(pow(q.x, 5.0) + pow(q.y, 5.0), 0.2);
          float vig = smoothstep(0.78, 1.12, v + d * 0.04);
          c *= 1.0 - vig * 0.8;
          c = mix(c, vec3(0.42, 0.07, 0.06), hurt * smoothstep(0.55, 1.05, v));
          c += (hash(gl_FragCoord.xy + floor(time * 24.0)) - 0.5) * 0.03;
          c = mix(c, vec3(0.047, 0.035, 0.04), fade);
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    postScene = new T.Scene(); postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const q = new T.Mesh(new T.PlaneGeometry(2, 2), postMat); q.frustumCulled = false; postScene.add(q);
    R.ok = true;
    return true;
  };
  R.resize = function (w, h) {
    if (!R.ok) return;
    W = w; H = h;
    renderer.setSize(w, h, false);
    rt.setSize(w, h); postMat.uniforms.res.value.set(w, h);
    cam.aspect = w / h;
    // keep about 165 units of ground on the short side of the screen
    viewH = w >= h ? 165 : 165 * (h / w) * 0.75;
    cam.updateProjectionMatrix();
  };
  R.setWorld = function (w) {
    if (!R.ok) return;
    if (cur) scene.remove(cur.group);
    pendingSprites = [];
    if (!worlds[w.id]) { cur = { group: null }; worlds[w.id] = buildWorld(w); }
    cur = worlds[w.id];
    for (const s of pendingSprites) cur.group.add(s);
    pendingSprites = [];
    scene.add(cur.group);
    for (const [, f] of figs) { scene.remove(f.g); scene.remove(f.shadow); }
    figs.clear();
    for (const [, s] of iconSprites) scene.remove(s);
    iconSprites.clear();
    if (w.dark) { scene.background = new T.Color(0x0c0909); scene.fog = new T.Fog(0x0c0909, 300, 700); hemi.intensity = 0.7; hemi.color.set(0x9a8e90); sun.intensity = 0; sun.castShadow = false; }
    else { scene.background = new T.Color(0xcdc7be); scene.fog = new T.Fog(0xcdc7be, 330, 720); hemi.intensity = 2.0; hemi.color.set(0xe4ddd2); sun.intensity = 2.5; sun.castShadow = true; }
  };
  R.preload = function (w) { if (R.ok && !worlds[w.id]) { const keep = cur; worlds[w.id] = buildWorld(w); cur = keep; for (const s of pendingSprites) worlds[w.id].group.add(s); pendingSprites = []; } };

  // ---------------------------------------------------------------- per-frame
  const iconSprites = new Map(), iconTex = {};
  function iconSprite(key, item) {
    let s = iconSprites.get(key);
    if (!s) { const t = iconTex[item] || (iconTex[item] = canvasTex(HL.ART.icons[item] || HL.ART.icons.note)); s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true })); s.scale.set(9, 9, 1); s.renderOrder = 4; scene.add(s); iconSprites.set(key, s); }
    s.userData.seen = true;
    return s;
  }
  const camT = { x: 0, y: 0, init: false };
  R.snap = () => { camT.init = false; };
  R.render = function (dt) {
    const G = HL.G, w = G.world; if (!cur || cur.w !== w) R.setWorld(w);
    const t = G.time, p = G.player;
    // camera
    let tx, ty;
    if (p) { tx = p.x + p.vx * 0.25; ty = p.y + p.vy * 0.25 - 6; } else { G.titleCam.x += dt * 9; if (G.titleCam.x > 62 * 8) G.titleCam.x = 22 * 8; tx = G.titleCam.x; ty = G.titleCam.y + 70; }
    const extH = viewH * 0.5, extW = extH * (W / H) * 1.02;
    if (w.pw > extW * 2) tx = HL.clamp(tx, extW - 10, w.pw - extW + 10); else tx = w.pw / 2;
    if (w.ph > extH * 2) ty = HL.clamp(ty, extH * 0.8, w.ph - extH * 0.9); else ty = w.ph / 2;
    if (!camT.init || !p) { camT.x = tx; camT.y = ty; camT.init = true; }
    const k = Math.min(1, dt * 6); camT.x += (tx - camT.x) * k; camT.y += (ty - camT.y) * k;
    let sx = 0, sz = 0; if (G.shake > 0.05 && G.settings.shake) { sx = (Math.random() - 0.5) * G.shake * 1.6; sz = (Math.random() - 0.5) * G.shake * 1.6; }
    const D = (viewH * Math.sin(PITCH)) / (2 * Math.tan(((FOV * Math.PI) / 180) / 2));
    cam.position.set(camT.x + sx, Math.sin(PITCH) * D, camT.y + sz + Math.cos(PITCH) * D);
    cam.lookAt(camT.x + sx, 0, camT.y + sz);
    // light
    if (!w.dark) {
      const sxp = Math.round(camT.x / 4) * 4, szp = Math.round(camT.y / 4) * 4;
      sun.position.set(sxp - 160, 300, szp - 120); sun.target.position.set(sxp, 0, szp); sun.target.updateMatrixWorld();
    }
    lantern.intensity = w.dark && p ? 160 : 0;
    if (p) lantern.position.set(p.x, 16, p.y);
    // nearest fire/brazier lights
    const ls = w.lights.map((l) => ({ l, d: HL.dist(l.x, l.y, camT.x, camT.y) })).filter((o) => o.d < 260 && (!o.l.fire || G.flags['lit:' + o.l.id])).sort((a, b) => a.d - b.d);
    plights.forEach((pl, i) => { const o = ls[i]; if (!o) { pl.intensity = 0; return; } pl.position.set(o.l.x, o.l.fire ? 8 : 14, o.l.y); pl.distance = o.l.r * 1.9; pl.intensity = (w.dark ? 90 : 40) * (1 + Math.sin(t * 9 + o.l.flick) * 0.08); });
    // buildings fade while you are inside
    for (const B of cur.buildings) {
      const f = B.b.fade;
      for (const m of [B.roof, B.front]) { if (!m) continue; const op = m === B.front ? 0.2 + 0.8 * f : f; m.material.transparent = op < 0.99; m.material.opacity = op; m.material.depthWrite = op > 0.99; m.visible = op > 0.02; m.castShadow = op > 0.5; }
    }
    // dynamic objects
    for (const [o, e] of cur.dyn) {
      if (e.closed) { const open = o.t === 'container' ? o.opened : o.t === 'roots' ? o.gone : o.open; e.closed.visible = !open; if (e.open) e.open.visible = !!open; }
      if (e.bucket) e.bucket.visible = !!G.flags.well_done;
      if (e.glyphs) e.glyphs.forEach((s, i) => (s.visible = i === o.face));
      if (e.glow) { e.glow.visible = o.charge > 0; e.glow.scale.setScalar(5 + Math.sin(t * 12) * 0.6); }
      if (e.flame) { const lit = o.t === 'brazier' || G.flags['lit:' + o.id]; e.flame.visible = !!lit; if (lit && HL.dist(o.x, o.y, camT.x, camT.y) < 260) animFlame(e.flame, t); }
      if (e.door) { const lit = G.flags['d:d_tower']; e.door.material.color.set(lit ? P.lt0 : P.ink); e.doorLight.intensity = lit ? 30 : 0; }
      if (o.t === 'pickup') { const vis = !o.taken; if (e.base) e.base.visible = true; if (vis) { const s = iconSprite(o, o.item); s.visible = true; s.position.set(o.x, (o.pedestal ? 14 : 6) + Math.sin(t * 3) * 0.8, o.y); } }
    }
    for (const o of w.objects) if (o.t === 'pickup' && !o.taken && !cur.dyn.has(o)) { const s = iconSprite(o, o.item); s.visible = true; s.position.set(o.x, 6 + Math.sin(t * 3) * 0.8, o.y); }
    for (const d of G.drops) { const s = iconSprite(d, d.item); s.visible = true; s.position.set(d.x, 5 + Math.sin(t * 4 + d.x) * 0.8, d.y); }
    for (const [key, s] of iconSprites) { if (!s.userData.seen || (key.taken) || (key.gone)) { s.visible = false; } s.userData.seen = false; }
    // figures
    const alive = new Set();
    const pose = (key, make, fn) => { let f = figs.get(key); if (!f) { f = make(); figs.set(key, f); scene.add(f.g); scene.add(f.shadow); } alive.add(key); fn(f); };
    if (p) pose('player', () => figFor('player'), (f) => {
      const wd = p.weaponDef();
      const look = HL.LOOKS[G.eq.armor] || HL.LOOKS.player;
      if (f.look !== look) { scene.remove(f.g); Object.assign(f, humanoid(look), { shadow: f.shadow, look, flashOn: null }); scene.add(f.g); }
      equipWeapon(f, wd ? wd.kind : null);
      let wang = null, thrust = 0;
      if (wd) {
        if (p.state === 'attack' && p.atk) {
          const a = p.atk, arc = a.heavy ? wd.heavy.arc : wd.arc;
          if (wd.kind === 'spear') { wang = p.face; thrust = a.phase === 'active' ? 3 : a.phase === 'wind' ? -2 : 0; }
          else if (a.phase === 'wind') wang = p.face - (arc / 2) * a.side;
          else if (a.phase === 'active') wang = p.face - (arc / 2) * a.side + arc * a.side * Math.min(1, a.pt / 0.09);
          else wang = p.face + (arc / 2) * a.side;
        } else if (p.state === 'ult') wang = p.face + t * 25;
        else if (p.chargeT > 0) wang = p.face + Math.PI * 0.8;
        else wang = p.face + 0.9;
      }
      const blink = p.inv > 0 && p.state !== 'roll' && p.state !== 'ult' && Math.floor(p.inv * 20) % 2;
      f.g.visible = !blink;
      poseHumanoid(f, { x: p.x, y: p.y, face: p.face, moving: p.walkT > 0 && p.state === 'move', walkT: p.walkT, pose: p.state === 'roll' ? 'roll' : p.state === 'dead' ? 'dead' : null, t: p.t, wang, thrust, wtilt: p.state === 'attack' ? 0.05 : 0.5 });
      setFlash(f, p.flash > 0 || (p.chargeT > 0.6 && Math.floor(t * 10) % 2 === 0));
      f.shadow.position.set(p.x, 0.15, p.y);
    });
    for (const e of G.enemies) pose(e, () => figFor(e), (f) => {
      f.shadow.position.set(e.x, 0.15, e.y); f.shadow.visible = !e.hidden && !(e.dead && e.type !== 'keeper');
      const gone = e.dead && e.deadT > 1.6 && e.type !== 'keeper';
      f.g.visible = !gone;
      setFlash(f, e.flash > 0);
      const glint = e.state === 'tele' || e.state === 'alert';
      if (e.type === 'hound') {
        f.g.position.set(e.x, 0, e.y); f.g.rotation.y = rotFor(e.face);
        const sw = Math.sin(e.walkT * Math.PI * 3) * 0.8; f.legs.forEach((l, i) => (l.rotation.x = (i % 2 ? sw : -sw) * (i < 2 ? 1 : -1)));
        f.rig.rotation.set(e.dead ? 0 : e.state === 'tele' ? 0.2 : 0, 0, e.dead ? Math.PI / 2 : 0); f.rig.position.y = e.state === 'atk' ? 3 : 0;
        f.eyes.visible = glint;
      } else if (e.type === 'lurker') {
        f.g.position.set(e.x, 0, e.y);
        const em = e.hidden ? 0 : e.state === 'emerge' ? HL.clamp(e.emerge, 0, 1) : e.dead ? 0 : 1;
        f.rig.visible = em > 0.02;
        f.segs.forEach((m, i) => { m.position.set(Math.sin(i * 0.8 + e.t * 4) * (i / 6) * 1.6, 1.2 + i * 2.2 * em, 0); });
        f.eyes.position.set(f.segs[5].position.x, 1.2 + 5 * 2.2 * em + 0.6, 1.2); f.eyes.visible = em > 0.5;
      } else if (e.type === 'keeper') {
        f.g.position.set(e.x, 0, e.y); f.g.rotation.y = rotFor(e.face);
        f.rig.rotation.x = e.dead ? -Math.PI / 2 : 0; f.rig.position.y = e.dead ? 4 : Math.sin(e.t * 2) * 0.6;
        f.arms.forEach((a) => (a.rotation.x = e.armsUp ? -2.6 : e.state === 'sweep' ? -1.2 : 0.15));
        f.core.material.color.set(e.stunned > 0 ? P.cream : e.rage ? P.fire : P.red0);
        f.head.rotation.z = e.stunned > 0 ? Math.sin(t * 14) * 0.15 : 0;
        f.chains.forEach((c, i) => { const a = e.chainA + i * 0.05 + Math.PI; c.position.set(Math.cos(a) * (8 + i * 2) * 0.6, 0.6, Math.sin(a) * (3 + i) * 0.6 - 8); });
      } else {
        let wkind = e.type === 'archer' ? 'bow' : e.type === 'guard' ? 'maul' : 'claw';
        equipWeapon(f, wkind);
        const dir = e.face;
        const wang = e.type === 'guard' ? (e.state === 'tele' ? dir + Math.PI * 0.9 : e.state === 'rec' && e.t < 0.3 ? dir : dir + 0.8) : e.type === 'archer' ? dir : dir + 0.6;
        poseHumanoid(f, { x: e.x, y: e.y, face: e.face, moving: ['chase', 'return', 'walk'].includes(e.state) || (e.state === 'idle' && e.wander && e.wander.go), walkT: e.walkT, pose: e.dead ? 'dead' : null, wang, glint, lean: e.type === 'drifter' && e.state === 'tele' ? 0.35 : e.state === 'atk' ? 0.25 : 0, wtilt: e.type === 'guard' && e.state === 'tele' ? -0.9 : 0.4 });
      }
    });
    for (const [key, f] of figs) if (!alive.has(key)) { scene.remove(f.g); scene.remove(f.shadow); figs.delete(key); }
    // telegraphs
    for (const d of decals) { d.used = false; d.m.visible = false; }
    for (const e of G.enemies) drawTele(e);
    // arrows and flasks
    let ai = 0;
    for (const s of G.shots) {
      let m = arrows[ai++];
      if (!m) { m = new T.Mesh(bx(0.6, 0.6, 5), new T.MeshBasicMaterial({ color: P.cream2 })); scene.add(m); arrows.push(m); }
      m.visible = true;
      if (s.flask) { m.material.color.set(P.fire); m.scale.set(3, 3, 0.6); m.position.set(s.cx || s.x, 4 + (s.y + 6 - (s.cy || s.y)), s.cy || s.y); }
      else { m.material.color.set(P.cream2); m.scale.set(1, 1, 1); m.position.set(s.x, 5, s.y + 5); m.rotation.y = rotFor(Math.atan2(s.vy, s.vx)); }
    }
    for (; ai < arrows.length; ai++) arrows[ai].visible = false;
    // particles
    let n = 0; const N = ptsPos.length / 3;
    const put = (x, y, z, c) => { if (n >= N) return; ptsPos[n * 3] = x; ptsPos[n * 3 + 1] = y; ptsPos[n * 3 + 2] = z; tc.set(c); ptsCol[n * 3] = tc.r; ptsCol[n * 3 + 1] = tc.g; ptsCol[n * 3 + 2] = tc.b; n++; };
    for (const f of HL.fx.list) {
      const q = f.t / f.life;
      if (f.k === 'p') put(f.x, f.z + 3, f.y, f.col);
      else if (f.k === 'd') put(f.x, 1 + q * 4, f.y, q < 0.5 ? P.ash1 : P.ash2);
      else if (f.k === 'ring') { const r = f.r * (0.3 + q * 0.7), m = Math.max(10, Math.floor(r * 1.4)); for (let i = 0; i < m; i++) { const a = (i / m) * HL.TAU; put(f.x + Math.cos(a) * r, 1, f.y + Math.sin(a) * r, f.col); } }
      else if (f.k === 'slash') {
        const arcK = Math.round(f.arc * 20) / 20, m2 = decal('slash', arcK);
        m2.position.set(f.x, 0.7, f.y + 5); m2.scale.setScalar(f.r + 2); m2.rotation.set(-Math.PI / 2, 0, -(f.a + arcK / 2));
        m2.material.color.set(P.cream); m2.material.opacity = 0.85 * (1 - q);
 const m = Math.ceil(f.arc * f.r * 1.2); for (let i = 0; i <= m; i++) { if (q > 0.5 && i / m < (q - 0.5) * 2) continue; const a = f.a - f.arc / 2 + (f.arc * i) / m; put(f.x + Math.cos(a) * f.r, 6, f.y + 5 + Math.sin(a) * f.r, q < 0.5 ? f.col : P.cream3); } }
    }
    if (!w.dark) { // drifting ash
      for (let i = 0; i < 70; i++) { const ax = ((HL.hash(i, 1, 3) * 600 + t * (8 + (i % 5))) % 600) - 300, az = ((HL.hash(i, 2, 3) * 400 + t * (4 + (i % 3))) % 400) - 200; put(camT.x + ax, 30 + HL.hash(i, 3, 3) * 50, camT.y + az, P.ash0); }
    }
    for (let i = n; i < N; i++) { ptsPos[i * 3 + 1] = -999; }
    pts.geometry.attributes.position.needsUpdate = true; pts.geometry.attributes.color.needsUpdate = true; pts.geometry.setDrawRange(0, n);
    // silhouette when the Wayfarer is hidden behind a roof, tower or trees
    R.occluded = false;
    if (p && p.state !== 'dead') {
      tv.set(p.x, 7, p.y); tv2.copy(tv).sub(cam.position); const dist = tv2.length(); tv2.normalize();
      raycaster.set(cam.position, tv2); raycaster.far = dist - 3;
      const near = cur.occluders.filter((m) => m.visible && m.geometry.boundingSphere && tv.distanceTo(m.geometry.boundingSphere.center) < m.geometry.boundingSphere.radius + 60);
      R.occluded = raycaster.intersectObjects(near, false).length > 0;
    }
    // draw
    postMat.uniforms.time.value = t; postMat.uniforms.tilt.value = w.dark ? 0.5 : 1;
    postMat.uniforms.hurt.value = Math.max(G.hurtVig || 0, p && p.hp < 30 ? 0.35 + Math.sin(t * 5) * 0.12 : 0);
    postMat.uniforms.fade.value = G.state === 'fade' ? HL.clamp(G.fadeT < 0.35 ? G.fadeT / 0.35 : 1 - (G.fadeT - 0.35) / 0.35, 0, 1) : 0;
    renderer.info.reset(); renderer.setRenderTarget(rt); renderer.render(scene, cam);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  };
  // world point -> screen buffer pixel (for text, markers, alerts)
  R.project = function (x, h, y) {
    tv.set(x, h, y).project(cam);
    return { x: ((tv.x + 1) / 2) * W, y: ((1 - tv.y) / 2) * H, behind: tv.z > 1 };
  };
  R.overlay = function (g) {
    const G = HL.G, p = G.player;
    for (const f of HL.fx.list) if (f.k === 'text') { const s = R.project(f.x, 10, f.y); HL.text(g, f.s, s.x, s.y - (f.t * 8), f.t / f.life > 0.7 ? P.cream3 : f.col, 0.5, 1, P.ink); }
    for (const e of G.enemies) {
      if (e.dead || e.hidden) continue;
      if (e.state === 'alert') { const s = R.project(e.x, e.type === 'keeper' ? 46 : 18, e.y); HL.text(g, '!', s.x, s.y - 8, P.red0, 0.5, 1, P.ink); }
      if (e.hp < e.maxhp && e.type !== 'keeper') { const s = R.project(e.x, 0, e.y), w = 10, f = Math.max(0, e.hp / e.maxhp); g.fillStyle = P.ink; g.fillRect(Math.round(s.x - w / 2), Math.round(s.y + 3), w, 2); g.fillStyle = P.red0; g.fillRect(Math.round(s.x - w / 2), Math.round(s.y + 3), Math.ceil(w * f), 2); }
      if (e.vuln > 0) { const s = R.project(e.x, 14, e.y); HL.text(g, '*', s.x, s.y - 8, P.cream, 0.5, 1, P.ink); }
    }
    if (p && R.occluded) {
      const s = R.project(p.x, 6, p.y);
      g.fillStyle = P.cream; g.globalAlpha = 0.75;
      g.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 6, 3, 9); g.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 3, 5, 4);
      g.globalAlpha = 1;
    }
    if (G.prompt && G.state === 'play') { const o = G.prompt.o, s = R.project(o.x, o.t === 'tower' || o.t === 'exit' ? 18 : 16, o.y), by = Math.round(s.y - 4 + Math.sin(G.time * 5)); g.fillStyle = P.cream; g.fillRect(Math.round(s.x) - 2, by, 5, 1); g.fillRect(Math.round(s.x) - 1, by + 1, 3, 1); g.fillRect(Math.round(s.x), by + 2, 1, 1); }
  };
  R.info = () => renderer && renderer.info.render;
  return R;
})();
