// kiosk.js — Navigation, idle timeout, touch ripple, swipe detection

// --- Idle Timer ---
let _idleTimer = null;

function setupIdleTimer(timeoutMs, onTimeout) {
  const events = ['touchstart', 'touchmove', 'touchend', 'click', 'keydown', 'mousemove'];
  function reset() {
    clearTimeout(_idleTimer);
    _idleTimer = setTimeout(onTimeout, timeoutMs);
  }
  events.forEach(ev => document.addEventListener(ev, reset, { passive: true }));
  reset();
}

function clearIdleTimer() {
  clearTimeout(_idleTimer);
}

// --- Navigation ---

// Animates header up + content fade, then navigates
function navigateTo(url) {
  var header = document.querySelector('.kiosk-header');
  var screen = document.querySelector('.screen') || document.querySelector('main');
  if (header) header.classList.add('header-exit');
  if (screen) screen.classList.add('page-exit');
  setTimeout(function() { window.location.href = url; }, 310);
}

// Restore page cleanly when returning via back button (bfcache restore)
window.addEventListener('pageshow', function(e) {
  if (e.persisted) {
    var header = document.querySelector('.kiosk-header');
    var screen = document.querySelector('.screen');
    if (header) {
      // Freeze transitions FIRST so removing the exit class snaps instantly
      // instead of animating back from translateY(-130%) — which looks like a drop-in
      header.style.transition = 'none';
      header.style.transform = '';
      header.style.opacity = '';
      header.classList.remove('header-exit');
      header.offsetWidth; // force reflow so the above takes effect
      header.style.transition = '';
    }
    var content = document.querySelector('.screen') || document.querySelector('main');
    if (content) {
      content.style.transition = 'none';
      content.classList.remove('page-exit');
      content.style.cssText = '';
    }
    // Re-trigger back button fade-in
    var back = document.querySelector('.btn-back');
    if (back) {
      back.classList.remove('fading-out');
      back.style.animation = 'none';
      back.offsetWidth; // reflow
      back.style.animation = '';
    }
  }
});

function goHome() {
  window.location.href = 'index.html';
}

function goBack() {
  var back = document.querySelector('.btn-back');
  if (back) {
    back.classList.add('fading-out');
    setTimeout(function() {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        goHome();
      }
    }, 230);
  } else {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      goHome();
    }
  }
}

// --- URL params helper ---
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// --- Touch ripple effect ---
function addRipple(el) {
  el.style.position = 'relative';
  el.style.overflow = 'hidden';
  el.addEventListener('click', function(e) {
    const existing = this.querySelectorAll('.ripple');
    existing.forEach(r => r.remove());
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.4);
      width: ${size}px;
      height: ${size}px;
      left: ${(e.clientX - rect.left) - size/2}px;
      top: ${(e.clientY - rect.top) - size/2}px;
      animation: rippleAnim 0.6s linear;
      pointer-events: none;
    `;
    this.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

function applyRipples() {
  document.querySelectorAll('.btn-nav, .browse-btn, .start-btn, .frequent-card').forEach(addRipple);
}

// --- Swipe-up detection (for welcome screen) ---
function setupSwipeUp(callback) {
  let startY = 0;
  document.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    const delta = startY - e.changedTouches[0].clientY;
    if (delta > 60) callback();
  }, { passive: true });
}

// --- Frequently used forms (localStorage) ---
function incrementFormAccess(formId) {
  const data = JSON.parse(localStorage.getItem('nsw_form_access') || '{}');
  data[formId] = (data[formId] || 0) + 1;
  localStorage.setItem('nsw_form_access', JSON.stringify(data));
}

function getTopForms(n) {
  const data = JSON.parse(localStorage.getItem('nsw_form_access') || '{}');
  return Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([formId]) => formId);
}

// --- Form name helpers ---
function getFormDisplayName(filename) {
  let name = filename.replace(/\.pdf$/i, '');
  name = name.replace(/^\d+[-_]/, '');
  name = name.replace(/[-_]/g, ' ');
  return name.replace(/\b\w/g, c => c.toUpperCase());
}

function getCatalogueNumber(filename) {
  const match = filename.match(/^(\d+)/);
  return match ? match[1] : '';
}

// --- Build form QR URL ---
function buildFormUrl(formId) {
  let base;
  if (typeof CONFIG !== 'undefined' && CONFIG.domain) {
    // Explicit domain set in config (recommended for production)
    base = CONFIG.domain.replace(/\/$/, '');
  } else {
    // Auto-detect: use directory of current page, not just origin.
    // e.g. https://host/nsw/qr.html  →  https://host/nsw
    const href = window.location.href.split('?')[0]; // strip query
    base = href.substring(0, href.lastIndexOf('/'));
  }
  const formPath = (typeof CONFIG !== 'undefined' && CONFIG.formPath)
    ? CONFIG.formPath
    : 'form.html';
  return `${base}/${formPath}?id=${encodeURIComponent(formId)}`;
}

// --- Load JSON data helper ---
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

// --- Search filter helper ---
function normalise(str) {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, '');
}
