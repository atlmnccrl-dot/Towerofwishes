// Boss phases: at half health a boss transforms. It roars (a moment it cannot be hurt into or act),
// shields itself, grows fiercer, calls reinforcements, turns the field against the company (a hazard)
// and from then on winds up a huge attack on the company every few seconds: a wide warning ring, then the
// blow (the company steps out of it if it can). (Proposal: names, lines and numbers.)
//   line: what is shouted at the change; adds: who answers the call; hazard: the field's new danger;
//   super: [name, effect] of the wound-up attack
export const PHASES = {
  chief: { title: 'Garrow is not alone', line: 'Lads! To me!', adds: ['thug', 'slinger'], hazard: null, super: ['Cleaver Storm', 'cross_slash'] },
  golem: { title: 'The Hollow Golem wakes fully', line: '...', adds: ['risen', 'risen'], hazard: 'rockfall', super: ['Earthfall', 'rock_burst'] },
  warlord: { title: 'The dead answer the Warlord', line: 'RISE. ALL OF YOU.', adds: ['risen', 'pikeman'], hazard: 'fire', super: ['Grave Slam', 'shockwave'] },
  mire: { title: 'The Mire Mother births her brood', line: 'Feed, my children.', adds: ['ghoul', 'hound'], hazard: 'lightning', super: ['Drowning Tide', 'water_splash'] },
  roc: { title: 'The Roc takes to the storm', line: 'SCREEEE!', adds: ['slinger', 'duelist'], hazard: 'lightning', super: ['Thunder Dive', 'bolt_strike'] },
  blackknight: { title: 'The oath burns black', line: 'My oath does not break!', adds: ['revenant', 'templar'], hazard: 'fire', super: ['Oathfall', 'dark_slash'] },
  colossus: { title: 'The mountain answers the Colossus', line: '*the ice groans*', adds: ['wolf', 'wolf'], hazard: 'rockfall', super: ['Avalanche', 'frost_nova'] },
  herald: { title: 'The Herald calls the grave', line: 'Come back to me. All of you.', adds: ['revenant', 'shade'], hazard: 'lightning', super: ['Last Rites', 'dark_curse'] },
  hollowking: { title: 'The crown remembers its king', line: 'KNEEL.', adds: ['templar', 'templar'], hazard: 'fire', super: ['Crown of Ruin', 'fire_ring'] },
  wyrm: { title: 'Vaelor wakes the hoard', line: 'YOU WILL BURN WITH THE REST.', adds: ['revenant', 'shade'], hazard: 'fire', super: ['Hoardfire', 'fireball_big'] },
};
export const SUPER_EVERY = 9, SUPER_WARN = 2.0, SUPER_RADIUS = 2.6, SUPER_HIT = 0.32;
