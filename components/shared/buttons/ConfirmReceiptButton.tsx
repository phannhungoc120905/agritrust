'use client';

import React from 'react';

interface ConfirmReceiptButtonProps {
  onClick: () => Promise<void>;
  loading: boolean;
  disabled?: boolean;
}

export default function ConfirmReceiptButton({ onClick, loading, disabled = false }: ConfirmReceiptButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`py-3 px-6 rounded-xl font-bold transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
        disabled || loading
          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
          : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white active:scale-98'
      }`}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Đang xác nhận giải ngân...
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Xác nhận Nhận đủ & Giải ngân 100%
        </>
      )}
    </button>
  );
}
