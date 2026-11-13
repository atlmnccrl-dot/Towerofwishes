// Placeholder district (replaced by the full build).
import gate from './gate.js';
export default { ...gate, id: 'foundry', name: 'The Bell Foundry', tagline: '', tier: 5, boss: { ...gate.boss, type: 'founder' }, exit: { ...gate.exit, to: 'heights' } };
