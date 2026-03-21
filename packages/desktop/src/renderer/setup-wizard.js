// ==========================================
// SETUP WIZARD
// ==========================================

const WIZARD_STEPS_FULL = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'create-project', title: 'Create Supabase Project' },
  { id: 'credentials', title: 'Enter Credentials' },
  { id: 'create-tables', title: 'Create Tables' },
  { id: 'verify', title: 'Verify' },
  { id: 'seed', title: 'Seed Config' },
  { id: 'device', title: 'Register Device' },
  { id: 'done', title: 'Done' }
];

const WIZARD_STEPS_JOIN = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'credentials', title: 'Enter Credentials' },
  { id: 'device', title: 'Register Device' },
  { id: 'done', title: 'Done' }
];

let WIZARD_STEPS = WIZARD_STEPS_FULL;
let wizardStep = 0;
let wizardUrl = '';
let wizardKey = '';
let wizardIsJoining = false;

function showSetupWizard() {
  document.getElementById('setupWizard').style.display = '';
  wizardStep = 0;
  renderWizardStep();
}

function hideSetupWizard() {
  document.getElementById('setupWizard').style.display = 'none';
}

function renderWizardProgress() {
  const el = document.getElementById('wizardProgress');
  el.innerHTML = WIZARD_STEPS.map((s, i) => {
    let cls = 'wizard-step-dot';
    if (i < wizardStep) cls += ' done';
    else if (i === wizardStep) cls += ' active';
    return `<div class="${cls}" title="${s.title}"></div>`;
  }).join('');
}

