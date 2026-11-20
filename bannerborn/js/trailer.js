// Bannerborn — the trailer, and the promotional cuts: films cut from the game itself. Shots of the opening film's
// drawn art (BB.Opening), real battles (a full-strength team, already in the thick of it), a stand against the clock,
// an expedition's road, a summoning, the campaign's land and the camp, cut on the beat of the drums with a line of
// text over each. Everything on screen is drawn from the trailer's own clock, so it can be stepped frame by frame and
// recorded (tools/record-trailer.js), with its sound rendered from the same clock.
// A cut is a list of segments (plain data). The game's own trailer is CUT below; the recorder passes others (tools/
// promo-cuts.js: the reveal, the gameplay trailer, the vertical shorts) as `opts.cut`, with `opts.team` (how many
// heroes take the field), `opts.bpm`, `opts.bars` (the letterbox, as a part of the height) and `opts.brand`.
// On a tall screen (a vertical short) nothing is letterboxed, battles are shot closer and the drawn art is cropped
// from its wide frame about `px` (0 to 1 across it).
(function () {
  const BB = window.BB, UI = BB.UI;
  const $ = (id) => document.getElementById(id);
  const SERIF = 'Cinzel, "Cormorant Garamond", Georgia, serif', TEXT = '"Cormorant Garamond", Cinzel, Georgia, serif';
  const T = BB.Trailer = { on: false, loading: false, t: 0, total: 0, cur: -1, segs: [], cues: [], cueI: 0, sc: {}, hero: null, done: null, record: false, prog: 0, prime: false, o: {} };
  const cl = (x) => Math.max(0, Math.min(1, x)), lerp = (a, b, k) => a + (b - a) * k, ease = (k) => k * k * (3 - 2 * k);
  let BEAT = 60 / 118; // the boss drums' tempo: every cut lands on a beat

  // the game's own trailer: lengths in beats
  const CUT = [
    { b: 12, k: 'art', a: 'gate', lines: [[0.4, 2.6, 'The Gravegates stand open.'], [3.2, 5.9, 'The dead walk the old roads.']] },
    { b: 8, k: 'art', a: 'raise', flash: 1 },
    { b: 8, k: 'summon', cap: 'Earn your heroes' },
    { b: 6, k: 'scene', s: 'muster', z: [0.82, 0.96], cap: 'One by one, a warband' },
    { b: 6, k: 'scene', s: 'a', z: [1.02, 1.18], cap: 'They fight on their own', flash: 1, drums: 1 },
    { b: 8, k: 'scene', s: 'b', z: [1.2, 1.04], cap: 'You call the ultimates' },
    { b: 6, k: 'scene', s: 'c', z: [1.08, 1.26], cap: 'Break what the dead build' },
    { b: 6, k: 'scene', s: 'stand', z: [1.0, 1.16], cap: 'Stand until the horn' },
    { b: 8, k: 'scene', s: 'trek', z: [0.9, 1.08], cap: 'One long road · three gates' },
    { b: 4, k: 'scene', s: 'market', z: [0.9, 1.04], cap: 'A camp that is a place' },
    { b: 6, k: 'land', z: [0.86, 0.98], cap: 'Eight lands · fifty-four stages' },
    { b: 2, k: 'scene', s: 'a', z: [1.5, 1.62] }, { b: 2, k: 'scene', s: 'c', z: [1.62, 1.5] }, { b: 2, k: 'scene', s: 'b', z: [1.45, 1.6] }, { b: 2, k: 'scene', s: 'a', z: [1.7, 1.52] },
    { b: 5, k: 'black', big: 'And at the end of every road' },
    { b: 10, k: 'scene', s: 'boss', z: [1.0, 1.32], name: 'The Pale Regent', flash: 1, drums: 1, roar: 1 },
    { b: 8, k: 'scene', s: 'lord', z: [1.0, 1.24], name: 'The Hollow King', flash: 1, drums: 1 },
    { b: 1, k: 'scene', s: 'a', z: [1.6, 1.6], quick: 1 }, { b: 1, k: 'scene', s: 'c', z: [1.5, 1.5], quick: 1 }, { b: 1, k: 'scene', s: 'b', z: [1.6, 1.6], quick: 1 }, { b: 1, k: 'scene', s: 'lord', z: [1.5, 1.5], quick: 1 },
    { b: 1, k: 'scene', s: 'a', z: [1.4, 1.4], quick: 1 }, { b: 1, k: 'scene', s: 'c', z: [1.7, 1.7], quick: 1 }, { b: 1, k: 'scene', s: 'boss', z: [1.7, 1.7], quick: 1 }, { b: 1, k: 'scene', s: 'b', z: [1.5, 1.5], quick: 1 },
    { b: 14, k: 'title' },
  ];
  T.CUT = CUT;

  // The opening film's shots, as the film times them (js/opening.js), with the sounds the film gives them. A segment
  // may start a shot late (`from`, seconds into it) and run it faster (`speed`); `at` moments flash and shake.
  const ART = {
    ridge: { sh: { dur: 8.6 }, cues: [[0, 'score/drone']] },
    oath: { sh: { dur: 4.4, firstAt: 0.3, gap: 0.2, meetAt: 2.3 }, at: [2.3], cues: [[0.5, 'sfx/parry'], [0.9, 'sfx/parry'], [1.3, 'sfx/parry'], [1.7, 'sfx/parry'], [2.1, 'sfx/parry'], [2.3, 'sfx/rally'], [2.3, 'score/hit/0.9']] },
    gate: { sh: { dur: 6.8, burstAt: 2.7, veshAt: 4.5 }, at: [2.7], cues: [[0, 'score/drone'], [0.4, 'voice/rumble/0.8'], [2.7, 'score/braam/1.2'], [2.7, 'sfx/burst'], [2.7, 'sfx/slam'], [2.7, 'sfx/portal'], [3.1, 'voice/dino_horde/0.7'], [4.5, 'voice/deep_groan/0.9']] },
    cantor: { sh: { dur: 4.6, eyesAt: 0.9, nameAt: 1.3, singAt: 3.3 }, at: [3.3], cues: [[0, 'sfx/charge'], [0.9, 'sfx/hex'], [1.3, 'sfx/slam'], [1.3, 'score/hit/0.9'], [3.3, 'sfx/boss'], [3.3, 'score/braam/1.2'], [3.3, 'voice/deep_roar/1']] },
    rising: { sh: { dur: 3.3, panels: [{ k: 'hand', d: 0.6 }, { k: 'eyes', d: 0.5 }, { k: 'march', d: 0.65 }, { k: 'low', d: 0.5 }, { k: 'ridge', d: 1.05 }] }, cues: [[0, 'score/hit/0.8'], [0, 'sfx/slam'], [0.6, 'score/hit/0.8'], [0.6, 'voice/dino_horde/0.8'], [1.1, 'score/hit/0.9'], [1.75, 'score/hit/1'], [1.75, 'sfx/slam'], [2.25, 'score/boom'], [2.25, 'voice/deep_roar/0.7']] },
    ninth: { sh: { dur: 9.2, pushAt: 2.4, blowAt: 4.6, freezeAt: 5.15, thawAt: 7.6 }, at: [4.6], cues: [[0.1, 'voice/dino_horde/0.7'], [2.4, 'score/riser/2.2'], [2.4, 'sfx/charge'], [4.6, 'sfx/burst'], [4.6, 'sfx/slam'], [4.6, 'score/braam/1.2'], [5.15, 'sfx/slam'], [5.4, 'sfx/rally'], [7.6, 'score/hit/1']] },
    raise: { sh: { dur: 4.6, raiseAt: 2.0, words: [['RAISE', 0.9, 0.31], ['YOUR', 1.45, 0.47], ['BANNER', 2.0, 0.66]] }, cues: [[0.3, 'sfx/slam'], [0.3, 'score/boom'], [0.9, 'score/hit/0.8'], [0.9, 'sfx/slam'], [1.45, 'score/hit/0.9'], [1.45, 'sfx/slam'], [2.0, 'score/hit/1'], [2.0, 'sfx/slam'], [2.0, 'score/horn'], [2.4, 'sfx/rally']] },
  };
  // a sound, written as text so a cut stays plain data: 'score/braam/1.2', 'sfx/slam', 'voice/deep_roar/0.9', 'music/boss', 'music/off'
  const fire = (s) => { const [k, n, a] = String(s).split('/');
    if (k === 'score') BB.score(n, a === 'off' ? false : a === undefined ? undefined : +a); else if (k === 'sfx') BB.sfx(n);
    else if (k === 'voice') { if (BB.voice) BB.voice(n, +(a || 1), 1); } else if (k === 'music') BB.music(n === 'off' ? null : n); };

  // ---------------------------------------------------------------- the scenes: each built only if the cut shows it
  const FIVE = ['knight', 'mage', 'ranger', 'barbarian', 'paladin'];
  let showcase = null; // a far-on save with a roster to muster, for the two places of the camp
  const camp = () => { if (!showcase) { showcase = BB.showSave({ idx: 40, over: 2 }); for (const t of BB.heroTiers(BB.ROSTER)) for (const e of t.heroes.slice(0, 4)) if (!showcase.heroes.some((h) => h.recruit === e.key)) showcase.heroes.push(BB.heroFromEntry(showcase, e)); } return showcase; };
  const fight = (idx, n, o) => BB.stageScene(Object.assign({ idx, over: 0, archs: ((o && o.team) || FIVE).slice(0, n), warm: 8, tick: ['sigs', 'sturdy'] }, o, o && o.ench ? { ench: o.ench.slice(0, n) } : null));
  // a showcase: one ability fired again and again (its cut-in banner left out, so the effect itself is seen)
  const every = (sec, fn) => { let t = 0.2; return (sc, dt) => { t -= dt; if (t <= 0) { t = sec; fn(sc); } }; };
  const foeNear = (sc, e) => sc.foesAlive().filter((o) => !o.turret && !o.gate).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
  const sigOn = (name, sec) => every(sec || 2.4, (sc) => { const e = sc.heroesAlive()[0], f = e && foeNear(sc, e); if (e && f) sc.runSig(e, f, { sig: name, tgt: f }); });
  const ultOn = (calling, sec) => every(sec || 2.6, (sc) => { const e = sc.heroList.find((h) => h.calling === calling && !h.dead); if (!e) return; e.energy = 100; e.state = 'idle'; e.lock = 0; sc.useSkill(e, true); if (sc.ep) sc.ep.ult = null; });
  const tough = (sc) => { for (const o of sc.ents) if (o.side === 'foe' && !o.dead && !o.boss && o.hp < o.maxhp * 0.35) o.hp = o.maxhp * 0.35; };
  // the effects reel: one scene plays many abilities, the segment on screen says which (`fire`: 'ult:arcanist',
  // 'sig:meteor:2.2' or 'boss:deathcone:2.5', the last part how often it fires)
  const fireMode = (sc, dt) => { const m = sc.fireMode; if (!m) return; sc.fireT -= dt; if (sc.fireT > 0) return;
    const [kind, name, every] = m.split(':'); sc.fireT = +(every || 2.2);
    if (kind === 'sig') { const e = sc.heroesAlive()[0], f = e && foeNear(sc, e); if (e && f) sc.runSig(e, f, { sig: name, tgt: f }); }
    else if (kind === 'ult') { const e = sc.heroList.find((h) => h.calling === name && !h.dead); if (e) { e.energy = 100; e.state = 'idle'; e.lock = 0; e.leap = null; sc.useSkill(e, true); if (sc.ep) sc.ep.ult = null; } }
    else if (kind === 'boss') { const b = sc.ents.find((o) => o.boss && !o.dead && o.side === 'foe'), t = sc.heroesAlive()[0]; if (b && t) { b.state = 'idle'; b.lock = 0; b.moveCd = 9; sc.bossMove(b, t, name); } } };
  const reel = (idx, team, o) => async (n) => { const sc = await fight(idx, Math.max(n, team.length), Object.assign({ team, warm: 3, tick: ['sturdy', tough, fireMode] }, o)); sc.autoSkills = false;
    const b = sc.ents.find((e) => e.boss && e.side === 'foe'); if (b) { const tk = sc.tick; sc.tick = (dt) => { tk(dt); if (b.hp < b.maxhp * 0.6) b.hp = b.maxhp * 0.6; }; } return sc; };
  const show = (idx, team, fn) => (n) => fight(idx, Math.max(n, team.length), { team, warm: 4, tick: ['sturdy', tough, fn] });
  const MAKE = {
    fxA: reel(4, ['mage', 'knight', 'barbarian', 'ranger', 'paladin']),
    fxB: reel(13, ['monk', 'rogue', 'spearman', 'knight', 'mage']),
    fxEnch: reel(4, ['knight', 'barbarian', 'ranger', 'mage', 'rogue'], { ench: ['fire', 'frost', 'storm', 'shadow', 'poison'], tick: ['sturdy', tough, 'sigs'] }),
    fxBoss: reel(23, ['knight', 'mage', 'ranger', 'barbarian', 'paladin'], { over: 1, until: 'boss', warm: 2.5 }),
    xMeteor: show(31, ['mage', 'knight', 'ranger'], sigOn('meteor', 2.2)),
    xStorm: show(44, ['mage', 'knight', 'ranger'], sigOn('chainbolt', 1.4)),
    xFlame: show(31, ['mage', 'knight', 'ranger'], ultOn('arcanist', 2.4)),
    xSmite: show(37, ['knight', 'mage', 'ranger'], sigOn('smite', 1.2)),
    xCry: show(4, ['barbarian', 'knight', 'mage'], sigOn('warcry', 1.5)),
    xShadow: show(31, ['rogue', 'knight', 'mage'], sigOn('blinkstrike', 1.3)),
    xSlam: show(13, ['barbarian', 'knight', 'mage'], sigOn('groundpound', 1.6)),
    camp: () => BB.titleCamp(),
    land: () => { // the first land of the campaign, as the campaign screen builds it
      const ch = BB.CHAPTERS[0], stages = BB.MISSIONS.filter((m) => m.chapter === ch.id), map = BB.buildJourney(stages, ch.biome || 'vale', 100 + ch.id, { night: !!ch.night });
      BB.renderGround(map, 1);
      const sc = new BB.Battle({ map, heroes: [], peaceful: true, save: BB.save, seed: 9 }); sc.journey = true; sc.npcs = []; return sc; },
    muster: () => BB.placeScene('muster', camp()), market: () => BB.placeScene('market', camp()),
    a: (n) => fight(4, n, { warm: 7 }),                                                                                                   // Greenvale
    b: (n) => fight(13, n, { team: ['knight', 'mage', 'monk', 'ranger', 'spearman'], ench: ['holy', 'fire', 'storm', 'frost', 'shadow'], tick: ['ults', 'sigs', 'sturdy'] }), // the Sunscar, ultimates one after another
    c: (n) => fight(37, n, { team: ['paladin', 'mage', 'rogue', 'ranger', 'barbarian'], ench: ['fire', 'storm', 'poison', 'frost', 'shadow'] }), // the Cinderfields, and what the dead build there
    frost: (n) => fight(31, n, { team: ['barbarian', 'mage', 'paladin', 'ranger', 'knight'], ench: ['frost', 'fire', 'holy', 'storm', 'shadow'], tick: ['ults', 'sigs', 'sturdy'] }), // the Frostmarch
    mire: (n) => fight(44, n, { team: ['knight', 'ranger', 'mage', 'rogue', 'paladin'], ench: ['poison', 'storm', 'fire', 'shadow', 'holy'] }),  // Mirefen
    stand: (n) => fight(33, n, { warm: 22 }),                                                                                             // a stand against the clock
    trek: (n) => fight(12, n, { mission: () => BB.expedition(2, 16, 7), warm: 26, tick: ['sigs', 'sturdy', (sc) => { if (sc.choice) sc.trekChoose(1); }] }), // an expedition's road
    boss: async (n) => { const sc = await fight(23, n, { over: 1, until: 'boss', warm: 3.2 }), boss = sc.ents.find((e) => e.boss && e.side === 'foe');
      if (boss) { const tk = sc.tick; sc.tick = (dt) => { tk(dt); if (boss.hp < boss.maxhp * 0.45) boss.hp = boss.maxhp * 0.45; }; } return sc; }, // the Regent is still standing at the cut
    lord: async (n) => { const sc = await fight(53, n, { over: 2, until: 'boss', warm: 2.4 }), lord = sc.ents.find((e) => e.boss && e.side === 'foe'); // the Hollow King, taking his tithe
      if (lord) { const tk = sc.tick; let cd = 0.6; sc.tick = (dt) => { tk(dt); if (lord.hp < lord.maxhp * 0.5) lord.hp = lord.maxhp * 0.5; cd -= dt; if (cd <= 0 && !lord.tithe && !lord.dead) { cd = 4.4; const t = sc.heroesAlive()[0]; if (t) { lord.moveCd = 3; sc.bossMove(lord, t, 'tithe'); } } }; } return sc; },
  };
  async function prepare() {
    const step = (p) => { T.prog = p; return new Promise((r) => setTimeout(r, 0)); };
    await Promise.all([BB.loadEnv('vale'), BB.loadEnv('ground'), BB.loadOther()]);
    if (document.fonts && document.fonts.load) await Promise.all(['800 20px Cinzel', '600 20px Cinzel', 'italic 600 20px "Cormorant Garamond"'].map((f) => document.fonts.load(f).catch(() => null))); // the first card must not fall back to another face
    const S = T.sc = {}, want = [];
    for (const c of T.cut) { const k = c.k === 'scene' ? c.s : c.k === 'land' ? 'land' : c.k === 'title' ? 'camp' : null; if (k && !want.includes(k)) want.push(k); }
    for (let i = 0; i < want.length; i++) { const mk = MAKE[want[i]]; if (!mk) throw new Error('no scene ' + want[i]); S[want[i]] = await mk(T.o.team || 5); if (T.o.clean && S[want[i]] && !S[want[i]].peaceful) S[want[i]].noBars = true; await step((i + 1) / (want.length + 1)); }
    if (T.cut.some((c) => c.k === 'art')) BB.Opening.hold();
    if (T.cut.some((c) => c.k === 'summon')) { // the summoning: a Legendary hero of the roster
      const tiers = BB.heroTiers(BB.ROSTER), top = tiers[tiers.length - 1];
      const h = BB.heroFromEntry(BB.newSave(Date.now()), Object.assign({}, top.heroes[0], { rarity: 3 })); h.stars = 5;
      await BB.loadHeroes([h]); T.hero = h;
    }
    await step(1);
  }
  function timeline() {
    T.segs = []; T.cues = []; let t = 0;
    const cue = (at, fn) => T.cues.push([at, fn]), C = T.cut;
    C.forEach((c, i) => {
      const sg = Object.assign({ t0: t, dur: c.d || c.b * BEAT }, c); T.segs.push(sg);
      if (c.k === 'art') { // the film's own sounds for the shot, at the film's own moments
        const A = ART[c.a], from = c.from || 0, sp = c.speed || 1; sg.sh = Object.assign({}, A.sh, c.sh); sg.at = (A.at || []).map((x) => (x - from) / sp).filter((x) => x >= 0 && x < sg.dur);
        if (!c.quiet) for (const [ft, s] of A.cues || []) { const at = (ft - from) / sp; if (at >= -0.05 && at < sg.dur - 0.05) cue(t + Math.max(0, at), () => fire(s)); }
      }
      else if (c.quiet) { /* only what the segment asks for itself */ }
      else if (c.k === 'summon') cue(t, () => BB.score('shimmer'));
      else if (c.k === 'black' || c.k === 'card') { cue(t, () => { BB.music(null); BB.score('boom'); }); if (c.k === 'black') cue(t + sg.dur - Math.min(2.05, sg.dur * 0.8), () => BB.score('riser', Math.min(2, sg.dur * 0.8))); }
      else if (c.k === 'title') { cue(t, () => { BB.music(null); BB.score('braam', 1.2); BB.score('shimmer'); BB.sfx('boom'); }); cue(t + sg.dur - 3, () => BB.score('drone', false)); }
      else if (c.drums) { cue(Math.max(0, t - 0.1), () => BB.music(typeof c.drums === 'string' ? c.drums : 'boss')); cue(t, () => { BB.score('braam'); if (c.roar) BB.sfx('boss'); }); }
      else if (c.quick) cue(t, () => BB.score('tick', 1.6));
      else cue(t, () => { BB.score('hit', c.flash ? 1 : 0.6); if (c.horn) BB.score('horn'); });
      for (const [at, s] of c.cues || []) cue(t + at, () => fire(s));
      if (c.quick && C[i + 1] && C[i + 1].k === 'title') cue(t, () => BB.score('riser', BEAT * 0.95));
      t += sg.dur;
    });
    T.cues.sort((a, b) => a[0] - b[0]); T.total = t;
  }

  // ---------------------------------------------------------------- play, stop
  let cv = null, g = null;
  T.play = async function (done, opts) {
    if (T.on) return; opts = opts || {};
    Object.assign(T, { on: true, loading: true, done, t: 0, cur: -1, cueI: 0, record: !!opts.record, prog: 0, prime: true, o: opts, cut: opts.cut || CUT });
    BEAT = 60 / (opts.bpm || 118);
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
    closeReveal(); T.on = false; T.loading = false; T.sc = {}; T.hero = null; showcase = null; BB.Opening.drop();
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
    return size;
  }
  function gold(y, size) { const gr = g.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.5); gr.addColorStop(0, '#fffbe8'); gr.addColorStop(0.45, '#ffd27e'); gr.addColorStop(1, '#b9772a'); return gr; }
  const band = (y, half, w, rgb) => { const gr = g.createLinearGradient(0, y - half, 0, y + half); gr.addColorStop(0, 'rgba(' + rgb + ',0)'); gr.addColorStop(0.5, 'rgba(' + rgb + ',0.62)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, y - half, w, half * 2); };
  function caption(text, lt, dur, w, h, tall) { // a line over the lower third
    const a = cl((lt - 0.12) / 0.3) * cl((dur - lt) / 0.22); if (a <= 0) return;
    const size = tall ? w * 0.06 : Math.min(w * 0.04, h * 0.066), y = h * (tall ? 0.77 : 0.8), k = cl(lt / dur);
    g.save(); g.globalAlpha = a; band(y, size * 1.7, w, '0,0,0');
    spaced(text.toUpperCase(), w / 2, y, size, size * (tall ? 0.12 : 0.2 + 0.07 * k), { fill: gold(y, size), max: w * 0.9 });
    const rw = w * (0.1 + 0.05 * k) * (tall ? 2 : 1), ry = y + size * 0.95; g.fillStyle = 'rgba(255,206,120,0.7)'; g.fillRect(w / 2 - rw, ry, rw * 2, Math.max(1, h * 0.0022));
    g.restore();
  }
  function hook(lines, lt, dur, w, h, tall, at) { // the line that stops a thumb: big, at the top, slammed in a line at a time
    const L = Array.isArray(lines) ? lines : String(lines).split('\n'), size = tall ? w * 0.098 : Math.min(w * 0.058, h * 0.1), y0 = h * (at !== undefined ? at : tall ? 0.15 : 0.2), out = cl((dur - lt) / 0.2);
    L.forEach((s, i) => { const t0 = 0.08 + i * 0.32, p = cl((lt - t0) / 0.14); if (p <= 0) return; const pop = 1 + 1.1 * Math.pow(1 - p, 2), y = y0 + i * size * 1.22;
      g.save(); g.globalAlpha = p * out; if (i === 0) band(y0 + (L.length - 1) * size * 0.61, size * (1.3 + L.length * 0.62), w, '0,0,0');
      spaced(s.toUpperCase(), w / 2, y, size * pop, size * 0.08, { fill: i === L.length - 1 ? gold(y, size) : '#f4efe2', max: w * 0.92, edge: 0.12 }); g.restore(); });
  }
  const shake = (lt, at, amp) => { let x = 0, y = 0; for (const a of at || []) { const d = lt - a; if (d >= 0 && d < 0.5) { const q = (1 - d / 0.5) ** 2 * amp; x += Math.sin(d * 97) * q; y += Math.cos(d * 131) * q; } } return [x, y]; };

  // ---------------------------------------------------------------- one frame
  T.frame = function (dt, ctx, W, H, dpr, z0) {
    const w = Math.round(cv.clientWidth * Math.min(2, window.devicePixelRatio || 1)), h = Math.round(cv.clientHeight * Math.min(2, window.devicePixelRatio || 1)), tall = h > w * 1.2;
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
      for (const k in T.sc) { const sc = T.sc[k]; if (!sc || k === 'camp' || k === 'land') continue; BB.tintLazy = false; sc.cam.zoom = z0; sc.renderField(ctx, W, H, dpr); }
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
      if (sg.k === 'scene' && T.sc[sg.s]) { T.sc[sg.s].fireMode = sg.fire || null; T.sc[sg.s].fireT = sg.fireAt === undefined ? 0.1 : sg.fireAt; }
      T.cur = i;
    }
    // ---- the picture
    const sc = sg.k === 'scene' ? T.sc[sg.s] : sg.k === 'land' ? T.sc.land : sg.k === 'title' ? T.sc.camp : null;
    if (sc) {
      const z = z0 * (tall ? 2.25 : 1) * lerp(sg.z ? sg.z[0] : 0.92, sg.z ? sg.z[1] : 1.02, sg.k === 'title' ? cl(lt / sg.dur) : k);
      if (sg.k === 'land') { const R = sc.map.road, f = lerp(18, 128, ease(k)), a = R[Math.floor(f)], b = R[Math.min(R.length - 1, Math.floor(f) + 1)], q = f - Math.floor(f); sc.cam.x = lerp(a.x, b.x, q); sc.cam.y = lerp(a.y, b.y, q); sc.cam.zoom = z; }
      else if (sc.fixCam) { const d = (k - 0.5) * 1.1; sc.cam.x = sc.fixCam.x + d; sc.cam.y = sc.fixCam.y - d; sc.cam.zoom = z; sc.zoomK = sc.zoomTarget = 1; }   // a place of the camp: a slow pan across it
      else if (sc.peaceful) { const c = sc.map.w / 2; sc.cam.x = c - 0.9 + (sg.k === 'title' ? 0.5 + k * 0.5 : k * 1.2); sc.cam.y = c + 0.5; sc.cam.zoom = z; }
      else { sc.cam.zoom = z * (sc.zoomK || 1); if (sc.tick) sc.tick(dt); }
      sc.update(dt, null); sc.render(ctx, W, H, dpr);
    } else if (sg.k === 'art') { // a shot of the opening film; on a tall screen, a crop of its wide frame
      const ft = (sg.from || 0) + lt * (sg.speed || 1), fk = cl(ft / sg.sh.dur), AW = tall ? Math.round(H * 16 / 9) : W, px = Array.isArray(sg.px) ? lerp(sg.px[0], sg.px[1], ease(k)) : sg.px === undefined ? 0.5 : sg.px, sh = shake(lt, sg.at, H * 0.012);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.translate(Math.round(-Math.max(0, Math.min(AW - W, px * AW - W / 2)) + sh[0]), Math.round(sh[1]));
      BB.Opening[sg.a](ctx, AW, H, sg.sh, fk, ft); ctx.restore();
    }
    else black();
    if (sg.k === 'summon') UI.revealRender(dt);
    // ---- over it
    const bar = tall ? 0 : Math.round(h * (T.o.bars === undefined ? 0.105 : T.o.bars));
    if (sg.lines) for (const [t0, t1, s2] of sg.lines) { const la = cl((lt - t0) / 0.5) * cl((t1 - lt) / 0.45); if (la > 0) { g.globalAlpha = la; const size = tall ? w * 0.062 : Math.min(w * 0.036, h * 0.062), y = h * (sg.lineAt !== undefined ? sg.lineAt : tall ? 0.13 : 0.24); band(y, size * 1.6, w, '0,0,0'); spaced(s2, w / 2, y, size, 1, { font: TEXT, w: 600, it: 1, fill: '#e9e2d0', max: w * 0.92 }); g.globalAlpha = 1; } }
    if (sg.k === 'black') { const a = cl(lt / 0.5) * cl((sg.dur - lt) / 0.3), size = tall ? w * 0.074 : Math.min(w * 0.04, h * 0.07), L = String(sg.big).split('\n'); g.globalAlpha = a; L.forEach((s, n) => spaced(s.toUpperCase(), w / 2, h / 2 + (n - (L.length - 1) / 2) * size * 1.5, size, size * (0.22 + 0.1 * k), { fill: '#e9e2d0', edge: 0, max: w * 0.88 })); g.globalAlpha = 1; }
    if (sg.k === 'card') { // the studio's card
      const a = cl(lt / 0.3) * cl((sg.dur - lt) / 0.35), size = tall ? w * 0.07 : Math.min(w * 0.044, h * 0.078); g.globalAlpha = a;
      spaced(String(sg.big || 'BLEDINK STUDIOS').toUpperCase(), w / 2, h * 0.485, size, size * (0.42 + 0.08 * k), { fill: '#efe9da', edge: 0, max: w * 0.86 });
      g.fillStyle = 'rgba(255,206,120,0.75)'; g.fillRect(w / 2 - size * 2.2 * cl(lt / 0.8), h * 0.485 + size * 0.95, size * 4.4 * cl(lt / 0.8), Math.max(1, h * 0.0018));
      if (sg.sub) spaced(String(sg.sub).toUpperCase(), w / 2, h * 0.485 + size * 1.75, size * 0.4, size * 0.3, { w: 600, fill: '#b9ae93', edge: 0 }); g.globalAlpha = 1; }
    if (sg.cap) caption(sg.cap, lt, sg.dur, w, h, tall);
    if (sg.hook) hook(sg.hook, lt, sg.dur, w, h, tall, sg.hookAt);
    if (sg.name) { // the boss: his name slammed in, low on the screen
      const a = cl((lt - 0.5) / 0.14) * cl((Math.min(4.6, sg.dur) - lt) / 0.4);
      if (a > 0) {
        const pop = 1 + 1.3 * Math.pow(1 - cl((lt - 0.5) / 0.18), 2), size = (tall ? w * 0.105 : Math.min(w * 0.062, h * 0.105)) * pop, x = w * 0.5, y = h * 0.74;
        g.save(); g.globalAlpha = a; band(y, size * 1.6, w, '20,0,0');
        const red = g.createLinearGradient(0, y - size / 2, 0, y + size / 2); red.addColorStop(0, '#fff0e6'); red.addColorStop(0.5, '#ff9a80'); red.addColorStop(1, '#b3261c');
        spaced(sg.name.toUpperCase(), x, y, size, size * (tall ? 0.06 : 0.16), { fill: red, max: w * 0.92 });
        g.restore();
      }
    }
    if (sg.k === 'title') {
      const fade = cl((sg.dur - lt) / 1.1);
      g.fillStyle = 'rgba(4,5,9,' + (0.66 * cl(lt / 0.3)).toFixed(3) + ')'; g.fillRect(0, 0, w, h);
      g.save(); g.translate(w / 2, h * 0.46); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,196,110,0.05)'; // slow rays behind the name
      for (let n = 0; n < 14; n++) { const a = n / 14 * Math.PI * 2 + T.t * 0.06, r = Math.max(w, h); g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - 0.05) * r, Math.sin(a - 0.05) * r); g.lineTo(Math.cos(a + 0.05) * r, Math.sin(a + 0.05) * r); g.closePath(); g.fill(); }
      g.restore(); g.globalCompositeOperation = 'lighter'; BB.drawGlow(g, '#ffb347', w / 2, h * 0.46, tall ? w * 0.9 : w * 0.5, tall ? h * 0.2 : h * 0.3, 0.35); g.globalCompositeOperation = 'source-over';
      const pop = 1 + 1.5 * Math.pow(1 - cl(lt / 0.22), 2), base = tall ? w * 0.096 : Math.min(w * 0.082, h * 0.17), size = base * pop * (1 + lt * 0.006), y = h * 0.43;
      spaced('BANNERBORN', w / 2, y, size, size * (tall ? 0.1 : 0.2), { fill: gold(y, size), edge: 0.07 });
      const ta = cl((lt - 1.1) / 0.6); if (ta > 0) {
        g.globalAlpha = ta; const s2 = tall ? w * 0.042 : Math.min(w * 0.021, h * 0.036), ty = y + base * (tall ? 1.05 : 0.82), tag = ['RAISE YOUR BANNER', 'EARN YOUR HEROES', 'SHUT THE GRAVEGATES'];
        g.fillStyle = 'rgba(255,206,120,0.8)'; g.fillRect(w / 2 - w * (tall ? 0.32 : 0.2) * ta, ty - s2 * 1.5, w * (tall ? 0.64 : 0.4) * ta, Math.max(1, h * 0.002));
        if (tall) tag.forEach((s, n) => spaced(s, w / 2, ty + n * s2 * 1.7, s2, s2 * 0.3, { w: 600, fill: '#e6d7b0', edge: 0.14, max: w * 0.9 }));
        else spaced(tag.join('  ·  '), w / 2, ty, s2, s2 * 0.3, { w: 600, fill: '#e6d7b0', edge: 0.14, max: w * 0.9 });
        g.globalAlpha = 1;
      }
      const brand = T.o.brand, ba = cl((lt - 1.9) / 0.6); // who made it, and (a promotional cut) when
      if (brand && ba > 0) { g.globalAlpha = ba; const s3 = tall ? w * 0.044 : Math.min(w * 0.0205, h * 0.037), by = h * (tall ? 0.7 : 0.755);
        spaced(String(brand).toUpperCase(), w / 2, by, s3, s3 * 0.42, { w: 800, fill: '#f1ead8', edge: 0.16, max: w * 0.9 });
        if (sg.soon) spaced(String(sg.soon).toUpperCase(), w / 2, by + s3 * 2.1, s3 * 0.82, s3 * 0.5, { w: 600, fill: gold(by + s3 * 2.1, s3), edge: 0.16, max: w * 0.9 }); g.globalAlpha = 1; }
      if (fade < 1) { g.fillStyle = 'rgba(0,0,0,' + (1 - fade).toFixed(3) + ')'; g.fillRect(0, 0, w, h); }
    }
    let fl = 0; for (const a of sg.at || []) { const d = lt - a; if (d >= 0 && d < 0.45) fl = Math.max(fl, Math.pow(1 - d / 0.45, 2) * 0.85); } // the film's own flashes
    if (sg.flash || sg.k === 'title') fl = Math.max(fl, Math.pow(1 - cl(lt / 0.16), 2));
    else if (sg.quick || (sg.k === 'scene' && !sg.cap && !sg.hook)) fl = Math.max(fl, (1 - cl(lt / 0.07)) * 0.5);
    if (fl > 0.01) { g.fillStyle = 'rgba(255,244,220,' + fl.toFixed(3) + ')'; g.fillRect(0, 0, w, h); }
    if (sg.fadeIn) { const f = 1 - cl(lt / sg.fadeIn); if (f > 0.01) { g.fillStyle = 'rgba(0,0,0,' + f.toFixed(3) + ')'; g.fillRect(0, 0, w, h); } }
    if (sg.fadeOut) { const f = 1 - cl((sg.dur - lt) / sg.fadeOut); if (f > 0.01) { g.fillStyle = 'rgba(0,0,0,' + f.toFixed(3) + ')'; g.fillRect(0, 0, w, h); } }
    if (bar) { g.fillStyle = '#000'; g.fillRect(0, 0, w, bar); g.fillRect(0, h - bar, w, bar); } // the letterbox, over everything
  };
})();
