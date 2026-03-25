// ==========================================
// URINALYSIS COLLAPSE TOGGLE
// ==========================================
function toggleUrinalysisCollapse() {
  const content = document.getElementById('uaCollapsible');
  const btn = document.getElementById('uaCollapseBtn');
  if (content.style.display === 'none') {
    content.style.display = 'block';
    btn.innerHTML = 'Urinalysis &#9660;';
  } else {
    content.style.display = 'none';
    btn.innerHTML = 'Urinalysis &#9654;';
  }
}


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
  // Auto-scroll to top of panel body when switching tabs
  const panelBody = document.querySelector('.panel-body');
  if (panelBody) panelBody.scrollTop = 0;
}

function newEncounter() {
  try {
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
  } catch (err) {
    console.error('newEncounter error:', err);
    alert('Error opening encounter: ' + err.message);
  }
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
  try {
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
  selectedBP = '';
  renderBPRanges();
  selectedWeight = '';
  renderWeightRanges();
  document.getElementById('fAllergies').value = '';
  document.getElementById('fCurrentMeds').value = '';
  document.getElementById('fPMH').value = '';
  document.getElementById('fChiefConcern').value = '';
  selectedComplaints = new Set();
  renderComplaintButtons();
  setToggleValue('transportToggle', '');
  document.getElementById('fTravelTime').value = '';
  document.getElementById('fLabComments').value = '';
  UA_PARAMS.forEach(p => { setToggleValue(UA_FIELD_IDS[p], ''); });
  // Collapse urinalysis section
  const uaContent = document.getElementById('uaCollapsible');
  const uaBtn = document.getElementById('uaCollapseBtn');
  if (uaContent) uaContent.style.display = 'none';
  if (uaBtn) uaBtn.innerHTML = 'Urinalysis &#9654;';
  document.getElementById('fDiagnosis').value = '';
  document.getElementById('fTreatmentNotes').value = '';
  selectedProcedures = [];
  renderProcedureButtons();
  // Reset imaging
  selectedImagingType = '';
  setToggleValue('imagingToggle', '');
  document.getElementById('imagingDetails').style.display = 'none';
  document.querySelectorAll('#imagingTypeGrid .complaint-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('fImagingFindings').value = '';
  // Reset surgery
  setToggleValue('surgeryToggle', '');
  document.getElementById('surgeryDetails').style.display = 'none';
  document.getElementById('fSurgeryType').value = '';
  document.getElementById('fSurgeryNotes').value = '';
  selectedReferralType = 'None';
  renderReferralButtons();
  document.getElementById('fReferralDate').value = '';
  document.getElementById('referralDateRow').style.display = 'none';
  selectedProvider = '';
  renderProviderButtons();
  document.getElementById('fNotes').value = '';
  resetLabs();
  document.getElementById('medBuilder').innerHTML = '';
  hideReturnPatientBanner();
  } catch (err) { console.error('resetForm error:', err); }
}

function populateForm(rec) {
  const siteSelect = document.getElementById('fSite');
  const siteVal = rec.site || '';
  siteSelect.value = siteVal;
  // If setting the value failed (site not in options), add it temporarily
  if (siteVal && siteSelect.value !== siteVal) {
    const opt = document.createElement('option');
    opt.value = siteVal;
    opt.textContent = siteVal;
    siteSelect.appendChild(opt);
    siteSelect.value = siteVal;
  }
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
  selectedBP = rec.bp || '';
  renderBPRanges();
  selectedWeight = rec.weight || '';
  renderWeightRanges();
  document.getElementById('fAllergies').value = rec.allergies || '';
  document.getElementById('fCurrentMeds').value = rec.currentMeds || '';
  document.getElementById('fPMH').value = rec.pmh || '';
  document.getElementById('fChiefConcern').value = rec.chiefConcern || '';
  selectedComplaints = new Set();
  COMMON_COMPLAINTS.forEach((c, i) => { if (rec.chiefConcern && rec.chiefConcern.includes(c)) selectedComplaints.add(i); });
  renderComplaintButtons();
  setToggleValue('transportToggle', rec.transport || '');
  document.getElementById('fTravelTime').value = rec.travelTime || '';
  document.getElementById('fLabComments').value = rec.labComments || '';
  if (rec.urinalysis) {
    UA_PARAMS.forEach(p => { setToggleValue(UA_FIELD_IDS[p], rec.urinalysis[p] || ''); });
    // Auto-expand urinalysis section if data exists
    const uaContent = document.getElementById('uaCollapsible');
    const uaBtn = document.getElementById('uaCollapseBtn');
    if (uaContent && uaBtn) {
      const hasData = UA_PARAMS.some(p => rec.urinalysis[p]);
      if (hasData) { uaContent.style.display = 'block'; uaBtn.innerHTML = 'Urinalysis &#9660;'; }
    }
  } else {
    UA_PARAMS.forEach(p => { setToggleValue(UA_FIELD_IDS[p], ''); });
  }
  document.getElementById('fDiagnosis').value = rec.diagnosis || '';
  document.getElementById('fTreatmentNotes').value = rec.treatmentNotes || '';
  selectedProcedures = rec.procedures ? [...rec.procedures] : [];
  renderProcedureButtons();
  // Imaging
  if (rec.imaging && rec.imaging.type) {
    selectedImagingType = rec.imaging.type;
    setToggleValue('imagingToggle', 'Ultrasound');
    document.getElementById('imagingDetails').style.display = 'block';
    document.querySelectorAll('#imagingTypeGrid .complaint-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.val === rec.imaging.type);
    });
    document.getElementById('fImagingFindings').value = rec.imaging.findings || '';
  } else {
    selectedImagingType = '';
    setToggleValue('imagingToggle', '');
    document.getElementById('imagingDetails').style.display = 'none';
    document.querySelectorAll('#imagingTypeGrid .complaint-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('fImagingFindings').value = '';
  }
  // Surgery
  if (rec.surgery && rec.surgery.type) {
    setToggleValue('surgeryToggle', 'Yes');
    document.getElementById('surgeryDetails').style.display = 'block';
    document.getElementById('fSurgeryType').value = rec.surgery.type || '';
    document.getElementById('fSurgeryNotes').value = rec.surgery.notes || '';
  } else {
    setToggleValue('surgeryToggle', '');
    document.getElementById('surgeryDetails').style.display = 'none';
    document.getElementById('fSurgeryType').value = '';
    document.getElementById('fSurgeryNotes').value = '';
  }
  selectedReferralType = rec.referralType || 'None';
  renderReferralButtons();
  // Show referral date if applicable
  const dateRow = document.getElementById('referralDateRow');
  if (dateRow) {
    dateRow.style.display = (selectedReferralType && selectedReferralType !== 'None') ? 'block' : 'none';
    document.getElementById('fReferralDate').value = rec.referralDate || '';
  }
  selectedProvider = rec.provider || '';
  renderProviderButtons();
  document.getElementById('fNotes').value = rec.notes || '';
  // Migrate old-format labs: if bloodGlucose was stored separately, merge it into labs
  const labsToPopulate = rec.labs ? { ...rec.labs } : {};
  if (rec.bloodGlucose && (!labsToPopulate['Blood Glucose'] || !labsToPopulate['Blood Glucose'].ordered)) {
    labsToPopulate['Blood Glucose'] = { ordered: true, value: rec.bloodGlucose, unit: 'mg/dL', type: 'numeric', interpretation: '' };
  }
  populateLabData(labsToPopulate);
  document.getElementById('medBuilder').innerHTML = '';
  if (rec.medications && rec.medications.length) {
    rec.medications.forEach(m => addMedLine(m.medId, m.dose, m.freq, m.duration));
  }
}

function collectFormData() {
  const labs = collectLabData();
  // Extract blood glucose from the labs for backward compatibility
  const bgLabData = labs['Blood Glucose'];
  const bloodGlucoseVal = (bgLabData && bgLabData.ordered) ? bgLabData.value : '';

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
    bp: document.getElementById('fBP').value.trim(),
    weight: selectedWeight,
    allergies: document.getElementById('fAllergies').value,
    currentMeds: document.getElementById('fCurrentMeds').value,
    pmh: document.getElementById('fPMH').value,
    chiefConcern: document.getElementById('fChiefConcern').value,
    transport: getToggleValue('transportToggle') || '',
    travelTime: document.getElementById('fTravelTime').value,
    labs, labComments: document.getElementById('fLabComments').value,
    urinalysis: uaOrdered ? urinalysis : null,
    diagnosis: document.getElementById('fDiagnosis').value,
    medications, treatmentNotes: treatmentNotesVal, treatment: treatmentLines.join('; '),
    procedures: [...selectedProcedures],
    imaging: selectedImagingType ? {
      modality: 'Ultrasound',
      type: selectedImagingType,
      findings: document.getElementById('fImagingFindings').value
    } : null,
    surgery: getToggleValue('surgeryToggle') === 'Yes' ? {
      type: document.getElementById('fSurgeryType').value.trim(),
      notes: document.getElementById('fSurgeryNotes').value.trim()
    } : null,
    referralType: selectedReferralType,
    referralDate: (selectedReferralType && selectedReferralType !== 'None') ? document.getElementById('fReferralDate').value : '',
    provider: selectedProvider,
    notes: document.getElementById('fNotes').value,
    ageEstimated: dobUnknown,
    bloodGlucose: bloodGlucoseVal,
    savedAt: new Date().toISOString()
  };
}

