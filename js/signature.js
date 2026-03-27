// signature.js — Signature pad integration using SignaturePad library

var _signaturePads = {};

// Initialise a signature pad on a canvas element
// fieldName: the form field_name (used to build canvas ID and hidden input ID)
function initSignaturePad(fieldName) {
  const canvas = document.getElementById('sigcanvas_' + fieldName);
  if (!canvas) return;

  function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    if (_signaturePads[fieldName]) _signaturePads[fieldName].clear();
  }

  const pad = new SignaturePad(canvas, {
    backgroundColor: 'rgb(255,255,255)',
    penColor: '#002664',
    minWidth: 1.5,
    maxWidth: 3,
  });

  _signaturePads[fieldName] = pad;

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Save to hidden input on each stroke end
  pad.addEventListener('endStroke', function() {
    const hiddenInput = document.getElementById('f_' + fieldName);
    if (hiddenInput) {
      hiddenInput.value = pad.isEmpty() ? '' : pad.toDataURL('image/png');
    }
    // Remove error state if now signed
    const errEl = document.getElementById('err_' + fieldName);
    if (errEl) errEl.textContent = '';
    const wrap = document.querySelector(`[data-field="${fieldName}"]`);
    if (wrap) wrap.classList.remove('has-error');
  });

  return pad;
}

// Clear a signature pad and its hidden input
function clearSignaturePad(fieldName) {
  if (_signaturePads[fieldName]) {
    _signaturePads[fieldName].clear();
  }
  const hiddenInput = document.getElementById('f_' + fieldName);
  if (hiddenInput) hiddenInput.value = '';
}

// Returns the signature pad instance for a field (or null)
function getSignaturePad(fieldName) {
  return _signaturePads[fieldName] || null;
}

// Restore a previously saved signature (base64 data URL) into the pad
function restoreSignature(fieldName, dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return;
  const pad = _signaturePads[fieldName];
  if (!pad) return;
  const img = new Image();
  img.onload = function() {
    pad.clear();
    const canvas = document.getElementById('sigcanvas_' + fieldName);
    if (canvas) {
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  };
  img.src = dataUrl;
}

// Initialise all signature pads on the page (call after rendering fields)
function initAllSignaturePads(fields) {
  fields.forEach(function(field) {
    if (field.type === 'signature') {
      setTimeout(function() { initSignaturePad(field.field_name); }, 50);
    }
  });
}
