import React from 'react';

export default function AppHeader({ onSettingsClick, logoData, onLogoError }) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex-shrink-0">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center space-x-3">
          {logoData ? (
            <img
              src={logoData}
              alt="Logo"
              className="h-10 w-auto object-contain"
              onError={() => onLogoError && onLogoError()}
            />
          ) : (
            <div className="w-10 h-10 bg-brand-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FIF</span>
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-slate-800">FIF Quote Generator</h1>
            <p className="text-xs text-slate-400">Feet in Focus</p>
          </div>
        </div>

        <button
          onClick={onSettingsClick}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg
                     transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
