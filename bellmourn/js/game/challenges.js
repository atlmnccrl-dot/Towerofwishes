// Challenges (docs/RUN_DESIGN.md §4): goals tracked across runs that unlock wardens, boons, Resonance tiers,
// Echo variants, warden colours and events. Pure (no DOM): runs in the browser and in Node tests.
//
// CHALLENGES: [{ id, title, desc, reward, goal, progress(meta) -> { n, of } }]. Progress lives in
// meta.challenges[id] (a number); a finished challenge's id is in meta.done.
// trackChallenges(meta, run, ev): call it with the game's events as they happen and once at the run's end.
// It returns the ids of the challenges this event finished (also pushed to meta.done). ev.type is one of:
//  - the World's own events, passed through as they are: 'kill' { e, boss, elite }, 'drink' (a tonic),
//    'heal' { e, amt }, 'hit' { dst, hero } (the warden struck), 'perfect' (a perfect dodge);
//  - the run's: 'areaEnter' { area }, 'areaClear' { area }, 'bossStart' { type }, 'bossDown' { type },
//    'shrine' { heal }, 'boon' { id }, 'echo' { type }, 'event' { id }, 'quest' { id }, 'ally' { hero },
//    'actEnter' { act }, 'runEnd' { outcome, ending } (endRun in run.js sends this one).
// Facts also read from the run whenever an event comes: run.hero, run.act, run.stats (tonics, healed,
// shrines, kills), run.boons (Resonances held), run.echoes.
// challengeUnlocks(meta) -> { heroes, boons, res, echoes, colours, events }: everything the finished
// challenges have opened (run.js adds the heroes to meta.unlocked; offers and screens read the rest).
//
// Every title, description and reward name: PROPOSAL, for the author.

// The Resonance of each boon (boons.js, B), when that module is there; the challenges work without it.
let BOONS = {};
try { const m = await import('./boons.js'); BOONS = m.BOONS || {}; } catch (e) { /* no boons.js: the Resonance challenges read ev.res */ }

const n = (meta, id) => +((meta.challenges || {})[id] || 0);
const C = (id, title, desc, goal, reward) => ({ id, title, desc, goal, reward, progress: (meta) => ({ n: Math.min(goal, n(meta, id)), of: goal }) });
const FOE_NAME = { hushed: 'HUSHED', ghoul: 'GHOULS', crab: 'CRABS', brute: 'EXECUTIONERS', bat: 'BATS', hound: 'GRAVE HOUNDS', acolyte: 'ACOLYTES', mummy: 'MUMMIES', frostwolf: 'FROST WOLVES', imp: 'IMPS', leech: 'LEECHES', automaton: 'AUTOMATA' };

