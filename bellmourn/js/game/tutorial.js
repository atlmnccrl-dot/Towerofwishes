// The training on the Old Road: one step at a time, each with its own instruction for keyboard, touch
// or gamepad, and a check that reads the world's events. The game calls update(dt, events) while playing.

const near = (h, x, z, r) => Math.hypot(h.x - x, h.z - z) < r;

export const STEPS = [
  { id: 'move', key: 'MOVE: WASD OR ARROW KEYS', touch: 'MOVE: DRAG WITH YOUR LEFT THUMB', pad: 'MOVE: LEFT STICK',
    done: (T, g) => g.world.hero.z < 21 },
  { id: 'attack', key: 'ATTACK: J OR LEFT CLICK. CUT BOTH DOWN', touch: 'ATTACK: TAP ATK. CUT BOTH DOWN', pad: 'ATTACK: X. CUT BOTH DOWN',
    enter: (T, g) => { T.mine = [g.world.spawnFoe('hushed', -1.6, 14, { passive: true, rise: true }), g.world.spawnFoe('hushed', 1.8, 13, { passive: true, rise: true })]; },
    done: (T) => T.mine.every((f) => f.dead) },
  { id: 'dash', key: 'DASH: SPACE. DASH THROUGH THE RED TWICE', touch: 'DASH: TAP DASH. DODGE THROUGH THE RED TWICE', pad: 'DASH: A. DODGE THROUGH THE RED TWICE',
    enter: (T, g) => { T.dashes = 0; T.mine = [g.world.spawnFoe('hushed', 0, 6, { aggro: true, rise: true })]; },
    done: (T) => T.dashes >= 2 && T.mine.every((f) => f.dead), note: (T) => `DASHES ${Math.min(2, T.dashes)}/2` },
  { id: 'skills', key: 'SKILLS: K AND L (OR RIGHT CLICK). USE BOTH', touch: 'SKILLS: TAP BOTH SKILL BUTTONS', pad: 'SKILLS: Y AND B. USE BOTH',
    enter: (T, g) => { T.used = [false, false]; T.mine = [-2, 0, 2].map((x) => g.world.spawnFoe('hushed', x, -1, { aggro: true, rise: true })); },
    done: (T) => T.used[0] && T.used[1] },
  { id: 'ult', key: 'THE RED GAUGE IS FULL. ULTIMATE: Q', touch: 'THE RED GAUGE IS FULL. TAP ULT', pad: 'THE RED GAUGE IS FULL. ULTIMATE: RB',
    enter: (T, g) => { g.world.meter = 100; if (T.mine.every((f) => f.dead)) T.mine = [-2, 2].map((x) => g.world.spawnFoe('hushed', x, g.world.hero.z - 4, { aggro: true, rise: true })); },
    done: (T) => T.ulted },
  { id: 'clear', key: 'FINISH THEM. A REELING FOE CAN BE FINISHED.', touch: 'FINISH THEM. A REELING FOE CAN BE FINISHED.', pad: 'FINISH THEM. A REELING FOE CAN BE FINISHED.',
    done: (T, g) => g.world.foes().length === 0 },
  { id: 'tonic', key: 'YOU ARE HURT. TONIC: R', touch: 'YOU ARE HURT. TAP TON', pad: 'YOU ARE HURT. TONIC: LB',
    enter: (T, g) => { const h = g.world.hero; h.hp = Math.round(h.maxHp * 0.45); }, done: (T) => T.healed },
  { id: 'lamp', key: 'LIGHT THE WARDEN\'S LAMP: E', touch: 'LIGHT THE WARDEN\'S LAMP: TAP USE', pad: 'LIGHT THE WARDEN\'S LAMP: BACK',
    enter: (T, g) => { const P = g.save.heroes[g.save.hero]; P.points += 1; }, done: (T, g) => g.level.lamps.some((l) => l.h.lit) },
  { id: 'menu', key: 'AT A LAMP: SPEND SKILL POINTS, BUY, TRAVEL', touch: 'AT A LAMP: SPEND SKILL POINTS, BUY, TRAVEL', pad: 'AT A LAMP: SPEND SKILL POINTS, BUY, TRAVEL',
    done: (T, g) => g.state === 'play' && T.lampVisited },
  { id: 'go', key: 'THE CITY GATE IS AHEAD. GO.', touch: 'THE CITY GATE IS AHEAD. GO.', pad: 'THE CITY GATE IS AHEAD. GO.', done: () => false },
];

export class Tutorial {
  constructor(game) { this.g = game; this.i = 0; this.t = 0; this.doneT = 0; this.mine = []; this.dashes = 0; this.used = [false, false]; this.ulted = false; this.healed = false; this.lampVisited = false; this.enter(); }
  get step() { return STEPS[this.i]; }
  enter() { const s = this.step; this.t = 0; if (s && s.enter) s.enter(this, this.g); }
  update(dt, events) {
    for (const ev of events) {
      if (ev.type === 'dash') this.dashes++;
      if (ev.type === 'ability') this.used[ev.slot] = true;
      if (ev.type === 'special') this.ulted = true;
      if (ev.type === 'heal') this.healed = true;
    }
    if (this.g.state === 'lamp') this.lampVisited = true;
    this.t += dt; const s = this.step; if (!s) return;
    if (this.doneT > 0) { this.doneT -= dt; if (this.doneT <= 0) { this.i++; this.enter(); } return; }
    if (s.done(this, this.g)) { this.doneT = 0.9; this.g.sound.play('uiOk'); }
  }
  text(mode) { const s = this.step; if (!s) return ''; return mode === 'touch' ? s.touch : (mode === 'pad' ? s.pad : s.key); }
  note() { const s = this.step; return s && s.note ? s.note(this) : ''; }
}