function renderWizardStep() {
  renderWizardProgress();
  const content = document.getElementById('wizardContent');
  const nav = document.getElementById('wizardNav');
  const step = WIZARD_STEPS[wizardStep];

  switch (step.id) {
    case 'welcome':
      content.innerHTML = `
        <h2>Set Up DH Field EMR</h2>
        <p>Is this the first computer being set up for your organization, or are you joining an existing setup?</p>
        <div style="display:flex;gap:12px;margin-top:16px;">
          <button class="btn btn-primary" onclick="wizardStartFull()" style="flex:1;padding:16px;">
            <strong>New Organization</strong><br><span style="font-size:12px;opacity:0.8;">Set up Supabase from scratch</span>
          </button>
          <button class="btn btn-secondary" onclick="wizardStartJoin()" style="flex:1;padding:16px;border:2px solid var(--primary);">
            <strong>Join Existing Setup</strong><br><span style="font-size:12px;opacity:0.8;">Another computer was already set up</span>
          </button>
        </div>`;
      nav.innerHTML = '';
      break;

    case 'create-project':
      content.innerHTML = `
        <div class="wizard-step-title">Step 1: Create a Supabase Project</div>
        <p>Go to <strong>supabase.com</strong> and create a free account if you don't have one.</p>
        <p>Then create a new project. Choose any name and a strong database password. Select the region closest to you.</p>
        <p>Once the project is created, go to <strong>Settings &gt; API</strong> in the Supabase dashboard. You'll need two values from there:</p>
        <ul style="font-size:13px;color:var(--gray-600);margin:4px 0 0 20px;line-height:2;">
          <li><strong>Project URL</strong> — looks like https://xxxxx.supabase.co</li>
          <li><strong>anon public</strong> key — a long string starting with "eyJ"</li>
        </ul>`;
      nav.innerHTML = `<button class="btn btn-secondary" onclick="wizardBack()">Back</button><button class="btn btn-primary" onclick="wizardNext()">I Have My Credentials</button>`;
      break;

    case 'credentials':
      const credTitle = wizardIsJoining ? 'Enter Your Organization\'s Credentials' : 'Step 2: Enter Supabase Credentials';
      const credDesc = wizardIsJoining
        ? 'Ask your organization administrator for the Supabase URL and anon key. These are the same credentials used on the first computer.'
        : 'Paste your Project URL and anon key below.';
      content.innerHTML = `
        <div class="wizard-step-title">${credTitle}</div>
        <p>${credDesc}</p>
        <div class="form-group" style="margin-top:12px;"><label>Supabase URL</label><input type="text" id="wizardUrl" placeholder="https://your-project.supabase.co" value="${esc(wizardUrl)}"></div>
        <div class="form-group"><label>Supabase Anon Key</label><input type="text" id="wizardKey" placeholder="eyJ..." value="${esc(wizardKey)}"></div>
        <div id="wizardCredError" class="wizard-error" style="display:none;"></div>`;
      nav.innerHTML = `<button class="btn btn-secondary" onclick="wizardBack()">Back</button><button class="btn btn-primary" id="btnWizardTestConn" onclick="wizardTestConnection()">Test Connection</button>`;
      break;

    case 'create-tables':
      content.innerHTML = `
        <div class="wizard-step-title">Step 3: Create Database Tables</div>
        <p>In your Supabase dashboard, go to <strong>SQL Editor</strong> and paste the following SQL, then click "Run":</p>
        <code id="wizardSqlCode">${esc(SETUP_SQL)}</code>
        <button class="btn btn-secondary" onclick="copyWizardSql()" style="margin-top:4px;font-size:12px;">Copy SQL to Clipboard</button>
        <div id="wizardCopyMsg" style="color:var(--green);font-size:12px;margin-top:4px;display:none;">Copied!</div>`;
      nav.innerHTML = `<button class="btn btn-secondary" onclick="wizardBack()">Back</button><button class="btn btn-primary" onclick="wizardNext()">I've Run the SQL</button>`;
      break;

    case 'verify':
      content.innerHTML = `
        <div class="wizard-step-title">Step 4: Verify Tables</div>
        <p>Let's confirm the tables were created correctly.</p>
        <div id="wizardVerifyResult" style="margin-top:12px;"></div>`;
      nav.innerHTML = `<button class="btn btn-secondary" onclick="wizardBack()">Back</button><button class="btn btn-primary" id="btnWizardVerify" onclick="wizardVerifyTables()">Verify Tables</button>`;
      break;

    case 'seed':
      content.innerHTML = `
        <div class="wizard-step-title">Step 5: Seed Default Configuration</div>
        <p>This will upload the default formulary, sites, physicians, rx presets, procedures, and referral types to your cloud database.</p>
        <div id="wizardSeedResult" style="margin-top:12px;"></div>`;
      nav.innerHTML = `<button class="btn btn-secondary" onclick="wizardBack()">Back</button><button class="btn btn-primary" id="btnWizardSeed" onclick="wizardSeedConfig()">Seed Config</button>`;
      break;

    case 'device':
      content.innerHTML = `
        <div class="wizard-step-title">Step 6: Register This Device</div>
        <p>Give this computer a name so you can identify it in the system.</p>
        <div class="form-group" style="margin-top:12px;"><label>Device Name</label><input type="text" id="wizardDeviceName" placeholder="e.g. Laptop 1, Clinic iPad"></div>
        <div id="wizardDeviceError" class="wizard-error" style="display:none;"></div>`;
      nav.innerHTML = `<button class="btn btn-secondary" onclick="wizardBack()">Back</button><button class="btn btn-primary" onclick="wizardRegisterDevice()">Register Device</button>`;
      break;

    case 'done':
      const doneMsg = wizardIsJoining
        ? 'This device is now connected to your organization. Records will sync automatically with all other devices.'
        : 'Your DH Field EMR is connected to the cloud. Records will sync automatically.';
      const doneHint = wizardIsJoining
        ? ''
        : '<p style="margin-top:16px;font-size:13px;color:var(--gray-500);">To set up additional computers, download the app on each one and choose "Join Existing Setup." To manage configuration (formulary, sites, etc.), use the web portal.</p>';
      content.innerHTML = `
        <div style="text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">&#10003;</div>
          <h2>You're All Set!</h2>
          <p>${doneMsg}</p>
          ${doneHint}
        </div>`;
      nav.innerHTML = `<span></span><button class="btn btn-primary" onclick="wizardFinish()" style="padding:10px 40px;">Launch App</button>`;
      break;
  }
}

function wizardStartFull() {
  wizardIsJoining = false;
  WIZARD_STEPS = WIZARD_STEPS_FULL;
  wizardStep = 0;
  wizardNext();
}

function wizardStartJoin() {
  wizardIsJoining = true;
  WIZARD_STEPS = WIZARD_STEPS_JOIN;
  wizardStep = 0;
  wizardNext();
}

function wizardNext() { wizardStep++; renderWizardStep(); }
function wizardBack() { wizardStep--; renderWizardStep(); }

async function wizardTestConnection() {
  const url = document.getElementById('wizardUrl').value.trim();
  const key = document.getElementById('wizardKey').value.trim();
  const errEl = document.getElementById('wizardCredError');

  if (!url || !key) {
    errEl.textContent = 'Both fields are required.';
    errEl.style.display = '';
    return;
  }

  errEl.style.display = 'none';
  document.getElementById('btnWizardTestConn').textContent = 'Testing...';

  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    wizardUrl = url;
    wizardKey = key;

    if (wizardIsJoining) {
      // Verify tables exist before letting them proceed
      const result = await window.electronAPI.verifyTables(url, key);
      if (!result.ok) {
        errEl.textContent = 'Connected, but database tables were not found. Are you sure this project has been set up? If not, go back and choose "New Organization".';
        errEl.style.display = '';
        document.getElementById('btnWizardTestConn').textContent = 'Test Connection';
        return;
      }
    }

    wizardNext();
  } catch (err) {
    errEl.textContent = `Connection failed: ${err.message}`;
    errEl.style.display = '';
    document.getElementById('btnWizardTestConn').textContent = 'Test Connection';
  }
}

