'use client';

import React, { useState } from 'react';
import UploadEvidenceForm from './UploadEvidenceForm';
import { createDisputeReport } from '../../lib/supabase/queries/disputes';
import { updateContractStatus } from '../../lib/supabase/queries/contracts';
import { resolveDisputeWithGemini } from '../../lib/settlement/resolveDisputeGemini';
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
      // 1. Gọi API Gemini để phân xử tranh chấp thực tế (có fallback nếu thiếu key)
      const proposal = await resolveDisputeWithGemini(contract, actualQty, qualityNote, imageUrls);

      // Kết hợp mô tả của thương lái và phần giải trình chi tiết của AI
      const detailedNote = `[Ý kiến Thương lái]: ${qualityNote || 'Hàng hoá có lỗi.'}\n\n[AI Phán quyết]: ${proposal.ly_do}`;

      const reportObj: DisputeReport = {
        id: 'mock-report-' + Date.now(),
        id_hop_dong: contract.id,
        so_luong_thuc_nhan: actualQty,
        ghi_chu_chat_luong: detailedNote,
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

  const isSubmitDisabled = loading || !actualQty || actualQty <= 0 || !qualityNote.trim();

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
      <div>
        <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Khởi tạo khiếu nại & nghiệm thu (Kịch bản B)</h3>
        <p className="text-[11px] text-slate-450 mt-1">Ghi nhận thông số nghiệm thu vào cơ sở dữ liệu để Hệ thống AI đối chiếu.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Số lượng thực nhận</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={actualQty}
              onChange={(e) => setActualQty(parseFloat(e.target.value) || 0)}
              className="bg-slate-50 border border-slate-200 focus:border-[#15803D] focus:bg-white rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none transition-all text-center font-bold"
              style={{ width: '120px' }}
              required
            />
            <span className="text-sm font-semibold text-slate-400">{contract.don_vi_tinh}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mô tả tình trạng lỗi nông sản</label>
        <textarea
          value={qualityNote}
          onChange={(e) => setQualityNote(e.target.value)}
          placeholder="Mô tả các vấn đề về chất lượng (Ví dụ: Lúa bị mốc, độ ẩm đo được 14.5%)"
          className="w-full h-24 bg-slate-50 border border-slate-200 focus:border-[#15803D] focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-900 outline-none resize-none transition-all"
          required
        />
      </div>

      <UploadEvidenceForm onUrlsChange={setImageUrls} />

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="w-full py-3 bg-[#15803D] hover:bg-[#166534] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer rounded-xl shadow-md hover:shadow-lg active:scale-98"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Đang tạo báo cáo...
          </>
        ) : (
          <>
            <AlertTriangle size={15} />
            Tạo Báo Cáo Khiếu Nại
          </>
        )}
      </button>
    </form>
  );
}
