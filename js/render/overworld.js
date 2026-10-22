/*
 * Tower of Wishes — the pixel overworld (the world map, option A, 2026-10-22).
 *
 * The map is built from the author's tilesets (assets/tiles, via tiles.js) like a classic RPG
 * overworld: a 50 x 25 grid of 16 px ground tiles, one road from Ashgate in the west to the
 * Tower on the eastern edge, the river with its toll bridge, and each land dressed by its
 * biome (houses, forest, rocks, ruins, farms, tents, snow pines, the Tower's spire). Lands
 * nobody has reached yet lie under cloud. Stops are the UI pack's framed icons; Kael's own
 * sprite stands at the current chapter. Labels are the Adventurer pixel font on small plates.
 *
 * Same interface as the painted map (js/render/map.js, kept as option B):
 *   create(canvas) -> { draw(view, t, sel), pick(x, y), nodeScreen(id), pan(dx) }
 * Data and layout come from js/campaign.js (map space 1000 x 500).
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});
  const painted = NS.map;   // option B
  const CELL = 20;          // map units per tile
  const PX = 0.8;           // base pixels per map unit (one 16 px tile = 20 units)
  const GW = 50, GH = 25, BW = GW * 16, BH = GH * 16;
  const TOP = 58;           // the title bar (CSS px)

  // Ground: the tileset's muted grass everywhere (stone in the city and at the Tower), each
  // land washed in its own colour. [tiles, wash]
  const GRASS = ['g_grass_0_0', 'g_grass_0_1', 'g_grass_1_0', 'g_grass_1_1', 'g_grass_2_0', 'g_grass_2_1', 'g_grass_3_0', 'g_grass_3_1', 'g_grass_6_0', 'g_grass_7_0'];
  const PEBBLE = ['g_grass_4_0', 'g_grass_4_1', 'g_grass_5_0', 'g_grass_6_1'];
  const SLAB = ['g_slab_0_0', 'g_slab_0_1', 'g_slab_1_0', 'g_slab_1_1'];
  const GROUND = {
    forest: [GRASS, 'rgba(8,40,22,0.38)'], town: [GRASS, null], fields: [GRASS, 'rgba(120,150,40,0.10)'],
    hills: [GRASS, 'rgba(120,72,28,0.26)'], ruins: [GRASS, 'rgba(70,70,60,0.22)'], city: [SLAB, 'rgba(28,22,44,0.38)'],
    wilds: [GRASS, 'rgba(26,18,30,0.42)'], farms: [GRASS, 'rgba(210,170,50,0.20)'], camp: [GRASS, 'rgba(14,16,40,0.45)'],
    frost: [SLAB, 'rgba(225,236,255,0.45)'], tower: [SLAB, 'rgba(22,16,40,0.3)'], wild: [GRASS, 'rgba(40,60,20,0.12)'],
  };
  const PROP_K = 0.34; // props shrink to overworld size (a house about two tiles)
  // Props per biome: [names, count per land]
  const DRESS = {
    forest: [['tree_a', 'tree_b', 'tree_c', 'pine_a', 'pine_b', 'tree_dark_a', 'bush_a', 'bush_b', 'fern_a'], 34],
    town: [['p16_house_red', 'p16_house_blue', 'p16_house_red', 'p16_stall', 'fv_well', 'p16_lamp_post', 'bush_c', 'tree_young'], 16],
    fields: [['bush_a', 'bush_d', 'tuft_2', 'tuft_5', 'tree_a', 'tuft_8', 'fv_tree_birch'], 14],
    hills: [['rock_big', 'rock_a', 'rock_b', 'fv_boulder', 'monolith_a', 'rock_m1', 'fv_tree_autumn_orange', 'rock_c'], 18],
    ruins: [['ruin_pillar', 'ruin_wall', 'pillar_broken', 'ruin_stone_a', 'statue', 'grave_a', 'rock_a'], 12],
    city: [['ruin_wall', 'slab_wall_a', 'arch_a', 'lantern_post', 'pillar', 'tomb', 'slab_wall_b'], 16],
    wilds: [['tree_dark_a', 'tree_dark_b', 'fv_tree_dead', 'tree_gnarled', 'bush_e', 'pine_b'], 18],
    farms: [['fv_haystack', 'fv_fence_h', 'fv_scarecrow', 'fv_grain_sack', 'cd_hay_bale', 'bush_a', 'fv_beehive'], 14],
    camp: [['fv_tent_green', 'fv_tent_red', 'fv_log_pile', 'tree_dark_b', 'fv_tree_dead', 'pine_a'], 10],
    frost: [['fv_tree_pine_snow', 'fv_tree_pine_snow', 'rock_a', 'fv_tree_pine_snow', 'rock_m2'], 14],
    tower: [['pillar', 'statue', 'rock_dark'], 4],
  };
  // UI pack icons per stop kind: [sheet, col, row]
  const ICON = {
    story: [1, 3, 4], contract: [1, 7, 3], side: [1, 0, 3], dungeon: [1, 7, 5], training: [1, 1, 3],
    arcade: [1, 4, 6], hire: [1, 2, 6], locked: [3, 5, 3], tower: [1, 5, 5], done: [1, 7, 0], mark: [3, 1, 6],
  };
  const PLATE = '#241811', EDGE = '#c9a25a', INK = '#0d0a08';

  function rngOf(seed) { let s = seed % 2147483647 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  function hash2(i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  }

  const icons = {};
  function icon(n) {
    if (!icons[n]) { const im = new Image(); im.src = 'assets/ui/icons' + n + '.png'; icons[n] = im; }
    return icons[n].complete && icons[n].naturalWidth ? icons[n] : null;
  }

  function create(canvas) {
    const T = NS.tiles, C = window.TowCampaign;
    const fallback = painted ? painted.create(canvas) : null;
    if (!T || !C) return fallback;
    const ctx = canvas.getContext('2d');
    let base = null, baseKey = '', L = null, lastView = null, shown = [], lastT = null;
    const fogCanvas = document.createElement('canvas');
    [1, 3].forEach(icon);

    // ---- the land (rebuilt when what is revealed changes)
    // The nearest land (for the cloud) and how deep inside it (beyond 1.2 radii: open country).
    let ownD = 0;
    function owner(regions, x, y) {
      let best = null, bd = Infinity;
      for (const r of regions) {
        const n = (hash2(Math.round(x / 7), Math.round(y / 7)) - 0.5) * 0.35;
        const d = Math.hypot(x - r.x, y - r.y) / r.r + n;
        if (d < bd) { bd = d; best = r; }
      }
      ownD = bd;
      return best;
    }
    function build(view) {
      const c = document.createElement('canvas'); c.width = BW; c.height = BH;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      const put = (name, x, y, k) => { const s = T.sprite(name); if (!s) return null; k = k || PROP_K; g.drawImage(s.img, s.x, s.y, s.w, s.h, Math.round(x - (s.w * k) / 2), Math.round(y - s.h * k), Math.round(s.w * k), Math.round(s.h * k)); return s; };
      const tile = (name, i, j) => { const s = T.sprite(name); if (s) g.drawImage(s.img, s.x, s.y, s.w, s.h, i * 16, j * 16, 16, 16); };
      const regions = view.regions, byId = Object.fromEntries(view.nodes.map((n) => [n.id, n]));
      // Which cells are road, river, or near a stop (kept clear of props).
      const road = new Map(), busy = new Set();
      const key = (i, j) => i + ',' + j;
      for (const e of view.edges) {
        const a = byId[e.a], b = byId[e.b];
        if (!a || !b || (e.a === 'c15' && e.b === 'prologue')) continue;
        const story = !e.side, steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6);
        for (let k = 0; k <= steps; k++) {
          const x = a.x + ((b.x - a.x) * k) / steps, y = a.y + ((b.y - a.y) * k) / steps;
          const ck = key(Math.floor(x / CELL), Math.floor(y / CELL));
          if (!road.has(ck) || story) road.set(ck, story ? 'g_dirt_2' : 'g_trampled_dirt');
        }
      }
      for (const n of view.nodes) for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) busy.add(key(Math.floor(n.x / CELL) + di, Math.floor(n.y / CELL) + dj));
      const R = C.RIVER, river = new Set();
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const x = (i + 0.5) * CELL, y = (j + 0.5) * CELL;
        for (let k = 0; k + 1 < R.length; k++) if (segDist(x, y, R[k][0], R[k][1], R[k + 1][0], R[k + 1][1]) < CELL * 0.75) { river.add(key(i, j)); break; }
      }
      // Ground
      const own = [];
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const x = (i + 0.5) * CELL, y = (j + 0.5) * CELL, r = owner(regions, x, y);
        own.push(r);
        const k = key(i, j);
        if (river.has(k) && !road.has(k)) { tile((i + j) % 3 ? 'g_water_1' : 'g_water_2', i, j); continue; }
        if (road.has(k)) { tile(river.has(k) ? 'g_wood_plank_v' : road.get(k), i, j); continue; }
        const G = (ownD < 1.2 && GROUND[r.px]) || GROUND.wild, h = hash2(i, j);
        tile(G[0] === GRASS && h < 0.07 ? PEBBLE[Math.floor(h * 977) % PEBBLE.length] : G[0][Math.floor(h * 131) % G[0].length], i, j);
        if (G[1]) { g.fillStyle = G[1]; g.fillRect(i * 16, j * 16, 16, 16); }
      }
      // Props, back to front
      const props = [];
      for (const r of regions) {
        const D = DRESS[r.px]; if (!D) continue;
        const rnd = rngOf(r.x * 31 + r.y * 7);
        for (let n = 0, tries = 0; n < D[1] && tries < D[1] * 8; tries++) {
          const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r.r * 0.95;
          const x = r.x + Math.cos(a) * d, y = r.y + Math.sin(a) * d * 0.85;
          const i = Math.floor(x / CELL), j = Math.floor(y / CELL), k = key(i, j);
          if (i < 0 || j < 1 || i >= GW || j >= GH || road.has(k) || river.has(k) || busy.has(k)) continue;
          if (own[j * GW + i] !== r) continue;
          props.push({ name: D[0][Math.floor(rnd() * D[0].length)], x: x * PX, y: y * PX + 6 });
          n++;
        }
      }
      // Mountains along the northern edge and the Tower's cliffs
      const mr = rngOf(99);
      for (let x = 10; x < 1000; x += 26 + mr() * 18) if (!river.has(key(Math.floor(x / CELL), 0))) props.push({ name: mr() < 0.5 ? 'rock_big' : 'rock_dark', x: x * PX, y: 14 + mr() * 6, k: 0.45 });
      props.sort((a, b) => a.y - b.y);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      for (const p of props) put(p.name, p.x, p.y, p.k);
      g.imageSmoothingEnabled = false;
      // The Tower: a spire of stone wall tiles up the eastern edge, a window per floor.
      const tw = regions.find((r) => r.id === 'tower');
      if (tw) {
        const cx = Math.round(tw.x * PX), top = 34, bot = Math.round(350 * PX);
        const wall = T.sprite('cdw_wall_face_stone'), win = T.sprite('cdw_arched_window'), cap = T.sprite('cdw_wall_top_dark');
        for (let y = top; y < bot; y += 16) for (let dx = -16; dx < 16; dx += 16) if (wall) g.drawImage(wall.img, wall.x, wall.y, wall.w, wall.h, cx + dx, y, 16, 16);
        if (win) for (let y = top + 24; y < bot - 16; y += 52) g.drawImage(win.img, win.x, win.y, win.w, win.h, cx - 8, y, 16, 16);
        if (cap) for (let dx = -20; dx < 20; dx += 16) g.drawImage(cap.img, cap.x, cap.y, cap.w, cap.h, cx + dx, top - 10, 16, 16);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx + 8, top, 8, bot - top); // the shaded side
      }
      // Cloud over lands nobody has reached: dithered at the edges.
      const fog = (r) => r && !r.revealed;
      g.fillStyle = '#cfd4de';
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        if (!fog(own[j * GW + i])) continue;
        let edge = false;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const o = own[(j + dj) * GW + i + di]; if (o && !fog(o)) edge = true; }
        if (!edge) { g.globalAlpha = 0.94; g.fillRect(i * 16, j * 16, 16, 16); g.globalAlpha = 0.5; g.fillStyle = '#e9ecf2'; if (hash2(i * 3, j * 5) < 0.35) g.fillRect(i * 16 + 2, j * 16 + 4, 10, 6); g.fillStyle = '#cfd4de'; continue; }
        g.globalAlpha = 0.9;
        for (let y = 0; y < 16; y += 2) for (let x = (y / 2) % 2 ? 2 : 0; x < 16; x += 4) g.fillRect(i * 16 + x, j * 16 + y, 2, 2);
        g.globalAlpha = 0.5; g.fillRect(i * 16, j * 16, 16, 16);
      }
      g.globalAlpha = 1;
      return c;
    }

    // ---- layout on screen: the map covers the screen and glides so the stop in focus sits in
    // the free band between the title and the card.
    let pan = null, focusId = null;
    function layout(focus, cardOpen, dt) {
      const dpr = canvas.width / Math.max(1, canvas.clientWidth || canvas.width);
      const W = canvas.width / dpr, H = canvas.height / dpr;
      let s = Math.max(W / BW, H / BH);
      const k = s * dpr, kr = Math.round(k);
      if (kr >= 2 && Math.abs(kr - k) / k < 0.1 && kr / dpr >= s) s = kr / dpr;
      const mw = BW * s, mh = BH * s;
      const top = TOP, bot = H - (cardOpen ? 96 : 8);
      let tx = (W - mw) / 2, ty = (H - mh) / 2;
      if (focus) {
        tx = W / 2 - focus.x * PX * s;
        ty = (top + bot) / 2 - focus.y * PX * s;
      }
      tx = Math.min(0, Math.max(W - mw, tx)); ty = Math.min(0, Math.max(H - mh, ty));
      if (mw < W) tx = (W - mw) / 2;
      if (mh < H) ty = (H - mh) / 2;
      if (!pan || dt == null || (L && (L.W !== W || L.H !== H))) pan = { x: tx, y: ty };
      else { const q = Math.min(1, dt * 5); pan.x += (tx - pan.x) * q; pan.y += (ty - pan.y) * q; }
      const ox = Math.round(pan.x * dpr) / dpr, oy = Math.round(pan.y * dpr) / dpr;
      L = { dpr, W, H, s, ox, oy };
      return L;
    }
    const sx = (x) => L.ox + x * PX * L.s, sy = (y) => L.oy + y * PX * L.s;

    function visible(view, n, regs) {
      if (n.status !== 'locked') return true;
      if (n.id === 'c15') return true;
      const r = regs[n.region];
      return !!(r && r.revealed && n.kind !== 'story');
    }

    function drawIcon(spec, x, y, size, alpha) {
      const im = icon(spec[0]); if (!im) return false;
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.drawImage(im, spec[1] * 32, spec[2] * 32, 32, 32, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
      ctx.restore();
      return true;
    }
    function plate(text, x, y, fs, col, rects, prefer) {
      ctx.font = `${fs}px Adventurer, Georgia, serif`;
      const w = Math.ceil(ctx.measureText(text).width) + fs * 0.8, h = Math.round(fs * 1.35);
      const spots = { s: [x - w / 2, y + fs * 1.35], n: [x - w / 2, y - fs * 1.35 - h], e: [x + fs * 1.3, y - h / 2], w: [x - fs * 1.3 - w, y - h / 2] };
      const order = prefer ? [prefer, 's', 'n', 'e', 'w'] : ['s', 'n', 'e', 'w'];
      let pos = null;
      for (const o of order) {
        const [px, py] = spots[o];
        if (px < 4 || px + w > L.W - 4 || py < 4 || py + h > L.H - 2) continue;
        if (!rects.some((r) => px < r[0] + r[2] && px + w > r[0] && py < r[1] + r[3] && py + h > r[1])) { pos = [px, py]; break; }
      }
      if (!pos) return;
      rects.push([pos[0], pos[1], w, h]);
      const X = Math.round(pos[0]), Y = Math.round(pos[1]);
      ctx.fillStyle = INK; ctx.fillRect(X - 1, Y - 1, Math.round(w) + 2, h + 2);
      ctx.fillStyle = PLATE; ctx.fillRect(X, Y, Math.round(w), h);
      ctx.fillStyle = EDGE; ctx.fillRect(X, Y, Math.round(w), 1); ctx.fillRect(X, Y + h - 1, Math.round(w), 1);
      ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, X + w / 2, Y + h / 2 + 1);
    }

    // ---- option B's markers: wax seals for chapters, small ink badges for the rest
    const SEAL = { story: '#9b2a24', contract: '#7a5530', side: '#2f5a6e', dungeon: '#2b2230', training: '#5a6a3a', arcade: '#b0862e', hire: '#6d4a8a', locked: '#8d8478' };
    const GLYPH = { contract: '✉', side: '✦', dungeon: '☠', training: '⚔', arcade: '★', hire: '♣', locked: '' };
    function seal(n, x, y, size, t, isSel) {
      const r = size / 2, locked = n.status === 'locked';
      const col = locked ? SEAL.locked : n.id === 'hire' ? SEAL.hire : SEAL[n.kind] || SEAL.story;
      ctx.save();
      if (isSel || n.status === 'current') {
        const p = 0.5 + 0.5 * Math.sin(t * 3);
        ctx.beginPath(); ctx.arc(x, y, r + 4 + p * 3, 0, Math.PI * 2); ctx.strokeStyle = isSel ? 'rgba(201,162,90,0.95)' : 'rgba(155,42,36,0.7)'; ctx.lineWidth = 2.5; ctx.stroke();
      }
      ctx.globalAlpha = locked ? 0.7 : 1;
      if (n.kind === 'story' || n.kind === 'locked') {
        // a wax seal: wobbly rim, raised ring, the chapter's number
        ctx.beginPath();
        for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2, rr = r * (1 + (i % 2 ? 0.07 : -0.03)); i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(40,10,8,0.8)'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, r * 0.66, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,220,200,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
        const num = n.id === 'prologue' ? '✶' : n.region === 'tower' ? (n.sub.match(/Floor (\w+)/) || [])[1] ? ({ One: 'I', Two: 'II', Three: 'III', Four: 'IV' })[n.sub.match(/Floor (\w+)/)[1]] : '✶' : String(parseInt(n.id.slice(1), 10) || '');
        ctx.fillStyle = '#f6e6d0'; ctx.font = `600 ${Math.round(r * 0.95)}px "Shippori Mincho", Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(num, x, y + 1);
      } else {
        ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
        ctx.fillStyle = '#efe2c4'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.fillStyle = col; ctx.font = `${Math.round(r * 0.95)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(GLYPH[n.id === 'hire' ? 'hire' : n.kind] || '', x, y + 1);
      }
      ctx.globalAlpha = 1;
      if (n.status === 'done' && n.kind !== 'story') { ctx.fillStyle = '#2f6a3a'; ctx.font = `700 ${Math.round(r)}px Georgia, serif`; ctx.fillText('✓', x + r * 0.9, y + r * 0.7); }
      ctx.restore();
    }
    function inkLabel(text, x, y, fs, col, rects, prefer, strong) {
      ctx.font = `${strong ? 'italic 700' : 'italic 600'} ${fs}px "Shippori Mincho", Georgia, serif`;
      const w = Math.ceil(ctx.measureText(text).width) + 6, h = Math.round(fs * 1.25);
      const spots = { s: [x - w / 2, y + fs * 0.95], n: [x - w / 2, y - fs * 0.95 - h], e: [x + fs * 1.0, y - h / 2], w: [x - fs * 1.0 - w, y - h / 2] };
      for (const o of prefer ? [prefer, 's', 'n', 'e', 'w'] : ['s', 'n', 'e', 'w']) {
        const [px, py] = spots[o];
        if (px < 4 || px + w > L.W - 4 || py < TOP * 0.9 || py + h > L.H - 2) continue;
        if (rects.some((r) => px < r[0] + r[2] && px + w > r[0] && py < r[1] + r[3] && py + h > r[1])) continue;
        rects.push([px, py, w, h]);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(234,217,180,0.92)'; ctx.strokeText(text, px + w / 2, py + h / 2);
        ctx.fillStyle = col; ctx.fillText(text, px + w / 2, py + h / 2);
        return;
      }
    }
    function pin(x, y, t) {
      const b = Math.abs(Math.sin(t * 3)) * 5, top = y - 34 - b;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, top); ctx.strokeStyle = '#33241a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + 16, top + 5); ctx.lineTo(x, top + 11); ctx.closePath(); ctx.fillStyle = '#b3373a'; ctx.fill(); ctx.strokeStyle = '#33241a'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    }

    function draw(view, t, sel) {
      t = t || 0;
      const INKED = !!NS.inkmap; // option B (the author's pick, 2026-10-22): the parchment map
      if ((!INKED && !T.ready()) || !icon(1)) { if (fallback) fallback.draw(view, t, sel); return; }
      const fid = sel || view.current, fnode = view.nodes.find((n) => n.id === fid);
      const dt = lastT == null || focusId !== fid && false ? null : Math.max(0, Math.min(0.1, t - lastT));
      lastT = t; focusId = fid;
      layout(fnode, !!sel, dt);
      lastView = view;
      const key = view.regions.map((r) => (r.revealed ? 1 : 0)).join('') + view.edges.map((e) => (e.open ? 1 : 0)).join('');
      if (!base || baseKey !== key) { base = INKED ? NS.inkmap.build(view, C) : build(view); baseKey = key; }
      const { dpr, W, H } = L;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#0e0b10'; ctx.fillRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = INKED;
      ctx.drawImage(base, L.ox, L.oy, BW * L.s, BH * L.s);
      ctx.imageSmoothingEnabled = false;
      // the Tower's light
      const tw = view.regions.find((r) => r.id === 'tower');
      if (tw && INKED) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2), gx = sx(tw.x), gy = sy(22), rr = 40 * L.s;
        const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr);
        gr.addColorStop(0, `rgba(190,160,255,${0.45 + 0.25 * pulse})`); gr.addColorStop(1, 'rgba(190,160,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(gx - rr, gy - rr, rr * 2, rr * 2);
      } else if (tw) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2), gx = sx(tw.x), gy = sy(28);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(169,139,255,${0.12 + 0.1 * pulse})`;
        const u = Math.max(2, Math.round(L.s * 2));
        for (let r = 6; r > 0; r--) { const w = r * u * 3; ctx.globalAlpha = 0.25; ctx.fillRect(Math.round(gx - w / 2), Math.round(gy - w / 2), w, w); }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      const regs = Object.fromEntries(view.regions.map((r) => [r.id, r]));
      const rects = [];
      const isz = Math.max(18, Math.round(16 * L.s / 8) * 8 > 0 ? Math.round(14 * L.s) : 18);
      // Stops
      shown = view.nodes.filter((n) => visible(view, n, regs));
      const order = shown.slice().sort((a, b) => (a.id === sel) - (b.id === sel) || (a.status === 'current') - (b.status === 'current'));
      for (const n of order) {
        const x = sx(n.x), y = sy(n.y), locked = n.status === 'locked';
        const spec = n.id === 'hire' ? ICON.hire : n.region === 'tower' && n.kind === 'story' ? ICON.tower : ICON[n.kind] || ICON.story;
        const size = n.kind === 'story' ? isz : Math.round(isz * 0.8);
        rects.push([x - size / 2, y - size / 2, size, size]);
        if (INKED) { seal(n, x, y, n.kind === 'story' || n.kind === 'locked' ? Math.max(20, Math.round(16 * L.s)) : Math.max(16, Math.round(12 * L.s)), t, n.id === sel); continue; }
        if (n.id === sel) { ctx.fillStyle = EDGE; ctx.fillRect(Math.round(x - size / 2 - 3), Math.round(y - size / 2 - 3), size + 6, size + 6); ctx.fillStyle = INK; ctx.fillRect(Math.round(x - size / 2 - 1), Math.round(y - size / 2 - 1), size + 2, size + 2); }
        drawIcon(spec, x, y, size, locked ? 0.45 : 1);
        if (locked) drawIcon(ICON.locked, x + size * 0.35, y + size * 0.35, Math.round(size * 0.55));
        else if (n.status === 'done') drawIcon(ICON.done, x + size * 0.38, y + size * 0.38, Math.round(size * 0.5));
      }
      // Kael at the current chapter, the "!" over him
      const cur = view.nodes.find((n) => n.id === view.current) || null;
      if (cur && INKED) { pin(sx(cur.x), sy(cur.y), t); rects.push([sx(cur.x) - 4, sy(cur.y) - 42, 22, 32]); }
      else if (cur) {
        const x = sx(cur.x), y = sy(cur.y), Sp = window.TowSprites;
        const man = Sp && Sp.forUnit && Sp.forUnit({ key: 'kael', id: 'map-kael' }, { scene: true });
        const hpx = Math.round(isz * 1.25), fx = x - isz * 0.95, fy = y + isz * 0.45;
        if (man && man.pixel) {
          const anim = man.animations.idle || man.animations.base;
          const r = anim && Sp.resolveDir(man, anim, 'SE');
          if (r) { const fr = anim.frames[r.dir]; Sp.drawFrame(ctx, man, { frame: fr[Sp.frameIndex(anim, fr.length, t, fr)], flip: r.flip, alpha: 1 }, fx, fy, hpx, { ink: 1 }); }
        }
        drawIcon(ICON.mark, x, y - isz * 0.95 - Math.round(Math.abs(Math.sin(t * 3)) * isz * 0.25), Math.round(isz * 0.8));
        rects.push([fx - hpx * 0.3, fy - hpx, hpx * 0.6, hpx]);
      }
      // Labels: the selected and current stops first, then the story, then open side stops.
      const fs = Math.max(10, Math.round(6.5 * L.s));
      const rank = (n) => (n.id === sel ? 0 : n.status === 'current' ? 1 : n.kind === 'story' ? 2 : n.status === 'locked' ? 9 : 3);
      for (const n of shown.slice().sort((a, b) => rank(a) - rank(b))) {
        if (rank(n) === 9 && n.id !== sel && n.id !== 'c15') continue;
        const col = n.id === sel || n.status === 'current' ? '#ffe7a8' : n.status === 'locked' ? '#9a8d80' : '#f2e6d0';
        if (INKED) inkLabel(n.title, sx(n.x), sy(n.y), Math.max(11, Math.round(7.5 * L.s)), n.id === sel || n.status === 'current' ? '#8c1f1a' : n.status === 'locked' ? '#7a6a58' : '#33241a', rects, n.region === 'tower' ? 'w' : null, n.kind === 'story');
        else plate(n.title, sx(n.x), sy(n.y), fs, col, rects, n.region === 'tower' ? 'w' : null);
      }
      // Region names (lands already reached), faint and wide
      const rfs = Math.max(10, Math.round(7 * L.s));
      ctx.font = INKED ? `italic 600 ${rfs}px "Shippori Mincho", Georgia, serif` : `${rfs}px Adventurer, Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const r of view.regions) {
        if (!r.revealed || r.id === 'tower' || view.nodes.some((n) => n.title.toLowerCase() === r.name.toLowerCase())) continue;
        const x = sx(r.x), y = sy(r.y + r.r * 0.62), w = ctx.measureText(r.name.toUpperCase()).width;
        if (rects.some((q) => x - w / 2 < q[0] + q[2] && x + w / 2 > q[0] && y - rfs / 2 < q[1] + q[3] && y + rfs / 2 > q[1])) continue;
        rects.push([x - w / 2, y - rfs / 2, w, rfs]);
        if (INKED) { ctx.fillStyle = 'rgba(234,217,180,0.7)'; ctx.fillText(r.name.toUpperCase(), x + 1, y + 1); ctx.fillStyle = 'rgba(58,42,28,0.85)'; ctx.fillText(r.name.toUpperCase(), x, y); continue; }
        ctx.fillStyle = 'rgba(13,10,8,0.75)'; ctx.fillText(r.name.toUpperCase(), x + 1, y + 1);
        ctx.fillStyle = 'rgba(246,226,180,0.8)'; ctx.fillText(r.name.toUpperCase(), x, y);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    function pick(cx, cy) {
      if (!lastView) return null;
      if (!L && fallback) return fallback.pick(cx, cy);
      let best = null, bd = 26;
      for (const n of shown) { const d = Math.hypot(sx(n.x) - cx, sy(n.y) - cy); if (d < bd) { bd = d; best = n.id; } }
      return best;
    }
    function nodeScreen(id) {
      if (!L) layout(null, false, null);
      const n = (lastView && lastView.nodes.find((q) => q.id === id)) || C.NODES.find((q) => q.id === id);
      return n ? { x: sx(n.x), y: sy(n.y) } : null;
    }
    return { draw, pick, nodeScreen, pan() {} };
  }

  NS.mapPainted = painted;
  NS.map = { create };
})();
