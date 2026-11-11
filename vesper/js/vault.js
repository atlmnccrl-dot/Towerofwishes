// THE BLEEDING MOON - the save vault (2026-11-11: "saves are fragile"). The game keeps its save and what was bought in
// localStorage, which a phone may clear when it runs short of space. The vault keeps a second copy of each:
//   - in the store apps, in the platform's own app storage through @capacitor/preferences (UserDefaults on iOS,
//     SharedPreferences on Android). The system never purges it, and the phone's own backups carry it to a new
//     device (iCloud / computer backup on iOS, Android's Auto Backup to Google Drive);
//   - everywhere, a last good copy in localStorage ('<key>.bak'), so a save that fails to parse falls back to it.
// Each copy carries the time it was written; at start the newest copy wins and is put back where it is missing.
// No servers: nothing leaves the device but the platform's own backups.
(function () {
  'use strict';
  const VS = (globalThis.VS = globalThis.VS || {});
  const V = (VS.VAULT = {});
  V.KEYS = ['vesper.save.v2', 'vesper.store.v1'];
  const pref = () => { const C = globalThis.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.Preferences; };
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* blocked */ } } };
  const okJson = (s) => { if (!s) return false; try { JSON.parse(s); return true; } catch (e) { return false; } };
  V.native = () => !!pref();

  // Write: the game has just put `str` under `key` in localStorage; keep the copies.
  V.put = function (key, str) {
    const at = Date.now();
    ls.set(key + '.at', String(at));
    if (okJson(str)) ls.set(key + '.bak', JSON.stringify({ at, data: str }));
    const P = pref(); if (P) P.set({ key, value: JSON.stringify({ at, data: str }) }).catch(() => {});
  };
  // Read for the game: the localStorage value, or the last good copy when it is missing or broken.
  V.get = function (key) {
    const s = ls.get(key); if (okJson(s)) return s;
    try { const b = JSON.parse(ls.get(key + '.bak') || 'null'); if (b && okJson(b.data)) { ls.set(key, b.data); return b.data; } } catch (e) { /* none */ }
    return s;
  };
  // At start: bring the newest copy of each key into localStorage (and the native copy up to date).
  // Resolves true when it changed localStorage, so the game reloads what it read.
  V.ready = (async function () {
    const P = pref(); if (!P) return false;
    let changed = false;
    for (const key of V.KEYS) {
      try {
        const r = await P.get({ key }); let nat = null; try { nat = r && r.value ? JSON.parse(r.value) : null; } catch (e) { nat = null; }
        const local = ls.get(key), at = +(ls.get(key + '.at') || 0);
        if (nat && okJson(nat.data) && (!okJson(local) || nat.at > at)) { ls.set(key, nat.data); ls.set(key + '.at', String(nat.at)); changed = true; }
        else if (okJson(local) && (!nat || at > (nat.at || 0) || !at)) await P.set({ key, value: JSON.stringify({ at: at || Date.now(), data: local }) });
      } catch (e) { /* plugin missing: localStorage alone */ }
    }
    return changed;
  })();
})();
