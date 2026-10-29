# Releasing Vael on the App Store and Google Play

The game is the web code in `v2/`. The folder `v2/app/` wraps it as an iOS and an Android app with
Capacitor 8; both native projects are generated and committed (`app/ios`, `app/android`).
Purchases go through `cordova-plugin-purchase` (StoreKit on iOS, Google Play Billing on Android).

## What you need

| | iOS | Android |
|---|---|---|
| Account | Apple Developer Program, $99 a year | Google Play Console, $25 once |
| Machine | A Mac with Xcode 16 or newer | Any computer with Android Studio |
| Device for testing | An iPhone (TestFlight) | An Android phone (internal testing) |

## Build

```sh
cd v2/app
npm install
npm run sync          # copies the game into the app and updates both native projects
npm run ios           # opens Xcode (Mac only)
npm run android       # opens Android Studio
```

After changing the game, run `npm run sync` again. After changing the icon art (`v2/tools/icons.py`),
run `npm run icons`.

### iOS (in Xcode)
1. Select the **App** target → *Signing & Capabilities*: choose your team. The bundle id is
   `com.vaelcompany.game` (change it in `capacitor.config.json` and in Xcode if you want another).
2. Add the **In-App Purchase** capability.
3. *Product → Archive*, then *Distribute App → App Store Connect*.
4. The app is landscape only and full screen (set in `Info.plist`).

### Android (in Android Studio)
1. *Build → Generate Signed App Bundle*; create an upload key and **keep it safe** (losing it locks
   you out of updates).
2. Upload the `.aab` to the Play Console (internal testing first).
3. The app is landscape only (`AndroidManifest.xml`). The billing permission comes with the plugin.

## In-app purchases: create these products in both stores

Product ids must match exactly (they are in `src/game/economy.js`):

| Product id | Type | Price | Gives |
|---|---|---|---|
| `vael.gems.small` | Consumable | $0.99 | 100 gems |
| `vael.gems.medium` | Consumable | $4.99 | 550 gems |
| `vael.gems.large` | Consumable | $9.99 | 1200 gems |
| `vael.gems.huge` | Consumable | $19.99 | 2600 gems |
| `vael.starter` | Non-consumable | $1.99 | 250 gems and 2000 gold, once |
| `vael.supporter` | Non-consumable | $4.99 | 600 gems and a banner at camp |

- App Store Connect: *Monetization → In-App Purchases*. Each needs a review screenshot (the shop tab).
- Play Console: *Monetize → Products → In-app products*.
- The shop shows the store's own localized prices. "Restore purchases" is in the shop (Apple requires it).
- Purchases are checked on the device only. A receipt-validation server would stop tampering; for a
  single-player game with no trading this is a common trade-off, and can be added later.
- Gem packs only speed things up. Every hero, region and item can be earned by playing; there are
  no random paid boxes for characters (gear chests bought with gems show what they can contain).

## Store listing (draft; edit freely)

- **Name:** Vael: Sellsword Company
- **Subtitle (iOS, 30 chars):** Spin. Lead. Reclaim.
- **Short description (Play, 80 chars):** Build a company of sellswords and fight across a fallen pixel-art kingdom.
- **Description:**
  > The old kingdom of Vael is gone, its dead walk the roads, and a wyrm sleeps under its barrow. Lead
  > a company of sellswords across six regions: river roads, drowned fens, salt deserts, a sunken
  > abbey, the frozen north, and the barrow where the kingdom was buried.
  >
  > • Take back the six Seals of Vael, one from each region's boss, and reclaim the throne.
  > • Rebuild your camp into a citadel: six buildings, each with lasting bonuses, raised with materials
  >   gathered across the kingdom.
  > • Every run starts with a spin of the wheel: it picks your leader, who always fights and gives the
  >   whole squad their perk. Lose a battle or take a Seal, and the wheel spins again.
  > • Start with a single sellsword and earn the rest: 23 hidden heroes, each different, met one by one
  >   across the kingdom. Eight can lead from the wheel; fifteen more join your squad.
  > • Every battle opens like a film, and the camera follows the fight: slow motion for the big hits,
  >   a tug of war for who is winning, the last blow held.
  > • Pick your five while they drill and rest round the fire. Battles play themselves, or switch to Manual and
  >   unleash each hero's ability at the moment you choose.
  > • Level up, train, equip and upgrade gear, and choose four upgrades for every hero.
  > • 60 story missions and 60 heroic ones, with bosses at the end of every region.
  > • Daily bounties and 28 feats to earn.
  > • Play offline. No ads. No account.
