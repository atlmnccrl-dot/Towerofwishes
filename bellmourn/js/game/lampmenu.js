// The Haven's menu, beside the kneeling warden. Touch first: a rail of seven big sections on the left
// (WARDEN, SKILLS, GEAR, ECHOES, MERCHANT, MAP, BESTIARY), one section open at a time in the panel on the right with a few
// large rows, each saying what it is and what choosing it costs; one tap selects a row, the button under
// the list does it (its label says what will happen and for how much), and ONWARD sets out. The fire and
// the kneeling warden stay in view between the two. Keyboard: Q/E or left/right change section, up/down
// pick a row, Enter does it, Esc goes to ONWARD (again to set out). Pad: LB/RB, A, B. Every choice tells
// the Haven what happened (react(kind, ok)) so the fire, the warden and the sound can answer it.
import { HEROES, HERO_ORDER, WEAPONS, RELICS, ECHOES, ECHO_ORDER, JOINS, MAX_RANK, upgradeCost, upgradeMul, MAX_PLUS, xpFor, MAX_LEVEL } from './heroes.js';
import { skillRows, useSkillRow, shopStock, buy, upgradeWeapon, toggleRelic, relicSlots, toggleEcho, echoSlots, echoLevel, trueEndingCount, trueEndingReady, DISTRICT_BOSS } from './progress.js';
import { DISTRICTS } from './story.js';
import { COL } from '../engine/ui.js';
import LEVELS from '../world/levels/index.js';
import { FOES, BOSSES } from './defs.js';
import { UNITS } from './units.js';
import { BOSSES2 } from './bosses2.js';
import { HOME, BESTIARY_TEXT, DASH_BREAKS } from './units2.js';

