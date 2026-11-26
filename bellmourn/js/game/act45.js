// Acts IV and V (docs/ASCENT_DESIGN.md §1, §2): Act IV's foes, the drowned of the fallen heaven (their bodies are
// the Act III bodies of heaven, recast in the colours of the deep and made stronger), and the two act bosses:
// THE LAST SERAPH (Act IV, the Broken Halo) and THE FIRST FOUNDER (Act V, the Cradle of Bronze; his body is
// js/actors/beasts6.js). Both fight in three stages with interludes (stages_more.js). Self-registering; pure.
//
// PROPOSAL: every name, line, stage and banner here.
import { strike, summon } from './ai.js';
import { BOSSES2, BOSS_AI2, quick } from './bosses2.js';
import { UNITS, UNIT_AI } from './units.js';
import { BOSS_LINES } from './scenes/lines.js';
import { SPEAKERS } from './scenes/cast.js';
import { MORE_STAGES, evolveMore } from './stages_more.js';

const deg = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2, S = Math.sin, C = Math.cos;
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const spot = (w, e, x, z, r, o) => w.addHazard({ shape: 'circle', x, z, r, warn: o.warn, life: o.life ?? 0.3, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 5, status: o.status });
const beamAt = (w, e, ang, o) => w.addHazard({ shape: 'line', x: e.x, z: e.z, face: ang, len: o.len ?? 16, width: o.width ?? 1.0, warn: o.warn, life: o.life ?? 0.3, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 5 });

// ------------------------------------------------------------------ Act IV's foes (recast from heaven's own)
function recast(base, id, o) {
  const B = UNITS[base]; if (!B || UNITS[id]) return; // a foe of its own (units4.js) wins
  UNITS[id] = { ...B, ...o.stats, name: o.name, look: { ...B.look, ...(o.look || {}), colors: { ...(B.look.colors || {}), ...(o.colors || {}) } } };
  if (UNIT_AI[base] && !UNIT_AI[id]) UNIT_AI[id] = UNIT_AI[base];
}
function registerFoes() {
  // a drowned angel: an angel of the fallen heaven, sea-green and barnacled, its feathers heavy with water
  recast('hollowangel', 'drownedangel', { name: 'Drowned Angel', stats: { hp: 210, drop: 22, home: 16 }, colors: { skin: 0x7aa89a, tunic: 0x3a6a62, pants: 0x2a4a46, boots: 0x18302e, shoulder: 0x9ad8c0, glove: 0x7aa89a, belt: 0x60c0a8, trim: 0x60c0a8 }, look: { skirt: 0x3a6a62, eyes: 0x60ffd8 } });
  // a choir-wraith: a mask of the drowned choir, green-white, still singing under the water
  recast('choirmask', 'choirwraith', { name: 'Choir Wraith', stats: { hp: 120, drop: 16, home: 16, speed: 2.9 }, colors: { mask: 0xc8e8d8, gold: 0x60c0a8, song: 0x80ffd0, ribbon: 0x1e6a5a } });
  // a bell-jelly: a drifting bell of light trailing stinging threads
  recast('wisp', 'belljelly', { name: 'Bell Jelly', stats: { hp: 150, drop: 14, home: 16, speed: 2.6, r: 0.5 }, look: { scale: 1.9 }, colors: { flame: 0x80c8ff, core: 0xe8f8ff, dark: 0x2a5a8a, mote: 0x60b0ff } });
  // a glass knight: armour of stained glass, a thing of the Glass Orchard
  recast('gildedknight', 'glassknight', { name: 'Glass Knight', stats: { hp: 260, drop: 24, home: 16 }, colors: { skin: 0xa8c8e8, tunic: 0x6a8ac8, pants: 0x4a5a9a, boots: 0x2a2a5a, shoulder: 0xc890e8, glove: 0x8aa8d8, belt: 0xf0e0ff }, look: { eyes: 0xe0c0ff, mask: 0xc890e8 } });
  // an echo: a grey shade of a warden who fell before you, in the Hall of Echoes
  recast('chronoknight', 'echoknight', { name: 'Echo of a Warden', stats: { hp: 230, drop: 22, home: 16 }, colors: { skin: 0x9a9aa8, tunic: 0x4a4a5a, pants: 0x3a3a48, boots: 0x22222c, shoulder: 0xb8b8c8, glove: 0x8a8a98, belt: 0xd8d8e8 }, look: { blade: 0xe0e0ff, eyes: 0xe0e0ff, mask: 0x8a8a98 } });
}