export const CHALLENGES = [
  // ---------------------------------------------------------------- the wardens (two challenges each; both open the warden)
  C('kestrel_gaoler', "THE GAOLER'S KEYS", 'DEFEAT THE GAOLER WITHOUT DRINKING A TONIC. (KESTREL, 1 OF 2)', 1, { hero: 'kestrel' }),
  C('kestrel_free', 'A HUNDRED VOICES', 'FREE 100 HUSHED. (KESTREL, 2 OF 2)', 100, { hero: 'kestrel' }),
  C('hollis_crab', 'THE KING IN THE MUD', 'DEFEAT THE DROWNED KING-CRAB. (HOLLIS, 1 OF 2)', 1, { hero: 'hollis' }),
  C('hollis_vesper', 'BEYOND THE WALLS', 'REACH ACT II WITH VESPER. (HOLLIS, 2 OF 2)', 1, { hero: 'hollis' }),
  C('wren_noheal', 'THE UNMENDED', 'REACH ACT II WITHOUT HEALING. (MOTHER WREN, 1 OF 2)', 1, { hero: 'wren' }),
  C('wren_three', 'ONE VOICE', 'HOLD 3 BOONS OF ONE RESONANCE. (MOTHER WREN, 2 OF 2)', 1, { hero: 'wren' }),
  C('ash_shrines', 'THE PILGRIM', 'REST AT 10 SHRINES. (SISTER ASH, 1 OF 2)', 10, { hero: 'lamplighter' }),
  C('ash_tallow', 'SNUFFED', 'DEFEAT MOTHER TALLOW. (SISTER ASH, 2 OF 2)', 1, { hero: 'lamplighter' }),
  // ---------------------------------------------------------------- the hunt: kill X of a kind
  C('kill_hushed', 'QUIET STREETS', 'FREE 500 HUSHED.', 500, { colour: { hero: 'warden', id: 'ashen' } }),
  C('kill_ghoul', 'GRAVE WORK', 'FELL 60 GHOULS.', 60, { boon: 'duo_sepsis' }),
  C('kill_crab', 'SHELLBREAKER', 'CRACK 40 CRABS.', 40, { colour: { hero: 'hollis', id: 'coral' } }),
  C('kill_brute', 'THE HEADSMAN\'S HEADSMAN', 'FELL 15 EXECUTIONERS.', 15, { colour: { hero: 'bellbreaker', id: 'iron' } }),
  C('kill_hound', 'KENNEL MASTER', 'FELL 40 GRAVE HOUNDS.', 40, { boon: 'duo_frostbite' }),
  C('kill_bat', 'NIGHT SKY', 'SWAT 80 BATS.', 80, { colour: { hero: 'huntress', id: 'dusk' } }),
  C('kill_elite', 'CROWNED IN GLOW', 'FELL 25 ELITE FOES.', 25, { res: { res: 'thunder', tier: 'crown' } }),
  C('kill_any', 'TEN THOUSAND NAMES', 'FREE 2000 VOICES IN ALL.', 2000, { colour: { hero: 'wren', id: 'vesper' } }),
  // ---------------------------------------------------------------- the bosses
  C('boss_any', 'FIRST TOLL', 'DEFEAT ANY BOSS.', 1, { boon: 'duo_steam' }),
  C('boss_ten', 'BELL-WARDEN', 'DEFEAT 10 BOSSES.', 10, { res: { res: 'dawn', tier: 'crown' } }),
  C('boss_fifty', 'THE LONG NIGHT', 'DEFEAT 50 BOSSES.', 50, { colour: { hero: 'warden', id: 'gold' } }),
  C('boss_ronin', 'STILLNESS', 'DEFEAT THE STILLED RONIN.', 1, { res: { res: 'silence', tier: 'crown' } }),
  C('boss_smiling', 'GOOD NIGHT, GUEST', 'DEFEAT THE SMILING GUEST.', 1, { event: 'guest_letter' }),
  C('boss_mother', 'LIGHTS ON', 'DEFEAT THE HOLLOW MOTHER.', 1, { res: { res: 'blight', tier: 'crown' } }),
  C('boss_saint', 'THE COOL ASH', 'DEFEAT THE PYRE SAINT.', 1, { res: { res: 'ember', tier: 'crown' } }),
  C('boss_crab_kestrel', 'PICKING THE LOCK', 'DEFEAT THE DROWNED KING-CRAB WITH KESTREL.', 1, { colour: { hero: 'kestrel', id: 'harbour' } }),
  C('boss_ronin_carmine', 'BLADE TO BLADE', 'DEFEAT THE STILLED RONIN WITH CARMINE.', 1, { colour: { hero: 'warden', id: 'petal' } }),
  C('boss_gaoler_bram', 'BREAKING OUT', 'DEFEAT THE GAOLER WITH BRAM.', 1, { boon: 'duo_wrath' }),
  C('boss_tallow_ash', 'THE LAST LAMP', 'DEFEAT MOTHER TALLOW WITH SISTER ASH.', 1, { colour: { hero: 'lamplighter', id: 'tallow' } }),
  C('boss_saint_hollis', 'QUENCHED', 'DEFEAT THE PYRE SAINT WITH HOLLIS.', 1, { boon: 'duo_firedamp' }),
  C('boss_mother_vesper', 'NIGHT HUNT', 'DEFEAT THE HOLLOW MOTHER WITH VESPER.', 1, { colour: { hero: 'huntress', id: 'bone' } }),
  C('boss_guest_wren', 'A SONG IN THE DARK', 'DEFEAT THE SMILING GUEST WITH MOTHER WREN.', 1, { boon: 'duo_eclipse' }),
  C('boss_silence', 'THE BELL RINGS', 'DEFEAT SAINT SILENCE.', 1, { echo: 'silence+' }),
  C('boss_archon', 'THE HOLLOW CROWN', 'DEFEAT THE HOLLOW ARCHON.', 1, { echo: 'archon+' }),
  C('boss_notonic', 'IRON STOMACH', 'DEFEAT 5 BOSSES WITHOUT DRINKING A TONIC IN THEIR FIGHT.', 5, { echo: 'gaoler+' }),
  C('boss_flawless', 'UNTOUCHED', 'DEFEAT A BOSS WITHOUT BEING HIT.', 1, { colour: { hero: 'kestrel', id: 'white' } }),
  // ---------------------------------------------------------------- the road
  C('area_flawless', 'NOT A SCRATCH', 'FINISH AN AREA WITHOUT BEING HIT.', 1, { boon: 'duo_zero' }),
  C('area_twenty', 'WAYFARER', 'CLEAR 20 AREAS.', 20, { event: 'pilgrim' }),
  C('act3', 'THE WHEEL', 'REACH ACT III.', 1, { res: { res: 'rime', tier: 'crown' } }),
  C('ending_any', 'MORNING', 'SEE AN ENDING.', 1, { colour: { hero: 'bellbreaker', id: 'dawn' } }),
  C('ending_all', 'EVERY BELL', 'SEE ALL THREE ENDINGS.', 3, { colour: { hero: 'wren', id: 'choir' } }),
  C('runs_ten', 'AGAIN, AND AGAIN', 'BEGIN 10 RUNS.', 10, { event: 'old_warden' }),
  // ---------------------------------------------------------------- the build
  C('res_crown', 'CROWNED', 'TAKE A CROWN BOON.', 1, { res: { res: 'crimson', tier: 'crown' } }),
  C('res_duo', 'TWO VOICES', 'TAKE A DUO BOON.', 1, { boon: 'duo_plasma' }),
  C('res_five', 'CHOIR OF ONE', 'HOLD 5 BOONS OF ONE RESONANCE.', 1, { boon: 'duo_nullstorm' }),
  C('res_all', 'THE SEVEN', 'TAKE A BOON OF EVERY RESONANCE (ACROSS RUNS).', 7, { colour: { hero: 'lamplighter', id: 'seven' } }),
  C('legendary', 'GOLDEN', 'HOLD A LEGENDARY BOON.', 1, { echo: 'tallow+' }),
  C('echo_three', 'ECHOES', 'CARRY 3 ECHOES IN ONE RUN.', 1, { echo: 'regent+' }),
  // ---------------------------------------------------------------- the hand
  C('perfect_hundred', 'BETWEEN THE BLOWS', 'MAKE 100 PERFECT DODGES.', 100, { colour: { hero: 'kestrel', id: 'night' } }),
  C('notonic_act', 'DRY FLASK', 'FINISH AN ACT WITHOUT DRINKING A TONIC.', 1, { echo: 'ossuary+' }),
  C('events_twenty', 'STRANGER AT THE DOOR', 'MEET 20 EVENTS.', 20, { event: 'masked_ball' }),
  C('allies', 'NOT ALONE', 'FIGHT BESIDE AN ALLY.', 1, { colour: { hero: 'hollis', id: 'storm' } }),
];
export const CHALLENGE_MAP = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));

