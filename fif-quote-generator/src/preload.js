const { contextBridge, ipcRenderer } = require('electron');

// Secure bridge between main and renderer processes.
// ONLY these functions are exposed to the renderer via window.api.
// No direct access to Node.js, Electron, or IPC is available in the renderer.

contextBridge.exposeInMainWorld('api', {
  // Patient lookup by old_reference_id
  lookupPatient: (referenceNumber) =>
    ipcRenderer.invoke('lookup-patient', referenceNumber),

  // Line items
  getBillableItems: () =>
    ipcRenderer.invoke('get-billable-items'),

  getProducts: () =>
    ipcRenderer.invoke('get-products'),

  // Business locations
  getBusinesses: () =>
    ipcRenderer.invoke('get-businesses'),

  // Tax rates
  getTaxes: () =>
    ipcRenderer.invoke('get-taxes'),

  // PDF generation
  generateQuote: (quoteData) =>
    ipcRenderer.invoke('generate-quote', quoteData),

  // Upload PDF to Cliniko patient file
  uploadToCliniko: (patientId, filePath, quoteNumber, date) =>
    ipcRenderer.invoke('upload-to-cliniko', patientId, filePath, quoteNumber, date),

  // Save local copy via system save dialog
  saveLocalCopy: (filePath) =>
    ipcRenderer.invoke('save-local-copy', filePath),

  // Print via system print dialog
  printQuote: (filePath) =>
    ipcRenderer.invoke('print-quote', filePath),

  // Config (non-sensitive only)
  getConfig: () =>
    ipcRenderer.invoke('get-config'),

  saveConfig: (config) =>
    ipcRenderer.invoke('save-config', config),

  // PIN authentication
  verifyPin: (pin) =>
    ipcRenderer.invoke('verify-pin', pin),

  setupPin: (pin) =>
    ipcRenderer.invoke('setup-pin', pin),

  updatePin: (currentPin, newPin) =>
    ipcRenderer.invoke('update-pin', currentPin, newPin),

  // API key management
  saveApiKey: (apiKey) =>
    ipcRenderer.invoke('save-api-key', apiKey),

  hasApiKey: () =>
    ipcRenderer.invoke('has-api-key'),

  // Test API connection
  testConnection: () =>
    ipcRenderer.invoke('test-connection')
});
