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

  function median(values) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  /**
   * Generates the track from the bass-band beat timeline:
   *  - bassBeats -> spike/doubleSpike/gap obstacles, one per beat,
   *    timed to land exactly on the beat.
   *
   * track[]: { time, type:'strong', obstacleType, energy, section, index }
   * checkpoints[]: times (sec), snapped to the nearest beat, every ~20s
   */
  function generate(analysis, songHash) {
    const rng = mulberry32(hashToSeed(songHash || 'oneDot'));

    const bassBeats = analysis.bassBeats || [];
    const medianBassEnergy = median(bassBeats.map(b => b.energy)) || 0.5;

    const track = bassBeats.map((beat, i) => {
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
      return { time: beat.time, type: 'strong', obstacleType, energy: beat.energy, section: beat.section, index: i };
    });

    const checkpoints = buildCheckpoints(track, analysis.duration);

    return {
      track,
      checkpoints,
      bpm: analysis.bpm,
      duration: analysis.duration,
      sections: analysis.sections,
    };
  }

  /** Checkpoints roughly every 20s, snapped to the nearest beat. */
  function buildCheckpoints(track, duration) {
    const checkpoints = [0];
    let target = 20;
    while (target < duration - 4) {
      let nearest = track.reduce((best, b) => {
        return Math.abs(b.time - target) < Math.abs(best.time - target) ? b : best;
      }, track[0] || { time: target });
      if (nearest.time > checkpoints[checkpoints.length - 1] + 5) {
        checkpoints.push(nearest.time);
      }
      target += 20;
    }
    return checkpoints;
  }

  return { generate, mulberry32, hashToSeed, buildCheckpoints };
})();
