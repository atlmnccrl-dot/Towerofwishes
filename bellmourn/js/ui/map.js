// MapScreen({ run, map }, { pick(nodeId) }): the act's route inked on parchment. Walked roads are solid red
// ink, the roads you can take now march and glow, the rest are dotted. Nodes are ink seals with their icon
// (district, event, shrine, merchant, trial, quest, boss); a district shows its condition (fog, flood,
// fire...) in a corner. Your token stands on the node you are at. Tap a glowing node: a panel slides up
// with what it is and GO (or tap the node again); the token walks the road, then pick(id).
import { Screen, hpOf, PAL, ease, clamp, mix, iron, parchment, backdrop, button, line, alpha, ROMAN, lines, fit, hash } from './kit.js';
import { icon, KIND, conditionOf } from './icons.js';
import { drawBoonStrip } from './hud.js';

const ACT_NAME = { 1: 'THE CITY', 2: 'BEYOND THE WALLS', 3: 'THE WHEEL' }; // as in story.js ACT_NAMES (PROPOSAL)
// PROPOSAL: one line per node kind for the confirm panel
const KIND_LINE = { area: 'FIGHTS, ITS BOSS, A BOON.', event: 'SOMETHING WAITS ON THE ROAD.', shrine: 'REST. HEAL. SPEND EMBERS.', merchant: 'A TRADER IN THE DARK.', trial: 'AN ELITE ARENA. A GREATER REWARD.', quest: 'THE HINT YOU FOLLOWED LEADS HERE.', boss: 'THE ACT ENDS HERE.' };

export class MapScreen extends Screen {
  onOpen(d) { this.map = d.map || (d.run && d.run.map) || { nodes: [] }; this.sel = null; this.go = null; this.panelT = 0; this.byId = new Map((this.map.nodes || []).map((n) => [n.id, n])); }
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
    if (this.go) return true; const ids = this.nextIds(); if (!ids.length) return true; const L = this.layout(this.ui);
    const ord = ids.slice().sort((a, b) => L.py(this.byId.get(a)) - L.py(this.byId.get(b)));
    let i = ord.indexOf(this.sel); i = i < 0 ? 0 : (i + (dir[1] || dir[0]) + ord.length) % ord.length; this.select(ord[i]); return true;
  }
  select(id) { if (this.sel !== id) { this.sel = id; this.panelT = 0; this.sound('ui'); } }
  onTap(id) {
    if (this.go) return;
    if (id === 'go' && this.sel) { this.walk(this.sel); return; }
    if (id === 'cancel') { this.sel = null; this.sound('ui'); return; }
    if (id.startsWith('node:')) { const nid = id.slice(5); if (!this.nextIds().includes(nid)) { this.deny(this.items.find((x) => x.id === id)); return; } if (this.sel === nid && this.panelT > 0.15) this.walk(nid); else this.select(nid); }
  }
  onTapNothing() { if (!this.go && this.sel) { this.sel = null; } }
  onUpdate(dt, inp) {
    this.panelT += dt;
    if (inp.confirm && this.sel && !this.go && this.panelT > 0.1 && !this.items.some((x) => x.id === this.focusId && x.id !== 'go')) this.walk(this.sel);
    if (this.go) { this.go.t += dt; if (this.go.t >= 0.6 && !this.go.sent) { this.go.sent = true; this.call('pick', this.go.id); } }
  }
  onBack() { if (this.sel && !this.go) this.sel = null; }
  walk(id) { this.go = { id, t: 0 }; this.sound('uiOk'); this.sound('toll', { f: 196, vol: 0.6 }); const L = this.layout(this.ui); const n = this.byId.get(id); this.ring(L.px(n), L.py(n), PAL.inkRed, 22, 0.6); }

  render(ui) {
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
