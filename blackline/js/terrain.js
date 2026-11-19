// BLACKLINE — the battlefield: height field, cover, trenches, structures, sectors, line of sight.
// World units, y points up. Pure; no DOM.
(function (root) {
  const BL = root.BL || (root.BL = {});
  const { rng, noise1, clamp, lerp, smooth } = BL;

  const STEP = 4;

  // Black Rain: a long valley country, built symmetric so neither side starts with better ground.
  // Control points for the western half (x, height); the eastern half mirrors it.
  const PROFILE = [
    [0, 128], [300, 136], [470, 120], [640, 72], [860, 96], [1080, 170], [1300, 236], [1460, 196],
    [1620, 118], [1800, 84], [2000, 128], [2180, 222], [2330, 300], [2400, 318],
  ];

  function profileAt(x) {
    for (let i = 1; i < PROFILE.length; i++) {
      if (x <= PROFILE[i][0]) {
        const [x0, h0] = PROFILE[i - 1];
        const [x1, h1] = PROFILE[i];
        return lerp(h0, h1, smooth((x - x0) / (x1 - x0)));
      }
    }
    return PROFILE[PROFILE.length - 1][1];
  }

  function createBattlefield(seed) {
    const W = 4800;
    const r = rng(seed || 7);
    const nBig = noise1((seed || 7) * 31 + 1);
    const nSmall = noise1((seed || 7) * 31 + 2);
    const N = Math.floor(W / STEP) + 1;
    const h = new Float32Array(N);
    const mid = W / 2;

    for (let i = 0; i < N; i++) {
      const x = i * STEP;
      const m = Math.min(x, W - x); // mirror
      let y = profileAt(m);
      y += nBig(m / 260) * 16 + nSmall(m / 38) * 4.5 + nSmall(m / 11 + 50) * 1.2;
      // round the central crest so the mirror leaves no spike
      const dc = Math.abs(x - mid);
      if (dc < 60) y = lerp(y, profileAt(mid - 60) + nBig((mid - 60) / 260) * 16 + 6, 0.5 * (1 - dc / 60));
      h[i] = y;
    }

    const field = {
      W, STEP, N, h, seed: seed || 7,
      cover: [],
      trenches: [],
      structures: [],
      wire: [],
      sectors: [
        { id: 'A', x: 1300, owner: -1, prog: 0 },
        { id: 'B', x: 2400, owner: -1, prog: 0 },
        { id: 'C', x: 3500, owner: -1, prog: 0 },
      ],
      bases: [200, W - 200],
    };

    const groundAt = (x) => heightAt(field, x);

    // Trenches: a notch with a flat floor and sandbags on the lip that faces the enemy.
    // face: +1 means the trench protects against fire from the east.
    function trench(x, w, face) {
      const depth = 7;
      for (let i = 0; i < N; i++) {
        const xx = i * STEP;
        const d = Math.abs(xx - x);
        if (d < w / 2 + 6) {
          const k = d < w / 2 ? 1 : 1 - (d - w / 2) / 6;
          h[i] -= depth * smooth(clamp(k, 0, 1));
        }
      }
      field.trenches.push({ x, w, face });
      field.cover.push({ x, w: w + 4, v: 0.55, kind: 'trench', side: 0, h: 0 });
      field.structures.push({ kind: 'sandbags', x: x + face * (w / 2 + 3), n: Math.round(w / 6), face });
    }
    // Western defences face east, eastern ones face west.
    [[560, 34, 1], [1395, 40, 1], [2290, 30, 1]].forEach(([x, w, f]) => {
      trench(x, w, f);
      trench(W - x, w, -f);
    });

    // Fixed structures (mirrored pairs, then the centre).
    function pair(fn) { fn(1, (x) => x); fn(-1, (x) => W - x); }
    pair((face, X) => {
      field.structures.push({ kind: 'bunker', x: X(150), face });
      field.cover.push({ x: X(150), w: 40, v: 0.6, kind: 'bunker', side: 0, h: 18 });
      field.structures.push({ kind: 'farm', x: X(1830), face, seed: r.int(1, 1e6) });
      field.cover.push({ x: X(1830), w: 46, v: 0.45, kind: 'ruin', side: 0, h: 22 });
      field.structures.push({ kind: 'mill', x: X(1040), face, seed: r.int(1, 1e6) });
      field.wire.push({ x: X(1640), w: 50 });
      field.wire.push({ x: X(880), w: 40 });
    });
    field.structures.push({ kind: 'mast', x: mid + 34 });
    field.structures.push({ kind: 'ruin', x: mid - 26, seed: r.int(1, 1e6) });
    field.cover.push({ x: mid - 26, w: 44, v: 0.45, kind: 'ruin', side: 0, h: 26 });

    // Telegraph poles along the old road, with sagging wire between them.
    for (let x = 90; x < W; x += 230 + r.range(-30, 30)) {
      if (field.structures.some((s) => Math.abs(s.x - x) < 40)) continue;
      field.structures.push({ kind: 'pole', x, lean: r.range(-0.12, 0.12) });
    }

    // Rocks and dead trees, scattered but mirrored.
    for (let k = 0; k < 26; k++) {
      const x = r.range(260, mid - 40);
      if (field.cover.some((c) => Math.abs(c.x - x) < 50)) continue;
      const size = r.range(5, 11);
      const sd = r.int(1, 1e6);
      [x, W - x].forEach((xx) => {
        field.cover.push({ x: xx, w: size * 2.2, v: 0.32, kind: 'rock', side: 0, h: size });
        field.structures.push({ kind: 'rock', x: xx, size, seed: sd });
      });
    }
    for (let k = 0; k < 16; k++) {
      const x = r.range(250, mid - 30);
      const sd = r.int(1, 1e6);
      const hgt = r.range(26, 52);
      [x, W - x].forEach((xx) => field.structures.push({ kind: 'tree', x: xx, h: hgt, seed: sd }));
    }

    field.groundAt = groundAt;
    return field;
  }

  function heightAt(field, x) {
    const f = clamp(x, 0, field.W) / field.STEP;
    const i = Math.floor(f);
    const t = f - i;
    const a = field.h[Math.min(i, field.N - 1)];
    const b = field.h[Math.min(i + 1, field.N - 1)];
    return a + (b - a) * t;
  }

  function slopeAt(field, x) {
    return (heightAt(field, x + 6) - heightAt(field, x - 6)) / 12;
  }

  // Line of sight between two points: blocked if the ground rises above the straight line.
  function los(field, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const n = Math.ceil(Math.abs(dx) / 10);
    if (n < 2) return true;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = x1 + dx * t;
      const y = y1 + (y2 - y1) * t;
      if (heightAt(field, x) > y + 0.5) return false;
    }
    return true;
  }

  // The best cover at x against fire coming from fromX.
  function coverAt(field, x, fromX) {
    let best = 0;
    let obj = null;
    const dir = Math.sign(fromX - x);
    for (const c of field.cover) {
      if (Math.abs(c.x - x) > c.w / 2) continue;
      if (c.side !== 0 && c.side !== dir) continue;
      if (c.v > best) { best = c.v; obj = c; }
    }
    return obj ? { v: best, obj } : null;
  }

  function onWire(field, x) {
    for (const w of field.wire) if (Math.abs(w.x - x) < w.w / 2) return true;
    return false;
  }

  // A crater: lower the ground a little around x. Keeps a floor so nothing digs through.
  function crater(field, x, radius, depth) {
    const i0 = Math.max(0, Math.floor((x - radius) / field.STEP));
    const i1 = Math.min(field.N - 1, Math.ceil((x + radius) / field.STEP));
    for (let i = i0; i <= i1; i++) {
      const d = Math.abs(i * field.STEP - x) / radius;
      if (d >= 1) continue;
      const k = (1 - d * d);
      field.h[i] = Math.max(20, field.h[i] - depth * k * k);
    }
  }

  BL.createBattlefield = createBattlefield;
  BL.heightAt = heightAt;
  BL.slopeAt = slopeAt;
  BL.los = los;
  BL.coverAt = coverAt;
  BL.onWire = onWire;
  BL.crater = crater;
})(typeof window !== 'undefined' ? window : globalThis);
