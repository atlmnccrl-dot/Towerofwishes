// BLACKLINE — shared helpers. Pure; runs in the browser and in Node.
(function (root) {
  const BL = root.BL || (root.BL = {});

  // Seeded RNG (mulberry32). Every random number in the sim comes from one of these.
  function rng(seed) {
    let a = seed >>> 0;
    const f = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (lo, hi) => lo + (hi - lo) * f();
    f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.sign = () => (f() < 0.5 ? -1 : 1);
    return f;
  }

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);

  // 1D value noise, smooth, for terrain and weather.
  function noise1(seed) {
    const r = rng(seed);
    const N = 512;
    const v = new Float32Array(N);
    for (let i = 0; i < N; i++) v[i] = r() * 2 - 1;
    return function (x) {
      const i = Math.floor(x);
      const f = x - i;
      const a = v[((i % N) + N) % N];
      const b = v[(((i + 1) % N) + N) % N];
      return lerp(a, b, smooth(f));
    };
  }

  BL.rng = rng;
  BL.clamp = clamp;
  BL.lerp = lerp;
  BL.smooth = smooth;
  BL.noise1 = noise1;
})(typeof window !== 'undefined' ? window : globalThis);
