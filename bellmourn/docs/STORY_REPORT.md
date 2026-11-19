# BELLMOURN: Narrative Audit

*For a writer or creative director who has not played the game.*

- **Build reviewed:** commit `ef1867e`, branch `claude/loving-faraday-bpstaz`, dated 2026-11-13: "the Haven between districts, abilities fire from the attack, no finishers, bigger touch controls, visible tonic healing".
- **Method:** I read every file that carries story or world, the git history of `js/game/story.js` and the development conversation. Playtime estimates come from the autoplay logs.
- **Changes:** none. The only new file is this report.
- **Canon:** no story document exists outside the code, so the text shipped in the game is the only canon. Where the game is silent, this report says so and invents nothing.

How quotes are marked:

- Quoted in-game text is in CAPITALS, as the game's pixel font shows it.
- Text that lives only in code comments is marked **(comment)**. The player never reads it, although much of it is visible as set dressing.

---

## 1. GAME OVERVIEW

| | |
|---|---|
| **Title** | **BELLMOURN**, with the tagline "RING THE BELL. BRING THE DAWN." on the title screen and in the README. The browser tab reads "Bellmourn". The title screen shows "V2.0". |
| **Genre** | An isometric pixel-art action game for PC and iPhone (landscape). Fights are real-time melee and ranged combat. Every blow is telegraphed by a red shape on the stones; the player reads it and dashes through. A "perfect dodge" slows time. Progression is RPG-light: levels, skill ranks, weapons, relics and a merchant. |
| **Core concept** | A gothic city lies under an endless night because its great bell stopped ringing. The last bell-wardens fight their way through eight districts to the bell tower and ring the bell, and the dawn comes back. |
| **Setting** | **Bellmourn**, "CITY OF A HUNDRED BELLS". It rains all the time and it is always night. You go in by a gallows gate, then pass a canal quarter of candle-makers, a foggy harbour, a flooded cathedral and the catacombs under it, a bell foundry, the rich quarter on the hill and finally the cathedral roof and its belfry. The citizens who still walk the streets are "THE HUSHED": voiceless, red-eyed and hostile. |
| **Origin** | The user asked for "an epic action game that looks exactly like" a reference screenshot: a dark, rainy, gothic isometric pixel-art scene with a red-cloaked, white-haired swordsman among dark red-eyed foes, iron fences, a chapel with a rose window, warm lamps and a moonbeam through mist. The game was built as an original world. That screenshot is why the first warden, Carmine, is a white-haired swordsman in a red cloak, and why Gallows Gate opens on a courtyard by a chapel with a rose window (`js/world/levels/gate.js`). |
| **Main loop** | Enter a district (name card) → fight through it → light lamps (checkpoints) → clear two locked-gate fights → reach the boss arena (boss intro) → kill the boss → walk out through the district's exit → **the Haven**, a ruined shrine with a fire, where you spend skill points, temper or swap weapons, wear relics, shop, switch warden or travel → ONWARD into the next district. Dying costs only the fight in progress: you wake at the last lamp. |
| **Ultimate goal** | Reach the Belfry, defeat **Saint Silence, "The Hand That Stilled the Bell"**, and walk up to the great bell of St. Orrin. The ending then plays: "THE BELL OF ST. ORRIN RINGS." |

---

## 2. COMPLETE STORYLINE

### 2.1 Backstory and lore before the game

All of the backstory the player is ever told is in the seven opening cards (`js/game/story.js`, `OPENING`):

> BELLMOURN, CITY OF A HUNDRED BELLS.
> EVERY DAWN THE GREAT BELL OF ST. ORRIN RANG, AND THE SUN CAME UP OVER THE ROOFS.
> ONE HUNDRED NIGHTS AGO, THE BELL FELL SILENT.
> THE RAIN HAS NOT STOPPED SINCE. NOR HAS THE NIGHT.
> THE PEOPLE WHO STILL WALK THE STREETS HAVE NO VOICES NOW. ONLY EYES.
> THE CITY CALLS THEM THE HUSHED.
> THE LAST OF THE BELL-WARDENS COME HOME.

What this establishes:

- the bell's ringing and the sunrise are causally linked;
- the silence began 100 nights ago and brought endless rain and night;
- the population was turned into the Hushed;
- an order called the bell-wardens exists, has nearly died out, and its last members return from somewhere.

**The game is silent on the following.** Why the bell stopped. Who or what made the Hushed. What a bell-warden is or does, and where the last of them were. Who St. Orrin was. How many bells the city has besides the great one. What lies outside the city.

The boss titles hint at a cause (see 2.5) but never state one.

One more piece of lore appears in the Haven's first-visit guide:

> THE HAVEN. BETWEEN THE DISTRICTS THE WARDENS REST HERE, BY THE LAST FIRE IN THE CITY.

The code comments add **(comment)**: the Haven is "the ruined lamplighters' shrine", with "a hooded statue of the first lamplighter, candles at its feet" (`js/world/haven.js`). The statue and candles are on screen; their meaning is never stated.

### 2.2 The opening

The flow is in `js/game/game.js`, `title()` → `select()` → `story()`.

1. **Title screen.**
   - The BELLMOURN logo and "RING THE BELL. BRING THE DAWN."
   - Behind the logo, the Gallows Gate courtyard in the rain. Your chosen warden stands among three Hushed with the camera drifting slowly (`titleScene()`).
   - Music: a slow minor organ with a distant bell now and then (`js/engine/audio.js`).
2. **NEW GAME → "CHOOSE YOUR WARDEN".**
   - Four name tabs. Each card shows the warden's title, blurb, four ratings and skill list.
   - Sister Ash is greyed out ("JOINS AFTER LANTERN ROW").
3. **Choice of route:** "PLAY THE TRAINING ROAD" or "SKIP TO THE CITY".
4. **The seven opening cards above**, one at a time over the dimmed courtyard. Each advances on a tap ("TAP / ENTER"); BACK skips them all.
5. **The Prologue, if chosen.**
   - The card reads "PROLOGUE / THE OLD ROAD / THE CITY IS DARK. THE ROAD IS NOT EMPTY."
   - The place **(comment)**: "The last mile to the city gate in the rain: a walled road past a roadside graveyard and a wayside shrine" (`js/world/levels/prologue.js`).
   - On screen: graves, dead trees, an abandoned cart, a fallen body with a dropped sword, street lamps, a statue at the shrine and the city wall with its gate ahead.
   - The training has nine steps (`js/game/tutorial.js`): move; attack (two passive Hushed rise from the ground); dash through red twice; skills fire from the attack; ultimate; clear the rest; drink a tonic; light "THE WARDEN'S LAMP"; then "THE GATE AHEAD LEADS TO THE HAVEN. GO."
   - All of the text is instruction. None of it is story.
6. **The Haven**, first visit.
   - "BETWEEN THE DISTRICTS / THE HAVEN". The warden walks in out of the rain and kneels by the brazier.
   - The four-step guide starts with the "LAST FIRE IN THE CITY" line; the other three steps explain the menu.
   - ONWARD leads into District I. Players who chose SKIP go straight from the cards to District I and see the Haven for the first time after its boss.

### 2.3 The districts, in order

Each district opens with a card: "DISTRICT I" (and so on), its name and its tagline. Text inside a district comes from three sources:

- one-time **hints** (toasts when you enter an area);
- **encounter messages** when a locked-gate fight starts or ends;
- the **boss intro**: letterbox bars with the boss's name and title, and a roar.

There are no other words. The boss arena is entered on foot; the gates shut behind you.

District data: `js/world/levels/*.js`. Foes: `js/game/defs.js`, `js/game/units.js`. Bosses: `js/game/defs.js`, `js/game/bosses2.js`.

#### Prologue: The Old Road (training)

- **Tagline:** "THE CITY IS DARK. THE ROAD IS NOT EMPTY."
- **Foes:** only the training Hushed.
- **Boss:** none.
- **Story beats:** none beyond the card.

#### District I: Gallows Gate (tier 0)

