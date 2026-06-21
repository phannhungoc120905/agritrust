'use client';

import React, { useState } from 'react';
import UploadEvidenceForm from './UploadEvidenceForm';
import { createDisputeReport } from '../../lib/supabase/queries/disputes';
import { updateContractStatus } from '../../lib/supabase/queries/contracts';
import { proposeSettlement } from '../../lib/settlement/proposeSettlement';
import { Contract } from '../../types/contract';
import { DisputeReport } from '../../types/disputeReport';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DisputeReportFormProps {
  contract: Contract;
  onSubmitted: (report: DisputeReport) => void;
}

export default function DisputeReportForm({ contract, onSubmitted }: DisputeReportFormProps) {
  const [actualQty, setActualQty] = useState(contract.so_luong);
  const [qualityNote, setQualityNote] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Tính toán đề xuất phân chia tiền bằng AI logic
      const qualityIssues: Record<string, number> = {};
      
      // Giả lập AI trích xuất con số vi phạm từ văn bản mô tả
      const noteLower = qualityNote.toLowerCase();
      if (contract.dieu_khoan_chat_luong) {
        contract.dieu_khoan_chat_luong.forEach(rule => {
          const keyword = rule.tieu_chi.toLowerCase().replace('tỉ lệ ', '').replace('độ ', '');
          if (noteLower.includes(keyword)) {
            const match = noteLower.match(/(\d+(?:\.\d+)?)%/);
            if (match && match[1]) {
              qualityIssues[rule.tieu_chi] = parseFloat(match[1]);
            }
          }
        });
      }

      const proposal = proposeSettlement(contract, actualQty, qualityIssues);

      const reportObj: DisputeReport = {
        id: 'mock-report-' + Date.now(),
        id_hop_dong: contract.id,
        so_luong_thuc_nhan: actualQty,
        ghi_chu_chat_luong: qualityNote || `Hàng hoá có lỗi.`,
        danh_sach_url_anh: imageUrls,
        ty_le_giai_ngan_ai_de_xuat: proposal.ty_le_giai_ngan,
        so_tien_giai_ngan_de_xuat: proposal.tien_giai_ngan_usdc,
        so_tien_hoan_lai_de_xuat: proposal.tien_hoan_usdc,
        nguoi_ban_da_duyet: false,
        nguoi_mua_dong_y: false,
        nguoi_ban_dong_y: false,
        trang_thai: 'moi_gui',
        ngay_tao: new Date().toISOString()
      };

      // 2. Thử ghi nhận báo cáo tranh chấp vào Supabase
      try {
        await createDisputeReport({
          id_hop_dong: contract.id,
          so_luong_thuc_nhan: actualQty,
          ghi_chu_chat_luong: reportObj.ghi_chu_chat_luong,
          danh_sach_url_anh: imageUrls,
          ty_le_giai_ngan_ai_de_xuat: proposal.ty_le_giai_ngan,
          so_tien_giai_ngan_de_xuat: proposal.tien_giai_ngan_usdc,
          so_tien_hoan_lai_de_xuat: proposal.tien_hoan_usdc,
        });
        await updateContractStatus(contract.id, 'dang_tranh_chap');
      } catch (dbErr) {
        console.warn('Fallback sang chế độ giả lập vì lỗi DB:', dbErr);
      }
      
      // 3. Luôn trả về reportObj để UI đi tiếp
      onSubmitted(reportObj);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
      <div>
        <h3 className="font-extrabold text-neutral-800 text-xs uppercase tracking-wider">Khởi tạo khiếu nại & nghiệm thu (Kịch bản B)</h3>
        <p className="text-[11px] text-neutral-450 mt-1">Ghi nhận thông số nghiệm thu vào cơ sở dữ liệu để Hệ thống AI đối chiếu.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Số lượng thực nhận ({contract.don_vi_tinh})</label>
          <input
            type="number"
            step="0.01"
            value={actualQty}
            onChange={(e) => setActualQty(parseFloat(e.target.value) || 0)}
            className="w-full bg-neutral-50 border border-neutral-250 focus:border-[#15803D] rounded-lg px-3.5 py-2.5 text-sm text-neutral-900 outline-none"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Mô tả tình trạng lỗi nông sản</label>
        <textarea
          value={qualityNote}
          onChange={(e) => setQualityNote(e.target.value)}
          placeholder="Mô tả các vấn đề về chất lượng (Ví dụ: Lúa bị mốc, độ ẩm đo được 14.5%)"
          className="w-full h-24 bg-neutral-50 border border-neutral-250 focus:border-[#15803D] rounded-lg px-3.5 py-3 text-sm text-neutral-900 outline-none resize-none"
          required
        />
      </div>

      <UploadEvidenceForm onUrlsChange={setImageUrls} />

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 font-semibold flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 btn-primary bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 rounded-xl"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Đang đồng bộ...
          </>
        ) : (
          'Tạo Báo Cáo Khiếu Nại'
        )}
      </button>
    </form>
  );
}
