/* ============================================================
   ONE DOT - main.js
   App controller: screen flow, audio pipeline, input binding,
   and orchestration of Game/UI/Audio/Storage/Level/Haptics.
   ============================================================ */

const App = (() => {
  const $ = (id) => document.getElementById(id);

  // ---------------- state ----------------
  let current = {
    mode: 'file', // file | mic | endless | multiplayer | playlist | challenge
    audioBuffer: null, analysis: null, levelData: null,
    songHash: null, songName: null,
  };
  let lastResult = null;
  let lastRankInfo = null;
  let lastReplayBlob = null;

  let endless = null;
  let playlist = null;
  let multiplayer = null;
  let challenge = null;

  let micCalRaf = null;
  let listenRaf = null;
  let listenActive = false;

  // ---------------- helpers ----------------
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function isGameplayScreen() {
    const s = UI.getCurrentScreen();
    return s === 'screen-none' || s === 'screen-practice';
  }

  function resetToStart() {
    UI.resetNav();
    UI.showScreen('screen-start', false);
  }

  function resetSessionState() {
    current = { mode: 'file', audioBuffer: null, analysis: null, levelData: null, songHash: null, songName: null };
    lastResult = null;
    lastRankInfo = null;
    lastReplayBlob = null;
    endless = null;
    playlist = null;
    multiplayer = null;
    challenge = null;
    UI.setReplayToastVisible(false);
    UI.hideEndlessBanner();
    UI.hidePlayerBanner();
  }

  // ---------------- bootstrap ----------------
  function init() {
    bindErrorHandlers();
    Game.init($('game-canvas'), $('fx-canvas'));
    UI.init();
    UI.setHeartbeatRate('menu-heartbeat-dot', IDLE_HEARTBEAT_INTERVAL);
    bindGameCallbacks();
    bindGlobalActions();
    bindFileInputs();
    bindInput();
    bindVisibility();
    bindGamepad();
    if (Storage.getSettings().listenEnabled) {
      startListenMode().catch(() => {
        Storage.setSetting('listenEnabled', false);
        $('listen-toggle').classList.remove('active');
      });
    }
  }

  // ---------------- global error capture (DEBUG LOG) ----------------
  function bindErrorHandlers() {
    window.addEventListener('error', (e) => {
      const msg = e.error ? (e.error.stack || e.error.message) : e.message;
      UI.logDebugError(`${msg} (${e.filename}:${e.lineno}:${e.colno})`);
    });
    window.addEventListener('unhandledrejection', (e) => {
      const reason = e.reason;
      const msg = reason && reason.stack ? reason.stack : String(reason);
      UI.logDebugError(`Unhandled rejection: ${msg}`);
    });
  }

  // ---------------- global action dispatcher ----------------
  function bindGlobalActions() {
    document.body.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      handleAction(el.dataset.action, el);
    });
  }

  function handleAction(action, el) {
    switch (action) {
      // ---------------- start menu ----------------
      case 'upload-song':
        current.mode = 'file';
        $('file-input-song').click();
        break;
      case 'upload-playlist':
        enterPlaylistSetup();
        break;
      case 'mic-mode':
        enterMicMode();
        break;
      case 'endless-mode':
        enterEndlessSetup();
        break;
      case 'pass-play':
        enterPassSetup();
        break;
      case 'enter-challenge':
        UI.clearChallengeInput();
        UI.showScreen('screen-challenge-enter');
        break;
      case 'leaderboards':
        UI.populateLeaderboards();
        UI.showScreen('screen-leaderboards');
        break;
      case 'achievements':
        UI.populateAchievements();
        UI.showScreen('screen-achievements');
        break;
      case 'stats':
        UI.populateStats();
        UI.showScreen('screen-stats');
        break;
      case 'library':
        UI.populateLibrary();
        UI.showScreen('screen-library');
        break;
      case 'themes':
        UI.populateThemesSkins();
        UI.showScreen('screen-themes');
        break;
      case 'settings':
        UI.showScreen('screen-settings');
        break;
      case 'sync-test':
        startSyncTest();
        break;
      case 'toggle-listen':
        toggleListenMode();
        break;
      case 'debug-log-clear':
        UI.clearDebugLog();
        break;
      case 'debug-log-close':
        UI.hideDebugOverlay();
        break;
      case 'tap-sound-preview':
        tapSoundPreview();
        break;

      // ---------------- navigation ----------------
      case 'back':
        handleBack();
        break;
      case 'back-to-start':
        Game.destroy();
        UI.hideHUD();
        resetToStart();
        resetSessionState();
        break;

      // ---------------- result / tuner / modifiers ----------------
      case 'beat-tuner':
        enterTuner();
        break;
      case 'to-modifiers':
        UI.populateModifiers();
        UI.showScreen('screen-modifiers');
        break;
      case 'tuner-preview':
        tunerPreview();
        break;
      case 'tuner-regenerate':
        tunerRegenerate();
        break;
      case 'tuner-test-bass':
        tunerTestSound();
        break;
      case 'start-game':
        proceedFromModifiers();
        break;

      // ---------------- mic mode ----------------
      case 'mic-retry':
        startMicCalibration();
        break;

      // ---------------- pass & play ----------------
      case 'pass-continue':
        handlePassContinue();
        break;
      case 'pass-add-player':
        UI.addPassPlayer();
        break;
      case 'pass-setup-continue':
        handlePassSetupContinue();
        break;

      // ---------------- gameplay ----------------
      case 'pause':
        Game.pause();
        UI.setHeartbeatRate('pause-heartbeat-dot', Game.session ? Game.session.beatInterval : 1);
        UI.showScreen('screen-pause', false);
        break;
      case 'resume':
        Game.resume();
        UI.showScreen('screen-none', false);
        break;
      case 'restart-checkpoint':
        Game.resume();
        Game.restartFromCheckpoint();
        UI.showScreen('screen-none', false);
        break;
      case 'quit-to-menu':
        handleQuitToMenu();
        break;
      case 'save-replay':
        handleSaveReplay();
        break;

      // ---------------- practice ----------------
      case 'practice-exit':
        exitPractice();
        break;
      case 'practice-section':
        enterPractice();
        break;

      // ---------------- complete screens ----------------
      case 'play-again':
        startCountdown({ modifiers: lastResult ? new Set(lastResult.modifiers) : UI.getActiveModifiers() });
        break;
      case 'play-again-endless':
        handlePlayAgainEndless();
        break;
      case 'share-card':
        handleShareCard();
        break;
      case 'get-challenge':
        handleGetChallenge();
        break;

      // ---------------- challenge codes ----------------
      case 'submit-challenge':
        handleSubmitChallenge();
        break;

      // ---------------- multi-select (endless / playlist) ----------------
      case 'multi-select-files':
        $('file-input-multi').click();
        break;
      case 'multi-select-continue':
        handleMultiSelectContinue();
        break;

      default:
        break;
    }
  }

  function handleBack() {
    const screen = UI.getCurrentScreen();
    if (screen === 'screen-leaderboards' && UI.leaderboardsGoBack()) return;
    if (screen === 'screen-mic-calibration') {
      if (micCalRaf) cancelAnimationFrame(micCalRaf);
      MicEngine.stop();
    }
    UI.goBack();
  }

  function handleQuitToMenu() {
    const session = Game.session;
    if (current.mode === 'endless') {
      const partial = session ? {
        score: session.score, maxCombo: session.maxCombo, multiplier: session.multiplier, duration: session.elapsedPlayTime,
      } : { score: 0, maxCombo: 0, multiplier: 1, duration: 0 };
      Game.destroy();
      UI.hideHUD();
      UI.setReplayToastVisible(false);
      handleEndlessGameOver(partial);
      return;
    }
    Game.destroy();
    UI.hideHUD();
    UI.setReplayToastVisible(false);
    if (current.mode === 'multiplayer') {
      finishMultiplayerRun();
      return;
    }
    if (current.mode === 'playlist') {
      finishPlaylistRun();
      return;
    }
    resetToStart();
    resetSessionState();
  }

  // ---------------- file upload -> analysis -> result ----------------
  async function analyzeAndShowResult(file) {
    $('analyzing-title').textContent = 'ANALYZING AUDIO...';
    $('analyze-file-name').textContent = file.name;
    $('analyze-pct').textContent = '0%';
    UI.showScreen('screen-analyzing', false);
    try {
      const audioBuffer = await AudioEngine.decodeFile(file);
      const hash = AudioEngine.hashAudioBuffer(audioBuffer);
      const cached = Storage.getCachedSong(hash);
      let analysis, levelData;
      if (cached) {
        $('analyzing-title').textContent = 'LOADED FROM LIBRARY';
        $('analyze-pct').textContent = '100%';
        analysis = cached.analysis;
        levelData = Level.generate(analysis, hash);
      } else {
        const tunerSettings = Storage.getTunerSettings(hash);
        analysis = await AudioEngine.analyze(audioBuffer, tunerSettings, (p) => {
          $('analyze-pct').textContent = `${Math.round(p * 100)}%`;
        });
        levelData = Level.generate(analysis, hash);
        Storage.cacheSongAnalysis(hash, file.name, analysis, levelData);
      }
      current.audioBuffer = audioBuffer;
      current.analysis = analysis;
      current.levelData = levelData;
      current.songHash = hash;
      current.songName = file.name;

      if (current.mode === 'challenge') {
        handleChallengeSongLoaded();
        return;
      }
      if (current.mode === 'multiplayer') {
        UI.resetNav();
        UI.populateModifiers();
        UI.showScreen('screen-modifiers', false);
        return;
      }
      UI.populateResult(file.name, analysis);
      UI.resetNav();
      UI.showScreen('screen-result', false);
      UI.populateSongMap(levelData);
    } catch (e) {
      console.error(e);
      UI.showToast('Could not analyze this file.');
      UI.resetNav();
      UI.showScreen('screen-start', false);
      resetSessionState();
    }
  }

  // ---------------- sync test mode (settings) ----------------
  async function startSyncTest() {
    UI.showScreen('screen-analyzing', false);
    $('analyzing-title').textContent = 'PREPARING SYNC TEST...';
    $('analyze-file-name').textContent = '120 BPM CLICK TRACK';
    $('analyze-pct').textContent = '';
    try {
      const { buffer, analysis } = await AudioEngine.generateClickTrack();
      const levelData = Level.generate(analysis, 'synctest');
      current.mode = 'synctest';
      current.audioBuffer = buffer;
      current.analysis = analysis;
      current.levelData = levelData;
      current.songHash = 'synctest';
      current.songName = 'SYNC TEST 120 BPM';
      // noFail keeps the test running uninterrupted for the full 32s so
      // sync drift can be observed without checkpoint restarts.
      await startCountdown({ modifiers: new Set(['noFail']) });
    } catch (e) {
      console.error(e);
      UI.showToast('Could not start sync test.');
      UI.resetNav();
      UI.showScreen('screen-settings', false);
      resetSessionState();
    }
  }

  // ---------------- beat tuner ----------------
  function enterTuner() {
    if (UI.getCurrentScreen() === 'screen-pause') {
      Game.destroy();
      UI.hideHUD();
      UI.resetNav();
      UI.showScreen('screen-result', false);
    }
    UI.initTuner(current.songHash, current.analysis);
    UI.showScreen('screen-tuner');
  }

  function truncateBuffer(buffer, seconds) {
    const audioCtx = AudioEngine.getContext();
    const sampleRate = buffer.sampleRate;
    const frames = Math.min(buffer.length, Math.floor(seconds * sampleRate));
    const out = audioCtx.createBuffer(buffer.numberOfChannels, frames, sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      out.getChannelData(ch).set(buffer.getChannelData(ch).subarray(0, frames));
    }
    return out;
  }

  async function tunerPreview() {
    if (!current.audioBuffer) return;
    const settings = UI.readTunerSliders();
    const snippet = truncateBuffer(current.audioBuffer, 10);
    const analysis = await AudioEngine.analyze(snippet, settings);
    UI.drawTunerCanvas(analysis);
    const audioCtx = AudioEngine.getContext();
    const playback = AudioEngine.createPlaybackChain(audioCtx, snippet, {});
    const startAt = audioCtx.currentTime + 0.05;
    playback.source.start(startAt);
    (analysis.bassBeats || []).forEach(b => AudioEngine.playBassThump(audioCtx, startAt + b.time));
    setTimeout(() => { try { playback.source.stop(); } catch (e) {} }, 10500);
  }

  /** Plays a short 4-tick pattern of one band's synthesized sound (no song audio). */
  function tapSoundPreview() {
    const audioCtx = AudioEngine.getContext();
    const soundId = Storage.getSettings().tapSound;
    AudioEngine.playTapSound(audioCtx, audioCtx.currentTime + 0.05, soundId);
  }

  function tunerTestSound() {
    const audioCtx = AudioEngine.getContext();
    const startAt = audioCtx.currentTime + 0.05;
    for (let i = 0; i < 4; i++) AudioEngine.playBassThump(audioCtx, startAt + i * 0.35);
  }

  async function tunerRegenerate() {
    if (!current.audioBuffer) return;
    const settings = UI.readTunerSliders();
    Storage.setTunerSettings(current.songHash, settings);
    $('analyzing-title').textContent = 'REGENERATING LEVEL...';
    $('analyze-file-name').textContent = current.songName || '';
    $('analyze-pct').textContent = '0%';
    UI.showScreen('screen-analyzing', false);
    const analysis = await AudioEngine.analyze(current.audioBuffer, settings, (p) => {
      $('analyze-pct').textContent = `${Math.round(p * 100)}%`;
    });
    current.analysis = analysis;
    current.levelData = Level.generate(analysis, current.songHash);
    Storage.cacheSongAnalysis(current.songHash, current.songName, analysis, current.levelData);
    UI.populateResult(current.songName, analysis);
    UI.resetNav();
    UI.showScreen('screen-result', false);
    UI.populateSongMap(current.levelData);
  }

  // ---------------- modifiers -> countdown -> gameplay ----------------
  function proceedFromModifiers() {
    const modifiers = UI.getActiveModifiers();
    if (current.mode === 'endless') { startEndlessSong(modifiers); return; }
    if (current.mode === 'multiplayer') { startMultiplayerRound(modifiers); return; }
    if (current.mode === 'playlist') { startPlaylistRun(modifiers); return; }
    startCountdown({ modifiers });
  }

  async function startCountdown(opts) {
    opts = opts || {};
    const modifiers = opts.modifiers || new Set();
    UI.resetNav();
    if (opts.skipCountdown) {
      UI.showScreen('screen-none', false);
    } else {
      const beatInterval = (current.levelData && current.levelData.bpm) ? 60 / current.levelData.bpm : 0.5;
      UI.showScreen('screen-countdown', false);
      for (let i = 3; i >= 1; i--) {
        UI.setCountdownNumber(i);
        await delay(beatInterval * 1000);
      }
      UI.showScreen('screen-none', false);
    }
    enterGameplay(Object.assign({
      mode: current.mode,
      audioBuffer: current.audioBuffer,
      analysis: current.analysis,
      levelData: current.levelData,
      songMeta: { hash: current.songHash, name: current.songName },
      modifiers,
    }, opts));
  }

  function enterGameplay(opts) {
    Game.configure(opts);
    UI.setupProgressBar(opts.levelData);
    UI.hidePlayerBanner();
    UI.showHUD();
    Game.start();
  }

  // ---------------- game callbacks ----------------
  function bindGameCallbacks() {
    Game.onUpdateHUD = (state) => UI.updateHUD(state);
    Game.onComboMilestone = () => UI.flashCombo();
    Game.onMiss = () => {};
    Game.onCheckpoint = () => {};
    Game.onRestart = () => UI.showToast('CHECKPOINT RESTART');
    Game.onPracticeTiming = (deltaMs, grade) => UI.updatePracticeFeedback(deltaMs, grade);
    Game.onPracticePass = (passes) => UI.updatePracticeProgress(passes);
    Game.onPracticeMastered = () => exitPractice(true);
    Game.onReplayReady = (blob) => {
      lastReplayBlob = blob;
      UI.setReplayToastVisible(true);
    };
    Game.onSongComplete = (result) => routeRunResult(result);
    Game.onGameOver = (result) => routeRunResult(result);
    Game.onError = (err) => {
      UI.logDebugError(`Game loop error: ${err && err.stack ? err.stack : err}`);
      UI.showToast('SOMETHING WENT WRONG - RETURNING TO MENU');
      Game.destroy();
      UI.hideHUD();
      UI.hidePlayerBanner();
      UI.hideEndlessBanner();
      UI.setReplayToastVisible(false);
      resetToStart();
    };
  }

  function routeRunResult(result) {
    Game.destroy();
    UI.hideHUD();
    UI.hidePlayerBanner();
    UI.hideEndlessBanner();
    UI.setReplayToastVisible(false);

    if (current.mode === 'endless') { handleEndlessSegmentComplete(result); return; }
    if (current.mode === 'multiplayer') { handleMultiplayerSegmentComplete(result); return; }
    if (current.mode === 'playlist') { handlePlaylistSegmentComplete(result); return; }
    if (current.mode === 'synctest') {
      UI.showToast('SYNC TEST COMPLETE');
      UI.resetNav();
      UI.showScreen('screen-settings', false);
      resetSessionState();
      return;
    }

    lastResult = result;
    lastRankInfo = Storage.recordRunResult(result);
    UI.populateComplete(result, lastRankInfo);
    UI.resetNav();
    UI.showScreen('screen-complete', false);
    UI.showAchievementToasts(lastRankInfo.newAchievements);
    lastRankInfo.newThemes.forEach(id => UI.showThemeUnlockOverlay(id));
    lastRankInfo.newSkins.forEach(id => {
      const def = Storage.getSkinDefs().find(d => d.id === id);
      UI.showToast(`SKIN UNLOCKED: ${def ? def.name : id.toUpperCase()}`);
    });
  }

  // ---------------- practice mode ----------------
  function enterPractice() {
    if (!lastResult) return;
    const anchor = lastResult.practiceAnchor || 0;
    const loopStart = Math.max(0, anchor - 5);
    const loopEnd = anchor + 5;
    UI.resetPractice();
    UI.resetNav();
    UI.showScreen('screen-practice', false);
    enterGameplay({
      mode: current.mode,
      audioBuffer: current.audioBuffer,
      analysis: current.analysis,
      levelData: current.levelData,
      songMeta: { hash: current.songHash, name: current.songName },
      modifiers: lastResult.modifiers ? new Set(lastResult.modifiers) : new Set(),
      practice: { loopStart, loopEnd },
    });
  }

  function exitPractice(mastered) {
    Game.destroy();
    UI.hideHUD();
    UI.resetNav();
    if (mastered) UI.showToast('SECTION MASTERED!');
    UI.showScreen('screen-complete', false);
  }

  // ============================================================
  // Stub flows - implemented in later passes
  // ============================================================

  // ---------------- mic mode ----------------
  function enterMicMode() {
    if (listenActive) {
      stopListenMode();
      Storage.setSetting('listenEnabled', false);
      $('listen-toggle').classList.remove('active');
    }
    current.mode = 'mic';
    current.audioBuffer = null;
    current.analysis = null;
    current.levelData = null;
    current.songHash = null;
    current.songName = 'Mic Mode';
    UI.showMicPermissionError(false);
    UI.setMicCountdown(null);
    UI.showScreen('screen-mic-calibration');
    startMicCalibration();
  }

  async function startMicCalibration() {
    UI.setMicTitle('LISTENING...');
    UI.setMicStatus('Make sure music is playing nearby');
    UI.showMicPermissionError(false);
    UI.setMicCountdown(null);
    try {
      await MicEngine.start();
    } catch (e) {
      UI.showMicPermissionError(true);
      return;
    }
    const calStart = performance.now();
    const visLoop = () => {
      UI.drawMicVisualizer(MicEngine.getFrequencyData());
      if (performance.now() - calStart < 5000) {
        micCalRaf = requestAnimationFrame(visLoop);
      } else {
        micCalRaf = null;
        finishMicCalibration();
      }
    };
    visLoop();
  }

  async function finishMicCalibration() {
    UI.setMicTitle('GET READY');
    UI.setMicStatus(`Detected ~${MicEngine.getBPM()} BPM`);
    const beatInterval = MicEngine.getBeatInterval();
    for (let i = 3; i >= 1; i--) {
      UI.setMicCountdown(i);
      await delay(beatInterval * 1000);
    }
    UI.setMicCountdown(null);
    UI.resetNav();
    UI.showScreen('screen-none', false);
    enterGameplay({
      mode: 'mic',
      modifiers: new Set(),
      songMeta: { name: 'Mic Mode' },
    });
  }

  // ---------------- endless mode ----------------
  function enterEndlessSetup() {
    current.mode = 'endless';
    endless = { queue: [], index: 0, carry: {}, songsSurvived: 0, totalTime: 0, modifiers: new Set() };
    UI.initMultiSelect('ENDLESS MODE', 'Choose 2 or more audio files - they will play back to back');
    UI.showScreen('screen-multi-select');
  }

  function startEndlessSong(modifiers) {
    if (modifiers) endless.modifiers = modifiers;
    const song = endless.queue[endless.index];
    current.audioBuffer = song.audioBuffer;
    current.analysis = song.analysis;
    current.levelData = song.levelData;
    current.songHash = song.hash;
    current.songName = song.name;
    UI.setEndlessBanner(`SONG ${endless.index + 1} / ${endless.queue.length}`);
    startCountdown({
      modifiers: endless.modifiers,
      carryState: endless.carry || {},
    });
  }

  function handleEndlessSegmentComplete(result) {
    if (result.finished) {
      endless.carry = {
        score: result.score, baseScore: result.baseScore,
        combo: result.combo, maxCombo: result.maxCombo,
        perfectCount: result.perfectCount, goodCount: result.goodCount, hitCount: result.hitCount,
        jumps: result.jumps,
      };
      endless.songsSurvived++;
      endless.totalTime = (endless.totalTime || 0) + result.duration;
      endless.index = (endless.index + 1) % endless.queue.length;
      startEndlessSong();
    } else {
      handleEndlessGameOver(result);
    }
  }

  function handleEndlessGameOver(result) {
    const entry = {
      score: result.score,
      songsSurvived: endless.songsSurvived,
      totalTime: Math.round((endless.totalTime || 0) + (result.duration || 0)),
    };
    Storage.addEndlessScore(entry);
    const lb = Storage.getEndlessLeaderboard();
    let rank = lb.findIndex(e => e.score === entry.score && e.songsSurvived === entry.songsSurvived && e.totalTime === entry.totalTime);
    UI.populateEndlessComplete({
      score: entry.score, maxCombo: result.maxCombo, multiplier: result.multiplier || 1, songsSurvived: entry.songsSurvived,
    }, rank >= 0 ? rank : null);
    UI.resetNav();
    UI.showScreen('screen-endless-complete', false);
  }

  function handlePlayAgainEndless() {
    if (!endless || !endless.queue.length) { resetToStart(); resetSessionState(); return; }
    endless.index = 0;
    endless.carry = {};
    endless.songsSurvived = 0;
    endless.totalTime = 0;
    startEndlessSong(endless.modifiers);
  }

  // ---------------- pass & play multiplayer ----------------
  function enterPassSetup() {
    current.mode = 'multiplayer';
    UI.initPassSetup();
    UI.showScreen('screen-pass-setup');
  }

  function handlePassSetupContinue() {
    const players = UI.getPassPlayers();
    multiplayer = {
      players: players.map(p => Object.assign({ score: 0, maxCombo: 0, perfectCount: 0 }, p)),
      index: 0, modifiers: new Set(),
    };
    current.mode = 'multiplayer';
    $('file-input-song').click();
  }

  function startMultiplayerRound(modifiers) {
    multiplayer.modifiers = modifiers;
    multiplayer.index = 0;
    showPassPhoneForCurrentPlayer();
  }

  function showPassPhoneForCurrentPlayer() {
    const player = multiplayer.players[multiplayer.index];
    UI.showPassPhoneScreen(player.name, multiplayer.index === 0 ? 'GET READY!' : 'YOUR TURN!');
    UI.resetNav();
    UI.showScreen('screen-pass-phone', false);
  }

  function handlePassContinue() {
    startCountdown({ modifiers: multiplayer.modifiers });
  }

  function handleMultiplayerSegmentComplete(result) {
    const player = multiplayer.players[multiplayer.index];
    player.score = result.score;
    player.maxCombo = result.maxCombo;
    player.perfectCount = result.perfectCount;
    multiplayer.index++;
    if (multiplayer.index < multiplayer.players.length) {
      showPassPhoneForCurrentPlayer();
    } else {
      finishMultiplayerRun();
    }
  }

  function finishMultiplayerRun() {
    if (!multiplayer || !multiplayer.players.length) { resetToStart(); resetSessionState(); return; }
    UI.populateMultiplayerComplete(multiplayer.players);
    UI.resetNav();
    UI.showScreen('screen-multiplayer-complete', false);
  }

  // ---------------- auto-dj playlist ----------------
  function enterPlaylistSetup() {
    current.mode = 'playlist';
    playlist = { queue: [], index: 0, results: [], carry: {}, modifiers: new Set() };
    UI.initMultiSelect('AUTO-DJ PLAYLIST', 'Choose songs to play back to back with crossfades');
    UI.showScreen('screen-multi-select');
  }

  function startPlaylistRun(modifiers) {
    playlist.modifiers = modifiers;
    playlist.index = 0;
    playlist.results = [];
    playlist.carry = {};
    startPlaylistSong();
  }

  function startPlaylistSong() {
    const song = playlist.queue[playlist.index];
    current.audioBuffer = song.audioBuffer;
    current.analysis = song.analysis;
    current.levelData = song.levelData;
    current.songHash = song.hash;
    current.songName = song.name;
    UI.setEndlessBanner(`TRACK ${playlist.index + 1} / ${playlist.queue.length}: ${song.name}`);
    startCountdown({
      modifiers: playlist.modifiers,
      carryState: playlist.carry || {},
      skipCountdown: playlist.index > 0,
    });
  }

  function handlePlaylistSegmentComplete(result) {
    const songName = playlist.queue[playlist.index].name;
    const previousScore = playlist.carry.score || 0;
    playlist.results.push({ name: songName, score: result.score - previousScore });
    playlist.carry = {
      score: result.score, baseScore: result.baseScore,
      combo: result.combo, maxCombo: result.maxCombo,
      perfectCount: result.perfectCount, goodCount: result.goodCount, hitCount: result.hitCount,
      jumps: result.jumps,
    };
    if (!result.finished) { finishPlaylistRun(); return; }
    playlist.index++;
    if (playlist.index < playlist.queue.length) startPlaylistSong();
    else finishPlaylistRun();
  }

  function finishPlaylistRun() {
    if (!playlist || !playlist.queue.length) { resetToStart(); resetSessionState(); return; }
    UI.populatePlaylistSummary(playlist.results, playlist.carry.score || 0);
    UI.resetNav();
    UI.showScreen('screen-playlist-summary', false);
  }

  // ---------------- multi-select shared ----------------
  let multiSelectQueue = Promise.resolve();
  function addAndAnalyzeMultiFile(file) {
    const i = UI.addMultiSelectFile(file);
    multiSelectQueue = multiSelectQueue.then(() => analyzeMultiFile(file, i));
  }

  async function analyzeMultiFile(file, i) {
    UI.setMultiSelectFileStatus(i, 'analyzing');
    try {
      const audioBuffer = await AudioEngine.decodeFile(file);
      const hash = AudioEngine.hashAudioBuffer(audioBuffer);
      const tunerSettings = Storage.getTunerSettings(hash);
      const analysis = await AudioEngine.analyze(audioBuffer, tunerSettings);
      const levelData = Level.generate(analysis, hash);
      const entry = UI.getMultiSelectFiles()[i];
      entry.audioBuffer = audioBuffer;
      entry.analysis = analysis;
      entry.levelData = levelData;
      entry.hash = hash;
      UI.setMultiSelectFileStatus(i, 'ready');
    } catch (e) {
      console.error(e);
      UI.setMultiSelectFileStatus(i, 'error');
    }
  }

  function handleMultiSelectContinue() {
    const files = UI.getMultiSelectFiles().filter(f => f.status === 'ready');
    if (!files.length) {
      UI.showToast('Add at least one ready song first.');
      return;
    }
    const queue = files.map(f => ({ name: f.name, audioBuffer: f.audioBuffer, analysis: f.analysis, levelData: f.levelData, hash: f.hash }));
    if (current.mode === 'endless') {
      endless.queue = queue;
      endless.index = 0;
      UI.populateModifiers();
      UI.showScreen('screen-modifiers');
    } else if (current.mode === 'playlist') {
      playlist.queue = queue;
      playlist.index = 0;
      UI.populateModifiers();
      UI.showScreen('screen-modifiers');
    }
  }

  // ---------------- challenge codes ----------------
  function encodeChallengeCode(hash, modifiers, score) {
    let bitmask = 0;
    Game.MODIFIER_DEFS.forEach((def, i) => {
      if (modifiers.has(def.id)) bitmask |= (1 << i);
    });
    return `${hash}-${bitmask.toString(36)}-${Math.round(score).toString(36)}`.toUpperCase();
  }

  function decodeChallengeCode(code) {
    const parts = (code || '').trim().toUpperCase().split('-');
    if (parts.length !== 3 || !parts[0]) return null;
    const bitmask = parseInt(parts[1], 36);
    const score = parseInt(parts[2], 36);
    if (isNaN(bitmask) || isNaN(score)) return null;
    const modifiers = new Set();
    Game.MODIFIER_DEFS.forEach((def, i) => {
      if (bitmask & (1 << i)) modifiers.add(def.id);
    });
    return { hash: parts[0].toLowerCase(), modifiers, score };
  }

  function handleSubmitChallenge() {
    const decoded = decodeChallengeCode(UI.getChallengeCodeInput());
    if (!decoded) {
      UI.setChallengeMessage('Invalid code format.', true);
      return;
    }
    challenge = decoded;
    current.mode = 'challenge';
    UI.setChallengeMessage('Now select the matching song...');
    $('file-input-song').click();
  }

  function handleChallengeSongLoaded() {
    if (current.songHash !== challenge.hash) {
      UI.showToast('That song does not match this challenge code.');
      current.mode = 'file';
      UI.resetNav();
      UI.showScreen('screen-challenge-enter', false);
      return;
    }
    challenge.ghostData = [
      { time: 0, score: 0 },
      { time: current.levelData.duration, score: challenge.score },
    ];
    startCountdown({ modifiers: challenge.modifiers, ghostData: challenge.ghostData });
  }

  function handleGetChallenge() {
    if (!lastResult) return;
    const code = encodeChallengeCode(lastResult.songHash, new Set(lastResult.modifiers), lastResult.score);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code)
        .then(() => UI.showToast(`CHALLENGE CODE COPIED: ${code}`))
        .catch(() => UI.showToast(`CHALLENGE CODE: ${code}`));
    } else {
      UI.showToast(`CHALLENGE CODE: ${code}`);
    }
  }

  // ---------------- score card share ----------------
  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line ? `${line} ${words[i]}` : words[i];
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
    return lines.length;
  }

  function handleShareCard() {
    if (!lastResult) return;
    const W = 1080, H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const style = getComputedStyle(document.body);
    const accent = (style.getPropertyValue('--accent') || '#ffffff').trim();
    const accentDim = (style.getPropertyValue('--accent-dim') || '#888888').trim();

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';

    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 40;
    ctx.font = 'bold 90px "Courier New", monospace';
    ctx.fillText('O N E   D O T', W / 2, 180);

    ctx.shadowBlur = 0;
    ctx.font = '32px "Courier New", monospace';
    ctx.fillStyle = accentDim;
    const songName = (lastResult.songName || 'UNKNOWN TRACK').toUpperCase();
    wrapCanvasText(ctx, songName, W / 2, 250, W - 160, 40);

    const skinId = Storage.getSettings().skin || 'classic';
    const renderer = (Game.SKIN_RENDERERS && (Game.SKIN_RENDERERS[skinId] || Game.SKIN_RENDERERS.classic));
    if (renderer) {
      ctx.save();
      renderer(ctx, W / 2, 430, 70, accent, 0);
      ctx.restore();
    }

    ctx.shadowColor = accent;
    ctx.shadowBlur = 30;
    ctx.fillStyle = accent;
    ctx.font = 'bold 140px "Courier New", monospace';
    ctx.fillText(Math.round(lastResult.score).toLocaleString('en-US'), W / 2, 680);
    ctx.shadowBlur = 0;
    ctx.font = '28px "Courier New", monospace';
    ctx.fillStyle = accentDim;
    ctx.fillText(lastResult.finished ? 'SONG COMPLETE' : 'GAME OVER', W / 2, 730);

    const perfectRate = lastResult.totalBeats ? (lastResult.perfectCount / lastResult.totalBeats * 100) : 0;
    const rows = [
      ['PERFECT', `${lastResult.perfectCount} (${perfectRate.toFixed(1)}%)`],
      ['GOOD', `${lastResult.goodCount}`],
      ['MAX COMBO', `${lastResult.maxCombo}`],
      ['MULTIPLIER', `×${lastResult.multiplier.toFixed(1)}`],
    ];
    ctx.font = '34px "Courier New", monospace';
    let y = 840;
    rows.forEach(([label, value]) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = accentDim;
      ctx.fillText(label, 130, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = accent;
      ctx.fillText(String(value), W - 130, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(130, y + 24);
      ctx.lineTo(W - 130, y + 24);
      ctx.stroke();
      y += 90;
    });

    if (lastResult.modifiers && lastResult.modifiers.length) {
      ctx.textAlign = 'center';
      ctx.fillStyle = accentDim;
      ctx.font = '24px "Courier New", monospace';
      const names = lastResult.modifiers.map(id => {
        const def = Game.MODIFIER_DEFS.find(d => d.id === id);
        return (def ? def.name : id).replace(/[^\x00-\x7F]/g, '').trim();
      });
      wrapCanvasText(ctx, names.join('   /   '), W / 2, y + 40, W - 160, 36);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = accentDim;
    ctx.font = '24px "Courier New", monospace';
    ctx.fillText('ONE DOT - A RHYTHM GAME FOR YOUR EARS', W / 2, H - 60);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'onedot-score.png', { type: 'image/png' });
      let shared = false;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'ONE DOT', text: `I scored ${Math.round(lastResult.score).toLocaleString('en-US')} on ONE DOT!` });
          shared = true;
        } catch (e) {}
      }
      if (!shared) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'onedot-score.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    }, 'image/png');
  }

  // ---------------- instant replay ----------------
  async function handleSaveReplay() {
    if (!lastReplayBlob) return;
    const blob = lastReplayBlob;
    const file = new File([blob], 'onedot-replay.webm', { type: blob.type || 'video/webm' });
    let shared = false;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'ONE DOT Replay' });
        shared = true;
      } catch (e) {}
    }
    if (!shared) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'onedot-replay.webm';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    UI.setReplayToastVisible(false);
  }

  // ---------------- audio reactive listen mode ----------------
  let listenBeatFlash = 0;
  let listenHeartbeatInterval = 1;
  const IDLE_HEARTBEAT_INTERVAL = 1; // 60 BPM resting pulse when LISTEN mode is off

  function listenLoop() {
    if (!listenActive) return;
    const data = MicEngine.getFrequencyData();
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const level = data.length ? (sum / data.length) / 255 : 0;
    listenBeatFlash *= 0.9;
    const glow = Math.min(1, level * 1.5 + listenBeatFlash);
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#ffffff';

    const ring = $('spectrum-ring');
    ring.style.borderColor = accent;
    ring.style.opacity = String(0.25 + glow * 0.75);
    ring.style.boxShadow = `0 0 ${20 + glow * 80}px ${accent}`;
    ring.style.transform = `scale(${1 + glow * 0.25})`;

    const logo = $('logo');
    logo.style.transform = `scale(${1 + glow * 0.12})`;
    logo.style.opacity = String(0.85 + glow * 0.15);

    const beatInterval = MicEngine.getBeatInterval();
    if (Math.abs(beatInterval - listenHeartbeatInterval) > 0.02) {
      listenHeartbeatInterval = beatInterval;
      UI.setHeartbeatRate('menu-heartbeat-dot', beatInterval);
    }

    listenRaf = requestAnimationFrame(listenLoop);
  }

  async function startListenMode() {
    if (listenActive) return;
    await MicEngine.start();
    listenActive = true;
    listenBeatFlash = 0;
    listenHeartbeatInterval = 1;
    $('logo').style.animation = 'none';
    MicEngine.onBeat = (beat) => {
      listenBeatFlash = beat.type === 'strong' ? 1 : 0.6;
    };
    listenLoop();
  }

  function stopListenMode() {
    if (!listenActive) return;
    listenActive = false;
    if (listenRaf) cancelAnimationFrame(listenRaf);
    listenRaf = null;
    MicEngine.onBeat = null;
    MicEngine.stop();
    UI.setHeartbeatRate('menu-heartbeat-dot', IDLE_HEARTBEAT_INTERVAL);
    const ring = $('spectrum-ring');
    ring.style.borderColor = '';
    ring.style.opacity = '';
    ring.style.boxShadow = '';
    ring.style.transform = '';
    const logo = $('logo');
    logo.style.animation = '';
    logo.style.transform = '';
    logo.style.opacity = '';
  }

  async function toggleListenMode() {
    if (listenActive) {
      stopListenMode();
      Storage.setSetting('listenEnabled', false);
      $('listen-toggle').classList.remove('active');
      return;
    }
    try {
      await startListenMode();
      Storage.setSetting('listenEnabled', true);
      $('listen-toggle').classList.add('active');
    } catch (e) {
      UI.showToast('Microphone access denied.');
    }
  }

  // ---------------- input handling ----------------
  function bindInput() {
    window.addEventListener('pointerdown', () => {
      if (isGameplayScreen() && !Game.isPaused) Game.tap();
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (isGameplayScreen() && !Game.isPaused) {
          e.preventDefault();
          Game.tap();
        }
      } else if (e.code === 'Escape') {
        if (UI.getCurrentScreen() === 'screen-none') handleAction('pause');
        else if (UI.getCurrentScreen() === 'screen-pause') handleAction('resume');
      }
    });
  }

  function bindFileInputs() {
    $('file-input-song').addEventListener('change', (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (file) analyzeAndShowResult(file);
    });
    $('file-input-multi').addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      e.target.value = '';
      files.forEach(f => addAndAnalyzeMultiFile(f));
    });
  }

  function bindVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (UI.getCurrentScreen() === 'screen-none' && !Game.isPaused) {
          Game.pause();
          UI.showScreen('screen-pause', false);
        }
        if (listenActive && listenRaf) {
          cancelAnimationFrame(listenRaf);
          listenRaf = null;
        }
      } else if (listenActive && !listenRaf) {
        listenLoop();
      }
    });
  }

  // ---------------- gamepad / controller support ----------------
  function bindGamepad() {
    if (!navigator.getGamepads) return;
    let connected = false;
    let focusIndex = -1;
    let lastScreen = null;
    const prevPressed = {};

    window.addEventListener('gamepadconnected', () => {
      if (!connected) {
        connected = true;
        UI.showControllerToast();
      }
    });

    function getFocusables() {
      const screen = $(UI.getCurrentScreen());
      if (!screen) return [];
      return Array.from(screen.querySelectorAll('.focusable')).filter(el => el.offsetParent !== null);
    }

    function moveFocus(list, dir) {
      list.forEach(el => el.classList.remove('focused'));
      if (!list.length) { focusIndex = -1; return; }
      focusIndex = ((focusIndex + dir) % list.length + list.length) % list.length;
      list[focusIndex].classList.add('focused');
      list[focusIndex].scrollIntoView({ block: 'nearest' });
    }

    function justPressed(key, isDown) {
      const was = prevPressed[key];
      prevPressed[key] = isDown;
      return isDown && !was;
    }

    function poll() {
      const pads = navigator.getGamepads();
      for (let p = 0; p < pads.length; p++) {
        const pad = pads[p];
        if (!pad) continue;
        if (!connected) {
          connected = true;
          UI.showControllerToast();
        }

        const screen = UI.getCurrentScreen();
        if (screen !== lastScreen) {
          focusIndex = -1;
          lastScreen = screen;
        }

        if (isGameplayScreen()) {
          if (!Game.isPaused) {
            for (let b = 0; b < pad.buttons.length; b++) {
              if (b === 8 || b === 9) continue;
              if (justPressed(`${p}-btn${b}`, pad.buttons[b].pressed)) { Game.tap(); break; }
            }
          }
          if (justPressed(`${p}-start`, pad.buttons[9] && pad.buttons[9].pressed)) {
            handleAction('pause');
          }
          continue;
        }

        const list = getFocusables();
        const axisY = pad.axes[1] || 0;
        const downPressed = (pad.buttons[13] && pad.buttons[13].pressed) || axisY > 0.5;
        const upPressed = (pad.buttons[12] && pad.buttons[12].pressed) || axisY < -0.5;
        if (justPressed(`${p}-down`, downPressed)) moveFocus(list, 1);
        else if (justPressed(`${p}-up`, upPressed)) moveFocus(list, -1);

        if (justPressed(`${p}-a`, pad.buttons[0] && pad.buttons[0].pressed)) {
          const el = list[focusIndex];
          if (el) el.click();
        }
        if (justPressed(`${p}-b`, pad.buttons[1] && pad.buttons[1].pressed)) {
          handleAction('back');
        }
      }
      requestAnimationFrame(poll);
    }
    requestAnimationFrame(poll);
  }

  document.addEventListener('DOMContentLoaded', init);

  return {};
})();
