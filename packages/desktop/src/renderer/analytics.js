// ==========================================
// ANALYTICS
// ==========================================
function getFilteredRecords() {
  const from = document.getElementById('analyticsFrom').value;
  const to = document.getElementById('analyticsTo').value;
  const site = document.getElementById('analyticsSite').value;
  const sex = document.getElementById('analyticsSex').value;
  return records.filter(r => {
    if (from && r.date < from) return false; if (to && r.date > to) return false;
    if (site && r.site !== site) return false; if (sex && r.sex !== sex) return false; return true;
  });
}

function renderAnalytics() {
  const filtered = getFilteredRecords();
  const total = filtered.length;
  const femaleCount = filtered.filter(r => r.sex === 'F').length;
  const femalePct = total ? Math.round((femaleCount / total) * 100) : 0;
  const labPos = filtered.filter(r => hasLabPositive(r)).length;
  const referred = filtered.filter(r => r.referralType && r.referralType !== 'None').length;
  const pregnant = filtered.filter(r => r.pregnant === 'Yes').length;
  let totalDispensed = 0;
  filtered.forEach(r => { if (r.medications) r.medications.forEach(m => { if (m.qty) totalDispensed += m.qty; }); });
  document.getElementById('analyticsSummary').innerHTML = `
    <div class="stat-card"><div class="stat-val">${total}</div><div class="stat-lbl">Patients</div></div>
    <div class="stat-card"><div class="stat-val">${femalePct}%</div><div class="stat-lbl">Female</div></div>
    <div class="stat-card"><div class="stat-val">${labPos}</div><div class="stat-lbl">Lab Positives</div></div>
    <div class="stat-card"><div class="stat-val">${referred}</div><div class="stat-lbl">Referred</div></div>
    <div class="stat-card"><div class="stat-val">${pregnant}</div><div class="stat-lbl">Pregnant</div></div>
    <div class="stat-card"><div class="stat-val">${totalDispensed}</div><div class="stat-lbl">Meds Dispensed</div></div>`;
  document.getElementById('chartGrid').innerHTML = `
    <div class="chart-card full"><h4>Disease Burden</h4><canvas id="chartDisease" height="300"></canvas></div>
    <div class="chart-card"><h4>Patients by Site</h4><canvas id="chartSites" height="250"></canvas></div>
    <div class="chart-card"><h4>Sex Distribution</h4><canvas id="chartSex" height="250"></canvas></div>
    <div class="chart-card full"><h4>Lab Positivity</h4><div id="labPositivityTable"></div></div>
    <div class="chart-card"><h4>Patients by Camp Day</h4><canvas id="chartDays" height="250"></canvas></div>
    <div class="chart-card"><h4>Age Distribution</h4><canvas id="chartAge" height="250"></canvas></div>
    <div class="chart-card"><h4>Referrals by Type</h4><canvas id="chartReferralTypes" height="250"></canvas></div>
    <div class="chart-card full"><h4>Referrals and Positive Labs</h4><div id="referralsList"></div></div>
    <div class="chart-card"><h4>Physician Encounters</h4><canvas id="chartProviders" height="250"></canvas></div>
    <div class="chart-card full"><h4>Medication Usage (Top 15)</h4><canvas id="chartMeds" height="300"></canvas></div>
    <div class="chart-card full"><h4>Medication Dispensing (Total Tabs/Caps)</h4><canvas id="chartDispensing" height="300"></canvas></div>`;
  drawDiseaseChart(filtered); drawSitesDonut(filtered); drawSexDonut(filtered);
  drawLabPositivity(filtered); drawDaysChart(filtered); drawAgeChart(filtered);
  drawReferralTypesChart(filtered); drawReferralsList(filtered); drawProviderChart(filtered); drawMedsChart(filtered); drawDispensingChart(filtered);
}

