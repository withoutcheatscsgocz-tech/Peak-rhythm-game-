/* ============================================================
   ONE DOT - main.js
   App controller: screen flow, audio pipeline, input binding,
   and orchestration of Game/UI/Audio/Storage/Level/Haptics.
   ============================================================ */

const App = (() => {
  const $ = (id) => document.getElementById(id);

  // ---------------- state ----------------
  let current = {
    mode: 'file', // file | endless | multiplayer | playlist | challenge
    audioBuffer: null, analysis: null, levelData: null,
    songHash: null, songName: null,
    songFile: null, // original File, kept around so it can be published to the Public Library
    publicLevel: null, // { id, title, author } when playing a downloaded Public Library level
  };
  let lastResult = null;
  let lastRankInfo = null;
  let lastReplayBlob = null;

  let endless = null;
  let playlist = null;
  let multiplayer = null;
  let challenge = null;

  // Public Library: the full fetched page is cached so the search/sort/BPM
  // toolbar filters it locally and instantly (no extra network round-trips).
  let publicLevelsCache = [];
  let publicLibraryControlsBound = false;
  let publicLibraryLoading = false;

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

  /**
   * Unlocks an achievement outside the normal end-of-run flow (e.g. caching
   * a song, publishing to the Public Library, surviving an Endless run) and
   * surfaces toasts for it plus any themes/trails it gates.
   */
  function announceAchievement(achId) {
    if (!Storage.unlockAchievement(achId)) return;
    UI.showAchievementToasts([achId]);
    const cosmetics = Storage.unlockCosmeticsForAchievement(achId);
    cosmetics.newThemes.forEach(id => UI.showThemeUnlockOverlay(id));
    cosmetics.newTrails.forEach(id => {
      const def = Storage.getTrailDefs().find(d => d.id === id);
      UI.showToast(`TRAIL UNLOCKED: ${def ? def.name : id.toUpperCase()}`);
    });
  }

  function resetSessionState() {
    current = { mode: 'file', audioBuffer: null, analysis: null, levelData: null, songHash: null, songName: null, songFile: null, publicLevel: null };
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
    I18N.init();
    Game.init($('game-canvas'), $('fx-canvas'));
    UI.init();
    UI.setHeartbeatRate('menu-heartbeat-dot', 1);
    bindGameCallbacks();
    bindGlobalActions();
    bindFileInputs();
    bindInput();
    bindVisibility();
    bindGamepad();
    if (!Storage.isTutorialDone()) $('tutorial-btn').classList.add('attention');
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

  /** When DEBUG LOG is on, prints the key beat-detection numbers for a song
   * (BPM, phase, confidence, grid stability, dominant band, event count) so
   * rhythm issues can be diagnosed per-track without extra tooling. */
  function logAnalysisDebug(name, analysis) {
    if (!Storage.getSettings().debugLog) return;
    const ev = analysis.events || [];
    UI.logDebugError(
      `Analysis "${name}": bpm=${analysis.bpm} phase=${Math.round(analysis.phase * 1000)}ms ` +
      `conf=${analysis.confidence.toFixed(2)} grid=${analysis.gridStability.toFixed(2)} ` +
      `band=${analysis.dominantBand} events=${ev.length} dur=${analysis.duration.toFixed(1)}s`
    );
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
      case 'public-library':
        openPublicLibrary();
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
      case 'tutorial':
        startTutorial();
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
      case 'publish-level':
        handlePublishLevel();
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
    $('analyzing-title').textContent = I18N.t('analyzing.title');
    $('analyze-file-name').textContent = file.name;
    $('analyze-pct').textContent = '0%';
    UI.showScreen('screen-analyzing', false);
    try {
      const audioBuffer = await AudioEngine.decodeFile(file);
      const hash = AudioEngine.hashAudioBuffer(audioBuffer);
      const cached = Storage.getCachedSong(hash);
      let analysis, levelData;
      // analyses without `events` predate the rhythm-v3 pipeline - re-analyze
      if (cached && cached.analysis && cached.analysis.events && cached.analysis.events.length) {
        $('analyzing-title').textContent = I18N.t('analyzing.loadedFromLibrary');
        $('analyze-pct').textContent = '100%';
        analysis = cached.analysis;
        levelData = Level.generate(analysis, hash);
      } else {
        const tunerSettings = tunerSettingsFor(hash);
        analysis = await AudioEngine.analyze(audioBuffer, tunerSettings, (p) => {
          $('analyze-pct').textContent = `${Math.round(p * 100)}%`;
        });
        logAnalysisDebug(file.name, analysis);
        levelData = Level.generate(analysis, hash);
        Storage.cacheSongAnalysis(hash, file.name, analysis, levelData);
        if (Storage.getLibrarySongs().length >= 8) announceAchievement('archivist');
      }
      current.audioBuffer = audioBuffer;
      current.analysis = analysis;
      current.levelData = levelData;
      current.songHash = hash;
      current.songName = file.name;
      current.songFile = file;
      current.publicLevel = null;

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
      UI.populateResult(file.name, analysis, null);
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

  // ---------------- public library (shared songs/levels) ----------------
  async function openPublicLibrary() {
    UI.resetNav();
    UI.showScreen('screen-public-library');
    bindPublicLibraryControls();
    publicLevelsCache = [];
    publicLibraryLoading = true;
    renderPublicLibrary(); // shows loading state immediately
    try {
      publicLevelsCache = await Cloud.fetchPublicLevels();
    } catch (e) {
      console.error(e);
      UI.showToast('Could not load Public Library (check connection).');
      publicLevelsCache = [];
    } finally {
      publicLibraryLoading = false;
      renderPublicLibrary();
    }
  }

  /** Wires the search / sort / BPM-range toolbar once; each change just re-filters the cached list. */
  function bindPublicLibraryControls() {
    if (publicLibraryControlsBound) return;
    publicLibraryControlsBound = true;
    ['public-search-input', 'public-bpm-min', 'public-bpm-max'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('input', renderPublicLibrary);
    });
    const sort = $('public-sort-select');
    if (sort) sort.addEventListener('change', renderPublicLibrary);
  }

  /** Filters + sorts the cached Public Library page from the toolbar, then renders it. */
  function renderPublicLibrary() {
    const myLevelIds = Storage.getMyPublishedLevelIds();
    const query = (($('public-search-input') || {}).value || '').trim().toLowerCase();
    const sort = (($('public-sort-select') || {}).value) || 'newest';
    const bpmMin = parseFloat(($('public-bpm-min') || {}).value) || 0;
    const bpmMax = parseFloat(($('public-bpm-max') || {}).value) || Infinity;

    let levels = publicLevelsCache.filter(l => {
      const bpm = Math.round(l.bpm || 0);
      if (bpm < bpmMin || bpm > bpmMax) return false;
      if (!query) return true;
      return (l.title || '').toLowerCase().includes(query)
        || (l.author_name || '').toLowerCase().includes(query);
    });

    const ratingScore = (l) => (l.upvote_count || 0) - (l.downvote_count || 0);
    const sorters = {
      newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      played: (a, b) => (b.play_count || 0) - (a.play_count || 0),
      rating: (a, b) => ratingScore(b) - ratingScore(a),
      'bpm-asc': (a, b) => (a.bpm || 0) - (b.bpm || 0),
      'bpm-desc': (a, b) => (b.bpm || 0) - (a.bpm || 0),
    };
    levels = levels.slice().sort(sorters[sort] || sorters.newest);

    const emptyMsg = publicLibraryLoading
      ? 'Loading Public Library…'
      : (publicLevelsCache.length
        ? 'No songs match your search. Try clearing the filters.'
        : undefined); // undefined -> default "be the first to publish" hint
    UI.populatePublicLibrary(
      levels, playPublicLevel, reportPublicLevel, deletePublicLevel,
      myLevelIds, ratePublicLevel, emptyMsg,
    );
  }

  /** Casts/switches this device's thumbs up/down on a shared level. Optimistic; persists the vote locally. */
  async function ratePublicLevel(level, value, prev) {
    if (!level || !Cloud.isConfigured()) return;
    Storage.setLevelRating(level.id, value);
    try {
      await Cloud.rateLevel(level.id, value, prev);
    } catch (e) {
      console.error(e);
      // roll back local vote + optimistic counts so the UI stays truthful
      Storage.setLevelRating(level.id, prev);
      if (value === 1) level.upvote_count = Math.max(0, (level.upvote_count || 0) - 1);
      if (value === -1) level.downvote_count = Math.max(0, (level.downvote_count || 0) - 1);
      if (prev === 1) level.upvote_count = (level.upvote_count || 0) + 1;
      if (prev === -1) level.downvote_count = (level.downvote_count || 0) + 1;
      UI.showToast('Could not save your rating (check connection).');
      renderPublicLibrary();
    }
  }

  /** Flags a shared level for moderation (with a reason); the server auto-hides it past a threshold. */
  async function reportPublicLevel(level, reason, onDone) {
    if (!level || !Cloud.isConfigured()) return;
    try {
      await Cloud.reportLevel(level.id, reason);
      if (onDone) onDone();
      UI.showToast('Reported. Thanks - flagged levels are hidden automatically.');
    } catch (e) {
      console.error(e);
      UI.showToast('Could not report this level (check connection).');
    }
  }

  /** Deletes a level this device published. Requires the owner token saved at publish time. */
  async function deletePublicLevel(level, onDone) {
    if (!level || !Cloud.isConfigured()) return;
    const token = Storage.getOwnerToken(level.id);
    if (!token) return;
    if (!window.confirm(`Delete "${level.title}" for everyone? This cannot be undone.`)) return;
    try {
      await Cloud.deleteLevel(level.id, token);
      Storage.removePublishedLevel(level.id);
      publicLevelsCache = publicLevelsCache.filter(l => l.id !== level.id);
      renderPublicLibrary();
      UI.showToast('Level deleted.');
    } catch (e) {
      console.error(e);
      UI.showToast('Could not delete this level (check connection).');
    }
  }

  async function playPublicLevel(level) {
    $('analyzing-title').textContent = I18N.t('analyzing.downloadingSong');
    $('analyze-file-name').textContent = level.title;
    $('analyze-pct').textContent = '';
    UI.showScreen('screen-analyzing', false);
    try {
      const full = await Cloud.fetchLevel(level.id);
      if (!full || !full.level_data || !full.level_data.levelData || !full.level_data.analysis) {
        throw new Error('Level data missing');
      }
      const arrayBuffer = await Cloud.downloadSong(full.storage_path);
      const audioBuffer = await AudioEngine.decodeFile(new Blob([arrayBuffer]));

      current.mode = 'file';
      current.audioBuffer = audioBuffer;
      current.analysis = full.level_data.analysis;
      current.levelData = full.level_data.levelData;
      current.songHash = full.song_hash;
      current.songName = full.title;
      current.songFile = null;
      current.publicLevel = { id: full.id, title: full.title, author: full.author_name };

      UI.populateResult(full.title, current.analysis, { author: full.author_name });
      UI.resetNav();
      UI.showScreen('screen-result', false);
      UI.populateSongMap(current.levelData);
    } catch (e) {
      console.error(e);
      UI.showToast('Could not download this level.');
      UI.resetNav();
      UI.showScreen('screen-public-library', false);
    }
  }

  async function handlePublishLevel() {
    if (!current.audioBuffer || !current.songFile || !current.levelData) return;
    if (!Cloud.isConfigured()) {
      UI.setPublishStatus('Public Library is not configured for this build yet.', true);
      return;
    }
    if (current.songFile.size > Cloud.MAX_UPLOAD_BYTES) {
      const mb = (Cloud.MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
      UI.setPublishStatus(`This song is too large to publish (max ${mb} MB). Try a shorter clip or a smaller file.`, true);
      return;
    }
    const title = UI.getPublishTitle() || current.songName || 'Untitled';

    // Duplicate detection: the same audio file produces the same song_hash, so
    // if it's already in the library, point the player to it instead of stacking
    // identical copies (and splitting the shared leaderboard across them).
    try {
      const dupes = await Cloud.findLevelsByHash(current.songHash);
      if (dupes && dupes.length) {
        const d = dupes[0];
        const ok = window.confirm(
          `This exact song is already in the Public Library as "${d.title}" by ${d.author_name} ` +
          `(${d.play_count || 0} plays). Publish another copy anyway?`,
        );
        if (!ok) {
          UI.setPublishStatus('Already in the Public Library - find it there to play and compete on its leaderboard.');
          return;
        }
      }
    } catch (e) {
      console.error(e); // non-fatal: if the dupe check fails, fall through and publish
    }

    UI.setPublishStatus('Publishing...');
    try {
      const result = await Cloud.publishLevel({
        title,
        fileName: current.songFile.name,
        authorName: Storage.getPlayerName(),
        songHash: current.songHash,
        bpm: current.levelData.bpm,
        duration: current.levelData.duration,
        analysis: current.analysis,
        levelData: current.levelData,
        audioFile: current.songFile,
      });
      if (result && result.id && result.ownerToken) {
        Storage.recordPublishedLevel(result.id, result.ownerToken, title);
      }
      UI.setPublishStatus('Published! Other players can now find this in the Public Library. You can delete it later from the Public Library list.');
      announceAchievement('goingPublic');
    } catch (e) {
      console.error(e);
      if (e && (e.code === 'TOO_LARGE' || /413|too large/i.test(String(e.message)))) {
        const mb = (Cloud.MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
        UI.setPublishStatus(`This song is too large to publish (max ${mb} MB).`, true);
      } else {
        UI.setPublishStatus('Could not publish (check connection).', true);
      }
    }
  }

  /** Submits this run's score to the level's global leaderboard, then refreshes it. */
  async function submitGlobalScore(result) {
    const level = current.publicLevel;
    if (!level || !Cloud.isConfigured()) return;
    const perfectRate = result.totalBeats ? (result.perfectCount / result.totalBeats) : 0;
    try {
      await Cloud.submitScore({
        levelId: level.id,
        playerName: Storage.getPlayerName(),
        score: result.score,
        maxCombo: result.maxCombo,
        perfectRate,
        modifiers: result.modifiers || [],
      });
      await Cloud.incrementPlayCount(level.id);
      const entries = await Cloud.fetchLeaderboard(level.id);
      UI.showGlobalLeaderboard(entries, Storage.getPlayerName(), refreshGlobalLeaderboard);
    } catch (e) {
      console.error(e);
    }
  }

  /** Re-fetches and re-renders the current level's global leaderboard (e.g. after a name change). */
  async function refreshGlobalLeaderboard() {
    const level = current.publicLevel;
    if (!level || !Cloud.isConfigured()) return;
    try {
      const entries = await Cloud.fetchLeaderboard(level.id);
      UI.showGlobalLeaderboard(entries, Storage.getPlayerName(), refreshGlobalLeaderboard);
    } catch (e) {
      console.error(e);
    }
  }

  // ---------------- tutorial ----------------
  const TUTORIAL_HINTS = [
    { time: 0.2, text: 'TAP WHEN A SPIKE REACHES THE BALL' },
    { time: 10.5, text: 'PERFECT TAPS = BIG BOUNCES + MORE POINTS' },
    { time: 11.4, text: 'SPIKES NOW COME EVERY 2ND BEAT' },
    { time: 21, text: 'EVERY BEAT NOW - RIDE THE RHYTHM' },
    { time: 32.5, text: 'MISSED? THE BALL ROLLS - TAP A SPIKE TO BOUNCE BACK' },
  ];
  let tutorialHintIndex = 0;

  async function startTutorial() {
    UI.showScreen('screen-analyzing', false);
    $('analyzing-title').textContent = I18N.t('analyzing.preparingTutorial');
    $('analyze-file-name').textContent = I18N.t('analyzing.lessonBounce');
    $('analyze-pct').textContent = '';
    try {
      const { buffer, analysis } = await AudioEngine.generateTutorialTrack();
      const levelData = Level.generate(analysis, 'tutorial');
      current.mode = 'tutorial';
      current.audioBuffer = buffer;
      current.analysis = analysis;
      current.levelData = levelData;
      current.songHash = 'tutorial';
      current.songName = 'TUTORIAL';
      tutorialHintIndex = 0;
      // noFail: never restart during the lesson, only roll + recover
      await startCountdown({ modifiers: new Set(['noFail']) });
    } catch (e) {
      console.error(e);
      UI.showToast('Could not start tutorial.');
      UI.resetNav();
      resetToStart();
    }
  }

  function maybeShowTutorialHint(songTime) {
    while (tutorialHintIndex < TUTORIAL_HINTS.length && songTime >= TUTORIAL_HINTS[tutorialHintIndex].time) {
      UI.showToast(TUTORIAL_HINTS[tutorialHintIndex].text);
      tutorialHintIndex++;
    }
  }

  // ---------------- sync test mode (settings) ----------------
  async function startSyncTest() {
    UI.showScreen('screen-analyzing', false);
    $('analyzing-title').textContent = I18N.t('analyzing.preparingSyncTest');
    $('analyze-file-name').textContent = I18N.t('analyzing.clickTrack120');
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
      UI.showSyncOffsetReadout();
    } catch (e) {
      console.error(e);
      UI.showToast('Could not start sync test.');
      UI.resetNav();
      UI.showScreen('screen-settings', false);
      resetSessionState();
    }
  }

  /**
   * Auto-calibrates the Audio Latency Offset from the raw tap-vs-beat
   * offsets measured during the sync test (independent of whatever offset
   * was already set), so the test produces a usable result even when the
   * player started out badly out of sync (which would otherwise show MISS
   * on every tap with no clue which way to move the slider).
   */
  function finishSyncTest(result) {
    const offsets = (result.syncOffsets || []).filter(v => Math.abs(v) <= 250);
    if (!offsets.length) {
      UI.showToast('SYNC TEST COMPLETE - tap along to the clicks next time to auto-calibrate!');
      return;
    }
    const sorted = offsets.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const avgMs = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const prevOffset = Storage.getSettings().latencyOffset || 0;
    let next = Math.round(-avgMs / 5) * 5;
    next = Math.max(-300, Math.min(300, next));
    Storage.setSetting('latencyOffset', next);
    const sign = avgMs > 0 ? '+' : '';
    UI.showToast(`SYNC TEST COMPLETE - taps were ${sign}${Math.round(avgMs)}ms off, Latency Offset set to ${next}ms`);
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

  /** Per-song tuner settings with the global "Rhythm Focus" preference merged in. */
  function tunerSettingsFor(hash) {
    const settings = Storage.getTunerSettings(hash);
    settings.vocalFocus = Storage.getSettings().vocalFocus;
    return settings;
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
    settings.vocalFocus = Storage.getSettings().vocalFocus;
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
    settings.vocalFocus = Storage.getSettings().vocalFocus;
    Storage.setTunerSettings(current.songHash, settings);
    $('analyzing-title').textContent = I18N.t('analyzing.regeneratingLevel');
    $('analyze-file-name').textContent = current.songName || '';
    $('analyze-pct').textContent = '0%';
    UI.showScreen('screen-analyzing', false);
    const analysis = await AudioEngine.analyze(current.audioBuffer, settings, (p) => {
      $('analyze-pct').textContent = `${Math.round(p * 100)}%`;
    });
    logAnalysisDebug(current.songName || '', analysis);
    current.analysis = analysis;
    current.levelData = Level.generate(analysis, current.songHash);
    Storage.cacheSongAnalysis(current.songHash, current.songName, analysis, current.levelData);
    UI.populateResult(current.songName, analysis, null);
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
    Game.onUpdateHUD = (state) => {
      UI.updateHUD(state);
      if (current.mode === 'tutorial') maybeShowTutorialHint(state.songTime);
    };
    Game.onComboMilestone = () => UI.flashCombo();
    Game.onSyncTap = (info) => UI.updateSyncOffsetReadout(info);
    Game.onMiss = () => {};
    Game.onRecovery = () => UI.showToast('BACK ON TRACK');
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
      finishSyncTest(result);
      UI.resetNav();
      UI.showScreen('screen-settings', false);
      UI.refreshLatencySliders();
      resetSessionState();
      return;
    }
    if (current.mode === 'tutorial') {
      Storage.markTutorialDone();
      $('tutorial-btn').classList.remove('attention');
      UI.showToast(result.finished ? 'TUTORIAL COMPLETE - UPLOAD A SONG!' : 'TUTORIAL ENDED');
      UI.resetNav();
      resetToStart();
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
    lastRankInfo.newTrails.forEach(id => {
      const def = Storage.getTrailDefs().find(d => d.id === id);
      UI.showToast(`TRAIL UNLOCKED: ${def ? def.name : id.toUpperCase()}`);
    });
    if (result.finished && current.publicLevel) submitGlobalScore(result);
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

  // ---------------- endless mode ----------------
  function enterEndlessSetup() {
    current.mode = 'endless';
    endless = { queue: [], index: 0, carry: {}, songsSurvived: 0, totalTime: 0, modifiers: new Set() };
    UI.initMultiSelect(I18N.t('multiSelect.endlessTitle'), I18N.t('multiSelect.endlessInfo'));
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
      if (endless.songsSurvived >= 5) announceAchievement('endlessLegend');
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
    UI.showPassPhoneScreen(player.name, multiplayer.index === 0 ? I18N.t('pass.getReady') : I18N.t('pass.yourTurn'));
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
    UI.initMultiSelect(I18N.t('multiSelect.playlistTitle'), I18N.t('multiSelect.playlistInfo'));
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
      const tunerSettings = tunerSettingsFor(hash);
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

  // ---------------- native share helper ----------------
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function shareBlob(blob, filename, shareOpts) {
    const cap = window.Capacitor;
    const isNative = cap && cap.isNativePlatform && cap.isNativePlatform();
    if (isNative && cap.Plugins && cap.Plugins.Filesystem && cap.Plugins.Share) {
      try {
        const data = await blobToBase64(blob);
        const written = await cap.Plugins.Filesystem.writeFile({ path: filename, data, directory: 'CACHE' });
        await cap.Plugins.Share.share(Object.assign({ files: [written.uri] }, shareOpts));
        return true;
      } catch (e) {
        // fall through to web fallback
      }
    }
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share(Object.assign({ files: [file] }, shareOpts));
        return true;
      } catch (e) {}
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return false;
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

    canvas.toBlob((blob) => {
      if (!blob) return;
      shareBlob(blob, 'onedot-score.png', {
        title: 'ONE DOT',
        text: `I scored ${Math.round(lastResult.score).toLocaleString('en-US')} on ONE DOT!`,
        dialogTitle: 'Share your score',
      });
    }, 'image/png');
  }

  // ---------------- instant replay ----------------
  async function handleSaveReplay() {
    if (!lastReplayBlob) return;
    await shareBlob(lastReplayBlob, 'onedot-replay.webm', {
      title: 'ONE DOT Replay',
      dialogTitle: 'Share your replay',
    });
    UI.setReplayToastVisible(false);
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
