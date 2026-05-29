// ==========================================
// FORM BUILDER — admin UI for the encounter form definition
// ==========================================
// Lists the encounter form's sections so an admin can:
//   - show/hide and rename any non-required section,
//   - add custom sections and questions (the 7 field types),
//   - remove custom sections/questions.
// Writes the synced formSchema via window.FormSchema. Lives in the Options
// screen; editable only on the admin device (standard devices see it read-only).

function fbFieldTypeLabel(type) {
  const t = (window.FormSchema.FIELD_TYPES || []).find((x) => x.type === type);
  return t ? t.label : type;
}

function fbFieldEditor(s, isAdmin) {
  const fields = (s.fields || []).map((f) => `
    <div class="fb-field">
      <span class="fb-field-label">${esc(f.label)}</span>
      <span class="fb-field-type">${esc(fbFieldTypeLabel(f.type))}${(f.options && f.options.length) ? ' · ' + esc(f.options.join(', ')) : ''}</span>
      ${isAdmin ? `<button type="button" class="fb-field-del" data-sid="${esc(s.id)}" data-fid="${esc(f.id)}" title="Remove question">✕</button>` : ''}
    </div>`).join('') || '<div class="fb-field fb-field-empty">No questions yet.</div>';

  const adder = isAdmin ? `
    <div class="fb-add-field" data-sid="${esc(s.id)}">
      <input type="text" class="fb-nf-label" placeholder="New question…">
      <select class="fb-nf-type">${(window.FormSchema.FIELD_TYPES || []).map((t) => `<option value="${esc(t.type)}">${esc(t.label)}</option>`).join('')}</select>
      <input type="text" class="fb-nf-options" placeholder="Options (comma-separated)" style="display:none;">
      <button type="button" class="btn btn-secondary fb-nf-add" data-sid="${esc(s.id)}">Add question</button>
    </div>` : '';

  return `<div class="fb-fields">${fields}${adder}</div>`;
}

function fbSectionRow(s, isAdmin) {
  const control = s.required
    ? '<span class="fb-required">always shown</span>'
    : `<label class="fb-switch" title="Show or hide this section on the encounter form">
         <input type="checkbox" class="fb-toggle" data-id="${esc(s.id)}" ${s.hidden ? '' : 'checked'} ${isAdmin ? '' : 'disabled'}>
         <span class="fb-switch-label">${s.hidden ? 'Hidden' : 'Shown'}</span>
       </label>`;
  const head = `
    <div class="fb-row${s.hidden ? ' fb-row-hidden' : ''}" data-id="${esc(s.id)}">
      <input class="fb-title" type="text" value="${esc(s.title)}" data-id="${esc(s.id)}" ${isAdmin ? '' : 'disabled'} aria-label="Section name">
      <span class="fb-badge${s.builtin ? '' : ' fb-badge-custom'}">${s.builtin ? 'built-in' : 'custom'}</span>
      ${control}
      ${(!s.builtin && isAdmin) ? `<button type="button" class="fb-del" data-id="${esc(s.id)}" title="Delete section">🗑</button>` : ''}
    </div>`;
  // Custom sections also expose their question editor.
  return s.builtin ? head : head + fbFieldEditor(s, isAdmin);
}

function renderFormBuilder() {
  const body = document.getElementById('formBuilderBody');
  if (!body || !window.FormSchema) return;
  const isAdmin = (typeof getDeviceRole === 'function' ? getDeviceRole() : 'admin') === 'admin';
  const { sections } = window.FormSchema.getEffectiveSchema();

  body.innerHTML = sections.map((s) => fbSectionRow(s, isAdmin)).join('');

  // "+ Add Section" button lives in the section header (index.html); wire once.
  const addBtn = document.getElementById('btnAddFormSection');
  if (addBtn) {
    addBtn.style.display = isAdmin ? '' : 'none';
    if (!addBtn._wired) {
      addBtn._wired = true;
      addBtn.addEventListener('click', () => {
        const id = window.FormSchema.addCustomSection('New Section');
        renderFormBuilder();
        // Bring the new section into view and let the admin name it right away
        const row = document.querySelector('.fb-row[data-id="' + id + '"]');
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const title = row.querySelector('.fb-title');
          if (title) { title.focus(); title.select(); }
        }
      });
    }
  }

  if (!isAdmin) return; // standard devices: read-only (config syncs from admin)

  // Section show/hide
  body.querySelectorAll('.fb-toggle').forEach((cb) => cb.addEventListener('change', () => {
    window.FormSchema.setSectionHidden(cb.dataset.id, !cb.checked);
    renderFormBuilder();
  }));
  // Section rename
  body.querySelectorAll('.fb-title').forEach((inp) => {
    const commit = () => window.FormSchema.setSectionTitle(inp.dataset.id, inp.value);
    inp.addEventListener('blur', commit);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
  });
  // Delete custom section
  body.querySelectorAll('.fb-del').forEach((b) => b.addEventListener('click', () => {
    if (confirm('Delete this section and its questions? Answers already saved in existing records are kept in the data, but the section is removed from the form.')) {
      window.FormSchema.deleteSection(b.dataset.id);
      renderFormBuilder();
    }
  }));
  // Remove a custom field
  body.querySelectorAll('.fb-field-del').forEach((b) => b.addEventListener('click', () => {
    window.FormSchema.removeField(b.dataset.sid, b.dataset.fid);
    renderFormBuilder();
  }));
  // Show the options input only for choice types
  body.querySelectorAll('.fb-add-field').forEach((wrap) => {
    const typeSel = wrap.querySelector('.fb-nf-type');
    const optInput = wrap.querySelector('.fb-nf-options');
    const sync = () => { optInput.style.display = (typeSel.value === 'select' || typeSel.value === 'multiselect') ? '' : 'none'; };
    typeSel.addEventListener('change', sync);
    sync();
  });
  // Add a custom field
  body.querySelectorAll('.fb-nf-add').forEach((b) => b.addEventListener('click', () => {
    const wrap = b.closest('.fb-add-field');
    const label = wrap.querySelector('.fb-nf-label').value.trim();
    const type = wrap.querySelector('.fb-nf-type').value;
    const optsRaw = wrap.querySelector('.fb-nf-options').value.trim();
    if (!label) { alert('Enter a question label first.'); return; }
    const needsOptions = (type === 'select' || type === 'multiselect');
    const options = needsOptions ? optsRaw.split(',').map((x) => x.trim()).filter(Boolean) : [];
    if (needsOptions && options.length === 0) { alert('Add at least one option (comma-separated) for a choice question.'); return; }
    window.FormSchema.addField(b.dataset.sid, { label, type, options });
    renderFormBuilder();
  }));
}
