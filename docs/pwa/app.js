// ==========================================
// INIT & EVENT LISTENERS
// ==========================================
async function init() {
  // Check if setup has been completed previously
  const deviceId = await window.electronAPI.getDeviceId();
  const deviceName = await window.electronAPI.getSetting('deviceName');
  const isSetupComplete = deviceId && deviceName && deviceId !== 'pwa-device-001';

  // Hide setup wizard and device sign-in initially
  const wizard = document.getElementById('setupWizard');
  if (wizard) wizard.style.display = 'none';
  const signIn = document.getElementById('deviceSignIn');
  if (signIn) signIn.style.display = 'none';

  if (isSetupComplete) {
    // Setup was done before — go straight to app
    currentDeviceId = deviceId;

    // Initialize sync engine
    if (typeof pwaSync !== 'undefined') {
      await pwaSync.init();
    }

    // Hide demo modal if present
    const demoModal = document.getElementById('demoModal');
    if (demoModal) demoModal.style.display = 'none';

    await launchApp();
  } else {
    // First launch — show welcome/setup modal
    // Wire up demo disclaimer continue button to launch wizard
    const demoModal = document.getElementById('demoModal');
    const btnContinue = document.getElementById('btnDemoContinue');
    if (btnContinue && demoModal) {
      btnContinue.addEventListener('click', () => {
        demoModal.style.display = 'none';
        showSetupWizard();
      });
    }
  }
}

function showDeviceSignIn() {
  document.getElementById('deviceSignIn').style.display = '';
  document.getElementById('btnDeviceStart').addEventListener('click', async () => {
    const name = document.getElementById('deviceNameInput').value.trim();
    if (!name) { alert('Please enter a device name.'); return; }
    currentDeviceId = await window.electronAPI.registerDevice(name);
    document.getElementById('deviceSignIn').style.display = 'none';
    await launchApp();
  });
  // Allow Enter key
  document.getElementById('deviceNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btnDeviceStart').click();
  });
}

async function launchApp() {
  await loadConfig();
  records = await window.electronAPI.getRecords();
  const renderSteps = [
    ['populateSiteSelects', () => populateSiteSelects()],
    ['initAdvancedFilters', () => initAdvancedFilters()],
    ['renderRecords', () => renderRecords()],
    ['renderStats', () => renderStats()],
    ['renderDashboard', () => renderDashboard()],
    ['renderFormulary', () => renderFormulary()],
    ['renderProviders', () => renderProviders()],
    ['renderSites', () => renderSites()],
    ['renderProceduresEditor', () => renderProceduresEditor()],
    ['renderRxPresetsEditor', () => renderRxPresetsEditor()],
    ['renderReferralTypesEditor', () => renderReferralTypesEditor()],
    ['renderDxPresetsEditor', () => renderDxPresetsEditor()],
    ['renderComplaintsEditor', () => renderComplaintsEditor()],
    ['renderLabTestsEditor', () => renderLabTestsEditor()],
    ['renderLabGrid', () => renderLabGrid()],
    ['renderDxPresets', () => renderDxPresets()],
    ['renderRxPresets', () => renderRxPresets()],
    ['renderComplaintButtons', () => renderComplaintButtons()],
    ['renderWeightRanges', () => renderWeightRanges()],
    ['renderProviderButtons', () => renderProviderButtons()],
    ['renderProcedureButtons', () => renderProcedureButtons()],
    ['renderReferralButtons', () => renderReferralButtons()],
    ['renderBPRanges', () => renderBPRanges()],
    ['updateConfigLockUI', () => updateConfigLockUI()]
  ];
  for (const [name, fn] of renderSteps) {
    try { fn(); } catch (e) { console.error(`launchApp: ${name} failed:`, e); }
  }
  setupEventListeners();

  // Check standalone mode — skip sync and hide sync indicator
  const isStandalone = isStandaloneMode();
  if (isStandalone) {
    const syncIndicator = document.getElementById('syncIndicator');
    if (syncIndicator) syncIndicator.style.display = 'none';
  } else {
    initSyncUI();
  }
}

// NAVIGATION
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + btn.dataset.screen).classList.add('active');
    if (btn.dataset.screen === 'analytics') renderAnalytics();
    if (btn.dataset.screen === 'scheduling') renderScheduling();
    if (btn.dataset.screen === 'admin') renderAdminScreen();
  });
});

