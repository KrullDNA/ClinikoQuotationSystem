import React, { useState, useEffect, useRef } from 'react';

export default function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutEnd, setLockoutEnd] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    checkLockout();
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    if (!lockoutEnd) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, lockoutEnd - Date.now());
      if (remaining <= 0) {
        setLockoutEnd(null);
        setCountdown(0);
        setError('');
        clearInterval(interval);
      } else {
        setCountdown(Math.ceil(remaining / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutEnd]);

  async function checkLockout() {
    const result = await window.api.getLockoutStatus();
    if (result.success && result.data.isLocked) {
      setLockoutEnd(result.data.lockoutUntil);
      setCountdown(Math.ceil(result.data.remainingMs / 1000));
    }
  }

  function handleInput(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (pin.length !== 4 || lockoutEnd) return;

    setLoading(true);
    try {
      const result = await window.api.verifyPin(pin);
      if (result.success && result.data) {
        onUnlock();
      } else if (result.success && !result.data) {
        setError('Incorrect PIN. Please try again.');
        setPin('');
        if (inputRef.current) inputRef.current.focus();
      } else {
        setError(result.error || 'Verification failed.');
        setPin('');
        await checkLockout();
      }
    } catch (err) {
      setError('An error occurred.');
    }
    setLoading(false);
  }

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const isLocked = lockoutEnd && countdown > 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">FIF</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-800">FIF Quote Generator</h1>
          <p className="text-sm text-slate-500 mt-1">Feet in Focus</p>
        </div>

        {/* PIN Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-medium text-slate-800 text-center mb-6">Enter your PIN</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={handleInput}
                disabled={isLocked || loading}
                placeholder="----"
                className="w-full text-center text-3xl tracking-[0.5em] font-mono py-3 border border-slate-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                           disabled:bg-slate-100 disabled:text-slate-400 placeholder:tracking-[0.3em] placeholder:text-slate-300"
                autoFocus
              />
            </div>

            {isLocked && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-center">
                <p className="text-sm font-medium text-red-800">Account Locked</p>
                <p className="text-sm text-red-600 mt-1">
                  Too many failed attempts. Try again in{' '}
                  <span className="font-mono font-semibold">{formatCountdown(countdown)}</span>
                </p>
              </div>
            )}

            {error && !isLocked && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-center">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pin.length !== 4 || isLocked || loading}
              className="w-full bg-brand-700 text-white py-2.5 rounded-lg font-medium
                         hover:bg-brand-800 transition-colors duration-200
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                         disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Unlock'}
            </button>
          </form>
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          Feet in Focus Pty Ltd — ABN 42 148 020 526
        </p>
      </div>
    </div>
  );
}
