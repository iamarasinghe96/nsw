// signature.js — Signature pad integration using SignaturePad library

var _signaturePads = {};
var _strokeData    = {}; // persists strokes across page re-renders
var _sigPaths      = {}; // pre-computed SVG paths from mobile overlay

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

// ── Compute normalised SVG path from stroke data ───────────────────────────
function _computeSVGPath(strokeData, w, h) {
  if (!strokeData || strokeData.length === 0) return '';
  var epsilon = Math.max(w, h) * 0.02;
  var parts = [];
  for (var s = 0; s < strokeData.length; s++) {
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

// ── Return compact SVG path string for a field's signature ─────────────────
function getSignatureSVGPath(fieldName) {
  // Mobile overlay stores a pre-computed path with correct dimensions
  if (_sigPaths[fieldName]) return _sigPaths[fieldName];

  var pad = _signaturePads[fieldName];
  if (!pad || pad.isEmpty()) return '';
  var strokeData = pad.toData();
  if (!strokeData || strokeData.length === 0) return '';

  var canvas = document.getElementById('sigcanvas_' + fieldName);
  var w = (canvas && canvas.offsetWidth)  || 300;
  var h = (canvas && canvas.offsetHeight) || 150;
  return _computeSVGPath(strokeData, w, h);
}

// ── Returns true if stroke data is available (not just a restored image) ───
function hasSignatureStrokes(fieldName) {
  return !!_sigPaths[fieldName] ||
         !!(_strokeData[fieldName] && _strokeData[fieldName].length > 0);
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
    var pad = _signaturePads[fieldName];
    if (pad) {
      pad.clear();
      // Restore saved strokes so signature survives page re-renders
      if (_strokeData[fieldName] && _strokeData[fieldName].length > 0) {
        pad.fromData(_strokeData[fieldName]);
      }
    }
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

  pad.addEventListener('endStroke', function () {
    // Save stroke data so navigation back/forward preserves the signature
    _strokeData[fieldName] = pad.toData();
    // Desktop stroke clears any mobile-overlay path (desktop takes precedence)
    delete _sigPaths[fieldName];

    var hiddenInput = document.getElementById('f_' + fieldName);
    if (hiddenInput) {
      hiddenInput.value = pad.isEmpty() ? '' : pad.toDataURL('image/png');
    }
    var errEl = document.getElementById('err_' + fieldName);
    if (errEl) errEl.textContent = '';
    var wrap = document.querySelector('[data-field="' + fieldName + '"]');
    if (wrap) wrap.classList.remove('has-error');
  });

  // On mobile show a "Sign" button that opens the fullscreen overlay
  if (window.innerWidth < 640) {
    _attachMobileSignButton(fieldName, canvas);
  }

  return pad;
}

// ── Attach mobile "Tap to Sign" button beside the canvas ──────────────────
function _attachMobileSignButton(fieldName, canvas) {
  var wrap = document.getElementById('sigwrap_' + fieldName);
  if (!wrap || wrap.querySelector('.sig-mobile-btn')) return;

  // Hide the desktop canvas on mobile; show Sign button instead
  canvas.style.display = 'none';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sig-mobile-btn';

  // Show thumbnail preview if there's already a signature
  function updateBtn() {
    if (hasSignatureStrokes(fieldName)) {
      var hiddenInput = document.getElementById('f_' + fieldName);
      var png = hiddenInput && hiddenInput.value;
      btn.innerHTML = png
        ? '<img src="' + png + '" class="sig-mobile-thumb" alt="Signature"><span class="sig-mobile-relabel">Tap to re-sign</span>'
        : '<span class="sig-mobile-label">✎ Tap to Re-sign</span>';
    } else {
      btn.innerHTML = '<span class="sig-mobile-label">✎ Tap to Sign</span>';
    }
  }
  updateBtn();

  btn.addEventListener('click', function () {
    openMobileSignature(fieldName, function () { updateBtn(); });
  });
  wrap.insertBefore(btn, wrap.querySelector('.btn-clear-sig'));

  // Override clear to also update button
  var origClear = wrap.querySelector('.btn-clear-sig');
  if (origClear) {
    origClear.addEventListener('click', function () { updateBtn(); });
  }
}

// ── Open fullscreen landscape overlay for mobile signing ──────────────────
function openMobileSignature(fieldName, onDone) {
  var existing = document.getElementById('_sigOverlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = '_sigOverlay';
  overlay.className = 'sig-overlay';
  overlay.innerHTML =
    '<div class="sig-overlay-bar">' +
      '<span class="sig-overlay-title">Sign below</span>' +
      '<div class="sig-overlay-actions">' +
        '<button class="sig-overlay-clear">Clear</button>' +
        '<button class="sig-overlay-done">Done ✓</button>' +
        '<button class="sig-overlay-cancel">✕</button>' +
      '</div>' +
    '</div>' +
    '<canvas class="sig-overlay-canvas"></canvas>';
  document.body.appendChild(overlay);

  // Try to lock landscape orientation for a better signing experience
  (function tryLandscape() {
    try {
      var p = document.documentElement.requestFullscreen
           && document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      if (p && p.then) p.then(function () {
        screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(function(){});
      }).catch(function(){});
    } catch (e) {}
  })();

  var cvs = overlay.querySelector('.sig-overlay-canvas');

  function sizeCanvas() {
    var ratio = window.devicePixelRatio || 1;
    var w = cvs.offsetWidth;
    var h = cvs.offsetHeight;
    cvs.width  = w * ratio;
    cvs.height = h * ratio;
    cvs.getContext('2d').scale(ratio, ratio);
    if (overlayPad) {
      overlayPad.clear();
      if (_strokeData[fieldName] && _strokeData[fieldName].length > 0) {
        overlayPad.fromData(_strokeData[fieldName]);
      }
    }
  }

  var overlayPad = new SignaturePad(cvs, {
    backgroundColor: 'rgb(255,255,255)',
    penColor: '#002664',
    minWidth: 2,
    maxWidth: 4,
  });

  // Let layout settle before sizing so offsetWidth/Height are correct
  setTimeout(function () {
    sizeCanvas();
    // Restore any existing signature
    if (_strokeData[fieldName] && _strokeData[fieldName].length > 0) {
      overlayPad.fromData(_strokeData[fieldName]);
    }
  }, 50);

  window.addEventListener('resize', sizeCanvas);

  overlay.querySelector('.sig-overlay-clear').addEventListener('click', function () {
    overlayPad.clear();
  });

  function closeOverlay() {
    window.removeEventListener('resize', sizeCanvas);
    overlay.remove();
    try {
      if (document.fullscreenElement) {
        screen.orientation && screen.orientation.unlock && screen.orientation.unlock();
        document.exitFullscreen && document.exitFullscreen();
      }
    } catch (e) {}
  }

  overlay.querySelector('.sig-overlay-cancel').addEventListener('click', closeOverlay);

  overlay.querySelector('.sig-overlay-done').addEventListener('click', function () {
    if (!overlayPad.isEmpty()) {
      var w = cvs.offsetWidth;
      var h = cvs.offsetHeight;
      var strokes = overlayPad.toData();

      // Save stroke data and pre-compute SVG path using overlay canvas dimensions
      _strokeData[fieldName] = strokes;
      _sigPaths[fieldName]   = _computeSVGPath(strokes, w, h);

      // Save PNG to hidden input
      var hiddenInput = document.getElementById('f_' + fieldName);
      if (hiddenInput) hiddenInput.value = overlayPad.toDataURL('image/png');

      // Draw thumbnail on the main (hidden) canvas so restoreSignature still works
      var mainCanvas = document.getElementById('sigcanvas_' + fieldName);
      if (mainCanvas) {
        var img = new Image();
        img.onload = function () {
          mainCanvas.getContext('2d').drawImage(img, 0, 0, mainCanvas.offsetWidth, mainCanvas.offsetHeight);
        };
        img.src = overlayPad.toDataURL('image/png');
      }

      // Clear validation errors
      var errEl = document.getElementById('err_' + fieldName);
      if (errEl) errEl.textContent = '';
      var wrapEl = document.querySelector('[data-field="' + fieldName + '"]');
      if (wrapEl) wrapEl.classList.remove('has-error');
    }
    closeOverlay();
    if (typeof onDone === 'function') onDone();
  });
}

// ── Clear a signature pad and its recorded strokes ─────────────────────────
function clearSignaturePad(fieldName) {
  if (_signaturePads[fieldName]) _signaturePads[fieldName].clear();
  delete _strokeData[fieldName];
  delete _sigPaths[fieldName];
  var hiddenInput = document.getElementById('f_' + fieldName);
  if (hiddenInput) hiddenInput.value = '';
}

// ── Return the pad instance (or null) ─────────────────────────────────────
function getSignaturePad(fieldName) {
  return _signaturePads[fieldName] || null;
}

// ── Restore a saved signature from a base64 data URL ──────────────────────
// Used as a visual fallback when no stroke data is available.
function restoreSignature(fieldName, dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return;
  var pad = _signaturePads[fieldName];
  if (!pad) return;
  var img = new Image();
  img.onload = function () {
    pad.clear();
    var canvas = document.getElementById('sigcanvas_' + fieldName);
    if (canvas) {
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
    }
  };
  img.src = dataUrl;
}

// ── Init all signature pads on the page ────────────────────────────────────
function initAllSignaturePads(fields) {
  fields.forEach(function (field) {
    if (field.type === 'signature') {
      setTimeout(function () { initSignaturePad(field.field_name); }, 50);
    }
  });
}
