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

  /**
   * Generates the track from analysis data.
   * track[]: { time, type:'strong'|'weak', obstacleType, energy, section, index }
   * checkpoints[]: times (sec), snapped to the nearest strong beat, every ~20s
   */
  function generate(analysis, songHash) {
    const rng = mulberry32(hashToSeed(songHash || 'oneDot'));
    const track = analysis.beats.map((beat, i) => {
      if (beat.type === 'strong') {
        let obstacleType;
        const r = rng();
        if (beat.section === 'drop') {
          obstacleType = r < 0.45 ? 'doubleSpike' : (r < 0.75 ? 'gap' : 'spike');
        } else if (beat.section === 'build') {
          obstacleType = r < 0.3 ? 'doubleSpike' : (r < 0.45 ? 'gap' : 'spike');
        } else {
          obstacleType = r < 0.12 ? 'doubleSpike' : 'spike';
        }
        return { time: beat.time, type: 'strong', obstacleType, energy: beat.energy, section: beat.section, index: i };
      }
      return { time: beat.time, type: 'weak', obstacleType: 'orb', energy: beat.energy, section: beat.section, index: i };
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