export const SECTIONS = ['WARDEN', 'SKILLS', 'GEAR', 'ECHOES', 'MERCHANT', 'MAP', 'BESTIARY'];
export const SKILLS = 1;
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const FAIL = /^(NOT ENOUGH|NO SKILL|REACH LEVEL|ALREADY|FULLY|NOT YET)/;
const ROW_H = 22, HEAD_H = 11, BTN_H = 22;
const KIND = { weapon: 'WEAPON', relic: 'RELIC', tonic: 'ONE MORE FLASK', tome: 'ONE SKILL POINT' };
const inR = (r, p) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export class LampMenu {
  constructor(game) { this.g = game; this.sec = SKILLS; this.sel = 0; this.scroll = 0; this.rects = {}; this.msg = ''; this.msgT = 0; this.ask = false; this.flash = 0; }

  get tab() { return this.sec; } // the guide (haven.js) reads which section is open
  reset(sec = SKILLS) { this.open(sec, true); this.msg = ''; this.msgT = 0; }
  open(sec, quiet) { this.sec = (sec + SECTIONS.length) % SECTIONS.length; this.sel = this.firstRow(); this.scroll = 0; this.ask = false; this.follow = true; if (!quiet) this.g.sound.play('ui'); }

  // The merchant and the map read the district ahead (the Haven sits between districts).
  district() { return this.g.shopDistrict ? this.g.shopDistrict() : this.g.levelId; }
  nextName() { const n = this.district(); return n && LEVELS[n] ? LEVELS[n].name.toUpperCase() : ''; }

  // The open section's rows. A row: label, sub (a dim second line), note (the short cost or state on the
  // right), verb (what the button says it will do; with cost), why (said instead when it cannot be done),
  // desc (the longer line under the list), act(). head: a divider that cannot be chosen.
  rows() {
    const g = this.g, S = g.save, P = S.heroes[S.hero];
    // run a choice: say what happened, save, rebuild the hero, and let the Haven answer it
    const done = (m, kind) => { const ok = !FAIL.test(m || ''); this.say(m, ok); g.persist(); g.refreshHero(); if (g.haven) g.haven.react(kind, ok); };
    const E = (n) => n + ' E';
    switch (SECTIONS[this.sec]) {
      case 'WARDEN': {
        const rows = HERO_ORDER.map((id) => {
          const X = HEROES[id]; const open = S.unlocked.includes(id); const L = S.heroes[id] || { level: 1 }; const here = S.hero === id; const where = JOINS[id] || 'THE CITY';
          return { label: X.name, sub: open ? X.title : 'JOINS: ' + where, note: here ? 'HERE' : (open ? 'LV' + L.level : 'LOCKED'), noteCol: here ? COL.gold : (open ? COL.text : '#6a625a'), locked: !open,
            verb: 'SWITCH', why: here ? 'RESTING HERE' : (open ? '' : 'JOINS AFTER ' + where), disabled: here || !open,
            desc: open ? X.blurb + ' LEVEL ' + L.level + '.' : X.title + '. JOINS YOU AFTER ' + where + '.', act: () => { S.hero = id; done(X.name + ' RESTS HERE', 'hero'); } };
        });
        rows.push({ head: 'THE NEW SONG' }, trueEndingRow(S));
        return rows;
      }
      case 'SKILLS': return skillRows(S).map((r) => {
        const equip = !r.ult && r.rank > 0 && r.slot < 0 && !r.locked; const max = r.rank >= MAX_RANK;
        const name = r.ult ? r.name.replace('ULTIMATE: ', '') : r.name; const slot2 = P.equipped[1] && P.equipped[1] !== r.id ? skillRows(S).find((x) => x.id === P.equipped[1]) : null;
        const row = { label: name, slot: r.slot, ult: r.ult, pips: r.locked ? -1 : r.rank,
          sub: r.locked ? 'UNLOCKS AT LV' + r.needLevel : (r.ult ? 'ULTIMATE' : (r.slot >= 0 ? 'SLOT ' + (r.slot + 1) : (r.rank ? 'NOT IN A SLOT' : 'NOT LEARNED'))),
          desc: r.desc + (r.ult ? ' RANKS ADD DAMAGE.' : ' RANKS ADD DAMAGE AND COOL IT FASTER.') + (equip && slot2 ? ' EQUIP: TAKES SLOT 2 FROM ' + slot2.name + '.' : '') + (r.slot >= 0 ? ' FIRES FROM YOUR ATTACK WHEN READY.' : ''),
          act: () => done(useSkillRow(S, r), equip ? 'equip' : 'skill') };
        if (r.locked) Object.assign(row, { note: 'LV' + r.needLevel, noteCol: '#6a625a', disabled: true, why: 'REACH LV' + r.needLevel });
        else if (equip) Object.assign(row, { note: 'EQUIP', verb: 'EQUIP IN SLOT 2' });
        else if (max) Object.assign(row, { note: 'MAX', disabled: true, why: 'MASTERED' });
        else Object.assign(row, { note: '1 PT', noteCol: P.points > 0 ? COL.gold : '#6a625a', verb: (r.rank ? 'RANK UP' : 'LEARN') + '  1 PT', disabled: P.points <= 0, why: 'NO SKILL POINTS' });
        return row;
      });
      case 'GEAR': {
        const plus = (P.plus || {})[P.weapon] || 0; const c = upgradeCost(P.weapon, plus); const W0 = WEAPONS[P.weapon];
        const rows = [{ head: 'WEAPON' }, { label: 'TEMPER', sub: W0.name + ' +' + plus, note: plus >= MAX_PLUS ? 'MAX' : E(c), noteCol: plus < MAX_PLUS && S.embers < c ? '#c87060' : COL.gold,
          verb: 'TEMPER  ' + E(c), disabled: plus >= MAX_PLUS || S.embers < c, why: plus >= MAX_PLUS ? 'FULLY TEMPERED' : 'NEED ' + E(c), temper: true,
          desc: 'TEMPER THE WEAPON IN YOUR HAND: +5% DAMAGE EACH TIME, UP TO +' + MAX_PLUS + '.', act: () => done(upgradeWeapon(S), 'temper') }];
        for (const id of P.owned) {
          const W = WEAPONS[id]; const p = (P.plus || {})[id] || 0; const inHand = P.weapon === id; const m = 'X' + (W.dmg * upgradeMul(p)).toFixed(2);
          rows.push({ label: W.name + (p ? ' +' + p : ''), sub: 'DAMAGE ' + m, note: inHand ? 'IN HAND' : 'EQUIP', noteCol: inHand ? COL.gold : COL.text, verb: 'EQUIP', disabled: inHand, why: 'IN YOUR HAND',
            desc: W.desc + ' DAMAGE ' + m + '.', act: () => { P.weapon = id; done('EQUIPPED ' + W.name, 'weapon'); } });
        }
        const slots = relicSlots(S); const worn = S.relicsOn.slice(0, slots).filter(Boolean);
        rows.push({ head: 'RELICS  ' + worn.length + '/' + slots + ' WORN' });
        if (!S.relicsOwned.length) rows.push({ label: 'NO RELICS YET', sub: 'CHESTS, BOSSES, THE MERCHANT', disabled: true, why: 'NO RELICS YET', desc: 'RELICS COME FROM CHESTS, BOSSES AND THE MERCHANT. YOU CAN WEAR ' + slots + '.' });
        for (const id of S.relicsOwned) {
          const on = S.relicsOn.includes(id); const full = !on && worn.length >= slots; const out = full ? S.relicsOn[slots - 1] : null;
          rows.push({ label: RELICS[id].name, sub: on ? 'WORN' : 'IN YOUR PACK', note: on ? 'WORN' : 'WEAR', noteCol: on ? COL.gold : COL.text, verb: on ? 'TAKE OFF' : (full ? 'SWAP IN' : 'WEAR'),
            desc: RELICS[id].desc + (out ? ' SWAPS OUT ' + RELICS[out].name + '.' : ''), act: () => done(toggleRelic(S, id), 'relic') });
        }
        return rows;
      }
      case 'ECHOES': {
        const slots = echoSlots(S); const on = (S.echoesOn || []).slice(0, slots); const worn = on.filter(Boolean); const owned = S.echoes || [];
        const rows = [{ head: 'WORN ' + worn.length + '/' + slots + '  HEARD ' + owned.length + '/' + ECHO_ORDER.length }];
        for (const t of ECHO_ORDER) {
          const X = ECHOES[t]; const lv = echoLevel(S, t); const isOn = on.includes(t); const full = !isOn && worn.length >= slots; const out = full ? on[slots - 1] : null;
          const where = Object.keys(DISTRICT_BOSS).find((d) => DISTRICT_BOSS[d] === t); const place = where && LEVELS[where] ? LEVELS[where].name.toUpperCase() : 'BEYOND THE WALLS';
          if (!lv) { rows.push({ label: '? ? ?', sub: 'NOT YET HEARD', note: '', locked: true, disabled: true, why: 'NOT YET HEARD', desc: 'AN ECHO STILL HELD BY ' + X.from + ', IN ' + place + '.' }); continue; }
          rows.push({ label: X.name + (lv > 1 ? ' +' : ''), sub: (lv > 1 ? 'ASCENDED: ' : 'FROM ') + X.from, note: isOn ? 'WORN' : 'WEAR', noteCol: isOn ? COL.gold : COL.text,
            verb: isOn ? 'SILENCE IT' : (full ? 'SWAP IN' : 'WEAR'),
            desc: X.desc + (lv > 1 ? ' ' + X.up : '') + (out ? ' SWAPS OUT ' + ECHOES[out].name + '.' : ''), act: () => done(toggleEcho(S, t), 'relic') });
        }
        rows.push({ head: 'THE NEW SONG' }, trueEndingRow(S));
        return rows;
      }
      case 'MERCHANT': {
        const where = this.district(); const stock = shopStock(S, where);
        const rows = [{ head: 'STOCKED FOR ' + this.nextName() }];
        if (!stock.length) rows.push({ label: 'SOLD OUT', sub: 'MORE AFTER THE NEXT DISTRICT', disabled: true, why: 'SOLD OUT', desc: 'THE MERCHANT HAS NOTHING MORE FOR YOU UNTIL THE NEXT DISTRICT.' });
        for (const it of stock) rows.push({ label: it.name, sub: KIND[it.kind] || '', note: E(it.price), noteCol: S.embers < it.price ? '#c87060' : COL.gold,
          verb: 'BUY  ' + E(it.price), disabled: S.embers < it.price, why: 'NEED ' + E(it.price), desc: it.desc, act: () => done(buy(S, it, where), 'buy') });
        return rows;
      }
      case 'BESTIARY': return bestiaryRows(S);
      case 'MAP': {
        const next = this.district();
        return DISTRICTS.filter((id) => S.visited.includes(id) || id === next).map((id) => {
          const n = DISTRICTS.indexOf(id) + 1; const cleared = !!S.bosses[id];
          return { label: ROMAN[n] + '  ' + LEVELS[id].name.toUpperCase(), sub: id === next ? 'WHERE ONWARD LEADS' : (cleared ? 'CLEARED: VOICES STILL TO FREE' : 'NOT CLEARED'),
            note: id === next ? 'NEXT' : (cleared ? 'CLEARED' : ''), verb: 'SET OUT',
            desc: (LEVELS[id].tagline || '') + (cleared ? ' THE WANDERING HUSHED RETURN THERE.' : ''), act: () => { if (g.haven) g.haven.onward(id); } };
        });
      }
    }
    return [];
  }

  firstRow() { const rs = this.rows(); const i = rs.findIndex((r) => !r.head); return i < 0 ? 0 : i; }
  say(m, ok = true) { this.msg = m || ''; this.msgT = 2.2; this.msgOk = ok; if (ok) this.flash = 1; }

  // step the selection over the dividers; the slot after the last row is ONWARD
  step(rows, d) {
    const n = rows.length; let i = this.sel;
    for (let k = 0; k <= n; k++) { i = (i + d + n + 1) % (n + 1); if (i === n || !rows[i].head) break; }
    this.sel = i; this.ask = false; this.follow = true; this.g.sound.play('ui');
  }

  // Returns 'onward' when the warden should set out for the next district.
  update(dt, inp) {
    const g = this.g; this.msgT -= dt; this.flash = Math.max(0, this.flash - dt * 2.5);
    let rows = this.rows(); let switched = false;
    if (inp.left || inp.tabL) { this.open(this.sec - 1); switched = true; }
    else if (inp.right || inp.tabR) { this.open(this.sec + 1); switched = true; }
    if (switched) rows = this.rows();
    if (inp.up) this.step(rows, -1);
    if (inp.down) this.step(rows, 1);
    // scrolling the list: a thumb dragged over it, or the mouse wheel
    if (inp.dragY) { this.scroll -= inp.dragY; this.follow = false; }
    if (inp.wheel) { this.scroll += inp.wheel * 0.3; this.follow = false; }
    const R = this.rects;
    for (const tp of inp.taps) {
      const si = (R.secs || []).findIndex((r) => inR(r, tp));
      if (si >= 0) { if (si !== this.sec) this.open(si); return null; }
      if (inR(R.onward, tp)) { g.sound.play('uiOk'); return 'onward'; }
      if (inR(R.go, tp)) { if (this.sel === rows.length) { g.sound.play('uiOk'); return 'onward'; } return this.act(rows[this.sel]); }
      if (inR(R.up, tp)) { this.scroll -= R.listH * 0.7; this.follow = false; g.sound.play('ui'); continue; }
      if (inR(R.down, tp)) { this.scroll += R.listH * 0.7; this.follow = false; g.sound.play('ui'); continue; }
      if (inR(R.list, tp)) for (const r of R.rows || []) if (inR(r, tp) && r.i !== this.sel) { this.sel = r.i; this.ask = false; g.sound.play('ui'); }
    }
    // back: the first press puts the cursor on ONWARD and asks, the next one (or ENTER) goes
    if (inp.back) { if (this.sel === rows.length && this.ask) return 'onward'; this.sel = rows.length; this.ask = true; this.say('AGAIN TO SET OUT'); g.sound.play('ui'); return null; }
    if (this.sel > rows.length || (rows[this.sel] && rows[this.sel].head)) this.sel = this.firstRow();
    // E is both "next section" and "choose" on the keyboard: a frame that changed section chooses nothing
    if (inp.confirm && !switched) { if (this.sel === rows.length) { g.sound.play('uiOk'); return 'onward'; } return this.act(rows[this.sel]); }
    return null;
  }
  act(row) {
    const g = this.g; if (!row || row.head) return null;
    if (row.disabled) { g.sound.play('ui'); this.say(row.why || 'NOT NOW', false); return null; }
    g.sound.play('uiOk'); row.act();
    // a row that went away (a thing bought): stay on the list, never slide onto ONWARD by accident
    const rs = this.rows(); if (this.sel >= rs.length || (rs[this.sel] && rs[this.sel].head)) { let i = Math.min(this.sel, rs.length - 1); while (i > 0 && rs[i].head) i--; this.sel = rs[i] && !rs[i].head ? i : this.firstRow(); }
    return null;
  }

  // Where things go: the rail (left), the panel (right) and the free middle, where the fire, the statue
  // and the kneeling warden are framed (haven.js).
  layout(ui) {
    const W = ui.w, H = ui.h; const sl = Math.round(ui.safe.l || 0), sr = Math.round(ui.safe.r || 0); const use = W - sl - sr;
    const railW = use >= 360 ? 76 : 66, railX = sl + 6;
    const pw = Math.max(172, Math.min(214, Math.round(use * 0.47))); const x0 = W - sr - 6 - pw;
    return { railX, railW, x0, y0: 5, pw, ph: H - 10, freeX0: railX + railW + 2, freeX1: x0 - 2 };
  }

  // k: how far the menu has slid in (0..1); guide: the first-visit guide's step ({text, point, n, of}),
  // point: what it shows ('learn': the button, 'onward': ONWARD)
  draw(ui, k = 1, guide = null) {
    const g = this.g, S = g.save, P = S.heroes[S.hero], X = HEROES[S.hero];
    const L = this.layout(ui); const { pw, ph, y0 } = L; const x0 = Math.round(L.x0 + (1 - k) * (pw + 12)); const rx = Math.round(L.railX - (1 - k) * (L.railW + 12));
    const ga = ui.g, a0 = ga.globalAlpha; ga.globalAlpha = a0 * Math.min(1, k * 1.4);
    const R = this.rects = { secs: [], rows: [] }; const pulse = 0.5 + 0.5 * Math.sin(g.t * 6);
    // ---- the rail: one big button per section
    const NS = SECTIONS.length; const gap = 3; const bh = Math.max(16, Math.min(24, Math.floor((ui.h - 12 - gap * (NS - 1)) / NS)));
    SECTIONS.forEach((s, i) => {
      const y = y0 + 1 + i * (bh + gap); const on = i === this.sec;
      R.secs.push(ui.button(rx, y, L.railW, bh, s, { on, align: 'left' }));
      if (s === 'SKILLS' && P.points > 0) { const t = String(P.points); const bw = ui.measure(t) + 5; ui.rect(rx + L.railW - bw - 3, y + Math.round(bh / 2) - 5, bw, 10, COL.gold); ui.text(t, rx + L.railW - 3 - bw / 2, y + Math.round(bh / 2) - 3, { align: 'center', color: '#1a120a', shadow: false }); }
      if (guide && guide.point === 'learn' && s === 'SKILLS' && !on) { ga.globalAlpha = a0 * pulse; ui.outline(rx - 2, y - 2, L.railW + 4, bh + 4, COL.gold); ga.globalAlpha = a0; }
    });
    // keyboard and pad: what the keys do, under the rail while there is room
    const hy = y0 + 1 + NS * (bh + gap) + 4; const mode = g.inputMode;
    if (mode !== 'touch') {
      const hint = mode === 'pad' ? ['LB RB  SECTION', 'A  CHOOSE', 'B  ONWARD'] : ['Q E  SECTION', 'ENTER  CHOOSE', 'ESC  ONWARD'];
      hint.forEach((l, i) => { if (hy + i * 9 + 7 <= ui.h - 3) ui.text(l, rx + 1, hy + i * 9, { color: '#6a6252', shadow: false }); });
    }
    // ---- the panel
    ui.frame(x0, y0, pw, ph, 'rgba(10,9,8,0.88)', '#5a4a32');
    // header: the warden, their level and experience; the embers
    const hx = x0 + 6; ui.text(X.name + ' LV' + P.level, hx, y0 + 4, { color: COL.white, shadow: false });
    if (P.level < MAX_LEVEL) ui.bar(hx + 1, y0 + 13, Math.min(60, ui.measure(X.name + ' LV' + P.level)), 1, P.xp / xpFor(P.level), '#d8b860', '#1a160c');
    const eTxt = String(S.embers); ui.text(eTxt, x0 + pw - 6, y0 + 4, { align: 'right', color: COL.gold, shadow: false }); ui.emberIcon(x0 + pw - 10 - ui.measure(eTxt), y0 + 5);
    const listY = y0 + 17; ui.rect(x0 + 3, listY - 1, pw - 6, 1, '#3a2e20');
    // footer: the button that does the selected row, and ONWARD
    const fy = y0 + ph - BTN_H - 4; const ow = 66, ox = x0 + pw - ow - 4, cw = ox - x0 - 7;
    const rows = this.rows(); const sel = this.sel < rows.length ? rows[this.sel] : null; const onSel = this.sel === rows.length;
    // the description of the selected row (or where ONWARD leads), above the footer
    // (the first visit's guide speaks here instead, with a little more room)
    const descW = pw - 12; const desc0 = guide ? guide.text : (sel ? (sel.desc || '') : 'LEAVE THE HAVEN FOR ' + this.nextName() + '. THE FIRE WILL BE HERE WHEN YOU COME BACK.');
    const full = rows.reduce((a, r) => a + (r.head ? HEAD_H : ROW_H), 0);
    const listMin = guide ? Math.min(ROW_H, full) : Math.min(full, 3 * ROW_H);
    const maxDesc = Math.max(1, Math.min(4, Math.floor((fy - 4 - listY - listMin - (guide ? 13 : 4)) / 9)));
    let desc = ui.wrap(desc0, descW); if (desc.length > maxDesc) { desc = desc.slice(0, maxDesc); desc[maxDesc - 1] = dots(ui, desc[maxDesc - 1], descW); }
    const descY = fy - 3 - Math.max(desc.length, Math.min(2, maxDesc)) * 9 - (guide ? 9 : 0);
    // ---- the list (scrolls when it does not fit)
    const listH = descY - 4 - listY; R.list = { x: x0 + 2, y: listY, w: pw - 4, h: listH }; R.listH = listH;
    const hs = rows.map((r) => (r.head ? HEAD_H : ROW_H)); const total = hs.reduce((a, b) => a + b, 0);
    const tops = []; let acc = 0; for (const h of hs) { tops.push(acc); acc += h; }
    if (this.follow && sel) { const t = tops[this.sel], b = t + hs[this.sel]; if (t < this.scroll) this.scroll = t - (this.sel > 0 && rows[this.sel - 1].head ? HEAD_H : 0); if (b > this.scroll + listH) this.scroll = b - listH; }
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, total - listH)));
    ga.save(); ga.beginPath(); ga.rect(x0 + 1, listY, pw - 2, listH); ga.clip();
    rows.forEach((row, i) => {
      const ry = Math.round(listY + tops[i] - this.scroll); if (ry + hs[i] < listY || ry > listY + listH) return;
      if (row.head) { ui.text(row.head, x0 + 7, ry + 3, { color: '#9a8458', shadow: false }); ui.rect(x0 + 9 + ui.measure(row.head), ry + 6, x0 + pw - 7 - (x0 + 9 + ui.measure(row.head)), 1, '#3a2e20'); return; }
      this.drawRow(ui, row, x0 + 3, ry, pw - 6, i === this.sel, g.t);
      if (ry + ROW_H > listY && ry < listY + listH) R.rows.push({ x: x0 + 3, y: Math.max(listY, ry), w: pw - 6, h: Math.min(ry + ROW_H, listY + listH) - Math.max(listY, ry), i });
    });
    ga.restore();
    // more above or below: a small arrow on the right edge you can tap to page
    R.up = R.down = null;
    if (this.scroll > 1) { arrow(ui, x0 + pw - 9, listY + 3, -1); R.up = { x: x0 + pw - 22, y: listY, w: 22, h: 16 }; }
    if (this.scroll < total - listH - 1) { arrow(ui, x0 + pw - 9, listY + listH - 6, 1); R.down = { x: x0 + pw - 22, y: listY + listH - 16, w: 22, h: 16 }; }
    if (total > listH) { const th = Math.max(6, Math.round(listH * listH / total)); const ty = listY + Math.round((listH - th) * this.scroll / Math.max(1, total - listH)); ui.rect(x0 + pw - 2, ty, 1, th, '#8a7450'); }
    if (guide) {
      ui.frame(x0 + 3, descY - 3, pw - 6, fy - descY + 1, '#1c160e', '#8a7040');
      ui.text('THE HAVEN ' + guide.n + '/' + guide.of, x0 + 6, descY, { color: '#9a8458', shadow: false });
      desc.forEach((l, kk) => ui.text(l, x0 + 6, descY + 9 + kk * 9, { color: COL.white, shadow: false }));
    } else {
      ui.rect(x0 + 3, descY - 3, pw - 6, 1, '#3a2e20');
      desc.forEach((l, kk) => ui.text(l, x0 + 6, descY + kk * 9, { color: COL.dim, shadow: false }));
    }
    // the button: what choosing the selected row does, or why it cannot; a message after a choice
    let label = sel ? (sel.disabled ? sel.why || '' : sel.verb || '') : 'SET OUT >';
    let col = sel && sel.disabled ? '#7a7062' : COL.white;
    if (this.msgT > 0 && this.msg) { label = ui.measure(this.msg) > cw - 8 && this.msg.includes(':') ? this.msg.split(':')[0] : this.msg; col = this.msgOk === false ? '#e08070' : COL.gold; }
    const goOn = !!sel && !sel.disabled;
    R.go = ui.button(x0 + 4, fy, cw, BTN_H, fit(ui, label, cw - 8), { sel: goOn && (g.inputMode !== 'touch'), color: col, fill: goOn ? '#3a2614' : '#16130f', edge: goOn ? '#b08a48' : '#3a3022', disabled: !goOn && !(this.msgT > 0) });
    if (this.flash > 0) { ga.globalAlpha = a0 * this.flash * 0.5; ui.rect(x0 + 5, fy + 1, cw - 2, BTN_H - 2, '#ffd890'); ga.globalAlpha = a0; }
    if (guide && guide.point === 'learn' && goOn) { ga.globalAlpha = a0 * pulse; ui.outline(x0 + 2, fy - 2, cw + 4, BTN_H + 4, COL.gold); ga.globalAlpha = a0; }
    // ONWARD: always there, always the same place
    const og = onSel || (guide && guide.point === 'onward');
    R.onward = ui.button(ox, fy, ow, BTN_H, 'ONWARD', { fill: og ? '#5a1c18' : '#3a1414', edge: og ? COL.gold : '#9a4a34', color: COL.white, sel: false });
    ui.text('>', ox + ow - 9, fy + Math.round(BTN_H / 2) - 3, { color: og ? COL.gold : COL.red, shadow: false });
    if (og) { ga.globalAlpha = a0 * pulse; ui.outline(ox - 2, fy - 2, ow + 4, BTN_H + 4, COL.gold); ga.globalAlpha = a0; }
    R.onward = { x: ox - 2, y: fy - 3, w: ow + 4, h: BTN_H + 6 };
    ga.globalAlpha = a0;
  }

  // one row: the name and a dim second line on the left, the cost or state on the right
  drawRow(ui, row, x, y, w, on, t) {
    if (on) { ui.rect(x, y, w, ROW_H - 1, '#2a1f14'); ui.rect(x, y, 2, ROW_H - 1, COL.red); ui.outline(x, y, w, ROW_H - 1, '#6a5232'); }
    else ui.rect(x, y + ROW_H - 2, w, 1, '#1e1a14');
    let lx = x + 7;
    if (row.slot !== undefined && row.slot >= 0) { ui.rect(lx, y + 4, 8, 13, on ? COL.gold : '#7a6440'); ui.text(String(row.slot + 1), lx + 4, y + 7, { align: 'center', color: '#120e0a', shadow: false }); lx += 12; }
    else if (row.slot !== undefined) lx += 12;
    if (row.icon) { drawIcon(ui, row.icon, lx - 2, y + 5, row.locked); lx += 14; }
    const noteW = row.note ? ui.measure(row.note) + 6 : 0;
    const dim = row.locked || (row.disabled && !row.note);
    ui.text(fit(ui, row.label, x + w - 5 - noteW - lx), lx, y + 3, { color: dim ? '#6a645a' : (on ? COL.white : COL.text), shadow: false });
    let subW = x + w - 5 - lx;
    if (row.pips !== undefined && row.pips >= 0) { const px = x + w - 5 - (MAX_RANK * 5 - 1); for (let i = 0; i < MAX_RANK; i++) ui.rect(px + i * 5, y + 13, 4, 4, i < row.pips ? COL.gold : '#2e2a22'); subW -= MAX_RANK * 5 + 3; }
    if (row.sub) ui.text(fit(ui, row.sub, subW), lx, y + 12, { color: '#857d6e', shadow: false });
    if (row.note) ui.text(row.note, x + w - 5, y + 3, { align: 'right', color: row.noteCol || COL.gold, shadow: false });
  }
}

