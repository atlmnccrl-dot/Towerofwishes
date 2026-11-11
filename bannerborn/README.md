# BANNERBORN

*Raise your banner. Earn your heroes. Shut the Gravegates.*

A new, original isometric action RPG about **building a team**. It is a separate game from Tower of
Wishes and Emberfall: own world, cast, story, code and art. It uses only the asset packs the author
supplied for it (the 2D Isometric fantasy pack, the 2D Desert Fantasy pack and the 144-character "horde"
cast), packed into `bannerborn/assets/`. Names, story and balance are proposals for the author.

**Play:** serve the repository root and open `bannerborn/index.html`
(`python3 -m http.server`, then <http://localhost:8000/bannerborn/>). Landscape; touch or keyboard.
Progress saves in the browser.

**Every day.** The *muster roll* at the camp: a small gift once a day, seven days round (100 crystals a week at
most; a missed day loses nothing). Inside the app, one notification if the player asks for it in Settings: the
camp's spoils are full. *Settings → Report for support* shows version, device, frame rate and the last errors,
kept on the device. The phone's back button (Escape in a browser) steps back through the game.

**Releasing on the stores.** The app is the same game wrapped with Capacitor (`app/`), with Google AdMob and
store purchases. Money buys time and quiet, never a fight: *Quiet March* (no ads), the *Captain's Chest* (once),
the *Quartermaster's Writ* (30 days of daily crystals) and five crystal packs, sold by the Treasurer at the
market; ads are optional for small bonuses, with one now and then between battles after the first road. What is
ready, what is not yet proven on a phone, and everything only the owner can do: [docs/RELEASE.md](docs/RELEASE.md).

## The game

Nine banners once stood between the living and the dead. Then the Gravegates opened, Vesh Morrow
began to sing, and the dead got up to listen. One banner is left, carried by a captain with no army.

A hero-collector RPG: you build the team, the team fights.

1. **Start alone.** The Captain is your only hero. Stages pay gold, crystals ◆, sigils ✧ and gear.
2. **Recruit.** The recruit screen shows the tier's gate — a stone arch with a vortex in its colour — with the heroes
   who answer it: one steps into the light every few seconds with its name and class, the rest wait as silhouettes.
   Crystals buy a random hero you don't own yet from an open **tier**; each tier holds ten
   heroes from the horde cast and opens when a chapter is cleared:

   | Tier | Opens | Cost |
   |---|---|---|
   | Common | at the start | ◆ 150 |
   | Rare | chapter 1 (Greenvale) cleared | ◆ 300 |
   | Epic | chapter 2 (the Sunscar) cleared | ◆ 600 |
   | Legendary | chapter 3 (Aldmere) cleared | ◆ 1000 |

   Six **legends** join the first time you clear their stage (Sera Nightveil 1-4, Ahmos 2-3, Kestrel 2-5, Brenna Redmane 3-1,
   Silas Grey 3-4, Talia Sunblade 4-1). Recruiting plays a summoning: energy gathers into a gate, the gate climbs
   through the rarity colours (blue, purple, gold) with flashes and shockwaves, bursts, and the hero steps out of the
   light as a silhouette that fills with colour. Then the camera pushes in, the gate falls back, and the new hero
   shows off their **signature move** with its own effect (a ground-pound shockwave, a meteor, chain lightning across
   the screen, a five-cut flurry, a pillar of light, a barrier dome, ...). The card after it is small: rarity, name,
   class and one line for the signature. Tap to skip ahead. The summoning is staged: rays turn behind the gate, the
   ground splits at its foot, lightning strikes once for each colour it climbs through, a beam joins it to the sky at
   the burst, embers rise and the hero's rarity burns at their feet. Beside it a small window (js/preview.js) shows
   the new hero **alone against one enemy in the real battle engine**: basic attacks, then the signature, then the
   ultimate finishes it, on a loop.
3. **Grow them.** A hero's own page is shot inside the muster: the camera closes in on whoever was called forward,
   lit in their rarity's colour while the ranks behind stand in shadow, their four pieces of gear on either side of
   them. Beside them, three leaves. **Growth**: the level in a ring of experience, stars and Ascend, health, attack
   and defence with what the next level adds, and the ultimate and signature with a ▶ that makes the hero perform
   them. **Gear**: the four pieces as plates with the real item art; a slot opens the armoury for it, where every
   piece in the bag that fits shows what it would change, stat by stat, and *Equip best* fills everything. **Skills**:
   the tree, three branches (Might, Bulwark, Ultimate) of linked nodes plus two bridge nodes and three
   capstones (Executioner, Undying, the ultimate's Mastery); one point per level, free reset. Equipping, learning and
   ascending are acted out by the hero in the scene. **Heroes level by fighting, not gold:** everyone who fights earns experience by their
   share of the work (damage, healing, blows taken), more on harder stages, some on a loss, faster when below the
   stage's level; the results show each hero's bar and level-ups (cap 10 + 10 per star; at the cap experience waits for
   the next star). Gold buys chests and sigils at the shop; crystals ◆ recruit heroes and buy a Smith's Masterwork weapon.
   **Ascend** ★ with sigils to raise the cap
   (up to 5 stars), gear in four slots (weapon, armour, helm, charm), found in stages and chests or bought at the shop, and changed
   on the hero's own screen. There is no forge: a piece is as strong as it drops (pieces forged in older saves keep
   their +N). Spare gear is sold at the shop.
   Rarity (Common → Legendary) multiplies every stat. **What a hero wears shows on them:** the Captain's armour and
   helm change their sprite; every hero glows in the colour of their best gear (brighter with forging); good weapons
   carry an **enchant** (fire embers, frost, storm arcs, shadow wisps, holy light, dripping venom) that swirls around
   the hero and makes their blows elemental. **You see the trait in battle** (js/traits.js): every swing leaves a crescent
   in its colours and every blow lands its own impact (a flame bloom, ice spikes from the ground, a bolt from the sky,
   a dark cross-cut, a pillar of light, a venom splash); storm chains arc to the next foe, holy heals send motes to the
   ally; burning, frosted, poisoned and rent foes show it on the body; enchanted shots trail their element. Venomous
   weapons poison, stacking three deep and ignoring armour; capstones add a mark (Undying's halo,
   Mastery's rune circle, Executioner's embers), and 4★ heroes sparkle. The same look follows them into battle.
3b. **Every hero is someone.** Each hero has a **class** — Guardian, Warrior, Assassin, Marksman, Mage or Healer —
   and each of the 102 recruits is dealt a mix nobody else has (js/identity.js): an **entrance** (walks out of smoke,
   drops out of the sky in a slam, a teleport strike, a lightning bolt, a pillar of fire, a pool of shadow, a war
   charge, a column of light, a block of ice, a leafstorm) played on the summoning and at the start of every battle;
   a **temperament**, their combat brain (Reckless, Cunning, Protector, Hunter, Duelist, Skirmisher, Brawler, Steady:
   who they go for and which moves they reach for); and a **signature move** that comes round every ten seconds or
   so (js/signatures.js): Whirlwind, Ground Pound, Blink Strike, War Cry, Shield Toss, Multishot, Snare, Chain
   Lightning, Meteor, Smite, Blood Rush, Pole Vault, Decoy, Flurry, Barrier. The legends and the Captain are written
   by hand. Their card and the hero screen describe all of it; the team screen shows which classes you have and what
   the team is missing.
4. **Formation.** Up to five heroes, **placed anywhere on the field**: press a hero (or the ring at their place)
   and drag. Heroes right of the dashed line fight in the front line (they draw the blows), the rest behind it,
   and the team marches and starts each battle in the shape you set. Tap a hero to select them and take them out;
   tap a roster card to bring one on or send one back. The team screen opens onto the land the campaign is in
   (the next stage's region) and the team's heroes live on it (js/drill.js): each keeps to their place, and between
   rests they train on straw dummies, spar in pairs, wander over to chat, stretch, and try out their signature.
   Nothing is drawn on the ground where a hero stands (a ring shows only under the one being carried or chosen);
   each hero's name follows them. The field has the team's fire and banner at the rear: archers and casters practise
   on the dummies from where they stand, healers mend, everyone takes a turn by the fire.
   On a phone the roster is a strip along the top of the side panel.
   **Bonds** reward mixed callings. *Auto-fill* puts the strongest five in place.
5. **Battle.** Heroes march as a column between fights and fight by role: the **tank** holds the front and
   peels foes off the back line; **assassins** wait unseen behind the tank, slip round the flank once the lines meet
   and backstab archers and casters; **archers and healers** hold a line behind the shields and fall back behind
   them when something reaches them. Enemies do the same: shields lead each wave with archers behind, enemy
   archers fall back behind their shields, and **Grave Stalkers** sneak in after your back line.
   **The exchange.** Melee is a read-and-answer duel. A fighter sees a blow wind up and **blocks** (a shield arc;
   most of the hit glances off, tanks sometimes strike back) or **parries** (a white flash: no damage, the attacker
   staggers with stars over their head, and a sure-critical **counter** lands). Bosses, elites, assassins, berserkers
   and monks **feint**: a fake swing baits the guard, then the real blow lands in the opening (**OPEN!**, extra damage).
   (The duel plays out without words on screen: no BLOCK, PARRY, COUNTER, FEINT or DODGE pop-ups, just the stagger,
   the knockback and the counter-strike.)
   Every foe has **poise** (the thin gold bar under its health, and under the boss bar); hits wear it down, parries
   and counters tear it, and at zero the foe is **BROKEN**: stunned, glowing, taking extra damage, and the heroes
   near it gain ultimate energy. **Teamwork:** a tank **covers** a soft ally by stepping into the blow; two heroes
   striking the same foe within a second **link** for bonus damage. Melee fighters **dash** across short gaps.
   High-level heroes (level 15+, 3★ or a legend) of the shadowblade, arcanist, ranger, monk and warpriest
   callings **teleport**: assassins blink behind their prey, archers and casters blink to safety; Grave Stalkers and
   phasing bosses blink too. Guard and parry rates grow with level and stars.
   **Tactics.** Every few swings, or when the moment calls for it, a fighter breaks off and does something you can
   see (js/tactics.js): a wounded hero **falls back and drinks a potion**; a tank or bruiser **sprints to the weakest
   ally**, shield-bashes the attacker sliding back and taunts everyone near; the healer **runs over and lays hands** on
   the worst-hurt (enemy casters *dark-mend* their own); fighters **grab a stone off the ground** (loose stones lie
   about the field) and lob it at an archer or caster — *BONK*, dazed; **kicks and shield bashes** send foes sliding;
   berserkers, monks, lancers and assassins **spring back, wind up and charge through**; reavers, beastkin and
   stalkers **pounce** from range; nimble fighters **roll** out of blows (*DODGE*) and the back line tumbles away from
   anyone on top of it. Blocks jar both fighters back a step; a parry throws the attacker back reeling.
   **Spectacle** (js/epic.js): slain enemies are launched spinning, bounce and burst into bone shards and dust; every
   melee hit cuts a crescent in the attacker's colour; heavy hits and crits freeze a beat and light the ground; tapping
   an ultimate stops time while a slanted band sweeps across with the hero and the skill's name slams in, then a
   shockwave; the last kill of a wave goes to slow motion (*WAVE CLEARED*); the next wave arrives with a war horn and
   the screen edge flaring red from its side (*THE TIDE RISES*); a boss arrives under letterbox bars with its name
   slammed in serif; chain kills call *CARNAGE*, *SLAUGHTER*, *MASSACRE*; embers, ash or blowing sand by land; a red
   heartbeat at the edges when a hero is near death.
   Four to six waves a stage, reinforcements arriving mid-fight, bosses calling adds as they weaken. Each charges an **ultimate** by fighting and taking hits;
   tap the glowing card (or 1–5) to unleash it with a cut-in, or turn on **AUTO**. 1×/2×/3× speed, pause.
   Maps keep the middle and the lanes between spawns open; fights run about 20–70 s at 1×.
6. **Campaign.** Each chapter is one long built stretch of land in the same engine, tiles and props as the
   battlefields (`BB.buildJourney` in js/world.js): a road winds across it and every stage is a real place on the
   road, built from the wall and roof kit: a hamlet of houses, a stockade, a ruined hall, a shrine ring with an open
   Gravegate, a fenced chapel to defend, the boss's keep at the end. The road twists, side routes branch off to
   outlying sites, and past the last stage it runs to a **ring** that leads on to the next land (shut until this one
   is won). The enemy waits at the stages not yet won; your banner flies where you have won; your team stands at
   the chosen stage and walks the road when you choose another. Drag to look along the road, tap a stage to choose it.
   Eight chapters, fifty-four stages. The first four (Greenvale, the Sunscar, Aldmere, the Cantor's Gate) are the
   war against the Cantor. The last four are **the far marches**, the gates his choir opened at the edges of the
   world: **the Frostmarch** (snow; Hroald, the Rime Jarl), **the Cinderfields** (burnt land, roads that still glow;
   Maelis, the Cinder Witch), **Mirefen** (drowned fen; Old Morwen, the Fen Mother) and **the Hollow** (blighted,
   violet; Aurelian, the Hollow King). Six stages each, enemy levels 28 to 47. Each land is its own place:
   - **its own dead**, the old kinds in the land's colour with the land's touch on every blow: Rime Reavers,
     Frostbound Wardens and Ice Seers *slow*; Ember Reavers, Cinder Wardens and Ashcallers *burn*; Bog Reavers,
     Fen Lurkers and Mossback Wardens *poison* (one stack, half strength); Hollow Reavers, Pale Stalkers and
     Blighted Wardens *feed on what they wound*;
   - **its own score and air** (js/audio.js `STYLE`, `BB.ambience`): bells and wind over the snow, heavy drums and
     cracking embers, a sparse line over a low wobble with drips and croaks, a wrong chord over a hum;
   - **its own ground**, painted with the tiles: drifts and bare ice, scorch and fissures that still glow, black
     pools, rings of pale caps; and its own weather (snow, cinders, spores, motes).
   - **its own growth**, made for it: clusters of ice shards, vents of black rock that still glow, tall glowcaps,
     blight pods, each with its own light (drawn in code, a pixel at a time, into an atlas of their own:
     `js/structures.js`).

   **What the dead build.** From chapter 2 on, where the horde holds ground (rout, gates and boss stages, not the
   first stage of a land, and not a boss fought by one or two heroes), it has built: one work for a team of one or
   two, two for a larger one, standing forward of what they guard, where the fight will be (a tower farthest out, a
   mortar well back), with sharpened stakes in front and the banner of the dead behind. All must fall before the field is won.
   - **Bone Watchtower**: quick arrows from the platform under a violet watch-fire that flares at each shot.
   - **Grave Mortar**: a slow shell at the thickest knot of heroes; its mark is drawn on the ground and there is
     time to step out (heroes do); the blast carries the land's touch.
   - **Hex Obelisk**: a standing shard with a carved rune and splinters turning about it; every few seconds a pulse
     runs out along threads to the dead near it, mending them and making them hit a fifth harder for a while.
   - **Brazier** (Cinder Brazier, Rime Brazier, Bog Censer, Blight Censer by land): burns in the land's colour and
     spits a patch under up to three heroes: fire, a slowing frost, a cloud of poison that lingers, or a draining blight.
   - **Bone Cage**: eyes between the bars; it rattles and lets one more out, three in all, unless it is broken first.

   **The lords of the far marches** each have one move nobody else has, and wear their land (a ring of its
   light, a crown of ice, embers, spores or shards turning about the head): **Hroald** walks a *glacier* out of the
   ground along a line, a wall of ice that bites, slows and stands a while; **Maelis** calls five *stones of fire*
   down one after another, each leaving a vent that keeps burning; **Old Morwen** makes the fen *bloom*, caps that
   swell beside the heroes and burst into her poison; **Aurelian** takes a *tithe*, a thread to every hero in reach
   that pays him in their blood for three seconds (`farMove`, `drawLord` in js/structures.js).

   Chapter 2 has towers (and a mortar later), chapter 3 mortars and towers, chapter 4 obelisks and cages, the
   Frostmarch braziers and towers, the Cinderfields mortars and braziers, Mirefen cages and censers, the Hollow
   obelisks with mortars or cages (`BB.defencesFor`; a stage can name its own with `defs`).
   Stage kinds:
   rout waves, destroy Gravegates, defend a ward against the clock, a duel and eight bosses with
   telegraphed moves and enrage phases. Each stage shows the recommended power next to yours.
7. **Camp.** Your chosen hero stands by the fire; the camp grows tents, a forge, a shrine and a
   market as the campaign goes on. **Spoils** gather while you are away (up to 12 h). **Goals**
   (seventeen milestones) pay crystals, gold and sigils. The **Shop** has a few offers a day.

**Places in the team are earned** (`BB.teamMax`, `BB.nextSlot` in js/rules.js). The banner starts with one place; a
second opens when 20% of the campaign's stages are won, then 40%, 60% and 80%, up to five (with 54 stages: after 11,
22, 33 and 44). Heroes can be many; who marches is the choice. Summons come slower to match: fewer crystals from
stages, goals and the daily gift, and the first two gates cost more.

**The horde is sized to the team** (`BB.TEAM_K`): by the number of heroes who march, how many foes a wave brings,
how hard they hit, their health, a boss's and a gate's health, how many gates a stage has and how many foes each
keeps on the field, how often an elite comes, how many adds a boss calls, and how long a wave waits for the last one
to thin. A lone hero meets a fifth of the crowd, hitting at 40%, and a boss at a tenth of its health. `node
test/sim-node.js all 3` plays every stage with as many heroes as the campaign has opened places for by then (the
simulator used to leave the team out, so its hordes were always the smallest; it now passes it, as the game does).

Losing costs nothing (and still teaches your heroes): change gear or the formation and fight again.

**After and around the campaign**
- **The War Chest** (first on the shop's table): gold raises the banner's rank, thirty ranks, each +1.5% attack and
  health for every hero. It is where gold goes once the day's offers are bought.
- **Relics**: each lord of the far marches leaves one on the first victory, a named Legendary charm half again as
  strong as any that drops. The far marches also pay more sigils.
- **The Endless Gate** (at the camp once chapter 1 is won): waves without end at the team's own level, a boss every
  fifth. It ends when the banner falls and pays by waves held: gold, experience, a sigil every five waves, gear,
  and crystals for ground never held before. The best wave is kept.
- **The story's two codas**: after the Cantor, *the far marches* (why the war goes on); after the last gate, the
  ending. Both are in Development.
- **How to play** (Settings, and once after the first victory): nine short paragraphs.
- **Back up or move a save** (Settings): the whole save as a code to copy somewhere safe or paste on another
  device. Restoring asks first.
- **On a home screen**: a manifest and icons (`manifest.webmanifest`, `assets/icon-*.png`), so a hosted copy can be
  added to a phone's home screen and open full-screen in landscape. There is no offline cache yet.

| Callings | Role | Ultimate |
|---|---|---|
| Vanguard | Tank | **Shield Wall** — taunt, halve damage |
| Berserker | Bruiser | **Ravager Leap** — leap and smash |
| Ranger | Marksman | **Arrow Storm** — rain on a crowd |
| Arcanist | Caster | **Dragonbreath** — cone of fire (mages carry an element) |
| Warpriest | Healer | **Sanctuary** — heal and cleanse |
| Monk | Striker | **Whirlwind Kick** — spinning leap, scatters foes |
| Shadowblade | Assassin | **Shadowstep** — reappear behind a foe, sure critical |
| Lancer | Skirmisher | **Impaling Charge** — spear everything in a line |

**The trailer** (js/trailer.js; *Watch the trailer* on the title, and first in Development): under a minute, cut
from the game itself on the beat of the boss drums. A Gravegate in the dark, the camp, a Legendary summoning, three
live battles (a full-strength team already in the thick of it: Greenvale, the Sunscar, the Frostmarch under snow),
the first land from above, the Pale Regent, a run of one-beat cuts, the name. Every line of text, the letterbox and
the cuts are drawn from the trailer's own clock, so it can be stepped a frame at a time: `tools/record-trailer.js`
records it to an mp4 (1280×720, 30 frames a second) with its sound, which is not captured but rendered: while
recording, every sound the game asks for is written on a tape with the film's time and played into an offline
audio context afterwards (`BB.audioClock`, `BB.audioRender` in js/audio.js).

**Menus.** The title is a battle that never ends, in the real engine: a full warband (your own strongest five once
you have a save, a showcase five before) holds a ring of ruins at night while the Gravegates keep rising and
breaking, ultimates and signatures going off, with the fight's bars and words left out and its sounds silenced
under the battle music. It opens from black on a slow pull-back; your banner drops in and sways, the letters of
the name slam down one after another with a flash, a light keeps passing across them, and the one button (*Raise
the Banner* or *Continue*, with where you left off beneath it) pulses at the foot of the screen
(`buildTitleFight` in js/main.js; the fight is held at early waves and a fixed level so it never piles up). **Heroes** is a place, *the muster*:
every hero you own stands in ranks under your banner at night, between four torches (the strongest in front; the
ranks and the camera size themselves to the roster and to the open part of the page). The chosen hero steps out in
front of them into a light of their rarity's colour; tap a hero in the ranks or a card in the list to call them
forward, tap again (or *Open*) for their screen. **Shop** is a place too, *the market*: an open square at night
with a trader at each station under their own light. The Smith (anvil, forge, the stall of blades: Armory Chest and
Smith's Masterwork), the Quartermaster (the red tent and your banner: the War Chest, and *Spare Gear*, which buys
what is in the bag), the Gem-Trader (the blue stall: the day's free crystals and the Crystal Purse) and the Seer
(the violet canopy and the standing ring: sigils, and the way to the recruiting gates). A name plate floats over
each, with a red dot when they hold a gift or something you can pay for. Tap a trader or their plate: your own hero
walks over, the camera closes in and their wares come up beside them; tap the square to step back. These places
are scenes in the battle engine (`BB.sceneFor(tab)` in js/main.js builds them once and swaps them in behind the
page; `scene.viewOff` puts a scene off-centre, `scene.closeK` sinks every light but one hero's). **Battle start**: while the field loads, a *versus* card slams in (your heroes and power on the blue side,
the enemy's faces and the power needed on the red, the stage's name and objective), then parts down the middle
onto the fight. Menu animation is transform/opacity only, and the small glass pieces no longer blur what is behind
them.

Settings: music, effects, screen shake, damage numbers, graphics, **Start a new game** (asks first; it erases the
save), and **Development** (temporary, for building
the game): watch any moment without playing to it. *Live* tiles play the real game with a full-strength team in a
sandbox (a throwaway save that is never stored; leaving a battle returns to the list): each boss fight from entrance
to fall, ultimates back to back, signature moves non-stop, weapon traits, the last horde, a fight on the edge, and
each land's team field. **The bot** plays the game by itself in a throwaway save, through the same screens a
player uses (camp, shop, recruiting gates, heroes, team field, campaign, the fight on AUTO): the whole game at 2×,
the same at 3× with cutscenes skipped, or the far marches with a full-strength team. A bar shows what it is doing,
with a speed button and Stop; after two defeats at a stage it trains on the one before, after nine it stops. Its
log (every stage with time, team level and power against what was asked; every recruit, purchase and goal) is shown
in Development afterwards, and reads as a balance report. The rest are cutscenes (the opening, chapter openers, boss entrances and falls) and
summonings (every rarity, every legend, every signature move, every entrance).

Sound: monster voices from Ririsaurus' *Fantasy Monsters*, *Dinosaurs* and *Abyssal Horror SFX Vol.1* packs
(assets/sfx, trimmed and compressed; credited in Settings): wargs for beastkin, a serpent's hiss for stalkers,
giants for the Bonewardens and Ossric, deep ones for wraiths, Sallow, the Regent and Vesh, dinosaur bellows for
enraged bosses, abyssal rumbles for the Gravegates. Everything else is synthesised.

**Cutscenes** instead of dialogue (js/cinema.js, skippable, one subtitle line per shot). Every shot is close and
graphic, never from the game camera: slanted close-up panels of faces in coloured light, silhouettes that light up,
three-face panels, a wall of skull faces, screen-filling gates with lightning and rain, great banners against the
sky that topple in fire, VS splits, black-and-white impact frames and title slams, with sparks, embers, smoke, shake
and letterbox. Cutscenes are cut like a trailer: serif kinetic type that lands word by word (a key word burning red), shots graded to
black-and-white manga contrast or one colour against black, giant words behind the characters, flash-cut montages
with glowing eyes, a tiny figure against an enormous moon, an eye that opens into rings, knights crumbling to ash, a
title whose letters fly together and slam — over a synthesised trailer score (a low drone, risers, braams, sub hits,
clock ticks under the words). The opening is a film of its own (js/opening.js, below). Every other cutscene is shot in its own style, one per reference the author sent: **Ossric** in a torch-lit crypt
arena, a crowd of the dead chanting his name on the beat until he roars; **Kestrel** in darkness full of golden dust —
a single spotlight, a red-lit leap with motion smears, a face lit by one violet point of light; **Sallow** in one
unbroken take — his body blowing away as sand, dunes rushing below, a storm that opens an eye, a tunnel of gold
stars, his tomb at dusk; **the Pale Regent** as a neon dream — a HUD threat scan with glitch slices, his name spaced
across a pale moon, a fall through streaking stars; **Vesh** in black and white ink — morphing blots, scattered
letters, eyes in the dark, a white void. Chapter openers differ too: the Captain on one knee in the rain (*AND YET —
I MUST TRY*) rising with GREENVALE roaring behind him; a dune flyover for the Sunscar; Aldmere's burning skyline and
its refugees; an ink-black approach to the Cantor's Gate. Each boss dies its own way: Ossric shatters to stone,
Kestrel scatters as gold dust, Sallow blows away as sand, the Regent glitches out, Vesh drowns in ink.
Bosses open through their own gate in
their colour. Post effects sell the big beats: the screen cracks on impacts, the colour splits apart, film grain, rim-lit
silhouettes, sound rings off a singing mouth, embers that converge on the hero, and a slam zoom into an eye.
**The opening** (js/opening.js, ~64 s, skippable) is its own film: eleven shots, each in a different manner, with a
cast drawn for it. **None of the game's small sprites appear in it**: the art is made for the cutscenes
(js/cineart.js: nine knights told apart by helm and weapon, the Captain in several poses, three kinds of the dead,
Vesh Morrow, a skull), drawn at the size each shot needs and lit for it (dusk, moon, gate-light, fire, glass, ink).
1. *The ridge*: nine knights along a ridge at dusk, a banner over each, numbered I–IX; the camera walks the line to
   the ninth, which is yours.
2. *The oath*: from under the blades: nine swords come in from the edge of the frame and meet over the lens.
3. *The tear*: the picture rips top to bottom; violet light, cut threads whipping, and a skull looking back through.
4. *The gate*: from the grass, looking up. The head tips back and the pillars lean together; runes light from the
   ground to a skull keystone; the gate bursts, the dead run out past the lens, and Vesh walks out on the light.
5. *The Cantor*: a dolly zoom on a drawn portrait (hood, bone crown, rib collar, censer): the world rushes past him,
   his eyes light, his name is struck across the frame, his jaw drops and he sings.
6. *The song*: the vale from above as an inked map: staves roll out from the gate, veins spread under the ground,
   graves light, eight banner pins fall and are crossed out while a count of opened graves runs up; one pin holds.
7. *The rising*: five smash cuts (a hand of bones, eyes igniting, the ranks coming on under a red sun, three looking
   down, a ridge under the moon).
8. *Nine to one*: nine pointed windows of coloured glass, a knight in each; eight shatter, faster and faster, a skull
   left in each frame; the ninth banner's window cracks and holds.
9. *The ninth*: night, the Captain alone on a rise with the banner planted behind, the dead closing from both sides
   and the dark full of eyes; the push in, the blow (one white frame, everything on it black), the dead thrown back;
   the frame held with only the Captain in colour: THE NINTH BANNER IS YOURS; then more eyes open.
10. *Raise it*: dawn over the field, your banner driven into the knoll and let go on the wind; the sword goes up on
    the last word: RAISE YOUR BANNER.
11. *The name*: cut on a blade's line; the letters are struck one by one; a gold thread signs it.
The film brings its own painters (`shot.draw`) and uses the cutscene engine for timing, cues, bars, grain and
subtitles. Play it from Settings → Development → The Opening. The cutscene art is drawn by code, in a flat
graphic-novel manner; painted illustrations, if the game ever has them, would be image files the same shots can show. Bosses get an entrance the first time (gate, rise from shadow, impact,
name, their horde, the face-off, the clash) and a fall; chapters 2-4 open with your banner and the chapter's name.

## Code

| File | Role |
|---|---|
| `index.html` | page, styles, all screens and HUD markup |
| `js/data.js` | callings, legends, foes, gear, bonds, chapters and stages. Pure |
| `js/rules.js` | heroes, stats, levels and stars, gear, formation, tiers and recruiting, rewards, spoils, shop, goals, save. Pure (runs in Node) |
| `js/assets.js` | atlas loading, recolouring (dyes, skin, effect hues), paper-doll drawing, portraits |
| land skins (`BB.LANDSKINS`, `BB.loadLand` in `js/assets.js`) | the far marches have no art files of their own. A skin is the vale kit and the ground kit re-coloured sprite by sprite when the land is first entered (about half a second): snow, ash or moss laid on whatever faces the sky, tree crowns turned, stone cooled or charred, the ground's texture kept in new colours, cracks between paving stones lit. Every sprite keeps its name, so every map layout, building and journey of the vale works in a skinned land. The two lands most lately entered keep their art in memory |
| `js/world.js` | isometric projection, procedural maps per layout, painted ground, collisions, A* pathing |
| `js/config.js`, `js/store.js` | the till: what differs between a test build and the release (ad unit ids, links, the test-ads switch), and ads and purchases behind one interface (`BB.Ads`, `BB.IAP`): Google AdMob and the stores inside the app, a labelled preview in a browser, nothing with `?store=off` |
| `js/structures.js` | what the dead build: the five defences (stats, where they stand, what they do, how they are drawn), the art made for them and for the far marches, and its scatter over a land's maps |
| `js/battle.js` | the battlefield: formation, hero/foe AI, energy and ultimates, bosses, objectives, rendering, lighting |
| `js/audio.js` | synthesised sound effects and a procedural war-drum score |
| `js/aura.js` | what gear and skills look like on a hero: gear glow, enchant particles, capstone marks (stateless) |
| `js/traits.js` | weapon traits you can see: swing crescents, element impacts, chain and heal links, status on foes |
| `js/drill.js` | the team field: the current region with the formation's heroes training, sparring and chatting |
| `js/preview.js` | the duel preview beside a summoning: one hero, one enemy, basic attacks → signature → ultimate, looped |
| `js/tactics.js` | battlefield tactics: potions, rescues, hands-on heals, stones to throw, kicks, charges, pounces, dodge rolls |
| `js/cinema.js` | cutscenes: shot sequencer (scene fly-throughs, close-ups, splits, impact frames, titles) and the four scripts |
| `js/cineart.js` | art made for the cutscenes: drawn figures (knights, the Captain, the dead, Vesh) posed from joints, lit per shot and kept once drawn; `BB.CineArt.draw / drawLow / eyes / skull` |
| `js/opening.js` | the opening film: eleven shots with their own painters (the ridge, the blades, the tear, the gate, the map, the glass, the last stand) |
| `js/heroui.js` | the hero's page: who they are, the gear sockets beside them, and the three leaves (Growth, Gear and its armoury, Skills). Every control carries its name in `data-r` |
| `js/screens.js` | every menu screen: top bar and tabs, camp, campaign, heroes, hero, recruit and reveal, team, shop, goals, results |
| `js/trailer.js` | the trailer: the cut list, its scenes (built and warmed before the first frame), text and letterbox on their own canvas |
| `js/main.js` | boot, loop, input, camp and title scenes, battle HUD, deploy → rewards, saving |
| `tools/pack.py` | packs the raw asset batches into trimmed atlases |
| `test/` | Node tests and headless-browser screenshot runs |

### Keeping it smooth (phones)

What the frame may and may not do, learned from profiling late-game fights and the cutscenes:

- **No canvas blur.** `shadowBlur` repaints the whole bounding box of whatever glows. Glows are a soft round sprite
  painted once per colour (`BB.glowSprite` / `BB.drawGlow` in js/aura.js) or a line over two wide faint strokes.
  Cutscene, summoning and recruit canvases go through `BB.softGlow` (js/cinema.js), which turns the shots' glow
  requests into that; only text keeps a real, small shadow.
- **No whole-sheet recolouring.** Tinted foes and hued effects are recoloured a strip (one clip, one facing) or a
  frame at a time, the first time each is drawn, a few milliseconds per frame at most (js/assets.js). Sheets are
  decoded to bitmaps when they load, during the loading screen, not on first draw mid-fight.
- **One lighting pass.** Day: a small cached vignette stretched over the picture. Night: darkness at half size with
  sprite holes for the lights, the vignette folded in, one draw (js/battle.js `drawLight`).
- **No glass over the battlefield.** `backdrop-filter` is off for everything in the battle HUD; behind menus the
  camp is drawn a few times a second.
- **Squares and sprites, not curves.** Particles, status effects and shadows are `fillRect` and `drawImage`; a
  phone's canvas draws those by the thousand and arcs by the dozen.
- **Graphics: Auto / Sharp / Fast** (Settings). Auto starts at the screen's own pixels and steps the battlefield's
  resolution down (and thins particles, `BB.lowFx`) for good whenever a fight averages under about 37 frames a
  second; Fast is one canvas pixel per screen point. The loop also runs at sixty frames a second on 120 Hz screens.
- **Words are for the big moments.** No floating words or numbers in a fight (numbers are a setting, off by
  default); what is written out: a wave cleared, a boss arriving, enraging or breaking, an ultimate's name, loot,
  victory and defeat. No more than six sounds start in any tenth of a second.
- **The fight does not stop for small things.** No hit-stop on ordinary critical hits or heavy blows (it is kept for
  the rare great blow: a blink, at most once every four seconds); an ultimate holds time for a fifth of a second at
  most once every nine; a cleared wave slows for a moment, not a second. Screen shake is about half what it was. In
  a crowd, those pauses stacked up and read as lag.
- **A ceiling on effects.** At most 26 effect sprites and 180 loose particles at once (fewer when the device is
  struggling); weapon-trait impacts are half as dense; enchant motes around heroes are halved.
- **Development → Performance check** freezes a busy fight and draws it with one part switched off at a time, on the
  device in hand, and reports what each part costs there. Development battles also show a frame-rate readout.
- **Cutscenes** are painted at about 0.75 megapixel and stretched; silhouettes are made at sprite size (128 px),
  kept per pose, and scaled when drawn; grading uses blend modes (no canvas filters); the timeline follows the real
  clock so the picture stays with the sound.

### Assets

The raw packs are not committed (≈300 MB). `tools/pack.py <raw_dir> assets` rebuilds `assets/`
(≈18 MB) from the unzipped batches:

- `assets/chars/` — the base body, ten equipment layers (hair, helm, two chests, two legs, sword,
  axe, shield, slash), and seven complete characters (two desert warriors, two skeleton types, the
  necromancer, the hooded witch, the dark rogue). 15 frames × 8 facings per clip, frames trimmed and
  shelf-packed; the desert pack's baked shadows are removed so every character matches.
- `assets/env/vale|sand` — every environment sprite of both packs at half size (trees, rocks,
  walls, roofs, tents, stalls, statues, cages, banners…).
- `assets/fx/` — the animated effects, props and destructibles; `fx/other` holds the fire ring,
  cloud shadows and light rays.
- `assets/env/ground` — the ground block kit (dirt, grass, cobbles, flagstones, floor tiles),
  flora, chests, doors. Maps are tiled from it; the desert recolours the dirt into sand.
- `assets/chars/h/` — the horde cast: one atlas per character with only the clips its role uses,
  and `roster.json` (archetype, calling or foe kind, element, colours) parsed from the pack READMEs.
  `assets/chars/brenna|reaper` are the two iso-pack characters (legends).

`tools/pack.py <raw_dir> assets horde ground other` packs batch 2 (horde characters in parallel).

## Tests

```sh
node test/rules-test.js                    # pure rules: stats, levels, stars, gear, formation, tiers, rewards, spoils, shop, goals
node test/sim-node.js all 4                # every stage fast-forwarded on AUTO: win rate, length
LAG=4 node test/sim-node.js all 2          # same, heroes four levels below the stage
NOULT=1 node test/sim-node.js all 4        # same, nobody casts ultimates
node test/path-metrics.js                  # movement quality: running in place, stuck units, facing flicker, march spread
node test/teamwork.js                      # team roles: archers behind shields, flanks and backstabs, stalkers on the back line, peeling
NODE_PATH=$(npm root -g) node test/shots.js /tmp/bb-shots            # title → camp → campaign → team → battle → results → every tab
NODE_PATH=$(npm root -g) node test/shots.js /tmp/bb-phone 844 390    # the same on a phone-sized touch screen
NODE_PATH=$(npm root -g) node test/scenes.js /tmp/bb-scenes 4,7,15,23,29   # stages mid-fight with a five-hero team
NODE_PATH=$(npm root -g) node tools/record-trailer.js /tmp/bb-trailer   # the trailer as an mp4 with sound (needs ffmpeg); --every 24 for a contact sheet only
```
The browser tests expect a static server on port 8123 at `bannerborn/`
(`npx http-server -p 8123 bannerborn`) and fail on any console error.

Balance on AUTO, heroes one level below the stage with the team growing from one hero to five: every
stage won in 3–4 of 4 runs except the second fight (half), bosses 47–117 s. Four levels below, the
Greenvale boss, the Old Watch and the Bone Cantor become walls until the team levels up.

## Next (the last batch)

The roster and foe pools pick up new horde characters automatically when they are packed (five
horde parts are still missing: 02, 08, 10, 12, 13). Ideas waiting for art: buildings assembled
from the wall and roof kit, mounted heroes (the cast has riding clips), more regions.
