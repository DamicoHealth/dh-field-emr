// ==========================================
// DEMO SHIM — replaces Electron IPC with localStorage
// Must load BEFORE all other scripts
// ==========================================
(function() {
  const PREFIX = 'dhemr_';

  function lsGet(key, fallback) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }

  function lsSet(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch(e) { console.warn('ls write fail', e); }
  }

  function getRecords() {
    return lsGet('records', []).filter(r => !r.deleted);
  }

  function getAllRecords() {
    return lsGet('records', []);
  }

  window.electronAPI = {
    // Records
    getRecords: () => Promise.resolve(getRecords()),
    saveRecord: (record) => {
      const all = getAllRecords();
      const idx = all.findIndex(r => r.id === record.id);
      record.savedAt = new Date().toISOString();
      record.deviceId = record.deviceId || 'demo-device-001';
      if (idx >= 0) { all[idx] = { ...all[idx], ...record }; }
      else { all.push(record); }
      lsSet('records', all);
      return Promise.resolve(getRecords());
    },
    deleteRecord: (id) => {
      const all = getAllRecords();
      const idx = all.findIndex(r => r.id === id);
      if (idx >= 0) all[idx].deleted = true;
      lsSet('records', all);
      return Promise.resolve(getRecords());
    },

    // Config
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

    // Device
    getDeviceId: () => Promise.resolve('demo-device-001'),
    registerDevice: (name) => {
      lsSet('setting_deviceName', name);
      return Promise.resolve('demo-device-001');
    },
    getDeviceRole: () => Promise.resolve(lsGet('setting_deviceRole', 'admin')),
    setDeviceRole: (role) => {
      lsSet('setting_deviceRole', role);
      return Promise.resolve({ ok: true });
    },
    setAdminPassword: (pw) => {
      lsSet('adminPassword', pw);
      return Promise.resolve({ ok: true });
    },
    claimAdmin: (pw) => {
      const stored = lsGet('adminPassword', '');
      if (!stored || pw === stored) return Promise.resolve({ ok: true });
      return Promise.resolve({ ok: false, error: 'Incorrect password' });
    },
    countRecordsByField: (field, value) => {
      const count = getRecords().filter(r => r[field] === value).length;
      return Promise.resolve(count);
    },
    getUnsyncedCount: () => Promise.resolve(0),

    // Settings
    getSetting: (key) => Promise.resolve(lsGet('setting_' + key, null)),
    setSetting: (key, value) => { lsSet('setting_' + key, value); return Promise.resolve(); },

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

    // Setup wizard - no-ops
    verifyTables: () => Promise.resolve({ ok: true }),
    seedConfig: () => Promise.resolve({ ok: true }),

    // Sync - no-ops
    syncGetStatus: () => Promise.resolve('offline'),
    syncUpdateCredentials: () => Promise.resolve(),
    syncNow: () => Promise.resolve(),
    onSyncStatus: () => {},

    // Menu events - no-ops
    onNewEncounter: () => {},
    onExportCSV: () => {},
    onRecordsRestored: () => {},
    onRecordsUpdated: () => {},
    onConfigUpdated: () => {},

    // Backup - no-ops for demo
    backupSelectPath: () => {
      alert('Backup path selection is not available in the web demo.');
      return Promise.resolve(null);
    },
    backupRun: () => Promise.resolve({ ok: true, time: new Date().toISOString() }),
    backupGetSettings: () => Promise.resolve({ path: '', autoBackup: false, lastBackup: '', lastBackupTime: '' }),
    backupSaveSettings: () => Promise.resolve(),
    backupRestartInterval: () => {},
    onBackupCompleted: () => {}
  };

  console.log('[demo-shim] electronAPI shimmed for browser');
})();
