// Acts IV and V (docs/ASCENT_DESIGN.md §1, §2): Act IV's foes, the drowned of the fallen heaven (their bodies are
// the Act III bodies of heaven, recast in the colours of the deep and made stronger), and the two act bosses:
// THE LAST SERAPH (Act IV, the Broken Halo) and THE FIRST FOUNDER (Act V, the Cradle of Bronze; his body is
// js/actors/beasts6.js). Both fight in three stages with interludes (stages_more.js). Self-registering; pure.
//
// PROPOSAL: every name, line, stage and banner here.
import { strike, summon } from './ai.js';
import { BOSSES2, BOSS_AI2, quick } from './bosses2.js';
import { ENTRANCES } from './bosses4.js';
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
  BOSSES45.seraph.look = { rig: 'seraph', scale: 1.9, eyes: 0xfff0a0, colors: { robe: 0xf4ecd8, gold: 0xe0b040, mask: 0xfff0c0, light: 0xfff4d0, halo: 0xffc040, skin: 0xf0d8b0, feather: 0xe8c870 } };
  BOSSES45.firstfounder.look = { rig: 'firstfounder', scale: 2.0, eyes: 0xffa030, colors: { bronze: 0xa8743a, dark: 0x2a1a0c, iron: 0x4a4a52, molten: 0xff7a20, mould: 0x5a4a3a, apron: 0x4a3020, strap: 0x2a1a10, beard: 0xc8904a, cap: 0x3a2a1a, god: 0xffd890 } };
}

