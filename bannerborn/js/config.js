// Bannerborn — what changes between a test build and the release. Nothing secret lives here: ad unit ids and links
// are public by nature. The AdMob *app* ids are not here: they go in the native projects
// (android/app/src/main/AndroidManifest.xml and ios/App/App/Info.plist); see docs/RELEASE.md.
(function () {
  const BB = window.BB;
  BB.CONFIG = {
    version: '1.0.0',
    // true: every ad is a Google test ad (safe to tap). Set to false only in the build you send to the stores,
    // after putting your own ad unit ids below. Tapping your own live ads in testing can get an AdMob account closed.
    testAds: true,
    admob: {
      // Google's public test units. Replace with the units you create in AdMob (Apps → Ad units).
      android: { rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712' },
      ios: { rewarded: 'ca-app-pub-3940256099942544/1712485313', interstitial: 'ca-app-pub-3940256099942544/4411468910' },
    },
    // Ads are for a general audience (no gambling, no mature themes); see docs/RELEASE.md before changing.
    maxAdRating: 'ParentalGuidance',
    // Pages the stores require the app to link to. Host docs/store/privacy.html and terms.html somewhere public
    // and put their addresses here.
    links: { privacy: '', terms: '', support: '' },
  };
})();
