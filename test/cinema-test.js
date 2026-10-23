'use strict';
// Every filmed scene (js/cinema/*.js) names a real story node and set, has one beat per line of
// that node's text, and only directs actors it cast; each shot's numbers are finite.
global.self = global; global.window = global;
const S = require('../js/story.js');
global.TowStory = S; global.TowBook = {};
for (const id of S.BOOK_FILES || []) global.TowBook[id] = require('../js/book/' + id + '.js');
require('../js/cinema/sets.js');
require('../js/cinema/prologue.js');
require('../js/cinema/ashgate.js');
require('../js/cinema/c1.js');
require('../js/cinema/gate.js');
require('../js/cinema/camp.js');
require('../js/cinema/summit.js');
require('../js/cinema/climber.js');
const SETS = global.TowCinemaSets, FILMS = global.TowCinema;
const DIRS = new Set(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
let bad = 0;
const fail = (m) => { console.error(m); bad++; };
const finite = (o, where) => { for (const [k, v] of Object.entries(o)) if (typeof v === 'number' && !Number.isFinite(v)) fail(`${where}: ${k} is ${v}`); };
for (const [id, F] of Object.entries(FILMS)) {
  const n = S.NODES[id];
  if (!n) { fail('film for an unknown node: ' + id); continue; }
  if (!SETS[F.set]) fail(`${id}: unknown set ${F.set}`);
  const lines = (n.lines || []).length;
  if (F.beats.length !== lines) fail(`${id}: ${F.beats.length} beats for ${lines} lines`);
  const cast = new Set((F.actors || []).map((a) => a.id));
  for (const a of F.actors || []) { if (a.dir && !DIRS.has(a.dir)) fail(`${id}: ${a.id} faces ${a.dir}`); finite(a, `${id} actor ${a.id}`); }
  F.beats.forEach((B, i) => {
    if (B.cam) finite(B.cam, `${id} beat ${i} cam`);
    for (const a of B.do || []) {
      if (a.who && !cast.has(a.who)) fail(`${id} beat ${i}: directs ${a.who}, not in the cast`);
      if (a.place && !SETS[a.place]) fail(`${id} beat ${i}: moves to an unknown place ${a.place}`);
      if (a.dir && !DIRS.has(a.dir)) fail(`${id} beat ${i}: dir ${a.dir}`);
      if ((a.cam && (a.cam.track || a.cam.pov)) && !cast.has(a.cam.track || a.cam.pov)) fail(`${id} beat ${i}: camera follows ${a.cam.track || a.cam.pov}`);
      if (a.cam) finite(a.cam, `${id} beat ${i} cam action`);
      for (const k of ['to', 'put']) if (a[k] && a[k].some((x) => x != null && !Number.isFinite(x))) fail(`${id} beat ${i}: ${k} ${a[k]}`);
    }
  });
}
// the rooftop chase lands every leap on a roof (no one stands over an alley)
const R = SETS.roofs;
for (const B of FILMS['p.overlook'].beats) for (const a of B.do || []) {
  const p = a.leap ? a.leap.to : a.to || a.put;
  if (!p || p[2] == null || p[1] < 5) continue;
  const h = R.runAt(p[2]);
  if (h == null || Math.abs(h - p[1]) > 0.01) fail(`p.overlook: ${a.who} ends at z ${p[2]}, height ${p[1]}, roof there ${h}`);
}
if (bad) { console.error(bad + ' problem(s)'); process.exit(1); }
console.log('cinema ok (' + Object.keys(FILMS).length + ' filmed scenes)');
