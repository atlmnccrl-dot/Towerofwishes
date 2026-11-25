// Frame-exact capture of the real game for trailers. The page runs on a virtual clock: every captured frame
// advances exactly 1/60 s, whatever the machine's speed. The game's own synthesised sound is rendered on an
// OfflineAudioContext that reads the same clock, so picture and sound line up.
//   NODE_PATH=$(npm root -g) node cap.js <shot.js> <outdir> [base=http://localhost:8791/bellmourn/]
// A shot module exports { w, h, targetH?, query, dur, warm?, hud?, music?, setup(T)?, pre(T, t, k)?, post(T, t, k)? }.
// setup/pre/post run in the page (they are sent as source); T is the page helper (window.__T).
const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const [shotFile, outDir, base = process.env.BASE || 'http://localhost:8791/bellmourn/'] = process.argv.slice(2);
// a shot is a module, or one entry of a takes file: takes.js#name
const [modPath, takeName] = shotFile.split('#'); const mod = require(path.resolve(modPath)); const shot = takeName ? mod[takeName] : mod;
if (!shot) { console.error('no such take', shotFile); process.exit(1); }
// method shorthand (async setup(T) {...}) becomes a function expression the page can eval
const src = (f) => { if (!f) return null; const s = f.toString(); if (/^(async\s+)?function\b/.test(s) || /=>/.test(s.split('{')[0])) return s; return s.replace(/^(async\s+)?([\w$]+)\s*\(/, (m, a) => (a || '') + 'function ('); };
const FPS = shot.fps || 60, N = Math.round(shot.dur * FPS), WARM = Math.round((shot.warm ?? 1) * FPS);

const INIT = `(() => {
  let now = 0; let q = [];
  window.__vt = { now: () => now, advance(ms) { now += ms; const cbs = q; q = []; for (const cb of cbs) { try { cb(now); } catch (e) { console.error(e); } } } };
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__audio = { ctx: null, t0: 0, len: 10 };
  const Off = window.OfflineAudioContext;
  function AC() {
    const c = new Off(2, Math.ceil(48000 * window.__audio.len), 48000);
    Object.defineProperty(c, 'currentTime', { get: () => Math.max(0, (now - window.__audio.t0) / 1000) });
    Object.defineProperty(c, 'state', { get: () => 'running' });
    c.resume = () => Promise.resolve(); c.suspend = () => Promise.resolve();
    window.__audio.ctx = c; return c;
  }
  window.AudioContext = AC; window.webkitAudioContext = AC;
})();`;

const HELPER = `(() => {
  const G = () => window.BM.game;
  const T = window.__T = {
    G, k: 0, data: {},
    step(ms = 1000 / ${FPS}) { window.__vt.advance(ms); },
    vec(x, y, z) { return G().camFocus.clone().set(x, y, z); },
    // camera: hold the follow camera and place it by hand
    cam(x, z, zoom) { const g = G(); g.debugCamHold = true; g.camFocus.set(x, 0, z); if (zoom) { g.debugZoom = zoom; g.zoom = zoom; } },
    follow(zoom) { const g = G(); g.debugCamHold = false; g.debugZoom = zoom || 0; },
    ease(a) { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); },
    lerp(a, b, k) { return a + (b - a) * k; },
    // text in the game's own pixel font, drawn on the UI canvas after the game drew its frame
    text(s, x, y, o = {}) { G().ui.text(s, x, y, { align: 'center', ...o }); },
    bars(k = 1, frac = 0.12) { const ui = G().ui; const h = Math.round(ui.h * frac * k); ui.rect(0, 0, ui.w, h, '#000'); ui.rect(0, ui.h - h, ui.w, h, '#000'); },
    black(a) { const ui = G().ui; const g = ui.g; const o = g.globalAlpha; g.globalAlpha = Math.max(0, Math.min(1, a)); ui.rect(0, 0, ui.w, ui.h, '#000'); g.globalAlpha = o; },
    flash(a, c = '#fff') { const ui = G().ui; const g = ui.g; const o = g.globalAlpha; g.globalAlpha = Math.max(0, Math.min(1, a)); ui.rect(0, 0, ui.w, ui.h, c); g.globalAlpha = o; },
    async mod(p) { return import(p); },
    hero() { return G().world.hero; },
    async bot(skill = 1, seed = 5) { const { makeBot } = await import('./js/game/bot.js'); const bot = makeBot(skill, seed); G().auto = (g, dt) => Object.assign(bot(g.world, dt), T.extra || {}); },
    async autoplay(seed = 3) { const { makeAutoplay } = await import('./js/game/autoplay.js'); const a = makeAutoplay(seed); G().auto = (g, dt) => Object.assign(a(g, dt), T.extra || {}); },
    idle() { G().auto = () => Object.assign({}, T.extra || {}); },
    place(x, z, face) { const g = G(), h = g.world.hero; h.x = x; h.z = z; h.vx = 0; h.vz = 0; if (face !== undefined) h.face = face; g.camFocus.set(x, 0, z); },
    noBoss() { G().bossState = 'done'; },
    // a clean stage: the district's own foes and locked fights out of the way
    clear() { const g = G(); for (const e of g.encs || []) e.state = 'done'; g.world.ents = g.world.ents.filter((e) => e.team !== 'foe'); g.world.hazards.length = 0; g.world.projs.length = 0; },
    pack(list, o = {}) { const w = G().world, h = w.hero; return list.map(([t, dx, dz, el]) => w.spawnFoe(t, h.x + dx, h.z + dz, { aggro: o.aggro !== false, rise: !!o.rise, tier: o.tier ?? 1, elite: el })); },
    bolt(k = 1) { G().atmos.flash(k); },
    grab() {
      const gc = document.getElementById('game'), uc = document.getElementById('ui');
      const out = T._c || (T._c = document.createElement('canvas')); if (out.width !== gc.width || out.height !== gc.height) { out.width = gc.width; out.height = gc.height; }
      const g = out.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(gc, 0, 0); g.drawImage(uc, 0, 0, out.width, out.height);
      return out.toDataURL('image/jpeg', 0.95);
    },
    async wav() {
      const c = window.__audio.ctx; if (!c) return null; const b = await c.startRendering();
      const n = b.length, ch = 2, L = b.getChannelData(0), R = b.numberOfChannels > 1 ? b.getChannelData(1) : L;
      const buf = new ArrayBuffer(44 + n * 4); const v = new DataView(buf); const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, 48000, true); v.setUint32(28, 48000 * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
      for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
      let s = ''; const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s);
    },
  };
})();`;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: shot.w, height: shot.h }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(INIT);
  if (shot.targetH) await p.addInitScript(`window.__targetH = ${shot.targetH};`);
  await p.goto(base + 'index.html?' + (shot.query || ''), { waitUntil: 'load' });
  // pump the clock until the game has booted and loaded its level
  for (let i = 0; i < 4000; i++) {
    const st = await p.evaluate(() => { if (window.__vt) window.__vt.advance(1000 / 60); return window.BM && window.BM.ready ? window.BM.game.state : null; });
    if (st && st !== 'loading' && st !== 'boot') break;
    await p.waitForTimeout(5);
  }
  await p.evaluate(HELPER);
  if (shot.targetH) await p.evaluate(async (h) => { const m = await import('./js/engine/renderer.js'); m.setTargetHeight(h); window.BM.r.resize(); }, shot.targetH);
  await p.evaluate(async ({ src, hud }) => { const T = window.__T; if (!hud) T.G().drawUI = () => {}; if (src) { const f = eval('(' + src + ')'); await f(T); } }, { src: src(shot.setup), hud: !!shot.hud });
  await p.evaluate(() => { const T = window.__T; const g = T.G(); T.events = []; const he = g.handleEvents.bind(g); g.handleEvents = (evs) => { if (T.rec) for (const e of evs) if (!/^(step|hazardGo|tele)$/.test(e.type)) T.events.push([T.k, e.type, e.e && e.e.type || e.dst && e.dst.type || '']); return he(evs); }; });
  const pre = src(shot.pre), post = src(shot.post);
  await p.evaluate(({ pre, post }) => { const T = window.__T; T.pre = pre ? eval('(' + pre + ')') : null; T.post = post ? eval('(' + post + ')') : null; }, { pre, post });
  // warm-up (not recorded): actors settle, effects spin up
  for (let i = 0; i < WARM; i++) await p.evaluate(({ i, WARM, FPS }) => { const T = window.__T; const t = (i - WARM) / FPS; if (T.pre) T.pre(T, t, i - WARM); T.step(); }, { i, WARM, FPS });
  // sound starts with the recording
  await p.evaluate(({ dur, music, sfxVol }) => { const T = window.__T; window.__audio.t0 = window.__vt.now(); window.__audio.len = dur + 2; const s = T.G().sound; s.unlock(); s.setMusicVol(music ? 0.55 : 0); if (sfxVol !== undefined && s.sfx) s.sfx.gain.value = sfxVol; if (music) s.setMusic(music); }, { dur: shot.dur, music: shot.music || null, sfxVol: shot.sfxVol });
  await p.evaluate(() => { window.__T.rec = true; });
  const t0 = Date.now();
  for (let k = 0; k < N; k++) {
    const data = await p.evaluate(({ k, FPS }) => { const T = window.__T; const t = k / FPS; T.k = k; if (T.pre) T.pre(T, t, k); T.step(); if (T.post) T.post(T, t, k); return T.grab(); }, { k, FPS });
    fs.writeFileSync(path.join(outDir, String(k).padStart(5, '0') + '.jpg'), Buffer.from(data.split(',')[1], 'base64'));
    if (k % 120 === 0) process.stdout.write(`${k}/${N} ${((Date.now() - t0) / Math.max(1, k)).toFixed(0)}ms/f\n`);
  }
  fs.writeFileSync(path.join(outDir, 'events.json'), JSON.stringify(await p.evaluate(() => window.__T.events)));
  const wav = await p.evaluate(() => window.__T.wav());
  if (wav) fs.writeFileSync(path.join(outDir, 'audio.wav'), Buffer.from(wav, 'base64'));
  console.log(`done ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s; errors: ${errs.length ? errs.slice(0, 5).join(' | ') : 'none'}`);
  await b.close();
})();
