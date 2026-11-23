// Act I in the city: the recruitments (Kestrel after the Gaoler, Sister Ash after Mother Tallow, Hollis
// after the Harbormaster, Mother Wren after the Deacon), Bram and the Bellfounder, the Pale Regent's
// revelation, Saint Silence before his fight, the ringing of the great bell, and the end of Act I.
// PROPOSAL: every spoken line here comes from docs/STORY_BIBLE.md (the author may rewrite them).
import * as THREE from '../../../vendor/three.module.min.js';
import { YAW } from '../../engine/renderer.js';
import { cam, spawn, walk, face, anim, say, wait, fade, flash, shake, sound, music, call, flag, fx, par, title, tween, strike, dawn } from '../cutscene.js';
import { FALLBACK_LOOKS } from './cast.js';
import { heroP, bossP, scr, toward, inZone, zoneP, bellOf, bellP, wardenSpec, has, nameOf, strikeAnim } from './util.js';

// the lead walks up to the fallen boss; a recruit steps out of the shadows behind it
function overBoss(S, o = {}) {
  const b = bossP(S), h = heroP(S); const stand = inZone(S, toward(b, h, o.d ?? 2.4));
  const fromR = inZone(S, scr(b, o.r ?? 1.6, o.u ?? 3.4)); const to = inZone(S, scr(b, o.toR ?? 1.4, o.toU ?? 0.6));
  const side = inZone(S, scr(stand, o.sideR ?? 1.9, 0.5)); // where the recruit stands to talk, beside the lead
  return { b, h, stand, fromR, to, side };
}
const joinCard = (id) => title(nameOf(id) + ' JOINS', 'CHANGE WARDEN AT THE HAVEN', 2.4);

// ------------------------------------------------------------------ Kestrel, after the Gaoler
export const kestrel = {
  id: 'recruit.kestrel', music: 'story',
  steps: (S) => {
    const P = overBoss(S, { toR: 2.3, toU: 0.3 });
    return [
      spawn('lead', { use: 'hero' }), spawn('boss', { use: 'boss' }),
      cam({ mid: ['lead', 'boss'] }, { zoom: 1.5, dur: 1 }),
      walk('lead', P.stand, { face: P.b }),
      call((cs) => { cs.g.sound.play('gate'); }),
      spawn('k', { hero: 'kestrel', x: P.fromR.x, z: P.fromR.z, face: Math.atan2(P.b.x - P.fromR.x, P.b.z - P.fromR.z) }), fx('mist', P.fromR, 20, [0.3, 0.3, 0.34]),
      cam({ mid: ['lead', 'k'] }, { zoom: 1.7, dur: 1.2, wait: false }),
      say('k', 'HE\'S DOWN? THEN THOSE KEYS ARE MINE.'),
      walk('k', P.to, { face: P.b }), anim('k', 'kneel', { then: 'rest', after: 0.6 }), sound('clang', { vol: 0.5 }), fx('sparks', P.to, 10, [2.6, 2.2, 1.2], 0.5),
      anim('k', 'rise', { then: 'idle', after: 0.7 }), walk('k', P.side, { face: 'lead' }), face('lead', 'k'),
      cam({ mid: ['lead', 'k'] }, { zoom: 1.9, dur: 0.8, wait: false }),
      say('k', 'HE WAS MY FATHER. HE LOCKED ME UP FOR OPENING THE CELLS.'),
      say('lead', 'COME WITH US. IT ENDS AT THE BELL.'),
      say('k', 'EVERY DOOR HE LOCKED, I OPEN. LEAD ON.'),
      joinCard('kestrel'), flag('metKestrel'),
    ];
  },
};

