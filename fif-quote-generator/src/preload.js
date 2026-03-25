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

  // Open preview window
  openPreview: (pdfPath, quoteData) =>
    ipcRenderer.invoke('open-preview', pdfPath, quoteData),

  // Upload PDF to Cliniko patient file
  uploadToCliniko: (patientId, filePath, quoteNumber, date) =>
    ipcRenderer.invoke('upload-to-cliniko', patientId, filePath, quoteNumber, date),

  // Save local copy via system save dialog
  saveLocalCopy: (filePath) =>
    ipcRenderer.invoke('save-local-copy', filePath),

  // Print via system print dialog
  printQuote: (filePath) =>
    ipcRenderer.invoke('print-quote', filePath),

  // Quote numbering
  getNextQuoteNumber: () =>
    ipcRenderer.invoke('get-next-quote-number'),

  peekNextQuoteNumber: () =>
    ipcRenderer.invoke('peek-next-quote-number'),

  setQuoteCounter: (value) =>
    ipcRenderer.invoke('set-quote-counter', value),

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
    ipcRenderer.invoke('test-connection'),

  // Test connection with specific key + shard (before saving)
  testConnectionWithKey: (apiKey, shard) =>
    ipcRenderer.invoke('test-connection-with-key', apiKey, shard),

  // Check if PIN is configured (for first-time setup detection)
  hasPin: () =>
    ipcRenderer.invoke('has-pin'),

  // Logo management
  selectLogo: () =>
    ipcRenderer.invoke('select-logo'),

  getLogoData: () =>
    ipcRenderer.invoke('get-logo-data'),

  // Lockout status
  getLockoutStatus: () =>
    ipcRenderer.invoke('get-lockout-status'),

  // Cached data loading
  loadAllData: () =>
    ipcRenderer.invoke('load-all-data'),

  getCachedData: () =>
    ipcRenderer.invoke('get-cached-data'),

  refreshData: () =>
    ipcRenderer.invoke('refresh-data'),

  // Listen for reset event from main process (triggered by preview window)
  onResetForNewQuote: (callback) => {
    ipcRenderer.on('reset-for-new-quote', callback);
    return () => ipcRenderer.removeListener('reset-for-new-quote', callback);
  },

  // Error logging
  logError: (message) =>
    ipcRenderer.invoke('log-error', message),

  // Diagnostics
  diagApiConnection: () =>
    ipcRenderer.invoke('diag-api-connection'),

  diagPatientLookup: (refNumber) =>
    ipcRenderer.invoke('diag-patient-lookup', refNumber),

  diagBillableItems: () =>
    ipcRenderer.invoke('diag-billable-items'),

  diagProducts: () =>
    ipcRenderer.invoke('diag-products'),

  diagPdfGeneration: () =>
    ipcRenderer.invoke('diag-pdf-generation'),

  diagUploadDryRun: () =>
    ipcRenderer.invoke('diag-upload-dry-run'),

  // App version
  getAppVersion: () =>
    ipcRenderer.invoke('get-app-version')
});
