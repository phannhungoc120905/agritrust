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
import { decodeMeetingParams, encodeMeetingParams } from '../../lib/utils/url';
import { supabase } from '../../lib/supabase/client';

import ConnectWalletButton from '../../components/shared/ConnectWalletButton';
import WalletBalance from '../../components/shared/WalletBalance';
import { useAuth } from '../../hooks/useAuth';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey, TransactionInstruction } from '@solana/web3.js';
import bs58 from 'bs58';
import { ContractSignature } from '../../components/negotiation/DraftContractTable';
import { LogOut, Loader2, FileSignature, Mic, MicOff, Sparkles, X, AlertTriangle, Check, UserCheck, ArrowLeft, MessageSquare, Send, Share2, CheckCircle2 } from 'lucide-react';

interface TranscriptLine {
  id: string;
  vi_nguoi_noi: string;
  noi_dung: string;
  thoi_gian_noi: string;
  den_canh_bao?: 'binh_thuong' | 'canh_bao_do';
}

function detectProductInText(text: string): string | null {
  if (!text) return null;
  const normalized = text.toLowerCase();
  
  // Danh sách từ khóa map với tên sản phẩm trong CSDL
  const mappings = [
    { keywords: ["sầu riêng", "ri6", "monthong"], name: "Sầu riêng Ri6 (loại 1)" },
    { keywords: ["thanh long"], name: "Thanh long ruột đỏ" },
    { keywords: ["xoài"], name: "Xoài cát Chu" },
    { keywords: ["mít"], name: "Mít Thái" },
    { keywords: ["bưởi"], name: "Bưởi da xanh" },
    { keywords: ["cam sành", "trái cam"], name: "Cam sành" },
    { keywords: ["dưa hấu"], name: "Dưa hấu" },
    { keywords: ["chuối"], name: "Chuối già Nam Mỹ" },
    { keywords: ["chanh dây", "chanh leo"], name: "Chanh dây" },
    { keywords: ["măng cụt"], name: "Măng cụt" },
    { keywords: ["quả bơ", "trái bơ"], name: "Bơ sáp" },
    { keywords: ["quả ổi", "trái ổi"], name: "Ổi lê" },
    { keywords: ["dứa", "trái thơm", "quả thơm", "khóm"], name: "Dứa (Khóm)" },
    { keywords: ["dừa"], name: "Dừa xiêm" },
    { keywords: ["dưa leo", "dưa chuột"], name: "Dưa leo" },
    { keywords: ["cà chua"], name: "Cà chua" },
    { keywords: ["ớt"], name: "Ớt chỉ thiên" },
    { keywords: ["tỏi"], name: "Tỏi khô" },
    { keywords: ["gừng"], name: "Gừng" },
    { keywords: ["rau muống"], name: "Rau muống" },
    { keywords: ["cà phê", "robusta", "cafe", "arabica"], name: "Cà phê Robusta" },
    { keywords: ["hồ tiêu", "hạt tiêu", "tiêu đen"], name: "Hồ tiêu đen" },
    { keywords: ["lúa st25", "gạo st25", "st25"], name: "Lúa ST25" },
    { keywords: ["lúa", "gạo"], name: "Lúa (chung)" }
  ];

  for (const item of mappings) {
    if (item.keywords.some(k => normalized.includes(k))) {
      return item.name;
    }
  }
  return null;
}

function formatVietnamesePunctuation(text: string): string {
  if (!text) return '';
  let formatted = text.trim();
  if (formatted.length === 0) return '';

  // Viết hoa chữ cái đầu tiên
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  // Nếu câu chưa kết thúc bằng dấu câu chính (. hoặc ? hoặc !)
  if (!/[.!?]$/.test(formatted)) {
    const lowerText = formatted.toLowerCase();
    
    // Các cụm từ hỏi tiếng Việt phổ biến
    const questionPatterns = [
      /\bbao nhiêu\b/,
      /\bđược không\b/,
      /\bkhông\b$/,
      /\bchưa\b$/,
      /\bgì\b/,
      /\bđâu\b/,
      /\bsao\b/,
      /\bthế nào\b/,
      /\bai\b/,
      /\bnhỉ\b$/,
      /\bhả\b$/,
      /\bcó phải\b/
    ];

    const isQuestion = questionPatterns.some(pattern => pattern.test(lowerText));
    if (isQuestion) {
      formatted += '?';
    } else {
      formatted += '.';
    }
  }

  return formatted;
}

function CallPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Decode compressed parameters from the 'p' query param if present
  const p = searchParams.get('p');
  const decoded = p ? decodeMeetingParams(p) : null;

  const scenario = decoded?.scenario || searchParams.get('scenario') || 'A';
  const channelParam = decoded?.channel || searchParams.get('channel');
  const channelName = channelParam || 'dam-phan-lua-st25';

  const { user, loading, logout, login } = useAuth();
  const startRealSTTRef = useRef<any>(null);

  const setCallActiveInDb = async (active: boolean) => {
    if (channelName && channelName !== 'dam-phan-lua-st25' && channelName !== 'dummy_id' && user) {
      try {
        const { data: con } = await supabase.from('hop_dong').select('noi_dung_nhap_ai').eq('id', channelName).single();
        const currentAiContent = con?.noi_dung_nhap_ai || {};

        const isSeller = user.vai_tro === 'nong_dan';
        const updatedAiContent = {
          ...currentAiContent,
          is_seller_online: isSeller ? active : (currentAiContent.is_seller_online || false),
          is_buyer_online: !isSeller ? active : (currentAiContent.is_buyer_online || false)
        };

        await supabase.from('hop_dong').update({
          noi_dung_nhap_ai: updatedAiContent
        }).eq('id', channelName);
        console.log(`[DB] Đặt trạng thái online: Seller=${updatedAiContent.is_seller_online}, Buyer=${updatedAiContent.is_buyer_online}`);
      } catch (err) {
        console.warn('Lỗi cập nhật trạng thái cuộc gọi:', err);
      }
    }
  };

  const productParam = decoded?.product || searchParams.get('product') || 'Lúa thơm ST25';
  const partnerParam = decoded?.partner || searchParams.get('partner') || 'Đối tác';

  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [proposedPrice, setProposedPrice] = useState(0);
  const [productName, setProductName] = useState(productParam);
  const [partnerName, setPartnerName] = useState(partnerParam);

  const [copiedLink, setCopiedLink] = useState(false);
  const handleShareLink = () => {
    if (typeof window !== 'undefined' && user) {
      const encoded = encodeMeetingParams({
        channel: channelName,
        scenario: scenario,
        product: productName,
        partner: user.ten_hien_thi
      });
      const domain = window.location.origin;
      const shareUrl = `${domain}/call?p=${encoded}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const [referencePrice, setReferencePrice] = useState(0);

  useEffect(() => {
    async function fetchPrice() {
      if (!productName) return;
      try {
        const res = await fetch(`/api/market-price?product=${encodeURIComponent(productName)}`);
        const data = await res.json();
        if (data.price) {
          setReferencePrice(data.price);
        } else {
          setReferencePrice(6000); // Fallback mặc định Lúa (đồng/kg)
        }
      } catch (error) {
        console.error("Lỗi lấy giá tham chiếu:", error);
        setReferencePrice(6000);
      }
    }
    fetchPrice();
  }, [productName]);

  // Tự động đồng bộ tên sản phẩm đã nhận diện vào bản dự thảo hợp đồng
  useEffect(() => {
    if (productName && productName !== 'Liên hệ chung' && productName !== 'Nông sản') {
      setContractDraft((prev: any) => {
        if (!prev) return { san_pham: productName };
        if (prev.san_pham === productName) return prev;
        return { ...prev, san_pham: productName };
      });
    }
  }, [productName]);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [contractDraft, setContractDraft] = useState<any>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWaitingPartnerAI, setIsWaitingPartnerAI] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerTypingField, setPartnerTypingField] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(1); // 1: Đàm thoại, 2: Trích xuất, 3: Ký quỹ
  const [isRealSTTActive, setIsRealSTTActive] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const [isMockActive, setIsMockActive] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isDemoCall, setIsDemoCall] = useState(false);
  const [partnerCount, setPartnerCount] = useState(0);

  const suggestionData = React.useMemo(() => {
    const pName = productName.toLowerCase();
    if (pName.includes('sầu riêng') || pName.includes('ri6')) {
      return {
        productName: productName,
        qty: '1 tấn',
        price: '120 triệu đồng một tấn',
        quality: 'Sầu riêng Ri6 cơm vàng hạt lép chín tự nhiên, không sượng.',
        penalty: 'Tỷ lệ sượng trên 5% giảm 10% đơn giá, sượng trên 10% bên mua được trả lại hàng.'
      };
    }
    if (pName.includes('cà phê') || pName.includes('robusta')) {
      return {
        productName: productName,
        qty: '2 tấn',
        price: '75 triệu đồng một tấn',
        quality: 'Cà phê nhân xô chế biến ướt, hạt sàn 18, độ ẩm dưới 12.5%.',
        penalty: 'Độ ẩm thực tế trên 13% phạt giảm 1% trọng lượng, trên 14% bên mua hủy hợp đồng.'
      };
    }
    if (pName.includes('dưa leo') || pName.includes('dưa chuột')) {
      return {
        productName: productName,
        qty: '1 tấn',
        price: '12 triệu đồng một tấn',
        quality: 'Dưa leo sạch, hái sớm trong ngày, quả dài đều từ 12 đến 15 cm.',
        penalty: 'Tỷ lệ dập nát hoặc quả cong vẹo trên 5% thì giảm 5% giá trị hợp đồng.'
      };
    }
    if (pName.includes('thanh long')) {
      return {
        productName: productName,
        qty: '3 tấn',
        price: '22 triệu đồng một tấn',
        quality: 'Thanh long ruột đỏ vỏ bóng đẹp không sâu bệnh, tai xanh cứng cáp.',
        penalty: 'Tai úa héo trên 10% giảm 8% giá trị đơn hàng, dập nát trên 15% hủy hợp đồng.'
      };
    }
    return {
      productName: productName,
      qty: '10 tấn',
      price: '8.5 triệu đồng một tấn',
      quality: 'Lúa ST25 tươi thu hoạch bằng máy, độ ẩm dưới 14%, không lẫn tạp chất.',
      penalty: 'Độ ẩm thực tế trên 14% phạt giảm 2% đơn giá, trên 15% bên mua được trả lại lúa.'
    };
  }, [productName]);

  // Chữ ký điện tử
  const { publicKey, signMessage, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [buyerSignature, setBuyerSignature] = useState<ContractSignature | null>(null);
  const [sellerSignature, setSellerSignature] = useState<ContractSignature | null>(null);
  const [isSigningBuyer, setIsSigningBuyer] = useState(false);
  const [isSigningSeller, setIsSigningSeller] = useState(false);
  const [isContractFinalized, setIsContractFinalized] = useState(false);

  const isRealSTTActiveRef = useRef(isRealSTTActive);
  const isMockActiveRef = useRef(isMockActive);

  useEffect(() => {
    isRealSTTActiveRef.current = isRealSTTActive;
  }, [isRealSTTActive]);

  useEffect(() => {
    isMockActiveRef.current = isMockActive;
  }, [isMockActive]);
  const [extractError, setExtractError] = useState('');
  const [displayedSubtitle, setDisplayedSubtitle] = useState<{ text: string; role: string } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
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

  // ==========================================
  // XỬ LÝ KÝ SỐ ĐIỆN TỬ BẰNG PHANTOM
  // ==========================================
  const handleSignContract = async (signerRole: 'nong_dan' | 'thuong_lai', typedName: string) => {
    if (!publicKey || !signMessage || !sendTransaction) {
      alert('Vui lòng kết nối ví Phantom trước khi ký!');
      return;
    }

    // Thiết lập timeout 40 giây tự động giải phóng trạng thái chờ ký nếu Phantom bị treo hoặc chậm
    const timeoutId = setTimeout(() => {
      setIsSigningSeller(false);
      setIsSigningBuyer(false);
      alert('Quá trình ký số bằng ví Phantom đang mất nhiều thời gian hơn bình thường (hơn 40s). Trạng thái chờ đã được giải phóng để bạn có thể thử lại. Vui lòng kiểm tra ví của bạn và thử lại.');
    }, 40000);

    try {
      if (signerRole === 'nong_dan') setIsSigningSeller(true);
      else setIsSigningBuyer(true);

      const messageContent = `Tôi, ${typedName}, đồng ý ký xác nhận Hợp đồng thông minh AgriTrust.\nVai trò: ${signerRole === 'nong_dan' ? 'Nông dân (Bên bán)' : 'Thương lái (Bên mua)'}\nThời gian: ${new Date().toISOString()}`;
      const messageUint8 = new TextEncoder().encode(messageContent);
      const signatureUint8 = await signMessage(messageUint8);
      const signatureBase58 = bs58.encode(signatureUint8);

      const verifyRes = await fetch('/api/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: publicKey.toBase58(),
          signature: signatureBase58,
          message: messageContent,
          contractData: contractDraft,
          signerName: typedName
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Lỗi xác thực chữ ký');

      // XÓA BƯỚC GỬI GIAO DỊCH LÊN CHUỖI ĐỂ TRÁNH PHANTOM HIỆN LÊN QUÁ NHIỀU LẦN!
      // Chữ ký `signatureBase58` (signMessage) đã được verify và chứng thực hợp đồng an toàn, 
      // ta chỉ cần lưu nó vào CSDL là đủ cơ sở pháp lý, không cần tốn phí mạng lưới ở bước Ký này.

      const newSignature: ContractSignature = {
        name: typedName,
        wallet: publicKey.toBase58(),
        timestamp: new Date().toISOString(),
        txHash: verifyData.hash || signatureBase58.substring(0, 32) // Lưu hash làm id tham chiếu thay vì txHash
      };

      let newNoiDungNhapAi = { ...(contractDraft?.noi_dung_nhap_ai || {}) };
      if (signerRole === 'nong_dan') {
        setSellerSignature(newSignature);
        newNoiDungNhapAi.sellerSignature = newSignature;
      } else {
        setBuyerSignature(newSignature);
        newNoiDungNhapAi.buyerSignature = newSignature;
      }

      // 💾 Lưu chữ ký vào Database ngay lập tức để không mất state khi F5
      if (channelName && channelName !== 'dam-phan-lua-st25' && channelName !== 'dummy_id') {
        newNoiDungNhapAi.is_seller_online = user?.vai_tro === 'nong_dan' ? true : (newNoiDungNhapAi.is_seller_online || false);
        newNoiDungNhapAi.is_buyer_online = user?.vai_tro === 'thuong_lai' ? true : (newNoiDungNhapAi.is_buyer_online || false);
        import('../../lib/supabase/queries/contracts').then(m => {
          m.updateContractDraftData(channelName, {
            san_pham: contractDraft.san_pham,
            so_luong: contractDraft.so_luong,
            don_vi_tinh: contractDraft.don_vi_tinh,
            don_gia: contractDraft.don_gia,
            han_giao_hang: contractDraft.han_giao_hang,
            dieu_khoan_chat_luong: contractDraft.dieu_khoan_chat_luong,
            noi_dung_nhap_ai: newNoiDungNhapAi
          }).catch(e => console.warn('Lỗi lưu chữ ký DB:', e));
        });
      }

      // Phát Broadcast Chữ ký cho đối tác
      if (sttChannelRef.current) {
        sttChannelRef.current.send({
          type: 'broadcast',
          event: 'contract_signed',
          payload: { role: signerRole, signature: newSignature }
        });
      }

    } catch (error: any) {
      console.error('Sign error:', error);
      if (error.message?.includes('User rejected the request')) {
        alert('Bạn đã từ chối ký giao dịch. (Lưu ý: Nếu ví báo lỗi đỏ "Simulation failed" hoặc không cho ký, hãy chắc chắn bạn đang dùng mạng Devnet và có đủ Devnet SOL trong ví Phantom. Bạn có thể lên faucet.solana.com để xin SOL ảo).');
      } else {
        alert('Lỗi ký số: ' + error.message);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsSigningSeller(false);
      setIsSigningBuyer(false);
    }
  };



  // Ref để lưu AgoraSTTClient và các câu thoại
  const sttClientRef = useRef<AgoraSTTClient | null>(null);
  const sttChannelRef = useRef<any>(null);
  const transcriptLinesRef = useRef<TranscriptLine[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isAgoraCloudSTTActive, setIsAgoraCloudSTTActive] = useState(false);
  const agoraAgentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [transcriptLines, isChatOpen]);

  // Khởi tạo kênh STT Realtime bằng Supabase Broadcast
  useEffect(() => {
    if (!channelName || !user) return;
    const channel = supabase.channel(`stt_${channelName}`, {
      config: { broadcast: { ack: false } }
    });

    channel.on('broadcast', { event: 'stt_text' }, ({ payload }) => {
      const { text, userId, isFinal, senderWallet } = payload;
      // Tránh tự xử lý lại tin của chính mình bằng địa chỉ ví (hoặc vai trò nếu không có ví)
      if (senderWallet ? senderWallet === user.dia_chi_vi : userId === (user.vai_tro === 'nong_dan' ? 'nong_dan' : 'thuong_lai')) return;

      if (!text.trim()) return;
      setDisplayedSubtitle({ text, role: userId });

      if (isFinal) {
        setTimeout(() => {
          setDisplayedSubtitle(prev => {
            if (prev?.text === text) return null;
            return prev;
          });
        }, 3000);

        const priceMatch = text.match(/(\d+)\s*(triệu|tr)/i);
        if (priceMatch) {
          setProposedPrice(parseInt(priceMatch[1]) * 1000000);
        }

        const detected = detectProductInText(text);
        if (detected) {
          console.log('🔄 Đã phát hiện sản phẩm từ giọng nói đối tác:', detected);
          setProductName(detected);
        }

        const newLine: TranscriptLine = {
          id: Math.random().toString(36).substring(7),
          vi_nguoi_noi: userId,
          noi_dung: formatVietnamesePunctuation(text),
          thoi_gian_noi: new Date().toISOString(),
          den_canh_bao: 'binh_thuong',
        };

        setTranscriptLines(prev => {
          const next = [...prev, newLine];
          if (next.length === 6) {
            setTimeout(() => {
              // Note: triggerAIExtract is included in deps
            }, 1000);
          }
          return next;
        });
      }
    });

    channel.on('broadcast', { event: 'product_update' }, ({ payload }) => {
      if (payload && payload.productName) {
        console.log('🔄 Nhận cập nhật tên sản phẩm đàm thoại:', payload.productName);
        setProductName(payload.productName);
      }
    });

    channel.on('broadcast', { event: 'contract_signed' }, ({ payload }) => {
      const { role, signature } = payload;
      if (role === 'nong_dan') setSellerSignature(signature);
      else setBuyerSignature(signature);
    });

    // 📡 Nhận tín hiệu Hợp đồng cập nhật từ người kia
    channel.on('broadcast', { event: 'contract_update' }, ({ payload }) => {
      console.log('🔄 Đã nhận dữ liệu hợp đồng cập nhật từ đối tác:', payload);
      setContractDraft(payload.contract);
      setIsWaitingPartnerAI(false); // Xong AI, tắt trạng thái chờ
      setIsModalOpen(true); // Bật popup
      if ((window as any).aiWaitTimeout) clearTimeout((window as any).aiWaitTimeout);
    });

    // 📡 Nhận tín hiệu đối tác đang gõ
    channel.on('broadcast', { event: 'contract_typing' }, ({ payload }) => {
      setPartnerTyping(true);
      if (payload && payload.field) {
        setPartnerTypingField(payload.field);
      }
      // Tự tắt sau 3 giây nếu không nhận được thêm
      if ((window as any).typingTimeout) clearTimeout((window as any).typingTimeout);
      (window as any).typingTimeout = setTimeout(() => {
        setPartnerTyping(false);
        setPartnerTypingField(null);
      }, 3000);
    });

    // 📡 Nhận lệnh ĐỒNG BỘ CHỐT HỢP ĐỒNG (Chỉ đứng chờ, không gọi AI)
    channel.on('broadcast', { event: 'wait_extract' }, ({ payload }) => {
      if (payload?.sender === user?.dia_chi_vi) return; // Bỏ qua nếu chính mình là người gửi lệnh

      console.log('🔄 Đối tác đang dùng AI để tạo hợp đồng, vui lòng chờ...');
      setDisplayedSubtitle({ text: "🎙️ Đối tác yêu cầu chốt hợp đồng. Đang kích hoạt AI...", role: 'system' });
      setIsWaitingPartnerAI(true);
      if (sttClientRef.current) {
        sttClientRef.current.stopSTT();
      }
      setIsRealSTTActive(false);

      // Timeout giải phóng kẹt màn hình chờ AI
      if ((window as any).aiWaitTimeout) clearTimeout((window as any).aiWaitTimeout);
      (window as any).aiWaitTimeout = setTimeout(() => {
        setIsWaitingPartnerAI(false);
        setExtractError('Quá trình kết nối AI của đối tác bị gián đoạn. Vui lòng thử lại.');
      }, 25000);
    });

    // 📡 Nhận tín hiệu Đối tác gọi AI thất bại
    channel.on('broadcast', { event: 'extract_failed' }, ({ payload }) => {
      console.log('🔄 Đối tác gọi AI thất bại:', payload);
      setIsWaitingPartnerAI(false);
      setExtractError(payload?.error || 'Đối tác gọi AI thất bại, vui lòng thử lại.');
      if ((window as any).aiWaitTimeout) clearTimeout((window as any).aiWaitTimeout);
    });

    // 📡 Nhận sự kiện Hợp đồng đã khoá quỹ thành công
    channel.on('broadcast', { event: 'contract_locked' }, ({ payload }) => {
      console.log('🔄 Hợp đồng đã được khóa quỹ thành công bởi đối tác!', payload);
      setIsContractFinalized(true);
    });



    channel.subscribe();
    sttChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      sttChannelRef.current = null;
    };
  }, [channelName, user]);

  // Khởi tạo STT Client theo channelName
  useEffect(() => {
    sttClientRef.current = new AgoraSTTClient(channelName);
    return () => {
      if (sttClientRef.current) {
        sttClientRef.current.stopSTT();
      }
      setCallActiveInDb(false);
    };
  }, [channelName]);

  // Tải thông tin hợp đồng nháp và đối tác từ database
  useEffect(() => {
    if (!channelName || channelName === 'dam-phan-lua-st25' || channelName === 'dummy_id') {
      ensureContractDraftExists();
      return;
    }

    const loadContract = async () => {
      try {
        const { getContractById } = await import('../../lib/supabase/queries/contracts');
        const { getTranscriptsByContractId } = await import('../../lib/supabase/queries/transcripts');

        // 1. TẢI LỊCH SỬ THOẠI (STT) TỪ DATABASE
        try {
          const oldLines = await getTranscriptsByContractId(channelName);
          if (oldLines && oldLines.length > 0 && user) {
            const myWallet = user.dia_chi_vi;
            const myRole = user.vai_tro;
            const partnerRole = myRole === 'nong_dan' ? 'thuong_lai' : 'nong_dan';

            setTranscriptLines(oldLines.map((l: any) => ({
              id: l.id,
              vi_nguoi_noi: l.vi_nguoi_noi === myWallet ? myRole : partnerRole,
              noi_dung: l.noi_dung,
              thoi_gian_noi: l.thoi_gian_noi,
              den_canh_bao: l.den_canh_bao
            })));
          }
        } catch (err) {
          console.warn("Lỗi load STT lịch sử:", err);
        }

        // 2. TẢI HỢP ĐỒNG NHÁP
        const con = await getContractById(channelName);
        if (con) {
          // Khôi phục trạng thái Agora STT Bot nếu có lưu trên DB
          if (con.noi_dung_nhap_ai?.agora_stt_agent_id) {
            agoraAgentIdRef.current = con.noi_dung_nhap_ai.agora_stt_agent_id;
            setIsAgoraCloudSTTActive(true);
            console.log('[Agora Cloud STT] Khôi phục Agent ID từ hợp đồng:', con.noi_dung_nhap_ai.agora_stt_agent_id);
          }

          const hasDraftAgreed = con.don_gia > 0 ||
            (con.dieu_khoan_chat_luong && con.dieu_khoan_chat_luong.length > 0) ||
            con.noi_dung_nhap_ai?.buyerSignature ||
            con.noi_dung_nhap_ai?.sellerSignature;

          setContractDraft({
            ...con,
            san_pham: con.san_pham,
            so_luong: con.so_luong,
            don_vi_tinh: con.don_vi_tinh || 'tấn',
            don_gia: con.don_gia,
            han_giao_hang: con.han_giao_hang || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            dieu_khoan_chat_luong: con.dieu_khoan_chat_luong || [],
            confidence: con.noi_dung_nhap_ai?.confidence || null,
            evidence: con.noi_dung_nhap_ai?.evidence || [],
          });

          if (con.noi_dung_nhap_ai?.buyerSignature) {
            setBuyerSignature(con.noi_dung_nhap_ai.buyerSignature);
          }
          if (con.noi_dung_nhap_ai?.sellerSignature) {
            setSellerSignature(con.noi_dung_nhap_ai.sellerSignature);
          }

          if (con.san_pham) {
            setProductName(con.san_pham);
          }

          if (hasDraftAgreed) {
            setIsModalOpen(true);
          }

          if (user) {
            const partnerAddress = user.vai_tro === 'nong_dan' ? con.vi_nguoi_mua : con.vi_nguoi_ban;
            if (partnerAddress) {
              const { data: userData } = await supabase
                .from('nguoi_dung')
                .select('ten_hien_thi')
                .eq('dia_chi_vi', partnerAddress)
                .maybeSingle();
              if (userData?.ten_hien_thi) {
                setPartnerName(userData.ten_hien_thi);
              }
            }
          }
        } else {
          ensureContractDraftExists();
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin hợp đồng nháp từ database:', err);
        ensureContractDraftExists();
      }
    };

    if (user) {
      loadContract();
    }
  }, [channelName, user]);

  // Tự động chuyển hướng đến trang đăng nhập nếu chưa đăng nhập
  useEffect(() => {
    if (!loading && !user) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
      const redirectUrl = currentPath ? `/login?redirect=${encodeURIComponent(currentPath)}` : '/login';
      router.push(redirectUrl);
    }
  }, [user, loading, router]);

  // Sync ref với state
  useEffect(() => {
    transcriptLinesRef.current = transcriptLines;
  }, [transcriptLines]);

  // Bỏ tự động redirect sang /login để cho phép chọn vai trò Khách ngay tại trang này

  // ==========================================
  // TỰ ĐỘNG LƯU HỢP ĐỒNG KHI CÓ THAY ĐỔI
  // ==========================================
  useEffect(() => {
    if (!contractDraft || !channelName || channelName === 'dam-phan-lua-st25' || channelName === 'dummy_id') return;

    // Debounce việc lưu để tránh spam DB mỗi khi gõ phím
    const timeoutId = setTimeout(() => {
      import('../../lib/supabase/queries/contracts').then(m => {
        m.updateContractDraftData(channelName, {
          san_pham: contractDraft.san_pham,
          so_luong: contractDraft.so_luong,
          don_vi_tinh: contractDraft.don_vi_tinh,
          don_gia: contractDraft.don_gia,
          han_giao_hang: contractDraft.han_giao_hang,
          dieu_khoan_chat_luong: contractDraft.dieu_khoan_chat_luong,
          noi_dung_nhap_ai: {
            ...(contractDraft.noi_dung_nhap_ai || {}),
            is_seller_online: user?.vai_tro === 'nong_dan' ? true : (contractDraft.noi_dung_nhap_ai?.is_seller_online || false),
            is_buyer_online: user?.vai_tro === 'thuong_lai' ? true : (contractDraft.noi_dung_nhap_ai?.is_buyer_online || false)
          }
        }).catch(e => console.warn('Lỗi auto-save hợp đồng:', e));
      });
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [contractDraft, channelName]);

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
        body: JSON.stringify({ transcript: transcriptText, productName }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.terms) {
        console.log('[AI] ✅ Trích xuất thành công:', data.terms);
        setContractDraft(data.terms);
        setIsModalOpen(true);
        if (sttChannelRef.current) {
          sttChannelRef.current.send({
            type: 'broadcast',
            event: 'contract_update',
            payload: { contract: data.terms }
          });
        }
      } else if (response.status === 422 && data.terms) {
        // Low-confidence case: API returns partial `terms` and a warning message.
        console.warn('[AI] Cảnh báo độ tin cậy thấp nhưng trả về bản nháp:', data.error);
        setContractDraft(data.terms);
        setIsModalOpen(true);
        setExtractError(data.error || 'Kết quả có độ tin cậy thấp — kiểm tra thủ công.');
        if (sttChannelRef.current) {
          sttChannelRef.current.send({
            type: 'broadcast',
            event: 'contract_update',
            payload: { contract: data.terms }
          });
        }
      } else {
        if (response.status === 422) {
          console.warn('[AI] Cảnh báo dữ liệu:', data.error);
          setExtractError(data.error || 'Không đủ dữ liệu để tạo hợp đồng. Hãy thu thập thêm thông tin.');
        } else {
          console.warn('[AI] Lỗi:', data.error);
          setExtractError(data.error || 'Lỗi trích xuất AI — thử lại sau.');
        }
        setContractDraft(null);
        if (sttChannelRef.current) {
          sttChannelRef.current.send({
            type: 'broadcast',
            event: 'extract_failed',
            payload: { error: data.error }
          });
        }
      }
    } catch (error: any) {
      console.warn('[AI] Lỗi gọi API:', error);
      setExtractError('Không thể kết nối AI — thử lại sau.');
      setContractDraft(null);
      if (sttChannelRef.current) {
        sttChannelRef.current.send({
          type: 'broadcast',
          event: 'extract_failed',
          payload: { error: 'Không thể kết nối AI' }
        });
      }
    } finally {
      setLoadingExtract(false);
      setActiveStep(3);
    }
  }, []);

  // ==========================================
  // 1. GIẢ LẬP THOẠI (Mock STT)
  // ==========================================
  const startMockSTT = useCallback(() => {
    if (isRealSTTActiveRef.current || isMockActiveRef.current) return;
    if (!sttClientRef.current) return;

    setTranscriptLines([]);
    setContractDraft(null);
    setExtractError('');
    setSttError(null);
    setDisplayedSubtitle(null);
    setActiveStep(1);

    const userRole = user?.vai_tro === 'nong_dan' ? 'nong_dan' : 'thuong_lai';

    sttClientRef.current.startSTT(
      (text, userId, isFinal) => {
        if (!text.trim()) return;

        // Cập nhật phụ đề tức thời (realtime)
        setDisplayedSubtitle({ text, role: userId });

        if (isFinal) {
          // Ẩn phụ đề sau 3 giây nếu không có câu mới
          const timer = setTimeout(() => {
            setDisplayedSubtitle(prev => {
              if (prev?.text === text) return null;
              return prev;
            });
          }, 3000);

          const priceMatch = text.match(/(\d+)\s*(triệu|tr)/i);
          if (priceMatch) {
            setProposedPrice(parseInt(priceMatch[1]) * 1000000);
          }

          const detected = detectProductInText(text);
          if (detected) {
            console.log('🔄 Đã phát hiện sản phẩm từ giả lập thoại:', detected);
            setProductName(detected);
          }

          const newLine: TranscriptLine = {
            id: Math.random().toString(36).substring(7),
            vi_nguoi_noi: userId,
            noi_dung: formatVietnamesePunctuation(text),
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
                setDisplayedSubtitle(null);
                triggerAIExtract(next);
              }, 1000);
            }
            return next;
          });
        }
      },
      userRole,
      true // useMock = true
    );

    setIsRealSTTActive(false);
    setIsMockActive(true);
  }, [user, triggerAIExtract]);

  // ==========================================
  // Agora Cloud STT Bot (API v7.x)
  // ==========================================
  const startAgoraCloudSTT = useCallback(async () => {
    if (channelName === 'dam-phan-lua-st25' || channelName === 'dummy_id') {
      // Bỏ qua gọi API trong chế độ demo cục bộ
      return false;
    }
    try {
      console.log(`[Agora Cloud STT] Khởi động STT Bot cho kênh: ${channelName}`);
      const res = await fetch('/api/agora/stt/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelName })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        console.warn(`[Agora Cloud STT] Khởi động thất bại:`, errData.error);
        return false;
      }

      const data = await res.json();
      if (data.success && data.agentId) {
        agoraAgentIdRef.current = data.agentId;
        setIsAgoraCloudSTTActive(true);
        console.log(`[Agora Cloud STT] Bot đã tham gia với Agent ID: ${data.agentId}`);
        
        // Đồng bộ Agent ID lên DB để đối tác biết và không cần khởi chạy lại
        if (user) {
          try {
            const { data: con } = await supabase.from('hop_dong').select('noi_dung_nhap_ai').eq('id', channelName).single();
            const currentAiContent = con?.noi_dung_nhap_ai || {};
            await supabase.from('hop_dong').update({
              noi_dung_nhap_ai: {
                ...currentAiContent,
                agora_stt_agent_id: data.agentId
              }
            }).eq('id', channelName);
            console.log(`[Agora Cloud STT] Đã lưu Agent ID lên DB.`);
            
            // Phát tin qua Supabase realtime channel để đối tác cập nhật ngay lập tức
            if (sttChannelRef.current) {
              sttChannelRef.current.send({
                type: 'broadcast',
                event: 'stt_agent_active',
                payload: { agentId: data.agentId }
              });
            }
          } catch (dbErr) {
            console.warn('[Agora Cloud STT] Lỗi cập nhật Agent ID lên DB:', dbErr);
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[Agora Cloud STT] Lỗi kết nối API start:`, err);
      return false;
    }
  }, [channelName, user]);

  const stopAgoraCloudSTT = useCallback(async () => {
    const agentId = agoraAgentIdRef.current;
    if (!agentId) return;

    try {
      console.log(`[Agora Cloud STT] Đang tắt STT Bot với Agent ID: ${agentId}`);
      const res = await fetch('/api/agora/stt/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });

      if (res.ok) {
        console.log(`[Agora Cloud STT] Bot đã rời phòng thành công.`);
      } else {
        console.warn(`[Agora Cloud STT] Tắt Bot thất bại.`);
      }
    } catch (err) {
      console.warn(`[Agora Cloud STT] Lỗi kết nối API stop:`, err);
    } finally {
      agoraAgentIdRef.current = null;
      setIsAgoraCloudSTTActive(false);

      // Dọn dẹp trên DB và phát broadcast báo tắt
      if (channelName && channelName !== 'dam-phan-lua-st25' && channelName !== 'dummy_id') {
        try {
          const { data: con } = await supabase.from('hop_dong').select('noi_dung_nhap_ai').eq('id', channelName).single();
          const currentAiContent = con?.noi_dung_nhap_ai || {};
          const updatedAiContent = { ...currentAiContent };
          delete updatedAiContent.agora_stt_agent_id;

          await supabase.from('hop_dong').update({
            noi_dung_nhap_ai: updatedAiContent
          }).eq('id', channelName);

          if (sttChannelRef.current) {
            sttChannelRef.current.send({
              type: 'broadcast',
              event: 'stt_agent_inactive',
              payload: {}
            });
          }
        } catch (dbErr) {
          console.warn('[Agora Cloud STT] Lỗi dọn dẹp Agent ID trên DB:', dbErr);
        }
      }
    }
  }, [channelName]);

  const handleAgoraSTTMessage = useCallback((text: string, isFinal: boolean, speakerRole: 'nong_dan' | 'thuong_lai') => {
    if (!text.trim()) return;

    // Cập nhật phụ đề tức thời (realtime)
    setDisplayedSubtitle({ text, role: speakerRole });

    if (isFinal) {
      // Ẩn phụ đề sau 3 giây nếu không có câu mới
      setTimeout(() => {
        setDisplayedSubtitle(prev => {
          if (prev?.text === text && prev?.role === speakerRole) return null;
          return prev;
        });
      }, 3000);

      const priceMatch = text.match(/(\d+)\s*(triệu|tr)/i);
      if (priceMatch) {
        setProposedPrice(parseInt(priceMatch[1]) * 1000000);
      }

      const detected = detectProductInText(text);
      if (detected) {
        console.log('🔄 Đã phát hiện sản phẩm từ Agora STT:', detected);
        setProductName(detected);
      }

      const newLine: TranscriptLine = {
        id: Math.random().toString(36).substring(7),
        vi_nguoi_noi: speakerRole,
        noi_dung: formatVietnamesePunctuation(text),
        thoi_gian_noi: new Date().toISOString(),
        den_canh_bao: 'binh_thuong',
      };

      setTranscriptLines(prev => [...prev, newLine]);

      // 💾 GHI LƯU STT LÊN DATABASE (chỉ người nói lưu của chính mình để tránh lưu trùng)
      const userRole = user?.vai_tro === 'nong_dan' ? 'nong_dan' : 'thuong_lai';
      if (speakerRole === userRole && channelName && channelName !== 'dam-phan-lua-st25' && user) {
        import('../../lib/supabase/queries/transcripts').then(m => {
          m.addTranscriptLine({
            id_hop_dong: channelName,
            vi_nguoi_noi: user.dia_chi_vi,
            noi_dung: formatVietnamesePunctuation(text),
            den_canh_bao: 'binh_thuong'
          }).catch(e => console.warn('Lỗi lưu STT:', e));
        });
      }
    }
  }, [channelName, user]);

  // ==========================================
  // 2. STT THẬT (Web Speech API tiếng Việt qua STT Client)
  // ==========================================
  const startRealSTT = useCallback(async (preserveHistory: boolean = false) => {
    if (isRealSTTActiveRef.current || isMockActiveRef.current || isAgoraCloudSTTActive) return;

    if (!preserveHistory) {
      setTranscriptLines([]);
      setContractDraft(null);
    }
    setExtractError('');
    setSttError(null);
    setDisplayedSubtitle(null);
    setActiveStep(1);

    // 1. Thử khởi chạy Agora Cloud STT Bot trước
    let cloudSTTStarted = false;
    if (agoraAgentIdRef.current) {
      cloudSTTStarted = true;
      setIsAgoraCloudSTTActive(true);
    } else {
      cloudSTTStarted = await startAgoraCloudSTT();
    }

    if (cloudSTTStarted) {
      console.log('[STT] Đã kích hoạt Agora Cloud STT Bot thành công. Không dùng Web Speech API.');
      setIsRealSTTActive(true);
      return;
    }

    // 2. Fallback sang Web Speech API (Local Browser) nếu Cloud STT không bật được
    if (!sttClientRef.current) return;
    console.log('[STT] Agora Cloud STT Bot không sẵn sàng. Fallback sang local Web Speech API...');

    const userRole = user?.vai_tro === 'nong_dan' ? 'nong_dan' : 'thuong_lai';

    sttClientRef.current.startSTT(
      (text, userId, isFinal) => {
        if (!text.trim()) return;

        // Cập nhật phụ đề tức thời (realtime)
        setDisplayedSubtitle({ text, role: userId });

        // Phát Broadcast Text cho đối tác (kèm địa chỉ ví để tránh lọc trùng sai vai trò)
        if (sttChannelRef.current) {
          sttChannelRef.current.send({
            type: 'broadcast',
            event: 'stt_text',
            payload: { text, userId, isFinal, senderWallet: user?.dia_chi_vi }
          });
        }

        if (isFinal) {
          // Ẩn phụ đề sau 3 giây nếu không có câu mới
          const timer = setTimeout(() => {
            setDisplayedSubtitle(prev => {
              if (prev?.text === text) return null;
              return prev;
            });
          }, 3000);

          const priceMatch = text.match(/(\d+)\s*(triệu|tr)/i);
          if (priceMatch) {
            setProposedPrice(parseInt(priceMatch[1]) * 1000000);
          }

          const detected = detectProductInText(text);
          if (detected) {
            console.log('🔄 Đã phát hiện sản phẩm từ giọng nói của bạn:', detected);
            setProductName(detected);
            if (sttChannelRef.current) {
              sttChannelRef.current.send({
                type: 'broadcast',
                event: 'product_update',
                payload: { productName: detected }
              });
            }
          }

          const newLine: TranscriptLine = {
            id: Math.random().toString(36).substring(7),
            vi_nguoi_noi: userId,
            noi_dung: formatVietnamesePunctuation(text),
            thoi_gian_noi: new Date().toISOString(),
            den_canh_bao: 'binh_thuong',
          };

          setTranscriptLines(prev => [...prev, newLine]);

          // 💾 GHI LƯU STT LÊN DATABASE (chỉ lưu tiếng nói của bản thân)
          if (userId === userRole && channelName && channelName !== 'dam-phan-lua-st25' && user) {
            import('../../lib/supabase/queries/transcripts').then(m => {
              m.addTranscriptLine({
                id_hop_dong: channelName,
                vi_nguoi_noi: user.dia_chi_vi,
                noi_dung: formatVietnamesePunctuation(text),
                den_canh_bao: 'binh_thuong'
              }).catch(e => console.warn('Lỗi lưu STT:', e));
            });
          }
        }
      },
      userRole,
      false, // useMock = false
      (errorType, message) => {
        console.warn(`[STT Error] Type: ${errorType}, Msg: ${message}`);
        setSttError(message);
        setIsRealSTTActive(false);
        // Tự động tắt cảnh báo sau 3 giây để tránh hiện quá lâu
        setTimeout(() => {
          setSttError(null);
        }, 3000);
      }
    );

    setIsRealSTTActive(true);
    setIsMockActive(false);
  }, [user, isAgoraCloudSTTActive, startAgoraCloudSTT]);

  useEffect(() => {
    startRealSTTRef.current = startRealSTT;
  }, [startRealSTT]);



  const stopRealSTT = useCallback(() => {
    if (isAgoraCloudSTTActive) {
      stopAgoraCloudSTT();
    }
    if (sttClientRef.current) {
      sttClientRef.current.stopSTT();
    }
    setIsRealSTTActive(false);
    setIsMockActive(false);
    setDisplayedSubtitle(null);
    setSttError(null);

    const allLines = transcriptLinesRef.current;
    if (allLines.length > 0 && activeStep === 1) {
      triggerAIExtract(allLines);
    }
  }, [activeStep, triggerAIExtract, isAgoraCloudSTTActive, stopAgoraCloudSTT]);

  const handleSendChat = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const userRole = user?.vai_tro === 'nong_dan' ? 'nong_dan' : 'thuong_lai';
    const text = chatInput.trim();

    // Broadcast text to partner (kèm địa chỉ ví để tránh lọc trùng sai vai trò)
    if (sttChannelRef.current) {
      sttChannelRef.current.send({
        type: 'broadcast',
        event: 'stt_text',
        payload: { text, userId: userRole, isFinal: true, senderWallet: user?.dia_chi_vi }
      });
    }

    const priceMatch = text.match(/(\d+)\s*(triệu|tr)/i);
    if (priceMatch) {
      setProposedPrice(parseInt(priceMatch[1]) * 1000000);
    }

    const detected = detectProductInText(text);
    if (detected) {
      console.log('🔄 Đã phát hiện sản phẩm từ tin nhắn chat của bạn:', detected);
      setProductName(detected);
      if (sttChannelRef.current) {
        sttChannelRef.current.send({
          type: 'broadcast',
          event: 'product_update',
          payload: { productName: detected }
        });
      }
    }

    const newLine: TranscriptLine = {
      id: Math.random().toString(36).substring(7),
      vi_nguoi_noi: userRole,
      noi_dung: text,
      thoi_gian_noi: new Date().toISOString(),
      den_canh_bao: 'binh_thuong',
    };

    setTranscriptLines(prev => [...prev, newLine]);
    setChatInput('');

    // 💾 GHI LƯU CHAT TAY LÊN DATABASE
    if (channelName && channelName !== 'dam-phan-lua-st25' && user) {
      import('../../lib/supabase/queries/transcripts').then(m => {
        m.addTranscriptLine({
          id_hop_dong: channelName,
          vi_nguoi_noi: user.dia_chi_vi,
          noi_dung: text,
          den_canh_bao: 'binh_thuong'
        }).catch(e => console.warn('Lỗi lưu Chat tay:', e));
      });
    }
  };

  const forceExtract = useCallback(() => {
    if (transcriptLinesRef.current.length === 0) {
      alert("Chưa có đoạn hội thoại nào để chốt hợp đồng! Bạn cần nói gì đó trước.");
      return;
    }
    console.log("🎙️ Kích hoạt AI chốt hợp đồng thủ công.");
    setDisplayedSubtitle({ text: "🎙️ Đang tự động chốt hợp đồng...", role: 'system' });
    if (sttChannelRef.current && user) {
      sttChannelRef.current.send({
        type: 'broadcast',
        event: 'wait_extract',
        payload: { sender: user.dia_chi_vi }
      });
    }
    stopRealSTT();
  }, [stopRealSTT]);

  // ==========================================
  // VOICE COMMAND DETECTION (Bắt lệnh giọng nói)
  // ==========================================
  useEffect(() => {
    if (!isRealSTTActive || activeStep !== 1) return;
    const allLines = transcriptLines;
    if (allLines.length === 0) return;

    const lastLine = allLines[allLines.length - 1];
    const textLower = lastLine.noi_dung.toLowerCase();

    // Các từ khóa ra lệnh cho AI
    const triggerWords = [
      "chốt hợp đồng",
      "tạo hợp đồng",
      "sinh hợp đồng",
      "lên hợp đồng",
      "ai ơi chốt",
      "chốt luôn"
    ];

    if (triggerWords.some(word => textLower.includes(word))) {
      console.log("🎙️ Phát hiện lệnh giọng nói (Voice Command). Tự động kích hoạt AI!");
      // Hiển thị thông báo phụ đề đặc biệt
      setDisplayedSubtitle({ text: "🎙️ (Nhận lệnh) Đang tự động chốt hợp đồng...", role: lastLine.vi_nguoi_noi });

      // GỬI LỆNH ĐỒNG BỘ CHO ĐỐI TÁC ĐỨNG CHỜ
      if (sttChannelRef.current && user) {
        sttChannelRef.current.send({
          type: 'broadcast',
          event: 'wait_extract',
          payload: { sender: user.dia_chi_vi }
        });
      }

      // Delay 1.5s để ng dùng đọc chữ, sau đó tắt STT và gọi AI
      setTimeout(() => {
        stopRealSTT();
      }, 1500);
    }
  }, [transcriptLines, isRealSTTActive, activeStep, stopRealSTT]);

  // ==========================================
  // XỬ LÝ CHỈNH SỬA HỢP ĐỒNG (Sync Realtime + Database)
  // ==========================================
  const handleContractDraftChange = useCallback((updatedTerms: any) => {
    setContractDraft(updatedTerms);

    // 📡 Phát sự kiện Realtime qua kênh Supabase cho đối tác
    if (sttChannelRef.current) {
      sttChannelRef.current.send({
        type: 'broadcast',
        event: 'contract_update',
        payload: { contract: updatedTerms }
      });
      // Phát luôn sự kiện typing
      sttChannelRef.current.send({
        type: 'broadcast',
        event: 'contract_typing'
      });
    }

    // 💾 Lưu dự thảo lên Database (thường nên dùng debounce, nhưng ở đây có thể lưu trực tiếp)
    if (channelName && channelName !== 'dam-phan-lua-st25') {
      import('../../lib/supabase/queries/contracts').then(m => {
        m.updateContractDraftData(channelName, {
          san_pham: updatedTerms.san_pham,
          so_luong: updatedTerms.so_luong,
          don_vi_tinh: updatedTerms.don_vi_tinh,
          don_gia: updatedTerms.don_gia,
          han_giao_hang: updatedTerms.han_giao_hang,
          dieu_khoan_chat_luong: updatedTerms.dieu_khoan_chat_luong,
          noi_dung_nhap_ai: {
            ...updatedTerms.noi_dung_nhap_ai,
            confidence: updatedTerms.confidence,
            evidence: updatedTerms.evidence,
            is_seller_online: user?.vai_tro === 'nong_dan' ? true : (updatedTerms.noi_dung_nhap_ai?.is_seller_online || false),
            is_buyer_online: user?.vai_tro === 'thuong_lai' ? true : (updatedTerms.noi_dung_nhap_ai?.is_buyer_online || false)
          }
        }).catch(e => console.warn('Lỗi lưu hợp đồng lên DB:', e));
      });
    }
  }, [channelName]);

  const handleToggleMute = useCallback((isMuted: boolean) => {
    if (isMockActiveRef.current) return; // Không ảnh hưởng tới Demo Mock
    if (isAgoraCloudSTTActive) {
      // Khi dùng Cloud STT, chỉ cần thay đổi trạng thái mic của mình trong Agora RTC (được VideoCallFrame tự động xử lý).
      // Không cần tắt/bật Bot STT ở đây.
      return;
    }
    if (isMuted) {
      if (sttClientRef.current) sttClientRef.current.stopSTT();
      setIsRealSTTActive(false);
    } else {
      startRealSTT();
    }
  }, [startRealSTT, isAgoraCloudSTTActive]);

  const handleJoinedStateChange = useCallback((joined: boolean, isDemo: boolean) => {
    setInCall(joined);
    setIsDemoCall(isDemo);
    if (joined) {
      // Cập nhật trạng thái cuộc gọi bắt đầu lên DB (cho cả cuộc gọi thật và demo)
      setCallActiveInDb(true);
      if (isDemo) {
        startMockSTT();
      } else {
        // Trì hoãn 2 giây để Agora RTC chiếm mic và kết nối trước, tránh race condition phần cứng
        setTimeout(() => {
          startRealSTT();
        }, 2000);
      }
    } else {
      stopAgoraCloudSTT();
      if (sttClientRef.current) {
        sttClientRef.current.stopSTT();
      }
      setIsRealSTTActive(false);
      setIsMockActive(false);
      setDisplayedSubtitle(null);
      setSttError(null);
      // Cập nhật trạng thái cuộc gọi kết thúc lên DB
      setCallActiveInDb(false);
    }
  }, [startMockSTT, startRealSTT, setCallActiveInDb, stopAgoraCloudSTT]);

  const handleHangUp = useCallback(async () => {
    await stopAgoraCloudSTT();
    if (sttClientRef.current) {
      sttClientRef.current.stopSTT();
    }
    setIsRealSTTActive(false);
    setIsMockActive(false);
    setDisplayedSubtitle(null);
    setSttError(null);

    // Đặt trạng thái cuộc gọi kết thúc lên DB
    await setCallActiveInDb(false);

    // Dọn dẹp hợp đồng rác nếu chưa có trao đổi gì
    const allLines = transcriptLinesRef.current;
    if (allLines.length === 0 && channelName && channelName !== 'dam-phan-lua-st25' && channelName !== 'dummy_id') {
      try {
        const { deleteContract } = await import('../../lib/supabase/queries/contracts');
        await deleteContract(channelName);
      } catch (e) {
        console.warn("Lỗi khi xóa hợp đồng rác (có thể bỏ qua):", e);
      }
    }
    router.push('/');
  }, [router, channelName, setCallActiveInDb, stopAgoraCloudSTT]);

  // ==========================================
  // LƯU HỢP ĐỒNG VÀ CHUYỂN TRANG
  // ==========================================
  const handleLockSuccess = async (txSig: string) => {
    if (channelName && channelName !== 'dam-phan-lua-st25' && channelName !== 'dummy_id') {
      try {
        const { addTranscriptLine } = await import('../../lib/supabase/queries/transcripts');
        const farmerWallet = user?.vai_tro === 'nong_dan' ? user?.dia_chi_vi : (contractDraft?.vi_nguoi_ban || 'nong_dan_wallet_address_demo');
        const merchantWallet = user?.vai_tro === 'thuong_lai' ? user?.dia_chi_vi : (contractDraft?.vi_nguoi_mua || 'thuong_lai_wallet_address_demo');

        for (const line of transcriptLines) {
          const senderWallet = line.vi_nguoi_noi === 'nong_dan' ? farmerWallet :
            line.vi_nguoi_noi === 'thuong_lai' ? merchantWallet :
              line.vi_nguoi_noi;
          await addTranscriptLine({
            id_hop_dong: channelName,
            vi_nguoi_noi: senderWallet,
            noi_dung: line.noi_dung,
            den_canh_bao: line.den_canh_bao || 'binh_thuong'
          });
        }
      } catch (err) {
        console.error('Lỗi khi lưu lịch sử đàm thoại:', err);
      }
    }

    if (sttChannelRef.current) {
      sttChannelRef.current.send({
        type: 'broadcast',
        event: 'contract_locked',
        payload: { txSig }
      });
    }

    setIsContractFinalized(true);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-900 text-white gap-2">
        <Loader2 size={18} className="animate-spin text-indigo-400" />
        <span className="text-sm font-semibold">Đang chuẩn bị phòng đàm phán...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-neutral-950 text-white p-4 font-sans gap-3">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
        <p className="text-sm font-semibold text-neutral-300">Đang chuẩn bị phòng đàm phán...</p>
        <p className="text-xs text-neutral-500">Vui lòng đăng nhập tài khoản thành viên để tham gia cuộc họp.</p>
      </div>
    );
  }
  const isNongDan = user.vai_tro === 'nong_dan';
  const currentUserName = user?.ten_hien_thi || 'Tôi';
  const nongDanName = isNongDan ? currentUserName : partnerParam;
  const thuongLaiName = isNongDan ? partnerParam : currentUserName;
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
          <button
            onClick={handleShareLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${copiedLink
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-white/5'
              }`}
          >
            <Share2 size={14} />
            {copiedLink ? 'Đã sao chép!' : 'Chia sẻ link'}
          </button>
          <div className="hidden md:flex items-center gap-1.5 pl-4 border-l border-white/10">
            <span className="text-xs text-neutral-400 font-medium">
              Đối tác: <strong className="text-white">{partnerName}</strong>
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
        <div className="flex-grow relative w-full h-full flex flex-col">
          <VideoCallFrame
            channelName={channelName}
            role={isNongDan ? "nong_dan" : "thuong_lai"}
            onJoinedStateChange={handleJoinedStateChange}
            onHangUp={handleHangUp}
            onToggleChat={() => setIsChatOpen(!isChatOpen)}
            onToggleMute={handleToggleMute}
            isChatOpen={isChatOpen}
            onRemoteUsersChange={(users) => setPartnerCount(users.length)}
            onSTTMessage={handleAgoraSTTMessage}
            extraToolbarButtons={
              inCall ? (
                <div className="flex items-center gap-3">
                  {/* Nút Chạy Giả Lập STT để Tester/Judge dễ dàng thử nghiệm tính năng */}
                  {activeStep === 1 && !isRealSTTActive && !isMockActive && (
                    <button
                      onClick={startMockSTT}
                      className="w-12 h-12 flex items-center justify-center rounded-full bg-amber-600 hover:bg-amber-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 border border-amber-500/30"
                      title="Chạy Giả Lập Hội Thoại (Test Flow)"
                    >
                      <Sparkles size={20} />
                    </button>
                  )}

                  {activeStep === 1 && (
                    contractDraft?.san_pham ? (
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                        title="Xem lại Hợp Đồng"
                      >
                        <FileSignature size={20} />
                      </button>
                    ) : (
                      <button
                        onClick={forceExtract}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 animate-pulse"
                        title="Chốt hợp đồng bằng AI"
                      >
                        <FileSignature size={20} />
                      </button>
                    )
                  )}
                </div>
              ) : null
            }
          />

          {/* FLOATING CHAT HISTORY PANEL */}
          {isChatOpen && (
            <div className="absolute top-4 right-4 bottom-28 w-80 md:w-96 bg-neutral-950/85 backdrop-blur-xl border border-white/10 rounded-2xl z-40 flex flex-col overflow-hidden shadow-2xl animate-scaleUp">
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-indigo-400" />
                  <span className="text-sm font-bold text-white">Nội dung đàm thoại</span>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/15 text-neutral-400 hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col min-h-0">
                {transcriptLines.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                    <MessageSquare size={24} className="opacity-30 mb-2" />
                    <p className="text-xs">Chưa có hội thoại nào được ghi nhận.</p>
                    <p className="text-[10px] mt-1 opacity-70">Các câu nói của bạn và đối tác sẽ xuất hiện tại đây.</p>
                  </div>
                ) : (
                  transcriptLines.map((line) => {
                    const isLineNongDan = line.vi_nguoi_noi === 'nong_dan';
                    return (
                      <div
                        key={line.id}
                        className={`flex flex-col max-w-[85%] ${isLineNongDan ? 'self-start items-start' : 'self-end items-end'
                          }`}
                      >
                        <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${isLineNongDan ? 'text-emerald-400' : 'text-indigo-400'
                          }`}>
                          {isLineNongDan ? nongDanName : thuongLaiName}
                        </span>
                        <div
                          className={`px-3 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed ${isLineNongDan
                            ? 'bg-emerald-950/60 border border-emerald-500/20 text-emerald-100 rounded-tl-none'
                            : 'bg-indigo-950/60 border border-indigo-500/20 text-indigo-100 rounded-tr-none'
                            }`}
                        >
                          {line.noi_dung}
                        </div>
                        <span className="text-[9px] text-neutral-500 mt-1">
                          {new Date(line.thoi_gian_noi).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-white/10 bg-neutral-900/50">
                <form onSubmit={handleSendChat} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Gõ nội dung đàm phán nếu không dùng mic..."
                    className="flex-1 bg-neutral-800/80 border border-white/10 text-white text-xs rounded-full px-4 py-2.5 focus:outline-none focus:border-indigo-500/50 placeholder:text-neutral-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* OVERLAY: BADGES & CẢNH BÁO GIÁ */}
          {inCall && (
            <div className="absolute top-4 left-4 z-40 flex flex-col items-start gap-3 pointer-events-none">

              {/* Badge STT thật */}
              {isRealSTTActive && (
                <div className="pointer-events-auto px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 flex items-center gap-1.5 shadow-lg shadow-emerald-950/20 animate-fadeIn">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Mic size={11} className="text-emerald-300 animate-pulse" />
                  <span className="text-[9px] text-emerald-300 font-extrabold tracking-wider uppercase">STT</span>
                </div>
              )}
              {isMockActive && (
                <div className="pointer-events-auto px-2.5 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 flex items-center gap-1.5 shadow-lg shadow-indigo-950/20 animate-fadeIn">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  <Sparkles size={11} className="text-indigo-300 animate-pulse" />
                  <span className="text-[9px] text-indigo-300 font-extrabold tracking-wider uppercase">Demo</span>
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
          )}



          {/* FLOATING CLOSED CAPTIONS (phụ đề) */}
          {(isRealSTTActive || isMockActive || sttError) && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-45 text-center pointer-events-none animate-fadeIn flex flex-col items-center">
              <div className={`bg-black/75 backdrop-blur-md px-5 py-3 rounded-2xl border shadow-2xl text-white inline-block max-w-full transition-all ${sttError
                ? 'border-red-500/30 bg-red-950/20 scale-100'
                : !displayedSubtitle
                  ? 'border-white/10 opacity-60 scale-95'
                  : 'border-white/10 scale-100'
                }`}>
                {sttError ? (
                  <div className="flex items-center gap-2 text-red-400 py-0.5 px-1 text-xs font-black">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                    <span>{sttError}</span>
                  </div>
                ) : displayedSubtitle ? (
                  <>
                    <span className={`text-[9px] uppercase tracking-wider font-extrabold block mb-1 ${displayedSubtitle.role === 'nong_dan' ? 'text-emerald-400' : 'text-indigo-400'
                      }`}>
                      {displayedSubtitle.role === 'nong_dan' ? nongDanName : thuongLaiName}
                    </span>
                    <p className="text-sm font-semibold leading-relaxed">
                      &ldquo;{displayedSubtitle.text}&rdquo;
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-neutral-400 justify-center">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <p className="text-xs font-semibold">Nghe...</p>
                  </div>
                )}
              </div>


            </div>
          )}

          {/* AI EXTRACTION STATUS */}
          {activeStep === 2 && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md border border-indigo-500/30 px-6 py-3 rounded-2xl flex flex-col items-center gap-1.5 shadow-2xl text-center min-w-[300px]">
              <div className="flex items-center gap-3">
                <Loader2 size={15} className="animate-spin text-indigo-400" />
                <span className="text-xs font-bold text-slate-100">AgriTrust AI (MiniMax-M3) đang trích xuất...</span>
              </div>
              <span className="text-[10px] text-indigo-200/70 font-medium">
                Vui lòng chờ khoảng 5-10 giây để AI đọc hiểu toàn bộ ngữ cảnh
              </span>
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
                  Enter contract sample
                </button>
                <button
                  onClick={() => { setExtractError(''); triggerAIExtract(transcriptLinesRef.current); }}
                  className="text-xs font-semibold px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Retry AI
                </button>
              </div>
            </div>
          )}


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

            <h3 className="text-lg font-bold text-white mb-2">Manual contract sample</h3>
            <p className="text-sm text-neutral-400 mb-4">Paste contract JSON or edit the sample below, then click Apply to review/confirm.</p>

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
                Cancel
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

                    // Phát sự kiện cập nhật hợp đồng cho đối tác
                    if (sttChannelRef.current) {
                      sttChannelRef.current.send({
                        type: 'broadcast',
                        event: 'contract_update',
                        payload: { contract: parsed }
                      });
                    }
                  } catch (e: any) {
                    setManualError('JSON không hợp lệ: ' + (e?.message || 'Lỗi parse'));
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-bold"
              >
                Apply Sample
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

            {isContractFinalized ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 py-20 animate-scaleUp">
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-emerald-500/30">
                  <CheckCircle2 size={50} className="text-emerald-400" />
                </div>
                <h2 className="text-3xl font-black text-white mb-4">Contract Finalized Successfully!</h2>
                <p className="text-neutral-400 max-w-lg mx-auto mb-10 text-base leading-relaxed">
                  Hai bên đã đồng ý với các điều khoản và quỹ đã được khóa an toàn trên Smart Contract. Các bạn có thể chào tạm biệt và kết thúc đàm phán tại đây.
                </p>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    router.push(channelName && channelName !== 'dummy_id' ? `/contract/${channelName}` : '/');
                  }}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-emerald-900/50 flex items-center gap-2"
                >
                  End Call & Go to Contract Tracking
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto pr-2 mt-4 min-h-0">
              <DraftContractTable
                terms={contractDraft}
                onChange={handleContractDraftChange}
                buyerName={user?.vai_tro === 'thuong_lai' ? user?.ten_hien_thi : partnerName}
                sellerName={user?.vai_tro === 'nong_dan' ? user?.ten_hien_thi : partnerName}
                buyerSignature={buyerSignature}
                sellerSignature={sellerSignature}
                onSignBuyer={(name) => handleSignContract('thuong_lai', name)}
                onSignSeller={(name) => handleSignContract('nong_dan', name)}
                isSigningBuyer={isSigningBuyer}
                isSigningSeller={isSigningSeller}
                currentRole={user?.vai_tro as 'nong_dan' | 'thuong_lai'}
                partnerTyping={partnerTyping}
                partnerCount={partnerCount}
                isDemoCall={isDemoCall}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4 flex-shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close / Hide
              </button>
              
              {!isContractFinalized && (
                <button
                  onClick={() => {
                    setContractDraft(null);
                    setBuyerSignature(null);
                    setSellerSignature(null);
                    setActiveStep(1);
                    startRealSTT(true);
                    setIsModalOpen(false);
                  }}
                  className="px-5 py-2.5 bg-red-900/40 hover:bg-red-800/80 text-red-300 rounded-xl text-xs font-bold transition-colors mr-auto border border-red-800/30"
                >
                  Discard Draft & Negotiate Again
                </button>
              )}

              <div className="flex-1 max-w-[400px] flex items-center gap-2">
                {partnerCount === 0 && !isDemoCall ? (
                  <button disabled className="w-full px-5 py-2.5 bg-slate-700 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed">
                    Waiting for partner to join...
                  </button>
                ) : !buyerSignature || !sellerSignature ? (
                  <button disabled className="w-full px-5 py-2.5 bg-slate-700 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed">
                    Waiting for both signatures...
                  </button>
                ) : user?.vai_tro === 'thuong_lai' ? (
                  <ConfirmContractButton
                    contractId={channelName}
                    buyerAddress={buyerSignature.wallet}
                    sellerAddress={sellerSignature.wallet}
                    unitPriceVnd={contractDraft?.don_gia}
                    expectedQty={contractDraft?.so_luong}
                    deadlineIso={contractDraft?.han_giao_hang}
                    onSuccess={handleLockSuccess}
                    contractDraft={contractDraft}
                    buyerSignature={buyerSignature}
                    sellerSignature={sellerSignature}
                  />
                ) : (
                  <button disabled className="w-full px-5 py-2.5 bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 rounded-xl text-xs font-bold cursor-not-allowed text-center leading-tight">
                    Signed. Waiting for trader to lock funds...
                  </button>
                )}
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* Màn hình chờ AI trích xuất (Dành cho Slave) */}
      {isWaitingPartnerAI && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-neutral-900 border border-white/10 p-8 rounded-2xl flex flex-col items-center max-w-md text-center shadow-2xl">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Đang chờ đối tác...</h3>
            <p className="text-sm text-neutral-400">
              Đối tác đang sử dụng AI để tạo hợp đồng từ nội dung cuộc gọi. Vui lòng đợi trong giây lát, bảng hợp đồng sẽ tự động hiện ra ngay sau khi hoàn tất.
            </p>
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
