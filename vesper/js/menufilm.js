// THE BLEEDING MOON — the main menu's scene (2026-11-12). Until the cast and the Black Gate's tiles have streamed in, the
// menu plays the loading screen's walk (js/loadscene.js); then it dips through black into its own film (S.MENU in
// js/story.js, played by js/tale.js): she keeps watch, cuts down the dead, and the Gatewarden walks out of the storm.
// The film loops. A soft dark band on the left keeps the menu readable.
(function () {
  const VS = window.VS, R = VS.R, A = VS.A, D = VS.DATA, S = VS.STORY, T = VS.TALE;
  const MF = VS.MENUFILM = { sc: null, phase: 0, f: 0 };
  function ready() {
    const M = VS.main; if (!M || !M.bgDone || !S.MENU) return false;
    const iso = M.isoFor ? M.isoFor(0) : null; if (iso && A.isoReady && !A.isoReady(iso)) return false;
    return S.MENU.shots.every((sh) => (sh.cast || []).every((c) => c.who === 'hero' || A.hasSet(c.set || D.FOES[c.who].set)));
  }
  MF.reset = function () { MF.sc = null; MF.phase = 0; MF.f = 0; };
  MF.draw = function (ctx, dt) {
    // phase 0: the walk; 1: it dips to black; 2: the film rises out of black and loops.
    if (MF.phase === 0 && ready()) MF.phase = 1, MF.f = 0;
    MF.f += dt;
    if (MF.phase < 2) {
      VS.LOADSCENE.draw(ctx, dt, null);
      if (MF.phase === 1) { const a = Math.min(1, MF.f / 0.6); ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, R.W, R.H); if (a >= 1) MF.phase = 2, MF.f = 0; }
    } else {
      if (!MF.sc || MF.sc.done) MF.sc = T.start(S.MENU);
      T.update(MF.sc, dt, {}); MF.sc.cues.length = 0;
      ctx.save(); T.draw(ctx, MF.sc); ctx.restore();
      if (MF.f < 0.9) { ctx.fillStyle = `rgba(0,0,0,${1 - MF.f / 0.9})`; ctx.fillRect(0, 0, R.W, R.H); }
    }
    // The air over the film: the moon's red light from the top right, ash and embers.
    if (MF.phase === 2) {
      const t = (MF.t = (MF.t || 0) + dt);
      const g0 = ctx.createRadialGradient(R.W * 0.85, -R.H * 0.1, 0, R.W * 0.85, -R.H * 0.1, R.H * 1.1); g0.addColorStop(0, 'rgba(255,40,70,0.1)'); g0.addColorStop(1, 'rgba(255,40,70,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g0; ctx.fillRect(0, 0, R.W, R.H); ctx.restore();
      VS.LOADSCENE.air(ctx, t, R.W * 0.62, 0.8);
    }
    // The menu's side: a soft dark band from the left edge.
    const g = ctx.createLinearGradient(0, 0, R.W * 0.5, 0); g.addColorStop(0, 'rgba(3,1,5,0.78)'); g.addColorStop(0.6, 'rgba(3,1,5,0.28)'); g.addColorStop(1, 'rgba(3,1,5,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, R.W * 0.5, R.H);
  };
})();