// Canvas helpers
function drawHorizontalBarChart(canvasId, labels, values, color) {
  const canvas = document.getElementById(canvasId); if (!canvas) return;
  const ctx = canvas.getContext('2d'); const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect(); if (rect.width < 1) return;
  canvas.width = rect.width * dpr; const barH = 28, gap = 4, topPad = 10, labelW = 120;
  const totalH = topPad + labels.length * (barH + gap) + 10;
  canvas.height = totalH * dpr; canvas.style.width = rect.width + 'px'; canvas.style.height = totalH + 'px'; ctx.scale(dpr, dpr);
  const maxVal = Math.max(...values, 1); const barAreaW = rect.width - labelW - 50;
  labels.forEach((label, i) => {
    const y = topPad + i * (barH + gap);
    ctx.fillStyle = '#374151'; ctx.font = '12px -apple-system, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(label, labelW - 8, y + barH / 2);
    const w = (values[i] / maxVal) * barAreaW;
    ctx.fillStyle = color || '#F68630'; ctx.beginPath(); ctx.roundRect(labelW, y, Math.max(w, 2), barH, 4); ctx.fill();
    ctx.fillStyle = '#374151'; ctx.textAlign = 'left'; ctx.fillText(String(values[i]), labelW + w + 6, y + barH / 2);
  });
}
function drawDonut(canvasId, labels, values, colors) {
  const canvas = document.getElementById(canvasId); if (!canvas) return;
  const ctx = canvas.getContext('2d'); const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect(); const size = Math.max(Math.min(rect.width, 250), 80);
  if (rect.width < 1) return;
  canvas.width = size * dpr; canvas.height = size * dpr; canvas.style.width = size + 'px'; canvas.style.height = size + 'px'; ctx.scale(dpr, dpr);
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) { ctx.fillStyle = '#9ca3af'; ctx.font = '14px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('No data', size/2, size/2); return; }
  const cx = size/2, cy = size/2, r = size/2 - 30, innerR = r * 0.55; let startAngle = -Math.PI / 2;
  values.forEach((val, i) => {
    if (val === 0) return; const sliceAngle = (val / total) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle); ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true); ctx.closePath();
    ctx.fillStyle = colors[i % colors.length]; ctx.fill();
    const lx = cx + Math.cos(startAngle + sliceAngle/2) * (r - 20), ly = cy + Math.sin(startAngle + sliceAngle/2) * (r - 20);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const pct = Math.round((val / total) * 100); if (pct >= 5) ctx.fillText(pct + '%', lx, ly);
    startAngle += sliceAngle;
  });
}
function drawVerticalBarChart(canvasId, labels, values, color) {
  const canvas = document.getElementById(canvasId); if (!canvas) return;
  const ctx = canvas.getContext('2d'); const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect(); if (rect.width < 1) return; const w = rect.width, h = 220;
  canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; ctx.scale(dpr, dpr);
  const pad = { top: 20, bottom: 40, left: 40, right: 20 };
  const chartW = w - pad.left - pad.right, chartH = h - pad.top - pad.bottom;
  const maxVal = Math.max(...values, 1); const barW = Math.min(40, (chartW / labels.length) * 0.7); const barGap = chartW / labels.length;
  ctx.strokeStyle = '#e5e7eb'; ctx.fillStyle = '#9ca3af'; ctx.font = '11px -apple-system, sans-serif'; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) { const y = pad.top + chartH - (chartH * i / 4); ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke(); ctx.fillText(String(Math.round(maxVal * i / 4)), pad.left - 6, y + 3); }
  labels.forEach((label, i) => {
    const x = pad.left + barGap * i + (barGap - barW) / 2; const bH = (values[i] / maxVal) * chartH; const y = pad.top + chartH - bH;
    ctx.fillStyle = color || '#F68630'; ctx.beginPath(); ctx.roundRect(x, y, barW, bH, [4, 4, 0, 0]); ctx.fill();
    ctx.fillStyle = '#374151'; ctx.font = '11px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(values[i]), x + barW/2, y - 5);
    ctx.fillStyle = '#6b7280'; ctx.font = '10px -apple-system, sans-serif'; ctx.save(); ctx.translate(x + barW/2, pad.top + chartH + 6); ctx.rotate(Math.PI / 6); ctx.textAlign = 'left'; ctx.fillText(label, 0, 0); ctx.restore();
  });
}

