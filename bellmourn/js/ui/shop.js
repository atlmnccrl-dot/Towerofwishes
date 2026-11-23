// ShrineScreen({ run, meta, prices?, limits?, healAmount? }, { heal, upgrade(id), reroll, tonic?, leave })
// and MerchantScreen({ run, stock }, { buy(item), leave }). The shrine is a small Haven: its fire painted
// on the left, your health, embers and tonics on the right, and four big rows (rest, temper a boon,
// reroll, buy a tonic), each with its price; TEMPER opens the boons you hold, each showing the rarity it
// would rise to. The merchant lays the stock out on a shelf of tiles; a tap shows the item, BUY buys.
// A handler that returns false refuses (the row shakes); anything else is taken as done.
import { Screen, hpOf, refused, PAL, ease, clamp, mix, iron, backdrop, button, lines, alpha, fit, bar, resOf, rarityOf, RARITY_ORDER, glow, header } from './kit.js';
import { icon, sigil, COST_ICON } from './icons.js';
import { drawVignette } from './vignettes.js';
import { boonDef } from './data.js';

const PRICES = { heal: 30, upgrade: 60, reroll: 25, tonic: 45 }; // PROPOSAL defaults until A passes data.prices
const LIMITS = { heal: 1, upgrade: 1, reroll: 1, tonic: 9 };

