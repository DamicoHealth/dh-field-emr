// ==========================================
// SYNC UI — real sync status display for PWA
// ==========================================

const SYNC_STATUS_MAP = {
  disabled: { color: '#9ca3af', label: 'Disabled', title: 'Cloud sync disabled' },
  synced:   { color: '#22c55e', label: 'Connected', title: 'All records synced' },
  syncing:  { color: '#f59e0b', label: 'Syncing...', title: 'Syncing records...' },
  error:    { color: '#ef4444', label: 'Error', title: 'Sync error -- check credentials' }
};

let _lastSyncTime = null;
let _syncTimeInterval = null;

function formatTimeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Last sync: just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Last sync: ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last sync: ${hours}h ago`;
  return `Last sync: ${Math.floor(hours / 24)}d ago`;
}

async function updateSyncPendingCount() {
  try {
    const count = await window.electronAPI.getUnsyncedCount();
    const el = document.getElementById('syncPendingLabel');
    if (el) {
      el.textContent = count > 0 ? `${count} pending` : '';
    }
  } catch {}
}

function updateSyncTimeLabel() {
  const el = document.getElementById('syncTimeLabel');
  if (el) {
    el.textContent = formatTimeAgo(_lastSyncTime);
  }
}

function updateSyncUI(status) {
  const info = SYNC_STATUS_MAP[status] || SYNC_STATUS_MAP.disabled;
  const dot = document.getElementById('syncDot');
  const indicator = document.getElementById('syncIndicator');
  const label = document.getElementById('syncStatusLabel');
  if (dot) dot.style.backgroundColor = info.color;
  if (indicator) indicator.title = info.title;
  if (label) {
    label.textContent = info.label;
    label.style.color = info.color;
  }

  // Track last sync time on successful sync
  if (status === 'synced') {
    _lastSyncTime = new Date();
    updateSyncTimeLabel();
  }

  // Update pending count on each status change
  updateSyncPendingCount();

  // Show config notice when cloud is connected
  const notice = document.getElementById('configNotice');
  if (notice) notice.style.display = (status === 'synced' || status === 'syncing') ? '' : 'none';
}

async function initSyncUI() {
  // Skip sync UI initialization in standalone mode
  if (isStandaloneMode()) {
    const indicator = document.getElementById('syncIndicator');
    if (indicator) indicator.style.display = 'none';
    return;
  }

  // Show sync indicator
  const indicator = document.getElementById('syncIndicator');
  if (indicator) indicator.style.display = '';

  // Load saved credentials into fields (if they exist on current screen)
  const url = await window.electronAPI.getSetting('supabaseUrl');
  const key = await window.electronAPI.getSetting('supabaseKey');
  const urlEl = document.getElementById('syncUrl');
  const keyEl = document.getElementById('syncKey');
  if (urlEl && url) urlEl.value = url;
  if (keyEl && key) keyEl.value = key;

  // Get initial status
  const status = await window.electronAPI.syncGetStatus();
  updateSyncUI(status);

  // Update pending count initially
  updateSyncPendingCount();

  // Update the time label every 30 seconds
  if (_syncTimeInterval) clearInterval(_syncTimeInterval);
  _syncTimeInterval = setInterval(updateSyncTimeLabel, 30000);

  // Listen for status changes
  window.electronAPI.onSyncStatus(updateSyncUI);

  // Save & Connect button (if it exists)
  const btnSave = document.getElementById('btnSaveSync');
  if (btnSave) {
    const newBtn = btnSave.cloneNode(true);
    btnSave.parentNode.replaceChild(newBtn, btnSave);
    newBtn.addEventListener('click', async () => {
      const newUrl = document.getElementById('syncUrl').value.trim();
      const newKey = document.getElementById('syncKey').value.trim();
      await window.electronAPI.syncUpdateCredentials(newUrl, newKey);
    });
  }

  // Sync Now button (if it exists)
  const btnSync = document.getElementById('btnSyncNow');
  if (btnSync) {
    const newBtn = btnSync.cloneNode(true);
    btnSync.parentNode.replaceChild(newBtn, btnSync);
    newBtn.addEventListener('click', async () => {
      await window.electronAPI.syncNow();
      // Refresh records after sync
      if (typeof records !== 'undefined') {
        records = await window.electronAPI.getRecords();
        if (typeof renderRecords === 'function') renderRecords();
        if (typeof renderStats === 'function') renderStats();
        if (typeof renderDashboard === 'function') renderDashboard();
      }
    });
  }
}
