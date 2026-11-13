// The menu at a lit lamp: switch hero, spend skill points, temper and change weapons, wear relics, buy
// from the merchant, travel to districts already reached. Keyboard (arrows, Q/E for tabs), pad and touch.
import { HEROES, HERO_ORDER, WEAPONS, RELICS, MAX_RANK, upgradeCost, upgradeMul, MAX_PLUS, xpFor } from './heroes.js';
import { skillRows, useSkillRow, shopStock, buy, upgradeWeapon, toggleRelic, relicSlots } from './progress.js';
import { DISTRICTS } from './story.js';
import { COL } from '../engine/ui.js';
import LEVELS from '../world/levels/index.js';

const TABS = ['HERO', 'SKILLS', 'ARMS', 'RELICS', 'SHOP', 'MAP'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export class LampMenu {
  constructor(game) { this.g = game; this.tab = 1; this.sel = 0; this.scroll = 0; this.rects = []; this.msg = ''; this.msgT = 0; }

  items() {
    const g = this.g, S = g.save, P = S.heroes[S.hero], H = HEROES[S.hero];
    const done = (m) => { this.say(m); g.persist(); g.refreshHero(); };
    switch (TABS[this.tab]) {
      case 'HERO': return HERO_ORDER.map((id) => {
        const X = HEROES[id]; const open = S.unlocked.includes(id); const L = S.heroes[id];
        return { label: X.name + (S.hero === id ? ' *' : ''), note: open ? 'LV' + L.level : 'LOCKED', disabled: !open || S.hero === id, desc: X.title + '. ' + (open ? X.blurb : 'JOINS YOU AFTER LANTERN ROW.'),
          act: () => { S.hero = id; done(X.name + ' TAKES UP THE LAMP'); } };
      });
      case 'SKILLS': return skillRows(S).map((r) => ({
        label: r.name.replace('ULTIMATE: ', 'ULT ') + ' ' + (r.rank ? ROMAN[r.rank] : '-') + (r.slot >= 0 ? ' [' + (r.slot + 1) + ']' : ''),
        note: r.locked ? 'LV' + r.needLevel : (r.rank > 0 && !r.ult && r.slot < 0 ? 'EQUIP' : (P.points > 0 && r.rank < MAX_RANK ? (r.rank ? 'RANK UP' : 'LEARN') : '')),
        desc: r.desc + (r.rank >= MAX_RANK ? ' MASTERED.' : ' EACH RANK: MORE DAMAGE, SHORTER COOLDOWN.'),
        act: () => done(useSkillRow(S, r)),
      }));
      case 'ARMS': {
        const plus = (P.plus || {})[P.weapon] || 0; const c = upgradeCost(P.weapon, plus);
        const rows = [{ label: 'TEMPER ' + WEAPONS[P.weapon].name, note: plus >= MAX_PLUS ? 'MAX' : c + ' E', disabled: plus >= MAX_PLUS || S.embers < c,
          desc: 'THE SMITH AT THE LAMP: +' + plus + ' NOW. EACH TEMPER ADDS 5% DAMAGE.', act: () => done(upgradeWeapon(S)) }];
        for (const id of P.owned) {
          const W = WEAPONS[id]; const p = (P.plus || {})[id] || 0;
          rows.push({ label: W.name + (p ? ' +' + p : '') + (P.weapon === id ? ' *' : ''), note: 'X' + (W.dmg * upgradeMul(p)).toFixed(2), disabled: P.weapon === id,
            desc: W.desc + ' DAMAGE X' + (W.dmg * upgradeMul(p)).toFixed(2) + '.', act: () => { P.weapon = id; done('EQUIPPED ' + W.name); } });
        }
        return rows;
      }
      case 'RELICS': {
        const slots = relicSlots(S);
        if (!S.relicsOwned.length) return [{ label: 'NO RELICS YET', disabled: true, desc: 'RELICS COME FROM CHESTS, BOSSES AND THE MERCHANT. YOU CAN WEAR ' + slots + '.' }];
        return S.relicsOwned.map((id) => ({ label: RELICS[id].name + (S.relicsOn.includes(id) ? ' *' : ''), note: S.relicsOn.includes(id) ? 'ON' : '', desc: RELICS[id].desc + ' (WEAR UP TO ' + slots + ')',
          act: () => done(toggleRelic(S, id)) }));
      }
      case 'SHOP': {
        const stock = shopStock(S, g.levelId);
        if (!stock.length) return [{ label: 'SOLD OUT', disabled: true, desc: 'THE MERCHANT HAS NOTHING MORE FOR YOU HERE.' }];
        return stock.map((it) => ({ label: it.name, note: it.price + ' E', disabled: S.embers < it.price, desc: it.desc, act: () => done(buy(S, it, g.levelId)) }));
      }
      case 'MAP': return DISTRICTS.filter((id) => S.visited.includes(id)).map((id) => {
        const n = DISTRICTS.indexOf(id) + 1;
        return { label: ROMAN[n] + ' ' + LEVELS[id].name.toUpperCase(), note: id === g.levelId ? 'HERE' : (S.bosses[id] ? 'CLEARED' : ''), disabled: id === g.levelId,
          desc: (LEVELS[id].tagline || '') + (S.bosses[id] ? ' (THE WANDERING HUSHED RETURN: GOOD FOR EMBERS.)' : ''), act: () => { this.g.travel(id); } };
      });
    }
    return [];
  }

  say(m) { this.msg = m || ''; this.msgT = 2.2; }

  update(dt, inp) {
    const g = this.g; this.msgT -= dt;
    let items = this.items();
    if (inp.left || inp.tabL) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.sel = 0; this.scroll = 0; g.sound.play('ui'); items = this.items(); }
    if (inp.right || inp.tabR) { this.tab = (this.tab + 1) % TABS.length; this.sel = 0; this.scroll = 0; g.sound.play('ui'); items = this.items(); }
    if (inp.up) { this.sel = (this.sel + items.length - 1) % Math.max(1, items.length); g.sound.play('ui'); }
    if (inp.down) { this.sel = (this.sel + 1) % Math.max(1, items.length); g.sound.play('ui'); }
    let pick = inp.confirm ? this.sel : -1;
    for (const tp of inp.taps) for (const r of this.rects) if (tp.x >= r.x && tp.x <= r.x + r.w && tp.y >= r.y && tp.y <= r.y + r.h) {
      if (r.tab !== undefined) { this.tab = r.tab; this.sel = 0; this.scroll = 0; g.sound.play('ui'); }
      else if (r.leave) return 'leave';
      else if (r.i !== undefined) { if (this.sel === r.i) pick = r.i; else { this.sel = r.i; g.sound.play('ui'); } }
    }
    if (inp.back) return 'leave';
    this.sel = Math.min(this.sel, Math.max(0, items.length - 1));
    if (pick >= 0 && items[pick]) { if (items[pick].disabled) g.sound.play('ui'); else { g.sound.play('uiOk'); items[pick].act(); } }
    return null;
  }

  draw(ui) {
    const g = this.g, S = g.save, P = S.heroes[S.hero], H = HEROES[S.hero];
    const W = ui.w, Hh = ui.h; const pw = Math.min(W - 12, 380), ph = Math.min(Hh - 16, 186); const x0 = Math.round((W - pw) / 2), y0 = Math.round((Hh - ph) / 2);
    ui.rect(0, 0, W, Hh, 'rgba(0,0,0,0.45)'); ui.frame(x0, y0, pw, ph, 'rgba(8,10,14,0.92)', '#4a4030');
    this.rects = [];
    // tabs
    let tx = x0 + 6; const tw = Math.floor((pw - 12) / TABS.length);
    TABS.forEach((t, i) => { const on = i === this.tab; if (on) ui.rect(tx, y0 + 3, tw - 2, 11, '#2a2018'); ui.text(t, tx + (tw - 2) / 2, y0 + 5, { align: 'center', color: on ? COL.gold : COL.dim, shadow: false }); this.rects.push({ x: tx, y: y0, w: tw, h: 15, tab: i }); tx += tw; });
    ui.rect(x0 + 4, y0 + 15, pw - 8, 1, '#4a4030');
    // hero summary line
    const xpNeed = xpFor(P.level);
    ui.text(H.name + ' LV' + P.level, x0 + 6, y0 + 19, { color: COL.white });
    ui.bar(x0 + 6 + ui.measure(H.name + ' LV' + P.level) + 4, y0 + 21, 40, 2, P.xp / xpNeed, '#d8b860', '#1a160c');
    ui.text((P.points ? P.points + ' POINTS  ' : '') + S.embers + ' EMBERS', x0 + pw - 6, y0 + 19, { align: 'right', color: COL.gold });
    // list
    const items = this.items(); const lh = 11; const listY = y0 + 31; const listH = ph - 31 - 30; const rowsFit = Math.max(3, Math.floor(listH / lh));
    if (this.sel < this.scroll) this.scroll = this.sel; if (this.sel >= this.scroll + rowsFit) this.scroll = this.sel - rowsFit + 1;
    const listW = Math.round(pw * 0.62);
    items.slice(this.scroll, this.scroll + rowsFit).forEach((it, k) => {
      const i = this.scroll + k; const y = listY + k * lh; const on = i === this.sel;
      if (on) ui.rect(x0 + 4, y - 2, listW, lh, '#1e1812');
      ui.text(it.label, x0 + 12, y, { color: it.disabled ? '#5a564e' : (on ? COL.white : COL.text), shadow: false });
      if (it.note) ui.text(it.note, x0 + listW, y, { align: 'right', color: it.disabled ? '#5a4a3a' : COL.gold, shadow: false });
      if (on) ui.text('>', x0 + 6, y, { color: COL.red, shadow: false });
      this.rects.push({ x: x0 + 4, y: y - 2, w: listW, h: lh, i });
    });
    if (items.length > rowsFit) ui.text((this.scroll + 1) + '-' + Math.min(items.length, this.scroll + rowsFit) + '/' + items.length, x0 + 12, listY + rowsFit * lh, { color: COL.dim, shadow: false });
    // description
    const it = items[this.sel]; const dx = x0 + listW + 10, dw = pw - listW - 16;
    if (it && it.desc) ui.wrap(it.desc, dw).slice(0, 9).forEach((l, k) => ui.text(l, dx, listY + k * 9, { color: COL.dim, shadow: false }));
    // footer: message, hints, leave
    if (this.msgT > 0) ui.text(this.msg, x0 + 6, y0 + ph - 24, { color: COL.gold });
    const hint = ui.touchMode ? 'TAP A TAB, TAP TWICE TO CHOOSE' : 'ARROWS  Q/E TABS  ENTER CHOOSE  ESC LEAVE';
    ui.text(hint, x0 + 6, y0 + ph - 11, { color: '#5a564e', shadow: false });
    const lw = ui.measure('LEAVE') + 10; ui.frame(x0 + pw - lw - 4, y0 + ph - 15, lw, 12, '#2a1418', '#6a3a30'); ui.text('LEAVE', x0 + pw - lw / 2 - 4, y0 + ph - 12, { align: 'center', color: COL.white, shadow: false });
    this.rects.push({ x: x0 + pw - lw - 4, y: y0 + ph - 15, w: lw, h: 12, leave: true });
  }
}
