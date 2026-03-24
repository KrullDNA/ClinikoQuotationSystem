import React from 'react';

// Placeholder component - will be replaced with actual screens in later sessions
export default function Placeholder({ message }) {
  return (
    <div className="flex items-center justify-center p-8 text-gray-500">
      <p>{message || 'Component coming soon...'}</p>
    </div>
  );
}
