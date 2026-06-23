'use client';

import React from 'react';

interface LockFundsButtonProps {
  onClick: () => Promise<void>;
  loading: boolean;
  disabled?: boolean;
}

export default function LockFundsButton({ onClick, loading, disabled = false }: LockFundsButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full py-3 px-6 rounded-xl font-bold transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
        disabled || loading
          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
          : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white active:scale-98'
      }`}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Đang gửi giao dịch khóa tiền...
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Đồng ý & Khóa tiền
        </>
      )}
    </button>
  );
}
