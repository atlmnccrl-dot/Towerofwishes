// BoonScreen({ run, offers, title?, rerollCost?, rerolls? }, { pick(id), reroll() }): three tall cards
// dealt from a deck and turned over one by one. Each shows its Resonance, slot, name, effect, rarity and
// its place in the chain. Touch: a tap lifts a card, a second tap (or its TAKE strip) takes it. Mouse: hover
// lifts, a click takes. Keys and pad: left/right, confirm. Taking one flashes it, rings it in its colour,
// throws sparks and turns the others away; then pick(id). REROLL deals a new hand (reroll() may return
// the new offers, or A calls setOffers(offers) / open() again).
import { Screen, PAL, ease, clamp, resOf, rarityOf, mix, glow, brackets, backdrop, button, rays } from './kit.js';
import { icon, COST_ICON } from './icons.js';
import { drawBoonFace, drawCardBack, CardCanvas, blitCard } from './cards.js';
import { drawBoonStrip } from './hud.js';

const DEAL = 0.34, FLIP = 0.22, STAGGER = 0.13;

export class BoonScreen extends Screen {
  onOpen(d) { this.offers = (d.offers || []).slice(0, 3); this.phase = 'deal'; this.phaseT = 0; this.sel = -1; this.picked = -1; this.faces = [new CardCanvas(), new CardCanvas(), new CardCanvas()]; this.back = new CardCanvas(); this.dealt = []; this.revealed = []; this.focusId = null; }
  setOffers(offers) { this.offers = (offers || []).slice(0, 3); this.phase = 'deal'; this.phaseT = 0; this.sel = -1; this.dealt = []; this.revealed = []; }
  rerollState() {
    const d = this.data, run = d.run || {}; const free = d.rerolls ?? d.freeRerolls ?? run.rerolls ?? 0; const cost = d.rerollCost ?? null;
    const can = typeof this.handlers.reroll === 'function' && (free > 0 || (cost !== null && (run.embers ?? 0) >= cost));
    return { free, cost, can, show: typeof this.handlers.reroll === 'function' };
  }
  layout(ui) {
    const B = this.box(ui); const n = Math.max(1, this.offers.length); const top = B.T + 22; const bottom = B.B;
    const availW = B.R - B.L; let gap = Math.max(6, Math.round(availW * 0.03)); let cw = Math.min(132, Math.floor((availW - gap * (n - 1)) / n));
    const ch = Math.min(Math.round(cw * 1.75), bottom - top - 4);
    gap = Math.min(gap + 10, Math.floor((availW - cw * n) / Math.max(1, n - 1))); const total = cw * n + gap * (n - 1); const x0 = Math.round(B.L + (availW - total) / 2);
    return { B, cw, ch, gap, x0, top: top + Math.max(0, Math.floor((bottom - top - ch) / 2)) };
  }
  onDir(dir) { if (this.phase !== 'idle' || !dir[0]) return false; const n = this.offers.length; this.sel = this.sel < 0 ? (dir[0] > 0 ? 0 : n - 1) : (this.sel + dir[0] + n) % n; this.focusId = 'card' + this.sel; this.keyMode = true; this.sound('ui'); return true; }
  onTap(id, it, how) {
    if (id === 'reroll') { this.doReroll(); return; }
    if (this.phase !== 'idle') return;
    if (id.startsWith('take')) { this.take(+id.slice(4)); return; }
    if (id.startsWith('card')) { const i = +id.slice(4); if (how.touch && this.sel !== i) { this.sel = i; this.sound('ui'); this.liftT = 0; return; } this.take(i); }
  }
  onTapNothing() { if (this.phase === 'idle' && this.lastTouch) this.sel = -1; }
  take(i) {
    const o = this.offers[i]; if (!o) return; this.picked = i; this.sel = i; this.phase = 'pick'; this.phaseT = 0;
    const L = this.layout(this.ui); const cx = L.x0 + i * (L.cw + L.gap) + L.cw / 2, cy = L.top + L.ch / 2; const R = resOf((o.def || {}).res); const RA = rarityOf(o.rarity);
    this.flash(L.x0 + i * (L.cw + L.gap), L.top - 8, L.cw, L.ch, '#ffffff', 0.35); this.ring(cx, cy, R.col, L.cw * 0.9, 0.6); this.ring(cx, cy, RA.col, L.cw * 0.6, 0.45);
    this.burst(cx, cy, R.col, 26, 90); this.burst(cx, L.top, RA.col, 10, 50); this.shake(2, 0.25);
    this.sound('upgrade'); if (RA.n >= 2) this.sound('perfect');
  }
  doReroll() {
    const rs = this.rerollState(); if (!rs.can || this.phase !== 'idle') { this.deny(this.items.find((x) => x.id === 'reroll')); return; }
    this.phase = 'out'; this.phaseT = 0; this.sound('dash');
  }
  onUpdate(dt, inp) {
    this.phaseT += dt;
    if (this.phase === 'deal') {
      const n = this.offers.length;
      for (let i = 0; i < n; i++) { const t0 = 0.08 + i * STAGGER; if (!this.dealt[i] && this.phaseT >= t0) { this.dealt[i] = true; this.sound('dash', { vol: 0.5 }); } if (!this.revealed[i] && this.phaseT >= t0 + DEAL) { this.revealed[i] = true; const RA = rarityOf(this.offers[i].rarity); this.sound(RA.n >= 3 ? 'perfect' : 'ui'); } }
      if (this.phaseT >= 0.08 + (n - 1) * STAGGER + DEAL + FLIP) { this.phase = 'idle'; this.phaseT = 0; }
    } else if (this.phase === 'pick' && this.phaseT >= 0.62 && !this.sent) { this.sent = true; const o = this.offers[this.picked]; this.call('pick', o.id); }
    else if (this.phase === 'out' && this.phaseT >= 0.42) {
      const r = this.call('reroll'); if (Array.isArray(r)) this.setOffers(r); else if (this.phase === 'out') this.setOffers(this.data.offers || this.offers);
    }
    // mouse hover lifts a card
    if (this.phase === 'idle' && this.pointer && !this.pointer.touch && this.hoverId && this.hoverId.startsWith('card')) { const i = +this.hoverId.slice(4); if (i !== this.sel) { this.sel = i; } }
    this.liftT = (this.liftT || 0) + dt;
  }
  render(ui) {
    const t = this.t; backdrop(ui, t, { veil: this.data.veil, tint: this.sel >= 0 && this.offers[this.sel] ? resOf((this.offers[this.sel].def || {}).res).lo : '#2a1418', cy: 0.6 });
    const L = this.layout(ui); const { B } = L; const run = this.data.run || {};
    // header: title, what you hold, embers and the reroll
    const title = this.data.title || 'CHOOSE A BOON'; // PROPOSAL
    ui.text(title, B.L, B.T + 1, { color: PAL.text, scale: 2 }); ui.rect(B.L, B.T + 16, Math.min(60, ui.measure(title, 2)), 1, PAL.blood);
    const sx = B.L + ui.measure(title, 2) + 8; if ((run.boons || []).length) drawBoonStrip(ui, run, sx, B.T + 4, { t });
    const rs = this.rerollState(); let rx = B.R;
    if (rs.show) { const rh = 18; const costTxt = rs.free > 0 ? (rs.free > 1 ? 'X' + rs.free : 'FREE') : String(rs.cost ?? '0'); const stripW = (run.boons || []).length * 4 + 16; const full = ui.measure('REROLL') + ui.measure(costTxt) + 46; const compact = B.R - full - 50 - ui.measure(String(run.embers ?? 0)) < sx + stripW; const rw = compact ? ui.measure(costTxt) + 40 : full; const st = this.hit('reroll', rx - rw, B.T, rw, rh, { disabled: !rs.can });
      button(ui, { x: rx - rw, y: B.T, w: rw, h: rh }, compact ? '' : 'REROLL', st, { icon: (u, x, y) => icon(u, 'reroll', x, y, rs.can ? PAL.text : PAL.faint), cost: rs.free > 0 ? { n: rs.free > 1 ? 'X' + rs.free : 'FREE', col: PAL.ok } : (rs.cost !== null ? { icon: COST_ICON.embers, n: rs.cost, ok: (run.embers ?? 0) >= rs.cost } : { n: '0', ok: false }) }); rx -= rw + 6; }
    icon(ui, 'ember', rx - ui.measure(String(run.embers ?? 0)) - 10, B.T + 6, PAL.ember); ui.text(String(run.embers ?? 0), rx, B.T + 6, { align: 'right', color: PAL.goldHi });
    // the cards
    const n = this.offers.length; const deckX = (B.L + B.R) / 2, deckY = ui.h + L.ch * 0.6;
    for (let i = 0; i < n; i++) {
      const o = this.offers[i]; const def = o.def || {}; const R = resOf(def.res); const RA = rarityOf(o.rarity);
      const hx = L.x0 + i * (L.cw + L.gap) + L.cw / 2; let cx = hx, cy = L.top + L.ch / 2; let sxk = 1, face = true, a = 1, sc = 1;
      const t0 = 0.08 + i * STAGGER;
      if (this.phase === 'deal') {
        const k = clamp((this.phaseT - t0) / DEAL); if (k <= 0) continue; const e = ease.out(k);
        cx = deckX + (hx - deckX) * e; cy = deckY + (cy - deckY) * e - Math.sin(e * Math.PI) * 18;
        const f = clamp((this.phaseT - t0 - DEAL) / FLIP); face = f >= 0.5; sxk = Math.abs(Math.cos(f * Math.PI)); if (f <= 0) sxk = 1;
      } else if (this.phase === 'out') {
        const k = clamp(this.phaseT / 0.4); const f = clamp(k * 2); face = f < 0.5; sxk = Math.abs(Math.cos(f * Math.PI)); cy -= ease.in(clamp(k * 1.4 - 0.4)) * (L.ch + 40); a = 1 - clamp(k * 1.5 - 0.6);
      } else if (this.phase === 'pick') {
        const k = clamp(this.phaseT / 0.8);
        if (i === this.picked) { sc = 1 + 0.06 * Math.sin(clamp(k * 2) * Math.PI); cy -= 8 + ease.out(clamp(k * 2)) * 4; }
        else { const f = clamp(k * 3); face = f < 0.5; sxk = Math.abs(Math.cos(f * Math.PI)); cy += ease.in(clamp(k * 1.5 - 0.3)) * (L.ch + 30); a = 1 - clamp(k * 1.6 - 0.5); }
      }
      const lifted = this.phase === 'idle' && this.sel === i; if (lifted) cy -= 6;
      if (this.phase === 'idle' && this.sel >= 0 && !lifted) a *= 0.82;
      // rarity glow under the card (breathing; legendary also gets slow rays)
      if (face && a > 0.5 && sxk > 0.6) {
        const gx = Math.round(cx - L.cw * sxk / 2), gy = Math.round(cy - L.ch / 2);
        if (RA.n >= 3 && this.phase !== 'deal') rays(ui, cx, cy, L.cw * 1.1, RA.col, t, 14, 0.12 + (lifted ? 0.08 : 0));
        const br = (RA.n > 0 ? 0.5 + RA.n * 0.25 : 0.25) * (0.75 + 0.25 * Math.sin(t * 3 + i)) * (lifted ? 1.6 : 1);
        glow(ui, gx, gy, Math.round(L.cw * sxk), L.ch, RA.n > 0 ? RA.col : R.col, br, RA.n >= 2 ? 6 : 4);
      }
      const takeH = 15;
      const cvs = face ? this.faces[i].get(ui, o.id + o.rarity + L.cw + 'x' + L.ch + (run.boons || []).length, L.cw, L.ch, () => drawBoonFace(ui, o, L.cw, L.ch, { run, footer: takeH }))
        : this.back.get(ui, 'b' + L.cw + 'x' + L.ch, L.cw, L.ch, () => drawCardBack(ui, L.cw, L.ch));
      if (sxk > 0.9) sxk = 1; // a card nearly face-on is drawn face-on: no dropped pixel columns in the text
      blitCard(ui, cvs, cx, cy, sxk, sc, a);
      if (this.phase === 'idle' || this.phase === 'pick') {
        const x = Math.round(cx - L.cw / 2), y = Math.round(cy - L.ch / 2);
        this.hit('card' + i, x, y, L.cw, L.ch, { tick: false });
        // the TAKE strip at the foot of the card: lit on the lifted card
        const ty = y + L.ch - takeH - 3; const on = lifted || (this.phase === 'pick' && i === this.picked);
        if (on) { const st = this.hit('take' + i, x + 3, ty, L.cw - 6, takeH, { nav: false });
          const pulse = 0.5 + 0.5 * Math.sin(t * 6);
          ui.rect(x + 4, ty, L.cw - 8, takeH, st.press ? '#5a3a14' : mix('#3a2410', '#5a3a18', pulse)); ui.rect(x + 4, ty, L.cw - 8, 1, PAL.gold); ui.rect(x + 4, ty + takeH - 1, L.cw - 8, 1, PAL.goldLo);
          ui.text(this.lastTouch ? 'TAP TO TAKE' : 'TAKE', cx, ty + 4, { align: 'center', color: PAL.goldHi }); // PROPOSAL
          brackets(ui, x - 3, y - 3, L.cw + 6, L.ch + 6, PAL.gold, 6, Math.sin(t * 5) > 0 ? 1 : 0);
        } else if (face && sxk > 0.9) { ui.rect(x + 4, ty, L.cw - 8, takeH, 'rgba(6,7,10,0.5)'); ui.text(RA.name, cx, ty + 4, { align: 'center', color: mix(RA.col, '#000000', 0.15), shadow: false }); }
      }
    }
  }
}
