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
    .replace(/[‘’]/g, "'")   // smart single quotes → '
    .replace(/[“”]/g, '"')   // smart double quotes → "
    .replace(/[–—]/g, '-')   // en/em dash → -
    .replace(/[…]/g, '...')       // ellipsis → ...
    .replace(/[^\x00-\x7F]/g, '?');   // all remaining non-ASCII → ?
}

// ── Data QR: multi-chunk approach ─────────────────────────────────────────
//
// Instead of truncating data to fit one QR, all field values are packed
// into 1–3 QR codes split by byte count. Each chunk payload:
//   { slot, f, n, i, ...fields }
//   slot : YYYYMMDDHHmmss — links all chunks for this submission
//   f    : form ID prefix (for auto-selection on scan page)
//   n    : total number of chunks
//   i    : 1-based index of this chunk
//
// The scan page reassembles chunks by matching on slot before rendering.
//
function generateDataQR(containerId, formData, formMeta, formFields) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  var catNum = (formMeta && formMeta.id) ? formMeta.id.split('-')[0] : '';

  var now = new Date();
  var _p  = function (n) { return String(n).padStart(2, '0'); };
  var slot = String(now.getFullYear()) + _p(now.getMonth() + 1) + _p(now.getDate())
           + _p(now.getHours())        + _p(now.getMinutes())   + _p(now.getSeconds());

  // Collect all field entries with values in form order
  var entries = [];
  (formFields || []).forEach(function (f) {
    var ft = f.field_type || f.type || '';
    if (['heading', 'instruction', 'disclosure'].indexOf(f.type) >= 0 || !f.field_name) return;

    var strVal;
    if (ft === 'signature') {
      // No artificial cap — RDP simplification in signature.js already keeps
      // paths compact, and the chunk packer handles any overflow naturally.
      if (typeof getSignatureSVGPath === 'function') {
        var path = getSignatureSVGPath(f.field_name);
        if (path) strVal = path;
      }
    } else {
      var val = (formData || {})[f.field_name];
      if (val === undefined || val === null || val === '' || val === false) return;
      strVal = (val === true) ? '1' : String(val).slice(0, 400);
    }

    if (strVal) entries.push([f.field_name, strVal]);
  });

  var chunks = _packChunks(slot, catNum, entries);
  _renderChunks(container, chunks);
}

// ── Greedy chunk packer ────────────────────────────────────────────────────
// Packs entries into 1–3 payloads, each staying under _QR_CHUNK_TARGET bytes.
// If all three chunks are full, the last value is truncated to fit rather
// than silently dropped.
var _QR_CHUNK_TARGET = 1400; // conservative (Level M capacity: 2331 bytes)
var _QR_MAX_CHUNKS   = 3;

function _packChunks(slot, catNum, entries) {
  var chunks = [[]];

  for (var ei = 0; ei < entries.length; ei++) {
    var entry = entries[ei];
    var ci    = chunks.length - 1;

    // Try appending to the current chunk
    var test = _chunkPayload(slot, catNum, 99, ci + 1, chunks[ci].concat([entry]));
    if (JSON.stringify(test).length <= _QR_CHUNK_TARGET) {
      chunks[ci].push(entry);
      continue;
    }

    // Overflow — start a new chunk if under limit
    if (chunks.length < _QR_MAX_CHUNKS) {
      // Guard: if the entry alone is too large for an empty chunk (e.g. a very
      // long signature path), truncate it to the max that fits before pushing.
      var emptyChunkLen = JSON.stringify(_chunkPayload(slot, catNum, 99, chunks.length + 1, [])).length;
      var maxEntryLen   = _QR_CHUNK_TARGET - emptyChunkLen - entry[0].length - 7;
      var safeEntry     = maxEntryLen > 3 ? [entry[0], entry[1].slice(0, maxEntryLen)] : entry;
      chunks.push([safeEntry]);
      continue;
    }

    // All chunks full: truncate the value to squeeze it in
    var baseLen  = JSON.stringify(_chunkPayload(slot, catNum, 99, ci + 1, chunks[ci])).length;
    var available = _QR_CHUNK_TARGET - baseLen - entry[0].length - 7; // ,"key":"" overhead
    if (available > 3) {
      chunks[ci].push([entry[0], entry[1].slice(0, available)]);
    }
  }

  var n = chunks.length;
  return chunks.map(function (chunk, i) {
    return _chunkPayload(slot, catNum, n, i + 1, chunk);
  });
}

function _chunkPayload(slot, catNum, n, i, entries) {
  var obj = { slot: slot, f: catNum, n: n, i: i };
  (entries || []).forEach(function (e) { obj[e[0]] = e[1]; });
  return obj;
}