async function saveRecord(andNew) {
  try {
  const data = collectFormData();
  console.log('saveRecord called, data:', JSON.stringify(data).substring(0, 200));
  // Required fields validation
  const missing = [];
  if (!data.givenName || !data.givenName.trim()) missing.push('Given Name');
  if (!data.familyName || !data.familyName.trim()) missing.push('Family Name');
  if (!data.site) missing.push('Site');
  if (!data.date) missing.push('Date');
  if (!data.sex || (data.sex !== 'M' && data.sex !== 'F')) missing.push('Sex (M or F)');
  if (!data.dob) missing.push('Date of Birth');
  if (!data.mrn) missing.push('MRN (auto-generates from name + DOB)');
  if (missing.length > 0) {
    alert('Please complete the following required fields:\n\n- ' + missing.join('\n- '));
    return;
  }
  if (data.site) setLastSite(data.site);
  const lastDate = data.date; // Remember for next encounter
  records = await window.electronAPI.saveRecord(data);
  renderRecords(); renderStats();
  if (andNew) {
    newEncounter();
    // Auto-populate site (already done via lastSite) and date from previous record
    if (lastDate) document.getElementById('fDate').value = lastDate;
  } else {
    closePanel();
  }
  } catch (err) { console.error('saveRecord error:', err); alert('Save error: ' + err.message); }
}

