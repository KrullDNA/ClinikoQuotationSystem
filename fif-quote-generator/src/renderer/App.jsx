import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import PinScreen from './components/PinScreen';
import SetupWizard from './components/SetupWizard';
import Settings from './components/Settings';
import AppHeader from './components/AppHeader';
import PatientLookup from './components/PatientLookup';
import PatientDetails from './components/PatientDetails';
import { parsePatient } from './utils/parsePatient';

function App() {
  // App state: 'loading' | 'setup' | 'pin' | 'settings-first' | 'main' | 'settings'
  const [screen, setScreen] = useState('loading');
  const [logoData, setLogoData] = useState(null);

  // Patient state — held in memory only
  const [patient, setPatient] = useState(null);

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

  function handleUnlock() {
    loadLogo();
    setScreen('main');
  }

  function handleSetupComplete() {
    setScreen('settings-first');
  }

  function handleSettingsBack() {
    loadLogo();
    setScreen('main');
  }

  function handlePatientFound(rawPatient) {
    const parsed = parsePatient(rawPatient);
    setPatient(parsed);
  }

  function handleClearPatient() {
    // Purge ALL patient data from state
    setPatient(null);
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
          {/* Patient Lookup */}
          <PatientLookup
            onPatientFound={handlePatientFound}
            onClear={handleClearPatient}
            hasPatient={!!patient}
          />

          {/* Patient Details Card */}
          <PatientDetails patient={patient} />

          {/* Placeholder for Session 4: Line Items Table */}
          {patient && (
            <div className="mt-4 bg-white rounded-xl border border-slate-200 border-dashed p-8 text-center">
              <p className="text-sm text-slate-400">
                Line items table will appear here (Session 4)
              </p>
            </div>
          )}
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
