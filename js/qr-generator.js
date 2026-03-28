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
    colorDark: '#002664',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.M,
  });

  return url;
}

// Generate a QR code for the mobile form completion.
// Encodes as pipe-separated values: "{catNum}:{val1}|{val2}|...|{valN}|{date}"
// No field keys are included — the scanner app uses the catalogue number to
// look up the form definition and map values to fields by position.
// This keeps the payload under 200 bytes for typical forms.
function generateDataQR(containerId, formData, formMeta, formFields) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const catNum = (formMeta && formMeta.id) ? formMeta.id.split('-')[0] : '';
  const date = new Date().toISOString().slice(0, 10);

  // Build ordered value list from field definitions (excludes heading/instruction/signature)
  const dataFields = (formFields || []).filter(function(f) {
    var ft = f.field_type || f.type || '';
    return f.type !== 'heading' && f.type !== 'instruction' && f.field_name && ft !== 'signature';
  });

  var values;
  if (dataFields.length > 0) {
    values = dataFields.map(function(field) {
      var val = (formData || {})[field.field_name];
      if (val === undefined || val === null || val === false || val === '') return '';
      if (val === true) return '1';
      // Strip pipe characters and non-latin chars; cap at 40 chars
      return String(val).replace(/\|/g, ' ').slice(0, 40);
    });
  } else {
    // Fallback: no field order known — use values from formData object
    values = Object.keys(formData || {}).map(function(key) {
      var val = formData[key];
      if (val === undefined || val === null || val === false || val === '') return '';
      if (typeof val === 'string' && val.startsWith('data:image')) return '';
      if (val === true) return '1';
      return String(val).replace(/\|/g, ' ').slice(0, 40);
    });
  }

  const payload = catNum + ':' + values.join('|') + '|' + date;

  try {
    new QRCode(container, {
      text: payload,
      width: 260,
      height: 260,
      colorDark: '#002664',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.L,
    });
  } catch (e) { /* silent — canvas check below */ }

  // If library returned null (text too long), show a readable text summary instead
  if (!container.querySelector('canvas')) {
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
