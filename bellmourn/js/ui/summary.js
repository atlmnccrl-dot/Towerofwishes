// SummaryScreen({ summary }, { done }): the run's story in numbers (districts, bosses, boons, Hushed freed,
// foes felled, depth) counting up row by row, then what it earned: Bell Shards counting up in a shower of
// sparks, the warden's mastery bar filling (a level-up flourish), challenges completed stamped in one by
// one, and unlocks turned over with rays. A tap hurries it to the end; DONE calls done().
// summary: endRun's { shards, masteryXp, challengesDone, unlocks, lines } plus, when A passes them, outcome,
// hero, act, depth, run (its stats and boons) and mastery { level, xp, next, levelAfter }.
import { Screen, PAL, ease, clamp, mix, iron, backdrop, button, lines, alpha, fit, bar, rays, ROMAN, header, glow } from './kit.js';
import { icon, sigil } from './icons.js';
import { portrait, heroColour } from './portraits.js';
import { HEROES } from '../game/heroes.js';
import { challengeList, boonDef, DATA } from './data.js';

const ROW = 0.26, COUNT = 0.55;
export class SummaryScreen extends Screen {
  onOpen(d) { this.S = d.summary || {}; this.sounded = new Set(); this.plan(); }
  plan() {
    const S = this.S, run = S.run || {}, st = run.stats || S.stats || {};
    // PROPOSAL labels
    const cnt = (v, arr) => (typeof v === 'number' ? v : (arr || []).length);
    this.rows = [
      { label: 'DISTRICTS', n: cnt(S.areas, st.areas), icon: 'area' },
      { label: 'BOSSES', n: cnt(S.bosses, st.bosses), icon: 'boss' },
      { label: 'BOONS', n: cnt(S.boons, run.boons), icon: 'boon' },
      { label: 'HUSHED FREED', n: st.freed ?? S.kills ?? st.kills ?? 0, icon: 'ember' },
      ...(st.freed !== undefined && st.kills !== undefined ? [{ label: 'FOES FELLED', n: st.kills, icon: 'weapon' }] : []),
      { label: 'DEPTH', n: S.depth ?? (run.visited || []).length, icon: 'tower' },
    ];
    // A's lines repeat the numbers above: only its first line (how the run ended) is shown
    this.lines = (S.lines || []).slice(0, S.areas !== undefined ? 1 : 4);
    const chal = (S.challengesDone || []).map((c) => (typeof c === 'string' ? (challengeList().find((x) => x.id === c) || { id: c, title: c.toUpperCase() }) : c));
    this.chal = chal; this.unl = (S.unlocks || []).map((u) => (typeof u === 'string' ? { kind: HEROES[u] ? 'hero' : 'boon', id: u, name: HEROES[u] ? HEROES[u].name : u } : u));
    let t = 0.35 + this.rows.length * ROW; this.tShards = t; t += 0.9; this.tMastery = t; t += 1.0; this.tChal = t; t += chal.length * 0.32 + 0.2; this.tUnl = t; t += this.unl.length * 0.6; this.tDone = t + 0.2;
  }
  // the mastery bar at k (0..1 of the count-up): from S.mastery { level, xp, next, levelAfter }, else from
  // A's curve and the meta (data.meta or summary.meta) after the run, else just the level and the flourish
  masteryAt(k) {
    const S = this.S, gain = S.masteryXp || 0; const meta = this.data.meta || S.meta; const MC = DATA.MASTERY;
    if (S.mastery) { const M = S.mastery; const lv = M.level ?? 1, xp = M.xp ?? 0, next = M.next ?? Math.max(1, xp + gain); const cur = xp + gain * k; const up = M.levelAfter && M.levelAfter > lv && cur >= next;
      return { lv: up ? M.levelAfter : lv, frac: up ? (cur - next) / Math.max(1, next) : cur / Math.max(1, next), leveled: up }; }
    if (MC && meta && S.hero) { const after = (((meta.mastery || {})[S.hero] || {}).xp | 0); const before = Math.max(0, after - gain); const cur = before + gain * k; const L = MC.masteryLevel(cur); const a = MC.masteryNeed(L), b = MC.masteryNeed(L + 1);
      return { lv: L, frac: b > a ? (cur - a) / (b - a) : 1, leveled: L > MC.masteryLevel(before) }; }
    const L = S.masteryLevel ?? 1; const up = !!S.levelUp && k >= 1; return { lv: up || !S.levelUp ? L : L - 1, frac: S.levelUp ? k : null, leveled: up };
  }
  onTap(id) { if (this.t < this.tDone) { this.t = this.tDone + 0.01; return; } if (id === 'done' && !this.sent) { this.sent = true; this.sound('uiOk'); this.call('done'); } }
  onTapNothing() { if (this.t < this.tDone) this.t = this.tDone + 0.01; }
  once(k, fn) { if (!this.sounded.has(k)) { this.sounded.add(k); fn(); } }
  render(ui) {
    const t = this.t, S = this.S; const B = this.box(ui); const dead = !S.outcome || S.outcome === 'death';
    backdrop(ui, t, { veil: this.data.veil, tint: dead ? '#3a0c10' : '#4a3410', moteCol: dead ? '#ff7060' : '#ffe0a0' });
    // PROPOSAL titles
    const ending = String(S.outcome || '').startsWith('ending:') ? S.outcome.slice(7) : null;
    const title = ending ? ({ dawn: 'THE DAWN', silence: 'SILENCE', song: 'THE NEW SONG' }[ending] || 'THE END') : 'THE RUN ENDS';
    const sub = (HEROES[S.hero] ? HEROES[S.hero].name + '  ' : '') + (S.act ? 'ACT ' + (ROMAN[S.act] || S.act) : '');
    header(ui, B.L, B.T, title, sub, { color: ending ? PAL.goldHi : PAL.text, rule: ending ? PAL.gold : PAL.blood });
    const W = B.R - B.L; const lw = Math.round(W * 0.42); const top = B.T + 23;
    // ---- the story in numbers
    iron(ui, B.L, top, lw, B.B - top, { fill: '#0d0f14' });
    let y = top + 7; const rh = Math.min(13, Math.floor((B.B - top - 14) / (this.rows.length + 2)));
    this.rows.forEach((r, i) => {
      const t0 = 0.35 + i * ROW; const k = clamp((t - t0) / COUNT); if (t < t0) return;
      this.once('row' + i, () => this.sound('ui'));
      const a = ease.out(clamp((t - t0) / 0.2)); const x = B.L + 7 - Math.round((1 - a) * 10);
      alpha(ui, a, () => {
        icon(ui, r.icon, x, y, PAL.dim); ui.text(r.label, x + 11, y, { color: PAL.soft, shadow: false });
        const n = Math.round(r.n * ease.out(k)); ui.text(String(n), B.L + lw - 8, y, { align: 'right', color: k >= 1 ? PAL.text : PAL.goldHi });
      });
      y += rh;
    });
    if (t > this.tShards) { y += 3; for (const l of this.lines.flatMap((l) => lines(ui, l, lw - 14, 3))) { if (y > B.B - 10) break; ui.text(l, B.L + 7, y, { color: PAL.dim, shadow: false, alpha: clamp((t - this.tShards) * 2) }); y += 9; } }
    // ---- what it earned
    const rx = B.L + lw + 8, rw = W - lw - 8; let ry = top;
    if (t > this.tShards - 0.1) {
      const k = clamp((t - this.tShards) / 0.8); const n = Math.round((S.shards || 0) * ease.out(k));
      iron(ui, rx, ry, rw, 24, { fill: '#0d1418', rivets: false });
      icon(ui, 'shard', rx + 8, ry + 5, PAL.shard, { scale: 2 }); ui.text('BELL SHARDS', rx + 28, ry + 8, { color: PAL.soft, shadow: false }); // PROPOSAL
      ui.text('+' + n, rx + rw - 8, ry + 5, { align: 'right', color: '#c8f4ff', scale: 2 });
      if (k > 0 && k < 1 && Math.floor(t * 30) % 2 === 0) { this.sound('ember', { vol: 0.5 }); this.burst(rx + rw - 20, ry + 12, PAL.shard, 2, 40, { up: 30 }); }
      this.once('shards', () => this.ring(rx + 15, ry + 12, PAL.shard, 18, 0.5));
    }
    ry += 28;
    if (t > this.tMastery - 0.1 && (S.hero || S.masteryXp)) {
      const gain = S.masteryXp || 0; const k = ease.inOut(clamp((t - this.tMastery) / 0.9)); const ms = this.masteryAt(k); const leveled = ms.leveled;
      iron(ui, rx, ry, rw, 26, { fill: '#100e14', rivets: false });
      if (S.hero && HEROES[S.hero]) portrait(ui, S.hero, rx + 4, ry + 4, 18, 18);
      ui.text('MASTERY', rx + 26, ry + 5, { color: PAL.soft, shadow: false }); ui.text('LV ' + ms.lv, rx + 26 + ui.measure('MASTERY ') + 2, ry + 5, { color: leveled ? PAL.goldHi : PAL.text });
      ui.text('+' + Math.round(gain * k) + ' XP', rx + rw - 7, ry + 5, { align: 'right', color: heroColour(S.hero) });
      if (ms.frac !== null) bar(ui, rx + 26, ry + 16, rw - 33, 4, ms.frac, leveled ? PAL.gold : heroColour(S.hero));
      if (leveled) this.once('lvl', () => { this.sound('upgrade'); this.ring(rx + 13, ry + 13, PAL.gold, 26, 0.7); this.burst(rx + 13, ry + 13, PAL.gold, 20, 60); this.pop('LEVEL UP', rx + rw / 2, ry + 2, PAL.goldHi, 1.6); }); // PROPOSAL
    }
    ry += 30;
    // challenges completed, stamped in
    if (this.chal.length && t > this.tChal - 0.1) {
      ui.text('CHALLENGES', rx + 2, ry, { color: PAL.dim, shadow: false }); ry += 10; // PROPOSAL
      this.chal.forEach((c, i) => { const t0 = this.tChal + i * 0.32; if (t < t0) return; this.once('c' + i, () => this.sound('clang', { vol: 0.5 }));
        const k = ease.back(clamp((t - t0) / 0.25)); const sc = 1 + (1 - k) * 0.6;
        alpha(ui, clamp((t - t0) * 6), () => { icon(ui, 'check', rx + 4, ry, PAL.ok, { scale: sc > 1.3 ? 2 : 1 }); ui.text(fit(ui, String(c.title || c.id).toUpperCase(), rw - 18), rx + 14, ry, { color: PAL.text, shadow: false }); });
        ry += 9; });
      ry += 3;
    }
    // unlocks, turned over with rays
    if (this.unl.length && t > this.tUnl - 0.1) {
      ry += 10; const n = this.unl.length; const tw = Math.min(64, Math.floor((rw - (n - 1) * 4) / n)); const th = Math.min(46, B.B - ry - 24); const x0 = rx + Math.round((rw - (n * tw + (n - 1) * 4)) / 2);
      if (th > 20) { const k0 = clamp((t - this.tUnl) * 4); alpha(ui, k0, () => ui.text('UNLOCKED', rx + 2, ry - 10, { color: PAL.gold, shadow: false })); } // PROPOSAL
      if (th > 20) this.unl.forEach((u, i) => { const t0 = this.tUnl + i * 0.6; if (t < t0) return; const k = clamp((t - t0) / 0.35); const face = k >= 0.5; const sx = Math.abs(Math.cos(k * Math.PI));
        this.once('u' + i, () => { this.sound('special'); });
        if (face) this.once('uf' + i, () => { this.flash(x0 + i * (tw + 4), ry, tw, th, '#ffffff', 0.4); this.burst(x0 + i * (tw + 4) + tw / 2, ry + th / 2, PAL.gold, 18, 60); });
        const cx = x0 + i * (tw + 4) + tw / 2; const w = Math.max(2, Math.round(tw * sx)); const x = Math.round(cx - w / 2);
        if (face) { rays(ui, cx, ry + th / 2, tw * 0.9, PAL.gold, t + i, 12, 0.2); glow(ui, x, ry, w, th, PAL.gold, 0.8, 3); }
        iron(ui, x, ry, w, th, { fill: face ? '#14110c' : '#1a0a0c', rivets: false });
        if (face && sx > 0.6) { this.drawUnlock(ui, u, x, ry, w, th); }
        else if (!face) icon(ui, 'bell', cx, ry + th / 2, PAL.goldLo, { center: true }); });
    }
    if (t > this.tDone) { const bw = 80, bh = 18; const k = ease.out(clamp((t - this.tDone) / 0.3)); alpha(ui, k, () => { const st = this.hit('done', B.R - bw, B.B - bh, bw, bh); button(ui, { x: B.R - bw, y: B.B - bh, w: bw, h: bh }, 'DONE', st, { primary: true }); }); } // PROPOSAL
    else this.hit('skip', 0, 0, ui.w, ui.h, { nav: false, tick: false, small: true });
  }
  drawUnlock(ui, u, x, y, w, h) {
    const kind = u.kind || 'boon'; const name = String(u.name || u.id || '').toUpperCase(); const cx = x + Math.floor(w / 2);
    if (kind === 'hero' && HEROES[u.id]) { const ph = h - 15; portrait(ui, u.id, x + 3, y + 3, w - 6, ph - 2); }
    else if (kind === 'boon' || kind === 'res') { const d = kind === 'boon' ? boonDef(u.id) : null; sigil(ui, d ? d.res : u.id, cx, y + (h - 12) / 2, { scale: 2, center: true }); }
    else icon(ui, kind === 'echo' ? 'bell' : kind === 'colour' ? 'star' : 'key', cx, y + (h - 12) / 2, PAL.gold, { scale: 2, center: true });
    ui.rect(x + 3, y + h - 12, w - 6, 9, 'rgba(4,5,8,0.85)'); ui.text(fit(ui, name, w - 6), cx, y + h - 11, { align: 'center', color: PAL.goldHi, shadow: false });
  }
}
