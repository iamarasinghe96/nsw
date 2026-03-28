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

// Generate a QR code for the mobile form completion (encodes JSON form data).
// The QR library supports up to ~271 bytes (version 10, L correction), so we
// build the most compact payload possible and fall back to a text summary if
// the data is still too large.
function generateDataQR(containerId, formData, formMeta) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  // Compact payload: catalogue number only, date only, non-empty values, text capped at 35 chars
  const catNum = (formMeta && formMeta.id) ? formMeta.id.split('-')[0] : '';
  const compact = {
    f: catNum,
    d: {},
    t: new Date().toISOString().slice(0, 10),
  };

  Object.keys(formData || {}).forEach(key => {
    const val = formData[key];
    if (val === '' || val === null || val === undefined || val === false) return;
    if (typeof val === 'string' && val.startsWith('data:image')) {
      compact.d[key] = '[signed]';
      return;
    }
    compact.d[key] = (typeof val === 'string' && val.length > 35) ? val.slice(0, 35) : val;
  });

  const jsonStr = JSON.stringify(compact);

  try {
    new QRCode(container, {
      text: jsonStr,
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
