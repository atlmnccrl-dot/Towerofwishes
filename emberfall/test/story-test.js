// Story integrity: every speaker is on stage, every set, effect, tile and icon referenced exists on disk.
const fs = require('fs'); const path = require('path');
require('../js/data.js'); require('../js/story.js');
const EF = globalThis.EF; const D = EF.DATA; const S = EF.STORY; const A = path.join(__dirname, '..', '..', 'assets');
const fx = JSON.parse(fs.readFileSync(path.join(A, 'fx/fx.json'))).fx; const tiles = JSON.parse(fs.readFileSync(path.join(A, 'tiles/tiles.json'))).sprites;
let errors = [], lines = 0, beats = 0;
const setOk = s => fs.existsSync(path.join(A, 'pixel', s + '.json'));
for (const s of D.SETS) if (!setOk(s)) errors.push('missing set ' + s);
for (const [id, x] of Object.entries(S.EXTRAS)) if (!setOk(x.set)) errors.push('extra ' + id + ' set ' + x.set);
for (const [id, p] of Object.entries(S.PLACES)) { for (const g of p.ground.concat([p.road])) if (!tiles[g]) errors.push(id + ' tile ' + g); for (const [n] of p.props) if (!tiles[n]) errors.push(id + ' prop ' + n); }
for (const [id, f] of Object.entries(D.FOES)) { for (const a of f.attacks) { if (a.fx && !fx[a.fx]) errors.push(id + ' fx ' + a.fx); if (a.bolt && !fx[a.bolt]) errors.push(id + ' bolt ' + a.bolt); } if (f.bolt && !fx[f.bolt]) errors.push(id + ' bolt ' + f.bolt); for (const p of f.phases || []) for (const s of p.summon || []) if (!D.FOES[s]) errors.push(id + ' summons ' + s); }
for (const h of Object.values(D.HEROES)) if (h.bolt && !fx[h.bolt]) errors.push(h.id + ' bolt ' + h.bolt);
for (const it of Object.values(D.ITEMS)) if (!it.icon || it.icon[0] > 3) errors.push('item icon ' + it.id);
for (const act of S.ACTS) {
  for (const key of ['open', 'mid', 'end']) { const sc = act[key]; if (!S.PLACES[sc.place]) errors.push(act.id + ' place ' + sc.place); const on = new Set(Object.keys(sc.actors));
    for (const who of on) if (!D.HEROES[who] && !S.EXTRAS[who]) errors.push(act.id + ' unknown actor ' + who);
    for (const b of sc.beats) { beats++; if (b.card !== undefined) continue; if (b.do === 'enter') { if (!D.HEROES[b.who] && !S.EXTRAS[b.who]) errors.push(act.id + ' enters unknown ' + b.who); on.add(b.who); continue; }
      if (b.do === 'leave') { on.delete(b.who); continue; } if (b.do === 'fx' && !fx[b.name]) errors.push(act.id + ' fx ' + b.name); if (b.do === 'anim' && !D.CLIP_FPS[b.clip]) errors.push(act.id + ' clip ' + b.clip);
      if (b.t !== undefined) { lines++; if (!on.has(b.who)) errors.push(act.id + ' ' + key + ': ' + b.who + ' speaks off stage: "' + b.t.slice(0, 30) + '"'); } else if (b.who && !on.has(b.who)) errors.push(act.id + ' ' + key + ': direction for ' + b.who + ' off stage'); } }
  for (const key of ['fight1', 'boss']) for (const w of act[key].waves) for (const f of w) if (!D.FOES[f]) errors.push(act.id + ' foe ' + f);
  for (const h of act.party) if (!D.HEROES[h]) errors.push(act.id + ' hero ' + h);
}
for (const [id, pool] of Object.entries(S.HUNTS)) for (const f of pool) if (!D.FOES[f]) errors.push('hunt ' + id + ' foe ' + f);
console.log(`${S.ACTS.length} acts, ${beats} beats, ${lines} spoken lines, ${Object.keys(D.FOES).length} foes, ${D.SETS.length} sets`);
if (errors.length) { console.log(errors.join('\n')); process.exit(1); } console.log('story ok');
