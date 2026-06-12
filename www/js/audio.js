/* ============================================================
   ONE DOT - audio.js
   Web Audio analysis engine (file mode + mic mode), reverb IR,
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
   * Real beat-tracking analysis pipeline (PART A):
   *  1. ONSET ENVELOPE: spectral flux (frame-to-frame magnitude-spectrum
   *     increase, half-wave rectified, log-compressed) via FFT at a
   *     ~11.6ms hop (1024-sample frames, 512 hop @ 44.1kHz).
   *  2. TEMPO: autocorrelation of the envelope over 60-180 BPM with
   *     octave-error correction (prefers 90-150 BPM on near-ties).
   *  3. BEAT GRID: a dynamic-programming beat tracker (Ellis 2007) places a
   *     regular grid that maximizes onset strength at beat positions,
   *     re-estimating the local tempo in ~10s windows to follow slow drift.
   *  4. Every grid beat carries normalized bass/vocal/high band energies so
   *     Level.generate can decide WHAT goes on each slot - timing always
   *     comes from the grid (`beatGrid`/`beats[].time`), never raw onsets.
   * `confidence`/`gridStability` feed the A5 QA check (weak-beat warning).
   */
  async function analyze(audioBuffer, tunerSettings, onProgress) {
    const t = normalizeTunerSettings(tunerSettings);
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const duration = audioBuffer.duration;
    const mid = mixToMono(audioBuffer);
    if (onProgress) onProgress(0.02);

    // ---- onset envelope + per-frame band energies (FFT spectral flux) ----
    const FFT_SIZE = 1024;
    const HOP = 512;
    const hopTime = HOP / sampleRate;
    const numFrames = Math.max(1, Math.floor(Math.max(0, length - FFT_SIZE) / HOP) + 1);
    const numBins = FFT_SIZE / 2 + 1;

    const win = hannWindow(FFT_SIZE);
    const re = new Float64Array(FFT_SIZE);
    const im = new Float64Array(FFT_SIZE);
    const prevMag = new Float64Array(numBins);
    const flux = new Float64Array(numFrames);
    const bassEnergy = new Float64Array(numFrames);
    const vocalEnergy = new Float64Array(numFrames);
    const highEnergy = new Float64Array(numFrames);
    const totalEnergy = new Float64Array(numFrames);

    const binHz = sampleRate / FFT_SIZE;
    const bassLoBin = Math.max(1, Math.round(40 / binHz));
    const bassHiBin = Math.max(bassLoBin, Math.round(150 / binHz));
    const vocalLoBin = Math.max(bassHiBin + 1, Math.round(300 / binHz));
    const vocalHiBin = Math.max(vocalLoBin, Math.round(3000 / binHz));
    const highLoBin = Math.max(vocalHiBin + 1, Math.round(3000 / binHz));
    const highHiBin = Math.min(numBins - 1, Math.round(10000 / binHz));

    for (let f = 0; f < numFrames; f++) {
      const start = f * HOP;
      for (let i = 0; i < FFT_SIZE; i++) {
        const sample = start + i < length ? mid[start + i] : 0;
        re[i] = sample * win[i];
        im[i] = 0;
      }
      fftInPlace(re, im);

      let fluxSum = 0, bassSum = 0, vocalSum = 0, highSum = 0, total = 0;
      for (let k = 0; k < numBins; k++) {
        const mag = Math.hypot(re[k], im[k]);
        const diff = mag - prevMag[k];
        if (diff > 0) fluxSum += diff;
        const power = mag * mag;
        total += power;
        if (k >= bassLoBin && k <= bassHiBin) bassSum += power;
        if (k >= vocalLoBin && k <= vocalHiBin) vocalSum += power;
        if (k >= highLoBin && k <= highHiBin) highSum += power;
        prevMag[k] = mag;
      }
      flux[f] = Math.log1p(fluxSum);
      bassEnergy[f] = bassSum;
      vocalEnergy[f] = vocalSum;
      highEnergy[f] = highSum;
      totalEnergy[f] = total;

      if (onProgress && (f & 1023) === 0) {
        onProgress(0.05 + 0.55 * (f / numFrames));
        await yieldToUI();
      }
    }
    if (onProgress) onProgress(0.6);

    // beat tuner "sensitivity": scales the onset-envelope data term relative
    // to the DP's fixed spacing penalty below - higher follows raw onsets
    // more closely, lower sticks closer to a strict regular grid.
    const sensitivity = t.bass.sensitivity || 1;
    for (let f = 0; f < numFrames; f++) flux[f] *= sensitivity;

    // ---- tempo estimation: autocorrelation + octave-error correction ----
    const fluxMean = mean(flux);
    const centered = new Float64Array(numFrames);
    for (let f = 0; f < numFrames; f++) centered[f] = flux[f] - fluxMean;

    function autocorr(lag) {
      let sum = 0;
      const n = numFrames - lag;
      for (let i = 0; i < n; i++) sum += centered[i] * centered[i + lag];
      return n > 0 ? sum / n : 0;
    }

    const MIN_BPM = 60, MAX_BPM = 180;
    // beat tuner "min spacing": narrows the upper end of the tempo search
    const tunerMaxBpm = Math.max(MIN_BPM, Math.min(220, 60 / Math.max(0.05, t.bass.minSpacing || 0.25)));
    const bpmHigh = Math.min(MAX_BPM, tunerMaxBpm);
    let lagMin = Math.max(1, Math.floor((60 / bpmHigh) / hopTime));
    let lagMax = Math.min(numFrames - 1, Math.ceil((60 / MIN_BPM) / hopTime));
    if (lagMax < lagMin) lagMax = lagMin;

    const acf0 = autocorr(0) || 1e-9;
    let bpm = 120, confidence = 0, globalPeriodFrames = (60 / 120) / hopTime;

    if (numFrames > lagMax + 1 && lagMax >= 1) {
      let bestLag = lagMin, bestVal = -Infinity;
      for (let lag = lagMin; lag <= lagMax; lag++) {
        const v = autocorr(lag);
        if (v > bestVal) { bestVal = v; bestLag = lag; }
      }
      const bpmRaw = 60 / (bestLag * hopTime);

      const valAtBpm = (b) => {
        const lag = Math.round(60 / (b * hopTime));
        if (lag < 1 || lag >= numFrames) return -Infinity;
        return autocorr(lag);
      };

      const candidates = [{ bpm: bpmRaw, val: bestVal }];
      if (bpmRaw * 2 <= 220) candidates.push({ bpm: bpmRaw * 2, val: valAtBpm(bpmRaw * 2) });
      if (bpmRaw / 2 >= 40) candidates.push({ bpm: bpmRaw / 2, val: valAtBpm(bpmRaw / 2) });

      let chosen = candidates[0];
      for (const c of candidates) if (c.val > chosen.val) chosen = c;
      for (const c of candidates) {
        if (c.bpm >= 90 && c.bpm <= 150 && c.val >= chosen.val * 0.85 && c !== chosen) { chosen = c; break; }
      }

      bpm = chosen.bpm;
      while (bpm < MIN_BPM) bpm *= 2;
      while (bpm > MAX_BPM) bpm /= 2;
      globalPeriodFrames = (60 / bpm) / hopTime;
      confidence = clamp01(chosen.val / acf0);
    }
    if (onProgress) onProgress(0.65);

    // ---- local tempo curve for slow drift (~10s windows / 5s stride) ----
    const windowFrames = Math.max(8, Math.round(10 / hopTime));
    const strideFrames = Math.max(4, Math.round(5 / hopTime));
    const driftLagLo = Math.max(lagMin, Math.floor(globalPeriodFrames * 0.85));
    const driftLagHi = Math.min(lagMax, Math.ceil(globalPeriodFrames * 1.15));
    const localCurve = [];
    for (let start = 0; start < numFrames; start += strideFrames) {
      const end = Math.min(numFrames, start + windowFrames);
      if (end - start < windowFrames * 0.5) break;
      let bestLag = Math.round(globalPeriodFrames), bestVal = -Infinity;
      for (let lag = driftLagLo; lag <= driftLagHi && lag < (end - start); lag++) {
        let sum = 0;
        const n = (end - start) - lag;
        for (let i = 0; i < n; i++) sum += centered[start + i] * centered[start + i + lag];
        const v = n > 0 ? sum / n : 0;
        if (v > bestVal) { bestVal = v; bestLag = lag; }
      }
      localCurve.push({ frame: start + (end - start) / 2, period: bestLag });
    }
    if (!localCurve.length) localCurve.push({ frame: numFrames / 2, period: globalPeriodFrames });

    const periodAtFrame = (frame) => {
      if (frame <= localCurve[0].frame) return localCurve[0].period;
      for (let i = 1; i < localCurve.length; i++) {
        if (frame <= localCurve[i].frame) {
          const a = localCurve[i - 1], b = localCurve[i];
          const span = b.frame - a.frame;
          const ratio = span > 0 ? (frame - a.frame) / span : 0;
          return a.period + (b.period - a.period) * ratio;
        }
      }
      return localCurve[localCurve.length - 1].period;
    };
    if (onProgress) onProgress(0.7);

    // ---- DP beat tracking (Ellis 2007): regular grid, max onset strength ----
    const cumscore = new Float64Array(numFrames);
    const backlink = new Int32Array(numFrames).fill(-1);
    const ALPHA = 6; // spacing-penalty tightness

    for (let i = 0; i < numFrames; i++) {
      const tau = Math.max(1, periodAtFrame(i));
      // keep spacing within the local drift tolerance (no octave jumps to
      // half/double-time subdivisions - those are decided by Level.generate)
      const searchLo = Math.max(0, Math.floor(i - tau * 1.15));
      const searchHi = Math.min(i - 1, Math.floor(i - tau * 0.85));
      let best = -Infinity, bestJ = -1;
      for (let j = searchLo; j <= searchHi; j++) {
        const delta = i - j;
        const penalty = -ALPHA * Math.pow(Math.log(delta / tau), 2);
        const score = cumscore[j] + penalty;
        if (score > best) { best = score; bestJ = j; }
      }
      cumscore[i] = flux[i] + Math.max(0, best);
      backlink[i] = best > 0 ? bestJ : -1;

      if (onProgress && (i & 2047) === 0) {
        onProgress(0.7 + 0.15 * (i / numFrames));
        await yieldToUI();
      }
    }
    if (onProgress) onProgress(0.85);

    // pick the best-scoring frame within the last beat period, then backtrack
    const lastPeriod = Math.max(1, Math.round(periodAtFrame(numFrames - 1)));
    let endIdx = numFrames - 1, endVal = -Infinity;
    for (let i = Math.max(0, numFrames - lastPeriod); i < numFrames; i++) {
      if (cumscore[i] > endVal) { endVal = cumscore[i]; endIdx = i; }
    }
    const beatFramesRev = [];
    for (let cur = endIdx; cur >= 0; cur = backlink[cur]) beatFramesRev.push(cur);
    let beatTimes = beatFramesRev.reverse().map(f => f * hopTime);
    if (!beatTimes.length) beatTimes = [0];

    // ---- quantize: fill skipped beats and extend to cover the whole song,
    // so every gameplay element snaps to the grid ----
    const filled = [beatTimes[0]];
    for (let i = 1; i < beatTimes.length; i++) {
      const a = filled[filled.length - 1];
      const b = beatTimes[i];
      const tau = periodAtFrame(Math.round(((a + b) / 2) / hopTime)) * hopTime;
      const steps = tau > 0 ? Math.max(1, Math.round((b - a) / tau)) : 1;
      for (let s = 1; s < steps; s++) filled.push(a + (b - a) * (s / steps));
      filled.push(b);
    }
    beatTimes = filled;

    while (beatTimes[0] > 1e-6) {
      const tau = periodAtFrame(Math.max(0, Math.round(beatTimes[0] / hopTime))) * hopTime;
      const next = beatTimes[0] - tau;
      beatTimes.unshift(Math.max(0, next));
      if (next <= 0) break;
    }

    while (beatTimes[beatTimes.length - 1] < duration) {
      const lastT = beatTimes[beatTimes.length - 1];
      const tau = periodAtFrame(Math.min(numFrames - 1, Math.round(lastT / hopTime))) * hopTime;
      if (tau <= 0) break;
      const next = lastT + tau;
      if (next > duration + tau * 0.5) break;
      beatTimes.push(next);
    }

    beatTimes = beatTimes.filter((v, i, arr) => i === 0 || v > arr[i - 1] + 1e-6);
    if (onProgress) onProgress(0.9);

    // ---- section detection (intro/chill/build/drop) from total energy ----
    const sectionWindowSec = 2;
    const framesPerSection = Math.max(1, Math.round(sectionWindowSec / hopTime));
    const numSections = Math.max(1, Math.ceil(numFrames / framesPerSection));
    const sectionEnergy = new Float64Array(numSections);
    for (let s = 0; s < numSections; s++) {
      const start = s * framesPerSection;
      const end = Math.min(numFrames, start + framesPerSection);
      let sum = 0, count = 0;
      for (let f = start; f < end; f++) { sum += totalEnergy[f]; count++; }
      sectionEnergy[s] = count ? sum / count : 0;
    }
    let maxSectionEnergy = 1e-9;
    for (let s = 0; s < numSections; s++) if (sectionEnergy[s] > maxSectionEnergy) maxSectionEnergy = sectionEnergy[s];
    const sections = [];
    for (let i = 0; i < numSections; i++) {
      const norm = sectionEnergy[i] / maxSectionEnergy;
      let type;
      if (norm < 0.35) type = (i < numSections * 0.12) ? 'intro' : 'chill';
      else if (norm < 0.65) type = 'build';
      else type = 'drop';
      sections.push({ time: i * sectionWindowSec, duration: sectionWindowSec, type, intensity: norm });
    }
    const sectionAt = (time) => sections[Math.min(sections.length - 1, Math.floor(time / sectionWindowSec))].type;

    // ---- per-grid-beat band energies: decide WHAT goes on each slot ----
    const bassVals = [], vocalVals = [], highVals = [];
    beatTimes.forEach((time) => {
      const fIdx = Math.min(numFrames - 1, Math.max(0, Math.round(time / hopTime)));
      bassVals.push(bassEnergy[fIdx]);
      vocalVals.push(vocalEnergy[fIdx]);
      highVals.push(highEnergy[fIdx]);
    });
    const maxBass = Math.max(...bassVals, 1e-9);
    const maxVocal = Math.max(...vocalVals, 1e-9);
    const maxHigh = Math.max(...highVals, 1e-9);
    const medianBass = median(bassVals) || 1e-9;

    const beats = beatTimes.map((time, i) => {
      const bass = bassVals[i] / maxBass;
      return {
        time,
        energy: bass,
        bass,
        vocal: vocalVals[i] / maxVocal,
        high: highVals[i] / maxHigh,
        type: bassVals[i] >= medianBass * 1.15 ? 'strong' : 'weak',
        section: sectionAt(time),
      };
    });
    const bassBeats = beats.map(b => ({ time: b.time, energy: b.bass, section: b.section }));
    const beatGrid = beats.map(b => b.time);

    const beatInterval = 60 / bpm;
    const phase = beatGrid.length ? ((beatGrid[0] % beatInterval) + beatInterval) % beatInterval : 0;

    // ---- A5 QA: grid stability from interval regularity ----
    let gridStability = 1;
    if (beatGrid.length > 2) {
      const intervals = [];
      for (let i = 1; i < beatGrid.length; i++) intervals.push(beatGrid[i] - beatGrid[i - 1]);
      const meanInterval = mean(intervals);
      const variance = mean(intervals.map(v => (v - meanInterval) * (v - meanInterval)));
      gridStability = meanInterval > 0 ? clamp01(1 - Math.sqrt(variance) / meanInterval) : 0;
    }

    const intensity = sections.reduce((a, s) => a + s.intensity, 0) / sections.length;
    if (onProgress) onProgress(1);

    return {
      bpm: Math.round(bpm),
      phase,
      duration,
      beats,
      bassBeats,
      beatGrid,
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

    const analysis = {
      bpm,
      phase: 0,
      duration,
      beats,
      bassBeats,
      beatGrid,
      confidence: 1,
      gridStability: 1,
      sections: [{ time: 0, duration, type: 'chill', intensity: 0.5 }],
      intensity: 0.5,
      sampleRate,
      waveform: [],
    };

    return { buffer, analysis };
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
    playBassThump,
    normalizeTunerSettings, defaultTunerSettings,
    TAP_SOUNDS, playTapSound,
  };
})();

