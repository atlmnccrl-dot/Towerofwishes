// Weather and light: fog, the moon (shadow-casting, follows the camera), moonbeams through the
// mist, a pool of point lights handed to the nearest lamps, lamp halos, rain streaks, splashes on
// the stones, and lightning. Act II adds other weather (amb.weather: 'snow', 'sand', 'embers', 'dust'),
// a colour grade per place (amb.grade) and a slow pulse of the sky light (amb.pulse); a place that sets
// none of them is lit exactly as before.
import * as THREE from '../../vendor/three.module.min.js';
import * as T from './textures.js';

const POOL = 10; // point lights always present (fixed count = no shader recompiles)

export class Atmos {
  constructor(r) {
    this.r = r; const scene = r.scene;
    this.group = new THREE.Group(); scene.add(this.group);
    this.fogColor = new THREE.Color(0x2a3442);
    scene.fog = new THREE.Fog(this.fogColor, 72, 140);
    scene.background = new THREE.Color(0x0c1018);
    this.hemi = new THREE.HemisphereLight(0x5a6c8a, 0x10141c, 1.1); scene.add(this.hemi);
    this.amb = new THREE.AmbientLight(0x1a2438, 0.6); scene.add(this.amb);
    const moon = new THREE.DirectionalLight(0x9db4d8, 1.5);
    moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
    const sc = moon.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 90;
    moon.shadow.bias = -0.0015; moon.shadow.normalBias = 0.02;
    this.moonDir = new THREE.Vector3(0.45, 1, -0.7).normalize();
    scene.add(moon); scene.add(moon.target); this.moon = moon;
    // a soft fill from the camera side so walls facing us stay readable in the dark
    this.fill = new THREE.DirectionalLight(0x5a6c90, 0.55); this.fill.position.set(30, 22, 34); scene.add(this.fill);
    // the beam: a spotlight high up through the mist, with a visible shaft
    this.beams = [];
    // light pool
    this.pool = [];
    for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight(0xffb060, 0, 8, 2); scene.add(l); this.pool.push(l); }
    // a faint cool light that walks with the hero, so every warden reads in the dark (not only the red cloak)
    this.heroLight = new THREE.PointLight(0xb8c8ec, 5, 4.6, 1.4); scene.add(this.heroLight);
    this.sources = []; this.halos = [];
    this._rain();
    this.flashT = 0; this.nextBolt = 6 + Math.random() * 10; this.lightning = true; this.rainOn = 1;
    this.t = 0;
    // the renderer's grade as the city has it: places without amb.grade go back to it
    const P = r.post; this.gradeDef = { gain: P.gain.clone(), lift: P.lift.clone(), sat: P.saturation };
    this.weather = null; this.weatherK = 1; this.pulse = null; this.wx = null;
  }

  setLevel(amb, lights) {
    const s = this.r.scene;
    this.fogColor.set(amb.fog ?? 0x2a3442); s.fog.color = this.fogColor;
    const near = amb.fogNear ?? 76; s.fog.near = Math.min(near, 77); s.fog.far = Math.min(amb.fogFar ?? 118, s.fog.near + 40);
    s.background = this.fogColor.clone().multiplyScalar(0.55); // gaps at the map's edge melt into the mist
    this.hemi.color.set(amb.hemiSky ?? 0x5a6c8a); this.hemi.groundColor.set(amb.hemiGround ?? 0x10141c); this.hemi.intensity = (amb.hemi ?? 1.1) * 0.7;
    this.amb.color.set(amb.ambient ?? 0x1a2438); this.amb.intensity = amb.ambientI ?? 0.6;
    this.moon.color.set(amb.moonColor ?? 0x9db4d8); this.moon.intensity = (amb.moon ?? 1.5) * 1.5;
    this.fill.color.set(amb.fillColor ?? 0x8292b4); this.fill.intensity = amb.fill !== undefined ? amb.fill * 0.45 : 0.6;
    if (amb.moonDir) this.moonDir.set(...amb.moonDir).normalize();
    this.rainOn = amb.rain ?? 1; this.lightning = amb.lightning ?? true;
    // Act II: weather other than rain, the grade, the pulse
    const P = this.r.post, G = amb.grade, D = this.gradeDef;
    if (G) { P.gain.setRGB(...(G.gain || [D.gain.r, D.gain.g, D.gain.b])); P.lift.setRGB(...(G.lift || [D.lift.r, D.lift.g, D.lift.b])); P.saturation = G.sat ?? D.sat; }
    else { P.gain.copy(D.gain); P.lift.copy(D.lift); P.saturation = D.sat; }
    this.weather = amb.weather || null; this.weatherK = 1; this.pulse = amb.pulse || null; this.pulseHemi = this.hemi.intensity; this.pulseFlare = 0;
    if (this.weather) { this.rainOn = 0; this._weatherSet(this.weather); } else if (this.wx) { this.wx.a.visible = this.wx.b.visible = false; }
    // clear old halos and beams
    for (const h of this.halos) this.group.remove(h.sprite); this.halos = [];
    for (const b of this.beams) { this.r.scene.remove(b.light); this.r.scene.remove(b.light.target); this.group.remove(b.shaft); } this.beams = [];
    this.sources = lights.map((l) => ({ ...l, base: l.intensity, phase: Math.random() * 10 }));
    for (const l of this.sources) if (l.halo) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#ffd090', 32, 1.6), color: new THREE.Color(l.color).multiplyScalar(0.55), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      sp.scale.set(2.2, 2.2, 1); sp.position.set(l.x, l.y, l.z); this.group.add(sp); this.halos.push({ sprite: sp, src: l });
    }
    for (const b of amb.beams || []) this.addBeam({ ...b, intensity: (b.intensity || 60) * 1.8 });
  }

  // A moonbeam: spot light from high above with a soft visible shaft through the mist.
  addBeam({ x, z, r = 5, h = 26, from = [5, 0, -9], color = 0xa8c0e0, intensity = 60 }) {
    const L = new THREE.SpotLight(color, intensity, h * 2.2, Math.atan2(r, h) * 1.15, 0.6, 1.2);
    L.position.set(x + from[0], h, z + from[2]); L.target.position.set(x, 0, z);
    L.castShadow = false; L.shadow.mapSize.set(512, 512); L.shadow.bias = -0.002; L.shadow.camera.near = 4; L.shadow.camera.far = h * 2;
    this.r.scene.add(L); this.r.scene.add(L.target);
    // the visible shaft: an open cone, additive, brighter near the ground
    const len = Math.hypot(from[0], h, from[2]);
    const g = new THREE.CylinderGeometry(r * 0.25, r * 1.05, len, 16, 6, true);
    const cols = []; const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) / len + 0.5); const s0 = Math.min(1, t / 0.3); const a = s0 * s0 * (3 - 2 * s0) * Math.pow(1 - t, 1.2) * 1.4; cols.push(a, a, a); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.07), vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const shaft = new THREE.Mesh(g, m);
    const mid = new THREE.Vector3(x + from[0] / 2, h / 2, z + from[2] / 2); shaft.position.copy(mid);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(from[0], h, from[2]).normalize());
    this.group.add(shaft);
    this.beams.push({ light: L, shaft });
  }

  _rain() {
    const N = 650; this.rainN = N;
    const pos = new Float32Array(N * 6); this.drops = new Float32Array(N * 4); // x,y,z,speed
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.LineBasicMaterial({ color: 0x9aaac4, transparent: true, opacity: 0.27, fog: false, depthWrite: false });
    this.rain = new THREE.LineSegments(g, m); this.rain.frustumCulled = false; this.group.add(this.rain);
    for (let i = 0; i < N; i++) this._resetDrop(i, true, new THREE.Vector3());
    // splashes
    const SN = 260; this.splN = SN; this.spl = new Float32Array(SN * 4); this.splI = 0;
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SN * 3), 3));
    const sm = new THREE.PointsMaterial({ color: 0xa8b8d0, size: 1, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false, depthWrite: false });
    this.splash = new THREE.Points(sg, sm); this.splash.frustumCulled = false; this.group.add(this.splash);
    for (let i = 0; i < SN; i++) this.spl[i * 4 + 3] = 0;
  }

  _resetDrop(i, initial, c) {
    const d = this.drops; d[i * 4] = c.x + (Math.random() - 0.5) * 44; d[i * 4 + 2] = c.z + (Math.random() - 0.5) * 44;
    d[i * 4 + 1] = initial ? Math.random() * 22 : 16 + Math.random() * 8; d[i * 4 + 3] = 17 + Math.random() * 6;
  }

  // ---------------------------------------------------------------- Act II weather
  // Two point layers that live in a 44 m box round the focus and wrap: snow (fine flakes and big ones
  // drifting on the wind), sand (grains racing on a hot wind and slower dust), embers (sparks rising
  // and ash falling), dust (motes hanging in the torchlight).
  _weatherInit() {
    const mk = (n) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const m = new THREE.PointsMaterial({ size: 1, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false });
      const p = new THREE.Points(g, m); p.frustumCulled = false; p.visible = false; this.group.add(p); return p;
    };
    this.wx = { a: mk(900), b: mk(400), da: new Float32Array(900 * 6), db: new Float32Array(400 * 6) };
  }
  _weatherSet(kind) {
    if (!this.wx) this._weatherInit();
    const W = this.wx; const C = {
      snow: { a: [700, 0xdce8f8, 1, 0.85, false], b: [150, 0xf0f6ff, 2, 0.9, false], H: 18 },
      sand: { a: [900, 0xe8b070, 1, 0.55, false], b: [260, 0xb88450, 2, 0.22, false], H: 7 },
      embers: { a: [240, 0xff7a30, 1, 1, true], b: [400, 0x6a5452, 1, 0.75, false], H: 14 },
      dust: { a: [220, 0xc8a070, 1, 0.35, true], b: [0, 0, 1, 0, false], H: 5 },
    }[kind] || { a: [0, 0, 1, 0], b: [0, 0, 1, 0], H: 10 };
    W.H = C.H; W.kind = kind;
    for (const [L, d, cfg] of [[W.a, W.da, C.a], [W.b, W.db, C.b]]) {
      const [n, col, size, op, add] = cfg; L.userData.n = n; L.userData.op = op; L.visible = n > 0;
      L.material.color.setHex(col); if (kind === 'embers' && L === W.a) L.material.color.setRGB(3.0, 1.1, 0.35);
      L.material.size = size; L.material.opacity = op; L.material.blending = add ? THREE.AdditiveBlending : THREE.NormalBlending; L.material.needsUpdate = true;
      L.geometry.setDrawRange(0, n);
      for (let i = 0; i < n; i++) { d[i * 6] = (Math.random() - 0.5) * 44; d[i * 6 + 1] = Math.random() * C.H; d[i * 6 + 2] = (Math.random() - 0.5) * 44; d[i * 6 + 3] = Math.random(); d[i * 6 + 4] = Math.random() * 10; d[i * 6 + 5] = 0; }
      d.placed = false;
    }
  }
  _weatherStep(dt, focus) {
    const W = this.wx, kind = this.weather, t = this.t, H = W.H;
    const gust = kind === 'sand' ? 0.75 + 0.35 * Math.sin(t * 0.37) + 0.2 * Math.sin(t * 1.3) : 1;
    for (const [L, d, layer] of [[W.a, W.da, 0], [W.b, W.db, 1]]) {
      const n = L.userData.n; if (!n) continue; const pos = L.geometry.attributes.position.array;
      if (!d.placed) { for (let i = 0; i < n; i++) { d[i * 6] += focus.x; d[i * 6 + 2] += focus.z; } d.placed = true; }
      for (let i = 0; i < n; i++) {
        const k = i * 6; const s = d[k + 3], ph = d[k + 4]; let vx = 0, vy = 0, vz = 0;
        if (kind === 'snow') { vy = -(layer ? 1.1 : 0.8) - s * 0.8; vx = 0.7 + Math.sin(t * 0.9 + ph) * 0.6; vz = 0.25 + Math.cos(t * 0.7 + ph * 1.3) * 0.4; }
        else if (kind === 'sand') { const sp = (layer ? 3.5 : 8) + s * 4; vx = -sp * gust; vz = sp * 0.38 * gust; vy = Math.sin(t * 2 + ph) * 0.6 - 0.15; }
        else if (kind === 'embers') { if (layer === 0) { vy = 0.7 + s * 1.2; vx = Math.sin(t * 1.7 + ph) * 0.5 + 0.2; vz = Math.cos(t * 1.3 + ph) * 0.4; } else { vy = -0.35 - s * 0.5; vx = Math.sin(t * 0.8 + ph) * 0.7 + 0.25; vz = Math.cos(t * 0.6 + ph) * 0.5; } }
        else { vx = Math.sin(t * 0.3 + ph) * 0.12; vy = Math.sin(t * 0.21 + ph * 2) * 0.06 - 0.03; vz = Math.cos(t * 0.27 + ph) * 0.12; }
        d[k] += vx * dt; d[k + 1] += vy * dt; d[k + 2] += vz * dt;
        if (d[k] - focus.x > 22) d[k] -= 44; else if (d[k] - focus.x < -22) d[k] += 44;
        if (d[k + 2] - focus.z > 22) d[k + 2] -= 44; else if (d[k + 2] - focus.z < -22) d[k + 2] += 44;
        if (d[k + 1] < 0) d[k + 1] += H; else if (d[k + 1] > H) d[k + 1] -= H;
        pos[i * 3] = d[k]; pos[i * 3 + 1] = d[k + 1]; pos[i * 3 + 2] = d[k + 2];
      }
      L.geometry.attributes.position.needsUpdate = true;
      L.material.opacity = L.userData.op * this.weatherK * (kind === 'sand' && layer === 1 ? gust : 1) * (kind === 'embers' && layer === 0 ? 0.75 + 0.25 * Math.sin(t * 9) : 1);
    }
  }

  flash(strength = 1) { this.flashT = 0.5 * strength; if (this.onThunder) this.onThunder(strength); }

  update(dt, focus, groundAt) {
    this.t += dt; const r = this.r;
    // moon follows the focus; its shadow camera snapped to texels to stop shimmering
    const snap = 44 / 1024;
    const fx = Math.round(focus.x / snap) * snap, fz = Math.round(focus.z / snap) * snap;
    this.moon.target.position.set(fx, 0, fz); this.moon.position.set(fx + this.moonDir.x * 40, this.moonDir.y * 40, fz + this.moonDir.z * 40);
    this.heroLight.position.set(focus.x + 0.5, 2.6, focus.z + 0.8);
    // point light pool: nearest sources
    const srcs = this.sources;
    for (const s of srcs) s.d2 = (s.x - focus.x) ** 2 + (s.z - focus.z) ** 2;
    const near = srcs.slice().sort((a, b) => a.d2 - b.d2).slice(0, POOL);
    for (let i = 0; i < POOL; i++) {
      const l = this.pool[i]; const s = near[i];
      if (!s || s.d2 > 30 * 30) { l.intensity = 0; continue; }
      l.position.set(s.x, s.y, s.z); l.color.setHex(s.color); l.distance = s.dist || 8;
      const fl = s.flicker ? (1 + (Math.sin(this.t * 13 + s.phase) * 0.5 + Math.sin(this.t * 31 + s.phase * 2) * 0.5) * s.flicker) : 1;
      l.intensity = (s.intensity ?? 5) * fl * (s.on === false ? 0 : 1);
    }
    for (const h of this.halos) { const s = h.src; h.sprite.visible = s.on !== false; const fl = s.flicker ? 1 + Math.sin(this.t * 17 + s.phase) * s.flicker : 1; h.sprite.scale.setScalar(2.2 * fl); }
    // rain
    const d = this.drops, pos = this.rain.geometry.attributes.position.array; const wind = 0.18;
    const rainVis = this.rainOn > 0; this.rain.visible = rainVis; this.splash.visible = rainVis;
    if (rainVis) {
      for (let i = 0; i < this.rainN; i++) {
        const k = i * 4; d[k + 1] -= d[k + 3] * dt; d[k] += wind * d[k + 3] * dt * 0.3;
        const gy = groundAt ? groundAt(d[k], d[k + 2]) : 0;
        if (d[k + 1] < gy) {
          if (Math.random() < 0.5) { const j = this.splI++ % this.splN; this.spl[j * 4] = d[k]; this.spl[j * 4 + 1] = gy + 0.05; this.spl[j * 4 + 2] = d[k + 2]; this.spl[j * 4 + 3] = 0.12; }
          this._resetDrop(i, false, focus);
        }
        if (Math.abs(d[k] - focus.x) > 24 || Math.abs(d[k + 2] - focus.z) > 24) this._resetDrop(i, false, focus);
        const p = i * 6; const len = 0.55;
        pos[p] = d[k]; pos[p + 1] = d[k + 1]; pos[p + 2] = d[k + 2];
        pos[p + 3] = d[k] - wind * len; pos[p + 4] = d[k + 1] + len; pos[p + 5] = d[k + 2];
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
      const sp = this.splash.geometry.attributes.position.array;
      for (let j = 0; j < this.splN; j++) {
        const k = j * 4; if (this.spl[k + 3] > 0) { this.spl[k + 3] -= dt; sp[j * 3] = this.spl[k]; sp[j * 3 + 1] = this.spl[k + 1] + (0.12 - this.spl[k + 3]) * 0.6; sp[j * 3 + 2] = this.spl[k + 2]; }
        else { sp[j * 3 + 1] = -100; }
      }
      this.splash.geometry.attributes.position.needsUpdate = true;
      this.rain.material.opacity = 0.27 * this.rainOn;
    }
    if (this.weather && this.wx) this._weatherStep(dt, focus);
    // the slow pulse of the sky light (the Abyss breathes), with now and then a flare
    if (this.pulse && this.flashT <= 0) {
      const P = this.pulse; this.pulseFlare = Math.max(0, this.pulseFlare - dt * 1.6);
      if (Math.random() < dt / (P.flareEvery || 9)) this.pulseFlare = 1;
      this.hemi.intensity = this.pulseHemi * (1 + (P.amp ?? 0.25) * (0.5 + 0.5 * Math.sin(this.t * (P.speed ?? 0.9))) + this.pulseFlare * (P.flare ?? 0.8));
    }
    // lightning
    if (this.lightning) { this.nextBolt -= dt; if (this.nextBolt <= 0) { this.nextBolt = 9 + Math.random() * 16; this.flash(0.6 + Math.random() * 0.4); } }
    if (this.flashT > 0) {
      this.flashT -= dt; const f = Math.max(0, this.flashT) / 0.5;
      const flick = f > 0.6 ? 1 : (f > 0.45 ? 0.2 : f);
      r.post.flash = flick * 0.18; this.hemi.intensity = (this._hemiBase ?? (this._hemiBase = this.hemi.intensity)) * (1 + flick * 2.5);
    } else if (this._hemiBase !== undefined) { this.hemi.intensity = this._hemiBase; this._hemiBase = undefined; r.post.flash = 0; }
  }
}
