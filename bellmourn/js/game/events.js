// The event deck (RUN_DESIGN sections 2 and 8): the EVENT nodes of the route map, Mewgenics-style cards. Pure data
// and functions: no DOM. Every title, text, choice and outcome line here is PROPOSAL.
//
// An event: { id, title, acts: [1, 2, 3], weight, tags, art: { scene, palette }, text,
//   choices: [{ label, cost?: { hp?, embers?, tonic? }, risk?: text, tags?: [], do?: outcome, roll?: [outcome with w] }] }
// An outcome: { line | lines, changes } where changes may hold (all optional):
//   hp (a change, + heals, - hurts), hpPct (a fraction of max HP), maxHp (a change), embers, tonics, boon: 'offer' or
//   { res } (an offer of one Resonance) or 'upgrade', curse: id (CURSES), uncurse: true, relic: id or 'random',
//   quest: questId (advances the line: quests.advanceQuest), hint: hintId (quests.findHint), freed: n, memory: heroId
//   (a warden's memory, a Codex lore page), lore: id (LORE), rerolls: n, fight: { foes, element } (game.js runs it
//   like a TRIAL first; a loss is a death like any other).
// Costs are written in Act I embers and scaled by the act (ACT_K) when the card is dealt (dealEvent), so a card in
// Act III asks Act III prices. E draws art.scene (ART_SCENES) in art.palette.
//
// pickEvent(run, meta, rng, ctx) deals a card: weighted by act, by the run's state (low health draws healing, a
// full purse draws merchants, curses draw cleansing, an active quest draws its own events), never one already seen
// this run. resolveEvent(run, meta, id, choice, rng) returns { lines, changes } and does not change anything;
// applyChanges(run, meta, changes) is the helper game.js may use to apply them (the boon pick, relic choice and
// fights it cannot do itself are returned in `pending`).
import { advanceQuest, findHint, HINTS, QUESTS } from './quests.js';

export const ACT_K = { 1: 1, 2: 2.2, 3: 3.6 };
export const ART_SCENES = ['alley', 'canal', 'pier', 'ship', 'nave', 'crypt', 'forge', 'ballroom', 'roof', 'gibbet', 'well', 'lamp', 'shrine', 'bell',
  'cage', 'mirror', 'child', 'crow', 'rats', 'merchant', 'choir', 'letter', 'snow', 'dunes', 'tomb', 'abyss', 'marsh', 'clock', 'heaven', 'procession'];
const PAL = {
  night: ['#0a0e16', '#2a3448', '#8a9ab4', '#e8dcc0'], amber: ['#140c08', '#5a3420', '#e89040', '#ffe0a0'], sea: ['#081012', '#1e3a40', '#6aa0a0', '#d8f0e8'],
  blood: ['#100406', '#4a0c12', '#c8242a', '#f0c0a0'], bone: ['#100e0a', '#4a4236', '#a89a80', '#f0e8d0'], forge: ['#120806', '#5a2010', '#ff7a2a', '#ffd890'],
  gild: ['#0e0c14', '#4a4060', '#c8b070', '#fff4d0'], frost: ['#0a1018', '#2a4460', '#9cc8e8', '#f4fbff'], sand: ['#140e0a', '#5a4430', '#d8a868', '#fff0c8'],
  void: ['#06040c', '#2a1840', '#9a60ff', '#e8d8ff'], bog: ['#080c0a', '#24322a', '#8ab070', '#e0f0c8'], brass: ['#0c0a14', '#3a2c50', '#c89a50', '#f8e8c0'],
  heaven: ['#2a2830', '#a8a0b0', '#f0e4c8', '#ffffff'],
};

// ------------------------------------------------------------------ curses: a drawback with an upside
// mods: what B's boonMods / A's heroStats may fold in (all multipliers default 1, adds default 0).
export const CURSES = {
  cracked_bell: { name: 'CRACKED BELL', down: '-15% MAX HEALTH', up: '+30% EMBERS', mods: { maxHpMul: 0.85, emberMul: 1.3 } },
  hungry_dark: { name: 'THE HUNGRY DARK', down: 'TONICS HEAL 30% LESS', up: '+15% DAMAGE', mods: { tonicHealMul: 0.7, dmgMul: 1.15 } },
  oath_of_haste: { name: 'OATH OF HASTE', down: 'TAKE 15% MORE DAMAGE', up: 'MOVE AND DASH 15% FASTER', mods: { dmgTakenMul: 1.15, speedMul: 1.15, dashCdMul: 0.85 } },
  leaden_tongue: { name: 'LEADEN TONGUE', down: 'ONE TONIC FEWER', up: 'BOON PICKS SHOW ONE MORE CARD', mods: { tonicAdd: -1, boonChoicesAdd: 1 } },
  whispering_lamp: { name: 'THE WHISPERING LAMP', down: 'ELITES COME TWICE AS OFTEN', up: 'ELITES DROP DOUBLE EMBERS', mods: { eliteMul: 2, eliteEmberMul: 2 } },
  drowned_lungs: { name: 'DROWNED LUNGS', down: 'THE DASH RECHARGES 30% SLOWER', up: '+20% ATTACK DAMAGE', mods: { dashCdMul: 1.3, attackMul: 1.2 } },
  pale_mark: { name: 'THE PALE MARK', down: 'FOES NOTICE YOU FROM AFAR', up: '+15% CRITICAL CHANCE', mods: { aggroMul: 1.5, critAdd: 0.15 } },
  blood_price: { name: 'BLOOD PRICE', down: 'HEALING IS HALVED', up: 'EVERY KILL HEALS 3', mods: { healMul: 0.5, healOnKill: 3 } },
  borrowed_voice: { name: 'A BORROWED VOICE', down: 'THE ULTIMATE CHARGES 25% SLOWER', up: 'SKILLS RECHARGE 20% FASTER', mods: { ultChargeMul: 0.75, skillCdMul: 0.8 } },
  frost_in_the_veins: { name: 'FROST IN THE VEINS', down: '-10% MOVE SPEED', up: 'TAKE 12% LESS DAMAGE', mods: { speedMul: 0.9, dmgTakenMul: 0.88 } },
};

// ------------------------------------------------------------------ lore pages and warden memories (the Codex)
export const LORE = {
  'lore.toll': { title: 'THE FIRST TOLL', text: 'THE FOUNDER CAUGHT A DYING VOICE IN BRONZE. EACH DAWN IT SAYS ONE WORD: AGAIN.' },
  'lore.hushed': { title: 'THE HUSHED', text: 'THEIR VOICES DID NOT DIE. THEY SLEEP IN THEM, LIKE SPARKS IN ASH.' },
  'lore.choir': { title: 'THE HOLLOW CHOIR', text: 'THEY TEACH THAT THE WORLD IS A CELL, AND THAT SILENCE IS THE KEY.' },
  'lore.regent': { title: 'THE PRICE OF NIGHT', text: 'THE REGENT PAID IN DAWNS. EACH ONE BOUGHT ANOTHER HOUR OF DANCING.' },
  'lore.founder': { title: 'THE SILENT BELL', text: 'IT WAS CAST TO SWALLOW SOUND. IT RANG ONCE, AND THE CITY FORGOT HOW.' },
  'lore.wheel': { title: 'THE WHEEL', text: 'RINGS WITHIN RINGS, EYES WITHIN EYES. IT TURNS AGAINST THE TOLL.' },
  'lore.oldcity': { title: 'THE CITY UNDER THE SAND', text: 'BEFORE BELLMOURN THERE WAS A CITY OF ONE BELL. THE SAND ATE IT IN A NIGHT.' },
  'lore.lamplighters': { title: 'THE LAMPLIGHTERS', text: 'SEVEN LAMPS, LIT FROM THE BELL\'S OWN FORGE. AS LONG AS ONE BURNS, THE NIGHT HAS A DOOR.' },
  'lore.voice': { title: 'THE VOICE IN THE BELL', text: 'IT IS TIRED. IT HAS SAID AGAIN FOR A THOUSAND YEARS.' },
  'lore.wardens': { title: 'THE BELL-WARDENS', text: 'THEY SWORE TO KEEP THE TOLL. MOST SWORE AGAIN, TO KEEP IT SILENT.' },
  'lore.drowned': { title: 'THE DROWNED BELLS', text: 'THE MARSH KEEPS EVERY BELL THAT EVER FELL INTO IT. SOME STILL RING.' },
  'lore.clock': { title: 'THE CLOCKMASTER\'S HOUR', text: 'THE WHEEL\'S TIME HAS ONE HOUR ON ITS FACE: THE LAST ONE.' },
};
export const MEMORIES = {
  warden: 'CARMINE, SMALL, ON ORRIN\'S SHOULDERS, HANDS OVER THEIR EARS AS THE BELL RINGS.',
  huntress: 'VESPER TEACHING TAM TO WHISTLE. HE NEVER GOT IT. HE LAUGHED INSTEAD.',
  bellbreaker: 'BRAM\'S FIRST BELL: CRACKED, OUT OF TUNE. THE FOUNDER HUNG IT OVER HIS BED.',
  lamplighter: 'SISTER ASH, A NOVICE, BURNING HER FINGERS ON HER FIRST WICK, AND SMILING.',
  kestrel: 'KESTREL AT EIGHT, SLIPPING BREAD THROUGH THE BARS WHILE HER FATHER SLEPT.',
  hollis: 'HOLLIS RINGING THE HARBOUR BELL FOR A SHIP THAT CAME HOME. EVERYONE CHEERED.',
  wren: 'WREN\'S FIRST HYMN. THE DEACON WEPT. SHE THOUGHT IT WAS FROM JOY.',
};

