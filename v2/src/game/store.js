// Real-money purchases, through the app stores only. Inside the iOS or Android app (Capacitor with
// cordova-plugin-purchase) this talks to StoreKit or Google Play Billing; on the web nothing is sold
// and the shop says the packs are in the app. Granting is in economy.js (grantProduct).
//
//   const shop = createStore({ onGrant(productId, transactionId) {...}, onChange() {...} })
//   shop.available      true inside the app once the store is ready
//   shop.price(id)      the store's localized price, or the catalog's fallback
//   shop.buy(id)        starts a purchase (the store shows its own sheet)
//   shop.restore()      restores bought non-consumables (required by Apple)
import { PRODUCTS } from './economy.js';

export function createStore({ onGrant, onChange = () => {}, onError = () => {} }) {
  const api = { available: false, price: (id) => (PRODUCTS.find((p) => p.id === id) || {}).price, buy: () => false, restore: () => false };
  const C = typeof window !== 'undefined' && window.CdvPurchase;
  if (!C) return api;
  const { store, ProductType, Platform } = C;
  const platforms = [Platform.APPLE_APPSTORE, Platform.GOOGLE_PLAY];
  const type = (p) => (p.type === 'consumable' ? ProductType.CONSUMABLE : ProductType.NON_CONSUMABLE);
  store.register(platforms.flatMap((platform) => PRODUCTS.map((p) => ({ id: p.id, type: type(p), platform }))));
  // an approved purchase is granted, then finished so the store does not deliver it again
  store.when()
    .approved((tx) => { for (const p of tx.products) onGrant(p.id, tx.transactionId); tx.finish(); onChange(); })
    .productUpdated(() => onChange());
  store.error((e) => onError(e && e.message ? e.message : String(e)));
  store.initialize(platforms).then(() => { api.available = true; onChange(); });
  api.price = (id) => { const p = store.get(id); return (p && p.pricing && p.pricing.price) || (PRODUCTS.find((x) => x.id === id) || {}).price; };
  api.buy = (id) => { const p = store.get(id), offer = p && p.getOffer(); if (!offer) { onError('That pack is not available right now.'); return false; } offer.order(); return true; };
  api.restore = () => { store.restorePurchases(); return true; };
  return api;
}
