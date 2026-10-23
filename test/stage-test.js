'use strict';
// Every scene, card and fork of the story plays on a staged scene (no painted stills),
// and every staged beat names units that exist in its cast.
global.self = global;
const S = require('../js/story.js');
global.TowStory = S; global.TowBook = {};
for (const id of S.BOOK_FILES || []) global.TowBook[id] = require('../js/book/' + id + '.js');
const ST = require('../js/stages.js');
// Filmed scenes (js/cinema/*.js) need no staged scene: test/cinema-test.js checks them.
global.window = global;
for (const f of require('fs').readdirSync(__dirname + '/../js/cinema')) require('../js/cinema/' + f);
const FILMED = new Set(Object.keys(global.TowCinema || {}));
// The prologue's animated painted cinematics (js/render/backdrop.js: the town, the Tower, the Reset's fire and
// water, the dawn) are the author's favourite opening and stay as they were.
const PAINTED = new Set(['p.reset', 'p.story', 'p.later', 'p.open', 'p.resetcard']); // (p.resetcard: THE RESET over the painted ash)
let bad = 0;
for (const [id, n] of Object.entries(S.NODES)) {
  if (!['scene', 'card', 'fork'].includes(n.type)) continue;
  if (!ST[id] && PAINTED.has(id)) continue;
  if (!ST[id] && FILMED.has(id)) continue;
  if (!ST[id]) { console.error('still image (no stage):', id); bad++; }
  else if (ST[id] === 'same') {
    // the node before must be staged, or 'same' keeps nothing
  } else if (!ST[id].arena || !ST[id].cast) { console.error('stage without arena/cast:', id); bad++; }
}
// 'same' keeps the shot of the scene before it; a battle or select in between clears it.
const preds = {};
for (const [id, n] of Object.entries(S.NODES)) {
  const outs = [n.next, n.win, n.lose, ...(n.options || []).map((o) => o.next), ...(n.then ? [n.then] : [])].filter((x) => typeof x === 'string');
  for (const o of outs) (preds[o] = preds[o] || []).push(id);
}
for (const [id, st] of Object.entries(ST)) {
  if (st !== 'same') continue;
  for (const y of preds[id] || []) {
    const yn = S.NODES[y];
    if (!['scene', 'fork', 'card', 'select'].includes(yn.type) || (yn.type !== 'select' && !ST[y])) { console.error("'same' after a non-scene:", id, 'from', y, '(' + yn.type + ')'); bad++; }
  }
}
const Sim = require('../js/sim.js');
for (const [id, st] of Object.entries(ST)) {
  if (st === 'same') continue;
  if (!Sim.ARENAS && !st.arena) continue;
  for (const c of st.cast || []) if (c.key !== '@' && !Sim.DEFS[c.key]) { console.error('unknown fighter key', c.key, 'in', id); bad++; }
}
if (bad) { console.error(bad + ' problems'); process.exit(1); }
console.log('stages ok');
