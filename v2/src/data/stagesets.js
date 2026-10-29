// The cutscene sets (render/stage.js), one per place: a sky, distant ridges, silhouettes, the props
// behind the actors (x in metres along the stage, a lift dy in pixels, a scale, a flip), the ground,
// light and weather. (A set may add 'fore': dark shapes in front of the actors, for framing.) Sprites: 'w:' world atlas, otherwise tiles.
// Rows ({ list, gap: [min, max] metres, k }) are scattered along the stage, seeded.
// (Proposal: the author may restage any of it.)

export const STAGE_SETS = {
  // Thornwick's square at dawn, where the company signs its charter
  square: {
    sky: ['#34466e', '#e7ad86', '#ffe0ae'], sun: { x: 0.8, y: 0.55, r: 34, col: 'rgba(255,244,214,1)', disc: '#fff6da' }, clouds: 'rgba(255,226,206,0.5)',
    ridges: [{ col: '#a493a8', base: 44, amp: 10, p: 0.05, freq: 0.15 }, { col: '#857a92', base: 28, amp: 8, p: 0.1, freq: 0.3 }],
    mid: { list: ['p16_house_red', 'p16_house_blue', 'temple', 'tree_a', 'tree_b'], col: '#6a5f78', k: 0.4, p: 0.4, gap: [3, 6], base: 3 },
    haze: 'rgba(255,214,176,0.35)',
    back: [
      ['p16_house_red', -15, 0, 0.5], ['barrel', -12.4, 0, 0.5], ['crate', -11.8, 0, 0.5], ['p16_house_blue', -8, 0, 0.5], ['lantern_post', -4.6, 0, 0.5],
      ['p16_stall', -2.2, 0, 0.5], ['tree_b', 1.4, -1, 0.6], ['p16_house_red', 4.6, 0, 0.5, true], ['sign_e', 7.2, 0, 0.5], ['p16_house_blue', 11, 0, 0.5],
      ['barrel', 13.6, 0, 0.5], ['p16_house_blue', 17.5, 0, 0.5, true], ['lantern_post', 21, 0, 0.5], ['p16_house_red', 24, 0, 0.5],
    ],
    ground: { tex: 'w:t_cobble', edge: '#6b5e52' },
    light: { tint: 'rgba(255,190,140,0.35)', rays: '255,225,170', vignette: 0.45 }, weather: 'dust',
  },
  // the Thornwick Road: meadows, hedges, a fence and the farms
  meadow: {
    sky: ['#4a78b8', '#9cc8e8', '#e8f2d8'], sun: { x: 0.25, y: 0.28, r: 30, col: 'rgba(255,252,230,1)' }, clouds: 'rgba(255,255,255,0.75)',
    ridges: [{ col: '#9cb8c0', base: 36, amp: 10, p: 0.05, freq: 0.12 }, { col: '#7aa282', base: 20, amp: 8, p: 0.12, freq: 0.25 }],
    mid: { list: ['tree_a', 'tree_b', 'tree_c', 'tree_young'], col: '#5a8466', k: 0.4, p: 0.42, gap: [1.4, 3], base: 2 },
    haze: 'rgba(225,242,232,0.35)',
    backRow: { list: ['tree_a', 'tree_b', 'tree_c', 'tree_young', 'bush_a', 'bush_b'], k: 0.55, gap: [2.2, 4.5], jitter: 3 },
    back: [['w:prop_fence_post', -6, 2], ['w:prop_fence_h', -5.4, 2], ['w:prop_fence_h', -4.7, 2], ['w:prop_fence_post', -4.1, 2], ['w:prop_signpost', 1.5, 2],
      ['w:prop_haystack', 6, 2], ['w:animal_sheep', 7.5, 2], ['w:animal_sheep', 8.3, 2, 1, true], ['w:prop_scarecrow', 11, 2]],
    ground: { tex: 'w:t_grass_1', edge: '#4c7a3a' },
    tufts: { list: ['w:plant_fern', 'w:plant_flower_yellow', 'w:plant_bush_green', 'w:plant_flower_blue', 'w:plant_flower_pink'], k: 1, gap: [1.2, 3], jitter: 8 },
    light: { tint: 'rgba(255,230,170,0.3)', rays: '255,240,200', vignette: 0.35 }, weather: 'leaves',
  },
  // the Greyfen: dark water, dead trees and reeds under a pale moon
  fen: {
    sky: ['#16242a', '#3a5650', '#7a8f78'], sun: { x: 0.72, y: 0.26, r: 20, col: 'rgba(225,238,226,1)', glow: 'rgba(160,200,180,0.22)' },
    ridges: [{ col: '#344640', base: 22, amp: 6, p: 0.07, freq: 0.2 }],
    mid: { list: ['tree_gnarled', 'tree_dark_a', 'tree_dark_b', 'w:tdf_24'], col: '#23302c', k: 0.6, p: 0.45, gap: [2, 4], base: 2 },
    haze: 'rgba(150,180,160,0.4)',
    backRow: { list: ['tree_gnarled', 'tree_dark_a', 'tree_dark_b', 'tree_gnarled'], k: 0.75, gap: [3, 6], jitter: 3 },
    back: [['w:plant_reeds', -7, 2], ['w:plant_reeds', -6.5, 2], ['w:nat_fallen_log', -3, 2], ['w:plant_mushroom_purple', 0.5, 2], ['w:plant_reeds', 4, 2], ['w:plant_reeds', 4.4, 2, 1, true], ['w:nat_fallen_log', 9, 2, 1, true]],
    ground: { tex: 'w:t_grass_dark_1', edge: '#1f2a20', shade: 'rgba(0,10,10,0.6)' },
    tufts: { list: ['w:plant_reeds', 'w:plant_mushroom_brown', 'w:plant_reeds', 'w:plant_fern'], k: 1, gap: [1, 2.5], jitter: 8 },
    light: { tint: 'rgba(90,150,130,0.35)', fog: 1, fogCol: '190,215,200', vignette: 0.6 }, weather: 'fireflies',
  },
  // Saltreach: dunes, palms, sandstone houses and towers
  dunes: {
    sky: ['#3f7fc0', '#a9d4ee', '#f6e6c0'], sun: { x: 0.7, y: 0.2, r: 38, col: 'rgba(255,255,240,1)', glow: 'rgba(255,240,200,0.4)' },
    ridges: [{ col: '#e6be82', base: 28, amp: 10, p: 0.06, freq: 0.18 }, { col: '#d2a066', base: 14, amp: 7, p: 0.14, freq: 0.32 }],
    mid: { list: ['w:desert_7', 'w:desert_6', 'w:desert_4', 'w:desert_5'], col: '#c09460', k: 0.6, p: 0.45, gap: [4, 8], base: 2 },
    haze: 'rgba(255,232,196,0.45)',
    back: [['w:desert_6', -11, 0], ['w:desert_10', -7.5, 0], ['w:desert_7', -4, 0], ['w:desert_4', 0.2, 0], ['w:desert_5', 1.8, 0, 1, true],
      ['w:desert_8', 9.5, 0], ['w:desert_11', 12.5, 0], ['w:desert_4', 15, 0, 1, true], ['w:desert_3', 18, 0]],
    ground: { tex: 'w:t_d_sand', edge: '#c9985a' },
    tufts: { list: ['w:desert_13', 'w:desert_14', 'w:desert_2', 'w:desert_12'], k: 1, gap: [3, 6], jitter: 6 },
    light: { tint: 'rgba(255,200,120,0.35)', rays: '255,230,170', vignette: 0.35 }, weather: 'dust',
  },
  // the Sunken Abbey: broken arches and statues at sunset, autumn trees
  abbey: {
    sky: ['#2c2a4a', '#c0785a', '#f2b27a'], sun: { x: 0.3, y: 0.72, r: 40, col: 'rgba(255,210,150,1)', glow: 'rgba(255,160,100,0.4)' }, clouds: 'rgba(120,70,90,0.6)',
    ridges: [{ col: '#6b5070', base: 30, amp: 8, p: 0.06, freq: 0.15 }],
    mid: { list: ['temple', 'arch_a', 'ruin_wall', 'tree_gold_a', 'pillar'], col: '#463a52', k: 0.5, p: 0.45, gap: [2.5, 5], base: 2 },
    haze: 'rgba(255,170,120,0.35)',
    back: [['tree_gold_a', -12, 0, 0.6], ['arch_a', -8, 0], ['ruin_pillar', -4.6, 0], ['statue', -1, 0], ['pillar_broken', 2.4, 0], ['tree_gold_b', 5.5, 0, 0.6, true],
      ['shrine_a', 9, 0], ['ruin_wall', 12.5, 0], ['pillar', 16, 0], ['tree_gold_a', 19, 0, 0.6]],
    ground: { tex: 'w:t_flagstone_mossy', edge: '#4a4a3a' },
    tufts: { list: ['w:plant_fern', 'w:plant_mushroom_red', 'w:nat_rock_mossy'], k: 1, gap: [2, 4], jitter: 6 },
    light: { tint: 'rgba(255,150,100,0.35)', rays: '255,190,140', vignette: 0.5 }, weather: 'leaves',
  },
  // the Frostpeak Pass: snowy pines under the mountains
  pass: {
    sky: ['#5a7ab0', '#b8cde8', '#eef3fa'], sun: { x: 0.6, y: 0.3, r: 26, col: 'rgba(255,255,255,1)', glow: 'rgba(230,240,255,0.35)' }, clouds: 'rgba(255,255,255,0.6)',
    ridges: [{ col: '#d4deec', base: 58, amp: 22, p: 0.04, freq: 0.12 }, { col: '#a4b6d2', base: 36, amp: 14, p: 0.09, freq: 0.22 }, { col: '#8293b2', base: 18, amp: 8, p: 0.18, freq: 0.4 }],
    mid: { list: ['pine_a', 'pine_b'], col: '#6c7c98', k: 0.5, p: 0.5, gap: [0.8, 1.8], base: 2 },
    haze: 'rgba(235,242,250,0.45)', snowy: true,
    backRow: { list: ['pine_a', 'pine_b', 'pine_a', 'rock_big'], k: 1, gap: [1.6, 3.6], jitter: 3 },
    ground: { col: '#e4ebf5', speck: ['#cbd6e4', '#f7f9fc', '#b8c5d6'], edge: '#c6d2e2', shade: 'rgba(60,80,120,0.35)' },
    tufts: { list: ['w:nat_rock_grey', 'w:nat_boulder'], k: 1, gap: [4, 8], jitter: 6 },
    light: { tint: 'rgba(190,210,255,0.3)', vignette: 0.4 }, weather: 'snow',
  },
  // the Barrow: tombs and monoliths, braziers burning, a violet night
  barrow: {
    sky: ['#0c0a16', '#241a36', '#3d2a4a'], stars: true, sun: { x: 0.76, y: 0.22, r: 18, col: 'rgba(232,222,255,1)', glow: 'rgba(160,130,220,0.25)' },
    ridges: [{ col: '#1e1828', base: 30, amp: 12, p: 0.06, freq: 0.2 }],
    mid: { list: ['tree_dark_a', 'monolith_b', 'tomb', 'w:tdf_24'], col: '#150f1e', k: 0.6, p: 0.45, gap: [2, 4], base: 2 },
    haze: 'rgba(120,80,160,0.3)',
    back: [['tree_dark_a', -12, 0, 0.9], ['monolith_a', -8, 0], ['grave_cross', -5.5, 0], ['cd_brazier', -3.4, 0], ['tomb', -1, 0], ['monolith_b', 2.6, 0], ['cd_brazier', 5, 0],
      ['grave_a', 7.4, 0], ['coffin', 10.4, 0], ['monolith_c', 13.4, 0], ['tree_dark_b', 16.5, 0, 0.9, true], ['cd_skull_on_pike', 19, 0]],
    ground: { tex: 'w:t_flagstone_dark', edge: '#2a2234', shade: 'rgba(0,0,0,0.6)' },
    tufts: { list: ['w:plant_mushroom_purple', 'w:nat_rock_grey'], k: 1, gap: [3, 6], jitter: 6 },
    light: { tint: 'rgba(140,90,200,0.35)', glow: [[-3.4, 26, 42], [5, 26, 42]], fog: 0.6, fogCol: '150,120,190', vignette: 0.65 }, weather: 'embers',
  },
  // the opening: the Barrow in a storm, the night Vael's dead woke (graves at a person's height or less)
  storm: {
    sky: ['#05040a', '#130f22', '#261b34'], sun: { x: 0.62, y: 0.3, r: 34, col: 'rgba(214,206,240,1)', glow: 'rgba(150,130,220,0.3)', disc: '#d8d2ee', dr: 15 }, clouds: 'rgba(40,32,60,0.9)',
    ridges: [{ col: '#120e1a', base: 34, amp: 14, p: 0.05, freq: 0.18 }, { col: '#0d0a14', base: 16, amp: 6, p: 0.1, freq: 0.35 }],
    mid: { list: ['tree_dark_a', 'monolith_b', 'tree_dark_b', 'monolith_a'], col: '#0a0810', k: 0.55, p: 0.45, gap: [2, 4.5], base: 2 },
    haze: 'rgba(90,70,130,0.35)',
    back: [['tree_dark_a', -14, 0, 1.1], ['monolith_a', -10, 0], ['grave_cross', -7.5, 0, 0.65], ['grave_a', -6.2, 0, 0.6], ['cd_brazier', -4.5, 0],
      ['grave_cross', -2.6, 0, 0.6, true], ['tomb', 0.4, 0, 0.9], ['grave_a', 2.8, 0, 0.6, true], ['monolith_b', 5, 0], ['grave_cross', 7, 0, 0.65],
      ['cd_brazier', 8.6, 0], ['grave_a', 10.4, 0, 0.6], ['tree_dark_b', 13.5, 0, 1.1, true], ['monolith_c', 16, 0], ['cd_skull_on_pike', 18.5, 0]],
    ground: { tex: 'w:t_flagstone_dark', edge: '#1a1424', shade: 'rgba(0,0,0,0.7)' },
    tufts: { list: ['w:plant_mushroom_purple', 'w:nat_rock_grey'], k: 1, gap: [3, 6], jitter: 6 },
    light: { tint: 'rgba(110,80,190,0.4)', glow: [[-4.5, 26, 36, '150,110,255'], [8.6, 26, 36, '150,110,255']], fog: 0.9, fogCol: '120,100,170', vignette: 0.75 }, weather: 'rain',
  },
  // the opening: the last stand at the abbey wall, at a red dusk, fires burning along the line
  warfield: {
    sky: ['#1a0e1a', '#7a2a24', '#e0743a'], sun: { x: 0.5, y: 0.86, r: 46, col: 'rgba(255,170,90,1)', glow: 'rgba(255,90,40,0.45)', disc: '#ffc27a' }, clouds: 'rgba(60,20,30,0.75)',
    ridges: [{ col: '#4a1e26', base: 30, amp: 10, p: 0.05, freq: 0.15 }, { col: '#2e1218', base: 14, amp: 6, p: 0.1, freq: 0.3 }],
    mid: { list: ['temple', 'arch_a', 'ruin_wall', 'pillar', 'ruin_pillar'], col: '#200c14', k: 0.45, p: 0.45, gap: [2.5, 5], base: 2 },
    haze: 'rgba(255,110,60,0.35)',
    back: [['ruin_wall', -13, 0], ['pillar_broken', -9.5, 0], ['cd_banner_red', -7.4, 0], ['ruin_pillar', -4.8, 0], ['arch_a', -1, 0], ['cd_banner_red', 2.6, 0],
      ['pillar_broken', 5, 0, 1, true], ['statue', 8.2, 0], ['ruin_wall', 12, 0, 1, true], ['ruin_pillar', 15.6, 0], ['arch_a', 19.5, 0]],
    ground: { tex: 'w:t_flagstone_mossy', edge: '#3a2a22', shade: 'rgba(30,0,0,0.6)' },
    tufts: { list: ['w:nat_rock_grey', 'w:plant_fern'], k: 1, gap: [2.5, 5], jitter: 6 },
    light: { tint: 'rgba(255,90,50,0.4)', glow: [[-6, 6, 50], [3.5, 6, 50], [11, 6, 50]], rays: '255,150,90', vignette: 0.6 }, weather: 'embers',
  },
};
export const REGION_STAGE = { r1: 'meadow', r2: 'fen', r3: 'dunes', r4: 'abbey', r5: 'pass', r6: 'barrow' };
