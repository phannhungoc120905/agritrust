'use client';

import React, { useState } from 'react';
import { useEscrow } from '../../hooks/useEscrow';
import LockFundsButton from '../shared/buttons/LockFundsButton';
import { convertVndToUsdc } from '../../lib/solana/convertVndUsdc';
import { createDraftContract, updateContractDraftData } from '../../lib/supabase/queries/contracts';
import { ContractSignature } from './DraftContractTable';

interface ConfirmContractButtonProps {
  contractId: string;
  buyerAddress: string;
  sellerAddress: string;
  unitPriceVnd: number;
  expectedQty: number;
  deadlineIso: string;
  onSuccess: (txSig: string) => void;
  contractDraft?: any; // To save to DB if dummy
  buyerSignature?: ContractSignature | null;
  sellerSignature?: ContractSignature | null;
}

export default function ConfirmContractButton({
  contractId,
  buyerAddress,
  sellerAddress,
  unitPriceVnd,
  expectedQty,
  deadlineIso,
  onSuccess,
  contractDraft,
  buyerSignature,
  sellerSignature,
}: ConfirmContractButtonProps) {
  const { lockUsdc, loading: escrowLoading } = useEscrow();
  const [dbLoading, setDbLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLockFunds = async () => {
    setErrorMsg('');
    try {
      let activeContractId = contractId;

      // Add signatures to contractDraft's noi_dung_nhap_ai
      const updatedNoiDungNhapAi = {
        ...(contractDraft?.noi_dung_nhap_ai || {}),
        buyerSignature: buyerSignature || null,
        sellerSignature: sellerSignature || null,
      };

      if (contractDraft) {
        setDbLoading(true);
        if (activeContractId === 'dummy_id') {
          // Dự phòng nếu vẫn còn ai gọi bằng dummy_id
          const dbRes = await createDraftContract({
            vi_nguoi_ban: sellerAddress,
            vi_nguoi_mua: buyerAddress,
            san_pham: contractDraft.san_pham,
            so_luong: contractDraft.so_luong,
            don_vi_tinh: contractDraft.don_vi_tinh,
            don_gia: contractDraft.don_gia,
            han_giao_hang: contractDraft.han_giao_hang,
            noi_dung_nhap_ai: updatedNoiDungNhapAi,
            dieu_khoan_chat_luong: contractDraft.dieu_khoan_chat_luong,
          });
          activeContractId = dbRes.id;
        } else {
          // Cập nhật hợp đồng nháp đã được tạo trước đó
          await updateContractDraftData(activeContractId, {
            san_pham: contractDraft.san_pham,
            so_luong: contractDraft.so_luong,
            don_vi_tinh: contractDraft.don_vi_tinh,
            don_gia: contractDraft.don_gia,
            han_giao_hang: contractDraft.han_giao_hang,
            dieu_khoan_chat_luong: contractDraft.dieu_khoan_chat_luong,
            noi_dung_nhap_ai: updatedNoiDungNhapAi,
          });
        }
        setDbLoading(false);
      }

      // 1. Tính toán hạn giao hàng dạng Unix timestamp
      const deadlineTimestamp = Math.floor(new Date(deadlineIso).getTime() / 1000);
      
      // 2. Quy đổi VND -> USDC
      const totalVnd = unitPriceVnd * expectedQty;
      const totalUsdc = convertVndToUsdc(totalVnd);

      // 3. Gọi hook escrow
      const result = await lockUsdc(
        activeContractId,
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
      setDbLoading(false);
    }
  };

  return (
    <div className="space-y-3 w-full">
      <LockFundsButton onClick={handleLockFunds} loading={escrowLoading || dbLoading} />
      {errorMsg && (
        <p className="text-xs text-red-500 text-center font-semibold">
          ⚠️ {errorMsg}
        </p>
      )}
    </div>
  );
}
