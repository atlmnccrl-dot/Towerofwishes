/*
 * Tower of Wishes — physical combat animation: attack styles, hit reactions,
 * weapon trails. Pure pose maths; js/render/fighters.js draws the result.
 *
 * Timing is locked to the sim. The sim deals its blow the instant a wind-up
 * ends (u.act.phase flips to 'strike'), so the visual swing is built around
 * that frame:
 *
 *   wind-up   anticipation: the body coils and the weapon is cocked (slow
 *             ease-out), then a short LAUNCH (the last ~0.05–0.11 s) that
 *             accelerates through the swing so the blade reaches the target
 *             on the contact frame;
 *   strike    follow-through: the weapon carries on past the target;
 *   recover   the follow-through holds a beat, then the stance resets.
 *
 * Every attack is picked from a per-weapon style list (a slash, a backhand,
 * an overhead chop, a sweep, a thrust; jab / cross / hook / uppercut / kick
 * for fists; ...), cycling per fighter, so strings of blows are not one
 * motion repeated. Poses are keyframes in body-local metres:
 *   hx fwd, hy right, hz up (the striking hand); wy/wp weapon yaw/pitch;
 *   tw shoulder yaw, hp hip yaw (hips lead, shoulders follow); lean, crouch,
 *   stance, shift (weight transfer, forward), step (lead foot), roll
 *   (sideways tilt), kick (a raised leg); ox/oy/oz the other hand.
 * Spellcasting and the bow are untouched (no styles for them).
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const outC = (k) => 1 - Math.pow(1 - k, 3);
  const outQ = (k) => 1 - (1 - k) * (1 - k);
  const smooth = (k) => k * k * (3 - 2 * k);

  // ------------------------------------------------------------ keyframes
  // Defaults: the ready stance every pose starts from.
  const REST = { hx: 0.38, hy: 0.45, hz: 1.24, wy: 0.75, wp: 0.5, tw: 0, hp: 0, lean: 0, crouch: 0.03, stance: 1, shift: 0, step: 0, roll: 0, kick: 0, ox: 0.26, oy: -0.16, oz: 1.04 };
  const REST_POLE = Object.assign({}, REST, { hx: 0.08, hy: 0.16, hz: 1.07, wy: 0, wp: 0.08 });
  const REST_FIST = Object.assign({}, REST, { hx: 0.4, hy: 0.46, hz: 1.24, ox: 0.32, oy: -0.12, oz: 1.31 });
  const K = (rest, o) => Object.assign({}, rest, o);

  const mk = (rest, tag, k, meta) => {
    const w = K(rest, k.w), c = K(w, k.c), f = K(c, k.f);
    const m = k.m ? K(rest, Object.assign({}, { hx: (w.hx + c.hx) / 2, hy: (w.hy + c.hy) / 2, hz: (w.hz + c.hz) / 2, wy: (w.wy + c.wy) / 2, wp: (w.wp + c.wp) / 2, tw: (w.tw + c.tw) / 2, hp: (w.hp + c.hp) / 2 }, k.m)) : null;
    return Object.assign({ tag, w, m, c, f, usesOff: k.w.ox != null }, meta);
  };

  // --- one-handed blades, clubs and hafts
  const ONE = [
    // a diagonal cut, high on the right to low on the left
    mk(REST, 'fast', {
      w: { hx: -0.02, hy: 0.42, hz: 1.72, wy: 1.35, wp: 1.15, tw: 0.6, hp: 0.3, lean: -0.14, crouch: 0.1, stance: 1.35, shift: -0.1, step: -0.05, roll: 0.06 },
      m: { hx: 0.42, hy: 0.3, hz: 1.45, wy: 0.65, wp: 0.55, tw: 0.05, hp: -0.1, lean: 0.1, crouch: 0.12, shift: 0.05 },
      c: { hx: 0.8, hy: 0, hz: 1.05, wy: -0.05, wp: 0.05, tw: -0.4, hp: -0.35, lean: 0.28, crouch: 0.15, stance: 1.55, shift: 0.2, step: 0.32 },
      f: { hx: 0.42, hy: -0.52, hz: 0.8, wy: -1.65, wp: -0.2, tw: -0.78, hp: -0.55, lean: 0.3, shift: 0.28, step: 0.36 },
    }, { off: 'back' }),
    // a backhand, low on the left to high on the right
    mk(REST, 'fast', {
      w: { hx: 0.3, hy: -0.4, hz: 0.95, wy: -1.6, wp: -0.1, tw: -0.6, hp: -0.3, lean: 0.06, crouch: 0.14, stance: 1.4, shift: -0.04 },
      m: { hx: 0.62, hy: -0.1, hz: 1.0, wy: -0.7, wp: 0.1, tw: -0.15, hp: 0 },
      c: { hx: 0.8, hy: 0.08, hz: 1.2, wy: 0.1, wp: 0.25, tw: 0.3, hp: 0.3, lean: 0.22, crouch: 0.14, stance: 1.55, shift: 0.2, step: 0.3 },
      f: { hx: 0.35, hy: 0.62, hz: 1.5, wy: 1.55, wp: 0.55, tw: 0.8, hp: 0.55, lean: 0.2, shift: 0.25, step: 0.34 },
    }, { off: 'out' }),
    // an overhead chop: committed, the whole body drops into it
    mk(REST, 'slow', {
      w: { hx: 0.02, hy: 0.14, hz: 2.05, wy: 0.25, wp: 1.4, tw: 0.15, lean: -0.2, crouch: 0, stance: 1.3, shift: -0.12, step: -0.05 },
      m: { hx: 0.4, hy: 0.12, hz: 1.8, wy: 0.1, wp: 0.8, lean: 0 },
      c: { hx: 0.88, hy: 0.06, hz: 1.22, wy: 0, wp: -0.02, lean: 0.38, crouch: 0.18, stance: 1.55, shift: 0.3, step: 0.36, tw: -0.15 },
      f: { hx: 0.72, hy: 0.06, hz: 0.78, wy: 0, wp: -0.6, lean: 0.42, crouch: 0.22, shift: 0.34, step: 0.38 },
    }, { off: 'guard' }),
    // a flat sweep: the hips throw it
    mk(REST, 'slow', {
      w: { hx: 0.18, hy: 0.58, hz: 1.3, wy: 1.95, wp: 0.1, tw: 0.75, hp: 0.45, lean: -0.04, crouch: 0.12, stance: 1.45, shift: -0.05 },
      m: { hx: 0.62, hy: 0.3, hz: 1.28, wy: 0.9, wp: 0.1, tw: 0.15, hp: -0.1 },
      c: { hx: 0.82, hy: -0.12, hz: 1.25, wy: -0.25, wp: 0.08, tw: -0.5, hp: -0.45, lean: 0.2, shift: 0.18, step: 0.3 },
      f: { hx: 0.4, hy: -0.66, hz: 1.25, wy: -2, wp: 0.1, tw: -0.9, hp: -0.7, lean: 0.22, shift: 0.22, step: 0.34 },
    }, { off: 'back' }),
    // a thrust: coil, then the whole body drives the point in
    mk(REST, 'fast', {
      w: { hx: 0.04, hy: 0.22, hz: 1.22, wy: 0.12, wp: 0.06, tw: 0.4, hp: 0.25, lean: -0.1, crouch: 0.15, stance: 1.5, shift: -0.1, step: -0.06 },
      c: { hx: 0.98, hy: 0.12, hz: 1.24, wy: 0, wp: 0.04, tw: -0.15, hp: -0.1, lean: 0.32, crouch: 0.2, stance: 1.65, shift: 0.34, step: 0.46 },
      f: { hx: 0.78, hy: 0.12, hz: 1.22, wy: 0, wp: 0.04, lean: 0.28, crouch: 0.18, shift: 0.28, step: 0.42 },
    }, { off: 'back', foot: 'R' }),
  ];

  // --- two-handed heavies (greatsword, greataxe, bell, beam): slow, committed
  const HEAVY = [
    mk(REST, 'slow', {
      w: { hx: -0.1, hy: 0.2, hz: 2.1, wy: 0.15, wp: 1.45, tw: 0.25, hp: 0.12, lean: -0.34, crouch: 0, stance: 1.4, shift: -0.2, step: -0.1 },
      m: { hx: 0.3, hy: 0.15, hz: 1.9, wy: 0.05, wp: 0.85, lean: -0.05, shift: 0 },
      c: { hx: 0.78, hy: 0.1, hz: 1.1, wy: 0, wp: -0.15, tw: -0.12, lean: 0.5, crouch: 0.26, stance: 1.7, shift: 0.38, step: 0.42 },
      f: { hx: 0.74, hy: 0.1, hz: 0.6, wy: 0, wp: -0.7, lean: 0.55, crouch: 0.3, shift: 0.42, step: 0.44 },
    }, { off: 'guard' }),
    mk(REST, 'slow', {
      w: { hx: 0.1, hy: 0.55, hz: 1.35, wy: 2.1, wp: 0.12, tw: 0.95, hp: 0.55, lean: -0.12, crouch: 0.14, stance: 1.5, shift: -0.15 },
      m: { hx: 0.6, hy: 0.3, hz: 1.3, wy: 1, wp: 0.1, tw: 0.2, hp: -0.1 },
      c: { hx: 0.8, hy: -0.1, hz: 1.28, wy: -0.2, wp: 0.08, tw: -0.65, hp: -0.55, lean: 0.26, crouch: 0.2, shift: 0.2, step: 0.34 },
      f: { hx: 0.36, hy: -0.62, hz: 1.28, wy: -2.2, wp: 0.1, tw: -1.05, hp: -0.85, lean: 0.28, shift: 0.24, step: 0.36 },
    }, { off: 'guard' }),
    mk(REST, 'any', {
      w: { hx: 0.4, hy: 0.1, hz: 0.7, wy: 0.2, wp: -0.7, tw: 0.3, lean: 0.2, crouch: 0.28, stance: 1.5, shift: -0.05 },
      c: { hx: 0.78, hy: 0.1, hz: 1.3, wy: 0, wp: 0.35, tw: -0.2, lean: 0.1, crouch: 0.1, shift: 0.25, step: 0.3 },
      f: { hx: 0.3, hy: 0.12, hz: 2, wy: 0.1, wp: 1.3, lean: -0.2, crouch: 0, shift: 0.2, step: 0.3 },
    }, { off: 'guard' }),
  ];

  // --- spears and long spears: the haft drives forward, hips and lead foot behind it
  const POLE = [
    mk(REST_POLE, 'fast', {
      w: { hx: -0.12, hy: 0.18, hz: 1.1, wy: 0, wp: 0.08, tw: 0.3, hp: 0.2, lean: -0.06, crouch: 0.1, stance: 1.5, shift: -0.1, step: -0.05 },
      c: { hx: 0.85, hy: 0.14, hz: 1.12, wy: 0, wp: 0.06, tw: -0.18, hp: -0.1, lean: 0.22, crouch: 0.15, stance: 1.65, shift: 0.28, step: 0.4 },
      f: { hx: 0.65, lean: 0.18, shift: 0.22, step: 0.36 },
    }, { off: 'guard', foot: 'R' }),
    mk(REST_POLE, 'any', {
      w: { hx: -0.3, hy: 0.2, hz: 1, wy: 0, wp: 0.06, tw: 0.5, hp: 0.35, lean: -0.2, crouch: 0.2, stance: 1.6, shift: -0.2, step: -0.12 },
      c: { hx: 1, hy: 0.12, hz: 1.14, wy: 0, wp: 0.05, tw: -0.3, hp: -0.25, lean: 0.4, crouch: 0.26, stance: 1.8, shift: 0.45, step: 0.6 },
      f: { hx: 0.75, lean: 0.34, shift: 0.4, step: 0.55 },
    }, { off: 'guard', foot: 'R' }),
    mk(REST_POLE, 'slow', {
      w: { hx: 0.1, hy: 0.5, hz: 1.2, wy: 1.9, wp: 0.05, tw: 0.8, hp: 0.4, lean: -0.06, crouch: 0.12, stance: 1.5, shift: -0.1 },
      m: { hx: 0.45, hy: 0.25, hz: 1.2, wy: 0.9, wp: 0.05, tw: 0.15, hp: -0.1 },
      c: { hx: 0.7, hy: -0.1, hz: 1.2, wy: -0.2, wp: 0.05, tw: -0.5, hp: -0.4, lean: 0.2, shift: 0.2, step: 0.3 },
      f: { hx: 0.3, hy: -0.5, hz: 1.2, wy: -1.8, wp: 0.05, tw: -0.85, hp: -0.65, lean: 0.22, shift: 0.24, step: 0.34 },
    }, { off: 'guard', sweep: true }),
  ];

  // --- bare hands: the torso and the legs do the work
  const FIST = [
    // a left jab, quick and long
    mk(REST_FIST, 'fast', {
      w: { hx: 0.25, hy: -0.22, hz: 1.3, tw: 0.12, hp: 0.05, crouch: 0.1, stance: 1.45, shift: -0.03, ox: 0.35, oy: 0.3, oz: 1.35 },
      c: { hx: 0.98, hy: -0.12, hz: 1.42, tw: -0.28, hp: -0.15, lean: 0.18, crouch: 0.12, stance: 1.55, shift: 0.22, step: 0.3, ox: 0.3, oy: 0.24, oz: 1.38 },
      f: { hx: 0.6, hy: -0.14, hz: 1.36, tw: -0.15, lean: 0.12, shift: 0.15, step: 0.26, ox: 0.34, oy: 0.28, oz: 1.36 },
    }, { lead: 'L' }),
    // a right cross, thrown from the back foot through the hip
    mk(REST_FIST, 'any', {
      w: { hx: 0, hy: 0.38, hz: 1.28, tw: 0.55, hp: 0.3, lean: -0.08, crouch: 0.12, stance: 1.5, shift: -0.08, step: -0.05, ox: 0.38, oy: -0.1, oz: 1.38 },
      c: { hx: 0.98, hy: 0.04, hz: 1.4, tw: -0.55, hp: -0.45, lean: 0.26, crouch: 0.16, stance: 1.6, shift: 0.26, step: 0.36, ox: 0.2, oy: -0.3, oz: 1.32 },
      f: { hx: 0.65, hy: 0.1, hz: 1.34, tw: -0.7, hp: -0.5, lean: 0.22, shift: 0.22, step: 0.32, ox: 0.25, oy: -0.28, oz: 1.3 },
    }, { lead: 'R' }),
    // a wide hook
    mk(REST_FIST, 'slow', {
      w: { hx: 0.15, hy: 0.7, hz: 1.3, tw: 0.85, hp: 0.5, lean: -0.05, crouch: 0.14, stance: 1.55, shift: -0.06, ox: 0.36, oy: -0.08, oz: 1.38 },
      m: { hx: 0.5, hy: 0.45, hz: 1.35, tw: 0.2, hp: 0 },
      c: { hx: 0.78, hy: -0.18, hz: 1.38, tw: -0.5, hp: -0.45, lean: 0.22, crouch: 0.16, shift: 0.2, step: 0.32, ox: 0.2, oy: -0.28, oz: 1.3 },
      f: { hx: 0.45, hy: -0.5, hz: 1.35, tw: -0.8, hp: -0.6, lean: 0.2, shift: 0.22, step: 0.32, ox: 0.2, oy: -0.28, oz: 1.3 },
    }, { lead: 'R' }),
    // an uppercut from low: the legs drive it up
    mk(REST_FIST, 'slow', {
      w: { hx: 0.2, hy: 0.3, hz: 0.7, tw: 0.3, hp: 0.15, lean: 0.12, crouch: 0.3, stance: 1.55, shift: -0.04, ox: 0.38, oy: -0.1, oz: 1.38 },
      c: { hx: 0.78, hy: 0.08, hz: 1.5, tw: -0.3, hp: -0.25, lean: -0.05, crouch: 0.08, shift: 0.2, step: 0.28, ox: 0.2, oy: -0.28, oz: 1.3 },
      f: { hx: 0.5, hy: 0.1, hz: 1.85, tw: -0.4, lean: -0.16, crouch: 0, shift: 0.22, step: 0.26, ox: 0.2, oy: -0.28, oz: 1.3 },
    }, { lead: 'R' }),
    // a front kick: knee chambered, then the leg snaps out
    mk(REST_FIST, 'any', {
      w: { hx: 0.4, hy: 0.46, hz: 1.24, tw: 0.2, lean: -0.12, crouch: 0.04, stance: 1.2, shift: -0.1, kick: 0.3, ox: 0.3, oy: -0.25, oz: 1.38 },
      c: { hx: 0.4, hy: 0.46, hz: 1.24, tw: -0.1, lean: -0.22, crouch: 0.02, stance: 1.2, shift: 0.1, kick: 1, ox: 0.2, oy: -0.4, oz: 1.3 },
      f: { lean: -0.16, kick: 0.5, shift: 0.1, ox: 0.2, oy: -0.4, oz: 1.3 },
    }, { lead: 'R', kickLeg: true }),
  ];

  // --- paired short blades: the left blade is held reverse-grip
  const TWIN = [
    mk(REST, 'fast', {
      w: { hx: 0.2, hy: 0.5, hz: 1.2, wy: 1.8, wp: 0.05, tw: 0.6, hp: 0.35, lean: 0.04, crouch: 0.18, stance: 1.55, shift: -0.05, ox: 0.15, oy: -0.4, oz: 1.0 },
      c: { hx: 0.62, hy: -0.05, hz: 1.15, wy: -0.3, wp: 0.05, tw: -0.45, hp: -0.4, lean: 0.2, crouch: 0.2, shift: 0.2, step: 0.3, ox: 0.1, oy: -0.5, oz: 1.0 },
      f: { hx: 0.3, hy: -0.5, hz: 1.1, wy: -1.9, tw: -0.8, hp: -0.55, lean: 0.2, shift: 0.24, step: 0.34, ox: 0.1, oy: -0.5, oz: 1.0 },
    }, { lead: 'R' }),
    mk(REST, 'fast', {
      w: { hx: 0.1, hy: -0.55, hz: 1.2, tw: -0.6, hp: -0.35, lean: 0.04, crouch: 0.18, stance: 1.55, shift: -0.05, ox: 0.15, oy: -0.5, oz: 1.2 },
      c: { hx: 0.62, hy: 0.0, hz: 1.2, tw: 0.45, hp: 0.4, lean: 0.2, crouch: 0.2, shift: 0.2, step: 0.3, ox: 0.7, oy: 0.1, oz: 1.15 },
      f: { hx: 0.3, hy: 0.5, hz: 1.1, tw: 0.8, hp: 0.55, lean: 0.2, shift: 0.24, step: 0.34, ox: 0.4, oy: 0.55, oz: 1.1 },
    }, { lead: 'L' }),
    // a lunge low and long
    mk(REST, 'fast', {
      w: { hx: 0.04, hy: 0.22, hz: 1.0, wy: 0.1, wp: 0.05, tw: 0.45, hp: 0.3, lean: -0.06, crouch: 0.25, stance: 1.6, shift: -0.12, step: -0.08, ox: 0.1, oy: -0.45, oz: 1.1 },
      c: { hx: 0.95, hy: 0.1, hz: 1.05, wy: 0, wp: 0.03, tw: -0.2, hp: -0.15, lean: 0.34, crouch: 0.3, stance: 1.75, shift: 0.38, step: 0.5, ox: 0.1, oy: -0.45, oz: 1.1 },
      f: { hx: 0.75, lean: 0.3, shift: 0.32, step: 0.45 },
    }, { lead: 'R', foot: 'R' }),
    // a full spin, both blades
    mk(REST, 'slow', {
      w: { hx: 0.15, hy: 0.55, hz: 1.2, wy: 2.1, wp: 0.05, tw: 1.25, hp: 0.8, lean: 0.02, crouch: 0.2, stance: 1.6, shift: -0.1, ox: 0.2, oy: 0.2, oz: 1.0 },
      m: { hx: 0.5, hy: 0.3, hz: 1.2, wy: 0.9, tw: 0.2, hp: 0 },
      c: { hx: 0.7, hy: -0.1, hz: 1.2, wy: -0.3, wp: 0.05, tw: -0.85, hp: -0.75, lean: 0.18, crouch: 0.22, shift: 0.2, step: 0.3, ox: 0.2, oy: -0.2, oz: 1.0 },
      f: { hx: 0.3, hy: -0.5, hz: 1.15, wy: -2, tw: -1.5, hp: -1.1, lean: 0.2, shift: 0.22, step: 0.34, ox: -0.2, oy: -0.3, oz: 1.0 },
    }, { lead: 'R' }),
  ];

  // --- claws (the Tower's fragments): raking, low, both hands
  const CLAW = [
    mk(REST, 'fast', {
      w: { hx: 0.2, hy: 0.5, hz: 1.4, wy: 1.4, wp: 0.6, tw: 0.55, hp: 0.3, lean: 0.12, crouch: 0.2, stance: 1.5, shift: -0.05 },
      c: { hx: 0.72, hy: -0.15, hz: 0.95, wy: -0.3, wp: -0.2, tw: -0.4, hp: -0.4, lean: 0.34, crouch: 0.26, shift: 0.2, step: 0.3 },
      f: { hx: 0.4, hy: -0.55, hz: 0.8, wy: -1.5, tw: -0.7, lean: 0.34, shift: 0.26, step: 0.34 },
    }, { lead: 'R' }),
    mk(REST, 'fast', {
      w: { hx: 0.2, hy: -0.5, hz: 1.4, tw: -0.55, hp: -0.3, lean: 0.12, crouch: 0.2, stance: 1.5, shift: -0.05, ox: 0.2, oy: -0.5, oz: 1.4 },
      c: { hx: 0.72, hy: 0.15, hz: 0.95, tw: 0.4, hp: 0.4, lean: 0.34, crouch: 0.26, shift: 0.2, step: 0.3, ox: 0.7, oy: 0.15, oz: 0.95 },
      f: { hx: 0.4, hy: 0.55, hz: 0.8, tw: 0.7, lean: 0.34, shift: 0.26, step: 0.34, ox: 0.4, oy: 0.55, oz: 0.8 },
    }, { lead: 'L' }),
  ];

  const FAMILY = {
    sword: ONE, branch: ONE, knife: ONE, cleaver: ONE, cudgel: ONE, hammer: ONE, hexstick: ONE,
    greatsword: HEAVY, greataxe: HEAVY, bell: HEAVY, beam: HEAVY,
    spear: POLE, longspear: POLE, fists: FIST, twin: TWIN, claws: CLAW,
  };
  const REST_OF = (L) => (FAMILY[L.weapon] === POLE ? REST_POLE : FAMILY[L.weapon] === FIST ? REST_FIST : REST);

  // ------------------------------------------------------------ choosing a style
  const mem = new WeakMap(); // unit -> { act, style, n, last }
  const hashId = (id) => { let h = 7; for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) % 997; return h; };

  function styleFor(u, L, a) {
    const list = FAMILY[L.weapon];
    if (!list) return null;
    let m = mem.get(u);
    if (!m) { m = { act: null, style: 0, n: hashId(u.id) }; mem.set(u, m); }
    if (m.act !== a) {
      m.act = a; m.n++;
      // Long wind-ups ask for the heavy cuts; short ones for the quick ones.
      const slow = a.wind > 0.5, fast = a.wind < 0.3;
      const pool = [];
      list.forEach((s, i) => { if (!(slow && s.tag === 'fast' && list.some((q) => q.tag !== 'fast')) && !(fast && s.tag === 'slow' && list.some((q) => q.tag !== 'slow'))) pool.push(i); });
      let i = pool[(m.n * 5 + hashId(u.id)) % pool.length];
      if (i === m.style && pool.length > 1) i = pool[(pool.indexOf(i) + 1) % pool.length];
      // a fist fighter's kick is a rare treat, never the opener
      if (list === FIST && FIST[i].kickLeg && m.n % 3) i = pool.find((j) => !FIST[j].kickLeg) || i;
      m.style = i;
    }
    if (NS.combat && NS.combat.force != null) return list[NS.combat.force % list.length]; // dev: audition a style
    return list[m.style];
  }

  // ------------------------------------------------------------ interpolation
  const F_ALL = ['hx', 'hy', 'hz', 'wy', 'wp', 'tw', 'hp', 'lean', 'crouch', 'stance', 'shift', 'step', 'roll', 'kick', 'ox', 'oy', 'oz'];
  function blend(a, b, k, out) {
    for (const f of F_ALL) {
      const av = a[f], bv = b[f];
      if (av == null && bv == null) continue;
      out[f] = (av == null ? bv : av) + ((bv == null ? av : bv) - (av == null ? bv : av)) * k;
    }
    return out;
  }
  // a quadratic curve through w -> m -> c so the swing arcs instead of cutting a corner
  function arc(w, m, c, k, out) {
    const q = 1 - k;
    for (const f of F_ALL) {
      const wv = w[f], cv = c[f];
      if (wv == null && cv == null) continue;
      const a = wv == null ? cv : wv, b = cv == null ? wv : cv;
      let mv = m && m[f] != null ? m[f] : (a + b) / 2;
      mv = 2 * mv - 0.5 * a - 0.5 * b; // control point so the curve passes through m at k = 0.5
      out[f] = q * q * a + 2 * q * k * mv + k * k * b;
    }
    return out;
  }

  // The pose for a fighter in the middle of an attack, or null (legacy pose).
  function attack(u, L, V) {
    const a = u.act;
    if (!a || u.state !== 'attack') return null;
    const caster = L.weapon === 'glyph' || L.weapon === 'bow' || L.caster || !!L.palms;
    if (caster) return null;
    if (L.bash) return bash(u, a);
    const S = styleFor(u, L, a);
    if (!S) return null;
    const rest = REST_OF(L);
    const o = {};
    let ph = 'wind', e = 0;
    if (a.phase === 'windup' || a.phase === 'feint') {
      const wind = Math.max(0.05, a.wind);
      const launch = clamp(wind * 0.4, 0.05, 0.11);
      const ta = Math.max(0.01, wind - launch);
      if (a.phase === 'feint') {
        // held at the top of the wind-up, trembling like a loaded spring
        blend(S.w, S.w, 0, o);
        o.hz += Math.sin(a.t * 70) * 0.012; o.hy += Math.sin(a.t * 55) * 0.01;
      } else if (a.t < ta) {
        const k = outC(clamp(a.t / ta, 0, 1));
        blend(rest, S.w, k, o);
        // a little extra coil at the very top of the wind-up
        o.tw += Math.sin(clamp(a.t / ta, 0, 1) * Math.PI) * 0.04 * Math.sign(S.w.tw || 1);
      } else {
        // LAUNCH: accelerate through the swing; contact lands as the phase flips
        const k = clamp((a.t - ta) / launch, 0, 1);
        arc(S.w, S.m, S.c, Math.pow(k, 2.1), o);
        ph = 'launch'; e = k;
      }
    } else if (a.phase === 'strike') {
      // follow-through: the weapon carries on past the target
      const k = outQ(clamp(a.t / Math.max(0.05, a.A.active + 0.05), 0, 1));
      blend(S.c, S.f, k, o);
      ph = 'strike'; e = k;
    } else {
      // hold the follow-through a beat, then settle back to the guard
      const rec = Math.max(0.05, a.A.recover);
      const hold = Math.min(0.1, rec * 0.25);
      const k = a.t < hold ? 0 : smooth(clamp((a.t - hold) / Math.max(0.05, rec - hold), 0, 1));
      blend(S.f, rest, k, o);
      ph = 'rec'; e = k;
    }
    const lead = S.lead || 'R';
    return { style: S, ph, e, lead, o, off: S.off || 'guard', kick: !!S.kickLeg };
  }

  // How far through the gliding step toward the target the fighter is (0..1),
  // for the last moments of the wind-up: the sim moves a lunging fighter in
  // one jump on the contact frame, so the picture glides there first.
  function lunge(u) {
    const a = u.act;
    if (!a || u.state !== 'attack' || a.phase !== 'windup' || a.fake) return 0;
    const wind = Math.max(0.05, a.wind), launch = clamp(wind * 0.4, 0.05, 0.11), ta = Math.max(0.01, wind - launch);
    return a.t < ta ? 0 : smooth(clamp((a.t - ta) / launch, 0, 1));
  }

  // A shield bash: the shoulder and the whole weight go behind the shield.
  function bash(u, a) {
    const o = { shift: 0, step: 0, tw: 0, hp: 0, lean: 0 };
    let ph = 'wind', e = 0;
    if (a.phase === 'windup' || a.phase === 'feint') {
      const k = a.phase === 'feint' ? 1 : outC(clamp(a.t / Math.max(0.05, a.wind), 0, 1));
      o.shift = -0.14 * k; o.step = -0.1 * k; o.tw = 0.3 * k; o.hp = 0.15 * k; o.lean = -0.06 * k;
    } else if (a.phase === 'strike') {
      const k = outQ(clamp(a.t / Math.max(0.05, a.A.active + 0.05), 0, 1));
      o.shift = -0.14 + 0.5 * k; o.step = -0.1 + 0.5 * k; o.tw = 0.3 - 0.5 * k; o.hp = 0.15 - 0.3 * k; o.lean = 0.2 * k;
      ph = 'strike'; e = k;
    } else {
      const k = smooth(clamp(a.t / Math.max(0.05, a.A.recover), 0, 1));
      o.shift = 0.36 * (1 - k); o.step = 0.4 * (1 - k); o.tw = -0.2 * (1 - k); o.hp = -0.15 * (1 - k); o.lean = 0.2 * (1 - k);
      ph = 'rec'; e = k;
    }
    return { bash: true, ph, e, o };
  }

  // ------------------------------------------------------------ reactions
  // A visual kick per fighter when a blow lands (or is turned aside); the
  // pose reads its decay. Direction is the way the blow pushes, in the world.
  const kicks = new WeakMap();
  function noteEvents(s) {
    for (const e of s.fx) {
      if ((e.type === 'hit' || e.type === 'parry' || e.type === 'dodge') && e.v) {
        const v = s.byId[e.v], a = e.u && s.byId[e.u];
        if (!v) continue;
        let dx = 0, dy = 0;
        if (a) { dx = v.x - a.x; dy = v.y - a.y; } else { dx = Math.cos(v.facing + Math.PI); dy = Math.sin(v.facing + Math.PI); }
        const l = Math.hypot(dx, dy) || 1;
        const amp = e.type === 'hit' ? clamp((e.dmg || 10) / 16, 0.5, 1.8) : e.type === 'parry' ? 0.8 : 0.3;
        kicks.set(v, { t: 0, dx: dx / l, dy: dy / l, amp, type: e.type });
      }
    }
  }
  function tick(s, dt) { for (const u of s.units) { const k = kicks.get(u); if (k) k.t += dt; } }

  // Pose extras for a fighter who has been hit, is staggering, falling,
  // dodging or blocking. Returns { o: {...}, patch: {legacy fields} } or null.
  function react(u, L, V) {
    const k = kicks.get(u);
    const f = u.facing;
    const lc = Math.cos(f), ls = Math.sin(f);
    const loc = (dx, dy) => ({ fwd: dx * lc + dy * ls, side: -dx * ls + dy * lc });
    switch (u.state) {
      case 'hurt': case 'stagger': {
        // the blow's direction decides which way the body folds
        let fwd = -1, side = 0, amp = 1, t = u.st;
        if (k && k.type === 'hit') { const d = loc(k.dx, k.dy); fwd = d.fwd; side = d.side; amp = k.amp; t = k.t; }
        else if (u.kx || u.ky) { const m = Math.hypot(u.kx, u.ky) || 1; const d = loc(u.kx / m, u.ky / m); fwd = d.fwd; side = d.side; }
        const snap = Math.exp(-t * 9) * amp;
        const o = { shift: fwd * 0.2 * snap, lean: fwd * 0.42 * snap, roll: side * 0.3 * snap, tw: -side * 0.35 * snap + fwd * 0.1 * snap, hp: -side * 0.15 * snap, hd: fwd * 0.16 * snap, crouch: 0.05 + 0.1 * snap };
        if (u.state === 'stagger') {
          // stumbling: a foot goes back to catch the weight, the body sways
          const kk = u.dur ? clamp(u.st / u.dur, 0, 1) : 0;
          o.step = -0.3 * Math.sin(kk * Math.PI) - 0.08;
          o.shift += fwd * 0.12 * (1 - kk) + Math.sin(u.st * 16) * 0.025;
          o.crouch = 0.1 + 0.08 * Math.sin(kk * Math.PI);
          o.lean += fwd * 0.18 * (1 - kk);
        }
        return { o, patch: { lean: 0, off: 'flail' }, snap };
      }
      case 'down': {
        // the fall, before the body is on the ground
        const kk = clamp(u.st / 0.22, 0, 1);
        if (kk >= 1) return null;
        let fwd = -1;
        if (k && k.type === 'hit') fwd = loc(k.dx, k.dy).fwd; else if (u.kx || u.ky) fwd = loc(u.kx, u.ky).fwd;
        const dir = fwd >= 0 ? 1 : -1;
        const e = kk * kk;
        return { o: { shift: dir * 0.5 * e, lean: dir * 0.9 * e, crouch: 0.1 + 0.3 * e, hd: dir * 0.2 * e, step: -0.15 * e }, patch: { off: 'flail' } };
      }
      case 'dodge': {
        // low and away: the body tilts into the roll, the lead foot reaches
        const d = loc(Math.cos(u.dodgeDir || 0), Math.sin(u.dodgeDir || 0));
        const kk = clamp(u.st / Math.max(0.1, u.dur || 0.45), 0, 1);
        const e = Math.sin(Math.min(1, kk * 1.6) * Math.PI * 0.5) * (1 - 0.5 * kk);
        return { o: { shift: d.fwd * 0.3 * e, roll: d.side * 0.34 * e, lean: d.fwd * 0.25 * e, tw: d.side * 0.25 * e, crouch: 0.26 * e + 0.08, step: Math.abs(d.fwd) * 0.12 * e, fx: d.fwd, fy: d.side }, patch: { off: 'out', stance: 1.7 } };
      }
      case 'parry': {
        // braced side-on; a clash shoves the defender back a step
        let rec = 0;
        if (k && k.type === 'parry') rec = Math.exp(-k.t * 12) * k.amp;
        const kk = clamp(u.st / Math.max(0.1, u.dur || 0.34), 0, 1);
        return { o: { tw: 0.45, hp: 0.2, shift: -0.1 - 0.16 * rec, lean: -0.08 - 0.12 * rec, crouch: 0.12 + 0.05 * rec, step: -0.1 * rec - 0.05 * kk }, patch: {} };
      }
    }
    return null;
  }

  // ------------------------------------------------------------ trails
  // The weapon tip's path, for the swing ribbon (drawn by fx.js).
  const trails = new WeakMap();
  function trailPush(u, p, time, on) {
    let t = trails.get(u);
    if (!t) { t = { pts: [] }; trails.set(u, t); }
    const pts = t.pts;
    if (on && p) {
      const last = pts[pts.length - 1];
      if (last && Math.abs(last.t - time) < 1e-4) { last.x = p.x; last.y = p.y; last.z = p.z; } else pts.push({ x: p.x, y: p.y, z: p.z, t: time });
    }
    while (pts.length && time - pts[0].t > 0.2) pts.shift();
    if (pts.length > 24) pts.shift();
  }
  const trailOf = (u) => { const t = trails.get(u); return t && t.pts.length > 1 ? t.pts : null; };

  NS.combat = { attack, lunge, react, noteEvents, tick, trailPush, trailOf, REST, styles: FAMILY };
})();
