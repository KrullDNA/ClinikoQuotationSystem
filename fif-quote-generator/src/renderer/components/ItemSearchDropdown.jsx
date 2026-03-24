import React, { useState, useRef, useEffect } from 'react';

export default function ItemSearchDropdown({ billableItems, products, onSelect }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Build grouped + filtered list
  const filteredItems = buildFilteredList(query, billableItems, products);
  const flatItems = filteredItems.flatMap(group =>
    group.items.map(item => ({ ...item, groupType: group.type }))
  );

  useEffect(() => {
    function handleClickOutside(e) {
      if (listRef.current && !listRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [query]);

  function handleKeyDown(e) {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(flatItems[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  function handleSelect(item) {
    onSelect(item);
    setQuery('');
    setIsOpen(false);
    setHighlightIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  }

  const hasItems = billableItems.length > 0 || products.length > 0;

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">Add Line Item</label>
      <div className="relative">
        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={hasItems ? 'Search by item code or name...' : 'No items loaded'}
          disabled={!hasItems}
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                     disabled:bg-slate-100 disabled:text-slate-400
                     placeholder:text-slate-400"
        />
      </div>

      {isOpen && filteredItems.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg
                     max-h-72 overflow-y-auto"
        >
          {filteredItems.map((group) => (
            <div key={group.type}>
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 sticky top-0">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {group.label} ({group.items.length})
                </span>
              </div>
              {group.items.map((item) => {
                const globalIdx = flatItems.indexOf(
                  flatItems.find(f => f._id === item._id && f.groupType === group.type)
                );
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-50 transition-colors
                      border-b border-slate-50 last:border-b-0
                      ${globalIdx === highlightIndex ? 'bg-brand-50' : ''}`}
                  >
                    <span className="font-mono text-xs text-brand-600 mr-2">
                      {item.item_code || '—'}
                    </span>
                    <span className="text-slate-800">{item.name}</span>
                    <span className="text-slate-400 ml-2 text-xs">
                      ${formatPrice(item.unitPrice)}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {isOpen && query && filteredItems.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center">
          <p className="text-sm text-slate-400">No items match "{query}"</p>
        </div>
      )}
    </div>
  );
}

function buildFilteredList(query, billableItems, products) {
  const q = query.toLowerCase().trim();
  const groups = [];

  const filterFn = (item) => {
    if (!q) return true;
    const code = (item.item_code || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return code.includes(q) || name.includes(q);
  };

  // Services (billable items)
  const services = (billableItems || [])
    .map(item => ({
      _id: `service-${item.id}`,
      sourceType: 'service',
      sourceId: item.id,
      item_code: item.item_code || '',
      name: item.name || '',
      unitPrice: parseFloat(item.price) || 0,
      hasGst: !!(item.tax && item.tax.links && item.tax.links.self),
      category: 'Service'
    }))
    .filter(filterFn);

  if (services.length > 0) {
    groups.push({ type: 'services', label: 'Services', items: services });
  }

  // Products
  const prods = (products || [])
    .map(item => {
      const priceEx = parseFloat(item.price_ex_tax) || 0;
      const priceInc = parseFloat(item.price_including_tax) || 0;
      return {
        _id: `product-${item.id}`,
        sourceType: 'product',
        sourceId: item.id,
        item_code: item.item_code || '',
        name: item.name || '',
        unitPrice: priceEx,
        hasGst: priceEx !== priceInc,
        category: item.product_supplier_name || 'Product'
      };
    })
    .filter(filterFn);

  if (prods.length > 0) {
    groups.push({ type: 'products', label: 'Products', items: prods });
  }

  return groups;
}

function formatPrice(num) {
  return num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
