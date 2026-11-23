// Places for the scene scripts, found from the level at runtime (never fixed coordinates: the districts
// are being rebuilt). The camera looks from +X+Z: screen right is (+x, -z), screen up (away) is (-x, -z).
import { HEROES } from '../heroes.js';
import { WARDENS } from './cast.js';

const R2 = Math.SQRT1_2;
export const heroP = (S) => { const h = S.g.world && S.g.world.hero; return h ? { x: h.x, z: h.z, face: h.face } : { x: 0, z: 0, face: Math.PI }; };
export const bossP = (S) => (S.boss ? { x: S.boss.x, z: S.boss.z } : (S.def && S.def.boss ? { x: S.def.boss.x, z: S.def.boss.z } : heroP(S)));
// a point by screen offsets: r to the right, u up (away from the camera), in metres
export const scr = (p, r = 0, u = 0) => ({ x: p.x + R2 * (r - u), z: p.z + R2 * (-r - u) });
export const toward = (a, b, d) => { const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1; return { x: a.x + dx / L * d, z: a.z + dz / L * d }; };
// ahead of an entity along its facing (or a given angle)
export const ahead = (p, d, ang = p.face ?? Math.PI) => ({ x: p.x + Math.sin(ang) * d, z: p.z + Math.cos(ang) * d });
// keep a point inside the boss arena (1 m in from its edge)
export function inZone(S, p, pad = 1) {
  const z = S.def && S.def.boss && S.def.boss.zone; if (!z) return p;
  return { x: Math.max(z[0] + pad, Math.min(z[2] - pad, p.x)), z: Math.max(z[1] + pad, Math.min(z[3] - pad, p.z)) };
}
export const zoneP = (S, u, v) => { const z = S.def && S.def.boss && S.def.boss.zone; if (!z) return heroP(S); return { x: z[0] + (z[2] - z[0]) * u, z: z[1] + (z[3] - z[1]) * v }; };
// the great bell (the Belfry's marks.bell, a handle with pivot and ring())
export const bellOf = (S) => S.level && S.level.marks && S.level.marks.bell;
export const bellP = (S) => { const b = bellOf(S); if (b && b.pivot) return { x: b.pivot.position.x, z: b.pivot.position.z }; return bossP(S); };
export const lampP = (S, i = -1) => { const L = S.level && S.level.lamps; if (!L || !L.length) return heroP(S); const l = L[(i + L.length) % L.length]; return { x: l.x, z: l.z }; };
// the wardens in the party: unlocked (and the lead), in their usual order
export const party = (S) => WARDENS.filter((id) => id === S.lead || (S.save.unlocked || []).includes(id));
export const has = (S, id) => id === S.lead || (S.save.unlocked || []).includes(id);
export const nameOf = (id) => (HEROES[id] && HEROES[id].name) || ({ kestrel: 'KESTREL', hollis: 'HOLLIS', wren: 'MOTHER WREN' }[id] || String(id).toUpperCase());
// a warden as an actor: the hero when they are the lead and still in the world, otherwise a puppet
export const wardenSpec = (S, id, p, face) => (id === S.lead && S.g.world && S.g.world.hero && !S.staged ? { use: 'hero', x: p.x, z: p.z, face } : { hero: id, x: p.x, z: p.z, face });
// the strike clip for a warden's weapon
export const strikeAnim = (id) => ({ bellbreaker: 'hsmash2', hollis: 'hsmash2', huntress: 'slash3', lamplighter: 'slash3', wren: 'slash3' }[id] || 'slash3');
