// Props for Act III, region III: the Empyrean, the hub of the Wheel, a heaven turned inside out. Isles of
// white marble trimmed with gold floating in an endless pale sky, their undersides breaking into rock
// that fades into the light; bridges, broken halos hanging in the air or lying cracked on the stone,
// choir-stalls of empty masks, hollow angels with no faces, rivers of light running across the isles and
// falling off their edges, feathers drifting down; far off the vast Wheel of eyes turning; and over the
// last court, the Great Bell's twin, cracked, holding the Voice, glowing.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, cone, geo, plane, solid, solidCircle, inst, mat4 } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { voidFill, clouds } from './belfry.js';
import { once, part, put, bar, pix, floorGlow, decal, brazier, solidRot } from '../kit2.js';
import { W3, fade, goldM, skyLayer, faceCam, glowSprite, seg } from '../kit3.js';
export { voidFill, clouds, floorGlow, decal };

export const SKY = 0xd8d0dc;
const deepM = (m, r = 10) => fade(m, SKY, r);
const MARBLE = '#dedad4', MARBLE2 = '#c4c0bc';
const marbleM = () => W3.marble(MARBLE);
const whiteM = () => once('em-white', () => cutout(new THREE.MeshPhongMaterial({ color: 0xe0d8cc, specular: 0x6a6458, shininess: 24 })));
const lightM = (k = 1, col = [2.2, 1.9, 1.3]) => once('em-light' + k + col, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(...col).multiplyScalar(k), fog: false }));

// ---------------------------------------------------------------- isles and bridges
// A floating isle: marble on top with a gilt kerb, and under it stepped masonry breaking into a ragged
// cone of rock that fades into the sky; a few shards hang under it, bobbing.
export function isle(ctx, x0, z0, x1, z1, o = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const R = T.rng(Math.round(x0 * 13 + z0 * 7 + 3));
  add(ctx, box(w, 0.4, d), o.mat || marbleM(), cx, -0.2, cz, { cast: false });
  const gk = W3.gilt(); for (const s of [0, 1]) { add(ctx, box(w + 0.12, 0.08, 0.2), gk, cx, 0.02, s ? z1 - 0.1 : z0 + 0.1, { cast: false }); add(ctx, box(0.2, 0.08, d), gk, s ? x1 - 0.1 : x0 + 0.1, 0.02, cz, { cast: false }); }
  add(ctx, box(w + 0.1, 0.5, d + 0.1), W3.gilt('#9a7832'), cx, -0.62, cz, { cast: false });
  let y = -0.85; let ww = w, dd = d;
  for (let k = 0; k < 3; k++) { const hh = 1.1 + k * 0.3; ww *= 0.86; dd *= 0.86; add(ctx, box(ww, hh, dd), deepM(W3.marble(MARBLE2), 9), cx, y - hh / 2, cz, { cast: false }); y -= hh; }
  const rock = deepM(W3.rock('marble', '#b8b0a4'), 11);
  const m = add(ctx, geo('em-cone', () => new THREE.ConeGeometry(0.5, 1, 6)), rock, cx, y - 3, cz, { rx: Math.PI, ry: R() * 3, cast: false }); m.scale.set(ww * 1.1, 6, dd * 1.1);
  for (let i = 0; i < 4; i++) { const a = R() * 6.3, r = Math.min(ww, dd) * 0.45; const m2 = add(ctx, geo('em-cone', () => new THREE.ConeGeometry(0.5, 1, 6)), rock, cx + Math.cos(a) * r, y - 1.2 - R() * 1.5, cz + Math.sin(a) * r, { rx: Math.PI, ry: R() * 3, cast: false }); const s = 0.8 + R() * 1.4; m2.scale.set(s, s * 2.5, s); }
  if (o.shards !== false) for (let i = 0; i < 3; i++) shard(ctx, cx + (R() - 0.5) * w * 1.1, -6 - R() * 5, cz + (R() - 0.5) * d * 1.1, 0.6 + R() * 0.9);
}
// A shard of rock hanging in the sky, bobbing slowly (set dressing).
export function shard(ctx, x, y, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); ctx.group.add(g); const rock = deepM(W3.rock('marble', '#c0b8ac'), 14);
  const m = new THREE.Mesh(geo('em-cone', () => new THREE.ConeGeometry(0.5, 1, 6)), rock); m.rotation.x = Math.PI; m.scale.set(s, s * 2.2, s); g.add(m);
  const top = new THREE.Mesh(box(s * 0.9, s * 0.25, s * 0.9), deepM(marbleM(), 14)); top.position.y = s * 1.1 + 0.1; g.add(top);
  let t = Math.random() * 9; ctx.anims.push({ update(dt) { t += dt; g.position.y = y + Math.round(Math.sin(t * 0.5) * 0.3 * 16) / 16; return false; } });
}
// A bridge between isles: a thin marble span with gilt edges, low gilt rails, an arch under it.
export function bridge(ctx, x0, z0, x1, z1) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const alongZ = d >= w;
  add(ctx, box(w, 0.3, d), marbleM(), cx, -0.15, cz, { cast: false });
  add(ctx, box(alongZ ? w * 0.7 : w, 1.4, alongZ ? d : d * 0.7), deepM(W3.marble(MARBLE2), 4), cx, -1.0, cz, { cast: false });
  const g = goldM(); const len = alongZ ? d : w; const n = Math.max(2, Math.round(len / 1.5));
  for (const s of [-1, 1]) {
    const ex = alongZ ? cx + s * (w / 2 - 0.08) : cx, ez = alongZ ? cz : cz + s * (d / 2 - 0.08);
    put(ctx, '!em-brail', g, ex, 0.62, ez, alongZ ? 0.07 : w, 0.07, alongZ ? d : 0.07);
    for (let i = 0; i <= n; i++) { const t = -len / 2 + i * len / n; put(ctx, '!em-bpost', g, alongZ ? ex : cx + t, 0.32, alongZ ? cz + t : ez, 0.08, 0.64, 0.08); put(ctx, 'em-bknob', lightM(1.2), alongZ ? ex : cx + t, 0.7, alongZ ? cz + t : ez, 0.1, 0.1, 0.1); }
  }
}

