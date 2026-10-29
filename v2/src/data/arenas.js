// The battle arenas and cutscene sets, built by hand: the ground (painted by render/terrain.js from the
// tile textures), water and roads, a backdrop behind the field, low things in front of it, light and
// weather. Distances in metres: the field runs x -8.5..8.5 and y -3.7..3.7 (y grows toward the camera);
// the backdrop stands at y < -4.2 and the foreground at y > 4.3. Sprites: 'w:' world atlas, 't:' tiles.
// A prop is [sprite, x, y, scale, flip]. (Proposal: the author may restage any of it.)

// a row of sprites along the back or the front, spaced and varied (seeded so it never changes)
function row(list, x0, x1, y, step, k = 1, jitter = 0.6, seed = 1) {
  const out = []; let r = seed;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (let x = x0; x <= x1; x += step * (0.8 + rnd() * 0.4)) out.push([list[Math.floor(rnd() * list.length)], x + (rnd() - 0.5) * jitter, y + (rnd() - 0.5) * jitter, k * (0.9 + rnd() * 0.2), rnd() < 0.5]);
  return out;
}

export const ARENAS = {
  // the Thornwick Road: a meadow crossed by the road, a stream and a plank bridge behind, a farm fence
  meadow: {
    ground: { base: ['t_grass_1', 't_grass_2'], patches: [{ tex: ['t_grass_flowers_yellow'], amount: 0.08, size: 26 }, { tex: ['t_grass_dark_1'], amount: 0.2, size: 60 }],
      water: { tex: 't_water_1', rim: '#d9c98e', outline: '#2c4c58' }, road: ['t_dirt_1', 't_dirt_2'], edge: '#4f3c26' },
    rivers: [{ pts: [[-16, -5.4], [-6, -5.0], [4, -5.6], [16, -5.1]], w: 1.4 }],
    roads: [{ pts: [[-16, 0.4], [-6, 0.1], [6, 0.5], [16, 0.2]], w: 2.6 }, { pts: [[-2.5, 0.2], [-2.8, -8]], w: 1.6 }],
    props: [
      ...row(['t:tree_a', 't:tree_b', 't:tree_c', 't:tree_young'], -15, 15, -5.7, 2.6, 1, 0.8, 3),
      ['w:t_bridge_v', -2.7, -4.3, 2.4], ['w:prop_signpost', -4.2, -4.3, 2], ['w:prop_fence_post', 5, -4.3, 2], ['w:prop_fence_h', 6.2, -4.3, 2], ['w:prop_fence_h', 7.8, -4.3, 2], ['w:prop_fence_post', 9, -4.3, 2],
      ['w:prop_haystack', 10.5, -4.3, 2], ['w:animal_sheep', 12, -4.3, 2],
      ...row(['w:plant_bush_green', 'w:plant_bush_flowering', 'w:nat_rock_grey', 'w:plant_flower_yellow'], -14, 14, 4.5, 2.4, 2, 0.8, 5),
    ],
    light: { tint: [255, 214, 150, 0.08], vignette: 0.35, rays: true }, weather: 'leaves',
  },
  // the Greyfen: dark mire, black pools, dead trees and reeds, low fog
  fen: {
    ground: { base: ['t_grass_dark_1'], patches: [{ tex: ['t_dirt_dark'], amount: 0.35, size: 40 }, { tex: ['t_grass_dark_2'], amount: 0.25, size: 50 }],
      water: { tex: 't_water_2', rim: '#5a6a40', outline: '#16302c' }, road: ['t_dirt_dark'], edge: '#262418', tint: [40, 80, 70, 0.14] },
    lakes: [{ x: -10.5, y: 5.6, rx: 3.2, ry: 1.2 }, { x: 9.5, y: -5.6, rx: 4.5, ry: 1.3 }, { x: -4, y: -6.2, rx: 2.4, ry: 0.8 }],
    roads: [{ pts: [[-16, 0.2], [0, -0.2], [16, 0.4]], w: 2.2 }],
    props: [
      ...row(['t:tree_gnarled', 't:tree_dark_a', 't:tree_dark_b', 'w:tdf_24'], -15, 15, -6.0, 2.4, 1, 0.8, 7),
      ...row(['w:plant_reeds', 'w:tdf_14', 'w:tdf_15', 'w:plant_reeds'], -14, 14, -4.3, 1.4, 2, 0.6, 9),
      ...row(['w:plant_reeds', 'w:plant_reeds', 'w:nat_fallen_log', 'w:plant_mushroom_purple'], -14, 14, 4.5, 3.2, 2, 0.7, 11),
      ['w:plant_lily_pad', 9, -4.3, 2], ['w:plant_lily_pad', 10.6, -4.6, 2], ['w:plant_lily_pad', -10, 5.6, 2],
    ],
    light: { tint: [70, 120, 100, 0.16], vignette: 0.55, fog: 0.5 }, weather: 'fireflies',
  },
  // Saltreach: sand, an oasis pool and palms, a sandstone tower and hall behind
  dunes: {
    ground: { base: ['t_d_sand'], patches: [{ tex: ['t_d_dirt'], amount: 0.25, size: 50 }], water: { tex: 't_d_water', rim: '#f2d48a', outline: '#3a7a74' }, road: ['t_d_dirt'], edge: '#9a6a34' },
    lakes: [{ x: -9, y: -5.8, rx: 3.6, ry: 1.1 }],
    roads: [{ pts: [[-16, 0.6], [16, -0.2]], w: 2.4 }],
    props: [
      ['w:desert_7', 4, -5.2, 1.6], ['w:desert_6', 9.5, -5.0, 1.6], ['w:desert_8', -2, -5.4, 1.5],
      ['w:desert_4', -11.5, -4.8, 1.7], ['w:desert_5', -7, -5.4, 1.8], ['w:desert_4', -13.5, -4.3, 1.5, true], ['w:desert_5', 13.5, -4.3, 1.7, true],
      ['w:desert_0', 1, -4.3, 1.2], ['w:desert_3', 12, -4.3, 1.5],
      ...row(['w:desert_1', 'w:desert_13', 'w:desert_11', 'w:nat_rock_brown', 'w:desert_14'], -14, 14, 4.5, 3.2, 1.4, 0.7, 13),
    ],
    light: { tint: [255, 190, 110, 0.12], vignette: 0.3, rays: true, haze: true }, weather: null,
  },
  // the Sunken Abbey: mossy flagstones, a broken wall with an arch behind, pillars, statues, autumn trees
  abbey: {
    ground: { base: ['t_flagstone_mossy'], patches: [{ tex: ['t_grass_autumn'], amount: 0.35, size: 40 }, { tex: ['t_cobble_mossy'], amount: 0.2, size: 50 }],
      water: { tex: 't_water_1', rim: '#c8b98a', outline: '#2a4a56' }, road: ['t_cobble_mossy'], edge: '#3a3a30' },
    lakes: [{ x: 11.5, y: 5.6, rx: 3.4, ry: 1.1 }],
    roads: [],
    props: [
      ...row(['t:tree_gold_a', 't:tree_gold_b'], -15, 15, -6.3, 4.2, 1, 0.6, 15),
      ['t:wall_moss_a', -9.5, -4.4, 1], ['t:wall_moss_b', -7.0, -4.4, 1], ['t:arch_a', -4.0, -4.4, 1.1], ['t:wall_moss_c', -1.0, -4.4, 1], ['t:ruin_wall', 2.4, -4.3, 1],
      ['t:pillar', 5.4, -4.3, 1], ['t:pillar_broken', 7.6, -4.3, 1], ['t:statue', 10.2, -4.3, 1.1], ['t:pillar', 12.6, -4.3, 1], ['t:wall_moss_a', -12.0, -4.4, 1],
      ['t:pillar_broken', -13.6, 4.9, 0.9], ['t:tomb', 6.4, 5.0, 0.9],
      ...row(['w:cainos_prop_36', 'w:nat_rock_mossy', 'w:plant_bush_dark', 'w:cainos_prop_35'], -12, 10, 4.5, 3.0, 1.6, 0.7, 17),
    ],
    light: { tint: [150, 170, 200, 0.12], vignette: 0.45, rays: true }, weather: 'leaves',
  },
  // Frostmarch: snow, a frozen pool, a wall of pines, boulders
  pass: {
    ground: { base: ['t_grass_1', 't_grass_2'], patches: [{ tex: ['t_gravel'], amount: 0.12, size: 40 }], water: { tex: 't_water_3', rim: '#eef3f8', outline: '#6a8aa6' }, road: ['t_gravel'], edge: '#7a8494', snow: true },
    lakes: [{ x: 9.5, y: 5.5, rx: 3.6, ry: 1.0 }],
    roads: [{ pts: [[-16, -0.3], [16, 0.5]], w: 2.2 }],
    props: [
      ...row(['t:pine_a', 't:pine_b', 'w:tdf_29', 'w:tdf_30'], -15, 15, -6.2, 1.5, 1.3, 0.8, 19),
      ...row(['t:pine_a', 't:pine_b'], -15, 15, -4.4, 3.4, 1.1, 1.0, 21),
      ['t:rock_big', -6, -4.3, 1], ['t:rock_big', 6.8, -4.3, 0.9, true], ['t:rock_big', -12.5, 5.0, 1],
      ...row(['w:nat_boulder', 'w:nat_rock_grey', 'w:nat_tree_stump'], -12, 8, 4.5, 3.4, 2, 0.6, 23),
    ],
    light: { tint: [190, 215, 255, 0.14], vignette: 0.4 }, weather: 'snow',
  },
  // the Barrow Throne: dark flagstones, lava, black walls and tombs, braziers, skulls on pikes
  barrow: {
    ground: { base: ['t_flagstone_dark'], patches: [{ tex: ['t_stone_floor'], amount: 0.3, size: 45 }, { tex: ['t_gravel'], amount: 0.2, size: 30 }], water: { tex: 't_lava_pool', rim: '#2a1612', outline: '#ff9a3a' }, road: ['t_flagstone_dark'], edge: '#140f10', tint: [70, 30, 90, 0.2] },
    lakes: [{ x: -11, y: 5.5, rx: 3.0, ry: 0.9 }, { x: 11, y: -5.0, rx: 2.4, ry: 0.7 }],
    roads: [],
    props: [
      ['t:wall_a', -12, -4.8, 1], ['t:wall_b', -9.5, -4.8, 1], ['t:wall_c', -7, -4.8, 1], ['t:arch_b', -4.2, -4.8, 1.1], ['t:wall_a', -1.5, -4.8, 1], ['t:wall_b', 1, -4.8, 1], ['t:wall_c', 3.5, -4.8, 1], ['t:wall_a', 6, -4.8, 1],
      ['t:monolith_b', 8.4, -4.3, 1.1], ['t:tomb', -6, -4.3, 1], ['t:tomb', 2.2, -4.3, 1], ['w:cd_brazier', -2.6, -4.3, 2.2], ['w:cd_brazier', 5, -4.3, 2.2], ['w:cd_banner_purple', -9, -4.3, 2.2], ['w:cd_banner_purple', 0, -4.3, 2.2],
      ...row(['w:cd_skull_on_pike', 'w:nat_rock_grey', 'w:cd_stone_tomb', 'w:cd_skull_on_pike'], -8, 14, 4.5, 2.8, 2, 0.6, 25),
    ],
    light: { tint: [120, 60, 140, 0.2], vignette: 0.6, glow: [[-2.6, -4.6], [5, -4.6], [-11, 5.5], [11, -5.0]] }, weather: 'embers',
  },
  // the opening: the Barrow at night in a storm, the graves the dead climb out of standing on the field
  storm: {
    ground: { base: ['t_grass_dark_1', 't_grass_dark_2'], patches: [{ tex: ['t_gravel'], amount: 0.22, size: 40 }, { tex: ['t_dirt_dark'], amount: 0.3, size: 50 }],
      water: { tex: 't_water_2', rim: '#3a3a40', outline: '#101820' }, road: ['t_gravel'], edge: '#0a0a10', tint: [40, 50, 110, 0.25] },
    lakes: [{ x: 12, y: 5.4, rx: 3.0, ry: 0.9 }],
    roads: [{ pts: [[-16, 2.6], [-4, 2.2], [6, 2.7], [16, 2.3]], w: 1.4 }],
    props: [
      ...row(['t:tree_dark_a', 't:tree_dark_b', 't:tree_gnarled', 't:monolith_a', 't:tree_dark_a'], -15, 15, -6.2, 2.6, 1, 0.8, 31),
      ['t:monolith_b', -9, -4.6, 1.1], ['t:tomb', -3.5, -4.5, 1], ['w:cd_brazier', -6, -4.3, 2.2], ['w:cd_brazier', 6.5, -4.3, 2.2], ['t:monolith_c', 3.5, -4.6, 1], ['t:tomb', 9.5, -4.5, 1],
      // the graves the dead rise from
      ['t:grave_cross', -5.5, -1.9, 0.75], ['t:grave_a', -2.5, -2.4, 0.75], ['t:tomb', 0.5, -1.6, 0.8], ['t:grave_cross', 3.2, -2.3, 0.75], ['t:grave_a', 5.8, -1.4, 0.75], ['t:grave_a', -7.4, 0.6, 0.7],
      ['t:grave_cross', 7.6, 0.9, 0.7], ['t:grave_a', -1.2, 1.2, 0.7],
      ...row(['w:cd_skull_on_pike', 'w:nat_rock_grey', 'w:cd_stone_tomb', 'w:plant_mushroom_purple'], -14, 14, 4.6, 3.0, 2, 0.6, 33),
    ],
    light: { tint: [70, 80, 170, 0.28], vignette: 0.75, fog: 0.9, glow: [[-6, -4.6], [6.5, -4.6]] }, weather: 'rain',
  },
  // ---- more places on each road, so a region is not one field ten times
  // a bandit camp on a hill: trampled dirt, tents, a fire, a watchtower behind
  camp: {
    ground: { base: ['t_trampled_dirt', 't_dirt_2'], patches: [{ tex: ['t_grass_2', 't_grass_1'], amount: 0.45, size: 60 }, { tex: ['t_hay_floor'], amount: 0.06, size: 20 }], water: { tex: 't_water_1' }, road: ['t_dirt_1'], edge: '#3e2c1c' },
    roads: [{ pts: [[-16, 1.0], [0, 0.4], [16, 0.9]], w: 2.0 }],
    props: [
      ...row(['t:tree_a', 't:tree_b', 't:tree_young'], -15, 15, -6.4, 3.4, 1, 0.8, 41),
      ['w:cw_round_tower_red', -8.5, -4.7, 3.4], ['w:cd_war_tent_red', -4.6, -4.4, 2.6], ['w:prop_tent_red', -1.8, -4.3, 2.4], ['w:cd_campfire', 0.6, -4.2, 2.2],
      ['w:cd_weapon_rack', 2.6, -4.3, 2.2], ['w:prop_tent_green', 5.2, -4.3, 2.4, true], ['w:cd_supply_cart', 8.4, -4.3, 2.4], ['w:cd_flagpole_red', 11, -4.4, 2.4], ['w:cd_training_dummy', -12, -4.3, 2.2],
      ...row(['w:prop_crate', 'w:prop_barrel', 'w:cd_hay_bale', 'w:nat_log_pile', 'w:plant_bush_green'], -14, 14, 4.5, 2.8, 2, 0.7, 43),
    ],
    light: { tint: [255, 160, 90, 0.16], vignette: 0.45, glow: [[0.6, -4.4]] }, weather: 'embers',
  },
  // Ashby churchyard: grass gone grey, rows of graves, the chapel and dead trees behind
  churchyard: {
    ground: { base: ['t_grass_dark_1', 't_grass_dark_2'], patches: [{ tex: ['t_gravel'], amount: 0.18, size: 30 }, { tex: ['t_grass_3'], amount: 0.15, size: 50 }], water: { tex: 't_water_2', rim: '#6a6a58', outline: '#1c2a30' }, road: ['t_flagstone_mossy'], edge: '#20221c', tint: [90, 100, 130, 0.12] },
    lakes: [{ x: 11, y: 5.6, rx: 3.0, ry: 0.9 }],
    roads: [{ pts: [[-1.5, 8], [-1.0, 0], [-0.5, -8]], w: 1.6 }],
    props: [
      ...row(['w:tree_dead', 't:tree_dark_a', 't:tree_gnarled'], -15, 15, -6.4, 3.0, 1, 0.8, 45),
      ['t:temple', -0.8, -4.9, 0.85], ['t:grave_cross', -4.2, -4.3, 0.8], ['t:grave_a', -6.0, -4.3, 0.8], ['t:grave_b', -7.8, -4.3, 0.8], ['t:grave_cross', -9.6, -4.3, 0.8], ['t:tomb', -12, -4.3, 0.9],
      ['t:grave_a', 3.6, -4.3, 0.8], ['t:grave_cross', 5.4, -4.3, 0.8], ['t:grave_b', 7.2, -4.3, 0.8], ['t:monolith_a', 9.6, -4.4, 0.9], ['w:prop_lantern', 2.2, -4.2, 2], ['w:prop_lantern', -2.8, -4.2, 2],
      ...row(['w:prop_gravestone', 'w:nat_rock_mossy', 'w:plant_mushroom_purple', 'w:prop_fence_post', 'w:plant_bush_dark'], -14, 9, 4.5, 2.6, 2, 0.7, 47),
    ],
    light: { tint: [110, 130, 180, 0.18], vignette: 0.55, fog: 0.6, glow: [[2.2, -4.4], [-2.8, -4.4]] }, weather: 'fireflies',
  },
  // the King's Road through the wood at night: a dirt road between walls of trees
  wood: {
    ground: { base: ['t_grass_2', 't_grass_dark_1'], patches: [{ tex: ['t_grass_tall'], amount: 0.2, size: 40 }, { tex: ['t_dirt_dark'], amount: 0.12, size: 30 }], water: { tex: 't_water_1' }, road: ['t_dirt_1', 't_dirt_2'], edge: '#3a2c1c', tint: [40, 60, 90, 0.12] },
    roads: [{ pts: [[-16, -0.4], [-5, 0.6], [5, -0.3], [16, 0.5]], w: 2.4 }],
    props: [
      ...row(['t:tree_a', 't:tree_b', 't:tree_c', 'w:tree_oak', 'w:tree_pine_dark'], -15, 15, -6.0, 1.8, 1.05, 0.9, 49),
      ...row(['t:tree_young', 't:bush_a', 't:bush_b', 'w:plant_fern'], -15, 15, -4.4, 2.2, 1, 0.7, 51),
      ['w:prop_signpost', -3, -4.2, 2.2], ['w:cd_campfire', 7, -4.2, 2],
      ...row(['t:tree_young', 'w:nat_fallen_log', 'w:plant_fern', 'w:plant_mushroom_red', 't:bush_d'], -14, 14, 4.6, 2.4, 1.4, 0.7, 53),
    ],
    light: { tint: [70, 90, 160, 0.22], vignette: 0.65, glow: [[7, -4.4]] }, weather: 'fireflies',
  },
  // Low Ashwick and the wharves: half-drowned houses, planks over black water
  wharf: {
    ground: { base: ['t_wood_plank_h'], patches: [{ tex: ['t_dirt_dark'], amount: 0.25, size: 40 }, { tex: ['t_grass_dark_2'], amount: 0.15, size: 30 }], water: { tex: 't_water_2', rim: '#4a4030', outline: '#10201e' }, road: ['t_wood_plank_v'], edge: '#1c1a14', tint: [40, 80, 70, 0.12] },
    lakes: [{ x: -9, y: -5.6, rx: 5.5, ry: 1.4 }, { x: 8, y: -5.8, rx: 6, ry: 1.3 }, { x: 0, y: 5.8, rx: 9, ry: 1.2 }],
    roads: [],
    props: [
      ['t:p16_house_blue', -11, -5.2, 0.9], ['t:p16_house_red', 9.5, -5.3, 0.9, true], ['w:t_bridge_v', -2, -4.5, 2.4],
      ['w:prop_crate', -6, -4.3, 2], ['w:prop_barrel', -5, -4.3, 2], ['w:prop_lantern', 1.5, -4.2, 2], ['w:cd_hanging_cage', 4, -4.3, 2.2], ['w:prop_grain_sack', 6, -4.3, 2],
      ...row(['w:plant_reeds', 'w:plant_lily_pad', 'w:prop_barrel', 'w:plant_reeds'], -14, 14, 4.4, 2.2, 2, 0.6, 55),
    ],
    light: { tint: [70, 120, 110, 0.18], vignette: 0.55, fog: 0.7, glow: [[1.5, -4.4]] }, weather: 'fireflies',
  },
  // the Tangle and Witchlight: a black wood of mushrooms and witch-lanterns
  witchwood: {
    ground: { base: ['t_grass_dark_2'], patches: [{ tex: ['t_grass_dark_1'], amount: 0.3, size: 40 }, { tex: ['t_grass_tall'], amount: 0.15, size: 40 }], water: { tex: 't_water_2', rim: '#3a4a30', outline: '#0c1c18' }, road: ['t_dirt_dark'], edge: '#141410', tint: [50, 60, 90, 0.12] },
    lakes: [{ x: 10.5, y: 5.6, rx: 3.0, ry: 0.9 }],
    roads: [],
    props: [
      ...row(['t:tree_gnarled', 't:tree_dark_a', 't:tree_dark_b', 'w:tree_dead'], -15, 15, -6.0, 1.9, 1.05, 0.9, 57),
      ...row(['w:plant_mushroom_purple', 'w:plant_mushroom_red', 't:mush_a', 't:mush_c', 'w:prop_lantern'], -14, 14, -4.3, 1.6, 2, 0.6, 59),
      ['t:stone_circle', 0, -4.6, 0.7],
      ...row(['w:plant_mushroom_purple', 't:mush_b', 'w:nat_fallen_log', 'w:plant_reeds'], -14, 8, 4.6, 2.6, 2, 0.7, 61),
    ],
    light: { tint: [120, 70, 170, 0.24], vignette: 0.6, fog: 0.8, glow: [[-6, -4.5], [6, -4.5]] }, weather: 'fireflies',
  },
  // Saltreach town: sandstone walls, stalls and banners, palms over the roofs
  citadel: {
    ground: { base: ['t_flagstone_warm'], patches: [{ tex: ['t_d_dirt'], amount: 0.2, size: 40 }, { tex: ['t_flagstone_3'], amount: 0.15, size: 30 }], water: { tex: 't_d_water' }, road: ['t_d_dirt'], edge: '#7a5430' },
    roads: [],
    props: [
      ...row(['w:tree_palm'], -15, 15, -6.6, 3.2, 3, 0.8, 63),
      ...row(['w:cw_wall_face_sandstone'], -15, 15, -5.0, 1.15, 3.2, 0, 65),
      ['w:cw_gate_arch', -0.5, -4.7, 3.4], ['w:prop_market_stall_red', -6, -4.3, 2.6], ['w:prop_market_stall_blue', 5.5, -4.3, 2.6, true], ['w:cd_banner_red', -3, -4.4, 2.4], ['w:cd_banner_red', 2.2, -4.4, 2.4],
      ['w:desert_4', -11, -4.3, 1.5], ['w:desert_5', 11.5, -4.3, 1.6, true], ['w:cd_brazier', -8.6, -4.3, 2], ['w:cd_brazier', 8.6, -4.3, 2],
      ...row(['w:prop_crate', 'w:cd_grain_sack', 'w:desert_1', 'w:prop_barrel', 'w:desert_13'], -14, 14, 4.5, 2.8, 1.8, 0.7, 67),
    ],
    light: { tint: [255, 180, 100, 0.14], vignette: 0.32, rays: true, haze: true, glow: [[-8.6, -4.5], [8.6, -4.5]] }, weather: null,
  },
  // the Sunken Tombs and the dry well: warm flagstones, pillars, coffins, sand blown in
  tombs: {
    ground: { base: ['t_flagstone_warm', 't_flagstone_2'], patches: [{ tex: ['t_d_dirt'], amount: 0.2, size: 45 }, { tex: ['t_stone_floor'], amount: 0.25, size: 30 }], water: { tex: 't_lava_pool' }, road: ['t_flagstone_3'], edge: '#2a1c12', tint: [110, 70, 40, 0.14] },
    roads: [],
    props: [
      ...row(['t:slab_wall_a', 't:slab_wall_b'], -15, 15, -5.0, 2.4, 1.1, 0, 69),
      ['t:pillar', -9, -4.4, 1], ['t:pillar', -3, -4.4, 1], ['t:pillar', 3, -4.4, 1], ['t:pillar', 9, -4.4, 1], ['w:cd_statue_gold', 0, -4.3, 2.6], ['t:coffin', -6, -4.3, 0.9], ['t:coffin', 6, -4.3, 0.9],
      ['w:cd_brazier', -1.6, -4.3, 2], ['w:cd_brazier', 1.6, -4.3, 2], ['t:vase_a', -12, -4.3, 1], ['t:vase_b', 12, -4.3, 1],
      ...row(['t:ruin_stone_a', 't:vase_a', 'w:desert_1', 't:ruin_stone_c', 'w:cd_skull_on_pike'], -14, 14, 4.5, 2.8, 1.2, 0.6, 71),
    ],
    light: { tint: [255, 150, 70, 0.18], vignette: 0.6, glow: [[-1.6, -4.5], [1.6, -4.5]] }, weather: 'embers',
  },
  // the cloister and the chapels: pale stone, stained glass, candles
  cloister: {
    ground: { base: ['t_flagstone_1', 't_flagstone_2'], patches: [{ tex: ['t_flagstone_mossy'], amount: 0.25, size: 40 }, { tex: ['t_flagstone_3'], amount: 0.2, size: 30 }], water: { tex: 't_water_1', rim: '#9a9a90', outline: '#2a4a56' }, road: ['t_flagstone_3'], edge: '#2a2620' },
    lakes: [{ x: -11, y: 5.6, rx: 3.0, ry: 0.9 }],
    roads: [],
    props: [
      ...row(['w:cw_wall_face_stone'], -15, 15, -5.0, 1.15, 3.2, 0, 73),
      ['w:cw_stained_glass', -6, -5.0, 3.2], ['w:cw_stained_glass', 0, -5.0, 3.2], ['w:cw_stained_glass', 6, -5.0, 3.2],
      ['t:pillar', -9, -4.4, 1], ['t:pillar', -3, -4.4, 1], ['t:pillar', 3, -4.4, 1], ['t:pillar', 9, -4.4, 1],
      ['w:cd_candelabra', -4.5, -4.3, 2.2], ['w:cd_candelabra', 4.5, -4.3, 2.2], ['t:altar', 0, -4.3, 0.9], ['t:statue', -12, -4.3, 1], ['t:statue', 12, -4.3, 1, true],
      ...row(['t:pillar_broken', 'w:cd_candelabra', 't:ruin_stone_b', 'w:plant_bush_dark'], -9, 14, 4.6, 3.0, 1, 0.6, 75),
    ],
    light: { tint: [180, 170, 230, 0.16], vignette: 0.5, rays: true, glow: [[-4.5, -4.5], [4.5, -4.5]] }, weather: null,
  },
  // the ossuary and the Black Gate: dark stone, coffins, skulls, purple banners
  crypt: {
    ground: { base: ['t_stone_floor', 't_flagstone_dark'], patches: [{ tex: ['t_floor_grate'], amount: 0.08, size: 14 }, { tex: ['t_gravel'], amount: 0.2, size: 30 }], water: { tex: 't_water_2' }, road: ['t_flagstone_dark'], edge: '#0c0a0c', tint: [60, 60, 90, 0.12] },
    roads: [],
    props: [
      ...row(['w:cw_wall_face_dark'], -15, 15, -5.0, 1.15, 3.2, 0, 77),
      ['w:cw_portcullis', 0, -4.8, 3.4], ['w:cw_wall_torch_1', -3, -4.6, 2.6], ['w:cw_wall_torch_1', 3, -4.6, 2.6], ['w:cw_wall_torch_2', -9, -4.6, 2.6], ['w:cw_wall_torch_2', 9, -4.6, 2.6],
      ['t:coffin', -6, -4.3, 0.9], ['t:coffin', 6, -4.3, 0.9], ['w:cd_banner_purple', -11.5, -4.3, 2.2], ['w:cd_banner_purple', 11.5, -4.3, 2.2], ['w:cd_hanging_cage', -7.8, -4.3, 2], ['w:cd_skull_on_pike', 7.8, -4.3, 2.2],
      ...row(['w:cd_skull_on_pike', 'w:cd_stone_tomb', 't:coffin', 'w:nat_rock_grey'], -14, 14, 4.5, 2.6, 1.6, 0.6, 79),
    ],
    light: { tint: [100, 90, 160, 0.14], vignette: 0.6, glow: [[-3, -4.8], [3, -4.8], [-9, -4.8], [9, -4.8]] }, weather: null,
  },
  // Frostwatch and the ice chapel: a snowed-in fort, battlements, frozen banners
  fort: {
    ground: { base: ['t_grass_1'], patches: [{ tex: ['t_flagstone_1'], amount: 0.3, size: 40 }], water: { tex: 't_water_3', rim: '#eef3f8', outline: '#6a8aa6' }, road: ['t_flagstone_2'], edge: '#7a8494', snow: true },
    roads: [{ pts: [[-16, 0.2], [16, 0.2]], w: 2.0 }],
    props: [
      ...row(['w:tree_pine_snow'], -15, 15, -6.8, 2.0, 3, 0.8, 81),
      ...row(['w:cw_wall_face_stone'], -15, 15, -5.0, 1.15, 3.2, 0, 83),
      ['w:cw_round_tower_blue', -10, -4.9, 3.6], ['w:cw_gate_arch', 0, -4.7, 3.4], ['w:cw_round_tower_blue', 10, -4.9, 3.6, true],
      ['w:cd_banner_blue', -3, -4.4, 2.4], ['w:cd_banner_blue', 3, -4.4, 2.4], ['w:cd_brazier', -6, -4.3, 2], ['w:cd_brazier', 6, -4.3, 2], ['w:cd_ballista', -13, -4.3, 2.2],
      ...row(['w:cd_crate', 'w:nat_boulder', 'w:cd_shield_rack', 'w:nat_rock_grey'], -12, 12, 4.5, 3.0, 2, 0.6, 85),
    ],
    light: { tint: [180, 205, 255, 0.16], vignette: 0.45, glow: [[-6, -4.5], [6, -4.5]] }, weather: 'snow',
  },
  // the glacier and Winterheart: ice pools everywhere, dead white trees, nothing alive
  glacier: {
    ground: { base: ['t_grass_1'], patches: [{ tex: ['t_gravel'], amount: 0.06, size: 30 }], water: { tex: 't_water_3', rim: '#f4f8fc', outline: '#5a7a9a' }, road: ['t_gravel'], edge: '#7a8494', snow: true, tint: [120, 160, 220, 0.1] },
    lakes: [{ x: -10, y: -5.6, rx: 5, ry: 1.3 }, { x: 8, y: -5.8, rx: 5, ry: 1.2 }, { x: -6, y: 5.6, rx: 4, ry: 1.0 }, { x: 9, y: 5.6, rx: 3.5, ry: 1.0 }],
    roads: [],
    props: [
      ...row(['w:tree_pine_snow', 't:fv_tree_pine_snow', 'w:tree_dead'], -15, 15, -6.9, 2.8, 2.4, 0.8, 87),
      ['t:rock_big', -1, -4.5, 1.1], ['t:monolith_c', 2.6, -4.5, 0.9], ['w:nat_boulder', -3.8, -4.3, 2.4], ['w:nat_boulder', 4.8, -4.3, 2.2, true],
      ...row(['w:nat_boulder', 'w:nat_rock_grey', 'w:tree_dead'], -2, 4, 4.6, 2.6, 2, 0.6, 89),
    ],
    light: { tint: [170, 210, 255, 0.2], vignette: 0.45, fog: 0.5 }, weather: 'snow',
  },
  // the throne rooms under the Barrow: red marble, a carpet to the throne, black walls and banners
  hall: {
    ground: { base: ['t_flagstone_dark', 't_stone_floor'], patches: [{ tex: ['t_flagstone_3'], amount: 0.15, size: 40 }], water: { tex: 't_lava_pool', rim: '#2a1612', outline: '#ff9a3a' }, road: ['t_carpet_red'], edge: '#120c0e', tint: [90, 30, 60, 0.18] },
    roads: [{ pts: [[0, 9], [0, -9]], w: 2.0 }],
    props: [
      ...row(['w:cw_wall_face_dark'], -15, 15, -5.0, 1.15, 3.2, 0, 91),
      ['w:cd_throne', 0, -4.5, 3.2], ['w:cd_banner_red', -2.4, -4.6, 2.6], ['w:cd_banner_red', 2.4, -4.6, 2.6], ['w:cd_statue_knight', -5.5, -4.3, 2.6], ['w:cd_statue_knight', 5.5, -4.3, 2.6, true],
      ['t:pillar', -8.5, -4.4, 1], ['t:pillar', 8.5, -4.4, 1], ['w:cd_brazier', -11, -4.3, 2], ['w:cd_brazier', 11, -4.3, 2], ['w:cd_suit_of_armor', -13, -4.3, 2.2], ['w:cd_suit_of_armor', 13, -4.3, 2.2, true],
      ...row(['t:pillar_broken', 'w:cd_brazier', 'w:cd_skull_on_pike', 't:ruin_stone_b'], -14, 14, 4.6, 3.4, 1, 0.6, 93),
    ],
    light: { tint: [150, 50, 90, 0.2], vignette: 0.6, glow: [[-11, -4.5], [11, -4.5]] }, weather: 'embers',
  },
  // the Wyrm's hoard: lava and gold
  hoard: {
    ground: { base: ['t_flagstone_dark', 't_stone_floor'], patches: [{ tex: ['t_gravel'], amount: 0.3, size: 30 }], water: { tex: 't_lava_pool', rim: '#2a1612', outline: '#ff9a3a' }, road: ['t_flagstone_dark'], edge: '#140a08', tint: [120, 50, 30, 0.12] },
    lakes: [{ x: -10, y: -5.6, rx: 5, ry: 1.3 }, { x: 9, y: -5.8, rx: 5, ry: 1.2 }, { x: -9, y: 5.6, rx: 4, ry: 1.0 }, { x: 10, y: 5.6, rx: 3.5, ry: 1.0 }],
    roads: [],
    props: [
      ...row(['t:rock_dark', 't:monolith_a', 't:rock_big'], -15, 15, -6.6, 2.6, 1.1, 0.8, 95),
      ['w:cd_chest_gold', -2.2, -4.3, 2.4], ['w:cd_statue_gold', 0, -4.5, 2.8], ['w:cd_chest_gold', 2.4, -4.3, 2.4, true], ['w:prop_treasure_chest', -4.4, -4.3, 2.2], ['w:cd_chest_open', 4.6, -4.3, 2.2],
      ...row(['w:cd_chest_gold', 'w:nat_rock_grey', 'w:cd_skull_on_pike'], -3, 4, 4.6, 2.4, 2, 0.6, 97),
    ],
    light: { tint: [255, 120, 50, 0.16], vignette: 0.6, glow: [[-10, -5.6], [9, -5.8], [-9, 5.6], [10, 5.6]] }, weather: 'embers',
  },
  // Thornwick's square, for the company's first scene: houses, the well, the notice board, lamps
  square: {
    ground: { base: ['t_dirt_2'], patches: [{ tex: ['t_cobble'], amount: 0.45, size: 60 }, { tex: ['t_grass_dark_1'], amount: 0.08, size: 30 }], water: { tex: 't_water_1' }, road: ['t_cobble'], edge: '#3a3430', scale: 1 },
    roads: [],
    props: [
      ['t:p16_house_red', -9.5, -4.8, 1], ['t:p16_house_blue', -2.0, -4.9, 1], ['t:p16_house_red', 6.5, -4.8, 1, true], ['t:tree_c', 12, -5.1, 1],
      ['t:fountain', 2.8, -4.3, 1], ['t:p16_lamp_post', -5.6, -4.3, 1], ['t:p16_lamp_post', 9.6, -4.3, 1], ['t:p16_stall', -12.4, -4.3, 1],
      ['w:prop_signpost', -1.2, -4.3, 2.4], ['w:prop_barrel', -7.8, -4.3, 2], ['w:prop_crate', -8.8, -4.3, 2], ['w:prop_crate', 11.2, -4.3, 2],
      ...row(['w:prop_barrel', 'w:prop_crate', 'w:plant_flower_red', 'w:prop_bench'], -12, 12, 4.5, 3.2, 2, 0.6, 27),
    ],
    light: { tint: [255, 170, 110, 0.14], vignette: 0.4, rays: true }, weather: null,
  },
};