- **Tagline:** "THE GATE STANDS OPEN. IT NEVER USED TO."
- **Place (comment):** "In through the city gate, the courtyard by the chapel of St. Orrin (the scene as first seen: the warden among the hushed in the rain), the gaol lane, and the gallows square where the Gaoler keeps the keys."
- **On screen:**
  - a chapel with a bell-cote and a dark rose window;
  - tables with mugs left out;
  - fallen bodies and dropped swords;
  - a rune mark, banners and a gallows;
  - a statue in the square.
- **Text:**
  - Encounter: "THE HUSHED TURN THEIR HEADS".
  - Hints: "WASD TO MOVE. THE LAMP AHEAD KEEPS YOUR PLACE." / "RED ON THE STONES: A BLOW IS COMING. DASH THROUGH." / "SOMETHING HEAVY MOVES ON THE GALLOWS SQUARE."
- **Foes:** Hushed, Ghouls, a Gallows Archer.
- **Boss:** **The Gaoler, "Keeper of the Gallows Keys"**. A masked giant with a cleaver and a burning lantern on a chain who calls up Hushed. When he falls, the square's exit gate opens: the keeper of the keys literally unlocks the way on.

#### District II: Lantern Row (tier 1)

- **Tagline:** "THE CANDLES STILL BURN. NO ONE LIT THEM."
- **Place (comment):**
  - "The candle-makers' quarter along the canals: the canal road in, the Wick Market (the stallholders never left), the bridge to the chandlers' quay, the tallow works where the Executioner waits, and over the last bridge Candlemas Square before the Chandlers' Hall, where Mother Tallow keeps every candle burning."
  - Candles everywhere are "Mother Tallow's mark", including "pillar candles burned down over a hundred nights" (`js/world/props/market.js`).
- **Text:**
  - Encounters: "THE STALLKEEPERS LEAVE THEIR STALLS" and "SOMETHING STIRS IN THE TALLOW".
  - Closing hint: "ACROSS THE WATER, ONE OF THE CANDLES MOVES."
- **Foes:** Hushed, Ghouls, Gallows Archers, an Acolyte, an Executioner.
- **Boss:** **Mother Tallow, "Who Keeps the Candles Burning"**. In code she is "the candle-witch of the market": she floats, blinks, and rains wax and fire, and calls up a "brood" of Ghouls. She is dressed in pale wax colours.
- **Reward:** her defeat unlocks the fourth warden. The toast reads "SISTER ASH JOINS YOU (CHANGE HERO AT THE HAVEN)" (`js/game/progress.js`, `bossReward`).

#### District III: Mirewater Docks (tier 2)

- **Tagline:** "THE SHIPS CAME BACK. THE CREWS DID NOT."
- **Place (comment):** "The harbour at the river mouth, in fog: the landing below the warehouses, the fish market on the quay, the long pier past a ship that came back with no one aboard, the Salt Quay under the warehouse loading decks, and the Graving Quay by the dry dock (a wreck on its keel blocks) where the Harbormaster drags the drowned ashore."
- **On screen:** the empty ship has a sickly green lantern on its stern; a lighthouse stands out in the fog (`js/world/props/docks.js`).
- **Text:**
  - Encounters: "THE DOCKHANDS DROP THEIR NETS" and "THE HOLDS ARE NOT EMPTY".
  - Closing hint: "SOMETHING HUGE STIRS IN THE HARBOUR WATER."
- **Foes:** Hushed, Grave Hounds, Mire Spitters, a Tallow Bomber, a Gallows Archer, an Executioner.
- **Boss:** **The Harbormaster, "Who Drags the Drowned Ashore"**. A drowned giant with a boat-hook and an anchor, barnacles and kelp on his oilskin. He hooks you and hauls you in; below half health, rings of tide roll out. He calls Grave Hounds.

#### District IV: The Drowned Nave (tier 3)

- **Tagline:** "THE TIDE CAME IN THROUGH THE DOORS. IT NEVER WENT OUT."
- **Place (comment):** "Through St. Orrin's churchyard, in at the side door of the great cathedral (its west doors buried by the tide), down the flooded nave between the arcades, past the fallen chandelier, to the crossing where the Drowned Deacon preaches to the water."
- **On screen:**
  - the stump of the fallen west tower and its bell;
  - a great bronze bell lying on its side;
  - drowned teal glass and a rose window over the altar;
  - teal candles ("The drowned burn teal");
  - motes of "drowned light" drifting over the water.
- **Text:**
  - Hints: "THE WEST DOORS ARE BURIED. THE SIDE DOOR STILL STANDS." / "INSIDE, THE WATER IS SHALLOW. IT ONLY SOUNDS DEEP." / "BEYOND THE SCREEN, SOMEONE IS PREACHING TO THE WATER."
  - Encounters: "THE GRAVES ARE NOT EMPTY", "THE SIDE DOOR SWINGS OPEN" and "THE CONGREGATION RISES".
- **Foes:** Hushed, Ghouls, Gallows Archers, an Acolyte, an Executioner, and the first **Bell Warden** (see 6.1).
- **Boss:** **The Drowned Deacon, "His Sermon Is the Tide"**. A drowned priest in a brimmed hat; tides, geysers and a censer that drags you in. He summons Hushed and Acolytes.
- **Reward:** "A THIRD RELIC SLOT".
- **Unused route (comment):** the set includes "the door to the belfry stair" and "the belfry passage behind the north transept", but the path leads down into the catacombs instead.

#### District V: The Undercroft (tier 4)

- **Tagline:** "BENEATH THE TIDE, THE OLDER DEAD."
- **Place (comment):** "Down the stair from the drowned nave into the catacombs: the stair foot where the tide seeps in, the bone gallery, the collapsed passage over the buried stream, the hall of effigies, the crypt chapel, and the Ossuary, where the Ossuary Knight keeps the names of the dead." It is underground: no rain, with moonlight falling only through street grates far above.
- **Text:**
  - Hints: "THE TIDE STOPS AT THE STAIR. THE DEAD DO NOT." / "BEYOND THE BARS, SOMEONE IS READING NAMES."
  - Encounters: "THE BONES STIR" and "THE EFFIGIES ARE EMPTY".
- **Foes:** Hushed, Plague Rats (swarms), Grave Hounds, Ghouls, a Shade, a Chanter, a Pale Knight.
- **Boss:** **The Ossuary Knight, "Keeper of Ten Thousand Names"**. Ribs over his breastplate, skull pauldrons, a bone greatsword. Bone spikes erupt in rows; he grows a bone shield; he calls plague rats; "the hushed rise". The Ossuary holds "the bone pillars and the ring of names" **(comment)**.

#### District VI: The Bell Foundry (tier 5)

- **Tagline:** "THE FURNACES NEVER COOLED. SOMETHING KEPT THEM FED."
- **Place (comment):** "In through the coal yard, across the furnace hall... out into the mould yard under the gantry crane, through the casting shed where the pits are still being poured... to the great casting pit where the Bellfounder keeps the furnaces fed."
- **On screen:** bells half-buried in casting pits, and in the great pit "the crown of a bell the size of a house rising out of it, all lit from below".
- **Text:**
  - Encounters: "THE FURNACE HANDS TURN FROM THE FIRE" and "THE POURING BEGINS".
  - Closing hint: "REST AT THE LAMP. THE GREAT PIT IS AHEAD."
- **Foes:** Hushed, Tallow Bombers, Gargoyles, Chanters, Executioners, Bronze Sentinels.
- **Boss:** **The Bellfounder, "Who Poured the Silent Bell"**. A bronze giant swinging a bell, with a furnace grate in his chest and a chimney on his back. Tolls ring outward and molten pours leave burning pools; he throws the bell. He calls the foundry's Sentinels and Bombers.

#### District VII: The Crown Heights (tier 6)

- **Tagline:** "UP HERE THEY PAID FOR THE NIGHT TO STAY."
- **Place (comment):** "The rich quarter on the hill below the cathedral... up the Regent's Road past the manors, through the fountain garden, along the long colonnade, across the carriage court of a fallen house, to the palace forecourt where the Pale Regent still holds his last ball. Out by the stair to the cathedral."
- **On screen:**
  - torn violet banners of "the fallen house", showing a gilt crown over a downward-pointing sword;
  - niches of "marble mourners";
  - abandoned carriages;
  - a balustrade over the lower city far below in the mist.
