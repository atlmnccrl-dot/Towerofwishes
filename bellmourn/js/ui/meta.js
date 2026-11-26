// The meta screens on the title: TowerScreen({ meta }, { buy(id), back }) (the Bell Tower: account-wide
// upgrades bought with Bell Shards; the tower lights a floor for each one), ChallengesScreen({ meta },
// { back }) (every challenge with its progress bar and reward, filtered by what it rewards), and
// TalentScreen({ meta, hero, slots? }, { pick(id), start, back? }) (choose up to two of the warden's talents
// before a run; the ones above their mastery stay locked).
import { Screen, refused, PAL, ease, clamp, mix, iron, backdrop, button, lines, alpha, fit, bar, glow, header, resOf, line, brackets } from './kit.js';
import { icon, sigil } from './icons.js';
import { portrait, heroColour } from './portraits.js';
import { HEROES, ECHOES } from '../game/heroes.js';
import { towerList, towerCost, towerMax, challengeList, challengeProgress, rewardOf, talentsOf, boonDef, masteryInfo } from './data.js';

// a scrolled, clipped list: rows of height rh; returns the visible rows with their y
function scrolled(scr, ui, x, y, w, h, n, rh, inp) {
  const max = Math.max(0, n * rh - h); scr.scroll = clamp(scr.scroll || 0, 0, max);
  return { max, clip: (fn) => { const g = ui.g; g.save(); g.beginPath(); g.rect(x - 6, y, w + 12, h); g.clip(); try { fn(); } finally { g.restore(); } } };
}
function scrollBar(ui, x, y, h, scroll, max, total) { if (max <= 0) return; ui.rect(x, y, 2, h, PAL.iron1); const th = Math.max(8, h * h / total); ui.rect(x, y + (h - th) * (scroll / max), 2, th, PAL.iron4); }
function backBtn(scr, ui, B) { const st = scr.hit('back', B.R - 60, B.T, 60, 18); button(ui, { x: B.R - 60, y: B.T, w: 60, h: 18 }, 'BACK', st, {}); } // PROPOSAL

// ------------------------------------------------------------------ the Bell Tower
// A chained tree in five branches (run.js TOWER, BRANCHES), drawn as five columns hanging from the bell: each node
// a badge with its level pips, each chain a line lit gold once its parent is built far enough. The chosen node's
// name, effect, level and price sit in the panel below with RAISE. Mewgenics-like: the whole tree at one glance.
const NODE_ICON = { vigor: 'heart', flask: 'tonic', heart: 'hp', draught: 'tonic', mend: 'bell', shrine: 'shrine', edge: 'weapon', crit: 'eye', steel: 'weapon', focus: 'skill', ult: 'ult',
  swift: 'dash', hide: 'relic', wind: 'dash', breath: 'heart', bulwark: 'crown', purse: 'ember', reroll: 'reroll', greed: 'ember', luck: 'star', haggle: 'merchant', shardk: 'shard',
  blessing: 'boon', choice: 'boon', mercy: 'bell', anoint: 'crown', vow: 'tonic' };
