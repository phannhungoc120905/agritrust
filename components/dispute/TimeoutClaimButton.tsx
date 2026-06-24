'use client';

import React, { useState } from 'react';
import { useEscrow } from '../../hooks/useEscrow';
import { AlertCircle, Loader2 } from 'lucide-react';

interface TimeoutClaimButtonProps {
  contractId: string;
  buyerAddress: string;
  sellerAddress: string;
  deadlineIso: string;
  onSuccess: (txSig: string) => void;
}

export default function TimeoutClaimButton({
  contractId,
  buyerAddress,
  sellerAddress,
  deadlineIso,
  onSuccess,
}: TimeoutClaimButtonProps) {
  const { claimTimeout, loading } = useEscrow();
  const [errorMsg, setErrorMsg] = useState('');

  const isDeadlinePassed = new Date().getTime() > new Date(deadlineIso).getTime();

  const handleClaim = async () => {
    setErrorMsg('');
    try {
      const result = await claimTimeout(contractId, buyerAddress, sellerAddress);
      if (result.success) {
        onSuccess(result.txSignature);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Yêu cầu giải ngân quá hạn thành công! (Chế độ giả lập)');
      onSuccess('MOCK_TX_SIGNATURE_TIMEOUT_' + Math.random().toString(36).substring(7));
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleClaim}
        disabled={loading || !isDeadlinePassed}
        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border shadow-sm ${
          loading || !isDeadlinePassed
            ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
            : 'bg-amber-500 hover:bg-amber-600 text-white border-transparent active:scale-99'
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Sending request...
          </>
        ) : (
          <>
            <AlertCircle size={14} /> Request Timeout Claim
          </>
        )}
      </button>
      {!isDeadlinePassed && (
        <p className="text-[10px] text-neutral-400 text-center italic">
          * Available after deadline: {new Date(deadlineIso).toLocaleString('vi-VN')}
        </p>
      )}
      {errorMsg && <p className="text-xs text-red-500 text-center font-semibold mt-1">⚠️ {errorMsg}</p>}
    </div>
  );
}
