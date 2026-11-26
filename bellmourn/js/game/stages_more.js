// The Ascent's stages for the bosses that had none (docs/ASCENT_DESIGN.md §3): Act I's eight and the run's five.
// Each gets three stages on its own health thresholds: at the first turn it LEAVES the fight (an interlude from
// interlude.js: break targets, fend off waves, survive a pattern or hunt it as it surfaces) and comes back in
// its second form; at the second turn it changes again (a third form; Saint Silence leaves a second time).
// Every later stage brings moves its first stage never had, themed by the boss (its hazard kind), and an arena
// that keeps changing while that stage lasts (pools, then falling blows). The new form shows on its body
// (view.js: bigger, a ring and halo of the boss's colour, embers in the third). A returning mini-boss (e.mini)
// keeps one stage. Laid over each boss's own AI with bosses4.js evolve(); pure logic, runs in Node.
//
// PROPOSAL: every banner, stage and move below.
import { BOSS_AI } from './ai.js';
import { BOSS_AI2 } from './bosses2.js';
import { evolve, form, beat, nearPt, onFloor, pool, gapRings, sweepLanes, goAway } from './bosses4.js';

const TAU = Math.PI * 2, S = Math.sin, C = Math.cos;
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const spot = (w, e, x, z, r, o) => w.addHazard({ shape: 'circle', x, z, r, warn: o.warn, life: o.life ?? 0.3, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 5, status: o.status });
const ringOut = (w, e, r1, o) => w.addHazard({ shape: 'ring', x: e.x, z: e.z, r0: o.r0 ?? e.r + 0.4, r1, warn: o.warn ?? 0.6, life: o.life ?? 1.0, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: 6, status: o.status });
const mark = (w, e) => w.emit('tele', { e, atk: { name: 'stage' } });

// The table: per boss, its colour (the form look), its hazard kind and status, its power, the interlude at the
// first turn (and for some the second), and its servants.
const T = {
  // ---- Act I
  gaoler: { col: 0xff9a40, kind: 'chain', K: 1.0,
    il: { kind: 'targets', leave: 'fade', banner: 'BREAK THE FOUR LOCK-CHAINS', dur: 20, targets: { type: 'chain', n: 4, hp: 70, name: 'Lock-chain' }, waves: [[['hushed', 3]], [['hushed', 2], ['ghoul', 1]]], addsGap: 7, back: { entrance: 'slam' } } },
  tallow: { col: 0xffc860, kind: 'fire', status: { burn: 1 }, K: 1.0,
    il: { kind: 'targets', leave: 'sink', banner: 'SNUFF THE VOICE-CANDLES', dur: 20, targets: { type: 'candle', n: 4, hp: 60, name: 'Voice-candle' }, waves: [[['ghoul', 2]], [['ghoul', 2]]], addsGap: 8, back: { entrance: 'rise' } } },
  harbormaster: { col: 0x50e0d0, kind: 'water', K: 1.05,
    il: { kind: 'gauntlet', leave: 'sink', banner: 'SURVIVE THE TIDE', dur: 15, waves: [[['drowned', 2]], [['drowned', 2]]], addsGap: 6, tide: true, back: { entrance: 'rise' } } },
  deacon: { col: 0x40ffe0, kind: 'toll', K: 1.05,
    il: { kind: 'gauntlet', leave: 'fade', banner: 'ENDURE THE SERMON', dur: 15, rings: true, back: { entrance: 'drop' } } },
  ossuary: { col: 0xd8ffa0, kind: 'bone', K: 1.1,
    il: { kind: 'targets', leave: 'fade', banner: 'SHATTER THE BONES BEFORE HE RISES', dur: 20, targets: { type: 'bone', n: 5, hp: 55, name: 'Bone pile' }, waves: [[['skeleton', 2]], [['skeleton', 2], ['bonecaster', 1]]], addsGap: 7, back: { entrance: 'rise' } } },
  founder: { col: 0xff7a20, kind: 'fire', status: { burn: 1 }, K: 1.1,
    il: { kind: 'gauntlet', leave: 'climb', banner: 'DODGE THE MOLTEN BRONZE', dur: 15, lanes: true, back: { entrance: 'drop' } } },
  regent: { col: 0xe0c0ff, kind: 'discord', K: 1.1,
    il: { kind: 'chase', leave: 'fade', banner: 'FIND THE REAL REGENT', dur: 20, chase: { hits: 3, surface: 2.0, gap: 0.9, decoys: 3, decoyHp: 1, punish: 12 }, back: { entrance: 'rush' } } },
  silence: { col: 0xf0f0ff, kind: 'bell', status: { silence: 1 }, K: 1.15,
    il: { kind: 'targets', leave: 'fade', banner: 'RING THE THREE BELLS', dur: 22, targets: { type: 'bell', n: 3, hp: 80, name: 'Bell' }, waves: [[['warden', 1], ['hushed', 2]], [['warden', 2]]], addsGap: 8, back: { entrance: 'drop' } },
    il2: { kind: 'waves', leave: 'fly', banner: 'HOLD AGAINST THE OATH-SWORN', dur: 22, waves: [[['warden', 2]], [['warden', 2], ['hushed', 2]], [['warden', 3]]], waveGap: 7, back: { entrance: 'slam' } } },
  // ---- the run's five
  kingcrab: { col: 0xff6a3a, kind: 'water', K: 1.0,
    il: { kind: 'waves', leave: 'sink', banner: 'THE CRABS SWARM FROM THE DEEP', dur: 20, waves: [[['crab', 4]], [['crab', 3], ['drowned', 1]], [['crab', 4]]], waveGap: 6, tide: true, back: { entrance: 'rise' } } },
  hollowmother: { col: 0xc0c8ff, kind: 'limb', K: 1.05,
    il: { kind: 'targets', leave: 'climb', banner: 'LIGHT THE FOUR BRAZIERS', dur: 20, targets: { type: 'lantern', n: 4, hp: 50, name: 'Brazier' }, waves: [[['hushed', 2]], [['ghoul', 2]]], addsGap: 8, limbs: true, back: { entrance: 'drop' } } },
  ronin: { col: 0xff5060, kind: 'iai', K: 1.1,
    il: { kind: 'gauntlet', leave: 'fade', banner: 'SURVIVE THE THOUSAND CUTS', dur: 14, lanes: true, back: { entrance: 'rush' } } },
  smiling: { col: 0xffe0f0, kind: 'grin', K: 1.0,
    il: { kind: 'chase', leave: 'fade', banner: 'FIND THE REAL GUEST', dur: 20, chase: { hits: 3, surface: 1.8, gap: 1.0, decoys: 3, decoyHp: 1, punish: 14 }, back: { entrance: 'rush' } } },
  pyresaint: { col: 0xffa020, kind: 'pyre', status: { burn: 1 }, K: 1.1,
    il: { kind: 'gauntlet', leave: 'fly', banner: 'THE PYRE RAINS FIRE', dur: 15, rain: true, back: { entrance: 'drop' } } },
};