const BRANCH_COL = { vigour: '#e05060', arms: '#e8b860', grace: '#9adcf0', fortune: '#ff9a40', faith: '#f0e8c8' };
export class TowerScreen extends Screen {
  onOpen() { this.sel = (towerTree().find((u) => !u.req) || {}).id || null; this.selT = 0; this.bought = {}; this.focusId = this.sel ? 'up:' + this.sel : null; }
  get meta() { return this.data.meta || {}; }
  level(u) { return Math.max(0, Math.min(u.max || 1, ((this.meta.tower || {})[u.id] || 0))); }
  open_(u) { if (!u.req) return true; const p = towerTree().find((x) => x.id === u.req[0]); return !!p && this.level(p) >= u.req[1]; }
  onTap(id) {
    if (id === 'back') { this.sound('ui'); this.call('back'); return; }
    if (id.startsWith('up:')) { const k = id.slice(3); if (k !== this.sel) { this.sel = k; this.selT = 0; this.sound('ui'); } else if (!this.lastTouch) this.buy(); return; }
    if (id === 'buy') this.buy();
  }
  onFocus(id) { if (id.startsWith('up:')) { this.sel = id.slice(3); this.selT = 0; } }
  buy() {
    const u = towerTree().find((x) => x.id === this.sel); const rect = this.items.find((x) => x.id === 'buy'); if (!u) return;
    const lv = this.level(u), c = u.cost[lv]; if (lv >= u.max || c === undefined || !this.open_(u) || (this.meta.shards ?? 0) < c) { this.deny(rect); return; }
    const r = this.call('buy', u.id); if (refused(r) || (typeof r === 'string' && r.startsWith('NEEDS'))) { this.deny(rect); return; }
    this.bought[u.id] = this.t; const node = this.items.find((x) => x.id === 'up:' + u.id);
    if (node) { this.flash(node.x, node.y, node.w, node.h, PAL.shard, 0.4); this.burst(node.x + node.w / 2, node.y + node.h / 2, BRANCH_COL[u.branch] || PAL.shard, 20, 60); }
    if (this.bellAt) this.ring(this.bellAt.x, this.bellAt.y, PAL.gold, 26, 0.7); this.sound('bigBell', { vol: 0.5 }); this.sound('upgrade'); this.shake(2, 0.3);
  }
  onBack() { this.call('back'); }
  onUpdate(dt) { this.selT += dt; }
  render(ui) {
    const t = this.t, M = this.meta; const B = this.box(ui); const U = towerTree(); const BR = towerBranches();
    backdrop(ui, t, { veil: this.data.veil, tint: '#10283a', moteCol: '#9adcf0' });
    let built = 0, all = 0; for (const u of U) { built += this.level(u); all += u.max; }
    header(ui, B.L, B.T, 'THE BELL TOWER', built + ' OF ' + all + ' RAISED', { maxW: B.R - B.L - 130 }); backBtn(this, ui, B); // PROPOSAL
    const sw = ui.measure(String(M.shards ?? 0)); icon(ui, 'shard', B.R - 70 - sw - 10, B.T + 5, PAL.shard); ui.text(String(M.shards ?? 0), B.R - 68, B.T + 5, { align: 'right', color: '#c8f4ff' });
    // the bell over the tree, brighter the more is raised
    const k = all ? built / all : 0; const bx = Math.round((B.L + B.R) / 2), by = B.T + 27;
    for (let r = 4; r >= 1; r--) alpha(ui, 0.05 + 0.05 * k, () => ui.circle(bx, by, 5 + r * 4, PAL.gold));
    icon(ui, 'bell', bx, by, k > 0 ? mix(PAL.goldLo, PAL.goldHi, k) : PAL.iron3, { center: true }); this.bellAt = { x: bx, y: by };
    const panelH = 34; const top = B.T + 38; const bottom = B.B - panelH - 4; const rows = Math.max(1, ...U.map((u) => u.row + 1));
    const colW = (B.R - B.L) / BR.length; const rowH = Math.max(18, Math.min(26, Math.floor((bottom - top - 10) / rows))); const S = 14;
    const pos = {}; for (const u of U) { const ci = BR.findIndex((b) => b.id === u.branch); const cx = B.L + colW * (ci + 0.5); pos[u.id] = { x: Math.round(cx + (u.col || 0) * Math.min(18, colW * 0.24) - S / 2), y: Math.round(top + 10 + u.row * rowH) }; }
    BR.forEach((br, ci) => { // branch titles and the rope down from the bell
      const cx = Math.round(B.L + colW * (ci + 0.5)); const col = BRANCH_COL[br.id] || PAL.text;
      line(ui, bx, by + 6, cx, top - 1, PAL.iron1); ui.text(fit(ui, br.name, colW - 4), cx, top, { align: 'center', color: col, shadow: false });
    });
    // the chains: parent to child, lit when open
    for (const u of U) { if (!u.req) continue; const p = pos[u.req[0]], q = pos[u.id]; if (!p || !q) continue; const lit = this.open_(u); const col = lit ? mix(BRANCH_COL[u.branch] || PAL.gold, '#000000', 0.25) : PAL.iron1;
      const x0 = p.x + S / 2, y0 = p.y + S + 3, x1 = q.x + S / 2, y1 = q.y - 1; const ym = Math.round((y0 + y1) / 2);
      line(ui, x0, y0, x0, ym, col, lit ? 0 : 2, lit ? 0 : 2); line(ui, x0, ym, x1, ym, col, lit ? 0 : 2, lit ? 0 : 2); line(ui, x1, ym, x1, y1, col, lit ? 0 : 2, lit ? 0 : 2); }
    // the nodes
    U.forEach((u, i) => {
      const P = pos[u.id]; const lv = this.level(u), full = lv >= u.max, open = this.open_(u); const c = u.cost[lv]; const afford = !full && open && (M.shards ?? 0) >= c;
      const on = this.sel === u.id; const st = this.hit('up:' + u.id, P.x - 2, P.y - 2, S + 4, S + 6); const bc = BRANCH_COL[u.branch] || PAL.gold;
      const ka = ease.out(clamp((t - i * 0.02) / 0.3));
      alpha(ui, ka, () => {
        const fill = full ? mix(bc, '#000000', 0.45) : lv > 0 ? mix(bc, '#000000', 0.7) : open ? PAL.iron0 : '#08090c';
        const edge = on ? PAL.goldHi : full ? bc : lv > 0 ? mix(bc, '#000000', 0.2) : open ? (afford ? PAL.iron4 : PAL.iron2) : PAL.iron1;
        ui.rect(P.x, P.y, S, S, fill); ui.outline(P.x, P.y, S, S, edge); if (on) brackets(ui, P.x - 2, P.y - 2, S + 4, S + 4, PAL.gold, 3, t);
        if (afford && !on) alpha(ui, 0.3 + 0.3 * Math.sin(t * 4 + i), () => ui.outline(P.x - 1, P.y - 1, S + 2, S + 2, PAL.shard));
        if (open) icon(ui, NODE_ICON[u.id] || 'star', P.x + 3, P.y + 3, lv > 0 ? (full ? '#fff4d8' : bc) : PAL.iron4, { outline: false }); else icon(ui, 'lock', P.x + 3, P.y + 3, PAL.iron2, { outline: false });
        for (let q = 0; q < u.max; q++) { const px = P.x + Math.round(S / 2 - u.max * 2 + q * 4); ui.rect(px, P.y + S + 1, 3, 2, q < lv ? bc : PAL.iron1); }
        if (this.bought[u.id]) alpha(ui, 1 - clamp((t - this.bought[u.id]) * 2), () => ui.rect(P.x - 1, P.y - 1, S + 2, S + 2, '#ffffff'));
      });
    });
    // the panel: the chosen node
    const u = U.find((x) => x.id === this.sel); const py = B.B - panelH;
    iron(ui, B.L, py, B.R - B.L, panelH, {});
    if (u) {
      const lv = this.level(u), full = lv >= u.max, open = this.open_(u), c = u.cost[lv]; const ok = !full && open && c !== undefined && (M.shards ?? 0) >= c; const bc = BRANCH_COL[u.branch] || PAL.gold;
      const bw = 92; const tx = B.L + 8; const tw = B.R - B.L - bw - 22;
      alpha(ui, ease.out(clamp(this.selT / 0.2)), () => {
        ui.text(fit(ui, u.name + '  ' + lv + '/' + u.max, tw), tx, py + 5, { color: bc, shadow: false });
        let sub = u.desc; if (!open) { const p = U.find((x) => x.id === u.req[0]); sub = 'NEEDS ' + (p ? p.name : u.req[0]) + ' ' + u.req[1] + '. ' + u.desc; }
        lines(ui, sub, tw, 2).forEach((l, i) => ui.text(l, tx, py + 15 + i * 8, { color: open ? PAL.soft : PAL.dim, shadow: false }));
      });
      const st = this.hit('buy', B.R - bw - 6, py + 8, bw, 18, { disabled: !ok });
      button(ui, { x: B.R - bw - 6, y: py + 8, w: bw, h: 18 }, full ? 'COMPLETE' : (open ? 'RAISE' : 'LOCKED'), st, { primary: ok, cost: full || !open ? null : { icon: (uu, ix, iy) => icon(uu, 'shard', ix, iy, PAL.shard), n: c, ok } }); // PROPOSAL
    }
  }
}
// the tree from run.js (the screens' data layer may hand an older flat list: then every node is a root)
let TREE = null, BRS = null;
import('../game/run.js').then((m) => { TREE = m.TOWER || null; BRS = m.BRANCHES || null; }).catch(() => {});
function towerTree() { const L = TREE || towerList(); return L.map((u, i) => ({ ...u, branch: u.branch || 'vigour', row: u.row ?? i, col: u.col || 0, cost: Array.isArray(u.cost) ? u.cost : [towerCost(u, 0)], max: u.max || towerMax(u) })); }
function towerBranches() { return BRS || [{ id: 'vigour', name: 'THE TOWER' }]; }

