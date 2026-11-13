// An autoplayer for tests (and the attract mode): reads the World and returns an input frame.
// skill 0 mashes and walks in; skill 1 also reads telegraphs, dashes out of hazards, parries some
// blows, heals when low, finishes broken foes and uses the Requiem.
import { HERO } from './defs.js';

export function makeBot(skill = 1, seed = 1) {
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const st = { t: 0, lastAtk: 0, holdHeavy: 0, goal: null };
  return function think(w, dt = 1 / 60) {
    st.t += dt; const h = w.hero; const inp = { mx: 0, mz: 0 };
    if (!h || h.dead) return inp;
    const foes = w.foes().filter((f) => f.state !== 'spawn' && !f.hidden);
    // move toward a goal point when there is no fight
    if (!foes.length) { if (st.goal) { const dx = st.goal.x - h.x, dz = st.goal.z - h.z, d = Math.hypot(dx, dz); if (d > 0.6) { inp.mx = dx / d; inp.mz = dz / d; } } return inp; }
    let near = null, nd = 1e9; for (const f of foes) { const d = Math.hypot(f.x - h.x, f.z - h.z) - f.r; if (d < nd) { nd = d; near = f; } }
    const dx = near.x - h.x, dz = near.z - h.z, d = Math.hypot(dx, dz) || 1;
    // threats
    if (skill > 0) {
      for (const f of foes) {
        if (f.state !== 'windup' || !f.atk) continue;
        const left = f.atk.windup - f.t; const fd = Math.hypot(f.x - h.x, f.z - h.z);
        const reach = (f.atk.range || f.atk.radius || 2) + (f.atk.offset || 0) + (f.atk.lunge || 0) * 0.3 + h.r + 0.5;
        if (f.atk.ranged || f.atk.leap) continue;
        if (fd < reach && left < 0.16 && left > 0.02) {
          if (rnd() < 0.4 * skill && !f.atk.heavy) { inp.parryPressed = true; return inp; }
          const away = Math.atan2(h.x - f.x, h.z - f.z) + (rnd() < 0.5 ? 1 : -1) * 0.9;
          inp.mx = Math.sin(away); inp.mz = Math.cos(away); inp.dashPressed = true; return inp;
        }
      }
      for (const z of w.hazards) {
        const left = z.warn - z.t; if (left < -0.05 || left > 0.3) continue;
        const zd = Math.hypot(h.x - z.x, h.z - z.z); let inside = false;
        if (z.shape === 'circle') inside = zd < z.r + h.r + 0.3;
        if (z.shape === 'ring') inside = left < 0.05 && left > -0.05; // dash through the wave front
        if (inside) { const a = Math.atan2(h.x - z.x, h.z - z.z); inp.mx = Math.sin(a); inp.mz = Math.cos(a); inp.dashPressed = true; return inp; }
      }
      for (const z of w.hazards) { if (z.shape !== 'ring' || z.t < z.warn) continue; const k = (z.t - z.warn) / z.life; const rr = z.r0 + (z.r1 - z.r0) * k; const zd = Math.hypot(h.x - z.x, h.z - z.z); if (zd > rr && zd - rr < 1.1 && h.dashCd <= 0) { const a = Math.atan2(z.x - h.x, z.z - h.z); inp.mx = Math.sin(a); inp.mz = Math.cos(a); inp.dashPressed = true; return inp; } }
      for (const p of w.projs) { if (p.team !== 'foe') continue; const pd = Math.hypot(p.x - h.x, p.z - h.z); const closing = (p.vx * (h.x - p.x) + p.vz * (h.z - p.z)) > 0; if (pd < 2.2 && closing) { if (rnd() < 0.5) { inp.parryPressed = true; return inp; } const a = Math.atan2(p.vx, p.vz) + Math.PI / 2; inp.mx = Math.sin(a); inp.mz = Math.cos(a); inp.dashPressed = true; return inp; } }
      if (h.hp < h.maxHp * 0.4 && h.tonics > 0 && nd > 3) { inp.healPressed = true; }
      if (w.meter >= 100 && foes.filter((f) => Math.hypot(f.x - h.x, f.z - h.z) < 6).length >= (foes.some((f) => f.boss) ? 1 : 2)) inp.specialPressed = true;
      // keep out of a winding-up heavy's reach when far enough
    }
    // approach and attack
    const want = 1.4 + near.r;
    if (d > want + 0.2) { inp.mx = dx / d; inp.mz = dz / d; if (skill > 0 && d > 7 && rnd() < 0.02) inp.dashPressed = true; }
    else if (st.t - st.lastAtk > (skill > 0 ? 0.18 : 0.12)) {
      st.lastAtk = st.t;
      if (skill > 0 && near.state === 'stagger') inp.attackPressed = true;
      else if (skill > 0 && near.def && near.def.shield && near.state !== 'stagger' && rnd() < 0.6) { inp.heavyPressed = true; inp.heavyDown = true; st.holdHeavy = 0.5; }
      else inp.attackPressed = true;
    }
    if (st.holdHeavy > 0) { st.holdHeavy -= dt; inp.heavyDown = st.holdHeavy > 0; }
    return inp;
  };
}

export function setBotGoal(bot) { return bot; }
export const HERO_DEF = HERO;
