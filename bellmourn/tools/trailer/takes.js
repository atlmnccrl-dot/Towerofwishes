// Every take the trailers cut from: the real game, staged. L = 1920x1080, V = 1080x1920 (taller buffer).
// The pre/post/setup functions run in the page (see cap.js); T is the page helper.
const L = { w: 1920, h: 1080 }, V = { w: 1080, h: 1920, targetH: 384 };
const arena = { gate: [3, -37.2], market: [-45.4, -31.7], docks: [-0.1, -44.5], nave: [0, -29.3], undercroft: [11.4, -26.9], foundry: [1.2, -50.5], heights: [-2.2, -42.3], belfry: [6.5, -50] };

// a warden in a district's boss floor (the boss kept away), a pack around them, the fighting bot playing
function fight(fmt, level, hero, packList, o = {}) {
  const [ax, az] = arena[level];
  return { ...fmt, query: `level=${level}&hero=${hero}&god=1`, dur: o.dur || 8, warm: o.warm ?? 0.6,
    data: { ax, az, packList, zoom: o.zoom || 1.5, tier: o.tier ?? 2, ult: o.ult, rise: !!o.rise },
    setup: new Function('T', `return (async () => { const d = ${JSON.stringify({ ax, az, packList, zoom: o.zoom || 1.5, tier: o.tier ?? 2, ult: o.ult ?? -1, rise: !!o.rise })};
      T.noBoss(); T.clear(); T.place(d.ax, d.az, Math.PI); T.follow(d.zoom); await T.bot(1, 7); T.d = d; T.pack(d.packList, { tier: d.tier, rise: d.rise }); })();`),
    pre: new Function('T', 't', 'k', `if (T.d.ult >= 0 && t >= T.d.ult && !T.ulted) { T.ulted = true; T.G().world.meter = 100; }`) };
}
// a boss intro and the first seconds of the fight: the game's own boss camera, then the follow camera
function boss(fmt, level, hero, o = {}) {
  return { ...fmt, query: `level=${level}&boss=1&hero=${hero}&god=1`, dur: o.dur || 9, warm: o.warm ?? 0.2,
    setup: new Function('T', `return (async () => { await T.bot(1, 11); T.follow(${o.zoom || 1.25}); })();`) };
}
// walking a district on autoplay, wide
function walk(fmt, level, hero, o = {}) {
  return { ...fmt, query: `level=${level}&hero=${hero}&god=1`, dur: o.dur || 4, warm: o.warm ?? 1.5,
    setup: new Function('T', `return (async () => { await T.autoplay(5); T.follow(${o.zoom || 1.0}); })();`) };
}

