// Act II, region II — The Ash Dunes. (PROPOSAL: names and texts in this file are proposals for the author.)
// South and east of the snows the land burns out into sand: a caravan road under rock-cut tombs, the sunken
// colonnade of a temple older than the city, the avenue of guardian beasts round a dry cistern, and the
// sinking bowl under the colossus's broken feet, where the Sand Wyrm swims. A hot wind full of sand
// instead of rain; a low amber moon.
import * as P from '../props/ashdunes.js';
import { rockFill } from '../props/undercroft.js';
import { clouds } from '../props/belfry.js';
import { W2, barrier, floorGlow, decal } from '../kit2.js';
import * as T from '../../engine/textures.js';

const WALKS = [
  [-5, -5.0, 9, 18],          // the caravan road
  [0.8, -6.2, 4.4, -5.0],     // the court's south door
  [-7, -19, 10, -6.2],        // the sunken colonnade
  [0.8, -20.2, 4.4, -19],     // the temple door
  [-4, -33, 9.5, -20.2],      // the avenue of guardians and the cistern
  [1.4, -34.2, 5, -33],       // the avenue's end
  [-1, -39.4, 10, -34.2],     // the obelisk and the last lamp
  [2.6, -40.6, 6.6, -39.4],   // the bowl's rim
  [-6.5, -59.4, 15, -40.6],   // the sinking bowl
  [2.8, -63, 6.4, -59.4],     // the pylon and the stair down
];
const BOUNDS = [-16, -63, 20, 18];

