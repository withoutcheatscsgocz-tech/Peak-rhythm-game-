/* ============================================================
   ONE DOT - cloud.js
   Thin wrapper around a Supabase project's REST (PostgREST) and
   Storage APIs for the Public Library + global leaderboards.
   Plain fetch() - no SDK/bundler needed.

   To enable: create a Supabase project, run the SQL schema from
   PUBLIC_LIBRARY_SETUP.sql, then fill in SUPABASE_URL and
   SUPABASE_ANON_KEY below with your project's values
   (Project Settings -> API).
   ============================================================ */

const Cloud = (() => {
  const SUPABASE_URL = 'YOUR_SUPABASE_URL';
  const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

  const SONGS_BUCKET = 'songs';

  function isConfigured() {
    return !!SUPABASE_URL && !!SUPABASE_ANON_KEY
      && !SUPABASE_URL.includes('YOUR_') && !SUPABASE_ANON_KEY.includes('YOUR_');
  }

  function authHeaders(extra) {
    return Object.assign({
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    }, extra || {});
  }

  // ---------------- public level list ----------------
  async function fetchPublicLevels() {
    if (!isConfigured()) return [];
    const res = await fetch(`${SUPABASE_URL}/rest/v1/levels?select=id,title,author_name,bpm,duration,play_count,created_at&order=created_at.desc&limit=50`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`fetchPublicLevels failed: ${res.status}`);
    return res.json();
  }

  async function fetchLevel(id) {
    if (!isConfigured()) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/levels?id=eq.${encodeURIComponent(id)}&select=*`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`fetchLevel failed: ${res.status}`);
    const rows = await res.json();
    return rows[0] || null;
  }

  // ---------------- global leaderboards ----------------
  async function fetchLeaderboard(levelId) {
    if (!isConfigured()) return [];
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?level_id=eq.${encodeURIComponent(levelId)}&select=player_name,score,max_combo,perfect_rate,modifiers,created_at&order=score.desc&limit=10`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`fetchLeaderboard failed: ${res.status}`);
    return res.json();
  }

  async function submitScore(opts) {
    if (!isConfigured()) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
      body: JSON.stringify({
        level_id: opts.levelId,
        player_name: opts.playerName,
        score: opts.score,
        max_combo: opts.maxCombo,
        perfect_rate: opts.perfectRate,
        modifiers: opts.modifiers || [],
      }),
    });
    if (!res.ok) throw new Error(`submitScore failed: ${res.status}`);
    const rows = await res.json();
    return rows[0];
  }

  async function incrementPlayCount(levelId) {
    if (!isConfigured()) return;
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_play_count`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ p_level_id: levelId }),
    });
  }

  // ---------------- song audio storage ----------------
  async function downloadSong(storagePath) {
    if (!isConfigured()) throw new Error('Cloud not configured');
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${SONGS_BUCKET}/${storagePath}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`downloadSong failed: ${res.status}`);
    return res.arrayBuffer();
  }

  /**
   * Uploads the audio file plus the locally-generated analysis/levelData
   * so every player gets the exact same beatmap for this song (the
   * shared global leaderboard only makes sense if everyone plays the
   * same level).
   */
  async function publishLevel(opts) {
    if (!isConfigured()) throw new Error('Cloud not configured');
    const ext = (opts.fileName || '').split('.').pop().toLowerCase() || 'mp3';
    const storagePath = `${opts.songHash}-${Date.now().toString(36)}.${ext}`;

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${SONGS_BUCKET}/${storagePath}`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': opts.audioFile.type || 'application/octet-stream' }),
      body: opts.audioFile,
    });
    if (!uploadRes.ok) throw new Error(`song upload failed: ${uploadRes.status}`);

    const levelRes = await fetch(`${SUPABASE_URL}/rest/v1/levels`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
      body: JSON.stringify({
        song_hash: opts.songHash,
        title: opts.title,
        author_name: opts.authorName,
        bpm: opts.bpm,
        duration: opts.duration,
        level_data: { analysis: opts.analysis, levelData: opts.levelData },
        storage_path: storagePath,
      }),
    });
    if (!levelRes.ok) throw new Error(`publish failed: ${levelRes.status}`);
    const rows = await levelRes.json();
    return rows[0];
  }

  return {
    isConfigured,
    fetchPublicLevels, fetchLevel,
    fetchLeaderboard, submitScore, incrementPlayCount,
    downloadSong, publishLevel,
  };
})();
