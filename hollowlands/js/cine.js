'use strict';
// HOLLOWLANDS — cinematics. Each shot has a camera path (keyframes: t 0..1, camera x y z, look-at x y z, lens),
// optional actors and effects, and a line of text or a title. Story text is a PROPOSAL (see docs/DESIGN.md).
(() => {
  const TX = 166 * 8 + 4 - 4, TZ = 45 * 8 - 2; // the tower
  const SX = 156 * 8, SY = 55 * 8; // where the great shrine stood, in the opening
  const P = HL.P;
  const V = () => HL.vfx;
  HL.CINE = {
    intro: {
      note: 'silence', hidePlayer: true,
      shots: [
        { // the light of Veyr
          dur: 6.6, dark: 0.45, grade: ['#a8fff4', 0.28], text: 'Before the Silence, Veyr drew its light from the earth.',
          cam: [[0, SX + 140, 74, SY + 135, SX, 58, SY, 32], [1, SX - 125, 58, SY + 125, SX, 70, SY, 30]],
          start(a) { a.gs = a.actor({ prop: 'shrine', x: SX, y: SY, scale: 3, awake: true, k: 3 }); a.pulse = 0; },
          tick(a, t) { if (t > a.pulse) { a.pulse = t + 1.6; V().beam(SX, SY, '#7fe8e0', 1.4, 7, 260); V().ring3d(SX, SY, 98, 70, '#9ff5ec', 1.4, 0.1); V().light(SX, SY, 0x7fe8e0, 260, 1, 100); a.play('bellLow'); } if (Math.random() < 0.6) V().embers(SX + (Math.random() - 0.5) * 70, SY + (Math.random() - 0.5) * 50, 1, '#7fe8e0'); },
        },
        { // the faithful kneel
          dur: 5.8, dark: 0.5, grade: ['#a8fff4', 0.22], text: 'Lumen, they called it. It healed the sick, lit the roads, and kept the dark below.',
          cam: [[0, SX + 46, 11, SY + 74, SX, 30, SY, 36], [1, SX + 22, 9, SY + 54, SX, 42, SY, 31]],
          start(a) { a.kneel = [[-30, 26], [30, 26], [-40, -4], [40, -6], [0, 38]].map(([dx, dy]) => a.actor({ type: 'acolyte', x: SX + dx, y: SY + dy, face: Math.atan2(-dy, -dx), kneel: true })); },
          tick(a) { if (Math.random() < 0.8) V().embers(SX + (Math.random() - 0.5) * 60, SY + (Math.random() - 0.5) * 50, 1, '#7fe8e0'); },
        },
        { // the light goes out
          dur: 5.4, dark: 0.5, text: 'Then, one night, every shrine in Veyr went dark.',
          cam: [[0, SX - 66, 40, SY + 92, SX, 52, SY, 30], [1, SX - 44, 28, SY + 72, SX, 30, SY, 34]],
          tick(a, t) {
            if (t > 1.5 && !a.broke) { a.broke = true; a.gs.broken = true; a.play('bad'); a.play('burst'); V().flash('#e8fffb', 0.75); V().chroma(1.8); V().kick(1.5); a.shake(5); V().shock(SX, SY, 90, '#7fe8e0', 1); V().debris(SX, SY, 30, '#7fe8e0', 1.4); V().burst(SX, SY, 99, '#9ff5ec', 40, 120, 1.2); for (const k of a.kneel) { k.kneel = false; k.pose = 'dead'; } }
            if (t > 1.5) a.dark(0.5 + Math.min(0.4, (t - 1.5) * 0.3));
            a.grade = t < 1.5 ? ['#a8fff4', 0.2] : null;
          },
        },
        { // the hollow climb out of the dark
          dur: 6.8, dark: 0.62, grade: ['#ffb0a0', 0.12], text: 'Roads sank. Towns emptied. And from the dark below, the hollow came.',
          cam: [[0, 300, 15, 478, 384, 8, 404, 34], [1, 282, 24, 498, 384, 10, 402, 38]],
          start(a) { a.clear(); a.risers = []; const spots = [[360, 396], [384, 410], [408, 398], [336, 414], [430, 412], [372, 388], [396, 386]]; spots.forEach(([x, y], i) => a.risers.push(a.actor({ type: i === 3 ? 'brute' : i === 5 ? 'wraith' : 'drifter', x, y, face: Math.PI / 2 + (Math.random() - 0.5) * 0.4, rise: 0, at: 0.3 + i * 0.6 }))); },
          tick(a, t) {
            for (const r of a.risers) {
              const k = HL.clamp((t - r.at) / 0.9, 0, 1);
              if (k > 0 && !r.started) { r.started = true; a.play('growl'); V().dust(r.x, r.y, 10); V().crack(r.x, r.y, 7); V().embers(r.x, r.y, 10, P.red0); }
              r.rise = k; r.glint = k > 0.8;
            }
          },
        },
        { // you, by the wreck
          dur: 6.6, dark: 0.25, grade: ['#ffd9a8', 0.15], text: 'You were hauling lamp oil to Ashwick when the light went out. You don\'t remember the crash.',
          cam: [[0, 84, 150, 530, 84, 0, 444, 30], [0.55, 102, 42, 482, 84, 4, 444, 28], [1, 112, 22, 472, 90, 7, 444, 30]],
          start(a) { a.clear(); a.me = a.actor({ type: 'player', x: 84, y: 444, face: -0.4, getUp: 0 }); },
          tick(a, t) {
            a.me.getUp = HL.clamp((t - 3.6) / 0.9, 0, 1);
            if (t > 3.6 && !a.up) { a.up = true; a.play('roll'); V().dust(84, 444, 8); }
            if (t > 4.6) a.me.face = HL.lerp(a.me.face, 0, 0.05);
          },
        },
        { // the title
          dur: 3.8, dark: 0.15, title: 'HOLLOWLANDS', sub: 'the light went out', titleAt: 0.5,
          cam: [[0, 58, 30, 462, 130, 6, 444, 32], [1, 36, 74, 474, 190, 0, 430, 36]],
          start(a) { if (!a.me) a.me = a.actor({ type: 'player', x: 84, y: 444, face: 0 }); a.me.getUp = 1; a.me.face = 0; },
          tick(a, t) { if (t > 0.5 && !a.slam) { a.slam = true; a.play('toll'); V().flash('#e8fffb', 0.55); V().chroma(1.2); V().shock(84, 444, 44, '#7fe8e0', 0.8); V().beam(84, 444, '#7fe8e0', 0.8, 5, 140); V().kick(1.2); a.shake(3); } },
        },
      ],
    },
    shrine: {
      shots: [
        { dur: 2.8, dark: 0.2, textFn: (G) => G.cutAt.name + '. Something still sleeps in the stone.',
          camFn: (G) => { const k = G.cutAt; return [[0, k.x + 44, 10, k.y + 40, k.x, 20, k.y - 4, 34], [1, k.x - 42, 13, k.y + 36, k.x, 24, k.y - 4, 34]]; },
          tick(a, t, G) { const k = G.cutAt; if (t > 1.7 && !a.r) { a.r = true; a.play('rumble'); a.shake(2); V().dust(k.x, k.y, 12); } } },
        { dur: 3.8, dark: 0.3, grade: ['#a8fff4', 0.3], titleAt: 0.35, titleFn: (G) => [G.cutAt.sigil.name.toUpperCase(), G.cutAt.sigil.desc],
          camFn: (G) => { const k = G.cutAt; return [[0, k.x + 30, 12, k.y + 52, k.x, 22, k.y - 4, 32], [1, k.x + 10, 44, k.y + 74, k.x, 26, k.y - 4, 36]]; },
          start(a, G) { const k = G.cutAt; a.play('toll'); a.play('ult'); V().beam(k.x, k.y - 4, '#7fe8e0', 2, 9, 260); V().shock(k.x, k.y - 4, 60, '#7fe8e0', 0.9); V().shock(k.x, k.y - 4, 36, '#e0fffb', 0.6); V().flash('#e8fffb', 0.6); V().chroma(1.4); V().kick(1.3); a.shake(4); V().light(k.x, k.y, 0x7fe8e0, 260, 1.4); },
          tick(a, t, G) { const k = G.cutAt; if (Math.random() < 0.9) V().embers(k.x + (Math.random() - 0.5) * 30, k.y - 4 + (Math.random() - 0.5) * 30, 2, '#7fe8e0'); } },
      ],
    },
    trial: {
      shots: [
        { dur: 3, dark: 0.25, grade: ['#a8fff4', 0.2], title: 'TRIAL OF THE SHRINE', sub: 'survive three waves', titleAt: 0.7,
          camFn: (G) => { const k = G.cutAt; return [[0, k.x + 76, 52, k.y + 88, k.x, 6, k.y + 18, 32], [1, k.x - 76, 48, k.y + 78, k.x, 6, k.y + 18, 32]]; },
          tick(a, t, G) { const k = G.cutAt; if (t > 0.6 && !a.w) { a.w = true; a.play('toll'); V().shock(k.x, k.y + 18, 54, '#7fe8e0', 0.9); for (let i = 0; i < 10; i++) { const q = (i / 10) * HL.TAU; V().beam(k.x + Math.cos(q) * 54, k.y + 18 + Math.sin(q) * 54, '#7fe8e0', 1.4, 2.5, 90); } V().flash('#e8fffb', 0.3); a.shake(3); } } },
      ],
    },
    tower: {
      note: 'tower_seen',
      shots: [
        { dur: 4.8, grade: ['#ffd9a8', 0.12], text: 'The warden\'s tower. No light has burned in it since the Silence.',
          cam: [[0, TX + 22, 8, TZ + 82, TX, 50, TZ, 36], [1, TX + 8, 34, TZ + 98, TX, 190, TZ, 42]],
          tick(a, t) { if (Math.random() < 0.15) V().burst(TX + (Math.random() - 0.5) * 60, TZ, 200 + Math.random() * 20, P.ink, 1, 20, 1.5); } },
        { dur: 3.8, text: 'The gate is locked: a big, rust-red keyhole. Somewhere in these woods is its key.',
          cam: [[0, TX + 44, 20, TZ + 74, TX, 8, TZ + 30, 30], [1, TX + 16, 12, TZ + 56, TX, 8, TZ + 31, 25]] },
      ],
    },
    crypt: {
      note: 'crypt_seen',
      shots: [
        { dur: 5.4, dark: 0.2, text: 'Beneath the tower the stairs keep going down. The old wardens kept something shut here.',
          cam: [[0, 192, 64, 404, 192, 0, 300, 34], [1, 192, 46, 330, 192, 0, 226, 34]],
          start(a, G) { a.lit = G.world.objects.filter((o) => o.t === 'brazier').sort((p, q) => q.y - p.y); },
          tick(a, t) { const n = Math.floor(t / 0.35); while (a.lit.length && (a.done || 0) < n) { const b = a.lit.shift(); a.done = (a.done || 0) + 1; V().burst(b.x, b.y, 8, P.fire, 10, 40); V().light(b.x, b.y, 0xffa050, 80, 0.5); a.play('fire'); } } },
      ],
    },
    keeper: {
      shots: [
        { dur: 3.2, dark: 0, text: 'Something kneels in the dark, wrapped in chains.',
          camFn: (G) => { const p = G.player; return [[0, p.x + 12, 30, p.y + 42, 160, 10, 100, 30], [1, p.x + 4, 24, p.y + 32, 160, 14, 100, 26]]; },
          start(a, G) { G.cutKeeperRise = 0; } },
        { dur: 3.6, cam: [[0, 205, 8, 140, 160, 22, 100, 34], [1, 118, 10, 142, 160, 28, 100, 34]],
          tick(a, t, G) { G.cutKeeperRise = HL.clamp((t - 0.4) / 2, 0, 1); if (Math.random() < 0.4) V().embers(160, 100, 2); a.ck = (a.ck || 0) + 1; if (a.ck % 40 === 0) a.play('clank'); } },
        { dur: 3, title: 'THE BELLWORN KEEPER', sub: 'warden of the silent bell', titleAt: 0.35,
          cam: [[0, 160, 14, 152, 160, 28, 100, 36], [1, 160, 18, 168, 160, 26, 100, 42]],
          start(a, G) { G.cutKeeperRise = 1; },
          tick(a, t) { if (t > 0.3 && !a.roar) { a.roar = true; a.play('toll'); a.play('growl'); V().shock(160, 100, 70, P.red0, 0.9); V().shock(160, 100, 40, P.fire, 0.6); V().flash(P.red0, 0.45); V().chroma(1.5); V().kick(1.5); a.shake(5); V().embers(160, 100, 24); } } },
      ],
      end(a, G) { G.cutKeeperRise = 1; },
    },
    keeperDeath: {
      shots: [
        { dur: 3.8, camFn: (G) => { const k = G.cutAt; return [[0, k.x + 62, 22, k.y + 52, k.x, 10, k.y, 34], [1, k.x - 52, 32, k.y + 62, k.x, 8, k.y, 30]]; },
          start(a) { a.play('rumble'); },
          tick(a, t, G) { const k = G.cutAt; a.bt = (a.bt || 0) + 1; if (a.bt % 26 === 1) { V().beam(k.x + (Math.random() - 0.5) * 14, k.y + (Math.random() - 0.5) * 10, P.lt0, 0.7, 3, 150); a.play('bellHigh'); } if (Math.random() < 0.6) V().embers(k.x, k.y, 3); if (t > 3.3 && !a.boom) { a.boom = true; V().flash(P.cream, 0.7); V().shock(k.x, k.y, 90, P.lt0, 1); a.play('toll'); } } },
        { dur: 3, title: 'THE KEEPER FALLS', sub: 'and the bell below goes quiet', titleAt: 0.2,
          camFn: (G) => { const k = G.cutAt; return [[0, k.x, 44, k.y + 72, k.x, 6, k.y, 30], [1, k.x, 86, k.y + 92, k.x, 0, k.y, 34]]; } },
      ],
    },
  };
})();
