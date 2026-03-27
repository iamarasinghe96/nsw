// config.js — Service NSW Kiosk Configuration
// Modify ONLY this file to deploy at a different Service NSW branch.

const CONFIG = {
  // Branch display name — shown on the welcome screen heading
  branchName: "Albury",

  // Base URL for the kiosk deployment (used to build form QR codes).
  // Leave empty to auto-detect from window.location.origin at runtime.
  domain: "",

  // Path to the mobile form page (relative to deployment root)
  formPath: "form.html",

  // Idle timeout on the Welcome screen (ms) — resets to welcome after this duration
  idleTimeoutWelcome: 60000,   // 60 seconds

  // Idle timeout on the QR screen (ms) — resets to welcome after this duration
  idleTimeoutQR: 120000,       // 120 seconds

  // Landmark SVG path — swap this per branch to show a local landmark illustration
  landmarkSvg: "assets/landmark.svg",

  // Alt text for the landmark illustration
  landmarkAlt: "Albury Town Hall",

  // Data file paths (relative to deployment root)
  formDataPath: "data/final_fields.json",
  categoriesPath: "data/categories.json",
};
