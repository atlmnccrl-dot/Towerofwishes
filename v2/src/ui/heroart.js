// Big animated characters for the menus: each set's calm idle from the small hero atlas
// (tools/hero_art.py), drawn crisp at a whole number of screen pixels per sprite pixel.
//
//   await loadHeroArt()
//   heroArt('kael_sword', 4)        // a <canvas> sized to the character, feet at the bottom
let atlas = null, img = null;
const live = new Set();
let t = 0, last = 0, running = false;

export async function loadHeroArt() {
  if (atlas) return;
  const data = await (await fetch('assets/heroes/heroes.json')).json();
  img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'assets/heroes/' + data.page; });
  // each set's box around its feet, the union of its frames
  for (const s of Object.values(data.sets)) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [, , w, h, ox, oy] of s.frames) { x0 = Math.min(x0, ox); y0 = Math.min(y0, oy); x1 = Math.max(x1, ox + w); y1 = Math.max(y1, oy + h); }
    s.box = [x0, y0, x1 - x0, Math.max(y1, s.anchor[1] + 2) - y0];
  }
  atlas = data;
}

export function heroArt(set, px = 3, o = {}) {
  const c = document.createElement('canvas');
  c.className = 'hero-art' + (o.cls ? ' ' + o.cls : '');
  c.setAttribute('aria-hidden', 'true');
  const s = atlas && atlas.sets[set];
  if (!s) { c.width = c.height = 1; return c; }
  const [, , w, h] = s.box;
  c.width = w; c.height = h; c.style.width = w * px + 'px'; c.style.height = h * px + 'px';
  if (o.flip) c.style.transform = 'scaleX(-1)';
  c._art = { s, phase: o.phase != null ? o.phase : Math.random() * 3, still: !!o.still, shadow: o.shadow !== false, f: -1 };
  paint(c);
  if (!o.still) { live.add(c); if (!running) { running = true; requestAnimationFrame(loop); } }
  return c;
}

function paint(c) {
  const a = c._art, s = a.s, n = s.frames.length, i = a.still ? 0 : Math.floor((t + a.phase) * 7) % n;
  if (i === a.f) return; a.f = i;
  const g = c.getContext('2d'), [x, y, w, h, ox, oy] = s.frames[i], [bx, by] = s.box;
  g.clearRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false;
  if (a.shadow) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(s.anchor[0] - bx, s.anchor[1] - by, 9, 2.5, 0, 0, Math.PI * 2); g.fill(); }
  g.drawImage(img, x, y, w, h, ox - bx, oy - by, w, h);
}

function loop(now) {
  t += Math.min(0.1, (now - (last || now)) / 1000); last = now;
  for (const c of live) { if (!c.isConnected) { if (c._seen) live.delete(c); continue; } c._seen = true; paint(c); }
  if (live.size) requestAnimationFrame(loop); else { running = false; last = 0; }
}
