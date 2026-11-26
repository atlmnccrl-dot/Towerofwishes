// The opening cinematic (the first run, before the Old Road; it can be replayed from the title): no dialogue,
// only a few words on black. The Great Bell, silent; the city in the rain, the Hushed walking; then every great
// enemy of the road ahead, one shot each, each from its own angle, each on its own ground: it turns, it roars,
// its name slams in. It builds: faster cuts, harder flashes, until the last shot, God on His throne, the two bells
// coming down beside Him, His hands rising. White. The title.
// PROPOSAL: the words on the cards and the order of the shots.
import { cam, spawn, remove, walk, anim, wait, fade, flash, shake, sound, music, call, title, tween, place, par, angle } from '../cutscene.js';
import { bellP } from './util.js';

const bossAt = (SS) => (SS.def && SS.def.boss ? { x: SS.def.boss.x, z: SS.def.boss.z } : { x: SS.def.start.x, z: SS.def.start.z - 8 });
const at = (fn, y = 1.2) => (SS) => { const p = fn(SS); return { x: p.x, y, z: p.z }; };
// a white cut: a flash and a short hard shake
const cut = (k = 0.9) => call((cs) => { cs.g.r.post.flash = k; cs.g.flashT = 0.12; if (cs.g.settings.shake !== false) cs.g.r.shake(0.35 * k, 0.25); });
// one boss shot: its ground, its angle, its body turning to face the camera, a roar, its name
function shot(level, type, name, sub, o = {}) {
  const h = o.h ?? 1.6; const dur = o.dur ?? 2.1;
  return [
    cut(o.flash ?? 0.8), place(level, { at: 'boss' }),
    call((cs) => { cs.g.r.post.dawn = 0; }),
    spawn('b', (SS) => { const p = bossAt(SS); return { boss: type, x: p.x, z: p.z, face: (o.face ?? 45) * Math.PI / 180, anim: 'idle' }; }),
    angle(o.yaw ?? 45, o.pitch ?? 30, 0),
    cam(at(bossAt, h), { zoom: o.z0 ?? 1.05, dur: 0 }),
    par(
      cam(at(bossAt, h * 1.05), { zoom: o.z1 ?? 1.55, dur: dur, wait: false }),
      o.swing ? angle(o.swing[0], o.swing[1], dur, { wait: false }) : null,
      [wait(0.45), anim('b', o.anim || 'roar'), sound('roar', { vol: 0.8 }), shake(0.5, 0.5), call((cs) => { const b = cs.actor('b'); if (b) cs.g.fx.shockRing(b.x, b.z, 5, o.col || [2.6, 2.2, 1.6], 0.6); })],
      [wait(0.55), title(name, sub, dur - 0.55, { style: 'name' })],
    ),
    remove('b'),
  ];
}

