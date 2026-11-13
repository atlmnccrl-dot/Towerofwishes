// Boot: renderer, weather, effects, actors, UI, input, sound, then the game loop.
import { PixelRenderer } from './engine/renderer.js';
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
const game = new Game({ r, atmos, fx, view, ui, input, sound });
window.BM = { r, game, ready: false, frames: 0 };
await game.start();
BM.ready = true;
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  try { game.update(dt); } catch (e) { console.error(e); }
  BM.frames++; BM.fps = BM.fps ? BM.fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05 : 60;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'play') game.go('pause'); });
