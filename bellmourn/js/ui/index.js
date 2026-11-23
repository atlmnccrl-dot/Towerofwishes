// Every menu screen, in one visual language (js/ui/kit.js). Each is new XScreen(game), then
// .open(data, handlers), .update(dt, inp) each frame (it calls the handlers), .draw(ui) and .close().
// The data and the handlers follow the shared contract; see each file's header.
export { MapScreen } from './map.js';
export { BoonScreen } from './boonpick.js';
export { EventScreen } from './event.js';
export { ShrineScreen, MerchantScreen } from './shop.js';
export { SummaryScreen } from './summary.js';
export { SelectScreen } from './select.js';
export { TowerScreen, ChallengesScreen, TalentScreen } from './meta.js';
export { CodexScreen } from './codex.js';
export { drawBoonStrip } from './hud.js';
export { drawVignette, SCENE_KEYS } from './vignettes.js';
export { provide, loadData, DATA } from './data.js';

// the owners' data (B's boons and Resonances, D's challenges, A's Bell Tower, talents and mastery curve, C's
// lore) is looked up before the screens are handed out; whatever is missing falls back to the samples
import { loadData } from './data.js';
if (!globalThis.BM_UI_SAMPLE) await loadData(); // the screen test can ask for the samples alone
