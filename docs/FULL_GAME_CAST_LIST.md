# Tower of Wishes: full cast list for the character creator

**Every character, monster and being in the whole game,** in story order (from the 430-event inventory), with the animations each needs.

**How to use this:**
- Build the characters marked **YES** in the *Fantasy Character Creator*.
- **Export every animation and direction the tool offers**, and name each export after the **ID** column (e.g. `kael.zip`).
- I map the tool's animation names to the game's fight states, so don't worry if its names differ from mine.

**Can the creator make it?**
- **YES**: a normal person (humanoid). Build it in the creator.
- **PARTLY**: a person with something the tool may not have (wings, horns, bone arms, glowing parts). Get as close as you can; I add the rest in code (glow, effects, colour), or it needs custom art later.
- **CREATURE**: a monster or creature. **Build it in the creator if it has a matching creature body**; otherwise it needs a monster pack or custom pixel art. See section E for every creature's look and animations.

**Looks:**
- **[canon]**: from the author's sources (Eiryn's official sprite, the book's descriptions).
- **[current game]**: the stand-in look the game draws today. Use it unless you want to change it.
- **OPEN**: never decided. Your call.

---

## A. Animation sets (each character points to one of these)

| Set | For | Animations to export (priority order) |
|---|---|---|
| **HERO** | the 6 playable heroes | idle; walk; run; attack (all melee attacks the tool offers, so I can chain 2–3 as a combo); cast or shoot (casters); block/parry; dodge/roll; hurt; knockdown/fall; get up; death/defeated; plus, if the tool has them: sit, talk/gesture, pick up, victory, jump |
| **FIGHTER** | human enemies and duellists | idle; walk; run; attack (their weapon); hurt; knockdown or death; dodge (quick types); block (knights) |
| **NPC** | townsfolk, patrons, staff | idle; walk; talk/gesture; sit (tavern and inn people); run (crowds that flee) |
| **CREATURE** | monsters and bosses | idle; move (walk / crawl / fly); attack (each attack listed in section E); hurt; death; plus the special moves listed per creature |

**Directions:** export **all directions** the tool supports. The game needs front, back and side at minimum; it mirrors left/right. 8 directions is ideal.

**Weapons:** if the tool lets the same character hold different weapons, export a version for each one listed.

---

## B. The six heroes (HERO set, highest priority)

