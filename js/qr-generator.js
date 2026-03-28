// qr-generator.js — QR code generation wrappers

// Generate a QR code for the kiosk screen (encodes the form URL)
// containerId: DOM element ID to render the QR into
// formId: the form ID string (filename without .pdf)
function generateKioskQR(containerId, formId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const url = buildFormUrl(formId);

  new QRCode(container, {
    text: url,
    width: 280,
    height: 280,
    colorDark: '#111827',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M,
  });

  return url;
}

// Generate a QR code for the mobile form completion.
// Encodes as JSON matching the registration repo methodology:
// { slot, formId, ...non-empty field values capped at 30 chars }
// Uses QRCode.CorrectLevel.M (medium) for robust scanning.
function generateDataQR(containerId, formData, formMeta, formFields) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const catNum = (formMeta && formMeta.id) ? formMeta.id.split('-')[0] : '';

  // Build slot number (YYYYMMDDHHmmss) — matches registration repo pattern
  const now = new Date();
  const p = function(n) { return String(n).padStart(2, '0'); };
  const slot = String(now.getFullYear()) + p(now.getMonth() + 1) + p(now.getDate())
    + p(now.getHours()) + p(now.getMinutes()) + p(now.getSeconds());

  const payload = { slot: slot, formId: catNum };

  // Add non-empty field values; skip signatures and structural blocks
  (formFields || []).forEach(function(field) {
    var ft = field.field_type || field.type || '';
    if (field.type === 'heading' || field.type === 'instruction' || !field.field_name) return;
    if (ft === 'signature') return;
    var val = (formData || {})[field.field_name];
    if (val === undefined || val === null || val === false || val === '') return;
    if (val === true) { payload[field.field_name] = '1'; return; }
    payload[field.field_name] = String(val).slice(0, 30);
  });

  try {
    new QRCode(container, {
      text: JSON.stringify(payload),
      width: 280,
      height: 280,
      colorDark: '#111827',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  } catch (e) { /* silent — canvas check below */ }

  // If QR failed to render, show text summary fallback
  if (!container.querySelector('canvas,img')) {
    _dataQRFallback(container, formData, catNum);
  }
}

function _dataQRFallback(container, formData, catNum) {
  let html = '<div class="data-fallback">'
    + '<p class="data-fallback-title">Form ' + (catNum || '') + ' — completed ' + new Date().toLocaleDateString('en-AU') + '</p>';
  Object.keys(formData || {}).forEach(key => {
    const val = formData[key];
    if (!val || (typeof val === 'string' && val.startsWith('data:image'))) return;
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    html += '<p class="data-fallback-row"><strong>' + label + ':</strong> ' + String(val).slice(0, 50) + '</p>';
  });
  html += '</div>';
  container.innerHTML = html;
}
