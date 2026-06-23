'use client';

import React from 'react';

interface AgreeButtonProps {
  onClick: () => Promise<void>;
  loading: boolean;
  disabled?: boolean;
  label: string;
}

export default function AgreeButton({ onClick, loading, disabled = false, label }: AgreeButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`py-2.5 px-5 rounded-xl font-semibold transition-all duration-300 shadow-sm flex items-center justify-center gap-2 ${
        disabled || loading
          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
          : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-98'
      }`}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Đang thực thi...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 9L9 7M15 5l-4-3-4 3" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
