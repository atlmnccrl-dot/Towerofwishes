// Bundle the random-cast sets' metadata (assets/pixel/vh_*.json) by the act that uses them, so a
// fight fetches one bundle for its act instead of a file per character, and the published build
// stays under its file limit: assets/pixel/vh_b<N>.json plus vh_map.json (set -> bundle).
// Run after tools/pack_pixel.py: node vesper/tools_vh_bundles.js
const fs = require('fs'), path = require('path');
require('./js/data.js'); require('./js/progress.js'); require('./js/story.js');
const VS = globalThis.VS, D = VS.DATA, P = VS.PROG, OUT = path.join(__dirname, '..', 'assets', 'pixel');
const groups = [], seen = new Set();
const setsOfKey = (k, out) => { const f = D.FOES[k]; if (!f || out.has('k:' + k)) return; out.add('k:' + k); out.add(f.set); for (const v of (D.VARIANTS[k] || [])) out.add(v); for (const a of f.atks) if (a.summon) setsOfKey(a.summon.key, out); };
// Bundle 0: the opening's own cast (the five kings, their guards, the risen townsfolk), so a new game fetches about
// twenty sets' metadata instead of five act bundles (2026-11-13: about 9 MB of JSON before the film could start).
const opening = new Set(VS.STORY.KING_SETS.concat(['vh_townsfolk_001', 'vh_townsfolk_004', 'vh_townsfolk_007', 'vh_townsfolk_010', 'vh_townsfolk_013', 'vh_skeleton_002']));
groups.push(opening);
// Bundle 1: what can show up anywhere (heroes, the opening's dead, every champion on the map).
const base = new Set(); for (const k in D.HEROES) base.add(D.HEROES[k].set); for (const s of ['vh_townsfolk_001', 'vh_townsfolk_004', 'vh_townsfolk_007', 'vh_townsfolk_010', 'vh_townsfolk_013', 'vh_skeleton_002', 'vh_barbarian_002']) base.add(s);
for (const k of P.CHAMPS.flat()) base.add(D.FOES[k].set);
groups.push(base);
P.ACTS.forEach((A) => { const g = new Set(); for (const k of A.pool) setsOfKey(k, g); groups.push(g); });
const files = fs.readdirSync(OUT).filter((f) => /^vh_.*\.json$/.test(f) && !/^vh_(b\d+|map)\.json$/.test(f)).map((f) => f.slice(0, -5));
const map = {}, bundles = groups.map(() => ({}));
groups.forEach((g, i) => { for (const id of g) if (id.startsWith('vh_') && !seen.has(id) && files.includes(id)) { seen.add(id); map[id] = i; bundles[i][id] = JSON.parse(fs.readFileSync(path.join(OUT, id + '.json'))); } });
const rest = files.filter((id) => !seen.has(id)); if (rest.length) { const i = bundles.length; bundles.push({}); for (const id of rest) { map[id] = i; bundles[i][id] = JSON.parse(fs.readFileSync(path.join(OUT, id + '.json'))); } }
bundles.forEach((b, i) => fs.writeFileSync(path.join(OUT, `vh_b${i}.json`), JSON.stringify(b)));
fs.writeFileSync(path.join(OUT, 'vh_map.json'), JSON.stringify(map));
console.log(bundles.map((b, i) => `b${i}: ${Object.keys(b).length} sets ${Math.round(fs.statSync(path.join(OUT, `vh_b${i}.json`)).size / 1024)} KB`).join('\n'), '\nmapped', Object.keys(map).length);
