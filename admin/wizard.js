(function () {
  'use strict';

  // ── Categories ────────────────────────────────────────────────────────────────

  const CATEGORIES = [
    'Access to Information Forms',
    'Driving Instructors & Assessors Forms',
    'Driver Licensing Forms',
    'e-Toll & M5 South-West Cashback Forms',
    'Health Professionals Licence Forms',
    'Heavy Vehicle Operator Forms',
    'Maritime & Boating Forms',
    'Miscellaneous Forms',
    'Public Passenger Vehicle Operator Forms',
    'Vehicle Registration Forms',
    'Vehicle Safety Compliance Certification Scheme (VSCCS) Forms',
    'Property & Stock Agent Forms',
  ];

  // ── Presets ───────────────────────────────────────────────────────────────────

  const PRESETS = [
    {
      name: 'Person Details', icon: '👤',
      items: [
        { type: 'heading', text: 'Personal Details', page: 1 },
        { label: 'Given name(s)',  field_name: 'given_names',   type: 'text',  options: [], required: true,  page: 1 },
        { label: 'Family name',   field_name: 'family_name',   type: 'text',  options: [], required: true,  page: 1 },
        { label: 'Date of birth', field_name: 'date_of_birth', type: 'date',  options: [], required: true,  page: 1 },
        { label: 'Gender',        field_name: 'gender',        type: 'radio', options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'], required: false, page: 1 },
      ],
    },
    {
      name: 'Mailing Address', icon: '📮',
      items: [
        { type: 'heading', text: 'Mailing Address', page: 1 },
        { label: 'Street address', field_name: 'street_address', type: 'text',     options: [], required: true, page: 1 },
        { label: 'Suburb',         field_name: 'suburb',         type: 'text',     options: [], required: true, page: 1 },
        { label: 'State',          field_name: 'state',          type: 'dropdown', options: ['NSW','VIC','QLD','SA','WA','TAS','NT','ACT'], required: true, page: 1 },
        { label: 'Postcode',       field_name: 'postcode',       type: 'text',     options: [], required: true, page: 1 },
      ],
    },
    {
      name: 'Contact Details', icon: '📞',
      items: [
        { type: 'heading', text: 'Contact Details', page: 1 },
        { label: 'Phone number',  field_name: 'phone_number',  type: 'text', options: [], required: false, page: 1 },
        { label: 'Mobile number', field_name: 'mobile_number', type: 'text', options: [], required: false, page: 1 },
        { label: 'Email address', field_name: 'email_address', type: 'text', options: [], required: false, page: 1 },
      ],
    },
    {
      name: 'Driver Licence', icon: '🪪',
      items: [
        { type: 'heading', text: 'Driver Licence Details', page: 1 },
        { label: 'Licence number', field_name: 'licence_number', type: 'text',     options: [], required: true,  page: 1 },
        { label: 'State of issue', field_name: 'licence_state',  type: 'dropdown', options: ['NSW','VIC','QLD','SA','WA','TAS','NT','ACT'], required: true, page: 1 },
        { label: 'Licence class',  field_name: 'licence_class',  type: 'text',     options: [], required: false, page: 1 },
        { label: 'Expiry date',    field_name: 'licence_expiry', type: 'date',     options: [], required: true,  page: 1 },
      ],
    },
    {
      name: 'Vehicle Details', icon: '🚗',
      items: [
        { type: 'heading', text: 'Vehicle Details', page: 1 },
        { label: 'Registration number',              field_name: 'registration_number',  type: 'text',   options: [], required: true,  page: 1 },
        { label: 'Vehicle identification number (VIN)', field_name: 'vin',              type: 'text',   options: [], required: false, page: 1 },
        { label: 'Make',                             field_name: 'vehicle_make',         type: 'text',   options: [], required: false, page: 1 },
        { label: 'Model',                            field_name: 'vehicle_model',        type: 'text',   options: [], required: false, page: 1 },
        { label: 'Year of manufacture',              field_name: 'year_of_manufacture',  type: 'number', options: [], required: false, page: 1 },
        { label: 'Colour',                           field_name: 'vehicle_colour',       type: 'text',   options: [], required: false, page: 1 },
      ],
    },
    {
      name: 'Vessel Details', icon: '⛵',
      items: [
        { type: 'heading', text: 'Vessel Details', page: 1 },
        { label: 'Hull identification number (HIN)', field_name: 'hin',                type: 'text',   options: [], required: false, page: 1 },
        { label: 'Vessel registration number',       field_name: 'vessel_registration', type: 'text',   options: [], required: false, page: 1 },
        { label: 'Vessel name',                      field_name: 'vessel_name',         type: 'text',   options: [], required: false, page: 1 },
        { label: 'Type of vessel',                   field_name: 'vessel_type',         type: 'text',   options: [], required: false, page: 1 },
        { label: 'Length (metres)',                  field_name: 'vessel_length',       type: 'number', options: [], required: false, page: 1 },
      ],
    },
    {
      name: 'Representative / Agent', icon: '🤝',
      items: [
        { type: 'heading', text: 'Representative / Agent Details', page: 1 },
        { label: 'Representative given name(s)', field_name: 'rep_given_names',  type: 'text', options: [], required: false, page: 1 },
        { label: 'Representative family name',   field_name: 'rep_family_name',  type: 'text', options: [], required: false, page: 1 },
        { label: 'Relationship to applicant',    field_name: 'rep_relationship', type: 'text', options: [], required: false, page: 1 },
        { label: 'Representative phone',         field_name: 'rep_phone',        type: 'text', options: [], required: false, page: 1 },
      ],
    },
    {
      name: 'Declaration & Signature', icon: '✍',
      items: [
        { type: 'heading',    text: 'Declaration', page: 1 },
        { type: 'disclosure', text: 'I declare that the information provided in this application is true and correct to the best of my knowledge.', page: 1 },
        { label: 'Applicant signature', field_name: 'applicant_signature', type: 'signature', options: [], required: true,  page: 1 },
        { label: 'Date signed',         field_name: 'date_signed',         type: 'date',      options: [], required: true,  page: 1 },
      ],
    },
  ];

  const BLOCK_TYPES    = new Set(['heading', 'instruction', 'disclosure']);
  const FIELD_TYPES    = ['text', 'number', 'date', 'textarea', 'checkbox', 'radio', 'dropdown', 'signature'];
  const BLOCK_TYPE_LIST = ['heading', 'instruction', 'disclosure'];
  const TYPE_ICONS     = {
    text: 'T', number: '#', date: '📅', textarea: '≡',
    checkbox: '☑', radio: '◎', dropdown: '▾', signature: '✍',
    heading: 'H', instruction: 'ℹ', disclosure: '⚠',
  };
  const WIZ_STEPS = ['Form Details', 'Add Fields', 'Review & Save'];

  // ── Wizard state ──────────────────────────────────────────────────────────────

  const wiz = { step: 0, name: '', key: '', category: '', items: [], addingType: null, addingIsBlock: false };

  // ── Open / Close ──────────────────────────────────────────────────────────────

  function openWiz() {
    Object.assign(wiz, { step: 0, name: '', key: '', category: '', items: [], addingType: null, addingIsBlock: false });
    renderWiz();
    document.getElementById('wiz-overlay').classList.remove('hidden');
  }

  function closeWiz() {
    document.getElementById('wiz-overlay').classList.add('hidden');
  }

  // ── Render shell ──────────────────────────────────────────────────────────────

  function renderWiz() {
    document.getElementById('wiz-steps').innerHTML = WIZ_STEPS.map((label, i) => {
      const cls = i < wiz.step ? 'done' : i === wiz.step ? 'active' : '';
      return `<div class="wiz-step ${cls}">
        <span class="step-num">${i < wiz.step ? '✓' : i + 1}</span>
        <span>${label}</span>
      </div>${i < WIZ_STEPS.length - 1 ? '<div class="step-connector"></div>' : ''}`;
    }).join('');

    const body = document.getElementById('wiz-body');
    body.style.overflow = wiz.step === 0 ? 'auto' : 'hidden';
    if (wiz.step === 0)      renderStep1(body);
    else if (wiz.step === 1) renderStep2(body);
    else                     renderStep3(body);

    document.getElementById('wiz-back').style.display = wiz.step === 0 ? 'none' : '';
    document.getElementById('wiz-next').textContent   = wiz.step === WIZ_STEPS.length - 1 ? '✔ Save Form' : 'Next →';
  }

  // ── Step 1: Form Details ──────────────────────────────────────────────────────

  function renderStep1(body) {
    body.innerHTML = `
      <div class="step1-body">
        <div class="form-group">
          <label>Form title <span style="color:#D7153A">*</span></label>
          <input type="text" id="wiz-name" value="${esc(wiz.name)}" placeholder="e.g. Transfer of Registration" autocomplete="off">
          <div class="field-hint">A short, human-readable name for this form</div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>File key <span style="color:#D7153A">*</span></label>
            <input type="text" id="wiz-key" value="${esc(wiz.key)}" placeholder="e.g. 45099001-my-form.pdf" autocomplete="off">
            <div class="field-hint">Unique filename — auto-filled from title</div>
          </div>
          <div class="form-group">
            <label>Category <span style="color:#D7153A">*</span></label>
            <select id="wiz-cat">
              <option value="">— Select —</option>
              ${CATEGORIES.map(c => `<option value="${esc(c)}"${wiz.category === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>`;

    const nameEl = document.getElementById('wiz-name');
    const keyEl  = document.getElementById('wiz-key');
    let autoKey  = !wiz.key;

    nameEl.addEventListener('input', () => {
      wiz.name = nameEl.value;
      if (autoKey) {
        const slug = nameEl.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        keyEl.value = wiz.key = nextCatNum() + '-' + slug + '.pdf';
      }
    });
    keyEl.addEventListener('input', () => { wiz.key = keyEl.value; autoKey = false; });
    document.getElementById('wiz-cat').addEventListener('change', e => { wiz.category = e.target.value; });
  }

  function nextCatNum() {
    const keys = window.adminAPI ? window.adminAPI.getFormKeys() : [];
    let max = 99000;
    keys.forEach(k => { const m = k.match(/^(\d+)-/); if (m) max = Math.max(max, +m[1]); });
    return max + 1;
  }

  // ── Step 2: Field Builder ─────────────────────────────────────────────────────

  function renderStep2(body) {
    body.innerHTML = `
      <div class="builder-layout">
        <div class="builder-list-panel">
          <div class="builder-list-head">
            <span class="builder-list-head-left" id="builder-count">FIELDS &amp; BLOCKS (${wiz.items.length})</span>
          </div>
          <div class="builder-list-wrap" id="builder-list-wrap">${renderItemsList()}</div>
        </div>
        <div class="builder-add-panel">
          <div class="add-panel-section">
            <div class="add-section-title">Preset Groups</div>
            <div class="preset-list">
              ${PRESETS.map(p => `
                <button class="preset-btn" data-preset="${esc(p.name)}">
                  <span class="preset-btn-icon">${p.icon}</span>
                  <span class="preset-btn-info">
                    <span class="preset-btn-name">${esc(p.name)}</span>
                    <span class="preset-btn-count">${p.items.length} items</span>
                  </span>
                </button>`).join('')}
            </div>
          </div>
          <div class="add-panel-section">
            <div class="add-section-title">Add Field</div>
            <div class="type-grid">
              ${FIELD_TYPES.map(t =>
                `<button class="type-add-btn" data-type="${t}" data-block="0">${TYPE_ICONS[t]} ${t}</button>`
              ).join('')}
            </div>
          </div>
          <div class="add-panel-section">
            <div class="add-section-title">Add Block</div>
            <div class="block-grid">
              ${BLOCK_TYPE_LIST.map(t =>
                `<button class="type-add-btn" data-type="${t}" data-block="1">${TYPE_ICONS[t]} ${t}</button>`
              ).join('')}
            </div>
          </div>
          <div id="inline-add-form" class="inline-add-form hidden"></div>
        </div>
      </div>`;

    body.querySelectorAll('.preset-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        const preset = PRESETS.find(p => p.name === btn.dataset.preset);
        if (preset) { wiz.items.push(...JSON.parse(JSON.stringify(preset.items))); refreshList(); }
      })
    );
    body.querySelectorAll('.type-add-btn').forEach(btn =>
      btn.addEventListener('click', () => showInlineAdd(btn.dataset.type, btn.dataset.block === '1'))
    );
  }

  function renderItemsList() {
    if (!wiz.items.length) {
      return `<div class="builder-empty">
        <div class="builder-empty-icon">📋</div>
        No fields yet — use presets or type buttons on the right
      </div>`;
    }
    return wiz.items.map((item, idx) => {
      const isBlock = BLOCK_TYPES.has(item.type);
      const label   = isBlock ? item.text : item.label;
      return `<div class="builder-item${isBlock ? ' is-block' : ''}">
        <span class="type-badge type-${item.type}"><span>${TYPE_ICONS[item.type] || '?'}</span>${item.type}</span>
        <span class="builder-item-label">${esc(label || '(empty)')}</span>
        <div class="builder-item-actions">
          <button class="order-btn btn-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="order-btn btn-dn" data-idx="${idx}" ${idx === wiz.items.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="builder-del-btn" data-idx="${idx}" title="Remove">✕</button>
        </div>
      </div>`;
    }).join('');
  }

  function refreshList() {
    const wrap  = document.getElementById('builder-list-wrap');
    const count = document.getElementById('builder-count');
    if (!wrap) return;
    wrap.innerHTML = renderItemsList();
    if (count) count.textContent = `FIELDS & BLOCKS (${wiz.items.length})`;
    bindListActions(wrap);
  }

  function bindListActions(container) {
    container.querySelectorAll('.btn-up').forEach(b =>
      b.addEventListener('click', () => moveWizItem(+b.dataset.idx, -1))
    );
    container.querySelectorAll('.btn-dn').forEach(b =>
      b.addEventListener('click', () => moveWizItem(+b.dataset.idx, 1))
    );
    container.querySelectorAll('.builder-del-btn').forEach(b =>
      b.addEventListener('click', () => { wiz.items.splice(+b.dataset.idx, 1); refreshList(); })
    );
  }

  function moveWizItem(idx, dir) {
    const ni = idx + dir;
    if (ni < 0 || ni >= wiz.items.length) return;
    [wiz.items[idx], wiz.items[ni]] = [wiz.items[ni], wiz.items[idx]];
    refreshList();
  }

  // ── Inline add form ───────────────────────────────────────────────────────────

  function showInlineAdd(type, isBlock) {
    wiz.addingType    = type;
    wiz.addingIsBlock = isBlock;
    const el = document.getElementById('inline-add-form');
    if (!el) return;
    const needsOpts = type === 'radio' || type === 'dropdown';

    el.classList.remove('hidden');
    el.innerHTML = `
      <div class="inline-form-title">${TYPE_ICONS[type]} Adding: ${type}</div>
      ${isBlock ? `
        <div class="form-group">
          <label>Text <span style="color:#D7153A">*</span></label>
          <textarea id="ia-text" rows="3" placeholder="Block text…"></textarea>
        </div>` : `
        <div class="form-group">
          <label>Label <span style="color:#D7153A">*</span></label>
          <input type="text" id="ia-label" placeholder="Display label" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Field name</label>
          <input type="text" id="ia-fname" placeholder="auto-generated" autocomplete="off">
        </div>
        ${needsOpts ? `
        <div class="form-group">
          <label>Options <span style="font-weight:400;text-transform:none">(one per line)</span></label>
          <textarea id="ia-opts" rows="3" placeholder="Option 1&#10;Option 2"></textarea>
        </div>` : ''}
        <div class="inline-form-checks">
          <label class="wiz-check-label"><input type="checkbox" id="ia-req"> Required</label>
          <label class="wiz-check-label"><input type="checkbox" id="ia-off"> Office only</label>
        </div>`}
      <div class="inline-form-btns">
        <button class="btn btn-sm btn-muted" id="ia-cancel">Cancel</button>
        <button class="btn btn-sm btn-primary" id="ia-add">Add</button>
      </div>`;

    if (!isBlock) {
      const labelEl = document.getElementById('ia-label');
      const fnameEl = document.getElementById('ia-fname');
      let auto = true;
      labelEl?.addEventListener('input', () => { if (auto) fnameEl.value = toSnake(labelEl.value); });
      fnameEl?.addEventListener('input', () => { auto = false; });
    }

    document.getElementById('ia-cancel').addEventListener('click', () => {
      el.classList.add('hidden'); el.innerHTML = '';
    });
    document.getElementById('ia-add').addEventListener('click', commitInlineAdd);
  }

  function commitInlineAdd() {
    const type    = wiz.addingType;
    const isBlock = wiz.addingIsBlock;

    if (isBlock) {
      const text = document.getElementById('ia-text')?.value.trim();
      if (!text) { wizToast('Text is required', 'error'); return; }
      wiz.items.push({ type, text, page: 1 });
    } else {
      const label     = document.getElementById('ia-label')?.value.trim();
      const fname     = document.getElementById('ia-fname')?.value.trim() || toSnake(label || type + '_field');
      if (!label) { wizToast('Label is required', 'error'); return; }
      const needsOpts = type === 'radio' || type === 'dropdown';
      const optsRaw   = needsOpts ? (document.getElementById('ia-opts')?.value || '') : '';
      const options   = optsRaw.split('\n').map(s => s.trim()).filter(Boolean);
      const required  = document.getElementById('ia-req')?.checked ?? false;
      const office    = document.getElementById('ia-off')?.checked ?? false;
      const item      = { label, field_name: fname, type, options, required, page: 1 };
      if (office) item.office_only = true;
      wiz.items.push(item);
    }

    const el = document.getElementById('inline-add-form');
    el.classList.add('hidden'); el.innerHTML = '';
    refreshList();
  }

  // ── Step 3: Review ────────────────────────────────────────────────────────────

  function renderStep3(body) {
    const fields = wiz.items.filter(i => !BLOCK_TYPES.has(i.type));
    const blocks = wiz.items.filter(i =>  BLOCK_TYPES.has(i.type));
    const sigs   = fields.filter(f => f.type === 'signature').length;
    const office = fields.filter(f => f.office_only).length;

    body.innerHTML = `
      <div class="step3-body">
        <div class="step3-summary">
          <div class="summary-card">
            <div class="summary-label">Form title</div>
            <div class="summary-value">${esc(wiz.name || '(untitled)')}</div>
            <div class="summary-label" style="margin-top:10px">File key</div>
            <div class="summary-value" style="font-family:monospace;font-size:12px">${esc(wiz.key)}</div>
            <div class="summary-label" style="margin-top:10px">Category</div>
            <div class="summary-value">${esc(wiz.category || '(none)')}</div>
            <div class="summary-label" style="margin-top:10px">Fields</div>
            <div class="summary-value">${fields.length} total${sigs ? ' · ' + sigs + ' sig' : ''}${office ? ' · ' + office + ' office-only' : ''}</div>
            <div class="summary-label" style="margin-top:10px">Blocks</div>
            <div class="summary-value">${blocks.length}</div>
          </div>
          <p style="font-size:12px;color:#6B7280;line-height:1.5">
            After saving, the form will appear in the left panel and you can continue adding or editing fields.
          </p>
        </div>
        <div class="step3-preview" style="overflow-y:auto;padding:16px">
          <div class="add-section-title" style="margin-bottom:10px">Field preview (${wiz.items.length} items)</div>
          ${wiz.items.slice(0, 30).map(item => {
            const isBlock = BLOCK_TYPES.has(item.type);
            return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #DEE0E3">
              <span class="type-badge type-${item.type}" style="flex-shrink:0"><span>${TYPE_ICONS[item.type] || '?'}</span>${item.type}</span>
              <span style="font-size:12px;color:#22272B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(isBlock ? (item.text || '') : (item.label || ''))}</span>
            </div>`;
          }).join('')}
          ${wiz.items.length > 30 ? `<p style="font-size:12px;color:#6B7280;padding:8px 0;text-align:center">…and ${wiz.items.length - 30} more</p>` : ''}
        </div>
      </div>`;
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  function wizNext() {
    if (wiz.step === 0) {
      const name = document.getElementById('wiz-name')?.value.trim();
      const key  = document.getElementById('wiz-key')?.value.trim();
      const cat  = document.getElementById('wiz-cat')?.value;
      if (!name) { wizToast('Please enter a form title', 'error'); return; }
      if (!key)  { wizToast('Please enter a file key', 'error'); return; }
      if (!cat)  { wizToast('Please select a category', 'error'); return; }
      if (window.adminAPI && window.adminAPI.getFormKeys().includes(key)) {
        wizToast('That key already exists — choose a different filename', 'error'); return;
      }
      wiz.name = name; wiz.key = key; wiz.category = cat;
    }

    if (wiz.step === WIZ_STEPS.length - 1) {
      saveNewForm(); return;
    }
    wiz.step++;
    renderWiz();
  }

  function wizBack() {
    if (wiz.step === 0) return;
    wiz.step--;
    renderWiz();
  }

  function saveNewForm() {
    if (!wiz.key) { wizToast('No file key set', 'error'); return; }
    const api = window.adminAPI;
    if (!api) { wizToast('Admin not ready — please reload', 'error'); return; }
    api.addForm(wiz.key, wiz.items);
    closeWiz();
    api.toast('Form "' + (wiz.name || wiz.key) + '" created!', 'success');
  }

  // ── Utilities ─────────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toSnake(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function wizToast(msg, type) {
    const fn = window.adminAPI?.toast;
    if (fn) fn(msg, type);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────────

  document.getElementById('btn-new-form').addEventListener('click', openWiz);
  document.getElementById('wiz-close').addEventListener('click', closeWiz);
  document.getElementById('wiz-cancel').addEventListener('click', closeWiz);
  document.getElementById('wiz-next').addEventListener('click', wizNext);
  document.getElementById('wiz-back').addEventListener('click', wizBack);
  document.getElementById('wiz-overlay').addEventListener('click', e => {
    if (e.target.id === 'wiz-overlay') closeWiz();
  });

})();