// The true ending's readout: how many wardens walk with you and how many Echoes you carry (PROPOSAL text)
function trueEndingRow(S) {
  const c = trueEndingCount(S); const ready = trueEndingReady(S);
  return { label: 'TRUE ENDING', sub: c.wardens + '/' + c.ofWardens + ' WARDENS  ' + c.echoes + '/' + c.ofEchoes + ' ECHOES', note: ready ? 'READY' : '', noteCol: COL.gold, disabled: true,
    why: ready ? 'THE NEW SONG CAN BE SUNG' : c.wardens + '/' + c.ofWardens + ' WARDENS ' + c.echoes + '/' + c.ofEchoes + ' ECHOES',
    desc: ready ? 'ALL SEVEN WARDENS AND EVERY ECHO. AT THE WHEEL, YOU CAN SING.' : 'FIND ALL SEVEN WARDENS AND GATHER EVERY ECHO, AND AT THE WHEEL A NEW SONG CAN BE SUNG.' };
}

// a small pixel arrow: up (-1) or down (1)
function arrow(ui, cx, y, dir) { for (let i = 0; i < 3; i++) ui.rect(cx - i, dir < 0 ? y + i : y + 2 - i, 1 + i * 2, 1, '#c8a868'); }
// the last line of a description that did not fit: whole words, then three dots
export function dots(ui, s, w) { s = String(s).trimEnd().replace(/[.,:]+$/, ''); while (s.length && ui.measure(s + '...') > w) { const k = s.lastIndexOf(' '); s = k > 0 ? s.slice(0, k) : s.slice(0, -1); } return s + '...'; }
// cut a label down to a width (in buffer pixels) with a trailing dot
export function fit(ui, s, w) { s = String(s); if (ui.measure(s) <= w) return s; while (s.length > 1 && ui.measure(s + '.') > w) s = s.slice(0, -1); return s.trimEnd() + '.'; }

