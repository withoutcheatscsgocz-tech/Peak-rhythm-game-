# ONE DOT

A minimalist HTML5 rhythm game for your ears. Tap to make a single neon
dot jump over obstacles spawned procedurally from the beats of any song
you upload (or from your microphone in real time). Built with vanilla
JS - no frameworks, no build step for the web app itself.

## Project structure

```
www/                  the actual game (static HTML5 app)
  index.html
  css/style.css
  js/
    main.js           app controller / screen flow
    game.js           gameplay loop, scoring, juice/FX
    audio.js          audio analysis + mic engine
    level.js          procedural level generation
    storage.js        localStorage (settings, leaderboards, achievements...)
    haptics.js        vibration patterns
    ui.js             screen rendering / DOM

capacitor.config.json Capacitor config (appId com.nikita.onedot)
package.json          Capacitor CLI/deps for the Android wrapper
android/              generated native Android project (Capacitor)
electron/             desktop wrapper (Electron) for Windows/Linux/macOS builds
```

## Playing it as a website

`www/` is a fully static site - no build step, no server-side code.
For local testing, serve it over HTTP (the Web Audio / mic APIs need a
secure context, so `file://` won't fully work in most browsers):

```bash
cd www
python3 -m http.server 8080
# then open http://localhost:8080
```

## Building the Android APK (Capacitor)

### Prerequisites

- Node.js 18+
- Android Studio (or just the Android SDK command-line tools) with:
  - An Android SDK platform matching `compileSdk`/`targetSdk` in
    `android/variables.gradle`
  - JDK 17

### One-time setup

```bash
npm install
```

The native project already exists in `android/`. You only need to run
`npx cap add android` again if the `android/` folder is ever deleted.

### After changing anything in `www/`

Whenever you edit the web app, copy the changes into the native project
and re-sync Capacitor plugins/config:

```bash
npx cap sync android
```

### Build the APK

Open the project in Android Studio and run it on a device/emulator:

```bash
npx cap open android
```

...or build from the command line:

```bash
cd android
./gradlew assembleDebug      # debug APK
# output: android/app/build/outputs/apk/debug/app-debug.apk

./gradlew bundleRelease      # release AAB (needs signing config)
```

### Permissions

`AndroidManifest.xml` requests:

- `RECORD_AUDIO` - for **MIC MODE** and the audio-reactive **LISTEN**
  toggle on the start screen (microphone is declared as an optional
  hardware feature, so the app still installs on devices without one).
- `VIBRATE` - for the haptics ("SATISFYING ASF") feedback system.
- `INTERNET` - default Capacitor requirement.

### Display

The app runs fullscreen/edge-to-edge (system bars are hidden, swipe to
reveal temporarily) and supports both portrait and landscape
orientation (`android:screenOrientation="fullSensor"`).

## Building the desktop app (Electron)

`electron/main.js` wraps `www/` in an Electron window. It serves the
`www/` folder over a local `http://127.0.0.1` server (instead of
`file://`) so Web Audio and `getUserMedia` (MIC MODE) work normally.

### Run it during development

```bash
npm install
npm run electron
```

### Build a Windows .exe

```bash
npm run dist:win
# output: dist/ONE DOT-win32-x64/ONE DOT.exe
```

This produces an unpacked, portable Windows x64 build (just zip the
`ONE DOT-win32-x64` folder and run `ONE DOT.exe` - no installer).
Building Windows targets from Linux/macOS requires Wine (used to embed
the icon/metadata into the `.exe`):

```bash
sudo apt-get install wine64
# electron-packager looks for a `wine64` binary specifically;
# on distros where `wine` provides 64-bit support under that name only:
sudo ln -s "$(which wine)" /usr/bin/wine64
```

## Notes

- Levels are generated deterministically from a hash of the uploaded
  audio file, so the same song always produces the same level/seed.
- All game data (settings, unlocks, leaderboards, stats, tuner presets)
  is stored locally via `localStorage` - nothing is sent over the
  network.