module.exports = {
  // ---------------------------------------------------------------- 16:9
  L_establish: { ...L, query: 'level=gate&hero=warden&god=1', dur: 7, warm: 1,
    async setup(T) { T.idle(); T.clear(); T.place(-2.5, 3.5, Math.PI * 0.85); T.cam(4, -6, 0.8); T.sx = 4; T.sz = -6; },
    pre(T, t) { const k = T.ease(t / 6.5); T.cam(T.lerp(4, -2.3, k), T.lerp(-6, 3.2, k), T.lerp(0.8, 1.7, k)); if (Math.abs(t - 2.2) < 0.008) T.bolt(1); } },
  L_rise: { ...L, query: 'level=gate&hero=warden&god=1', dur: 5, warm: 0.3,
    async setup(T) { T.idle(); T.clear(); T.place(0, 0, 0.3); T.follow(1.9); const w = T.G().world, h = T.hero(); T.risen = []; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.4, r = 3 + (i % 2) * 1.2; T.risen.push(w.spawnFoe(i % 3 === 2 ? 'ghoul' : 'hushed', h.x + Math.sin(a) * r, h.z + Math.cos(a) * r, { rise: true, passive: true, tier: 0 })); } },
    pre(T, t) { T.G().debugZoom = T.lerp(1.9, 2.3, T.ease(t / 5)); } },
  L_warden: fight(L, 'gate', 'warden', [['hushed', 3, -2], ['hushed', -3, -2.5], ['ghoul', 0, -4], ['hushed', 4, 1], ['warden', -2, -5], ['hushed', 2.5, -5.5]], { dur: 9, zoom: 1.55 }),
  L_huntress: fight(L, 'docks', 'huntress', [['hound', 5, -3], ['hound', -5, -2], ['hushed', 0, -6], ['spitter', 6, -6], ['hushed', -4, -6]], { dur: 8, zoom: 1.45 }),
  L_bellbreaker: fight(L, 'foundry', 'bellbreaker', [['hushed', 2.5, -2], ['hushed', -2.5, -2], ['brute', 0, -4.5], ['bomber', 5, -5], ['hushed', -3.5, -4], ['sentinel', 3, -6]], { dur: 8, zoom: 1.5 }),
  L_lamplighter: fight(L, 'heights', 'lamplighter', [['knight', 3, -4], ['shade', -4, -3], ['hushed', 0, -6], ['hushed', 5, -1], ['chanter', -5, -6]], { dur: 8, zoom: 1.45 }),
  L_requiem: fight(L, 'nave', 'warden', [['hushed', 2, -1.5], ['hushed', -2, -1.5], ['ghoul', 0, -2.8], ['hushed', 2.8, 1], ['hushed', -2.6, 1.2], ['acolyte', 1, 3], ['ghoul', -1, -3.5], ['hushed', 3.5, -3]], { dur: 6, zoom: 1.6, ult: 1.0, tier: 1 }),
  L_tonic: { ...L, query: 'level=gate&hero=warden', dur: 3.5, warm: 0.4,
    async setup(T) { T.idle(); T.clear(); T.place(0, 0, Math.PI * 0.9); T.cam(0, 0, 2.6); const h = T.hero(); h.hp = Math.round(h.maxHp * 0.42); h.tonics = 3; },
    pre(T, t) { T.extra = Math.abs(t - 0.3) < 0.01 ? { healPressed: true } : {}; const h = T.hero(); T.cam(h.x, h.z, T.lerp(2.6, 2.9, t / 3.5)); } },
  L_haven: { ...L, query: 'level=haven&next=foundry&hero=warden', dur: 8, warm: 0.2,
    async setup(T) { T.idle(); },
    pre(T, t) { if (Math.abs(t - 5.6) < 0.01) { const g = T.G(); if (g.haven && g.haven.react) g.haven.react('temper', true); } } },
  L_gaoler: boss(L, 'gate', 'warden', { dur: 9 }),
  L_tallow: boss(L, 'market', 'huntress', { dur: 9 }),
  L_harbor: boss(L, 'docks', 'bellbreaker', { dur: 9 }),
  L_founder: boss(L, 'foundry', 'bellbreaker', { dur: 9 }),
  L_regent: boss(L, 'heights', 'lamplighter', { dur: 9 }),
  L_silence: boss(L, 'belfry', 'warden', { dur: 10 }),
  L_walk_docks: walk(L, 'docks', 'huntress'),
  L_walk_nave: walk(L, 'nave', 'warden'),
  L_walk_undercroft: walk(L, 'undercroft', 'lamplighter'),
  L_walk_foundry: walk(L, 'foundry', 'bellbreaker'),
  L_walk_heights: walk(L, 'heights', 'warden'),
  L_walk_belfry: walk(L, 'belfry', 'huntress'),
  // ---------------------------------------------------------------- 9:16
  V_warden: fight(V, 'gate', 'warden', [['hushed', 2.5, -2], ['hushed', -2.5, -2.5], ['ghoul', 0, -4], ['hushed', 2, 2], ['warden', -1.5, -5]], { dur: 5, zoom: 1.35 }),
  V_huntress: fight(V, 'docks', 'huntress', [['hound', 4, -3], ['hound', -4, -2], ['hushed', 0, -6], ['spitter', 3, -7]], { dur: 5, zoom: 1.3 }),
  V_bellbreaker: fight(V, 'foundry', 'bellbreaker', [['hushed', 2, -2], ['hushed', -2, -2], ['brute', 0, -4], ['hushed', 2.5, -4.5]], { dur: 5, zoom: 1.35 }),
  V_lamplighter: fight(V, 'heights', 'lamplighter', [['knight', 2, -4], ['shade', -3, -3], ['hushed', 0, -6], ['hushed', 3, -1]], { dur: 5, zoom: 1.3 }),
  V_horde: fight(V, 'gate', 'warden', [['hushed', 2, -1.5], ['hushed', -2, -1.5], ['ghoul', 0, -3], ['hushed', 2.8, 1], ['hushed', -2.6, 1.2], ['crossbow', 1, -6], ['ghoul', -1, -4], ['hushed', 3.5, -3], ['hushed', -3.5, -3.5], ['warden', 0, -5], ['hushed', 1.5, 2.5], ['hushed', -1.5, 2.6]], { dur: 9, zoom: 1.25, ult: 5.0, tier: 1 }),
  V_tonic: { ...V, query: 'level=gate&hero=warden', dur: 3.5, warm: 0.4,
    async setup(T) { T.idle(); T.clear(); T.place(0, 0, Math.PI * 0.9); T.cam(0, 0, 2.2); const h = T.hero(); h.hp = Math.round(h.maxHp * 0.42); h.tonics = 3; },
    pre(T, t) { T.extra = Math.abs(t - 0.3) < 0.01 ? { healPressed: true } : {}; const h = T.hero(); T.cam(h.x, h.z, T.lerp(2.2, 2.5, t / 3.5)); } },
  V_gaoler: boss(V, 'gate', 'warden', { dur: 6, zoom: 1.15 }),
  V_tallow: boss(V, 'market', 'huntress', { dur: 6, zoom: 1.15 }),
  V_regent: boss(V, 'heights', 'lamplighter', { dur: 6, zoom: 1.15 }),
  V_silence: boss(V, 'belfry', 'warden', { dur: 7, zoom: 1.15 }),
  V_establish: { ...V, query: 'level=gate&hero=warden&god=1', dur: 4, warm: 1,
    async setup(T) { T.idle(); T.clear(); T.place(-2.5, 3.5, Math.PI * 0.85); T.cam(3, -5, 0.9); },
    pre(T, t) { const k = T.ease(t / 4); T.cam(T.lerp(3, -2.4, k), T.lerp(-5, 3.3, k), T.lerp(0.9, 1.6, k)); if (Math.abs(t - 1.2) < 0.008) T.bolt(1); } },
};
