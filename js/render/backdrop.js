/* Placeholder: full-screen story backdrops (replaced by the painted version). */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});
  NS.backdrop = {
    NAMES: ['tower'],
    create(canvas) {
      const ctx = canvas.getContext('2d');
      return {
        draw(bg, t) {
          const w = canvas.width, h = canvas.height;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          const g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, '#43171b'); g.addColorStop(1, '#0c0808');
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        },
      };
    },
  };
})();
