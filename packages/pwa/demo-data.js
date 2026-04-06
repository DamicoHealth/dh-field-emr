// ==========================================
// DEMO DATA — seeds localStorage with ~500 realistic patient records
// ==========================================
(function() {
  const PREFIX = 'dhemr_';
  const SEEDED_KEY = PREFIX + 'seeded_v6';

  if (localStorage.getItem(SEEDED_KEY)) {
    const existing = localStorage.getItem(PREFIX + 'records');
    if (existing && JSON.parse(existing).length > 50) {
      console.log('[demo-data] already seeded');
      return;
    }
  }

  // Clear old data
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) localStorage.removeItem(k);
  }

  console.log('[demo-data] generating...');

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function uuid() { return crypto.randomUUID(); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  const SITES = ['Mpunge', 'Bunakijja', 'Terere', 'Ntenjeru', 'Kayunga', 'Nambi'];
  const PROVIDERS = ['Dr. Kamya', 'Dr. Nsubuga', 'NP Nabirye', 'CO Mukiibi'];
  const TRANSPORT = ['Walk', 'Walk', 'Walk', 'Boda', 'Boda', 'Private', 'Taxi'];
  const COMPLAINTS = ['Abdominal Pain','Dysuria','Fever','Cough','Headache','Skin Rash/Itching','Diarrhea','Body/Joint Pain','Wound/Injury','Eye Problem'];
  const REFERRAL_TYPES = ['None','Surgery','Follow-up','Specialist','Hospital','Lab Work'];
  const PROCEDURES = ['I&D (Incision & Drainage)','Wound Closure/Sutures','Wound Debridement','Joint Injection','Foreign Body Removal','Splinting/Casting'];

  const NAMES_F = ['Aisha','Amina','Grace','Harriet','Joyce','Juliet','Lydia','Mary','Miriam','Naomi','Patience','Peace','Prossy','Rebecca','Ruth','Sarah','Sylvia','Winnie','Florence','Gloria','Hannah','Irene','Janet','Joy','Lucy','Margaret','Martha','Monica','Nancy','Olive','Rachel','Rose','Sandra','Sharon','Susan','Violet','Beatrice','Agnes','Alice','Catherine','Dorothy'];
  const NAMES_M = ['Aaron','Abraham','Alex','Andrew','Benjamin','Brian','Charles','Daniel','David','Edward','Emmanuel','Eric','Francis','Fred','George','Henry','Isaac','Jacob','James','John','Joseph','Julius','Kenneth','Mark','Michael','Moses','Nathan','Patrick','Paul','Peter','Philip','Richard','Robert','Samuel','Simon','Stephen','Thomas','Timothy','Victor','William'];
  const SURNAMES = ['Atuhaire','Birungi','Bwambale','Byamugisha','Kabandize','Kakooza','Kamugisha','Kansiime','Kato','Kayongo','Kiiza','Kizito','Lubega','Mugisha','Muhindo','Musiime','Mwesigye','Nakayima','Nambooze','Nansubuga','Nassali','Ndagire','Ntambi','Nuwagira','Obonyo','Odongo','Opio','Rujumba','Sendagire','Tusingwire','Wamala','Wasswa','Byaruhanga','Ahimbisibwe','Tumusiime'];

  const DX_POOL = [
    { dx: 'Malaria', w: 22, rxMeds: [{medId:'am-artefan',dose:'4 tabs',freq:'q12h',duration:'3d'}] },
    { dx: 'URTI', w: 14, rxMeds: [{medId:'abx-amox500',dose:'500mg',freq:'q8h',duration:'7d'}] },
    { dx: 'Viral URTI', w: 8, rxMeds: [{medId:'an-para500',dose:'500mg',freq:'q8h',duration:'5d'},{medId:'as-cetir',dose:'10mg',freq:'q24h',duration:'5d'}] },
    { dx: 'UTI', w: 8, rxMeds: [{medId:'abx-nitro',dose:'100mg',freq:'q12h',duration:'7d'}] },
    { dx: 'Gastroenteritis', w: 6, rxMeds: [{medId:'gi-ors',dose:'1',freq:'q8h',duration:'3d'},{medId:'gi-loper',dose:'4mg',freq:'q8h',duration:'3d'}] },
    { dx: 'MSK Pain', w: 5, rxMeds: [{medId:'an-ibu',dose:'400mg',freq:'q8h',duration:'5d'}] },
    { dx: 'PUD/GERD', w: 5, rxMeds: [{medId:'gi-omep',dose:'20mg',freq:'q12h',duration:'14d'}] },
    { dx: 'Helminth Infection', w: 4, rxMeds: [{medId:'ap-alben',dose:'400mg',freq:'once',duration:'Single dose'}] },
    { dx: 'Allergic Reaction', w: 3, rxMeds: [{medId:'as-cetir',dose:'10mg',freq:'q24h',duration:'7d'},{medId:'as-pred',dose:'5mg',freq:'q24h',duration:'5d'}] },
    { dx: 'Cellulitis', w: 3, rxMeds: [{medId:'abx-ceph',dose:'250mg',freq:'q8h',duration:'7d'}] },
    { dx: 'Tinea/Fungal', w: 3, rxMeds: [{medId:'af-griseo',dose:'500mg',freq:'q24h',duration:'14d'}] },
    { dx: 'Typhoid', w: 3, rxMeds: [{medId:'abx-cipro',dose:'500mg',freq:'q12h',duration:'7d'}] },
    { dx: 'Hypertension', w: 3, rxMeds: [] },
    { dx: 'Scabies', w: 2, rxMeds: [{medId:'ap-iverm',dose:'200mcg/kg',freq:'once',duration:'Single dose'}] },
    { dx: 'Candidiasis', w: 2, rxMeds: [{medId:'af-fluco',dose:'150mg',freq:'once',duration:'Single dose'}] },
    { dx: 'Pregnancy', w: 2, rxMeds: [{medId:'vit-prenatal',dose:'1 tab',freq:'q24h',duration:'Ongoing'}] },
    { dx: 'GC/Chlamydia', w: 2, rxMeds: [{medId:'abx-ceftri',dose:'500mg',freq:'once',duration:'Single dose'},{medId:'abx-azithro1g',dose:'1g',freq:'once',duration:'Single dose'}] },
    { dx: 'Conjunctivitis', w: 2, rxMeds: [] },
    { dx: 'Abscess', w: 1, rxMeds: [{medId:'abx-ceph',dose:'250mg',freq:'q8h',duration:'7d'}] },
    { dx: 'Dehydration', w: 1, rxMeds: [{medId:'gi-ors',dose:'1',freq:'q8h',duration:'3d'}] },
    { dx: 'Syphilis', w: 1, rxMeds: [{medId:'abx-benza',dose:'2.4MU',freq:'once',duration:'Single dose'}] }
  ];
  const DX_WEIGHTED = [];
  DX_POOL.forEach(d => { for (let i = 0; i < d.w; i++) DX_WEIGHTED.push(d); });

  // 4 weeks of clinics
  const WEEK_DAYS = [
    // Week 1: Mon-Thu clinic + Fri surgery
    ['2026-01-05','2026-01-06','2026-01-07','2026-01-08'],
    // Week 2: Mon-Wed clinic + Thu surgery
    ['2026-01-12','2026-01-13','2026-01-14'],
    // Week 3: Mon-Thu clinic
    ['2026-01-19','2026-01-20','2026-01-21','2026-01-22'],
    // Week 4: Mon-Wed clinic + Thu surgery
    ['2026-01-26','2026-01-27','2026-01-28']
  ];
  const SURGERY_DAYS = ['2026-01-09', '2026-01-15', '2026-01-29'];

  const allClinicDays = WEEK_DAYS.flat();
  const records = [];

  for (let i = 0; i < 500; i++) {
    const sex = Math.random() < 0.6 ? 'F' : 'M';
    const gn = sex === 'M' ? pick(NAMES_M) : pick(NAMES_F);
    const fn = pick(SURNAMES);
    const name = gn + ' ' + fn;

    // Age distribution
    let age;
    const r = Math.random();
    if (r < 0.3) age = randInt(0, 12);
    else if (r < 0.5) age = randInt(13, 17);
    else if (r < 0.8) age = randInt(18, 35);
    else if (r < 0.95) age = randInt(36, 59);
    else age = randInt(60, 85);

    const birthYear = 2026 - age;
    const birthMonth = randInt(1, 12);
    const birthDay = randInt(1, 28);
    const dob = `${birthYear}-${pad(birthMonth)}-${pad(birthDay)}`;
    const mrn = (gn.substring(0, 2) + fn.substring(0, 2)).toUpperCase() + pad(birthDay) + pad(birthMonth) + birthYear;

    const date = pick(allClinicDays);
    const site = pick(SITES);
    const provider = pick(PROVIDERS);
    const dxItem = pick(DX_WEIGHTED);

    const pregnant = (sex === 'F' && age >= 15 && age <= 45 && dxItem.dx === 'Pregnancy') ? 'Yes' : (sex === 'F' ? pick(['No', 'No', 'No', 'N/A']) : 'N/A');
    const bf = (sex === 'F' && pregnant === 'No' && Math.random() < 0.1) ? 'Yes' : (sex === 'F' ? 'No' : 'N/A');

    // Weight ranges by age
    let weight;
    if (age <= 1) weight = randInt(3, 10) + 'kg';
    else if (age <= 4) weight = randInt(10, 20) + 'kg';
    else if (age <= 12) weight = randInt(18, 45) + 'kg';
    else if (age <= 17) weight = randInt(35, 70) + 'kg';
    else weight = randInt(45, 95) + 'kg';

    const temps = ['37.0', '37.0', '37.0', '38.0', '38.5', '39.0', '39.5', '40.0'];
    const temp = Math.random() < 0.9 ? pick(temps) : '';

    const systolic = [110, 115, 120, 125, 130, 135, 140, 145, 150, 160];
    const diastolic = [70, 75, 80, 85, 90, 95];
    const bp = Math.random() < 0.85 ? pick(systolic) + '/' + pick(diastolic) : '';

    // Labs
    const labs = {};
    if (dxItem.dx === 'Malaria' || Math.random() < 0.3) {
      const pos = dxItem.dx === 'Malaria' ? Math.random() < 0.85 : Math.random() < 0.1;
      labs['Malaria RDT'] = { ordered: true, result: pos ? 'POS' : 'NEG', type: 'toggle' };
    }
    if (Math.random() < 0.15) {
      labs['HIV Rapid Test'] = { ordered: true, result: Math.random() < 0.05 ? 'POS' : 'NEG', type: 'toggle' };
    }
    if (Math.random() < 0.08) {
      const val = randInt(65, 250);
      labs['Blood Glucose'] = { ordered: true, value: String(val), unit: 'mg/dL', type: 'numeric', interpretation: val < 70 ? 'Low' : val < 140 ? 'Normal' : val < 200 ? 'Elevated' : 'High' };
    }
    if (Math.random() < 0.12) {
      const val = (randInt(60, 160) / 10).toFixed(1);
      labs['Hemoglobin'] = { ordered: true, value: val, unit: 'g/dL', type: 'numeric', interpretation: parseFloat(val) < 7 ? 'Severe Anemia' : parseFloat(val) < 10 ? 'Moderate Anemia' : parseFloat(val) < 12 ? 'Mild Anemia' : 'Normal' };
    }
    if (sex === 'F' && age >= 15 && age <= 45 && Math.random() < 0.08) {
      labs['HCG/Pregnancy'] = { ordered: true, result: dxItem.dx === 'Pregnancy' ? 'POS' : 'NEG', type: 'toggle' };
    }

    // Referral
    let referralType = 'None', referralDate = '', referralStatus = '';
    const rr = Math.random();
    if (rr < 0.03) { referralType = 'Surgery'; referralDate = pick(SURGERY_DAYS); referralStatus = pick(['Pending', 'Completed', 'Completed', 'No-show']); }
    else if (rr < 0.07) { referralType = 'Follow-up'; }
    else if (rr < 0.09) { referralType = 'Specialist'; }
    else if (rr < 0.10) { referralType = 'Hospital'; }

    // Procedures
    const procs = Math.random() < 0.05 ? [pick(PROCEDURES)] : [];

    const record = {
      id: uuid(),
      site, date, mrn, givenName: gn, familyName: fn, name, sex, dob,
      phone: '256' + randInt(700000000, 799999999),
      pregnant, breastfeeding: bf,
      temp, bp, weight,
      allergies: Math.random() < 0.05 ? 'Penicillin' : 'NKDA',
      currentMeds: Math.random() < 0.1 ? 'Ongoing medications' : 'None',
      pmh: Math.random() < 0.15 ? pick(['Hypertension', 'Diabetes', 'HIV', 'Asthma', 'None']) : 'None',
      chiefConcern: pick(COMPLAINTS),
      transport: pick(TRANSPORT),
      travelTime: String(randInt(5, 120)),
      labs, labComments: '',
      urinalysis: {},
      bloodGlucose: labs['Blood Glucose'] ? labs['Blood Glucose'].value : '',
      diagnosis: dxItem.dx,
      medications: dxItem.rxMeds.map(m => ({ id: uuid(), medId: m.medId, dose: m.dose, freq: m.freq, duration: m.duration, qty: null, qtyUnit: null })),
      treatmentNotes: '',
      treatment: dxItem.rxMeds.map(m => m.dose + ' ' + m.freq + ' x ' + m.duration).join(' + ') || 'See notes',
      procedures: procs,
      imaging: '',
      surgery: '',
      referralType, referralDate, referralStatus,
      provider,
      notes: '',
      ageEstimated: Math.random() < 0.05,
      savedAt: new Date(date + 'T' + pad(randInt(8, 16)) + ':' + pad(randInt(0, 59)) + ':00Z').toISOString(),
      deleted: false,
      deviceId: 'demo-device-001'
    };

    records.push(record);
  }

  // Add ~30 return patients
  for (let i = 0; i < 30; i++) {
    const src = records[randInt(0, Math.min(200, records.length - 1))];
    const newDate = pick(allClinicDays);
    if (newDate === src.date) continue;
    const returnRec = {
      ...src,
      id: uuid(),
      date: newDate,
      site: pick(SITES),
      provider: pick(PROVIDERS),
      savedAt: new Date(newDate + 'T' + pad(randInt(8, 16)) + ':' + pad(randInt(0, 59)) + ':00Z').toISOString(),
      notes: 'Return visit',
      referralType: 'None', referralDate: '', referralStatus: ''
    };
    records.push(returnRec);
  }

  records.sort((a, b) => b.date.localeCompare(a.date));

  // Save records
  localStorage.setItem(PREFIX + 'records', JSON.stringify(records));

  // Save config
  function lsSet(k, v) { localStorage.setItem(PREFIX + k, JSON.stringify(v)); }
  lsSet('sites', SITES);
  lsSet('providers', PROVIDERS);
  lsSet('procedures', PROCEDURES);
  lsSet('referralTypes', REFERRAL_TYPES);
  lsSet('complaints', COMPLAINTS);
  lsSet('setting_deviceId', 'demo-device-001');
  lsSet('setting_deviceName', 'Demo Device');
  lsSet('setting_deviceRole', 'admin');
  lsSet('setting_standaloneMode', 'true');
  lsSet('hiddenPresets', {
    diagnoses: [], procedures: [], complaints: [],
    referralTypes: [], rxPresets: [],
    labTests: ['Hepatitis C (Anti-HCV)', 'COVID-19 Rapid', 'TB (AFB Smear)']
  });

  localStorage.setItem(SEEDED_KEY, '1');
  console.log('[demo-data] seeded', records.length, 'records');
})();
