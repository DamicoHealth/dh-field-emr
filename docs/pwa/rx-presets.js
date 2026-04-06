// ==========================================
// RX PRESETS
// ==========================================
function getMalariaWeightBracket(weightKg) {
  if (!weightKg || weightKg < 5) return null;
  if (weightKg > 35) return '>35kg';
  if (weightKg >= 25) return '25-35kg';
  if (weightKg >= 15) return '15-25kg';
  return '5-15kg';
}

function renderRxPresets() {
  const grid = document.getElementById('rxPresetsGrid');
  const presets = getRxPresetsData();
  const weight = getWeightMidpoint();
  const bracket = getMalariaWeightBracket(weight);
  const suggestedNames = getSuggestedRxPresetNames();
  grid.innerHTML = presets.map((p, i) => {
    if (isPresetHidden('rxPresets', p.name)) return '';
    const sel = selectedRxPresets.has(i) ? ' selected' : '';
    const isMalaria = p.name.toLowerCase().includes('malaria');
    const isMatch = isMalaria && bracket && p.name.includes(bracket);
    const matchClass = isMatch ? ' rx-weight-match' : '';
    let isSuggested = false;
    suggestedNames.forEach(sn => {
      if (sn === 'Malaria' && isMalaria) isSuggested = true;
      else if (p.name === sn) isSuggested = true;
    });
    const suggestClass = (isSuggested && !sel) ? ' rx-dx-suggested' : '';
    const badge = isMatch ? `<span style="font-size:10px;color:var(--primary);font-weight:700;"> \u2190 ${weight}kg</span>` : '';
    return `<button class="rx-preset-btn${sel}${matchClass}${suggestClass}" data-idx="${i}">
      <div class="rx-name">${esc(p.name)}${badge}</div>
      <div class="rx-detail">${esc(p.rx)}</div>
    </button>`;
  }).join('');
  grid.querySelectorAll('.rx-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleRxPreset(parseInt(btn.dataset.idx)));
  });
}

function toggleRxPreset(idx) {
  const presets = getRxPresetsData();
  const preset = presets[idx];
  if (!preset) return;
  if (selectedRxPresets.has(idx)) {
    selectedRxPresets.delete(idx);
    preset.meds.forEach(pm => {
      const lines = document.querySelectorAll('.med-line');
      for (const line of lines) {
        if (line.querySelector('.med-drug-select').value === pm.medId) {
          line.remove();
          break;
        }
      }
    });
  } else {
    selectedRxPresets.add(idx);
    preset.meds.forEach(m => addMedLine(m.medId, m.dose, m.freq, m.duration));
    if (preset.notes) {
      const tn = document.getElementById('fTreatmentNotes');
      tn.value = tn.value ? tn.value + '\n' + preset.notes : preset.notes;
    }
  }
  renderRxPresets();
}
