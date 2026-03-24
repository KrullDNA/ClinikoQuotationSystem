import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import PinScreen from './components/PinScreen';
import SetupWizard from './components/SetupWizard';
import Settings from './components/Settings';
import AppHeader from './components/AppHeader';
import PatientLookup from './components/PatientLookup';
import PatientDetails from './components/PatientDetails';
import QuoteBuilder from './components/QuoteBuilder';
import { parsePatient } from './utils/parsePatient';

function App() {
  // App state: 'loading' | 'setup' | 'pin' | 'settings-first' | 'data-loading' | 'main' | 'settings'
  const [screen, setScreen] = useState('loading');
  const [logoData, setLogoData] = useState(null);

  // Patient state — held in memory only
  const [patient, setPatient] = useState(null);

  // Cliniko data cache (in renderer memory)
  const [clinikoData, setClinikoData] = useState({
    billableItems: [],
    products: [],
    businesses: [],
    taxes: []
  });
  const [dataError, setDataError] = useState(null);

  useEffect(() => {
    checkInitialState();
  }, []);

  async function checkInitialState() {
    try {
      const pinResult = await window.api.hasPin();
      if (pinResult.success && pinResult.data) {
        setScreen('pin');
      } else {
        setScreen('setup');
      }
    } catch (err) {
      setScreen('setup');
    }
  }

  async function loadLogo() {
    try {
      const result = await window.api.getLogoData();
      if (result.success && result.data) {
        setLogoData(result.data);
      }
    } catch (err) {
      // Silently ignore
    }
  }

  async function loadClinikoData() {
    setDataError(null);
    try {
      const hasKey = await window.api.hasApiKey();
      if (!hasKey.success || !hasKey.data) {
        // No API key — skip data loading, go straight to main
        setScreen('main');
        return;
      }

      setScreen('data-loading');
      const result = await window.api.loadAllData();
      if (result.success) {
        setClinikoData(result.data);
      } else {
        setDataError(result.error);
      }
    } catch (err) {
      setDataError('Failed to load Cliniko data.');
    }
    setScreen('main');
  }

  function handleUnlock() {
    loadLogo();
    loadClinikoData();
  }

  function handleSetupComplete() {
    setScreen('settings-first');
  }

  function handleSettingsBack() {
    loadLogo();
    // Reload data in case API key or shard changed
    loadClinikoData();
  }

  function handlePatientFound(rawPatient) {
    const parsed = parsePatient(rawPatient);
    setPatient(parsed);
  }

  function handleClearPatient() {
    setPatient(null);
  }

  const [generating, setGenerating] = useState(false);

  async function handleGenerateQuote(quoteData) {
    if (generating) return;
    setGenerating(true);

    try {
      // Step 1: Generate PDF via main process
      const result = await window.api.generateQuote(quoteData);
      if (!result.success) {
        alert('Failed to generate quote: ' + (result.error || 'Unknown error'));
        setGenerating(false);
        return;
      }

      const pdfPath = result.data;

      // Step 2: Open preview window
      await window.api.openPreview(pdfPath, quoteData);
    } catch (err) {
      alert('Error generating quote: ' + err.message);
    }

    setGenerating(false);
  }

  // Loading state
  if (screen === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">FIF</span>
          </div>
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // First-time setup wizard
  if (screen === 'setup') {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  // PIN unlock screen
  if (screen === 'pin') {
    return <PinScreen onUnlock={handleUnlock} />;
  }

  // First-time settings (after PIN setup, before main app)
  if (screen === 'settings-first') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AppHeader onSettingsClick={() => {}} logoData={logoData} />
        <Settings onBack={handleSettingsBack} isFirstTime={true} />
      </div>
    );
  }

  // Data loading screen
  if (screen === 'data-loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AppHeader onSettingsClick={() => {}} logoData={logoData} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-slate-500 font-medium">Loading Cliniko data...</p>
            <p className="text-xs text-slate-400 mt-1">Fetching services, products, and business info</p>
          </div>
        </main>
      </div>
    );
  }

  // Settings screen (from main app)
  if (screen === 'settings') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AppHeader onSettingsClick={() => setScreen('settings')} logoData={logoData} />
        <Settings onBack={handleSettingsBack} isFirstTime={false} />
      </div>
    );
  }

  // Main app screen
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppHeader onSettingsClick={() => setScreen('settings')} logoData={logoData} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Data loading error banner */}
          {dataError && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-amber-700">Could not load Cliniko data: {dataError}</p>
              </div>
              <button
                onClick={() => loadClinikoData()}
                className="text-xs font-medium text-amber-700 hover:text-amber-800 px-2 py-1 rounded
                           hover:bg-amber-100 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Patient Lookup */}
          <PatientLookup
            onPatientFound={handlePatientFound}
            onClear={handleClearPatient}
            hasPatient={!!patient}
          />

          {/* Patient Details Card */}
          <PatientDetails patient={patient} />

          {/* Quote Builder (line items, business, notes, etc.) */}
          <QuoteBuilder
            patient={patient}
            clinikoData={clinikoData}
            onGenerateQuote={handleGenerateQuote}
            generating={generating}
          />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-xs text-slate-400">Feet in Focus Pty Ltd — ABN 42 148 020 526</p>
          <p className="text-xs text-slate-400">info@feetinfocus.com.au</p>
        </div>
      </footer>
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
