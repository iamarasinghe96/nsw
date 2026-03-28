// form-renderer.js — Renders form fields from JSON definitions

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

// Renders a single block — routes "heading", "instruction", or "field" blocks.
// The new final_fields.json format uses blocks with a top-level `type` of
// "heading", "instruction", or "field". Field blocks carry `field_type` for
// the input type (replacing the old flat `type` field).
function renderBlock(block, formData) {
  if (block.type === 'heading') {
    return `<div class="form-heading"><h3>${escHtml(block.text || '')}</h3></div>`;
  }
  if (block.type === 'instruction') {
    return `<div class="form-instruction"><p>${escHtml(block.text || '')}</p></div>`;
  }
  // Default: treat as a field block (covers both explicit type:"field" and
  // legacy flat objects that have no type property at all)
  return renderField(block, formData);
}

// Returns HTML string for a single field block
function renderField(field, formData) {
  formData = formData || {};
  const fieldType = field.field_type || field.type || 'text';
  const val = formData[field.field_name] !== undefined ? formData[field.field_name] : '';
  const req = field.required ? ' required' : '';
  const reqMark = field.required ? '<span class="required-mark" aria-hidden="true">*</span>' : '';

  let html = `<div class="form-field" data-field="${escHtml(field.field_name)}" data-type="${escHtml(fieldType)}">`;

  switch (fieldType) {
    case 'text':
      html += `<label class="field-label" for="f_${escHtml(field.field_name)}">${escHtml(field.label)}${reqMark}</label>`;
      html += `<input type="text" id="f_${escHtml(field.field_name)}" name="${escHtml(field.field_name)}" class="field-input" value="${escAttr(val)}" placeholder="${escAttr(field.label)}" autocomplete="off"${req}>`;
      break;

    case 'number':
      html += `<label class="field-label" for="f_${escHtml(field.field_name)}">${escHtml(field.label)}${reqMark}</label>`;
      html += `<input type="number" id="f_${escHtml(field.field_name)}" name="${escHtml(field.field_name)}" class="field-input" inputmode="numeric" value="${escAttr(val)}" placeholder="${escAttr(field.label)}"${req}>`;
      break;

    case 'date':
      html += `<label class="field-label" for="f_${escHtml(field.field_name)}">${escHtml(field.label)}${reqMark}</label>`;
      html += `<input type="date" id="f_${escHtml(field.field_name)}" name="${escHtml(field.field_name)}" class="field-input" value="${escAttr(val)}"${req}>`;
      break;

    case 'textarea':
      html += `<label class="field-label" for="f_${escHtml(field.field_name)}">${escHtml(field.label)}${reqMark}</label>`;
      html += `<textarea id="f_${escHtml(field.field_name)}" name="${escHtml(field.field_name)}" class="field-input" rows="4" placeholder="${escAttr(field.label)}"${req}>${escHtml(val)}</textarea>`;
      break;

    case 'checkbox':
      html += `<label class="checkbox-label" id="lbl_${escHtml(field.field_name)}">
        <input type="checkbox" id="f_${escHtml(field.field_name)}" name="${escHtml(field.field_name)}" class="field-checkbox"${val ? ' checked' : ''}${req}>
        <span class="checkbox-custom"></span>
        <span>${escHtml(field.label)}${reqMark}</span>
      </label>`;
      break;

    case 'radio': {
      html += `<fieldset class="radio-fieldset"><legend class="field-label">${escHtml(field.label)}${reqMark}</legend><div class="radio-group">`;
      const opts = Array.isArray(field.options) ? field.options : [];
      opts.forEach(opt => {
        const checked = val === opt ? ' checked' : '';
        html += `<label class="radio-label">
          <input type="radio" name="${escHtml(field.field_name)}" value="${escAttr(opt)}" class="field-radio"${checked}${req}>
          <span class="radio-custom"></span>
          <span>${escHtml(opt)}</span>
        </label>`;
      });
      html += `</div></fieldset>`;
      break;
    }

    case 'dropdown': {
      html += `<label class="field-label" for="f_${escHtml(field.field_name)}">${escHtml(field.label)}${reqMark}</label>`;
      const opts = (Array.isArray(field.options) && field.options.length > 0)
        ? field.options
        : (field.field_name.toLowerCase().includes('state') ? STATES : []);
      html += `<select id="f_${escHtml(field.field_name)}" name="${escHtml(field.field_name)}" class="field-input field-select"${req}>`;
      html += `<option value="">— Select —</option>`;
      opts.forEach(opt => {
        const sel = val === opt ? ' selected' : '';
        html += `<option value="${escAttr(opt)}"${sel}>${escHtml(opt)}</option>`;
      });
      html += `</select>`;
      break;
    }

    case 'signature':
      html += `<label class="field-label">${escHtml(field.label)}${reqMark}</label>`;
      html += `<div class="signature-container" id="sigwrap_${escHtml(field.field_name)}">
        <canvas id="sigcanvas_${escHtml(field.field_name)}" class="signature-canvas" width="480" height="180"></canvas>
        <input type="hidden" id="f_${escHtml(field.field_name)}" name="${escHtml(field.field_name)}" value="${escAttr(val)}">
        <button type="button" class="btn-clear-sig" onclick="clearSignaturePad('${escHtml(field.field_name)}')">✕ Clear Signature</button>
      </div>`;
      break;

    default:
      html += `<label class="field-label">${escHtml(field.label)}</label>`;
      html += `<input type="text" name="${escHtml(field.field_name)}" class="field-input" value="${escAttr(val)}">`;
  }

  html += `<div class="field-error" id="err_${escHtml(field.field_name)}" role="alert" aria-live="polite"></div>`;
  html += `</div>`;
  return html;
}