// warden pairs: a warden opens when both of their challenges are done
const HERO_PAIRS = { kestrel: ['kestrel_gaoler', 'kestrel_free'], hollis: ['hollis_crab', 'hollis_vesper'], wren: ['wren_noheal', 'wren_three'], lamplighter: ['ash_shrines', 'ash_tallow'] };
// a boss defeated with a given warden
const WITH = { boss_crab_kestrel: ['kingcrab', 'kestrel'], boss_ronin_carmine: ['ronin', 'warden'], boss_gaoler_bram: ['gaoler', 'bellbreaker'], boss_tallow_ash: ['tallow', 'lamplighter'], boss_saint_hollis: ['pyresaint', 'hollis'], boss_mother_vesper: ['hollowmother', 'huntress'], boss_guest_wren: ['smiling', 'wren'] };
const BOSS_ONE = { hollis_crab: 'kingcrab', ash_tallow: 'tallow', boss_ronin: 'ronin', boss_smiling: 'smiling', boss_mother: 'hollowmother', boss_saint: 'pyresaint', boss_silence: 'silence', boss_archon: 'archon' };
const KILLS = { kill_ghoul: 'ghoul', kill_crab: 'crab', kill_brute: 'brute', kill_hound: 'hound', kill_bat: 'bat' };

