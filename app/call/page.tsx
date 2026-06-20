'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import VideoCallFrame from '../../components/shared/VideoCallFrame';
import TranscriptPanel from '../../components/negotiation/TranscriptPanel';
import DraftContractTable from '../../components/negotiation/DraftContractTable';
import PriceWarningBanner from '../../components/negotiation/PriceWarningBanner';
import ConfirmContractButton from '../../components/negotiation/ConfirmContractButton';
import { createDraftContract } from '../../lib/supabase/queries/contracts';
import { addTranscriptLine } from '../../lib/supabase/queries/transcripts';

import ConnectWalletButton from '../../components/shared/ConnectWalletButton';
import WalletBalance from '../../components/shared/WalletBalance';
import { useAuth } from '../../hooks/useAuth';
import { ShoppingBag, FileText, LogOut, Video, Loader2, MessageSquareText, FileSignature, Mic, Sparkles, X } from 'lucide-react';

interface TranscriptLine {
  id: string;
  vi_nguoi_noi: string;
  noi_dung: string;
  thoi_gian_noi: string;
  den_canh_bao?: 'binh_thuong' | 'canh_bao_do';
}

export default function CallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenario = searchParams.get('scenario') || 'A';
  
  const { user, loading, logout } = useAuth();

  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [proposedPrice, setProposedPrice] = useState(0);
  const [referencePrice] = useState(8500000); // 8.5 triệu VND / tấn giá tham khảo lúa ST25
  const [productName] = useState('Lúa thơm ST25');
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [contractDraft, setContractDraft] = useState<any>(null);
  const [activeStep, setActiveStep] = useState(1); // 1: Đàm thoại, 2: Trích xuất, 3: Ký quỹ
  const [isSimulating, setIsSimulating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Giả lập luồng tiếng nói chảy vào STT
  const simulateLiveSTT = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    const lines = [
      { text: "Chào anh, vụ lúa này hợp tác xã tôi gom được 10 tấn lúa thơm ST25 đạt chuẩn xuất khẩu.", user: "nong_dan" },
      { text: "Chào anh, đợt này tôi muốn thu mua với giá 9 triệu một tấn. Hạn giao là trong 5 ngày tới.", user: "thuong_lai" },
      { text: "Giá 9 triệu/tấn thì ok. Nhưng thỏa thuận tỉ lệ lép dưới 10% nha, hạt lép quá 10% thì phạt 5% đó.", user: "nong_dan" },
      { text: "Nhất trí. Hàng giao độ ẩm phải dưới 14%, nếu ẩm trên 14% thì trừ 2% giá trị mỗi % vượt nhé.", user: "thuong_lai" }
    ];

    let currentLineIndex = 0;
    const interval = setInterval(async () => {
      if (currentLineIndex < lines.length) {
        const item = lines[currentLineIndex];

        // So sánh giá đề xuất ở dòng thứ 2
        if (currentLineIndex === 1) {
          setProposedPrice(9000000);
        }

        const newLine: TranscriptLine = {
          id: Math.random().toString(),
          vi_nguoi_noi: item.user,
          noi_dung: item.text,
          thoi_gian_noi: new Date().toISOString(),
          den_canh_bao: currentLineIndex === 1 ? 'binh_thuong' : 'binh_thuong',
        };

        setTranscriptLines(prev => [...prev, newLine]);
        currentLineIndex++;
      } else {
        clearInterval(interval);
        setIsSimulating(false);
        // Khi đàm thoại xong, chuyển sang bước 2 tự động trích xuất hợp đồng bằng AI
        setActiveStep(2);
        triggerAIExtract();
      }
    }, 4000);
  };

  // Kích hoạt AI GPT-4o trích xuất điều khoản nháp từ transcript hội thoại
  const triggerAIExtract = async () => {
    setLoadingExtract(true);
    setTimeout(() => {
      // Dữ liệu nháp do AI trích xuất (Được giả lập đúng cấu trúc)
      const mockExtracted = {
        san_pham: 'Lúa thơm ST25',
        so_luong: 10,
        don_vi_tinh: 'tấn',
        don_gia: 9000000,
        han_giao_hang: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        dieu_khoan_chat_luong: [
          { tieu_chi: 'ty_le_lep', nguong_phan_tram: 10, muc_phat: 'Trừ 5% giá trị thanh toán' },
          { tieu_chi: 'do_am', nguong_phan_tram: 14, muc_phat: 'Từ chối nhận hàng' }
        ]
      };
      setContractDraft(mockExtracted);
      setLoadingExtract(false);
      setActiveStep(3);
    }, 2000);
  };

  // Lưu hợp đồng nháp và chuyển sang giao diện khóa tiền
  const handleLockSuccess = async (txSig: string) => {
    try {
      // 1. Tạo bản ghi hợp đồng nháp thật trong Supabase
      const savedContract = await createDraftContract({
        vi_nguoi_ban: 'nong_dan_wallet_address_demo',
        vi_nguoi_mua: 'thuong_lai_wallet_address_demo',
        san_pham: contractDraft.san_pham,
        so_luong: contractDraft.so_luong,
        don_vi_tinh: contractDraft.don_vi_tinh,
        don_gia: contractDraft.don_gia,
        han_giao_hang: contractDraft.han_giao_hang,
        noi_dung_nhap_ai: contractDraft,
        dieu_khoan_chat_luong: contractDraft.dieu_khoan_chat_luong,
      });

      // 2. Chuyển hướng sang trang chi tiết hợp đồng đã khóa tiền, truyền kịch bản demo
      router.push(`/contract/${savedContract.id}?scenario=${scenario}&tx=${txSig}`);
    } catch (err) {
      console.error(err);
      alert('Lưu hợp đồng thất bại, nhưng giao dịch on-chain đã gửi: ' + txSig);
    }
  };

  if (loading || !user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-900 text-white gap-2">
        <Loader2 size={18} className="animate-spin text-indigo-400" />
        <span className="text-sm font-semibold">Đang chuẩn bị phòng đàm phán...</span>
      </div>
    );
  }

  const isNongDan = user.vai_tro === 'nong_dan';

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-neutral-900 font-sans">

      {/* HEADER TỐI GIẢN CHUYÊN DỤNG CHO VIDEO CALL */}
      <header className="flex-shrink-0 h-14 bg-neutral-900 border-b border-white/10 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-[#15803D] flex items-center justify-center text-white font-black text-sm shadow-lg">
              A
            </div>
            <span className="text-sm font-extrabold tracking-tight text-white">AgriTrust Meet</span>
          </Link>
          <div className="hidden md:flex items-center gap-1.5 pl-4 border-l border-white/10">
             <span className="text-xs text-neutral-400 font-medium">Kênh đàm phán: <strong className="text-white">dam-phan-lua-st25</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <WalletBalance />
          <ConnectWalletButton />
          <div className="flex items-center gap-2.5 pl-3 border-l border-white/10">
            <div className="text-right">
              <p className="text-[12px] font-bold text-white leading-none">{user.ten_hien_thi}</p>
              <p className={`text-[10px] mt-0.5 font-bold ${isNongDan ? 'text-[#15803D]' : 'text-indigo-400'}`}>
                {isNongDan ? 'Nông Dân' : 'Thương Lái'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
              title="Đổi vai trò / Đăng xuất"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CỦA PHÒNG HỌP */}
      <main className="flex-1 flex overflow-hidden relative bg-black">

        {/* VIDEO AREA CỤC BỘ TỰ ĐỘNG LẤP ĐẦY TOÀN BỘ KHÔNG GIAN */}
        <div className="flex-1 relative w-full h-full flex flex-col">
          <VideoCallFrame channelName="dam-phan-lua-st25" role={isNongDan ? "nong_dan" : "thuong_lai"} />

          {/* OVERLAY: GIẢ LẬP STT BUTTON VÀ PRICE WARNING BANNER */}
          <div className="absolute top-4 left-4 z-40 flex flex-col items-start gap-3 pointer-events-none">
            {/* Phím giả lập (bật pointer-events-auto để click được) */}
            <button
              onClick={simulateLiveSTT}
              disabled={isSimulating || activeStep > 1}
              className="pointer-events-auto px-5 py-2.5 rounded-full bg-indigo-600/90 backdrop-blur-md hover:bg-indigo-500 text-white font-bold text-xs shadow-xl active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
            >
              <Mic size={14} className={isSimulating ? "animate-pulse text-red-300" : ""} /> 
              {isSimulating ? "Đang giả lập thoại..." : "Giả lập Thoại thương lượng (Tiếng Việt)"}
            </button>
            
            {/* Cảnh báo giá */}
            {proposedPrice > 0 && (
              <div className="pointer-events-auto shadow-2xl">
                <PriceWarningBanner
                  proposedPrice={proposedPrice}
                  referencePrice={referencePrice}
                  productName={productName}
                />
              </div>
            )}
          </div>

          {/* FLOATING CLOSED CAPTIONS (PHỤ ĐỀ CHẠY NỔI) */}
          {transcriptLines.length > 0 && isSimulating && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-45 text-center pointer-events-none animate-fadeIn">
              <div className="bg-black/75 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-2xl text-white inline-block max-w-full">
                <span className={`text-[9px] uppercase tracking-wider font-extrabold block mb-1 ${
                  transcriptLines[transcriptLines.length - 1].vi_nguoi_noi === 'nong_dan' ? 'text-emerald-400' : 'text-indigo-400'
                }`}>
                  {transcriptLines[transcriptLines.length - 1].vi_nguoi_noi === 'nong_dan' ? 'Nông dân' : 'Thương lái'}
                </span>
                <p className="text-sm font-semibold leading-relaxed">
                  "{transcriptLines[transcriptLines.length - 1].noi_dung}"
                </p>
              </div>
            </div>
          )}

          {/* FLOATING AI EXTRACTION STATUS (TIẾN TRÌNH AI XỬ LÝ NGẦM) */}
          {activeStep === 2 && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md border border-indigo-500/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
              <Loader2 size={15} className="animate-spin text-indigo-400" />
              <span className="text-xs font-bold text-slate-100">AgriTrust AI đang tự động trích xuất các điều khoản đàm phán...</span>
            </div>
          )}

          {/* FLOATING CONTRACT READY TOAST (THÔNG BÁO BẢN NHÁP HỢP ĐỒNG SẴN SÀNG) */}
          {activeStep === 3 && contractDraft && !isModalOpen && (
            <div className="absolute bottom-28 right-6 z-40 max-w-sm bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 p-5 rounded-2xl shadow-2xl pointer-events-auto">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Hợp đồng nháp đã sẵn sàng!
                  </h5>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    AI đã tự động lập điều khoản nông sản và phạt chất lượng từ cuộc đàm thoại. Bấm để xem lại và ký quỹ.
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-3 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-[#15803D] hover:from-emerald-700 hover:to-[#166534] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <FileSignature size={14} />
                    Xem hợp đồng nháp
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* CONTRACT DETAILS MODAL (MODAL KÍNH MỜ XEM CHI TIẾT & KÝ KẾT) */}
      {isModalOpen && contractDraft && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col overflow-hidden animate-scaleUp">
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors z-10"
            >
              <X size={18} />
            </button>

            {/* Modal Body: Scrollable area */}
            <div className="flex-1 overflow-y-auto pr-2 mt-4 min-h-0">
              <DraftContractTable
                terms={contractDraft}
                onChange={setContractDraft}
              />
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4 flex-shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Đóng
              </button>
              <div className="flex-1 max-w-[280px]">
                <ConfirmContractButton
                  contractId="dummy_id"
                  buyerAddress="thuong_lai_wallet_address_demo"
                  sellerAddress="nong_dan_wallet_address_demo"
                  unitPriceVnd={contractDraft.don_gia}
                  expectedQty={contractDraft.so_luong}
                  deadlineIso={contractDraft.han_giao_hang}
                  onSuccess={handleLockSuccess}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