// Returns array of unique page numbers sorted ascending.
// Skips heading/instruction blocks (they have no field_name).
function getPageNumbers(fields) {
  return [...new Set(
    fields
      .filter(b => b.type !== 'heading' && b.type !== 'instruction' && b.field_name)
      .map(b => Number(b.page))
      .filter(n => !isNaN(n))
  )].sort((a, b) => a - b);
}

// Returns HTML for all blocks on a given page number (headings, instructions, fields)
function renderPage(fields, pageNum, formData) {
  const pageBlocks = fields.filter(b => Number(b.page) === pageNum);
  return pageBlocks.map(b => renderBlock(b, formData || {})).join('');
}

// Collect form data from DOM fields — skips heading and instruction blocks
function collectFormData(fields) {
  const data = {};
  fields.forEach(block => {
    if (block.type === 'heading' || block.type === 'instruction') return;
    const field = block;
    const el = document.getElementById('f_' + field.field_name);
    if (!el) return;
    const fieldType = field.field_type || field.type || 'text';
    if (fieldType === 'checkbox') {
      data[field.field_name] = el.checked;
    } else if (fieldType === 'radio') {
      const checked = document.querySelector(`input[name="${field.field_name}"]:checked`);
      data[field.field_name] = checked ? checked.value : '';
    } else if (fieldType === 'signature') {
      data[field.field_name] = el.value; // set by signature.js
    } else {
      data[field.field_name] = el.value;
    }
  });
  return data;
}

// Wire up visual interactions for custom checkbox and radio elements.
// Call this after any renderPage() sets innerHTML on a container.
function initPageInteractions(container) {
  // Checkboxes: sync .checked class on the label with native input state
  container.querySelectorAll('.checkbox-label').forEach(function(label) {
    var input = label.querySelector('.field-checkbox');
    if (!input) return;
    // Restore initial state (e.g. when navigating back to a filled step)
    label.classList.toggle('checked', input.checked);
    label.addEventListener('click', function() {
      // setTimeout lets the browser toggle input.checked before we read it
      setTimeout(function() {
        label.classList.toggle('checked', input.checked);
      }, 0);
    });
  });

  // Radio buttons: sync .selected class with native input state
  container.querySelectorAll('.radio-label').forEach(function(label) {
    var input = label.querySelector('.field-radio');
    if (!input) return;
    if (input.checked) label.classList.add('selected');
    label.addEventListener('click', function() {
      var name = input.name;
      // Clear .selected from every label in the same group
      container.querySelectorAll('.radio-label').forEach(function(sibling) {
        var sibInput = sibling.querySelector('.field-radio');
        if (sibInput && sibInput.name === name) sibling.classList.remove('selected');
      });
      label.classList.add('selected');
    });
  });
}

// HTML escaping helpers
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str || '').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
