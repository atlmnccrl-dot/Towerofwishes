// The save vault (js/vault.js): the newest copy wins at start, a broken save falls back to its last good copy,
// and every write reaches the native store. Runs in Node with a fake localStorage and a fake Preferences plugin.
// Usage: node vesper/test/vault-test.js
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const path = require.resolve('../js/vault.js');
function world(local, native) {
  const L = Object.assign({}, local), N = Object.assign({}, native);
  globalThis.localStorage = { getItem: (k) => (k in L ? L[k] : null), setItem: (k, v) => { L[k] = String(v); } };
  globalThis.Capacitor = native === undefined ? undefined : { isNativePlatform: () => true, Plugins: { Preferences: {
    get: async ({ key }) => ({ value: key in N ? N[key] : null }), set: async ({ key, value }) => { N[key] = value; } } } };
  globalThis.VS = {}; delete require.cache[path]; require(path); return { L, N, V: globalThis.VS.VAULT };
}
const K = 'vesper.save.v2', S = 'vesper.store.v1', save = (lvl) => JSON.stringify({ v: 2, lvl });
(async () => {
  // A phone that lost its localStorage: the native copy comes back.
  { const w = world({}, { [K]: JSON.stringify({ at: 100, data: save(12) }) }); ok(await w.V.ready === true, 'restore reports a change'); ok(JSON.parse(w.L[K]).lvl === 12, 'native save restored'); }
  // localStorage newer than the native copy: localStorage stays, the native copy is updated.
  { const w = world({ [K]: save(20), [K + '.at']: '500' }, { [K]: JSON.stringify({ at: 100, data: save(12) }) }); ok(await w.V.ready === false, 'no change when local is newer'); ok(JSON.parse(JSON.parse(w.N[K]).data).lvl === 20, 'native copy brought up to date'); }
  // Native newer (written by a later session that then lost localStorage's timestamp): native wins.
  { const w = world({ [K]: save(5), [K + '.at']: '50' }, { [K]: JSON.stringify({ at: 900, data: save(30) }) }); await w.V.ready; ok(JSON.parse(w.L[K]).lvl === 30, 'newer native copy wins'); }
  // An old save from before the vault (no timestamp, no native copy): pushed to the native store.
  { const w = world({ [K]: save(7) }, {}); await w.V.ready; ok(w.N[K] && JSON.parse(JSON.parse(w.N[K]).data).lvl === 7, 'pre-vault save copied to native'); }
  // Writes reach every copy; a broken save falls back to its last good copy.
  { const w = world({}, {}); await w.V.ready; w.L[K] = save(9); w.V.put(K, save(9)); await new Promise((r) => setTimeout(r, 0));
    ok(JSON.parse(JSON.parse(w.N[K]).data).lvl === 9, 'put reaches native'); ok(JSON.parse(JSON.parse(w.L[K + '.bak']).data).lvl === 9, 'put keeps a backup');
    w.L[K] = '{"v":2,"lvl":'; ok(JSON.parse(w.V.get(K)).lvl === 9, 'broken save falls back to the backup'); ok(JSON.parse(w.L[K]).lvl === 9, 'and is repaired'); }
  // The purchases record goes through the vault too.
  { const w = world({}, { [S]: JSON.stringify({ at: 10, data: '{"owned":{"vesper_no_ads":1}}' }) }); await w.V.ready; ok(JSON.parse(w.L[S]).owned.vesper_no_ads === 1, 'purchases restored'); }
  // The web (no Capacitor): nothing to wait for, localStorage alone.
  { const w = world({ [K]: save(3) }, undefined); ok(await w.V.ready === false, 'web: ready is false'); ok(!w.V.native(), 'web: not native'); }
  console.log(fails ? fails + ' failures' : 'vault sound'); process.exit(fails ? 1 : 0);
})();
