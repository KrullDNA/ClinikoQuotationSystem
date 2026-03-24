# FIF Quote Generator — Build Status

| Session | Description                          | Status         | Deviations |
|---------|--------------------------------------|----------------|------------|
| 1       | Project Scaffolding + Security Arch  | **Complete**   | No deviations. |
| 2       | Settings + PIN Authentication        | **Complete**   | No deviations. |
| 3       | Patient Lookup + Display             | **Complete**   | No deviations. |
| 4       | Line Items Table                     | **Complete**   | No deviations. |
| 5       | PDF Generation                       | **Complete**   | Used Electron printToPDF instead of puppeteer-core (see notes). |
| 6       | Upload + Save + Print                | **Complete**   | No deviations. |
| 7       | Polish + Packaging + Testing         | **Complete**   | No deviations. |

**Build Complete — 24/03/2026**

## Session 1 Notes

- Electron app scaffold created with React + Tailwind CSS
- Security boundary established via contextBridge in preload.js
- All IPC channels defined matching the brief specification
- Encrypted config storage using electron-store with machine ID encryption key
- ClinikoAPI class with all endpoint methods and error handling
- esbuild used for JSX bundling (lightweight, fast builds)
- `npm start` builds CSS + JSX then launches Electron window
- All 18 IPC functions exposed via window.api as specified

## Session 2 Notes

- PIN screen with 4-digit masked input, Enter key support, lockout countdown timer
- First-time setup wizard: Welcome → Create PIN → Confirm PIN → Settings
- Settings screen with three sections: Cliniko Connection, Quote Defaults, Security
- API key field with show/hide eye toggle
- Shard selector with styled radio buttons (AU1–US1)
- Test Connection button with success/error feedback and business dropdown population
- testConnectionWithKey IPC for testing before saving the key
- Logo upload via system file dialog, copied to userData, displayed as preview
- Default validity and terms & conditions fields
- Change PIN flow (current → new → confirm) with validation
- AppHeader with logo display and gear icon for settings access
- Brand colours applied: Primary #2C3E50, Accent #2980B9
- App state machine: loading → setup/pin → settings-first/main → settings

## Session 3 Notes

- PatientLookup component: reference number input, Enter key + button, loading spinner
- Error states: no patient found (with ref number), API error, no API key configured
- PatientDetails component: clean card layout with all standard fields
- Empty/null fields automatically hidden (label + value row both removed)
- Date of birth reformatted from YYYY-MM-DD to DD/MM/YYYY
- Phone formatted with type in parentheses, handles empty array
- Address formatted as multi-line block (skip empty lines)
- Preferred name shown only when present AND different from first name
- Invoice email shown only when present AND different from main email
- Patient notes and invoice extra info shown in subtle info boxes
- Custom fields parser utility (parsePatient.js):
  - Matches "Funding Scheme" section → "Funding Schmes" field (exact typo match)
  - Extracts selected radio option for funding type
  - NDIS section only displayed when funding scheme is "NDIS"
  - All NDIS fields: number, plan type, plan manager, support coordinator, plan dates
- Clear Patient button purges all patient data from React state
- Patient internal ID (for uploads) stored in state but never displayed
- Main screen layout: lookup at top, patient card below, placeholder for line items

## Session 4 Notes

- Data loading after PIN unlock: fetches billable items, products (paginated), businesses, taxes in parallel
- In-memory cache in main process with loadAllData/getCachedData/refreshData IPC handlers
- "Loading Cliniko data..." screen with spinner shown during initial data fetch
- Error banner with retry button if data loading fails
- ItemSearchDropdown: searchable type-to-filter dropdown grouped into Services and Products
  - Display format: [item_code] — item_name — $price
  - Keyboard navigation (arrow up/down, Enter, Escape)
  - Click-outside-to-close behaviour
  - Resets after selection, ready for next item
- LineItemsTable: editable rows with Item Code, Description, Qty, Unit Cost, GST, Total, Delete
  - Description is freely editable text (pre-filled from item name)
  - Qty defaults to 1, minimum 1
  - Unit Cost editable currency field
  - GST toggleable per row (click to switch on/off), shows dollar amount or "$ -"
  - For billable items: GST if tax.links.self exists
  - For products: GST if price_ex_tax !== price_including_tax
  - Real-time total calculation
- Add Custom Item button for blank rows (all fields editable)
- QuoteBuilder component wrapping: quote number (free text, required), business selector, line items, notes, terms, validity
- Business selector defaults to config default, populated from cached businesses
- Terms & conditions and validity pre-filled from config defaults, editable per quote
- Form validation: requires patient, at least one line item, and quote number
- Generate Quote button assembles full quoteData object (wired in Session 5)
- All amounts formatted as $X,XXX.XX using en-AU locale

## Session 5 Notes

- PDF engine: Electron's built-in printToPDF (BrowserWindow.webContents.printToPDF)
  - Deviation: Used Electron's native Chromium via printToPDF instead of puppeteer-core.
    puppeteer-core was installed but Electron's binary cannot be used as a standalone
    Chromium for Puppeteer (it launches as an Electron app). Using printToPDF is cleaner
    for an Electron app — zero extra dependencies, same Chromium rendering engine.
