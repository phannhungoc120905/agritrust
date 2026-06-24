'use client';

import React from 'react';
import { useEscrow } from '../../hooks/useEscrow';

interface ConfirmReceiptButtonProps {
  contractId: string;
  buyerAddress: string;
  sellerAddress: string;
  onSuccess: (txSig: string) => void;
}

export default function ConfirmReceiptButton({
  contractId,
  buyerAddress,
  sellerAddress,
  onSuccess,
}: ConfirmReceiptButtonProps) {
  const { confirmReceipt, loading } = useEscrow();

  const handleConfirm = async () => {
    try {
      const result = await confirmReceipt(contractId, buyerAddress, sellerAddress);
      if (result.success) {
        onSuccess(result.txSignature);
      }
    } catch (err) {
      console.error('Lỗi khi gọi xác nhận nhận hàng và giải ngân:', err);
    }
  };

  return (
    <button
      onClick={handleConfirm}
      disabled={loading}
      className={`py-3 px-6 rounded-xl font-bold transition-all duration-300 shadow-md flex items-center justify-center gap-2 text-xs border ${
        loading
          ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
          : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white active:scale-98 cursor-pointer border-transparent'
      }`}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Confirming payout...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Confirm Full Receipt & Release 100%
        </>
      )}
    </button>
  );
}
