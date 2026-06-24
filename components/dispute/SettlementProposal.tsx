'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { EXCHANGE_RATE_VND_USDC } from '../../lib/solana/convertVndUsdc';

interface SettlementProposalProps {
  proposedRatio: number;      // Tỉ lệ giải ngân AI đề xuất
  payoutAmount: number;       // Trả cho nông dân (SOL)
  refundAmount: number;       // Hoàn trả thương lái (SOL)
  note: string;
  isEnglish?: boolean;
}

export default function SettlementProposal({ proposedRatio, payoutAmount, refundAmount, note, isEnglish = false }: SettlementProposalProps) {
  const total = payoutAmount + refundAmount;
  const sellerPercent = total > 0 ? (payoutAmount / total) * 100 : 50;
  const buyerPercent = total > 0 ? (refundAmount / total) * 100 : 50;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-neutral-100 pb-3 gap-2">
        <h3 className="font-extrabold text-neutral-800 text-xs uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-650 animate-pulse" />
          {isEnglish ? 'AI settlement proposal' : 'Đề xuất Phân chia tiền cọc từ AI'}
        </h3>
        <span className="self-start sm:self-center text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm shrink-0">
          {isEnglish ? '✨ Powered by Minimax' : '✨ Phân tích bởi Minimax'}
        </span>
      </div>

      <p className="text-[11px] text-neutral-450 mt-1">
          {isEnglish
            ? 'AI compares the locked quality terms and proposes a fair refund ratio.'
            : 'AI tự động đối chiếu các điều khoản chất lượng đã khóa và đề xuất tỉ lệ hoàn trả hợp lý.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Payout to Seller */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 text-center">
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block mb-1">{isEnglish ? 'Payout to Seller' : 'Giải ngân cho Người bán'}</span>
          <span className="text-xl font-extrabold text-neutral-800">{payoutAmount.toLocaleString('en-US')} SOL</span>
          <span className="text-[10px] text-neutral-400 block mt-1">
            (~ {(payoutAmount * EXCHANGE_RATE_VND_USDC).toLocaleString('vi-VN')} VNĐ)
          </span>
        </div>

        {/* Refund to Buyer */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 text-center">
          <span className="text-[10px] text-blue-650 font-bold uppercase tracking-wider block mb-1">{isEnglish ? 'Refund to Buyer' : 'Hoàn trả cho Người mua'}</span>
          <span className="text-xl font-extrabold text-neutral-800">{refundAmount.toLocaleString('en-US')} SOL</span>
          <span className="text-[10px] text-neutral-400 block mt-1">
            (~ {(refundAmount * EXCHANGE_RATE_VND_USDC).toLocaleString('vi-VN')} VNĐ)
          </span>
        </div>
      </div>

      {/* Progress Bar (Visual division of escrow funds) */}
      <div className="space-y-1.5 py-1">
        <div className="w-full bg-slate-100 rounded-full h-3.5 flex overflow-hidden shadow-inner border border-slate-200">
          <div 
            style={{ width: `${sellerPercent}%` }} 
            className="bg-emerald-500 h-full transition-all duration-500"
            title={isEnglish ? `Seller payout: ${sellerPercent.toFixed(0)}%` : `Giải ngân người bán: ${sellerPercent.toFixed(0)}%`}
          ></div>
          <div 
            style={{ width: `${buyerPercent}%` }} 
            className="bg-slate-400 h-full transition-all duration-500"
            title={isEnglish ? `Buyer refund: ${buyerPercent.toFixed(0)}%` : `Hoàn trả người mua: ${buyerPercent.toFixed(0)}%`}
          ></div>
        </div>
        <div className="flex justify-between items-center text-[10.5px] text-slate-500 font-bold px-1">
          <span className="text-emerald-700">{isEnglish ? 'Seller:' : 'Người bán:'} {sellerPercent.toFixed(0)}%</span>
          <span className="text-slate-600">{isEnglish ? 'Buyer:' : 'Người mua:'} {buyerPercent.toFixed(0)}%</span>
        </div>
      </div>

      {/* Logic Details */}
      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-150 text-xs">
        <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider block mb-1">{isEnglish ? 'Dispute resolution basis (AI explanation)' : 'Căn cứ giải quyết tranh chấp (AI giải trình)'}</span>
        <p className="text-neutral-600 leading-relaxed font-medium">{note}</p>
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-neutral-400 border-t border-neutral-200 pt-2 font-semibold">
          <span>{isEnglish ? 'Proposed payout ratio:' : 'Tỉ lệ giải ngân đề xuất:'}</span>
          <span className="font-bold text-[#15803D]">{(proposedRatio * 100).toFixed(0)}% {isEnglish ? 'of total escrow' : 'tổng tiền ký quỹ'}</span>
        </div>
      </div>
    </div>
  );
}

