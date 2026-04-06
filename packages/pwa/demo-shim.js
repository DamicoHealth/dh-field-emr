// ==========================================
// PWA SHIM — replaces Electron IPC with IndexedDB + localStorage
// Supports both local-only (demo/standalone) and Supabase cloud sync
// Must load AFTER idb-storage.js and pwa-sync.js, BEFORE all other scripts
// ==========================================
(function() {
  const PREFIX = 'dhemr_';
  const IDB_RECORDS_KEY = PREFIX + 'records';

  // --- localStorage helpers for small config data ---
  function lsGet(key, fallback) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }

  function lsSet(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch(e) { console.warn('ls write fail', e); }
  }

  // --- IndexedDB helpers for records (large data) ---
  let _recordsCache = null;
  let _recordsCacheReady = false;

  async function idbGetRecords() {
    if (_recordsCacheReady && _recordsCache !== null) {
      return _recordsCache;
    }
    try {
      const data = await idbStore.getItem(IDB_RECORDS_KEY);
      _recordsCache = Array.isArray(data) ? data : [];
      _recordsCacheReady = true;
    } catch(e) {
      console.warn('[pwa-shim] idb read failed, falling back to localStorage', e);
      _recordsCache = lsGet('records', []);
      _recordsCacheReady = true;
    }
    return _recordsCache;
  }

  async function idbSetRecords(allRecords) {
    _recordsCache = allRecords;
    _recordsCacheReady = true;
    try {
      await idbStore.setItem(IDB_RECORDS_KEY, allRecords);
    } catch(e) {
      console.warn('[pwa-shim] idb write failed, falling back to localStorage', e);
      lsSet('records', allRecords);
    }
  }

  async function getRecords() {
    const all = await idbGetRecords();
    return all.filter(r => !r.deleted);
  }

  async function getAllRecords() {
    return await idbGetRecords();
  }

  // Invalidate cache so next getRecords() re-reads from IDB
  function invalidateCache() {
    _recordsCacheReady = false;
    _recordsCache = null;
  }

  // One-time migration from localStorage to IndexedDB
  async function migrateRecordsToIDB() {
    const migrated = lsGet('_idb_migrated', false);
    if (migrated) return;
    const lsRecords = lsGet('records', null);
    if (lsRecords && Array.isArray(lsRecords) && lsRecords.length > 0) {
      console.log('[pwa-shim] Migrating', lsRecords.length, 'records from localStorage to IndexedDB');
      await idbSetRecords(lsRecords);
      lsSet('_idb_migrated', true);
    } else {
      lsSet('_idb_migrated', true);
    }
  }

  // Run migration immediately
  migrateRecordsToIDB().catch(e => console.warn('[pwa-shim] migration error', e));

  // --- Sync callbacks registry ---
  window._pwaSyncCallbacks = {
    onRecordsUpdated: null,
    onConfigUpdated: null
  };

  // Track registered event handlers
  let _onRecordsUpdatedCb = null;
  let _onConfigUpdatedCb = null;
  let _onSyncStatusCb = null;

  window.electronAPI = {
    // Records — now async with IndexedDB + sync_version tracking
    getRecords: () => getRecords(),
    saveRecord: async (record) => {
      const all = await getAllRecords();
      const idx = all.findIndex(r => r.id === record.id);
      record.savedAt = new Date().toISOString();
      record.deviceId = record.deviceId || (typeof currentDeviceId !== 'undefined' ? currentDeviceId : 'pwa-device-001');

      if (idx >= 0) {
        // Increment sync_version on each save (marks as needing sync)
        const prevVersion = all[idx].sync_version || 1;
        all[idx] = { ...all[idx], ...record, sync_version: prevVersion + 1 };
      } else {
        // New record: start at sync_version 1, synced_version 0
        record.sync_version = 1;
        record.synced_version = 0;
        all.push(record);
      }
      await idbSetRecords(all);
      return getRecords();
    },
    deleteRecord: async (id) => {
      const all = await getAllRecords();
      const idx = all.findIndex(r => r.id === id);
      if (idx >= 0) {
        all[idx].deleted = true;
        all[idx].sync_version = (all[idx].sync_version || 1) + 1;
      }
      await idbSetRecords(all);
      return getRecords();
    },

    // Config — localStorage is fine for small config data
    getSites: () => Promise.resolve(lsGet('sites', null)),
    saveSites: (v) => { lsSet('sites', v); },
    getProviders: () => Promise.resolve(lsGet('providers', null)),
    saveProviders: (v) => { lsSet('providers', v); },
    getFormulary: () => Promise.resolve(lsGet('formulary', null)),
    saveFormulary: (v) => { lsSet('formulary', v); },
    getRxPresets: () => Promise.resolve(lsGet('rxPresets', null)),
    saveRxPresets: (v) => { lsSet('rxPresets', v); },
    getProcedures: () => Promise.resolve(lsGet('procedures', null)),
    saveProcedures: (v) => { lsSet('procedures', v); },
    getReferralTypes: () => Promise.resolve(lsGet('referralTypes', null)),
    saveReferralTypes: (v) => { lsSet('referralTypes', v); },
    getCustomDxPresets: () => Promise.resolve(lsGet('customDxPresets', null)),
    saveCustomDxPresets: (v) => { lsSet('customDxPresets', v); },
    getComplaints: () => Promise.resolve(lsGet('complaints', null)),
    saveComplaints: (v) => { lsSet('complaints', v); },
    getCustomLabTests: () => Promise.resolve(lsGet('customLabTests', [])),
    saveCustomLabTests: (v) => { lsSet('customLabTests', v); },
    getHiddenPresets: () => Promise.resolve(lsGet('hiddenPresets', null)),
    saveHiddenPresets: (v) => { lsSet('hiddenPresets', v); },

    // Device — now backed by pwaSync when available
    getDeviceId: async () => {
      if (typeof pwaSync !== 'undefined') {
        const id = await pwaSync.idbSettingGet('deviceId');
        if (id) return id;
      }
      return lsGet('setting_deviceId', 'pwa-device-001');
    },
    registerDevice: async (name) => {
      if (typeof pwaSync !== 'undefined') {
        const id = await pwaSync.registerDevice(name);
        return id;
      }
      // Fallback: generate local UUID
      const id = crypto.randomUUID();
      lsSet('setting_deviceId', id);
      lsSet('setting_deviceName', name);
      return id;
    },
    getDeviceRole: async () => {
      if (typeof pwaSync !== 'undefined') {
        const role = await pwaSync.idbSettingGet('deviceRole');
        if (role) return role;
      }
      return lsGet('setting_deviceRole', 'admin');
    },
    setDeviceRole: async (role) => {
      if (typeof pwaSync !== 'undefined') {
        await pwaSync.idbSettingSet('deviceRole', role);
      }
      lsSet('setting_deviceRole', role);
      // Update in cloud if connected
      const creds = typeof pwaSync !== 'undefined' ? pwaSync.getCredentials() : {};
      if (creds.url && creds.key && typeof currentDeviceId !== 'undefined' && currentDeviceId) {
        try {
          await fetch(`${creds.url}/rest/v1/devices?id=eq.${encodeURIComponent(currentDeviceId)}`, {
            method: 'PATCH',
            headers: {
              'apikey': creds.key,
              'Authorization': `Bearer ${creds.key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: role })
          });
        } catch {}
      }
      return { ok: true };
    },
    setAdminPassword: (pw) => {
      lsSet('adminPassword', pw);
      // Also push to cloud config if connected
      const creds = typeof pwaSync !== 'undefined' ? pwaSync.getCredentials() : {};
      if (creds.url && creds.key) {
        fetch(`${creds.url}/rest/v1/config`, {
          method: 'POST',
          headers: {
            'apikey': creds.key,
            'Authorization': `Bearer ${creds.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ key: 'adminPassword', value: JSON.stringify(pw), updated_at: new Date().toISOString() })
        }).catch(() => {});
      }
      return Promise.resolve({ ok: true });
    },
    claimAdmin: (pw) => {
      const stored = lsGet('adminPassword', '');
      if (!stored || pw === stored) return Promise.resolve({ ok: true });
      return Promise.resolve({ ok: false, error: 'Incorrect password' });
    },
    countRecordsByField: async (field, value) => {
      const recs = await getRecords();
      return recs.filter(r => r[field] === value).length;
    },
    getUnsyncedCount: async () => {
      if (typeof pwaSync !== 'undefined') {
        return await pwaSync.getUnsyncedCount();
      }
      return 0;
    },

    // Settings — use pwaSync IDB when available, fallback to localStorage
    getSetting: async (key) => {
      if (typeof pwaSync !== 'undefined') {
        const val = await pwaSync.idbSettingGet(key);
        if (val !== null && val !== undefined) return val;
      }
      return lsGet('setting_' + key, null);
    },
    setSetting: async (key, value) => {
      if (typeof pwaSync !== 'undefined') {
        await pwaSync.idbSettingSet(key, value);
      }
      lsSet('setting_' + key, value);
    },

    // Export
    exportCSV: (csv) => {
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'dh-emr-export.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      return Promise.resolve(true);
    },
    exportPDF: (html, name) => {
      try {
        const w = window.open('', '_blank');
        if (!w) {
          alert('Pop-up blocked. Please allow pop-ups for this site to export PDFs.');
          return Promise.resolve(false);
        }
        w.document.write('<html><head><title>' + (name || 'Export') + '</title></head><body>' + html + '</body></html>');
        w.document.close();
        setTimeout(() => w.print(), 500);
        return Promise.resolve(true);
      } catch (e) {
        console.error('exportPDF error:', e);
        return Promise.resolve(false);
      }
    },

    // Setup wizard — real implementation via pwaSync
    verifyTables: async (url, key) => {
      if (typeof pwaSync !== 'undefined') {
        return await pwaSync.verifyTables(url, key);
      }
      return { ok: true };
    },
    seedConfig: async (url, key) => {
      if (typeof pwaSync !== 'undefined') {
        return await pwaSync.seedConfig(url, key);
      }
      return { ok: true };
    },

    // Sync — real implementation via pwaSync
    syncGetStatus: async () => {
      if (typeof pwaSync !== 'undefined') {
        return pwaSync.getStatus();
      }
      return 'offline';
    },
    syncUpdateCredentials: async (url, key) => {
      if (typeof pwaSync !== 'undefined') {
        pwaSync.updateCredentials(url, key);
      }
    },
    syncNow: async () => {
      if (typeof pwaSync !== 'undefined') {
        await pwaSync.syncNow();
        // After sync, invalidate cache so records refresh
        invalidateCache();
      }
    },
    onSyncStatus: (cb) => {
      _onSyncStatusCb = cb;
      if (typeof pwaSync !== 'undefined') {
        pwaSync.onStatus(cb);
      }
    },

    // Menu events — wire up to sync callbacks
    onNewEncounter: () => {},
    onExportCSV: () => {},
    onRecordsRestored: () => {},
    onRecordsUpdated: (cb) => {
      _onRecordsUpdatedCb = cb;
      window._pwaSyncCallbacks.onRecordsUpdated = async () => {
        invalidateCache();
        if (cb) cb();
      };
    },
    onConfigUpdated: (cb) => {
      _onConfigUpdatedCb = cb;
      window._pwaSyncCallbacks.onConfigUpdated = () => {
        if (cb) cb();
      };
    },

    // Backup - no-ops for PWA
    backupSelectPath: () => {
      alert('Backup is not available in the PWA version. Data is stored locally on this device.');
      return Promise.resolve(null);
    },
    backupRun: () => Promise.resolve({ ok: true, time: new Date().toISOString() }),
    backupGetSettings: () => Promise.resolve({ path: '', autoBackup: false, lastBackup: '', lastBackupTime: '' }),
    backupSaveSettings: () => Promise.resolve(),
    backupRestartInterval: () => {},
    onBackupCompleted: () => {}
  };

  console.log('[pwa-shim] electronAPI shimmed for PWA with IndexedDB + Supabase sync support');
})();
