// Every character set, clip, effect and tile the game names exists in the packed assets, every scene
// speaker is known, and every stage has waves and a boss. Usage: node vesper/test/data-test.js
const fs = require('fs'), path = require('path');
require('../js/data.js'); require('../js/story.js');
const VS = globalThis.VS, D = VS.DATA, S = VS.STORY;
const root = path.join(__dirname, '../../assets');
const fx = JSON.parse(fs.readFileSync(root + '/fx/fx.json')).fx, tiles = JSON.parse(fs.readFileSync(root + '/tiles/tiles.json')).sprites;
let fail = 0; const bad = (m) => { fail++; console.log('FAIL', m); };
const clipsOf = (set) => { const f = root + '/pixel/' + set + '.json'; if (!fs.existsSync(f)) { bad('no set ' + set); return {}; } return JSON.parse(fs.readFileSync(f)).anims; };
const need = ['Idle', 'Idle4', 'Walk', 'Run', 'TakeDamage', 'Slide', 'Die', 'Rolling', 'Special1', 'Taunt', 'StrafeLeft', 'StrafeRight', 'RunBackwards'];
const check = (who, set, extra) => { const a = clipsOf(set); for (const c of need.concat(extra || [])) if (!a[c]) bad(`${who} (${set}) lacks ${c}`); };
for (const [id, H] of Object.entries(D.HEROES)) { check('hero ' + id, H.set, H.combo.map((k) => k.clip).concat([H.heavy.clip, H.dashCut.clip], H.skills.map((k) => k.clip))); for (const k of H.combo.concat([H.heavy, H.dashCut])) if (k.bolt && !fx[k.bolt.fx]) bad(id + ' bolt fx ' + k.bolt.fx); }
check('clone', D.CLONE.set, D.CLONE.atks.map((k) => k.clip));
check('lys', D.LYS.set, []);
for (const [k, f] of Object.entries(D.FOES)) {
  if (f.limited) { const a = clipsOf(f.set); for (const c of ['Idle', 'Walk', 'TakeDamage', 'Die'].concat(f.atks.map((x) => x.clip))) if (!a[c]) bad(`${k} (${f.set}) lacks ${c}`); }
  else check(k, f.set, f.atks.map((a) => a.clip));
  for (const a of f.atks) { if (a.bolt && !fx[a.bolt.fx]) bad(`${k} bolt fx ${a.bolt.fx}`); if (a.bolt && a.bolt.burstFx && !fx[a.bolt.burstFx]) bad(`${k} burst fx`); for (const z of [a.zone, a.rain, a.quake]) if (z && z.fx && !fx[z.fx]) bad(`${k} fx ${z.fx}`); if (a.summon && !D.FOES[a.summon.key]) bad(`${k} summons nothing`); if (a.next != null && !f.atks[a.next]) bad(`${k} chains to nothing`); }
}
for (const st of D.STAGES) {
  for (const t of st.look.ground) if (!tiles[t]) bad(`${st.id} ground ${t}`);
  for (const t of st.look.props) if (!tiles[t]) bad(`${st.id} prop ${t}`);
  for (const w of st.waves.concat([st.bossWave])) for (const k of w) if (k !== '+' && !D.FOES[k]) bad(`${st.id} foe ${k}`);
  if (!D.FOES[st.bossWave[0]].boss) bad(`${st.id} boss wave does not open with its boss`);
}
// Effect names used in the code (keep in step with view.js and cine.js).
const used = new Set(['slash_arc_blood', 'hit_crit', 'cross_slash', 'katana', 'hit_big', 'parry', 'dissipate', 'smoke_dark', 'blast', 'teleport', 'shockwave', 'spin_slash', 'smoke_burst', 'portal', 'hit_shock', 'thunder', 'lightning_holy', 'explosion_frost', 'frost_nova', 'spell_cast', 'summon', 'spell_zap', 'charge_up', 'cast_circle', 'wind_gust']);
const src = ['view.js', 'cine.js'].map((f) => fs.readFileSync(path.join(__dirname, '../js', f), 'utf8')).join('\n');
for (const n of used) { if (!fx[n]) bad('fx ' + n); if (src.indexOf("'" + n + "'") < 0) bad('fx listed but unused ' + n); }
// Scenes: known shot kinds, known speakers, one scene per stage.
for (const H of Object.values(D.HEROES)) for (const sk of H.skills) if (sk.fx && !fx[sk.fx]) bad('skill fx ' + sk.fx);
const KINDS = ['title', 'moonfall', 'film', 'spire', 'clash', 'seal'];
const scenes = S.BEFORE.concat([S.ENDING]);
if (S.BEFORE.length !== D.STAGES.length) bad('one scene per stage');
for (const sc of scenes) for (const sh of sc.shots) {
  if (KINDS.indexOf(sh.k) < 0) bad('unknown shot ' + sh.k);
  for (const w of [sh.who, sh.also, sh.a, sh.b, sh.card && sh.card.who, sh.card && sh.card.also].concat((sh.cast || []).map((c) => (typeof c === 'string' ? c : c.who)), sh.line ? [sh.line.who] : [])) if (w && !S.speaker(w)) bad('unknown speaker ' + w);
  for (const w of [sh.who, sh.also, sh.a, sh.b, sh.card && sh.card.who, sh.card && sh.card.also].concat((sh.cast || []).map((c) => (typeof c === 'string' ? c : c.who)))) if (w) check('scene ' + w, S.speaker(w).set, ['Attack4', 'Attack3', 'Attack1']);
}
for (const sc of scenes) for (const sh of sc.shots) {
  if (sh.line) bad('a spoken line in a scene (the story has no dialogue)');
  if (sh.say && sh.say.length > 90) bad('caption too long: ' + sh.say);
}
if (!S.GOALS || S.GOALS.length !== D.STAGES.length) bad('one goal per stage');
for (const k of Object.keys(S.PHASE)) if (!D.FOES[k]) bad('phase line for unknown ' + k);
console.log(`${Object.keys(D.FOES).length} foes, ${D.STAGES.length} stages, ${used.size} effects named, ${scenes.length} scenes`);
console.log(fail ? `${fail} failures` : 'all assets found');
process.exit(fail ? 1 : 0);
