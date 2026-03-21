const database = require('./database');

let syncInterval = null;
let syncStatus = 'disabled'; // disabled | syncing | synced | error
let mainWindow = null;
let supabaseUrl = null;
let supabaseKey = null;

function init(window) {
  mainWindow = window;
  supabaseUrl = database.getConfig('setting:supabaseUrl');
  supabaseKey = database.getConfig('setting:supabaseKey');
  if (supabaseUrl && supabaseKey) {
    start();
  }
}

function updateCredentials(url, key) {
  supabaseUrl = url;
  supabaseKey = key;
  database.setConfig('setting:supabaseUrl', url);
  database.setConfig('setting:supabaseKey', key);
  if (url && key) {
    start();
  } else {
    stop();
  }
}

function start() {
  if (syncInterval) clearInterval(syncInterval);
  setStatus('synced');
  syncInterval = setInterval(syncNow, 30000);
  syncNow();
}

function stop() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  setStatus('disabled');
}

function setStatus(status) {
  syncStatus = status;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sync-status', status);
  }
}

function getStatus() {
  return syncStatus;
}

function getCredentials() {
  return { url: supabaseUrl, key: supabaseKey };
}

async function syncNow() {
  if (!supabaseUrl || !supabaseKey) return;
  if (syncStatus === 'syncing') return;

  setStatus('syncing');

  try {
    // Phase 1: Push local records up
    await pushRecords();

    // Phase 2: Pull remote records down (from other devices)
    await pullRecords();

    // Phase 3: Pull config from cloud
    await pullConfig();

    setStatus('synced');
  } catch (err) {
    console.error('Sync error:', err.message);
    setStatus('error');
  }
}

// ==========================================
// PUSH — local records → Supabase
// ==========================================

async function pushRecords() {
  const unsynced = database.getUnsyncedRecords();
  if (unsynced.length === 0) return;

  for (const record of unsynced) {
    const row = recordToSupabaseRow(record);
    const res = await fetch(`${supabaseUrl}/rest/v1/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(row)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Push failed for ${record.id}: ${res.status} ${errText}`);
    }

    const localRow = database.getRecordRow(record.id);
    if (localRow) {
      database.markSynced(record.id, localRow.sync_version);
    }
  }

  // Update device last_sync_at in Supabase
  const deviceId = database.getDeviceId();
  if (deviceId) {
    await fetch(`${supabaseUrl}/rest/v1/devices?id=eq.${encodeURIComponent(deviceId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ last_sync_at: new Date().toISOString() })
    }).catch(() => {});
  }
}

// ==========================================
// PULL — Supabase records → local (from other devices)
// ==========================================

async function pullRecords() {
  const deviceId = database.getDeviceId();
  if (!deviceId) return;

  const lastPull = database.getLastPullTimestamp();
  let query = `saved_at=gt.${encodeURIComponent(lastPull)}&device_id=neq.${encodeURIComponent(deviceId)}&order=saved_at.asc`;

  const res = await fetch(`${supabaseUrl}/rest/v1/records?${query}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Pull failed: ${res.status} ${errText}`);
  }

  const rows = await res.json();
  if (rows.length === 0) return;

  let latestTimestamp = lastPull;
  for (const row of rows) {
    const record = supabaseRowToRecord(row);
    database.saveRemoteRecord(record);
    if (row.saved_at && row.saved_at > latestTimestamp) {
      latestTimestamp = row.saved_at;
    }
  }

  database.setLastPullTimestamp(latestTimestamp);

  // Notify renderer to refresh
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('records-updated');
  }
}

// ==========================================
// PULL CONFIG — Supabase config → local
// ==========================================

async function pullConfig() {
  const lastConfigPull = database.getLastConfigPullTimestamp();
  const query = `updated_at=gt.${encodeURIComponent(lastConfigPull)}&order=updated_at.asc`;

  const res = await fetch(`${supabaseUrl}/rest/v1/config?${query}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  if (!res.ok) return; // Config pull failure is non-fatal

  const rows = await res.json();
  if (rows.length === 0) return;

  let latestTimestamp = lastConfigPull;
  for (const row of rows) {
    database.setConfig(row.key, row.value);
    if (row.updated_at && row.updated_at > latestTimestamp) {
      latestTimestamp = row.updated_at;
    }
  }

  database.setLastConfigPullTimestamp(latestTimestamp);

  // Notify renderer to refresh config
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('config-updated');
  }
}

// ==========================================
// ROW MAPPING
// ==========================================

function recordToSupabaseRow(record) {
  return {
    id: record.id,
    device_id: record.deviceId || database.getDeviceId(),
    site: record.site || null,
    date: record.date || null,
    mrn: record.mrn || null,
    given_name: record.givenName || null,
    family_name: record.familyName || null,
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
    current_meds: record.currentMeds || null,
    pmh: record.pmh || null,
    chief_concern: record.chiefConcern || null,
    labs: record.labs || {},
    lab_comments: record.labComments || null,
    urinalysis: record.urinalysis || {},
    blood_glucose: record.bloodGlucose || null,
    diagnosis: record.diagnosis || null,
    medications: record.medications || [],
    treatment_notes: record.treatmentNotes || null,
    treatment: record.treatment || null,
    procedures: record.procedures || [],
    referral_type: record.referralType || null,
    provider: record.provider || null,
    notes: record.notes || null,
    age_estimated: !!record.ageEstimated,
    saved_at: record.savedAt || null,
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
    labs: row.labs || {},
    labComments: row.lab_comments || '',
    urinalysis: row.urinalysis || {},
    bloodGlucose: row.blood_glucose || '',
    diagnosis: row.diagnosis || '',
    medications: row.medications || [],
    treatmentNotes: row.treatment_notes || '',
    treatment: row.treatment || '',
    procedures: row.procedures || [],
    referralType: row.referral_type || '',
    provider: row.provider || '',
    notes: row.notes || '',
    ageEstimated: !!row.age_estimated,
    savedAt: row.saved_at || '',
    deleted: !!row.deleted
  };
}

module.exports = { init, updateCredentials, syncNow, getStatus, getCredentials, stop };
