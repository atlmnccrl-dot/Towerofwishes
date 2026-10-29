// The scene player: short filmed scenes on the battle maps. The fights' renderer (render/view.js) draws
// them, so a scene has the same arenas, sprites and camera angle as a fight; only the camera moves closer
// for a line. A scene is an arena, a cast and a list of steps run in order; a step may hold steps that
// run together. A tap hurries the action (never cuts a line short), Skip ends the scene. Lines float
// beside the speaker, with their name, in their colour.
//
//   const player = createScenePlayer({ view, root, audio })
//   await player.play(scene, sprites)        // scene from data/scenes.js
//
// Places are metres on the field (x east, y toward the camera; the field runs x -8.5..8.5, y -3.7..3.7),
// z is height above the ground. The camera is [x, y, zoom]: about 1.1 the fights' wide view, 2 a close shot.
// Steps: { cam: [x, y, zoom], t }  { follow: id }  { walk: [id, x, y], run, speed }  { face: [id, id | [x, y] | 'E' | 'W' | 'N' | 'S'] }
//        { clip: [id, name, loop], fps }  { say: [id, text], tone }  { wait: s }  { title: [text, sub], side: true | 'plain', slam, hold }
//        { fx: [name, x, y, z, scale], life, flip, ground }  { enter: [id, x, y] }  { hide: id }  { shake: n }  { flash: a | [a, 'r,g,b'] }
//        { all: [steps] }  { seq: [steps] }  { arena: key } (cut to another place)  { slow: k } (time k times as fast; 1 is normal)
//        { sfx: name, gain }  { music: 'battle' | 'storm' | null }  { fade: [alpha, seconds] }  { mood: { col, op } | null }
//        { fly: [fx, [x, y, z], [x, y, z], seconds, scale], hit, hitScale }  { dark: [id, true | colour | false] }  { lift: [id, z, seconds] }  { alpha: [id, a] }
import { FIELD_SIZE } from '../combat/battle.js';
import { VIEW } from './view.js';

const FACING = { E: 0, SE: Math.PI / 4, S: Math.PI / 2, SW: (3 * Math.PI) / 4, W: Math.PI, NW: (-3 * Math.PI) / 4, N: -Math.PI / 2, NE: -Math.PI / 4 };
// effects that are light (drawn added) unless they are dust, smoke, stone or a missile you can see
const SOLID = /dust|smoke|rock|arrow|spear|dart|sand|footstep|jump/;
const GROUND_FX = new Set(['shockwave', 'circle_holy', 'circle_arcane', 'cast_circle', 'burning_ground', 'fire_ring']);

