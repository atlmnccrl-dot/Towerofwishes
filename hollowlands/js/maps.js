'use strict';
// HOLLOWLANDS — the Ashwick slice: hand-placed layout, generated detail. Pure (no DOM).
// Tile = 8 px. Coordinates below are in tiles unless named px.
const TL = (HL.TILE = { ASH: 0, PATH: 1, GRASS: 2, WATER: 3, FOREST: 4, ROCK: 5, COBBLE: 6, BRIDGE: 7, FLOOR: 8, WALL: 9, VOID: 10, FIELD: 11 });
HL.SOLID = new Uint8Array(12);
[TL.WATER, TL.FOREST, TL.ROCK, TL.WALL, TL.VOID].forEach((t) => (HL.SOLID[t] = 1));
HL.OPAQUE = new Uint8Array(12);
[TL.FOREST, TL.ROCK, TL.WALL, TL.VOID].forEach((t) => (HL.OPAQUE[t] = 1));

const px = (t) => t * 8 + 4; // tile centre -> px

function grid(W, H, fill) { const t = new Uint8Array(W * H); t.fill(fill); return t; }
function brushLine(W, H, pts, r, fn) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let k = 0; k <= n; k++) {
      const cx = x0 + ((x1 - x0) * k) / n, cy = y0 + ((y1 - y0) * k) / n;
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const d = Math.hypot(x - cx, y - cy); if (d <= r) fn(x, y, d);
      }
    }
  }
}
function brushDisc(W, H, cx, cy, r, fn) { brushLine(W, H, [[cx, cy], [cx, cy]], r, fn); }

