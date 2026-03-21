const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;
let currentDeviceId = null;

function getDbPath(appDataPath) {
  const dir = path.join(appDataPath, 'dh-emr', 'DH-EMR-Data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'emr.db');
}

function init(appDataPath) {
  const dbPath = getDbPath(appDataPath);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  createTables();
  migrateSchema();
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      device_id TEXT,
      site TEXT,
      date TEXT,
      mrn TEXT,
      given_name TEXT,
      family_name TEXT,
      name TEXT,
      sex TEXT,
      dob TEXT,
      phone TEXT,
      pregnant TEXT,
      breastfeeding TEXT,
      temp TEXT,
      bp TEXT,
      weight TEXT,
      allergies TEXT,
      current_meds TEXT,
      pmh TEXT,
      chief_concern TEXT,
      labs_json TEXT,
      lab_comments TEXT,
      urinalysis_json TEXT,
      blood_glucose TEXT,
      diagnosis TEXT,
      medications_json TEXT,
      treatment_notes TEXT,
      treatment TEXT,
      procedures_json TEXT,
      referral_type TEXT,
      provider TEXT,
      notes TEXT,
      age_estimated INTEGER DEFAULT 0,
      saved_at TEXT,
      sync_version INTEGER DEFAULT 1,
      synced_version INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function migrateSchema() {
  const columns = db.prepare("PRAGMA table_info(records)").all().map(c => c.name);

  // Remove old columns if they exist
  if (columns.includes('triage_num')) {
    try { db.exec('ALTER TABLE records DROP COLUMN triage_num'); } catch {}
  }
  if (columns.includes('consult')) {
    try { db.exec('ALTER TABLE records DROP COLUMN consult'); } catch {}
  }

  // Rename referral → referral_type if old column exists
  if (columns.includes('referral') && !columns.includes('referral_type')) {
    try {
      db.exec('ALTER TABLE records ADD COLUMN referral_type TEXT');
      db.exec('UPDATE records SET referral_type = referral');
      db.exec('ALTER TABLE records DROP COLUMN referral');
    } catch {}
  }

  // Add new columns if missing
  if (!columns.includes('device_id')) {
    try { db.exec('ALTER TABLE records ADD COLUMN device_id TEXT'); } catch {}
  }
  if (!columns.includes('referral_type') && !columns.includes('referral')) {
    try { db.exec('ALTER TABLE records ADD COLUMN referral_type TEXT'); } catch {}
  }
}

function setDeviceId(id) {
  currentDeviceId = id;
}

function getDeviceId() {
  return currentDeviceId;
}

// ==========================================
// RECORDS
// ==========================================

function getAllRecords() {
  return db.prepare('SELECT * FROM records WHERE deleted = 0').all().map(rowToRecord);
}

function saveRecord(record) {
  const deviceId = record.deviceId || currentDeviceId;
  const existing = db.prepare('SELECT id FROM records WHERE id = ?').get(record.id);
  if (existing) {
    db.prepare(`
      UPDATE records SET
        device_id=?, site=?, date=?, mrn=?, given_name=?, family_name=?, name=?,
        sex=?, dob=?, phone=?, pregnant=?, breastfeeding=?,
        temp=?, bp=?, weight=?,
        allergies=?, current_meds=?, pmh=?, chief_concern=?,
        labs_json=?, lab_comments=?, urinalysis_json=?, blood_glucose=?,
        diagnosis=?, medications_json=?, treatment_notes=?, treatment=?,
        procedures_json=?, referral_type=?, provider=?, notes=?,
        age_estimated=?, saved_at=?,
        sync_version = sync_version + 1
      WHERE id=?
    `).run(
      deviceId, record.site, record.date, record.mrn,
      record.givenName, record.familyName, record.name,
      record.sex, record.dob, record.phone, record.pregnant, record.breastfeeding,
      record.temp, record.bp, record.weight,
      record.allergies, record.currentMeds, record.pmh, record.chiefConcern,
      JSON.stringify(record.labs || {}), record.labComments,
      JSON.stringify(record.urinalysis || {}), record.bloodGlucose,
      record.diagnosis, JSON.stringify(record.medications || []),
      record.treatmentNotes, record.treatment,
      JSON.stringify(record.procedures || []),
      record.referralType, record.provider, record.notes,
      record.ageEstimated ? 1 : 0, record.savedAt || new Date().toISOString(),
      record.id
    );
  } else {
    db.prepare(`
      INSERT INTO records (
        id, device_id, site, date, mrn, given_name, family_name, name,
        sex, dob, phone, pregnant, breastfeeding,
        temp, bp, weight,
        allergies, current_meds, pmh, chief_concern,
        labs_json, lab_comments, urinalysis_json, blood_glucose,
        diagnosis, medications_json, treatment_notes, treatment,
        procedures_json, referral_type, provider, notes,
        age_estimated, saved_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      record.id, deviceId, record.site, record.date, record.mrn,
      record.givenName, record.familyName, record.name,
      record.sex, record.dob, record.phone, record.pregnant, record.breastfeeding,
      record.temp, record.bp, record.weight,
      record.allergies, record.currentMeds, record.pmh, record.chiefConcern,
      JSON.stringify(record.labs || {}), record.labComments,
      JSON.stringify(record.urinalysis || {}), record.bloodGlucose,
      record.diagnosis, JSON.stringify(record.medications || []),
      record.treatmentNotes, record.treatment,
      JSON.stringify(record.procedures || []),
      record.referralType, record.provider, record.notes,
      record.ageEstimated ? 1 : 0, record.savedAt || new Date().toISOString()
    );
  }
  return getAllRecords();
}

// Save a record pulled from another device — does NOT increment sync_version
function saveRemoteRecord(record) {
  const existing = db.prepare('SELECT id FROM records WHERE id = ?').get(record.id);
  if (existing) {
    db.prepare(`
      UPDATE records SET
        device_id=?, site=?, date=?, mrn=?, given_name=?, family_name=?, name=?,
        sex=?, dob=?, phone=?, pregnant=?, breastfeeding=?,
        temp=?, bp=?, weight=?,
        allergies=?, current_meds=?, pmh=?, chief_concern=?,
        labs_json=?, lab_comments=?, urinalysis_json=?, blood_glucose=?,
        diagnosis=?, medications_json=?, treatment_notes=?, treatment=?,
        procedures_json=?, referral_type=?, provider=?, notes=?,
        age_estimated=?, saved_at=?, deleted=?,
        sync_version=1, synced_version=1
      WHERE id=?
    `).run(
      record.deviceId, record.site, record.date, record.mrn,
      record.givenName, record.familyName, record.name,
      record.sex, record.dob, record.phone, record.pregnant, record.breastfeeding,
      record.temp, record.bp, record.weight,
      record.allergies, record.currentMeds, record.pmh, record.chiefConcern,
      JSON.stringify(record.labs || {}), record.labComments,
      JSON.stringify(record.urinalysis || {}), record.bloodGlucose,
      record.diagnosis, JSON.stringify(record.medications || []),
      record.treatmentNotes, record.treatment,
      JSON.stringify(record.procedures || []),
      record.referralType, record.provider, record.notes,
      record.ageEstimated ? 1 : 0, record.savedAt || new Date().toISOString(),
      record.deleted ? 1 : 0,
      record.id
    );
  } else {
    db.prepare(`
      INSERT INTO records (
        id, device_id, site, date, mrn, given_name, family_name, name,
        sex, dob, phone, pregnant, breastfeeding,
        temp, bp, weight,
        allergies, current_meds, pmh, chief_concern,
        labs_json, lab_comments, urinalysis_json, blood_glucose,
        diagnosis, medications_json, treatment_notes, treatment,
        procedures_json, referral_type, provider, notes,
        age_estimated, saved_at, deleted,
        sync_version, synced_version
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,1)
    `).run(
      record.id, record.deviceId, record.site, record.date, record.mrn,
      record.givenName, record.familyName, record.name,
      record.sex, record.dob, record.phone, record.pregnant, record.breastfeeding,
      record.temp, record.bp, record.weight,
      record.allergies, record.currentMeds, record.pmh, record.chiefConcern,
      JSON.stringify(record.labs || {}), record.labComments,
      JSON.stringify(record.urinalysis || {}), record.bloodGlucose,
      record.diagnosis, JSON.stringify(record.medications || []),
      record.treatmentNotes, record.treatment,
      JSON.stringify(record.procedures || []),
      record.referralType, record.provider, record.notes,
      record.ageEstimated ? 1 : 0, record.savedAt || new Date().toISOString(),
      record.deleted ? 1 : 0
    );
  }
}

function deleteRecord(recordId) {
  db.prepare('UPDATE records SET deleted = 1, sync_version = sync_version + 1 WHERE id = ?').run(recordId);
  return getAllRecords();
}

function rowToRecord(row) {
  return {
    id: row.id,
    deviceId: row.device_id,
    site: row.site,
    date: row.date,
    mrn: row.mrn,
    givenName: row.given_name,
    familyName: row.family_name,
    name: row.name,
    sex: row.sex,
    dob: row.dob,
    phone: row.phone,
    pregnant: row.pregnant,
    breastfeeding: row.breastfeeding,
    temp: row.temp,
    bp: row.bp,
    weight: row.weight,
    allergies: row.allergies,
    currentMeds: row.current_meds,
    pmh: row.pmh,
    chiefConcern: row.chief_concern,
    labs: safeJsonParse(row.labs_json, {}),
    labComments: row.lab_comments,
    urinalysis: safeJsonParse(row.urinalysis_json, {}),
    bloodGlucose: row.blood_glucose,
    diagnosis: row.diagnosis,
    medications: safeJsonParse(row.medications_json, []),
    treatmentNotes: row.treatment_notes,
    treatment: row.treatment,
    procedures: safeJsonParse(row.procedures_json, []),
    referralType: row.referral_type,
    provider: row.provider,
    notes: row.notes,
    ageEstimated: !!row.age_estimated,
    savedAt: row.saved_at
  };
}

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// ==========================================
// CONFIG
// ==========================================

function getConfig(key, defaultValue) {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
  if (row) {
    try { return JSON.parse(row.value); } catch { return row.value; }
  }
  if (defaultValue !== undefined) {
    setConfig(key, defaultValue);
    return defaultValue;
  }
  return null;
}

function setConfig(key, value) {
  const json = JSON.stringify(value);
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, json);
}

// ==========================================
// SYNC HELPERS
// ==========================================

function getRecordRow(id) {
  return db.prepare('SELECT * FROM records WHERE id = ?').get(id);
}

function getUnsyncedRecords() {
  return db.prepare('SELECT * FROM records WHERE sync_version > synced_version').all().map(rowToRecord);
}

function markSynced(recordId, syncVersion) {
  db.prepare('UPDATE records SET synced_version = ? WHERE id = ?').run(syncVersion, recordId);
}

function getLastPullTimestamp() {
  return getConfig('setting:lastPullTimestamp') || '1970-01-01T00:00:00Z';
}

function setLastPullTimestamp(ts) {
  setConfig('setting:lastPullTimestamp', ts);
}

function getLastConfigPullTimestamp() {
  return getConfig('setting:lastConfigPullTimestamp') || '1970-01-01T00:00:00Z';
}

function setLastConfigPullTimestamp(ts) {
  setConfig('setting:lastConfigPullTimestamp', ts);
}

function close() {
  if (db) db.close();
}

module.exports = {
  init,
  setDeviceId,
  getDeviceId,
  getAllRecords,
  saveRecord,
  saveRemoteRecord,
  deleteRecord,
  getConfig,
  setConfig,
  getRecordRow,
  getUnsyncedRecords,
  markSynced,
  getLastPullTimestamp,
  setLastPullTimestamp,
  getLastConfigPullTimestamp,
  setLastConfigPullTimestamp,
  close
};