export class ShrineScreen extends Screen {
  onOpen(d) { this.used = {}; this.view = 'main'; this.viewT = 0; this.scroll = 0; this.healFx = 0; this.lastHp = (d.run || {}).hp; }
  get run() { return this.data.run || {}; }
  price(k) { return (this.data.prices || {})[k] ?? PRICES[k]; }
  left(k) { if (k === 'heal' && typeof this.handlers.used === 'function' && this.handlers.used()) return 0; return ((this.data.limits || {})[k] ?? LIMITS[k]) - (this.used[k] || 0); }
  upCost(b) { const f = this.handlers.upgradeCost; const c = typeof f === 'function' ? f(b.rarity) : null; return c ?? this.price('upgrade'); }
  options() {
    const r = this.run; const H = hpOf(r); const heal = this.data.healAmount ?? Math.round(H.max * (this.data.healFrac ?? 0.3));
    const up = (r.boons || []).some((b) => b.rarity !== 'legendary');
    const has = (k) => typeof this.handlers[k] === 'function' || (k === 'tonic' && typeof this.handlers.buy === 'function');
    // PROPOSAL labels
    return [
      { id: 'heal', label: 'REST BY THE FIRE', sub: 'HEAL ' + heal + ' HEALTH', icon: 'hp', col: PAL.hp, why: H.full ? 'YOU ARE WHOLE' : null },
      { id: 'upgrade', label: 'TEMPER A BOON', sub: 'ONE RARITY HIGHER', icon: 'star', col: PAL.gold, why: up ? null : 'NOTHING TO TEMPER' },
      { id: 'reroll', label: 'BUY A REROLL', sub: 'FOR A LATER OFFER', icon: 'reroll', col: '#8fd0ff' },
      { id: 'tonic', label: 'FILL A TONIC', sub: 'ONE MORE DRAUGHT', icon: 'tonic', col: PAL.tonic },
    ].map((o) => { const p = this.price(o.id); const spent = this.left(o.id) <= 0; return { ...o, price: p, ok: !o.why && !spent && has(o.id) && (r.embers ?? 0) >= p, spent, why: o.why || (spent ? 'DONE' : null) }; });
  }
  // in the Haven (data.inScene) the screen sits on the right and leaves the kneeling warden and the fire in
  // view on the left; elsewhere it paints its own shrine fire on the left
  lay(ui) { const B = this.box(ui); const W = B.R - B.L;
    if (this.data.inScene) { const px = Math.round(ui.w * 0.47); return { B: { ...B, L: px }, vig: null, rx: px, rw: B.R - px, free: px - 6 }; }
    const vw = Math.round(W * 0.36); return { B, vig: { x: B.L + 3, y: B.T + 21, w: vw, h: B.B - B.T - 24 }, rx: B.L + vw + 12, rw: B.R - (B.L + vw + 12) }; }
  layout(ui) { const L = this.lay(ui); return { freeX0: Math.round((ui.safe && ui.safe.l) || 0), freeX1: L.vig ? 0 : L.free }; }
  onTap(id) {
    if (id === 'leave') { this.sound('ui'); this.call('leave'); return; }
    if (id === 'backmain') { this.view = 'main'; this.viewT = 0; this.sound('ui'); return; }
    if (id.startsWith('opt:')) {
      const k = id.slice(4); const o = this.options().find((x) => x.id === k); const it = this.items.find((x) => x.id === id);
      if (!o || !o.ok) { this.deny(it); return; }
      if (k === 'upgrade') { this.view = 'upgrade'; this.viewT = 0; this.sound('ui'); return; }
      const r = k === 'tonic' && typeof this.handlers.tonic !== 'function' ? this.call('buy', { id: 'tonic', kind: 'tonic', price: o.price }) : this.call(k);
      if (refused(r)) { this.deny(it); return; }
      if (typeof r === 'string') this.pop(r, it.x + it.w / 2, it.y, o.col);
      this.used[k] = (this.used[k] || 0) + 1; this.flash(it.x, it.y, it.w, it.h, o.col, 0.35); this.burst(it.x + 14, it.y + it.h / 2, o.col, 14, 50);
      this.sound(k === 'heal' ? 'heal' : k === 'tonic' ? 'drink' : 'uiOk'); if (k === 'heal') this.healFx = 1;
      return;
    }
    if (id.startsWith('up:')) {
      const bid = id.slice(3); const it = this.items.find((x) => x.id === id); const b = (this.run.boons || []).find((x) => x.id === bid);
      if (!b || b.rarity === 'legendary') { this.deny(it); return; }
      const r = this.call('upgrade', bid); if (refused(r)) { this.deny(it); return; }
      this.used.upgrade = (this.used.upgrade || 0) + 1; const RA = rarityOf(nextRarity(b.rarity));
      this.flash(it.x, it.y, it.w, it.h, RA.col, 0.45); this.ring(it.x + 12, it.y + it.h / 2, RA.col, 28, 0.6); this.burst(it.x + 12, it.y + it.h / 2, RA.col, 20, 70); this.shake(2, 0.25); this.sound('upgrade');
      this.pop(RA.name + '!', it.x + it.w / 2, it.y, RA.col); this.upgraded = bid; this.after = 0.7;
    }
  }
  onBack() { if (this.view !== 'main') { this.view = 'main'; this.viewT = 0; } else this.call('leave'); }
  onUpdate(dt, inp) {
    this.viewT += dt; this.healFx = Math.max(0, this.healFx - dt * 0.8);
    if (this.after !== undefined) { this.after -= dt; if (this.after <= 0) { this.after = undefined; this.view = 'main'; this.viewT = 0; } }
    if (this.view === 'upgrade') { this.scroll = Math.max(0, this.scroll - (inp.dragY || 0) + (inp.wheel || 0) * 0.3); }
  }
  render(ui) {
    const t = this.t, r = this.run; const L = this.lay(ui); const { B } = L;
    if (this.data.inScene) { const x0 = L.rx - 30; for (let i = 0; i < 30; i++) alpha(ui, (i / 30) * 0.86, () => ui.rect(x0 + i, 0, 1, ui.h, '#040508')); ui.rect(L.rx, 0, ui.w - L.rx, ui.h, 'rgba(4,5,8,0.86)'); }
    else backdrop(ui, t, { veil: this.data.veil, tint: '#4a2410', cx: 0.25 });
    header(ui, B.L, B.T, 'SHRINE', 'A SMALL HAVEN', { maxW: B.R - B.L - 104 }); // PROPOSAL
    // the fire
    const V = L.vig; if (V) { iron(ui, V.x - 3, V.y - 3, V.w + 6, V.h + 6, { fill: '#000' }); drawVignette(ui, { scene: 'shrine', palette: 'gold' }, V.x, V.y, V.w, V.h, t); }
    // health, embers, tonics
    const x = L.rx, w = L.rw; const low = this.data.inScene; let y = low ? B.B - 17 : B.T + 1; const sx0 = low ? x + 96 - 4 : B.R; // in the Haven: the purse sits by LEAVE
    const H = hpOf(r); const hpk = H.k; icon(ui, 'hp', sx0 - 96, y + 1, PAL.hp); bar(ui, sx0 - 85, y + 2, 50, 5, hpk, PAL.hp); if (this.healFx > 0) alpha(ui, this.healFx, () => ui.rect(sx0 - 85, y + 2, Math.round(50 * hpk), 5, '#9affb0'));
    ui.text(String(H.hp), sx0 - 31, y + 1, { color: PAL.text }); y += 11;
    icon(ui, 'ember', sx0 - 96, y, PAL.ember); ui.text(String(r.embers ?? 0), sx0 - 85, y, { color: PAL.goldHi }); icon(ui, 'tonic', sx0 - 50, y, PAL.tonic); ui.text(String(r.tonics ?? '-'), sx0 - 39, y, { color: PAL.text });
    const top = B.T + 24;
    if (this.view === 'main') {
      const opts = this.options(); const bh = Math.min(26, Math.floor((B.B - top - 22 - 4 * 4) / 4)); let yy = top;
      opts.forEach((o, i) => {
        const k = ease.back(clamp((this.t - i * 0.06) / 0.3)); const bx = Math.round(x + (1 - k) * 40);
        const st = this.hit('opt:' + o.id, bx, yy, w, bh, { disabled: !o.ok });
        alpha(ui, k, () => button(ui, { x: bx, y: yy, w, h: bh }, o.label, st, { align: 'left', sub: o.why || o.sub, subCol: o.why ? '#a8786a' : PAL.dim, icon: (u, ix, iy) => icon(u, o.icon, ix, iy, o.ok ? o.col : PAL.faint), cost: o.spent ? null : (o.price ? { icon: COST_ICON.embers, n: o.price, ok: (r.embers ?? 0) >= o.price } : { n: 'FREE', col: PAL.ok }) }));
        yy += bh + 4;
      });
      const st = this.hit('leave', x + w - 80, B.B - 18, 80, 18); button(ui, { x: x + w - 80, y: B.B - 18, w: 80, h: 18 }, 'LEAVE', st, {}); // PROPOSAL
    } else this.drawUpgrade(ui, L, x, top, w);
  }
  drawUpgrade(ui, L, x, top, w) {
    const { B } = L; const boons = this.run.boons || []; const rh = 20, gap = 3; const viewH = B.B - top - 24;
    ui.text('TEMPER WHICH BOON?', x, top, { color: PAL.goldHi }); // PROPOSAL
    const maxScroll = Math.max(0, boons.length * (rh + gap) - viewH + 10); this.scroll = Math.min(this.scroll, maxScroll);
    const g = ui.g; g.save(); g.beginPath(); g.rect(x - 4, top + 10, w + 8, viewH); g.clip();
    boons.forEach((b, i) => {
      const y = top + 12 + i * (rh + gap) - Math.round(this.scroll); if (y < top - rh || y > B.B) return;
      const d = boonDef(b.id) || { name: b.id, res: 'ember' }; const R = resOf(d.res); const RA = rarityOf(b.rarity); const max = b.rarity === 'legendary'; const NR = rarityOf(nextRarity(b.rarity));
      const k = ease.out(clamp((this.viewT - i * 0.04) / 0.25));
      const st = this.hit('up:' + b.id, x + (1 - k) * 30, y, w, rh, { disabled: max || (this.run.embers ?? 0) < this.upCost(b) });
      alpha(ui, k, () => { button(ui, { x: x + (1 - k) * 30, y, w, h: rh }, '', st, {});
        const bx = Math.round(x + (1 - k) * 30) + (st.press ? 0 : (st.hover || st.focus ? 0 : 0)); const cy = y + (st.press ? 1 : (st.hover || st.focus ? -1 : 0));
        sigil(ui, d.res, bx + 6, cy + 6, { scale: 1 });
        ui.text(fit(ui, String(d.name).toUpperCase(), w - 70 - ui.measure(max ? 'MAX' : NR.name)), bx + 19, cy + 7, { color: max ? PAL.faint : PAL.text });
        const rx = bx + w - 7; if (max) ui.text('MAX', rx, cy + 7, { align: 'right', color: RA.col });
        else { const nw = ui.measure(NR.name); ui.text(NR.name, rx, cy + 7, { align: 'right', color: NR.col }); ui.text('>', rx - nw - 4, cy + 7, { align: 'right', color: PAL.dim }); ui.rect(rx - nw - 18, cy + 8, 5, 5, RA.col); ui.rect(rx - nw - 18, cy + 8, 5, 1, mix(RA.col, '#ffffff', 0.4));
          const c = this.upCost(b); if (c) { const cs = String(c); const cx2 = rx - nw - 24; ui.text(cs, cx2, cy + 7, { align: 'right', color: (this.run.embers ?? 0) >= c ? PAL.goldHi : PAL.bad }); icon(ui, 'ember', cx2 - ui.measure(cs) - 9, cy + 7, PAL.ember); } }
        if (this.upgraded === b.id) glow(ui, bx, cy, w, rh, NR.col, 1, 3); });
    });
    g.restore();
    const st = this.hit('backmain', x, B.B - 18, 70, 18); button(ui, { x, y: B.B - 18, w: 70, h: 18 }, 'BACK', st, {}); // PROPOSAL
  }
}
export const nextRarity = (r) => RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, RARITY_ORDER.indexOf(r || 'common') + 1)];