- **Text:**
  - Hints: "PALE KNIGHTS BLOCK FROM THE FRONT. CIRCLE THEM." / "MUSIC ON THE FORECOURT. SOMEONE IS STILL DANCING."
  - Encounters: "THE GARDEN GUARD STILL KEEPS THE GATE" and "THE HOUSE GUARD TURNS OUT ONE LAST TIME".
- **Foes:** Pale Knights, Grave Hounds, Gargoyles, Bell Wardens, a Shade, an Acolyte. **No Hushed appear in this district** (an observation from the data; the game does not comment on it).
- **Boss:** **The Pale Regent, "Who Sold the Dawn"**. A fast duellist with a crown ringed by thorns, gold epaulettes and a parrying dagger. He uses dash-thrusts, thrown daggers and a "crown of thorns" that closes round you, vanishes and reappears behind you, and calls Shades.

#### District VIII: The Belfry (tier 7, final)

- **Tagline:** "THE BELL IS SILENT. SOMEONE IS STILL UP THERE."
- **Place (comment):** "Out of the stair turret onto the leads of the nave roof, high over the city in the storm; through the crossing under the lantern spire, where the bell wardens keep watch; over the flying bridge beside the choir gable; up the tower gallery and its stair to the bell platform, where Saint Silence keeps the great bell of St. Orrin from ringing."
- **On screen:**
  - the great bell in its timber frame, with braziers;
  - the "bell-ringers' compass" inlaid in the floor;
  - bodies and swords: "what is left of those who climbed before" **(comment)**;
  - a dropped coil of bell-rope.
- **Text:**
  - Encounters: "THE BELL WARDENS RAISE THEIR SHIELDS", "ARCHERS ON THE PARAPETS" and "THE STAIR TO THE BELL IS OPEN".
  - Last hint: "THE BELL HANGS STILL. SOMEONE STANDS BESIDE IT."
- **Foes:** Bell Wardens, Hushed, Gallows Archers, Acolytes, Executioners.
- **Boss:** **Saint Silence, "The Hand That Stilled the Bell"**. A pale, masked, crowned figure in white who fights with a bell as a hammer. Tolls ripple outward and he vanishes in the fog. In phase two he **summons Bell Wardens**; in phase three a storm breaks. He hits 30% harder than his base stats (`dmgMul: 1.3`).

### 2.4 Turning points

There are only three:

1. **Entering the city:** Prologue → Gallows Gate.
2. **Sister Ash joins** after Mother Tallow. It is a reward toast; there is no meeting and no scene.
3. **Reaching the bell** after Saint Silence.

The middle districts have no story events beyond their cards, hints and boss names. Nothing the wardens learn changes what they do.

### 2.5 The implied plot (never stated)

Read in order, the late taglines and boss titles form a chain the game never explains:

- The rich "PAID FOR THE NIGHT TO STAY".
- The Pale Regent "SOLD THE DAWN".
- The Bellfounder "POURED THE SILENT BELL".
- Saint Silence is "THE HAND THAT STILLED THE BELL".

This suggests a conspiracy behind the silence. The game never confirms it, names a buyer, or links any boss to another.

### 2.6 Climax

Saint Silence's fight on the bell platform is the climax. When he falls:

- every remaining foe dies;
- a big bell tolls (the same "bigBell" sound plays when any boss falls);
- the toast "SAINT SILENCE FALLS" appears, followed by loot.

The player then walks to the exit zone in front of the bell. **There is no "ring the bell" action or prompt.** Stepping into the zone fades straight into the ending (`play()`, exit `to: 'end'`).

### 2.7 Ending

(`ending()` in `js/game/game.js`, `ENDING` in `story.js`.)

What plays:

- letterbox bars;
- the bell's toll;
- a major-key "dawn" theme with choir and chimes;
- over eight seconds the image warms into a dawn grade, the rain fades and the moonlight turns gold.

The camera stays on the warden by the still-hanging bell while four lines appear at the bottom, each for about four seconds:

> THE BELL OF ST. ORRIN RINGS.
> FOR THE FIRST TIME IN A HUNDRED NIGHTS, THE RAIN THINS.
> ACROSS THE ROOFS, ONE BY ONE, THE HUSHED LIFT THEIR HEADS.
> AND THE SUN COMES UP OVER BELLMOURN.

The bell prop has a swing animation, `ring()` in `js/world/props/belfry.js`, but nothing in the game calls it. The bell does not move in the ending. No Hushed are shown lifting their heads either: the text says it and the camera does not show it.

### 2.8 Credits

Shown as tap-to-advance cards after the ending, then back to the title. The same lines appear under CREDITS on the title menu.

> BELLMOURN / A GAME MADE FOR THIS REPOSITORY / CODE, ART, MUSIC AND SOUND MADE IN THE BROWSER / RENDERED WITH THREE.JS (MIT) / THANK YOU FOR PLAYING

"A GAME MADE FOR THIS REPOSITORY" is a placeholder. The user's later trailer brief asked for "Bledink Studios" branding; the credits do not carry it.

---

## 3. CHARACTERS

### 3.1 The four wardens

Source: `js/game/heroes.js`. Each warden's whole written characterisation is a **name, a title and a one-line blurb** on the select screen and in the Haven's HERO tab, plus weapon and skill names. None of them ever speaks. None has a stated past, motive, relationship or arc.

The opening line "THE LAST OF THE BELL-WARDENS COME HOME" is the only motive given, and it is shared by all four: they are bell-wardens, and coming home implies the city is theirs. The game never says why they left or why they came back after a hundred nights.

| Warden | As written (in-game text) | What the kit and look add | Motivation and relationships |
|---|---|---|---|
| **CARMINE, THE BELL-WARDEN** (sword) | "A SWORD AND A RED CLOAK. FAST COMBOS, A WAVE OF STEEL, A RUSH THROUGH THE PACK." | White hair, red cloak: the reference screenshot's swordsman. Starting weapon "WARDEN'S BLADE: THE BLADE OF THE BELL-WARDENS." Skills: Crimson Wave, Cutting Rush, Whirl of Thorns. Ultimate: **Requiem**. | None given. Carmine was the sole protagonist of the first build ("CARMINE, LAST OF THE BELL-WARDENS, COMES HOME."), which was made generic when more wardens were added. Carmine's title is the order's own name, so Carmine reads as the default lead. |
| **VESPER, THE NIGHT HUNTRESS** (crossbow) | "A CROSSBOW FROM THE ROOFTOPS. HOLD ATTACK TO SHOOT. VOLLEYS, SMOKE AND SNARES." | Hooded teal-green cloak. "NIGHT CROSSBOW: LIGHT AND QUIET." Skills: Volley, Smoke Step, Snare Trap. Ultimate: **Rain of Bolts**. | None given. "From the rooftops" suggests a scout or hunter, but the game has no rooftop play until the Belfry and never refers to it. |
| **BRAM, THE BELLBREAKER** (hammer) | "A FOUNDRY HAMMER AND IRON SKIN. SLOW, HUGE BLOWS THAT SCATTER THE CROWD." | Bulky, with shoulder plates. "IRON MAUL: A FOUNDRY HAMMER." Skills: Shockwave, Iron Charge, Bell Ward. Ultimate: **Toll of Ruin**. His last weapon is the "CATHEDRAL BELL". | None given. A bell-warden called "Bellbreaker" who carries a foundry hammer invites a story about the Bell Foundry; the game never makes one, and nothing changes when Bram enters the Foundry. |
| **SISTER ASH, THE LAMPLIGHTER** (lantern staff; joins after Lantern Row) | "SHE KEEPS THE LAST LAMPS LIT. FIRE AT RANGE, PILLARS OF FLAME, A LANTERN THAT HEALS." | Pale hood and robes, a staff with an amber light, a lantern in her other hand. "LAMP STAFF: A LAMPLIGHTER'S POLE." Skills: Flame Pillar, Lantern Ward, Will-o'-Wisps. Ultimate: **Sunburst**. Last weapon: "DAWN LANTERN: THE FIRST LIGHT, IN A CAGE." | None given. "Sister" implies a religious order and "Lamplighter" ties her to the Haven, which is a lamplighters' shrine, but the game draws neither line. Her title is not "bell-warden", yet the select screen and the Haven call everyone a warden. She joins after the candle-witch falls, with no explanation of where she was. |