/* ============================================================
   MicEngine - live mic mode
   getUserMedia + AnalyserNode realtime onset detection.
   Continuously estimates BPM; emits onset events used by the
   game's lookahead obstacle spawner.
   ============================================================ */
const MicEngine = (() => {
  let audioCtx, analyser, source, stream;
  let dataArray, freqBinCount;
  let running = false;
  let onsetCallback = null;
  let energyHistory = [];
  let onsetTimes = [];
  let bpmEstimate = 120;
  let rafId = null;
  let permissionDenied = false;

  async function start() {
    audioCtx = AudioEngine.getContext();
    permissionDenied = false;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      permissionDenied = true;
      throw e;
    }
    source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    source.connect(analyser);
    freqBinCount = analyser.frequencyBinCount;
    dataArray = new Uint8Array(freqBinCount);
    energyHistory = [];
    onsetTimes = [];
    bpmEstimate = 120;
    running = true;
    loop();
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (source) { try { source.disconnect(); } catch (e) {} source = null; }
  }

  function loop() {
    if (!running) return;
    analyser.getByteFrequencyData(dataArray);
    const sampleRate = audioCtx.sampleRate;
    const binHz = sampleRate / analyser.fftSize;
    const bassLow = Math.max(1, Math.floor(60 / binHz));
    const bassHigh = Math.min(freqBinCount - 1, Math.ceil(150 / binHz));

    let bassSum = 0, totalSum = 0;
    for (let i = 0; i < freqBinCount; i++) {
      const v = dataArray[i] / 255;
      totalSum += v * v;
      if (i >= bassLow && i <= bassHigh) bassSum += v * v;
    }
    const broadband = totalSum / freqBinCount;
    const bass = bassSum / (bassHigh - bassLow + 1);
    const combined = 0.4 * broadband + 0.6 * bass;

    energyHistory.push(combined);
    const maxHistory = 60; // ~1s @ 60fps
    if (energyHistory.length > maxHistory) energyHistory.shift();
    const avg = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;

    const now = audioCtx.currentTime;
    const minSpacing = bpmEstimate ? (60 / bpmEstimate) * 0.45 : 0.25;
    const last = onsetTimes[onsetTimes.length - 1];
    if (combined > avg * 1.35 && combined > 0.015 && (!last || now - last > minSpacing)) {
      const type = combined > avg * 1.9 ? 'strong' : 'weak';
      onsetTimes.push(now);
      if (onsetTimes.length > 8) onsetTimes.shift();
      updateBPM();
      if (onsetCallback) onsetCallback({ time: now, energy: combined, type, predictedInterval: getBeatInterval() });
    }

    rafId = requestAnimationFrame(loop);
  }

  function updateBPM() {
    if (onsetTimes.length < 2) return;
    const intervals = [];
    for (let i = 1; i < onsetTimes.length; i++) intervals.push(onsetTimes[i] - onsetTimes[i - 1]);
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    if (median <= 0) return;
    let bpm = 60 / median;
    while (bpm < 70) bpm *= 2;
    while (bpm > 180) bpm /= 2;
    bpmEstimate = onsetTimes.length < 4 ? bpm : (bpmEstimate * 0.7 + bpm * 0.3);
  }

  function getBeatInterval() { return 60 / bpmEstimate; }
  function getBPM() { return Math.round(bpmEstimate); }
  function getFrequencyData() { return dataArray; }
  function getOnsetCount() { return onsetTimes.length; }
  function wasPermissionDenied() { return permissionDenied; }

  return {
    start, stop, getBeatInterval, getBPM, getFrequencyData, getOnsetCount,
    wasPermissionDenied,
    set onBeat(cb) { onsetCallback = cb; },
    get analyser() { return analyser; },
    get isRunning() { return running; },
  };
})();