async function deleteRecord() {
  if (!editingRecordId) return;
  if (!confirm('Delete this record permanently?')) return;
  records = await window.electronAPI.deleteRecord(editingRecordId);
  renderRecords(); renderStats(); closePanel();
}

// EXPORT RECORD TO PDF
async function exportRecordPDF() {
  const content = document.getElementById('viewRecordContent');
  if (!content) return;
  const data = collectFormData();
  const patientName = data.name || 'Record';
  const result = await window.electronAPI.exportPDF(content.innerHTML, patientName);
  if (result) alert('PDF exported successfully!');
}

// VIEW RECORD — Patient-centric view showing ALL encounters
function renderViewRecord() {
  const data = collectFormData();
  const mrn = data.mrn || '';

  // Find all encounters for this patient (by MRN)
  const patientEncounters = mrn
    ? records.filter(r => r.mrn === mrn && !r.deleted).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    : [data]; // fallback: just the current form data
  const encounterCount = patientEncounters.length;
  const age = data.dob ? calcAge(data.dob) + ' years' : '';

  // Patient header (constant across visits)
  let html = `
    <div class="view-patient-header">
      <div class="view-patient-name">${esc(data.givenName ? data.givenName + ' ' + (data.familyName || '') : data.name || 'Unknown')}</div>
      <div class="view-patient-meta">
        <span>MRN: <strong>${esc(mrn)}</strong></span>
        <span>${esc(data.sex || '')}${age ? ' / ' + age : ''}</span>
        <span>DOB: ${formatDate(data.dob)}${data.ageEstimated ? ' (est.)' : ''}</span>
        ${data.phone ? `<span>Phone: ${esc(data.phone)}</span>` : ''}
      </div>
    </div>
    <div class="visit-timeline-header" style="margin-bottom:12px;">
      <strong>${encounterCount} Visit${encounterCount !== 1 ? 's' : ''}</strong>
      <button class="btn btn-primary btn-sm" onclick="newEncounterForPatient('${esc(editingRecordId)}')">+ New Visit</button>
    </div>`;

  // Vitals trending table (show if 2+ visits)
  if (encounterCount >= 2) {
    const vitalsEncounters = [...patientEncounters].reverse(); // oldest first for trending
    html += `<div class="vitals-trend">
      <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--primary);margin-bottom:6px;">Vitals Trend</h4>
      <table class="vitals-trend-table">
        <thead><tr>
          <th>Visit</th>
          ${vitalsEncounters.map((e, i) => `<th>V${i + 1}<br><span style="font-weight:400;font-size:10px;">${formatDate(e.date)}</span></th>`).join('')}
        </tr></thead>
        <tbody>
          <tr><td>Temp</td>${vitalsEncounters.map(e => {
            const t = parseFloat(e.temp);
            const color = !e.temp ? '' : t >= 38.5 ? 'color:var(--red);font-weight:700;' : t >= 37.5 ? 'color:var(--amber);font-weight:700;' : '';
            return `<td style="${color}">${esc(e.temp || '\u2014')}</td>`;
          }).join('')}</tr>
          <tr><td>BP</td>${vitalsEncounters.map(e => {
            const sys = parseInt((e.bp || '').split('/')[0]);
            const color = !e.bp ? '' : sys >= 140 ? 'color:var(--red);font-weight:700;' : sys >= 130 ? 'color:var(--amber);font-weight:700;' : '';
            return `<td style="${color}">${esc(e.bp || '\u2014')}</td>`;
          }).join('')}</tr>
          <tr><td>Weight</td>${vitalsEncounters.map(e => `<td>${esc(e.weight || '\u2014')}</td>`).join('')}</tr>
          ${vitalsEncounters.some(e => e.bloodGlucose) ? `<tr><td>Glucose</td>${vitalsEncounters.map(e => {
            const g = parseFloat(e.bloodGlucose);
            const color = !e.bloodGlucose ? '' : g >= 200 ? 'color:var(--red);font-weight:700;' : g >= 140 ? 'color:var(--amber);font-weight:700;' : '';
            return `<td style="${color}">${e.bloodGlucose ? esc(e.bloodGlucose) + ' mg/dL' : '\u2014'}</td>`;
          }).join('')}</tr>` : ''}
        </tbody>
      </table>
    </div>`;
  }

  // Render ALL encounters, newest first
  patientEncounters.forEach((enc, i) => {
    const visitNum = encounterCount - i;
    const isCurrent = enc.id === editingRecordId;

    html += `
      <div class="visit-block${isCurrent ? ' visit-block-current' : ''}">
        <div class="visit-block-header">
          <div class="visit-block-title">
            <span class="visit-block-num">Visit ${visitNum}</span>
            <span class="visit-block-date">${formatDate(enc.date)} — ${esc(enc.site || '')}</span>
            ${enc.provider ? `<span class="visit-block-provider">${esc(enc.provider)}</span>` : ''}
          </div>
          <div class="visit-block-actions">
            <button class="btn btn-sm btn-secondary visit-edit-btn" data-id="${enc.id}">Edit</button>
          </div>
        </div>
        ${renderEncounterDetail(enc)}
      </div>`;
  });

  document.getElementById('viewRecordContent').innerHTML = html;

  // Wire up edit buttons for each visit
  document.querySelectorAll('.visit-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rec = records.find(r => r.id === btn.dataset.id);
      if (rec) {
        editingRecordId = rec.id;
        populateForm(rec);
        editRecord();
      }
    });
  });
}