**Relationships:** none written. Only one warden exists in the world at a time. Switching happens in the Haven: the old warden vanishes in "a breath of smoke and embers", the new one kneels in their place, and the menu says "<NAME> RESTS HERE". The others are never seen or mentioned. Each warden levels separately.

**Development:** none narrative. Growth is purely numeric (see 4.6).

### 3.2 The bosses

Each boss gets a name and a title in the letterbox intro, a "<NAME> RAGES" toast at each phase change and "<NAME> FALLS" at death. None speaks, none has a stated motive, and none is mentioned after death.

| # | Boss and title (on screen) | What the player sees | Narrative significance |
|---|---|---|---|
| I | **THE GAOLER**, "KEEPER OF THE GALLOWS KEYS" | Masked giant, cleaver, burning lantern on a chain; calls up Hushed. | Guards the gate into the city; his death opens the exit gate. The clearest tie between a title and the gameplay. |
| II | **MOTHER TALLOW**, "WHO KEEPS THE CANDLES BURNING" | Floating candle-witch in pale wax colours; blinks, rains wax and fire; calls Ghouls. | Explains the tagline "THE CANDLES STILL BURN. NO ONE LIT THEM." A dark mirror of Sister Ash, who joins when Tallow falls, though the game never says so. |
| III | **THE HARBORMASTER**, "WHO DRAGS THE DROWNED ASHORE" | Drowned giant with boat-hook and anchor; hooks and drags you; tides; calls Grave Hounds. | Tied to "THE SHIPS CAME BACK. THE CREWS DID NOT." Implies he gathers the drowned; unexplained. |
| IV | **THE DROWNED DEACON**, "HIS SERMON IS THE TIDE" | Drowned priest; tides, geysers, a censer that drags; summons Hushed and Acolytes. | Explains the flooded cathedral ("THE TIDE CAME IN... IT NEVER WENT OUT") and "THE CONGREGATION RISES". The first boss inside St. Orrin's own cathedral. |
| V | **THE OSSUARY KNIGHT**, "KEEPER OF TEN THOUSAND NAMES" | Bone-armoured knight; bone spikes and shield; plague rats; the Hushed rise. | "SOMEONE IS READING NAMES." He keeps the names of the dead; what the names are for is unexplained. |
| VI | **THE BELLFOUNDER**, "WHO POURED THE SILENT BELL" | Bronze giant with a furnace chest swinging a bell; tolls, molten pours, a thrown bell. | **A direct claim about the central mystery:** he made "the silent bell". Never followed up (see 6.5). |
| VII | **THE PALE REGENT**, "WHO SOLD THE DAWN" | Crowned duellist with daggers who vanishes; calls Shades; holds "his last ball" **(comment)**. | **A second direct claim:** the dawn was sold, and the district's tagline says the rich paid for the night. To whom is never said. |
| VIII | **SAINT SILENCE**, "THE HAND THAT STILLED THE BELL" | Pale, masked and crowned, fighting with a bell; tolls, vanishing, a storm; **summons Bell Wardens**. | The antagonist, named for the silence itself. His death lets the bell ring. Who he is, why he did it, and whether "Saint" is a real title are never addressed. |

The code holds older comments from the first four-district build. They call the Deacon "District III" and Saint Silence "District IV: the final boss at the bell" (`js/game/ai.js`), and `nave.js` and `belfry.js` still carry "District III" and "District IV" in their headers. Players never see these, but anyone writing from the code could be misled by them.

### 3.3 Foe types

Fifteen types. Their names are never shown to the player; they appear only in hints ("PALE KNIGHTS", "SHADES", "HOUNDS", "RATS", "GARGOYLES", "BOMBERS", "CHANTER", "CASTERS", "BELL WARDENS", "ARCHERS", "THE HUSHED"). Every humanoid foe has glowing eyes, mostly red.

| Foe | Look and behaviour | Districts | Story link |
|---|---|---|---|
| **Hushed** | Hooded, cloaked, with sabres and red eyes; rise out of the ground in mist when summoned. | Every district except the Crown Heights | The citizens of the opening: "NO VOICES NOW. ONLY EYES." Encounter messages make them stallkeepers, dockhands, furnace hands, the congregation, house guards. |
| **Ghoul** | Hunched, clawed, fast pouncer. | I, II, IV, V; Mother Tallow's "brood" | None given. |
| **Acolyte** | Hooded caster of homing red orbs; teleports. | II, IV, VII, VIII; the Deacon's summons | Implied servants of the Deacon ("THE ACOLYTES KEEP THEIR FIRES" **(comment)**). |
| **Gallows Archer** | Brimmed hat, crossbow. | I, II, III, IV, VIII | Named for District I; also appears much later. |
| **Executioner** | Masked giant with an axe. | II–VI, VIII | "The tallow works where the Executioner waits" **(comment)**. |
| **Bell Warden** | Horned helm, sword and shield, red eyes. | IV, VII, VIII; Saint Silence's summons | **Shares the heroes' own title** (see 6.1). In the Belfry "THE BELL WARDENS RAISE THEIR SHIELDS". |
| **Grave Hound** | Bony hound hunting in packs. | III, V, VII; the Harbormaster's summons | None given. |
| **Plague Rat** | Sore-covered rats in swarms. | V; the Ossuary Knight's summons | None. A relic named "RAT KING'S CROWN" exists, but there is no Rat King. |
| **Gargoyle** | Stone flyer that dives from above. | VI, VII | "WATCH THE ROOFS." |
| **Tallow Bomber** | Hooded, with a bandolier of glowing flasks; lobs fire. | III, VI; the Bellfounder's summons | Named for tallow, yet never found in Lantern Row, Mother Tallow's district. |
| **Mire Spitter** | Swollen-throated thing spitting poison. | III | Fits the harbour; nothing more. |
| **Shade** | Dark figure that melts into the dark and steps out behind you. | V, VII; the Pale Regent's summons | None given. |
| **Chanter** | Wears a crown of candles and a golden stole; shields allies. | V, VI | "A CHANTER SHIELDS THE DEAD." |
| **Bronze Sentinel** | Bronze golem with a furnace in its chest; fires a furnace beam. | VI; the Bellfounder's summons | Made by the foundry, by implication only. |
| **Pale Knight** | Pale armour; its shield face bears a bell. | V (one), VII | The Regent's guard by placement ("THE GARDEN GUARD", "THE HOUSE GUARD"). |

Elite foes glow with an affix (BURNING, FROZEN, SHIELDED, HASTED, VAMPIRIC). The affixes have no story.

### 3.4 Other figures named in the text

| Figure | Where | What is known |
|---|---|---|
| **St. Orrin** | Opening, ending; the chapel in Gallows Gate and the cathedral **(comment)** | The great bell, a chapel and a cathedral bear the name. Nothing else. |
| **The bell-wardens** | Opening; Carmine's title; the WARDEN'S BLADE; "THE WARDEN'S LAMP" in the tutorial | An order whose last members return. Its role is never described. |
| **The Hushed** | Opening, ending, hints | See 3.3. |
| **The first lamplighter** | Haven statue **(comment)** | A hooded statue holding out a lantern. Unnamed and unexplained on screen. |
| **The merchant** | Haven SHOP tab ("THE MERCHANT HAS NOTHING MORE FOR YOU...") | Never shown; no figure in the Haven set. |
| **The fallen house** | Heights banners **(comment)** | Seen as banners only; never named. |
| **"Those who climbed before"** | Belfry bodies **(comment)** | Seen as bodies only. |
| **Unseen figures in item names** | GRAVEDIGGER'S COIN, RAT KING'S CROWN, SAINT'S BONE | Names only. |

---

## 4. STORY AND GAMEPLAY CONNECTION

