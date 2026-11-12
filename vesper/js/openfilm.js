// THE BLEEDING MOON — the opening's title card. The opening itself is filmed on the arenas in the game's own isometric
// view (2026-11-12, the author: "the 2D angle isn't working at all"; see S.OPENING in js/story.js and the cinematic
// options of the filmed shots in js/tale.js). After its last shot ("Kneel.") this plays the title: the red moon, her on
// the rampart, THE BLEEDING MOON (the built shot of js/intro.js).
(function () {
  const VS = window.VS, I = VS.INTRO, K0 = I.kit, E = VS.EDIT;
  const { clamp } = K0, SH = K0.SH;
  const DUR = { title: 6.6 };
  const built = (name) => {
    const sfx = (I.OPEN_SFX || []).filter((x) => x[0] === name).map((x) => [x[1], x[2], x[3]]);
    return { d: DUR[name], name, sfx, draw(ctx, S, k, T) { SH[name](ctx, S, clamp(T / DUR[name]), T); } };
  };
  I.PARTS = { title: E.film([built('title')], { music: ['title', 'title'], amb: 'wind', titleShot: 'title' }) };
})();
