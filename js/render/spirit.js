/*
 * Tower of Wishes — the spirit tree: a fighter's three skill branches drawn as
 * a living tree. The trunk rises from roots; each branch curves out of it with
 * three nodes along it; a branch glows as far up as you have learned.
 *
 *   TowRender.spirit.html({ branches, have, can, skillId, describe, stats }) -> SVG markup
 *   Nodes carry data-b / data-i / data-tip, and are .have, .can or .lock.
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  // 24x24 pictograms for what a skill changes.
  const ICON = {
    power: '<path d="M12 3 L14 14 L12 21 L10 14 Z M7 14 H17"/>',
    armor: '<path d="M12 3 L19 6 V12 C19 17 15 20 12 21 C9 20 5 17 5 12 V6 Z"/>',
    hp: '<path d="M12 20 L5 13 A4 4 0 0 1 12 7 A4 4 0 0 1 19 13 Z"/>',
    dodge: '<path d="M3 9 Q8 4 12 9 T21 9 M3 15 Q8 10 12 15 T21 15"/>',
    speed: '<path d="M5 6 L11 12 L5 18 M12 6 L18 12 L12 18"/>',
    react: '<path d="M2 12 Q12 3 22 12 Q12 21 2 12 Z"/><circle cx="12" cy="12" r="3"/>',
    parry: '<path d="M5 5 L19 19 M19 5 L5 19"/>',
    sta: '<circle cx="12" cy="12" r="7"/><path d="M12 8 V12 L15 14"/>',
    superRate: '<path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"/>',
    lifesteal: '<path d="M12 3 C16 9 19 12 19 15 A7 7 0 0 1 5 15 C5 12 8 9 12 3 Z"/>',
    secondWind: '<path d="M12 21 C6 17 8 11 12 3 C13 8 18 10 17 15 C16 19 13 21 12 21 Z"/>',
  };
  const iconOf = (mods) => ICON[Object.keys(mods || {})[0]] || ICON.power;
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  // A point on a cubic Bezier.
  function bez(p, t) {
    const u = 1 - t;
    return [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
            u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]];
  }
  const d = (p) => `M${p[0][0]} ${p[0][1]} C${p[1][0]} ${p[1][1]} ${p[2][0]} ${p[2][1]} ${p[3][0]} ${p[3][1]}`;

  function html(o) {
    const W = 360, H = 300, cx = 180;
    const n = o.branches.length;
    // Where each branch leaves the trunk and where it ends.
    const spread = [[-1, 0.9], [0, 1], [1, 0.9]];
    const parts = [];
    parts.push(`<svg class="spirit" viewBox="0 0 ${W} ${H}" role="group" aria-label="Skill tree">`);
    parts.push(`<defs><radialGradient id="sp-glow"><stop offset="0" stop-color="#d9f0ff" stop-opacity="0.9"/><stop offset="0.5" stop-color="#9cc3dd" stop-opacity="0.35"/><stop offset="1" stop-color="#9cc3dd" stop-opacity="0"/></radialGradient>
      <radialGradient id="sp-moon" cx="50%" cy="38%" r="60%"><stop offset="0" stop-color="#2a3a4a" stop-opacity="0.55"/><stop offset="1" stop-color="#0c0808" stop-opacity="0"/></radialGradient></defs>`);
    parts.push(`<rect width="${W}" height="${H}" fill="url(#sp-moon)"/>`);
    // spirit motes drifting up
    for (let i = 0; i < 14; i++) {
      const x = 20 + ((i * 53) % 320), dur = 6 + (i % 5) * 1.7, dl = -(i * 0.9);
      parts.push(`<circle class="mote" cx="${x}" cy="${H}" r="${1 + (i % 3) * 0.6}" fill="#bfe8ff" opacity="0.5"><animate attributeName="cy" from="${H}" to="-10" dur="${dur}s" begin="${dl}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.6;0" dur="${dur}s" begin="${dl}s" repeatCount="indefinite"/></circle>`);
    }
    // roots and trunk
    parts.push(`<g class="bark" fill="none" stroke-linecap="round">
      <path d="M${cx} 232 C${cx - 6} 262 ${cx - 40} 276 ${cx - 90} 290" stroke-width="5"/><path d="M${cx} 240 C${cx + 4} 266 ${cx + 40} 280 ${cx + 96} 292" stroke-width="5"/>
      <path d="M${cx} 244 C${cx} 270 ${cx - 12} 284 ${cx - 20} 298" stroke-width="3"/><path d="M${cx} 244 C${cx + 2} 270 ${cx + 16} 286 ${cx + 24} 298" stroke-width="3"/>
      <path d="M${cx} 250 C${cx - 3} 226 ${cx + 3} 206 ${cx} 186" stroke-width="12"/></g>`);
    o.branches.forEach((b, bi) => {
      const [dir, len] = spread[bi % 3] || [0, 1];
      const p = [[cx, 196], [cx + dir * 26, 160], [cx + dir * 96 * len, 150], [cx + dir * 138 * len, 58]];
      if (!dir) { p[0] = [cx, 190]; p[1] = [cx - 6, 140]; p[2] = [cx + 8, 90]; p[3] = [cx, 30]; }
      const have = b.nodes.map((nd) => o.have.includes(o.skillId(b.name, nd.i)));
      const lit = have.filter(Boolean).length;
      // the branch, dim, then lit up to the last learned node
      parts.push(`<path d="${d(p)}" class="limb" fill="none" stroke-linecap="round" stroke-width="6"/>`);
      if (lit) {
        const tEnd = [0.48, 0.74, 1][lit - 1] || 1, steps = 14, pts = [];
        for (let k = 0; k <= steps; k++) pts.push(bez(p, (tEnd * k) / steps));
        parts.push(`<path d="M${pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L')}" class="limb-lit" fill="none" stroke-linecap="round" stroke-width="3"/>`);
      }
      const end = bez(p, 1);
      const lx = Math.max(34, Math.min(W - 34, end[0])), ly = end[1] - 22;
      parts.push(`<text class="blabel" x="${lx.toFixed(0)}" y="${Math.max(10, ly).toFixed(0)}" text-anchor="middle">${esc(b.name)}</text>`);
      b.nodes.forEach((nd, k) => {
        const t = (k + 1) / (b.nodes.length) * 0.92 + 0.08 * (k === 0 ? 0 : 0), q = bez(p, [0.48, 0.74, 1][k] || 1);
        const id = o.skillId(b.name, nd.i), own = have[k], can = o.can(b.name, nd.i);
        const cls = own ? 'have' : can ? 'can' : 'lock';
        const tip = `${nd.name}: ${o.describe(nd.mods)}`;
        void t;
        parts.push(`<g class="snode ${cls}" data-b="${esc(b.name)}" data-i="${nd.i}" data-tip="${esc(tip)}" data-id="${esc(id)}" tabindex="0" role="button" aria-label="${esc(tip)}" transform="translate(${q[0].toFixed(1)} ${q[1].toFixed(1)})">
          <circle class="halo" r="26" fill="url(#sp-glow)"/>
          ${own ? '<path class="leaf" d="M-4 -12 C-16 -22 -22 -8 -12 -2 C-8 -6 -6 -9 -4 -12 Z"/><path class="leaf" d="M4 -12 C16 -22 22 -8 12 -2 C8 -6 6 -9 4 -12 Z"/>' : ''}
          <circle class="orb" r="14"/>
          <g class="pict" transform="translate(-9 -9) scale(0.75)" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${iconOf(nd.mods)}</g>
        </g>`);
      });
    });
    parts.push('</svg>');
    return parts.join('');
  }

  NS.spirit = { html };
})();
