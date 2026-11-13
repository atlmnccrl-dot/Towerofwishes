// Placeholder district (replaced by the full build).
import gate from './gate.js';
export default { ...gate, id: 'belfry', name: 'Belfry', tagline: '', exit: { ...gate.exit, to: 'end' } };
