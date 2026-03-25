// ==========================================
// CUSTOM PROMPT (replaces window.prompt which is blocked in Electron)
// ==========================================
function customPrompt(title, defaultValue) {
  return new Promise((resolve) => {
    console.log('[customPrompt] opening modal for:', title);
    const modal = document.getElementById('customPromptModal');
    const input = document.getElementById('customPromptInput');
    const titleEl = document.getElementById('customPromptTitle');
    const extraEl = document.getElementById('customPromptExtra');
    if (!modal || !input || !titleEl) {
      console.error('[customPrompt] modal elements missing:', { modal: !!modal, input: !!input, titleEl: !!titleEl });
      resolve(null);
      return;
    }
    titleEl.textContent = title;
    input.value = defaultValue || '';
    extraEl.innerHTML = '';
    // Remove any stale listeners by cloning the buttons
    const okBtn = document.getElementById('customPromptOk');
    const cancelBtn = document.getElementById('customPromptCancel');
    const newOk = okBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    modal.classList.add('open');
    input.focus();

    function cleanup() {
      modal.classList.remove('open');
      freshOk.removeEventListener('click', onOk);
      freshCancel.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKey);
    }
    function onOk() { console.log('[customPrompt] OK clicked'); cleanup(); resolve(input.value); }
    function onCancel() { console.log('[customPrompt] Cancel clicked'); cleanup(); resolve(null); }
    function onKey(e) { if (e.key === 'Enter') onOk(); if (e.key === 'Escape') onCancel(); }

    const freshOk = document.getElementById('customPromptOk');
    const freshCancel = document.getElementById('customPromptCancel');
    freshOk.addEventListener('click', onOk);
    freshCancel.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKey);
  });
}

// ==========================================
// HELPERS
// ==========================================
function formatDate(isoStr) {
  if (!isoStr || isoStr.length < 10) return isoStr || '';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function calcAge(dob) {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

function esc(s) { if (!s) return ''; const div = document.createElement('div'); div.textContent = s; return div.innerHTML; }

function quickFill(fieldId, value) { document.getElementById(fieldId).value = value; }

// Toggle button helpers
function getToggleValue(groupId) {
  const active = document.getElementById(groupId).querySelector('.btn-toggle.active');
  return active ? active.dataset.val : '';
}
function setToggleValue(groupId, val) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
  if (val) { const btn = group.querySelector(`.btn-toggle[data-val="${val}"]`); if (btn) btn.classList.add('active'); }
}
function initToggleGroup(groupId, onChange) {
  document.getElementById(groupId).querySelectorAll('.btn-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = document.getElementById(groupId);
      if (group.classList.contains('disabled')) return;
      group.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (onChange) onChange(btn.dataset.val);
    });
  });
}

// Sex-dependent field control
function updateSexDependentFields() {
  const sex = getToggleValue('sexToggle');
  const pregGroup = document.getElementById('pregnantToggle');
  const bfGroup = document.getElementById('bfToggle');
  if (sex === 'M') {
    setToggleValue('pregnantToggle', 'N/A');
    setToggleValue('bfToggle', 'N/A');
    pregGroup.classList.add('disabled');
    bfGroup.classList.add('disabled');
  } else {
    pregGroup.classList.remove('disabled');
    bfGroup.classList.remove('disabled');
  }
}

// MRN generation
function generateBaseMRN(given, family, dob) {
  // Format: First 2 chars of given + first 2 of family + DDMMYYYY
  // DOB comes from <input type="date"> as YYYY-MM-DD (locale-independent)
  const g = (given + 'XX').substring(0, 2).toUpperCase();
  const f = (family + 'XX').substring(0, 2).toUpperCase();
  const dobParts = dob.split('-'); // [YYYY, MM, DD]
  const dobStr = dobParts[2] + dobParts[1] + dobParts[0]; // DDMMYYYY
  return g + f + dobStr;
}

