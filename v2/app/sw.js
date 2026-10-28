// The offline cache for the installable web version (not used inside the iOS and Android app, which
// ships every file). The game's code and the small art load on install; character sheets and sounds
// are kept the first time they are fetched.
const VERSION = 'vael-1.3.0';
const CORE = ['./', 'index.html', 'manifest.json', 'assets/portraits.json', 'assets/portraits.png', 'assets/fonts/Cinzel-700.woff2', 'assets/fonts/BarlowSC-600.woff2', 'assets/fonts/BarlowSC-700.woff2', 'assets/fonts/Silkscreen.woff2',
  'assets/fx/fx.json', 'assets/tiles/tiles.json', 'assets/world/world.json', 'assets/heroes/heroes.json', 'assets/heroes/heroes.webp'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
    return res;
  })));
});
