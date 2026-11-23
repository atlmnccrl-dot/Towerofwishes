# BELLMOURN: Run Design (the roguelite rework)

Decided with the author (2026-11):
- Dying ends the run; permanent progress is kept.
- One run is the whole game on a branching route: Act I to Act III, visiting only some areas each time, about 2-3 hours.
- A run is locked to one warden.
- Every run must play differently: area variants, elemental builds, events, routes.
- Wardens and their power are unlocked by challenges over many runs, not by beating a boss once.
- Side quests befriend other wardens, who arrive as AI allies, with entrance scenes, when the final boss enters its second
  stage.
- Bosses are distinct and spectacular.
- The Haven is a solitary place.
- Menus are clean and new: route map, event cards, upgrade chains.

Everything here builds on the existing game: STORY_BIBLE.md, the 15 areas, 7 wardens, Echoes, the cutscenes. New texts are
marked PROPOSAL.

## 1. The run

1. **Title, then choose a warden.** Only unlocked wardens; locked ones show their unlock challenge. The run is that
   warden's until it ends: no swapping anywhere. Their permanent progress (mastery) comes with them.
2. **The Old Road (first run: the tutorial fight; later runs: a short cinematic road).**
3. **Act I route map.**
   - Start at Gallows Gate.
   - Choose a path through a branching map of nodes.
   - Visit 3 of the 6 middle districts (Lantern Row, Mirewater Docks, the Drowned Nave, the Undercroft, the Bell Foundry,
     the Crown Heights).
   - Between areas sit small nodes: EVENT, SHRINE (rest), MERCHANT, TRIAL (an optional elite arena), and QUEST (only when
     its hint was found).
   - The Act ends at the Belfry (Saint Silence; the bell scene the first time).
4. **Act II:** 2 of the 3 regions (Frostmarch, Ash Dunes, Catacombs), then the Abyss (the Archon).
5. **Act III:** 1 of 2 (Weeping Marsh, Clockwork Spire), then the Empyrean (the final choice, the Wheel, an ending).
6. Death at any point ends the run, then the RUN SUMMARY (what you earned) and back to the title.

A full run visits about 10 areas plus small nodes. Each area is shortened for runs: one or two fights, its boss, an exit.
Cutscenes play in full the first time, then shortened or skippable.

## 2. Every run different

- **Area variants:** every area has at least 3 variants. Each variant combines:
  - a layout change: alternate paths opened or blocked, a different section of the district, a mirrored approach;
  - a condition with its own weather and grade: e.g. FLOODED, BURNING, FOG, BLOOD MOON, PLAGUE, FROZEN OVER, ECLIPSE;
  - the condition's encounter pool and elemental foes;
  - a boss drawn from that area's boss pool (2 bosses per area where possible);
  - often an in-level event: an ambush, a wandering elite, a trapped survivor, a cursed lamp, a hidden quest hint.
- **Elemental foes:** foes can carry an element (fire, frost, poison, storm, blood, holy, void) that changes their attacks
  and leaves hazards. Conditions set the element mix.
- **Routes:** the map is generated per run from a seed. Which areas, which nodes and which variants differ every time.

## 3. The in-run build (boons and chains)

- After each cleared fight (and from trials, events and bosses) the player picks **1 of 3 boons**.
- Boons belong to **seven Resonances**, each an element and a fantasy:
  - EMBER (fire);
  - RIME (frost);
  - BLIGHT (poison);
  - THUNDER (storm);
  - CRIMSON (blood: lifesteal and bleed);
  - DAWN (holy: shields and smite);
  - SILENCE (void: execute-like damage to weakened foes, stealth).
- A boon modifies one slot: ATTACK, DASH, SKILL, ULTIMATE or PASSIVE. For example: EMBER DASH, the dash leaves a trail of
  fire; RIME ATTACK, hits chill and the third chilled hit freezes.
- **Chains** (the build tree):
  - each Resonance has tiers I, II and III; tier II boons only offer once you hold enough tier I of that Resonance;
  - **DUO boons** appear when you hold two Resonances, e.g. EMBER plus RIME gives STEAM BURST;
  - one **CROWN boon** per Resonance at the top of its chain.
  The pick screen shows where a boon sits in its chain and what it unlocks next.
- **Rarity:** common, rare, epic and legendary. Rarity scales the numbers.
- **Run currency:** embers (freed voices), spent at SHRINE and MERCHANT nodes during the run:
  - heal;
  - reroll boons;
  - upgrade a boon's rarity;
  - buy a tonic;
  - buy a relic or weapon for this run.
