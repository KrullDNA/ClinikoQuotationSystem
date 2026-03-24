import React, { useState, useRef } from 'react';

function fmt(num) {
  return num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toggleBold(inputRef, currentValue, updateFn) {
  const input = inputRef.current;
  if (!input) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const val = currentValue || '';

  if (start !== end) {
    // Text is selected — toggle bold on selection
    const before = val.slice(0, start);
    const selected = val.slice(start, end);
    const after = val.slice(end);

    if (selected.startsWith('**') && selected.endsWith('**') && selected.length > 4) {
      // Remove bold from selection
      const unbolded = selected.slice(2, -2);
      updateFn(before + unbolded + after);
    } else if (before.endsWith('**') && after.startsWith('**')) {
      // Remove surrounding bold markers
      updateFn(before.slice(0, -2) + selected + after.slice(2));
    } else {
      // Add bold
      updateFn(before + '**' + selected + '**' + after);
    }
  } else {
    // No selection — toggle bold on entire value
    if (val.startsWith('**') && val.endsWith('**') && val.length > 4) {
      updateFn(val.slice(2, -2));
    } else {
      updateFn('**' + val + '**');
    }
  }
  // Re-focus the input after toggle
  setTimeout(() => input.focus(), 0);
}

function BoldButton({ inputRef, value, onUpdate }) {
  const isBold = value && value.startsWith('**') && value.endsWith('**') && value.length > 4;
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => toggleBold(inputRef, value, onUpdate)}
      className={`px-1.5 py-0.5 text-xs font-bold rounded border transition-colors mt-0.5
        ${isBold
          ? 'bg-brand-100 text-brand-700 border-brand-300'
          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
        }`}
      title="Toggle bold (select text first to bold part of it)"
    >
      B
    </button>
  );
}

