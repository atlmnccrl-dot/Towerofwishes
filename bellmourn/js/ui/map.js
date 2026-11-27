// MapScreen({ run, map }, { pick(nodeId) }): the act's route inked on parchment. Walked roads are solid red
// ink, the roads you can take now march and glow, the rest are dotted. Nodes are ink seals with their icon
// (district, event, shrine, merchant, trial, quest, boss); a district shows its condition (fog, flood,
// fire...) in a corner. Your token stands on the node you are at. Tap a glowing node: a panel slides up
// with what it is and GO (or tap the node again); the token walks the road, then pick(id).
// With data.scene (world/mapscene.js, staged by game.stageMap) the route is a place: the 3D diorama under the act's
// weather, the warden standing at their stop; this screen then draws only the header, the names floating over the
// stops and the panel, directs the camera (game.mapCam: an opening sweep from the boss's tower back down the road,
// then close on the choices) and walks the warden down the road on GO.
import * as THREE from '../../vendor/three.module.min.js';
import { Screen, hpOf, PAL, ease, clamp, mix, iron, parchment, backdrop, button, line, alpha, ROMAN, fit, hash } from './kit.js';
import { icon, KIND, conditionOf } from './icons.js';
import { drawBoonStrip } from './hud.js';

const ACT_NAME = { 1: 'THE CITY', 2: 'BEYOND THE WALLS', 3: 'THE WHEEL', 4: 'THE DROWNED HEAVEN', 5: "THE GOD'S DREAM", 6: 'THE THRONE' }; // as in story.js ACT_NAMES (PROPOSAL)
// PROPOSAL: one line per node kind for the confirm panel
const INTRO = 4.6; // the act's opening sweep, seconds
const KIND_LINE = { area: 'FIGHTS, ITS BOSS, A BOON.', event: 'SOMETHING WAITS ON THE ROAD.', shrine: 'REST. HEAL. SPEND EMBERS.', merchant: 'A TRADER IN THE DARK.', trial: 'AN ELITE ARENA. A GREATER REWARD.', quest: 'THE HINT YOU FOLLOWED LEADS HERE.', boss: 'THE ACT ENDS HERE.' };

