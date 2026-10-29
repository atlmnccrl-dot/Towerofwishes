// Draws a battle from a fixed, angled top-down camera, at pixel resolution: the scene is drawn into
// a small buffer (one sprite pixel = one buffer pixel at rest) and scaled up without smoothing.
// World: x east, y south (towards the viewer), metres. Screen: x right, y down.
import { framesOf, CLIPS, PHASES } from './assets.js';
import { DIRS } from '../data/anims.js';
import { ARENAS } from '../data/arenas.js';
import { AFFIXES } from '../combat/battle.js';
const AFX = Object.fromEntries(Object.entries(AFFIXES).map(([k, a]) => [k, a.col]));
import { paintTerrain, atlasPixels } from './terrain.js';

const BUF_H = 232, PPM = 26, SQUASH = 0.6, LIFT = 0.92;
export const VIEW = { BUF_H, PPM, SQUASH };
const CAST_POINT = 0.45;

export function createView(canvas, fxAtlas, tiles, settings = () => ({ shake: true }), world = null) {
  const out = canvas.getContext('2d');
  const buf = document.createElement('canvas'), ctx = buf.getContext('2d'), tmp = document.createElement('canvas');
  const cam = { x: 0, y: 0.2, zoom: 1, shake: 0 };
  const anim = new Map();
  let sprites = {}, fx = [], floaters = [], banners = [], ground = null, flashA = 0, flashCol = '255,255,255', mood = null;

  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
    buf.height = BUF_H; buf.width = Math.max(200, Math.round(BUF_H * r.width / Math.max(1, r.height)));
  }
  const S = () => PPM * cam.zoom;
  const P = (x, y, z = 0) => ({ x: Math.round(buf.width / 2 + (x - cam.x) * S()), y: Math.round(buf.height * 0.55 + (y - cam.y) * S() * SQUASH - z * S() * LIFT) });

  // ---- the ground: tiles from the tile atlas, a road through the middle, props along the edges
  // (tall ones behind the field, low ones in front), and a colour wash per theme
  const GROUNDS = {
    meadow: { tiles: ['g_grass_1', 'g_grass_2', 'g_grass_3'], road: ['g_dirt_1', 'g_trampled_dirt'], top: ['tree_a', 'tree_b', 'tree_c', 'fv_tree_birch', 'bush_a'], low: ['bush_b', 'rock_a', 'fern_a', 'shrub_a'], edge: '#16261a', tint: null },
    dusk: { tiles: ['g_grass_autumn', 'g_grass_2'], road: ['g_dirt_2', 'g_trampled_dirt'], top: ['fv_tree_autumn_red', 'fv_tree_autumn_orange', 'tree_gold_a', 'fv_haystack', 'tree_b'], low: ['bush_gold', 'rock_a', 'fv_tree_stump', 'shrub_b'], edge: '#1f1a14', tint: 'rgba(255,140,60,0.10)' },
    grave: { tiles: ['g_grass_dark_1', 'g_grass_dark_2'], road: ['g_gravel', 'g_dirt_dark'], top: ['tree_dark_a', 'fv_tree_dead', 'grave_cross', 'tomb', 'grave_a', 'fv_gravestone', 'tree_dark_b'], low: ['grave_b', 'fv_gravestone', 'rock_dark', 'mush_a'], edge: '#13171a', tint: 'rgba(80,110,130,0.14)' },
    night: { tiles: ['g_grass_dark_1', 'g_grass_3'], road: ['g_dirt_dark'], top: ['tree_dark_b', 'pine_a', 'pine_b', 'rock_big', 'fv_lantern'], low: ['bush_c', 'rock_m1', 'fern_b'], edge: '#0b1210', tint: 'rgba(30,50,110,0.22)' },
    marsh: { tiles: ['g_grass_dark_2', 'g_grass_dark_1'], road: ['g_dirt_dark', 'g_dirt_2'], water: ['g_water_1', 'g_water_2'], top: ['tree_gnarled', 'fv_tree_dead', 'reeds_a', 'reeds_b', 'fv_fallen_log', 'tree_dark_a'], low: ['reeds_c', 'reeds_d', 'mush_b', 'mush_c'], edge: '#0e1410', tint: 'rgba(60,90,60,0.16)' },
    desert: { tiles: ['g_sand', 'g_arena_sand'], road: ['g_trampled_dirt'], top: ['monolith_a', 'ruin_pillar', 'rock_big', 'rock_m2', 'slabs', 'pillar_broken'], low: ['rock_m1', 'rock_m3', 'pebble_a', 'stone_a'], edge: '#3a2c1a', tint: 'rgba(255,190,90,0.10)' },
    ruins: { tiles: ['g_flagstone_mossy', 'g_flagstone_1', 'g_cobble_mossy'], road: ['g_flagstone_2', 'g_stone_floor'], top: ['pillar_broken', 'ruin_pillar', 'arch_a', 'ruin_wall', 'statue', 'wall_moss_a', 'cd_brazier'], low: ['ruin_stone_a', 'ruin_stone_b', 'brick_a', 'fern_c'], edge: '#151816', tint: 'rgba(70,100,120,0.12)' },
    snow: { snow: true, top: ['fv_tree_pine_snow', 'fv_tree_pine_snow', 'fv_boulder', 'rock_big'], low: ['rock_a', 'stone_b', 'pebble_b'], edge: '#1b2430', tint: 'rgba(160,190,255,0.10)' },
    barrow: { tiles: ['g_flagstone_dark', 'g_stone_floor'], road: ['g_flagstone_3'], top: ['cdw_pillar', 'cd_stone_tomb', 'coffin', 'cd_skull_on_pike', 'monolith_b', 'cd_brazier', 'cd_banner_red'], low: ['cd_skull_on_pike', 'brick_b', 'ruin_stone_c'], edge: '#0c0a10', tint: 'rgba(90,40,120,0.16)' },
  };
  let theme = GROUNDS.meadow, props = [];
  const TILE = 32, TH = Math.round(TILE * SQUASH);
  // a sprite by name: 'w:' from the world atlas, 't:' (or no prefix) from the tiles atlas
  function tileImg(name) {
    const A = name.startsWith('w:') ? world : tiles, key = name.replace(/^[wt]:/, ''), t = A && A.data.sprites[key];
    return t ? { img: A.pages[t[0]], x: t[1], y: t[2], w: t[3], h: t[4] } : null;
  }

  // ---- a hand-built arena (data/arenas.js): painted ground, backdrop and foreground props, light
  let arena = null, worldPx = null;
  function buildArena(field, key) {
    const A = ARENAS[key], pad = 7, ox = -field.w / 2 - pad, oy = -field.h / 2 - pad;
    const W = Math.round((field.w + pad * 2) * PPM), H = Math.round((field.h + pad * 2) * PPM);
    const X = (x) => (x - ox) * PPM, Y = (y) => (y - oy) * PPM;
    if (!worldPx) worldPx = atlasPixels(world);
    const g = A.ground, spec = {
      base: g.base, patches: g.patches, water: g.water, snow: g.snow, tint: g.tint,
      rivers: (A.rivers || []).map((r) => ({ pts: r.pts.map(([x, y]) => [X(x), Y(y)]), w: r.w * PPM })),
      lakes: (A.lakes || []).map((l) => ({ x: X(l.x), y: Y(l.y), rx: l.rx * PPM, ry: l.ry * PPM })),
      roads: (A.roads || []).map((r) => ({ pts: r.pts.map(([x, y]) => [X(x), Y(y)]), w: r.w * PPM, tex: g.road, edge: g.edge })),
    };
    if (!spec.roads.length) spec.roads = [{ pts: [[-10, -10], [-9, -10]], w: 1, tex: g.road, edge: g.edge }];
    const ter = paintTerrain(spec, W, H, worldPx, { scale: g.scale || 2, seed: key.length * 37 });
    // the ground is seen at an angle: squash it
    const sq = document.createElement('canvas'); sq.width = W; sq.height = Math.round(H * SQUASH);
    const sg = sq.getContext('2d'); sg.imageSmoothingEnabled = false; sg.drawImage(ter.canvas, 0, 0, W, sq.height);
    ground = { canvas: sq, ox, oy, field, key: 'arena:' + key };
    // the big pieces (tiles atlas) at 0.6, the small kit pieces (world atlas) at 0.75 of the given scale
    props = A.props.map(([name, x, y, k = 1, flip = false]) => ({ name, x, y, k: k * (name.startsWith('w:') ? 0.75 : 0.6), flip }));
    theme = { edge: '#0c0f0b', tint: null };
    arena = A;
  }
  // light and weather over the arena, after the fighters
  const motes = Array.from({ length: 40 }, (_, i) => ({ x: Math.random() * 600, y: Math.random() * 260, s: Math.random(), p: i * 0.7 }));
  const WEATHER = {
    leaves: { col: ['#c98a3a', '#9fbf4a', '#d9b04a'], vx: 10, vy: 8, size: 2, sway: 6 },
    fireflies: { col: ['#e8f070', '#b8f080'], vx: 2, vy: -1, size: 1, sway: 5, glow: true },
    snow: { col: ['#ffffff', '#dfe8f4'], vx: 4, vy: 18, size: 1, sway: 4 },
    embers: { col: ['#ff9a3a', '#ffcf5a'], vx: 3, vy: -14, size: 1, sway: 3, glow: true },
    rain: { col: ['rgba(170,185,235,0.6)', 'rgba(205,215,255,0.45)'], vx: -40, vy: 260, size: 1, len: 6, sway: 0 },
  };
  function arenaLight(dt) {
    const L = arena.light || {}, t = performance.now() / 1000, W = buf.width, H = buf.height;
    if (L.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [gx, gy] of L.glow) { const p = P(gx, gy, 0.6), r = 34 * cam.zoom * (1 + Math.sin(t * 9 + gx) * 0.06); const gr = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r); gr.addColorStop(0, 'rgba(255,150,60,0.45)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = gr; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2); }
      ctx.restore(); }
    if (L.fog) { ctx.save(); for (let i = 0; i < 4; i++) { const y = H * (0.45 + i * 0.13), x = ((t * (6 + i * 3)) % W); const gr = ctx.createLinearGradient(0, y - 14, 0, y + 14); gr.addColorStop(0, 'rgba(200,220,210,0)'); gr.addColorStop(0.5, `rgba(200,220,210,${0.12 * L.fog})`); gr.addColorStop(1, 'rgba(200,220,210,0)'); ctx.fillStyle = gr; ctx.fillRect(-8, y - 14, W + 16, 28); ctx.globalAlpha = 1; void x; } ctx.restore(); }
    if (L.rays) { ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const x = ((i * 0.37 + t * 0.01) % 1) * W * 1.3 - W * 0.15; ctx.fillStyle = `rgba(255,230,170,${0.035 + 0.02 * Math.sin(t * 0.7 + i)})`; ctx.beginPath(); ctx.moveTo(x, -8); ctx.lineTo(x + 26, -8); ctx.lineTo(x + 26 + H * 0.6, H + 8); ctx.lineTo(x + H * 0.6, H + 8); ctx.fill(); }
      ctx.restore(); }
    const w = WEATHER[arena.weather];
    if (w) { ctx.save(); if (w.glow) ctx.globalCompositeOperation = 'lighter';
      for (const q of motes) {
        q.x += w.vx * (0.5 + q.s) * dt; q.y += w.vy * (0.5 + q.s) * dt;
        if (q.y > H + 4) q.y = -4; if (q.y < -4) q.y = H + 4; if (q.x > W + 4) q.x = -4; if (q.x < -4) q.x = W + 4;
        ctx.globalAlpha = w.glow ? 0.35 + 0.65 * Math.max(0, Math.sin(t * 2 + q.p * 3)) : 0.85; ctx.fillStyle = w.col[Math.floor(q.s * w.col.length)];
        ctx.fillRect(Math.round(q.x + Math.sin(t * 1.3 + q.p) * w.sway), Math.round(q.y), w.len ? 1 : w.size + (q.s > 0.7 ? 1 : 0), w.len || w.size);
      }
      ctx.restore(); }
    if (L.tint) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(${L.tint[0]},${L.tint[1]},${L.tint[2]},${Math.min(1, L.tint[3] * 4)})`; ctx.fillRect(-8, -8, W + 16, H + 16); ctx.restore(); }
    if (L.vignette) { const v = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, W * 0.72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(6,4,8,${L.vignette})`); ctx.fillStyle = v; ctx.fillRect(-8, -8, W + 16, H + 16); }
  }
  function buildGround(field, key) {
    theme = GROUNDS[key] || GROUNDS.meadow; const T = theme;
    const pad = 7, gw = Math.round((field.w + pad * 2) * PPM), gh = Math.round((field.h + pad * 2) * PPM * SQUASH);
    const g = document.createElement('canvas'); g.width = gw; g.height = gh;
    const c = g.getContext('2d'); c.imageSmoothingEnabled = false;
    let seed = 41 + key.length * 13; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cy = gh / 2, band = field.h * 0.32 * PPM * SQUASH;
    if (T.snow) {
      c.fillStyle = '#d9e1ea'; c.fillRect(0, 0, gw, gh);
      for (let i = 0; i < 2600; i++) { c.fillStyle = r() < 0.5 ? '#cbd4df' : '#eef3f8'; c.fillRect((r() * gw) | 0, (r() * gh) | 0, 2 + ((r() * 4) | 0), 1); }
      for (let i = 0; i < 3800; i++) { const x = r() * gw, y = cy + (r() - 0.5) * band * 2 * (0.7 + 0.3 * Math.sin(x / 50)); c.fillStyle = r() < 0.5 ? '#b7c1cd' : '#a9b4c2'; c.fillRect(x | 0, y | 0, 2, 1); }
    } else {
      for (let ty = 0; ty * TH < gh; ty++) for (let tx = 0; tx * TILE < gw; tx++) {
        const t = tileImg(T.tiles[Math.floor(r() * T.tiles.length)]);
        if (t) c.drawImage(t.img, t.x, t.y, TILE, TILE, tx * TILE, ty * TH, TILE, TH);
      }
      // the road: speckles in its tile's own colours, thinning out at the edges (no tile steps)
      if (T.road) {
        const cols = roadColours(T.road);
        for (let i = 0; i < 9000; i++) {
          const x = r() * gw, off = (r() + r() + r() - 1.5) / 1.5, y = cy + off * band * 1.25 * (0.75 + 0.25 * Math.sin(x / 45));
          c.fillStyle = cols[Math.floor(r() * cols.length)]; c.fillRect(x | 0, y | 0, 2 + ((r() * 2) | 0), 1);
        }
      }
      // pools of water at the edges of the marsh
      if (T.water) for (let i = 0; i < 7; i++) {
        const px = Math.floor(r() * gw / TILE), py = r() < 0.5 ? Math.floor(r() * 4) : Math.floor(gh / TH) - 1 - Math.floor(r() * 4);
        for (let k = 0; k < 6; k++) { const t = tileImg(T.water[k % 2]); if (t) c.drawImage(t.img, t.x, t.y, TILE, TILE, (px + (k % 3)) * TILE, (py + Math.floor(k / 3)) * TH, TILE, TH); }
      }
    }
    // soften the tile grid with a little noise
    for (let i = 0; i < 900; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)'; c.fillRect((r() * gw) | 0, (r() * gh) | 0, 2 + ((r() * 3) | 0), 1); }
    ground = { canvas: g, ox: -field.w / 2 - pad, oy: -field.h / 2 - pad, field, key };
    // props: a row of tall ones behind the field, a few low ones in front
    props = [];
    for (let x = -16; x < 16; x += 1.1 + r() * 1.3) props.push({ name: T.top[Math.floor(r() * T.top.length)], x: x + r() * 0.5, y: -field.h / 2 - 0.5 - r() * 1.8, k: 0.5 + r() * 0.15, flip: r() < 0.5 });
    for (let x = -16; x < 16; x += 2.4 + r() * 3) props.push({ name: T.low[Math.floor(r() * T.low.length)], x, y: field.h / 2 + 0.7 + r() * 1.2, k: 0.55, flip: r() < 0.5 });
  }
  // a few colours read from the road's tiles
  function roadColours(names) {
    const out = [], cv = document.createElement('canvas'); cv.width = cv.height = TILE; const g = cv.getContext('2d');
    for (const n of names) {
      const t = tileImg(n); if (!t) continue;
      g.clearRect(0, 0, TILE, TILE); g.drawImage(t.img, t.x, t.y, TILE, TILE, 0, 0, TILE, TILE);
      const d = g.getImageData(0, 0, TILE, TILE).data;
      for (let k = 0; k < 6; k++) { const i = ((k * 197 + 31) % (TILE * TILE)) * 4; if (d[i + 3] > 200) out.push(`rgb(${d[i]},${d[i + 1]},${d[i + 2]})`); }
    }
    return out.length ? out : ['#857f4b'];
  }
  function prop(p) {
    const t = tileImg(p.name); if (!t) return;
    const s = P(p.x, p.y), k = p.k * cam.zoom, w = Math.round(t.w * k), hh = Math.round(t.h * k);
    ctx.save(); ctx.translate(s.x, s.y); if (p.flip) ctx.scale(-1, 1);
    ctx.drawImage(t.img, t.x, t.y, t.w, t.h, -Math.round(w / 2), -hh, w, hh);
    ctx.restore();
  }

  // ---- sprites
  const dirOf = (f) => DIRS[((Math.round(Math.atan2(Math.sin(f) * SQUASH, Math.cos(f)) / (Math.PI / 4)) % 8) + 8) % 8];
  function drawFrame(set, fr, x, y, k, alpha = 1, tint) {
    const [pg, sx, sy, w, h, ox, oy] = fr, [ax, ay] = set.data.anchor;
    const dx = Math.round(x + (ox - ax) * k), dy = Math.round(y + (oy - ay) * k), dw = Math.round(w * k), dh = Math.round(h * k);
    ctx.globalAlpha = alpha;
    ctx.drawImage(set.pages[pg], sx, sy, w, h, dx, dy, dw, dh);
    if (tint) {
      tmp.width = w; tmp.height = h; const t = tmp.getContext('2d');
      t.drawImage(set.pages[pg], sx, sy, w, h, 0, 0, w, h); t.globalCompositeOperation = 'source-in'; t.fillStyle = tint[0]; t.fillRect(0, 0, w, h);
      ctx.globalAlpha = tint[1]; ctx.drawImage(tmp, dx, dy, dw, dh);
    }
    ctx.globalAlpha = 1;
  }
  function phaseFrame(clip, t, wind, active, recover) {
    const ph = PHASES[clip] || PHASES.Attack1;
    if (t < wind) return ph.windup[0] + (ph.windup[1] - ph.windup[0]) * (t / Math.max(0.01, wind));
    if (t < wind + active) return ph.strike[0];
    return ph.recover[0] + (ph.recover[1] - ph.recover[0]) * Math.min(1, (t - wind - active) / Math.max(0.01, recover));
  }
  function pose(u) {
    const set = sprites[u.def.set], cfg = set.cfg;
    // a scene may direct a clip outright
    if (u.anim) return { clip: u.anim.clip === 'idle' ? (set.data.anims.Idle3 ? 'Idle3' : 'Idle') : u.anim.clip, fps: u.anim.clip === 'idle' ? 7 : u.anim.fps || 10, loop: u.anim.loop !== false };   // at rest in a scene: the relaxed idle, not the fighting stance
    if (u.state === 'attack' && u.act) {
      const list = u.def.attack.projectile ? [cfg.cast || (cfg.attacks || ['Attack1'])[0]] : cfg.attacks || ['Attack1', 'Attack2'];
      const clip = list[(u.combo || 0) % list.length];
      return { clip, phase: phaseFrame(clip, u.st, u.act.wind, u.act.active, u.act.recover) };
    }
    if (u.state === 'cast') { const clip = cfg.heavy || 'Special1'; return { clip, phase: phaseFrame(clip, u.st, CAST_POINT, 0.06, 0.2) }; }
    if (u.state === 'stun') return { clip: 'TakeDamage', fixed: 2 };
    if (u.hitT > 0 && u.state !== 'ko') return { clip: 'TakeDamage', timed: 1 - u.hitT / 0.22 };
    const name = { ko: 'ko', victory: 'victory', move: u.s.move > 3.9 ? 'run' : 'walk' }[u.state] || 'idle';
    const [clip, fps, loop] = CLIPS[name];
    return { clip: name === 'idle' && cfg.stance ? cfg.stance : clip, fps, loop };
  }
  // health over a unit: green for the company, red for foes; energy under it for the company's heroes
  function bars(u, p, k) {
    const w = u.def.boss ? 34 : u.elite || u.ward ? 30 : 24, x = Math.round(p.x - w / 2), y = p.y - Math.round((u.ward ? 30 : 50) * k);
    if (u.elite) { ctx.strokeStyle = AFX[u.elite]; ctx.lineWidth = 1; ctx.strokeRect(x - 1.5, y - 1.5, w + 3, 6); }
    ctx.fillStyle = 'rgba(10,8,8,0.88)'; ctx.fillRect(x - 1, y - 1, w + 2, u.team === 'ally' && !u.ward ? 7 : 5);
    ctx.fillStyle = u.ward ? '#7fc8ff' : u.team === 'ally' ? '#6fcf6a' : '#e0564a'; ctx.fillRect(x, y, Math.max(1, Math.round(w * u.hp / u.max)), 3);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, Math.max(1, Math.round(w * u.hp / u.max)), 1);
    if (u.shield > 0) { ctx.fillStyle = '#f4f1e6'; ctx.fillRect(x, y, Math.max(1, Math.round(w * Math.min(1, u.shield / u.max))), 1); }
    if (u.team === 'ally' && !u.ward) { ctx.fillStyle = u.energy >= 100 ? '#ffd36b' : '#c9a24a'; ctx.fillRect(x, y + 4, Math.round(w * u.energy / 100), 2); }
    // an elite's trait, the foe to hunt, the thing to protect: named over the bar
    const tag = u.elite ? [AFFIXES[u.elite].name, AFX[u.elite]] : u.mark ? ['Target', '#ff6a5a'] : u.ward ? [u.def.name, '#bfe4ff'] : null;
    if (tag) { ctx.font = '8px "Silkscreen", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#120c0a'; ctx.fillText(tag[0], p.x + 1, y - 3); ctx.fillStyle = tag[1]; ctx.fillText(tag[0], p.x, y - 4); }
    if (u.mark) { const t = performance.now() / 1000, yy = y - 14 + Math.sin(t * 6) * 1.5; ctx.fillStyle = '#ff5a4a'; ctx.beginPath(); ctx.moveTo(p.x - 4, yy - 5); ctx.lineTo(p.x + 4, yy - 5); ctx.lineTo(p.x, yy); ctx.fill(); }
  }
  // a still thing on the field (a cart, a bed, an altar): a sprite of the world or tiles atlas
  function drawProp(u) {
    const p = P(u.x, u.y);
    if (u.state === 'ko') { if (u.st < 0.6) spawnOnce(u, 'smoke_burst'); return; }
    prop({ name: u.def.prop, x: u.x, y: u.y, k: (u.def.prop.startsWith('w:') ? 0.75 : 0.6) * 2.6 });
    if (u.flash > 0) { ctx.globalAlpha = Math.min(0.5, u.flash * 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x - 12 * cam.zoom, p.y - 24 * cam.zoom, 24 * cam.zoom, 24 * cam.zoom); ctx.globalAlpha = 1; }
    if (!u.actor) bars(u, p, cam.zoom);
  }
  const spawned = new WeakSet();
  function spawnOnce(u, name) { if (spawned.has(u)) return; spawned.add(u); spawn(name, u.x, u.y, 0.6, { scale: 1.6 }); }
  function drawUnit(u, dt) {
    if (u.def.prop) return drawProp(u);
    const set = sprites[u.def.set]; if (!set) return;
    const k = (set.cfg.scale || 1) * (u.def.scale || 1) * (u.size || 1) * cam.zoom, p = P(u.x, u.y), at = u.z ? P(u.x, u.y, u.z) : p;
    const ps = pose(u), dir = dirOf(u.f);
    const frames = framesOf(set, ps.clip, dir) || framesOf(set, 'Idle', dir);
    let a = anim.get(u.id); if (!a || a.clip !== ps.clip) { a = { clip: ps.clip, t: 0 }; anim.set(u.id, a); }
    a.t += dt;
    let i;
    if (ps.phase != null) i = Math.round(ps.phase);
    else if (ps.fixed != null) i = ps.fixed;
    else if (ps.timed != null) i = Math.floor(Math.min(1, ps.timed) * (frames.length - 1));
    else { i = Math.floor(a.t * (ps.fps || 10)); i = ps.loop === false ? Math.min(frames.length - 1, i) : i % frames.length; }
    i = Math.max(0, Math.min(frames.length - 1, i));
    ctx.fillStyle = `rgba(10,18,8,${u.z ? 0.38 / (1 + u.z * 0.4) : 0.38})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, 9 * k, 3.2 * k, 0, 0, Math.PI * 2); ctx.fill();
    if (u.state !== 'ko' && !u.actor) {
      ctx.strokeStyle = u.elite ? AFX[u.elite] : u.mark ? '#ff5a4a' : u.team === 'ally' ? 'rgba(140,200,255,0.55)' : 'rgba(255,120,110,0.5)'; ctx.lineWidth = u.elite || u.mark ? 2 : 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 10 * k, 3.6 * k, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // a scene's silhouette (a lightning flash shows the real thing), or a hit's white flash
    const flash = u.dark && flashA < 0.25 ? [typeof u.dark === 'string' ? u.dark : '#07060c', 1] : u.flash > 0 ? ['#ffffff', Math.min(0.85, u.flash * 6)] : null;
    drawFrame(set, frames[i], at.x, at.y, k, u.alpha != null ? u.alpha : u.state === 'ko' ? Math.max(0, 1 - Math.max(0, u.st - 0.8) * 0.8) : 1, flash);
    if (u.state === 'ko' || u.actor) return;
    bars(u, p, k);
    if (u.statuses.some((s) => s.type === 'dot')) drawFxAt('flame', u.x, u.y, 0.6, performance.now() / 1000 % 1, 0.45, { add: true });
    if (u.statuses.some((s) => s.type === 'debuff' && s.stat === 'move')) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 9 * k, 3.2 * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    if (u.statuses.some((s) => s.type === 'stun')) drawFxAt('star_burst', u.x, u.y, 1.9, performance.now() / 1000 % 0.35, 0.6);
  }

  // ---- effects
  function spawn(name, x, y, z, o = {}) { const d = fxAtlas.data.fx[name]; if (d) fx.push(Object.assign({ name, d, x, y, z, t: -(o.delay || 0), scale: 1 }, o)); }
  function drawFxAt(name, x, y, z, t, scale, o = {}) { const d = fxAtlas.data.fx[name]; if (d) drawFx(Object.assign({ d, x, y, z, t, scale }, o)); }
  function drawFx(e) {
    if (e.t < 0) return true;
    const n = e.d.frames.length; let i = Math.floor(e.t * e.d.fps);
    if (e.d.loop) { if (e.life != null && e.t > e.life) return false; i %= n; } else if (i >= n) return false;
    const fr = e.d.frames[i]; if (!fr) return true;
    const [pg, sx, sy, w, h, ox, oy] = fr, [ax, ay] = e.d.anchor, k = e.scale * cam.zoom, p = P(e.x, e.y, e.z);
    ctx.save(); ctx.translate(p.x, p.y);
    if (e.ground) ctx.scale(1, SQUASH);
    if (e.flip) ctx.scale(-1, 1);
    if (e.add) ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(fxAtlas.pages[pg], sx, sy, w, h, Math.round((ox - ax) * k), Math.round((oy - ay) * k), Math.round(w * k), Math.round(h * k));
    ctx.restore();
    return true;
  }
  const SWING = { slash: 'slash_r', dagger: 'dagger', thrust: 'thrust', blunt: 'hit_punch', claw: 'claw' };
  const HIT = { slash: 'hit_slash', dagger: 'hit_slash', thrust: 'hit_pierce', blunt: 'hit_blunt', claw: 'claw' };
  const GROUND = new Set(['shockwave', 'rock_burst', 'circle_arcane', 'circle_holy']);
  function onEvents(b) {
    const U = (id) => b.units.find((u) => u.id === id);
    for (const e of b.events) {
      const u = e.u && U(e.u);
      if (e.type === 'swing' && u && SWING[e.fx]) spawn(SWING[e.fx], u.x + Math.cos(u.f) * 0.7, u.y + Math.sin(u.f) * 0.7, 1.0, { flip: Math.cos(u.f) < 0, scale: 0.9 });
      else if (e.type === 'hit' && u) {
        if (!e.dot && HIT[e.fx]) spawn(HIT[e.fx], u.x, u.y, 1.0, { scale: e.crit ? 1.3 : 0.9 });
        u.flash = 0.1;
        floaters.push({ text: String(e.dmg), x: u.x, y: u.y, z: 1.9, t: 0, col: e.dot ? '#b9e07a' : e.crit ? '#ffd36b' : u.team === 'ally' ? '#ff8a7a' : '#fff2c8', big: e.crit });
        if (e.crit) cam.shake = Math.max(cam.shake, 1.6);
      } else if (e.type === 'impact' && e.fx) spawn(e.fx, e.x, e.y, 1.0, { add: !e.heal, scale: 0.9 });
      else if (e.type === 'heal' && u) { spawn('heal', u.x, u.y, 1.0, { add: true }); floaters.push({ text: '+' + e.amount, x: u.x, y: u.y, z: 1.9, t: 0, col: '#8fe08a' }); }
      else if (e.type === 'shield' && u) spawn('shield_bubble', u.x, u.y, 0.9, { add: true, life: Math.max(0.5, u.shieldT), follow: u, scale: 0.9 });
      else if (e.type === 'cast' && u) { spawn('spell_cast', u.x, u.y, 1.1, { add: true }); banners.push({ text: e.name, u, t: 0, team: u.team }); }
      else if (e.type === 'ability' && e.fx) {
        const g = GROUND.has(e.fx);
        spawn(e.fx, e.x, e.y, g ? 0.05 : 1.0, { add: true, ground: g, scale: g ? 2.2 : 1.6, life: 1.2 });
        flashA = Math.max(flashA, 0.18); flashCol = '255,255,255'; cam.shake = Math.max(cam.shake, 2.4);
      } else if (e.type === 'blink' && u) { spawn('teleport', e.x0, e.y0, 0.9, { add: true }); spawn('teleport', u.x, u.y, 0.9, { add: true, delay: 0.05 }); }
      else if (e.type === 'summon' && u) spawn('summon', u.x, u.y, 0.6, { add: true, scale: 1.2 });
      else if (e.type === 'ko' && u) spawn('dust_cloud', u.x, u.y, 0.2, { scale: 1.1 });
      else if (e.type === 'fury') { flashA = 0.35; flashCol = '255,90,40'; cam.shake = Math.max(cam.shake, 3); }
      // a boon going off (its effect, and its name for the big ones), an arc of lightning
      else if (e.type === 'proc') {
        const at = u || null;
        if (e.fx && at) spawn(e.fx, at.x, at.y, e.fx === 'explosion_fire' || e.fx === 'phoenix' ? 0.6 : 1.0, { add: true, scale: e.big ? 1.4 : 0.9 });
        if (e.text && at) floaters.push({ text: e.text, x: at.x, y: at.y, z: 2.6, t: -0.05, col: e.col || '#ffe7a8', big: !!e.big, word: true });
        if (e.big) { flashA = Math.max(flashA, 0.22); flashCol = '255,220,150'; cam.shake = Math.max(cam.shake, 2.5); }
      } else if (e.type === 'arc' && u) spawn('chain_lightning', (e.x0 + u.x) / 2, (e.y0 + u.y) / 2, 1.0, { add: true, scale: 0.9, flip: u.x < e.x0 });
      // a hazard: the warning ring stays until the strike
      else if (e.type === 'warn') {
        warns.push({ x: e.x, y: e.y, r: e.r, t: 0, life: e.t, kind: e.kind });
        const fall = { rockfall: 'rock', fire: 'fireball_big', lightning: null }[e.kind];
        if (fall) spawn(fall, e.x, e.y, 7, { delay: e.t - 0.35, vz: -20, life: 0.35, scale: 1.6 });
      } else if (e.type === 'strike') {
        const S = { rockfall: ['rock_burst', true], fire: ['explosion_fire', false], lightning: ['bolt_strike', false] }[e.kind] || ['boom', false];
        spawn(S[0], e.x, e.y, S[1] ? 0.05 : 0.8, { add: !S[1], ground: S[1], scale: S[1] ? 2.4 : 1.8 });
        if (e.kind === 'lightning') { flashA = Math.max(flashA, 0.4); flashCol = '210,225,255'; }
        cam.shake = Math.max(cam.shake, 3.2);
      }
    }
  }
  // the hazards' warning rings: red, filling up as the strike comes
  let warns = [];
  function drawWarns(dt) {
    warns = warns.filter((w) => {
      w.t += dt; if (w.t > w.life) return false;
      const p = P(w.x, w.y), rx = w.r * PPM * cam.zoom, ry = rx * SQUASH, k = w.t / w.life, pulse = 0.5 + 0.5 * Math.sin(w.t * 18);
      const col = { rockfall: '255,190,120', fire: '255,110,60', lightning: '170,200,255' }[w.kind] || '255,90,80';
      ctx.fillStyle = `rgba(${col},${0.12 + 0.18 * k})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx * k, ry * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(${col},${0.5 + 0.4 * pulse})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      return true;
    });
  }

  // ---- one frame
  function draw(b, dt) {
    if (b.arena && ARENAS[b.arena] && world) { if (!ground || ground.field !== b.field || ground.key !== 'arena:' + b.arena) buildArena(b.field, b.arena); }
    else if (!ground || ground.field !== b.field || ground.key !== (b.theme || 'meadow')) { arena = null; buildGround(b.field, b.theme || 'meadow'); }
    onEvents(b);
    // the camera: fitted to the field, unless a scene directs it
    if (b.camera) { cam.x = b.camera.x; cam.y = b.camera.y; cam.zoom = b.camera.zoom; }
    else Object.assign(cam, fit(b));
    const shx = cam.shake > 0.05 ? (Math.random() - 0.5) * cam.shake : 0, shy = cam.shake > 0.05 ? (Math.random() - 0.5) * cam.shake : 0;
    cam.shake *= Math.exp(-dt * 9); if (!settings().shake) cam.shake = 0;
    ctx.setTransform(1, 0, 0, 1, Math.round(shx), Math.round(shy));
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = theme.edge; ctx.fillRect(-8, -8, buf.width + 16, buf.height + 16);
    const g0 = P(ground.ox, ground.oy);
    ctx.drawImage(ground.canvas, g0.x, g0.y, Math.round(ground.canvas.width * cam.zoom), Math.round(ground.canvas.height * cam.zoom));
    drawWarns(dt);
    const items = [];
    for (const pr of props) items.push({ y: pr.y, draw: () => prop(pr) });
    for (const u of b.units) items.push({ y: u.y + (u.state === 'ko' ? -0.3 : 0), draw: () => drawUnit(u, dt) });
    for (const s of b.shots) items.push({ y: s.y, draw: () => drawFxAt(s.bolt, s.x, s.y, s.z, performance.now() / 1000, 0.8, { add: s.bolt !== 'arrow' && s.bolt !== 'rock', flip: Math.cos(s.a || 0) < 0 }) });
    items.sort((p, q) => p.y - q.y);
    for (const it of items) it.draw();
    for (const u of b.units) if (u.flash > 0) u.flash -= dt;
    fx = fx.filter((e) => { if (e.vx || e.vy || e.vz) { e.x += (e.vx || 0) * dt; e.y += (e.vy || 0) * dt; e.z += (e.vz || 0) * dt; } if (e.follow) { e.x = e.follow.x; e.y = e.follow.y; if (e.follow.state === 'ko' || e.follow.shield <= 0 && e.name === 'shield_bubble') return false; } e.t += dt; return drawFx(e); });
    // ability names over the caster
    ctx.textAlign = 'center'; ctx.font = '8px "Silkscreen", monospace';
    banners = banners.filter((n) => { n.t += dt; const p = P(n.u.x, n.u.y, 2.5 + n.t * 0.3); ctx.globalAlpha = Math.max(0, Math.min(1, (1.4 - n.t) * 2)); ctx.fillStyle = '#120c0a'; ctx.fillText(n.text, p.x + 1, p.y + 1); ctx.fillStyle = n.team === 'ally' ? '#ffe7a8' : '#ffb0a8'; ctx.fillText(n.text, p.x, p.y); ctx.globalAlpha = 1; return n.t < 1.4; });
    // damage numbers: a pop on the hit, a crit twice the size; an outline so they read on any ground
    floaters = floaters.filter((n) => {
      n.t += dt; const life = n.word ? 1.5 : 1.05, p = P(n.x, n.y, n.z + Math.max(0, n.t) * (n.word ? 0.5 : 0.9)), pop = n.t < 0.12 ? 1.25 : 1;
      if (n.t < 0) return true;
      ctx.font = `${n.big ? 16 : 8}px "Silkscreen", monospace`; ctx.globalAlpha = Math.max(0, Math.min(1, (life - n.t) / 0.35));
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(pop, pop);
      ctx.fillStyle = '#120c0a'; for (const [ox, oy] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2]]) ctx.fillText(n.text, ox, oy);
      ctx.fillStyle = n.col; ctx.fillText(n.text, 0, 0); ctx.restore(); ctx.globalAlpha = 1; return n.t < life;
    });
    ctx.font = '8px "Silkscreen", monospace';
    if (arena) arenaLight(dt);
    else if (theme.tint) { ctx.fillStyle = theme.tint; ctx.fillRect(-8, -8, buf.width + 16, buf.height + 16); }
    if (mood) { ctx.save(); ctx.globalCompositeOperation = mood.op || 'soft-light'; ctx.fillStyle = mood.col; ctx.fillRect(-8, -8, buf.width + 16, buf.height + 16); ctx.restore(); }
    if (flashA > 0.01) { ctx.fillStyle = `rgba(${flashCol},${flashA})`; ctx.fillRect(-8, -8, buf.width + 16, buf.height + 16); flashA *= Math.exp(-dt * 8); }
    out.imageSmoothingEnabled = false;
    out.drawImage(buf, 0, 0, canvas.width, canvas.height);
  }
  // the fights' own camera: fitted to the field's width; on a squarer screen (a tablet) never so far out
  // that the painted ground ends
  function fit(b) { return { x: 0, y: b.arena && ARENAS[b.arena] ? -0.7 : 0.2, zoom: Math.max(0.74, Math.min(1.08, buf.width / ((b.field.w + 1.2) * PPM))) }; }
  // how far the camera may wander from the middle at a zoom before the painted ground ends (metres)
  const room = (b, zoom) => Math.max(0, b.field.w / 2 + 6.5 - buf.width / 2 / (PPM * zoom));
  // where a point of the field is on the page (CSS pixels), for text placed over the picture
  function project(x, y, z = 0) { const r = canvas.getBoundingClientRect(), p = P(x, y, z), k = r.height / buf.height; return { x: r.left + p.x * k, y: r.top + p.y * k }; }
  return { resize, draw, project, spawn, fit, room, setSprites(s) { sprites = s; },
    // for filmed scenes: a flash of light, a shake, a colour over everything
    flash(a = 0.5, col = '255,240,220') { flashA = a; flashCol = col; }, shake(n = 3) { cam.shake = Math.max(cam.shake, n); }, mood(m) { mood = m; },
    reset() { fx = []; floaters = []; banners = []; warns = []; anim.clear(); flashA = 0; mood = null; } };
}
