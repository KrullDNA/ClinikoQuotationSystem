import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">FIF Quote Generator</h1>
              <p className="text-xs text-gray-500">Feet in Focus</p>
            </div>
          </div>
          <span className="text-xs text-gray-400 font-mono">v1.0.0</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="card max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Feet in Focus Quote Generator
          </h2>

          <p className="text-gray-500 mb-6">
            Professional quotation tool for Feet in Focus pedorthic practice,
            integrated with Cliniko.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="font-medium text-amber-800">Setup Required</span>
            </div>
            <p className="text-sm text-amber-700">
              Please complete the initial setup to configure your PIN and Cliniko API key.
            </p>
          </div>

          <div className="text-xs text-gray-400 space-y-1">
            <p>Version 1.0.0</p>
            <p>Session 1 — Scaffold Complete</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-xs text-gray-400">Feet in Focus Pty Ltd — ABN 42 148 020 526</p>
          <p className="text-xs text-gray-400">info@feetinfocus.com.au</p>
        </div>
      </footer>
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
