/*
 * Tower of Wishes — sprite characters (PNG sprite sheets + JSON frame data).
 *
 * Each character has a manifest (assets/characters/<id>/<id>.json): the official base
 * sprite, the anchor (feet, in pixels), the facing directions it is drawn in, mirrors,
 * and its animations. An animation is one transparent PNG sheet plus a JSON frame file
 * (TexturePacker "JSON hash"); frames are named <anim>_<DIR>_<NNN> (e.g. idle_SE_003).
 * The format is described in docs/SPRITES.md.
 *
 * Pure part (Node-testable): direction from facing + camera angle, frame lookup, and an
 * animator that crossfades between states (and plays a transition clip when the manifest
 * has one). Browser part: loading manifests and images, and drawing a frame.
 *
 * Nothing here changes how fights or scenes are drawn yet: characters keep their
 * procedural bodies until their animations arrive and are switched on.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TowSprites = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TAU = Math.PI * 2;
  // Eight facings, in order of increasing screen angle starting from "toward the camera".
  const DIRS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];

  // The direction a unit is seen from. facing: world radians (the sim's u.facing);
  // camAng: the camera's turn (V.cam.ang). Screen angle PI/2 is facing the viewer (S).
  function dirFor(facing, camAng) {
    const a = facing + (camAng || 0);
    const k = Math.round((((a - Math.PI / 2) % TAU) + TAU) % TAU / (Math.PI / 4)) % 8;
    return DIRS[k];
  }

  // Which drawn direction to use, and whether to flip it, for an animation's frames.
  function resolveDir(man, anim, dir) {
    const has = (d) => !!(anim && anim.frames && anim.frames[d] && anim.frames[d].length);
    if (has(dir)) return { dir, flip: false };
    const m = man.mirror && man.mirror[dir];
    if (m && has(m)) return { dir: m, flip: true };
    // Nearest drawn direction round the circle (then its mirror).
    const i = DIRS.indexOf(dir);
    for (let step = 1; step <= 4; step++) {
      for (const d of [DIRS[(i + step) % 8], DIRS[(i + 8 - step) % 8]]) {
        if (has(d)) return { dir: d, flip: false };
        const mm = man.mirror && man.mirror[d];
        if (mm && has(mm)) return { dir: mm, flip: true };
      }
    }
    return null;
  }

  // Frame rectangles from a TexturePacker JSON hash (or array), grouped by direction.
  // Returns { S: [frame, ...], ... } where frame = { x, y, w, h, ox, oy, sw, sh, dur }.
  // Frames are named <anim>_<DIR>_<NNN>; a sheet drawn in one direction only may use any
  // name ending in _<NNN> (e.g. frame_007) when `dir` says which direction it is.
  // `duration` (ms) per frame is kept as dur (seconds).
  function parseFrames(data, animName, dir) {
    const out = {};
    const list = Array.isArray(data.frames) ? data.frames.map((f) => [f.filename, f]) : Object.entries(data.frames || {});
    const re = new RegExp('^' + animName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_([NSEW]{1,2})_(\\d+)');
    for (const [name, f] of list) {
      const nm = String(name).replace(/\.png$/i, '');
      let m = re.exec(nm);
      if (!m && dir) { const k = /(\d+)$/.exec(nm); if (k) m = [nm, dir, k[1]]; }
      if (!m) continue;
      const r = f.frame, src = f.spriteSourceSize || { x: 0, y: 0 }, size = f.sourceSize || { w: r.w, h: r.h };
      (out[m[1]] = out[m[1]] || []).push({ n: +m[2], x: r.x, y: r.y, w: r.w, h: r.h, ox: src.x, oy: src.y, sw: size.w, sh: size.h, rotated: !!f.rotated, dur: f.duration > 0 ? f.duration / 1000 : null });
    }
    for (const d of Object.keys(out)) out[d].sort((a, b) => a.n - b.n);
    return out;
  }

  // Frame index at time t (seconds): loops, or holds the last frame. Uses each frame's own
  // duration from the JSON when it has one, else the animation's fps.
  function frameIndex(anim, n, t, frames) {
    t = Math.max(0, t);
    if (frames && frames.length === n && frames[0].dur) {
      const total = frames.reduce((a, f) => a + (f.dur || 0), 0);
      if (anim.loop !== false) t %= total; else if (t >= total) return n - 1;
      for (let i = 0; i < n; i++) { t -= frames[i].dur; if (t < 0) return i; }
      return n - 1;
    }
    const i = Math.floor(t * (anim.fps || 12));
    return anim.loop === false ? Math.min(n - 1, i) : i % n;
  }
  function duration(anim, n, frames) { return frames && frames[0] && frames[0].dur ? frames.reduce((a, f) => a + (f.dur || 0), 0) : n / (anim.fps || 12); }

  // The sim state a unit is in -> the animation to play, falling back toward 'base'.
  const STATE_ANIM = {
    idle: ['idle', 'base'], circle: ['walk', 'idle', 'base'], move: ['run', 'walk', 'idle', 'base'], opener: ['run', 'walk', 'idle', 'base'],
    attack: ['attack', 'idle'], parry: ['block', 'idle'], dodge: ['dodge', 'run', 'idle'],
    hurt: ['hit', 'idle'], stagger: ['hit', 'idle'], down: ['down', 'hit', 'idle'], out: ['ko', 'down', 'idle'],
    cast: ['cast', 'idle'], recover: ['idle'], distracted: ['idle'], pickup: ['idle'],
  };
  function animFor(man, state) {
    const opts = (man.stateMap && man.stateMap[state]) || STATE_ANIM[state] || ['idle'];
    for (const a of [].concat(opts)) if (man.animations[a]) return a;
    return null; // no animation yet: draw the base sprite (or keep the procedural body)
  }

  // An animator per unit: play(name) switches state; a transition clip plays first if the
  // manifest has one ("idle>run": "idle_to_run"); otherwise the old pose fades out over
  // `blend` seconds while the new one fades in. sample() lists what to draw this frame.
  function animator(man) {
    return { man, cur: null, t: 0, prev: null, prevT: 0, fade: 0, fadeDur: 0, then: null };
  }
  function play(A, name, opts) {
    if (!name || name === A.cur || (A.then && A.then === name)) return;
    const tr = A.cur && A.man.transitions && A.man.transitions[A.cur + '>' + name];
    const next = tr && A.man.animations[tr] ? tr : name;
    A.prev = A.cur; A.prevT = A.t;
    A.cur = next; A.t = 0;
    A.then = next === name ? null : name;
    const anim = A.man.animations[next];
    A.fadeDur = A.prev ? ((opts && opts.blend != null) ? opts.blend : anim && anim.blend != null ? anim.blend : A.man.blend != null ? A.man.blend : 0.12) : 0;
    A.fade = 0;
  }
  function advance(A, dt) {
    A.t += dt; A.prevT += dt; A.fade += dt;
    if (A.then) {
      const anim = A.man.animations[A.cur];
      const fl = anim && anim.frames ? Object.values(anim.frames)[0] : null;
      if (!anim || !fl || A.t >= duration(anim, fl.length, fl)) { const to = A.then; A.then = null; A.prev = A.cur; A.prevT = A.t; A.cur = to; A.t = 0; A.fade = 0; A.fadeDur = 0.06; }
    }
  }
  // [{ anim, dir, flip, frame, alpha }] — the outgoing pose under the incoming one.
  function sample(A, dir) {
    const out = [];
    const pick = (name, t, alpha) => {
      const anim = name && A.man.animations[name];
      if (!anim || alpha <= 0) return;
      const r = resolveDir(A.man, anim, dir);
      if (!r) return;
      const fr = anim.frames[r.dir];
      out.push({ anim: name, dir: r.dir, flip: r.flip, frame: fr[frameIndex(anim, fr.length, t, fr)], alpha });
    };
    const k = A.fadeDur > 0 ? Math.min(1, A.fade / A.fadeDur) : 1;
    if (k < 1) pick(A.prev, A.prevT, 1 - k);
    pick(A.cur, A.t, k < 1 ? k : 1);
    return out;
  }

  // ------------------------------------------------------------ browser: load and draw
  const registry = {};   // id -> manifest (with images)
  const byKey = {};      // sim/look key -> id
  const isBrowser = typeof window !== 'undefined' && typeof Image !== 'undefined';
  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('sprite image failed: ' + src)); im.src = src; });
  }
  // Register a manifest (already parsed). dir: folder the manifest lives in.
  function register(man, dir) {
    man.dir = dir || man.dir || '';
    man.animations = man.animations || {};
    registry[man.id] = man;
    for (const k of man.simKeys || [man.id]) byKey[k] = man.id;
    return man;
  }
  async function load(url) {
    const dir = url.slice(0, url.lastIndexOf('/') + 1);
    const man = register(await (await fetch(url)).json(), dir);
    if (isBrowser) {
      man.baseImage = await loadImage(dir + man.base.image);
      for (const [name, a] of Object.entries(man.animations)) {
        // One sheet per drawn direction ("sheets": [...]), or a single sheet on the animation.
        const sheets = a.sheets || (a.sheet ? [a] : []);
        a.frames = {};
        await Promise.all(sheets.map(async (sh) => {
          const [img, data] = await Promise.all([loadImage(dir + sh.sheet), fetch(dir + sh.data).then((r) => r.json())]);
          const fr = parseFrames(data, sh.prefix || a.prefix || name, sh.dir || a.dir);
          for (const [d, list] of Object.entries(fr)) {
            for (const f of list) bindFrame(man, a, sh, f, img);
            a.frames[d] = list;
          }
        }));
      }
      addBase(man);
    }
    man.ready = true;
    return man;
  }
  // Each frame carries its sheet, anchor (feet), figure height and sheet scale, so the
  // directions of one animation can come from differently sized sheets.
  function bindFrame(man, a, sh, f, img) {
    const an = sh.anchor || a.anchor || man.base.anchor;
    f.img = img; f.ax = an[0]; f.ay = an[1];
    f.fig = sh.figureHeightPx || a.figureHeightPx || man.base.figureHeightPx;
    f.ss = sh.sheetScale || a.sheetScale || 1;
    return f;
  }
  // The first of `names` drawn in this direction (or its mirror); else the first that exists.
  function pickAnim(man, names, dir) {
    let first = null;
    for (const n of names) {
      const a = man.animations[n];
      if (!a || !a.frames) continue;
      first = first || n;
      if ((a.frames[dir] && a.frames[dir].length) || (man.mirror && man.mirror[dir] && a.frames[man.mirror[dir]])) return n;
    }
    return first;
  }

  // The official base sprite as a one-frame pose ('base'): standing still, front view.
  function addBase(man) {
    if (!man.baseImage || man.animations.base) return;
    const b = man.base;
    const a = { fps: 1, frames: {} };
    a.frames[b.facing || 'S'] = [bindFrame(man, a, b, { n: 0, x: 0, y: 0, w: b.size[0], h: b.size[1], ox: 0, oy: 0, sw: b.size[0], sh: b.size[1] }, man.baseImage)];
    man.animations.base = a;
  }
  function loadAll(urls) {
    return Promise.all(urls.map((u) => load(u).catch((e) => { console.warn(e.message || e); return null; })));
  }
  function get(idOrKey) { return registry[idOrKey] || registry[byKey[idOrKey]] || null; }

  // A sheet page filled with one flat colour where it has pixels: the ink outline and the
  // arena's shade are drawn with it (made once per page and colour).
  const flats = new Map();
  function flat(img, col) {
    let m = flats.get(img);
    if (!m) { m = {}; flats.set(img, m); }
    if (m[col]) return m[col];
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    return (m[col] = c);
  }
  // Draw one sampled frame with its feet on (x, y), the figure `heightPx` tall on screen.
  // look (optional): { ink: outline width in screen px, shade: 0..1, shadeCol } — fits the
  // pixel figure into the painted arenas (their ink lines and their light).
  function drawFrame(ctx, man, s, x, y, heightPx, look) {
    const f = s.frame;
    if (!f || !f.img) return;
    const k = heightPx / f.fig, ss = f.ss; // the shipped sheet may be smaller than the JSON's pixels
    ctx.save();
    ctx.globalAlpha *= s.alpha;
    if (man.pixel) ctx.imageSmoothingEnabled = false; // pixel art stays crisp when scaled
    ctx.translate(x, y);
    if (s.flip) ctx.scale(-1, 1);
    const sx = f.x * ss, sy = f.y * ss, sw = f.w * ss, sh = f.h * ss, dx = (f.ox - f.ax) * k, dy = (f.oy - f.ay) * k, dw = f.w * k, dh = f.h * k;
    if (look && look.ink && s.alpha > 0.5) {
      const ink = flat(f.img, look.inkCol || '#120c0e'), o = look.ink;
      for (const [ax, ay] of [[-o, 0], [o, 0], [0, -o], [0, o]]) ctx.drawImage(ink, sx, sy, sw, sh, dx + ax, dy + ay, dw, dh);
    }
    ctx.drawImage(f.img, sx, sy, sw, sh, dx, dy, dw, dh);
    if (look && look.shade > 0.01) {
      ctx.globalAlpha *= look.shade;
      ctx.drawImage(flat(f.img, look.shadeCol || '#0a0812'), sx, sy, sw, sh, dx, dy, dw, dh);
    }
    ctx.restore();
  }
  // The base sprite (front view), feet on (x, y).
  function drawBase(ctx, man, x, y, heightPx, flip) {
    if (!man.baseImage) return;
    const b = man.base, k = heightPx / b.figureHeightPx;
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(man.baseImage, -b.anchor[0] * k, -b.anchor[1] * k, b.size[0] * k, b.size[1] * k);
    ctx.restore();
  }

  // The anime-style Eiryn (assets/characters/eiryn/) is retired: every character is now
  // pixel art from the Character Creator (below). Her files stay for portraits.
  const MANIFESTS = [];

  // ------------------------------------------------------------ pixel characters
  // Character Creator 2D Fantasy exports: art_source/characters/<set>/<Clip>.png, packed by
  // tools/pack_pixel.py into assets/pixel/<set>.json + pages. Every set has the same clips
  // in eight directions; the game maps them onto the names the animator uses.
  const PIXEL_ROOT = 'assets/pixel/';
  const PIXEL_FIG = 44; // a creator figure stands about 44 px tall in its 128 px cell
  // name -> [creator clip, fps, loops]
  const PIXEL_CLIPS = {
    idle: ['Idle', 8], idle_combat: ['Idle4', 8], idle_alt: ['Idle2', 8], idle_nervous: ['Idle3', 8],
    walk: ['Walk', 12], run: ['Run', 16], strafe_l: ['StrafeLeft', 12], strafe_r: ['StrafeRight', 12], back: ['RunBackwards', 14],
    dodge: ['Rolling', 30, false], hit: ['TakeDamage', 20, false], down: ['Slide', 12, false], ko: ['Die', 14, false],
    victory: ['Taunt', 10], crouch: ['CrouchIdle', 8], creep: ['CrouchRun', 12], point: ['Attack5', 14, false],
    heavy: ['Special1', 12, false], leap: ['Attack4', 12, false], kick: ['Kick', 14, false],
  };
  // The creator's attack clips: wind-up frames, the contact frame, recovery.
  const PIXEL_PHASES = {
    Attack1: { windup: [0, 5], strike: [6, 6], recover: [7, 14] },
    Attack2: { windup: [0, 6], strike: [7, 7], recover: [8, 14] },
    Attack4: { windup: [0, 8], strike: [9, 9], recover: [10, 14] },
    Attack5: { windup: [0, 2], strike: [3, 3], recover: [4, 14] },
    Kick: { windup: [0, 6], strike: [7, 7], recover: [8, 14] },
    Special1: { windup: [0, 9], strike: [10, 10], recover: [11, 14] },
    Attack3: { windup: [0, 6], strike: [7, 7], recover: [8, 14] },
    Attack6: { windup: [0, 5], strike: [6, 6], recover: [7, 14] },
  };
  // Per set: its basic attacks (alternated through a combo), the cast clip, the stance it
  // waits in, and a size against the others (the broad bandit is wider than Kael).
  const PIXEL_SETS = {
    eiryn: { attacks: ['Attack5'], cast: 'Attack5' },
    bandit_broad: { attacks: ['Attack5'], scale: 1.15 },
    bandit_grabber: { attacks: ['Attack5'] },
    bandit_lookout: { stance: 'Idle3' },
    goblin_hexer: { attacks: ['Attack5'], cast: 'Attack5' },
    alric: { attacks: ['Attack5'] },
    alric_beast: { scale: 1.4 },
    // The party: Aerys fires light from her palms, Eloryn heals with both hands, Nox's daggers
    // chain three cuts, Braxen fights with his fists.
    aerys: { attacks: ['Attack5'], cast: 'Attack5', heavy: 'Attack3' },
    aerys_spear: { attacks: ['Attack6', 'Attack1'], heavy: 'Attack5' },
    eloryn: { attacks: ['Attack5'], cast: 'Attack3', heavy: 'Attack3' },
    nox: { attacks: ['Attack1', 'Attack2', 'Attack6'] },
    braxen: { attacks: ['Attack5', 'Attack1', 'Kick'] }, braxen_frost: { attacks: ['Attack5', 'Attack1', 'Kick'] },
    rival_kid: { scale: 0.9 }, hooded_follower: { scale: 0.9 },
    lyra: { attacks: ['Attack5'], cast: 'Attack3', heavy: 'Attack3' },
    cassius: { attacks: ['Attack1', 'Attack2', 'Kick'] },
    frost_assassin: { attacks: ['Attack1', 'Attack6'], cast: 'Attack3' },
    // Big ones (stand-ins built on the person body, scaled to the creature's size).
    ogre: { scale: 1.8, slam: 'Attack4' },
    sky_beast: { scale: 2.1 },
    nightcrawler: { scale: 1.5 },
    hamlet_predator: { scale: 1.1 },
    caged_creature: { scale: 1.5 },
    night_creature: { scale: 1.4 },
    black_knight: { scale: 1.3, attacks: ['Attack1', 'Attack2', 'Attack6'] },
    elder_dragon: { scale: 2.7, attacks: ['Attack1', 'Attack4'] },
    poacher: { attacks: ['Attack3'] },
    frost_knight_a: { attacks: ['Attack1', 'Attack2', 'Attack6'] }, frost_knight_b: { attacks: ['Attack6', 'Attack1', 'Attack2'] },
    master_knight: { scale: 1.15, attacks: ['Attack1', 'Attack2', 'Attack6'] }, thug_a: { attacks: ['Attack5'], scale: 1.1 },
    drowned_bell: { scale: 1.6 },
    golem_a: { scale: 1.5, attacks: ['Attack5', 'Attack4'] }, golem_b: { scale: 1.5, attacks: ['Attack5', 'Attack4'] },
  };
  // Sim / look key -> set. fight / scene: different sets in fights and staged scenes;
  // armed: the set once a fighter who starts unarmed has picked up a weapon.
  const PIXEL_CAST = {
    kael: { fight: 'kael_sword', scene: 'kael_unarmed' },
    eiryn: { set: 'eiryn', armed: 'eiryn_branch' }, eirynAsh: { set: 'eiryn' }, eirynMage: { set: 'eiryn' },
    alric: { set: 'alric' }, climber: { set: 'climber' }, shade: { set: 'fragment' },
    brute: { set: 'bandit_broad' }, knife: { set: 'bandit_knife' }, grabber: { set: 'bandit_grabber' }, lookout: { set: 'bandit_lookout' },
    spearwoman: { set: 'spearwoman' }, cook: { set: 'tavern_keeper' }, miller: { set: 'miller' },
    officer: { set: 'guard_officer' }, registrar: { set: 'registrar' }, evaluator: { set: 'evaluator' },
    goblin: { set: 'goblin' }, goblinSpear: { set: 'goblin_spear' }, goblinArcher: { set: 'goblin_archer' }, goblinHexer: { set: 'goblin_hexer' },
    // The goblins became skeleton raiders and the Ogre a skeleton warlord (the author, 2026-10-22).
    ogre: { set: 'ogre' }, goblinChief: { set: 'ogre' },
    aerys: { set: 'aerys' }, nox: { set: 'nox' }, eloryn: { set: 'eloryn' }, braxen: { set: 'braxen' },
    skyreaver: { set: 'sky_beast' }, veil: { set: 'night_creature', scale: 1.8 }, // Kharuun: a living shadow (fighters.js spriteLook), ~2.5x a person nightCreature: { set: 'nightcrawler' }, ruinBeast: { set: 'hamlet_predator' }, beast: { set: 'caged_creature' },
    // Cast of chapters still to come (their keys are ready for when the scenes are built).
    rival: { set: 'rival_kid' }, hooded: { set: 'hooded_follower' }, cassius: { set: 'cassius' }, lyra: { set: 'lyra' },
    lyraGolem: { set: 'golem_a' }, lyraGolem2: { set: 'golem_b' }, frostAssassin: { set: 'frost_assassin' },
    nightcrawler: { set: 'nightcrawler' }, cagedCreature: { set: 'caged_creature' }, hamletPredator: { set: 'hamlet_predator' },
    healingCreature: { set: 'night_creature' }, beastfolk: { set: 'beastfolk_m' }, beastfolkF: { set: 'beastfolk_f' },
    hamlet: { set: 'hamlet_people' }, citizen: { set: 'labyrinth_citizen' }, dealer: { set: 'demon_dealer' },
    swordsmith: { set: 'sword_smith' }, poacher: { set: 'poacher' }, blackKnight: { set: 'black_knight' }, elderDragon: { set: 'elder_dragon' },
    gothicKnight: { set: 'gothic_knight_a' }, gothicKnight2: { set: 'gothic_knight_b' },
    // Stand-ins recoloured from delivered sets (tools/pack_pixel.py DERIVED) until their own exports arrive.
    knightSword: { set: 'frost_knight_a' }, knightAxe: { set: 'frost_knight_a' }, knightFist: { set: 'frost_knight_a' },
    knightSpear: { set: 'frost_knight_b' }, knightTwin: { set: 'frost_knight_b' }, knightMaster: { set: 'master_knight' },
    thug: { pool: ['thug_a', 'thug_b'] }, echo: { set: 'echo' }, warden: { set: 'drowned_bell' }, adventurer: { set: 'guild_adventurer' }, braxenFrost: { set: 'braxen_frost' },
  };
  // Townsfolk (key 'patron'): named roles by id, else one of the town's people by id.
  // Stand-in sets recoloured from a delivered set (tools/pack_pixel.py DERIVED): set -> source.
  const PIXEL_DERIVED = { frost_knight_a: 'gothic_knight_a', frost_knight_b: 'gothic_knight_b', master_knight: 'black_knight', thug_a: 'bandit_broad', thug_b: 'bandit_knife', echo: 'fragment', drowned_bell: 'night_creature' };
  const PATRON_ROLES = { guard: 'guard_gate', merchant: 'merchant_recurring', shopkeeper: 'shopkeeper', keeper: 'tavern_keeper', grower: 'miller', victim: 'nox_target', smith: 'sword_smith' };
  const PATRON_POOLS = {
    erdra: ['erdra_m1', 'erdra_f1', 'erdra_m2', 'erdra_f2', 'erdra_vendor', 'erdra_baker', 'erdra_musician'],
    ashgate: ['ashgate_m1', 'ashgate_f1', 'ashgate_m2', 'ashgate_f2'],
  };
  const ERDRA_THEMES = { square: 1, rooftops: 1, summit: 1 }; // the city before the Reset
  // Sets fetched in the background at start, in story order, so the opening never waits.
  const PIXEL_EARLY = ['eiryn', 'alric', 'kael_unarmed', 'kael_sword', 'eiryn_branch', 'bandit_broad', 'bandit_knife',
    'bandit_grabber', 'bandit_lookout', 'climber', 'fragment', ...PATRON_POOLS.erdra, ...PATRON_POOLS.ashgate, 'spearwoman'];

  function hashStr(s) { let n = 0; for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 997; return n; }
  // Which pixel set draws this unit. ctx: { scene, theme }.
  function pixelSetFor(u, ctx) {
    if (u.key === 'patron') {
      const id = String(u.id || '');
      if (PATRON_ROLES[id]) return PATRON_ROLES[id];
      const pool = PATRON_POOLS[(ctx && ctx.town) || (ERDRA_THEMES[ctx && ctx.theme] ? 'erdra' : 'ashgate')];
      const m = /(\d+)$/.exec(id);
      return pool[(m ? Number(m[1]) : hashStr(id)) % pool.length];
    }
    const c = PIXEL_CAST[u.key];
    if (!c) return null;
    if (c.pool) { const id = String(u.id || ''), m = /(\d+)$/.exec(id); return c.pool[(m ? Number(m[1]) : hashStr(id)) % c.pool.length]; }
    if (c.armed && u.armed && u.def && u.def.startsUnarmed) return c.armed;
    if (c.scene && ctx && ctx.scene) return c.scene;
    return c.fight || c.set;
  }

  // Build a manifest the animator understands from a packed set.
  function pixelManifest(data, pages) {
    const cfg = PIXEL_SETS[data.id] || {};
    const man = { id: 'px:' + data.id, set: data.id, pixel: true, blend: 0, scale: cfg.scale || 1, animations: {}, mirror: {} };
    const build = (clip, fps, loop, phases) => {
      const src = data.anims[clip];
      if (!src) return null;
      const a = { clip, fps, loop: loop !== false, phases: phases || null, frames: {} };
      for (const [d, list] of Object.entries(src)) {
        let last = null;
        a.frames[d] = list.map((f, n) => {
          if (!f) return last; // an empty cell repeats the frame before it
          last = { n, img: pages[f[0]], x: f[1], y: f[2], w: f[3], h: f[4], ox: f[5], oy: f[6], ax: data.anchor[0], ay: data.anchor[1], fig: PIXEL_FIG, ss: 1 };
          return last;
        }).filter(Boolean);
      }
      return a;
    };
    for (const [name, [clip, fps, loop]] of Object.entries(PIXEL_CLIPS)) { const a = build(clip, fps, loop); if (a) man.animations[name] = a; }
    if (cfg.stance) man.animations.idle = man.animations.idle_combat = build(cfg.stance, 8);
    const atk = cfg.attacks || ['Attack1', 'Attack2'];
    man.attacks = [];
    atk.forEach((clip, i) => { const a = build(clip, 14, false, PIXEL_PHASES[clip]); if (a) { const n = i ? 'attack' + (i + 1) : 'attack'; man.animations[n] = a; man.attacks.push(n); } });
    const cast = build(cfg.cast || 'Attack5', 14, false, PIXEL_PHASES[cfg.cast || 'Attack5']);
    if (cast) man.animations.cast = cast;
    const heavy = build(cfg.heavy || 'Special1', 12, false, PIXEL_PHASES[cfg.heavy || 'Special1']);
    if (heavy) man.animations.heavy = heavy;
    if (cfg.slam) man.animations.slam = build(cfg.slam, 12, false, PIXEL_PHASES[cfg.slam]);
    if (man.animations.leap) man.animations.leap.phases = PIXEL_PHASES.Attack4;
    if (man.animations.kick) man.animations.kick.phases = PIXEL_PHASES.Kick;
    return man;
  }

  const pixelLoading = {};
  function loadPixel(set) {
    if (pixelLoading[set]) return pixelLoading[set];
    return (pixelLoading[set] = (async () => {
      const data = await (await fetch(PIXEL_ROOT + set + '.json')).json();
      const pages = isBrowser ? await Promise.all(data.pages.map((p) => loadImage(PIXEL_ROOT + p))) : data.pages.map(() => null);
      const man = register(pixelManifest(data, pages), PIXEL_ROOT);
      man.ready = true;
      return man;
    })().catch((e) => { console.warn('pixel set ' + set + ': ' + (e.message || e)); return null; }));
  }
  // The pixel set for a unit, if it has one and it has loaded (loading starts on first ask).
  function forUnit(u, ctx) {
    const set = pixelSetFor(u, ctx);
    if (!set) return get(u.key);
    const man = registry['px:' + set];
    if (man && man.ready) return man;
    loadPixel(set);
    return null;
  }
  function preloadPixel(sets) {
    // One at a time, so the first ones arrive first.
    return (sets || PIXEL_EARLY).reduce((p, set) => p.then(() => loadPixel(set)), Promise.resolve());
  }

  return {
    DIRS, MANIFESTS, STATE_ANIM, dirFor, resolveDir, parseFrames, frameIndex, animFor, pickAnim, bindFrame,
    animator, play, advance, sample, register, load, loadAll, get, drawFrame, drawBase, addBase,
    PIXEL_CAST, PIXEL_DERIVED, PIXEL_SETS, PIXEL_CLIPS, PIXEL_PHASES, PIXEL_EARLY, PATRON_POOLS, pixelSetFor, pixelManifest, loadPixel, forUnit, preloadPixel,
  };
});
