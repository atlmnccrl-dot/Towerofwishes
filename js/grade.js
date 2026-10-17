/*
 * Tower of Wishes — fight grades. Pure: turns a finished match into a rank
 * (S, A, B, C, D) and a few words on why, so a win has something to chase.
 * Points are a Proposal. Only wins are graded.
 *
 *   TowGrade.grade(match) -> { rank, score, notes: [string] } | null
 *   TowGrade.better(a, b) -> true when rank a beats rank b
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TowGrade = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RANKS = ['D', 'C', 'B', 'A', 'S'];
  const CUT = { S: 80, A: 65, B: 50, C: 35 };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  function grade(m) {
    if (!m || !m.result || m.result.outcome !== 'win') return null;
    const heroes = m.units.filter((u) => u.team === 'hero' && !u.guest);
    if (!heroes.length) return null;
    const st = m.stats, t = m.result.time;
    const frac = heroes.reduce((a, u) => a + (u.state === 'out' ? 0 : clamp(u.hp / u.maxHp, 0, 1)), 0) / heroes.length;
    const down = heroes.filter((u) => u.state === 'out').length;
    const health = frac * 35;
    const flawless = Math.max(0, 15 - 7 * down);
    const speed = clamp((100 - t) / 70, 0, 1) * 20;
    const skillRaw = st.parries * 2 + st.dodges * 1.5 + st.feintsRead * 3;
    const skill = Math.min(15, skillRaw);
    const heavy = st.supers > 0 ? 5 : 0;
    const allOut = m.allOut && m.allOut.uses > 0 ? 5 : 0;
    const score = Math.round(health + flawless + speed + skill + heavy + allOut);
    const rank = score >= CUT.S ? 'S' : score >= CUT.A ? 'A' : score >= CUT.B ? 'B' : score >= CUT.C ? 'C' : 'D';
    const notes = [];
    if (down === 0) notes.push('Nobody fell');
    if (frac > 0.9) notes.push('Barely scratched');
    if (t < 35) notes.push('Over fast');
    if (skillRaw >= 10) notes.push('Sharp reflexes');
    if (st.supers > 0) notes.push('Heavy art landed');
    if (allOut) notes.push('All Out well timed');
    if (!notes.length) notes.push('A hard-won fight');
    return { rank, score, notes: notes.slice(0, 3) };
  }

  const better = (a, b) => RANKS.indexOf(a) > RANKS.indexOf(b || 'none');

  return { grade, better, RANKS, CUT };
});
