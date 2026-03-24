import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import PinScreen from './components/PinScreen';
import SetupWizard from './components/SetupWizard';
import Settings from './components/Settings';
import AppHeader from './components/AppHeader';

function App() {
  // App state: 'loading' | 'setup' | 'pin' | 'settings-first' | 'main' | 'settings'
  const [screen, setScreen] = useState('loading');
  const [logoData, setLogoData] = useState(null);

  useEffect(() => {
    checkInitialState();
  }, []);

  async function checkInitialState() {
    try {
      const pinResult = await window.api.hasPin();
      if (pinResult.success && pinResult.data) {
        // PIN exists — show PIN screen
        setScreen('pin');
      } else {
        // No PIN — first time setup
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
    // After PIN created, show settings to enter API key
    setScreen('settings-first');
  }

  function handleSettingsBack() {
    loadLogo();
    setScreen('main');
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

  // Main app screen (placeholder for future sessions)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppHeader onSettingsClick={() => setScreen('settings')} logoData={logoData} />

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-semibold text-slate-800 mb-2">
            Ready to Go
          </h2>

          <p className="text-slate-500 mb-6">
            FIF Quote Generator is set up and ready. Patient lookup and
            quote building will be available in the next session.
          </p>

          <div className="text-xs text-slate-400 space-y-1">
            <p>Version 1.0.0</p>
            <p>Sessions 1 & 2 Complete</p>
          </div>
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
