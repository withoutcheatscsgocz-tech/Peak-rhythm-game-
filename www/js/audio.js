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

  /** Rolling-average (~1s) peak picking with a minimum spacing -> onset list. */
  function detectOnsets(energy, max, windowsPerSec, sensitivity, minSpacingSec) {
    const numWindows = energy.length;
    const norm = new Float32Array(numWindows);
    for (let w = 0; w < numWindows; w++) norm[w] = energy[w] / max;

    const avgWindow = Math.max(1, Math.round(windowsPerSec));
    const rollingAvg = new Float32Array(numWindows);
    let sum = 0;
    for (let w = 0; w < numWindows; w++) {
      sum += norm[w];
      if (w >= avgWindow) sum -= norm[w - avgWindow];
      rollingAvg[w] = sum / Math.min(w + 1, avgWindow);
    }

    const minSpacingWindows = Math.max(1, Math.round(minSpacingSec * windowsPerSec));
    const onsets = [];
    let lastOnsetWindow = -minSpacingWindows;
    for (let w = 1; w < numWindows - 1; w++) {
      if (norm[w] > rollingAvg[w] * sensitivity &&
          norm[w] >= norm[w - 1] && norm[w] >= norm[w + 1] &&
          (w - lastOnsetWindow) >= minSpacingWindows) {
        onsets.push({ index: w, energy: norm[w] });
        lastOnsetWindow = w;
      }
    }
    return onsets;
  }

  /**
   * Full offline analysis pipeline: bandpass-filters the mono mix down to the
   * bass band (~40-150Hz, where kick/bass-drum hits live) and runs
   * rolling-average onset detection on its windowed energy to find
   * bassBeats -> the spike obstacles' beat timeline. A 512-sample window
   * (~11.6ms @ 44.1kHz) keeps onset times closely aligned to the audible hit.
   * A combined `beats` array is also returned for backward-compat (metronome
   * ring, BPM ONLY clicks, tuner overview).
   */
  async function analyze(audioBuffer, tunerSettings, onProgress) {
    const t = normalizeTunerSettings(tunerSettings);

    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

    // mono mixdown
    const mid = new Float32Array(length);
    for (let i = 0; i < length; i++) mid[i] = (left[i] + right[i]) * 0.5;
    if (onProgress) onProgress(0.1);

    const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
    const midBuf = offlineCtx.createBuffer(1, length, sampleRate);
    midBuf.copyToChannel(mid, 0);
    const midSrc = offlineCtx.createBufferSource();
    midSrc.buffer = midBuf;

    const bassFilter = offlineCtx.createBiquadFilter();
    bassFilter.type = 'bandpass';
    bassFilter.frequency.value = 85; // center of ~40-150Hz
    bassFilter.Q.value = 1.0;
    midSrc.connect(bassFilter);
    bassFilter.connect(offlineCtx.destination);

    midSrc.start();
    const rendered = await offlineCtx.startRendering();
    if (onProgress) onProgress(0.45);

    const bassData = rendered.getChannelData(0);

    // windowed bass energy
    const windowSize = 512;
    const numWindows = Math.floor(length / windowSize);
    const bassEnergy = new Float32Array(numWindows);
    let maxBass = 1e-9;

    for (let w = 0; w < numWindows; w++) {
      const start = w * windowSize;
      let sumBass = 0;
      for (let i = 0; i < windowSize; i++) {
        const b = bassData[start + i];
        sumBass += b * b;
      }
      const eBass = sumBass / windowSize;
      bassEnergy[w] = eBass;
      if (eBass > maxBass) maxBass = eBass;
    }
    if (onProgress) onProgress(0.7);

    const windowsPerSec = sampleRate / windowSize;
    const bassOnsets = detectOnsets(bassEnergy, maxBass, windowsPerSec, t.bass.sensitivity, t.bass.minSpacing);
    if (onProgress) onProgress(0.85);

    const bassBeats = bassOnsets.map(o => ({
      time: (o.index * windowSize) / sampleRate, energy: o.energy, band: 'bass',
    }));

    // BPM = median interval of bass onsets (the rhythmic backbone)
    let bpm = 120;
    if (bassBeats.length > 1) {
      const intervals = [];
      for (let i = 1; i < bassBeats.length; i++) intervals.push(bassBeats[i].time - bassBeats[i - 1].time);
      intervals.sort((a, b) => a - b);
      const median = intervals[Math.floor(intervals.length / 2)];
      if (median > 0) {
        bpm = 60 / median;
        while (bpm < 70) bpm *= 2;
        while (bpm > 180) bpm /= 2;
      }
    }

    // section detection via rolling RMS over 2s windows of the mono mix
    const sectionWindowSec = 2;
    const sectionWindowSize = Math.round(sectionWindowSec * sampleRate);
    const numSections = Math.max(1, Math.ceil(length / sectionWindowSize));
    const sectionRMS = new Float32Array(numSections);
    for (let s = 0; s < numSections; s++) {
      let sumSq = 0, count = 0;
      const start = s * sectionWindowSize;
      const end = Math.min(length, start + sectionWindowSize);
      for (let i = start; i < end; i += 4) { sumSq += mid[i] * mid[i]; count++; }
      sectionRMS[s] = count ? Math.sqrt(sumSq / count) : 0;
    }
    const maxRMS = Math.max(...sectionRMS) || 1e-9;
    const sections = [];
    for (let i = 0; i < numSections; i++) {
      const norm = sectionRMS[i] / maxRMS;
      let type;
      if (norm < 0.35) type = (i < numSections * 0.12) ? 'intro' : 'chill';
      else if (norm < 0.65) type = 'build';
      else type = 'drop';
      sections.push({ time: i * sectionWindowSec, duration: sectionWindowSec, type, intensity: norm });
    }

    const sectionAt = (time) => sections[Math.min(sections.length - 1, Math.floor(time / sectionWindowSec))].type;
    bassBeats.forEach(b => { b.section = sectionAt(b.time); });

    // combined beats for backward-compat (metronome ring, BPM ONLY clicks, tuner overview)
    const beats = bassBeats.map(b => ({ time: b.time, energy: b.energy, type: 'strong', section: b.section, band: 'bass' }));

    const intensity = sections.reduce((a, s) => a + s.intensity, 0) / sections.length;

    if (onProgress) onProgress(1);

    return {
      bpm: Math.round(bpm),
      duration: audioBuffer.duration,
      beats,
      bassBeats,
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
    const bassBeats = [];
    for (let i = 0; i < totalBeats; i++) {
      const strong = i % 4 === 0;
      const time = i * beatInterval;
      beats.push({
        time,
        energy: strong ? 1 : 0.5,
        type: strong ? 'strong' : 'weak',
        section: 'chill',
      });
      bassBeats.push({ time, energy: strong ? 1 : 0.6, section: 'chill' });
    }

    const analysis = {
      bpm,
      duration,
      beats,
      bassBeats,
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

    const masterGain = audioCtx.createGain();
    masterGain.gain.value = opts.muted ? 0 : (opts.gain != null ? opts.gain : 1);

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.65;

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
      dryGain.connect(masterGain);
      wetGain.connect(masterGain);
    } else {
      source.connect(masterGain);
    }

    masterGain.connect(analyser);
    analyser.connect(audioCtx.destination);

    return { source, masterGain, analyser };
  }

  return {
    getContext, decodeFile, hashAudioBuffer, mixToMono, analyze,
    createReverbImpulse, playTick, playClick, createPlaybackChain,
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
