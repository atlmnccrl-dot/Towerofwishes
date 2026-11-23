// Cards: the boon card face (Resonance art with its sigil, slot and tier, name, tags, effect, and the
// chain preview: where it sits in its Resonance chain, what it unlocks next, duo hints), the card back,
// and flip/slide drawing from an offscreen canvas so a card can turn over and fly without redrawing.
import { PAL, resOf, rarityOf, mix, lines, iron, canvas, into, diamond, ROMAN, alpha, hash } from './kit.js';
import { icon, sigil, sigilName, iconSize, SLOT } from './icons.js';
import { boonDef, boonList, DATA } from './data.js';

// a boon's effect, as { desc, stat }: B's boonText(id, rarity) when it is there, else the def's desc and
// stat with the rarity's value filled in ({v} the value, {p} as a percentage)
export function boonParts(def, rarity) {
  if (!def) return { desc: '', stat: '' };
  if (DATA.BOONTEXT && def.id) { try { const r = DATA.BOONTEXT(def.id, rarity); if (r && typeof r === 'object') return { desc: String(r.desc || '').toUpperCase(), stat: String(r.stat || '').toUpperCase() }; if (typeof r === 'string') return { desc: r.toUpperCase(), stat: '' }; } catch (e) { /* fall back */ } }
  const v = def.values ? (def.values[rarity] ?? def.values.common) : undefined;
  const fill = (t) => String(t || '').replace(/\{p\}/g, v === undefined ? '' : Math.round(v * 100) + '%').replace(/\{v(alue)?\}|#/g, v === undefined ? '' : String(v)).toUpperCase();
  return { desc: fill(def.desc), stat: fill(def.stat) };
}
export function boonText(def, rarity) { const p = boonParts(def, rarity); return p.stat ? p.desc + ' ' + p.stat + '.' : p.desc; }
// duo boons this boon's Resonance could open with the Resonances the run already holds
export function duoHints(run, res) {
  const held = new Set(); for (const b of (run && run.boons) || []) { const d = boonDef(b.id); if (d) { held.add(d.res); for (const r of d.duo || []) held.add(r); } }
  const out = []; const owned = new Set(((run && run.boons) || []).map((b) => b.id));
  for (const d of boonList()) { if (d.kind !== 'duo' || !d.duo || owned.has(d.id) || !d.duo.includes(res)) continue; const other = d.duo.find((r) => r !== res) || res; out.push({ name: String(d.name).toUpperCase(), res: other, ready: held.has(other) }); }
  out.sort((a, b) => (b.ready ? 1 : 0) - (a.ready ? 1 : 0)); return out;
}

// The face of a boon card, drawn at (0, 0) into ui.g: w x h. offer: { id, rarity, def, chain }.
export function drawBoonFace(ui, offer, w, h, o = {}) {
  const def = offer.def || boonDef(offer.id) || { name: offer.id, res: 'ember', slot: 'passive', tier: 1, kind: 'boon', desc: '' };
  const R = resOf(def.res); const RA = rarityOf(offer.rarity); const kind = def.kind || 'boon';
  const duoR = kind === 'duo' && def.duo ? resOf(def.duo.find((r) => r !== def.res) || def.duo[1]) : null;
  iron(ui, 0, 0, w, h, { fill: mix('#0c0e13', R.col, 0.05), accent: RA.n > 0 ? mix(RA.col, '#000000', 0.25) : null });
  // ---- art
  const ax = 4, ay = 4, aw = w - 8, ah = Math.round(Math.min(46, h * (h < 160 ? 0.21 : 0.26)));
  for (let y = 0; y < ah; y++) { const k = y / ah; ui.rect(ax, ay + y, aw, 1, mix(mix(R.col, '#000000', 0.55), '#07080b', k * 0.85)); }
  if (duoR) { const g = ui.g; g.save(); g.beginPath(); g.moveTo(ax + aw * 0.62, ay); g.lineTo(ax + aw, ay); g.lineTo(ax + aw, ay + ah); g.lineTo(ax + aw * 0.38, ay + ah); g.closePath(); g.clip(); for (let y = 0; y < ah; y++) ui.rect(ax, ay + y, aw, 1, mix(mix(duoR.col, '#000000', 0.55), '#07080b', y / ah * 0.85)); g.restore(); }
  // rings and motes behind the sigil
  const cx = ax + Math.floor(aw / 2), cy = ay + Math.floor(ah / 2);
  for (const rr of [ah * 0.62, ah * 0.46]) for (let a = 0; a < 90; a++) { const t = a / 90 * Math.PI * 2; if (a % 3) ui.rect(cx + Math.round(Math.cos(t) * rr), cy + Math.round(Math.sin(t) * rr), 1, 1, mix(R.col, '#000000', 0.62)); }
  for (let i = 0; i < 14; i++) ui.rect(ax + hash(i * 7 + def.name.length) * aw, ay + hash(i * 3 + 1) * ah, 1, 1, mix(R.col, '#ffffff', 0.2 + hash(i) * 0.5));
  if (kind === 'crown') { for (let k = 0; k < 10; k++) { const t = k / 10 * Math.PI * 2; for (let r = ah * 0.3; r < ah * 0.75; r += 1.3) if (hash(k * 50 + r) < 0.7) ui.rect(cx + Math.round(Math.cos(t) * r), cy + Math.round(Math.sin(t) * r), 1, 1, mix(PAL.gold, '#000000', 0.25)); } }
  const isz = iconSize(sigilName(def.res)).h; const sc = Math.max(2, Math.min(4, Math.floor((ah * (duoR ? 0.5 : 0.66)) / isz)));
  if (duoR) { sigil(ui, def.res, cx - 4 - Math.ceil(isz * sc / 2), cy, { scale: sc, center: true }); sigil(ui, duoR.id, cx + 4 + Math.ceil(isz * sc / 2), cy, { scale: sc, center: true }); ui.text('+', cx - 2, cy - 3, { color: PAL.text }); }
  else sigil(ui, def.res, cx, cy + (kind === 'crown' ? 3 : 0), { scale: sc, center: true });
  if (kind === 'crown') icon(ui, 'crown', cx, ay + 6, PAL.gold, { center: true, scale: 1 });
  // slot (top left, with its name when it fits), tier (top right), DUO / CROWN on the art's foot
  const slotName = (SLOT[def.slot] || 'PASSIVE'); const sw = ui.measure(slotName) + 15; const showName = sw < aw * 0.62;
  ui.rect(ax + 1, ay + 1, showName ? sw : 11, 11, 'rgba(4,5,8,0.85)'); icon(ui, def.slot in SLOT ? def.slot : 'passive', ax + 3, ay + 3, PAL.text, { outline: false });
  if (showName) ui.text(slotName, ax + 12, ay + 3, { color: PAL.soft, shadow: false });
  const tier = ROMAN[def.tier || 1] || 'I'; const tw = ui.measure(tier) + 4; ui.rect(ax + aw - tw - 1, ay + 1, tw, 9, 'rgba(4,5,8,0.85)'); ui.text(tier, ax + aw - 3, ay + 2, { align: 'right', color: R.hi, shadow: false });
  if (kind === 'duo' || kind === 'crown') { const kl = kind === 'duo' ? 'DUO' : 'CROWN'; const kc = kind === 'crown' ? PAL.gold : (duoR ? duoR.col : R.col); const kw = ui.measure(kl) + 6; ui.rect(cx - kw / 2, ay + ah - 9, kw, 9, 'rgba(4,5,8,0.9)'); ui.text(kl, cx, ay + ah - 8, { align: 'center', color: kc, shadow: false }); }
  ui.rect(ax, ay + ah, aw, 1, R.col); ui.rect(ax, ay + ah + 1, aw, 1, mix(R.col, '#000000', 0.6));
  // ---- name
  let y = ay + ah + 5; const tw2 = w - 10;
  const nameL = lines(ui, def.name, tw2, 2);
  for (const l of nameL) { ui.text(l, w / 2, y, { align: 'center', color: '#ffffff', shadow: '#000' }); y += 9; }
  ui.rect(w / 2 - 6, y, 12, 1, mix(R.col, '#000000', 0.3)); y += 4;
  // ---- effect
  const chainH = o.noChain ? 0 : 24; const avail = h - y - chainH - 6 - (o.footer || 0);
  const parts = boonParts(def, offer.rarity); const statL = parts.stat ? lines(ui, parts.stat, tw2, 2) : [];
  const need = lines(ui, parts.desc, tw2).length + statL.length; const lh = need * 9 <= avail ? 9 : 8;
  const dl = lines(ui, parts.desc, tw2, Math.max(1, Math.floor(avail / lh) - statL.length));
  for (const l of dl) { ui.text(l, w / 2, y, { align: 'center', color: PAL.soft, shadow: false }); y += lh; }
  for (const l of statL) { ui.text(l, w / 2, y, { align: 'center', color: R.hi, shadow: false }); y += lh; }
  // ---- chain preview
  if (!o.noChain) drawChain(ui, offer, def, R, 5, h - chainH - 4 - (o.footer || 0), w - 10, o.run);
}

function drawChain(ui, offer, def, R, x, y, w, run) {
  const ch = offer.chain || { res: def.res, tier: def.tier || 1, held: 0, nextUnlocks: [] };
  for (let i = 0; i < w; i += 2) ui.rect(x + i, y, 1, 1, PAL.faint);
  y += 3;
  // three tier nodes: I II III, the tiers below filled dim, this one bright, the rest hollow; the crown beyond
  const tier = ch.tier || def.tier || 1; const nx = x + 3, gap = 11;
  ui.rect(nx, y + 3, gap * 3, 1, mix(R.col, '#000000', 0.5));
  for (let t = 1; t <= 3; t++) { const px = nx + (t - 1) * gap; const on = t === tier, below = t < tier;
    diamond(ui, px, y + 3, on ? 3 : 2, on ? R.col : (below ? mix(R.col, '#000000', 0.35) : '#0c0e13'), on ? '#ffffff' : (below ? null : mix(R.col, '#000000', 0.3))); }
  icon(ui, 'crown', nx + gap * 3 - 2, y, def.kind === 'crown' ? PAL.gold : PAL.faint, { outline: false });
  const held = ch.held ?? 0; const hl = 'HELD ' + held; ui.text(hl, x + w, y, { align: 'right', color: held > 0 ? R.hi : PAL.dim, shadow: false });
  y += 9;
  // what it opens next, or the duo it could make
  const next = (ch.nextUnlocks || []).map((n) => String(n).toUpperCase());
  const duo = duoHints(run, def.res).filter((d) => !next.includes(d.name));
  if (next.length) { ui.text('NEXT', x, y, { color: PAL.dim, shadow: false }); const more = next.length > 1 ? ' +' + (next.length - 1) : ''; ui.text(fitW(ui, next[0], w - 28 - ui.measure(more)) + more, x + 28, y, { color: R.hi, shadow: false }); }
  else if (duo.length) { const d = duo[0]; const DR = resOf(d.res); sigilMini(ui, DR, x, y); ui.text(fitW(ui, d.name, w - 10), x + 10, y, { color: d.ready ? DR.col : mix(DR.col, '#000000', 0.3), shadow: false }); }
  else ui.text(def.kind === 'crown' ? 'THE CHAIN IS COMPLETE' : 'THE CHAIN CONTINUES', x, y, { color: PAL.faint, shadow: false }); // PROPOSAL
}
const fitW = (ui, s, w) => { if (ui.measure(s) <= w) return s; while (s.length > 1 && ui.measure(s + '.') > w) s = s.slice(0, -1); return s + '.'; };
function sigilMini(ui, R, x, y) { ui.rect(x, y, 7, 7, mix(R.col, '#000000', 0.6)); ui.rect(x + 2, y + 2, 3, 3, R.col); ui.rect(x + 3, y + 1, 1, 5, R.col); ui.rect(x + 1, y + 3, 5, 1, R.col); }

// The back of a card: dark iron, a crimson field, a bell between two rules and a rope border.
export function drawCardBack(ui, w, h) {
  iron(ui, 0, 0, w, h, { fill: '#1a0a0c' });
  const g = ui.g; for (let y = 6; y < h - 6; y++) for (let x = 6; x < w - 6; x++) if (((x + y) % 6 === 0) || ((x - y + 600) % 6 === 0)) g.fillStyle = '#2a1014', g.fillRect(x, y, 1, 1);
  ui.outline(6, 6, w - 12, h - 12, '#5a1a1e'); ui.outline(8, 8, w - 16, h - 16, '#3a1014');
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  ui.rect(cx - 14, cy - 18, 28, 36, '#12060a'); ui.outline(cx - 14, cy - 18, 28, 36, '#6a2a20');
  icon(ui, 'bell', cx, cy - 2, PAL.gold, { center: true, scale: 2 });
  ui.rect(cx - 22, cy + 12, 44, 1, PAL.goldLo); ui.rect(cx - 22, cy - 16, 44, 1, PAL.goldLo);
}

// a card cache: re-render a face only when what it shows changes
export class CardCanvas {
  constructor() { this.key = ''; this.cv = null; }
  get(ui, key, w, h, paint) {
    if (!this.cv || this.key !== key || this.cv.c.width !== w || this.cv.c.height !== h) { this.cv = canvas(w, h); this.key = key; into(ui, this.cv.g, paint); }
    return this.cv.c;
  }
}
// draw a card canvas centred on (cx, cy) with a horizontal squash sx (flip) and a scale
export function blitCard(ui, c, cx, cy, sx = 1, sc = 1, a = 1) {
  const w = Math.max(1, Math.round(c.width * Math.abs(sx) * sc)), h = Math.round(c.height * sc);
  alpha(ui, a, () => ui.g.drawImage(c, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h));
}
