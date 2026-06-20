'use client';

import React, { useState } from 'react';
import { useEscrow } from '../../hooks/useEscrow';
import LockFundsButton from '../shared/buttons/LockFundsButton';
import { convertVndToUsdc } from '../../lib/solana/convertVndUsdc';

interface ConfirmContractButtonProps {
  contractId: string;
  buyerAddress: string;
  sellerAddress: string;
  unitPriceVnd: number;
  expectedQty: number;
  deadlineIso: string;
  onSuccess: (txSig: string) => void;
}

export default function ConfirmContractButton({
  contractId,
  buyerAddress,
  sellerAddress,
  unitPriceVnd,
  expectedQty,
  deadlineIso,
  onSuccess,
}: ConfirmContractButtonProps) {
  const { lockUsdc, loading } = useEscrow();
  const [errorMsg, setErrorMsg] = useState('');

  const handleLockFunds = async () => {
    setErrorMsg('');
    try {
      // 1. Tính toán hạn giao hàng dạng Unix timestamp
      const deadlineTimestamp = Math.floor(new Date(deadlineIso).getTime() / 1000);
      
      // 2. Quy đổi VND -> USDC
      const totalVnd = unitPriceVnd * expectedQty;
      const totalUsdc = convertVndToUsdc(totalVnd);

      // 3. Gọi hook escrow
      const result = await lockUsdc(
        contractId,
        buyerAddress,
        sellerAddress,
        unitPriceVnd,
        expectedQty,
        deadlineTimestamp,
        totalUsdc
      );

      if (result.success) {
        onSuccess(result.txSignature);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi gửi giao dịch khóa tiền escrow.');
    }
  };

  return (
    <div className="space-y-3 w-full">
      <LockFundsButton onClick={handleLockFunds} loading={loading} />
      {errorMsg && (
        <p className="text-xs text-red-500 text-center font-semibold">
          ⚠️ {errorMsg}
        </p>
      )}
    </div>
  );
}