// ------------------------------------------------------------------ OUTDOOR: Ashwick + Crowshade Trail
function outdoor() {
  const W = 180, H = 100, T = grid(W, H, TL.ASH);
  const at = (x, y) => T[y * W + x];
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) T[y * W + x] = v; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = HL.fbm(x * 0.08, y * 0.08, 7, 3);
    let f = x >= 63 + n * 9 || y < 15 + n * 7 || y > 85 - n * 7 || x < 3 + n * 4;
    if (f) set(x, y, x < 72 && HL.fbm(x * 0.11, y * 0.11, 11, 2) > 0.64 ? TL.ROCK : TL.FOREST);
    else if (HL.fbm(x * 0.13, y * 0.13, 3, 3) > 0.57) set(x, y, TL.GRASS);
  }
  const open = (x, y) => { if (HL.SOLID[at(x, y)]) set(x, y, HL.fbm(x * 0.13, y * 0.13, 3, 3) > 0.55 ? TL.GRASS : TL.ASH); };
  const clearings = [[100, 68, 5.5], [120, 28, 7.5], [137, 24, 5], [141, 64, 8.5], [160, 50, 12.5], [88, 44, 4.5], [72, 50, 6], [80, 64, 8], [98, 30, 7], [84, 33, 4], [121, 11, 3.6], [157, 72, 5.5]];
  clearings.forEach(([x, y, r]) => brushDisc(W, H, x, y, r + HL.hash(x, y) * 1.5, (cx, cy) => open(cx, cy)));
  const road = [[0, 56], [14, 56], [26, 52], [40, 50], [52, 50], [62, 49], [72, 47], [84, 45], [96, 50], [106, 54], [116, 54], [124, 55], [134, 58], [146, 56], [156, 52], [164, 53]];
  const sides = [
    [[96, 51], [98, 58], [100, 66]],
    [[76, 48], [78, 56], [80, 62]],
    [[90, 45], [94, 38], [98, 32]],
    [[118, 54], [119, 44], [120, 33]],
    [[126, 27], [131, 26], [135, 25]],
    [[134, 58], [139, 62]],
    [[39, 49], [39, 36]], [[40, 50], [30, 47]], [[38, 53], [31, 63], [26, 67]], [[42, 49], [50, 45]], [[44, 52], [53, 61], [56, 64]], [[14, 56], [13, 50]], [[86, 45], [85, 40], [84, 36]], [[121, 21], [121, 16], [121, 12]], [[160, 60], [158, 66], [157, 70]],
  ];
  const carve = (pts, clear, pathR) => brushLine(W, H, pts, clear, (x, y, d) => { open(x, y); if (d <= pathR && at(x, y) !== TL.WATER) set(x, y, TL.PATH); });
  carve(road, 3.4, 1.3);
  sides.forEach((s, i) => carve(s, i === 4 ? 1.6 : i < 6 ? 2.6 : 1.4, i < 6 ? 0.9 : 0.8));
  // river under the canopy, open around the ruined bridge
  brushLine(W, H, [[109, 34], [112, 44], [110, 54], [113, 64], [111, 74]], 1.9, (x, y) => set(x, y, TL.WATER));
  brushLine(W, H, road.slice(8, 11), 1.6, (x, y) => { if (at(x, y) === TL.WATER) set(x, y, TL.BRIDGE); });
  // village square, field
  brushDisc(W, H, 40, 50, 5.2, (x, y) => set(x, y, TL.COBBLE));
  for (let y = 66; y <= 75; y++) for (let x = 8; x <= 19; x++) if (!HL.SOLID[at(x, y)]) set(x, y, TL.FIELD);

  const O = [];
  const prop = (spr, x, y, col, extra) => O.push(Object.assign({ t: 'prop', spr, x: px(x), y: px(y), col }, extra));
  const box = (w, h) => ({ w, h });
  // Buildings (tile rects). door.x/w in tiles relative to the left wall.
  const B = [
    { id: 'houseA', x: 26, y: 40, w: 8, d: 6, roof: 'thatch', ruined: true, door: { x: 3, w: 2 } },
    { id: 'houseB', x: 22, y: 60, w: 8, d: 6, roof: 'thatch', door: { x: 3, w: 2 } },
    { id: 'smithy', x: 46, y: 38, w: 9, d: 6, roof: 'wood', ruined: true, door: { x: 3, w: 3 } },
    { id: 'store', x: 52, y: 57, w: 8, d: 6, roof: 'wood', door: { x: 3, w: 2 }, doorId: 'd_store', locked: 'storehouse_key' },
    { id: 'ruinC', x: 11, y: 43, w: 6, d: 5, roof: 'none', ruined: true, door: { x: 2, w: 2 } },
    { id: 'chapel', x: 34, y: 26, w: 10, d: 9, roof: 'slate', H: 16, belfry: true, door: { x: 4, w: 2 }, doorId: 'd_chapel', chained: true },
  ];
  // the wreck where you wake
  prop('cart', 8, 53, box(20, 8));
  O.push({ t: 'container', id: 'c_cart', spr: null, x: px(8), y: px(53) + 2, loot: [['poultice', 2]], note: 'cart_ledger', label: 'Search the cart' });
  O.push({ t: 'pickup', id: 'p_sword', item: 'rusted_sword', n: 1, x: px(10) + 2, y: px(57) });
  prop('rubble', 6, 57, null); prop('rock1', 4, 52, box(5, 3));
  // House A (ruined roof)
  O.push({ t: 'container', id: 'c_houseA', spr: 'chest', open: 'chestOpen', x: px(27), y: px(41) + 2, loot: [['cloth_scrap', 2], ['ash_herb', 2]], note: 'letter_edda' });
  prop('bed', 32, 42, box(7, 10)); prop('table', 29.5, 41.5, box(10, 4));
  O.push({ t: 'container', id: 'c_brlA', spr: 'barrel', open: 'barrel', x: px(27), y: px(44), loot: [['lamp_oil', 1]] });
  // House B
  O.push({ t: 'container', id: 'c_shelfB', spr: 'shelf', open: 'shelf', x: px(24), y: px(61) + 2, loot: [['dried_meat', 1], ['ash_herb', 1]], col: box(11, 4) });
  O.push({ t: 'container', id: 'c_crateB', spr: 'crate', open: 'crateOpen', x: px(28), y: px(63), loot: [['twin_blades', 1], ['cloth_scrap', 2]] });
  O.push({ t: 'note', id: 'n_drawing', note: 'child_drawing', x: px(27), y: px(61) + 3, spr: 'table', col: box(10, 4) });
  prop('bed', 23, 64, box(7, 10));
  // Smithy
  O.push({ t: 'container', id: 'c_smithy', spr: 'chest', open: 'chestOpen', x: px(47), y: px(40), loot: [['winch_crank', 1], ['iron_scrap', 2]] });
  prop('forge', 53, 40, box(12, 6));
  O.push({ t: 'anvil', id: 'anvil', spr: 'anvil', x: px(50), y: px(41), col: box(8, 3) });
  O.push({ t: 'container', id: 'c_smithCrate', spr: 'crate', open: 'crateOpen', x: px(53), y: px(42), loot: [['iron_scrap', 1]] });
  // Storehouse (locked)
  O.push({ t: 'container', id: 'c_store', spr: 'chest', open: 'chestOpen', x: px(55), y: px(59), loot: [['ashwood_spear', 1], ['poultice', 1]] });
  O.push({ t: 'container', id: 'c_storeBrl', spr: 'barrel', open: 'barrel', x: px(53), y: px(59), loot: [['lamp_oil', 2]] });
  O.push({ t: 'container', id: 'c_storeCrate', spr: 'crate', open: 'crateOpen', x: px(58), y: px(60), loot: [['iron_scrap', 2], ['cloth_scrap', 1]] });
  // Ruin C
  O.push({ t: 'container', id: 'c_corpseC', spr: 'corpse', open: 'corpseOpen', x: px(13), y: px(45), loot: [['poultice', 1], ['bone_dust', 1]] });
  prop('rubble', 15, 46, null); prop('rubble', 12, 47, null);
  // Square: well, fallen bell, fire, survivor
  O.push({ t: 'well', id: 'well', spr: 'well', x: px(40), y: px(48) + 2, col: box(14, 8) });
  O.push({ t: 'note', id: 'n_bell', note: 'do_not_ring', spr: 'bigBell', x: px(44), y: px(46), col: box(18, 6) });
  O.push({ t: 'fire', id: 'fire_village', x: px(36), y: px(55) });
  prop('leanTo', 33, 53, box(18, 3));
  O.push({ t: 'npc', id: 'maren', x: px(33) + 3, y: px(55) - 1 });
  // Chapel interior: stairs down (reachable once you come up from below), pews, altar
  O.push({ t: 'exit', id: 'x_chapel', spr: 'stairsDown', x: px(36), y: px(28) + 4, to: 'crypt2', tx: px(19) + 4, ty: px(3) + 4, label: 'Descend' });
  for (let i = 0; i < 3; i++) prop('table', 41.5, 29.2 + i * 1.7, box(10, 3));
  prop('pedestal', 41, 27, box(9, 4));
  O.push({ t: 'container', id: 'c_chapelShelf', spr: 'shelf', open: 'shelf', x: px(35), y: px(32), loot: [['poultice', 1], ['map_scrap', 1]], note: 'next_region', col: box(11, 4) });
  // Graveyard
  const graves = [[25, 28], [27, 28], [29, 28], [25, 31], [28, 31], [30, 31], [26, 34], [29, 34], [31, 34]];
  graves.forEach(([x, y], i) => prop('grave' + (i % 3), x, y, box(5, 3)));
  prop('mound', 27, 33, null);
  prop('fenceV', 23, 28, box(2, 8)); prop('fenceV', 23, 31, box(2, 8)); prop('fenceV', 23, 34, box(2, 8));
  // Village dressing
  [[20, 48], [57, 47], [33, 37], [47, 55], [17, 39], [60, 64], [18, 60]].forEach(([x, y], i) => O.push({ t: 'tree', spr: 'dead' + (i % 3), x: px(x), y: px(y) }));
  [[21, 52, 'barrel', 'c_brl1', [['cloth_scrap', 1]]], [58, 52, 'crate', 'c_crt1', [['ash_herb', 1]]], [45, 44, 'barrel', 'c_brl2', [['bone_dust', 1]]], [31, 47, 'crate', 'c_crt2', [['ash_herb', 1]]]]
    .forEach(([x, y, s, id, loot]) => O.push({ t: 'container', id, spr: s, open: s === 'crate' ? 'crateOpen' : 'barrel', x: px(x), y: px(y), loot }));
  for (let x = 8; x <= 19; x += 1.1) { prop(x > 15 && x < 17 ? 'fenceB' : 'fenceH', x, 65, box(9, 2)); }
  prop('lamp', 34, 49, box(2, 2)); prop('lamp', 46, 51, box(2, 2)); prop('lamp', 62, 47, box(2, 2));
  prop('rubble', 50, 50, null); prop('rock0', 64, 55, box(10, 4)); prop('rock1', 22, 45, box(5, 3));
  prop('cart', 60, 51, box(20, 8));

  // ---------------- Crowshade Trail
  O.push({ t: 'note', id: 'n_m1', note: 'marker_1', spr: 'wayStone', x: px(85), y: px(42), col: box(5, 3), glyph: 0 });
  O.push({ t: 'note', id: 'n_m2', note: 'marker_2', spr: 'wayStone', x: px(103), y: px(50), col: box(5, 3), glyph: 1 });
  O.push({ t: 'note', id: 'n_m3', note: 'marker_3', spr: 'wayStone', x: px(127), y: px(53), col: box(5, 3), glyph: 2 });
  prop('log', 91, 48, box(24, 4)); prop('stump', 79, 49, box(6, 3)); prop('rock0', 98, 47, box(10, 4));
  prop('rock1', 106, 51, box(5, 3)); prop('rock1', 115, 57, box(5, 3)); prop('rubble', 107, 56, null); prop('rubble', 114, 51, null);
  // ring of stones (puzzle): set to eye, bell, moon
  [[116, 29, 3], [120, 26, 2], [124, 29, 0]].forEach(([x, y, f], i) => O.push({ t: 'stone', id: 'stone' + i, idx: i, spr: 'standStone', x: px(x), y: px(y), col: box(8, 4), face: f }));
  O.push({ t: 'roots', id: 'roots', spr: 'roots', x: px(128) + 4, y: px(27) + 6, col: box(30, 22) });
  O.push({ t: 'container', id: 'c_glade', spr: 'chest', open: 'chestOpen', x: px(138), y: px(24), loot: [['gravecloth_coat', 1], ['poultice', 2], ['iron_scrap', 2]] });
  prop('bush1', 135, 21, null); prop('stump', 140, 26, box(6, 3));
  // hound hollow
  O.push({ t: 'container', id: 'c_hollow', spr: 'corpse', open: 'corpseOpen', x: px(101), y: px(69), loot: [['ashen_bow', 1], ['raw_meat', 1], ['ash_herb', 2], ['fire_flask', 1]] });
  prop('bones', 98, 70, null); prop('bones', 103, 66, null);
  // the armoured guard's camp
  prop('tent', 138, 61, box(18, 5)); prop('tent', 145, 60, box(18, 5)); O.push({ t: 'prop', spr: 'fireRing', x: px(141), y: px(65), col: box(9, 3) });
  O.push({ t: 'container', id: 'c_traveller', spr: 'corpse', open: 'corpseOpen', x: px(144), y: px(67), loot: [['gate_key', 1], ['poultice', 1]], note: 'traveller' });
  O.push({ t: 'container', id: 'c_campCrate', spr: 'crate', open: 'crateOpen', x: px(137), y: px(66), loot: [['lamp_oil', 1], ['cloth_scrap', 1]] });
  // LUMEN: shrines, the pylons of the echo trial, the scattered shards
  O.push({ t: 'shrine', id: 'shrine_passage', x: px(18), y: px(50) });
  O.push({ t: 'shrine', id: 'shrine_trial', x: px(80), y: px(63) });
  O.push({ t: 'shrine', id: 'shrine_echo', x: px(98), y: px(29) });
  [[93, 31], [103, 31], [98, 35.5]].forEach(([x, y], i) => O.push({ t: 'pylon', id: 'pylon' + i, x: px(x), y: px(y), col: { w: 6, h: 4 } }));
  O.push({ t: 'shrine', id: 'shrine_hidden', x: px(135), y: px(23) });
  [[24, 35, 1], [57, 37, 2], [9, 70, 3], [106, 50, 4], [101, 71, 5], [143, 68, 6]].forEach(([x, y, n]) => O.push({ t: 'pickup', id: 'p_ls' + n, item: 'lumen_shard', n: 1, x: px(x), y: px(y), shard: true }));
  // the tower
  // the hub: the Great Shrine of Ashwick; survivors and their places
  O.push({ t: 'greatshrine', id: 'greatshrine', x: px(40), y: px(41), col: box(26, 10) });
  O.push({ t: 'npc', id: 'tobin', who: 'TOBIN', x: px(51) + 2, y: px(43) + 4, look: 'smith', cond: (f) => f.rescued_tobin });
  O.push({ t: 'npc', id: 'ilse_hub', who: 'ILSE', x: px(43) + 4, y: px(42) + 4, look: 'acolyte', cond: (f) => f.rescued_ilse });
  O.push({ t: 'cage', id: 'cage_tobin', x: px(140), y: px(68), col: box(12, 6) });
  // gates your powers open, and what lies behind them
  O.push({ t: 'gate', kind: 'thorns', id: 'g_thorns1', x: px(85) + 4, y: px(40), col: box(44, 14) });
  O.push({ t: 'lwell', id: 'w_thorns', x: px(84), y: px(33) });
  O.push({ t: 'container', id: 'c_thorns', spr: 'chest', open: 'chestOpen', x: px(86), y: px(32), loot: [['ash', 80], ['fire_flask', 2]] });
  O.push({ t: 'gate', kind: 'rift', id: 'g_rift1', x: px(121), y: px(17) + 2, col: box(48, 12) });
  O.push({ t: 'lwell', id: 'w_rift', x: px(120), y: px(11) });
  O.push({ t: 'container', id: 'c_rift', spr: 'chest', open: 'chestOpen', x: px(123), y: px(10) + 4, loot: [['ash', 120], ['iron_scrap', 3]] });
  O.push({ t: 'gate', kind: 'miasma', id: 'g_miasma1', x: px(157), y: px(71), r: 46 });
  O.push({ t: 'lwell', id: 'w_miasma', x: px(157), y: px(73) });
  O.push({ t: 'container', id: 'c_miasma', spr: 'chest', open: 'chestOpen', x: px(160), y: px(72), loot: [['ash', 150], ['poultice', 3]] });
  O.push({ t: 'tower', id: 'tower', x: px(166), y: px(45), col: { w: 56, h: 14 } });
  O.push({ t: 'exit', id: 'x_tower', spr: null, x: px(166), y: px(45) + 9, to: 'crypt1', tx: px(23) + 4, ty: px(41) + 4, locked: 'gate_key', doorId: 'd_tower', label: 'Enter' });
  prop('rubble', 158, 44, null); prop('rock0', 171, 52, box(10, 4)); prop('rubble', 168, 55, null); prop('rock1', 155, 57, box(5, 3));

  // enemies (placed, never endless)
  const E = [
    ['drifter', 29, 31], ['drifter', 58, 45], ['drifter', 24, 71], ['drifter', 66, 50],
    ['drifter', 79, 45], ['lurker', 89, 47], ['drifter', 99, 52], ['hound', 99, 67], ['hound', 102, 70],
    ['archer', 118, 58], ['lurker', 121, 51], ['archer', 117, 45], ['lurker', 131, 57], ['wraith', 122, 30], ['brute', 128, 58, 'champion', 'champion'],
    ['guard', 141, 63, 'guard_camp'], ['drifter', 138, 64], ['archer', 145, 65, 'elite_camp', true],
    ['lurker', 151, 54], ['wraith', 147, 52], ['hound', 158, 55], ['hound', 164, 57], ['lurker', 159, 46],
  ].map(([foe, x, y, id, elite]) => ({ foe, x: px(x), y: px(y), id, elite: elite === true, boss: elite === 'champion' }));
  return { id: 'ashwick', name: 'Ashwick Vale', W, H, tiles: T, objects: O, buildings: B, enemies: E, dark: false, amb: 'wind', start: { x: px(10), y: px(55) } };
}

