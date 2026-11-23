// Acts II and III: the way out beyond the walls (at the Haven fire), the Hollow Archon's revelation in
// the Abyss, and the way into Act III (at the Haven fire again).
// PROPOSAL: every spoken line here comes from docs/STORY_BIBLE.md (the author may rewrite them).
import { cam, spawn, walk, face, anim, say, wait, fade, flash, shake, sound, music, call, flag, fx, title, tween } from '../cutscene.js';
import { heroP, bossP, toward, inZone, party, has } from './util.js';

// The wardens gathered round the Haven fire (the lead kneels at the mat, the others stand in an arc).
export function gathering(S) {
  const D = S.level.def; const F = D.fire; const ids = party(S).filter((id) => id !== S.lead);
  const spots = [[0.2, 1.9], [1.05, 1.75], [-0.6, 1.95], [1.75, 1.2], [-1.25, 1.6], [2.1, 0.4]]; // offsets from the fire (screen-near side)
  const out = [spawn('lead', { use: 'hero', x: D.kneel.x, z: D.kneel.z, face: Math.atan2(F.x - D.kneel.x, F.z - D.kneel.z), anim: 'rest' })];
  ids.forEach((id, i) => { const o = spots[i % spots.length]; const p = { x: F.x + o[0], z: F.z + o[1] }; out.push(spawn(id, { hero: id, x: p.x, z: p.z, face: Math.atan2(F.x - p.x, F.z - p.z) })); });
  return out;
}
const fireCam = (S, zoom = 1.5) => cam([S.level.def.fire.x + 0.6, 1.2, S.level.def.fire.z + 1.0], { zoom, dur: 0 });
const flare = () => call((cs) => { const F = cs.g.level && cs.g.level.fire; if (F && F.flare) F.flare(1); const D = cs.S.level.def; cs.g.fx.embers(D.fire.x, 1.1, D.fire.z, 40, [3, 1.5, 0.4]); cs.g.sound.play('lamp'); });
// a line from a warden if they are with the party, else from someone who is
const by = (S, ids, text, o = {}) => { const id = ids.find((x) => has(S, x)); if (!id) return null; return say(id === S.lead ? 'lead' : id, text, o); };

// ------------------------------------------------------------------ Act II opens at the Haven
export const act2Open = {
  id: 'act2.open', music: 'haven', fadeIn: true,
  steps: (S) => [
    ...gathering(S), fireCam(S, 1.5), fade(0, 1.2),
    title('ACT II', 'BEYOND THE WALLS', 3),
    flare(),
    by(S, ['wren', 'lamplighter'], 'THE SILENCE DID NOT BEGIN IN BELLMOURN. IT WAS SENT.'),
    by(S, ['lamplighter', 'wren'], 'THE TOLL CARRIED BEYOND THE WALLS. IT WOKE WHAT THE WHEEL LEFT ASLEEP.'),
    by(S, ['huntress'], 'TAM IS SAFE WITH THE OTHERS WHO WOKE. I AM COMING ANYWAY.'),
    by(S, ['bellbreaker'], 'NORTH, THEN. THROUGH THE SNOW, AND WHATEVER WAITS IN IT.'),
    say('lead', 'WE FOLLOW THE CHOIR\'S ROAD TO ITS SOURCE.'),
    flag('act2Open'),
  ],
};

// ------------------------------------------------------------------ the Hollow Archon's revelation
// After the Archon falls in the Abyss: he tells what the bell is; the Wheel overhead starts to turn.
export const archon = {
  id: 'archon.post', music: 'none',
  steps: (S) => {
    const b = bossP(S), h = heroP(S); const stand = inZone(S, toward(b, h, 2.6));
    const wheelAt = (S.def && S.def.boss && S.def.boss.zone) ? { x: (S.def.boss.zone[0] + S.def.boss.zone[2]) / 2, z: S.def.boss.zone[1] + 2 } : b;
    return [
      spawn('lead', { use: 'hero' }), spawn('boss', { use: 'boss' }),
      walk('lead', stand, { face: b, wait: false }),
      cam({ mid: ['lead', 'boss'] }, { zoom: 1.6, dur: 1.4 }),
      anim('boss', 'rest'),
      say('boss', 'YOU THINK YOUR BELL IS A BELL? IT IS A CAGE OF BRONZE.', { soft: true }),
      say('boss', 'THE FIRST FOUNDER CAUGHT A DYING GOD\'S VOICE IN IT. THE WORLD IS ITS BREATH.'),
      say('boss', 'THE WHEEL IS ITS JAILER. LET IT FINISH DYING, AND THE PRISON ENDS.'),
      say('boss', 'EVERY SOUL GOES FREE. IS THAT NOT WHAT A WARDEN WANTS?'),
      say('lead', 'NOT LIKE THIS.'),
      say('boss', 'HA... YOU CANNOT STOP A WHEEL BY BREAKING A SPOKE.'),
      anim('boss', 'die'),
      // above the Abyss the Wheel starts to turn
      call((cs) => { cs.g.wheelWakes = true; cs.g.sound.play('roar'); cs.g.sound.play('boom', { delay: 0.3 }); cs.g.atmos.flash(1); if (cs.g.settings.shake) cs.g.r.shake(0.9, 1.4); }, { keep: true }),
      cam([wheelAt.x, 6, wheelAt.z], { zoom: 0.85, dur: 2.2 }),
      wait(1.4),
      by(S, ['wren', 'hollis', 'lamplighter'], 'IT IS TURNING. THE WHOLE SKY IS TURNING.'),
      title('END OF ACT II', 'THE WHEEL HAS WOKEN.', 4),
      fade(1, 1),
      flag('act2End'),
    ];
  },
};

// ------------------------------------------------------------------ Act III opens at the Haven
export const act3Open = {
  id: 'act3.open', music: 'haven', fadeIn: true,
  steps: (S) => [
    ...gathering(S), fireCam(S, 1.5), fade(0, 1.2),
    title('ACT III', 'THE WHEEL', 3),
    flare(),
    by(S, ['wren'], 'NOW I KNOW WHAT THE CHOIR\'S LAST SONG IS FOR. IT ENDS THE TOLL FOREVER.'),
    by(S, ['hollis'], 'THE FIRST FOUNDRY SANK IN THE WEEPING MARSH. ITS BELLS ARE DROWNED THERE.'),
    by(S, ['kestrel'], 'THEN WE GO DOWN, CLIMB ITS MACHINE, AND OPEN ITS HEART.'),
    by(S, ['lamplighter', 'huntress'], 'WHATEVER IS AT THE END, WE MEET IT TOGETHER.'),
    say('lead', 'TO THE WHEEL.'),
    flag('act3Open'),
  ],
};

export default { [act2Open.id]: act2Open, [archon.id]: archon, [act3Open.id]: act3Open };
