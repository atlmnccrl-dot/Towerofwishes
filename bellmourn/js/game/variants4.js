// Act IV's area variants (the Drowned Heaven: the Sunken Choir, the Glass Orchard, the Hall of Echoes and the
// Broken Halo), in the shape of variants.js AREAS, registered into its VARIANTS and SHORT tables on load (the
// Act IV level files import this module, so the tables are filled before a level's def reads them). Pure data:
// no DOM, no three.js. Every player-facing text in this file is PROPOSAL.
import { VARIANTS, SHORT, CONDITIONS } from './variants.js';

const PI = Math.PI;
// under the sea and in the halls of the Voice no rain falls, whatever the condition
const DRY = { rain: 0, drizzle: 0, lightning: false };
// the Act IV foes that stand in for the conditions' own (an Act IV place keeps its own kind of foe)
const POOL = {
  eclipse: { drownedangel: 'choirwraith', glasshound: 'shardswarm', mirrorknight: 'choirwraith' },
  bloodmoon: { choirwraith: 'drownedangel', shardswarm: 'glasshound', belljelly: 'drownedangel' },
  hallowed: { shardswarm: 'choirwraith', glasshound: 'drownedangel' },
  fog: { glasshound: 'choirwraith', drownedangel: 'belljelly' },
  storm: { choirwraith: 'belljelly', shardswarm: 'glasshound' },
  ashfall: { belljelly: 'shardswarm', choirwraith: 'mirrorknight' },
  plague: { glasshound: 'belljelly' },
};