// ------------------------------------------------------------------ Sister Ash, after Mother Tallow
export const ash = {
  id: 'recruit.ash', music: 'story',
  steps: (S) => {
    const P = overBoss(S); const ashIsLead = S.lead === 'lamplighter';
    return [
      spawn('lead', { use: 'hero' }), spawn('boss', { use: 'boss' }),
      cam({ mid: ['lead', 'boss'] }, { zoom: 1.5, dur: 1 }),
      walk('lead', P.stand, { face: P.b }),
      ashIsLead ? null : spawn('ash', { hero: 'lamplighter', x: P.fromR.x, z: P.fromR.z, face: 0 }),
      ashIsLead ? null : fx('embers', P.fromR, 20, [3, 1.8, 0.6]),
      cam({ mid: [ashIsLead ? 'lead' : 'ash', 'boss'] }, { zoom: 1.75, dur: 1.2, wait: false }),
      ashIsLead ? walk('lead', P.to, { face: P.b }) : walk('ash', P.to, { face: P.b }),
      say('lamplighter', 'MOTHER. YOU TAUGHT ME A FLAME IS A PROMISE KEPT.', { actor: ashIsLead ? 'lead' : 'ash' }),
      say('lamplighter', 'THEN YOU BURNED THEIR VOICES TO KEEP YOUR CANDLES LIT.', { actor: ashIsLead ? 'lead' : 'ash' }),
      anim(ashIsLead ? 'lead' : 'ash', 'kneel', { then: 'rest', after: 0.6 }),
      fx('embers', P.b, 24, [3, 2.2, 1.0], 0.6), sound('heal', { vol: 0.5 }), wait(0.6),
      say('lamplighter', 'REST NOW. I WILL CARRY WHAT YOU DROPPED.', { actor: ashIsLead ? 'lead' : 'ash', soft: true }),
      anim(ashIsLead ? 'lead' : 'ash', 'rise', { then: 'idle', after: 0.7 }),
      ...(ashIsLead ? [] : [walk('ash', P.side, { face: 'lead' }), face('lead', 'ash'), cam({ mid: ['lead', 'ash'] }, { zoom: 1.9, dur: 0.8, wait: false }), say('lead', 'THE HAVEN NEEDS ITS KEEPER.'), say('ash', 'THE FIRE WILL KEEP. YOU NEED ME MORE.'), joinCard('lamplighter')]),
      flag('metAsh'),
    ];
  },
};

// ------------------------------------------------------------------ Hollis, after the Harbormaster
export const hollis = {
  id: 'recruit.hollis', music: 'story',
  steps: (S) => {
    const P = overBoss(S, { r: -2.2, u: 2.4, toR: -1.0, toU: 0.4 });
    return [
      spawn('lead', { use: 'hero' }), spawn('boss', { use: 'boss' }),
      cam({ mid: ['lead', 'boss'] }, { zoom: 1.45, dur: 1 }),
      walk('lead', P.stand, { face: P.b }),
      sound('toll', { f: 196 }), shake(0.25, 0.4), wait(0.8),
      spawn('ho', { hero: 'hollis', x: P.fromR.x, z: P.fromR.z, face: Math.atan2(P.h.x - P.fromR.x, P.h.z - P.fromR.z), anim: 'rest' }),
      fx('mist', P.fromR, 24, [0.3, 0.4, 0.46]), sound('splash'),
      cam({ mid: ['lead', 'ho'] }, { zoom: 1.75, dur: 1.4 }),
      say('lead', 'THE HARBOUR BELL. NOBODY RANG IT.'),
      anim('ho', 'rise', { then: 'idle', after: 0.7 }),
      say('ho', '...I CAN HEAR AGAIN.', { soft: true }),
      say('lead', 'A HUSHED. SPEAKING.'),
      walk('ho', P.side, { face: 'lead' }), face('lead', 'ho'), cam({ mid: ['lead', 'ho'] }, { zoom: 1.9, dur: 0.8, wait: false }),
      say('ho', 'I RANG THAT BELL FORTY YEARS. THEN THE WATER TOOK MY VOICE.'),
      say('ho', 'IT GAVE IT BACK. SO THEY CAN ALL COME BACK.'),
      say('ho', 'LET ME CARRY THE ANCHOR. HALF OF ME IS STILL UNDER.'),
      joinCard('hollis'), flag('metHollis'),
    ];
  },
};