function LineItemRow({ item, index, onChange, onDelete, onDragStart, onDragOver, onDragEnd, onDrop, isDragOver }) {
  const qty = item.qty || 1;
  const unitCost = item.unitCost || 0;
  const gstRate = item.hasGst ? 0.10 : 0;
  const subtotal = qty * unitCost;
  const gstAmount = subtotal * gstRate;
  const total = subtotal + gstAmount;

  const itemCodeRef = useRef(null);
  const descriptionRef = useRef(null);

  function update(field, value) {
    onChange(index, { ...item, [field]: value });
  }

  return (
    <tr
      className={`border-b border-slate-100 hover:bg-slate-50/50 ${isDragOver ? 'bg-brand-50 border-t-2 border-t-brand-400' : ''}`}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
    >
      {/* Drag handle — only this cell is draggable */}
      <td
        className="py-2 px-1 align-top w-8 cursor-grab active:cursor-grabbing"
        draggable
        onDragStart={(e) => {
          // Set drag data on the row's parent tr
          e.dataTransfer.effectAllowed = 'move';
          onDragStart(e, index);
        }}
        onDragEnd={onDragEnd}
      >
        <svg className="w-4 h-4 text-slate-300 mt-1" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="6" r="1.5"/>
          <circle cx="15" cy="6" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/>
          <circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="18" r="1.5"/>
          <circle cx="15" cy="18" r="1.5"/>
        </svg>
      </td>

      {/* Item Code + Category (editable) */}
      <td className="py-2 px-2 align-top">
        <input
          ref={itemCodeRef}
          type="text"
          value={item.itemCode || ''}
          onChange={(e) => update('itemCode', e.target.value)}
          placeholder="Item code"
          className="w-full px-2 py-1 text-sm font-mono border border-slate-200 rounded
                     focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
        />
        <div className="flex items-center justify-between mt-0.5">
          <div className="text-xs text-slate-400">{item.category || ''}</div>
          <BoldButton inputRef={itemCodeRef} value={item.itemCode} onUpdate={(v) => update('itemCode', v)} />
        </div>
      </td>

      {/* Description (editable) */}
      <td className="py-2 px-2 align-top">
        <input
          ref={descriptionRef}
          type="text"
          value={item.description}
          onChange={(e) => update('description', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-slate-200 rounded
                     focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
        />
        <div className="flex justify-end mt-0.5">
          <BoldButton inputRef={descriptionRef} value={item.description} onUpdate={(v) => update('description', v)} />
        </div>
      </td>

      {/* Qty (editable) */}
      <td className="py-2 px-2 align-top w-20">
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={qty}
          onChange={(e) => update('qty', Math.max(0.01, parseFloat(e.target.value) || 1))}
          className="w-full px-2 py-1 text-sm text-center border border-slate-200 rounded
                     focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
        />
      </td>

      {/* Unit Cost (editable) */}
      <td className="py-2 px-2 align-top w-28">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={unitCost}
            onChange={(e) => update('unitCost', parseFloat(e.target.value) || 0)}
            className="w-full pl-6 pr-2 py-1 text-sm text-right border border-slate-200 rounded
                       focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
      </td>

      {/* GST (toggle + amount) */}
      <td className="py-2 px-2 align-top w-24 text-right">
        <button
          type="button"
          onClick={() => update('hasGst', !item.hasGst)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            item.hasGst
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
          }`}
          title="Toggle GST"
        >
          {gstAmount > 0 ? `$${fmt(gstAmount)}` : '$ -'}
        </button>
      </td>

      {/* Total */}
      <td className="py-2 px-2 align-top w-28 text-right">
        <span className="text-sm font-medium text-slate-800">${fmt(total)}</span>
      </td>

      {/* Delete */}
      <td className="py-2 px-2 align-top w-10">
        <button
          type="button"
          onClick={() => onDelete(index)}
          className="p-1 text-slate-300 hover:text-red-500 transition-colors rounded
                     hover:bg-red-50"
          title="Remove item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

export default function LineItemsTable({ lineItems, onChange, onDelete, onAddCustom, onReorder }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  function handleDragStart(e, index) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag image slightly transparent
    if (e.target && e.target.style) {
      setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
    }
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== dragOverIndex) {
      setDragOverIndex(index);
    }
  }

  function handleDragEnd(e) {
    if (e.target && e.target.style) {
      e.target.style.opacity = '1';
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDrop(e, toIndex) {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== toIndex && onReorder) {
      onReorder(dragIndex, toIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  // Calculate totals
  const totalAmount = lineItems.reduce((sum, item) => {
    const qty = item.qty || 1;
    const unitCost = item.unitCost || 0;
    const gstRate = item.hasGst ? 0.10 : 0;
    const subtotal = qty * unitCost;
    return sum + subtotal + (subtotal * gstRate);
  }, 0);

  return (
    <div>
      {lineItems.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="w-8 py-2 px-1"></th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide py-2 px-2 w-28">Item</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide py-2 px-2">Description</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wide py-2 px-2 w-20">Qty</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide py-2 px-2 w-28">Unit Cost</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide py-2 px-2 w-24">GST</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide py-2 px-2 w-28">Total</th>
                <th className="w-10 py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  onChange={onChange}
                  onDelete={onDelete}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  isDragOver={dragOverIndex === index && dragIndex !== index}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lineItems.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-400">No line items yet. Use the search above or add a custom item.</p>
        </div>
      )}

      {/* Add Custom Item button */}
      <div className="mt-3 flex items-center">
        <button
          type="button"
          onClick={onAddCustom}
          className="text-sm text-brand-500 hover:text-brand-700 font-medium flex items-center space-x-1
                     hover:bg-brand-50 px-2 py-1 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Custom Item</span>
        </button>
      </div>

      {/* Totals */}
      {lineItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
          <div className="text-right">
            <div className="flex items-baseline space-x-4">
              <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Amount</span>
              <span className="text-xl font-bold text-slate-800">${fmt(totalAmount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