// ------------------------------------------------------------------ builders
const O = (line, changes = {}) => ({ lines: [].concat(line), changes });
const W = (w, line, changes) => ({ w, ...O(line, changes) });
const art = (scene, pal) => ({ scene, palette: PAL[pal] || PAL.night });

// ------------------------------------------------------------------ the deck
const DECK = [
  // ======================================================== ACT I: THE CITY
  { id: 'toll_collector', title: 'THE TOLL COLLECTOR', acts: [1], tags: ['embers'], art: art('alley', 'night'),
    text: 'A HUSHED STANDS AT A BRIDGE WITH A BOWL SHAPED LIKE A BELL. HE STILL ASKS THE TOLL.',
    choices: [
      { label: 'PAY THE TOLL', cost: { embers: 40 }, do: O('HE BOWS. SOMETHING WARM SETTLES ON YOUR SHOULDERS.', { boon: 'offer' }) },
      { label: 'TAKE FROM THE BOWL', risk: 'A CURSE', do: O('THE EMBERS ARE YOURS. SO IS WHAT CLINGS TO THEM.', { embers: 90, curse: 'cracked_bell' }) },
      { label: 'RING HIS BELL', risk: 'SOMETHING MAY ANSWER', roll: [W(2, 'A CLEAR NOTE. HE LOOKS UP, AND FOR A MOMENT HE SEES YOU.', { freed: 1, embers: 30 }), W(1, 'THE NOTE WAKES THE STREET. CLAWS ON THE STONES.', { hp: -15 })] },
    ] },
  { id: 'drowned_choirboy', title: 'THE BOY UNDER THE CANAL', acts: [1], near: ['market', 'docks'], tags: ['relic'], art: art('canal', 'sea'),
    text: 'BENEATH THE BLACK WATER A CHOIRBOY SINGS. BUBBLES RISE WITH EVERY NOTE.',
    choices: [
      { label: 'DIVE FOR HIM', cost: { hp: 20 }, do: O('YOU BRING UP ONLY HIS PEARL. HE WAS NEVER THERE TO SAVE.', { relic: 'pearl' }) },
      { label: 'SING BACK', do: O('THE SONG STOPS. A SINGLE EMBER FLOATS UP.', { embers: 25, lore: 'lore.hushed' }) },
      { label: 'WALK ON', do: O('THE SONG FOLLOWS YOU FOR A STREET OR TWO.') },
    ] },
  { id: 'cursed_lamp', title: 'THE CURSED LAMP', acts: [1, 2, 3], weight: 0.6, tags: ['curse', 'boon'], art: art('lamp', 'void'),
    text: 'A STREET LAMP BURNS WITH A VIOLET FLAME. IT LEANS TOWARD YOU LIKE A FLOWER TO THE SUN.',
    choices: [
      { label: 'DRINK THE LIGHT', risk: 'A CURSE', do: O('IT POURS INTO YOU, COLD AND BRIGHT.', { boon: 'offer', curse: 'whispering_lamp' }) },
      { label: 'SNUFF IT OUT', cost: { hp: 12 }, do: O('IT BURNS YOUR HAND GOING OUT. SOMETHING LOOSENS IN YOU.', { uncurse: true, embers: 20 }) },
      { label: 'LEAVE IT BURNING', do: O('IT TURNS TO WATCH YOU GO.') },
    ] },
  { id: 'the_backwards_choir', title: 'THE BACKWARDS CHOIR', acts: [1, 2], near: ['nave', 'undercroft'], tags: ['quest'], quest: 'wren', art: art('choir', 'void'),
    text: 'IN AN EMPTY CHAPEL, THREE MASKED SINGERS SING A HYMN BACKWARDS. THEY DO NOT SEE YOU.',
    choices: [
      { label: 'LISTEN TO THE END', do: O('THE HYMN IS A MAP. THE SINGERS VANISH ON THE LAST NOTE.', { hint: 'q.wren.1' }) },
      { label: 'SILENCE THEM', risk: 'A FIGHT', do: O('THE MASKS SHATTER. THE SONG HANGS IN THE AIR.', { fight: { foes: ['chanter', 'chanter', 'hushed'], element: 'void' }, boon: 'offer' }) },
    ] },
  { id: 'lamp_of_the_order', title: 'A LAMPLIGHTER\'S LAMP', acts: [1], near: ['market'], tags: ['quest', 'heal'], quest: 'ash', art: art('lamp', 'amber'),
    text: 'A SMALL BRASS LAMP, GUTTERING, WITH A FLAME IN A CIRCLE ETCHED ON ITS GLASS.',
    choices: [
      { label: 'TRIM THE WICK', do: O('IT FLARES UP. ON ITS BASE: AN ARROW, AND A NUMBER. ONE OF SEVEN.', { hint: 'q.ash.1', hpPct: 0.15 }) },
      { label: 'WARM YOUR HANDS', do: O('FOR A MOMENT IT IS LIKE THE HAVEN.', { hpPct: 0.3 }) },
    ] },
  { id: 'gibbet_cage', title: 'THE GIBBET CAGE', acts: [1], near: ['gate'], tags: ['freed'], art: art('gibbet', 'night'),
    text: 'A CAGE SWINGS FROM A GIBBET. INSIDE, A HUSHED WOMAN HOLDS A RUSTED KEY OUT TO YOU.',
    choices: [
      { label: 'BREAK THE CAGE', cost: { hp: 10 }, do: O('THE BARS GIVE. SHE TOUCHES YOUR FACE AND WALKS AWAY INTO THE RAIN.', { freed: 1, embers: 60 }) },
      { label: 'TAKE THE KEY', do: O('THE KEY OPENS NOTHING YOU CAN FIND. IT IS WARM.', { relic: 'coin' }) },
      { label: 'LOWER THE CAGE GENTLY', do: O('IT TAKES A LONG TIME. SHE HUMS THE WHOLE WHILE.', { freed: 1, lore: 'lore.hushed' }) },
    ] },
  { id: 'candle_wife', title: 'THE CANDLE-WIFE', acts: [1], near: ['market'], tags: ['shop', 'lore'], art: art('merchant', 'amber'),
    text: 'AN OLD WOMAN SELLS CANDLES THAT REMEMBER. "LIGHT ONE, WARDEN. SEE WHO YOU WERE."',
    choices: [
      { label: 'BUY A CANDLE', cost: { embers: 50 }, do: O('IN ITS LIGHT YOU SEE A FACE YOU KNEW.', { memory: 'random', hpPct: 0.2 }) },
      { label: 'BUY HER WHOLE TRAY', cost: { embers: 120 }, do: O('THE ROOM FILLS WITH OLD DAYS. YOU FEEL STRONGER FOR THEM.', { boon: 'upgrade', memory: 'random' }) },
      { label: 'ASK WHO SHE WAS', do: O('"A LAMPLIGHTER. BEFORE THE NIGHT." SHE WILL SAY NO MORE.', { lore: 'lore.lamplighters' }) },
    ] },
  { id: 'rat_court', title: 'THE COURT OF RATS', acts: [1], near: ['undercroft', 'market', 'docks'], tags: ['relic', 'curse'], art: art('rats', 'bone'),
    text: 'A HUNDRED RATS SIT IN A RING AROUND A TINY CROWN OF WIRE. THEY ARE WAITING FOR A KING.',
    choices: [
      { label: 'TAKE THE CROWN', risk: 'A CURSE', do: O('THE RATS BOW. THE WHOLE CITY SEEMS TO NOTICE.', { relic: 'crown', curse: 'pale_mark' }) },
      { label: 'FEED THEM', cost: { embers: 30 }, do: O('THEY SCATTER, FAT AND GRATEFUL. ONE LEAVES YOU A TOOTH.', { relic: 'tooth' }) },
      { label: 'SCATTER THEM', risk: 'BITES', do: O('THEY BITE ON THEIR WAY OUT.', { hp: -10, embers: 35 }) },
    ] },
  { id: 'hanged_coat', title: 'THE HANGED MAN\'S COAT', acts: [1], near: ['gate', 'heights'], tags: ['hp'], art: art('gibbet', 'blood'),
    text: 'A FINE RED COAT HANGS FROM THE GALLOWS ROPE. NO ONE IS IN IT. IT IS STILL WARM.',
    choices: [
      { label: 'WEAR IT', risk: 'A CURSE', do: O('IT FITS TOO WELL. YOUR HEART BEATS HARDER IN IT.', { maxHp: 15, curse: 'blood_price' }) },
      { label: 'SEARCH THE POCKETS', roll: [W(3, 'EMBERS, AND A NOTE: "FOR WHOEVER COMES NEXT."', { embers: 70 }), W(1, 'A RAZOR SEWN INTO THE LINING.', { hp: -12, embers: 20 })] },
      { label: 'CUT IT DOWN', do: O('IT FALLS LIKE A MAN FALLS. YOU DO NOT LOOK BACK.', { freed: 1 }) },
    ] },
  { id: 'speaking_fish', title: 'THE FISH THAT SPEAKS', acts: [1], near: ['docks'], tags: ['quest', 'heal'], art: art('pier', 'sea'),
    text: 'A FISH ON THE FISHMONGER\'S SLAB OPENS ITS MOUTH AND SAYS A NAME. THEN ANOTHER.',
    choices: [
      { label: 'LISTEN', do: O('IT SAYS "TAM". IT SAYS "THE PIER". IT SAYS NOTHING MORE.', { hint: 'q.vesper.1' }), needs: { notHero: 'huntress' } },
      { label: 'EAT IT', do: O('IT TASTES OF THE SEA BEFORE THE NIGHT.', { hpPct: 0.35 }) },
      { label: 'THROW IT BACK', do: O('IT SINKS, STILL TALKING.', { embers: 25 }) },
    ] },
  { id: 'empty_ship', title: 'THE SHIP WITH NO CREW', acts: [1], near: ['docks'], tags: ['relic'], art: art('ship', 'sea'),
    text: 'A SHIP CAME BACK ON ITS OWN. ITS HOLD DOOR IS OPEN, AND SOMETHING BELOW IS BREATHING.',
    choices: [
      { label: 'GO DOWN', risk: 'A FIGHT', do: O('THE CREW WAS DOWN THERE. WHAT IS LEFT OF IT.', { fight: { foes: ['drowned', 'drowned', 'crab'], element: 'frost' }, relic: 'random' }) },
      { label: 'LOOT THE DECK', do: O('ROPE, A COMPASS THAT POINTS DOWN, A PURSE.', { embers: 55 }) },
      { label: 'BURN IT', do: O('IT BURNS GREEN. THE BREATHING STOPS.', { embers: 20, freed: 2 }) },
    ] },
  { id: 'tide_bell', title: 'THE TIDE BELL', acts: [1], near: ['docks', 'nave'], tags: ['freed', 'quest'], art: art('bell', 'sea'),
    text: 'A HALF-SUNK BELL TOLLS EACH TIME A WAVE STRIKES IT. THE DROWNED HAVE GATHERED TO LISTEN.',
    choices: [
      { label: 'RING IT FOR THEM', cost: { hp: 15 }, do: O('THE COLD WATER BITES. THREE OF THE DROWNED LOOK UP, AND SPEAK.', { freed: 3, embers: 40 }) },
      { label: 'LOOK FOR ITS TONGUE', do: O('IT HAS NONE. IT IS RINGING WITH SOMETHING ELSE.', { hint: 'q.hollis.1' }), needs: { notHero: 'hollis' } },
      { label: 'LEAVE THEM TO IT', do: O('THE TOLLING FOLLOWS YOU UP THE STREET.') },
    ] },
  { id: 'masquerade', title: 'THE MASQUERADE', acts: [1], near: ['heights'], tags: ['boon', 'relic'], art: art('ballroom', 'gild'),
    text: 'BEHIND TALL WINDOWS THE BALL GOES ON. A DANCER IN A SILVER MASK HOLDS OUT HER HAND.',
    choices: [
      { label: 'DANCE', cost: { hp: 18 }, do: O('SHE DANCES YOU RAGGED. AT THE END SHE PRESSES SOMETHING INTO YOUR PALM.', { boon: 'offer' }) },
      { label: 'UNMASK HER', do: O('THERE IS NO FACE. ONLY A NOTE: "PAID IN DAWNS."', { lore: 'lore.regent', embers: 30 }) },
      { label: 'STEAL HER SHAWL', risk: 'A CURSE', do: O('PALE SILK. NO ONE STOPS YOU. NO ONE EVER LOOKS AWAY.', { relic: 'silk', curse: 'pale_mark' }) },
    ] },
  { id: 'regent_ledger', title: 'THE REGENT\'S LEDGER', acts: [1], near: ['heights'], tags: ['shop', 'freed'], art: art('letter', 'gild'),
    text: 'A LEDGER LIES OPEN ON A MARBLE BENCH. EVERY LINE IS A DAWN, SOLD, AND WHO TO.',
    choices: [
      { label: 'BUY ONE BACK', cost: { embers: 80 }, do: O('ONE LINE FADES. SOMEWHERE A WINDOW GROWS PALE FOR A HEARTBEAT.', { boon: 'offer', freed: 1 }) },
      { label: 'BURN IT', do: O('THE PAGES SCREAM AS THEY CURL.', { freed: 3, lore: 'lore.regent' }) },
    ] },
  { id: 'ossuary_names', title: 'THE WALL OF NAMES', acts: [1], near: ['undercroft'], tags: ['heal', 'lore'], art: art('crypt', 'bone'),
    text: 'TEN THOUSAND NAMES ARE CUT INTO THE BONE-WHITE WALL. ONE SPACE IS EMPTY.',
    choices: [
      { label: 'READ A NAME ALOUD', do: O('THE NAME GLOWS. THE DEAD REMEMBER YOU BACK.', { hpPct: 0.4 }) },
      { label: 'CARVE YOUR OWN', risk: 'A CURSE', do: O('IT FEELS LIKE A PROMISE. IT FEELS LIKE A DEBT.', { curse: 'borrowed_voice', boon: 'offer' }) },
      { label: 'FIND A WARDEN\'S NAME', do: O('YOU FIND ONE YOU KNOW, AND A MEMORY WITH IT.', { memory: 'random' }) },
    ] },
  { id: 'warm_forge', title: 'THE FORGE STILL WARM', acts: [1], near: ['foundry'], tags: ['boon'], art: art('forge', 'forge'),
    text: 'AN ANVIL STILL GLOWS IN AN ABANDONED SMITHY. A HAMMER WAITS ON IT, AS IF FOR YOU.',
    choices: [
      { label: 'TEMPER YOUR GIFTS', cost: { hp: 20 }, do: O('THE HEAT GOES INTO YOUR BONES. SOMETHING IN YOU RINGS TRUER.', { boon: 'upgrade' }) },
      { label: 'QUENCH THE FORGE', do: O('STEAM, AND IN THE ASH, EMBERS.', { embers: 60 }) },
      { label: 'STRIKE THE ANVIL ONCE', do: O('IT RINGS LIKE A SMALL BELL. THE STREET GOES QUIET TO LISTEN.', { lore: 'lore.founder' }) },
    ] },
  { id: 'crow_rider', title: 'THE CROW-MASKED RIDER', acts: [1, 2], tags: ['boon', 'fight'], art: art('crow', 'night'),
    text: 'AN OATH-SWORN WARDEN BLOCKS THE ROAD. "ONE BOUT, OATHBREAKER. WIN, AND PASS WITH MY BLESSING."',
    choices: [
      { label: 'ACCEPT THE BOUT', risk: 'A FIGHT', do: O('HE FALLS TO ONE KNEE. "RING IT, THEN," HE SAYS.', { fight: { foes: ['warden', 'warden'], element: 'void' }, boon: 'offer' }) },
      { label: 'REFUSE', do: O('"THEN GO ROUND, COWARD." YOU GO ROUND. IT TAKES A WHILE.', { hp: -8 }) },
    ] },
  { id: 'oath_stone', title: 'THE OATH STONE', acts: [1, 2], tags: ['curse', 'boon'], art: art('shrine', 'bone'),
    text: 'A STONE WHERE WARDENS ONCE SWORE. THE WORDS ARE STILL CUT INTO IT: "UNTIL THE LAST TOLL."',
    choices: [
      { label: 'SWEAR AGAIN', risk: 'A CURSE', do: O('THE STONE TAKES YOUR WORD. IT WILL HOLD YOU TO IT.', { curse: 'oath_of_haste', boon: 'offer' }) },
      { label: 'BREAK THE STONE', cost: { hp: 15 }, do: O('IT SPLITS. A WEIGHT YOU DID NOT KNOW YOU CARRIED LIFTS.', { uncurse: true }) },
      { label: 'READ THE NAMES', do: O('SO MANY OF THEM SWORE THE OTHER OATH, AFTER.', { lore: 'lore.wardens' }) },
    ] },
  { id: 'well_of_voices', title: 'THE WELL OF VOICES', acts: [1, 2, 3], tags: ['heal', 'lore'], art: art('well', 'night'),
    text: 'VOICES RISE FROM A DRY WELL. NONE OF THEM ARE SPEAKING TO YOU. YET.',
    choices: [
      { label: 'DROP AN EMBER IN', cost: { embers: 20 }, roll: [W(2, 'A VOICE ANSWERS, AND TELLS YOU SOMETHING TRUE.', { lore: 'random' }), W(1, 'A VOICE ANSWERS WITH A WARDEN\'S MEMORY.', { memory: 'random' })] },
      { label: 'DRINK FROM THE BUCKET', risk: 'IT MAY BE FOUL', roll: [W(2, 'COLD AND CLEAN.', { hpPct: 0.4 }), W(1, 'IT TASTES OF IRON AND SILENCE.', { hp: -10 })] },
      { label: 'SHOUT DOWN IT', do: O('YOUR VOICE COMES BACK A LITTLE WRONG.', { embers: 15 }) },
    ] },
  { id: 'mirror_in_the_rain', title: 'THE MIRROR IN THE RAIN', acts: [1, 2], near: ['market', 'nave'], tags: ['curse', 'relic'], art: art('mirror', 'night'),
    text: 'A TALL MIRROR STANDS IN THE STREET. YOUR REFLECTION IS SMILING. YOU ARE NOT.',
    choices: [
      { label: 'LOOK AWAY', do: O('WHEN YOU LOOK BACK, THE MIRROR IS GONE.') },
      { label: 'STARE IT DOWN', risk: 'A CURSE', do: O('IT BLINKS FIRST. IT LEAVES SOMETHING SHARP BEHIND.', { relic: 'tooth', curse: 'pale_mark' }) },
      { label: 'BREAK IT', cost: { hp: 10 }, do: O('SEVEN YEARS OF SOMETHING. BUT THE SMILE IS GONE.', { embers: 50 }) },
    ] },
  { id: 'lost_child', title: 'THE LOST CHILD', acts: [1], tags: ['freed', 'heal'], art: art('child', 'night'),
    text: 'A HUSHED CHILD SITS ON A DOORSTEP, HOLDING A DOOR KEY. IT POINTS DOWN THE STREET.',
    choices: [
      { label: 'WALK THEM HOME', do: O('THE DOOR OPENS. SOMEONE INSIDE GASPS, AND WEEPS, AND SPEAKS.', { freed: 2, embers: 30 }) },
      { label: 'GIVE THEM A TONIC', cost: { tonic: 1 }, do: O('COLOUR COMES BACK TO THEIR CHEEKS. THEY HUM A TUNE.', { freed: 1, boon: 'offer' }) },
      { label: 'TAKE THE KEY', risk: 'A CURSE', do: O('THEY DO NOT CRY. THAT IS WORSE.', { embers: 50, curse: 'hungry_dark' }) },
    ] },
  { id: 'bellfounder_apprentice', title: 'THE APPRENTICE', acts: [1], near: ['foundry'], tags: ['boon'], art: art('forge', 'amber'),
    text: 'A BOY WITH A BROKEN HAMMER SITS BY A COLD MOULD. "THE MASTER SAID I COULD MAKE A BELL."',
    choices: [
      { label: 'HELP HIM POUR', cost: { hp: 12 }, do: O('A TINY BELL, BADLY CAST. IT RINGS ANYWAY.', { boon: 'offer' }) },
      { label: 'GIVE HIM EMBERS', cost: { embers: 40 }, do: O('HE FEEDS THE FORGE AND GRINS.', { freed: 1, rerolls: 1 }) },
      { label: 'TELL HIM THE TRUTH', do: O('"THE MASTER LIED." HE NODS, LIKE HE KNEW.', { lore: 'lore.founder' }) },
    ] },
  { id: 'hushed_procession', title: 'THE PROCESSION', acts: [1, 2], tags: ['freed', 'heal'], art: art('procession', 'night'),
    text: 'A LINE OF HUSHED WALKS SLOWLY BY, EACH CARRYING AN UNLIT CANDLE.',
    choices: [
      { label: 'LIGHT THEIR CANDLES', cost: { embers: 30 }, do: O('ONE BY ONE THEY LIGHT. ONE BY ONE THEY WHISPER THANKS.', { freed: 3 }) },
      { label: 'WALK WITH THEM', do: O('THEIR QUIET IS RESTFUL. YOU FEEL BETTER FOR IT.', { hpPct: 0.3 }) },
      { label: 'BOW AND LET THEM PASS', do: O('THE LAST ONE BOWS BACK.') },
    ] },
  // ======================================================== ACT II: BEYOND THE WALLS
  { id: 'frozen_pilgrims', title: 'THE FROZEN PILGRIMS', acts: [2], near: ['frostmarch'], tags: ['freed', 'relic'], art: art('snow', 'frost'),
    text: 'PILGRIMS STAND FROZEN ON THE ROAD NORTH, HANDS CUPPED TO THEIR EARS, LISTENING FOR A BELL.',
    choices: [
      { label: 'WARM THEM', cost: { hp: 20 }, do: O('THE ICE CRACKS. THEY HEAR IT AT LAST: THE TOLL, FAR AWAY.', { freed: 3, embers: 60 }) },
      { label: 'TAKE THEIR BOOTS', risk: 'A CURSE', do: O('GOOD BOOTS. THEY WILL NOT NEED THEM.', { relic: 'silk', curse: 'frost_in_the_veins' }) },
      { label: 'LEAVE THEM LISTENING', do: O('MAYBE THEY WILL HEAR IT.') },
    ] },
  { id: 'hoarfrost_bargain', title: 'THE HOARFROST BARGAIN', acts: [2], near: ['frostmarch'], tags: ['boon', 'hp'], art: art('snow', 'frost'),
    text: 'A VOICE IN THE BLIZZARD OFFERS A TRADE: "YOUR WARMTH FOR MY STRENGTH."',
    choices: [
      { label: 'TRADE YOUR WARMTH', cost: { hp: 10 }, do: O('YOU WILL NEVER QUITE BE WARM AGAIN. BUT YOU ARE STRONGER.', { maxHp: -10, boon: 'offer', rerolls: 1 }) },
      { label: 'TRADE A TONIC', cost: { tonic: 1 }, do: O('IT DRINKS IT DOWN. "FAIR."', { boon: 'offer' }) },
      { label: 'REFUSE', do: O('THE BLIZZARD LAUGHS, AND MOVES ON.') },
    ] },
  { id: 'bell_in_the_snow', title: 'A BELL IN THE SNOW', acts: [2], tags: ['heal', 'embers'], art: art('bell', 'frost'),
    text: 'THE RIM OF A BURIED BELL BREAKS THE SNOW. IT IS WARM TO THE TOUCH.',
    choices: [
      { label: 'DIG IT OUT', do: O('UNDER IT: THE EMBERS OF A HUNDRED TRAVELLERS\' FIRES.', { embers: 70 }) },
      { label: 'RING IT', risk: 'SOMETHING MAY HEAR', roll: [W(2, 'THE NOTE WASHES OVER YOU LIKE A WARM WIND.', { hpPct: 0.5 }), W(1, 'THE NOTE CARRIES. SOMETHING HOWLS BACK.', { hpPct: 0.3, fight: { foes: ['frostwolf', 'frostwolf', 'frostwolf'], element: 'frost' } })] },
    ] },
  { id: 'buried_market', title: 'THE BURIED MARKET', acts: [2], near: ['ashdunes'], tags: ['shop', 'lore'], art: art('dunes', 'sand'),
    text: 'A STALL STICKS UP OUT OF THE SAND. ITS KEEPER IS A HUSK WHO SELLS MEMORIES BY THE CUP.',
    choices: [
      { label: 'BUY A MEMORY', cost: { embers: 40 }, do: O('YOU REMEMBER SOMETHING THAT WAS NOT YOURS. IT HELPS.', { memory: 'random', boon: 'offer' }) },
      { label: 'SELL ONE', risk: 'A CURSE', do: O('YOU FORGET SOMETHING. YOU WILL NEVER KNOW WHAT.', { embers: 110, curse: 'borrowed_voice' }) },
      { label: 'ASK ABOUT THE CITY', do: O('"ONE BELL. ONE NIGHT. ALL SAND."', { lore: 'lore.oldcity' }) },
    ] },
  { id: 'glass_sand', title: 'THE GLASS FIELD', acts: [2], near: ['ashdunes'], tags: ['relic'], art: art('dunes', 'forge'),
    text: 'LIGHTNING TURNED THE DUNES TO GLASS HERE. SOMETHING BRIGHT IS TRAPPED IN THE MIDDLE OF IT.',
    choices: [
      { label: 'WALK THE GLASS', cost: { hp: 22 }, do: O('YOUR FEET BLEED. THE THING IN THE GLASS IS A STORM, CAUGHT IN A BOTTLE.', { relic: 'storm' }) },
      { label: 'SHATTER IT FROM HERE', do: O('THE GLASS SINGS AS IT BREAKS. SHARDS OF EMBER.', { embers: 50 }) },
    ] },
  { id: 'abbots_prayer', title: 'THE ABBOT\'S PRAYER', acts: [2], near: ['catacombs'], tags: ['heal', 'curse'], art: art('tomb', 'bone'),
    text: 'THE DEAD KNEEL IN ROWS. A SPACE IS LEFT FOR YOU AMONG THEM.',
    choices: [
      { label: 'KNEEL AND PRAY', risk: 'A CURSE', do: O('IT IS SO PEACEFUL. IT IS HARD TO STAND AGAIN.', { hpPct: 0.6, curse: 'frost_in_the_veins' }) },
      { label: 'INTERRUPT THE PRAYER', risk: 'A FIGHT', do: O('THE ROWS RISE AS ONE.', { fight: { foes: ['skeleton', 'skeleton', 'bonecaster', 'skeleton'], element: 'void' }, embers: 80 }) },
      { label: 'PRAY FOR THEM INSTEAD', do: O('ONE OF THEM STOPS PRAYING, AND RESTS.', { freed: 2 }) },
    ] },
  { id: 'saint_sarcophagus', title: 'THE SAINT\'S SARCOPHAGUS', acts: [2], near: ['catacombs'], tags: ['relic', 'curse'], art: art('tomb', 'gild'),
    text: 'A STONE COFFIN, ITS LID CARVED WITH A SAINT HOLDING A BELL. THE LID IS ALREADY AJAR.',
    choices: [
      { label: 'OPEN IT', risk: 'A CURSE', roll: [W(2, 'A FINGER BONE, STILL WARM. IT WANTS TO HELP.', { relic: 'bone' }), W(1, 'THE SAINT IS NOT RESTING. HER BLESSING IS A HEAVY ONE.', { relic: 'bone', curse: 'cracked_bell' })] },
      { label: 'LEAVE AN OFFERING', cost: { embers: 40 }, do: O('THE LID SLIDES SHUT. A WARMTH FOLLOWS YOU.', { maxHp: 10 }) },
    ] },
  { id: 'chained_angel', title: 'THE CHAINED ANGEL', acts: [2, 3], near: ['abyss', 'empyrean'], tags: ['boon', 'relic'], art: art('abyss', 'gild'),
    text: 'A HOLLOW ANGEL HANGS IN CHAINS OVER THE PIT. "FREE ME," IT SAYS, IN YOUR MOTHER\'S VOICE.',
    choices: [
      { label: 'BREAK THE CHAINS', cost: { hp: 25 }, do: O('IT RISES, AND TOUCHES YOUR BROW WITH A COLD LIGHT.', { boon: { res: 'dawn' } }) },
      { label: 'TAKE ITS HALO', risk: 'A CURSE', do: O('IT DOES NOT FIGHT YOU. IT ONLY WATCHES.', { relic: 'glass', curse: 'hungry_dark' }) },
      { label: 'ASK IT WHAT IT IS', do: O('"A SPOKE OF THE WHEEL. A BROKEN ONE."', { lore: 'lore.wheel' }) },
    ] },
  { id: 'archon_bargain', title: 'THE ARCHON\'S CONTRACT', acts: [2], near: ['abyss'], tags: ['curse', 'boon'], art: art('letter', 'void'),
    text: 'A CONTRACT FLOATS IN THE AIR, ALREADY SIGNED BY EVERYONE YOU HAVE EVER MET. EXCEPT YOU.',
    choices: [
      { label: 'SIGN IT', risk: 'A CURSE', do: O('THE INK IS COLD. THE TERMS ARE GENEROUS.', { curse: 'leaden_tongue', rerolls: 2, boon: 'offer' }) },
      { label: 'TEAR IT UP', do: O('EVERY NAME ON IT SIGHS WITH RELIEF.', { freed: 4 }) },
    ] },
  { id: 'world_edge_well', title: 'THE WELL AT THE EDGE', acts: [2, 3], tags: ['heal', 'lore'], art: art('well', 'void'),
    text: 'A WELL WITH NO BOTTOM. AT THE VERY BOTTOM, A STAR.',
    choices: [
      { label: 'FILL A FLASK', cost: { hp: 10 }, do: O('THE WATER GLOWS. IT WILL KEEP.', { tonics: 1 }) },
      { label: 'LOOK DOWN', do: O('THE STAR LOOKS BACK. IT IS VERY TIRED.', { lore: 'lore.voice' }) },
    ] },
  { id: 'black_sun_shrine', title: 'THE BLACK SUN SHRINE', acts: [2], near: ['ashdunes', 'abyss'], tags: ['boon', 'curse'], art: art('shrine', 'void'),
    text: 'A SHRINE TO A BLACK SUN. ITS PRIEST IS BONES IN A ROBE, STILL HOLDING OUT A BOWL.',
    choices: [
      { label: 'OFFER EMBERS', cost: { embers: 60 }, do: O('THE BLACK SUN ACCEPTS. A COLD POWER SETTLES ON YOU.', { boon: { res: 'silence' } }) },
      { label: 'OFFER BLOOD', cost: { hp: 18 }, do: O('THE BOWL FILLS. SO DOES SOMETHING IN YOU.', { boon: { res: 'crimson' } }) },
      { label: 'TIP THE BOWL OVER', do: O('THE PRIEST COLLAPSES INTO DUST. THE BOWL WAS FULL OF EMBERS.', { embers: 45 }) },
    ] },
  // ======================================================== ACT III: THE WHEEL
  { id: 'drowned_bells', title: 'THE DROWNED BELLS', acts: [3], near: ['marsh'], tags: ['lore', 'freed', 'quest'], art: art('marsh', 'bog'),
    text: 'BELLS STICK UP OUT OF THE MARSH LIKE GRAVESTONES. NOW AND THEN ONE RINGS, UNDER THE WATER.',
    choices: [
      { label: 'LISTEN', do: O('EVERY BELL IS SAYING THE SAME WORD. IT IS YOUR NAME.', { lore: 'lore.drowned' }) },
      { label: 'RAISE ONE', cost: { hp: 20 }, do: O('IT RINGS IN THE AIR. VOICES POUR OUT OF IT.', { freed: 4, embers: 60 }) },
      { label: 'SEARCH FOR A TONGUE', do: O('A CLAPPER LIES IN THE MUD, CARVED WITH A HARBOUR\'S MARK.', { hint: 'q.hollis.2' }), needs: { notHero: 'hollis' } },
    ] },
  { id: 'bog_wedding', title: 'THE BOG WEDDING', acts: [3], near: ['marsh'], tags: ['boon', 'hp'], art: art('marsh', 'bog'),
    text: 'THE DROWNED ARE HOLDING A WEDDING ON A RAFT OF BELLS. THE BRIDE IS WAITING FOR HER PARTNER.',
    choices: [
      { label: 'DANCE WITH THE BRIDE', cost: { hp: 20 }, do: O('HER HANDS ARE COLD. HER GIFT IS NOT.', { boon: 'offer', maxHp: 5 }) },
      { label: 'GIVE A TONIC AS A GIFT', cost: { tonic: 1 }, do: O('THE GUESTS DRINK TO YOU. THE MARSH IS KIND FOR A WHILE.', { hpPct: 0.5, freed: 2 }) },
      { label: 'OBJECT', risk: 'A FIGHT', do: O('THE GUESTS DO NOT TAKE IT WELL.', { fight: { foes: ['drowned', 'drowned', 'leech', 'leech'], element: 'poison' }, embers: 90 }) },
    ] },
  { id: 'clockmakers_offer', title: 'THE CLOCKMAKER\'S OFFER', acts: [3], near: ['spire'], tags: ['heal', 'curse'], art: art('clock', 'brass'),
    text: 'A LITTLE BRASS MAN WITH A KEY IN HIS BACK. "I CAN WIND YOU BACK, OR WIND YOU UP."',
    choices: [
      { label: 'WIND ME BACK', cost: { embers: 70 }, do: O('YOUR WOUNDS CLOSE IN REVERSE. IT IS AN ODD FEELING.', { hpPct: 1 }) },
      { label: 'WIND ME UP', risk: 'A CURSE', do: O('TICK. TICK. TICK. FASTER.', { curse: 'oath_of_haste', boon: 'offer' }) },
      { label: 'ASK THE TIME', do: O('"THE LAST HOUR. IT IS ALWAYS THE LAST HOUR HERE."', { lore: 'lore.clock' }) },
    ] },
  { id: 'singing_gear', title: 'THE GEAR THAT SINGS', acts: [3], near: ['spire'], tags: ['relic'], art: art('clock', 'brass'),
    text: 'ONE GEAR AMONG THOUSANDS TURNS THE WRONG WAY. IT SINGS AS IT TURNS.',
    choices: [
      { label: 'PRY IT LOOSE', cost: { hp: 15 }, do: O('THE MACHINE SHUDDERS. THE GEAR IS A CLAPPER, FROM SOME OLD BELL.', { relic: 'clapper' }) },
      { label: 'OIL IT', do: O('IT SINGS LOUDER. THE OTHER GEARS SLOW TO LISTEN.', { embers: 60 }) },
    ] },
  { id: 'door_of_light', title: 'A DOOR OF LIGHT', acts: [3], near: ['empyrean'], tags: ['boon', 'lore'], art: art('heaven', 'heaven'),
    text: 'A DOOR STANDS ALONE ON A CLOUD. LIGHT LEAKS FROM THE KEYHOLE. SOMEONE BEHIND IT IS SINGING.',
    choices: [
      { label: 'GO THROUGH', risk: 'IT MAY BURN', roll: [W(3, 'THE SINGER GIVES YOU A VERSE OF THE SONG.', { boon: 'offer' }), W(1, 'THE LIGHT IS TOO MUCH.', { hp: -25, boon: 'offer' })] },
      { label: 'KNOCK', do: O('THE SINGING STOPS. "NOT YET," SAYS THE VOICE. "BUT SOON."', { lore: 'lore.voice' }) },
    ] },
  { id: 'voice_whispers', title: 'THE VOICE WHISPERS', acts: [3], tags: ['lore', 'heal'], art: art('heaven', 'gild'),
    text: 'FOR A MOMENT THE WORLD STOPS, AND SOMETHING ENORMOUS AND KIND SPEAKS FROM INSIDE YOUR CHEST.',
    choices: [
      { label: 'LISTEN', do: O('"I AM SO TIRED," IT SAYS. "BUT YOU CAME ALL THIS WAY."', { lore: 'lore.voice', hpPct: 0.4 }) },
      { label: 'ANSWER', do: O('YOU TELL IT ABOUT THE CITY. IT REMEMBERS A FRIEND THROUGH YOU.', { memory: 'random', boon: 'offer' }) },
    ] },
  { id: 'feathers_falling', title: 'FEATHERS FALLING', acts: [3], near: ['empyrean'], tags: ['embers', 'heal'], art: art('heaven', 'heaven'),
    text: 'WHITE FEATHERS FALL FROM AN EMPTY SKY. EACH ONE IS WARM, AND HUMS.',
    choices: [
      { label: 'GATHER THEM', do: O('A BUNDLE OF HUMMING WARMTH.', { embers: 80 }) },
      { label: 'LET THEM SETTLE ON YOU', do: O('THEY SINK INTO YOUR WOUNDS.', { hpPct: 0.45 }) },
    ] },
  // ======================================================== ANY ACT
  { id: 'shadow_merchant', title: 'THE MERCHANT OF SHADOWS', acts: [1, 2, 3], weight: 0.8, tags: ['shop', 'cleanse'], art: art('merchant', 'void'),
    text: 'A MERCHANT WITHOUT A FACE SPREADS HIS CLOAK. ON IT, THINGS THAT ARE NOT QUITE THERE.',
    choices: [
      { label: 'BUY A CLEANSING', cost: { embers: 70 }, do: O('HE PULLS SOMETHING DARK OUT OF YOUR SHADOW AND POCKETS IT.', { uncurse: true }) },
      { label: 'BUY A RELIC', cost: { embers: 110 }, do: O('HE WRAPS IT IN NOTHING AND HANDS IT OVER.', { relic: 'random' }) },
      { label: 'SELL HIM YOUR SHADOW', risk: 'A CURSE', do: O('IT FEELS LIGHTER WITHOUT IT. TOO LIGHT.', { embers: 120, curse: 'drowned_lungs' }) },
    ] },
  { id: 'warden_memory', title: 'A WARDEN\'S MEMORY', acts: [1, 2, 3], weight: 0.8, tags: ['heal', 'lore'], art: art('shrine', 'amber'),
    text: 'AN OLD LAMP OF THE WARDENS STILL BURNS IN A NICHE. IN ITS FLAME, A FACE YOU KNOW.',
    choices: [
      { label: 'LOOK INTO THE FLAME', do: O('A MEMORY, CLEAR AS DAY.', { memory: 'random', hpPct: 0.25 }) },
      { label: 'TAKE A LIGHT FROM IT', do: O('A LITTLE FLAME TO CARRY.', { tonics: 1 }) },
    ] },
  { id: 'last_lamplighter_shrine', title: 'A LAMPLIGHTERS\' SHRINE', acts: [1, 2, 3], weight: 0.7, tags: ['heal', 'boon'], art: art('shrine', 'amber'),
    text: 'A SMALL SHRINE OF THE LAMPLIGHTERS, ITS WICK STILL TRIMMED. SOMEONE KEEPS IT.',
    choices: [
      { label: 'REST', do: O('YOU SLEEP AN HOUR, AND DREAM OF DAWN.', { hpPct: 0.5 }) },
      { label: 'FEED IT EMBERS', cost: { embers: 50 }, do: O('THE FLAME RISES, AND SO DOES SOMETHING IN YOU.', { boon: 'upgrade' }) },
    ] },
  { id: 'the_crow', title: 'THE CROW', acts: [1, 2, 3], weight: 0.8, tags: ['embers'], art: art('crow', 'night'),
    text: 'A CROW LANDS ON YOUR SHOULDER WITH SOMETHING SHINY IN ITS BEAK. IT WANTS A TRADE.',
    choices: [
      { label: 'TRADE AN EMBER', cost: { embers: 15 }, roll: [W(3, 'A RING. IT IS WORTH MUCH MORE.', { embers: 60 }), W(1, 'A BUTTON. THE CROW LAUGHS AT YOU.', {})] },
      { label: 'SHOO IT AWAY', roll: [W(1, 'IT TAKES ONE OF YOUR EMBERS ON THE WAY.', { embers: -20 }), W(1, 'IT DROPS THE SHINY THING AS IT GOES.', { embers: 35 })] },
    ] },
  { id: 'wounded_warden', title: 'A WOUNDED OATH-SWORN', acts: [1, 2], weight: 0.8, tags: ['freed', 'boon'], art: art('alley', 'blood'),
    text: 'ONE OF THE OATH-SWORN LIES AGAINST A WALL, HIS SHIELD SPLIT. "FINISH IT," HE SAYS.',
    choices: [
      { label: 'HELP HIM UP', cost: { tonic: 1 }, do: O('"WHY?" HE ASKS. HE TAKES OFF HIS OATH-RING AND GIVES IT TO YOU.', { boon: 'offer', freed: 1 }) },
      { label: 'TAKE HIS SHIELD', do: O('IT IS STILL GOOD IRON.', { relic: 'psalter' }) },
      { label: 'LEAVE HIM', do: O('HE CALLS AFTER YOU. YOU DO NOT HEAR WHAT.') },
    ] },
  { id: 'gambling_dead', title: 'THE DEAD AT DICE', acts: [1, 2, 3], weight: 0.7, tags: ['embers'], art: art('tomb', 'bone'),
    text: 'THREE SKELETONS PLAY AT DICE ON A COFFIN LID. THEY MAKE ROOM FOR A FOURTH.',
    choices: [
      { label: 'PLAY A ROUND', cost: { embers: 40 }, roll: [W(1, 'DOUBLE SIX. THEY CLATTER IN APPLAUSE.', { embers: 110 }), W(1, 'SNAKE EYES. THEY KEEP YOUR STAKE, POLITELY.', {})] },
      { label: 'PLAY FOR BLOOD', cost: { hp: 15 }, roll: [W(1, 'YOU WIN. THEY PAY IN SOMETHING OLDER THAN EMBERS.', { boon: 'offer' }), W(1, 'YOU LOSE. THEY ARE KIND ABOUT IT.', {})] },
      { label: 'DECLINE', do: O('THEY SHRUG. IT TAKES A WHILE, WITH NO MUSCLES.') },
    ] },
];

