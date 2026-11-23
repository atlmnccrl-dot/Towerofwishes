// EventScreen({ run, event }, { choose(i) }), then showResult(lines, onDone[, changes]). One big iron card:
// on the left a framed pixel vignette painted from the event's art spec (vignettes.js), on the right its
// title, a short text that types itself in (a tap finishes it), and 2-3 choices that slide in, each with
// its cost (health, embers, a tonic) and its risk. Choosing lights the choice and calls choose(i); A
// resolves it and calls showResult: the choices slide away and the outcome types in, with what changed
// popping in as chips, then CONTINUE calls onDone.
import { Screen, hpOf, PAL, ease, clamp, mix, iron, backdrop, button, lines, alpha, fit, chip } from './kit.js';
import { icon, COST_ICON } from './icons.js';
import { drawVignette } from './vignettes.js';

const CPS = 55; // letters per second
export class EventScreen extends Screen {
  onOpen(d) { this.ev = d.event || { title: '', text: '', choices: [] }; this.reveal = 0; this.mode = 'read'; this.chosen = -1; this.modeT = 0; this.result = null; this.focusId = null; }
  get run() { return this.data.run || {}; }
  showResult(ls, onDone, changes) {
    if (ls && !Array.isArray(ls) && typeof ls === 'object') { changes = changes || ls.changes; ls = ls.lines; }
    this.result = { lines: (ls || []).map((l) => String(l).toUpperCase()), changes: changes || {}, onDone, reveal: 0, chips: chipsOf(changes || {}) }; this.mode = 'result'; this.modeT = 0; this.focusId = null;
  }
  affordable(c) { const r = this.run, k = c.cost || {}; if (k.hp && hpOf(r).hp <= k.hp) return false; if (k.embers && (r.embers ?? 0) < k.embers) return false; if ((k.tonic || k.tonics) && r.tonics !== null && (r.tonics ?? 0) < (k.tonic || k.tonics)) return false; return true; }
  layout(ui) {
    const B = this.box(ui); const W = B.R - B.L, H = B.B - B.T; const vw = Math.round(W * 0.46); const vh = H - 12;
    return { B, card: { x: B.L, y: B.T, w: W, h: H }, vig: { x: B.L + 6, y: B.T + 6, w: vw, h: vh }, rx: B.L + vw + 16, rw: W - vw - 24 };
  }
  textLines(ui, L) { const key = L.rw; if (this._tl && this._tlk === key) return this._tl; this._tlk = key; return (this._tl = lines(ui, this.ev.text || '', L.rw, 7)); }
  onTap(id) {
    if (this.mode === 'read') {
      if (this.reveal < 1) { this.reveal = 1; return; }
      if (id.startsWith('choice')) { const i = +id.slice(6); this.choose(i); }
    } else if (this.mode === 'result') {
      const R = this.result; if (R.reveal < 1) { R.reveal = 1; return; }
      if (id === 'continue' && !R.done) { R.done = true; this.sound('uiOk'); if (typeof R.onDone === 'function') R.onDone(); }
    }
  }
  onTapNothing() { if (this.mode === 'read' && this.reveal < 1) this.reveal = 1; else if (this.mode === 'result' && this.result.reveal < 1) this.result.reveal = 1; }
  choose(i) {
    const c = (this.ev.choices || [])[i]; if (!c) return; if (!this.affordable(c)) { this.deny(this.items.find((x) => x.id === 'choice' + i)); return; }
    this.chosen = i; this.mode = 'wait'; this.modeT = 0; const it = this.items.find((x) => x.id === 'choice' + i);
    if (it) { this.flash(it.x, it.y, it.w, it.h, '#fff2d0', 0.35); this.burst(it.x + it.w / 2, it.y + it.h / 2, PAL.gold, 12, 50); }
    this.shake(1.5, 0.2); this.sound('uiOk'); this.call('choose', i);
  }
  onUpdate(dt, inp) {
    this.modeT += dt;
    if (this.mode === 'read' && this.ui) { const n = this.textLines(this.ui, this.layout(this.ui)).join('').length || 1; this.reveal = Math.min(1, this.reveal + dt * CPS / n); }
    if (this.mode === 'result') { const R = this.result; const n = R.lines.join('').length || 1; const was = R.reveal; R.reveal = Math.min(1, R.reveal + dt * CPS / n); if (was < 1 && R.reveal >= 1) { R.chipT = 0; } if (R.reveal >= 1) R.chipT = (R.chipT || 0) + dt; }
    if ((inp.confirm) && this.mode === 'read' && this.reveal < 1) this.reveal = 1;
  }
  render(ui) {
    const t = this.t; const L = this.layout(ui); backdrop(ui, t, { veil: this.data.veil, tint: '#2a1a10', motes: 12 });
    const k = ease.out(clamp(this.t / 0.4)); const dy = Math.round((1 - k) * 20);
    const g = ui.g; g.save(); g.translate(0, dy); g.globalAlpha *= k;
    // the card
    iron(ui, L.card.x, L.card.y, L.card.w, L.card.h, { fill: '#0d0f14' });
    // the vignette in a thin gold-and-black frame, fading up from black
    const V = L.vig; ui.rect(V.x - 2, V.y - 2, V.w + 4, V.h + 4, '#000'); ui.outline(V.x - 2, V.y - 2, V.w + 4, V.h + 4, PAL.goldLo);
    drawVignette(ui, this.ev.art, V.x, V.y, V.w, V.h, t);
    alpha(ui, 1 - clamp(this.t / 0.7), () => ui.rect(V.x, V.y, V.w, V.h, '#000'));
    for (const [cx, cy] of [[V.x - 2, V.y - 2], [V.x + V.w - 1, V.y - 2], [V.x - 2, V.y + V.h - 1], [V.x + V.w - 1, V.y + V.h - 1]]) { ui.rect(cx, cy, 3, 3, PAL.gold); ui.rect(cx + 1, cy + 1, 1, 1, '#000'); }
    // the right side
    let y = L.card.y + 9; const x = L.rx, w = L.rw;
    const title = lines(ui, this.ev.title || '', w, 2); for (const l of title) { ui.text(l, x, y, { color: PAL.goldHi }); y += 9; }
    ui.rect(x, y + 1, Math.min(w, 40), 1, PAL.blood); y += 6;
    if (this.mode === 'result') this.drawResult(ui, L, x, y, w);
    else { const tl = this.textLines(ui, L); const n = tl.join('').length; let left = Math.floor(this.reveal * n);
      for (const l of tl) { if (left <= 0) break; ui.text(l.slice(0, left), x, y, { color: PAL.text, shadow: false }); left -= l.length; y += 9; }
      this.drawChoices(ui, L, x, w); }
    g.restore();
  }
  drawChoices(ui, L, x, w) {
    const C = this.ev.choices || []; const bh = 21, gap = 3; const base = L.card.y + L.card.h - 7 - C.length * (bh + gap) + gap;
    const tIn = this.reveal >= 1 ? (this._inT = (this._inT ?? this.t)) : null;
    C.forEach((c, i) => {
      if (tIn === null) return; const k = ease.back(clamp((this.t - tIn - i * 0.07) / 0.3)); if (k <= 0) return;
      const by = base + i * (bh + gap); const bx = Math.round(x + (1 - k) * 60);
      const ok = this.affordable(c); const chosen = this.chosen === i; const waiting = this.mode === 'wait';
      const st = this.hit('choice' + i, bx, by, w, bh, { disabled: !ok || (waiting && !chosen) });
      const costs = costList(c.cost);
      const cw = costs.reduce((s, q) => s + ui.measure(q.n) + 12, 0);
      alpha(ui, k * (waiting && !chosen ? 0.4 : 1), () => {
        // a long label without a risk wraps onto the second line
        let label = c.label, sub = c.risk ? '   ' + c.risk : undefined, subCol = '#d06a5a';
        if (!c.risk && ui.measure(String(label)) > w - 16 - cw) { const two = lines(ui, label, w - 16 - cw, 2); label = two[0]; sub = two[1]; subCol = !ok ? '#55524c' : (chosen ? PAL.goldHi : PAL.text); }
        button(ui, { x: bx, y: by, w, h: bh }, fit(ui, label, w - 16 - cw), chosen ? { hover: true, focus: true } : st, { align: 'left', sub, subCol, primary: chosen, col: !ok ? '#55524c' : undefined });
        const sy = by + (c.risk || ui.measure(String(c.label)) > w - 16 - cw ? 3 : 7) + (st.press ? 1 : (st.hover || st.focus ? -1 : 0));
        if (c.risk) icon(ui, 'risk', bx + 7, sy + 9, '#d06a5a');
        let cx = bx + w - 7; for (const q of costs.reverse()) { const tw = ui.measure(q.n); ui.text(q.n, cx, sy, { align: 'right', color: q.short(this.run) ? PAL.bad : '#ff9a8a' }); q.icon(ui, cx - tw - 9, sy); cx -= tw + 13; }
      });
    });
  }
  drawResult(ui, L, x, y, w) {
    const R = this.result; const all = R.lines.flatMap((l) => lines(ui, l, w, 4)); const n = all.join('').length; let left = Math.floor(R.reveal * n);
    for (const l of all) { if (left <= 0) break; ui.text(l.slice(0, left), x, y, { color: PAL.text, shadow: false }); left -= l.length; y += 9; }
    y += 4;
    // what changed, chip by chip
    if (R.reveal >= 1) { let cx = x; let cy = y; R.chips.forEach((c, i) => { const ct = (R.chipT || 0) - i * 0.12; if (ct < 0) return; if (!c.sounded) { c.sounded = true; this.sound(c.good ? 'ember' : 'heroHurt', { vol: 0.6 }); }
      const wv = ui.measure(c.label) + 6 + (c.icon ? 9 : 0); if (cx + wv > x + w) { cx = x; cy += 12; } const k = ease.back(clamp(ct / 0.25)); alpha(ui, clamp(ct * 5), () => chip(ui, cx, cy - Math.round((1 - k) * 6), c.label, c.col, { icon: c.icon })); cx += wv + 3; }); }
    const bw = Math.min(w, 110), bh = 20; const bx = x + w - bw, by = L.card.y + L.card.h - 7 - bh;
    const k = ease.out(clamp(((R.chipT || 0) - R.chips.length * 0.12) / 0.3));
    if (R.reveal >= 1 && k > 0) alpha(ui, k, () => { const st = this.hit('continue', bx, by, bw, bh); button(ui, { x: bx, y: by, w: bw, h: bh }, 'CONTINUE', st, { primary: true }); }); // PROPOSAL
  }
}
function costList(cost) {
  const out = []; if (!cost) return out;
  if (cost.hp) out.push({ n: '-' + cost.hp, icon: COST_ICON.hp, short: (r) => hpOf(r).hp <= cost.hp });
  if (cost.embers) out.push({ n: '-' + cost.embers, icon: COST_ICON.embers, short: (r) => (r.embers ?? 0) < cost.embers });
  const tn = cost.tonic || cost.tonics; if (tn) out.push({ n: '-' + tn, icon: COST_ICON.tonic, short: (r) => (r.tonics ?? 0) < tn });
  return out;
}
// the changes of a resolved event as chips (PROPOSAL labels)
function chipsOf(ch) {
  const out = []; const num = (v, lbl, iconName, col, good) => { if (!v) return; out.push({ label: (v > 0 ? '+' : '') + v + ' ' + lbl, col: v > 0 === good ? '#8ad890' : '#e8786a', icon: (u, x, y) => icon(u, iconName, x, y, col), good: v > 0 === good }); };
  num(ch.hp, 'HEALTH', 'hp', PAL.hp, true); num(ch.maxHp, 'MAX HEALTH', 'heart', PAL.hp, true); num(ch.embers, 'EMBERS', 'ember', PAL.ember, true); num(ch.tonics ?? ch.tonic, 'TONIC', 'tonic', PAL.tonic, true);
  if (ch.boon) out.push({ label: ch.boon === 'offer' ? 'A BOON' : 'BOON: ' + String(ch.boon).toUpperCase(), col: PAL.gold, icon: (u, x, y) => icon(u, 'boon', x, y, PAL.gold), good: true });
  if (ch.relic) out.push({ label: 'A RELIC', col: '#8fd0ff', icon: (u, x, y) => icon(u, 'relic', x, y, '#8fd0ff'), good: true });
  if (ch.curse) out.push({ label: 'CURSED', col: '#c070ff', icon: (u, x, y) => icon(u, 'curse', x, y, '#c070ff'), good: false });
  if (ch.quest) out.push({ label: 'A QUEST', col: '#8fd0ff', icon: (u, x, y) => icon(u, 'quest', x, y, '#8fd0ff'), good: true });
  if (ch.hint) out.push({ label: 'A HINT', col: '#c8e0a0', icon: (u, x, y) => icon(u, 'scroll', x, y, '#c8e0a0'), good: true });
  if (ch.fight) out.push({ label: 'AN AMBUSH', col: '#e8786a', icon: (u, x, y) => icon(u, 'weapon', x, y, '#e8786a'), good: false });
  return out;
}
