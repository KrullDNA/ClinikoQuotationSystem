const { contextBridge, ipcRenderer } = require('electron');

// Minimal preload for the PDF preview window.
// Only exposes the functions needed by the preview.

contextBridge.exposeInMainWorld('previewApi', {
  getPreviewData: () =>
    ipcRenderer.invoke('get-preview-data'),

  uploadToCliniko: (patientId, filePath, quoteNumber, date) =>
    ipcRenderer.invoke('upload-to-cliniko', patientId, filePath, quoteNumber, date),

  saveLocalCopy: (filePath) =>
    ipcRenderer.invoke('save-local-copy', filePath),

  printQuote: (filePath) =>
    ipcRenderer.invoke('print-quote', filePath),

  closePreview: () =>
    ipcRenderer.invoke('close-preview')
});
