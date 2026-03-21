// ==========================================
// RECORDS SCREEN
// ==========================================
function renderStats() {
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter(r => r.date === today);
  const referred = records.filter(r => r.referralType && r.referralType !== 'None');
  const pregnant = records.filter(r => r.pregnant === 'Yes');
  const pediatric = records.filter(r => r.dob && calcAge(r.dob) < 18);
  document.getElementById('statsBar').innerHTML = `
    <div class="stat-card"><div class="stat-val">${records.length}</div><div class="stat-lbl">Total Patients</div></div>
    <div class="stat-card"><div class="stat-val">${todayRecords.length}</div><div class="stat-lbl">Today</div></div>
    <div class="stat-card"><div class="stat-val">${pediatric.length}</div><div class="stat-lbl">Pediatric (&lt;18)</div></div>
    <div class="stat-card"><div class="stat-val">${referred.length}</div><div class="stat-lbl">Referred</div></div>
    <div class="stat-card"><div class="stat-val">${pregnant.length}</div><div class="stat-lbl">Pregnant</div></div>`;
}

function hasLabPositive(r) {
  if (!r.labs) return false;
  return LAB_TESTS.some(t => r.labs[t] && r.labs[t].result === 'POS');
}

function renderRecords() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const siteFilter = document.getElementById('siteFilter').value;
  let filtered = records.filter(r => {
    if (siteFilter && r.site !== siteFilter) return false;
    if (search) {
      const fullN = r.givenName ? `${r.givenName} ${r.familyName}` : r.name;
      const hay = `${fullN} ${r.mrn || ''} ${r.chiefConcern} ${r.diagnosis}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
  filtered.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
  if (filtered.length === 0) {
    document.getElementById('recordsList').innerHTML = '<div class="empty-state">No records found. Click "+ New Encounter" to add one.</div>';
    return;
  }
  document.getElementById('recordsList').innerHTML = filtered.map(r => {
    const age = r.dob ? calcAge(r.dob) : '';
    const sexAge = [r.sex, age ? age + 'y' : ''].filter(Boolean).join('/');
    const badges = [];
    if (hasLabPositive(r)) badges.push('<span class="badge badge-red">Lab+</span>');
    if (r.referralType && r.referralType !== 'None') badges.push('<span class="badge badge-amber">Referred</span>');
    if (r.pregnant === 'Yes') badges.push('<span class="badge badge-blue">Pregnant</span>');
    const dxPreview = (r.diagnosis || '').slice(0, 80) + ((r.diagnosis || '').length > 80 ? '...' : '');
    return `
      <div class="record-card" data-id="${r.id}">
        <div>
          <div class="rc-name">${esc(r.givenName ? r.givenName + ' ' + (r.familyName || '') : r.name || 'Unknown')}</div>
          <div class="rc-meta">${esc(r.site || '')} \u00b7 ${formatDate(r.date)} \u00b7 ${esc(sexAge)} \u00b7 ${esc(r.chiefConcern || '').slice(0, 50)}</div>
          ${r.deviceId && r.deviceId !== currentDeviceId ? `<div class="rc-device">From: ${esc(r.deviceId)}</div>` : ''}
        </div>
        <div class="rc-badges">${badges.join('')}</div>
        ${dxPreview ? `<div class="rc-dx">${esc(dxPreview)}</div>` : ''}
      </div>`;
  }).join('');
  document.querySelectorAll('.record-card').forEach(card => {
    card.addEventListener('click', () => openRecord(card.dataset.id));
  });
}

function populateSiteSelects() {
  const sites = getSites();
  const selects = [document.getElementById('fSite'), document.getElementById('siteFilter'), document.getElementById('analyticsSite')];
  selects.forEach(sel => {
    if (!sel) return;
    const current = sel.value;
    const isFilter = sel.id !== 'fSite';
    sel.innerHTML = (isFilter ? '<option value="">All Sites</option>' : '<option value="">Select Site</option>') +
      sites.map(s => `<option>${s}</option>`).join('');
    sel.value = current;
  });
}