export const opening = {
  id: 'opening', music: 'none', fadeIn: true,
  steps: (S) => [
    // ------------------------------------------------ the Great Bell, silent, in the rain
    place('belfry', { at: 'bell' }),
    call((cs) => { cs.g.r.post.dawn = 0; }),
    angle(20, 14, 0),
    cam((SS) => { const b = bellP(SS); return { x: b.x, y: 4, z: b.z + 6 }; }, { zoom: 0.9, dur: 0 }),
    fade(0, 2.4),
    par(
      cam((SS) => { const b = bellP(SS); return { x: b.x, y: 5.5, z: b.z + 1 }; }, { zoom: 1.35, dur: 6, wait: false }),
      angle(70, 22, 6, { wait: false }),
      [wait(1.0), sound('toll', { f: 55, vol: 0.7 }), wait(2.2), title('', 'FOR A THOUSAND YEARS THE BELL GAVE THE WORLD ITS DAWN.', 2.8)],
    ),
    flash(1), sound('thunder', { vol: 1, big: true }),
    title('THEN IT FELL SILENT.', '', 2.2),

    // ------------------------------------------------ the city in the rain: the Hushed walking, the night that will not end
    cut(0.6), place('gate', { at: 'start' }),
    angle(100, 18, 0),
    ...[0, 1, 2, 3, 4, 5].map((i) => spawn('h' + i, (SS) => ({ foe: 'hushed', x: SS.def.start.x - 4 + i * 1.6, z: SS.def.start.z - 6 - (i % 2) * 1.4, face: Math.PI }))),
    cam((SS) => ({ x: SS.def.start.x, y: 1.2, z: SS.def.start.z - 6 }), { zoom: 1.4, dur: 0 }),
    par(
      ...[0, 1, 2, 3, 4, 5].map((i) => walk('h' + i, (SS) => ({ x: SS.def.start.x - 4 + i * 1.6, z: SS.def.start.z - 13 - (i % 2) * 1.4 }), { speed: 0.9, wait: false })),
      cam((SS) => ({ x: SS.def.start.x, y: 1.5, z: SS.def.start.z - 10 }), { zoom: 1.2, dur: 4, wait: false }),
      angle(140, 26, 4, { wait: false }),
      [wait(1.2), title('THE NIGHT NEVER ENDED.', '', 2.4)],
    ),
    flash(0.8), sound('thunder', { vol: 0.8 }),
    ...[0, 1, 2, 3, 4, 5].map((i) => remove('h' + i)),
    music('boss'),

    // ------------------------------------------------ what waits on the road: one shot each, faster and faster
    ...shot('gate', 'gaoler', 'THE GAOLER', 'GALLOWS GATE', { yaw: 15, pitch: 20, swing: [55, 28], face: 20 }),
    ...shot('docks', 'kingcrab', 'THE DROWNED KING-CRAB', 'MIREWATER DOCKS', { yaw: 80, pitch: 35, swing: [40, 30], col: [0.6, 2.2, 2.4], face: 70 }),
    ...shot('undercroft', 'hollowmother', 'THE HOLLOW MOTHER', 'THE UNDERCROFT', { yaw: 10, pitch: 50, swing: [30, 24], h: 1.4, col: [2, 2, 2.6] }),
    ...shot('heights', 'ronin', 'THE STILLED RONIN', 'THE CROWN HEIGHTS', { yaw: 120, pitch: 16, swing: [95, 20], z1: 1.9, anim: 'iai', col: [3, 0.8, 0.8], face: 110 }),
    ...shot('belfry', 'silence', 'SAINT SILENCE', 'THE BELFRY', { yaw: 45, pitch: 12, swing: [20, 30], z1: 1.7 }),
    ...shot('frostmarch', 'frostgiant', 'THE HOARFROST KING', 'THE FROSTMARCH', { yaw: 70, pitch: 14, swing: [45, 34], h: 2.6, col: [1.2, 2.2, 3], dur: 1.8 }),
    ...shot('ashdunes', 'sandwyrm', 'ASHMAW', 'THE ASH DUNES', { yaw: 30, pitch: 40, swing: [60, 22], h: 2.2, col: [2.6, 1.8, 0.8], dur: 1.8 }),
    ...shot('abyss', 'archon', 'THE HOLLOW ARCHON', 'THE ABYSS', { yaw: 160, pitch: 24, swing: [120, 34], col: [3, 0.6, 0.3], dur: 1.7 }),
    ...shot('empyrean', 'wheel', 'THE WHEEL', 'THE EMPYREAN', { yaw: 45, pitch: 55, swing: [45, 28], h: 3, z0: 0.8, z1: 1.15, col: [3, 2.6, 1.4], dur: 1.8, flash: 1 }),
    ...shot('halo', 'seraph', 'THE LAST SERAPH', 'THE BROKEN HALO', { yaw: 100, pitch: 14, swing: [70, 30], h: 2.4, anim: 'cast', col: [3, 2.6, 1.4], dur: 1.6, flash: 1 }),
    ...shot('cradle', 'firstfounder', 'THE FIRST FOUNDER', 'THE CRADLE OF BRONZE', { yaw: 20, pitch: 18, swing: [50, 26], h: 2.4, anim: 'smash', col: [3, 1.2, 0.3], dur: 1.6, flash: 1 }),

    // ------------------------------------------------ God
    cut(1), place('throne', { at: 'boss' }),
    music('none'), call((cs) => { cs.g.r.post.dawn = 0.15; }),
    spawn('god', (SS) => { const p = bossAt(SS); return { boss: 'god', x: p.x, z: p.z, face: 0, anim: 'idle' }; }),
    angle(0, 8, 0),
    cam(at(bossAt, 3), { zoom: 0.62, dur: 0 }),
    fade(0, 0.4),
    par(
      cam(at(bossAt, 5.5), { zoom: 0.95, dur: 5, wait: false }),
      angle(30, 26, 5, { wait: false }),
      [wait(0.8), sound('bigBell', { vol: 0.9 }), wait(1.0), anim('god', 'raise')],
      [wait(1.6),
        spawn('dawn', (SS) => { const p = bossAt(SS); return { foe: 'dawnbell', x: p.x - 7, z: p.z + 7, y: 9, face: 0 }; }),
        spawn('dusk', (SS) => { const p = bossAt(SS); return { foe: 'duskbell', x: p.x + 7, z: p.z + 7, y: 9, face: 0 }; }),
        tween((k, cs) => { for (const id of ['dawn', 'dusk']) { const a = cs.actor(id); if (a) a.leapH = 9 * (1 - k * k); } }, 1.1),
        call((cs) => { for (const id of ['dawn', 'dusk']) { const a = cs.actor(id); if (a) { a.leapH = 0; cs.g.fx.shockRing(a.x, a.z, 6, id === 'dawn' ? [3, 2.2, 0.8] : [1.6, 0.8, 2.8], 0.7); } } cs.g.sound.play('boom'); if (cs.g.settings.shake !== false) cs.g.r.shake(0.9, 0.8); }),
      ],
    ),
    call((cs) => { cs.g.sound.play('special'); cs.g.sound.play('bigBell', { delay: 0.2 }); }),
    tween((k, cs) => { cs.g.r.post.flash = Math.min(1, k * 1.4); }, 0.9),
    fade(1, 0.01),
    call((cs) => { cs.g.r.post.flash = 0; }),
    wait(0.6),
    title('BELLMOURN', 'RING THE BELL. BRING THE DAWN.', 3.6, { style: 'logo' }),
    wait(0.4),
  ],
};

export default { [opening.id]: opening };