### 4.1 Why does the player do what they do?

Because the opening says the bell is silent, the night will not end, and the last bell-wardens have come home. The goal is implied and clear: ring the bell. The title tagline makes it explicit ("RING THE BELL. BRING THE DAWN."). Each district is one step closer to the bell, and the Belfry's tagline pays it off ("THE BELL IS SILENT. SOMEONE IS STILL UP THERE.").

What is missing is any reason at the warden level: no personal stake, nobody to save by name, no sense of what failure would mean. The player's motive is the premise. It is not a character's motive.

### 4.2 How do levels, battles and progression advance the story?

- **Geography is the main narrative device.** The route reads as a journey inward and upward: gate → markets → harbour → cathedral → under it → foundry → the hill → the cathedral roof → the bell. Each district has its own dressing and a matching boss.
- **Locked-gate fights** carry one line each that names who the Hushed used to be ("THE DOCKHANDS DROP THEIR NETS"). These are the best small storytelling in the game.
- **Bosses** carry the only plot information, in their titles.
- **Battles themselves do not advance the story.** Nothing is learned in a fight. Clearing a district changes nothing in the world except the next card.
- **Progression** (levels, ranks, weapons, relics) has no narrative meaning.

### 4.3 How do unlocks, abilities, upgrades, relics, lamps, the Haven and tonics fit the world?

