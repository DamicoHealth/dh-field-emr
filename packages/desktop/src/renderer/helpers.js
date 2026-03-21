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
function updateMRN() {
  const given = document.getElementById('fGivenName').value.trim();
  const family = document.getElementById('fFamilyName').value.trim();
  const dob = document.getElementById('fDOB').value;
  if (given && family && dob) {
    const initials = (given.charAt(0) + family.charAt(0)).toUpperCase();
    const dobParts = dob.split('-');
    const dobStr = dobParts[2] + dobParts[1] + dobParts[0];
    document.getElementById('fMRN').value = initials + dobStr;
  } else {
    document.getElementById('fMRN').value = '';
  }
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
    const label = btn.textContent;
    if (label === selectedTemp) {
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
  const procs = getProcedures();
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

// Referral type select population
function populateReferralSelect() {
  const sel = document.getElementById('fReferralType');
  if (!sel) return;
  const types = getReferralTypes();
  sel.innerHTML = types.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
}

// Dx to Rx suggestion helper
function getSuggestedRxPresetNames() {
  const suggested = new Set();
  selectedDxPresets.forEach(idx => {
    const dx = DX_PRESETS[idx];
    if (DX_TO_RX_MAP[dx]) {
      DX_TO_RX_MAP[dx].forEach(rxName => suggested.add(rxName));
    }
  });
  return suggested;
}
