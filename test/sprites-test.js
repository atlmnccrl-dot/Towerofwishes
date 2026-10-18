// Sprite characters: manifests are valid and point at real PNGs; direction, frame and
// crossfade logic. Usage: node test/sprites-test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Sp = require('../js/sprites.js');
const root = path.join(__dirname, '..');

// Width, height and whether there is an alpha channel, for PNG or WebP.
function imgSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF') return pngSize(file);
  assert.strictEqual(b.toString('ascii', 8, 12), 'WEBP', file + ' is a WebP');
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), alpha: !!(b[20] & 0x10) };
  if (kind === 'VP8L') { const n = b.readUInt32LE(21); return { w: 1 + (n & 0x3fff), h: 1 + ((n >> 14) & 0x3fff), alpha: !!((n >> 28) & 1) }; }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, alpha: false };
}
function pngSize(file) {
  const b = fs.readFileSync(file);
  assert.strictEqual(b.toString('ascii', 1, 4), 'PNG', file + ' is a PNG');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: b[25] === 6 || b[25] === 4 };
}

// Every manifest: base sprite exists, size and anchor match, animations reference real files.
for (const rel of Sp.MANIFESTS) {
  const file = path.join(root, rel), dir = path.dirname(file);
  const man = JSON.parse(fs.readFileSync(file, 'utf8'));
  const base = pngSize(path.join(dir, man.base.image));
  assert.ok(base.alpha, `${man.id}: base sprite has transparency`);
  assert.deepStrictEqual([base.w, base.h], man.base.size, `${man.id}: base size matches the manifest`);
  assert.ok(man.base.anchor[0] > 0 && man.base.anchor[0] < base.w && man.base.anchor[1] > 0 && man.base.anchor[1] <= base.h, `${man.id}: anchor inside the image`);
  assert.ok(man.base.figureHeightPx > 0 && man.base.figureHeightPx <= base.h);
  for (const d of man.directions) assert.ok(Sp.DIRS.includes(d), `${man.id}: direction ${d}`);
  for (const [name, a] of Object.entries(man.animations)) {
    const dirs = new Set();
    for (const sh of a.sheets || [a]) {
      const tag = `${man.id}/${name}/${sh.dir || '?'}`;
      assert.ok(fs.existsSync(path.join(dir, sh.sheet)), `${tag}: sheet exists`);
      const data = JSON.parse(fs.readFileSync(path.join(dir, sh.data), 'utf8'));
      const frames = Sp.parseFrames(data, sh.prefix || a.prefix || name, sh.dir || a.dir);
      assert.ok(Object.keys(frames).length, `${tag}: frames named ${name}_<DIR>_<NNN> (or _<NNN> with "dir")`);
      for (const d of Object.keys(frames)) { assert.ok(!dirs.has(d), `${tag}: direction ${d} given once`); dirs.add(d); }
      // The shipped sheet is the JSON's sheet scaled by sheetScale.
      const ss = sh.sheetScale || a.sheetScale || 1, sheet = imgSize(path.join(dir, sh.sheet)), meta = data.meta && data.meta.size;
      if (meta) assert.deepStrictEqual([sheet.w, sheet.h], [Math.floor(meta.w * ss), Math.floor(meta.h * ss)], `${tag}: sheet size`);
      assert.ok(sheet.alpha, `${tag}: transparent sheet`);
      for (const fr of Object.values(frames)) for (const f of fr) assert.ok((f.x + f.w) * ss <= sheet.w + 0.5 && (f.y + f.h) * ss <= sheet.h + 0.5, `${tag}: frame inside the sheet`);
      // Phased clips (attacks): wind-up, hit and recover ranges lie inside the frames, in order.
      if (a.phases) {
        const n = Math.max(...Object.values(frames).map((f) => f.length));
        const { windup, strike, recover } = a.phases;
        for (const r of [windup, strike, recover]) assert.ok(r[0] <= r[1] && r[1] < n, `${tag}: phase range ${r} inside ${n} frames`);
        assert.ok(windup[1] <= strike[0] + 1 && strike[1] <= recover[0], `${tag}: phases in order`);
        if (a.hitFrame != null) assert.ok(a.hitFrame >= strike[0] && a.hitFrame <= strike[1], `${tag}: hit frame within the strike`);
      }
      const an = sh.anchor || a.anchor;
      if (an) assert.ok(an[0] > 0 && an[1] > 0 && (sh.figureHeightPx || a.figureHeightPx) > 0, `${tag}: anchor and figure height`);
    }
  }
}
// Eiryn is registered with her official base sprite and no animations until they are delivered.
const eiryn = JSON.parse(fs.readFileSync(path.join(root, 'assets/characters/eiryn/eiryn.json'), 'utf8'));
assert.strictEqual(eiryn.base.image, 'eiryn_base.png');
Sp.register(eiryn, 'assets/characters/eiryn/');
for (const k of ['eiryn', 'eirynAsh', 'eirynMage']) assert.strictEqual(Sp.get(k).id, 'eiryn', `look key ${k} maps to Eiryn`);