// ---------------------------------------------------------------- halos
// A broken halo: a ring of gold with a piece gone, a thin ring of light inside it, hanging in the air
// (o.tilt, o.ry) and turning slowly; o.ground: lying cracked on the stone in pieces instead (solid).
export function halo(ctx, x, y, z, R = 2.4, o = {}) {
  const g = goldM(); const arc = o.arc ?? Math.PI * 1.55;
  if (o.ground) {
    const R0 = T.rng(Math.round(x * 9 + z * 5)); let a = R0() * 6;
    for (let i = 0; i < 3; i++) { const len = 0.9 + R0() * 0.9; const m = add(ctx, geo(`em-hseg${R},${len.toFixed(2)}`, () => new THREE.TorusGeometry(R, 0.12 * R / 2.4 + 0.06, 5, 16, len)), g, x, 0.12, z, { rx: -Math.PI / 2 + (R0() - 0.5) * 0.2, cast: true }); m.rotation.z = a; a += len + 0.3 + R0() * 0.6; }
    floorGlow(ctx, x, z, R * 2.6, R * 2.6, 0xffd890, 0.2);
    solidCircle(ctx, x, z, R * 0.6, 0.6); return;
  }
  const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.set(o.tilt ?? 0.5, o.ry ?? 0, 0); ctx.group.add(grp); const spin = new THREE.Group(); grp.add(spin);
  const t1 = new THREE.Mesh(geo(`em-halo${R},${arc.toFixed(2)}`, () => new THREE.TorusGeometry(R, Math.max(0.1, R * 0.06), 6, 40, arc)), g); t1.castShadow = o.cast !== false; spin.add(t1);
  const t2 = new THREE.Mesh(geo(`em-halo2${R},${arc.toFixed(2)}`, () => new THREE.TorusGeometry(R * 0.86, Math.max(0.05, R * 0.025), 4, 40, arc * 0.9)), g); t2.rotation.z = 0.3; t2.castShadow = o.cast !== false; spin.add(t2);
  const ring = new THREE.Mesh(geo(`em-hring${R}`, () => new THREE.RingGeometry(R * 0.9, R * 0.94, 48, 1, 0, arc)), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, 0.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })); spin.add(ring);
  // the broken end: a few chips of gold drifting away from the gap
  const chips = []; for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(box(0.18, 0.18, 0.18), g); spin.add(c); chips.push(c); }
  let t = Math.random() * 9; const sp = o.speed ?? 0.12;
  ctx.anims.push({ update(dt) { t += dt; spin.rotation.z = Math.round(t * sp * 64) / 64; chips.forEach((c, i) => { const a = arc + 0.15 + i * 0.22 + Math.sin(t * 0.7 + i) * 0.05; const r = R + Math.sin(t * 0.9 + i * 2) * 0.12; c.position.set(Math.cos(a) * r, Math.sin(a) * r, Math.sin(t + i) * 0.1); c.rotation.set(t * 0.5 + i, t * 0.3, 0); }); return false; } });
  if (o.light) ctx.lights.push({ x, y, z, color: 0xffd890, intensity: o.light, dist: R * 3, flicker: 0.03 });
  return grp;
}

