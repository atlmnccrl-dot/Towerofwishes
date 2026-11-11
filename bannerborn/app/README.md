# Bannerborn — the app

The web game in the folder above, wrapped with [Capacitor](https://capacitorjs.com) for the App Store and Google
Play, with Google AdMob (`@capacitor-community/admob`) and store purchases (`cordova-plugin-purchase`).
The game itself does not change: `js/store.js` notices it is inside the app and talks to the plugins.

```sh
npm install
npm run sync      # build ../ into www/ and copy it, with the plugins, into android/ and ios/
npm run android   # …then open Android Studio
npm run ios       # …then open Xcode (on a Mac)
npm run assets    # redraw the icon and splash and regenerate every size
npm run check     # what is still a placeholder before a store build
```

- `capacitor.config.json`: the app id and name.
- `scripts/build-www.js`: what goes into the app.
- `scripts/configure-native.js`: the settings applied to the generated native projects (run after `npx cap add …`).
- `assets/`: icon and splash sources, drawn by `../tools/make-icons.py`.
- `android/`, `ios/`: the native projects, committed. `www/`, `node_modules/` and signing keys are not.

Everything else, in order: [../docs/RELEASE.md](../docs/RELEASE.md).
