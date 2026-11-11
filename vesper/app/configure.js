// THE BLEEDING MOON - native settings the store apps need, applied to the generated platforms (idempotent):
//   Android: the AdMob app ID, landscape only, fullscreen, the billing permission (Google Play purchases)
//   iOS:     the AdMob app ID, Apple's tracking-permission text, SKAdNetwork IDs for Google's ads, landscape only,
//            no status bar, full screen
// Usage: node configure.js   (after `npx cap add android|ios`, and whenever store-ids.json changes)
const fs = require('fs'), path = require('path');
const ids = JSON.parse(fs.readFileSync(path.join(__dirname, 'store-ids.json'), 'utf8'));

// ---- Android -------------------------------------------------------------------------------------------------
const man = path.join(__dirname, 'android/app/src/main/AndroidManifest.xml');
if (fs.existsSync(man)) {
  let s = fs.readFileSync(man, 'utf8');
  s = s.replace(/\s*<meta-data android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^>]*\/>/g, '');
  s = s.replace(/(<application[^>]*>)/, `$1\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${ids.admobAppIdAndroid}"/>`);
  if (!/android:screenOrientation=/.test(s)) s = s.replace(/android:name="\.MainActivity"/, 'android:name=".MainActivity"\n            android:screenOrientation="sensorLandscape"');
  if (!/com\.android\.vending\.BILLING/.test(s)) s = s.replace(/<uses-permission android:name="android\.permission\.INTERNET" \/>/, '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="com.android.vending.BILLING" />');
  fs.writeFileSync(man, s); console.log('android: manifest configured');
  const styles = path.join(__dirname, 'android/app/src/main/res/values/styles.xml');
  if (fs.existsSync(styles)) { let t = fs.readFileSync(styles, 'utf8'); if (!/windowFullscreen/.test(t)) { t = t.replace(/(<style name="AppTheme\.NoActionBar"[^>]*>)/, '$1\n        <item name="android:windowFullscreen">true</item>'); fs.writeFileSync(styles, t); } }
}

// ---- iOS -----------------------------------------------------------------------------------------------------------
const plist = path.join(__dirname, 'ios/App/App/Info.plist');
if (fs.existsSync(plist)) {
  let s = fs.readFileSync(plist, 'utf8');
  const setKey = (key, xml) => { const re = new RegExp(`\\s*<key>${key}</key>\\s*(<string>[^<]*</string>|<true/>|<false/>|<array>[\\s\\S]*?</array>)`); s = re.test(s) ? s.replace(re, `\n\t<key>${key}</key>\n\t${xml}`) : s.replace(/<dict>/, `<dict>\n\t<key>${key}</key>\n\t${xml}`); };
  setKey('GADApplicationIdentifier', `<string>${ids.admobAppIdIos}</string>`);
  setKey('NSUserTrackingUsageDescription', `<string>${ids.trackingText}</string>`);
  // Google's SKAdNetwork identifier (and its partners' list belongs here too: see developers.google.com/admob/ios/ios14).
  setKey('SKAdNetworkItems', '<array>\n\t\t<dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict>\n\t</array>');
  const land = '<array>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>';
  setKey('UISupportedInterfaceOrientations', land); setKey('UISupportedInterfaceOrientations~ipad', land);
  setKey('UIRequiresFullScreen', '<true/>'); setKey('UIStatusBarHidden', '<true/>'); setKey('UIViewControllerBasedStatusBarAppearance', '<false/>');
  fs.writeFileSync(plist, s); console.log('ios: Info.plist configured');
}
