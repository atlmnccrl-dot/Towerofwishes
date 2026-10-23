/*
 * Tower of Wishes — the legend by the fire (js/render/cinema.js), 2026-10-23.
 *
 * The author's direction: after the Reset, a storyteller tells children the legend by a fire in a
 * settlement built from older ruins, and the telling is shown as memories (the warm, grainy look of
 * vars.memory), entered and left through the fire. Eiryn listens at the edge of the light, unchanged.
 * The storyteller's three lines are drafted from the book's narration (Proposals, js/story.js).
 * Places: camp (as a hearth among ruins), summit, roofs, square.
 */
(function () {
  'use strict';
  const C = (window.TowCinema = window.TowCinema || {});
  const R5 = 15.4;
  // into the fire: the camera dives at the flames, embers swirl, a flash of firelight
  const intoFire = (t) => [
    { at: t, cam: { x: 0.25, y: 0.75, z: 6.4, yaw: 0.05, pitch: -0.32, ease: 0.9 } },
    { at: t + 0.5, pfx: [{ name: 'embers', x: 0, y: 0.6, z: 7.6, scale: 2.4, add: true, life: 1.2 }, { name: 'fire_burst', x: 0, y: 0.4, z: 7.7, scale: 2.2, add: true }] },
    { at: t + 0.8, flash: ['255,150,70', 0.7] }, { at: t + 0.8, sfx: 'whoosh', vol: 0.45 },
  ];
  C['p.legend'] = {
    set: 'camp', vars: { hearth: 1, memory: 0, burn: 0, light: 0.2, lamps: 10 },
    actors: [
      { id: 'storyteller', set: 'miller', x: 1.3, y: 0, z: 9.7, dir: 'SW', at: 'camp' },
      { id: 'kid1', set: 'rival_kid', x: -1.5, y: 0, z: 7.3, dir: 'E', at: 'camp' },
      { id: 'kid2', set: 'hamlet_people', x: -0.7, y: 0, z: 6.3, dir: 'NE', at: 'camp' },
      { id: 'kid3', set: 'rival_kid', x: -1.9, y: 0, z: 8.7, dir: 'E', at: 'camp', scale: 0.92 },
      { id: 'eiryn', set: 'eiryn', x: 4.2, y: 0, z: 11.9, dir: 'SW', at: 'camp' },
      { id: 'climber', set: 'climber', x: 0, y: 0, z: 9.5, dir: 'N', at: 'summit' },
    ],
    cam: { x: -3.8, y: 2.3, z: 0.6, yaw: 0.26, pitch: -0.06 },
    beats: [
      // (silent) The fire among ruins; the children; the old storyteller; Eiryn at the edge of the light.
      { do: [{ cam: { x: -3.8, y: 2.3, z: 0.6, yaw: 0.26, pitch: -0.06, cut: true } },
        { who: 'storyteller', anim: 'idle_alt' }, { who: 'kid1', pose: 'kneel' }, { who: 'kid2', pose: 'kneel' }, { who: 'kid3', pose: 'kneel' },
        { at: 0.3, cam: { x: -2.6, y: 1.7, z: 2.4, yaw: 0.2, pitch: -0.08, ease: 4.5 } }, { at: 4.6, who: 'eiryn', dir: 'SW' }] },
      // Storyteller: "Long ago, a man climbed to the top of the Tower of Wishes. No one knows his name."
      // (on him; into the fire; the memory: a lone climber walks up into the light)
      { do: [{ cam: { x: 3.1, y: 1.15, z: 7.4, yaw: -0.68, pitch: 0.02, F: 1.2, cut: true } },
        ...intoFire(2.0),
        { at: 2.85, place: 'summit' }, { at: 2.85, vars: { memory: 1, light: 0.6 } },
        { at: 2.85, cam: { x: 1.0, y: 1.1, z: 4.0, yaw: -0.04, pitch: 0.2, F: 1.0, cut: true } },
        { at: 2.85, who: 'climber', put: [0, 0, 9.5] }, { at: 2.9, who: 'climber', to: [0, 2.25, 20.1], speed: 1.25, anim: 'walk', then: 'idle' },
        { at: 3.0, vars: { light: [1.6, 6] } }, { at: 3.1, cam: { x: 0.8, y: 1.3, z: 8.5, yaw: -0.03, pitch: 0.26, F: 1.0, ease: 8 } },
        { at: 10.0, who: 'climber', pose: 'reach' }, { at: 10.6, flash: ['255,240,220', 0.9] }] },
      // Storyteller: "What came after was fire, water and storm. The end of a world."
      // (the memory: the city at dusk; the sky splits; fire rains on the roofs)
      { do: [{ place: 'roofs' }, { vars: { memory: 1, burn: 0 } },
        { cam: { x: 0.4, y: R5 + 6, z: 84, yaw: Math.PI - 0.08, pitch: -0.1, F: 1.0, cut: true } },
        { at: 0.6, vars: { burn: [1, 2.2] } }, { at: 0.6, sfx: 'quake', vol: 0.7 }, { at: 0.8, shake: 3 },
        { at: 2.4, pfx: [{ name: 'explosion_fire', x: -14, y: 9, z: 52, scale: 4, add: true }, { name: 'explosion_fire', x: 18, y: 10, z: 34, scale: 4, add: true, delay: 0.4 }] },
        { at: 2.6, shake: 6 }, { at: 2.6, sfx: 'blow_big', vol: 0.6 },
        { at: 3.4, pfx: [{ name: 'fireball_big', x: 4, y: 30, z: 58, scale: 3, add: true }, { name: 'explosion_fire', x: 3, y: 14.6, z: 50, scale: 4.5, add: true, delay: 0.3 }, { name: 'explosion_fire', x: -20, y: 9, z: 20, scale: 4, add: true, delay: 0.7 }] },
        { at: 3.7, flash: ['255,110,60', 0.6] }, { at: 3.8, shake: 8 },
        { at: 1.0, cam: { x: 0.4, y: R5 + 5.6, z: 82.5, yaw: Math.PI - 0.06, pitch: -0.06, F: 1.0, ease: 5 } }] },
      // Storyteller: "We built again. It broke again. Only the Tower never changed."
      // (the memory: the street to the Tower, ruined and rebuilt as the years flicker past; the Tower stays)
      { do: [{ place: 'square' }, { vars: { memory: 1, burn: 0, lamps: 0 } },
        { cam: { x: 8.3, y: 1.8, z: 19.2, yaw: 0.06, pitch: 0.12, F: 1.0, cut: true } },
        ...[0.8, 2.0, 3.2, 4.4].flatMap((t, i) => [
          { at: t, flash: [i % 2 ? '255,236,200' : '0,0,0', 0.55] },
          { at: t + 0.05, vars: { lamps: i % 2 ? 10 : 0 } },
          { at: t + 0.1, pfx: [{ name: i % 2 ? 'smoke_puff' : 'rock_burst', x: i % 2 ? 4.2 : 12.8, y: 4, z: 34 + i * 9, scale: 3 }, { name: 'dust_cloud', x: 8, y: 0, z: 28 + i * 7, scale: 2.4 }] },
          { at: t + 0.1, sfx: i % 2 ? 'thud' : 'quake', vol: 0.4 },
        ]),
        { at: 0.4, cam: { x: 8.3, y: 1.9, z: 20.6, yaw: 0.07, pitch: 0.14, F: 1.0, ease: 6 } }] },
      // (silent) Back at the fire: Eiryn, the same face, the same posture, in a different world.
      { do: [{ place: 'camp' }, { vars: { memory: [0, 0.6] } }, { flash: ['255,150,70', 0.5] },
        { cam: { x: 2.9, y: 1.05, z: 9.2, yaw: 0.47, pitch: -0.02, F: 1.35, cut: true } },
        { at: 0.3, cam: { x: 3.1, y: 1.08, z: 9.6, yaw: 0.47, pitch: -0.02, F: 1.45, ease: 5 } },
        { at: 4.4, fade: [1, 1.2] }] },
    ],
  };
})();
