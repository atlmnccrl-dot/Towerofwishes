// Sprite characters: manifests are valid and point at real PNGs; direction, frame and
// crossfade logic. Usage: node test/sprites-test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Sp = require('../js/sprites.js');
const root = path.join(__dirname, '..');

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
    assert.ok(fs.existsSync(path.join(dir, a.sheet)), `${man.id}/${name}: sheet exists`);
    const data = JSON.parse(fs.readFileSync(path.join(dir, a.data), 'utf8'));
    const frames = Sp.parseFrames(data, a.prefix || name);
    assert.ok(Object.keys(frames).length, `${man.id}/${name}: frames named ${a.prefix || name}_<DIR>_<NNN>`);
  }
}
// Eiryn is registered with her official base sprite and no animations until they are delivered.
const eiryn = JSON.parse(fs.readFileSync(path.join(root, 'assets/characters/eiryn/eiryn.json'), 'utf8'));
assert.strictEqual(eiryn.base.image, 'eiryn_base.png');
Sp.register(eiryn, 'assets/characters/eiryn/');
for (const k of ['eiryn', 'eirynAsh', 'eirynMage']) assert.strictEqual(Sp.get(k).id, 'eiryn', `look key ${k} maps to Eiryn`);

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