// ------------------------------------------------------------------ DUNGEONS: rooms carved from rects
function rooms(W, H, rects) {
  const T = grid(W, H, TL.VOID);
  for (const [x, y, w, h, cut] of rects) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    if (cut) { const cx = Math.min(i - x, x + w - 1 - i), cy = Math.min(j - y, y + h - 1 - j); if (cx + cy < cut) continue; }
    T[j * W + i] = TL.FLOOR;
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (T[j * W + i] !== TL.VOID) continue;
    let near = false;
    for (let dj = -1; dj <= 1 && !near; dj++) for (let di = -1; di <= 1; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < W && b < H && T[b * W + a] === TL.FLOOR) { near = true; break; } }
    if (near) T[j * W + i] = TL.WALL;
  }
  return T;
}

function crypt1() {
  const W = 50, H = 48;
  const T = rooms(W, H, [
    [20, 1, 8, 4], [23, 5, 2, 3], [14, 8, 20, 12, 3], [23, 20, 2, 4], [15, 24, 18, 8], [16, 32, 2, 2], [12, 34, 6, 4], [10, 27, 5, 2], [2, 21, 8, 11, 2],
    [33, 27, 4, 2], [37, 22, 10, 10, 2], [44, 32, 2, 2], [41, 34, 7, 6, 1], [41, 19, 2, 3], [39, 14, 6, 5], [23, 32, 2, 6], [20, 38, 8, 7, 1],
  ]);
  const O = [];
  const p = (spr, x, y, col, extra) => O.push(Object.assign({ t: 'prop', spr, x: px(x), y: px(y), col }, extra));
  const b = (w, h) => ({ w, h });
  const light = (x, y, r = 46) => O.push({ t: 'brazier', spr: 'brazier', x: px(x), y: px(y), col: b(6, 3), light: r });
  O.push({ t: 'exit', id: 'x_up1', spr: 'stairsUp', x: px(23) + 4, y: px(43) + 6, to: 'ashwick', tx: px(166), ty: px(45) + 18, label: 'Climb out' });
  O.push({ t: 'fire', id: 'fire_crypt', x: px(21), y: px(40) });
  light(20, 38.6); light(27, 38.6);
  O.push({ t: 'container', id: 'c_cr1', spr: 'urn', open: 'urnBroken', x: px(26), y: px(42), loot: [['ash_herb', 1], ['cloth_scrap', 1]] });
  // hall
  light(16, 24.6); light(31, 24.6); light(15.4, 28.2, 38); light(31, 30.6, 38);
  [[19, 26], [28, 26], [19, 29.5], [28, 29.5]].forEach(([x, y]) => p('pillar', x, y, b(8, 4)));
  O.push({ t: 'note', id: 'n_inscr', note: 'inscription', spr: 'scratch', x: px(21), y: px(24) + 2, col: b(8, 2) });
  p('bones', 25, 30, null); p('bones', 17, 27, null);
  // ossuary
  light(3, 21.6); light(9, 21.6);
  O.push({ t: 'container', id: 'c_ossuary', spr: 'chest', open: 'chestOpen', x: px(5), y: px(22), loot: [['crypt_key', 1], ['bone_dust', 2]] });
  O.push({ t: 'container', id: 'c_urn1', spr: 'urn', open: 'urnBroken', x: px(3), y: px(30), loot: [['bone_dust', 1]] });
  O.push({ t: 'container', id: 'c_urn2', spr: 'urn', open: 'urnBroken', x: px(8), y: px(30), loot: [['ash_herb', 2]] });
  [[4, 26], [7, 25], [5, 28]].forEach(([x, y]) => p('bones', x, y, null));
  // resonance chamber
  light(38, 22.6); light(46, 22.6);
  O.push({ t: 'bell', id: 'bell0', tone: 1, spr: 'bellM', x: px(39), y: px(23) + 4, col: b(10, 3) });
  O.push({ t: 'bell', id: 'bell1', tone: 0, spr: 'bellL', x: px(42) + 4, y: px(23) + 4, col: b(12, 3) });
  O.push({ t: 'bell', id: 'bell2', tone: 2, spr: 'bellS', x: px(45), y: px(23) + 4, col: b(9, 3) });
  O.push({ t: 'note', id: 'n_scratch', note: 'scratches', spr: 'scratch', x: px(41) + 4, y: px(31) + 2, col: b(8, 2) });
  O.push({ t: 'door', id: 'd_vault', spr: 'doorVault', x: px(41) + 4, y: px(21) + 4, w: 16, h: 8, puzzle: 'bells' });
  // vault
  O.push({ t: 'pickup', id: 'p_shard', item: 'bell_shard', n: 1, x: px(41) + 4, y: px(15) + 2, pedestal: true });
  O.push({ t: 'container', id: 'c_vault', spr: 'chest', open: 'chestOpen', x: px(43), y: px(17), loot: [['bell_focus', 1], ['ember_charm', 1], ['poultice', 1], ['fire_flask', 1]], note: 'bell_truth' });
  p('pedestal', 41.5, 15.6, b(9, 3));
  // iron door, crank hall (the wave arena), heavy gate, stairs down
  O.push({ t: 'door', id: 'd_iron', spr: 'doorIron', x: px(23) + 4, y: px(21) + 4, w: 16, h: 8, locked: 'crypt_key' });
  O.push({ t: 'crank', id: 'crank', spr: 'crank', x: px(23) + 4, y: px(13), col: b(8, 3) });
  light(15, 9.6); light(32, 9.6); light(15, 18.6); light(32, 18.6);
  O.push({ t: 'door', id: 'd_gate', spr: 'gateBars', x: px(23) + 4, y: px(7) + 4, w: 16, h: 8, puzzle: 'waves' });
  O.push({ t: 'exit', id: 'x_down1', spr: 'stairsDown', x: px(23) + 4, y: px(2) + 6, to: 'crypt2', tx: px(19) + 4, ty: px(31), label: 'Descend' });
  light(21, 1.6, 34);
  O.push({ t: 'waves', id: 'waves', points: [[16, 10], [31, 10], [16, 18], [31, 18], [23.5, 9.5]].map(([x, y]) => [px(x), px(y)]) });
  O.push({ t: 'shrine', id: 'shrine_deep', x: px(44) + 4, y: px(37) });
  O.push({ t: 'npc', id: 'ilse', who: 'ILSE', x: px(42), y: px(38) + 4, look: 'acolyte', cond: (f) => !f.rescued_ilse });
  O.push({ t: 'gate', kind: 'veil', id: 'g_veil1', x: px(16) + 4, y: px(32) + 4, col: { w: 16, h: 8 } });
  O.push({ t: 'lwell', id: 'w_veil', x: px(13) + 4, y: px(36) });
  O.push({ t: 'pickup', id: 'p_dawn', item: 'dawnblade', n: 1, x: px(16) + 4, y: px(35) + 4, pedestal: true });
  O.push({ t: 'pickup', id: 'p_ls7', item: 'lumen_shard', n: 1, x: px(3), y: px(26), shard: true });
  O.push({ t: 'pickup', id: 'p_ls8', item: 'lumen_shard', n: 1, x: px(43), y: px(15) + 4, shard: true });
  const E = [['drifter', 18, 28], ['drifter', 29, 29], ['guard', 6, 25, 'guard_crypt'], ['drifter', 4, 29], ['archer', 44, 28], ['wraith', 38, 29], ['wraith', 26, 26], ['wraith', 43, 36, 'elite_deep', true]]
    .map(([foe, x, y, id, elite]) => ({ foe, x: px(x), y: px(y), id, elite }));
  return { id: 'crypt1', name: 'Bellroot Underchapel', W, H, tiles: T, objects: O, buildings: [], enemies: E, dark: true, amb: 'crypt' };
}