// ------------------------------------------------------------------ the bestiary
// Every foe by the district where it first appears (Act I's districts, then Act II's regions), then the
// bosses. A foe met shows its name, how many fell and a line on how it fights; one not met yet is a dark
// silhouette with its name hidden. Rows cannot be chosen into anything: the button says how many fell.
const ROW_ICON = {
  hushed: 'man', ghoul: 'man', crossbow: 'man', acolyte: 'caster', brute: 'brute', warden: 'man', hound: 'hound', rat: 'rat', gargoyle: 'winged',
  bomber: 'man', spitter: 'brute', shade: 'man', chanter: 'caster', sentinel: 'brute', knight: 'man', bat: 'bat', crab: 'crab', frostwolf: 'hound',
  icewraith: 'wraith', yeti: 'brute', scorpion: 'scorpion', sandworm: 'worm', mummy: 'man', bonecaster: 'caster', skeleton: 'man', slime: 'slime',
  slimelet: 'slime', cryptspider: 'spider', imp: 'winged', hellhound: 'hound', cultist: 'caster', demon: 'brute', seraph: 'eye',
};
const ICONS = {
  man: ['....####....', '...######...', '...#o##o#...', '...######...', '....####....', '..########..', '.##.####.##.', '.#..####..#.', '....####....', '....#..#....', '....#..#....', '...##..##...'],
  caster: ['....###...o.', '...#####..#.', '...#o#o#..#.', '...#####..#.', '..#######.#.', '.#########..', '...#####..#.', '...#####..#.', '..#######.#.', '..#######.#.', '.#########..', '.#########..'],
  brute: ['.#........#.', '.##.####.##.', '..########..', '...#o##o#...', '..########..', '.##########.', '############', '##.######.##', '##.######.##', '...######...', '...##..##...', '..###..###..'],
  hound: ['.........##.', '........####', '.#......#o##', '..#.....###.', '...#######..', '..########..', '..########..', '..##....##..', '..#.#...#.#.', '..#.#...#.#.'],
  rat: ['........##..', '.......#o##.', '...######...', '#.#######...', '.#..#..#....'],
  bat: ['#....##....#', '##..####..##', '###.#oo#.###', '############', '.##########.', '..#.####.#..', '.....##.....'],
  crab: ['.o........o.', '.#........#.', '##.######.##', '#.########.#', '..##oo##....', '.##########.', '#.#.#..#.#.#'],
  scorpion: ['.....###....', '....#...#...', '........#...', '.......#....', '..##..##....', '.#o######...', '##########..', '.#.#.#.#....'],
  spider: ['#..#....#..#', '.#..#..#..#.', '..#.####.#..', '...######...', '..########..', '.#.##oo##.#.', '#..######..#', '..#..##..#..', '.#........#.'],
  wraith: ['...######...', '..########..', '..#o####o#..', '..########..', '.##########.', '#.########.#', '..########..', '..#######...', '...#.##.#...', '...#..#.....'],
  worm: ['...#####....', '..#.....#...', '..#.ooo.#...', '..#######...', '...#####....', '...#####....', '....####....', '....####....', '...######...', '.##########.'],
  slime: ['...######...', '..########..', '.##########.', '.###o##o###.', '.##########.', '.##########.', '############'],
  eye: ['#.##....##.#', '.#..#..#..#.', '..#.####.#..', '.##.#oo#.##.', '##..#oo#..##', '.##.####.##.', '..#..##..#..', '.#........#.', '#..........#'],
  winged: ['#...####...#', '##.######.##', '###.#o#o.###', '####.##.####', '.##########.', '...######...', '...######...', '...##..##...', '..###..###..'],
  crown: ['.#..#..#..#.', '.##.####.##.', '.##########.', '............', '...######...', '..#o####o#..', '..########..', '.##########.', '############', '##.######.##', '...##..##...', '..###..###..'],
};
const hex = (n) => '#' + Math.max(0, Math.min(0xffffff, n | 0)).toString(16).padStart(6, '0');
function lighten(n, k = 0.35) { const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const f = (v) => Math.round(v + (255 - v) * k); return (f(r) << 16) | (f(g) << 8) | f(b); }
function bodyColour(look) { const C = look.colors || {}; return C.fur ?? C.shell ?? C.jelly ?? C.robe ?? C.eye ?? C.skin ?? C.stone ?? C.tunic ?? 0x8a8070; }
// a 12x12 pixel silhouette (centred); locked: one dark tone, no eyes
function drawIcon(ui, ic, x, y, locked) {
  const bm = ICONS[ic.shape] || ICONS.man; const oy = Math.floor((12 - bm.length) / 2);
  const body = locked ? '#2c2822' : ic.body, eye = locked ? '#2c2822' : ic.eye;
  ui.rect(x - 1, y - 1, 14, 14, locked ? '#141210' : '#1a1610');
  bm.forEach((line, j) => { for (let i = 0; i < line.length; i++) { const c = line[i]; if (c === '#') ui.rect(x + i, y + oy + j, 1, 1, body); else if (c === 'o') ui.rect(x + i, y + oy + j, 1, 1, eye); } });
}
// which level a tier belongs to (Act I's districts 0-7, Act II's regions 8-11, Act III's 12-14: marsh, spire, empyrean)
function levelOfTier(tier) { for (const id in LEVELS) { const L = LEVELS[id]; if (L.tier === tier && !L.tutorial) return { id, L }; } return null; }