// ------------------------------------------------------------------ Mother Wren, after the Deacon
export const wren = {
  id: 'recruit.wren', music: 'story',
  steps: (S) => {
    const P = overBoss(S, { r: 1.8, u: 3.0, toR: 1.3, toU: 0.9 });
    return [
      spawn('lead', { use: 'hero' }), spawn('boss', { use: 'boss' }),
      cam({ mid: ['lead', 'boss'] }, { zoom: 1.45, dur: 1 }),
      walk('lead', P.stand, { face: P.b }),
      spawn('w', { hero: 'wren', x: P.fromR.x, z: P.fromR.z, face: Math.atan2(P.h.x - P.fromR.x, P.h.z - P.fromR.z), anim: 'cast' }),
      call((cs) => { cs.g.sound.play('special'); }),
      cam({ mid: ['lead', 'w'] }, { zoom: 1.7, dur: 1.2 }),
      say('w', 'THE HYMN IS DONE. I WILL NOT SING ONE MORE NOTE FOR THEM.'),
      anim('w', 'idle'), walk('w', P.side, { face: 'lead' }), face('lead', 'w'), cam({ mid: ['lead', 'w'] }, { zoom: 1.9, dur: 0.8, wait: false }),
      say('w', 'I WAS HIS CHOIRMISTRESS. MY SONGS HELPED STILL YOUR CITY.'),
      say('lead', 'THEN TELL ME WHO STILLED THE BELL.'),
      say('w', 'ORRIN, ITS FIRST KEEPER. NOW HE CALLS HIMSELF SAINT SILENCE.'),
      say('w', 'THE HOLLOW CHOIR TOLD HIM THE WORLD IS A PRISON. HE BELIEVED.'),
      S.lead === 'warden' ? say('lead', '...HE WAS MY MASTER.', { soft: true }) : null,
      say('w', 'LET ME SING FOR YOU INSTEAD. MY OLD HYMNS STILL ANSWER ME.'),
      joinCard('wren'), flag('metWren'),
    ];
  },
};

// ------------------------------------------------------------------ Bram and the Bellfounder
// before the fight (the boss is spawned and waiting) and after it (Bram breaks the false bell's mould)
export const founderPre = {
  id: 'founder.pre', music: 'none',
  steps: (S) => {
    const h = heroP(S), b = bossP(S); const bramLead = S.lead === 'bellbreaker'; const bramAt = inZone(S, scr(h, 1.6, 0.4));
    return [
      spawn('lead', { use: 'hero' }), spawn('boss', { use: 'boss' }),
      bramLead ? null : spawn('bram', { hero: 'bellbreaker', x: bramAt.x, z: bramAt.z, face: Math.atan2(b.x - bramAt.x, b.z - bramAt.z) }),
      cam({ mid: [bramLead ? 'lead' : 'bram', 'boss'] }, { zoom: 1.3, dur: 1.4 }),
      say('boss', 'BRAM. MY BEST APPRENTICE. COME HOME TO THE FURNACE?'),
      say('bellbreaker', 'YOU TAUGHT ME THE BELL IS A PROMISE. THEN YOU POURED A LIE.', { actor: bramLead ? 'lead' : 'bram' }),
      say('boss', 'I POURED WHAT I WAS PAID TO POUR. SILENCE PAYS IN GOLD.'),
      say('bellbreaker', 'THEN I BREAK IT. AND YOU WITH IT.', { actor: bramLead ? 'lead' : 'bram', shout: true }),
      flag('founderPre'),
    ];
  },
};
export const founderPost = {
  id: 'founder.post', music: 'story',
  steps: (S) => {
    const h = heroP(S), b = bossP(S); const bramLead = S.lead === 'bellbreaker'; const mould = inZone(S, scr(b, -1.2, 1.4)); const bramTo = inZone(S, toward(mould, h, 1.6));
    const bramFrom = inZone(S, scr(h, 1.6, 0.4));
    return [
      spawn('lead', { use: 'hero' }),
      bramLead ? null : spawn('bram', { hero: 'bellbreaker', x: bramFrom.x, z: bramFrom.z }),
      cam(mould, { zoom: 1.5, dur: 1.2, wait: false }),
      walk(bramLead ? 'lead' : 'bram', bramTo, { face: mould }),
      say('bellbreaker', 'THE MOULD OF THE SILENT BELL. NOBODY POURS ANOTHER.', { actor: bramLead ? 'lead' : 'bram' }),
      anim(bramLead ? 'lead' : 'bram', 'hsmash2', { then: 'idle', after: 0.9 }),
      call((cs) => { cs.g.sound.play('boom'); cs.g.sound.play('clang', { delay: 0.05 }); cs.g.fx.sparks(mould.x, 0.4, mould.z, 0, 40, [3, 1.6, 0.5]); cs.g.fx.dust(mould.x, mould.z, 24); cs.g.fx.shockRing(mould.x, mould.z, 3, [3, 1.6, 0.6], 0.5); if (cs.g.settings.shake) cs.g.r.shake(0.7, 0.5); }),
      wait(0.6),
      say('bellbreaker', 'THERE. NOW I CAN LOOK AT A BELL AGAIN.', { actor: bramLead ? 'lead' : 'bram' }),
      flag('mouldBroken'),
    ];
  },
};

