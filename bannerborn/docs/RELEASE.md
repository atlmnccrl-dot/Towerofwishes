# Bannerborn — releasing on the App Store and Google Play

What is ready, what only you can do, and the order to do it in. `node app/scripts/check-release.js` prints what
is still a placeholder at any time.

## Where things stand

| | State |
|---|---|
| Ads and purchases in the game (`js/store.js`, `js/rules.js`) | Built. Tested in a browser in preview mode, and against stand-ins for the native plugins. **Not yet run on a phone against the real SDKs.** |
| Android project (`app/android/`) | Generated and configured (landscape, full screen, AdMob app id entry, billing, signing from `keystore.properties`). **Not compiled here**: this machine cannot reach Google's servers for the Android SDK. |
| iOS project (`app/ios/`) | Generated and configured (`Info.plist`). **Needs a Mac with Xcode to build.** |
| Icons, splash, store screenshots, feature graphic | Made (`app/assets/`, `store/`). |
| Privacy policy, terms, listing text | Drafted (`docs/store/`). Need your name, contact and a public address, and a legal read. |
| Everything with an account behind it (AdMob, the two stores, signing keys) | Yours to do: below. |

## 1. Before anything else

1. **Licences.** Confirm in writing (keep the receipts or licence pages) that every art pack and the three
   Ririsaurus sound packs may be used in a *commercial app sold on app stores*. The sound packs say "commercial
   use allowed, do not redistribute": shipping them inside the game is the normal reading of that, but it is your
   name on the store account. Keep the credit in Settings. The repository must stay private.
2. **The name.** Search both stores and a trademark register for "Bannerborn".
3. **Accounts.** Apple Developer Program (yearly fee), Google Play Console (one-time fee; new personal accounts
   must run a closed test with testers for some days before production: check the current rule), Google AdMob.
4. **A Mac with Xcode** for the iOS build. Android needs Android Studio on any computer.

## 2. Identifiers to put in (all placeholders today)

| What | Where | Now |
|---|---|---|
| App id / bundle id (permanent once uploaded) | `app/capacitor.config.json` `appId`, then `npx cap add android` again or rename in `app/android/app/build.gradle` (`namespace`, `applicationId`) and the Java folder; in Xcode: Signing → Bundle Identifier | `com.bannerborn.game` |
| AdMob **app** id, Android | `app/android/app/src/main/res/values/strings.xml` → `admob_app_id` | Google's test id |
| AdMob **app** id, iOS | `app/ios/App/App/Info.plist` → `GADApplicationIdentifier` | Google's test id |
| Ad **unit** ids (rewarded + interstitial, per platform) | `js/config.js` → `admob` | Google's test units |
| Real ads on | `js/config.js` → `testAds: false` (only in the store build) | `true` |
| Privacy policy and terms addresses | `js/config.js` → `links` | empty |
| Version | `js/config.js` `version`; Android `versionCode`/`versionName` in `app/android/app/build.gradle`; Xcode version/build | 1.0.0 |

Never tap your own live ads. Test with `testAds: true`, or register your phone as a test device in AdMob.

## 3. AdMob

1. Add two apps (Android, iOS). Create two ad units in each: **Rewarded** and **Interstitial**.
2. **Privacy & messaging**: create and publish the *European regulations* message (the game calls Google's consent
   form at start-up where it is owed, and `Settings → Ad choices` reopens it) and the *IDFA explainer* for iOS.
3. **Blocking controls → ad content rating**: keep to PG or lower; block gambling and dating categories. The game
   asks for `ParentalGuidance` at most (`js/config.js`).
4. Publish **app-ads.txt** on the website you list as the developer site in both stores (AdMob shows the line).
5. Payments and tax details, or nothing is paid.

How ads behave in the game (rules in `js/rules.js`, tested):
- **Between battles**: never before the first road (8 stages) is won, at most every third battle, never within
  three minutes of any other ad, never after *Quiet March*. If no ad is loaded the player is not kept waiting.
- **For a bonus, by choice** (daily caps): double the camp's spoils (3), a crier's coin of 15 crystals (3), one
  spare Armory Chest (1), double a victory's gold (5). With *Quiet March* these are simply given.

## 4. Products to create in both stores

Same ids in App Store Connect and Play Console. Prices are yours to set; these are what the game shows until the
store answers with the local price.

| Product id | Type | Price | What it is |
|---|---|---|---|
| `bannerborn.noads` | Non-consumable (Play: one-time, not consumed) | $3.99 | Quiet March: no ads between battles; ad bonuses given at a tap |
| `bannerborn.starter` | Non-consumable | $4.99 | Captain's Chest, once: 600 crystals, 5,000 gold, 20 sigils, an Epic weapon |
| `bannerborn.writ30` | Consumable | $4.99 | Quartermaster's Writ: 40 crystals a day for 30 days, camp spoils doubled |
| `bannerborn.crystals.200` | Consumable | $1.99 | 200 crystals |
| `bannerborn.crystals.550` | Consumable | $4.99 | 550 crystals |
| `bannerborn.crystals.1200` | Consumable | $9.99 | 1,200 crystals |
| `bannerborn.crystals.2600` | Consumable | $19.99 | 2,600 crystals |
| `bannerborn.crystals.7000` | Consumable | $49.99 | 7,000 crystals |

