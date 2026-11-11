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
| Steam (desktop: Windows, macOS, Linux) | `vesper/desktop/`: Electron around the no-ads web build, Steam achievements through steamworks.js (see **The desktop build** below). | Ready to build; needs a Steamworks account and App ID |

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

## The desktop build (Steam)

```sh
cd vesper/desktop
npm install                 # once (Electron, electron-builder, steamworks.js)
npm start                   # builds the web layer into www/ (tools_build.py --desktop) and runs the game
npm run dist                # Windows and Linux folders in release/ (npm run dist:mac on a Mac)
```

The window opens fullscreen (F11 toggles), the game is served from `app://game/` out of `www/`, saves live in the app's
user-data folder, and there are no ads or purchases (the web release). **Steam:** put your App ID in `desktop/steam.json`
and create the 26 achievements in Steamworks with the game's ids (`first`, `gate`, `twins`, … listed in `js/modes.js`
`M.ACH`), or map them in `steam.json`. Achievements earned before Steam was set up are passed on at the next start.
**Steam Cloud:** turn on Auto-Cloud for the user-data folder (Windows `%APPDATA%/The Bleeding Moon`, macOS
`~/Library/Application Support/The Bleeding Moon`, Linux `~/.config/The Bleeding Moon`), so saves follow the player.
Checked here: the dev run and a packaged Linux build reach the title, a fight plays, a save survives a restart. Not
checked: Windows and macOS builds, Steam itself (needs the Steam client and an App ID).

## Licences (checked 2026-11-11 against the licence files in the repository)

**Confirmed from their licence files** (commercial use in a game allowed; none may be resold or shared as loose files):

| Asset | Where | Licence | What it asks |
|---|---|---|---|
| Interface sounds: Fantasy UI SFX Free by heyheythere | `assets/sfx/*.mp3`, source `art_source/sfx_fantasy_ui` | CC BY 4.0 | **Credit, required**: in Settings → Credits (done) |
| Soft particle textures (Kenney, Picster; repackaged by Brackeys) | `assets/vfx` | CC0 | Nothing |
| KILN FX Free Sampler | `assets/fx` | Own licence | Ship inside the game only; no resale |
| Magic Spells VFX Lite (Willosuna) | `assets/fx` | Own licence | No resale of the image files |
| Mixel tiles (with the Adventurer font) | `assets/tiles` | Own licence | Game projects only; no AI training; the font needs its credit (done) |
| reodesuxz tile sets (castle and dungeon; forest and village) | `assets/tiles` | Own licence | No resale; no AI training |
| Medieval Fantasy UI by Kibyra (the icons) | `assets/ui/icons*.png` | Free, commercial | Credit appreciated (done) |
| Crowd Breaker effects (PixelHit, made with pixelfx) | `assets/cbfx` | pixelfx MIT + PixelHit's terms (as you relayed them: use inside the game, never on their own, keep THIRD_PARTY_NOTICES) | A store app ships them inside the game, so it fits those terms; keep the notice file in every build (the build scripts copy it) |
| "Heartfelt Battle" | `assets/music` | CC0 | Nothing (credited anyway) |
| The rest of the score, the fight sounds and ambience | `assets/music`, `assets/sfx/fight`, `assets/sfx/amb` | The game's own (synthesised in code) | Nothing |
| Chakra Petch, Barlow | Google Fonts | OFL | Nothing |