// ------------------------------------------------------------------ the quest steps' events (questNodes play them)
const Q = (id, quest, title, sceneArt, text, choices) => ({ id, title, quest, kind: 'quest', acts: [1, 2, 3], weight: 0, tags: ['quest'], art: sceneArt, text, choices });
const QUEST_EVENTS = [
  Q('q_vesper_1', 'vesper', 'THE HUMMING IN THE FOG', art('pier', 'sea'), 'AT THE END OF THE PIER A SMALL HUSHED SITS HUMMING, A TOY BELL IN ITS FIST.', [
    { label: 'ASK FOR THE BELL', do: O('IT HOLDS IT OUT. ON THE RIBBON, IN A CHILD\'S HAND: TAM.', { quest: 'vesper', freed: 1 }) },
    { label: 'SIT AND HUM WITH IT', do: O('AFTER A LONG WHILE, IT GIVES YOU THE BELL, AND SMILES.', { quest: 'vesper', hpPct: 0.2 }) },
  ]),
  Q('q_vesper_2', 'vesper', 'A RED RIBBON ON THE ROOFS', art('roof', 'night'), 'VESPER DROPS FROM THE ROOFS, BOLT TO THE STRING. "WHERE DID YOU GET THAT BELL?"', [
    { label: 'GIVE IT TO HER', do: O('SHE HOLDS IT TO HER CHEST. "WHEN THE WHEEL TURNS," SHE SAYS, "I\'LL BE THERE."', { quest: 'vesper', memory: 'huntress' }) },
    { label: 'TELL HER WHERE TAM SAT', do: O('SHE IS GONE BEFORE YOU FINISH. LATER, A BOLT WITH A RED RIBBON: A PROMISE.', { quest: 'vesper', embers: 40 }) },
  ]),
  Q('q_bram_1', 'bram', 'THE MOULD-KEEPERS', art('forge', 'forge'), 'THE LAST MOULD OF THE SILENT BELL, GUARDED BY THE FURNACE HANDS. BRAM\'S MARK IS ON IT.', [
    { label: 'BREAK IT', risk: 'A FIGHT', do: O('THE MOULD CRACKS IN TWO. INSIDE, A NOTE TO BRAM: "THE FIRST PATTERN IS IN THE SAND."', { fight: { foes: ['sentinel', 'bomber', 'bomber'], element: 'fire' }, quest: 'bram' }) },
    { label: 'STEAL IT AWAY', cost: { hp: 20 }, do: O('IT IS HEAVIER THAN GUILT. ON ITS BASE: "THE FIRST PATTERN IS IN THE SAND."', { quest: 'bram' }) },
  ]),
  Q('q_bram_2', 'bram', 'THE FIRST PATTERN', art('dunes', 'sand'), 'BRAM KNEELS OVER THE OLD SKETCH. "THIS IS HOW A BELL SHOULD BE. NOT WHAT I MADE."', [
    { label: 'HAND HIM THE HAMMER', do: O('HE SMASHES THE MOULD TO POWDER, AND LAUGHS FOR THE FIRST TIME IN A HUNDRED NIGHTS.', { quest: 'bram', memory: 'bellbreaker' }) },
    { label: 'KEEP THE PATTERN', do: O('"GOOD. SOMEONE SHOULD REMEMBER HOW." HE WILL COME WHEN YOU NEED HIM.', { quest: 'bram', boon: 'offer' }) },
  ]),
  Q('q_kestrel_1', 'kestrel', 'NINE HUNDRED AND ONE', art('cage', 'blood'), 'A CELL DOOR WITHOUT A KEYHOLE. THE TALLY MARKS GO ON ONTO THE DOOR ITSELF.', [
    { label: 'COUNT THE MARKS', do: O('NINE HUNDRED AND ONE NIGHTS. THE LAST MARK IS FRESH. SOMEONE IS STILL INSIDE.', { quest: 'kestrel' }) },
    { label: 'PRY AT THE DOOR', cost: { hp: 12 }, do: O('IT WILL NOT MOVE. A VOICE INSIDE: "ONLY HIS KEY. THE FILED ONE."', { quest: 'kestrel' }) },
  ]),
  Q('q_kestrel_2', 'kestrel', 'THE FILED KEY', art('cage', 'night'), 'KESTREL IS ALREADY THERE, KNIVES OUT, AT THE CELL. "MY FATHER\'S LAST PRISONER. GIVE ME THE KEY."', [
    { label: 'GIVE HER THE KEY', do: O('THE CELL IS EMPTY BUT FOR A CHILD\'S DRAWING: HER, AND A DOOR, OPEN. SHE WILL FIGHT BESIDE YOU.', { quest: 'kestrel', memory: 'kestrel' }) },
    { label: 'OPEN IT TOGETHER', risk: 'A FIGHT', do: O('THE GUARDS HE LEFT BEHIND DO NOT LAST LONG AGAINST THE TWO OF YOU.', { fight: { foes: ['warden', 'crossbow', 'crossbow'], element: 'blood' }, quest: 'kestrel' }) },
  ]),
  Q('q_carmine_1', 'carmine', 'A LETTER HALF-BURNED', art('letter', 'gild'), 'THE REST OF ORRIN\'S LETTER IS TUCKED IN A HYMNAL. "...TELL THEM I WAS WRONG ABOUT THE SILENCE. OR RIGHT."', [
    { label: 'KEEP READING', do: O('THE LAST PAGE IS MISSING. "WITH THE BELL," SAYS A NOTE IN THE MARGIN.', { quest: 'carmine', lore: 'lore.wardens' }) },
    { label: 'FOLD IT AWAY', do: O('CARMINE SHOULD READ THIS. YOU WILL FIND THEM.', { quest: 'carmine' }) },
  ]),
  Q('q_carmine_2', 'carmine', 'THE LAST PAGE', art('bell', 'night'), 'CARMINE STANDS UNDER THE CRACKED BELL WITH THE LAST PAGE. "HE LOVED US. THAT WAS THE TROUBLE."', [
    { label: 'STAND WITH THEM', do: O('THEY BURN THE PAGE. "WHEN THE WHEEL TURNS, I\'LL BE THERE. FOR HIM, AND FOR YOU."', { quest: 'carmine', memory: 'warden' }) },
    { label: 'GIVE THEM TIME', do: O('THEY NOD, AND WALK INTO THE DARK. THEY WILL COME.', { quest: 'carmine', hpPct: 0.3 }) },
  ]),
  Q('q_ash_1', 'ash', 'THE FIRST LAMP', art('lamp', 'amber'), 'THE FIRST OF THE SEVEN LAMPS, DARK, IN A NICHE BY THE CANAL.', [
    { label: 'LIGHT IT', cost: { embers: 30 }, do: O('IT CATCHES. FAR AWAY, AT THE HAVEN, SISTER ASH LOOKS UP.', { quest: 'ash' }) },
    { label: 'LIGHT IT FROM YOUR OWN LIFE', cost: { hp: 15 }, do: O('IT CATCHES ON YOUR WARMTH. IT BURNS BRIGHTER FOR IT.', { quest: 'ash', boon: 'offer' }) },
  ]),
  Q('q_ash_2', 'ash', 'THE LAMP AMONG THE DEAD', art('tomb', 'amber'), 'A LAMPLIGHTER\'S BONES STILL HOLD THEIR LAMP UP TO THE DARK.', [
    { label: 'TAKE THE LAMP GENTLY', do: O('THE BONES LET GO. THE LAMP LIGHTS ITSELF.', { quest: 'ash', freed: 1 }) },
    { label: 'LIGHT IT WHERE IT IS', do: O('THE BONES SEEM TO STAND STRAIGHTER.', { quest: 'ash', lore: 'lore.lamplighters' }) },
  ]),
  Q('q_ash_3', 'ash', 'THE LAMP IN THE MARSH', art('marsh', 'amber'), 'THE LAST LAMP OF THE ORDER, ON A POST IN THE BLACK WATER. SISTER ASH IS WADING TOWARD IT.', [
    { label: 'GO WITH HER', risk: 'A FIGHT', do: O('THE WISPS FALL BACK. SHE LIGHTS IT. "SEVEN," SHE SAYS. "NOW I CAN CARRY THEM ALL."', { fight: { foes: ['wisp', 'wisp', 'marshwitch'], element: 'holy' }, quest: 'ash', memory: 'lamplighter' }) },
    { label: 'HOLD THE LIGHT FOR HER', do: O('SHE LIGHTS IT FROM YOUR LAMP. "WHEN THE WHEEL TURNS, LOOK FOR MY LIGHT."', { quest: 'ash' }) },
  ]),
  Q('q_hollis_1', 'hollis', 'THE BELL UNDER THE WATER', art('bell', 'sea'), 'THE HARBOUR BELL LIES ON THE SEABED, TONGUELESS. THE DROWNED SAY THE CHOIR TOOK IT EAST.', [
    { label: 'DIVE AND MARK IT', cost: { hp: 15 }, do: O('YOU TIE A RED CLOTH TO ITS CROWN. HOLLIS WILL KNOW IT.', { quest: 'hollis' }) },
    { label: 'ASK THE DROWNED', do: O('"EAST," THEY SAY. "WHERE THE BELLS GO TO DROWN."', { quest: 'hollis', lore: 'lore.drowned' }) },
  ]),
  Q('q_hollis_2', 'hollis', 'THE TONGUE IN THE ICE', art('marsh', 'frost'), 'HOLLIS IS HERE, CHIPPING AT THE ICE WITH HIS ANCHOR. "...SHE HAS BEEN QUIET SO LONG."', [
    { label: 'HELP HIM DIG', cost: { hp: 10 }, do: O('THE CLAPPER COMES FREE. HE HOLDS IT LIKE A CHILD. "...I WILL COME. WHEN IT TURNS."', { quest: 'hollis', memory: 'hollis' }) },
    { label: 'RING IT AGAINST THE ICE', do: O('THE NOTE CARRIES ALL THE WAY HOME. HOLLIS WEEPS, AND NODS.', { quest: 'hollis', freed: 2 }) },
  ]),
  Q('q_wren_1', 'wren', 'THE SINGER IN THE DARK', art('choir', 'void'), 'THE BACKWARDS SINGER IS A GIRL IN A CHOIR ROBE, BLINDFOLDED. "MOTHER WREN TAUGHT ME. SHE TAUGHT ME WRONG."', [
    { label: 'UNTIE THE BLINDFOLD', do: O('SHE SEES YOU, AND STOPS SINGING. "THE LAST VERSE IS BELOW. TELL HER."', { quest: 'wren', freed: 1 }) },
    { label: 'SING IT FORWARDS', do: O('THE HYMN TURNS ROUND. SO DOES SHE. "BELOW," SHE WHISPERS. "THE LAST VERSE."', { quest: 'wren' }) },
  ]),
  Q('q_wren_2', 'wren', 'THE LAST VERSE', art('crypt', 'void'), 'MOTHER WREN STANDS BEFORE THE LAST VERSE, CUT IN STONE. "IF I SING IT, THE CHOIR LOSES ITS SONG. AND I LOSE MINE."', [
    { label: 'SING IT WITH HER', risk: 'A FIGHT', do: O('THE CHOIR COMES TO STOP YOU. THE VERSE IS SUNG. "WHEN THE WHEEL TURNS," SHE SAYS, "I WILL SING AGAINST IT."', { fight: { foes: ['bonecaster', 'cryptspider', 'chanter'], element: 'void' }, quest: 'wren', memory: 'wren' }) },
    { label: 'TELL HER IT IS HERS TO SING', do: O('SHE SINGS IT ALONE. HER VOICE CRACKS ON THE LAST NOTE. IT HOLDS.', { quest: 'wren' }) },
  ]),
];

