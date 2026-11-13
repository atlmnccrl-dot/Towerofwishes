// Placeholder district (replaced by the full build).
import gate from './gate.js';
export default { ...gate, id: 'undercroft', name: 'The Undercroft', tagline: '', tier: 4, boss: { ...gate.boss, type: 'ossuary' }, exit: { ...gate.exit, to: 'foundry' } };
