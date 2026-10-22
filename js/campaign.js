/*
 * Tower of Wishes — the campaign map: lands, routes, and which missions are
 * open. Pure data and functions over the story state (js/story.js), so it
 * can be tested in Node. js/render/map.js paints it; main.js handles taps.
 *
 * Map space is 1000 x 500 units, west on the left, the Tower far in the
 * east. The western town is the hub; from the Guild the road branches three
 * ways (north road, east to the quarry, south-east to the old crossing).
 * Region names other than the book's places are Proposals.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TowCampaign = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // biome tells the painter what to draw; x, y, r place the land. px: the pixel overworld's
  // ground (js/render/overworld.js). Layout (2026-10-22): one road west to east, the Tower on the
  // eastern edge with its floors stacked up the spire.
  const REGIONS = [
    { id: 'forest', name: 'The Forest Road', biome: 'forest', px: 'forest', x: 70, y: 330, r: 80 },
    { id: 'town', name: 'Ashgate', biome: 'town', px: 'town', x: 185, y: 300, r: 85 },
    { id: 'north', name: 'The North Road', biome: 'fields', px: 'fields', x: 250, y: 105, r: 90 },
    { id: 'hills', name: 'The Mill and the Quarry', biome: 'hills', px: 'hills', x: 385, y: 200, r: 85 },
    { id: 'ruins', name: 'The Old Crossing', biome: 'ruins', px: 'ruins', x: 330, y: 420, r: 70 },
    // The book's road east, after the quarry.
    { id: 'grass', name: 'The Open Grassland', biome: 'fields', px: 'fields', x: 485, y: 310, r: 70 },
    { id: 'shadow', name: 'The Shadow City', biome: 'ruins', px: 'city', x: 565, y: 140, r: 75 },
    { id: 'bleed', name: 'The Road That Bleeds', biome: 'forest', px: 'wilds', x: 645, y: 270, r: 60 },
    { id: 'farms', name: 'The Outer Farms', biome: 'fields', px: 'farms', x: 690, y: 400, r: 65 },
    { id: 'camp', name: 'The Night Camp', biome: 'wilds', px: 'camp', x: 785, y: 355, r: 55 },
    { id: 'frost', name: 'The Frost Road', biome: 'fields', px: 'frost', x: 835, y: 250, r: 55 },
    { id: 'tower', name: 'The Tower', biome: 'tower', px: 'tower', x: 935, y: 220, r: 70 },
  ];

  // kind: story | contract | side | dungeon | training | arcade | locked
  // story nodes point at a story chapter (main pointer); others start an episode.
  const NODES = [
    { id: 'prologue', kind: 'story', chapter: 'prologue', region: 'tower', x: 935, y: 70, title: 'The Last Ascent', sub: 'Prologue' },
    { id: 'c1', kind: 'story', chapter: 'c1', region: 'forest', x: 70, y: 335, title: 'The Clearing', sub: 'Chapter One' },
    { id: 'c2', kind: 'story', chapter: 'c2', region: 'town', x: 160, y: 315, title: 'A Town Grown Strange', sub: 'Chapters Two & Three' },
    { id: 'c4', kind: 'story', chapter: 'c4', region: 'town', x: 220, y: 250, title: 'The First Contract', sub: 'Chapter Four' },
    { id: 'yard', kind: 'training', episode: 'yard', region: 'town', x: 135, y: 390, title: 'The Evaluation Yard', sub: 'Training · repeatable' },
    { id: 'gauntlet', kind: 'arcade', episode: 'gauntlet', region: 'town', x: 215, y: 400, title: 'Yard Gauntlet', sub: 'Arcade · endless waves' },
    { id: 'cart', kind: 'contract', episode: 'cart', region: 'north', x: 200, y: 140, title: 'The Missing Supply Cart', sub: 'Guild contract' },
    { id: 'toll', kind: 'contract', episode: 'toll', region: 'hills', x: 330, y: 135, title: 'The Toll Bridge', sub: 'Guild contract' },
    { id: 'orchard', kind: 'contract', episode: 'orchard', region: 'north', x: 245, y: 45, title: 'Wolves in the Orchard', sub: 'Guild contract' },
    { id: 'warren', kind: 'contract', episode: 'warren', region: 'hills', x: 420, y: 270, title: 'The Skeleton Warren', sub: 'Guild contract · after the quarry' },
    { id: 'stray', kind: 'contract', episode: 'stray', region: 'north', x: 290, y: 90, title: 'Enough Teeth for Three', sub: 'Guild contract' },
    { id: 'c5', kind: 'story', chapter: 'c5', region: 'hills', x: 390, y: 205, title: 'The Quarry', sub: 'Chapter Five' },
    { id: 'deep', kind: 'dungeon', episode: 'deep', region: 'hills', x: 445, y: 140, title: 'The Deep Passage', sub: 'Dungeon · repeatable' },
    { id: 'crossing', kind: 'side', episode: 'crossing', region: 'ruins', x: 330, y: 415, title: 'The Old Crossing', sub: 'Side story · Eiryn' },
    { id: 'hire', kind: 'side', episode: 'hire', region: 'town', x: 265, y: 330, title: 'Three for Hire', sub: 'Tavern · pick a companion' },
    { id: 'c6', kind: 'story', chapter: 'c6', region: 'grass', x: 485, y: 300, title: 'The Sky That Hunts', sub: 'Chapter Six' },
    { id: 'c7', kind: 'story', chapter: 'c7', region: 'shadow', x: 565, y: 150, title: 'The Shadow City', sub: 'Chapter Seven' },
    { id: 'c8', kind: 'story', chapter: 'c8', region: 'bleed', x: 645, y: 265, title: 'The Road That Bleeds', sub: 'Chapter Eight' },
    { id: 'c9', kind: 'story', chapter: 'c9', region: 'farms', x: 690, y: 390, title: 'A Name on a Page', sub: 'Chapter Nine' },
    { id: 'c10', kind: 'story', chapter: 'c10', region: 'camp', x: 780, y: 350, title: 'The Night Creature', sub: 'Chapter Ten' },
    { id: 'c11', kind: 'story', chapter: 'c11', region: 'frost', x: 835, y: 255, title: 'The Road That Learns You', sub: 'Chapters Ten & Eleven' },
    { id: 'c12', kind: 'story', chapter: 'c12', region: 'tower', x: 935, y: 330, title: 'The Hall of Frost and Mist', sub: 'Floor One' },
    { id: 'c13', kind: 'story', chapter: 'c13', region: 'tower', x: 935, y: 265, title: 'Calamity', sub: 'Floor Two' },
    { id: 'c14', kind: 'story', chapter: 'c14', region: 'tower', x: 935, y: 200, title: 'The Hall of Offering', sub: 'Floor Three' },
    { id: 'c15', kind: 'locked', chapter: 'c15', region: 'tower', x: 935, y: 135, title: 'Floor Four', sub: 'Beyond the manuscript · awaiting the author' },
  ];

  // The river the road crosses (the Toll Bridge sits on it), north to south.
  const RIVER = [[310, -10], [325, 110], [300, 230], [345, 330], [320, 510]];

  // Roads between nodes; the three from the Guild are the branch.
  const EDGES = [
    ['c1', 'c2'], ['c2', 'c4'], ['c4', 'yard'], ['c4', 'gauntlet'],
    ['c4', 'cart'], ['cart', 'stray'], ['c4', 'toll'], ['stray', 'orchard'], ['c5', 'warren'],
    ['c4', 'c5'], ['c5', 'deep'],
    ['c4', 'crossing'],
    ['c4', 'hire'],
    ['c5', 'c6'], ['c6', 'c7'], ['c7', 'c8'], ['c8', 'c9'], ['c9', 'c10'], ['c10', 'c11'],
    ['c11', 'c12'], ['c12', 'c13'], ['c13', 'c14'], ['c14', 'c15'], ['c15', 'prologue'],
  ];

  const ORDER = ['prologue', 'c1', 'c2', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15'];
  // Where the main story is: the chapter of its current node.
  function storyChapter(Story, st) { return Story.NODES[st.node].chapter; }
  function chapterIndex(ch) { return ORDER.indexOf(ch); }
  function reached(Story, st, ch) { return chapterIndex(storyChapter(Story, st)) >= chapterIndex(ch); }
  function past(Story, st, ch) { return chapterIndex(storyChapter(Story, st)) > chapterIndex(ch); }

  // Why a node is locked (null if open).
  function lockReason(Story, st, n) {
    // Contracts are tuned for three: Kael, Eiryn and a companion (or a book hero).
    const three = Story.roster(st).length >= 3;
    switch (n.id) {
      case 'cart': case 'stray': case 'crossing': case 'deep': case 'toll': case 'orchard': case 'warren': {
        const r = baseLock(Story, st, n);
        return r || (three ? null : 'Hire a companion at the tavern first (Three for Hire)');
      }
      default: return baseLock(Story, st, n);
    }
  }
  function baseLock(Story, st, n) {
    switch (n.id) {
      case 'yard': case 'gauntlet': case 'cart': case 'hire': case 'toll': return reached(Story, st, 'c4') && (st.seen.c4) ? null : 'Register with the Guild first (Chapter Four)';
      case 'stray': return st.done.cart ? null : 'Finish the missing cart contract';
      case 'orchard': return st.done.stray ? null : 'Finish “Enough Teeth for Three” first';
      case 'warren': return past(Story, st, 'c5') ? null : 'Clear the quarry first (Chapter Five)';
      case 'crossing':
        if (!(reached(Story, st, 'c4') && st.seen.c4)) return 'Eiryn hasn’t asked yet';
        return (st.flags.trust || 0) > 0 ? null : 'Eiryn doesn’t trust you enough to ask';
      case 'deep': return past(Story, st, 'c5') ? null : 'Clear the quarry first (Chapter Five)';
      case 'c15': return 'Arrives with the next chapters of the book';
      default:
        if (n.kind === 'story') return reached(Story, st, n.chapter) ? null : 'Not reached yet';
        return null;
    }
  }

  // done | current | open | locked
  function status(Story, st, n) {
    if (n.kind === 'story') {
      if (n.id === 'prologue') return past(Story, st, 'prologue') ? 'done' : 'current';
      if (past(Story, st, n.chapter)) return 'done';
      if (storyChapter(Story, st) === n.chapter) return 'current';
      return 'locked';
    }
    if (lockReason(Story, st, n)) return 'locked';
    const ep = Story.EPISODES[n.episode];
    if (st.done[n.episode] && !(ep && ep.repeat)) return 'done';
    return 'open';
  }

  // Everything the painter and the UI need, for this save.
  function view(Story, st) {
    const nodes = NODES.map((n) => Object.assign({}, n, { status: status(Story, st, n), lock: lockReason(Story, st, n), best: n.episode ? st.best[Story.EPISODES[n.episode].from] || 0 : 0, cleared: n.episode ? st.done[n.episode] || 0 : 0 }));
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    // A land is revealed once any of its nodes is open, current or done.
    const regions = REGIONS.map((r) => Object.assign({}, r, { revealed: r.id === 'tower' || nodes.some((n) => n.region === r.id && n.status !== 'locked') }));
    const edges = EDGES.map(([a, b]) => ({ a, b, open: byId[a].status !== 'locked' && byId[b].status !== 'locked', side: byId[b].kind !== 'story' && byId[b].kind !== 'locked' }));
    const current = nodes.find((n) => n.status === 'current' && n.id !== 'prologue') || null;
    return { regions, nodes, edges, current: current ? current.id : null };
  }

  return { REGIONS, NODES, EDGES, RIVER, ORDER, view, status, lockReason };
});
