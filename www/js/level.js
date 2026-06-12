/* ============================================================
   ONE DOT - level.js
   Procedural level generation from a beat timeline.
   Seed = hash of the audio data -> same song = same level.
   ============================================================ */

const Level = (() => {
  /** Deterministic PRNG (mulberry32). */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashToSeed(hashStr) {
    let h = 0;
    for (let i = 0; i < hashStr.length; i++) h = (h * 31 + hashStr.charCodeAt(i)) | 0;
    return h || 1;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function median(values) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  /**
   * Generates the track from 3-band analysis data:
   *  - bassBeats  -> 'strong' spikes/doubleSpikes/gaps (must jump exactly on hit)
   *  - vocalBeats -> 'weak' orbs, vertical placement driven by spectral centroid
   *  - highBeats  -> 'ceiling' bars (must be grounded, or already past, when they arrive)
   *
   * Conflict resolution: a ceiling bar within 150ms of a bass beat - or one that
   * would arrive while the player is still airborne from a bass-beat jump - is
   * dropped so bass spikes always take priority and every obstacle stays reachable.
   *
   * track[]: { time, type:'strong'|'weak'|'ceiling', obstacleType, energy, section, centroid?, index }
   * checkpoints[]: times (sec), snapped to the nearest strong beat, every ~20s
   */
  function generate(analysis, songHash) {
    const rng = mulberry32(hashToSeed(songHash || 'oneDot'));

    const bassBeats = analysis.bassBeats || [];
    const vocalBeats = analysis.vocalBeats || [];
    const highBeats = analysis.highBeats || [];

    const bpm = analysis.bpm || 120;
    const beatInterval = 60 / bpm;
    const jumpDuration = clamp(beatInterval * 0.45, 0.14, 0.42);
    const medianBassEnergy = median(bassBeats.map(b => b.energy)) || 0.5;

    const spikes = bassBeats.map((beat) => {
      const r = rng();
      const strongKick = beat.energy >= medianBassEnergy * 1.2;
      let obstacleType;
      if (beat.section === 'drop') {
        obstacleType = r < (strongKick ? 0.65 : 0.45) ? 'doubleSpike' : (r < 0.75 ? 'gap' : 'spike');
      } else if (beat.section === 'build') {
        obstacleType = r < (strongKick ? 0.5 : 0.3) ? 'doubleSpike' : (r < 0.45 ? 'gap' : 'spike');
      } else {
        obstacleType = r < (strongKick ? 0.3 : 0.12) ? 'doubleSpike' : 'spike';
      }
      return { time: beat.time, type: 'strong', obstacleType, energy: beat.energy, section: beat.section };
    });

    const orbs = vocalBeats.map(beat => ({
      time: beat.time, type: 'weak', obstacleType: 'orb', energy: beat.energy,
      section: beat.section, centroid: beat.centroid,
    }));

    // Ceiling bars: drop any that overlap a bass spike's hit window, or that would
    // land while the player is still airborne from a bass-beat-triggered jump.
    const ceilings = [];
    highBeats.forEach((beat) => {
      const conflict = bassBeats.some((b) => {
        const dt = beat.time - b.time;
        return Math.abs(dt) < 0.15 || (dt > 0 && dt < jumpDuration);
      });
      if (conflict) return;
      ceilings.push({
        time: beat.time, type: 'ceiling', obstacleType: 'ceilingBar', energy: beat.energy, section: beat.section,
      });
    });

    const track = spikes.concat(orbs, ceilings)
      .sort((a, b) => a.time - b.time)
      .map((el, i) => Object.assign(el, { index: i }));

    const checkpoints = buildCheckpoints(track, analysis.duration);

    return {
      track,
      checkpoints,
      bpm: analysis.bpm,
      duration: analysis.duration,
      sections: analysis.sections,
    };
  }

  /** Checkpoints roughly every 20s, snapped to the nearest strong beat. */
  function buildCheckpoints(track, duration) {
    const checkpoints = [0];
    const strongBeats = track.filter(t => t.type === 'strong');
    let target = 20;
    while (target < duration - 4) {
      let nearest = strongBeats.reduce((best, b) => {
        return Math.abs(b.time - target) < Math.abs(best.time - target) ? b : best;
      }, strongBeats[0] || { time: target });
      if (nearest.time > checkpoints[checkpoints.length - 1] + 5) {
        checkpoints.push(nearest.time);
      }
      target += 20;
    }
    return checkpoints;
  }

  return { generate, mulberry32, hashToSeed, buildCheckpoints };
})();
