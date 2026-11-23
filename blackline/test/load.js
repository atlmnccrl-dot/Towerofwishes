// Loads the pure game modules into Node (they attach to globalThis.BL).
const path = require('path');
for (const f of ['util', 'data', 'map', 'sim', 'ai', 'campaign']) require(path.join(__dirname, '..', 'js', f + '.js'));
module.exports = globalThis.BL;
