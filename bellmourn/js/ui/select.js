// SelectScreen({ meta }, { choose(heroId), preview(heroId), challenges, codex, back? }): one warden at a time,
// the warden themselves: the real figure (their rig, in their gear) standing large in the middle of the screen
// in the rain at the gate, the camera close and low, turning slowly round them. Arrows at the sides (or a swipe,
// or left/right) step to the next warden: the figure changes with a flash, the newcomer flourishing their
// weapon. Under them: the name, the title, a line of who they are, four marks for power, range, speed and
// guard, the mastery and traits learned. A locked warden stands as a black shape with what frees them. Dots
// at the top count the wardens; BEGIN chooses. game.js stages the figure (preview -> titleScene(id, alone))
// and points the camera (selectCam).
import { Screen, PAL, ease, clamp, mix, button, lines, alpha, fit, bar } from './kit.js';
import { icon } from './icons.js';
import { heroColour } from './portraits.js';
import { HEROES, HERO_ORDER } from '../game/heroes.js';
import { challengeList, challengeProgress, rewardOf, masteryInfo } from './data.js';

const RATE = [['power', 'POWER'], ['range', 'RANGE'], ['speed', 'SPEED'], ['guard', 'GUARD']]; // PROPOSAL

export class SelectScreen extends Screen {
  onOpen(d) {
    const M = d.meta || {}; this.ids = HERO_ORDER.slice(); const first = this.ids.findIndex((id) => (M.unlocked || []).includes(id));
    this.idx = Math.max(0, d.hero ? this.ids.indexOf(d.hero) : (M.lastHero && this.ids.includes(M.lastHero) ? this.ids.indexOf(M.lastHero) : first));
    this.drag = 0; this.changeT = 9; this.dir = 0; this.navT = { prev: 9, next: 9 };
    this.call('preview', this.ids[this.idx]); this.flourishT = -1;
  }
  get meta() { return this.data.meta || {}; }
  open_(id) { return (this.meta.unlocked || []).includes(id); }
  unlockChallenges(id) { return challengeList().filter((c) => { const r = rewardOf(c); return r.kind === 'hero' && r.id === id; }); }
  turn(d) {
    const n = this.ids.length; const i = (this.idx + d + n) % n; if (i === this.idx) return;
    this.idx = i; this.changeT = 0; this.dir = d; this.navT[d < 0 ? 'prev' : 'next'] = 0; this.sound('ui'); this.sound('swing', { vol: 0.5 });
    this.call('preview', this.ids[i]); this.flourishT = 0.18;
  }
  onDir(dir) { if (dir[0]) { this.turn(dir[0]); this.focusId = 'begin'; return true; } return false; }
  onTap(id) {
    if (id === 'prev') { this.turn(-1); return; }
    if (id === 'next') { this.turn(1); return; }
    if (id === 'hero') { if (this.open_(this.ids[this.idx])) this.begin(); else this.deny(this.items.find((x) => x.id === 'hero')); return; }
    if (id === 'begin') { this.begin(); return; }
    if (id.startsWith('dot:')) { const i = +id.slice(4); if (i !== this.idx) this.turn(i - this.idx); return; }
    if (id.startsWith('btn:')) { this.sound('uiOk'); this.call(id.slice(4)); }
  }
  begin() {
    const id = this.ids[this.idx]; if (!this.open_(id)) { this.deny(this.items.find((x) => x.id === 'begin')); this.sound('ui'); return; }
    this.flash(0, 0, this.ui ? this.ui.w : 400, this.ui ? this.ui.h : 200, '#ffffff', 0.3); this.shake(2, 0.25); this.sound('special');
    const h = this.figure(); if (h) { h.anim = this.flourishAnim(id); h.animT = 0; }
    this.call('choose', id);
  }
  onBack() { this.call('back'); }
  figure() { const w = this.game && this.game.world; return w && w.hero && w.hero.heroId === this.ids[this.idx] ? w.hero : null; }
  flourishAnim(id) { const A = (HEROES[id] || {}).attack || {}; if (A.combo) return A.combo[A.combo.length - 1].anim; return A.anim || 'idle'; }
  onUpdate(dt, inp) {
    if (inp.dragX) { this.drag += inp.dragX; if (Math.abs(this.drag) > 30) { this.turn(this.drag < 0 ? 1 : -1); this.drag = 0; } } else if (!this.pointer) this.drag = 0;
    if (inp.wheel) this.turn(inp.wheel > 0 ? 1 : -1);
    this.changeT += dt; this.navT.prev += dt; this.navT.next += dt;
    // the newcomer flourishes their weapon, then stands; a locked warden stands as a black shape
    const h = this.figure(); const id = this.ids[this.idx];
    if (h) {
      h.silhouette = !this.open_(id); h.face = Math.PI / 4 + Math.sin(this.t * 0.5) * 0.25;
      if (this.flourishT >= 0) { this.flourishT -= dt; if (this.flourishT < 0 && !h.silhouette) { h.anim = this.flourishAnim(id); h.animT = 0; this.flourishEnd = 0.9; } }
      if (this.flourishEnd > 0) { this.flourishEnd -= dt; if (this.flourishEnd <= 0) { h.anim = 'idle'; h.animT = 0; } }
    }
  }
  render(ui) {
    const t = this.t, M = this.meta; const W = ui.w, H = ui.h; const B = this.box(ui); const cur = this.ids[this.idx]; const col = heroColour(cur); const lock = !this.open_(cur);
    const D = HEROES[cur] || { name: cur, title: '' };
    // the figure stands in the world behind: only shade the sides, the top band and the foot, where the words go
    for (let i = 0; i < 18; i++) { const a = (0.5 * (1 - i / 18)).toFixed(3); ui.rect(i * 3, 0, 3, H, 'rgba(3,4,7,' + a + ')'); ui.rect(W - (i + 1) * 3, 0, 3, H, 'rgba(3,4,7,' + a + ')'); }
    const topH = B.T + 52; for (let i = 0; i < 16; i++) ui.rect(0, topH - 16 + i, W, 1, 'rgba(3,4,7,' + (0.7 * (1 - i / 16)).toFixed(3) + ')'); ui.rect(0, 0, W, topH - 16, 'rgba(3,4,7,0.7)');
    const footY = B.B - 44; for (let i = 0; i < 14; i++) ui.rect(0, footY - 14 + i, W, 1, 'rgba(3,4,7,' + (0.85 * i / 14).toFixed(3) + ')'); ui.rect(0, footY, W, H - footY, 'rgba(3,4,7,0.85)');
    // the header: a dot for each warden (lit: the one shown; dim: locked)
    const n = this.ids.length, dg = 18; const dx0 = Math.round(W / 2 - (n - 1) * dg / 2);
    this.ids.forEach((id, i) => { const x = dx0 + i * dg, y = B.T + 3; const on = i === this.idx; const op = this.open_(id);
      ui.rect(x - (on ? 2 : 1), y - (on ? 2 : 1), on ? 5 : 3, on ? 5 : 3, on ? heroColour(id) : (op ? PAL.soft : PAL.iron3)); this.hit('dot:' + i, x - 9, y - 6, 18, 18, { tick: false, nav: false }); });
    ui.text('CHOOSE YOUR WARDEN', B.L, B.T, { color: PAL.faint, shadow: false }); // PROPOSAL
    // the figure is the button: a tap on it begins (a locked one shakes)
    this.hit('hero', Math.round(W * 0.3), topH, Math.round(W * 0.4), footY - topH, { tick: false, nav: false });
    // the arrows: big chevrons at the sides, a nudge when used
    const ay = Math.round((topH + footY) / 2);
    for (const [id, sx] of [['prev', -1], ['next', 1]]) {
      const nt = this.navT[id]; const push = nt < 0.18 ? Math.round(Math.sin(nt / 0.18 * Math.PI) * 4) * sx : 0; const bob = Math.round(Math.sin(t * 3 + (sx > 0 ? 1 : 0)) * 1.5) * sx;
      const cx = (sx < 0 ? B.L + 16 : B.R - 16) + push + bob; const st = this.hit(id, sx < 0 ? 0 : W - 60, topH - 10, 60, footY - topH + 10, { tick: true });
      const c = st.hover || nt < 0.2 ? PAL.goldHi : PAL.soft; const s = 12;
      for (let k = 0; k < s; k++) { const dx = sx * (s - k) * 0.9; ui.rect(Math.round(cx + dx - 2 * sx), ay - k, 3, 1, c); ui.rect(Math.round(cx + dx - 2 * sx), ay + k, 3, 1, c); }
      for (let k = 0; k < s - 4; k++) { const dx = sx * (s - 4 - k) * 0.9; ui.rect(Math.round(cx + dx - 2 * sx - 6 * sx), ay - k, 2, 1, mix(c, '#000000', 0.5)); ui.rect(Math.round(cx + dx - 2 * sx - 6 * sx), ay + k, 2, 1, mix(c, '#000000', 0.5)); }
    }
    // the words, sliding in with each change: the name and title over the figure, who they are under it
    const k = ease.out(clamp(this.changeT / 0.3)); const slide = Math.round((1 - k) * 18 * (this.dir || 1));
    alpha(ui, k, () => {
      const cx = W / 2 + slide; let y = B.T + 11;
      const name = lock ? '? ? ?' : D.name; const sc = ui.measure(name, 3) <= W - 140 ? 3 : 2;
      ui.text(name, cx, y, { align: 'center', scale: sc, color: lock ? PAL.dim : '#ffffff' }); y += sc * 7 + 3;
      const lw = Math.round(ui.measure(name, sc) * clamp(this.changeT / 0.4)); ui.rect(Math.round(cx - lw / 2), y - 2, lw, 1, lock ? PAL.iron3 : col);
      ui.text(lock ? 'LOCKED' : fit(ui, D.title || '', W - 140), cx, y + 1, { align: 'center', color: lock ? PAL.bad : col, shadow: false });
      let fy = footY + 2; const tw = Math.min(W - 40, 340);
      if (!lock) {
        const L = lines(ui, D.blurb || '', tw, 1); ui.text(L[0] || '', cx, fy, { align: 'center', color: PAL.dim, shadow: false }); fy += 10;
        // power, range, speed, guard: five marks each; the mastery at the end of the row
        const R = D.rating || {}; const cw = 62; const mw = 70; const x0 = Math.round(cx - (RATE.length * cw + mw) / 2);
        RATE.forEach(([key, label], i) => { const x = x0 + i * cw; ui.text(label, x, fy, { color: PAL.faint, shadow: false }); for (let j = 0; j < 5; j++) ui.rect(x + 32 + j * 5, fy + 1, 4, 5, j < (R[key] || 0) ? col : PAL.iron2); });
        const m = masteryInfo(M, cur); const mx = x0 + RATE.length * cw; ui.text('MASTERY ' + m.level, mx, fy, { color: PAL.soft, shadow: false }); bar(ui, mx, fy + 8, 60, 2, m.frac, col);
      } else {
        const C = this.unlockChallenges(cur);
        if (!C.length) ui.text('FREE THEM ON THE ROAD', cx, fy, { align: 'center', color: PAL.dim, shadow: false }); // PROPOSAL
        for (const c of C.slice(0, 2)) { const p = challengeProgress(c, M); const L = lines(ui, c.desc || c.title || '', tw - 50, 1);
          ui.text(L[0] || '', cx - 26, fy, { align: 'center', color: p.done ? PAL.ok : PAL.soft, shadow: false });
          bar(ui, Math.round(cx - 26 + Math.min(ui.measure(L[0] || ''), tw - 50) / 2 + 6), fy + 2, 40, 2, p.n / p.of, p.done ? PAL.ok : PAL.gold); fy += 10; }
      }
    });
    // the buttons along the foot
    const bh = 16; const by = B.B - bh;
    const btns = [['challenges', 'CHALLENGES', 'cup'], ['codex', 'CODEX', 'book']]; // PROPOSAL
    let bx = B.L; for (const [id, label, ic] of btns) { const w = ui.measure(label) + 22; const st = this.hit('btn:' + id, bx, by, w, bh); button(ui, { x: bx, y: by, w, h: bh }, label, st, { icon: (u, x, y) => icon(u, ic, x, y, PAL.soft) }); bx += w + 4; }
    const bw = 96; const st = this.hit('begin', B.R - bw, by, bw, bh, { disabled: lock });
    button(ui, { x: B.R - bw, y: by, w: bw, h: bh }, lock ? 'LOCKED' : 'BEGIN', st, { primary: !lock, icon: lock ? (u, x, y) => icon(u, 'lock', x, y, PAL.faint) : null }); // PROPOSAL
  }
}