- HTML/CSS template replicates the reference Quotation_design.pdf exactly:
  - Header: logo top-left, "QUOTATION" top-right in large light grey text (30pt, #c0c0c0)
  - Participant info: name + NDIS/funding on left, date + quotation # on right
  - 6-column line items table with dark header (#2d2d2d), white rows, subtle borders
  - Item column: item_code on first line, category/name bold on second line
  - Description column: widest, editable text from form
  - QTY centre-aligned, Unit Cost/GST/Total right-aligned, all $X,XXX.XX
  - GST shows "$ -" when no GST, dollar amount when GST applies
  - Totals row: validity text left, TOTAL AMOUNT right in bordered cell
  - GST breakdown (Subtotal ex GST + GST rows) shown only when items have GST
  - Footer: orange border-top, "FEET IN FOCUS | ABN: 42 148 020 526", address, phone, email
- Font: Montserrat via Google Fonts link (wght 300-800), fallback Century Gothic/Arial
- EMPTY FIELD RULE enforced: all conditional sections hidden when data absent
  - No NDIS row if not NDIS or no number
  - No Funding row if no funding scheme
  - No notes section if empty
  - No terms section if empty
  - No footer address/contact lines if no business data
- Preview window: separate BrowserWindow with toolbar buttons
  - Upload to Cliniko, Save Local Copy, Print, Back to Edit
  - PDF displayed via iframe with base64 data URL
  - Separate preload-preview.js with minimal API surface
  - Back to Edit closes preview, returns to form with data intact
- Generate Quote flow: renderer validates → IPC to main → PDFGenerator renders HTML
  in hidden BrowserWindow → printToPDF → save to temp dir → open preview window
- Loading state: "Generating..." spinner on button while PDF is being created
- QuoteBuilder passes generating prop to disable button during generation

## Session 6 Notes

- Upload to Cliniko: 3-step process with per-step progress UI
  - Step 1: GET presigned post URL from Cliniko API
  - Step 2: POST file to S3 with all presigned fields, extract Key from XML response
  - Step 3: POST patient_attachment record to Cliniko linking upload to patient
  - Each step has a dedicated IPC handler (upload-step1-presigned, upload-step2-s3, upload-step3-attach)
  - Modal overlay with step indicators: spinner while active, tick when done, X on error
- Per-step error handling with clear user-facing messages:
  - Step 1 fail: "Could not connect to Cliniko..."
  - Step 2 fail: "File upload failed..."
  - Step 3 fail: "File was uploaded but could not be linked... File reference: {s3Key}"
  - Retry button re-runs the full upload from step 1
- Upload success screen:
  - Green tick icon
  - "Quote {number} uploaded to {patient_name}'s file in Cliniko."
  - "Create Another Quote" button: closes preview, resets all form state
  - "View in Cliniko" button: opens patient page in system browser
    (https://app.{shard}.cliniko.com/patients/{internal_id})
- Save Local Copy:
  - Default filename: "Quote-{quoteNumber}-{lastName}.pdf"
  - Default location: user's Documents folder
  - Save dialog parented to preview window
  - Confirmation: "Saved to: {path}"
- Print:
  - Loads PDF as base64 data URL in hidden BrowserWindow
  - Uses webContents.print() with success/failure callback
- Create Another Quote flow:
  - Preview window sends IPC to main process
  - Main process closes preview, sends 'reset-for-new-quote' event to main window
  - Renderer listens via onResetForNewQuote callback
  - Clears patient state, increments resetKey to force QuoteBuilder remount
  - All line items, notes, terms, validity reset to defaults
  - Patient lookup input cleared, app ready for next quote
- patient_id uses internal Cliniko ID (not old_reference_id)
- quote description format: "Quote {number} — {date}"
- shell.openExternal for "View in Cliniko" link

## Session 7 Notes

- Keyboard shortcuts: Ctrl+N (new quote with confirmation), Enter in ref field (patient lookup)
- Confirmation dialog before clearing a quote in progress (if patient loaded)
- About dialog: app name, version, logo, "Built by KDNA — Krull Design & Advertising"
  - Accessible via "About" link in footer
- ErrorBoundary: wraps entire React app, catches unhandled errors
  - Shows friendly "Something went wrong" message
  - "Copy Error Details" button for debugging
  - "Restart App" button to reload
- File logger: rotating log (max 1MB) at userData/fif-quote.log
  - Catches uncaughtException and unhandledRejection in main process
  - Renderer errors logged via logError IPC
- Memory cleanup: before-quit event purges all cached data
- Diagnostics panel in Settings (Run Diagnostics button):
  - Test 1: API Connection (GET /businesses, reports count)
  - Test 2: Patient Lookup (prompts for ref, reports field count)
  - Test 3: Billable Items (reports count)
  - Test 4: Products (all pages, reports count)
  - Test 5: PDF Generation (dummy quote, creates PDF)
  - Test 6: Upload Dry Run (steps 1-2 only, no attachment created)
  - Results in pass/fail table with spinner/status per test
- Packaging (electron-builder):
  - appId: com.feetinfocus.quotegenerator
  - productName: FIF Quote Generator
  - Windows NSIS installer target
  - build:win script added (npm run build:win)
  - Placeholder icon documented in build/ICON_PLACEHOLDER.md
  - No auto-update, no code signing for v1
- form-data added as explicit dependency (was transitive via puppeteer-core)
- puppeteer-core removed from dependencies (not used — Electron printToPDF used instead)
- README.md fully rewritten: prerequisites, setup, first launch, daily usage,
  keyboard shortcuts, project structure, brand assets, security, troubleshooting, diagnostics
