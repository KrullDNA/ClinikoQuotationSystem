# FIF Quote Generator

Professional quotation tool for **Feet in Focus**, a pedorthic practice. Integrates with Cliniko for patient lookup, line item management, and PDF quote generation with upload.

## Tech Stack

- **Electron** — Desktop app framework (Windows target)
- **React** — UI layer
- **Tailwind CSS** — Styling
- **electron-store** — Encrypted config storage
- **axios** — HTTP client for Cliniko API

## Getting Started

```bash
cd fif-quote-generator
npm install
npm start
```

## Project Structure

```
/src
  /main              — Electron main process
    main.js          — App entry, window management, IPC handlers
    api.js           — Cliniko API communication
    config.js        — Encrypted config read/write
    pdf.js           — PDF generation (Session 5)
  /renderer          — React UI
    /components      — React components
    /styles          — Tailwind config and custom CSS
    App.jsx          — Main app component
  /assets            — Logo, fonts, icons
  preload.js         — Secure bridge (contextBridge)
```

## Security

- All API calls run in the Electron main process only
- Renderer has no direct access to Node.js or Electron APIs
- Communication via contextBridge IPC (preload.js)
- API key encrypted at rest using machine-derived key
- Patient data held in memory only, never persisted to disk

## Build

```bash
npm run build:dist
```
