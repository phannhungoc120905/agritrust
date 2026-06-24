'use client';

import React, { useState } from 'react';
import { updateSellerApproval } from '../../lib/supabase/queries/disputes';

interface ApproveReportButtonsProps {
  disputeId: string;
  isApproved: boolean;
  onUpdate: () => void;
  isEnglish?: boolean;
}

export default function ApproveReportButtons({ disputeId, isApproved, onUpdate, isEnglish = false }: ApproveReportButtonsProps) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await updateSellerApproval(disputeId, true);
      onUpdate();
    } catch (err) {
      console.error('Lỗi khi nông dân duyệt báo cáo nghiệm thu:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isApproved) {
    return (
      <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold text-center">
        {isEnglish
          ? '✓ Farmer confirmed the inspection report. Waiting for the AI settlement proposal.'
          : '✓ Nông dân đã xác nhận báo cáo nghiệm thu. Đang chờ đề xuất phân chia từ AI.'}
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-3 shadow-sm">
      <p className="text-xs text-neutral-600 font-semibold text-center">
        {isEnglish ? 'Does the farmer confirm this inspection report?' : 'Nông dân xác nhận báo cáo nghiệm thu này?'}
      </p>
      <button
        onClick={handleApprove}
        disabled={loading}
        className="w-full py-2.5 btn-primary text-xs font-bold transition-all cursor-pointer"
      >
        {loading ? (isEnglish ? 'Confirming...' : 'Đang xác nhận...') : (isEnglish ? 'Agree with Inspection Report' : 'Đồng ý báo cáo')}
      </button>
    </div>
  );
}