// the arena each region fights in (a mission may name its own)
export const REGION_ARENA = { r1: 'meadow', r2: 'fen', r3: 'dunes', r4: 'abbey', r5: 'pass', r6: 'barrow' };

// the missions that fight somewhere other than their region's field
export const MISSION_ARENA = {
  r1m3: 'camp', r1m5: 'camp', r1m4: 'churchyard', r1m6: 'churchyard', r1m8: 'churchyard', r1m10: 'churchyard', r1m7: 'wood', r1m9: 'wood',
  r2m2: 'wharf', r2m4: 'wharf', r2m8: 'wharf', r2m3: 'witchwood', r2m5: 'witchwood', r2m6: 'witchwood', r2m9: 'witchwood',
  r3m1: 'citadel', r3m5: 'citadel', r3m8: 'citadel', r3m4: 'tombs', r3m7: 'tombs',
  r4m2: 'cloister', r4m3: 'cloister', r4m5: 'cloister', r4m7: 'cloister', r4m8: 'cloister', r4m10: 'cloister', r4m4: 'crypt', r4m9: 'crypt',
  r5m2: 'fort', r5m7: 'fort', r5m10: 'fort', r5m4: 'glacier', r5m5: 'glacier', r5m9: 'glacier',
  r6m3: 'hall', r6m4: 'hall', r6m6: 'hall', r6m8: 'hall', r6m7: 'hoard', r6m10: 'hoard',
};
export const arenaFor = (m) => m.arena || MISSION_ARENA[m.id] || REGION_ARENA[m.region];
