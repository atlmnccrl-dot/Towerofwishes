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
