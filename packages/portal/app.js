// ==========================================
// DH Field EMR — Web Portal
// ==========================================

let SUPABASE_URL = '';
let SUPABASE_KEY = '';
let records = [];
let sites = [];

// ==========================================
// SUPABASE CLIENT
// ==========================================

async function supabaseFetch(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

// ==========================================
// SETUP
// ==========================================

function initSetup() {
  // Check for saved credentials
  const saved = localStorage.getItem('dh-portal-config');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      if (config.url && config.key) {
        SUPABASE_URL = config.url;
        SUPABASE_KEY = config.key;
        document.getElementById('setupModal').classList.remove('active');
        loadRecords();
        return;
      }
    } catch {}
  }

  document.getElementById('btnConnect').addEventListener('click', connect);
}

async function connect() {
  const url = document.getElementById('setupUrl').value.trim();
  const key = document.getElementById('setupKey').value.trim();
  const errEl = document.getElementById('setupError');

  if (!url || !key) {
    errEl.textContent = 'Both fields are required.';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  try {
    // Test connection
    const res = await fetch(`${url}/rest/v1/records?limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    SUPABASE_URL = url;
    SUPABASE_KEY = key;
    localStorage.setItem('dh-portal-config', JSON.stringify({ url, key }));
    document.getElementById('setupModal').classList.remove('active');
    loadRecords();
  } catch (err) {
    errEl.textContent = `Connection failed: ${err.message}`;
    errEl.style.display = 'block';
  }
}

// ==========================================
// DATA LOADING
// ==========================================

async function loadRecords() {
  try {
    const data = await supabaseFetch('records', 'deleted=eq.false&order=saved_at.desc');
    records = data.map(rowToRecord);
    sites = [...new Set(records.map(r => r.site).filter(Boolean))].sort();
    populateSiteSelects();
    renderStats();
    renderRecords();
  } catch (err) {
    console.error('Failed to load records:', err);
  }
}

function rowToRecord(row) {
  return {
    id: row.id,
    site: row.site || '',
    date: row.date || '',
    mrn: row.mrn || '',
    deviceId: row.device_id || '',
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
    referralType: row.referral_type || 'None',
    provider: row.provider || '',
    notes: row.notes || '',
    ageEstimated: !!row.age_estimated,
    savedAt: row.saved_at || ''
  };
}

// ==========================================
// HELPERS
// ==========================================

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function calcAge(dob) {
  if (!dob) return '';
  const b = new Date(dob); const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function hasLabPositive(r) {
  if (!r.labs) return false;
  return Object.values(r.labs).some(v => v && v.result === 'POS');
}

// ==========================================
// RENDER
// ==========================================

function populateSiteSelects() {
  const selects = ['siteFilter', 'analyticsSite'];
  selects.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">All Sites</option>';
    sites.forEach(s => { sel.innerHTML += `<option value="${esc(s)}">${esc(s)}</option>`; });
    sel.value = val;
  });
}

function renderStats() {
  const filtered = getFilteredRecords();
  const bar = document.getElementById('statsBar');
  const total = filtered.length;
  const male = filtered.filter(r => r.sex === 'M').length;
  const female = filtered.filter(r => r.sex === 'F').length;
  const labPos = filtered.filter(hasLabPositive).length;
  bar.innerHTML = `
    <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Records</div></div>
    <div class="stat-card"><div class="stat-value">${male}</div><div class="stat-label">Male</div></div>
    <div class="stat-card"><div class="stat-value">${female}</div><div class="stat-label">Female</div></div>
    <div class="stat-card"><div class="stat-value">${labPos}</div><div class="stat-label">Lab+</div></div>
  `;
}

function getFilteredRecords() {
  const search = (document.getElementById('searchInput').value || '').toLowerCase();
  const site = document.getElementById('siteFilter').value;
  const from = document.getElementById('dateFrom') ? document.getElementById('dateFrom').value : '';
  const to = document.getElementById('dateTo') ? document.getElementById('dateTo').value : '';

  return records.filter(r => {
    if (site && r.site !== site) return false;
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (search) {
      const hay = `${r.name} ${r.givenName} ${r.familyName} ${r.chiefConcern} ${r.diagnosis} ${r.mrn}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function renderRecords() {
  const filtered = getFilteredRecords();
  const list = document.getElementById('recordsList');
  renderStats();

  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--gray-400);padding:40px;">No records found</div>';
    return;
  }

  list.innerHTML = filtered.map(r => {
    const age = calcAge(r.dob);
    const ageStr = age !== '' ? ` (${age}${r.sex ? r.sex : ''})` : '';
    const labFlag = hasLabPositive(r) ? '<span class="lab-flag lab-pos">LAB+</span>' : '';
    const referralFlag = r.referralType && r.referralType !== 'None' ? `<span class="lab-flag" style="background:#f59e0b;color:#fff;">REF</span>` : '';
    return `<div class="record-card" data-id="${r.id}">
      <div class="name">${esc(r.name || r.givenName + ' ' + r.familyName)}${ageStr}</div>
      <div class="dx">${esc(r.diagnosis || r.chiefConcern || '')} ${labFlag} ${referralFlag}</div>
      <div class="date">${formatDate(r.date)}</div>
    </div>`;
  }).join('');

  list.querySelectorAll('.record-card').forEach(card => {
    card.addEventListener('click', () => openRecordModal(card.dataset.id));
  });
}

// ==========================================
// RECORD DETAIL MODAL
// ==========================================

function openRecordModal(id) {
  const r = records.find(rec => rec.id === id);
  if (!r) return;

  const age = calcAge(r.dob);
  const ageStr = age !== '' ? `${age}y` : '';
  document.getElementById('recordModalTitle').textContent = r.name || r.givenName + ' ' + r.familyName;

  let html = '';

  // Demographics
  html += `<div class="detail-section"><h4>Demographics</h4><div class="detail-grid">
    <div><span class="detail-label">Site:</span> <span class="detail-value">${esc(r.site)}</span></div>
    <div><span class="detail-label">Date:</span> <span class="detail-value">${formatDate(r.date)}</span></div>
    <div><span class="detail-label">Sex:</span> <span class="detail-value">${esc(r.sex)}</span></div>
    <div><span class="detail-label">Age:</span> <span class="detail-value">${ageStr}</span></div>
    <div><span class="detail-label">DOB:</span> <span class="detail-value">${esc(r.dob)}</span></div>
    <div><span class="detail-label">Phone:</span> <span class="detail-value">${esc(r.phone)}</span></div>
    <div><span class="detail-label">MRN:</span> <span class="detail-value">${esc(r.mrn)}</span></div>
  </div></div>`;

  // Vitals
  html += `<div class="detail-section"><h4>Vitals</h4><div class="detail-grid">
    <div><span class="detail-label">Temp:</span> <span class="detail-value">${esc(r.temp)}</span></div>
    <div><span class="detail-label">BP:</span> <span class="detail-value">${esc(r.bp)}</span></div>
    <div><span class="detail-label">Weight:</span> <span class="detail-value">${esc(r.weight)}</span></div>
    <div><span class="detail-label">Pregnant:</span> <span class="detail-value">${esc(r.pregnant)}</span></div>
    <div><span class="detail-label">Breastfeeding:</span> <span class="detail-value">${esc(r.breastfeeding)}</span></div>
  </div></div>`;

  // History
  html += `<div class="detail-section"><h4>History</h4><div class="detail-grid">
    <div class="detail-full"><span class="detail-label">Allergies:</span> <span class="detail-value">${esc(r.allergies)}</span></div>
    <div class="detail-full"><span class="detail-label">Current Meds:</span> <span class="detail-value">${esc(r.currentMeds)}</span></div>
    <div class="detail-full"><span class="detail-label">PMH:</span> <span class="detail-value">${esc(r.pmh)}</span></div>
    <div class="detail-full"><span class="detail-label">Chief Concern:</span> <span class="detail-value">${esc(r.chiefConcern)}</span></div>
  </div></div>`;

  // Labs
  if (r.labs && Object.keys(r.labs).length > 0) {
    html += `<div class="detail-section"><h4>Labs</h4><div class="detail-grid">`;
    for (const [k, v] of Object.entries(r.labs)) {
      if (!v || !v.ordered) continue;
      const color = v.result === 'POS' ? 'color:var(--red);font-weight:700;' : '';
      html += `<div><span class="detail-label">${esc(k)}:</span> <span class="detail-value" style="${color}">${esc(v.result || 'N/A')}</span></div>`;
    }
    html += `</div>`;
    if (r.bloodGlucose) html += `<div style="margin-top:6px;"><span class="detail-label">Blood Glucose:</span> <span class="detail-value">${esc(r.bloodGlucose)} mg/dL</span></div>`;
    if (r.labComments) html += `<div style="margin-top:6px;"><span class="detail-label">Lab Comments:</span> <span class="detail-value">${esc(r.labComments)}</span></div>`;
    html += `</div>`;
  }

  // Urinalysis
  if (r.urinalysis && Object.keys(r.urinalysis).length > 0) {
    html += `<div class="detail-section"><h4>Urinalysis</h4><div class="detail-grid">`;
    for (const [k, v] of Object.entries(r.urinalysis)) {
      html += `<div><span class="detail-label">${esc(k)}:</span> <span class="detail-value">${esc(v)}</span></div>`;
    }
    html += `</div></div>`;
  }

  // Clinical
  html += `<div class="detail-section"><h4>Clinical</h4><div class="detail-grid">
    <div class="detail-full"><span class="detail-label">Diagnosis:</span> <span class="detail-value">${esc(r.diagnosis)}</span></div>`;
  if (r.medications && r.medications.length > 0) {
    html += `<div class="detail-full"><span class="detail-label">Medications:</span><ul style="margin:4px 0 0 16px;">`;
    r.medications.forEach(m => {
      const parts = [m.name || m.medId, m.dose, m.freq, m.duration].filter(Boolean);
      html += `<li>${esc(parts.join(' '))}</li>`;
    });
    html += `</ul></div>`;
  }
  if (r.treatmentNotes) html += `<div class="detail-full"><span class="detail-label">Treatment Notes:</span> <span class="detail-value">${esc(r.treatmentNotes)}</span></div>`;
  if (r.procedures && r.procedures.length > 0) html += `<div class="detail-full"><span class="detail-label">Procedures:</span> <span class="detail-value">${esc(r.procedures.join(', '))}</span></div>`;
  if (r.referralType && r.referralType !== 'None') html += `<div class="detail-full"><span class="detail-label">Referral:</span> <span class="detail-value">${esc(r.referralType)}</span></div>`;
  html += `<div><span class="detail-label">Provider:</span> <span class="detail-value">${esc(r.provider)}</span></div>`;
  if (r.notes) html += `<div class="detail-full"><span class="detail-label">Notes:</span> <span class="detail-value">${esc(r.notes)}</span></div>`;
  html += `</div></div>`;

  document.getElementById('recordModalBody').innerHTML = html;
  document.getElementById('recordModal').classList.add('active');
}

// ==========================================
// NAVIGATION & INIT
// ==========================================

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + btn.dataset.screen).classList.add('active');
    if (btn.dataset.screen === 'analytics') renderAnalytics();
  });
});

document.getElementById('recordModalClose').addEventListener('click', () => {
  document.getElementById('recordModal').classList.remove('active');
});

document.getElementById('searchInput').addEventListener('input', renderRecords);
document.getElementById('siteFilter').addEventListener('change', renderRecords);
if (document.getElementById('dateFrom')) document.getElementById('dateFrom').addEventListener('change', renderRecords);
if (document.getElementById('dateTo')) document.getElementById('dateTo').addEventListener('change', renderRecords);

['analyticsFrom', 'analyticsTo', 'analyticsSite', 'analyticsSex'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', renderAnalytics);
});
document.getElementById('analyticsReset').addEventListener('click', () => {
  document.getElementById('analyticsFrom').value = '';
  document.getElementById('analyticsTo').value = '';
  document.getElementById('analyticsSite').value = '';
  document.getElementById('analyticsSex').value = '';
  renderAnalytics();
});

initSetup();