function ensure(meta) {
  if (!meta.challenges || typeof meta.challenges !== 'object') meta.challenges = {};
  if (!Array.isArray(meta.done)) meta.done = [];
  if (!meta.challengeSeen || typeof meta.challengeSeen !== 'object') meta.challengeSeen = {}; // across runs: Resonances taken, endings seen
}
// what the challenges track inside one run (kept on the run, so a resumed run goes on counting)
function trk(run) {
  if (!run) return { fight: null, area: null, tonics: 0, actTonics: 0 };
  run.flags = run.flags || {}; return run.flags.ch || (run.flags.ch = { fight: null, area: null, tonics: 0, actTonics: 0, act: run.act || 1 });
}
const resOf = (id, ev) => (ev && ev.res) || (BOONS[id] && BOONS[id].res) || null;
function resCounts(run) {
  const c = {}; for (const b of (run && run.boons) || []) { const d = BOONS[b.id]; if (!d || d.kind === 'duo') continue; c[d.res] = (c[d.res] || 0) + 1; }
  return c;
}

export function trackChallenges(meta, run, ev = {}) {
  if (!meta) return [];
  ensure(meta); const T = trk(run); const done = []; const P = meta.challenges;
  const isDone = (id) => meta.done.includes(id);
  const add = (id, k = 1) => { if (isDone(id) || !CHALLENGE_MAP[id]) return; P[id] = n(meta, id) + k; check(id); };
  const set = (id, v) => { if (isDone(id) || !CHALLENGE_MAP[id]) return; P[id] = Math.max(n(meta, id), v); check(id); };
  function check(id) { const c = CHALLENGE_MAP[id]; if (n(meta, id) >= c.goal && !isDone(id)) { meta.done.push(id); done.push(id); } }
  const hero = run && run.hero; const type = ev.type;

  switch (type) {
    case 'kill': {
      const e = ev.e || {}; const ft = e.type || ev.foe;
      if (ev.boss || e.boss) break; // bosses come as 'bossDown'
      if (ft === 'hushed') { add('kestrel_free'); add('kill_hushed'); }
      for (const id in KILLS) if (KILLS[id] === ft) add(id);
      if (ev.elite || e.elite) add('kill_elite');
      if (e.team !== 'hero') add('kill_any');
      break;
    }
    case 'drink': case 'tonic': T.tonics++; T.actTonics++; if (T.fight) T.fight.tonics++; break;
    case 'hit': if (ev.hero || (ev.dst && (ev.dst.type === 'hero' && !ev.dst.ally))) { if (T.area) T.area.hits++; if (T.fight) T.fight.hits++; } break;
    case 'perfect': add('perfect_hundred'); break;
    case 'areaEnter': T.area = { id: ev.area, hits: 0 }; break;
    case 'areaClear': { if (T.area && T.area.hits === 0 && (!ev.area || T.area.id === ev.area)) set('area_flawless', 1); add('area_twenty'); T.area = null; break; }
    case 'bossStart': T.fight = { type: typeof ev.boss === 'string' ? ev.boss : (ev.bossType || ev.id || (ev.e && ev.e.type) || null), tonics: 0, hits: 0 }; break;
    case 'bossDown': case 'boss': {
      const bt = ev.boss && typeof ev.boss === 'string' ? ev.boss : (ev.bossType || ev.id || (ev.e && ev.e.type));
      const F = T.fight && (!T.fight.type || T.fight.type === bt) ? T.fight : null;
      const noTonic = ev.noTonic !== undefined ? !!ev.noTonic : (F ? F.tonics === 0 : false);
      const flawless = ev.flawless !== undefined ? !!ev.flawless : (F ? F.hits === 0 : false);
      add('boss_any'); add('boss_ten'); add('boss_fifty');
      for (const id in BOSS_ONE) if (BOSS_ONE[id] === bt) set(id, 1);
      for (const id in WITH) if (WITH[id][0] === bt && WITH[id][1] === hero) set(id, 1);
      if (bt === 'gaoler' && noTonic) set('kestrel_gaoler', 1);
      if (noTonic) add('boss_notonic');
      if (flawless) set('boss_flawless', 1);
      T.fight = null; break;
    }
    case 'shrine': add('ash_shrines'); break;
    case 'boon': {
      const r = resOf(ev.id, ev); const d = BOONS[ev.id];
      if (r) { const seen = meta.challengeSeen.res || (meta.challengeSeen.res = []); if (!seen.includes(r)) { seen.push(r); set('res_all', seen.length); } }
      if ((d && d.kind === 'duo') || (ev.id && String(ev.id).startsWith('duo_'))) set('res_duo', 1);
      if ((d && d.kind === 'crown') || (ev.id && String(ev.id).endsWith('_crown'))) set('res_crown', 1);
      break;
    }
    case 'event': add('events_twenty'); break;
    case 'ally': set('allies', 1); break;
    case 'runStart': add('runs_ten'); break;
    case 'runEnd': {
      if (ev.ending) { const seen = meta.challengeSeen.endings || (meta.challengeSeen.endings = []); if (!seen.includes(ev.ending)) seen.push(ev.ending); set('ending_any', 1); set('ending_all', seen.length); }
      break;
    }
    default: break;
  }

  // facts read from the run with every event
  if (run) {
    const act = run.act || 1; const st = run.stats || {};
    if (act > (T.act || 1)) { // a new act: was the last one finished dry?
      if (T.actTonics === 0) set('notonic_act', 1); T.actTonics = 0; T.act = act;
    }
    if (act >= 2) {
      if (hero === 'huntress') set('hollis_vesper', 1);
      if ((st.healed | 0) === 0 && (st.tonics | 0) === 0 && T.tonics === 0) set('wren_noheal', 1);
    }
    if (act >= 3) set('act3', 1);
    const rc = resCounts(run); const top = Math.max(0, ...Object.values(rc));
    if (top >= 3) set('wren_three', 1); if (top >= 5) set('res_five', 1);
    if ((run.boons || []).some((b) => b.rarity === 'legendary')) set('legendary', 1);
    if ((run.echoes || []).length >= 3) set('echo_three', 1);
  }
  return done;
}