// ── Render 1, 2, or 3 QR code panels ─────────────────────────────────────
// Single chunk → one large static QR.
// Multiple chunks → full-size carousel, one QR visible at a time,
// auto-advancing every 1.5 s so a staff camera can capture each one.
function _renderChunks(container, chunks) {
  var n = chunks.length;

  if (n === 1) {
    _renderSingleQR(container, _qrSafe(JSON.stringify(chunks[0])));
    return;
  }

  _renderCarousel(container, chunks);
}

// ── Carousel for multi-chunk QRs ──────────────────────────────────────────
var _carouselTimer = null;

function _renderCarousel(container, chunks) {
  var n = chunks.length;

  var html = '<div class="qr-carousel">';
  chunks.forEach(function (_, idx) {
    html +=
      '<div class="qr-carousel-slide' + (idx === 0 ? ' active' : '') + '" id="_qrSlide' + idx + '">' +
        '<span class="qr-badge' + (idx > 0 ? ' qr-badge--detail' : '') + '">Scan ' + (idx + 1) + ' of ' + n + '</span>' +
        '<div class="qr-box" id="_qrChunk' + idx + '"></div>' +
      '</div>';
  });
  // Dot indicators
  html += '<div class="qr-carousel-dots">';
  chunks.forEach(function (_, idx) {
    html += '<span class="qr-dot' + (idx === 0 ? ' active' : '') + '" id="_qrDot' + idx + '"></span>';
  });
  html += '</div>';
  // Progress bar that restarts on each switch
  html += '<div class="qr-carousel-progress"><div class="qr-carousel-bar" id="_qrBar"></div></div>';
  html += '<p class="qr-carousel-hint">Codes rotate automatically — staff will scan each one</p>';
  html += '</div>';
  container.innerHTML = html;

  // Render QR codes into each slide
  chunks.forEach(function (chunk, idx) {
    var el = document.getElementById('_qrChunk' + idx);
    _makeQR(el, _qrSafe(JSON.stringify(chunk)), 280, function (ok) {
      if (!ok) _dataQRFallback(el);
    });
  });

  // Auto-advance carousel every 1.5 s
  var current = 0;
  if (_carouselTimer) clearInterval(_carouselTimer);
  _carouselTimer = setInterval(function () {
    var prev = current;
    current  = (current + 1) % n;

    var prevSlide = document.getElementById('_qrSlide' + prev);
    var nextSlide = document.getElementById('_qrSlide' + current);
    var prevDot   = document.getElementById('_qrDot'   + prev);
    var nextDot   = document.getElementById('_qrDot'   + current);

    if (prevSlide) prevSlide.classList.remove('active');
    if (nextSlide) nextSlide.classList.add('active');
    if (prevDot)   prevDot.classList.remove('active');
    if (nextDot)   nextDot.classList.add('active');

    // Restart progress bar animation
    var bar = document.getElementById('_qrBar');
    if (bar) {
      bar.style.animation = 'none';
      bar.offsetWidth; // trigger reflow
      bar.style.animation = '';
    }
  }, 1500);
}

// Stop the carousel timer (call when leaving the QR screen)
window.stopQRCarousel = function () {
  if (_carouselTimer) { clearInterval(_carouselTimer); _carouselTimer = null; }
};

// ── Single QR layout ───────────────────────────────────────────────────────
function _renderSingleQR(container, text) {
  var box = document.createElement('div');
  box.className = 'qr-box';
  container.appendChild(box);
  _makeQR(box, text, 280, function (ok) {
    if (!ok) _dataQRFallback(container);
  });
}

// ── Shared QR renderer ────────────────────────────────────────────────────
// Picks error-correction level based on payload size so qrcodejs never
// receives data larger than the chosen version can hold (which causes it
// to silently produce an unreadable QR without throwing).
function _makeQR(el, text, size, cb) {
  if (!el) { cb && cb(false); return; }

  // Level M handles ≤2331 bytes; Level L handles ≤2953 bytes.
  // Use 1400/2200 as conservative limits to leave headroom.
  var level = text.length <= 1400 ? QRCode.CorrectLevel.M : QRCode.CorrectLevel.L;

  function attempt(lvl) {
    el.innerHTML = '';
    try {
      new QRCode(el, {
        text: text,
        width:  size,
        height: size,
        colorDark:    '#111827',
        colorLight:   '#ffffff',
        correctLevel: lvl,
      });
    } catch (e) { /* checked below */ }
    return !!el.querySelector('canvas,img');
  }

  if (!attempt(level)) {
    // Last resort: try the other level
    var fallback = level === QRCode.CorrectLevel.M
      ? QRCode.CorrectLevel.L
      : QRCode.CorrectLevel.M;
    if (!attempt(fallback)) cb && cb(false);
    else cb && cb(true);
  } else {
    cb && cb(true);
  }
}

// ── Text fallback (shown if both M and L correction fail) ──────────────────
function _dataQRFallback(el) {
  el.innerHTML =
    '<div class="data-fallback">' +
      '<p class="data-fallback-title">QR too large — please ask staff to assist</p>' +
    '</div>';
}
