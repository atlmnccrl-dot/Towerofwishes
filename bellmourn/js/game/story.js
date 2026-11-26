// The story of Bellmourn: the opening, the districts and regions in order, the act cards, the tips, the
// credits. Pure data. The spoken scenes are scripts in js/game/scenes/ (played by js/game/cutscene.js).

export const OPENING = [
  'BELLMOURN, CITY OF A HUNDRED BELLS.',
  'EVERY DAWN THE GREAT BELL OF ST. ORRIN RANG, AND THE SUN CAME UP OVER THE ROOFS.',
  'ONE HUNDRED NIGHTS AGO, THE BELL FELL SILENT.',
  'THE RAIN HAS NOT STOPPED SINCE. NOR HAS THE NIGHT.',
  'THE PEOPLE WHO STILL WALK THE STREETS HAVE NO VOICES NOW. ONLY EYES.',
  'THE CITY CALLS THEM THE HUSHED.',
  'THE LAST OF THE BELL-WARDENS COME HOME.',
];

// Act II: the four regions beyond the walls, played after the Belfry (PROPOSAL: the author may rename them).
export const ACT2 = ['frostmarch', 'ashdunes', 'catacombs', 'abyss'];
// Act III: the Wheel (PROPOSAL, docs/STORY_BIBLE.md): the Weeping Marsh, the Clockwork Spire, the Empyrean.
export const ACT3 = ['marsh', 'spire', 'empyrean'];
export const ACT1 = ['gate', 'market', 'docks', 'nave', 'undercroft', 'foundry', 'heights', 'belfry'];
// every place the Haven can lead to, in order (the map, the merchant's stock and the loot follow this order)
export const DISTRICTS = [...ACT1, ...ACT2, ...ACT3];
// The Ascent (PROPOSAL, docs/ASCENT_DESIGN.md): Act IV the Drowned Heaven, Act V the God's Dream, Act VI the Throne.
export const ACT4 = ['choir', 'orchard', 'echoes', 'halo'];
export const ACT5 = ['ribs', 'unborn', 'wake', 'cradle'];
export const ACT6 = ['throne'];
// the card over a place as it is entered: which act, which region
export const ACT_OF = (id) => (ACT6.includes(id) ? 6 : (ACT5.includes(id) ? 5 : (ACT4.includes(id) ? 4 : (ACT3.includes(id) ? 3 : (ACT2.includes(id) ? 2 : (ACT1.includes(id) ? 1 : 0))))));
export const ACT_NAMES = { 1: 'THE CITY', 2: 'BEYOND THE WALLS', 3: 'THE WHEEL', 4: 'THE DROWNED HEAVEN', 5: "THE GOD'S DREAM", 6: 'THE THRONE' }; // PROPOSAL
// the card when a run stops at the last act this save has opened (PROPOSAL)
export const ROAD_GOES_ON = {
  locked: ['THE ROAD GOES ON.', 'BEYOND THIS, SOMETHING STIRS THAT YOU ARE NOT YET READY TO MEET.', 'COME BACK STRONGER, WARDEN.'],
  unbuilt: ['THE ROAD GOES ON.', 'THE WAY AHEAD IS STILL BEING WALKED.', 'COME BACK, WARDEN.'],
};

export const ENDING = [
  'THE BELL OF ST. ORRIN RINGS.',
  'FOR THE FIRST TIME IN A HUNDRED NIGHTS, THE RAIN THINS.',
  'ACROSS THE ROOFS, ONE BY ONE, THE HUSHED LIFT THEIR HEADS.',
  'AND THE SUN COMES UP OVER BELLMOURN.',
];

// PROPOSAL (for the author): after the end of Act I (ENDING), the way into Act II.
export const ACT2_OPENING = [
  'END OF ACT I',
  'THE BELL RANG. BUT FAR BEYOND THE WALLS, SOMETHING HEARD IT.',
  'THE SILENCE DID NOT BEGIN IN BELLMOURN. IT WAS SENT.',
  'NORTH THROUGH THE SNOWS, ACROSS THE ASH DUNES, DOWN UNDER THE SAND.',
  'THE WARDENS TAKE UP THEIR LAMPS AGAIN.',
  'ACT II: BEYOND THE WALLS',
];

// PROPOSAL (for the author): the way into Act III, after the Hollow Archon falls.
export const ACT3_OPENING = [
  'END OF ACT II',
  'ABOVE THE ABYSS, THE WHEEL BEGAN TO TURN.',
  'THE GREAT BELL HOLDS THE VOICE OF THE GOD WHO MADE THE WORLD. THE WHEEL IS ITS JAILER.',
  'THROUGH THE WEEPING MARSH, UP THE CLOCKWORK SPIRE, TO THE HUB OF THE WHEEL.',
  'ACT III: THE WHEEL',
];

// (older card text, kept for reference) the closing ending, after the Hollow Archon falls (the dawn image is kept).
export const FINALE = [
  'THE WHEEL STOPS TURNING. ONE BY ONE, ITS EYES CLOSE.',
  'FAR ABOVE, IN A CITY OF A HUNDRED BELLS, EVERY BELL RINGS AT ONCE.',
  'THE WARDENS CLIMB TOWARD THE SOUND.',
  'AND THE SUN COMES UP OVER BELLMOURN, AND OVER EVERYTHING BEYOND IT.',
];

export const CREDITS = [
  'BELLMOURN',
  'A BLEDINK STUDIOS GAME',
  '',
  'CODE, ART, MUSIC AND SOUND',
  'MADE IN THE BROWSER, FROM SCRATCH',
  '',
  'RENDERED WITH THREE.JS (MIT)',
  '',
  'THANK YOU FOR PLAYING',
];

export const TIPS = [
  'DASH THROUGH AN ATTACK AT THE LAST MOMENT TO SLOW TIME.',
  'BREAK A FOE\'S GUARD: IT REELS AND TAKES MORE DAMAGE.',
  'THE RED SHAPES ON THE STONES SHOW WHERE A BLOW WILL FALL.',
  'LAMPS LIGHT WHEN NO FOE IS NEAR. THEY HEAL YOU AND KEEP YOUR PLACE.',
  'YOUR SKILLS FIRE FROM THE ATTACK WHEN THEIR BADGES GLOW.',
  'SPEND SKILL POINTS AT THE HAVEN. EVERY RANK HITS HARDER.',
  'TEMPER YOUR WEAPON AT THE HAVEN, OR BUY A BETTER ONE.',
  'RELICS CHANGE HOW YOU FIGHT. WEAR THEM AT THE HAVEN.',
  'ELITES GLOW. THEY HIT HARDER AND DROP MORE.',
  'KILL THE CHANTERS FIRST: THEY SHIELD THE OTHERS.',
  'WHEN THE RED GAUGE IS FULL, UNLEASH YOUR ULTIMATE.',
  'TRY ANOTHER WARDEN AT THE HAVEN. EACH ONE LEVELS ON THEIR OWN.',
  'THE PAUSE MENU CAN TAKE YOU BACK TO THE HAVEN. WHAT YOU CLEARED STAYS CLEARED.',
  'EVERY EMBER IS A VOICE SET FREE. CARRY THEM BACK TO THE HAVEN FIRE.', // PROPOSAL
];
