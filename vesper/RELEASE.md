# The Bleeding Moon — release checklist

What it takes to ship The Bleeding Moon, what is done and what only the author can do.

## Build

```sh
python3 -I vesper/tools_build.py      # dist/vesper-web/ and dist/vesper-web.zip (about 190 MB, ~400 files)
```

The build is a static site: open `index.html` from any web server. It installs as an app (manifest,
icons, a service worker that keeps the code fresh and caches art and sound as they load, so places
already visited work offline). The `dist/` folder is not committed.

## Platforms

| Platform | How | Status |
|---|---|---|
| itch.io (HTML5) | Upload `dist/vesper-web.zip`, kind "HTML", viewport 1280×720, "fullscreen button" on, "mobile friendly" on, landscape. itch.io allows 500 MB and 1,000 files per HTML game: Vesper fits. | Ready to upload |
| Any web host | Copy `dist/vesper-web/` (HTTPS for the app install and the service worker). | Ready |
| Install as an app (PWA) | From the browser's menu ("Install" / "Add to Home Screen") on the hosted build. | Ready |
| iOS / Android stores | `vesper/app/`: Capacitor 8 with AdMob and in-app purchases (see **The store apps** below). | Project ready; needs the author's accounts, IDs, a Mac for iOS and Android Studio to build |
| Steam (desktop) | Wrap with Electron or Tauri around the web build; Steamworks for achievements (the achievement list is in `js/modes.js`). | Not started |

## The store apps (iOS, Android)

`vesper/app/` is a Capacitor 8 project around the web game, with Google AdMob (`@capacitor-community/admob`) and the
App Store / Google Play purchases (`cordova-plugin-purchase`). The game's side of it is `js/shop.js` (see
`vesper/STORE.md` for the ads, the products and the listing kit; `vesper/PRIVACY.md` for the privacy policy).

```sh
cd vesper/app
npm install                 # once
npm run sync                # builds the web layer into www/ (lossless WebP sheets, ~165 MB), copies it into the
                            # platforms and applies the native settings (configure.js)
npx cap open android        # Android Studio: Build → Generate Signed App Bundle (.aab) for Google Play
npx cap open ios            # Xcode (on a Mac): set the team and signing, Product → Archive → upload to App Store Connect
                            # (iOS uses CocoaPods, for the purchases plugin: on the Mac, `npm run sync` runs `pod install`)
```

