/* ============================================================
   ONE DOT - audio.js
   Web Audio analysis engine (file mode), reverb IR,
   tick synth, and playback chain construction.
   All gameplay timing downstream is derived from
   audioContext.currentTime - never performance.now.
   ============================================================ */

const AudioEngine = (() => {
  let ctx = null;

  function getContext() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  async function decodeFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = getContext();
    return await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  }

  /** FNV-1a style hash over a sparse sample of the PCM data -> base36 string. */
  function hashAudioBuffer(audioBuffer) {
    const data = audioBuffer.getChannelData(0);
    let hash = 0x811c9dc5;
    const step = Math.max(1, Math.floor(data.length / 50000));
    for (let i = 0; i < data.length; i += step) {
      const sample = Math.floor((data[i] + 1) * 5000);
      hash ^= sample;
      hash = Math.imul(hash, 16777619);
    }
    hash ^= audioBuffer.length;
    hash = Math.imul(hash, 16777619);
    hash ^= Math.floor(audioBuffer.duration * 1000);
    hash = Math.imul(hash, 16777619);
    return (hash >>> 0).toString(36);
  }

  function mixToMono(audioBuffer) {
    const length = audioBuffer.length;
    const mono = new Float32Array(length);
    const channels = audioBuffer.numberOfChannels;
    for (let ch = 0; ch < channels; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) mono[i] += data[i] / channels;
    }
    return mono;
  }

  // ---------------- beat tuner: bass-band sensitivity/spacing settings ----------------
  const DEFAULT_TUNER_SETTINGS = {
    bass: { sensitivity: 1.3, minSpacing: 0.25 },
  };

  function defaultTunerSettings() {
    return JSON.parse(JSON.stringify(DEFAULT_TUNER_SETTINGS));
  }

  /** Accepts the per-band shape, the old flat shape, or nothing. */
  function normalizeTunerSettings(settings) {
    const out = defaultTunerSettings();
    if (!settings) return out;
    const src = settings.bass || settings;
    if (src.sensitivity != null) out.bass.sensitivity = src.sensitivity;
    if (src.minSpacing != null) out.bass.minSpacing = src.minSpacing;
    return out;
  }

  // ---------------- small math helpers ----------------
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function mean(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum += arr[i];
    return arr.length ? sum / arr.length : 0;
  }

  function median(arr) {
    if (!arr.length) return 0;
    const sorted = Array.from(arr).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  function hannWindow(size) {
    const w = new Float64Array(size);
    for (let i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
    return w;
  }

  /** In-place iterative radix-2 Cooley-Tukey FFT (re/im same length, power of 2). */
  function fftInPlace(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
        tmp = im[i]; im[i] = im[j]; im[j] = tmp;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1;
      const ang = -2 * Math.PI / len;
      const wRe = Math.cos(ang), wIm = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let curRe = 1, curIm = 0;
        for (let j = 0; j < half; j++) {
          const a = i + j, b = a + half;
          const vRe = re[b] * curRe - im[b] * curIm;
          const vIm = re[b] * curIm + im[b] * curRe;
          const uRe = re[a], uIm = im[a];
          re[a] = uRe + vRe; im[a] = uIm + vIm;
          re[b] = uRe - vRe; im[b] = uIm - vIm;
          const nextRe = curRe * wRe - curIm * wIm;
          const nextIm = curRe * wIm + curIm * wRe;
          curRe = nextRe; curIm = nextIm;
        }
      }
    }
  }

  /** Yields a tick so progress updates can repaint during long analysis loops. */
  function yieldToUI() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /**
   * Beat analysis pipeline (rhythm v3 - onset events first, grid second):
   *  1. BAND NOVELTY: spectral-flux onset envelopes for low (kick/808),
   *     mid (vocals/melodic) and high (snare/hats) bands at a ~11.6ms hop,
   *     locally mean-subtracted so only real attacks survive.
   *  2. DOMINANT MIX: VOCALS lead whenever the mid band carries a real
   *     vocal/melodic layer (most songs); drums (low) lead only on
   *     instrumental tracks; high leads on sparse percussion-only material.
   *     The player follows the singer, so gameplay events come from the
   *     vocal line first, with kick/hat assisting lightly underneath.
   *  3. EVENTS: every clear onset peak becomes a gameplay event at its TRUE
   *     detected time (latency-calibrated on synthetic clicks). Obstacles
   *     are placed ONLY on events - the ball bounces exactly on audible
   *     hits, syncopation included, never on silence.
   *  4. TEMPO: harmonic-reinforced autocorrelation -> octave correction
   *     from the events' own spacing -> comb-fold fine refinement (a wrong
   *     period smears the fold peak, so sharpness pins the period
   *     precisely). Phase = fold peak position.
   *  5. SNAP + BEATS: events within 30ms of an eighth-note line are pulled
   *     onto it (cosmetic); the beat grid drives metronome/guide/ring.
   * `confidence`/`gridStability` feed the A5 QA check (weak-beat warning).
   */
  // Spectral flux sees an attack's rising edge slightly before its
  // perceptual center; measured as -12ms on synthetic clicks.
  const ONSET_LATENCY_CORRECTION = 0.012;

  async function analyze(audioBuffer, tunerSettings, onProgress) {
    const t = normalizeTunerSettings(tunerSettings);
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const duration = audioBuffer.duration;
    const mid = mixToMono(audioBuffer);
    if (onProgress) onProgress(0.02);

    // ---- 1. band spectral-flux envelopes ----
    const FFT_SIZE = 1024;
    const HOP = 512;
    const hopTime = HOP / sampleRate;
    const numFrames = Math.max(2, Math.floor(Math.max(0, length - FFT_SIZE) / HOP) + 1);
    const numBins = FFT_SIZE / 2 + 1;

    const win = hannWindow(FFT_SIZE);
    const re = new Float64Array(FFT_SIZE);
    const im = new Float64Array(FFT_SIZE);
    const prevMag = new Float64Array(numBins);
    const lowFluxRaw = new Float64Array(numFrames);
    const midFluxRaw = new Float64Array(numFrames);
    const highFluxRaw = new Float64Array(numFrames);
    const totalEnergy = new Float64Array(numFrames);

    const binHz = sampleRate / FFT_SIZE;
    const lowHiBin = Math.max(2, Math.round(150 / binHz));
    const midLoBin = Math.round(250 / binHz);
    const midHiBin = Math.round(2200 / binHz);
    const highLoBin = midHiBin + 1;
    const highHiBin = Math.min(numBins - 1, Math.round(9000 / binHz));

    for (let f = 0; f < numFrames; f++) {
      const start = f * HOP;
      for (let i = 0; i < FFT_SIZE; i++) {
        const sample = start + i < length ? mid[start + i] : 0;
        re[i] = sample * win[i];
        im[i] = 0;
      }
      fftInPlace(re, im);

      let lowSum = 0, midSum = 0, highSum = 0, total = 0;
      for (let k = 1; k < numBins; k++) {
        const mag = Math.hypot(re[k], im[k]);
        const diff = mag - prevMag[k];
        if (diff > 0) {
          if (k <= lowHiBin) lowSum += diff;
          else if (k >= midLoBin && k <= midHiBin) midSum += diff;
          else if (k >= highLoBin && k <= highHiBin) highSum += diff;
        }
        total += mag * mag;
        prevMag[k] = mag;
      }
      lowFluxRaw[f] = lowSum;
      midFluxRaw[f] = midSum;
      highFluxRaw[f] = highSum;
      totalEnergy[f] = total;

      if (onProgress && (f & 1023) === 0) {
        onProgress(0.05 + 0.5 * (f / numFrames));
        await yieldToUI();
      }
    }
    if (onProgress) onProgress(0.55);

    // log-compress + subtract a ~0.45s moving average -> clean novelty peaks
    function toNovelty(raw) {
      const n = raw.length;
      const logd = new Float64Array(n);
      for (let i = 0; i < n; i++) logd[i] = Math.log1p(raw[i]);
      const W = Math.max(1, Math.round(0.45 / hopTime));
      const prefix = new Float64Array(n + 1);
      for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + logd[i];
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const lo = Math.max(0, i - W), hi = Math.min(n, i + W + 1);
        const local = (prefix[hi] - prefix[lo]) / (hi - lo);
        const v = logd[i] - local;
        out[i] = v > 0 ? v : 0;
      }
      return out;
    }

    const lowNov = toNovelty(lowFluxRaw);
    const midNov = toNovelty(midFluxRaw);
    const highNov = toNovelty(highFluxRaw);
    const combNov = new Float64Array(numFrames);
    for (let i = 0; i < numFrames; i++) combNov[i] = lowNov[i] + 0.8 * midNov[i] + 0.6 * highNov[i];

    // ---- 2. dominant mix: VOCALS lead whenever the song actually sings ----
    // The player's eye and ear follow the singer, so the ball should bounce
    // on the VOCAL/melodic line first (mid band). Priority order:
    //   1. mid  (vocals / lead melody)  - whenever a real vocal layer exists
    //   2. low  (kick / 808 / bass)     - instrumental, drum-driven tracks
    //   3. high (snare / hats)          - sparse, bass-less / percussion-only
    // The chosen band LEADS event detection; the others only ASSIST (kept
    // light so the lead truly drives the chart instead of the kick taking over).
    let lowTotal = 0, midTotal = 0, highTotal = 0, combTotal = 0;
    for (let i = 0; i < numFrames; i++) {
      lowTotal += lowNov[i]; midTotal += midNov[i]; highTotal += highNov[i]; combTotal += combNov[i];
    }
    // A vocal/melodic layer is "present" when the mid band carries a real
    // share of the total onset energy. Vocals have less flux than drums, so
    // the bar is intentionally low (~12%) - we'd rather follow a quiet voice
    // than fall back to the kick and feel disconnected from the song.
    const hasVocals = combTotal > 1e-9 && midTotal >= 0.12 * combTotal;
    const hasDrums = combTotal > 1e-9 && lowTotal >= 0.10 * combTotal;
    let dominantBand;
    if (hasVocals) dominantBand = 'mid';
    else if (hasDrums) dominantBand = 'low';
    else dominantBand = highTotal >= lowTotal ? 'high' : 'low';

    const domNov = dominantBand === 'low' ? lowNov : (dominantBand === 'mid' ? midNov : highNov);
    const gameNov = new Float64Array(numFrames);
    for (let i = 0; i < numFrames; i++) {
      // Assist weights: when vocals lead, keep the kick/hat support light so
      // syllable onsets stay the peaks; when drums lead, lean on hats + a
      // touch of vocal so melodic stabs still register.
      const assist = dominantBand === 'mid'
        ? 0.32 * lowNov[i] + 0.22 * highNov[i]
        : (dominantBand === 'low'
            ? 0.5 * highNov[i] + 0.35 * midNov[i]
            : 0.45 * lowNov[i] + 0.35 * midNov[i]);
      gameNov[i] = domNov[i] + assist;
    }

    // ---- 3. onset events at true detected times ----
    const nz = [];
    for (let i = 0; i < numFrames; i++) if (gameNov[i] > 0) nz.push(gameNov[i]);
    nz.sort((a, b) => a - b);
    const p90 = nz.length ? nz[Math.floor(nz.length * 0.9)] : 0;
    const sensitivity = t.bass.sensitivity || 1.3;
    const floor = p90 * (0.45 / Math.max(0.3, sensitivity));

    const W2 = Math.max(1, Math.round(0.35 / hopTime));
    const prefix2 = new Float64Array(numFrames + 1);
    for (let i = 0; i < numFrames; i++) prefix2[i + 1] = prefix2[i] + gameNov[i];

    const rawOnsets = [];
    for (let i = 2; i < numFrames - 2; i++) {
      const v = gameNov[i];
      if (v < floor) continue;
      if (v < gameNov[i - 1] || v < gameNov[i + 1] || v <= gameNov[i - 2] || v <= gameNov[i + 2]) continue;
      const lo = Math.max(0, i - W2), hi = Math.min(numFrames, i + W2 + 1);
      const localMean = (prefix2[hi] - prefix2[lo]) / (hi - lo);
      if (v < localMean * 1.5) continue;
      // refine peak time: weighted centroid of the 3 frames around the max
      const c = (gameNov[i - 1] * (i - 1) + v * i + gameNov[i + 1] * (i + 1)) / (gameNov[i - 1] + v + gameNov[i + 1]);
      rawOnsets.push({ time: c * hopTime + ONSET_LATENCY_CORRECTION, strength: v });
    }
    if (onProgress) { onProgress(0.62); await yieldToUI(); }

    // ---- 4. tempo: ACF -> octave fix from event spacing -> fold refine ----
    const novMean = mean(combNov);
    const centered = new Float64Array(numFrames);
    for (let i = 0; i < numFrames; i++) centered[i] = combNov[i] - novMean;

    function acfAtLag(lag) {
      const li = Math.floor(lag), frac = lag - li;
      const n = numFrames - li - 1;
      if (li < 1 || n < 16) return 0;
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const v = centered[i + li] * (1 - frac) + centered[i + li + 1] * frac;
        sum += centered[i] * v;
      }
      return sum / n;
    }

    let acf0 = 0;
    for (let i = 0; i < numFrames; i++) acf0 += centered[i] * centered[i];
    acf0 = acf0 / numFrames || 1e-9;

    const MIN_BPM = 60, MAX_BPM = 180;
    let bestBpm = 120, bestScore = -Infinity;
    for (let b = MIN_BPM; b <= MAX_BPM; b += 0.5) {
      const lag = (60 / b) / hopTime;
      const score = acfAtLag(lag) + 0.5 * acfAtLag(lag * 2) + 0.33 * acfAtLag(lag * 3) + 0.25 * acfAtLag(lag / 2);
      if (score > bestScore) { bestScore = score; bestBpm = b; }
    }
    const confidence = clamp01(acfAtLag((60 / bestBpm) / hopTime) / acf0);

    // octave correction: if events sit twice per beat, the real tempo is 2x
    if (rawOnsets.length > 8) {
      const ivals = [];
      for (let i = 1; i < rawOnsets.length; i++) {
        const d = rawOnsets[i].time - rawOnsets[i - 1].time;
        if (d > 0.1 && d < 2.5) ivals.push(d);
      }
      ivals.sort((a, b) => a - b);
      const medIval = ivals.length ? ivals[Math.floor(ivals.length / 2)] : 60 / bestBpm;
      if (medIval <= 0.6 * (60 / bestBpm) && bestBpm * 2 <= 200) bestBpm *= 2;
      else if (medIval >= 1.6 * (60 / bestBpm) && bestBpm / 2 >= 55) bestBpm /= 2;
    }

    // fold fine refinement: a wrong period smears the fold peak over the
    // whole song, so sharpness pins the true period very precisely
    function foldAt(env, periodFrames) {
      const nb = Math.max(8, Math.round(periodFrames));
      const acc = new Float64Array(nb);
      const inv = nb / periodFrames;
      for (let f = 0; f < numFrames; f++) {
        if (env[f] === 0) continue;
        const ph = f - Math.floor(f / periodFrames) * periodFrames;
        let b = Math.floor(ph * inv); if (b >= nb) b = nb - 1;
        acc[b] += env[f];
      }
      let total = 0, best = -1, bi = 0;
      for (let b = 0; b < nb; b++) { total += acc[b]; if (acc[b] > best) { best = acc[b]; bi = b; } }
      const prev = acc[(bi + nb - 1) % nb], next = acc[(bi + 1) % nb];
      const peak = best + 0.5 * (prev + next);
      const meanv = total / nb;
      const sharp = meanv > 1e-9 ? peak / (meanv * 2.5) : 0;
      let frac = 0;
      const denom = prev - 2 * best + next;
      if (Math.abs(denom) > 1e-12) frac = Math.max(-0.5, Math.min(0.5, 0.5 * (prev - next) / denom));
      const phaseFrames = ((bi + frac + 0.5) / inv) % periodFrames;
      return { sharp, phaseFrames, total };
    }

    {
      const base = (60 / bestBpm) / hopTime;
      let fineBest = -1, fineP = base;
      for (let s = -120; s <= 120; s++) {
        const p = base * (1 + s * 0.0001);
        const r = foldAt(gameNov, p);
        if (r.sharp > fineBest) { fineBest = r.sharp; fineP = p; }
      }
      bestBpm = 60 / (fineP * hopTime);
    }
    if (onProgress) { onProgress(0.75); await yieldToUI(); }

    const beatSec = 60 / bestBpm;
    const bpm = bestBpm;
    const beatPeriodFrames = beatSec / hopTime;
    const beatFold = foldAt(gameNov, beatPeriodFrames);
    let beatPhaseSec = (beatFold.phaseFrames * hopTime + ONSET_LATENCY_CORRECTION) % beatSec;

    // ---- 5. grid snap (straightness-scaled) + spacing + strengths ----
    // Events stay at their TRUE detected times unless the song is clearly
    // grid-quantized, in which case we pull each onset onto the nearest
    // 16th-note line to erase sub-frame detection jitter and make the chart
    // feel machine-tight. Swung / live / loosely-played tracks sit
    // consistently OFF the straight grid, so we detect that ("straightness")
    // and barely snap them, preserving the groove the player actually hears.
    const sixteenthSec = beatSec / 4;
    const minSpacing = Math.max(0.16, t.bass.minSpacing != null ? t.bass.minSpacing : 0.18);

    function dedupe(list) {
      list.sort((a, b) => a.time - b.time);
      const out = [];
      for (const e of list) {
        const last = out[out.length - 1];
        if (last && e.time - last.time < minSpacing) {
          if (e.strength > last.strength) out[out.length - 1] = e;
        } else out.push(e);
      }
      return out;
    }

    // base set: true onset times, deduped by spacing
    let events = dedupe(rawOnsets
      .map(o => ({ time: o.time, strength: o.strength, snapped: false }))
      .filter(e => e.time >= 0 && e.time <= duration - 0.05));

    // straightness = fraction of near-grid events sitting within 20ms of a
    // 16th line. High -> programmed/quantized -> snap hard; low -> groove ->
    // snap barely (just remove the worst few-ms detection jitter).
    let near = 0, total = 0;
    for (const e of events) {
      const k = Math.round((e.time - beatPhaseSec) / sixteenthSec);
      const dev = Math.abs(e.time - (beatPhaseSec + k * sixteenthSec));
      if (dev <= sixteenthSec * 0.5) { total++; if (dev <= 0.02) near++; }
    }
    const straightness = total ? near / total : 0;
    const snapTol = 0.018 + 0.030 * clamp01((straightness - 0.45) / 0.25);

    for (const e of events) {
      const k = Math.round((e.time - beatPhaseSec) / sixteenthSec);
      const gridT = beatPhaseSec + k * sixteenthSec;
      if (k >= 0 && Math.abs(gridT - e.time) <= snapTol) { e.time = gridT; e.snapped = true; }
    }
    // snapping can pull two onsets onto the same / adjacent line - re-dedupe
    events = dedupe(events);
    const strengths = events.map(e => e.strength).sort((a, b) => a - b);
    const sP95 = strengths.length ? strengths[Math.floor(strengths.length * 0.95)] : 1;
    events.forEach(e => { e.strength = clamp01(e.strength / (sP95 || 1)); });
    if (onProgress) { onProgress(0.85); await yieldToUI(); }

    // ---- sections (intro/chill/build/drop) from total energy ----
    const sectionWindowSec = 2;
    const framesPerSection = Math.max(1, Math.round(sectionWindowSec / hopTime));
    const numSections = Math.max(1, Math.ceil(numFrames / framesPerSection));
    const sections = [];
    {
      const sectionEnergy = new Float64Array(numSections);
      let maxSectionEnergy = 1e-9;
      for (let s = 0; s < numSections; s++) {
        const start = s * framesPerSection;
        const end = Math.min(numFrames, start + framesPerSection);
        let sum = 0, count = 0;
        for (let f = start; f < end; f++) { sum += totalEnergy[f]; count++; }
        sectionEnergy[s] = count ? sum / count : 0;
        if (sectionEnergy[s] > maxSectionEnergy) maxSectionEnergy = sectionEnergy[s];
      }
      for (let i = 0; i < numSections; i++) {
        const norm = sectionEnergy[i] / maxSectionEnergy;
        let type;
        if (norm < 0.35) type = (i < numSections * 0.12) ? 'intro' : 'chill';
        else if (norm < 0.65) type = 'build';
        else type = 'drop';
        sections.push({ time: i * sectionWindowSec, duration: sectionWindowSec, type, intensity: norm });
      }
    }
    const sectionAt = (time) => sections[Math.min(sections.length - 1, Math.max(0, Math.floor(time / sectionWindowSec)))].type;

    // ---- beats[] on the musical grid, with attack info at each slot ----
    function novAt(env, timeSec) {
      const c = Math.round(timeSec / hopTime);
      let v = 0;
      for (let f = Math.max(0, c - 2); f <= Math.min(numFrames - 1, c + 2); f++) if (env[f] > v) v = env[f];
      return v;
    }

    // Per-event section + local VOCAL DENSITY (0..1): how much vocal/melodic
    // energy surrounds this hit, smoothed over a ~1.5s window so a singing
    // verse reads "dense" and an instrumental break reads "sparse". Level
    // generation uses it to ramp obstacle difficulty up where the voice is
    // busy and ease off during instrumental interludes.
    const vocalWin = Math.max(1, Math.round(0.75 / hopTime));
    const vocalPrefix = new Float64Array(numFrames + 1);
    for (let i = 0; i < numFrames; i++) vocalPrefix[i + 1] = vocalPrefix[i] + midNov[i];
    let vocalDensP95 = 0;
    {
      const samples = [];
      for (const e of events) {
        const c = Math.round(e.time / hopTime);
        const lo = Math.max(0, c - vocalWin), hi = Math.min(numFrames, c + vocalWin + 1);
        const dens = (vocalPrefix[hi] - vocalPrefix[lo]) / (hi - lo);
        e._vocalDensRaw = dens;
        samples.push(dens);
      }
      samples.sort((a, b) => a - b);
      vocalDensP95 = samples.length ? (samples[Math.floor(samples.length * 0.95)] || 0) : 0;
    }
    events.forEach(e => {
      e.section = sectionAt(e.time);
      e.vocal = vocalDensP95 > 1e-9 ? clamp01(e._vocalDensRaw / vocalDensP95) : 0;
      delete e._vocalDensRaw;
    });
    const beats = [];
    const eventTimes = events.map(e => e.time);
    for (let tBeat = beatPhaseSec; tBeat < duration; tBeat += beatSec) {
      let nearestEvent = Infinity;
      for (const et of eventTimes) {
        const d = Math.abs(et - tBeat);
        if (d < nearestEvent) nearestEvent = d;
        if (et > tBeat + beatSec) break;
      }
      const low = novAt(lowNov, tBeat), midv = novAt(midNov, tBeat), high = novAt(highNov, tBeat);
      beats.push({
        time: tBeat,
        energy: clamp01(low / (p90 || 1)),
        bass: clamp01(low / (p90 || 1)),
        vocal: clamp01(midv / (p90 || 1)),
        high: clamp01(high / (p90 || 1)),
        type: nearestEvent < beatSec * 0.25 ? 'strong' : 'weak',
        section: sectionAt(tBeat),
      });
    }
    if (!beats.length) beats.push({ time: 0, energy: 0.5, bass: 0.5, vocal: 0, high: 0, type: 'strong', section: 'chill' });

    const bassBeats = beats.map(b => ({ time: b.time, energy: b.bass, section: b.section }));
    const beatGrid = beats.map(b => b.time);

    const gridStability = clamp01(beatFold.sharp / 2.5) * clamp01(events.length > 8 ? 1 : events.length / 8);

    const intensity = sections.reduce((a, s) => a + s.intensity, 0) / sections.length;
    if (onProgress) onProgress(1);

    return {
      bpm: Math.round(bpm * 10) / 10,
      phase: beatPhaseSec % beatSec,
      duration,
      beats,
      bassBeats,
      beatGrid,
      events,
      dominantBand,
      confidence,
      gridStability,
      sections,
      intensity,
      sampleRate,
      waveform: downsampleForWaveform(mid, 1000),
    };
  }

  function downsampleForWaveform(mono, points) {
    const step = Math.max(1, Math.floor(mono.length / points));
    const out = new Float32Array(Math.ceil(mono.length / step));
    for (let i = 0, p = 0; i < mono.length; i += step, p++) {
      let max = 0;
      for (let j = 0; j < step && i + j < mono.length; j++) {
        const v = Math.abs(mono[i + j]);
        if (v > max) max = v;
      }
      out[p] = max;
    }
    return Array.from(out);
  }

  /**
   * SYNC TEST mode: synthesizes a constant 120 BPM click track (audible)
   * plus a matching analysis object, so the obstacle/ring timing can be
   * checked against the audio clock independent of song analysis quality.
   */
  async function generateClickTrack() {
    const bpm = 120;
    const beatInterval = 60 / bpm;
    const totalBeats = 64; // 32 seconds
    const duration = totalBeats * beatInterval;
    const sampleRate = 44100;
    const length = Math.ceil(duration * sampleRate);

    const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
    for (let i = 0; i < totalBeats; i++) {
      const time = i * beatInterval;
      const strong = i % 4 === 0;
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(strong ? 1400 : 900, time);
      gain.gain.setValueAtTime(strong ? 0.35 : 0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(time);
      osc.stop(time + 0.07);
    }
    const buffer = await offlineCtx.startRendering();

    const beats = [];
    for (let i = 0; i < totalBeats; i++) {
      const strong = i % 4 === 0;
      const time = i * beatInterval;
      beats.push({
        time,
        energy: strong ? 1 : 0.5,
        bass: strong ? 1 : 0.5,
        vocal: 0,
        high: 0,
        type: strong ? 'strong' : 'weak',
        section: 'chill',
      });
    }
    const bassBeats = beats.map(b => ({ time: b.time, energy: b.bass, section: b.section }));
    const beatGrid = beats.map(b => b.time);
    const events = beats.map(b => ({ time: b.time, strength: b.bass, snapped: true, section: b.section }));

    const analysis = {
      bpm,
      phase: 0,
      duration,
      beats,
      bassBeats,
      beatGrid,
      events,
      dominantBand: 'low',
      confidence: 1,
      gridStability: 1,
      sections: [{ time: 0, duration, type: 'chill', intensity: 0.5 }],
      intensity: 0.5,
      sampleRate,
      waveform: [],
    };

    return { buffer, analysis };
  }

  /**
   * TUTORIAL: synthesizes a friendly 100 BPM beat (kick / snare / hats) and
   * a hand-authored event list that ramps up: every 4th beat -> every 2nd
   * beat -> every beat -> light syncopation. Returns { buffer, analysis }.
   */
  async function generateTutorialTrack() {
    const bpm = 100;
    const beatInterval = 60 / bpm; // 0.6s
    const totalBeats = 72; // ~43s
    const duration = totalBeats * beatInterval + 1;
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(duration * sampleRate), sampleRate);

    for (let i = 0; i < totalBeats; i++) {
      const t = i * beatInterval;
      // kick on every beat
      const osc = offlineCtx.createOscillator();
      const g = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(48, t + 0.09);
      g.gain.setValueAtTime(0.85, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(g); g.connect(offlineCtx.destination);
      osc.start(t); osc.stop(t + 0.25);

      // snare on 2 and 4
      if (i % 4 === 2) {
        const len = Math.floor(0.12 * sampleRate);
        const nb = offlineCtx.createBuffer(1, len, sampleRate);
        const nd = nb.getChannelData(0);
        for (let s = 0; s < len; s++) nd[s] = (Math.random() * 2 - 1) * Math.exp(-s / (0.02 * sampleRate));
        const src = offlineCtx.createBufferSource();
        src.buffer = nb;
        const sg = offlineCtx.createGain();
        sg.gain.value = 0.5;
        src.connect(sg); sg.connect(offlineCtx.destination);
        src.start(t);
      }

      // light hats on 8ths from beat 32
      if (i >= 32) {
        for (let h = 0; h < 2; h++) {
          const ht = t + h * beatInterval / 2;
          const len = Math.floor(0.03 * sampleRate);
          const nb = offlineCtx.createBuffer(1, len, sampleRate);
          const nd = nb.getChannelData(0);
          for (let s = 0; s < len; s++) nd[s] = (Math.random() * 2 - 1) * Math.exp(-s / (0.004 * sampleRate));
          const src = offlineCtx.createBufferSource();
          src.buffer = nb;
          const hg = offlineCtx.createGain();
          hg.gain.value = 0.12;
          src.connect(hg); hg.connect(offlineCtx.destination);
          src.start(ht);
        }
      }
    }
    const buffer = await offlineCtx.startRendering();

    // hand-authored difficulty ramp: which beats carry an obstacle
    const eventBeats = [];
    for (let i = 4; i < 20; i += 4) eventBeats.push(i);       // breathe: every 4th
    for (let i = 20; i < 36; i += 2) eventBeats.push(i);      // every 2nd
    for (let i = 36; i < 56; i += 1) eventBeats.push(i);      // every beat
    for (let i = 56; i < 70; i += 2) { eventBeats.push(i); eventBeats.push(i + 1); } // pairs

    const sections = [];
    const sectionWindow = 2;
    for (let st = 0; st < duration; st += sectionWindow) {
      const type = st < 12 ? 'chill' : (st < 21.6 ? 'build' : 'drop');
      sections.push({ time: st, duration: sectionWindow, type, intensity: st < 12 ? 0.3 : (st < 21.6 ? 0.55 : 0.8) });
    }
    const sectionAt = (time) => sections[Math.min(sections.length - 1, Math.floor(time / sectionWindow))].type;

    const events = eventBeats.map(i => ({
      time: i * beatInterval,
      strength: i % 4 === 0 ? 1 : 0.6,
      snapped: true,
      section: sectionAt(i * beatInterval),
    }));

    const beats = [];
    for (let i = 0; i < totalBeats; i++) {
      const time = i * beatInterval;
      beats.push({
        time,
        energy: 1, bass: 1, vocal: 0, high: i >= 32 ? 0.5 : 0,
        type: eventBeats.includes(i) ? 'strong' : 'weak',
        section: sectionAt(time),
      });
    }

    return {
      buffer,
      analysis: {
        bpm,
        phase: 0,
        duration,
        beats,
        bassBeats: beats.map(b => ({ time: b.time, energy: b.bass, section: b.section })),
        beatGrid: beats.map(b => b.time),
        events,
        dominantBand: 'low',
        confidence: 1,
        gridStability: 1,
        sections,
        intensity: 0.5,
        sampleRate,
        waveform: [],
      },
    };
  }

  // ---------------- procedural white noise buffer ----------------
  function createNoiseBuffer(audioCtx, durationSec) {
    const length = Math.max(1, Math.floor(audioCtx.sampleRate * durationSec));
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // ---------------- procedural reverb impulse response ----------------
  function createReverbImpulse(audioCtx, decaySec, preDelaySec) {
    decaySec = decaySec || 2.5;
    preDelaySec = preDelaySec || 0.02;
    const sampleRate = audioCtx.sampleRate;
    const length = Math.floor(sampleRate * (decaySec + preDelaySec));
    const impulse = audioCtx.createBuffer(2, length, sampleRate);
    const preDelaySamples = Math.floor(preDelaySec * sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        if (i < preDelaySamples) { data[i] = 0; continue; }
        const t = (i - preDelaySamples) / sampleRate;
        const decay = Math.pow(1 - t / decaySec, 2);
        data[i] = (Math.random() * 2 - 1) * Math.max(0, decay);
      }
    }
    return impulse;
  }

  // ---------------- synthesized "tick" (extra hi-hat on perfect) ----------------
  function playTick(audioCtx, time, gainValue) {
    gainValue = gainValue != null ? gainValue : 0.22;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2200, time);
    osc.frequency.exponentialRampToValueAtTime(900, time + 0.04);
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.07);
  }

  // ---------------- metronome click (BPM ONLY modifier) ----------------
  function playClick(audioCtx, time, strong) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(strong ? 1400 : 900, time);
    gain.gain.setValueAtTime(strong ? 0.3 : 0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.07);
  }

  // ---------------- rhythm guide tick (quiet, on every grid beat) ----------------
  function playGuideTick(audioCtx, time, gainValue) {
    gainValue = gainValue != null ? gainValue : 0.1;
    if (gainValue <= 0.0005) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, time);
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  // ---------------- tap sound picker (perfect-hit feedback) ----------------
  const TAP_SOUNDS = ['hihat', 'clap', '808', 'laser'];

  /** Crisp triangle sweep - the original "tick" sound. */
  function playTapHiHat(audioCtx, time, gainValue) {
    playTick(audioCtx, time, gainValue);
  }

  /** Layered noise bursts through a bandpass filter. */
  function playTapClap(audioCtx, time, gainValue) {
    gainValue = gainValue != null ? gainValue : 0.3;
    const buffer = createNoiseBuffer(audioCtx, 0.2);
    [0, 0.018, 0.036].forEach((offset, i) => {
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1500;
      filter.Q.value = 1.2;
      const gain = audioCtx.createGain();
      const g = gainValue * (1 - i * 0.25);
      gain.gain.setValueAtTime(g, time + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + offset + 0.08);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      src.start(time + offset);
      src.stop(time + offset + 0.1);
    });
  }

  /** Deep pitch-dropping sine - classic 808 boom. */
  function playTap808(audioCtx, time, gainValue) {
    gainValue = gainValue != null ? gainValue : 0.5;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.25);
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.42);
  }

  /** Sawtooth pitch sweep - retro laser zap. */
  function playTapLaser(audioCtx, time, gainValue) {
    gainValue = gainValue != null ? gainValue : 0.22;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.15);
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  function playTapSound(audioCtx, time, soundId, gainValue) {
    switch (soundId) {
      case 'clap': return playTapClap(audioCtx, time, gainValue);
      case '808': return playTap808(audioCtx, time, gainValue);
      case 'laser': return playTapLaser(audioCtx, time, gainValue);
      default: return playTapHiHat(audioCtx, time, gainValue);
    }
  }

  // ---------------- beat tuner per-band preview sounds ----------------
  /** Low "thump" for BASS / spike beats. */
  function playBassThump(audioCtx, time, gainValue) {
    gainValue = gainValue != null ? gainValue : 0.5;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  /**
   * Builds the playback graph for a song with optional reverb (SLOWED
   * modifier) and mute (BPM ONLY modifier). Returns the source node
   * (call .start(when, offset)) plus an analyser for realtime visuals
   * and a gain node for crossfading.
   */
  function createPlaybackChain(audioCtx, audioBuffer, opts) {
    opts = opts || {};
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = opts.playbackRate || 1;

    const baseGain = opts.muted ? 0 : (opts.gain != null ? opts.gain : 1);
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = baseGain;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.65;

    // B2 fail effect: lowpass filter (muffled "underwater" tone) the chain
    // routes through on every miss, opened back up on recovery.
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 22000;
    filter.Q.value = 0.7;

    if (opts.reverb) {
      const dryGain = audioCtx.createGain();
      dryGain.gain.value = 0.7;
      const convolver = audioCtx.createConvolver();
      convolver.buffer = createReverbImpulse(audioCtx, 2.5, 0.02);
      const wetGain = audioCtx.createGain();
      wetGain.gain.value = 0.3;
      source.connect(dryGain);
      source.connect(convolver);
      convolver.connect(wetGain);
      dryGain.connect(filter);
      wetGain.connect(filter);
    } else {
      source.connect(filter);
    }

    filter.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(audioCtx.destination);

    // B2 fail effect: a slow detune wobble layered on top of the lowpass,
    // depth ramped in/out alongside the filter.
    const detuneLfo = audioCtx.createOscillator();
    detuneLfo.frequency.value = 5;
    const detuneDepth = audioCtx.createGain();
    detuneDepth.gain.value = 0;
    detuneLfo.connect(detuneDepth);
    detuneDepth.connect(source.detune);
    detuneLfo.start();

    return { source, masterGain, analyser, filter, detuneLfo, detuneDepth, baseGain };
  }

  /** B2: enter the rolling/fail state - underwater lowpass + detune wobble fade in. */
  function enterFailEffect(playback, time) {
    const filterFreq = playback.filter.frequency;
    filterFreq.cancelScheduledValues(time);
    filterFreq.setValueAtTime(filterFreq.value, time);
    filterFreq.linearRampToValueAtTime(500, time + 0.15);

    const depth = playback.detuneDepth.gain;
    depth.cancelScheduledValues(time);
    depth.setValueAtTime(depth.value, time);
    depth.linearRampToValueAtTime(25, time + 0.15);

    const gain = playback.masterGain.gain;
    gain.cancelScheduledValues(time);
    gain.setValueAtTime(gain.value, time);
    gain.linearRampToValueAtTime(playback.baseGain * 0.7, time + 0.15);
  }

  /** B2: recover from the rolling/fail state - fade the underwater effect back out. */
  function exitFailEffect(playback, time) {
    const filterFreq = playback.filter.frequency;
    filterFreq.cancelScheduledValues(time);
    filterFreq.setValueAtTime(filterFreq.value, time);
    filterFreq.linearRampToValueAtTime(22000, time + 0.15);

    const depth = playback.detuneDepth.gain;
    depth.cancelScheduledValues(time);
    depth.setValueAtTime(depth.value, time);
    depth.linearRampToValueAtTime(0, time + 0.15);

    const gain = playback.masterGain.gain;
    gain.cancelScheduledValues(time);
    gain.setValueAtTime(gain.value, time);
    gain.linearRampToValueAtTime(playback.baseGain, time + 0.15);
  }

  return {
    getContext, decodeFile, hashAudioBuffer, mixToMono, analyze,
    createReverbImpulse, playTick, playClick, playGuideTick, createPlaybackChain,
    enterFailEffect, exitFailEffect,
    generateClickTrack,
    generateTutorialTrack,
    playBassThump,
    normalizeTunerSettings, defaultTunerSettings,
    TAP_SOUNDS, playTapSound,
  };
})();
