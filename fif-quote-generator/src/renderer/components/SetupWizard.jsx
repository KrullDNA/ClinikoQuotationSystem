import React, { useState, useRef, useEffect } from 'react';

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState('welcome'); // welcome, create-pin, confirm-pin, done
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [step]);

  function handlePinInput(e, setter) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setter(val);
    setError('');
  }

  function handleCreatePin(e) {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('PIN must be 4 digits.');
      return;
    }
    setStep('confirm-pin');
  }

  async function handleConfirmPin(e) {
    e.preventDefault();
    if (confirmPin !== pin) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }

    setLoading(true);
    try {
      const result = await window.api.setupPin(pin);
      if (result.success) {
        onComplete();
      } else {
        setError(result.error || 'Failed to save PIN.');
      }
    } catch (err) {
      setError('An error occurred.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">FIF</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          {step === 'welcome' && (
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                Welcome to FIF Quote Generator
              </h2>
              <p className="text-slate-500 mb-8">
                Let's get you set up. First, you'll create a 4-digit PIN
                to protect access to this application.
              </p>
              <button
                onClick={() => setStep('create-pin')}
                className="bg-brand-700 text-white px-6 py-2.5 rounded-lg font-medium
                           hover:bg-brand-800 transition-colors duration-200
                           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                Get Started
              </button>
            </div>
          )}

          {step === 'create-pin' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-800 text-center mb-2">
                Create your PIN
              </h2>
              <p className="text-sm text-slate-500 text-center mb-6">
                Enter a 4-digit PIN you'll use to unlock the app.
              </p>

              <form onSubmit={handleCreatePin}>
                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => handlePinInput(e, setPin)}
                  placeholder="----"
                  className="w-full text-center text-3xl tracking-[0.5em] font-mono py-3 border border-slate-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                             placeholder:tracking-[0.3em] placeholder:text-slate-300 mb-4"
                  autoFocus
                />

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-center">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => { setStep('welcome'); setPin(''); setError(''); }}
                    className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-medium
                               hover:bg-slate-200 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={pin.length !== 4}
                    className="flex-1 bg-brand-700 text-white py-2.5 rounded-lg font-medium
                               hover:bg-brand-800 transition-colors
                               disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 'confirm-pin' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-800 text-center mb-2">
                Confirm your PIN
              </h2>
              <p className="text-sm text-slate-500 text-center mb-6">
                Enter the same 4-digit PIN again to confirm.
              </p>

              <form onSubmit={handleConfirmPin}>
                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => handlePinInput(e, setConfirmPin)}
                  placeholder="----"
                  className="w-full text-center text-3xl tracking-[0.5em] font-mono py-3 border border-slate-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                             placeholder:tracking-[0.3em] placeholder:text-slate-300 mb-4"
                  autoFocus
                />

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-center">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => { setStep('create-pin'); setConfirmPin(''); setError(''); }}
                    className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-medium
                               hover:bg-slate-200 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={confirmPin.length !== 4 || loading}
                    className="flex-1 bg-brand-700 text-white py-2.5 rounded-lg font-medium
                               hover:bg-brand-800 transition-colors
                               disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Create PIN'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step indicator */}
          <div className="flex justify-center mt-6 space-x-2">
            {['welcome', 'create-pin', 'confirm-pin'].map((s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  s === step ? 'bg-brand-700' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
