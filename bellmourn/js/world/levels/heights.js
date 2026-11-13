// Placeholder district (replaced by the full build).
import gate from './gate.js';
export default { ...gate, id: 'heights', name: 'The Crown Heights', tagline: '', tier: 6, boss: { ...gate.boss, type: 'regent' }, exit: { ...gate.exit, to: 'belfry' } };
