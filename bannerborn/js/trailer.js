// Bannerborn — the trailer: under a minute, cut from the game itself. Real battles (a full-strength team, already in
// the thick of it), a summoning, the campaign's land and the camp, cut on the beat of the boss drums with a line of
// text over each. Everything on screen is drawn from the trailer's own clock, so it can be stepped frame by frame and
// recorded (tools/record-trailer.js), with its sound rendered from the same clock.
(function () {
  const BB = window.BB, UI = BB.UI;
  const $ = (id) => document.getElementById(id);
  const BEAT = 60 / 118; // the boss drums' tempo: every cut lands on a beat
  const SERIF = 'Cinzel, "Cormorant Garamond", Georgia, serif', TEXT = '"Cormorant Garamond", Cinzel, Georgia, serif';
  const T = BB.Trailer = { on: false, loading: false, t: 0, total: 0, cur: -1, segs: [], cues: [], cueI: 0, sc: {}, hero: null, done: null, record: false, prog: 0, prime: false };
  const cl = (x) => Math.max(0, Math.min(1, x)), lerp = (a, b, k) => a + (b - a) * k, ease = (k) => k * k * (3 - 2 * k);

  // the cut: lengths in beats
  const CUT = [
    { b: 12, k: 'gate', lines: [[0.5, 2.9, 'The Gravegates stand open.'], [3.2, 5.9, 'The dead walk the old roads.']] },
    { b: 8, k: 'scene', s: 'camp', z: [1.0, 1.28], cap: 'Raise your banner', flash: 1, horn: 1 },
    { b: 10, k: 'summon', cap: 'Earn your heroes' },
    { b: 8, k: 'scene', s: 'a', z: [1.02, 1.18], cap: 'They fight on their own', flash: 1, drums: 1 },
    { b: 8, k: 'scene', s: 'b', z: [1.2, 1.04], cap: 'You call the ultimates' },
    { b: 6, k: 'scene', s: 'c', z: [1.08, 1.26], cap: 'Every blade leaves its mark' },
    { b: 6, k: 'land', z: [0.86, 0.98], cap: 'Eight lands · fifty-four stages' },
    { b: 2, k: 'scene', s: 'a', z: [1.5, 1.62] }, { b: 2, k: 'scene', s: 'c', z: [1.62, 1.5] }, { b: 2, k: 'scene', s: 'b', z: [1.45, 1.6] }, { b: 2, k: 'scene', s: 'a', z: [1.7, 1.52] },
    { b: 5, k: 'black', big: 'And at the end of every road' },
    { b: 12, k: 'scene', s: 'boss', z: [1.0, 1.32], name: 'The Pale Regent', sub: 'waits', flash: 1, drums: 1, roar: 1 },
    { b: 1, k: 'scene', s: 'a', z: [1.6, 1.6], quick: 1 }, { b: 1, k: 'scene', s: 'c', z: [1.5, 1.5], quick: 1 }, { b: 1, k: 'scene', s: 'b', z: [1.6, 1.6], quick: 1 }, { b: 1, k: 'scene', s: 'boss', z: [1.5, 1.5], quick: 1 },
    { b: 1, k: 'scene', s: 'a', z: [1.4, 1.4], quick: 1 }, { b: 1, k: 'scene', s: 'c', z: [1.7, 1.7], quick: 1 }, { b: 1, k: 'scene', s: 'boss', z: [1.7, 1.7], quick: 1 }, { b: 1, k: 'scene', s: 'b', z: [1.4, 1.4], quick: 1 },
    { b: 16, k: 'title' },
  ];

  // ---------------------------------------------------------------- the scenes, built and warmed before the first frame
  async function prepare() {
    const step = (p) => { T.prog = p; return new Promise((r) => setTimeout(r, 0)); };
    await Promise.all([BB.loadEnv('vale'), BB.loadEnv('ground'), BB.loadOther()]);
    if (document.fonts && document.fonts.load) await Promise.all(['800 20px Cinzel', '600 20px Cinzel', 'italic 600 20px "Cormorant Garamond"'].map((f) => document.fonts.load(f).catch(() => null))); // the first card must not fall back to another face
    const S = T.sc = {};
    S.camp = await BB.titleCamp(); await step(0.15);
    { // the first land of the campaign, as the campaign screen builds it
      const ch = BB.CHAPTERS[0], stages = BB.MISSIONS.filter((m) => m.chapter === ch.id), map = BB.buildJourney(stages, ch.biome || 'vale', 100 + ch.id, { night: !!ch.night });
      BB.renderGround(map, 1);
      const sc = new BB.Battle({ map, heroes: [], peaceful: true, save: BB.save, seed: 9 }); sc.journey = true; sc.npcs = []; S.land = sc;
    }
    await step(0.3);
    S.a = await BB.stageScene({ idx: 4, over: 0, warm: 7, tick: ['sigs', 'sturdy'] }); await step(0.45);
    S.b = await BB.stageScene({ idx: 13, over: 0, archs: ['knight', 'monk', 'mage', 'ranger', 'spearman'], ench: ['holy', 'storm', 'fire', 'frost', 'shadow'], warm: 8, tick: ['ults', 'sigs', 'sturdy'] }); await step(0.6);
    S.c = await BB.stageScene({ idx: 33, over: 0, archs: ['paladin', 'rogue', 'mage', 'ranger', 'barbarian'], ench: ['fire', 'poison', 'storm', 'frost', 'shadow'], warm: 8, tick: ['sigs', 'sturdy'] }); await step(0.75);
    S.boss = await BB.stageScene({ idx: 23, over: 1, until: 'boss', warm: 3.2, tick: ['sigs', 'sturdy'] }); await step(0.9);
    const boss = S.boss.ents.find((e) => e.boss && e.side === 'foe');
    if (boss) { const tk = S.boss.tick; S.boss.tick = (dt) => { tk(dt); if (boss.hp < boss.maxhp * 0.45) boss.hp = boss.maxhp * 0.45; }; } // the Regent is still standing at the cut
    // the summoning: a Legendary hero of the roster
    const tiers = BB.heroTiers(BB.ROSTER), top = tiers[tiers.length - 1];
    const h = BB.heroFromEntry(BB.newSave(Date.now()), Object.assign({}, top.heroes[0], { rarity: 3 })); h.stars = 5;
    await BB.loadHeroes([h]); T.hero = h; await step(1);
  }
  function timeline() {
    T.segs = []; T.cues = []; let t = 0;
    const cue = (at, fn) => T.cues.push([at, fn]);
    CUT.forEach((c, i) => {
      const sg = Object.assign({ t0: t, dur: c.b * BEAT }, c); T.segs.push(sg);
      if (c.k === 'gate') { cue(t, () => BB.score('drone')); for (let b = 0; b < c.b - 3; b += 2) cue(t + b * BEAT, () => BB.score('tick')); cue(t + sg.dur - 1.7, () => BB.score('riser', 1.6)); }
      else if (c.k === 'summon') cue(t, () => BB.score('shimmer'));
      else if (c.k === 'black') { cue(t, () => { BB.music(null); BB.score('boom'); }); cue(t + sg.dur - 2.05, () => BB.score('riser', 2)); }
      else if (c.k === 'title') { cue(t, () => { BB.music(null); BB.score('braam', 1.2); BB.score('shimmer'); BB.sfx('boom'); }); cue(t + sg.dur - 3, () => BB.score('drone', false)); }
      else if (c.drums) { cue(Math.max(0, t - 0.1), () => BB.music('boss')); cue(t, () => { BB.score('braam'); if (c.roar) BB.sfx('boss'); }); }
      else if (c.quick) cue(t, () => BB.score('tick', 1.6));
      else cue(t, () => { BB.score('hit', c.flash ? 1 : 0.6); if (c.horn) BB.score('horn'); });
      if (c.quick && CUT[i + 1] && CUT[i + 1].k === 'title') cue(t, () => BB.score('riser', BEAT * 0.95));
      t += sg.dur;
    });
    T.cues.sort((a, b) => a[0] - b[0]); T.total = t;
  }

  // ---------------------------------------------------------------- play, stop
  let cv = null, g = null;
  T.play = async function (done, opts) {
    if (T.on) return; opts = opts || {};
    Object.assign(T, { on: true, loading: true, done, t: 0, cur: -1, cueI: 0, record: !!opts.record, prog: 0, prime: true });
    cv = $('trailerCv'); g = cv.getContext('2d');
    UI.show('trailer'); cv.classList.add('on'); $('trailerSkip').classList.toggle('on', !T.record);
    try { await prepare(); } catch (e) { console.error(e); T.stop(); UI.toast('Could not load the trailer.'); return; }
    if (!T.on) return; // skipped while it loaded
    timeline(); T.loading = false;
    if (T.record) BB.audioClock = () => T.t;
  };
  function closeReveal() { if (!$('reveal').classList.contains('on')) return; const m = BB.sfxMute; BB.sfxMute = true; $('rvOk').click(); BB.sfxMute = m; }
  T.stop = function () {
    if (!T.on) return;
    closeReveal(); T.on = false; T.loading = false; T.sc = {}; T.hero = null;
    if (T.record) BB.audioClock = null; else BB.score('drone', false);
    if (cv) cv.classList.remove('on'); $('trailerSkip').classList.remove('on');
    const d = T.done; T.done = null; if (d) d();
  };
  $('trailerSkip').addEventListener('click', () => T.stop());

  // ---------------------------------------------------------------- drawing kit (the chrome canvas, over everything)
  function spaced(s, x, y, size, ls, o) { // centred text with tracking, a dark edge, a fill
    o = o || {};
    g.font = (o.w || 800) + ' ' + (o.it ? 'italic ' : '') + Math.round(size) + 'px ' + (o.font || SERIF); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const can = g.letterSpacing !== undefined; if (can) g.letterSpacing = Math.round(ls) + 'px';
    if (o.max) { const mw = g.measureText(s).width + (can ? 0 : ls * s.length); if (mw > o.max) { const q = o.max / mw; size *= q; ls *= q; g.font = (o.w || 800) + ' ' + (o.it ? 'italic ' : '') + Math.round(size) + 'px ' + (o.font || SERIF); if (can) g.letterSpacing = Math.round(ls) + 'px'; } }
    const cx = x + (can ? ls / 2 : 0);
    if (o.edge !== 0) { g.strokeStyle = 'rgba(8,5,2,0.9)'; g.lineWidth = Math.max(2, size * (o.edge || 0.1)); g.strokeText(s, cx, y); }
    g.fillStyle = o.fill || '#f1ead8'; g.fillText(s, cx, y);
    if (can) g.letterSpacing = '0px';
  }
  function gold(y, size) { const gr = g.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.5); gr.addColorStop(0, '#fffbe8'); gr.addColorStop(0.45, '#ffd27e'); gr.addColorStop(1, '#b9772a'); return gr; }
  function caption(text, lt, dur, w, h) { // a line over the lower third
    const a = cl((lt - 0.12) / 0.3) * cl((dur - lt) / 0.22); if (a <= 0) return;
    const size = Math.min(w * 0.04, h * 0.066), y = h * 0.8, k = cl(lt / dur);
    g.save(); g.globalAlpha = a;
    const gr = g.createLinearGradient(0, y - size * 1.7, 0, y + size * 1.5); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, y - size * 1.7, w, size * 3.2);
    spaced(text.toUpperCase(), w / 2, y, size, size * (0.2 + 0.07 * k), { fill: gold(y, size), max: w * 0.9 });
    const rw = w * (0.1 + 0.05 * k), ry = y + size * 0.95; g.fillStyle = 'rgba(255,206,120,0.7)'; g.fillRect(w / 2 - rw, ry, rw * 2, Math.max(1, h * 0.0022));
    g.restore();
  }
  function fxFrame(key, frame, cx, cy, k, a) { // one frame of an effect sprite, held steady about the middle of its first frame
    const A = BB.A.fx; if (!A || !A.meta.n[key]) return; const n = A.meta.n[key], F = A.meta.f[key], r = F[((frame % n) + n) % n], r0 = F[0]; if (!r || r[2] <= 1) return;
    g.globalAlpha = a; g.imageSmoothingEnabled = false; g.drawImage(A.img, r[0], r[1], r[2], r[3], cx + (r[4] - r0[4] - r0[2] / 2) * k, cy + (r[5] - r0[5] - r0[3] / 2) * k, r[2] * k, r[3] * k); g.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- one frame
  T.frame = function (dt, ctx, W, H, dpr, z0) {
    const w = Math.round(cv.clientWidth * Math.min(2, window.devicePixelRatio || 1)), h = Math.round(cv.clientHeight * Math.min(2, window.devicePixelRatio || 1));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    const black = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); };
    if (T.loading) { // a quiet card while the scenes are built
      black(); g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      spaced('BANNERBORN', w / 2, h * 0.46, Math.min(w * 0.05, h * 0.09), Math.min(w * 0.05, h * 0.09) * 0.22, { fill: gold(h * 0.46, h * 0.09), edge: 0 });
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(w * 0.4, h * 0.56, w * 0.2, Math.max(2, h * 0.004)); g.fillStyle = '#ffbe55'; g.fillRect(w * 0.4, h * 0.56, w * 0.2 * T.prog, Math.max(2, h * 0.004));
      return;
    }
    if (T.prime) { // colour every sprite the battles will need now, not during the first seconds of a clip
      T.prime = false; const lazy = BB.tintLazy;
      for (const k of ['a', 'b', 'c', 'boss']) { const sc = T.sc[k]; if (!sc) continue; BB.tintLazy = false; sc.cam.zoom = z0; sc.renderField(ctx, W, H, dpr); }
      BB.tintLazy = lazy; black(); return;
    }
    T.t += dt;
    while (T.cueI < T.cues.length && T.cues[T.cueI][0] <= T.t) T.cues[T.cueI++][1]();
    let i = T.segs.findIndex((s) => T.t < s.t0 + s.dur);
    if (i < 0) { black(); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); T.stop(); return; }
    const sg = T.segs[i], lt = T.t - sg.t0, k = lt / sg.dur;
    if (i !== T.cur) { // a cut
      const was = T.segs[T.cur]; if (was && was.k === 'summon') closeReveal();
      if (sg.k === 'summon') { UI.reveal(T.hero, () => {}); UI.revealRender(1.3); } // past the slow gathering, straight to the charge
      T.cur = i;
    }
    // ---- the picture
    const sc = sg.k === 'scene' ? T.sc[sg.s] : sg.k === 'land' ? T.sc.land : sg.k === 'title' ? T.sc.camp : null;
    if (sc) {
      const z = z0 * lerp(sg.z ? sg.z[0] : 0.92, sg.z ? sg.z[1] : 1.02, sg.k === 'title' ? cl(lt / sg.dur) : k);
      if (sg.k === 'land') { const R = sc.map.road, f = lerp(18, 128, ease(k)), a = R[Math.floor(f)], b = R[Math.min(R.length - 1, Math.floor(f) + 1)], q = f - Math.floor(f); sc.cam.x = lerp(a.x, b.x, q); sc.cam.y = lerp(a.y, b.y, q); sc.cam.zoom = z; }
      else if (sc.peaceful) { const c = sc.map.w / 2; sc.cam.x = c - 0.9 + (sg.k === 'title' ? 0.5 + k * 0.5 : k * 1.2); sc.cam.y = c + 0.5; sc.cam.zoom = z; }
      else { sc.cam.zoom = z * (sc.zoomK || 1); if (sc.tick) sc.tick(dt); }
      sc.update(dt, null); sc.render(ctx, W, H, dpr);
    } else black();
    if (sg.k === 'summon') UI.revealRender(dt);
    // ---- over it
    const bar = Math.round(h * 0.105);
    if (sg.k === 'gate') {
      const a = cl(lt / 1.6) * cl((sg.dur - lt) / 0.25), cx = w / 2, by = h * 0.86, s = (h * 0.46 / 56) * (1 + k * 0.2);
      g.globalCompositeOperation = 'lighter'; BB.drawGlow(g, '#7a4cff', cx, h * 0.56, h * 0.5 * (1 + k * 0.2), h * 0.42, a * (0.5 + 0.12 * Math.sin(T.t * 3)));
      g.globalCompositeOperation = 'source-over'; fxFrame('portal', Math.floor(T.t * 12), cx, h * 0.56, s, a);
      g.globalCompositeOperation = 'lighter'; g.fillStyle = '#c9a8ff';
      for (let n = 0; n < 26; n++) { const q = (T.t * (0.05 + (n % 5) * 0.012) + n * 0.137) % 1, px = cx + Math.sin(n * 12.9898) * w * 0.3 * (0.3 + q), py = by - q * h * 0.7, sz = Math.max(1, h * 0.004); g.globalAlpha = a * Math.sin(q * Math.PI) * 0.8; g.fillRect(px, py, sz, sz); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      for (const [t0, t1, s2] of sg.lines) { const la = cl((lt - t0) / 0.5) * cl((t1 - lt) / 0.45); if (la > 0) { g.globalAlpha = la; spaced(s2, w / 2, h * 0.24, Math.min(w * 0.036, h * 0.062), 1, { font: TEXT, w: 600, it: 1, fill: '#e9e2d0' }); g.globalAlpha = 1; } }
    }
    if (sg.k === 'black') { const a = cl(lt / 0.5) * cl((sg.dur - lt) / 0.3), size = Math.min(w * 0.04, h * 0.07); g.globalAlpha = a; spaced(sg.big.toUpperCase(), w / 2, h / 2, size, size * (0.22 + 0.1 * k), { fill: '#e9e2d0', edge: 0, max: w * 0.88 }); g.globalAlpha = 1; }
    if (sg.cap) caption(sg.cap, lt, sg.dur, w, h);
    if (sg.name) { // the boss: his name slammed in, low on the left
      const a = cl((lt - 0.5) / 0.14) * cl((4.6 - lt) / 0.4);
      if (a > 0) {
        const pop = 1 + 1.3 * Math.pow(1 - cl((lt - 0.5) / 0.18), 2), size = Math.min(w * 0.062, h * 0.105) * pop, x = w * 0.5, y = h * 0.74;
        g.save(); g.globalAlpha = a;
        const gr = g.createLinearGradient(0, y - size * 1.6, 0, y + size * 1.6); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(20,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, y - size * 1.6, w, size * 3.2);
        const red = g.createLinearGradient(0, y - size / 2, 0, y + size / 2); red.addColorStop(0, '#fff0e6'); red.addColorStop(0.5, '#ff9a80'); red.addColorStop(1, '#b3261c');
        spaced(sg.name.toUpperCase(), x, y, size, size * 0.16, { fill: red, max: w * 0.92 });
        g.restore();
      }
    }
    if (sg.k === 'title') {
      const fade = cl((sg.dur - lt) / 1.1);
      g.fillStyle = 'rgba(4,5,9,' + (0.66 * cl(lt / 0.3)).toFixed(3) + ')'; g.fillRect(0, 0, w, h);
      g.save(); g.translate(w / 2, h * 0.46); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,196,110,0.05)'; // slow rays behind the name
      for (let n = 0; n < 14; n++) { const a = n / 14 * Math.PI * 2 + T.t * 0.06, r = Math.max(w, h); g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - 0.05) * r, Math.sin(a - 0.05) * r); g.lineTo(Math.cos(a + 0.05) * r, Math.sin(a + 0.05) * r); g.closePath(); g.fill(); }
      g.restore(); g.globalCompositeOperation = 'lighter'; BB.drawGlow(g, '#ffb347', w / 2, h * 0.46, w * 0.5, h * 0.3, 0.35); g.globalCompositeOperation = 'source-over';
      const pop = 1 + 1.5 * Math.pow(1 - cl(lt / 0.22), 2), size = Math.min(w * 0.082, h * 0.17) * pop * (1 + lt * 0.006), y = h * 0.45;
      spaced('BANNERBORN', w / 2, y, size, size * 0.2, { fill: gold(y, size), edge: 0.07 });
      const ta = cl((lt - 1.1) / 0.6); if (ta > 0) {
        g.globalAlpha = ta; const s2 = Math.min(w * 0.021, h * 0.036), ty = y + size * 0.82;
        g.fillStyle = 'rgba(255,206,120,0.8)'; g.fillRect(w / 2 - w * 0.2 * ta, ty - s2 * 1.5, w * 0.4 * ta, Math.max(1, h * 0.002));
        spaced('RAISE YOUR BANNER  ·  EARN YOUR HEROES  ·  SHUT THE GRAVEGATES', w / 2, ty, s2, s2 * 0.3, { w: 600, fill: '#e6d7b0', edge: 0.14, max: w * 0.9 }); g.globalAlpha = 1;
      }
      if (fade < 1) { g.fillStyle = 'rgba(0,0,0,' + (1 - fade).toFixed(3) + ')'; g.fillRect(0, 0, w, h); }
    }
    if (sg.flash || sg.k === 'title') { const f = Math.pow(1 - cl(lt / 0.16), 2); if (f > 0.01) { g.fillStyle = 'rgba(255,244,220,' + f.toFixed(3) + ')'; g.fillRect(0, 0, w, h); } }
    else if (sg.quick || (sg.k === 'scene' && !sg.cap)) { const f = 1 - cl(lt / 0.07); if (f > 0.01) { g.fillStyle = 'rgba(255,255,255,' + (f * 0.5).toFixed(3) + ')'; g.fillRect(0, 0, w, h); } }
    g.fillStyle = '#000'; g.fillRect(0, 0, w, bar); g.fillRect(0, h - bar, w, bar); // the letterbox, over everything
  };
})();
