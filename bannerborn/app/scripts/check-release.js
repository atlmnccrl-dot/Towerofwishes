// What still stands between this folder and a store build. Run before every release:
//   node scripts/check-release.js
// It reads the game's config and the native projects and lists what is still a placeholder.
const fs = require('fs'), path = require('path');
const app = path.resolve(__dirname, '..'), root = path.resolve(app, '..');
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
const TEST_APP = /ca-app-pub-3940256099942544/; // Google's public test publisher
const todo = [], ok = [];
const say = (good, text) => (good ? ok : todo).push(text);

const cfg = read(path.join(root, 'js', 'config.js')) || '';
say(/testAds:\s*false/.test(cfg), 'js/config.js: testAds is false (real ads)');
say(!TEST_APP.test(cfg), 'js/config.js: your own AdMob ad unit ids (rewarded and interstitial, Android and iOS)');
say(!/privacy:\s*''/.test(cfg), 'js/config.js: links.privacy points at your hosted privacy policy');
say(!/terms:\s*''/.test(cfg), 'js/config.js: links.terms points at your hosted terms');

const cap = JSON.parse(read(path.join(app, 'capacitor.config.json')) || '{}');
say(cap.appId && cap.appId !== 'com.bannerborn.game', 'capacitor.config.json: appId is your own (it can never change after the first upload)');

const man = read(path.join(app, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'));
if (!man) todo.push('android/: not generated yet (npx cap add android)');
else {
  say(/com\.google\.android\.gms\.ads\.APPLICATION_ID/.test(man), 'AndroidManifest.xml: has the AdMob application id entry');
  const strings = read(path.join(app, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml')) || '';
  say(/admob_app_id/.test(strings) && !TEST_APP.test(strings) && !TEST_APP.test(man), 'android res/values/strings.xml: admob_app_id is your own AdMob app id (not Google\'s test id)');
  say(/sensorLandscape/.test(man), 'AndroidManifest.xml: landscape only');
}
const gradle = read(path.join(app, 'android', 'app', 'build.gradle'));
if (gradle) say(!/applicationId\s+"com\.bannerborn\.game"/.test(gradle), 'android/app/build.gradle: applicationId is your own');
say(fs.existsSync(path.join(app, 'android', 'keystore.properties')) || !!process.env.BANNERBORN_KEYSTORE, 'android: an upload key for signing (keystore.properties, never committed)');

const plist = read(path.join(app, 'ios', 'App', 'App', 'Info.plist'));
if (!plist) todo.push('ios/: not generated yet (on a Mac: npx cap add ios, then apply ios-Info.additions.plist)');
else {
  say(/GADApplicationIdentifier/.test(plist) && !TEST_APP.test(plist), 'Info.plist: your own AdMob app id');
  say(/NSUserTrackingUsageDescription/.test(plist), 'Info.plist: the tracking question\'s wording');
  say(/SKAdNetworkItems/.test(plist), 'Info.plist: SKAdNetwork ids');
}
console.log('Done (' + ok.length + '):'); ok.forEach((t) => console.log('  ✓ ' + t));
console.log('\nStill to do (' + todo.length + '):'); todo.forEach((t) => console.log('  • ' + t));
process.exit(0);