// ---------------------------------------------------------------- the choir
// An empty mask: white porcelain, gold rim, black eye holes and a mouth open as if singing (16 x 20).
const maskTex = () => pix('em-mask', 16, 20, (g, W, H) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x + 0.5 - W / 2) / (W / 2), dy = (y + 0.5 - H / 2) / (H / 2); const r = dx * dx + dy * dy * (dy > 0 ? 1.25 : 0.9); if (r > 1) continue;
    let c = r > 0.8 ? '#c09040' : ((x + y) % 5 === 0 ? '#d8d0c4' : '#ece6dc'); if (dx < -0.1 && r < 0.8) c = shadeM(c);
    const ex = Math.abs(dx) - 0.38, ey = dy + 0.12; if (ex * ex * 3 + ey * ey * 7 < 0.11) c = '#0e0a10';
    if (Math.abs(dx) < 0.16 && dy > 0.4 && dy < 0.66) c = '#1a1018';
    if (Math.abs(dx) < 0.05 && dy > -0.05 && dy < 0.3) c = '#c8c0b4';
    g.fillStyle = c; g.fillRect(x, y, 1, 1);
  }
});
function shadeM(c) { return c === '#ece6dc' ? '#d4ccc0' : c === '#d8d0c4' ? '#c4bcb0' : c; }
const maskMat = () => once('em-maskM', () => cutout(new THREE.MeshLambertMaterial({ map: maskTex(), alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0x2a2620 })));
// Choir-stalls of empty masks along a line (x0,z0)-(x1,z1), facing `face` ('+x', '-x', '+z', '-z'): tiers of
// marble benches with gilt edges, and on each tier a row of masks on gold stalks where the singers stood.
export function choir(ctx, x0, z0, x1, z1, face = '+x', tiers = 3) {
  const alongX = face === '+z' || face === '-z'; const len = alongX ? x1 - x0 : z1 - z0; const sg = face[0] === '+' ? 1 : -1; const R = T.rng(Math.round(x0 * 3 + z0 * 7));
  const base = alongX ? z0 : x0; const step = 0.9; const g = goldM(); const mg = plane(0.42, 0.52);
  for (let k = 0; k < tiers; k++) {
    const off = base - sg * (k * step + step / 2), h = 0.35 + k * 0.42;
    add(ctx, alongX ? box(len, h, step) : box(step, h, len), W3.marble('#c4bcb0'), alongX ? (x0 + x1) / 2 : off, h / 2, alongX ? off : (z0 + z1) / 2);
    add(ctx, alongX ? box(len, 0.06, 0.1) : box(0.1, 0.06, len), W3.gilt(), alongX ? (x0 + x1) / 2 : off + sg * step / 2, h + 0.02, alongX ? off + sg * step / 2 : (z0 + z1) / 2, { cast: false });
    const n = Math.floor(len / 0.75);
    for (let i = 0; i < n; i++) {
      if (R() < 0.12) continue; const t = (alongX ? x0 : z0) + (i + 0.5) * len / n; const sx = alongX ? t : off, sz = alongX ? off : t; const hh = 0.9 + R() * 0.15;
      put(ctx, '!em-stalk', g, sx, h + hh / 2, sz, 0.05, hh, 0.05);
      const ry = face === '+x' ? Math.PI / 2 : face === '-x' ? -Math.PI / 2 : face === '+z' ? 0 : Math.PI; const tilt = R() < 0.15 ? (R() - 0.5) * 1.2 : (R() - 0.5) * 0.15;
      inst(ctx, 'em-mask', mg, maskMat(), mat4(sx + (alongX ? 0 : sg * 0.04), h + hh + 0.22, sz + (alongX ? sg * 0.04 : 0), ry, 0, tilt));
    }
  }
  const d = tiers * step; if (alongX) solid(ctx, x0, sg > 0 ? z0 - d : z0, x1, sg > 0 ? z0 : z0 + d, 2); else solid(ctx, sg > 0 ? x0 - d : x0, z0, sg > 0 ? x0 : x0 + d, z1, 2);
}
// A hollow angel: a tall robed figure of marble with folded wings and, where its face should be, nothing:
// only a small halo round empty air (front toward ry).
export function angel(ctx, x, z, ry = 0, h = 3.6) {
  const w = whiteM(); const P = (gm, m, lx, ly, lz, oo) => part(ctx, gm, m, x, z, ry, lx, ly, lz, oo);
  P(box(1.2, 0.4, 1.2), W3.marble('#c4bcb0'), 0, 0.2, 0); P(box(1.3, 0.08, 1.3), W3.gilt(), 0, 0.42, 0, { cast: false });
  P(cyl(0.22, 0.52, h * 0.62, 7), w, 0, 0.4 + h * 0.31, 0); P(cyl(0.26, 0.22, h * 0.12, 7), w, 0, 0.4 + h * 0.68, 0);
  for (const s of [-1, 1]) { P(box(0.12, h * 0.72, 0.62), w, s * 0.42, 0.4 + h * 0.52, -0.22, { rz: s * 0.12, rx: -0.12 }); P(box(0.1, h * 0.4, 0.4), w, s * 0.62, 0.4 + h * 0.66, -0.36, { rz: s * 0.4 }); }
  for (const s of [-1, 1]) P(box(0.14, h * 0.32, 0.14), w, s * 0.2, 0.4 + h * 0.5, 0.26, { rx: -0.7, rz: -s * 0.4 });
  P(geo('em-ahalo', () => new THREE.TorusGeometry(0.26, 0.04, 4, 14)), goldM(), 0, 0.4 + h * 0.86, 0.02);
  P(plane(0.3, 0.3), lightM(0.7), 0, 0.4 + h * 0.86, 0.03, { cast: false });
  solidCircle(ctx, x, z, 0.62, h);
}
// A broken column: a white fluted shaft, a gilt capital (or none, broken), a drum or two fallen beside it.
export function column(ctx, x, z, h = 4, o = {}) {
  const w = whiteM(); add(ctx, box(1.0, 0.3, 1.0), W3.marble('#c4bcb0'), x, 0.15, z); add(ctx, cyl(0.36, 0.4, h, 10), w, x, 0.3 + h / 2, z);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; put(ctx, 'em-flute', W3.marble('#b4ac9e'), x + Math.cos(a) * 0.37, 0.3 + h / 2, z + Math.sin(a) * 0.37, 0.05, h * 0.96, 0.05, -a); }
  if (o.broken) { const R = T.rng(Math.round(x * 5 + z)); for (let i = 0; i < 4; i++) add(ctx, box(0.3, 0.2 + R() * 0.4, 0.3), w, x + (R() - 0.5) * 0.4, 0.3 + h + 0.1, z + (R() - 0.5) * 0.4, { ry: R() * 3 }); add(ctx, cyl(0.38, 0.38, 0.8, 10), w, x + 1.1, 0.38, z + 0.4, { rz: Math.PI / 2, ry: R() * 3 }); }
  else { add(ctx, box(1.0, 0.3, 1.0), W3.gilt(), x, 0.3 + h + 0.15, z); add(ctx, box(1.2, 0.2, 1.2), whiteM(), x, 0.3 + h + 0.4, z); }
  solidCircle(ctx, x, z, 0.5, h);
}
// A gold bowl of white fire on a marble post.
export const lumen = (ctx, x, z, o = {}) => brazier(ctx, x, z, { color: 0xfff0d0, coal: '#fff0c0', tint: [2.6, 2.5, 2.2], h: 1.0, intensity: o.intensity || 2.8, dist: o.dist || 6.5, stone: goldM() });