// ------------------------------------------------------------------ challenges
const TABS = [['all', 'ALL'], ['hero', 'WARDENS'], ['boon', 'BOONS'], ['res', 'TIERS'], ['echo', 'ECHOES'], ['colour', 'COLOURS'], ['event', 'EVENTS']]; // PROPOSAL
function rewardBadge(ui, r, x, y) {
  const S = 15; ui.rect(x, y, S, S, '#07080b'); ui.outline(x, y, S, S, PAL.iron2);
  if (r.kind === 'hero') { portrait(ui, r.id, x + 1, y + 1, S - 2, S - 2); return; }
  if (r.kind === 'res') { sigil(ui, resId(r.id), x + 3, y + 3, {}); return; }
  if (r.kind === 'boon') { const d = boonDef(r.id); sigil(ui, d ? d.res : 'ember', x + 3, y + 3, {}); return; }
  if (r.kind === 'colour' && r.id && typeof r.id === 'object' && HEROES[r.id.hero]) { portrait(ui, r.id.hero, x + 1, y + 1, S - 2, S - 2); icon(ui, 'star', x + 8, y + 8, PAL.gold); return; }
  icon(ui, r.kind === 'echo' ? 'bell' : r.kind === 'colour' ? 'star' : r.kind === 'event' ? 'event' : 'key', x + 4, y + 4, PAL.gold);
}
const resId = (v) => (v && typeof v === 'object' ? v.res : v);
export function rewardName(r) {
  if (r.kind === 'hero') return (HEROES[r.id] ? HEROES[r.id].name : String(r.id).toUpperCase());
  if (r.kind === 'boon') { const d = boonDef(r.id); return d ? String(d.name).toUpperCase() : String(r.id).toUpperCase(); }
  if (r.kind === 'res') { const tier = r.id && typeof r.id === 'object' ? r.id.tier : null; return resOf(resId(r.id)).name + (tier === 'crown' ? ' CROWN' : tier ? ' TIER ' + tier : ' TIER'); }
  if (r.kind === 'echo') { const e = typeof r.id === 'object' ? (r.id.echo || r.id.id) : r.id; return (ECHOES[e] ? ECHOES[e].name : String(e).toUpperCase()); }
  if (r.kind === 'colour') { const h = r.id && typeof r.id === 'object' ? r.id.hero : String(r.id).split(':')[0]; return HEROES[h] ? 'A COLOUR: ' + HEROES[h].name : 'A NEW COLOUR'; }
  if (r.kind === 'event') return 'A NEW EVENT';
  return '';
}
export class ChallengesScreen extends Screen {
  onOpen() { this.tab = 'all'; this.scroll = 0; this.tabT = 0; }
  get meta() { return this.data.meta || {}; }
  onTap(id) { if (id === 'back') { this.sound('ui'); this.call('back'); } else if (id.startsWith('tab:')) { this.tab = id.slice(4); this.scroll = 0; this.tabT = 0; this.sound('ui'); } }
  onBack() { this.call('back'); }
  onUpdate(dt, inp) { this.tabT += dt; this.scroll = (this.scroll || 0) - (inp.dragY || 0) + (inp.wheel || 0) * 0.3; }
  render(ui) {
    const t = this.t, M = this.meta; const B = this.box(ui); backdrop(ui, t, { veil: this.data.veil, tint: '#2a2410' });
    const all = challengeList(); const P = all.map((c) => ({ c, p: challengeProgress(c, M), r: rewardOf(c) }));
    const done = P.filter((x) => x.p.done).length;
    header(ui, B.L, B.T, 'CHALLENGES', done + ' OF ' + all.length + ' DONE', { maxW: B.R - B.L - 66 }); backBtn(this, ui, B); // PROPOSAL
    // tabs
    let tx = B.L; const ty = B.T + 22; const present = new Set(P.map((x) => x.r.kind));
    for (const [id, label] of TABS) { if (id !== 'all' && !present.has(id)) continue; const w = ui.measure(label) + 10; const on = this.tab === id; const st = this.hit('tab:' + id, tx, ty, w, 16);
      ui.rect(tx, ty, w, 16, on ? '#2a2010' : (st.hover ? '#1a1d24' : PAL.iron0)); ui.rect(tx, ty + 15, w, 1, on ? PAL.gold : PAL.iron2); ui.text(label, tx + w / 2, ty + 5, { align: 'center', color: on ? PAL.goldHi : PAL.soft, shadow: false }); tx += w + 2; }
    const rows = P.filter((x) => this.tab === 'all' || x.r.kind === this.tab).sort((a, b) => (a.p.done - b.p.done) || (b.p.n / b.p.of - a.p.n / a.p.of));
    const ly = ty + 20, lh = B.B - ly, rh = 25; const S = scrolled(this, ui, B.L, ly, B.R - B.L - 6, lh, rows.length, rh);
    S.clip(() => rows.forEach((x, i) => {
      const y = ly + i * rh - Math.round(this.scroll); if (y < ly - rh || y > B.B) return; const { c, p, r } = x;
      const k = ease.out(clamp((this.tabT - i * 0.04) / 0.25)); const xx = B.L + Math.round((1 - k) * 16); const w = B.R - B.L - 8;
      alpha(ui, k, () => {
        iron(ui, xx, y, w, rh - 2, { fill: p.done ? '#14120a' : PAL.iron0, rivets: false, accent: p.done ? mix(PAL.gold, '#000', 0.5) : null });
        rewardBadge(ui, r, xx + 4, y + 4);
        const bw = Math.min(90, Math.round(w * 0.28)); const tw = w - 26 - bw - 12;
        ui.text(fit(ui, String(c.title || c.id).toUpperCase(), tw), xx + 24, y + 4, { color: p.done ? PAL.goldHi : PAL.text, shadow: false });
        ui.text(fit(ui, String(c.desc || '').toUpperCase(), tw), xx + 24, y + 13, { color: PAL.dim, shadow: false });
        const bx = xx + w - bw - 6;
        if (p.done) { icon(ui, 'check', bx + bw - 8, y + 4, PAL.ok); ui.text(fit(ui, rewardName(r), bw - 12), bx + bw - 12, y + 4, { align: 'right', color: PAL.gold, shadow: false }); ui.text('DONE', bx + bw, y + 13, { align: 'right', color: PAL.ok, shadow: false }); } // PROPOSAL
        else { ui.text(fit(ui, rewardName(r), bw), bx + bw, y + 4, { align: 'right', color: PAL.soft, shadow: false }); const pt = p.of > 1 ? Math.floor(p.n) + '/' + p.of : '0/1'; const pw2 = ui.measure(pt); bar(ui, bx, y + 15, bw - pw2 - 5, 3, p.n / p.of, PAL.gold); ui.text(pt, bx + bw, y + 13, { align: 'right', color: PAL.dim, shadow: false }); }
      });
    }));
    scrollBar(ui, B.R - 2, ly, lh, this.scroll, S.max, rows.length * rh);
  }
}

