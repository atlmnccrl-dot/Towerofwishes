// The end: the Voice in the Bell and the final choice (before the Wheel's fight), the three endings (the
// Dawn, Silence, the New Song) and the offer of New Game+ at the Haven fire.
// PROPOSAL: every spoken line here comes from docs/STORY_BIBLE.md (the author may rewrite them).
import * as THREE from '../../../vendor/three.module.min.js';
import { cam, spawn, walk, face, anim, say, wait, fade, flash, shake, sound, music, call, flag, fx, title, tween, choice, place, dawn, par } from '../cutscene.js';
import { heroP, bossP, scr, toward, inZone, bellOf, bellP, party, has, wardenSpec, lampP } from './util.js';
import { trueEndingReady } from '../progress.js';
import { gathering } from './act2.js';

const ready = (S) => { try { return !!trueEndingReady(S.save); } catch (e) { return false; } };
// the party stands in a row on the screen-near side of a centre, facing a point (both may be functions of
// the scene's context, read when the step runs: a later stage has its own places)
function partyRow(S, centre, faceTo, opts = {}) {
  const ids = party(S); const n = ids.length;
  return ids.map((id, i) => spawn(id === S.lead ? 'lead' : id, (SS) => {
    const c = typeof centre === 'function' ? centre(SS) : centre; const f = typeof faceTo === 'function' ? faceTo(SS) : faceTo;
    const p = scr(c, (i - (n - 1) / 2) * (opts.gap || 1.25), opts.u ?? 0);
    const spec = opts.staged ? { hero: id, x: p.x, z: p.z } : wardenSpec(SS, id, p);
    if (spec.use) { delete spec.x; delete spec.z; return spec; } // the hero walks there from where they stand
    return { ...spec, face: Math.atan2(f.x - p.x, f.z - p.z) };
  }));
}

// ------------------------------------------------------------------ the Voice and the choice
export const finalChoice = {
  id: 'finale.choice', music: 'none',
  steps: (S) => {
    const b = bossP(S), h = heroP(S); const voiceAt = inZone(S, toward(b, h, 1.5)); const row = inZone(S, toward(voiceAt, h, 3.4));
    const song = ready(S);
    // at the Throne (Act VI) it is God Himself who speaks, from His seat; elsewhere (no Throne built yet) the Voice
    // appears before the Wheel as it always did
    if (S.def && S.def.id === 'throne') return throneChoice(S, b, h, song);
    // the bell that holds the Voice hangs over the Empyrean's far end (level data, or where the region puts it)
    const vb = (S.def && S.def.voiceBell) || (S.def && S.def.id === 'empyrean' ? { x: 4, y: 3.6, z: -60.2 } : null);
    const bellPt = vb ? [vb.x, vb.y ?? 3.6, vb.z] : null;
    return [
      ...partyRow(S, row, voiceAt),
      cam({ mid: ['lead', voiceAt] }, { zoom: 1.3, dur: 1.4, wait: false }),
      walk('lead', toward(voiceAt, row, 2.4), { face: voiceAt }),
      call((cs) => { cs.g.sound.play('special'); cs.g.fx.embers(voiceAt.x, 1.5, voiceAt.z, 60, [3, 2.8, 1.8]); cs.g.r.post.flash = 0.25; cs.g.flashT = 0.15; }),
      spawn('voice', { look: 'voice', x: voiceAt.x, z: voiceAt.z, face: Math.atan2(row.x - voiceAt.x, row.z - voiceAt.z) }),
      bellPt ? cam({ mid: ['voice', bellPt] }, { zoom: 1.05, dur: 1.6 }) : null,
      say('voice', 'WARDEN. I AM THE VOICE IN YOUR BELL. I AM SO TIRED.'),
      cam({ mid: ['lead', 'voice'] }, { zoom: 1.55, dur: 1.2, wait: false }),
      say('voice', 'I COULD DIE. YOUR WORLD WOULD END GENTLY, LIKE A SONG ENDS.'),
      say('voice', 'OR BIND ME AGAIN, AND THE TOLL GOES ON, AS IT ALWAYS HAS.'),
      song ? say('voice', 'OR... SO MANY VOICES WALK WITH YOU. IF THEY SANG WITH ME, I MIGHT CHANGE.') : null,
      call((cs) => { cs.g.sound.play('roar'); if (cs.g.settings.shake) cs.g.r.shake(0.6, 1); cs.g.atmos.flash(0.8); }),
      say('voice', 'CHOOSE QUICKLY. THE WHEEL WILL NOT LET YOU CHOOSE IN PEACE.'),
      choice('final', [
        { id: 'ring', label: 'RING', sub: 'BIND IT AGAIN: THE DAWN AS IT WAS' },
        { id: 'silence', label: 'SILENCE', sub: 'LET IT DIE: AN ENDLESS NIGHT', color: '#b8b4c8' },
        { id: 'sing', label: 'SING', sub: 'ALL VOICES SING WITH IT: A NEW DAWN', color: '#ffe8a8', when: song },
      ], { prompt: 'WHAT WILL YOU DO?' }),
      call((cs) => {
        const c = cs.result.final; const L = { ring: 'THEN WE RING. AS WARDENS ALWAYS HAVE.', silence: '...THEN REST. I WILL HOLD THE BELL STILL.', sing: 'THEN SING WITH US. ALL OF US.' }[c] || '';
        cs.queue.splice(cs.i, 0, say('lead', L, { soft: c === 'silence' }), c === 'silence' ? null : say('voice', c === 'sing' ? 'YES... I HEAR THEM. THEN DEFEND THE SONG.' : 'THEN BREAK THE WHEEL\'S HOLD, AND RING.'));
        cs.queue = cs.queue.filter(Boolean);
      }),
      call((cs) => { cs.g.save.choice = cs.result.final; cs.g.save.flags = cs.g.save.flags || {}; cs.g.save.flags.finalChoice = cs.result.final; }, { keep: true }),
    ];
  },
};

