// validator.js — Field and page validation

// Validate a single field value against its definition.
// Returns { valid: bool, message: string }
function validateField(field, value) {
  if (field.required) {
    if (field.type === 'checkbox') {
      if (!value) return { valid: false, message: `${field.label} must be checked.` };
    } else if (field.type === 'signature') {
      if (!value || value.length < 50) return { valid: false, message: 'Signature is required.' };
    } else {
      if (!value || String(value).trim() === '') {
        return { valid: false, message: `${field.label} is required.` };
      }
    }
  }

  if (value && String(value).trim() !== '') {
    if (field.type === 'date') {
      const d = new Date(value);
      if (isNaN(d.getTime())) return { valid: false, message: 'Please enter a valid date.' };
    }
    // Basic email check for fields named *email*
    if (field.field_name.toLowerCase().includes('email')) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(String(value).trim())) {
        return { valid: false, message: 'Please enter a valid email address.' };
      }
    }
    // Basic phone check for fields named *phone*
    if (field.field_name.toLowerCase().includes('phone')) {
      const cleaned = String(value).replace(/[\s\-().+]/g, '');
      if (!/^\d{8,15}$/.test(cleaned)) {
        return { valid: false, message: 'Please enter a valid phone number.' };
      }
    }
    // Postcode: 4 digits
    if (field.field_name.toLowerCase().includes('postcode')) {
      if (!/^\d{4}$/.test(String(value).trim())) {
        return { valid: false, message: 'Postcode must be 4 digits.' };
      }
    }
  }

  return { valid: true, message: '' };
}

// Validate all fields on a page. Shows inline errors. Returns true if all valid.
function validatePage(fields, pageNum) {
  // Filter to this page's blocks, skipping heading/instruction blocks
  const pageFields = fields.filter(f =>
    Number(f.page) === pageNum &&
    f.type !== 'heading' &&
    f.type !== 'instruction' &&
    f.field_name
  );
  let allValid = true;
  let firstInvalid = null;

  pageFields.forEach(field => {
    const fieldType = field.field_type || field.type || 'text';
    let value;
    if (fieldType === 'checkbox') {
      const el = document.getElementById('f_' + field.field_name);
      value = el ? el.checked : false;
    } else if (fieldType === 'radio') {
      const checked = document.querySelector(`input[name="${field.field_name}"]:checked`);
      value = checked ? checked.value : '';
    } else if (fieldType === 'signature') {
      const el = document.getElementById('f_' + field.field_name);
      value = el ? el.value : '';
    } else {
      const el = document.getElementById('f_' + field.field_name);
      value = el ? el.value : '';
    }

    const result = validateField(field, value);
    const errEl = document.getElementById('err_' + field.field_name);
    const fieldEl = document.querySelector(`[data-field="${field.field_name}"]`);

    if (!result.valid) {
      if (errEl) errEl.textContent = result.message;
      if (fieldEl) fieldEl.classList.add('has-error');
      allValid = false;
      if (!firstInvalid) {
        const inputEl = document.getElementById('f_' + field.field_name)
          || document.querySelector(`input[name="${field.field_name}"]`);
        firstInvalid = inputEl;
      }
    } else {
      if (errEl) errEl.textContent = '';
      if (fieldEl) fieldEl.classList.remove('has-error');
    }
  });

  if (firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return allValid;
}

// Clear all validation errors
function clearValidationErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
}
