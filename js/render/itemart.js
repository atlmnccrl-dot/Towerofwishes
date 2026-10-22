/*
 * Tower of Wishes — item art: every piece of gear drawn as a small SVG icon,
 * built from its class (what it is), its rarity (the frame) and its element
 * (what it does in a fight: fire, ice, storm, quake).
 *
 *   TowRender.itemart.svg(id, size) -> SVG markup, for the team screen and loot lists.
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});
  const RAR = { common: '#b3a19c', fine: '#9cc3dd', rare: '#a98bff', relic: '#e3263a' };
  const ELEM = {
    fire: { a: '#ff8a2a', b: '#ffe08a', glow: 'rgba(255,138,42,0.5)' },
    ice: { a: '#9fd8ff', b: '#eaf8ff', glow: 'rgba(159,216,255,0.5)' },
    storm: { a: '#ffe066', b: '#fffbe0', glow: 'rgba(255,224,102,0.5)' },
    quake: { a: '#c8a070', b: '#f0dcb8', glow: 'rgba(200,160,112,0.45)' },
  };
  const STEEL = { a: '#aab4c0', b: '#eef2f6' };
  const INK = '#0c0808';

  // Pictograms in a 64x64 box, drawn pointing up-right; `c` = {a, b} colours.
  const SHAPES = {
    sword: (c) => `<g transform="rotate(45 32 32)"><path d="M32 2 L37 12 L37 44 L27 44 L27 12 Z" fill="${c.a}" stroke="${INK}" stroke-width="2"/><path d="M32 4 L32 44" stroke="${c.b}" stroke-width="2"/><rect x="21" y="44" width="22" height="5" rx="2" fill="#6a5238" stroke="${INK}" stroke-width="2"/><rect x="29" y="49" width="6" height="9" fill="#3a2c26" stroke="${INK}" stroke-width="2"/><circle cx="32" cy="60" r="3" fill="#6a5238" stroke="${INK}" stroke-width="1.5"/></g>`,
    blade: (c) => `<g><g transform="rotate(32 32 32)"><path d="M32 6 L36 14 L36 40 L28 40 L28 14 Z" fill="${c.a}" stroke="${INK}" stroke-width="2"/><path d="M32 8 L32 38" stroke="${c.b}" stroke-width="1.6"/><rect x="25" y="40" width="14" height="4" rx="1.5" fill="#6a5238" stroke="${INK}" stroke-width="1.6"/><rect x="29" y="44" width="6" height="10" fill="#3a2c26" stroke="${INK}" stroke-width="1.6"/></g><g transform="rotate(-32 32 32)"><path d="M32 6 L36 14 L36 40 L28 40 L28 14 Z" fill="${c.a}" stroke="${INK}" stroke-width="2"/><path d="M32 8 L32 38" stroke="${c.b}" stroke-width="1.6"/><rect x="25" y="40" width="14" height="4" rx="1.5" fill="#6a5238" stroke="${INK}" stroke-width="1.6"/><rect x="29" y="44" width="6" height="10" fill="#3a2c26" stroke="${INK}" stroke-width="1.6"/></g></g>`,
    glyph: (c) => `<g><rect x="29" y="22" width="6" height="36" rx="2" fill="#4a382e" stroke="${INK}" stroke-width="2"/><circle cx="32" cy="18" r="12" fill="none" stroke="${INK}" stroke-width="5"/><circle cx="32" cy="18" r="12" fill="none" stroke="${c.a}" stroke-width="2.4"/><path d="M32 9 L40 23 L24 23 Z" fill="none" stroke="${c.b}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="32" cy="18" r="2.4" fill="${c.b}"/></g>`,
    shield: (c) => `<g><path d="M32 4 L54 12 V32 C54 46 44 56 32 60 C20 56 10 46 10 32 V12 Z" fill="#4a3c34" stroke="${INK}" stroke-width="2.4"/><path d="M32 8 L50 14 V32 C50 43 42 52 32 56 Z" fill="${c.a}" opacity="0.55"/><circle cx="32" cy="30" r="8" fill="${c.b}" stroke="${INK}" stroke-width="2"/><circle cx="32" cy="30" r="3" fill="${c.a}"/></g>`,
    spear: (c) => `<g transform="rotate(40 32 32)"><rect x="29.5" y="14" width="5" height="48" rx="2" fill="#6a5238" stroke="${INK}" stroke-width="2"/><path d="M32 0 L40 16 L32 22 L24 16 Z" fill="${c.a}" stroke="${INK}" stroke-width="2"/><path d="M32 3 L32 18" stroke="${c.b}" stroke-width="1.6"/><path d="M26 22 L32 28 L38 22" fill="none" stroke="#3a2c26" stroke-width="3"/></g>`,
    fist: (c) => `<g><rect x="12" y="20" width="40" height="26" rx="8" fill="#5a4636" stroke="${INK}" stroke-width="2.4"/><path d="M20 20 V46 M28 20 V46 M36 20 V46 M44 20 V46" stroke="${INK}" stroke-width="2"/><rect x="10" y="30" width="44" height="7" fill="${c.a}" stroke="${INK}" stroke-width="2"/><path d="M12 33.5 H52" stroke="${c.b}" stroke-width="1.4"/></g>`,
    coat: (c) => `<g><path d="M20 8 L32 14 L44 8 L56 22 L48 28 L46 58 H18 L16 28 L8 22 Z" fill="#4a3c34" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 14 L32 58" stroke="${INK}" stroke-width="2"/><path d="M20 8 L32 14 L44 8" fill="none" stroke="${c.a}" stroke-width="3"/><path d="M18 40 H46" stroke="${c.a}" stroke-width="2.4"/></g>`,
    plate: (c) => `<g><path d="M18 10 H46 L54 20 L48 28 V50 C48 56 40 60 32 60 C24 60 16 56 16 50 V28 L10 20 Z" fill="${c.a}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 12 V58 M18 30 H46 M20 44 H44" stroke="${INK}" stroke-width="2" opacity="0.6"/><path d="M22 14 L16 22" stroke="${c.b}" stroke-width="2"/></g>`,
    ring: (c) => `<g><circle cx="32" cy="36" r="15" fill="none" stroke="${INK}" stroke-width="9"/><circle cx="32" cy="36" r="15" fill="none" stroke="${c.a}" stroke-width="5"/><path d="M24 28 L32 14 L40 28 Z" fill="${c.b}" stroke="${INK}" stroke-width="2"/></g>`,
    tooth: (c) => `<g><path d="M18 14 C34 8 48 22 44 56 C34 46 26 32 18 14 Z" fill="${c.b}" stroke="${INK}" stroke-width="2.4"/><path d="M24 20 C34 22 40 32 42 46" fill="none" stroke="${c.a}" stroke-width="2"/><circle cx="20" cy="14" r="3" fill="none" stroke="${INK}" stroke-width="2"/></g>`,
    shard: (c) => `<g><path d="M30 4 L46 22 L38 58 L22 46 L16 20 Z" fill="${c.a}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M30 4 L34 30 L22 46 M34 30 L46 22 M34 30 L38 58" fill="none" stroke="${c.b}" stroke-width="1.6"/></g>`,
    cork: (c) => `<g><rect x="20" y="14" width="24" height="38" rx="5" fill="#b08a58" stroke="${INK}" stroke-width="2.4"/><rect x="18" y="10" width="28" height="8" rx="3" fill="${c.a}" stroke="${INK}" stroke-width="2"/><path d="M26 26 V44 M32 26 V44 M38 26 V44" stroke="#7a5a38" stroke-width="1.6"/></g>`,
    spool: (c) => `<g><rect x="14" y="12" width="36" height="8" rx="3" fill="#6a5238" stroke="${INK}" stroke-width="2"/><rect x="14" y="44" width="36" height="8" rx="3" fill="#6a5238" stroke="${INK}" stroke-width="2"/><rect x="20" y="20" width="24" height="24" fill="${c.a}" stroke="${INK}" stroke-width="2"/><path d="M20 26 H44 M20 32 H44 M20 38 H44" stroke="${INK}" stroke-width="1.4" opacity="0.5"/></g>`,
  };
  // Elemental dressing drawn over the item.
  const DRESS = {
    fire: (e) => `<path d="M40 30 C34 22 42 18 40 8 C50 14 52 26 44 34 Z" fill="${e.a}" opacity="0.9"/><path d="M40 28 C38 22 42 20 41 14 C46 18 46 24 43 29 Z" fill="${e.b}"/><path d="M22 38 C18 32 24 30 22 22 C30 26 30 34 25 40 Z" fill="${e.a}" opacity="0.8"/>`,
    ice: (e) => `<path d="M46 8 L49 14 L55 14 L50 18 L52 24 L46 20 L40 24 L42 18 L37 14 L43 14 Z" fill="${e.b}" stroke="${e.a}" stroke-width="1.4"/><path d="M14 44 L16 49 L21 49 L17 52 L18 57 L14 54 L10 57 L11 52 L7 49 L12 49 Z" fill="${e.b}" opacity="0.9"/>`,
    storm: (e) => `<path d="M44 4 L34 24 L42 24 L30 46 L36 28 L28 28 Z" fill="${e.a}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 36 L8 44 L13 44 L9 54" fill="none" stroke="${e.b}" stroke-width="2"/>`,
    quake: (e) => `<path d="M6 58 L18 50 L26 56 L36 48 L46 56 L58 50" fill="none" stroke="${e.a}" stroke-width="2.6"/><circle cx="14" cy="42" r="2.4" fill="${e.b}"/><circle cx="50" cy="44" r="3" fill="${e.b}"/><circle cx="44" cy="36" r="1.8" fill="${e.a}"/>`,
  };
  const SHAPE_OF = {
    sword: 'sword', blade: 'blade', glyph: 'glyph', shield: 'shield', spear: 'spear', fist: 'fist',
  };
  const BY_ID = { patchedLeathers: 'coat', roadCoat: 'coat', quarryPlate: 'plate', drownedMail: 'plate', waterskinCork: 'cork', grainThread: 'spool', teaRing: 'ring', straysTooth: 'tooth', bellShard: 'shard' };

  // Pixel icons (Free Medieval Fantasy UI Pack by Kibyra): [sheet, row, column] of 32 px icons.
  const PIX = {
    sword: [3, 1, 0], blade: [3, 1, 1], glyph: [3, 2, 3], shield: [3, 1, 3], spear: [3, 1, 7], fist: [3, 1, 5],
    coat: [1, 2, 7], plate: [1, 2, 6], ring: [3, 7, 7], tooth: [3, 7, 0], shard: [3, 0, 4], cork: [2, 2, 0], spool: [3, 3, 7],
  };
  function pixelIcon(shape) {
    const p = PIX[shape];
    if (!p) return null;
    return `<svg x="9" y="9" width="46" height="46" viewBox="${p[2] * 32} ${p[1] * 32} 32 32"><image href="assets/ui/icons${p[0]}.png" width="256" height="256" style="image-rendering:pixelated"/></svg>`;
  }
  function svg(id, size) {
    const I = (window.TowProgression && window.TowProgression.ITEMS[id]) || null;
    if (!I) return '';
    const shape = BY_ID[id] || SHAPE_OF[I.cls] || 'ring', el = I.elem ? ELEM[I.elem] : null;
    const rar = RAR[I.rarity] || RAR.common;
    const col = el ? { a: el.a, b: el.b } : I.slot === 'weapon' ? STEEL : { a: rar, b: '#f6f0ec' };
    const gid = 'ia' + id;
    return `<svg class="iart" viewBox="0 0 64 64" width="${size || 48}" height="${size || 48}" aria-hidden="true">
      <defs><radialGradient id="${gid}"><stop offset="0" stop-color="${el ? el.a : rar}" stop-opacity="${el ? 0.55 : 0.25}"/><stop offset="1" stop-color="${el ? el.a : rar}" stop-opacity="0"/></radialGradient></defs>
      <rect x="1.5" y="1.5" width="61" height="61" rx="8" fill="#141016" stroke="${rar}" stroke-width="2"/>
      <circle cx="32" cy="32" r="30" fill="url(#${gid})"/>
      ${pixelIcon(shape) || SHAPES[shape](col)}
      ${I.elem ? DRESS[I.elem](el) : ''}
    </svg>`;
  }
  NS.itemart = { svg };
})();