// ------------------------------------------------------------------ the bosses
export const BOSSES45 = {
  // PROPOSAL: the Last Seraph, God's herald and the last angel: six wings of gold, a halo she draws as a blade.
  seraph: { name: 'The Last Seraph', title: 'Herald of the Voice', hp: 9800, poise: 999, speed: 3.2, r: 1.0, mass: 30, scale: 2.2, boss: true, hover: true },
  // PROPOSAL: the First Founder, the man who cast the Great Bell a thousand years ago: bronze-skinned, a giant
  // casting hammer, moulds that pour copies of him.
  firstfounder: { name: 'The First Founder', title: 'Who Cast the Bell', hp: 12500, poise: 999, speed: 2.6, r: 1.0, mass: 40, scale: 2.0, boss: true },
};
function bossLooks() {
  const A = UNITS.hollowangel; if (A) BOSSES45.seraph.look = { ...A.look, scale: 2.2, eyes: 0xfff0a0, skirt: 0xe8c060, colors: { ...A.look.colors, skin: 0xf4e4c0, tunic: 0xf8f0d8, pants: 0xe8d8b0, boots: 0xc8a050, shoulder: 0xffd060, glove: 0xf0d090, belt: 0xffd060, trim: 0xffd060 } };
  BOSSES45.firstfounder.look = { rig: 'firstfounder', scale: 2.0, eyes: 0xffa030, colors: { bronze: 0xa8743a, dark: 0x2a1a0c, iron: 0x4a4a52, molten: 0xff7a20, mould: 0x5a4a3a, apron: 0x4a3020, strap: 0x2a1a10, beard: 0xc8904a, cap: 0x3a2a1a, god: 0xffd890 } };
}

// the Seraph: her halo as a blade, spears of light, a dive from above, feathers that fall as blades
const seraph = {
  phases: [0.66, 0.33], keep: 3.2, turn: 3.6,
  moves(p) {
    const q = p >= 3 ? 0.88 : 1;
    return [
      { id: 'haloblade', w: 2.6, max: 3.8, a: quick(strike({ name: 'haloblade', anim: 'sweep', range: 4.0, arc: deg(240), windup: 0.75, active: 0.9, dur: 1.5, dmg: 24, kb: 7, lunge: 1.8 }), q) },
      { id: 'lance', w: 2.0, min: 2.5, max: 12, cd: 4, a: quick({ name: 'lance', anim: 'cast', dur: 1.4, windup: 0.7, active: 0.75, tele: 'none', dmg: 0, onStrike: (w, e) => { const a = angTo(e, w.hero); for (const o of [-0.35, 0, 0.35]) beamAt(w, e, a + o, { warn: 0.75, dmg: 20, kind: 'radiant', len: 18, width: 0.9 }); } }, q) },
      { id: 'featherfall', w: 1.8, min: 2, cd: 5, a: { name: 'featherfall', anim: 'cast', dur: 1.3, windup: 0.6, active: 0.65, tele: 'none', dmg: 0, onStrike: (w, e) => { const h = w.hero; for (let i = 0; i < 6; i++) { const a = w.rand() * TAU, r = i ? 1 + w.rand() * 3.5 : 0; spot(w, e, h.x + S(a) * r, h.z + C(a) * r, 0.9, { warn: 0.9 + i * 0.1, dmg: 18, kind: 'radiant' }); } } } },
      { id: 'dive', w: 1.6, min: 4, max: 12, cd: 6, a: { name: 'dive', anim: 'slam', dur: 1.6, windup: 0.9, active: 1.0, shape: 'circle', offset: 0, radius: 2.4, tele: 'circleAt', leap: true, dmg: 26, kb: 9, heavy: true } },
    ];
  },
  onPhase(w, e, p) { summon(w, e, 'drownedangel', p >= 3 ? 2 : 1, e.def.tier ?? 18, 5); },
};
// the First Founder: the casting hammer, molten lanes, moulds that pour bronze copies of him
const firstfounder = {
  phases: [0.66, 0.33], keep: 2.8, turn: 4,
  moves(p) {
    const q = p >= 3 ? 0.88 : 1;
    return [
      { id: 'smash', w: 2.6, max: 3.6, a: quick(strike({ name: 'smash', anim: 'smash', shape: 'circle', offset: 1.8, radius: 2.2, windup: 0.95, active: 1.05, dur: 2.0, dmg: 28, kb: 9, lunge: 0.6, tele: 'circle' }), q) },
      { id: 'swing', w: 2.2, max: 3.4, a: quick(strike({ name: 'swing', anim: 'sweep', range: 3.6, arc: deg(200), windup: 0.75, active: 0.9, dur: 1.5, dmg: 22, kb: 7, lunge: 1.4 }), q) },
      { id: 'pour', w: 1.9, min: 2, cd: 5, a: { name: 'pour', anim: 'pour', dur: 1.6, windup: 0.8, active: 0.85, tele: 'none', dmg: 0, onStrike: (w, e) => { const a = angTo(e, w.hero); for (let k = 0; k < 8; k++) spot(w, e, e.x + S(a) * (1.8 + k * 1.2), e.z + C(a) * (1.8 + k * 1.2), 0.9, { warn: 0.6 + k * 0.08, dmg: 20, kind: 'fire', status: { burn: 1 } }); } } },
      { id: 'mould', w: 1.2, min: 2, cd: 12, run: (w, e) => { summon(w, e, UNITS.bronzecopy ? 'bronzecopy' : 'homunculus', 1, e.def.tier ?? 23, 4); w.emit('summon', { e }); } },
    ];
  },
  onPhase(w, e, p) { summon(w, e, UNITS.homunculus ? 'homunculus' : 'hushed', p >= 3 ? 3 : 2, e.def.tier ?? 23, 5); },
};
export const BOSS_AI45 = { seraph, firstfounder };

