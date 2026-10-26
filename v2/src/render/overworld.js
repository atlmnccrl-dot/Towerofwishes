// The overworld: the six regions of Vael as one pixel land, west to east. The company walks the road
// between mission sites; a tap on a site picks it (and the company sets off), a drag looks around.
// Regions are painted on first sight (render/terrain.js) and kept; locked ones lie under fog.
//
//   const ow = createOverworld(canvas, { world, tiles, fx })
//   ow.setState({ save, sprites, team })   ow.focus(missionId, travel)   ow.onPick = (id) => ...
import { REGIONS, MISSIONS, missionsIn, isOpen, regionOpen } from '../data/campaign.js';
import { REGION_W, REGION_H, LANDMARKS, LANDS } from '../data/world.js';
import { paintTerrain, atlasPixels, noise2, LAND, PATCH, WATER, ROAD } from './terrain.js';
import { framesOf } from './assets.js';
import { DIRS } from '../data/anims.js';

const BUF_H = 240, WALK = 46, FOLLOW = 13, UNIT = 0.6;

export function createOverworld(canvas, { world, tiles, fx }) {
  const out = canvas.getContext('2d');
  const buf = document.createElement('canvas'), ctx = buf.getContext('2d');
  const px = atlasPixels(world);
  const cam = { x: 120, y: REGION_H * 0.6, follow: true };
  const built = {};
  let save = null, sprites = {}, team = [], t = 0, drag = null, pickId = null;
  const company = { x: 0, y: 0, path: [], trail: [], moving: false, at: null };
  const api = { onPick: null, onRegion: null };

  // ---- where things are: every site in one ordered list across the regions
  const sites = MISSIONS.map((m) => {
    const ri = REGIONS.findIndex((r) => r.id === m.region);
    return { m, ri, x: ri * REGION_W + (m.map[0] / 100) * REGION_W, y: (m.map[1] / 100) * REGION_H * 0.86 + REGION_H * 0.07 };
  });
  const siteOf = (id) => sites.find((s) => s.m.id === id);
  const START = { x: 24, y: sites[0].y + 20 };   // Thornwick, where the company sets out

  function build(ri) {
    if (built[ri]) return built[ri];
    const r = REGIONS[ri], L = LANDS[r.id], g = L.ground, ox = ri * REGION_W, W = REGION_W, H = REGION_H;
    const local = sites.filter((s) => s.ri === ri).map((s) => [s.x - ox, s.y]);
    const prevY = ri > 0 ? sites.filter((s) => s.ri === ri - 1).slice(-1)[0].y : START.y;
    const road = [[0, prevY], ...local, [W, local[local.length - 1][1]]];
    const spec = {
      base: g.base, patches: g.patches, water: g.water, snow: g.snow, tint: g.tint,
      rivers: L.rivers.map((rv) => ({ pts: rv.pts.map(([x, y]) => [x * W, y * H]), w: rv.w })),
      lakes: L.lakes.map((l) => ({ x: l.x * W, y: l.y * H, rx: l.rx, ry: l.ry })),
      roads: [{ pts: road, w: 9, tex: g.road, edge: g.edge }],
    };
    const ter = paintTerrain(spec, W, H, px, { seed: 7 + ri * 101 });
    // scatter: forests from noise, small things here and there, life on the land and the water
    const N = noise2(31 + ri), rnd = mulberry(91 + ri), props = [], S = L.scatter;
    const clsAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : ter.cls[(y | 0) * W + (x | 0)]);
    const clear = (x, y, r) => { for (let a = 0; a < 8; a++) { const c = clsAt(x + Math.cos(a) * r, y + Math.sin(a) * r); if (c === WATER || c === ROAD) return false; } return true; };
    const nearSite = (x, y, r) => local.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < r);
    const nearWater = (x, y, r) => { for (let a = 0; a < 12; a++) if (clsAt(x + Math.cos(a) * r, y + Math.sin(a) * r) === WATER) return true; return false; };
    for (let y = 8; y < H; y += 11) for (let x = 6; x < W; x += 11) {
      const jx = x + (rnd() - 0.5) * 9, jy = y + (rnd() - 0.5) * 9, c = clsAt(jx, jy);
      if (c === WATER) { if (S.water && rnd() < 0.05) props.push({ s: 'w:' + pickOf(S.water, rnd), x: ox + jx, y: jy }); continue; }
      if (c !== LAND && c !== PATCH) continue;
      if (nearSite(jx, jy, 40) || !clear(jx, jy, 8)) continue;
      const f = N(jx / 70, jy / 70);
      const treeOk = S.treeNearWater ? nearWater(jx, jy, 46) : true;
      if (treeOk && f > 1 - S.forest * 0.8 && rnd() < 0.85) props.push({ s: 'w:' + pickOf(S.trees, rnd), x: ox + jx, y: jy, flip: rnd() < 0.5 });
      else if (rnd() < (S.smallRate || 0.03)) props.push({ s: 'w:' + pickOf(S.small, rnd), x: ox + jx, y: jy, flip: rnd() < 0.5 });
      else if (S.animals.length && rnd() < 0.006) props.push({ s: 'w:' + pickOf(S.animals, rnd), x: ox + jx, y: jy, flip: rnd() < 0.5, bob: rnd() * 6 });
    }
    // a landmark at every mission
    sites.filter((s) => s.ri === ri).forEach((s, i) => {
      for (const [name, dx, dy, k] of LANDMARKS[L.sites[i]] || []) props.push({ s: name, x: s.x + dx, y: s.y + dy, k });
    });
    return (built[ri] = { canvas: ter.canvas, props, ox });
  }

  // ---- drawing helpers
  // the camera's point sits left of centre when a panel covers the right of the map (padR, a fraction)
  let padR = 0;
  const CX = () => Math.round(buf.width * (0.5 - padR / 2));
  const P = (x, y) => ({ x: Math.round(x - cam.x + CX()), y: Math.round(y - cam.y + buf.height / 2) });
  function sprite(name, x, y, k = 1, flip = false, alpha = 1) {
    const [atlas, key] = name.split(':'), A = atlas === 't' ? tiles : world, s = A.data.sprites[key]; if (!s) return;
    const [pg, sx, sy, w, h] = s, p = P(x, y), dw = Math.round(w * k), dh = Math.round(h * k);
    if (p.x + dw < 0 || p.x - dw > buf.width || p.y - dh > buf.height || p.y + 10 < 0) return;
    ctx.globalAlpha = alpha;
    if (flip) { ctx.save(); ctx.translate(p.x, 0); ctx.scale(-1, 1); ctx.drawImage(A.pages[pg], sx, sy, w, h, -Math.round(dw / 2), p.y - dh, dw, dh); ctx.restore(); }
    else ctx.drawImage(A.pages[pg], sx, sy, w, h, p.x - Math.round(dw / 2), p.y - dh, dw, dh);
    ctx.globalAlpha = 1;
  }
  function unit(set, x, y, dir, moving, phase) {
    if (!set) return;
    const clip = moving ? 'Walk' : 'Idle3', fr = framesOf(set, clip, dir) || framesOf(set, 'Idle', dir); if (!fr) return;
    const f = fr[Math.floor((t + phase) * (moving ? 12 : 7)) % fr.length], [pg, sx, sy, w, h, ox, oy] = f, [ax, ay] = set.data.anchor;
    const k = UNIT * Math.min(1.3, set.cfg.scale || 1), p = P(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(set.pages[pg], sx, sy, w, h, Math.round(p.x + (ox - ax) * k), Math.round(p.y + (oy - ay) * k), Math.round(w * k), Math.round(h * k));
  }
  const dirTo = (dx, dy) => DIRS[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];

  // ---- the company on the road
  function placeCompany(id) {
    const s = id ? siteOf(id) : null, p = s ? { x: s.x - 14, y: s.y + 10 } : START;
    company.x = p.x; company.y = p.y; company.path = []; company.trail = Array.from({ length: 60 }, () => ({ x: p.x - 1, y: p.y })); company.at = id;
  }
  function travel(id) {
    const to = siteOf(id); if (!to) return;
    const from = company.at ? siteOf(company.at) : null, a = from ? sites.indexOf(from) : -1, b = sites.indexOf(to);
    const pts = [];
    if (a < b) for (let i = a + 1; i <= b; i++) pts.push(i < 0 ? START : sites[i]);
    else for (let i = a - 1; i >= b; i--) pts.push(sites[i]);
    company.path = pts.map((s) => ({ x: s.x - 14, y: s.y + 10 })); company.at = id; company.moving = true; cam.follow = true;
  }
  function stepCompany(dt) {
    if (!company.path.length) { company.moving = false; return; }
    const tgt = company.path[0], dx = tgt.x - company.x, dy = tgt.y - company.y, d = Math.hypot(dx, dy);
    // long roads are walked faster, so the company never dawdles more than a few seconds
    const speed = WALK * Math.max(1, Math.min(5, company.path.length * 0.9));
    const st = Math.min(d, speed * dt);
    if (d < 0.5) { company.path.shift(); return; }
    company.x += (dx / d) * st; company.y += (dy / d) * st; company.dir = dirTo(dx, dy);
    const last = company.trail[0]; if (!last || Math.hypot(last.x - company.x, last.y - company.y) > 2) company.trail.unshift({ x: company.x, y: company.y, dir: company.dir });
    company.trail.length = Math.min(company.trail.length, 80);
  }

  // ---- fog over locked regions (one cloud texture, drawn tiled)
  let fog = null;
  function fogTex() {
    if (fog) return fog;
    fog = document.createElement('canvas'); fog.width = 256; fog.height = 256;
    const g = fog.getContext('2d'), img = g.createImageData(256, 256), N = noise2(5), N2 = noise2(9);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const v = N(x / 48, y / 48) * 0.65 + N2(x / 16, y / 16) * 0.35, o = (y * 256 + x) * 4, c = 200 + v * 50;
      img.data[o] = c * 0.85; img.data[o + 1] = c * 0.88; img.data[o + 2] = c * 0.95; img.data[o + 3] = 200 + v * 55;
    }
    g.putImageData(img, 0, 0); return fog;
  }

  // ---- weather: a few dozen particles in screen space (leaves drift, fireflies blink, snow falls, embers rise)
  const parts = Array.from({ length: 46 }, (_, i) => ({ x: Math.random() * 600, y: Math.random() * 300, s: Math.random(), p: i * 0.7 }));
  const WEATHER = {
    leaves: { col: ['#c98a3a', '#9fbf4a', '#d9b04a'], vx: 9, vy: 7, size: 2, sway: 6 },
    fireflies: { col: ['#e8f070', '#b8f080'], vx: 2, vy: -1, size: 1, sway: 5, glow: true },
    snow: { col: ['#ffffff', '#dfe8f4'], vx: 3, vy: 16, size: 1, sway: 4 },
    embers: { col: ['#ff9a3a', '#ffcf5a'], vx: 3, vy: -12, size: 1, sway: 3, glow: true },
  };
  function weather(name, dt) {
    const w = WEATHER[name]; if (!w) return;
    ctx.save(); if (w.glow) ctx.globalCompositeOperation = 'lighter';
    for (const q of parts) {
      q.x += (w.vx * (0.5 + q.s)) * dt; q.y += (w.vy * (0.5 + q.s)) * dt;
      if (q.y > buf.height + 4) q.y = -4; if (q.y < -4) q.y = buf.height + 4; if (q.x > buf.width + 4) q.x = -4; if (q.x < -4) q.x = buf.width + 4;
      const x = Math.round(q.x + Math.sin(t * 1.3 + q.p) * w.sway), y = Math.round(q.y);
      ctx.globalAlpha = w.glow ? 0.35 + 0.65 * Math.max(0, Math.sin(t * 2 + q.p * 3)) : 0.85;
      ctx.fillStyle = w.col[Math.floor(q.s * w.col.length)];
      ctx.fillRect(x, y, w.size + (q.s > 0.7 ? 1 : 0), w.size);
    }
    ctx.restore();
  }

  // ---- one frame
  function draw(dt) {
    t += dt; stepCompany(dt);
    if (!save) return;
    const openR = REGIONS.filter((r) => regionOpen(save.cleared, r.id)).length;
    const maxX = openR * REGION_W - (buf.width - CX()) + 40;
    if (cam.follow) { cam.x += (company.x - cam.x) * Math.min(1, dt * 3); cam.y += (company.y - cam.y) * Math.min(1, dt * 3); }
    cam.x = Math.max(CX(), Math.min(Math.max(CX(), maxX), cam.x));
    cam.y = Math.max(buf.height / 2, Math.min(REGION_H - buf.height / 2, cam.y));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1a2418'; ctx.fillRect(0, 0, buf.width, buf.height);
    const r0 = Math.max(0, Math.floor((cam.x - CX()) / REGION_W)), r1 = Math.min(REGIONS.length - 1, Math.floor((cam.x - CX() + buf.width) / REGION_W));
    const items = [];
    for (let ri = r0; ri <= r1; ri++) {
      const b = build(ri), p = P(b.ox, 0);
      ctx.drawImage(b.canvas, p.x, p.y);
      for (const pr of b.props) if (Math.abs(pr.x - cam.x) < buf.width / 2 + 60 && Math.abs(pr.y - cam.y) < buf.height / 2 + 90) items.push({ y: pr.y, draw: () => sprite(pr.s, pr.x, pr.y + (pr.bob ? Math.sin(t + pr.bob) * 0.0 : 0), pr.k || 1, pr.flip) });
    }
    // cloud shadows drifting over the land
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 337 + t * 6) % (buf.width + 240)) - 120, cy = (i * 97) % buf.height;
      const gr = ctx.createRadialGradient(cx, cy, 10, cx, cy, 90); gr.addColorStop(0, 'rgba(120,130,140,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(cx - 90, cy - 90, 180, 180);
    }
    ctx.restore();
    // mission banners
    for (const s of sites) {
      if (s.ri < r0 - 1 || s.ri > r1 + 1 || !regionOpen(save.cleared, s.m.region)) continue;
      const open = isOpen(save.cleared, s.m), done = save.cleared[s.m.id];
      if (!open) continue;
      items.push({ y: s.y + 1, draw: () => {
        sprite(done ? 'w:cd_flagpole_blue' : 'w:cd_flagpole_red', s.x + 10, s.y + 4, 1.3);
        if (pickId === s.m.id) { const p = P(s.x, s.y); ctx.strokeStyle = `rgba(255,211,107,${0.6 + Math.sin(t * 5) * 0.3})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 22, 8, 0, 0, Math.PI * 2); ctx.stroke(); }
      } });
    }
    // the company: the leader, then the others on the trail behind
    team.forEach((set, i) => {
      const tr = i === 0 ? { x: company.x, y: company.y, dir: company.dir } : company.trail[Math.min(company.trail.length - 1, i * Math.round(FOLLOW / 2))] || company;
      items.push({ y: tr.y, draw: () => {
        if (i === 0) { const p = P(tr.x, tr.y); ctx.strokeStyle = 'rgba(255,211,107,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, 8, 3, 0, 0, Math.PI * 2); ctx.stroke(); }
        unit(set, tr.x, tr.y, tr.dir || 'E', company.moving, i * 0.3);
      } });
    });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    // fog over the regions not yet reached
    for (let ri = r0; ri <= r1; ri++) {
      if (regionOpen(save.cleared, REGIONS[ri].id)) continue;
      const p = P(ri * REGION_W, 0), f = fogTex();
      ctx.save(); ctx.globalAlpha = 0.96;
      for (let y = 0; y < REGION_H; y += 256) for (let x = -64; x < REGION_W; x += 256) ctx.drawImage(f, p.x + x + Math.sin(t * 0.2 + y) * 12, p.y + y);
      ctx.restore();
      ctx.fillStyle = '#3a3428'; ctx.font = '10px "Silkscreen", monospace'; ctx.fillText(REGIONS[ri].name.toUpperCase(), P(ri * REGION_W + 140, 0).x, buf.height / 2);
    }
    const here = REGIONS[Math.max(0, Math.min(REGIONS.length - 1, Math.floor(cam.x / REGION_W)))];
    const pname = LANDS[here.id].particles; if (pname && regionOpen(save.cleared, here.id)) weather(pname, dt);
    // a soft vignette
    const v = ctx.createRadialGradient(buf.width / 2, buf.height / 2, buf.height * 0.4, buf.width / 2, buf.height / 2, buf.width * 0.7);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,8,4,0.45)'); ctx.fillStyle = v; ctx.fillRect(0, 0, buf.width, buf.height);
    out.imageSmoothingEnabled = false; out.drawImage(buf, 0, 0, canvas.width, canvas.height);
    if (api.onRegion) api.onRegion(here);
  }

  // ---- input: drag to look around, tap a site to pick it
  const toWorld = (e) => { const r = canvas.getBoundingClientRect(), k = buf.height / r.height; return { x: cam.x + (e.clientX - r.left) * k - CX(), y: cam.y + (e.clientY - r.top) * k - buf.height / 2, k }; };
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return; const r = canvas.getBoundingClientRect(), k = buf.height / r.height, dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) { drag.moved = true; cam.follow = false; }
    if (drag.moved) { cam.x = drag.cx - dx * k; cam.y = drag.cy - dy * k; }
  });
  canvas.addEventListener('pointerup', (e) => {
    const was = drag; drag = null; if (!was || was.moved || !save) return;
    const w = toWorld(e);
    const hit = sites.filter((s) => regionOpen(save.cleared, s.m.region) && isOpen(save.cleared, s.m)).sort((a, b) => Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y))[0];
    if (hit && Math.hypot(hit.x - w.x, hit.y - w.y) < 26) { pickId = hit.m.id; travel(hit.m.id); if (api.onPick) api.onPick(hit.m.id); }
  });

  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
    buf.height = BUF_H; buf.width = Math.max(200, Math.round(BUF_H * r.width / Math.max(1, r.height)));
  }
  Object.assign(api, {
    resize, draw,
    setState(o) { if (o.save) { if (save !== o.save) placeCompany(o.save.flags && o.save.flags.at); save = o.save; } if (o.sprites) sprites = o.sprites; if (o.team) team = o.team; },
    // pick a mission: the camera goes there; travel: the company walks there
    focus(id, walk) { pickId = id; const s = siteOf(id); if (!s) return; if (walk) travel(id); else { cam.follow = false; cam.x = s.x; cam.y = s.y; } },
    lookAt(ri) { cam.follow = false; cam.x = ri * REGION_W + REGION_W / 2; },
    get at() { return company.at; },
    setPad(f) { padR = f; },
    // the open sites on screen, in CSS pixels of the canvas, for the HTML markers
    marks() {
      if (!save) return [];
      const r = canvas.getBoundingClientRect(), k = r.height / buf.height, out = [];
      for (const s of sites) {
        if (!regionOpen(save.cleared, s.m.region) || !isOpen(save.cleared, s.m)) continue;
        const p = P(s.x, s.y);
        if (p.x < -30 || p.x > buf.width + 30 || p.y < -30 || p.y > buf.height + 40) continue;
        out.push({ m: s.m, x: p.x * k, y: (p.y - 20) * k });
      }
      return out;
    },
    pick(id) { const s = siteOf(id); if (!s) return; pickId = id; travel(id); if (api.onPick) api.onPick(id); },
    regionAtCamera: () => REGIONS[Math.max(0, Math.min(REGIONS.length - 1, Math.floor(cam.x / REGION_W)))],
    prebuild(ri) { build(ri); },
  });
  return api;
}

function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pickOf = (list, rnd) => list[Math.floor(rnd() * list.length)];
