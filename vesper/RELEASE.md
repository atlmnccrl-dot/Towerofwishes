# Vesper — release checklist

What it takes to ship Vesper, what is done and what only the author can do.

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
| iOS / Android stores | Wrap the web build with Capacitor (`npm i @capacitor/core @capacitor/cli`, `npx cap init`, `webDir: dist/vesper-web`, `npx cap add ios` / `android`). iOS needs a Mac with Xcode and an Apple developer account; Android needs Android Studio and a Play developer account. | Not started (needs the author's accounts) |
| Steam (desktop) | Wrap with Electron or Tauri around the web build; Steamworks for achievements (the achievement list is in `js/modes.js`). | Not started |

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
| The name "Vesper" | — | Search existing games and trademarks before a store listing |

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