// ------------------------------------------------------------------ talents
export class TalentScreen extends Screen {
  onOpen(d) { const m = ((d.meta || {}).mastery || {})[d.hero] || {}; this.chosen = new Set(m.talents || []); this.sel = null; }
  get meta() { return this.data.meta || {}; }
  slots() { return this.data.slots ?? this.mastery().slots ?? 2; }
  onTap(id) {
    if (id === 'start') { const it = this.items.find((x) => x.id === 'start'); if (it) this.flash(it.x, it.y, it.w, it.h, PAL.gold, 0.3); this.sound('special'); this.call('start'); return; }
    if (id === 'back') { this.sound('ui'); this.call('back'); return; }
    if (id.startsWith('tal:')) {
      const tid = id.slice(4); const it = this.items.find((x) => x.id === id); const T = talentsOf(this.data.hero).find((x) => x.id === tid); const lv = this.mastery().level;
      if (!T || (T.level ?? 0) > lv) { this.deny(it); return; }
      if (this.chosen.has(tid)) { this.chosen.delete(tid); this.sound('ui'); }
      else { if (this.chosen.size >= this.slots()) { const first = [...this.chosen][0]; this.chosen.delete(first); }
        this.chosen.add(tid); this.sound('equip'); this.flash(it.x, it.y, it.w, it.h, heroColour(this.data.hero), 0.35); this.burst(it.x + 12, it.y + it.h / 2, heroColour(this.data.hero), 14, 50); }
      this.call('pick', tid);
    }
  }
  onBack() { this.call('back'); }
  onUpdate(dt, inp) { this.scroll = (this.scroll || 0) - (inp.dragY || 0) + (inp.wheel || 0) * 0.3; }
  mastery() { return masteryInfo(this.meta, this.data.hero); }
  render(ui) {
    const t = this.t, hero = this.data.hero; const B = this.box(ui); const col = heroColour(hero); const D = HEROES[hero] || { name: hero, title: '' }; const m = this.mastery();
    backdrop(ui, t, { veil: this.data.veil, tint: mix(col, '#000', 0.5), cx: 0.2 });
    header(ui, B.L, B.T, 'TALENTS', 'CHOOSE UP TO ' + this.slots(), { maxW: B.R - B.L }); // PROPOSAL
    const top = B.T + 22; const pw = Math.round(Math.min((B.R - B.L) * 0.3, (B.B - top - 24) * 0.75));
    // the warden
    glow(ui, B.L, top, pw, B.B - top - 24, col, 0.6, 4); iron(ui, B.L, top, pw, B.B - top - 24, { fill: mix(col, '#07080b', 0.86) });
    const ph = B.B - top - 24 - 40; portrait(ui, hero, B.L + 4, top + 4, pw - 8, ph);
    ui.text(fit(ui, D.name, pw - 8), B.L + pw / 2, top + ph + 8, { align: 'center', color: '#ffffff' });
    ui.text('MASTERY ' + m.level, B.L + pw / 2, top + ph + 18, { align: 'center', color: col, shadow: false }); // PROPOSAL
    bar(ui, B.L + 6, top + ph + 29, pw - 12, 3, m.frac, col);
    // the talents
    const T = talentsOf(hero); const x = B.L + pw + 8, w = B.R - x; const viewH = B.B - top - 24; const rh = Math.max(24, Math.min(30, Math.floor(viewH / Math.max(1, T.length)) - 3));
    const max = Math.max(0, T.length * (rh + 3) - 3 - viewH); this.scroll = clamp(this.scroll || 0, 0, max);
    const g = ui.g; g.save(); g.beginPath(); g.rect(x - 4, top - 3, w + 8, viewH + 4); g.clip();
    T.forEach((tl, i) => {
      const y = top + i * (rh + 3) - Math.round(this.scroll); if (y + rh < top - 3 || y > top + viewH) return; const lock = (tl.level ?? 0) > m.level; const on = this.chosen.has(tl.id); const k = ease.back(clamp((t - i * 0.06) / 0.3));
      const st = this.hit('tal:' + tl.id, x, y, w, rh, { disabled: lock });
      alpha(ui, k, () => {
        if (on) glow(ui, x, y, w, rh, col, 0.9 + 0.3 * Math.sin(t * 4), 3);
        const bx = Math.round(x + (1 - k) * 30); button(ui, { x: bx, y, w, h: rh }, '', on ? { focus: true, hover: st.hover } : st, { primary: on });
        const dy = (st.press ? 1 : (st.hover || on ? -1 : 0)); const tw = w - 24;
        const desc = lock ? ['MASTERY ' + tl.level + ' TO LEARN'] : lines(ui, tl.desc || '', tw, Math.max(1, Math.floor((rh - 14) / 8))); // PROPOSAL
        const ty = y + Math.round((rh - 9 - desc.length * 8) / 2) + dy;
        icon(ui, lock ? 'lock' : (on ? 'check' : 'star'), bx + 6, ty, lock ? PAL.faint : (on ? PAL.ok : col));
        ui.text(fit(ui, String(tl.name).toUpperCase(), tw), bx + 17, ty, { color: lock ? PAL.faint : (on ? PAL.goldHi : PAL.text), shadow: false });
        desc.forEach((l, j) => ui.text(l, bx + 17, ty + 9 + j * 8, { color: lock ? '#7a5a50' : PAL.dim, shadow: false }));
      });
    });
    g.restore(); if (max > 0) { ui.rect(B.R - 1, top, 1, viewH, PAL.iron1); const th = Math.max(8, viewH * viewH / (viewH + max)); ui.rect(B.R - 1, top + (viewH - th) * (this.scroll / max), 1, th, PAL.iron4); }
    const sb = 100; const st = this.hit('start', B.R - sb, B.B - 18, sb, 18); button(ui, { x: B.R - sb, y: B.B - 18, w: sb, h: 18 }, 'SET OUT', st, { primary: true }); // PROPOSAL
    ui.text(this.chosen.size + '/' + this.slots(), B.R - sb - 8, B.B - 12, { align: 'right', color: PAL.dim });
    if (typeof this.handlers.back === 'function') { const s2 = this.hit('back', x, B.B - 18, 60, 18); button(ui, { x, y: B.B - 18, w: 60, h: 18 }, 'BACK', s2, {}); }
  }
}
