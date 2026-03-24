const { contextBridge, ipcRenderer } = require('electron');

// Preload for the PDF preview window.
// Exposes functions needed for preview, upload, save, print.

contextBridge.exposeInMainWorld('previewApi', {
  getPreviewData: () =>
    ipcRenderer.invoke('get-preview-data'),

  // 3-step upload flow
  uploadStep1Presigned: (patientId) =>
    ipcRenderer.invoke('upload-step1-presigned', patientId),

  uploadStep2S3: (presigned, filePath, quoteNumber) =>
    ipcRenderer.invoke('upload-step2-s3', presigned, filePath, quoteNumber),

  uploadStep3Attach: (patientId, uploadUrl, quoteNumber, date, s3Key) =>
    ipcRenderer.invoke('upload-step3-attach', patientId, uploadUrl, quoteNumber, date, s3Key),

  // Save local copy
  saveLocalCopy: (filePath, quoteNumber, patientLastName) =>
    ipcRenderer.invoke('save-local-copy', filePath, quoteNumber, patientLastName),

  // Print
  printQuote: (filePath) =>
    ipcRenderer.invoke('print-quote', filePath),

  // Close preview window
  closePreview: () =>
    ipcRenderer.invoke('close-preview'),

  // Open URL in system browser
  openExternal: (url) =>
    ipcRenderer.invoke('open-external', url),

  // Reset main app for new quote
  createAnotherQuote: () =>
    ipcRenderer.invoke('create-another-quote')
});
