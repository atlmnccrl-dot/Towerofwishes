// THE BLEEDING MOON — the opening's title (2026-11-11). The opening's story is a film shot on the game's own arenas with
// the game's own cast (js/story.js S.OPEN, played by tale.js): the Spire's five kingdoms, the white Moon and the five
// kings, the Kingslayer killing them, the First Cut that wounds the Moon, the dead rising, the kings chained inside the
// guardians, the last night, Vesper's climb and the summit. This file keeps the built title shot of js/intro.js that
// ends it: the red moon, her on the rampart, THE BLEEDING MOON.
(function () {
  const VS = window.VS, I = VS.INTRO, K0 = I.kit, E = VS.EDIT;
  const { clamp } = K0, SH = K0.SH;
  const DUR = { title: 6.6 };
  // A built shot of intro.js, played from `from` seconds for d seconds (its own timing kept), with its sounds.
  const built = (name, d, from, o) => {
    from = from || 0; d = d || DUR[name] - from;
    const sfx = (I.OPEN_SFX || []).filter((x) => x[0] === name && x[1] >= from && x[1] < from + d).map((x) => [x[1] - from, x[2], x[3]]);
    return Object.assign({ d, name: from ? name + '@' + from : name, sfx, draw(ctx, S, k, T) { const t = from + T; SH[name](ctx, S, clamp(t / DUR[name]), t); } }, o || {});
  };
  const OPT = { music: ['title', 'title'], amb: 'wind', titleShot: 'title' };   // the title's own music when the title lands
  I.PARTS = { title: E.film([built('title')], OPT) };
  I.OPENING = I.PARTS.title;   // (I.start: the title alone; main.js startIntro plays the whole opening)
})();
