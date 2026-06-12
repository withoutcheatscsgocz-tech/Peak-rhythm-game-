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
   * Generates the track from a BPM-locked beat grid:
   *  - bpm + phase (from the bass-band analysis) define a steady grid of
   *    beat times spanning the whole song.
   *  - every grid beat -> a spike/doubleSpike/gap obstacle, guaranteeing
   *    spikes always land exactly on the beat.
   *  - bassBeats are used only to pick how "strong" the kick is at each
   *    grid beat (for obstacle-type weighting).
   *
   * track[]: { time, type:'strong', obstacleType, energy, section, index }
   * checkpoints[]: times (sec), snapped to the nearest beat, every ~20s
   */
  function generate(analysis, songHash) {
    const rng = mulberry32(hashToSeed(songHash || 'oneDot'));

    const bassBeats = analysis.bassBeats || [];
    const medianBassEnergy = median(bassBeats.map(b => b.energy)) || 0.5;
    const bpm = analysis.bpm || 120;
    const beatInterval = 60 / bpm;
    const phase = analysis.phase || 0;
    const duration = analysis.duration || 0;
    const sections = analysis.sections || [];
    const sectionDuration = (sections[0] && sections[0].duration) || 2;

    const sectionAt = (time) => {
      if (!sections.length) return 'chill';
      const idx = Math.min(sections.length - 1, Math.floor(time / sectionDuration));
      return sections[idx].type;
    };

    // energy of the nearest detected bass onset, if one falls within
    // half a beat of this grid point; otherwise treat it as a quiet beat.
    const energyAt = (time) => {
      let nearest = null, bestDist = Infinity;
      for (const b of bassBeats) {
        const d = Math.abs(b.time - time);
        if (d < bestDist) { bestDist = d; nearest = b; }
      }
      return (nearest && bestDist <= beatInterval / 2) ? nearest.energy : medianBassEnergy * 0.5;
    };

    const grid = [];
    for (let t = phase; t < duration; t += beatInterval) grid.push(t);

    const track = grid.map((time, i) => {
      const energy = energyAt(time);
      const section = sectionAt(time);
      const r = rng();
      const strongKick = energy >= medianBassEnergy * 1.2;
      let obstacleType;
      if (section === 'drop') {
        obstacleType = r < (strongKick ? 0.65 : 0.45) ? 'doubleSpike' : (r < 0.75 ? 'gap' : 'spike');
      } else if (section === 'build') {
        obstacleType = r < (strongKick ? 0.5 : 0.3) ? 'doubleSpike' : (r < 0.45 ? 'gap' : 'spike');
      } else {
        obstacleType = r < (strongKick ? 0.3 : 0.12) ? 'doubleSpike' : 'spike';
      }
      return { time, type: 'strong', obstacleType, energy, section, index: i };
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
