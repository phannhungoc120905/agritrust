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
  isEnglish?: boolean;
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
  isEnglish = false,
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
      const updatedData = await updateAgreement(disputeId, 'nguoi_mua_dong_y', true);
      if (updatedData.nguoi_ban_dong_y && updatedData.nguoi_mua_dong_y) {
        await executeResolvePartial();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isEnglish ? 'Error updating agreement.' : 'Lỗi khi cập nhật đồng ý.'));
    } finally {
      setBuyerLoading(false);
    }
  };

  const handleSellerAgree = async () => {
    setSellerLoading(true);
    setErrorMsg('');
    try {
      await updateAgreement(disputeId, 'nguoi_ban_dong_y', true);
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || (isEnglish ? 'Error updating agreement.' : 'Lỗi khi cập nhật đồng ý.'));
    } finally {
      setSellerLoading(false);
    }
  };

  const executeResolvePartial = async () => {
    setErrorMsg('');
    try {
      const result = await resolvePartial(contractId, buyerAddress, sellerAddress, actualQty, { disputeId });
      if (result.success) {
        try {
          await updateDisputeResolved(disputeId);
        } catch (dbErr) {
          console.error('Lỗi khi đồng bộ trạng thái giải quyết tranh chấp trong DB:', dbErr);
        }
        onSuccess(result.txSignature);
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isEnglish ? 'Error executing on-chain payout.' : 'Lỗi khi thực thi giải ngân on-chain.'));
    }
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 space-y-4 shadow-sm">
      <div className="text-center">
        <h4 className="font-bold text-neutral-800 text-xs uppercase tracking-wider">
          {isEnglish ? 'Confirm Settlement Agreement' : 'Xác nhận thỏa thuận phân xử'}
        </h4>
        <p className="text-[11px] text-neutral-450 mt-1">
          {isEnglish
            ? 'Both parties must agree before the smart contract can release funds.'
            : 'Cả hai bên phải đồng ý trước khi smart contract giải ngân.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center gap-2.5 p-3.5 bg-white rounded-lg border border-neutral-150">
          <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">
            {isEnglish ? 'Trader (Buyer)' : 'Thương lái (Người mua)'}
          </span>
          {buyerAgreed ? (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs rounded-full font-bold">
              {isEnglish ? '✓ Agreed' : '✓ Đã đồng ý'}
            </span>
          ) : (
            <AgreeButton
              label={isEnglish ? 'Agree' : 'Đồng ý'}
              onClick={handleBuyerAgree}
              loading={buyerLoading || txLoading}
              disabled={!isThuongLai || bothAgreed}
            />
          )}
        </div>

        <div className="flex flex-col items-center gap-2.5 p-3.5 bg-white rounded-lg border border-neutral-150">
          <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">
            {isEnglish ? 'Farmer (Seller)' : 'Nông dân (Người bán)'}
          </span>
          {sellerAgreed ? (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs rounded-full font-bold">
              {isEnglish ? '✓ Agreed' : '✓ Đã đồng ý'}
            </span>
          ) : (
            <AgreeButton
              label={isEnglish ? 'Agree' : 'Đồng ý'}
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
              {txLoading
                ? (isEnglish ? 'Executing on-chain payout...' : 'Đang thực thi giải ngân on-chain...')
                : (isEnglish ? 'Sign On-Chain Payout' : 'Ký giải ngân on-chain')}
            </button>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-semibold flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span>
                {isEnglish
                  ? 'Both parties agreed. Waiting for the trader to sign the on-chain transaction...'
                  : 'Hai bên đã đồng ý. Đang chờ thương lái ký giao dịch on-chain...'}
              </span>
            </div>
          )}
        </div>
      )}

      {errorMsg && <p className="text-xs text-red-500 text-center font-semibold">⚠️ {errorMsg}</p>}
    </div>
  );
}