// The Last Seraph. Stage one, THE HERALD: the halo-blade swept wide, three lances of light, feathers falling as
// blades round you, a dive onto a marked circle. At two thirds she flies up into the hanging halo and you break the
// six feathers of it while the drowned come (an interlude). Stage two, UNBOUND: she throws the halo, which flies
// out down a line and comes back down another; a gale of her wings in four lanes; six beams of judgement round
// her. At a third she rises again and the halo falls on the arena (a second interlude: survive it). Stage three,
// THE LAST LIGHT: her mask cracked, light pouring out: beams that wheel round her, a storm of spears across the
// whole floor, the halo-blade three times running, and the gate closing: a ring of light rolling in from the edge.
const ring = (w, e, x, z, r0, r1, o) => w.addHazard({ shape: 'ring', x, z, r0, r1, warn: o.warn ?? 0, life: o.life ?? 0.9, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind || 'radiant', kb: o.kb ?? 6 });
const SER = {
  haloblade: (q) => ({ id: 'haloblade', w: 2.6, max: 4, a: quick(strike({ name: 'haloblade', anim: 'haloblade', range: 4.2, arc: deg(250), windup: 0.75, active: 0.9, dur: 1.5, dmg: 24, kb: 7, lunge: 2 }), q) }),
  lance: (q) => ({ id: 'lance', w: 2.0, min: 2.5, max: 13, cd: 4, a: quick({ name: 'lance', anim: 'cast', dur: 1.4, windup: 0.7, active: 0.75, tele: 'none', dmg: 0, onStrike: (w, e) => { const a = angTo(e, w.hero); for (const o of [-0.35, 0, 0.35]) beamAt(w, e, a + o, { warn: 0.75, dmg: 20, kind: 'radiant', len: 18, width: 0.9 }); } }, q) }),
  featherfall: () => ({ id: 'featherfall', w: 1.8, min: 2, cd: 5, a: { name: 'featherfall', anim: 'cast', dur: 1.3, windup: 0.6, active: 0.65, tele: 'none', dmg: 0, onStrike: (w, e) => { const h = w.hero; for (let i = 0; i < 7; i++) { const a = w.rand() * TAU, r = i ? 1 + w.rand() * 3.6 : 0; spot(w, e, h.x + S(a) * r, h.z + C(a) * r, 0.9, { warn: 0.9 + i * 0.1, dmg: 18, kind: 'radiant' }); } } } }),
  dive: () => ({ id: 'dive', w: 1.6, min: 4, max: 12, cd: 6, a: { name: 'dive', anim: 'dive', dur: 1.6, windup: 0.9, active: 1.0, shape: 'circle', offset: 0, radius: 2.4, tele: 'circleAt', leap: true, dmg: 26, kb: 9, heavy: true } }),
  // the halo thrown: out down a line, back down another a breath later
  halothrow: (q) => ({ id: 'halothrow', w: 2.4, min: 2, max: 14, cd: 5, a: quick({ name: 'halothrow', anim: 'throw', dur: 1.9, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, onStrike: (w, e) => {
    const a = angTo(e, w.hero); beamAt(w, e, a, { warn: 0.45, dmg: 22, kind: 'holyfire', len: 15, width: 1.3, kb: 7 });
    const a2 = a + (w.rand() < 0.5 ? 0.45 : -0.45); w.addHazard({ shape: 'line', x: e.x + S(a) * 15, z: e.z + C(a) * 15, face: a2 + Math.PI, len: 15, width: 1.3, warn: 1.25, life: 0.3, dmg: 22 * e.dmgMul, src: e, kind: 'holyfire', kb: 7 });
  } }, q) }),
  // a gale of her wings: four lanes swept from her toward you, one after another
  gale: () => ({ id: 'gale', w: 2.0, min: 1.5, cd: 6, a: { name: 'gale', anim: 'roar', dur: 1.6, windup: 0.7, active: 0.75, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => { const a = angTo(e, w.hero); const px = C(a), pz = -S(a); for (let i = -2; i <= 1; i++) { const off = (i + 0.5) * 2.4; w.addHazard({ shape: 'line', x: e.x + px * off, z: e.z + pz * off, face: a, len: 16, width: 1.4, warn: 0.6 + (i + 2) * 0.28, life: 0.3, dmg: 17 * e.dmgMul, src: e, kind: 'radiant', kb: 10 }); } } } }),
  // six beams of judgement round her
  judgement: () => ({ id: 'judgement', w: 1.8, cd: 7, a: { name: 'judgement', anim: 'cast', dur: 1.8, windup: 0.9, active: 0.95, tele: 'none', dmg: 0, onStrike: (w, e) => { const a0 = angTo(e, w.hero) + Math.PI / 6; for (let i = 0; i < 6; i++) beamAt(w, e, a0 + i * TAU / 6, { warn: 0.0, dmg: 21, kind: 'radiant', len: 16, width: 1.0 }); } } }),
  // three wheels of beams turning round her, each a little further
  wheeling: () => ({ id: 'wheeling', w: 2.2, cd: 7, a: { name: 'wheeling', anim: 'cast', dur: 2.4, windup: 0.8, active: 0.85, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => { const a0 = w.rand() * TAU; for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) beamAt(w, e, a0 + i * TAU / 4 + r * 0.38, { warn: 0.5 + r * 0.55, dmg: 20, kind: 'holyfire', len: 16, width: 1.0 }); } } }),
  // a storm of spears across the whole floor
  spearstorm: () => ({ id: 'spearstorm', w: 1.8, cd: 8, a: { name: 'spearstorm', anim: 'raise', dur: 1.5, windup: 0.7, active: 0.75, tele: 'none', dmg: 0, onStrike: (w, e) => { const h = w.hero; for (let i = 0; i < 16; i++) { const a = w.rand() * TAU, r = i < 3 ? w.rand() * 1.5 : 1.5 + w.rand() * 7; spot(w, e, h.x + S(a) * r, h.z + C(a) * r, 1.0, { warn: 0.8 + w.rand() * 1.0, dmg: 18, kind: 'spear' }); } } } }),
  // the halo-blade three times running
  triple: () => ({ id: 'triple', w: 2.4, max: 4.2, a: { ...strike({ name: 'triple', anim: 'haloblade', range: 4.2, arc: deg(240), windup: 0.6, active: 0.75, dur: 2.6, dmg: 22, kb: 6, lunge: 2.2 }), chain: { at: 1.0, windup: 1.3, active: 1.45, lunge: 2.4 } } }),
  // the gate closes: a ring of light rolling in from the arena's edge, a gap in it
  gateclose: () => ({ id: 'gateclose', w: 1.4, cd: 11, run: (w, e) => { e.anim = 'roar'; e.animT = 0; const cx = e.ai.spawnAt ? e.ai.spawnAt.x : e.x, cz = e.ai.spawnAt ? e.ai.spawnAt.z : e.z; for (let i = 0; i < 4; i++) ring(w, e, cx, cz, 13 - i * 2.4, 15 - i * 2.4, { warn: 1.0 + i * 0.5, life: 0.3, dmg: 18, kind: 'holyfire' }); w.emit('shake', { amt: 0.5 }); } }),
};
const seraph = {
  phases: [0.66, 0.33], keep: 3.2, turn: 3.6,
  moves(p) {
    const q = p >= 3 ? 0.88 : 1;
    if (p <= 1) return [SER.haloblade(q), SER.lance(q), SER.featherfall(), SER.dive()];
    if (p === 2) return [SER.haloblade(q), SER.halothrow(q), SER.gale(), SER.judgement(), SER.featherfall()];
    return [SER.triple(), SER.halothrow(q), SER.wheeling(), SER.spearstorm(), SER.gateclose(), SER.gale()];
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
  seraph: { col: 0xffd060, kind: 'radiant', K: 1.25, own: true,
    il: { kind: 'targets', leave: 'fly', banner: 'BREAK THE SIX FEATHERS OF HER HALO', dur: 22, targets: { type: 'bell', n: 6, hp: 70, name: 'Halo feather' }, waves: [[['drownedangel', 1], ['choirwraith', 2]], [['belljelly', 2]]], addsGap: 8, back: { entrance: 'drop' } },
    il2: { kind: 'gauntlet', leave: 'fly', banner: 'THE HALO FALLS', dur: 15, rain: true, back: { entrance: 'drop' } } },
  firstfounder: { col: 0xff7a20, kind: 'fire', status: { burn: 1 }, K: 1.3,
    il: { kind: 'targets', leave: 'climb', banner: 'BREAK THE MOULDS BEFORE THEY POUR', dur: 22, targets: { type: 'mould', n: 4, hp: 90, name: 'Mould' }, waves: [[['homunculus', 3]], [['bronzecopy', 1], ['homunculus', 2]]], addsGap: 8, back: { entrance: 'slam' } },
    il2: { kind: 'gauntlet', leave: 'climb', banner: 'THE BRONZE RIVERS RUN', dur: 15, lanes: true, back: { entrance: 'slam' } } },
});

