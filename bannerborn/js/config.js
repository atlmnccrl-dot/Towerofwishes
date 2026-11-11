// Bannerborn — what changes between a test build and the release. WRITTEN BY app/scripts/apply-release.js from
// app/release.json: change it there, not here. Nothing secret lives here: ad unit ids and links are public by
// nature. The AdMob *app* ids go in the native projects (the same script puts them there).
(function () {
  const BB = window.BB;
  BB.CONFIG = {
    version: '1.0.0',
    // true: every ad is a Google test ad (safe to tap). False only in the build sent to the stores, with your own
    // ad unit ids below. Tapping your own live ads in testing can get an AdMob account closed.
    testAds: true,
    admob: {
      android: { rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712' },
      ios: { rewarded: 'ca-app-pub-3940256099942544/1712485313', interstitial: 'ca-app-pub-3940256099942544/4411468910' },
    },
    // Ads are for a general audience (no gambling, no mature themes); see docs/RELEASE.md before changing.
    maxAdRating: 'ParentalGuidance',
    // Pages the stores require the app to link to (docs/store/site, hosted somewhere public).
    links: { privacy: '', terms: '', support: '' },
  };
})();
