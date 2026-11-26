// Every cutscene by id, and which scene plays at which moment of the game (game.js asks here).
import prologue from './prologue.js';
import act1 from './act1.js';
import act2 from './act2.js';
import finale from './finale.js';
import act4 from './act4.js'; // Acts IV-VI: the Voice wakes, the Seraph, the First Founder, the way to the Throne

export const SCENES = { ...prologue, ...act1, ...act2, ...act4, ...finale };

// after a boss falls (by boss type)
export const AFTER_BOSS = { gaoler: 'recruit.kestrel', tallow: 'recruit.ash', harbormaster: 'recruit.hollis', deacon: 'recruit.wren', founder: 'founder.post', regent: 'regent.post', silence: 'belfry.bell', archon: 'archon.post', wheel: 'wheel.post', seraph: 'seraph.post', firstfounder: 'firstfounder.post' };
// before a boss's fight (the boss stands in the arena, held still)
export const BEFORE_BOSS = { founder: 'founder.pre', silence: 'silence.pre' };
// on entering a level for the first time (in this playthrough)
export const ON_ENTER = { prologue: 'prologue.road' };
// what each scene stands in, for the scene test (a level id, 'haven', or the boss arena of a level)
export const STAGE = {
  'prologue.road': { level: 'prologue' }, 'road.short': { level: 'prologue' }, 'prologue.meet': { level: 'prologue', at: 'exit' }, 'haven.ash': { haven: true, fresh: true },
  'recruit.kestrel': { level: 'gate', boss: 'dead' }, 'recruit.ash': { level: 'market', boss: 'dead' }, 'recruit.hollis': { level: 'docks', boss: 'dead' }, 'recruit.wren': { level: 'nave', boss: 'dead' },
  'founder.pre': { level: 'foundry', boss: 'alive' }, 'founder.post': { level: 'foundry', boss: 'dead' }, 'regent.post': { level: 'heights', boss: 'dead' },
  'silence.pre': { level: 'belfry', boss: 'alive' }, 'belfry.bell': { level: 'belfry', boss: 'dead' }, 'act1.end': { level: 'belfry', boss: 'dead' },
  'act2.open': { haven: true }, 'act4.open': { haven: true }, 'act5.open': { haven: true }, 'act6.open': { haven: true }, 'wheel.post': { level: 'empyrean', boss: 'dead' }, 'seraph.post': { level: 'halo', boss: 'dead' }, 'firstfounder.post': { level: 'cradle', boss: 'dead' }, 'archon.post': { level: 'abyss', boss: 'dead' }, 'act3.open': { haven: true },
  'finale.choice': { level: 'throne', boss: 'alive', fallback: 'empyrean' }, 'end.dawn': { level: 'empyrean', boss: 'dead', fallback: 'abyss' }, 'end.silence': { level: 'empyrean', boss: 'none', fallback: 'abyss' }, 'end.song': { level: 'empyrean', boss: 'dead', fallback: 'abyss' },
  'ngplus': { haven: true },
};
