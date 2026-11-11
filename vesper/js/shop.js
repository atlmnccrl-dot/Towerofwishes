// THE BLEEDING MOON - ads and purchases (2026-11-11, the author: "prepare for full release on app stores, implement ad
// systems: AdMob by Google and a no-ads purchase; and some paid purchases that work in this game").
//
// One face for the game, three backs:
//   native  the store apps (Capacitor): Google AdMob through @capacitor-community/admob (rewarded and interstitial ads,
//           the UMP consent form, Apple's tracking prompt) and the App Store / Google Play through cordova-plugin-purchase
//   mock    the previews and development: a test ad (a short countdown) and test purchases, clearly labelled TEST
//   off     the web build for itch.io and the like (window.VESPER_WEB_RELEASE): no ads, no shop
// What was bought lives apart from the save (localStorage 'vesper.store.v1'), so resetting or importing a save never
// takes a purchase away, and the stores' own records restore it on a new device (Restore purchases).
//
// The ads (js/main.js places them):
//   rewarded, always the player's choice: "Rise again" when she falls (once a fight), double the gold and shards of a
//     win, the Moon's Gift on the map once a day. With No Ads the reward comes at once, without the ad.
//   interstitial, between fights only: after Act I (ten wins), at most one in three finished fights and one in four
//     minutes, never in the tutorial, a film or a mode's run. None with No Ads.
// No banners: nothing covers a fight.
(function () {
  'use strict';
  const VS = window.VS = window.VS || {};
  const SH = VS.SHOP = {};
  const KEY = 'vesper.store.v1';

  // ---- configuration: fill in the real IDs before release (vesper/RELEASE.md) -------------------------------------
  // Google's public test IDs until then: they always serve test ads and never pay.
  SH.CONFIG = {
    admob: {
      android: { app: 'ca-app-pub-3940256099942544~3347511713', rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712' },
      ios: { app: 'ca-app-pub-3940256099942544~1458002511', rewarded: 'ca-app-pub-3940256099942544/1712485313', interstitial: 'ca-app-pub-3940256099942544/4411468910' },
      testing: true,             // false for the release build, with the real IDs above
      childDirected: false,      // the game is rated for teens and up (combat); set true only if the audience includes children
    },
    interstitial: { afterWins: 10, everyFights: 3, minGapSec: 240 },
    giftHours: 20,
  };
  // The products, as created in App Store Connect and the Play Console (the same IDs in both).
  //   kind: 'once' (non-consumable) or 'pack' (consumable). grant: what it gives.
  SH.PRODUCTS = [
    { id: 'vesper_no_ads', kind: 'once', name: 'No Ads', price: '$3.99', icon: 'shield',
      text: 'No ads between fights, ever. Rise again, double rewards and the Moon\'s Gift come at once, without an ad.', grant: { noAds: true } },
    { id: 'vesper_moonblade', kind: 'once', name: 'Moonblade Edition', price: '$7.99', icon: 'crown', best: true,
      text: 'No Ads, every hero unlocked now, 600 soul shards and 6,000 gold. The way to support the game.', grant: { noAds: true, heroes: true, shards: 600, gold: 6000 } },
    { id: 'vesper_starter', kind: 'once', name: 'Starter Cache', price: '$1.99', icon: 'chest', early: true,
      text: 'For the first climb: 3,000 gold, 250 soul shards and a rare weapon. Once only.', grant: { gold: 3000, shards: 250, item: 'rare' } },
    { id: 'vesper_shards_s', kind: 'pack', name: 'Pouch of Shards', price: '$0.99', icon: 'shard', text: '150 soul shards to grow your bound souls.', grant: { shards: 150 } },
    { id: 'vesper_shards_m', kind: 'pack', name: 'Chest of Shards', price: '$2.99', icon: 'shard', text: '500 soul shards.', grant: { shards: 500 } },
    { id: 'vesper_shards_l', kind: 'pack', name: 'Hoard of Shards', price: '$5.99', icon: 'shard', text: '1,200 soul shards.', grant: { shards: 1200 } },
    { id: 'vesper_gold_s', kind: 'pack', name: 'Purse of Gold', price: '$0.99', icon: 'coins', text: '1,500 gold for the blacksmith.', grant: { gold: 1500 } },
    { id: 'vesper_gold_l', kind: 'pack', name: 'Vault of Gold', price: '$4.99', icon: 'coins', text: '10,000 gold.', grant: { gold: 10000 } },
  ];
  SH.product = (id) => SH.PRODUCTS.find((p) => p.id === id);

  // ---- state ---------------------------------------------------------------------------------------------------
  const load = () => { try { return Object.assign({ owned: {}, done: {}, fights: 0, lastAd: 0, giftAt: 0 }, JSON.parse((VS.VAULT ? VS.VAULT.get(KEY) : localStorage.getItem(KEY)) || '{}')); } catch (e) { return { owned: {}, done: {}, fights: 0, lastAd: 0, giftAt: 0 }; } };
  let st = load();
  const save = () => { const str = JSON.stringify(st); try { localStorage.setItem(KEY, str); } catch (e) { /* storage blocked */ } if (VS.VAULT) VS.VAULT.put(KEY, str); };
  SH.reload = () => { st = load(); };   // after the vault brought back a newer copy (js/vault.js)
  const native = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const platform = () => (window.Capacitor && window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'web');
  SH.mode = (() => {
    if (native()) return 'native';
    const q = (location.search.match(/[?&]shop=(\w+)/) || [])[1];
    if (q === 'off' || q === 'mock') return q;
    return window.VESPER_WEB_RELEASE ? 'off' : 'mock';
  })();
  SH.on = () => SH.mode !== 'off';
  SH.test = () => SH.mode === 'mock' || (SH.mode === 'native' && SH.CONFIG.admob.testing);
  SH.owned = (id) => !!st.owned[id];
  SH.noAds = () => Object.keys(st.owned).some((id) => st.owned[id] && SH.product(id) && SH.product(id).grant.noAds);
  SH.state = () => st;
  // What owning the once-only products means for a profile (heroes unlocked); applied to every save, every launch.
  SH.applyOwned = function (p) { for (const id in st.owned) { const P = SH.product(id); if (st.owned[id] && P && P.grant.heroes && VS.DATA) for (const h of VS.DATA.HERO_ORDER) if (p.heroes.indexOf(h) < 0) p.heroes.push(h); } };

  // ---- listeners the game sets: deliver(grant, product) puts gold, shards and items into the profile ------------------
  SH.deliver = null; SH.onChange = null;
  function grant(id, txid) {
    const P = SH.product(id); if (!P) return false;
    if (txid && st.done[txid]) return false;
    if (P.kind === 'once') { if (st.owned[id]) { if (txid) { st.done[txid] = 1; save(); } return false; } st.owned[id] = true; }
    if (txid) st.done[txid] = 1; save();
    if (SH.deliver) SH.deliver(P.grant, P);
    if (SH.onChange) SH.onChange();
    return true;
  }

  // ---- the backs ---------------------------------------------------------------------------------------------------
  let admob = null, store = null, ready = false;
  const ids = () => SH.CONFIG.admob[platform() === 'ios' ? 'ios' : 'android'];
  SH.init = async function () {
    if (ready || SH.mode !== 'native') { ready = true; return; }
    ready = true;
    try {
      admob = window.Capacitor.Plugins.AdMob;
      if (admob) {
        await admob.initialize({ initializeForTesting: SH.CONFIG.admob.testing, tagForChildDirectedTreatment: SH.CONFIG.admob.childDirected });
        await SH.consent(false);
        if (!SH.noAds()) preload();
      }
    } catch (e) { console.warn('admob', e); admob = null; }
    try { setupStore(); } catch (e) { console.warn('store', e); store = null; }
  };
  // Consent (UMP) and, on iOS, Apple's tracking prompt; force: the player asked (Settings → Privacy options).
  SH.consent = async function (force) {
    if (SH.mode === 'mock') return { ok: true, test: true };
    if (!admob) return { ok: false };
    try {
      if (platform() === 'ios') { const t = await admob.trackingAuthorizationStatus(); if (t && t.status === 'notDetermined') await admob.requestTrackingAuthorization(); }
      const info = await admob.requestConsentInfo();
      if (force && admob.showPrivacyOptionsForm) await admob.showPrivacyOptionsForm();
      else if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') await admob.showConsentForm();
      return { ok: true };
    } catch (e) { console.warn('consent', e); return { ok: false }; }
  };
  let loadedR = false, loadedI = false;
  async function preload() {
    if (!admob) return;
    if (!loadedR) try { await admob.prepareRewardVideoAd({ adId: ids().rewarded, isTesting: SH.CONFIG.admob.testing }); loadedR = true; } catch (e) { /* no fill: try again later */ }
    if (!loadedI && !SH.noAds()) try { await admob.prepareInterstitial({ adId: ids().interstitial, isTesting: SH.CONFIG.admob.testing }); loadedI = true; } catch (e) { /* no fill */ }
  }
  function setupStore() {
    const C = window.CdvPurchase; if (!C) return;
    store = C.store; const plat = platform() === 'ios' ? C.Platform.APPLE_APPSTORE : C.Platform.GOOGLE_PLAY;
    store.register(SH.PRODUCTS.map((p) => ({ id: p.id, type: p.kind === 'once' ? C.ProductType.NON_CONSUMABLE : C.ProductType.CONSUMABLE, platform: plat })));
    store.when()
      .approved((t) => { for (const pr of t.products) grant(pr.id, t.transactionId); t.finish(); })
      .receiptUpdated(() => { for (const p of SH.PRODUCTS) if (p.kind === 'once') { const sp = store.get(p.id, plat); if (sp && sp.owned && !st.owned[p.id]) grant(p.id); } })
      .productUpdated(() => { if (SH.onChange) SH.onChange(); });
    store.error((e) => console.warn('store error', e && e.message));
    store.initialize([plat]);
  }
  // The price to show: the store's own (in the player's currency), or the planned one.
  SH.price = function (id) {
    if (store) { const p = store.get(id); if (p && p.pricing && p.pricing.price) return p.pricing.price; }
    const P = SH.product(id); return P ? P.price : '';
  };

  // ---- the test back: a short countdown for an ad, a confirm for a purchase -------------------------------------------
  function mockAd(kind) {
    return new Promise((res) => {
      const el = document.createElement('div');
      Object.assign(el.style, { position: 'fixed', inset: '0', zIndex: 50, background: 'rgba(4,2,6,0.94)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f3eef0', font: '16px sans-serif', gap: '10px' });
      let n = kind === 'rewarded' ? 3 : 2;
      el.innerHTML = `<div style="font-size:12px;letter-spacing:.3em;color:#ff8a9a">TEST AD · ${kind.toUpperCase()}</div><div class="n" style="font-size:44px">${n}</div><div style="font-size:12px;color:#a99aa2">In the store app a real AdMob ad plays here.</div>`;
      document.body.appendChild(el);
      const tick = setInterval(() => { n--; el.querySelector('.n').textContent = n; if (n <= 0) { clearInterval(tick); el.remove(); res(true); } }, 700);
    });
  }

  // ---- the game's calls -----------------------------------------------------------------------------------------------
  // A rewarded ad the player chose: resolves true when the reward is earned (at once with No Ads).
  SH.rewarded = async function (placement) {
    if (!SH.on()) return false;
    if (SH.noAds()) return true;
    if (SH.mode === 'mock') return mockAd('rewarded');
    if (!admob) return false;
    try {
      if (!loadedR) await preload();
      if (!loadedR) return false;
      loadedR = false; const r = await admob.showRewardVideoAd(); preload();
      st.lastAd = Date.now(); save();
      return !!r;
    } catch (e) { preload(); return false; }
  };
  SH.rewardReady = () => SH.on() && (SH.noAds() || SH.mode === 'mock' || !!admob);
  // After a finished fight: maybe an interstitial (the rules above), then go on.
  SH.betweenFights = async function (wins) {
    st.fights++; save();
    if (!SH.on() || SH.noAds()) return;
    const C = SH.CONFIG.interstitial;
    if ((wins || 0) < C.afterWins || st.fights % C.everyFights !== 0 || Date.now() - st.lastAd < C.minGapSec * 1000) return;
    st.lastAd = Date.now(); save();
    if (SH.mode === 'mock') { await mockAd('interstitial'); return; }
    if (!admob || !loadedI) { preload(); return; }
    try { loadedI = false; await admob.showInterstitial(); } catch (e) { /* not shown */ }
    preload();
  };
  // The Moon's Gift: once every giftHours.
  SH.giftReady = () => SH.on() && Date.now() - (st.giftAt || 0) > SH.CONFIG.giftHours * 3600e3;
  SH.giftTaken = () => { st.giftAt = Date.now(); save(); };
  // Buying: resolves { ok, msg }.
  SH.buy = async function (id) {
    const P = SH.product(id); if (!P || !SH.on()) return { ok: false, msg: 'Purchases are not available here.' };
    if (P.kind === 'once' && st.owned[id]) return { ok: false, msg: 'Already yours.' };
    if (SH.mode === 'mock') return { ok: grant(id, 'test-' + id + '-' + Date.now()), msg: 'Test purchase: no money was taken.' };
    if (!store) return { ok: false, msg: 'The store is not ready. Try again in a moment.' };
    try {
      const sp = store.get(id); const offer = sp && sp.getOffer && sp.getOffer();
      if (!offer) return { ok: false, msg: 'This item is not available right now.' };
      const err = await offer.order();
      return err ? { ok: false, msg: err.message || 'The purchase did not go through.' } : { ok: true, pending: true, msg: 'Thank you!' };
    } catch (e) { return { ok: false, msg: 'The purchase did not go through.' }; }
  };
  SH.restore = async function () {
    if (SH.mode === 'mock') return { ok: true, msg: 'Test mode: purchases are kept on this device.' };
    if (!store) return { ok: false, msg: 'The store is not ready.' };
    try { await store.restorePurchases(); return { ok: true, msg: 'Purchases restored.' }; } catch (e) { return { ok: false, msg: 'Could not restore purchases.' }; }
  };
  // (Tests and the dev tools: forget every test purchase on this device.)
  SH.resetTest = () => { if (SH.mode !== 'mock') return; st = { owned: {}, done: {}, fights: 0, lastAd: 0, giftAt: 0 }; save(); if (SH.onChange) SH.onChange(); };
})();