export function createScenePlayer({ view, root, audio }) {
  const line = root.querySelector('#sc-line'), card = root.querySelector('#sc-card'), fade = root.querySelector('#sc-fade');
  let actors = {}, speed = 1, slow = 1, skip = false, raf = 0, arena = null, follow = null;
  const cam = { x: 0, y: 0, zoom: 1.1 };
  const waits = [];

  const ease = (t) => t * t * (3 - 2 * t);
  const sleep = (s) => new Promise((ok) => { let left = s; waits.push({ tick: (dt) => (left -= dt) <= 0 || skip, ok }); });
  const tween = (dur, fn) => { let k = 0; return new Promise((ok) => waits.push({ tick: (dt) => { k = Math.min(1, k + dt / Math.max(0.01, dur)); fn(ease(k)); return k >= 1 || skip; }, ok })); };

  // the camera as drawn: a squarer screen (a tablet) pulls back a little so it sees about as much across as
  // a phone, and the frame never runs past the painted ground
  function shot() {
    const r = root.getBoundingClientRect(), aspect = r.width / Math.max(1, r.height);
    const zoom = cam.zoom * Math.max(0.7, Math.min(1, aspect / 2)), s = VIEW.PPM * zoom;
    const halfW = (VIEW.BUF_H * aspect) / 2 / s, gx = FIELD_SIZE.w / 2 + 7 - halfW;
    const up = (VIEW.BUF_H * 0.55) / (s * VIEW.SQUASH), down = (VIEW.BUF_H * 0.45) / (s * VIEW.SQUASH), gy = FIELD_SIZE.h / 2 + 7;
    return { x: Math.max(-gx, Math.min(gx, cam.x)), y: Math.max(-gy + up, Math.min(gy - down, cam.y)), zoom };
  }
  function frame(dt) {
    const d = dt * speed * slow;
    for (const w of waits.slice()) if (w.tick(d)) { waits.splice(waits.indexOf(w), 1); w.ok(); }
    for (const a of Object.values(actors)) stepActor(a, d);
    if (follow && actors[follow]) { const a = actors[follow], k = Math.min(1, d * 2.5); cam.x += (a.x - cam.x) * k; cam.y += (a.y - cam.y) * k; }
    view.draw({ field: FIELD_SIZE, arena, units: Object.values(actors).filter((a) => !a.hidden), shots: [], events: [], camera: shot() }, d);
    placeLine();
  }
  // an actor walks to its mark, then stands
  function stepActor(a, dt) {
    if (!a.to) return;
    const dx = a.to.x - a.x, dy = a.to.y - a.y, dist = Math.hypot(dx, dy), st = a.to.speed * dt;
    if (dist <= st || skip) { a.x = a.to.x; a.y = a.to.y; const done = a.to.done; a.to = null; a.anim = { clip: 'idle' }; done(); return; }
    a.x += (dx / dist) * st; a.y += (dy / dist) * st; a.f = Math.atan2(dy, dx);
  }
  // the line beside its speaker: name above, a bar in their colour, on the side with more room
  let current = null;
  function placeLine() {
    if (!current) return;
    const a = actors[current.id], r = root.getBoundingClientRect();
    if (!a || a.hidden) { line.style.left = r.width * 0.08 + 'px'; line.style.top = r.height * 0.7 + 'px'; line.classList.remove('flip'); return; }
    const head = view.project(a.x, a.y, (a.z || 0) + 1.9 * (a.def.scale || 1) * (a.big || 1));
    const right = head.x < r.width * 0.6;
    const w = line.offsetWidth, x = right ? head.x + 18 : head.x - 18 - w;
    line.style.left = Math.max(12, Math.min(r.width - w - 12, x)) + 'px';
    line.style.top = Math.max(r.height * 0.13, Math.min(r.height * 0.78 - line.offsetHeight, head.y - line.offsetHeight * 0.5)) + 'px';
    line.classList.toggle('flip', !right);
  }
  async function say(id, text, tone) {
    const a = actors[id];
    line.replaceChildren(); const n = document.createElement('b'); n.textContent = a ? a.name : ''; const p = document.createElement('span'); p.textContent = text;
    line.append(n, p); line.className = 'sc-line ' + (tone || ''); line.style.setProperty('--c', (a && a.color) || '#ffd36b');
    line.hidden = false; current = { id }; placeLine();
    if (a && a.anim.clip === 'idle' && tone === 'shout') a.anim = { clip: 'Taunt', loop: false, fps: 12 };
    await sleep(1.5 + text.length * 0.05);
    line.hidden = true; current = null;
    if (a && a.anim.clip === 'Taunt' && tone === 'shout') a.anim = { clip: 'idle' };
  }
  async function title(text, sub, side, slam, hold) {
    card.replaceChildren(); const h = document.createElement('div'); h.className = 'sc-title'; h.textContent = text; card.append(h);
    if (sub) { const s = document.createElement('div'); s.className = 'sc-sub'; s.textContent = sub; card.append(s); }
    card.hidden = false; card.classList.remove('out'); card.classList.toggle('side', side === true); card.classList.toggle('slam', !!slam);
    card.classList.toggle('plain', side === 'plain');
    await sleep(hold || 2.6);
    card.classList.add('out'); await sleep(0.5); card.hidden = true;
  }
  function moveCam(to, t) {
    const from = { ...cam }, tz = to[2] || from.zoom;
    return tween(t || 1.2, (e) => { cam.x = from.x + (to[0] - from.x) * e; cam.y = from.y + (to[1] - from.y) * e; cam.zoom = from.zoom + (tz - from.zoom) * e; });
  }
  const angle = (a, w) => (typeof w === 'string' && FACING[w] != null ? FACING[w] : Array.isArray(w) ? Math.atan2(w[1] - a.y, w[0] - a.x) : Math.atan2(actors[w].y - a.y, actors[w].x - a.x));
  function run(step) {
    if (skip) return Promise.resolve();
    if (step.all) return Promise.all(step.all.map(run));
    if (step.seq) return step.seq.reduce((pr, x) => pr.then(() => run(x)), Promise.resolve());
    if (step.cam) { follow = null; if (step.t === 0) { cam.x = step.cam[0]; cam.y = step.cam[1]; cam.zoom = step.cam[2] || cam.zoom; return Promise.resolve(); } return moveCam(step.cam, step.t); }
    if ('follow' in step) { follow = step.follow; return Promise.resolve(); }
    if (step.walk) {
      const [id, x, y] = step.walk, a = actors[id];
      a.anim = { clip: step.run ? 'Run' : 'Walk', fps: step.run ? 16 : 11 };
      return new Promise((done) => { a.to = { x, y: y != null ? y : a.y, speed: step.speed || (step.run ? 4.6 : 1.9), done }; });
    }
    if (step.enter) { const [id, x, y] = step.enter, a = actors[id]; a.hidden = false; if (x != null) a.x = x; if (y != null) a.y = y; return Promise.resolve(); }
    if (step.hide) { actors[step.hide].hidden = true; return Promise.resolve(); }
    if (step.face) { const [id, w] = step.face, a = actors[id]; a.f = angle(a, w); return Promise.resolve(); }
    if (step.clip) { const [id, name, loop] = step.clip; actors[id].anim = { clip: name, loop: loop !== false, fps: step.fps || 10 }; return Promise.resolve(); }
    if (step.say) return say(step.say[0], step.say[1], step.tone);
    if (step.wait) return sleep(step.wait);
    if (step.title) return title(step.title[0], step.title[1], step.side, step.slam, step.hold);
    if (step.fx) {
      const [name, x, y, z = 1, scale = 1] = step.fx, ground = step.ground != null ? step.ground : GROUND_FX.has(name);
      view.spawn(name, x, y, ground ? 0.05 : z, { scale, life: step.life, flip: step.flip, add: !SOLID.test(name), ground });
      return Promise.resolve();
    }
    if (step.shake) { view.shake(step.shake); return Promise.resolve(); }
    if (step.flash) { if (Array.isArray(step.flash)) view.flash(step.flash[0], step.flash[1]); else view.flash(step.flash); return Promise.resolve(); }
    if (step.arena) { arena = step.arena; return Promise.resolve(); }
    if ('slow' in step) { slow = step.slow || 1; return Promise.resolve(); }
    if (step.sfx) { if (audio) audio.play(step.sfx, { gain: step.gain || 1, gap: 0 }); return Promise.resolve(); }
    if ('music' in step) { if (audio) audio.setScene(step.music); return Promise.resolve(); }
    if ('mood' in step) { view.mood(step.mood); return Promise.resolve(); }
    if (step.fade) { const [a, t = 0.6] = step.fade; fade.style.transition = `opacity ${t / Math.max(0.2, speed)}s linear`; fade.style.opacity = a; return sleep(t); }
    if (step.dark) { const [id, v] = step.dark; actors[id].dark = v; return Promise.resolve(); }
    if (step.alpha) { const [id, v] = step.alpha; actors[id].alpha = v; return Promise.resolve(); }
    if (step.lift) {
      const [id, z, t] = step.lift, a = actors[id];
      if (!t) { a.z = z; return Promise.resolve(); }
      const from = a.z || 0; return tween(t, (e) => { a.z = from + (z - from) * e; });
    }
    if (step.fly) {
      // a missile from one point to another; it bursts where it lands
      const [name, [x0, y0, z0], [x1, y1, z1], dur, scale = 1] = step.fly;
      view.spawn(name, x0, y0, z0, { scale, vx: (x1 - x0) / dur, vy: (y1 - y0) / dur, vz: (z1 - z0) / dur, life: dur, flip: x1 < x0, add: !SOLID.test(name) });
      return sleep(dur).then(() => { if (step.hit && !skip) view.spawn(step.hit, x1, y1, z1, { scale: step.hitScale || 1, add: true }); });
    }
    return Promise.resolve();
  }

  async function play(scene, sprites) {
    skip = false; speed = 1; slow = 1; follow = null; arena = scene.arena;
    actors = {};
    for (const [id, c] of Object.entries(scene.cast)) {
      actors[id] = { id, name: c.name, color: c.color, def: { set: c.set, scale: c.scale || 1 }, big: c.big || 1, x: c.x, y: c.y || 0, z: c.z || 0,
        f: c.f != null ? (typeof c.f === 'string' ? FACING[c.f] : c.f) : 0, hidden: !!c.off, dark: c.dark || false, alpha: c.alpha,
        anim: { clip: 'idle' }, actor: true, state: 'idle', statuses: [], flash: 0, st: 0 };
    }
    [cam.x, cam.y, cam.zoom] = [scene.cam[0], scene.cam[1], scene.cam[2] || 1.1];
    view.setSprites(sprites); view.reset(); view.resize();
    if (scene.mood) view.mood(scene.mood);
    fade.style.transition = 'none'; fade.style.opacity = scene.black ? 1 : 0;
    root.hidden = false; line.hidden = true; card.hidden = true;
    let last = 0;
    const loop = (now) => { const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; frame(dt); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    for (const st of scene.steps) { if (skip) break; await run(st); }
    cancelAnimationFrame(raf); root.hidden = true; line.hidden = true; card.hidden = true; fade.style.opacity = 0; slow = 1; view.reset();
  }
  // a tap hurries everything (three times as fast while held); Skip ends the scene
  root.addEventListener('pointerdown', (e) => { if (e.target.closest('#sc-skip')) return; speed = 3; });
  root.addEventListener('pointerup', () => { speed = 1; });
  root.addEventListener('pointercancel', () => { speed = 1; });
  root.querySelector('#sc-skip').addEventListener('click', () => { skip = true; for (const w of waits.splice(0)) w.ok(); for (const a of Object.values(actors)) if (a.to) { const d = a.to.done; a.to = null; d(); } });
  window.addEventListener('resize', () => { if (!root.hidden) view.resize(); });
  return { play, get playing() { return !root.hidden; } };
}
