const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const config = require('./config');

class PDFGenerator {
  /**
   * Generate a quote PDF from the provided quoteData object.
   * Uses Electron's built-in printToPDF (Chromium engine).
   * Returns the file path to the generated PDF in the OS temp directory.
   */
  async generateQuote(quoteData) {
    // 1. Build the final HTML
    const html = this._buildHtml(quoteData);

    // 2. Create a hidden BrowserWindow for rendering
    const win = new BrowserWindow({
      show: false,
      width: 794,  // A4 at 96 DPI
      height: 1123,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    try {
      // Load the HTML content
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

      // Wait for fonts/images to load
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate PDF
      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: {
          marginType: 'custom',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        }
      });

      // Save to temp directory
      const safeQuoteNum = (quoteData.quoteNumber || 'quote').replace(/[^a-zA-Z0-9_-]/g, '_');
      const outputPath = path.join(os.tmpdir(), `Quote ${safeQuoteNum}.pdf`);
      fs.writeFileSync(outputPath, pdfBuffer);

      return outputPath;
    } finally {
      win.destroy();
    }
  }

  /**
   * Build the final HTML string by populating the template with data.
   */
  _buildHtml(quoteData) {
    // Get logo as data URL
    const logoDataUrl = this._getLogoDataUrl();

    // Build participant info
    const patient = quoteData.patient || {};
    const participantName = patient.fullName || '';

    // Funding label/value — EMPTY FIELD RULE: hide if no data
    let fundingLabel = '';
    let fundingValue = '';
    if (patient.fundingScheme === 'NDIS' && patient.ndisNumber) {
      fundingLabel = 'NDIS Number';
      fundingValue = patient.ndisNumber;
    } else if (patient.fundingScheme && patient.fundingScheme !== 'NDIS') {
      fundingLabel = 'Funding';
      fundingValue = patient.fundingScheme;
    }

    // Format line items
    const lineItems = (quoteData.lineItems || []).map(item => {
      const qty = item.qty || 1;
      const unitCost = item.unitCost || 0;
      const gstAmount = item.gstAmount || 0;
      const total = item.total || 0;

      return {
        itemCode: item.itemCode || '',
        category: item.category || '',
        description: item.description || '',
        qty,
        unitCostFormatted: this._formatCurrency(unitCost),
        gstFormatted: gstAmount > 0 ? `$ ${this._formatCurrency(gstAmount)}` : '$ -',
        totalFormatted: this._formatCurrency(total)
      };
    });

    // Calculate totals + GST breakdown
    const hasGstItems = (quoteData.lineItems || []).some(item => (item.gstAmount || 0) > 0);
    let subtotal = 0;
    let totalGst = 0;
    if (hasGstItems) {
      (quoteData.lineItems || []).forEach(item => {
        subtotal += (item.qty || 1) * (item.unitCost || 0);
        totalGst += item.gstAmount || 0;
      });
    }

    // Build business footer from config settings
    const cfg = config.getConfig();
    const footerAddress = cfg.footer_address || '';
    const footerPhone = cfg.footer_phone || '';
    const footerFax = cfg.footer_fax || '';
    const footerEmail = cfg.footer_email || '';
    const footerWebsite = cfg.footer_website || '';

    // Build line items HTML
    const lineItemsHtml = lineItems.map(item => {
      const itemCodeHtml = item.itemCode
        ? `<div class="item-code">${this._esc(item.itemCode)}</div>`
        : '';
      const categoryHtml = item.category
        ? `<div class="item-category">${this._esc(item.category)}</div>`
        : '';

      return `
          <tr>
            <td class="col-item">${itemCodeHtml}${categoryHtml}</td>
            <td class="col-description"><div class="desc-text">${this._esc(item.description)}</div></td>
            <td class="col-qty">${item.qty}</td>
            <td class="col-unit-cost">$ ${item.unitCostFormatted}</td>
            <td class="col-gst">${item.gstFormatted}</td>
            <td class="col-total">$ ${item.totalFormatted}</td>
          </tr>`;
    }).join('\n');

    // ── Build participant info rows (EMPTY FIELD RULE) ──
    let participantHtml = '';
    if (participantName) {
      participantHtml += `<div class="info-row"><span class="info-label">Participant Name: </span><span class="info-value">${this._esc(participantName)}</span></div>`;
    }
    if (fundingLabel && fundingValue) {
      participantHtml += `<div class="info-row"><span class="info-label">${this._esc(fundingLabel)}: </span><span class="info-value">${this._esc(fundingValue)}</span></div>`;
    }

    // Right side info
    let rightInfoHtml = '';
    if (quoteData.date) {
      rightInfoHtml += `<div class="info-row"><span class="info-label">Date: </span><span class="info-value">${this._esc(quoteData.date)}</span></div>`;
    }
    if (quoteData.quoteNumber) {
      rightInfoHtml += `<div class="info-row"><span class="info-label">Quotation #: </span><span class="info-value">${this._esc(quoteData.quoteNumber)}</span></div>`;
    }

    // Validity
    const validityHtml = quoteData.validity
      ? `This quote is valid for up to ${this._esc(quoteData.validity)}`
      : '';

    // GST breakdown rows
    let gstBreakdownHtml = '';
    if (hasGstItems) {
      gstBreakdownHtml = `
            <tr>
              <td class="subtotal-label">Subtotal (ex GST)</td>
              <td class="subtotal-value">$ ${this._formatCurrency(subtotal)}</td>
            </tr>
            <tr>
              <td class="subtotal-label">GST</td>
              <td class="subtotal-value">$ ${this._formatCurrency(totalGst)}</td>
            </tr>`;
    }

    // Notes — EMPTY FIELD RULE
    const notesHtml = quoteData.notes
      ? `<div class="notes-section"><div class="notes-title">Notes / Special Instructions</div><div class="notes-text">${this._esc(quoteData.notes)}</div></div>`
      : '';

    // Terms — EMPTY FIELD RULE
    const termsHtml = quoteData.terms
      ? `<div class="terms-section"><div class="terms-title">Terms &amp; Conditions</div><div class="terms-text">${this._esc(quoteData.terms)}</div></div>`
      : '';

    // Footer — EMPTY FIELD RULE
    const footerAddressHtml = footerAddress
      ? `<div class="footer-line">${this._esc(footerAddress)}</div>`
      : '';
    const phoneParts = [];
    if (footerPhone) phoneParts.push(`<strong>T:</strong> ${this._esc(footerPhone)}`);
    if (footerFax) phoneParts.push(`<strong>F:</strong> ${this._esc(footerFax)}`);
    const footerPhoneHtml = phoneParts.length > 0
      ? `<div class="footer-line">${phoneParts.join(' | ')}</div>`
      : '';
    const contactParts = [];
    if (footerEmail) contactParts.push(`<strong>E:</strong> ${this._esc(footerEmail)}`);
    if (footerWebsite) contactParts.push(`<strong>W:</strong> ${this._esc(footerWebsite)}`);
    const footerContactHtml = contactParts.length > 0
      ? `<div class="footer-line">${contactParts.join(' | ')}</div>`
      : '';

    // Logo
    const logoHtml = logoDataUrl
      ? `<img src="${logoDataUrl}" alt="Feet in Focus">`
      : '';

    const totalAmount = quoteData.totalAmount || 0;

    return `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="UTF-8">
<title>Quotation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Montserrat', 'Century Gothic', Arial, Helvetica, sans-serif;
  font-size: 9pt;
  color: #333;
  line-height: 1.4;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.page {
  width: 210mm;
  height: 297mm;
  padding: 10mm;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── HEADER ── */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 22px;
}
.header-logo img {
  height: 54px;
  width: auto;
}
.header-title {
  font-size: 18pt;
  font-weight: 400;
  color: #000;
  letter-spacing: 3px;
  text-transform: uppercase;
  line-height: 1;
  text-align: right;
  margin-top: 6mm;
}

/* ── PARTICIPANT INFO ── */
.info-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 22px;
}
.info-left { flex: 1; }
.info-right { text-align: right; flex-shrink: 0; padding-left: 40px; }
.info-row { margin-bottom: 3px; font-size: 9pt; }
.info-label { font-weight: 600; font-style: italic; color: #333; }
.info-value { font-weight: 400; color: #333; }

/* ── LINE ITEMS TABLE ── */
.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
}
.items-table thead th {
  background-color: #2d2d2d;
  color: #fff;
  font-weight: 500;
  text-transform: uppercase;
  font-size: 7.5pt;
  letter-spacing: 0.5px;
  padding: 8px 10px;
  text-align: left;
}
.items-table thead th.col-qty { text-align: center; }
.items-table thead th.col-unit-cost,
.items-table thead th.col-gst,
.items-table thead th.col-total { text-align: right; }

.items-table tbody td {
  padding: 10px 10px;
  vertical-align: top;
  border-bottom: 1px solid #e5e5e5;
  font-size: 8pt;
  line-height: 1.45;
}
.col-item { width: 140px; }
.col-qty { width: 38px; text-align: center; }
.col-unit-cost { width: 78px; text-align: right; white-space: nowrap; }
.col-gst { width: 58px; text-align: right; white-space: nowrap; }
.col-total { width: 78px; text-align: right; white-space: nowrap; }

.item-code {
  font-size: 7.5pt;
  color: #555;
  word-break: break-all;
  line-height: 1.3;
}
.item-category {
  font-weight: 700;
  font-size: 7.5pt;
  color: #333;
  margin-top: 2px;
  line-height: 1.3;
}
.desc-text { font-size: 8pt; color: #333; line-height: 1.45; }

/* ── TOTALS ── */
.totals-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.validity-text {
  font-size: 9pt;
  color: #333;
  font-weight: 400;
  padding: 10px 0;
  flex: 1;
}
.totals-right { flex-shrink: 0; }
.totals-table { border-collapse: collapse; }
.totals-table td { padding: 4px 10px; font-size: 8.5pt; }
.totals-table .subtotal-label {
  text-align: right; font-weight: 500; font-size: 8pt; color: #555; padding-right: 12px;
}
.totals-table .subtotal-value {
  text-align: right; font-weight: 500; font-size: 8pt; color: #555;
}
.totals-table .total-label {
  text-align: right; font-weight: 700; text-transform: uppercase; font-size: 8pt;
  letter-spacing: 0.3px; color: #333; padding-right: 12px;
}
.totals-table .total-value {
  text-align: right; font-weight: 600; font-size: 9pt; color: #333;
  border: 1px solid #d0d0d0; padding: 6px 12px; min-width: 100px;
}

/* ── NOTES & TERMS ── */
.content-area { flex: 1; }
.notes-section { margin-top: 18px; }
.notes-title { font-weight: 600; font-size: 9pt; color: #333; margin-bottom: 4px; }
.notes-text { font-size: 8.5pt; color: #444; line-height: 1.5; white-space: pre-wrap; }
.terms-section { margin-top: 14px; }
.terms-title { font-weight: 600; font-size: 8.5pt; color: #333; margin-bottom: 4px; }
.terms-text { font-size: 7.5pt; color: #555; line-height: 1.5; white-space: pre-wrap; }

/* ── FOOTER ── */
.footer {
  text-align: center;
  padding-top: 12px;
  margin-top: auto;
  font-size: 7.5pt;
  line-height: 1.8;
  color: #333;
}
.footer-company { font-weight: 700; color: #e88c2a; font-size: 8pt; }
.footer-separator { color: #333; font-weight: 400; }
.footer-abn { font-weight: 600; color: #333; font-size: 8pt; }
.footer-line { font-size: 7.5pt; color: #555; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-logo">${logoHtml}</div>
    <div class="header-title">QUOTATION</div>
  </div>

  <div class="info-section">
    <div class="info-left">${participantHtml}</div>
    <div class="info-right">${rightInfoHtml}</div>
  </div>

  <div class="content-area">
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-item">Item</th>
          <th class="col-description">Description</th>
          <th class="col-qty">Qty</th>
          <th class="col-unit-cost">Unit Cost</th>
          <th class="col-gst">GST</th>
          <th class="col-total">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <div class="totals-section">
      <div class="validity-text">${validityHtml}</div>
      <div class="totals-right">
        <table class="totals-table">
          ${gstBreakdownHtml}
          <tr>
            <td class="total-label">Total Amount</td>
            <td class="total-value">$ ${this._formatCurrency(totalAmount)}</td>
          </tr>
        </table>
      </div>
    </div>

    ${notesHtml}
    ${termsHtml}
  </div>

  <div class="footer">
    <div>
      <span class="footer-company">FEET IN FOCUS</span>
      <span class="footer-separator"> | </span>
      <span class="footer-abn">ABN: 42 148 020 526</span>
    </div>
    ${footerAddressHtml}
    ${footerPhoneHtml}
    ${footerContactHtml}
  </div>
</div>
</body>
</html>`;
  }

  _getLogoDataUrl() {
    try {
      const logoPath = config.getConfig().logo_path;
      if (!logoPath || !fs.existsSync(logoPath)) return '';
      const data = fs.readFileSync(logoPath);
      const ext = path.extname(logoPath).replace('.', '');
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${data.toString('base64')}`;
    } catch (e) {
      return '';
    }
  }

  _formatCurrency(amount) {
    return amount.toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }
}

module.exports = { PDFGenerator };
