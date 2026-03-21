// ==========================================
// PROVIDERS EDITOR
// ==========================================
function renderProviders() {
  const providers = getProviders();
  const body = document.getElementById('providerBody');
  body.innerHTML = providers.map((p, i) => `<tr>
    <td>${esc(p)}</td>
    <td class="formulary-actions">
      <button class="btn-edit" data-idx="${i}">Edit</button>
      <button class="btn-del" data-idx="${i}">Remove</button>
    </td>
  </tr>`).join('');
  body.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openProviderModal(parseInt(btn.dataset.idx)));
  });
  body.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Remove this physician?')) return;
      const ps = getProviders(); ps.splice(parseInt(btn.dataset.idx), 1);
      saveProviders(ps); renderProviders(); renderProviderButtons();
    });
  });
}

function openProviderModal(editIdx) {
  editingProviderId = editIdx !== undefined ? editIdx : null;
  const modal = document.getElementById('providerModal');
  if (editIdx !== undefined && editIdx !== null) {
    const providers = getProviders();
    document.getElementById('providerModalTitle').textContent = 'Edit Physician';
    document.getElementById('pmName').value = providers[editIdx] || '';
  } else {
    document.getElementById('providerModalTitle').textContent = 'Add Physician';
    document.getElementById('pmName').value = '';
  }
  modal.classList.add('open');
}
function closeProviderModal() { document.getElementById('providerModal').classList.remove('open'); editingProviderId = null; }

function saveProviderItem() {
  const name = document.getElementById('pmName').value.trim();
  if (!name) { alert('Physician name is required.'); return; }
  const providers = getProviders();
  if (editingProviderId !== null && editingProviderId !== undefined) {
    providers[editingProviderId] = name;
  } else {
    providers.push(name);
  }
  saveProviders(providers); renderProviders(); renderProviderButtons(); closeProviderModal();
}

// ==========================================
// SITES EDITOR
// ==========================================
function renderSites() {
  const sites = getSites();
  const body = document.getElementById('siteBody');
  body.innerHTML = sites.map((s, i) => `<tr>
    <td>${esc(s)}</td>
    <td class="formulary-actions">
      <button class="btn-edit" data-idx="${i}">Edit</button>
      <button class="btn-del" data-idx="${i}">Remove</button>
    </td>
  </tr>`).join('');
  body.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openSiteModal(parseInt(btn.dataset.idx)));
  });
  body.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Remove this site?')) return;
      const ss = getSites(); ss.splice(parseInt(btn.dataset.idx), 1);
      saveSites(ss); renderSites(); populateSiteSelects();
    });
  });
}

function openSiteModal(editIdx) {
  editingSiteId = editIdx !== undefined ? editIdx : null;
  const modal = document.getElementById('siteModal');
  if (editIdx !== undefined && editIdx !== null) {
    const sites = getSites();
    document.getElementById('siteModalTitle').textContent = 'Edit Site';
    document.getElementById('smName').value = sites[editIdx] || '';
  } else {
    document.getElementById('siteModalTitle').textContent = 'Add Site';
    document.getElementById('smName').value = '';
  }
  modal.classList.add('open');
}
function closeSiteModal() { document.getElementById('siteModal').classList.remove('open'); editingSiteId = null; }

function saveSiteItem() {
  const name = document.getElementById('smName').value.trim();
  if (!name) { alert('Site name is required.'); return; }
  const sites = getSites();
  if (editingSiteId !== null && editingSiteId !== undefined) {
    sites[editingSiteId] = name;
  } else {
    sites.push(name);
  }
  saveSites(sites); renderSites(); populateSiteSelects(); closeSiteModal();
}

// ==========================================
// PROCEDURES EDITOR
// ==========================================
function renderProceduresEditor() {
  const procs = getProcedures();
  const body = document.getElementById('procedureBody');
  body.innerHTML = procs.map((p, i) => `<tr>
    <td>${esc(p)}</td>
    <td class="formulary-actions">
      <button class="btn-edit" data-idx="${i}">Edit</button>
      <button class="btn-del" data-idx="${i}">Remove</button>
    </td>
  </tr>`).join('');
  body.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openProcedureModal(parseInt(btn.dataset.idx)));
  });
  body.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Remove this procedure?')) return;
      const ps = getProcedures(); ps.splice(parseInt(btn.dataset.idx), 1);
      saveProceduresData(ps); renderProceduresEditor(); renderProcedureButtons();
    });
  });
}

function openProcedureModal(editIdx) {
  editingProcedureId = editIdx !== undefined ? editIdx : null;
  const modal = document.getElementById('procedureModal');
  if (editIdx !== undefined && editIdx !== null) {
    const procs = getProcedures();
    document.getElementById('procedureModalTitle').textContent = 'Edit Procedure';
    document.getElementById('procmName').value = procs[editIdx] || '';
  } else {
    document.getElementById('procedureModalTitle').textContent = 'Add Procedure';
    document.getElementById('procmName').value = '';
  }
  modal.classList.add('open');
}
function closeProcedureModal() { document.getElementById('procedureModal').classList.remove('open'); editingProcedureId = null; }

function saveProcedureItem() {
  const name = document.getElementById('procmName').value.trim();
  if (!name) { alert('Procedure name is required.'); return; }
  const procs = getProcedures();
  if (editingProcedureId !== null && editingProcedureId !== undefined) {
    procs[editingProcedureId] = name;
  } else {
    procs.push(name);
  }
  saveProceduresData(procs); renderProceduresEditor(); renderProcedureButtons(); closeProcedureModal();
}

