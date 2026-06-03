(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────────────
  const S = {
    mode:        'webcam',   // 'webcam' | 'usb'
    scanning:    false,
    frozen:      false,
    stream:      null,
    raf:         null,
    allForms:    null,       // final_fields.json cache
    formKey:     null,       // currently selected form key
    chunks:      {},         // slot → { n, received: { i: payload } }
    activeSlot:  null,       // slot of the current submission
    lastRaw:     null,
    debounce:    null,
  };

  const BLOCK = new Set(['heading', 'instruction', 'disclosure']);

  // ── Boot ─────────────────────────────────────────────────────────────
  async function init() {
    await loadForms();
    bindEvents();
    setStatus('Select a scan mode above', '');
  }

  async function loadForms() {
    try {
      const r = await fetch('../data/final_fields.json');
      S.allForms = await r.json();
      populateAppType();
    } catch { toast('Could not load form definitions', 'error'); }
  }

  function populateAppType() {
    const sel = document.getElementById('app-type');
    Object.keys(S.allForms).sort().forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = fmtKey(key);
      sel.appendChild(opt);
    });
  }

  // ── Mode toggle ───────────────────────────────────────────────────────
  window.setMode = function (mode) {
    S.mode = mode;
    stopCamera();
    document.getElementById('webcam-panel').classList.toggle('hidden', mode !== 'webcam');
    document.getElementById('usb-panel').classList.toggle('hidden', mode !== 'usb');
    document.getElementById('upload-panel').classList.toggle('hidden', mode !== 'upload');
    ['webcam','usb','upload'].forEach(m =>
      document.getElementById('tab-'+m).classList.toggle('active', m === mode)
    );
    if (mode === 'usb') {
      document.getElementById('usb-input').focus();
      setStatus('Ready — scan or paste QR data', 'active');
    } else if (mode === 'upload') {
      setStatus('Upload or drag a QR code image to decode', '');
    } else {
      setStatus('Click Start Scan to activate camera', '');
    }
  };

  // ── Camera ────────────────────────────────────────────────────────────
  window.startCamera = async function () {
    S.frozen = false;
    document.getElementById('cameraOffMsg').classList.add('hidden');
    setStatus('Requesting camera…', '');
    try {
      S.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
    } catch {
      try { S.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
      catch {
        setStatus('Camera access denied', 'error');
        document.getElementById('cameraOffMsg').classList.remove('hidden');
        return;
      }
    }
    const vid = document.getElementById('video');
    vid.srcObject = S.stream;
    await vid.play().catch(() => {});
    S.scanning = true;
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('btn-stop').style.display  = '';
    document.getElementById('btn-freeze').disabled = false;
    setStatus('Scanning — point at QR on customer\'s phone', 'active');
    S.raf = requestAnimationFrame(scanFrame);
  };

  window.stopCamera = function () {
    S.scanning = false;
    if (S.raf) cancelAnimationFrame(S.raf);
    if (S.stream) { S.stream.getTracks().forEach(t => t.stop()); S.stream = null; }
    document.getElementById('btn-start').style.display = '';
    document.getElementById('btn-stop').style.display  = 'none';
    document.getElementById('btn-freeze').disabled = true;
    document.getElementById('cameraOffMsg').classList.remove('hidden');
    setStatus('Camera stopped', '');
  };

  window.freezeAndScan = function () {
    const vid = document.getElementById('video');
    const cvs = document.getElementById('canvas');
    cvs.width = vid.videoWidth; cvs.height = vid.videoHeight;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(vid, 0, 0, cvs.width, cvs.height);
    const img  = ctx.getImageData(0, 0, cvs.width, cvs.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code) { onQRDetected(code.data); }
    else       { setStatus('No QR found in frame — try again', 'error'); }
  };

  // ── QR scan loop ──────────────────────────────────────────────────────
  function scanFrame() {
    if (!S.scanning) return;
    S.raf = requestAnimationFrame(scanFrame);
    const vid = document.getElementById('video');
    if (vid.readyState < vid.HAVE_ENOUGH_DATA) return;
    const cvs = document.getElementById('canvas');
    cvs.width = vid.videoWidth; cvs.height = vid.videoHeight;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(vid, 0, 0, cvs.width, cvs.height);
    const img  = ctx.getImageData(0, 0, cvs.width, cvs.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code && code.data) onQRDetected(code.data);
  }

  // ── QR detection ──────────────────────────────────────────────────────
  function onQRDetected(raw) {
    if (raw === S.lastRaw) return;
    S.lastRaw = raw;
    clearTimeout(S.debounce);
    S.debounce = setTimeout(() => { S.lastRaw = null; }, 2500);

    let data;
    try { data = JSON.parse(raw); } catch { return; }
    if (!data.slot || !data.f) return;

    beep();
    flashFrame();

    const slot = data.slot;
    const n    = data.n || 1;
    const idx  = data.i || 1;

    // Initialise or continue accumulating chunks for this slot
    if (!S.chunks[slot] || S.chunks[slot].n !== n) {
      S.chunks[slot] = { n, received: {} };
    }
    S.chunks[slot].received[idx] = data;
    S.activeSlot = slot;

    const received = Object.keys(S.chunks[slot].received).length;

    // Auto-fill time slot on the very first QR of a new submission
    if (received === 1) {
      const slotEl = document.getElementById('time-slot');
      if (!slotEl.value) {
        const now = new Date();
        slotEl.value = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
      }

      // Auto-select form type
      const matchKey = Object.keys(S.allForms || {}).find(k =>
        k.startsWith(data.f + '-') || k === data.f + '.pdf'
      );
      if (matchKey) {
        document.getElementById('app-type').value = matchKey;
        S.formKey = matchKey;
      }
    }

    refreshFields();

    if (received < n) {
      setStatus('QR ' + received + ' of ' + n + ' scanned ✓ — scan the next one', 'waiting');
    } else {
      const plural = n > 1 ? 'All ' + n + ' QR codes' : 'QR';
      setStatus(plural + ' scanned ✓ — review and edit below', 'success');
    }
  }

  function flashFrame() {
    const fr = document.getElementById('scanFrame');
    fr.classList.add('detected');
    setTimeout(() => fr.classList.remove('detected'), 800);
  }

  // ── Form type change (manual or auto) ────────────────────────────────
  window.onFormTypeChange = function (key) {
    S.formKey = key || null;
    refreshFields();
    setStatus(key ? 'Form selected — fill in the details below' : 'Select a form type', key ? '' : '');
  };

  // ── Render editable fields ────────────────────────────────────────────
  function refreshFields() {
    const key    = S.formKey;
    const fields = key && S.allForms ? (S.allForms[key] || []) : [];
    const qr     = mergedData();

    const regular = fields.filter(f => !BLOCK.has(f.type) && f.type !== 'signature' && !f.office_only);
    const sigs    = fields.filter(f => f.type === 'signature');
    const office  = fields.filter(f => f.office_only);

    const dynEl  = document.getElementById('dynamic-fields');
    const offEl  = document.getElementById('office-fields');
    const offSec = document.getElementById('office-section');

    dynEl.innerHTML  = regular.length ? renderFieldsGrid(regular, qr) + renderSigs(sigs, qr) : '';
    offEl.innerHTML  = office.length  ? renderFieldsGrid(office, {})  : '';
    offSec.classList.toggle('hidden', !office.length);

    // Show Copy Names if name fields present
    const hasNames = regular.some(f => /given|first|surname|last|family/i.test(f.field_name));
    document.getElementById('btn-copy-names').classList.toggle('hidden', !hasNames);

    updatePreview();
  }

  function renderFieldsGrid(fields, qr) {
    let html = '<div class="fields-grid">';
    fields.forEach(f => {
      const val = qr[f.field_name] ?? '';
      // Radio/checkbox with long options must be full-width or they get cramped.
      // Textareas are always full-width.
      const wide = f.type === 'textarea'
                || f.type === 'radio'
                || f.type === 'checkbox'
                || (f.options && f.options.length > 2);
      html += `<div class="form-group${wide ? ' full-width' : ''}">
        <label class="field-label">${esc(f.label)}${f.required ? '<span class="req"> *</span>' : ''}</label>
        ${renderInput(f, val)}
      </div>`;
    });
    html += '</div>';
    return html;
  }

  function renderSigs(sigs, qr) {
    if (!sigs.length) return '';
    let html = '<div style="margin-top:14px"><div class="fields-section-title">Signatures</div><div class="fields-grid">';
    sigs.forEach(f => {
      const path = qr[f.field_name] || qr.sig || '';
      // Paths are in a 0-99 normalised square space (signature.js).
      // Display at the 480:180 = 8:3 kiosk aspect ratio using preserveAspectRatio="none".
      // smoothSigPath() replaces straight L segments with quadratic bezier curves so the
      // reconstructed path looks natural instead of angular.
      html += `<div class="form-group full-width">
        <label class="field-label">${esc(f.label)}</label>
        ${path
          ? `<div class="sig-preview"><svg viewBox="0 0 99 99" preserveAspectRatio="none" style="width:240px;height:90px;display:block"><path d="${esc(smoothSigPath(path))}" fill="none" stroke="#111827" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`
          : '<span style="font-size:12px;color:#9CA3AF">No signature captured</span>'}
      </div>`;
    });
    html += '</div></div>';
    return html;
  }

  // Convert an M/L-only SVG path to one using quadratic bezier curves so that
  // the signature looks smooth rather than angular after RDP simplification.
  function smoothSigPath(d) {
    if (!d) return d;
    const strokes = [];
    let cur = null;
    d.replace(/([ML])(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, cmd, x, y) => {
      if (cmd === 'M') { if (cur) strokes.push(cur); cur = [{ x: +x, y: +y }]; }
      else if (cur)    { cur.push({ x: +x, y: +y }); }
    });
    if (cur) strokes.push(cur);

    return strokes.map(pts => {
      if (pts.length < 2) return `M${pts[0].x},${pts[0].y}`;
      let s = `M${pts[0].x},${pts[0].y}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = Math.round((pts[i].x + pts[i + 1].x) / 2);
        const my = Math.round((pts[i].y + pts[i + 1].y) / 2);
        s += ` Q${pts[i].x},${pts[i].y} ${mx},${my}`;
      }
      s += ` L${pts[pts.length - 1].x},${pts[pts.length - 1].y}`;
      return s;
    }).join(' ');
  }

  function renderInput(f, val) {
    const id = 'fi_' + f.field_name;
    const onch = 'updatePreview()';
    switch (f.type) {
      case 'text':
      case 'number':
        return `<input type="text" id="${id}" class="field-input" value="${esc(String(val))}" oninput="${onch}">`;
      case 'date':
        return `<input type="text" id="${id}" class="field-input" value="${esc(fmtDate(val))}" placeholder="DD/MM/YYYY" oninput="${onch}">`;
      case 'textarea':
        return `<textarea id="${id}" class="field-input" oninput="${onch}">${esc(String(val))}</textarea>`;
      case 'checkbox':
        return `<div class="checkbox-group"><label class="checkbox-opt"><input type="checkbox" id="${id}" ${val==='1'||val===true?'checked':''} onchange="${onch}"> Yes</label></div>`;
      case 'radio':
        return '<div class="radio-group">' +
          (f.options || []).map(o =>
            `<label class="radio-opt"><input type="radio" name="${id}" value="${esc(o)}" ${val===o?'checked':''} onchange="${onch}"> ${esc(o)}</label>`
          ).join('') + '</div>';
      case 'dropdown':
        return `<select id="${id}" class="field-input" onchange="${onch}">
          <option value="">— Select —</option>
          ${(f.options||[]).map(o=>`<option value="${esc(o)}" ${val===o?'selected':''}>${esc(o)}</option>`).join('')}
        </select>`;
      default:
        return `<input type="text" id="${id}" class="field-input" value="${esc(String(val))}" oninput="${onch}">`;
    }
  }

  // ── Collect values from rendered inputs ───────────────────────────────
  function collectValues() {
    const out = {};
    document.querySelectorAll('[id^="fi_"]').forEach(el => {
      const name = el.id.replace('fi_', '');
      if (el.type === 'checkbox') out[name] = el.checked ? 'Yes' : '';
      else if (el.type === 'radio') { if (el.checked) out[name] = el.value; }
      else out[name] = el.value || '';
    });
    return out;
  }

  // ── Preview update ────────────────────────────────────────────────────
  window.updatePreview = function () {
    const vals = collectValues();
    const parts = Object.values(vals).filter(Boolean).slice(0, 5);
    document.getElementById('previewText').textContent =
      parts.length ? parts.join(' · ') : 'Fill in the form to preview…';
  };

  // ── Copy to clipboard ─────────────────────────────────────────────────
  window.copyToClipboard = function () {
    const key    = S.formKey;
    const fields = key && S.allForms ? (S.allForms[key] || []) : [];
    const vals   = collectValues();
    const slot   = document.getElementById('time-slot').value;
    const formName = key ? fmtKey(key) : 'Unknown Form';

    let lines = [];
    lines.push('Application Type\t' + formName);
    if (slot) lines.push('Time Slot\t' + slot);
    lines.push('');

    const regular = fields.filter(f => !BLOCK.has(f.type) && f.type !== 'signature' && !f.office_only);
    const office  = fields.filter(f => f.office_only);

    regular.forEach(f => {
      const v = vals[f.field_name];
      if (v !== undefined) lines.push(f.label + '\t' + (v || ''));
    });

    if (office.length) {
      lines.push('');
      lines.push('--- OFFICE USE ONLY ---');
      office.forEach(f => {
        const v = vals[f.field_name];
        lines.push(f.label + '\t' + (v || ''));
      });
    }

    const text = lines.join('\n');
    navigator.clipboard.writeText(text)
      .then(() => toast('Copied to clipboard ✓', 'success'))
      .catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast('Copied to clipboard ✓', 'success');
      });
  };

  // ── Copy names only ───────────────────────────────────────────────────
  window.copyNames = function () {
    const vals  = collectValues();
    const names = Object.entries(vals)
      .filter(([k]) => /given|first|surname|last|family|middle/i.test(k))
      .map(([, v]) => v).filter(Boolean).join(' ');
    if (!names) { toast('No name fields found', 'error'); return; }
    navigator.clipboard.writeText(names)
      .then(() => toast('Names copied ✓', 'success'))
      .catch(() => toast('Copy failed', 'error'));
  };

  // ── Clear ─────────────────────────────────────────────────────────────
  window.clearAll = function () {
    S.chunks = {}; S.activeSlot = null; S.formKey = null;
    document.getElementById('app-type').value = '';
    document.getElementById('time-slot').value = '';
    document.getElementById('dynamic-fields').innerHTML = '';
    document.getElementById('office-fields').innerHTML  = '';
    document.getElementById('office-section').classList.add('hidden');
    document.getElementById('btn-copy-names').classList.add('hidden');
    document.getElementById('previewText').textContent = 'Fill in the form to preview…';
    setStatus('Cleared — ready for next customer', '');
  };

  // ── Helpers ───────────────────────────────────────────────────────────
  function mergedData() {
    const slot  = S.activeSlot;
    const state = slot && S.chunks[slot];
    if (!state) return {};
    const d = {};
    for (let i = 1; i <= state.n; i++) {
      const chunk = state.received[i];
      if (!chunk) continue;
      Object.keys(chunk).forEach(k => {
        if (k !== 'slot' && k !== 'f' && k !== 'n' && k !== 'i') d[k] = chunk[k];
      });
    }
    return d;
  }

  function fmtKey(key) {
    return key.replace(/\.pdf$/i,'').replace(/^\d+-/,'')
      .replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function fmtDate(val) {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y,m,d] = val.split('-'); return d+'/'+m+'/'+y;
    }
    return String(val);
  }

  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function setStatus(msg, type) {
    document.getElementById('statusMsg').textContent = msg;
    document.getElementById('statusDot').className = 'status-dot' + (type ? ' '+type : '');
  }

  function beep() {
    try {
      const ac = new (window.AudioContext||window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = 1400; o.type = 'sine';
      g.gain.setValueAtTime(0.25, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+0.12);
      o.start(); o.stop(ac.currentTime+0.12);
    } catch {}
  }

  function toast(msg, type='') {
    document.querySelector('.toast')?.remove();
    const el = Object.assign(document.createElement('div'), { className:'toast '+type, textContent:msg });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ── Image upload / paste decoding ────────────────────────────────────
  function decodeImageEl(imgEl) {
    const nw  = imgEl.naturalWidth  || imgEl.width  || 300;
    const nh  = imgEl.naturalHeight || imgEl.height || 300;
    const cvs = document.getElementById('upload-canvas');
    const ctx = cvs.getContext('2d');

    // Scale up small images so jsQR has ≥1200px on the short side to work with.
    // Dense QR codes (version 25+) need ~10px per module; a 300px image has only ~3px.
    const minDim = Math.min(nw, nh);
    const scale  = minDim < 1200 ? Math.min(6, Math.ceil(1200 / minDim)) : 1;
    cvs.width  = nw * scale;
    cvs.height = nh * scale;

    function scanWith(smooth) {
      ctx.imageSmoothingEnabled = smooth;
      if (smooth) ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgEl, 0, 0, cvs.width, cvs.height);
      const d = ctx.getImageData(0, 0, cvs.width, cvs.height);
      return jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' });
    }

    // Try smooth first (better for photos), then sharp/nearest-neighbour (better
    // for digital screenshots of QR codes where pixels should stay crisp).
    const code = scanWith(true) || scanWith(false);

    const wrap  = document.getElementById('upload-preview-wrap');
    const badge = wrap.querySelector('.upload-result-badge') || document.createElement('div');
    if (!badge.parentNode) wrap.appendChild(badge);

    if (code) {
      badge.className  = 'upload-result-badge ok';
      badge.textContent = '✓ QR decoded — ' + code.data.length + ' chars';
      onQRDetected(code.data);
    } else {
      badge.className  = 'upload-result-badge error';
      badge.textContent = '✗ No QR found — try a higher-resolution image';
      setStatus('Could not decode — try a clearer/larger image', 'error');
    }
  }

  function loadImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        // Show preview
        const zone = document.getElementById('uploadDropZone');
        const wrap = document.getElementById('upload-preview-wrap');
        // Remove old preview img
        wrap.querySelector('.upload-img-preview')?.remove();
        const prev = Object.assign(document.createElement('img'), {
          src: ev.target.result, className: 'upload-img-preview'
        });
        wrap.insertBefore(prev, wrap.firstChild);
        wrap.querySelector('.upload-icon')?.remove();
        wrap.querySelectorAll('.upload-hint').forEach(el => el.remove());
        decodeImageEl(img);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  window.onImageFile = function (input) { loadImageFile(input.files[0]); };
  window.onImageDrop = function (e) {
    e.preventDefault();
    document.getElementById('uploadDropZone').classList.remove('drag-over');
    loadImageFile(e.dataTransfer.files[0]);
  };

  // ── USB scanner input ─────────────────────────────────────────────────
  function bindEvents() {
    const usbIn = document.getElementById('usb-input');
    usbIn.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const raw = usbIn.value.trim();
        usbIn.value = '';
        if (raw) onQRDetected(raw);
      }
    });
    // Keep USB input focused in USB mode
    usbIn.addEventListener('blur', () => {
      if (S.mode === 'usb') setTimeout(() => usbIn.focus(), 100);
    });

    // Global Ctrl+V paste → decode image from clipboard in upload mode
    document.addEventListener('paste', e => {
      if (S.mode !== 'upload') return;
      const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
      if (item) loadImageFile(item.getAsFile());
    });

    // Drag-over highlighting
    const dz = document.getElementById('uploadDropZone');
    dz.addEventListener('dragover',  () => dz.classList.add('drag-over'));
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  }

  init();
})();
