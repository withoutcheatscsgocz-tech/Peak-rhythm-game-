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

  /**
   * Full offline analysis pipeline:
   *  1. mixdown to mono
   *  2. bandpass-filter (60-150Hz) via OfflineAudioContext for the bass band
   *  3. windowed energy (1024 samples) for broadband + bass
   *  4. rolling-average (~1s) peak picking -> onset list
   *  5. BPM = median of onset intervals
   *  6. STRONG/WEAK classification by energy
   *  7. section detection (intro/chill/build/drop) via rolling RMS
   */
  async function analyze(audioBuffer, tunerSettings, onProgress) {
    const sensitivity = (tunerSettings && tunerSettings.sensitivity) || 1.3;
    const minSpacing = (tunerSettings && tunerSettings.minSpacing) || 0.22;
    const bassEmphasis = (tunerSettings && tunerSettings.bassEmphasis) != null ? tunerSettings.bassEmphasis : 0.6;

    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const mono = mixToMono(audioBuffer);
    if (onProgress) onProgress(0.2);

    // bass-band filtered signal
    const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
    const buf = offlineCtx.createBuffer(1, length, sampleRate);
    buf.copyToChannel(mono, 0);
    const src = offlineCtx.createBufferSource();
    src.buffer = buf;
    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 100; // center of 60-150Hz
    filter.Q.value = 0.9;
    src.connect(filter);
    filter.connect(offlineCtx.destination);
    src.start();
    const filtered = await offlineCtx.startRendering();
    const bassData = filtered.getChannelData(0);
    if (onProgress) onProgress(0.5);

    // windowed energy
    const windowSize = 1024;
    const numWindows = Math.floor(length / windowSize);
    const broadband = new Float32Array(numWindows);
    const bassEnergy = new Float32Array(numWindows);
    let maxB = 1e-9, maxBass = 1e-9;
    for (let w = 0; w < numWindows; w++) {
      let sumB = 0, sumBass = 0;
      const start = w * windowSize;
      for (let i = 0; i < windowSize; i++) {
        const s = mono[start + i];
        sumB += s * s;
        const bs = bassData[start + i];
        sumBass += bs * bs;
      }
      const eB = sumB / windowSize;
      const eBass = sumBass / windowSize;
      broadband[w] = eB;
      bassEnergy[w] = eBass;
      if (eB > maxB) maxB = eB;
      if (eBass > maxBass) maxBass = eBass;
    }
    if (onProgress) onProgress(0.7);

    const combined = new Float32Array(numWindows);
    for (let w = 0; w < numWindows; w++) {
      combined[w] = (1 - bassEmphasis) * (broadband[w] / maxB) + bassEmphasis * (bassEnergy[w] / maxBass);
    }

    // rolling average (~1s)
    const windowsPerSec = sampleRate / windowSize;
    const avgWindow = Math.max(1, Math.round(windowsPerSec));
    const rollingAvg = new Float32Array(numWindows);
    let sum = 0;
    for (let w = 0; w < numWindows; w++) {
      sum += combined[w];
      if (w >= avgWindow) sum -= combined[w - avgWindow];
      rollingAvg[w] = sum / Math.min(w + 1, avgWindow);
    }

    // peak picking with min spacing
    const minSpacingWindows = Math.max(1, Math.round(minSpacing * windowsPerSec));
    const beats = [];
    let lastOnsetWindow = -minSpacingWindows;
    for (let w = 1; w < numWindows - 1; w++) {
      if (combined[w] > rollingAvg[w] * sensitivity &&
          combined[w] >= combined[w - 1] && combined[w] >= combined[w + 1] &&
          (w - lastOnsetWindow) >= minSpacingWindows) {
        beats.push({
          time: (w * windowSize) / sampleRate,
          energy: combined[w],
          bassRatio: bassEnergy[w] / maxBass,
        });
        lastOnsetWindow = w;
      }
    }
    if (onProgress) onProgress(0.85);

    // BPM = median of onset intervals, normalized into 70-180 range
    let bpm = 120;
    if (beats.length > 1) {
      const intervals = [];
      for (let i = 1; i < beats.length; i++) intervals.push(beats[i].time - beats[i - 1].time);
      intervals.sort((a, b) => a - b);
      const median = intervals[Math.floor(intervals.length / 2)];
      if (median > 0) {
        bpm = 60 / median;
        while (bpm < 70) bpm *= 2;
        while (bpm > 180) bpm /= 2;
      }
    }

    // STRONG vs WEAK by median energy
    if (beats.length) {
      const energies = beats.map(b => b.energy).slice().sort((a, b) => a - b);
      const medianEnergy = energies[Math.floor(energies.length / 2)];
      beats.forEach(b => { b.type = b.energy >= medianEnergy ? 'strong' : 'weak'; });
    }

    // section detection via rolling RMS over 2s windows
    const sectionWindowSec = 2;
    const sectionWindowSize = Math.round(sectionWindowSec * sampleRate);
    const numSections = Math.max(1, Math.ceil(length / sectionWindowSize));
    const sectionRMS = new Float32Array(numSections);
    for (let s = 0; s < numSections; s++) {
      let sumSq = 0, count = 0;
      const start = s * sectionWindowSize;
      const end = Math.min(length, start + sectionWindowSize);
      for (let i = start; i < end; i += 4) { sumSq += mono[i] * mono[i]; count++; }
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

    beats.forEach(b => {
      const idx = Math.min(sections.length - 1, Math.floor(b.time / sectionWindowSec));
      b.section = sections[idx].type;
    });

    const intensity = sections.reduce((a, s) => a + s.intensity, 0) / sections.length;

    if (onProgress) onProgress(1);

    return {
      bpm: Math.round(bpm),
      duration: audioBuffer.duration,
      beats,
      sections,
      intensity,
      sampleRate,
      waveform: downsampleForWaveform(mono, 1000),
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
