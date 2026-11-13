// The Haven's menu, beside the kneeling warden: switch warden, spend skill points, temper and change
// weapons, wear relics, buy from the merchant, pick a district on the map; ONWARD sets out for the next.
// Keyboard (arrows, Q/E for tabs, Esc jumps to ONWARD), pad and touch. Every choice tells the Haven what
// happened (react(kind, ok)) so the fire, the warden and the sound can answer it.
import { HEROES, HERO_ORDER, WEAPONS, RELICS, MAX_RANK, upgradeCost, upgradeMul, MAX_PLUS, xpFor } from './heroes.js';
import { skillRows, useSkillRow, shopStock, buy, upgradeWeapon, toggleRelic, relicSlots } from './progress.js';
import { DISTRICTS } from './story.js';
import { COL } from '../engine/ui.js';
import LEVELS from '../world/levels/index.js';

export const TABS = ['HERO', 'SKILLS', 'ARMS', 'RELICS', 'SHOP', 'MAP'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const FAIL = /^(NOT ENOUGH|NO SKILL|REACH LEVEL|ALREADY|FULLY)/;

export class LampMenu {
  constructor(game) { this.g = game; this.tab = 1; this.sel = 0; this.scroll = 0; this.rects = []; this.msg = ''; this.msgT = 0; this.ask = false; }

  reset(tab = 1) { this.tab = tab; this.sel = 0; this.scroll = 0; this.msg = ''; this.msgT = 0; this.ask = false; }

  // The shop and the map read the district ahead (the Haven sits between districts).
  district() { return this.g.shopDistrict ? this.g.shopDistrict() : this.g.levelId; }

  items() {
    const g = this.g, S = g.save, P = S.heroes[S.hero];
    // run a choice: say what happened, save, rebuild the hero, and let the Haven answer it
    const done = (m, kind) => { const ok = !FAIL.test(m || ''); this.say(m, ok); g.persist(); g.refreshHero(); if (g.haven) g.haven.react(kind, ok); };
    switch (TABS[this.tab]) {
      case 'HERO': return HERO_ORDER.map((id) => {
        const X = HEROES[id]; const open = S.unlocked.includes(id); const L = S.heroes[id];
        return { label: X.name + (S.hero === id ? ' *' : ''), note: open ? 'LV' + L.level : 'LOCKED', disabled: !open || S.hero === id, desc: X.title + '. ' + (open ? X.blurb : 'JOINS YOU AFTER LANTERN ROW.'),
          act: () => { S.hero = id; done(X.name + ' RESTS HERE', 'hero'); } };
      });
      case 'SKILLS': return skillRows(S).map((r) => ({
        label: r.name.replace('ULTIMATE: ', 'ULT ') + ' ' + (r.rank ? ROMAN[r.rank] : '-'), slot: r.slot,
        note: r.locked ? 'LV' + r.needLevel : (r.rank > 0 && !r.ult && r.slot < 0 ? 'EQUIP' : (P.points > 0 && r.rank < MAX_RANK ? (r.rank ? 'RANK UP' : 'LEARN') : '')),
        desc: r.desc + (r.slot >= 0 ? ' SLOT ' + (r.slot + 1) + ': FIRES FROM YOUR ATTACK.' : '') + (r.rank >= MAX_RANK ? ' MASTERED.' : (r.ult ? ' RANKS: MORE DAMAGE.' : ' RANKS: MORE DAMAGE, LESS COOLDOWN.')),
        act: () => { const equip = !r.ult && r.rank > 0 && r.slot < 0 && !r.locked; done(useSkillRow(S, r), equip ? 'equip' : 'skill'); },
      }));
      case 'ARMS': {
        const plus = (P.plus || {})[P.weapon] || 0; const c = upgradeCost(P.weapon, plus);
        const rows = [{ label: 'TEMPER ' + WEAPONS[P.weapon].name, note: plus >= MAX_PLUS ? 'MAX' : c + ' E', disabled: plus >= MAX_PLUS || S.embers < c,
          desc: 'TEMPER IT IN THE FIRE: +' + plus + ' NOW. EACH TEMPER ADDS 5% DAMAGE.', act: () => done(upgradeWeapon(S), 'temper') }];
        for (const id of P.owned) {
          const W = WEAPONS[id]; const p = (P.plus || {})[id] || 0;
          rows.push({ label: W.name + (p ? ' +' + p : '') + (P.weapon === id ? ' *' : ''), note: 'X' + (W.dmg * upgradeMul(p)).toFixed(2), disabled: P.weapon === id,
            desc: W.desc + ' DAMAGE X' + (W.dmg * upgradeMul(p)).toFixed(2) + '.', act: () => { P.weapon = id; done('EQUIPPED ' + W.name, 'weapon'); } });
        }
        return rows;
      }
      case 'RELICS': {
        const slots = relicSlots(S);
        if (!S.relicsOwned.length) return [{ label: 'NO RELICS YET', disabled: true, desc: 'RELICS COME FROM CHESTS, BOSSES AND THE MERCHANT. YOU CAN WEAR ' + slots + '.' }];
        return S.relicsOwned.map((id) => ({ label: RELICS[id].name + (S.relicsOn.includes(id) ? ' *' : ''), note: S.relicsOn.includes(id) ? 'ON' : '', desc: RELICS[id].desc + ' (WEAR UP TO ' + slots + ')',
          act: () => done(toggleRelic(S, id), 'relic') }));
      }
      case 'SHOP': {
        const where = this.district(); const stock = shopStock(S, where);
        if (!stock.length) return [{ label: 'SOLD OUT', disabled: true, desc: 'THE MERCHANT HAS NOTHING MORE FOR YOU UNTIL THE NEXT DISTRICT.' }];
        return stock.map((it) => ({ label: it.name, note: it.price + ' E', disabled: S.embers < it.price, desc: it.desc, act: () => done(buy(S, it, where), 'buy') }));
      }
      case 'MAP': {
        const next = this.district();
        return DISTRICTS.filter((id) => S.visited.includes(id) || id === next).map((id) => {
          const n = DISTRICTS.indexOf(id) + 1;
          return { label: ROMAN[n] + ' ' + LEVELS[id].name.toUpperCase(), note: id === next ? 'NEXT' : (S.bosses[id] ? 'CLEARED' : ''),
            desc: (LEVELS[id].tagline || '') + (S.bosses[id] ? ' (THE WANDERING HUSHED RETURN: GOOD FOR EMBERS.)' : '') + ' CHOOSE IT TO SET OUT.', act: () => { if (g.haven) g.haven.onward(id); } };
        });
      }
    }
    return [];
  }

  say(m, ok = true) { this.msg = m || ''; this.msgT = 2.4; this.msgOk = ok; }
  nextName() { const n = this.district(); return n && LEVELS[n] ? LEVELS[n].name.toUpperCase() : ''; }

  // Returns 'onward' when the warden should set out for the next district.
  update(dt, inp) {
    const g = this.g; this.msgT -= dt;
    let items = this.items(); let tabbed = false; // the row after the last item is the ONWARD button
    const tabTo = (t) => { this.tab = (t + TABS.length) % TABS.length; this.sel = 0; this.scroll = 0; this.ask = false; tabbed = true; g.sound.play('ui'); items = this.items(); };
    if (inp.left || inp.tabL) tabTo(this.tab - 1);
    else if (inp.right || inp.tabR) tabTo(this.tab + 1);
    const m = items.length + 1;
    if (inp.up) { this.sel = (this.sel + m - 1) % m; this.ask = false; g.sound.play('ui'); }
    if (inp.down) { this.sel = (this.sel + 1) % m; this.ask = false; g.sound.play('ui'); }
    // E is both "next tab" and "choose" on the keyboard: a frame that changed tab chooses nothing
    let pick = inp.confirm && !tabbed ? this.sel : -1;
    for (const tp of inp.taps) for (const r of this.rects) if (tp.x >= r.x && tp.x <= r.x + r.w && tp.y >= r.y && tp.y <= r.y + r.h) {
      if (r.tab !== undefined) tabTo(r.tab);
      else if (r.onward) return 'onward';
      else if (r.i !== undefined) { if (this.sel === r.i) pick = r.i; else { this.sel = r.i; this.ask = false; g.sound.play('ui'); } }
    }
    // back: the first press puts the cursor on ONWARD and asks, the next one (or ENTER) goes
    if (inp.back) { if (this.sel === items.length && this.ask) return 'onward'; this.sel = items.length; this.ask = true; this.say('AGAIN TO SET OUT'); g.sound.play('ui'); return null; }
    this.sel = Math.min(this.sel, items.length);
    if (pick === items.length) return 'onward';
    if (pick >= 0 && items[pick]) { if (items[pick].disabled) g.sound.play('ui'); else { g.sound.play('uiOk'); items[pick].act(); } }
    return null;
  }

  // the panel's place: the right of the screen, the left left free for the fire and the warden
  layout(ui) {
    const W = ui.w, H = ui.h; const pw = Math.max(172, Math.min(224, Math.round(W * 0.52))); const ph = Math.min(H - 10, 200);
    return { x0: W - pw - 5 - Math.round(ui.safe.r || 0), y0: Math.round((H - ph) / 2), pw, ph };
  }

  // k: how far the panel has slid in (0..1)
  draw(ui, k = 1) {
    const g = this.g, S = g.save, P = S.heroes[S.hero], H = HEROES[S.hero];
    const L = this.layout(ui); const { pw, ph, y0 } = L; const x0 = Math.round(L.x0 + (1 - k) * (pw + 12));
    const ga = ui.g, a0 = ga.globalAlpha; ga.globalAlpha = a0 * Math.min(1, k * 1.4);
    ui.frame(x0, y0, pw, ph, 'rgba(10,9,8,0.86)', '#5a4a32'); ui.rect(x0 + 1, y0 + 1, pw - 2, 1, '#2a2218');
    this.rects = [];
    // tabs: two rows of three
    const tw = Math.floor((pw - 8) / 3);
    TABS.forEach((t, i) => {
      const tx = x0 + 4 + (i % 3) * tw, ty = y0 + 4 + Math.floor(i / 3) * 12; const on = i === this.tab;
      ui.rect(tx + 1, ty, tw - 2, 11, on ? '#3a2a1a' : '#16130f'); if (on) ui.rect(tx + 1, ty + 10, tw - 2, 1, COL.gold);
      ui.text(t, tx + tw / 2, ty + 2, { align: 'center', color: on ? COL.gold : COL.dim, shadow: false });
      this.rects.push({ x: tx, y: ty - 1, w: tw, h: 13, tab: i });
    });
    let y = y0 + 30; ui.rect(x0 + 4, y - 2, pw - 8, 1, '#4a3c28');
    // the warden: name, level, experience, points, embers
    ui.text(H.name + ' LV' + P.level, x0 + 6, y + 1, { color: COL.white, shadow: false });
    const eTxt = String(S.embers); ui.text(eTxt, x0 + pw - 6, y + 1, { align: 'right', color: COL.gold, shadow: false }); ui.emberIcon(x0 + pw - 10 - ui.measure(eTxt), y + 2);
    ui.bar(x0 + 7, y + 12, 44, 2, P.xp / xpFor(P.level), '#d8b860', '#1a160c');
    if (P.points) ui.text(P.points + (P.points > 1 ? ' POINTS' : ' POINT'), x0 + pw - 6, y + 10, { align: 'right', color: Math.floor(g.t * 3) % 2 ? COL.gold : COL.white, shadow: false });
    y += 21; ui.rect(x0 + 4, y - 2, pw - 8, 1, '#4a3c28');
    // the list, then the description of the row under the cursor, then the footer with ONWARD
    const items = this.items(); const lh = 11; const listY = y + 2; const footY = y0 + ph - 17;
    const it = this.sel < items.length ? items[this.sel] : null;
    const descW = pw - 12; const descAll = it && it.desc ? ui.wrap(it.desc, descW) : ui.wrap('LEAVE THE HAVEN FOR ' + this.nextName() + '. THE FIRE WILL BE HERE WHEN YOU COME BACK.', descW);
    // the list takes the rows it needs (at least three), the description what is left (up to six lines)
    const room = footY - 3 - listY - 6; const needRows = Math.max(3, Math.min(items.length, Math.floor((room - 3 * 9) / lh)));
    const maxDesc = Math.max(2, Math.min(6, Math.floor((room - needRows * lh) / 9))); const desc = descAll.slice(0, maxDesc);
    if (descAll.length > desc.length) desc[desc.length - 1] = dots(ui, desc[desc.length - 1], descW); // cut short: say so
    const descY = footY - 3 - Math.max(desc.length, Math.min(maxDesc, 3)) * 9;
    const rowsFit = Math.max(2, Math.floor((descY - 3 - listY) / lh));
    const selRow = Math.min(this.sel, items.length - 1);
    if (selRow < this.scroll) this.scroll = selRow; if (selRow >= this.scroll + rowsFit) this.scroll = selRow - rowsFit + 1;
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, items.length - rowsFit)));
    const listW = pw - 8;
    items.slice(this.scroll, this.scroll + rowsFit).forEach((row, kk) => {
      const i = this.scroll + kk; const ry = listY + kk * lh; const on = i === this.sel;
      if (on) { ui.rect(x0 + 4, ry - 2, listW, lh, '#241c14'); ui.rect(x0 + 4, ry - 2, 1, lh, COL.red); }
      const noteW = row.note ? ui.measure(row.note) + 4 : 0; let lx = x0 + 9;
      if (row.slot !== undefined && row.slot >= 0) { ui.rect(lx - 1, ry - 1, 7, 9, on ? COL.gold : '#6a5838'); ui.text(String(row.slot + 1), lx + 3, ry, { align: 'center', color: '#120e0a', shadow: false }); }
      if (row.slot !== undefined) lx += 9;
      ui.text(fit(ui, row.label, x0 + 4 + listW - 3 - noteW - lx), lx, ry, { color: row.disabled ? '#5a564e' : (on ? COL.white : COL.text), shadow: false });
      if (row.note) ui.text(row.note, x0 + 4 + listW - 3, ry, { align: 'right', color: row.disabled ? '#5a4a3a' : COL.gold, shadow: false });
      this.rects.push({ x: x0 + 4, y: ry - 2, w: listW, h: lh, i });
    });
    if (items.length > rowsFit) {
      const sh = rowsFit * lh, th = Math.max(4, Math.round(sh * rowsFit / items.length)), ty = listY - 2 + Math.round((sh - th) * this.scroll / Math.max(1, items.length - rowsFit));
      ui.rect(x0 + pw - 3, listY - 2, 1, sh, '#2a2218'); ui.rect(x0 + pw - 3, ty, 1, th, '#8a7450');
    }
    ui.rect(x0 + 4, descY - 3, pw - 8, 1, '#3a2e20');
    desc.forEach((l, kk) => ui.text(l, x0 + 6, descY + kk * 9, { color: COL.dim, shadow: false }));
    // footer: the last message (or where ONWARD leads) and the ONWARD button
    const ow = ui.measure('ONWARD') + 14, ox = x0 + pw - ow - 4, onSel = this.sel === items.length;
    const pulse = onSel ? 0.75 + 0.25 * Math.sin(g.t * 6) : 1;
    ui.frame(ox, footY, ow, 13, onSel ? '#4a1c18' : '#2a1414', onSel ? COL.gold : '#7a4a34');
    ga.globalAlpha = a0 * Math.min(1, k * 1.4) * pulse;
    ui.text('ONWARD', ox + ow / 2 - 3, footY + 3, { align: 'center', color: onSel ? COL.white : COL.text, shadow: false }); ui.text('>', ox + ow - 8, footY + 3, { color: COL.red, shadow: false });
    ga.globalAlpha = a0 * Math.min(1, k * 1.4);
    this.rects.push({ x: ox - 2, y: footY - 2, w: ow + 4, h: 17, onward: true });
    const msgW = ox - x0 - 10;
    if (this.msgT > 0) { // a message too long for one line takes two, beside the button
      const col = this.msgOk === false ? '#c87060' : COL.gold; const ml = ui.measure(this.msg) <= msgW ? [this.msg] : ui.wrap(this.msg, msgW).slice(0, 2);
      if (ml.length === 1) ui.text(fit(ui, ml[0], msgW), x0 + 6, footY + 3, { color: col, shadow: false });
      else ml.forEach((l, kk) => ui.text(fit(ui, l, msgW), x0 + 6, footY - 1 + kk * 8, { color: col, shadow: false }));
    }
    else { const nx = 'NEXT: ' + this.nextName(); ui.text(fit(ui, ui.measure(nx) <= msgW ? nx : this.nextName(), msgW), x0 + 6, footY + 3, { color: '#7a7262', shadow: false }); }
    ga.globalAlpha = a0;
  }
}

// the last line of a description that did not fit: whole words, then three dots
function dots(ui, s, w) { s = String(s).trimEnd(); while (s.length && ui.measure(s + '...') > w) { const k = s.lastIndexOf(' '); s = k > 0 ? s.slice(0, k) : s.slice(0, -1); } return s + '...'; }
// cut a label down to a width (in buffer pixels) with a trailing dot
function fit(ui, s, w) { s = String(s); if (ui.measure(s) <= w) return s; while (s.length > 1 && ui.measure(s + '.') > w) s = s.slice(0, -1); return s.trimEnd() + '.'; }
