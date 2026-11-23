// Icons drawn in code: pixel bitmaps for the boon slots, the map's node kinds, costs and risks, the seven
// Resonance sigils, the elements, the areas' conditions and the meta screens. Each bitmap row is a string:
// '#' the main colour, '+' its light tone, '-' its dark tone, 'o' white, '.' empty. Icons get a dark
// 1 px outline by default so they read on any ground. Cached per (name, colour, scale).
import { mix, resOf, PAL } from './kit.js';
import { DATA } from './data.js';

const B = {
  // ---- boon slots (7x7)
  attack: ['......#', '.....#+', '....#+.', '.#.#+..', '..#+...', '.#-#...', '#..#...'],
  dash: ['#..#...', '+#.+#..', '.+#.+#.', '..+#.+#', '.+#.+#.', '+#.+#..', '#..#...'],
  skill: ['...#...', '...#...', '..#+#..', '##+o+##', '..#+#..', '...#...', '...#...'],
  ult: ['#..#..#', '##.#.##', '#######', '#+++++#', '#######', '.......', '.......'],
  passive: ['..###..', '.#+++#.', '#++o++#', '.#+++#.', '..#+#..', '...#...', '.......'],
  // ---- node kinds (9x9)
  area: ['#.#...#.#', '###...###', '.#.....#.', '.#.###.#.', '.###+###.', '.##+++##.', '.##+.+##.', '.##...##.', '.##...##.'],
  event: ['..#####..', '.##+++##.', '.#+...+#.', '.....+#..', '....##...', '...##....', '.........', '...##....', '...##....'],
  shrine: ['....#....', '...#+#...', '...+o+...', '..#+o+#..', '...#+#...', '..#####..', '...#-#...', '..#####..', '.#######.'],
  merchant: ['...#.#...', '....#....', '..#####..', '.#+++++#.', '#++#-#++#', '#+++#+++#', '#++#-#++#', '.#+++++#.', '..#####..'],
  trial: ['#.......#', '+#.....#+', '.+#...#+.', '..+#.#+..', '...+#+...', '..##.##..', '.#-...-#.', '#.......#', '.........'],
  quest: ['.#######.', '#+++++++#', '.#+++#+#.', '.#++#++#.', '.#++#++#.', '.#+++++#.', '.#++#++#.', '#+++++++#', '.#######.'],
  boss: ['..#####..', '.#+++++#.', '#+++++++#', '#+..+..+#', '#+..+..+#', '#+++#+++#', '.##+++##.', '..#+#+#..', '..#####..'],
  start: ['....#....', '...###...', '..#+++#..', '.#++o++#.', '#++ooo++#', '.#++o++#.', '..#+++#..', '...###...', '....#....'],
  // ---- costs, risks, rewards (7x7)
  hp: ['.##.##.', '#++#++#', '#+o++##', '#++++##', '.#+++#.', '..#+#..', '...#...'],
  ember: ['...#...', '..#+...', '..#+#..', '.#+o+#.', '.#+o+#.', '.#+++#.', '..###..'],
  tonic: ['..###..', '...#...', '..#+#..', '.#+++#.', '#+o+++#', '#+++++#', '.#####.'],
  shard: ['...#...', '..#+#..', '.#+o+#.', '#+++++#', '.#+++#.', '..#+#..', '...#...'],
  risk: ['..###..', '.#####.', '#.#.#.#', '#######', '.#####.', '.#.#.#.', '.......'],
  curse: ['.......', '..###..', '.#+++#.', '#++o++#', '.#+++#.', '..###..', '.......'],
  boon: ['...#...', '..#+#..', '###+###', '.#+o+#.', '..#+#..', '.#.#.#.', '#.....#'],
  relic: ['..###..', '.#+o+#.', '..###..', '.#...#.', '#.....#', '.#...#.', '..###..'],
  weapon: ['......#', '.....#.', '....#..', '.#.#...', '..#....', '.#.#...', '#......'],
  lock: ['..###..', '.#...#.', '.#...#.', '#######', '#++o++#', '#+++++#', '#######'],
  check: ['.......', '......#', '.....##', '#...##.', '##.##..', '.###...', '..#....'],
  star: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '#.....#'],
  reroll: ['..####.', '.#....#', '#.....#', '#..#...', '#..##..', '.#.###.', '..####.'],
  crown: ['#..#..#', '##.#.##', '#######', '#+o+o+#', '#######', '.......', '.......'],
  key: ['.##....', '#++#...', '#+o#...', '.##+###', '....#.#', '.......', '.......'],
  bell: ['...#...', '..###..', '.#+++#.', '.#+++#.', '#+++++#', '#######', '...#...'],
  heart: ['.##.##.', '#++#++#', '#+++++#', '.#+++#.', '..#+#..', '...#...', '.......'],
  scroll: ['.#####.', '#+++++#', '.#+++#.', '.#+++#.', '.#+++#.', '#+++++#', '.#####.'],
  skull: ['.#####.', '#######', '#..#..#', '#######', '.##.##.', '.#.#.#.', '.......'],
  eye: ['.......', '..###..', '.#+++#.', '#+-o-+#', '.#+++#.', '..###..', '.......'],
  book: ['##.##..', '#+#+#..', '#+#+#..', '#+#+#..', '#+#+#..', '#####..', '.......'],
  tower: ['...#...', '..###..', '..#+#..', '.#####.', '.#+o+#.', '.#+++#.', '#######'],
  cup: ['#######', '#+++++#', '.#+++#.', '..#+#..', '...#...', '..###..', '.#####.'],
  // ---- Resonance sigils (9x9)
  'res:ember': ['....#....', '...#+....', '...#+#...', '..#+#+#..', '.#+++#+#.', '.#+oo++#.', '#++oo+++#', '.#+++++#.', '..#####..'],
  'res:rime': ['....#....', '.#.###.#.', '..#.#.#..', '.#..#..#.', '#########', '.#..#..#.', '..#.#.#..', '.#.###.#.', '....#....'],
  'res:blight': ['......##.', '.....#o+#', '.##...##.', '#o+#.....', '#++#.###.', '.##.#o++#', '...#+++-#', '...#++-+#', '....###..'],
  'res:thunder': ['....####.', '...#++#..', '..#++#...', '.#+++####', '#++++++#.', '....#+#..', '...#+#...', '..##.....', '.#.......'],
  'res:crimson': ['....#....', '...#+#...', '...#+#...', '..#+++#..', '.#+o+++#.', '#++o++++#', '#+++++-+#', '.#++-++#.', '..#####..'],
  'res:dawn': ['....#....', '.#..#..#.', '..#+++#..', '..+ooo+..', '##+ooo+##', '..+ooo+..', '..#+++#..', '.#..#..#.', '....#....'],
  'res:silence': ['..####...', '.#++..#..', '#++.....#', '#+...#.#.', '#+..#.#..', '#+...#.#.', '#++.....#', '.#++..#..', '..####...'],
  // ---- conditions (7x7)
  flooded: ['.......', '.#...#.', '#+#.#+#', '...#...', '.#...#.', '#+#.#+#', '...#...'],
  burning: ['...#...', '..#+#..', '.#+#+..', '.#++#+#', '#+oo++#', '#+o+++#', '.#####.'],
  fog: ['.......', '.####..', '.......', '..#####', '.......', '####...', '.......'],
  bloodmoon: ['..###..', '.#+++#.', '#++++-#', '#+++--#', '#++++-#', '.#+++#.', '..###..'],
  plague: ['..#....', '.#+#.#.', '..#.#+#', '.#...#.', '#+#....', '.#..#..', '...#+#.'],
  frozen: ['...#...', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '...#...'],
  eclipse: ['..###..', '.#---#.', '#--o--#', '#-ooo-#', '#--o--#', '.#---#.', '..###..'],
  storm: ['...##..', '..##...', '.####..', '...##..', '..##...', '.##....', '.#.....'],
  sun: ['#..#..#', '.#.#.#.', '..+++..', '##+o+##', '..+++..', '.#.#.#.', '#..#..#'],
  ash: ['.#...#.', '...#...', '#....#.', '..#....', '.....#.', '.#.#...', '#....#.'],
  calm: ['.......', '.......', '.#####.', '#+++++#', '.......', '.......', '.......'],
};
// what a condition id draws as, and its colour (C's variants may name more; unknown ones get a fog mark)
export const CONDITION = {
  flooded: { icon: 'flooded', col: '#5ab0e0', name: 'FLOODED' }, burning: { icon: 'burning', col: '#ff8030', name: 'BURNING' },
  fog: { icon: 'fog', col: '#b0b8c0', name: 'FOG' }, bloodmoon: { icon: 'bloodmoon', col: '#e0303a', name: 'BLOOD MOON' },
  plague: { icon: 'plague', col: '#9ad43a', name: 'PLAGUE' }, frozen: { icon: 'frozen', col: '#a8e8ff', name: 'FROZEN OVER' },
  eclipse: { icon: 'eclipse', col: '#a464ff', name: 'ECLIPSE' }, storm: { icon: 'storm', col: '#ffe04a', name: 'STORM' },
  ashfall: { icon: 'ash', col: '#c89070', name: 'ASHFALL' }, hallowed: { icon: 'sun', col: '#fff0b0', name: 'FALSE DAWN' },
  flood: { icon: 'flooded', col: '#5ab0e0', name: 'FLOODED' }, burn: { icon: 'burning', col: '#ff8030', name: 'BURNING' }, frost: { icon: 'frozen', col: '#a8e8ff', name: 'FROZEN' }, blood: { icon: 'bloodmoon', col: '#e0303a', name: 'BLOOD MOON' }, mist: { icon: 'fog', col: '#b0b8c0', name: 'MIST' },  snow: { icon: 'frozen', col: '#e0f0ff', name: 'SNOW' }, sand: { icon: 'storm', col: '#e8b060', name: 'SANDSTORM' }, rot: { icon: 'plague', col: '#9ad43a', name: 'ROT' }, dark: { icon: 'eclipse', col: '#7a6aa0', name: 'DARK' },
};
// a condition from its id or its name ('BLOOD MOON', 'FROZEN OVER' and the like find theirs)
export function conditionOf(c) {
  if (CONDITION[c]) return CONDITION[c]; const k = String(c || '').toLowerCase().replace(/[^a-z]/g, '');
  for (const id in CONDITION) if (k.startsWith(id) || k.includes(id)) return { ...CONDITION[id], name: String(c).toUpperCase().replace(/_/g, ' ') };
  return { icon: 'fog', col: '#b0a898', name: String(c || '').toUpperCase().replace(/_/g, ' ') };
}
// the map's node kinds
export const KIND = {
  area: { icon: 'area', col: '#d8cfbc', name: 'DISTRICT' }, event: { icon: 'event', col: '#e8b860', name: 'EVENT' },
  shrine: { icon: 'shrine', col: '#ffb060', name: 'SHRINE' }, merchant: { icon: 'merchant', col: '#e8c860', name: 'MERCHANT' },
  trial: { icon: 'trial', col: '#e05048', name: 'TRIAL' }, quest: { icon: 'quest', col: '#8fd0ff', name: 'QUEST' },
  boss: { icon: 'boss', col: '#ff4a40', name: 'BOSS' }, start: { icon: 'start', col: '#e8dfcc', name: 'START' },
};
export const SLOT = { attack: 'ATTACK', dash: 'DASH', skill: 'SKILL', ult: 'ULTIMATE', passive: 'PASSIVE' };

