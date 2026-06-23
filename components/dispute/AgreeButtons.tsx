'use client';

import React, { useState } from 'react';
import { useEscrow } from '../../hooks/useEscrow';
import { useAuth } from '../../hooks/useAuth';
import { updateAgreement, updateDisputeResolved } from '../../lib/supabase/queries/disputes';
import AgreeButton from '../shared/buttons/AgreeButton';

interface AgreeButtonsProps {
  contractId: string;
  disputeId: string;
  buyerAddress: string;
  sellerAddress: string;
  buyerAgreed: boolean;
  sellerAgreed: boolean;
  actualQty: number;
  onSuccess: (txSig: string) => void;
}

export default function AgreeButtons({
  contractId,
  disputeId,
  buyerAddress,
  sellerAddress,
  buyerAgreed,
  sellerAgreed,
  actualQty,
  onSuccess,
}: AgreeButtonsProps) {
  const { resolvePartial, loading: txLoading } = useEscrow();
  const { user } = useAuth();
  const [buyerLoading, setBuyerLoading] = useState(false);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isNongDan = user?.vai_tro === 'nong_dan';
  const isThuongLai = user?.vai_tro === 'thuong_lai';

  const handleBuyerAgree = async () => {
    setBuyerLoading(true);
    setErrorMsg('');
    try {
      // Cập nhật đồng ý của người mua và nhận về dữ liệu mới nhất
      const updatedData = await updateAgreement(disputeId, 'nguoi_mua_dong_y', true);
      // Kiểm tra xem cả hai bên đã đồng ý chưa để gọi smart contract
      if (updatedData.nguoi_ban_dong_y && updatedData.nguoi_mua_dong_y) {
        await executeResolvePartial();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi cập nhật đồng ý.');
    } finally {
      setBuyerLoading(false);
    }
  };

  const handleSellerAgree = async () => {
    setSellerLoading(true);
    setErrorMsg('');
    try {
      // Cập nhật đồng ý của người bán và nhận về dữ liệu mới nhất
      const updatedData = await updateAgreement(disputeId, 'nguoi_ban_dong_y', true);
      // Kiểm tra xem cả hai bên đã đồng ý chưa để gọi smart contract
      if (updatedData.nguoi_ban_dong_y && updatedData.nguoi_mua_dong_y) {
        await executeResolvePartial();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi cập nhật đồng ý.');
    } finally {
      setSellerLoading(false);
    }
  };

  const executeResolvePartial = async () => {
    const result = await resolvePartial(
      contractId,
      buyerAddress,
      sellerAddress,
      actualQty,
      { disputeId }
    );
    if (result.success) {
      try {
        // Đồng bộ trạng thái tranh chấp thành 'da_giai_ngan' trong DB sau khi giải ngân on-chain thành công
        await updateDisputeResolved(disputeId);
      } catch (dbErr) {
        console.error('Lỗi khi đồng bộ trạng thái giải quyết tranh chấp trong DB:', dbErr);
      }
      onSuccess(result.txSignature);
    }
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 space-y-4 shadow-sm">
      <div className="text-center">
        <h4 className="font-bold text-neutral-800 text-xs uppercase tracking-wider">Xác nhận đồng thuận phương án phân chia</h4>
        <p className="text-[11px] text-neutral-450 mt-1">Cả hai bên phải ký đồng ý để hợp đồng thông minh thực thi giải ngân.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Buyer Consent Status */}
        <div className="flex flex-col items-center gap-2.5 p-3.5 bg-white rounded-lg border border-neutral-150">
          <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">Thương lái (Người mua)</span>
          {buyerAgreed ? (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs rounded-full font-bold">
              ✓ Đã đồng ý
            </span>
          ) : (
            <AgreeButton
              label="Bấm Đồng ý"
              onClick={handleBuyerAgree}
              loading={buyerLoading || txLoading}
              disabled={!isThuongLai}
            />
          )}
        </div>

        {/* Seller Consent Status */}
        <div className="flex flex-col items-center gap-2.5 p-3.5 bg-white rounded-lg border border-neutral-150">
          <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">Nông dân (Người bán)</span>
          {sellerAgreed ? (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs rounded-full font-bold">
              ✓ Đã đồng ý
            </span>
          ) : (
            <AgreeButton
              label="Bấm Đồng ý"
              onClick={handleSellerAgree}
              loading={sellerLoading || txLoading}
              disabled={!isNongDan}
            />
          )}
        </div>
      </div>

      {errorMsg && <p className="text-xs text-red-500 text-center font-semibold">⚠️ {errorMsg}</p>}
    </div>
  );
}
