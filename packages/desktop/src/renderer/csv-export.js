// ==========================================
// CSV EXPORT
// ==========================================
function generateCSV(recs) {
  const cols = ['MRN', 'Date', 'Site', 'GivenName', 'FamilyName', 'Sex', 'DOB', 'Phone', 'Pregnant', 'Breastfeeding', 'Temp', 'BP', 'Weight_kg', 'Allergies', 'CurrentMeds', 'PMH', 'ChiefConcern'];
  LAB_TESTS.forEach(t => { cols.push('Lab_' + t.replace(/[^a-zA-Z0-9]/g, '') + '_Ordered', 'Lab_' + t.replace(/[^a-zA-Z0-9]/g, '') + '_Result'); });
  UA_PARAMS.forEach(p => cols.push('UA_' + p));
  cols.push('BloodGlucose_mgdL', 'LabComments', 'Diagnosis', 'Medications', 'Procedures', 'TreatmentNotes', 'ReferralType', 'Provider', 'Notes', 'AgeEstimated', 'SavedAt');
  const csvEsc = (val) => { const s = String(val || ''); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  let csv = cols.map(csvEsc).join(',') + '\n';
  recs.forEach(r => {
    const gn = r.givenName || (r.name ? r.name.split(' ')[0] : '');
    const fn = r.familyName || (r.name ? r.name.split(' ').slice(1).join(' ') : '');
    const row = [r.mrn, r.date, r.site, gn, fn, r.sex, r.dob, r.phone, r.pregnant, r.breastfeeding, r.temp, r.bp, r.weight, r.allergies, r.currentMeds, r.pmh, r.chiefConcern];
    LAB_TESTS.forEach(t => { const lab = r.labs && r.labs[t] ? r.labs[t] : {}; row.push(lab.ordered ? 'Yes' : 'No', lab.result || 'N/A'); });
    UA_PARAMS.forEach(p => row.push(r.urinalysis ? r.urinalysis[p] : ''));
    row.push(r.bloodGlucose || '', r.labComments, r.diagnosis, r.treatment || '', r.procedures ? r.procedures.join('; ') : '', r.treatmentNotes, r.referralType || 'None', r.provider, r.notes, r.ageEstimated ? 'Yes' : 'No', r.savedAt);
    csv += row.map(csvEsc).join(',') + '\n';
  });
  return csv;
}
async function exportCSV(filteredRecords) { await window.electronAPI.exportCSV(generateCSV(filteredRecords || records)); }
