// Add-on content registry (docs/ASCENT_DESIGN.md): each module imported here registers itself on load, by
// Object.assign into the shared tables (BOSSES2 / BOSS_AI2 from bosses2.js, ENTRANCES / ASCENDED from
// bosses4.js, UNITS / UNIT_AI from units.js, BOSS_LINES from scenes/lines.js ...). Owners append one import line
// each; keep the list in act order.
export const CONTENT = [];
import './units5.js'; // Act V foes (the God's Dream)
import './stages_more.js'; // Act I's and the run's five bosses' stages
import './bosses8.js'; // Act VI: God and His two bells
