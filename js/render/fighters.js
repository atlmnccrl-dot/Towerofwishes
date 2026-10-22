/*
 * Tower of Wishes — fighters layer: cel-shaded anime figures.
 *
 * API (called by core.js):
 *   update(s, dt)       hair and cloth springs
 *   drawUnit(u, s)      draw one fighter at its depth slot
 *   LOOK                per-character appearance table
 *
 * Each figure is a 3D skeleton (metres) projected through V.P, then drawn
 * as tapered shapes in three passes per layer: ink outline, flat base
 * colour, hard-edged shadow on the side away from the light, then a thin
 * rim light. Detail (faces, hair strands) scales with zoom.
 *
 * Canon from the manuscript: Eiryn's long silver-white hair, dark travel-worn
 * outfit with green at the collar; Kael's armour with a shoulder plate and his
 * sword; the broad man's fists; the third man unarmed; the ogre's stone-coloured
 * skin, stoop and the beam from the loading frame. Everything else here is a
 * placeholder design (Proposal; see docs/ART_DIRECTION.md).
 *
 * Appearance is data-driven: a LOOK entry lists features (coat, cape, plate,
 * beard, ears, glyph hands, shield…) and the drawing code reads the features,
 * never the unit key. A key without a LOOK entry falls back to a plain figure.
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  const INK = '#0c0808';
  const GLYPH = '#a98bff';
  const TAU = Math.PI * 2;
  const smooth = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
  // tone = [base, shadow]
  const LOOK = {
    kael: {
      h: 1.0, w: 1.0, build: 1.0, weapon: 'sword', hair: 'spiky',
      skin: ['#e9c6b0', '#a97f78'], hairC: ['#2b2327', '#141012'],
      body: ['#262a36', '#15171f'], legs: ['#1f2129', '#111217'], boots: ['#3a2d26', '#1d1613'],
      armor: ['#5b6772', '#2d343c'], accent: '#9cc3dd', coat: ['#2a2f3d', '#151820'], eye: '#9cc3dd',
      pauldron: 'L', chestV: true, strap: '#3a2d26',
    },
    // Alric Noct: crimson eyes, dark hair, a long dark coat (book prologue).
    alric: {
      h: 1.02, w: 1.0, build: 1.0, weapon: 'none', hair: 'short',
      skin: ['#e6c2aa', '#a67e74'], hairC: ['#1c1418', '#0c080a'],
      body: ['#2a2230', '#15111a'], legs: ['#1f1b24', '#100e13'], boots: ['#2a1e1c', '#140e0d'],
      coat: ['#3a1e2a', '#1c0e14'], coatLen: 0.45, accent: '#c8323c', eye: '#c8323c', belt: '#2a1a16', strap: '#2a1a16',
    },
    eiryn: {
      h: 0.94, w: 0.86, build: 0.85, weapon: 'branch', hair: 'long',
      skin: ['#f4dccf', '#c29e98'], hairC: ['#f3eef2', '#a99abb'],
      body: ['#25222c', '#131118'], legs: ['#1d1a22', '#0f0d12'], boots: ['#3b2f2a', '#1c1513'],
      accent: '#4fae7a', skirt: ['#2a2631', '#141218'], eye: '#a98bff', collar: '#4fae7a',
    },
    // Eiryn with her mana partly back: same look, no branch, violet glyph hands.
    eirynMage: {
      h: 0.94, w: 0.86, build: 0.85, weapon: 'glyph', glyphHands: 'both', hair: 'long',
      skin: ['#f4dccf', '#c29e98'], hairC: ['#f3eef2', '#a99abb'],
      body: ['#25222c', '#131118'], legs: ['#1d1a22', '#0f0d12'], boots: ['#3b2f2a', '#1c1513'],
      accent: '#4fae7a', skirt: ['#2a2631', '#141218'], eye: '#a98bff', collar: '#4fae7a', glyph: GLYPH,
    },
    brute: {
      h: 1.12, w: 1.5, build: 1.45, weapon: 'fists', hair: 'bald',
      skin: ['#c3906f', '#7f5444'], hairC: ['#3a2a22', '#1c1410'],
      body: ['#4d3326', '#2a1b14'], legs: ['#2e2622', '#171310'], boots: ['#2a201b', '#140f0c'],
      wraps: ['#d9c8b4', '#8f7f70'], accent: '#8e1621', eye: '#e3263a', bareArms: true, sash: '#8e1621',
    },
    knife: {
      h: 0.98, w: 0.84, build: 0.82, weapon: 'knife', hair: 'messy',
      skin: ['#d8ab8c', '#94675a'], hairC: ['#171214', '#0a0708'],
      body: ['#3a2e2c', '#1d1616'], legs: ['#26201f', '#131010'], boots: ['#2a201c', '#140f0d'],
      scarf: ['#a3192a', '#5a0d17'], accent: '#e3263a', eye: '#e3263a',
    },
    grabber: {
      h: 1.0, w: 1.05, build: 1.05, weapon: 'fists', hair: 'hood',
      skin: ['#d2a283', '#8d6253'], hairC: ['#232019', '#100f0b'],
      body: ['#3e4635', '#20251b'], legs: ['#272820', '#131410'], boots: ['#2a221c', '#15110e'],
      hood: ['#353d2e', '#1a1e16'], accent: '#8e1621', eye: '#e3263a', belt: '#8e1621',
    },
    lookout: {
      h: 0.95, w: 0.9, build: 0.9, weapon: 'none', hair: 'short',
      skin: ['#d9b391', '#94705d'], hairC: ['#4a3426', '#22170f'],
      body: ['#4a4d52', '#26282b'], legs: ['#2d2c2c', '#161515'], boots: ['#2d241d', '#15110d'],
      accent: '#8e1621', eye: '#c9b6a6', belt: '#8e1621',
    },
    // ---- Proposals (placeholder designs for the author to approve).
    ren: {
      h: 0.98, w: 0.88, build: 0.84, weapon: 'twin', hair: 'messy',
      skin: ['#efd6cc', '#a98a88'], hairC: ['#1a1418', '#09070a'],
      body: ['#1d1416', '#0e0909'], legs: ['#181214', '#0b0809'], boots: ['#231a1a', '#100b0b'],
      coat: ['#5a1820', '#2c0a0f'], coatLen: 0.3, trim: '#8e1621', accent: '#e3263a', eye: '#e3263a',
      belt: '#3a2a26',
    },
    mara: {
      h: 0.95, w: 0.84, build: 0.8, weapon: 'glyph', glyphHands: 'L', hair: 'bob',
      skin: ['#f0d2c2', '#ae8a86'], hairC: ['#3d2b57', '#1d1430'],
      body: ['#1e1b26', '#0f0d14'], legs: ['#1a1820', '#0c0b10'], boots: ['#2a2230', '#140f18'],
      coat: ['#24202e', '#110f17'], coatLen: 0.05, coatW: 0.26, trim: GLYPH, accent: GLYPH, eye: GLYPH, glyph: GLYPH,
      belt: '#3a2f4a',
    },
    brannoc: {
      h: 0.8, w: 1.5, build: 1.42, headK: 1.28, weapon: 'hammer', off: 'shield', bash: true, hair: 'helm',
      skin: ['#e0b293', '#9a6c5a'], hairC: ['#a4502a', '#5e2a14'],
      body: ['#6c7782', '#363d45'], legs: ['#3a3430', '#1c1816'], boots: ['#4a3a2c', '#211912'],
      armor: ['#8792a0', '#3f4750'], sleeve: ['#5b6670', '#2e343a'], accent: '#9cc3dd', eye: '#9cc3dd',
      beard: ['#a4502a', '#5e2a14'], braids: true, pauldron: 'both', plate: true, belt: '#4a3a2c',
      shield: { r: 0.36, c: ['#5a3f2a', '#2e2015'], rimC: '#8792a0', boss: ['#c0c8d0', '#5b6772'] },
    },
    climber: {
      h: 1.05, w: 1.0, build: 0.98, weapon: 'greatsword', hair: 'hood', cowl: true,
      skin: ['#cfc6c4', '#6e6466'], hairC: ['#d8d3d4', '#7c7478'], hood: ['#d8d3d4', '#7c7478'],
      body: ['#2c2a30', '#151318'], legs: ['#232127', '#111014'], boots: ['#2a2328', '#131013'],
      cape: ['#c9c3c6', '#6f676c'], tatter: 7, trim: '#8e1621', accent: '#e3263a', eye: '#e3263a', glowEyes: 1,
      belt: '#8e1621',
    },
    shade: {
      h: 0.96, w: 0.92, build: 0.8, weapon: 'claws', hair: 'spiky', faceless: true, ghost: 0.88, wisp: true,
      cape: ['#1c1426', '#0a070e'], tatter: 9, capeLen: 0.22,
      skin: ['#1d1426', '#0b0710'], hairC: ['#231830', '#0d0812'], hood: ['#231830', '#0d0812'],
      body: ['#1c1424', '#0a070e'], legs: ['#170f1e', '#08050b'], boots: ['#120b18', '#060408'],
      accent: '#e3263a', eye: '#ff3a4c', glowEyes: 2, shards: ['#2a1d3a', '#0d0812'],
    },
    veil: {
      h: 1.8, w: 2.0, build: 2.0, form: 'veil', weapon: 'none', hair: 'hood',
      skin: ['#140c18', '#07050a'], hairC: ['#140c18', '#07050a'], hood: ['#140c18', '#07050a'],
      body: ['#140c18', '#07050a'], legs: ['#140c18', '#07050a'], boots: ['#140c18', '#07050a'],
      accent: '#e3263a', eye: '#ffffff',
    },
    goblin: {
      h: 0.7, w: 0.86, build: 0.8, headK: 1.4, weapon: 'knife', hair: 'bald', ears: true, hunch: 0.1,
      skin: ['#8a9670', '#525c42'], hairC: ['#2a2a1e', '#15150f'],
      body: ['#4f3f2e', '#2a2018'], legs: ['#3a3026', '#1e1813'], boots: ['#2e2419', '#17110c'],
      accent: '#8e1621', eye: '#f0c43a', belt: '#6b4c33', scraps: true,
    },
    goblinSpear: {
      h: 0.74, w: 0.9, build: 0.84, headK: 1.38, weapon: 'spear', hair: 'messy', ears: true, hunch: 0.08,
      skin: ['#7f8c6c', '#4b5440'], hairC: ['#1e1d16', '#0e0d0a'],
      body: ['#5a4632', '#2e2419'], legs: ['#3a3026', '#1e1813'], boots: ['#2e2419', '#17110c'],
      armor: ['#6b5a44', '#3a2f22'], pauldron: 'L', accent: '#8e1621', eye: '#f0c43a', sash: '#8e1621', scraps: true,
    },
    goblinArcher: {
      h: 0.7, w: 0.82, build: 0.78, headK: 1.4, weapon: 'bow', hair: 'hood', ears: true, hunch: 0.1,
      skin: ['#86926e', '#4f5940'], hairC: ['#3d3a2a', '#1d1b13'], hood: ['#3d3a2a', '#1d1b13'],
      body: ['#4a3e30', '#261f17'], legs: ['#352d24', '#1b1712'], boots: ['#2e2419', '#17110c'],
      accent: '#8e1621', eye: '#f0c43a', belt: '#6b4c33', quiver: true,
    },
    ogre: {
      h: 1.9, w: 2.1, build: 2.0, headK: 0.62, weapon: 'beam', hair: 'bald', stoop: 0.2, tusks: true,
      skin: ['#8f8a80', '#55514b'], hairC: ['#3a3530', '#1c1916'],
      body: ['#8f8a80', '#55514b'], legs: ['#7d786f', '#4a4640'], boots: ['#6e6a62', '#3f3c37'],
      skirt: ['#4d3a2a', '#271d15'], wraps: ['#5e4a38', '#2f251c'], bareArms: true, accent: '#8e1621', eye: '#e3263a',
      belt: '#3a2a1e', bareChest: true,
    },

    // ---- side missions, the Guild yard and the deep passage (all Proposals).
    // introPose(k, t): face-off pose (k = 1 in the spotlight, 0.55 otherwise).
    thug: {
      h: 1.07, w: 1.32, build: 1.3, weapon: 'cudgel', hair: 'messy',
      skin: ['#c99c7c', '#86604f'], hairC: ['#3b2a20', '#1c130e'],
      body: ['#4a4238', '#25211b'], legs: ['#33302b', '#191815'], boots: ['#2b221b', '#15100c'],
      coat: ['#5a4a36', '#2e251a'], coatLen: 0.26, coatW: 0.25, sleeve: ['#5a4a36', '#2e251a'],
      scarf: ['#7a2a24', '#3e1310'], beard: ['#3b2a20', '#1c130e'], patches: ['#7b6a4c', '#3f3526'],
      accent: '#8e1621', eye: '#c9b6a6', belt: '#2a1e16',
      introPose: (k) => ({ rel: 2.0, pitch: 1.25, stance: 1.5, crouch: 0.06 * k, twist: -0.2 * k, lean: 0.04, off: 'fistup' }),
    },
    // A big feral animal on all fours: drawn by its own rig (form 'beast').
    beast: {
      h: 0.78, w: 1.6, build: 1.7, form: 'beast',
      fur: ['#3d3431', '#1d1716'], mane: ['#1e1817', '#0c0909'], belly: ['#5e5049', '#302825'],
      skin: ['#6e5753', '#3a2b29'], gum: '#6b1a22', tooth: '#efe2cf', eye: '#ff3a4c', claw: '#e8dccb',
      body: ['#3d3431', '#1d1716'], legs: ['#3d3431', '#1d1716'], boots: ['#3d3431', '#1d1716'], hairC: ['#1e1817', '#0c0909'],
      accent: '#e3263a',
    },
    // A townsperson from before the Reset: pale, blue-grey, faceless,
    // dripping, flickering. (Not one of the Tower's fragments.)
    echo: {
      h: 0.95, w: 0.88, build: 0.84, weapon: 'none', hair: 'bob', ghost: 0.58, blank: true, wisp: true, drip: true,
      skin: ['#c3d1da', '#7d8f9c'], hairC: ['#9fb1be', '#5d6f7d'],
      body: ['#8696a3', '#4f5e6b'], legs: ['#7a8a97', '#465462'], boots: ['#6b7b88', '#3d4a57'],
      skirt: ['#7f909e', '#475766'],
      accent: '#c8e4f2', eye: '#d8f2ff', shawl: ['#a7b8c4', '#64788a'],
      introPose: (k, t) => ({ off: 'reach', rel: 0.1, pitch: -0.5, lean: -0.04 + Math.sin(t * 1.3) * 0.05, crouch: 0.02, stance: 0.8, twist: Math.sin(t * 0.9) * 0.15 * k }),
    },
    // The bell that rang for the drowned town, and the thing that carries it.
    warden: {
      h: 1.55, w: 1.75, build: 1.85, headK: 0.82, weapon: 'bell', hair: 'hood', cowl: true, stoop: 0.14,
      faceless: true, glowEyes: 2, eye: '#9fe8ff', weed: ['#3f5a47', '#1d2d24'], drip: true, coldGlow: '#7fd4ff',
      skin: ['#5c6e72', '#2c383c'], hairC: ['#2c3a3e', '#141c1f'], hood: ['#2f3d42', '#151d21'],
      body: ['#33434a', '#172126'], legs: ['#2a383e', '#121a1e'], boots: ['#24302f', '#101716'],
      cape: ['#2b3a40', '#121a1e'], tatter: 9, capeLen: 0.04, sleeve: ['#2f3f45', '#152024'],
      accent: '#9fe8ff', belt: '#4a3a24', wraps: ['#56685f', '#2a3630'],
      introPose: (k) => ({ rel: 2.3, pitch: 1.35, crouch: 0.08 * k, stance: 1.5, twist: -0.25 * k, lean: 0.02 }),
    },
    // A stone block driven by a violet glyph (form 'golem').
    golem: {
      h: 0.72, w: 1.3, build: 1.4, form: 'golem', glyph: GLYPH,
      stone: { lit: '#8a8178', shade: '#4f4842', top: '#a39a8e', dark: '#2f2a27' },
      skin: ['#8a8178', '#4f4842'], body: ['#8a8178', '#4f4842'], legs: ['#8a8178', '#4f4842'], boots: ['#8a8178', '#4f4842'], hairC: ['#8a8178', '#4f4842'],
      accent: GLYPH, eye: GLYPH,
    },
    goblinHexer: {
      h: 0.7, w: 0.82, build: 0.78, headK: 1.42, weapon: 'hexstick', caster: true, hair: 'hood', ears: true, hunch: 0.12,
      skin: ['#7f8d6d', '#4a5440'], hairC: ['#5a5140', '#2c271e'], hood: ['#5a5140', '#2c271e'],
      body: ['#6b6250', '#363024'], legs: ['#3a3026', '#1e1813'], boots: ['#2e2419', '#17110c'],
      cape: ['#635a48', '#302a20'], tatter: 7, capeLen: 0.12,
      accent: '#8e1621', eye: '#f0c43a', belt: '#6b4c33', scrawl: '#e070ff', hexGlow: '#e070ff',
      introPose: (k, t) => ({ off: 'cast', rel: 0.5, pitch: 1.15 + Math.sin(t * 6) * 0.08, crouch: 0.12 * k, stance: 1.4, lean: 0.06, twist: -0.2 * k }),
    },
    goblinChief: {
      h: 0.92, w: 1.28, build: 1.32, headK: 1.32, weapon: 'cleaver', hair: 'bald', ears: true, hunch: 0.12, crown: true,
      skin: ['#83916b', '#4b5640'], hairC: ['#2a2a1e', '#15150f'],
      body: ['#584631', '#2c2218'], legs: ['#3a3026', '#1e1813'], boots: ['#2e2419', '#17110c'],
      cape: ['#9a865f', '#574a33'], tatter: 6, capeLen: 0.14, sack: true,
      armor: ['#6e6a62', '#3a3732'], pauldron: 'L', accent: '#8e1621', eye: '#f0c43a', belt: '#6b4c33', sash: '#8e1621', scraps: true,
      introPose: (k) => ({ rel: 2.0, pitch: 1.2, stance: 1.7, crouch: 0.14 * k, twist: -0.3 * k, lean: 0.12, off: 'reach' }),
    },

    // ---- town folk for staged scenes (the tavern, Chapter One). Proposals.
    // A Guild adventurer who has taken contracts with Kael: practical
    // leathers, hair tied back, a spear she leans against the table.
    spearwoman: {
      h: 0.97, w: 0.9, build: 0.88, weapon: 'spear', hair: 'short', ponytail: true,
      skin: ['#e6c0a4', '#a07a68'], hairC: ['#7a3e22', '#3a1a0c'],
      body: ['#5e4432', '#2e2018'], legs: ['#2e2a26', '#161412'], boots: ['#3e2c1e', '#1c130c'],
      armor: ['#74563c', '#3a2a1c'], sleeve: ['#4a3a30', '#241c16'], pauldron: 'L', belt: '#2a1c12', strap: '#2a1c12',
      accent: '#9cc3dd', eye: '#6f8f62',
    },
    // The cook: apron, sleeves rolled to the elbow, a kerchief over the hair.
    cook: {
      h: 0.95, w: 1.16, build: 1.14, weapon: 'none', hair: 'hood', prop: 'bread',
      skin: ['#e8b898', '#a07460'], hairC: ['#a8452e', '#5a2014'], hood: ['#a8452e', '#5a2014'],
      body: ['#6e6252', '#3a3228'], sleeve: ['#d8ccb4', '#8a7e6a'], wraps: ['#e8b898', '#a07460'],
      legs: ['#3a302a', '#1c1814'], boots: ['#3a2a1e', '#1c130c'], skirt: ['#4a3a30', '#241c16'],
      apron: ['#e8e0cc', '#9a907c'], accent: '#a8452e', eye: '#6a4a30', belt: '#7a6a50',
    },
    // Tavern regulars and caravan guards; each unit id picks a variant
    // (hats, coats, colours) so a room of them never looks cloned.
    patron: {
      h: 0.97, w: 1.0, build: 1.0, weapon: 'none', hair: 'short', vary: true,
      skin: ['#dcae8e', '#966a58'], hairC: ['#4a3426', '#22170f'],
      body: ['#5a4a3a', '#2c241c'], legs: ['#33302b', '#191815'], boots: ['#2d241d', '#15110d'],
      accent: '#9cc3dd', eye: '#5a4a3a', belt: '#2a1e16',
      variants: [
        { hair: 'short', beard: ['#4a3426', '#22170f'], body: ['#5a4632', '#2c2218'], armor: ['#6e5a44', '#3a2f22'], pauldron: 'L', coat: ['#4a3a2a', '#241c14'], coatLen: 0.2, weapon: 'sword', strap: '#2a1e16' },
        { hair: 'short', hairC: ['#6a5a4a', '#352c22'], hat: { c: ['#6a5a3a', '#3a301e'], brim: 1.55 }, body: ['#4a5a44', '#262e22'], scarf: ['#8a6a3a', '#4a3618'], skin: ['#d4a07e', '#8e6450'] },
        { hair: 'bob', hairC: ['#2a1c18', '#120c0a'], body: ['#6e2a2a', '#381414'], shawl: ['#b09a70', '#6a5a40'], skirt: ['#3a2a2a', '#1c1414'], skin: ['#efcdb6', '#a88070'], h: 0.92, w: 0.86, build: 0.84 },
        { hair: 'messy', hairC: ['#c8a060', '#7a5a30'], hat: { c: ['#3a3430', '#1c1816'], brim: 0.7, cap: true }, body: ['#3a4a5a', '#1c242e'], scarf: ['#5a6a3a', '#2c3420'], h: 1.0 },
        { hair: 'bald', beard: ['#d8d0c4', '#8a8278'], body: ['#5a4a3a', '#2c241c'], coat: ['#3a3028', '#1c1814'], coatLen: 0.08, coatW: 0.26, skin: ['#d8a888', '#8e6452'], w: 1.12, build: 1.1 },
        { hair: 'long', hairC: ['#8a4a2a', '#4a2410'], body: ['#3a5a5a', '#1c2e2e'], skirt: ['#2e3a3a', '#161c1c'], belt: '#6a4a30', skin: ['#f0d0bc', '#a8847a'], h: 0.93, w: 0.86, build: 0.84 },
        { hair: 'short', hairC: ['#1e1612', '#0c0806'], hat: { c: ['#2a2420', '#141010'], brim: 1.25 }, coat: ['#5a3a28', '#2c1c12'], coatLen: 0.24, body: ['#3a3230', '#1c1818'], beard: ['#1e1612', '#0c0806'], w: 1.2, build: 1.2, h: 1.04, weapon: 'sword', strap: '#2a1e16' },
      ],
    },

    // ---- The new manuscript's heroes. Canon: Eiryn's long silver-white hair,
    // patched travel cloak, worn boots and invisible Pressure; Aerys's pale
    // loose hair, light from her palms, no wings, moving too lightly; Nox's
    // dark clothes and twin blades; Eloryn's satchel and bandages, the green
    // light of healing; Braxen's broad shoulders, bare hands and one altered
    // arm with bone shifting under the skin. Faces and colours are Proposals.
    // palms: 'pressure' | 'light' | 'heal' — power from the open hands.
    eirynAsh: {
      h: 0.95, w: 0.86, build: 0.85, weapon: 'none', palms: 'pressure', hair: 'long',
      skin: ['#f2dcd2', '#bb9c98'], hairC: ['#f4f0f2', '#a8a2b4'],
      body: ['#2c2a2e', '#151417'], legs: ['#232126', '#100f12'], boots: ['#4a3a2e', '#211912'],
      cape: ['#5a5046', '#2c2721'], tatter: 7, capeLen: 0.1, patches: ['#6e6252', '#3a3328'],
      accent: '#cfd8e6', eye: '#b9c4d6', belt: '#3a2e26', strap: '#3a2e26',
      introPose: (k) => ({ off: 'cast', rel: 0.2, pitch: 0.4 + 0.4 * k, lean: -0.04, crouch: 0.03, stance: 1.1, twist: -0.15 * k }),
    },
    aerys: {
      h: 0.9, w: 0.82, build: 0.78, weapon: 'none', palms: 'light', hair: 'long', float: 0.14,
      skin: ['#f8e8e0', '#c7a8a4'], hairC: ['#fbf3df', '#c9b88f'],
      body: ['#e6e0d4', '#9c958a'], legs: ['#3a3640', '#1c1a20'], boots: ['#5a4e44', '#2a241f'],
      skirt: ['#d8d0c2', '#8e877c'], sleeve: ['#e6e0d4', '#9c958a'], belt: '#b89a5a',
      accent: '#ffe7a8', eye: '#e8c46a',
      // Stillwing: open palms, a crescent stance.
      introPose: (k) => ({ off: 'out', rel: -0.6, pitch: 0.9, lean: -0.08, crouch: 0.14 * k, stance: 1.7, twist: -0.35 * k }),
    },
    nox: {
      h: 1.0, w: 0.88, build: 0.84, weapon: 'twin', hair: 'messy', afterimage: '#8f7bff',
      skin: ['#e8d0c4', '#a08480'], hairC: ['#1c1a24', '#09080d'],
      body: ['#1a1a22', '#0b0b10'], legs: ['#16161c', '#09090c'], boots: ['#1c1a1e', '#0c0b0d'],
      coat: ['#20202a', '#0e0e14'], coatLen: 0.3, scarf: ['#2a2838', '#12111a'], accent: '#8f7bff', eye: '#8f7bff',
      belt: '#2e2a36', blade: ['#c8ccd8', '#5e6274'], edge: '#b3a6ff',
      introPose: (k) => ({ rel: -0.9, pitch: -0.1, crouch: 0.26 * k, lean: 0.32, stance: 1.7, off: 'back', twist: 0.2 }),
    },
    eloryn: {
      h: 0.93, w: 0.86, build: 0.82, weapon: 'none', palms: 'heal', hair: 'messy', ponytail: true,
      skin: ['#efd2c2', '#ad8b82'], hairC: ['#6a4a34', '#33231a'],
      body: ['#7a7468', '#403c35'], legs: ['#3e3a34', '#1e1c19'], boots: ['#4a3a2c', '#211912'],
      skirt: ['#6a6458', '#36332c'], wraps: ['#e8e2d6', '#a39c90'], sleeve: ['#8a8476', '#46423a'],
      accent: '#a8f0c0', eye: '#7a9a6a', belt: '#5a4430', strap: '#5a4430', satchel: ['#7a5a3a', '#3e2c1c'],
      introPose: (k) => ({ off: 'cast', rel: 0.3, pitch: 0.2 + 0.3 * k, lean: 0.02, crouch: 0.06, stance: 1.1 }),
    },
    braxen: {
      h: 1.1, w: 1.55, build: 1.5, weapon: 'fists', hair: 'short', altered: 'R',
      skin: ['#d6a888', '#8e6452'], hairC: ['#2a2420', '#120f0d'],
      body: ['#4a4a44', '#262622'], legs: ['#33302c', '#191815'], boots: ['#3a2e24', '#1c1611'],
      bareArms: true, alteredC: ['#b39a8c', '#6e5a52'], bone: ['#efe6d6', '#9a8e7c'],
      accent: '#9cc3dd', eye: '#e8c547', belt: '#2a2018',
      introPose: (k) => ({ off: 'fistup', rel: 0.6, pitch: 1.0, stance: 1.7, crouch: 0.1 * k, twist: -0.25 * k, lean: 0.06 }),
    },

    // ---- The road's foes and the Tower (Proposals within the book's lines).
    // The Skyreaver: a winged sky-beast, the mother (form 'flyer').
    skyreaver: {
      h: 1.6, w: 2.2, build: 2.2, form: 'flyer',
      hide: ['#4a3a36', '#241a19'], belly: ['#6e5a50', '#3a2c27'], membrane: ['#3a2426', '#1a0f11'], bone: ['#cbbca8', '#7a6e60'],
      scar: '#b8a090', eye: '#ffc94a',
      skin: ['#4a3a36', '#241a19'], body: ['#4a3a36', '#241a19'], legs: ['#4a3a36', '#241a19'], boots: ['#4a3a36', '#241a19'], hairC: ['#2a1e1c', '#120c0b'],
      accent: '#e3263a',
    },
    // Pack predators of the ruined lowlands: the beast rig, smaller, ash-grey,
    // ribs showing through a mangy hide.
    ruinBeast: {
      h: 0.6, w: 1.2, build: 1.2, form: 'beast', size: 0.74, ribs: true,
      fur: ['#5a534c', '#2c2824'], mane: ['#2a2622', '#100e0c'], belly: ['#6e665c', '#3a3530'],
      skin: ['#7a6458', '#3e302a'], gum: '#5a1a1e', tooth: '#e8e0cc', eye: '#ff4a3a', claw: '#d8cfbe',
      body: ['#5a534c', '#2c2824'], legs: ['#5a534c', '#2c2824'], boots: ['#5a534c', '#2c2824'], hairC: ['#2a2622', '#100e0c'],
      accent: '#e3263a',
    },
    // It clings upside down; its limbs curve wherever the body needs them
    // instead of bending at joints; long fingers, two faint eyes (form 'crawler').
    nightCreature: {
      h: 1.2, w: 1.4, build: 1.4, form: 'crawler',
      hide: ['#1e1b1f', '#09080a'], pale: '#8a8590', eye: '#e8f6ec', claw: '#cfc8c0',
      skin: ['#1e1b1f', '#09080a'], body: ['#1e1b1f', '#09080a'], legs: ['#1e1b1f', '#09080a'], boots: ['#1e1b1f', '#09080a'], hairC: ['#1e1b1f', '#09080a'],
      accent: '#e3263a',
    },
    // Tower Floor One: frost knights wrapped in mist. Enclosed helms, a cold
    // light through the visor. blade: [base, shadow]; edge: the bright edge.
    knightSword: {
      h: 1.04, w: 1.02, build: 1.0, weapon: 'sword', hair: 'helm', faceless: true, glowEyes: 2, mist: true,
      skin: ['#c8d6e2', '#6e8294'], hairC: ['#c8d6e2', '#6e8294'],
      body: ['#b8c8d6', '#5e7284'], legs: ['#8ea2b4', '#46586a'], boots: ['#a8bacb', '#526476'],
      armor: ['#d6e2ec', '#7088a0'], sleeve: ['#a8bacb', '#526476'], wraps: ['#c0d0de', '#647a8e'],
      pauldron: 'both', plate: true, belt: '#46586a', accent: '#bfe8ff', eye: '#bfe8ff',
      blade: ['#e4f4ff', '#8ab4d0'], edge: '#ffffff', bladeLen: 1.2,
      introPose: (k) => ({ rel: 0.1, pitch: 1.3, crouch: 0.06 * k, stance: 1.45, lean: 0.02, twist: -0.1 * k }),
    },
    knightFist: {
      h: 1.16, w: 1.6, build: 1.6, weapon: 'fists', hair: 'helm', faceless: true, glowEyes: 2, mist: true, headK: 0.9,
      skin: ['#c8d6e2', '#6e8294'], hairC: ['#c8d6e2', '#6e8294'],
      body: ['#a8bacb', '#526476'], legs: ['#8ea2b4', '#46586a'], boots: ['#a8bacb', '#526476'],
      armor: ['#c8d6e2', '#6e8294'], sleeve: ['#9cb0c2', '#4c6072'], wraps: ['#b8c8d6', '#5e7284'],
      pauldron: 'both', plate: true, belt: '#46586a', accent: '#bfe8ff', eye: '#bfe8ff', knuckles: '#d6b25a',
      introPose: (k) => ({ off: 'fistup', rel: 0.6, pitch: 1.0, stance: 1.7, crouch: 0.12 * k, twist: -0.2 * k, lean: 0.08 }),
    },
    knightSpear: {
      h: 1.02, w: 0.8, build: 0.78, weapon: 'longspear', hair: 'helm', faceless: true, glowEyes: 2, mist: true, ponytail: true,
      skin: ['#c8d6e2', '#6e8294'], hairC: ['#e8f0f6', '#8aa0b4'],
      body: ['#b8c8d6', '#5e7284'], legs: ['#8ea2b4', '#46586a'], boots: ['#a8bacb', '#526476'],
      armor: ['#d6e2ec', '#7088a0'], sleeve: ['#a8bacb', '#526476'], skirt: ['#9cb0c2', '#4c6072'],
      pauldron: 'L', plate: true, belt: '#46586a', accent: '#bfe8ff', eye: '#bfe8ff',
      blade: ['#e4f4ff', '#8ab4d0'], edge: '#ffffff',
    },
    knightTwin: {
      h: 0.98, w: 0.92, build: 0.9, weapon: 'twin', hair: 'helm', faceless: true, glowEyes: 2, mist: true,
      skin: ['#c8d6e2', '#6e8294'], hairC: ['#c8d6e2', '#6e8294'],
      body: ['#a2b4c4', '#52667a'], legs: ['#8ea2b4', '#46586a'], boots: ['#a2b4c4', '#52667a'],
      armor: ['#b8c8d6', '#5e7284'], sleeve: ['#9cb0c2', '#4c6072'], wraps: ['#b8c8d6', '#5e7284'],
      belt: '#46586a', accent: '#bfe8ff', eye: '#bfe8ff',
      blade: ['#e4f4ff', '#8ab4d0'], edge: '#bfe8ff',
      introPose: (k) => ({ rel: -0.6, pitch: 0.1, crouch: 0.18 * k, lean: 0.2, stance: 1.5, off: 'back' }),
    },
    knightAxe: {
      h: 1.08, w: 0.78, build: 0.74, weapon: 'greataxe', hair: 'helm', faceless: true, glowEyes: 2, mist: true,
      skin: ['#c8d6e2', '#6e8294'], hairC: ['#c8d6e2', '#6e8294'],
      body: ['#a8bacb', '#526476'], legs: ['#8ea2b4', '#46586a'], boots: ['#a8bacb', '#526476'],
      armor: ['#c8d6e2', '#6e8294'], sleeve: ['#9cb0c2', '#4c6072'], wraps: ['#b8c8d6', '#5e7284'],
      pauldron: 'R', belt: '#46586a', accent: '#bfe8ff', eye: '#bfe8ff',
      blade: ['#e4f4ff', '#8ab4d0'], edge: '#ffffff',
      introPose: (k) => ({ rel: 2.2, pitch: 1.3, crouch: 0.06 * k, stance: 1.5, twist: -0.25 * k, lean: 0.02 }),
    },
    knightMaster: {
      h: 1.12, w: 1.12, build: 1.08, weapon: 'sword', hair: 'helm', faceless: true, glowEyes: 2, mist: true, horns: ['#2a3440', '#10161c'],
      skin: ['#8ea2b4', '#3e5062'], hairC: ['#8ea2b4', '#3e5062'],
      body: ['#7a90a4', '#344658'], legs: ['#5e7286', '#2a3a4a'], boots: ['#7a90a4', '#344658'],
      armor: ['#a8bacb', '#46586a'], sleeve: ['#6e8498', '#304254'], wraps: ['#8ea2b4', '#3e5062'],
      cape: ['#1c2630', '#0a0f14'], tatter: 9, capeLen: 0.03, spikes: true,
      pauldron: 'both', plate: true, belt: '#2a3a4a', accent: '#9fe8ff', eye: '#9fe8ff',
      blade: ['#e4f4ff', '#7aa6c4'], edge: '#ffffff', bladeLen: 1.3,
      introPose: (k) => ({ rel: 0.0, pitch: 1.42, crouch: 0.02, stance: 1.25, lean: -0.02, twist: -0.05 * k }),
    },
    // Floor Two: angelic in shape but wrong (form 'seraph').
    calamity: {
      h: 1.7, w: 1.4, build: 1.5, form: 'seraph',
      robe: ['#ddd3c0', '#8c826f'], skinS: ['#f0e6d8', '#b0a290'], hairS: ['#efe0b8', '#a8946a'], halo: '#e8c96a',
      water: '170,220,255', lava: '255,120,40',
      skin: ['#f0e6d8', '#b0a290'], body: ['#ddd3c0', '#8c826f'], legs: ['#ddd3c0', '#8c826f'], boots: ['#ddd3c0', '#8c826f'], hairC: ['#efe0b8', '#a8946a'],
      accent: '#e3263a', eye: '#ffffff',
    },
  };
  // One look per patron: the unit id's number (or a hash) picks the variant.
  const variantCache = new Map();
  function variantOf(L, id) {
    const m = /(\d+)$/.exec(id || '');
    let n = m ? Number(m[1]) : 0;
    if (!m) for (let i = 0; i < (id || '').length; i++) n = (n * 31 + id.charCodeAt(i)) % 997;
    const k = n % L.variants.length;
    let v = variantCache.get(k);
    if (!v) { v = Object.assign({}, L, L.variants[k]); variantCache.set(k, v); }
    return v;
  }
  const FALLBACK = LOOK.kael; // unknown keys draw as a plain swordsman
  // Looks the book's chapters add (js/book/*.js `looks`).
  function bookLook(key) {
    const B = window.TowBook || {};
    for (const id in B) if (B[id].looks && B[id].looks[key]) return B[id].looks[key];
    return null;
  }
  const lookOf = (key, id) => { const L = LOOK[key] || bookLook(key) || FALLBACK; return L.vary && id != null ? variantOf(L, id) : L; };

  // Weapon geometry: len in metres; grip: 'one' | 'two' (off hand on the grip)
  // | 'shaft' (off hand forward on a spear shaft).
  const WEAPON = {
    sword: { len: 1.1 }, branch: { len: 1.05 }, knife: { len: 0.36 }, twin: { len: 0.5 },
    hammer: { len: 0.78 }, greatsword: { len: 1.35, grip: 'two' }, beam: { len: 2.3, grip: 'two' },
    spear: { len: 1.5, grip: 'shaft', thrust: true }, claws: { len: 0.3 },
    longspear: { len: 2.7, grip: 'shaft', thrust: true }, greataxe: { len: 1.85, grip: 'two' },
    cudgel: { len: 0.82 }, cleaver: { len: 0.78 }, hexstick: { len: 0.8 }, bell: { len: 1.25, grip: 'two' },
  };

  // ------------------------------------------------------------------ pose
  // rel: weapon angle from facing; pitch: weapon elevation; lean; crouch;
  // off: off-hand mode; stance: foot spread multiplier.
  function pose(u, V) {
    const L = lookOf(u.key, u.id);
    const Wd = WEAPON[L.weapon];
    let rel = 0.75, pitch = 0.5, lean = 0, crouch = 0.03, off = 'guard', stance = 1, twist = 0;
    const a = u.act;
    const intro = V.introPhase;
    const caster = L.weapon === 'glyph' || L.weapon === 'bow' || L.caster || !!L.palms;
    const CB = window.TowRender && window.TowRender.combat;
    const AT = CB && !intro && u.state === 'attack' ? CB.attack(u, L, V) : null;
    let x = null;
    switch (u.state) {
      case 'attack':
        if (AT) {
          // The data-driven styles (js/render/combat.js): keyframed hand, weapon and body.
          const o = AT.o;
          lean = o.lean || 0; crouch = o.crouch == null ? 0.03 : o.crouch; stance = o.stance || 1; off = AT.off || 'guard';
          x = AT.bash ? Object.assign({ ph: AT.ph, e: AT.e, bash: true }, o) : Object.assign({ styled: true, ph: AT.ph, e: AT.e, lead: AT.lead, usesOff: AT.style.usesOff, foot: AT.style.foot, kickLeg: AT.kick }, o);
          if (AT.bash) {
            // legacy hands for the shield, new footwork and weight
            if (a.phase === 'windup' || a.phase === 'feint') { rel = 1.4; pitch = 1.3; } else if (a.phase === 'strike') { rel = 1.2; pitch = 1.2; } else { rel = 1.2; pitch = 1.2; }
            if (!L.bash) x = null;
          }
          break;
        }
        if (a.phase === 'windup' || a.phase === 'feint') {
          const k = a.phase === 'feint' ? 1 : Math.min(1, a.t / a.wind);
          const e = k * k * (3 - 2 * k);
          rel = 0.75 + e * 1.75; pitch = 0.5 + e * 0.6; lean = -0.16 * e; crouch = 0.03 + 0.1 * e; twist = -0.5 * e; stance = 1.3;
          if (L.bash) { rel = 1.4; pitch = 1.3; lean = -0.12 * e; twist = -0.3 * e; }
          if (caster) { lean = -0.06 * e; twist = -0.25 * e; off = 'cast'; }
        } else if (a.phase === 'strike') {
          const k = Math.min(1, a.t / Math.max(0.05, a.A.active));
          rel = 2.5 - k * 4.1; pitch = 0.15; lean = 0.32; crouch = 0.12; twist = 0.6; stance = 1.55;
          if (L.bash) { rel = 1.2; pitch = 1.2; lean = 0.36; twist = -0.2; }
          if (caster) { lean = 0.14; twist = 0.1; off = 'cast'; }
        } else {
          const k = Math.min(1, a.t / Math.max(0.05, a.A.recover));
          const e = 1 - Math.pow(1 - k, 2);
          rel = -1.6 + e * 2.35; pitch = 0.05 + e * 0.45; lean = 0.28 * (1 - e); crouch = 0.12 - 0.09 * e; twist = 0.6 * (1 - e); stance = 1.5 - 0.5 * e;
          if (L.bash) { rel = 1.2 - e * 0.45; pitch = 1.2 - e * 0.7; twist = 0; }
          if (caster) { lean = 0.1 * (1 - e); twist = 0; }
        }
        break;
      case 'parry': rel = 0.1; pitch = 1.1; lean = -0.06; crouch = 0.1; stance = 1.4; break;
      case 'dodge': lean = 0.35; crouch = 0.2; stance = 1.6; off = 'out'; break;
      case 'hurt': case 'stagger': rel = 1.8; pitch = -0.3; lean = -0.3; crouch = 0.05; off = 'flail'; break;
      case 'recover': rel = -0.7; pitch = 0.1; lean = 0.18; crouch = 0.08; break;
      case 'circle': rel = 0.6; pitch = 0.6; crouch = 0.1; stance = 1.3; break;
      case 'opener': lean = 0.38; crouch = 0.14; stance = 1.5; rel = 1.6; pitch = 0.2; off = 'back'; break;
      case 'distracted': twist = 1.1; rel = 0.4; pitch = 0.3; break;
      case 'cast': off = 'cast'; lean = 0.1; crouch = 0.05; stance = 1.2; break;
      case 'pickup': crouch = 0.32; lean = 0.25; off = 'down'; break;
      // Staged scenes: seated at a table (the hands follow u.gest).
      case 'sit': lean = 0.06; crouch = 0; stance = 1; break;
    }
    // Staged gestures lean the body a little.
    switch (u.gest) {
      case 'choke': lean = 0.3; break;
      case 'tip': lean = -0.2; break;
      case 'laugh': lean = -0.12 + Math.abs(Math.sin(V.time * 9)) * 0.06; break;
      case 'eat': lean = 0.12; break;
      case 'lean': lean = -0.1; break;
      case 'bow': lean = 0.22; break;
    }
    if (u.fleeing || u.beaten) { rel = 2.9; pitch = 1.2; lean = 0.32; crouch = 0.08; off = 'flail'; }
    if (u.drained > 0) { pitch -= 0.6; lean = 0.24; crouch = 0.14; off = 'knee'; }
    if (intro) {
      // Face-off: a signature pose, stronger in the spotlight.
      const k = V.spotlight === u.id || V.spotlight === u.team ? 1 : 0.55;
      switch (u.key) {
        case 'kael': rel = 0.25; pitch = 1.25 * k + 0.2; crouch = 0.12 * k; stance = 1.5; lean = 0.05; break;
        case 'eiryn': off = 'cast'; lean = -0.12; crouch = 0.04; break;
        case 'brute': off = 'fistup'; rel = 0.6; pitch = 1.0; stance = 1.6; crouch = 0.08 * k; twist = -0.2; break;
        case 'knife': rel = -0.4 + Math.sin(V.time * 9) * 0.5 * k; pitch = 0.3; crouch = 0.2 * k; stance = 1.5; lean = 0.12; break;
        case 'grabber': crouch = 0.24 * k; lean = 0.3; off = 'reach'; rel = 0.3; pitch = 0.1; stance = 1.4; break;
        case 'lookout': twist = 1.3; crouch = 0.06; lean = -0.05; break;
        // Proposals
        case 'ren': rel = -0.9; pitch = -0.1; crouch = 0.24 * k; lean = 0.34; stance = 1.7; off = 'back'; twist = 0.2; break;
        case 'mara': off = 'cast'; rel = 0.2; pitch = 0.4 + 0.5 * k; lean = -0.04; crouch = 0.03; stance = 1.15; twist = -0.25 * k; break;
        case 'eirynMage': off = 'cast'; rel = 0.3; pitch = 0.9 * k; lean = -0.1; crouch = 0.04; break;
        case 'brannoc': off = 'guard'; rel = 1.5; pitch = 1.35; stance = 1.7; crouch = 0.1 * k; lean = 0.06; break;
        case 'climber': rel = 0.15; pitch = 1.35; crouch = 0.1 * k; lean = 0.08; stance = 1.6; twist = -0.3 * k; break;
        case 'shade': crouch = 0.28 * k; lean = 0.36; off = 'reach'; rel = -0.2; pitch = 0.0; stance = 1.6; twist = Math.sin(V.time * 5) * 0.2; break;
        case 'goblin': rel = -0.4 + Math.sin(V.time * 11) * 0.4 * k; pitch = 0.4; crouch = 0.22 * k; stance = 1.5; lean = 0.2; break;
        case 'goblinSpear': crouch = 0.14 * k; stance = 1.6; lean = 0.12; break;
        case 'goblinArcher': off = 'cast'; crouch = 0.06; stance = 1.35; lean = -0.02; break;
        case 'ogre': rel = 2.2; pitch = 1.35; crouch = 0.08 * k; stance = 1.5; twist = -0.25 * k; lean = 0.02; break;
      }
      // Newer figures carry their face-off pose in their LOOK entry.
      if (L.introPose) ({ rel, pitch, lean, crouch, off, stance, twist } = Object.assign({ rel, pitch, lean, crouch, off, stance, twist }, L.introPose(k, V.time)));
      // A hero's signature beat (intro.js) overrides the stance while it plays.
      const o = V.introPose && V.introPose(u);
      if (o) ({ rel = rel, pitch = pitch, lean = lean, crouch = crouch, off = off, stance = stance, twist = twist } = o);
    }
    if (L.weapon === 'fists' && off === 'guard') off = 'fistup';
    if (Wd && Wd.thrust && !(u.fleeing || u.beaten) && u.state !== 'hurt' && u.state !== 'stagger') { rel = 0.12; pitch = 0.1; }
    // Reactions: the body folds with the blow, stumbles, falls, rolls away or braces.
    if (CB && !intro && !x) {
      const R = CB.react(u, L, V);
      if (R) {
        x = R.o;
        if (R.patch) { if (R.patch.off) off = R.patch.off; if (R.patch.stance) stance = R.patch.stance; }
        lean = x.lean != null ? x.lean : lean;
        if (x.crouch != null) { crouch = x.crouch; }
      }
    }
    return { rel, pitch, lean, crouch, off, stance, twist, x };
  }

  // Attack progress for hand placement: phase and eased 0..1.
  function attackK(u) {
    const a = u.act;
    if (u.state !== 'attack' || !a) return null;
    if (a.phase === 'windup' || a.phase === 'feint') {
      const k = a.phase === 'feint' ? 1 : Math.min(1, a.t / a.wind);
      return { ph: 'wind', e: k * k * (3 - 2 * k) };
    }
    if (a.phase === 'strike') return { ph: 'strike', e: 1 };
    const k = Math.min(1, a.t / Math.max(0.05, a.A.recover));
    return { ph: 'rec', e: 1 - Math.pow(1 - k, 2) };
  }

  function create(V) {
    const { ctx } = V;
    const P = V.P;
    const springs = new WeakMap(); // per unit: hair/cloth lag

    function spring(u) {
      let sp = springs.get(u);
      if (!sp) { sp = { hx: 0, hy: 0, cx: 0, cy: 0 }; springs.set(u, sp); }
      return sp;
    }

    function update(s, dt) {
      const CB = window.TowRender && window.TowRender.combat;
      if (CB) { CB.noteEvents(s); if (dt) CB.tick(s, dt); }
      if (!dt) return;
      for (const u of s.units) {
        const sp = spring(u);
        // Hair and cloth trail opposite to motion, with a little sway.
        const tx = -u.vx * 0.09 - u.kx * 0.05, ty = -u.vy * 0.09 - u.ky * 0.05;
        const k = 1 - Math.pow(0.0008, dt);
        sp.hx += (tx - sp.hx) * k; sp.hy += (ty - sp.hy) * k;
        sp.cx += (tx * 1.3 - sp.cx) * k * 0.8; sp.cy += (ty * 1.3 - sp.cy) * k * 0.8;
      }
    }

    // ---------------------------------------------------------------- shapes
    let lx = -0.55, ly = -0.835, inkW = 2;

    // Tapered segment between two screen points.
    function seg(a, b, wa, wb) {
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l;
      return { a, b, wa, wb, nx, ny, kind: 'seg' };
    }
    function pathSeg(sh) {
      const { a, b, wa, wb, nx, ny } = sh;
      ctx.moveTo(a.x + nx * wa, a.y + ny * wa);
      ctx.lineTo(b.x + nx * wb, b.y + ny * wb);
      ctx.arc(b.x, b.y, wb, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
      ctx.lineTo(a.x - nx * wa, a.y - ny * wa);
      ctx.arc(a.x, a.y, wa, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
      ctx.closePath();
    }
    function pathPoly(pts) {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
    }
    function pathShape(sh) {
      if (sh.kind === 'seg') pathSeg(sh);
      else if (sh.kind === 'poly') pathPoly(sh.pts);
      else if (sh.kind === 'ell') ctx.ellipse(sh.x, sh.y, sh.rx, sh.ry, sh.rot || 0, 0, Math.PI * 2);
    }
    // The half of a shape that faces away from the light, as a hard cel shadow.
    function pathShadow(sh) {
      if (sh.kind === 'seg') {
        const { a, b, wa, wb } = sh;
        let { nx, ny } = sh;
        if (nx * lx + ny * ly > 0) { nx = -nx; ny = -ny; }
        const f = 0.12;
        ctx.moveTo(a.x + nx * wa * f, a.y + ny * wa * f);
        ctx.lineTo(b.x + nx * wb * f, b.y + ny * wb * f);
        ctx.lineTo(b.x + nx * wb, b.y + ny * wb);
        ctx.lineTo(a.x + nx * wa, a.y + ny * wa);
        ctx.closePath();
      } else if (sh.kind === 'ell') {
        const off = Math.min(sh.rx, sh.ry) * 0.38;
        ctx.save(); ctx.beginPath();
        ctx.ellipse(sh.x, sh.y, sh.rx, sh.ry, sh.rot || 0, 0, Math.PI * 2); ctx.clip();
        ctx.beginPath();
        ctx.ellipse(sh.x - lx * off * 2.2, sh.y - ly * off * 2.2, sh.rx * 1.05, sh.ry * 1.05, sh.rot || 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
      } else if (sh.kind === 'poly' && sh.shadeFrom != null) {
        // shadeFrom: polygon split; first half of points is the lit side
        const pts = sh.pts;
        ctx.moveTo(pts[sh.shadeFrom[0]].x, pts[sh.shadeFrom[0]].y);
        for (const i of sh.shadeFrom.slice(1)) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
      }
    }
    function pathRim(sh) {
      if (sh.kind !== 'seg') return;
      const { a, b, wa, wb } = sh;
      let { nx, ny } = sh;
      if (nx * lx + ny * ly < 0) { nx = -nx; ny = -ny; }
      ctx.moveTo(a.x + nx * wa * 0.78, a.y + ny * wa * 0.78);
      ctx.lineTo(b.x + nx * wb * 0.78, b.y + ny * wb * 0.78);
    }

    // Hit flash: the base colour pushed most of the way to white.
    const lightCache = {};
    function lighten(hex) {
      if (lightCache[hex]) return lightCache[hex];
      const n = parseInt(hex.slice(1), 16);
      const m = (c) => Math.round(c + (255 - c) * 0.7);
      return (lightCache[hex] = `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`);
    }
    const rgbaCache = {};
    function rgba(hex, a) {
      const key = hex + a;
      if (rgbaCache[key]) return rgbaCache[key];
      const n = parseInt(hex.slice(1), 16);
      return (rgbaCache[key] = `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`);
    }

    // Draw a layer of shapes: ink outline under everything, then fills,
    // shadows and rim light. Shapes: {…geometry, c: [base, shadow], rim}
    function layer(shapes, flash) {
      if (!shapes.length) return;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 2;
      for (const sh of shapes) { ctx.beginPath(); pathShape(sh); ctx.stroke(); ctx.fill(); }
      for (const sh of shapes) {
        ctx.fillStyle = flash ? lighten(sh.c[0]) : sh.c[0];
        ctx.beginPath(); pathShape(sh); ctx.fill();
        if (!flash && sh.c[1]) {
          ctx.fillStyle = sh.c[1];
          ctx.beginPath(); pathShadow(sh); ctx.fill();
        }
      }
      if (!flash) {
        ctx.strokeStyle = 'rgba(246,236,232,0.55)'; ctx.lineWidth = Math.max(0.8, inkW * 0.55);
        ctx.beginPath();
        for (const sh of shapes) if (sh.rim !== false) pathRim(sh);
        ctx.stroke();
      }
    }

    // A small hash so per-unit flicker is stable but not in sync.
    function hashId(id) { let h = 7; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997; return h; }

    // ---------------------------------------------------------------- figure
    let curS = null;
    // The sim moves a lunging fighter in one jump on the contact frame; the picture
    // glides there through the last of the wind-up so the blow arrives with the body.
    function drawUnit(u, s) {
      const CB = window.TowRender && window.TowRender.combat;
      const k = CB && u.act ? CB.lunge(u) : 0, A = u.act && u.act.A;
      if (k > 0 && A && A.lunge && !A.projectile) {
        const ox = u.x, oy = u.y, d = A.lunge * k;
        u.x += Math.cos(u.facing) * d; u.y += Math.sin(u.facing) * d;
        try { drawUnitInner(u, s); } finally { u.x = ox; u.y = oy; }
      } else if (u.lift > 0) {
        const c = V.ctx, up = u.lift * V.cam.sc;
        c.save(); c.translate(0, -up);
        try { drawUnitInner(u, s); } finally { c.restore(); }
      } else drawUnitInner(u, s);
    }
    function drawUnitInner(u, s) {
      if (u.fled) return;
      curS = s;
      const L = lookOf(u.key, u.id);
      const sc = V.cam.sc;
      lx = V.light.sx; ly = V.light.sy;
      inkW = Math.max(1, sc * 0.022);
      V.introPhase = s.phase === 'intro';
      // a fighter who has just been floored is still falling for the first moments
      const falling = u.state === 'down' && u.st < 0.22 && !V.introPhase && (L.form == null) && !L.ghost;
      const lying = (u.state === 'down' || u.state === 'out') && !falling;
      if (L.form === 'veil') { drawVeil(u, L, sc); return; }
      if (L.form === 'beast') { drawBeast(u, L, sc); return; }
      if (L.form === 'golem') { drawGolem(u, L, sc); return; }
      if (L.form === 'flyer') { drawFlyer(u, L, sc, s); return; }
      if (L.form === 'crawler') { drawCrawler(u, L, sc); return; }
      if (L.form === 'seraph') { drawSeraph(u, L, sc, s); return; }
      if (L.coldGlow && u.state !== 'out') coldPool(u, L, sc);
      V.shadow(u.x, u.y, u.r * 1.3 * (lying ? 1.7 : 1) * L.build ** 0.5 / (L.build > 1.6 ? 1.2 : 1), L.ghost ? 0.25 : L.float && !lying ? 0.28 : 0.42);
      // Whose side: a ring on the ground, blue for the team, red for the foe; the one you follow is brighter.
      if (!s.stageHandle && s.phase === 'fight' && !s.cutscene && !lying && !L.ghost) {
        const p = V.P(u.x, u.y, 0), hero = u.team === 'hero', lead = s.lead === u || V.follow === u.id;
        ctx.save(); ctx.lineWidth = Math.max(1.5, sc * (lead ? 0.06 : 0.04));
        ctx.strokeStyle = hero ? `rgba(143,196,255,${lead ? 0.95 : 0.6})` : 'rgba(255,74,92,0.55)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y, u.r * 1.6 * sc, u.r * 1.6 * sc * V.cam.pitch, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      if (L.mist && u.state !== 'out') drawMist(u, L, sc, false);
      // Shadow-step: fading afterimages trail a fast mover.
      if (L.afterimage && !lying && !V.introPhase) {
        const spd = Math.hypot(u.vx || 0, u.vy || 0);
        if (spd > 3 || u.state === 'dodge' || u.state === 'opener') {
          const k = Math.min(1, spd / 7) || 0.6;
          const dx = spd > 0.1 ? u.vx / spd : -Math.cos(u.facing), dy = spd > 0.1 ? u.vy / spd : -Math.sin(u.facing);
          for (const [d, a] of [[0.75, 0.16], [0.4, 0.28]]) {
            const g = Object.create(u);
            g.x = u.x - dx * d * k; g.y = u.y - dy * d * k; g.flash = 0;
            ctx.globalAlpha = a;
            drawStanding(g, L, sc);
          }
          ctx.globalAlpha = 1;
        }
      }
      let alpha = u.state === 'out' ? 0.6 : 1;
      if (L.ghost) {
        // Fragments flicker: mostly solid, with brief drop-outs. (Drawn
        // straight to the canvas; an offscreen pass per fragment cost too much.)
        const t = V.time * 9 + hashId(u.id);
        alpha *= L.ghost + 0.06 * Math.sin(t * 2.3) + (Math.sin(t * 0.7) > 0.93 ? -0.4 : 0);
      }
      ctx.globalAlpha = Math.max(0.15, alpha);
      if (!spriteBody(u, L, s, lying)) {
        if (lying) drawLying(u, L, sc);
        else drawStanding(u, L, sc);
      }
      ctx.globalAlpha = 1;
      if (L.mist && u.state !== 'out') drawMist(u, L, sc, true);
      if (L.afterimage && !lying) shadowFlicker(u, L, sc, s);
    }

    // Sprite characters (js/sprites.js, assets/characters/): a character with sprite art is
    // drawn from it everywhere: scenes, the title, face-offs and fights. Each state plays the
    // clip made for it, else the nearest clip that exists (no artwork is invented):
    //   attack -> attack (timed to the fight's wind-up, hit and recovery) or the combat idle;
    //   parry, hit, stagger -> block / hit, else the combat idle with a small recoil;
    //   dodge -> dodge, else the run or walk; down, out -> down / ko, else she sinks onto her side.
    // Scenes add a life layer: the walk turns toward whoever is talking, the pace eases in and
    // out, still poses breathe. Gestures, props and sitting have no sprite art yet and keep the
    // drawn body.
    const SPR = new WeakMap();
    const REST_GEST = { cross: 1, hips: 1, lean: 1 };
    const angD = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
    const clamp1 = (v, a, b) => Math.max(a, Math.min(b, v));
    // Who this unit is in conversation with: the speaker, or (if it is speaking) the nearest listener.
    function talkPartner(u, s) {
      const spk = s.stageSpeaker;
      if (!spk) return null;
      let best = null, bd = 6;
      for (const o of s.units) {
        if (o === u || o.fled) continue;
        if (spk !== u.id && o.id !== spk) continue;
        const d = Math.hypot(o.x - u.x, o.y - u.y);
        if (d < bd) { bd = d; best = o; }
      }
      return best;
    }
    // The frame of a phased clip (wind-up, hit, recover) for where the unit is in its attack.
    function phaseIndex(anim, u) {
      const ph = anim.phases, a = u.act;
      if (!ph || !a) return null;
      const at = (r, k) => Math.round(r[0] + (r[1] - r[0]) * clamp1(k, 0, 1));
      if (a.phase === 'windup') return at(ph.windup, a.t / Math.max(0.01, a.wind));
      if (a.phase === 'feint') return ph.windup[1];
      if (a.phase === 'strike') return at(ph.strike, a.t / Math.max(0.01, a.A.active));
      return at(ph.recover, a.t / Math.max(0.01, a.A.recover));
    }
    function spriteBody(u, L, s, lying) {
      const Sp = window.TowSprites;
      if (!Sp) return false;
      const scene = !!s.stageHandle;
      const man = Sp.forUnit ? Sp.forUnit(u, { scene, theme: s.arena && s.arena.theme }) : Sp.get(u.key);
      if (!man || !man.ready) return false;
      if (man.pixel) return pixelBody(u, s, lying, man, scene);
      if (scene && ((u.gest && !REST_GEST[u.gest]) || u.prop || u.state === 'sit' || u.state === 'pickup')) return false;
      const has = (n) => !!(man.animations[n] && man.animations[n].frames);
      const speed = Math.hypot(u.vx || 0, u.vy || 0);
      const st = u.state;
      const moving = speed > 0.25 && st !== 'attack' && st !== 'parry' && st !== 'hurt' && st !== 'stagger' && !lying;
      const still = scene ? ['idle', 'base'] : ['idle_combat', 'idle', 'base'];
      let names, react = null;
      if (lying) { names = ['down', 'ko'].filter(has).concat(still); react = has('down') || has('ko') ? null : 'lie'; }
      else if (st === 'attack') names = ['attack'].concat(still);
      else if (st === 'cast') names = ['cast', 'idle_combat', 'idle', 'base'];
      else if (st === 'parry') { names = ['block'].concat(still); react = has('block') ? null : 'parry'; }
      else if (st === 'hurt' || st === 'stagger') { names = ['hit'].concat(still); react = has('hit') ? null : 'hit'; }
      else if (st === 'dodge') names = ['dodge', 'run', 'walk'].concat(still);
      else if (moving) names = (speed > 2.4 ? ['run', 'walk'] : ['walk', 'run']).concat(still);
      else names = still;
      // Which way the body is seen: where it's going when it moves (unless strafing slowly in a
      // fight), where it faces otherwise; in scenes a walker turns toward the conversation.
      let face = u.facing;
      if (moving && (scene || speed > 1.6 || st === 'dodge')) face = Math.atan2(u.vy, u.vx);
      if (scene) {
        const p = talkPartner(u, s);
        if (p) { const d = angD(face, Math.atan2(p.y - u.y, p.x - u.x)); face += clamp1(d, -0.8, 0.8); }
      }
      const dir = Sp.dirFor(face, V.cam.ang);
      const name = Sp.pickAnim(man, names, dir);
      if (!name) return false;
      let A = SPR.get(u);
      if (!A || A.man !== man) { A = Sp.animator(man); A.last = V.time; A.rate = 1; A.lie = lying ? 1 : 0; SPR.set(u, A); }
      const dt = Math.max(0, Math.min(0.1, V.time - A.last));
      A.last = V.time;
      Sp.play(A, name, st === 'attack' || st === 'hurt' || st === 'parry' ? { blend: 0.05 } : null);
      // The walk cycle keeps pace with the ground, easing in and out instead of snapping.
      const anim = man.animations[name];
      const want = anim.speedMps ? clamp1(speed / anim.speedMps, 0.6, 1.8) : st === 'dodge' ? 1.8 : 1;
      A.rate += (want - A.rate) * Math.min(1, dt * 6);
      Sp.advance(A, dt * A.rate);
      A.lie += ((react === 'lie' ? 1 : 0) - A.lie) * Math.min(1, dt * 7);
      let smps = Sp.sample(A, dir);
      // Attacks follow the fight's own timing: the hit lands on the clip's hit frame.
      const pi = st === 'attack' && name === 'attack' ? phaseIndex(anim, u) : null;
      if (pi != null) { const r = Sp.resolveDir(man, anim, dir); const fr = r && anim.frames[r.dir]; if (fr) smps = [{ anim: name, dir: r.dir, flip: r.flip, frame: fr[Math.min(fr.length - 1, pi)], alpha: 1 }]; }
      const p = P(u.x, u.y, 0), hpx = 1.78 * L.h * V.cam.sc * 0.9;
      const t = V.time + hashId(u.id) * 0.13;
      // Small motion on borrowed or held poses: breathing, recoil, a parry lean, sinking down.
      const screenFace = Math.cos(face + V.cam.ang) >= 0 ? 1 : -1;
      let rot = 0, sx = 1, sy = 1, ox = 0;
      if (!moving && !lying) sy = 1 + (u.drained > 0 ? 0.012 : 0.006) * Math.sin(t * (u.drained > 0 ? 1.4 : 2.1));
      if (u.drained > 0 && !lying) rot = 0.035 * screenFace;
      if (react === 'hit') { const k = Math.max(0, 1 - u.st / Math.max(0.2, u.dur || 0.4)); rot = -0.12 * k * screenFace; ox = -hpx * 0.05 * k * screenFace; }
      if (react === 'parry') { const k = Math.sin(Math.min(1, u.st / 0.3) * Math.PI); rot = -0.06 * k * screenFace; }
      if (A.lie > 0.01) { rot = (Math.PI / 2 - 0.1) * A.lie * -screenFace; sy *= 1 - 0.35 * A.lie; }
      ctx.save();
      ctx.translate(p.x + ox, p.y);
      if (rot) ctx.rotate(rot);
      if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
      const flash = u.flash > 0 && 'filter' in ctx;
      if (flash) ctx.filter = 'brightness(2.2)';
      for (const smp of smps) Sp.drawFrame(ctx, man, smp, 0, 0, hpx);
      if (flash) ctx.filter = 'none';
      ctx.restore();
      return true;
    }

    // Pixel characters (Character Creator, js/sprites.js): every state has a creator clip.
    //   attack -> the set's attacks, alternating through a combo, the hit on the clip's contact frame;
    //   cast -> the hand push; parry -> the guard stance with a lean; hurt, stagger -> TakeDamage;
    //   dodge -> the roll; down -> falls and gets up (Slide); out -> Die; a heavy art -> Special1,
    //   its contact on the impact; circling -> strafe steps, backing off -> the backwards run;
    //   a won fight -> the taunt. Scenes: sitting -> crouched behind the table, pointing -> the
    //   hand thrust held, other gestures -> the relaxed idle. Frames don't crossfade (pixel art).
    const clamp01 = (v) => clamp1(v, 0, 1);
    function pixelBody(u, s, lying, man, scene) {
      const Sp = window.TowSprites;
      const has = (n) => !!man.animations[n];
      const speed = Math.hypot(u.vx || 0, u.vy || 0);
      const st = u.state;
      const art = s.cutscene && s.cutscene.unit === u ? s.cutscene : null;
      const moving = speed > 0.25 && !art && st !== 'attack' && st !== 'parry' && st !== 'hurt' && st !== 'stagger' && st !== 'dodge' && !lying;
      const won = s.result && s.result.outcome === 'win' && u.team === 'hero' && !lying;
      const stance = scene || u.def && u.def.noncombat ? 'idle' : 'idle_combat';
      let name = stance, face = u.facing, timed = null; // timed: 0..1 through the clip, from the sim
      if (art) { name = 'heavy'; }
      else if (st === 'out') name = 'ko';
      else if (st === 'down') { name = 'down'; timed = u.st / Math.max(0.3, u.dur || 1.2); }
      else if (st === 'attack') name = u.combo % 2 === 1 && has('attack2') ? 'attack2' : 'attack';
      else if (st === 'cast') { name = 'cast'; timed = u.st / Math.max(0.2, u.dur || 0.6); }
      else if (st === 'hurt' || st === 'stagger') { name = 'hit'; timed = u.st / Math.max(0.2, u.dur || 0.4); }
      else if (st === 'dodge') { name = 'dodge'; timed = u.st / Math.max(0.2, u.dur || 0.44); face = u.dodgeDir == null ? face : u.dodgeDir; }
      else if (st === 'sit' || st === 'pickup') name = 'crouch';
      else if (moving) {
        const va = Math.atan2(u.vy, u.vx);
        // In a fight a fighter circles its foe facing it: step sideways or back off.
        const rel = angD(u.facing, va);
        if (!scene && (st === 'circle' || speed < 2.2) && Math.abs(rel) > 0.7) {
          name = Math.abs(rel) > 2.3 && has('back') ? 'back' : rel > 0 ? 'strafe_r' : 'strafe_l';
        } else { name = speed > 2.4 ? 'run' : 'walk'; face = va; }
      } else if (won) name = 'victory';
      else if (scene && u.gest === 'point') { name = 'point'; timed = 0.25; }
      else if (scene && u.gest && !REST_GEST[u.gest]) name = 'idle_alt';
      if (!has(name)) name = has(stance) ? stance : 'idle';
      if (scene && !moving) {
        const p = talkPartner(u, s);
        if (p) { const d = angD(face, Math.atan2(p.y - u.y, p.x - u.x)); face += clamp1(d, -0.8, 0.8); }
      }
      const dir = Sp.dirFor(face, V.cam.ang);
      let A = SPR.get(u);
      if (!A || A.man !== man) { A = Sp.animator(man); A.last = V.time; A.rate = 1; SPR.set(u, A); }
      const dt = Math.max(0, Math.min(0.1, V.time - A.last));
      A.last = V.time;
      Sp.play(A, name, { blend: 0 });
      const anim = man.animations[name];
      // Walk and run keep pace with the ground.
      const want = name === 'walk' ? clamp1(speed / 1.7, 0.6, 1.6) : name === 'run' ? clamp1(speed / 4.4, 0.7, 1.5) : 1;
      A.rate += (want - A.rate) * Math.min(1, dt * 6);
      Sp.advance(A, dt * A.rate);
      const r = Sp.resolveDir(man, anim, dir);
      if (!r) return false;
      const fr = anim.frames[r.dir];
      let i;
      if (art) {
        // The heavy art: the wind-up fills the build-up, the contact frame lands on the impact.
        const ph = anim.phases;
        i = art.t < art.impactAt ? Math.round(ph.windup[1] * clamp01(art.t / art.impactAt))
          : Math.round(ph.strike[0] + (ph.recover[1] - ph.strike[0]) * clamp01((art.t - art.impactAt) / Math.max(0.2, art.dur - art.impactAt)));
      } else if (st === 'attack' && anim.phases) i = phaseIndex(anim, u);
      else if (timed != null) i = Math.floor(clamp01(timed) * (fr.length - 1));
      else i = Sp.frameIndex(anim, fr.length, A.t, null);
      const smp = { anim: name, dir: r.dir, flip: r.flip, frame: fr[clamp1(i | 0, 0, fr.length - 1)], alpha: 1 };
      const p = P(u.x, u.y, 0), hpx = 1.78 * V.cam.sc * 0.9 * man.scale;
      const screenFace = Math.cos(face + V.cam.ang) >= 0 ? 1 : -1;
      let rot = 0;
      if (st === 'parry') rot = -0.07 * Math.sin(Math.min(1, u.st / 0.3) * Math.PI) * screenFace;
      if (u.drained > 0 && !lying) rot = 0.035 * screenFace;
      ctx.save();
      ctx.translate(p.x, p.y);
      if (rot) ctx.rotate(rot);
      const flash = u.flash > 0 && 'filter' in ctx;
      if (flash) ctx.filter = 'brightness(2.2)';
      Sp.drawFrame(ctx, man, smp, 0, 0, hpx);
      if (flash) ctx.filter = 'none';
      ctx.restore();
      return true;
    }

    // Frost mist wrapped round a knight's legs, trailing behind as it moves.
    function drawMist(u, L, sc, front) {
      const sp = spring(u), t = V.time * 0.7 + hashId(u.id) * 0.13;
      const lg = clampLag(sp, 0.4);
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const ph = (t * 0.45 + i / 7) % 1;
        const a = i * 1.9 + t * 0.5;
        const rr = 0.22 + ph * 0.35;
        const x = u.x + Math.cos(a) * rr + lg.x * (1 + ph * 3), y = u.y + Math.sin(a) * rr * 0.7 + lg.y * (1 + ph * 3);
        const near = Math.sin(a) > 0;
        if (near !== front) continue;
        // a curl of mist: a short soft arc drifting up and thinning
        const q = P(x, y, 0.1 + ph * 0.7), w = sc * (0.22 + ph * 0.25);
        const al = 0.3 * Math.sin(ph * Math.PI) * (front ? 0.75 : 1);
        ctx.strokeStyle = `rgba(214,236,250,${(al * 0.5).toFixed(3)})`; ctx.lineWidth = Math.max(3, sc * 0.12);
        ctx.beginPath(); ctx.moveTo(q.x - w, q.y); ctx.quadraticCurveTo(q.x, q.y - w * 0.35, q.x + w, q.y + w * 0.1); ctx.stroke();
        ctx.strokeStyle = `rgba(236,248,255,${al.toFixed(3)})`; ctx.lineWidth = Math.max(1.5, sc * 0.04);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Blue-violet pressure flickering round Nox while he moves or strikes,
    // and hard during his heavy art (the world held still around him).
    function shadowFlicker(u, L, sc, s) {
      const art = s.cutscene && s.cutscene.unit === u;
      const busy = u.state === 'dodge' || u.state === 'opener' || (u.state === 'attack' && u.act && u.act.phase !== 'recover') || (V.introPhase && V.spotlight === u.id);
      if (!art && !busy) return;
      const n = art ? 9 : 4, h = 1.75 * L.h, step = Math.floor(V.time * 24);
      sc = Math.min(sc, 70); // the sparks stay small in close-ups
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'miter';
      for (let i = 0; i < n; i++) {
        const sd = (step * 7 + i * 13) % 17;
        const a = sd * 0.37 + i, z = h * (0.15 + ((sd * 5) % 9) / 10), r = 0.35 + (sd % 4) * 0.12;
        const p0 = P(u.x + Math.cos(a) * r, u.y + Math.sin(a) * r * 0.8, z);
        const l = sc * (0.12 + (sd % 3) * 0.06);
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p0.x + l * 0.5, p0.y - l * 0.4); ctx.lineTo(p0.x + l * 0.15, p0.y - l * 0.6); ctx.lineTo(p0.x + l * 0.8, p0.y - l * 1.1);
        ctx.strokeStyle = rgba(L.afterimage, 0.35); ctx.lineWidth = Math.max(2, sc * 0.05); ctx.stroke();
        ctx.strokeStyle = 'rgba(236,232,255,0.9)'; ctx.lineWidth = Math.max(1, sc * 0.015); ctx.stroke();
      }
      ctx.restore();
    }

    function drawLying(u, L, sc) {
      const f = u.facing, F = [Math.cos(f), Math.sin(f)], Rt = [-F[1], F[0]];
      const H = 1.75 * L.h;
      const W = (x, y, z) => P(u.x + F[0] * x + Rt[0] * y, u.y + F[1] * x + Rt[1] * y, z);
      const head = W(-H * 0.42, 0, 0.14), chest = W(-H * 0.2, 0, 0.16), hip = W(0.05, 0, 0.14);
      const k1 = W(0.3, 0.12, 0.14), k2 = W(0.3, -0.12, 0.24), f1 = W(0.55, 0.15, 0.08), f2 = W(0.5, -0.2, 0.08);
      const hand1 = W(-H * 0.18, 0.4, 0.08), hand2 = W(-H * 0.1, -0.38, 0.08);
      const px = sc * 0.06 * L.build;
      const hr = sc * 0.12 * (L.headK || 1) * Math.min(1.2, L.h);
      const arm = L.bareArms ? L.skin : L.sleeve || L.coat || L.body;
      layer([
        { ...seg(hip, k1, px * 1.1, px * 0.9), c: L.legs }, { ...seg(k1, f1, px * 0.9, px * 0.75), c: L.boots },
        { ...seg(hip, k2, px * 1.1, px * 0.9), c: L.legs }, { ...seg(k2, f2, px * 0.9, px * 0.75), c: L.boots },
        { ...seg(chest, hand1, px * 0.7, px * 0.6), c: arm }, { ...seg(chest, hand2, px * 0.7, px * 0.6), c: arm },
        { ...seg(hip, chest, px * 1.5, px * 1.8), c: L.body },
        { kind: 'ell', x: head.x, y: head.y, rx: hr, ry: hr, c: L.hair === 'bald' ? L.skin : L.hair === 'helm' ? L.armor : L.hood || L.hairC },
      ], false);
      if (L.shield) {
        // the shield lies flat beside him
        const c = W(-H * 0.12, -0.55, 0.04), R = L.shield.r * sc;
        layer([{ kind: 'ell', x: c.x, y: c.y, rx: R, ry: R * 0.45, c: L.shield.c }], false);
      }
    }

    function drawStanding(u, L, sc) {
      const ps = pose(u, V);
      const sp = spring(u);
      const H = 1.78 * L.h;
      const X = ps.x || null; // combat pose extras (combat.js): upper/lower body yaw, weight, footwork
      // Upper body, hips and the facing frame: with extras the shoulders and the
      // hips turn separately (hips lead a swing, the shoulders follow).
      const f = X ? u.facing + (X.tw || 0) : u.facing + ps.twist * 0.35;
      const fl = X ? u.facing + (X.hp != null ? X.hp : (X.tw || 0) * 0.3) : f;
      const F = [Math.cos(f), Math.sin(f)], Rt = [-F[1], F[0]];
      const FL = [Math.cos(fl), Math.sin(fl)], RL = [-FL[1], FL[0]];
      const F0 = [Math.cos(u.facing), Math.sin(u.facing)], R0 = [-F0[1], F0[0]];
      const xs = X ? (X.shift || 0) : 0, xr = X ? (X.roll || 0) : 0;
      // Floaters (Aerys) hang a hand's breadth above the ground, drifting.
      const lift = L.float && !V.introPhase ? L.float * (1 + 0.35 * Math.sin(V.time * 1.7 + hashId(u.id))) : L.float ? L.float * 0.6 : 0;
      const W = (x, y, z) => ({ x: u.x + F[0] * x + Rt[0] * y, y: u.y + F[1] * x + Rt[1] * y, z: z + lift });
      // lower body frame, and the facing frame (hands are placed against the facing, not the twist)
      const WL = (x, y, z) => ({ x: u.x + FL[0] * x + RL[0] * y, y: u.y + FL[1] * x + RL[1] * y, z: z + lift });
      const W0 = (x, y, z) => ({ x: u.x + F0[0] * x + R0[0] * y, y: u.y + F0[1] * x + R0[1] * y, z: z + lift });
      // weight transfer and side tilt: k is how much of it this body part takes
      const wt = (q, k, kr) => { if (xs || xr) { q.x += F0[0] * xs * k + R0[0] * xr * (kr == null ? k : kr); q.y += F0[1] * xs * k + R0[1] * xr * (kr == null ? k : kr); } return q; };
      // Seated (staged scenes): the whole upper body drops onto a stool.
      const sit = u.state === 'sit';
      const seat = 0.47 * Math.sqrt(L.h);
      const sitDrop = sit ? H * 0.5 - seat : 0;
      const bob = (u.state === 'move' || u.fleeing ? Math.abs(Math.sin(u.walk * 3.2)) * 0.05 : Math.sin((u.walk + u.x) * 0.5 + V.time * 2.2) * 0.008) - sitDrop;
      const jitter = u.state === 'hurt' || u.state === 'stagger' ? Math.sin(u.st * 70) * 0.03 : u.gest === 'choke' ? Math.sin(V.time * 45) * 0.025 : u.gest === 'laugh' ? Math.sin(V.time * 18) * 0.012 : 0;
      // Weapons are put away while sitting or gesturing (or when told to).
      const stowed = !!(u.stow || sit || (u.gest && u.state !== 'attack'));
      const cz = 1 - ps.crouch;
      const bw = 0.215 * L.w;
      const stoop = L.stoop || 0, hunch = L.hunch || 0;
      const AK = attackK(u);
      const Wd = stowed ? null : WEAPON[L.weapon];

      // Skeleton (world metres, relative to facing)
      const lean = ps.lean + stoop * 0.6 + hunch;
      const pelvis = wt(WL(0, 0, H * 0.5 * cz + bob), 0.55, 0.12);
      const chest = wt(W(lean * 0.55, jitter, H * 0.71 * cz + bob), 0.95, 0.5);
      const neck = wt(W(lean * 0.8 + stoop * 0.25, jitter, H * (0.82 - stoop * 0.06) * cz + bob), 1, 0.75);
      const headC = wt(W(lean * 0.9 + 0.02 + stoop * 0.45 + (X && X.hd ? X.hd : 0), jitter, H * (0.905 - stoop * 0.14) * cz + bob), 1.05, 1);
      const twist = X ? 0 : ps.twist * 0.25;
      const shR = wt(W(lean * 0.75 - twist * bw, bw, H * 0.79 * cz + bob), 0.95, 0.5);
      const shL = wt(W(lean * 0.75 + twist * bw, -bw, H * 0.79 * cz + bob), 0.95, 0.5);
      const hipR = wt(WL(0, bw * 0.55, H * 0.5 * cz + bob), 0.55, 0.12), hipL = wt(WL(0, -bw * 0.55, H * 0.5 * cz + bob), 0.55, 0.12);
      // Feet: stride when moving, wide stance when fighting.
      const stride = (u.state === 'move' || u.fleeing || u.state === 'opener' ? Math.sin(u.walk * 3.2) * 0.34 : u.state === 'circle' ? Math.sin(u.walk * 3.2) * 0.16 : 0) * Math.sqrt(L.h);
      const spread = 0.13 * L.w * ps.stance;
      const footR = WL(stride + (ps.stance > 1.2 ? 0.18 : 0), spread, 0);
      const footL = WL(-stride - (ps.stance > 1.2 ? 0.16 : 0), -spread, 0);
      if (X && (X.step || X.kick)) {
        // footwork: the lead foot steps into a strike (the other trails), or a leg kicks
        const st = X.step || 0, lf = X.foot === 'R' ? footR : footL, tf = lf === footR ? footL : footR;
        lf.x += F0[0] * st; lf.y += F0[1] * st;
        tf.x -= F0[0] * Math.max(0, st) * 0.4; tf.y -= F0[1] * Math.max(0, st) * 0.4;
        if (X.kick > 0) {
          const kk = X.kick, kp = W0(0.2 + kk * 0.95 * L.h, spread, kk * 0.7 * L.h);
          Object.assign(footR, kp);
        }
      }
      if (X && X.fx != null && u.state === 'dodge') {
        // dodging: the foot on the side of travel reaches, the other drags
        const lf = X.fy >= 0 ? footR : footL, tf = lf === footR ? footL : footR;
        lf.x += R0[0] * X.fy * 0.22 + F0[0] * X.fx * 0.22; lf.y += R0[1] * X.fy * 0.22 + F0[1] * X.fx * 0.22;
        tf.x -= R0[0] * X.fy * 0.12; tf.y -= R0[1] * X.fy * 0.12;
      }
      const knee = (hip, foot, side) => ({
        x: (hip.x + foot.x) / 2 + FL[0] * (0.1 + ps.crouch * 0.5) * L.h + RL[0] * side * 0.03,
        y: (hip.y + foot.y) / 2 + FL[1] * (0.1 + ps.crouch * 0.5) * L.h + RL[1] * side * 0.03,
        z: (hip.z + foot.z) / 2 + 0.02,
      });
      const kneeR = knee(hipR, footR, 1), kneeL = knee(hipL, footL, -1);
      if (sit) {
        // thighs level on the seat, shins down to the floor
        const fw = 0.44 * L.h + (u.gest === 'tip' ? 0.2 : 0);
        Object.assign(footR, W(fw, spread + 0.03, 0)); Object.assign(footL, W(fw - 0.05, -spread - 0.03, 0));
        Object.assign(kneeR, W(fw - 0.03, spread + 0.05, seat + 0.07 + (u.gest === 'tip' ? 0.06 : 0))); Object.assign(kneeL, W(fw - 0.08, -spread - 0.05, seat + 0.07));
      }

      // Weapon hand from the attack arc.
      let wa = f + ps.rel, cp = Math.cos(ps.pitch), wpitch = ps.pitch;
      const reach = (L.weapon === 'fists' || L.weapon === 'none' || L.weapon === 'glyph' ? 0.5 : 0.42) * Math.sqrt(L.h);
      const handR = {
        x: shR.x + Math.cos(f + ps.rel * 0.6) * reach + Rt[0] * 0.05,
        y: shR.y + Math.sin(f + ps.rel * 0.6) * reach + Rt[1] * 0.05,
        z: shR.z - 0.22 * L.h + ps.pitch * 0.2 * L.h,
      };
      if (u.state === 'parry') Object.assign(handR, W(0.38, 0.08, H * 0.74 * cz));
      const Hc = H * cz;
      const styled = !!(X && X.styled);
      let handL;
      switch (ps.off) {
        case 'fistup': handL = W(0.32, -0.12, H * 0.76 * cz); break;
        case 'cast': handL = W(0.62 * L.h, -0.1, H * 0.8 * cz); break;
        case 'reach': handL = W(0.6 * L.h, -0.15, H * 0.6 * cz); break;
        case 'flail': handL = W(-0.1, -0.42 * L.h, H * (0.8 + Math.sin(V.time * 14) * 0.08) * cz); break;
        case 'back': handL = W(-0.42 * L.h, -0.22, H * 0.55 * cz); break;
        case 'out': handL = W(0.05, -0.5 * L.h, H * 0.66 * cz); break;
        case 'down': handL = W(0.5, -0.12, 0.25); break;
        case 'knee': handL = W(0.18, -0.15, H * 0.42 * cz); break;
        default: handL = W(0.26 * L.h, -0.16 * L.w, H * 0.6 * cz);
      }
      if (u.state === 'pickup') Object.assign(handR, W(0.45, 0.1, 0.18));
      if (styled) {
        // A styled attack: the striking hand follows the keyframes (against the facing,
        // not the twist); the other hand guards, counterbalances, or strikes too.
        const sk = W0(X.hx * L.h, X.hy * L.h, X.hz * L.h), og = W0((X.ox == null ? 0.3 : X.ox) * L.h, (X.oy == null ? -0.15 : X.oy) * L.h, (X.oz == null ? 1.1 : X.oz) * L.h);
        if (X.lead === 'L') { handL = sk; Object.assign(handR, og); } else { Object.assign(handR, sk); if (X.usesOff) handL = og; }
        wa = u.facing + (X.wy || 0); wpitch = X.wp || 0; cp = Math.cos(wpitch);
      }
      // Staged gestures (eating, drinking, pointing...) place the hands.
      const gest = u.state === 'attack' || u.state === 'pickup' ? null : u.gest;
      if (gest) {
        const hz = headC.z, chz = chest.z, tz = 0.82;
        const cyc = (sp) => { const t = (V.time * sp + hashId(u.id) * 0.37) % 1; return t < 0.3 ? smooth(t / 0.3) : t < 0.5 ? 1 : t < 0.8 ? 1 - smooth((t - 0.5) / 0.3) : 0; };
        const at = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k });
        const rest = sit ? W(0.36, -0.16, tz) : null;
        switch (gest) {
          case 'table': Object.assign(handR, W(0.36, 0.16, tz)); if (sit) handL = rest; break;
          case 'eat': Object.assign(handR, at(W(0.42, 0.08, tz + 0.04), W(0.16, 0.03, hz - 0.13 * L.h), cyc(0.45))); handL = W(0.38, -0.12, tz + 0.02); break;
          case 'spoon': Object.assign(handR, W(0.3, 0.2, hz + 0.04 + Math.sin(V.time * 5) * 0.015)); handL = W(0.36, -0.14, tz + 0.02); break;
          case 'cup': Object.assign(handR, sit ? W(0.36, 0.12, tz + 0.05) : W(0.3, 0.12, chz - 0.14)); if (sit) handL = rest; break;
          case 'drink': Object.assign(handR, W(0.15, 0.03, hz - 0.1 * L.h)); if (sit) handL = rest; break;
          case 'sip': Object.assign(handR, at(sit ? W(0.36, 0.12, tz + 0.05) : W(0.3, 0.12, chz - 0.14), W(0.15, 0.03, hz - 0.1 * L.h), cyc(0.2))); if (sit) handL = rest; break;
          case 'choke': Object.assign(handR, W(0.42, 0.16, tz + 0.02)); handL = W(0.18, -0.02, chz + 0.04); break;
          case 'cross': case 'lean': Object.assign(handR, W(0.17, -0.1, chz - 0.08)); handL = W(0.18, 0.1, chz - 0.05); break;
          case 'point': Object.assign(handR, W(0.62 * L.h, 0.12, hz + 0.1)); break;
          case 'hips': Object.assign(handR, W(-0.02, 0.28 * L.w, pelvis.z + 0.08)); handL = W(-0.02, -0.28 * L.w, pelvis.z + 0.08); break;
          case 'raise': Object.assign(handR, W(0.22, 0.24, hz + 0.32)); break;
          case 'tip': case 'headback': Object.assign(handR, W(-0.12, 0.15, hz + 0.05)); handL = W(-0.12, -0.15, hz + 0.05); break;
          case 'notes': Object.assign(handR, W(0.4, 0.1 + Math.sin(V.time * 3) * 0.05, tz + 0.04)); handL = W(0.36, -0.15, tz + 0.02); break;
          case 'present': Object.assign(handR, W(0.4, 0.12, chz - 0.02)); break;
          case 'laugh': Object.assign(handR, sit ? W(0.36, 0.16, tz + 0.04) : W(0.12, 0.2, pelvis.z + 0.12)); handL = W(0.16, -0.06, chz - 0.1); break;
          case 'chin': Object.assign(handR, W(0.16, 0.03, hz - 0.17 * L.h)); handL = sit ? rest : W(0.12, -0.12, chz - 0.14); break;
          case 'wave': Object.assign(handR, W(0.2, 0.34, hz + 0.25 + Math.sin(V.time * 10) * 0.06)); break;
          case 'gesture': Object.assign(handR, W(0.42, 0.22, chz - 0.05 + Math.sin(V.time * 4 + hashId(u.id)) * 0.08)); if (sit) handL = rest; break;
        }
      }
      if (L.weapon === 'fists' && AK && AK.ph !== 'wind' && !styled) {
        // a punch: the fist drives straight along the facing
        const k = AK.ph === 'strike' ? 1 : Math.max(0, 1 - u.act.t / 0.3);
        Object.assign(handR, W(0.25 + 0.55 * k, 0.05, H * 0.74 * cz));
      }
      const free = !(u.fleeing || u.beaten) && !(u.drained > 0) && u.state !== 'hurt' && u.state !== 'stagger';
      // Shield: held in front; a bash drives it forward.
      if (L.shield && free && !stowed && (ps.off === 'guard' || ps.off === 'fistup')) {
        let fwd = 0.34, side = -0.14, z = 0.62;
        if (AK) {
          if (AK.ph === 'wind') { fwd = 0.34 - 0.2 * AK.e; side = -0.14 - 0.1 * AK.e; }
          else if (AK.ph === 'strike') { fwd = 0.72; side = -0.02; z = 0.66; }
          else { fwd = 0.72 - 0.38 * AK.e; side = -0.02 - 0.12 * AK.e; }
        }
        if (u.state === 'parry') { fwd = 0.5; side = -0.04; z = 0.68; }
        handL = W(fwd * L.h + lean * 0.5, side * L.w, H * z * cz);
      }
      // Glyph casters: the casting hand comes up and pushes the glyph out.
      if ((L.weapon === 'glyph' || L.palms) && free && u.state !== 'pickup' && !gest) {
        if (AK) {
          const fw = AK.ph === 'wind' ? 0.25 + 0.2 * AK.e : AK.ph === 'strike' ? 0.66 : 0.66 - 0.36 * AK.e;
          const zz = AK.ph === 'wind' ? 0.66 + 0.1 * AK.e : AK.ph === 'strike' ? 0.78 : 0.78 - 0.14 * AK.e;
          Object.assign(handR, W(fw * L.h + lean * 0.5, 0.1, H * zz * cz));
        } else if (u.state !== 'parry') {
          Object.assign(handR, W(0.2 + Math.max(0, ps.pitch) * 0.2, 0.26, H * (0.56 + Math.max(0, ps.pitch) * 0.12) * cz));
        }
      }
      // Bow: the bow hand reaches out, the string hand draws back to the cheek.
      let bowDraw = 0;
      if (L.weapon === 'bow' && free) {
        const aim = AK || (V.introPhase && ps.off === 'cast');
        if (aim) {
          bowDraw = AK ? (AK.ph === 'wind' ? AK.e : AK.ph === 'strike' ? 0 : 0) : 0.85;
          handL = W(0.5 * L.h + lean * 0.5, -0.06, H * 0.77 * cz);
          const rel = AK && AK.ph !== 'wind';
          Object.assign(handR, rel ? W(-0.08, 0.2, H * 0.8 * cz) : W(0.48 * L.h - bowDraw * 0.5 * L.h + lean * 0.5, 0.02 + bowDraw * 0.05, H * 0.77 * cz));
        } else {
          handL = W(0.22, -0.2, H * 0.55 * cz);
        }
      }
      // Thrust weapons point along the facing; the hand drives forward.
      if (Wd && Wd.thrust && free && !styled) {
        let fw = 0.08, z = 0.6;
        if (AK) fw = AK.ph === 'wind' ? 0.08 - 0.3 * AK.e : AK.ph === 'strike' ? 0.6 : 0.6 - 0.52 * AK.e;
        if (V.introPhase) { fw = 0.0; z = 0.62; }
        Object.assign(handR, W(fw * L.h + lean * 0.5, 0.16, H * z * cz));
        wa = f; cp = Math.cos(0.08); wpitch = 0.08;
      }

      // Weapon tip (world) and two-handed grips.
      let tipW = null;
      if (Wd) {
        const len = Wd.len * (L.bladeLen || 1) * (L.weapon === 'spear' || L.weapon === 'longspear' || L.weapon === 'beam' ? 1 : Math.min(1.15, Math.max(0.85, L.h)));
        tipW = { x: handR.x + Math.cos(wa) * len * cp, y: handR.y + Math.sin(wa) * len * cp, z: handR.z + Math.sin(wpitch) * len };
        if (u.state === 'parry') tipW = { x: handR.x - Rt[0] * len * 0.9, y: handR.y - Rt[1] * len * 0.9, z: handR.z + 0.38 };
        if (tipW.z < 0.02) {
          // blades that point down rest their tip on the ground
          tipW.z = 0.02;
        }
        if (free && (ps.off === 'guard' || ps.off === 'fistup') && (Wd.grip === 'two' || Wd.grip === 'shaft')) {
          const dx = tipW.x - handR.x, dy = tipW.y - handR.y, dz = tipW.z - handR.z, l = Math.hypot(dx, dy, dz) || 1;
          const g = Wd.grip === 'two' ? -0.2 : 0.46;
          handL = { x: handR.x + dx / l * g, y: handR.y + dy / l * g, z: handR.z + dz / l * g };
        }
      }

      const elbow = (sh, hand, side) => ({
        x: (sh.x + hand.x) / 2 + Rt[0] * side * 0.12 * L.w,
        y: (sh.y + hand.y) / 2 + Rt[1] * side * 0.12 * L.w,
        z: (sh.z + hand.z) / 2 - 0.08 * L.h,
      });
      const elR = elbow(shR, handR, 1), elL = elbow(shL, handL, -1);
      {
        // The weapon's path for the swing ribbon (fx.js): the blade tip, the striking fist or foot.
        const CB = window.TowRender && window.TowRender.combat;
        if (CB) {
          let pt = null, on = false;
          if (styled) {
            on = X.ph === 'launch' || X.ph === 'strike' || (X.ph === 'rec' && X.e < 0.3);
            if (X.kickLeg) pt = footR;
            else if (X.lead === 'L') {
              if (L.weapon === 'twin') { const dx = handL.x - elL.x, dy = handL.y - elL.y, dz = handL.z - elL.z, l = Math.hypot(dx, dy, dz) || 1; pt = { x: handL.x - dx / l * 0.42, y: handL.y - dy / l * 0.42, z: handL.z - dz / l * 0.42 }; } else pt = handL;
            } else pt = tipW || handR;
          }
          CB.trailPush(u, pt, V.time, on);
        }
      }

      const p = (q) => P(q.x, q.y, q.z);
      const S = {
        pelvis: p(pelvis), chest: p(chest), neck: p(neck), head: p(headC),
        shR: p(shR), shL: p(shL), hipR: p(hipR), hipL: p(hipL),
        kneeR: p(kneeR), kneeL: p(kneeL), footR: p(footR), footL: p(footL),
        elR: p(elR), elL: p(elL), handR: p(handR), handL: p(handL),
      };
      const px = sc * 0.082 * L.build * Math.min(1, 0.55 + 0.45 * L.h); // limb half-width unit
      const headR = sc * H * 0.068 * (L.headK || 1);
      const flash = u.flash > 0;
      const G = { u, L, S, F, Rt, sc, px, H, cz, sp, ps, handR, handL, elL, tipW, bowDraw, flash, f, stowed };

      // Which side is nearer the camera decides the drawing order.
      const rightNear = S.shR.d > S.shL.d;
      const near = rightNear ? 'R' : 'L', far = rightNear ? 'L' : 'R';
      const leg = (side) => L.wisp ? [
        // legs that thin out to nothing above the ground
        { ...seg(S['hip' + side], S['knee' + side], px * 1.25, px * 0.8), c: L.legs, rim: false },
        { ...seg(S['knee' + side], { x: S['foot' + side].x, y: S['foot' + side].y - px * 1.2 }, px * 0.8, px * 0.08), c: L.legs, rim: false },
      ] : [
        { ...seg(S['hip' + side], S['knee' + side], px * 1.25, px * 0.85), c: L.legs, rim: false },
        { ...seg(S['knee' + side], S['foot' + side], px * 0.85, px * 0.55), c: L.legs, rim: false },
        { ...seg(S['foot' + side], P(...footTip(side)), px * 0.6, px * 0.45), c: L.boots },
      ];
      function footTip(side) {
        const ft = side === 'R' ? footR : footL;
        return [ft.x + F[0] * 0.14 * Math.sqrt(L.w), ft.y + F[1] * 0.14 * Math.sqrt(L.w), 0.02 + (L.float ? ft.z - 0.04 : 0)];
      }
      const armColor = L.bareArms ? L.skin : L.sleeve || L.coat || L.body;
      const fistK = L.weapon === 'fists' ? 1 : L.weapon === 'beam' ? 1.1 : 0;
      const arm = (side) => {
        const hand = S['hand' + side];
        if (L.altered === side) {
          // the altered arm: heavier, a greyer skin stretched over shifting bone
          const ac = L.alteredC;
          return [
            { ...seg(S['sh' + side], S['el' + side], px * 1.0, px * 0.85), c: ac, rim: false },
            { ...seg(S['el' + side], hand, px * 0.9, px * 0.7), c: ac, rim: false },
            { kind: 'ell', x: hand.x, y: hand.y, rx: px * 1.15, ry: px * 1.05, c: ac, rim: false },
          ];
        }
        return [
          { ...seg(S['sh' + side], S['el' + side], px * 0.8, px * 0.65), c: armColor, rim: false },
          { ...seg(S['el' + side], hand, px * 0.65, px * 0.5), c: L.wraps || armColor, rim: false },
          { kind: 'ell', x: hand.x, y: hand.y, rx: px * (fistK ? 0.95 * fistK : 0.55), ry: px * (fistK ? 0.9 * fistK : 0.5), c: L.wraps || L.skin, rim: false },
        ];
      };
      // Shield in front of the body, or behind it when the bearer faces away.
      const shieldFront = L.shield ? S.handL.d >= S.chest.d - 0.02 : false;

      // Back layer: far leg, far arm, hair behind, cloth behind.
      if (sit && !u.noStool) drawStool(u, W, seat, flash);
      // A put-away weapon: on the back when standing, leant beside a seat.
      const sw = stowed ? stowGeom(u, L, W, sit, pelvis, shR, H) : null;
      if (sw && sw.d < S.chest.d) drawStowed(G, sw);
      if (stowed && L.shield) G.backShield = W(-0.26, 0.02, H * 0.66 * cz);
      if (G.backShield && P(G.backShield.x, G.backShield.y, G.backShield.z).d < S.chest.d) drawShield(Object.assign({}, G, { handL: G.backShield }));
      const back = [];
      const hairTail = hairTailPoints(u, L, S, F, headC, sp, H, cz);
      if (L.hair === 'long') back.push(hairTail.shape);
      const capeSh = L.cape ? cape(L, shL, shR, F, Rt, sp, H, cz, u) : null;
      const coatSh = L.coat ? coatTail(L, pelvis, F, Rt, sp, H, cz) : null;
      if (capeSh) back.push(capeSh);
      if (coatSh) back.push(coatSh);
      if (L.quiver) back.push(quiver(L, shL, pelvis, F, Rt));
      back.push(...leg(far));
      back.push(...arm(far));
      layer(back, flash);
      if (L.altered === far) boneRidges(G, far);
      if (L.trim && !flash) { hemTrim(capeSh, L.trim); hemTrim(coatSh, L.trim); }
      if (far === 'R') drawWeapon(G);
      if (far === 'L') drawOffHand(G);
      if (L.shield && !shieldFront && !stowed) drawShield(G);

      // Body layer: near leg, torso, head.
      const body = [];
      body.push(...leg(near));
      if (L.skirt) body.push(skirt(L, pelvis, F, Rt, sp, H, cz));
      if (L.coat && L.coatLen != null && L.coatLen < 0.12) body.push(coatSkirt(L, pelvis, F, Rt, sp, H, cz));
      // Torso: wide at the shoulders, narrow at the waist.
      const wst = 0.05 * L.w;
      const torso = [S.shL, S.shR, P((hipR.x + pelvis.x) / 2 + Rt[0] * wst, (hipR.y + pelvis.y) / 2 + Rt[1] * wst, pelvis.z + 0.04), P((hipL.x + pelvis.x) / 2 - Rt[0] * wst, (hipL.y + pelvis.y) / 2 - Rt[1] * wst, pelvis.z + 0.04)];
      const lightRight = (S.shR.x - S.shL.x) * lx + (S.shR.y - S.shL.y) * ly > 0;
      const midTop = { x: (S.shL.x + S.shR.x) / 2, y: (S.shL.y + S.shR.y) / 2 }, midBot = { x: (torso[2].x + torso[3].x) / 2, y: (torso[2].y + torso[3].y) / 2 };
      body.push({ kind: 'poly', pts: torso, c: L.body });
      body.push({ ...seg(S.pelvis, S.chest, px * 1.25, px * 1.55), c: L.body, rim: true });
      layer(body, flash);
      // Torso cel shadow: the half away from the light.
      if (!flash) {
        ctx.fillStyle = L.body[1];
        ctx.beginPath();
        if (lightRight) pathPoly([midTop, torso[0], torso[3], midBot]); else pathPoly([midTop, torso[1], torso[2], midBot]);
        ctx.fill();
      }
      drawCostume(u, L, S, F, Rt, sc, px, shR, shL, pelvis, chest, H, cz, lightRight);
      drawHead(u, L, S, F, sc, headR, hairTail, lightRight);
      if (L.shards) drawShards(G);

      // Front layer: near arm and the weapon.
      if (far === 'L') drawWeapon(G);
      if (sw && sw.d >= S.chest.d) drawStowed(G, sw);
      if (G.backShield && P(G.backShield.x, G.backShield.y, G.backShield.z).d >= S.chest.d) drawShield(Object.assign({}, G, { handL: G.backShield }));
      layer(arm(near), flash);
      if (L.altered === near) boneRidges(G, near);
      if (L.knuckles) drawKnuckles(G);
      const prop = u.prop !== undefined ? u.prop : L.prop;
      if (prop && u.state !== 'attack') drawProp(G, prop);
      if (far === 'R') drawOffHand(G);
      if (L.shield && shieldFront && !stowed) drawShield(G);
      if (L.glyph) drawGlyphHands(G);
      if (L.palms) drawPalms(G);
      if (L.weed) drawWeed(G);
      if (L.drip) drawDrips(G);
    }

    // ---------------------------------------------------------------- staging
    // A plain stool under a seated figure.
    function drawStool(u, W, seat, flash) {
      const c = W(-0.06, 0, seat - 0.03);
      const legs = [W(-0.2, 0.14, 0), W(-0.2, -0.14, 0), W(0.08, 0, 0)].map((q) => P(q.x, q.y, 0));
      const top = P(c.x, c.y, c.z), r = V.cam.sc * 0.21;
      const shapes = legs.map((q) => ({ ...seg(q, { x: top.x + (q.x - top.x) * 0.3, y: top.y }, r * 0.12, r * 0.14), c: ['#5a3e28', '#2e1e12'], rim: false }));
      shapes.push({ kind: 'ell', x: top.x, y: top.y, rx: r, ry: Math.max(r * 0.3, r * V.cam.pitch), c: ['#7a5636', '#45301f'], rim: false });
      layer(shapes, flash);
    }
    function stowGeom(u, L, W, sit, pelvis, shR, H) {
      const kind = L.weapon;
      if (kind !== 'sword' && kind !== 'greatsword' && kind !== 'spear') return null;
      const len = WEAPON[kind].len;
      let a, b;
      if (u.leanAt) { a = { x: u.leanAt[0], y: u.leanAt[1], z: 0.02 }; b = { x: u.leanAt[0] + 0.14, y: u.leanAt[1] - 0.1, z: len * 0.96 }; }
      else if (sit) { a = W(0.12, -0.44, 0.02); b = W(0.3, -0.52, len * 0.96); }
      else if (kind === 'spear') { a = W(-0.2, 0.3, H * 0.18); b = W(-0.18, -0.3, H * 0.18 + len * 0.95); }
      else { a = W(-0.16, 0.24, pelvis.z - 0.12); b = W(-0.18, -0.2, shR.z + 0.4); }
      const m = P((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      return { kind, a: P(a.x, a.y, a.z), b: P(b.x, b.y, b.z), d: m.d };
    }
    function drawStowed(G, sw) {
      const { px, flash } = G;
      const { a, b } = sw;
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
      if (sw.kind === 'spear') {
        const tip = { x: b.x + ux * px * 2.6, y: b.y + uy * px * 2.6 };
        layer([{ ...seg(a, b, px * 0.22, px * 0.22), c: ['#6b4c33', '#3a281a'] }], flash);
        layer([{ kind: 'poly', pts: [{ x: b.x - uy * px * 0.5, y: b.y + ux * px * 0.5 }, tip, { x: b.x + uy * px * 0.5, y: b.y - ux * px * 0.5 }], c: ['#c9d2da', '#6b7680'], shadeFrom: [1, 2, 0] }], flash);
        return;
      }
      // a scabbard, the grip and guard showing at the top
      const hilt = { x: b.x + ux * px * 2.4, y: b.y + uy * px * 2.4 };
      layer([{ ...seg(a, b, px * 0.38, px * 0.46), c: ['#3a2d26', '#1d1613'] }], flash);
      layer([{ ...seg(b, hilt, px * 0.22, px * 0.22), c: ['#2b2327', '#141012'] }, { ...seg({ x: b.x - uy * px * 0.9, y: b.y + ux * px * 0.9 }, { x: b.x + uy * px * 0.9, y: b.y - ux * px * 0.9 }, px * 0.22, px * 0.22), c: ['#8792a0', '#3f4750'] }], flash);
    }
    // Small things held in the right hand.
    function drawProp(G, prop) {
      const { S, sc, flash, F } = G;
      const h = S.handR, k = sc / 100;
      const lit = (c) => (flash ? lighten(c[0]) : c[0]);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const ahead = P(G.u.x + F[0], G.u.y + F[1], 0), base = P(G.u.x, G.u.y, 0);
      const side = ahead.x >= base.x ? 1 : -1;
      if (prop === 'spoon' || prop === 'ladle') {
        const big = prop === 'ladle' ? 2.4 : 1;
        const top = { x: h.x + side * 3 * k * big, y: h.y - 16 * k * big };
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.5, 4 * k * Math.sqrt(big)); ctx.beginPath(); ctx.moveTo(h.x, h.y + 3 * k); ctx.lineTo(top.x, top.y); ctx.stroke();
        ctx.strokeStyle = flash ? '#fff' : '#cfc6b8'; ctx.lineWidth = Math.max(1, 2 * k * Math.sqrt(big)); ctx.stroke();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(top.x, top.y - 4 * k * big, 4.6 * k * big + 1.2, 5.6 * k * big + 1.2, side * 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#d8d0c2'; ctx.beginPath(); ctx.ellipse(top.x, top.y - 4 * k * big, 4.6 * k * big, 5.6 * k * big, side * 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8a8274'; ctx.beginPath(); ctx.ellipse(top.x + side * 1.2 * k * big, top.y - 3 * k * big, 2.6 * k * big, 3.6 * k * big, side * 0.2, 0, TAU); ctx.fill();
      } else if (prop === 'bread') {
        const rx = 13 * k, ry = 7 * k, c = { x: h.x + side * 2 * k, y: h.y - 3 * k };
        ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(c.x, c.y, rx + 1.5, ry + 1.5, side * -0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = lit(['#b07a3a']); ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, side * -0.3, 0, TAU); ctx.fill();
        if (!flash) {
          ctx.fillStyle = '#6e4620'; ctx.beginPath(); ctx.ellipse(c.x + 2 * k, c.y + 2.5 * k, rx * 0.8, ry * 0.55, side * -0.3, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(40,20,8,0.75)'; ctx.lineWidth = Math.max(1, 1.4 * k); ctx.beginPath();
          for (const o of [-0.45, 0, 0.45]) { ctx.moveTo(c.x + o * rx - 2 * k, c.y - ry * 0.6); ctx.lineTo(c.x + o * rx + 2 * k, c.y + ry * 0.1); }
          ctx.stroke();
        }
      } else if (prop === 'cup' || prop === 'tankard') {
        const big = prop === 'tankard' ? 1.45 : 1, w = 6 * k * big, hh = 13 * k * big;
        const x = h.x - w + side * 1 * k, y = h.y - hh * 0.75;
        ctx.fillStyle = INK; ctx.fillRect(x - 1.5, y - 1.5, w * 2 + 3, hh + 3);
        ctx.fillStyle = flash ? '#fff' : prop === 'tankard' ? '#8a8a84' : '#8a6a48'; ctx.fillRect(x, y, w * 2, hh);
        ctx.fillStyle = prop === 'tankard' ? '#4a4a46' : '#4a3626'; ctx.fillRect(x + w * 1.1, y, w * 0.9, hh);
        ctx.fillStyle = '#efe4c8'; ctx.fillRect(x - 1, y - 2.5 * k * big, w * 2 + 2, 3 * k * big);
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, 2.6 * k * big); ctx.beginPath(); ctx.arc(x + (side > 0 ? -1 : w * 2 + 1), y + hh * 0.45, hh * 0.28, side > 0 ? Math.PI * 0.55 : -Math.PI * 0.45, side > 0 ? Math.PI * 1.45 : Math.PI * 0.45); ctx.stroke();
      } else if (prop === 'notes') {
        ctx.fillStyle = INK; ctx.fillRect(h.x - 8 * k, h.y - 12 * k, 16 * k, 12 * k);
        ctx.fillStyle = '#d8ccb4'; ctx.fillRect(h.x - 7 * k, h.y - 11 * k, 14 * k, 10 * k);
      }
    }

    function hairTailPoints(u, L, S, F, headC, sp, H, cz) {
      // Long hair hangs from the back of the head and trails behind motion.
      const back = { x: headC.x - F[0] * 0.08, y: headC.y - F[1] * 0.08, z: headC.z + 0.02 };
      const tip = { x: back.x - F[0] * 0.16 + sp.hx * 1.6, y: back.y - F[1] * 0.16 + sp.hy * 1.6, z: H * 0.46 * cz };
      const mid = { x: (back.x + tip.x) / 2 - F[0] * 0.06, y: (back.y + tip.y) / 2 - F[1] * 0.06, z: (back.z + tip.z) / 2 };
      const pb = P(back.x, back.y, back.z), pm = P(mid.x, mid.y, mid.z), pt = P(tip.x, tip.y, tip.z);
      const w = V.cam.sc * 0.17;
      const shape = { kind: 'poly', pts: [
        { x: pb.x - w, y: pb.y }, { x: pm.x - w * 0.95, y: pm.y }, { x: pt.x - w * 0.25, y: pt.y }, { x: pt.x + w * 0.25, y: pt.y + 2 },
        { x: pm.x + w * 0.95, y: pm.y }, { x: pb.x + w, y: pb.y },
      ], c: L.hairC, shadeFrom: [0, 1, 2, 3] };
      return { shape, pb, pm, pt };
    }

    function coatTail(L, pelvis, F, Rt, sp, H, cz) {
      const cw = L.coatW || 0.2;
      const hem = H * (L.coatLen == null ? 0.16 : L.coatLen) * cz;
      const top = (side) => P(pelvis.x + Rt[0] * side * 0.16 * L.w - F[0] * 0.05, pelvis.y + Rt[1] * side * 0.16 * L.w - F[1] * 0.05, pelvis.z + 0.05);
      const lg = clampLag(sp, 0.32);
      const back = L.coatLen != null && L.coatLen < 0.12 ? 0.14 : 0.2;
      const bot = (side) => P(pelvis.x + Rt[0] * side * cw - F[0] * back + lg.x, pelvis.y + Rt[1] * side * cw - F[1] * back + lg.y, hem);
      return { kind: 'poly', pts: [top(-1), top(1), bot(1), bot(-1)], c: L.coat, shadeFrom: [1, 2, 3], hem: [2, 3] };
    }

    // The front panels of a long coat, hanging open around the legs.
    function coatSkirt(L, pelvis, F, Rt, sp, H, cz) {
      const hem = H * L.coatLen * cz + 0.04;
      const lag = clampLag(sp, 0.18);
      const at = (side, fwd, z, k) => P(pelvis.x + Rt[0] * side * L.w + F[0] * fwd + lag.x * k, pelvis.y + Rt[1] * side * L.w + F[1] * fwd + lag.y * k, z);
      const pts = [at(-0.17, 0.02, pelvis.z + 0.06, 0), at(0.17, 0.02, pelvis.z + 0.06, 0), at(0.27, 0.0, hem + 0.06, 1), at(0.12, 0.06, hem, 1), at(-0.12, 0.06, hem, 1), at(-0.27, 0.0, hem + 0.06, 1)];
      return { kind: 'poly', pts, c: L.coat, shadeFrom: [1, 2, 3], hem: [2, 3, 4, 5] };
    }
    function clampLag(sp, max) {
      const l = Math.hypot(sp.cx, sp.cy);
      const k = l > max ? max / l : 1;
      return { x: sp.cx * k, y: sp.cy * k };
    }

    // A long cloak from the shoulders with a torn hem.
    function cape(L, shL, shR, F, Rt, sp, H, cz, u) {
      const n = L.tatter || 5;
      const top = (q, side) => P(q.x - F[0] * 0.1 + Rt[0] * side * 0.04, q.y - F[1] * 0.1 + Rt[1] * side * 0.04, q.z + 0.02);
      const pts = [top(shL, -1), top(shR, 1)];
      const t = V.time * 3 + u.x;
      const lg = clampLag(sp, 0.3);
      for (let i = 0; i <= n; i++) {
        const k = i / n, side = 1 - 2 * k; // right to left
        const torn = i % 2 ? 0.0 : 0.09 + 0.05 * Math.sin(i * 2.1 + t);
        const sway = Math.sin(t + i) * 0.03;
        pts.push(P(
          (shL.x + shR.x) / 2 + Rt[0] * side * 0.36 * L.w - F[0] * (0.3 + sway) + lg.x * 1.4,
          (shL.y + shR.y) / 2 + Rt[1] * side * 0.36 * L.w - F[1] * (0.3 + sway) + lg.y * 1.4,
          Math.max(0.03, H * (L.capeLen || 0.08) * cz + torn)));
      }
      const half = [1]; for (let i = 2; i <= 2 + Math.floor(n / 2); i++) half.push(i);
      const hem = []; for (let i = 2; i < pts.length; i++) hem.push(i);
      return { kind: 'poly', pts, c: L.cape, shadeFrom: half, hem };
    }

    // A thin coloured line along a coat or cloak hem.
    function hemTrim(sh, color) {
      if (!sh || !sh.hem) return;
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, inkW * 0.8); ctx.lineJoin = 'miter';
      ctx.beginPath();
      sh.hem.forEach((i, j) => (j ? ctx.lineTo(sh.pts[i].x, sh.pts[i].y) : ctx.moveTo(sh.pts[i].x, sh.pts[i].y)));
      ctx.stroke();
    }

    function quiver(L, shL, pelvis, F, Rt) {
      const a = P(shL.x - F[0] * 0.12, shL.y - F[1] * 0.12, shL.z + 0.12), b = P(pelvis.x - F[0] * 0.14 + Rt[0] * 0.08, pelvis.y - F[1] * 0.14 + Rt[1] * 0.08, pelvis.z + 0.02);
      return { ...seg(a, b, V.cam.sc * 0.07, V.cam.sc * 0.055), c: ['#6b4c33', '#3a281a'] };
    }

    function skirt(L, pelvis, F, Rt, sp, H, cz) {
      const sw = L.w;
      const at = (side, fwd, z, lag) => P(pelvis.x + Rt[0] * side * sw + F[0] * fwd + sp.cx * lag, pelvis.y + Rt[1] * side * sw + F[1] * fwd + sp.cy * lag, z);
      return { kind: 'poly', pts: [at(-0.15, 0, pelvis.z + 0.06, 0), at(0.15, 0, pelvis.z + 0.06, 0), at(0.24, 0.05, H * 0.27 * cz, 1), at(-0.24, 0.05, H * 0.27 * cz, 1)], c: L.skirt, shadeFrom: [1, 2, 3] };
    }

    function drawCostume(u, L, S, F, Rt, sc, px, shR, shL, pelvis, chest, H, cz, lightRight) {
      const big = sc > 70;
      const flash = u.flash > 0;
      // Belt line
      ctx.strokeStyle = INK; ctx.lineWidth = inkW;
      const hw = 0.17 * L.w;
      const bl = P(pelvis.x - Rt[0] * hw, pelvis.y - Rt[1] * hw, pelvis.z + 0.07), br = P(pelvis.x + Rt[0] * hw, pelvis.y + Rt[1] * hw, pelvis.z + 0.07);
      ctx.beginPath(); ctx.moveTo(bl.x, bl.y); ctx.lineTo(br.x, br.y); ctx.stroke();
      if (L.bareChest && !flash) {
        // Heavy pecs and a gut line on bare skin.
        ctx.strokeStyle = 'rgba(12,8,8,0.6)'; ctx.lineWidth = Math.max(1, inkW * 0.8);
        const c = S.chest;
        ctx.beginPath();
        ctx.moveTo(S.shL.x * 0.5 + c.x * 0.5, S.shL.y * 0.5 + c.y * 0.5 + px * 0.6); ctx.quadraticCurveTo(c.x, c.y + px * 1.4, S.shR.x * 0.5 + c.x * 0.5, S.shR.y * 0.5 + c.y * 0.5 + px * 0.6);
        ctx.moveTo(c.x, c.y + px * 0.9); ctx.lineTo(c.x, c.y + px * 1.8);
        ctx.stroke();
      }
      if (L.plate && !flash) {
        // Breastplate: a raised centre ridge and plate edges.
        const c1 = P(chest.x + F[0] * 0.12, chest.y + F[1] * 0.12, chest.z + 0.05);
        ctx.strokeStyle = 'rgba(230,236,242,0.5)'; ctx.lineWidth = Math.max(1, inkW * 0.8);
        ctx.beginPath(); ctx.moveTo(S.neck.x, S.neck.y + px * 0.5); ctx.lineTo(c1.x, c1.y); ctx.lineTo(S.pelvis.x, S.pelvis.y - px * 0.6); ctx.stroke();
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, inkW * 0.7);
        ctx.beginPath(); ctx.moveTo(bl.x, bl.y - px * 0.8); ctx.lineTo(br.x, br.y - px * 0.8); ctx.stroke();
      }
      if (L.pauldron) {
        const sides = L.pauldron === 'both' ? [shL, shR] : [shL];
        const sh = sides.map((q) => { const o = P(q.x, q.y, q.z + 0.05); const k = L.pauldron === 'both' ? 0.72 : 1; return { kind: 'ell', x: o.x, y: o.y, rx: px * 2.0 * k, ry: px * 1.5 * k, rot: -0.3, c: L.armor }; });
        layer(sh, flash);
        if (L.spikes) {
          // the Master Knight's pauldrons rise into spikes
          layer(sh.map((e) => ({ kind: 'poly', pts: [{ x: e.x - e.rx * 0.55, y: e.y - e.ry * 0.5 }, { x: e.x + (e.x < S.chest.x ? -e.rx * 0.5 : e.rx * 0.5), y: e.y - e.ry * 2.4 }, { x: e.x + e.rx * 0.45, y: e.y - e.ry * 0.6 }], c: L.armor, shadeFrom: [1, 2, 0] })), flash);
        }
      }
      if (L.chestV) {
        const c1 = P(chest.x + F[0] * 0.1, chest.y + F[1] * 0.1, chest.z + 0.02);
        ctx.strokeStyle = L.accent; ctx.lineWidth = Math.max(1, inkW * 0.9);
        ctx.beginPath(); ctx.moveTo(S.shL.x, S.shL.y + px); ctx.lineTo(c1.x, c1.y); ctx.lineTo(S.shR.x, S.shR.y + px); ctx.stroke();
      }
      if (L.strap) {
        // Sword strap across the chest.
        ctx.strokeStyle = L.strap; ctx.lineWidth = Math.max(1.5, px * 0.5);
        ctx.beginPath(); ctx.moveTo(S.shL.x, S.shL.y); ctx.lineTo(br.x, br.y); ctx.stroke();
      }
      if (L.satchel) {
        // a healer's satchel on the hip, its strap across the chest
        const c = P(pelvis.x + Rt[0] * 0.2 * L.w + F[0] * 0.04, pelvis.y + Rt[1] * 0.2 * L.w + F[1] * 0.04, pelvis.z - 0.04);
        layer([{ kind: 'ell', x: c.x, y: c.y, rx: px * 1.25, ry: px * 1.0, c: L.satchel }], flash);
        if (!flash) {
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, inkW * 0.6);
          ctx.beginPath(); ctx.moveTo(c.x - px * 1.1, c.y - px * 0.2); ctx.quadraticCurveTo(c.x, c.y + px * 0.35, c.x + px * 1.1, c.y - px * 0.2); ctx.stroke();
          ctx.fillStyle = '#d8c8a0'; ctx.beginPath(); ctx.arc(c.x, c.y + px * 0.15, Math.max(1, px * 0.18), 0, TAU); ctx.fill();
        }
      }
      if (L.quiver) {
        ctx.strokeStyle = '#3a281a'; ctx.lineWidth = Math.max(1.2, px * 0.4);
        ctx.beginPath(); ctx.moveTo(S.shR.x, S.shR.y); ctx.lineTo(bl.x, bl.y); ctx.stroke();
      }
      if (L.collar) {
        // Green ornamentation at the collar, and the ornament itself.
        const n = S.neck;
        ctx.strokeStyle = L.collar; ctx.lineWidth = Math.max(1.2, px * 0.45);
        ctx.beginPath(); ctx.moveTo(S.shL.x * 0.6 + n.x * 0.4, S.shL.y * 0.6 + n.y * 0.4 + px * 0.3); ctx.lineTo(n.x, n.y + px * 1.1); ctx.lineTo(S.shR.x * 0.6 + n.x * 0.4, S.shR.y * 0.6 + n.y * 0.4 + px * 0.3); ctx.stroke();
        ctx.fillStyle = '#7fe0a8'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, inkW * 0.6);
        ctx.beginPath(); ctx.arc(n.x, n.y + px * 1.3, Math.max(1.5, px * 0.38), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (L.coat && L.trim) {
        // Open coat front: two trim lines from the collar down.
        const n = S.neck;
        ctx.strokeStyle = L.trim; ctx.lineWidth = Math.max(1, px * 0.32);
        ctx.beginPath();
        ctx.moveTo(S.shL.x * 0.55 + n.x * 0.45, S.shL.y * 0.55 + n.y * 0.45); ctx.lineTo(bl.x * 0.7 + br.x * 0.3, bl.y * 0.7 + br.y * 0.3 + px * 0.6);
        ctx.moveTo(S.shR.x * 0.55 + n.x * 0.45, S.shR.y * 0.55 + n.y * 0.45); ctx.lineTo(bl.x * 0.3 + br.x * 0.7, bl.y * 0.3 + br.y * 0.7 + px * 0.6);
        ctx.stroke();
      }
      if (L.scarf) {
        // Scarf with a tail that trails.
        const sp = spring(u);
        const n = S.neck, tail = P(chest.x - F[0] * 0.25 + sp.hx * 2, chest.y - F[1] * 0.25 + sp.hy * 2, H * 0.62 * cz);
        layer([{ ...seg(n, tail, px * 1.1, px * 0.4), c: L.scarf }, { kind: 'ell', x: n.x, y: n.y + px * 0.5, rx: px * 1.5, ry: px * 0.9, c: L.scarf, rim: false }], flash);
      }
      if (L.patches && !flash) {
        // patched coat: squares of different cloth with stitch ticks
        const c = S.chest, pv = S.pelvis;
        const sq = [[c.x - px * 0.9, c.y + px * 0.1, px * 0.9, -0.15], [pv.x + px * 0.5, (c.y + pv.y) / 2 + px * 0.4, px * 0.75, 0.2]];
        for (const [x, y, s2, rot] of sq) {
          const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ x: x + (a * Math.cos(rot) - b * Math.sin(rot)) * s2 * 0.6, y: y + (a * Math.sin(rot) + b * Math.cos(rot)) * s2 * 0.6 }));
          ctx.fillStyle = L.patches[0]; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, inkW * 0.6);
          ctx.beginPath(); pathPoly(pts); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(230,210,180,0.6)'; ctx.setLineDash([Math.max(1, px * 0.15), Math.max(1, px * 0.15)]);
          ctx.beginPath(); pathPoly(pts.map((q) => ({ x: x + (q.x - x) * 0.75, y: y + (q.y - y) * 0.75 }))); ctx.stroke(); ctx.setLineDash([]);
        }
      }
      if (L.shawl) {
        // a shawl over the shoulders, knotted at the breast
        const n = S.neck, c = S.chest;
        const knot = { x: c.x, y: c.y + px * 0.4 };
        layer([{ kind: 'poly', pts: [{ x: S.shL.x - px * 0.4, y: S.shL.y - px * 0.2 }, { x: n.x, y: n.y - px * 0.2 }, { x: S.shR.x + px * 0.4, y: S.shR.y - px * 0.2 }, { x: S.shR.x * 0.6 + knot.x * 0.4, y: S.shR.y * 0.4 + knot.y * 0.6 + px * 0.5 }, knot, { x: S.shL.x * 0.6 + knot.x * 0.4, y: S.shL.y * 0.4 + knot.y * 0.6 + px * 0.5 }], c: L.shawl, shadeFrom: lightRight ? [0, 1, 4, 5] : [1, 2, 3, 4] }], flash);
      }
      if (L.sack && !flash) {
        // the grain sack worn as a cloak: a rope tied across the chest
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, px * 0.5);
        ctx.beginPath(); ctx.moveTo(S.shL.x, S.shL.y + px * 0.2); ctx.quadraticCurveTo(S.neck.x, S.neck.y + px * 1.4, S.shR.x, S.shR.y + px * 0.2); ctx.stroke();
        ctx.strokeStyle = '#a88f5e'; ctx.lineWidth = Math.max(1, px * 0.28); ctx.stroke();
        ctx.fillStyle = '#a88f5e'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, inkW * 0.6);
        ctx.beginPath(); ctx.arc(S.neck.x, S.neck.y + px * 0.85, Math.max(1.5, px * 0.35), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (L.scrawl && !flash) {
        // copied glyph marks scratched onto the cloth, glowing faintly
        const t = V.time * 3 + hashId(u.id);
        ctx.strokeStyle = rgba(L.scrawl, (0.55 + 0.25 * Math.sin(t)).toFixed(2)); ctx.lineWidth = Math.max(0.8, px * 0.16); ctx.lineCap = 'round';
        const c = S.chest, pv = S.pelvis;
        ctx.beginPath();
        ctx.arc(c.x - px * 0.3, c.y + px * 0.3, px * 0.45, 0.4, 5.6);
        ctx.moveTo(c.x - px * 0.6, c.y + px * 0.6); ctx.lineTo(c.x, c.y - px * 0.1); ctx.lineTo(c.x + px * 0.2, c.y + px * 0.65);
        ctx.moveTo(pv.x + px * 0.2, pv.y - px * 0.6); ctx.lineTo(pv.x + px * 0.9, pv.y - px * 0.3); ctx.lineTo(pv.x + px * 0.3, pv.y);
        ctx.moveTo(c.x + px * 0.7, c.y - px * 0.2); ctx.lineTo(c.x + px * 0.9, c.y + px * 0.5);
        ctx.stroke();
      }
      const band = L.sash || L.belt;
      if (band) {
        ctx.strokeStyle = band; ctx.lineWidth = Math.max(1.2, px * (L.sash ? 0.7 : 0.45));
        ctx.beginPath(); ctx.moveTo(bl.x, bl.y); ctx.lineTo(br.x, br.y); ctx.stroke();
      }
      if (L.apron) {
        // a long apron tied at the waist, over the front
        const fr = P(pelvis.x + F[0] * 0.3, pelvis.y + F[1] * 0.3, pelvis.z), pv = P(pelvis.x, pelvis.y, pelvis.z);
        if (fr.d > pv.d - 0.02) {
          const at = (fw, side, z) => P(pelvis.x + F[0] * fw + Rt[0] * side * L.w, pelvis.y + F[1] * fw + Rt[1] * side * L.w, z);
          const top = chest.z - 0.04, hem = H * 0.2 * cz;
          const sitting = u.state === 'sit';
          const pts = sitting
            ? [at(0.16, -0.15, top), at(0.16, 0.15, top), at(0.18, 0.2, pelvis.z + 0.06), at(0.5, 0.2, pelvis.z + 0.02), at(0.5, -0.2, pelvis.z + 0.02), at(0.18, -0.2, pelvis.z + 0.06)]
            : [at(0.16, -0.15, top), at(0.16, 0.15, top), at(0.18, 0.2, pelvis.z), at(0.2, 0.24, hem), at(0.2, -0.24, hem), at(0.18, -0.2, pelvis.z)];
          layer([{ kind: 'poly', pts, c: L.apron, shadeFrom: lightRight ? [0, 4, 5] : [1, 2, 3] }], flash);
          if (!flash) {
            ctx.strokeStyle = 'rgba(120,100,80,0.6)'; ctx.lineWidth = Math.max(1, inkW * 0.6);
            ctx.beginPath(); ctx.moveTo(bl.x, bl.y); ctx.lineTo(br.x, br.y); ctx.stroke();
            ctx.fillStyle = 'rgba(122,58,28,0.45)'; const st = at(0.19, 0.06, pelvis.z - 0.12);
            ctx.beginPath(); ctx.ellipse(st.x, st.y, px * 0.5, px * 0.35, 0, 0, TAU); ctx.fill();
          }
        }
      }
      if (L.scraps && !flash) {
        // Scrappy leathers: a few stitched patches.
        ctx.strokeStyle = 'rgba(200,170,130,0.55)'; ctx.lineWidth = Math.max(0.8, inkW * 0.5);
        const c = S.chest;
        ctx.beginPath();
        ctx.moveTo(c.x - px * 0.8, c.y - px * 0.2); ctx.lineTo(c.x + px * 0.4, c.y + px * 0.1);
        ctx.moveTo(c.x - px * 0.2, c.y + px * 0.8); ctx.lineTo(c.x + px * 0.9, c.y + px * 0.6);
        ctx.stroke();
      }
      if (big) {
        // Cloth fold lines at close zoom.
        ctx.strokeStyle = 'rgba(12,8,8,0.55)'; ctx.lineWidth = Math.max(1, inkW * 0.6);
        ctx.beginPath();
        ctx.moveTo(S.chest.x, S.chest.y); ctx.lineTo(S.pelvis.x + (lightRight ? -px : px), S.pelvis.y);
        ctx.stroke();
      }
    }

    function drawHead(u, L, S, F, sc, r, hairTail, lightRight) {
      const h = S.head;
      // Facing on screen: a point ahead of the head.
      const ahead = P(u.x + F[0] * 0.3, u.y + F[1] * 0.3, 0), base = P(u.x, u.y, 0);
      let fx = ahead.x - base.x, fy = ahead.y - base.y;
      const fl = Math.hypot(fx, fy) || 1; fx /= fl; fy /= fl;
      const towardCam = ahead.d > base.d; // face visible
      const flash = u.flash > 0;
      if (L.ears) drawEars(L, h, r, fx, flash, towardCam);
      if (L.ponytail) {
        // hair tied back: a tail from the crown that swings behind
        const sp = spring(u), sc2 = V.cam.sc;
        const b0 = { x: h.x - fx * r * 0.8, y: h.y - r * 0.35 };
        const sw = Math.sin(V.time * 2.3 + u.x) * r * 0.12;
        const tip = { x: b0.x - fx * r * 0.9 + sp.hx * sc2 * 0.9 + sw, y: b0.y + r * 1.9 + sp.hy * sc2 * 0.3 };
        const mid = { x: (b0.x + tip.x) / 2 - fx * r * 0.25, y: (b0.y + tip.y) / 2 };
        layer([{ ...seg(b0, mid, r * 0.34, r * 0.28), c: L.hairC, rim: false }, { ...seg(mid, tip, r * 0.28, r * 0.06), c: L.hairC, rim: false }], flash);
        if (!flash) { ctx.fillStyle = L.accent; ctx.beginPath(); ctx.arc(b0.x - fx * r * 0.1, b0.y + r * 0.15, Math.max(1.2, r * 0.14), 0, TAU); ctx.fill(); }
      }
      // Neck
      layer([{ ...seg(S.neck, { x: h.x, y: h.y + r * 0.4 }, r * 0.32 * (L.stoop ? 1.6 : 1), r * 0.3 * (L.stoop ? 1.6 : 1)), c: L.skin, rim: false }], flash);
      // Head: slightly tall, chin toward the facing side.
      const chin = { x: h.x + fx * r * 0.35, y: h.y + r * 0.95 };
      ctx.lineJoin = 'round';
      const headPath = () => {
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, r * 0.92, r, 0, 0, Math.PI * 2);
        ctx.moveTo(h.x - r * 0.6, h.y + r * 0.45);
        ctx.quadraticCurveTo(chin.x - r * 0.3, chin.y, chin.x, chin.y);
        ctx.quadraticCurveTo(chin.x + r * 0.3, chin.y - r * 0.1, h.x + r * 0.62, h.y + r * 0.45);
      };
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 2;
      headPath(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = flash ? lighten(L.skin[0]) : L.skin[0]; headPath(); ctx.fill();
      if (!flash) {
        // Face shadow on the side away from the light.
        ctx.save(); headPath(); ctx.clip();
        ctx.fillStyle = L.skin[1];
        ctx.beginPath(); ctx.ellipse(h.x - lx * r * 0.95, h.y - ly * r * 0.5, r * 0.85, r * 1.2, 0, 0, Math.PI * 2); ctx.fill();
        if (L.cowl || L.faceless) {
          // the face lost in shadow
          ctx.fillStyle = L.faceless ? '#06040a' : '#100c10';
          ctx.beginPath(); ctx.ellipse(h.x + fx * r * 0.2, h.y + r * 0.1, r * 0.95, r * 1.1, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      const glowEyes = L.glowEyes;
      // Eyes at close zoom when the face is toward us.
      if (!glowEyes && !L.blank && towardCam && sc > 55 && !flash) {
        const ex = h.x + fx * r * 0.42, ey = h.y + r * 0.12;
        const gap = r * 0.36, ew = Math.max(1.5, r * 0.2), eh = Math.max(1, r * 0.1);
        ctx.fillStyle = INK;
        for (const sgn of [-1, 1]) {
          const x = ex + sgn * gap * Math.abs(fy) * 0.9;
          ctx.beginPath(); ctx.ellipse(x, ey, ew, eh, sgn * -0.25, 0, Math.PI * 2); ctx.fill();
          if (sc > 90) {
            ctx.fillStyle = L.eye; ctx.beginPath(); ctx.ellipse(x + fx * ew * 0.2, ey, ew * 0.45, eh * 0.95, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + fx * ew * 0.35, ey - eh * 0.35, Math.max(0.8, eh * 0.35), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = INK;
          }
        }
        // brows
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(ex - gap - ew, ey - eh * 3.2); ctx.lineTo(ex - gap * 0.3, ey - eh * 2.2);
        ctx.moveTo(ex + gap + ew, ey - eh * 3.2); ctx.lineTo(ex + gap * 0.3, ey - eh * 2.2);
        ctx.stroke();
      }
      if (L.tusks && towardCam && !flash) {
        ctx.fillStyle = '#e8dcc4'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, inkW * 0.6);
        for (const sgn of [-1, 1]) {
          const x = chin.x + sgn * r * 0.32 * Math.max(0.4, Math.abs(fy)), y = chin.y - r * 0.25;
          ctx.beginPath(); ctx.moveTo(x - r * 0.1, y); ctx.lineTo(x + sgn * r * 0.04, y - r * 0.38); ctx.lineTo(x + r * 0.1, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      if (L.beard) drawBeard(L, h, r, chin, fx, flash);
      drawHair(u, L, h, r, fx, fy, towardCam, flash, hairTail);
      if (L.hat) drawHat(L, h, r, fx, flash);
      if (L.horns) drawHorns(L, h, r, fx, flash);
      if (glowEyes && !flash && (towardCam || L.faceless)) drawGlowEyes(L, h, r, fx, fy, glowEyes, u);
      if (L.blank && !flash && towardCam) {
        // no face at all: a smooth pale blank, a faint hollow where eyes were
        ctx.fillStyle = rgba(L.skin[1], 0.55);
        const ex = h.x + fx * r * 0.42, ey = h.y + r * 0.12, gap = r * 0.34 * Math.max(0.35, Math.abs(fy));
        ctx.beginPath(); ctx.ellipse(ex - gap, ey, r * 0.16, r * 0.07, 0, 0, Math.PI * 2); ctx.ellipse(ex + gap, ey, r * 0.16, r * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (L.crown) drawToolCrown(u, h, r, fx, flash);
    }

    // A brimmed hat, or a flat cap with a short peak toward the face.
    function drawHat(L, h, r, fx, flash) {
      const c = L.hat.c, bw = L.hat.brim;
      const cy = h.y - r * 0.5;
      const shapes = [];
      if (L.hat.cap) {
        shapes.push({ kind: 'ell', x: h.x + fx * r * 0.55, y: cy + r * 0.12, rx: r * 0.6, ry: r * 0.18, rot: fx * 0.2, c, rim: false });
        shapes.push({ kind: 'ell', x: h.x - fx * r * 0.05, y: cy - r * 0.12, rx: r * 1.02, ry: r * 0.5, c, rim: false });
      } else {
        shapes.push({ kind: 'ell', x: h.x - fx * r * 0.05, y: cy + r * 0.05, rx: r * bw, ry: r * 0.3, c, rim: false });
        shapes.push({ kind: 'poly', pts: [{ x: h.x - r * 0.72, y: cy + r * 0.05 }, { x: h.x - r * 0.62, y: cy - r * 0.85 }, { x: h.x + r * 0.62, y: cy - r * 0.85 }, { x: h.x + r * 0.72, y: cy + r * 0.05 }], c, shadeFrom: lx < 0 ? [2, 3, 0] : [0, 1, 3] });
      }
      layer(shapes, flash);
      if (!flash && !L.hat.cap) { ctx.fillStyle = '#2a1c12'; ctx.fillRect(h.x - r * 0.7, cy - r * 0.2, r * 1.4, r * 0.2); }
    }

    // Curved horns rising from a helm: out, up and hooking forward.
    function drawHorns(L, h, r, fx, flash) {
      const shapes = [];
      for (const sg of [-1, 1]) {
        const b = { x: h.x + sg * r * 0.72 - fx * r * 0.1, y: h.y - r * 0.45 };
        const m = { x: h.x + sg * r * 1.55 - fx * r * 0.2, y: h.y - r * 1.15 };
        const tip = { x: h.x + sg * r * 1.25 + fx * r * 0.35, y: h.y - r * 2.15 };
        const w = r * 0.26;
        shapes.push({ kind: 'poly', pts: [
          { x: b.x - sg * w * 0.2, y: b.y - w }, { x: m.x - sg * w * 0.6, y: m.y - w * 0.6 }, tip,
          { x: m.x + sg * w * 0.7, y: m.y + w * 0.4 }, { x: b.x + sg * w * 0.6, y: b.y + w * 0.8 },
        ], c: L.horns, shadeFrom: [2, 3, 4] });
      }
      layer(shapes, flash);
      if (!flash) {
        ctx.strokeStyle = 'rgba(159,232,255,0.5)'; ctx.lineWidth = Math.max(0.8, r * 0.06);
        ctx.beginPath();
        for (const sh of shapes) { const q = sh.pts; ctx.moveTo(q[0].x, q[0].y); ctx.quadraticCurveTo(q[1].x, q[1].y, q[2].x, q[2].y); }
        ctx.stroke();
      }
    }

    // A crude crown of stolen tools: a strap round the skull with nails,
    // a sickle blade, a bent spoon and a chisel standing up from it.
    function drawToolCrown(u, h, r, fx, flash) {
      const by = h.y - r * 0.55, bx = h.x - fx * r * 0.1;
      const spikes = [[-0.75, 0.55, -0.35, '#9a9690'], [-0.38, 0.95, -0.12, '#b0aaa0'], [0.0, 0.7, 0.05, '#c0a060'], [0.38, 1.05, 0.15, '#9a9690'], [0.74, 0.6, 0.38, '#b0aaa0']];
      const shapes = [];
      for (const [o, hgt, tilt, col] of spikes) {
        const x = bx + o * r, y = by - Math.abs(o) * r * 0.08;
        shapes.push({ kind: 'poly', pts: [{ x: x - r * 0.09, y }, { x: x + tilt * r * hgt, y: y - r * hgt }, { x: x + r * 0.11, y }], c: [col, '#4a4640'], shadeFrom: [1, 2, 0] });
      }
      layer(shapes, flash);
      if (!flash) {
        // the sickle: a curved blade hooked over one side
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.5, r * 0.2); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(bx - r * 0.95, by - r * 0.5, r * 0.45, -0.4, 1.9); ctx.stroke();
        ctx.strokeStyle = '#c9c4bc'; ctx.lineWidth = Math.max(1, r * 0.09);
        ctx.beginPath(); ctx.arc(bx - r * 0.95, by - r * 0.5, r * 0.45, -0.4, 1.9); ctx.stroke();
        // the spoon bowl on the middle spike
        ctx.fillStyle = '#d6b86a'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, inkW * 0.7);
        ctx.beginPath(); ctx.ellipse(bx, by - r * 0.78, r * 0.14, r * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      // the strap
      layer([{ ...seg({ x: bx - r * 0.92, y: by + r * 0.06 }, { x: bx + r * 0.92, y: by + r * 0.06 }, r * 0.14, r * 0.14), c: ['#5a4030', '#2e2016'] }], flash);
      void u;
    }

    // Seaweed hanging off shoulders and arms, swaying.
    function drawWeed(G) {
      const { u, L, S, px, flash } = G;
      if (flash) return;
      const t = V.time * 1.6 + hashId(u.id);
      const roots = [[S.shL, 3.2, 0], [S.shR, 2.6, 1], [S.neck, 2.0, 2], [S.elL, 2.2, 3], [S.elR, 1.8, 4], [S.pelvis, 2.8, 5]];
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [w, col] of [[0.5, INK], [0.28, L.weed[0]]]) {
        ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, px * w);
        ctx.beginPath();
        for (const [q, len, i] of roots) {
          let x = q.x + (i - 2.5) * px * 0.3, y = q.y;
          ctx.moveTo(x, y);
          const n = 4;
          for (let k = 1; k <= n; k++) {
            x += Math.sin(t + i * 1.7 + k * 1.1) * px * 0.45;
            y += (len * px) / n;
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    }

    // Water dripping from the hem and the hands; drops land and ring.
    function drawDrips(G) {
      const { u, S, sc, flash } = G;
      if (flash) return;
      const base = P(u.x, u.y, 0);
      const src = [S.handL, S.handR, S.kneeL, S.kneeR, S.pelvis];
      const h0 = hashId(u.id) * 0.013;
      ctx.fillStyle = 'rgba(190,232,250,0.85)';
      ctx.strokeStyle = 'rgba(190,232,250,0.5)'; ctx.lineWidth = Math.max(0.8, sc * 0.01);
      for (let i = 0; i < src.length; i++) {
        const q = src[i], ph = (V.time * 0.9 + i * 0.29 + h0) % 1;
        const gy = base.y + (i - 2) * sc * 0.04;
        const y = q.y + (gy - q.y) * ph * ph;
        const r = Math.max(1, sc * 0.018);
        if (ph < 0.92) { ctx.beginPath(); ctx.ellipse(q.x, y, r * 0.7, r * 1.3, 0, 0, Math.PI * 2); ctx.fill(); }
        else {
          const k = (ph - 0.92) / 0.08;
          ctx.beginPath(); ctx.ellipse(q.x, gy, sc * 0.12 * k, sc * 0.04 * k, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }

    // A cold light pooled on the ground under a drowned thing.
    function coldPool(u, L, sc) {
      const p = P(u.x, u.y, 0), r = sc * u.r * 2.4 * (0.92 + 0.08 * Math.sin(V.time * 2.4 + hashId(u.id)));
      ctx.fillStyle = rgba(L.coldGlow, 0.13);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * V.cam.pitch, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(L.coldGlow, 0.1);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.6, r * 0.6 * V.cam.pitch, 0, 0, Math.PI * 2); ctx.fill();
    }

    function drawEars(L, h, r, fx, flash, towardCam) {
      // Big pointed ears sweeping out and back.
      const ear = (sgn) => {
        const bx = h.x + sgn * r * 0.7 - fx * r * 0.15, by = h.y + r * 0.05;
        return { kind: 'poly', pts: [{ x: bx, y: by - r * 0.32 }, { x: bx + sgn * r * 1.25 - fx * r * 0.35, y: by - r * 0.55 }, { x: bx, y: by + r * 0.3 }], c: L.skin, shadeFrom: [0, 1, 2] };
      };
      layer([ear(-1), ear(1)], flash);
      if (!flash) {
        ctx.fillStyle = L.skin[1];
        for (const sgn of [-1, 1]) {
          const bx = h.x + sgn * r * 0.72 - fx * r * 0.15, by = h.y + r * 0.05;
          ctx.beginPath(); ctx.moveTo(bx, by - r * 0.12); ctx.lineTo(bx + sgn * r * 0.85 - fx * r * 0.25, by - r * 0.4); ctx.lineTo(bx, by + r * 0.14); ctx.closePath(); ctx.fill();
        }
      }
    }

    function drawBeard(L, h, r, chin, fx, flash) {
      const c = flash ? [lighten(L.beard[0])] : L.beard;
      const pts = [
        { x: h.x - r * 0.88 + fx * r * 0.1, y: h.y + r * 0.1 },
        { x: h.x - r * 0.75 + fx * r * 0.2, y: h.y + r * 0.95 },
        { x: chin.x - r * 0.3, y: chin.y + r * 0.75 },
        { x: chin.x + fx * r * 0.2, y: chin.y + r * 1.05 },
        { x: chin.x + r * 0.35, y: chin.y + r * 0.72 },
        { x: h.x + r * 0.78 + fx * r * 0.2, y: h.y + r * 0.95 },
        { x: h.x + r * 0.88 + fx * r * 0.1, y: h.y + r * 0.1 },
        // mouth opening edge
        { x: h.x + r * 0.35 + fx * r * 0.3, y: h.y + r * 0.42 },
        { x: h.x - r * 0.35 + fx * r * 0.3, y: h.y + r * 0.42 },
      ];
      const sh = [{ kind: 'poly', pts, c, shadeFrom: lx < 0 ? [3, 4, 5, 6, 7] : [0, 1, 2, 3, 8] }];
      if (L.braids) {
        // two braids hanging from the beard
        for (const o of [-0.25, 0.25]) {
          const a = { x: chin.x + o * r, y: chin.y + r * 0.7 }, b = { x: chin.x + o * r * 1.3 + fx * r * 0.1, y: chin.y + r * 1.75 };
          sh.push({ ...seg(a, b, r * 0.16, r * 0.1), c, rim: false });
        }
      }
      layer(sh, flash);
      if (!flash && L.braids) {
        ctx.fillStyle = '#c9a24a';
        for (const o of [-0.25, 0.25]) { ctx.beginPath(); ctx.arc(chin.x + o * r * 1.2 + fx * r * 0.06, chin.y + r * 1.35, Math.max(1, r * 0.11), 0, Math.PI * 2); ctx.fill(); }
      }
    }

    // Glowing eyes in a shadowed face: one under a cowl, or slits.
    function drawGlowEyes(L, h, r, fx, fy, n, u) {
      const ex = h.x + fx * r * 0.42, ey = h.y + r * 0.16;
      const gap = r * 0.3 * Math.max(0.35, Math.abs(fy));
      const flick = L.faceless ? 0.75 + 0.25 * Math.sin(V.time * 17 + hashId(u.id)) : 1;
      const xs = n === 1 ? [ex + gap * 0.6] : [ex - gap, ex + gap];
      for (const x of xs) {
        ctx.fillStyle = rgba(L.eye, 0.22 * flick);
        ctx.beginPath(); ctx.ellipse(x, ey, r * 0.55, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = L.eye;
        ctx.beginPath();
        if (L.faceless) { ctx.moveTo(x - r * 0.3, ey - r * 0.08); ctx.lineTo(x + r * 0.3, ey - r * 0.02 * (x < ex ? -1 : 1) - r * 0.06); ctx.lineTo(x + r * 0.05, ey + r * 0.06); ctx.closePath(); }
        else ctx.ellipse(x, ey, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff3f0';
        ctx.beginPath(); ctx.arc(x, ey - r * 0.01, Math.max(0.8, r * 0.05), 0, Math.PI * 2); ctx.fill();
      }
    }

    function drawHair(u, L, h, r, fx, fy, towardCam, flash, hairTail) {
      if (L.hair === 'bald') {
        if (!flash) { ctx.fillStyle = 'rgba(20,14,12,0.35)'; ctx.beginPath(); ctx.ellipse(h.x - fx * r * 0.2, h.y - r * 0.35, r * 0.8, r * 0.5, 0, Math.PI, 0); ctx.fill(); }
        return;
      }
      const helm = L.hair === 'helm';
      const hood = L.hair === 'hood';
      const bob = L.hair === 'bob';
      const src = helm ? L.armor : hood && L.hood ? L.hood : L.hairC;
      const c = flash ? [lighten(src[0]), lighten(src[0])] : src;
      // Hair mass sits on top and toward the back of the head (away from the face).
      const bx = h.x - fx * r * (helm ? 0.05 : 0.25), by = h.y - r * (helm ? 0.18 : 0.28);
      const spikes = L.hair === 'spiky' ? 7 : L.hair === 'messy' ? 8 : L.hair === 'long' ? 9 : 6;
      const pts = [];
      const cowl = L.cowl ? 1.12 : 1;
      for (let i = 0; i <= spikes; i++) {
        const a = Math.PI + (i / spikes) * Math.PI; // across the top
        const spike = L.hair === 'short' || L.hair === 'long' || hood || helm || bob ? 1.0 : i % 2 ? 1.0 : 1.32;
        const rr = r * (hood ? 1.2 * cowl : helm ? 1.04 : bob ? 1.1 : 1.05) * spike;
        pts.push({ x: bx + Math.cos(a) * rr, y: by + Math.sin(a) * rr * 0.95 * (hood && L.cowl ? 1.15 : 1) });
      }
      if (hood && L.cowl) {
        // a peaked cowl
        const mid = pts[Math.floor(spikes / 2)];
        mid.y -= r * 0.25; mid.x -= fx * r * 0.2;
      }
      // Bangs falling over the forehead on the face side.
      const bangs = [];
      if (!hood && !helm) {
        const n = 4;
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          const x = h.x - r * 0.95 + t * r * 1.9 + fx * r * 0.2;
          bangs.push({ x, y: h.y - r * 0.6 }, { x: x + fx * r * 0.18 + (i % 2 ? 2 : -2), y: h.y + (towardCam ? -r * 0.05 : r * 0.2) + (i % 2) * r * 0.15 });
        }
      }
      const drop = hood ? (L.cowl ? 1.25 : 0.9) : bob ? 1.05 : helm ? 0.4 : 0.35;
      ctx.lineJoin = 'miter';
      const massPath = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y + r * drop);
        if (bob) ctx.lineTo(pts[0].x + r * 0.15, pts[0].y + r * drop + r * 0.12);
        for (const q of pts) ctx.lineTo(q.x, q.y);
        if (bob) ctx.lineTo(pts[pts.length - 1].x - r * 0.15, pts[pts.length - 1].y + r * drop + r * 0.12);
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y + r * drop);
        if (hood && L.cowl) {
          // the cowl's opening frames the shadowed face
          ctx.lineTo(h.x + r * 0.62 + fx * r * 0.3, h.y + r * 0.85);
          ctx.lineTo(h.x + r * 0.5 + fx * r * 0.35, h.y - r * 0.25);
          ctx.quadraticCurveTo(h.x + fx * r * 0.4, h.y - r * 0.7, h.x - r * 0.5 + fx * r * 0.35, h.y - r * 0.25);
          ctx.lineTo(h.x - r * 0.62 + fx * r * 0.3, h.y + r * 0.85);
        }
        if (!hood && !helm) for (let i = bangs.length - 1; i >= 0; i -= 2) { ctx.lineTo(bangs[i].x, bangs[i].y); ctx.lineTo(bangs[i - 1].x, bangs[i - 1].y); }
        ctx.closePath();
      };
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 2;
      massPath(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = c[0]; massPath(); ctx.fill();
      if (!flash) {
        ctx.save(); massPath(); ctx.clip();
        ctx.fillStyle = c[1];
        ctx.beginPath(); ctx.ellipse(bx - lx * r * 1.1, by - ly * r * 0.6 + r * 0.3, r * 1.1, r * 1.0, 0, 0, Math.PI * 2); ctx.fill();
        // A glossy highlight band, anime style.
        if (V.cam.sc > 45) {
          ctx.strokeStyle = L.hair === 'long' || helm ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.22)';
          ctx.lineWidth = Math.max(1, r * 0.12);
          ctx.beginPath(); ctx.arc(bx + lx * r * 0.2, by + r * 0.05, r * 0.7, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
        }
        ctx.restore();
      }
      if (helm && !flash) {
        // brow band and a nasal guard
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, inkW);
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y + r * 0.3); ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y + r * 0.3); ctx.stroke();
        if (towardCam) {
          const nx = h.x + fx * r * 0.42;
          layer([{ ...seg({ x: nx, y: h.y - r * 0.5 }, { x: nx, y: h.y + r * 0.35 }, r * 0.12, r * 0.09), c: L.armor, rim: false }], false);
        }
      }
      if (L.hair === 'long' && V.cam.sc > 45 && !flash) {
        // Strand lines down the long hair.
        const t = hairTail;
        ctx.strokeStyle = 'rgba(120,104,140,0.7)'; ctx.lineWidth = Math.max(0.8, r * 0.07);
        ctx.beginPath();
        for (const o of [-0.5, 0, 0.5]) {
          ctx.moveTo(t.pb.x + o * r, t.pb.y); ctx.quadraticCurveTo(t.pm.x + o * r * 1.1, t.pm.y, t.pt.x + o * r * 0.3, t.pt.y);
        }
        ctx.stroke();
      }
    }

    // ---------------------------------------------------------------- weapons
    function drawWeapon(G) {
      const { u, L, S, sc, px, tipW, flash } = G;
      if (!tipW) return;
      if (L.weapon === 'branch' && !u.armed) return;
      const h = S.handR, t = P(tipW.x, tipW.y, tipW.z);
      const dx = t.x - h.x, dy = t.y - h.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, ux = dx / l, uy = dy / l;
      switch (L.weapon) {
        case 'branch': {
          layer([{ ...seg(h, t, px * 0.55, px * 0.32), c: ['#6b4c33', '#3a281a'] }], flash);
          // a twig
          const m = { x: h.x + dx * 0.6, y: h.y + dy * 0.6 };
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, px * 0.3);
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + dy * 0.12, m.y - dx * 0.12); ctx.stroke();
          return;
        }
        case 'hammer': {
          // haft, then a squared head across the tip
          layer([{ ...seg({ x: h.x - ux * px * 0.9, y: h.y - uy * px * 0.9 }, t, px * 0.3, px * 0.3), c: ['#5a3f2a', '#2e2015'] }], flash);
          const hw = Math.max(3, px * 0.95), hl = Math.max(4, px * 1.7);
          const head = [
            { x: t.x + nx * hl - ux * hw, y: t.y + ny * hl - uy * hw }, { x: t.x + nx * hl + ux * hw, y: t.y + ny * hl + uy * hw },
            { x: t.x - nx * hl * 0.8 + ux * hw, y: t.y - ny * hl * 0.8 + uy * hw }, { x: t.x - nx * hl * 0.8 - ux * hw, y: t.y - ny * hl * 0.8 - uy * hw },
          ];
          layer([{ kind: 'poly', pts: head, c: ['#8f99a4', '#454c55'], shadeFrom: [1, 2, 3] }], flash);
          return;
        }
        case 'spear': case 'longspear': {
          // shaft runs back past the hand; leaf blade at the tip
          const butt = { x: h.x - dx * 0.35, y: h.y - dy * 0.35 };
          const neck = { x: t.x - ux * px * 1.8, y: t.y - uy * px * 1.8 };
          layer([{ ...seg(butt, neck, px * 0.24, px * 0.22), c: L.blade ? ['#6e8498', '#304254'] : ['#7a5a3c', '#3e2c1d'] }], flash);
          const bw = Math.max(2, px * 0.5);
          const blade = () => { ctx.beginPath(); ctx.moveTo(neck.x - ux * px * 0.3, neck.y - uy * px * 0.3); ctx.lineTo(neck.x + nx * bw + ux * px * 0.6, neck.y + ny * bw + uy * px * 0.6); ctx.lineTo(t.x + ux * px * 0.9, t.y + uy * px * 0.9); ctx.lineTo(neck.x - nx * bw + ux * px * 0.6, neck.y - ny * bw + uy * px * 0.6); ctx.closePath(); };
          ctx.lineJoin = 'miter';
          ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 1.6; blade(); ctx.stroke(); ctx.fill();
          ctx.fillStyle = flash ? '#fff' : L.blade ? L.blade[0] : '#a6a49a'; blade(); ctx.fill();
          if (!flash && L.blade) {
            // a frost edge down one side of the blade
            ctx.strokeStyle = L.edge; ctx.lineWidth = Math.max(0.8, px * 0.14);
            ctx.beginPath(); ctx.moveTo(neck.x + nx * bw * 0.5, neck.y + ny * bw * 0.5); ctx.lineTo(t.x + ux * px * 0.6, t.y + uy * px * 0.6); ctx.stroke();
          }
          if (!flash && !L.blade) {
            // binding and a rag tied below the head
            ctx.strokeStyle = '#8e1621'; ctx.lineWidth = Math.max(1.2, px * 0.35);
            ctx.beginPath(); ctx.moveTo(neck.x - ux * px * 0.5, neck.y - uy * px * 0.5); ctx.lineTo(neck.x - ux * px * 0.5 - ny * px * 0.2 + nx * px * 1.4, neck.y - uy * px * 0.5 + px * 1.2); ctx.stroke();
          }
          return;
        }
        case 'beam': {
          // A heavy timber from the loading frame, with iron brackets.
          const back = { x: h.x - ux * px * 0.6, y: h.y - uy * px * 0.6 };
          layer([{ ...seg(back, t, px * 0.55, px * 0.7), c: ['#6e5236', '#3a2a1a'] }], flash);
          if (!flash) {
            ctx.lineCap = 'butt';
            for (const k of [0.62, 0.93]) {
              const m = { x: back.x + (t.x - back.x) * k, y: back.y + (t.y - back.y) * k };
              const w = px * (0.55 + 0.15 * k) + inkW;
              ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, px * 0.45);
              ctx.beginPath(); ctx.moveTo(m.x + nx * w, m.y + ny * w); ctx.lineTo(m.x - nx * w, m.y - ny * w); ctx.stroke();
              ctx.strokeStyle = '#5b5f66'; ctx.lineWidth = Math.max(1.5, px * 0.25);
              ctx.beginPath(); ctx.moveTo(m.x + nx * w * 0.9, m.y + ny * w * 0.9); ctx.lineTo(m.x - nx * w * 0.9, m.y - ny * w * 0.9); ctx.stroke();
            }
            // grain
            ctx.strokeStyle = 'rgba(20,12,8,0.45)'; ctx.lineWidth = Math.max(0.8, inkW * 0.5);
            ctx.beginPath(); ctx.moveTo(back.x + (t.x - back.x) * 0.15 + nx * px * 0.2, back.y + (t.y - back.y) * 0.15 + ny * px * 0.2); ctx.lineTo(back.x + (t.x - back.x) * 0.55 + nx * px * 0.25, back.y + (t.y - back.y) * 0.55 + ny * px * 0.25); ctx.stroke();
            ctx.lineCap = 'round';
          }
          return;
        }
        case 'cudgel': {
          // A knotted club, thick at the end, studded with nails.
          const g0 = { x: h.x - ux * px * 0.7, y: h.y - uy * px * 0.7 };
          const m = { x: h.x + dx * 0.55, y: h.y + dy * 0.55 };
          layer([{ ...seg(g0, m, px * 0.32, px * 0.45), c: ['#6b4c33', '#3a281a'] }, { ...seg(m, t, px * 0.5, px * 0.72), c: ['#6b4c33', '#3a281a'] }], flash);
          if (!flash) {
            ctx.fillStyle = '#c9c4bc'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, inkW * 0.5);
            for (const [k, o] of [[0.7, 0.6], [0.82, -0.7], [0.93, 0.4], [0.78, 0.05]]) {
              const q = { x: h.x + dx * k + nx * px * o, y: h.y + dy * k + ny * px * o };
              ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1, px * 0.15), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            }
            // a strip of cloth bound round the grip
            ctx.strokeStyle = '#7a2a24'; ctx.lineWidth = Math.max(1.2, px * 0.3);
            ctx.beginPath(); ctx.moveTo(h.x + nx * px * 0.4 + dx * 0.12, h.y + ny * px * 0.4 + dy * 0.12); ctx.lineTo(h.x - nx * px * 0.4 + dx * 0.2, h.y - ny * px * 0.4 + dy * 0.2); ctx.stroke();
          }
          return;
        }
        case 'cleaver': {
          // The miller's cleaver: short haft, a broad square blade, a hole in its corner.
          const neck = { x: h.x + dx * 0.32, y: h.y + dy * 0.32 };
          layer([{ ...seg({ x: h.x - ux * px * 0.6, y: h.y - uy * px * 0.6 }, neck, px * 0.3, px * 0.3), c: ['#5a3f2a', '#2e2015'] }], flash);
          const bw = px * 1.5;
          const blade = [
            { x: neck.x + nx * px * 0.3, y: neck.y + ny * px * 0.3 }, { x: t.x + nx * px * 0.3, y: t.y + ny * px * 0.3 },
            { x: t.x - nx * bw * 1.15 + ux * px * 0.2, y: t.y - ny * bw * 1.15 + uy * px * 0.2 }, { x: neck.x - nx * bw, y: neck.y - ny * bw },
          ];
          layer([{ kind: 'poly', pts: blade, c: ['#a9aaa6', '#5d5f60'], shadeFrom: [2, 3, 0] }], flash);
          if (!flash) {
            // rust along the spine, a bright cutting edge, the hanging hole
            ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = Math.max(1, px * 0.3);
            ctx.beginPath(); ctx.moveTo(blade[0].x, blade[0].y); ctx.lineTo(blade[1].x, blade[1].y); ctx.stroke();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(0.8, px * 0.16);
            ctx.beginPath(); ctx.moveTo(blade[3].x + nx * px * 0.15, blade[3].y + ny * px * 0.15); ctx.lineTo(blade[2].x + nx * px * 0.15, blade[2].y + ny * px * 0.15); ctx.stroke();
            const hole = { x: t.x - nx * px * 0.45 - ux * px * 0.4, y: t.y - ny * px * 0.45 - uy * px * 0.4 };
            ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(hole.x, hole.y, Math.max(1, px * 0.2), 0, Math.PI * 2); ctx.fill();
          }
          return;
        }
        case 'hexstick': {
          // A crooked stick with a copied glyph scratched into a disc at its end.
          const m = { x: h.x + dx * 0.5 + nx * px * 0.25, y: h.y + dy * 0.5 + ny * px * 0.25 };
          const butt = { x: h.x - ux * px * 1.2, y: h.y - uy * px * 1.2 };
          layer([{ ...seg(butt, m, px * 0.24, px * 0.22), c: ['#6e5638', '#3a2c1c'] }, { ...seg(m, t, px * 0.22, px * 0.18), c: ['#6e5638', '#3a2c1c'] }], flash);
          const AK = attackK(u);
          const k = AK ? (AK.ph === 'wind' ? AK.e : AK.ph === 'strike' ? 1.3 : 1 - AK.e) : V.introPhase ? 0.8 : 0.3;
          hexGlyph(t, sc * (0.1 + 0.05 * k), k, L.hexGlow, flash, u);
          return;
        }
        case 'bell': {
          // A chain from the hands to a cracked bronze bell, mouth outward.
          const len = Math.max(4, l * 0.42);
          const top = { x: h.x + ux * len, y: h.y + uy * len };
          if (!flash) {
            ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, px * 0.4); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(top.x, top.y); ctx.stroke();
            ctx.strokeStyle = '#6f7a78'; ctx.lineWidth = Math.max(1, px * 0.2);
            ctx.setLineDash([Math.max(2, px * 0.35), Math.max(1.5, px * 0.2)]);
            ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(top.x, top.y); ctx.stroke();
            ctx.setLineDash([]);
          }
          bellShape(top, t, nx, ny, sc * 0.5, flash, u, L);
          return;
        }
        case 'greataxe': {
          // A long haft and a huge crescent head that reaches past the guard.
          const butt = { x: h.x - ux * px * 1.6, y: h.y - uy * px * 1.6 };
          layer([{ ...seg(butt, t, px * 0.26, px * 0.24), c: ['#46586a', '#202a34'] }], flash);
          const hw = Math.max(8, sc * 0.3), hb = { x: t.x - ux * px * 0.6, y: t.y - uy * px * 0.6 };
          const c0 = { x: hb.x - ux * px * 1.4, y: hb.y - uy * px * 1.4 };
          const head = [
            { x: c0.x, y: c0.y }, { x: c0.x - nx * hw * 0.55 - ux * hw * 0.55, y: c0.y - ny * hw * 0.55 - uy * hw * 0.55 },
            { x: hb.x - nx * hw * 1.05 - ux * hw * 0.2, y: hb.y - ny * hw * 1.05 - uy * hw * 0.2 },
            { x: hb.x - nx * hw * 1.0 + ux * hw * 0.55, y: hb.y - ny * hw * 1.0 + uy * hw * 0.55 },
            { x: hb.x - nx * hw * 0.5 + ux * hw * 0.75, y: hb.y - ny * hw * 0.5 + uy * hw * 0.75 },
            { x: t.x + ux * px * 0.2, y: t.y + uy * px * 0.2 },
            // the back spike
            { x: hb.x + nx * hw * 0.55, y: hb.y + ny * hw * 0.55 }, { x: c0.x + nx * px * 0.3, y: c0.y + ny * px * 0.3 },
          ];
          layer([{ kind: 'poly', pts: head, c: L.blade || ['#c9d2da', '#6d7782'], shadeFrom: [0, 5, 6, 7] }], flash);
          if (!flash) {
            ctx.strokeStyle = L.edge || '#ffffff'; ctx.lineWidth = Math.max(1, px * 0.22); ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(head[1].x, head[1].y); ctx.quadraticCurveTo(head[2].x, head[2].y, head[3].x, head[3].y); ctx.lineTo(head[4].x, head[4].y); ctx.stroke();
          }
          return;
        }
        case 'claws': {
          // Shadow talons from both hands.
          for (const hand of [S.handR, S.handL]) {
            const ax = hand === S.handR ? ux : (S.handL.x - S.elL.x), ay = hand === S.handR ? uy : (S.handL.y - S.elL.y);
            const al = Math.hypot(ax, ay) || 1;
            talons(hand, ax / al, ay / al, px * 2.2, flash);
          }
          return;
        }
      }
      // Blades: a tapered sliver with a bright edge.
      const kind = L.weapon;
      const bw = Math.max(1.5, px * (kind === 'sword' ? 0.42 : kind === 'greatsword' ? 0.95 : 0.38));
      const g = { x: h.x + dx * 0.1, y: h.y + dy * 0.1 };
      ctx.lineJoin = 'miter';
      let blade;
      if (kind === 'greatsword') {
        // broad and snapped off: a jagged end instead of a point
        const b1 = { x: g.x + dx * 0.78, y: g.y + dy * 0.78 }, b2 = { x: g.x + dx * 0.9, y: g.y + dy * 0.9 };
        blade = () => {
          ctx.beginPath(); ctx.moveTo(g.x + nx * bw, g.y + ny * bw);
          ctx.lineTo(b2.x + nx * bw * 0.9, b2.y + ny * bw * 0.9);
          ctx.lineTo(b1.x + nx * bw * 0.25, b1.y + ny * bw * 0.25);
          ctx.lineTo(b2.x - nx * bw * 0.35, b2.y - ny * bw * 0.35);
          ctx.lineTo(b1.x - nx * bw * 0.9, b1.y - ny * bw * 0.9);
          ctx.lineTo(g.x - nx * bw, g.y - ny * bw); ctx.closePath();
        };
      } else {
        blade = () => { ctx.beginPath(); ctx.moveTo(g.x + nx * bw, g.y + ny * bw); ctx.lineTo(t.x, t.y); ctx.lineTo(g.x - nx * bw, g.y - ny * bw); ctx.closePath(); };
      }
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 1.6; blade(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = flash ? '#ffffff' : L.blade ? L.blade[0] : kind === 'greatsword' ? '#dcd8da' : '#c9d2da'; blade(); ctx.fill();
      if (!flash) {
        ctx.save(); blade(); ctx.clip();
        ctx.fillStyle = L.blade ? L.blade[1] : kind === 'greatsword' ? '#7a7176' : '#6d7782';
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(t.x, t.y); ctx.lineTo(t.x - nx * bw * 2, t.y - ny * bw * 2); ctx.lineTo(g.x - nx * bw * 2, g.y - ny * bw * 2); ctx.closePath(); ctx.fill();
        ctx.restore();
        const edge = kind === 'greatsword' ? 0.86 : 1;
        ctx.strokeStyle = L.edge || (kind === 'greatsword' || kind === 'twin' ? '#ff5a68' : '#ffffff'); ctx.lineWidth = Math.max(0.8, bw * (kind === 'greatsword' ? 0.18 : 0.3));
        ctx.beginPath(); ctx.moveTo(g.x + nx * bw * 0.6, g.y + ny * bw * 0.6); ctx.lineTo(g.x + dx * edge * 0.88 + nx * bw * 0.4, g.y + dy * edge * 0.88 + ny * bw * 0.4); ctx.stroke();
      }
      if (kind === 'sword' || kind === 'greatsword') {
        // cross-guard and grip
        const k = kind === 'greatsword' ? 1.7 : 3;
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, px * 0.75); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(g.x + nx * bw * k, g.y + ny * bw * k); ctx.lineTo(g.x - nx * bw * k, g.y - ny * bw * k); ctx.stroke();
        ctx.strokeStyle = kind === 'greatsword' ? '#8e1621' : '#8a8f96'; ctx.lineWidth = Math.max(1, px * 0.4);
        ctx.beginPath(); ctx.moveTo(g.x + nx * bw * k * 0.87, g.y + ny * bw * k * 0.87); ctx.lineTo(g.x - nx * bw * k * 0.87, g.y - ny * bw * k * 0.87); ctx.stroke();
        if (kind === 'greatsword') {
          // long wrapped grip behind the guard
          const pm = { x: h.x - ux * px * 1.6, y: h.y - uy * px * 1.6 };
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, px * 0.55);
          ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(pm.x, pm.y); ctx.stroke();
          ctx.strokeStyle = '#43171b'; ctx.lineWidth = Math.max(1, px * 0.3);
          ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(pm.x, pm.y); ctx.stroke();
        }
      }
    }

    function talons(hand, ux, uy, len, flash) {
      const nx = -uy, ny = ux;
      ctx.lineJoin = 'miter';
      const path = () => {
        ctx.beginPath();
        for (const o of [-0.45, 0, 0.45]) {
          const bx = hand.x + nx * o * len * 0.35, by = hand.y + ny * o * len * 0.35;
          ctx.moveTo(bx + nx * len * 0.07, by + ny * len * 0.07);
          ctx.lineTo(bx + ux * len + nx * o * len * 0.3, by + uy * len + ny * o * len * 0.3);
          ctx.lineTo(bx - nx * len * 0.07, by - ny * len * 0.07);
          ctx.closePath();
        }
      };
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 1.4; path(); ctx.stroke(); ctx.fill();
      ctx.fillStyle = flash ? '#fff' : '#3a2650'; path(); ctx.fill();
      if (!flash) {
        ctx.strokeStyle = 'rgba(255,58,76,0.8)'; ctx.lineWidth = Math.max(0.7, inkW * 0.45);
        ctx.beginPath();
        for (const o of [-0.45, 0, 0.45]) { const bx = hand.x + nx * o * len * 0.35, by = hand.y + ny * o * len * 0.35; ctx.moveTo(bx, by); ctx.lineTo(bx + ux * len * 0.85 + nx * o * len * 0.26, by + uy * len * 0.85 + ny * o * len * 0.26); }
        ctx.stroke();
      }
    }

    // A goblin's copy of a glyph: a crooked ring and scratched strokes that
    // glow a wrong, hot violet. k: charge (0 idle .. 1+ firing).
    function hexGlyph(c, r, k, col, flash, u) {
      const t = V.time * 2.2 + hashId(u.id);
      const a = Math.min(1, 0.4 + 0.5 * k) * (flash ? 0.5 : 1);
      const flick = 0.85 + 0.15 * Math.sin(t * 7.3);
      ctx.fillStyle = rgba(col, (0.18 * a * flick).toFixed(2));
      ctx.beginPath(); ctx.arc(c.x, c.y, r * (1.6 + 0.4 * k), 0, Math.PI * 2); ctx.fill();
      // the disc it is scratched into
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(c.x, c.y, r * 0.95, r * 0.85, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(col, Math.min(1, a + 0.15).toFixed(2)); ctx.lineWidth = Math.max(1, r * 0.14); ctx.lineCap = 'round'; ctx.lineJoin = 'miter';
      ctx.beginPath();
      // lopsided ring (copied by eye)
      for (let i = 0; i <= 9; i++) {
        const q = (i / 9) * Math.PI * 2 + t * 0.3, rr = r * (0.72 + ((i * 7) % 3) * 0.06);
        const x = c.x + Math.cos(q) * rr, y = c.y + Math.sin(q) * rr * 0.9;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      // a triangle and a stroke through it, slightly off
      ctx.moveTo(c.x, c.y - r * 0.5); ctx.lineTo(c.x + r * 0.45, c.y + r * 0.3); ctx.lineTo(c.x - r * 0.42, c.y + r * 0.34); ctx.lineTo(c.x + r * 0.05, c.y - r * 0.42);
      ctx.moveTo(c.x - r * 0.55, c.y - r * 0.05); ctx.lineTo(c.x + r * 0.6, c.y + r * 0.02);
      ctx.stroke();
      ctx.fillStyle = rgba('#fff0ff', a.toFixed(2));
      ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(1, r * 0.14), 0, Math.PI * 2); ctx.fill();
    }

    // A cracked bronze bell: crown at `top`, mouth around `mouth`; n: the
    // screen normal of the axis; R: mouth radius in px.
    function bellShape(top, mouth, nx, ny, R, flash, u, L) {
      const ax = mouth.x - top.x, ay = mouth.y - top.y;
      const at = (k, w) => ({ x: top.x + ax * k + nx * R * w, y: top.y + ay * k + ny * R * w });
      const right = [at(0, 0.38), at(0.25, 0.5), at(0.6, 0.56), at(0.88, 0.8), at(1, 1.0)];
      const left = [at(0, -0.38), at(0.25, -0.5), at(0.6, -0.56), at(0.88, -0.8), at(1, -1.0)];
      const pts = right.concat(left.reverse());
      const litRight = nx * lx + ny * ly > 0;
      const shade = litRight ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];
      layer([{ kind: 'poly', pts, c: ['#8c6c3c', '#4a3820'], shadeFrom: shade }], flash);
      // crown loop
      const cr = at(-0.12, 0);
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, R * 0.16);
      ctx.beginPath(); ctx.ellipse(cr.x, cr.y, R * 0.18, R * 0.14, Math.atan2(ay, ax), 0, Math.PI * 2); ctx.stroke();
      if (flash) return;
      ctx.save(); ctx.beginPath(); pathPoly(pts); ctx.clip();
      // verdigris streaks running down from the crown
      ctx.strokeStyle = 'rgba(96,150,128,0.75)'; ctx.lineWidth = Math.max(1, R * 0.1); ctx.lineCap = 'round';
      ctx.beginPath();
      for (const w of [-0.3, 0.05, 0.32]) { const a0 = at(0.05, w * 0.8), a1 = at(0.55 + Math.abs(w) * 0.4, w); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); }
      ctx.stroke();
      // the sound bow: a raised band near the lip
      ctx.strokeStyle = 'rgba(12,8,8,0.6)'; ctx.lineWidth = Math.max(1, R * 0.06);
      ctx.beginPath(); const b0 = at(0.8, -0.8), b1 = at(0.8, 0.8); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(240,210,150,0.55)'; ctx.lineWidth = Math.max(0.8, R * 0.04);
      ctx.beginPath(); const c0 = at(0.76, -0.75), c1 = at(0.76, 0.75); ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.stroke();
      ctx.restore();
      // the crack, open to a cold light inside
      const k0 = at(0.12, 0.1), k1 = at(0.35, -0.12), k2 = at(0.55, 0.12), k3 = at(0.78, -0.08), k4 = at(1.0, 0.1);
      const glow = L.coldGlow || '#9fe8ff';
      const pulse = 0.65 + 0.35 * Math.sin(V.time * 2.4 + hashId(u.id));
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, R * 0.12); ctx.lineJoin = 'miter';
      ctx.beginPath(); ctx.moveTo(k0.x, k0.y); ctx.lineTo(k1.x, k1.y); ctx.lineTo(k2.x, k2.y); ctx.lineTo(k3.x, k3.y); ctx.lineTo(k4.x, k4.y); ctx.stroke();
      ctx.strokeStyle = rgba(glow, (0.9 * pulse).toFixed(2)); ctx.lineWidth = Math.max(1, R * 0.045);
      ctx.stroke();
      // mouth: a dark ellipse with the clapper and cold light welling up
      const m = at(1, 0), mr = R * 1.0;
      const ang = Math.atan2(ny, nx);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(m.x, m.y, mr, mr * 0.32, ang, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(glow, (0.55 * pulse).toFixed(2)); ctx.beginPath(); ctx.ellipse(m.x, m.y, mr * 0.78, mr * 0.2, ang, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2c18'; ctx.beginPath(); ctx.arc(m.x - ax * 0.04, m.y - ay * 0.04, Math.max(1.5, R * 0.16), 0, Math.PI * 2); ctx.fill();
      // water running off the lip
      ctx.fillStyle = 'rgba(170,225,245,0.8)';
      for (let i = 0; i < 3; i++) {
        const ph = (V.time * 1.4 + i * 0.37 + hashId(u.id) * 0.01) % 1;
        const w = (i - 1) * 0.7, s0 = at(1, w);
        ctx.beginPath(); ctx.ellipse(s0.x, s0.y + ph * R * 1.4, Math.max(0.8, R * 0.05), Math.max(1.2, R * 0.1), 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    // The off hand's item: a second blade, or the bow.
    function drawOffHand(G) {
      const { u, L, S, F, px, handL, elL, flash, bowDraw, H, cz } = G;
      if (L.weapon === 'twin') {
        if (G.stowed) return;
        // reverse grip: the blade runs back along the forearm
        const dx = handL.x - elL.x, dy = handL.y - elL.y, dz = handL.z - elL.z, l = Math.hypot(dx, dy, dz) || 1;
        const k = 0.42;
        const tip = P(handL.x - dx / l * k + F[0] * 0.04, handL.y - dy / l * k + F[1] * 0.04, handL.z - dz / l * k - 0.06);
        const h = S.handL;
        const tx = tip.x - h.x, ty = tip.y - h.y, tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
        const bw = Math.max(1.5, px * 0.36);
        const blade = () => { ctx.beginPath(); ctx.moveTo(h.x + nx * bw, h.y + ny * bw); ctx.lineTo(tip.x, tip.y); ctx.lineTo(h.x - nx * bw, h.y - ny * bw); ctx.closePath(); };
        ctx.lineJoin = 'miter';
        ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 1.6; blade(); ctx.stroke(); ctx.fill();
        ctx.fillStyle = flash ? '#fff' : L.blade ? L.blade[0] : '#c9d2da'; blade(); ctx.fill();
        if (!flash) {
          ctx.strokeStyle = L.edge || '#ff5a68'; ctx.lineWidth = Math.max(0.8, bw * 0.3);
          ctx.beginPath(); ctx.moveTo(h.x + nx * bw * 0.5, h.y + ny * bw * 0.5); ctx.lineTo(tip.x, tip.y); ctx.stroke();
        }
      } else if (L.weapon === 'bow') {
        // A rough wooden bow, upright in the bow hand; the string runs to the
        // drawing hand while it pulls.
        const len = 0.5 * Math.max(0.8, L.h);
        const bend = 0.12 + bowDraw * 0.1;
        const top = P(handL.x + F[0] * bend, handL.y + F[1] * bend, handL.z + len);
        const bot = P(handL.x + F[0] * bend, handL.y + F[1] * bend, handL.z - len);
        const h = S.handL;
        const tTop = P(handL.x - F[0] * 0.02, handL.y - F[1] * 0.02, handL.z + len * 0.95);
        const tBot = P(handL.x - F[0] * 0.02, handL.y - F[1] * 0.02, handL.z - len * 0.95);
        const string = bowDraw > 0.05 ? S.handR : { x: (tTop.x + tBot.x) / 2, y: (tTop.y + tBot.y) / 2 };
        if (!flash) {
          ctx.strokeStyle = 'rgba(230,220,200,0.8)'; ctx.lineWidth = Math.max(0.8, inkW * 0.5);
          ctx.beginPath(); ctx.moveTo(tTop.x, tTop.y); ctx.lineTo(string.x, string.y); ctx.lineTo(tBot.x, tBot.y); ctx.stroke();
        }
        const limb = () => {
          ctx.beginPath(); ctx.moveTo(tTop.x, tTop.y);
          ctx.quadraticCurveTo(top.x, top.y + (h.y - top.y) * 0.3, h.x + (top.x - h.x) * 0.4, h.y);
          ctx.quadraticCurveTo(bot.x, bot.y - (bot.y - h.y) * 0.3, tBot.x, tBot.y);
        };
        ctx.lineCap = 'round';
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, px * 0.7); limb(); ctx.stroke();
        ctx.strokeStyle = flash ? '#fff' : '#7a5a3c'; ctx.lineWidth = Math.max(1.5, px * 0.35); limb(); ctx.stroke();
        if (bowDraw > 0.05 && !flash) {
          // the nocked arrow
          const head = P(handL.x + F[0] * 0.14, handL.y + F[1] * 0.14, handL.z);
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, px * 0.3);
          ctx.beginPath(); ctx.moveTo(S.handR.x, S.handR.y); ctx.lineTo(head.x, head.y); ctx.stroke();
          ctx.strokeStyle = '#c8b090'; ctx.lineWidth = Math.max(1, px * 0.14);
          ctx.beginPath(); ctx.moveTo(S.handR.x, S.handR.y); ctx.lineTo(head.x, head.y); ctx.stroke();
          ctx.fillStyle = '#c9d2da'; ctx.beginPath(); ctx.arc(head.x, head.y, Math.max(1.2, px * 0.22), 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // A round shield on the off arm: a disc facing forward, iron rim and boss.
    function drawShield(G) {
      const { L, F, Rt, handL, sc, flash, ps } = G;
      const sh = L.shield;
      const R = sh.r;
      const c = { x: handL.x + F[0] * 0.06, y: handL.y + F[1] * 0.06, z: handL.z };
      // tilt it a little across the body
      const ax = [Rt[0], Rt[1]];
      const n = 16, pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const ca = Math.cos(a) * R, sa = Math.sin(a) * R;
        pts.push(P(c.x + ax[0] * ca + F[0] * ca * 0.12, c.y + ax[1] * ca + F[1] * ca * 0.12, c.z + sa * 1.05));
      }
      // shade the half away from the light (screen space)
      let best = 0, bd = -1e9;
      for (let i = 0; i < n; i++) { const d = -(pts[i].x * lx + pts[i].y * ly); if (d > bd) { bd = d; best = i; } }
      const half = []; for (let i = -4; i <= 4; i++) half.push((best + i + n) % n);
      layer([{ kind: 'poly', pts, c: sh.c, shadeFrom: half }], flash);
      if (flash) return;
      // planks
      const cc = P(c.x, c.y, c.z);
      ctx.save(); ctx.beginPath(); pathPoly(pts); ctx.clip();
      ctx.strokeStyle = 'rgba(12,8,8,0.55)'; ctx.lineWidth = Math.max(1, inkW * 0.6);
      ctx.beginPath();
      for (const o of [-0.5, 0, 0.5]) {
        const a = P(c.x + ax[0] * R * o, c.y + ax[1] * R * o, c.z + R * 1.1), b = P(c.x + ax[0] * R * o, c.y + ax[1] * R * o, c.z - R * 1.1);
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
      ctx.restore();
      // iron rim
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.5, sc * 0.06); ctx.lineJoin = 'round';
      ctx.beginPath(); pathPoly(pts); ctx.stroke();
      ctx.strokeStyle = sh.rimC; ctx.lineWidth = Math.max(1.2, sc * 0.03);
      ctx.beginPath(); pathPoly(pts); ctx.stroke();
      // boss
      const bx = pts[0].x - cc.x, by = pts[4].y - cc.y;
      const brx = Math.max(2, Math.abs(bx) * 0.3), bry = Math.max(2, Math.abs(by) * 0.3);
      layer([{ kind: 'ell', x: cc.x, y: cc.y, rx: Math.max(brx, bry * 0.4), ry: bry, c: sh.boss }], false);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(cc.x + lx * brx * 0.35, cc.y + ly * bry * 0.35, Math.max(0.8, bry * 0.22), 0, Math.PI * 2); ctx.fill();
      void ps;
    }

    // Violet glyph circles on the casting hands; brighter while charging.
    function drawGlyphHands(G) {
      const { u, L, S, sc, flash } = G;
      const AK = attackK(u);
      const casting = u.state === 'cast' || AK || (V.introPhase && G.ps.off === 'cast');
      const hands = L.glyphHands === 'both' ? [S.handL, S.handR] : [S.handL];
      if (AK && L.glyphHands !== 'both') hands.push(S.handR);
      const k = AK ? (AK.ph === 'wind' ? AK.e : AK.ph === 'strike' ? 1.2 : 1 - AK.e) : casting ? 0.8 : 0.25;
      const t = V.time;
      for (let i = 0; i < hands.length; i++) {
        const hd = hands[i];
        const main = AK ? hd === S.handR : hd === S.handL;
        const r = sc * (main ? 0.1 + 0.1 * k : 0.08 + 0.04 * k);
        const a = (main ? 0.45 + 0.5 * Math.min(1, k) : 0.35 + 0.3 * Math.min(1, k)) * (flash ? 0.5 : 1);
        ctx.fillStyle = rgba(L.glyph, (0.16 * a).toFixed(2));
        ctx.beginPath(); ctx.arc(hd.x, hd.y, r * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = rgba(L.glyph, a.toFixed(2)); ctx.lineWidth = Math.max(1, r * 0.12);
        ctx.beginPath(); ctx.ellipse(hd.x, hd.y, r, r * 0.92, 0, 0, Math.PI * 2); ctx.stroke();
        if (r > 4) {
          // inner ring with rune ticks, turning
          ctx.beginPath(); ctx.ellipse(hd.x, hd.y, r * 0.62, r * 0.57, 0, 0, Math.PI * 2);
          const rot = t * (i ? -1.6 : 1.2);
          for (let j = 0; j < 6; j++) {
            const q = rot + (j / 6) * Math.PI * 2;
            ctx.moveTo(hd.x + Math.cos(q) * r * 0.62, hd.y + Math.sin(q) * r * 0.57);
            ctx.lineTo(hd.x + Math.cos(q + 0.35) * r * 0.95, hd.y + Math.sin(q + 0.35) * r * 0.88);
          }
          ctx.stroke();
        }
        ctx.fillStyle = rgba('#f4eeff', Math.min(1, a + 0.2).toFixed(2));
        ctx.beginPath(); ctx.arc(hd.x, hd.y, Math.max(1, r * 0.16), 0, Math.PI * 2); ctx.fill();
      }
    }

    // Jagged dark shards breaking off a fragment's silhouette.
    function drawShards(G) {
      const { u, L, S, px, flash } = G;
      const step = Math.floor(V.time * 8 + hashId(u.id)) % 4; // flickers in steps
      const anchors = [[S.shL, -1, -1.2], [S.shR, 1, -1.1], [S.pelvis, -1, 0.6], [S.chest, 1, 0.2], [S.head, 1, -1.6], [S.kneeL, -1, 0.4]];
      const shapes = [];
      anchors.forEach(([q, sgn, up], i) => {
        if ((i + step) % 4 === 0) return;
        const len = px * (2.4 + ((i * 5 + step) % 3) * 0.9);
        const ax = sgn * 0.9, ay = up * 0.5;
        const l = Math.hypot(ax, ay);
        const ux = ax / l, uy = ay / l, nx = -uy, ny = ux;
        shapes.push({ kind: 'poly', pts: [
          { x: q.x + nx * px * 0.5, y: q.y + ny * px * 0.5 },
          { x: q.x + ux * len * 0.55 + nx * px * 0.5, y: q.y + uy * len * 0.55 + ny * px * 0.5 },
          { x: q.x + ux * len, y: q.y + uy * len },
          { x: q.x + ux * len * 0.35 - nx * px * 0.35, y: q.y + uy * len * 0.35 - ny * px * 0.35 },
          { x: q.x - nx * px * 0.5, y: q.y - ny * px * 0.5 },
        ], c: L.shards, shadeFrom: [2, 3, 4] });
      });
      layer(shapes, flash);
      if (!flash) {
        ctx.strokeStyle = 'rgba(227,38,58,0.55)'; ctx.lineWidth = Math.max(0.8, inkW * 0.5);
        ctx.beginPath();
        for (const sh of shapes) { const q = sh.pts; ctx.moveTo(q[1].x, q[1].y); ctx.lineTo(q[2].x, q[2].y); }
        ctx.stroke();
        // a red seam glowing through the body
        ctx.strokeStyle = 'rgba(227,38,58,0.65)'; ctx.lineWidth = Math.max(0.8, px * 0.18); ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(S.neck.x, S.neck.y + px * 0.6);
        ctx.lineTo(S.chest.x + px * 0.5, S.chest.y);
        ctx.lineTo(S.chest.x - px * 0.3, (S.chest.y + S.pelvis.y) / 2);
        ctx.lineTo(S.pelvis.x + px * 0.2, S.pelvis.y);
        ctx.stroke();
      }
    }

    // Braxen's altered arm: bone ridges pushing up under the skin along the
    // forearm and upper arm, creeping a little as if they were still moving.
    function boneRidges(G, side) {
      const { u, L, S, px, flash } = G;
      const sh = S['sh' + side], el = S['el' + side], hd = S['hand' + side];
      const t = V.time * 1.3 + hashId(u.id) * 0.1;
      // outward: away from the chest
      const out = (a, b) => {
        const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
        let nx = -dy / l, ny = dx / l;
        const mx = (a.x + b.x) / 2 - S.chest.x, my = (a.y + b.y) / 2 - S.chest.y;
        if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
        return { dx: dx / l, dy: dy / l, nx, ny, l };
      };
      const shapes = [];
      const ridge = (a, b, n, w0, h0, ph) => {
        const o = out(a, b);
        for (let i = 0; i < n; i++) {
          const k = (i + 0.6 + 0.25 * Math.sin(t + i * 1.7 + ph)) / (n + 0.4);
          const bx = a.x + (b.x - a.x) * k, by = a.y + (b.y - a.y) * k;
          const wd = w0 * (0.8 + 0.3 * Math.sin(t * 1.4 + i)), hh = h0 * (0.75 + 0.4 * Math.sin(t * 0.9 + i * 2.3 + ph));
          const base = px * 0.62;
          shapes.push({ kind: 'poly', pts: [
            { x: bx + o.nx * base - o.dx * wd, y: by + o.ny * base - o.dy * wd },
            { x: bx + o.nx * (base + hh) - o.dx * wd * 0.6, y: by + o.ny * (base + hh) - o.dy * wd * 0.6 },
            { x: bx + o.nx * base + o.dx * wd, y: by + o.ny * base + o.dy * wd },
          ], c: L.bone, shadeFrom: [1, 2, 0], rim: false });
        }
      };
      ridge(el, hd, 4, px * 0.32, px * 0.75, 0);
      ridge(sh, el, 3, px * 0.3, px * 0.55, 2);
      // knuckle spurs on the fist
      const o = out(el, hd);
      for (const j of [-0.5, 0.5]) {
        const b = { x: hd.x + o.dx * px * 0.7 + o.nx * j * px * 0.6, y: hd.y + o.dy * px * 0.7 + o.ny * j * px * 0.6 };
        shapes.push({ kind: 'poly', pts: [{ x: b.x - o.nx * px * 0.2, y: b.y - o.ny * px * 0.2 }, { x: b.x + o.dx * px * 0.6, y: b.y + o.dy * px * 0.6 }, { x: b.x + o.nx * px * 0.2, y: b.y + o.ny * px * 0.2 }], c: L.bone, rim: false });
      }
      layer(shapes, flash);
      if (flash) return;
      // the skin pulled tight between ridges: dark seams down the arm
      ctx.strokeStyle = 'rgba(40,20,22,0.6)'; ctx.lineWidth = Math.max(0.8, px * 0.14); ctx.lineCap = 'round';
      ctx.beginPath();
      for (const [a, b] of [[sh, el], [el, hd]]) {
        const oo = out(a, b);
        ctx.moveTo(a.x + oo.nx * px * 0.2, a.y + oo.ny * px * 0.2);
        ctx.quadraticCurveTo((a.x + b.x) / 2 - oo.nx * px * 0.25, (a.y + b.y) / 2 - oo.ny * px * 0.25, b.x + oo.nx * px * 0.1, b.y + oo.ny * px * 0.1);
      }
      ctx.stroke();
    }

    // Brass knuckles over both fists.
    function drawKnuckles(G) {
      const { L, S, px, flash } = G;
      if (flash) return;
      for (const h of [S.handL, S.handR]) {
        ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(h.x, h.y - px * 0.35, px * 1.05, px * 0.42, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = L.knuckles; ctx.beginPath(); ctx.ellipse(h.x, h.y - px * 0.35, px * 0.9, px * 0.3, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff3c8';
        for (const o of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.arc(h.x + o * px, h.y - px * 0.42, Math.max(0.8, px * 0.1), 0, TAU); ctx.fill(); }
      }
    }

    // Power from the open hands. pressure: air folding into rings that bend
    // what is behind them (no glow, no glyphs); light: a white-gold bloom
    // held in the palm; heal: a green-white light.
    function drawPalms(G) {
      const { u, L, S, sc, flash } = G;
      if (flash) return;
      const AK = attackK(u);
      const casting = u.state === 'cast' || (V.introPhase && G.ps.off === 'cast' && V.spotlight === u.id);
      const k = AK ? (AK.ph === 'wind' ? AK.e : AK.ph === 'strike' ? 1.2 : 1 - AK.e) : casting ? 0.9 : 0;
      const t = V.time + hashId(u.id) * 0.1;
      const main = S.handR, off = S.handL;
      if (L.palms === 'pressure') {
        // a faint ripple even at rest; rings fold in toward the palm as it charges
        const rings = k > 0 ? 3 : 1, base = sc * (0.12 + 0.22 * Math.min(1, k));
        for (let i = 0; i < rings; i++) {
          const ph = (t * (k > 0 ? 2.2 : 0.8) + i / rings) % 1;
          const r = base * (1.6 - ph * 1.1);
          const a = (k > 0 ? 0.65 : 0.3) * Math.sin(ph * Math.PI);
          // light arc on the lit side, a dark arc just inside it: reads as a lens
          ctx.lineWidth = Math.max(1, sc * 0.022);
          ctx.strokeStyle = `rgba(232,240,252,${a.toFixed(3)})`;
          ctx.beginPath(); ctx.ellipse(main.x, main.y, r, r * 0.9, 0, 0, TAU); ctx.stroke();
          ctx.strokeStyle = `rgba(12,10,16,${(a * 0.7).toFixed(3)})`;
          ctx.beginPath(); ctx.ellipse(main.x + lx * 2, main.y + ly * 2, r * 0.86, r * 0.78, 0, 0, TAU); ctx.stroke();
        }
        if (k > 0.6) {
          // the air squeezed white at the centre
          ctx.fillStyle = `rgba(240,246,255,${(0.35 * Math.min(1, k)).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(main.x, main.y, Math.max(1.5, sc * 0.05), 0, TAU); ctx.fill();
        }
      } else {
        const rgb = L.palms === 'heal' ? '168,240,192' : '255,236,190';
        const hands = k > 0 ? [main, off] : [main];
        const glow = Math.max(0.22, k);
        for (const h of hands) {
          const r = sc * (0.1 + 0.16 * Math.min(1.2, glow)) * (h === main ? 1 : 0.7) * (1 + 0.1 * Math.sin(t * 9));
          ctx.fillStyle = `rgba(${rgb},${(0.22 * glow).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(h.x, h.y, r * 1.8, 0, TAU); ctx.fill();
          ctx.fillStyle = `rgba(${rgb},${(0.55 * glow).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, TAU); ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,${Math.min(1, 0.4 + glow * 0.6).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(1.2, r * 0.35), 0, TAU); ctx.fill();
          if (L.palms === 'heal' && k > 0) {
            // motes rising off the healing hand
            for (let i = 0; i < 4; i++) {
              const ph = (t * 0.9 + i * 0.25) % 1;
              ctx.fillStyle = `rgba(${rgb},${(0.8 * (1 - ph)).toFixed(3)})`;
              ctx.fillRect(h.x + Math.sin(i * 2.1 + t * 2) * r * 1.2 - 1.5, h.y - ph * sc * 0.6, 3, 3);
            }
          }
        }
      }
      // Big power ages the hands: dark veins up the fingers during her heavy art.
      if (L.palms === 'pressure' && curS && curS.cutscene && curS.cutscene.unit === u) {
        const kk = Math.min(1, curS.cutscene.t / 0.8);
        ctx.strokeStyle = `rgba(30,14,30,${(0.85 * kk).toFixed(3)})`; ctx.lineWidth = Math.max(1, sc * 0.014); ctx.lineCap = 'round';
        ctx.beginPath();
        for (const [h, e] of [[S.handR, S.elR], [S.handL, S.elL]]) {
          const dx = e.x - h.x, dy = e.y - h.y;
          for (const o of [-0.25, 0.05, 0.3]) {
            ctx.moveTo(h.x - dy * o * 0.3, h.y + dx * o * 0.3);
            ctx.quadraticCurveTo(h.x + dx * 0.3 + dy * o * 0.4, h.y + dy * 0.3 - dx * o * 0.4, h.x + dx * 0.6 * kk - dy * o * 0.2, h.y + dy * 0.6 * kk + dx * o * 0.2);
          }
        }
        ctx.stroke();
      }
    }

    // ---------------------------------------------------------------- the Stray
    // A big feral animal on all fours: hunched shoulders under a black mane,
    // long forelegs, a low head with a snout full of teeth (three rows), a
    // thin tail. Trots when it moves; coils back on the wind-up and lunges
    // with its jaws wide on the strike.
    function drawBeast(u, L, sc) {
      const flash = u.flash > 0;
      const sp = spring(u);
      const tt = V.time + hashId(u.id) * 0.1;
      const lying = u.state === 'down' || u.state === 'out';
      const f = u.facing, F = [Math.cos(f), Math.sin(f)], Rt = [-F[1], F[0]];
      // size: a smaller (or bigger) animal on the same rig
      const SZ = L.size || 1;
      const Pl = (wx, wy, z) => P(u.x + (wx - u.x) * SZ, u.y + (wy - u.y) * SZ, z * SZ);
      const W = (x, y, z) => Pl(u.x + F[0] * x + Rt[0] * y, u.y + F[1] * x + Rt[1] * y, z);
      V.shadow(u.x, u.y, u.r * (lying ? 2.0 : 1.75), 0.45);
      ctx.globalAlpha = u.state === 'out' ? 0.6 : 1;
      const AK = attackK(u);
      let coil = 0, lunge = 0, jaw = 0.22 + 0.06 * Math.sin(tt * 3), headUp = 0, low = 0;
      if (AK) {
        if (AK.ph === 'wind') { coil = AK.e; jaw = 0.25 + 0.55 * AK.e; }
        else if (AK.ph === 'strike') { lunge = 1; jaw = 1; }
        else { lunge = 1 - AK.e; jaw = 1 - 0.75 * AK.e; }
      }
      const hurt = u.state === 'hurt' || u.state === 'stagger';
      if (hurt) { headUp = 0.18; jaw = 0.7; coil = 0.3; }
      if (u.state === 'dodge') low = 0.16;
      if (u.state === 'circle') low = 0.06;
      if (V.introPhase) {
        // the face-off: head up, a long snarl
        const k = V.spotlight === u.id ? 1 : 0.5;
        headUp = 0.22 * k; jaw = 0.55 + 0.4 * k + Math.sin(tt * 9) * 0.05 * k; coil = 0.25 * k;
      }
      const moving = u.state === 'move' || u.state === 'opener' || u.fleeing;
      const g = u.walk * 3.2;
      const amp = moving ? 0.3 : u.state === 'circle' ? 0.14 : 0;
      const bob = moving ? Math.abs(Math.sin(g)) * 0.05 : Math.sin(tt * 2.1) * 0.012;
      const jit = hurt ? Math.sin(u.st * 70) * 0.04 : 0;
      const shift = 0.38 * lunge - 0.26 * coil + jit;
      const dz = -0.2 * coil - low + bob - (lying ? 0.62 : 0);
      const side = lying ? 0.0 : 0;
      void side;
      // Body joints (metres, along the facing).
      const hip = { x: -0.78 + shift, z: Math.max(0.32, 0.84 + dz * 0.6) };
      const sh = { x: 0.46 + shift * 1.2, z: Math.max(0.38, 1.1 + dz) };
      const hump = { x: 0.16 + shift, z: Math.max(0.5, 1.38 + dz) };
      const head = { x: 1.0 + shift * 1.5 - 0.08 * coil, z: Math.max(0.3, 0.9 + dz + headUp - 0.08 * lunge) };
      const pt = (q, y, dzz) => W(q.x, y || 0, q.z + (dzz || 0));
      const Hip = pt(hip), Sh = pt(sh), Hump = pt(hump), Head = pt(head);
      // Legs: diagonal pairs trot together. Forelegs are long, elbows out.
      const legs = [];
      for (const s of [-1, 1]) {
        const phF = g + (s > 0 ? 0 : Math.PI), phH = g + (s > 0 ? Math.PI : 0);
        const lift = (ph) => (amp ? Math.max(0, Math.sin(ph)) * 0.2 : 0);
        let fp, fe, ft, hp2, hk, hh, hpaw;
        if (lying) {
          ft = W(sh.x, s * 0.25, sh.z * 0.9); fe = W(sh.x + 0.45, 0.55 + s * 0.15, 0.3); fp = W(sh.x + 0.85, 0.9 + s * 0.2, 0.08);
          hp2 = W(hip.x, s * 0.2, hip.z); hk = W(hip.x + 0.3, 0.5 + s * 0.15, 0.28); hh = W(hip.x - 0.1, 0.75 + s * 0.15, 0.15); hpaw = W(hip.x + 0.05, 0.95 + s * 0.15, 0.06);
        } else {
          const sf = Math.cos(phF) * amp, sh2 = Math.cos(phH) * amp;
          ft = W(sh.x - 0.02, s * 0.3, sh.z - 0.2);
          fp = W(0.78 + shift * 1.7 + sf, s * 0.34, lift(phF));
          fe = W((sh.x + 0.78 + shift * 1.7 + sf) / 2 - 0.12 - coil * 0.1, s * 0.42, (sh.z - 0.1) * 0.5 + lift(phF) * 0.5);
          hp2 = W(hip.x + 0.05, s * 0.24, hip.z - 0.12);
          hk = W(hip.x + 0.22, s * 0.3, hip.z * 0.55 + lift(phH) * 0.3);
          hh = W(hip.x - 0.28 + sh2 * 0.8, s * 0.3, 0.24 + lift(phH));
          hpaw = W(hip.x - 0.12 + sh2, s * 0.3, lift(phH));
        }
        legs.push({ s, fore: [ft, fe, fp], hind: [hp2, hk, hh, hpaw] });
      }
      const px = sc * 0.1 * SZ;
      const fur = L.fur, mane = L.mane;
      const legShapes = (lg) => [
        { ...seg(lg.hind[0], lg.hind[1], px * 2.6, px * 1.5), c: fur, rim: false },
        { ...seg(lg.hind[1], lg.hind[2], px * 1.4, px * 0.9), c: fur, rim: false },
        { ...seg(lg.hind[2], lg.hind[3], px * 0.9, px * 0.85), c: fur, rim: false },
        { ...seg(lg.fore[0], lg.fore[1], px * 2.3, px * 1.5), c: fur },
        { ...seg(lg.fore[1], lg.fore[2], px * 1.5, px * 1.05), c: fur },
        { kind: 'ell', x: lg.fore[2].x, y: lg.fore[2].y, rx: px * 1.3, ry: px * 0.8, c: fur, rim: false },
      ];
      const claws = (lg) => {
        if (flash) return;
        const p0 = lg.fore[2], ahead = W(2, lg.s * 0.34, 0), base = W(0, lg.s * 0.34, 0);
        let ux = ahead.x - base.x, uy = ahead.y - base.y; const l = Math.hypot(ux, uy) || 1; ux /= l; uy /= l;
        ctx.fillStyle = L.claw; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, inkW * 0.6);
        for (const o of [-0.6, 0, 0.6]) {
          const bx = p0.x + ux * px * 0.6 - uy * o * px * 0.6, by = p0.y + uy * px * 0.6 + ux * o * px * 0.6 + px * 0.2;
          ctx.beginPath(); ctx.moveTo(bx - uy * px * 0.18, by + ux * px * 0.18); ctx.lineTo(bx + ux * px * 0.75, by + uy * px * 0.75 + px * 0.25); ctx.lineTo(bx + uy * px * 0.18, by - ux * px * 0.18); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      };
      // Tail: thin, drooping, lagging behind motion, a tuft at the end.
      const tailB = W(hip.x - 0.15, 0, hip.z + 0.05);
      const lagT = clampLag(sp, 0.18);
      const tailM = Pl(u.x + F[0] * (hip.x - 0.65) + lagT.x * 1.2, u.y + F[1] * (hip.x - 0.65) + lagT.y * 1.2, hip.z - 0.05 + Math.sin(tt * 2.6) * 0.06);
      const tailT = Pl(u.x + F[0] * (hip.x - 1.05) + Rt[0] * Math.sin(tt * 1.9) * 0.2 + lagT.x * 2, u.y + F[1] * (hip.x - 1.05) + Rt[1] * Math.sin(tt * 1.9) * 0.2 + lagT.y * 2, Math.max(0.1, hip.z - 0.35));
      const tail = [{ ...seg(tailB, tailM, px * 0.55, px * 0.4), c: fur, rim: false }, { ...seg(tailM, tailT, px * 0.4, px * 0.7), c: mane, rim: false }];
      // Body: a heavy chest tapering to lean hips, the hump of the shoulders.
      const body = [
        { ...seg(Hip, Sh, px * 3.8, px * 5.0), c: fur },
        { ...seg(Sh, Hump, px * 4.4, px * 3.2), c: fur },
      ];
      const rightNear = W(0, 1, 0).d > W(0, -1, 0).d;
      const frontNear = W(1, 0, 0).d > W(-1, 0, 0).d;
      const farLeg = legs.find((l2) => (l2.s > 0) !== rightNear), nearLeg = legs.find((l2) => (l2.s > 0) === rightNear);
      layer(legShapes(farLeg), flash); claws(farLeg);
      if (frontNear) layer(tail, flash);
      else beastHead();
      layer(body, flash);
      beastMane();
      if (!flash && sc > 50) {
        // fur hatching on the shadow flank and the ribs under the hide
        ctx.strokeStyle = 'rgba(12,8,8,0.55)'; ctx.lineWidth = Math.max(0.8, inkW * 0.55); ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const q = W(hip.x + 0.35 + i * 0.22, (rightNear ? 1 : -1) * 0.3, (hip.z + sh.z) / 2 - 0.15);
          ctx.moveTo(q.x, q.y - px * 1.6); ctx.quadraticCurveTo(q.x + px * 0.5, q.y, q.x - px * 0.2, q.y + px * 1.4);
        }
        ctx.stroke();
        if (L.ribs) {
          // ribs showing through the hide, pale and hard
          ctx.strokeStyle = rgba(L.claw, 0.55); ctx.lineWidth = Math.max(0.8, px * 0.22);
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const q = W(sh.x - 0.12 - i * 0.16, (rightNear ? 1 : -1) * 0.34, (hip.z + sh.z) / 2 + 0.05);
            ctx.moveTo(q.x - px * 0.3, q.y - px * 1.5); ctx.quadraticCurveTo(q.x + px * 0.6, q.y - px * 0.2, q.x + px * 0.1, q.y + px * 1.2);
          }
          ctx.stroke();
        }
      }
      layer(legShapes(nearLeg), flash); claws(nearLeg);
      if (frontNear) beastHead();
      else layer(tail, flash);
      ctx.globalAlpha = 1;

      function beastMane() {
        // spiky black mane from the back of the skull over the hump to mid-back
        const pts = [];
        const n = 9, tw = Math.sin(tt * 4) * 0.02;
        const top = [];
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          const x = head.x - 0.25 + (hip.x + 0.35 - (head.x - 0.25)) * k;
          const zb = k < 0.45 ? head.z + 0.1 + (hump.z + 0.12 - head.z - 0.1) * (k / 0.45) : hump.z + 0.12 + (hip.z + 0.2 - hump.z - 0.12) * ((k - 0.45) / 0.55);
          const spike = i % 2 ? 0.0 : 0.26 * (1 - Math.abs(k - 0.4)) + tw;
          top.push(Pl(u.x + F[0] * (x - spike * 0.6) + sp.cx * k * 0.6, u.y + F[1] * (x - spike * 0.6) + sp.cy * k * 0.6, zb + spike));
        }
        for (const q of top) pts.push(q);
        for (let i = n; i >= 0; i -= 3) {
          const k = i / n, x = head.x - 0.25 + (hip.x + 0.35 - (head.x - 0.25)) * k;
          const zb = k < 0.45 ? head.z - 0.05 + (sh.z - 0.15 - head.z + 0.05) * (k / 0.45) : sh.z - 0.15 + (hip.z - sh.z + 0.15) * ((k - 0.45) / 0.55);
          pts.push(W(x, 0, zb));
        }
        layer([{ kind: 'poly', pts, c: mane, shadeFrom: null }], flash);
        if (!flash) {
          ctx.strokeStyle = 'rgba(246,236,232,0.45)'; ctx.lineWidth = Math.max(0.8, inkW * 0.6);
          ctx.beginPath(); for (let i = 0; i < top.length; i += 2) { ctx.moveTo(top[i].x, top[i].y + px * 0.2); ctx.lineTo(top[i].x + px * 0.4, top[i].y + px * 1.0); } ctx.stroke();
        }
      }

      function beastHead() {
        // Skull, snout (upper jaw), hinged lower jaw; mouth with three rows of teeth.
        const ja = jaw * 0.75;
        const hinge = { x: head.x + 0.08, z: head.z - 0.08 };
        const up = { x: hinge.x + 0.48 * Math.cos(ja * 0.25), z: hinge.z + 0.06 + 0.48 * Math.sin(ja * 0.25) };
        const lo = { x: hinge.x + 0.42 * Math.cos(ja), z: hinge.z - 0.06 - 0.42 * Math.sin(ja) };
        const Hh = W(hinge.x, 0, hinge.z), U = W(up.x, 0, up.z), Lo = W(lo.x, 0, lo.z);
        const Sk = W(head.x - 0.08, 0, head.z + 0.06);
        // neck from the hump to the skull
        layer([{ ...seg(Hump, Sk, px * 2.6, px * 1.9), c: fur }], flash);
        // mouth interior
        if (!flash && jaw > 0.15) {
          ctx.fillStyle = L.gum; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 1.5;
          ctx.beginPath(); ctx.moveTo(Hh.x, Hh.y); ctx.lineTo(U.x, U.y + px * 0.4); ctx.lineTo(Lo.x, Lo.y - px * 0.3); ctx.closePath(); ctx.stroke(); ctx.fill();
          ctx.fillStyle = '#2a0a0e'; ctx.beginPath(); ctx.moveTo(Hh.x, Hh.y); ctx.lineTo((Hh.x + U.x) / 2, (Hh.y + U.y) / 2 + px * 0.5); ctx.lineTo((Hh.x + Lo.x) / 2, (Hh.y + Lo.y) / 2 - px * 0.2); ctx.closePath(); ctx.fill();
        }
        layer([{ ...seg(Hh, Lo, px * 0.75, px * 0.5), c: L.skin, rim: false }], flash);
        teeth(Hh, Lo, U, 1);
        layer([
          { kind: 'ell', x: Sk.x, y: Sk.y, rx: px * 2.2, ry: px * 1.9, c: fur },
          { ...seg(Sk, U, px * 1.5, px * 0.85), c: fur },
        ], flash);
        teeth(Hh, U, Lo, -1);
        // nose
        ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(U.x, U.y - px * 0.15, px * 0.5, px * 0.38, 0, 0, Math.PI * 2); ctx.fill();
        // ears laid back
        const earB = W(head.x - 0.22, 0, head.z + 0.18);
        for (const s of [-1, 1]) {
          const b0 = W(head.x - 0.12, s * 0.12, head.z + 0.16), tip = W(head.x - 0.42, s * 0.2, head.z + 0.38 + headUp * 0.3);
          layer([{ kind: 'poly', pts: [b0, tip, earB], c: L.mane, shadeFrom: null }], flash);
        }
        // eyes: hot slits; the far one hidden behind the snout
        if (!flash && u.state !== 'out') {
          for (const s of [-1, 1]) {
            const e = W(head.x + 0.18, s * 0.13, head.z + 0.1);
            if ((s > 0) !== rightNear && Math.abs(e.x - Sk.x) < px * 0.3) continue;
            ctx.fillStyle = rgba(L.eye, 0.28); ctx.beginPath(); ctx.ellipse(e.x, e.y, px * 0.9, px * 0.55, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = L.eye; ctx.beginPath(); ctx.moveTo(e.x - px * 0.5, e.y - px * 0.1); ctx.lineTo(e.x + px * 0.5, e.y - px * 0.3); ctx.lineTo(e.x + px * 0.15, e.y + px * 0.15); ctx.closePath(); ctx.fill();
          }
        }
        // the snarl: wrinkles over the muzzle
        if (!flash && sc > 45) {
          ctx.strokeStyle = 'rgba(12,8,8,0.7)'; ctx.lineWidth = Math.max(0.8, inkW * 0.6);
          ctx.beginPath();
          for (const k of [0.35, 0.5, 0.65]) { const q = { x: Sk.x + (U.x - Sk.x) * k, y: Sk.y + (U.y - Sk.y) * k - px * 0.6 }; ctx.moveTo(q.x - px * 0.3, q.y - px * 0.3); ctx.lineTo(q.x + px * 0.1, q.y + px * 0.25); }
          ctx.stroke();
        }
      }
      // Three rows of teeth along a jaw from the hinge toward its tip,
      // pointing at the other jaw; each row set further in and shorter.
      function teeth(Hh, tip, other, dir) {
        if (jaw < 0.12 && dir > 0) return;
        const tl = Math.hypot(tip.x - Hh.x, tip.y - Hh.y) || 1;
        ctx.lineJoin = 'miter';
        for (let r = 2; r >= 0; r--) {
          const k0 = 0.28 + r * 0.06, k1 = 0.98 - r * 0.1, n = 6 - r;
          const len = px * (1.0 - r * 0.2) * (0.6 + jaw * 0.6);
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            const k = k0 + ((k1 - k0) * (i + 0.5)) / n, w = ((k1 - k0) / n) * tl * 0.42;
            const bx = Hh.x + (tip.x - Hh.x) * k, by = Hh.y + (tip.y - Hh.y) * k;
            const ox = Hh.x + (other.x - Hh.x) * k, oy = Hh.y + (other.y - Hh.y) * k;
            let vx = ox - bx, vy = oy - by; const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
            const ix = bx + vx * r * px * 0.22, iy = by + vy * r * px * 0.22; // rows step inward
            const ax2 = (tip.x - Hh.x) / tl, ay2 = (tip.y - Hh.y) / tl;
            ctx.moveTo(ix - ax2 * w, iy - ay2 * w); ctx.lineTo(ix + vx * len, iy + vy * len); ctx.lineTo(ix + ax2 * w, iy + ay2 * w); ctx.closePath();
          }
          ctx.fillStyle = flash ? '#fff' : r === 0 ? L.tooth : r === 1 ? '#d8c8b0' : '#b8a68c';
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, inkW * 0.55);
          ctx.stroke(); ctx.fill();
        }
      }
    }

    // ---------------------------------------------------------------- practice block
    // A squat block of cut stone moved by a violet glyph: two stubby legs
    // that shuffle, two stone fists, the glyph burning on its face and
    // veins of violet light in the cracks.
    function drawGolem(u, L, sc) {
      const flash = u.flash > 0;
      const tt = V.time + hashId(u.id) * 0.1;
      const lying = u.state === 'down' || u.state === 'out';
      const dead = u.state === 'out';
      const f = u.facing, F = [Math.cos(f), Math.sin(f)], Rt = [-F[1], F[0]];
      const W = (x, y, z) => P(u.x + F[0] * x + Rt[0] * y, u.y + F[1] * x + Rt[1] * y, z);
      V.shadow(u.x, u.y, u.r * 1.45, 0.5);
      ctx.globalAlpha = dead ? 0.6 : 1;
      const AK = attackK(u);
      let pitch = 0, punch = 0, raise = 0, glow = 0.5;
      if (AK) {
        if (AK.ph === 'wind') { pitch = -0.16 * AK.e; punch = -0.2 * AK.e; raise = 0.15 * AK.e; glow = 0.5 + 0.5 * AK.e; }
        else if (AK.ph === 'strike') { pitch = 0.18; punch = 0.6; glow = 1.2; }
        else { pitch = 0.18 * (1 - AK.e); punch = 0.6 * (1 - AK.e); glow = 1 - 0.5 * AK.e; }
      }
      const hurt = u.state === 'hurt' || u.state === 'stagger';
      if (hurt) { pitch = -0.12 + Math.sin(u.st * 60) * 0.04; glow = 0.25 + 0.5 * Math.abs(Math.sin(u.st * 30)); }
      if (V.introPhase) { const k = V.spotlight === u.id ? 1 : 0.5; raise = 0.35 * k; glow = 0.6 + 0.5 * k; }
      if (dead) glow = 0;
      const moving = u.state === 'move' || u.state === 'opener' || u.state === 'circle' || u.fleeing;
      const g = u.walk * 3.0;
      let roll = moving ? Math.sin(g) * 0.07 : 0;
      const lift = moving ? Math.abs(Math.sin(g)) * 0.05 : 0;
      if (lying) { roll = dead ? 0.3 : 0.2; pitch = 0.1; }
      const pulse = 0.8 + 0.2 * Math.sin(tt * 3.1);
      const gk = glow * pulse;
      const st = L.stone;
      const tone = (c) => (flash ? lighten(c) : c);
      const pal = { lit: tone(st.lit), shade: tone(st.shade), top: tone(st.top) };
      const sink = lying ? 0.22 : 0;
      // Rigid transform for the upper body: roll about the facing axis and
      // pitch about the side axis, pivoting at the hips.
      const piv = 0.3 - sink;
      const xf = (x, y, z) => {
        let zz = z - piv;
        const y1 = y * Math.cos(roll) - zz * Math.sin(roll); zz = y * Math.sin(roll) + zz * Math.cos(roll);
        const x1 = x * Math.cos(pitch) + zz * Math.sin(pitch); zz = -x * Math.sin(pitch) + zz * Math.cos(pitch);
        return [x1, y1, zz + piv + lift];
      };
      // A box in the local frame; deco(face, pts) draws on its visible faces.
      const FACES = [
        [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], // top
        [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], // front
        [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], // back
        [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]], // right
        [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], // left
      ];
      const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; } return a; };
      function box(cx, cy, cz, a, b, c, rigid, deco) {
        const proj = (v) => {
          const x = cx + v[0] * a, y = cy + v[1] * b, z = cz + v[2] * c;
          if (!rigid) return W(x, y, z);
          const [X, Y, Z] = xf(x, y, z); return W(X, Y, Z);
        };
        const faces = FACES.map((fc) => fc.map(proj));
        const ref = Math.sign(area(faces[0])) || 1;
        const ctr = proj([0, 0, 0]);
        const vis = [];
        for (let i = 1; i < 5; i++) if (Math.sign(area(faces[i])) === ref) vis.push(i);
        ctx.lineJoin = 'round';
        // heavy ink silhouette first
        ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 2.2;
        for (const i of [0, ...vis]) { ctx.beginPath(); pathPoly(faces[i]); ctx.stroke(); ctx.fill(); }
        for (const i of vis) {
          const pts = faces[i];
          const mx = (pts[0].x + pts[2].x) / 2 - ctr.x, my = (pts[0].y + pts[2].y) / 2 - ctr.y;
          const lit = mx * lx + my * ly > 0;
          ctx.fillStyle = lit ? pal.lit : pal.shade; ctx.beginPath(); pathPoly(pts); ctx.fill();
          if (deco && !flash) { ctx.save(); ctx.beginPath(); pathPoly(pts); ctx.clip(); deco(i, pts, lit); ctx.restore(); }
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, inkW * 0.8); ctx.beginPath(); pathPoly(pts); ctx.stroke();
        }
        ctx.fillStyle = pal.top; ctx.beginPath(); pathPoly(faces[0]); ctx.fill();
        if (deco && !flash) { ctx.save(); ctx.beginPath(); pathPoly(faces[0]); ctx.clip(); deco(0, faces[0], true); ctx.restore(); }
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, inkW * 0.8); ctx.beginPath(); pathPoly(faces[0]); ctx.stroke();
        if (!flash) {
          // bone rim along the top's lit edges
          ctx.strokeStyle = 'rgba(246,236,232,0.6)'; ctx.lineWidth = Math.max(0.8, inkW * 0.6);
          ctx.beginPath();
          const tp = faces[0], tc = { x: (tp[0].x + tp[2].x) / 2, y: (tp[0].y + tp[2].y) / 2 };
          for (let i = 0; i < 4; i++) { const p = tp[i], q = tp[(i + 1) % 4]; if (((p.x + q.x) / 2 - tc.x) * lx + ((p.y + q.y) / 2 - tc.y) * ly > 0) { ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); } }
          ctx.stroke();
        }
      }
      const at = (pts, uu, vv) => ({ // bilinear point on a face quad (u across, v up)
        x: pts[0].x + (pts[1].x - pts[0].x) * uu + (pts[3].x - pts[0].x) * vv + (pts[2].x - pts[1].x - pts[3].x + pts[0].x) * uu * vv,
        y: pts[0].y + (pts[1].y - pts[0].y) * uu + (pts[3].y - pts[0].y) * vv + (pts[2].y - pts[1].y - pts[3].y + pts[0].y) * uu * vv,
      });
      const glyphCol = L.glyph;
      const stoneDeco = (seed) => (face, pts) => {
        // chisel marks and cracks, the cracks lit violet from inside
        ctx.strokeStyle = 'rgba(20,14,12,0.5)'; ctx.lineWidth = Math.max(0.8, inkW * 0.5); ctx.lineCap = 'round';
        ctx.beginPath();
        for (const k of [0.3, 0.62]) { const a0 = at(pts, 0.08, k + (seed % 3) * 0.04), a1 = at(pts, 0.92, k - 0.05); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); }
        ctx.stroke();
        const crack = [[0.15 + (seed % 2) * 0.5, 1], [0.3 + (seed % 2) * 0.4, 0.7], [0.22 + (seed % 2) * 0.45, 0.45], [0.38, 0.2]].map(([a, b]) => at(pts, a, b));
        if (gk > 0.05) {
          ctx.strokeStyle = rgba(glyphCol, Math.min(1, 0.35 + 0.5 * gk).toFixed(2)); ctx.lineWidth = Math.max(1, inkW * 0.9);
          ctx.beginPath(); crack.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
        }
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, inkW * 0.4);
        ctx.beginPath(); crack.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
        if (face === 1 || face === 0) glyphOn(pts, face === 0 ? 0.55 : 1);
      };
      function glyphOn(pts, k) {
        if (gk <= 0.02) return;
        const a = Math.min(1, gk) * k;
        const c = at(pts, 0.5, 0.52);
        const ring = (r) => { ctx.beginPath(); for (let i = 0; i <= 20; i++) { const q = (i / 20) * Math.PI * 2, p = at(pts, 0.5 + Math.cos(q) * r, 0.52 + Math.sin(q) * r); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } };
        ctx.fillStyle = rgba(glyphCol, (0.22 * a).toFixed(2)); ring(0.42); ctx.fill();
        ctx.strokeStyle = rgba(glyphCol, a.toFixed(2)); ctx.lineWidth = Math.max(1, inkW * 1.1);
        ring(0.34); ctx.stroke();
        ring(0.2); ctx.stroke();
        // rune strokes, turning slowly
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const q = tt * 0.6 + (j / 6) * Math.PI * 2;
          const p0 = at(pts, 0.5 + Math.cos(q) * 0.2, 0.52 + Math.sin(q) * 0.2), p1 = at(pts, 0.5 + Math.cos(q + 0.4) * 0.34, 0.52 + Math.sin(q + 0.4) * 0.34);
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
        }
        ctx.stroke();
        ctx.fillStyle = rgba('#f4eeff', Math.min(1, a + 0.1).toFixed(2));
        ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(1.2, sc * 0.03), 0, Math.PI * 2); ctx.fill();
      }
      // Parts: legs (not rigid), arms and the block (rigid).
      const legs = [-1, 1].map((s) => {
        const step = moving ? Math.sin(g + (s > 0 ? 0 : Math.PI)) * 0.14 : 0;
        const up = moving ? Math.max(0, Math.sin(g + (s > 0 ? 0 : Math.PI))) * 0.08 : 0;
        return { s, d: W(step, s * 0.26, 0).d, draw: () => box(step, s * 0.26, 0.16 + up - sink, 0.17, 0.15, 0.16, false, null) };
      });
      const arms = [-1, 1].map((s) => {
        const fw = 0.08 + punch * (s > 0 ? 1 : 0.7), z = 0.72 + raise + (punch > 0 ? 0.08 : 0);
        return { s, d: W(fw, s * 0.66, z).d, draw: () => box(fw, s * 0.66, z - sink, 0.17, 0.13, 0.2, true, stoneDeco(3 + s)) };
      });
      const nearSide = W(0, 1, 0).d > W(0, -1, 0).d ? 1 : -1;
      for (const l2 of legs.sort((a, b) => a.d - b.d)) l2.draw();
      for (const a of arms) if (a.s !== nearSide) a.draw();
      box(0, 0, 0.72 - sink, 0.42, 0.5, 0.42, true, stoneDeco(1));
      for (const a of arms) if (a.s === nearSide) a.draw();
      // a soft violet light on the ground under it while the glyph burns
      if (!flash && gk > 0.05) {
        const p = P(u.x + F[0] * 0.5, u.y + F[1] * 0.5, 0), r = sc * 0.6;
        ctx.fillStyle = rgba(glyphCol, (0.1 * Math.min(1, gk)).toFixed(2));
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * V.cam.pitch, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ---------------------------------------------------------------- the Unseen
    // Never shown whole: a towering shroud of darkness with a halo of light,
    // a rift down its centre and many glowing points. Long sleeves reach out
    // as arms; the wind-up raises them, the strike brings them crashing down.
    function drawVeil(u, L, sc) {
      const H = 1.78 * L.h;
      const sp = spring(u);
      const t = V.time + hashId(u.id) * 0.1;
      const f = u.facing, F = [Math.cos(f), Math.sin(f)], Rt = [-F[1], F[0]];
      const W = (x, y, z) => P(u.x + F[0] * x + Rt[0] * y, u.y + F[1] * x + Rt[1] * y, z);
      const flash = u.flash > 0;
      V.shadow(u.x, u.y, u.r * 1.6, 0.5);
      const AK = attackK(u);
      let raise = 0, slam = 0;
      if (AK) { if (AK.ph === 'wind') raise = AK.e; else if (AK.ph === 'strike') slam = 1; else slam = 1 - AK.e; }
      const hurt = u.state === 'hurt' || u.state === 'stagger' ? Math.sin(u.st * 50) * 0.04 : 0;
      const breathe = Math.sin(t * 1.3) * 0.04;
      const lean = 0.1 * slam - 0.08 * raise + hurt;
      ctx.globalAlpha = u.state === 'out' ? 0.6 : 1;

      // Halo / rift of light behind the head.
      const hc = W(lean * 0.9 - 0.08, 0, H * (0.86 + breathe * 0.2));
      const hr = sc * 0.62;
      if (!flash) {
        ctx.fillStyle = 'rgba(237,202,192,0.07)';
        ctx.beginPath(); ctx.ellipse(hc.x, hc.y, hr * 1.25, hr * 1.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(246,240,236,0.85)'; ctx.lineWidth = Math.max(1.5, sc * 0.035);
        ctx.beginPath(); ctx.ellipse(hc.x, hc.y, hr, hr * 1.08, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(227,38,58,0.7)'; ctx.lineWidth = Math.max(1, sc * 0.018);
        ctx.beginPath(); ctx.ellipse(hc.x, hc.y, hr * 0.82, hr * 0.88, 0, 0, Math.PI * 2); ctx.stroke();
        // shards of light radiating, turning slowly
        ctx.fillStyle = 'rgba(246,240,236,0.8)';
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = t * 0.25 + (i / 12) * Math.PI * 2, l1 = hr * 1.08, l2 = hr * (1.3 + (i % 3) * 0.18), w = 0.04;
          ctx.moveTo(hc.x + Math.cos(a - w) * l1, hc.y + Math.sin(a - w) * l1 * 1.08);
          ctx.lineTo(hc.x + Math.cos(a) * l2, hc.y + Math.sin(a) * l2 * 1.08);
          ctx.lineTo(hc.x + Math.cos(a + w) * l1, hc.y + Math.sin(a + w) * l1 * 1.08);
          ctx.closePath();
        }
        ctx.fill();
      }

      // Arms: long sleeves from the shoulders.
      const shZ = H * 0.74;
      const armPts = (side) => {
        const sh = W(lean * 0.6, side * 0.42, shZ);
        let hand;
        if (raise > 0) hand = W(0.2 + lean, side * (0.7 - 0.2 * raise), shZ + 0.2 + raise * 1.0);
        else if (slam > 0) hand = W(1.2 * slam + 0.3, side * 0.35, 0.3 + (1 - slam) * 0.6);
        else hand = W(0.32 + Math.sin(t * 1.1 + side) * 0.05, side * 0.68, H * 0.32 + Math.sin(t * 0.9 + side) * 0.05);
        const el = W(lean * 0.5 + (raise > 0 ? 0.1 : 0.25), side * 0.7, (sh.z == null ? shZ : shZ) * 0.5 + (raise > 0 ? H * 0.35 + raise * 0.3 : slam > 0 ? 0.6 : H * 0.12));
        return { sh, el, hand };
      };
      const shroud = ['#160d1a', '#07050a'];
      const arms = [armPts(-1), armPts(1)];
      const armShapes = (a) => [
        { ...seg(a.sh, a.el, sc * 0.2, sc * 0.16), c: shroud, rim: false },
        { ...seg(a.el, a.hand, sc * 0.16, sc * 0.09), c: shroud, rim: false },
      ];
      // far arm first
      const rightNear = arms[1].sh.d > arms[0].sh.d;
      const farA = rightNear ? arms[0] : arms[1], nearA = rightNear ? arms[1] : arms[0];
      layer(armShapes(farA), flash);
      if (!flash) veilClaws(farA, sc);

      // The shroud: wide hem, narrow shoulders, a peaked hood; the hem tears
      // and drifts.
      const base = P(u.x, u.y, 0);
      const pts = [];
      const n = 9;
      const hemW = 0.95, shW = 0.48;
      pts.push(W(lean * 0.6, -shW, shZ));
      pts.push(W(lean * 0.8 - 0.05, -0.3, H * 0.84));
      pts.push(W(lean * 0.9 - 0.06, -0.22, H * 0.95));
      pts.push(W(lean * 0.95 - 0.12, 0.02, H * 1.03 + breathe * 0.3));
      pts.push(W(lean * 0.9 - 0.06, 0.22, H * 0.95));
      pts.push(W(lean * 0.8 - 0.05, 0.3, H * 0.84));
      pts.push(W(lean * 0.6, shW, shZ));
      for (let i = 0; i <= n; i++) {
        const k = i / n, side = 1 - 2 * k;
        const torn = i % 2 ? 0.0 : 0.12 + 0.08 * Math.sin(t * 2 + i * 1.7);
        const drift = Math.sin(t * 1.6 + i * 0.9) * 0.08;
        pts.push(P(u.x + Rt[0] * side * hemW + F[0] * drift + sp.cx * 1.5, u.y + Rt[1] * side * hemW + F[1] * drift + sp.cy * 1.5, torn));
      }
      // shade: the side away from the light
      const lightRight = (pts[6].x - pts[0].x) * lx + (pts[6].y - pts[0].y) * ly > 0;
      const shadeIdx = lightRight ? [0, 1, 2, 3, ...Array.from({ length: Math.ceil((n + 1) / 2) }, (_, j) => 7 + n - j).reverse()] : [3, 4, 5, 6, ...Array.from({ length: Math.ceil((n + 1) / 2) }, (_, j) => 7 + j)];
      layer([{ kind: 'poly', pts, c: shroud, shadeFrom: shadeIdx.length > 2 ? shadeIdx : null }], flash);
      if (!flash) {
        // Rim light on the lit edge, crimson on the dark one.
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(237,202,192,0.6)'; ctx.lineWidth = Math.max(1, sc * 0.02);
        const lit = lightRight ? [6, 5, 4, 3] : [0, 1, 2, 3];
        ctx.beginPath(); lit.forEach((i, j) => (j ? ctx.lineTo(pts[i].x, pts[i].y) : ctx.moveTo(pts[i].x, pts[i].y))); ctx.stroke();
        ctx.strokeStyle = 'rgba(227,38,58,0.45)';
        const dark = lightRight ? [0, 1, 2] : [6, 5, 4];
        ctx.beginPath(); dark.forEach((i, j) => (j ? ctx.lineTo(pts[i].x, pts[i].y) : ctx.moveTo(pts[i].x, pts[i].y))); ctx.stroke();

        // The hood's void, with a cluster of light points for eyes.
        const face = W(lean * 0.95 + 0.04, 0, H * 0.9);
        ctx.fillStyle = '#020103';
        ctx.beginPath(); ctx.ellipse(face.x, face.y, sc * 0.15, sc * 0.2, 0, 0, Math.PI * 2); ctx.fill();
        const blink = Math.sin(t * 0.8) > 0.97 ? 0.2 : 1;
        for (const [ox, oy, rr, col] of [[-0.06, -0.02, 0.035, '#ffffff'], [0.06, -0.035, 0.028, '#ff4a5a'], [0.0, 0.07, 0.02, '#ffffff']]) {
          ctx.fillStyle = rgba(col, (0.25 * blink).toFixed(2));
          ctx.beginPath(); ctx.arc(face.x + ox * sc, face.y + oy * sc, rr * sc * 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = col; ctx.globalAlpha = blink;
          ctx.beginPath(); ctx.arc(face.x + ox * sc, face.y + oy * sc, Math.max(1, rr * sc), 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }

        // The rift: a jagged seam of light down the body.
        const rz = [H * 0.78, H * 0.66, H * 0.55, H * 0.42, H * 0.3, H * 0.16];
        const rp = rz.map((z, i) => W(lean * (z / H) * 0.7 + 0.05, (i % 2 ? 0.07 : -0.05) * (1 + Math.sin(t * 3 + i) * 0.3), z));
        const open = 0.6 + 0.4 * Math.sin(t * 2.1) + raise * 0.6;
        ctx.strokeStyle = rgba('#e3263a', 0.35); ctx.lineWidth = Math.max(2, sc * 0.09 * open);
        ctx.beginPath(); rp.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
        ctx.strokeStyle = '#f6f0ec'; ctx.lineWidth = Math.max(1, sc * 0.025 * open);
        ctx.beginPath(); rp.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();

        // Many glowing points scattered through the dark (batched per colour).
        const cols = ['#f6f0ec', '#a98bff', '#e3263a'];
        for (let pass = 0; pass < 2; pass++) {
          for (let ci = 0; ci < 3; ci++) {
            ctx.fillStyle = pass ? cols[ci] : rgba(cols[ci], 0.18);
            ctx.beginPath();
            for (let i = 0; i < 18; i++) {
              if ((i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0) !== ci) continue;
              const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + (i % 4) * 0.7) + i * 2.3);
              if (tw < 0.2) continue;
              const zk = (i * 0.618) % 1, sk = ((i * 0.377) % 1) * 2 - 1;
              const z = 0.15 + zk * H * 0.75;
              const wd = shW + (hemW - shW) * (1 - z / shZ) * 0.9;
              const q = W(lean * (z / H) * 0.7 + 0.12, sk * Math.max(0.15, wd) * 0.8, z);
              const rr = Math.max(0.8, sc * (0.012 + (i % 3) * 0.006) * tw) * (pass ? 1 : 3);
              ctx.moveTo(q.x + rr, q.y); ctx.arc(q.x, q.y, rr, 0, Math.PI * 2);
            }
            ctx.fill();
          }
        }
      }
      layer(armShapes(nearA), flash);
      if (!flash) veilClaws(nearA, sc);

      // Floating shards of light orbiting the figure.
      if (!flash) {
        ctx.fillStyle = 'rgba(246,240,236,0.85)'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, inkW);
        for (let i = 0; i < 5; i++) {
          const a = t * 0.5 + i * 1.257;
          const q = P(u.x + Math.cos(a) * 1.3, u.y + Math.sin(a) * 1.3 * 0.8, H * (0.35 + 0.12 * i) + Math.sin(t * 1.7 + i) * 0.1);
          const s2 = sc * (0.05 + (i % 2) * 0.03);
          ctx.beginPath(); ctx.moveTo(q.x, q.y - s2 * 1.6); ctx.lineTo(q.x + s2 * 0.6, q.y); ctx.lineTo(q.x, q.y + s2 * 1.6); ctx.lineTo(q.x - s2 * 0.6, q.y); ctx.closePath();
          ctx.stroke(); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      void base;
    }

    function veilClaws(a, sc) {
      // splayed fingers of light at the sleeve's end
      const dx = a.hand.x - a.el.x, dy = a.hand.y - a.el.y, l = Math.hypot(dx, dy) || 1;
      const ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
      ctx.strokeStyle = 'rgba(246,240,236,0.9)'; ctx.lineWidth = Math.max(1, sc * 0.02); ctx.lineCap = 'round';
      ctx.beginPath();
      for (const o of [-0.5, 0, 0.5]) {
        ctx.moveTo(a.hand.x, a.hand.y);
        ctx.lineTo(a.hand.x + (ux + nx * o) * sc * 0.28, a.hand.y + (uy + ny * o) * sc * 0.28);
      }
      ctx.stroke();
    }

    // ---------------------------------------------------------------- the Skyreaver
    // A winged sky-beast hovering over the field: scarred hide, enormous
    // membrane wings on the arms (wyvern-like), a long neck and a narrow,
    // watchful head; hind legs hang with talons. The wind-up climbs with the
    // wings raised; the strike is a dive, wings swept back, talons first.
    function drawFlyer(u, L, sc, s) {
      const flash = u.flash > 0, tt = V.time + hashId(u.id) * 0.1;
      const lying = u.state === 'down' || u.state === 'out';
      const f = u.facing, F = [Math.cos(f), Math.sin(f)], Rt = [-F[1], F[0]];
      const sp = spring(u);
      const AK = attackK(u);
      const beat = tt * 3.1;
      let flap = Math.sin(beat), rise = 0, dive = 0, jaw = 0.12 + 0.05 * Math.sin(tt * 2), headUp = 0;
      if (AK) {
        if (AK.ph === 'wind') { rise = AK.e; flap = 0.3 + 0.65 * AK.e + 0.05 * Math.sin(beat * 2); jaw = 0.2 + 0.5 * AK.e; headUp = 0.25 * AK.e; }
        else if (AK.ph === 'strike') { dive = 1; flap = -0.85; jaw = 1; }
        else { dive = 1 - AK.e; flap = -0.85 + 0.85 * AK.e + Math.sin(beat) * AK.e; jaw = 1 - 0.85 * AK.e; }
      }
      const spd = Math.hypot(u.vx || 0, u.vy || 0);
      if (!AK && spd > 5) flap = -0.25 + 0.15 * Math.sin(beat * 1.5); // gliding
      const hurt = u.state === 'hurt' || u.state === 'stagger';
      if (hurt) { flap = 0.6 + 0.4 * Math.sin(u.st * 40); headUp = 0.3; jaw = 0.8; }
      if (V.introPhase) {
        const k = V.spotlight === u.id || V.spotlight === u.team ? 1 : 0.5;
        rise = 0.35 * k; flap = 0.85 + 0.12 * Math.sin(beat); headUp = 0.4 * k; jaw = 0.25 + 0.65 * k;
      }
      let hz = 2.3 + 0.9 * rise - 1.5 * dive - 0.12 * flap;
      if (lying) { hz = 0.5; flap = -0.75; dive = 0; rise = 0; headUp = -0.3; jaw = u.state === 'out' ? 0.3 : 0.5; }
      const lunge = 0.9 * dive, nose = 0.3 * dive - 0.12 * rise;
      const jit = hurt ? Math.sin(u.st * 70) * 0.06 : 0;
      // local (forward x, right y, height z) -> screen; tilt the body nose-down on the dive
      const Lp = (x, y, z, lag) => {
        const xx = x + lunge + jit, zz = z - (x * nose * 0.45);
        return P(u.x + F[0] * xx + Rt[0] * y + (lag ? sp.cx * lag : 0), u.y + F[1] * xx + Rt[1] * y + (lag ? sp.cy * lag : 0), Math.max(0.05, zz));
      };
      const lightK = 1 - Math.min(1, hz / 4);
      V.shadow(u.x + F[0] * lunge, u.y + F[1] * lunge, u.r * (3.4 - 0.35 * hz), 0.16 + 0.22 * lightK);
      V.shadow(u.x + F[0] * lunge, u.y + F[1] * lunge, u.r * (1.4 - 0.1 * hz), 0.2 + 0.25 * lightK);
      ctx.globalAlpha = u.state === 'out' ? 0.6 : 1;
      const hide = L.hide, mem = L.membrane, bone = L.bone;
      const rightNear = Lp(0, 1, hz).d > Lp(0, -1, hz).d;
      const frontNear = Lp(1, 0, hz).d > Lp(-1, 0, hz).d;
      const m = sc; // metres to px

      // Body joints.
      const C = Lp(0.75, 0, hz + 0.15), Hp = Lp(-0.9, 0, hz), Mid = Lp(-0.05, 0, hz + 0.2);
      const N1 = Lp(1.3, 0, hz + 0.5 + headUp * 0.4);
      const Hd = Lp(1.85 - 0.1 * headUp + 0.25 * dive, 0, hz + 0.75 + headUp * 0.7 - dive * 0.6);
      const hdz = hz + 0.75 + headUp * 0.7 - dive * 0.6, hdx = 1.85 - 0.1 * headUp + 0.25 * dive;
      const ja = jaw * 0.7;
      const Sn = Lp(hdx + 0.7, 0, hdz - 0.05 + headUp * 0.25);
      const Lj = Lp(hdx + 0.6 * Math.cos(ja), 0, hdz - 0.12 - 0.6 * Math.sin(ja) + headUp * 0.15);
      const tail = [Hp, Lp(-1.9, Math.sin(tt * 1.6) * 0.25, hz - 0.05, 0.6), Lp(-2.9, Math.sin(tt * 1.6 - 0.8) * 0.45, hz + 0.1, 1.4), Lp(-3.8, Math.sin(tt * 1.6 - 1.6) * 0.6, hz + 0.3 + 0.2 * Math.sin(tt * 1.6 - 2.2), 2.2)];

      // Wing geometry for side sd (+1 right, -1 left).
      const wing = (sd) => {
        const a = Math.abs(flap), sweep = 0.8 * dive, fold = (1 - 0.35 * dive) * 0.82;
        const fl = flap;
        const Sh = Lp(0.45, sd * 0.36, hz + 0.32);
        const E = Lp(0.6 - sweep * 0.5, sd * 1.5 * fold, hz + 0.55 + fl * 0.9);
        const Wr = Lp(0.25 - sweep, sd * (2.85 - a * 0.35) * fold, hz + 0.45 + fl * 1.9);
        const D1 = Lp(-0.45 - sweep * 1.4, sd * (4.0 - a * 0.6) * fold, hz + 0.15 + fl * 2.3);
        const D2 = Lp(-1.45 - sweep * 1.2, sd * 3.0 * fold, hz - 0.1 + fl * 1.55);
        const D3 = Lp(-1.85 - sweep, sd * 1.7 * fold, hz - 0.15 + fl * 0.75);
        const R0 = Lp(-1.0, sd * 0.3, hz + 0.05);
        const pull = (p, q, k) => ({ x: (p.x + q.x) / 2 + (Wr.x - (p.x + q.x) / 2) * k, y: (p.y + q.y) / 2 + (Wr.y - (p.y + q.y) / 2) * k });
        // the trailing edge scallops between the finger bones; a tear in one
        const tear = sd > 0 ? [pull(D2, D3, 0.12), { x: (D2.x * 0.4 + D3.x * 0.6 + Wr.x * 0.6) / 1.6, y: (D2.y * 0.4 + D3.y * 0.6 + Wr.y * 0.6) / 1.6 }, pull(D2, D3, 0.3)] : [pull(D2, D3, 0.28)];
        const pts = [Sh, E, Wr, D1, pull(D1, D2, 0.3), D2, ...tear, D3, pull(D3, R0, 0.25), R0];
        return { Sh, E, Wr, D1, D2, D3, R0, pts };
      };
      const drawWing = (w, near) => {
        const n = w.pts.length;
        const shade = []; for (let i = 3; i < n; i++) shade.push(i); shade.push(2);
        layer([{ kind: 'poly', pts: w.pts, c: near ? mem : [mem[1], mem[1]], shadeFrom: near ? shade : null }], flash);
        if (flash) return;
        // finger bones fanning through the membrane, and the wing-arm
        ctx.lineCap = 'round';
        for (const [wd, col] of [[Math.max(2.5, m * 0.08), INK], [Math.max(1.2, m * 0.035), near ? bone[1] : '#3e3530']]) {
          ctx.strokeStyle = col; ctx.lineWidth = wd;
          ctx.beginPath();
          for (const d of [w.D1, w.D2, w.D3]) { ctx.moveTo(w.Wr.x, w.Wr.y); ctx.quadraticCurveTo((w.Wr.x + d.x) / 2, (w.Wr.y + d.y) / 2 - m * 0.08, d.x, d.y); }
          ctx.stroke();
        }
        layer([{ ...seg(w.Sh, w.E, m * 0.2, m * 0.15), c: hide }, { ...seg(w.E, w.Wr, m * 0.15, m * 0.1), c: hide }], flash);
        // thumb claw at the wrist
        const cl = { x: w.Wr.x + (w.Wr.x - w.E.x) * 0.15, y: w.Wr.y - m * 0.25 };
        ctx.fillStyle = bone[0]; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, inkW * 0.7);
        ctx.beginPath(); ctx.moveTo(w.Wr.x - m * 0.06, w.Wr.y); ctx.lineTo(cl.x, cl.y); ctx.lineTo(w.Wr.x + m * 0.06, w.Wr.y); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (near && m > 30) {
          // old scars across the membrane
          ctx.strokeStyle = rgba(L.scar, 0.55); ctx.lineWidth = Math.max(1, m * 0.02);
          ctx.beginPath();
          const a = w.pts[1], b = w.D2;
          ctx.moveTo(a.x * 0.6 + b.x * 0.4, a.y * 0.6 + b.y * 0.4); ctx.lineTo(a.x * 0.45 + b.x * 0.55 + m * 0.1, a.y * 0.45 + b.y * 0.55 + m * 0.05); ctx.lineTo(a.x * 0.3 + b.x * 0.7, a.y * 0.3 + b.y * 0.7 + m * 0.12);
          ctx.stroke();
        }
      };
      const legs = (sd) => {
        const hip = Lp(-0.65, sd * 0.32, hz - 0.12);
        const knee = Lp(-0.3 + dive * 0.3, sd * 0.42, hz - 0.72 + dive * 0.25);
        const foot = Lp(-0.7 + dive * 1.1, sd * 0.38, hz - 1.18 + dive * 0.55 + (lying ? 0.7 : 0));
        return { hip, knee, foot };
      };
      const drawLeg = (lg) => {
        layer([{ ...seg(lg.hip, lg.knee, m * 0.24, m * 0.14), c: hide, rim: false }, { ...seg(lg.knee, lg.foot, m * 0.13, m * 0.09), c: hide, rim: false }], flash);
        if (flash) return;
        // talons, splayed wider on the dive
        const spread = 0.5 + 0.5 * dive;
        ctx.fillStyle = bone[0]; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, inkW * 0.7);
        for (const o of [-1, 0, 1]) {
          const tx = lg.foot.x + o * m * 0.13 * spread + (frontNear ? 1 : -1) * m * 0.05, ty = lg.foot.y + m * (0.22 + 0.06 * Math.abs(o));
          ctx.beginPath(); ctx.moveTo(lg.foot.x + o * m * 0.05 - m * 0.04, lg.foot.y); ctx.quadraticCurveTo(tx + m * 0.06, (lg.foot.y + ty) / 2, tx, ty); ctx.lineTo(lg.foot.x + o * m * 0.05 + m * 0.04, lg.foot.y); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      };
      const head = () => {
        layer([{ ...seg(Mid, N1, m * 0.42, m * 0.3), c: hide }, { ...seg(N1, Hd, m * 0.3, m * 0.24), c: hide }], flash);
        // mouth and lower jaw
        if (!flash && jaw > 0.15) {
          ctx.fillStyle = '#5a1820'; ctx.strokeStyle = INK; ctx.lineWidth = inkW * 1.5;
          ctx.beginPath(); ctx.moveTo(Hd.x, Hd.y); ctx.lineTo(Sn.x, Sn.y); ctx.lineTo(Lj.x, Lj.y); ctx.closePath(); ctx.stroke(); ctx.fill();
        }
        layer([{ ...seg(Hd, Lj, m * 0.13, m * 0.07), c: L.belly, rim: false }], flash);
        if (!flash && jaw > 0.15) {
          // a row of teeth along each jaw
          ctx.fillStyle = '#efe2cf'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, inkW * 0.5);
          for (const [a, b, dir] of [[Hd, Sn, 1], [Hd, Lj, -1]]) {
            ctx.beginPath();
            for (let i = 1; i < 6; i++) {
              const k = 0.3 + i * 0.12, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
              ctx.moveTo(x - m * 0.03, y); ctx.lineTo(x, y + dir * m * 0.09); ctx.lineTo(x + m * 0.03, y); ctx.closePath();
            }
            ctx.fill(); ctx.stroke();
          }
        }
        // skull and long upper jaw, a crest of horns sweeping back
        const back = Lp(hdx - 0.3, 0, hdz + 0.12);
        const hornT = (sd) => Lp(hdx - 0.95, sd * 0.25, hdz + 0.45 + headUp * 0.2);
        layer([
          { kind: 'poly', pts: [Lp(hdx - 0.15, -0.12, hdz + 0.1), hornT(-1), back], c: bone, shadeFrom: [1, 2, 0] },
          { kind: 'poly', pts: [Lp(hdx - 0.15, 0.12, hdz + 0.1), hornT(1), back], c: bone, shadeFrom: [1, 2, 0] },
          { kind: 'ell', x: Hd.x, y: Hd.y, rx: m * 0.26, ry: m * 0.22, c: hide },
          { ...seg(Hd, Sn, m * 0.22, m * 0.09), c: hide },
        ], flash);
        if (flash) return;
        // a scar over the eye; the eye itself small, gold and steady (it thinks)
        const e = Lp(hdx + 0.18, (rightNear ? 1 : -1) * 0.12, hdz + 0.1);
        ctx.fillStyle = rgba(L.eye, 0.3); ctx.beginPath(); ctx.ellipse(e.x, e.y, m * 0.12, m * 0.07, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = L.eye; ctx.beginPath(); ctx.ellipse(e.x, e.y, m * 0.06, m * 0.035, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = INK; ctx.fillRect(e.x - m * 0.008, e.y - m * 0.03, m * 0.016, m * 0.06);
        ctx.strokeStyle = rgba(L.scar, 0.8); ctx.lineWidth = Math.max(1, m * 0.02);
        ctx.beginPath(); ctx.moveTo(e.x - m * 0.12, e.y - m * 0.14); ctx.lineTo(e.x + m * 0.02, e.y + m * 0.02); ctx.lineTo(e.x + m * 0.1, e.y + m * 0.12); ctx.stroke();
        // nostril
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(Sn.x, Sn.y - m * 0.03, Math.max(1, m * 0.025), 0, TAU); ctx.fill();
      };
      const drawTail = () => {
        const sh = [];
        for (let i = 0; i < tail.length - 1; i++) sh.push({ ...seg(tail[i], tail[i + 1], m * (0.36 - i * 0.1), m * (0.26 - i * 0.08)), c: hide, rim: i === 0 });
        layer(sh, flash);
        // a spade of hide at the tip
        const a = tail[2], b = tail[3], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l * m * 0.22, ny = dx / l * m * 0.22;
        layer([{ kind: 'poly', pts: [{ x: b.x + nx, y: b.y + ny }, { x: b.x + dx / l * m * 0.45, y: b.y + dy / l * m * 0.45 }, { x: b.x - nx, y: b.y - ny }, { x: b.x - dx / l * m * 0.1, y: b.y - dy / l * m * 0.1 }], c: mem, shadeFrom: [1, 2, 3] }], flash);
      };
      const wings = [wing(-1), wing(1)], lg = [legs(-1), legs(1)];
      const nearW = rightNear ? wings[1] : wings[0], farW = rightNear ? wings[0] : wings[1];
      const nearL = rightNear ? lg[1] : lg[0], farL = rightNear ? lg[0] : lg[1];
      drawWing(farW, false);
      drawLeg(farL);
      if (frontNear) drawTail(); else head();
      // Body: a deep chest tapering to the hips, a paler belly beneath.
      layer([{ ...seg(Hp, C, m * 0.42, m * 0.58), c: hide }], flash);
      layer([{ ...seg(Lp(-0.7, 0, hz - 0.22), Lp(0.6, 0, hz - 0.12), m * 0.2, m * 0.3), c: L.belly, rim: false }], flash);
      if (!flash) {
        // ridge plates down the spine, and scars raked across the flank
        ctx.fillStyle = bone[1]; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, inkW * 0.7);
        for (let i = 0; i < 6; i++) {
          const x = 0.7 - i * 0.32, q = Lp(x, 0, hz + 0.55 - Math.abs(x) * 0.1), b0 = Lp(x - 0.12, 0, hz + 0.35), b1 = Lp(x + 0.12, 0, hz + 0.38);
          ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(q.x, q.y); ctx.lineTo(b1.x, b1.y); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.strokeStyle = rgba(L.scar, 0.75); ctx.lineWidth = Math.max(1, m * 0.025); ctx.lineCap = 'round';
        ctx.beginPath();
        for (const [x0, z0] of [[0.3, 0.25], [-0.1, 0.2], [-0.45, 0.12]]) {
          const a = Lp(x0, (rightNear ? 1 : -1) * 0.4, hz + z0), b = Lp(x0 - 0.35, (rightNear ? 1 : -1) * 0.42, hz + z0 - 0.3);
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
      }
      drawLeg(nearL);
      if (frontNear) head(); else drawTail();
      drawWing(nearW, true);
      // wind off the downstroke: a few pale streaks under the wings
      if (!flash && !lying && flap < -0.4) {
        ctx.strokeStyle = 'rgba(230,236,240,0.25)'; ctx.lineWidth = Math.max(1, m * 0.025);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) { const a = Lp(-0.6 + i * 0.3, (i - 2) * 0.9, hz - 0.6), b = Lp(-0.8 + i * 0.3, (i - 2) * 1.2, hz - 1.4); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      void s;
    }

    // ---------------------------------------------------------------- the Night Creature
    // A low dark body hung between four limbs that arc over it like bent
    // reeds: no elbows or knees, just curves, ending in long splayed fingers.
    // A narrow head hangs forward with two faint eyes. The wind-up lifts the
    // front limbs high; the strike whips them down.
    function drawCrawler(u, L, sc) {
      const flash = u.flash > 0, tt = V.time + hashId(u.id) * 0.1;
      const lying = u.state === 'down' || u.state === 'out';
      const f = u.facing, F = [Math.cos(f), Math.sin(f)], Rt = [-F[1], F[0]];
      const AK = attackK(u);
      let raise = 0, whip = 0, low = 0;
      if (AK) { if (AK.ph === 'wind') raise = AK.e; else if (AK.ph === 'strike') whip = 1; else whip = 1 - AK.e; }
      const hurt = u.state === 'hurt' || u.state === 'stagger';
      if (u.state === 'dodge') low = 0.25;
      let rear = 0;
      if (V.introPhase) { const k = V.spotlight === u.id || V.spotlight === u.team ? 1 : 0.5; rear = 0.7 * k; }
      const moving = u.state === 'move' || u.state === 'opener' || u.state === 'circle' || u.fleeing;
      const g = u.walk * 2.6;
      const jit = hurt ? Math.sin(u.st * 60) * 0.05 : 0;
      const Lp = (x, y, z) => P(u.x + F[0] * (x + jit) + Rt[0] * y, u.y + F[1] * (x + jit) + Rt[1] * y, Math.max(0.02, z));
      V.shadow(u.x, u.y, u.r * 2.0, 0.5);
      ctx.globalAlpha = u.state === 'out' ? 0.6 : 1;
      const m = sc;
      const bz = lying ? 0.18 : 0.85 - low + 0.06 * Math.sin(tt * 1.4) + rear * 0.6 - 0.25 * whip + 0.1 * raise;
      const pel = { x: -0.55, z: bz - 0.05 - rear * 0.35 }, ch = { x: 0.35 + 0.3 * whip - 0.15 * raise, z: bz + 0.12 + rear * 0.3 };
      const hd = { x: ch.x + 0.5 + 0.25 * whip, z: ch.z - 0.25 + rear * 0.35 + 0.15 * raise };
      const rightNear = Lp(0, 1, 0).d > Lp(0, -1, 0).d;
      const frontNear = Lp(1, 0, 0).d > Lp(-1, 0, 0).d;
      // Limbs: a quadratic curve from root to tip whose control point floats
      // high and out, wandering a little so the bend never sits in one place.
      const limb = (front, sd) => {
        const root = front ? { x: ch.x - 0.05, y: sd * 0.2, z: ch.z } : { x: pel.x + 0.05, y: sd * 0.18, z: pel.z };
        const ph = g + (front ? 0 : Math.PI) + (sd > 0 ? 0 : Math.PI);
        const step = moving ? Math.sin(ph) * 0.35 : 0, up = moving ? Math.max(0, Math.cos(ph)) * 0.18 : 0;
        let tip = front ? { x: root.x + 0.95 + step, y: sd * 0.75, z: up } : { x: root.x - 0.7 + step, y: sd * 0.8, z: up };
        let ctl = { x: (root.x + tip.x) / 2 + (front ? 0.1 : -0.15), y: sd * (0.75 + 0.12 * Math.sin(tt * 1.1 + sd + (front ? 0 : 2))), z: root.z + 0.75 + 0.15 * Math.sin(tt * 0.9 + (front ? 1 : 3) * sd) };
        if (front) {
          if (raise > 0) { tip = { x: root.x + 0.3 - 0.4 * raise, y: sd * 0.6, z: root.z + 1.3 * raise + tip.z * (1 - raise) }; ctl = { x: root.x + 0.5, y: sd * 0.9, z: root.z + 0.6 + 1.4 * raise }; }
          if (whip > 0) { tip = { x: root.x + 1.9 * whip + 0.9 * (1 - whip), y: sd * 0.3, z: 0.15 }; ctl = { x: root.x + 0.9, y: sd * 0.6, z: root.z + 1.0 - 0.4 * whip }; }
          if (rear > 0) { tip = { x: root.x + 0.6, y: sd * 1.4 * rear + tip.y * (1 - rear), z: root.z + 1.0 * rear }; ctl = { x: root.x + 0.2, y: sd * 1.1, z: root.z + 1.5 * rear + 0.5 }; }
        }
        if (lying) { tip = { x: root.x + (front ? 0.9 : -0.9), y: sd * 1.1, z: 0.04 }; ctl = { x: (root.x + tip.x) / 2, y: sd * 0.9, z: 0.35 }; }
        const N = 7, pts = [];
        for (let i = 0; i <= N; i++) {
          const k = i / N, a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k;
          pts.push(Lp(root.x * a + ctl.x * b + tip.x * c, root.y * a + ctl.y * b + tip.y * c, root.z * a + ctl.z * b + tip.z * c));
        }
        return { pts, sd, front, tipW: tip, ctl };
      };
      // A limb is one smooth tapering stroke: ink under, flat colour over.
      const drawLimb = (lb, near) => {
        const q = lb.pts;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const pass of [0, 1]) {
          ctx.strokeStyle = pass ? (flash ? '#ffffff' : near ? L.hide[0] : L.hide[1]) : INK;
          for (let i = 0; i < q.length - 1; i++) {
            ctx.lineWidth = m * 2 * (0.08 - i * 0.0085) + (pass ? 0 : inkW * 2);
            ctx.beginPath(); ctx.moveTo(q[i].x, q[i].y); ctx.lineTo(q[i + 1].x, q[i + 1].y); ctx.stroke();
          }
        }
      };
      const fingers = (lb, near) => {
        if (flash) return;
        const p = lb.pts[lb.pts.length - 1], q = lb.pts[lb.pts.length - 2];
        let dx = p.x - q.x, dy = p.y - q.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        const nx = -dy, ny = dx, len = m * (lb.front ? 0.42 : 0.3) * (1 + 0.25 * whip * (lb.front ? 1 : 0));
        ctx.lineCap = 'round';
        for (const [w, col] of [[Math.max(2.2, m * 0.05), INK], [Math.max(1, m * 0.02), near ? L.claw : '#5a5458']]) {
          ctx.strokeStyle = col; ctx.lineWidth = w;
          ctx.beginPath();
          for (const o of [-0.7, -0.25, 0.2, 0.65]) {
            const ex = p.x + (dx + nx * o) * len, ey = p.y + (dy + ny * o) * len;
            ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + (dx + nx * o * 0.4) * len * 0.6, p.y + (dy + ny * o * 0.4) * len * 0.6 - m * 0.06, ex, ey + m * 0.04);
          }
          ctx.stroke();
        }
      };
      const limbs = [limb(true, -1), limb(true, 1), limb(false, -1), limb(false, 1)];
      const farSide = rightNear ? -1 : 1;
      const far = limbs.filter((l) => l.sd === farSide), near = limbs.filter((l) => l.sd !== farSide);
      for (const lb of far) { drawLimb(lb, false); fingers(lb, false); }
      const P0 = Lp(pel.x, 0, pel.z), C0 = Lp(ch.x, 0, ch.z), Hh = Lp(hd.x, 0, hd.z);
      const headF = () => {
        layer([{ ...seg(C0, Hh, m * 0.13, m * 0.09), c: L.hide }, { kind: 'ell', x: Hh.x, y: Hh.y + m * 0.04, rx: m * 0.17, ry: m * 0.22, rot: 0, c: L.hide }], flash);
        if (flash || u.state === 'out') return;
        // two faint eyes, far apart, without lids
        const fl = 0.75 + 0.25 * Math.sin(tt * 3.3);
        for (const sd of [-1, 1]) {
          const e = Lp(hd.x + 0.12, sd * 0.07, hd.z - 0.02);
          if (!frontNear) continue;
          ctx.fillStyle = rgba(L.eye, (0.2 * fl).toFixed(3)); ctx.beginPath(); ctx.arc(e.x, e.y, m * 0.08, 0, TAU); ctx.fill();
          ctx.fillStyle = rgba(L.eye, (0.85 * fl).toFixed(3)); ctx.beginPath(); ctx.ellipse(e.x, e.y, m * 0.03, m * 0.024, 0, 0, TAU); ctx.fill();
        }
      };
      if (!frontNear) headF();
      // the body: a thin, ribbed trunk, darker than the night around it
      layer([{ ...seg(P0, C0, m * 0.2, m * 0.24), c: L.hide }], flash);
      if (!flash) {
        ctx.strokeStyle = rgba(L.pale, 0.35); ctx.lineWidth = Math.max(0.8, m * 0.015);
        ctx.beginPath();
        for (let i = 1; i < 5; i++) { const k = i / 5, x = P0.x + (C0.x - P0.x) * k, y = P0.y + (C0.y - P0.y) * k; ctx.moveTo(x - m * 0.08, y - m * 0.1); ctx.quadraticCurveTo(x + m * 0.04, y, x - m * 0.04, y + m * 0.14); }
        ctx.stroke();
      }
      if (frontNear) headF();
      for (const lb of near) { drawLimb(lb, true); fingers(lb, true); }
      if (!flash) {
        // a pale sheen along the tops of the near limbs
        ctx.strokeStyle = rgba(L.pale, 0.5); ctx.lineWidth = Math.max(0.8, m * 0.018); ctx.lineCap = 'round';
        ctx.beginPath();
        for (const lb of near) { const q = lb.pts; ctx.moveTo(q[1].x, q[1].y - m * 0.06); for (let i = 2; i < 5; i++) ctx.lineTo(q[i].x, q[i].y - m * 0.07); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // ---------------------------------------------------------------- Calamity
    // Angelic in shape but wrong: a robed figure hovering over the floor,
    // wing-shapes made of heat shimmer and pressure (no feathers), a face like
    // a holy painting split by a cruel smile; water coils round one side,
    // lava drips from the other.
    function drawSeraph(u, L, sc, s) {
      const flash = u.flash > 0, tt = V.time + hashId(u.id) * 0.1;
      const lying = u.state === 'down' || u.state === 'out';
      const f = u.facing, F = [Math.cos(f), Math.sin(f)], Rt = [-F[1], F[0]];
      const AK = attackK(u);
      let cast = 0, spread = 0.6 + 0.08 * Math.sin(tt * 1.3);
      if (AK) { cast = AK.ph === 'wind' ? AK.e : AK.ph === 'strike' ? 1 : 1 - AK.e; }
      if (s.hazards && s.hazards.some((z) => z.from === u)) { spread = 1; cast = Math.max(cast, 0.5); }
      if (V.introPhase) { const k = V.spotlight === u.id || V.spotlight === u.team ? 1 : 0.5; spread = 0.7 + 0.3 * k; cast = 0.3 * k; }
      const hurt = u.state === 'hurt' || u.state === 'stagger';
      const jit = hurt ? Math.sin(u.st * 60) * 0.05 : 0;
      const hz = lying ? 0.05 : 0.75 + 0.1 * Math.sin(tt * 1.1);
      const Lp = (x, y, z) => P(u.x + F[0] * (x + jit) + Rt[0] * y, u.y + F[1] * (x + jit) + Rt[1] * y, z);
      const m = sc;
      // two pools of light on the floor: cold on the water side, molten on the other
      if (!flash) {
        for (const [sd, rgb] of [[-1, L.water], [1, L.lava]]) {
          const p = Lp(0, sd * 0.7, 0), r = m * (1.1 + 0.08 * Math.sin(tt * 2 + sd));
          ctx.fillStyle = `rgba(${rgb},0.12)`; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * V.cam.pitch, 0, 0, TAU); ctx.fill();
        }
      }
      V.shadow(u.x, u.y, u.r * 1.4, 0.3);
      ctx.globalAlpha = u.state === 'out' ? 0.55 : 1;
      if (lying) {
        // fallen: the robe spread on the floor, the shimmer gone out
        layer([{ kind: 'ell', ...(() => { const c = Lp(0, 0, 0.15); return { x: c.x, y: c.y }; })(), rx: m * 0.9, ry: m * 0.35, c: L.robe }], flash);
        const hp = Lp(-0.8, 0, 0.2);
        layer([{ kind: 'ell', x: hp.x, y: hp.y, rx: m * 0.2, ry: m * 0.24, c: L.skinS }], flash);
        ctx.globalAlpha = 1;
        return;
      }
      const H = 2.6; // figure height above its hover point
      const waist = hz + H * 0.45, chestZ = hz + H * 0.68, neckZ = hz + H * 0.8, headZ = hz + H * 0.9;
      const lean = 0.08 * cast;
      const rightNear = Lp(0, 1, 0).d > Lp(0, -1, 0).d;
      const frontNear = Lp(1, 0, 0).d > Lp(-1, 0, 0).d;

      // Wings of distortion: long blades of bent air fanning up and out from
      // the shoulder blades. Light and dark hairlines side by side read as
      // refraction; the water side tints cold, the lava side hot.
      const wings = () => {
        if (flash) return;
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const sd of [-1, 1]) {
          const rgb = sd < 0 ? L.water : L.lava;
          const root = { x: -0.25, y: sd * 0.18, z: chestZ };
          for (let i = 0; i < 4; i++) {
            const ang = (0.25 + i * 0.32) * spread + 0.1 * Math.sin(tt * 1.4 + i);
            const len = (2.3 - i * 0.3) * (0.75 + 0.25 * spread);
            const tip = { x: root.x - 0.35 - i * 0.25, y: sd * (0.3 + Math.cos(ang) * len), z: root.z + Math.sin(ang) * len * 0.95 - i * 0.18 };
            const N = 9, pa = [], pb = [];
            for (let j = 0; j <= N; j++) {
              const k = j / N, wob = Math.sin(tt * 5 + j * 1.3 + i * 2) * 0.05 * k;
              const x = root.x + (tip.x - root.x) * k, y = root.y + (tip.y - root.y) * k, z = root.z + (tip.z - root.z) * k + Math.sin(k * Math.PI) * 0.25;
              const w = 0.2 * Math.sin(Math.min(1, k * 1.15) * Math.PI) * (1 - i * 0.12);
              pa.push(Lp(x, y + wob, z + w)); pb.push(Lp(x, y - wob, z - w * 0.6));
            }
            const band = () => { ctx.beginPath(); pa.forEach((q, j) => (j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); for (let j = pb.length - 1; j >= 0; j--) ctx.lineTo(pb[j].x, pb[j].y); ctx.closePath(); };
            band(); ctx.fillStyle = `rgba(${rgb},${(0.12 + 0.08 * spread).toFixed(3)})`; ctx.fill();
            // ripples across the band, sliding outward like heat haze
            ctx.save(); band(); ctx.clip();
            ctx.strokeStyle = 'rgba(255,250,240,0.28)'; ctx.lineWidth = Math.max(1, m * 0.018);
            ctx.beginPath();
            for (let j = 1; j < N; j += 2) { const ph = (j + tt * 3) % N; const jj = Math.min(N, Math.floor(ph)); const a = pa[jj], b = pb[jj]; ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo((a.x + b.x) / 2 + m * 0.06, (a.y + b.y) / 2, b.x, b.y); }
            ctx.stroke(); ctx.restore();
            // refraction hairlines: bright on the top edge, dark just under it
            ctx.lineWidth = Math.max(1.5, m * 0.03);
            ctx.strokeStyle = 'rgba(250,246,236,0.75)';
            ctx.beginPath(); pa.forEach((q, j) => (j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
            ctx.strokeStyle = 'rgba(12,8,8,0.45)';
            ctx.beginPath(); pa.forEach((q, j) => (j ? ctx.lineTo(q.x + 1.5, q.y + 2.5) : ctx.moveTo(q.x + 1.5, q.y + 2.5))); ctx.stroke();
            ctx.strokeStyle = `rgba(${rgb},0.6)`; ctx.lineWidth = Math.max(0.8, m * 0.012);
            ctx.beginPath(); pb.forEach((q, j) => (j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
          }
        }
        ctx.restore();
      };
      // Body parts.
      const hemPts = [];
      const n = 10;
      for (let i = 0; i <= n; i++) {
        const k = i / n, sd = 1 - 2 * k;
        const flow = Math.sin(tt * 2.2 + i * 1.1) * 0.06;
        hemPts.push(Lp(-0.12 + flow - 0.15 * Math.abs(sd), sd * 0.55, hz + (i % 2 ? 0.1 : -0.12) + 0.04 * Math.sin(tt * 3 + i)));
      }
      const robe = { kind: 'poly', pts: [Lp(lean * 0.4, -0.2, waist), Lp(lean * 0.4, 0.2, waist), ...hemPts], c: L.robe, shadeFrom: null };
      const lightRight = (Lp(0, 1, waist).x - Lp(0, -1, waist).x) * lx > 0;
      robe.shadeFrom = lightRight ? [0, ...Array.from({ length: 6 }, (_, i) => 2 + n - i)] : [1, ...Array.from({ length: 6 }, (_, i) => 2 + i)];
      const shL = Lp(lean, -0.32, chestZ + 0.12), shR = Lp(lean, 0.32, chestZ + 0.12);
      const torso = { kind: 'poly', pts: [shL, shR, Lp(lean * 0.4, 0.18, waist), Lp(lean * 0.4, -0.18, waist)], c: L.robe, shadeFrom: lightRight ? [0, 3, 2] : [1, 2, 3] };
      const head = Lp(lean * 1.2 + 0.03, 0, headZ), neck = Lp(lean, 0, neckZ);
      // Arms: open and low, palms out, like a painted saint; the casting arm
      // rises toward its target.
      const arm = (sd) => {
        const sh = sd > 0 ? shR : shL;
        const castSide = sd < 0; // the water arm throws
        const k = castSide ? cast : 0;
        const hand = Lp(0.25 + 0.6 * k + lean, sd * (0.75 - 0.35 * k), chestZ - 0.55 + 0.75 * k + 0.05 * Math.sin(tt * 1.5 + sd));
        const el = Lp(0.05 + 0.3 * k + lean, sd * (0.6 - 0.15 * k), chestZ - 0.3 + 0.35 * k);
        return { sh, el, hand, sd };
      };
      const armSh = (a) => [{ ...seg(a.sh, a.el, m * 0.09, m * 0.075), c: L.robe, rim: false }, { ...seg(a.el, a.hand, m * 0.075, m * 0.05), c: L.skinS, rim: false }, { kind: 'ell', x: a.hand.x, y: a.hand.y, rx: m * 0.065, ry: m * 0.075, c: L.skinS, rim: false }];
      const arms = [arm(-1), arm(1)];
      const nearArm = rightNear ? arms[1] : arms[0], farArm = rightNear ? arms[0] : arms[1];
      // hair falling behind the shoulders
      const hairBack = { kind: 'poly', pts: [Lp(-0.05, -0.2, headZ + 0.1), Lp(-0.05, 0.2, headZ + 0.1), Lp(-0.18, 0.3, chestZ - 0.25), Lp(-0.2, 0, chestZ - 0.4), Lp(-0.18, -0.3, chestZ - 0.25)], c: L.hairS, shadeFrom: [1, 2, 3] };

      wings();
      // a broken halo, like gold leaf flaking off a painting
      if (!flash) {
        const hc = Lp(lean * 1.2 - 0.12, 0, headZ + 0.08), r = m * 0.34;
        ctx.lineCap = 'butt';
        for (const [w, col] of [[Math.max(3, m * 0.05), INK], [Math.max(1.5, m * 0.024), L.halo]]) {
          ctx.strokeStyle = col; ctx.lineWidth = w;
          ctx.beginPath(); ctx.ellipse(hc.x, hc.y, r, r * 1.05, 0, -2.6, 0.2); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(hc.x, hc.y, r, r * 1.05, 0, 0.6, 2.2); ctx.stroke();
        }
      }
      layer([hairBack], flash);
      layer(armSh(farArm), flash);
      layer([robe, torso], flash);
      if (!flash) {
        // gold trim down the robe's front, and a bloodless sash
        ctx.strokeStyle = L.halo; ctx.lineWidth = Math.max(1, m * 0.02);
        const a = Lp(lean + 0.12, 0, chestZ + 0.05), b = Lp(lean * 0.4 + 0.1, 0, waist), c = Lp(0.05, 0, hz);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke();
        // the robe's hem: wet and dark on the water side, smouldering on the other
        const wet = hemPts.slice(n - 3), hot = hemPts.slice(0, 4);
        ctx.lineWidth = Math.max(2, m * 0.05); ctx.lineCap = 'round';
        ctx.strokeStyle = `rgba(${L.water},0.65)`; ctx.beginPath(); wet.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
        ctx.strokeStyle = `rgba(${L.lava},0.85)`; ctx.beginPath(); hot.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
      }
      layer([{ ...seg(neck, { x: head.x, y: head.y + m * 0.12 }, m * 0.06, m * 0.06), c: L.skinS, rim: false }], flash);
      // the face: a calm oval with closed, painted eyes, and the smile
      const hr = m * 0.17;
      layer([{ kind: 'ell', x: head.x, y: head.y, rx: hr * 0.9, ry: hr * 1.08, c: L.skinS }], flash);
      if (!flash) {
        const ahead = Lp(1, 0, 0), base = Lp(0, 0, 0);
        const fx = Math.sign(ahead.x - base.x) * Math.min(1, Math.abs(ahead.x - base.x) / m);
        // hair parted in the middle, falling in smooth gold bands
        ctx.fillStyle = INK;
        const hairPath = () => { ctx.beginPath(); ctx.ellipse(head.x - fx * hr * 0.15, head.y - hr * 0.35, hr * 1.02, hr * 0.78, 0, Math.PI, TAU); ctx.lineTo(head.x + hr * 1.0, head.y + hr * 0.5); ctx.lineTo(head.x + hr * 0.7, head.y - hr * 0.1); ctx.quadraticCurveTo(head.x, head.y - hr * 0.75, head.x - hr * 0.7, head.y - hr * 0.1); ctx.lineTo(head.x - hr * 1.0, head.y + hr * 0.5); ctx.closePath(); };
        ctx.lineWidth = inkW * 2; ctx.strokeStyle = INK; hairPath(); ctx.stroke();
        ctx.fillStyle = L.hairS[0]; hairPath(); ctx.fill();
        if (frontNear) {
          const ex = head.x + fx * hr * 0.3, ey = head.y + hr * 0.1, gap = hr * 0.38;
          // closed eyes: serene downward arcs
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, hr * 0.09); ctx.lineCap = 'round';
          ctx.beginPath();
          for (const sg of [-1, 1]) { ctx.moveTo(ex + sg * gap - hr * 0.16, ey); ctx.quadraticCurveTo(ex + sg * gap, ey + hr * 0.1, ex + sg * gap + hr * 0.16, ey); }
          ctx.stroke();
          // the smile: too wide, corners hooked up, a line of teeth in it
          const my = head.y + hr * 0.55, mw = hr * 0.55;
          const smile = () => { ctx.beginPath(); ctx.moveTo(ex - mw, my - hr * 0.18); ctx.quadraticCurveTo(ex, my + hr * 0.32, ex + mw, my - hr * 0.18); ctx.quadraticCurveTo(ex, my + hr * 0.12, ex - mw, my - hr * 0.18); ctx.closePath(); };
          ctx.fillStyle = '#2a0a0e'; smile(); ctx.fill();
          ctx.strokeStyle = '#efe6d6'; ctx.lineWidth = Math.max(0.8, hr * 0.05);
          ctx.beginPath(); ctx.moveTo(ex - mw * 0.75, my - hr * 0.08); ctx.quadraticCurveTo(ex, my + hr * 0.16, ex + mw * 0.75, my - hr * 0.08); ctx.stroke();
          ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, hr * 0.07); smile(); ctx.stroke();
          // painted tear-tracks: one of water, one of fire
          ctx.lineWidth = Math.max(1, hr * 0.06);
          const waterLeft = Lp(0, -1, headZ).x < Lp(0, 1, headZ).x;
          ctx.strokeStyle = `rgba(${waterLeft ? L.water : L.lava},0.8)`;
          ctx.beginPath(); ctx.moveTo(ex - gap, ey + hr * 0.12); ctx.lineTo(ex - gap - hr * 0.04, ey + hr * 0.5); ctx.stroke();
          ctx.strokeStyle = `rgba(${waterLeft ? L.lava : L.water},0.8)`;
          ctx.beginPath(); ctx.moveTo(ex + gap, ey + hr * 0.12); ctx.lineTo(ex + gap + hr * 0.04, ey + hr * 0.5); ctx.stroke();
        }
      }
      layer(armSh(nearArm), flash);
      if (!flash) {
        // Water coiling round the water arm; lava welling from the other hand.
        const wa = arms[0], la = arms[1];
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const ph = tt * 2.4 + i * 2.1, r = m * (0.28 + i * 0.07);
          ctx.strokeStyle = `rgba(${L.water},${(0.75 - i * 0.18).toFixed(2)})`; ctx.lineWidth = Math.max(1.5, m * (0.04 - i * 0.008));
          ctx.beginPath(); ctx.ellipse(wa.hand.x, wa.hand.y - m * 0.05, r, r * 0.45, -0.3, ph, ph + 2.4); ctx.stroke();
        }
        ctx.fillStyle = `rgba(${L.water},0.9)`;
        for (let i = 0; i < 5; i++) {
          const a = tt * 3 + i * 1.256, q = { x: wa.hand.x + Math.cos(a) * m * 0.42, y: wa.hand.y + Math.sin(a) * m * 0.18 - m * 0.05 };
          ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1.2, m * 0.025), 0, TAU); ctx.fill();
        }
        // lava: a glowing hand, molten drops falling and cooling dark
        ctx.fillStyle = `rgba(${L.lava},0.3)`; ctx.beginPath(); ctx.arc(la.hand.x, la.hand.y, m * 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(la.hand.x, la.hand.y, m * 0.06, 0, TAU); ctx.fill();
        const ground = Lp(0.25, 0.75, 0);
        for (let i = 0; i < 4; i++) {
          const ph = (tt * 0.8 + i * 0.25) % 1;
          const y = la.hand.y + (ground.y - la.hand.y) * ph * ph, x = la.hand.x + (i - 1.5) * m * 0.05;
          ctx.fillStyle = ph < 0.7 ? '#ff9a3a' : '#5a1a10';
          ctx.beginPath(); ctx.ellipse(x, y, Math.max(1.2, m * 0.025), Math.max(2, m * 0.05), 0, 0, TAU); ctx.fill();
        }
        // heat shimmer rising off the lava side
        ctx.strokeStyle = 'rgba(255,200,150,0.25)'; ctx.lineWidth = Math.max(1, m * 0.015);
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const b = Lp(0, 0.5 + i * 0.2, hz + 0.4 + i * 0.5);
          for (let j = 0; j < 5; j++) { const x = b.x + Math.sin(tt * 6 + j + i) * m * 0.04, y = b.y - j * m * 0.12; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    return { update, drawUnit, LOOK };
  }

  NS.fighters = { create, LOOK, pose };
})();
