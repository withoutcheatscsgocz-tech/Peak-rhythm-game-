/* ============================================================
   ONE DOT - i18n.js
   Lightweight localization layer.
   - STRINGS[locale][key] holds translated UI text.
   - t(key, vars, fallback) looks up the active locale, falls back
     to English, then to an explicit fallback, then to the key itself.
   - applyStaticTranslations() walks the DOM for data-i18n /
     data-i18n-html / data-i18n-placeholder attributes.
   - Locale is auto-detected from navigator.languages on first run,
     then persisted via Storage settings.language.
   ============================================================ */

const I18N = (() => {
  const LOCALES = ['en', 'cs', 'ru', 'de', 'es', 'fr', 'pl'];

  const LANG_NAMES = {
    en: 'English',
    cs: 'Čeština',
    ru: 'Русский',
    de: 'Deutsch',
    es: 'Español',
    fr: 'Français',
    pl: 'Polski',
  };

  const STRINGS = {};

  STRINGS.en = {
    'common.back': 'BACK',
    'common.mainMenu': 'MAIN MENU',
    'common.controllerConnected': 'CONTROLLER CONNECTED',
    'common.themeUnlocked': 'THEME UNLOCKED',
    'common.on': 'ON',

    'start.subtitle': 'a rhythm game for your ears',
    'start.tutorial': 'HOW TO PLAY',
    'start.uploadSong': 'UPLOAD SONG',
    'start.pasteLink': 'YOUTUBE / SPOTIFY LINK',
    'start.uploadPlaylist': 'UPLOAD PLAYLIST',
    'start.endless': 'ENDLESS',
    'start.passPlay': 'PASS & PLAY',
    'start.enterChallenge': 'ENTER CHALLENGE CODE',
    'start.leaderboards': 'LEADERBOARDS',
    'start.achievements': 'ACHIEVEMENTS',
    'start.stats': 'STATS',
    'start.cosmetics': 'COSMETICS',
    'start.library': 'SONG LIBRARY',
    'start.publicLibrary': 'PUBLIC LIBRARY',
    'start.settings': 'SETTINGS',

    'help.title': 'WHERE TO GET MUSIC?',
    'help.intro': 'ONE DOT works with any local audio file (MP3, WAV, OGG) on your device. Here are some great legal ways to find music to play:',
    'help.li1': '<b>Royalty-free libraries</b> &mdash; sites like Free Music Archive or Pixabay Music offer tracks you can download and use freely.',
    'help.li2': "<b>Your own purchased music</b> &mdash; any DRM-free MP3s you've bought work great.",
    'help.li3': '<b>Your own recordings</b> &mdash; humming, beatboxing, or band recordings make for fun, unpredictable levels!',
    'help.outro': 'Once you have a file on your device, just tap <b>UPLOAD SONG</b> and pick it.',

    'settings.title': 'SETTINGS',
    'settings.latency': 'Audio Latency Offset:',
    'settings.haptics': 'Haptics',
    'settings.hapticsOff': 'OFF',
    'settings.hapticsTaps': 'TAPS ONLY',
    'settings.hapticsFull': 'FULL RHYTHM',
    'settings.replay': 'Instant Replay Capture',
    'settings.debugLog': 'Debug Log (show crash details on screen)',
    'settings.tapSound': 'Tap Sound (perfect hits)',
    'settings.tapHihat': 'HI-HAT',
    'settings.tapClap': 'CLAP',
    'settings.tap808': '808',
    'settings.tapLaser': 'LASER',
    'settings.preview': 'PREVIEW',
    'settings.rhythmGuide': 'Rhythm Guide (quiet tick on every beat)',
    'settings.guideAuto': 'AUTO (first 3 plays)',
    'settings.playerName': 'Player Name (shown on Public Library leaderboards)',
    'settings.playerNamePlaceholder': 'PLAYER1234',
    'settings.rhythmFocus': 'Rhythm Focus:',
    'settings.rhythmFocusHint': "Higher = the ball follows vocals/melody more; lower = it follows drums/bass more. New songs only - re-upload to apply to a song you already analyzed.",
    'settings.syncTestHint': "SYNC TEST plays a constant 120 BPM click track. If your taps on the clicks feel early/late, adjust the Latency Offset above. If the obstacles visually drift away from the beat over time, that's a timing bug.",
    'settings.syncTest': 'SYNC TEST (120 BPM)',
    'settings.language': 'Language',

    'vocal.drumsOnly': 'DRUMS ONLY',
    'vocal.mostlyDrums': 'MOSTLY DRUMS',
    'vocal.balanced': 'BALANCED',
    'vocal.mostlyVocals': 'MOSTLY VOCALS',
    'vocal.vocalsOnly': 'VOCALS ONLY',

    'debug.title': 'DEBUG LOG',
    'debug.clear': 'CLEAR',

    'analyzing.title': 'ANALYZING AUDIO...',
    'analyzing.loadedFromLibrary': 'LOADED FROM LIBRARY',
    'analyzing.downloadingSong': 'DOWNLOADING SONG...',
    'analyzing.preparingTutorial': 'PREPARING TUTORIAL...',
    'analyzing.lessonBounce': 'LESSON: BOUNCE ON THE BEAT',
    'analyzing.preparingSyncTest': 'PREPARING SYNC TEST...',
    'analyzing.clickTrack120': '120 BPM CLICK TRACK',
    'analyzing.regeneratingLevel': 'REGENERATING LEVEL...',

    'result.title': 'TRACK READY',
    'result.song': 'SONG',
    'result.bpm': 'BPM',
    'result.length': 'LENGTH',
    'result.beats': 'BEATS',
    'result.intensity': 'INTENSITY',
    'result.weakWarning': 'Weak beat detected — this song may not play well. Try the BEAT TUNER to adjust detection.',
    'legend.drop': 'DROP',
    'legend.build': 'BUILD',
    'legend.chill': 'CHILL',
    'legend.checkpoint': 'CHECKPOINT',
    'legend.vocalDensity': 'VOCAL DENSITY',
    'result.publish': 'Publish this song + level so other players can play it on the Public Library leaderboard',
    'result.publishTitlePlaceholder': 'LEVEL TITLE',
    'result.publishBtn': 'PUBLISH TO PUBLIC LIBRARY',
    'result.continue': 'CONTINUE',

    'tuner.title': 'BEAT TUNER',
    'tuner.bassLabel': 'BASS &rarr; SPIKES',
    'tuner.test': 'TEST',
    'tuner.sensitivity': 'Sensitivity:',
    'tuner.minSpacing': 'Min Spacing:',
    'tuner.preview': 'PREVIEW (10s)',
    'tuner.regenerate': 'REGENERATE LEVEL',
    'tuner.legendWave': 'WAVEFORM',
    'tuner.legendGrid': 'BEAT GRID',
    'tuner.legendHits': 'OBSTACLE HITS',

    'modifiers.title': 'MODIFIERS',
    'modifiers.total': 'TOTAL:',
    'modifiers.start': 'START',

    'pass.readyQ': 'READY?',
    'pass.getReady': 'GET READY!',
    'pass.yourTurn': 'YOUR TURN!',
    'pass.continue': 'TAP TO CONTINUE',
    'pass.passTo': 'PASS TO {name}',

    'hud.timeRemaining': '{time} left',
    'hud.replayToast': '50+ PERFECT STREAK CAPTURED!',
    'hud.saveReplay': 'SAVE REPLAY',

    'pause.title': 'PAUSED',
    'pause.resume': 'RESUME',
    'pause.restartCheckpoint': 'RESTART FROM CHECKPOINT',
    'pause.quit': 'QUIT TO MENU',

    'practice.title': 'PRACTICE MODE',
    'practice.info': 'Looping the section around your last hit at 0.6x speed',
    'practice.exit': 'EXIT PRACTICE',
    'practice.passes': 'PASSES: {n} / 3',

    'complete.songComplete': 'SONG COMPLETE',
    'complete.gameOver': 'GAME OVER',
    'leaderboard.global': 'GLOBAL LEADERBOARD',
    'leaderboard.yourName': 'YOUR NAME',
    'complete.share': 'SHARE SCORE CARD',
    'complete.challenge': 'CHALLENGE',
    'complete.practice': 'PRACTICE',
    'complete.playAgain': 'PLAY AGAIN',

    'endless.runOver': 'RUN OVER',
    'endless.retry': 'RETRY',

    'multiplayer.results': 'RESULTS',

    'cosmetics.title': 'COSMETICS',
    'cosmetics.theme': 'THEME',
    'cosmetics.skin': 'DOT SKIN',
    'cosmetics.trail': 'TRAIL',

    'achievements.title': 'ACHIEVEMENTS',

    'stats.title': 'STATS',

    'leaderboards.title': 'LEADERBOARDS',

    'library.title': 'SONG LIBRARY',
    'library.hint': "Cached analysis for songs you've played. Re-upload the same file and analysis will be skipped instantly.",

    'publicLibrary.title': 'PUBLIC LIBRARY',
    'publicLibrary.hint': "Songs and levels published by other players. Tap PLAY to download one and play it - your score goes on its global leaderboard.",
    'publicLibrary.searchPlaceholder': 'SEARCH TITLE / AUTHOR',
    'publicLibrary.sortNewest': 'NEWEST',
    'publicLibrary.sortPlayed': 'MOST PLAYED',
    'publicLibrary.sortRating': 'TOP RATED',
    'publicLibrary.sortBpmAsc': 'BPM LOW→HIGH',
    'publicLibrary.sortBpmDesc': 'BPM HIGH→LOW',
    'publicLibrary.minBpmPlaceholder': 'MIN BPM',
    'publicLibrary.maxBpmPlaceholder': 'MAX BPM',

    'challenge.title': 'ENTER CHALLENGE CODE',
    'challenge.placeholder': 'e.g. 3F9K2-A1B2C-12345',
    'challenge.submit': 'UPLOAD MATCHING SONG',

    'link.title': 'PASTE LINK',
    'link.placeholder': 'Paste a YouTube or Spotify URL...',
    'link.play': 'PLAY',
    'link.downloading': 'DOWNLOADING...',
    'link.desktopOnly': 'Unsupported URL. Try a YouTube or Spotify link.',

    'multiSelect.title': 'SELECT SONGS',
    'multiSelect.info': 'Choose 2 or more audio files',
    'multiSelect.chooseFiles': 'CHOOSE FILES',
    'multiSelect.continue': 'CONTINUE',
    'multiSelect.endlessTitle': 'ENDLESS MODE',
    'multiSelect.endlessInfo': 'Choose 2 or more audio files - they will play back to back',
    'multiSelect.playlistTitle': 'AUTO-DJ PLAYLIST',
    'multiSelect.playlistInfo': 'Choose songs to play back to back with crossfades',

    'passSetup.title': 'PASS & PLAY SETUP',
    'passSetup.addPlayer': 'ADD PLAYER',
    'passSetup.chooseSong': 'CHOOSE SONG',

    'playlistSummary.title': 'PLAYLIST COMPLETE',
  };

  STRINGS.cs = {
    'common.back': 'ZPĚT',
    'common.mainMenu': 'HLAVNÍ MENU',
    'common.controllerConnected': 'OVLADAČ PŘIPOJEN',
    'common.themeUnlocked': 'TÉMA ODEMČENO',
    'common.on': 'ZAPNUTO',

    'start.subtitle': 'rytmická hra pro vaše uši',
    'start.tutorial': 'JAK HRÁT',
    'start.uploadSong': 'NAHRÁT PÍSEŇ',
    'start.pasteLink': 'YOUTUBE / SPOTIFY LINK',
    'start.uploadPlaylist': 'NAHRÁT PLAYLIST',
    'start.endless': 'ENDLESS',
    'start.passPlay': 'PODEJ A HRAJ',
    'start.enterChallenge': 'ZADAT KÓD VÝZVY',
    'start.leaderboards': 'ŽEBŘÍČKY',
    'start.achievements': 'ÚSPĚCHY',
    'start.stats': 'STATISTIKY',
    'start.cosmetics': 'VZHLED',
    'start.library': 'KNIHOVNA PÍSNÍ',
    'start.publicLibrary': 'VEŘEJNÁ KNIHOVNA',
    'start.settings': 'NASTAVENÍ',

    'help.title': 'KDE SEHNAT HUDBU?',
    'help.intro': 'ONE DOT funguje s jakýmkoli místním audio souborem (MP3, WAV, OGG) na vašem zařízení. Zde je pár skvělých legálních způsobů, jak najít hudbu ke hraní:',
    'help.li1': '<b>Knihovny bez licenčních poplatků</b> &mdash; stránky jako Free Music Archive nebo Pixabay Music nabízejí skladby, které si můžete stáhnout a volně používat.',
    'help.li2': '<b>Vaše vlastní zakoupená hudba</b> &mdash; jakékoli MP3 bez DRM, které jste si koupili, funguje skvěle.',
    'help.li3': '<b>Vaše vlastní nahrávky</b> &mdash; broukání, beatbox nebo kapelové nahrávky tvoří zábavné, nepředvídatelné úrovně!',
    'help.outro': 'Jakmile máte soubor na svém zařízení, jen klepněte na <b>NAHRÁT PÍSEŇ</b> a vyberte ho.',

    'settings.title': 'NASTAVENÍ',
    'settings.latency': 'Posun zvukového zpoždění:',
    'settings.haptics': 'Vibrace',
    'settings.hapticsOff': 'VYPNUTO',
    'settings.hapticsTaps': 'JEN ÚHOZY',
    'settings.hapticsFull': 'PLNÝ RYTMUS',
    'settings.replay': 'Okamžité ukládání replayů',
    'settings.debugLog': 'Log chyb (zobrazit detaily pádu na obrazovce)',
    'settings.tapSound': 'Zvuk úhozu (perfektní zásahy)',
    'settings.tapHihat': 'HI-HAT',
    'settings.tapClap': 'CLAP',
    'settings.tap808': '808',
    'settings.tapLaser': 'LASER',
    'settings.preview': 'UKÁZKA',
    'settings.rhythmGuide': 'Rytmický metronom (tichý klik na každou dobu)',
    'settings.guideAuto': 'AUTO (první 3 hry)',
    'settings.playerName': 'Jméno hráče (zobrazeno ve veřejných žebříčcích)',
    'settings.playerNamePlaceholder': 'HRAC1234',
    'settings.rhythmFocus': 'Rytmické zaměření:',
    'settings.rhythmFocusHint': 'Vyšší = míček více sleduje vokály/melodii; nižší = více sleduje bicí/basu. Platí jen pro nové písně - znovu nahrajte píseň, kterou jste už analyzovali.',
    'settings.syncTestHint': 'SYNC TEST přehrává konstantní klikací stopu o 120 BPM. Pokud se vaše údery do kliků zdají brzké/pozdní, upravte výše Posun zvukového zpoždění. Pokud se překážky postupem času vizuálně rozcházejí s rytmem, jde o chybu časování.',
    'settings.syncTest': 'SYNC TEST (120 BPM)',
    'settings.language': 'Jazyk',

    'vocal.drumsOnly': 'JEN BICÍ',
    'vocal.mostlyDrums': 'VÍCE BICÍ',
    'vocal.balanced': 'VYVÁŽENO',
    'vocal.mostlyVocals': 'VÍCE VOKÁLY',
    'vocal.vocalsOnly': 'JEN VOKÁLY',

    'debug.title': 'LOG CHYB',
    'debug.clear': 'VYČISTIT',

    'analyzing.title': 'ANALYZUJI ZVUK...',
    'analyzing.loadedFromLibrary': 'NAČTENO Z KNIHOVNY',
    'analyzing.downloadingSong': 'STAHOVÁNÍ PÍSNĚ...',
    'analyzing.preparingTutorial': 'PŘÍPRAVA TUTORIÁLU...',
    'analyzing.lessonBounce': 'LEKCE: SKÁKEJ DO RYTMU',
    'analyzing.preparingSyncTest': 'PŘÍPRAVA SYNCHRONIZAČNÍHO TESTU...',
    'analyzing.clickTrack120': 'METRONOM 120 BPM',
    'analyzing.regeneratingLevel': 'REGENERACE ÚROVNĚ...',

    'result.title': 'TRASA PŘIPRAVENA',
    'result.song': 'PÍSEŇ',
    'result.bpm': 'BPM',
    'result.length': 'DÉLKA',
    'result.beats': 'DOBY',
    'result.intensity': 'INTENZITA',
    'result.weakWarning': 'Detekována slabá doba — tato píseň nemusí hrát dobře. Zkuste BEAT TUNER a upravte detekci.',
    'legend.drop': 'DROP',
    'legend.build': 'BUILD',
    'legend.chill': 'CHILL',
    'legend.checkpoint': 'CHECKPOINT',
    'legend.vocalDensity': 'HUSTOTA VOKÁLŮ',
    'result.publish': 'Publikovat tuto píseň + úroveň, aby ji mohli hrát ostatní hráči ve veřejném žebříčku',
    'result.publishTitlePlaceholder': 'NÁZEV ÚROVNĚ',
    'result.publishBtn': 'PUBLIKOVAT DO VEŘEJNÉ KNIHOVNY',
    'result.continue': 'POKRAČOVAT',

    'tuner.title': 'BEAT TUNER',
    'tuner.bassLabel': 'BAS &rarr; HROTY',
    'tuner.test': 'TEST',
    'tuner.sensitivity': 'Citlivost:',
    'tuner.minSpacing': 'Min. odstup:',
    'tuner.preview': 'UKÁZKA (10s)',
    'tuner.regenerate': 'PŘEGENEROVAT ÚROVEŇ',
    'tuner.legendWave': 'ZVUKOVÁ STOPA',
    'tuner.legendGrid': 'MŘÍŽKA RYTMU',
    'tuner.legendHits': 'PŘEKÁŽKY',

    'modifiers.title': 'MODIFIKÁTORY',
    'modifiers.total': 'CELKEM:',
    'modifiers.start': 'START',

    'pass.readyQ': 'PŘIPRAVEN?',
    'pass.getReady': 'PŘIPRAVTE SE!',
    'pass.yourTurn': 'TVOJE KOLO!',
    'pass.continue': 'KLEPNUTÍM POKRAČUJTE',
    'pass.passTo': 'PODEJ TELEFON: {name}',

    'hud.timeRemaining': 'zbývá {time}',
    'hud.replayToast': '50+ PERFEKTNÍCH V ŘADĚ ZACHYCENO!',
    'hud.saveReplay': 'ULOŽIT REPLAY',

    'pause.title': 'PAUZA',
    'pause.resume': 'POKRAČOVAT',
    'pause.restartCheckpoint': 'RESTART OD CHECKPOINTU',
    'pause.quit': 'ODEJÍT DO MENU',

    'practice.title': 'REŽIM TRÉNINKU',
    'practice.info': 'Opakuje se úsek kolem vašeho posledního zásahu rychlostí 0.6x',
    'practice.exit': 'OPUSTIT TRÉNINK',
    'practice.passes': 'PRŮCHODY: {n} / 3',

    'complete.songComplete': 'PÍSEŇ DOKONČENA',
    'complete.gameOver': 'KONEC HRY',
    'leaderboard.global': 'GLOBÁLNÍ ŽEBŘÍČEK',
    'leaderboard.yourName': 'VAŠE JMÉNO',
    'complete.share': 'SDÍLET KARTU SKÓRE',
    'complete.challenge': 'VÝZVA',
    'complete.practice': 'TRÉNINK',
    'complete.playAgain': 'HRÁT ZNOVU',

    'endless.runOver': 'BĚH SKONČIL',
    'endless.retry': 'ZNOVU',

    'multiplayer.results': 'VÝSLEDKY',

    'cosmetics.title': 'VZHLED',
    'cosmetics.theme': 'TÉMA',
    'cosmetics.skin': 'SKIN MÍČKU',
    'cosmetics.trail': 'STOPA',

    'achievements.title': 'ÚSPĚCHY',

    'stats.title': 'STATISTIKY',

    'leaderboards.title': 'ŽEBŘÍČKY',

    'library.title': 'KNIHOVNA PÍSNÍ',
    'library.hint': 'Uložená analýza pro písně, které jste hráli. Znovu nahrajte stejný soubor a analýza se přeskočí okamžitě.',

    'publicLibrary.title': 'VEŘEJNÁ KNIHOVNA',
    'publicLibrary.hint': 'Písně a úrovně publikované ostatními hráči. Klepnutím na PLAY je stáhnete a zahrajete - vaše skóre se zapíše do globálního žebříčku.',
    'publicLibrary.searchPlaceholder': 'HLEDAT NÁZEV / AUTORA',
    'publicLibrary.sortNewest': 'NEJNOVĚJŠÍ',
    'publicLibrary.sortPlayed': 'NEJHRANĚJŠÍ',
    'publicLibrary.sortRating': 'NEJLÉPE HODNOCENÉ',
    'publicLibrary.sortBpmAsc': 'BPM VZESTUPNĚ',
    'publicLibrary.sortBpmDesc': 'BPM SESTUPNĚ',
    'publicLibrary.minBpmPlaceholder': 'MIN BPM',
    'publicLibrary.maxBpmPlaceholder': 'MAX BPM',

    'challenge.title': 'ZADAT KÓD VÝZVY',
    'challenge.placeholder': 'např. 3F9K2-A1B2C-12345',
    'challenge.submit': 'NAHRÁT ODPOVÍDAJÍCÍ PÍSEŇ',

    'link.title': 'VLOŽIT ODKAZ',
    'link.placeholder': 'Vložte YouTube nebo Spotify odkaz...',
    'link.play': 'HRÁT',
    'link.downloading': 'STAHOVÁNÍ...',
    'link.desktopOnly': 'Nepodporovaný odkaz. Zkus YouTube nebo Spotify link.',

    'multiSelect.title': 'VYBRAT PÍSNĚ',
    'multiSelect.info': 'Vyberte 2 nebo více audio souborů',
    'multiSelect.chooseFiles': 'VYBRAT SOUBORY',
    'multiSelect.continue': 'POKRAČOVAT',
    'multiSelect.endlessTitle': 'ENDLESS REŽIM',
    'multiSelect.endlessInfo': 'Vyberte 2 nebo více audio souborů - budou hrát jeden po druhém',
    'multiSelect.playlistTitle': 'AUTO-DJ PLAYLIST',
    'multiSelect.playlistInfo': 'Vyberte písně, které se budou hrát jedna po druhé s prolínáním',

    'passSetup.title': 'NASTAVENÍ PODEJ A HRAJ',
    'passSetup.addPlayer': 'PŘIDAT HRÁČE',
    'passSetup.chooseSong': 'VYBRAT PÍSEŇ',

    'playlistSummary.title': 'PLAYLIST DOKONČEN',
  };

  STRINGS.ru = {
    'common.back': 'НАЗАД',
    'common.mainMenu': 'ГЛАВНОЕ МЕНЮ',
    'common.controllerConnected': 'КОНТРОЛЛЕР ПОДКЛЮЧЁН',
    'common.themeUnlocked': 'ТЕМА РАЗБЛОКИРОВАНА',
    'common.on': 'ВКЛ',

    'start.subtitle': 'ритм-игра для ваших ушей',
    'start.tutorial': 'КАК ИГРАТЬ',
    'start.uploadSong': 'ЗАГРУЗИТЬ ПЕСНЮ',
    'start.pasteLink': 'YOUTUBE / SPOTIFY ССЫЛКА',
    'start.uploadPlaylist': 'ЗАГРУЗИТЬ ПЛЕЙЛИСТ',
    'start.endless': 'БЕСКОНЕЧНЫЙ',
    'start.passPlay': 'ПЕРЕДАЙ И ИГРАЙ',
    'start.enterChallenge': 'ВВЕСТИ КОД ВЫЗОВА',
    'start.leaderboards': 'ТАБЛИЦЫ ЛИДЕРОВ',
    'start.achievements': 'ДОСТИЖЕНИЯ',
    'start.stats': 'СТАТИСТИКА',
    'start.cosmetics': 'КОСМЕТИКА',
    'start.library': 'БИБЛИОТЕКА ПЕСЕН',
    'start.publicLibrary': 'ПУБЛИЧНАЯ БИБЛИОТЕКА',
    'start.settings': 'НАСТРОЙКИ',

    'help.title': 'ГДЕ ВЗЯТЬ МУЗЫКУ?',
    'help.intro': 'ONE DOT работает с любым локальным аудиофайлом (MP3, WAV, OGG) на вашем устройстве. Вот несколько отличных легальных способов найти музыку для игры:',
    'help.li1': '<b>Бесплатные библиотеки</b> &mdash; такие сайты, как Free Music Archive или Pixabay Music, предлагают треки, которые можно скачать и свободно использовать.',
    'help.li2': '<b>Ваша собственная купленная музыка</b> &mdash; любые MP3 без DRM, которые вы купили, отлично подойдут.',
    'help.li3': '<b>Ваши собственные записи</b> &mdash; пение, битбокс или записи группы создают весёлые, непредсказуемые уровни!',
    'help.outro': 'Когда файл будет на вашем устройстве, просто нажмите <b>ЗАГРУЗИТЬ ПЕСНЮ</b> и выберите его.',

    'settings.title': 'НАСТРОЙКИ',
    'settings.latency': 'Смещение задержки звука:',
    'settings.haptics': 'Вибрация',
    'settings.hapticsOff': 'ВЫКЛ',
    'settings.hapticsTaps': 'ТОЛЬКО УДАРЫ',
    'settings.hapticsFull': 'ПОЛНЫЙ РИТМ',
    'settings.replay': 'Мгновенная запись повтора',
    'settings.debugLog': 'Журнал ошибок (показывать детали сбоя на экране)',
    'settings.tapSound': 'Звук удара (идеальные попадания)',
    'settings.tapHihat': 'HI-HAT',
    'settings.tapClap': 'CLAP',
    'settings.tap808': '808',
    'settings.tapLaser': 'LASER',
    'settings.preview': 'ПРЕВЬЮ',
    'settings.rhythmGuide': 'Ритм-гид (тихий щелчок на каждую долю)',
    'settings.guideAuto': 'АВТО (первые 3 игры)',
    'settings.playerName': 'Имя игрока (отображается в таблицах публичной библиотеки)',
    'settings.playerNamePlaceholder': 'ИГРОК1234',
    'settings.rhythmFocus': 'Ритмический фокус:',
    'settings.rhythmFocusHint': 'Выше = мяч больше следует за вокалом/мелодией; ниже = больше за барабанами/басом. Только для новых песен - загрузите заново уже проанализированную песню, чтобы применить.',
    'settings.syncTestHint': 'SYNC TEST воспроизводит постоянный клик-трек 120 BPM. Если ваши удары по щелчкам кажутся раньше/позже, отрегулируйте смещение задержки выше. Если препятствия визуально расходятся с ритмом со временем, это ошибка тайминга.',
    'settings.syncTest': 'SYNC TEST (120 BPM)',
    'settings.language': 'Язык',

    'vocal.drumsOnly': 'ТОЛЬКО БАРАБАНЫ',
    'vocal.mostlyDrums': 'БОЛЬШЕ БАРАБАНОВ',
    'vocal.balanced': 'СБАЛАНСИРОВАНО',
    'vocal.mostlyVocals': 'БОЛЬШЕ ВОКАЛА',
    'vocal.vocalsOnly': 'ТОЛЬКО ВОКАЛ',

    'debug.title': 'ЖУРНАЛ ОШИБОК',
    'debug.clear': 'ОЧИСТИТЬ',

    'analyzing.title': 'АНАЛИЗ АУДИО...',
    'analyzing.loadedFromLibrary': 'ЗАГРУЖЕНО ИЗ БИБЛИОТЕКИ',
    'analyzing.downloadingSong': 'ЗАГРУЗКА ПЕСНИ...',
    'analyzing.preparingTutorial': 'ПОДГОТОВКА ОБУЧЕНИЯ...',
    'analyzing.lessonBounce': 'УРОК: ПРЫГАЙ В РИТМ',
    'analyzing.preparingSyncTest': 'ПОДГОТОВКА ТЕСТА СИНХРОНИЗАЦИИ...',
    'analyzing.clickTrack120': 'МЕТРОНОМ 120 BPM',
    'analyzing.regeneratingLevel': 'ПЕРЕГЕНЕРАЦИЯ УРОВНЯ...',

    'result.title': 'ТРЕК ГОТОВ',
    'result.song': 'ПЕСНЯ',
    'result.bpm': 'BPM',
    'result.length': 'ДЛИНА',
    'result.beats': 'ДОЛИ',
    'result.intensity': 'ИНТЕНСИВНОСТЬ',
    'result.weakWarning': 'Обнаружена слабая доля — эта песня может играться не очень хорошо. Попробуйте BEAT TUNER, чтобы настроить детекцию.',
    'legend.drop': 'DROP',
    'legend.build': 'BUILD',
    'legend.chill': 'CHILL',
    'legend.checkpoint': 'ЧЕКПОИНТ',
    'legend.vocalDensity': 'ПЛОТНОСТЬ ВОКАЛА',
    'result.publish': 'Опубликовать эту песню + уровень, чтобы другие игроки могли сыграть её в таблице публичной библиотеки',
    'result.publishTitlePlaceholder': 'НАЗВАНИЕ УРОВНЯ',
    'result.publishBtn': 'ОПУБЛИКОВАТЬ В ПУБЛИЧНУЮ БИБЛИОТЕКУ',
    'result.continue': 'ДАЛЕЕ',

    'tuner.title': 'BEAT TUNER',
    'tuner.bassLabel': 'БАС &rarr; ШИПЫ',
    'tuner.test': 'ТЕСТ',
    'tuner.sensitivity': 'Чувствительность:',
    'tuner.minSpacing': 'Мин. интервал:',
    'tuner.preview': 'ПРЕВЬЮ (10с)',
    'tuner.regenerate': 'ПЕРЕГЕНЕРИРОВАТЬ УРОВЕНЬ',
    'tuner.legendWave': 'ВОЛНОВАЯ ФОРМА',
    'tuner.legendGrid': 'СЕТКА РИТМА',
    'tuner.legendHits': 'ПРЕПЯТСТВИЯ',

    'modifiers.title': 'МОДИФИКАТОРЫ',
    'modifiers.total': 'ИТОГО:',
    'modifiers.start': 'СТАРТ',

    'pass.readyQ': 'ГОТОВЫ?',
    'pass.getReady': 'ПРИГОТОВЬТЕСЬ!',
    'pass.yourTurn': 'ВАШ ХОД!',
    'pass.continue': 'НАЖМИТЕ, ЧТОБЫ ПРОДОЛЖИТЬ',
    'pass.passTo': 'ПЕРЕДАЙТЕ ТЕЛЕФОН: {name}',

    'hud.timeRemaining': 'осталось {time}',
    'hud.replayToast': 'ЗАПИСАНА СЕРИЯ 50+ ИДЕАЛЬНЫХ!',
    'hud.saveReplay': 'СОХРАНИТЬ ПОВТОР',

    'pause.title': 'ПАУЗА',
    'pause.resume': 'ПРОДОЛЖИТЬ',
    'pause.restartCheckpoint': 'НАЧАТЬ С ЧЕКПОИНТА',
    'pause.quit': 'ВЫЙТИ В МЕНЮ',

    'practice.title': 'РЕЖИМ ТРЕНИРОВКИ',
    'practice.info': 'Повтор участка вокруг последнего удара на скорости 0.6x',
    'practice.exit': 'ВЫЙТИ ИЗ ТРЕНИРОВКИ',
    'practice.passes': 'ПОПЫТКИ: {n} / 3',

    'complete.songComplete': 'ПЕСНЯ ЗАВЕРШЕНА',
    'complete.gameOver': 'ИГРА ОКОНЧЕНА',
    'leaderboard.global': 'ГЛОБАЛЬНАЯ ТАБЛИЦА ЛИДЕРОВ',
    'leaderboard.yourName': 'ВАШЕ ИМЯ',
    'complete.share': 'ПОДЕЛИТЬСЯ КАРТОЧКОЙ',
    'complete.challenge': 'ВЫЗОВ',
    'complete.practice': 'ТРЕНИРОВКА',
    'complete.playAgain': 'ИГРАТЬ СНОВА',

    'endless.runOver': 'ЗАБЕГ ОКОНЧЕН',
    'endless.retry': 'ПОВТОРИТЬ',

    'multiplayer.results': 'РЕЗУЛЬТАТЫ',

    'cosmetics.title': 'КОСМЕТИКА',
    'cosmetics.theme': 'ТЕМА',
    'cosmetics.skin': 'СКИН ШАРИКА',
    'cosmetics.trail': 'СЛЕД',

    'achievements.title': 'ДОСТИЖЕНИЯ',

    'stats.title': 'СТАТИСТИКА',

    'leaderboards.title': 'ТАБЛИЦЫ ЛИДЕРОВ',

    'library.title': 'БИБЛИОТЕКА ПЕСЕН',
    'library.hint': 'Сохранённый анализ для песен, в которые вы играли. Загрузите тот же файл снова, и анализ будет пропущен мгновенно.',

    'publicLibrary.title': 'ПУБЛИЧНАЯ БИБЛИОТЕКА',
    'publicLibrary.hint': 'Песни и уровни, опубликованные другими игроками. Нажмите PLAY, чтобы скачать и сыграть - ваш результат попадёт в его глобальную таблицу лидеров.',
    'publicLibrary.searchPlaceholder': 'ПОИСК ПО НАЗВАНИЮ / АВТОРУ',
    'publicLibrary.sortNewest': 'НОВЫЕ',
    'publicLibrary.sortPlayed': 'ПОПУЛЯРНЫЕ',
    'publicLibrary.sortRating': 'ЛУЧШИЕ',
    'publicLibrary.sortBpmAsc': 'BPM ПО ВОЗР.',
    'publicLibrary.sortBpmDesc': 'BPM ПО УБЫВ.',
    'publicLibrary.minBpmPlaceholder': 'МИН BPM',
    'publicLibrary.maxBpmPlaceholder': 'МАКС BPM',

    'challenge.title': 'ВВЕСТИ КОД ВЫЗОВА',
    'challenge.placeholder': 'напр. 3F9K2-A1B2C-12345',
    'challenge.submit': 'ЗАГРУЗИТЬ ПОДХОДЯЩУЮ ПЕСНЮ',

    'link.title': 'ВСТАВИТЬ ССЫЛКУ',
    'link.placeholder': 'Вставьте ссылку YouTube или Spotify...',
    'link.play': 'ИГРАТЬ',
    'link.downloading': 'ЗАГРУЗКА...',
    'link.desktopOnly': 'Неподдерживаемая ссылка. Используйте YouTube или Spotify.',

    'multiSelect.title': 'ВЫБРАТЬ ПЕСНИ',
    'multiSelect.info': 'Выберите 2 или более аудиофайлов',
    'multiSelect.chooseFiles': 'ВЫБРАТЬ ФАЙЛЫ',
    'multiSelect.continue': 'ДАЛЕЕ',
    'multiSelect.endlessTitle': 'БЕСКОНЕЧНЫЙ РЕЖИМ',
    'multiSelect.endlessInfo': 'Выберите 2 или более аудиофайлов - они будут играть один за другим',
    'multiSelect.playlistTitle': 'AUTO-DJ ПЛЕЙЛИСТ',
    'multiSelect.playlistInfo': 'Выберите песни, которые будут играть одна за другой с переходами',

    'passSetup.title': 'НАСТРОЙКА ПЕРЕДАЙ И ИГРАЙ',
    'passSetup.addPlayer': 'ДОБАВИТЬ ИГРОКА',
    'passSetup.chooseSong': 'ВЫБРАТЬ ПЕСНЮ',

    'playlistSummary.title': 'ПЛЕЙЛИСТ ЗАВЕРШЁН',
  };

  STRINGS.de = {
    'common.back': 'ZURÜCK',
    'common.mainMenu': 'HAUPTMENÜ',
    'common.controllerConnected': 'CONTROLLER VERBUNDEN',
    'common.themeUnlocked': 'DESIGN FREIGESCHALTET',
    'common.on': 'AN',

    'start.subtitle': 'ein Rhythmusspiel für deine Ohren',
    'start.tutorial': 'SO WIRD GESPIELT',
    'start.uploadSong': 'SONG HOCHLADEN',
    'start.pasteLink': 'YOUTUBE / SPOTIFY LINK',
    'start.uploadPlaylist': 'PLAYLIST HOCHLADEN',
    'start.endless': 'ENDLOS',
    'start.passPlay': 'WEITERGEBEN & SPIELEN',
    'start.enterChallenge': 'HERAUSFORDERUNGSCODE EINGEBEN',
    'start.leaderboards': 'BESTENLISTEN',
    'start.achievements': 'ERFOLGE',
    'start.stats': 'STATISTIKEN',
    'start.cosmetics': 'KOSMETIK',
    'start.library': 'SONG-BIBLIOTHEK',
    'start.publicLibrary': 'ÖFFENTLICHE BIBLIOTHEK',
    'start.settings': 'EINSTELLUNGEN',

    'help.title': 'WOHER BEKOMME ICH MUSIK?',
    'help.intro': 'ONE DOT funktioniert mit jeder lokalen Audiodatei (MP3, WAV, OGG) auf deinem Gerät. Hier sind ein paar großartige legale Wege, Musik zum Spielen zu finden:',
    'help.li1': '<b>Lizenzfreie Bibliotheken</b> &mdash; Seiten wie Free Music Archive oder Pixabay Music bieten Tracks zum kostenlosen Download und freier Nutzung.',
    'help.li2': '<b>Deine eigene gekaufte Musik</b> &mdash; jede DRM-freie MP3, die du gekauft hast, funktioniert hervorragend.',
    'help.li3': '<b>Deine eigenen Aufnahmen</b> &mdash; Summen, Beatboxing oder Bandaufnahmen ergeben lustige, unvorhersehbare Level!',
    'help.outro': 'Sobald eine Datei auf deinem Gerät ist, tippe einfach auf <b>SONG HOCHLADEN</b> und wähle sie aus.',

    'settings.title': 'EINSTELLUNGEN',
    'settings.latency': 'Audio-Latenzversatz:',
    'settings.haptics': 'Vibration',
    'settings.hapticsOff': 'AUS',
    'settings.hapticsTaps': 'NUR TAPS',
    'settings.hapticsFull': 'VOLLER RHYTHMUS',
    'settings.replay': 'Sofortige Wiederholungsaufnahme',
    'settings.debugLog': 'Debug-Log (Absturzdetails auf dem Bildschirm anzeigen)',
    'settings.tapSound': 'Tap-Sound (perfekte Treffer)',
    'settings.tapHihat': 'HI-HAT',
    'settings.tapClap': 'CLAP',
    'settings.tap808': '808',
    'settings.tapLaser': 'LASER',
    'settings.preview': 'VORSCHAU',
    'settings.rhythmGuide': 'Rhythmus-Guide (leiser Klick bei jedem Beat)',
    'settings.guideAuto': 'AUTO (erste 3 Durchgänge)',
    'settings.playerName': 'Spielername (in Bestenlisten der Öffentlichen Bibliothek angezeigt)',
    'settings.playerNamePlaceholder': 'SPIELER1234',
    'settings.rhythmFocus': 'Rhythmus-Fokus:',
    'settings.rhythmFocusHint': 'Höher = der Ball folgt mehr Gesang/Melodie; niedriger = mehr Drums/Bass. Gilt nur für neue Songs - bereits analysierte Songs erneut hochladen, um es anzuwenden.',
    'settings.syncTestHint': 'SYNC TEST spielt einen konstanten 120-BPM-Klicktrack. Wenn sich deine Taps zu den Klicks früh/spät anfühlen, passe den Latenzversatz oben an. Wenn die Hindernisse sich mit der Zeit visuell vom Beat entfernen, ist das ein Timing-Fehler.',
    'settings.syncTest': 'SYNC TEST (120 BPM)',
    'settings.language': 'Sprache',

    'vocal.drumsOnly': 'NUR DRUMS',
    'vocal.mostlyDrums': 'ÜBERWIEGEND DRUMS',
    'vocal.balanced': 'AUSGEWOGEN',
    'vocal.mostlyVocals': 'ÜBERWIEGEND GESANG',
    'vocal.vocalsOnly': 'NUR GESANG',

    'debug.title': 'DEBUG-LOG',
    'debug.clear': 'LÖSCHEN',

    'analyzing.title': 'AUDIO WIRD ANALYSIERT...',
    'analyzing.loadedFromLibrary': 'AUS BIBLIOTHEK GELADEN',
    'analyzing.downloadingSong': 'SONG WIRD HERUNTERGELADEN...',
    'analyzing.preparingTutorial': 'TUTORIAL WIRD VORBEREITET...',
    'analyzing.lessonBounce': 'LEKTION: HÜPFE IM TAKT',
    'analyzing.preparingSyncTest': 'SYNC-TEST WIRD VORBEREITET...',
    'analyzing.clickTrack120': '120 BPM KLICKSPUR',
    'analyzing.regeneratingLevel': 'LEVEL WIRD NEU GENERIERT...',

    'result.title': 'TRACK BEREIT',
    'result.song': 'SONG',
    'result.bpm': 'BPM',
    'result.length': 'LÄNGE',
    'result.beats': 'BEATS',
    'result.intensity': 'INTENSITÄT',
    'result.weakWarning': 'Schwacher Beat erkannt — dieser Song spielt sich vielleicht nicht gut. Versuche den BEAT TUNER, um die Erkennung anzupassen.',
    'legend.drop': 'DROP',
    'legend.build': 'BUILD',
    'legend.chill': 'CHILL',
    'legend.checkpoint': 'CHECKPOINT',
    'legend.vocalDensity': 'GESANGSDICHTE',
    'result.publish': 'Diesen Song + Level veröffentlichen, damit andere Spieler ihn in der Bestenliste der Öffentlichen Bibliothek spielen können',
    'result.publishTitlePlaceholder': 'LEVEL-TITEL',
    'result.publishBtn': 'IN ÖFFENTLICHE BIBLIOTHEK VERÖFFENTLICHEN',
    'result.continue': 'WEITER',

    'tuner.title': 'BEAT TUNER',
    'tuner.bassLabel': 'BASS &rarr; SPIKES',
    'tuner.test': 'TEST',
    'tuner.sensitivity': 'Empfindlichkeit:',
    'tuner.minSpacing': 'Min. Abstand:',
    'tuner.preview': 'VORSCHAU (10s)',
    'tuner.regenerate': 'LEVEL NEU GENERIEREN',
    'tuner.legendWave': 'WELLENFORM',
    'tuner.legendGrid': 'BEAT-RASTER',
    'tuner.legendHits': 'HINDERNISSE',

    'modifiers.title': 'MODIFIKATOREN',
    'modifiers.total': 'GESAMT:',
    'modifiers.start': 'START',

    'pass.readyQ': 'BEREIT?',
    'pass.getReady': 'MACH DICH BEREIT!',
    'pass.yourTurn': 'DU BIST DRAN!',
    'pass.continue': 'ZUM FORTFAHREN TIPPEN',
    'pass.passTo': 'WEITERGEBEN AN {name}',

    'hud.timeRemaining': 'noch {time}',
    'hud.replayToast': '50+ PERFECT-SERIE AUFGEZEICHNET!',
    'hud.saveReplay': 'REPLAY SPEICHERN',

    'pause.title': 'PAUSE',
    'pause.resume': 'FORTSETZEN',
    'pause.restartCheckpoint': 'VOM CHECKPOINT NEU STARTEN',
    'pause.quit': 'ZUM MENÜ',

    'practice.title': 'ÜBUNGSMODUS',
    'practice.info': 'Wiederholt den Abschnitt um deinen letzten Treffer mit 0.6x Geschwindigkeit',
    'practice.exit': 'ÜBUNG BEENDEN',
    'practice.passes': 'DURCHGÄNGE: {n} / 3',

    'complete.songComplete': 'SONG ABGESCHLOSSEN',
    'complete.gameOver': 'GAME OVER',
    'leaderboard.global': 'GLOBALE BESTENLISTE',
    'leaderboard.yourName': 'DEIN NAME',
    'complete.share': 'ERGEBNISKARTE TEILEN',
    'complete.challenge': 'HERAUSFORDERUNG',
    'complete.practice': 'ÜBEN',
    'complete.playAgain': 'NOCHMAL SPIELEN',

    'endless.runOver': 'RUN BEENDET',
    'endless.retry': 'WIEDERHOLEN',

    'multiplayer.results': 'ERGEBNISSE',

    'cosmetics.title': 'KOSMETIK',
    'cosmetics.theme': 'DESIGN',
    'cosmetics.skin': 'BALL-SKIN',
    'cosmetics.trail': 'TRAIL',

    'achievements.title': 'ERFOLGE',

    'stats.title': 'STATISTIKEN',

    'leaderboards.title': 'BESTENLISTEN',

    'library.title': 'SONG-BIBLIOTHEK',
    'library.hint': 'Zwischengespeicherte Analyse für gespielte Songs. Lade dieselbe Datei erneut hoch, und die Analyse wird sofort übersprungen.',

    'publicLibrary.title': 'ÖFFENTLICHE BIBLIOTHEK',
    'publicLibrary.hint': 'Songs und Level, die von anderen Spielern veröffentlicht wurden. Tippe auf PLAY, um eines herunterzuladen und zu spielen - dein Ergebnis erscheint in der globalen Bestenliste.',
    'publicLibrary.searchPlaceholder': 'TITEL / AUTOR SUCHEN',
    'publicLibrary.sortNewest': 'NEUESTE',
    'publicLibrary.sortPlayed': 'MEISTGESPIELT',
    'publicLibrary.sortRating': 'TOP BEWERTET',
    'publicLibrary.sortBpmAsc': 'BPM AUFSTEIGEND',
    'publicLibrary.sortBpmDesc': 'BPM ABSTEIGEND',
    'publicLibrary.minBpmPlaceholder': 'MIN BPM',
    'publicLibrary.maxBpmPlaceholder': 'MAX BPM',

    'challenge.title': 'HERAUSFORDERUNGSCODE EINGEBEN',
    'challenge.placeholder': 'z. B. 3F9K2-A1B2C-12345',
    'challenge.submit': 'PASSENDEN SONG HOCHLADEN',

    'link.title': 'LINK EINFÜGEN',
    'link.placeholder': 'YouTube- oder Spotify-Link einfügen...',
    'link.play': 'SPIELEN',
    'link.downloading': 'HERUNTERLADEN...',
    'link.desktopOnly': 'Nicht unterstützter Link. Versuche einen YouTube- oder Spotify-Link.',

    'multiSelect.title': 'SONGS AUSWÄHLEN',
    'multiSelect.info': 'Wähle 2 oder mehr Audiodateien',
    'multiSelect.chooseFiles': 'DATEIEN AUSWÄHLEN',
    'multiSelect.continue': 'WEITER',
    'multiSelect.endlessTitle': 'ENDLOS-MODUS',
    'multiSelect.endlessInfo': 'Wähle 2 oder mehr Audiodateien - sie werden hintereinander abgespielt',
    'multiSelect.playlistTitle': 'AUTO-DJ PLAYLIST',
    'multiSelect.playlistInfo': 'Wähle Songs, die mit Überblendungen hintereinander abgespielt werden',

    'passSetup.title': 'WEITERGEBEN & SPIELEN EINRICHTEN',
    'passSetup.addPlayer': 'SPIELER HINZUFÜGEN',
    'passSetup.chooseSong': 'SONG WÄHLEN',

    'playlistSummary.title': 'PLAYLIST ABGESCHLOSSEN',
  };

  STRINGS.es = {
    'common.back': 'ATRÁS',
    'common.mainMenu': 'MENÚ PRINCIPAL',
    'common.controllerConnected': 'MANDO CONECTADO',
    'common.themeUnlocked': 'TEMA DESBLOQUEADO',
    'common.on': 'ACTIVADO',

    'start.subtitle': 'un juego de ritmo para tus oídos',
    'start.tutorial': 'CÓMO JUGAR',
    'start.uploadSong': 'SUBIR CANCIÓN',
    'start.pasteLink': 'ENLACE YOUTUBE / SPOTIFY',
    'start.uploadPlaylist': 'SUBIR PLAYLIST',
    'start.endless': 'SIN FIN',
    'start.passPlay': 'PASAR Y JUGAR',
    'start.enterChallenge': 'INTRODUCIR CÓDIGO DE RETO',
    'start.leaderboards': 'CLASIFICACIONES',
    'start.achievements': 'LOGROS',
    'start.stats': 'ESTADÍSTICAS',
    'start.cosmetics': 'COSMÉTICOS',
    'start.library': 'BIBLIOTECA DE CANCIONES',
    'start.publicLibrary': 'BIBLIOTECA PÚBLICA',
    'start.settings': 'AJUSTES',

    'help.title': '¿DÓNDE CONSEGUIR MÚSICA?',
    'help.intro': 'ONE DOT funciona con cualquier archivo de audio local (MP3, WAV, OGG) en tu dispositivo. Aquí tienes algunas formas legales geniales de encontrar música para jugar:',
    'help.li1': '<b>Bibliotecas libres de regalías</b> &mdash; sitios como Free Music Archive o Pixabay Music ofrecen pistas que puedes descargar y usar libremente.',
    'help.li2': '<b>Tu propia música comprada</b> &mdash; cualquier MP3 sin DRM que hayas comprado funciona muy bien.',
    'help.li3': '<b>Tus propias grabaciones</b> &mdash; tararear, hacer beatbox o grabaciones de banda crean niveles divertidos e impredecibles.',
    'help.outro': 'Cuando tengas un archivo en tu dispositivo, simplemente toca <b>SUBIR CANCIÓN</b> y elígelo.',

    'settings.title': 'AJUSTES',
    'settings.latency': 'Desfase de latencia de audio:',
    'settings.haptics': 'Vibración',
    'settings.hapticsOff': 'DESACTIVADO',
    'settings.hapticsTaps': 'SOLO TOQUES',
    'settings.hapticsFull': 'RITMO COMPLETO',
    'settings.replay': 'Captura instantánea de repetición',
    'settings.debugLog': 'Registro de depuración (mostrar detalles del error en pantalla)',
    'settings.tapSound': 'Sonido de toque (aciertos perfectos)',
    'settings.tapHihat': 'HI-HAT',
    'settings.tapClap': 'CLAP',
    'settings.tap808': '808',
    'settings.tapLaser': 'LASER',
    'settings.preview': 'VISTA PREVIA',
    'settings.rhythmGuide': 'Guía de ritmo (clic suave en cada tiempo)',
    'settings.guideAuto': 'AUTO (primeras 3 partidas)',
    'settings.playerName': 'Nombre de jugador (se muestra en las clasificaciones de la Biblioteca Pública)',
    'settings.playerNamePlaceholder': 'JUGADOR1234',
    'settings.rhythmFocus': 'Enfoque de ritmo:',
    'settings.rhythmFocusHint': 'Más alto = la bola sigue más la voz/melodía; más bajo = sigue más la batería/bajo. Solo para canciones nuevas - vuelve a subir una canción ya analizada para aplicarlo.',
    'settings.syncTestHint': 'SYNC TEST reproduce una pista de clics constante a 120 BPM. Si tus toques en los clics se sienten pronto/tarde, ajusta el Desfase de Latencia arriba. Si los obstáculos se desvían visualmente del ritmo con el tiempo, es un error de sincronización.',
    'settings.syncTest': 'SYNC TEST (120 BPM)',
    'settings.language': 'Idioma',

    'vocal.drumsOnly': 'SOLO BATERÍA',
    'vocal.mostlyDrums': 'MÁS BATERÍA',
    'vocal.balanced': 'EQUILIBRADO',
    'vocal.mostlyVocals': 'MÁS VOZ',
    'vocal.vocalsOnly': 'SOLO VOZ',

    'debug.title': 'REGISTRO DE DEPURACIÓN',
    'debug.clear': 'BORRAR',

    'analyzing.title': 'ANALIZANDO AUDIO...',
    'analyzing.loadedFromLibrary': 'CARGADO DESDE LA BIBLIOTECA',
    'analyzing.downloadingSong': 'DESCARGANDO CANCIÓN...',
    'analyzing.preparingTutorial': 'PREPARANDO TUTORIAL...',
    'analyzing.lessonBounce': 'LECCIÓN: SALTA AL RITMO',
    'analyzing.preparingSyncTest': 'PREPARANDO PRUEBA DE SINCRONIZACIÓN...',
    'analyzing.clickTrack120': 'PISTA DE CLIC 120 BPM',
    'analyzing.regeneratingLevel': 'REGENERANDO NIVEL...',

    'result.title': 'PISTA LISTA',
    'result.song': 'CANCIÓN',
    'result.bpm': 'BPM',
    'result.length': 'DURACIÓN',
    'result.beats': 'TIEMPOS',
    'result.intensity': 'INTENSIDAD',
    'result.weakWarning': 'Tiempo débil detectado — esta canción puede no jugarse bien. Prueba el BEAT TUNER para ajustar la detección.',
    'legend.drop': 'DROP',
    'legend.build': 'BUILD',
    'legend.chill': 'CHILL',
    'legend.checkpoint': 'PUNTO DE CONTROL',
    'legend.vocalDensity': 'DENSIDAD VOCAL',
    'result.publish': 'Publica esta canción + nivel para que otros jugadores puedan jugarla en la clasificación de la Biblioteca Pública',
    'result.publishTitlePlaceholder': 'TÍTULO DEL NIVEL',
    'result.publishBtn': 'PUBLICAR EN BIBLIOTECA PÚBLICA',
    'result.continue': 'CONTINUAR',

    'tuner.title': 'BEAT TUNER',
    'tuner.bassLabel': 'GRAVES &rarr; PICOS',
    'tuner.test': 'PROBAR',
    'tuner.sensitivity': 'Sensibilidad:',
    'tuner.minSpacing': 'Espaciado mín.:',
    'tuner.preview': 'VISTA PREVIA (10s)',
    'tuner.regenerate': 'REGENERAR NIVEL',
    'tuner.legendWave': 'FORMA DE ONDA',
    'tuner.legendGrid': 'CUADRÍCULA DE RITMO',
    'tuner.legendHits': 'OBSTÁCULOS',

    'modifiers.title': 'MODIFICADORES',
    'modifiers.total': 'TOTAL:',
    'modifiers.start': 'EMPEZAR',

    'pass.readyQ': '¿LISTO?',
    'pass.getReady': '¡PREPÁRATE!',
    'pass.yourTurn': '¡TU TURNO!',
    'pass.continue': 'TOCA PARA CONTINUAR',
    'pass.passTo': 'PASA EL TELÉFONO A {name}',

    'hud.timeRemaining': 'quedan {time}',
    'hud.replayToast': '¡RACHA DE 50+ PERFECTOS CAPTURADA!',
    'hud.saveReplay': 'GUARDAR REPETICIÓN',

    'pause.title': 'PAUSA',
    'pause.resume': 'REANUDAR',
    'pause.restartCheckpoint': 'REINICIAR DESDE PUNTO DE CONTROL',
    'pause.quit': 'SALIR AL MENÚ',

    'practice.title': 'MODO PRÁCTICA',
    'practice.info': 'Repite la sección alrededor de tu último golpe a velocidad 0.6x',
    'practice.exit': 'SALIR DE PRÁCTICA',
    'practice.passes': 'INTENTOS: {n} / 3',

    'complete.songComplete': 'CANCIÓN COMPLETADA',
    'complete.gameOver': 'FIN DEL JUEGO',
    'leaderboard.global': 'CLASIFICACIÓN GLOBAL',
    'leaderboard.yourName': 'TU NOMBRE',
    'complete.share': 'COMPARTIR TARJETA DE PUNTUACIÓN',
    'complete.challenge': 'RETO',
    'complete.practice': 'PRÁCTICA',
    'complete.playAgain': 'JUGAR DE NUEVO',

    'endless.runOver': 'PARTIDA TERMINADA',
    'endless.retry': 'REINTENTAR',

    'multiplayer.results': 'RESULTADOS',

    'cosmetics.title': 'COSMÉTICOS',
    'cosmetics.theme': 'TEMA',
    'cosmetics.skin': 'SKIN DE BOLA',
    'cosmetics.trail': 'ESTELA',

    'achievements.title': 'LOGROS',

    'stats.title': 'ESTADÍSTICAS',

    'leaderboards.title': 'CLASIFICACIONES',

    'library.title': 'BIBLIOTECA DE CANCIONES',
    'library.hint': 'Análisis guardado de canciones que has jugado. Vuelve a subir el mismo archivo y el análisis se omitirá al instante.',

    'publicLibrary.title': 'BIBLIOTECA PÚBLICA',
    'publicLibrary.hint': 'Canciones y niveles publicados por otros jugadores. Toca JUGAR para descargar uno y jugarlo - tu puntuación entra en su clasificación global.',
    'publicLibrary.searchPlaceholder': 'BUSCAR TÍTULO / AUTOR',
    'publicLibrary.sortNewest': 'MÁS RECIENTES',
    'publicLibrary.sortPlayed': 'MÁS JUGADAS',
    'publicLibrary.sortRating': 'MEJOR VALORADAS',
    'publicLibrary.sortBpmAsc': 'BPM ASCENDENTE',
    'publicLibrary.sortBpmDesc': 'BPM DESCENDENTE',
    'publicLibrary.minBpmPlaceholder': 'BPM MÍN',
    'publicLibrary.maxBpmPlaceholder': 'BPM MÁX',

    'challenge.title': 'INTRODUCIR CÓDIGO DE RETO',
    'challenge.placeholder': 'p. ej. 3F9K2-A1B2C-12345',
    'challenge.submit': 'SUBIR CANCIÓN COINCIDENTE',

    'link.title': 'PEGAR ENLACE',
    'link.placeholder': 'Pega un enlace de YouTube o Spotify...',
    'link.play': 'JUGAR',
    'link.downloading': 'DESCARGANDO...',
    'link.desktopOnly': 'Enlace no compatible. Prueba un link de YouTube o Spotify.',

    'multiSelect.title': 'SELECCIONAR CANCIONES',
    'multiSelect.info': 'Elige 2 o más archivos de audio',
    'multiSelect.chooseFiles': 'ELEGIR ARCHIVOS',
    'multiSelect.continue': 'CONTINUAR',
    'multiSelect.endlessTitle': 'MODO SIN FIN',
    'multiSelect.endlessInfo': 'Elige 2 o más archivos de audio - se reproducirán uno tras otro',
    'multiSelect.playlistTitle': 'PLAYLIST AUTO-DJ',
    'multiSelect.playlistInfo': 'Elige canciones que se reproducirán una tras otra con transiciones',

    'passSetup.title': 'CONFIGURAR PASAR Y JUGAR',
    'passSetup.addPlayer': 'AÑADIR JUGADOR',
    'passSetup.chooseSong': 'ELEGIR CANCIÓN',

    'playlistSummary.title': 'PLAYLIST COMPLETADA',
  };

  STRINGS.fr = {
    'common.back': 'RETOUR',
    'common.mainMenu': 'MENU PRINCIPAL',
    'common.controllerConnected': 'MANETTE CONNECTÉE',
    'common.themeUnlocked': 'THÈME DÉBLOQUÉ',
    'common.on': 'ACTIVÉ',

    'start.subtitle': 'un jeu de rythme pour vos oreilles',
    'start.tutorial': 'COMMENT JOUER',
    'start.uploadSong': 'IMPORTER UN MORCEAU',
    'start.pasteLink': 'LIEN YOUTUBE / SPOTIFY',
    'start.uploadPlaylist': 'IMPORTER UNE PLAYLIST',
    'start.endless': 'SANS FIN',
    'start.passPlay': 'PASSE & JOUE',
    'start.enterChallenge': 'SAISIR UN CODE DE DÉFI',
    'start.leaderboards': 'CLASSEMENTS',
    'start.achievements': 'SUCCÈS',
    'start.stats': 'STATISTIQUES',
    'start.cosmetics': 'COSMÉTIQUES',
    'start.library': 'BIBLIOTHÈQUE DE MORCEAUX',
    'start.publicLibrary': 'BIBLIOTHÈQUE PUBLIQUE',
    'start.settings': 'PARAMÈTRES',

    'help.title': 'OÙ TROUVER DE LA MUSIQUE ?',
    'help.intro': "ONE DOT fonctionne avec n'importe quel fichier audio local (MP3, WAV, OGG) sur votre appareil. Voici quelques excellents moyens légaux de trouver de la musique à jouer :",
    'help.li1': '<b>Bibliothèques libres de droits</b> &mdash; des sites comme Free Music Archive ou Pixabay Music proposent des morceaux à télécharger et utiliser librement.',
    'help.li2': '<b>Votre propre musique achetée</b> &mdash; tout MP3 sans DRM que vous avez acheté fonctionne très bien.',
    'help.li3': '<b>Vos propres enregistrements</b> &mdash; fredonner, faire du beatbox ou des enregistrements de groupe créent des niveaux amusants et imprévisibles !',
    'help.outro': 'Une fois le fichier sur votre appareil, appuyez simplement sur <b>IMPORTER UN MORCEAU</b> et sélectionnez-le.',

    'settings.title': 'PARAMÈTRES',
    'settings.latency': 'Décalage de latence audio :',
    'settings.haptics': 'Vibrations',
    'settings.hapticsOff': 'DÉSACTIVÉ',
    'settings.hapticsTaps': 'TOUCHES UNIQUEMENT',
    'settings.hapticsFull': 'RYTHME COMPLET',
    'settings.replay': 'Capture instantanée de replay',
    'settings.debugLog': "Journal de débogage (afficher les détails du crash à l'écran)",
    'settings.tapSound': 'Son de frappe (coups parfaits)',
    'settings.tapHihat': 'HI-HAT',
    'settings.tapClap': 'CLAP',
    'settings.tap808': '808',
    'settings.tapLaser': 'LASER',
    'settings.preview': 'APERÇU',
    'settings.rhythmGuide': 'Guide rythmique (tic discret à chaque temps)',
    'settings.guideAuto': 'AUTO (3 premières parties)',
    'settings.playerName': 'Nom du joueur (affiché dans les classements de la Bibliothèque Publique)',
    'settings.playerNamePlaceholder': 'JOUEUR1234',
    'settings.rhythmFocus': 'Focus rythmique :',
    'settings.rhythmFocusHint': 'Plus élevé = la balle suit davantage les voix/la mélodie ; plus bas = davantage la batterie/basse. Nouveaux morceaux uniquement - réimportez un morceau déjà analysé pour appliquer.',
    'settings.syncTestHint': "SYNC TEST joue une piste de clics constante à 120 BPM. Si vos frappes sur les clics semblent en avance/retard, ajustez le Décalage de Latence ci-dessus. Si les obstacles se désynchronisent visuellement du rythme avec le temps, c'est un bug de timing.",
    'settings.syncTest': 'SYNC TEST (120 BPM)',
    'settings.language': 'Langue',

    'vocal.drumsOnly': 'BATTERIE UNIQUEMENT',
    'vocal.mostlyDrums': 'PLUTÔT BATTERIE',
    'vocal.balanced': 'ÉQUILIBRÉ',
    'vocal.mostlyVocals': 'PLUTÔT VOIX',
    'vocal.vocalsOnly': 'VOIX UNIQUEMENT',

    'debug.title': 'JOURNAL DE DÉBOGAGE',
    'debug.clear': 'EFFACER',

    'analyzing.title': 'ANALYSE AUDIO EN COURS...',
    'analyzing.loadedFromLibrary': 'CHARGÉ DEPUIS LA BIBLIOTHÈQUE',
    'analyzing.downloadingSong': 'TÉLÉCHARGEMENT DE LA CHANSON...',
    'analyzing.preparingTutorial': 'PRÉPARATION DU TUTORIEL...',
    'analyzing.lessonBounce': 'LEÇON : RYTHME ET REBONDS',
    'analyzing.preparingSyncTest': 'PRÉPARATION DU TEST DE SYNCHRO...',
    'analyzing.clickTrack120': 'PISTE DE CLIC 120 BPM',
    'analyzing.regeneratingLevel': 'RÉGÉNÉRATION DU NIVEAU...',

    'result.title': 'PISTE PRÊTE',
    'result.song': 'MORCEAU',
    'result.bpm': 'BPM',
    'result.length': 'DURÉE',
    'result.beats': 'TEMPS',
    'result.intensity': 'INTENSITÉ',
    'result.weakWarning': 'Temps faible détecté — ce morceau pourrait mal se jouer. Essayez le BEAT TUNER pour ajuster la détection.',
    'legend.drop': 'DROP',
    'legend.build': 'BUILD',
    'legend.chill': 'CHILL',
    'legend.checkpoint': 'CHECKPOINT',
    'legend.vocalDensity': 'DENSITÉ VOCALE',
    'result.publish': "Publier ce morceau + niveau pour que d'autres joueurs puissent y jouer dans le classement de la Bibliothèque Publique",
    'result.publishTitlePlaceholder': 'TITRE DU NIVEAU',
    'result.publishBtn': 'PUBLIER DANS LA BIBLIOTHÈQUE PUBLIQUE',
    'result.continue': 'CONTINUER',

    'tuner.title': 'BEAT TUNER',
    'tuner.bassLabel': 'BASSES &rarr; PICS',
    'tuner.test': 'TESTER',
    'tuner.sensitivity': 'Sensibilité :',
    'tuner.minSpacing': 'Espacement min. :',
    'tuner.preview': 'APERÇU (10s)',
    'tuner.regenerate': 'RÉGÉNÉRER LE NIVEAU',
    'tuner.legendWave': 'FORME D\'ONDE',
    'tuner.legendGrid': 'GRILLE RYTHMIQUE',
    'tuner.legendHits': 'OBSTACLES',

    'modifiers.title': 'MODIFICATEURS',
    'modifiers.total': 'TOTAL :',
    'modifiers.start': 'DÉPART',

    'pass.readyQ': 'PRÊT ?',
    'pass.getReady': 'PRÉPAREZ-VOUS !',
    'pass.yourTurn': 'À VOUS !',
    'pass.continue': 'APPUYEZ POUR CONTINUER',
    'pass.passTo': 'PASSEZ LE TÉLÉPHONE À {name}',

    'hud.timeRemaining': '{time} restant',
    'hud.replayToast': 'SÉRIE DE 50+ PARFAITS CAPTURÉE !',
    'hud.saveReplay': 'SAUVEGARDER LE REPLAY',

    'pause.title': 'PAUSE',
    'pause.resume': 'REPRENDRE',
    'pause.restartCheckpoint': 'RECOMMENCER AU CHECKPOINT',
    'pause.quit': 'QUITTER VERS LE MENU',

    'practice.title': 'MODE ENTRAÎNEMENT',
    'practice.info': 'Boucle la section autour de votre dernier coup à 0.6x vitesse',
    'practice.exit': "QUITTER L'ENTRAÎNEMENT",
    'practice.passes': 'PASSAGES : {n} / 3',

    'complete.songComplete': 'MORCEAU TERMINÉ',
    'complete.gameOver': 'GAME OVER',
    'leaderboard.global': 'CLASSEMENT MONDIAL',
    'leaderboard.yourName': 'VOTRE NOM',
    'complete.share': 'PARTAGER LA CARTE DE SCORE',
    'complete.challenge': 'DÉFI',
    'complete.practice': 'ENTRAÎNEMENT',
    'complete.playAgain': 'REJOUER',

    'endless.runOver': 'PARTIE TERMINÉE',
    'endless.retry': 'RÉESSAYER',

    'multiplayer.results': 'RÉSULTATS',

    'cosmetics.title': 'COSMÉTIQUES',
    'cosmetics.theme': 'THÈME',
    'cosmetics.skin': 'SKIN DE BALLE',
    'cosmetics.trail': 'TRAÎNÉE',

    'achievements.title': 'SUCCÈS',

    'stats.title': 'STATISTIQUES',

    'leaderboards.title': 'CLASSEMENTS',

    'library.title': 'BIBLIOTHÈQUE DE MORCEAUX',
    'library.hint': "Analyse mise en cache pour les morceaux déjà joués. Réimportez le même fichier et l'analyse sera ignorée instantanément.",

    'publicLibrary.title': 'BIBLIOTHÈQUE PUBLIQUE',
    'publicLibrary.hint': 'Morceaux et niveaux publiés par d\'autres joueurs. Appuyez sur JOUER pour en télécharger un et y jouer - votre score apparaît dans son classement mondial.',
    'publicLibrary.searchPlaceholder': 'RECHERCHER TITRE / AUTEUR',
    'publicLibrary.sortNewest': 'PLUS RÉCENTS',
    'publicLibrary.sortPlayed': 'PLUS JOUÉS',
    'publicLibrary.sortRating': 'MIEUX NOTÉS',
    'publicLibrary.sortBpmAsc': 'BPM CROISSANT',
    'publicLibrary.sortBpmDesc': 'BPM DÉCROISSANT',
    'publicLibrary.minBpmPlaceholder': 'BPM MIN',
    'publicLibrary.maxBpmPlaceholder': 'BPM MAX',

    'challenge.title': 'SAISIR UN CODE DE DÉFI',
    'challenge.placeholder': 'ex. 3F9K2-A1B2C-12345',
    'challenge.submit': 'IMPORTER LE MORCEAU CORRESPONDANT',

    'link.title': 'COLLER LE LIEN',
    'link.placeholder': 'Collez un lien YouTube ou Spotify...',
    'link.play': 'JOUER',
    'link.downloading': 'TÉLÉCHARGEMENT...',
    'link.desktopOnly': 'Lien non pris en charge. Essayez un lien YouTube ou Spotify.',

    'multiSelect.title': 'SÉLECTIONNER DES MORCEAUX',
    'multiSelect.info': 'Choisissez 2 fichiers audio ou plus',
    'multiSelect.chooseFiles': 'CHOISIR DES FICHIERS',
    'multiSelect.continue': 'CONTINUER',
    'multiSelect.endlessTitle': 'MODE SANS FIN',
    'multiSelect.endlessInfo': 'Choisissez 2 fichiers audio ou plus - ils seront joués les uns après les autres',
    'multiSelect.playlistTitle': 'PLAYLIST AUTO-DJ',
    'multiSelect.playlistInfo': 'Choisissez des morceaux qui seront joués les uns après les autres avec des transitions',

    'passSetup.title': 'CONFIGURATION PASSE & JOUE',
    'passSetup.addPlayer': 'AJOUTER UN JOUEUR',
    'passSetup.chooseSong': 'CHOISIR UN MORCEAU',

    'playlistSummary.title': 'PLAYLIST TERMINÉE',
  };

  STRINGS.pl = {
    'common.back': 'WSTECZ',
    'common.mainMenu': 'MENU GŁÓWNE',
    'common.controllerConnected': 'KONTROLER PODŁĄCZONY',
    'common.themeUnlocked': 'MOTYW ODBLOKOWANY',
    'common.on': 'WŁĄCZONE',

    'start.subtitle': 'gra rytmiczna dla twoich uszu',
    'start.tutorial': 'JAK GRAĆ',
    'start.uploadSong': 'WGRAJ PIOSENKĘ',
    'start.pasteLink': 'LINK YOUTUBE / SPOTIFY',
    'start.uploadPlaylist': 'WGRAJ PLAYLISTĘ',
    'start.endless': 'BEZ KOŃCA',
    'start.passPlay': 'PODAJ I GRAJ',
    'start.enterChallenge': 'WPISZ KOD WYZWANIA',
    'start.leaderboards': 'RANKINGI',
    'start.achievements': 'OSIĄGNIĘCIA',
    'start.stats': 'STATYSTYKI',
    'start.cosmetics': 'KOSMETYKI',
    'start.library': 'BIBLIOTEKA PIOSENEK',
    'start.publicLibrary': 'PUBLICZNA BIBLIOTEKA',
    'start.settings': 'USTAWIENIA',

    'help.title': 'GDZIE ZNALEŹĆ MUZYKĘ?',
    'help.intro': 'ONE DOT działa z każdym lokalnym plikiem audio (MP3, WAV, OGG) na twoim urządzeniu. Oto kilka świetnych, legalnych sposobów na znalezienie muzyki do grania:',
    'help.li1': '<b>Biblioteki bez tantiem</b> &mdash; strony takie jak Free Music Archive lub Pixabay Music oferują utwory, które można pobrać i swobodnie używać.',
    'help.li2': '<b>Twoja własna kupiona muzyka</b> &mdash; każde MP3 bez DRM, które kupiłeś, działa świetnie.',
    'help.li3': '<b>Twoje własne nagrania</b> &mdash; nucenie, beatbox lub nagrania zespołu tworzą zabawne, nieprzewidywalne poziomy!',
    'help.outro': 'Gdy plik znajdzie się na twoim urządzeniu, po prostu dotknij <b>WGRAJ PIOSENKĘ</b> i wybierz go.',

    'settings.title': 'USTAWIENIA',
    'settings.latency': 'Przesunięcie opóźnienia audio:',
    'settings.haptics': 'Wibracje',
    'settings.hapticsOff': 'WYŁĄCZONE',
    'settings.hapticsTaps': 'TYLKO UDERZENIA',
    'settings.hapticsFull': 'PEŁNY RYTM',
    'settings.replay': 'Natychmiastowe nagrywanie powtórek',
    'settings.debugLog': 'Log debugowania (pokaż szczegóły awarii na ekranie)',
    'settings.tapSound': 'Dźwięk uderzenia (idealne trafienia)',
    'settings.tapHihat': 'HI-HAT',
    'settings.tapClap': 'CLAP',
    'settings.tap808': '808',
    'settings.tapLaser': 'LASER',
    'settings.preview': 'PODGLĄD',
    'settings.rhythmGuide': 'Przewodnik rytmu (ciche kliknięcie na każdy takt)',
    'settings.guideAuto': 'AUTO (pierwsze 3 gry)',
    'settings.playerName': 'Nazwa gracza (widoczna w rankingach Publicznej Biblioteki)',
    'settings.playerNamePlaceholder': 'GRACZ1234',
    'settings.rhythmFocus': 'Skupienie rytmu:',
    'settings.rhythmFocusHint': 'Wyżej = piłka bardziej śledzi wokal/melodię; niżej = bardziej bębny/bas. Tylko nowe piosenki - wgraj ponownie już przeanalizowaną piosenkę, aby zastosować.',
    'settings.syncTestHint': 'SYNC TEST odtwarza stałą sekwencję kliknięć 120 BPM. Jeśli twoje uderzenia w kliknięcia wydają się zbyt wczesne/późne, dostosuj Przesunięcie opóźnienia powyżej. Jeśli przeszkody z czasem wizualnie rozjeżdżają się z rytmem, to błąd synchronizacji.',
    'settings.syncTest': 'SYNC TEST (120 BPM)',
    'settings.language': 'Język',

    'vocal.drumsOnly': 'TYLKO BĘBNY',
    'vocal.mostlyDrums': 'WIĘCEJ BĘBNÓW',
    'vocal.balanced': 'ZRÓWNOWAŻONE',
    'vocal.mostlyVocals': 'WIĘCEJ WOKALU',
    'vocal.vocalsOnly': 'TYLKO WOKAL',

    'debug.title': 'LOG DEBUGOWANIA',
    'debug.clear': 'WYCZYŚĆ',

    'analyzing.title': 'ANALIZOWANIE AUDIO...',
    'analyzing.loadedFromLibrary': 'WCZYTANO Z BIBLIOTEKI',
    'analyzing.downloadingSong': 'POBIERANIE UTWORU...',
    'analyzing.preparingTutorial': 'PRZYGOTOWYWANIE TUTORIALA...',
    'analyzing.lessonBounce': 'LEKCJA: SKACZ W RYTMIE',
    'analyzing.preparingSyncTest': 'PRZYGOTOWYWANIE TESTU SYNCHRONIZACJI...',
    'analyzing.clickTrack120': 'METRONOM 120 BPM',
    'analyzing.regeneratingLevel': 'REGENEROWANIE POZIOMU...',

    'result.title': 'TRASA GOTOWA',
    'result.song': 'PIOSENKA',
    'result.bpm': 'BPM',
    'result.length': 'DŁUGOŚĆ',
    'result.beats': 'UDERZENIA',
    'result.intensity': 'INTENSYWNOŚĆ',
    'result.weakWarning': 'Wykryto słabe uderzenie — ta piosenka może nie działać dobrze. Wypróbuj BEAT TUNER, aby dostosować detekcję.',
    'legend.drop': 'DROP',
    'legend.build': 'BUILD',
    'legend.chill': 'CHILL',
    'legend.checkpoint': 'PUNKT KONTROLNY',
    'legend.vocalDensity': 'GĘSTOŚĆ WOKALU',
    'result.publish': 'Opublikuj tę piosenkę + poziom, aby inni gracze mogli zagrać w nią w rankingu Publicznej Biblioteki',
    'result.publishTitlePlaceholder': 'TYTUŁ POZIOMU',
    'result.publishBtn': 'OPUBLIKUJ W PUBLICZNEJ BIBLIOTECE',
    'result.continue': 'DALEJ',

    'tuner.title': 'BEAT TUNER',
    'tuner.bassLabel': 'BAS &rarr; SZPILE',
    'tuner.test': 'TEST',
    'tuner.sensitivity': 'Czułość:',
    'tuner.minSpacing': 'Min. odstęp:',
    'tuner.preview': 'PODGLĄD (10s)',
    'tuner.regenerate': 'ZREGENERUJ POZIOM',
    'tuner.legendWave': 'PRZEBIEG FALI',
    'tuner.legendGrid': 'SIATKA RYTMU',
    'tuner.legendHits': 'PRZESZKODY',

    'modifiers.title': 'MODYFIKATORY',
    'modifiers.total': 'SUMA:',
    'modifiers.start': 'START',

    'pass.readyQ': 'GOTOWY?',
    'pass.getReady': 'PRZYGOTUJ SIĘ!',
    'pass.yourTurn': 'TWOJA KOLEJ!',
    'pass.continue': 'DOTKNIJ, ABY KONTYNUOWAĆ',
    'pass.passTo': 'PODAJ TELEFON: {name}',

    'hud.timeRemaining': 'pozostało {time}',
    'hud.replayToast': 'ZAPISANO SERIĘ 50+ PERFEKCYJNYCH!',
    'hud.saveReplay': 'ZAPISZ POWTÓRKĘ',

    'pause.title': 'PAUZA',
    'pause.resume': 'WZNÓW',
    'pause.restartCheckpoint': 'RESTART OD PUNKTU KONTROLNEGO',
    'pause.quit': 'WYJDŹ DO MENU',

    'practice.title': 'TRYB TRENINGU',
    'practice.info': 'Powtarza fragment wokół twojego ostatniego trafienia z prędkością 0.6x',
    'practice.exit': 'WYJDŹ Z TRENINGU',
    'practice.passes': 'PRZEJŚCIA: {n} / 3',

    'complete.songComplete': 'PIOSENKA ZAKOŃCZONA',
    'complete.gameOver': 'KONIEC GRY',
    'leaderboard.global': 'GLOBALNY RANKING',
    'leaderboard.yourName': 'TWOJE IMIĘ',
    'complete.share': 'UDOSTĘPNIJ KARTĘ WYNIKÓW',
    'complete.challenge': 'WYZWANIE',
    'complete.practice': 'TRENING',
    'complete.playAgain': 'ZAGRAJ ZNOWU',

    'endless.runOver': 'PRZEBIEG ZAKOŃCZONY',
    'endless.retry': 'PONÓW',

    'multiplayer.results': 'WYNIKI',

    'cosmetics.title': 'KOSMETYKI',
    'cosmetics.theme': 'MOTYW',
    'cosmetics.skin': 'SKIN KULKI',
    'cosmetics.trail': 'ŚLAD',

    'achievements.title': 'OSIĄGNIĘCIA',

    'stats.title': 'STATYSTYKI',

    'leaderboards.title': 'RANKINGI',

    'library.title': 'BIBLIOTEKA PIOSENEK',
    'library.hint': 'Zapisana analiza dla piosenek, w które grałeś. Wgraj ten sam plik ponownie, a analiza zostanie natychmiast pominięta.',

    'publicLibrary.title': 'PUBLICZNA BIBLIOTEKA',
    'publicLibrary.hint': 'Piosenki i poziomy opublikowane przez innych graczy. Dotknij PLAY, aby pobrać i zagrać - twój wynik trafi do globalnego rankingu.',
    'publicLibrary.searchPlaceholder': 'SZUKAJ TYTUŁU / AUTORA',
    'publicLibrary.sortNewest': 'NAJNOWSZE',
    'publicLibrary.sortPlayed': 'NAJCZĘŚCIEJ GRANE',
    'publicLibrary.sortRating': 'NAJLEPIEJ OCENIANE',
    'publicLibrary.sortBpmAsc': 'BPM WZRASTAJĄCO',
    'publicLibrary.sortBpmDesc': 'BPM OPADAJĄCO',
    'publicLibrary.minBpmPlaceholder': 'MIN BPM',
    'publicLibrary.maxBpmPlaceholder': 'MAX BPM',

    'challenge.title': 'WPISZ KOD WYZWANIA',
    'challenge.placeholder': 'np. 3F9K2-A1B2C-12345',
    'challenge.submit': 'WGRAJ ODPOWIADAJĄCĄ PIOSENKĘ',

    'link.title': 'WKLEJ LINK',
    'link.placeholder': 'Wklej link YouTube lub Spotify...',
    'link.play': 'GRAJ',
    'link.downloading': 'POBIERANIE...',
    'link.desktopOnly': 'Nieobsługiwany link. Spróbuj podać link YouTube lub Spotify.',

    'multiSelect.title': 'WYBIERZ PIOSENKI',
    'multiSelect.info': 'Wybierz 2 lub więcej plików audio',
    'multiSelect.chooseFiles': 'WYBIERZ PLIKI',
    'multiSelect.continue': 'DALEJ',
    'multiSelect.endlessTitle': 'TRYB BEZ KOŃCA',
    'multiSelect.endlessInfo': 'Wybierz 2 lub więcej plików audio - będą odtwarzane jeden po drugim',
    'multiSelect.playlistTitle': 'PLAYLISTA AUTO-DJ',
    'multiSelect.playlistInfo': 'Wybierz piosenki, które będą odtwarzane jedna po drugiej z przejściami',

    'passSetup.title': 'KONFIGURACJA PODAJ I GRAJ',
    'passSetup.addPlayer': 'DODAJ GRACZA',
    'passSetup.chooseSong': 'WYBIERZ PIOSENKĘ',

    'playlistSummary.title': 'PLAYLISTA ZAKOŃCZONA',
  };

  // ============================================================
  //  Dynamic content strings (modifiers / achievements / cosmetics)
  //  Merged into STRINGS below so t() resolves them through the usual
  //  locale -> English -> def-fallback chain. Every name / desc / hint
  //  falls back to the English string baked into the corresponding def
  //  object (game.js / storage.js), so any untranslated entry still
  //  shows readable English instead of a raw key. Skin/trail unlock
  //  hints are NOT listed per id - they are composed at render time from
  //  cosmetic.unlockVia + the localized achievement name.
  //  Proper/scientific cosmetic names (PULSAR, NOVA, NEBULA, MAGMA,
  //  NEON, MATRIX, VAPORWAVE, CYBERPUNK, ARCADE, NOIR...) are left off
  //  on purpose so they fall back to the shared English spelling.
  // ============================================================
  const CONTENT_STRINGS = {
    en: {
      'cosmetic.tapToSelect': 'TAP TO SELECT',
      'cosmetic.fromStart': 'Unlocked from the start',
      'cosmetic.unlockVia': 'Unlock via {name}',
      'trail.none.hint': 'No trail - clean look',
    },

    cs: {
      'mod.slowed.name': 'ZPOMALENO + REVERB \u{1F317}', 'mod.slowed.desc': 'Skladba na 0,8× rychlosti se snovým reverbem a fialovým oparem',
      'mod.autoJump.name': 'AUTO-ODRAZ', 'mod.autoJump.desc': 'Míček dopadne perfektně na každý hrot automaticky – jen si to užij',
      'mod.noFail.name': 'BEZ SELHÁNÍ', 'mod.noFail.desc': 'Zásahy nikdy nerestartují, jen vynulují kombo',
      'mod.widerWindows.name': 'ŠIRŠÍ OKNA', 'mod.widerWindows.desc': 'Perfect ±180 ms, Good ±280 ms',
      'mod.rush.name': 'RUSH 1.25×', 'mod.rush.desc': 'Skladba na 1,25× rychlosti',
      'mod.insane.name': 'ŠÍLENÉ 1.5×', 'mod.insane.desc': 'Skladba na 1,5× rychlosti',
      'mod.bpmOnly.name': 'POUZE BPM', 'mod.bpmOnly.desc': 'Hudba ztlumena – jen syntetický metronom',
      'mod.blindRing.name': 'SLEPÝ PRSTENEC', 'mod.blindRing.desc': 'Žádný pomocný metronomový prstenec – jen uši',
      'mod.suddenDeath.name': 'NÁHLÁ SMRT', 'mod.suddenDeath.desc': '1 zásah = restart od checkpointu',
      'mod.ghostDot.name': 'DUCH MÍČEK', 'mod.ghostDot.desc': 'Míček ve vzduchu vybledne téměř do neviditelna',

      'ach.firstSteps.name': 'PRVNÍ KROKY', 'ach.firstSteps.hint': 'Dokonči svou první skladbu',
      'ach.flawless.name': 'BEZCHYBNÉ', 'ach.flawless.hint': 'Dokonči skladbu se 100% perfect',
      'ach.dropSurvivor.name': 'PŘEŽIL DROP', 'ach.dropSurvivor.hint': 'Projdi celou drop sekci bez zásahu',
      'ach.blindFaith.name': 'SLEPÁ VÍRA', 'ach.blindFaith.hint': 'Dokonči skladbu se zapnutým SLEPÝM PRSTENCEM',
      'ach.marathon.name': 'MARATON', 'ach.marathon.hint': 'Skoč 1000× (celkově)',
      'ach.speedDemon.name': 'DÉMON RYCHLOSTI', 'ach.speedDemon.hint': 'Dokonči skladbu na ŠÍLENÉ 1.5×',
      'ach.comboKing.name': 'KRÁL KOMBA', 'ach.comboKing.hint': 'Dosáhni komba 200',
      'ach.collector.name': 'SBĚRATEL', 'ach.collector.hint': 'Odemkni všechny motivy',
      'ach.nightShift.name': 'NOČNÍ SMĚNA', 'ach.nightShift.hint': 'Zahraj celkem 10 skladeb',
      'ach.perfectTen.name': 'PERFEKTNÍ DESÍTKA', 'ach.perfectTen.hint': 'Získej 10 perfect v řadě, 5× v jedné skladbě',
      'ach.centurion.name': 'CENTURION', 'ach.centurion.hint': 'Dosáhni komba 100',
      'ach.suddenDeathSurvivor.name': 'NERVY ZE ŽELEZA', 'ach.suddenDeathSurvivor.hint': 'Dokonči skladbu se zapnutou NÁHLOU SMRTÍ',
      'ach.bpmPurist.name': 'ČISTÝ RYTMUS', 'ach.bpmPurist.hint': 'Dokonči skladbu s POUZE BPM',
      'ach.ghostBuster.name': 'KROTITEL DUCHŮ', 'ach.ghostBuster.hint': 'Poraz svého ducha se zapnutým DUCH MÍČKEM',
      'ach.dedication.name': 'ODHODLÁNÍ', 'ach.dedication.hint': 'Hraj celkem 1 hodinu',
      'ach.ironLegs.name': 'ŽELEZNÉ NOHY', 'ach.ironLegs.hint': 'Skoč 5000× (celkově)',
      'ach.veteran.name': 'VETERÁN', 'ach.veteran.hint': 'Zahraj celkem 50 skladeb',
      'ach.legendary.name': 'LEGENDÁRNÍ', 'ach.legendary.hint': 'Dosáhni komba 500',
      'ach.chaosTheory.name': 'TEORIE CHAOSU', 'ach.chaosTheory.hint': 'Použij 5 různých modifikátorů (celkově)',
      'ach.gluttonForPunishment.name': 'NENASYTA TRESTU', 'ach.gluttonForPunishment.hint': 'Dokonči skladbu se 3+ aktivními těžkými modifikátory',
      'ach.archivist.name': 'ARCHIVÁŘ', 'ach.archivist.hint': 'Ulož 8 skladeb do knihovny',
      'ach.goingPublic.name': 'JDU NA VEŘEJNOST', 'ach.goingPublic.hint': 'Zveřejni úroveň do Veřejné knihovny',
      'ach.endlessLegend.name': 'NEKONEČNÁ LEGENDA', 'ach.endlessLegend.hint': 'Přežij 5 skladeb v jednom Nekonečném běhu',
      'ach.nightOwl.name': 'NOČNÍ SOVA', 'ach.nightOwl.hint': 'Dokonči skladbu mezi půlnocí a 5. ranní',

      'theme.default.name': 'VÝCHOZÍ', 'theme.default.hint': 'Odemčeno od začátku',
      'theme.vaporwave.hint': 'Dokonči svou první skladbu',
      'theme.matrix.hint': 'Dosáhni komba 100+',
      'theme.bloodmoon.name': 'KRVAVÝ MĚSÍC', 'theme.bloodmoon.hint': 'Dokonči skladbu na ŠÍLENÉ 1.5×',
      'theme.goldenhour.name': 'ZLATÁ HODINA', 'theme.goldenhour.hint': '95%+ perfect v dokončené skladbě',
      'theme.frost.name': 'MRÁZ', 'theme.frost.hint': 'Odemkni achievement PERFEKTNÍ DESÍTKA',
      'theme.sunset.name': 'ZÁPAD SLUNCE', 'theme.sunset.hint': 'Dokonči skladbu s RUSH 1.25×',
      'theme.inferno.hint': 'Odemkni achievement NERVY ZE ŽELEZA',
      'theme.cyberpunk.hint': 'Odemkni achievement TEORIE CHAOSU',
      'theme.emerald.name': 'SMARAGD', 'theme.emerald.hint': 'Odemkni achievement ARCHIVÁŘ',
      'theme.nebula.name': 'MLHOVINA', 'theme.nebula.hint': 'Odemkni achievement NEKONEČNÁ LEGENDA',
      'theme.arcade.name': 'ARKÁDA', 'theme.arcade.hint': 'Odemkni achievement JDU NA VEŘEJNOST',
      'theme.abyss.name': 'PROPAST', 'theme.abyss.hint': 'Odemkni achievement ŽELEZNÉ NOHY',
      'theme.noir.hint': 'Odemkni achievement NOČNÍ SOVA',

      'skin.classic.name': 'KLASIKA', 'skin.star.name': 'HVĚZDA', 'skin.comet.name': 'KOMETA',
      'skin.smiley.name': 'SMAJLÍK', 'skin.diamond.name': 'DIAMANT', 'skin.phantom.name': 'FANTOM',
      'skin.galaxy.name': 'GALAXIE', 'skin.crystal.name': 'KRYSTAL', 'skin.circuit.name': 'OBVOD',
      'skin.yinyang.name': 'JIN JANG',

      'trail.classic.name': 'KLASIKA', 'trail.none.name': 'ŽÁDNÁ', 'trail.rainbow.name': 'DUHA',
      'trail.fire.name': 'OHEŇ', 'trail.ribbon.name': 'STUHA', 'trail.sparkle.name': 'JISKRA',
      'trail.bubbles.name': 'BUBLINY', 'trail.smoke.name': 'KOUŘ', 'trail.electric.name': 'ELEKTRICKÁ',
      'trail.petals.name': 'OKVĚTNÍ LÍSTKY',

      'cosmetic.tapToSelect': 'KLEPNI PRO VÝBĚR', 'cosmetic.fromStart': 'Odemčeno od začátku',
      'cosmetic.unlockVia': 'Odemkni přes {name}', 'trail.none.hint': 'Žádná stopa – čistý vzhled',
    },

    ru: {
      'mod.slowed.name': 'ЗАМЕДЛЕНО + РЕВЕРБ \u{1F317}', 'mod.slowed.desc': 'Трек на скорости 0.8× с мечтательным ревербом и фиолетовой дымкой',
      'mod.autoJump.name': 'АВТО-ОТСКОК', 'mod.autoJump.desc': 'Шар идеально приземляется на каждый шип автоматически — просто наслаждайся',
      'mod.noFail.name': 'БЕЗ ПРОВАЛА', 'mod.noFail.desc': 'Промахи не перезапускают, только сбрасывают комбо',
      'mod.widerWindows.name': 'ШИРЕ ОКНА', 'mod.widerWindows.desc': 'Perfect ±180 мс, Good ±280 мс',
      'mod.rush.name': 'РАЗГОН 1.25×', 'mod.rush.desc': 'Трек на скорости 1.25×',
      'mod.insane.name': 'БЕЗУМИЕ 1.5×', 'mod.insane.desc': 'Трек на скорости 1.5×',
      'mod.bpmOnly.name': 'ТОЛЬКО BPM', 'mod.bpmOnly.desc': 'Музыка отключена — только синтетический метроном',
      'mod.blindRing.name': 'СЛЕПОЕ КОЛЬЦО', 'mod.blindRing.desc': 'Без вспомогательного кольца метронома — только слух',
      'mod.suddenDeath.name': 'ВНЕЗАПНАЯ СМЕРТЬ', 'mod.suddenDeath.desc': '1 промах = рестарт с чекпоинта',
      'mod.ghostDot.name': 'ПРИЗРАЧНЫЙ ШАР', 'mod.ghostDot.desc': 'Шар почти исчезает в полёте',

      'ach.firstSteps.name': 'ПЕРВЫЕ ШАГИ', 'ach.firstSteps.hint': 'Заверши свой первый трек',
      'ach.flawless.name': 'БЕЗУПРЕЧНО', 'ach.flawless.hint': 'Заверши трек со 100% perfect',
      'ach.dropSurvivor.name': 'ПЕРЕЖИЛ ДРОП', 'ach.dropSurvivor.hint': 'Пройди всю секцию дропа без промаха',
      'ach.blindFaith.name': 'СЛЕПАЯ ВЕРА', 'ach.blindFaith.hint': 'Заверши трек с включённым СЛЕПЫМ КОЛЬЦОМ',
      'ach.marathon.name': 'МАРАФОН', 'ach.marathon.hint': 'Прыгни 1000 раз (всего)',
      'ach.speedDemon.name': 'ДЕМОН СКОРОСТИ', 'ach.speedDemon.hint': 'Заверши трек на БЕЗУМИЕ 1.5×',
      'ach.comboKing.name': 'КОРОЛЬ КОМБО', 'ach.comboKing.hint': 'Достигни комбо 200',
      'ach.collector.name': 'КОЛЛЕКЦИОНЕР', 'ach.collector.hint': 'Открой все темы',
      'ach.nightShift.name': 'НОЧНАЯ СМЕНА', 'ach.nightShift.hint': 'Сыграй всего 10 треков',
      'ach.perfectTen.name': 'ИДЕАЛЬНАЯ ДЕСЯТКА', 'ach.perfectTen.hint': 'Получи 10 perfect подряд, 5 раз в одном треке',
      'ach.centurion.name': 'ЦЕНТУРИОН', 'ach.centurion.hint': 'Достигни комбо 100',
      'ach.suddenDeathSurvivor.name': 'СТАЛЬНЫЕ НЕРВЫ', 'ach.suddenDeathSurvivor.hint': 'Заверши трек с ВНЕЗАПНОЙ СМЕРТЬЮ',
      'ach.bpmPurist.name': 'ЧИСТЫЙ РИТМ', 'ach.bpmPurist.hint': 'Заверши трек с ТОЛЬКО BPM',
      'ach.ghostBuster.name': 'ОХОТНИК ЗА ПРИВИДЕНИЯМИ', 'ach.ghostBuster.hint': 'Победи своего призрака с ПРИЗРАЧНЫМ ШАРОМ',
      'ach.dedication.name': 'ПРЕДАННОСТЬ', 'ach.dedication.hint': 'Играй всего 1 час',
      'ach.ironLegs.name': 'ЖЕЛЕЗНЫЕ НОГИ', 'ach.ironLegs.hint': 'Прыгни 5000 раз (всего)',
      'ach.veteran.name': 'ВЕТЕРАН', 'ach.veteran.hint': 'Сыграй всего 50 треков',
      'ach.legendary.name': 'ЛЕГЕНДАРНО', 'ach.legendary.hint': 'Достигни комбо 500',
      'ach.chaosTheory.name': 'ТЕОРИЯ ХАОСА', 'ach.chaosTheory.hint': 'Используй 5 разных модификаторов (всего)',
      'ach.gluttonForPunishment.name': 'ЛЮБИТЕЛЬ НАКАЗАНИЙ', 'ach.gluttonForPunishment.hint': 'Заверши трек с 3+ активными сложными модификаторами',
      'ach.archivist.name': 'АРХИВАРИУС', 'ach.archivist.hint': 'Сохрани 8 треков в библиотеке',
      'ach.goingPublic.name': 'ВЫХОД В СВЕТ', 'ach.goingPublic.hint': 'Опубликуй уровень в Публичной библиотеке',
      'ach.endlessLegend.name': 'БЕСКОНЕЧНАЯ ЛЕГЕНДА', 'ach.endlessLegend.hint': 'Переживи 5 треков за один Бесконечный забег',
      'ach.nightOwl.name': 'НОЧНАЯ СОВА', 'ach.nightOwl.hint': 'Заверши трек между полуночью и 5 утра',

      'theme.default.name': 'ПО УМОЛЧАНИЮ', 'theme.default.hint': 'Открыто с самого начала',
      'theme.vaporwave.hint': 'Заверши свой первый трек',
      'theme.matrix.name': 'МАТРИЦА', 'theme.matrix.hint': 'Достигни комбо 100+',
      'theme.bloodmoon.name': 'КРОВАВАЯ ЛУНА', 'theme.bloodmoon.hint': 'Заверши трек на БЕЗУМИЕ 1.5×',
      'theme.goldenhour.name': 'ЗОЛОТОЙ ЧАС', 'theme.goldenhour.hint': '95%+ perfect в завершённом треке',
      'theme.frost.name': 'МОРОЗ', 'theme.frost.hint': 'Открой достижение ИДЕАЛЬНАЯ ДЕСЯТКА',
      'theme.sunset.name': 'ЗАКАТ', 'theme.sunset.hint': 'Заверши трек с РАЗГОН 1.25×',
      'theme.inferno.hint': 'Открой достижение СТАЛЬНЫЕ НЕРВЫ',
      'theme.cyberpunk.name': 'КИБЕРПАНК', 'theme.cyberpunk.hint': 'Открой достижение ТЕОРИЯ ХАОСА',
      'theme.emerald.name': 'ИЗУМРУД', 'theme.emerald.hint': 'Открой достижение АРХИВАРИУС',
      'theme.nebula.name': 'ТУМАННОСТЬ', 'theme.nebula.hint': 'Открой достижение БЕСКОНЕЧНАЯ ЛЕГЕНДА',
      'theme.arcade.name': 'АРКАДА', 'theme.arcade.hint': 'Открой достижение ВЫХОД В СВЕТ',
      'theme.abyss.name': 'БЕЗДНА', 'theme.abyss.hint': 'Открой достижение ЖЕЛЕЗНЫЕ НОГИ',
      'theme.noir.name': 'НУАР', 'theme.noir.hint': 'Открой достижение НОЧНАЯ СОВА',

      'skin.classic.name': 'КЛАССИКА', 'skin.star.name': 'ЗВЕЗДА', 'skin.comet.name': 'КОМЕТА',
      'skin.smiley.name': 'СМАЙЛИК', 'skin.diamond.name': 'АЛМАЗ', 'skin.phantom.name': 'ФАНТОМ',
      'skin.galaxy.name': 'ГАЛАКТИКА', 'skin.crystal.name': 'КРИСТАЛЛ', 'skin.circuit.name': 'СХЕМА',
      'skin.yinyang.name': 'ИНЬ-ЯН',

      'trail.classic.name': 'КЛАССИКА', 'trail.none.name': 'НЕТ', 'trail.rainbow.name': 'РАДУГА',
      'trail.fire.name': 'ОГОНЬ', 'trail.ribbon.name': 'ЛЕНТА', 'trail.sparkle.name': 'ИСКРЫ',
      'trail.bubbles.name': 'ПУЗЫРИ', 'trail.smoke.name': 'ДЫМ', 'trail.electric.name': 'МОЛНИЯ',
      'trail.petals.name': 'ЛЕПЕСТКИ',

      'cosmetic.tapToSelect': 'НАЖМИ ДЛЯ ВЫБОРА', 'cosmetic.fromStart': 'Открыто с самого начала',
      'cosmetic.unlockVia': 'Открой через {name}', 'trail.none.hint': 'Без следа — чистый вид',
    },

    de: {
      'mod.slowed.name': 'VERLANGSAMT + REVERB \u{1F317}', 'mod.slowed.desc': 'Song mit 0,8× Geschwindigkeit, träumerischem Hall und violettem Dunst',
      'mod.autoJump.name': 'AUTO-SPRUNG', 'mod.autoJump.desc': 'Der Ball landet automatisch perfekt auf jedem Stachel – genieße einfach',
      'mod.noFail.name': 'KEIN SCHEITERN', 'mod.noFail.desc': 'Treffer starten nie neu, setzen nur dein Combo zurück',
      'mod.widerWindows.name': 'BREITERE FENSTER', 'mod.widerWindows.desc': 'Perfect ±180 ms, Good ±280 ms',
      'mod.rush.name': 'RUSH 1.25×', 'mod.rush.desc': 'Song mit 1,25× Geschwindigkeit',
      'mod.insane.name': 'IRRE 1.5×', 'mod.insane.desc': 'Song mit 1,5× Geschwindigkeit',
      'mod.bpmOnly.name': 'NUR BPM', 'mod.bpmOnly.desc': 'Musik stumm – nur synthetisches Metronom',
      'mod.blindRing.name': 'BLINDER RING', 'mod.blindRing.desc': 'Kein Metronom-Hilfsring – nur Gehör',
      'mod.suddenDeath.name': 'SUDDEN DEATH', 'mod.suddenDeath.desc': '1 Treffer = Neustart vom Checkpoint',
      'mod.ghostDot.name': 'GEISTERPUNKT', 'mod.ghostDot.desc': 'Der Punkt verblasst in der Luft fast bis zur Unsichtbarkeit',

      'ach.firstSteps.name': 'ERSTE SCHRITTE', 'ach.firstSteps.hint': 'Beende deinen ersten Song',
      'ach.flawless.name': 'MAKELLOS', 'ach.flawless.hint': 'Beende einen Song mit 100% perfect',
      'ach.dropSurvivor.name': 'DROP-ÜBERLEBENDER', 'ach.dropSurvivor.hint': 'Überstehe eine ganze Drop-Sektion ohne Treffer',
      'ach.blindFaith.name': 'BLINDES VERTRAUEN', 'ach.blindFaith.hint': 'Beende einen Song mit BLINDER RING',
      'ach.marathon.name': 'MARATHON', 'ach.marathon.hint': 'Springe 1000 Mal (gesamt)',
      'ach.speedDemon.name': 'SPEED-DÄMON', 'ach.speedDemon.hint': 'Beende einen Song auf IRRE 1.5×',
      'ach.comboKing.name': 'COMBO-KÖNIG', 'ach.comboKing.hint': 'Erreiche ein 200er-Combo',
      'ach.collector.name': 'SAMMLER', 'ach.collector.hint': 'Schalte alle Themes frei',
      'ach.nightShift.name': 'NACHTSCHICHT', 'ach.nightShift.hint': 'Spiele insgesamt 10 Songs',
      'ach.perfectTen.name': 'PERFEKTE ZEHN', 'ach.perfectTen.hint': 'Hol 10 perfect in Folge, 5× in einem Song',
      'ach.centurion.name': 'ZENTURIO', 'ach.centurion.hint': 'Erreiche ein 100er-Combo',
      'ach.suddenDeathSurvivor.name': 'NERVEN AUS STAHL', 'ach.suddenDeathSurvivor.hint': 'Beende einen Song mit SUDDEN DEATH',
      'ach.bpmPurist.name': 'PURER RHYTHMUS', 'ach.bpmPurist.hint': 'Beende einen Song mit NUR BPM',
      'ach.ghostBuster.name': 'GEISTERJÄGER', 'ach.ghostBuster.hint': 'Schlage deinen Geist mit GEISTERPUNKT',
      'ach.dedication.name': 'HINGABE', 'ach.dedication.hint': 'Spiele insgesamt 1 Stunde',
      'ach.ironLegs.name': 'EISERNE BEINE', 'ach.ironLegs.hint': 'Springe 5000 Mal (gesamt)',
      'ach.veteran.name': 'VETERAN', 'ach.veteran.hint': 'Spiele insgesamt 50 Songs',
      'ach.legendary.name': 'LEGENDÄR', 'ach.legendary.hint': 'Erreiche ein 500er-Combo',
      'ach.chaosTheory.name': 'CHAOSTHEORIE', 'ach.chaosTheory.hint': 'Nutze 5 verschiedene Modifikatoren (gesamt)',
      'ach.gluttonForPunishment.name': 'LUST AUF STRAFE', 'ach.gluttonForPunishment.hint': 'Beende einen Song mit 3+ aktiven harten Modifikatoren',
      'ach.archivist.name': 'ARCHIVAR', 'ach.archivist.hint': 'Speichere 8 Songs in deiner Bibliothek',
      'ach.goingPublic.name': 'AN DIE ÖFFENTLICHKEIT', 'ach.goingPublic.hint': 'Veröffentliche ein Level in der öffentlichen Bibliothek',
      'ach.endlessLegend.name': 'ENDLOSE LEGENDE', 'ach.endlessLegend.hint': 'Überstehe 5 Songs in einem Endlos-Lauf',
      'ach.nightOwl.name': 'NACHTEULE', 'ach.nightOwl.hint': 'Beende einen Song zwischen Mitternacht und 5 Uhr',

      'theme.default.name': 'STANDARD', 'theme.default.hint': 'Von Anfang an freigeschaltet',
      'theme.vaporwave.hint': 'Beende deinen ersten Song',
      'theme.matrix.hint': 'Erreiche ein 100+ Combo',
      'theme.bloodmoon.name': 'BLUTMOND', 'theme.bloodmoon.hint': 'Beende einen Song auf IRRE 1.5×',
      'theme.goldenhour.name': 'GOLDENE STUNDE', 'theme.goldenhour.hint': '95%+ perfect in einem beendeten Song',
      'theme.frost.name': 'FROST', 'theme.frost.hint': 'Schalte den Erfolg PERFEKTE ZEHN frei',
      'theme.sunset.name': 'SONNENUNTERGANG', 'theme.sunset.hint': 'Beende einen Song mit RUSH 1.25×',
      'theme.inferno.hint': 'Schalte den Erfolg NERVEN AUS STAHL frei',
      'theme.cyberpunk.hint': 'Schalte den Erfolg CHAOSTHEORIE frei',
      'theme.emerald.name': 'SMARAGD', 'theme.emerald.hint': 'Schalte den Erfolg ARCHIVAR frei',
      'theme.nebula.name': 'NEBEL', 'theme.nebula.hint': 'Schalte den Erfolg ENDLOSE LEGENDE frei',
      'theme.arcade.hint': 'Schalte den Erfolg AN DIE ÖFFENTLICHKEIT frei',
      'theme.abyss.name': 'ABGRUND', 'theme.abyss.hint': 'Schalte den Erfolg EISERNE BEINE frei',
      'theme.noir.hint': 'Schalte den Erfolg NACHTEULE frei',

      'skin.classic.name': 'KLASSISCH', 'skin.star.name': 'STERN', 'skin.comet.name': 'KOMET',
      'skin.smiley.name': 'SMILEY', 'skin.diamond.name': 'DIAMANT', 'skin.phantom.name': 'PHANTOM',
      'skin.galaxy.name': 'GALAXIE', 'skin.crystal.name': 'KRISTALL', 'skin.circuit.name': 'SCHALTKREIS',
      'skin.yinyang.name': 'YIN YANG',

      'trail.classic.name': 'KLASSISCH', 'trail.none.name': 'KEINE', 'trail.rainbow.name': 'REGENBOGEN',
      'trail.fire.name': 'FEUER', 'trail.ribbon.name': 'BAND', 'trail.sparkle.name': 'FUNKELN',
      'trail.bubbles.name': 'BLASEN', 'trail.smoke.name': 'RAUCH', 'trail.electric.name': 'ELEKTRISCH',
      'trail.petals.name': 'BLÜTENBLÄTTER',

      'cosmetic.tapToSelect': 'ZUM AUSWÄHLEN TIPPEN', 'cosmetic.fromStart': 'Von Anfang an freigeschaltet',
      'cosmetic.unlockVia': 'Freischalten über {name}', 'trail.none.hint': 'Keine Spur – cleaner Look',
    },

    es: {
      'mod.slowed.name': 'RALENTIZADO + REVERB \u{1F317}', 'mod.slowed.desc': 'Canción a 0,8× con reverb de ensueño y bruma púrpura',
      'mod.autoJump.name': 'AUTO-REBOTE', 'mod.autoJump.desc': 'La bola aterriza perfectamente en cada pincho automáticamente – solo disfruta',
      'mod.noFail.name': 'SIN FALLO', 'mod.noFail.desc': 'Los golpes nunca reinician, solo reinician tu combo',
      'mod.widerWindows.name': 'VENTANAS AMPLIAS', 'mod.widerWindows.desc': 'Perfect ±180 ms, Good ±280 ms',
      'mod.rush.name': 'RUSH 1.25×', 'mod.rush.desc': 'Canción a 1,25× de velocidad',
      'mod.insane.name': 'DEMENCIAL 1.5×', 'mod.insane.desc': 'Canción a 1,5× de velocidad',
      'mod.bpmOnly.name': 'SOLO BPM', 'mod.bpmOnly.desc': 'Música silenciada – solo metrónomo sintético',
      'mod.blindRing.name': 'ANILLO CIEGO', 'mod.blindRing.desc': 'Sin anillo de metrónomo – solo oído',
      'mod.suddenDeath.name': 'MUERTE SÚBITA', 'mod.suddenDeath.desc': '1 golpe = reinicio desde el checkpoint',
      'mod.ghostDot.name': 'PUNTO FANTASMA', 'mod.ghostDot.desc': 'El punto se desvanece casi invisible en el aire',

      'ach.firstSteps.name': 'PRIMEROS PASOS', 'ach.firstSteps.hint': 'Termina tu primera canción',
      'ach.flawless.name': 'IMPECABLE', 'ach.flawless.hint': 'Termina una canción con 100% perfect',
      'ach.dropSurvivor.name': 'SUPERVIVIENTE DEL DROP', 'ach.dropSurvivor.hint': 'Supera una sección de drop completa sin un golpe',
      'ach.blindFaith.name': 'FE CIEGA', 'ach.blindFaith.hint': 'Termina una canción con ANILLO CIEGO',
      'ach.marathon.name': 'MARATÓN', 'ach.marathon.hint': 'Salta 1000 veces (total)',
      'ach.speedDemon.name': 'DEMONIO DE VELOCIDAD', 'ach.speedDemon.hint': 'Termina una canción en DEMENCIAL 1.5×',
      'ach.comboKing.name': 'REY DEL COMBO', 'ach.comboKing.hint': 'Alcanza un combo de 200',
      'ach.collector.name': 'COLECCIONISTA', 'ach.collector.hint': 'Desbloquea todos los temas',
      'ach.nightShift.name': 'TURNO DE NOCHE', 'ach.nightShift.hint': 'Juega 10 canciones en total',
      'ach.perfectTen.name': 'DIEZ PERFECTOS', 'ach.perfectTen.hint': 'Consigue 10 perfect seguidos, 5 veces en una canción',
      'ach.centurion.name': 'CENTURIÓN', 'ach.centurion.hint': 'Alcanza un combo de 100',
      'ach.suddenDeathSurvivor.name': 'NERVIOS DE ACERO', 'ach.suddenDeathSurvivor.hint': 'Termina una canción con MUERTE SÚBITA',
      'ach.bpmPurist.name': 'RITMO PURO', 'ach.bpmPurist.hint': 'Termina una canción con SOLO BPM',
      'ach.ghostBuster.name': 'CAZAFANTASMAS', 'ach.ghostBuster.hint': 'Vence a tu fantasma con PUNTO FANTASMA',
      'ach.dedication.name': 'DEDICACIÓN', 'ach.dedication.hint': 'Juega 1 hora en total',
      'ach.ironLegs.name': 'PIERNAS DE HIERRO', 'ach.ironLegs.hint': 'Salta 5000 veces (total)',
      'ach.veteran.name': 'VETERANO', 'ach.veteran.hint': 'Juega 50 canciones en total',
      'ach.legendary.name': 'LEGENDARIO', 'ach.legendary.hint': 'Alcanza un combo de 500',
      'ach.chaosTheory.name': 'TEORÍA DEL CAOS', 'ach.chaosTheory.hint': 'Usa 5 modificadores distintos (total)',
      'ach.gluttonForPunishment.name': 'AMANTE DEL CASTIGO', 'ach.gluttonForPunishment.hint': 'Termina una canción con 3+ modificadores difíciles activos',
      'ach.archivist.name': 'ARCHIVERO', 'ach.archivist.hint': 'Guarda 8 canciones en tu biblioteca',
      'ach.goingPublic.name': 'HACERSE PÚBLICO', 'ach.goingPublic.hint': 'Publica un nivel en la Biblioteca Pública',
      'ach.endlessLegend.name': 'LEYENDA INFINITA', 'ach.endlessLegend.hint': 'Sobrevive 5 canciones en una partida Infinita',
      'ach.nightOwl.name': 'BÚHO NOCTURNO', 'ach.nightOwl.hint': 'Termina una canción entre medianoche y las 5 am',

      'theme.default.name': 'PREDETERMINADO', 'theme.default.hint': 'Desbloqueado desde el inicio',
      'theme.vaporwave.hint': 'Termina tu primera canción',
      'theme.matrix.hint': 'Alcanza un combo de 100+',
      'theme.bloodmoon.name': 'LUNA DE SANGRE', 'theme.bloodmoon.hint': 'Termina una canción en DEMENCIAL 1.5×',
      'theme.goldenhour.name': 'HORA DORADA', 'theme.goldenhour.hint': '95%+ de perfect en una canción terminada',
      'theme.frost.name': 'ESCARCHA', 'theme.frost.hint': 'Desbloquea el logro DIEZ PERFECTOS',
      'theme.sunset.name': 'ATARDECER', 'theme.sunset.hint': 'Termina una canción con RUSH 1.25×',
      'theme.inferno.name': 'INFIERNO', 'theme.inferno.hint': 'Desbloquea el logro NERVIOS DE ACERO',
      'theme.cyberpunk.hint': 'Desbloquea el logro TEORÍA DEL CAOS',
      'theme.emerald.name': 'ESMERALDA', 'theme.emerald.hint': 'Desbloquea el logro ARCHIVERO',
      'theme.nebula.name': 'NEBULOSA', 'theme.nebula.hint': 'Desbloquea el logro LEYENDA INFINITA',
      'theme.arcade.hint': 'Desbloquea el logro HACERSE PÚBLICO',
      'theme.abyss.name': 'ABISMO', 'theme.abyss.hint': 'Desbloquea el logro PIERNAS DE HIERRO',
      'theme.noir.hint': 'Desbloquea el logro BÚHO NOCTURNO',

      'skin.classic.name': 'CLÁSICO', 'skin.star.name': 'ESTRELLA', 'skin.comet.name': 'COMETA',
      'skin.smiley.name': 'CARITA', 'skin.diamond.name': 'DIAMANTE', 'skin.phantom.name': 'FANTASMA',
      'skin.galaxy.name': 'GALAXIA', 'skin.crystal.name': 'CRISTAL', 'skin.circuit.name': 'CIRCUITO',
      'skin.yinyang.name': 'YIN YANG',

      'trail.classic.name': 'CLÁSICO', 'trail.none.name': 'NINGUNO', 'trail.rainbow.name': 'ARCOÍRIS',
      'trail.fire.name': 'FUEGO', 'trail.ribbon.name': 'CINTA', 'trail.sparkle.name': 'DESTELLO',
      'trail.bubbles.name': 'BURBUJAS', 'trail.smoke.name': 'HUMO', 'trail.electric.name': 'ELÉCTRICO',
      'trail.petals.name': 'PÉTALOS',

      'cosmetic.tapToSelect': 'TOCA PARA SELECCIONAR', 'cosmetic.fromStart': 'Desbloqueado desde el inicio',
      'cosmetic.unlockVia': 'Desbloquea con {name}', 'trail.none.hint': 'Sin estela – aspecto limpio',
    },

    fr: {
      'mod.slowed.name': 'RALENTI + REVERB \u{1F317}', 'mod.slowed.desc': "Morceau à 0,8× avec réverb onirique et brume violette",
      'mod.autoJump.name': 'AUTO-REBOND', 'mod.autoJump.desc': "La bille atterrit parfaitement sur chaque pic automatiquement – profite",
      'mod.noFail.name': 'SANS ÉCHEC', 'mod.noFail.desc': "Les coups ne redémarrent jamais, ils réinitialisent juste le combo",
      'mod.widerWindows.name': 'FENÊTRES LARGES', 'mod.widerWindows.desc': 'Perfect ±180 ms, Good ±280 ms',
      'mod.rush.name': 'RUSH 1.25×', 'mod.rush.desc': 'Morceau à 1,25× de vitesse',
      'mod.insane.name': 'DÉMENT 1.5×', 'mod.insane.desc': 'Morceau à 1,5× de vitesse',
      'mod.bpmOnly.name': 'BPM SEUL', 'mod.bpmOnly.desc': 'Musique coupée – métronome synthétique uniquement',
      'mod.blindRing.name': 'ANNEAU AVEUGLE', 'mod.blindRing.desc': "Pas d'anneau de métronome – à l'oreille seulement",
      'mod.suddenDeath.name': 'MORT SUBITE', 'mod.suddenDeath.desc': '1 coup = redémarrage au checkpoint',
      'mod.ghostDot.name': 'POINT FANTÔME', 'mod.ghostDot.desc': "Le point devient presque invisible en l'air",

      'ach.firstSteps.name': 'PREMIERS PAS', 'ach.firstSteps.hint': 'Termine ton premier morceau',
      'ach.flawless.name': 'IMPECCABLE', 'ach.flawless.hint': 'Termine un morceau avec 100% perfect',
      'ach.dropSurvivor.name': 'SURVIVANT DU DROP', 'ach.dropSurvivor.hint': 'Passe une section de drop entière sans coup',
      'ach.blindFaith.name': 'FOI AVEUGLE', 'ach.blindFaith.hint': 'Termine un morceau avec ANNEAU AVEUGLE',
      'ach.marathon.name': 'MARATHON', 'ach.marathon.hint': 'Saute 1000 fois (au total)',
      'ach.speedDemon.name': 'DÉMON DE VITESSE', 'ach.speedDemon.hint': 'Termine un morceau en DÉMENT 1.5×',
      'ach.comboKing.name': 'ROI DU COMBO', 'ach.comboKing.hint': 'Atteins un combo de 200',
      'ach.collector.name': 'COLLECTIONNEUR', 'ach.collector.hint': 'Débloque tous les thèmes',
      'ach.nightShift.name': 'ÉQUIPE DE NUIT', 'ach.nightShift.hint': 'Joue 10 morceaux au total',
      'ach.perfectTen.name': 'DIX PARFAITS', 'ach.perfectTen.hint': "Obtiens 10 perfect d'affilée, 5 fois dans un morceau",
      'ach.centurion.name': 'CENTURION', 'ach.centurion.hint': 'Atteins un combo de 100',
      'ach.suddenDeathSurvivor.name': "NERFS D'ACIER", 'ach.suddenDeathSurvivor.hint': 'Termine un morceau avec MORT SUBITE',
      'ach.bpmPurist.name': 'RYTHME PUR', 'ach.bpmPurist.hint': 'Termine un morceau avec BPM SEUL',
      'ach.ghostBuster.name': 'CHASSEUR DE FANTÔMES', 'ach.ghostBuster.hint': 'Bats ton fantôme avec POINT FANTÔME',
      'ach.dedication.name': 'DÉVOUEMENT', 'ach.dedication.hint': 'Joue 1 heure au total',
      'ach.ironLegs.name': 'JAMBES DE FER', 'ach.ironLegs.hint': 'Saute 5000 fois (au total)',
      'ach.veteran.name': 'VÉTÉRAN', 'ach.veteran.hint': 'Joue 50 morceaux au total',
      'ach.legendary.name': 'LÉGENDAIRE', 'ach.legendary.hint': 'Atteins un combo de 500',
      'ach.chaosTheory.name': 'THÉORIE DU CHAOS', 'ach.chaosTheory.hint': 'Utilise 5 modificateurs différents (au total)',
      'ach.gluttonForPunishment.name': 'GLOUTON DE PUNITION', 'ach.gluttonForPunishment.hint': 'Termine un morceau avec 3+ modificateurs difficiles actifs',
      'ach.archivist.name': 'ARCHIVISTE', 'ach.archivist.hint': 'Sauvegarde 8 morceaux dans ta bibliothèque',
      'ach.goingPublic.name': 'RENDRE PUBLIC', 'ach.goingPublic.hint': 'Publie un niveau dans la Bibliothèque publique',
      'ach.endlessLegend.name': 'LÉGENDE INFINIE', 'ach.endlessLegend.hint': 'Survis à 5 morceaux dans une partie Infinie',
      'ach.nightOwl.name': 'OISEAU DE NUIT', 'ach.nightOwl.hint': 'Termine un morceau entre minuit et 5h',

      'theme.default.name': 'PAR DÉFAUT', 'theme.default.hint': 'Débloqué dès le départ',
      'theme.vaporwave.hint': 'Termine ton premier morceau',
      'theme.matrix.hint': 'Atteins un combo de 100+',
      'theme.bloodmoon.name': 'LUNE DE SANG', 'theme.bloodmoon.hint': 'Termine un morceau en DÉMENT 1.5×',
      'theme.goldenhour.name': 'HEURE DORÉE', 'theme.goldenhour.hint': '95%+ de perfect sur un morceau terminé',
      'theme.frost.name': 'GIVRE', 'theme.frost.hint': 'Débloque le succès DIX PARFAITS',
      'theme.sunset.name': 'COUCHER DE SOLEIL', 'theme.sunset.hint': 'Termine un morceau avec RUSH 1.25×',
      'theme.inferno.hint': "Débloque le succès NERFS D'ACIER",
      'theme.cyberpunk.hint': 'Débloque le succès THÉORIE DU CHAOS',
      'theme.emerald.name': 'ÉMERAUDE', 'theme.emerald.hint': 'Débloque le succès ARCHIVISTE',
      'theme.nebula.name': 'NÉBULEUSE', 'theme.nebula.hint': 'Débloque le succès LÉGENDE INFINIE',
      'theme.arcade.hint': 'Débloque le succès RENDRE PUBLIC',
      'theme.abyss.name': 'ABÎME', 'theme.abyss.hint': 'Débloque le succès JAMBES DE FER',
      'theme.noir.hint': 'Débloque le succès OISEAU DE NUIT',

      'skin.classic.name': 'CLASSIQUE', 'skin.star.name': 'ÉTOILE', 'skin.comet.name': 'COMÈTE',
      'skin.smiley.name': 'SMILEY', 'skin.diamond.name': 'DIAMANT', 'skin.phantom.name': 'FANTÔME',
      'skin.galaxy.name': 'GALAXIE', 'skin.crystal.name': 'CRISTAL', 'skin.circuit.name': 'CIRCUIT',
      'skin.yinyang.name': 'YIN YANG',

      'trail.classic.name': 'CLASSIQUE', 'trail.none.name': 'AUCUNE', 'trail.rainbow.name': 'ARC-EN-CIEL',
      'trail.fire.name': 'FEU', 'trail.ribbon.name': 'RUBAN', 'trail.sparkle.name': 'ÉTINCELLE',
      'trail.bubbles.name': 'BULLES', 'trail.smoke.name': 'FUMÉE', 'trail.electric.name': 'ÉLECTRIQUE',
      'trail.petals.name': 'PÉTALES',

      'cosmetic.tapToSelect': 'TOUCHE POUR CHOISIR', 'cosmetic.fromStart': 'Débloqué dès le départ',
      'cosmetic.unlockVia': 'Débloquer via {name}', 'trail.none.hint': 'Pas de traînée – look épuré',
    },

    pl: {
      'mod.slowed.name': 'ZWOLNIONE + REVERB \u{1F317}', 'mod.slowed.desc': 'Utwór z prędkością 0,8× z marzycielskim pogłosem i fioletową mgłą',
      'mod.autoJump.name': 'AUTO-ODBICIE', 'mod.autoJump.desc': 'Kulka automatycznie ląduje idealnie na każdym kolcu – po prostu się ciesz',
      'mod.noFail.name': 'BEZ PORAŻKI', 'mod.noFail.desc': 'Trafienia nigdy nie restartują, tylko zerują combo',
      'mod.widerWindows.name': 'SZERSZE OKNA', 'mod.widerWindows.desc': 'Perfect ±180 ms, Good ±280 ms',
      'mod.rush.name': 'RUSH 1.25×', 'mod.rush.desc': 'Utwór z prędkością 1,25×',
      'mod.insane.name': 'SZALONE 1.5×', 'mod.insane.desc': 'Utwór z prędkością 1,5×',
      'mod.bpmOnly.name': 'TYLKO BPM', 'mod.bpmOnly.desc': 'Muzyka wyciszona – tylko syntetyczny metronom',
      'mod.blindRing.name': 'ŚLEPY PIERŚCIEŃ', 'mod.blindRing.desc': 'Bez pomocniczego pierścienia metronomu – tylko słuch',
      'mod.suddenDeath.name': 'NAGŁA ŚMIERĆ', 'mod.suddenDeath.desc': '1 trafienie = restart od punktu kontrolnego',
      'mod.ghostDot.name': 'KULKA WIDMO', 'mod.ghostDot.desc': 'Kulka niemal znika w powietrzu',

      'ach.firstSteps.name': 'PIERWSZE KROKI', 'ach.firstSteps.hint': 'Ukończ swój pierwszy utwór',
      'ach.flawless.name': 'BEZBŁĘDNIE', 'ach.flawless.hint': 'Ukończ utwór ze 100% perfect',
      'ach.dropSurvivor.name': 'OCALAŁY Z DROPU', 'ach.dropSurvivor.hint': 'Przejdź całą sekcję dropu bez trafienia',
      'ach.blindFaith.name': 'ŚLEPA WIARA', 'ach.blindFaith.hint': 'Ukończ utwór z włączonym ŚLEPYM PIERŚCIENIEM',
      'ach.marathon.name': 'MARATON', 'ach.marathon.hint': 'Skocz 1000 razy (łącznie)',
      'ach.speedDemon.name': 'DEMON SZYBKOŚCI', 'ach.speedDemon.hint': 'Ukończ utwór na SZALONE 1.5×',
      'ach.comboKing.name': 'KRÓL COMBO', 'ach.comboKing.hint': 'Osiągnij combo 200',
      'ach.collector.name': 'KOLEKCJONER', 'ach.collector.hint': 'Odblokuj wszystkie motywy',
      'ach.nightShift.name': 'NOCNA ZMIANA', 'ach.nightShift.hint': 'Zagraj łącznie 10 utworów',
      'ach.perfectTen.name': 'PERFEKCYJNA DZIESIĄTKA', 'ach.perfectTen.hint': 'Zdobądź 10 perfect z rzędu, 5 razy w jednym utworze',
      'ach.centurion.name': 'CENTURION', 'ach.centurion.hint': 'Osiągnij combo 100',
      'ach.suddenDeathSurvivor.name': 'STALOWE NERWY', 'ach.suddenDeathSurvivor.hint': 'Ukończ utwór z NAGŁĄ ŚMIERCIĄ',
      'ach.bpmPurist.name': 'CZYSTY RYTM', 'ach.bpmPurist.hint': 'Ukończ utwór z TYLKO BPM',
      'ach.ghostBuster.name': 'POGROMCA DUCHÓW', 'ach.ghostBuster.hint': 'Pokonaj swojego ducha z KULKĄ WIDMO',
      'ach.dedication.name': 'ODDANIE', 'ach.dedication.hint': 'Graj łącznie 1 godzinę',
      'ach.ironLegs.name': 'ŻELAZNE NOGI', 'ach.ironLegs.hint': 'Skocz 5000 razy (łącznie)',
      'ach.veteran.name': 'WETERAN', 'ach.veteran.hint': 'Zagraj łącznie 50 utworów',
      'ach.legendary.name': 'LEGENDARNIE', 'ach.legendary.hint': 'Osiągnij combo 500',
      'ach.chaosTheory.name': 'TEORIA CHAOSU', 'ach.chaosTheory.hint': 'Użyj 5 różnych modyfikatorów (łącznie)',
      'ach.gluttonForPunishment.name': 'ŻĄDNY KARY', 'ach.gluttonForPunishment.hint': 'Ukończ utwór z 3+ aktywnymi trudnymi modyfikatorami',
      'ach.archivist.name': 'ARCHIWISTA', 'ach.archivist.hint': 'Zapisz 8 utworów w bibliotece',
      'ach.goingPublic.name': 'WYJŚCIE NA ŚWIATŁO', 'ach.goingPublic.hint': 'Opublikuj poziom w Bibliotece Publicznej',
      'ach.endlessLegend.name': 'NIEKOŃCZĄCA SIĘ LEGENDA', 'ach.endlessLegend.hint': 'Przetrwaj 5 utworów w jednym biegu Nieskończonym',
      'ach.nightOwl.name': 'NOCNY MAREK', 'ach.nightOwl.hint': 'Ukończ utwór między północą a 5 rano',

      'theme.default.name': 'DOMYŚLNY', 'theme.default.hint': 'Odblokowane od początku',
      'theme.vaporwave.hint': 'Ukończ swój pierwszy utwór',
      'theme.matrix.hint': 'Osiągnij combo 100+',
      'theme.bloodmoon.name': 'KRWAWY KSIĘŻYC', 'theme.bloodmoon.hint': 'Ukończ utwór na SZALONE 1.5×',
      'theme.goldenhour.name': 'ZŁOTA GODZINA', 'theme.goldenhour.hint': '95%+ perfect w ukończonym utworze',
      'theme.frost.name': 'SZRON', 'theme.frost.hint': 'Odblokuj osiągnięcie PERFEKCYJNA DZIESIĄTKA',
      'theme.sunset.name': 'ZACHÓD SŁOŃCA', 'theme.sunset.hint': 'Ukończ utwór z RUSH 1.25×',
      'theme.inferno.hint': 'Odblokuj osiągnięcie STALOWE NERWY',
      'theme.cyberpunk.hint': 'Odblokuj osiągnięcie TEORIA CHAOSU',
      'theme.emerald.name': 'SZMARAGD', 'theme.emerald.hint': 'Odblokuj osiągnięcie ARCHIWISTA',
      'theme.nebula.name': 'MGŁAWICA', 'theme.nebula.hint': 'Odblokuj osiągnięcie NIEKOŃCZĄCA SIĘ LEGENDA',
      'theme.arcade.hint': 'Odblokuj osiągnięcie WYJŚCIE NA ŚWIATŁO',
      'theme.abyss.name': 'OTCHŁAŃ', 'theme.abyss.hint': 'Odblokuj osiągnięcie ŻELAZNE NOGI',
      'theme.noir.hint': 'Odblokuj osiągnięcie NOCNY MAREK',

      'skin.classic.name': 'KLASYCZNY', 'skin.star.name': 'GWIAZDA', 'skin.comet.name': 'KOMETA',
      'skin.smiley.name': 'BUŹKA', 'skin.diamond.name': 'DIAMENT', 'skin.phantom.name': 'FANTOM',
      'skin.galaxy.name': 'GALAKTYKA', 'skin.crystal.name': 'KRYSZTAŁ', 'skin.circuit.name': 'OBWÓD',
      'skin.yinyang.name': 'YIN YANG',

      'trail.classic.name': 'KLASYCZNY', 'trail.none.name': 'BRAK', 'trail.rainbow.name': 'TĘCZA',
      'trail.fire.name': 'OGIEŃ', 'trail.ribbon.name': 'WSTĄŻKA', 'trail.sparkle.name': 'ISKRA',
      'trail.bubbles.name': 'BĄBELKI', 'trail.smoke.name': 'DYM', 'trail.electric.name': 'ELEKTRYCZNY',
      'trail.petals.name': 'PŁATKI',

      'cosmetic.tapToSelect': 'DOTKNIJ, ABY WYBRAĆ', 'cosmetic.fromStart': 'Odblokowane od początku',
      'cosmetic.unlockVia': 'Odblokuj przez {name}', 'trail.none.hint': 'Bez śladu – czysty wygląd',
    },
  };

  for (const loc of Object.keys(CONTENT_STRINGS)) {
    STRINGS[loc] = Object.assign(STRINGS[loc] || {}, CONTENT_STRINGS[loc]);
  }

  let locale = 'en';

  function detectLocale() {
    const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
    for (const l of langs) {
      const short = String(l).slice(0, 2).toLowerCase();
      if (LOCALES.includes(short)) return short;
    }
    return 'en';
  }

  function getLocale() {
    return locale;
  }

  function setLocale(loc, persist) {
    locale = LOCALES.includes(loc) ? loc : 'en';
    // persist defaults to true; auto-detection passes false so the user's
    // OS language keeps driving the choice until they pick one explicitly.
    if (persist !== false && window.Storage) Storage.setSetting('language', locale);
    applyStaticTranslations();
  }

  /**
   * Best-effort: when running natively under Capacitor, ask the Device
   * plugin for the real OS language and switch to it IF the user has never
   * picked a language manually. No-ops gracefully if the plugin isn't
   * installed (web build, or native build without @capacitor/device), in
   * which case navigator-based detection in init() already applied. The
   * result is NOT persisted, so the app keeps following the OS language.
   */
  async function applySystemLocale() {
    try {
      if (window.Storage && Storage.getSettings().language) return; // user chose - respect it
      const Device = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Device;
      if (!Device || typeof Device.getLanguageCode !== 'function') return;
      const res = await Device.getLanguageCode();
      const short = String((res && res.value) || '').slice(0, 2).toLowerCase();
      if (LOCALES.includes(short) && short !== locale) setLocale(short, false);
    } catch (e) { /* ignore - navigator fallback already ran */ }
  }

  // ---- dynamic content lookups (modifiers / achievements / cosmetics) ----
  // `field` is one of name / desc / hint; falls back to the English string
  // baked into the def object so untranslated content still reads naturally.
  function content(prefix, id, field, fallback) {
    return t(prefix + '.' + id + '.' + field, null, fallback);
  }

  /** Localized "Unlock via {achievement}" line for gated skins/trails. */
  function unlockHint(achId, achNameFallback) {
    const achName = content('ach', achId, 'name', achNameFallback || achId);
    return t('cosmetic.unlockVia', { name: achName }, 'Unlock via ' + achName);
  }

  /** Looks up `key` in the active locale, falling back to English, then `fallback`, then the key itself. Supports {var} substitution. */
  function t(key, vars, fallback) {
    const table = STRINGS[locale] || STRINGS.en;
    let str = table[key];
    if (str == null) str = STRINGS.en[key];
    if (str == null) str = fallback != null ? fallback : key;
    if (vars) {
      for (const k of Object.keys(vars)) {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      }
    }
    return str;
  }

  /** Applies data-i18n / data-i18n-html / data-i18n-placeholder attributes within `root` (defaults to the whole document). */
  function applyStaticTranslations(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
  }

  function init() {
    const saved = window.Storage ? Storage.getSettings().language : null;
    locale = (saved && LOCALES.includes(saved)) ? saved : detectLocale();
    applyStaticTranslations();
    // refine with the native OS language when available (async, best-effort)
    applySystemLocale();
  }

  return {
    init, t, content, unlockHint, getLocale, setLocale, applySystemLocale,
    applyStaticTranslations, LOCALES, LANG_NAMES,
  };
})();
