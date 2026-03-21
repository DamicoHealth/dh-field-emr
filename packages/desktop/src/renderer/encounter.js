// ==========================================
// ENCOUNTER PANEL
// ==========================================
function openPanel() {
  document.getElementById('encounterPanel').classList.add('open');
}
function closePanel() {
  document.getElementById('encounterPanel').classList.remove('open');
  editingRecordId = null;
  panelMode = 'new';
}
function switchTab(tabName) {
  document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.panel-tab[data-tab="${tabName}"]`).classList.add('active');
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
  if (tabName === 'view') renderViewRecord();
}

function newEncounter() {
  panelMode = 'new';
  editingRecordId = null;
  selectedDxPresets = new Set();
  selectedRxPresets = new Set();
  selectedComplaints = new Set();
  resetForm();
  const lastSite = getLastSite();
  if (lastSite) {
    document.getElementById('fSite').value = lastSite;
  }
  renderDxPresets();
  renderRxPresets();
  document.getElementById('panelTitle').textContent = 'New Encounter';
  document.getElementById('btnDeleteRecord').style.display = 'none';
  document.getElementById('btnDeleteRecordView').style.display = 'none';
  document.getElementById('btnSaveNewRecord').style.display = '';
  switchTab('triage');
  openPanel();
}

function openRecord(id) {
  const rec = records.find(r => r.id === id);
  if (!rec) return;
  panelMode = 'view';
  editingRecordId = id;
  selectedDxPresets = new Set();
  selectedRxPresets = new Set();
  selectedComplaints = new Set();
  populateForm(rec);
  renderDxPresets();
  renderRxPresets();
  const recDisplayName = rec.givenName ? [rec.givenName, rec.familyName].filter(Boolean).join(' ') : rec.name;
  document.getElementById('panelTitle').textContent = `Record: ${recDisplayName || 'Unknown'}`;
  document.getElementById('btnDeleteRecord').style.display = '';
  document.getElementById('btnDeleteRecordView').style.display = '';
  document.getElementById('btnSaveNewRecord').style.display = 'none';
  switchTab('view');
  openPanel();
}

function editRecord() {
  panelMode = 'edit';
  const gn = document.getElementById('fGivenName').value;
  const fn = document.getElementById('fFamilyName').value;
  document.getElementById('panelTitle').textContent = `Editing: ${[gn, fn].filter(Boolean).join(' ') || 'Unknown'}`;
  switchTab('triage');
}

function resetForm() {
  document.getElementById('fSite').value = '';
  document.getElementById('fDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('fMRN').value = '';
  document.getElementById('fGivenName').value = '';
  document.getElementById('fFamilyName').value = '';
  setToggleValue('sexToggle', '');
  document.getElementById('fDOB').value = '';
  document.getElementById('ageDisplay').textContent = '';
  dobUnknown = false;
  document.getElementById('fDOBUnknown').checked = false;
  document.getElementById('fDOB').style.display = '';
  document.getElementById('ageInputContainer').style.display = 'none';
  document.getElementById('fAgeEstimate').value = '';
  document.getElementById('fPhone').value = '256';
  setToggleValue('pregnantToggle', 'N/A');
  setToggleValue('bfToggle', 'N/A');
  updateSexDependentFields();
  selectedTemp = '';
  highlightTempRange();
  document.getElementById('fBP').value = '';
  selectedWeight = '';
  renderWeightRanges();
  document.getElementById('fAllergies').value = '';
  document.getElementById('fCurrentMeds').value = '';
  document.getElementById('fPMH').value = '';
  document.getElementById('fChiefConcern').value = '';
  selectedComplaints = new Set();
  renderComplaintButtons();
  document.getElementById('fLabComments').value = '';
  document.getElementById('fBloodGlucose').value = '';
  document.getElementById('bgInterpretation').innerHTML = '';
  UA_PARAMS.forEach(p => { setToggleValue(UA_FIELD_IDS[p], ''); });
  document.getElementById('fDiagnosis').value = '';
  document.getElementById('fTreatmentNotes').value = '';
  selectedProcedures = [];
  renderProcedureButtons();
  document.getElementById('fReferralType').value = 'None';
  selectedProvider = '';
  renderProviderButtons();
  document.getElementById('fNotes').value = '';
  resetLabs();
  document.getElementById('medBuilder').innerHTML = '';
}

function populateForm(rec) {
  document.getElementById('fSite').value = rec.site || '';
  document.getElementById('fDate').value = rec.date || '';
  document.getElementById('fMRN').value = rec.mrn || '';
  if (rec.givenName !== undefined) {
    document.getElementById('fGivenName').value = rec.givenName || '';
    document.getElementById('fFamilyName').value = rec.familyName || '';
  } else {
    const parts = (rec.name || '').split(' ');
    document.getElementById('fGivenName').value = parts[0] || '';
    document.getElementById('fFamilyName').value = parts.slice(1).join(' ') || '';
  }
  setToggleValue('sexToggle', rec.sex || '');
  document.getElementById('fDOB').value = rec.dob || '';
  if (rec.ageEstimated) {
    dobUnknown = true;
    document.getElementById('fDOBUnknown').checked = true;
    document.getElementById('fDOB').style.display = 'none';
    document.getElementById('ageInputContainer').style.display = 'block';
    document.getElementById('fAgeEstimate').value = rec.dob ? calcAge(rec.dob) : '';
  } else {
    dobUnknown = false;
    document.getElementById('fDOBUnknown').checked = false;
    document.getElementById('fDOB').style.display = '';
    document.getElementById('ageInputContainer').style.display = 'none';
  }
  updateAgeDisplay();
  updateMRN();
  document.getElementById('fPhone').value = rec.phone || '';
  setToggleValue('pregnantToggle', rec.pregnant || 'N/A');
  setToggleValue('bfToggle', rec.breastfeeding || 'N/A');
  updateSexDependentFields();
  selectedTemp = rec.temp || '';
  highlightTempRange();
  document.getElementById('fBP').value = rec.bp || '';
  selectedWeight = rec.weight || '';
  renderWeightRanges();
  document.getElementById('fAllergies').value = rec.allergies || '';
  document.getElementById('fCurrentMeds').value = rec.currentMeds || '';
  document.getElementById('fPMH').value = rec.pmh || '';
  document.getElementById('fChiefConcern').value = rec.chiefConcern || '';
  selectedComplaints = new Set();
  COMMON_COMPLAINTS.forEach((c, i) => { if (rec.chiefConcern && rec.chiefConcern.includes(c)) selectedComplaints.add(i); });
  renderComplaintButtons();
  document.getElementById('fLabComments').value = rec.labComments || '';
  document.getElementById('fBloodGlucose').value = rec.bloodGlucose || '';
  updateBloodGlucoseInterp();
  if (rec.urinalysis) {
    UA_PARAMS.forEach(p => { setToggleValue(UA_FIELD_IDS[p], rec.urinalysis[p] || ''); });
  } else {
    UA_PARAMS.forEach(p => { setToggleValue(UA_FIELD_IDS[p], ''); });
  }
  document.getElementById('fDiagnosis').value = rec.diagnosis || '';
  document.getElementById('fTreatmentNotes').value = rec.treatmentNotes || '';
  selectedProcedures = rec.procedures ? [...rec.procedures] : [];
  renderProcedureButtons();
  document.getElementById('fReferralType').value = rec.referralType || 'None';
  selectedProvider = rec.provider || '';
  renderProviderButtons();
  document.getElementById('fNotes').value = rec.notes || '';
  resetLabs();
  LAB_TESTS.forEach(t => {
    const labData = rec.labs && rec.labs[t] ? rec.labs[t] : { ordered: false, result: 'N/A' };
    const row = document.querySelector(`.lab-row[data-test="${t}"]`);
    if (!row) return;
    if (labData.result === 'POS') { row.querySelector('.lab-btn-pos').classList.add('active-pos'); }
    if (labData.result === 'NEG') { row.querySelector('.lab-btn-neg').classList.add('active-neg'); }
  });
  document.getElementById('medBuilder').innerHTML = '';
  if (rec.medications && rec.medications.length) {
    rec.medications.forEach(m => addMedLine(m.medId, m.dose, m.freq, m.duration));
  }
}

function collectFormData() {
  const labs = {};
  LAB_TESTS.forEach(t => {
    const row = document.querySelector(`.lab-row[data-test="${t}"]`);
    if (!row) { labs[t] = { ordered: false, result: 'N/A' }; return; }
    let result = 'N/A';
    if (row.querySelector('.lab-btn-pos').classList.contains('active-pos')) result = 'POS';
    else if (row.querySelector('.lab-btn-neg').classList.contains('active-neg')) result = 'NEG';
    const ordered = result !== 'N/A';
    labs[t] = { ordered, result };
  });

  const medications = [];
  document.querySelectorAll('.med-line').forEach(line => {
    const medId = line.querySelector('.med-drug-select').value;
    const dose = line.querySelector('.med-dose-input').value;
    const freq = line.querySelector('.med-freq-select').value;
    const duration = line.querySelector('.med-dur-select').value;
    if (medId) {
      const qtyInfo = calcMedQty(medId, dose, freq, duration);
      medications.push({ id: crypto.randomUUID(), medId, dose, freq, duration, qty: qtyInfo ? qtyInfo.qty : null, qtyUnit: qtyInfo ? qtyInfo.unit : null });
    }
  });

  const formulary = getFormulary();
  const treatmentLines = medications.map(m => {
    const med = formulary.find(f => f.id === m.medId);
    const name = med ? med.name : m.medId;
    const freqLabel = FREQUENCIES.find(f => f.value === m.freq)?.label || m.freq;
    return `${name} ${m.dose} ${freqLabel} x ${m.duration}`;
  });
  const treatmentNotesVal = document.getElementById('fTreatmentNotes').value;
  if (treatmentNotesVal.trim()) treatmentLines.push('Notes: ' + treatmentNotesVal.trim());

  const urinalysis = {};
  let uaOrdered = false;
  UA_PARAMS.forEach(p => {
    urinalysis[p] = getToggleValue(UA_FIELD_IDS[p]) || '';
    if (urinalysis[p]) uaOrdered = true;
  });

  const givenName = document.getElementById('fGivenName').value;
  const familyName = document.getElementById('fFamilyName').value;
  const fullName = [givenName, familyName].filter(Boolean).join(' ');

  return {
    id: editingRecordId || crypto.randomUUID(),
    site: document.getElementById('fSite').value,
    date: document.getElementById('fDate').value,
    mrn: document.getElementById('fMRN').value,
    givenName, familyName, name: fullName,
    sex: getToggleValue('sexToggle'),
    dob: document.getElementById('fDOB').value,
    phone: document.getElementById('fPhone').value,
    pregnant: getToggleValue('pregnantToggle'),
    breastfeeding: getToggleValue('bfToggle'),
    temp: selectedTemp,
    bp: document.getElementById('fBP').value,
    weight: selectedWeight,
    allergies: document.getElementById('fAllergies').value,
    currentMeds: document.getElementById('fCurrentMeds').value,
    pmh: document.getElementById('fPMH').value,
    chiefConcern: document.getElementById('fChiefConcern').value,
    labs, labComments: document.getElementById('fLabComments').value,
    urinalysis: uaOrdered ? urinalysis : null,
    diagnosis: document.getElementById('fDiagnosis').value,
    medications, treatmentNotes: treatmentNotesVal, treatment: treatmentLines.join('; '),
    procedures: [...selectedProcedures],
    referralType: document.getElementById('fReferralType').value,
    provider: selectedProvider,
    notes: document.getElementById('fNotes').value,
    ageEstimated: dobUnknown,
    bloodGlucose: document.getElementById('fBloodGlucose').value,
    savedAt: new Date().toISOString()
  };
}

async function saveRecord(andNew) {
  const data = collectFormData();
  if (!data.name) { alert('Please enter a patient name.'); return; }
  if (data.site) setLastSite(data.site);
  records = await window.electronAPI.saveRecord(data);
  renderRecords(); renderStats();
  if (andNew) {
    newEncounter();
  } else {
    closePanel();
  }
}

async function deleteRecord() {
  if (!editingRecordId) return;
  if (!confirm('Delete this record permanently?')) return;
  records = await window.electronAPI.deleteRecord(editingRecordId);
  renderRecords(); renderStats(); closePanel();
}

// VIEW RECORD
function renderViewRecord() {
  const data = collectFormData();
  const formulary = getFormulary();
  const age = data.dob ? calcAge(data.dob) + ' years' : '';
  let labsHtml = '';
  LAB_TESTS.forEach(t => {
    if (data.labs[t] && data.labs[t].ordered) {
      const rClass = data.labs[t].result === 'POS' ? 'style="color:var(--red);font-weight:700;"' : '';
      labsHtml += `<div class="view-row"><span class="view-label">${t}</span><span class="view-value" ${rClass}>${data.labs[t].result}</span></div>`;
    }
  });
  let medsHtml = '';
  if (data.medications.length) {
    medsHtml = data.medications.map(m => {
      const med = formulary.find(f => f.id === m.medId);
      const name = med ? med.name : m.medId;
      const freqLabel = FREQUENCIES.find(f => f.value === m.freq)?.label || m.freq;
      const ctrl = med && med.controlled ? ' <span class="med-controlled">\u26a0 CONTROLLED</span>' : '';
      return `<div style="padding:4px 0;border-bottom:1px solid var(--gray-100);">${esc(name)} ${esc(m.dose)} \u2014 ${freqLabel} \u00d7 ${m.duration}${ctrl}</div>`;
    }).join('');
  }
  let uaHtml = '';
  if (data.urinalysis) {
    const uaLabels = { leukocytes:'Leukocytes', nitrite:'Nitrite', urobilinogen:'Urobilinogen', protein:'Protein', ph:'pH', blood:'Blood', sg:'Specific Gravity', ketones:'Ketones', bilirubin:'Bilirubin', glucose:'Glucose' };
    let uaRows = '';
    UA_PARAMS.forEach(p => { if (data.urinalysis[p]) uaRows += `<div class="view-row"><span class="view-label">${uaLabels[p]}</span><span class="view-value">${esc(data.urinalysis[p])}</span></div>`; });
    if (uaRows) uaHtml = `<div class="view-section"><h4>Urinalysis</h4>${uaRows}</div>`;
  }
  const procHtml = data.procedures && data.procedures.length ? `<div class="view-row" style="margin-top:8px;"><span class="view-label">Procedures</span><span class="view-value">${data.procedures.map(p => esc(p)).join(', ')}</span></div>` : '';

  document.getElementById('viewRecordContent').innerHTML = `
    <div class="view-section">
      <h4>Patient Information</h4>
      <div class="view-row"><span class="view-label">MRN</span><span class="view-value">${esc(data.mrn) || '\u2014'}</span></div>
      <div class="view-row"><span class="view-label">Given Name</span><span class="view-value">${esc(data.givenName)}</span></div>
      <div class="view-row"><span class="view-label">Family Name</span><span class="view-value">${esc(data.familyName)}</span></div>
      <div class="view-row"><span class="view-label">Site</span><span class="view-value">${esc(data.site)}</span></div>
      <div class="view-row"><span class="view-label">Date</span><span class="view-value">${formatDate(data.date)}</span></div>
      <div class="view-row"><span class="view-label">Sex / Age</span><span class="view-value">${esc(data.sex)} ${age}</span></div>
      <div class="view-row"><span class="view-label">DOB</span><span class="view-value">${formatDate(data.dob)}${data.ageEstimated ? ' <em style="color:var(--gray-500);">(estimated)</em>' : ''}</span></div>
      <div class="view-row"><span class="view-label">Phone</span><span class="view-value">${esc(data.phone)}</span></div>
      <div class="view-row"><span class="view-label">Pregnant</span><span class="view-value">${esc(data.pregnant)}</span></div>
      <div class="view-row"><span class="view-label">Breastfeeding</span><span class="view-value">${esc(data.breastfeeding)}</span></div>
    </div>
    <div class="view-section">
      <h4>Vitals</h4>
      <div class="view-row"><span class="view-label">Temp</span><span class="view-value">${data.temp || '\u2014'}</span></div>
      <div class="view-row"><span class="view-label">BP</span><span class="view-value">${data.bp || '\u2014'}</span></div>
      <div class="view-row"><span class="view-label">Weight</span><span class="view-value">${data.weight || '\u2014'}</span></div>
    </div>
    <div class="view-section">
      <h4>History</h4>
      <div class="view-row"><span class="view-label">Allergies</span><span class="view-value">${esc(data.allergies) || '\u2014'}</span></div>
      <div class="view-row"><span class="view-label">Current Meds</span><span class="view-value">${esc(data.currentMeds) || '\u2014'}</span></div>
      <div class="view-row"><span class="view-label">PMH</span><span class="view-value">${esc(data.pmh) || '\u2014'}</span></div>
      <div class="view-row"><span class="view-label">Chief Concern</span><span class="view-value">${esc(data.chiefConcern) || '\u2014'}</span></div>
    </div>
    ${labsHtml || data.bloodGlucose ? `<div class="view-section"><h4>Labs</h4>${data.bloodGlucose ? `<div class="view-row"><span class="view-label">Blood Glucose</span><span class="view-value" style="font-weight:700;color:${parseFloat(data.bloodGlucose) >= 200 ? 'var(--red)' : parseFloat(data.bloodGlucose) >= 140 ? 'var(--amber)' : 'var(--green)'};">${esc(data.bloodGlucose)} mg/dL</span></div>` : ''}${labsHtml}${data.labComments ? `<div class="view-row"><span class="view-label">Comments</span><span class="view-value">${esc(data.labComments)}</span></div>` : ''}</div>` : ''}
    ${uaHtml}
    <div class="view-section">
      <h4>Clinical</h4>
      <div class="view-row"><span class="view-label">Diagnosis</span><span class="view-value">${esc(data.diagnosis) || '\u2014'}</span></div>
      ${medsHtml ? `<div style="margin-top:8px;"><strong style="font-size:12px;color:var(--gray-600);">MEDICATIONS</strong>${medsHtml}</div>` : ''}
      ${data.treatmentNotes ? `<div class="view-row" style="margin-top:8px;"><span class="view-label">Treatment Notes</span><span class="view-value">${esc(data.treatmentNotes)}</span></div>` : ''}
      ${procHtml}
      <div class="view-row"><span class="view-label">Referral</span><span class="view-value">${esc(data.referralType) || '\u2014'}</span></div>
      <div class="view-row"><span class="view-label">Physician</span><span class="view-value">${esc(data.provider) || '\u2014'}</span></div>
      <div class="view-row"><span class="view-label">Notes</span><span class="view-value">${esc(data.notes) || '\u2014'}</span></div>
    </div>
    <div style="text-align:center;margin-top:12px;"><button class="btn btn-primary" onclick="editRecord()">Edit Record</button></div>`;
}
