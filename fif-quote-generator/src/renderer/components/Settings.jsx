import React, { useState, useEffect, useCallback } from 'react';

function DiagnosticsPanel() {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [patientRef, setPatientRef] = useState('');
  const [showRefPrompt, setShowRefPrompt] = useState(false);

  const tests = [
    { id: 'api', name: 'API Connection', run: () => window.api.diagApiConnection(), format: (d) => `${d.count} businesses found` },
    { id: 'patient', name: 'Patient Lookup', run: (ref) => window.api.diagPatientLookup(ref), format: (d) => d.found ? `Found — ${d.fieldCount} fields` : 'No patient found' },
    { id: 'billable', name: 'Billable Items', run: () => window.api.diagBillableItems(), format: (d) => `${d.count} items` },
    { id: 'products', name: 'Products', run: () => window.api.diagProducts(), format: (d) => `${d.count} products` },
    { id: 'pdf', name: 'PDF Generation', run: () => window.api.diagPdfGeneration(), format: (d) => 'PDF created' },
    { id: 'upload', name: 'Upload Dry Run', run: () => window.api.diagUploadDryRun(), format: (d) => d.message }
  ];

  async function runAllTests(ref) {
    setRunning(true);
    const newResults = [];
    for (const test of tests) {
      newResults.push({ id: test.id, name: test.name, status: 'running', detail: '' });
      setResults([...newResults]);
      try {
        const result = test.id === 'patient' ? await test.run(ref || '0000') : await test.run();
        const idx = newResults.length - 1;
        if (result.success) {
          newResults[idx] = { ...newResults[idx], status: 'pass', detail: test.format(result.data) };
        } else {
          newResults[idx] = { ...newResults[idx], status: 'fail', detail: result.error };
        }
      } catch (err) {
        const idx = newResults.length - 1;
        newResults[idx] = { ...newResults[idx], status: 'fail', detail: err.message };
      }
      setResults([...newResults]);
    }
    setRunning(false);
  }

  function handleStart() {
    setShowRefPrompt(true);
  }

  function handleRunWithRef() {
    setShowRefPrompt(false);
    runAllTests(patientRef);
  }

  return (
    <div>
      {!showRefPrompt ? (
        <button
          onClick={handleStart}
          disabled={running}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium
                     hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          {running ? 'Running...' : 'Run Diagnostics'}
        </button>
      ) : (
        <div className="flex items-end gap-2 mb-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Patient ref # for test (optional)</label>
            <input
              type="text"
              value={patientRef}
              onChange={(e) => setPatientRef(e.target.value)}
              placeholder="e.g. 1214"
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-36
                         focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button onClick={handleRunWithRef}
            className="px-4 py-1.5 bg-brand-700 text-white rounded-lg text-sm font-medium
                       hover:bg-brand-800 transition-colors">
            Run
          </button>
          <button onClick={() => setShowRefPrompt(false)}
            className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-sm hover:bg-slate-200">
            Cancel
          </button>
        </div>
      )}

      {results.length > 0 && (
        <table className="w-full mt-3 text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-1.5 text-xs font-medium text-slate-500 uppercase">Test</th>
              <th className="text-center py-1.5 text-xs font-medium text-slate-500 uppercase w-16">Status</th>
              <th className="text-left py-1.5 text-xs font-medium text-slate-500 uppercase">Detail</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="py-2 text-slate-700">{r.name}</td>
                <td className="py-2 text-center">
                  {r.status === 'running' && (
                    <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-brand-500 rounded-full animate-spin" />
                  )}
                  {r.status === 'pass' && (
                    <span className="text-green-600 font-semibold">Pass</span>
                  )}
                  {r.status === 'fail' && (
                    <span className="text-red-600 font-semibold">Fail</span>
                  )}
                </td>
                <td className="py-2 text-xs text-slate-500 break-all">{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const SHARDS = [
  { value: 'au1', label: 'AU1 (Australia)' },
  { value: 'au2', label: 'AU2 (Australia)' },
  { value: 'au3', label: 'AU3 (Australia)' },
  { value: 'uk1', label: 'UK1 (United Kingdom)' },
  { value: 'us1', label: 'US1 (United States)' }
];

export default function Settings({ onBack, isFirstTime }) {
  // Cliniko Connection
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [shard, setShard] = useState('au1');
  const [connectionStatus, setConnectionStatus] = useState(null); // null, 'testing', 'success', 'error'
  const [connectionMessage, setConnectionMessage] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');

  // Quote Defaults
  const [defaultValidity, setDefaultValidity] = useState('30 days');
  const [defaultTerms, setDefaultTerms] = useState('');
  const [logoData, setLogoData] = useState(null);

  // Quote Numbering
  const [nextQuoteNumber, setNextQuoteNumber] = useState('');
  const [quoteSuffix, setQuoteSuffix] = useState('');
  const [quoteNumberPreview, setQuoteNumberPreview] = useState('');

  // Footer / Company Details
  const [footerAddress, setFooterAddress] = useState('');
  const [footerPhone, setFooterPhone] = useState('');
  const [footerFax, setFooterFax] = useState('');
  const [footerEmail, setFooterEmail] = useState('');
  const [footerWebsite, setFooterWebsite] = useState('');

  // Change PIN
  const [showChangePin, setShowChangePin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // Save status
  const [saveStatus, setSaveStatus] = useState(null);

  // Loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const configResult = await window.api.getConfig();
      if (configResult.success) {
        const cfg = configResult.data;
        setShard(cfg.shard || 'au1');
        setSelectedBusiness(cfg.default_business_id || '');
        setDefaultValidity(cfg.default_validity || '30 days');
        setDefaultTerms(cfg.default_terms || '');
        setFooterAddress(cfg.footer_address || '');
        setFooterPhone(cfg.footer_phone || '');
        setFooterFax(cfg.footer_fax || '');
        setFooterEmail(cfg.footer_email || '');
        setFooterWebsite(cfg.footer_website || '');
        setQuoteSuffix(cfg.quote_suffix || '');
        const nextNum = (cfg.quote_counter || 0) + 1;
        setNextQuoteNumber(String(nextNum));
        setQuoteNumberPreview(`${nextNum}${cfg.quote_suffix || ''}`);
      }

      const hasKey = await window.api.hasApiKey();
      if (hasKey.success && hasKey.data) {
        setApiKey('••••••••••••••••');
      }

      const logoResult = await window.api.getLogoData();
      if (logoResult.success && logoResult.data) {
        setLogoData(logoResult.data);
      } else {
        setLogoData(null);
      }
    } catch (err) {
      // Silently handle load errors
    }
    setLoading(false);
  }

  async function handleTestConnection() {
    const testKey = apiKey.includes('••') ? null : apiKey;

    if (!testKey && !apiKey.includes('••')) {
      setConnectionStatus('error');
      setConnectionMessage('Please enter an API key.');
      return;
    }

    setConnectionStatus('testing');
    setConnectionMessage('Testing connection...');
    setBusinesses([]);

    try {
      let result;
      if (testKey) {
        result = await window.api.testConnectionWithKey(testKey, shard);
      } else {
        result = await window.api.testConnection();
      }

      if (result.success) {
        setConnectionStatus('success');
        setConnectionMessage('Connected to Cliniko');
        setBusinesses(result.businesses || []);
        if (result.businesses?.length > 0 && !selectedBusiness) {
          setSelectedBusiness(String(result.businesses[0].id));
        }
      } else {
        setConnectionStatus('error');
        setConnectionMessage(result.error || 'Connection failed.');
      }
    } catch (err) {
      setConnectionStatus('error');
      setConnectionMessage('Connection failed.');
    }
  }

  async function handleSelectLogo() {
    const result = await window.api.selectLogo();
    if (result.success) {
      const logoResult = await window.api.getLogoData();
      if (logoResult.success) {
        setLogoData(logoResult.data);
      }
    }
  }

  async function handleChangePin(e) {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    if (newPin.length !== 4 || confirmNewPin.length !== 4) {
      setPinError('PIN must be 4 digits.');
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinError('New PINs do not match.');
      return;
    }

    const result = await window.api.updatePin(currentPin, newPin);
    if (result.success) {
      setPinSuccess('PIN changed successfully.');
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      setTimeout(() => {
        setShowChangePin(false);
        setPinSuccess('');
      }, 2000);
    } else {
      setPinError(result.error || 'Failed to change PIN.');
    }
  }

  async function handleSave() {
    setSaveStatus('saving');

    try {
      // Save API key if changed (not masked placeholder)
      if (apiKey && !apiKey.includes('••')) {
        await window.api.saveApiKey(apiKey);
      }

      // Save quote counter if changed
      if (nextQuoteNumber) {
        const num = parseInt(nextQuoteNumber, 10);
        if (!isNaN(num) && num > 0) {
          await window.api.setQuoteCounter(num);
        }
      }

      // Save config
      await window.api.saveConfig({
        shard,
        default_business_id: selectedBusiness,
        default_validity: defaultValidity,
        default_terms: defaultTerms,
        quote_suffix: quoteSuffix,
        footer_address: footerAddress,
        footer_phone: footerPhone,
        footer_fax: footerFax,
        footer_email: footerEmail,
        footer_website: footerWebsite
      });

      setSaveStatus('success');

      // On first-time setup, navigate to main app after short delay
      if (isFirstTime) {
        setTimeout(() => onBack(), 800);
      } else {
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (err) {
      setSaveStatus('error');
    }
  }

  function formatBusinessLabel(biz) {
    const parts = [biz.business_name || biz.name];
    if (biz.display_name && biz.display_name !== parts[0]) {
      parts.push(`(${biz.display_name})`);
    }
    if (biz.address?.city) {
      parts.push(`— ${biz.address.city}`);
    }
    return parts.join(' ');
  }

  function pinInput(value, onChange, placeholder) {
    return (
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder={placeholder}
        className="w-full text-center text-xl tracking-[0.4em] font-mono py-2 border border-slate-300 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                   placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-400"
      />
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 pb-24">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Settings</h2>
            <p className="text-sm text-slate-500">Configure your app and Cliniko connection</p>
          </div>
          {!isFirstTime && (
            <button
              onClick={onBack}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
          )}
        </div>

        {isFirstTime && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              Your PIN has been created. Now enter your Cliniko API key and test the connection to get started.
            </p>
          </div>
        )}

        {/* Cliniko Connection */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Cliniko Connection</h3>

          {/* API Key */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onFocus={() => { if (apiKey.includes('••')) setApiKey(''); }}
                placeholder="Enter your Cliniko API key"
                className="w-full pr-10 px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                title={showApiKey ? 'Hide' : 'Show'}
              >
                {showApiKey ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Shard Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Server Region (Shard)</label>
            <div className="flex flex-wrap gap-2">
              {SHARDS.map((s) => (
                <label
                  key={s.value}
                  className={`flex items-center px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors
                    ${shard === s.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                >
                  <input
                    type="radio"
                    name="shard"
                    value={s.value}
                    checked={shard === s.value}
                    onChange={(e) => setShard(e.target.value)}
                    className="sr-only"
                  />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Test Connection */}
          <div className="mb-4">
            <button
              onClick={handleTestConnection}
              disabled={connectionStatus === 'testing'}
              className="bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium
                         hover:bg-brand-800 transition-colors
                         disabled:bg-slate-300 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>

            {connectionStatus && connectionStatus !== 'testing' && (
              <div className={`inline-flex items-center ml-3 text-sm ${
                connectionStatus === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {connectionStatus === 'success' ? (
                  <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {connectionMessage}
              </div>
            )}
          </div>

          {/* Business dropdown */}
          {businesses.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Default Business Location</label>
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">Select a business...</option>
                {businesses.map((biz) => (
                  <option key={biz.id} value={String(biz.id)}>
                    {formatBusinessLabel(biz)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* Quote Defaults */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Quote Defaults</h3>

          {/* Quote Numbering */}
          <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Quote Numbering</h4>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Next Quote Number</label>
                <input
                  type="number"
                  min="1"
                  value={nextQuoteNumber}
                  onChange={(e) => {
                    setNextQuoteNumber(e.target.value);
                    const num = parseInt(e.target.value, 10);
                    if (!isNaN(num) && num > 0) {
                      setQuoteNumberPreview(`${num}${quoteSuffix}`);
                    }
                  }}
                  placeholder="e.g. 1001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <p className="text-xs text-slate-400 mt-1">Override to reset the sequential counter</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Suffix</label>
                <input
                  type="text"
                  value={quoteSuffix}
                  onChange={(e) => {
                    setQuoteSuffix(e.target.value);
                    const num = parseInt(nextQuoteNumber, 10);
                    if (!isNaN(num) && num > 0) {
                      setQuoteNumberPreview(`${num}${e.target.value}`);
                    }
                  }}
                  placeholder="e.g. -FIF"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <p className="text-xs text-slate-400 mt-1">Appended after the number (no spaces)</p>
              </div>
            </div>
            {quoteNumberPreview && (
              <div className="text-sm text-slate-600">
                Preview: <span className="font-mono font-semibold text-slate-800">{quoteNumberPreview}</span>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Quote Validity</label>
            <input
              type="text"
              value={defaultValidity}
              onChange={(e) => setDefaultValidity(e.target.value)}
              placeholder="e.g. 30 days"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Logo</label>
            <div className="flex items-center space-x-4">
              {logoData ? (
                <img
                  src={logoData}
                  alt="Current logo"
                  className="h-16 w-auto object-contain border border-slate-200 rounded-lg p-1"
                  onError={() => setLogoData(null)}
                />
              ) : (
                <div className="h-16 w-24 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-slate-400">No logo</span>
                </div>
              )}
              <button
                onClick={handleSelectLogo}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium
                           hover:bg-slate-200 transition-colors"
              >
                {logoData ? 'Change Logo' : 'Upload Logo'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">PNG recommended, minimum 600px wide</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Terms & Conditions</label>
            <textarea
              value={defaultTerms}
              onChange={(e) => setDefaultTerms(e.target.value)}
              rows={5}
              placeholder="Enter default terms and conditions for quotes..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </section>

        {/* Company / Footer Details */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-800 mb-1">Company Details (PDF Footer)</h3>
          <p className="text-xs text-slate-400 mb-4">These details appear at the bottom of every quote PDF.</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={footerAddress}
              onChange={(e) => setFooterAddress(e.target.value)}
              placeholder="e.g. 123 Smith St, Melbourne VIC 3000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telephone</label>
              <input
                type="text"
                value={footerPhone}
                onChange={(e) => setFooterPhone(e.target.value)}
                placeholder="e.g. (02) 8964 1874"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fax</label>
              <input
                type="text"
                value={footerFax}
                onChange={(e) => setFooterFax(e.target.value)}
                placeholder="e.g. (02) 8068 9716"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={footerEmail}
                onChange={(e) => setFooterEmail(e.target.value)}
                placeholder="e.g. info@example.com.au"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
              <input
                type="text"
                value={footerWebsite}
                onChange={(e) => setFooterWebsite(e.target.value)}
                placeholder="e.g. feetinfocus.com.au"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
        </section>

        {/* Diagnostics */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Diagnostics</h3>
          <DiagnosticsPanel />
        </section>

        {/* Security */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Security</h3>

          {!showChangePin ? (
            <button
              onClick={() => setShowChangePin(true)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium
                         hover:bg-slate-200 transition-colors"
            >
              Change PIN
            </button>
          ) : (
            <form onSubmit={handleChangePin} className="space-y-3 max-w-xs">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Current PIN</label>
                {pinInput(currentPin, setCurrentPin, 'Current PIN')}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">New PIN</label>
                {pinInput(newPin, setNewPin, 'New PIN')}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Confirm New PIN</label>
                {pinInput(confirmNewPin, setConfirmNewPin, 'Confirm PIN')}
              </div>

              {pinError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                  <p className="text-sm text-red-700">{pinError}</p>
                </div>
              )}
              {pinSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                  <p className="text-sm text-green-700">{pinSuccess}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePin(false);
                    setCurrentPin(''); setNewPin(''); setConfirmNewPin('');
                    setPinError(''); setPinSuccess('');
                  }}
                  className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-sm font-medium
                             hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={currentPin.length !== 4 || newPin.length !== 4 || confirmNewPin.length !== 4}
                  className="flex-1 bg-brand-700 text-white py-2 rounded-lg text-sm font-medium
                             hover:bg-brand-800 transition-colors
                             disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Update PIN
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Save Button */}
        <div className="sticky bottom-0 bg-slate-50 pt-4 pb-6 border-t border-slate-200 -mx-6 px-6">
          <div className="flex items-center justify-between">
            <div>
              {saveStatus === 'success' && (
                <span className="text-sm text-green-700 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Settings saved successfully
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-sm text-red-700">Failed to save settings</span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="bg-brand-700 text-white px-6 py-2.5 rounded-lg font-medium
                         hover:bg-brand-800 transition-colors
                         disabled:bg-slate-300 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