// The great rite inlaid in the floor (tint it with decal), and a ring of gilt let into the marble.
export const sigilTex = () => T.sigil('circle', 128, 4410);
export function ring(ctx, x, z, R, w = 0.3) { add(ctx, geo(`em-fring${R},${w}`, () => new THREE.RingGeometry(R - w, R, 64).rotateX(-Math.PI / 2)), W3.gilt(), x, 0.012, z, { cast: false }); }

// ---------------------------------------------------------------- rivers of light
const lightTex = () => pix('em-river', 32, 32, (g, W, H) => {
  // streaks of light running along the flow (the texture's x), white at the heart, pale gold at the edges
  const R = T.rng(707); const rows = []; for (let y = 0; y < H; y++) rows.push(R());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = 0.62 + 0.25 * Math.sin((x / W) * Math.PI * 2 * (1 + (rows[y] * 2 | 0)) + rows[y] * 9) + (rows[y] - 0.5) * 0.3; const c = v > 0.8 ? '#fffdf4' : v > 0.6 ? '#fff4d0' : v > 0.42 ? '#f4dc98' : '#dcb868'; g.fillStyle = c; g.fillRect(x, y, 1, 1); }
}, true);
// A river of light across an isle (solid, low and see-through, but for the slabs over it at gaps), in a
// gilt-lipped channel, flowing along its length; o.falls: it pours off the isle's edges at its ends.
export function lightRiver(ctx, x0, z0, x1, z1, gaps = [], o = {}) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const w = x1 - x0, d = z1 - z0;
  const tex = lightTex().clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(w / 2, d / 2);
  const m = new THREE.Mesh(plane(w, d), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.1, 1.0, 0.9), fog: false })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); m.renderOrder = 1; ctx.group.add(m);
  let off = 0; ctx.anims.push({ update(dt) { off += dt * 0.12; if (alongX) tex.offset.x = Math.round(off * 32) / 32; else tex.offset.y = Math.round(off * 32) / 32; return false; } });
  floorGlow(ctx, (x0 + x1) / 2, (z0 + z1) / 2, alongX ? w : w * 3, alongX ? d * 3 : d, 0xffe0a0, 0.18, 0.05);
  const lip = W3.gilt(); for (const e of alongX ? [z0, z1] : [x0, x1]) add(ctx, alongX ? box(w, 0.12, 0.16) : box(0.16, 0.12, d), lip, alongX ? (x0 + x1) / 2 : e, 0.03, alongX ? e : (z0 + z1) / 2, { cast: false });
  const a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1, gw = o.gw ?? 2.4; let s = a0;
  const segS = (p, q) => { if (q - p < 0.05) return; if (alongX) solid(ctx, p, z0, q, z1, 1.2); else solid(ctx, x0, p, x1, q, 1.2); ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]); };
  for (const gx of gaps.slice().sort((p, q) => p - q)) { segS(s, gx - gw / 2); s = gx + gw / 2; if (alongX) add(ctx, box(gw, 0.2, d + 0.5), marbleM(), gx, 0.0, (z0 + z1) / 2); else add(ctx, box(w + 0.5, 0.2, gw), marbleM(), (x0 + x1) / 2, 0.0, gx); }
  segS(s, a1);
  const n = Math.round((alongX ? w : d) / 5); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; ctx.lights.push({ x: alongX ? x0 + w * t : (x0 + x1) / 2, y: 0.8, z: alongX ? (z0 + z1) / 2 : z0 + d * t, color: 0xfff0c8, intensity: 2, dist: 4.5, flicker: 0.05 }); }
  if (o.falls) for (const f of o.falls) lightFall(ctx, ...f);
}
// Light pouring off an isle's edge into the sky: a falling sheet at (x, z), w wide across `face`.
export function lightFall(ctx, x, z, w = 1.2, face = '+x', h = 9) {
  const tex = lightTex().clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(w / 2, h / 2);
  const fadeT = pix('em-falpha', 1, 16, (g) => { for (let y = 0; y < 16; y++) { const v = Math.round(255 * Math.pow(1 - y / 16, 1.3)); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, 1, 1); } });
  const m = new THREE.Mesh(plane(w, h), new THREE.MeshBasicMaterial({ map: tex, alphaMap: fadeT, color: new THREE.Color(1.3, 1.15, 0.9), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  m.position.set(x, -h / 2 - 0.05, z); m.rotation.y = face === '+x' || face === '-x' ? Math.PI / 2 : 0; m.renderOrder = 2; ctx.group.add(m);
  let off = 0; ctx.anims.push({ update(dt) { off += dt * 0.6; tex.offset.y = Math.round(off * 32) / 32; return false; } });
}

// ---------------------------------------------------------------- feathers
// Feathers drifting down through the air and swaying, round and round within the rects (sprites).
const featherTex = () => pix('em-feather', 6, 12, (g) => { const F = ['..##..', '.####.', '.####.', '######', '######', '.####.', '.####.', '..##..', '..##..', '...#..', '...#..', '...#..']; F.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') { g.fillStyle = x < 3 ? '#fffcf4' : '#e4dccc'; g.fillRect(x, y, 1, 1); } })); });
export function feathers(ctx, rects, n = 40) {
  const R = T.rng(1717); const list = []; const mat = new THREE.SpriteMaterial({ map: featherTex(), color: 0xffffff, alphaTest: 0.5, fog: false });
  for (let i = 0; i < n; i++) { const r = rects[i % rects.length]; const sp = new THREE.Sprite(mat); sp.scale.set(0.38, 0.76, 1); ctx.group.add(sp); list.push({ sp, r, x: r[0] + R() * (r[2] - r[0]), z: r[1] + R() * (r[3] - r[1]), y: R() * 7, ph: R() * 9, v: 0.25 + R() * 0.25 }); }
  ctx.anims.push({ update(dt) {
    for (const f of list) { f.y -= f.v * dt; f.ph += dt; if (f.y < -2) { f.y = 7; f.x = f.r[0] + Math.random() * (f.r[2] - f.r[0]); f.z = f.r[1] + Math.random() * (f.r[3] - f.r[1]); } f.sp.position.set(f.x + Math.sin(f.ph * 1.1) * 0.6, f.y, f.z + Math.cos(f.ph * 0.8) * 0.3); f.sp.material.rotation = Math.sin(f.ph * 1.1) * 0.8; }
    return false;
  } });
}

// ---------------------------------------------------------------- the Great Bell's twin
// The vast bell that holds the Voice, hung over the last court (lip at o.lip metres): cracked bronze, its
// crack and its mouth full of light that breathes, a shaft of light down from it onto a seal in the floor,
// three chains of light rising from its crown. It sways a little. Its parts use the see-through cut.
const BELL = [[0, 1.0], [0.16, 0.99], [0.26, 0.96], [0.31, 0.9], [0.32, 0.78], [0.33, 0.62], [0.36, 0.46], [0.41, 0.3], [0.48, 0.15], [0.54, 0.05], [0.56, 0.0], [0.5, 0.0], [0.45, 0.06], [0.38, 0.2], [0.32, 0.38], [0.28, 0.6], [0.26, 0.8], [0, 0.86]];
export function voiceBell(ctx, x, z, o = {}) {
  const s = o.size ?? 6, lip = o.lip ?? 3.4;
  const pv = new THREE.Group(); pv.position.set(x, lip + s * 1.05, z); ctx.group.add(pv);
  const bronze = once('em-bronze', () => cutout(new THREE.MeshPhongMaterial({ color: 0x6a4c26, specular: 0xe0b878, shininess: 40, emissive: 0x2a1404 })));
  const verd = once('em-verd', () => cutout(new THREE.MeshPhongMaterial({ color: 0x4a6e5a, specular: 0x9ad0b8, shininess: 30, emissive: 0x0c1810 })));
  const body = new THREE.Mesh(geo('em-bell', () => new THREE.LatheGeometry(BELL.map(([r, y]) => new THREE.Vector2(r, y)), 28)), bronze); body.scale.setScalar(s); body.position.y = -s * 1.05; body.castShadow = true; pv.add(body);
  for (const [hy, hr, m] of [[0.15, 0.49, bronze], [0.62, 0.335, verd], [0.78, 0.325, bronze]]) { const r = new THREE.Mesh(geo(`em-bband${hr}`, () => new THREE.TorusGeometry(hr, 0.018, 4, 28).rotateX(Math.PI / 2)), m); r.scale.setScalar(s); r.position.y = -s * 1.05 + hy * s; pv.add(r); }
  const crown = new THREE.Mesh(geo('em-bcrown', () => new THREE.TorusGeometry(0.1, 0.035, 5, 10)), bronze); crown.scale.setScalar(s); crown.position.y = -s * 0.01; pv.add(crown);
  // the crack: a jagged seam of light down the side we see, from the shoulder to the lip
  const crackM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.2, 1.4), fog: false, transparent: true });
  const prof = (y) => { let r = 0.32; for (let i = 0; i < 10; i++) { const [r0, y0] = BELL[i], [r1, y1] = BELL[i + 1]; if (y <= y0 && y >= y1) { r = r0 + (r1 - r0) * (y0 - y) / (y0 - y1 || 1); break; } } return r; };
  let prev = null; const R = T.rng(4401); let ang = Math.PI / 4;
  for (let k = 0; k <= 10; k++) { const y = 0.85 - k * 0.083; ang += (R() - 0.5) * 0.22; const r = prof(y) * s + 0.03; const p = [Math.sin(ang) * r, -s * 1.05 + y * s, Math.cos(ang) * r]; if (prev) { const m = seg(pv, geo('em-crk', () => new THREE.BoxGeometry(1, 1, 1)), crackM, prev, p, false); m.scale.x = m.scale.z = 0.09 + (k > 6 ? 0.05 : 0); m.userData.static = false; } prev = p; }
  // light in its mouth, a shaft down to the floor, a seal under it
  const mouth = new THREE.Mesh(geo('em-mouth', () => new THREE.CircleGeometry(1, 24).rotateX(Math.PI / 2)), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 1.3), fog: false, transparent: true })); mouth.scale.setScalar(s * 0.5); mouth.position.y = -s * 1.05 + 0.08; pv.add(mouth);
  const shaftG = new THREE.CylinderGeometry(s * 0.5, s * 0.62, lip, 24, 1, true); const cols = []; const pa = shaftG.attributes.position; for (let i = 0; i < pa.count; i++) { const k = pa.getY(i) / lip + 0.5; cols.push(k, k, k); } shaftG.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const shaft = new THREE.Mesh(shaftG, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.21, 0.13), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })); shaft.position.set(x, lip / 2, z); shaft.renderOrder = 4; ctx.group.add(shaft);
  const seal = decal(ctx, x, z, s * 1.5, T.sigil('circle', 96, 4402), 0xffc860, { k: 1.0, pulse: 0.9, spin: 0.02 });
  floorGlow(ctx, x, z, s * 2.2, s * 2.2, 0xffd890, 0.16);
  const glow = glowSprite(ctx, x, lip + s * 0.4, z + 0.5, s * 2.2, 0xffd890, 0.3);
  for (const a of [0, 2.1, 4.2]) bar(ctx, 'em-lchain', lightM(1.1), [x + Math.cos(a) * 0.3, lip + s * 1.05, z + Math.sin(a) * 0.3], [x + Math.cos(a) * 4, lip + s * 1.05 + 14, z + Math.sin(a) * 4], 0.08);
  ctx.lights.push({ x, y: lip - 0.5, z, color: 0xffe0a0, intensity: 4.5, dist: 10, flicker: 0.04 }); ctx.lights.push({ x: x + 3, y: lip + s * 0.5, z: z + 3, color: 0xffd8a0, intensity: 3, dist: 8 });
  let t = 0; ctx.anims.push({ update(dt) {
    t += dt; const br = 0.75 + 0.25 * Math.sin(t * 1.4) + (Math.sin(t * 0.37) > 0.96 ? 0.4 : 0);
    crackM.color.setRGB(2.6 * br, 2.2 * br, 1.4 * br); mouth.material.color.setRGB(2.4 * br, 2.0 * br, 1.3 * br); shaft.material.color.setRGB(0.25 * br, 0.21 * br, 0.13 * br); glow.material.opacity = 0.35 + 0.3 * (br - 0.5);
    pv.rotation.x = Math.round(Math.sin(t * 0.4) * 0.025 * 256) / 256; pv.rotation.z = Math.round(Math.sin(t * 0.31) * 0.02 * 256) / 256; return false;
  } });
  return pv;
}

