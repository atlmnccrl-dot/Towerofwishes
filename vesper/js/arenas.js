// VESPER — the arenas: large isometric tile maps built from the Desert and Isometric Fantasy tile sets.
// Pure (no DOM): the sim walks them, the view draws them. A map is a grid of 90.5-unit cells (one tile's
// ground diamond, about three fighters tall), centred on the world origin: tall walls along the two back
// edges, open cliff edges at the front so nothing hides the fight, props and ruins to fight around,
// barrels and crates that break, braziers and torches that light the floor.
(function (root) {
  const VS = root.VS = root.VS || {};
  const T = 90.5, D4 = ['E', 'N', 'S', 'W'], D2 = ['E', 'N'];
  const FLOOR = 1, WATER = 2;

  function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const pick = (a, r) => a[Math.floor(r() * a.length)];
  const R = (pre, a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(pre + i); return o; };

  // Props: [tile, collision radius (0 = walk through), kind]. Breakables: the animation that plays when struck.
  const BREAK = {
    barrel: { anim: 'Barrel 1', hp: 1, fx: 'smoke' }, poison: { anim: 'Barrel 3', hp: 1, fx: 'poison' }, water: { anim: 'Barrel 2', hp: 1, fx: 'splash' },
    crate: { anim: 'wood explosion large', hp: 2, fx: 'wood' }, pot: { anim: 'Clay explosion', hp: 1, fx: 'clay' }, bones: { anim: 'Skeleton explosion', hp: 1, fx: 'bones' },
  };
  // The look of each hour: ground, walls, props, light.
  const THEMES = {
    gate: { pillar: ['i:Misc C7', 16], statue: ['i:Misc C5', 22], brazier: ['i:Misc C8', 18], rock: ['d:Stone A1', 26], name: 'The Black Gate', set: 'i', tint: '#a898a8',
      base: [['i:Ground A2', 9], ['i:Ground A1', 1], ['i:Ground C1', 1], ['i:Ground C4', 1]], floor: ['i:Ground H1', 'i:Ground H4', 'i:Ground D1'],
      over: [...R('i:Ground A', 3, 12), ...R('i:Ground J', 5, 8), ...R('i:Ground E', 10, 13)], floorOver: R('i:Ground E', 10, 15),
      wall: ['d:Wall F1', 'd:Wall F1', 'd:Wall F3', 'd:Wall F4', 'd:Wall F7', 'd:Wall F8', 'd:Wall F9'], corner: 'd:Wall F2', low: ['d:Wall F5', 'd:Wall B7', 'd:Wall B8'], door: 'd:Door A1',
      props: [['i:Misc C5', 22], ['i:Misc C6', 18], ['i:Misc C7', 16], ['d:Tree E1', 16], ['d:Tree E2', 18], ['d:Tree C1', 14], ['d:Stone A1', 26], ['d:Stone A2', 34], ['i:Misc B55', 26],
        ['i:Misc B41', 34], ['i:Misc B5', 26], ['i:Misc B6', 30], ['i:Misc B44', 6], ['i:Misc B45', 6], ['i:Misc C8', 18, 'light'], ['i:Misc B42', 30], ['i:Misc B47', 32], ['i:Misc E2', 26], ['i:Misc E3', 22]],
      decor: [...R('i:Flora A', 1, 7), ...R('i:Flora B', 1, 6), 'i:Misc E5', 'i:Misc E6', 'i:Misc E9'], breaks: [['barrel', 'i:Misc A8'], ['crate', 'i:Misc B1'], ['pot', 'i:Misc A2'], ['pot', 'i:Misc A3'], ['poison', null]] },
    cloister: { pillar: ['i:Misc C7', 16], statue: ['i:Misc C6', 18], brazier: ['i:Misc C8', 18], rock: ['d:Stone A15', 12], name: 'Cloister of Frost', set: 'i', tint: '#b4c4e4', frost: true,
      base: [['i:Ground B3', 3], ['i:Ground B6', 2], ['i:Ground C3', 1], ['i:Ground H4', 2]], floor: ['i:Ground H1', 'i:Ground H4'],
      over: [...R('i:Ground E', 1, 9), ...R('i:Ground E', 10, 15)], floorOver: R('i:Ground E', 10, 13),
      wall: ['d:Wall G1', 'd:Wall G1', 'd:Wall G2'], corner: 'd:Wall G3', low: ['d:Wall F5', 'd:Wall A10'], door: 'd:Door C9',
      props: [['i:Misc C5', 22], ['i:Misc C6', 18], ['i:Misc C7', 16], ['d:Misc C7', 16], ['i:Misc C12', 16], ['i:Misc C13', 16], ['i:Misc D1', 6], ['i:Misc D3', 6], ['i:Misc D4', 6], ['i:Misc C14', 26],
        ['d:Tree C1', 14], ['d:Stone A13', 12], ['d:Stone A14', 12], ['d:Stone A15', 12], ['d:Stone A4', 12], ['i:Misc C8', 18, 'light'], ['d:Stone A16', 16]],
      decor: [...R('i:Ground E', 10, 15).map((k) => k + '!'), 'd:Stone B4', 'i:Flora A1', 'i:Flora A3'], breaks: [['barrel', 'i:Misc A8'], ['pot', 'i:Misc A2'], ['crate', 'i:Misc B1'], ['water', null]] },
    stair: { pillar: ['d:Wall A6', 16], statue: ['d:Stone A23', 30], brazier: ['d:Misc C8', 18], rock: ['d:Wall J1', 32], name: 'The Umbral Stair', set: 'd', tint: '#a090c0',
      base: [['d:Ground D1', 5], ['d:Ground H1', 2], ['d:Ground H4', 2], ['d:Ground A1', 1]], floor: ['d:Ground H1', 'd:Ground H4'],
      over: [...R('d:Ground E', 1, 9), ...R('d:Ground E', 10, 15), 'd:Ground A25', 'd:Ground A26'], floorOver: R('d:Ground E', 10, 13),
      wall: ['d:Wall A1', 'd:Wall A1', 'd:Wall A4', 'd:Wall A5', 'd:Wall A15', 'd:Wall A16'], corner: 'd:Wall A2', low: ['d:Wall A10', 'd:Wall A3'], door: 'd:Door A1', vines: R('d:WallFlora A', 1, 7),
      props: [['d:Wall A6', 16], ['d:Wall J11', 14], ['d:Wall A19', 10], ['d:Stone A23', 30], ['d:Stone A24', 14], ['d:Misc C5', 18], ['d:Misc C6', 16], ['d:Misc C7', 16], ['d:Misc C14', 26],
        ['d:Misc C8', 18, 'light'], ['d:Wall J1', 32], ['d:Wall J6', 34], ['d:Misc C1', 20], ['d:Stone A21', 16], ['d:Stone A22', 16]],
      decor: ['d:Ground A25!', 'd:Ground A26!', 'd:Stone B4'], breaks: [['barrel', 'd:Misc A8'], ['pot', 'd:Misc A2'], ['pot', 'd:Misc A3'], ['pot', 'd:Misc A4'], ['poison', null]] },
    waste: { pillar: ['d:Misc D3', 26], statue: ['d:Misc A1', 40], brazier: ['d:Misc C8', 18], rock: ['d:Stone B5', 30], name: 'The Ashen Waste', set: 'd', tint: '#a48c8c', walls: 0.55,
      base: [['d:Ground B1', 2], ['d:Ground B2', 2], ['d:Ground B4', 2], ['d:Ground B5', 1], ['d:Ground C4', 1], ['d:Ground A1', 1]], floor: ['d:Ground B3', 'd:Ground B6'],
      over: [...R('d:Ground K', 1, 3), ...R('d:Ground J', 11, 13), ...R('d:Ground E', 10, 15), 'd:Ground A25', 'd:Ground A26', ...R('d:Ground A', 22, 24)], floorOver: R('d:Ground K', 1, 3),
      wall: ['d:Wall A7', 'd:Wall A3', 'd:Wall A9', 'd:Wall A17', 'd:Wall A1', 'd:Wall A8', 'd:Wall A18'], corner: 'd:Wall A2', low: ['d:Wall A3', 'd:Wall A8'], door: null,
      props: [['d:Misc A1', 40], ['d:Misc D1', 24], ['d:Misc D2', 24], ['d:Misc D3', 28], ['d:Misc D4', 26], ['d:Misc D5', 26], ['d:Misc B62', 24], ['d:Misc B63', 24], ['d:Misc B64', 26], ['d:Misc B65', 22],
        ['d:Tree E6', 12], ['d:Tree E4', 20], ['d:Tree E5', 20], ['d:Stone B1', 24], ['d:Stone B3', 24], ['d:Stone B5', 30], ['d:Stone A9', 24], ['d:Stone A10', 28], ['d:Misc C12', 16]],
      decor: ['d:Misc D6', 'd:Misc D7', 'd:Misc D8', 'd:Ground K4!', 'd:Ground K5!', 'd:Ground K7!'], breaks: [['bones', null], ['barrel', 'd:Misc A8'], ['pot', 'd:Misc A2'], ['poison', null]] },
    throat: { pillar: ['d:Stone B7', 22], statue: ['d:Stone B8', 18], brazier: ['d:Misc C8', 18], rock: ['d:Stone A2', 34], name: "The Wind's Throat", set: 'd', tint: '#8c9cc0', spires: true,
      base: [['d:Ground C1', 2], ['d:Ground C2', 2], ['d:Ground I2', 2], ['d:Ground I5', 1], ['d:Ground C5', 1]], floor: ['d:Ground D1', 'd:Ground H1'],
      over: [...R('d:Ground E', 1, 15), 'd:Ground A25', 'd:Ground A26', ...R('d:Ground K', 1, 3)], floorOver: R('d:Ground E', 10, 13),
      wall: null, corner: null, low: ['d:Wall A10'], door: null, edge: [['d:Stone B7', 22], ['d:Stone B8', 18], ['d:Stone B1', 24], ['d:Stone B3', 22], ['d:Stone B9', 26]],
      props: [['d:Stone B7', 22], ['d:Stone B8', 18], ['d:Stone B1', 24], ['d:Stone B3', 22], ['d:Stone A1', 26], ['d:Stone A2', 34], ['d:Stone A3', 22], ['d:Stone B9', 26], ['d:Misc B44', 6], ['d:Misc B45', 6], ['d:Misc C14', 26], ['d:Misc C8', 18, 'light']],
      decor: ['d:Stone B4', 'd:Ground A25!', 'd:Ground A26!', 'd:Stone B2', 'd:Stone B6'], breaks: [['barrel', 'd:Misc A8'], ['crate', 'd:Misc B1'], ['pot', 'd:Misc A2']] },
    shadow: { pillar: ['d:Wall A6', 16], statue: ['d:Stone A23', 30], brazier: ['d:Misc C8', 18], rock: ['d:Wall J16', 34], name: "The Moon's Shadow", set: 'd', tint: '#b87478',
      base: [['d:Ground D1', 4], ['d:Ground H4', 2], ['d:Ground H1', 2]], floor: ['d:Ground H1', 'd:Ground H4'],
      over: R('d:Ground E', 1, 13), floorOver: R('d:Ground E', 10, 13),
      wall: ['d:Wall D1', 'd:Wall D3', 'd:Wall D4', 'd:Wall D7', 'd:Wall D8', 'd:Wall D9'], corner: 'd:Wall D2', low: ['d:Wall D5', 'd:Wall A10'], door: 'd:Door A1', vines: R('d:WallFlora A', 8, 14),
      props: [['d:Misc C1', 20], ['d:Misc C7', 16], ['d:Wall A6', 16], ['d:Stone A21', 16], ['d:Stone A8', 30], ['d:Misc C8', 18, 'light'], ['d:Misc B44', 6], ['d:Misc B45', 6], ['d:Wall J16', 34], ['d:Wall J17', 34], ['d:Stone A23', 30], ['d:Wall J11', 14]],
      decor: ['d:Misc D7', 'd:Misc D8', 'd:Stone B4'], breaks: [['barrel', 'd:Misc A8'], ['pot', 'd:Misc A2'], ['poison', null], ['crate', 'd:Misc B1']] },
  };
  const NAMES = { court: 'THE COURTYARD', bridge: 'THE CAUSEWAY', ring: 'THE RING', pit: 'THE PIT', cross: 'THE CROSSROADS',
    lair_warden: 'THE GATEHOUSE', lair_twins: 'THE TWIN NAVE', lair_umbral: 'THE UMBRAL DAIS', lair_hunger: 'THE MAW', lair_wing: 'THE EYRIE', lair_firstCut: "THE MOON'S ALTAR" };
  const SPAWN = { lair_warden: ['drop', 'side'], lair_twins: ['side', 'drop'], lair_umbral: ['rift', 'drop'], lair_hunger: ['drop', 'rift'], lair_wing: ['side', 'drop'], lair_firstCut: ['rift', 'drop'], court: ['side', 'drop'], bridge: ['side', 'drop'], ring: ['rift', 'drop'], pit: ['drop', 'rift'], cross: ['side', 'rift'] };

  // The walkable shape of each layout on its grid; where the way in and the way on are; where the plaza is.
  const LAYOUTS = {
    court: { w: 13, h: 11, cell: () => FLOOR, plaza: (x, y) => Math.abs(x) <= 3.5 && Math.abs(y) <= 2.5 },
    bridge: { w: 16, h: 7, cell: (x, y) => (Math.abs(y) <= 1.5 || (Math.abs(x) <= 2.1 && Math.abs(y) <= 2.6)) ? FLOOR : 'hole', plaza: (x, y) => Math.abs(x) <= 2 && Math.abs(y) <= 2.5 },
    ring: { w: 13, h: 13, cell: (x, y) => Math.hypot(x, y) <= 6.15 ? FLOOR : 0, plaza: (x, y) => Math.hypot(x, y) <= 2.6 },
    pit: { w: 14, h: 14, cell: (x, y) => { const d = Math.hypot(x, y); return d < 1.9 ? 'hole' : d <= 6.7 ? FLOOR : 0; }, plaza: (x, y) => { const d = Math.hypot(x, y); return d > 2.3 && d < 3.6; } },
    cross: { w: 15, h: 15, cell: (x, y) => (Math.abs(x) <= 2.5 || Math.abs(y) <= 2.5 || Math.hypot(x, y) <= 3.9) ? FLOOR : 0, plaza: (x, y) => Math.hypot(x, y) <= 3.2 },
    // ---- the guardians' lairs: hand-built, each with its own hazards ----
    // Map characters: '#' floor, '.' void, '~' water (or void), 'E' the way in, P pillar, S statue,
    // B brazier, R ruin or rock, V a vent (a hazard that strikes on a rhythm), Z a lingering zone.
    lair_warden: { lair: true, map: [
      'B###########B',
      '#############',
      '##P###V###P##',
      '#############',
      '#####P#P#####',
      'E##V#####V###',
      '#####P#P#####',
      '#############',
      '##P###V###P##',
      '#############',
      'B###########B'], hz: { vents: { every: 3.6, pattern: 'alt', dmg: 14, r: 34, delay: 1.2, fx: 'fire_burst' } } },
    lair_twins: { lair: true, map: [
      '###############',
      '#P##P##P##P##P#',
      '#Z###########Z#',
      '###############',
      'E##B#######B###',
      '###############',
      '#Z###########Z#',
      '#P##P##P##P##P#',
      '###############'], hz: { zones: { r: 46, dps: 0, slow: 0.8, fx: 'frost_nova' }, vents: { every: 5, pattern: 'rand', dmg: 12, r: 30, delay: 1.3, fx: 'ice_shatter', spots: 'zones' } } },
    lair_umbral: { lair: true, map: [
      '....#####....',
      '..####V####..',
      '.###########.',
      '.##..###..##.',
      '###..###..###',
      '#V#########V#',
      'E############',
      '#V#########V#',
      '###..###..###',
      '.##..###..##.',
      '.###########.',
      '..####V####..',
      '....#####....'], hz: { vents: { every: 3.2, pattern: 'rand', dmg: 15, r: 32, delay: 1.1, fx: 'dark_curse' } } },
    lair_hunger: { lair: true, w: 14, h: 14, map: (x, y) => { const d = Math.hypot(x, y), a = Math.atan2(y, x); if (d < 2.0) return '~'; if (d > 6.6) return '.';
      for (let k = 0; k < 6; k++) { const b = k * Math.PI / 3; if (Math.abs(d - 4.7) < 0.5 && Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.12) return 'P'; }
      for (let k = 0; k < 3; k++) { const b = Math.PI / 6 + k * Math.PI * 2 / 3; if (Math.abs(d - 3.6) < 0.5 && Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.16) return 'Z'; } return '#'; },
      hz: { zones: { r: 44, dps: 9, slow: 0.4, fx: 'poison_cloud' }, vents: { every: 4.2, pattern: 'seq', dmg: 14, r: 36, delay: 1.2, fx: 'rock_burst', ring: { r: 2.6, n: 6 } } } },
    lair_wing: { lair: true, w: 15, h: 15, map: (x, y) => { const d = Math.hypot(x, y); if (!(Math.abs(x) <= 2.5 || Math.abs(y) <= 2.5 || d <= 4.3)) return '.';
      if (Math.abs(Math.abs(x) - 3) < 0.6 && Math.abs(Math.abs(y) - 3) < 0.6) return 'P'; if ((Math.abs(x) < 0.6 && Math.abs(Math.abs(y) - 5.5) < 0.6) || (Math.abs(y) < 0.6 && Math.abs(Math.abs(x) - 5.5) < 0.6 && x > 0)) return 'V'; return '#'; },
      hz: { vents: { every: 3.4, pattern: 'seq', dmg: 15, r: 40, delay: 1.1, fx: 'wind_gust', ring: { r: 3.4, n: 8 } } } },
    // The Moon's Altar: a small summit, the whole of it in view, with the god standing in the void beyond its
    // far edge, looking in (the author, 2026-11-10). godR: how far from the centre he strikes, in tiles.
    lair_firstCut: { lair: true, open: true, w: 9, h: 9, godR: 3.2, map: (x, y) => { const d = Math.hypot(x, y); if (d > 3.6) return '.';
      if (Math.abs(d - 3) < 0.4 && (Math.abs(x) < 0.6 || Math.abs(y) < 0.6) && x > -2) return 'B'; return '#'; },
      hz: { vents: { every: 2.8, pattern: 'seq', dmg: 17, r: 36, delay: 1.0, fx: 'fire_burst', ring: { r: 2.4, n: 6 } } } },
  };
  // A lair's map as rows of characters.
  function lairRows(L) {
    if (Array.isArray(L.map)) return L.map;
    const rows = []; for (let cy = 0; cy < L.h; cy++) { let row = ''; for (let cx = 0; cx < L.w; cx++) row += L.map(cx + 0.5 - L.w / 2, cy + 0.5 - L.h / 2); rows.push(row); }
    return rows;
  }

  function build(stageId, kind, seed) {
    const th = THEMES[stageId] || THEMES.gate, L = LAYOUTS[kind] || LAYOUTS.court, r = rngOf(hashStr(stageId + '|' + kind + '|' + (seed || 0)));
    const rows = L.lair ? lairRows(L) : null;
    const w = rows ? rows[0].length : L.w, h = rows ? rows.length : L.h, x0 = -w * T / 2, y0 = -h * T / 2, N = w * h;
    const A = { kind: 'grid', id: stageId + '|' + kind + '|' + (seed || 0), layout: kind, name: NAMES[kind] || 'THE FIELD', theme: stageId, tint: th.tint, frost: !!th.frost, set: th.set,
      w, h, T, x0, y0, cells: new Uint8Array(N), solid: new Uint8Array(N), ground: new Array(N), over: [], walls: [], objs: [], lights: [], ripples: [], spawn: SPAWN[kind] || ['side', 'drop'], godR: L.godR ? L.godR * T : 0 };
    const idx = (cx, cy) => cy * w + cx, inb = (cx, cy) => cx >= 0 && cy >= 0 && cx < w && cy < h;
    // Cell coordinates relative to the centre, in cells.
    const rel = (cx, cy) => [cx + 0.5 - w / 2, cy + 0.5 - h / 2];
    const ctr = (cx, cy) => [x0 + (cx + 0.5) * T, y0 + (cy + 0.5) * T];
    const water = th.set === 'd' && (stageId === 'stair' || stageId === 'shadow' || stageId === 'throat') ? false : th.set === 'd';
    for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
      if (rows) { const ch = rows[cy][cx]; A.cells[idx(cx, cy)] = ch === '.' ? 0 : ch === '~' ? (water ? WATER : 0) : FLOOR; continue; }
      const [px, py] = rel(cx, cy), c = L.cell(px, py);
      A.cells[idx(cx, cy)] = c === FLOOR ? FLOOR : c === 'hole' && water ? WATER : 0;
    }
    const floor = (cx, cy) => inb(cx, cy) && A.cells[idx(cx, cy)] === FLOOR;
    // The way in (front-left edge, middle) and the way on (back-right edge, middle).
    const mid = Math.floor(h / 2); let ex = w - 1; while (ex > 0 && !floor(ex, mid)) ex--; let nx = 0; while (nx < w - 1 && !floor(nx, mid)) nx++;
    const [ecx, ecy] = ctr(ex, mid), [ncx, ncy] = ctr(nx, mid);
    A.exit = { x: ecx + T / 2 - 34, y: ecy, cx: ex, cy: mid }; A.entry = { x: ncx - T / 2 + 40, y: ncy, cx: nx, cy: mid };
    if (rows) for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) if (rows[cy][cx] === 'E') { const [x, y] = ctr(cx, cy); A.entry = { x: x - T / 2 + 40, y, cx, cy }; }
    const clear = (x, y, rad) => Math.hypot(x, y) < T * 1.8 + rad || Math.hypot(x - A.exit.x, y - A.exit.y) < T * 1.2 + rad || Math.hypot(x - A.entry.x, y - A.entry.y) < T * 1.1 + rad
      || (Math.abs(y - A.entry.y) < T * 0.55 + rad && x > A.entry.x - 20 && x < A.exit.x + 20);
    // Ground: the plaza paved, the rest the hour's natural floor, scattered with grass, stones and cracks.
    const wsum = th.base.reduce((a, b) => a + b[1], 0);
    const baseOf = () => { let v = r() * wsum; for (const [k, n] of th.base) { if ((v -= n) <= 0) return k; } return th.base[0][0]; };
    for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
      const i = idx(cx, cy), [px, py] = rel(cx, cy);
      if (A.cells[i] === WATER) { A.ground[i] = 'd:Ground W4_' + pick(D4, r); if (r() < 0.35) A.ripples.push(ctr(cx, cy).concat([r() * 3])); continue; }
      if (A.cells[i] !== FLOOR) continue;
      const paved = L.lair ? Math.hypot(px, py) < 3.2 || r() < 0.25 : L.plaza(px, py);
      A.ground[i] = (paved ? pick(th.floor, r) : baseOf()) + '_' + pick(D4, r);
      const ov = paved ? th.floorOver : th.over;
      if (ov && r() < (paved ? 0.12 : 0.3)) A.over.push({ key: pick(ov, r) + '_' + pick(D2, r), cx, cy });
    }
    // Walls along the back edges, where nothing walkable stands behind them (they never hide a fighter).
    const behindClear = (cx, cy, side) => {
      if (side === 'N') { for (let x = cx + 1; x < w; x++) for (let y = Math.max(0, cy - 1); y <= cy; y++) if (A.cells[idx(x, y)]) return false; return true; }
      for (let y = cy - 1; y >= 0; y--) for (let x = cx; x <= Math.min(w - 1, cx + 1); x++) if (A.cells[idx(x, y)]) return false; return true;
    };
    let run = 0;
    const wallAt = (cx, cy, side, key) => { const [x, y] = ctr(cx, cy); A.walls.push({ key: key + '_' + side, x, y, side, cx, cy }); };
    for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
      if (!floor(cx, cy)) continue;
      const n = !inb(cx + 1, cy) || !A.cells[idx(cx + 1, cy)], wv = !inb(cx, cy - 1) || !A.cells[idx(cx, cy - 1)];
      const okN = n && behindClear(cx, cy, 'N'), okW = wv && behindClear(cx, cy, 'W');
      const isExit = cx === A.exit.cx && cy === A.exit.cy;
      if (!L.open && th.wall && (okN || okW) && (th.walls == null || r() < th.walls || isExit)) {
        run++;
        if (isExit && okN && th.door) wallAt(cx, cy, 'N', th.door);
        else if (okN && okW) wallAt(cx, cy, 'W', th.corner || pick(th.wall, r));
        else wallAt(cx, cy, okN ? 'N' : 'W', pick(th.wall, r));
        const last = A.walls[A.walls.length - 1];
        if (th.vines && r() < 0.18) A.walls.push({ key: pick(th.vines, r) + '_' + last.side, x: last.x, y: last.y, side: last.side, cx, cy, over: true });
        // A torch every few panels, on the wall's face.
        if (run % 3 === 1 && !isExit) { const [x, y] = ctr(cx, cy), side = last.side, tx = side === 'N' ? x + T / 2 - 6 : x, ty = side === 'N' ? y : y - T / 2 + 6; A.objs.push({ key: side === 'N' ? 'd:Torch West' : 'd:Torch East', x: tx, y: ty, r: 0, kind: 'torch', z: 0, back: true }); A.lights.push({ x: tx, y: ty, r: 120 }); }
      } else if (!L.open && th.edge && (okN || okW) && r() < 0.8 && !isExit) {
        // An open edge lined with rock spires instead of walls.
        const [x, y] = ctr(cx, cy), [k, rad] = pick(th.edge, r);
        A.objs.push({ key: k + '_' + pick(['E', 'S'], r), x: x + (okN ? T * 0.3 : 0), y: y - (okW ? T * 0.3 : 0), r: rad, kind: 'prop', solid: true });
      }
      // Low walls and fences along the rim of a hole.
      const hn = inb(cx + 1, cy) && !A.cells[idx(cx + 1, cy)] && !behindClear(cx, cy, 'N'), hw = inb(cx, cy - 1) && !A.cells[idx(cx, cy - 1)] && !behindClear(cx, cy, 'W');
      if (th.low && (hn || hw) && L === LAYOUTS.pit) { const [x, y] = ctr(cx, cy); A.walls.push({ key: pick(th.low, r) + '_' + (hn ? 'N' : 'W'), x, y, side: hn ? 'N' : 'W', cx, cy, low: true }); }
    }
    // Props and ruins to fight around; never in the plaza, the way in or the way on, and never cutting the map apart.
    const reach = () => {
      const seen = new Uint8Array(N), q = [idx(A.entry.cx, A.entry.cy)]; seen[q[0]] = 1; let n = 1;
      while (q.length) { const i = q.pop(), cx = i % w, cy = (i - cx) / w; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = cx + dx, y = cy + dy; if (!floor(x, y)) continue; const j = idx(x, y); if (seen[j] || A.solid[j]) continue; seen[j] = 1; n++; q.push(j); } }
      return { n, exit: !!seen[idx(A.exit.cx, A.exit.cy)] };
    };
    // A lair's set pieces and hazards, where its map puts them.
    if (rows) {
      const hz = L.hz || {}, vents = [], zones = [];
      for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
        const ch = rows[cy][cx], [x, y] = ctr(cx, cy), set = { P: th.pillar, S: th.statue, B: th.brazier, R: th.rock }[ch];
        if (set) { const [key, rad] = set; A.objs.push({ key: key + '_' + (key.startsWith('d:Wall') ? pick(['N', 'W'], r) : pick(['E', 'S'], r)), x, y, r: rad, kind: ch === 'B' ? 'light' : 'prop', solid: true }); if (rad >= 26) A.solid[idx(cx, cy)] = 1; if (ch === 'B') A.lights.push({ x, y, r: 130 }); }
        if (ch === 'V') vents.push({ x, y }); if (ch === 'Z') zones.push({ x, y });
      }
      if (hz.vents && hz.vents.ring) for (let k = 0; k < hz.vents.ring.n; k++) { const a = k / hz.vents.ring.n * Math.PI * 2; vents.push({ x: Math.cos(a) * hz.vents.ring.r * T, y: Math.sin(a) * hz.vents.ring.r * T }); }
      A.hz = { vents: hz.vents ? Object.assign({}, hz.vents, { spots: hz.vents.spots === 'zones' ? zones.map((z) => ({ x: z.x, y: z.y })) : vents }) : null, zones: hz.zones ? zones.map((z) => Object.assign({ x: z.x, y: z.y }, hz.zones)) : [] };
      for (const v of A.hz.vents ? A.hz.vents.spots : []) A.over.push({ key: (th.set === 'i' ? 'i' : 'd') + ':Ground E8_E', cx: Math.floor((v.x - x0) / T), cy: Math.floor((v.y - y0) / T) });
    }
    let floors = 0; for (let i = 0; i < N; i++) if (A.cells[i] === FLOOR) floors++;
    const cellsList = []; for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) if (floor(cx, cy)) cellsList.push([cx, cy]);
    for (let k = cellsList.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [cellsList[k], cellsList[j]] = [cellsList[j], cellsList[k]]; }
    const want = rows ? 0 : Math.round(floors * 0.13);
    let placed = 0;
    for (const [cx, cy] of cellsList) {
      if (placed >= want) break;
      const [x0c, y0c] = ctr(cx, cy), x = x0c + (r() - 0.5) * T * 0.4, y = y0c + (r() - 0.5) * T * 0.4, [key, rad, kind] = pick(th.props, r);
      if (clear(x, y, rad) || A.objs.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + rad + 34)) continue;
      const i = idx(cx, cy), big = rad >= 26;
      if (big) { A.solid[i] = 1; const q = reach(); if (!q.exit || q.n < floors * 0.86) { A.solid[i] = 0; continue; } }
      A.objs.push({ key: key + '_' + pick(key.startsWith('d:Wall') ? ['N', 'W'] : ['E', 'S'], r), x, y, r: rad, kind: kind === 'light' ? 'light' : 'prop', solid: rad > 0 });
      if (kind === 'light') A.lights.push({ x, y, r: 110 });
      placed++;
    }
    // Breakables in small clusters near the props and the walls.
    for (let c = 0, tries = 0; c < (L.open ? 0 : rows ? 3 : 7) && tries < 80; tries++) {
      const [cx, cy] = pick(cellsList, r), [bx, by] = ctr(cx, cy);
      if (clear(bx, by, 30)) continue;
      const [type, key] = pick(th.breaks, r), n = 1 + Math.floor(r() * 3), B = BREAK[type];
      for (let k = 0; k < n; k++) {
        const x = bx + (r() - 0.5) * 50, y = by + (r() - 0.5) * 50;
        if (A.objs.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + 22)) continue;
        A.objs.push({ key: key ? key + '_E' : null, anim: B.anim, x, y, r: 11, kind: 'break', type, hp: B.hp, solid: true });
      }
      c++;
    }
    // A chest tucked away off the way through, against a wall or among the props: worth the detour.
    if (!rows && r() < 0.7) {
      const cand = cellsList.filter(([cx, cy]) => { const [x, y] = ctr(cx, cy); if (clear(x, y, 40) || Math.abs(y - A.entry.y) < T * 1.6) return false; let edge = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!floor(cx + dx, cy + dy)) edge++; return edge > 0 && !A.objs.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + 40); });
      if (cand.length) {
        const [cx, cy] = pick(cand, r), [x, y] = ctr(cx, cy), v = r(), tier = v < 0.12 ? 'gold' : v < 0.42 ? 'iron' : 'wood', K = { wood: ['A1', 'A2'], iron: ['A3', 'A4'], gold: ['B1', 'B2'] }[tier], d = pick(['E', 'S'], r);
        A.objs.push({ key: 'd:Chest ' + K[0] + '_' + d, openKey: 'd:Chest ' + K[1] + '_' + d, x, y, r: 13, kind: 'chest', tier, hp: 1, solid: true });
        A.lights.push({ x, y, r: 60 });
      }
    }
    // Plants and small things underfoot (walk-through).
    for (let k = 0; k < Math.round(floors * (rows ? 0.03 : 0.1)); k++) {
      const [cx, cy] = pick(cellsList, r), [x, y] = ctr(cx, cy), d = pick(th.decor, r), flat = d.endsWith('!');
      if (Math.hypot(x, y) < T * 1.2) continue;
      if (flat) A.over.push({ key: d.slice(0, -1) + '_' + pick(D2, r), cx, cy });
      else A.objs.push({ key: d + '_' + pick(['E', 'S'], r), x: x + (r() - 0.5) * T * 0.5, y: y + (r() - 0.5) * T * 0.5, r: 0, kind: 'decor' });
    }
    // Spatial index of the solid props for collision.
    A.byCell = new Array(N); for (const o of A.objs) if (o.solid && o.r > 0) { const cx = Math.floor((o.x - x0) / T), cy = Math.floor((o.y - y0) / T); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(cx + dx, cy + dy)) (A.byCell[idx(cx + dx, cy + dy)] || (A.byCell[idx(cx + dx, cy + dy)] = [])).push(o); }
    A.bounds = boundsOf(A);
    return A;
  }
  function boundsOf(A) {
    let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
    for (let cy = 0; cy < A.h; cy++) for (let cx = 0; cx < A.w; cx++) if (A.cells[cy * A.w + cx] === FLOOR) { a = Math.min(a, cx); b = Math.max(b, cx); c = Math.min(c, cy); d = Math.max(d, cy); }
    return { x0: A.x0 + a * A.T, x1: A.x0 + (b + 1) * A.T, y0: A.y0 + c * A.T, y1: A.y0 + (d + 1) * A.T };
  }

  // ---- walking ---------------------------------------------------------------------------------
  // What stands in the way: unbroken props, and chests even once opened.
  const blocks = (o) => !o.broken || o.kind === 'chest';
  const ok = (A, cx, cy) => cx >= 0 && cy >= 0 && cx < A.w && cy < A.h && A.cells[cy * A.w + cx] === FLOOR;
  // The nearest point to (x, y) at least m inside the floor and m clear of the solid props.
  function clamp(A, x, y, m) {
    // Out of the props, then back onto the floor (a prop at the map's edge must not push anyone off it).
    let c = clampOnce(A, x, y, m || 0);
    if (!onFloor(A, c[0], c[1])) c = clampFloor(A, c[0], c[1], m || 0);
    return c;
  }
  const onFloor = (A, x, y) => ok(A, Math.floor((x - A.x0) / T), Math.floor((y - A.y0) / T));
  function clampFloor(A, x, y, m) { const L = A.byCell; A.byCell = []; const c = clampOnce(A, x, y, m); A.byCell = L; return c; }
  function clampOnce(A, x, y, m) {
    let cx = Math.floor((x - A.x0) / T), cy = Math.floor((y - A.y0) / T);
    if (!ok(A, cx, cy)) {
      let best = null, bd = 1e18;
      for (let rr = 1; rr <= Math.max(A.w, A.h) && !best; rr++) for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rr) continue;
        const ax = cx + dx, ay = cy + dy; if (!ok(A, ax, ay)) continue;
        const bx = A.x0 + ax * T, by = A.y0 + ay * T, mm = Math.min(m, T / 2 - 1), qx = Math.max(bx + mm, Math.min(bx + T - mm, x)), qy = Math.max(by + mm, Math.min(by + T - mm, y)), d = (qx - x) ** 2 + (qy - y) ** 2;
        if (d < bd) { bd = d; best = [qx, qy, ax, ay]; }
      }
      if (!best) return [x, y];
      x = best[0]; y = best[1]; cx = best[2]; cy = best[3];
    }
    if (m > 0) {
      const bx = A.x0 + cx * T, by = A.y0 + cy * T, mm = Math.min(m, T / 2 - 1);
      if (!ok(A, cx - 1, cy) && x < bx + mm) x = bx + mm; if (!ok(A, cx + 1, cy) && x > bx + T - mm) x = bx + T - mm;
      if (!ok(A, cx, cy - 1) && y < by + mm) y = by + mm; if (!ok(A, cx, cy + 1) && y > by + T - mm) y = by + T - mm;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (ok(A, cx + sx, cy + sy)) continue;
        const kx = sx < 0 ? bx : bx + T, ky = sy < 0 ? by : by + T, dx = Math.abs(x - kx), dy = Math.abs(y - ky);
        if (dx < mm && dy < mm) { if (mm - dx < mm - dy) x = kx - sx * mm; else y = ky - sy * mm; }
      }
    }
    const list = A.byCell[cy * A.w + cx];
    if (list) for (const o of list) {
      if (!blocks(o)) continue;
      const dx = x - o.x, dy = y - o.y, d = Math.hypot(dx, dy), rr = o.r + Math.max(0, m);
      if (d < rr) { if (d < 0.01) { x = o.x + rr; } else { x = o.x + dx / d * rr; y = o.y + dy / d * rr; } }
    }
    return [x, y];
  }
  const inside = (A, x, y, m) => { const c = clamp(A, x, y, m || 0); return Math.abs(c[0] - x) < 0.01 && Math.abs(c[1] - y) < 0.01; };
  // Can one walk straight from a to b? (floor all the way, no solid prop in the way)
  function los(A, ax, ay, bx, by, pad) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 18); pad = pad == null ? 8 : pad;
    for (let i = 1; i < n; i++) {
      const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n, cx = Math.floor((x - A.x0) / T), cy = Math.floor((y - A.y0) / T);
      if (!ok(A, cx, cy)) return false;
      const list = A.byCell[cy * A.w + cx]; if (list) for (const o of list) if (blocks(o) && Math.hypot(x - o.x, y - o.y) < o.r + pad) return false;
    }
    return true;
  }
  // The way round: a breadth-first field from the target's cell, cached per target cell.
  function field(A, tc) {
    A._flow = A._flow || {}; if (A._flow[tc]) return A._flow[tc];
    const N = A.w * A.h, dist = new Float32Array(N).fill(1e9), q = [tc]; dist[tc] = 0;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], cx = i % A.w, cy = (i - cx) / A.w;
      for (const [dx, dy, c] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]]) {
        const x = cx + dx, y = cy + dy; if (!ok(A, x, y)) continue; const j = y * A.w + x; if (A.solid[j] && j !== tc) continue;
        if (dx && dy && (!ok(A, cx + dx, cy) || !ok(A, cx, cy + dy) || A.solid[cy * A.w + cx + dx] || A.solid[(cy + dy) * A.w + cx])) continue;
        if (dist[i] + c < dist[j]) { dist[j] = dist[i] + c; q.push(j); }
      }
    }
    const keys = Object.keys(A._flow); if (keys.length > 24) delete A._flow[keys[0]];
    return (A._flow[tc] = dist);
  }
  // Which way to go from (x, y) to reach (tx, ty): straight when the way is clear, else round by the field.
  // Which way to go, then slid round any prop right in front (so nobody pushes into a barrel or a chest).
  function steer(A, x, y, tx, ty) {
    let [vx, vy] = route(A, x, y, tx, ty);
    const cx = Math.floor((x - A.x0) / T), cy = Math.floor((y - A.y0) / T), list = cx >= 0 && cy >= 0 && cx < A.w && cy < A.h ? A.byCell[cy * A.w + cx] : null;
    if (list) for (const o of list) {
      if (!blocks(o) || Math.hypot(o.x - tx, o.y - ty) < o.r + 4) continue;
      const ox = o.x - x, oy = o.y - y, od = Math.hypot(ox, oy) || 1, reach = o.r + 26;
      if (od > reach || (ox * vx + oy * vy) <= 0) continue;
      const nx = ox / od, ny = oy / od, side = (vx * -ny + vy * nx) >= 0 ? 1 : -1, k = (reach - od) / reach;
      vx = vx - nx * k * 1.2 + -ny * side * k * 1.4; vy = vy - ny * k * 1.2 + nx * side * k * 1.4;
    }
    const n = Math.hypot(vx, vy) || 1; return [vx / n, vy / n];
  }
  function route(A, x, y, tx, ty) {
    const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
    if (d < 30 || los(A, x, y, tx, ty, 10)) return [dx / d, dy / d];
    const tcx = Math.floor((tx - A.x0) / T), tcy = Math.floor((ty - A.y0) / T), cx = Math.floor((x - A.x0) / T), cy = Math.floor((y - A.y0) / T);
    if (!ok(A, tcx, tcy) || !ok(A, cx, cy)) return [dx / d, dy / d];
    const F = field(A, tcy * A.w + tcx); let best = null, bv = F[cy * A.w + cx];
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue; const ax = cx + ox, ay = cy + oy; if (!ok(A, ax, ay)) continue;
      if (ox && oy && (!ok(A, cx + ox, cy) || !ok(A, cx, cy + oy))) continue;
      const v = F[ay * A.w + ax]; if (v < bv - 0.01) { bv = v; best = [ax, ay]; }
    }
    if (!best) return [dx / d, dy / d];
    // Aim for the next cell's centre, or straight on if that cell is the target's.
    const px = A.x0 + (best[0] + 0.5) * T, py = A.y0 + (best[1] + 0.5) * T, ex = px - x, ey = py - y, e = Math.hypot(ex, ey) || 1;
    return [ex / e, ey / e];
  }
  // A walkable point at a distance between lo and hi from (x, y), preferring one in clear sight of it.
  function around(A, rand, x, y, lo, hi, m, sight) {
    let fallback = null;
    for (let k = 0; k < 40; k++) {
      const an = rand() * Math.PI * 2, d = lo + (hi - lo) * rand(), px = x + Math.cos(an) * d, py = y + Math.sin(an) * d;
      if (!inside(A, px, py, m)) continue;
      if (!sight || los(A, px, py, x, y, 6)) return { x: px, y: py };
      fallback = fallback || { x: px, y: py };
    }
    if (fallback) return fallback;
    const c = clamp(A, x + lo, y, m); return { x: c[0], y: c[1] };
  }

  VS.ARENA = { T, THEMES, LAYOUTS, BREAK, build, clamp, inside, onFloor, los, steer, around, ok, rngOf, hashStr };
})(typeof window !== 'undefined' ? window : globalThis);