export const EVENTS = Object.fromEntries([...DECK, ...QUEST_EVENTS].map((e) => [e.id, { kind: 'event', weight: 1, acts: [1, 2, 3], tags: [], ...e }]));

// ------------------------------------------------------------------ dealing a card
const asRng = (rng) => (typeof rng === 'function' ? rng : rng && typeof rng.next === 'function' ? () => rng.next() : Math.random);
const act = (run) => (run && run.act) || 1;
const scale = (cost, a) => cost && { ...cost, ...(cost.embers ? { embers: Math.round((cost.embers * ACT_K[a]) / 5) * 5 } : {}) };
function affordable(run, cost) {
  if (!cost || !run) return true;
  if (cost.embers && (run.embers || 0) < cost.embers) return false;
  if (cost.tonic && (run.tonics || 0) < cost.tonic) return false;
  if (cost.hp && (run.hp ?? 1e9) <= cost.hp) return false; // never pay with your life
  return true;
}
const choiceOk = (run, c) => !(c.needs && c.needs.notHero && run && run.hero === c.needs.notHero);

// The card as dealt in this run: costs in this act's embers, unaffordable choices marked (E greys them out).
export function dealEvent(run, id) {
  const ev = EVENTS[id]; if (!ev) return null; const a = act(run);
  // every choice keeps its index (resolveEvent takes the same index); one the warden cannot take is greyed out
  const choices = ev.choices.map((c) => { const cost = scale(c.cost, a); const mine = choiceOk(run, c); return { label: c.label, cost, risk: mine ? c.risk : 'NOT FOR YOU', tags: c.tags, disabled: !mine || !affordable(run, cost) }; });
  return { id: ev.id, title: ev.title, art: ev.art, text: ev.text, kind: ev.kind, quest: ev.quest, choices };
}

