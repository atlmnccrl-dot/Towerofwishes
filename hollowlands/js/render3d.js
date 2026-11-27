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
        case 'container':
          if (o.spr === 'chest') {
            const pb = new Parts(); pb.add('box', 0, 0, 0, 9, 4.5, 6, P.wd1); pb.add('box', -2.5, 0, 0, 1, 4.7, 6.3, P.st2); pb.add('box', 2.5, 0, 0, 1, 4.7, 6.3, P.st2); pb.add('box', 0, 4.4, 0, 8, 0.2, 5, P.ink); pb.place(0, o.x, o.y - 2); e.base = meshOf(pb); group.add(e.base);
            const pl = new Parts(); pl.add('box', 0, 0, 0, 9.2, 2, 6.2, P.wd0); pl.add('box', -2.5, 0, 0, 1, 2.1, 6.4, P.st2); pl.add('box', 2.5, 0, 0, 1, 2.1, 6.4, P.st2); pl.add('box', 0, 0.2, 3.1, 1.6, 1.6, 0.4, P.cream2);
            for (const q of pl.list) q.m.premultiply(new T.Matrix4().makeTranslation(0, 0, 3.1));
            e.lid = new T.Group(); e.lid.position.set(o.x, 4.5, o.y - 2 - 3.1); e.lid.add(meshOf(pl)); group.add(e.lid); e.lidA = 0;
          } else if (o.spr && S(o.spr)) { e.closed = mk(S(o.spr), o.x, o.y - 2); e.open = mk(S(o.open || o.spr), o.x, o.y - 2); }
          break;
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
        case 'npc': { const lk = o.look === 'smith' ? { c0: P.wd1, c1: P.wd2, c2: P.rust, face: P.cream2, leg: P.ink, plate: true } : o.look === 'acolyte' ? HL.LOOKS.acolyte : { c0: P.st2, c1: P.st3, c2: P.tan1, face: P.cream2, leg: P.ink }; e.fig = humanoid(lk); e.fig.g.position.set(o.x, 0, o.y); e.fig.g.rotation.y = o.id === 'maren' ? Math.PI / 2 : 0; if (o.id === 'maren') e.fig.rig.scale.y = 0.8; group.add(e.fig.g); break; }
        case 'pickup':
          if (o.pedestal) e.base = mk(S('pedestal'), o.x, o.y + 1);
          if (o.shard) { e.shard = new T.Mesh(new T.OctahedronGeometry(2.2, 0), new T.MeshBasicMaterial({ color: '#9ff5ec' })); e.shard.scale.y = 1.6; group.add(e.shard); e.beam = new T.Mesh(new T.CylinderGeometry(0.5, 1.2, 60, 6, 1, true).translate(0, 30, 0), new T.MeshBasicMaterial({ color: '#7fe8e0', transparent: true, opacity: 0.35, depthWrite: false })); e.beam.position.set(o.x, 0, o.y); group.add(e.beam); }
          break;
        case 'shrine': { e.sh = shrineModel(1); e.sh.g.position.set(o.x, 0, o.y - 4); group.add(e.sh.g); occluders.push(e.sh.base); break; }
        case 'greatshrine': { e.sh = shrineModel(1.9); e.sh.g.position.set(o.x, 0, o.y - 6); group.add(e.sh.g); occluders.push(e.sh.base);
          e.beacon = new T.Mesh(new T.CylinderGeometry(4, 9, 600, 12, 1, true).translate(0, 300, 0), new T.MeshBasicMaterial({ color: '#9ff5ec', transparent: true, opacity: 0.3, depthWrite: false, side: T.DoubleSide })); e.beacon.position.set(o.x, 0, o.y - 6); group.add(e.beacon); break; }
        case 'gate': {
          const p2 = new Parts();
          if (o.kind === 'thorns') { for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.28, d = (HL.hash(i, 3, 5) - 0.5) * (o.col.w - 6); p2.add('cone', d, 0, (HL.hash(i, 4, 5) - 0.5) * (o.col.h - 2), 2 + HL.hash(i, 5, 5) * 2.5, 9 + HL.hash(i, 6, 5) * 16, 2 + HL.hash(i, 7, 5) * 2, i % 3 ? '#24161c' : '#3a1a24', a, (HL.hash(i, 8, 5) - 0.5) * 0.8, (HL.hash(i, 9, 5) - 0.5) * 0.8); } }
          if (o.kind === 'rift') { p2.add('box', 0, -0.3, 0, o.col.w, 0.5, o.col.h, '#060404'); const horiz = o.col.w > o.col.h, L = horiz ? o.col.w : o.col.h, Wd = horiz ? o.col.h : o.col.w; for (let i = 0; i < 6; i++) { const u = -L / 2 + 4 + i * (L - 8) / 5; if (horiz) { p2.add('box', u, 0, -Wd / 2 - 2, 2.5, 1, 4, P.wd2, 0.2 * (i % 2)); p2.add('box', u + 1.5, 0, Wd / 2 + 2, 2.5, 1, 4, P.wd1, -0.2); } else { p2.add('box', -Wd / 2 - 2, 0, u, 4, 1, 2.5, P.wd2, 0.2 * (i % 2)); p2.add('box', Wd / 2 + 2, 0, u + 1.5, 4, 1, 2.5, P.wd1, -0.2); } } }
          if (o.kind === 'veil') { for (let i = 0; i < 5; i++) p2.add('dodec', (i - 2) * 3.5, 4, (HL.hash(i, 1, 4) - 0.5) * 3, 4.5, 6 + HL.hash(i, 2, 4) * 4, 4, i % 2 ? P.st2 : P.st3, i); }
          if (o.kind === 'miasma') { e.fog = true; break; }
          p2.place(0, o.x, o.y); e.closed = meshOf(p2); group.add(e.closed);
          if (o.kind === 'rift') { e.open = e.closed; e.closed = null; e.rift = true; }
          break;
        }
        case 'lwell': { const p2 = new Parts(); p2.add('cyl12', 0, 0, 0, 7, 3, 7, P.st2); p2.add('cyl12', 0, 3, 0, 7.6, 0.8, 7.6, P.st1); for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; p2.add('box', Math.cos(a) * 7, 0, Math.sin(a) * 7, 1.6, 7, 1.6, P.st3); } p2.place(0, o.x, o.y - 2); e.base = meshOf(p2); group.add(e.base);
          e.water = new T.Mesh(new T.CircleGeometry(5.6, 16), new T.MeshBasicMaterial({ color: '#7fe8e0' })); e.water.rotation.x = -Math.PI / 2; e.water.position.set(o.x, 3.2, o.y - 2); group.add(e.water); break; }
        case 'cage': { const p2 = new Parts(); p2.add('box', 0, 0, 0, 12, 1, 8, P.wd2); p2.add('box', 0, 12, 0, 12, 1, 8, P.wd2); for (let i = 0; i < 6; i++) { p2.add('box', -5.5 + i * 2.2, 0, -3.6, 0.7, 12, 0.7, P.st2); p2.add('box', -5.5 + i * 2.2, 0, 3.6, 0.7, 12, 0.7, P.st2); } p2.place(0, o.x, o.y - 3); e.closed = meshOf(p2); group.add(e.closed);
          e.fig = humanoid({ c0: P.wd1, c1: P.wd2, c2: P.rust, face: P.cream2, leg: P.ink }); e.fig.g.position.set(o.x, 0, o.y - 3); e.fig.g.rotation.y = 0.3; e.fig.rig.rotation.x = 0.3; group.add(e.fig.g); break; }
        case 'pylon': { const p2 = new Parts(); p2.add('box', 0, 0, 0, 5, 3, 5, P.st3); p2.add('taper', 0, 3, 0, 1.8, 8, 1.8, P.st2); p2.place(0, o.x, o.y - 2); e.base = meshOf(p2); group.add(e.base); e.cr = new T.Mesh(new T.OctahedronGeometry(2.4, 0), new T.MeshBasicMaterial({ color: '#4a5658' })); e.cr.position.set(o.x, 15, o.y - 2); e.cr.scale.y = 1.4; group.add(e.cr); break; }
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
  // the Lumen shrine: an octagonal dais, broken slabs, an obelisk with veins of light, a floating crystal, two rune rings
  function shrineModel(scale = 1) {
    const g = new T.Group(), p = new Parts();
    p.add('cyl', 0, 0, 0, 13, 1.6, 13, P.st3); p.add('cyl', 0, 1.6, 0, 10, 1.2, 10, P.st2);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * HL.TAU + 0.3; if (i === 4) continue; p.add('box', Math.cos(a) * 15, 0, Math.sin(a) * 15, 3.5, 7 + (i % 3) * 4, 2.6, i % 2 ? P.st2 : P.st1, -a + Math.PI / 2, 0, (i % 2 ? 0.12 : -0.08)); }
    p.add('taper', 0, 2.8, 0, 3.6, 20, 3.6, '#3b3a40');
    p.add('pyr', 0, 22.8, 0, 2.6, 4, 2.6, '#3b3a40');
    const base = meshOf(p); g.add(base);
    const veinMat = new T.MeshBasicMaterial({ color: '#2a3a3a' });
    for (let i = 0; i < 4; i++) { const v = new T.Mesh(bx(0.7, 16, 0.4), veinMat); const a = (i / 4) * HL.TAU + Math.PI / 4; v.position.set(Math.cos(a) * 2.9, 11, Math.sin(a) * 2.9); v.rotation.y = -a; g.add(v); }
    const crystal = new T.Mesh(new T.OctahedronGeometry(3.4, 0), new T.MeshBasicMaterial({ color: '#4a5658' })); crystal.position.y = 33; crystal.scale.y = 1.5; g.add(crystal);
    const ringMat = new T.MeshBasicMaterial({ color: '#4a5658' });
    const rings = [7.5, 10.5].map((r, i) => { const m = new T.Mesh(new T.TorusGeometry(r, 0.45, 4, 32), ringMat); m.position.y = 18 + i * 6; m.rotation.x = Math.PI / 2 + (i ? 0.35 : -0.25); g.add(m); return m; });
    const light = new T.PointLight(0x7fe8e0, 0, 110, 1.3); light.position.y = 26; g.add(light);
    g.scale.setScalar(scale);
    return { g, crystal, rings, veinMat, ringMat, light, base };
  }
  const LC = { v0: new T.Color('#2a3a3a'), v1: new T.Color('#7fe8e0'), r0: new T.Color('#4a5658'), r1: new T.Color('#9ff5ec') };
  function animShrine(sh, awake, t, k = 1) {
    sh.awakeK = HL.lerp(sh.awakeK || 0, awake ? 1 : 0, 0.05);
    const a = sh.awakeK;
    sh.crystal.rotation.y = t * (0.4 + a * 1.6); sh.crystal.position.y = 33 + Math.sin(t * 1.6) * (0.5 + a * 1.5);
    sh.rings[0].rotation.z = t * (0.2 + a * 1.2); sh.rings[1].rotation.z = -t * (0.15 + a * 0.9);
    sh.crystal.material.color.set(a > 0.5 ? (Math.sin(t * 3) > 0 ? '#bffaf3' : '#7fe8e0') : '#4a5658');
    sh.veinMat.color.lerpColors(LC.v0, LC.v1, a);
    sh.ringMat.color.lerpColors(LC.r0, LC.r1, a);
    sh.light.intensity = a * 70 * k * (0.85 + Math.sin(t * 4) * 0.15);
  }
  R.shrineModel = shrineModel; R.animShrine = animShrine;
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
    const arm = new T.Group(); arm.position.set(2.3, 8, 0.2); rig.add(arm);
    const sleeve = mesh(bx(1.3, 1.3, 3.4), look.c1); sleeve.position.set(0, 0, 1.2); arm.add(sleeve);
    const hand = mesh(bx(1.1, 1.1, 1.1), look.face === P.ink ? '#c9bfae' : look.face); hand.position.set(0, 0, 3); arm.add(hand);
    const arm2 = new T.Group(); arm2.position.set(-2.3, 8, 0.2); rig.add(arm2);
    const sleeve2 = mesh(bx(1.3, 1.3, 3.4), look.c1); sleeve2.position.set(0, 0, 1.2); arm2.add(sleeve2);
    const hand2 = mesh(bx(1.1, 1.1, 1.1), look.face === P.ink ? '#c9bfae' : look.face); hand2.position.set(0, 0, 3); arm2.add(hand2);
    if (look.face === P.ink && !look.helm) { // the hollow: a bone mask with empty sockets and a red glow deep inside
      const mask = mesh(bx(2.3, 2.3, 0.4), '#d8cfbe'); mask.position.set(0, -0.1, 1.55); head.add(mask);
      for (const sd of [-0.55, 0.55]) { const sock = new T.Mesh(bx(0.6, 0.6, 0.2), new T.MeshBasicMaterial({ color: '#7a1a14' })); sock.position.set(sd, 0.2, 1.8); head.add(sock); }
      const jaw = mesh(bx(1.6, 0.4, 0.3), '#a89c88'); jaw.position.set(0, -0.9, 1.75); head.add(jaw);
      for (let i = 0; i < 4; i++) { const tat = mesh(bx(1, 2.4 + (i % 2), 0.3), look.c1); tat.position.set(-1.6 + i * 1.05, 2.2, (i % 2 ? 1 : -1) * 2.2); tat.rotation.x = (i % 2 ? 0.2 : -0.2); rig.add(tat); }
    }
    if (opt.horns) for (const sd of [-1, 1]) { const hn = mesh(new T.ConeGeometry(0.5, 2.6, 5), '#d8cfbe'); hn.position.set(sd * 1.3, 2, 0); hn.rotation.z = -sd * 0.7; head.add(hn); }
    let cape = null;
    if (opt.cape) { cape = new T.Group(); cape.position.set(0, 9, -1.6); rig.add(cape); const cm = mesh(bx(4.6, 6.5, 0.6), look.c1); cm.position.set(0, -3.4, -0.2); cape.add(cm); const hem = mesh(bx(4.8, 0.8, 0.7), look.c2); hem.position.set(0, -6.6, -0.2); cape.add(hem); }
    g.scale.setScalar(s);
    return { g, rig, legs, body, head, eyes, arm, arm2, cape, mats, weapon: null, weapon2: null, wkind: null, humanoid: true };
  }
  function weaponMesh(kind, mats) {
    const g = new T.Group(), M = (c) => figMat(c, mats), add = (geom, c, x, y, z) => { const m = new T.Mesh(geom, M(c)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    // chunky on purpose: anything thinner than ~1.3 units vanishes at this resolution
    if (kind === 'sword') { add(bx(1.5, 1.3, 9), P.cream2, 0, 0, 5.6); add(bx(3.4, 1.3, 1.3), P.st2, 0, 0, 0.8); add(bx(1.3, 1.3, 2), P.wd1, 0, 0, -0.4); }
    else if (kind === 'spear') { add(bx(1.3, 1.3, 16), P.wd0, 0, 0, 4.5); const tip = add(new T.ConeGeometry(1.4, 3.6, 4), P.cream, 0, 0, 14); tip.rotation.x = Math.PI / 2; }
    else if (kind === 'axe') { add(bx(1.3, 1.3, 9), P.wd1, 0, 0, 3.8); add(bx(1.4, 4.6, 3.4), P.bronze, 0, 0.8, 7.6); }
    else if (kind === 'maul') { add(bx(1.3, 1.3, 8), P.wd2, 0, 0, 3.5); add(bx(3, 3, 3.6), P.st1, 0, 0, 7.5); }
    else if (kind === 'bow') { const b = add(new T.TorusGeometry(3.6, 0.7, 3, 8, Math.PI), P.wd0, 0, 0, 1); b.rotation.set(0, Math.PI / 2, Math.PI / 2); add(bx(0.4, 0.4, 7.2), P.cream3, 0, 0, 1); }
    else if (kind === 'twin') { add(bx(1.3, 1.1, 6.5), '#e8d8d0', 0, 0, 4); add(bx(2.6, 1.1, 1.1), P.red1, 0, 0, 0.6); }
    else if (kind === 'focus') { add(bx(1.2, 1.2, 9), P.wd1, 0, 0, 3); const o = new T.Mesh(new T.IcosahedronGeometry(1.8, 0), new T.MeshBasicMaterial({ color: '#9fd0ff' })); o.position.set(0, 0, 8); g.add(o); }
    return g;
  }
  function hound(mats) {
    const g = new T.Group(), rig = new T.Group(); g.add(rig);
    const mesh = (geom, c, x, y, z) => { const m = new T.Mesh(geom, figMat(c, mats)); m.position.set(x, y, z); m.castShadow = true; rig.add(m); return m; };
    mesh(bx(3.6, 3, 8), P.red1, 0, 4.6, 0); mesh(bx(3.8, 1, 6), P.red0, 0, 6.4, -0.4);
    const head = mesh(bx(3, 3, 3.6), P.red2, 0, 6, 5); mesh(bx(1.6, 1.4, 2.6), P.red3, 0, 5.2, 7.6); mesh(bx(1.8, 0.4, 2.2), '#d8cfbe', 0, 4.5, 7.4);
    for (const sd of [-1, 1]) { const ear = mesh(new T.ConeGeometry(0.6, 1.8, 4), P.red3, sd * 1, 8.1, 4.4); ear.rotation.z = -sd * 0.3; }
    const tail = mesh(bx(0.6, 0.6, 4), P.red1, 0, 6.2, -5.4); tail.rotation.x = 0.6;
    for (let i = 0; i < 3; i++) mesh(bx(3.7, 0.4, 0.5), P.red3, 0, 5.5, -1.5 + i * 1.5);
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
  function wraith(mats) {
    const g = new T.Group(), rig = new T.Group(); g.add(rig);
    const mesh = (geom, c, x, y, z) => { const m = new T.Mesh(geom, figMat(c, mats)); m.position.set(x, y, z); m.castShadow = true; rig.add(m); return m; };
    const robe = mesh(new T.ConeGeometry(3.2, 9, 7, 1, true), '#bdb6aa', 0, 7.5, 0); robe.rotation.x = Math.PI;
    mesh(new T.ConeGeometry(2.6, 4.2, 7), '#8d8678', 0, 13.2, 0);
    const face = new T.Mesh(bx(1.6, 1.2, 0.4), new T.MeshBasicMaterial({ color: P.ink })); face.position.set(0, 12.2, 1.9); rig.add(face);
    const eyes = new T.Mesh(bx(1.4, 0.4, 0.3), new T.MeshBasicMaterial({ color: '#9fd0ff' })); eyes.position.set(0, 12.4, 2.1); rig.add(eyes);
    const lantern = new T.Mesh(geo('bell'), new T.MeshBasicMaterial({ color: '#cfe6ff' })); lantern.scale.set(2.4, 2.4, 2.4); lantern.position.set(2.6, 6, 2); rig.add(lantern);
    const legs = []; return { g, rig, legs, eyes, mats, lantern };
  }
  function figFor(e) {
    const mats = [];
    let f;
    if (e === 'player') f = humanoid(HL.LOOKS.player, { cape: true });
    else if (e.type === 'wraith') f = wraith(mats);
    else if (e.type === 'husk') { const pp = new Parts(); pp.add('box', -0.9, 0, 0, 1.2, 3, 1.3, P.red3); pp.add('box', 0.9, 0, 0, 1.2, 3, 1.3, P.red3); pp.add('taper', 0, 2.8, 0, 2.2, 5, 2, P.red1); pp.add('box', 0, 7.6, 0.5, 2.4, 2.4, 2.4, P.red2); pp.add('box', 0, 7.5, 1.75, 2, 2, 0.3, '#d8cfbe'); pp.add('box', -0.5, 8, 1.92, 0.5, 0.5, 0.1, '#7a1a14'); pp.add('box', 0.5, 8, 1.92, 0.5, 0.5, 0.1, '#7a1a14'); pp.add('box', -1.7, 4.4, 1.4, 0.9, 0.9, 3.4, P.red1, 0, -0.5); pp.add('box', 1.7, 4.4, 1.4, 0.9, 0.9, 3.4, P.red1, 0, -0.5); const mat = vcMat.clone(); mats.push(mat); const m = meshOf(pp, mat); const rig = new T.Group(); rig.add(m); const g = new T.Group(); g.add(rig); f = { g, rig, mats, husk: true }; }
    else if (e.type === 'brute') f = humanoid(HL.LOOKS.brute, { scale: 1.7, horns: true });
    else if (e.type === 'hound') f = hound(mats);
    else if (e.type === 'lurker') f = lurker(mats);
    else if (e.type === 'keeper') f = keeper(mats);
    else f = humanoid(HL.LOOKS[e.type], { shield: e.type === 'guard', tabard: e.type === 'guard' ? P.red0 : null, scale: e.type === 'guard' ? 1.18 : 1 });
    if (!f.mats) f.mats = mats; else if (f.mats !== mats) f.mats.push(...mats);
    if (e !== 'player' && e.elite) { f.g.scale.multiplyScalar(e.bossName ? 1.25 : 1.12); if (f.eyes) { f.eyes.material = f.eyes.material.clone(); f.eyes.material.color.set('#7fe8e0'); } }
    const sh = new T.Mesh(new T.CircleGeometry(1, 10), new T.MeshBasicMaterial({ color: 0x140e0f, transparent: true, opacity: 0.35, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.15; sh.scale.setScalar(e !== 'player' && e.type === 'keeper' ? 14 : e !== 'player' && e.type === 'hound' ? 4.5 : 3.6); f.shadow = sh;
    return f;
  }
  function setFlash(f, on, color = P.cream) {
    const key = on ? color : false; if (f.flashOn === key) return; f.flashOn = key;
    for (const m of f.mats) { if (on) m.emissive.set(color); else m.emissive.setRGB(0, 0, 0); }
  }
  function equipWeapon(f, kind) {
    if (f.wkind === kind) return;
    if (f.weapon) f.arm.remove(f.weapon);
    if (f.weapon2) f.arm2.remove(f.weapon2);
    f.wkind = kind; f.weapon = kind && kind !== 'claw' && kind !== 'fists' ? weaponMesh(kind, f.mats) : null; f.weapon2 = null;
    if (f.weapon) f.arm.add(f.weapon);
    if (kind === 'twin' && f.arm2) { f.weapon2 = weaponMesh('twin', f.mats); f.arm2.add(f.weapon2); }
  }
  const WLEN = { sword: 10, spear: 17, axe: 9, twin: 7.5, focus: 8, fists: 2.2, maul: 9 };
  const rotFor = (a) => Math.PI / 2 - a;
  // procedural animation: run with lean and bob, breathe when still, wind up / twist through / recover on
  // attacks, crouch to charge, flinch when struck, fall over and sink when dead
  function poseHumanoid(f, o) {
    const t = o.time || 0, spd = HL.clamp((o.speed || 0) / 52, 0, 1.8), cyc = (o.walkT || 0) * Math.PI * 2;
    const sw = o.moving ? Math.sin(cyc) : 0, amp = 0.45 + 0.35 * Math.min(1, spd);
    f.g.position.set(o.x, 0, o.y); f.g.rotation.y = rotFor(o.face);
    f.legs[0].rotation.x = sw * amp; f.legs[1].rotation.x = -sw * amp;
    f.rig.position.set(0, o.moving ? Math.abs(Math.cos(cyc)) * 0.6 * Math.min(1, spd + 0.3) : 0, 0);
    f.rig.rotation.set(o.moving ? 0.1 * Math.min(1.2, spd) : 0, 0, o.moving ? Math.sin(cyc) * 0.05 : 0);
    if (f.body) f.body.scale.y = o.moving ? 1 : 1 + Math.sin(t * 2.3 + o.x) * 0.03;
    if (o.atk) {
      const a = o.atk, sd = a.side || 1, q = HL.clamp(a.p, 0, 1); let tw = 0, ln = 0;
      if (a.phase === 'wind') { tw = -0.55 * q; ln = -0.06 * q; }
      else if (a.phase === 'active') { tw = -0.55 + 1.25 * Math.min(1, q * 1.6); ln = 0.24; f.legs[0].rotation.x = -0.55; f.legs[1].rotation.x = 0.45; }
      else { tw = 0.7 * (1 - q); ln = 0.24 * (1 - q); }
      if (!a.spin) f.rig.rotation.y = tw * sd;
      f.rig.rotation.x += ln;
    }
    if (o.charge > 0) { const k = Math.min(1, o.charge / 0.6); f.rig.position.y = -1.4 * k; f.rig.rotation.x += 0.18 * k; f.rig.rotation.y = -0.5 * k; f.legs[0].rotation.x = -0.6 * k; f.legs[1].rotation.x = 0.5 * k; }
    if (o.windup > 0) { f.rig.position.y -= 0.9 * o.windup; f.rig.rotation.x -= 0.18 * o.windup; }
    if (o.hurt > 0) { const k = Math.min(1, o.hurt); f.rig.rotation.x -= 0.5 * k; f.rig.position.z = -0.9 * k; }
    if (o.pose === 'roll') { f.rig.rotation.x = 0.62; f.rig.position.y = 0.2; f.legs[0].rotation.x = 1.0; f.legs[1].rotation.x = -0.7; }
    if (o.pose === 'dead') {
      const k = HL.clamp((o.deadT == null ? 1 : o.deadT) / 0.4, 0, 1), e = k * k;
      f.rig.rotation.set(-Math.PI / 2 * e, 0, 0.3 * e); f.rig.position.set(0, 1.4 * e, -5 * e);
      if (o.deadT > 1) f.g.position.y = -(o.deadT - 1) * 7;
    }
    if (o.lean) f.rig.rotation.x += o.lean;
    if (o.wang != null) { f.arm.rotation.set(o.wtilt != null ? o.wtilt : 0.25, o.face - o.wang, 0); if (f.weapon) f.weapon.position.z = (o.thrust || 0) + 2; if (f.arm2) f.arm2.rotation.set((o.wtilt != null ? o.wtilt : 0.25) + (f.weapon2 ? 0 : 0.9 - sw * 0.5), f.weapon2 ? -(o.face - o.wang) * 0.7 + 0.5 : 0.25, 0); }
    else if (f.arm) { f.arm.rotation.set(1.15 + sw * 0.55, 0.2, 0); if (f.arm2) f.arm2.rotation.set(1.15 - sw * 0.55, -0.2, 0); }
    if (o.raise && f.arm) { f.arm.rotation.set(-0.9, 0.5, 0); f.arm2.rotation.set(-0.9, -0.5, 0); }
    if (o.reach && f.arm) { f.arm.rotation.set(0, 0.15, 0); f.arm2.rotation.set(0, -0.15, 0); }
    if (o.lift) f.g.position.y += o.lift;
    if (f.cape) f.cape.rotation.x = -0.15 - Math.min(1.1, (o.speed || 0) / 60) - (o.atk && o.atk.phase === 'active' ? 0.4 : 0);
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
      a.position.set(e.x, 0.5, e.y); a.scale.set(len, tl.wide ? 10 : 1.2, 1); a.rotation.set(-Math.PI / 2, 0, -tl.a); a.material.opacity = tl.wide ? 0.2 + q * 0.35 : q > 0.7 ? 0.95 : 0.55; a.material.color.set(P.red0);
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
      uniforms: { tD: { value: rt.texture }, res: { value: new T.Vector2(4, 4) }, time: { value: 0 }, tilt: { value: 1 }, hurt: { value: 0 }, fade: { value: 0 }, flash: { value: 0 }, flashCol: { value: new T.Color(1, 1, 1) }, chroma: { value: 0 }, tint: { value: new T.Color(1, 1, 1) }, tintAmt: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tD; uniform vec2 res; uniform float time, tilt, hurt, fade, flash, chroma, tintAmt; uniform vec3 flashCol, tint; varying vec2 vUv;
        float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
        float bayer(vec2 a){ return b2(0.5 * a) * 0.25 + b2(a); }
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 uv = vUv;
          float blur = (smoothstep(0.66, 1.0, uv.y) * 1.0 + smoothstep(0.22, 0.0, uv.y) * 0.6) * tilt;
          vec3 c = texture2D(tD, uv).rgb;
          if (chroma > 0.01) { vec2 o = (uv - 0.5) * chroma * 6.0 / res; c.r = texture2D(tD, uv + o).r; c.b = texture2D(tD, uv - o).b; }
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
          float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
          c = mix(vec3(l), c, mix(0.72, 1.2, smoothstep(0.1, 0.28, sat)));
          c *= vec3(1.03, 0.995, 0.965);
          c = mix(c, c * pow(tint, vec3(1.0 / 2.2)) * 1.25, tintAmt);
          float d = bayer(gl_FragCoord.xy) - 0.5;
          c = floor(c * 22.0 + 0.5 + d * 0.9) / 22.0;
          vec2 q = abs(uv - 0.5) * 2.0;
          float v = pow(pow(q.x, 5.0) + pow(q.y, 5.0), 0.2);
          float vig = smoothstep(0.78, 1.12, v + d * 0.04);
          c *= 1.0 - vig * 0.8;
          c = mix(c, vec3(0.42, 0.07, 0.06), hurt * smoothstep(0.55, 1.05, v));
          c += (hash(gl_FragCoord.xy + floor(time * 24.0)) - 0.5) * 0.03;
          c = mix(c, pow(flashCol, vec3(1.0 / 2.2)), flash);
          c = mix(c, vec3(0.047, 0.035, 0.04), fade);
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    postScene = new T.Scene(); postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const q = new T.Mesh(new T.PlaneGeometry(2, 2), postMat); q.frustumCulled = false; postScene.add(q);
    R.post = { flash: 0, flashCol: new T.Color(1, 1, 1), chroma: 0, kick: 0 };
    HL.vfx.init(scene, R);
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
  // the scene is built once per map; when the game makes new map objects, point the scene at them
  function rebind(c, w) {
    const old = c.w, dyn = new Map();
    for (const [o, e] of c.dyn) { const i = old.objects.indexOf(o), n = w.objects[i]; if (n && n.t === o.t && n.id === o.id) { dyn.set(n, e); if (e.lid) { e.lidA = 0; e.wasOpen = undefined; } } }
    c.dyn = dyn;
    for (const B of c.buildings) { const i = old.buildings.indexOf(B.b); if (w.buildings[i]) B.b = w.buildings[i]; }
    c.w = w;
  }
  R.setWorld = function (w) {
    if (!R.ok) return;
    if (cur) scene.remove(cur.group);
    pendingSprites = [];
    if (!worlds[w.id]) { cur = { group: null }; worlds[w.id] = buildWorld(w); }
    else if (worlds[w.id].w !== w) rebind(worlds[w.id], w); // a new game or a load made fresh map objects
    cur = worlds[w.id];
    for (const s of pendingSprites) cur.group.add(s);
    pendingSprites = [];
    scene.add(cur.group);
    for (const [, f] of figs) { scene.remove(f.g); scene.remove(f.shadow); }
    figs.clear();
    for (const [, s] of iconSprites) scene.remove(s);
    iconSprites.clear();
    HL.vfx.setDark(w.dark);
    if (w.dark) { scene.background = new T.Color(0x0c0909); scene.fog = new T.Fog(0x0c0909, 300, 700); hemi.intensity = 0.7; hemi.color.set(0x9a8e90); sun.intensity = 0; sun.castShadow = false; }
    else { scene.background = new T.Color(0xcdc7be); scene.fog = new T.Fog(0xcdc7be, 330, 720); hemi.intensity = 2.0; hemi.color.set(0xe4ddd2); sun.intensity = 2.5; sun.castShadow = true; }
  };
  R.preload = function (w) { if (R.ok && !worlds[w.id]) { const keep = cur; worlds[w.id] = buildWorld(w); cur = keep; for (const s of pendingSprites) worlds[w.id].group.add(s); pendingSprites = []; } };

  // ---------------------------------------------------------------- per-frame
  const iconSprites = new Map(), iconTex = {};
  const RAR = { common: '#ece4d1', forged: '#7fd8ff', relic: '#c88cff', named: '#ffc95a' };
  function itemModel(id) {
    const it = HL.ITEMS[id] || {}, g = new T.Group(), inner = new T.Group(); g.add(inner);
    const L = (c) => new T.MeshLambertMaterial({ color: c, flatShading: true }), B = (c) => new T.MeshBasicMaterial({ color: c });
    const add = (geom, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geom, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; inner.add(m); return m; };
    const W = HL.WEAPONS[id];
    if (W) { const wm = weaponMesh(W.kind, []); wm.scale.setScalar(1.15); wm.rotation.set(-Math.PI / 2 + 0.25, 0, 0.3); wm.position.y = 1; inner.add(wm); if (id === 'dawnblade') wm.traverse((m) => { if (m.isMesh) m.material = B('#bffaf3'); }); }
    else switch (it.kind) {
      case 'armor': { const c = id === 'gravecloth_coat' ? '#6b5f5c' : id === 'rustbound_plate' ? P.st1 : id === 'champion_mantle' ? '#7a2828' : P.ch0; add(bx(6, 2.2, 4.5), L(c), 0, 1.1, 0); add(bx(6.2, 0.6, 1), L(id === 'champion_mantle' ? '#ffc95a' : P.rust), 0, 2.3, 0); break; }
      case 'relic': if (id === 'bell_shard') { const m = add(new T.OctahedronGeometry(2.2, 0), B('#e7c98d'), 0, 3, 0); m.scale.y = 1.5; } else add(new T.SphereGeometry(1.8, 8, 6), B('#e99a4c'), 0, 3, 0); break;
      case 'consumable':
        if (id === 'fire_flask') { add(new T.CylinderGeometry(1.5, 1.8, 3, 8), L(P.st2), 0, 1.5, 0); add(new T.CylinderGeometry(0.6, 0.6, 1.6, 6), L(P.wd1), 0, 3.6, 0); add(new T.SphereGeometry(1.2, 8, 6), B('#ff9a3a'), 0, 1.6, 0); }
        else if (id === 'dried_meat') add(bx(3.5, 1.6, 2.4), L('#6a2a22'), 0, 0.9, 0, 0, 0.4);
        else { add(new T.SphereGeometry(1.8, 8, 6), L(P.cream2), 0, 1.8, 0); add(new T.TorusGeometry(1.2, 0.25, 4, 10), L(P.mo1), 0, 3.1, 0, Math.PI / 2); }
        break;
      case 'key': { const c = id === 'gate_key' ? P.rust : id === 'bell_key' ? P.bronze : id === 'crypt_key' ? P.cream2 : id === 'lumen_shard' ? '#7fe8e0' : id === 'tide_mark' ? P.red0 : P.st0; add(new T.TorusGeometry(1.2, 0.4, 4, 10), L(c), 0, 4, 0); add(bx(0.6, 4, 0.6), L(c), 0, 1.6, 0); add(bx(1.4, 0.6, 0.5), L(c), 0.7, 0.4, 0); break; }
      case 'doc': add(bx(4, 0.4, 3), L(P.tan0), 0, 0.4, 0, 0, 0.3); break;
      default: // materials
        if (id === 'ash_herb') for (let i = 0; i < 3; i++) add(new T.ConeGeometry(0.7, 3.2, 4), L(P.mo0), (i - 1) * 0.9, 1.6, 0, 0, 0, (i - 1) * 0.3);
        else if (id === 'cloth_scrap') add(bx(3.5, 0.6, 2.6), L(P.cream3), 0, 0.3, 0, 0, 0.5);
        else if (id === 'iron_scrap') { add(bx(1.8, 1.2, 1.4), L(P.st2), -0.8, 0.6, 0, 0, 0.4); add(bx(1.4, 1, 1.2), L(P.rust), 0.9, 0.5, 0.3, 0, -0.5); }
        else if (id === 'bone_dust') add(new T.ConeGeometry(1.8, 1.5, 7), L(P.ash0), 0, 0.75, 0);
        else if (id === 'lamp_oil') { add(new T.CylinderGeometry(1.3, 1.5, 3, 8), L(P.st3), 0, 1.5, 0); add(bx(1, 0.6, 1), L(P.tan1), 0, 3.2, 0); }
        else if (id === 'raw_meat') add(bx(3, 1.6, 2.2), L(P.red1), 0, 0.8, 0, 0, 0.4);
        else add(bx(2, 2, 2), L(P.cream3), 0, 1, 0);
    }
    const col = RAR[it.rarity] || (it.kind === 'key' ? '#e7c98d' : '#ece4d1');
    const ring = new T.Mesh(new T.RingGeometry(3.4, 4.4, 24), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; g.add(ring); g.userData.ring = ring;
    if (it.rarity && it.rarity !== 'common' || it.kind === 'key' || it.kind === 'relic') { const bm = new T.Mesh(new T.CylinderGeometry(0.6, 1.4, 40, 6, 1, true).translate(0, 20, 0), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.32, depthWrite: false })); g.add(bm); g.userData.beam = bm; }
    g.userData.inner = inner; g.userData.ph = Math.random() * 6;
    return g;
  }
  function iconSprite(key, item) {
    let s = iconSprites.get(key);
    if (!s) { s = itemModel(item); scene.add(s); iconSprites.set(key, s); }
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
    let vh = viewH;
    const cs = G.state === 'cut' && !G.cutCam && G.cutShot();
    if (cs) { camT.x = cs.x; camT.y = cs.y; vh = cs.view * (viewH / 165); camT.init = false; }
    let sx = 0, sz = 0; if (G.shake > 0.05 && G.settings.shake) { sx = (Math.random() - 0.5) * G.shake * 1.6; sz = (Math.random() - 0.5) * G.shake * 1.6; }
    const D = (vh * Math.sin(PITCH)) / (2 * Math.tan(((FOV * Math.PI) / 180) / 2));
    cam.position.set(camT.x + sx, Math.sin(PITCH) * D, camT.y + sz + Math.cos(PITCH) * D);
    cam.lookAt(camT.x + sx, 0, camT.y + sz);
    const post = R.post;
    if (G.state === 'cut' && G.cutCam) { const c = G.cutCam; cam.position.set(c.px + sx, c.py, c.pz + sz); cam.lookAt(c.lx, c.ly, c.lz); camT.x = c.lx; camT.y = c.lz; }
    // third person: behind the shoulder, easing toward where you walk; drag the right side to look around
    const TP = G.settings.cam !== 'top' && p && G.state !== 'cut' && G.state !== 'title';
    R.tp = TP;
    if (R.yaw == null) R.yaw = -Math.PI / 2;
    if (G.camYawDelta) { R.yaw += G.camYawDelta; G.camYawDelta = 0; G.camManualT = 2.5; }
    if (G.camManualT > 0) G.camManualT -= dt;
    else if (TP && p.state === 'move' && Math.hypot(p.vx, p.vy) > 20 && Math.abs(HL.angDiff(R.yaw, Math.atan2(p.vy, p.vx))) < 1.9) R.yaw += HL.angDiff(R.yaw, Math.atan2(p.vy, p.vx)) * Math.min(1, dt * 0.9);
    if (G.camSnapYaw != null) { R.yaw = G.camSnapYaw; G.camSnapYaw = null; }
    G.camYaw = R.yaw;
    if (TP) {
      const fx = Math.cos(R.yaw), fy = Math.sin(R.yaw), want = w.dark ? 30 : 38;
      let dist = want;
      for (let d = 6; d <= want; d += 2) if (w.blocked(p.x - fx * d, p.y - fy * d, 2)) { dist = Math.max(8, d - 4); break; }
      R.camDist = dist < (R.camDist || want) ? dist : HL.lerp(R.camDist || want, dist, Math.min(1, dt * 3));
      const cd = R.camDist, h = 7 + cd * 0.42 + (p.lift || 0) * 0.5;
      cam.position.set(p.x - fx * cd + sx, h, p.y - fy * cd + sz);
      cam.lookAt(p.x + fx * 16, 8 + (p.lift || 0) * 0.5, p.y + fy * 16);
      camT.x = p.x + fx * 30; camT.y = p.y + fy * 30;
    }
    cam.fov = (G.state === 'cut' && G.cutCam && G.cutCam.fov ? G.cutCam.fov : TP ? 54 : FOV) * (1 - 0.06 * Math.min(1.6, post.kick));
    if (scene.fog && !w.dark) { if (TP) { scene.fog.near = 90; scene.fog.far = 330; } else { const fd = G.state === 'cut' && G.cutCam ? cam.position.distanceTo(tv.set(G.cutCam.lx, G.cutCam.ly, G.cutCam.lz)) : D; scene.fog.near = fd * 0.95 + 40; scene.fog.far = fd * 2.1 + 200; } }
    if (scene.fog && w.dark) { scene.fog.near = TP ? 60 : 300; scene.fog.far = TP ? 220 : 700; }
    cam.far = TP ? 420 : D * 3 + 400; cam.updateProjectionMatrix();
    // light
    if (!w.dark) {
      const sxp = Math.round(camT.x / 4) * 4, szp = Math.round(camT.y / 4) * 4;
      sun.position.set(sxp - 160, 300, szp - 120); sun.target.position.set(sxp, 0, szp); sun.target.updateMatrixWorld();
    }
    const dk = G.state === 'cut' ? (G.cutDark || 0) : 0;
    hemi.intensity = (w.dark ? 0.7 : 2.0) * (1 - 0.75 * dk); if (!w.dark) sun.intensity = 2.5 * (1 - 0.9 * dk);
    lantern.intensity = w.dark && p && !G.hidePlayer ? 160 : 0;
    if (p) lantern.position.set(p.x, 16, p.y);
    // nearest fire/brazier lights
    const ls = w.lights.map((l) => ({ l, d: HL.dist(l.x, l.y, camT.x, camT.y) })).filter((o) => o.d < 260 && (!o.l.fire || G.flags['lit:' + o.l.id] || G.hubStage() >= 2) && (!o.l.lamp || G.hubStage() >= 1)).sort((a, b) => a.d - b.d);
    plights.forEach((pl, i) => { const o = ls[i]; if (!o) { pl.intensity = 0; return; } pl.position.set(o.l.x, o.l.fire ? 8 : 14, o.l.y); pl.distance = o.l.r * 1.9; pl.intensity = (w.dark ? 90 : 40) * (1 + Math.sin(t * 9 + o.l.flick) * 0.08); });
    // buildings fade while you are inside
    for (const B of cur.buildings) {
      const f = B.b.fade;
      for (const m of [B.roof, B.front]) { if (!m) continue; const op = m === B.front ? 0.2 + 0.8 * f : f; m.material.transparent = op < 0.99; m.material.opacity = op; m.material.depthWrite = op > 0.99; m.visible = op > 0.02; m.castShadow = op > 0.5; }
    }
    // dynamic objects
    for (const [o, e] of cur.dyn) {
      if (e.closed) { const open = o.t === 'container' ? o.opened : o.t === 'roots' ? o.gone : o.open; e.closed.visible = !open; if (e.open) e.open.visible = !!open; if (o.t === 'container' && open && e.wasOpen === false) { HL.vfx.debris(o.x, o.y, 8, P.wd1, 0.7); HL.vfx.dust(o.x, o.y, 6); } if (o.t === 'container') e.wasOpen = !!open; }
      if (e.lid) { const open = !!o.opened, target = open ? -1.95 : 0; if (open && e.wasOpen === false) { HL.vfx.light(o.x, o.y, 0xffd27a, 70, 0.8, 8); HL.vfx.embers(o.x, o.y, 10, '#ffd27a'); HL.vfx.beam(o.x, o.y, '#ffd27a', 0.6, 2.5, 40); } e.wasOpen = open; e.lidA += (target - e.lidA) * Math.min(1, dt * (open ? 7 : 20)); e.lid.rotation.x = e.lidA; }
      if (e.bucket) e.bucket.visible = !!G.flags.well_done;
      if (e.glyphs) e.glyphs.forEach((s, i) => (s.visible = i === o.face));
      if (e.glow) { e.glow.visible = o.charge > 0; e.glow.scale.setScalar(5 + Math.sin(t * 12) * 0.6); }
      if (e.flame) { const lit = o.t === 'brazier' || G.flags['lit:' + o.id]; e.flame.visible = !!lit; if (lit && HL.dist(o.x, o.y, camT.x, camT.y) < 260) animFlame(e.flame, t); }
      if (e.door) { const lit = G.flags['d:d_tower']; e.door.material.color.set(lit ? P.lt0 : P.ink); e.doorLight.intensity = lit ? 30 : 0; }
      if (o.t === 'pickup' && o.shard) { e.shard.visible = e.beam.visible = !o.taken; e.shard.position.set(o.x, 7 + Math.sin(t * 2.4) * 1.2, o.y); e.shard.rotation.y = t * 2; e.beam.material.opacity = 0.25 + Math.sin(t * 3) * 0.08; if (!o.taken && Math.random() < 0.08 && HL.dist(o.x, o.y, camT.x, camT.y) < 200) HL.vfx.embers(o.x, o.y, 1, '#7fe8e0'); }
      else if (o.t === 'pickup') { const vis = !o.taken; if (e.base) e.base.visible = true; if (vis) { const s = iconSprite(o, o.item); s.visible = true; s.position.set(o.x, (o.pedestal ? 8.6 : 1.2) + Math.sin(t * 2.6) * 0.7, o.y); } }
      if (e.sh && HL.dist(o.x, o.y, camT.x, camT.y) < 320) { const awake = !!G.flags['shrine:' + o.id] || (G.state === 'cut' && G.cutAt && G.cutAt.x === o.x && G.cut && G.cut.id === 'shrine' && G.cut.i > 0); animShrine(e.sh, awake, t); if (awake && Math.random() < 0.25) HL.vfx.embers(o.x + (Math.random() - 0.5) * 20, o.y - 4, 1, '#7fe8e0'); }
      if (o.t === 'npc' && e.fig) e.fig.g.visible = !o.cond || !!o.cond(G.flags);
      if (o.t === 'cage') { const r = !!G.flags.rescued_tobin; e.closed.visible = !r; e.fig.g.visible = !r; }
      if (o.t === 'greatshrine') { const L = (G.flags.lumen || 0) / 100; animShrine(e.sh, L > 0.05, t, 0.6 + L * 3); e.sh.crystal.scale.setScalar(1 + L * 0.8); e.sh.crystal.scale.y = 1.5 + L; e.beacon.visible = G.hubStage() >= 3; e.beacon.material.opacity = 0.18 + Math.sin(t * 2) * 0.06 + L * 0.12; if (L > 0.05 && Math.random() < L * 0.8 && HL.dist(o.x, o.y, camT.x, camT.y) < 260) HL.vfx.embers(o.x + (Math.random() - 0.5) * 30, o.y - 6, 1, '#7fe8e0'); }
      if (o.t === 'lwell') { const used = !!G.flags['well:' + o.id]; e.water.material.color.set(used ? '#2a3a3a' : Math.sin(t * 3) > 0 ? '#9ff5ec' : '#7fe8e0'); if (!used && Math.random() < 0.15 && HL.dist(o.x, o.y, camT.x, camT.y) < 220) HL.vfx.embers(o.x, o.y - 2, 1, '#7fe8e0'); }
      if (o.t === 'gate') {
        if (e.closed) e.closed.visible = !o.open;
        if (o.kind === 'veil' && o.open && Math.random() < 0.2) HL.vfx.embers(o.x, o.y, 1, '#c8b4ff');
        if (o.kind === 'thorns' && !o.open && Math.random() < 0.1 && HL.dist(o.x, o.y, camT.x, camT.y) < 220) HL.vfx.embers(o.x + (Math.random() - 0.5) * 30, o.y, 1, '#ff4a6a');
        if (e.rift && Math.random() < 0.25 && HL.dist(o.x, o.y, camT.x, camT.y) < 220) HL.vfx.embers(o.x + (Math.random() - 0.5) * o.col.w, o.y + (Math.random() - 0.5) * o.col.h, 1, '#7fe8e0');
        if (e.fog && HL.dist(o.x, o.y, camT.x, camT.y) < 300) for (let k = 0; k < 3; k++) { const a = Math.random() * 6.28, d = Math.random() * o.r; HL.vfx.burst(o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, 2 + Math.random() * 6, Math.random() < 0.5 ? '#5a2a4a' : '#7a3a5a', 1, 8, 1.4); }
      }
      if (e.cr) { const lit = o.litT > 0; e.cr.material.color.set(lit ? (o.litT < 2 && Math.floor(t * 8) % 2 ? '#4a5658' : '#bffaf3') : '#4a5658'); e.cr.rotation.y = t * (lit ? 3 : 0.5); e.cr.position.y = 15 + Math.sin(t * 2 + o.x) * 0.8; }
    }
    for (const o of w.objects) if (o.t === 'pickup' && !o.taken && !cur.dyn.has(o) && !o.shard) { const s = iconSprite(o, o.item); s.visible = true; s.position.set(o.x, 1.2 + Math.sin(t * 2.6) * 0.7, o.y); }
    for (const d of G.drops) { const s = iconSprite(d, d.item); s.visible = true; s.position.set(d.x, 1 + Math.sin(t * 4 + d.x) * 0.5, d.y); }
    for (const [key, s] of iconSprites) {
      const gone = key.taken || key.gone || !s.userData.seen;
      if (gone && s.visible && p && (key.taken || key.gone) && s.userData.collect == null) s.userData.collect = 0; // taken: fly into the Wayfarer
      if (s.userData.collect != null) {
        s.userData.collect += dt / 0.28; const k = Math.min(1, s.userData.collect);
        s.position.lerp(tv.set(p ? p.x : s.position.x, 8, p ? p.y : s.position.z), k * 0.5); s.scale.setScalar(Math.max(0.05, 1 - k)); s.visible = k < 1;
        if (k >= 1) { s.userData.collect = null; s.visible = false; s.scale.setScalar(1); }
      } else if (gone) s.visible = false;
      if (s.visible) { s.userData.inner.rotation.y = t * 1.6 + s.userData.ph; s.userData.ring.position.y = 0.25 - s.position.y; s.userData.ring.material.opacity = 0.35 + Math.sin(t * 3 + s.userData.ph) * 0.15; if (s.userData.beam) s.userData.beam.position.y = -s.position.y; }
      s.userData.seen = false;
    }
    // figures
    const alive = new Set();
    const pose = (key, make, fn) => { let f = figs.get(key); if (!f) { f = make(); figs.set(key, f); scene.add(f.g); scene.add(f.shadow); } alive.add(key); fn(f); };
    if (p) pose('player', () => figFor('player'), (f) => {
      const wd = p.weaponDef();
      const look = HL.LOOKS[G.eq.armor] || HL.LOOKS.player;
      if (f.look !== look) { scene.remove(f.g); Object.assign(f, humanoid(look, { cape: true }), { shadow: f.shadow, look, flashOn: null }); scene.add(f.g); }
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
      let atkPose = null;
      if (p.state === 'attack' && p.atk && wd) { const a = p.atk, H = a.heavy ? wd.heavy : null, dur = a.phase === 'wind' ? (a.heavy ? (H.slam ? 0.2 : 0.06) : wd.wind) : a.phase === 'active' ? (H && H.spin ? H.spin.dur : a.heavy ? (H.lunge ? 0.2 : 0.13) : wd.active) : (a.heavy ? wd.rec + 0.14 : wd.rec * (a.fin ? 1.3 : 1)); atkPose = { phase: a.phase, p: a.pt / Math.max(0.01, dur), side: a.side, spin: !!(H && (H.spin || H.spinCut)) }; }
      if (p.state === 'exec') atkPose = { phase: p.t < 0.15 ? 'wind' : 'active', p: p.t < 0.15 ? p.t / 0.15 : (p.t - 0.15) / 0.2, side: 1 };
      poseHumanoid(f, { x: p.x, y: p.y, face: p.face, moving: p.walkT > 0 && p.state === 'move', walkT: p.walkT, pose: p.state === 'roll' ? 'roll' : p.state === 'dead' ? 'dead' : null, t: p.t, wang, thrust, wtilt: p.state === 'attack' ? 0.05 : 0.5, lift: p.lift, speed: Math.hypot(p.vx, p.vy), time: t, atk: atkPose, charge: p.chargeT, hurt: p.state === 'hurt' ? (0.2 - p.t) / 0.2 : 0, deadT: p.state === 'dead' ? p.t : null });
      f.g.visible = f.g.visible && !G.hidePlayer;
      setFlash(f, p.flash > 0 || (p.chargeT > 0.6 && Math.floor(t * 10) % 2 === 0), p.flash > 0 ? '#ff6a5a' : P.cream);
      f.shadow.position.set(p.x, 0.15, p.y);
      // blade trails while a blow is out
      const swinging = (p.state === 'attack' && p.atk && p.atk.phase !== 'rec') || p.state === 'ult';
      const wl = WLEN[wd.kind];
      if (swinging && wl && f.weapon) {
        f.g.updateMatrixWorld(true);
        const a0 = f.weapon.localToWorld(tv.set(0, 0, wl * 0.3)).clone(), b0 = f.weapon.localToWorld(tv2.set(0, 0, wl));
        HL.vfx.trail('p', a0.x, a0.y, a0.z, b0.x, b0.y, b0.z, wd.trail || P.cream);
        if (f.weapon2) { const a1 = f.weapon2.localToWorld(tv.set(0, 0, 2)).clone(), b1 = f.weapon2.localToWorld(tv2.set(0, 0, wl)); HL.vfx.trail('p2', a1.x, a1.y, a1.z, b1.x, b1.y, b1.z, wd.trail); }
      } else { HL.vfx.trailEnd('p'); HL.vfx.trailEnd('p2'); }
      // afterimages on the dash and the Veilstep
      R.ghostT = (R.ghostT || 0) - dt;
      if ((p.state === 'roll' && p.t < 0.2 && R.ghostT <= 0) || p.ghostReq) { R.ghostT = 0.035; p.ghostReq = false; HL.vfx.ghost(f, p.state === 'ult' ? '#ff6a5a' : P.cream); }
      // charging: light gathers, then a ring when the blow is ready
      if (p.chargeT > 0) { if (Math.random() < 0.7) HL.vfx.embers(p.x, p.y, 1, p.chargeT > 0.6 ? P.lt0 : P.cream2); if (p.chargeT > 0.6 && !R.chargeRing) { R.chargeRing = true; HL.vfx.ring3d(p.x, p.y, 1, 14, P.lt0, 0.35); HL.vfx.light(p.x, p.y, 0xfff0c0, 40, 0.3); } } else R.chargeRing = false;
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
        const dk = e.dead ? HL.clamp(e.deadT / 0.35, 0, 1) : 0;
        f.rig.rotation.set(e.state === 'tele' ? 0.25 : e.flash > 0 ? -0.3 : 0, 0, Math.PI / 2 * dk); f.rig.position.y = e.state === 'atk' ? 3 : e.state === 'tele' ? -1 : 0;
        if (e.dead && e.deadT > 1) f.g.position.y = -(e.deadT - 1) * 6;
        f.eyes.visible = glint;
      } else if (e.type === 'lurker') {
        f.g.position.set(e.x, 0, e.y);
        const em = e.hidden ? 0 : e.state === 'emerge' ? HL.clamp(e.emerge, 0, 1) : e.dead ? 0 : 1;
        f.rig.visible = em > 0.02;
        f.segs.forEach((m, i) => { m.position.set(Math.sin(i * 0.8 + e.t * 4) * (i / 6) * 1.6, 1.2 + i * 2.2 * em, 0); });
        f.eyes.position.set(f.segs[5].position.x, 1.2 + 5 * 2.2 * em + 0.6, 1.2); f.eyes.visible = em > 0.5;
      } else if (e.type === 'husk') {
        f.g.position.set(e.x, 0, e.y); f.g.rotation.y = rotFor(e.face);
        const dk = e.dead ? HL.clamp(e.deadT / 0.3, 0, 1) : 0;
        f.rig.position.y = e.dead ? 0 : Math.abs(Math.sin(e.walkT * Math.PI * 2)) * 0.8; f.rig.rotation.x = e.dead ? -Math.PI / 2 * dk : e.state === 'tele' ? 0.4 : e.state === 'atk' ? 0.6 : e.flash > 0 ? -0.3 : 0.15;
        if (e.dead && e.deadT > 0.8) f.g.position.y = -(e.deadT - 0.8) * 7;
      } else if (e.type === 'wraith') {
        f.g.position.set(e.x, 4 + Math.sin(e.t * 2.4) * 1.5, e.y); f.g.rotation.y = rotFor(e.face);
        f.g.visible = !gone && !e.hidden; f.rig.rotation.x = e.dead ? -1.2 : 0;
        f.lantern.material.color.set(e.state === 'tele' ? P.lt0 : '#cfe6ff'); f.eyes.material.color.set(glint ? P.lt0 : '#9fd0ff');
        if (Math.random() < 0.3 && !e.dead && !e.hidden) HL.vfx.burst(e.x, e.y, 3, '#8d9aa6', 1, 6, 0.6);
      } else if (e.type === 'keeper') {
        f.g.position.set(e.x, 0, e.y); f.g.rotation.y = rotFor(e.face);
        const kneel = e.state === 'dormant' ? 1 - (G.cutKeeperRise || 0) : 0;
        f.rig.rotation.x = e.dead ? -Math.PI / 2 : kneel * 0.5; f.rig.position.y = e.dead ? 4 : Math.sin(e.t * 2) * 0.6 - kneel * 9;
        if (!f.light) { f.light = new T.PointLight(0xff4030, 0, 70, 1.4); scene.add(f.light); }
        f.light.position.set(e.x, 30, e.y + 4); f.light.intensity = e.dead ? 0 : e.state === 'dormant' && kneel > 0.9 ? 0 : (e.rage ? 70 : 35) * (0.8 + Math.sin(t * 6) * 0.2);
        f.arms.forEach((a) => (a.rotation.x = e.armsUp ? -2.6 : e.state === 'sweep' ? -1.2 : 0.15));
        f.core.material.color.set(e.stunned > 0 ? P.cream : e.rage ? P.fire : P.red0);
        f.head.rotation.z = e.stunned > 0 ? Math.sin(t * 14) * 0.15 : 0;
        f.chains.forEach((c, i) => { const a = e.chainA + i * 0.05 + Math.PI; c.position.set(Math.cos(a) * (8 + i * 2) * 0.6, 0.6, Math.sin(a) * (3 + i) * 0.6 - 8); });
      } else {
        let wkind = e.type === 'archer' ? 'bow' : e.type === 'guard' ? 'maul' : 'claw';
        equipWeapon(f, wkind);
        const dir = e.face;
        if (e.type === 'brute') wkind = 'maul';
        const wang = e.type === 'guard' || e.type === 'brute' ? (e.state === 'tele' || e.state === 'slamT' ? dir + Math.PI * 0.9 : e.state === 'rec' && e.t < 0.3 ? dir : dir + 0.8) : e.type === 'archer' ? dir : dir + 0.6;
        if (e.type === 'brute' && e.state === 'charge' && Math.random() < 0.5) HL.vfx.ghost(f, P.red0);
        poseHumanoid(f, { x: e.x, y: e.y, face: e.face, moving: ['chase', 'return', 'walk', 'charge'].includes(e.state) || (e.state === 'idle' && e.wander && e.wander.go), walkT: e.walkT, pose: e.dead ? 'dead' : null, deadT: e.dead ? e.deadT : null, time: t, speed: e.state === 'charge' ? 120 : e.state === 'chase' ? 40 : 15,
          hurt: e.flash > 0 && !e.dead ? e.flash / 0.09 : 0, windup: e.state === 'tele' || e.state === 'slamT' ? HL.clamp(e.t / 0.6, 0, 1) : 0,
          raise: (e.type === 'drifter' && e.state === 'tele') || (e.type === 'brute' && e.state === 'slamT'), wang: e.type === 'drifter' ? null : wang, reach: e.type === 'drifter' && e.state === 'atk', glint, lean: e.type === 'drifter' && e.state === 'tele' ? -0.2 : e.state === 'atk' ? 0.35 : e.state === 'charge' ? 0.45 : e.type === 'brute' && e.state === 'tele' ? 0.3 : 0, wtilt: e.type === 'guard' && e.state === 'tele' ? -0.9 : 0.4 });
      }
    });
    for (const [key, f] of figs) if (!alive.has(key)) { scene.remove(f.g); scene.remove(f.shadow); figs.delete(key); }
    // your lost ash, waiting where you fell
    if (!R.ashPile) { R.ashPile = new T.Group(); const pile = new T.Mesh(new T.ConeGeometry(4, 3, 7), new T.MeshLambertMaterial({ color: '#4a3030', flatShading: true })); pile.position.y = 1.5; R.ashPile.add(pile); const bm = new T.Mesh(new T.CylinderGeometry(1, 2.4, 90, 8, 1, true).translate(0, 45, 0), new T.MeshBasicMaterial({ color: '#ff6a4a', transparent: true, opacity: 0.35, depthWrite: false })); R.ashPile.add(bm); scene.add(R.ashPile); }
    const ad = G.flags.ashDrop; R.ashPile.visible = !!(ad && ad.map === w.id);
    if (R.ashPile.visible) { R.ashPile.position.set(ad.x, 0, ad.y); if (Math.random() < 0.3) HL.vfx.embers(ad.x, ad.y, 1, '#ff8a6a'); }
    if (w.id === 'ashwick' && G.hubStage() >= 1 && Math.random() < 0.3) for (const l of w.lights) if (l.lamp && HL.dist(l.x, l.y, camT.x, camT.y) < 200 && Math.random() < 0.1) HL.vfx.embers(l.x, l.y + 10, 1, '#ffd27a');
    // the trial's wall of light
    if (!R.barrier) { R.barrier = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 48, 1, true).translate(0, 0.5, 0), new T.MeshBasicMaterial({ color: '#7fe8e0', transparent: true, opacity: 0.3, depthWrite: false, side: T.DoubleSide })); scene.add(R.barrier); }
    const tr = G.trial; R.barrier.visible = !!tr && G.state !== 'cut';
    if (tr) { R.barrier.position.set(tr.cx, 0, tr.cy); R.barrier.scale.set(tr.r, 26 + Math.sin(t * 3) * 2, tr.r); R.barrier.material.opacity = 0.22 + Math.sin(t * 5) * 0.06; if (Math.random() < 0.5) { const a = Math.random() * HL.TAU; HL.vfx.embers(tr.cx + Math.cos(a) * tr.r, tr.cy + Math.sin(a) * tr.r, 1, '#7fe8e0'); } }
    if (!R.wardMesh) { R.wardMesh = new T.Mesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial({ color: '#7fe8e0', transparent: true, opacity: 0.2, depthWrite: false, wireframe: true })); scene.add(R.wardMesh); }
    R.wardMesh.visible = !!(p && p.ward && !G.hidePlayer);
    if (p && p.ward) { R.wardMesh.position.set(p.x, 7 + (p.lift || 0), p.y); R.wardMesh.scale.setScalar(9 + Math.sin(t * 4) * 0.4); R.wardMesh.rotation.y = t; }
    for (const e of G.enemies) if (e.elite && !e.dead && !e.hidden && Math.random() < 0.35) HL.vfx.embers(e.x, e.y, 1, '#7fe8e0');
    // telegraphs
    for (const d of decals) { d.used = false; d.m.visible = false; }
    for (const e of G.enemies) if (p && HL.Epic.executable(e) && HL.dist(p.x, p.y, e.x, e.y) < 80) { const m = decal('ring'); m.position.set(e.x, 0.55, e.y); m.scale.setScalar(e.r + 6 + Math.sin(t * 8)); m.material.color.set('#ff5050'); m.material.opacity = 0.85; }
    for (const e of G.enemies) { drawTele(e); if (e.teles) { const keep = e.tele; for (const tt of e.teles) { e.tele = tt; drawTele(e); } e.tele = keep; } }
    if (p && p.holdT >= 0 && (p.aimA != null || p.chargeT > 0)) {
      const wd = p.weaponDef(), heavy = p.chargeT > 0.05, arc = Math.max(0.5, heavy ? wd.heavy.arc : wd.arc), reach = heavy ? wd.heavy.reach : wd.reach, a = p.aimA != null ? p.aimA : p.face;
      const arcK = Math.round(arc * 20) / 20, m = decal('slash', arcK);
      m.position.set(p.x, 0.6, p.y); m.scale.setScalar(reach + 2); m.rotation.set(-Math.PI / 2, 0, -(a + arcK / 2));
      m.material.color.set(heavy ? P.lt0 : P.cream); m.material.opacity = heavy ? 0.45 + Math.min(0.4, p.chargeT) : 0.3;
      const l = decal('line'); l.position.set(p.x, 0.65, p.y); l.scale.set(reach + 10, 1, 1); l.rotation.set(-Math.PI / 2, 0, -a); l.material.color.set(P.cream); l.material.opacity = 0.5;
    }
    // arrows and flasks
    let ai = 0;
    for (const s of G.pshots) HL.vfx.orb(s.x, s.y, 6, s.col, s.size);
    for (const s of G.shots) {
      if (s.orb) { HL.vfx.orb(s.x, s.y + 5, 6, s.col, 6); continue; }
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
      else if (f.k === 'ring') { if (!f.v3) { f.v3 = true; HL.vfx.ring3d(f.x, f.y, 0.6, f.r, f.col, f.life); } }
      else if (f.k === 'slash' && R.tp) { /* the blade's own trail draws the swing */ }
      else if (f.k === 'slash') {
        const arcK = Math.round(f.arc * 20) / 20, m2 = decal('slash', arcK);
        m2.position.set(f.x, 0.7, f.y + 5); m2.scale.setScalar(f.r + 2); m2.rotation.set(-Math.PI / 2, 0, -(f.a + arcK / 2));
        m2.material.color.set(P.cream); m2.material.opacity = 0.85 * (1 - q);
 const m = Math.ceil(f.arc * f.r * 1.2); for (let i = 0; i <= m; i++) { if (q > 0.5 && i / m < (q - 0.5) * 2) continue; const a = f.a - f.arc / 2 + (f.arc * i) / m; put(f.x + Math.cos(a) * f.r, 6, f.y + 5 + Math.sin(a) * f.r, q < 0.5 ? f.col : P.cream3); } }
    }
    if (!w.dark) { // drifting ash
      for (let i = 0; i < (R.tp ? 28 : 70); i++) { const ax = ((HL.hash(i, 1, 3) * 600 + t * (8 + (i % 5))) % 600) - 300, az = ((HL.hash(i, 2, 3) * 400 + t * (4 + (i % 3))) % 400) - 200; put(camT.x + ax, 30 + HL.hash(i, 3, 3) * 50, camT.y + az, P.ash0); }
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
    // effects
    HL.vfx.attn(R.tp);
    HL.vfx.update(dt * (G.slowT > 0 && G.state === 'play' ? G.slowScale || 0.3 : 1));
    poseCutActors(t);
    post.flash = Math.max(0, post.flash - dt * 2.6); post.chroma = Math.max(0, post.chroma - dt * 2.4); post.kick = Math.max(0, post.kick - dt * 4);
    postMat.uniforms.flash.value = Math.min(0.9, post.flash); postMat.uniforms.flashCol.value.copy(post.flashCol); postMat.uniforms.chroma.value = post.chroma;
    // draw
    postMat.uniforms.time.value = t; postMat.uniforms.tilt.value = R.tp ? 0 : w.dark ? 0.5 : 1;
    postMat.uniforms.hurt.value = Math.max(G.hurtVig || 0, p && p.hp < 30 ? 0.35 + Math.sin(t * 5) * 0.12 : 0);
    postMat.uniforms.fade.value = G.state === 'fade' ? HL.clamp(G.fadeT < 0.35 ? G.fadeT / 0.35 : 1 - (G.fadeT - 0.35) / 0.35, 0, 1) : G.state === 'cut' ? (G.cutFade || 0) : 0;
    const gr = G.state === 'cut' ? G.cutGrade : G.tide && G.tide.active ? ['#ff7a6a', 0.2] : w.id === 'ashwick' && G.hubStage() >= 5 && p && p.x < 70 * 8 ? ['#ffe0a8', 0.14] : null; postMat.uniforms.tintAmt.value = gr ? gr[1] : 0; if (gr) postMat.uniforms.tint.value.set(gr[0]);
    renderer.info.reset(); renderer.setRenderTarget(rt); renderer.render(scene, cam);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  };
  // cutscene actors: figures and props a cinematic places in the world
  const actorFigs = new Map();
  function bellProp() {
    const g = new T.Group(), piv = new T.Group(); piv.position.y = 0; g.add(piv);
    const bell = new T.Mesh(geo('bell'), new T.MeshLambertMaterial({ color: P.bronze, flatShading: true })); bell.scale.set(22, 20, 22); bell.position.y = -21; bell.castShadow = true; piv.add(bell);
    const yoke = new T.Mesh(bx(30, 3, 4), new T.MeshLambertMaterial({ color: P.wd2 })); yoke.position.y = 1; g.add(yoke);
    const clap = new T.Mesh(new T.SphereGeometry(2.4, 6, 4), new T.MeshLambertMaterial({ color: P.st3 })); clap.position.y = -19; piv.add(clap);
    return { g, piv, bell };
  }
  function poseCutActors(t) {
    const G = HL.G, list = G.state === 'cut' ? G.cutActors : [];
    const alive = new Set();
    for (const a of list) {
      alive.add(a);
      let f = actorFigs.get(a);
      if (!f) { f = a.prop === 'shrine' ? shrineModel(a.scale || 3) : a.prop === 'bell' ? bellProp() : figFor(a.type === 'player' ? 'player' : { type: a.type }); actorFigs.set(a, f); scene.add(f.g); if (f.shadow) scene.add(f.shadow); if (a.type === 'player') equipWeapon(f, a.weapon || null); else if (a.type === 'archer') equipWeapon(f, 'bow'); }
      if (a.prop === 'bell') { f.g.position.set(a.x, a.h, a.y); f.piv.rotation.z = a.rot || 0; continue; }
      if (a.prop === 'shrine') { f.g.position.set(a.x, 0, a.y); animShrine(f, a.awake !== false, t, a.k == null ? 3 : a.k); f.g.visible = !a.hidden; if (a.broken) { f.crystal.visible = false; f.light.intensity = 0; } continue; }
      const rise = a.rise == null ? 1 : a.rise;
      if (f.legs && f.arm) poseHumanoid(f, { x: a.x, y: a.y, face: a.face || 0, moving: !!a.moving, walkT: a.walkT || 0, pose: a.pose, wang: a.face + 0.8, glint: a.glint, lean: a.lean });
      else { f.g.position.set(a.x, 0, a.y); f.g.rotation.y = rotFor(a.face || 0); }
      if (a.kneel && f.rig) { f.rig.position.y = -2.6; f.rig.rotation.x = 0.4; f.legs.forEach((l) => (l.rotation.x = -1.2)); }
      if (a.getUp != null && f.rig) { const k = HL.clamp(a.getUp, 0, 1); f.rig.rotation.x = -Math.PI / 2 * (1 - k); f.rig.position.y = 1.4 * (1 - k); f.rig.position.z = -5 * (1 - k); }
      f.g.position.y = -(1 - rise) * 15;
      if (f.eyes) f.eyes.visible = !!a.glint;
      if (f.shadow) { f.shadow.position.set(a.x, 0.15, a.y); f.shadow.visible = rise > 0.6; }
    }
    for (const [a, f] of actorFigs) if (!alive.has(a)) { scene.remove(f.g); if (f.shadow) scene.remove(f.shadow); actorFigs.delete(a); }
  }
  // world point -> screen buffer pixel (for text, markers, alerts)
  R.project = function (x, h, y) {
    tv.set(x, h, y).project(cam);
    return { x: ((tv.x + 1) / 2) * W, y: ((1 - tv.y) / 2) * H, behind: tv.z > 1 };
  };
  R.overlay = function (g) {
    const G = HL.G, p = G.player;
    if (!R.tp) for (const f of HL.fx.list) if (f.k === 'text') { const s = R.project(f.x, 10, f.y); if (s.behind) continue; HL.text(g, f.s, s.x, s.y - (f.t * 8), f.t / f.life > 0.7 ? P.cream3 : f.col, 0.5, 1, P.ink); }
    for (const e of G.enemies) {
      if (e.dead || e.hidden) continue;
      if (e.state === 'alert' && !R.tp) { const s = R.project(e.x, e.type === 'keeper' ? 46 : 18, e.y); HL.text(g, '!', s.x, s.y - 8, P.red0, 0.5, 1, P.ink); }
      if (e.hp < e.maxhp && e.type !== 'keeper') { const s = R.project(e.x, R.tp ? (e.type === 'brute' ? 24 : 15) : 0, e.y); if (s.behind) continue; const w = 10, f = Math.max(0, e.hp / e.maxhp); g.fillStyle = P.ink; g.fillRect(Math.round(s.x - w / 2), Math.round(s.y + 3), w, 2); g.fillStyle = P.red0; g.fillRect(Math.round(s.x - w / 2), Math.round(s.y + 3), Math.ceil(w * f), 2); }


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
