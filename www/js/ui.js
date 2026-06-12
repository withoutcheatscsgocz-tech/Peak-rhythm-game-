/* ============================================================
   ONE DOT - ui.js
   View layer: screen navigation, toasts, menus, HUD, and all
   DOM rendering. Game flow / audio pipeline lives in main.js.
   ============================================================ */

const UI = (() => {
  const $ = (id) => document.getElementById(id);
  const SECTION_HEX = {
    intro: '#6a8dff', chill: '#6a8dff', build: '#3cffb0', drop: '#ff5a3c', live: '#b4b4dc',
  };
  const THEME_SWATCH = {
    default: '#ffffff', vaporwave: '#ff8cf0', matrix: '#4dff7a', bloodmoon: '#ff4d4d', goldenhour: '#ffd24d',
  };
  const PLAYER_COLORS = ['#ffffff', '#ff5a3c', '#3cffb0', '#6a8dff'];

  let navStack = [];
  let currentScreen = 'screen-start';
  let activeModifiers = new Set();
  let multiSelectFiles = []; // [{file, name, status, analysis, levelData, hash}]
  let passPlayers = [];

  // ---------------- screen navigation ----------------
  function showScreen(id, push) {
    if (push === undefined) push = true;
    const cur = $(currentScreen);
    if (cur) cur.classList.remove('active');
    if (push && currentScreen !== id) navStack.push(currentScreen);
    currentScreen = id;
    const next = $(id);
    if (next) next.classList.add('active');
  }

  function goBack(fallback) {
    const prev = navStack.pop() || fallback || 'screen-start';
    showScreen(prev, false);
  }

  function resetNav() {
    navStack = [];
  }

  function getCurrentScreen() { return currentScreen; }

  // ---------------- toasts ----------------
  function showToast(text, opts) {
    opts = opts || {};
    const el = document.createElement('div');
    el.className = 'toast' + (opts.achievement ? ' achievement' : '');
    if (opts.achievement) {
      const title = document.createElement('div');
      title.className = 'ach-title';
      title.textContent = 'ACHIEVEMENT UNLOCKED';
      el.appendChild(title);
      const body = document.createElement('div');
      body.textContent = `${opts.icon || ''} ${text}`.trim();
      el.appendChild(body);
    } else {
      el.textContent = text;
    }
    $('toast-container').appendChild(el);
    setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => el.remove(), 600);
    }, opts.duration || 3200);
  }

  function showAchievementToasts(ids) {
    const defs = Storage.getAchievementDefs();
    ids.forEach((id, i) => {
      const def = defs.find(d => d.id === id);
      if (!def) return;
      setTimeout(() => {
        showToast(def.name, { achievement: true, icon: def.icon, duration: 3800 });
        Haptics.achievementUnlock();
      }, i * 900);
    });
  }

  function showThemeUnlockOverlay(themeId) {
    const defs = Storage.getThemeDefs();
    const def = defs.find(d => d.id === themeId);
    if (!def) return;
    $('theme-unlock-name').textContent = def.name;
    const overlay = $('theme-unlock-overlay');
    overlay.classList.remove('hidden');
    Haptics.themeUnlock();
    setTimeout(() => overlay.classList.add('hidden'), 2600);
  }

  function showControllerToast() {
    const el = $('controller-toast');
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2400);
  }

  // ---------------- debug overlay (DEBUG LOG setting) ----------------
  function logDebugError(message) {
    if (!Storage.getSettings().debugLog) return;
    const overlay = $('debug-overlay');
    const body = $('debug-overlay-body');
    if (!overlay || !body) return;
    const entry = document.createElement('div');
    entry.className = 'debug-entry';
    const time = document.createElement('span');
    time.className = 'debug-time';
    const now = new Date();
    time.textContent = `[${now.toLocaleTimeString()}]`;
    entry.appendChild(time);
    entry.appendChild(document.createTextNode(String(message)));
    body.appendChild(entry);
    body.scrollTop = body.scrollHeight;
    overlay.classList.remove('hidden');
  }

  function hideDebugOverlay() {
    const overlay = $('debug-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function clearDebugLog() {
    const body = $('debug-overlay-body');
    if (body) body.innerHTML = '';
    hideDebugOverlay();
  }

  // ---------------- theme / skin ----------------
  function applyTheme(themeId) {
    if (themeId === 'default') document.body.removeAttribute('data-theme');
    else document.body.setAttribute('data-theme', themeId);
  }

  function applySavedAppearance() {
    const settings = Storage.getSettings();
    applyTheme(settings.theme || 'default');
  }

  // ---------------- settings screen ----------------
  function initSettingsScreen() {
    const settings = Storage.getSettings();
    const latencySlider = $('latency-slider');
    const latencyValue = $('latency-value');
    latencySlider.value = settings.latencyOffset || 0;
    latencyValue.textContent = `${settings.latencyOffset || 0}ms`;
    latencySlider.addEventListener('input', () => {
      const v = parseInt(latencySlider.value, 10);
      latencyValue.textContent = `${v}ms`;
      Storage.setSetting('latencyOffset', v);
      const pauseSlider = $('pause-latency-slider');
      if (pauseSlider) pauseSlider.value = v;
      const pauseValue = $('pause-latency-value');
      if (pauseValue) pauseValue.textContent = `${v}ms`;
    });

    const hapticsSelect = $('haptics-select');
    hapticsSelect.value = settings.haptics || 'full';
    hapticsSelect.addEventListener('change', () => {
      Storage.setSetting('haptics', hapticsSelect.value);
    });

    const replaySelect = $('replay-select');
    replaySelect.value = settings.replayEnabled ? 'on' : 'off';
    replaySelect.addEventListener('change', () => {
      Storage.setSetting('replayEnabled', replaySelect.value === 'on');
    });

    const debugLogSelect = $('debug-log-select');
    debugLogSelect.value = settings.debugLog ? 'on' : 'off';
    debugLogSelect.addEventListener('change', () => {
      Storage.setSetting('debugLog', debugLogSelect.value === 'on');
      if (debugLogSelect.value !== 'on') hideDebugOverlay();
    });

    const tapSoundSelect = $('tap-sound-select');
    tapSoundSelect.value = settings.tapSound || 'hihat';
    tapSoundSelect.addEventListener('change', () => {
      Storage.setSetting('tapSound', tapSoundSelect.value);
    });

    // pause screen mirrors the latency slider
    const pauseSlider = $('pause-latency-slider');
    const pauseValue = $('pause-latency-value');
    pauseSlider.value = settings.latencyOffset || 0;
    pauseValue.textContent = `${settings.latencyOffset || 0}ms`;
    pauseSlider.addEventListener('input', () => {
      const v = parseInt(pauseSlider.value, 10);
      pauseValue.textContent = `${v}ms`;
      Storage.setSetting('latencyOffset', v);
      latencySlider.value = v;
      latencyValue.textContent = `${v}ms`;
    });
  }

  // ---------------- heartbeat idle dot ----------------
  function setHeartbeatRate(elId, intervalSec) {
    const el = $(elId);
    if (!el) return;
    el.style.setProperty('--beat-duration', `${Math.max(0.2, intervalSec).toFixed(3)}s`);
  }

  // ---------------- analysis result ----------------
  function populateResult(songName, analysis) {
    $('result-name').textContent = songName || '-';
    $('result-bpm').textContent = analysis.bpm;
    const mins = Math.floor(analysis.duration / 60);
    const secs = Math.floor(analysis.duration % 60);
    $('result-length').textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    $('result-beats').textContent = analysis.beats.length;
    const intensityPct = Math.round(clamp01(analysis.intensity) * 100);
    $('result-intensity').textContent = `${intensityPct}%`;
  }

  // ---------------- song map preview (minimap of the generated level) ----------------
  function populateSongMap(levelData) {
    const canvas = $('song-map-canvas');
    if (!levelData || !levelData.duration) { canvas.classList.add('hidden'); return; }
    canvas.classList.remove('hidden');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 320, h = canvas.clientHeight || 80;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const duration = levelData.duration;
    const densityH = h * 0.7;

    // section background (density / drop highlighting)
    (levelData.sections || []).forEach((sec) => {
      const x = (sec.time / duration) * w;
      const segW = (sec.duration / duration) * w;
      ctx.fillStyle = SECTION_HEX[sec.type] || SECTION_HEX.chill;
      ctx.globalAlpha = sec.type === 'drop' ? 0.28 : 0.12;
      ctx.fillRect(x, 0, segW, densityH);
    });
    ctx.globalAlpha = 1;

    // obstacle density histogram
    const buckets = 60;
    const counts = new Array(buckets).fill(0);
    (levelData.track || []).forEach((t) => {
      const b = clampVal(Math.floor((t.time / duration) * buckets), 0, buckets - 1);
      counts[b]++;
    });
    const maxCount = Math.max(1, ...counts);
    const bucketW = w / buckets;
    for (let i = 0; i < buckets; i++) {
      const barH = (counts[i] / maxCount) * (densityH - 4);
      if (barH <= 0) continue;
      const t = (i / buckets) * duration;
      const sec = (levelData.sections || []).find(s => t >= s.time && t < s.time + s.duration);
      ctx.fillStyle = SECTION_HEX[(sec && sec.type) || 'chill'];
      ctx.globalAlpha = 0.6;
      ctx.fillRect(i * bucketW, densityH - barH, Math.max(1, bucketW - 1), barH);
    }
    ctx.globalAlpha = 1;

    // checkpoints
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    (levelData.checkpoints || []).forEach((t) => {
      const x = (t / duration) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    });
  }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function clampVal(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---------------- accuracy graph (complete screen) ----------------
  const ACCURACY_RANGE_MS = 300;

  function drawAccuracyGraph(history) {
    const canvas = $('accuracy-graph');
    if (!history || !history.length) { canvas.classList.add('hidden'); return; }
    canvas.classList.remove('hidden');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 320, h = canvas.clientHeight || 110;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const maxTime = Math.max(1, ...history.map(p => p.time));
    const midY = h / 2;

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '9px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('EARLY', 4, 11);
    ctx.fillText('LATE', 4, h - 4);

    history.forEach((p) => {
      const x = clampVal((p.time / maxTime) * w, 1, w - 1);
      if (p.grade === 'miss') {
        ctx.fillStyle = 'rgba(255,59,59,0.55)';
        ctx.fillRect(x - 1, 2, 2, h - 4);
        return;
      }
      const deltaMs = clampVal(p.delta * 1000, -ACCURACY_RANGE_MS, ACCURACY_RANGE_MS);
      const y = midY - (deltaMs / ACCURACY_RANGE_MS) * (h / 2 - 6);
      ctx.fillStyle = p.grade === 'perfect' ? '#4dff7a' : '#ffd24d';
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ---------------- beat tuner (bass band) ----------------
  const TUNER_BANDS = ['bass'];
  const TUNER_BAND_COLORS = {
    bass: 'rgba(255,120,90,0.9)',
  };

  function initTuner(songHash, analysis) {
    const t = Storage.getTunerSettings(songHash);
    TUNER_BANDS.forEach((band) => {
      $(`tuner-${band}-sens`).value = t[band].sensitivity;
      $(`tuner-${band}-sens-val`).textContent = t[band].sensitivity.toFixed(2);
      $(`tuner-${band}-spacing`).value = Math.round(t[band].minSpacing * 1000);
      $(`tuner-${band}-spacing-val`).textContent = `${Math.round(t[band].minSpacing * 1000)}ms`;
    });
    drawTunerCanvas(analysis);
  }

  function readTunerSliders() {
    const out = {};
    TUNER_BANDS.forEach((band) => {
      out[band] = {
        sensitivity: parseFloat($(`tuner-${band}-sens`).value),
        minSpacing: parseInt($(`tuner-${band}-spacing`).value, 10) / 1000,
      };
    });
    return out;
  }

  function bindTunerSliders() {
    TUNER_BANDS.forEach((band) => {
      $(`tuner-${band}-sens`).addEventListener('input', () => {
        $(`tuner-${band}-sens-val`).textContent = parseFloat($(`tuner-${band}-sens`).value).toFixed(2);
      });
      $(`tuner-${band}-spacing`).addEventListener('input', () => {
        $(`tuner-${band}-spacing-val`).textContent = `${$(`tuner-${band}-spacing`).value}ms`;
      });
    });
  }

  function drawTunerCanvas(analysis) {
    const canvas = $('tuner-canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 320, h = canvas.clientHeight || 180;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const wave = analysis.waveform || [];
    const waveMid = h / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < wave.length; i++) {
      const x = (i / wave.length) * w;
      const amp = wave[i] * waveMid;
      ctx.moveTo(x, waveMid - amp);
      ctx.lineTo(x, waveMid + amp);
    }
    ctx.stroke();

    const duration = analysis.duration || 1;
    const beats = analysis.bassBeats || [];
    ctx.strokeStyle = TUNER_BAND_COLORS.bass;
    ctx.lineWidth = 2;
    ctx.beginPath();
    beats.forEach((b) => {
      const x = (b.time / duration) * w;
      ctx.moveTo(x, 2);
      ctx.lineTo(x, h - 2);
    });
    ctx.stroke();
  }

  // ---------------- mic calibration ----------------
  function setMicStatus(text) { $('mic-status').textContent = text; }
  function setMicTitle(text) { $('mic-cal-title').textContent = text; }
  function showMicPermissionError(show) {
    $('mic-permission-msg').classList.toggle('hidden', !show);
  }
  function setMicCountdown(text) {
    const el = $('mic-countdown');
    if (text === null || text === undefined) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    el.textContent = text;
  }
  function drawMicVisualizer(dataArray) {
    const canvas = $('mic-visualizer');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 320, h = canvas.clientHeight || 120;
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!dataArray) return;
    const bars = 48;
    const step = Math.floor(dataArray.length / bars);
    const barW = w / bars;
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#fff';
    ctx.fillStyle = accent;
    for (let i = 0; i < bars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += dataArray[i * step + j] || 0;
      const v = (sum / step) / 255;
      const barH = v * h;
      ctx.fillRect(i * barW + 1, h - barH, barW - 2, barH);
    }
  }

  // ---------------- modifiers ----------------
  function populateModifiers(onChange) {
    activeModifiers = new Set();
    const list = $('modifiers-list');
    list.innerHTML = '';
    Game.MODIFIER_DEFS.forEach(def => {
      const row = document.createElement('div');
      row.className = 'modifier-row';
      row.dataset.id = def.id;

      const info = document.createElement('div');
      info.className = 'modifier-info';
      const name = document.createElement('div');
      name.className = 'modifier-name';
      name.textContent = def.name;
      const desc = document.createElement('div');
      desc.className = 'modifier-mult';
      desc.textContent = `${def.desc} (×${def.mult})`;
      info.appendChild(name); info.appendChild(desc);

      const sw = document.createElement('div');
      sw.className = 'switch focusable';
      sw.tabIndex = 0;

      row.appendChild(info);
      row.appendChild(sw);
      list.appendChild(row);

      const toggle = () => {
        if (row.classList.contains('disabled')) return;
        if (activeModifiers.has(def.id)) {
          activeModifiers.delete(def.id);
        } else {
          if (def.group === 'speed') {
            Game.MODIFIER_DEFS.filter(d => d.group === 'speed' && d.id !== def.id)
              .forEach(d => activeModifiers.delete(d.id));
          }
          activeModifiers.add(def.id);
        }
        refreshModifiersUI();
        if (onChange) onChange(new Set(activeModifiers));
      };
      sw.addEventListener('click', toggle);
      sw.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
    refreshModifiersUI();
  }

  function refreshModifiersUI() {
    const forceOff = Game.getConstraints(activeModifiers);
    forceOff.forEach(id => activeModifiers.delete(id));
    Game.MODIFIER_DEFS.forEach(def => {
      const row = $('modifiers-list').querySelector(`.modifier-row[data-id="${def.id}"]`);
      if (!row) return;
      const sw = row.querySelector('.switch');
      sw.classList.toggle('on', activeModifiers.has(def.id));
      row.classList.toggle('disabled', forceOff.has(def.id));
    });
    const m = Game.computeMultiplier(activeModifiers);
    $('total-mult').textContent = `×${m.toFixed(1)}`;
  }

  function getActiveModifiers() { return new Set(activeModifiers); }
  function setActiveModifiers(set) {
    activeModifiers = new Set(set);
    refreshModifiersUI();
  }

  // ---------------- countdown ----------------
  function setCountdownNumber(n) {
    const el = $('countdown-num');
    el.textContent = n;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }

  // ---------------- game HUD ----------------
  function showHUD() { $('game-hud').classList.remove('hidden'); }
  function hideHUD() { $('game-hud').classList.add('hidden'); }

  function setupProgressBar(levelData) {
    const segContainer = $('song-progress-sections');
    segContainer.innerHTML = '';
    const duration = (levelData && levelData.duration) || 0;
    if (levelData && levelData.sections && levelData.sections.length && duration > 0) {
      levelData.sections.forEach(sec => {
        const seg = document.createElement('div');
        seg.className = 'seg';
        seg.style.width = `${(sec.duration / duration) * 100}%`;
        seg.style.background = SECTION_HEX[sec.type] || SECTION_HEX.chill;
        seg.style.opacity = '0.3';
        segContainer.appendChild(seg);
      });
    }
    const cpContainer = $('song-progress-checkpoints');
    cpContainer.innerHTML = '';
    if (levelData && levelData.checkpoints && duration > 0) {
      levelData.checkpoints.forEach(t => {
        const cp = document.createElement('div');
        cp.className = 'cp';
        cp.style.left = `${clamp01(t / duration) * 100}%`;
        cpContainer.appendChild(cp);
      });
    }
    $('song-progress-fill').style.width = '0%';
    $('song-progress-ghost').classList.add('hidden');
  }

  function updateHUD(state) {
    $('hud-score').textContent = Math.round(state.score);
    $('hud-combo').textContent = state.combo > 0
      ? `${state.combo} COMBO ×${state.comboMultiplier.toFixed(2)}` : '';

    const hearts = '♥'.repeat(Math.max(0, state.livesRemaining));
    $('hud-mult').textContent = `×${state.multiplier.toFixed(1)}  ${hearts}`;

    if (state.duration && isFinite(state.duration)) {
      const pct = clamp01(state.songTime / state.duration) * 100;
      $('song-progress-fill').style.width = `${pct}%`;
      const remaining = Math.max(0, state.remaining);
      const mins = Math.floor(remaining / 60);
      const secs = Math.floor(remaining % 60);
      $('time-remaining').textContent = `${mins}:${secs < 10 ? '0' : ''}${secs} left`;
      $('time-remaining').style.opacity = (state.section === 'drop') ? '0.15' : '1';
    } else {
      $('song-progress-fill').style.width = '0%';
      $('time-remaining').textContent = '';
    }

    updateGhostMarker(state);
  }

  function updateGhostMarker(state) {
    const ghostEl = $('song-progress-ghost');
    const session = Game.session;
    if (!session || !session.ghostData || !session.ghostData.length || !state.duration || !isFinite(state.duration)) {
      ghostEl.classList.add('hidden');
      return;
    }
    const ghost = session.ghostData;
    const score = state.score;
    let lo = 0, hi = ghost.length - 1, idx = ghost.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (ghost[mid].score >= score) { idx = mid; hi = mid - 1; } else lo = mid + 1;
    }
    ghostEl.classList.remove('hidden');
    ghostEl.style.left = `${clamp01(ghost[idx].time / state.duration) * 100}%`;
    if (state.ghostDelta != null) {
      const sign = state.ghostDelta >= 0 ? '+' : '';
      setPlayerBanner(`GHOST ${sign}${Math.round(state.ghostDelta)}`);
    }
  }

  function flashCombo() {
    const el = $('hud-combo');
    el.classList.remove('milestone');
    void el.offsetWidth;
    el.classList.add('milestone');
  }

  function setReplayToastVisible(show) {
    $('replay-toast').classList.toggle('hidden', !show);
  }

  function setPlayerBanner(text) {
    const el = $('player-banner');
    if (!text) { el.classList.add('hidden'); return; }
    el.textContent = text;
    el.classList.remove('hidden');
  }
  function hidePlayerBanner() { $('player-banner').classList.add('hidden'); }

  function setEndlessBanner(text) {
    const el = $('endless-banner');
    if (!text) { el.classList.add('hidden'); return; }
    el.textContent = text;
    el.classList.remove('hidden');
  }
  function hideEndlessBanner() { $('endless-banner').classList.add('hidden'); }

  // ---------------- practice mode ----------------
  function resetPractice() {
    $('practice-info').textContent = 'Looping the section around your last hit at 0.6x speed';
    $('practice-feedback').textContent = '';
    updatePracticeProgress(0);
  }
  function updatePracticeFeedback(deltaMs, grade) {
    const el = $('practice-feedback');
    if (grade === 'miss') {
      el.textContent = 'MISS';
      el.style.color = '#ff3b3b';
      return;
    }
    const sign = deltaMs >= 0 ? '+' : '';
    const label = grade === 'perfect' ? 'PERFECT' : 'GOOD';
    el.textContent = `${label}  ${sign}${Math.round(deltaMs)}ms`;
    el.style.color = grade === 'perfect' ? '#ffffff' : '#aaaaaa';
  }
  function updatePracticeProgress(passes) {
    $('practice-progress').textContent = `PASSES: ${Math.min(passes, 3)} / 3`;
  }

  // ---------------- complete screens ----------------
  function addStatRow(container, label, value) {
    const row = document.createElement('div');
    row.className = 'result-row';
    const span = document.createElement('span'); span.textContent = label;
    const b = document.createElement('b'); b.textContent = value;
    row.appendChild(span); row.appendChild(b);
    container.appendChild(row);
  }

  function formatDuration(sec) {
    sec = Math.round(sec || 0);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  }

  function populateComplete(result, rankInfo) {
    $('complete-title').textContent = result.finished ? 'SONG COMPLETE' : 'GAME OVER';
    const stats = $('complete-stats');
    stats.innerHTML = '';
    const perfectRate = result.totalBeats ? (result.perfectCount / result.totalBeats * 100) : 0;
    addStatRow(stats, 'SCORE', Math.round(result.score));
    addStatRow(stats, 'PERFECT', `${result.perfectCount} (${perfectRate.toFixed(1)}%)`);
    addStatRow(stats, 'GOOD', result.goodCount);
    addStatRow(stats, 'MISSES', result.hitCount);
    addStatRow(stats, 'MAX COMBO', result.maxCombo);
    addStatRow(stats, 'MULTIPLIER', `×${result.multiplier.toFixed(1)}`);

    drawAccuracyGraph(result.hitHistory);

    const placement = $('placement-banner');
    if (rankInfo && rankInfo.leaderboardRank === 0) {
      placement.textContent = '★ NEW HIGH SCORE! ★';
      placement.classList.remove('hidden');
    } else if (rankInfo && rankInfo.leaderboardRank > 0) {
      placement.textContent = `LEADERBOARD #${rankInfo.leaderboardRank + 1}`;
      placement.classList.remove('hidden');
    } else {
      placement.classList.add('hidden');
    }
  }

  function populateEndlessComplete(result, rank) {
    const stats = $('endless-stats');
    stats.innerHTML = '';
    addStatRow(stats, 'SCORE', Math.round(result.score));
    addStatRow(stats, 'SONGS SURVIVED', result.songsSurvived || 0);
    addStatRow(stats, 'MAX COMBO', result.maxCombo);
    addStatRow(stats, 'ENDURANCE', `×${(result.multiplier || 1).toFixed(1)}`);
    if (rank === 0) addStatRow(stats, 'RANK', '★ NEW BEST! ★');
    else if (rank != null && rank > 0) addStatRow(stats, 'RANK', `#${rank + 1}`);
  }

  function populateMultiplayerComplete(players) {
    const podium = $('podium');
    podium.innerHTML = '';
    const ranked = players.slice().sort((a, b) => b.score - a.score);
    const heights = [120, 90, 64, 44];
    const order = ranked.length >= 3
      ? [1, 0, 2].concat(ranked.slice(3).map((_, i) => i + 3))
      : ranked.map((_, i) => i);
    order.forEach(idx => {
      const p = ranked[idx];
      if (!p) return;
      const col = document.createElement('div');
      col.className = 'podium-place';
      const bar = document.createElement('div');
      bar.className = 'podium-bar';
      bar.style.height = `${heights[idx] || 36}px`;
      bar.textContent = `${idx + 1}`;
      const name = document.createElement('div'); name.className = 'podium-name'; name.textContent = p.name;
      const score = document.createElement('div'); score.className = 'podium-score'; score.textContent = Math.round(p.score);
      col.appendChild(bar); col.appendChild(name); col.appendChild(score);
      podium.appendChild(col);
    });
    spawnConfetti();
  }

  function spawnConfetti() {
    const container = $('confetti-container');
    container.innerHTML = '';
    const colors = ['#ffffff', '#ffd24d', '#4dff7a', '#6a8dff', '#ff5a3c'];
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
      piece.style.animationDelay = `${Math.random() * 0.5}s`;
      container.appendChild(piece);
    }
    setTimeout(() => { container.innerHTML = ''; }, 3500);
  }

  // ---------------- themes & skins ----------------
  function populateThemesSkins() {
    const settings = Storage.getSettings();

    const themeGrid = $('theme-grid');
    themeGrid.innerHTML = '';
    Storage.getThemeDefs().forEach(def => {
      const unlocked = Storage.isThemeUnlocked(def.id);
      const item = document.createElement('div');
      item.className = 'grid-item' + (unlocked ? '' : ' locked') + (settings.theme === def.id ? ' selected' : '');
      const swatch = document.createElement('div');
      swatch.className = 'item-swatch';
      swatch.style.background = THEME_SWATCH[def.id] || '#ffffff';
      const name = document.createElement('div'); name.className = 'item-name'; name.textContent = def.name;
      const hint = document.createElement('div'); hint.className = 'item-hint';
      hint.textContent = unlocked ? 'TAP TO SELECT' : def.hint;
      item.appendChild(swatch); item.appendChild(name); item.appendChild(hint);
      if (unlocked) {
        item.addEventListener('click', () => {
          Storage.setSetting('theme', def.id);
          applyTheme(def.id);
          populateThemesSkins();
        });
      }
      themeGrid.appendChild(item);
    });

    const skinGrid = $('skin-grid');
    skinGrid.innerHTML = '';
    Storage.getSkinDefs().forEach(def => {
      const unlocked = Storage.isSkinUnlocked(def.id);
      const item = document.createElement('div');
      item.className = 'grid-item' + (unlocked ? '' : ' locked') + (settings.skin === def.id ? ' selected' : '');
      const canvas = document.createElement('canvas');
      canvas.width = 36; canvas.height = 36;
      canvas.className = 'item-swatch';
      canvas.style.background = 'transparent';
      drawSkinPreview(canvas, def.id);
      const name = document.createElement('div'); name.className = 'item-name'; name.textContent = def.name;
      const hint = document.createElement('div'); hint.className = 'item-hint';
      hint.textContent = unlocked ? 'TAP TO SELECT' : def.hint;
      item.appendChild(canvas); item.appendChild(name); item.appendChild(hint);
      if (unlocked) {
        item.addEventListener('click', () => {
          Storage.setSetting('skin', def.id);
          populateThemesSkins();
        });
      }
      skinGrid.appendChild(item);
    });
  }

  function drawSkinPreview(canvas, skinId) {
    const ctx = canvas.getContext('2d');
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#ffffff';
    const renderer = (Game.SKIN_RENDERERS && Game.SKIN_RENDERERS[skinId]) || (Game.SKIN_RENDERERS && Game.SKIN_RENDERERS.classic);
    if (renderer) renderer(ctx, 18, 18, 13, accent, 0);
  }

  // ---------------- achievements ----------------
  function populateAchievements() {
    const grid = $('achievements-grid');
    grid.innerHTML = '';
    Storage.getAchievementDefs().forEach(def => {
      const unlocked = Storage.isAchievementUnlocked(def.id);
      const item = document.createElement('div');
      item.className = 'grid-item' + (unlocked ? '' : ' locked');
      const icon = document.createElement('div'); icon.className = 'ach-icon'; icon.textContent = def.icon;
      const body = document.createElement('div'); body.className = 'ach-body';
      const name = document.createElement('div'); name.className = 'item-name'; name.textContent = def.name;
      const hint = document.createElement('div'); hint.className = 'item-hint'; hint.textContent = def.hint;
      body.appendChild(name); body.appendChild(hint);
      if (def.cumulative && !unlocked) {
        const progress = Storage.getAchievementProgress(def);
        const bar = document.createElement('div'); bar.className = 'item-progress';
        const fill = document.createElement('div'); fill.className = 'item-progress-fill';
        fill.style.width = `${(progress.current / progress.target) * 100}%`;
        bar.appendChild(fill);
        body.appendChild(bar);
        const progText = document.createElement('div'); progText.className = 'item-hint';
        progText.textContent = `${progress.current} / ${progress.target}`;
        body.appendChild(progText);
      }
      item.appendChild(icon); item.appendChild(body);
      grid.appendChild(item);
    });
  }

  // ---------------- stats dashboard ----------------
  function populateStats() {
    const stats = Storage.getStats();
    const panel = $('stats-panel');
    panel.innerHTML = '';
    addStatRow(panel, 'TOTAL PLAY TIME', formatDuration(stats.totalPlayTimeSec));
    addStatRow(panel, 'TOTAL JUMPS', stats.totalJumps);
    addStatRow(panel, 'SONGS FINISHED', stats.totalSongsFinished);
    const avgPerfect = stats.perfectRateHistory.length
      ? (stats.perfectRateHistory.reduce((a, b) => a + b, 0) / stats.perfectRateHistory.length * 100) : 0;
    addStatRow(panel, 'AVG PERFECT RATE', `${avgPerfect.toFixed(1)}%`);
    addStatRow(panel, 'BEST COMBO', stats.bestCombo);
    addStatRow(panel, 'TOTAL SCORE', Math.round(stats.totalScore));

    let mostPlayed = null;
    Object.values(stats.songPlayCounts).forEach(e => {
      if (!mostPlayed || e.count > mostPlayed.count) mostPlayed = e;
    });
    addStatRow(panel, 'MOST PLAYED', mostPlayed ? `${mostPlayed.name} (${mostPlayed.count}x)` : '-');

    let favMod = null, favCount = 0;
    Object.entries(stats.modifierUsage).forEach(([id, count]) => {
      if (count > favCount) { favCount = count; favMod = id; }
    });
    const modDef = favMod ? Game.MODIFIER_DEFS.find(d => d.id === favMod) : null;
    addStatRow(panel, 'FAVORITE MODIFIER', modDef ? modDef.name : '-');

    drawStatsChart(stats.perfectRateHistory);
  }

  function drawStatsChart(history) {
    const canvas = $('stats-chart');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 100;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!history.length) return;
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#ffffff';
    const barW = w / 10;
    history.forEach((rate, i) => {
      const barH = clamp01(rate) * (h - 8);
      ctx.globalAlpha = 0.35 + rate * 0.65;
      ctx.fillStyle = accent;
      ctx.fillRect(i * barW + 4, h - barH, barW - 8, barH);
    });
    ctx.globalAlpha = 1;
  }

  // ---------------- leaderboards ----------------
  function populateLeaderboards() {
    const list = $('leaderboard-song-list');
    $('leaderboard-detail').classList.add('hidden');
    list.classList.remove('hidden');
    list.innerHTML = '';
    const songs = Storage.getAllPlayedSongs();
    if (!songs.length) {
      const empty = document.createElement('div');
      empty.className = 'panel';
      empty.textContent = 'No songs played yet.';
      list.appendChild(empty);
      return;
    }
    songs.forEach(song => {
      const item = document.createElement('div');
      item.className = 'grid-item';
      const name = document.createElement('div'); name.className = 'item-name'; name.textContent = song.name;
      const hint = document.createElement('div'); hint.className = 'item-hint';
      hint.textContent = song.top ? `TOP: ${Math.round(song.top.score)}` : '-';
      item.appendChild(name); item.appendChild(hint);
      item.addEventListener('click', () => showLeaderboardDetail(song.hash, song.name));
      list.appendChild(item);
    });
  }

  function showLeaderboardDetail(hash, name) {
    $('leaderboard-song-list').classList.add('hidden');
    const detail = $('leaderboard-detail');
    detail.classList.remove('hidden');
    detail.innerHTML = '';
    const title = document.createElement('h3'); title.textContent = name;
    detail.appendChild(title);
    const entries = Storage.getLeaderboard(hash);
    entries.forEach((e, i) => {
      const row = document.createElement('div'); row.className = 'leaderboard-entry';
      const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = `#${i + 1}`;
      const info = document.createElement('span');
      info.textContent = `${Math.round(e.score)} pts  •  ${(e.perfectRate * 100).toFixed(0)}%  •  ${e.maxCombo}x`;
      row.appendChild(rank); row.appendChild(info);
      detail.appendChild(row);
    });
    const back = document.createElement('button');
    back.className = 'btn ghost focusable';
    back.textContent = 'BACK TO SONGS';
    back.addEventListener('click', () => populateLeaderboards());
    detail.appendChild(back);
  }

  function leaderboardsGoBack() {
    const detail = $('leaderboard-detail');
    if (!detail.classList.contains('hidden')) {
      populateLeaderboards();
      return true;
    }
    return false;
  }

  // ---------------- song library (cached analyzed songs) ----------------
  function populateLibrary() {
    const list = $('library-song-list');
    list.innerHTML = '';
    const songs = Storage.getLibrarySongs();
    if (!songs.length) {
      const empty = document.createElement('div');
      empty.className = 'panel';
      empty.textContent = 'No analyzed songs yet. Upload a song to add it to your library.';
      list.appendChild(empty);
      return;
    }
    songs.forEach(song => {
      const item = document.createElement('div');
      item.className = 'grid-item';
      const name = document.createElement('div'); name.className = 'item-name'; name.textContent = song.name;
      const hint = document.createElement('div'); hint.className = 'item-hint';
      const mins = Math.floor(song.duration / 60);
      const secs = Math.floor(song.duration % 60);
      const lengthStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      const bestStr = song.bestScore != null ? `${song.bestScore} pts` : '-';
      const perfectStr = song.perfectRate != null ? `${(song.perfectRate * 100).toFixed(0)}%` : '-';
      hint.textContent = `BPM ${song.bpm}  •  ${lengthStr}  •  BEST ${bestStr}  •  PERFECT ${perfectStr}  •  PLAYED ${song.playCount}x`;
      item.appendChild(name); item.appendChild(hint);
      list.appendChild(item);
    });
  }

  // ---------------- challenge codes ----------------
  function setChallengeMessage(text, isError) {
    const el = $('challenge-msg');
    el.textContent = text || '';
    el.style.color = isError ? '#ff3b3b' : '';
  }
  function getChallengeCodeInput() { return $('challenge-code-input').value.trim().toUpperCase(); }
  function clearChallengeInput() {
    $('challenge-code-input').value = '';
    setChallengeMessage('');
  }

  // ---------------- multi-select (endless / playlist) ----------------
  function initMultiSelect(title, infoText) {
    multiSelectFiles = [];
    $('multi-select-title').textContent = title;
    $('multi-select-info').textContent = infoText;
    renderMultiSelectList();
  }
  function addMultiSelectFile(file) {
    multiSelectFiles.push({ file, name: file.name, status: 'pending', analysis: null, levelData: null, hash: null });
    renderMultiSelectList();
    return multiSelectFiles.length - 1;
  }
  function renderMultiSelectList() {
    const list = $('multi-select-list');
    list.innerHTML = '';
    multiSelectFiles.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'multi-select-item';
      const name = document.createElement('span'); name.textContent = entry.name;
      const status = document.createElement('span'); status.className = 'file-status';
      status.textContent = entry.status.toUpperCase();
      item.appendChild(name); item.appendChild(status);
      list.appendChild(item);
    });
  }
  function setMultiSelectFileStatus(i, status) {
    if (multiSelectFiles[i]) { multiSelectFiles[i].status = status; renderMultiSelectList(); }
  }
  function getMultiSelectFiles() { return multiSelectFiles; }

  // ---------------- pass & play setup ----------------
  function initPassSetup() {
    passPlayers = [{ name: 'PLAYER 1' }, { name: 'PLAYER 2' }];
    renderPassSetup();
  }
  function renderPassSetup() {
    const container = $('pass-setup-players');
    container.innerHTML = '';
    passPlayers.forEach((p, i) => {
      const row = document.createElement('div'); row.className = 'player-row';
      const color = document.createElement('div'); color.className = 'player-color';
      color.style.background = PLAYER_COLORS[i % PLAYER_COLORS.length];
      const input = document.createElement('input');
      input.className = 'text-input'; input.value = p.name; input.maxLength = 12;
      input.addEventListener('input', () => { passPlayers[i].name = input.value; });
      row.appendChild(color); row.appendChild(input);
      if (passPlayers.length > 2) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn small focusable';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', () => { passPlayers.splice(i, 1); renderPassSetup(); });
        row.appendChild(removeBtn);
      }
      container.appendChild(row);
    });
  }
  function addPassPlayer() {
    if (passPlayers.length >= 4) return;
    passPlayers.push({ name: `PLAYER ${passPlayers.length + 1}` });
    renderPassSetup();
  }
  function getPassPlayers() {
    return passPlayers.map((p, i) => ({
      name: (p.name || '').trim().toUpperCase().slice(0, 12) || `PLAYER ${i + 1}`,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    }));
  }

  // ---------------- pass-the-phone screen ----------------
  function showPassPhoneScreen(playerName, subText) {
    $('pass-title').textContent = `PASS TO ${playerName}`;
    $('pass-sub').textContent = subText || 'READY?';
  }

  // ---------------- playlist summary ----------------
  function populatePlaylistSummary(entries, totalScore) {
    const list = $('playlist-summary-list');
    list.innerHTML = '';
    entries.forEach(e => addStatRow(list, e.name, `${Math.round(e.score)} pts`));
    const totalPanel = $('playlist-summary-total');
    totalPanel.innerHTML = '';
    addStatRow(totalPanel, 'TOTAL SCORE', Math.round(totalScore));
  }

  // ---------------- init ----------------
  function init() {
    applySavedAppearance();
    initSettingsScreen();
    bindTunerSliders();
    if (Storage.getSettings().listenEnabled) $('listen-toggle').classList.add('active');
  }

  return {
    init,
    showScreen, goBack, resetNav, getCurrentScreen,
    showToast, showAchievementToasts, showThemeUnlockOverlay, showControllerToast,
    logDebugError, hideDebugOverlay, clearDebugLog,
    applyTheme,
    setHeartbeatRate,
    populateResult,
    populateSongMap,
    initTuner, readTunerSliders, drawTunerCanvas,
    setMicStatus, setMicTitle, showMicPermissionError, setMicCountdown, drawMicVisualizer,
    populateModifiers, getActiveModifiers, setActiveModifiers,
    setCountdownNumber,
    showHUD, hideHUD, setupProgressBar, updateHUD, flashCombo,
    setReplayToastVisible, setPlayerBanner, hidePlayerBanner, setEndlessBanner, hideEndlessBanner,
    resetPractice, updatePracticeFeedback, updatePracticeProgress,
    populateComplete, populateEndlessComplete, populateMultiplayerComplete,
    populateThemesSkins, populateAchievements, populateStats, populateLeaderboards,
    leaderboardsGoBack,
    populateLibrary,
    setChallengeMessage, getChallengeCodeInput, clearChallengeInput,
    initMultiSelect, addMultiSelectFile, setMultiSelectFileStatus, getMultiSelectFiles,
    initPassSetup, addPassPlayer, getPassPlayers,
    showPassPhoneScreen,
    populatePlaylistSummary,
  };
})();
