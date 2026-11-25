// Takes for the second trailer set (the full game: Acts II-III, the new bosses, elemental builds, run variants).
// Same harness as takes.js (cap.js). L = 1920x1080, V = 1080x1920.
const L = { w: 1920, h: 1080 }, V = { w: 1080, h: 1920, targetH: 384 };
const arena = { gate: [3, -37.2], market: [-45.4, -31.7], docks: [-0.1, -44.5], nave: [0, -29.3], undercroft: [11.4, -26.9], foundry: [1.2, -50.5], heights: [-2.2, -42.3], belfry: [6.5, -50], frostmarch: [0, -44], abyss: [0, -44] };
// a boss on its own floor: its entrance, then the fight (bossType forces the pool's pick)
function boss(fmt, level, type, hero, o = {}) {
  return { ...fmt, query: `level=${level}&boss=1&bossType=${type}&hero=${hero}&god=1`, dur: o.dur || 10, warm: o.warm ?? 0.1,
    setup: new Function('T', `return (async () => { await T.bot(1, 11); T.follow(${o.zoom || 1.15}); })();`) };
}
// a warden with a build of boons against a pack on an open floor; ult forced at t
function build(fmt, level, hero, boons, packList, o = {}) {
  const [ax, az] = arena[level] || [0, 0];
  const d = { ax, az, boons, packList, zoom: o.zoom || 1.5, ult: o.ult ?? -1, variant: o.variant || '' };
  return { ...fmt, query: `level=${level}&hero=${hero}&god=1${o.variant ? '&variant=' + o.variant : ''}`, dur: o.dur || 6, warm: o.warm ?? 0.6,
    setup: new Function('T', `return (async () => { const d = ${JSON.stringify(d)}; const g = T.G();
      T.noBoss(); T.clear(); if (g.run) { g.run.boons = d.boons.map((id) => ({ id, rarity: 'epic' })); g.refreshHero(); }
      T.place(d.ax, d.az, Math.PI); T.follow(d.zoom); await T.bot(1, 7); T.d = d; T.pack(d.packList, { tier: 3 }); })();`),
    pre: new Function('T', 't', `if (T.d.ult >= 0 && t >= T.d.ult && !T.ulted) { T.ulted = true; T.G().world.meter = 100; }`) };
}
// walking a region or a variant on autoplay
function walk(fmt, level, hero, o = {}) {
  return { ...fmt, query: `level=${level}&hero=${hero}&god=1${o.variant ? '&variant=' + o.variant : ''}`, dur: o.dur || 4, warm: o.warm ?? 1.5,
    setup: new Function('T', `return (async () => { await T.autoplay(5); T.follow(${o.zoom || 1.0}); })();`) };
}
const PACK = [['hushed', 2, -1.5], ['hushed', -2, -1.5], ['ghoul', 0, -3], ['hushed', 2.8, 1], ['hushed', -2.6, 1.2], ['warden', 0, -5], ['hushed', 3.5, -3]];
module.exports = {
  // ------------------------------------------------ 16:9 bosses
  B_kingcrab: boss(L, 'docks', 'kingcrab', 'bellbreaker'),
  B_ronin: boss(L, 'heights', 'ronin', 'warden'),
  B_smiling: boss(L, 'market', 'smiling', 'huntress'),
  B_hollow: boss(L, 'undercroft', 'hollowmother', 'kestrel'),
  B_pyre: boss(L, 'foundry', 'pyresaint', 'hollis'),
  B_frost: boss(L, 'frostmarch', 'frostgiant', 'warden'),
  B_archon: boss(L, 'abyss', 'archon', 'wren'),
  B_wheel: boss(L, 'empyrean', 'wheel', 'warden', { dur: 11 }),
  // ------------------------------------------------ 16:9 regions
  R_frost: walk(L, 'frostmarch', 'warden'), R_dunes: walk(L, 'ashdunes', 'huntress'), R_cata: walk(L, 'catacombs', 'lamplighter'),
  R_abyss: walk(L, 'abyss', 'wren'), R_marsh: walk(L, 'marsh', 'hollis'), R_spire: walk(L, 'spire', 'kestrel'), R_emp: walk(L, 'empyrean', 'warden'),
  // ------------------------------------------------ 16:9 builds (elements)
  X_ember: build(L, 'gate', 'warden', ['ember_edge', 'ember_wake', 'ember_fall', 'ember_wildfire'], PACK, { ult: 3.2 }),
  X_rime: build(L, 'heights', 'kestrel', ['rime_edge', 'rime_step', 'rime_blizzard', 'rime_shatter'], PACK, { ult: 3.0 }),
  X_thunder: build(L, 'foundry', 'wren', ['thunder_edge', 'thunder_fork', 'thunder_tempest', 'thunder_head'], PACK, { ult: 3.0 }),
  X_crimson: build(L, 'undercroft', 'hollis', ['crimson_edge', 'crimson_rush', 'crimson_requiem', 'crimson_hemo'], PACK, { ult: 3.0 }),
  X_dawn: build(L, 'nave', 'lamplighter', ['dawn_edge', 'dawn_sunrise', 'dawn_judge', 'dawn_halo'], PACK, { ult: 3.0 }),
  X_silence: build(L, 'market', 'huntress', ['silence_edge', 'silence_veil', 'silence_hush', 'silence_exec'], PACK, { ult: 3.0 }),
  // ------------------------------------------------ 16:9 variants
  W_blood: walk(L, 'gate', 'warden', { variant: 'gate.bloodmoon' }), W_burn: walk(L, 'foundry', 'bellbreaker', { variant: 'foundry.burning' }), W_frozen: walk(L, 'heights', 'kestrel', { variant: 'heights.frozen' }),
  // ------------------------------------------------ 9:16
  VB_kingcrab: boss(V, 'docks', 'kingcrab', 'bellbreaker', { dur: 7, zoom: 1.0 }),
  VB_ronin: boss(V, 'heights', 'ronin', 'warden', { dur: 7, zoom: 1.0 }),
  VB_smiling: boss(V, 'market', 'smiling', 'huntress', { dur: 7, zoom: 1.0 }),
  VB_hollow: boss(V, 'undercroft', 'hollowmother', 'kestrel', { dur: 7, zoom: 1.0 }),
  VB_pyre: boss(V, 'foundry', 'pyresaint', 'hollis', { dur: 7, zoom: 1.0 }),
  VX_ember: build(V, 'gate', 'warden', ['ember_edge', 'ember_wake', 'ember_fall', 'ember_wildfire'], PACK, { ult: 2.6, dur: 5, zoom: 1.3 }),
  VX_rime: build(V, 'heights', 'kestrel', ['rime_edge', 'rime_step', 'rime_blizzard', 'rime_shatter'], PACK, { ult: 2.4, dur: 5, zoom: 1.3 }),
  VX_thunder: build(V, 'foundry', 'wren', ['thunder_edge', 'thunder_fork', 'thunder_tempest', 'thunder_head'], PACK, { ult: 2.4, dur: 5, zoom: 1.3 }),
  VW_blood: walk(V, 'gate', 'warden', { variant: 'gate.bloodmoon', zoom: 1.0 }), VW_burn: walk(V, 'foundry', 'bellbreaker', { variant: 'foundry.burning', zoom: 1.0 }),
  VW_frozen: walk(V, 'heights', 'kestrel', { variant: 'heights.frozen', zoom: 1.0 }), VW_abyss: walk(V, 'abyss', 'wren', { zoom: 1.0 }),
};
