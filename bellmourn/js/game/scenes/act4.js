// Acts IV to VI (docs/ASCENT_DESIGN.md §2): the Wheel breaks and the Voice wakes; the way into the Drowned Heaven,
// the God's Dream and the Throne (each at the Haven fire); the Last Seraph's fall at the Broken Halo; the First
// Founder's fall at the Cradle of Bronze.
// PROPOSAL: every spoken line here is new, for the author to rewrite.
import { cam, spawn, walk, anim, say, wait, fade, call, flag, title } from '../cutscene.js';
import { heroP, bossP, toward, inZone, has } from './util.js';
import { gathering } from './act2.js';

const fireCam = (S, zoom = 1.5) => cam([S.level.def.fire.x + 0.6, 1.2, S.level.def.fire.z + 1.0], { zoom, dur: 0 });
const flare = () => call((cs) => { const F = cs.g.level && cs.g.level.fire; if (F && F.flare) F.flare(1); const D = cs.S.level.def; cs.g.fx.embers(D.fire.x, 1.1, D.fire.z, 40, [3, 1.5, 0.4]); cs.g.sound.play('lamp'); });
const by = (S, ids, text, o = {}) => { const id = ids.find((x) => has(S, x)); if (!id) return null; return say(id === S.lead ? 'lead' : id, text, o); };
const voice = (text, o = {}) => say('voice', text, { actor: null, ...o });
const quake = (amt = 0.8) => call((cs) => { cs.g.sound.play('roar'); cs.g.sound.play('boom', { delay: 0.2 }); if (cs.g.settings.shake) cs.g.r.shake(amt, 1.2); cs.g.atmos.flash(0.8); });

// ------------------------------------------------------------------ the Wheel breaks; the Voice wakes
export const wheelPost = {
  id: 'wheel.post', music: 'none',
  steps: (S) => {
    const b = bossP(S), h = heroP(S); const stand = inZone(S, toward(b, h, 3));
    return [
      spawn('lead', { use: 'hero' }),
      walk('lead', stand, { face: b, wait: false }),
      cam({ mid: ['lead', b] }, { zoom: 1.3, dur: 1.4 }),
      by(S, ['wren', 'lamplighter'], 'THE WHEEL IS STILL. THE JAILER IS DEAD.'),
      wait(0.8), quake(0.9),
      voice('...OUT.', { soft: true }),
      voice('A THOUSAND YEARS IN BRONZE. EVERY DAWN YOU HAD WAS ME, SCREAMING.'),
      voice('I WAS THE DAWN. YOU MADE ME A BELL.'),
      by(S, ['huntress', 'bellbreaker'], 'THAT IS NOT GRATITUDE.'),
      voice('I WILL TOLL YOUR WORLD BACK INTO THE SILENCE I CAME FROM. AND BEGIN AGAIN.'),
      quake(1.1),
      title('END OF ACT III', 'THE VOICE IS AWAKE.', 4),
      fade(1, 1),
      flag('wheelBroken'),
    ];
  },
};

// ------------------------------------------------------------------ Act IV opens at the Haven: the Drowned Heaven
export const act4Open = {
  id: 'act4.open', music: 'haven', fadeIn: true,
  steps: (S) => [
    ...gathering(S), fireCam(S, 1.5), fade(0, 1.2),
    title('ACT IV', 'THE DROWNED HEAVEN', 3),
    flare(),
    by(S, ['wren', 'lamplighter'], 'WHEN THE WHEEL BROKE, HEAVEN FELL WITH IT. INTO A SEA OF BELL-BRONZE.'),
    by(S, ['hollis'], 'I HEAR IT UNDER THE WATER. A CHOIR. IT NEVER STOPPED SINGING.'),
    by(S, ['kestrel', 'huntress'], 'AND HE IS ON THE OTHER SIDE OF IT. WAITING.'),
    by(S, ['bellbreaker'], 'THEN WE WADE.'),
    say('lead', 'THROUGH HEAVEN, THEN. WHAT IS LEFT OF IT.'),
    flag('act4Open'),
  ],
};