// Everything the finished challenges have opened.
export function challengeUnlocks(meta) {
  ensure(meta); const D = new Set(meta.done);
  const out = { heroes: [], boons: [], res: {}, echoes: [], colours: {}, events: [] };
  for (const h in HERO_PAIRS) if (HERO_PAIRS[h].every((id) => D.has(id))) out.heroes.push(h);
  for (const c of CHALLENGES) {
    if (!D.has(c.id)) continue; const R = c.reward || {};
    if (R.boon) out.boons.push(R.boon);
    if (R.res) out.res[R.res.res] = R.res.tier;
    if (R.echo) out.echoes.push(R.echo);
    if (R.colour) (out.colours[R.colour.hero] || (out.colours[R.colour.hero] = [])).push(R.colour.id);
    if (R.event) out.events.push(R.event);
  }
  return out;
}
// what a locked warden waits on (the select screen shows it): [{ id, title, desc, n, of, done }]
export function heroUnlockOf(meta, heroId) {
  ensure(meta); return (HERO_PAIRS[heroId] || []).map((id) => { const c = CHALLENGE_MAP[id]; const p = c.progress(meta); return { id, title: c.title, desc: c.desc, n: p.n, of: p.of, done: meta.done.includes(id) }; });
}
// boons and Resonance tiers that stay out of the offers until a challenge opens them (boons.js may read this)
export function lockedBoons(meta) {
  const u = challengeUnlocks(meta || {}); const open = new Set(u.boons); const locked = [];
  for (const c of CHALLENGES) { const R = c.reward || {}; if (R.boon && !open.has(R.boon)) locked.push(R.boon); if (R.res && u.res[R.res.res] !== R.res.tier) locked.push(R.res.res + '_crown'); }
  return locked;
}
