const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const database = require('./database');
const sync = require('./sync');

// Default data - seeded into config on first launch
const DEFAULT_SITES = ['Mpunge', 'Bunakijja', 'Terere', 'Ntenjeru'];
const DEFAULT_PHYSICIANS = ['Damico', 'Erhardt', 'Gloria', 'Stevens', 'Lytle', 'Johnathan', 'Maureen', 'Justine', 'Molly', 'Other'];
const DEFAULT_PROCEDURES = ['I&D (Incision & Drainage)', 'Wound Closure/Sutures', 'Wound Debridement', 'Joint Injection', 'Nail Removal', 'Foreign Body Removal', 'Splinting/Casting', 'Abscess Drainage', 'Ear Irrigation', 'Cryotherapy'];
const DEFAULT_REFERRAL_TYPES = ['None', 'Surgery', 'Follow-up', 'Specialist', 'Hospital', 'Lab Work'];

const DEFAULT_FORMULARY = [
  { id: 'abx-amox500', name: 'Amoxicillin 500mg', dose: '500mg', unit: 'caps', category: 'Antibiotics', controlled: false },
  { id: 'abx-amox250', name: 'Amoxicillin 250mg', dose: '250mg', unit: 'caps', category: 'Antibiotics', controlled: false },
  { id: 'abx-azithro250', name: 'Azithromycin 250mg', dose: '500mg', unit: 'tabs', category: 'Antibiotics', controlled: false },
  { id: 'abx-azithro1g', name: 'Azithromycin 1g single dose', dose: '1g', unit: 'tabs', category: 'Antibiotics', controlled: false },
  { id: 'abx-cipro', name: 'Ciprofloxacin 500mg', dose: '500mg', unit: 'tabs', category: 'Antibiotics', controlled: false },
  { id: 'abx-doxy', name: 'Doxycycline 100mg', dose: '100mg', unit: 'caps', category: 'Antibiotics', controlled: false },
  { id: 'abx-metro', name: 'Metronidazole 200mg', dose: '400mg', unit: 'tabs', category: 'Antibiotics', controlled: false },
  { id: 'abx-ceph', name: 'Cephalexin 250mg', dose: '500mg', unit: 'caps', category: 'Antibiotics', controlled: false },
  { id: 'abx-levo', name: 'Levofloxacin 500mg', dose: '500mg', unit: 'tabs', category: 'Antibiotics', controlled: false },
  { id: 'abx-nitro', name: 'Nitrofurantoin 100mg', dose: '100mg', unit: 'tabs', category: 'Antibiotics', controlled: false },
  { id: 'abx-ceftri', name: 'Ceftriaxone 500mg IM', dose: '500mg', unit: 'vial', category: 'Antibiotics', controlled: false },
  { id: 'abx-benza', name: 'Benzathine Penicillin 2.4MU IM', dose: '2.4MU', unit: 'vial', category: 'Antibiotics', controlled: false },
  { id: 'am-artefan', name: 'Artemether-Lumefantrine 20/120mg Artefan', dose: '4 tabs', unit: 'tabs', category: 'Antimalarials', controlled: false },
  { id: 'am-artesunate', name: 'Artesunate Inj 60mg', dose: '60mg', unit: 'vial', category: 'Antimalarials', controlled: false },
  { id: 'af-griseo', name: 'Griseofulvin 500mg', dose: '500mg', unit: 'tabs', category: 'Antifungals', controlled: false },
  { id: 'af-fluco', name: 'Fluconazole 200mg', dose: '150mg', unit: 'caps', category: 'Antifungals', controlled: false },
  { id: 'af-clotrim', name: 'Clotrimazole cream 1%', dose: 'apply', unit: 'cream', category: 'Antifungals', controlled: false },
  { id: 'af-nystatin', name: 'Nystatin suspension 500k IU', dose: '1ml', unit: 'drops', category: 'Antifungals', controlled: false },
  { id: 'ap-alben', name: 'Albendazole 400mg', dose: '400mg', unit: 'tabs', category: 'Antiparasitic', controlled: false },
  { id: 'ap-iverm', name: 'Ivermectin 3mg', dose: '200mcg/kg', unit: 'tabs', category: 'Antiparasitic', controlled: false },
  { id: 'ap-prazi', name: 'Praziquantel 600mg', dose: '600mg', unit: 'tabs', category: 'Antiparasitic', controlled: false },
  { id: 'an-ibu', name: 'Ibuprofen 200mg', dose: '400mg', unit: 'tabs', category: 'Analgesics', controlled: false },
  { id: 'an-para500', name: 'Paracetamol 500mg', dose: '1g', unit: 'tabs', category: 'Analgesics', controlled: false },
  { id: 'an-parasyr', name: 'Paracetamol 120mg/5ml syrup', dose: '5ml', unit: 'ml', category: 'Analgesics', controlled: false },
  { id: 'gi-omep', name: 'Omeprazole 20mg', dose: '20mg', unit: 'caps', category: 'GI', controlled: false },
  { id: 'gi-loper', name: 'Loperamide 2mg', dose: '4mg', unit: 'caps', category: 'GI', controlled: false },
  { id: 'gi-ors', name: 'ORS 1L sachet', dose: '1', unit: 'sachet', category: 'GI', controlled: false },
  { id: 'as-cetir', name: 'Cetirizine 10mg', dose: '10mg', unit: 'tabs', category: 'Allergy/Steroid', controlled: false },
  { id: 'as-pred', name: 'Prednisolone 5mg', dose: '40mg', unit: 'tabs', category: 'Allergy/Steroid', controlled: false },
  { id: 'as-dexa', name: 'Dexamethasone 8mg Inj', dose: '8mg', unit: 'vial', category: 'Allergy/Steroid', controlled: false },
  { id: 'av-acyclo', name: 'Acyclovir 200mg', dose: '400mg', unit: 'tabs', category: 'Antiviral', controlled: false },
  { id: 'vit-prenatal', name: 'Prenatal Vitamins', dose: '1 tab', unit: 'tabs', category: 'Vitamins', controlled: false },
  { id: 'vit-multi', name: 'Multivitamin', dose: '1 tab', unit: 'tabs', category: 'Vitamins', controlled: false },
  { id: 'sp-ketamine', name: 'Ketamine Inj 50mg/ml', dose: '1-2mg/kg', unit: 'vial', category: 'Surgical/Procedural', controlled: true },
  { id: 'sp-lido', name: 'Lidocaine 2% 30ml', dose: '2ml', unit: 'vial', category: 'Surgical/Procedural', controlled: false },
  { id: 'sp-adrenaline', name: 'Adrenaline Inj', dose: '0.5ml', unit: 'vial', category: 'Surgical/Procedural', controlled: false },
  { id: 'sp-diaz', name: 'Diazepam Inj', dose: '10mg', unit: 'vial', category: 'Surgical/Procedural', controlled: true },
  { id: 'sp-ns', name: 'Normal Saline 500ml', dose: '500ml', unit: 'vial', category: 'Surgical/Procedural', controlled: false }
];

