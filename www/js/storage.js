/* ============================================================
   ONE DOT - storage.js
   Single localStorage-backed data store: settings, unlocks,
   achievements, lifetime stats, leaderboards, tuner settings.
   ============================================================ */

const Storage = (() => {
  const KEY = 'oneDot_v1';

  const ACHIEVEMENT_DEFS = [
    { id: 'firstSteps',  name: 'FIRST STEPS',   icon: '\u{1F463}', hint: 'Finish your first song' },
    { id: 'flawless',    name: 'FLAWLESS',      icon: '✨',    hint: 'Finish a song with 100% perfect' },
    { id: 'dropSurvivor',name: 'DROP SURVIVOR', icon: '\u{1F525}', hint: 'Clear a full drop section without a hit' },
    { id: 'blindFaith',  name: 'BLIND FAITH',   icon: '\u{1F441}', hint: 'Finish a song with BLIND RING on' },
    { id: 'marathon',    name: 'MARATHON',      icon: '\u{1F3C3}', hint: 'Jump 1000 times (lifetime)', cumulative: 'totalJumps', target: 1000 },
    { id: 'speedDemon',  name: 'SPEED DEMON',   icon: '⚡',    hint: 'Finish a song on INSANE 1.5x' },
    { id: 'comboKing',   name: 'COMBO KING',    icon: '\u{1F451}', hint: 'Reach a 200 combo' },
    { id: 'collector',   name: 'COLLECTOR',     icon: '\u{1F3A8}', hint: 'Unlock all themes' },
    { id: 'nightShift',  name: 'NIGHT SHIFT',   icon: '\u{1F319}', hint: 'Play 10 songs total', cumulative: 'totalSongsPlayed', target: 10 },
    { id: 'perfectTen',  name: 'PERFECT TEN',   icon: '\u{1F3AF}', hint: 'Get 10 perfects in a row, 5 times in one song' },
    { id: 'centurion',   name: 'CENTURION',     icon: '\u{1F4AF}', hint: 'Reach a 100 combo' },
    { id: 'suddenDeathSurvivor', name: 'NERVES OF STEEL', icon: '\u{1F480}', hint: 'Finish a song with SUDDEN DEATH on' },
    { id: 'bpmPurist',   name: 'PURE RHYTHM',   icon: '\u{1F3B5}', hint: 'Finish a song with BPM ONLY on' },
    { id: 'ghostBuster', name: 'GHOST BUSTER',  icon: '\u{1F47B}', hint: 'Beat your ghost with GHOST DOT on' },
    { id: 'dedication',  name: 'DEDICATION',    icon: '⏱️', hint: 'Play for 1 hour total (lifetime)', cumulative: 'totalPlayTimeSec', target: 3600 },
    { id: 'ironLegs',    name: 'IRON LEGS',     icon: '\u{1F45F}', hint: 'Jump 5000 times (lifetime)', cumulative: 'totalJumps', target: 5000 },
    { id: 'veteran',     name: 'VETERAN',       icon: '\u{1F396}', hint: 'Play 50 songs total', cumulative: 'totalSongsPlayed', target: 50 },
    { id: 'legendary',   name: 'LEGENDARY',     icon: '\u{1F31F}', hint: 'Reach a 500 combo' },
    { id: 'chaosTheory', name: 'CHAOS THEORY',  icon: '\u{1F300}', hint: 'Use 5 different modifiers (lifetime)' },
    { id: 'gluttonForPunishment', name: 'GLUTTON FOR PUNISHMENT', icon: '\u{2620}\u{FE0F}', hint: 'Finish a song with 3+ hard modifiers active' },
    { id: 'archivist',   name: 'ARCHIVIST',     icon: '\u{1F4DA}', hint: 'Cache 8 songs in your library' },
    { id: 'goingPublic', name: 'GOING PUBLIC',  icon: '\u{1F310}', hint: 'Publish a level to the Public Library' },
    { id: 'endlessLegend', name: 'ENDLESS LEGEND', icon: '\u{1F501}', hint: 'Survive 5 songs in one Endless run' },
    { id: 'nightOwl',    name: 'NIGHT OWL',     icon: '\u{1F989}', hint: 'Finish a song between midnight and 5am' },
  ];

  // modifiers flagged 'hard: true' in game.js MODIFIER_DEFS - kept in sync manually
  const HARD_MODIFIERS = ['insane', 'bpmOnly', 'blindRing', 'suddenDeath', 'ghostDot'];

  const THEME_DEFS = [
    { id: 'default',    name: 'DEFAULT',     hint: 'Unlocked from the start' },
    { id: 'vaporwave',  name: 'VAPORWAVE',   hint: 'Finish your first song' },
    { id: 'matrix',     name: 'MATRIX',      hint: 'Reach a 100+ combo' },
    { id: 'bloodmoon',  name: 'BLOOD MOON',  hint: 'Finish a song with INSANE 1.5x' },
    { id: 'goldenhour', name: 'GOLDEN HOUR', hint: '95%+ perfect rate on a finished song' },
    { id: 'frost',      name: 'FROST',       hint: 'Unlock the PERFECT TEN achievement' },
    { id: 'sunset',     name: 'SUNSET',      hint: 'Finish a song with RUSH 1.25x' },
    { id: 'inferno',    name: 'INFERNO',     hint: 'Unlock the NERVES OF STEEL achievement' },
    { id: 'cyberpunk',  name: 'CYBERPUNK',   hint: 'Unlock the CHAOS THEORY achievement' },
    { id: 'emerald',    name: 'EMERALD',     hint: 'Unlock the ARCHIVIST achievement' },
    { id: 'nebula',     name: 'NEBULA',      hint: 'Unlock the ENDLESS LEGEND achievement' },
    { id: 'arcade',     name: 'ARCADE',      hint: 'Unlock the GOING PUBLIC achievement' },
    { id: 'abyss',      name: 'ABYSS',       hint: 'Unlock the IRON LEGS achievement' },
    { id: 'noir',       name: 'NOIR',        hint: 'Unlock the NIGHT OWL achievement' },
  ];

  const SKIN_DEFS = [
    { id: 'classic', name: 'CLASSIC', hint: 'Unlocked from the start' },
    { id: 'star',    name: 'STAR',    hint: 'Unlock via FLAWLESS achievement' },
    { id: 'comet',   name: 'COMET',   hint: 'Unlock via SPEED DEMON achievement' },
    { id: 'smiley',  name: 'SMILEY',  hint: 'Unlock via NIGHT SHIFT achievement' },
    { id: 'diamond', name: 'DIAMOND', hint: 'Unlock via COMBO KING achievement' },
    { id: 'pulsar',  name: 'PULSAR',  hint: 'Unlock via COLLECTOR achievement' },
    { id: 'nova',    name: 'NOVA',    hint: 'Unlock via CENTURION achievement' },
    { id: 'phantom', name: 'PHANTOM', hint: 'Unlock via GHOST BUSTER achievement' },
    { id: 'galaxy',  name: 'GALAXY',  hint: 'Unlock via LEGENDARY achievement' },
    { id: 'crystal', name: 'CRYSTAL', hint: 'Unlock via VETERAN achievement' },
    { id: 'magma',   name: 'MAGMA',   hint: 'Unlock via GLUTTON FOR PUNISHMENT achievement' },
    { id: 'disco',   name: 'DISCO',   hint: 'Unlock via CHAOS THEORY achievement' },
    { id: 'circuit', name: 'CIRCUIT', hint: 'Unlock via IRON LEGS achievement' },
    { id: 'yinyang', name: 'YIN YANG', hint: 'Unlock via NIGHT OWL achievement' },
  ];

  // skin id -> achievement id required
  const SKIN_UNLOCK_ACHIEVEMENT = {
    star: 'flawless', comet: 'speedDemon', smiley: 'nightShift',
    diamond: 'comboKing', pulsar: 'collector',
    nova: 'centurion', phantom: 'ghostBuster',
    galaxy: 'legendary', crystal: 'veteran', magma: 'gluttonForPunishment',
    disco: 'chaosTheory', circuit: 'ironLegs', yinyang: 'nightOwl',
  };

  const TRAIL_DEFS = [
    { id: 'classic', name: 'CLASSIC', hint: 'Unlocked from the start' },
    { id: 'none',    name: 'NONE',    hint: 'No trail - clean look' },
    { id: 'rainbow', name: 'RAINBOW', hint: 'Unlock via CENTURION achievement' },
    { id: 'fire',    name: 'FIRE',    hint: 'Unlock via SPEED DEMON achievement' },
    { id: 'ribbon',  name: 'RIBBON',  hint: 'Unlock via FLAWLESS achievement' },
    { id: 'sparkle', name: 'SPARKLE', hint: 'Unlock via NIGHT SHIFT achievement' },
    { id: 'neon',    name: 'NEON',    hint: 'Unlock via COMBO KING achievement' },
    { id: 'bubbles', name: 'BUBBLES', hint: 'Unlock via IRON LEGS achievement' },
    { id: 'smoke',   name: 'SMOKE',   hint: 'Unlock via VETERAN achievement' },
    { id: 'electric',name: 'ELECTRIC',hint: 'Unlock via LEGENDARY achievement' },
    { id: 'petals',  name: 'PETALS',  hint: 'Unlock via ENDLESS LEGEND achievement' },
  ];

  // trail id -> achievement id required (classic / none are always available)
  const TRAIL_UNLOCK_ACHIEVEMENT = {
    rainbow: 'centurion', fire: 'speedDemon', ribbon: 'flawless',
    sparkle: 'nightShift', neon: 'comboKing',
    bubbles: 'ironLegs', smoke: 'veteran', electric: 'legendary', petals: 'endlessLegend',
  };

  // theme id -> achievement id required (the original 8 themes use bespoke
  // conditions in recordRunResult; new themes are gated purely on achievements)
  const THEME_UNLOCK_ACHIEVEMENT = {
    cyberpunk: 'chaosTheory', emerald: 'archivist', nebula: 'endlessLegend',
    arcade: 'goingPublic', abyss: 'ironLegs', noir: 'nightOwl',
  };

  function defaultData() {
    return {
      version: 1,
      settings: {
        latencyOffset: 0,
        haptics: 'full', // off | taps | full
        replayEnabled: detectLowEnd() ? false : false, // default off per spec
        theme: 'default',
        skin: 'classic',
        trail: 'classic', // ball trail cosmetic - see TRAIL_DEFS
        debugLog: false,
        tapSound: 'hihat', // hihat | clap | 808 | laser
        rhythmGuide: 'auto', // auto | on | off - quiet metronome tick on every beat
        playerName: '', // shown on global leaderboards for shared Public Library levels
        vocalFocus: 15, // 0-100: rhythm follows vocals/melody (100) vs drums (0) - default leans drums
        language: null, // null = auto-detect from browser locale; otherwise an I18N.LOCALES code
        cobaltUrl: '', // custom Cobalt API instance URL for YouTube downloads
      },
      themes: {
        default: true, vaporwave: false, matrix: false, bloodmoon: false, goldenhour: false, frost: false, sunset: false, inferno: false,
        cyberpunk: false, emerald: false, nebula: false, arcade: false, abyss: false, noir: false,
      },
      skins: {
        classic: true, star: false, comet: false, smiley: false, diamond: false, pulsar: false, nova: false, phantom: false,
        galaxy: false, crystal: false, magma: false, disco: false, circuit: false, yinyang: false,
      },
      achievements: {}, // id -> true
      stats: {
        totalPlayTimeSec: 0,
        totalJumps: 0,
        totalSongsFinished: 0,
        totalSongsPlayed: 0,
        totalScore: 0,
        bestCombo: 0,
        perfectRateHistory: [], // last 10 plays, 0..1
        songPlayCounts: {}, // hash -> { name, count }
        modifierUsage: {}, // modifierId -> count
      },
      leaderboards: {}, // hash -> [ {score, perfectRate, maxCombo, modifiers, date, fileName} ]
      endlessLeaderboard: [], // [ {score, songsSurvived, totalTime, date} ]
      tunerSettings: {}, // hash -> { bass:{sensitivity,minSpacing} }
      songLibrary: {}, // hash -> { name, bpm, duration, intensity, analysis, levelData, addedDate }
      myPublishedLevels: {}, // levelId -> { token, title, createdAt } - lets this device delete its own uploads
      levelRatings: {}, // levelId -> 1 | -1 : this device's thumbs up/down vote on Public Library levels
    };
  }

  const MAX_LIBRARY_SONGS = 8;

  function detectLowEnd() {
    const cores = navigator.hardwareConcurrency || 4;
    return cores <= 4;
  }

  let data = null;

  function load() {
    if (data) return data;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        data = Object.assign(defaultData(), parsed);
        // deep-merge nested objects so new fields appear after updates
        const def = defaultData();
        for (const k of Object.keys(def)) {
          if (typeof def[k] === 'object' && !Array.isArray(def[k]) && def[k] !== null) {
            data[k] = Object.assign({}, def[k], parsed[k] || {});
          }
        }
      } else {
        data = defaultData();
      }
    } catch (e) {
      data = defaultData();
    }
    migrate();
    return data;
  }

  /**
   * One-shot migrations for installs that persisted older defaults. The first
   * build shipped Rhythm Focus at 70 (vocals-led), which feels loose; we now
   * lock charts to the beat grid and lead with drums. Reset the saved value once
   * so existing players get the tighter feel without touching any setting - they
   * can still slide back toward vocals afterwards.
   */
  function migrate() {
    let changed = false;
    if (!data.settings.rhythmTightV2) {
      data.settings.vocalFocus = 15;
      data.settings.rhythmTightV2 = true;
      changed = true;
    }
    if (changed) save();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* storage full or unavailable - ignore */ }
  }

  // ---------------- settings ----------------
  function getSettings() { return load().settings; }
  function setSetting(key, value) {
    load().settings[key] = value;
    save();
  }

  // ---------------- player identity (Public Library leaderboards) ----------------
  function getPlayerName() {
    const s = load().settings;
    if (!s.playerName) {
      s.playerName = 'PLAYER' + Math.floor(1000 + Math.random() * 9000);
      save();
    }
    return s.playerName;
  }
  function setPlayerName(name) {
    setSetting('playerName', (name || '').trim().slice(0, 20));
  }

  // ---------------- themes / skins / trails (cosmetics) ----------------
  function getThemeDefs() { return THEME_DEFS; }
  function getSkinDefs() { return SKIN_DEFS; }
  function getTrailDefs() { return TRAIL_DEFS; }
  function isThemeUnlocked(id) { return !!load().themes[id]; }
  function isSkinUnlocked(id) {
    if (id === 'classic') return true;
    const ach = SKIN_UNLOCK_ACHIEVEMENT[id];
    return !!load().achievements[ach];
  }
  function isTrailUnlocked(id) {
    if (id === 'classic' || id === 'none') return true;
    const ach = TRAIL_UNLOCK_ACHIEVEMENT[id];
    return !!load().achievements[ach];
  }
  function unlockTheme(id) {
    const d = load();
    if (d.themes[id]) return false;
    d.themes[id] = true;
    save();
    return true;
  }
  function allThemesUnlocked() {
    return THEME_DEFS.every(t => isThemeUnlocked(t.id));
  }

  /**
   * Given an achievement id that just got unlocked, unlocks any themes gated
   * on it (via THEME_UNLOCK_ACHIEVEMENT) and reports any trails gated on it
   * (via TRAIL_UNLOCK_ACHIEVEMENT - trails have no persisted unlock state of
   * their own, isTrailUnlocked derives it live from the achievement).
   * Returns { newThemes, newTrails }. Safe to call from any code path that
   * unlocks an achievement, not just recordRunResult.
   */
  function unlockCosmeticsForAchievement(achId) {
    const newThemes = [], newTrails = [];
    for (const [themeId, reqAch] of Object.entries(THEME_UNLOCK_ACHIEVEMENT)) {
      if (reqAch === achId && unlockTheme(themeId)) newThemes.push(themeId);
    }
    for (const [trailId, reqAch] of Object.entries(TRAIL_UNLOCK_ACHIEVEMENT)) {
      if (reqAch === achId) newTrails.push(trailId);
    }
    return { newThemes, newTrails };
  }

  // ---------------- achievements ----------------
  function getAchievementDefs() { return ACHIEVEMENT_DEFS; }
  function isAchievementUnlocked(id) { return !!load().achievements[id]; }
  function unlockAchievement(id) {
    const d = load();
    if (d.achievements[id]) return false;
    d.achievements[id] = true;
    save();
    return true;
  }
  function getAchievementProgress(def) {
    if (!def.cumulative) return null;
    const val = load().stats[def.cumulative] || 0;
    return { current: Math.min(val, def.target), target: def.target };
  }

  /**
   * Records the result of a finished/aborted run, updates lifetime stats,
   * leaderboards, and checks/unlocks achievements + theme/skin unlocks.
   * Returns { newAchievements, newThemes, newSkins, newTrails, leaderboardRank }
   */
  function recordRunResult(result) {
    const d = load();
    const s = d.stats;
    const newAchievements = [];
    const newThemes = [];
    const newSkins = [];
    let leaderboardRank = null;

    s.totalPlayTimeSec += result.duration || 0;
    s.totalJumps += result.jumps || 0;
    s.totalScore += result.score || 0;
    s.bestCombo = Math.max(s.bestCombo, result.maxCombo || 0);
    s.totalSongsPlayed += 1;

    if (result.songHash) {
      const entry = s.songPlayCounts[result.songHash] || { name: result.songName || 'Unknown', count: 0 };
      entry.count++;
      entry.name = result.songName || entry.name;
      s.songPlayCounts[result.songHash] = entry;
    }
    (result.modifiers || []).forEach(m => {
      s.modifierUsage[m] = (s.modifierUsage[m] || 0) + 1;
    });

    if (result.finished) {
      s.totalSongsFinished += 1;
      const perfectRate = result.totalBeats ? (result.perfectCount / result.totalBeats) : 0;
      s.perfectRateHistory.push(perfectRate);
      if (s.perfectRateHistory.length > 10) s.perfectRateHistory.shift();

      if (s.totalSongsFinished === 1 && unlockAchievement('firstSteps')) newAchievements.push('firstSteps');
      if (perfectRate >= 0.999 && unlockAchievement('flawless')) newAchievements.push('flawless');
      if (result.dropSurvivedNoHit && unlockAchievement('dropSurvivor')) newAchievements.push('dropSurvivor');
      if (result.modifiers && result.modifiers.includes('blindRing') && unlockAchievement('blindFaith')) newAchievements.push('blindFaith');
      if (result.modifiers && result.modifiers.includes('insane') && unlockAchievement('speedDemon')) newAchievements.push('speedDemon');
      if ((result.perfectStreaksOf10 || 0) >= 5 && unlockAchievement('perfectTen')) newAchievements.push('perfectTen');
      if (result.modifiers && result.modifiers.includes('suddenDeath') && unlockAchievement('suddenDeathSurvivor')) newAchievements.push('suddenDeathSurvivor');
      if (result.modifiers && result.modifiers.includes('bpmOnly') && unlockAchievement('bpmPurist')) newAchievements.push('bpmPurist');
      if (result.modifiers && result.modifiers.includes('ghostDot') && (result.ghostDelta || 0) > 0 && unlockAchievement('ghostBuster')) newAchievements.push('ghostBuster');
      const hardModifierCount = (result.modifiers || []).filter(m => HARD_MODIFIERS.includes(m)).length;
      if (hardModifierCount >= 3 && unlockAchievement('gluttonForPunishment')) newAchievements.push('gluttonForPunishment');
      if (new Date().getHours() < 5 && unlockAchievement('nightOwl')) newAchievements.push('nightOwl');

      // theme unlocks
      if (unlockTheme('vaporwave')) newThemes.push('vaporwave');
      if (result.maxCombo >= 100 && unlockTheme('matrix')) newThemes.push('matrix');
      if (result.modifiers && result.modifiers.includes('insane') && unlockTheme('bloodmoon')) newThemes.push('bloodmoon');
      if (perfectRate >= 0.95 && unlockTheme('goldenhour')) newThemes.push('goldenhour');
      if (isAchievementUnlocked('perfectTen') && unlockTheme('frost')) newThemes.push('frost');
      if (result.modifiers && result.modifiers.includes('rush') && unlockTheme('sunset')) newThemes.push('sunset');
      if (isAchievementUnlocked('suddenDeathSurvivor') && unlockTheme('inferno')) newThemes.push('inferno');

      // leaderboard
      if (result.songHash) {
        if (!d.leaderboards[result.songHash]) d.leaderboards[result.songHash] = [];
        const list = d.leaderboards[result.songHash];
        const entry = {
          score: result.score,
          perfectRate,
          maxCombo: result.maxCombo,
          modifiers: result.modifiers || [],
          date: Date.now(),
          fileName: result.songName || 'Unknown',
        };
        list.push(entry);
        list.sort((a, b) => b.score - a.score);
        leaderboardRank = list.indexOf(entry);
        if (list.length > 10) list.length = 10;
        if (leaderboardRank >= 10) leaderboardRank = -1;
      }
    }

    if ((result.maxCombo || 0) >= 200 && unlockAchievement('comboKing')) newAchievements.push('comboKing');
    if ((result.maxCombo || 0) >= 100 && unlockAchievement('centurion')) newAchievements.push('centurion');
    if (s.totalJumps >= 1000 && unlockAchievement('marathon')) newAchievements.push('marathon');
    if (s.totalSongsPlayed >= 10 && unlockAchievement('nightShift')) newAchievements.push('nightShift');
    if (s.totalPlayTimeSec >= 3600 && unlockAchievement('dedication')) newAchievements.push('dedication');
    if ((result.maxCombo || 0) >= 500 && unlockAchievement('legendary')) newAchievements.push('legendary');
    if (s.totalJumps >= 5000 && unlockAchievement('ironLegs')) newAchievements.push('ironLegs');
    if (s.totalSongsPlayed >= 50 && unlockAchievement('veteran')) newAchievements.push('veteran');
    if (Object.keys(s.modifierUsage).length >= 5 && unlockAchievement('chaosTheory')) newAchievements.push('chaosTheory');

    const newTrails = [];
    newAchievements.forEach(achId => {
      const cosmetics = unlockCosmeticsForAchievement(achId);
      newThemes.push(...cosmetics.newThemes);
      newTrails.push(...cosmetics.newTrails);
    });

    // collector + dependent skin unlocks (check after theme unlocks above)
    if (allThemesUnlocked() && unlockAchievement('collector')) newAchievements.push('collector');

    // skins follow achievement unlocks
    for (const [skinId, achId] of Object.entries(SKIN_UNLOCK_ACHIEVEMENT)) {
      if (load().achievements[achId] && !load().skins[skinId]) {
        d.skins[skinId] = true;
        newSkins.push(skinId);
      }
    }

    save();
    return { newAchievements, newThemes, newSkins, newTrails, leaderboardRank };
  }

  // ---------------- leaderboards ----------------
  function getLeaderboard(hash) { return (load().leaderboards[hash] || []).slice(); }
  function getAllPlayedSongs() {
    const d = load();
    return Object.keys(d.leaderboards).map(hash => ({
      hash,
      name: (d.stats.songPlayCounts[hash] && d.stats.songPlayCounts[hash].name) || (d.leaderboards[hash][0] && d.leaderboards[hash][0].fileName) || 'Unknown',
      top: d.leaderboards[hash][0],
    }));
  }
  function getEndlessLeaderboard() { return load().endlessLeaderboard.slice(); }
  function addEndlessScore(entry) {
    const d = load();
    d.endlessLeaderboard.push(Object.assign({ date: Date.now() }, entry));
    d.endlessLeaderboard.sort((a, b) => b.score - a.score);
    if (d.endlessLeaderboard.length > 10) d.endlessLeaderboard.length = 10;
    save();
  }

  // ---------------- tuner settings ----------------
  function getTunerSettings(hash) {
    return AudioEngine.normalizeTunerSettings(load().tunerSettings[hash]);
  }
  function setTunerSettings(hash, settings) {
    load().tunerSettings[hash] = settings;
    save();
  }

  // ---------------- song library (cached analysis, keyed by audio hash) ----------------
  function getCachedSong(hash) {
    return load().songLibrary[hash] || null;
  }

  function cacheSongAnalysis(hash, name, analysis, levelData) {
    const d = load();
    d.songLibrary[hash] = {
      name,
      bpm: analysis.bpm,
      duration: analysis.duration,
      intensity: analysis.intensity,
      analysis,
      levelData,
      addedDate: Date.now(),
    };
    let keys = Object.keys(d.songLibrary).sort((a, b) => d.songLibrary[a].addedDate - d.songLibrary[b].addedDate);
    while (keys.length > MAX_LIBRARY_SONGS) {
      delete d.songLibrary[keys.shift()];
    }
    // if the entry is too large for localStorage, evict oldest entries until it fits
    while (keys.length > 0) {
      try {
        localStorage.setItem(KEY, JSON.stringify(d));
        return;
      } catch (e) {
        delete d.songLibrary[keys.shift()];
      }
    }
  }

  function getLibrarySongs() {
    const d = load();
    return Object.keys(d.songLibrary).map(hash => {
      const entry = d.songLibrary[hash];
      const board = d.leaderboards[hash] || [];
      const top = board[0] || null;
      const playCount = (d.stats.songPlayCounts[hash] && d.stats.songPlayCounts[hash].count) || 0;
      return {
        hash,
        name: entry.name,
        bpm: entry.bpm,
        duration: entry.duration,
        addedDate: entry.addedDate,
        bestScore: top ? Math.round(top.score) : null,
        perfectRate: top ? top.perfectRate : null,
        playCount,
      };
    }).sort((a, b) => b.addedDate - a.addedDate);
  }

  // ---------------- public library: levels published by this device ----------------
  /** Records the owner token returned by Cloud.publishLevel so this device can delete it later. */
  function recordPublishedLevel(id, token, title) {
    const d = load();
    d.myPublishedLevels[id] = { token, title, createdAt: Date.now() };
    save();
  }
  function getOwnerToken(id) {
    const entry = load().myPublishedLevels[id];
    return entry ? entry.token : null;
  }
  function removePublishedLevel(id) {
    const d = load();
    delete d.myPublishedLevels[id];
    save();
  }
  function getMyPublishedLevelIds() {
    return new Set(Object.keys(load().myPublishedLevels));
  }

  // ---------------- public library: this device's thumbs up/down votes ----------------
  function getLevelRating(id) { return load().levelRatings[id] || 0; }
  function setLevelRating(id, value) {
    const d = load();
    if (value === 1 || value === -1) d.levelRatings[id] = value;
    else delete d.levelRatings[id];
    save();
  }

  // ---------------- stats ----------------
  function getStats() { return load().stats; }

  // ---------------- tutorial flag ----------------
  function isTutorialDone() { return !!load().tutorialDone; }
  function markTutorialDone() { load().tutorialDone = true; save(); }

  return {
    load, save,
    getSettings, setSetting,
    getPlayerName, setPlayerName,
    getThemeDefs, getSkinDefs, getTrailDefs, isThemeUnlocked, isSkinUnlocked, isTrailUnlocked, unlockTheme, allThemesUnlocked,
    unlockCosmeticsForAchievement,
    getAchievementDefs, isAchievementUnlocked, unlockAchievement, getAchievementProgress,
    recordRunResult,
    getLeaderboard, getAllPlayedSongs, getEndlessLeaderboard, addEndlessScore,
    getTunerSettings, setTunerSettings,
    getCachedSong, cacheSongAnalysis, getLibrarySongs,
    recordPublishedLevel, getOwnerToken, removePublishedLevel, getMyPublishedLevelIds,
    getLevelRating, setLevelRating,
    getStats,
    isTutorialDone, markTutorialDone,
    SKIN_UNLOCK_ACHIEVEMENT, TRAIL_UNLOCK_ACHIEVEMENT,
  };
})();