export class MapScreen extends Screen {
  onOpen(d) {
    this.map = d.map || (d.run && d.run.map) || { nodes: [] }; this.sel = null; this.go = null; this.panelT = 0; this.byId = new Map((this.map.nodes || []).map((n) => [n.id, n]));
    this.S3 = d.scene || null; this.camK = 0;
    // the act's first look at its road: the sweep from the boss's tower (once per act and run)
    const run = d.run || {}; const k = 'mapIntro' + (this.map.act || run.act || 1); this.intro = this.S3 && !(run.flags && run.flags[k]) ? { t: 0 } : null;
    if (this.intro && run.flags) run.flags[k] = true;
    if (this.S3 && !this.intro) { const ids = this.nextIds(); if (ids.length === 1) this.sel = ids[0]; }
  }
  onClose() { if (this.game) this.game.mapCam = null; }
  get run() { return this.data.run || {}; }
  nextIds() { const at = this.byId.get(this.run.at); if (!at) { const st = this.map.start; return (Array.isArray(st) ? st : st ? [st] : []).filter((id) => this.byId.has(id)); } return (at.next || []).filter((id) => this.byId.has(id)); }
  // which way the route runs: the screen is landscape, so the axis from the start to the boss is laid out
  // left to right whichever axis the map uses (A's maps climb in y; the sample runs in x)
  axis() {
    if (this._axis) return this._axis; const N = this.map.nodes || []; const st = [].concat(this.map.start || []).map((id) => this.byId.get(id)).filter(Boolean); const boss = N.find((n) => n.kind === 'boss');
    const a = st[0] || N[0], b = boss || N[N.length - 1]; let ax = { prog: 'x', flip: false };
    if (a && b && Math.abs(b.y - a.y) > Math.abs(b.x - a.x)) ax = { prog: 'y', flip: b.y < a.y }; else if (a && b) ax = { prog: 'x', flip: b.x < a.x };
    return (this._axis = ax);
  }
  layout(ui) {
    const B = this.box(ui); const top = B.T + 21; const x = B.L, w = B.R - B.L, y = top, h = B.B - top; const A = this.axis();
    const prog = (n) => { const v = A.prog === 'x' ? n.x : n.y; return A.flip ? 1 - v : v; }; const lane = (n) => (A.prog === 'x' ? n.y : n.x);
    const padX = 18, padY = 16; return { B, x, y, w, h, px: (n) => Math.round(x + padX + prog(n) * (w - padX * 2)), py: (n) => Math.round(y + padY + lane(n) * (h - padY * 2)) };
  }
  onDir(dir) {
    if (this.go || this.intro) return true; const ids = this.nextIds(); if (!ids.length) return true; const L = this.layout(this.ui);
    const ord = ids.slice().sort((a, b) => (this.S3 ? this.byId.get(a).x - this.byId.get(b).x : L.py(this.byId.get(a)) - L.py(this.byId.get(b))));
    let i = ord.indexOf(this.sel); i = i < 0 ? 0 : (i + (dir[1] || dir[0]) + ord.length) % ord.length; this.select(ord[i]); return true;
  }
  select(id) { if (this.sel !== id) { this.sel = id; this.panelT = 0; this.sound('ui'); } }
  onTap(id) {
    if (this.intro) { this.intro.t = Math.max(this.intro.t, INTRO); return; }
    if (this.go) return;
    if (id === 'go' && this.sel) { this.walk(this.sel); return; }
    if (id === 'cancel') { this.sel = null; this.sound('ui'); return; }
    if (id.startsWith('node:')) { const nid = id.slice(5); if (!this.nextIds().includes(nid)) { this.deny(this.items.find((x) => x.id === id)); return; } if (this.sel === nid && this.panelT > 0.15) this.walk(nid); else this.select(nid); }
  }
  onTapNothing() { if (this.intro) { this.intro.t = Math.max(this.intro.t, INTRO); return; } if (!this.go && this.sel) { this.sel = null; } }
  onUpdate(dt, inp) {
    this.panelT += dt;
    if (inp.confirm && this.sel && !this.go && this.panelT > 0.1 && !this.items.some((x) => x.id === this.focusId && x.id !== 'go')) this.walk(this.sel);
    if (this.S3) { this.update3d(dt, inp); return; }
    if (this.go) { this.go.t += dt; if (this.go.t >= 0.6 && !this.go.sent) { this.go.sent = true; this.call('pick', this.go.id); } }
  }
  onBack() { if (this.sel && !this.go) this.sel = null; }
  walk(id) { if (this.S3) { this.walk3d(id); return; } this.go = { id, t: 0 }; this.sound('uiOk'); this.sound('toll', { f: 196, vol: 0.6 }); const L = this.layout(this.ui); const n = this.byId.get(id); this.ring(L.px(n), L.py(n), PAL.inkRed, 22, 0.6); }