const DEFAULT_RX_PRESETS = [
  { name: 'H. pylori Triple Therapy', rx: 'Amoxicillin 1g q12h 14d + Metronidazole 400mg q12h 14d + Omeprazole 20mg q12h 14d', meds: [
    { medId: 'abx-amox500', dose: '1g', freq: 'q12h', duration: '14d' },
    { medId: 'abx-metro', dose: '400mg', freq: 'q12h', duration: '14d' },
    { medId: 'gi-omep', dose: '20mg', freq: 'q12h', duration: '14d' }
  ]},
  { name: 'Malaria >35kg', rx: 'Artefan 4 tabs PO q12h \u00d7 3d', meds: [
    { medId: 'am-artefan', dose: '4 tabs', freq: 'q12h', duration: '3d' }
  ]},
  { name: 'Malaria 25-35kg', rx: 'Artefan 3 tabs PO q12h \u00d7 3d', meds: [
    { medId: 'am-artefan', dose: '3 tabs', freq: 'q12h', duration: '3d' }
  ]},
  { name: 'Malaria 15-25kg', rx: 'Artefan 2 tabs PO q12h \u00d7 3d', meds: [
    { medId: 'am-artefan', dose: '2 tabs', freq: 'q12h', duration: '3d' }
  ]},
  { name: 'Malaria 5-15kg', rx: 'Artefan 1 tab PO q12h \u00d7 3d', meds: [
    { medId: 'am-artefan', dose: '1 tab', freq: 'q12h', duration: '3d' }
  ]},
  { name: 'GC/Chlamydia', rx: 'Ceftriaxone 500mg IM once + Azithromycin 1g PO once', meds: [
    { medId: 'abx-ceftri', dose: '500mg', freq: 'once', duration: 'Single dose' },
    { medId: 'abx-azithro1g', dose: '1g', freq: 'once', duration: 'Single dose' }
  ]},
  { name: 'Syphilis RPR+', rx: 'Benzathine Penicillin 2.4MU IM once + Doxycycline 100mg q12h 14d', meds: [
    { medId: 'abx-benza', dose: '2.4MU', freq: 'once', duration: 'Single dose' },
    { medId: 'abx-doxy', dose: '100mg', freq: 'q12h', duration: '14d' }
  ]},
  { name: 'Anti-helminthic', rx: 'Albendazole 400mg PO once', meds: [
    { medId: 'ap-alben', dose: '400mg', freq: 'once', duration: 'Single dose' }
  ]},
  { name: 'Vitamin Therapy', rx: 'Multivitamin 1 tab PO q24h \u00d7 14d', meds: [
    { medId: 'vit-multi', dose: '1 tab', freq: 'q24h', duration: '14d' }
  ]},
  { name: 'Corticosteroid Joint Injection', rx: 'Lidocaine 2% 2ml + Dexamethasone 8mg', meds: [
    { medId: 'sp-lido', dose: '2ml', freq: 'once', duration: 'Single dose' },
    { medId: 'as-dexa', dose: '8mg', freq: 'once', duration: 'Single dose' }
  ], notes: 'Corticosteroid joint injection performed' },
  { name: 'Pregnancy Pack', rx: 'Prenatal Vitamins 1 tab PO q24h ongoing', meds: [
    { medId: 'vit-prenatal', dose: '1 tab', freq: 'q24h', duration: 'Ongoing' }
  ]},
  { name: 'PUD/GERD', rx: 'Omeprazole 20mg PO q12h \u00d7 14d', meds: [
    { medId: 'gi-omep', dose: '20mg', freq: 'q12h', duration: '14d' }
  ]},
  { name: 'UTI', rx: 'Nitrofurantoin 100mg PO q12h \u00d7 7d', meds: [
    { medId: 'abx-nitro', dose: '100mg', freq: 'q12h', duration: '7d' }
  ]},
  { name: 'URTI/Pneumonia', rx: 'Amoxicillin 500mg PO q8h \u00d7 7d', meds: [
    { medId: 'abx-amox500', dose: '500mg', freq: 'q8h', duration: '7d' }
  ]},
  { name: 'Skin/Cellulitis', rx: 'Cephalexin 250mg PO q8h \u00d7 7d', meds: [
    { medId: 'abx-ceph', dose: '250mg', freq: 'q8h', duration: '7d' }
  ]},
  { name: 'Tinea/Fungal', rx: 'Griseofulvin 500mg PO q24h \u00d7 14d', meds: [
    { medId: 'af-griseo', dose: '500mg', freq: 'q24h', duration: '14d' }
  ]},
  { name: 'Candidiasis', rx: 'Fluconazole 150mg PO once', meds: [
    { medId: 'af-fluco', dose: '150mg', freq: 'once', duration: 'Single dose' }
  ]},
  { name: 'Typhoid', rx: 'Ciprofloxacin 500mg PO q12h \u00d7 7d', meds: [
    { medId: 'abx-cipro', dose: '500mg', freq: 'q12h', duration: '7d' }
  ]},
  { name: 'Allergic Reaction', rx: 'Cetirizine 10mg PO q24h 7d + Prednisolone 5mg PO q24h 5d', meds: [
    { medId: 'as-cetir', dose: '10mg', freq: 'q24h', duration: '7d' },
    { medId: 'as-pred', dose: '5mg', freq: 'q24h', duration: '5d' }
  ]},
  { name: 'Scabies', rx: 'See treatment notes', meds: [], notes: 'Scabies treatment \u2014 see treatment notes' },
  { name: 'Viral URTI', rx: 'Paracetamol 500mg PO q8h 5d + Cetirizine 10mg PO q24h 5d', meds: [
    { medId: 'an-para500', dose: '500mg', freq: 'q8h', duration: '5d' },
    { medId: 'as-cetir', dose: '10mg', freq: 'q24h', duration: '5d' }
  ]},
  { name: 'MSK Pain', rx: 'Ibuprofen 400mg PO q8h \u00d7 5d', meds: [
    { medId: 'an-ibu', dose: '400mg', freq: 'q8h', duration: '5d' }
  ]}
];