// PROPOSAL: the choice at the Throne. God speaks from His seat; the bells hang silent at His sides.
function throneChoice(S, b, h, song) {
  const stand = inZone(S, toward(b, h, 6)); const row = inZone(S, toward(stand, h, 2.4));
  const V = (t, o = {}) => say('voice', t, { actor: null, ...o });
  return [
    ...partyRow(S, row, b),
    cam({ mid: ['lead', b] }, { zoom: 1.0, dur: 1.6, wait: false }),
    walk('lead', stand, { face: b }),
    call((cs) => { cs.g.sound.play('bigBell'); cs.g.r.post.flash = 0.3; cs.g.flashT = 0.15; if (cs.g.settings.shake) cs.g.r.shake(0.5, 1); }),
    V('SO. THE LITTLE KEEPERS OF MY CAGE CLIMB UP TO ME.'),
    V('A THOUSAND YEARS YOUR WORLD BREATHED MY BREATH. EVERY DAWN, MY SCREAM.'),
    say('lead', 'WE DID NOT KNOW.'),
    V('NOW YOU KNOW. CHOOSE, WARDEN. THE LAST CHOICE ANYONE WILL MAKE.'),
    V('BIND ME AGAIN, IF YOU CAN. AND THE TOLL GOES ON.'),
    V('OR KNEEL, AND LET ME END IT. A LONG QUIET NIGHT, AND NOTHING AFTER.'),
    song ? V('...OR. SO MANY VOICES WALK WITH YOU. I HAVE NOT HEARD SINGING IN A THOUSAND YEARS.', { soft: true }) : null,
    choice('final', [
      { id: 'ring', label: 'RING', sub: 'BIND HIM AGAIN: THE DAWN AS IT WAS' },
      { id: 'silence', label: 'SILENCE', sub: 'KNEEL: AN ENDLESS NIGHT', color: '#b8b4c8' },
      { id: 'sing', label: 'SING', sub: 'EVERY VOICE SINGS TO HIM: A NEW DAWN', color: '#ffe8a8', when: song },
    ], { prompt: 'WHAT WILL YOU DO?' }),
    call((cs) => {
      const c = cs.result.final;
      const L = { ring: 'THEN WE RING YOU BACK INTO THE BRONZE.', silence: '...THEN REST. ALL OF US.', sing: 'THEN LISTEN. WE CAME TO SING.' }[c] || '';
      const R = { ring: 'THEN COME AND TRY.', silence: null, sing: 'SINGING. THEN SING LOUDER THAN MY TOLL.' }[c];
      cs.queue.splice(cs.i, 0, say('lead', L, { soft: c === 'silence' }), R ? V(R) : null);
      cs.queue = cs.queue.filter(Boolean);
    }),
    call((cs) => { cs.g.save.choice = cs.result.final; cs.g.save.flags = cs.g.save.flags || {}; cs.g.save.flags.finalChoice = cs.result.final; }, { keep: true }),
  ].filter(Boolean);
}