- **Echoes:** each boss defeated in the run grants its Echo for that run. Owning an Echo permanently (meta) only makes it
  appear more often.

## 4. Permanent progress (meta)

- **Warden mastery:** each warden levels up across runs. Mastery unlocks:
  - that warden's talents, small permanent passives chosen at the start of a run;
  - their weapons;
  - their colour variants.
  Mastery comes from what the warden did in their runs.
- **Bell Shards:** a meta currency earned per run by depth and challenges, spent in the **Bell Tower** (a meta screen on
  the title) on account-wide upgrades: one more tonic, a boon reroll per run, a starting ember purse, and so on.
- **Unlocks by CHALLENGES:**
  - Kestrel: "Defeat the Gaoler without drinking a tonic" and "Free 100 Hushed".
  - Hollis: "Defeat the Drowned King-Crab" and "Reach Act II with Vesper".
  - Mother Wren: "Reach Act II without healing" and "Hold 3 boons of one Resonance".
  - Sister Ash: "Rest at 10 shrines" and "Defeat Mother Tallow".
  - Further challenges unlock boons, Resonance tiers, Echo variants, events and warden colours.
  - Challenges such as "kill X", "defeat X with Y" and "reach Act II without healing" are tracked across runs.
- **The Codex:** bestiary, Echoes, boons found, lore pages, endings seen.

## 5. Side quests and allies

- Some areas hide **hints**: a note, a voice, a marked door, an event outcome. Following a hint makes a QUEST node appear
  on the map, on this run or a later one.
- **Quest lines** (2-3 steps across runs) **befriend** the other wardens. For example:
  - Vesper: find Tam's toy bell in the Docks;
  - Bram: break the Bellfounder's last mould;
  - Kestrel: open her father's last cell.
- A befriended warden becomes an **ALLY**. When the Wheel enters its second stage, each ally arrives with their own
  entrance scene and fights beside the player as an AI unit. Allies are deliberately modest helpers, not carries.
- At most 3 allies at once. Act bosses may also call one ally on later runs.

## 6. Bosses

- Every boss is distinct in silhouette, rhythm and arena use. No two read as the same fight. The Gaoler and Mother Tallow
  are reworked to be clearly different.
- New bosses join the pools:
  - **The Drowned King-Crab**, Docks: a crab the size of a house with armoured claws, a shell to break and a tide arena.
  - **The Hollow Mother**, Undercroft: a clean, horrifying creature of too many limbs that walks on the ceiling of the dark
    and drops.
  - **The Stilled Ronin**, Crown Heights: a silent swordsman of a foreign order who has not moved in a hundred nights.
    Instant draw cuts, terrifying stillness between them.
  - **The Smiling Guest**, Lantern Row or the Nave: an entity with a fixed smile that moves only when you are not looking
    straight at it, takes your shape, laughs in the dark.
  - **The Pyre Saint**, Foundry: a burning martyr who sets the arena on fire.
- Each has its own entrance (see the existing entrance system) and an Ascended form.

## 7. The Haven

A solitary place, lit by the bell's forge-flame. No other wardens sit around it. In a run, SHRINE nodes are small Havens
(heal, spend embers).

## 8. Menus and screens (a new, clean style)

- **One visual language:**
  - dark iron frames;
  - a parchment-and-ink route map;
  - cards with a pixel illustration area, a title, tags and clear choice buttons;
  - big touch targets;
  - smooth slide and flip animations.
- Screens:
  - **Route map:** nodes with icons, the path so far, the choices ahead.
  - **Boon pick:** three tall cards with Resonance colour, rarity glow, slot icon and a chain preview.
  - **Event:** a Mewgenics-style card. A pixel vignette, a short text, 2-3 choices, each with its cost or risk shown.
  - **Shrine.**
  - **Merchant.**
  - **Run summary.**
  - **Bell Tower.**
  - **Challenges board.**
  - **Codex.**
  - **Warden select.**

## 9. The tutorial fight

The first run's Old Road is one clean, cinematic duel against the crow-masked oath-sworn warden. It teaches by moments, not
walls of text: one word appears at the right beat (STRIKE, DASH, then a slow-motion perfect dodge, then a boon pick, then the
ULTIMATE to finish). It ends with a striking finish and the title over the gate.