**Still to confirm** (no licence file in the repository: check each pack's store page, or the receipt of the purchase):
Character Creator 2D Fantasy (SmallScaleInt: the heroes and the 200 random-cast characters); the 2D Desert Fantasy and 2D
Isometric Fantasy tile sets (`assets/iso`, `vh_sand_*`, `vh_iso_*`); Pixel VFX Essentials, FX pack 13 and the slashes pack 6
(`art_source/fx`); Cainos Top Down Basic, TopDownFantasy Forest, EPIC RPG World / epic ruins, Dark World, dark castle,
pixel16, ruins blood and the desert tiles (`art_source/tiles`). For paid packs the purchase licence usually allows use in a
commercial game; for free ones the page says. Add each licence file next to its source under `art_source/` when you have it.

**Your decision:** the guardians and the final boss reuse your own creator builds made for Tower of Wishes (`cassius`,
`black_knight`, `frost_knight_a/b`, `nightcrawler`, `sky_beast`, `master_knight` → `vh_firstcut`, `nox`, `lyra`). The creator's
licence covers them; whether they may appear in this commercial game is yours to say.

**The name.** A search (2026-11-11) found no game called exactly "The Bleeding Moon", but two close ones: *Bleeding Moons*
(IAN Games / Phoenix Online, 2020, a point-and-click adventure on Steam and GOG) and *Beneath the Bleeding Moon* (Ebi-Hime,
2025, a visual novel on Steam and itch.io). Different genres, but similar names hurt store search and can draw a complaint.
Not a legal trademark search: check your country's trademark register (and the US one) before the listing.

## Launch, step by step

1. Fill in `vesper/release.json` (app ID, studio, email, AdMob IDs; Steam App ID for Steam).
2. `python3 vesper/tools_release.py --apply` writes them everywhere (and turns test ads off once the AdMob IDs are real).
3. Host `vesper/site/` (privacy policy, support page, app-ads.txt) on your website; put its addresses in `release.json`.
4. `python3 vesper/tools_release.py --check` until it says READY; then the list it prints for outside the repository.
5. Build: `cd vesper/app && npm run sync`, then Android Studio (signed .aab) and Xcode (archive) as above.

**Android test builds from a cloud session:** this session's environment blocks `dl.google.com` (the Android SDK), so no APK
could be built here. Your saved environment "Games (Android builds)" allows it, but a session can only be moved onto an
environment whose name has letters, digits, spaces, dots, dashes and underscores: rename it (e.g. "Games Android builds")
in Settings → Environments, or start a new session in it, and an unsigned test APK can be built for phones.

**Slow phones:** the game lowers its own resolution when frames stay slow (`perfWatch` in `js/main.js`, remembered in
`opts.dprMax`). In an emulated phone at a quarter of its speed the heaviest fight runs at about 45 fps and the story scenes
about 50; the campaign map is the heaviest screen (about 9 fps there, in a headless browser that paints without a GPU, which
real phones have). Check the map on a real older phone first.

## Still to do

- **Music**: done (2026-11-11): six original loops from `tools_music.py` for the title, the map, the story, the
  guardians, the late acts' battles and the victory; Heartfelt Battle for the first three acts. A per-act track can
  still be dropped in (`A.CUES` in `js/audio.js`: `vesper_act1`…`vesper_act6`).
- **itch.io**: `python3 -I vesper/tools_build.py` makes `dist/vesper-web.zip` (187 MB, 485 files: inside itch's 500 MB and 1,000-file limits); checked served on its own: title, music, a fight, languages, no shop.
- **Playtesting**: every balance number comes from the test bot (`vesper/test/campaign-test.js`).
  Play the first two acts on a phone and on a PC; note where it is too hard, too easy or unclear.
- **Real devices**: check frame rate and memory on an older iPhone (the large maps bake their ground
  once per area; each act's characters load when a fight needs them).
- **Store page**: `trailer/store_shots.js` captures the 8 screenshots at the iPhone 6.7", iPad 12.9" and Android sizes;
  `trailer/` builds the 44 s trailer (the five kings, the fights, the title); the feature graphic is the title screen at
  1024×500. Descriptions in STORE.md (English, Spanish, Portuguese, French, German).
- **Privacy**: the store apps show AdMob ads, which collect data (see PRIVACY.md and STORE.md). The web and desktop
  builds collect nothing; saves stay on the device.
- **Languages**: English, Spanish, Portuguese, French and German (`js/i18n*.js`, built from `tools_lang/`). The
  translations were written without a native review: have a speaker of each read the game before release.
  New text: add it to `tools_lang/keys.json` (or re-run `test/strings.js` to harvest it) and to each language file.

## Before every release

```sh
node vesper/test/data-test.js
node vesper/test/vault-test.js
node vesper/test/i18n-test.js
node vesper/test/sim-test.js 200
node vesper/test/campaign-test.js 8
NODE_PATH=$(npm root -g) node vesper/test/browser.js /tmp/vesper-shots   # with the repo served on :8765
python3 -I vesper/tools_build.py
```
