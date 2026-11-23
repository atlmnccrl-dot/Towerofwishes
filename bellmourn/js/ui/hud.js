// The in-run HUD strip: the boons you hold as small Resonance pips, grouped by Resonance, unobtrusive.
// A pip is the Resonance colour with a rarity cap; a duo pip is split between its two colours; a crown
// pip wears a gold dot. A boon just taken pops in (pass o.fresh = boon id). A calls this from the HUD:
//   drawBoonStrip(ui, run, x, y, { alpha, fresh, t }) -> width
import { PAL, resOf, rarityOf, RES_ORDER, mix, alpha as withAlpha } from './kit.js';
import { boonDef } from './data.js';

export function boonGroups(run) {
  const groups = new Map();
  for (const b of (run && run.boons) || []) { const d = boonDef(b.id) || { res: 'ember', kind: 'boon' }; const r = d.res || 'ember'; if (!groups.has(r)) groups.set(r, []); groups.get(r).push({ ...b, def: d }); }
  const order = [...RES_ORDER, ...[...groups.keys()].filter((k) => !RES_ORDER.includes(k))];
  return order.filter((r) => groups.has(r)).map((r) => ({ res: r, boons: groups.get(r) }));
}
export function drawBoonStrip(ui, run, x, y, o = {}) {
  const G = boonGroups(run); if (!G.length) return 0;
  const pw = o.pw || 3, ph = o.ph || 5, gap = 1, ggap = 3; let w = 4;
  for (const g of G) w += g.boons.length * (pw + gap) - gap + ggap; w += 1 - ggap;
  const t = o.t ?? ui.t ?? 0;
  withAlpha(ui, o.alpha ?? 0.9, () => {
    ui.rect(x, y, w, ph + 4, 'rgba(6,7,10,0.62)'); ui.rect(x, y + ph + 4, w, 1, 'rgba(0,0,0,0.5)');
    let px = x + 2;
    for (const g of G) {
      const R = resOf(g.res);
      for (const b of g.boons) {
        const d = b.def; const RA = rarityOf(b.rarity); const fresh = o.fresh && o.fresh === b.id; const lift = fresh ? Math.round(Math.max(0, Math.sin(t * 10)) * 2) : 0;
        const py = y + 2 - lift;
        ui.rect(px, py, pw, ph, R.col);
        if (d.kind === 'duo' && d.duo) { const other = resOf(d.duo.find((r) => r !== g.res) || d.duo[1]); ui.rect(px + Math.ceil(pw / 2), py, Math.floor(pw / 2), ph, other.col); }
        ui.rect(px, py, pw, 1, RA.n > 0 ? RA.col : mix(R.col, '#ffffff', 0.4)); ui.rect(px, py + ph - 1, pw, 1, mix(R.col, '#000000', 0.45));
        if (d.kind === 'crown') ui.rect(px + Math.floor(pw / 2), py - 2, 1, 1, PAL.gold);
        if (fresh) ui.outline(px - 1, py - 1, pw + 2, ph + 2, '#ffffff');
        px += pw + gap;
      }
      px += ggap - gap;
    }
  });
  return w;
}
