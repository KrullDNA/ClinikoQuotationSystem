const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const config = require('./config');
const { ClinikoAPI } = require('./api');
const { PDFGenerator } = require('./pdf');

const clinikoAPI = new ClinikoAPI();
const pdfGenerator = new PDFGenerator();

let mainWindow;
let previewWindow;

// ─── Simple file logger (rotating, max 1MB) ─────────────────────────────────
const LOG_PATH = path.join(app.getPath('userData'), 'fif-quote.log');
const LOG_MAX_SIZE = 1024 * 1024; // 1MB

function logToFile(level, message) {
  try {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${message}\n`;
    // Rotate if over max size
    if (fs.existsSync(LOG_PATH)) {
      const stats = fs.statSync(LOG_PATH);
      if (stats.size > LOG_MAX_SIZE) {
        const oldPath = LOG_PATH + '.old';
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        fs.renameSync(LOG_PATH, oldPath);
      }
    }
    fs.appendFileSync(LOG_PATH, line);
  } catch (e) {
    // Fail silently
  }
}

process.on('uncaughtException', (err) => {
  logToFile('ERROR', `Uncaught: ${err.stack || err.message}`);
});
process.on('unhandledRejection', (reason) => {
  logToFile('ERROR', `Unhandled rejection: ${reason}`);
});

// ─── In-memory data cache ────────────────────────────────────────────────────
const dataCache = {
  billableItems: null,
  products: null,
  businesses: null,
  taxes: null,
  loaded: false
};

async function loadAllData() {
  const [billableItems, products, businesses, taxes] = await Promise.all([
    clinikoAPI.getBillableItems(),
    clinikoAPI.getProducts(),
    clinikoAPI.getBusinesses(),
    clinikoAPI.getTaxes()
  ]);
  dataCache.billableItems = billableItems;
  dataCache.products = products;
  dataCache.businesses = businesses;
  dataCache.taxes = taxes;
  dataCache.loaded = true;
  return { billableItems, products, businesses, taxes };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    title: 'FIF Quote Generator',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Remove menu bar for cleaner look
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  logToFile('INFO', 'App started');
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ─── Memory cleanup on quit ──────────────────────────────────────────────────
app.on('before-quit', () => {
  // Purge all cached data
  dataCache.billableItems = null;
  dataCache.products = null;
  dataCache.businesses = null;
  dataCache.taxes = null;
  dataCache.loaded = false;
  logToFile('INFO', 'App quit — data cache purged');
});

// ─── IPC Handlers ───────────────────────────────────────────────────────────

// Patient lookup
ipcMain.handle('lookup-patient', async (_event, referenceNumber) => {
  try {
    const patient = await clinikoAPI.getPatient(referenceNumber);
    return { success: true, data: patient };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Billable items
ipcMain.handle('get-billable-items', async () => {
  try {
    const items = await clinikoAPI.getBillableItems();
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Products (all pages)
ipcMain.handle('get-products', async () => {
  try {
    const products = await clinikoAPI.getProducts();
    return { success: true, data: products };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Businesses
ipcMain.handle('get-businesses', async () => {
  try {
    const businesses = await clinikoAPI.getBusinesses();
    return { success: true, data: businesses };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Taxes
ipcMain.handle('get-taxes', async () => {
  try {
    const taxes = await clinikoAPI.getTaxes();
    return { success: true, data: taxes };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// PDF generation
ipcMain.handle('generate-quote', async (_event, quoteData) => {
  try {
    const filePath = await pdfGenerator.generateQuote(quoteData);
    return { success: true, data: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open preview window with generated PDF
ipcMain.handle('open-preview', async (_event, pdfPath, quoteData) => {
  try {
    if (previewWindow && !previewWindow.isDestroyed()) {
      previewWindow.close();
    }

    previewWindow = new BrowserWindow({
      width: 900,
      height: 750,
      title: `Quote Preview — ${quoteData.quoteNumber || 'Quote'}`,
      parent: mainWindow,
      modal: false,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload-preview.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      },
      icon: path.join(__dirname, '..', 'assets', 'icon.png')
    });

    previewWindow.setMenuBarVisibility(false);

    // Store data for the preview window to retrieve
    previewWindow._quotePreviewData = {
      pdfPath,
      quoteNumber: quoteData.quoteNumber,
      date: quoteData.date,
      patientId: quoteData.patient ? quoteData.patient.id : null,
      patientName: quoteData.patient ? quoteData.patient.fullName : '',
      patientLastName: quoteData.patient ? (quoteData.patient.fullName || '').split(' ').pop() : '',
      shard: config.getShard()
    };

    previewWindow.loadFile(path.join(__dirname, '..', 'renderer', 'preview.html'));

    previewWindow.on('closed', () => {
      previewWindow = null;
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get preview data (called from preview window)
ipcMain.handle('get-preview-data', async (event) => {
  try {
    // Find the BrowserWindow that sent this event
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && win._quotePreviewData) {
      const data = win._quotePreviewData;
      // Read PDF as base64 for embedding in viewer
      const pdfBuffer = fs.readFileSync(data.pdfPath);
      const pdfBase64 = pdfBuffer.toString('base64');
      return {
        success: true,
        data: {
          ...data,
          pdfBase64
        }
      };
    }
    return { success: false, error: 'No preview data available.' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Close preview window
ipcMain.handle('close-preview', async (event) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.close();
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Upload to Cliniko — Step 1: Get presigned post URL
ipcMain.handle('upload-step1-presigned', async () => {
  try {
    const presigned = await clinikoAPI.getPresignedPost();
    return { success: true, data: presigned };
  } catch (error) {
    const msg = error.message || 'Unknown error';
    return {
      success: false,
      error: `Upload failed: ${msg}`
    };
  }
});

// Upload to Cliniko — Step 2: Upload file to S3
ipcMain.handle('upload-step2-s3', async (_event, presigned, filePath, quoteNumber) => {
  try {
    const axios = require('axios');
    const FormData = require('form-data');

    const form = new FormData();
    const fields = presigned.fields || {};
    for (const [key, value] of Object.entries(fields)) {
      const fieldValue = typeof value === 'string'
        ? value.replace('${filename}', `Quote ${quoteNumber}.pdf`)
        : value;
      form.append(key, fieldValue);
    }
    form.append('file', fs.createReadStream(filePath));

    const uploadResponse = await axios.post(presigned.url, form, {
      headers: form.getHeaders()
    });

    // Extract key from S3 response XML
    const responseBody = typeof uploadResponse.data === 'string'
      ? uploadResponse.data
      : String(uploadResponse.data);
    const s3Key = responseBody.match(/<Key>(.*?)<\/Key>/)?.[1];
    if (!s3Key) throw new Error('Failed to get upload key from S3');

    const uploadUrl = `${presigned.url}/${s3Key}`;
    return { success: true, data: { s3Key, uploadUrl } };
  } catch (error) {
    return {
      success: false,
      error: 'File upload failed. Please try again. If the problem persists, save a local copy instead.'
    };
  }
});

// Upload to Cliniko — Step 3: Create attachment record
ipcMain.handle('upload-step3-attach', async (_event, patientId, uploadUrl, quoteNumber, date, s3Key) => {
  try {
    const description = `Quote ${quoteNumber} \u2014 ${date}`;
    const attachment = await clinikoAPI.createPatientAttachment(
      patientId,
      uploadUrl,
      description
    );
    return { success: true, data: attachment };
  } catch (error) {
    return {
      success: false,
      error: `The file was uploaded but could not be linked to the patient record. Please contact support.\nFile reference: ${s3Key || 'unknown'}`
    };
  }
});

// Save local copy — with smart default filename and Documents folder
ipcMain.handle('save-local-copy', async (_event, filePath, quoteNumber, patientLastName) => {
  try {
    const safeQuoteNum = (quoteNumber || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = `Quote ${safeQuoteNum}.pdf`;

    const documentsDir = app.getPath('documents');
    const defaultPath = path.join(documentsDir, safeName);

    // Use the preview window as parent if available, otherwise main
    const parentWin = previewWindow && !previewWindow.isDestroyed() ? previewWindow : mainWindow;
    const result = await dialog.showSaveDialog(parentWin, {
      defaultPath,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (result.canceled) {
      return { success: false, error: 'Save cancelled' };
    }

    fs.copyFileSync(filePath, result.filePath);
    return { success: true, data: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Print quote — load PDF as data URL in hidden window and print
ipcMain.handle('print-quote', async (_event, filePath) => {
  try {
    const pdfData = fs.readFileSync(filePath);
    const dataUrl = `data:application/pdf;base64,${pdfData.toString('base64')}`;

    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    await printWindow.loadURL(dataUrl);

    return new Promise((resolve) => {
      printWindow.webContents.print({}, (success, failureReason) => {
        printWindow.destroy();
        if (success) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: failureReason || 'Print cancelled' });
        }
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Config
ipcMain.handle('get-config', async () => {
  try {
    return { success: true, data: config.getConfig() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-config', async (_event, configData) => {
  try {
    config.saveConfig(configData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// PIN management
ipcMain.handle('verify-pin', async (_event, pin) => {
  try {
    const result = await config.verifyPin(pin);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('setup-pin', async (_event, pin) => {
  try {
    await config.setupPin(pin);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-pin', async (_event, currentPin, newPin) => {
  try {
    await config.updatePin(currentPin, newPin);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// API key management
ipcMain.handle('save-api-key', async (_event, apiKey) => {
  try {
    config.saveApiKey(apiKey);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('has-api-key', async () => {
  try {
    return { success: true, data: config.hasApiKey() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Test connection
ipcMain.handle('test-connection', async () => {
  try {
    const result = await clinikoAPI.testConnection();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Test connection with a specific key + shard (before saving)
ipcMain.handle('test-connection-with-key', async (_event, apiKey, shard) => {
  try {
    const result = await clinikoAPI.testConnectionWithKey(apiKey, shard);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check if PIN is configured
ipcMain.handle('has-pin', async () => {
  try {
    return { success: true, data: config.hasPinConfigured() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Logo selection — open file dialog, copy to userData, return path
ipcMain.handle('select-logo', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Logo Image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Selection cancelled' };
    }

    const sourcePath = result.filePaths[0];
    const ext = path.extname(sourcePath);
    const destDir = app.getPath('userData');
    const destPath = path.join(destDir, `logo${ext}`);

    fs.copyFileSync(sourcePath, destPath);
    config.saveConfig({ logo_path: destPath });

    return { success: true, data: destPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get logo as data URL for display in renderer
ipcMain.handle('get-logo-data', async () => {
  try {
    const logoPath = config.getConfig().logo_path;
    if (!logoPath || !fs.existsSync(logoPath)) {
      return { success: true, data: null };
    }
    const data = fs.readFileSync(logoPath);
    const ext = path.extname(logoPath).replace('.', '').toLowerCase();
    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml' };
    const mime = mimeMap[ext] || 'image/png';
    const dataUrl = `data:${mime};base64,${data.toString('base64')}`;
    return { success: true, data: dataUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get lockout status
ipcMain.handle('get-lockout-status', async () => {
  try {
    return { success: true, data: config.getLockoutStatus() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open URL in default system browser
ipcMain.handle('open-external', async (_event, url) => {
  try {
    const { shell } = require('electron');
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Notify main window to reset for a new quote (called from preview window)
ipcMain.handle('create-another-quote', async (event) => {
  try {
    // Close the preview window
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.close();
    }
    // Tell main window to reset
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('reset-for-new-quote');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Cached data loading ─────────────────────────────────────────────────────

// Load all Cliniko data (billable items, products, businesses, taxes)
ipcMain.handle('load-all-data', async () => {
  try {
    const data = await loadAllData();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get cached data (returns from memory, no API call)
ipcMain.handle('get-cached-data', async () => {
  if (!dataCache.loaded) {
    return { success: false, error: 'Data not loaded yet.' };
  }
  return {
    success: true,
    data: {
      billableItems: dataCache.billableItems,
      products: dataCache.products,
      businesses: dataCache.businesses,
      taxes: dataCache.taxes
    }
  };
});

// Refresh cached data (re-fetch from API)
ipcMain.handle('refresh-data', async () => {
  try {
    const data = await loadAllData();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Diagnostics ─────────────────────────────────────────────────────────────

// Log error from renderer
ipcMain.handle('log-error', async (_event, message) => {
  logToFile('ERROR', `[renderer] ${message}`);
  return { success: true };
});

// Run diagnostics: API connection test
ipcMain.handle('diag-api-connection', async () => {
  try {
    const businesses = await clinikoAPI.getBusinesses();
    return { success: true, data: { count: businesses.length } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Run diagnostics: patient lookup
ipcMain.handle('diag-patient-lookup', async (_event, refNumber) => {
  try {
    const patient = await clinikoAPI.getPatient(refNumber);
    if (!patient) return { success: true, data: { found: false, fieldCount: 0 } };
    const fieldCount = Object.keys(patient).length;
    return { success: true, data: { found: true, fieldCount } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Run diagnostics: billable items count
ipcMain.handle('diag-billable-items', async () => {
  try {
    const items = await clinikoAPI.getBillableItems();
    return { success: true, data: { count: items.length } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Run diagnostics: products count (all pages)
ipcMain.handle('diag-products', async () => {
  try {
    const products = await clinikoAPI.getProducts();
    return { success: true, data: { count: products.length } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Run diagnostics: generate dummy PDF
ipcMain.handle('diag-pdf-generation', async () => {
  try {
    const dummyData = {
      quoteNumber: 'DIAG-TEST',
      date: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      patient: { fullName: 'Test Patient', fundingScheme: 'NDIS', ndisNumber: '12345678' },
      business: {
        business_name: 'Feet in Focus',
        address: { address_1: 'Unit 9, 64 Talavera Road', city: 'Macquarie Park', state: 'NSW', post_code: '2113' },
        contact_information: { phone: '(02) 8964 1874', fax: '(02) 8068 9716' }
      },
      lineItems: [
        { itemCode: 'DIAG-001', category: 'Test Service', description: 'Diagnostic test item', qty: 1, unitCost: 100, hasGst: true, gstAmount: 10, total: 110 }
      ],
      totalAmount: 110,
      notes: '',
      terms: '',
      validity: '30 days'
    };
    const filePath = await pdfGenerator.generateQuote(dummyData);
    return { success: true, data: { filePath } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Run diagnostics: upload dry run (steps 1-2 only)
ipcMain.handle('diag-upload-dry-run', async () => {
  try {
    // Step 1: Get presigned URL
    const presigned = await clinikoAPI.getPresignedPost();
    if (!presigned || !presigned.url) {
      return { success: false, error: 'Failed to get presigned URL' };
    }

    // Step 2: Upload a tiny test file
    const axios = require('axios');
    const FormData = require('form-data');
    const tmpFile = path.join(os.tmpdir(), 'fif-diag-test.txt');
    fs.writeFileSync(tmpFile, 'FIF Quote Generator diagnostic test');

    const form = new FormData();
    const fields = presigned.fields || {};
    for (const [key, value] of Object.entries(fields)) {
      const fieldValue = typeof value === 'string'
        ? value.replace('${filename}', 'diag-test.txt')
        : value;
      form.append(key, fieldValue);
    }
    form.append('file', fs.createReadStream(tmpFile));

    await axios.post(presigned.url, form, {
      headers: form.getHeaders()
    });

    // Clean up
    try { fs.unlinkSync(tmpFile); } catch (e) { /* ignore */ }

    return { success: true, data: { message: 'Steps 1-2 passed (no attachment created)' } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get app version
ipcMain.handle('get-app-version', async () => {
  return { success: true, data: app.getVersion() };
});
