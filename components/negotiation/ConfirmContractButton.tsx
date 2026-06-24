'use client';

import React, { useState } from 'react';
import { useEscrow } from '../../hooks/useEscrow';
import LockFundsButton from '../shared/buttons/LockFundsButton';
import { convertVndToLamports, formatSol } from '../../lib/solana/convertVndUsdc';
import { createDraftContract, updateContractDraftData } from '../../lib/supabase/queries/contracts';
import { ContractSignature } from './DraftContractTable';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface ConfirmContractButtonProps {
  contractId: string;
  buyerAddress: string;
  sellerAddress: string;
  unitPriceVnd: number;
  expectedQty: number;
  deadlineIso: string;
  onSuccess: (txSig: string) => void;
  contractDraft?: any;
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

  // Tính trước số SOL sẽ bị khóa để hiển thị cho người dùng
  const totalVnd = (unitPriceVnd || 0) * (expectedQty || 0);
  const totalLamports = convertVndToLamports(totalVnd);
  const totalSol = Number(totalLamports) / LAMPORTS_PER_SOL;

  const handleLockFunds = async () => {
    setErrorMsg('');
    try {
      let activeContractId = contractId;

      // Thêm chữ ký vào noi_dung_nhap_ai
      const updatedNoiDungNhapAi = {
        ...(contractDraft?.noi_dung_nhap_ai || {}),
        buyerSignature: buyerSignature || null,
        sellerSignature: sellerSignature || null,
      };

      if (contractDraft) {
        setDbLoading(true);
        if (activeContractId === 'dummy_id' || activeContractId.startsWith('room_')) {
          // Tạo hợp đồng nháp mới với UUID hợp lệ nếu chưa có
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
          // Cập nhật hợp đồng nháp đã tồn tại
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

      // 1. Tính deadline Unix timestamp
      const deadlineTimestamp = Math.floor(new Date(deadlineIso).getTime() / 1000);

      // 2. Gọi hook escrow (lamports sẽ được tính nội bộ trong useEscrow)
      const result = await lockUsdc(
        activeContractId,
        buyerAddress,
        sellerAddress,
        unitPriceVnd,
        expectedQty,
        deadlineTimestamp,
        totalSol // tổng SOL (để ghi DB)
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
      {/* Thông tin SOL sẽ bị khóa */}
      {totalSol > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-amber-300 font-medium">
            Funds to lock: <span className="font-bold text-amber-200">{totalSol.toFixed(6)} SOL</span>
          </p>
          <p className="text-[10px] text-amber-400/70 mt-0.5">
            (≈ {totalVnd.toLocaleString('vi-VN')} VNĐ · Phantom will ask for confirmation)
          </p>
        </div>
      )}

      <LockFundsButton onClick={handleLockFunds} loading={escrowLoading || dbLoading} />

      {errorMsg && (
        <p className="text-xs text-red-500 text-center font-semibold">
          ⚠️ {errorMsg}
        </p>
      )}
    </div>
  );
}
