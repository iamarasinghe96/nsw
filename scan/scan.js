(function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────────────

  const state = {
    scanning:    false,
    t1:          null,   // Tier-1 payload (always present)
    t2:          null,   // Tier-2 payload (long textarea detail)
    formFields:  null,   // final_fields.json cache
    stream:      null,   // MediaStream
    raf:         null,   // requestAnimationFrame handle
    lastRaw:     null,   // raw string of last detected QR (debounce)
    debounceTimer: null,
  };

  const BLOCK_TYPES = new Set(['heading', 'instruction', 'disclosure']);

  // ─── Boot ────────────────────────────────────────────────────────────────────

  async function init() {
    await loadFormFields();
    startCamera();
  }

  // ─── Form fields ─────────────────────────────────────────────────────────────

  async function loadFormFields() {
    try {
      const res = await fetch('../data/final_fields.json');
      if (!res.ok) throw new Error();
      state.formFields = await res.json();
    } catch {
      // Non-fatal — results will still show raw keys without labels
    }
  }

  function getFormByCat(catNum) {
    if (!state.formFields || !catNum) return null;
    const key = Object.keys(state.formFields).find(k =>
      k.startsWith(catNum + '-') || k === catNum + '.pdf'
    );
    if (!key) return null;
    return { key, fields: state.formFields[key] };
  }

  function getFormName(key) {
    return key
      .replace(/\.pdf$/i, '')
      .replace(/^\d+-/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  // ─── Camera ──────────────────────────────────────────────────────────────────

  async function startCamera() {
    setStatus('Requesting camera access…', '');

    try {
      state.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
    } catch {
      try {
        // Fallback: any camera
        state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch {
        document.getElementById('cameraError').classList.remove('hidden');
        setStatus('Camera access denied', 'error');
        return;
      }
    }

    const video = document.getElementById('video');
    video.srcObject = state.stream;
    await video.play().catch(() => {});

    state.scanning = true;
    setStatus('Scanning — point at the QR code on customer\'s phone', 'active');
    requestAnimationFrame(scanFrame);
  }

  function stopCamera() {
    state.scanning = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    if (state.stream) {
      state.stream.getTracks().forEach(t => t.stop());
      state.stream = null;
    }
  }

  // ─── QR scan loop ─────────────────────────────────────────────────────────

  function scanFrame() {
    if (!state.scanning) return;
    state.raf = requestAnimationFrame(scanFrame);

    const video  = document.getElementById('video');
    const canvas = document.getElementById('canvas');

    if (video.readyState < video.HAVE_ENOUGH_DATA) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      onRawQR(code.data);
    }
  }

  // ─── QR handling ─────────────────────────────────────────────────────────────

  function onRawQR(raw) {
    // Debounce: ignore the same QR for 2.5s so we don't process it 60x/sec
    if (raw === state.lastRaw) return;
    state.lastRaw = raw;
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => { state.lastRaw = null; }, 2500);

    // Parse JSON
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    // Must have slot and form id to be one of ours
    if (!data.slot || !data.f) return;

    beep();

    if (data.detail) {
      // ── Tier 2 ──
      if (state.t1 && state.t1.slot === data.slot) {
        // Matching T1 already received — merge and show full results
        state.t2 = data;
        flashFrame();
        renderResults(true);
      } else {
        // T2 before T1 (unusual) — store and wait
        state.t2 = data;
        setStatus('QR 2 of 2 scanned — now scan QR 1 of 2', 'waiting');
      }
    } else {
      // ── Tier 1 ──
      state.t1 = data;

      if (state.t2 && state.t2.slot === data.slot) {
        // T2 already received — merge immediately
        flashFrame();
        renderResults(true);
      } else {
        // Show T1 results; may still wait for T2
        state.t2 = null;
        flashFrame();
        renderResults(false);
      }
    }
  }

  function flashFrame() {
    const frame = document.getElementById('scanFrame');
    frame.classList.add('detected');
    setTimeout(() => frame.classList.remove('detected'), 800);
  }

  // ─── Render results ───────────────────────────────────────────────────────────

  function renderResults(hasT2) {
    const t1 = state.t1;
    const t2 = state.t2;

    // Form lookup
    const formInfo = getFormByCat(t1.f);
    const formKey  = formInfo ? formInfo.key  : null;
    const fields   = formInfo ? formInfo.fields : null;

    // Form name
    const formName = formKey ? getFormName(formKey) : ('Form ' + t1.f);
    document.getElementById('rFormName').textContent = formName;

    // Catalogue pill
    const catEl = document.getElementById('rCatNum');
    catEl.textContent = 'Cat. ' + t1.f;
    catEl.classList.remove('hidden');

    // Timestamp pill
    const slot = t1.slot || '';
    document.getElementById('rTime').textContent = formatSlot(slot);

    // T2 badge
    document.getElementById('rT2badge').classList.toggle('hidden', !hasT2);

    // Show/hide "waiting for T2" banner
    // A T2 is needed if any textarea values in T1 are exactly 80 chars (were truncated)
    const mightHaveT2 = !hasT2 && hasTruncatedTextareas(t1, fields);
    document.getElementById('t2Waiting').classList.toggle('hidden', !mightHaveT2);
    if (mightHaveT2) {
      setStatus('QR 1 of 2 scanned — scan QR 2 of 2 for full text answers', 'waiting');
    } else if (hasT2) {
      setStatus('Both QR codes scanned ✓', 'success');
    } else {
      setStatus('QR scanned ✓ — ready for next customer', 'success');
    }

    // Signature
    renderSignature(t1.sig);

    // Field data
    renderFields(t1, t2, fields);

    // Show results panel
    document.getElementById('resultsPanel').classList.remove('hidden');
  }

  function hasTruncatedTextareas(t1, fields) {
    if (!fields) return false;
    return fields
      .filter(f => !BLOCK_TYPES.has(f.type) && f.type === 'textarea')
      .some(f => {
        const v = t1[f.field_name];
        return v && String(v).length >= 80;
      });
  }

  // ─── Signature ────────────────────────────────────────────────────────────────

  function renderSignature(sigPath) {
    const card = document.getElementById('sigCard');
    const wrap = document.getElementById('sigWrap');

    if (!sigPath) {
      card.classList.add('hidden');
      return;
    }

    wrap.innerHTML = `
      <svg viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg"
           style="width:100%;height:100px;display:block;">
        <path d="${esc(sigPath)}"
              fill="none" stroke="#111827" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    card.classList.remove('hidden');
  }

  // ─── Field cards ──────────────────────────────────────────────────────────────

  function renderFields(t1, t2, fields) {
    const container = document.getElementById('fieldCards');
    container.innerHTML = '';

    // Merge T1 data with T2 detail (T2 has full text for long textareas)
    const data = Object.assign({}, t1);
    if (t2 && t2.detail) {
      Object.assign(data, t2.detail);
    }

    // Remove meta keys
    const META = new Set(['slot', 'f', 'sig', 'detail']);
    const dataKeys = Object.keys(data).filter(k => !META.has(k));

    if (!dataKeys.length) {
      container.innerHTML = '<div style="padding:20px;color:#9CA3AF;text-align:center;font-size:13px;">No field data in QR</div>';
      return;
    }

    if (fields) {
      // Render in form order using field definitions
      renderFieldsOrdered(container, data, fields, t1);
    } else {
      // No form definition — render raw key/value pairs
      renderFieldsRaw(container, data);
    }
  }

  function renderFieldsOrdered(container, data, fields, t1Raw) {
    let currentPage = null;

    fields.forEach(item => {
      // Page header rows
      if (!BLOCK_TYPES.has(item.type) && item.page !== currentPage) {
        currentPage = item.page;
        if (currentPage > 1) {
          const sep = document.createElement('div');
          sep.className = 'field-card card-page-header';
          sep.innerHTML = `<div class="fc-label">Page ${currentPage}</div>`;
          container.appendChild(sep);
        }
      }

      // Skip blocks and items with no submitted data
      if (BLOCK_TYPES.has(item.type)) return;
      if (item.type === 'signature') return; // shown separately

      const rawVal = data[item.field_name];
      if (rawVal === undefined || rawVal === null || rawVal === '') return;

      const row = document.createElement('div');
      row.className = 'field-card';
      row.innerHTML = `
        <div class="fc-label">${esc(item.label || item.field_name)}</div>
        <div class="fc-value ${valueClass(item.type, rawVal, t1Raw[item.field_name])}">${formatValue(item.type, rawVal, t1Raw[item.field_name])}</div>`;
      container.appendChild(row);
    });

    // Append any extra keys that aren't in the form definition
    const definedNames = new Set(fields.map(f => f.field_name).filter(Boolean));
    const META = new Set(['slot', 'f', 'sig', 'detail']);
    Object.keys(data).forEach(k => {
      if (META.has(k) || definedNames.has(k) || data[k] === '' || data[k] === null) return;
      const row = document.createElement('div');
      row.className = 'field-card';
      row.innerHTML = `
        <div class="fc-label">${esc(k)}</div>
        <div class="fc-value">${esc(String(data[k]))}</div>`;
      container.appendChild(row);
    });
  }

  function renderFieldsRaw(container, data) {
    const META = new Set(['slot', 'f', 'sig', 'detail']);
    Object.keys(data).forEach(k => {
      if (META.has(k)) return;
      const v = data[k];
      if (v === '' || v === null || v === undefined) return;
      const row = document.createElement('div');
      row.className = 'field-card';
      row.innerHTML = `
        <div class="fc-label">${esc(k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</div>
        <div class="fc-value">${esc(String(v))}</div>`;
      container.appendChild(row);
    });
  }

  // ─── Value formatting ─────────────────────────────────────────────────────────

  function valueClass(type, val, t1Val) {
    if (type === 'checkbox') return 'is-checked';
    if (type === 'textarea') {
      // T1 value was capped at 80 chars; if T2 has it, it's the full version
      const wasTruncated = t1Val && String(t1Val).length >= 80;
      return 'is-textarea' + (wasTruncated && val === t1Val ? ' is-truncated' : '');
    }
    if (type === 'date') return 'is-date';
    return '';
  }

  function formatValue(type, val, t1Val) {
    if (type === 'checkbox') {
      return val === '1' || val === true ? '✓ Yes' : '✗ No';
    }
    if (type === 'date') return esc(formatDate(String(val)));
    if (type === 'textarea') {
      const wasTruncated = t1Val && String(t1Val).length >= 80 && val === t1Val;
      const text = esc(String(val));
      return wasTruncated ? text + '<span style="color:#9CA3AF;font-size:11px;"> … (truncated)</span>' : text;
    }
    return esc(String(val));
  }

  function formatDate(raw) {
    // Accept YYYY-MM-DD or DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-');
      return d + '/' + m + '/' + y;
    }
    return raw;
  }

  function formatSlot(slot) {
    // slot = YYYYMMDDHHmmss
    if (slot.length < 14) return slot;
    const y  = slot.slice(0,4), mo = slot.slice(4,6), d  = slot.slice(6,8);
    const h  = slot.slice(8,10), mi = slot.slice(10,12), s = slot.slice(12,14);
    return `${d}/${mo}/${y} ${h}:${mi}:${s}`;
  }

  // ─── Clear ────────────────────────────────────────────────────────────────────

  function clearScan() {
    state.t1 = null;
    state.t2 = null;
    state.lastRaw = null;

    document.getElementById('resultsPanel').classList.add('hidden');
    document.getElementById('sigCard').classList.add('hidden');
    document.getElementById('fieldCards').innerHTML = '';
    document.getElementById('t2Waiting').classList.add('hidden');
    document.getElementById('rT2badge').classList.add('hidden');

    // Re-start scanning if camera was paused
    if (!state.scanning && state.stream) {
      state.scanning = true;
      requestAnimationFrame(scanFrame);
    }
    setStatus('Scanning — point at the QR code on customer\'s phone', 'active');
  }

  // ─── Status ───────────────────────────────────────────────────────────────────

  function setStatus(msg, type) {
    document.getElementById('statusMsg').textContent = msg;
    const dot = document.getElementById('statusDot');
    dot.className = 'status-dot' + (type ? ' ' + type : '');
  }

  // ─── Audio feedback ───────────────────────────────────────────────────────────

  function beep() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1400;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch { /* audio not critical */ }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Expose clearScan globally (called from HTML onclick) ─────────────────────

  window.clearScan  = clearScan;
  window.startCamera = startCamera;

  // ─── Boot ─────────────────────────────────────────────────────────────────────

  init();

})();