const cache = new Map();
export const iconSize = (name) => { const b = B[name] || B.star; return { w: b[0].length, h: b.length }; };
export const hasIcon = (name) => !!B[name];
function build(name, col, sc, outline) {
  const bm = B[name] || B.star; const w = bm[0].length, h = bm.length; const o = outline ? 1 : 0;
  const c = document.createElement('canvas'); c.width = (w + o * 2) * sc; c.height = (h + o * 2) * sc; const g = c.getContext('2d');
  const tone = { '#': col, '+': mix(col, '#ffffff', 0.4), '-': mix(col, '#000000', 0.45), o: '#ffffff' };
  if (outline) { g.fillStyle = typeof outline === 'string' ? outline : '#07080b'; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (bm[y][x] !== '.') for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.fillRect((x + o + dx) * sc, (y + o + dy) * sc, sc, sc); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = bm[y][x]; if (ch === '.' || !tone[ch]) continue; g.fillStyle = tone[ch]; g.fillRect((x + o) * sc, (y + o) * sc, sc, sc); }
  return c;
}
// draw an icon with its top-left at (x, y) (the outline sits one pixel outside); o: scale, outline, center
export function icon(ui, name, x, y, col = PAL.text, o = {}) {
  const sc = o.scale || 1; const ol = o.outline === undefined ? true : o.outline; const key = name + '|' + col + '|' + sc + '|' + ol;
  let c = cache.get(key); if (!c) { c = build(name, col, sc, ol); if (cache.size > 500) cache.clear(); cache.set(key, c); }
  const off = ol ? sc : 0; let dx = x - off, dy = y - off;
  if (o.center) { dx = x - Math.floor(c.width / 2); dy = y - Math.floor(c.height / 2); }
  ui.g.drawImage(c, Math.round(dx), Math.round(dy)); return c.width;
}
// shorthand drawers for buttons and costs: fn(ui, x, y)
export const ic = (name, col) => (ui, x, y) => icon(ui, name, x, y, col);
export const COST_ICON = { hp: ic('hp', PAL.hp), embers: ic('ember', PAL.ember), ember: ic('ember', PAL.ember), tonic: ic('tonic', PAL.tonic), tonics: ic('tonic', PAL.tonic), shards: ic('shard', PAL.shard), shard: ic('shard', PAL.shard) };
// a Resonance sigil in its colour (B may give its own icon name: used if it is one of ours)
// B's own 7x7 glyph (RES[res].pix) when boons.js is loaded, so the menus and the game show one sigil; it gets
// a light top edge and a dark lower edge here. Without it, the 9x9 sigils above.
function pixName(R) {
  const src = DATA.RES && DATA.RES[R.id]; if (!src || !Array.isArray(src.pix) || !src.pix.length) return null;
  const name = 'pix:' + R.id; if (B[name]) return name;
  const P = src.pix.map((r) => String(r)); const at = (x, y) => y >= 0 && y < P.length && x >= 0 && x < P[y].length && P[y][x] !== '.' && P[y][x] !== ' ';
  B[name] = P.map((row, y) => [...row].map((ch, x) => (!at(x, y) ? '.' : (!at(x, y - 1) ? '+' : (!at(x, y + 1) ? '-' : '#')))).join(''));
  return name;
}
export function sigilName(res) { const R = resOf(res); return pixName(R) || (B['res:' + R.icon] ? 'res:' + R.icon : (B['res:' + R.id] ? 'res:' + R.id : 'star')); }
export function sigil(ui, res, x, y, o = {}) { const R = resOf(res); return icon(ui, sigilName(res), x, y, o.col || R.col, o); }