// ==========================================
// RX PRESETS EDITOR
// ==========================================
function renderRxPresetsEditor() {
  const presets = getRxPresetsData();
  const body = document.getElementById('rxPresetBody');
  body.innerHTML = presets.map((p, i) => `<tr>
    <td>${esc(p.name)}</td>
    <td style="font-size:12px;color:var(--gray-600);">${esc(p.rx)}</td>
    <td class="formulary-actions">
      <button class="btn-edit" data-idx="${i}">Edit</button>
      <button class="btn-del" data-idx="${i}">Remove</button>
    </td>
  </tr>`).join('');
  body.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openRxPresetModal(parseInt(btn.dataset.idx)));
  });
  body.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Remove this Rx preset?')) return;
      const ps = getRxPresetsData(); ps.splice(parseInt(btn.dataset.idx), 1);
      saveRxPresetsData(ps); renderRxPresetsEditor();
    });
  });
}

function buildRpmDrugSelect(selectedId) {
  const formulary = getFormulary();
  const categories = [...new Set(formulary.map(f => f.category))];
  let html = '<option value="">\u2014 Select medication \u2014</option>';
  categories.forEach(cat => {
    html += `<optgroup label="${esc(cat)}">`;
    formulary.filter(f => f.category === cat).forEach(med => {
      const sel = med.id === selectedId ? 'selected' : '';
      const ctrl = med.controlled ? ' \u26a0' : '';
      html += `<option value="${med.id}" ${sel}>${esc(med.name)}${ctrl}</option>`;
    });
    html += '</optgroup>';
  });
  return html;
}

function addRpmMedLine(medId, dose, freq, duration) {
  const formulary = getFormulary();
  const med = medId ? formulary.find(f => f.id === medId) : null;
  const div = document.createElement('div');
  div.className = 'med-line';
  const doseVal = dose || (med ? med.dose : '');
  div.innerHTML = `
    <select class="med-drug-select">${buildRpmDrugSelect(medId || '')}</select>
    <input type="text" class="med-dose-input" value="${esc(doseVal)}" placeholder="Dose">
    <select class="med-freq-select">${FREQUENCIES.map(f => `<option value="${f.value}" ${f.value === (freq||'') ? 'selected' : ''}>${f.label}</option>`).join('')}</select>
    <select class="med-dur-select">${DURATIONS.map(d => `<option ${d === (duration||'') ? 'selected' : ''}>${d}</option>`).join('')}</select>
    <button class="btn-remove" title="Remove">&times;</button>`;
  document.getElementById('rpmMedBuilder').appendChild(div);
  div.querySelector('.med-drug-select').addEventListener('change', function() {
    const selMed = formulary.find(f => f.id === this.value);
    if (selMed) div.querySelector('.med-dose-input').value = selMed.dose;
  });
  div.querySelector('.btn-remove').addEventListener('click', () => div.remove());
}

function generateRxSummary() {
  const formulary = getFormulary();
  const lines = [];
  document.querySelectorAll('#rpmMedBuilder .med-line').forEach(line => {
    const medId = line.querySelector('.med-drug-select').value;
    const med = formulary.find(f => f.id === medId);
    if (!med) return;
    const dose = line.querySelector('.med-dose-input').value;
    const freq = line.querySelector('.med-freq-select').value;
    const dur = line.querySelector('.med-dur-select').value;
    const freqLabel = FREQUENCIES.find(f => f.value === freq)?.label || freq;
    lines.push(`${med.name} ${dose} ${freqLabel} ${dur}`);
  });
  return lines.join(' + ');
}

function openRxPresetModal(editIdx) {
  editingRxPresetId = editIdx !== undefined ? editIdx : null;
  const modal = document.getElementById('rxPresetModal');
  document.getElementById('rpmMedBuilder').innerHTML = '';
  if (editIdx !== undefined && editIdx !== null) {
    const presets = getRxPresetsData();
    const p = presets[editIdx];
    document.getElementById('rxPresetModalTitle').textContent = 'Edit Rx Preset';
    document.getElementById('rpmName').value = p.name || '';
    document.getElementById('rpmNotes').value = p.notes || '';
    if (p.meds && p.meds.length) {
      p.meds.forEach(m => addRpmMedLine(m.medId, m.dose, m.freq, m.duration));
    }
  } else {
    document.getElementById('rxPresetModalTitle').textContent = 'Add Rx Preset';
    document.getElementById('rpmName').value = '';
    document.getElementById('rpmNotes').value = '';
  }
  modal.classList.add('open');
}

function closeRxPresetModal() { document.getElementById('rxPresetModal').classList.remove('open'); editingRxPresetId = null; }

function saveRxPresetItem() {
  const name = document.getElementById('rpmName').value.trim();
  if (!name) { alert('Preset name is required.'); return; }
  const formulary = getFormulary();
  const meds = [];
  document.querySelectorAll('#rpmMedBuilder .med-line').forEach(line => {
    const medId = line.querySelector('.med-drug-select').value;
    const dose = line.querySelector('.med-dose-input').value;
    const freq = line.querySelector('.med-freq-select').value;
    const duration = line.querySelector('.med-dur-select').value;
    if (medId) meds.push({ medId, dose, freq, duration });
  });
  const rx = generateRxSummary() || 'See treatment notes';
  const notes = document.getElementById('rpmNotes').value.trim();
  const item = { name, rx, meds };
  if (notes) item.notes = notes;
  const presets = getRxPresetsData();
  if (editingRxPresetId !== null && editingRxPresetId !== undefined) {
    presets[editingRxPresetId] = item;
  } else {
    presets.push(item);
  }
  saveRxPresetsData(presets); renderRxPresetsEditor(); closeRxPresetModal();
}
