'use strict';
// HOLLOWLANDS — a loaded map: collision, the pre-rendered ground, static scenery, buildings, objects.
const CELL = 4; // collision cell size (px)

HL.World = class World {
  constructor(def) {
    const TLc = HL.TILE;
    this.def = def; this.id = def.id; this.name = def.name; this.W = def.W; this.H = def.H; this.tiles = def.tiles;
    this.pw = def.W * 8; this.ph = def.H * 8; this.dark = def.dark; this.amb = def.amb;
    this.cw = def.W * 2; this.chh = def.H * 2;
    this.col = new Uint8Array(this.cw * this.chh); // bit 1 blocks movement, bit 2 blocks sight
    this.dyn = new Uint8Array(this.cw * this.chh);
    for (let ty = 0; ty < this.H; ty++) for (let tx = 0; tx < this.W; tx++) {
      const t = this.tiles[ty * this.W + tx];
      if (HL.SOLID[t]) { const v = 1 | (HL.OPAQUE[t] ? 2 : 0); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) this.col[(ty * 2 + j) * this.cw + tx * 2 + i] = v; }
    }
    this.statics = []; this.buildings = []; this.objects = []; this.lights = [];
    for (const b of def.buildings || []) this.addBuilding(b);
    for (const o of def.objects) this.addObject(Object.assign({}, o));
    if (!this.dark) this.plantForestEdge();
    this.bucket();
    this.ground = this.renderGround();
    this.fog = new Uint8Array(Math.ceil(this.W / 2) * Math.ceil(this.H / 2));
    void TLc;
  }
  tile(tx, ty) { return tx < 0 || ty < 0 || tx >= this.W || ty >= this.H ? HL.TILE.VOID : this.tiles[ty * this.W + tx]; }
  tileAt(x, y) { return this.tile(Math.floor(x / 8), Math.floor(y / 8)); }
  rectCells(x0, y0, x1, y1, fn) {
    const a = Math.max(0, Math.floor(x0 / CELL)), b = Math.min(this.cw - 1, Math.floor((x1 - 0.01) / CELL));
    const c = Math.max(0, Math.floor(y0 / CELL)), d = Math.min(this.chh - 1, Math.floor((y1 - 0.01) / CELL));
    for (let j = c; j <= d; j++) for (let i = a; i <= b; i++) fn(j * this.cw + i);
  }
  solidRect(x0, y0, x1, y1, v = 3) { this.rectCells(x0, y0, x1, y1, (k) => (this.col[k] |= v)); }
  setDyn(r, on) { this.rectCells(r.x0, r.y0, r.x1, r.y1, (k) => (this.dyn[k] = on ? 3 : 0)); }
  cellBlocked(i, j, bit = 1) {
    if (i < 0 || j < 0 || i >= this.cw || j >= this.chh) return true;
    const k = j * this.cw + i; return ((this.col[k] | this.dyn[k]) & bit) !== 0;
  }
  blocked(x, y, r) {
    const a = Math.floor((x - r) / CELL), b = Math.floor((x + r - 0.01) / CELL), c = Math.floor((y - r) / CELL), d = Math.floor((y + r - 0.01) / CELL);
    for (let j = c; j <= d; j++) for (let i = a; i <= b; i++) if (this.cellBlocked(i, j)) return true;
    return false;
  }
  sightBlocked(x, y) { return this.cellBlocked(Math.floor(x / CELL), Math.floor(y / CELL), 2); }
  los(x0, y0, x1, y1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2);
    for (let i = 1; i < n; i++) if (this.sightBlocked(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
    return true;
  }
  // slide along walls, with a small nudge around corners so you never snag
  move(e, dx, dy) {
    const r = e.r;
    let hitX = false, hitY = false;
    if (dx) {
      if (!this.blocked(e.x + dx, e.y, r)) e.x += dx;
      else {
        hitX = true;
        for (const n of [1, -1, 2, -2]) if (Math.abs(dy) < Math.abs(dx) * 0.9 && !this.blocked(e.x + dx, e.y + n, r) && !this.blocked(e.x, e.y + n, r)) { e.y += Math.sign(n) * Math.min(Math.abs(n), Math.abs(dx)); e.x += dx; hitX = false; break; }
      }
    }
    if (dy) {
      if (!this.blocked(e.x, e.y + dy, r)) e.y += dy;
      else {
        hitY = true;
        for (const n of [1, -1, 2, -2]) if (Math.abs(dx) < Math.abs(dy) * 0.9 && !this.blocked(e.x + n, e.y + dy, r) && !this.blocked(e.x + n, e.y, r)) { e.x += Math.sign(n) * Math.min(Math.abs(n), Math.abs(dy)); e.y += dy; hitY = false; break; }
      }
    }
    e.x = HL.clamp(e.x, r, this.pw - r); e.y = HL.clamp(e.y, r, this.ph - r);
    return hitX || hitY;
  }
  surface(x, y) {
    for (const b of this.buildings) if (b.inside(x, y)) return b.def.roof === 'slate' ? 'stone' : 'wood';
    const t = this.tileAt(x, y), T = HL.TILE;
    if (t === T.FLOOR || t === T.COBBLE || t === T.BRIDGE) return 'stone';
    return 'ash';
  }

  addBuilding(def) {
    const x0 = def.x * 8, y0 = def.y * 8, w = def.w * 8, d = def.d * 8, x1 = x0 + w, y1 = y0 + d, H = def.H || 12;
    const dx0 = x0 + def.door.x * 8, dx1 = dx0 + def.door.w * 8;
    const art = HL.makeBuilding({ w, d, H, roof: def.roof, ruined: def.ruined, belfry: def.belfry, seed: x0 + y0, door: { x: def.door.x * 8, w: def.door.w * 8 }, doorState: def.locked ? 'locked' : def.chained ? 'chained' : 'open' });
    const artOpen = def.doorId ? HL.makeBuilding({ w, d, H, roof: def.roof, ruined: def.ruined, belfry: def.belfry, seed: x0 + y0, door: { x: def.door.x * 8, w: def.door.w * 8 }, doorState: 'open' }) : null;
    const b = {
      def, x0, y0, x1, y1, H, art, artOpen, fade: 1, doorOpen: !def.doorId,
      inside: (x, y) => x > x0 && x < x1 && y > y0 && y < y1,
    };
    // walls, 4px thick, with the doorway
    this.solidRect(x0, y0, x1, y0 + 4); this.solidRect(x0, y0, x0 + 4, y1); this.solidRect(x1 - 4, y0, x1, y1);
    this.solidRect(x0, y1 - 4, dx0, y1); this.solidRect(dx1, y1 - 4, x1, y1);
    if (def.doorId) this.addObject({ t: 'door', id: def.doorId, x: (dx0 + dx1) / 2, y: y1 - 2, w: dx1 - dx0, h: 4, locked: def.locked, chained: def.chained, building: b });
    this.buildings.push(b);
    this.statics.push({ kind: 'building', b, x: (x0 + x1) / 2, y: y1, x0: x0 - 1, y0: y0 - H - 24, x1: x1 + 1, y1: y1 });
  }
  addObject(o) {
    const s = o.spr ? HL.ART.spr[o.spr] : null;
    if (o.col) {
      const c = o.col;
      o.rect = o.t === 'door' ? { x0: o.x - o.w / 2, y0: o.y - o.h / 2, x1: o.x + o.w / 2, y1: o.y + o.h / 2 } : { x0: o.x - c.w / 2, y0: o.y - c.h, x1: o.x + c.w / 2, y1: o.y + 1 };
    }
    if (o.t === 'door' && !o.rect) o.rect = { x0: o.x - o.w / 2, y0: o.y - o.h / 2, x1: o.x + o.w / 2, y1: o.y + o.h / 2 };
    if (o.t === 'tower') {
      o.rect = { x0: o.x - 28, y0: o.y - 8, x1: o.x + 28, y1: o.y + 6 };
      this.solidRect(o.rect.x0, o.rect.y0, o.rect.x1, o.rect.y1);
      this.solidRect(o.x - 22, o.y - 14, o.x + 22, o.y - 8);
      this.statics.push({ kind: 'spr', spr: HL.ART.spr.tower, sprLit: HL.ART.spr.towerLit, tower: o, x: o.x, y: o.y + 6, x0: o.x - 34, y0: o.y - 200, x1: o.x + 34, y1: o.y + 8 });
      this.objects.push(o);
      return;
    }
    if (o.t === 'prop' || o.t === 'tree') {
      const sp = HL.ART.spr[o.spr];
      if (o.t === 'tree') this.solidRect(o.x - 2, o.y - 3, o.x + 2, o.y);
      else if (o.rect) this.solidRect(o.rect.x0, o.rect.y0, o.rect.x1, o.rect.y1, o.spr.startsWith('fence') ? 1 : 3);
      this.statics.push({ kind: 'spr', spr: sp, x: o.x, y: o.y, x0: o.x - sp.ox, y0: o.y - sp.oy, x1: o.x - sp.ox + sp.w, y1: o.y - sp.oy + sp.h, tall: sp.h > 14 });
      return;
    }
    if (o.rect && o.t !== 'door') this.solidRect(o.rect.x0, o.rect.y0, o.rect.x1, o.rect.y1);
    if (o.t === 'brazier') this.lights.push({ x: o.x, y: o.y - 7, r: o.light || 44, flick: Math.random() * 10 });
    if (o.t === 'fire') { this.solidRect(o.x - 4, o.y - 3, o.x + 4, o.y + 1); this.lights.push({ x: o.x, y: o.y - 3, r: 70, flick: 3, fire: true }); }
    o.sprite = s;
    this.objects.push(o);
  }
  obj(id) { return this.objects.find((o) => o.id === id); }

  plantForestEdge() {
    const T = HL.TILE;
    for (let ty = 0; ty < this.H; ty++) for (let tx = 0; tx < this.W; tx++) {
      if (this.tile(tx, ty) !== T.FOREST) continue;
      let near = 9;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const t = this.tile(tx + i, ty + j); if (!HL.SOLID[t] || t === T.WATER) near = Math.min(near, Math.max(Math.abs(i), Math.abs(j))); }
      if (near > 2) continue;
      const h = HL.hash(tx, ty, 77);
      if (near === 2 && h > 0.55) continue;
      const x = tx * 8 + 4 + (HL.hash(tx, ty, 3) - 0.5) * 6, y = ty * 8 + 6 + (HL.hash(tx, ty, 4) - 0.5) * 5;
      const sp = HL.ART.spr[(h < 0.12 ? 'treeA' + ((h * 100) % 2 | 0) : 'tree' + ((h * 60) % 6 | 0))];
      this.statics.push({ kind: 'spr', spr: sp, x, y, x0: x - sp.ox, y0: y - sp.oy, x1: x - sp.ox + sp.w, y1: y - sp.oy + sp.h, tall: true, tree: true });
    }
  }
  bucket() {
    this.bk = 64; this.bw = Math.ceil(this.pw / this.bk) + 1; this.bh = Math.ceil(this.ph / this.bk) + 1;
    this.buckets = Array.from({ length: this.bw * this.bh }, () => []);
    this.statics.forEach((s, i) => {
      s.i = i;
      const a = HL.clamp(Math.floor(s.x0 / this.bk), 0, this.bw - 1), b = HL.clamp(Math.floor(s.x1 / this.bk), 0, this.bw - 1);
      const c = HL.clamp(Math.floor(s.y0 / this.bk), 0, this.bh - 1), d = HL.clamp(Math.floor(s.y1 / this.bk), 0, this.bh - 1);
      for (let j = c; j <= d; j++) for (let k = a; k <= b; k++) this.buckets[j * this.bw + k].push(s);
    });
  }
  query(x0, y0, x1, y1, out) {
    const seen = this._seen || (this._seen = new Uint32Array(this.statics.length));
    const stamp = (this._stamp = (this._stamp || 0) + 1);
    const a = HL.clamp(Math.floor(x0 / this.bk), 0, this.bw - 1), b = HL.clamp(Math.floor(x1 / this.bk), 0, this.bw - 1);
    const c = HL.clamp(Math.floor(y0 / this.bk), 0, this.bh - 1), d = HL.clamp(Math.floor(y1 / this.bk), 0, this.bh - 1);
    for (let j = c; j <= d; j++) for (let k = a; k <= b; k++) for (const s of this.buckets[j * this.bw + k]) {
      if (seen[s.i] === stamp) continue; seen[s.i] = stamp;
      if (s.x1 >= x0 && s.x0 <= x1 && s.y1 >= y0 && s.y0 <= y1) out.push(s);
    }
    return out;
  }

  // ---------------------------------------------------------------- the ground, rendered once per map
  renderGround() {
    const T = HL.TILE, W = this.pw, H = this.ph, c = HL.canvas(W, H), img = c.g.createImageData(W, H), d = img.data;
    const R = (arr) => arr.map((h) => HL.rgb(HL.P[h] || h));
    const ramps = {
      ash: R(['ash4', 'ash3', 'ash2', 'ash1', 'ash0']), grass: R(['st3', 'ash4', 'ash3', 'ash2', 'mo0']), path: R(['st3', 'st2', 'ash4', 'ash3', 'ash2']),
      cob: R(['st3', 'st2', 'st1', 'ash3']), field: R(['wd2', 'st3', 'ash4', 'ash3']), water: R(['wa2', 'wa1', 'wa0', 'ash4']),
      bridge: R(['ch1', 'st3', 'st2', 'st1', 'st0']), forest: R(['ink', 'mo3', 'mo2', 'mo1']), forest2: R(['ink', 'mo3', 'mo2', 'mo1', 'mo0']),
      rock: R(['st3', 'st2', 'st1', 'st0', 'ash3']), face: R(['ink', 'ch1', 'ch0', 'st3']), floor: R(['ink', 'ch1', 'ch0', 'st3', 'st2']),
      wall: R(['ink', 'ch1', 'ch0', 'st3', 'st2']), top: R(['void', 'ink']),
    };
    const pick = (ramp, v, x, y) => ramp[HL.clamp(Math.floor(v * (ramp.length - 1) + HL.bayer(x, y)), 0, ramp.length - 1)];
    const walkBlend = (t) => t === T.ASH || t === T.PATH || t === T.GRASS || t === T.COBBLE || t === T.FIELD || t === T.ROCK;
    const crown = (x, y) => {
      const cs = 11, cx = Math.floor(x / cs), cy = Math.floor(y / cs);
      let best = -1, lit = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const gx = cx + i, gy = cy + j, ox = gx * cs + HL.hash(gx, gy, 5) * cs, oy = gy * cs + HL.hash(gx, gy, 6) * cs, r = 7 + HL.hash(gx, gy, 8) * 3;
        const dx = x - ox, dy = y - oy, q = (dx * dx + dy * dy) / (r * r);
        if (q < 1) { const h = Math.sqrt(1 - q) + HL.hash(gx, gy, 9) * 0.3; if (h > best) { best = h; lit = HL.clamp(0.5 - (dx / r) * 0.35 - (dy / r) * 0.45, 0, 1); } }
      }
      return best < 0 ? 0.05 : HL.clamp(best * 0.4 + lit * 0.5 + HL.vnoise(x * 0.7, y * 0.7, 2) * 0.25 - 0.1, 0, 1);
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const tx = x >> 3, ty = y >> 3;
      let t = this.tile(tx, ty);
      if (walkBlend(t)) {
        const wx = x + (HL.vnoise(x * 0.15, y * 0.15, 31) - 0.5) * 7, wy = y + (HL.vnoise(x * 0.15, y * 0.15, 37) - 0.5) * 7;
        const t2 = this.tile(Math.floor(wx / 8), Math.floor(wy / 8));
        if (walkBlend(t2)) t = t2;
      }
      let col;
      const big = HL.fbm(x * 0.012, y * 0.012, 41, 3), mid = HL.fbm(x * 0.06, y * 0.06, 43, 2), h = HL.hash(x, y, 1);
      switch (t) {
        case T.ASH: {
          col = pick(ramps.ash, 0.25 + big * 0.55 + mid * 0.22, x, y);
          if (h < 0.018) col = ramps.ash[0]; else if (h > 0.996) col = ramps.grass[0];
          if (HL.hash(x, y + 1, 1) < 0.018) col = ramps.ash[1];
          break;
        }
        case T.GRASS: {
          col = pick(ramps.grass, 0.35 + big * 0.4 + mid * 0.2, x, y);
          if (h < 0.06) col = ramps.grass[0]; else if (HL.hash(x, y + 1, 1) < 0.06) col = ramps.grass[1];
          break;
        }
        case T.PATH: col = pick(ramps.path, 0.3 + big * 0.35 + mid * 0.3 + (h < 0.05 ? 0.3 : h > 0.95 ? -0.3 : 0), x, y); break;
        case T.COBBLE: {
          const row = Math.floor(y / 4), sx = Math.floor((x + (row % 2) * 3) / 6);
          const seam = y % 4 === 0 || (x + (row % 2) * 3) % 6 === 0;
          col = pick(ramps.cob, seam ? 0.05 : 0.45 + HL.hash(sx, row, 3) * 0.45 + big * 0.1, x, y); break;
        }
        case T.FIELD: col = pick(ramps.field, (y % 5 < 2 ? 0.15 : 0.55) + mid * 0.3 + (h < 0.04 ? 0.4 : 0), x, y); break;
        case T.WATER: {
          let v = 0.3 + big * 0.2 + (Math.sin(x * 0.35 + y * 0.12 + mid * 7) > 0.85 ? 0.35 : 0);
          const ed = [[0, -2], [0, 2], [-2, 0], [2, 0]].some(([a, b]) => this.tileAt(x + a, y + b) !== T.WATER && this.tileAt(x + a, y + b) !== T.BRIDGE);
          col = ed ? ramps.cob[0] : pick(ramps.water, v, x, y); break;
        }
        case T.BRIDGE: {
          const edge = this.tileAt(x, y - 3) === T.WATER ? 1 : this.tileAt(x, y + 3) === T.WATER ? 2 : 0;
          const sx = Math.floor(x / 7), sy = Math.floor(y / 5), seam = x % 7 === 0 || y % 5 === 0;
          let v = 0.6 + HL.hash(sx, sy, 12) * 0.3 - (seam ? 0.3 : 0);
          if (edge === 1) v = 0.9; if (edge === 2) v = 0.05;
          if (HL.fbm(x * 0.2, y * 0.2, 55, 2) > 0.7 && !edge) { col = ramps.water[1]; break; } // broken slabs
          col = pick(ramps.bridge, v, x, y); break;
        }
        case T.FOREST: col = pick(big > 0.5 ? ramps.forest2 : ramps.forest, crown(x, y), x, y); break;
        case T.ROCK: {
          const below = this.tile(tx, ty + 1) !== T.ROCK, ly = y & 7;
          if (below && ly >= 3) col = pick(ramps.face, 0.2 + HL.hash(x, 0, 4) * 0.5 - (ly - 3) * 0.05, x, y);
          else col = pick(ramps.rock, 0.35 + mid * 0.45 + (this.tile(tx, ty - 1) !== T.ROCK && ly < 1 ? 0.4 : 0), x, y);
          break;
        }
        case T.FLOOR: {
          const off = (Math.floor(y / 8) % 2) * 4, sx = Math.floor((x + off) / 8), sy = Math.floor(y / 8);
          const seam = (x + off) % 8 === 0 || y % 8 === 0;
          let v = 0.45 + HL.hash(sx, sy, 21) * 0.3 + mid * 0.15 - (seam ? 0.35 : 0) + (h < 0.03 ? 0.25 : 0);
          for (let k = 1; k <= 4; k++) if (this.tileAt(x, y - k) === T.WALL) { v -= (5 - k) * 0.08; break; }
          col = pick(ramps.floor, v, x, y); break;
        }
        case T.WALL: {
          const below = this.tile(tx, ty + 1) === T.FLOOR;
          if (below) { const row = Math.floor(y / 3), seam = y % 3 === 0 || (x + (row % 2) * 4) % 8 === 0; col = pick(ramps.wall, (seam ? 0.1 : 0.5 + HL.hash(Math.floor((x + (row % 2) * 4) / 8), row, 2) * 0.35) - (7 - (y & 7)) * 0.03, x, y); }
          else col = pick(ramps.top, 0.3 + mid * 0.5, x, y);
          break;
        }
        default: col = ramps.top[0];
      }
      const k = (y * W + x) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
    }
    c.g.putImageData(img, 0, 0);
    // building interiors (seen through ruined roofs and when you step inside)
    for (const b of this.buildings) { c.g.drawImage(b.art.floor, b.x0, b.y0); }
    return c;
  }
};