// ------------------------------------------------------------------ the Pale Regent's revelation
export const regent = {
  id: 'regent.post', music: 'story',
  steps: (S) => {
    const P = overBoss(S, { d: 2.0 });
    return [
      spawn('lead', { use: 'hero' }), spawn('boss', { use: 'boss' }),
      walk('lead', P.stand, { face: P.b, wait: false }),
      cam({ mid: ['lead', 'boss'] }, { zoom: 1.75, dur: 1.4 }),
      anim('boss', 'rest'),
      say('boss', 'YOU THINK SILENCE DID THIS ALONE? HE ONLY HELD THE BELL STILL.', { soft: true }),
      say('boss', 'THE HOLLOW CHOIR ASKED. I SOLD THEM THE DAWN FOR AN ENDLESS BALL.'),
      say('boss', 'AND BEHIND THE CHOIR, A WHEEL. IT HAS ALWAYS TURNED AGAINST THE TOLL.'),
      say('lead', 'AND SILENCE? WHAT DID THEY PROMISE HIM?'),
      say('boss', 'NOTHING. HE DID IT OUT OF LOVE, FOR ALL OF YOU. ISN\'T THAT FUNNY?'),
      anim('boss', 'die'), wait(1.0),
      flag('regentRevealed'),
    ];
  },
};

// ------------------------------------------------------------------ Saint Silence, before his fight
export const silencePre = {
  id: 'silence.pre', music: 'none',
  steps: (S) => {
    const carmine = S.lead === 'warden';
    return [
      spawn('lead', { use: 'hero' }), spawn('boss', { use: 'boss' }),
      cam({ mid: ['lead', 'boss'] }, { zoom: 1.35, dur: 1.6 }),
      face('boss', 'lead'),
      say('boss', carmine ? 'YOU CAME BACK. I PRAYED YOU WOULD NOT.' : 'ANOTHER WARDEN. I PRAYED NONE WOULD COME.'),
      say('lead', carmine ? 'MASTER. YOU TAUGHT ME TO RING IT EVERY DAWN.' : 'YOU WERE ITS KEEPER. WHY?'),
      say('boss', 'EVERY TOLL WINDS THE WORLD ONE MORE DAY. ONE MORE DAY OF PRISON.'),
      say('boss', 'IN THE SILENCE THEY SUFFER NOTHING. THEY ONLY SLEEP.'),
      say('lead', 'THEY ARE NOT SLEEPING. THEY ARE DROWNING.', { shout: true }),
      flag('silencePre'),
    ];
  },
};

// ------------------------------------------------------------------ the bell
// A crack that runs up the side of the bell facing the camera: light pours out of it. Grows with k (0..1).
function crackBell(bell) {
  if (!bell || !bell.pivot) return null;
  if (bell.crack) return bell.crack;
  const lip = 1.2, ax = lip + 3.75; const prof = [[0, 1.7], [0.5, 1.45], [1.0, 1.25], [1.6, 1.12], [2.2, 1.05], [2.7, 1.0], [3.0, 0.9]];
  const rAt = (yy) => { for (let i = 1; i < prof.length; i++) if (yy <= prof[i][0]) { const [y0, r0] = prof[i - 1], [y1, r1] = prof[i]; return r0 + (r1 - r0) * (yy - y0) / (y1 - y0); } return 0.9; };
  // the bell hangs in a frame along X: its face toward the camera is the +Z side (turned a little toward +X)
  const az = YAW * 0.55; const grp = new THREE.Group(); bell.pivot.add(grp);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.5, 1.4), fog: false });
  const segs = []; let a = az, yy = 0.05; let r = 7;
  while (yy < 2.75) {
    r = (r * 9301 + 49297) % 233280; const rnd = r / 233280; const ny = yy + 0.18 + rnd * 0.16; const na = a + (rnd - 0.5) * 0.22;
    const p0 = new THREE.Vector3(Math.sin(a) * (rAt(yy) + 0.025), yy + lip - ax, Math.cos(a) * (rAt(yy) + 0.025));
    const p1 = new THREE.Vector3(Math.sin(na) * (rAt(ny) + 0.025), ny + lip - ax, Math.cos(na) * (rAt(ny) + 0.025));
    const len = p0.distanceTo(p1); const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, len), mat);
    m.position.copy(p0).add(p1).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p1.clone().sub(p0).normalize()); m.visible = false; grp.add(m); segs.push(m);
    a = na; yy = ny;
  }
  bell.crack = { grp, segs, set(k) { const n = Math.round(segs.length * Math.max(0, Math.min(1, k))); segs.forEach((s, i) => { s.visible = i < n; }); } };
  return bell.crack;
}

