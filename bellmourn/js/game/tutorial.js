// The training on the Old Road: one step at a time, each with its own instruction for keyboard, touch
// or gamepad, and a check that reads the world's events. The game calls update(dt, events) while playing.
// The road ends at the Haven, whose first visit carries on with a short guide of its own (haven.js).

export const STEPS = [
  { id: 'move', key: 'MOVE: WASD OR ARROW KEYS', touch: 'MOVE: DRAG WITH YOUR LEFT THUMB', pad: 'MOVE: LEFT STICK',
    done: (T, g) => g.world.hero.z < 21 },
  { id: 'attack', key: 'ATTACK: J OR LEFT CLICK. CUT BOTH DOWN', touch: 'ATTACK: TAP ATK. CUT BOTH DOWN', pad: 'ATTACK: X. CUT BOTH DOWN',
    enter: (T, g) => { T.mine = [g.world.spawnFoe('hushed', -1.6, 14, { passive: true, rise: true }), g.world.spawnFoe('hushed', 1.8, 13, { passive: true, rise: true })]; },
    done: (T) => T.mine.every((f) => f.dead) },
  { id: 'dash', key: 'DASH: SPACE. DASH THROUGH THE RED TWICE', touch: 'DASH: TAP DASH. DODGE THROUGH THE RED TWICE', pad: 'DASH: A. DODGE THROUGH THE RED TWICE',
    enter: (T, g) => { T.dashes = 0; T.mine = [g.world.spawnFoe('hushed', 0, 6, { aggro: true, rise: true })]; },
    done: (T) => T.dashes >= 2 && T.mine.every((f) => f.dead), note: (T) => `DASHES ${Math.min(2, T.dashes)}/2` },
  // abilities have no buttons: a ready one (its badge glows) goes off in place of the next attack
  { id: 'abilities', key: 'SKILLS FIRE FROM YOUR ATTACK WHEN THEIR BADGE GLOWS. KEEP ATTACKING', touch: 'SKILLS FIRE FROM ATK WHEN THEIR GOLD BAR GLOWS. KEEP ATTACKING', pad: 'SKILLS FIRE FROM YOUR ATTACK (X) WHEN THEIR BADGE GLOWS',
    enter: (T, g) => { T.used = [false, false]; T.mine = [-2, 0, 2].map((x) => g.world.spawnFoe('hushed', x, -1, { aggro: true, rise: true })); },
    update: (T, g) => { if (T.mine.every((f) => f.dead) && !(T.used[0] && T.used[1])) { const z = g.world.hero.z - 3; T.mine = [-1.6, 1.6].map((x) => g.world.spawnFoe('hushed', x, z, { aggro: true, rise: true })); } },
    done: (T) => T.used[0] && T.used[1], note: (T) => `SKILLS ${T.used.filter(Boolean).length}/2` },
  { id: 'ult', key: 'THE RED GAUGE IS FULL. ULTIMATE: Q', touch: 'THE RED GAUGE IS FULL. TAP ULT', pad: 'THE RED GAUGE IS FULL. ULTIMATE: RB',
    enter: (T, g) => { g.world.meter = 100; if (T.mine.every((f) => f.dead)) T.mine = [-2, 2].map((x) => g.world.spawnFoe('hushed', x, g.world.hero.z - 4, { aggro: true, rise: true })); },
    done: (T) => T.ulted },
  { id: 'clear', key: 'CUT DOWN THE REST. A FOE WHOSE GUARD BREAKS REELS AND TAKES MORE DAMAGE', touch: 'CUT DOWN THE REST. A FOE WHOSE GUARD BREAKS REELS AND TAKES MORE DAMAGE', pad: 'CUT DOWN THE REST. A FOE WHOSE GUARD BREAKS REELS AND TAKES MORE DAMAGE',
    done: (T, g) => g.world.foes().length === 0 },
  { id: 'tonic', key: 'YOU ARE HURT. TONIC: R', touch: 'YOU ARE HURT. TAP TON', pad: 'YOU ARE HURT. TONIC: LB',
    enter: (T, g) => { const h = g.world.hero; h.hp = Math.round(h.maxHp * 0.45); }, done: (T) => T.healed },
  // the lamp is a checkpoint now; the point it gives is spent at the Haven, where the road ends
  { id: 'lamp', key: 'LIGHT THE WARDEN\'S LAMP: E. A LIT LAMP HEALS YOU AND KEEPS YOUR PLACE', touch: 'LIGHT THE WARDEN\'S LAMP: TAP USE. A LIT LAMP HEALS YOU AND KEEPS YOUR PLACE', pad: 'LIGHT THE WARDEN\'S LAMP: BACK. A LIT LAMP HEALS YOU AND KEEPS YOUR PLACE',
    enter: (T, g) => { const P = g.save.heroes[g.save.hero]; P.points += 1; }, done: (T, g) => g.level.lamps.some((l) => l.h.lit) },
  { id: 'go', key: 'THE GATE AHEAD LEADS TO THE HAVEN. GO.', touch: 'THE GATE AHEAD LEADS TO THE HAVEN. GO.', pad: 'THE GATE AHEAD LEADS TO THE HAVEN. GO.', done: () => false },
];

export class Tutorial {
  constructor(game) { this.g = game; this.i = 0; this.t = 0; this.doneT = 0; this.mine = []; this.dashes = 0; this.used = [false, false]; this.ulted = false; this.healed = false; this.enter(); }
  get step() { return STEPS[this.i]; }
  get total() { return STEPS.length; }
  enter() { const s = this.step; this.t = 0; if (s && s.enter) s.enter(this, this.g); }
  update(dt, events) {
    for (const ev of events) {
      if (ev.type === 'dash') this.dashes++;
      if (ev.type === 'ability' && ev.slot >= 0 && ev.slot < 2) this.used[ev.slot] = true;
      if (ev.type === 'special') this.ulted = true;
      if (ev.type === 'drink') this.drank = true;
      if (ev.type === 'heal' && this.drank) this.healed = true;
    }
    this.t += dt; const s = this.step; if (!s) return;
    if (this.doneT > 0) { this.doneT -= dt; if (this.doneT <= 0) { this.i++; this.enter(); } return; }
    if (s.done(this, this.g)) { this.doneT = 0.9; this.g.sound.play('uiOk'); return; }
    if (s.update) s.update(this, this.g);
  }
  text(mode) { const s = this.step; if (!s) return ''; return mode === 'touch' ? s.touch : (mode === 'pad' ? s.pad : s.key); }
  note() { const s = this.step; return s && s.note ? s.note(this) : ''; }
}
