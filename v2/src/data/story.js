// The story's choices: what the company does with each region's boss once its Seal is taken (mercy or
// dread, each leaving a relic that stays for the campaign), which side it takes between the Crown's
// loyalists and the Free Towns (events on the road), and the ending those choices earn. (Proposal: every
// line here is the author's to rewrite.)
export const VERDICTS = {
  r1: { who: 'The Grave Warlord', ask: 'The Warlord lies broken at the barrow gate. Its iron crown is still warm.',
    mercy: { label: 'Lay it to rest', text: 'The company buries it with the old rites of Ashby. The dead of the road lie still.', relic: 'Rites of Ashby', desc: 'Heroes recover 10% more health after every fight.', recover: 0.1 },
    dread: { label: 'Take its war-crown', text: 'Corvin lifts the iron crown. It is heavy, and it fits.', relic: 'The War-Crown', desc: 'Every hero hits 8% harder.', mods: { atk: 0.08 } } },
  r2: { who: 'The Mire Mother', ask: 'The Mire Mother sinks into the black water, slow and old. Her heart still beats under the reeds.',
    mercy: { label: 'Let her sleep', text: 'The company leaves her to the fen. Somewhere in the reeds, something sings a lullaby.', relic: 'Mother\'s Lullaby', desc: 'Heals and shields 15% stronger.', mods: { healPower: 0.15 } },
    dread: { label: 'Cut out her heart', text: 'The heart is cold and still beating in the jar. Nobody sleeps well that night.', relic: 'The Mire Heart', desc: 'Every hero has 10% more health.', mods: { hp: 0.1 } } },
  r3: { who: 'The Roc of Saltreach', ask: 'The great bird lies in the sand, one wing broken. It watches the company and does not cry out.',
    mercy: { label: 'Set the wing and let it fly', text: 'It takes a day to mend. When it rises, the whole of Saltreach looks up.', relic: 'The Roc\'s Blessing', desc: 'Every hero attacks 10% faster.', mods: { spd: 0.1 } },
    dread: { label: 'Take its storm-feathers', text: 'The feathers crackle with lightning long after the bird is still.', relic: 'Storm Feathers', desc: '+8% critical chance for every hero.', mods: { crit: 0.08 } } },
  r4: { who: 'Sir Moraine', ask: 'The Black Knight kneels in the oath hall. His sword is down. He waits for judgement.',
    mercy: { label: 'Forgive him', text: '"Rise, Sir Moraine." He does, and for the first time in a hundred years he weeps.', relic: 'A Knight Forgiven', desc: 'Every hero has 10% more defence.', mods: { def: 0.1 } },
    dread: { label: 'Bind his oath to the company', text: 'He swears again, to the company now, and the oath holds him like chains.', relic: 'The Bound Oath', desc: 'Every special is 15% stronger.', mods: { power: 0.15 } } },
  r5: { who: 'The Rime Colossus', ask: 'The Colossus is cracked through. In its chest, a core of blue ice still glows.',
    mercy: { label: 'Leave the mountain its guardian', text: 'The company walks on. Behind them the ice slowly knits itself back together.', relic: 'The Mountain\'s Patience', desc: 'Heroes start every fight with 20 energy.', mods: { start: 20 } },
    dread: { label: 'Break its core', text: 'The core shatters into a thousand cold shards. The company keeps the largest.', relic: 'Colossus Core', desc: 'Every hero takes 8% less damage.', mods: { dr: 0.08 } } },
  r6: { who: 'Vaelor, the Barrow Wyrm', ask: 'The last dragon of Vael lies among its stolen gold, wounded to death and still breathing.',
    mercy: { label: 'Spare the last dragon', text: 'Vaelor closes its eyes. "You are not what I expected of the living," it says.', relic: 'The Wyrm\'s Gratitude', desc: '+15% experience.', xp: 0.15 },
    dread: { label: 'End it', text: 'The blade comes down. The barrow goes very quiet.', relic: 'The Wyrm\'s Hoard', desc: '+20% gold.', gold: 0.2 } },
};
// the relics a campaign has: what they add
export function relicsOf(story = {}) {
  return Object.entries(story.verdicts || {}).map(([rid, v]) => Object.assign({ region: rid, way: v }, VERDICTS[rid][v]));
}
export function relicMods(story) { const out = {}; for (const r of relicsOf(story)) for (const [k, v] of Object.entries(r.mods || {})) out[k] = (out[k] || 0) + v; return out; }
export const relicSum = (story, key) => relicsOf(story).reduce((a, r) => a + (r[key] || 0), 0);

// events on the road where the company takes a side (expedition.js: crown / free on a choice)
export const FACTION_EVENTS = [
  { id: 'taxmen', title: 'The Crown\'s tax men', text: 'Collectors in the old royal colours, taking the last of a village\'s grain "for the king who will return".',
    choices: [{ text: 'Escort them (they pay you)', gold: 90, crown: 1, note: 'The loyalists will remember the company kindly.' }, { text: 'Send them home empty-handed', heal: 0.1, free: 1, note: 'The village cheers. The Free Towns hear of it.' }] },
  { id: 'banner', title: 'A royal banner in the mud', text: 'The old crowned stag of Vael, trampled into a ditch.',
    choices: [{ text: 'Raise it high', boon: true, crown: 1, note: 'Old soldiers salute as the company passes.' }, { text: 'Leave it where it lies', gold: 40, free: 1 }] },
  { id: 'council', title: 'The town council', text: 'A free town asks the company to settle a quarrel between its council and the old lord\'s steward.',
    choices: [{ text: 'Side with the steward', gold: 110, crown: 1 }, { text: 'Side with the council', item: true, free: 1, note: 'The council pays in steel, not coin.' }] },
  { id: 'heir', title: 'The boy who would be king', text: 'A boy with a tin crown says he is the last heir of Vael. His guards are three old men with pikes.',
    choices: [{ text: 'Swear the company to him', boon: true, crown: 1, note: 'The old men weep. The boy tries very hard not to.' }, { text: 'Give them bread and move on', heal: 0.15, free: 1 }] },
];

// the endings: earned by the company's ways (mercy against dread) and its side (Crown against Free Towns)
export const ENDINGS = {
  crown: { title: 'A Crown Restored', text: 'With the Seals taken and the loyalists behind it, the company carries the heir to the empty throne. Vael has a king again, and the king owes everything to a band of sellswords. Corvin is named Lord Protector. He never quite gets used to the title.' },
  free: { title: 'The Free Roads', text: 'The Seals are broken and nobody sits on the throne. The Free Towns rebuild the roads themselves, and the company that showed mercy where it could rides them as the most welcome guests in Vael. Nobody bows. Everybody waves.' },
  iron: { title: 'The Iron Company', text: 'The company took every crown, heart and core it was offered, and Vael noticed. The roads are safe now, because nobody dares cross the company that walks them. Corvin wears the War-Crown at the fire some nights, and nobody laughs.' },
};
export function endingFor(story = {}) {
  const ways = Object.values(story.verdicts || {}), dread = ways.filter((w) => w === 'dread').length, mercy = ways.length - dread;
  if (dread > mercy) return 'iron';
  return (story.crown || 0) > (story.free || 0) ? 'crown' : 'free';
}
// the road forks: after the first region, the next two can be taken in either order, and so can the two after
export const FORKS = [['r2', 'r3'], ['r4', 'r5']];
