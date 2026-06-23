'use client';

import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { EXCHANGE_RATE_VND_USDC } from '../../lib/solana/convertVndUsdc';

export default function WalletBalance() {
  const { connected, balance } = useWallet();

  if (!connected) return null;

  // Quy đổi SOL sang VNĐ với tỷ giá hệ thống (trùng khớp với Đàm phán và Tranh chấp)
  const vndBalance = balance * EXCHANGE_RATE_VND_USDC;

  return (
    <div className="flex items-center gap-3 text-[13px] font-mono">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-neutral-50 border border-neutral-200">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
        <span className="font-semibold text-neutral-700">{balance.toFixed(4)}</span>
        <span className="text-neutral-400 text-[11px]">SOL</span>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-neutral-50 border border-neutral-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]"></span>
        <span className="font-semibold text-emerald-700">~{vndBalance.toLocaleString('vi-VN')}</span>
        <span className="text-neutral-400 text-[11px]">VND</span>
      </div>
    </div>
  );
}
