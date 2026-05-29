// ==========================================
// FORM SCHEMA — data-driven form definition
// ==========================================
// The encounter form's structure is described by a "form schema" stored in
// config key 'formSchema' and synced to every device (admin-editable via the
// form builder). Hybrid model:
//   - BUILT-IN sections keep their bespoke HTML (labs grid, med builder, MRN
//     logic, etc.) but can be shown/hidden and renamed via the schema.
//   - CUSTOM sections (added by an org admin) are rendered generically into
//     #customSectionsContainer, and their answers are stored in
//     record.customFields (synced to the custom_fields JSONB column).
//
// Config lives in localStorage (dhemr_ prefix) so it can be read synchronously
// while the form renders. Writes go through window.platform (which also feeds
// the Supabase config sync).

(function () {
  const LS_PREFIX = 'dhemr_';
  const SCHEMA_KEY = 'formSchema';

  // Built-in sections IN DOCUMENT ORDER (must match the .encounter-card order in
  // index.html). `id` is stable; `title` is the default label (schema may
  // override it). `required` sections cannot be hidden — the app depends on
  // them: MRN needs name+DOB; validation needs site/date/sex.
  const BUILTIN_SECTIONS = [
    { id: 'encounter',    title: 'Encounter',          required: true },
    { id: 'patient',      title: 'Patient',            required: true },
    { id: 'vitals',       title: 'Vitals' },
    { id: 'accessToCare', title: 'Access to Care' },
    { id: 'history',      title: 'History' },
    { id: 'chiefConcern', title: 'Chief Concern' },
    { id: 'labs',         title: 'Labs' },
    { id: 'diagnosis',    title: 'Diagnosis' },
    { id: 'rxPresets',    title: 'Rx Presets' },
    { id: 'medications',  title: 'Medications' },
    { id: 'procedures',   title: 'Procedures' },
    { id: 'referral',     title: 'Referral' },
    { id: 'physician',    title: 'Physician' },
    { id: 'imaging',      title: 'Imaging' },
    { id: 'surgery',      title: 'Surgical Encounter' },
    { id: 'notes',        title: 'Notes' },
  ];
  const BUILTIN_IDS = new Set(BUILTIN_SECTIONS.map((s) => s.id));

  // Field types available to custom questions (used by the builder UI).
  const FIELD_TYPES = [
    { type: 'text', label: 'Short text' },
    { type: 'textarea', label: 'Long text' },
    { type: 'select', label: 'Single choice' },
    { type: 'multiselect', label: 'Multiple choice' },
    { type: 'number', label: 'Number' },
    { type: 'range', label: 'Scale (0–N)' },
    { type: 'yesno', label: 'Yes / No' },
    { type: 'date', label: 'Date' },
  ];

  function h(s) { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); }

  function readRawSchema() {
    try {
      return JSON.parse(localStorage.getItem(LS_PREFIX + SCHEMA_KEY) || 'null');
    } catch { return null; }
  }

  // Merge the stored schema over the built-in defaults, so the result always
  // contains every built-in section (even ones added to the code after the
  // schema was last saved). Stored entries only carry overrides for built-ins,
  // plus full custom sections.
  function getEffectiveSchema() {
    const raw = readRawSchema();
    const overrides = {};
    const customSections = [];
    if (raw && Array.isArray(raw.sections)) {
      for (const s of raw.sections) {
        if (!s || !s.id) continue;
        if (BUILTIN_IDS.has(s.id)) overrides[s.id] = s;
        else customSections.push(s);
      }
    }
    const builtins = BUILTIN_SECTIONS.map((b, i) => {
      const o = overrides[b.id] || {};
      return {
        id: b.id,
        title: o.title || b.title,
        required: !!b.required,
        builtin: true,
        hidden: b.required ? false : !!o.hidden,
        order: typeof o.order === 'number' ? o.order : i,
      };
    });
    const custom = customSections.map((s, i) => ({
      id: s.id,
      title: s.title || 'Custom Section',
      required: false,
      builtin: false,
      hidden: !!s.hidden,
      order: typeof s.order === 'number' ? s.order : 100 + i,
      fields: Array.isArray(s.fields) ? s.fields : [],
    }));
    return { version: 1, sections: [...builtins, ...custom].sort((a, b) => a.order - b.order) };
  }

  // Assign data-section ids to the built-in cards. Positional: the card order in
  // index.html matches BUILTIN_SECTIONS. Idempotent (won't re-tag).
  function tagBuiltinSections(root) {
    const cards = root.querySelectorAll('.encounter-card');
    if (cards.length !== BUILTIN_SECTIONS.length) {
      console.warn(`[form-schema] expected ${BUILTIN_SECTIONS.length} built-in cards, found ${cards.length}; section toggles may be misaligned`);
    }
    cards.forEach((card, i) => {
      const sec = BUILTIN_SECTIONS[i];
      if (sec && !card.dataset.section) card.dataset.section = sec.id;
    });
  }

  function cardTitleEl(card) {
    return card.querySelector('.card-header') ||
           card.querySelector('.collapsible-header span:last-child');
  }

  // Apply the schema to the live edit form: show/hide + rename built-in
  // sections, then render the custom sections.
  function applyFormSchema(root) {
    root = root || document.getElementById('editModeContent');
    if (!root) return;
    tagBuiltinSections(root);
    const { sections } = getEffectiveSchema();
    for (const s of sections) {
      if (!s.builtin) continue;
      const el = root.querySelector(`[data-section="${s.id}"]`);
      if (!el) continue;
      el.style.display = s.hidden ? 'none' : '';
      const titleEl = cardTitleEl(el);
      if (titleEl && s.title) titleEl.textContent = s.title;
    }
    renderCustomSections();
  }

  // ---------- Custom section rendering (generic field types) ----------
  function fieldControl(f) {
    const fid = 'cf_' + f.id;
    const cf = h(f.id);
    switch (f.type) {
      case 'textarea': return `<textarea id="${fid}" data-cf="${cf}" rows="2" placeholder="${h(f.placeholder || '')}"></textarea>`;
      case 'number':   return `<input type="number" id="${fid}" data-cf="${cf}" inputmode="decimal" placeholder="${h(f.placeholder || '')}">`;
      case 'date':     return `<input type="date" id="${fid}" data-cf="${cf}">`;
      case 'yesno':    return singleGroup(f.id, ['Yes', 'No']);
      case 'select':   return singleGroup(f.id, f.options || []);
      case 'multiselect': return multiGroup(f.id, f.options || []);
      case 'range':    return rangeControl(f);
      case 'text':
      default:         return `<input type="text" id="${fid}" data-cf="${cf}" placeholder="${h(f.placeholder || '')}">`;
    }
  }
  function singleGroup(fieldId, options) {
    return `<div class="btn-toggle-group cf-single" data-cf="${h(fieldId)}">` +
      (options || []).map((o) => `<button type="button" class="btn-toggle" data-val="${h(o)}">${h(o)}</button>`).join('') +
      `</div>`;
  }
  function multiGroup(fieldId, options) {
    return `<div class="pill-row cf-multi" data-cf="${h(fieldId)}">` +
      (options || []).map((o) => `<button type="button" class="cf-pill" data-val="${h(o)}">${h(o)}</button>`).join('') +
      `</div>`;
  }
  function rangeControl(f) {
    const min = Number.isFinite(f.min) ? f.min : 0;
    const max = Number.isFinite(f.max) ? f.max : 10;
    return `<div class="cf-range" data-cf="${h(f.id)}">` +
      `<input type="range" min="${min}" max="${max}" step="1" value="${min}" data-touched="0" oninput="this.dataset.touched='1';this.nextElementSibling.textContent=this.value">` +
      `<span class="cf-range-val">${min}</span></div>`;
  }
  function renderFieldGroup(f) {
    const reqStar = f.required ? ' <span class="cf-req">*</span>' : '';
    return `<div class="form-group cf-field"><label>${h(f.label || 'Question')}${reqStar}</label>${fieldControl(f)}</div>`;
  }
  function renderCustomSections() {
    const el = document.getElementById('customSectionsContainer');
    if (!el) return;
    const custom = getEffectiveSchema().sections.filter((s) => !s.builtin && !s.hidden);
    el.innerHTML = custom.map((s) => `
      <div class="encounter-card" data-section="${h(s.id)}">
        <div class="card-header">${h(s.title)}</div>
        ${(s.fields || []).map(renderFieldGroup).join('') || '<p class="cf-empty">No questions in this section yet.</p>'}
      </div>`).join('');
    wireCustomGroupClicks(el);
  }
  let _cfClicksWired = false;
  function wireCustomGroupClicks(container) {
    if (_cfClicksWired) return;
    _cfClicksWired = true; // delegated on the persistent container element
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.cf-single .btn-toggle, .cf-multi .cf-pill');
      if (!btn) return;
      const group = btn.parentElement;
      if (group.classList.contains('cf-single')) {
        const wasActive = btn.classList.contains('active');
        group.querySelectorAll('.btn-toggle').forEach((b) => b.classList.remove('active'));
        if (!wasActive) btn.classList.add('active');
      } else {
        btn.classList.toggle('active');
      }
    });
  }

  // Read custom-field answers from the live form into a { fieldId: value } map.
  function collectCustomFields() {
    const out = {};
    const el = document.getElementById('customSectionsContainer');
    if (!el) return out;
    el.querySelectorAll('[data-cf]').forEach((node) => {
      const id = node.dataset.cf;
      if (node.classList.contains('cf-single')) {
        const a = node.querySelector('.btn-toggle.active');
        if (a) out[id] = a.dataset.val;
      } else if (node.classList.contains('cf-multi')) {
        const vals = [...node.querySelectorAll('.cf-pill.active')].map((b) => b.dataset.val);
        if (vals.length) out[id] = vals;
      } else if (node.classList.contains('cf-range')) {
        const sl = node.querySelector('input[type=range]');
        if (sl && sl.dataset.touched === '1') out[id] = Number(sl.value);
      } else if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
        const v = node.value;
        if (v !== '' && v != null) out[id] = node.type === 'number' ? Number(v) : v;
      }
    });
    return out;
  }
  // Set custom-field answers back into the live form.
  function populateCustomFields(values) {
    values = values || {};
    const el = document.getElementById('customSectionsContainer');
    if (!el) return;
    el.querySelectorAll('[data-cf]').forEach((node) => {
      const v = values[node.dataset.cf];
      if (node.classList.contains('cf-single')) {
        node.querySelectorAll('.btn-toggle').forEach((b) => b.classList.toggle('active', b.dataset.val === v));
      } else if (node.classList.contains('cf-multi')) {
        const arr = Array.isArray(v) ? v : [];
        node.querySelectorAll('.cf-pill').forEach((b) => b.classList.toggle('active', arr.includes(b.dataset.val)));
      } else if (node.classList.contains('cf-range')) {
        const sl = node.querySelector('input[type=range]');
        if (sl) {
          if (v != null) { sl.value = v; sl.dataset.touched = '1'; }
          else { sl.value = sl.min; sl.dataset.touched = '0'; }
          const d = node.querySelector('.cf-range-val'); if (d) d.textContent = sl.value;
        }
      } else if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
        node.value = (v != null ? v : '');
      }
    });
  }

  function saveFormSchema(schema) {
    if (window.platform && window.platform.saveFormSchema) {
      window.platform.saveFormSchema(schema);
    } else {
      localStorage.setItem(LS_PREFIX + SCHEMA_KEY, JSON.stringify(schema));
    }
  }

  // ---------- Mutators (used by the form builder UI) ----------
  // The stored schema holds only overrides for built-ins plus full custom
  // sections. updateSection upserts an entry by id and persists.
  function updateSection(id, patch) {
    const raw = readRawSchema() || { version: 1, sections: [] };
    if (!Array.isArray(raw.sections)) raw.sections = [];
    let entry = raw.sections.find((s) => s && s.id === id);
    if (!entry) { entry = { id }; raw.sections.push(entry); }
    Object.assign(entry, patch);
    saveFormSchema(raw);
    return raw;
  }
  function setSectionHidden(id, hidden) { return updateSection(id, { hidden: !!hidden }); }
  function setSectionTitle(id, title) { return updateSection(id, { title: String(title || '').trim() }); }

  function _uid(prefix) {
    const r = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
    return prefix + r;
  }
  function addCustomSection(title) {
    const raw = readRawSchema() || { version: 1, sections: [] };
    if (!Array.isArray(raw.sections)) raw.sections = [];
    const maxOrder = raw.sections.reduce((m, s) => Math.max(m, s.order || 0), 99);
    const id = _uid('custom_');
    raw.sections.push({ id, title: title || 'New Section', builtin: false, hidden: false, order: maxOrder + 1, fields: [] });
    saveFormSchema(raw);
    return id;
  }
  function deleteSection(id) {
    const raw = readRawSchema();
    if (!raw || !Array.isArray(raw.sections)) return;
    raw.sections = raw.sections.filter((s) => s.id !== id);
    saveFormSchema(raw);
  }
  function _findCustom(raw, sectionId) {
    return (raw.sections || []).find((s) => s.id === sectionId && !BUILTIN_IDS.has(s.id));
  }
  function addField(sectionId, field) {
    const raw = readRawSchema();
    if (!raw) return;
    const sec = _findCustom(raw, sectionId);
    if (!sec) return;
    if (!Array.isArray(sec.fields)) sec.fields = [];
    const fid = _uid('f_');
    const entry = {
      id: fid,
      label: (field && field.label) || 'Question',
      type: (field && field.type) || 'text',
      options: (field && field.options) || [],
      required: !!(field && field.required),
    };
    if (field && Number.isFinite(field.min)) entry.min = field.min;
    if (field && Number.isFinite(field.max)) entry.max = field.max;
    sec.fields.push(entry);
    saveFormSchema(raw);
    return fid;
  }
  function removeField(sectionId, fieldId) {
    const raw = readRawSchema();
    if (!raw) return;
    const sec = _findCustom(raw, sectionId);
    if (!sec || !Array.isArray(sec.fields)) return;
    sec.fields = sec.fields.filter((f) => f.id !== fieldId);
    saveFormSchema(raw);
  }

  // Public API (window.FormSchema)
  window.FormSchema = {
    BUILTIN_SECTIONS,
    FIELD_TYPES,
    getEffectiveSchema,
    applyFormSchema,
    renderCustomSections,
    collectCustomFields,
    populateCustomFields,
    saveFormSchema,
    readRawSchema,
    updateSection,
    setSectionHidden,
    setSectionTitle,
    addCustomSection,
    deleteSection,
    addField,
    removeField,
  };
})();