// PROPOSAL: the Seraph comes down out of the hanging halo, wings folded, lands, and opens all six; the halo
// leaves her head and settles into her hand.
export const ENTRANCES45 = {
  seraph: { kind: 'descend', dur: 3.8, cam: { zoom: 1.05, lift: 2.4 }, script(w, e, t, F, st) {
    st.put(st.home.x, st.home.z);
    if (t < 2.2) { e.leapH = 10 * (1 - (t / 2.2) ** 2); st.anim('dive', 0.5); }
    else { e.leapH = 0; once(st, 'land', () => { w.emit('shake', { amt: 0.9 }); F((fx) => fx.shockRing(st.home.x, st.home.z, 7, [3, 2.6, 1.4], 0.7)); }); st.anim(t < 3.0 ? 'roar' : 'haloblade', t < 3.0 ? (t - 2.2) * 0.9 : (t - 3.0) * 0.6); }
  } },
};
function once(st, key, fn) { if (!st.fired.has(key)) { st.fired.add(key); fn(); } }

export const BOSS_LINES45 = {
  seraph: { intro: 'NONE PASS TO HIM. NONE EVER HAVE.', fall: 'FORGIVE ME... I COULD NOT HOLD THE GATE.' },
  firstfounder: { intro: 'I BOUND A GOD TO SAVE YOU. I WOULD DO IT AGAIN.', fall: 'THEN WAKE HIM... AND MAY HE BE KINDER THAN I.' },
};
export const SPEAKERS45 = { seraph: { name: 'THE LAST SERAPH', color: '#ffe090' }, firstfounder: { name: 'THE FIRST FOUNDER', color: '#ffa050' } };

registerFoes(); bossLooks();
Object.assign(BOSSES2, BOSSES45); Object.assign(BOSS_AI2, BOSS_AI45); Object.assign(ENTRANCES, ENTRANCES45);
for (const k in BOSS_LINES45) if (!BOSS_LINES[k]) BOSS_LINES[k] = BOSS_LINES45[k];
for (const k in SPEAKERS45) if (!SPEAKERS[k]) SPEAKERS[k] = SPEAKERS45[k];
evolveMore();