function crypt2() {
  const W = 40, H = 36;
  const T = rooms(W, H, [[16, 1, 8, 3], [19, 4, 2, 2], [8, 6, 24, 20, 6], [19, 26, 2, 4], [16, 30, 8, 5]]);
  const O = [];
  const light = (x, y, r = 50) => O.push({ t: 'brazier', spr: 'brazier', x: px(x), y: px(y), col: { w: 6, h: 3 }, light: r });
  O.push({ t: 'exit', id: 'x_up2', spr: 'stairsUp', x: px(19) + 4, y: px(33) + 6, to: 'crypt1', tx: px(23) + 4, ty: px(4) + 4, label: 'Climb' });
  light(16.5, 30.6, 34); light(23.5, 30.6, 34);
  O.push({ t: 'door', id: 'd_port', spr: 'gateBars', x: px(19) + 4, y: px(26) + 4, w: 16, h: 8, puzzle: 'arena', startOpen: true });
  [[11, 9], [28, 9], [9, 18], [30, 18], [14, 24], [25, 24]].forEach(([x, y]) => light(x, y, 44));
  [[12, 12], [27, 12], [19.5, 21]].forEach(([x, y], i) => O.push({ t: 'resonator', id: 'reso' + i, spr: 'resonator', x: px(x), y: px(y), col: { w: 8, h: 4 } }));
  O.push({ t: 'door', id: 'd_bell', spr: 'doorVault', x: px(19) + 4, y: px(5) + 4, w: 16, h: 8, locked: 'bell_key' });
  O.push({ t: 'exit', id: 'x_chapelUp', spr: 'stairsUp', x: px(19) + 4, y: px(2) + 2, to: 'ashwick', tx: px(37), ty: px(30) + 2, label: 'Climb to the light', setFlag: 'chapel_reached' });
  light(17, 1.6, 30);
  const E = [{ foe: 'keeper', x: px(19) + 4, y: px(12), id: 'keeper' }];
  return { id: 'crypt2', name: 'The Keeper\'s Hall', W, H, tiles: T, objects: O, buildings: [], enemies: E, dark: true, amb: 'crypt', arena: { y: px(25) } };
}

HL.MAPS = { ashwick: outdoor, crypt1, crypt2 };
HL.mapCache = {};
HL.getMap = (id) => HL.mapCache[id] || (HL.mapCache[id] = HL.MAPS[id]());
