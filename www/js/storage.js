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
  ];

  const THEME_DEFS = [
    { id: 'default',    name: 'DEFAULT',     hint: 'Unlocked from the start' },
    { id: 'vaporwave',  name: 'VAPORWAVE',   hint: 'Finish your first song' },
    { id: 'matrix',     name: 'MATRIX',      hint: 'Reach a 100+ combo' },
    { id: 'bloodmoon',  name: 'BLOOD MOON',  hint: 'Finish a song with INSANE 1.5x' },
    { id: 'goldenhour', name: 'GOLDEN HOUR', hint: '95%+ perfect rate on a finished song' },
  ];

  const SKIN_DEFS = [
    { id: 'classic', name: 'CLASSIC', hint: 'Unlocked from the start' },
    { id: 'star',    name: 'STAR',    hint: 'Unlock via FLAWLESS achievement' },
    { id: 'comet',   name: 'COMET',   hint: 'Unlock via SPEED DEMON achievement' },
    { id: 'smiley',  name: 'SMILEY',  hint: 'Unlock via NIGHT SHIFT achievement' },
    { id: 'diamond', name: 'DIAMOND', hint: 'Unlock via COMBO KING achievement' },
    { id: 'pulsar',  name: 'PULSAR',  hint: 'Unlock via COLLECTOR achievement' },
  ];

  // skin id -> achievement id required
  const SKIN_UNLOCK_ACHIEVEMENT = {
    star: 'flawless', comet: 'speedDemon', smiley: 'nightShift',
    diamond: 'comboKing', pulsar: 'collector',
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
        listenEnabled: false,
      },
      themes: { default: true, vaporwave: false, matrix: false, bloodmoon: false, goldenhour: false },
      skins: { classic: true, star: false, comet: false, smiley: false, diamond: false, pulsar: false },
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
      tunerSettings: {}, // hash -> { sensitivity, minSpacing, bassEmphasis }
    };
  }

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
    return data;
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

  // ---------------- themes / skins ----------------
  function getThemeDefs() { return THEME_DEFS; }
  function getSkinDefs() { return SKIN_DEFS; }
  function isThemeUnlocked(id) { return !!load().themes[id]; }
  function isSkinUnlocked(id) {
    if (id === 'classic') return true;
    const ach = SKIN_UNLOCK_ACHIEVEMENT[id];
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
   * Returns { newAchievements, newThemes, newSkins, leaderboardRank }
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

      // theme unlocks
      if (unlockTheme('vaporwave')) newThemes.push('vaporwave');
      if (result.maxCombo >= 100 && unlockTheme('matrix')) newThemes.push('matrix');
      if (result.modifiers && result.modifiers.includes('insane') && unlockTheme('bloodmoon')) newThemes.push('bloodmoon');
      if (perfectRate >= 0.95 && unlockTheme('goldenhour')) newThemes.push('goldenhour');

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
    if (s.totalJumps >= 1000 && unlockAchievement('marathon')) newAchievements.push('marathon');
    if (s.totalSongsPlayed >= 10 && unlockAchievement('nightShift')) newAchievements.push('nightShift');

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
    return { newAchievements, newThemes, newSkins, leaderboardRank };
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
    return load().tunerSettings[hash] || { sensitivity: 1.3, minSpacing: 0.22, bassEmphasis: 0.6 };
  }
  function setTunerSettings(hash, settings) {
    load().tunerSettings[hash] = settings;
    save();
  }

  // ---------------- stats ----------------
  function getStats() { return load().stats; }

  return {
    load, save,
    getSettings, setSetting,
    getThemeDefs, getSkinDefs, isThemeUnlocked, isSkinUnlocked, unlockTheme, allThemesUnlocked,
    getAchievementDefs, isAchievementUnlocked, unlockAchievement, getAchievementProgress,
    recordRunResult,
    getLeaderboard, getAllPlayedSongs, getEndlessLeaderboard, addEndlessScore,
    getTunerSettings, setTunerSettings,
    getStats,
    SKIN_UNLOCK_ACHIEVEMENT,
  };
})();
