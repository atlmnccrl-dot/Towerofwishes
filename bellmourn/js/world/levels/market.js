// Placeholder district (replaced by the full build).
import gate from './gate.js';
export default { ...gate, id: 'market', name: 'Market', tagline: '', exit: { ...gate.exit, to: 'nave' } };
