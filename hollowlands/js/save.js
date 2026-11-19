'use strict';
// HOLLOWLANDS — inventory rules and the versioned save file. Pure (no DOM): tested in Node.
HL.Inv = {
  count: (inv, id) => inv[id] || 0,
  has: (inv, id, n = 1) => (inv[id] || 0) >= n,
  add(inv, id, n = 1) {
    const it = HL.ITEMS[id]; if (!it) return 0;
    const cap = it.stack || 1, cur = inv[id] || 0;
    const add = Math.max(0, Math.min(n, cap - cur));
    if (add) inv[id] = cur + add;
    return add;
  },
  remove(inv, id, n = 1) {
    if ((inv[id] || 0) < n) return false;
    inv[id] -= n; if (inv[id] <= 0) delete inv[id];
    return true;
  },
  canPay: (inv, need) => Object.entries(need).every(([id, n]) => (inv[id] || 0) >= n),
  pay(inv, need) { if (!HL.Inv.canPay(inv, need)) return false; for (const [id, n] of Object.entries(need)) HL.Inv.remove(inv, id, n); return true; },
  craft(inv, r) {
    const it = HL.ITEMS[r.out];
    if (!HL.Inv.canPay(inv, r.need) || (inv[r.out] || 0) >= (it.stack || 1)) return false;
    HL.Inv.pay(inv, r.need); HL.Inv.add(inv, r.out, r.n); return true;
  },
  // stable display order: equipment, consumables, keys, materials, documents
  sorted(inv) {
    const order = { weapon: 0, armor: 1, relic: 2, consumable: 3, key: 4, doc: 5, material: 6 };
    return Object.keys(inv).filter((id) => inv[id] > 0 && HL.ITEMS[id]).sort((a, b) => order[HL.ITEMS[a].kind] - order[HL.ITEMS[b].kind] || HL.ITEMS[a].name.localeCompare(HL.ITEMS[b].name));
  },
};

HL.Save = {
  VERSION: 1,
  KEY: 'hollowlands.save',
  BAK: 'hollowlands.save.bak',
  packFog(fog) { let s = ''; for (let i = 0; i < fog.length; i++) s += fog[i] ? '1' : '0'; return s.replace(/(0{4,}|1{4,})/g, (m) => m[0] + m.length + '.'); },
  unpackFog(s, len) {
    const out = new Uint8Array(len); if (!s) return out;
    const flat = s.replace(/([01])(\d+)\./g, (m, c, n) => c.repeat(+n));
    for (let i = 0; i < len && i < flat.length; i++) out[i] = flat[i] === '1' ? 1 : 0;
    return out;
  },
  snapshot(G) {
    const p = G.player;
    return {
      v: HL.Save.VERSION, t: Date.now(), playtime: Math.round(G.playtime || 0),
      map: G.world.id, x: Math.round(p.x), y: Math.round(p.y), hp: Math.round(p.hp), ult: Math.round(p.ult),
      inv: Object.assign({}, G.inv), eq: Object.assign({}, G.eq), wlv: Object.assign({}, G.wlv),
      flags: Object.assign({}, G.flags), journal: G.journal.slice(), fire: Object.assign({}, G.fire),
      fog: Object.fromEntries(Object.entries(G.fogs || {}).map(([k, f]) => [k, HL.Save.packFog(f)])),
      settings: Object.assign({}, G.settings),
    };
  },
  validate(d) {
    if (!d || typeof d !== 'object' || d.v !== HL.Save.VERSION) return false;
    if (!HL.MAPS[d.map] || !Number.isFinite(d.x) || !Number.isFinite(d.y) || !Number.isFinite(d.hp)) return false;
    if (typeof d.inv !== 'object' || typeof d.flags !== 'object' || !Array.isArray(d.journal) || typeof d.eq !== 'object') return false;
    return true;
  },
  write(store, G) {
    try {
      const data = JSON.stringify(HL.Save.snapshot(G));
      const prev = store.getItem(HL.Save.KEY);
      if (prev) store.setItem(HL.Save.BAK, prev);
      store.setItem(HL.Save.KEY, data);
      return true;
    } catch (e) { return false; }
  },
  read(store) {
    for (const k of [HL.Save.KEY, HL.Save.BAK]) {
      try { const d = JSON.parse(store.getItem(k)); if (HL.Save.validate(d)) return d; } catch (e) { /* try the backup */ }
    }
    return null;
  },
  clear(store) { store.removeItem(HL.Save.KEY); store.removeItem(HL.Save.BAK); },
};