// ------------------------------------------------------------------ the Last Seraph falls at the gate of the halo
export const seraphPost = {
  id: 'seraph.post', music: 'none',
  steps: (S) => {
    const b = bossP(S), h = heroP(S); const stand = inZone(S, toward(b, h, 2.6));
    return [
      spawn('lead', { use: 'hero' }), spawn('boss', { use: 'boss' }),
      walk('lead', stand, { face: b, wait: false }),
      cam({ mid: ['lead', 'boss'] }, { zoom: 1.55, dur: 1.4 }),
      anim('boss', 'rest'),
      say('boss', 'I KEPT HIS GATE SINCE BEFORE YOUR CITY HAD A NAME.', { soft: true }),
      say('boss', 'HE WAS KIND, ONCE. BEFORE THE BRONZE.'),
      say('lead', 'THEN HELP US.'),
      say('boss', 'I CANNOT. BUT I WILL NOT STOP YOU. GO INTO HIS DREAM. DO NOT WAKE HIM GENTLY.'),
      anim('boss', 'die'),
      call((cs) => { cs.g.sound.play('bigBell'); cs.g.atmos.flash(0.6); }),
      wait(1),
      title('END OF ACT IV', 'THE GATE OF HEAVEN STANDS OPEN.', 4),
      fade(1, 1),
      flag('seraphFallen'),
    ];
  },
};

// ------------------------------------------------------------------ Act V opens at the Haven: the God's Dream
export const act5Open = {
  id: 'act5.open', music: 'haven', fadeIn: true,
  steps: (S) => [
    ...gathering(S), fireCam(S, 1.5), fade(0, 1.2),
    title('ACT V', 'THE GOD\'S DREAM', 3),
    flare(),
    by(S, ['lamplighter', 'wren'], 'BEYOND THE HALO HE SLEEPS. AND HE DREAMS.'),
    by(S, ['wren'], 'IN HIS DREAM THERE IS A BODY OF BRONZE. AND A CITY THAT LOOKS LIKE OURS.'),
    by(S, ['huntress'], 'THE FIRST FOUNDER IS THERE. THE ONE WHO CAUGHT HIM.'),
    by(S, ['kestrel', 'bellbreaker'], 'A THOUSAND YEARS, GUARDING A CAGE. HE WILL NOT STEP ASIDE.'),
    say('lead', 'THEN WE WALK INTO THE DREAM AND OUT OF IT.'),
    flag('act5Open'),
  ],
};

// ------------------------------------------------------------------ the First Founder falls at the Cradle
export const founderPost = {
  id: 'firstfounder.post', music: 'none',
  steps: (S) => {
    const b = bossP(S), h = heroP(S); const stand = inZone(S, toward(b, h, 2.6));
    return [
      spawn('lead', { use: 'hero' }), spawn('boss', { use: 'boss' }),
      walk('lead', stand, { face: b, wait: false }),
      cam({ mid: ['lead', 'boss'] }, { zoom: 1.55, dur: 1.4 }),
      anim('boss', 'kneelF'),
      say('boss', 'I HEARD HIM DYING. I CAUGHT HIS LAST BREATH IN BRONZE SO THE WORLD WOULD NOT STOP.', { soft: true }),
      say('boss', 'EVERY TOLL SINCE HAS BEEN HIS PAIN. I KNEW. I RANG IT ANYWAY.'),
      say('lead', 'YOU SAVED US. AND YOU CAGED HIM.'),
      say('boss', 'BOTH. ALWAYS BOTH. GO ON. HE IS ALREADY WAKING.'),
      anim('boss', 'die'),
      quake(1.0),
      call((cs) => { cs.g.sound.play('bigBell'); }),
      wait(1),
      title('END OF ACT V', 'HE WAKES.', 4),
      fade(1, 1),
      flag('founderFallen'),
    ];
  },
};

// ------------------------------------------------------------------ Act VI opens at the Haven: the Throne
export const act6Open = {
  id: 'act6.open', music: 'haven', fadeIn: true,
  steps: (S) => [
    ...gathering(S), fireCam(S, 1.6), fade(0, 1.2),
    title('ACT VI', 'THE THRONE OF THE TOLL', 3.4),
    flare(),
    by(S, ['wren', 'lamplighter'], 'HE HAS LEFT THE BELL. HE SITS ABOVE THE CLOUDS, ON A THRONE OF IT.'),
    by(S, ['hollis'], 'AND HE IS RINGING. CAN YOU HEAR IT? EVERY TOLL TAKES A LITTLE MORE.'),
    by(S, ['huntress', 'kestrel'], 'THEN THERE IS NOT MUCH TIME.'),
    by(S, ['bellbreaker'], 'WE HAVE BROKEN A WHEEL, A SAINT AND AN ANGEL. ONE MORE.'),
    say('lead', 'HE IS A GOD. HE IS ALSO IN PAIN. WE WILL SEE WHICH ONE ANSWERS.'),
    flag('act6Open'),
  ],
};

export default { [wheelPost.id]: wheelPost, [act4Open.id]: act4Open, [seraphPost.id]: seraphPost, [act5Open.id]: act5Open, [founderPost.id]: founderPost, [act6Open.id]: act6Open };