function updateMRN() {
  const given = document.getElementById('fGivenName').value.trim();
  const family = document.getElementById('fFamilyName').value.trim();
  const dob = document.getElementById('fDOB').value;
  if (given && family && dob) {
    const baseMRN = generateBaseMRN(given, family, dob);
    // Check if this is a return patient (same base MRN AND same full name)
    const fullName = (given + ' ' + family).toLowerCase();
    const existingWithMRN = records.filter(r =>
      r.mrn && r.mrn.replace(/[A-Z]$/, '') === baseMRN && // strip any suffix for comparison
      r.id !== editingRecordId && !r.deleted
    );

    let mrn = baseMRN;
    if (existingWithMRN.length > 0) {
      // Check if any match is the SAME patient (same name)
      const samePatient = existingWithMRN.some(r => {
        const rName = (r.givenName + ' ' + r.familyName).toLowerCase().trim();
        return rName === fullName;
      });

      if (samePatient) {
        // Return patient — use the same MRN they already have
        const existing = existingWithMRN.find(r => {
          const rName = (r.givenName + ' ' + r.familyName).toLowerCase().trim();
          return rName === fullName;
        });
        mrn = existing.mrn;
      } else {
        // Different patient with same initials+DOB — add suffix B, C, D...
        const usedSuffixes = existingWithMRN.map(r => {
          const suffix = r.mrn.replace(baseMRN, '');
          return suffix || 'A'; // no suffix = first patient = "A"
        });
        const letters = 'BCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (const letter of letters) {
          if (!usedSuffixes.includes(letter)) {
            mrn = baseMRN + letter;
            break;
          }
        }
      }
    }

    document.getElementById('fMRN').value = mrn;
    // Check for return patient (only in new encounter mode)
    if (panelMode === 'new') checkReturnPatient(baseMRN);
  } else {
    document.getElementById('fMRN').value = '';
    hideReturnPatientBanner();
  }
}

function checkReturnPatient(baseMRN) {
  // Match by base MRN (stripping any suffix letter) to find ALL records for this patient
  const matches = records.filter(r => {
    if (!r.mrn || r.id === editingRecordId || r.deleted) return false;
    const rBase = r.mrn.replace(/[A-Z]$/, '');
    return rBase === baseMRN;
  });
  const banner = document.getElementById('returnPatientBanner');
  if (!banner) return;
  if (matches.length > 0) {
    const latest = matches.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    const visitCount = matches.length;
    const name = latest.name || latest.givenName || 'Unknown';
    const lastDate = latest.date ? formatDate(latest.date) : 'Unknown date';
    const lastDx = latest.diagnosis || 'No diagnosis';
    // Auto-carry persistent patient data from most recent visit
    if (latest.allergies && !document.getElementById('fAllergies').value) {
      document.getElementById('fAllergies').value = latest.allergies;
    }
    if (latest.pmh && !document.getElementById('fPMH').value) {
      document.getElementById('fPMH').value = latest.pmh;
    }
    if (latest.currentMeds && !document.getElementById('fCurrentMeds').value) {
      document.getElementById('fCurrentMeds').value = latest.currentMeds;
    }
    if (latest.phone && !document.getElementById('fPhone').value.replace('256', '')) {
      document.getElementById('fPhone').value = latest.phone;
    }
    banner.innerHTML = `
      <div class="return-patient-info">
        <strong>\ud83d\udd04 Return Patient Detected</strong> \u2014 ${esc(name)} has ${visitCount} previous visit(s).
        <span style="color:var(--gray-500);font-size:11px;">Last visit: ${lastDate} \u2014 ${esc(lastDx)}</span>
        <span style="color:var(--green);font-size:11px;">\u2705 Allergies, PMH, and meds auto-filled from last visit</span>
      </div>
      <div class="return-patient-actions">
        <button class="btn btn-secondary btn-sm" onclick="viewPreviousVisits('${esc(baseMRN)}')">View Previous Visits</button>
        <button class="btn btn-primary btn-sm" onclick="prefillFromPrevious('${esc(latest.id)}')">Copy All Patient Info</button>
      </div>`;
    banner.style.display = 'block';
  } else {
    hideReturnPatientBanner();
  }
}

function hideReturnPatientBanner() {
  const banner = document.getElementById('returnPatientBanner');
  if (banner) banner.style.display = 'none';
}

