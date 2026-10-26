// The scene player: short filmed scenes in the battle renderer and its arenas. A scene is a cast and
// a list of steps run in order; a step may hold steps that run together. A tap hurries the action
// (never cuts a line short), Skip ends the scene. Lines float beside the speaker, with their name.
//
//   const player = createScenePlayer({ view, root })
//   await player.play(scene, sprites)        // scene from data/scenes.js
//
// Steps: { cam: [x, y, zoom], t }   { walk: [id, x, y], speed }   { face: [id, x|id] }   { clip: [id, name, loop] }
//        { say: [id, text], tone }  { wait: s }   { title: [text, sub] }   { fx: [name, x, y, z, scale] }
//        { enter: [id, x, y] }     { hide: id }  { all: [steps] }  { shake: n }
import { FIELD_SIZE } from '../combat/battle.js';

export function createScenePlayer({ view, root }) {
  const line = root.querySelector('#sc-line'), card = root.querySelector('#sc-card');
  let b = null, actors = {}, speed = 1, skip = false, cam = null, raf = 0;

  const ease = (t) => t * t * (3 - 2 * t);
  const sleep = (s) => new Promise((ok) => { let left = s; const tick = (dt) => { left -= dt; return left <= 0 || skip; }; waits.push({ tick, ok }); });
  const waits = [];
  function frame(dt) {
    const d = dt * speed;
    for (const w of waits.slice()) if (w.tick(d)) { waits.splice(waits.indexOf(w), 1); w.ok(); }
    for (const a of Object.values(actors)) stepActor(a, d);
    b.t += d;
    view.draw(b, d);
    placeLine();
  }
  // an actor walks to its target, then stands
  function stepActor(a, dt) {
    a.st += dt;
    if (!a.to) return;
    const dx = a.to.x - a.x, dy = a.to.y - a.y, dist = Math.hypot(dx, dy), st = a.to.speed * dt;
    if (dist <= st || skip) { a.x = a.to.x; a.y = a.to.y; const done = a.to.done; a.to = null; a.anim = { clip: 'idle' }; done(); return; }
    a.x += (dx / dist) * st; a.y += (dy / dist) * st; a.f = Math.atan2(dy, dx);
  }
  // the line beside its speaker: name above, a thin bar in their colour down to the head
  let current = null;
  function placeLine() {
    if (!current) return;
    const a = actors[current.id]; if (!a) return;
    const head = view.project(a.x, a.y, 2.3 * (a.def.scale || 1)), r = root.getBoundingClientRect();
    const right = head.x < r.width * 0.62;
    line.style.left = (right ? head.x + 14 : head.x - 14 - line.offsetWidth) + 'px';
    line.style.top = Math.max(r.height * 0.14, head.y - line.offsetHeight - 6) + 'px';
    line.classList.toggle('flip', !right);
  }
  async function say(id, text, tone) {
    const a = actors[id];
    line.replaceChildren(); const n = document.createElement('b'); n.textContent = a ? a.name : ''; const p = document.createElement('span'); p.textContent = text;
    line.append(n, p); line.className = 'sc-line ' + (tone || ''); line.style.setProperty('--c', (a && a.color) || '#ffd36b');
    line.hidden = false; current = { id }; placeLine();
    if (a && a.anim && a.anim.clip === 'idle' && tone === 'shout') a.anim = { clip: 'Taunt', loop: false };
    await sleep(1.4 + text.length * 0.045);
    line.hidden = true; current = null;
  }
  async function title(text, sub) {
    card.replaceChildren(); const h = document.createElement('div'); h.className = 'sc-title'; h.textContent = text; card.append(h);
    if (sub) { const s = document.createElement('div'); s.className = 'sc-sub'; s.textContent = sub; card.append(s); }
    card.hidden = false; card.classList.remove('out');
    await sleep(2.6);
    card.classList.add('out'); await sleep(0.5); card.hidden = true;
  }
  async function moveCam(to, t) {
    const from = { ...b.camera }, dur = Math.max(0.01, t || 1.2);
    let k = 0;
    await new Promise((ok) => waits.push({ tick: (dt) => { k = Math.min(1, k + dt / dur); const e = ease(k); b.camera = { x: from.x + (to[0] - from.x) * e, y: from.y + (to[1] - from.y) * e, zoom: from.zoom + ((to[2] || from.zoom) - from.zoom) * e }; return k >= 1 || skip; }, ok }));
  }
  async function run(step) {
    if (skip) return;
    if (step.all) return Promise.all(step.all.map(run));
    if (step.cam) return step.t === 0 ? (b.camera = { x: step.cam[0], y: step.cam[1], zoom: step.cam[2] || b.camera.zoom }) : moveCam(step.cam, step.t);
    if (step.walk) { const [id, x, y] = step.walk, a = actors[id]; a.anim = { clip: step.run ? 'Run' : 'Walk', fps: step.run ? 16 : 11 }; return new Promise((done) => { a.to = { x, y, speed: step.speed || (step.run ? 4.2 : 2.0), done }; }); }
    if (step.enter) { const [id, x, y] = step.enter, a = actors[id]; a.hidden = false; a.x = x; a.y = y; b.units.includes(a) || b.units.push(a); return; }
    if (step.hide) { b.units = b.units.filter((u) => u !== actors[step.hide]); return; }
    if (step.face) { const [id, w] = step.face, a = actors[id], t = typeof w === 'string' ? actors[w] : { x: w, y: a.y }; a.f = Math.atan2(t.y - a.y, t.x - a.x); return; }
    if (step.clip) { const [id, name, loop] = step.clip; actors[id].anim = { clip: name, loop: loop !== false, fps: step.fps || 10 }; return; }
    if (step.say) return say(step.say[0], step.say[1], step.tone);
    if (step.wait) return sleep(step.wait);
    if (step.title) return title(step.title[0], step.title[1]);
    if (step.fx) { const [name, x, y, z = 1, scale = 1] = step.fx; view.spawn(name, x, y, z, { scale, add: true }); return; }
    if (step.shake) { b.events.push({ type: 'fury' }); return; }
  }

  async function play(scene, sprites) {
    skip = false; speed = 1;
    actors = {};
    for (const [id, c] of Object.entries(scene.cast)) {
      actors[id] = { id, actor: true, name: c.name, color: c.color, def: { set: c.set, scale: c.scale || 1, attack: {} }, team: 'ally', state: 'idle', st: 0,
        f: c.f != null ? c.f : 0, x: c.at[0], y: c.at[1], hp: 1, max: 1, statuses: [], energy: 0, shield: 0, flash: 0, hitT: 0, anim: { clip: 'idle' } };
    }
    b = { t: 0, field: FIELD_SIZE, arena: scene.arena, theme: 'meadow', units: Object.values(actors).filter((a) => !scene.cast[a.id].off), shots: [], events: [], camera: { x: scene.cam[0], y: scene.cam[1], zoom: scene.cam[2] || 1.3 } };
    view.setSprites(sprites); view.reset(); view.resize();
    root.hidden = false; line.hidden = true; card.hidden = true;
    let last = 0;
    const loop = (now) => { const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; b.events = []; frame(dt); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    for (const st of scene.steps) { if (skip) break; await run(st); }
    cancelAnimationFrame(raf); root.hidden = true; line.hidden = true; card.hidden = true;
  }
  // a tap hurries everything (three times as fast while held); Skip ends the scene
  root.addEventListener('pointerdown', (e) => { if (e.target.closest('#sc-skip')) return; speed = 3; });
  root.addEventListener('pointerup', () => { speed = 1; });
  root.querySelector('#sc-skip').addEventListener('click', () => { skip = true; for (const w of waits.splice(0)) w.ok(); for (const a of Object.values(actors)) if (a.to) { const d = a.to.done; a.to = null; d(); } });
  return { play, get playing() { return !root.hidden; } };
}
