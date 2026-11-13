// Builds a level module into a scene group plus the data the simulation needs.
import * as K0 from './kit.js';
import { M } from '../engine/materials.js';

export const K = { ...K0, M };

export async function buildLevel(def) {
  const ctx = K.makeCtx();
  // an apron of dark ground beyond the map, so the camera never shows the void (levels with real drops opt out)
  if (def.apron !== false && def.id !== 'belfry') { const b = def.bounds; K.floor(ctx, b[0] - 30, b[1] - 30, b[2] + 30, b[3] + 30, K.M.cobble('#2e343e'), -0.03, 0.3); }
  def.build(K, ctx);
  const lights = ctx.lights.slice();
  for (const s of ctx.lowSolids) s.low = true;
  const group = await K.finishCtx(ctx);
  return { def, group, solids: ctx.solids, lowSolids: ctx.lowSolids, lights, anims: ctx.anims, marks: ctx.marks, puddles: ctx.puddles || [] };
}
