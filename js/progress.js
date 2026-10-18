/*
 * Tower of Wishes — injuries after story fights.
 *
 * Rules (decided by the author, see AGENTS.md "No hearts"):
 *  - Losing a fight costs nothing: the team is back on its feet and can retry,
 *    or leave to change gear, earn XP or loot, and come back.
 *  - Winning restores the whole team to full health.
 *  - Withdrawing leaves the team injured; injuries heal over a few minutes.
 *  - Practice and other free modes never touch injuries.
 *
 * Pure functions on a plain save object, so they can be tested in Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TowProgress = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const HEAL_MS = 4 * 60 * 1000; // time to heal from 0% to 100%
  const SURRENDER_FLOOR = 0.1; // a fallen unit leaves at 10%
  const TEAM = ['kael', 'eiryn'];

  function fresh(now) {
    const injury = {};
    for (const id of TEAM) injury[id] = { frac: 1, at: now };
    return { v: 2, injury };
  }

  // Older saves (v1, with hearts) keep their injuries; the hearts are dropped.
  function normalise(save, now) {
    if (!save || (save.v !== 1 && save.v !== 2) || typeof save.injury !== 'object' || !save.injury) return fresh(now);
    delete save.hearts; delete save.heartAt; save.v = 2;
    for (const id of TEAM) if (!save.injury[id]) save.injury[id] = { frac: 1, at: now };
    return save;
  }

  // Anyone without an injury record is at full health.
  function hpFrac(save, id, now) {
    const inj = save.injury[id];
    if (!inj) return 1;
    return Math.min(1, inj.frac + Math.max(0, now - inj.at) / HEAL_MS);
  }

  function fullHealIn(save, id, now) {
    return Math.max(0, (1 - hpFrac(save, id, now)) * HEAL_MS);
  }

  // fracs: { [fighter key]: 0..1 } for everyone who fought, when the match ended.
  function applyResult(save, mode, outcome, fracs, now) {
    if (mode !== 'story') return save;
    const ids = [...new Set([...TEAM, ...Object.keys(save.injury), ...Object.keys(fracs || {})])];
    if (outcome === 'win' || outcome === 'loss') {
      for (const id of ids) save.injury[id] = { frac: 1, at: now };
    } else if (outcome === 'surrender') {
      for (const id of Object.keys(fracs || {}).length ? Object.keys(fracs) : TEAM) {
        const f = fracs && fracs[id] != null ? fracs[id] : 1;
        save.injury[id] = { frac: Math.max(SURRENDER_FLOOR, Math.min(1, f)), at: now };
      }
    }
    return save;
  }

  return { HEAL_MS, TEAM, fresh, normalise, hpFrac, fullHealIn, applyResult };
});
