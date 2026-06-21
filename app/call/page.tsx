'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import VideoCallFrame from '../../components/shared/VideoCallFrame';
import DraftContractTable from '../../components/negotiation/DraftContractTable';
import PriceWarningBanner from '../../components/negotiation/PriceWarningBanner';
import ConfirmContractButton from '../../components/negotiation/ConfirmContractButton';
import { createDraftContract } from '../../lib/supabase/queries/contracts';
import { AgoraSTTClient } from '../../lib/agora/sttClient';

import ConnectWalletButton from '../../components/shared/ConnectWalletButton';
import WalletBalance from '../../components/shared/WalletBalance';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Loader2, FileSignature, Mic, MicOff, Sparkles, X, AlertTriangle, Check, UserCheck, ArrowLeft } from 'lucide-react';

interface TranscriptLine {
  id: string;
  vi_nguoi_noi: string;
  noi_dung: string;
  thoi_gian_noi: string;
  den_canh_bao?: 'binh_thuong' | 'canh_bao_do';
}

function CallPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenario = searchParams.get('scenario') || 'A';
  const channelParam = searchParams.get('channel');
  const channelName = channelParam || 'dam-phan-lua-st25';
  
  const { user, loading, logout } = useAuth();

  const productParam = searchParams.get('product') || 'Lúa thơm ST25';
  const partnerParam = searchParams.get('partner') || 'Đối tác';

  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [proposedPrice, setProposedPrice] = useState(0);
  const [productName, setProductName] = useState(productParam);
  const [partnerName, setPartnerName] = useState(partnerParam);

  const [referencePrice, setReferencePrice] = useState(() => {
    const name = productParam.toLowerCase();
    if (name.includes('sầu riêng') || name.includes('ri6')) return 120000000; // 120 triệu / tấn
    if (name.includes('cà phê') || name.includes('robusta')) return 75000000; // 75 triệu / tấn
    if (name.includes('thanh long')) return 22000000; // 22 triệu / tấn
    return 8500000; // Mặc định lúa ST25: 8.5 triệu / tấn
  });
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [contractDraft, setContractDraft] = useState<any>(null);
  const [activeStep, setActiveStep] = useState(1); // 1: Đàm thoại, 2: Trích xuất, 3: Ký quỹ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRealSTTActive, setIsRealSTTActive] = useState(false);
  const [isMockActive, setIsMockActive] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualText, setManualText] = useState<string>(() =>
    JSON.stringify(
      {
        san_pham: productName,
        so_luong: null,
        don_vi_tinh: 'tấn',
        don_gia: null,
        han_giao_hang: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        dieu_khoan_chat_luong: null,
        confidence: null,
        evidence: [],
      },
      null,
      2
    )
  );
  const [manualError, setManualError] = useState('');
  const [confirmations, setConfirmations] = useState<Record<string, { nong_dan?: boolean; thuong_lai?: boolean }>>({});
  const [proposedSuggestion, setProposedSuggestion] = useState<null | { field: string; value: any; phrase: string }>(null);

  function toggleConfirmation(lineId: string, role: 'nong_dan' | 'thuong_lai') {
    setConfirmations(prev => {
      const clone = { ...prev };
      clone[lineId] = { ...(clone[lineId] || {}), [role]: !clone[lineId]?.[role] };
      return clone;
    });
  }

  function ensureContractDraftExists() {
    if (!contractDraft) {
      setContractDraft({
        san_pham: productName,
        so_luong: null,
        don_vi_tinh: 'tấn',
        don_gia: null,
        han_giao_hang: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        dieu_khoan_chat_luong: [],
        confidence: null,
        evidence: [],
      });
    }
  }

  function parseMoneyPhrase(phrase: string): number | null {
    if (!phrase) return null;
    // Normalize separators
    const p = phrase.replace(/\./g, '').replace(/,/g, '').replace(/\s+/g, ' ');
    // Match forms like '9 triệu', '9.5 triệu', '9000000', '9,000,000'
    const m = /([0-9]+(?:[.,][0-9]+)?)\s*(triệu|tr|tri[eê]u|nghìn|ngàn|k|vnđ|vnd|đ|dong|đồng)?/i.exec(p);
    if (!m) return null;
    let num = Number(m[1].toString().replace(',', '.'));
    const unit = (m[2] || '').toLowerCase();
    if (unit.includes('tri') || unit === 'tr') num = num * 1000000;
    else if (unit.includes('nghìn') || unit === 'k' || unit.includes('ngàn')) num = num * 1000;
    // if unit like vnđ but number is already full value, return numeric
    return Number.isFinite(num) ? Math.round(num) : null;
  }

  function parseQuantityPhrase(phrase: string): { qty: number | null; unit: string | null } {
    const q = /([0-9]+(?:[.,][0-9]+)?)\s*(tấn|tan|t?n|kg|kí?lô|bao|tạ|quintal|tons?)/i.exec(phrase);
    if (!q) return { qty: null, unit: null };
    const qty = Number(q[1].toString().replace(',', '.'));
    const unit = q[2];
    return { qty: Number.isFinite(qty) ? qty : null, unit };
  }

  function parseRelativeDays(phrase: string): string | null {
    const m = /(\d+)\s*ngày/.exec(phrase);
    if (m) {
      const days = Number(m[1]);
      if (Number.isFinite(days)) return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }
    return null;
  }

  function proposeFieldFromPhrase(phrase: string) {
    if (!phrase) return null;
    // Try money
    const money = parseMoneyPhrase(phrase);
    if (money != null) {
      setProposedSuggestion({ field: 'don_gia', value: money, phrase });
      ensureContractDraftExists();
      return;
    }

    // Try quantity
    const qty = parseQuantityPhrase(phrase);
    if (qty.qty != null) {
      setProposedSuggestion({ field: 'so_luong', value: qty.qty, phrase });
      ensureContractDraftExists();
      return;
    }

    // Try relative days for delivery
    const iso = parseRelativeDays(phrase);
    if (iso) {
      setProposedSuggestion({ field: 'han_giao_hang', value: iso, phrase });
      ensureContractDraftExists();
      return;
    }

    // Fallback: treat as product name
    setProposedSuggestion({ field: 'san_pham', value: phrase.trim(), phrase });
    ensureContractDraftExists();
  }

  function acceptSuggestion() {
    if (!proposedSuggestion) return;
    ensureContractDraftExists();
    setContractDraft((prev: any) => ({ ...prev, [proposedSuggestion.field]: proposedSuggestion.value }));
    setProposedSuggestion(null);
  }

  function addEvidence(phrase: string) {
    if (!phrase) return;
    ensureContractDraftExists();
    setContractDraft((prev: any) => ({ ...prev, evidence: [...(prev?.evidence || []), phrase] }));
  }

  function renderHighlighted(text: string) {
    // Build matches from evidence and regexes
    const matches: Array<{ start: number; end: number; text: string }> = [];
    const evidenceArr: string[] = (contractDraft?.evidence as string[]) || [];
    for (const ev of evidenceArr) {
      if (!ev) continue;
      let idx = text.toLowerCase().indexOf(ev.toLowerCase());
      while (idx !== -1) {
        matches.push({ start: idx, end: idx + ev.length, text: text.slice(idx, idx + ev.length) });
        idx = text.toLowerCase().indexOf(ev.toLowerCase(), idx + ev.length);
      }
    }

    // money regex
    const moneyRegex = /[0-9]+(?:[.,][0-9]+)?\s*(?:triệu|tr|vnđ|vnd|đ|dong|đồng|nghìn|k)/gi;
    let m;
    while ((m = moneyRegex.exec(text)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }

    // quantity regex
    const qtyRegex = /[0-9]+(?:[.,][0-9]+)?\s*(?:tấn|ton|t?n|kg|bao|tạ)/gi;
    while ((m = qtyRegex.exec(text)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }

    if (matches.length === 0) return <>{text}</>;

    // merge & sort
    matches.sort((a, b) => a.start - b.start || b.end - a.end);
    const merged: typeof matches = [];
    for (const it of matches) {
      const last = merged[merged.length - 1];
      if (!last || it.start > last.end) merged.push({ ...it });
      else if (it.end > last.end) last.end = it.end;
    }

    const parts: React.ReactNode[] = [];
    let cursor = 0;
    for (const seg of merged) {
      if (seg.start > cursor) parts.push(text.slice(cursor, seg.start));
      const segText = text.slice(seg.start, seg.end);
      parts.push(
        <mark key={`${seg.start}-${seg.end}`} className="bg-yellow-300/30 text-yellow-100 cursor-pointer rounded px-1" onClick={() => proposeFieldFromPhrase(segText)}>
          {segText}
        </mark>
      );
      cursor = seg.end;
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
    return <>{parts}</>;
  }

  // Ref để lưu AgoraSTTClient và các câu thoại
  const sttClientRef = useRef<AgoraSTTClient | null>(null);
  const transcriptLinesRef = useRef<TranscriptLine[]>([]);

  // Khởi tạo STT Client theo channelName
  useEffect(() => {
    sttClientRef.current = new AgoraSTTClient(channelName);
    return () => {
      if (sttClientRef.current) {
        sttClientRef.current.stopSTT();
      }
    };
  }, [channelName]);

  // Sync ref với state
  useEffect(() => {
    transcriptLinesRef.current = transcriptLines;
  }, [transcriptLines]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // ==========================================
  // GỌI AI TRÍCH XUẤT (dùng ref để lấy transcript mới nhất)
  // ==========================================
  const triggerAIExtract = useCallback(async (lines: TranscriptLine[]) => {
    setLoadingExtract(true);
    setExtractError('');
    setActiveStep(2);

    // Build transcript string từ lines truyền vào
    const transcriptText = lines
      .map(l => `${l.vi_nguoi_noi === 'nong_dan' ? 'Nông dân' : 'Thương lái'}: ${l.noi_dung}`)
      .join('\n');

    console.log('[AI] Transcript gửi đi:', transcriptText);

    if (!transcriptText || transcriptText.trim().length < 10) {
      console.warn('[AI] Transcript quá ngắn.');
      setExtractError('Transcript quá ngắn — cần thu thập thêm lời thoại trước khi trích xuất.');
      setContractDraft(null);
      setLoadingExtract(false);
      setActiveStep(3);
      return;
    }

    try {
      const response = await fetch('/api/extract-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptText }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.terms) {
        console.log('[AI] ✅ Trích xuất thành công:', data.terms);
        setContractDraft(data.terms);
      } else if (response.status === 422 && data.terms) {
        // Low-confidence case: API returns partial `terms` and a warning message.
        console.warn('[AI] Cảnh báo độ tin cậy thấp nhưng trả về bản nháp:', data.error);
        setContractDraft(data.terms);
        setExtractError(data.error || 'Kết quả có độ tin cậy thấp — kiểm tra thủ công.');
      } else {
        console.error('[AI] Lỗi:', data.error);
        if (response.status === 422) {
          setExtractError(data.error || 'Không đủ dữ liệu để tạo hợp đồng. Hãy thu thập thêm thông tin.');
        } else {
          setExtractError(data.error || 'Lỗi trích xuất AI — thử lại sau.');
        }
        setContractDraft(null);
      }
    } catch (error: any) {
      console.error('[AI] Lỗi gọi API:', error);
      setExtractError('Không thể kết nối AI — thử lại sau.');
      setContractDraft(null);
    } finally {
      setLoadingExtract(false);
      setActiveStep(3);
    }
  }, []);

  // ==========================================
  // 1. GIẢ LẬP THOẠI (Mock STT)
  // ==========================================
  const startMockSTT = useCallback(() => {
    if (isRealSTTActive || isMockActive) return;
    if (!sttClientRef.current) return;

    setTranscriptLines([]);
    setContractDraft(null);
    setExtractError('');
    setActiveStep(1);

    const userRole = user?.vai_tro === 'nong_dan' ? 'nong_dan' : 'thuong_lai';

    sttClientRef.current.startSTT(
      (text, userId) => {
        if (!text.trim()) return;

        const priceMatch = text.match(/(\d+)\s*(triệu|tr)/i);
        if (priceMatch) {
          setProposedPrice(parseInt(priceMatch[1]) * 1000000);
        }

        const newLine: TranscriptLine = {
          id: Math.random().toString(36).substring(7),
          vi_nguoi_noi: userId,
          noi_dung: text,
          thoi_gian_noi: new Date().toISOString(),
          den_canh_bao: 'binh_thuong',
        };

        setTranscriptLines(prev => {
          const next = [...prev, newLine];
          
          if (next.length === 4) {
            setTimeout(() => {
              if (sttClientRef.current) {
                sttClientRef.current.stopSTT();
              }
              setIsRealSTTActive(false);
              setIsMockActive(false);
              triggerAIExtract(next);
            }, 1000);
          }
          return next;
        });
      },
      userRole,
      true // useMock = true
    );

    setIsRealSTTActive(false);
    setIsMockActive(true);
  }, [isRealSTTActive, isMockActive, user, triggerAIExtract]);

  // ==========================================
  // 2. STT THẬT (Web Speech API tiếng Việt qua STT Client)
  // ==========================================
  const startRealSTT = useCallback(() => {
    if (isRealSTTActive || isMockActive) return;
    if (!sttClientRef.current) return;

    setTranscriptLines([]);
    setContractDraft(null);
    setExtractError('');
    setActiveStep(1);

    const userRole = user?.vai_tro === 'nong_dan' ? 'nong_dan' : 'thuong_lai';

    sttClientRef.current.startSTT(
      (text, userId) => {
        if (!text.trim()) return;

        const priceMatch = text.match(/(\d+)\s*(triệu|tr)/i);
        if (priceMatch) {
          setProposedPrice(parseInt(priceMatch[1]) * 1000000);
        }

        const newLine: TranscriptLine = {
          id: Math.random().toString(36).substring(7),
          vi_nguoi_noi: userId,
          noi_dung: text,
          thoi_gian_noi: new Date().toISOString(),
          den_canh_bao: 'binh_thuong',
        };

        setTranscriptLines(prev => [...prev, newLine]);
      },
      userRole,
      false // useMock = false
    );

    setIsRealSTTActive(true);
    setIsMockActive(false);
  }, [isRealSTTActive, isMockActive, user]);

  const stopRealSTT = useCallback(() => {
    if (sttClientRef.current) {
      sttClientRef.current.stopSTT();
    }
    setIsRealSTTActive(false);
    setIsMockActive(false);

    const allLines = transcriptLinesRef.current;
    if (allLines.length > 0 && activeStep === 1) {
      triggerAIExtract(allLines);
    }
  }, [activeStep, triggerAIExtract]);

  // ==========================================
  // LƯU HỢP ĐỒNG VÀ CHUYỂN TRANG
  // ==========================================
  const handleLockSuccess = async (txSig: string) => {
    try {
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
      const params = new URLSearchParams();
      if (channelParam) params.set('channel', channelParam);
      params.set('scenario', scenario);
      params.set('tx', txSig);
      router.push(`/contract/${savedContract.id}?${params.toString()}`);
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
  const lastLine = transcriptLines.length > 0 ? transcriptLines[transcriptLines.length - 1] : null;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-neutral-900 font-sans">

      {/* HEADER */}
      <header className="flex-shrink-0 h-14 bg-neutral-900 border-b border-white/10 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-[#15803D] flex items-center justify-center text-white font-black text-sm shadow-lg">
              A
            </div>
            <span className="text-sm font-extrabold tracking-tight text-white">AgriTrust Meet</span>
          </Link>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-all border border-white/5"
          >
            <ArrowLeft size={14} />
            Quay lại
          </button>
           <div className="hidden md:flex items-center gap-1.5 pl-4 border-l border-white/10">
             <span className="text-xs text-neutral-400 font-medium">
               Kênh: <strong className="text-white">{channelName}</strong>
               {partnerName !== 'Đối tác' && <> | Đối tác: <strong className="text-white">{partnerName}</strong></>}
             </span>
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

      {/* MAIN CONTENT */}
      <main className="flex-1 flex overflow-hidden relative bg-black">
        <div className="flex w-full h-full">
          <div className="flex-1 relative w-full h-full flex flex-col">
          <VideoCallFrame channelName={channelName} role={isNongDan ? "nong_dan" : "thuong_lai"} />

          {/* OVERLAY: NÚT STT + CẢNH BÁO GIÁ */}
          <div className="absolute top-4 left-4 z-40 flex flex-col items-start gap-3 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
              {/* Nút STT Thật */}
              {(!isRealSTTActive && !isMockActive) ? (
                <>
                  <button
                    onClick={startRealSTT}
                    disabled={activeStep > 1}
                    className="px-5 py-2.5 rounded-full bg-emerald-600/90 backdrop-blur-md hover:bg-emerald-500 text-white font-bold text-xs shadow-xl active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                  >
                    <Mic size={14} />
                    Bắt đầu nghe (STT Thật)
                  </button>
                  <button
                    onClick={startMockSTT}
                    disabled={activeStep > 1}
                    className="px-5 py-2.5 rounded-full bg-indigo-600/90 backdrop-blur-md hover:bg-indigo-500 text-white font-bold text-xs shadow-xl active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                  >
                    <Sparkles size={14} />
                    Giả lập Thoại (Demo)
                  </button>
                </>
              ) : (
                <button
                  onClick={stopRealSTT}
                  className="px-5 py-2.5 rounded-full bg-red-600/90 backdrop-blur-md hover:bg-red-500 text-white font-bold text-xs shadow-xl active:scale-95 transition-all flex items-center gap-2 border border-white/10"
                >
                  <MicOff size={14} className="animate-pulse" />
                  {isMockActive ? 'Dừng giả lập & Trích xuất AI' : 'Dừng nghe & Trích xuất AI'}
                </button>
              )}
            </div>

            {/* Badge STT thật */}
            {isRealSTTActive && (
              <div className="pointer-events-auto px-3 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-emerald-300 font-bold">STT đang nghe tiếng Việt — Hãy nói vào micro</span>
              </div>
            )}
            {isMockActive && (
              <div className="pointer-events-auto px-3 py-1.5 rounded-full bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="text-[10px] text-indigo-300 font-bold">Đang chạy giả lập thoại — Vui lòng chờ...</span>
              </div>
            )}
            
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

          {/* FLOATING CLOSED CAPTIONS (phụ đề) */}
          {lastLine && (isRealSTTActive || isMockActive) && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-45 text-center pointer-events-none animate-fadeIn">
              <div className="bg-black/75 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-2xl text-white inline-block max-w-full">
                <span className={`text-[9px] uppercase tracking-wider font-extrabold block mb-1 ${
                  lastLine.vi_nguoi_noi === 'nong_dan' ? 'text-emerald-400' : 'text-indigo-400'
                }`}>
                  {lastLine.vi_nguoi_noi === 'nong_dan' ? 'Nông dân' : 'Thương lái'}
                </span>
                <p className="text-sm font-semibold leading-relaxed">
                  &ldquo;{lastLine.noi_dung}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* AI EXTRACTION STATUS */}
          {activeStep === 2 && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md border border-indigo-500/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
              <Loader2 size={15} className="animate-spin text-indigo-400" />
              <span className="text-xs font-bold text-slate-100">AgriTrust AI (MiniMax-M3) đang trích xuất điều khoản...</span>
            </div>
          )}

          {/* ERROR BANNER */}
          {extractError && activeStep === 3 && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-amber-950/90 backdrop-blur-md border border-amber-500/30 px-5 py-2.5 rounded-full flex items-center gap-3 shadow-2xl">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-xs font-medium text-amber-200">{extractError}</span>
              <div className="ml-3 flex items-center gap-2">
                <button
                  onClick={() => { setManualError(''); setIsManualOpen(true); }}
                  className="text-xs font-semibold px-3 py-1 rounded bg-amber-700/40 hover:bg-amber-700/50 text-white"
                >
                  Nhập mẫu hợp đồng
                </button>
                <button
                  onClick={() => { setExtractError(''); triggerAIExtract(transcriptLinesRef.current); }}
                  className="text-xs font-semibold px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Thử lại AI
                </button>
              </div>
            </div>
          )}

          {/* CONTRACT READY TOAST */}
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
                    AI đã tự động lập điều khoản từ cuộc đàm thoại. Bấm để xem lại và ký quỹ.
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
        <aside className="w-96 bg-slate-900/90 border-l border-white/10 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white">Kịch bản & Bản ghi</h4>
            <div className="text-xs text-neutral-400">Xác nhận hai bên</div>
          </div>

          <div className="space-y-3">
            {transcriptLines.length === 0 ? (
              <div className="text-sm text-neutral-500">Chưa có lời thoại. Bật STT để bắt đầu.</div>
            ) : (
              <ul className="space-y-2">
                {transcriptLines.map((line) => (
                  <li key={line.id} className="bg-black/40 p-3 rounded-md border border-white/5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className={`text-xs font-bold ${line.vi_nguoi_noi === 'nong_dan' ? 'text-emerald-300' : 'text-indigo-300'}`}>
                          {line.vi_nguoi_noi === 'nong_dan' ? 'Nông dân' : 'Thương lái'}
                          <span className="ml-2 text-[10px] text-neutral-400 font-medium">{new Date(line.thoi_gian_noi).toLocaleTimeString()}</span>
                        </div>
                        <p className="mt-1 text-sm leading-snug text-neutral-100">{renderHighlighted(line.noi_dung)}</p>
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleConfirmation(line.id, 'nong_dan')}
                            title="Nông dân xác nhận"
                            className={`p-1 rounded-md text-xs font-semibold ${confirmations[line.id]?.nong_dan ? 'bg-emerald-600 text-white' : 'bg-white/5 text-neutral-300'}`}
                          >
                            <UserCheck size={14} />
                          </button>
                          <button
                            onClick={() => toggleConfirmation(line.id, 'thuong_lai')}
                            title="Thương lái xác nhận"
                            className={`p-1 rounded-md text-xs font-semibold ${confirmations[line.id]?.thuong_lai ? 'bg-indigo-600 text-white' : 'bg-white/5 text-neutral-300'}`}
                          >
                            <Check size={14} />
                          </button>
                        </div>

                        <div className="text-[11px] text-neutral-400">{confirmations[line.id]?.nong_dan && confirmations[line.id]?.thuong_lai ? 'Đã xác nhận' : 'Chưa đầy đủ'}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {proposedSuggestion && (
            <div className="mt-4 p-3 bg-slate-800 rounded-md border border-slate-700">
              <div className="text-xs text-neutral-300">Gợi ý từ câu:</div>
              <div className="text-sm text-white font-semibold mt-1">{proposedSuggestion.phrase}</div>
              <div className="mt-2 text-sm text-neutral-200">Gợi ý điền <span className="font-bold text-white">{proposedSuggestion.field}</span>: <span className="ml-1 font-medium">{String(proposedSuggestion.value)}</span></div>
              <div className="mt-3 flex gap-2">
                <button onClick={acceptSuggestion} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">Chấp nhận</button>
                <button onClick={() => addEvidence(proposedSuggestion.phrase)} className="px-3 py-1 bg-slate-700 text-white rounded text-sm">Thêm evidence</button>
                <button onClick={() => setProposedSuggestion(null)} className="px-3 py-1 bg-slate-600 text-white rounded text-sm">Bỏ</button>
              </div>
            </div>
          )}
        </aside>
      </div>
      </main>

      {/* CONTRACT MODAL */}
      {/* MANUAL ENTRY MODAL */}
      {isManualOpen && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col overflow-hidden animate-scaleUp">
            <button
              onClick={() => setIsManualOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors z-10"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white mb-2">Nhập mẫu hợp đồng thủ công</h3>
            <p className="text-sm text-neutral-400 mb-4">Dán JSON hợp đồng hoặc sửa mẫu bên dưới, sau đó nhấn Áp dụng để xem/xác nhận.</p>

            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="w-full h-64 bg-black/60 text-sm text-white p-3 rounded-md border border-slate-700 resize-none"
            />
            {manualError && <p className="text-xs text-rose-400 mt-2">{manualError}</p>}

            <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-800 pt-4 flex-shrink-0">
              <button
                onClick={() => { setIsManualOpen(false); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-sm"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  try {
                    const parsed = JSON.parse(manualText);
                    if (!parsed || typeof parsed !== 'object') {
                      setManualError('JSON không hợp lệ — phải là một object hợp lệ.');
                      return;
                    }

                    // Normalize a few common fields
                    if (!Array.isArray(parsed.dieu_khoan_chat_luong)) parsed.dieu_khoan_chat_luong = parsed.dieu_khoan_chat_luong == null ? [] : parsed.dieu_khoan_chat_luong;
                    if (parsed.so_luong != null && typeof parsed.so_luong !== 'number') {
                      const n = Number(parsed.so_luong);
                      parsed.so_luong = Number.isFinite(n) ? n : null;
                    }
                    if (parsed.don_gia != null && typeof parsed.don_gia !== 'number') {
                      const n = Number(parsed.don_gia);
                      parsed.don_gia = Number.isFinite(n) ? n : null;
                    }

                    setContractDraft(parsed);
                    setIsManualOpen(false);
                    setIsModalOpen(true);
                    setExtractError('');
                    setManualError('');
                  } catch (e: any) {
                    setManualError('JSON không hợp lệ: ' + (e?.message || 'Lỗi parse'));
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-bold"
              >
                Áp dụng mẫu
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && contractDraft && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col overflow-hidden animate-scaleUp">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors z-10"
            >
              <X size={18} />
            </button>

            <div className="flex-1 overflow-y-auto pr-2 mt-4 min-h-0">
              <DraftContractTable
                terms={contractDraft}
                onChange={setContractDraft}
              />
            </div>

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

export default function CallPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#15803D]" />
      </div>
    }>
      <CallPageContent />
    </Suspense>
  );
}
