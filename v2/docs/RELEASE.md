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
- Gem packs only speed things up. Every recruit, region and item can be earned by playing; there are
  no random paid boxes for characters (gear chests bought with gems show what they can contain).

## Store listing (draft; edit freely)

- **Name:** Vael: Sellsword Company
- **Subtitle (iOS, 30 chars):** Recruit. Equip. Conquer.
- **Short description (Play, 80 chars):** Build a company of sellswords and fight across a fallen pixel-art kingdom.
- **Description:**
  > The old kingdom of Vael is gone, and its dead walk the roads. Sign a company charter in a border
  > town and lead your sellswords across six regions: river roads, drowned fens, salt deserts, a sunken
  > abbey, the frozen north, and the barrow where the kingdom was buried.
  >
  > • Recruit 23 heroes, each met on the road at the moment they join.
  > • Build a team of five and set its formation; the battles play themselves.
  > • Level up, train, equip and upgrade gear, and choose four upgrades for every hero.
  > • 60 story missions and 60 heroic ones, with bosses at the end of every region.
  > • Daily bounties and 23 feats to earn.
  > • Play offline. No ads. No account.
- **Category:** Games → Role Playing (secondary: Strategy)
- **Age rating:** fantasy violence, no blood, no chat, no ads → 9+ (Apple), PEGI 7 / Everyone 10+ (Google);
  answer the rating questionnaires accordingly. Declare in-app purchases.
- **Privacy:** "Data not collected" (Apple's privacy labels) and "No data collected or shared" (Google's
  Data safety form). The policy is in `docs/PRIVACY.md`; host it on any public page (both stores need a URL)
  and add your support email.
- **Screenshots:** landscape, from a phone: the camp, a battle, the map, the company screen, the shop.
  iOS needs 6.7" and 6.5" iPhone sizes (and 13" iPad if the iPad build is kept); Play needs at least 2.

## Before submitting: checklist

- [ ] Commercial licences on file for every art pack (Character Creator 2D Fantasy, the effect packs,
      the tile packs, the UI pack); the credits are in Settings → Credits.
- [ ] The names and story are approved (they were written for the game as proposals).
- [ ] Support email and a public privacy-policy URL.
- [ ] Products created in both stores with the ids above; tested with sandbox / licence-tester accounts:
      buy each pack, kill the app mid-purchase, restore on a second device.
- [ ] Played through on a real iPhone and a real Android phone (performance, audio after the first tap,
      safe areas on notched phones, the app returning from the background).
- [ ] Version and build numbers set (Xcode: *General*; Android: `android/app/build.gradle`).

## Installable web version (optional)

`npm run build:web` writes `app/web/`: the same game with a manifest and an offline cache, for any
static host (HTTPS). On a phone, "Add to Home Screen" installs it. Purchases are not available there.
