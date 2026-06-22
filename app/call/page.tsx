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
import { decodeMeetingParams } from '../../lib/utils/url';
import { supabase } from '../../lib/supabase/client';

import ConnectWalletButton from '../../components/shared/ConnectWalletButton';
import WalletBalance from '../../components/shared/WalletBalance';
import { useAuth } from '../../hooks/useAuth';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey, TransactionInstruction } from '@solana/web3.js';
import bs58 from 'bs58';
import { ContractSignature } from '../../components/negotiation/DraftContractTable';
import { LogOut, Loader2, FileSignature, Mic, MicOff, Sparkles, X, AlertTriangle, Check, UserCheck, ArrowLeft, MessageSquare } from 'lucide-react';

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

  // Decode compressed parameters from the 'p' query param if present
  const p = searchParams.get('p');
  const decoded = p ? decodeMeetingParams(p) : null;

  const scenario = decoded?.scenario || searchParams.get('scenario') || 'A';
  const channelParam = decoded?.channel || searchParams.get('channel');
  const channelName = channelParam || 'dam-phan-lua-st25';
  
  const { user, loading, logout } = useAuth();

  const productParam = decoded?.product || searchParams.get('product') || 'Lúa thơm ST25';
  const partnerParam = decoded?.partner || searchParams.get('partner') || 'Đối tác';

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
  const [inCall, setInCall] = useState(false);

  // Chữ ký điện tử
  const { publicKey, signMessage, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [buyerSignature, setBuyerSignature] = useState<ContractSignature | null>(null);
  const [sellerSignature, setSellerSignature] = useState<ContractSignature | null>(null);
  const [isSigningBuyer, setIsSigningBuyer] = useState(false);
  const [isSigningSeller, setIsSigningSeller] = useState(false);

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

      // Tạo Giao dịch Memo chứa SHA256 Hash
      const memoInstruction = new TransactionInstruction({
        keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
        data: Buffer.from(`AGRITRUST_CONTRACT_HASH:${verifyData.hash}`, 'utf-8'),
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
      });

      const transaction = new Transaction().add(memoInstruction);
      
      // Bắt buộc set blockhash và feePayer cho mạng Devnet
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const txHash = await sendTransaction(transaction, connection);

      const newSignature: ContractSignature = {
        name: typedName,
        wallet: publicKey.toBase58(),
        timestamp: new Date().toISOString(),
        txHash
      };

      if (signerRole === 'nong_dan') {
        setSellerSignature(newSignature);
      } else {
        setBuyerSignature(newSignature);
      }

    } catch (error: any) {
      console.error('Sign error:', error);
      if (error.message?.includes('User rejected the request')) {
        alert('Bạn đã từ chối ký giao dịch. (Lưu ý: Nếu ví báo lỗi đỏ "Simulation failed" hoặc không cho ký, hãy chắc chắn bạn đang dùng mạng Devnet và có đủ Devnet SOL trong ví Phantom. Bạn có thể lên faucet.solana.com để xin SOL ảo).');
      } else {
        alert('Lỗi ký số: ' + error.message);
      }
    } finally {
      setIsSigningSeller(false);
      setIsSigningBuyer(false);
    }
  };

  const simulatePartnerSignature = () => {
    const fakeSig: ContractSignature = {
      name: user?.vai_tro === 'nong_dan' ? partnerName : 'Nông Dân Đối Tác',
      wallet: 'SimulateWallet1234567890',
      timestamp: new Date().toISOString(),
      txHash: 'SimulateTxHash' + Math.random().toString(36).substring(7)
    };
    if (user?.vai_tro === 'nong_dan') setBuyerSignature(fakeSig);
    else setSellerSignature(fakeSig);
  };

  // Ref để lưu AgoraSTTClient và các câu thoại
  const sttClientRef = useRef<AgoraSTTClient | null>(null);
  const sttChannelRef = useRef<any>(null);
  const transcriptLinesRef = useRef<TranscriptLine[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      const { text, userId, isFinal } = payload;
      // Tránh tự xử lý lại tin của chính mình do client đã hiển thị
      if (userId === (user.vai_tro === 'nong_dan' ? 'nong_dan' : 'thuong_lai')) return;

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

        const newLine: TranscriptLine = {
          id: Math.random().toString(36).substring(7),
          vi_nguoi_noi: userId,
          noi_dung: text,
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
    }).subscribe();

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
        setIsModalOpen(true);
      } else if (response.status === 422 && data.terms) {
        // Low-confidence case: API returns partial `terms` and a warning message.
        console.warn('[AI] Cảnh báo độ tin cậy thấp nhưng trả về bản nháp:', data.error);
        setContractDraft(data.terms);
        setIsModalOpen(true);
        setExtractError(data.error || 'Kết quả có độ tin cậy thấp — kiểm tra thủ công.');
      } else {
        if (response.status === 422) {
          console.warn('[AI] Cảnh báo dữ liệu:', data.error);
          setExtractError(data.error || 'Không đủ dữ liệu để tạo hợp đồng. Hãy thu thập thêm thông tin.');
        } else {
          console.warn('[AI] Lỗi:', data.error);
          setExtractError(data.error || 'Lỗi trích xuất AI — thử lại sau.');
        }
        setContractDraft(null);
      }
    } catch (error: any) {
      console.warn('[AI] Lỗi gọi API:', error);
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
    if (isRealSTTActiveRef.current || isMockActiveRef.current) return;
    if (!sttClientRef.current) return;

    setTranscriptLines([]);
    setContractDraft(null);
    setExtractError('');
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
  // 2. STT THẬT (Web Speech API tiếng Việt qua STT Client)
  // ==========================================
  const startRealSTT = useCallback(() => {
    if (isRealSTTActiveRef.current || isMockActiveRef.current) return;
    if (!sttClientRef.current) return;

    setTranscriptLines([]);
    setContractDraft(null);
    setExtractError('');
    setDisplayedSubtitle(null);
    setActiveStep(1);

    const userRole = user?.vai_tro === 'nong_dan' ? 'nong_dan' : 'thuong_lai';

    sttClientRef.current.startSTT(
      (text, userId, isFinal) => {
        if (!text.trim()) return;

        // Cập nhật phụ đề tức thời (realtime)
        setDisplayedSubtitle({ text, role: userId });

        // Phát Broadcast Text cho đối tác
        if (sttChannelRef.current) {
          sttChannelRef.current.send({
            type: 'broadcast',
            event: 'stt_text',
            payload: { text, userId, isFinal }
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

          const newLine: TranscriptLine = {
            id: Math.random().toString(36).substring(7),
            vi_nguoi_noi: userId,
            noi_dung: text,
            thoi_gian_noi: new Date().toISOString(),
            den_canh_bao: 'binh_thuong',
          };

          setTranscriptLines(prev => [...prev, newLine]);
        }
      },
      userRole,
      false // useMock = false
    );

    setIsRealSTTActive(true);
    setIsMockActive(false);
  }, [user]);

  const stopRealSTT = useCallback(() => {
    if (sttClientRef.current) {
      sttClientRef.current.stopSTT();
    }
    setIsRealSTTActive(false);
    setIsMockActive(false);
    setDisplayedSubtitle(null);

    const allLines = transcriptLinesRef.current;
    if (allLines.length > 0 && activeStep === 1) {
      triggerAIExtract(allLines);
    }
  }, [activeStep, triggerAIExtract]);

  const handleJoinedStateChange = useCallback((joined: boolean, isDemo: boolean) => {
    setInCall(joined);
    if (joined) {
      if (isDemo) {
        startMockSTT();
      } else {
        startRealSTT();
      }
    } else {
      if (sttClientRef.current) {
        sttClientRef.current.stopSTT();
      }
      setIsRealSTTActive(false);
      setIsMockActive(false);
      setDisplayedSubtitle(null);
    }
  }, [startMockSTT, startRealSTT]);

  const handleHangUp = useCallback(async () => {
    if (sttClientRef.current) {
      sttClientRef.current.stopSTT();
    }
    setIsRealSTTActive(false);
    setIsMockActive(false);
    setDisplayedSubtitle(null);

    const allLines = transcriptLinesRef.current;
    if (allLines.length > 0) {
      triggerAIExtract(allLines);
    } else {
      // Dọn dẹp hợp đồng rác nếu chưa có trao đổi gì
      if (channelName && channelName !== 'dam-phan-lua-st25' && channelName !== 'dummy_id') {
        try {
          const { deleteContract } = await import('../../lib/supabase/queries/contracts');
          await deleteContract(channelName);
        } catch (e) {
          console.error("Lỗi khi xóa hợp đồng rác:", e);
        }
      }
      router.push('/');
    }
  }, [router, triggerAIExtract, channelName]);

  // ==========================================
  // LƯU HỢP ĐỒNG VÀ CHUYỂN TRANG
  // ==========================================
  const handleLockSuccess = (txSig: string) => {
    alert('Khóa quỹ thành công trên Solana! TX: ' + txSig + '\n\nChuyển hướng về Dashboard để xem hợp đồng...');
    setIsModalOpen(false);
    router.push('/dashboard');
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
        <div className="flex-grow relative w-full h-full flex flex-col">
          <VideoCallFrame
            channelName={channelName}
            role={isNongDan ? "nong_dan" : "thuong_lai"}
            onJoinedStateChange={handleJoinedStateChange}
            onHangUp={handleHangUp}
            onToggleChat={() => setIsChatOpen(!isChatOpen)}
            isChatOpen={isChatOpen}
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
                        className={`flex flex-col max-w-[85%] ${
                          isLineNongDan ? 'self-start items-start' : 'self-end items-end'
                        }`}
                      >
                        <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${
                          isLineNongDan ? 'text-emerald-400' : 'text-indigo-400'
                        }`}>
                          {isLineNongDan ? nongDanName : thuongLaiName}
                        </span>
                        <div
                          className={`px-3 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                            isLineNongDan
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
          {displayedSubtitle && (isRealSTTActive || isMockActive) && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-45 text-center pointer-events-none animate-fadeIn">
              <div className="bg-black/75 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-2xl text-white inline-block max-w-full">
                <span className={`text-[9px] uppercase tracking-wider font-extrabold block mb-1 ${
                  displayedSubtitle.role === 'nong_dan' ? 'text-emerald-400' : 'text-indigo-400'
                }`}>
                  {displayedSubtitle.role === 'nong_dan' ? nongDanName : thuongLaiName}
                </span>
                <p className="text-sm font-semibold leading-relaxed">
                  &ldquo;{displayedSubtitle.text}&rdquo;
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
                buyerName={user?.vai_tro === 'thuong_lai' ? user?.ten_hien_thi : partnerName}
                sellerName={user?.vai_tro === 'nong_dan' ? user?.ten_hien_thi : partnerName}
                buyerSignature={buyerSignature}
                sellerSignature={sellerSignature}
                onSignBuyer={(name) => handleSignContract('thuong_lai', name)}
                onSignSeller={(name) => handleSignContract('nong_dan', name)}
                isSigningBuyer={isSigningBuyer}
                isSigningSeller={isSigningSeller}
                currentRole={user?.vai_tro as 'nong_dan' | 'thuong_lai'}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4 flex-shrink-0">
              <button
                onClick={simulatePartnerSignature}
                className="px-4 py-2.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 rounded-xl text-xs font-bold transition-colors mr-auto"
                title="Sử dụng trong lúc Demo để không phải đổi ví"
              >
                Mô phỏng đối tác đã ký
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Đóng
              </button>
              <div className="flex-1 max-w-[280px]">
                {!buyerSignature || !sellerSignature ? (
                  <button disabled className="w-full px-5 py-2.5 bg-slate-700 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed">
                    Chờ cả 2 bên Ký xác nhận
                  </button>
                ) : (
                  <ConfirmContractButton
                    contractId={channelName}
                    buyerAddress={buyerSignature.wallet}
                    sellerAddress={sellerSignature.wallet}
                    unitPriceVnd={contractDraft.don_gia}
                    expectedQty={contractDraft.so_luong}
                    deadlineIso={contractDraft.han_giao_hang}
                    onSuccess={handleLockSuccess}
                    contractDraft={contractDraft}
                  />
                )}
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