// their stages and interludes (stages_more.js)
Object.assign(MORE_STAGES, {
  seraph: { col: 0xffd060, kind: 'radiant', K: 1.25,
    il: { kind: 'targets', leave: 'fly', banner: 'BREAK THE SIX FEATHERS OF HER HALO', dur: 22, targets: { type: 'bell', n: 6, hp: 70, name: 'Halo feather' }, waves: [[['drownedangel', 1], ['choirwraith', 2]], [['belljelly', 2]]], addsGap: 8, back: { entrance: 'drop' } },
    il2: { kind: 'gauntlet', leave: 'fly', banner: 'THE HALO FALLS', dur: 15, rain: true, back: { entrance: 'drop' } } },
  firstfounder: { col: 0xff7a20, kind: 'fire', status: { burn: 1 }, K: 1.3,
    il: { kind: 'targets', leave: 'climb', banner: 'BREAK THE MOULDS BEFORE THEY POUR', dur: 22, targets: { type: 'mould', n: 4, hp: 90, name: 'Mould' }, waves: [[['homunculus', 3]], [['bronzecopy', 1], ['homunculus', 2]]], addsGap: 8, back: { entrance: 'slam' } },
    il2: { kind: 'gauntlet', leave: 'climb', banner: 'THE BRONZE RIVERS RUN', dur: 15, lanes: true, back: { entrance: 'slam' } } },
});

export const BOSS_LINES45 = {
  seraph: { intro: 'NONE PASS TO HIM. NONE EVER HAVE.', fall: 'FORGIVE ME... I COULD NOT HOLD THE GATE.' },
  firstfounder: { intro: 'I BOUND A GOD TO SAVE YOU. I WOULD DO IT AGAIN.', fall: 'THEN WAKE HIM... AND MAY HE BE KINDER THAN I.' },
};
export const SPEAKERS45 = { seraph: { name: 'THE LAST SERAPH', color: '#ffe090' }, firstfounder: { name: 'THE FIRST FOUNDER', color: '#ffa050' } };

registerFoes(); bossLooks();
Object.assign(BOSSES2, BOSSES45); Object.assign(BOSS_AI2, BOSS_AI45);
for (const k in BOSS_LINES45) if (!BOSS_LINES[k]) BOSS_LINES[k] = BOSS_LINES45[k];
for (const k in SPEAKERS45) if (!SPEAKERS[k]) SPEAKERS[k] = SPEAKERS45[k];
evolveMore();