// what the warden must dodge while the boss is away (gauntlets have nothing else to do)
function pattern(e, d) {
  const K = d.K, kind = d.kind, st = d.status, I = d.il2 && e.form >= 2 ? d.il2 : d.il;
  return (w, t) => {
    const h = w.hero; if (!h) return;
    if (I.tide && beat(w, e, 'il_tide', 3.2)) sweepLanes(w, e, { n: 2, gap: 3.0, width: 1.5, warn: 1.0, step: 0.35, dmg: 12 * K, kind });
    if (I.lanes && beat(w, e, 'il_lanes', 2.4)) sweepLanes(w, e, { ang: w.rand() * TAU, n: 2, gap: 2.8, width: 1.2, warn: 0.95, step: 0.3, dmg: 14 * K, kind, status: st });
    if (I.rings && beat(w, e, 'il_rings', 3.0)) { const c = nearPt(w, h.x, h.z, 0, 2, 0) || h; gapRings(w, e, c.x, c.z, { n: 3, r0: 2.4, step: 2.2, warn: 0.9, gapT: 0.45, dmg: 13 * K, kind }); }
    if (I.rain && beat(w, e, 'il_rain', 0.7)) { const q = nearPt(w, h.x, h.z, 0, 4.5, 0); if (q) spot(w, e, q.x, q.z, 1.1, { warn: 1.0, dmg: 13 * K, kind, status: st }); }
    if (I.limbs && beat(w, e, 'il_limb', 1.6)) { const q = nearPt(w, h.x, h.z, 0, 3, 0); if (q) spot(w, e, q.x, q.z, 0.9, { warn: 0.9, dmg: 13 * K, kind }); }
    if (I.kind !== 'gauntlet' && !I.tide && !I.limbs && beat(w, e, 'il_drop', 2.2)) { const q = nearPt(w, h.x, h.z, 0, 3.5, 0); if (q) spot(w, e, q.x, q.z, 1.0, { warn: 1.1, dmg: 11 * K, kind }); }
  };
}

function leave(w, e, d, I, f) {
  return goAway(w, e, { ...I, pattern: pattern(e, d), tier: e.def.tier ?? e.tier ?? 1,
    onReturn: (w2, e2) => { form(w2, e2, f); e2.ai.sig = { id: f >= 3 ? 'st_star' : 'st_quake', until: w2.t + 8 }; ringOut(w2, e2, 8, { warn: 0.4, life: 1.1, dmg: 11 * d.K, kind: d.kind, status: d.status }); } });
}