export default {
  id: 'ashdunes', name: 'The Ash Dunes', tagline: 'THE SAND REMEMBERS A CITY OLDER THAN OURS.', tier: 9, act: 2,
  start: { x: 1.8, z: 15.4, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['courtGate', 'bowlGate'],
  ambience: {
    fog: 0x302a2c, fogNear: 68, fogFar: 140, sky: 0x140e0c, moon: 2.0, moonColor: 0xffbe7a, moonDir: [0.75, 0.75, -0.45], hemi: 1.0, hemiSky: 0x5a5874, hemiGround: 0x2a2018,
    fill: 1.2, fillColor: 0x7884a8, ambient: 0x1c1a26, ambientI: 0.6, rain: 0.25, lightning: false, weather: 'sand',
    grade: { gain: [1.05, 1.0, 0.93], lift: [0.008, 0.005, 0.004], sat: 0.82 },
    beams: [{ x: 2, z: 8, r: 5, h: 15, from: [6, 0, -10], intensity: 45, color: 0xffc890 }, { x: 1, z: -13, r: 6, h: 15, from: [6, 0, -10], intensity: 50, color: 0xffc890 }, { x: 4.5, z: -50, r: 8, h: 18, from: [6, 0, -9], intensity: 70, color: 0xffc890 }],
  },
  lamps: [{ id: 'caravan', x: -3.4, z: 8.6, sx: 1.3, sz: 0.3 }, { id: 'obelisk', x: 8.6, z: -36.6, sx: -1.4, sz: 0.2 }],
  items: [{ id: 'c1', x: -5.8, z: -17.6, ry: Math.PI / 2, kind: 'tonic' }, { id: 'c2', x: 8.4, z: -21.2, ry: -Math.PI / 2, kind: 'embers', amount: 240 }],
  hints: [
    { zone: [-5, 12, 9, 18], text: 'NO RAIN HERE. ONLY THE WIND, AND WHAT IT CARRIES.' },
    { zone: [-5, -3.8, 9, -1], text: 'THE SAND MOVES WHERE NOTHING WALKS. WATCH FOR THE LINE.' },
    { zone: [-4, -23, 9.5, -20.4], text: 'BURN THE WRAPPED DEAD, OR THEY RISE AGAIN.' },
    { zone: [-1, -39.4, 10, -37.6], text: 'THE BOWL AHEAD IS SINKING. SOMETHING SWIMS BENEATH IT.' },
  ],
  foes: [
    { t: 'scorpion', x: 2.2, z: 1.2 }, { t: 'scorpion', x: 5.4, z: -1.6 }, { t: 'sandworm', x: 0.6, z: -3.2 },
    { t: 'mummy', x: 2.4, z: -36.8 }, { t: 'scorpion', x: 5.6, z: -38.4 },
  ],
  encounters: [
    { id: 'court', zone: [-5, -17, 8, -8], gates: ['courtGate'], opens: ['templeGate'], msg: 'THE SAND IN THE COURT BEGINS TO MOVE', done: 'THE TEMPLE DOOR GRINDS OPEN',
      waves: [
        { pre: true, foes: [{ t: 'mummy', x: -3.2, z: -15.4, face: 0 }, { t: 'scorpion', x: 6.4, z: -14.2 }, { t: 'scorpion', x: 1, z: -16.6 }, { t: 'sandworm', x: 7.6, z: -8.4 }] },
        { foes: [{ t: 'mummy', x: -4.6, z: -9 }, { t: 'mummy', x: 7.6, z: -16.4 }, { t: 'sandworm', x: 2, z: -12 }, { t: 'scorpion', x: -1, z: -17.4 }] },
      ] },
    { id: 'cistern', zone: [-2.5, -31.6, 8, -22.4], gates: ['templeGate'], opens: ['avenueGate'], msg: 'THE GUARDIANS WATCH. THE DEAD DO NOT.', done: 'THE AVENUE LIES OPEN',
      waves: [
        { pre: true, foes: [{ t: 'mummy', x: -0.6, z: -31, face: 0 }, { t: 'mummy', x: 6.4, z: -30, face: 0 }, { t: 'scorpion', x: 0, z: -23.4 }, { t: 'scorpion', x: 6.6, z: -23.2 }] },
        { foes: [{ t: 'sandworm', x: 6.8, z: -26.8 }, { t: 'scorpion', x: -1.2, z: -26.4 }, { t: 'scorpion', x: 3, z: -31.8 }, { t: 'mummy', x: 6.2, z: -22.8 }] },
      ] },
  ],
  boss: { type: 'sandwyrm', x: 4.4, z: -50, face: 0, zone: [-6, -59, 14.5, -41.6], gates: ['bowlGate'], opens: ['exitGate', 'bowlGate'] },
  exit: { zone: [3, -62.6, 6.2, -61], to: 'catacombs', requires: 'boss' },
  build(K, ctx) {
    // ------------------------------------------------ ground: sand, the temple paving under drifts
    K.floor(ctx, BOUNDS[0] - 30, BOUNDS[1] - 30, BOUNDS[2] + 30, BOUNDS[3] + 30, W2.sand(P.SAND2), -0.02, 0.3);
    K.floor(ctx, -5, -5, 9, 18, W2.sand(P.SAND), 0, 0.3);
    K.floor(ctx, 0.6, -5.2, 4.6, 18, W2.sand('#988870'), 0.008, 0.3);
    K.floor(ctx, -7, -20.2, 10, -5.0, K.M.flags('#8e8270'), 0.02, 0.3);
    K.floor(ctx, -4, -33.6, 9.5, -20.2, K.M.court('#8a7c6a'), 0.02, 0.3);
    K.floor(ctx, -1, -40.6, 10, -33.6, W2.sand(P.SAND), 0, 0.3);
    K.floor(ctx, -6.5, -63, 15, -40.6, W2.sand(P.DUNE), 0, 0.3);
    rockFill(ctx, BOUNDS, WALKS, 2.2);

    // ------------------------------------------------ the caravan road
    P.mesa(ctx, -13, -5.2, -5.6, 13, 7, { face: '+x', tombs: [1.4, 8] });
    P.mesa(ctx, -12, 13, -5.6, 22, 4.6, { face: '+x' });
    P.dune(ctx, 11.4, 6, 3.6, 9, 1.2); P.dune(ctx, 11, -2.4, 3.2, 6, 1.0); P.dune(ctx, 3, 19.6, 9, 2.6, 0.8, { solid: false });
    P.caravan(ctx, 6.6, 11.6, 0.4);
    P.palm(ctx, 8.4, 2.6, 3.2, 0.4, 2.2); P.palm(ctx, -4.4, 14.6, 4.6, 0.25, 0.8);
    P.stela(ctx, -1.2, 15.8, 0.3, 1.6); P.stela(ctx, 5.8, 4.6, -0.2, 1.8);
    P.bones(ctx, 3.8, 6.4, 6); P.sherds(ctx, 6.8, 9.4); P.bones(ctx, -2.6, 0.6, 4);
    P.spill(ctx, -4.2, 4.2, 2.2, 3, 0.4); P.spill(ctx, 8.2, -3.6, 2.4, 2, 0.45);
    P.fireBowl(ctx, 4.6, -3.4); P.fireBowl(ctx, -0.6, -3.6);
    K.fallenBody(ctx, 4.2, 8.6, 1.4, 0x2a1e16); K.droppedSword(ctx, 5, 9.4, 2.2);
    // the south door of the court: low broken walls and the slabs that rise
    P.ruinWall(ctx, -5.6, -5.6, 0.8, -5.6, 0.6, 1.4); P.ruinWall(ctx, 4.4, -5.6, 10.2, -5.6, 0.6, 1.3);
    ctx.marks.courtGate = barrier(ctx, 2.6, -5.6, 3.6, 'x', 'sand', { open: true });

    // ------------------------------------------------ the sunken colonnade (first fight)
    for (const z of [-8.2, -11.6, -15, -18.4]) P.column(ctx, -6.4, z, 5, { beam: [0.9, 3.6], beamOff: [0, z === -18.4 ? 0 : -1.7] });
    for (const [x, hb] of [[-3, 1.5], [0, 0.9], [5.2, 1.2], [9, 0.7]]) P.column(ctx, x, -19.6, 5, { broken: hb });
    P.column(ctx, 9.6, -8.6, 5, { broken: 1.3 }); P.column(ctx, 9.6, -12.6, 5, { broken: 0.8 }); P.column(ctx, 9.6, -16.4, 5, { broken: 1.6 });
    P.fallenColumn(ctx, 4.6, -10.2, 2.2, 4);
    P.colossalHead(ctx, -10.4, -12.6, Math.PI / 2, 1.5);
    P.mesa(ctx, -15, -20, -7.2, -5.2, 5.4, { face: '+x', solidFace: false });
    P.spill(ctx, -4.4, -13, 2.6, 3.2, 0.35); P.spill(ctx, 7.6, -17.6, 2.4, 2, 0.3); P.spill(ctx, 1.4, -7.4, 3, 1.6, 0.3);
    P.fireBowl(ctx, -4.8, -7.4); P.fireBowl(ctx, 8.4, -18.2);
    P.sherds(ctx, -1.4, -10.6, 10); P.bones(ctx, 6.4, -14.6, 5);
    K.fallenBody(ctx, 1.6, -13.8, -0.7, 0x2a1e16); K.droppedSword(ctx, 2.6, -13.2, 1.7);
    decal(ctx, 1.4, -12.6, 7, T.sigil('seal', 64, 91), 0xffb040, { k: 0.22, pulse: 1.2 });
    ctx.marks.templeGate = barrier(ctx, 2.6, -19.6, 3.6, 'x', 'sand');
    P.ruinWall(ctx, 9.4, -20.2, 11, -20.2, 0.6, 1.0);

    // ------------------------------------------------ the avenue of guardians and the cistern (second fight)
    for (const z of [-22.4, -26.8, -31.2]) P.guardian(ctx, -3.3, z, Math.PI / 2, { sunk: 0.3 });
    for (const z of [-23.4, -28.2]) P.guardian(ctx, 9.1, z, -Math.PI / 2, { sunk: 0.6, tone: '#a07a50' });
    P.cistern(ctx, 3, -27, 2);
    P.mesa(ctx, -15, -40, -4.8, -20.2, 6.4, { face: '+x', tombs: [-24.8, -31.6] });
    P.obelisk(ctx, -6.2, -35.6, 7.5);
    P.obelisk(ctx, 10.4, -32.6, 6, { fallen: true, ry: 0.9 });
    P.dune(ctx, 11.6, -25.6, 2.8, 8, 0.9, { solid: false });
    P.fireBowl(ctx, -1.6, -21); P.fireBowl(ctx, 8.2, -32.2);
    P.jar(ctx, 7.6, -20.8); P.jar(ctx, 8, -21.6, true); P.sherds(ctx, 6.6, -24.4);
    K.fallenBody(ctx, 0.4, -29.2, 0.9, 0x2a1e16);
    P.ruinWall(ctx, -4, -33.6, 1.4, -33.6, 0.8, 1.6); P.ruinWall(ctx, 5, -33.6, 9.6, -33.6, 0.6, 1.2);
    ctx.marks.avenueGate = barrier(ctx, 3.2, -33.6, 3.6, 'x', 'sand');

    // ------------------------------------------------ the obelisk and the last lamp
    P.mesa(ctx, -8, -40.4, -1.2, -34.2, 5.2, { face: '+x' });
    P.stela(ctx, 0.2, -35.2, 0.4, 2); P.bones(ctx, 4.4, -35.4, 6); P.dune(ctx, 11, -37, 1.8, 4, 0.7);
    P.ruinWall(ctx, -1.2, -40, 2.6, -40, 0.7, 1.5); P.ruinWall(ctx, 6.6, -40, 10.4, -40, 0.8, 1.6);
    ctx.marks.bowlGate = barrier(ctx, 4.6, -40, 4, 'x', 'sand', { open: true });

    // ------------------------------------------------ the sinking bowl
    P.colossusFeet(ctx, -10.4, -53.8, 0.15);
    P.mesa(ctx, -16, -70, 2.6, -61, 6, { face: '+z', solidFace: false }); P.mesa(ctx, 6.6, -70, 20, -61, 6, { face: '+z', solidFace: false });
    P.pylon(ctx, 4.6, -61.2, 3.6, 8.5);
    P.colossalHead(ctx, 13.4, -60.6, -0.6, 1.1);
    P.mesa(ctx, -15, -47.6, -6.8, -40.6, 5, { face: '+x', solidFace: false });
    P.column(ctx, -4.6, -43.2, 5, { broken: 2.6 }); P.column(ctx, 13, -43, 5, { broken: 1.2 }); P.column(ctx, -4.8, -57.4, 5, { broken: 3.6 }); P.column(ctx, 13.4, -56.6, 5, { broken: 1.6 });
    P.dune(ctx, 16.4, -50, 3, 15, 1.0, { solid: false }); P.dune(ctx, 10.6, -41, 4, 1.4, 0.5, { solid: false });
    P.fireBowl(ctx, -5.4, -41.6); P.fireBowl(ctx, 14, -41.8); P.fireBowl(ctx, 1.6, -58.6); P.fireBowl(ctx, 7.6, -58.6);
    decal(ctx, 4.4, -50, 15, T.sigil('ring', 96, 92), 0xc08040, { k: 0.18, spin: 0.04 });
    P.bones(ctx, 8.6, -46.4, 7); P.bones(ctx, 0.4, -53.6, 5); K.fallenBody(ctx, 9.6, -53.2, 1.1, 0x2a1e16); K.droppedSword(ctx, 10.6, -52.4, 2.4);
    ctx.marks.exitGate = barrier(ctx, 4.6, -60, 3.6, 'x', 'sand');

    // ------------------------------------------------ the waste round it all, and the veil of blown sand
    P.wastes(ctx, BOUNDS, WALKS, { seed: 717, skip: [[-16, -71, 21, -61], [-16, -60, -6.6, -40.4], [-15, -40, -4.8, -20.2], [-15, -20, -7, -5], [-13, -5.2, -5.6, 22], [-8, -40.4, -1.2, -34.2]] });
    clouds(ctx, BOUNDS[0] - 10, BOUNDS[1] - 10, BOUNDS[2] + 10, BOUNDS[3] + 10, 3.4, { opacity: 0.12, speed: 7, seed: 73, order: 4, color: 0x9a8a78, density: 0.75, tile: 22 });
  },
};