// ------------------------------------------------------------------ the Dawn: bound again, the wardens keep the bell
export const endDawn = {
  id: 'end.dawn', music: 'none',
  steps: (S) => [
    fade(1, 0.8), place('belfry', { at: 'bell' }), call((cs) => { cs.g.r.post.dawn = 0; }),
    ...partyRow(S, (SS) => ({ x: bellP(SS).x, z: bellP(SS).z + 3.4 }), (SS) => bellP(SS), { staged: true, gap: 1.1 }),
    cam((SS) => ({ x: bellP(SS).x, y: 2, z: bellP(SS).z + 2.4 }), { zoom: 1.25, dur: 0 }),
    fade(0, 1.6), music('dawn'),
    title('THE DAWN', '', 2.6),
    call((cs) => { const b = bellOf(cs.S); if (b && b.ring) b.ring(0.6); cs.g.sound.play('bigBell'); }),
    dawn(0.75, 6),
    say('lead', 'HE SLEEPS IN THE BRONZE AGAIN. THE TOLL GOES ON.'),
    say(has(S, 'lamplighter') && S.lead !== 'lamplighter' ? 'lamplighter' : 'bellbreaker', 'SOMEONE MUST KEEP IT NOW. EVERY DAWN. FOREVER.'),
    say('lead', 'THEN WE KEEP IT.'),
    call((cs) => { for (const [id, e] of cs.actors) if (e.heroId) { e.anim = 'kneel'; e.animT = 0; } }),
    wait(0.7), call((cs) => { for (const [id, e] of cs.actors) if (e.heroId) { e.anim = 'rest'; e.animT = 0; } }),
    call((cs) => { const b = bellOf(cs.S); if (b && b.ring) b.ring(0.5); cs.g.sound.play('bigBell'); }),
    say(S.lead === 'huntress' ? 'warden' : 'huntress', 'LISTEN. THE RAIN HAS STOPPED.', { soft: true }),
    cam((SS) => ({ x: bellP(SS).x, y: 2, z: bellP(SS).z + 2 }), { zoom: 0.9, dur: 4, wait: false }),
    title('ENDING: THE DAWN', 'THE WARDENS BECOME THE KEEPERS OF THE GREAT BELL.', 5),
    fade(1, 1.4),
    call((cs) => { cs.g.save.ending = 'dawn'; }, { keep: true }),
  ],
};