export const bell = {
  id: 'belfry.bell', music: 'none',
  steps: (S) => {
    const B = bellP(S); const h = heroP(S); const b = bossP(S);
    const spot = { x: B.x, z: B.z + 2.4 }; const vesperLead = S.lead === 'huntress';
    const vAt = scr(spot, -1.8, -0.6);
    // the Hushed who followed the wardens up the stair: kneeling near the platform's near edge
    const zs = [[0.22, 0.86], [0.38, 0.93], [0.62, 0.9], [0.8, 0.82], [0.5, 0.8]];
    const hushed = zs.map(([u, v], i) => ({ id: 'h' + i, p: zoneP(S, u, v), tam: i === 4 }));
    const tamP = hushed[4].p;
    const swing = strikeAnim(S.lead);
    const ringBell = (cs, i) => {
      const g = cs.g, bl = bellOf(cs.S); const e = cs.actor('lead');
      if (e) { e.anim = swing; e.animT = 0; }
      if (bl && bl.ring) bl.ring(0.25 + 0.2 * i);
      g.sound.play('bigBell'); if (i === 3) g.sound.play('toll', { f: 98, delay: 0.1 });
      if (g.settings.shake) g.r.shake(0.35 + 0.2 * i, 0.5); g.r.post.flash = 0.12 + 0.08 * i; g.flashT = 0.12;
      g.fx.shockRing(B.x, B.z, 4 + i * 3, [3, 2.4, 1.2], 0.8); g.fx.embers(B.x, 3, B.z, 30 + i * 20, [3, 2.2, 0.8]);
      g.r.post.dawn = Math.max(g.r.post.dawn || 0, 0.12 * i);
      cs.zoom = Math.max(cs.zoom, 1.45 + 0.08 * i);
    };
    return [
      spawn('lead', { use: 'hero' }), spawn('boss', { use: 'boss' }),
      vesperLead ? null : spawn('v', { hero: 'huntress', x: scr(h, -1.5, -0.4).x, z: scr(h, -1.5, -0.4).z }),
      ...hushed.map((x) => spawn(x.id, { look: x.tam ? 'tam' : 'hushed', x: x.p.x, z: x.p.z, face: Math.atan2(B.x - x.p.x, B.z - x.p.z), anim: 'rest', speaker: x.tam ? 'tam' : 'hushed', hidden: true })),
      cam({ mid: ['lead', [B.x, 2.2, B.z]] }, { zoom: 1.3, dur: 1.6, wait: false }),
      walk('lead', spot, { face: B, wait: !vesperLead }), vesperLead ? null : walk('v', vAt, { face: B }),
      say('lead', S.lead === 'warden' ? 'A HUNDRED NIGHTS. RING, OLD BELL.' : 'THE GREAT BELL OF ST. ORRIN.'),
      cam([B.x, 2.0, B.z + 1.2], { zoom: 1.45, dur: 1.0 }),
      strike(3, ringBell),
      music('dawn'),
      dawn(0.65, 7),
      call((cs) => { cs.g.sound.play('toll', { f: 147 }); cs.g.sound.play('toll', { f: 196, delay: 1.2 }); cs.g.sound.play('toll', { f: 220, delay: 2.4 }); }),
      wait(1.4),
      // the Hushed lift their heads: the red goes out of their eyes, their voices rise as sparks
      call((cs) => { for (const x of hushed) { const e = cs.actor(x.id); if (e) e.hidden = false; } }),
      cam({ mid: hushed.map((x) => x.id) }, { zoom: 1.35, dur: 1.6 }),
      call((cs) => { for (const x of hushed) { const e = cs.actor(x.id); if (!e) continue; e.type = 'cut:freed:' + x.id; e.def = { look: { ...FALLBACK_LOOKS.freed, ...(x.tam ? FALLBACK_LOOKS.tam.freed : {}), scale: x.tam ? 0.78 : 1 }, scale: x.tam ? 0.78 : 1 }; e.anim = 'rise'; e.animT = 0; e.heroId = 'lamplighter'; cs.g.fx.embers(e.x, 1.4, e.z, 26, [3, 2.6, 1.4]); cs.g.fx.mist(e.x, 1.2, e.z, 6, [0.5, 0.5, 0.55]); } cs.g.sound.play('heal'); }, { keep: false }),
      wait(1.2),
      call((cs) => { for (const x of hushed) { const e = cs.actor(x.id); if (e) { e.anim = 'idle'; e.animT = 0; } } }),
      say('huntress', 'TAM!', { shout: true, actor: vesperLead ? 'lead' : 'v' }),
      walk(vesperLead ? 'lead' : 'v', scr(tamP, -0.7, 0.2), { run: true, face: tamP }),
      cam({ mid: [vesperLead ? 'lead' : 'v', 'h4'] }, { zoom: 2.0, dur: 1.0, wait: false }),
      face('h4', vesperLead ? 'lead' : 'v'),
      say('huntress', 'TAM. LOOK AT ME. IT\'S ME.', { actor: vesperLead ? 'lead' : 'v', soft: true }),
      say('tam', '...VES? IT\'S SO BRIGHT.', { actor: 'h4', soft: true }),
      wait(0.6),
      // the toll falters: a crack runs up the bell
      music('none'),
      call((cs) => { cs.g.sound.play('clang', { vol: 1.6 }); cs.g.sound.play('boom', { delay: 0.1 }); if (cs.g.settings.shake) cs.g.r.shake(0.8, 0.8); crackBell(bellOf(cs.S)); }),
      cam([B.x, 2.2, B.z + 0.6], { zoom: 1.9, dur: 0.8 }),
      tween((k, cs) => { const c = crackBell(bellOf(cs.S)); if (c) c.set(k); cs.g.r.post.dawn = 0.65 - 0.2 * k; }, 1.6),
      call((cs) => { const bl = bellOf(cs.S); if (bl) bl.amp = Math.min(bl.amp || 0, 0.08); cs.g.sound.play('toll', { f: 92, vol: 0.6 }); }),
      say('lead', 'THE BELL... IT\'S CRACKING.'),
      cam({ mid: ['lead', 'boss'] }, { zoom: 1.6, dur: 1.2 }),
      anim('boss', 'rest'),
      say('boss', 'ONE BELL CANNOT OUTSING THE WHEEL.', { soft: true }),
      say('boss', 'IT HEARD YOU. NOW IT IS COMING.', { soft: true }),
      anim('boss', 'die'), wait(1.2),
      call((cs) => { const c = crackBell(bellOf(cs.S)); if (c) c.set(1); }, { keep: true }),
      flag('bellRung'),
    ];
  },
};

// The end of Act I: the dawn over the Belfry, the camera pulling away.
export const act1End = {
  id: 'act1.end', music: 'dawn',
  steps: (S) => [
    spawn('lead', { use: 'hero' }),
    dawn(0.7, 2),
    cam({ mid: ['lead', bellP(S)] }, { zoom: 0.95, dur: 4.5, wait: false }),
    wait(1.2),
    title('END OF ACT I', 'THE BELL RANG. FAR BEYOND THE WALLS, SOMETHING HEARD IT.', 4.6),
    fade(1, 1.2),
    flag('act1End'),
  ],
};

export default { [kestrel.id]: kestrel, [ash.id]: ash, [hollis.id]: hollis, [wren.id]: wren, [founderPre.id]: founderPre, [founderPost.id]: founderPost, [regent.id]: regent, [silencePre.id]: silencePre, [bell.id]: bell, [act1End.id]: act1End };