| # | ID | Who | Creator? | Look | Weapons / extras |
|---|---|---|---|---|---|
| 1 | `eiryn` | **Eiryn**: ancient glyph mage, 150 years out of time | YES | **[canon]** long silver-white hair with small side braids, green eyes, black-and-green fitted tunic with high collar, belt with pouch, black leggings, tall green boots. Match `assets/characters/eiryn/eiryn_base.png` | Unarmed caster: cast / push (Pressure). A version holding a broken **branch** (bandit fight). |
| 2 | `kael` | **Kael**: Guild swordsman | YES | **[current game]** spiky dark hair, light-blue eyes, dark navy coat over light armour, one shoulder plate (left), brown boots and strap | **Sword** (sword on his back when sheathed). An **unarmed** version (he loses his sword to the sky beast and fights with his fists). Later the **Sword of Calamity** (look OPEN). |
| 3 | `aerys` | **Aerys**: Light user; floats and flies; hunted for her blood | PARTLY (flying) | **[current game]** long pale-gold hair, gold eyes, cream-white dress / tunic with skirt, gold belt, dark leggings | Unarmed caster: Light bolts, **Spear of Light** (thrown). A **hover/fly** pose if the tool has one. |
| 4 | `nox` | **Nox**: assassin, Shadow Step (short teleports) | YES | **[current game]** messy black hair, violet eyes, black coat and scarf, all dark | **Twin daggers.** Quick attacks. The vanish and reappear effect is done in code. |
| 5 | `braxen` | **Braxen**: hybrid, enormous strength | PARTLY (altered arm) | **[current game]** big build, short dark hair, gold eyes, grey sleeveless top, bare arms. His **right arm is altered** (pale with bone ridges) | **Fists.** Brass knuckles later. After Floor 1: a **frost-scarred** version. |
| 6 | `eloryn` | **Eloryn**: healer (the inventory's "Eleanor") | YES | **[current game]** brown hair in a messy ponytail, green-grey eyes, grey-brown dress with arm wraps, satchel | Unarmed healer: heal / cast, a weak push. |

---

## C. Everyone else, in story order

### 00: Before the Reset (prologue)

| ID | Who | Creator? | Set | Look / notes |
|---|---|---|---|---|
| `alric` | **Alric**: Eiryn's love; vampiric strength | YES | HERO (moves) + NPC | **[your 3D model]** messy black hair, black coat with a short dark-red cape and silver clasps, red high collar, black gloves and boots. Needs run, jump and catch poses. |
| `alric_beast` | **Alric's beast form** (shields her from the fire) | CREATURE | CREATURE | **OPEN design.** Transform, braced shield pose, takes the hit. |
| `climber` | **The unknown climber** (anonymous) | YES | FIGHTER (+ dodge, block) | **[current game]** hooded, face hidden, pale cape torn at the hem with red trim, dark clothes, **broken greatsword**. Wounded. |
| `fragment` | **Fragments** (what the climber fights) | CREATURE | CREATURE | Shapes of light and shadow; can stay as code effects (recommended). |
| `summit_presence` | **The summit presence** (never shown whole) | CREATURE | CREATURE | Code effect (recommended). |
| `erdra_m1`, `erdra_m2`, `erdra_f1`, `erdra_f2` | **Erdra townsfolk**, the old city (men and women) | YES | NPC + run (panic) | Ordinary city clothes from **before** the Reset (older style). |
| `erdra_vendor` | **Street vendor / baker** | YES | NPC | Apron. |
| `erdra_musician` | **Musician** at the fountain | YES | NPC | With an instrument if the tool has one. |
| `erdra_child` | **Child** | PARTLY (if the tool can make children) | NPC + run | |

### 01: Kael and the bandits

| ID | Who | Creator? | Set | Look / notes |
|---|---|---|---|---|
| `spearwoman` | **Kael's table companion** (keep or cut: OPEN) | YES | NPC (sit) | **[current game]** auburn ponytail, leather armour, **spear**. |
| `ashgate_m1`, `ashgate_m2`, `ashgate_f1`, `ashgate_f2` | **Ashgate tavern regulars and townsfolk** | YES | NPC (sit, drink, eat) | Newer clothes than Erdra; tunics, vests, some with sword or armour. |
| `tavern_keeper` | **Tavern keeper** (OPEN, optional) | YES | NPC | |
| `bandit_broad` | **Broad-shouldered bandit** (heavy brawler, the fight's boss) | YES | FIGHTER (fists) | **[current game]** big, bald, bare arms with hand wraps, brown vest, red sash. |
| `bandit_knife` | **Knife bandit** (quick, feints) | YES | FIGHTER (+ dodge) | **[current game]** lean, messy black hair, red scarf, **knife**. |
| `bandit_grabber` | **Grabber bandit** (goes for Eiryn) | YES | FIGHTER (fists) | **[current game]** green-grey hood and clothes, red belt. |
| `bandit_lookout` | **Lookout** (hangs back, runs) | YES | FIGHTER (no weapon) | **[current game]** grey clothes, short brown hair. |

### 01–02: Ashgate and the first contract

| ID | Who | Creator? | Set | Look / notes |
|---|---|---|---|---|
| `guard_gate` | **Gate guard** | YES | NPC | Town guard: helmet, spear or sword. |
| `guard_officer` | **Older guard** (issues the magic fine) | YES | NPC | Older, officer insignia. |
| `registrar` | **Guild registrar** | YES | NPC (sit at a desk) | Clerk clothes. |
| `evaluator` | **Guild evaluator** (Eiryn's test) | YES | NPC | |
| `shopkeeper` | **General store keeper** | YES | NPC | Apron. |
| `miller` | **The miller** (contract giver) | YES | NPC | Work clothes, flour-dusted. |
| `goblin` | **Goblin** | CREATURE (goblin body) | FIGHTER (knife) | **[current game]** small, green skin, big ears, scraps of leather, yellow eyes. |
| `goblin_spear` | **Goblin spearman** | same | FIGHTER (spear) | Leather armour, red sash. |
| `goblin_archer` | **Goblin archer** | same | FIGHTER (bow) | Hood, quiver. |
| `goblin_hexer` | **Goblin hexer** | same | FIGHTER (cast) | Hood, ragged cape, hex stick, purple glow. |
| `ogre` | **The Ogre** (boss) | CREATURE | CREATURE | **[current game]** huge, grey-stone skin, tusks, carries a wooden beam. Sweep, overhead smash, ground slam, grab-and-throw, stagger, dies against the wall. |

### 03: Aerys and the sky beast

| ID | Who | Creator? | Set | Look / notes |
|---|---|---|---|---|
| `sky_beast` | **The sky beast** (Skyreaver) | CREATURE | CREATURE | **[current game]** large winged beast, brown-red hide, bone ridges, gold eyes. Fly, swoop, crash-land, ground brawl, death. |
| `rival_kid` | **The rival kid** (recurring; survives) | YES | FIGHTER (+ dodge) | **OPEN look.** Later an **enhanced** version (forbidden enhancement, TW-288) |
| `sword_smith` | **Sword-shop owner** | YES | NPC | |

### 04: Nox's introduction and the Nightcrawler

| ID | Who | Creator? | Set | Look / notes |
|---|---|---|---|---|
| `nox_target` | **Nox's contract target** (the apparent older victim) | YES | NPC (cowering, falls) | Older man. |
| `guild_adventurers` | **Guild Hall adventurers** (background) | YES | NPC | 2–3 varied fighters. |
| `nightcrawler` | **The Nightcrawler** (game-approved creature) | CREATURE | CREATURE | Design OPEN. Two health-threshold phases; Nox's eye-strike finisher. |

### 05: Mountain pass and the Labyrinth City (seven depths)

| ID | Who | Creator? | Set | Look / notes |
|---|---|---|---|---|
| `labyrinth_citizens` | **Labyrinth City people**, rich to poor by depth | YES | NPC | 4–6 bodies, colourways by depth. |
| `merchant_recurring` | **Recurring merchant** (OPTION) | YES | NPC | |
| `caged_creature` | **The escaped caged creature** (Depth 3) | CREATURE | CREATURE | Species OPEN (inventory candidates need your approval). |
| `cassius` | **Cassius** (boss; Kael fights him) | YES | FIGHTER (+ block, dodge) | Look OPEN. |
| `lyra` | **Lyra** (boss; fights with two golems) | YES | FIGHTER (cast) | Look OPEN. |
| `golem` | **Lyra's golems** (×2) | CREATURE | CREATURE | Stone/construct. |
| `demon_dealer` | **Forbidden demon-contract offerer** (Depth 6) | YES | NPC | Look OPEN. |
| `hooded_follower` | **Hooded follower** (turns out to be the rival kid) | YES | NPC | The rival kid in a hood. |

### 06: Ruined hamlet, Braxen, Nox returns

| ID | Who | Creator? | Set | Look / notes |
|---|---|---|---|---|
| `hamlet_predator` | **Predators attacking the hamlet** | CREATURE | CREATURE | Species OPEN. |
| `night_creature` | **The creature drawn by healing** (separate from the Nightcrawler) | CREATURE | CREATURE | Design OPEN. |
| `hamlet_people` | **Hamlet villagers** | YES | NPC | Poor travellers. |

### 07: Beast Folk country, the dragon, Aerys's abduction

| ID | Who | Creator? | Set | Look / notes |
|---|---|---|---|---|
| `beastfolk_m`, `beastfolk_f` | **Beast Folk villagers** | PARTLY (ears, tails) | NPC (+ FIGHTER for sparring and arm-wrestling) | Design OPEN. |
| `beastfolk_child` | **Crying Beast Folk child** | PARTLY | NPC | |
| `elder_dragon` | **The Elder Dragon** (boss; grieving) | CREATURE | CREATURE | Huge. Arrive, attack the village, die. |
| `frost_assassin` | **Frost assassin**: Nox's old Markers Covenant peer, frost/ice | YES | FIGHTER (+ dodge, cast ice) | Look OPEN. Boss vs Nox. |

### 08: Tornado Country and the Black Knight

| ID | Who | Creator? | Set | Look / notes |
|---|---|---|---|---|
| `black_knight` | **The Black Knight** (boss; scatters the party, isn't killed) | YES | FIGHTER (+ block) | Full black armour. Look OPEN. |

### 09A–C: The three duo journeys

| ID | Who | Creator? | Set | Look / notes |
|---|---|---|---|---|
| `gothic_knight` ×3 | **Three Gothic knights** (formidable, not villains) | YES | FIGHTER (+ block) | Gothic plate armour, 3 variants. |
| `gothic_people` | **Gothic kingdom people** | YES | NPC | |
| `shared_enemy` | **The powerful enemy Kael and Nox face together** (TW-249) | ? | ? | **OPEN:** not described in the inventory. |
| `canal_guards` | **Canal authorities / guards** (Eiryn and Eloryn arc) | YES | NPC + FIGHTER | |
| `guild_staff` | **Guild staff** (the Aerys and Braxen arc, Guild damage) | YES | NPC | |

### 10: Coastal tournament

| ID | Who | Creator? | Set | Look / notes |
|---|---|---|---|---|
| `tournament_fighters` ×4–6 | **Tournament competitors** | YES | FIGHTER | Varied weapons; looks OPEN. |
| `tournament_host` | **Announcer / officials** | YES | NPC | |
| `coastal_crowd` | **Spectators** | YES | NPC | |

### 11: The rival kid, Tower City, the last camp

| ID | Who | Creator? | Set | Look / notes |
|---|---|---|---|---|
| `rival_kid_enhanced` | **Enhanced rival kid** (boss) | PARTLY (unnatural abilities) | FIGHTER | The rival kid + corruption effects (code). |
| `tower_city_people`, `climbers_friendly` | **Tower City people and friendly climbers** | YES | NPC | |

### 12–19: The Tower

| ID | Who | Creator? | Set | Look / notes |
|---|---|---|---|---|
| `frost_knight` | **Frost Knights** (Floor 1 trials) | YES | FIGHTER (+ block) | Icy armour, mist. |
| `master_knight` | **Horned Master Knight** (Eiryn's flagship duel) | PARTLY (horns) | FIGHTER (+ block) | Horned helmet. |
| `dead_climber` | **Dead climbers** (Floor 1) | YES | static pose only | Lying poses. |
| `calamity` | **Calamity** (Floor 2 boss, vertical arena) | CREATURE | CREATURE | Plus **fire and water creatures** (adds). |
| `calamity_add_fire`, `calamity_add_water` | **Calamity's adds** | CREATURE | CREATURE | |
| `altheryx` | **Altheryx, the Crownless King**: a real climber who lost his companions (Floor 3 boss) | YES | FIGHTER | Look OPEN. Takes Eloryn as the fifth sacrifice. |
| `floor4_alric` | **Alric manifestation** (vs Eiryn) | reuse `alric` | FIGHTER | |
| `floor4_eloryn` | **Eloryn manifestation** (vs Kael) | reuse `eloryn` | FIGHTER | |
| `aerys_brother` | **Aerys's older brother manifestation** | YES | FIGHTER | Look OPEN. |
| `nox_brother` | **Nox's younger brother manifestation** | YES | FIGHTER | Look OPEN. |
| `braxen_human` | **Braxen's fully human self** | YES | FIGHTER | Braxen without the altered arm. |
| `guardian` | **The Guardian** (Floor 5) | ? | ? | **OPEN:** choreography and look undecided. |

### Optional wildlife (only if you approve the designs; all creatures)
Knucklehen, Claspcrab, Land Mantis, Vesperant, Shorebreaker, Veilmaw, Twinsnare.

---

## D. Totals and order

| Group | Count | From the creator |
|---|---|---|
| Heroes | 6 | 6 (Aerys and Braxen partly) |
| Named supporting characters (Alric, the climber, the rival kid, Cassius, Lyra, the frost assassin, the Black Knight, Altheryx, the brothers, Braxen's human self) | ~12 | ~12 |
| Generic human enemies (bandits, guards, knights, tournament fighters, Frost Knights, Master Knight) | ~20 | ~20 |
| Townsfolk and NPCs | ~30 bodies / colourways | ~30 |
| Monsters and bosses (goblins, Ogre, sky beast, Nightcrawler, creatures, golems, dragon, Calamity, adds, Alric's beast) | ~19 | as many as the tool has bodies for (section E) |

**Build order:**
1. **Kael:** the test character. Send me his export first.
2. Eiryn (only if you want her in pixel art too: decide whether pixel art replaces her current anime sprite).
3. The rest of the heroes.
4. Alric and the climber.
5. The bandits.
6. The Ashgate townsfolk.
7. Then by story order.

**Decisions this raises:**
- **Pixel art for the whole cast?** That means replacing Eiryn's current anime sprite too, so everyone matches.
- **Monsters the tool can't make:** a monster pack, custom pixel art, or code-drawn for now.
- **The OPEN looks:** decide them as each character comes up.

---

## E. Creatures and monsters: build these in the creator if it has the bodies

**Tip:** check the creator's body / race list for these kinds of body: goblin, orc / ogre, troll, beast or wolf, lizard / drake / dragon, bat or winged creature, insect, golem / stone, elemental, demon, undead / skeleton, slime. Use the closest body, then recolour.

### What every creature needs
- **Every creature:** **idle**, **move**, **attack**, **hurt**, **death**.
- **The bosses** also need: **stagger** (a big flinch), plus their special moves listed below.

| ID | Creature | Story | Closest body to try | Look | Attacks and special animations |
|---|---|---|---|---|---|
| `goblin` | **Goblin** | 02, the mill contract | goblin | small, green skin, big ears, yellow eyes, leather scraps | knife stab; flee (the last survivor runs) |
| `goblin_spear` | **Goblin spearman** | 02 | goblin + spear | leather armour, red sash | spear lunge |
| `goblin_archer` | **Goblin archer** | 02 | goblin + bow | hood, quiver | draw and shoot (arrow drawn in code) |
| `goblin_hexer` | **Goblin hexer** | 02, cave | goblin, caster | hood, ragged cape, hex stick, purple glow | cast |
| `ogre` | **The Ogre** (boss) | 02, TW-074–078 | ogre / troll / orc, large | huge, grey stone-like skin, tusks, bald, carries a wooden **beam** | wide **sweep**; **overhead smash**; **ground slam**; **grab and throw**; stagger; dies against a wall |
| `sky_beast` | **The sky beast / Skyreaver** (boss) | 03, TW-083–107 | winged beast / drake / wyvern | big, brown-red hide, bone ridges, gold eyes, membrane wings | **fly**; **dive / swoop**; **crash-land**; ground **bite and claw**; stagger; death |
| `nightcrawler` | **The Nightcrawler** (boss) | 04, TW-108–130 | crawler / insect / beast | **OPEN** (night predator; Nox strikes its eye) | **crawl**; lunge; claw; phase-change roar; death |
| `caged_creature` | **The escaped caged creature** | 05, Depth 3 | beast | **OPEN** species | pounce; claw; hurt; flee or death |
| `golem` | **Lyra's golems** (×2) | 05, TW-151 | golem / stone | stone construct | slow **slam**; **punch**; crumble (death) |
| `hamlet_predator` | **Hamlet predators** (pack) | 06, TW-170–171 | wolf / beast | **OPEN** | pack **bite**; pounce; death |
| `night_creature` | **The creature drawn by healing** | 06, TW-181–183 | beast / shadow | **OPEN** (not the Nightcrawler) | lunge; claw; death |
| `elder_dragon` | **The Elder Dragon** (boss) | 07, TW-206–208 | dragon | ancient, intelligent, grieving: colours **OPEN** | **fly / land**; **roar**; **fire breath**; **tail sweep**; **claw**; stagger; death |
| `calamity` | **Calamity** (Floor 2 boss) | 14, TW-330–334 | elemental / demon, large | **OPEN**: water streaming on its left, liquid fire on its right | **summon**; water attack; fire attack; phase change; death |
| `calamity_add_fire` | **Fire creatures** (Calamity's adds) | 14 | fire elemental | small | attack; death |
| `calamity_add_water` | **Water creatures** (Calamity's adds) | 14 | water elemental / slime | small | attack; death |
| `alric_beast` | **Alric's vampiric beast form** | 00, TW-031 | beast / demon / bat, large | **OPEN**: needs your description | **transform** (from Alric); braced **shield** pose; take hit |
| `fragment` | **Fragments** (the climber's foes) | 00, TW-019 | shadow / wraith / spirit | light and shadow, never solid | **blink in**; claw; dissolve (or keep as code effects) |
| `summit_presence` | **The summit presence** | 00, TW-019 | none (never shown whole) | code effect recommended | — |
| `wildlife` | **Optional wildlife**: Knucklehen, Claspcrab, Land Mantis, Vesperant, Shorebreaker, Veilmaw, Twinsnare | various | crab, mantis, bat, serpent, etc. | **OPEN**: only if you approve designs | idle, move, attack, hurt, death |

**Partly-creature people** (person body plus creature parts):
- **Beast Folk** (ears and tails);
- **Braxen's altered arm**;
- **the horned Master Knight**;
- **Aerys flying**;
- **the enhanced rival kid.**

Build them as people with the closest creature parts the tool offers.
