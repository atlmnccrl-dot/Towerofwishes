// Every character set, clip, effect and tile the game names exists in the packed assets, every scene
// speaker is known, and every stage has waves and a boss. Usage: node vesper/test/data-test.js
const fs = require('fs'), path = require('path');
require('../js/data.js'); require('../js/story.js');
const VS = globalThis.VS, D = VS.DATA, S = VS.STORY;
const root = path.join(__dirname, '../../assets');
const fx = JSON.parse(fs.readFileSync(root + '/fx/fx.json')).fx, tiles = JSON.parse(fs.readFileSync(root + '/tiles/tiles.json')).sprites;
let fail = 0; const bad = (m) => { fail++; console.log('FAIL', m); };
const clipsOf = (set) => { const f = root + '/pixel/' + set + '.json'; if (!fs.existsSync(f)) { bad('no set ' + set); return {}; } return JSON.parse(fs.readFileSync(f)).anims; };
const need = ['Idle', 'Idle4', 'Walk', 'Run', 'TakeDamage', 'Slide', 'Die', 'Rolling', 'Special1', 'Taunt'];
const check = (who, set, extra) => { const a = clipsOf(set); for (const c of need.concat(extra || [])) if (!a[c]) bad(`${who} (${set}) lacks ${c}`); };
check('hero', D.HERO.set, D.HERO.combo.map((k) => k.clip).concat(['Attack4', 'Attack6']));
check('lys', D.LYS.set, []);
for (const [k, f] of Object.entries(D.FOES)) {
  check(k, f.set, f.atks.map((a) => a.clip));
  for (const a of f.atks) { if (a.bolt && !fx[a.bolt.fx]) bad(`${k} bolt fx ${a.bolt.fx}`); if (a.next != null && !f.atks[a.next]) bad(`${k} chains to nothing`); }
}
for (const st of D.STAGES) {
  for (const t of st.look.ground) if (!tiles[t]) bad(`${st.id} ground ${t}`);
  for (const t of st.look.props) if (!tiles[t]) bad(`${st.id} prop ${t}`);
  for (const w of st.waves.concat([st.bossWave])) for (const k of w) if (!D.FOES[k]) bad(`${st.id} foe ${k}`);
  if (!st.bossWave.every((k) => D.FOES[k].boss)) bad(`${st.id} boss wave has a minion`);
}
// Effect names used in the code (keep in step with view.js and cine.js).
const used = new Set(['slash_arc_blood']);   // the fight's effects are drawn in code; the cinematic uses this pack effect
const src = ['view.js', 'cine.js'].map((f) => fs.readFileSync(path.join(__dirname, '../js', f), 'utf8')).join('\n');
for (const n of used) { if (!fx[n]) bad('fx ' + n); if (src.indexOf("'" + n + "'") < 0) bad('fx listed but unused ' + n); }
// Scenes.
const scenes = S.BEFORE.concat([S.ENDING]);
if (S.BEFORE.length !== D.STAGES.length) bad('one scene per stage');
for (const sc of scenes) for (const b of sc.beats) if (b.who && (!S.speaker(b.who) || sc.cast.indexOf(b.who) < 0)) bad('speaker not in cast: ' + b.who);
for (const k of Object.keys(S.PHASE)) if (!D.FOES[k]) bad('phase line for unknown ' + k);
console.log(`${Object.keys(D.FOES).length} foes, ${D.STAGES.length} stages, ${used.size} effects named, ${scenes.length} scenes`);
console.log(fail ? `${fail} failures` : 'all assets found');
process.exit(fail ? 1 : 0);
