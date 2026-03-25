// ==========================================
// CSV EXPORT
// ==========================================
function generateCSV(recs) {
  // Calculate encounter number per patient (by MRN, ordered by date)
  const encounterNumMap = {};
  const sortedForNum = [...recs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const encNumLookup = {};
  sortedForNum.forEach(r => {
    const mrn = r.mrn || r.id;
    if (!encounterNumMap[mrn]) encounterNumMap[mrn] = 0;
    encounterNumMap[mrn]++;
    encNumLookup[r.id] = encounterNumMap[mrn];
  });
  const cols = ['MRN', 'EncounterNum', 'Date', 'Site', 'GivenName', 'FamilyName', 'Sex', 'DOB', 'Phone', 'Pregnant', 'Breastfeeding', 'Temp', 'BP', 'Weight_kg', 'Allergies', 'CurrentMeds', 'PMH', 'ChiefConcern'];
  // Add columns for all lab tests
  DEFAULT_LAB_TESTS.forEach(t => {
    const safe = t.name.replace(/[^a-zA-Z0-9]/g, '');
    if (t.type === 'toggle') {
      cols.push('Lab_' + safe + '_Ordered', 'Lab_' + safe + '_Result');
    } else if (t.type === 'numeric') {
      cols.push('Lab_' + safe + '_Value', 'Lab_' + safe + '_Unit', 'Lab_' + safe + '_Interp');
    }
  });
  UA_PARAMS.forEach(p => cols.push('UA_' + p));
  cols.push('LabComments', 'Diagnosis', 'Medications', 'Procedures', 'TreatmentNotes', 'ReferralType', 'Provider', 'Notes', 'AgeEstimated', 'SavedAt');
  const csvEsc = (val) => { const s = String(val || ''); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  let csv = cols.map(csvEsc).join(',') + '\n';
  recs.forEach(r => {
    const gn = r.givenName || (r.name ? r.name.split(' ')[0] : '');
    const fn = r.familyName || (r.name ? r.name.split(' ').slice(1).join(' ') : '');
    const row = [r.mrn, encNumLookup[r.id] || 1, r.date, r.site, gn, fn, r.sex, r.dob, r.phone, r.pregnant, r.breastfeeding, r.temp, r.bp, r.weight, r.allergies, r.currentMeds, r.pmh, r.chiefConcern];
    DEFAULT_LAB_TESTS.forEach(t => {
      const lab = r.labs && r.labs[t.name] ? r.labs[t.name] : {};
      if (t.type === 'toggle') {
        row.push(lab.ordered ? 'Yes' : 'No', lab.result || 'N/A');
      } else if (t.type === 'numeric') {
        row.push(lab.value || (t.id === 'blood_glucose' && r.bloodGlucose ? r.bloodGlucose : ''), lab.unit || t.unit || '', lab.interpretation || '');
      }
    });
    UA_PARAMS.forEach(p => row.push(r.urinalysis ? r.urinalysis[p] : ''));
    row.push(r.labComments, r.diagnosis, r.treatment || '', r.procedures ? r.procedures.join('; ') : '', r.treatmentNotes, r.referralType || 'None', r.provider, r.notes, r.ageEstimated ? 'Yes' : 'No', r.savedAt);
    csv += row.map(csvEsc).join(',') + '\n';
  });
  return csv;
}
async function exportCSV(filteredRecords) { await window.electronAPI.exportCSV(generateCSV(filteredRecords || records)); }
