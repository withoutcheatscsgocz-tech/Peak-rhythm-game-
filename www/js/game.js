/* ============================================================
   ONE DOT - game.js
   Core gameplay engine: render loop, physics, scoring,
   modifiers, juice effects, replay capture.
   All timing derives from audioCtx.currentTime.
   ============================================================ */

const Game = (() => {
  // ---------------- constants ----------------
  const PERFECT_WINDOW = 0.12;
  const GOOD_WINDOW = 0.20;
  const WIDE_PERFECT = 0.18;
  const WIDE_GOOD = 0.28;
  const BASE_SCROLL_SPEED = 320; // px/song-second at 120bpm
  const DOT_X_RATIO = 0.24;
  const GROUND_Y_RATIO = 0.62;
  const DOT_RADIUS = 16;
  const ARC_HEIGHT_RATIO = 0.16; // bounce arc height at a 1-beat gap, as a fraction of screen height
  const ARC_HEIGHT_MIN_RATIO = 0.05;
  const ARC_HEIGHT_MAX_RATIO = 0.30;
  const GOOD_ARC_SCALE = 0.45; // C4: a GOOD landing makes the *next* arc lower/flatter
  const ROLL_SPIKE_LIMIT = 8;
  const MAX_PARTICLES = 400;
  const POINTS = { perfectStrong: 250, goodStrong: 100 };

  const SECTION_COLORS = {
    intro: { r: 106, g: 141, b: 255 },
    chill: { r: 106, g: 141, b: 255 },
    build: { r: 60, g: 255, b: 176 },
    drop: { r: 255, g: 90, b: 60 },
  };

  const MODIFIER_DEFS = [
    { id: 'slowed', name: 'SLOWED + REVERB \u{1F317}', desc: 'Song at 0.8x speed with dreamy reverb & purple haze', mult: 0.7, group: 'speed', value: 0.8 },
    { id: 'autoJump', name: 'AUTO-BOUNCE', desc: 'The ball lands perfectly on every spike automatically - just enjoy', mult: 0.3, group: 'auto' },
    { id: 'noFail', name: 'NO FAIL', desc: 'Hits never restart, only reset your combo', mult: 0.5 },
    { id: 'widerWindows', name: 'WIDER WINDOWS', desc: 'Perfect ±180ms, Good ±280ms', mult: 0.8 },
    { id: 'rush', name: 'RUSH 1.25x', desc: 'Song at 1.25x speed', mult: 1.5, group: 'speed', value: 1.25 },
    { id: 'insane', name: 'INSANE 1.5x', desc: 'Song at 1.5x speed', mult: 2, group: 'speed', value: 1.5, hard: true },
    { id: 'bpmOnly', name: 'BPM ONLY', desc: 'Music muted - synthesized metronome only', mult: 1.6, hard: true },
    { id: 'blindRing', name: 'BLIND RING', desc: 'No metronome assist ring - ears only', mult: 1.4, hard: true },
    { id: 'suddenDeath', name: 'SUDDEN DEATH', desc: '1 hit = restart from checkpoint', mult: 1.8, hard: true },
    { id: 'ghostDot', name: 'GHOST DOT', desc: 'Dot fades to near-invisible while airborne', mult: 1.3, hard: true },
  ];

  function computeMultiplier(active) {
    let m = 1;
    MODIFIER_DEFS.forEach(def => { if (active.has(def.id)) m *= def.mult; });
    return m;
  }

  /** Returns ids that must be force-disabled given the active set (sanity rules). */
  function getConstraints(active) {
    const forceOff = new Set();
    if (active.has('autoJump')) {
      ['rush', 'insane', 'bpmOnly', 'blindRing', 'suddenDeath', 'ghostDot'].forEach(id => forceOff.add(id));
    }
    return forceOff;
  }

  function getWindows(active) {
    if (active.has('widerWindows')) return { perfect: WIDE_PERFECT, good: WIDE_GOOD };
    return { perfect: PERFECT_WINDOW, good: GOOD_WINDOW };
  }

  // ---------------- skin renderers (procedural, theme-colored) ----------------
  const SKIN_DEFS = [
    { id: 'classic', name: 'CLASSIC' },
    { id: 'star', name: 'STAR' },
    { id: 'comet', name: 'COMET' },
    { id: 'smiley', name: 'SMILEY' },
    { id: 'diamond', name: 'DIAMOND' },
    { id: 'pulsar', name: 'PULSAR' },
  ];

  const SKIN_RENDERERS = {
    classic(ctx, x, y, r, color) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    },
    star(ctx, x, y, r, color, t) {
      const spikes = 5;
      const outerR = r * 1.25, innerR = r * 0.55;
      const rot = t * 0.6;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const rad = i % 2 === 0 ? outerR : innerR;
        const ang = rot + (Math.PI / spikes) * i;
        const px = x + Math.cos(ang) * rad, py = y + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
    },
    comet(ctx, x, y, r, color) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    },
    smiley(ctx, x, y, r, color) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y + r * 0.05, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.lineWidth = r * 0.14; ctx.strokeStyle = '#000'; ctx.lineCap = 'round'; ctx.stroke();
    },
    diamond(ctx, x, y, r, color, t) {
      const rot = t * 0.4;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot + Math.PI / 4);
      ctx.fillStyle = color;
      ctx.fillRect(-r * 0.78, -r * 0.78, r * 1.56, r * 1.56);
      ctx.restore();
    },
    pulsar(ctx, x, y, r, color, t) {
      ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r * 1.35 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
      ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.globalAlpha = 0.6; ctx.stroke();
      ctx.globalAlpha = 1;
    },
  };

  // ---------------- particle pool (zero-allocation render loop) ----------------
  const particles = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, color: '' });
  }
  let particleCursor = 0;
  function spawnParticle(x, y, vx, vy, life, size, color) {
    const p = particles[particleCursor];
    particleCursor = (particleCursor + 1) % MAX_PARTICLES;
    p.active = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = life; p.maxLife = life; p.size = size; p.color = color;
  }
  function spawnBurst(x, y, color, count, speedMul) {
    speedMul = speedMul || 1;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (60 + Math.random() * 160) * speedMul;
      spawnParticle(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd - 40,
        0.5 + Math.random() * 0.5, 2 + Math.random() * 4, color);
    }
  }
  function updateParticles(dt, fadeMul) {
    fadeMul = fadeMul || 1;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      if (!p.active) continue;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 360 * dt;
      p.life -= dt / fadeMul;
      if (p.life <= 0) p.active = false;
    }
  }
  function renderParticles(ctx) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, p.size * alpha), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------------- replay recorder (rolling ~5s WebM) ----------------
  class ReplayRecorder {
    constructor(sourceCanvas) {
      this.sourceCanvas = sourceCanvas;
      this.enabled = false;
      this.lastBlob = null;
      this.recorder = null;
      this.chunks = [];
      this.cycleTimer = null;
      this.offscreen = document.createElement('canvas');
      this.offscreen.width = 304;
      this.offscreen.height = 540;
      this.offCtx = this.offscreen.getContext('2d');
    }
    start() {
      if (!('MediaRecorder' in window) || !this.sourceCanvas.captureStream) return;
      this.enabled = true;
      try {
        this.stream = this.offscreen.captureStream(20);
        this._startCycle();
      } catch (e) { this.enabled = false; }
    }
    _startCycle() {
      if (!this.enabled) return;
      this.chunks = [];
      try {
        this.recorder = new MediaRecorder(this.stream, { mimeType: 'video/webm;codecs=vp8' });
      } catch (e) {
        try { this.recorder = new MediaRecorder(this.stream); } catch (e2) { this.enabled = false; return; }
      }
      this.recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) this.chunks.push(e.data); };
      this.recorder.onstop = () => {
        if (this.chunks.length) this.lastBlob = new Blob(this.chunks, { type: 'video/webm' });
        if (this.enabled) this._startCycle();
      };
      this.recorder.start();
      this.cycleTimer = setTimeout(() => {
        if (this.recorder && this.recorder.state === 'recording') this.recorder.stop();
      }, 5000);
    }
    drawFrame(sourceCanvas) {
      if (!this.enabled) return;
      const ow = this.offscreen.width, oh = this.offscreen.height;
      this.offCtx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, ow, oh);
    }
    capture() { return this.lastBlob; }
    stop() {
      this.enabled = false;
      if (this.cycleTimer) clearTimeout(this.cycleTimer);
      if (this.recorder && this.recorder.state === 'recording') {
        try { this.recorder.stop(); } catch (e) {}
      }
    }
  }

  // ---------------- module state ----------------
  let canvas, ctx, fxCanvas, fxCtx;
  let width = 0, height = 0, dpr = 1;
  let groundY = 0, dotX = 0;
  let prevFrameCanvas = null, prevFrameCtx = null;
  let lastDesatPct = -1;

  let audioCtx = null;
  let playback = null; // { source, masterGain, analyser }
  let replayRecorder = null;

  let running = false;
  let isPaused = false;
  let rafId = null;

  // session config
  let session = null; // see configure()

  // ---------------- utility helpers ----------------
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpColor(c1, c2, t) {
    return `rgb(${Math.round(lerp(c1.r, c2.r, t))},${Math.round(lerp(c1.g, c2.g, t))},${Math.round(lerp(c1.b, c2.b, t))})`;
  }
  function lerpColorAlpha(c1, c2, t, a) {
    return `rgba(${Math.round(lerp(c1.r, c2.r, t))},${Math.round(lerp(c1.g, c2.g, t))},${Math.round(lerp(c1.b, c2.b, t))},${a})`;
  }

  // ---------------- init ----------------
  function init(gameCanvas, fxCanvasEl) {
    canvas = gameCanvas;
    ctx = canvas.getContext('2d');
    fxCanvas = fxCanvasEl;
    fxCtx = fxCanvas.getContext('2d');
    prevFrameCanvas = document.createElement('canvas');
    prevFrameCtx = prevFrameCanvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fxCanvas.width = canvas.width; fxCanvas.height = canvas.height;
    fxCanvas.style.width = width + 'px'; fxCanvas.style.height = height + 'px';
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    prevFrameCanvas.width = canvas.width; prevFrameCanvas.height = canvas.height;
    groundY = height * GROUND_Y_RATIO;
    dotX = width * DOT_X_RATIO;
  }

  // ---------------- configure / session ----------------
  function configure(opts) {
    audioCtx = AudioEngine.getContext();
    const modifiers = opts.modifiers instanceof Set ? opts.modifiers : new Set(opts.modifiers || []);
    const multiplier = computeMultiplier(modifiers);
    const windows = getWindows(modifiers);

    let playbackRate = 1;
    if (modifiers.has('slowed')) playbackRate = 0.8;
    else if (modifiers.has('rush')) playbackRate = 1.25;
    else if (modifiers.has('insane')) playbackRate = 1.5;

    const track = opts.levelData ? opts.levelData.track.map(t => Object.assign({}, t, { hit: false, hitType: null })) : [];
    const carry = opts.carryState || {};

    let initialTrackIndex = 0;
    if (opts.practice) {
      const idx = track.findIndex(t => t.time >= opts.practice.loopStart);
      initialTrackIndex = idx < 0 ? track.length : idx;
    }

    session = {
      mode: opts.mode || 'file',
      audioBuffer: opts.audioBuffer || null,
      analysis: opts.analysis || null,
      levelData: opts.levelData || null,
      songMeta: opts.songMeta || {},
      modifiers, multiplier, windows, playbackRate,
      track, trackIndex: initialTrackIndex,
      checkpoints: (opts.levelData && opts.levelData.checkpoints) || [0],
      checkpointIndex: 0,
      duration: (opts.levelData && opts.levelData.duration) || (opts.audioBuffer && opts.audioBuffer.duration) || Infinity,
      startOffset: opts.startOffset || 0,
      startAudioTime: 0, lastRealTime: 0, elapsedPlayTime: 0,
      dotY: 0, ballState: 'bounce', arcGrade: 'perfect', desaturation: 0,
      arcStartTime: opts.practice ? opts.practice.loopStart : (opts.startOffset || 0),
      rollSpikesPassed: 0, rollSpikeLimit: modifiers.has('suddenDeath') ? 1 : ROLL_SPIKE_LIMIT,
      rollTimeSec: 0,
      score: carry.score || 0, baseScore: carry.baseScore || 0,
      combo: carry.combo || 0, maxCombo: carry.maxCombo || 0,
      perfectCount: carry.perfectCount || 0, goodCount: carry.goodCount || 0, hitCount: carry.hitCount || 0,
      jumps: carry.jumps || 0,
      perfectStreak: 0, perfectStreaksOf10Count: 0,
      inDrop: false, dropHasHit: false, dropSurvivedNoHit: false,
      ringBeatIndex: 0, trailHistory: [],
      comboFlashUntilReal: 0,
      hitStopUntilReal: 0, frozenSongTime: 0,
      screenShakeMag: 0, screenShakeUntilReal: 0,
      chromaUntilReal: 0,
      ghostData: opts.ghostData || null, ghostDelta: 0,
      practice: opts.practice || null,
      practicePassHits: 0, practiceCleanPasses: 0,
      pauseOnCheckpoint: !!opts.pauseOnCheckpoint,
      nextClickIndex: 0,
      nextGuideIndex: 0,
      finished: false, gameOver: false, completing: false,
      bgEnergy: 0,
      hitHistory: carry.hitHistory || [],
      syncOffsets: [],
    };

    const bpm = (session.levelData && session.levelData.bpm) || 120;
    const baseInterval = 60 / bpm;
    session.beatInterval = session.practice ? baseInterval * (session.playbackRate * 0.6) : baseInterval / session.playbackRate;

    saveCheckpointSnapshot();

    if (session.audioBuffer) setupPlaybackChain();

    if (replayRecorder) replayRecorder.stop();
    replayRecorder = new ReplayRecorder(canvas);
    if (Storage.getSettings().replayEnabled && !session.practice) replayRecorder.start();

    session.dotY = groundY - DOT_RADIUS;
    session.accentColor = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#ffffff';
    popups.length = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) particles[i].active = false;
    particleCursor = 0;
  }

  function saveCheckpointSnapshot() {
    session.checkpointSnapshot = {
      trackIndex: session.trackIndex,
      score: session.score, baseScore: session.baseScore,
      perfectCount: session.perfectCount, goodCount: session.goodCount, hitCount: session.hitCount,
      songTime: session.checkpoints[session.checkpointIndex] || 0,
      hitHistory: session.hitHistory.slice(),
    };
  }

  function setupPlaybackChain() {
    const chainOpts = {
      playbackRate: session.practice ? session.playbackRate * 0.6 : session.playbackRate,
      reverb: session.modifiers.has('slowed'),
      muted: session.modifiers.has('bpmOnly'),
    };
    playback = AudioEngine.createPlaybackChain(audioCtx, session.audioBuffer, chainOpts);
    if (session.practice) {
      playback.source.loop = true;
      playback.source.loopStart = session.practice.loopStart;
      playback.source.loopEnd = session.practice.loopEnd;
    }
  }

  // ---------------- transport ----------------
  function start() {
    const offset = session.practice ? session.practice.loopStart : session.startOffset;
    playback.source.start(audioCtx.currentTime, offset);
    session.startAudioTime = audioCtx.currentTime;
    session.startOffset = offset;
    session.lastRealTime = audioCtx.currentTime;
    running = true;
    isPaused = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function pause() {
    if (!running || isPaused) return;
    isPaused = true;
    if (audioCtx) { try { audioCtx.suspend(); } catch (e) {} }
  }

  function resume() {
    if (!running || !isPaused) return;
    if (audioCtx) { try { audioCtx.resume(); } catch (e) {} }
    session.lastRealTime = audioCtx.currentTime;
    isPaused = false;
  }

  /** Fully tears down a playback graph, including the fail-effect filter/LFO nodes. */
  function teardownPlaybackChain(pb) {
    if (!pb) return;
    try { pb.source.stop(); } catch (e) {}
    try { pb.source.disconnect(); } catch (e) {}
    try { pb.filter.disconnect(); } catch (e) {}
    try { pb.detuneLfo.stop(); } catch (e) {}
    try { pb.detuneLfo.disconnect(); } catch (e) {}
    try { pb.detuneDepth.disconnect(); } catch (e) {}
    try { pb.masterGain.disconnect(); } catch (e) {}
    try { pb.analyser.disconnect(); } catch (e) {}
  }

  function destroy() {
    running = false;
    isPaused = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (playback) {
      teardownPlaybackChain(playback);
      playback = null;
    }
    if (replayRecorder) { replayRecorder.stop(); replayRecorder = null; }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (canvas) canvas.style.filter = '';
    lastDesatPct = -1;
  }

  function computeSongTime(realNow) {
    if (session.practice) {
      const span = session.practice.loopEnd - session.practice.loopStart;
      const elapsed = (realNow - session.startAudioTime) * (session.playbackRate * 0.6);
      return session.practice.loopStart + (elapsed % span);
    }
    return session.startOffset + (realNow - session.startAudioTime) * session.playbackRate;
  }

  function songTimeToRealTime(t) {
    return session.startAudioTime + (t - session.startOffset) / session.playbackRate;
  }

  // ---------------- score popups ----------------
  const popups = [];
  function addPopup(text, x, y, color) {
    popups.push({ text, x, y, life: 1, color });
  }
  function updatePopups(dt) {
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.y -= 50 * dt;
      p.life -= dt * 1.1;
      if (p.life <= 0) popups.splice(i, 1);
    }
  }

  // ---------------- helpers ----------------
  function sectionColorString(section, alpha) {
    const c = SECTION_COLORS[section] || SECTION_COLORS.chill;
    return `rgba(${c.r},${c.g},${c.b},${alpha})`;
  }
  function currentSection(songTime) {
    if (!session.levelData || !session.levelData.sections || !session.levelData.sections.length) return 'chill';
    const secs = session.levelData.sections;
    const idx = clamp(Math.floor(songTime / secs[0].duration), 0, secs.length - 1);
    return secs[idx].type;
  }
  function getComboMultiplier() {
    return Math.min(1 + Math.floor(session.combo / 10) * 0.25, 4);
  }
  function triggerHitStop(realNow) {
    session.frozenSongTime = computeSongTime(realNow);
    session.hitStopUntilReal = realNow + 0.03;
  }
  function triggerScreenShake(energy, realNow) {
    session.screenShakeMag = Math.max(session.screenShakeMag, 4 + energy * 12);
    session.screenShakeUntilReal = realNow + 0.15;
  }
  function checkComboMilestone() {
    if (session.combo > 0 && session.combo % 50 === 0) {
      session.comboFlashUntilReal = audioCtx.currentTime + 0.5;
      session.chromaUntilReal = audioCtx.currentTime + 0.35;
      Haptics.comboMilestone(session.combo);
      if (Game.onComboMilestone) Game.onComboMilestone(session.combo);
    }
  }
  function updateTrail() {
    const skin = Storage.getSettings().skin;
    const maxLen = 8 + Math.floor(Math.min(session.combo, 200) / 200 * 16) + (skin === 'comet' ? 14 : 0);
    session.trailHistory.unshift(session.dotY);
    if (session.trailHistory.length > maxLen) session.trailHistory.length = maxLen;
  }

  // ---------------- main loop ----------------
  function loop() {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    if (isPaused) return;
    try {
      const realNow = audioCtx.currentTime;
      let songTime;
      if (realNow < session.hitStopUntilReal) {
        songTime = session.frozenSongTime;
      } else {
        songTime = computeSongTime(realNow);
      }
      const dt = Math.min(0.05, Math.max(0, realNow - (session.lastRealTime || realNow)));
      session.lastRealTime = realNow;
      session.elapsedPlayTime += dt;

      update(songTime, realNow, dt);
      render(songTime, realNow, dt);
    } catch (err) {
      // Stop the loop so a broken frame doesn't spam the same error 60x/sec -
      // the error is surfaced via Game.onError instead of failing silently.
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      if (Game.onError) Game.onError(err);
    }
  }

  function update(songTime, realNow, dt) {
    if (session.completing) { updateCompleting(realNow, dt); return; }

    if (session.ballState === 'roll') {
      session.rollTimeSec += dt;
      session.desaturation = Math.min(1, session.desaturation + dt / 0.3);
    } else {
      session.desaturation = Math.max(0, session.desaturation - dt / 0.15);
    }

    if (session.levelData && session.levelData.sections) {
      const sec = currentSection(songTime);
      if (sec === 'drop' && !session.inDrop) { session.inDrop = true; session.dropHasHit = false; }
      else if (sec !== 'drop' && session.inDrop) {
        session.inDrop = false;
        if (!session.dropHasHit) session.dropSurvivedNoHit = true;
      }
    }

    if (!session.practice) {
      while (session.checkpointIndex + 1 < session.checkpoints.length && songTime >= session.checkpoints[session.checkpointIndex + 1]) {
        session.checkpointIndex++;
        saveCheckpointSnapshot();
        if (Game.onCheckpoint) Game.onCheckpoint(session.checkpointIndex, songTime);
      }
    }

    processTrack(songTime, realNow);

    if (session.analysis) {
      if (session.modifiers.has('bpmOnly')) {
        scheduleMetronomeClicks(realNow);
      } else {
        scheduleRhythmGuideClicks(realNow);
      }
    }

    if (session.ghostData) updateGhost(songTime);

    updateParticles(dt, session.modifiers.has('slowed') ? 1.6 : 1);
    updatePopups(dt);
    updateTrail();
    updatePracticeLoop(songTime);

    if (session.screenShakeMag > 0 && realNow > session.screenShakeUntilReal) session.screenShakeMag = 0;

    if (!session.practice && songTime >= session.duration - 0.05 && !session.completing) {
      beginCompleting(realNow);
    }

    if (Game.onUpdateHUD) Game.onUpdateHUD(buildHUDState(songTime));
  }

  function processTrack(songTime, realNow) {
    const goodWindow = session.windows.good;
    while (session.trackIndex < session.track.length) {
      const el = session.track[session.trackIndex];

      if (session.modifiers.has('autoJump') && !el.hit && songTime >= el.time) {
        el.hit = true; el.hitType = 'perfect';
        session.jumps++;
        if (session.ballState === 'roll') {
          recoverFromRoll(el, 'perfect', songTime, realNow);
        } else {
          applyLanding(el, 'perfect', 0, songTime, realNow);
        }
        recordHit(songTime, 0, 'perfect');
        session.trackIndex++;
        continue;
      }

      if (songTime > el.time + goodWindow) {
        if (!el.hit) {
          const indexBefore = session.trackIndex;
          registerMiss(el, songTime);
          // restartFromCheckpoint() may have rewound trackIndex (or ended the
          // run); bail so the next frame recomputes from the fresh audio clock
          // instead of continuing this loop with a stale songTime.
          if (!running || session.completing || session.trackIndex !== indexBefore) return;
        }
        session.trackIndex++;
        continue;
      }

      break;
    }
  }

  /** B1: a successful landing while bouncing - scores, builds combo, sets next arc's height. */
  function applyLanding(el, grade, delta, songTime, realNow) {
    session.combo++;
    session.maxCombo = Math.max(session.maxCombo, session.combo);
    const comboMult = getComboMultiplier();
    session.arcGrade = grade;
    session.arcStartTime = el.time;

    if (grade === 'perfect') {
      session.perfectCount++;
      session.perfectStreak++;
      if (session.perfectStreak % 10 === 0) session.perfectStreaksOf10Count++;
      if (session.perfectStreak === 50 && replayRecorder) {
        const blob = replayRecorder.capture();
        if (Game.onReplayReady && blob) Game.onReplayReady(blob);
      }
      const points = Math.round(POINTS.perfectStrong * comboMult);
      session.baseScore += points;
      addPopup(`+${points} PERFECT`, dotX, session.dotY - 30, '#ffffff');
      addComboPopup();
      spawnBurst(dotX, session.dotY, sectionColorString(el.section, 1), 24, 1.2);
      triggerHitStop(realNow);
      triggerScreenShake(el.energy || 0.5, realNow);
      Haptics.tapPerfect();
      if (audioCtx) AudioEngine.playTapSound(audioCtx, realNow, Storage.getSettings().tapSound);
    } else {
      session.goodCount++;
      session.perfectStreak = 0;
      const points = Math.round(POINTS.goodStrong * comboMult);
      session.baseScore += points;
      addPopup(`+good`, dotX, session.dotY - 30, '#aaaaaa');
      spawnBurst(dotX, session.dotY, sectionColorString(el.section, 0.7), 10, 0.8);
      Haptics.tapGood();
      if (audioCtx) AudioEngine.playTapSound(audioCtx, realNow, Storage.getSettings().tapSound, 0.4);
    }

    session.score = Math.round(session.baseScore * session.multiplier);
    checkComboMilestone();
  }

  /** B3: big combo number popup at the bounce point ("23x"), only on PERFECTs. */
  function addComboPopup() {
    if (session.combo < 2) return;
    popups.push({
      text: `${session.combo}x`, x: dotX, y: session.dotY - 78, life: 1, color: session.accentColor,
      big: true,
    });
  }

  function recordHit(time, delta, grade) {
    session.hitHistory.push({ time, delta, grade });
  }

  /** B2: drop into rolling - the player failed to land in time. */
  function enterRollState(songTime) {
    session.ballState = 'roll';
    session.rollSpikesPassed = 0;
    spawnBurst(dotX, session.dotY, '#ff3b3b', 14, 1);
    triggerScreenShake(0.8, audioCtx.currentTime);
    Haptics.tapHit();
    if (playback) AudioEngine.enterFailEffect(playback, audioCtx.currentTime);
  }

  /** B2: pop back into bouncing - the player recovered on a rolling spike. */
  function recoverFromRoll(el, grade, songTime, realNow) {
    session.ballState = 'bounce';
    session.arcGrade = grade;
    session.arcStartTime = el.time;
    session.rollSpikesPassed = 0;
    spawnBurst(dotX, session.dotY, sectionColorString(el.section, 1), 30, 1.4);
    triggerScreenShake(0.6, realNow);
    Haptics.tapPerfect();
    if (audioCtx) AudioEngine.playBassThump(audioCtx, realNow, 0.5);
    if (playback) AudioEngine.exitFailEffect(playback, audioCtx.currentTime);
    if (Game.onRecovery) Game.onRecovery(grade);
  }

  function registerMiss(el, songTime) {
    el.hitType = 'miss';
    session.hitCount++;
    recordHit(songTime, null, 'miss');
    session.combo = 0;
    session.perfectStreak = 0;
    if (session.inDrop) session.dropHasHit = true;

    if (session.ballState === 'bounce') {
      enterRollState(songTime);
    } else {
      session.rollSpikesPassed++;
    }

    if (Game.onMiss) Game.onMiss();

    if (session.practice) {
      session.practicePassHits++;
      return;
    }

    if (session.rollSpikesPassed >= session.rollSpikeLimit && !session.modifiers.has('noFail')) {
      if (session.mode === 'endless') {
        beginGameOver(songTime);
      } else {
        restartFromCheckpoint(songTime);
      }
    }
  }

  function restartFromCheckpoint() {
    if (!session || session.completing) return;
    if (Game.onRestart) Game.onRestart();
    const snap = session.checkpointSnapshot;
    session.trackIndex = snap.trackIndex;
    session.score = snap.score; session.baseScore = snap.baseScore;
    session.perfectCount = snap.perfectCount; session.goodCount = snap.goodCount; session.hitCount = snap.hitCount;
    session.hitHistory = snap.hitHistory.slice();
    session.combo = 0; session.perfectStreak = 0;
    session.ballState = 'bounce'; session.arcGrade = 'perfect'; session.desaturation = 0;
    session.rollSpikesPassed = 0; session.rollTimeSec = 0;
    session.track.forEach((t, i) => {
      if (i >= snap.trackIndex) { t.hit = false; t.hitType = null; }
    });

    teardownPlaybackChain(playback);
    setupPlaybackChain();
    const offset = snap.songTime;
    playback.source.start(audioCtx.currentTime, offset);
    session.startAudioTime = audioCtx.currentTime;
    session.startOffset = offset;
    session.arcStartTime = offset;
    session.hitStopUntilReal = 0;
    session.ringIndex = 0;
    session.nextClickIndex = 0;
    session.nextGuideIndex = 0;
  }

  function updatePracticeLoop(songTime) {
    if (!session.practice) return;
    if (session.lastPracticeSongTime != null && songTime < session.lastPracticeSongTime - 0.5) {
      const clean = session.practicePassHits === 0;
      session.practiceCleanPasses = clean ? session.practiceCleanPasses + 1 : 0;
      session.practicePassHits = 0;
      session.track.forEach(t => { t.hit = false; t.hitType = null; });
      const idx = session.track.findIndex(t => t.time >= session.practice.loopStart);
      session.trackIndex = idx < 0 ? 0 : idx;
      session.ballState = 'bounce'; session.arcGrade = 'perfect'; session.desaturation = 0;
      session.rollSpikesPassed = 0; session.arcStartTime = session.practice.loopStart;
      if (Game.onPracticePass) Game.onPracticePass(session.practiceCleanPasses, clean);
      if (session.practiceCleanPasses >= 3 && Game.onPracticeMastered) Game.onPracticeMastered();
    }
    session.lastPracticeSongTime = songTime;
  }

  function scheduleMetronomeClicks(realNow) {
    const beats = session.analysis.beats;
    while (session.nextClickIndex < beats.length) {
      const b = beats[session.nextClickIndex];
      const beatRealTime = songTimeToRealTime(b.time);
      if (beatRealTime - realNow > 0.1) break;
      if (beatRealTime >= realNow - 0.1) {
        AudioEngine.playClick(audioCtx, Math.max(beatRealTime, realNow), b.type === 'strong');
      }
      session.nextClickIndex++;
    }
  }

  /** RHYTHM GUIDE: quiet tick on every grid beat, fading out as perfect rate rises. */
  function rhythmGuideActive() {
    if (session.practice) return false;
    const setting = Storage.getSettings().rhythmGuide || 'auto';
    if (setting === 'off') return false;
    if (setting === 'on') return true;
    return Storage.getStats().totalSongsPlayed < 3;
  }

  function guideGain() {
    const recent = session.hitHistory.slice(-20);
    if (!recent.length) return 0.12;
    const perfectRate = recent.filter(h => h.grade === 'perfect').length / recent.length;
    return Math.max(0, 0.12 * (1 - perfectRate));
  }

  function scheduleRhythmGuideClicks(realNow) {
    if (!rhythmGuideActive()) return;
    const beats = session.analysis.beats;
    while (session.nextGuideIndex < beats.length) {
      const b = beats[session.nextGuideIndex];
      const beatRealTime = songTimeToRealTime(b.time);
      if (beatRealTime - realNow > 0.1) break;
      if (beatRealTime >= realNow - 0.1) {
        const gain = guideGain();
        if (gain > 0.001) AudioEngine.playGuideTick(audioCtx, Math.max(beatRealTime, realNow), gain);
      }
      session.nextGuideIndex++;
    }
  }

  function updateGhost(songTime) {
    const ghost = session.ghostData;
    if (!ghost || !ghost.length) return;
    let ghostScore = 0;
    for (let i = 0; i < ghost.length; i++) {
      if (ghost[i].time <= songTime) ghostScore = ghost[i].score; else break;
    }
    session.ghostDelta = session.score - ghostScore;
  }

  function buildHUDState(songTime) {
    return {
      score: session.score, combo: session.combo, comboMultiplier: getComboMultiplier(),
      multiplier: session.multiplier,
      songTime, duration: session.duration, remaining: Math.max(0, session.duration - songTime),
      section: currentSection(songTime),
      ballState: session.ballState,
      rollSpikesPassed: session.rollSpikesPassed,
      rollSpikeLimit: session.rollSpikeLimit,
      ghostDelta: session.ghostDelta,
      checkpointIndex: session.checkpointIndex,
      mode: session.mode,
    };
  }

  // ---------------- input ----------------
  function tap() {
    if (!running || isPaused || !session || session.completing) return;
    const realNow = audioCtx.currentTime;
    const songTime = (realNow < session.hitStopUntilReal) ? session.frozenSongTime : computeSongTime(realNow);
    const latency = (Storage.getSettings().latencyOffset || 0) / 1000;
    const adjusted = songTime + latency;

    if (session.mode === 'synctest') recordSyncOffsetSample(songTime);

    session.jumps++;

    if (session.modifiers.has('autoJump')) return;

    const el = session.track[session.trackIndex];
    if (!el || el.hit) return;

    const delta = adjusted - el.time;
    const absDelta = Math.abs(delta);
    let grade;
    if (absDelta <= session.windows.perfect) grade = 'perfect';
    else if (absDelta <= session.windows.good) grade = 'good';
    else return;

    el.hit = true; el.hitType = grade;

    if (session.ballState === 'roll') {
      recoverFromRoll(el, grade, songTime, realNow);
    } else {
      applyLanding(el, grade, delta, songTime, realNow);
    }
    if (session.practice && Game.onPracticeTiming) Game.onPracticeTiming(delta * 1000, grade);
    recordHit(songTime, delta, grade);
    session.trackIndex++;
  }

  /**
   * SYNC TEST calibration: records how far (in ms) this tap landed from the
   * nearest click (every 0.5s in the 120 BPM track), *without* the current
   * latencyOffset applied, so the test produces a usable measurement even
   * when the player is currently mis-calibrated (and would otherwise only
   * ever see MISS with no clue which way to move the slider). The 0.5s click
   * spacing gives +-250ms of unambiguous range; the live readout uses the
   * median, which stays close to the true offset even with the occasional
   * sample that lands just past the +-250ms boundary and wraps to the
   * neighbouring click.
   */
  function recordSyncOffsetSample(songTime) {
    const beatInterval = (60 / ((session.levelData && session.levelData.bpm) || 120));
    const nearest = Math.round(songTime / beatInterval) * beatInterval;
    const offsetMs = (songTime - nearest) * 1000;
    session.syncOffsets.push(offsetMs);
    const usable = session.syncOffsets.filter(v => Math.abs(v) <= 250);
    const avgMs = usable.length ? median(usable) : null;
    if (Game.onSyncTap) Game.onSyncTap({ offsetMs, avgMs, count: session.syncOffsets.length, usableCount: usable.length });
  }

  function median(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // ---------------- completion ----------------
  function beginCompleting(realNow) {
    session.completing = true;
    session.completingStart = realNow;
    session.finished = true;
    spawnBurst(dotX, session.dotY, '#ffffff', 80, 1.5);
    if (playback) {
      try {
        const rate = playback.source.playbackRate;
        rate.setValueAtTime(rate.value, realNow);
        rate.linearRampToValueAtTime(0.25, realNow + 1.4);
        const g = playback.masterGain.gain;
        g.setValueAtTime(g.value, realNow);
        g.linearRampToValueAtTime(0, realNow + 1.6);
      } catch (e) {}
    }
  }

  function updateCompleting(realNow, dt) {
    updateParticles(dt, 2.2);
    updatePopups(dt);
    updateTrail();
    if (realNow - session.completingStart >= 1.7) finishSession();
  }

  function finishSession() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (playback) { try { playback.source.stop(); } catch (e) {} }
    if (replayRecorder && session.perfectStreak >= 50) {
      const blob = replayRecorder.capture();
      if (Game.onReplayReady) Game.onReplayReady(blob);
    }
    if (replayRecorder) replayRecorder.stop();
    if (Game.onSongComplete) Game.onSongComplete(buildResult(true));
  }

  function beginGameOver(songTime) {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (playback) { try { playback.source.stop(); } catch (e) {} }
    if (replayRecorder) replayRecorder.stop();
    const result = buildResult(false);
    result.deathSongTime = songTime;
    if (Game.onGameOver) Game.onGameOver(result);
  }

  function buildResult(finished) {
    const totalBeats = session.levelData
      ? session.levelData.track.filter(t => t.type === 'strong').length
      : session.track.filter(t => t.type === 'strong').length;
    return {
      finished,
      score: session.score, baseScore: session.baseScore, multiplier: session.multiplier,
      perfectCount: session.perfectCount, goodCount: session.goodCount, hitCount: session.hitCount,
      totalBeats,
      combo: session.combo, maxCombo: session.maxCombo, jumps: session.jumps,
      modifiers: Array.from(session.modifiers),
      duration: session.elapsedPlayTime,
      songHash: session.songMeta.hash, songName: session.songMeta.name,
      perfectStreaksOf10: session.perfectStreaksOf10Count,
      dropSurvivedNoHit: session.dropSurvivedNoHit,
      mode: session.mode,
      practiceAnchor: session.checkpoints[session.checkpointIndex] || 0,
      hitHistory: session.hitHistory.slice(),
      syncOffsets: session.syncOffsets.slice(),
    };
  }

  // ---------------- realtime audio reactivity ----------------
  const freqDataBuffer = new Uint8Array(2048);
  function getLiveBassLevel() {
    let analyser = null;
    if (playback) analyser = playback.analyser;
    if (!analyser) return 0;
    const bins = analyser.frequencyBinCount;
    const view = freqDataBuffer.subarray(0, bins);
    analyser.getByteFrequencyData(view);
    let sum = 0;
    const count = Math.min(bins, 12);
    for (let i = 1; i <= count; i++) sum += view[i];
    return (sum / count) / 255;
  }
  function getBeatPulse(songTime) {
    let pulse = 0;
    const track = session.track;
    for (let i = Math.max(0, session.trackIndex - 2); i < Math.min(track.length, session.trackIndex + 3); i++) {
      const el = track[i];
      const dist = Math.abs(songTime - el.time);
      if (dist < 0.18) {
        const p = (1 - dist / 0.18) * (el.energy || 0.5);
        if (p > pulse) pulse = p;
      }
    }
    return pulse;
  }

  // ---------------- rendering ----------------
  function drawSpike(x, h) {
    const w = 22;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, groundY);
    ctx.lineTo(x, groundY - h);
    ctx.lineTo(x + w / 2, groundY);
    ctx.closePath();
    ctx.fill();
  }

  function renderTrack(songTime, secColor) {
    const bpm = (session.levelData && session.levelData.bpm) || 120;
    const scrollSpeed = BASE_SCROLL_SPEED * (bpm / 120);
    const startIdx = Math.max(0, session.trackIndex - 1);
    for (let i = startIdx; i < session.track.length; i++) {
      const el = session.track[i];
      const screenX = dotX + (el.time - songTime) * scrollSpeed;
      if (screenX > width + 100) break;
      if (screenX < -100) continue;

      if (el.hit && el.hitType !== 'miss') {
        // brief flash on the ground where the dot just bounced off this spike
        const sinceLanding = songTime - el.time;
        if (sinceLanding >= 0 && sinceLanding < 0.18) {
          const flashAlpha = 1 - sinceLanding / 0.18;
          ctx.save();
          ctx.globalAlpha = flashAlpha * 0.6;
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.arc(screenX, groundY, DOT_RADIUS * 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        continue;
      }

      const c = SECTION_COLORS[el.section] || secColor;
      const glow = clamp(1 - Math.abs(songTime - el.time) / 0.3, 0, 1);

      const spikeH = 40 + (el.energy || 0.5) * 30;
      const spikeColor = el.hitType === 'miss' ? 'rgba(255,59,59,0.7)' : `rgba(${c.r},${c.g},${c.b},${0.7 + glow * 0.3})`;
      ctx.globalAlpha = 1;
      ctx.fillStyle = spikeColor;
      ctx.shadowColor = `rgb(${c.r},${c.g},${c.b})`;
      ctx.shadowBlur = 8 + glow * 20;

      if (el.obstacleType === 'gap') {
        const gapW = 50;
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.fillRect(screenX - gapW / 2, groundY, gapW, height - groundY);
        ctx.strokeStyle = spikeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX - gapW / 2, groundY); ctx.lineTo(screenX - gapW / 2, height);
        ctx.moveTo(screenX + gapW / 2, groundY); ctx.lineTo(screenX + gapW / 2, height);
        ctx.stroke();
      } else if (el.obstacleType === 'doubleSpike') {
        drawSpike(screenX - 14, spikeH);
        drawSpike(screenX + 14, spikeH);
      } else {
        drawSpike(screenX, spikeH);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  function renderTrail(secColor, skin) {
    const hist = session.trailHistory;
    for (let i = 1; i < hist.length; i++) {
      const alpha = (1 - i / hist.length) * 0.35;
      const r = DOT_RADIUS * (1 - (i / hist.length) * 0.6);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = skin === 'comet' ? `rgb(${secColor.r},${secColor.g},${secColor.b})` : session.accentColor;
      ctx.beginPath();
      ctx.arc(dotX - i * 5, hist[i], Math.max(0.5, r), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function renderDot(songTime, skin) {
    let dotY = groundY - DOT_RADIUS;
    const isAirborne = session.ballState === 'bounce';
    let arcT = 0;
    let rotation = 0;

    if (isAirborne) {
      const next = session.track[session.trackIndex];
      const start = session.arcStartTime;
      const end = next ? next.time : start + session.beatInterval;
      const span = Math.max(0.001, end - start);
      arcT = clamp((songTime - start) / span, 0, 1);
      const gapBeats = span / session.beatInterval;
      let arcHeightRatio = clamp(ARC_HEIGHT_RATIO * gapBeats, ARC_HEIGHT_MIN_RATIO, ARC_HEIGHT_MAX_RATIO);
      if (session.arcGrade === 'good') arcHeightRatio *= GOOD_ARC_SCALE;
      dotY -= Math.sin(arcT * Math.PI) * height * arcHeightRatio;
      rotation = arcT * Math.PI * 0.5;
    } else {
      rotation = session.rollTimeSec * 8;
    }
    session.dotY = dotY;

    let alpha = 1;
    if (session.modifiers.has('ghostDot') && isAirborne) alpha = 0.12;

    let scaleX = 1, scaleY = 1;
    if (isAirborne) {
      if (arcT < 0.12) { const k = arcT / 0.12; scaleX = lerp(1.3, 1, k); scaleY = lerp(0.7, 1, k); }
      else if (arcT > 0.88) { const k = (arcT - 0.88) / 0.12; scaleX = lerp(1, 1.3, k); scaleY = lerp(1, 0.7, k); }
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = session.accentColor;
    ctx.shadowBlur = 16;
    ctx.translate(dotX, dotY);
    ctx.rotate(rotation);
    ctx.scale(scaleX, scaleY);
    const renderer = SKIN_RENDERERS[skin] || SKIN_RENDERERS.classic;
    renderer(ctx, 0, 0, DOT_RADIUS, session.accentColor, songTime);
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  function renderRing(songTime, secColor) {
    let interval, progress;
    if (session.analysis && session.analysis.beats.length) {
      const beats = session.analysis.beats;
      let idx = session.ringIndex || 0;
      while (idx < beats.length - 1 && beats[idx].time < songTime) idx++;
      session.ringIndex = idx;
      const next = beats[idx];
      const prev = beats[idx - 1];
      if (!next) return;
      interval = prev ? (next.time - prev.time) : session.beatInterval;
      progress = clamp(1 - (next.time - songTime) / Math.max(0.05, interval), 0, 1);
    } else return;

    const maxR = DOT_RADIUS * 2.6;
    const minR = DOT_RADIUS * 1.15;
    const r = maxR - (maxR - minR) * progress;
    ctx.beginPath();
    ctx.arc(dotX, session.dotY, r, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(${secColor.r},${secColor.g},${secColor.b},${0.5 + progress * 0.4})`;
    ctx.stroke();
  }

  function renderPopupsFn() {
    for (const p of popups) {
      const baseScale = p.big ? 1.6 : 1;
      const popInScale = p.big ? 3 : 2.2;
      const scale = p.life > 0.85 ? lerp(popInScale, baseScale, (1 - p.life) / 0.15) : baseScale;
      ctx.save();
      ctx.globalAlpha = clamp(p.life * 1.5, 0, 1);
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      ctx.fillStyle = p.color;
      ctx.font = p.big ? 'bold 42px "Courier New", monospace' : 'bold 18px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = p.color; ctx.shadowBlur = p.big ? 18 : 8;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  function renderThemeBackground(theme, bgPulse) {
    if (theme === 'vaporwave') {
      ctx.strokeStyle = 'rgba(255,140,240,0.25)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 8; i++) {
        const y = groundY + i * i * 2;
        if (y > height) break;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
      const cx = width * 0.8, cy = groundY - 60;
      const grad = ctx.createLinearGradient(cx, cy - 50, cx, cy + 50);
      grad.addColorStop(0, '#ff8cf0'); grad.addColorStop(1, '#6de0d9');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, 50 + bgPulse * 8, 0, Math.PI * 2); ctx.fill();
    } else if (theme === 'matrix') {
      if (!session.matrixGlyphs) {
        session.matrixGlyphs = [];
        for (let i = 0; i < 36; i++) {
          session.matrixGlyphs.push({
            x: Math.random() * width, y: Math.random() * height,
            speed: 40 + Math.random() * 80, char: String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96)),
          });
        }
      }
      ctx.fillStyle = 'rgba(77,255,122,0.45)';
      ctx.font = '14px monospace';
      session.matrixGlyphs.forEach(g => {
        g.y += g.speed * 0.016;
        if (g.y > height) { g.y = -20; g.x = Math.random() * width; }
        ctx.fillText(g.char, g.x, g.y);
      });
    } else if (theme === 'bloodmoon') {
      ctx.shadowColor = '#ff4d4d'; ctx.shadowBlur = 40;
      ctx.fillStyle = 'rgba(255,77,77,0.5)';
      ctx.beginPath(); ctx.arc(width * 0.78, height * 0.18, 50 + bgPulse * 6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (theme === 'goldenhour') {
      if (Math.random() < 0.04) {
        spawnParticle(Math.random() * width, Math.random() * height * 0.5,
          (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30,
          1.2, 3 + Math.random() * 3, 'rgba(255,210,77,0.8)');
      }
    }
  }

  function renderFx(realNow) {
    fxCtx.clearRect(0, 0, width, height);
    if (realNow < session.chromaUntilReal) {
      const remaining = session.chromaUntilReal - realNow;
      const alpha = clamp(remaining / 0.35, 0, 1) * 0.5;
      fxCtx.globalCompositeOperation = 'screen';
      fxCtx.fillStyle = `rgba(255,0,64,${alpha})`;
      fxCtx.fillRect(0, 0, 14, height);
      fxCtx.fillStyle = `rgba(0,229,255,${alpha})`;
      fxCtx.fillRect(width - 14, 0, 14, height);
      fxCtx.globalCompositeOperation = 'source-over';
    }
  }

  // Apply the B2 fail-state desaturation as a CSS filter on the canvas
  // element rather than ctx.filter: ctx.filter forces the 2D context to
  // re-rasterize every draw call through a software filter pass (a huge
  // frame-rate hit on mobile WebViews), whereas an element-level CSS
  // filter is a single GPU-composited post-effect on the whole layer.
  function updateDesaturationFilter() {
    const pct = session.desaturation > 0.001 ? Math.round(session.desaturation * 100) : 0;
    if (pct !== lastDesatPct) {
      canvas.style.filter = pct > 0 ? `grayscale(${pct}%)` : '';
      lastDesatPct = pct;
    }
  }

  function render(songTime, realNow) {
    const skin = Storage.getSettings().skin;
    const theme = Storage.getSettings().theme;
    const section = currentSection(songTime);
    const secColor = SECTION_COLORS[section] || SECTION_COLORS.chill;
    const bgPulse = clamp(Math.max(getBeatPulse(songTime), getLiveBassLevel() * 0.9), 0, 1);

    updateDesaturationFilter();
    ctx.save();
    let shakeX = 0, shakeY = 0;
    if (session.screenShakeMag > 0) {
      shakeX = (Math.random() * 2 - 1) * session.screenShakeMag;
      shakeY = (Math.random() * 2 - 1) * session.screenShakeMag;
      ctx.translate(shakeX, shakeY);
    }

    // background fill (with motion-blur ghosting for SLOWED)
    ctx.fillStyle = '#000';
    ctx.fillRect(-30, -30, width + 60, height + 60);
    if (session.modifiers.has('slowed')) {
      ctx.globalAlpha = 0.15;
      ctx.drawImage(prevFrameCanvas, 0, 0, prevFrameCanvas.width, prevFrameCanvas.height, 0, 0, width, height);
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(176,107,255,${0.05 + bgPulse * 0.07})`;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.fillStyle = `rgba(${secColor.r},${secColor.g},${secColor.b},${0.06 + bgPulse * 0.16})`;
    ctx.fillRect(0, 0, width, height);

    renderThemeBackground(theme, bgPulse);

    // ground
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY); ctx.lineTo(width, groundY); ctx.stroke();

    renderTrack(songTime, secColor);
    renderParticles(ctx);
    renderTrail(secColor, skin);
    renderDot(songTime, skin);
    if (!session.modifiers.has('blindRing')) renderRing(songTime, secColor);
    renderPopupsFn();

    ctx.restore();

    if (session.modifiers.has('slowed')) {
      prevFrameCtx.clearRect(0, 0, prevFrameCanvas.width, prevFrameCanvas.height);
      prevFrameCtx.drawImage(canvas, 0, 0);
    }

    renderFx(realNow);
    if (replayRecorder) replayRecorder.drawFrame(canvas);
  }

  return {
    PERFECT_WINDOW, GOOD_WINDOW, WIDE_PERFECT, WIDE_GOOD,
    MODIFIER_DEFS, SKIN_DEFS, SKIN_RENDERERS, SECTION_COLORS,
    computeMultiplier, getConstraints, getWindows,
    init, configure, start, pause, resume, destroy,
    tap, restartFromCheckpoint,
    get isPaused() { return isPaused; },
    get session() { return session; },
    _internal: {
      get canvas() { return canvas; }, get ctx() { return ctx; },
    },
  };
})();
