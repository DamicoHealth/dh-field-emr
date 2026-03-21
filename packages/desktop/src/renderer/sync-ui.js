// ==========================================
// SYNC UI
// ==========================================

const SYNC_STATUS_MAP = {
  disabled: { color: '#9ca3af', label: 'Disabled', title: 'Cloud sync disabled' },
  synced:   { color: '#22c55e', label: 'Connected', title: 'All records synced' },
  syncing:  { color: '#f59e0b', label: 'Syncing...', title: 'Syncing records...' },
  error:    { color: '#ef4444', label: 'Error', title: 'Sync error — check credentials' }
};

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
  // Show config notice when cloud is connected
  const notice = document.getElementById('configNotice');
  if (notice) notice.style.display = (status === 'synced' || status === 'syncing') ? '' : 'none';
}

async function initSyncUI() {
  // Load saved credentials into fields
  const url = await window.electronAPI.getSetting('supabaseUrl');
  const key = await window.electronAPI.getSetting('supabaseKey');
  if (url) document.getElementById('syncUrl').value = url;
  if (key) document.getElementById('syncKey').value = key;

  // Get initial status
  const status = await window.electronAPI.syncGetStatus();
  updateSyncUI(status);

  // Listen for status changes
  window.electronAPI.onSyncStatus(updateSyncUI);

  // Save & Connect button
  document.getElementById('btnSaveSync').addEventListener('click', async () => {
    const newUrl = document.getElementById('syncUrl').value.trim();
    const newKey = document.getElementById('syncKey').value.trim();
    await window.electronAPI.syncUpdateCredentials(newUrl, newKey);
  });

  // Sync Now button
  document.getElementById('btnSyncNow').addEventListener('click', async () => {
    await window.electronAPI.syncNow();
  });
}
