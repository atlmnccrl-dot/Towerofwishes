/*
 * Tower of Wishes — hearts and injuries (prototype 0.1)
 *
 * Rules (decided by the author, see docs/DESIGN.md §Hearts):
 *  - Up to 5 hearts. One refills every 8 minutes.
 *  - A story match costs a heart only if the whole team falls.
 *  - Winning restores the whole team to full health.
 *  - Surrendering never costs a heart; the team leaves injured and heals
 *    over time, faster than a heart refills.
 *  - Practice and other free modes never touch hearts or injuries.
 *
 * Pure functions on a plain save object, so they can be tested in Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TowProgress = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const HEART_MAX = 5;
  const HEART_MS = 8 * 60 * 1000;
  const HEAL_MS = 4 * 60 * 1000; // time to heal from 0% to 100%
  const SURRENDER_FLOOR = 0.1; // a fallen unit leaves at 10%
  const TEAM = ['kael', 'eiryn'];

  function fresh(now) {
    const injury = {};
    for (const id of TEAM) injury[id] = { frac: 1, at: now };
    return { v: 1, hearts: HEART_MAX, heartAt: now, injury };
  }

  function normalise(save, now) {
    if (!save || save.v !== 1 || typeof save.hearts !== 'number') return fresh(now);
    for (const id of TEAM) if (!save.injury || !save.injury[id]) { save.injury = save.injury || {}; save.injury[id] = { frac: 1, at: now }; }
    return save;
  }

  // Refill hearts for the time that has passed.
  function tick(save, now) {
    if (save.hearts >= HEART_MAX) { save.hearts = HEART_MAX; save.heartAt = now; return save; }
    const n = Math.floor((now - save.heartAt) / HEART_MS);
    if (n > 0) {
      save.hearts = Math.min(HEART_MAX, save.hearts + n);
      save.heartAt = save.hearts >= HEART_MAX ? now : save.heartAt + n * HEART_MS;
    }
    return save;
  }

  function nextHeartIn(save, now) {
    if (save.hearts >= HEART_MAX) return 0;
    return Math.max(0, HEART_MS - (now - save.heartAt));
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

  function canStartStory(save) { return save.hearts > 0; }

  // fracs: { [fighter key]: 0..1 } for everyone who fought, when the match ended.
  function applyResult(save, mode, outcome, fracs, now) {
    if (mode !== 'story') return save;
    tick(save, now);
    const ids = [...new Set([...TEAM, ...Object.keys(save.injury), ...Object.keys(fracs || {})])];
    if (outcome === 'win') {
      for (const id of ids) save.injury[id] = { frac: 1, at: now };
    } else if (outcome === 'loss') {
      if (save.hearts >= HEART_MAX) save.heartAt = now;
      save.hearts = Math.max(0, save.hearts - 1);
      for (const id of ids) save.injury[id] = { frac: 1, at: now };
    } else if (outcome === 'surrender') {
      for (const id of Object.keys(fracs || {}).length ? Object.keys(fracs) : TEAM) {
        const f = fracs && fracs[id] != null ? fracs[id] : 1;
        save.injury[id] = { frac: Math.max(SURRENDER_FLOOR, Math.min(1, f)), at: now };
      }
    }
    return save;
  }

  return { HEART_MAX, HEART_MS, HEAL_MS, TEAM, fresh, normalise, tick, nextHeartIn, hpFrac, fullHealIn, canStartStory, applyResult };
});
