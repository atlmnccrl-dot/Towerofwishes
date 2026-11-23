// The prologue on the Old Road (the warden alone, the crow-masked warden at the gate, the three wardens
// meeting) and Sister Ash at the first visit to the Haven.
// PROPOSAL: every spoken line here comes from docs/STORY_BIBLE.md (the author may rewrite them).
import { cam, spawn, remove, walk, face, anim, say, wait, fade, flash, sound, call, flag, fx, par, title, tween } from '../cutscene.js';
import { heroP, scr, ahead, wardenSpec, has } from './util.js';

// The Old Road: the lead walks alone toward the dark city; a Bell Warden in a crow's mask blocks the way.
export const road = {
  id: 'prologue.road', music: 'title', fadeIn: true,
  steps: (S) => {
    const h = heroP(S); const crowAt = ahead(h, 7.5); const carmine = S.lead === 'warden';
    return [
      spawn('lead', { use: 'hero', face: h.face, anim: 'idle' }),
      cam(scr(h, 0, 1.2), { zoom: 1.7, dur: 0 }),
      fade(0, 1.4),
      title('PROLOGUE', 'THE OLD ROAD', 2.6),
      walk('lead', ahead(h, 2.2)),
      say('lead', carmine ? 'HOME. IT WAS NEVER THIS DARK.' : 'BELLMOURN. A HUNDRED NIGHTS, AND NO DAWN.'),
      flash(1), sound('thunder', { vol: 0.9, big: true }),
      spawn('crow', { look: 'crow', x: crowAt.x, z: crowAt.z, face: h.face + Math.PI, speaker: 'crow' }), fx('mist', crowAt, 26, [0.3, 0.32, 0.38]),
      cam({ mid: ['lead', 'crow'] }, { zoom: 1.45, dur: 1.4 }),
      say('crow', carmine ? 'OATHBREAKER. YOU SWORE NEVER TO COME BACK.' : 'TURN BACK. THE BELL IS SILENT BY OATH.'),
      say('lead', carmine ? 'I SWORE TO RING THE BELL. I STILL DO.' : 'THEN THE OATH IS WRONG.'),
      say('crow', 'WE SWORE THE OATH OF SILENCE. ALL OF US WHO STAYED.'),
      say('crow', 'WALK ON, THEN. THE HUSHED WILL SEE YOU HOME.'),
      face('crow', h.face, { dur: 0.5 }),
      walk('crow', ahead(crowAt, 3, h.face), { wait: false }), wait(0.9), fx('mist', 'crow', 30, [0.3, 0.32, 0.38]), remove('crow'),
      cam(scr(ahead(h, 2.2), 0, 1.2), { zoom: 1.2, dur: 1.2 }),
      flag('prologueRoad'),
    ];
  },
};

// At the gate: the two other starters join the lead (Vesper drops from the wall, Bram steps out of the
// dark; whoever is the lead, the other two come). Works anywhere: placed around the hero.
export const meet = {
  id: 'prologue.meet', music: 'title',
  steps: (S) => {
    const h = heroP(S); const f = h.face ?? Math.PI;
    const dropper = S.lead === 'huntress' ? 'warden' : 'huntress';
    const walker = S.lead === 'bellbreaker' ? 'warden' : 'bellbreaker';
    const land = scr(ahead(h, 1.4, f), -1.9, 0); const out0 = ahead(h, 6.5, f); const out1 = scr(ahead(h, 1.2, f), 1.9, 0.3);
    const lines = {
      huntress: 'YOU WALK LOUD FOR A WARDEN. I HEARD YOU FROM THE ROOFS.',
      warden: 'THE ROAD WAS WATCHED. I CAME OVER THE WALL.',
    };
    return [
      spawn('lead', { use: 'hero', face: f, anim: 'idle' }),
      cam(scr(h, 0, 1), { zoom: 1.7, dur: 0.8 }),
      spawn('a', { hero: dropper, x: land.x, z: land.z, y: 5, face: f + Math.PI, anim: 'dash' }),
      call((cs) => { const a = cs.actor('a'); cs.dropT = 0; cs.dropA = a; }),
      tween((k, cs) => { const a = cs.actor('a'); if (a) a.leapH = 5 * (1 - k * k); }, 0.5),
      call((cs) => { const a = cs.actor('a'); if (a) { a.leapH = 0; a.anim = 'kneel'; a.animT = 0.3; } cs.g.fx.dust(land.x, land.z, 14); cs.g.sound.play('boom', { vol: 0.5 }); }),
      anim('a', 'rise'), anim('lead', 'idle'), face('lead', land),
      say('a', lines[dropper]),
      spawn('b', { hero: walker, x: out0.x, z: out0.z, face: f + Math.PI }),
      cam({ mid: ['lead', 'a', 'b'] }, { zoom: 1.45, dur: 1.2, wait: false }),
      walk('b', out1), face('lead', out1),
      say('b', walker === 'bellbreaker' ? 'AND YOU\'LL NOT GO IN WITHOUT ME.' : 'NOT WITHOUT ME. NEVER AGAIN.'),
      face('lead', { mid: ['a', 'b'] }),
      say('huntress', 'MY BROTHER TAM IS ONE OF THE HUSHED. NOBODY HARMS THEM.', { actor: S.lead === 'huntress' ? 'lead' : 'a' }),
      say('warden', 'THE BELL WILL WAKE THEM. I SWEAR IT.', { actor: S.lead === 'warden' ? 'lead' : (dropper === 'warden' ? 'a' : 'b') }),
      say('bellbreaker', 'I HELPED POUR THE BELL THAT SILENCED IT. I\'LL BREAK IT.', { actor: S.lead === 'bellbreaker' ? 'lead' : 'b' }),
      say('bellbreaker', 'THREE WARDENS, THEN. WE RING IT, OR WE DROWN.', { actor: S.lead === 'bellbreaker' ? 'lead' : 'b' }),
      par(face('a', ahead(h, 8, f)), face('b', ahead(h, 8, f)), face('lead', ahead(h, 8, f))),
      wait(0.4),
      flag('prologueMeet'),
    ];
  },
};

