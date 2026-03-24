const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { ClinikoAPI } = require('./api');
const { PDFGenerator } = require('./pdf');

const clinikoAPI = new ClinikoAPI();
const pdfGenerator = new PDFGenerator();

let mainWindow;
let previewWindow;

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
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
      patientId: quoteData.patient ? quoteData.patient.internalId : null
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

// Upload to Cliniko
ipcMain.handle('upload-to-cliniko', async (_event, patientId, filePath, quoteNumber, date) => {
  try {
    // Step 1: Get presigned post
    const presigned = await clinikoAPI.getPresignedPost();

    // Step 2: Upload to S3
    const fs = require('fs');
    const FormData = require('form-data');
    const axios = require('axios');

    const form = new FormData();
    const fields = presigned.fields || {};
    for (const [key, value] of Object.entries(fields)) {
      const fieldValue = typeof value === 'string'
        ? value.replace('${filename}', `${quoteNumber}.pdf`)
        : value;
      form.append(key, fieldValue);
    }
    form.append('file', fs.createReadStream(filePath));

    const uploadResponse = await axios.post(presigned.url, form, {
      headers: form.getHeaders()
    });

    // Extract key from S3 response
    const s3Key = uploadResponse.data.match(/<Key>(.*?)<\/Key>/)?.[1];
    if (!s3Key) throw new Error('Failed to get upload key from S3');

    const uploadUrl = `${presigned.url}/${s3Key}`;

    // Step 3: Create attachment record
    const attachment = await clinikoAPI.createPatientAttachment(
      patientId,
      uploadUrl,
      `Quote ${quoteNumber} - ${date}`
    );

    return { success: true, data: attachment };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Save local copy
ipcMain.handle('save-local-copy', async (_event, filePath) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: path.basename(filePath),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (result.canceled) {
      return { success: false, error: 'Save cancelled' };
    }

    const fs = require('fs');
    fs.copyFileSync(filePath, result.filePath);
    return { success: true, data: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Print quote
ipcMain.handle('print-quote', async (_event, filePath) => {
  try {
    const printWindow = new BrowserWindow({ show: false });
    await printWindow.loadFile(filePath);
    printWindow.webContents.print({}, (success) => {
      printWindow.close();
    });
    return { success: true };
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
    const ext = path.extname(logoPath).replace('.', '');
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
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
