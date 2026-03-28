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

// ── Sanitise text to ASCII-safe for QR encoding ────────────────────────────
// Multi-byte Unicode chars (em dash, smart quotes, etc.) can cause qrcodejs
// to fail silently. Replace them with safe ASCII equivalents.
function _qrSafe(str) {
  return str
    .replace(/[\u2018\u2019]/g, "'")   // smart single quotes → '
    .replace(/[\u201C\u201D]/g, '"')   // smart double quotes → "
    .replace(/[\u2013\u2014]/g, '-')   // en/em dash → -
    .replace(/[\u2026]/g, '...')       // ellipsis → ...
    .replace(/[^\x00-\x7F]/g, '?');   // all remaining non-ASCII → ?
}

// ── Data QR (encodes completed form data + embedded signature path) ────────
//
// Two-tier strategy:
//   Tier 1 (always): slot + formId + all short fields + textareas ≤80 chars
//                    + signature SVG path (capped at 400 chars)
//   Tier 2 (only when textarea answers > 80 chars): slot + full text answers
//
// If Tier 1 is still too large after capping, signature is dropped and tried
// again with L error correction before falling back to text summary.
//
function generateDataQR(containerId, formData, formMeta, formFields) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  var catNum = (formMeta && formMeta.id) ? formMeta.id.split('-')[0] : '';

  // Slot: YYYYMMDDHHmmss — links Tier 1 and Tier 2 together
  var now = new Date();
  var _p  = function (n) { return String(n).padStart(2, '0'); };
  var slot = String(now.getFullYear()) + _p(now.getMonth() + 1) + _p(now.getDate())
           + _p(now.getHours())        + _p(now.getMinutes())   + _p(now.getSeconds());

  // Partition fields
  var shortFields    = [];
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

  textareaFields.forEach(function (f) {
    var val = (formData || {})[f.field_name];
    if (!val) return;
    t1[f.field_name] = String(val).slice(0, 80);
  });

  // Signature SVG path — cap at 400 chars to keep QR manageable
  sigFieldNames.forEach(function (name) {
    if (typeof getSignatureSVGPath === 'function') {
      var path = getSignatureSVGPath(name);
      if (path) t1.sig = path.slice(0, 400);
    }
  });

  // ── Build Tier 2 payload ────────────────────────────────────────────────
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
    _renderDualQR(container, _qrSafe(JSON.stringify(t1)), _qrSafe(JSON.stringify(t2)));
  } else {
    _renderSingleQR(container, _qrSafe(JSON.stringify(t1)));
  }
}

// ── Single QR layout ───────────────────────────────────────────────────────
function _renderSingleQR(container, text) {
  var box = document.createElement('div');
  box.className = 'qr-box';
  container.appendChild(box);
  _makeQR(box, text, 280, function (ok) {
    if (!ok) _dataQRFallback(container);
  });
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

  var box1 = document.getElementById('_qrT1');
  var box2 = document.getElementById('_qrT2');

  _makeQR(box1, text1, 240, function (ok) {
    if (!ok) _dataQRFallback(box1);
  });
  _makeQR(box2, text2, 240, function (ok) {
    if (!ok) _dataQRFallback(box2);
  });
}

// ── Shared QR renderer with retry logic ───────────────────────────────────
// Tries M correction first; if it fails (payload too large), retries with
// L correction; calls cb(true/false) to indicate success.
function _makeQR(el, text, size, cb) {
  if (!el) { cb && cb(false); return; }

  function attempt(level) {
    try {
      new QRCode(el, {
        text: text,
        width:  size,
        height: size,
        colorDark:    '#111827',
        colorLight:   '#ffffff',
        correctLevel: level,
      });
    } catch (e) { /* silent — checked below */ }

    if (el.querySelector('canvas,img')) {
      cb && cb(true);
      return true;
    }
    return false;
  }

  // Try M first, fall back to L
  if (!attempt(QRCode.CorrectLevel.M)) {
    el.innerHTML = '';
    if (!attempt(QRCode.CorrectLevel.L)) {
      cb && cb(false);
    }
  }
}

// ── Text fallback (shown if both M and L correction fail) ──────────────────
function _dataQRFallback(el) {
  el.innerHTML =
    '<div class="data-fallback">' +
      '<p class="data-fallback-title">QR too large — please ask staff to assist</p>' +
    '</div>';
}