export function pickEvent(run, meta, rng, ctx = {}) {
  const R = asRng(rng); const a = ctx.act || act(run); const seen = new Set((run && run.flags && run.flags.events) || []);
  const hp = run && run.maxHp ? run.hp / run.maxHp : 1; const purse = (run && run.embers) || 0; const cursed = !!(run && run.curses && run.curses.length);
  const active = (run && run.quest && run.quest.active) || [];
  const cand = [], w = [];
  for (const ev of Object.values(EVENTS)) {
    if (ev.kind === 'quest' || !ev.acts.includes(a) || seen.has(ev.id)) continue;
    // an event that gives a hint is only worth dealing while that hint is still to be found
    const hints = ev.choices.map((c) => c.do && c.do.changes && c.do.changes.hint).filter(Boolean);
    if (hints.length && meta && meta.hints && hints.every((h) => meta.hints[h])) continue;
    let k = ev.weight;
    if (hp < 0.4 && ev.tags.includes('heal')) k *= 2.5;
    if (purse > 150 * ACT_K[a] && ev.tags.includes('shop')) k *= 2;
    if (cursed && (ev.tags.includes('cleanse') || ev.choices.some((c) => c.do && c.do.changes.uncurse))) k *= 1.8;
    if (ev.quest && active.includes(ev.quest)) k *= 2.5;
    if (ctx.area && ev.near && ev.near.includes(ctx.area)) k *= 2;
    if (ev.id === 'cursed_lamp') k *= cursed ? 0.5 : 1;
    cand.push(ev); w.push(k);
  }
  if (!cand.length) return dealEvent(run, 'warden_memory');
  const tot = w.reduce((x, y) => x + y, 0); let r = R() * tot; let pick = cand[cand.length - 1];
  for (let i = 0; i < cand.length; i++) { r -= w[i]; if (r <= 0) { pick = cand[i]; break; } }
  return dealEvent(run, pick.id);
}

