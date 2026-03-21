// ==========================================
// PORTAL — Config Admin & Device Management
// ==========================================

let configCache = {};

// ==========================================
// SUPABASE CONFIG HELPERS
// ==========================================

async function loadConfigData() {
  try {
    const rows = await supabaseFetch('config', 'order=key.asc');
    configCache = {};
    rows.forEach(r => { configCache[r.key] = r.value; });
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

async function saveConfigKey(key, value) {
  const body = { key, value, updated_at: new Date().toISOString() };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Save config failed: ${res.status}`);
  configCache[key] = value;
}

// ==========================================
// SIMPLE LIST CONFIG (sites, providers, referralTypes, procedures)
// ==========================================

const CONFIG_KEYS = {
  sites: { label: 'Site', listId: 'configSitesList' },
  providers: { label: 'Physician', listId: 'configProvidersList' },
  referralTypes: { label: 'Referral Type', listId: 'configReferralTypesList' },
  procedures: { label: 'Procedure', listId: 'configProceduresList' }
};

function getConfigList(key) {
  return configCache[key] || [];
}

function renderConfigList(key) {
  const info = CONFIG_KEYS[key];
  const items = getConfigList(key);
  const container = document.getElementById(info.listId);
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '<div style="padding:12px;color:var(--gray-400);font-size:13px;">No items configured yet.</div>';
    return;
  }

  container.innerHTML = items.map((item, idx) => `
    <div class="config-item">
      <span>${esc(typeof item === 'string' ? item : item.name || item.id)}</span>
      <div class="config-actions">
        <button class="btn-delete" onclick="deleteConfigItem('${key}', ${idx})" title="Remove">&times;</button>
      </div>
    </div>
  `).join('');
}

function renderAllConfigLists() {
  Object.keys(CONFIG_KEYS).forEach(renderConfigList);
  renderFormularyTable();
}

function addConfigItem(key) {
  const info = CONFIG_KEYS[key];
  const value = prompt(`Enter new ${info.label}:`);
  if (!value || !value.trim()) return;

  const items = [...getConfigList(key)];
  items.push(value.trim());
  saveConfigKey(key, items).then(() => renderConfigList(key)).catch(err => alert('Save failed: ' + err.message));
}

function deleteConfigItem(key, idx) {
  const items = [...getConfigList(key)];
  const removed = items[idx];
  const label = typeof removed === 'string' ? removed : removed.name || removed.id;
  if (!confirm(`Remove "${label}"?`)) return;

  items.splice(idx, 1);
  saveConfigKey(key, items).then(() => renderConfigList(key)).catch(err => alert('Delete failed: ' + err.message));
}

// ==========================================
// FORMULARY (read-only table in portal for now)
// ==========================================

function renderFormularyTable() {
  const formulary = configCache.formulary || [];
  const body = document.getElementById('configFormularyBody');
  if (!body) return;

  if (formulary.length === 0) {
    body.innerHTML = '<tr><td colspan="4" style="padding:12px;color:var(--gray-400);">No medications in formulary.</td></tr>';
    return;
  }

  body.innerHTML = formulary.map(m => `
    <tr>
      <td>${esc(m.name)}</td>
      <td>${esc(m.dose)}</td>
      <td>${esc(m.category)}</td>
      <td>${m.controlled ? '<span style="color:var(--red);font-weight:600;">Yes</span>' : 'No'}</td>
    </tr>
  `).join('');
}

// ==========================================
// DEVICES
// ==========================================

async function loadDevices() {
  try {
    const devices = await supabaseFetch('devices', 'order=name.asc');
    renderDevices(devices);
  } catch (err) {
    document.getElementById('devicesList').innerHTML = '<div style="padding:20px;color:var(--gray-400);">Could not load devices.</div>';
  }
}

function renderDevices(devices) {
  const container = document.getElementById('devicesList');
  if (!container) return;

  if (devices.length === 0) {
    container.innerHTML = '<div style="padding:20px;color:var(--gray-400);">No devices registered yet.</div>';
    return;
  }

  container.innerHTML = devices.map(d => {
    const lastSync = d.last_sync_at ? new Date(d.last_sync_at).toLocaleString() : 'Never';
    const created = d.created_at ? new Date(d.created_at).toLocaleDateString() : '';
    return `<div class="device-card">
      <div class="device-name">${esc(d.name || d.id)}</div>
      <div class="device-meta">Last sync: ${lastSync}</div>
      <div class="device-meta">Registered: ${created}</div>
    </div>`;
  }).join('');
}

// ==========================================
// NAV HOOKS — load data when switching to config/devices
// ==========================================

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (btn.dataset.screen === 'config') {
      await loadConfigData();
      renderAllConfigLists();
    }
    if (btn.dataset.screen === 'devices') {
      await loadDevices();
    }
  });
});
