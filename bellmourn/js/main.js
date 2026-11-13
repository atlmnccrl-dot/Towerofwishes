// Boot: renderer, weather, effects, actors, UI, input, sound, then the game loop.
import { PixelRenderer, setTargetHeight } from './engine/renderer.js';
import { Atmos } from './engine/atmos.js';
import { FX } from './engine/fx.js';
import { UI } from './engine/ui.js';
import { Input } from './engine/input.js';
import { Sound } from './engine/audio.js';
import { ActorView } from './actors/view.js';
import { Game } from './game/game.js';

const r = new PixelRenderer(document.getElementById('game'));
const atmos = new Atmos(r);
const fx = new FX(r.scene);
const view = new ActorView(r.scene, fx);
const ui = new UI(document.getElementById('ui'), r);
const input = new Input(document.getElementById('ui').previousElementSibling, r);
const sound = new Sound();
input.onAny = () => sound.unlock();
const game = new Game({ r, atmos, fx, view, ui, input, sound });
window.BM = { r, game, ready: false, frames: 0 };
await game.start();
BM.ready = true;
let last = performance.now(); let slowT = 0, targetH = 200;
function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  try { game.update(dt); } catch (e) { console.error(e); }
  BM.frames++; BM.fps = BM.fps ? BM.fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05 : 60;
  // dynamic resolution: on a struggling device use bigger pixels (fewer to shade)
  if (!/HeadlessChrome/.test(navigator.userAgent) && game.state === 'play') {
    slowT = BM.fps < 42 ? slowT + dt : Math.max(0, slowT - dt * 0.5);
    if (slowT > 3 && targetH > 150) { targetH -= 25; setTargetHeight(targetH); r.resize(); slowT = 0; }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'play') game.go('pause'); });
