// qr-generator.js — QR code generation for the Service NSW kiosk

// ── Kiosk QR (encodes the form URL for the QR browse screen) ──────────────
function generateKioskQR(containerId, formId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  var url = buildFormUrl(formId);
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

// ── Data QR (encodes completed form data + embedded signature path) ────────
//
// Two-tier strategy:
//   Tier 1 (always): slot + formId + all short fields + textareas ≤80 chars
//                    + signature SVG path
//   Tier 2 (only when textarea answers > 80 chars exist): slot + full text
//
// Both QRs reference the same slot number so the scanner can link them.
//
function generateDataQR(containerId, formData, formMeta, formFields) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  var catNum = (formMeta && formMeta.id) ? formMeta.id.split('-')[0] : '';

  // Slot number: YYYYMMDDHHmmss — links both QRs together
  var now = new Date();
  var _p  = function (n) { return String(n).padStart(2, '0'); };
  var slot = String(now.getFullYear()) + _p(now.getMonth() + 1) + _p(now.getDate())
           + _p(now.getHours())        + _p(now.getMinutes())   + _p(now.getSeconds());

  // Partition fields
  var shortFields   = [];
  var textareaFields = [];
  var sigFieldNames  = [];

  (formFields || []).forEach(function (f) {
    var ft = f.field_type || f.type || '';
    if (f.type === 'heading' || f.type === 'instruction' || !f.field_name) return;
    if (ft === 'signature') { sigFieldNames.push(f.field_name); return; }
    if (ft === 'textarea')  { textareaFields.push(f); }
    else                    { shortFields.push(f); }
  });

  // ── Build Tier 1 payload ────────────────────────────────────────────────
  var t1 = { slot: slot, f: catNum };

  shortFields.forEach(function (f) {
    var val = (formData || {})[f.field_name];
    if (val === undefined || val === null || val === '' || val === false) return;
    t1[f.field_name] = (val === true) ? '1' : String(val).slice(0, 50);
  });

  // Textareas: first 80 chars only in Tier 1
  textareaFields.forEach(function (f) {
    var val = (formData || {})[f.field_name];
    if (!val) return;
    t1[f.field_name] = String(val).slice(0, 80);
  });

  // Signature SVG path (from stroke recording in signature.js)
  sigFieldNames.forEach(function (name) {
    if (typeof getSignatureSVGPath === 'function') {
      var path = getSignatureSVGPath(name);
      if (path) t1.sig = path;           // only the first/primary signature
    }
  });

  // ── Build Tier 2 payload (only if any textarea exceeds 80 chars) ────────
  var t2 = null;
  var longTextareas = textareaFields.filter(function (f) {
    var val = (formData || {})[f.field_name];
    return val && String(val).length > 80;
  });

  if (longTextareas.length > 0) {
    t2 = { slot: slot, f: catNum, detail: {} };
    longTextareas.forEach(function (f) {
      t2.detail[f.field_name] = String((formData || {})[f.field_name]).slice(0, 500);
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (t2) {
    _renderDualQR(container, JSON.stringify(t1), JSON.stringify(t2));
  } else {
    _renderSingleQR(container, JSON.stringify(t1));
  }
}

// ── Single QR layout ───────────────────────────────────────────────────────
function _renderSingleQR(container, text) {
  var box = document.createElement('div');
  box.className = 'qr-box';
  container.appendChild(box);
  _makeQR(box, text, 280);

  if (!box.querySelector('canvas,img')) {
    _dataQRFallback(container, text);
  }
}

// ── Dual QR layout ─────────────────────────────────────────────────────────
function _renderDualQR(container, text1, text2) {
  container.innerHTML =
    '<div class="qr-dual-wrap">' +
      '<div class="qr-panel">' +
        '<span class="qr-badge">Scan 1 of 2</span>' +
        '<span class="qr-panel-label">Application Data</span>' +
        '<div class="qr-box" id="_qrT1"></div>' +
        '<span class="qr-panel-sub">Name, dates, selections &amp; signature</span>' +
      '</div>' +
      '<div class="qr-divider"></div>' +
      '<div class="qr-panel">' +
        '<span class="qr-badge qr-badge--detail">Scan 2 of 2</span>' +
        '<span class="qr-panel-label">Written Responses</span>' +
        '<div class="qr-box" id="_qrT2"></div>' +
        '<span class="qr-panel-sub">Full text answers &amp; descriptions</span>' +
      '</div>' +
    '</div>';

  _makeQR(document.getElementById('_qrT1'), text1, 240);
  _makeQR(document.getElementById('_qrT2'), text2, 240);
}

// ── Shared QR renderer ─────────────────────────────────────────────────────
function _makeQR(el, text, size) {
  if (!el) return;
  try {
    new QRCode(el, {
      text: text,
      width:  size,
      height: size,
      colorDark:    '#111827',
      colorLight:   '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  } catch (e) { /* library will silently skip if text too long */ }
}

// ── Text fallback (shown if QR library still can't encode) ─────────────────
function _dataQRFallback(container, catNum) {
  container.innerHTML =
    '<div class="data-fallback">' +
      '<p class="data-fallback-title">QR unavailable — please ask staff to assist</p>' +
      '<p class="data-fallback-row">Form: ' + (catNum || '') + '</p>' +
    '</div>';
}
