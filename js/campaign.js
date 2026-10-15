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

  // biome tells the painter what to draw; x, y, r place the land.
  const REGIONS = [
    { id: 'town', name: 'The Western Town', biome: 'town', x: 150, y: 265, r: 95 },
    { id: 'forest', name: 'The Forest Road', biome: 'forest', x: 300, y: 300, r: 85 },
    { id: 'north', name: 'The North Road', biome: 'fields', x: 260, y: 105, r: 95 },
    { id: 'hills', name: 'The Mill and the Quarry', biome: 'hills', x: 470, y: 205, r: 105 },
    { id: 'ruins', name: 'The Old Crossing', biome: 'ruins', x: 470, y: 405, r: 90 },
    { id: 'east', name: 'The Eastern Lands', biome: 'wilds', x: 700, y: 260, r: 150 },
    { id: 'tower', name: 'The Tower', biome: 'tower', x: 925, y: 230, r: 75 },
  ];

  // kind: story | contract | side | dungeon | training | arcade | locked
  // story nodes point at a story chapter (main pointer); others start an episode.
  const NODES = [
    { id: 'prologue', kind: 'story', chapter: 'prologue', region: 'tower', x: 925, y: 200, title: 'The Last Ascent', sub: 'Prologue' },
    { id: 'c1', kind: 'story', chapter: 'c1', region: 'forest', x: 305, y: 300, title: 'The Clearing', sub: 'Chapter One' },
    { id: 'c2', kind: 'story', chapter: 'c2', region: 'town', x: 175, y: 300, title: 'A Town Grown Strange', sub: 'Chapters Two & Three' },
    { id: 'c4', kind: 'story', chapter: 'c4', region: 'town', x: 120, y: 235, title: 'The First Contract', sub: 'Chapter Four' },
    { id: 'yard', kind: 'training', episode: 'yard', region: 'town', x: 70, y: 300, title: 'The Evaluation Yard', sub: 'Training · repeatable' },
    { id: 'gauntlet', kind: 'arcade', episode: 'gauntlet', region: 'town', x: 75, y: 190, title: 'Yard Gauntlet', sub: 'Arcade · endless waves' },
    { id: 'cart', kind: 'contract', episode: 'cart', region: 'north', x: 220, y: 120, title: 'The Missing Supply Cart', sub: 'Guild contract' },
    { id: 'stray', kind: 'contract', episode: 'stray', region: 'north', x: 330, y: 70, title: 'Enough Teeth for Three', sub: 'Guild contract' },
    { id: 'c5', kind: 'story', chapter: 'c5', region: 'hills', x: 480, y: 200, title: 'The Quarry', sub: 'Chapter Five' },
    { id: 'deep', kind: 'dungeon', episode: 'deep', region: 'hills', x: 560, y: 150, title: 'The Deep Passage', sub: 'Dungeon · repeatable' },
    { id: 'crossing', kind: 'side', episode: 'crossing', region: 'ruins', x: 470, y: 400, title: 'The Old Crossing', sub: 'Side story · Eiryn' },
    { id: 'c6', kind: 'locked', chapter: 'c6', region: 'east', x: 700, y: 255, title: 'Beyond the manuscript', sub: 'Chapter Six · awaiting the author' },
  ];

  // Roads between nodes; the three from the Guild are the branch.
  const EDGES = [
    ['c1', 'c2'], ['c2', 'c4'], ['c4', 'yard'], ['c4', 'gauntlet'],
    ['c4', 'cart'], ['cart', 'stray'],
    ['c4', 'c5'], ['c5', 'deep'],
    ['c4', 'crossing'],
    ['c5', 'c6'], ['c6', 'prologue'],
  ];

  const ORDER = ['prologue', 'c1', 'c2', 'c4', 'c5', 'c6'];
  // Where the main story is: the chapter of its current node.
  function storyChapter(Story, st) { return Story.NODES[st.node].chapter; }
  function chapterIndex(ch) { return ORDER.indexOf(ch); }
  function reached(Story, st, ch) { return chapterIndex(storyChapter(Story, st)) >= chapterIndex(ch); }
  function past(Story, st, ch) { return chapterIndex(storyChapter(Story, st)) > chapterIndex(ch); }

  // Why a node is locked (null if open).
  function lockReason(Story, st, n) {
    switch (n.id) {
      case 'yard': case 'gauntlet': case 'cart': return reached(Story, st, 'c4') && (st.seen.c4) ? null : 'Register with the Guild first (Chapter Four)';
      case 'stray': return st.done.cart ? null : 'Finish the missing cart contract';
      case 'crossing':
        if (!(reached(Story, st, 'c4') && st.seen.c4)) return 'Eiryn hasn’t asked yet';
        return (st.flags.trust || 0) > 0 ? null : 'Eiryn doesn’t trust you enough to ask';
      case 'deep': return past(Story, st, 'c5') ? null : 'Clear the quarry first (Chapter Five)';
      case 'c6': return 'Arrives with the next chapters of the book';
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

  return { REGIONS, NODES, EDGES, view, status, lockReason };
});
