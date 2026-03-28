// signature.js — Signature pad integration using SignaturePad library

var _signaturePads = {};

// ── Ramer-Douglas-Peucker path simplification ──────────────────────────────
function _rdp(points, epsilon) {
  if (points.length < 3) return points;
  var x1 = points[0].x, y1 = points[0].y;
  var x2 = points[points.length - 1].x, y2 = points[points.length - 1].y;
  var lineLen = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  var maxDist = 0, maxIdx = 0;
  for (var i = 1; i < points.length - 1; i++) {
    var dist = lineLen === 0
      ? Math.sqrt((points[i].x - x1) * (points[i].x - x1) + (points[i].y - y1) * (points[i].y - y1))
      : Math.abs((y2 - y1) * points[i].x - (x2 - x1) * points[i].y + x2 * y1 - y2 * x1) / lineLen;
    if (dist > maxDist) { maxDist = dist; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    var left  = _rdp(points.slice(0, maxIdx + 1), epsilon);
    var right = _rdp(points.slice(maxIdx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

// ── Return compact SVG path string for a field's signature ─────────────────
// Uses SignaturePad's built-in toData() to get stroke points — reliable
// across all browsers/devices since SignaturePad uses pointer events.
// Normalises to a 0-99 grid and simplifies with RDP.
function getSignatureSVGPath(fieldName) {
  var pad = _signaturePads[fieldName];
  if (!pad || pad.isEmpty()) return '';

  var strokeData = pad.toData();
  if (!strokeData || strokeData.length === 0) return '';

  var canvas = document.getElementById('sigcanvas_' + fieldName);
  var w = (canvas && canvas.offsetWidth)  || 300;
  var h = (canvas && canvas.offsetHeight) || 150;
  var epsilon = Math.max(w, h) * 0.02;

  var parts = [];
  for (var s = 0; s < strokeData.length; s++) {
    // Support both SignaturePad v4 ({points:[]}) and v2/v3 (array of points)
    var raw = strokeData[s].points || strokeData[s];
    if (!raw || raw.length === 0) continue;

    var stroke = raw.map(function (pt) { return { x: pt.x, y: pt.y }; });
    var simplified = _rdp(stroke, epsilon);
    var cmds = '';
    for (var p = 0; p < simplified.length; p++) {
      var x = Math.min(99, Math.max(0, Math.round(simplified[p].x / w * 99)));
      var y = Math.min(99, Math.max(0, Math.round(simplified[p].y / h * 99)));
      cmds += (p === 0 ? 'M' : 'L') + x + ',' + y;
    }
    if (cmds) parts.push(cmds);
  }
  return parts.join(' ');
}

// ── Initialise a signature pad on a canvas element ─────────────────────────
function initSignaturePad(fieldName) {
  var canvas = document.getElementById('sigcanvas_' + fieldName);
  if (!canvas) return;

  function resizeCanvas() {
    var ratio = Math.max(window.devicePixelRatio || 1, 1);
    var w = canvas.offsetWidth;
    var h = canvas.offsetHeight;
    canvas.width  = w * ratio;
    canvas.height = h * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    if (_signaturePads[fieldName]) _signaturePads[fieldName].clear();
  }

  var pad = new SignaturePad(canvas, {
    backgroundColor: 'rgb(255,255,255)',
    penColor: '#002664',
    minWidth: 1.5,
    maxWidth: 3,
  });

  _signaturePads[fieldName] = pad;

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ── Save to hidden input on each stroke end ─────────────────────────────
  pad.addEventListener('endStroke', function () {
    var hiddenInput = document.getElementById('f_' + fieldName);
    if (hiddenInput) {
      hiddenInput.value = pad.isEmpty() ? '' : pad.toDataURL('image/png');
    }
    var errEl = document.getElementById('err_' + fieldName);
    if (errEl) errEl.textContent = '';
    var wrap = document.querySelector('[data-field="' + fieldName + '"]');
    if (wrap) wrap.classList.remove('has-error');
  });

  return pad;
}

// ── Clear a signature pad and its recorded strokes ─────────────────────────
function clearSignaturePad(fieldName) {
  if (_signaturePads[fieldName]) _signaturePads[fieldName].clear();
  var hiddenInput = document.getElementById('f_' + fieldName);
  if (hiddenInput) hiddenInput.value = '';
}

// ── Return the pad instance (or null) ─────────────────────────────────────
function getSignaturePad(fieldName) {
  return _signaturePads[fieldName] || null;
}

// ── Restore a saved signature from a base64 data URL ──────────────────────
function restoreSignature(fieldName, dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return;
  var pad = _signaturePads[fieldName];
  if (!pad) return;
  var img = new Image();
  img.onload = function () {
    pad.clear();
    var canvas = document.getElementById('sigcanvas_' + fieldName);
    if (canvas) canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = dataUrl;
  // Note: restoring from image loses stroke data — strokes stay empty
}

// ── Init all signature pads on the page ────────────────────────────────────
function initAllSignaturePads(fields) {
  fields.forEach(function (field) {
    if (field.type === 'signature') {
      setTimeout(function () { initSignaturePad(field.field_name); }, 50);
    }
  });
}