  render(ui) {
    if (this.S3) { this.render3d(ui); return; }
    const t = this.t, run = this.run; backdrop(ui, t, { veil: this.data.veil, motes: 10 });
    const L = this.layout(ui); const { B } = L;
    // header: the act, then health, tonics, embers and the boons held
    const act = this.map.act || run.act || 1;
    ui.text('ACT ' + (ROMAN[act] || act), B.L, B.T + 1, { color: PAL.text, scale: 2 }); const aw = ui.measure('ACT ' + (ROMAN[act] || act), 2);
    ui.text(ACT_NAME[act] || '', B.L + aw + 6, B.T + 7, { color: PAL.dim }); ui.rect(B.L, B.T + 16, Math.min(60, aw), 1, PAL.blood);
    let rx = B.R;
    const stat = (name, col, txt, tc) => { const w = ui.measure(txt); ui.text(txt, rx, B.T + 5, { align: 'right', color: tc }); icon(ui, name, rx - w - 10, B.T + 5, col); rx -= w + 18; };
    stat('ember', PAL.ember, String(run.embers ?? 0), PAL.goldHi); stat('tonic', PAL.tonic, String(run.tonics ?? '-'), PAL.text);
    const H = hpOf(run); stat('hp', PAL.hp, H.hp + '/' + H.max, H.k < 0.3 ? PAL.bad : PAL.text);
    const stripX = B.L + aw + 12 + ui.measure(ACT_NAME[act] || ''); const sw = rx - stripX - 4; if (sw > 30) drawBoonStrip(ui, run, stripX, B.T + 4, { t });
    // the sheet, in an iron frame
    iron(ui, L.x - 3, L.y - 3, L.w + 6, L.h + 6, { fill: '#0c0a08', rivets: true });
    parchment(ui, L.x, L.y, L.w, L.h, 7 + act);
    this.drawDecor(ui, L);
    // roads
    const nodes = this.map.nodes || []; const visited = new Set(run.visited || []); const next = new Set(this.nextIds()); const at = run.at;
    const order = (run.visited || []);
    const walked = new Set(); for (let i = 0; i + 1 < order.length; i++) walked.add(order[i] + '>' + order[i + 1]);
    for (const n of nodes) for (const m of n.next || []) {
      const b = this.byId.get(m); if (!b) continue; const x0 = L.px(n), y0 = L.py(n), x1 = L.px(b), y1 = L.py(b);
      if (walked.has(n.id + '>' + m)) { line(ui, x0, y0, x1, y1, PAL.inkRed); line(ui, x0, y0 + 1, x1, y1 + 1, mix(PAL.inkRed, PAL.ink, 0.4)); }
      else if (n.id === at && next.has(m)) { const on = this.sel === m; line(ui, x0, y0, x1, y1, on ? PAL.inkRed : PAL.ink, 3, 2, -t * 10); if (on) line(ui, x0, y0 + 1, x1, y1 + 1, mix(PAL.inkRed, PAL.ink, 0.5), 3, 2, -t * 10); }
      else line(ui, x0, y0, x1, y1, visited.has(n.id) && !visited.has(m) ? mix(PAL.inkSoft, PAL.parch, 0.45) : mix(PAL.inkSoft, PAL.parch, 0.25), 1, 2);
    }
    // nodes
    for (const n of nodes) {
      const x = L.px(n), y = L.py(n); const K = KIND[n.kind] || KIND.event; const big = n.kind === 'boss'; const r = big ? 9 : 7;
      const isNext = next.has(n.id), isVis = visited.has(n.id), isAt = n.id === at, isSel = this.sel === n.id;
      if (isNext) { const pulse = 0.5 + 0.5 * Math.sin(t * 4 + x * 0.1); for (let k = 3; k >= 1; k--) alpha(ui, (0.18 + pulse * 0.14) * (4 - k) / 3, () => ui.circle(x, y, r + k * 2 + (isSel ? 2 : 0), isSel ? '#ff6a3a' : '#ffcf70')); }
      const fill = isVis || isAt ? PAL.ink : (isNext ? '#f0e2c0' : PAL.parch2); const edge = isNext ? PAL.inkRed : (isVis ? PAL.ink : mix(PAL.inkSoft, PAL.parch, 0.2));
      ui.circle(x, y + 1, r, mix(PAL.parchLo, PAL.ink, 0.3)); ui.circle(x, y, r, edge); ui.circle(x, y, r - 1, fill);
      if (big) { ui.ring(x, y, r - 2, PAL.inkRed); }
      const ic = isVis || isAt ? PAL.parch : (isNext ? (n.kind === 'boss' ? PAL.inkRed : PAL.ink) : mix(PAL.inkSoft, PAL.parch, 0.15));
      icon(ui, K.icon, x, y, ic, { center: true, outline: false });
      // the district's condition, a small mark at the top right
      const cond = n.condition || n.cond; if (cond) { const C = conditionOf(cond); ui.circle(x + r - 1, y - r + 1, 4, PAL.ink); icon(ui, C.icon, x + r - 1, y - r + 1, C.col, { center: true, outline: false }); }
      if (isNext) this.hit('node:' + n.id, x - r - 6, y - r - 6, r * 2 + 12, r * 2 + 12, { tick: true });
      else this.hit('node:' + n.id, x - r, y - r, r * 2, r * 2, { nav: false, tick: false, small: true });
      if (isSel) { for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const ox = x + dx * (r + 4), oy = y + dy * (r + 4); ui.rect(ox - (dx > 0 ? 2 : 0), oy, 3, 1, PAL.inkRed); ui.rect(ox, oy - (dy > 0 ? 2 : 0), 1, 3, PAL.inkRed); } }
    }
    // the warden's token: a red pennant on a pole, bobbing; it walks the road on GO
    const atN = this.byId.get(at); if (atN) {
      let x = L.px(atN), y = L.py(atN);
      if (this.go) { const b = this.byId.get(this.go.id); const k = ease.inOut(clamp(this.go.t / 0.55)); x = Math.round(x + (L.px(b) - x) * k); y = Math.round(y + (L.py(b) - y) * k - Math.abs(Math.sin(k * Math.PI * 3)) * 3); }
      const bob = this.go ? 0 : Math.round(Math.sin(t * 3) * 1.5); const ty = y - 10 + bob;
      ui.rect(x - 2, y + 7, 5, 1, 'rgba(42,28,16,0.5)'); ui.rect(x, ty - 8, 1, 15, PAL.ink); ui.rect(x + 1, ty - 8, 6, 3, PAL.blood); ui.rect(x + 1, ty - 5, 4, 2, PAL.blood); ui.rect(x + 1, ty - 8, 6, 1, '#ff5a50'); ui.rect(x - 1, ty - 9, 3, 1, PAL.gold);
    }
    this.drawPanel(ui, L);
  }

  // ================================================================== the route as a place (world/mapscene.js)
  hero3() { return this.game && this.game.world && this.game.world.hero; }
  pos3(id) { const p = this.S3.nodePos(id); return p ? { x: p.x, z: p.z } : null; }
  // where the warden stands at a stop: just in front of its landmark, on the road onwards (not inside its walls)
  stand3(id) { const p = this.pos3(id); return p ? { x: p.x + 2.0 * Math.SQRT1_2, z: p.z + 0.6 * Math.SQRT1_2 } : null; }
  // where the warden stands before the act's first stop: a little back down the road from the first row
  startPos3() { const ids = this.nextIds(); const ps = ids.map((id) => this.pos3(id)).filter(Boolean); if (!ps.length) return { x: 0, z: 0 }; const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cz = ps.reduce((a, p) => a + p.z, 0) / ps.length; return { x: cx - 4.4 * Math.SQRT1_2, z: cz + 4.4 * Math.SQRT1_2 }; }
  update3d(dt, inp) {
    const g = this.game; const h = this.hero3(); const t = this.t; const at = this.run.at;
    const state = { visited: new Set(this.run.visited || []), walked: new Set(), next: new Set(this.nextIds()), at, sel: this.sel, t };
    const order = this.run.visited || []; for (let i = 0; i + 1 < order.length; i++) state.walked.add(order[i] + '>' + order[i + 1]);
    if (this.go) state.walked.add((at || '') + '>' + this.go.id);
    this.S3.update(dt, state);
    // the warden: idles at their stop, walks the road on GO
    if (h) {
      h.animT = (h.animT || 0) + dt;
      if (this.go) {
        const W = this.go; W.t += dt; const k = clamp(W.t / W.dur); const e = ease.inOut(k);
        h.x = W.a.x + (W.b.x - W.a.x) * e; h.z = W.a.z + (W.b.z - W.a.z) * e; h.face = Math.atan2(W.b.x - W.a.x, W.b.z - W.a.z);
        if (h.anim !== 'walk' && k < 1) { h.anim = 'walk'; h.animT = 0; }
        if (k >= 1 && h.anim === 'walk') { h.anim = 'idle'; h.animT = 0; if (g.fx) g.fx.shockRing(h.x, h.z, 2.2, [2.6, 1.8, 0.8], 0.5); this.sound('toll', { f: 147, vol: 0.5 }); }
        if (W.t >= W.dur + 0.45 && !W.sent) { W.sent = true; this.call('pick', W.id); }
      } else if (!this.placed) { this.placed = true; const p = at ? this.stand3(at) : this.startPos3(); if (p) { h.x = p.x; h.z = p.z; } const ids = this.nextIds(); const q = ids.length ? this.pos3(ids[Math.floor(ids.length / 2)]) : null; if (q) h.face = Math.atan2(q.x - h.x, q.z - h.z); h.anim = 'idle'; }
    }
    // the camera
    if (this.intro) { this.intro.t += dt; if (this.intro.t >= INTRO + 0.6) { this.intro = null; const ids = this.nextIds(); if (ids.length === 1) this.select(ids[0]); } }
    if (g) g.mapCam = this.camera3();
  }
  camera3() {
    const h = this.hero3(); const V = THREE.Vector3; const hp = h ? new V(h.x, 0.8, h.z) : new V(0, 0.8, 0);
    if (this.intro) {
      // the sweep: low at the boss's tower, its bell burning; then up and back down the whole road to the warden
      const boss = (this.map.nodes || []).find((n) => n.kind === 'boss'); const bp = boss ? this.pos3(boss.id) : { x: 0, z: 0 }; const top = boss ? this.S3.top(boss.id) : 8;
      const t = this.intro.t; const a = ease.inOut(clamp((t - 2.0) / (INTRO - 2.0)));
      const tg = new V(bp.x, top * 0.62, bp.z).lerp(hp, a); tg.y = top * 0.62 * (1 - a) + 0.8 * a;
      return { target: tg, zoom: 1.35 - 0.3 * a + (t < 2 ? t * 0.04 : 0), view: [20 + 25 * a + (t < 2 ? t * 4 : 0), 12 + 30 * a], snap: t < 0.05 };
    }
    if (this.go) return { target: hp, zoom: 1.25, view: [45, 34] };
    // close on the choices: the warden and where they could go (the one picked weighs more)
    const ids = this.nextIds(); const ps = ids.map((id) => this.pos3(id)).filter(Boolean); let c = hp.clone();
    if (ps.length) { const m = ps.reduce((acc, p) => acc.add(new V(p.x, 0.8, p.z)), new V()).multiplyScalar(1 / ps.length); c = hp.clone().lerp(m, 0.5); if (this.sel) { const s = this.pos3(this.sel); if (s) c.lerp(new V(s.x, 0.8, s.z), 0.35); } }
    return { target: c, zoom: 1.0, view: [45, 40] };
  }
  walk3d(id) {
    const h = this.hero3(); const c = this.pos3(id); if (!c) { this.call('pick', id); return; }
    const a = h ? { x: h.x, z: h.z } : c; const d0 = Math.hypot(c.x - a.x, c.z - a.z) || 1; const stop = Math.min(2.2, d0 * 0.4); // up to its door, not into it
    const b = { x: c.x - (c.x - a.x) / d0 * stop, z: c.z - (c.z - a.z) / d0 * stop }; const d = d0 - stop;
    this.go = { id, t: 0, a, b, dur: clamp(d / 4.2, 0.8, 2.2) }; this.sound('uiOk'); this.sound('toll', { f: 196, vol: 0.6 });
  }
  render3d(ui) {
    const t = this.t, run = this.run; const W = ui.w, H = ui.h; const g = this.game; const r = g && g.r; if (!r) return;
    const B = this.box(ui); const act = this.map.act || run.act || 1;
    if (this.intro) {
      // the act's name over the boss's tower, the boss's ground under it; letterbox
      const it = this.intro.t; const a = clamp(Math.min(it * 1.5, (INTRO + 0.4 - it) * 2)); const bh = Math.round(H * 0.11);
      ui.rect(0, 0, W, bh, '#000'); ui.rect(0, H - bh, W, bh, '#000');
      alpha(ui, a, () => {
        ui.text('ACT ' + (ROMAN[act] || act), W / 2, Math.round(H * 0.3), { align: 'center', scale: 2, color: PAL.goldHi });
        const nm = this.map.name || ACT_NAME[act] || ''; const sc = ui.measure(nm, 3) <= W - 30 ? 3 : 2; ui.text(nm, W / 2, Math.round(H * 0.3) + 18, { align: 'center', scale: sc, color: '#ffffff' });
        const lw = Math.round(ui.measure(nm, sc) * clamp(it * 1.2)); ui.rect(Math.round(W / 2 - lw / 2), Math.round(H * 0.3) + 18 + sc * 7 + 3, lw, 2, PAL.blood);
        const boss = (this.map.nodes || []).find((n) => n.kind === 'boss'); if (boss && it > 1.0) ui.text('AT ITS END: ' + (boss.label || ''), W / 2, Math.round(H * 0.3) + 18 + sc * 7 + 10, { align: 'center', color: PAL.dim });
      });
      if (it > 1.2) ui.text(this.touch ? 'TAP TO SKIP' : 'ANY KEY TO SKIP', W - 6, H - bh - 10, { align: 'right', color: PAL.faint, shadow: false });
      return;
    }
    // the header over a dark band: the act, then health, tonics, embers and the boons held
    ui.rect(0, 0, W, B.T + 19, 'rgba(4,5,8,0.62)'); ui.rect(0, B.T + 19, W, 1, 'rgba(120,90,50,0.35)');
    ui.text('ACT ' + (ROMAN[act] || act), B.L, B.T + 1, { color: PAL.text, scale: 2 }); const aw = ui.measure('ACT ' + (ROMAN[act] || act), 2);
    ui.text(this.map.name || ACT_NAME[act] || '', B.L + aw + 6, B.T + 7, { color: PAL.dim }); ui.rect(B.L, B.T + 16, Math.min(60, aw), 1, PAL.blood);
    let rx = B.R;
    const stat = (name, col, txt, tc) => { const w = ui.measure(txt); ui.text(txt, rx, B.T + 5, { align: 'right', color: tc }); icon(ui, name, rx - w - 10, B.T + 5, col); rx -= w + 18; };
    stat('ember', PAL.ember, String(run.embers ?? 0), PAL.goldHi); stat('tonic', PAL.tonic, String(run.tonics ?? '-'), PAL.text);
    const Hh = hpOf(run); stat('hp', PAL.hp, Hh.hp + '/' + Hh.max, Hh.k < 0.3 ? PAL.bad : PAL.text);
    const stripX = B.L + aw + 12 + ui.measure(this.map.name || ACT_NAME[act] || ''); const sw = rx - stripX - 4; if (sw > 30) drawBoonStrip(ui, run, stripX, B.T + 4, { t });
    // over each stop: its seal; over the ones open now, its name, and a tap area round the whole landmark
    const next = new Set(this.nextIds()); const vis = new Set(run.visited || []); const V3 = THREE.Vector3; const marks = [];
    for (const n of this.map.nodes || []) {
      const p = this.pos3(n.id); if (!p) continue; const top = this.S3.top(n.id);
      const sTop = r.project(new V3(p.x, top + 0.4, p.z)), sBase = r.project(new V3(p.x, 0, p.z));
      if (sTop.x < -40 || sTop.x > W + 40 || sBase.y < -20 || sTop.y > H + 40) continue; marks.push({ n, sTop, sBase });
    }
    for (const { n, sTop, sBase } of marks) {
      const isNext = next.has(n.id) && !this.go, isSel = this.sel === n.id, isVis = vis.has(n.id) || n.id === run.at; const K = KIND[n.kind] || KIND.event;
      const x = Math.round(sTop.x), y = Math.round(Math.max(B.T + 32, sTop.y));
      const rr = n.kind === 'boss' ? 8 : 6; const bob = isNext ? Math.round(Math.sin(t * 3 + x * 0.05) * 1.5) : 0;
      if (isNext) { const pulse = 0.5 + 0.5 * Math.sin(t * 4 + x * 0.1); for (let k = 2; k >= 1; k--) alpha(ui, (0.2 + pulse * 0.2) * (3 - k) / 2, () => ui.circle(x, y + bob, rr + k * 2 + (isSel ? 2 : 0), isSel ? '#ff6a3a' : '#ffcf70')); }
      alpha(ui, isNext || n.kind === 'boss' ? 1 : (isVis ? 0.55 : 0.4), () => {
        ui.circle(x, y + bob, rr, isNext ? PAL.inkRed : PAL.ink); ui.circle(x, y + bob, rr - 1, isVis ? PAL.ink : '#f0e2c0');
        icon(ui, K.icon, x, y + bob, isVis ? PAL.parch : (n.kind === 'boss' ? PAL.inkRed : PAL.ink), { center: true, outline: false });
      });
      if (isNext) {
        const name = fit(ui, n.label || K.name, 120); const ty = y + bob - rr - 11; const tw = ui.measure(name);
        ui.rect(Math.round(x - tw / 2 - 3), ty - 2, tw + 6, 10, 'rgba(6,6,10,0.72)'); ui.text(name, x, ty, { align: 'center', color: isSel ? PAL.goldHi : PAL.text, shadow: false });
        const cond = n.condition || n.cond; if (cond) { const C = conditionOf(cond); icon(ui, C.icon, Math.round(x + tw / 2 + 8), ty, C.col); }
        const hx0 = Math.min(x - 18, sBase.x - 22), hx1 = Math.max(x + 18, sBase.x + 22), hy0 = ty - 4, hy1 = Math.max(sBase.y + 10, y + 14);
        this.hit('node:' + n.id, Math.round(hx0), Math.round(hy0), Math.round(hx1 - hx0), Math.round(hy1 - hy0), { tick: true });
        if (isSel) { for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const ox = x + dx * (rr + 4), oy = y + bob + dy * (rr + 4); ui.rect(ox - (dx > 0 ? 2 : 0), oy, 3, 1, PAL.inkRed); ui.rect(ox, oy - (dy > 0 ? 2 : 0), 1, 3, PAL.inkRed); } }
      }
    }
    if (!this.go) this.drawPanel3(ui, B);
  }
  // the confirm panel, along the foot of the screen
  drawPanel3(ui, B) {
    const n = this.sel && this.byId.get(this.sel); if (!n) { if (!this.go && this.nextIds().length > 1) ui.text(this.touch ? 'TAP A PLACE TO GO' : 'CHOOSE THE ROAD', ui.w / 2, B.B - 10, { align: 'center', color: PAL.dim, alpha: 0.6 + 0.3 * Math.sin(this.t * 3) }); return; }
    const k = ease.back(clamp(this.panelT / 0.28)); const K = KIND[n.kind] || KIND.event;
    const pw = Math.min(B.R - B.L - 20, 300), ph = 38; const px = Math.round(ui.w / 2 - pw / 2); const py = Math.round(B.B - ph - 2 + (1 - k) * (ph + 10));
    alpha(ui, clamp(this.panelT / 0.12), () => {
      iron(ui, px, py, pw, ph, { fill: '#101318' });
      ui.circle(px + 19, py + 19, 12, PAL.ink); ui.circle(px + 19, py + 19, 11, '#f0e2c0'); icon(ui, K.icon, px + 19, py + 19, n.kind === 'boss' ? PAL.inkRed : PAL.ink, { center: true, outline: false, scale: 1 });
      const tx = px + 37, gw = 56; const tw = pw - (tx - px) - gw - 10;
      ui.text(fit(ui, n.label || K.name, tw), tx, py + 7, { color: PAL.text });
      let sub = n.label && String(n.label).toUpperCase() !== K.name ? K.name : ''; const cond = n.condition || n.cond;
      if (cond) { const C = conditionOf(cond); icon(ui, C.icon, tx, py + 18, C.col); ui.text(fit(ui, C.name, tw - 10), tx + 10, py + 18, { color: C.col }); }
      else ui.text(fit(ui, sub || '', tw), tx, py + 18, { color: PAL.dim });
      ui.text(fit(ui, KIND_LINE[n.kind] || '', tw), tx, py + 27, { color: PAL.faint, shadow: false });
      const st = this.hit('go', px + pw - gw - 6, py + 6, gw, ph - 12, {}); button(ui, { x: px + pw - gw - 6, y: py + 6, w: gw, h: ph - 12 }, 'GO', st, { primary: true }); // PROPOSAL
    });
  }
  drawDecor(ui, L) {
    // a compass rose bottom left, cross-hatched hills, and the act's name lettered in ink
    const cx = L.x + 16, cy = L.y + L.h - 16; const ink = mix(PAL.inkSoft, PAL.parch, 0.35);
    for (let i = -8; i <= 8; i++) { ui.rect(cx + i, cy, 1, 1, ink); ui.rect(cx, cy + i, 1, 1, ink); } for (let i = -4; i <= 4; i++) { ui.rect(cx + i, cy + i, 1, 1, ink); ui.rect(cx + i, cy - i, 1, 1, ink); }
    ui.ring(cx, cy, 5, ink); ui.text('N', cx, cy - 17, { align: 'center', color: ink, shadow: false });
    for (let i = 0; i < 9; i++) { const hx = L.x + 30 + hash(i * 17 + 3) * (L.w - 60), hy = L.y + 10 + hash(i * 29 + 1) * (L.h - 20); for (let k = 0; k < 4; k++) ui.rect(hx + k * 2, hy + (k % 2), 1, 2, mix(PAL.parchLo, PAL.parch, 0.3)); }
    const nm = ACT_NAME[this.map.act || this.run.act || 1] || ''; ui.text(nm, L.x + L.w - 10, L.y + L.h - 14, { align: 'right', color: mix(PAL.inkSoft, PAL.parch, 0.45), shadow: false });
  }
  // the confirm panel: slides up over the sheet's foot
  drawPanel(ui, L) {
    const n = this.sel && this.byId.get(this.sel); if (!n) return;
    const k = ease.back(clamp(this.panelT / 0.28)); const K = KIND[n.kind] || KIND.event;
    const pw = Math.min(L.w - 20, 300), ph = 38; const nx = L.px(n);
    const px = Math.round(Math.max(L.x + 8, Math.min(L.x + L.w - pw - 8, nx - pw / 2))); const above = L.py(n) > L.y + L.h * 0.55;
    const py0 = above ? L.y + 6 : L.y + L.h - ph - 6; const py = Math.round(above ? py0 - (1 - k) * (ph + 10) : py0 + (1 - k) * (ph + 10));
    alpha(ui, clamp(this.panelT / 0.12), () => {
      iron(ui, px, py, pw, ph, { fill: '#101318' });
      ui.circle(px + 19, py + 19, 12, PAL.ink); ui.circle(px + 19, py + 19, 11, '#f0e2c0'); icon(ui, K.icon, px + 19, py + 19, n.kind === 'boss' ? PAL.inkRed : PAL.ink, { center: true, outline: false, scale: 1 });
      const tx = px + 37, gw = 56; const tw = pw - (tx - px) - gw - 10;
      ui.text(fit(ui, n.label || K.name, tw), tx, py + 7, { color: PAL.text });
      let sub = n.label && String(n.label).toUpperCase() !== K.name ? K.name : ''; let col = PAL.dim; const cond = n.condition || n.cond;
      if (cond) { const C = conditionOf(cond); sub = C.name; col = C.col; icon(ui, C.icon, tx, py + 18, C.col); ui.text(fit(ui, sub, tw - 10), tx + 10, py + 18, { color: col }); }
      else ui.text(fit(ui, sub || '', tw), tx, py + 18, { color: col });
      ui.text(fit(ui, KIND_LINE[n.kind] || '', tw), tx, py + 27, { color: PAL.faint, shadow: false });
      const st = this.hit('go', px + pw - gw - 6, py + 6, gw, ph - 12, {}); button(ui, { x: px + pw - gw - 6, y: py + 6, w: gw, h: ph - 12 }, 'GO', st, { primary: true }); // PROPOSAL
    });
  }
}
