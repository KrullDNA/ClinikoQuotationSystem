# FIF Quote Generator

Professional quotation tool for **Feet in Focus**, a pedorthic practice. Integrates with Cliniko for patient lookup, line item management, PDF quote generation, and upload to patient files.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- A **Cliniko API key** with access to patients, billable items, products, and patient attachments

## Development Setup

```bash
cd fif-quote-generator
npm install
npm start
```

`npm start` builds the CSS and JSX, then launches the Electron app.

For development with hot-reload:

```bash
npm run dev
```

This runs Tailwind CSS and esbuild in watch mode alongside Electron.

## Building for Windows

To produce a Windows installer (.exe) from any platform:

```bash
npm run build:win
```

This builds the renderer assets then runs electron-builder for Windows (NSIS installer). The output is written to `/dist`.

> **Note:** Cross-compilation from macOS/Linux to Windows requires Wine. See [electron-builder docs](https://www.electron.build/multi-platform-build) for details.

## First Launch

1. **Create PIN** — Set a 4-digit PIN to protect the app
2. **Enter API Key** — Your Cliniko API key (from Cliniko > My Info > API Keys)
3. **Select Shard** — Choose your Cliniko server region (AU1, AU2, AU3, UK1, US1)
4. **Test Connection** — Verify the API key works and load business locations
5. **Select Default Business** — Choose which business location appears on quotes by default
6. **Upload Logo** — Select the Feet in Focus logo image (PNG recommended, 600px+ wide)
7. **Save Settings** — Click Save Settings to persist

## Daily Usage

1. **Unlock** with your 4-digit PIN
2. **Enter patient reference number** — the old reference ID used by staff (e.g. "1214")
3. **Add line items** — search by item code or name, or add custom items
4. **Enter quote number** — free text, e.g. "1110", "FIF-0042"
5. **Review and edit** — adjust descriptions, quantities, costs, GST toggles
6. **Generate Quote** — creates a branded A4 PDF and opens preview
7. **From preview**: Upload to Cliniko, Save Local Copy, or Print
8. **Create Another Quote** resets everything for the next patient

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New quote (clear form) |
| `Enter` | Trigger patient lookup (when in reference field) |

## Project Structure

```
fif-quote-generator/
  build/              — Windows icon (icon.ico) goes here
  src/
    main/             — Electron main process
      main.js         — App entry, window management, IPC handlers
      api.js          — Cliniko API communication
      config.js       — Encrypted config read/write
      pdf.js          — PDF generation (Electron printToPDF)
      templates/      — HTML template for quote PDF
    renderer/         — React UI
      components/     — React components (PatientLookup, QuoteBuilder, etc.)
      utils/          — Utility functions (parsePatient)
      styles/         — Tailwind CSS input/output
      App.jsx         — Main app component
      preview.html    — PDF preview window
    preload.js        — Main window secure bridge (contextBridge)
    preload-preview.js — Preview window secure bridge
  dist/               — Build output (created by electron-builder)
```

## Brand Assets

| Asset | Location | Notes |
|-------|----------|-------|
| Logo | Upload via Settings > Logo | PNG recommended, 600px+ wide. Stored in app user data |
| Windows icon | `build/icon.ico` | ICO format, multiple sizes (16-256px). See `build/ICON_PLACEHOLDER.md` |

## Security

- All Cliniko API calls run in the Electron main process only
- Renderer has no direct access to Node.js or Electron APIs
- Communication via contextBridge IPC (preload.js)
- API key encrypted at rest using machine-derived encryption key
- Patient data held in memory only — never written to disk
- PIN with lockout after 5 failed attempts (5-minute lockout)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "API key not configured" | Go to Settings, enter your Cliniko API key, test connection, and save |
| "Could not connect to Cliniko" | Check internet connection. Verify shard setting matches your Cliniko region |
| "Invalid API key" | Generate a new API key in Cliniko (My Info > API Keys) |
| "No patient found" | Verify the reference number. This uses the old reference ID, not the Cliniko internal ID |
| "Loading Cliniko data..." hangs | Check internet. If persistent, restart the app and try again |
| PDF generation fails | Ensure the app has write access to the system temp directory |
| Upload fails at step 2 | S3 upload issue. Try again, or save a local copy instead |
| Upload fails at step 3 | File uploaded to S3 but attachment record failed. Note the file reference and contact support |
| App crashes on launch | Delete the config file in app user data folder and restart |

### Diagnostics

Go to **Settings > Diagnostics > Run Diagnostics** to test:
1. API Connection
2. Patient Lookup
3. Billable Items count
4. Products count (all pages)
5. PDF Generation
6. Upload Dry Run (steps 1-2 only, no attachment created)

### Log File

Error logs are written to:
- **Windows**: `%APPDATA%/fif-quote-generator/fif-quote.log`
- **macOS**: `~/Library/Application Support/fif-quote-generator/fif-quote.log`

Log file rotates at 1MB.

## Tech Stack

- **Electron 33** — Desktop app framework
- **React 19** — UI layer
- **Tailwind CSS 3** — Styling
- **electron-store** — Encrypted config storage
- **axios** — HTTP client for Cliniko API
- **esbuild** — Fast JSX bundling
- **electron-builder** — Windows installer packaging