function newEncounterForPatient(sourceRecordId) {
  newEncounter();
  prefillFromPrevious(sourceRecordId);
}

function renderEncounterDetail(data) {
  const formulary = getFormulary();

  // Labs
  let labsHtml = renderLabsForView(data);

  // Medications
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

  // Urinalysis
  let uaHtml = '';
  if (data.urinalysis) {
    const uaLabels = { leukocytes:'Leukocytes', nitrite:'Nitrite', urobilinogen:'Urobilinogen', protein:'Protein', ph:'pH', blood:'Blood', sg:'Specific Gravity', ketones:'Ketones', bilirubin:'Bilirubin', glucose:'Glucose' };
    let uaRows = '';
    UA_PARAMS.forEach(p => { if (data.urinalysis[p]) uaRows += `<div class="view-row"><span class="view-label">${uaLabels[p]}</span><span class="view-value">${esc(data.urinalysis[p])}</span></div>`; });
    if (uaRows) uaHtml = `<div class="view-section"><h4>Urinalysis</h4>${uaRows}</div>`;
  }

  const procHtml = data.procedures && data.procedures.length ? `<div class="view-row" style="margin-top:8px;"><span class="view-label">Procedures</span><span class="view-value">${data.procedures.map(p => esc(p)).join(', ')}</span></div>` : '';

  return `
    <div class="encounter-detail">
      <div class="view-section-row">
        <div class="view-section view-section-half">
          <h4>Vitals</h4>
          <div class="view-row"><span class="view-label">Temp</span><span class="view-value">${data.temp || '\u2014'}</span></div>
          <div class="view-row"><span class="view-label">BP</span><span class="view-value">${data.bp || '\u2014'}</span></div>
          <div class="view-row"><span class="view-label">Weight</span><span class="view-value">${data.weight || '\u2014'}</span></div>
          <div class="view-row"><span class="view-label">Pregnant</span><span class="view-value">${esc(data.pregnant)}</span></div>
          <div class="view-row"><span class="view-label">Breastfeeding</span><span class="view-value">${esc(data.breastfeeding)}</span></div>
        </div>
        <div class="view-section view-section-half">
          <h4>History</h4>
          <div class="view-row"><span class="view-label">Allergies</span><span class="view-value">${esc(data.allergies) || '\u2014'}</span></div>
          <div class="view-row"><span class="view-label">Current Meds</span><span class="view-value">${esc(data.currentMeds) || '\u2014'}</span></div>
          <div class="view-row"><span class="view-label">PMH</span><span class="view-value">${esc(data.pmh) || '\u2014'}</span></div>
          <div class="view-row"><span class="view-label">Chief Concern</span><span class="view-value">${esc(data.chiefConcern) || '\u2014'}</span></div>
          ${data.transport ? `<div class="view-row"><span class="view-label">Transport</span><span class="view-value">${esc(data.transport)}${data.travelTime ? ' \u2014 ' + esc(data.travelTime) + ' min' : ''}</span></div>` : ''}
        </div>
      </div>
      ${labsHtml ? `<div class="view-section"><h4>Labs</h4>${labsHtml}${data.labComments ? `<div class="view-row"><span class="view-label">Comments</span><span class="view-value">${esc(data.labComments)}</span></div>` : ''}</div>` : ''}
      ${uaHtml}
      <div class="view-section">
        <h4>Clinical</h4>
        <div class="view-row"><span class="view-label">Diagnosis</span><span class="view-value">${esc(data.diagnosis) || '\u2014'}</span></div>
        ${medsHtml ? `<div style="margin-top:8px;"><strong style="font-size:12px;color:var(--gray-600);">MEDICATIONS</strong>${medsHtml}</div>` : ''}
        ${data.treatmentNotes ? `<div class="view-row" style="margin-top:8px;"><span class="view-label">Treatment Notes</span><span class="view-value">${esc(data.treatmentNotes)}</span></div>` : ''}
        ${procHtml}
        ${data.imaging ? `<div class="view-row" style="margin-top:8px;"><span class="view-label">Imaging</span><span class="view-value">${esc(data.imaging.modality || 'Ultrasound')} — ${esc(data.imaging.type)}${data.imaging.findings ? `<br><em style="color:var(--gray-500);">${esc(data.imaging.findings)}</em>` : ''}</span></div>` : ''}
        ${data.surgery ? `<div class="view-row" style="margin-top:8px;"><span class="view-label">Surgery</span><span class="view-value"><strong>${esc(data.surgery.type)}</strong>${data.surgery.notes ? `<br><em style="color:var(--gray-500);">${esc(data.surgery.notes)}</em>` : ''}</span></div>` : ''}
        <div class="view-row"><span class="view-label">Referral</span><span class="view-value">${esc(data.referralType) || '\u2014'}${data.referralDate ? ` \u2014 Scheduled: <strong>${esc(data.referralDate)}</strong>` : ''}</span></div>
        <div class="view-row"><span class="view-label">Physician</span><span class="view-value">${esc(data.provider) || '\u2014'}</span></div>
        ${data.notes ? `<div class="view-row"><span class="view-label">Notes</span><span class="view-value">${esc(data.notes)}</span></div>` : ''}
      </div>
    </div>`;
}
