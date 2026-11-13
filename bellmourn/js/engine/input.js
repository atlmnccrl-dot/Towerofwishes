// Keyboard, mouse, gamepad and touch, folded into one input frame. Movement is screen-relative
// (up on the stick = up the screen) and converted to world X/Z for the isometric camera.

const S = Math.SQRT1_2;
export function screenToWorld(sx, sy) { return { mx: S * (sx + sy), mz: S * (sy - sx) }; }

const KEYMAP = {
  attack: ['KeyJ'], heavy: ['KeyK'], dash: ['Space', 'ShiftLeft', 'ShiftRight'], parry: ['KeyL', 'KeyF'], heal: ['KeyR', 'KeyH'],
  special: ['KeyQ', 'KeyU'], interact: ['KeyE'], pause: ['Escape', 'KeyP'], confirm: ['Enter', 'Space', 'KeyJ', 'KeyE'], back: ['Escape', 'Backspace'],
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
};

export class Input {
  constructor(canvas, renderer) {
    this.r = renderer; this.down = new Set(); this.pressed = new Set(); this.mouse = { x: 0, y: 0, used: false, l: false, r: false };
    this.touches = new Map(); this.stick = null; this.touchMode = false; this.layout = []; this.btnDown = new Set(); this.btnPressed = new Set(); this.taps = [];
    addEventListener('keydown', (e) => {
      if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); return; }
      this.down.add(e.code); this.pressed.add(e.code); this.touchMode = false; this.lastDevice = 'key';
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (this.onAny) this.onAny();
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => { this.down.clear(); this.mouse.l = this.mouse.r = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    const pos = (e) => { const s = renderer.scale / renderer.dpr; return { x: e.clientX / s, y: e.clientY / s }; };
    addEventListener('mousemove', (e) => { const p = pos(e); this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.used = true; });
    addEventListener('mousedown', (e) => {
      if (this.touchMode && performance.now() - (this.lastTouch || 0) < 800) return;
      const p = pos(e); this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.used = true; this.touchMode = false;
      if (e.button === 0) { this.mouse.l = true; this.pressed.add('Mouse0'); this.taps.push({ x: p.x, y: p.y }); }
      if (e.button === 2) { this.mouse.r = true; this.pressed.add('Mouse2'); }
      if (this.onAny) this.onAny();
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.l = false; if (e.button === 2) this.mouse.r = false; });
    const opt = { passive: false };
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchMode = true; this.lastTouch = performance.now(); for (const t of e.changedTouches) this._tStart(t, pos(t)); if (this.onAny) this.onAny(); }, opt);
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) this._tMove(t, pos(t)); }, opt);
    const end = (e) => { e.preventDefault(); for (const t of e.changedTouches) this._tEnd(t); if (this.onAny) this.onAny(); }; // iOS unlocks audio on touchend
    canvas.addEventListener('touchend', end, opt); canvas.addEventListener('touchcancel', end, opt);
    this.pad = null; this.padPrev = [];
  }

  _btnAt(p) { for (const b of this.layout) if (b.hidden !== true && Math.hypot(p.x - b.x, p.y - b.y) <= b.r + 4) return b; return null; }
  _tStart(t, p) {
    const b = this.playing ? this._btnAt(p) : null;
    if (b) { this.touches.set(t.identifier, { btn: b.id }); this.btnDown.add(b.id); this.btnPressed.add(b.id); return; }
    if (this.playing && p.x < this.r.bw * 0.5 && !this.stick) { this.stick = { id: t.identifier, ox: p.x, oy: p.y, x: p.x, y: p.y }; this.touches.set(t.identifier, { stick: true }); return; }
    this.touches.set(t.identifier, { tap: true }); this.taps.push({ x: p.x, y: p.y });
  }
  _tMove(t, p) {
    const s = this.touches.get(t.identifier); if (!s) return;
    if (s.stick && this.stick) {
      this.stick.x = p.x; this.stick.y = p.y;
      // the base follows a thumb that runs off the edge of the ring
      const dx = p.x - this.stick.ox, dy = p.y - this.stick.oy, d = Math.hypot(dx, dy), R = 26;
      if (d > R) { this.stick.ox = p.x - dx / d * R; this.stick.oy = p.y - dy / d * R; }
    } else if (s.btn) {
      const b = this._btnAt(p);
      if (!b || b.id !== s.btn) { /* keep holding: a thumb that slides off still holds (heavy) */ }
    }
  }
  _tEnd(t) {
    const s = this.touches.get(t.identifier); if (!s) return;
    if (s.stick) this.stick = null;
    if (s.btn) this.btnDown.delete(s.btn);
    this.touches.delete(t.identifier);
  }

  key(name) { return KEYMAP[name].some((k) => this.down.has(k)); }
  hit(name) { return KEYMAP[name].some((k) => this.pressed.has(k)); }

  // Called once per frame. Returns the frame and clears one-shot presses.
  frame() {
    // gamepad
    // some embeds forbid the Gamepad API (it then throws): treat that as no pad
    let pads = []; try { pads = navigator.getGamepads ? navigator.getGamepads() || [] : []; } catch (e) { pads = []; }
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    const gb = (i) => !!(gp && gp.buttons[i] && gp.buttons[i].pressed);
    const gpPressed = (i) => gb(i) && !this.padPrev[i];
    let sx = 0, sy = 0;
    if (this.key('left')) sx -= 1; if (this.key('right')) sx += 1; if (this.key('up')) sy -= 1; if (this.key('down')) sy += 1;
    if (gp) { const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0; if (Math.hypot(ax, ay) > 0.2) { sx = ax; sy = ay; this.touchMode = false; } if (gb(12)) sy = -1; if (gb(13)) sy = 1; if (gb(14)) sx = -1; if (gb(15)) sx = 1; }
    if (this.stick) { const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy; const d = Math.hypot(dx, dy); if (d > 3) { const k = Math.min(1, d / 22); sx = dx / d * k; sy = dy / d * k; } }
    const l = Math.hypot(sx, sy); if (l > 1) { sx /= l; sy /= l; }
    const w = screenToWorld(sx, sy);
    const bp = (id) => this.btnPressed.has(id); const bd = (id) => this.btnDown.has(id);
    const f = {
      mx: w.mx, mz: w.mz, sx, sy,
      attackPressed: this.hit('attack') || this.pressed.has('Mouse0') && !this.uiClick || bp('atk') || gpPressed(2),
      heavyDown: this.key('heavy') || this.mouse.r || bd('hvy') || gb(3),
      heavyPressed: this.hit('heavy') || this.pressed.has('Mouse2') || bp('hvy') || gpPressed(3),
      dashPressed: this.hit('dash') || bp('dsh') || gpPressed(0),
      parryPressed: this.hit('parry') || bp('par') || gpPressed(1),
      healPressed: this.hit('heal') || bp('heal') || gpPressed(4),
      specialPressed: this.hit('special') || bp('art') || gpPressed(5) || gpPressed(7),
      interactPressed: this.hit('interact') || bp('use') || gpPressed(3) && false,
      pausePressed: this.hit('pause') || bp('pause') || gpPressed(9),
      up: this.hit('up') || gpPressed(12), down: this.hit('down') || gpPressed(13), left: this.hit('left') || gpPressed(14), right: this.hit('right') || gpPressed(15),
      confirm: this.hit('confirm') || gpPressed(0) || gpPressed(2), back: this.hit('back') || gpPressed(1),
      taps: this.taps.slice(), mouse: this.mouse.used && !this.touchMode, touch: this.touchMode,
    };
    if (gp) { if (Math.abs(gp.axes[1] || 0) > 0.6 && Math.abs(this.padAxisPrev || 0) <= 0.6) { if (gp.axes[1] < 0) f.up = true; else f.down = true; } this.padAxisPrev = gp.axes[1] || 0; }
    if (this.mouse.used && this.r) f.aim = this.r.unproject(this.mouse.x, this.mouse.y, 0);
    this.pressed.clear(); this.btnPressed.clear(); this.taps = []; this.uiClick = false;
    if (gp) this.padPrev = gp.buttons.map((b) => b.pressed);
    return f;
  }
}