// The first visit to the Haven: Sister Ash keeps the fire; she tells where it came from and what the
// embers are. Played in the Haven set (D: world/haven.js), before its menu opens.
export const havenAsh = {
  id: 'haven.ash', music: 'haven',
  steps: (S) => {
    const D = S.level.def; const p0 = D.enter[0]; const ashAt = { x: (D.fire.x + D.statue.x) / 2 + 0.2, z: D.fire.z + 1.15 };
    const ashJoined = has(S, 'lamplighter') && S.lead !== 'lamplighter';
    return [
      spawn('lead', { use: 'hero', x: p0.x, z: p0.z, face: Math.atan2(D.enter[1].x - p0.x, D.enter[1].z - p0.z), anim: 'walk' }),
      S.lead === 'lamplighter' ? null : spawn('ash', { hero: 'lamplighter', x: ashAt.x, z: ashAt.z, face: Math.atan2(D.fire.x - ashAt.x, D.fire.z - ashAt.z), anim: 'idle' }),
      cam([D.frame.x + 1.5, D.frame.y, D.frame.z + 1], { zoom: 1.5, dur: 0 }),
      walk('lead', [D.enter[1], D.enter[2], D.kneel], { end: 'idle' }),
      face('lead', D.fire),
      S.lead === 'lamplighter' ? say('lead', 'THE FIRE STILL BURNS. LIT FROM THE BELL\'S OWN FORGE. THE NIGHT CANNOT TOUCH IT.') : null,
      ...(S.lead === 'lamplighter' ? [] : [
        cam({ mid: ['lead', 'ash'] }, { zoom: 1.9, dur: 1.2, y: 1.1, wait: false }),
        face('ash', 'lead'),
        say('ash', 'COME IN OUT OF THE RAIN, WARDEN. YOU ARE SAFE HERE.'),
        say('ash', 'THIS FIRE WAS LIT FROM THE GREAT BELL\'S OWN FORGE. THE NIGHT CANNOT TOUCH IT.'),
        say('lead', 'THE EMBERS THAT FOLLOWED ME HERE. WHAT ARE THEY?'),
        say('ash', 'VOICES. WHEN YOU STRIKE A HUSHED DOWN, THE VOICE ASLEEP IN IT GOES FREE.'),
        say('ash', 'BRING THEM TO THE FIRE. IT KEEPS THEM, AND GIVES YOU THEIR STRENGTH.'),
        ashJoined ? null : say('ash', 'I AM SISTER ASH, THE LAST LAMPLIGHTER. REST. I WILL KEEP WATCH.'),
        face('ash', D.fire),
      ]),
      call((cs) => { const F = cs.g.level && cs.g.level.fire; if (F && F.flare) F.flare(1); cs.g.fx.embers(D.fire.x, 1.1, D.fire.z, 40, [3, 1.5, 0.4]); cs.g.sound.play('lamp'); }),
      anim('lead', 'kneel', { then: 'rest', after: 0.6 }),
      flag('havenAsh'),
    ];
  },
};

export default { [road.id]: road, [meet.id]: meet, [havenAsh.id]: havenAsh };