function copyWizardSql() {
  navigator.clipboard.writeText(SETUP_SQL).then(() => {
    const msg = document.getElementById('wizardCopyMsg');
    msg.style.display = '';
    setTimeout(() => { msg.style.display = 'none'; }, 2000);
  });
}

async function wizardVerifyTables() {
  const resultEl = document.getElementById('wizardVerifyResult');
  document.getElementById('btnWizardVerify').textContent = 'Verifying...';

  const result = await window.electronAPI.verifyTables(wizardUrl, wizardKey);
  if (result.ok) {
    resultEl.innerHTML = '<span class="wizard-success">All tables verified successfully!</span>';
    setTimeout(() => wizardNext(), 800);
  } else {
    resultEl.innerHTML = `<span class="wizard-error">${esc(result.error)}</span>`;
    document.getElementById('btnWizardVerify').textContent = 'Verify Tables';
  }
}

async function wizardSeedConfig() {
  const resultEl = document.getElementById('wizardSeedResult');
  document.getElementById('btnWizardSeed').textContent = 'Seeding...';

  const result = await window.electronAPI.seedConfig(wizardUrl, wizardKey);
  if (result.ok) {
    resultEl.innerHTML = '<span class="wizard-success">Default configuration uploaded!</span>';
    setTimeout(() => wizardNext(), 800);
  } else {
    resultEl.innerHTML = `<span class="wizard-error">${esc(result.error)}</span>`;
    document.getElementById('btnWizardSeed').textContent = 'Seed Config';
  }
}

async function wizardRegisterDevice() {
  const name = document.getElementById('wizardDeviceName').value.trim();
  const errEl = document.getElementById('wizardDeviceError');
  if (!name) {
    errEl.textContent = 'Please enter a device name.';
    errEl.style.display = '';
    return;
  }

  // Save credentials first so sync can work
  await window.electronAPI.syncUpdateCredentials(wizardUrl, wizardKey);

  // Register device
  currentDeviceId = await window.electronAPI.registerDevice(name);
  wizardNext();
}

async function wizardFinish() {
  hideSetupWizard();
  await launchApp();
}

// SQL that users paste into Supabase SQL Editor
const SETUP_SQL = `-- DH Field EMR — Supabase Schema
-- Paste this into your Supabase SQL Editor and click Run

CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY,
  device_id TEXT,
  site TEXT,
  date TEXT,
  mrn TEXT,
  given_name TEXT,
  family_name TEXT,
  name TEXT,
  sex TEXT,
  dob TEXT,
  phone TEXT,
  pregnant TEXT,
  breastfeeding TEXT,
  temp TEXT,
  bp TEXT,
  weight TEXT,
  allergies TEXT,
  current_meds TEXT,
  pmh TEXT,
  chief_concern TEXT,
  labs JSONB DEFAULT '{}'::jsonb,
  lab_comments TEXT,
  urinalysis JSONB DEFAULT '{}'::jsonb,
  blood_glucose TEXT,
  diagnosis TEXT,
  medications JSONB DEFAULT '[]'::jsonb,
  treatment_notes TEXT,
  treatment TEXT,
  procedures JSONB DEFAULT '[]'::jsonb,
  referral_type TEXT,
  provider TEXT,
  notes TEXT,
  age_estimated BOOLEAN DEFAULT false,
  saved_at TIMESTAMPTZ,
  sync_version INTEGER DEFAULT 1,
  deleted BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_records_date ON records (date);
CREATE INDEX IF NOT EXISTS idx_records_site ON records (site);
CREATE INDEX IF NOT EXISTS idx_records_deleted ON records (deleted);
CREATE INDEX IF NOT EXISTS idx_records_device_id ON records (device_id);
CREATE INDEX IF NOT EXISTS idx_records_saved_at ON records (saved_at);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  org_name TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_records" ON records FOR SELECT USING (true);
CREATE POLICY "anon_insert_records" ON records FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_records" ON records FOR UPDATE USING (true);

CREATE POLICY "anon_read_devices" ON devices FOR SELECT USING (true);
CREATE POLICY "anon_insert_devices" ON devices FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_devices" ON devices FOR UPDATE USING (true);

CREATE POLICY "anon_read_config" ON config FOR SELECT USING (true);
CREATE POLICY "anon_write_config" ON config FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_config" ON config FOR UPDATE USING (true);`;
