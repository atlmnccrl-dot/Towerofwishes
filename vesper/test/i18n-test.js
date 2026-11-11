// Languages (js/i18n.js and the tables): every table built from the same keys, numbers kept, templates, item names,
// composite labels, names that must stay as they are. Usage: node vesper/test/i18n-test.js
const { execSync } = require('child_process'); let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
execSync('python3 ' + __dirname + '/../tools_lang/build.py', { stdio: 'pipe' });   // fails (throws) if a table is out of line
globalThis.window = globalThis; globalThis.VS = {}; require('../js/i18n.js'); const I = VS.I18N;
for (const c of ['es', 'pt', 'fr', 'de']) {
  require('../js/i18n_' + c + '.js'); I.set(c);
  ok(I.t('Level 12') !== 'Level 12' && /12/.test(I.t('Level 12')), c + ' number template');
  ok(I.t('Thirsting Iron Spear of Fortune') !== 'Thirsting Iron Spear of Fortune', c + ' item name');
  ok(/·/.test(I.t('Weapon · lv 3')) && I.t('Weapon · lv 3') !== 'Weapon · lv 3', c + ' composite');
  ok(I.t('CLEAR EVERY WAVE') === I.t('CLEAR EVERY WAVE').toUpperCase(), c + ' caps stay caps');
  ok(I.t('The Bleeding Moon') === 'The Bleeding Moon' && I.t('Vesper') === 'Vesper', c + ' names untouched');
  ok(I.t('zzz unknown line') === 'zzz unknown line', c + ' unknown stays English');
  ok(I.t('  Back  ').startsWith('  ') && I.t('  Back  ').endsWith('  '), c + ' spacing kept');
}
I.set('en'); ok(I.t('Level 12') === 'Level 12', 'english untouched');
console.log(fails ? fails + ' failures' : 'languages sound'); process.exit(fails ? 1 : 0);
