// An autoplayer for tests (and the attract mode): reads the World and returns an input frame.
// skill 0 mashes attack and walks in; skill 1 also reads telegraphs and hazards, dashes out of them,
// heals when low and uses the ultimate. It presses attack, dash, ult and tonic only: the abilities go off
// by themselves when an attack is pressed (sim.js).

export function makeBot(skill = 1, seed = 1) {
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const st = { t: 0, lastAtk: 0, goal: null };
  return function think(w, dt = 1 / 60) {
    st.t += dt; const h = w.hero; const inp = { mx: 0, mz: 0 };
    if (!h || h.dead) return inp;
    const ranged = h.kit && h.kit.attack.kind === 'shoot';
    const foes = w.foes().filter((f) => f.state !== 'spawn' && !f.hidden);
    if (!foes.length) { if (st.goal) { const dx = st.goal.x - h.x, dz = st.goal.z - h.z, d = Math.hypot(dx, dz); if (d > 0.6) { inp.mx = dx / d; inp.mz = dz / d; } } return inp; }
    let near = null, nd = 1e9; for (const f of foes) { const d = Math.hypot(f.x - h.x, f.z - h.z) - f.r; if (d < nd) { nd = d; near = f; } }
    const dx = near.x - h.x, dz = near.z - h.z, d = Math.hypot(dx, dz) || 1;
    const dashAway = (from, side = 1) => { const a = Math.atan2(h.x - from.x, h.z - from.z) + side * (rnd() < 0.5 ? 1 : -1) * 0.9; inp.mx = Math.sin(a); inp.mz = Math.cos(a); inp.dashPressed = true; return inp; };
    if (skill > 0 && h.dashCharges > 0) {
      for (const f of foes) {
        if (f.state !== 'windup' || !f.atk || f.atk.ranged) continue;
        const left = f.atk.windup - f.t; const fd = Math.hypot(f.x - h.x, f.z - h.z);
        const reach = (f.atk.range || f.atk.radius || 2) + (f.atk.offset || 0) + (f.atk.lunge || 0) * 0.3 + h.r + 0.5;
        if (f.atk.leap) { const at = f.tele && f.tele.at; if (at && Math.hypot(at.x - h.x, at.z - h.z) < (f.atk.radius || 2.5) + 0.8 && f.t > f.atk.windup + 0.2) return dashAway(at, 0); continue; }
        if (fd < reach && left < 0.16 && left > 0.02) return dashAway(f);
      }
      for (const z of w.hazards) {
        const left = z.warn - z.t; if (left < -0.05 || left > 0.3) continue;
        const zd = Math.hypot(h.x - z.x, h.z - z.z);
        if (z.shape === 'circle' && zd < z.r + h.r + 0.3) return dashAway(z, 0);
        if (z.shape === 'ring' && left < 0.05) { inp.dashPressed = true; return inp; }
        if (z.shape === 'line') { const fx = Math.sin(z.face), fz = Math.cos(z.face); const dx = h.x - z.x, dz = h.z - z.z; const al = dx * fx + dz * fz, lat = dx * fz - dz * fx; if (al > -0.5 && al < z.len + 0.5 && Math.abs(lat) < z.width / 2 + h.r + 0.4) { const side = lat >= 0 ? 1 : -1; inp.mx = fz * side; inp.mz = -fx * side; inp.dashPressed = true; return inp; } }
      }
      for (const z of w.hazards) { if (z.shape !== 'ring' || z.t < z.warn) continue; const k = (z.t - z.warn) / z.life; const rr = z.r0 + (z.r1 - z.r0) * k; const zd = Math.hypot(h.x - z.x, h.z - z.z); if (zd > rr && zd - rr < 1.1) { const a = Math.atan2(z.x - h.x, z.z - h.z); inp.mx = Math.sin(a); inp.mz = Math.cos(a); inp.dashPressed = true; return inp; } }
      for (const p of w.projs) { if (p.team !== 'foe' || p.lob) continue; const pd = Math.hypot(p.x - h.x, p.z - h.z); const closing = (p.vx * (h.x - p.x) + p.vz * (h.z - p.z)) > 0; if (pd < 2.2 && closing) { const a = Math.atan2(p.vx, p.vz) + Math.PI / 2; inp.mx = Math.sin(a); inp.mz = Math.cos(a); inp.dashPressed = true; return inp; } }
    }
    if (skill > 0) {
      if (h.hp < h.maxHp * 0.4 && h.tonics > 0 && nd > 3) inp.healPressed = true;
      const crowd = foes.filter((f) => Math.hypot(f.x - h.x, f.z - h.z) < 6).length;
      if (w.meter >= 100 && (crowd >= 2 || foes.some((f) => f.boss))) inp.ultPressed = true;
    }
    // approach and attack (archers keep their distance)
    const want = ranged ? 5.5 : 1.4 + near.r;
    if (ranged) {
      if (d > want + 2) { inp.mx = dx / d; inp.mz = dz / d; } else if (d < want - 2.5) { inp.mx = -dx / d; inp.mz = -dz / d; }
      // a wall between: step around it instead of shooting the stones
      if (!w.clear(h, near)) { if (!st.side || rnd() < 0.004) st.side = rnd() < 0.5 ? 1 : -1; const a = Math.atan2(dx, dz) + st.side * 1.2; inp.mx = Math.sin(a); inp.mz = Math.cos(a); }
      inp.attackDown = true; if (st.t - st.lastAtk > 0.2) { st.lastAtk = st.t; inp.attackPressed = true; }
    } else if (d > want + 0.2) { inp.mx = dx / d; inp.mz = dz / d; }
    else if (st.t - st.lastAtk > (skill > 0 ? 0.18 : 0.12)) { st.lastAtk = st.t; inp.attackPressed = true; }
    return inp;
  };
}
