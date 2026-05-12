(function () {
  'use strict';

  // ─── Constants ───────────────────────────────────────────────────────────────

  const BLOCK_TYPES  = new Set(['heading', 'instruction', 'disclosure']);
  const FIELD_TYPES  = ['text', 'number', 'date', 'textarea', 'checkbox', 'radio', 'dropdown', 'signature'];
  const BLOCK_TYPE_LIST = ['heading', 'instruction', 'disclosure'];

  const TYPE_ICONS = {
    text: 'T', number: '#', date: '📅', textarea: '≡',
    checkbox: '☑', radio: '◎', dropdown: '▾', signature: '✍',
    heading: 'H', instruction: 'ℹ', disclosure: '⚠',
  };

  // ─── State ───────────────────────────────────────────────────────────────────

  const state = {
    original:     {},    // snapshot on load — used for Reset
    forms:        {},    // live working copy
    selected:     null,  // current form key
    filter:       'all', // all | field | block | signature | office_only
    dirty:        false,
    editIdx:      null,  // null = add mode, number = edit mode
  };

  // ─── Bootstrap ───────────────────────────────────────────────────────────────

  async function init() {
    bindStaticListeners();
    await loadData();
  }

  async function loadData() {
    try {
      const res = await fetch('../data/final_fields.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      hydrate(data);
    } catch {
      renderLoadError();
    }
  }

  function hydrate(data) {
    state.original = deepClone(data);
    state.forms    = deepClone(data);
    renderFormList();
    toast('Loaded ' + Object.keys(data).length + ' forms', 'success');
  }

  function renderLoadError() {
    document.getElementById('empty-state').innerHTML = `
      <div class="empty-icon">⚠️</div>
      <p style="margin-bottom:14px">Could not load final_fields.json automatically</p>
      <label class="btn btn-primary" style="cursor:pointer">
        Load JSON file
        <input type="file" accept=".json" id="file-input" style="display:none">
      </label>`;
    document.getElementById('file-input')?.addEventListener('change', onFileInput);
  }

  function onFileInput(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        hydrate(JSON.parse(ev.target.result));
        document.getElementById('empty-state').innerHTML = `
          <div class="empty-icon">📋</div>
          <p>Select a form from the left to view and edit its fields</p>`;
      } catch { toast('Invalid JSON file', 'error'); }
    };
    reader.readAsText(file);
  }

  // ─── Form list ───────────────────────────────────────────────────────────────

  function renderFormList(query = '') {
    const all  = Object.keys(state.forms);
    const q    = query.toLowerCase();
    const keys = q ? all.filter(k => k.toLowerCase().includes(q) || fmtKey(k).toLowerCase().includes(q)) : all;

    document.getElementById('form-count').textContent =
      keys.length + ' of ' + all.length + ' forms';

    document.getElementById('form-list').innerHTML = keys.map(key => {
      const items   = state.forms[key] || [];
      const nFields = items.filter(i => !BLOCK_TYPES.has(i.type)).length;
      const pages   = Math.max(...items.map(i => i.page || 1), 1);
      return `<li class="form-list-item${key === state.selected ? ' active' : ''}" data-key="${esc(key)}">
        <div class="form-list-name">${esc(fmtKey(key))}</div>
        <div class="form-list-meta">${nFields} fields · ${pages} page${pages !== 1 ? 's' : ''}</div>
      </li>`;
    }).join('');

    document.querySelectorAll('.form-list-item').forEach(el =>
      el.addEventListener('click', () => selectForm(el.dataset.key))
    );
  }

  function fmtKey(key) {
    return key
      .replace(/\.pdf$/i, '')
      .replace(/^\d+-/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  // ─── Select form ─────────────────────────────────────────────────────────────

  function selectForm(key) {
    state.selected = key;
    state.filter   = 'all';

    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('editor-panel').classList.remove('hidden');

    document.querySelectorAll('.form-list-item').forEach(el =>
      el.classList.toggle('active', el.dataset.key === key)
    );

    renderEditorHeader();
    renderFieldList();
  }

  function renderEditorHeader() {
    const key    = state.selected;
    const items  = state.forms[key] || [];
    const fields = items.filter(i => !BLOCK_TYPES.has(i.type));
    const blocks = items.filter(i =>  BLOCK_TYPES.has(i.type));
    const pages  = Math.max(...items.map(i => i.page || 1), 1);
    const sigs   = fields.filter(f => f.type === 'signature').length;
    const office = fields.filter(f => f.office_only).length;

    document.getElementById('editor-form-title').textContent = fmtKey(key);

    const sep = '<span style="color:#D1D5DB">·</span>';
    document.getElementById('editor-form-meta').innerHTML = [
      `<span>${fields.length} fields</span>`,
      `<span>${blocks.length} blocks</span>`,
      `<span>${pages} page${pages !== 1 ? 's' : ''}</span>`,
      sigs   ? `<span>${sigs} signature${sigs > 1 ? 's' : ''}</span>`                   : '',
      office ? `<span style="color:#92400E">${office} office-only</span>`               : '',
    ].filter(Boolean).join(sep);

    // Filter buttons
    const fg = document.getElementById('filter-group');
    fg.innerHTML = [
      ['all',         'All'],
      ['field',       'Fields'],
      ['block',       'Blocks'],
      ['signature',   'Signatures'],
      ['office_only', 'Office Only'],
    ].map(([v, l]) =>
      `<button class="filter-btn${state.filter === v ? ' active' : ''}" data-filter="${v}">${l}</button>`
    ).join('');

    fg.querySelectorAll('.filter-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        state.filter = btn.dataset.filter;
        fg.querySelectorAll('.filter-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.filter === state.filter)
        );
        renderFieldList();
      })
    );
  }

  // ─── Field list ──────────────────────────────────────────────────────────────

  function renderFieldList() {
    const key   = state.selected;
    if (!key) return;
    const items = state.forms[key] || [];

    const visible = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        switch (state.filter) {
          case 'field':       return !BLOCK_TYPES.has(item.type);
          case 'block':       return  BLOCK_TYPES.has(item.type);
          case 'signature':   return item.type === 'signature';
          case 'office_only': return !!item.office_only;
          default:            return true;
        }
      });

    document.getElementById('field-tbody').innerHTML =
      visible.map(({ item, idx }) => buildRow(item, idx, items.length)).join('');

    document.querySelectorAll('.btn-edit').forEach(b =>
      b.addEventListener('click', () => openModal(+b.dataset.idx))
    );
    document.querySelectorAll('.btn-del').forEach(b =>
      b.addEventListener('click', () => deleteItem(+b.dataset.idx))
    );
    document.querySelectorAll('.btn-up').forEach(b =>
      b.addEventListener('click', () => moveItem(+b.dataset.idx, -1))
    );
    document.querySelectorAll('.btn-dn').forEach(b =>
      b.addEventListener('click', () => moveItem(+b.dataset.idx, 1))
    );
  }

  function buildRow(item, idx, total) {
    const isBlock  = BLOCK_TYPES.has(item.type);
    const isOffice = !!item.office_only;

    const rowCls = [
      isBlock  ? 'is-block'  : '',
      isOffice ? 'is-office' : '',
    ].filter(Boolean).join(' ');

    const badge = `<span class="type-badge type-${item.type}"><span>${TYPE_ICONS[item.type] || '?'}</span>${item.type}</span>`;

    const labelCell = isBlock
      ? `<span class="field-label">${esc(item.text || '')}</span>`
      : `<span class="field-label">${esc(item.label || '')}</span>${
          item.options?.length
            ? `<div class="field-opts">${esc(item.options.slice(0, 4).join(', '))}${item.options.length > 4 ? ' …' : ''}</div>`
            : ''
        }`;

    const nameCell = isBlock ? '' : `<code class="field-name-code">${esc(item.field_name || '')}</code>`;

    const flags = isBlock ? '' : [
      item.required ? `<span class="flag-badge flag-required">Required</span>`
                    : `<span class="flag-badge flag-optional">Optional</span>`,
      isOffice ? `<span class="flag-badge flag-office">Office Only</span>` : '',
    ].join('');

    return `<tr class="${rowCls}">
      <td class="col-order">
        <div class="order-btns">
          <button class="order-btn btn-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''} title="Move up">↑</button>
          <button class="order-btn btn-dn" data-idx="${idx}" ${idx === total - 1 ? 'disabled' : ''} title="Move down">↓</button>
        </div>
      </td>
      <td class="col-type">${badge}</td>
      <td class="col-label">${labelCell}</td>
      <td class="col-name">${nameCell}</td>
      <td class="col-page"><span class="page-badge">${item.page || 1}</span></td>
      <td class="col-flags">${flags}</td>
      <td class="col-actions">
        <button class="btn-icon btn-edit" data-idx="${idx}" title="Edit">✏️</button>
        <button class="btn-icon btn-del"  data-idx="${idx}" title="Delete">🗑</button>
      </td>
    </tr>`;
  }

  // ─── Move / delete ────────────────────────────────────────────────────────────

  function moveItem(idx, dir) {
    const items  = state.forms[state.selected];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
    setDirty();
    renderFieldList();
  }

  function deleteItem(idx) {
    if (!confirm('Delete this item?')) return;
    state.forms[state.selected].splice(idx, 1);
    setDirty();
    renderEditorHeader();
    renderFieldList();
  }

  // ─── Modal ────────────────────────────────────────────────────────────────────

  function openModal(idx) {
    // idx === undefined means "add new"
    const isAdd   = idx === undefined;
    state.editIdx = isAdd ? null : idx;

    const item = isAdd
      ? { label: '', field_name: '', type: 'text', options: [], required: false, page: currentMaxPage(), office_only: false }
      : state.forms[state.selected][idx];

    const isBlock = BLOCK_TYPES.has(item.type);
    document.getElementById('modal-heading').textContent = isAdd
      ? (isBlock ? 'Add Block' : 'Add Field')
      : (isBlock ? 'Edit Block' : 'Edit Field');

    document.getElementById('btn-modal-delete').style.display = isAdd ? 'none' : '';

    renderModalBody(item, isBlock);
    document.getElementById('modal-backdrop').classList.remove('hidden');
  }

  function openAddModal(asBlock) {
    state.editIdx = null;
    const page    = currentMaxPage();
    const item    = asBlock
      ? { type: 'heading', text: '', page }
      : { label: '', field_name: '', type: 'text', options: [], required: false, page, office_only: false };

    document.getElementById('modal-heading').textContent = asBlock ? 'Add Block' : 'Add Field';
    document.getElementById('btn-modal-delete').style.display = 'none';

    renderModalBody(item, asBlock);
    document.getElementById('modal-backdrop').classList.remove('hidden');
  }

  function currentMaxPage() {
    const items = state.forms[state.selected] || [];
    return items.length ? Math.max(...items.map(i => i.page || 1)) : 1;
  }

  function renderModalBody(item, isBlock) {
    const body = document.getElementById('modal-body');

    if (isBlock) {
      body.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label>Block type</label>
            <select id="m-type">
              ${BLOCK_TYPE_LIST.map(t =>
                `<option value="${t}"${item.type === t ? ' selected' : ''}>${t}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Page</label>
            <input type="number" id="m-page" value="${item.page || 1}" min="1" max="30">
          </div>
        </div>
        <div class="form-group">
          <label>Text</label>
          <textarea id="m-text" rows="5">${esc(item.text || '')}</textarea>
        </div>`;
    } else {
      const opts = (item.options || []).join('\n');
      const showOpts = needsOptions(item.type);
      body.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label>Label</label>
            <input type="text" id="m-label" value="${esc(item.label || '')}" placeholder="Display label" autocomplete="off">
          </div>
          <div class="form-group">
            <label>Field name</label>
            <input type="text" id="m-field-name" value="${esc(item.field_name || '')}" placeholder="snake_case_name" autocomplete="off">
            <div class="field-hint">Unique snake_case identifier</div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select id="m-type">
              ${FIELD_TYPES.map(t =>
                `<option value="${t}"${item.type === t ? ' selected' : ''}>${t}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Page</label>
            <input type="number" id="m-page" value="${item.page || 1}" min="1" max="30">
          </div>
        </div>
        <div class="form-group" id="m-opts-group"${showOpts ? '' : ' style="display:none"'}>
          <label>Options <span style="font-weight:400;text-transform:none;letter-spacing:0">(one per line)</span></label>
          <textarea id="m-opts" rows="5" placeholder="Option 1&#10;Option 2&#10;Option 3">${esc(opts)}</textarea>
        </div>
        <hr class="section-divider">
        <div class="form-row">
          <div class="form-group">
            <div class="checkbox-row" onclick="document.getElementById('m-required').click()">
              <input type="checkbox" id="m-required"${item.required ? ' checked' : ''}>
              <label for="m-required">Required field</label>
            </div>
          </div>
          <div class="form-group">
            <div class="checkbox-row" onclick="document.getElementById('m-office').click()">
              <input type="checkbox" id="m-office"${item.office_only ? ' checked' : ''}>
              <label for="m-office">Office use only</label>
            </div>
          </div>
        </div>`;

      // Show/hide options textarea when type changes
      document.getElementById('m-type').addEventListener('change', e => {
        document.getElementById('m-opts-group').style.display = needsOptions(e.target.value) ? '' : 'none';
      });

      // Auto-suggest field_name from label (stops once user edits it manually)
      const labelEl = document.getElementById('m-label');
      const nameEl  = document.getElementById('m-field-name');
      let autoName  = !item.field_name; // only auto-suggest for new fields
      labelEl.addEventListener('input', () => {
        if (autoName) nameEl.value = toSnake(labelEl.value);
      });
      nameEl.addEventListener('input', () => { autoName = false; });
    }
  }

  function needsOptions(type) {
    return type === 'radio' || type === 'dropdown';
  }

  function saveModal() {
    const items   = state.forms[state.selected];
    const typeEl  = document.getElementById('m-type');
    const type    = typeEl?.value || 'text';
    const isBlock = BLOCK_TYPES.has(type);
    const page    = parseInt(document.getElementById('m-page')?.value) || 1;

    let item;
    if (isBlock) {
      const text = document.getElementById('m-text')?.value.trim() || '';
      item = { type, text, page };
    } else {
      const label     = document.getElementById('m-label')?.value.trim() || '';
      const fieldName = document.getElementById('m-field-name')?.value.trim() || '';
      const required  = document.getElementById('m-required')?.checked ?? false;
      const officeOnly = document.getElementById('m-office')?.checked ?? false;
      const optsRaw   = document.getElementById('m-opts')?.value || '';
      const options   = needsOptions(type)
        ? optsRaw.split('\n').map(s => s.trim()).filter(Boolean)
        : [];

      if (!label)     { toast('Label is required',      'error'); return; }
      if (!fieldName) { toast('Field name is required', 'error'); return; }

      item = { label, field_name: fieldName, type, options, required, page };
      if (officeOnly) item.office_only = true;
    }

    if (state.editIdx !== null) {
      items[state.editIdx] = item;
    } else {
      items.push(item);
    }

    closeModal();
    setDirty();
    renderEditorHeader();
    renderFieldList();
  }

  function deleteFromModal() {
    if (state.editIdx === null) return;
    if (!confirm('Delete this item?')) return;
    state.forms[state.selected].splice(state.editIdx, 1);
    closeModal();
    setDirty();
    renderEditorHeader();
    renderFieldList();
  }

  function closeModal() {
    document.getElementById('modal-backdrop').classList.add('hidden');
    state.editIdx = null;
  }

  // ─── Export / Reset ───────────────────────────────────────────────────────────

  function exportJSON() {
    const json = JSON.stringify(state.forms, null, 2);
    const url  = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'final_fields.json' });
    a.click();
    URL.revokeObjectURL(url);
    toast('Downloaded final_fields.json', 'success');
  }

  function resetChanges() {
    if (!state.dirty) return;
    if (!confirm('Reset all unsaved changes?')) return;
    state.forms = deepClone(state.original);
    state.dirty = false;
    updateDirtyUI();
    renderFormList(document.getElementById('form-search').value);
    if (state.selected) { renderEditorHeader(); renderFieldList(); }
    toast('Changes reset');
  }

  // ─── Dirty tracking ───────────────────────────────────────────────────────────

  function setDirty() {
    state.dirty = true;
    updateDirtyUI();
    renderFormList(document.getElementById('form-search').value);
  }

  function updateDirtyUI() {
    document.getElementById('unsaved-indicator').classList.toggle('hidden', !state.dirty);
    document.getElementById('btn-reset').disabled = !state.dirty;
  }

  // ─── Static listeners ────────────────────────────────────────────────────────

  function bindStaticListeners() {
    document.getElementById('form-search').addEventListener('input', e =>
      renderFormList(e.target.value)
    );

    document.getElementById('btn-export').addEventListener('click', exportJSON);
    document.getElementById('btn-reset').addEventListener('click', resetChanges);

    document.getElementById('btn-add-field').addEventListener('click', () => {
      if (!state.selected) return;
      openAddModal(false);
    });
    document.getElementById('btn-add-block').addEventListener('click', () => {
      if (!state.selected) return;
      openAddModal(true);
    });

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-modal-save').addEventListener('click', saveModal);
    document.getElementById('btn-modal-delete').addEventListener('click', deleteFromModal);

    document.getElementById('modal-backdrop').addEventListener('click', e => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ─── Utilities ────────────────────────────────────────────────────────────────

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function esc(s) {
    return String(s)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  function toSnake(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function toast(msg, type = '') {
    document.querySelector('.toast')?.remove();
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ─── Public API (used by wizard.js) ──────────────────────────────────────────

  window.adminAPI = {
    getFormKeys: () => Object.keys(state.forms),
    addForm(key, items) {
      state.forms[key]    = deepClone(items);
      state.original[key] = deepClone(items);
      setDirty();
      renderFormList(document.getElementById('form-search').value);
      selectForm(key);
    },
    toast,
  };

  // ─── Boot ─────────────────────────────────────────────────────────────────────

  init();

})();