// the later stages' own moves: a quake of rings with gaps, lanes swept across the floor, then a star of rows,
// blows raining round the warden and novas rolling out
function stageMoves(p, e, base, d) {
  if (p < 2 || e.mini) return base;
  const K = d.K, kind = d.kind, st = d.status;
  const m = base.slice();
  m.push({ id: 'st_quake', w: 2.8, cd: 5.5, a: { name: 'st_quake', anim: 'slam', dur: 1.6, windup: 0.8, active: 0.85, tele: 'circle', shape: 'circle', offset: 0, radius: 2.2, dmg: 16 * K, kb: 7, heavy: true, onStrike: (w, e2) => gapRings(w, e2, e2.x, e2.z, { n: 3, r0: 3.2, step: 2.1, warn: 0.35, gapT: 0.4, dmg: 14 * K, kind, status: st }) } });
  m.push({ id: 'st_lanes', w: 2.6, min: 1.5, cd: 5, a: { name: 'st_lanes', anim: 'roar', dur: 1.5, windup: 0.7, active: 0.75, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => sweepLanes(w, e2, { n: 2, gap: 2.8, width: 1.3, warn: 0.85, step: 0.28, dmg: 15 * K, kind, status: st }) } });
  if (p >= 3) {
    m.push({ id: 'st_star', w: 2.8, cd: 6, a: { name: 'st_star', anim: 'slam', dur: 1.7, windup: 0.85, active: 0.9, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => {
      const a0 = angTo(e2, w.hero) + Math.PI / 8;
      for (let i = 0; i < 8; i++) { const a = a0 + i * TAU / 8; for (let k = 0; k < 7; k++) { const r = 1.8 + k * 1.25; spot(w, e2, e2.x + S(a) * r, e2.z + C(a) * r, 0.75, { warn: 0.55 + k * 0.07, dmg: 15 * K, kind, status: st }); } }
      w.emit('shake', { amt: 0.5 });
    } } });
    m.push({ id: 'st_rain', w: 2.5, min: 2, cd: 4.5, a: { name: 'st_rain', anim: 'roar', dur: 1.3, windup: 0.6, active: 0.65, tele: 'none', dmg: 0, onStrike: (w, e2) => {
      const h = w.hero; for (let i = 0; i < 7; i++) { const a = w.rand() * TAU, r = i === 0 ? 0 : 1.2 + w.rand() * 3.4; spot(w, e2, h.x + S(a) * r, h.z + C(a) * r, 1.0, { warn: 0.9 + i * 0.12, dmg: 14 * K, kind, status: st }); }
    } } });
    m.push({ id: 'st_nova', w: 2.3, cd: 6.5, a: { name: 'st_nova', anim: 'slam', dur: 1.8, windup: 0.8, active: 0.85, tele: 'circle', shape: 'circle', offset: 0, radius: 2.0, dmg: 15 * K, kb: 7, heavy: true, onStrike: (w, e2) => { for (let i = 0; i < 3; i++) ringOut(w, e2, 9, { r0: e2.r + 0.4, warn: 0.3 + i * 0.55, life: 1.0, dmg: 13 * K, kind, status: st }); } } });
  }
  return m;
}

// the arena while a stage lasts: pools that stay (stage two), blows that fall (stage three)
function arena(w, e, d) {
  const h = w.hero; if (!h) return; const K = d.K;
  if (e.form >= 2 && beat(w, e, 'st_pool', 3.4) && onFloor(w, e, d.kind) < 5) { const q = nearPt(w, h.x, h.z, 2.5, 6.5, 0.6); if (q) pool(w, e, q.x, q.z, 1.4, { warn: 1.1, life: 8, dmg: 3 * K, kind: d.kind, status: d.status }); }
  if (e.form >= 3 && beat(w, e, 'st_fall', 1.7)) { const q = nearPt(w, h.x, h.z, 1, 6, 0); if (q) spot(w, e, q.x, q.z, 1.0, { warn: 1.1, dmg: 13 * K, kind: d.kind, status: d.status }); }
}

function stagesFor(type, d) {
  return {
    moves: (p, e, base) => stageMoves(p, e, base, d),
    arena: (w, e) => arena(w, e, d),
    onPhase(w, e, p, base) {
      base(w, e, p); // its own turn first (its servants, its own arena)
      e.formColor = d.col;
      if (p === 2) { leave(w, e, d, d.il, 2); return; }
      if (p === 3) {
        if (d.il2) { leave(w, e, d, d.il2, 3); return; }
        form(w, e, 3); mark(w, e); e.speed = (e.speed || 1) * 1.1; e.ai.sig = { id: 'st_star', until: w.t + 8 };
        ringOut(w, e, 7, { warn: 0.5, life: 1.0, dmg: 10 * d.K, kind: d.kind, status: d.status });
      }
    },
  };
}

export const MORE_STAGES = T;
export function evolveMore() {
  for (const type in T) { const B = BOSS_AI[type] || BOSS_AI2[type]; if (!B) continue; if (Array.isArray(B.phases) && B.phases.length < 2) B.phases = [B.phases[0] || 0.66, Math.min(0.33, (B.phases[0] || 0.66) * 0.5)]; evolve(B, stagesFor(type, T[type])); }
}
try { evolveMore(); } catch (err) { /* bosses2.js merges bosses5.js later; bossPlan calls evolveMore again */ }
