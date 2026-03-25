(function () {
  var STORAGE_KEY = 'game_apk_seen_version';
  var styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = '/game-apk-update-popup.css';
  document.head.appendChild(styleLink);

  function createModal(version) {
    var overlay = document.createElement('div');
    overlay.id = 'apk-update-overlay';
    overlay.innerHTML =
      '<div id="apk-update-modal">' +
      '<h3>New Update Available! (Built just now)</h3>' +
      '<p>Version: ' + version + '</p>' +
      '<div id="apk-update-actions">' +
      '<a id="apk-download-btn" href="/downloads/latest-game.apk" download>Download APK</a>' +
      '<button id="apk-dismiss-btn" type="button">Later</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var downloadBtn = overlay.querySelector('#apk-download-btn');
    var dismissBtn = overlay.querySelector('#apk-dismiss-btn');
    var close = function () {
      overlay.classList.remove('show');
    };

    downloadBtn.addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, version);
      close();
    });

    dismissBtn.addEventListener('click', close);
    overlay.classList.add('show');
  }

  fetch('/version.json', { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) {
        throw new Error('version.json not found');
      }
      return res.json();
    })
    .then(function (payload) {
      var serverVersion = String(payload.version || payload.builtAt || '');
      if (!serverVersion) {
        return;
      }
      var localVersion = localStorage.getItem(STORAGE_KEY);
      if (localVersion !== serverVersion) {
        createModal(serverVersion);
      }
    })
    .catch(function () {
      // Silent fail: game should keep running even if metadata is unavailable.
    });
})();
