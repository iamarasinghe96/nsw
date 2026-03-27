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

// Generate a QR code for the mobile form completion (encodes JSON form data)
// containerId: DOM element ID to render the QR into
// formData: object with field values
// formMeta: { id, name, catalogueNumber }
function generateDataQR(containerId, formData, formMeta) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const payload = {
    v: 1,
    form: formMeta || {},
    data: formData,
    ts: new Date().toISOString(),
  };

  // Signature fields are large — encode as "[Signature provided]" to keep QR small
  const cleanPayload = JSON.parse(JSON.stringify(payload));
  Object.keys(cleanPayload.data || {}).forEach(key => {
    const val = cleanPayload.data[key];
    if (typeof val === 'string' && val.startsWith('data:image')) {
      cleanPayload.data[key] = '[Signature provided]';
    }
  });

  const jsonStr = JSON.stringify(cleanPayload);

  new QRCode(container, {
    text: jsonStr,
    width: 260,
    height: 260,
    colorDark: '#002664',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.L,
  });
}