What is in place: both platforms generated; AdMob app IDs (Google's test IDs until yours), landscape only,
fullscreen, the billing permission, Apple's tracking text and SKAdNetwork ID (`configure.js`, from `store-ids.json`);
icons and splash screens for every size (`npm run assets` regenerates them from `assets/`); test ads and test
purchases in the previews (`?shop=mock`), none in the web build (`window.VESPER_WEB_RELEASE`).

**Only you can do these** (in this order):

1. **Accounts**: Google Play Console ($25 once), Apple Developer Program ($99 a year), AdMob (free), a payments
   profile in each store; a website (for the privacy policy and `app-ads.txt`).
2. **App ID**: pick the bundle ID (e.g. `com.yourstudio.bleedingmoon`) and set it in `vesper/app/capacitor.config.json`
   before the first upload; it can never change after. Set the app name and version there and in the platforms.
3. **AdMob**: create the apps and the 4 ad units; paste the IDs (`store-ids.json`, `SH.CONFIG.admob`), set
   `testing: false`; create the consent message (GDPR) and the iOS IDFA message (STORE.md → AdMob setup).
4. **Products**: create the 8 products in both stores with the IDs in STORE.md; set prices; Apple needs a screenshot
   and review note per product.
5. **Legal**: fill in and host `PRIVACY.md`; fill the Data safety form (Google) and App Privacy (Apple) from STORE.md;
   ratings questionnaires; tax and banking forms.
6. **Build and sign**: Android: an upload keystore (keep it safe, never commit it), a signed `.aab`; iOS: on a Mac,
   Xcode signing with your team, archive, upload. Test purchases with Play's licence testers and Apple's Sandbox
   accounts; test ads with the test IDs or test devices.
7. **Listing**: screenshots, feature graphic, description (drafts in STORE.md); internal / closed testing first
   (Google Play requires a closed test with 12 testers for 14 days for new personal developer accounts).

Not done or not testable here: the native builds were generated but not compiled (no Android SDK or Mac in this
environment); real AdMob ads and real purchases only run in a signed build on a device.

## Licences — the author must confirm before selling

| Asset | Where | Check |
|---|---|---|
| Fantasy Character Creator 2D sheets (heroes, the 200 random-cast characters) | `assets/pixel` | The pack's licence allows commercial use in games and redistribution inside a built game |
| 2D Desert Fantasy and 2D Isometric Fantasy tile sets, their characters and animations | `assets/iso`, `assets/pixel/vh_sand_*`, `vh_iso_*` | Same |
| Interface sounds (chest, coin, anvil, equip, level up, quest) | `assets/sfx/*.mp3` | Shared with the repository's other project: confirm their source and licence, or replace them |
| Fight sounds and ambience | `assets/sfx/fight`, `assets/sfx/amb` | Synthesised by the repository's own `tools/make_sfx.py`: no licence needed |
| "Heartfelt Battle" | `assets/music` | OpenGameArt, CC0 (credited in Settings → Credits) |
| Effect sheets: Pixel VFX Essentials, KILN FX Free Sampler, Magic Spells VFX Lite (Willosuna), FX packs 6 and 13 | `assets/fx` | Each pack's licence allows commercial use |
| Soft particle textures (glows, swirl, rune ring, smoke) | `assets/vfx` | Confirm their source and licence |
| Older tile sets (Cainos Top Down Basic, TopDownFantasy Forest, reodesuxz, EPIC RPG World, Dark World), used by the menus' backdrops | `assets/tiles` | Each pack's licence |
| Fonts: Chakra Petch, Barlow (Google Fonts); Adventurer by Brian J Smith | loaded from Google / `assets/ui` | OFL; Adventurer is CC BY 3.0 (credit kept in Settings → Credits) |
| The name "The Bleeding Moon" | — | Search existing games and trademarks before a store listing |
| Crowd Breaker effects (PixelHit) | `assets/cbfx` | Their terms: use inside the game only, never redistribute the assets on their own, keep THIRD_PARTY_NOTICES with the build: confirm a paid app on the stores counts as "inside the game" |
| Guardian and boss characters shared with Tower of Wishes (`cassius`, `black_knight`, `frost_knight_a/b`, `nightcrawler`, `sky_beast`, `master_knight` → `vh_firstcut`, `nox`, `lyra`) | `assets/pixel` | Your own creator builds for the other project: decide whether they may also appear in a commercial release of this game |

## Still to do

- **Music**: one track plays everywhere. The cue system is ready (`A.CUES` in `js/audio.js`): drop
  files named `vesper_title`, `vesper_map`, `vesper_story`, `vesper_act1`…`vesper_act6`,
  `vesper_boss`, `vesper_endless`, `vesper_daily`, `vesper_result` (`.mp3`) into `assets/music` and
  add each name to `A.TRACKS`. Each falls back to the battle track or silence until then.
- **Playtesting**: every balance number comes from the test bot (`vesper/test/campaign-test.js`).
  Play the first two acts on a phone and on a PC; note where it is too hard, too easy or unclear.
- **Real devices**: check frame rate and memory on an older iPhone (the large maps bake their ground
  once per area; each act's characters load when a fight needs them).
- **Store page**: icon (`vesper/icons/icon-512.png`), 5+ screenshots (landscape), a 30–60 s
  trailer (the opening and a guardian fight), a short and a long description.
- **Privacy**: Vesper collects nothing; saves stay in the browser (`localStorage`). App stores still
  ask for a privacy policy: one paragraph saying so is enough.

## Before every release

```sh
node vesper/test/data-test.js
node vesper/test/sim-test.js 200
node vesper/test/campaign-test.js 8
NODE_PATH=$(npm root -g) node vesper/test/browser.js /tmp/vesper-shots   # with the repo served on :8765
python3 -I vesper/tools_build.py
```
