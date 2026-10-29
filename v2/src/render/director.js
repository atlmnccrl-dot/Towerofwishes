// The battle's director. A fight starts like a film: the camera close on the foes as they bare their
// teeth, a whip across to the company, then back to the whole field for FIGHT. During the fight the
// camera follows the action and tightens as fighters fall; abilities, critical hits and kills get a
// lean-in and a moment of slow time; the last blow is held. No DOM: main.js answers the cues.
//
//   const d = createDirector(view)
//   d.start(battle, { quick })        // quick: a short intro (a mission fought before)
//   const { cues, scale } = d.update(dt, events)   // cues: 'vs' 'heroes' 'fight' 'go'; scale: how fast the fight runs now
//   battle.camera = d.camera
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, k) => a + (b - a) * k;

export function createDirector(view) {
  let b = null, fit = null, intro = null, slowT = 0, slowK = 1, hold = 0, lean = null;
  const camera = { x: 0, y: 0, zoom: 1 };
  const alive = (team) => b.units.filter((u) => u.team === team && u.state !== 'ko' && !u.summoned);
  const centre = (list) => (list.length ? { x: list.reduce((a, u) => a + u.x, 0) / list.length, y: list.reduce((a, u) => a + u.y, 0) / list.length } : { x: 0, y: 0 });
  const clampX = (x, zoom) => { const r = view.room(b, zoom); return Math.max(-r, Math.min(r, x)); };

  function start(battle, { quick = false } = {}) {
    b = battle; fit = view.fit(b); slowT = 0; hold = 0; lean = null;
    const foes = alive('foe'), allies = alive('ally'), boss = foes.find((u) => u.def.boss);
    const fc = boss ? { x: boss.x, y: boss.y } : centre(foes), ac = centre(allies);
    const close = Math.min(2.1, fit.zoom * (boss ? 1.6 : 1.85));
    // the shots: [time, x, y, zoom]; the camera eases from one to the next
    const shots = quick
      ? [[0, fc.x * 0.5, fit.y, fit.zoom * 1.3], [0.9, 0, fit.y, fit.zoom]]
      : [[0, fc.x + 0.6, fc.y - 0.5, close * 1.08], [1.5, fc.x, fc.y - 0.5, close], [1.85, ac.x, ac.y - 0.5, close], [2.9, ac.x + 0.4, ac.y - 0.5, close * 0.96], [3.5, 0, fit.y, fit.zoom]];
    const cues = quick ? [[0, 'vs'], [0.7, 'fight'], [1.0, 'go']] : [[0.05, 'vs'], [1.85, 'heroes'], [3.3, 'fight'], [3.6, 'go']];
    intro = { t: 0, shots, cues, end: shots[shots.length - 1][0] + 0.1 };
    Object.assign(camera, { x: shots[0][1], y: shots[0][2], zoom: shots[0][3] });
    // everyone holds still for the camera: no rings or bars until the fight starts
    for (const u of b.units) { u.actor = true; u.anim = { clip: 'idle' }; }
  }
  const playing = () => !!intro;

  function update(dt, events = []) {
    const out = { cues: [], scale: 1 };
    if (intro) {
      intro.t += dt; const t = intro.t, S = intro.shots;
      let i = 0; while (i < S.length - 1 && t >= S[i + 1][0]) i++;
      const a = S[i], z = S[Math.min(i + 1, S.length - 1)], k = z === a ? 1 : ease(Math.min(1, (t - a[0]) / Math.max(0.01, z[0] - a[0])));
      camera.x = lerp(a[1], z[1], k); camera.y = lerp(a[2], z[2], k); camera.zoom = lerp(a[3], z[3], k); camera.x = clampX(camera.x, camera.zoom);
      for (const c of intro.cues) if (!c.done && t >= c[0]) {
        c.done = true; out.cues.push(c[1]);
        if (c[1] === 'vs') for (const u of b.units) if (u.team === 'foe') u.anim = { clip: 'Taunt', loop: false, fps: 10 };
        if (c[1] === 'heroes') for (const u of b.units) if (u.team === 'ally') u.anim = { clip: 'Taunt', loop: false, fps: 11 };
      }
      if (t >= intro.end) skip();
      out.scale = 0;
      return out;
    }
    // the big moments: a lean towards a hero's (or a boss's) ability, a stop on a critical hit, a beat of slow time on a kill
    for (const e of events) {
      const u = e.u && b.units.find((x) => x.id === e.u);
      if (e.type === 'cast' && u && (u.team === 'ally' || u.def.boss)) { lean = { x: u.x, y: u.y, t: 0.9 }; slow(0.45, 0.35); }
      else if (e.type === 'hit' && e.crit) hold = Math.max(hold, 0.05);
      else if (e.type === 'proc' && e.big && u) { lean = { x: u.x, y: u.y, t: 0.8 }; slow(0.35, 0.5); }
      else if (e.type === 'wave') slow(0.5, 0.4);
      else if (e.type === 'ko' && u && !u.summoned) { slow(0.5, 0.3); if (u.def.boss) { lean = { x: u.x, y: u.y, t: 1.4 }; slow(0.25, 1.2); } }
    }
    // the camera: towards the middle of the fighters still standing, tighter as fewer remain
    const left = alive('ally').concat(alive('foe')), c = centre(left), n = left.length;
    let tz = fit.zoom * (n <= 2 ? 1.32 : n <= 4 ? 1.18 : n <= 6 ? 1.07 : 1), tx = c.x * 0.55, ty = fit.y + c.y * 0.35;
    if (lean) { lean.t -= dt; const w = Math.min(1, lean.t / 0.3); tx = lerp(tx, lean.x, 0.55 * w); ty = lerp(ty, fit.y + lean.y * 0.6, 0.5 * w); tz *= 1 + 0.22 * w; if (lean.t <= 0) lean = null; }
    const k = 1 - Math.exp(-dt * 3.2);
    camera.zoom = lerp(camera.zoom, tz, k); camera.x = clampX(lerp(camera.x, tx, k), camera.zoom); camera.y = lerp(camera.y, ty, k);
    if (hold > 0) { hold -= dt; out.scale = 0.05; }
    else if (slowT > 0) { slowT -= dt; out.scale = slowK; }
    return out;
  }
  function slow(k, t) { if (slowT <= 0 || k <= slowK) { slowK = k; slowT = Math.max(slowT, t); } }
  // the intro ends at once (a tap, or its last shot): everyone takes up the fight
  function skip() {
    if (!intro) return;
    for (const c of intro.cues) if (!c.done) { c.done = true; pending.push(c[1]); }
    intro = null;
    for (const u of b.units) { delete u.anim; u.actor = false; }
  }
  const pending = [];
  return {
    start, update(dt, events) { const o = update(dt, events); if (pending.length) o.cues.unshift(...pending.splice(0)); return o; },
    skip, get playing() { return playing(); }, camera, slowFinal(u) { if (u) lean = { x: u.x, y: u.y, t: 1.6 }; },
  };
}