// Her front-facing walk (delivered 2026-10-18): 36 frames, 59 ms each, looping.
{
  const w = eiryn.animations.walk, ws = w.sheets.find((x) => x.dir === 'S');
  assert.ok(ws && w.loop !== false, 'walk registered, front view, loops');
  assert.deepStrictEqual(w.sheets.map((x) => x.dir).sort(), ['E', 'S', 'SE', 'SW'], 'walk drawn front, both front diagonals, side');
  assert.ok(eiryn.animations.run.sheets.some((x) => x.dir === 'S'), 'run drawn from the front');
  const fr = Sp.parseFrames(JSON.parse(fs.readFileSync(path.join(root, 'assets/characters/eiryn', ws.data), 'utf8')), 'walk', 'S').S;
  assert.strictEqual(fr.length, 36);
  assert.ok(fr.every((f) => Math.abs(f.dur - 0.059) < 1e-9), 'timings from the JSON');
  assert.deepStrictEqual(fr.map((f) => f.n), [...Array(36).keys()], 'frames in order');
  assert.strictEqual(Sp.frameIndex(w, 36, 0.06, fr), 1);
  assert.strictEqual(Sp.frameIndex(w, 36, 36 * 0.059 + 0.01, fr), 0, 'wraps round smoothly');
  assert.strictEqual(Sp.animFor(eiryn, 'move'), 'run');
  assert.strictEqual(Sp.animFor(eiryn, 'attack'), 'attack', 'her Pressure attack is registered');
}

// Running sideways uses the side walk when the run isn't drawn that way; the front run when it is.
{
  const m = { mirror: { W: 'E', SW: 'SE', NW: 'NE' }, animations: { run: { frames: { S: [1] } }, walk: { frames: { S: [1], E: [1], SE: [1] } } } };
  assert.strictEqual(Sp.pickAnim(m, ['run', 'walk'], 'S'), 'run');
  assert.strictEqual(Sp.pickAnim(m, ['run', 'walk'], 'W'), 'walk', 'W is the side walk mirrored');
  assert.strictEqual(Sp.pickAnim(m, ['run', 'walk'], 'N'), 'run', 'nothing drawn: the first that exists');
}

// Directions: facing the camera is S; the camera's turn is taken into account.
const H = Math.PI / 2;
assert.strictEqual(Sp.dirFor(H, 0), 'S');
assert.strictEqual(Sp.dirFor(-H, 0), 'N');
assert.strictEqual(Sp.dirFor(0, 0), 'E');
assert.strictEqual(Sp.dirFor(Math.PI, 0), 'W');
assert.strictEqual(Sp.dirFor(H / 2, 0), 'SE');
assert.strictEqual(Sp.dirFor(0, H), 'S', 'camera turned a quarter: east-facing is seen from the front');

// Frames, mirroring and crossfades (on a made-up test animation, not shipped).
const data = { frames: {} };
for (const d of ['S', 'SE', 'E']) for (let i = 0; i < 4; i++) data.frames[`walk_${d}_${String(i).padStart(3, '0')}.png`] = { frame: { x: i * 10, y: 0, w: 10, h: 20 }, spriteSourceSize: { x: 1, y: 2 }, sourceSize: { w: 12, h: 22 } };
const fr = Sp.parseFrames(data, 'walk');
assert.deepStrictEqual(Object.keys(fr).sort(), ['E', 'S', 'SE']);
assert.strictEqual(fr.S.length, 4);
const man = { id: 't', base: eiryn.base, mirror: { W: 'E', SW: 'SE', NW: 'NE' }, blend: 0.1,
  animations: { walk: { fps: 10, frames: fr }, idle: { fps: 10, frames: { S: fr.S } }, turn: { fps: 10, loop: false, frames: { S: fr.S.slice(0, 2) } } },
  transitions: { 'idle>walk': 'turn' } };
assert.deepStrictEqual(Sp.resolveDir(man, man.animations.walk, 'W'), { dir: 'E', flip: true });
assert.deepStrictEqual(Sp.resolveDir(man, man.animations.walk, 'SW'), { dir: 'SE', flip: true });
assert.strictEqual(Sp.resolveDir(man, man.animations.walk, 'N').flip !== undefined, true, 'N falls back to a drawn direction');
assert.strictEqual(Sp.frameIndex({ fps: 10 }, 4, 0.55), 1);
assert.strictEqual(Sp.frameIndex({ fps: 10, loop: false }, 4, 9), 3);
assert.strictEqual(Sp.animFor(man, 'move'), 'walk');
assert.strictEqual(Sp.animFor({ animations: {} }, 'move'), null, 'no animation: keep the current body');
const A = Sp.animator(man);
Sp.play(A, 'idle');
assert.strictEqual(Sp.sample(A, 'S').length, 1);
Sp.play(A, 'walk');
assert.strictEqual(A.cur, 'turn', 'transition clip plays first');
Sp.advance(A, 0.05);
let s = Sp.sample(A, 'S');
assert.strictEqual(s.length, 2, 'crossfading out of idle');
assert.ok(Math.abs(s[0].alpha + s[1].alpha - 1) < 1e-9);
Sp.advance(A, 0.3);
assert.strictEqual(A.cur, 'walk', 'then the target animation');
Sp.advance(A, 0.2);
s = Sp.sample(A, 'W');
assert.strictEqual(s.length, 1);
assert.strictEqual(s[0].flip, true);

console.log('sprites ok');
