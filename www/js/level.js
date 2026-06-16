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
   * Generates the track from analyzed onset EVENTS (rhythm v3):
   *  - `analysis.events` are real audible hits in the song's dominant
   *    band (kicks/snares/vocal stabs), detected at their true times -
   *    every event becomes exactly one obstacle, so the ball always
   *    bounces on a sound. Beats with no audible hit get NO obstacle.
   *  - `event.strength` (0..1, normalized onset salience) picks the
   *    obstacle type; sections add variety weighting.
   *  - Falls back to the per-beat grid for analyses without events
   *    (sync-test click track, old cached songs).
   *
   * track[]: { time, type:'strong', obstacleType, energy, section, index }
   * checkpoints[]: times (sec), snapped to the nearest beat, every ~20s
   */
  function generate(analysis, songHash) {
    const rng = mulberry32(hashToSeed(songHash || 'oneDot'));

    let events = analysis.events;
    if (!events || !events.length) {
      const beats = analysis.beats || [];
      events = beats
        .filter(b => b.type !== 'weak')
        .map(b => ({ time: b.time, strength: b.bass != null ? b.bass : (b.energy || 0.5), section: b.section }));
      if (!events.length) events = beats.map(b => ({ time: b.time, strength: 0.5, section: b.section }));
    }

    // the song needs a moment to breathe before the first obstacle
    const playable = events.filter(e => e.time >= 1.0);

    const track = playable.map((e, i) => {
      const energy = e.strength != null ? e.strength : 0.5;
      // Local vocal density (0..1) from analysis; older levels without it
      // fall back to a neutral 0.5 so their charts stay unchanged.
      const vocal = e.vocal != null ? e.vocal : 0.5;
      const section = e.section || 'chill';
      const r = rng();
      // Difficulty rides BOTH onset strength and how vocally busy this moment
      // is: a syllable-packed hook plays harder than a lone instrumental hit,
      // and an instrumental interlude stays calm even inside a loud section.
      const intensity = 0.45 * energy + 0.55 * vocal;
      const strongHit = intensity >= 0.55;
      const vocalBoost = 0.3 * vocal;   // dense vocals -> more double spikes / gaps
      const calm = vocal < 0.25;        // instrumental interlude -> keep it simple
      let obstacleType;
      if (section === 'drop') {
        const dbl = Math.min(0.85, (strongHit ? 0.55 : 0.35) + vocalBoost);
        obstacleType = r < dbl ? 'doubleSpike' : (r < dbl + 0.2 ? 'gap' : 'spike');
      } else if (section === 'build') {
        const dbl = Math.min(0.7, (strongHit ? 0.4 : 0.22) + vocalBoost);
        obstacleType = r < dbl ? 'doubleSpike' : (r < dbl + 0.18 ? 'gap' : 'spike');
      } else {
        const dbl = calm ? 0 : Math.min(0.45, (strongHit ? 0.22 : 0.08) + vocalBoost);
        obstacleType = r < dbl ? 'doubleSpike' : 'spike';
      }
      return { time: e.time, type: 'strong', obstacleType, energy, vocal, section, index: i };
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