function viewPreviousVisits(baseMRN) {
  const matches = records.filter(r => {
    if (!r.mrn || r.deleted) return false;
    const rBase = r.mrn.replace(/[A-Z]$/, '');
    return rBase === baseMRN;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  let html = '<div style="max-height:300px;overflow-y:auto;">';
  matches.forEach(r => {
    html += `<div class="prev-visit-card" onclick="openRecord('${r.id}')">
      <strong>${formatDate(r.date || '')}</strong> — ${esc(r.diagnosis || 'No diagnosis')}
      <span style="color:var(--gray-400);font-size:11px;">${esc(r.site || '')} · ${esc(r.provider || '')}</span>
    </div>`;
  });
  html += '</div>';
  const banner = document.getElementById('returnPatientBanner');
  banner.innerHTML = `<div><strong>🔄 Previous Visits for MRN: ${esc(baseMRN)}</strong></div>${html}
    <button class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="hideReturnPatientBanner()">Close</button>`;
}

function prefillFromPrevious(recordId) {
  const prev = records.find(r => r.id === recordId);
  if (!prev) return;
  // Copy demographics only (not clinical data) — this is a NEW visit
  document.getElementById('fGivenName').value = prev.givenName || '';
  document.getElementById('fFamilyName').value = prev.familyName || '';
  setToggleValue('sexToggle', prev.sex || '');
  document.getElementById('fDOB').value = prev.dob || '';
  document.getElementById('fPhone').value = prev.phone || '';
  if (prev.ageEstimated) {
    dobUnknown = true;
    document.getElementById('fDOBUnknown').checked = true;
    document.getElementById('fDOB').style.display = 'none';
    document.getElementById('ageInputContainer').style.display = 'block';
  }
  updateAgeDisplay();
  updateMRN();
  updateSexDependentFields();
  renderWeightRanges();
  // Pre-fill allergies and PMH from previous visit
  if (prev.allergies) document.getElementById('fAllergies').value = prev.allergies;
  if (prev.pmh) document.getElementById('fPMH').value = prev.pmh;
  if (prev.currentMeds) document.getElementById('fCurrentMeds').value = prev.currentMeds;
  hideReturnPatientBanner();
}

function updateAgeDisplay() {
  const dob = document.getElementById('fDOB').value;
  const el = document.getElementById('ageDisplay');
  if (dob) { el.textContent = '(' + calcAge(dob) + ' yrs)'; } else { el.textContent = ''; }
}

// Temperature range helpers
function getTempRange(temp) {
  if (!temp || isNaN(temp)) return null;
  if (temp < 37.5) return 'normal';
  if (temp < 38.5) return 'lowgrade';
  if (temp < 39.5) return 'fever';
  return 'high';
}
function highlightTempRange() {
  document.querySelectorAll('.temp-range-btn').forEach(btn => {
    btn.classList.remove('active', 'active-fever', 'active-high');
    if (btn.dataset.temp === selectedTemp) {
      const range = btn.dataset.range;
      if (range === 'normal' || range === 'lowgrade') btn.classList.add('active');
      else if (range === 'fever') btn.classList.add('active-fever');
      else btn.classList.add('active-high');
    }
  });
}

// Weight range helpers
function getAgeBracket(dob) {
  if (!dob) return 'adult';
  const age = calcAge(dob);
  if (age < 1) return 'infant';
  if (age <= 4) return 'toddler';
  if (age <= 12) return 'child';
  if (age <= 17) return 'teen';
  return 'adult';
}
function getExpectedWeightIdx(dob, sex) {
  if (!dob) return -1;
  const age = calcAge(dob);
  const bracket = getAgeBracket(dob);
  const ranges = WEIGHT_RANGES[bracket];
  if (bracket === 'adult') return sex === 'F' ? 1 : 2;
  if (bracket === 'teen') return sex === 'F' ? 1 : 2;
  return Math.min(Math.floor(ranges.length / 2), ranges.length - 1);
}
function getWeightMidpoint() {
  if (!selectedWeight) return NaN;
  const m = selectedWeight.match(/^(\d+)-(\d+)kg$/);
  if (m) return Math.round((parseInt(m[1]) + parseInt(m[2])) / 2);
  const m2 = selectedWeight.match(/^(\d+)\+kg$/);
  if (m2) return parseInt(m2[1]) + 10;
  return NaN;
}
function renderWeightRanges() {
  const container = document.getElementById('weightRangeRow');
  if (!container) return;
  const dob = document.getElementById('fDOB').value;
  const sex = getToggleValue('sexToggle');
  const bracket = getAgeBracket(dob);
  const ranges = WEIGHT_RANGES[bracket];
  container.innerHTML = ranges.map((r, i) => {
    const label = r[1] >= 100 ? r[0] + '+kg' : r[0] + '-' + r[1] + 'kg';
    const isActive = selectedWeight === label;
    let cls = 'weight-range-btn';
    if (isActive) cls += ' active';
    return `<button type="button" class="${cls}" data-label="${label}">${label}</button>`;
  }).join('');
  container.querySelectorAll('.weight-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedWeight = selectedWeight === btn.dataset.label ? '' : btn.dataset.label;
      renderWeightRanges();
      renderRxPresets();
      document.querySelectorAll('.med-line').forEach(line => updateMedPreview(line));
    });
  });
}

