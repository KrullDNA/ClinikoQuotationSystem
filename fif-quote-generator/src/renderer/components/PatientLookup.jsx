import React, { useState, useRef } from 'react';

export default function PatientLookup({ onPatientFound, onClear, hasPatient }) {
  const [refNumber, setRefNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleLookup(e) {
    if (e) e.preventDefault();
    const trimmed = refNumber.trim();
    if (!trimmed) return;

    setError(null);
    setLoading(true);

    try {
      // Check if API key is configured
      const hasKey = await window.api.hasApiKey();
      if (!hasKey.success || !hasKey.data) {
        setError('Please configure your API key in Settings first.');
        setLoading(false);
        return;
      }

      const result = await window.api.lookupPatient(trimmed);

      if (!result.success) {
        // API error
        if (result.error && result.error.includes('API key')) {
          setError('Please configure your API key in Settings first.');
        } else {
          setError('Could not connect to Cliniko. Check your connection.');
        }
      } else if (!result.data) {
        // No patient found
        setError(`No patient found with reference number ${trimmed}`);
      } else {
        // Success
        onPatientFound(result.data);
      }
    } catch (err) {
      setError('Could not connect to Cliniko. Check your connection.');
    }

    setLoading(false);
  }

  function handleClear() {
    setRefNumber('');
    setError(null);
    onClear();
    if (inputRef.current) inputRef.current.focus();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Patient Lookup</h3>
        {hasPatient && (
          <button
            onClick={handleClear}
            className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center space-x-1
                       hover:bg-red-50 px-2 py-1 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Clear Patient</span>
          </button>
        )}
      </div>

      <form onSubmit={handleLookup} className="flex space-x-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={refNumber}
            onChange={(e) => { setRefNumber(e.target.value); setError(null); }}
            placeholder="Patient Reference Number"
            disabled={loading}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                       disabled:bg-slate-100 disabled:text-slate-400
                       placeholder:text-slate-400"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={!refNumber.trim() || loading}
          className="bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium
                     hover:bg-brand-800 transition-colors
                     disabled:bg-slate-300 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                     flex items-center space-x-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Looking up...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Lookup</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
          <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