// ---------------------------------------------------------------- the sky
// The vast Wheel of eyes far off in the pale sky (drawn behind everything, moving slower than the world):
// rings of glyphs turning against each other, eyes round them blinking, a great eye at the hub following
// the warden. Pale gold on pale sky. When the final boss falls (bossState 'done' here) its eyes shut.
export function skyWheel(ctx, x, y, z, o = {}) {
  const grp = new THREE.Group(); grp.position.set(x, y, z); faceCam(grp); ctx.group.add(grp);
  const radii = o.radii || [8, 13, 19]; const rings = []; const tint = new THREE.Color(o.tint ?? 0xb89a5a);
  radii.forEach((R, k) => {
    const g = new THREE.Group(); grp.add(g);
    const disc = new THREE.Mesh(plane(R * 2 + 2.4, R * 2 + 2.4), new THREE.MeshBasicMaterial({ map: T.sigil('ring', 128, 600 + k), color: tint.clone().multiplyScalar(0.7), blending: THREE.SubtractiveBlending })); g.add(disc);
    const band = new THREE.Mesh(geo(`em-wb${R}`, () => new THREE.RingGeometry(R - 0.22, R + 0.22, 96)), new THREE.MeshBasicMaterial({ color: tint.clone().multiplyScalar(0.8), blending: THREE.SubtractiveBlending })); g.add(band);
    const n = Math.round(R * 2 * Math.PI / 3); const eyes = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const e = new THREE.Mesh(plane(2.2, 1.375), new THREE.MeshBasicMaterial({ map: T.eye(2, 16, 10), alphaTest: 0.5, color: new THREE.Color(0.95, 0.85, 0.7) })); e.position.set(Math.cos(a) * (R - 1.2), Math.sin(a) * (R - 1.2), 0.05); g.add(e); eyes.push({ e, t: Math.random() * 8 }); }
    rings.push({ g, sp: (k % 2 ? -1 : 1) * (0.02 + k * 0.01), eyes });
  });
  const hub = new THREE.Mesh(plane(5, 3), new THREE.MeshBasicMaterial({ map: T.eye(2, 16, 10), alphaTest: 0.5, color: new THREE.Color(1.0, 0.92, 0.78) })); hub.position.z = 0.1; grp.add(hub);
  skyLayer(ctx, grp, o.k ?? 0.9, o.anchor ?? [x, z]);
  const open = T.eye(2, 16, 10), half = T.eye(1, 16, 10), shut = T.eye(0, 16, 10); let t = 0, closing = 0;
  ctx.anims.push({ update(dt) {
    t += dt; const G = typeof window !== 'undefined' && window.BM && window.BM.game; if (G && G.levelId === o.level && G.bossState === 'done') closing = Math.min(1, closing + dt / 4);
    for (const r of rings) { r.g.rotation.z = Math.round(t * r.sp * (1 - closing) * 256) / 256; for (const q of r.eyes) { q.e.rotation.z = -r.g.rotation.z; q.t -= dt; if (q.t < 0) q.t = 3 + Math.random() * 7; q.e.material.map = closing > 0.3 ? shut : (q.t < 0.12 ? shut : q.t < 0.24 ? half : open); } }
    hub.material.map = closing > 0.6 ? shut : open; return false;
  } });
  return grp;
}
