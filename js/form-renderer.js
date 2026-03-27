// form-renderer.js — Renders form fields from JSON definitions

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

// Returns HTML string for a single field
function renderField(field, formData) {
  formData = formData || {};
  const val = formData[field.field_name] !== undefined ? formData[field.field_name] : '';
  const req = field.required ? ' required' : '';
  const reqMark = field.required ? '<span class="required-mark" aria-hidden="true">*</span>' : '';

  let html = `<div class="form-field" data-field="${escHtml(field.field_name)}" data-type="${escHtml(field.type)}">`;

  switch (field.type) {
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

// Returns array of unique page numbers sorted ascending
function getPageNumbers(fields) {
  return [...new Set(fields.map(f => Number(f.page)))].sort((a, b) => a - b);
}

// Returns HTML for all fields on a given page number
function renderPage(fields, pageNum, formData) {
  const pageFields = fields.filter(f => Number(f.page) === pageNum);
  return pageFields.map(f => renderField(f, formData || {})).join('');
}

// Collect form data from DOM fields
function collectFormData(fields) {
  const data = {};
  fields.forEach(field => {
    const el = document.getElementById('f_' + field.field_name);
    if (!el) return;
    if (field.type === 'checkbox') {
      data[field.field_name] = el.checked;
    } else if (field.type === 'radio') {
      const checked = document.querySelector(`input[name="${field.field_name}"]:checked`);
      data[field.field_name] = checked ? checked.value : '';
    } else if (field.type === 'signature') {
      data[field.field_name] = el.value; // set by signature.js
    } else {
      data[field.field_name] = el.value;
    }
  });
  return data;
}

// HTML escaping helpers
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str || '').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