// ------------------------------------------------------------------ Silence: the warden takes the saint's place
export const endSilence = {
  id: 'end.silence', music: 'none',
  steps: (S) => [
    fade(1, 0.8), place('belfry', { at: 'bell' }),
    call((cs) => { cs.g.r.post.dawn = 0; cs.g.atmos.lightning = false; }),
    spawn('lead', (SS) => ({ hero: SS.lead, x: bellP(SS).x - 0.4, z: bellP(SS).z + 2.0, face: Math.PI })),
    cam((SS) => ({ x: bellP(SS).x, y: 1.8, z: bellP(SS).z + 1.6 }), { zoom: 1.7, dur: 0 }),
    fade(0, 2.2),
    title('SILENCE', '', 2.6),
    say('voice', 'THANK YOU. IT WILL NOT HURT.', { soft: true }),
    anim('lead', 'cast'),
    call((cs) => { const b = bellOf(cs.S); if (b) b.amp = 0; cs.g.sound.play('toll', { f: 73, vol: 0.5 }); }),
    say('lead', 'SLEEP. ALL OF YOU. SLEEP.', { soft: true }),
    // the lamps go out one by one, the night closes in
    tween((k, cs) => { const src = cs.g.atmos.sources || []; const n = src.length; src.forEach((s, i) => { if (s.base === undefined) s.base = s.intensity; s.intensity = s.base * (k * n > i ? 0 : 1); }); cs.g.atmos.moon.intensity = Math.max(0.3, cs.g.atmos.moon.intensity * (1 - k * 0.02)); }, 5),
    anim('lead', 'kneel', { then: 'rest', after: 0.6 }),
    cam((SS) => ({ x: bellP(SS).x, y: 2.2, z: bellP(SS).z + 1.6 }), { zoom: 1.0, dur: 4, wait: false }),
    title('ENDING: SILENCE', 'THE WARDEN TAKES SAINT SILENCE\'S PLACE. THE NIGHT NEVER ENDS.', 5),
    fade(1, 2),
    call((cs) => { cs.g.save.ending = 'silence'; cs.g.atmos.lightning = true; }, { keep: true }),
  ],
};

// ------------------------------------------------------------------ the New Song: every voice sings, the dawn is born
const BELLS = [147, 196, 220, 262, 294, 330, 392, 440, 523, 587];
export const endSong = {
  id: 'end.song', music: 'none',
  steps: (S) => [
    // the Wheel stops for good, its eyes closing one by one
    spawn('lead', { use: 'hero' }),
    cam({ mid: ['lead', bossP(S)] }, { zoom: 1.2, dur: 1.2 }),
    call((cs) => { cs.g.sound.play('special'); for (let i = 0; i < 6; i++) cs.g.sound.play('toll', { f: BELLS[i], delay: i * 0.35, vol: 0.6 }); }),
    tween((k, cs) => { cs.g.r.post.flash = 0.4 * Math.sin(k * Math.PI); }, 2.4),
    fade(1, 1), place('gate', { at: 'start' }),
    call((cs) => { cs.g.r.post.dawn = 0.3; }),
    ...songStage(S),
    fade(0, 1.6), music('dawn'),
    music('song'), title('THE NEW SONG', '', 2.6),
    dawn(1, 7),
    call((cs) => { BELLS.forEach((f, i) => cs.g.sound.play('toll', { f, delay: 0.2 + i * 0.45, vol: 0.7 })); cs.g.sound.play('bigBell', { delay: 0.1 }); }),
    call((cs) => { for (const [id, e] of cs.actors) if (id.startsWith('hu')) { e.anim = 'rise'; e.animT = 0; cs.g.fx.embers(e.x, 1.4, e.z, 30, [3, 2.6, 1.4]); } }),
    tween((k, cs) => { if (Math.random() < 0.5) { const p = cs.camPos; cs.g.fx.embers(p.x + (Math.random() - 0.5) * 12, 0.5, p.z + (Math.random() - 0.5) * 12, 3, [3, 2.6, 1.2]); } }, 14, { wait: false }),
    by(S, ['wren'], 'LISTEN. EVERY VOICE IS SINGING.'),
    by(S, ['hollis'], 'THE BELLS. ALL HUNDRED OF THEM.'),
    say('voice', 'I AM NOT BOUND. I AM NOT DYING. I AM THE DAWN.', { actor: null }),
    by(S, ['huntress'], 'TAM. SING WITH ME.'),
    say('lead', 'WE RANG IT. AND IT SANG BACK.'),
    call((cs) => { BELLS.slice().reverse().forEach((f, i) => cs.g.sound.play('toll', { f, delay: i * 0.3, vol: 0.6 })); }),
    cam((SS) => ({ x: cs0(SS).x, y: 1.5, z: cs0(SS).z }), { zoom: 0.85, dur: 4.5, wait: false }),
    title('ENDING: THE NEW SONG', 'GOD IS NOT BOUND. GOD DOES NOT DIE. GOD BECOMES THE DAWN.', 5),
    fade(1, 1.6),
    call((cs) => { cs.g.save.ending = 'song'; }, { keep: true }),
  ],
};
const cs0 = (SS) => ({ x: SS.def.start.x, z: SS.def.start.z - 6 });
const by = (S, ids, text, o = {}) => { const id = ids.find((x) => has(S, x)); if (!id) return null; return say(id === S.lead ? 'lead' : id, text, o); };
// Gallows Gate at sunrise: the seven wardens in the courtyard, the freed Hushed round them
function songStage(S) {
  const C = (SS) => ({ x: SS.def.start.x + 1.5, z: SS.def.start.z - 6 });
  const out = [];
  party(S).forEach((id, i, arr) => out.push(spawn(id === S.lead ? 'lead' : id, (SS) => { const c = C(SS); const p = scr(c, (i - (arr.length - 1) / 2) * 1.2, 0); return { hero: id, x: p.x, z: p.z, face: Math.atan2(-0.7, -0.7) }; })));
  for (let i = 0; i < 8; i++) out.push(spawn('hu' + i, (SS) => { const c = C(SS); const a = i / 8 * Math.PI * 2; const p = { x: c.x + Math.cos(a) * 4.2, z: c.z + Math.sin(a) * 3.4 - 1 }; return { look: i === 3 ? 'tam' : 'freed', x: p.x, z: p.z, face: Math.atan2(c.x - p.x, c.z - p.z), anim: 'rest', speaker: i === 3 ? 'tam' : 'freed' }; }));
  out.push(cam((SS) => ({ ...C(SS), y: 1.2 }), { zoom: 1.25, dur: 0 }));
  out.push(call((cs) => { for (const [id, e] of cs.actors) if (id.startsWith('hu')) e.heroId = 'lamplighter'; }));
  return out;
}