| System | In-world framing | How well it fits |
|---|---|---|
| **Lamps** (checkpoints) | "A warden's lamp" **(comment)**. Lighting one: "LAMP LIT". Resting: "YOU REST. THE LAMP KEEPS YOUR PLACE"; the warden kneels and the flame leaps. On death: "YOU FELL / THE LAMP STILL BURNS". | **Strong.** Light against the endless night is the game's central image, and wardens lighting lamps fits it. (Lamps will soon light automatically when an area is cleared, which is planned and not in this build; see 5.3. That change removes the one act the warden performs by choice.) |
| **The Haven** | "BETWEEN THE DISTRICTS THE WARDENS REST HERE, BY THE LAST FIRE IN THE CITY." A ruined shrine, roofed at the back only, with a statue, candles and moths. Every choice makes the fire flare and a bell sound. | **Strong on mood; weak on logic.** It sits outside the city's geography (every exit leads there), and "last fire in the city" contradicts the burning candles, furnaces and lamps everywhere (6.2). |
| **Embers** (currency, dropped by kills) | The word fits the fire motif. | **Uneasy.** They drop from slain Hushed, who the ending says can recover (6.3). Nothing says what they are. |
| **Skill points, ranks** | "SPEND YOUR POINT. EVERY RANK HITS HARDER AND COOLS FASTER." | Purely mechanical. |
| **Weapons and tempering** | "TEMPER IT IN THE FIRE." Names echo the districts (Gallows Saber, Candleflame Edge, Tidecutter, Anchor Hammer, Tide Censer, Bone Scepter, Founder's Maul, Pale Longbow, Bellsteel, Cathedral Bell, Dawn Lantern). | **Good flavour, loose logic.** Drops are random by tier, so a "Founder's Maul" can drop in the Undercroft, before the Foundry. Most descriptions are mechanical; the exceptions are the starting weapons and "THE FIRST LIGHT, IN A CAGE". |
| **Relics** (14) | Evocative names (Gravedigger's Coin, Red Thread, Bell Clapper, Ash Rosary, Saint's Bone, Moth Wing, Lantern Glass, Iron Psalter, Drowned Pearl, Rat King's Crown, Stormglass, Pale Silk). | **Names only.** Descriptions are mechanical ("+30% EMBERS."). Drops are random: a "Drowned Pearl" can come from the Gaoler. "SAINT'S BONE: YOU RISE" is the one relic with a moment of its own, a bell and a toast. |
| **Tonics** | A flask with green-gold motes. | No in-world source beyond chests, bosses and the merchant. Neutral. |
| **Unlocking Sister Ash** | "SISTER ASH JOINS YOU (CHANGE HERO AT THE HAVEN)" | **Weak.** A reward line, not a meeting. |
| **Third relic slot** (after District IV) | "A THIRD RELIC SLOT" | No framing. |
| **Map and travel** | Revisiting a cleared district: "(THE WANDERING HUSHED RETURN: GOOD FOR EMBERS.)" | Honest, but frames the Hushed as farmable. |

### 4.4 Do foes and bosses have reasons to appear?

- **The Hushed:** yes, from the premise, and the encounter messages place them as the district's own people. That reason also creates the game's biggest moral tension (6.3).
- **District-flavoured foes** fit their places: Gallows Archers at the gallows, Mire Spitters at the docks, Bronze Sentinels and Bombers at the foundry, Pale Knights and house guards on the Heights. **Generic foes** (Ghouls, Acolytes, Executioners, Shades, Grave Hounds, Gargoyles) have no stated origin.
- **The Bell Wardens** have the heroes' own name and no explanation (6.1).
- **Bosses** each own their district thematically, and their titles explain local oddities (the candles, the tide, the drowned, the names). Only the last three are tied to the main mystery, and only by their titles. None states a reason for opposing the wardens.

### 4.5 Does the loop support the narrative?

Partly.

**What works:** the shape of each district (enter the dark → light lamps → push through gates → face the keeper → walk out to the fire) repeats the game's central image of carrying light through the night, ending with literally bringing the dawn. The Haven gives the loop a breath between districts.

**What doesn't:**

- the loop never changes the world (no district grows lighter once its keeper falls);
- the rewards are numbers;
- the fourth warden arrives as a menu unlock;
- the climax lacks an action: the player never rings the bell, they walk into an exit zone.

### 4.6 Does progression reflect character growth?

No. Wardens gain levels (up to 30), skill ranks, weapons and relics, all of it numeric. Their text never changes: no new lines, no change in look or name. Switching wardens freely and levelling each one separately makes them interchangeable. Combat growth stands in for character growth, and nothing frames it as growth.

### 4.7 How is the story presented?

There is **no voiced dialogue, no spoken line, no cutscene with characters and no in-world text** (no notes, books or inscriptions). The story is carried by:

| Channel | Content | Approximate amount |
|---|---|---|
| Text cards | Seven opening lines, four ending lines (over the dawn scene), five credit lines | ~120 words |
| District cards | "DISTRICT N", name and tagline, about 4.5 seconds | 9 taglines, ~60 words |
| Hints | One-time toasts in set zones, about 4 seconds; about half are mechanical | ~290 words |
| Encounter messages | One line when a locked fight starts, sometimes one when it ends | ~115 words |
| Boss intros | About 3.6 seconds of letterbox and roar, with name and title in the bars; skippable after 1.5 seconds | 8 names and titles |
| Environment | Hand-built sets with much implied history: bodies, fallen bells, the empty ship, the drowned glass, the fallen house's banners, the marble mourners, the casting pit, the bell platform | The richest channel, but read only by players who look |
| Sound | A distant bell in the music, organ, choir at the dawn, a big bell at every boss death | Atmospheric |

All the story text a player reads in a full playthrough fits on about two pages. A player who taps quickly through the cards and toasts can finish the game having read almost none of it.

---

## 5. STORY IMPLEMENTATION

### 5.1 Fully implemented (in the reviewed build)

| Content | Where |
|---|---|
| Title screen with tagline and the courtyard scene | `js/game/game.js` (`title`, `titleScene`, `drawUI`) |
| Seven opening cards | `js/game/story.js` `OPENING`; `story()` |
| Warden select with titles, blurbs and Sister Ash locked | `drawSelect()`; `js/game/heroes.js` |
| Prologue: The Old Road, with its nine-step training | `js/world/levels/prologue.js`; `js/game/tutorial.js` |
| Eight districts with names, taglines, cards, hints, encounter messages and fully dressed sets | `js/world/levels/*.js`; `js/world/props/*.js` |
| Eight bosses with names, titles, letterbox intros and RAGES / FALLS toasts | `defs.js`, `bosses2.js`, `game.js` |
| Fifteen foe types with distinct looks | `defs.js`, `units.js`, `js/actors/beasts.js` |
| Sister Ash unlocked after Lantern Row | `progress.js` `bossReward` |
| The Haven: walk-in, kneel, fire reactions, first-visit guide, ONWARD | `js/game/haven.js`, `js/world/haven.js`, `js/game/lampmenu.js` |
| Lamps as checkpoints (lit by hand in this build) with kneel and flare; the death screen "THE LAMP STILL BURNS" | `useLamp()`, `dead` |
| Ending: four lines, dawn grade, rain fading, bell toll, dawn music | `ending()`; `audio.js` |
| Credits | `story.js` `CREDITS` |
| Thirteen death tips | `story.js` `TIPS` (mechanical) |

### 5.2 Partially implemented

| Content | What exists | What is missing |
|---|---|---|
| "THE LAST OF THE BELL-WARDENS COME HOME" (plural) | Four playable wardens | Only one is ever present; the others are not mentioned; no group scene. |
| Sister Ash joining | A toast and the menu unlock | No meeting, no reason, no link to the lamplighters' Haven or to Mother Tallow. |
| Ringing the bell | Bell sound, dawn grade, ending text | No ring action or prompt; the bell's swing animation (`ring()`, `js/world/props/belfry.js`) is never called; the bell hangs still. |
| "THE HUSHED LIFT THEIR HEADS" | Text | Not shown; every foe has been killed and the camera stays on the platform. |
| The boss-title conspiracy (Regent sold the dawn, Bellfounder poured the silent bell, Saint Silence stilled it) | Titles and one tagline | Any connection, motive or reveal. |
| Hints that promise a presence ("SOMEONE IS PREACHING TO THE WATER", "SOMEONE IS READING NAMES", "MUSIC ON THE FORECOURT. SOMEONE IS STILL DANCING.") | Text, then the boss | No voice, no sound: no special music plays on the Heights forecourt. |
| The merchant | The SHOP tab | No merchant character in the Haven. |
| Weapon and relic lore | Names that echo the districts and the motifs | Descriptions are mechanical, and drops are not tied to their places. |
| Lore in code comments (the first lamplighter, the fallen house, the Regent's last ball, the ring of names, the empty ship, those who climbed before) | Visible as set dressing | Never named or explained to the player. |
| Post-game | MAP travel to cleared districts ("THE WANDERING HUSHED RETURN") | The dawn does not persist: CONTINUE after the ending returns to the rainy night Belfry, the ending can be triggered again, and there is no epilogue or new game plus. |

### 5.3 Planned but not yet implemented (being worked on now; not in the reviewed build)

The user asked for these after the reviewed build. None of them is in the game yet:

1. **Lamps that light automatically** when an area is cleared and the warden is within reach, replacing the manual LIGHT THE LAMP action.
2. **A cleaner character select and menus.**
3. **A redesigned Haven menu** (the user called the current campfire menu with the shop and the other tabs unsatisfying).

Two other requests are pending; neither is story content:

- **Trailers**, with "Bledink Studios" branding. The in-game credits do not carry that name.
- **This narrative review.** The user first asked for it on 2026-11-14, but it was not answered then.

### 5.4 Previously implemented, then removed

These come from the git history of `js/game/story.js`:

- **The bell shards.** In the first four-district build each boss left a story object granting a power:
  - SHARD OF THE GATE (Crimson Wave);
  - SHARD OF THE CANDLE (Twin Step);
  - SHARD OF THE TIDE (Riposte);
  - "THE CLAPPER" from the Belfry.

  This was the only thread tying boss victories to the bell itself. It was removed in the rework that took out parry and heavy attacks. Only the relic "BELL CLAPPER" echoes it.
- **A single named protagonist.** The opening's last line was "CARMINE, LAST OF THE BELL-WARDENS, COMES HOME." It became plural when more starting wardens were added.
- **Mechanics removed at the user's request:** finishers ("A BROKEN FOE CAN BE FINISHED"), parry, the heavy attack, and an upgrade menu at every lamp, which moved to the Haven.

### 5.5 Discussed but never approved

No story element was ever discussed with or approved by the user. Every user request in the conversation was about look, controls or systems:

- the reference screenshot;
- no pre-made assets;
- a tutorial;
- multiple starters;
- more units, regions, weapons and abilities;
- the finisher and Haven rework;
- the planned changes in 5.3.

The whole narrative (names, opening, taglines, bosses, ending) was written during development without review. It is **implemented but unapproved canon**.

### 5.6 Missing or placeholder

- **Credits:** "A GAME MADE FOR THIS REPOSITORY" is a placeholder.
- **Missing story:**
  - any account of why the bell fell silent, what the Hushed are, or who the wardens and Saint Silence are;
  - any warden line, backstory or relationship;
  - any boss motive, line or aftermath.
- **Text bugs on screen:**
  - The select screen lists skills by internal id ("SKILLS: WAVE RUSH WHIRL", "PILLAR LANTERN WISPS") instead of their names.
  - The skills tab shows "ULT RAIN" and "ULT TOLL" instead of "RAIN OF BOLTS" and "TOLL OF RUIN".
- **Stale developer text** that does not reach players:
  - "District III" and "District IV" in `nave.js`, `belfry.js`, their prop files and `ai.js`;
  - the README says `story.js` holds "the gifts", which no longer exist.

---

## 6. STORY QUALITY AND CONSISTENCY

### 6.1 Bell Wardens as enemies (the largest contradiction)

The heroes are "THE LAST OF THE BELL-WARDENS". Yet a foe type called **Bell Warden** (horned helm, sword and shield, red eyes) appears in the Drowned Nave, the Crown Heights and the Belfry. The Belfry announces "THE BELL WARDENS RAISE THEIR SHIELDS", and Saint Silence summons them.

The setting says the bell wardens "keep watch" there and keep "stores" by the tower **(comment)**. Read plainly, either the heroes are not the last, or the order was corrupted. The game says neither.

It is either a naming collision or the game's best untold twist, and right now it reads as a mistake. The internal ids collide too: `warden` is both Carmine and the foe.

### 6.2 "The last fire in the city"

The Haven claims to hold the last fire, but the city is full of fire:

- Lantern Row's candles "STILL BURN";
- the Foundry's furnaces "NEVER COOLED";
- every district has torches, braziers and street lamps;
- the wardens light lamps in every district.

The line needs qualifying (the last kept fire, the last clean fire) or changing.

### 6.3 Killing the Hushed

The ending says "THE HUSHED LIFT THEIR HEADS", which implies they are people who can be restored. The encounter messages make them stallkeepers, dockhands, furnace hands and the congregation.

The player kills hundreds of them, with blood sprays and blood pools, and earns currency ("EMBERS") from each death. The map even advertises farming them ("THE WANDERING HUSHED RETURN: GOOD FOR EMBERS.").

The game never says whether the slain are lost, released or simply return. That gap undercuts the ending's sense of mercy.

### 6.4 The detour

The Drowned Nave holds "the door to the belfry stair". Yet the wardens go down into the Undercroft, through the Foundry, up the Heights and back to the cathedral roof, with no reason given (a blocked door, a key, a need to deal with the Bellfounder and the Regent first). The order of districts V–VII is unmotivated in the text.

### 6.5 Two explanations for the silence, never reconciled

- The Bellfounder "POURED THE SILENT BELL", which implies the bell was made silent.
- Saint Silence is "THE HAND THAT STILLED THE BELL", which implies it was held still.

The ending rings the bell after Saint Silence falls, which fits the second reading and leaves the first unexplained. The Foundry's great pit holds a bell "the size of a house" being cast **(comment)**; whether that is the silent bell, a replacement or something else is never addressed.

### 6.6 The buyer of the night

"UP HERE THEY PAID FOR THE NIGHT TO STAY" and the Regent "WHO SOLD THE DAWN" are the strongest hooks in the game, and they go nowhere. Who paid whom, and why the rich wanted endless night, are left open. The Heights also has no Hushed, which a writer could use, but the game never mentions it.

### 6.7 Weak motivations

- **Wardens:** "come home" is the only motive; nobody explains where they were, why now, or what each of them wants.
- **Bosses:** each is a "keeper" of something, with no reason given for keeping it or for opposing the wardens.
- **Saint Silence:** the antagonist has no face, voice or purpose.

### 6.8 Unexplained events

- **Story events:**
  - Sister Ash's arrival.
  - The empty ships.
  - Why the tide flooded the cathedral and never went out.
  - What the Ossuary Knight's names are.
  - Who climbed the Belfry before and died there.
  - Why some foes (Ghouls, Shades, Hounds, Gargoyles) exist.
- **Contradictions in systems and staging:**
  - A big bell tolls at every boss death, and distant bells sound in the music, in a city whose bell is silent. "A HUNDRED BELLS" may cover this, but it blunts the final toll.
  - Bram is a bell-warden titled "BELLBREAKER".
  - Vesper hunts "FROM THE ROOFTOPS", but the game has no rooftop play until the Belfry.

### 6.9 Missing transitions

- **District to district:** nothing marks the jump except a fade, the Haven and a new card. The Haven has no place in the city, so the journey reads as level select.
- **Between wardens:** smoke and embers at the Haven, with no explanation.
- **Into the ending:** the player steps into an invisible zone by the bell and the ending starts. There is no ringing.
- **Out of the ending:** after the credits, the title returns, and CONTINUE puts the player back in the rainy night.

### 6.10 Repetition

- Every district runs the same beats: card → lamp → locked fight → locked fight → lamp → boss → exit → Haven.
- The text formulas repeat. Taglines are built on "X. IT NEVER... / NO ONE... / DID NOT...". Hints keep returning to "... IS NOT EMPTY" (THE ROAD, THE PIERS, THE GARDENS, THE GRAVES, THE HOLDS) and "SOMEONE IS..." (PREACHING, READING NAMES, STILL DANCING, STANDS BESIDE IT, STILL UP THERE).

Each line is effective alone; across eight districts the pattern shows.

### 6.11 Mechanics that contradict the story

- **Embers from slain citizens.**
- **Free warden swapping** against a story of a few last wardens coming home.
- **Random relic and weapon drops** whose names point to other places (Drowned Pearl from the Gaoler; Founder's Maul before the Foundry); "RAT KING'S CROWN" with no Rat King.
- **The dawn does not persist** after the ending; Hushed and night return in cleared districts.
- **Planned auto-lamps (not in this build)** will remove the warden's one deliberate act of lighting.

### 6.12 Confusing points for players

- **The story goes by too fast:**
  - Most of it is in toasts lasting about 4 seconds and boss titles visible for about 2 seconds, and both are skippable.
  - Hints near a district's start can coincide with the 4.5-second district card and be missed: hints only show once the card is gone, and only while the warden stands in the zone.
- **Mixed signals about names and order:**
  - "Warden" means both the heroes and the enemies.
  - Sister Ash appears in the select screen as a warden but is titled Lamplighter.
  - The Haven is called "BETWEEN THE DISTRICTS" with no location.
- **Text bugs:** the skill-name inconsistencies listed in 5.6.

### 6.13 Does the ending satisfy?

Visually and musically it lands: the rain thins, the grade warms to dawn, the choir comes in. That is earned after eight districts of rain.

Narratively it is thin:

- four lines;
- no character moment for the warden who got there;
- no ring action, and the bell does not move;
- the Hushed are not shown recovering;
- none of the boss titles' questions is answered;
- the post-game snaps back to night.

It closes the premise but not the story the bosses imply.

---

## 7. PLAYER EXPERIENCE

### 7.1 How long things take

Source: the autoplay logs, lines of "<seconds>s {state, level, ...}" at 3x speed. Log seconds × 3 gives approximate game time for a bot that walks straight to each objective and never explores.

| Segment | Bot time (log runs) | Notes |
|---|---|---|
| Gallows Gate | ~5–7 min (auto12, auto11) | Boss ~2–3 min |
| Lantern Row | ~7–10 min | |
| Mirewater Docks | ~12.5 min (auto11) | auto10 lost to the Harbormaster three times before the bot learned to spend at the Haven |
| The Drowned Nave | ~11.5 min | |
| The Undercroft | ~27 min with one boss death | The Ossuary Knight took two tries |
| Bell Foundry, Crown Heights, Belfry | No complete run in these builds' logs | auto11 ended entering the Foundry; auto12 stalled in the Docks. Estimated at 12–20 min each from their size (76–85 m long, against 58–74 m for III–V), higher tiers and the harder bosses. |
| Prologue | Not logged (autoplay skips it) | Nine short steps on a 53 m road: about 3–5 min |

**Estimates for a first-time human.** The bot's full run is about 1h45m of game time. With exploration, deaths and Haven time, a full first playthrough is likely **about 2.5 to 4 hours**. The logged runs predate the Haven rework but use the same district layouts.

### 7.2 First five minutes

- **What happens:**
  - The rainy courtyard title and "RING THE BELL. BRING THE DAWN."
  - Choosing a warden from four one-line blurbs.
  - The seven opening cards: the strongest story moment the game has, about 30–60 seconds.
  - "PROLOGUE / THE OLD ROAD / THE CITY IS DARK. THE ROAD IS NOT EMPTY."
  - Nine instruction panels while Hushed rise out of the road; the first lamp; the gate.
  - The Haven ("THE LAST FIRE IN THE CITY") and its menu guide.
- **What the player knows:** the bell is silent, the night is endless, the people are Hushed, and they are a returning bell-warden.
- **Hook:** good. The premise is clear and the image is strong.

### 7.3 First hour

- **Districts:** Gallows Gate, Lantern Row, the Docks, possibly the Nave.
- **Story moments:**
  - Four district cards.
  - The first bosses' names: the Gaoler, Mother Tallow, the Harbormaster.
  - Encounter lines that make the Hushed the city's own people.
  - "SISTER ASH JOINS YOU" as a toast after Mother Tallow.
- **What the player learns:** the city is beautiful and the districts feel different, but nothing new about the bell, the Hushed or the wardens. **The narrative flattens after the opening.**

### 7.4 Early game (I–II)

- **Story:** pure atmosphere and local mysteries (the open gate, candles nobody lit).
- **Rewards:** the first new warden.
- **Mechanical pull:** high (new skills, the Haven, weapons).
- **Narrative pull:** curiosity about place, not plot.

### 7.5 Mid game (III–V)

- **The best environmental storytelling:** the empty ship, the flooded cathedral of St. Orrin, the congregation rising, the Undercroft's "BENEATH THE TIDE, THE OLDER DEAD", the names being read.
- **First hints of the larger story:** the first Bell Wardens appear as enemies (IV) with no comment, and the route passes the belfry stair without taking it.
- **Problem:** the bosses become harder (more deaths) while the story stays still.

### 7.6 Late game (VI–VIII)

- **Plot arrives in titles:** "WHO POURED THE SILENT BELL", "UP HERE THEY PAID FOR THE NIGHT TO STAY", "WHO SOLD THE DAWN", "THE HAND THAT STILLED THE BELL". This is where a curious player will want answers. The game offers none, so the strongest hooks come last and go unpaid.
- **The Belfry** is the most dramatic set (the storm, the drop, the bell, the bodies of those who climbed before), and **Saint Silence** is the hardest fight.

### 7.7 Ending and post-game

- **Ending:** about 16 seconds of dawn and four lines, then tap-through credits. Satisfying as an image, brief as a resolution.
- **Post-game:**
  - CONTINUE returns to the night Belfry.
  - The MAP offers cleared districts for embers.
  - No new content, epilogue or changed world.
  - Each warden's level can still be raised, and every warden can replay any district.

### 7.8 Does the story give players reasons to continue?

One strong reason (get to the bell and bring the dawn) and steady curiosity about each new place. The boss titles add questions late. There are no characters to care about, no reveals and no rewards in story form. **Most of the pull is mechanical and visual**: new districts, new foes, new gear, a stronger warden. That is enough for a short action game, and thin for a premium narrative one.

---

## 8. FUTURE STORY POTENTIAL

These are opportunities only. Every item builds on something already in the game and would need the creator's decision before it became canon.

### 8.1 Additional chapters

- **"City of a hundred bells":** only one bell matters now. The other bells (the fallen west-tower bell and the bell on its side in the Nave, the chapel bell-cote at Gallows Gate, the bells in the Foundry's pits) are natural hooks for side districts or optional goals.
- **Unused routes:**
  - the belfry stair in the Nave;
  - the lighthouse in the Docks' fog;
  - the Old Road behind the wardens: where they came home from;
  - the lower city seen from the Heights and the Belfry.

### 8.2 New characters (from existing seeds)

- **The first lamplighter** (the Haven statue), the **merchant** who could finally appear in the Haven, and the **fallen house** behind the Heights' banners.
- **The wardens themselves:** each has a hook in their own text:
  - Carmine and the WARDEN'S BLADE;
  - Vesper "FROM THE ROOFTOPS";
  - Bram, a foundry hammer and the Bell Foundry;
  - Sister Ash, the lamplighters' Haven and Mother Tallow's candles.
- **The Haven is the obvious stage** for short lines between districts.

### 8.3 New foes and bosses

- **The Bell Wardens:** explaining them is the biggest single opportunity (a decision for the creator, not proposed here as canon).
- **The Rat King**, named by a relic and never met.
- **The buyer of the night** implied by the Heights.
- **"Those who climbed before"** on the bell platform.
- **Districts with flavour but no matching foe:** for example Lantern Row has no Tallow Bombers.

### 8.4 DLC and expansions

- **The morning after:** a dawn version of the districts (the ending's grade already exists) where the Hushed lift their heads. This answers the open question of what the ending changes and gives a post-game.
- **Another silence:** another city or bell beyond the Old Road.
- **The order's past:** what the bell-wardens were before the hundred nights.

### 8.5 Cheap fixes inside the current structure

- Call the bell's existing `ring()` in the ending and give the player a "ring the bell" action.
- Show Hushed lifting their heads.
- Give each boss one line at the intro and one at death.
- Add short Haven lines after each district.
- Tie each boss's drop to their district (Founder's Maul from the Bellfounder, Drowned Pearl from the Nave).
- Give relics one line of lore each.
- Replace the placeholder credits.

---

## 9. FINAL STORY ASSESSMENT

| Category | Score |
|---|---|
| Originality | **6/10** |
| Character development | **2/10** |
| Worldbuilding | **6/10** |
| Emotional engagement | **3/10** |
| Story consistency | **5/10** |
| Connection to gameplay | **5/10** |
| Narrative completeness | **3/10** |
| Ending quality | **4/10** |
| Expansion potential | **8/10** |

**Originality: 6/10.** Several ideas are genuinely appealing and hang together: a city's bell that brings the sun, silence as the curse, citizens with "NO VOICES NOW. ONLY EYES." The names are memorable: Bellmourn, the Hushed, Saint Silence, Mother Tallow, the Pale Regent "Who Sold the Dawn". The genre frame (a gothic rain-soaked city, returning order of wardens, bonfire-like checkpoints, keeper bosses) is familiar, and the presentation adds nothing structurally new to it.

**Character development: 2/10.** The four wardens are a name, a title and a one-line blurb each. They have no lines, no past, no relationship and no change. Bosses have titles and no motive. Sister Ash's arrival is a menu toast. There is no character development to assess; the game carries its cast through looks and kits alone.

**Worldbuilding: 6/10.** This is the game's real narrative strength, and almost all of it is environmental: the empty ship with its green lantern, the drowned cathedral with its teal candles, the Ossuary's names, the casting pit, the fallen house's banners, the bodies on the bell platform. The districts form a believable city and route. But much of the lore lives in code comments the player never reads, and the written lore is a handful of lines that raise questions and answer none.

**Emotional engagement: 3/10.** The opening and the dawn are moving as images and sound. Between them there is nobody to care about and nothing at stake beyond the premise. The best emotional material, the Hushed as the city's own people, is undercut by killing them for currency.

**Story consistency: 5/10.** With so little text there is little room for contradiction, and the motifs (bells, silence, light, rain) stay consistent. The real breaks are:

- Bell Wardens as enemies of the last bell-wardens;
- the "last fire" in a burning city;
- two unreconciled explanations for the silence;
- the unmotivated detour past the belfry stair;
- a dawn that does not last into the post-game.

**Connection to gameplay: 5/10.** Lamps, embers, the Haven's fire and the final dawn all express the core image of carrying light through the night, and the Gaoler's keys opening the gate is a neat link. But progression has no narrative meaning, unlocks are unexplained, drops ignore place, the climax has no action (the bell is never rung by the player), and the kill-for-embers loop works against the ending's mercy.

**Narrative completeness: 3/10.** The game has a beginning (seven cards) and an end (four lines) and almost nothing between: eight taglines, boss titles and hints. The central questions (why the bell stopped, who Saint Silence is, what the Hushed are, who the wardens are, who sold the dawn) are all raised or implied and none is answered.

**Ending quality: 4/10.** The dawn grade, the fading rain and the choir make a beautiful last image, and it closes the premise. But it is about 16 seconds of text over a still bell, with no character moment, no visible recovery of the Hushed, no answer to the boss titles, and a post-game that returns to night.

**Expansion potential: 8/10.** The premise, the city and the boss titles are full of open doors: a hundred bells, the order of wardens, the Bell Wardens, the buyer of the night, the lamplighters, the fallen house, the climbers before, the morning after. The existing systems (district cards, the Haven, boss intros, the dawn grade) can carry far more story with little new technology.

### Greatest strengths

1. **A clear, evocative premise in seven lines.** The silent bell, the endless night and the voiceless Hushed give a goal anyone understands at once ("RING THE BELL. BRING THE DAWN.").
2. **Strong, consistent motifs:** bells, silence, light against night, rain. The names and the art carry them throughout.
3. **Environmental storytelling.** Every district is a coherent place with implied history, and a geographic arc runs from the gate to the bell.
4. **Memorable bosses.** Their titles do a lot of work in a few words, and the late ones ("WHO SOLD THE DAWN", "WHO POURED THE SILENT BELL") hint at a real plot.
5. **The Haven and the lamps** turn the upgrade loop into a ritual that fits the world.

### Biggest weaknesses

1. **No characters.** The wardens, bosses and the antagonist have no voice, motive or arc.
2. **No middle.** After the opening, the story goes quiet until the four-line ending.
3. **Unanswered central questions**, made sharper by the boss titles that raise them.
4. **Contradictions:** Bell Wardens as enemies, the "last fire", killing the Hushed for embers, the detour past the belfry stair.
5. **A climax without an action, an ending without a change.** The bell does not swing, the Hushed are not shown, and the post-game returns to night.
6. **Fragile delivery.** Most of the story lives in seconds-long toasts and skippable cards, and much of the lore is only in code comments.

### Before commercial release

1. **Decide the canon.** Write a short story bible: why the bell fell silent, what the Hushed are, who the bell-wardens and Saint Silence are, and how the Regent, the Bellfounder and Saint Silence connect. None of it has been decided or approved yet.
2. **Resolve the Bell Warden contradiction**, by renaming the foe or making it a deliberate, explained part of the story.
3. **Give the wardens a voice and a reason.** A line or two each at the Haven, and a real arrival scene for Sister Ash.
4. **Give each boss presence:** one line at the intro and one at death, and connect the late three to the central mystery.
5. **Make the climax an act.** A "ring the bell" action, the bell's existing swing animation, the Hushed lifting their heads, and a post-game that keeps the dawn (or explains why it does not).
6. **Address the Hushed tension.** Say what happens to the Hushed who fall, or reframe embers so the reward is not drawn from citizens.
7. **Motivate the route** (the belfry stair in the Nave) and **give the Haven a place** in the city.
8. **Fix the presentation details:**
   - placeholder credits;
   - internal skill ids on the select screen;
   - "ULT RAIN" and "ULT TOLL";
   - stale "District III/IV" comments and README text;
   - hints that a district card can hide.
9. **When the planned changes land** (auto-lighting lamps, a cleaner select and menus, a redesigned Haven menu), keep a ritual moment at the lamps and the fire. They are the game's best link between play and story.
