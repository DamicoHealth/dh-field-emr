// ==========================================
// PWA SYNC ENGINE — Supabase cloud sync for IndexedDB
// Replicates desktop sync.js logic using browser fetch()
// ==========================================
const pwaSync = (function() {
  const PREFIX = 'dhemr_';
  const IDB_RECORDS_KEY = PREFIX + 'records';

  let syncStatus = 'disabled'; // disabled | syncing | synced | error
  let supabaseUrl = null;
  let supabaseKey = null;
  let _statusCallbacks = [];

  function supabaseFetch(url, options = {}) {
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      ...(options.headers || {})
    };
    return fetch(url, { ...options, headers });
  }

  async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await supabaseFetch(url, options);
        if (res.ok) return res;
        if (res.status >= 400 && res.status < 500 && res.status !== 429) return res;
        lastError = new Error(`HTTP ${res.status}`);
      } catch (err) {
        lastError = err;
      }
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw lastError;
  }

  function setStatus(status) {
    syncStatus = status;
    _statusCallbacks.forEach(cb => {
      try { cb(status); } catch {}
    });
  }

  function onStatus(cb) {
    _statusCallbacks.push(cb);
  }

  function getStatus() {
    return syncStatus;
  }

  async function init() {
    const url = await idbSettingGet('supabaseUrl');
    const key = await idbSettingGet('supabaseKey');
    const standalone = await idbSettingGet('standaloneMode');
    if (standalone === 'true') return;
    if (url && key) {
      supabaseUrl = url;
      supabaseKey = key;
      setStatus('synced');
    }
  }

  function updateCredentials(url, key) {
    supabaseUrl = url;
    supabaseKey = key;
    idbSettingSet('supabaseUrl', url);
    idbSettingSet('supabaseKey', key);
    if (url && key) {
      setStatus('synced');
    } else {
      setStatus('disabled');
    }
  }

  function getCredentials() {
    return { url: supabaseUrl, key: supabaseKey };
  }

  // --- IndexedDB setting helpers (reuse idbStore from idb-storage.js) ---
  async function idbSettingGet(key) {
    try {
      const val = await idbStore.getItem('dhemr_setting_' + key);
      if (val !== null && val !== undefined) return val;
    } catch {}
    // Fall back to localStorage
    try {
      const v = localStorage.getItem('dhemr_setting_' + key);
      return v !== null ? JSON.parse(v) : null;
    } catch { return null; }
  }

  async function idbSettingSet(key, value) {
    try {
      await idbStore.setItem('dhemr_setting_' + key, value);
    } catch {}
    try {
      localStorage.setItem('dhemr_setting_' + key, JSON.stringify(value));
    } catch {}
  }

  // --- Record helpers ---
  async function getAllRecordsRaw() {
    try {
      const data = await idbStore.getItem(IDB_RECORDS_KEY);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async function saveAllRecords(records) {
    await idbStore.setItem(IDB_RECORDS_KEY, records);
  }

  async function getUnsyncedRecords() {
    const all = await getAllRecordsRaw();
    return all.filter(r => (r.sync_version || 1) > (r.synced_version || 0));
  }

  async function getUnsyncedCount() {
    const unsynced = await getUnsyncedRecords();
    return unsynced.length;
  }

  // --- SYNC NOW ---
  async function syncNow() {
    if (!supabaseUrl || !supabaseKey) return;
    if (syncStatus === 'syncing') return;

    setStatus('syncing');
    try {
      await pushRecords();
      await pullRecords();
      await pullConfig();
      await pullDeviceRole();
      setStatus('synced');
    } catch (err) {
      console.error('[pwa-sync] Sync error:', err.message);
      setStatus('error');
    }
  }

  // --- PUSH ---
  function recordToSupabaseRow(record) {
    return {
      id: record.id,
      device_id: record.deviceId || record.device_id || currentDeviceId,
      site: record.site || null,
      date: record.date || null,
      mrn: record.mrn || null,
      given_name: record.givenName || record.given_name || null,
      family_name: record.familyName || record.family_name || null,
      name: record.name || null,
      sex: record.sex || null,
      dob: record.dob || null,
      phone: record.phone || null,
      pregnant: record.pregnant || null,
      breastfeeding: record.breastfeeding || null,
      temp: record.temp || null,
      bp: record.bp || null,
      weight: record.weight || null,
      allergies: record.allergies || null,
      current_meds: record.currentMeds || record.current_meds || null,
      pmh: record.pmh || null,
      chief_concern: record.chiefConcern || record.chief_concern || null,
      transport: record.transport || null,
      travel_time: record.travelTime || record.travel_time || null,
      labs: record.labs || {},
      lab_comments: record.labComments || record.lab_comments || null,
      urinalysis: record.urinalysis || {},
      blood_glucose: record.bloodGlucose || record.blood_glucose || null,
      diagnosis: record.diagnosis || null,
      medications: record.medications || [],
      treatment_notes: record.treatmentNotes || record.treatment_notes || null,
      treatment: record.treatment || null,
      procedures: record.procedures || [],
      imaging: record.imaging || null,
      surgery: record.surgery || null,
      referral_type: record.referralType || record.referral_type || null,
      referral_date: record.referralDate || record.referral_date || null,
      referral_status: record.referralStatus || record.referral_status || null,
      provider: record.provider || null,
      notes: record.notes || null,
      age_estimated: !!record.ageEstimated,
      saved_at: record.savedAt || record.saved_at || null,
      deleted: !!record.deleted
    };
  }

  function supabaseRowToRecord(row) {
    return {
      id: row.id,
      deviceId: row.device_id || '',
      site: row.site || '',
      date: row.date || '',
      mrn: row.mrn || '',
      givenName: row.given_name || '',
      familyName: row.family_name || '',
      name: row.name || '',
      sex: row.sex || '',
      dob: row.dob || '',
      phone: row.phone || '',
      pregnant: row.pregnant || '',
      breastfeeding: row.breastfeeding || '',
      temp: row.temp || '',
      bp: row.bp || '',
      weight: row.weight || '',
      allergies: row.allergies || '',
      currentMeds: row.current_meds || '',
      pmh: row.pmh || '',
      chiefConcern: row.chief_concern || '',
      transport: row.transport || '',
      travelTime: row.travel_time || '',
      labs: row.labs || {},
      labComments: row.lab_comments || '',
      urinalysis: row.urinalysis || {},
      bloodGlucose: row.blood_glucose || '',
      diagnosis: row.diagnosis || '',
      medications: row.medications || [],
      treatmentNotes: row.treatment_notes || '',
      treatment: row.treatment || '',
      procedures: row.procedures || [],
      imaging: row.imaging || null,
      surgery: row.surgery || null,
      referralType: row.referral_type || '',
      referralDate: row.referral_date || '',
      referralStatus: row.referral_status || '',
      provider: row.provider || '',
      notes: row.notes || '',
      ageEstimated: !!row.age_estimated,
      savedAt: row.saved_at || '',
      deleted: !!row.deleted,
      sync_version: row.sync_version || 1,
      synced_version: row.sync_version || 1  // Pulled records are already synced
    };
  }

  async function pushRecords() {
    const unsynced = await getUnsyncedRecords();
    if (unsynced.length === 0) return;

    const BATCH_SIZE = 50;
    let successCount = 0;
    const all = await getAllRecordsRaw();

    for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
      const batch = unsynced.slice(i, i + BATCH_SIZE);
      const rows = batch.map(r => recordToSupabaseRow(r));

      try {
        const res = await fetchWithRetry(`${supabaseUrl}/rest/v1/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify(rows)
        });

        if (res.ok) {
          for (const record of batch) {
            const idx = all.findIndex(r => r.id === record.id);
            if (idx >= 0) {
              all[idx].synced_version = all[idx].sync_version || 1;
            }
          }
          successCount += batch.length;
        } else {
          throw new Error('Batch push failed');
        }
      } catch {
        // Fall back to one-by-one
        for (const record of batch) {
          try {
            const row = recordToSupabaseRow(record);
            const res = await fetchWithRetry(`${supabaseUrl}/rest/v1/records`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
              body: JSON.stringify(row)
            });
            if (res.ok) {
              const idx = all.findIndex(r => r.id === record.id);
              if (idx >= 0) {
                all[idx].synced_version = all[idx].sync_version || 1;
              }
              successCount++;
            }
          } catch (err) {
            console.error(`[pwa-sync] Push failed for record ${record.id}:`, err.message);
          }
        }
      }
    }

    await saveAllRecords(all);
    console.log(`[pwa-sync] Push: ${successCount}/${unsynced.length} records pushed`);

    // Update device last_sync_at
    if (currentDeviceId) {
      await supabaseFetch(`${supabaseUrl}/rest/v1/devices?id=eq.${encodeURIComponent(currentDeviceId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_sync_at: new Date().toISOString() })
      }).catch(() => {});
    }
  }

  // --- PULL ---
  async function pullRecords() {
    if (!currentDeviceId) return;

    const lastPull = await idbSettingGet('lastPullTimestamp') || '1970-01-01T00:00:00.000Z';
    const query = `synced_at=gt.${encodeURIComponent(lastPull)}&device_id=neq.${encodeURIComponent(currentDeviceId)}&order=synced_at.asc`;

    const res = await supabaseFetch(`${supabaseUrl}/rest/v1/records?${query}`);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Pull failed: ${res.status} ${errText}`);
    }

    const rows = await res.json();
    if (rows.length === 0) return;

    const all = await getAllRecordsRaw();
    let latestTimestamp = lastPull;

    for (const row of rows) {
      const record = supabaseRowToRecord(row);

      // MRN collision detection
      if (record.mrn) {
        const existing = all.find(r =>
          r.mrn === record.mrn &&
          r.id !== record.id &&
          !r.deleted &&
          ((r.givenName || r.given_name || '') !== (record.givenName || '') ||
           (r.familyName || r.family_name || '') !== (record.familyName || '') ||
           (r.dob || '') !== (record.dob || ''))
        );
        if (existing) {
          // Append suffix to avoid collision
          let suffix = 1;
          let newMrn = record.mrn + '-' + suffix;
          while (all.some(r => r.mrn === newMrn && r.id !== record.id)) {
            suffix++;
            newMrn = record.mrn + '-' + suffix;
          }
          console.log(`[pwa-sync] MRN collision: "${record.mrn}" reassigned to "${newMrn}"`);
          record.mrn = newMrn;
          // Update in Supabase
          try {
            await supabaseFetch(`${supabaseUrl}/rest/v1/records?id=eq.${encodeURIComponent(record.id)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mrn: newMrn })
            });
          } catch {}
        }
      }

      // Save to local IndexedDB (without incrementing sync_version)
      const idx = all.findIndex(r => r.id === record.id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...record };
      } else {
        all.push(record);
      }

      const ts = row.synced_at || row.saved_at;
      if (ts && ts > latestTimestamp) {
        latestTimestamp = ts;
      }
    }

    await saveAllRecords(all);
    await idbSettingSet('lastPullTimestamp', latestTimestamp);

    console.log(`[pwa-sync] Pull: ${rows.length} records pulled from other devices`);

    // Notify app to refresh
    if (typeof window !== 'undefined' && window._pwaSyncCallbacks) {
      if (window._pwaSyncCallbacks.onRecordsUpdated) {
        window._pwaSyncCallbacks.onRecordsUpdated();
      }
    }
  }

  // --- PULL CONFIG ---
  async function pullConfig() {
    const lastConfigPull = await idbSettingGet('lastConfigPullTimestamp') || '1970-01-01T00:00:00.000Z';
    const query = `updated_at=gt.${encodeURIComponent(lastConfigPull)}&order=updated_at.asc`;

    const res = await supabaseFetch(`${supabaseUrl}/rest/v1/config?${query}`);
    if (!res.ok) return; // Config pull failure is non-fatal

    const rows = await res.json();
    if (rows.length === 0) return;

    let latestTimestamp = lastConfigPull;
    const lsPrefix = 'dhemr_';

    for (const row of rows) {
      // Save config to localStorage (same as demo-shim pattern)
      const key = row.key;
      const value = row.value;
      try {
        localStorage.setItem(lsPrefix + key, JSON.stringify(value));
      } catch {}

      if (row.updated_at && row.updated_at > latestTimestamp) {
        latestTimestamp = row.updated_at;
      }
    }

    await idbSettingSet('lastConfigPullTimestamp', latestTimestamp);

    // Notify app to refresh config
    if (typeof window !== 'undefined' && window._pwaSyncCallbacks) {
      if (window._pwaSyncCallbacks.onConfigUpdated) {
        window._pwaSyncCallbacks.onConfigUpdated();
      }
    }
  }

  // --- PULL DEVICE ROLE ---
  async function pullDeviceRole() {
    if (!currentDeviceId) return;
    try {
      const res = await supabaseFetch(`${supabaseUrl}/rest/v1/devices?id=eq.${encodeURIComponent(currentDeviceId)}&select=role`);
      if (!res.ok) return;
      const rows = await res.json();
      if (rows.length === 0) return;

      const cloudRole = rows[0].role || 'standard';
      const localRole = await idbSettingGet('deviceRole') || 'standard';

      if (cloudRole !== localRole) {
        await idbSettingSet('deviceRole', cloudRole);
        if (typeof _deviceRole !== 'undefined') {
          _deviceRole = cloudRole;
        }
        if (window._pwaSyncCallbacks && window._pwaSyncCallbacks.onConfigUpdated) {
          window._pwaSyncCallbacks.onConfigUpdated();
        }
      }
    } catch {}
  }

  // --- VERIFY TABLES ---
  async function verifyTables(url, key) {
    try {
      const tables = ['records', 'devices', 'config'];
      for (const table of tables) {
        const res = await fetch(`${url || supabaseUrl}/rest/v1/${table}?limit=0`, {
          headers: { 'apikey': key || supabaseKey, 'Authorization': `Bearer ${key || supabaseKey}` }
        });
        if (res.status === 404) {
          return { ok: false, error: `Table "${table}" not found. Please run the SQL setup script first.` };
        }
        if (!res.ok && res.status !== 200) {
          return { ok: false, error: `Error checking table "${table}": HTTP ${res.status}` };
        }
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // --- SEED CONFIG ---
  async function seedConfig(url, key) {
    try {
      const configItems = [];
      // Seed default config values
      const defaults = {
        sites: typeof DEFAULT_SITES !== 'undefined' ? DEFAULT_SITES : ['Site A'],
        providers: typeof DEFAULT_PHYSICIANS !== 'undefined' ? DEFAULT_PHYSICIANS : ['Physician A'],
        formulary: typeof DEFAULT_FORMULARY !== 'undefined' ? DEFAULT_FORMULARY : [],
        rxPresets: typeof RX_PRESETS !== 'undefined' ? RX_PRESETS : [],
        procedures: typeof DEFAULT_PROCEDURES !== 'undefined' ? DEFAULT_PROCEDURES : [],
        referralTypes: typeof DEFAULT_REFERRAL_TYPES !== 'undefined' ? DEFAULT_REFERRAL_TYPES : [],
        complaints: typeof DEFAULT_COMPLAINTS !== 'undefined' ? DEFAULT_COMPLAINTS : [],
        customDxPresets: typeof DX_PRESETS !== 'undefined' ? DX_PRESETS : []
      };

      for (const [k, v] of Object.entries(defaults)) {
        configItems.push({ key: k, value: JSON.stringify(v), updated_at: new Date().toISOString() });
      }

      const res = await fetch(`${url}/rest/v1/config`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(configItems)
      });

      if (!res.ok) {
        const errText = await res.text();
        return { ok: false, error: `Seed failed: ${errText}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // --- DEVICE REGISTRATION ---
  async function registerDevice(name, url, key) {
    const deviceId = crypto.randomUUID();
    const targetUrl = url || supabaseUrl;
    const targetKey = key || supabaseKey;

    // Save locally
    await idbSettingSet('deviceId', deviceId);
    await idbSettingSet('deviceName', name);

    // Register in cloud if we have credentials
    if (targetUrl && targetKey) {
      try {
        await fetch(`${targetUrl}/rest/v1/devices`, {
          method: 'POST',
          headers: {
            'apikey': targetKey,
            'Authorization': `Bearer ${targetKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            id: deviceId,
            name: name,
            role: 'standard',
            last_sync_at: new Date().toISOString()
          })
        });
      } catch (err) {
        console.warn('[pwa-sync] Device registration in cloud failed:', err.message);
      }
    }

    return deviceId;
  }

  return {
    init,
    syncNow,
    getStatus,
    updateCredentials,
    getCredentials,
    onStatus,
    getUnsyncedCount,
    getUnsyncedRecords,
    verifyTables,
    seedConfig,
    registerDevice,
    recordToSupabaseRow,
    supabaseRowToRecord,
    idbSettingGet,
    idbSettingSet
  };
})();
