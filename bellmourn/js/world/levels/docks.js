// Placeholder district (replaced by the full build).
import gate from './gate.js';
export default { ...gate, id: 'docks', name: 'Mirewater Docks', tagline: '', tier: 2, boss: { ...gate.boss, type: 'harbormaster' }, exit: { ...gate.exit, to: 'nave' } };
