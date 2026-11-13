// Builds a level module into a scene group plus the data the simulation needs.
import * as K0 from './kit.js';
import { M } from '../engine/materials.js';

export const K = { ...K0, M };

export async function buildLevel(def) {
  const ctx = K.makeCtx();
  def.build(K, ctx);
  const lights = ctx.lights.slice();
  for (const s of ctx.lowSolids) s.low = true;
  const group = await K.finishCtx(ctx);
  return { def, group, solids: ctx.solids, lowSolids: ctx.lowSolids, lights, anims: ctx.anims, marks: ctx.marks, puddles: ctx.puddles || [] };
}