// Chief concern buttons
function renderComplaintButtons() {
  const grid = document.getElementById('complaintGrid');
  if (!grid) return;
  grid.innerHTML = COMMON_COMPLAINTS.map((c, i) => {
    if (isPresetHidden('complaints', c)) return '';
    const sel = selectedComplaints.has(i) ? ' selected' : '';
    return `<button type="button" class="complaint-btn${sel}" data-idx="${i}">${esc(c)}</button>`;
  }).join('');
  grid.querySelectorAll('.complaint-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleComplaint(parseInt(btn.dataset.idx)));
  });
}
function toggleComplaint(idx) {
  const complaint = COMMON_COMPLAINTS[idx];
  const el = document.getElementById('fChiefConcern');
  if (selectedComplaints.has(idx)) {
    selectedComplaints.delete(idx);
    const parts = el.value.split('; ').filter(p => p !== complaint);
    el.value = parts.join('; ');
  } else {
    selectedComplaints.add(idx);
    el.value = el.value ? el.value + '; ' + complaint : complaint;
  }
  renderComplaintButtons();
}

// Procedure buttons
function renderProcedureButtons() {
  const procs = getProcedures().filter(p => !isPresetHidden('procedures', p));
  const grid = document.getElementById('procedureGrid');
  if (!grid) return;
  grid.innerHTML = procs.map(p => {
    const active = selectedProcedures.includes(p) ? ' active' : '';
    return `<button type="button" class="procedure-btn${active}" data-name="${esc(p)}">${esc(p)}</button>`;
  }).join('');
  grid.querySelectorAll('.procedure-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const idx = selectedProcedures.indexOf(name);
      if (idx >= 0) selectedProcedures.splice(idx, 1);
      else selectedProcedures.push(name);
      renderProcedureButtons();
    });
  });
}

// Provider buttons
function renderProviderButtons() {
  const providers = getProviders();
  const grid = document.getElementById('providerGrid');
  if (!grid) return;
  grid.innerHTML = providers.map(p => {
    const active = selectedProvider === p ? ' active' : '';
    return `<button type="button" class="provider-btn${active}" data-name="${esc(p)}">${esc(p)}</button>`;
  }).join('');
  grid.querySelectorAll('.provider-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedProvider = selectedProvider === btn.dataset.name ? '' : btn.dataset.name;
      renderProviderButtons();
    });
  });
}

// Blood glucose interpretation
function updateBloodGlucoseInterp() {
  const val = parseFloat(document.getElementById('fBloodGlucose').value);
  const el = document.getElementById('bgInterpretation');
  if (!val || isNaN(val)) { el.innerHTML = ''; return; }
  if (val < 140) { el.innerHTML = '<span class="bg-normal">Normal (<140 mg/dL)</span>'; }
  else if (val < 200) { el.innerHTML = '<span class="bg-elevated">Elevated (140-199 mg/dL)</span>'; }
  else { el.innerHTML = '<span class="bg-high">High (\u2265200 mg/dL)</span>'; }
}

// Referral type button grid
let selectedReferralType = 'None';
let selectedImagingType = '';

