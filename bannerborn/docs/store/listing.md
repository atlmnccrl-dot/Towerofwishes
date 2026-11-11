# Bannerborn — store listing

Text to paste into App Store Connect and Google Play Console. Lengths are inside each store's limit.
Check that the name "Bannerborn" is free on both stores, and as a trademark where you sell, before anything else.

## Name

- **App name (both stores, 30 max):** `Bannerborn`
- **Apple subtitle (30 max):** `Raise a banner. Earn heroes.`
- **Google short description (80 max):** `Raise your banner, earn your heroes one by one, and shut the Gravegates.`

## Full description (Google 4,000 max; Apple description)

```
The Gravegates stand open and the dead walk the old roads. You have one banner and one Captain.

Bannerborn is a fantasy battle game about earning a warband. You begin alone. Every place beside your
Captain is won by marching further: a second hero a fifth of the way through the war, a third at two
fifths, and so on until five stand under your banner.

WATCH THE FIGHT, CALL THE MOMENT
Your heroes fight for themselves: they close in, hold a line, cover each other, step out of what is about
to land. You place them before the battle and choose when each one's ultimate goes off. Or let Auto do it.

EIGHT LANDS, FIFTY-FOUR STAGES
Greenvale, the Sunscar, drowned Aldmere, the Cantor's Gate, and beyond them the far marches: the
Frostmarch under snow, the burning Cinderfields, poisonous Mirefen and the Hollow. Each land has its own
dead, its own weather and its own music.

WHAT THE DEAD BUILD
Watchtowers, mortars that mark where their shells will fall, obelisks that mend the horde, braziers that
spit the land's own fire, frost, poison or blight, and cages that keep letting more out. Break them.

FORTY-SEVEN HEROES, NONE OF THEM TWICE
Eight callings, four rarities, every hero with a signature move of their own. The recruiting gates never
give you a hero you already have, and each gate tells you your odds.

A CAMP THAT IS A PLACE
Your heroes muster in ranks under your banner. The market is a square you walk into: a smith, a
quartermaster, a gem-trader, a seer. Gear is found, worn and seen.

AFTER THE WAR
The Endless Gate, relics from every lord you bring down, a war chest to raise, and every stage to replay.

Free to play. Optional ads for small bonuses, an ad now and then between battles after the first road,
and one purchase that removes those for good. Nothing sold wins a fight for you. Plays offline; your
progress is saved on your device.
```

## Apple-only fields

- **Promotional text (170 max):** `Eight lands, fifty-four stages, forty-seven heroes. Start with one Captain and earn every place beside them.`
- **Keywords (100 max, comma separated, no spaces):** `rpg,heroes,auto battler,fantasy,strategy,idle,tactics,pixel,collect,warband,undead,battle,offline`
- **Category:** Games → Role Playing (secondary: Strategy)
- **Copyright:** `© [YEAR] [YOUR NAME OR STUDIO]`

## Google-only fields

- **Category:** Game → Role Playing. **Tags:** Role Playing, Strategy, Auto battler, Offline.
- **Contains ads:** Yes. **In-app purchases:** Yes ($1.99 – $49.99 per item).

## What's new (first release)

```
The first release: eight lands, fifty-four stages, forty-seven heroes.
```

## Art for the listing

| What | Where | Size |
|---|---|---|
| Icon | `app/assets/icon-only.png` | 1024 × 1024 |
| Google feature graphic | `store/feature-graphic.jpg` | 1024 × 500 |
| iPhone 6.7"–6.9" screenshots | `store/screenshots/iphone/` | 2688 × 1242 |
| iPad 13" screenshots | `store/screenshots/ipad/` | 2752 × 2064 |
| Android phone screenshots | `store/screenshots/android/` | 1920 × 1080 |
| Trailer | `assets/trailer.mp4` if you recorded one (`tools/record-trailer.js`) | 1280 × 720, 30 fps |

Screenshots are remade with `node tools/store-shots.js` (needs Playwright and the game served locally).
Apple's app preview video has its own sizes and a 30-second limit; the recorded trailer is 16:9 and suits
Google Play (as a YouTube link) as it is.
