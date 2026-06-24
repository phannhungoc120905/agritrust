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
  const bothAgreed = buyerAgreed && sellerAgreed;

  const handleBuyerAgree = async () => {
    setBuyerLoading(true);
    setErrorMsg('');
    try {
      // Cập nhật đồng ý của người mua và nhận về dữ liệu mới nhất
      const updatedData = await updateAgreement(disputeId, 'nguoi_mua_dong_y', true);
      // Thương lái (Buyer) là Signer hợp lệ on-chain, nên có thể kích hoạt trực tiếp nếu cả 2 đã đồng ý
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
      // Cập nhật đồng ý của người bán (Nông dân)
      await updateAgreement(disputeId, 'nguoi_ban_dong_y', true);
      // Nông dân không phải là Signer on-chain cho lệnh resolve_partial (chỉ Buyer ký được),
      // nên ta reload để cập nhật trạng thái đã đồng ý, chờ Thương lái thực thi on-chain.
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi cập nhật đồng ý.');
    } finally {
      setSellerLoading(false);
    }
  };

  const executeResolvePartial = async () => {
    setErrorMsg('');
    try {
      const result = await resolvePartial(
        contractId,
        buyerAddress,
        sellerAddress,
        actualQty,
        { disputeId }
      );
      if (result.success) {
        try {
          // Đồng bộ trạng thái tranh chấp thành 'da_giai_ngan' trong DB
          await updateDisputeResolved(disputeId);
        } catch (dbErr) {
          console.error('Lỗi khi đồng bộ trạng thái giải quyết tranh chấp trong DB:', dbErr);
        }
        onSuccess(result.txSignature);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi thực thi giải ngân on-chain.');
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
              disabled={!isThuongLai || bothAgreed}
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
              disabled={!isNongDan || bothAgreed}
            />
          )}
        </div>
      </div>

      {bothAgreed && (
        <div className="pt-2 text-center border-t border-neutral-200 mt-2">
          {isThuongLai ? (
            <button
              onClick={executeResolvePartial}
              disabled={txLoading}
              className="w-full py-3 px-6 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
            >
              {txLoading ? 'Đang thực thi giải ngân on-chain...' : 'Ký thực thi giải ngân trên Blockchain'}
            </button>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-semibold flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span>Cả hai bên đã đồng thuận! Đang chờ Thương lái ký thực thi giao dịch on-chain...</span>
            </div>
          )}
        </div>
      )}

      {errorMsg && <p className="text-xs text-red-500 text-center font-semibold">⚠️ {errorMsg}</p>}
    </div>
  );
}
