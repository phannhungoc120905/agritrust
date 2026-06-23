'use client';

import React, { useState } from 'react';
import { updateSellerApproval } from '../../lib/supabase/queries/disputes';

interface ApproveReportButtonsProps {
  disputeId: string;
  isApproved: boolean;
  onUpdate: () => void;
}

export default function ApproveReportButtons({ disputeId, isApproved, onUpdate }: ApproveReportButtonsProps) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      // Nông dân xác nhận đã xem và duyệt tiếp nhận báo cáo
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
        ✓ Nông dân đã xác nhận nghiệm thu có sai lệch. Chờ AI đề xuất phân chia tiền.
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-3 shadow-sm">
      <p className="text-xs text-neutral-600 font-semibold text-center">Nông dân xác nhận báo cáo nghiệm thu thực tế này?</p>
      <button
        onClick={handleApprove}
        disabled={loading}
        className="w-full py-2.5 btn-primary text-xs font-bold transition-all cursor-pointer"
      >
        {loading ? 'Đang xác nhận...' : 'Đồng ý với báo cáo nghiệm thu thực tế'}
      </button>
    </div>
  );
}
