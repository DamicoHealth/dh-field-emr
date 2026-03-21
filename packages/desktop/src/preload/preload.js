const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Records
  getRecords: () => ipcRenderer.invoke('get-records'),
  saveRecord: (record) => ipcRenderer.invoke('save-record', record),
  deleteRecord: (recordId) => ipcRenderer.invoke('delete-record', recordId),

  // Config
  getSites: () => ipcRenderer.invoke('config:getSites'),
  saveSites: (sites) => ipcRenderer.invoke('config:saveSites', sites),
  getProviders: () => ipcRenderer.invoke('config:getProviders'),
  saveProviders: (providers) => ipcRenderer.invoke('config:saveProviders', providers),
  getFormulary: () => ipcRenderer.invoke('config:getFormulary'),
  saveFormulary: (formulary) => ipcRenderer.invoke('config:saveFormulary', formulary),
  getRxPresets: () => ipcRenderer.invoke('config:getRxPresets'),
  saveRxPresets: (presets) => ipcRenderer.invoke('config:saveRxPresets', presets),
  getProcedures: () => ipcRenderer.invoke('config:getProcedures'),
  saveProcedures: (procedures) => ipcRenderer.invoke('config:saveProcedures', procedures),
  getReferralTypes: () => ipcRenderer.invoke('config:getReferralTypes'),
  saveReferralTypes: (types) => ipcRenderer.invoke('config:saveReferralTypes', types),

  // Device
  getDeviceId: () => ipcRenderer.invoke('device:getId'),
  registerDevice: (name) => ipcRenderer.invoke('device:register', name),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // Export
  exportCSV: (csvContent) => ipcRenderer.invoke('export-csv', csvContent),

  // Setup wizard
  verifyTables: (url, key) => ipcRenderer.invoke('setup:verifyTables', url, key),
  seedConfig: (url, key) => ipcRenderer.invoke('setup:seedConfig', url, key),

  // Sync
  syncGetStatus: () => ipcRenderer.invoke('sync:getStatus'),
  syncUpdateCredentials: (url, key) => ipcRenderer.invoke('sync:updateCredentials', url, key),
  syncNow: () => ipcRenderer.invoke('sync:now'),
  onSyncStatus: (callback) => ipcRenderer.on('sync-status', (event, status) => callback(status)),

  // Menu events
  onNewEncounter: (callback) => ipcRenderer.on('menu-new-encounter', callback),
  onExportCSV: (callback) => ipcRenderer.on('menu-export-csv', callback),
  onRecordsRestored: (callback) => ipcRenderer.on('records-restored', (event) => callback()),

  // Sync-down events
  onRecordsUpdated: (callback) => ipcRenderer.on('records-updated', (event) => callback()),
  onConfigUpdated: (callback) => ipcRenderer.on('config-updated', (event) => callback())
});
