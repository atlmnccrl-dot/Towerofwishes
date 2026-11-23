// CodexScreen({ meta }, { back }): everything found across runs, in six tabs: FOES (by the district they
// first walk), BOSSES, BOONS, ECHOES, LORE and ENDINGS. A grid of tiles on the left (a dark ? for what is
// not found yet), the chosen entry on the right. The foe silhouettes and lines come from the old Haven
// bestiary (lampmenu.js), folded in here.
import { Screen, PAL, ease, clamp, iron, backdrop, button, lines, alpha, fit, header, resOf } from './kit.js';
import { icon, sigil, SLOT } from './icons.js';
import { boonList, loreList, endingList } from './data.js';
import { boonText } from './cards.js';
import { ECHOES, ECHO_ORDER } from '../game/heroes.js';
import { FOES, BOSSES } from '../game/defs.js';
import { UNITS } from '../game/units.js';
import { BOSSES2 } from '../game/bosses2.js';
import { HOME, BESTIARY_TEXT } from '../game/units2.js';

const ROW_ICON = {
  hushed: 'man', ghoul: 'man', crossbow: 'man', acolyte: 'caster', brute: 'brute', warden: 'man', hound: 'hound', rat: 'rat', gargoyle: 'winged',
  bomber: 'man', spitter: 'brute', shade: 'man', chanter: 'caster', sentinel: 'brute', knight: 'man', bat: 'bat', crab: 'crab', frostwolf: 'hound',
  icewraith: 'wraith', yeti: 'brute', scorpion: 'scorpion', sandworm: 'worm', mummy: 'man', bonecaster: 'caster', skeleton: 'man', slime: 'slime',
  slimelet: 'slime', cryptspider: 'spider', imp: 'winged', hellhound: 'hound', cultist: 'caster', demon: 'brute', seraph: 'eye',
};
const SIL = {
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
const bodyColour = (look) => { const C = (look && look.colors) || {}; return C.fur ?? C.shell ?? C.jelly ?? C.robe ?? C.eye ?? C.skin ?? C.stone ?? C.tunic ?? 0x8a8070; };
function silhouette(ui, shape, x, y, body, eye, sc = 1) {
  const bm = SIL[shape] || SIL.man; const oy = Math.floor((12 - bm.length) / 2);
  bm.forEach((line, j) => { for (let i = 0; i < line.length; i++) { const c = line[i]; if (c === '#') ui.rect(x + i * sc, y + (oy + j) * sc, sc, sc, body); else if (c === 'o') ui.rect(x + i * sc, y + (oy + j) * sc, sc, sc, eye); } });
}
const TIER_NAME = ['GALLOWS GATE', 'LANTERN ROW', 'MIREWATER DOCKS', 'THE DROWNED NAVE', 'THE UNDERCROFT', 'THE BELL FOUNDRY', 'THE CROWN HEIGHTS', 'THE BELFRY', 'THE FROSTMARCH', 'THE ASH DUNES', 'THE CATACOMBS', 'THE ABYSS', 'THE WEEPING MARSH', 'THE CLOCKWORK SPIRE', 'THE EMPYREAN'];
const TABS = [['foes', 'FOES'], ['bosses', 'BOSSES'], ['boons', 'BOONS'], ['echoes', 'ECHOES'], ['lore', 'LORE'], ['endings', 'ENDINGS']]; // PROPOSAL

export class CodexScreen extends Screen {
  onOpen(d) { this.tab = d.tab || 'foes'; this.sel = 0; this.scroll = 0; this.tabT = 0; this.selT = 0; this.cache = {}; }
  get meta() { return this.data.meta || {}; }
  entries(tab) {
    if (this.cache[tab]) return this.cache[tab];
    const C = this.meta.codex || {}; let E = [];
    if (tab === 'foes') {
      const def = (k) => FOES[k] || UNITS[k];
      E = Object.keys(HOME).filter((k) => def(k) && !def(k).summon).sort((a, b) => HOME[a] - HOME[b]).map((k) => { const D = def(k); const n = (C.foes || {})[k]; const known = n !== undefined;
        return { id: k, known, name: String(D.name || k).toUpperCase(), sub: TIER_NAME[HOME[k]] || '', desc: BESTIARY_TEXT[k] || '', count: n ? 'FELLED ' + n : 'MET', draw: (ui, x, y, sc) => silhouette(ui, ROW_ICON[k] || 'man', x, y, known ? hex(mix2(bodyColour(D.look), 0.35)) : '#2c2822', known ? hex((D.look && D.look.eyes) || 0xff4030) : '#2c2822', sc) }; });
    } else if (tab === 'bosses') {
      const all = { ...BOSSES, ...BOSSES2 };
      E = Object.keys(all).map((k) => { const D = all[k]; const n = (C.bosses || {})[k]; const known = n !== undefined;
        return { id: k, known, name: String(D.name || k).toUpperCase(), sub: String(D.title || '').toUpperCase(), desc: String(D.title || '').toUpperCase(), count: n ? 'FELLED ' + n : 'FACED', draw: (ui, x, y, sc) => silhouette(ui, 'crown', x, y, known ? hex(mix2(bodyColour(D.look), 0.35)) : '#2c2822', known ? hex((D.look && D.look.eyes) || 0xffd060) : '#2c2822', sc) }; });
    } else if (tab === 'boons') {
      E = boonList().map((d) => { const known = !!(C.boons || {})[d.id]; const R = resOf(d.res);
        return { id: d.id, known, name: String(d.name).toUpperCase(), sub: R.name + '  ' + (SLOT[d.slot] || '') + (d.kind === 'duo' ? '  DUO' : d.kind === 'crown' ? '  CROWN' : ''), subCol: R.col, desc: boonText(d, 'common'), count: 'TIER ' + (d.tier || 1), res: d.res, draw: (ui, x, y, sc) => sigil(ui, known ? d.res : 'ember', x + 1 + (sc > 1 ? 3 : 0), y + 1 + (sc > 1 ? 3 : 0), { scale: sc, col: known ? undefined : '#2c2822' }) }; });
    } else if (tab === 'echoes') {
      E = ECHO_ORDER.map((k) => { const D = ECHOES[k]; const known = !!(C.echoes || {})[k];
        return { id: k, known, name: D.name, sub: 'FROM ' + D.from, desc: D.desc + ' ' + D.up, count: known ? 'OWNED' : '', draw: (ui, x, y, sc) => icon(ui, 'bell', x + 2 * sc, y + 2 * sc, known ? PAL.gold : '#2c2822', { scale: sc }) }; });
    } else if (tab === 'lore') {
      E = loreList().map((l) => { const known = !!(C.lore || {})[l.id]; return { id: l.id, known, name: String(l.title || l.id).toUpperCase(), sub: 'A LORE PAGE', desc: String(l.text || '').toUpperCase(), count: '', draw: (ui, x, y, sc) => icon(ui, 'scroll', x + 2 * sc, y + 2 * sc, known ? PAL.parch : '#2c2822', { scale: sc }) }; }); // PROPOSAL
    } else if (tab === 'endings') {
      E = endingList().map((l) => { const known = (C.endings || []).includes(l.id); return { id: l.id, known, name: String(l.title || l.id).toUpperCase(), sub: 'AN ENDING', desc: known ? 'SEEN.' : 'NOT YET SEEN.', count: '', draw: (ui, x, y, sc) => icon(ui, l.id === 'silence' ? 'eclipse' : l.id === 'song' ? 'star' : 'bell', x + 2 * sc, y + 2 * sc, known ? PAL.goldHi : '#2c2822', { scale: sc }) }; }); // PROPOSAL
    }
    return (this.cache[tab] = E);
  }
  onTap(id) {
    if (id === 'back') { this.sound('ui'); this.call('back'); return; }
    if (id.startsWith('tab:')) { this.tab = id.slice(4); this.sel = 0; this.scroll = 0; this.tabT = 0; this.selT = 0; this.sound('ui'); return; }
    if (id.startsWith('entry:')) { const i = +id.slice(6); if (i !== this.sel) { this.sel = i; this.selT = 0; this.sound('ui'); } }
  }
  onBack() { this.call('back'); }
  onUpdate(dt, inp) { this.tabT += dt; this.selT += dt; this.scroll = (this.scroll || 0) - (inp.dragY || 0) + (inp.wheel || 0) * 0.3; }
  render(ui) {
    const t = this.t; const B = this.box(ui); backdrop(ui, t, { veil: this.data.veil, tint: '#1a2030' });
    const E = this.entries(this.tab); const found = E.filter((e) => e.known).length;
    header(ui, B.L, B.T, 'CODEX', found + ' OF ' + E.length + ' FOUND', { maxW: B.R - B.L - 66 }); // PROPOSAL
    const st0 = this.hit('back', B.R - 60, B.T, 60, 18); button(ui, { x: B.R - 60, y: B.T, w: 60, h: 18 }, 'BACK', st0, {});
    let tx = B.L; const ty = B.T + 22;
    for (const [id, label] of TABS) { const w = ui.measure(label) + 10; const on = this.tab === id; const st = this.hit('tab:' + id, tx, ty, w, 16);
      ui.rect(tx, ty, w, 16, on ? '#1a2434' : (st.hover ? '#1a1d24' : PAL.iron0)); ui.rect(tx, ty + 15, w, 1, on ? '#8fd0ff' : PAL.iron2); ui.text(label, tx + w / 2, ty + 5, { align: 'center', color: on ? '#d8f0ff' : PAL.soft, shadow: false }); tx += w + 2; }
    // the grid
    const gy = ty + 21, gh = B.B - gy; const gw = Math.round((B.R - B.L) * 0.5); const ts = 18, gap = 3; const cols = Math.max(1, Math.floor((gw + gap) / (ts + gap))); const rows = Math.ceil(E.length / cols);
    const max = Math.max(0, rows * (ts + gap) - gh); this.scroll = clamp(this.scroll, 0, max);
    const g = ui.g; g.save(); g.beginPath(); g.rect(B.L - 2, gy - 2, gw + 4, gh + 4); g.clip();
    E.forEach((e, i) => {
      const x = B.L + (i % cols) * (ts + gap), y = gy + Math.floor(i / cols) * (ts + gap) - Math.round(this.scroll); if (y < gy - ts || y > B.B) return;
      const k = ease.out(clamp((this.tabT - i * 0.012) / 0.2)); const on = this.sel === i;
      const st = this.hit('entry:' + i, x, y, ts, ts, { tick: false, small: true });
      alpha(ui, k, () => {
        ui.rect(x, y, ts, ts, on ? '#24303e' : (st.hover ? '#1a1f28' : (e.known ? '#12151c' : '#0b0c0f'))); ui.outline(x, y, ts, ts, on ? '#8fd0ff' : (e.known ? PAL.iron2 : PAL.iron1));
        if (e.res && e.known) ui.rect(x + 1, y + ts - 2, ts - 2, 1, resOf(e.res).col);
        if (e.known || this.tab === 'foes' || this.tab === 'bosses') e.draw(ui, x + 3, y + 3, 1); else ui.text('?', x + ts / 2, y + 6, { align: 'center', color: PAL.faint, shadow: false });
      });
    });
    g.restore();
    if (max > 0) { ui.rect(B.L + gw + 3, gy, 2, gh, PAL.iron1); const th = Math.max(8, gh * gh / (rows * (ts + gap))); ui.rect(B.L + gw + 3, gy + (gh - th) * (this.scroll / max), 2, th, PAL.iron4); }
    // the entry
    const px = B.L + gw + 9, pw = B.R - px; const e = E[this.sel];
    iron(ui, px, gy, pw, gh, { fill: '#0d1016' });
    if (e) alpha(ui, ease.out(clamp(this.selT / 0.18)), () => {
      const ix = px + 7, iy = gy + 7; ui.rect(ix, iy, 30, 30, '#07080b'); ui.outline(ix, iy, 30, 30, PAL.iron2); e.draw(ui, ix + 3, iy + 3, 2); if (!e.known && this.tab !== 'foes' && this.tab !== 'bosses') { ui.rect(ix + 1, iy + 1, 28, 28, '#07080b'); ui.text('?', ix + 15, iy + 8, { align: 'center', color: PAL.faint, scale: 2, shadow: false }); }
      const tx2 = ix + 36, tw = pw - 50;
      const nm = lines(ui, e.known ? e.name : '? ? ?', tw, 2); let y = iy + 2; for (const l of nm) { ui.text(l, tx2, y, { color: e.known ? PAL.goldHi : PAL.dim }); y += 9; }
      ui.text(fit(ui, e.known ? e.sub : 'NOT YET FOUND', tw), tx2, y + 1, { color: e.known ? (e.subCol || PAL.soft) : PAL.faint, shadow: false }); // PROPOSAL
      let dy = iy + 38; const maxL = Math.floor((gy + gh - dy - 14) / 9);
      if (e.known) for (const l of lines(ui, e.desc, pw - 14, maxL)) { ui.text(l, ix, dy, { color: PAL.soft, shadow: false }); dy += 9; }
      if (e.known && e.count) ui.text(e.count, px + pw - 7, gy + gh - 12, { align: 'right', color: PAL.dim, shadow: false });
    });
  }
}
const mix2 = (n, k) => { const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const f = (v) => Math.round(v + (255 - v) * k); return (f(r) << 16) | (f(g) << 8) | f(b); };

