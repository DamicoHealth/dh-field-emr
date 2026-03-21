// ==========================================
// DX PRESETS
// ==========================================
function getDxUsageCounts() {
  const counts = {};
  DX_PRESETS.forEach((dx, i) => { counts[i] = 0; });
  records.forEach(r => {
    if (!r.diagnosis) return;
    DX_PRESETS.forEach((dx, i) => { if (r.diagnosis.includes(dx)) counts[i]++; });
  });
  return counts;
}

function renderDxPresets() {
  const grid = document.getElementById('dxPresetsGrid');
  const counts = getDxUsageCounts();
  function makeDxBtn(i) {
    const sel = selectedDxPresets.has(i) ? ' selected' : '';
    const countBadge = counts[i] > 0 ? ` <span style="opacity:0.7;font-size:10px;">(${counts[i]})</span>` : '';
    return `<button class="preset-btn${sel}" data-idx="${i}">${esc(DX_PRESETS[i])}${countBadge}</button>`;
  }
  if (dxSortMode === 'system') {
    let html = '';
    Object.entries(DX_SYSTEMS).forEach(([system, dxList]) => {
      const idxs = dxList.map(dx => DX_PRESETS.indexOf(dx)).filter(i => i >= 0);
      if (!idxs.length) return;
      html += `<div class="dx-system-header">${esc(system)}</div>`;
      idxs.forEach(i => { html += makeDxBtn(i); });
    });
    grid.innerHTML = html;
  } else if (dxSortMode === 'alpha') {
    const sortedIdxs = DX_PRESETS.map((_, i) => i).sort((a, b) => DX_PRESETS[a].localeCompare(DX_PRESETS[b]));
    grid.innerHTML = sortedIdxs.map(i => makeDxBtn(i)).join('');
  } else {
    const sortedIdxs = DX_PRESETS.map((_, i) => i).sort((a, b) => {
      const diff = counts[b] - counts[a];
      return diff !== 0 ? diff : DX_PRESETS[a].localeCompare(DX_PRESETS[b]);
    });
    grid.innerHTML = sortedIdxs.map(i => makeDxBtn(i)).join('');
  }
  grid.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleDxPreset(parseInt(btn.dataset.idx)));
  });
}

function toggleDxPreset(idx) {
  const dx = DX_PRESETS[idx];
  const dxEl = document.getElementById('fDiagnosis');
  if (selectedDxPresets.has(idx)) {
    selectedDxPresets.delete(idx);
    const parts = dxEl.value.split('; ').filter(p => p !== dx);
    dxEl.value = parts.join('; ');
  } else {
    selectedDxPresets.add(idx);
    if (dxEl.value && !dxEl.value.includes(dx)) {
      dxEl.value += '; ' + dx;
    } else if (!dxEl.value) {
      dxEl.value = dx;
    }
  }
  renderDxPresets();
  renderRxPresets();
}