export function bestiaryRows(S) {
  const B = S.bestiary || {}; const visited = S.visited || [];
  const def = (k) => FOES[k] || UNITS[k];
  const rows = []; let met = 0, total = 0;
  const tiers = [...new Set(Object.values(HOME))].sort((a, b) => a - b);
  for (const tier of tiers) {
    const lv = levelOfTier(tier); const types = Object.keys(HOME).filter((k) => HOME[k] === tier && def(k));
    if (!types.length) continue;
    rows.push({ head: ROMAN[tier + 1] + '  ' + (lv ? lv.L.name.toUpperCase() : 'TIER ' + (tier + 1)) });
    for (const k of types) {
      const D = def(k); total++;
      // met: in the bestiary, or (saves from before it) a placed foe of a district already walked
      const known = k in B || (!D.summon && lv && visited.includes(lv.id)); const n = B[k] || 0; if (known) met++;
      const where = lv ? lv.L.name.toUpperCase() : 'THE CITY';
      rows.push({
        label: known ? D.name.toUpperCase() : '? ? ?', sub: known ? ((BESTIARY_TEXT[k] || '').split('. ')[0].replace(/\.$/, '') || 'MET') : 'NOT YET MET',
        note: known ? (n ? 'X' + n : 'MET') : '', noteCol: known ? COL.gold : '#6a625a', locked: !known, disabled: true,
        icon: { shape: ROW_ICON[k] || 'man', body: hex(lighten(bodyColour(D.look))), eye: hex(D.look.eyes || 0xff4030) },
        why: known ? (n ? n + ' FELLED' : 'NOT YET FELLED') : 'NOT YET MET',
        desc: known ? (BESTIARY_TEXT[k] || '') + ((k === 'mummy' || k === 'cryptspider' || k === 'leech') ? ' ' + DASH_BREAKS : '') : 'NOT YET MET. FIRST SEEN IN ' + where + ' (' + ROMAN[tier + 1] + ').',
      });
    }
  }
  // the bosses, district by district
  const bossRows = [];
  for (const id in LEVELS) {
    const L = LEVELS[id]; const type = L.boss && L.boss.type; const D = type && (BOSSES[type] || BOSSES2[type]); if (!D) continue;
    total++; const known = type in B || !!(S.bosses || {})[id]; if (known) met++;
    bossRows.push({ label: known ? D.name.toUpperCase() : '? ? ?', sub: known ? (D.title || '').toUpperCase() : 'NOT YET FACED', note: ROMAN[(L.tier ?? 0) + 1] || '', noteCol: known ? COL.gold : '#6a625a',
      locked: !known, disabled: true, icon: { shape: 'crown', body: hex(lighten(bodyColour(D.look || {}))), eye: hex((D.look && D.look.eyes) || 0xffd060) },
      why: known ? ((S.bosses || {})[id] ? 'FELLED' : 'FACED') : 'NOT YET FACED', desc: known ? (D.title || '').toUpperCase() + '. ' + L.name.toUpperCase() + '.' : 'NOT YET FACED. IT WAITS IN ' + L.name.toUpperCase() + '.' });
  }
  if (bossRows.length) rows.push({ head: 'BOSSES' }, ...bossRows);
  rows.unshift({ head: 'MET ' + met + ' OF ' + total });
  return rows;
}
