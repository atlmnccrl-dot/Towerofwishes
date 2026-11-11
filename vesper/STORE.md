# The Bleeding Moon — store kit

Everything the App Store and Google Play ask for, ready to paste or to fill in. The code side is in place
(`js/shop.js`, `vesper/app/`); the accounts, IDs, prices and legal text are yours.

## Monetisation, as built

| What | Where | Rules |
|---|---|---|
| **Rise again** (rewarded ad, the player's choice) | When she falls in a campaign fight | Once a fight; she stands back up with half her health, the dead near her thrown back |
| **Double rewards** (rewarded) | Victory screen | Doubles that fight's gold and soul shards |
| **Moon's Gift** (rewarded) | Map bar, once every 20 hours (after 3 wins) | Shards and gold that grow with her level |
| **Between fights** (interstitial) | After pressing Continue / Fight again on a result | Only after 10 wins (past Act I), at most one in 3 finished fights and one per 4 minutes; never in the tutorial, a film or a mode run |
| No banners | — | Nothing ever covers a fight |

**No Ads** removes the ads between fights and makes the rewarded bonuses free (no ad to watch). It never takes a
reward away. Tuning lives in `SH.CONFIG` (`js/shop.js`).

## In-app products — create these in both stores with the same IDs

| Product ID | Type (Apple / Google) | Name | Suggested price | Gives |
|---|---|---|---|---|
| `vesper_no_ads` | Non-consumable / One-time | No Ads | $3.99 | No ads between fights; rewarded bonuses without ads |
| `vesper_moonblade` | Non-consumable / One-time | Moonblade Edition | $7.99 | No Ads + every hero and every look unlocked + 600 shards + 6,000 gold |
| `vesper_skins` | Non-consumable / One-time | Skin Collection | $2.99 | The premium look of every hero (8 looks: Gilded, Verdant, Crimson, Blood, Jade, Gold King, Obsidian, Ashen) |
| `vesper_starter` | Non-consumable / One-time | Starter Cache | $1.99 | 3,000 gold, 250 shards, a rare weapon (shown until Act IV is won) |
| `vesper_shards_s` | Consumable | Pouch of Shards | $0.99 | 150 soul shards |
| `vesper_shards_m` | Consumable | Chest of Shards | $2.99 | 500 soul shards |
| `vesper_shards_l` | Consumable | Hoard of Shards | $5.99 | 1,200 soul shards |
| `vesper_gold_s` | Consumable | Purse of Gold | $0.99 | 1,500 gold |
| `vesper_gold_l` | Consumable | Vault of Gold | $4.99 | 10,000 gold |

Names, prices and what each gives are in `SH.PRODUCTS` (`js/shop.js`); the stores' own localised prices replace the
suggested ones on screen. **Looks** (2026-11-11): each hero has two, recoloured from their own sheet (`D.SKINS` in
`js/data.js`): the first is earned at mastery 3 with that hero, the second comes with the Skin Collection (in the web and
desktop builds it costs 3,000 gold). Chosen on the heroes page. Ideas for later: soul looks, an "Eclipse" moon theme
for the menus.

## AdMob setup

1. Create an AdMob account, add two apps ("The Bleeding Moon" Android and iOS).
2. In each app create two ad units: **Rewarded** and **Interstitial**.
3. Put the two **app IDs** in `vesper/app/store-ids.json` and run `node configure.js` in `vesper/app`.
4. Put the four **ad unit IDs** in `SH.CONFIG.admob` in `js/shop.js`, and set `testing: false`.
5. AdMob → Privacy & messaging: create a **GDPR consent message** (EEA/UK) and, for iOS, an **IDFA explainer**. The
   game shows them through the plugin and offers **Settings → Privacy options** afterwards.
6. Add `app-ads.txt` to the developer website listed in the stores (AdMob gives the line to paste).
7. Never tap your own live ads: test on your devices with the test IDs, or add them as test devices in AdMob.

## Listing text (draft)

**Name:** The Bleeding Moon
**Subtitle / short description (≤ 80 chars):** Five chained kings. One night. Free them before dawn.

**Description:**
> Seven hundred years ago a swordsman climbed the Spire, cut down its five kings, and with their souls he cut the Moon.
> Her light turned red, and red light wakes the dead. He chained each king's soul inside a guardian to bar the way up.
> Tonight the Moon bleeds out. At dawn she dies, and the dead will never sleep again.
>
> Climb five kingdoms in one night. Free the chained kings. Face the Kingslayer before dawn.
>
> One blade can stop him.
>
> The Bleeding Moon is a fast, hand-crafted pixel-art action game. Cut through hordes of the risen dead across seven
> hours of night, climb past six guardians, each with its own lair, film and fighting style, and face the First Cut
> at the top of the Spire.
>
> - Fluid, readable combat: combos, dashes, heavy blows and skills that come on their own, and the Red Moon art.
> - Bound Souls: every guardian you defeat leaves its soul to fight at your side; grow them from wisps into ascended spirits.
> - Eight heroes, a skill tree, loot and a blacksmith.
> - Endless mode, a daily challenge, New Game+ and achievements.
> - Plays fully offline. Optional ads; one purchase removes them.

- In English, Spanish, Portuguese, French and German.

**Other languages** (the game is translated into each; set these as the localised listings):

- **Español** — *Una espada. Seis guardianes. Detenlo antes del alba.* Hace setecientos años un espadachín abatió a
  cinco reyes y, con sus almas, lanzó el hechizo que despierta todas las tumbas. Desde aquella noche la luna sangra, y
  a su luz se alzan sus muertos. Esta noche la luna se desangra. Solo tu hoja puede detenerlo, en la cima de la Aguja.
- **Português** — *Uma lâmina. Seis guardiões. Detenha-o antes da alvorada.* Setecentos anos atrás, um espadachim
  derrubou cinco reis e, com as almas deles, lançou o feitiço que desperta todos os túmulos. Desde aquela noite a lua
  sangra, e sob sua luz os mortos se erguem. Esta noite a lua se esvai em sangue. Só a sua lâmina pode detê-lo.
- **Français** — *Une lame. Six gardiens. Arrête-le avant l'aube.* Il y a sept cents ans, un bretteur abattit cinq rois
  et, avec leurs âmes, lança le sort qui réveille toutes les tombes. Depuis cette nuit, la lune saigne, et à sa lumière
  ses morts se lèvent. Cette nuit, la lune se vide de son sang. Seule ta lame peut l'arrêter, au sommet de la Flèche.
- **Deutsch** — *Eine Klinge. Sechs Wächter. Halte ihn vor dem Morgengrauen auf.* Vor siebenhundert Jahren streckte ein
  Schwertkämpfer fünf Könige nieder und wirkte mit ihren Seelen den Zauber, der jedes Grab erweckt. Seit jener Nacht
  blutet der Mond, und in seinem Licht erheben sich seine Toten. Heute Nacht blutet der Mond aus. Nur deine Klinge kann
  ihn aufhalten.

Have a native speaker read each listing (and the game) before release.

**Keywords (Apple, ≤ 100 chars):** action,pixel,rpg,roguelite,hack and slash,souls,boss,dark fantasy,offline,arcade
**Category:** Games → Action (secondary: Role-Playing)

## Ratings questionnaires (expected answers)

- **Violence:** fantasy violence against undead and monsters, small amounts of pixel blood → Apple 12+, IARC/PEGI 12,
  ESRB Teen likely. No sexual content, no gambling, no real-money loot boxes (purchases give fixed contents).
- **Ads:** yes (AdMob). **In-app purchases:** yes.
- **Target audience (Google):** 13+ (keeps AdMob out of the Families programme; if you choose under-13, set
  `childDirected: true` and expect stricter ad rules).

## Google Play — Data safety form

- Data collected: **Device or other IDs** (advertising ID), **App activity / app interactions** and **Approximate
  location** — collected **by the AdMob SDK**, for **Advertising or marketing** and **Analytics**, **not shared** beyond
  Google's processing, **encrypted in transit**. Users can request deletion through Google.
- Purchase history: processed by Google Play (declare "Financial info → Purchase history: collected, for app functionality").
- The game itself sends nothing anywhere; saves stay on the device.

## Apple — App Privacy ("nutrition label")

- **Identifiers → Device ID** (IDFA, only with tracking permission): used for **Third-party advertising**, **linked to
  the user: no**, **used for tracking: yes**.
- **Usage data → Advertising data, Product interaction:** third-party advertising, analytics.
- **Diagnostics:** none by the game (AdMob may collect crash data: declare if you enable it).
- **Purchases:** handled by Apple.

## Screenshots and art you need

- Landscape screenshots: iPhone 6.7" (2796×1290), iPad 12.9" (2732×2048), Android phone (1920×1080 or higher), 4–8
  each. `node vesper/trailer/store_shots.js <outDir>` (the repository served on :8765) captures eight at all three sizes:
  the kings, a horde fight with a soul, the spell, a guardian, the map, the Souls page, a late act, the title.
- Google Play feature graphic 1024×500; app icon 512×512 (Play) / 1024×1024 (Apple): `vesper/app/assets/icon-only.png`.
- An App Preview / promo video: `vesper/trailer/` (README there) builds a 44 s trailer from the game. Apple's App
  Preview must be 15–30 s and recorded from the device's screen size: cut it from the trailer.
