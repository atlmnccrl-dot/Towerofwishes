// SelectScreen({ meta }, { choose(heroId), tower, challenges, codex, back? }): the wardens as large portrait
// cards on a carousel; the one in the middle is big and lit, its neighbours step back into the dark. An
// unlocked warden shows their title and mastery; a locked one is a silhouette with the challenges that
// free them and a progress bar for each. A drag, a tap on a neighbour, or left/right turns the carousel;
// BEGIN chooses (preview(id), when given, hears each change of warden). Under it: THE BELL TOWER, CHALLENGES and the CODEX.
import { Screen, PAL, ease, clamp, mix, iron, backdrop, button, lines, alpha, fit, bar, glow, brackets } from './kit.js';
import { icon } from './icons.js';
import { portrait, heroColour } from './portraits.js';
import { HEROES, HERO_ORDER } from '../game/heroes.js';
import { challengeList, challengeProgress, rewardOf, masteryInfo } from './data.js';

export class SelectScreen extends Screen {
  onOpen(d) { const M = d.meta || {}; this.ids = HERO_ORDER.slice(); const first = this.ids.findIndex((id) => (M.unlocked || []).includes(id)); this.idx = Math.max(0, d.hero ? this.ids.indexOf(d.hero) : first); this.pos = this.idx; this.drag = 0; }
  get meta() { return this.data.meta || {}; }
  open_(id) { return (this.meta.unlocked || []).includes(id); }
  unlockChallenges(id) { return challengeList().filter((c) => { const r = rewardOf(c); return r.kind === 'hero' && r.id === id; }); }
  turn(d) { const n = this.ids.length; const i = (this.idx + d + n) % n; if (i !== this.idx) { this.idx = i; this.changeT = 0; this.sound('ui'); this.call('preview', this.ids[i]); } }
  onDir(dir) { if (dir[0]) { this.turn(dir[0]); this.focusId = 'begin'; return true; } if (dir[1]) { this.turn(dir[1] * Math.ceil(this.ids.length / 2)); return true; } return false; }
  onTap(id) {
    if (id.startsWith('hero:')) { const i = this.ids.indexOf(id.slice(5)); if (i === this.idx) { if (this.open_(this.ids[i])) this.begin(); else this.deny(this.items.find((x) => x.id === id)); } else { this.idx = i; this.changeT = 0; this.sound('ui'); this.call('preview', this.ids[i]); } return; }
    if (id === 'begin') { this.begin(); return; }
    if (id.startsWith('btn:')) { this.sound('uiOk'); this.call(id.slice(4)); }
  }
  begin() {
    const id = this.ids[this.idx]; if (!this.open_(id)) { this.deny(this.items.find((x) => x.id === 'begin')); return; }
    const it = this.items.find((x) => x.id === 'hero:' + id); if (it) { this.flash(it.x, it.y, it.w, it.h, '#ffffff', 0.35); this.burst(it.x + it.w / 2, it.y + it.h / 2, heroColour(id), 24, 80); }
    this.shake(2, 0.25); this.sound('special'); this.call('choose', id);
  }
  onBack() { this.call('back'); }
  onUpdate(dt, inp) {
    if (inp.dragX) { this.drag += inp.dragX; if (Math.abs(this.drag) > 26) { this.turn(this.drag < 0 ? 1 : -1); this.drag = 0; } } else if (!this.pointer) this.drag = 0;
    if (inp.wheel) this.turn(inp.wheel > 0 ? 1 : -1);
    this.changeT = (this.changeT ?? 1) + dt;
  }
  render(ui) {
    const t = this.t, M = this.meta; const B = this.box(ui); const cur = this.ids[this.idx]; const col = heroColour(cur);
    backdrop(ui, t, { veil: this.data.veil, tint: mix(col, '#000000', 0.5), cy: 0.45 });
    ui.text('CHOOSE A WARDEN', B.L, B.T + 1, { color: PAL.text, scale: 2 }); ui.rect(B.L, B.T + 16, 60, 1, PAL.blood); // PROPOSAL
    icon(ui, 'shard', B.R - ui.measure(String(M.shards ?? 0)) - 10, B.T + 6, PAL.shard); ui.text(String(M.shards ?? 0), B.R, B.T + 6, { align: 'right', color: '#c8f4ff' });
    if (M.runs) ui.text('RUN ' + (M.runs + 1), B.R - ui.measure(String(M.shards ?? 0)) - 18, B.T + 6, { align: 'right', color: PAL.dim }); // PROPOSAL
    // the chosen warden, large, turning over when the choice changes
    const top = B.T + 22, bot = B.B - 25; const ch = bot - top; const cw = Math.round(Math.min(ch * 0.74, (B.R - B.L) * 0.32));
    const ck = clamp(this.changeT / 0.22); const sx = Math.abs(Math.cos((1 - ck) * Math.PI / 2)); const lockC = !this.open_(cur);
    const bw0 = Math.max(4, Math.round(cw * sx)); const bx0 = B.L + Math.round((cw - bw0) / 2);
    glow(ui, bx0, top, bw0, ch, lockC ? '#5a5a66' : col, 0.9 + 0.3 * Math.sin(t * 3), 5);
    const big = this.cardCv || (this.cardCv = { key: '', c: null });
    const key = cur + cw + 'x' + ch + (lockC ? 'L' : '') + JSON.stringify((M.mastery || {})[cur] || {});
    if (big.key !== key) { const o = document.createElement('canvas'); o.width = cw; o.height = ch; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; const g0 = ui.g; ui.g = g; try { this.drawCard(ui, cur, 0, 0, cw, ch, { centre: true, lock: lockC }); } finally { ui.g = g0; } big.c = o; big.key = key; }
    ui.g.drawImage(big.c, bx0, top, bw0, ch);
    if (ck >= 1) brackets(ui, B.L - 3, top - 3, cw + 6, ch + 6, lockC ? PAL.faint : PAL.gold, 6, Math.sin(t * 5) > 0 ? 1 : 0);
    this.hit('hero:' + cur, B.L, top, cw, ch, { tick: false, nav: false });
    // the roster: every warden as a small card, two rows
    const gx = B.L + cw + 12, gw = B.R - gx; const cols = Math.ceil(this.ids.length / 2); const gap = 4; const tw = Math.floor((gw - gap * (cols - 1)) / cols); const th = Math.floor((ch - gap) / 2);
    this.ids.forEach((id, i) => {
      const x = gx + (i % cols) * (tw + gap), y = top + Math.floor(i / cols) * (th + gap); const on = i === this.idx; const lock = !this.open_(id); const hc = heroColour(id);
      const k = ease.back(clamp((t - 0.05 - i * 0.04) / 0.3)); const st = this.hit('hero:' + id, x, y, tw, th, { tick: false });
      alpha(ui, k, () => {
        const yy = y + (st.hover && !on ? -1 : 0) + Math.round((1 - k) * 8);
        iron(ui, x, yy, tw, th, { fill: on ? mix(hc, '#07080b', 0.75) : (lock ? '#0a0b0e' : PAL.iron0), accent: on ? PAL.gold : null, rivets: false });
        const ph = th - 16; portrait(ui, id, x + 3, yy + 3, tw - 6, ph - 2, { locked: lock, dim: !on && !st.hover });
        ui.rect(x + 3, yy + ph + 1, tw - 6, 1, lock ? PAL.iron2 : hc);
        const D = HEROES[id] || { name: id }; ui.text(fit(ui, lock ? '? ? ?' : D.name, tw - 6), x + tw / 2, yy + ph + 4, { align: 'center', color: on ? '#ffffff' : (lock ? PAL.faint : PAL.soft), shadow: false });
        if (lock) icon(ui, 'lock', x + tw - 11, yy + 5, PAL.dim);
        const m = masteryInfo(M, id); if (!lock && m.level > 0) { const lv = String(m.level); ui.rect(x + 4, yy + 4, ui.measure(lv) + 4, 9, 'rgba(4,5,8,0.85)'); ui.text(lv, x + 6, yy + 5, { color: hc, shadow: false }); }
      });
    });
    // the buttons
    const bh = 20; const by = B.B - bh;
    const btns = [['tower', 'BELL TOWER', 'tower'], ['challenges', 'CHALLENGES', 'cup'], ['codex', 'CODEX', 'book']]; // PROPOSAL
    let bx = B.L; for (const [id, label, ic] of btns) { const w = ui.measure(label) + 22; const st = this.hit('btn:' + id, bx, by, w, bh); button(ui, { x: bx, y: by, w, h: bh }, label, st, { icon: (u, x, y) => icon(u, ic, x, y, PAL.soft) }); bx += w + 4; }
    const lock = !this.open_(cur); const bw = Math.max(70, Math.min(110, B.R - bx - 4)); const st = this.hit('begin', B.R - bw, by, bw, bh, { disabled: lock });
    button(ui, { x: B.R - bw, y: by, w: bw, h: bh }, lock ? 'LOCKED' : 'BEGIN', st, { primary: !lock, icon: lock ? (u, x, y) => icon(u, 'lock', x, y, PAL.faint) : null }); // PROPOSAL
  }
  drawCard(ui, id, x, y, w, h, o) {
    const D = HEROES[id] || { name: id, title: '' }; const col = heroColour(id); const M = this.meta; const lock = o.lock;
    iron(ui, x, y, w, h, { fill: lock ? '#0a0b0e' : mix(col, '#07080b', 0.86), accent: o.centre && !lock ? mix(col, '#000', 0.2) : null, rivets: w > 50 });
    const ph = Math.round(h * (o.centre ? (lock ? 0.36 : 0.5) : 0.62)); portrait(ui, id, x + 4, y + 4, w - 8, ph, { locked: lock });
    ui.rect(x + 4, y + 4 + ph, w - 8, 1, lock ? PAL.faint : col);
    let ty = y + ph + 8; const tw = w - 10; const cxm = x + Math.floor(w / 2);
    ui.text(fit(ui, lock && !o.centre ? '? ? ?' : D.name, tw), cxm, ty, { align: 'center', color: lock ? PAL.dim : '#ffffff' }); ty += 10;
    if (!o.centre) { if (lock) icon(ui, 'lock', cxm, ty + 4, PAL.faint, { center: true }); return; }
    if (!lock) {
      for (const l of lines(ui, D.title || '', tw, 2)) { ui.text(l, cxm, ty, { align: 'center', color: col, shadow: false }); ty += 9; }
      ty += 2; const room = Math.floor((y + h - 20 - ty) / 8); if (room > 0) for (const l of lines(ui, D.blurb || '', tw, room)) { ui.text(l, cxm, ty, { align: 'center', color: PAL.dim, shadow: false }); ty += 8; }
      const m = masteryInfo(M, id);
      const by = y + h - 16; ui.text('MASTERY ' + m.level, x + 6, by - 1, { color: PAL.soft, shadow: false }); // PROPOSAL
      if (m.talents.length) icon(ui, 'star', x + w - 13, by - 1, PAL.gold);
      bar(ui, x + 6, by + 9, w - 12, 3, m.frac, col);
    } else {
      ui.text('LOCKED', cxm, ty, { align: 'center', color: PAL.bad, shadow: false }); ty += 11; // PROPOSAL
      const C = this.unlockChallenges(id);
      if (!C.length) { for (const l of lines(ui, 'FREE THEM ON THE ROAD', tw, 2)) { ui.text(l, cxm, ty, { align: 'center', color: PAL.dim, shadow: false }); ty += 9; } } // PROPOSAL
      for (const c of C.slice(0, 2)) { if (ty > y + h - 16) break; const p = challengeProgress(c, M);
        const L = lines(ui, c.desc || c.title || '', tw, 2); for (const l of L) { ui.text(l, x + 5, ty, { color: p.done ? PAL.ok : PAL.soft, shadow: false }); ty += 8; }
        bar(ui, x + 5, ty + 1, tw - 26, 2, p.n / p.of, p.done ? PAL.ok : PAL.gold); ui.text(p.of > 1 ? Math.floor(p.n) + '/' + p.of : (p.done ? 'OK' : '0/1'), x + w - 5, ty - 2, { align: 'right', color: PAL.dim, shadow: false }); ty += 8; }
    }
  }
}