function renderReferralButtons() {
  const grid = document.getElementById('referralBtnGrid');
  if (!grid) return;
  const types = getReferralTypes().filter(t => !isPresetHidden('referralTypes', t));
  grid.innerHTML = types.map(t => {
    const active = selectedReferralType === t ? ' active' : '';
    return `<button type="button" class="referral-btn${active}" data-val="${esc(t)}">${esc(t)}</button>`;
  }).join('');
  grid.querySelectorAll('.referral-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedReferralType = btn.dataset.val;
      renderReferralButtons();
      // Show/hide referral date picker
      const dateRow = document.getElementById('referralDateRow');
      if (dateRow) {
        dateRow.style.display = (selectedReferralType && selectedReferralType !== 'None') ? 'block' : 'none';
      }
    });
  });
}

// Keep for backward compat — now just re-renders buttons
function populateReferralSelect() { renderReferralButtons(); }

// BP range buttons
const BP_RANGES = [
  { label: '90/60', value: '90/60', range: 'low' },
  { label: '100/70', value: '100/70', range: 'normal' },
  { label: '110/70', value: '110/70', range: 'normal' },
  { label: '120/80', value: '120/80', range: 'normal' },
  { label: '130/85', value: '130/85', range: 'elevated' },
  { label: '140/90', value: '140/90', range: 'stage1' },
  { label: '150/95', value: '150/95', range: 'stage1' },
  { label: '160/100', value: '160/100', range: 'stage2' },
  { label: '180/110', value: '180/110', range: 'crisis' },
  { label: '200/120', value: '200/120', range: 'crisis' }
];
let selectedBP = '';

function renderBPRanges() {
  const container = document.getElementById('bpRangeRow');
  if (!container) return;
  container.innerHTML = BP_RANGES.map(bp => {
    const isActive = selectedBP === bp.value;
    let cls = 'bp-range-btn';
    if (isActive) {
      if (bp.range === 'normal') cls += ' active';
      else if (bp.range === 'elevated') cls += ' active';
      else if (bp.range === 'stage1') cls += ' active-fever';
      else if (bp.range === 'stage2' || bp.range === 'crisis') cls += ' active-high';
      else if (bp.range === 'low') cls += ' active-fever';
    }
    return `<button type="button" class="${cls}" data-val="${bp.value}" data-range="${bp.range}" title="${bp.value} mmHg">${bp.label}</button>`;
  }).join('');
  container.querySelectorAll('.bp-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedBP = selectedBP === btn.dataset.val ? '' : btn.dataset.val;
      document.getElementById('fBP').value = selectedBP;
      renderBPRanges();
    });
  });
}

// Dx to Rx suggestion helper
function getSuggestedRxPresetNames() {
  const suggested = new Set();
  const allDx = typeof _getAllDxPresets === 'function' ? _getAllDxPresets() : DX_PRESETS;
  selectedDxPresets.forEach(idx => {
    const dx = allDx[idx];
    if (dx && DX_TO_RX_MAP[dx]) {
      DX_TO_RX_MAP[dx].forEach(rxName => suggested.add(rxName));
    }
  });
  return suggested;
}

// ==========================================
// DOB TEXT INPUT — auto-format YYYY-MM-DD
// ==========================================
function initDOBTextInput() {
  const dobEl = document.getElementById('fDOB');
  if (!dobEl || dobEl.type === 'date') return; // only for text input

  dobEl.addEventListener('input', function(e) {
    // Strip non-digits
    let digits = this.value.replace(/\D/g, '');
    // Auto-insert dashes: YYYY-MM-DD
    let formatted = '';
    for (let i = 0; i < digits.length && i < 8; i++) {
      if (i === 4 || i === 6) formatted += '-';
      formatted += digits[i];
    }
    this.value = formatted;
  });

  dobEl.addEventListener('blur', function() {
    // Validate on blur
    const val = this.value;
    if (!val) return;
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const y = parseInt(match[1]), m = parseInt(match[2]), d = parseInt(match[3]);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= new Date().getFullYear()) {
        // Valid — fire change handlers
        updateAgeDisplay();
        updateMRN();
        renderWeightRanges();
        return;
      }
    }
    // Invalid date — keep value but don't process
  });

  dobEl.addEventListener('keydown', function(e) {
    // Allow tab, backspace, delete, arrows
    if (['Tab', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    // Allow Ctrl/Cmd combos (copy, paste, select all)
    if (e.ctrlKey || e.metaKey) return;
    // Only allow digits
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  });
}
