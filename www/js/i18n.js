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

  function setLocale(loc) {
    locale = LOCALES.includes(loc) ? loc : 'en';
    if (window.Storage) Storage.setSetting('language', locale);
    applyStaticTranslations();
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
  }

  return { init, t, getLocale, setLocale, applyStaticTranslations, LOCALES, LANG_NAMES };
})();