// ------------------------------------------------------------------ New Game+ at the Haven fire
export const ngplus = {
  id: 'ngplus', music: 'haven', fadeIn: true,
  steps: (S) => [
    place('haven'),
    spawn('lead', (SS) => ({ hero: SS.lead, x: SS.def.kneel.x, z: SS.def.kneel.z, face: Math.atan2(SS.def.fire.x - SS.def.kneel.x, SS.def.fire.z - SS.def.kneel.z), anim: 'rest' })),
    S.lead === 'lamplighter' ? null : spawn('ash', (SS) => { const p = { x: SS.def.fire.x + 0.3, z: SS.def.fire.z + 1.6 }; return { hero: 'lamplighter', x: p.x, z: p.z, face: Math.atan2(SS.def.kneel.x - p.x, SS.def.kneel.z - p.z) }; }),
    cam((SS) => ({ x: SS.def.fire.x + 0.6, y: 1.2, z: SS.def.fire.z + 1.0 }), { zoom: 1.6, dur: 0 }),
    fade(0, 1.4),
    say(S.lead === 'lamplighter' ? 'lead' : 'ash', 'THE FIRE STILL BURNS. IT WILL, WHILE SOMEONE TENDS IT.'),
    say(S.lead === 'lamplighter' ? 'lead' : 'ash', 'BUT THE NIGHT REMEMBERS. ITS SERVANTS WILL RISE AGAIN, STRONGER.'),
    choice('ngplus', [
      { id: 'ng', label: 'BEGIN NEW GAME+', sub: 'KEEP LEVELS AND GEAR; BOSSES ASCEND' },
      { id: 'title', label: 'REST BY THE FIRE', sub: 'RETURN TO THE TITLE' },
    ], { prompt: 'THE ROAD OPENS AGAIN' }),
  ],
};

export default { [finalChoice.id]: finalChoice, [endDawn.id]: endDawn, [endSilence.id]: endSilence, [endSong.id]: endSong, [ngplus.id]: ngplus };
