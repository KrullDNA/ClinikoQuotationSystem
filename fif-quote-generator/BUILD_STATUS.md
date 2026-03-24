# FIF Quote Generator — Build Status

| Session | Description                          | Status         | Deviations |
|---------|--------------------------------------|----------------|------------|
| 1       | Project Scaffolding + Security Arch  | **Complete**   | No deviations. |
| 2       | Settings + PIN Authentication        | **Complete**   | No deviations. |
| 3       | Patient Lookup + Display             | **Complete**   | No deviations. |
| 4       | Line Items Table                     | **Complete**   | No deviations. |
| 5       | PDF Generation                       | Ready to Start | — |
| 6       | Upload + Save + Print                | Not Started    | — |
| 7       | Polish + Packaging + Testing         | Not Started    | — |

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
