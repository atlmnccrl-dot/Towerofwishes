// Bannerborn — the till. Ads and purchases behind one small interface, so the game never speaks to an ad network or
// an app store itself. Three ways it can run:
//   native   inside the app (Capacitor): Google AdMob for ads, the App Store / Google Play for purchases
//   preview  in a browser: an ad is a few seconds' card that says so, a purchase asks and then simply gives. Nothing
//            is charged and nothing leaves the page. This is what the web build and the tests use.
//   off      `?store=off`: no ads, nothing for sale (how the game was before)
// What is sold and what an ad is worth are rules (js/rules.js: BB.PRODUCTS, BB.AD_SPOTS, BB.interstitialDue).
(function () {
  const BB = window.BB;
  const cap = window.Capacitor, native = !!(cap && cap.isNativePlatform && cap.isNativePlatform()), platform = native ? cap.getPlatform() : 'web';
  const q = new URLSearchParams(location.search), off = q.get('store') === 'off';
  const C = BB.CONFIG, plug = (n) => (cap && cap.Plugins ? cap.Plugins[n] : null);
  const now = () => Date.now(), wait = (ms) => new Promise((r) => setTimeout(r, ms));
  BB.BUILD = { native, platform, version: C.version, mode: off ? 'off' : native ? 'native' : 'preview' };
  const st = { battles: 0, lastAd: 0, busy: false };
  document.documentElement.dataset.store = BB.BUILD.mode;

  // ---------------------------------------------------------------- the preview's stand-in for an ad
  function card(title, secs, canClose) {
    return new Promise((res) => {
      const el = document.createElement('div'); el.id = 'adCard';
      el.innerHTML = '<div class="in"><small>Preview · not a real ad</small><b>' + title + '</b><p>In the app this is where a Google ad plays.</p><div class="bar"><i></i></div><button class="btn dark sm" disabled></button></div>';
      document.body.appendChild(el);
      const btn = el.querySelector('button'), bar = el.querySelector('.bar i'), t0 = performance.now();
      const tick = () => {
        const k = Math.min(1, (performance.now() - t0) / (secs * 1000)); bar.style.width = k * 100 + '%';
        btn.textContent = k < 1 ? Math.ceil(secs * (1 - k)) + ' s' : 'Close'; btn.disabled = k < 1 && !canClose;
        if (k < 1 && el.isConnected) requestAnimationFrame(tick);
      };
      btn.onclick = () => { const full = performance.now() - t0 >= secs * 1000 - 50; el.remove(); res(full); };
      tick();
    });
  }
  const hush = (on) => { if (BB.audioHush) BB.audioHush(on); };

  // ---------------------------------------------------------------- ads
  const units = () => C.admob[platform] || {};
  const Ads = BB.Ads = {
    mode: off ? 'off' : native ? (plug('AdMob') ? 'admob' : 'off') : 'preview', ready: false, state: st,
    async init() {
      if (native && !off) Ads.mode = plug('AdMob') ? 'admob' : 'off';
      if (Ads.mode !== 'admob') { Ads.ready = Ads.mode === 'preview'; return; }
      const A = plug('AdMob');
      try {
        await A.initialize({ initializeForTesting: !!C.testAds, maxAdContentRating: C.maxAdRating });
        if (platform === 'ios') { const t = await A.trackingAuthorizationStatus(); if (t && t.status === 'notDetermined') await A.requestTrackingAuthorization(); }
        const info = await A.requestConsentInfo(); // Europe and the UK: Google's own consent form, when it is owed
        Ads.privacyOwed = info && info.privacyOptionsRequirementStatus === 'REQUIRED';
        if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') { const after = await A.showConsentForm(); Ads.canRequest = !!after.canRequestAds; } else Ads.canRequest = !info || info.canRequestAds !== false;
        Ads.ready = true; Ads.preload();
      } catch (e) { Ads.error = String(e && e.message || e); }
    },
    preload() { // have the next ad waiting, so a tap does not stare at a spinner
      if (Ads.mode !== 'admob' || !Ads.ready || Ads.canRequest === false) return;
      const A = plug('AdMob'), u = units(), o = (id) => ({ adId: id, isTesting: !!C.testAds });
      if (!Ads.rvLoaded && !Ads.rvLoading) { Ads.rvLoading = true; A.prepareRewardVideoAd(o(u.rewarded)).then(() => { Ads.rvLoaded = true; }).catch(() => {}).finally(() => { Ads.rvLoading = false; }); }
      if (!BB.hasNoAds(BB.save) && !Ads.inLoaded && !Ads.inLoading) { Ads.inLoading = true; A.prepareInterstitial(o(u.interstitial)).then(() => { Ads.inLoaded = true; }).catch(() => {}).finally(() => { Ads.inLoading = false; }); }
    },
    // can the player be offered a bonus for watching? (those who bought their quiet are simply given it)
    offers() { return Ads.mode !== 'off' && !!BB.save; },
    // Watch an ad for a bonus. Resolves true when the bonus is earned. The caller counts it against the day's cap.
    async rewarded(spot) {
      if (Ads.mode === 'off' || st.busy) return false;
      if (BB.hasNoAds(BB.save)) return true;
      st.busy = true; hush(true);
      try {
        if (Ads.mode === 'preview') { const ok = await card((BB.AD_SPOTS[spot] || {}).name || 'A bonus', 3, false); st.lastAd = now(); return ok; }
        const A = plug('AdMob'), u = units();
        if (!Ads.rvLoaded) await A.prepareRewardVideoAd({ adId: u.rewarded, isTesting: !!C.testAds });
        Ads.rvLoaded = false;
        let earned = false, closed; const done = new Promise((r) => (closed = r)), hs = [];
        hs.push(await A.addListener('onRewardedVideoAdReward', () => { earned = true; }));
        hs.push(await A.addListener('onRewardedVideoAdDismissed', () => closed()));
        hs.push(await A.addListener('onRewardedVideoAdFailedToShow', () => closed()));
        A.showRewardVideoAd().then(() => { earned = true; }).catch(() => closed());
        await Promise.race([done, wait(120000)]);
        hs.forEach((h) => h && h.remove && h.remove());
        st.lastAd = now(); return earned;
      } catch (e) { return false; } finally { st.busy = false; hush(false); Ads.preload(); }
    },
    battleDone() { st.battles++; },
    // Between battles: shown only when the rules say one is due, and never twice in a row.
    async between() {
      if (Ads.mode === 'off' || st.busy || !BB.save || !BB.interstitialDue(BB.save, st, now())) return false;
      st.busy = true; hush(true);
      try {
        if (Ads.mode === 'preview') await card('Between battles', 2.5, true);
        else {
          if (!Ads.inLoaded) return false; // none waiting: never hold the player up for one
          const A = plug('AdMob'); Ads.inLoaded = false;
          let closed; const done = new Promise((r) => (closed = r)), hs = [];
          hs.push(await A.addListener('interstitialAdDismissed', () => closed())); hs.push(await A.addListener('interstitialAdFailedToShow', () => closed()));
          A.showInterstitial().catch(() => closed());
          await Promise.race([done, wait(90000)]); hs.forEach((h) => h && h.remove && h.remove());
        }
        st.battles = 0; st.lastAd = now(); return true;
      } catch (e) { return false; } finally { st.busy = false; hush(false); Ads.preload(); }
    },
    // the choices Google's consent form gave, shown again (Settings); only where the law asks for it
    async privacy() { const A = plug('AdMob'); if (Ads.mode === 'admob' && A) { try { await A.showPrivacyOptionsForm(); } catch (e) { /* nothing owed here */ } return true; } return false; },
  };

  // ---------------------------------------------------------------- purchases
  const waiting = {}; // sku -> resolve, while a purchase is open
  function given(out) { BB.persist(); if (IAP.onGrant) IAP.onGrant(out); const w = waiting[out.sku]; if (w) { delete waiting[out.sku]; w({ ok: true, given: out }); } }
  function grant(sku, tx) { const out = BB.grantProduct(BB.save, sku, now(), tx); if (out) { out.sku = BB.product(sku).sku; given(out); } return out; }
  const IAP = BB.IAP = {
    mode: off ? 'off' : native ? (window.CdvPurchase ? 'store' : 'off') : 'preview', ready: false, onGrant: null,
    async init() {
      if (native && !off) IAP.mode = window.CdvPurchase ? 'store' : 'off';
      if (IAP.mode !== 'store') { IAP.ready = IAP.mode === 'preview'; return; }
      const P = window.CdvPurchase, S = P.store, plat = platform === 'ios' ? P.Platform.APPLE_APPSTORE : P.Platform.GOOGLE_PLAY;
      S.register(BB.PRODUCTS.map((p) => ({ id: p.sku, platform: plat, type: p.kind === 'once' ? P.ProductType.NON_CONSUMABLE : P.ProductType.CONSUMABLE })));
      S.when()
        .approved((t) => t.verify())
        .verified((r) => { for (const t of (r.sourceReceipt && r.sourceReceipt.transactions) || []) for (const p of t.products || []) if (BB.product(p.id) && BB.save) grant(p.id, t.transactionId || t.purchaseId || p.id); r.finish(); })
        .receiptsReady(() => IAP.sync());
      try { await S.initialize([plat]); IAP.ready = true; IAP.sync(); } catch (e) { IAP.error = String(e && e.message || e); }
    },
    // what was bought for good on this account is owned again on a new phone
    sync() { if (IAP.mode !== 'store' || !BB.save) return; const S = window.CdvPurchase.store; for (const p of BB.PRODUCTS) if (p.kind === 'once' && !BB.iap(BB.save).owned[p.id] && S.owned(p.sku)) grant(p.sku); },
    available() { return IAP.mode !== 'off'; },
    price(id) {
      const p = BB.product(id); if (!p) return '';
      if (IAP.mode === 'store' && IAP.ready) { const sp = window.CdvPurchase.store.get(p.sku), pr = sp && sp.pricing; if (pr && pr.price) return pr.price; }
      return '$' + p.usd.toFixed(2);
    },
    owned(id) { return !!(BB.save && BB.save.iap && BB.save.iap.owned[id]); },
    async buy(id) {
      const p = BB.product(id); if (!p || !BB.save || IAP.mode === 'off') return { ok: false };
      if (p.kind === 'once' && IAP.owned(p.id)) return { ok: false, owned: true };
      if (IAP.mode === 'preview') {
        const yes = await new Promise((r) => BB.UI.confirm('<b>' + p.name + '</b> · ' + IAP.price(id) + '<br><span style="font-size:13px;color:#9aa3b3">Preview: nothing is charged. In the app this is the App Store or Google Play sheet.</span>', () => r(true), () => r(false)));
        if (!yes) return { ok: false, cancelled: true };
        const out = BB.grantProduct(BB.save, p.id, now(), 'preview-' + now()); if (!out) return { ok: false }; out.sku = p.sku; BB.persist(); if (IAP.onGrant) IAP.onGrant(out);
        return { ok: true, given: out };
      }
      const S = window.CdvPurchase.store, sp = S.get(p.sku), offer = sp && sp.getOffer();
      if (!offer) return { ok: false, error: 'The store did not list this yet. Try again in a moment.' };
      const done = new Promise((r) => (waiting[p.sku] = r));
      const err = await S.order(offer);
      if (err) { delete waiting[p.sku]; return { ok: false, cancelled: err.code === window.CdvPurchase.ErrorCode.PAYMENT_CANCELLED, error: err.message }; }
      return Promise.race([done, wait(120000).then(() => ({ ok: false, pending: true }))]); // a slow bank: it is given when the store says so
    },
    async restore() {
      if (IAP.mode !== 'store') return IAP.mode === 'preview';
      try { await window.CdvPurchase.store.restorePurchases(); IAP.sync(); return true; } catch (e) { return false; }
    },
  };

  // ---------------------------------------------------------------- the save, kept twice inside the app
  // A phone may clear a web view's storage when it runs short of room. Inside the app the save is also written to
  // the app's own preferences, and read back from there if the page's copy is gone.
  const KEY = 'bannerborn.save.v2', prefs = () => plug('Preferences');
  BB.nativeRestore = async function () {
    const P = prefs(); if (!native || !P) return;
    try { const have = localStorage.getItem(KEY); if (!have) { const v = await P.get({ key: KEY }); if (v && v.value) localStorage.setItem(KEY, v.value); } } catch (e) { /* first run */ }
  };
  BB.nativeMirror = function (json) { const P = prefs(); if (native && P) P.set({ key: KEY, value: json }).catch(() => {}); };
  BB.openLink = function (url) { if (!url) return false; const B = plug('Browser'); if (B) B.open({ url }); else window.open(url, '_blank', 'noopener'); return true; };

  // inside the app, wait for the plugins to say they are there (or a moment, if they never do)
  const plugged = () => (native && !window.CdvPurchase ? Promise.race([new Promise((r) => document.addEventListener('deviceready', r, { once: true })), wait(2500)]) : Promise.resolve());
  BB.storeInit = async function () { await plugged(); await Promise.all([Ads.init(), IAP.init()]); };
})();
