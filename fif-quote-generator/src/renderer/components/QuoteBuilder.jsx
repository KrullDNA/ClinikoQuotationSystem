import React, { useState, useEffect } from 'react';
import ItemSearchDropdown from './ItemSearchDropdown';
import LineItemsTable from './LineItemsTable';

let nextRowId = 1;

function generateRowId() {
  return `row-${nextRowId++}-${Date.now()}`;
}

export default function QuoteBuilder({
  patient,
  clinikoData,
  onGenerateQuote
}) {
  const { billableItems, products, businesses } = clinikoData;

  // Quote fields
  const [quoteNumber, setQuoteNumber] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [lineItems, setLineItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [validity, setValidity] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  // Load defaults from config
  useEffect(() => {
    loadDefaults();
  }, []);

  async function loadDefaults() {
    try {
      const result = await window.api.getConfig();
      if (result.success) {
        const cfg = result.data;
        setTerms(cfg.default_terms || '');
        setValidity(cfg.default_validity || '30 days');
        if (cfg.default_business_id) {
          setSelectedBusinessId(cfg.default_business_id);
        }
      }
    } catch (err) {
      // Use defaults
    }
  }

  // Default to first business if none selected
  useEffect(() => {
    if (!selectedBusinessId && businesses.length > 0) {
      setSelectedBusinessId(String(businesses[0].id));
    }
  }, [businesses]);

  function handleItemSelect(item) {
    const newRow = {
      id: generateRowId(),
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      itemCode: item.item_code,
      category: item.category,
      description: item.name,
      qty: 1,
      unitCost: item.unitPrice,
      hasGst: item.hasGst
    };
    setLineItems(prev => [...prev, newRow]);
    setValidationErrors([]);
  }

  function handleAddCustom() {
    const newRow = {
      id: generateRowId(),
      sourceType: 'custom',
      sourceId: null,
      itemCode: '',
      category: 'Custom',
      description: '',
      qty: 1,
      unitCost: 0,
      hasGst: false
    };
    setLineItems(prev => [...prev, newRow]);
    setValidationErrors([]);
  }

  function handleLineItemChange(index, updatedItem) {
    setLineItems(prev => {
      const next = [...prev];
      next[index] = updatedItem;
      return next;
    });
  }

  function handleLineItemDelete(index) {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  }

  function handleGenerate() {
    const errors = [];
    if (!patient) errors.push('Please look up a patient first.');
    if (lineItems.length === 0) errors.push('Please add at least one line item.');
    if (!quoteNumber.trim()) errors.push('Please enter a quote number.');

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);

    // Calculate totals
    const totalAmount = lineItems.reduce((sum, item) => {
      const qty = item.qty || 1;
      const unitCost = item.unitCost || 0;
      const gstRate = item.hasGst ? 0.10 : 0;
      const subtotal = qty * unitCost;
      return sum + subtotal + (subtotal * gstRate);
    }, 0);

    const selectedBusiness = businesses.find(b => String(b.id) === selectedBusinessId) || businesses[0] || null;

    const quoteData = {
      quoteNumber: quoteNumber.trim(),
      patient,
      business: selectedBusiness,
      lineItems: lineItems.map(item => ({
        itemCode: item.itemCode,
        category: item.category,
        description: item.description,
        qty: item.qty,
        unitCost: item.unitCost,
        hasGst: item.hasGst,
        gstAmount: item.hasGst ? (item.qty * item.unitCost * 0.10) : 0,
        total: (item.qty * item.unitCost) + (item.hasGst ? item.qty * item.unitCost * 0.10 : 0)
      })),
      totalAmount,
      notes: notes.trim(),
      terms: terms.trim(),
      validity: validity.trim(),
      date: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };

    onGenerateQuote(quoteData);
  }

  function formatBusinessLabel(biz) {
    const parts = [biz.business_name || biz.name];
    if (biz.display_name && biz.display_name !== parts[0]) {
      parts.push(`(${biz.display_name})`);
    }
    if (biz.address?.city) {
      parts.push(`\u2014 ${biz.address.city}`);
    }
    return parts.join(' ');
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Quote Number + Business Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quote Number <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={quoteNumber}
              onChange={(e) => { setQuoteNumber(e.target.value); setValidationErrors([]); }}
              placeholder="e.g. 1110, FIF-0042"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                         placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Location</label>
            <select
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              {businesses.map((biz) => (
                <option key={biz.id} value={String(biz.id)}>
                  {formatBusinessLabel(biz)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Line Items</h3>

        {/* Searchable dropdown */}
        <div className="mb-4">
          <ItemSearchDropdown
            billableItems={billableItems}
            products={products}
            onSelect={handleItemSelect}
          />
        </div>

        {/* Table */}
        <LineItemsTable
          lineItems={lineItems}
          onChange={handleLineItemChange}
          onDelete={handleLineItemDelete}
          onAddCustom={handleAddCustom}
        />
      </div>

      {/* Additional fields */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes / Special Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes for this quote..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                         placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Terms & Conditions
            </label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={4}
              placeholder="Terms and conditions..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                         placeholder:text-slate-400"
            />
          </div>

          <div className="max-w-xs">
            <label className="block text-sm font-medium text-slate-700 mb-1">Quote Validity</label>
            <input
              type="text"
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
              placeholder="e.g. 30 days"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                         placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800 mb-1">Cannot generate quote:</p>
          <ul className="text-sm text-red-700 list-disc list-inside space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Generate button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleGenerate}
          className="bg-brand-700 text-white px-8 py-3 rounded-lg font-medium text-sm
                     hover:bg-brand-800 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                     flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Generate Quote</span>
        </button>
      </div>
    </div>
  );
}
