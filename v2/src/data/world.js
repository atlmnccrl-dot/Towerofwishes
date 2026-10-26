// The overworld: six regions side by side, west to east, each a painted piece of land (see
// render/terrain.js) with its own ground, water, scattered life and a landmark at every mission.
// Mission sites come from campaign.js (map: [x%, y%] of the region). Sizes are in overworld pixels.

export const REGION_W = 960, REGION_H = 560;

// what a landmark looks like: sprites from the world atlas (w) or the tiles atlas (t), placed around
// the site at [dx, dy] with a scale
export const LANDMARKS = {
  bridge: [],
  village: [['t:p16_house_red', -26, -4, 0.32], ['t:p16_house_blue', 20, -8, 0.3], ['w:prop_well', -4, 10, 1], ['w:prop_market_stall_red', 30, 12, 1]],
  tower: [['w:desert_7', 0, -2, 0.55], ['w:cd_flagpole_red', 18, 4, 1]],
  graves: [['w:prop_gravestone', -14, -4, 1], ['w:prop_gravestone', -2, -8, 1], ['w:prop_gravestone', 10, -3, 1], ['w:cd_stone_tomb', 2, 8, 1], ['w:tree_dead', -26, -6, 1], ['w:tree_dead', 24, -10, 1]],
  pit: [['w:prop_fence_h', -14, -10, 1], ['w:prop_fence_h', 2, -10, 1], ['w:prop_fence_h', -14, 12, 1], ['w:prop_fence_h', 2, 12, 1], ['w:prop_campfire', -4, 0, 1], ['w:cd_banner_red', 20, -6, 1]],
  camp: [['w:prop_tent_red', -18, -4, 1], ['w:prop_tent_green', 16, -6, 1], ['w:prop_campfire', 0, 6, 1], ['w:prop_barrel', 26, 8, 1]],
  chapel: [['t:temple', 0, -2, 0.3], ['w:prop_lamp_post', -24, 8, 1]],
  ruin: [['w:cainos_prop_6', -16, -4, 0.55], ['w:cainos_prop_22', 14, -6, 0.6], ['w:cainos_prop_23', 26, 6, 0.6], ['w:cainos_prop_35', -2, 10, 0.6]],
  cave: [['w:nat_boulder', -18, -6, 1.4], ['w:nat_boulder', 14, -8, 1.6], ['w:nat_rock_grey', -6, 8, 1.4], ['w:nat_rock_mossy', 22, 6, 1.3]],
  gate: [['w:cw_gate_arch', 0, -4, 1.2], ['w:cw_wall_face_stone', -22, -4, 1.2], ['w:cw_wall_face_stone', 22, -4, 1.2]],
  nest: [['w:nat_boulder', -16, 0, 1.6], ['w:nat_boulder', 14, -4, 1.8], ['w:desert_11', 0, 8, 1], ['w:tree_dead', -24, -8, 1]],
  oasis: [['w:desert_4', -18, -6, 0.7], ['w:desert_5', 18, -8, 0.7], ['w:desert_3', 0, 8, 0.8]],
  library: [['w:desert_6', 0, -2, 0.45], ['w:cd_brazier', 26, 6, 1]],
  throne: [['w:cd_throne', 0, -4, 1.6], ['w:cd_brazier', -20, 4, 1.2], ['w:cd_brazier', 20, 4, 1.2], ['w:cd_banner_purple', -12, -12, 1.2], ['w:cd_banner_purple', 12, -12, 1.2]],
  shrine: [['w:cainos_prop_42', 0, -4, 0.55], ['w:prop_lantern', -16, 6, 1], ['w:prop_lantern', 16, 6, 1]],
};