function drawDiseaseChart(filtered) {
  const counts = {}; Object.keys(DISEASE_CATEGORIES).forEach(k => { counts[k] = 0; });
  filtered.forEach(r => { if (!r.diagnosis) return; Object.entries(DISEASE_CATEGORIES).forEach(([cat, regex]) => { if (regex.test(r.diagnosis)) counts[cat]++; }); });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  drawHorizontalBarChart('chartDisease', sorted.map(s => s[0]), sorted.map(s => s[1]), '#F68630');
}
function drawSitesDonut(filtered) { const sites = getSites(); drawDonut('chartSites', sites, sites.map(s => filtered.filter(r => r.site === s).length), ['#F68630', '#c2590a', '#fb923c', '#fed7aa', '#ea580c', '#fdba74']); }
function drawSexDonut(filtered) { drawDonut('chartSex', ['Male', 'Female'], [filtered.filter(r => r.sex === 'M').length, filtered.filter(r => r.sex === 'F').length], ['#3b82f6', '#F68630']); }
function drawLabPositivity(filtered) {
  let html = '<table class="lab-table"><thead><tr><th>Test</th><th>Ordered</th><th>Positive</th><th>%</th></tr></thead><tbody>';
  LAB_TESTS.forEach(t => {
    const ordered = filtered.filter(r => r.labs && r.labs[t] && r.labs[t].ordered).length;
    const positive = filtered.filter(r => r.labs && r.labs[t] && r.labs[t].result === 'POS').length;
    const pct = ordered ? Math.round((positive / ordered) * 100) : 0;
    html += `<tr><td>${t}</td><td>${ordered}</td><td>${positive}</td><td class="${pct >= 10 ? 'pct-red' : pct >= 5 ? 'pct-amber' : ''}">${pct}%</td></tr>`;
  });
  document.getElementById('labPositivityTable').innerHTML = html + '</tbody></table>';
}
function drawDaysChart(filtered) {
  const days = {}; filtered.forEach(r => { if (r.date) days[r.date] = (days[r.date] || 0) + 1; });
  const sorted = Object.entries(days).sort((a, b) => a[0].localeCompare(b[0]));
  drawVerticalBarChart('chartDays', sorted.map(s => formatDate(s[0])), sorted.map(s => s[1]), '#F68630');
}
function drawAgeChart(filtered) {
  const bins = { '0-12': 0, '13-18': 0, '19-35': 0, '36-59': 0, '60+': 0 };
  filtered.forEach(r => { if (!r.dob) return; const age = calcAge(r.dob); if (age <= 12) bins['0-12']++; else if (age <= 18) bins['13-18']++; else if (age <= 35) bins['19-35']++; else if (age <= 59) bins['36-59']++; else bins['60+']++; });
  drawVerticalBarChart('chartAge', Object.keys(bins), Object.values(bins), '#fb923c');
}
function drawReferralTypesChart(filtered) {
  const types = getReferralTypes().filter(t => t !== 'None');
  const counts = {};
  types.forEach(t => { counts[t] = 0; });
  filtered.forEach(r => { if (r.referralType && r.referralType !== 'None' && counts[r.referralType] !== undefined) counts[r.referralType]++; });
  const sorted = Object.entries(counts).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
  if (sorted.length) drawVerticalBarChart('chartReferralTypes', sorted.map(s => s[0]), sorted.map(s => s[1]), '#ea580c');
}
function drawReferralsList(filtered) {
  let items = [];
  filtered.forEach(r => {
    if (r.referralType && r.referralType !== 'None') items.push({ name: r.name || r.givenName || 'Unknown', detail: 'Referral: ' + r.referralType });
    if (hasLabPositive(r)) { const posTests = LAB_TESTS.filter(t => r.labs[t] && r.labs[t].result === 'POS'); items.push({ name: r.name || r.givenName || 'Unknown', detail: 'Lab+: ' + posTests.join(', ') }); }
  });
  document.getElementById('referralsList').innerHTML = items.length === 0 ? '<div class="empty-state" style="padding:20px;">No referrals or positive labs in selection.</div>'
    : '<div class="named-list">' + items.map(it => `<div class="named-list-item"><span class="nli-name">${esc(it.name)}</span><span class="nli-detail">${esc(it.detail)}</span></div>`).join('') + '</div>';
}
function drawProviderChart(filtered) {
  const providers = getProviders(); const counts = {};
  providers.forEach(p => { counts[p] = 0; });
  filtered.forEach(r => { if (r.provider && counts[r.provider] !== undefined) counts[r.provider]++; });
  const sorted = Object.entries(counts).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
  if (sorted.length) drawVerticalBarChart('chartProviders', sorted.map(s => s[0]), sorted.map(s => s[1]), '#c2590a');
}
function drawMedsChart(filtered) {
  const formulary = getFormulary(); const counts = {};
  filtered.forEach(r => { if (!r.medications) return; r.medications.forEach(m => { const med = formulary.find(f => f.id === m.medId); counts[med ? med.name : m.medId] = (counts[med ? med.name : m.medId] || 0) + 1; }); });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);
  if (sorted.length) drawHorizontalBarChart('chartMeds', sorted.map(s => s[0]), sorted.map(s => s[1]), '#F68630');
}
function drawDispensingChart(filtered) {
  const formulary = getFormulary(); const totals = {};
  filtered.forEach(r => {
    if (!r.medications) return;
    r.medications.forEach(m => {
      if (!m.qty) return;
      const med = formulary.find(f => f.id === m.medId);
      const name = med ? med.name : m.medId;
      totals[name] = (totals[name] || 0) + m.qty;
    });
  });
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 15);
  if (sorted.length) drawHorizontalBarChart('chartDispensing', sorted.map(s => s[0]), sorted.map(s => s[1]), '#2E86AB');
}
