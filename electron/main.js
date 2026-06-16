const { app, BrowserWindow, Menu, session, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');

const WWW_DIR = path.join(__dirname, '..', 'www');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

// Serve www/ over http://127.0.0.1 so the Web Audio / mic APIs run in a
// secure context (file:// breaks getUserMedia and module fetches).
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';

      const filePath = path.normalize(path.join(WWW_DIR, urlPath));
      if (!filePath.startsWith(WWW_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// ---- helpers ----------------------------------------------------------------

function httpsGet(urlStr, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        ...opts.headers,
      },
      ...opts,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpsGet(res.headers.location, opts));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function httpsGetJson(urlStr, headers) {
  return httpsGet(urlStr, { headers }).then((buf) => JSON.parse(buf.toString('utf8')));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- YouTube via ytmp3.mobi (ymcdn.org) ------------------------------------

const YTMP3_HEADERS = {
  Referer: 'https://ytmp3.mobi/',
  Origin: 'https://ytmp3.mobi',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

function isYouTubeURL(url) {
  return /(?:youtube\.com|youtu\.be|music\.youtube\.com)/i.test(url);
}

function extractYouTubeId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function downloadYtmp3(url, sendProgress) {
  const vid = extractYouTubeId(url);
  if (!vid) throw new Error('Could not read a YouTube video ID');
  const canonical = `https://www.youtube.com/watch?v=${vid}`;
  const ts = () => Date.now();

  const init = await httpsGetJson(`https://d.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${ts()}`, YTMP3_HEADERS);
  if (!init || !init.convertURL) throw new Error('ytmp3 init failed');
  sendProgress(0.05);

  const s2 = await httpsGetJson(`${init.convertURL}&v=${encodeURIComponent(canonical)}&f=mp3&_=${ts()}`, YTMP3_HEADERS);
  if (!s2 || s2.error || !s2.hash) {
    throw new Error((s2 && s2.error && s2.error.message) || 'ytmp3 convert rejected this link');
  }
  const title = s2.title || 'YouTube audio';
  const progressURL = s2.progressURL || `https://a.ymcdn.org/api/v1/progress?id=${s2.hash}`;
  const downloadURL = s2.downloadURL || `https://ydl.ymcdn.org/api/v1/download/${s2.hash}/${canonical}`;

  let done = false;
  for (let i = 0; i < 60; i++) {
    let p = null;
    try { p = await httpsGetJson(`${progressURL}&_=${ts()}`, YTMP3_HEADERS); } catch (e) { /* transient */ }
    if (p) {
      if (p.progress === 3) { done = true; break; }
      sendProgress(0.1 + 0.4 * (Math.max(0, Math.min(100, p.percent || 0)) / 100));
    }
    await sleep(2000);
  }
  if (!done) throw new Error('ytmp3 conversion timed out');

  sendProgress(0.55);
  const buf = await httpsGet(downloadURL, { headers: YTMP3_HEADERS });
  if (buf.length < 8 * 1024 || buf[0] === 0x3c) throw new Error('ytmp3 returned an error page');
  sendProgress(1);
  return { data: new Uint8Array(buf), name: title };
}

// ---- YouTube via ytdl-core (fallback) --------------------------------------

async function downloadYouTube(url, sendProgress) {
  const ytdl = require('@distube/ytdl-core');
  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title;

  const format = ytdl.chooseFormat(info.formats, {
    quality: 'highestaudio',
    filter: 'audioonly',
  });

  const totalBytes = parseInt(format.contentLength || '0', 10);

  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;

    const stream = ytdl.downloadFromInfo(info, { format });

    stream.on('data', (chunk) => {
      chunks.push(chunk);
      received += chunk.length;
      if (totalBytes > 0) sendProgress(Math.min(0.95, received / totalBytes));
    });
    stream.on('error', reject);
    stream.on('end', () => {
      sendProgress(1);
      const buffer = Buffer.concat(chunks);
      resolve({ data: new Uint8Array(buffer), name: title });
    });
  });
}

// ---- Spotify 30-second preview ----------------------------------------------

function isSpotifyURL(url) {
  return /open\.spotify\.com\/track\//i.test(url);
}

async function downloadSpotify(url, sendProgress) {
  const match = url.match(/track\/([A-Za-z0-9]+)/);
  if (!match) throw new Error('Cannot extract Spotify track ID from URL');
  const trackId = match[1];

  sendProgress(0.1);
  const html = (await httpsGet(`https://open.spotify.com/track/${trackId}`, {
    headers: { Accept: 'text/html' },
  })).toString('utf8');

  const scriptMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (!scriptMatch) throw new Error('Spotify page structure changed — preview unavailable');

  const pageData = JSON.parse(scriptMatch[1]);
  const entity =
    pageData?.props?.pageProps?.state?.data?.entity ||
    pageData?.props?.pageProps?.serverData?.entity;
  const previewUrl = entity?.audioPreview?.url;
  if (!previewUrl) throw new Error('No 30-second preview available for this track');

  const title = (entity?.name || 'Spotify track') + ' (30s preview)';

  sendProgress(0.3);
  const audioData = await httpsGet(previewUrl);
  sendProgress(1);

  return { data: new Uint8Array(audioData), name: title };
}

// ---- IPC handler ------------------------------------------------------------

ipcMain.handle('download-audio', async (event, url) => {
  const send = (pct) => {
    try { event.sender.send('download-progress', pct); } catch (_) {}
  };

  if (isYouTubeURL(url)) {
    // Primary: ytmp3.mobi (no YouTube bot-checks). Fallback: ytdl-core.
    try {
      return await downloadYtmp3(url, send);
    } catch (e) {
      console.warn('ytmp3 failed, falling back to ytdl-core:', e.message);
      return downloadYouTube(url, send);
    }
  }
  if (isSpotifyURL(url)) {
    return downloadSpotify(url, send);
  }

  // Generic direct audio URL fallback (.mp3 / .wav / .ogg / .m4a etc.)
  send(0.1);
  const data = await httpsGet(url);
  send(1);
  const ext = url.split('?')[0].split('.').pop() || 'mp3';
  return { data: new Uint8Array(data), name: `audio.${ext}` };
});

// ---- window -----------------------------------------------------------------

let mainWindow;
let httpServer;

async function createWindow() {
  httpServer = await startServer();
  const port = httpServer.address().port;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  // Allow the in-page mic toggle (Web Audio "LISTEN" mode) to request mic access.
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'media');
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (httpServer) httpServer.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