// per region: the land, what grows on it, the landmark at each mission (in order), ambient particles
export const LANDS = {
  r1: {
    ground: { base: ['t_grass_1', 't_grass_2', 't_grass_3'], patches: [{ tex: ['t_grass_flowers_yellow', 't_grass_flowers_white', 't_grass_flowers_pink'], amount: 0.12, size: 34 }, { tex: ['t_grass_dark_1'], amount: 0.25, size: 90 }],
      water: { tex: 't_water_1', rim: '#d9c98e', outline: '#2c4c58' }, road: ['t_dirt_1', 't_dirt_2'], edge: '#4f3c26' },
    rivers: [{ pts: [[0, 0.86], [0.2, 0.8], [0.45, 0.88], [0.7, 0.8], [1, 0.84]], w: 26 }], lakes: [],
    scatter: { trees: ['tree_oak', 'tree_oak_light', 'tree_birch', 'tree_pine', 'tree_cherry'], small: ['plant_bush_green', 'plant_bush_flowering', 'plant_bush_berry_red', 'nat_rock_grey', 'plant_flower_yellow'], animals: ['animal_sheep', 'animal_cow', 'animal_deer', 'animal_rabbit'], forest: 0.3 },
    sites: ['bridge', 'village', 'tower', 'graves', 'pit', 'cave', 'camp', 'chapel', 'ruin', 'gate'], particles: 'leaves',
  },
  r2: {
    ground: { base: ['t_grass_dark_1', 't_grass_dark_2'], patches: [{ tex: ['t_dirt_dark'], amount: 0.3, size: 50 }, { tex: ['t_grass_tall'], amount: 0.2, size: 30 }],
      water: { tex: 't_water_2', rim: '#6d7a4c', outline: '#1d3634' }, road: ['t_dirt_dark', 't_dirt_2'], edge: '#2c2a1c', tint: [40, 70, 50, 0.12] },
    rivers: [{ pts: [[0, 0.3], [0.3, 0.42], [0.6, 0.3], [1, 0.38]], w: 18 }], lakes: [{ x: 0.2, y: 0.75, rx: 70, ry: 40 }, { x: 0.55, y: 0.62, rx: 50, ry: 30 }, { x: 0.82, y: 0.85, rx: 80, ry: 36 }, { x: 0.4, y: 0.15, rx: 40, ry: 24 }],
    scatter: { trees: ['tree_dead', 'tree_pine_dark', 'tree_pine_dark'], small: ['plant_reeds', 'plant_reeds', 'plant_mushroom_brown', 'plant_mushroom_purple', 'nat_rock_mossy', 'nat_fallen_log'], water: ['plant_lily_pad'], animals: [], forest: 0.3 },
    sites: ['bridge', 'village', 'shrine', 'camp', 'cave', 'graves', 'ruin', 'village', 'cave', 'nest'], particles: 'fireflies',
  },
  r3: {
    ground: { base: ['t_d_sand'], patches: [{ tex: ['t_d_dirt'], amount: 0.22, size: 70 }], water: { tex: 't_d_water', rim: '#f2d48a', outline: '#3a7a74' }, road: ['t_d_dirt'], edge: '#9a6a34', tint: [255, 200, 120, 0.06] },
    rivers: [], lakes: [{ x: 0.3, y: 0.5, rx: 46, ry: 26 }, { x: 0.72, y: 0.3, rx: 30, ry: 18 }],
    scatter: { trees: ['desert_4', 'desert_5'], small: ['desert_1', 'desert_13', 'desert_14', 'nat_rock_brown', 'nat_rock_brown', 'desert_0', 'desert_11'], animals: [], forest: 0.3, treeNearWater: true, smallRate: 0.018 },
    sites: ['gate', 'camp', 'nest', 'oasis', 'library', 'cave', 'graves', 'village', 'nest', 'nest'], particles: null,
  },
  r4: {
    ground: { base: ['t_grass_autumn', 't_grass_2'], patches: [{ tex: ['t_flagstone_mossy', 't_cobble_mossy'], amount: 0.18, size: 40 }, { tex: ['t_grass_dark_2'], amount: 0.2, size: 80 }],
      water: { tex: 't_water_1', rim: '#c8b98a', outline: '#2a4a56' }, road: ['t_cobble_mossy', 't_cobble'], edge: '#3a3a30' },
    rivers: [], lakes: [{ x: 0.5, y: 0.52, rx: 120, ry: 60 }, { x: 0.1, y: 0.2, rx: 50, ry: 30 }],
    scatter: { trees: ['tree_autumn_orange', 'tree_autumn_red', 'tree_oak'], small: ['cainos_prop_36', 'nat_rock_mossy', 'plant_bush_dark', 'cainos_prop_35'], animals: ['animal_deer'], forest: 0.45 },
    sites: ['gate', 'chapel', 'chapel', 'graves', 'ruin', 'tower', 'shrine', 'ruin', 'gate', 'throne'], particles: 'leaves',
  },
  r5: {
    ground: { base: ['t_grass_1', 't_grass_2'], patches: [{ tex: ['t_gravel'], amount: 0.15, size: 50 }], water: { tex: 't_water_3', rim: '#e8eef6', outline: '#5a7a96' }, road: ['t_gravel'], edge: '#7a8494', snow: true },
    rivers: [{ pts: [[0, 0.2], [0.35, 0.3], [0.7, 0.18], [1, 0.24]], w: 16 }], lakes: [{ x: 0.62, y: 0.72, rx: 60, ry: 30 }],
    scatter: { trees: ['tree_pine_snow', 'tree_pine_snow', 'tree_pine_dark'], small: ['nat_boulder', 'nat_rock_grey', 'nat_tree_stump'], animals: [], forest: 0.4 },
    sites: ['gate', 'tower', 'camp', 'graves', 'cave', 'nest', 'chapel', 'gate', 'shrine', 'throne'], particles: 'snow',
  },
  r6: {
    ground: { base: ['t_dirt_dark', 't_grass_dark_2'], patches: [{ tex: ['t_flagstone_dark', 't_gravel'], amount: 0.3, size: 45 }], water: { tex: 't_lava_pool', rim: '#3a2018', outline: '#ff9a3a' }, road: ['t_flagstone_dark'], edge: '#1a1414', tint: [60, 30, 80, 0.18] },
    rivers: [], lakes: [{ x: 0.3, y: 0.7, rx: 40, ry: 22 }, { x: 0.75, y: 0.25, rx: 34, ry: 20 }],
    scatter: { trees: ['tree_dead'], small: ['prop_gravestone', 'cd_skull_on_pike', 'nat_rock_grey', 'cd_stone_tomb'], animals: [], forest: 0.2 },
    sites: ['graves', 'gate', 'ruin', 'graves', 'shrine', 'gate', 'cave', 'throne', 'gate', 'throne'], particles: 'embers',
  },
};
