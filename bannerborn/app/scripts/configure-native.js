// Applies Bannerborn's settings to the native projects Capacitor generates (android/, ios/). Safe to run again:
// every change is made only if it is not there yet. Run it after `npx cap add android` / `npx cap add ios`.
//   node scripts/configure-native.js
// What it sets: landscape only, full screen under the notch, the screen kept on while playing, the AdMob app id
// (Google's test id until you put your own in), release signing from keystore.properties, and on iOS the tracking
// question's wording, the SKAdNetwork id and the export-compliance answer.
const fs = require('fs'), path = require('path');
const app = path.resolve(__dirname, '..');
const TEST_ANDROID = 'ca-app-pub-3940256099942544~3347511713', TEST_IOS = 'ca-app-pub-3940256099942544~1458002511';
const edit = (rel, fn) => {
  const p = path.join(app, rel); if (!fs.existsSync(p)) { console.log('  (no ' + rel + ')'); return; }
  const a = fs.readFileSync(p, 'utf8'), b = fn(a); if (b !== a) { fs.writeFileSync(p, b); console.log('  changed ' + rel); } else console.log('  ok      ' + rel);
};
const write = (rel, text) => { const p = path.join(app, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) { fs.writeFileSync(p, text); console.log('  wrote   ' + rel); } else console.log('  ok      ' + rel); };

console.log('android');
edit('android/app/src/main/AndroidManifest.xml', (s) => {
  if (!/screenOrientation/.test(s)) s = s.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="sensorLandscape"');
  if (!/gms\.ads\.APPLICATION_ID/.test(s)) s = s.replace('        <provider', '        <!-- The AdMob app id. Google\'s test id until yours is in res/values/strings.xml (admob_app_id). -->\n        <meta-data\n            android:name="com.google.android.gms.ads.APPLICATION_ID"\n            android:value="@string/admob_app_id" />\n\n        <provider');
  return s;
});
edit('android/app/src/main/res/values/strings.xml', (s) => (/admob_app_id/.test(s) ? s : s.replace('</resources>', '    <string name="admob_app_id">' + TEST_ANDROID + '</string>\n</resources>')));
// the game draws to the very edge, under a notch or a camera hole (it keeps its own safe margins)
write('android/app/src/main/res/values-v28/styles.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
    </style>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
    </style>
</resources>
`);
{ // the activity: no system bars (a swipe brings them back for a moment), and the screen stays on
  const cfg = JSON.parse(fs.readFileSync(path.join(app, 'capacitor.config.json'), 'utf8')), pkg = cfg.appId;
  const dir = 'android/app/src/main/java/' + pkg.split('.').join('/');
  if (fs.existsSync(path.join(app, dir))) write(dir + '/MainActivity.java', `package ${pkg};

import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    private void hideBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.hide(WindowInsetsCompat.Type.systemBars());
        bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
`);
  else console.log('  (no ' + dir + ': has the appId changed? run `npx cap add android` again)');
}
edit('android/app/build.gradle', (s) => {
  if (/keystore\.properties/.test(s)) return s;
  // release builds are signed with your upload key, read from android/keystore.properties (never committed)
  s = s.replace("apply plugin: 'com.android.application'", "apply plugin: 'com.android.application'\n\ndef keystoreFile = rootProject.file('keystore.properties')\ndef keystore = new Properties()\nif (keystoreFile.exists()) { keystoreFile.withInputStream { keystore.load(it) } }");
  s = s.replace('    buildTypes {\n        release {', "    signingConfigs {\n        release {\n            if (keystoreFile.exists()) {\n                storeFile file(keystore['storeFile'])\n                storePassword keystore['storePassword']\n                keyAlias keystore['keyAlias']\n                keyPassword keystore['keyPassword']\n            }\n        }\n    }\n    buildTypes {\n        release {\n            if (keystoreFile.exists()) { signingConfig signingConfigs.release }");
  return s;
});

console.log('ios');
edit('ios/App/App/Info.plist', (s) => {
  const land = '<array>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>';
  s = s.replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*)<array>[\s\S]*?<\/array>/, '$1' + land).replace(/(<key>UISupportedInterfaceOrientations~ipad<\/key>\s*)<array>[\s\S]*?<\/array>/, '$1' + land);
  const add = [];
  const want = (key, xml) => { if (!s.includes('<key>' + key + '</key>')) add.push('\t<key>' + key + '</key>\n\t' + xml); };
  want('GADApplicationIdentifier', '<string>' + TEST_IOS + '</string>');
  want('NSUserTrackingUsageDescription', '<string>This lets the ads shown between battles be more relevant to you. The game plays the same either way.</string>');
  want('SKAdNetworkItems', '<array>\n\t\t<dict>\n\t\t\t<key>SKAdNetworkIdentifier</key>\n\t\t\t<string>cstr6suwn9.skadnetwork</string>\n\t\t</dict>\n\t</array>');
  want('UIRequiresFullScreen', '<true/>');
  want('UIStatusBarHidden', '<true/>');
  want('UIViewControllerBasedStatusBarAppearance', '<false/>');
  want('ITSAppUsesNonExemptEncryption', '<false/>');
  if (add.length) s = s.replace(/<\/dict>\s*<\/plist>\s*$/, add.join('\n') + '\n</dict>\n</plist>\n');
  return s;
});
console.log('done. Next: node scripts/check-release.js');