// The outcome of a choice (index into the dealt card's choices). Pure: returns { lines, changes } with the cost
// folded into changes (as negative hp / embers / tonics) and any random part resolved.
export function resolveEvent(run, meta, eventId, choiceIndex, rng) {
  const ev = EVENTS[eventId]; if (!ev) return { lines: [], changes: {} };
  const R = asRng(rng); const a = act(run); const c = ev.choices[choiceIndex]; if (!c || !choiceOk(run, c)) return { lines: ['NOTHING HAPPENS.'], changes: {} };
  let out = c.do;
  if (c.roll) { const tot = c.roll.reduce((s, o) => s + o.w, 0); let r = R() * tot; out = c.roll[c.roll.length - 1]; for (const o of c.roll) { r -= o.w; if (r <= 0) { out = o; break; } } }
  const ch = { ...(out ? out.changes : {}) };
  // embers won scale with the act like embers paid
  if (ch.embers) ch.embers = Math.round((ch.embers * ACT_K[a]) / 5) * 5;
  const cost = scale(c.cost, a);
  if (cost) { if (cost.hp) ch.hp = (ch.hp || 0) - cost.hp; if (cost.embers) ch.embers = (ch.embers || 0) - cost.embers; if (cost.tonic) ch.tonics = (ch.tonics || 0) - cost.tonic; }
  // the random picks are made here so the result shows what was won
  if (ch.relic === 'random') { const owned = new Set((run && run.relics) || []); const pool = RELIC_POOL.filter((r) => !owned.has(r)); ch.relic = pool.length ? pool[Math.floor(R() * pool.length)] : null; if (!ch.relic) { delete ch.relic; ch.embers = (ch.embers || 0) + 60; } }
  if (ch.memory === 'random') { const ids = Object.keys(MEMORIES); const notMine = ids.filter((h) => !(run && run.hero === h)); ch.memory = notMine[Math.floor(R() * notMine.length)]; }
  if (ch.lore === 'random') { const ids = Object.keys(LORE).filter((l) => !(meta && meta.codex && meta.codex.lore && meta.codex.lore[l])); const all = ids.length ? ids : Object.keys(LORE); ch.lore = all[Math.floor(R() * all.length)]; }
  if (ch.curse && run && run.curses && run.curses.includes(ch.curse)) { const free = Object.keys(CURSES).filter((k) => !run.curses.includes(k)); ch.curse = free.length ? free[Math.floor(R() * free.length)] : null; if (!ch.curse) delete ch.curse; }
  const lines = [...(out ? out.lines : [])];
  if (ch.curse) lines.push('CURSE: ' + CURSES[ch.curse].name + ' (' + CURSES[ch.curse].down + ', ' + CURSES[ch.curse].up + ')');
  if (ch.memory) lines.push(MEMORIES[ch.memory]);
  if (ch.lore && LORE[ch.lore]) lines.push(LORE[ch.lore].title + ': ' + LORE[ch.lore].text);
  return { lines, changes: ch };
}
// the relics an event may hand out (heroes.js RELICS ids)
export const RELIC_POOL = ['coin', 'thread', 'clapper', 'rosary', 'tooth', 'bone', 'wick', 'moth', 'glass', 'psalter', 'pearl', 'crown', 'storm', 'silk'];

