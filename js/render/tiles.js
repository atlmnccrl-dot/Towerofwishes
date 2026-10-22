/*
 * Tower of Wishes — pixel arenas (assets/tiles/, packed by tools/pack_tiles.py from the author's
 * tileset packs). Replaces world.js's painted dressing for every arena theme that has a recipe
 * below, once the tile atlas has loaded; themes without one keep the painted look.
 *
 *   ground   baked once per arena from 32 px tiles (grass, dirt, stone, planks...), laid under the
 *            camera with the same projection as everything else (so it turns and tilts with it);
 *            small flat details (tufts, pebbles, flowers) are baked into it.
 *   props    trees, rocks, logs, crates, walls... stand up at the arena's obstacles and around
 *            its edge, depth-sorted with the fighters; ones between the camera and a fighter fade.
 *   light    a colour grade per theme, a vignette, and pixel ambience (fireflies, leaves, motes).
 *
 * Art scale: one art pixel = TS character pixels (a creator figure is 44 px tall and 1.6 m).
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});
  const ROOT = 'assets/tiles/';
  const TS = 1.3;                    // tile art is drawn 1.3x the characters' pixel size
  const MPX = (1.6 / 44) * TS;       // metres per art pixel
  let atlas = null, pages = null, loading = null;
  function load() {
    if (loading) return loading;
    loading = (async () => {
      atlas = await (await fetch(ROOT + 'tiles.json')).json();
      pages = await Promise.all(atlas.pages.map((p) => new Promise((res, rej) => {
        const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('tiles page ' + p)); im.src = ROOT + p;
      })));
    })().catch((e) => { console.warn('pixel tiles: ' + (e.message || e)); atlas = null; pages = null; });
    return loading;
  }
  const ready = () => !!(atlas && pages);

  const G = (pre, n) => Array.from({ length: n }, (_, i) => pre + i);
  const GRASS = [0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => ['g_grass_' + i + '_0', 'g_grass_' + i + '_1']);
  const GRASS_FLOWERS = [0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => ['g_grass_' + i + '_2', 'g_grass_' + i + '_3']);
  const TUFTS = G('tuft_', 16);
  // ---------------------------------------------------------------- recipes
  // base / alt / path / edge: ground tiles (alt where the noise is high, path toward the exit,
  // edge outside the fighting ground). border: props round the outside; ring: props just inside
  // the edge; flat: details baked into the ground. obs: obstacle kind -> props.
  // grade: [r, g, b, a] colour laid over the scene; ambient: pixel fx drifting over it.
  const FOREST_BORDER = ['tree_dark_a', 'tree_dark_b', 'pine_a', 'pine_b', 'tree_a', 'tree_b', 'tree_c', 'tree_dark_a', 'pine_a'];
  const RECIPES = {
    forest: {
      base: GRASS, alt: GRASS_FLOWERS, altK: 0.62, path: ['g_trampled_dirt', 'g_dirt_1', 'g_dirt_2'], pathW: 1.6, edge: ['g_grass_dark_1', 'g_grass_dark_2'],
      border: FOREST_BORDER, borderN: 46, ring: ['shrub_a', 'shrub_b', 'bush_a', 'bush_c', 'fern_a', 'fern_b', 'reeds_a', 'mush_a', 'mush_c', 'rock_m1'], ringN: 16,
      flat: [...TUFTS, 'pebble_a', 'pebble_b', 'pebble_c', 'fern_c', 'fern_d', 'mush_b', 'mush_d'], flatN: 90,
      obs: { tree: ['tree_dark_a', 'tree_dark_b', 'tree_a'], rock: ['rock_big', 'rock_m2', 'rock_a'] },
      grade: [52, 38, 92, 0.2], ambient: ['fireflies', 'leaves'], dark: 0.55,
    },
    nightcamp: {
      base: GRASS, alt: ['g_grass_dark_1', 'g_grass_dark_2'], altK: 0.5, edge: ['g_grass_dark_1', 'g_grass_dark_2'],
      border: FOREST_BORDER, borderN: 40, ring: ['shrub_a', 'shrub_b', 'fern_a', 'rock_m1', 'rock_m3'], ringN: 12,
      flat: [...TUFTS, 'pebble_a', 'pebble_c'], flatN: 70,
      obs: { tree: ['tree_dark_a', 'tree_dark_b', 'pine_b'], overhang: ['rock_big'], fire: ['fv_log_pile'] },
      fires: ['fire'], grade: [16, 26, 70, 0.42], ambient: ['fireflies', 'embers'], dark: 0.7,
    },
    hill: {
      base: ['g_dirt_2', 'g_gravel', 'g_dirt_1'], alt: ['g_grass_3', 'g_grass_tall', 'g_grass_2'], altK: 0.55, path: ['g_trampled_dirt'], pathW: 1.8,
      edge: ['g_dirt_dark', 'g_gravel'], border: ['pine_a', 'pine_b', 'rock_big', 'rock_m2', 'tree_c', 'pine_a', 'rock_b'], borderN: 38,
      ring: ['rock_m1', 'rock_m3', 'shrub_s', 'bush_e', 'rock_c'], ringN: 14, flat: [...TUFTS.slice(0, 8), 'pebble_a', 'pebble_b', 'pebble_c', 'stone_a', 'stone_b'], flatN: 80,
      obs: { rock: ['rock_big', 'rock_a', 'rock_m2'], tree: ['pine_a', 'pine_b'] }, grade: [90, 70, 40, 0.1], ambient: ['motes'], dark: 0.5,
    },
    cave: {
      base: ['g_flagstone_dark', 'g_stone_floor', 'g_gravel'], alt: ['g_dirt_dark', 'g_gravel'], altK: 0.55, edge: ['g_dirt_dark'],
      border: ['rock_big', 'rock_dark', 'rock_m2', 'rock_m3', 'rock_big', 'cd_hanging_cage'], borderN: 30, ring: ['rock_m1', 'pebble_a', 'mush_e', 'cd_skull_on_pike'], ringN: 8,
      flat: ['pebble_a', 'pebble_b', 'pebble_c', 'stone_a', 'stone_b', 'brick_a', 'slabs'], flatN: 60,
      obs: { crate: ['crate', 'crate_b', 'cd_supply_cart'], basin: ['stone_circle'], rock: ['rock_big', 'rock_dark'] },
      torches: 4, grade: [8, 6, 22, 0.42], ambient: ['motes'], dark: 0.85,
    },
    road: {
      base: GRASS, alt: GRASS_FLOWERS, altK: 0.6, road: ['g_dirt_1', 'g_dirt_2', 'g_trampled_dirt'], roadW: 3.2, edge: ['g_grass_2', 'g_grass_3'],
      border: ['tree_a', 'tree_b', 'tree_c', 'bush_b', 'fv_fence_h', 'tree_gold_a', 'pine_a'], borderN: 32, ring: ['bush_a', 'bush_d', 'fv_fence_post', 'rock_m1', 'sign_e'], ringN: 10,
      flat: [...TUFTS, 'pebble_a', 'pebble_b'], flatN: 80, obs: { cart: ['fv_hand_cart'], rock: ['rock_a', 'rock_m2'], tree: ['tree_a', 'tree_b'] },
      grade: [80, 60, 30, 0.08], ambient: ['leaves'], dark: 0.45,
    },
    ruins: {
      base: ['g_flagstone_mossy', 'g_cobble_mossy', 'g_flagstone_2'], alt: GRASS, altK: 0.5, edge: GRASS,
      border: ['ruin_wall', 'ruin_pillar', 'pillar_broken', 'tree_gold_a', 'tree_gold_b', 'wall_moss_a', 'wall_moss_b', 'arch_a'], borderN: 30,
      ring: ['ruin_stone_a', 'ruin_stone_b', 'bush_gold', 'monolith_c', 'pillar_broken'], ringN: 12, flat: [...TUFTS, 'ruin_stone_c', 'brick_a', 'brick_b', 'slabs'], flatN: 70,
      obs: { wall: ['wall_moss_a', 'wall_moss_b', 'ruin_wall'], pillar: ['ruin_pillar', 'pillar'], rock: ['rock_big'] }, grade: [90, 60, 30, 0.12], ambient: ['leaves', 'motes'], dark: 0.5,
    },
    deep: null, // set below (cave)
    yard: {
      base: ['g_trampled_dirt', 'g_arena_sand'], alt: ['g_gravel'], altK: 0.6, edge: ['g_flagstone_1', 'g_flagstone_2', 'g_flagstone_3'],
      border: ['wall_a', 'wall_b', 'wall_c', 'cd_weapon_rack', 'cd_training_dummy', 'cd_banner_red', 'tree_c'], borderN: 26, ring: ['cd_hay_bale', 'barrel', 'crate'], ringN: 6,
      flat: ['pebble_a', 'pebble_b', 'stone_a'], flatN: 30, obs: { block: ['slabs', 'monolith_c', 'brick_a'], target: ['cd_archery_target'] },
      grade: [90, 70, 40, 0.06], ambient: [], dark: 0.4,
    },
    tavern: {
      base: ['g_wood_floor_h', 'g_wood_plank_h'], alt: ['g_wood_floor_h'], altK: 0.7, edge: ['g_wood_plank_h'], interior: true,
      border: ['cdw_wall_face_brick', 'cdw_wall_torch_1', 'cdw_wall_face_brick', 'cd_bookshelf', 'barrel', 'cdw_arched_window'], borderN: 22, ring: ['barrel', 'cd_chair_wood', 'crate_b', 'vase_a', 'pot'], ringN: 8,
      flat: [], flatN: 0, obs: { table: ['cd_banquet_table'], bar: ['cd_banquet_table'], hearth: ['cd_forge'] },
      fires: ['hearth'], grade: [110, 60, 20, 0.16], ambient: ['motes'], dark: 0.75,
    },
    guildhall: null, // set below (tavern, with banners)
    grassland: {
      base: ['g_grass_1', 'g_grass_2', 'g_grass_3', 'g_grass_tall'], alt: ['g_grass_autumn', ...GRASS_FLOWERS.slice(0, 4)], altK: 0.6, path: ['g_dirt_1'], pathW: 1.4, edge: ['g_grass_tall', 'g_grass_3'],
      border: ['tree_gold_a', 'tree_gold_b', 'bush_gold', 'tree_young', 'rock_big', 'tree_c'], borderN: 22, ring: ['bush_gold', 'rock_m1', 'ruin_stone_a'], ringN: 8,
      flat: [...TUFTS, 'pebble_b'], flatN: 90, obs: { carcass: ['rock_big'], marker: ['monolith_a'], wall: ['ruin_wall'], rock: ['rock_big', 'rock_a'] },
      grade: [100, 70, 60, 0.12], ambient: ['leaves'], dark: 0.4,
    },
    farmland: {
      base: ['g_dirt_dark', 'g_dirt_2'], alt: ['g_grass_autumn', 'g_dirt_1'], altK: 0.62, edge: ['g_dirt_dark', 'g_grass_autumn'],
      border: ['fv_fence_h', 'fv_tree_dead', 'fv_haystack', 'fv_fence_post', 'tree_gnarled', 'fv_tree_stump'], borderN: 28, ring: ['fv_fence_post', 'fv_tree_stump', 'rock_m3', 'tuft_3'], ringN: 8,
      flat: ['pebble_a', 'pebble_c', ...TUFTS.slice(8)], flatN: 60, obs: { well: ['fv_well'], fence: ['fv_fence_h'], scarecrow: ['fv_scarecrow'], carcass: ['rock_big'] },
      grade: [120, 50, 30, 0.2], ambient: ['ash', 'embers'], dark: 0.55,
    },
    shadowcity: {
      base: ['g_cobble', 'g_cobble_road', 'g_flagstone_dark'], alt: ['g_cobble_mossy', 'g_flagstone_dark'], altK: 0.6, edge: ['g_flagstone_dark'],
      border: ['cdw_wall_face_dark', 'cdw_wall_face_stone', 'fv_lamp_post', 'cdw_wall_face_dark', 'barrel', 'crate'], borderN: 30, ring: ['barrel', 'crate_b', 'fv_lantern'], ringN: 8,
      flat: ['pebble_a', 'brick_a', 'brick_b'], flatN: 30, obs: { wall: ['wall_a', 'wall_b'], crate: ['crate', 'crate_b'] },
      grade: [40, 20, 70, 0.32], ambient: ['motes'], dark: 0.75,
    },
    frosthall: {
      base: ['g_flagstone_1', 'g_marble_white', 'g_flagstone_2'], alt: ['g_marble_white'], altK: 0.6, edge: ['g_flagstone_dark'], interior: true,
      border: ['pillar', 'cdw_pillar', 'statue', 'pillar_broken', 'fv_tree_pine_snow'], borderN: 22, ring: ['stone_b', 'slabs'], ringN: 6, flat: ['stone_a', 'stone_b'], flatN: 20,
      obs: { pillar: ['pillar'], frozen: ['monolith_b'] }, grade: [120, 170, 230, 0.22], ambient: ['snow'], dark: 0.6,
    },
    offering: {
      base: ['g_marble_checker', 'g_marble_white'], alt: ['g_flagstone_warm'], altK: 0.7, edge: ['g_flagstone_dark'], interior: true,
      border: ['pillar', 'statue', 'cd_candelabra', 'cd_statue_knight', 'pillar'], borderN: 20, ring: ['cd_candelabra', 'vase_b'], ringN: 6, flat: [], flatN: 0,
      obs: { wheel: ['stone_circle'] }, grade: [120, 90, 40, 0.16], ambient: ['sparkles'], dark: 0.7,
    },
    calamity: {
      base: ['g_flagstone_dark', 'g_flagstone_1'], alt: ['g_floor_grate'], altK: 0.75, edge: ['g_flagstone_dark'], interior: true,
      sides: { west: ['g_moat_water_1', 'g_moat_water_2'], east: ['g_lava_pool'] },
      border: ['pillar', 'cdw_pillar', 'rock_dark', 'cd_brazier'], borderN: 18, ring: [], ringN: 0, flat: [], flatN: 0,
      obs: {}, grade: [90, 30, 30, 0.18], ambient: ['embers'], dark: 0.75,
    },
  };
  RECIPES.deep = Object.assign({}, RECIPES.cave, { grade: [6, 4, 18, 0.5], border: ['rock_dark', 'rock_big', 'rock_m2', 'rock_dark'] });
  RECIPES.guildhall = Object.assign({}, RECIPES.tavern, { border: ['cdw_wall_face_stone', 'cd_banner_blue', 'cdw_wall_face_stone', 'cd_bookshelf', 'cdw_arched_window', 'cd_weapon_rack'], grade: [70, 60, 50, 0.12], fires: [] });
  // Default obstacle props for any theme.
  const OBS = {
    tree: ['tree_a', 'tree_b'], rock: ['rock_big', 'rock_a', 'rock_m2'], crate: ['crate', 'crate_b'], basin: ['stone_circle'], cart: ['cd_supply_cart'],
    wall: ['wall_a', 'wall_moss_a'], pillar: ['pillar'], table: ['cd_banquet_table'], bar: ['cd_banquet_table'], hearth: ['cd_forge'], block: ['slabs'],
    target: ['cd_archery_target'], marker: ['monolith_a'], carcass: ['rock_big'], well: ['fv_well'], fence: ['fv_fence_h'], scarecrow: ['fv_scarecrow'],
    overhang: ['rock_big'], fire: ['fv_log_pile'], frozen: ['monolith_b'], wheel: ['stone_circle'], chimney: ['cdw_pillar'],
  };

  // ---------------------------------------------------------------- dressing
  function dressing(V, A) {
    const R = RECIPES[A.theme];
    if (!R || !ready()) return null;
    const { ctx, Sim } = V;
    const P = V.P;
    const rng = Sim.makeRng(7 + A.name.length * 13);
    const pick = (list) => list[Math.floor(rng() * list.length)];
    const spr = (n) => atlas.sprites[n];
    const has = (n) => !!spr(n);
    const PXFX = NS.pixelfx ? NS.pixelfx.create(V) : null;

    // Value noise for patches of alternate ground.
    const NG = 12, noise = Array.from({ length: NG * NG }, () => rng());
    const nAt = (x, y) => {
      const fx = ((x / 6) % NG + NG) % NG, fy = ((y / 6) % NG + NG) % NG;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const g = (i, j) => noise[((y0 + j) % NG) * NG + ((x0 + i) % NG)];
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      return (g(0, 0) * (1 - sx) + g(1, 0) * sx) * (1 - sy) + (g(0, 1) * (1 - sx) + g(1, 1) * sx) * sy;
    };
    const ell = (x, y) => Math.sqrt((x / A.rx) ** 2 + (y / A.ry) ** 2);
    const ex = A.exit || { x: A.rx + 1, y: 0 };
    const segDist = (x, y, ax, ay, bx, by) => {
      const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(x - ax - dx * t, y - ay - dy * t);
    };
    // The path to the exit: from a third of the way in, out past the edge.
    const pathA = { x: ex.x * 0.35, y: ex.y * 0.35 }, pathB = { x: ex.x * 1.8, y: ex.y * 1.8 };

    // ---- bake the ground
    const M = 10;
    const X0 = -(A.rx + M), Y0 = -(A.ry + M);
    const T = 32, cell = T * MPX;                    // a tile in metres
    const cols = Math.ceil((2 * (A.rx + M)) / cell), rows = Math.ceil((2 * (A.ry + M)) / cell);
    const cv = document.createElement('canvas');
    cv.width = cols * T; cv.height = rows * T;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const blit = (n, x, y, w, h) => { const s = spr(n); if (s) g.drawImage(pages[s[0]], s[1], s[2], s[3], s[4], x, y, w == null ? s[3] : w, h == null ? s[4] : h); };
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = X0 + (i + 0.5) * cell, y = Y0 + (j + 0.5) * cell, k = ell(x, y);
        let list = R.base;
        if (R.sides && k < 1.15) list = x < -A.rx * 0.55 ? R.sides.west : x > A.rx * 0.55 ? R.sides.east : R.base;
        else if (k > 1.06 && R.edge) list = R.edge;
        else if (R.alt && nAt(x, y) > R.altK) list = R.alt;
        if (R.path && segDist(x, y, pathA.x, pathA.y, pathB.x, pathB.y) < R.pathW / 2 + (rng() - 0.5) * 0.5) list = R.path;
        if (R.road && Math.abs(y - (ex.y / (ex.x || 1)) * x) < R.roadW / 2 + (rng() - 0.5) * 0.4) list = R.road;
        // One main tile per region, its variants sprinkled: the first in a list dominates.
        const ok = list.filter(has).length ? list.filter(has) : R.base.filter(has);
        blit(ok.length > 1 && rng() < 0.3 ? ok[1 + Math.floor(rng() * (ok.length - 1))] : ok[0], i * T, j * T, T, T);
      }
    }
    // Flat details: small sprites baked onto the ground (not on obstacles or the path).
    const blocked = (x, y, m) => A.obstacles.some((o) => { const c = Sim.obstacleCenter(o, x, y); return Math.hypot(x - c.x, y - c.y) < o.r + m; });
    for (let n = 0, tries = 0; n < (R.flatN || 0) && tries < 600; tries++) {
      const a = rng() * Math.PI * 2, k = Math.sqrt(rng()) * 1.25, x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
      if (blocked(x, y, 0.3) || (k < 0.5 && rng() < 0.6)) continue;
      const name = pick(R.flat), s = spr(name);
      if (!s) continue;
      blit(name, Math.round((x - X0) / MPX - s[3] / 2), Math.round((y - Y0) / MPX - s[4]));
      n++;
    }
    // Darken toward the outside so the fighting ground reads.
    {
      const W = cv.width, H = cv.height, cx = (-X0) / MPX, cy = (-Y0) / MPX;
      g.save(); g.translate(cx, cy); g.scale(1, A.ry / A.rx);
      const r = A.rx / MPX, gr = g.createRadialGradient(0, 0, r * 0.75, 0, 0, r * 1.7);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${R.dark == null ? 0.55 : R.dark})`);
      g.fillStyle = gr; g.fillRect(-W, -H * 3, W * 3, H * 6);
      g.restore();
    }

    // ---- props: obstacles, the ring just inside the edge, the border outside
    const props = [];
    const put = (name, x, y, o) => { if (has(name)) props.push(Object.assign({ name, x, y, flip: rng() < 0.5, scale: 1 }, o)); };
    for (const o of A.obstacles) {
      const list = ((R.obs && R.obs[o.kind]) || OBS[o.kind] || []).filter(has);
      if (o.kind === 'trunk') { props.push({ trunk: true, o, name: has('log_a') ? 'log_a' : null }); continue; }
      if (!list.length) continue;
      let name = pick(list);
      if (o.kind === 'rock') name = o.r > 0.65 ? 'rock_big' : list.find((n) => n !== 'rock_big') || name;
      put(name, o.x, o.y, { obstacle: o, scale: o.kind === 'table' || o.kind === 'bar' ? 1.6 : o.kind === 'hearth' ? 1.8 : 1 });
      if ((R.fires || []).includes(o.kind)) props.push({ fire: true, x: o.x, y: o.y + 0.05, z: o.kind === 'hearth' ? 0.3 : 0.1 });
    }
    for (let n = 0, tries = 0; n < (R.ringN || 0) && tries < 300; tries++) {
      const a = rng() * Math.PI * 2, k = 0.86 + rng() * 0.16, x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
      if (blocked(x, y, 0.8) || segDist(x, y, pathA.x, pathA.y, pathB.x, pathB.y) < 1.4) continue;
      put(pick(R.ring), x, y); n++;
    }
    for (let n = 0, tries = 0; n < (R.borderN || 0) && tries < 600; tries++) {
      const a = rng() * Math.PI * 2, k = 1.12 + rng() * 0.55, x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
      if (segDist(x, y, pathA.x, pathA.y, pathB.x, pathB.y) < 1.6 || props.some((p) => p.x != null && Math.hypot(p.x - x, p.y - y) < 1.4)) continue;
      put(pick(R.border), x, y, { border: true }); n++;
    }
    if (R.torches) for (let i = 0; i < R.torches; i++) { const a = (i / R.torches) * Math.PI * 2 + 0.4; props.push({ fire: true, torch: true, x: Math.cos(a) * A.rx * 1.08, y: Math.sin(a) * A.ry * 1.08, z: 0.9 }); }
    // Ambient: a few pixel loops drifting over the arena.
    const amb = [];
    for (const name of R.ambient || []) for (let i = 0; i < 4; i++) amb.push({ name, x: (rng() * 2 - 1) * A.rx, y: (rng() * 2 - 1) * A.ry, z: 0.6 + rng() * 2.2, t: rng() * 5 });

    const texel = () => ((1.78 * 0.9 * V.cam.sc) / 44) * TS;
    function drawSprite(name, x, y, z, flip, scale, alpha) {
      const s = spr(name); if (!s) return;
      const p = P(x, y, z || 0), k = texel() * (scale || 1);
      const w = s[3] * k, h = s[4] * k;
      if (p.x + w < -40 || p.x - w > V.W + 40 || p.y < -40 || p.y - h > V.H + 40) return;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (alpha != null) ctx.globalAlpha *= alpha;
      ctx.translate(p.x, p.y);
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(pages[s[0]], s[1], s[2], s[3], s[4], -w / 2, -h, w, h);
      ctx.restore();
    }
    // A fallen trunk: the log's two ends, its middle section repeated along the obstacle.
    function drawTrunk(o) {
      const s = spr('log_a'); if (!s) return;
      const a = P(o.ax, o.ay, 0), b = P(o.bx, o.by, 0), k = texel();
      const len = Math.hypot(b.x - a.x, b.y - a.y) + 2 * o.r * V.cam.sc, ang = Math.atan2(b.y - a.y, b.x - a.x);
      const h = s[4] * k, cap = Math.floor(s[3] * 0.3), mid = s[3] - 2 * cap, I = pages[s[0]];
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2 + h * 0.3); ctx.rotate(Math.cos(ang) < 0 ? ang + Math.PI : ang);
      const x0 = -len / 2, x1 = len / 2 - cap * k;
      ctx.drawImage(I, s[1], s[2], cap, s[4], x0, -h, cap * k, h);
      for (let x = x0 + cap * k; x < x1; x += mid * k) {
        const w = Math.min(mid * k, x1 - x);
        ctx.drawImage(I, s[1] + cap, s[2], w / k, s[4], x, -h, w, h);
      }
      ctx.drawImage(I, s[1] + s[3] - cap, s[2], cap, s[4], x1, -h, cap * k, h);
      ctx.restore();
    }

    function drawBackdrop(s) {
      const W = V.W, H = V.H, cam = V.cam;
      ctx.fillStyle = R.interior ? '#07060a' : '#0e1410';
      ctx.fillRect(-60, -60, W + 120, H + 120);
      const o = P(X0, Y0, 0), c = Math.cos(cam.ang), sn = Math.sin(cam.ang), sc = cam.sc;
      ctx.save();
      ctx.imageSmoothingEnabled = sc * MPX < 1.5; // smooth when shrunk, crisp when zoomed in
      ctx.transform(sc * c * MPX, sc * cam.pitch * sn * MPX, -sc * sn * MPX, sc * cam.pitch * c * MPX, o.x, o.y);
      ctx.drawImage(cv, 0, 0);
      ctx.restore();
      void s;
    }
    function items(s) {
      const out = [];
      const fight = s && s.units ? s.units.filter((u) => !u.fled).map((u) => P(u.x, u.y, 0.9)) : [];
      for (const p of props) {
        if (p.trunk) {
          const c = P((p.o.ax + p.o.bx) / 2, (p.o.ay + p.o.by) / 2, 0);
          out.push({ d: c.d + 0.2, f: () => drawTrunk(p.o) });
          continue;
        }
        const q = P(p.x, p.y, 0);
        if (p.fire) { out.push({ d: q.d + 0.05, f: () => PXFX && PXFX.drawAt(p.torch ? 'torch' : 'campfire', V.time + p.x, p.x, p.y, p.z, { scale: p.torch ? 1.3 : 1.8 }) }); continue; }
        out.push({
          d: q.d, f: () => {
            // Fade a prop that stands between the camera and a fighter.
            let alpha = null;
            const s = spr(p.name);
            if (s && (p.border || p.scale > 1 || s[4] > 60)) {
              const k = texel() * p.scale, w = s[3] * k * 0.5, h = s[4] * k;
              for (const f of fight) if (f.d < q.d && Math.abs(f.x - q.x) < w && f.y < q.y && f.y > q.y - h) { alpha = 0.35; break; }
            }
            drawSprite(p.name, p.x, p.y, 0, p.flip, p.scale, alpha);
          },
        });
      }
      return out;
    }
    function drawAtmosphere(s, dt) {
      const W = V.W, H = V.H;
      if (PXFX) for (const a of amb) { a.t += dt || 0; PXFX.drawAt(a.name, a.t, a.x, a.y, a.z, { scale: 0.75, alpha: 0.7 }); }
      if (R.grade) { const [r, gg, b, al] = R.grade; ctx.fillStyle = `rgba(${r},${gg},${b},${al})`; ctx.fillRect(-60, -60, W + 120, H + 120); }
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = v; ctx.fillRect(-60, -60, W + 120, H + 120);
    }
    return { drawBackdrop, items, drawAtmosphere, pixel: true };
  }

  function has(theme) { return !!RECIPES[theme]; }
  if (typeof window !== 'undefined' && typeof Image !== 'undefined') load();
  NS.tiles = { load, ready, has, dressing, RECIPES };
})();