// ------------------------------------------------------------------ the merchant
const KIND_ICON = { relic: 'relic', weapon: 'weapon', tonic: 'tonic', heal: 'hp', boon: 'boon', reroll: 'reroll', curse: 'curse', upgrade: 'star' };
const KIND_COL = { relic: '#8fd0ff', weapon: '#c8d0dc', tonic: '#e05060', heal: '#e05060', boon: '#e8b860', upgrade: '#ffd070', reroll: '#8fd0ff', curse: '#c070ff' };
export class MerchantScreen extends Screen {
  onOpen(d) { this.sel = 0; this.selT = 0; const bought = ((d.run || {}).bought) || []; this.sold = new Set((d.stock || []).filter((s) => s.sold || (bought.includes(s.id) && s.kind !== 'tonic')).map((s) => s.id)); }
  get run() { return this.data.run || {}; }
  get stock() { return this.data.stock || []; }
  layout(ui) { const B = this.box(ui); const W = B.R - B.L; const many = this.stock.length > 6; const gw = Math.round(W * (many ? 0.66 : 0.6)); const cols = many ? 4 : 3; const rows = Math.ceil(Math.max(1, this.stock.length) / cols);
    const top = B.T + 22; const tw = Math.floor((gw - (cols - 1) * 5) / cols); const th = Math.min(Math.floor((B.B - top - (rows - 1) * 5) / rows), 80);
    return { B, cols, tw, th, top, gx: B.L, px: B.L + gw + 8, pw: W - gw - 8 }; }
  onTap(id) {
    if (id === 'leave') { this.sound('ui'); this.call('leave'); return; }
    if (id.startsWith('item:')) { const i = +id.slice(5); if (i !== this.sel) { this.sel = i; this.selT = 0; this.sound('ui'); } else if (!this.lastTouch) this.buy(); return; }
    if (id === 'buy') this.buy();
  }
  buy() {
    const it = this.stock[this.sel]; const rect = this.items.find((x) => x.id === 'buy'); if (!it) return;
    if (this.sold.has(it.id) || (this.run.embers ?? 0) < (it.price ?? 0)) { this.deny(rect); return; }
    const r = this.call('buy', it); if (refused(r)) { this.deny(rect); return; }
    if (it.kind !== 'tonic') { this.sold.add(it.id); it.sold = true; } const tile = this.items.find((x) => x.id === 'item:' + this.sel);
    if (tile) { this.flash(tile.x, tile.y, tile.w, tile.h, '#fff0c0', 0.4); this.burst(tile.x + tile.w / 2, tile.y + tile.h / 2, PAL.gold, 22, 70); }
    this.shake(1.5, 0.2); this.sound('equip'); this.sound('ember');
  }
  onUpdate(dt) { this.selT += dt; }
  onBack() { this.call('leave'); }
  render(ui) {
    const t = this.t, r = this.run; const L = this.layout(ui); const { B } = L; backdrop(ui, t, { veil: this.data.veil, tint: '#3a2a10', cx: 0.3 });
    header(ui, B.L, B.T, 'MERCHANT', 'A TRADER IN THE DARK', { maxW: B.R - B.L - 96 - ui.measure(String(this.run.embers ?? 0)) }); // PROPOSAL
    const s2 = this.hit('leave', B.R - 60, B.T, 60, 18); button(ui, { x: B.R - 60, y: B.T, w: 60, h: 18 }, 'LEAVE', s2, {}); // PROPOSAL
    icon(ui, 'ember', B.R - 66 - ui.measure(String(r.embers ?? 0)) - 10, B.T + 6, PAL.ember); ui.text(String(r.embers ?? 0), B.R - 66, B.T + 6, { align: 'right', color: PAL.goldHi });
    this.stock.forEach((it, i) => {
      const cx = L.gx + (i % L.cols) * (L.tw + 5), cy = L.top + Math.floor(i / L.cols) * (L.th + 5); const k = ease.back(clamp((this.t - i * 0.05) / 0.35)); const y = Math.round(cy + (1 - k) * 20);
      const sold = this.sold.has(it.id); const on = this.sel === i; const RA = rarityOf(it.rarity); const col = it.res ? resOf(it.res).col : (it.rarity ? RA.col : (KIND_COL[it.kind] || PAL.soft));
      const st = this.hit('item:' + i, cx, y, L.tw, L.th);
      alpha(ui, k * (sold ? 0.5 : 1), () => {
        if (on) glow(ui, cx, y, L.tw, L.th, col, 0.9 + 0.3 * Math.sin(t * 4), 4);
        iron(ui, cx, y - (st.hover && !on ? 1 : 0), L.tw, L.th, { fill: on ? '#191d26' : PAL.iron0, accent: on ? PAL.gold : (it.rarity && RA.n > 0 ? mix(RA.col, '#000', 0.4) : null), rivets: false });
        const nameL = lines(ui, String(it.name).toUpperCase(), L.tw - 6, 2);
        const ay = y + 5, ah = L.th - 19 - nameL.length * 9; for (let yy = 0; yy < ah; yy++) ui.rect(cx + 4, ay + yy, L.tw - 8, 1, mix(mix(col, '#000', 0.65), '#07080b', yy / ah));
        if (it.kind === 'boon' && it.res) sigil(ui, it.res, cx + L.tw / 2, ay + ah / 2, { scale: ah >= 26 ? 2 : 1, center: true });
        else icon(ui, KIND_ICON[it.kind] || 'star', cx + L.tw / 2, ay + ah / 2, col, { scale: ah >= 20 ? 2 : 1, center: true });
        nameL.forEach((l, j) => ui.text(l, cx + L.tw / 2, y + L.th - 12 - (nameL.length - j) * 9, { align: 'center', color: PAL.text, shadow: false }));
        if (sold) { ui.text('SOLD', cx + L.tw / 2, y + L.th - 11, { align: 'center', color: PAL.bad }); } // PROPOSAL
        else { const ok = (r.embers ?? 0) >= (it.price ?? 0); const pw = ui.measure(String(it.price)) + 9; icon(ui, 'ember', cx + L.tw / 2 - pw / 2, y + L.th - 11, PAL.ember); ui.text(String(it.price), cx + L.tw / 2 + pw / 2, y + L.th - 11, { align: 'right', color: ok ? PAL.goldHi : PAL.bad }); }
      });
    });
    // the chosen item
    const it = this.stock[this.sel]; const P = { x: L.px, y: L.top, w: L.pw, h: B.B - L.top - 22 };
    iron(ui, P.x, P.y, P.w, P.h, { fill: '#0e1016' });
    if (it) { const k = ease.out(clamp(this.selT / 0.2)); alpha(ui, k, () => {
      let y = P.y + 7; const RA = rarityOf(it.rarity);
      for (const l of lines(ui, String(it.name).toUpperCase(), P.w - 12, 2)) { ui.text(l, P.x + 6, y, { color: PAL.goldHi }); y += 9; }
      ui.text(String(it.kind || '').toUpperCase() + (it.rarity ? '  ' + RA.name : ''), P.x + 6, y, { color: it.rarity ? RA.col : PAL.dim, shadow: false }); y += 12;
      for (const l of lines(ui, it.desc || '', P.w - 12, Math.floor((P.y + P.h - y - 4) / 9))) { ui.text(l, P.x + 6, y, { color: PAL.soft, shadow: false }); y += 9; }
    }); }
    const sold = it && this.sold.has(it.id); const ok = it && !sold && (r.embers ?? 0) >= (it.price ?? 0);
    const st = this.hit('buy', P.x, B.B - 18, P.w, 18, { disabled: !ok });
    button(ui, { x: P.x, y: B.B - 18, w: P.w, h: 18 }, sold ? 'SOLD' : 'BUY', st, { primary: ok, cost: it && !sold ? { icon: COST_ICON.embers, n: it.price, ok } : null }); // PROPOSAL
  }
}
