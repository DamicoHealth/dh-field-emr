// ==========================================
// STORAGE HEALTH — offline durability check & guidance
// ==========================================
// Field devices keep patient records in the browser's local database
// (IndexedDB). On iOS that storage can be erased if the app runs in a Safari
// TAB, or if the OS hasn't granted "persistent" storage — which is exactly how
// offline records disappear when the app is closed and reopened. This module
// inspects the situation on THIS device and tells the user, in plain language,
// how to keep their data safe. It never deletes or moves data.

(function () {
  // Is the app running as an installed PWA (home-screen icon) rather than a
  // browser tab? Installed PWAs get a private, far more durable storage area.
  function isInstalled() {
    try {
      const standaloneDisplay = window.matchMedia &&
        window.matchMedia('(display-mode: standalone)').matches;
      const iosStandalone = window.navigator && window.navigator.standalone === true;
      return !!(standaloneDisplay || iosStandalone);
    } catch (e) { return false; }
  }

  function isIOS() {
    try {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    } catch (e) { return false; }
  }

  async function getPersisted() {
    try {
      if (navigator.storage && navigator.storage.persisted) {
        return await navigator.storage.persisted();
      }
    } catch (e) {}
    return null; // unknown / unsupported
  }

  async function requestPersist() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        return await navigator.storage.persist();
      }
    } catch (e) {}
    return null;
  }

  async function getEstimate() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const e = await navigator.storage.estimate();
        return { usage: e.usage || 0, quota: e.quota || 0 };
      }
    } catch (e) {}
    return null;
  }

  // Returns a plain object describing offline-storage durability + advice.
  async function check() {
    const installed = isInstalled();
    const ios = isIOS();
    let persisted = await getPersisted();
    // If not yet persistent, ask again now — an engaged / installed PWA may be
    // granted on a later attempt than the very first page load.
    if (persisted !== true) {
      const granted = await requestPersist();
      if (granted === true) persisted = true;
    }
    const estimate = await getEstimate();
    const cloudOn = (typeof isStandaloneMode === 'function') ? !isStandaloneMode() : false;

    let level, headline, advice;
    if (!installed) {
      // The single biggest cause of "records gone on reopen" on iOS.
      level = 'danger';
      headline = ios ? 'Add this app to your Home Screen' : 'Install this app for safe offline storage';
      advice = ios
        ? 'You are viewing the app in a browser tab, where iOS can erase saved records. Tap the Share button (□↑), choose "Add to Home Screen," then ALWAYS open the app from that new icon.'
        : 'For reliable offline storage, install the app from your browser menu (Install / Add to Home Screen) and open it from there.';
    } else if (persisted === true) {
      level = 'ok';
      headline = 'Offline storage protected';
      advice = 'This device granted permanent storage — records will survive restarts. Download a backup now and then as a safety net.';
    } else {
      level = 'warn';
      headline = 'Back up your records regularly';
      advice = 'Records are saved on this device, but it has not guaranteed permanent storage. Download a backup at the end of each clinic day' +
        (cloudOn ? ' — your Cloud Sync also keeps a copy online.' : ', or turn on Cloud Sync so a copy lives off-device.');
    }

    const result = { installed, ios, persisted, estimate, cloudOn, level, headline, advice };
    try { console.log('[storage-health]', JSON.stringify(result)); } catch (e) {}
    window._storageHealth = result;
    return result;
  }

  // Renders a dismissible bar fixed to the BOTTOM of the screen (the topbar is
  // position:fixed at the top, so we stay out of its way). Only shows when
  // there is something to act on.
  function renderBanner(result) {
    if (!result) return;
    const existing = document.getElementById('storageHealthBanner');
    if (result.level === 'ok') { if (existing) existing.remove(); return; }

    const dismissKey = 'dhemr_health_dismissed_' + result.level;
    try { if (sessionStorage.getItem(dismissKey) === '1') return; } catch (e) {}

    const palette = {
      danger: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '⚠️' },
      warn:   { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', icon: '🛡️' }
    };
    const c = palette[result.level] || palette.warn;

    let bar = existing;
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'storageHealthBanner';
      document.body.appendChild(bar);
    }
    bar.setAttribute('role', 'alert');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:95;' +
      'background:' + c.bg + ';border-top:2px solid ' + c.border + ';color:' + c.text + ';' +
      'padding:10px 14px;font-size:13px;line-height:1.45;display:flex;align-items:flex-start;gap:10px;' +
      'box-shadow:0 -2px 10px rgba(0,0,0,0.08);';

    const showBackup = result.level !== 'danger';
    bar.innerHTML =
      '<span style="font-size:18px;flex-shrink:0;line-height:1.3;">' + c.icon + '</span>' +
      '<div style="flex:1;min-width:0;"><strong>' + result.headline + '</strong><br>' + result.advice + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">' +
        (showBackup ? '<button id="shBackupBtn" style="background:' + c.border + ';color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">Download backup</button>' : '') +
        '<button id="shDismissBtn" style="background:transparent;color:' + c.text + ';border:1px solid ' + c.border + ';border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;white-space:nowrap;">Dismiss</button>' +
      '</div>';

    const backupBtn = document.getElementById('shBackupBtn');
    if (backupBtn) backupBtn.addEventListener('click', function () {
      if (typeof doDownloadBackup === 'function') doDownloadBackup();
      else if (window.Backup && window.Backup.downloadBackup) window.Backup.downloadBackup();
    });
    const dismissBtn = document.getElementById('shDismissBtn');
    if (dismissBtn) dismissBtn.addEventListener('click', function () {
      try { sessionStorage.setItem(dismissKey, '1'); } catch (e) {}
      bar.remove();
    });
  }

  async function checkAndRender() {
    const r = await check();
    try { renderBanner(r); } catch (e) { console.warn('[storage-health] render failed', e); }
    return r;
  }

  window.StorageHealth = { check, checkAndRender, renderBanner };
})();
