// The scene player: short filmed scenes on the side-on stage (render/stage.js). A scene is a set, a
// cast and a list of steps run in order; a step may hold steps that run together. A tap hurries the
// action (never cuts a line short), Skip ends the scene. Lines float beside the speaker, with their
// name, in their colour.
//
//   const player = createScenePlayer({ stage, root })
//   await player.play(scene, sprites)        // scene from data/scenes.js
//
// Steps: { cam: [x, zoom, g], t }  { follow: id }  { walk: [id, x], run, speed }  { face: [id, x|id|'E'|'W'] }
//        { clip: [id, name, loop], fps }  { say: [id, text], tone }  { wait: s }  { title: [text, sub], side }
//        { fx: [name, x, height, scale] }  { enter: [id, x] }  { hide: id }  { shake: n }  { flash: a }  { all: [steps] }  { seq: [steps] }
export function createScenePlayer({ stage, root }) {
  const line = root.querySelector('#sc-line'), card = root.querySelector('#sc-card');
  let actors = {}, speed = 1, skip = false, raf = 0, setKey = null, follow = null;
  const cam = { x: 0, zoom: 1, g: null };
  const waits = [];

  const ease = (t) => t * t * (3 - 2 * t);
  const sleep = (s) => new Promise((ok) => { let left = s; waits.push({ tick: (dt) => (left -= dt) <= 0 || skip, ok }); });
  function frame(dt) {
    const d = dt * speed;
    for (const w of waits.slice()) if (w.tick(d)) { waits.splice(waits.indexOf(w), 1); w.ok(); }
    for (const a of Object.values(actors)) stepActor(a, d);
    if (follow && actors[follow]) cam.x += (actors[follow].x - cam.x) * Math.min(1, d * 2.5);
    stage.draw({ set: setKey, cam: { x: cam.x, zoom: cam.zoom, g: cam.g }, actors: Object.values(actors) }, d);
    placeLine();
  }
  // an actor walks to its mark, then stands
  function stepActor(a, dt) {
    if (!a.to) return;
    const dx = a.to.x - a.x, st = a.to.speed * dt;
    if (Math.abs(dx) <= st || skip) { a.x = a.to.x; const done = a.to.done; a.to = null; a.anim = { clip: 'idle' }; done(); return; }
    a.x += Math.sign(dx) * st; a.f = Math.sign(dx);
  }
  // the line beside its speaker: name above, a bar in their colour, on the side with more room
  let current = null;
  function placeLine() {
    if (!current) return;
    const a = actors[current.id], r = root.getBoundingClientRect();
    if (!a || a.hidden) { line.style.left = r.width * 0.08 + 'px'; line.style.top = r.height * 0.7 + 'px'; line.classList.remove('flip'); return; }
    const head = stage.project(a.x, a.lane || 0, 40 * (a.scale || 1) * (a.big || 1));
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
  async function title(text, sub, side) {
    card.replaceChildren(); const h = document.createElement('div'); h.className = 'sc-title'; h.textContent = text; card.append(h);
    if (sub) { const s = document.createElement('div'); s.className = 'sc-sub'; s.textContent = sub; card.append(s); }
    card.hidden = false; card.classList.remove('out'); card.classList.toggle('side', !!side);
    await sleep(2.6);
    card.classList.add('out'); await sleep(0.5); card.hidden = true;
  }
  function moveCam(to, t) {
    const from = { ...cam }, dur = Math.max(0.01, t || 1.2), tz = to[1] || from.zoom, tg = to[2] != null ? to[2] : null;
    let k = 0;
    return new Promise((ok) => waits.push({ tick: (dt) => {
      k = Math.min(1, k + dt / dur); const e = ease(k);
      cam.x = from.x + (to[0] - from.x) * e; cam.zoom = from.zoom + (tz - from.zoom) * e; cam.g = k >= 1 ? tg : from.g;
      return k >= 1 || skip;
    }, ok }));
  }
  function run(step) {
    if (skip) return Promise.resolve();
    if (step.all) return Promise.all(step.all.map(run));
    if (step.seq) return step.seq.reduce((pr, x) => pr.then(() => run(x)), Promise.resolve());
    if (step.cam) { follow = null; if (step.t === 0) { cam.x = step.cam[0]; cam.zoom = step.cam[1] || cam.zoom; cam.g = step.cam[2] != null ? step.cam[2] : null; return Promise.resolve(); } return moveCam(step.cam, step.t); }
    if ('follow' in step) { follow = step.follow; return Promise.resolve(); }
    if (step.walk) {
      const [id, x] = step.walk, a = actors[id];
      a.anim = { clip: step.run ? 'Run' : 'Walk', fps: step.run ? 16 : 11 }; a.f = Math.sign(x - a.x) || a.f;
      return new Promise((done) => { a.to = { x, speed: step.speed || (step.run ? 4.6 : 1.9), done }; });
    }
    if (step.enter) { const [id, x] = step.enter, a = actors[id]; a.hidden = false; if (x != null) a.x = x; return Promise.resolve(); }
    if (step.hide) { actors[step.hide].hidden = true; return Promise.resolve(); }
    if (step.face) {
      const [id, w] = step.face, a = actors[id];
      a.f = w === 'E' ? 1 : w === 'W' ? -1 : Math.sign((typeof w === 'string' ? actors[w].x : w) - a.x) || a.f;
      return Promise.resolve();
    }
    if (step.clip) { const [id, name, loop] = step.clip; actors[id].anim = { clip: name, loop: loop !== false, fps: step.fps || 10 }; return Promise.resolve(); }
    if (step.say) return say(step.say[0], step.say[1], step.tone);
    if (step.wait) return sleep(step.wait);
    if (step.title) return title(step.title[0], step.title[1], step.side);
    if (step.fx) { const [name, x, height = 20, scale = 1] = step.fx; stage.spawn(name, x, height, { scale }); return Promise.resolve(); }
    if (step.shake) { stage.shake(step.shake); return Promise.resolve(); }
    if (step.flash) { stage.flash(step.flash); return Promise.resolve(); }
    return Promise.resolve();
  }

  async function play(scene, sprites) {
    skip = false; speed = 1; follow = null; setKey = scene.set;
    actors = {};
    for (const [id, c] of Object.entries(scene.cast)) {
      actors[id] = { id, name: c.name, color: c.color, set: c.set, x: c.x, lane: c.lane || 0, f: c.f || 1, scale: c.scale || 1, big: c.big || 1, hidden: !!c.off, anim: { clip: 'idle' } };
    }
    cam.x = scene.cam[0]; cam.zoom = scene.cam[1] || 1; cam.g = scene.cam[2] != null ? scene.cam[2] : null;
    stage.setSprites(sprites); stage.reset(); stage.resize();
    root.hidden = false; line.hidden = true; card.hidden = true;
    let last = 0;
    const loop = (now) => { const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; frame(dt); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    for (const st of scene.steps) { if (skip) break; await run(st); }
    cancelAnimationFrame(raf); root.hidden = true; line.hidden = true; card.hidden = true;
  }
  // a tap hurries everything (three times as fast while held); Skip ends the scene
  root.addEventListener('pointerdown', (e) => { if (e.target.closest('#sc-skip')) return; speed = 3; });
  root.addEventListener('pointerup', () => { speed = 1; });
  root.addEventListener('pointercancel', () => { speed = 1; });
  root.querySelector('#sc-skip').addEventListener('click', () => { skip = true; for (const w of waits.splice(0)) w.ok(); for (const a of Object.values(actors)) if (a.to) { const d = a.to.done; a.to = null; d(); } });
  window.addEventListener('resize', () => { if (!root.hidden) stage.resize(); });
  return { play, get playing() { return !root.hidden; } };
}