export const AREAS4 = {
  choir: {
    short: { start: { x: 4, z: -44, face: PI }, drop: ['nave', 'organ'], cut: [[-30, -42, 36, 22]], open: ['naveGate', 'organGate'] },
    variants: [
      { id: 'choir.eclipse', name: 'THE LIGHTLESS DEEP', condition: 'eclipse', tagline: 'NO LIGHT REACHES THIS FAR DOWN. ONLY THE SINGING.',
        ambience: { ...DRY, weather: 'voidmotes' }, layout: { blocks: [[-4.6, -9.6, 1.6, 1.4, 'rubble']] }, bossPool: [], events: ['ambush', 'hint'] },
      { id: 'choir.bloodmoon', name: 'THE RED TIDE', condition: 'bloodmoon', tagline: 'THE WATER OVER THE NAVE HAS TURNED RED.',
        ambience: { ...DRY, weather: 'dust' }, layout: { blocks: [[9.2, -30.6, 1.4, 1.4, 'bones']] }, bossPool: [], events: ['elite', 'survivor'] },
      { id: 'choir.hallowed', name: 'THE DROWNED MASS', condition: 'hallowed', tagline: 'GOLD LIGHT FROM ABOVE. THE CHOIR SINGS LOUDER.',
        ambience: { ...DRY, weather: 'feathers' }, layout: { start: { x: 6, z: 14, face: PI }, blocks: [[-4.4, -58.6, 1.4, 1.4, 'rubble']] }, bossPool: [], events: ['cursedlamp', 'hint'] },
    ],
  },
  orchard: {
    short: { start: { x: 3, z: -46, face: PI }, drop: ['grove', 'press'], cut: [[-40, -44, 40, 22]], open: ['groveGate', 'pressGate'] },
    variants: [
      { id: 'orchard.ashfall', name: 'THE ORCHARD IN ASH', condition: 'ashfall', tagline: 'THE GLASS LEAVES ARE GREY. THE FRUIT STILL HUMS.',
        ambience: { ...DRY }, layout: { blocks: [[-6.2, -24.6, 1.6, 1.4, 'glass']] }, bossPool: [], events: ['ambush', 'hint'] },
      { id: 'orchard.storm', name: 'THE SINGING STORM', condition: 'storm', tagline: 'LIGHTNING IN THE GLASS. EVERY BRANCH RINGS.',
        ambience: { rain: 0.6, drizzle: 0.4, lightning: true }, layout: { blocks: [[7.6, -64.6, 1.4, 1.4, 'glass']] }, bossPool: [], events: ['elite', 'cursedlamp'] },
      { id: 'orchard.fog', name: 'THE FROSTED GLASS', condition: 'fog', tagline: 'A MIST ON THE PANES. VOICES IN IT.',
        ambience: { ...DRY, weather: 'dust' }, layout: { start: { x: 6, z: 14, face: PI }, blocks: [[-2.6, -88.4, 1.4, 1.4, 'glass']] }, bossPool: [], events: ['survivor', 'hint'] },
    ],
  },
  echoes: {
    short: { start: { x: 4, z: -46, face: PI }, drop: ['foyer', 'gallery'], cut: [[-40, -44, 40, 22]], open: ['foyerGate', 'galleryGate'] },
    variants: [
      { id: 'echoes.eclipse', name: 'THE UNLIT MIRRORS', condition: 'eclipse', tagline: 'THE MIRRORS SHOW ONLY WHAT THE DARK REMEMBERS.',
        ambience: { ...DRY }, layout: { blocks: [[9.4, -12.6, 1.4, 1.4, 'glass']] }, bossPool: [], events: ['ambush', 'hint'] },
      { id: 'echoes.bloodmoon', name: 'THE RED REFLECTION', condition: 'bloodmoon', tagline: 'EVERY ECHO HERE REMEMBERS HOW IT DIED.',
        ambience: { ...DRY }, layout: { blocks: [[-5.4, -36.6, 1.4, 1.4, 'glass']] }, bossPool: [], events: ['elite', 'survivor'] },
      { id: 'echoes.hallowed', name: 'THE GILDED MEMORY', condition: 'hallowed', tagline: 'THE VOICE REMEMBERS YOUR VICTORIES FONDLY. TOO FONDLY.',
        ambience: { ...DRY }, layout: { start: { x: 6, z: 14, face: PI }, blocks: [[11, -66.6, 1.4, 1.4, 'glass']] }, bossPool: [], events: ['cursedlamp', 'hint'] },
    ],
  },
  halo: {
    short: { start: { x: 4, z: -44, face: PI }, drop: ['spoke'], cut: [[-40, -42, 40, 22]], open: ['spokeGate'] },
    variants: [
      { id: 'halo.storm', name: 'THE STORM OVER THE SEA', condition: 'storm', tagline: 'THE BRONZE SEA HEAVES. THE RING HUMS LIKE A STRUCK BELL.',
        ambience: { rain: 0.8, drizzle: 0.5, lightning: true }, layout: { blocks: [[-3.4, -21.6, 1.4, 1.4, 'rubble']] }, bossPool: ['seraph'], events: ['ambush', 'hint'] },
      { id: 'halo.eclipse', name: 'THE DARKENED HALO', condition: 'eclipse', tagline: 'THE RING HAS GONE DARK. ONLY SHE STILL SHINES.',
        ambience: { ...DRY }, layout: { blocks: [[9.6, -30.6, 1.4, 1.4, 'rubble']] }, bossPool: ['seraph'], events: ['elite', 'cursedlamp'] },
      { id: 'halo.hallowed', name: 'THE LAST DAWN OF HEAVEN', condition: 'hallowed', tagline: 'HEAVEN BURNS GOLD ONE LAST TIME.',
        ambience: { ...DRY }, layout: { start: { x: 6, z: 14, face: PI }, blocks: [[-2.6, -12.6, 1.4, 1.4, 'rubble']] }, bossPool: ['seraph'], events: ['survivor', 'hint'] },
    ],
  },
};

// the registration: the same normalisation variants.js gives its own areas
for (const [level, a] of Object.entries(AREAS4)) {
  SHORT[level] = a.short;
  VARIANTS[level] = a.variants.map((v) => {
    const C = CONDITIONS[v.condition];
    return { level, layout: {}, events: [], ...v, pool: { ...C.pool, ...(POOL[v.condition] || {}), ...(v.pool || {}) }, elements: v.elements || { ...C.elements } };
  });
}
export { VARIANTS };