// Applies an outcome's changes to the run and the save. What only the game can do (a boon pick, a fight) comes
// back in `pending` for game.js to run: { boon: 'offer'|'upgrade'|{res}, fight }. Returns { pending, lines }.
export function applyChanges(run, meta, ch = {}) {
  const pending = {}; const lines = [];
  if (run) {
    if (ch.maxHp) { run.maxHp = Math.max(10, (run.maxHp || 100) + ch.maxHp); run.hp = Math.min(run.maxHp, (run.hp || 0) + Math.max(0, ch.maxHp)); }
    if (ch.hp) run.hp = Math.max(1, Math.min(run.maxHp || 100, (run.hp || 0) + ch.hp));
    if (ch.hpPct) run.hp = Math.min(run.maxHp || 100, (run.hp || 0) + Math.round((run.maxHp || 100) * ch.hpPct));
    if (ch.embers) run.embers = Math.max(0, (run.embers || 0) + ch.embers);
    if (ch.tonics) run.tonics = Math.max(0, (run.tonics || 0) + ch.tonics);
    if (ch.curse) { run.curses = run.curses || []; if (!run.curses.includes(ch.curse)) run.curses.push(ch.curse); }
    if (ch.uncurse && run.curses && run.curses.length) { const gone = run.curses.shift(); lines.push('THE CURSE LIFTS: ' + CURSES[gone].name); }
    if (ch.relic) { run.relics = run.relics || []; if (!run.relics.includes(ch.relic)) run.relics.push(ch.relic); }
    if (ch.rerolls) { run.flags = run.flags || {}; run.flags.rerolls = (run.flags.rerolls || 0) + ch.rerolls; }
    if (ch.freed) { run.stats = run.stats || {}; run.stats.freed = (run.stats.freed || 0) + ch.freed; }
  }
  if (meta) {
    meta.codex = meta.codex || {}; meta.codex.lore = meta.codex.lore || {};
    if (ch.lore) meta.codex.lore[ch.lore] = true;
    if (ch.memory) meta.codex.lore['memory.' + ch.memory] = true;
  }
  if (ch.hint) lines.push(...findHint(meta, run, ch.hint));
  if (ch.quest) { const r = advanceQuest(meta, run, ch.quest); lines.push(...r.lines); if (r.friend) pending.friend = r.friend; }
  if (ch.boon) pending.boon = ch.boon;
  if (ch.fight) pending.fight = ch.fight;
  return { pending, lines };
}
// remember a dealt card so the run never deals it twice
export function noteEvent(run, id) { if (!run) return; run.flags = run.flags || {}; (run.flags.events = run.flags.events || []).push(id); }
export { HINTS, QUESTS };