For scale: every hero behind every gate costs 22,000 crystals in all, and play gives crystals steadily. Nothing
sold adds a hero, a team place or a stage directly.

- Apple reviews each product: it wants a screenshot of it in the game (use the Treasurer's stall) and a short note.
  The writ is sold as a consumable that the game spreads over 30 days; say so in the review note. If Apple asks
  for it to be a non-renewing subscription instead, change its `type` in `js/store.js` (`IAP.init`).
- Play: add licence testers so test purchases cost nothing.
- **No server checks receipts.** Purchases are trusted on the device, which is normal for a small offline game
  but lets a determined cheat give themselves crystals. If that matters later, add a validator (the purchase
  plugin supports one) rather than changing the game.

## 5. Building

```sh
cd app
npm install
npm run www                      # copies the game into app/www
npx cap sync                     # into both native projects
node scripts/configure-native.js # (again after any `npx cap add`)
node scripts/check-release.js
```

**Android** (Android Studio installed): `npx cap open android`, let it sync, run on a phone. For the store:
create an upload key once (`keytool -genkey -v -keystore upload.keystore -alias upload -keyalg RSA -keysize 2048
-validity 10000`), write `app/android/keystore.properties` (`storeFile=…`, `storePassword=…`, `keyAlias=upload`,
`keyPassword=…`; it is git-ignored, keep a copy somewhere safe), then `cd android && ./gradlew bundleRelease`.
Upload the `.aab` and accept Play App Signing.

**iOS** (on the Mac): `npx cap open ios`. In Xcode: set your Team and Bundle Identifier, add the *In-App Purchase*
capability, check Deployment Info is landscape only. Paste Google's full **SKAdNetwork** list into `Info.plist`
(only Google's own id is there now; the current list is on Google's AdMob iOS set-up page). Archive → Distribute.

## 6. The stores' questionnaires

**Audience and age.** Set the target audience to 13 and over. Do not tick any children's category: that brings
the families policies and different ad rules. Content: mild fantasy violence, no blood, no gambling, no chat.
Both stores now ask about **paid random items**: answer yes (the recruiting gates, bought with crystals that can
be bought). The game states the odds on every gate, as Apple requires. Belgium and the Netherlands restrict paid
random items: decide whether to sell there, or leave those countries out of distribution.

**Google Play → Data safety** (what Google's ad SDK collects; check against Google's current "AdMob data
disclosure" page before submitting):

| Data | Collected | Shared | Purpose |
|---|---|---|---|
| Device or other IDs (advertising id) | Yes | Yes | Advertising, fraud prevention |
| Approximate location (from IP) | Yes | Yes | Advertising |
| App interactions, diagnostics | Yes | Yes | Advertising, analytics |
| Purchase history | No (handled by Google Play itself) | | |

Data is encrypted in transit. There are no accounts, so no account deletion request page is needed; say users can
remove data by uninstalling.

**Apple → App Privacy.** Data used to track you: Identifiers (Device ID), Usage Data (advertising data).
Data not linked to you: Diagnostics, coarse Location. Declare the tracking prompt. Purchases: handled by Apple.

**Both:** privacy policy address (host `docs/store/privacy.html`), support address, "contains ads", "in-app
purchases".

## 7. Test on real phones before submitting

- First launch: consent form (in Europe), the tracking question (iOS), then the title, without the game freezing.
- A test rewarded ad pays its bonus; closing it early pays nothing; the cap is reached and comes back next day.
- The ad between battles: none through chapter 1; then about every third battle; sound stops and comes back.
- Each product: buy, cancel, buy again; *Quiet March* stops the ads; delete and reinstall → *Restore purchases*
  brings back *Quiet March* and the chest's ownership.
- Aeroplane mode: the game plays; the Treasurer's prices fall back; nothing hangs.
- Phone call or app switch in the middle of a battle: it pauses, sound stops, it resumes.
- Frame rate on an older Android phone (Settings → Graphics → Lighter if needed). The game has only been measured
  in a desktop browser so far.
- Notch and rounded corners: nothing important under them; the home bar does not eat taps on the tab bar.
- Storage: play, close the app from the switcher, reopen: progress is there.

## 8. Known gaps (decide which matter for 1.0)

- Saves are on the device only (plus the device's own backup, and the save code in Settings). No cloud sync.
- English only.
- No crash or usage reporting. If you add any, the privacy policy and both questionnaires change.
- No receipt validation server (see section 4).
- The Development menu is hidden inside the app (`body.native`), but its code ships. Remove the button's handler
  for a hard guarantee if you want one.
- The web build keeps the store in *preview* (purchases give without charging). Do not point players at it once
  the app is on sale, or open it with `?store=off`.
