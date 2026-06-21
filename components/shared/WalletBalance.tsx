'use client';

import React from 'react';
import { useWallet } from '../../hooks/useWallet';

export default function WalletBalance() {
  const { connected, balance } = useWallet();

  if (!connected) return (
    <div className="text-[12px] font-medium text-slate-400 italic px-2">
      Chưa kết nối ví
    </div>
  );

  return (
    <div className="flex items-center gap-3 text-[13px] font-mono">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-neutral-50 border border-neutral-200">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
        <span className="font-semibold text-neutral-700">{balance.toFixed(4)}</span>
        <span className="text-neutral-400 text-[11px]">SOL</span>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-neutral-50 border border-neutral-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]"></span>
        <span className="font-semibold text-neutral-700">--</span>
        <span className="text-neutral-400 text-[11px]">USDC</span>
      </div>
    </div>
  );
}
