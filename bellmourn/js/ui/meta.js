// The meta screens on the title: TowerScreen({ meta }, { buy(id), back }) (the Bell Tower: account-wide
// upgrades bought with Bell Shards; the tower lights a floor for each one), ChallengesScreen({ meta },
// { back }) (every challenge with its progress bar and reward, filtered by what it rewards), and
// TalentScreen({ meta, hero, slots? }, { pick(id), start, back? }) (choose up to two of the warden's talents
// before a run; the ones above their mastery stay locked).
import { Screen, refused, PAL, ease, clamp, mix, iron, backdrop, button, lines, alpha, fit, bar, glow, header, resOf, chip } from './kit.js';
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
export class TowerScreen extends Screen {
  onOpen() { this.sel = 0; this.selT = 0; this.bought = {}; }
  get meta() { return this.data.meta || {}; }
  level(u) { return ((this.meta.tower || {})[u.id] || 0); }
  onTap(id) {
    if (id === 'back') { this.sound('ui'); this.call('back'); return; }
    if (id.startsWith('up:')) { const i = +id.slice(3); if (i !== this.sel) { this.sel = i; this.selT = 0; this.sound('ui'); } else if (!this.lastTouch) this.buy(); return; }
    if (id === 'buy') this.buy();
  }
  buy() {
    const U = towerList(); const u = U[this.sel]; const rect = this.items.find((x) => x.id === 'buy'); if (!u) return;
    const lv = this.level(u), c = towerCost(u, lv); if (lv >= towerMax(u) || c === null || (this.meta.shards ?? 0) < c) { this.deny(rect); return; }
    const r = this.call('buy', u.id); if (refused(r)) { this.deny(rect); return; }
    this.bought[u.id] = this.t; const row = this.items.find((x) => x.id === 'up:' + this.sel);
    if (row) { this.flash(row.x, row.y, row.w, row.h, PAL.shard, 0.4); this.burst(row.x + row.w - 20, row.y + row.h / 2, PAL.shard, 18, 60); }
    if (this.towerAt) { this.ring(this.towerAt.x, this.towerAt.y, PAL.gold, 30, 0.7); } this.sound('bigBell', { vol: 0.5 }); this.sound('upgrade'); this.shake(2, 0.3);
  }
  onBack() { this.call('back'); }
  onUpdate(dt) { this.selT += dt; }
  render(ui) {
    const t = this.t, M = this.meta; const B = this.box(ui); const U = towerList(); backdrop(ui, t, { veil: this.data.veil, tint: '#10283a', moteCol: '#9adcf0' });
    header(ui, B.L, B.T, 'THE BELL TOWER', null); backBtn(this, ui, B); // PROPOSAL
    const sw = ui.measure(String(M.shards ?? 0)); icon(ui, 'shard', B.R - 70 - sw - 10, B.T + 5, PAL.shard); ui.text(String(M.shards ?? 0), B.R - 68, B.T + 5, { align: 'right', color: '#c8f4ff' });
    const top = B.T + 22; const tw = Math.round((B.R - B.L) * 0.26);
    this.drawTower(ui, B.L, top, tw, B.B - top, U);
    const x = B.L + tw + 8, w = B.R - x; const listH = B.B - top - 24; const rh = Math.max(16, Math.min(20, Math.floor(listH / Math.max(1, U.length))));
    U.forEach((u, i) => {
      const y = top + i * rh; if (y + rh > top + listH + 2) return; const lv = this.level(u), mx = towerMax(u), c = towerCost(u, lv), full = lv >= mx; const on = this.sel === i;
      const k = ease.out(clamp((t - i * 0.05) / 0.3)); const st = this.hit('up:' + i, x, y, w, rh - 2);
      alpha(ui, k, () => {
        button(ui, { x: x + (1 - k) * 20, y, w, h: rh - 2 }, '', on ? { focus: true, hover: st.hover } : st, { primary: on });
        const yy = y + Math.round((rh - 2 - 7) / 2) + (st.press ? 1 : (st.hover || on ? -1 : 0));
        ui.text(fit(ui, String(u.name).toUpperCase(), w - 110), x + 7, yy, { color: on ? PAL.goldHi : PAL.text, shadow: false });
        for (let p = 0; p < mx; p++) { const px = x + w - 52 - (mx - p) * 5; ui.rect(px, yy + 1, 4, 5, p < lv ? PAL.shard : PAL.iron2); if (p < lv) ui.rect(px, yy + 1, 4, 1, '#e0faff'); if (this.bought[u.id] && p === lv - 1) alpha(ui, 1 - clamp((t - this.bought[u.id]) * 2), () => ui.rect(px - 1, yy, 6, 7, '#ffffff')); }
        if (full) ui.text('MAX', x + w - 7, yy, { align: 'right', color: PAL.gold, shadow: false });
        else { ui.text(String(c), x + w - 7, yy, { align: 'right', color: (M.shards ?? 0) >= c ? '#c8f4ff' : PAL.bad, shadow: false }); icon(ui, 'shard', x + w - 7 - ui.measure(String(c)) - 9, yy, PAL.shard, { outline: false }); }
      });
    });
    const u = U[this.sel]; if (u) {
      const lv = this.level(u), c = towerCost(u, lv), full = lv >= towerMax(u); const ok = !full && c !== null && (M.shards ?? 0) >= c;
      const bw = 96; alpha(ui, ease.out(clamp(this.selT / 0.2)), () => { const L2 = lines(ui, u.desc || '', w - bw - 8, 2); let yy = B.B - 9 - L2.length * 4; for (const l of L2) { ui.text(l, x + 2, yy, { color: PAL.soft, shadow: false }); yy += 8; } }); const st = this.hit('buy', B.R - bw, B.B - 18, bw, 18, { disabled: !ok });
      button(ui, { x: B.R - bw, y: B.B - 18, w: bw, h: 18 }, full ? 'COMPLETE' : 'RAISE', st, { primary: ok, cost: full ? null : { icon: (uu, ix, iy) => icon(uu, 'shard', ix, iy, PAL.shard), n: c, ok } }); // PROPOSAL
    }
  }
  // the tower: one floor per upgrade, its window lit by how far it is raised; the bell at the top glows
  drawTower(ui, x, y, w, h, U) {
    const t = this.t; const cx = x + Math.floor(w / 2); const n = Math.max(1, U.length); const fh = Math.floor((h - 34) / n); const tw = Math.min(w - 10, 40);
    let lit = 0, all = 0; U.forEach((u) => { lit += this.level(u); all += towerMax(u); });
    const k = all ? lit / all : 0;
    for (let r = 4; r >= 1; r--) alpha(ui, 0.05 * k, () => ui.circle(cx, y + 14, 8 + r * 6, PAL.gold));
    // spire and bell chamber
    ui.rect(cx - 1, y, 2, 6, PAL.iron2); for (let i = 0; i < 6; i++) ui.rect(cx - 2 - i, y + 6 + i, 5 + i * 2, 1, '#20242c');
    ui.rect(cx - tw / 2 + 4, y + 12, tw - 8, 16, '#14161c'); ui.rect(cx - 7, y + 14, 14, 12, '#06070a');
    icon(ui, 'bell', cx, y + 20, k > 0 ? mix(PAL.goldLo, PAL.goldHi, k) : PAL.iron3, { center: true });
    this.towerAt = { x: cx, y: y + 20 };
    U.forEach((u, i) => {
      const fy = y + 28 + i * fh; const lv = this.level(u), mx = towerMax(u); const fk = mx ? lv / mx : 0; const ww = tw + Math.round(i * 2);
      ui.rect(cx - ww / 2, fy, ww, fh, i % 2 ? '#1a1d24' : '#1e2129'); ui.rect(cx - ww / 2, fy, ww, 1, '#2c313b'); ui.rect(cx - ww / 2, fy, 1, fh, '#2c313b');
      const win = Math.max(3, fh - 6); const lc = fk > 0 ? mix('#5a3a14', '#ffd890', fk) : '#07080a';
      ui.rect(cx - 3, fy + 3, 6, win, lc); if (fk > 0) { ui.rect(cx - 1, fy + 3, 1, win, '#1a1208'); alpha(ui, 0.25 * fk * (0.8 + 0.2 * Math.sin(t * 3 + i)), () => ui.rect(cx - 6, fy + 1, 12, win + 4, '#ffc870')); }
      if (this.sel === i) { ui.rect(cx + ww / 2 + 2, fy + fh / 2 - 1, 3, 3, PAL.gold); }
    });
    ui.rect(cx - tw / 2 - n - 2, y + 28 + n * fh, tw + n * 2 + 4, 3, '#2c313b');
  }
}

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
