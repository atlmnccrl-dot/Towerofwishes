// A short buzz on the moments that matter (a hero's ability, a win, a level), when the player allows
// it: the Capacitor Haptics plugin inside the app, the vibration API on Android browsers, nothing else.
const KINDS = { tap: ['LIGHT', 12], hit: ['MEDIUM', 25], big: ['HEAVY', 45] };
export function createHaptics(settings) {
  return {
    buzz(kind = 'tap') {
      if (!settings().haptics) return;
      const [style, ms] = KINDS[kind] || KINDS.tap, H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
      try { if (H) H.impact({ style }); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* no haptics here */ }
    },
  };
}
