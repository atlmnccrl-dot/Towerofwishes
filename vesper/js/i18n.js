// THE BLEEDING MOON - languages (2026-11-11). English is the game's own text; the other languages are tables of
// English -> translation (js/i18n_<code>.js). Nothing in the screens' code changes: the text is translated where it
// reaches the screen.
//   - everything drawn on the canvas (fillText / strokeText / measureText, so sizes stay right);
//   - the menus' text nodes (a MutationObserver on the page);
//   - the few places that wrap a long line into lines translate the whole line first (I.t).
// A string is looked up exactly, then without regard to case and spacing (a CAPS label gets a CAPS translation),
// then with its numbers as # ('Level 12' -> 'Level #'), then piece by piece around ' · ' and ': ', then sentence by
// sentence. Generated item names ("Thirsting Iron Spear of Fortune") are rebuilt from their parts in each language's
// word order. What has no translation stays in English.
(function () {
  'use strict';
  const VS = (globalThis.VS = globalThis.VS || {});
  const I = (VS.I18N = { lang: 'en', D: {}, ITEM: {} });
  I.LANGS = [['en', 'English'], ['es', 'Español'], ['pt', 'Português'], ['fr', 'Français'], ['de', 'Deutsch']];
  let map = null, lower = null; const cache = new Map();
  const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const caps = (s) => /[A-Z]/.test(s) && s === s.toUpperCase();
  function build() {
    const d = I.D[I.lang]; cache.clear();
    if (!d || I.lang === 'en') { map = lower = null; return; }
    map = new Map(Object.entries(d)); lower = new Map(); for (const k in d) lower.set(norm(k), d[k]);
  }
  I.add = (code, dict, items) => { I.D[code] = Object.assign(I.D[code] || {}, dict); if (items) I.ITEM[code] = items; if (code === I.lang) build(); };
  I.auto = () => { try { const l = (navigator.language || 'en').slice(0, 2).toLowerCase(); return I.LANGS.some((x) => x[0] === l) ? l : 'en'; } catch (e) { return 'en'; } };
  I.set = (code) => {
    I.lang = I.LANGS.some((x) => x[0] === code) ? code : 'en'; build();
    try { document.documentElement.lang = I.lang; if (document.body) walk(document.body); } catch (e) { /* no page (Node) */ }
  };
  I.name = () => (I.LANGS.find((x) => x[0] === I.lang) || I.LANGS[0])[1];

  function look(s) {
    let v = map.get(s); if (v != null) return v;
    v = lower.get(norm(s)); if (v != null) return caps(s) ? v.toUpperCase() : v;
    return null;
  }
  // Item names: [prefix] tier base [suffix], each affix given in its "of ..." form so no adjective has to agree.
  const PRE = { Keen: 'of Edges', Sturdy: 'of the Wall', Warded: 'of Warding', Moonlit: 'of the Moon', Thirsting: 'of Thirst', Swift: 'of Haste', Fleet: 'of Wind', Steady: 'of Patience', Mending: 'of Mending', Gilded: 'of Fortune' };
  const ITEM_RE = /^(?:(Keen|Sturdy|Warded|Moonlit|Thirsting|Swift|Fleet|Steady|Mending|Gilded) )?(Iron|Steel|Moonsteel|Bloodsteel|Bone|Silver|Moon|Blood) (Blade|Saber|Axe|Spear|Greatsword|Coat|Mail|Plate|Cloak|Locket|Ring|Fang|Talisman)( of [A-Za-z ]+)?$/;
  function item(s) {
    const T = I.ITEM[I.lang], m = T && ITEM_RE.exec(s); if (!m) return null;
    const sufs = [m[1] && PRE[m[1]], m[4] && m[4].trim()].filter(Boolean).map((x) => T.suf[x] || x);
    return T.make(T.base[m[3]] || m[3], T.tier[m[2]] || m[2], sufs);
  }
  function one(s) {
    if (!s.trim()) return s;
    let v = look(s); if (v != null) return v;
    if (/\d/.test(s)) {
      const nums = []; const tpl = s.replace(/\d[\d,.]*/g, (x) => { nums.push(x); return '#'; });
      v = look(tpl); if (v != null) { let i = 0; return v.replace(/#/g, () => (i < nums.length ? nums[i++] : '')); }
    }
    v = item(s); if (v) return caps(s) ? v.toUpperCase() : v;
    return null;
  }
  function tr(core) {
    let v = one(core); if (v != null) return v;
    if (/·/.test(core)) { const parts = core.split(/(\s*·\s*)/); const o = parts.map((p, i) => (i % 2 ? p : one(p))); if (o.some((x, i) => i % 2 === 0 && x != null)) return o.map((x, i) => (x == null ? parts[i] : x)).join(''); }
    if (/, /.test(core)) { const parts = core.split(/(,\s+)/); const o = parts.map((p, i) => (i % 2 ? p : one(p))); if (o.some((x, i) => i % 2 === 0 && x != null)) return o.map((x, i) => (x == null ? parts[i] : x)).join(''); }
    const c = core.indexOf(': ');
    if (c > 0 && c < 40) { const a = one(core.slice(0, c)), b = tr(core.slice(c + 2)); if (a != null || b != null) return (a == null ? core.slice(0, c) : a) + ': ' + (b == null ? core.slice(c + 2) : b); }
    const ss = core.split(/(?<=[.!?])\s+(?=[A-Z“"])/);
    if (ss.length > 1) { const o = ss.map(one); if (o.some((x) => x != null)) return o.map((x, i) => (x == null ? ss[i] : x)).join(' '); }
    return null;
  }
  I.t = function (s) {
    if (!map || typeof s !== 'string' || !/[A-Za-z]/.test(s)) return s;
    const c = cache.get(s); if (c !== undefined) return c;
    const lead = /^\s*/.exec(s)[0], trail = /\s*$/.exec(s)[0], v = tr(s.trim());
    const out = v == null ? s : lead + v + trail;
    if (cache.size > 8000) cache.clear(); cache.set(s, out); return out;
  };

  // ---- the hooks -----------------------------------------------------------------------------------------------------
  if (typeof CanvasRenderingContext2D !== 'undefined') {
    const P = CanvasRenderingContext2D.prototype;
    for (const m of ['fillText', 'strokeText', 'measureText']) { const o = P[m]; P[m] = function (t, ...a) { return o.call(this, map && typeof t === 'string' ? I.t(t) : t, ...a); }; }
  }
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1 };
  function walk(n) {
    if (!map) return;
    if (n.nodeType === 3) { const v = I.t(n.textContent); if (v !== n.textContent) n.textContent = v; return; }
    if (n.nodeType !== 1 || SKIP[n.nodeName] || n.getAttribute('translate') === 'no') return;   // the logo is a name
    for (const at of ['title', 'aria-label', 'placeholder']) { const a = n.getAttribute(at); if (a) { const v = I.t(a); if (v !== a) n.setAttribute(at, v); } }
    for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
  }
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    const mo = new MutationObserver((ms) => { if (!map) return; for (const m of ms) { if (m.type === 'characterData') walk(m.target); else m.addedNodes.forEach(walk); } });
    const start = () => mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }
})();