function register(mainWindow) {
  // ==========================================
  // RECORDS
  // ==========================================
  ipcMain.handle('get-records', () => database.getAllRecords());

  ipcMain.handle('save-record', (event, record) => database.saveRecord(record));

  ipcMain.handle('delete-record', (event, recordId) => database.deleteRecord(recordId));

  // ==========================================
  // CONFIG: Sites
  // ==========================================
  ipcMain.handle('config:getSites', () => database.getConfig('sites', DEFAULT_SITES));

  ipcMain.handle('config:saveSites', (event, sites) => {
    database.setConfig('sites', sites);
    return sites;
  });

  // ==========================================
  // CONFIG: Providers
  // ==========================================
  ipcMain.handle('config:getProviders', () => database.getConfig('providers', DEFAULT_PHYSICIANS));

  ipcMain.handle('config:saveProviders', (event, providers) => {
    database.setConfig('providers', providers);
    return providers;
  });

  // ==========================================
  // CONFIG: Formulary
  // ==========================================
  ipcMain.handle('config:getFormulary', () => database.getConfig('formulary', DEFAULT_FORMULARY));

  ipcMain.handle('config:saveFormulary', (event, formulary) => {
    database.setConfig('formulary', formulary);
    return formulary;
  });

  // ==========================================
  // CONFIG: Rx Presets
  // ==========================================
  ipcMain.handle('config:getRxPresets', () => database.getConfig('rxPresets', DEFAULT_RX_PRESETS));

  ipcMain.handle('config:saveRxPresets', (event, presets) => {
    database.setConfig('rxPresets', presets);
    return presets;
  });

  // ==========================================
  // CONFIG: Procedures
  // ==========================================
  ipcMain.handle('config:getProcedures', () => database.getConfig('procedures', DEFAULT_PROCEDURES));

  ipcMain.handle('config:saveProcedures', (event, procedures) => {
    database.setConfig('procedures', procedures);
    return procedures;
  });

  // ==========================================
  // CONFIG: Referral Types
  // ==========================================
  ipcMain.handle('config:getReferralTypes', () => database.getConfig('referralTypes', DEFAULT_REFERRAL_TYPES));

  ipcMain.handle('config:saveReferralTypes', (event, types) => {
    database.setConfig('referralTypes', types);
    return types;
  });

  // ==========================================
  // DEVICE IDENTITY
  // ==========================================
  ipcMain.handle('device:getId', () => database.getDeviceId());

  ipcMain.handle('device:register', async (event, deviceName) => {
    const deviceId = deviceName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);
    database.setDeviceId(deviceId);
    database.setConfig('setting:deviceId', deviceId);
    database.setConfig('setting:deviceName', deviceName);

    // If Supabase is connected, register device in cloud
    const creds = sync.getCredentials();
    if (creds.url && creds.key) {
      try {
        await fetch(`${creds.url}/rest/v1/devices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': creds.key,
            'Authorization': `Bearer ${creds.key}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ id: deviceId, name: deviceName })
        });
      } catch {}
    }

    return deviceId;
  });

  // ==========================================
  // SETTINGS (last site, supabase config, etc.)
  // ==========================================
  ipcMain.handle('settings:get', (event, key) => database.getConfig(`setting:${key}`));

  ipcMain.handle('settings:set', (event, key, value) => {
    database.setConfig(`setting:${key}`, value);
    return value;
  });

  // ==========================================
  // CSV EXPORT
  // ==========================================
  ipcMain.handle('export-csv', async (event, csvContent) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Records as CSV',
      defaultPath: `DH-EMR-Export-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, csvContent, 'utf8');
      return true;
    }
    return false;
  });

  // ==========================================
  // SETUP WIZARD
  // ==========================================
  ipcMain.handle('setup:verifyTables', async (event, url, key) => {
    try {
      const tables = ['records', 'devices', 'config'];
      for (const table of tables) {
        const res = await fetch(`${url}/rest/v1/${table}?limit=0`, {
          headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        if (!res.ok) return { ok: false, error: `Table "${table}" not found or not accessible (HTTP ${res.status})` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('setup:seedConfig', async (event, url, key) => {
    try {
      const configs = [
        { key: 'sites', value: DEFAULT_SITES },
        { key: 'providers', value: DEFAULT_PHYSICIANS },
        { key: 'formulary', value: DEFAULT_FORMULARY },
        { key: 'rxPresets', value: DEFAULT_RX_PRESETS },
        { key: 'procedures', value: DEFAULT_PROCEDURES },
        { key: 'referralTypes', value: DEFAULT_REFERRAL_TYPES }
      ];
      for (const cfg of configs) {
        const res = await fetch(`${url}/rest/v1/config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ key: cfg.key, value: cfg.value, updated_at: new Date().toISOString() })
        });
        if (!res.ok) {
          const errText = await res.text();
          return { ok: false, error: `Failed to seed "${cfg.key}": ${errText}` };
        }
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // ==========================================
  // SYNC
  // ==========================================
  ipcMain.handle('sync:getStatus', () => sync.getStatus());

  ipcMain.handle('sync:updateCredentials', (event, url, key) => {
    sync.updateCredentials(url, key);
    return sync.getStatus();
  });

  ipcMain.handle('sync:now', async () => {
    await sync.syncNow();
    return sync.getStatus();
  });
}

module.exports = { register };