// EVENT LISTENERS
function _bindClick(id, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', handler);
  else console.warn('setupEventListeners: element not found:', id);
}

function setupEventListeners() {
  _bindClick('btnNewEncounter', newEncounter);
  // Scheduling
  _bindClick('scheduleRefresh', () => { if (typeof renderScheduling === 'function') renderScheduling(); });
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('[panel-tab] clicked:', tab.dataset.tab);
      switchTab(tab.dataset.tab);
    });
  });
  _bindClick('panelClose', closePanel);
  _bindClick('btnAddMedLine', () => addMedLine());
  // Toggle buttons
  try {
    initToggleGroup('sexToggle', () => { updateSexDependentFields(); updateMRN(); });
    initToggleGroup('pregnantToggle');
    initToggleGroup('bfToggle');
    initToggleGroup('transportToggle');
    // Imaging toggle
    initToggleGroup('imagingToggle', (val) => {
      document.getElementById('imagingDetails').style.display = val === 'Ultrasound' ? 'block' : 'none';
      if (val !== 'Ultrasound') {
        selectedImagingType = '';
        document.querySelectorAll('#imagingTypeGrid .complaint-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById('fImagingFindings').value = '';
      }
    });
    // Surgery toggle
    initToggleGroup('surgeryToggle', (val) => {
      document.getElementById('surgeryDetails').style.display = val === 'Yes' ? 'block' : 'none';
      if (val !== 'Yes') {
        document.getElementById('fSurgeryType').value = '';
        document.getElementById('fSurgeryNotes').value = '';
      }
    });
    // Urinalysis toggle groups
    UA_PARAMS.forEach(p => initToggleGroup(UA_FIELD_IDS[p]));
  } catch (e) { console.error('setupEventListeners: toggle init error', e); }
  // Imaging type buttons
  document.querySelectorAll('#imagingTypeGrid .complaint-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#imagingTypeGrid .complaint-btn').forEach(b => b.classList.remove('selected'));
      if (selectedImagingType === btn.dataset.val) {
        selectedImagingType = '';
      } else {
        selectedImagingType = btn.dataset.val;
        btn.classList.add('selected');
      }
    });
  });
  // MRN and age
  try {
    // DOB text input auto-formatter (demo only — replaces date picker)
    if (typeof initDOBTextInput === 'function') initDOBTextInput();
    document.getElementById('fDOB').addEventListener('change', () => { updateAgeDisplay(); updateMRN(); renderWeightRanges(); });
    document.getElementById('fDOB').addEventListener('blur', () => { updateAgeDisplay(); updateMRN(); renderWeightRanges(); });
    document.getElementById('fGivenName').addEventListener('input', updateMRN);
    document.getElementById('fFamilyName').addEventListener('input', updateMRN);
    // DOB Unknown checkbox
    document.getElementById('fDOBUnknown').addEventListener('change', function() {
      dobUnknown = this.checked;
      document.getElementById('fDOB').style.display = dobUnknown ? 'none' : '';
      document.getElementById('ageInputContainer').style.display = dobUnknown ? 'flex' : 'none';
      if (!dobUnknown) { document.getElementById('fAgeEstimate').value = ''; }
    });
    document.getElementById('fAgeEstimate').addEventListener('input', function() {
      const age = parseInt(this.value);
      if (age >= 0 && age < 150) {
        const yr = new Date().getFullYear() - age;
        document.getElementById('fDOB').value = yr + '-01-01';
        updateAgeDisplay(); updateMRN(); renderWeightRanges();
      }
    });
  } catch (e) { console.error('setupEventListeners: form fields error', e); }
  // Temp range buttons
  document.querySelectorAll('.temp-range-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const val = this.dataset.temp;
      selectedTemp = selectedTemp === val ? '' : val;
      highlightTempRange();
    });
  });
  // Blood glucose is now handled in the lab grid
  // Sex change — update weight ranges
  document.querySelectorAll('#sexToggle .btn-toggle').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(renderWeightRanges, 50));
  });
  // Dx sort bar
  _bindClick('dxSortBar', function(e) {
    const btn = e.target.closest('.dx-sort-btn');
    if (!btn) return;
    dxSortMode = btn.dataset.sort;
    this.querySelectorAll('.dx-sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderDxPresets();
  });
  const fSiteEl = document.getElementById('fSite');
  if (fSiteEl) fSiteEl.addEventListener('change', function() { setLastSite(this.value); });
  const searchEl = document.getElementById('searchInput');
  if (searchEl) searchEl.addEventListener('input', renderRecords);
  const siteFilterEl = document.getElementById('siteFilter');
  if (siteFilterEl) siteFilterEl.addEventListener('change', renderRecords);
  // Formulary
  _bindClick('btnAddMed', () => openFormularyModal());
  _bindClick('fmCancel', closeFormularyModal);
  _bindClick('fmSave', saveFormularyItem);
  // Sites
  _bindClick('btnAddSite', () => openSiteModal());
  _bindClick('smCancel', closeSiteModal);
  _bindClick('smSave', saveSiteItem);
  // Physicians
  _bindClick('btnAddProvider', () => openProviderModal());
  _bindClick('pmCancel', closeProviderModal);
  _bindClick('pmSave', saveProviderItem);
  // Procedures Editor
  _bindClick('btnAddProcedureOption', () => openProcedureModal());
  _bindClick('procmCancel', closeProcedureModal);
  _bindClick('procmSave', saveProcedureItem);
  // Complaints Editor
  _bindClick('btnAddComplaint', async () => {
    console.log('[btnAddComplaint] handler fired');
    const name = await customPrompt('Add a new chief complaint:');
    if (!name || !name.trim()) return;
    const complaints = getComplaints();
    complaints.push(name.trim());
    saveComplaints(complaints);
    COMMON_COMPLAINTS = complaints;
    renderComplaintsEditor(); renderComplaintButtons();
  });
  // Referral Types Editor
  _bindClick('btnAddReferralType', async () => {
    console.log('[btnAddReferralType] handler fired');
    const name = await customPrompt('Add a new referral type:');
    if (!name || !name.trim()) return;
    const types = getReferralTypes();
    types.push(name.trim());
    saveReferralTypes(types); renderReferralTypesEditor(); populateReferralSelect();
  });
  // Dx Presets Editor
  _bindClick('btnAddDxPreset', () => { console.log('[btnAddDxPreset] handler fired'); addDxPresetItem(); });
  // Lab Tests Editor
  _bindClick('btnAddLabTest', () => addCustomLabTest());
  _bindClick('ltmCancel', closeLabTestModal);
  _bindClick('ltmSave', saveLabTestItem);
  // Rx Presets Editor
  _bindClick('btnAddRxPreset', () => openRxPresetModal());
  _bindClick('btnAddRpmMedLine', () => addRpmMedLine());
  _bindClick('rpmCancel', closeRxPresetModal);
  _bindClick('rpmSave', saveRxPresetItem);
  // Analytics
  ['analyticsFrom', 'analyticsTo', 'analyticsSite', 'analyticsSex'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', renderAnalytics);
  });
  _bindClick('analyticsReset', () => {
    document.getElementById('analyticsFrom').value = ''; document.getElementById('analyticsTo').value = '';
    document.getElementById('analyticsSite').value = ''; document.getElementById('analyticsSex').value = ''; renderAnalytics();
  });
  _bindClick('analyticsExport', () => exportCSV(getFilteredRecords()));
  _bindClick('btnDonorReport', generateDonorReport);

  // IPC events
  window.electronAPI.onNewEncounter(() => newEncounter());
  window.electronAPI.onExportCSV(() => exportCSV());
  window.electronAPI.onRecordsRestored(async () => { records = await window.electronAPI.getRecords(); renderRecords(); renderStats(); renderDashboard(); });

  // Sync-down events — refresh when other devices push data
  window.electronAPI.onRecordsUpdated(async () => {
    records = await window.electronAPI.getRecords();
    renderRecords();
    renderStats();
    renderDashboard();
  });
  window.electronAPI.onConfigUpdated(async () => {
    await loadConfig();
    populateSiteSelects();
    populateFilterDropdowns();
    populateReferralSelect();
    updateConfigLockUI();
    renderFormulary();
    renderProviders();
    renderSites();
    renderProceduresEditor();
    renderRxPresetsEditor();
    renderReferralTypesEditor();
    renderDxPresetsEditor();
    renderLabTestsEditor();
    renderProviderButtons();
    renderProcedureButtons();
    renderRxPresets();
    renderDxPresets();
    // Section visibility removed — all sections always visible
  });
}

init();