- **Category:** Games → Role Playing (secondary: Strategy)
- **Age rating:** fantasy violence, no blood, no chat, no ads → 9+ (Apple), PEGI 7 / Everyone 10+ (Google);
  answer the rating questionnaires accordingly. Declare in-app purchases.
- **Privacy:** "Data not collected" (Apple's privacy labels) and "No data collected or shared" (Google's
  Data safety form). The policy is in `docs/PRIVACY.md`; host it on any public page (both stores need a URL)
  and add your support email.
- **Screenshots:** ready in `docs/store/` (landscape, JPEG): `iphone-6.9/` (2868×1320, the App Store's 6.9"
  size, which also covers the smaller iPhones), `ipad-13/` (2752×2064) and `android/` (1920×1080). Ten each:
  the opening, title, the wheel, camp, Stronghold, map, team, battle, victory, heroes. Remake them after visual changes:
  `NODE_PATH=$(npm root -g) node v2/tools/store-shots.mjs`.
- **What's new (1.0.0):** First release.

## Versions

- `src/version.js`: `VERSION` (shown in Settings and on the title) and `BUILD`.
- iOS: Xcode → *General* → Version (`MARKETING_VERSION`, now 1.0.0) and Build (`CURRENT_PROJECT_VERSION`).
- Android: `android/app/build.gradle` → `versionName` (1.0.0) and `versionCode`.
- Every upload to a store needs a higher build number than the last (iOS Build, Android `versionCode`);
  raise `BUILD` in `src/version.js` to match.

## What the release build does that a player never sees

- **Saves**: after every change, in the device's local storage. A copy of the last save that loaded cleanly
  is kept; a damaged save falls back to it (the player is told). If storage is full or blocked, the game
  says so once and keeps playing.
- **Errors**: anything unexpected shows a small banner ("Something went wrong. Your progress is saved.")
  with Reload; the game loop keeps running.
- **Background**: a battle pauses when the app leaves the screen; the sound stops and resumes.
- **Android back button**: closes Settings or a tip, skips a story scene, pauses or resumes a battle, goes
  back a screen, and leaves the app from the title.
- **Vibration**: abilities and results (Capacitor Haptics); off in Settings.
- **Settings**: music, sounds, screen shake, auto abilities, story scenes, vibration, save code, reset,
  privacy, credits, and the version.

## Before submitting: checklist

- [ ] Commercial licences on file for every art pack (Character Creator 2D Fantasy, the effect packs,
      the tile packs); the credits are in Settings → Credits. The desert overworld tileset has no author
      recorded: find its source and credit it, or replace it.
- [ ] The names and story are approved (they were written for the game as proposals).
- [ ] Support email and a public privacy-policy URL (`docs/PRIVACY.md`).
- [ ] Products created in both stores with the ids above; tested with sandbox / licence-tester accounts:
      buy each pack, kill the app mid-purchase, restore on a second device.
- [ ] Automated checks pass (see `README.md`: the Node tests and `test/browser-check.js`).
- [ ] Played on a real iPhone, a real iPad and a real Android phone: performance in big battles, audio
      after the first tap, safe areas on notched phones, leaving and returning mid-battle, the back button
      (Android), vibration, a full first session (opening, the wheel, first three missions, the first recruit, a lost battle and a new spin).
- [ ] App icon and splash checked on the home screen (`npm run icons` regenerates them).
- [ ] Version and build numbers set (above).
- [ ] TestFlight / internal testing round with a few players before the public release.

## Installable web version (optional)

`npm run build:web` writes `app/web/`: the same game with a manifest and an offline cache, for any
static host (HTTPS). On a phone, "Add to Home Screen" installs it. Purchases are not available there.
