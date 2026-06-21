'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface SettlementProposalProps {
  proposedRatio: number;      // Tỉ lệ giải ngân AI đề xuất
  payoutAmount: number;       // Trả cho nông dân (USDC)
  refundAmount: number;       // Hoàn trả thương lái (USDC)
  note: string;
}

export default function SettlementProposal({ proposedRatio, payoutAmount, refundAmount, note }: SettlementProposalProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-sm">
      <div>
        <h3 className="font-extrabold text-neutral-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={14} className="text-indigo-500 animate-pulse" />
          Đề xuất Phân chia tiền cọc từ AI (Gemini)
        </h3>
        <p className="text-[11px] text-neutral-450 mt-1">AI tự động đối chiếu các điều khoản chất lượng đã khóa và đề xuất tỉ lệ hoàn trả hợp lý.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Payout to Seller */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 text-center">
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block mb-1">Giải ngân cho Người bán</span>
          <span className="text-xl font-extrabold text-neutral-800">{payoutAmount.toLocaleString('en-US')} USDC</span>
          <span className="text-[10px] text-neutral-400 block mt-1">
            (~ {(payoutAmount * 25000).toLocaleString('vi-VN')} VNĐ)
          </span>
        </div>

        {/* Refund to Buyer */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 text-center">
          <span className="text-[10px] text-blue-650 font-bold uppercase tracking-wider block mb-1">Hoàn trả cho Người mua</span>
          <span className="text-xl font-extrabold text-neutral-800">{refundAmount.toLocaleString('en-US')} USDC</span>
          <span className="text-[10px] text-neutral-400 block mt-1">
            (~ {(refundAmount * 25000).toLocaleString('vi-VN')} VNĐ)
          </span>
        </div>
      </div>

      {/* Logic Details */}
      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-150 text-xs">
        <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider block mb-1">Căn cứ giải quyết tranh chấp (AI giải trình)</span>
        <p className="text-neutral-600 leading-relaxed font-medium">{note}</p>
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-neutral-400 border-t border-neutral-200 pt-2 font-semibold">
          <span>Tỉ lệ giải ngân đề xuất:</span>
          <span className="font-bold text-[#15803D]">{(proposedRatio * 100).toFixed(0)}% tổng tiền ký quỹ</span>
        </div>
      </div>
    </div>
  );
}
