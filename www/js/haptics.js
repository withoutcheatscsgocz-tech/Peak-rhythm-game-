/* ============================================================
   ONE DOT - haptics.js
   Tap feedback + "haptic composer": converts the beat timeline
   into vibration pulses that mirror the song's rhythm.
   Modes: off | taps | full   (see Storage.settings.haptics)
   Gracefully no-ops on devices without navigator.vibrate.
   ============================================================ */

const Haptics = (() => {
  const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  function vibrate(pattern) {
    if (!supported) return;
    try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  }

  function mode() {
    return Storage.getSettings().haptics || 'full';
  }

  // ---------------- tap feedback (TAPS ONLY + FULL) ----------------
  function tapPerfect() {
    if (mode() === 'off') return;
    vibrate(15);
  }
  function tapGood() {
    if (mode() === 'off') return;
    vibrate(8);
  }
  function tapHit() {
    if (mode() === 'off') return;
    vibrate([10, 30, 10]);
  }
  function comboMilestone(combo) {
    if (mode() === 'off') return;
    if (combo >= 200) vibrate([30, 40, 30, 40, 30, 80]);
    else if (combo >= 150) vibrate([28, 40, 28, 60]);
    else if (combo >= 100) vibrate([25, 40, 50]);
    else if (combo >= 50) vibrate([20, 30, 30]);
  }
  function achievementUnlock() {
    if (mode() === 'off') return;
    vibrate([20, 50, 20, 50, 40]);
  }
  function themeUnlock() {
    if (mode() === 'off') return;
    vibrate([30, 60, 30, 60, 60]);
  }

  // ---------------- haptic composer (FULL only) ----------------
  /**
   * Computes a per-beat vibration duration (ms) that mirrors the song's
   * dynamics: light pulses for weak beats, stronger for strong beats,
   * escalating intensity during drop sections.
   */
  function buildBeatPulse(beat) {
    let base = beat.type === 'strong' ? 18 : 6;
    if (beat.section === 'drop') base += 14;
    else if (beat.section === 'build') base += 6;
    base += Math.round((beat.energy || 0) * 12);
    return Math.max(4, Math.min(base, 45));
  }

  /** Called by the game loop as each beat passes, in FULL mode only. */
  function beatPulse(beat) {
    if (mode() !== 'full') return;
    vibrate(buildBeatPulse(beat));
  }

  return {
    supported, vibrate, mode,
    tapPerfect, tapGood, tapHit, comboMilestone,
    achievementUnlock, themeUnlock,
    buildBeatPulse, beatPulse,
  };
})();
