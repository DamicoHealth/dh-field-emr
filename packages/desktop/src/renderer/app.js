// ==========================================
// INIT & EVENT LISTENERS
// ==========================================
async function init() {
  // Check if Supabase is configured — if not, show setup wizard
  const supabaseUrl = await window.electronAPI.getSetting('supabaseUrl');
  const supabaseKey = await window.electronAPI.getSetting('supabaseKey');

  if (!supabaseUrl || !supabaseKey) {
    // No cloud credentials — show setup wizard
    showSetupWizard();
    return;
  }

  // Check device identity — show sign-in if not registered
  currentDeviceId = await window.electronAPI.getDeviceId();
  if (!currentDeviceId) {
    showDeviceSignIn();
    return;
  }

  await launchApp();
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
  populateSiteSelects();
  renderRecords();
  renderStats();
  renderFormulary();
  renderProviders();
  renderSites();
  renderProceduresEditor();
  renderRxPresetsEditor();
  renderLabGrid();
  renderDxPresets();
  renderRxPresets();
  renderComplaintButtons();
  renderWeightRanges();
  renderProviderButtons();
  renderProcedureButtons();
  populateReferralSelect();
  setupEventListeners();
  initSyncUI();
}

// NAVIGATION
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + btn.dataset.screen).classList.add('active');
    if (btn.dataset.screen === 'analytics') renderAnalytics();
  });
});

// EVENT LISTENERS
function setupEventListeners() {
  document.getElementById('btnNewEncounter').addEventListener('click', newEncounter);
  document.querySelectorAll('.panel-tab').forEach(tab => { tab.addEventListener('click', () => switchTab(tab.dataset.tab)); });
  document.getElementById('panelClose').addEventListener('click', closePanel);
  document.getElementById('btnAddMedLine').addEventListener('click', () => addMedLine());
  // Toggle buttons
  initToggleGroup('sexToggle', () => { updateSexDependentFields(); updateMRN(); });
  initToggleGroup('pregnantToggle');
  initToggleGroup('bfToggle');
  // Urinalysis toggle groups
  UA_PARAMS.forEach(p => initToggleGroup(UA_FIELD_IDS[p]));
  // MRN and age
  document.getElementById('fDOB').addEventListener('change', () => { updateAgeDisplay(); updateMRN(); renderWeightRanges(); });
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
  // Temp range buttons
  document.querySelectorAll('.temp-range-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      selectedTemp = selectedTemp === this.textContent ? '' : this.textContent;
      highlightTempRange();
    });
  });
  // Blood glucose
  document.getElementById('fBloodGlucose').addEventListener('input', updateBloodGlucoseInterp);
  // Sex change — update weight ranges
  document.querySelectorAll('#sexToggle .btn-toggle').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(renderWeightRanges, 50));
  });
  // Dx sort bar
  document.getElementById('dxSortBar').addEventListener('click', function(e) {
    const btn = e.target.closest('.dx-sort-btn');
    if (!btn) return;
    dxSortMode = btn.dataset.sort;
    this.querySelectorAll('.dx-sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderDxPresets();
  });
  document.getElementById('fSite').addEventListener('change', function() {
    setLastSite(this.value);
  });
  document.getElementById('searchInput').addEventListener('input', renderRecords);
  document.getElementById('siteFilter').addEventListener('change', renderRecords);
  // Formulary
  document.getElementById('btnAddMed').addEventListener('click', () => openFormularyModal());
  document.getElementById('fmCancel').addEventListener('click', closeFormularyModal);
  document.getElementById('fmSave').addEventListener('click', saveFormularyItem);
  // Sites
  document.getElementById('btnAddSite').addEventListener('click', () => openSiteModal());
  document.getElementById('smCancel').addEventListener('click', closeSiteModal);
  document.getElementById('smSave').addEventListener('click', saveSiteItem);
  // Physicians
  document.getElementById('btnAddProvider').addEventListener('click', () => openProviderModal());
  document.getElementById('pmCancel').addEventListener('click', closeProviderModal);
  document.getElementById('pmSave').addEventListener('click', saveProviderItem);
  // Procedures Editor
  document.getElementById('btnAddProcedureOption').addEventListener('click', () => openProcedureModal());
  document.getElementById('procmCancel').addEventListener('click', closeProcedureModal);
  document.getElementById('procmSave').addEventListener('click', saveProcedureItem);
  // Rx Presets Editor
  document.getElementById('btnAddRxPreset').addEventListener('click', () => openRxPresetModal());
  document.getElementById('btnAddRpmMedLine').addEventListener('click', () => addRpmMedLine());
  document.getElementById('rpmCancel').addEventListener('click', closeRxPresetModal);
  document.getElementById('rpmSave').addEventListener('click', saveRxPresetItem);
  // Analytics
  ['analyticsFrom', 'analyticsTo', 'analyticsSite', 'analyticsSex'].forEach(id => { document.getElementById(id).addEventListener('change', renderAnalytics); });
  document.getElementById('analyticsReset').addEventListener('click', () => {
    document.getElementById('analyticsFrom').value = ''; document.getElementById('analyticsTo').value = '';
    document.getElementById('analyticsSite').value = ''; document.getElementById('analyticsSex').value = ''; renderAnalytics();
  });
  document.getElementById('analyticsExport').addEventListener('click', () => exportCSV(getFilteredRecords()));
  // IPC events
  window.electronAPI.onNewEncounter(() => newEncounter());
  window.electronAPI.onExportCSV(() => exportCSV());
  window.electronAPI.onRecordsRestored(async () => { records = await window.electronAPI.getRecords(); renderRecords(); renderStats(); });

  // Sync-down events — refresh when other devices push data
  window.electronAPI.onRecordsUpdated(async () => {
    records = await window.electronAPI.getRecords();
    renderRecords();
    renderStats();
  });
  window.electronAPI.onConfigUpdated(async () => {
    await loadConfig();
    populateSiteSelects();
    populateReferralSelect();
    renderFormulary();
    renderProviders();
    renderSites();
    renderProceduresEditor();
    renderRxPresetsEditor();
    renderProviderButtons();
    renderProcedureButtons();
    renderRxPresets();
    renderDxPresets();
  });
}

init();
