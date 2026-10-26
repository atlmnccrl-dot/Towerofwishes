// Loads the carried-over art: sprite sets (assets/sprites/<set>.json + pages) and the effects
// atlas (assets/fx/fx.json + pages). A frame is [page, x, y, w, h, ox, oy]: its rectangle on the
// page and its offset inside the set's cell, whose anchor is the feet.
import { CLIPS, SETS, PHASES } from '../data/anims.js';

const img = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('image ' + src)); i.src = src; });

export async function loadSprites(names) {
  const out = {};
  await Promise.all(names.map(async (name) => {
    const data = await (await fetch(`assets/sprites/${name}.json`)).json();
    const pages = await Promise.all(data.pages.map((p) => img(`assets/sprites/${p}`)));
    out[name] = { name, data, pages, cfg: SETS[name] || {} };
  }));
  return out;
}

// an atlas: assets/<dir>/<dir>.json and its pages (the effects, the tiles)
export async function loadAtlas(dir) {
  const data = await (await fetch(`assets/${dir}/${dir}.json`)).json();
  const pages = await Promise.all(data.pages.map((p) => img(`assets/${dir}/${p}`)));
  return { data, pages };
}
export const loadFx = () => loadAtlas('fx');

// The frames of a clip in a direction (an empty cell repeats the frame before it).
export function framesOf(set, clip, dir) {
  const a = set.data.anims[clip];
  if (!a) return null;
  const fr = a[dir] || a.S || Object.values(a)[0];
  const out = []; let last = null;
  for (const f of fr) { if (f) last = f; if (last) out.push(last); }
  return out.length ? out : null;
}

export { CLIPS, PHASES };
