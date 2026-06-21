'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConnectWalletButton from '../components/shared/ConnectWalletButton';
import WalletBalance from '../components/shared/WalletBalance';
import VideoCallFrame from '../components/shared/VideoCallFrame';
import { useAuth } from '../hooks/useAuth';
import DraftContractTable from '../components/negotiation/DraftContractTable';
import { 
  ShoppingBag, 
  FileSignature, 
  Truck, 
  ChevronRight, 
  Loader2, 
  FileDown, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck,
  Camera,
  Mic,
  Scale,
  Video,
  Lock,
  LogOut,
  MapPin,
  MessageSquare,
  PackageCheck,
  FileText
} from 'lucide-react';

// --- MOCK DATA CHO TAB 1 ---
const MARKET_LISTINGS = [
  { id: 'm1', name: '5 Tấn Lúa ST25', location: 'Long An', price: 9000000, priceStr: '9,000,000 đ/tấn', desc: 'Lúa đẹp, độ ẩm <14%, cam kết thu hoạch đúng ngày.', farmer: 'HTX Nông Nghiệp Vàm Cỏ' },
  { id: 'm2', name: '2 Tấn Cà Phê Robusta', location: 'Đắk Lắk', price: 75000000, priceStr: '75,000,000 đ/tấn', desc: 'Cà phê nhân xô chế biến ướt, hạt sàn 18.', farmer: 'Nông dân Y Thắng' },
  { id: 'm3', name: '1 Tấn Sầu Riêng Ri6', location: 'Tiền Giang', price: 85000, priceStr: '85,000 đ/kg', desc: 'Bao ăn, rụng cuống tự nhiên, cơm vàng hạt lép.', farmer: 'Nhà vườn Út Trọc' },
];

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'market' | 'negotiation' | 'delivery'>('market');
  
  const [negotiations, setNegotiations] = useState<any[]>([
    {
      id: 'n-old-3',
      title: 'Thương vụ: 5 Tấn Lúa ST25',
      partnerName: 'HTX Nông Nghiệp Vàm Cỏ',
      status: 'dang_lien_he',
      listingRef: MARKET_LISTINGS[0]
    },
    {
      id: 'n-old-2',
      title: 'Thương vụ: Sầu Riêng Ri6',
      partnerName: 'Nhà vườn Út Trọc',
      status: 'dang_dam_phan',
      listingRef: MARKET_LISTINGS[2]
    },
    {
      id: 'n-old-1',
      title: 'Thương vụ: Cà phê Robusta',
      partnerName: 'Nông dân Y Thắng',
      status: 'da_chot', // Đã chốt
      contract: {
        san_pham: '2 Tấn Cà Phê Robusta',
        so_luong: 2,
        don_vi_tinh: 'tấn',
        don_gia: 75000000,
        han_giao_hang: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        dieu_khoan_chat_luong: [{ tieu_chi: 'Hạt đen vỡ', nguong_phan_tram: 5, muc_phat: 'Trừ 1% giá trị' }]
      },
      stt: [
        { sender: 'thuong_lai', text: 'Giá 75 củ chốt nhé. Hạt đen vỡ dưới 5% thôi.' },
        { sender: 'nong_dan', text: 'Nhất trí. Lập hợp đồng đi.' }
      ]
    }
  ]);
  const [activeNegotiationId, setActiveNegotiationId] = useState<string | null>(null);
  const [sttMessages, setSttMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contractDraft, setContractDraft] = useState<any>(null);
  const [isContractLocked, setIsContractLocked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- TAB 3 STATE (Delivery List & Detail) ---
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [deliveryStage, setDeliveryStage] = useState(0); // 0: Đang giao, 1: Hàng đã tới (chờ check), 2: Xong
  
  // Dispute State
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeStage, setDisputeStage] = useState(0); // 0: input, 1: AI analyzing, 2: result
  const [disputeInput, setDisputeInput] = useState('');
  const [disputeResult, setDisputeResult] = useState<any>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [sttMessages]);

  if (loading || !user) {
    return (
      <div className="flex-grow flex items-center justify-center bg-white text-neutral-400 min-h-screen gap-2">
        <Loader2 size={18} className="animate-spin text-[#15803D]" />
        <span className="text-sm font-semibold">Đang tải ứng dụng...</span>
      </div>
    );
  }

  const isNongDan = user.vai_tro === 'nong_dan';

  // --- ACTIONS TAB 1 -> TAB 2 ---
  const handleContactNegotiation = (listing: typeof MARKET_LISTINGS[0]) => {
    const newId = `n-${Date.now()}`;
    const newNego = {
      id: newId,
      title: `Thương vụ: ${listing.name}`,
      partnerName: listing.farmer,
      status: 'dang_dam_phan',
      listingRef: listing
    };
    
    setNegotiations(prev => [newNego, ...prev]);
    setActiveTab('negotiation');
    openNegotiation(newNego);
  };

  const openNegotiation = (nego: any) => {
    setActiveNegotiationId(nego.id);
    
    if (nego.status === 'da_chot') {
      setSttMessages(nego.stt);
      setContractDraft(nego.contract);
      setIsContractLocked(true);
      setIsTyping(false);
    } else {
      // Bắt đầu luồng đàm phán mới (Không auto chạy STT)
      setSttMessages([]);
      setContractDraft(null);
      setIsContractLocked(false);
      setIsTyping(false);
      setIsModalOpen(false);
    }
  };

  const simulateLiveSTT = () => {
    if (isTyping) return;
    setIsTyping(true);
    const nego = negotiations.find(n => n.id === activeNegotiationId);
    const listingName = nego?.listingRef?.name || 'Nông sản';
    const listingPrice = nego?.listingRef?.priceStr || 'Thỏa thuận';
    const listingPriceNum = nego?.listingRef?.price || 0;

    const msgs = [
      { sender: 'nong_dan', text: `Chào anh, tôi có ${listingName}. Giá chốt là ${listingPrice} nhé.` },
      { sender: 'thuong_lai', text: `Ok anh. Nhưng nếu độ ẩm quá cao thì tôi phải trừ tiền nha.` },
      { sender: 'nong_dan', text: `Đồng ý. Trên 14% trừ 2% giá trị. Nếu trên 15% tôi cho anh trả hàng luôn.` },
      { sender: 'thuong_lai', text: `Chốt. Hệ thống AI lập hợp đồng đi.` }
    ];

    let step = 0;
    const interval = setInterval(() => {
      if (step < msgs.length) {
        setSttMessages(prev => [...prev, msgs[step]]);
        step++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        // Không tự động bật Modal, để nó hiện Thông báo Toast cho người dùng tự bấm
        setContractDraft({
          san_pham: listingName,
          so_luong: parseFloat(listingName.split(' ')[0]) || 1,
          don_vi_tinh: listingName.includes('Lúa') || listingName.includes('Cà') ? 'tấn' : 'kg',
          don_gia: listingPriceNum,
          han_giao_hang: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          dieu_khoan_chat_luong: [
            { tieu_chi: 'Độ ẩm > 14%', nguong_phan_tram: 14, muc_phat: 'Trừ 2% giá trị thanh toán' },
            { tieu_chi: 'Độ ẩm > 15%', nguong_phan_tram: 15, muc_phat: 'Trả hàng, hủy hợp đồng' }
          ]
        });
      }
    }, 2500);
  };

  const handleLockEscrow = () => {
    setIsContractLocked(true);
    // Cập nhật trạng thái list
    setNegotiations(prev => prev.map(n => n.id === activeNegotiationId ? { ...n, status: 'da_chot', contract: contractDraft, stt: sttMessages } : n));
    alert('Khóa tiền thành công! Hợp đồng đã chuyển sang Tab Giao Nhận.');
  };

  // --- ACTIONS TAB 3 ---
  const openDelivery = (nego: any) => {
    setActiveDeliveryId(nego.id);
    setDeliveryStage(0);
  };

  const submitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    setDisputeStage(1); 
    setTimeout(() => {
      setDisputeResult({
        ly_do: disputeInput,
        can_cu: "Dựa theo Điều 2 hợp đồng, phát hiện lỗi vi phạm tiêu chuẩn.",
        de_xuat: "Trừ 10% giá trị thanh toán. Hoàn 10% về ví Thương lái, giải ngân 90% cho Nông dân."
      });
      setDisputeStage(2);
    }, 3000);
  };

  const handleAIResolutionAgree = () => {
    alert("Smart Contract Resolve Partial thực thi: Đã chia tiền theo phán quyết của AI!");
    setIsDisputeModalOpen(false);
    setActiveDeliveryId(null); // Back to list
  };

  const handleFullDisbursement = () => {
    alert("Giải ngân 100% thành công! Toàn bộ số tiền đã được chuyển cho Nông dân.");
    setActiveDeliveryId(null);
  };

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-slate-50 font-sans">
      
      {/* HEADER & TABS */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#15803D] flex items-center justify-center text-white font-black text-lg shadow-md">A</div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">AgriTrust</span>
          </div>

          <div className="flex items-center gap-4">
            <WalletBalance />
            <ConnectWalletButton />
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-700">{user.ten_hien_thi}</p>
                <p className="text-[10px] text-slate-500 font-medium uppercase">{isNongDan ? 'Nông Dân' : 'Thương Lái'}</p>
              </div>
              <button onClick={logout} className="p-1.5 text-slate-400 hover:text-red-500"><LogOut size={16} /></button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 flex border-b border-slate-100">
          <button onClick={() => { setActiveTab('market'); setActiveNegotiationId(null); setActiveDeliveryId(null); }} className={`px-5 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'market' ? 'border-[#15803D] text-[#15803D]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <ShoppingBag size={16} /> Chợ Nông Sản
          </button>
          <button onClick={() => { setActiveTab('negotiation'); setActiveNegotiationId(null); setActiveDeliveryId(null); }} className={`px-5 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'negotiation' ? 'border-[#15803D] text-[#15803D]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <MessageSquare size={16} /> Đàm phán & Hợp đồng
          </button>
          <button onClick={() => { setActiveTab('delivery'); setActiveNegotiationId(null); setActiveDeliveryId(null); }} className={`px-5 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'delivery' ? 'border-[#15803D] text-[#15803D]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Truck size={16} /> Giao nhận & Thanh toán
          </button>
        </div>
      </header>

      {/* 🟢 TAB 1: CHỢ NÔNG SẢN */}
      {activeTab === 'market' && (
        <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8 animate-fade-in-up">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-slate-900">Chợ Nông Sản B2B</h1>
            <p className="text-sm text-slate-500 mt-1">Nguồn hàng nông sản chất lượng, sẵn sàng kết nối qua Smart Contract.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MARKET_LISTINGS.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-5 flex-1">
                  <div className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded-full mb-3 flex items-center gap-1 w-max">
                    <MapPin size={10} /> {item.location}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
                  <p className="text-[#15803D] font-mono font-bold text-base mt-2">{item.priceStr}</p>
                  <p className="text-xs text-slate-500 mt-3 line-clamp-2">{item.desc}</p>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span className="text-xs font-medium text-slate-700">{item.farmer}</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <button 
                    onClick={() => handleContactNegotiation(item)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Video size={16} /> Liên hệ Đàm phán
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* 🟡 TAB 2: ĐÀM PHÁN & HỢP ĐỒNG */}
      {activeTab === 'negotiation' && (
        <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-6 h-[calc(100vh-120px)] flex flex-col">
          {!activeNegotiationId ? (
            // DANH SÁCH THƯƠNG VỤ
            <div className="animate-fade-in-up">
              <h1 className="text-2xl font-black text-slate-900 mb-6">Quản lý Đàm phán</h1>
              <div className="space-y-4">
                {negotiations.map(nego => (
                  <div key={nego.id} onClick={() => openNegotiation(nego)} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 cursor-pointer transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${nego.status === 'da_chot' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        {nego.status === 'da_chot' ? <Lock size={20} /> : <MessageSquare size={20} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{nego.title}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">Đối tác: {nego.partnerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {nego.status === 'da_chot' 
                        ? <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-200">Đã Chốt & Khóa</span>
                        : nego.status === 'dang_lien_he' 
                          ? <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-xs font-bold border border-amber-200 animate-pulse">Đang Liên hệ...</span>
                          : <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-200 animate-pulse">Đang Đàm phán...</span>
                      }
                      <ChevronRight size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (negotiations.find(n => n.id === activeNegotiationId)?.status === 'dang_dam_phan' || negotiations.find(n => n.id === activeNegotiationId)?.status === 'dang_lien_he') ? (
            // GIAO DIỆN PHÒNG HỌP VIDEO FULL SCREEN CHUẨN (ZOOM/MEET)
            <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-fade-in">
              {/* Header của phòng họp riêng */}
              <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-black/80 to-transparent z-50 flex items-center px-6 pointer-events-none">
                 <h2 className="text-white font-bold text-lg drop-shadow-md">Phòng Đàm Phán: {negotiations.find(n => n.id === activeNegotiationId)?.title}</h2>
              </div>

              {/* Full screen video */}
              <div className="flex-1 relative w-full h-full">
                <VideoCallFrame channelName={activeNegotiationId} role={user.vai_tro as 'nong_dan' | 'thuong_lai'} />
              </div>
              
              {/* Overlay button */}
              <div className="absolute top-20 left-6 z-40 flex flex-col items-start gap-3 pointer-events-none">
                <button onClick={() => setActiveNegotiationId(null)} className="pointer-events-auto px-4 py-2 bg-black/50 hover:bg-black/80 text-white rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1 backdrop-blur-sm">
                  <ChevronRight size={14} className="rotate-180" /> Thoát phòng
                </button>

                <button
                  onClick={simulateLiveSTT}
                  disabled={isTyping || contractDraft}
                  className="pointer-events-auto mt-2 px-5 py-2.5 rounded-full bg-indigo-600/90 backdrop-blur-md hover:bg-indigo-500 text-white font-bold text-xs shadow-xl active:scale-95 transition-all flex items-center gap-2 border border-white/10"
                >
                  <Mic size={14} className={isTyping ? "animate-pulse text-red-300" : ""} /> 
                  {isTyping ? "Hệ thống AI đang nghe..." : "Giả lập Thoại thương lượng"}
                </button>
              </div>

              {/* Subtitles Overlay */}
              {sttMessages.length > 0 && isTyping && sttMessages[sttMessages.length - 1] && (
                <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-45 text-center pointer-events-none animate-fadeIn">
                  <div className="bg-black/75 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-2xl text-white inline-block max-w-full">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold block mb-1 text-emerald-400">
                      {sttMessages[sttMessages.length - 1].sender === 'nong_dan' ? 'Nông dân' : 'Thương lái'}
                    </span>
                    <p className="text-sm font-semibold leading-relaxed">
                      "{sttMessages[sttMessages.length - 1].text}"
                    </p>
                  </div>
                </div>
              )}

              {/* FLOATING CONTRACT READY TOAST */}
              {contractDraft && !isContractLocked && !isModalOpen && (
                <div className="absolute bottom-10 right-6 z-40 max-w-sm bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 p-5 rounded-2xl shadow-2xl pointer-events-auto">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                      <ShieldCheck size={18} className="animate-pulse" />
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
                        <FileText size={14} />
                        Xem hợp đồng nháp
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTRACT MODAL (overlaying video) */}
              {contractDraft && !isContractLocked && isModalOpen && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-scaleUp pointer-events-auto">
                  <div className="w-full max-w-5xl bg-slate-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                     <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
                        <div>
                          <h2 className="font-black text-xl text-slate-900">Hợp Đồng Tự Động Ký Quỹ</h2>
                          <p className="text-xs text-slate-500 mt-1">AI đã trích xuất thành công điều khoản từ hội thoại</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setIsModalOpen(false)} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all">
                            Đóng Modal
                          </button>
                          <button onClick={handleLockEscrow} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all">
                            <ShieldCheck size={16} className="inline mr-2"/> Khóa Tiền & Chốt
                          </button>
                        </div>
                     </div>
                     <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                        <DraftContractTable terms={contractDraft} onChange={setContractDraft} isLocked={false} />
                     </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // GIAO DIỆN CHIA ĐÔI CHO THƯƠNG VỤ ĐÃ CHỐT
            <div className="flex flex-1 overflow-hidden rounded-2xl border border-slate-200 shadow-sm animate-fade-in-up">
              
              {/* KHUNG STT - BÊN TRÁI */}
              <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col print:hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                  <button onClick={() => setActiveNegotiationId(null)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900"><ChevronRight size={16} className="rotate-180" /></button>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Lịch sử Đàm Phán</h3>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded uppercase">Đã kết thúc</span>
                  </div>
                </div>
                
                {/* STT CHAT */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100" ref={scrollRef}>
                  {sttMessages.map((msg, idx) => {
                    if(!msg) return null;
                    return (
                      <div key={idx} className={`flex flex-col ${msg.sender === user?.vai_tro ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold text-slate-400 mb-1 px-1 uppercase">
                          {msg.sender === 'nong_dan' ? 'Nông dân' : 'Thương lái'}
                        </span>
                        <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm ${msg.sender === user?.vai_tro ? 'bg-[#15803D] text-white rounded-br-none shadow-sm' : 'bg-white text-slate-800 rounded-bl-none shadow-sm border border-slate-200'}`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KHUNG HỢP ĐỒNG - BÊN PHẢI */}
              <div className="w-2/3 bg-slate-50 flex flex-col relative overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between z-10 print:hidden shadow-sm">
                  <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    Hợp Đồng Ký Quỹ
                    {isContractLocked && (
                      <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <Lock size={12} /> ĐÃ KHÓA TRÊN SOLANA
                      </span>
                    )}
                  </h2>
                  <div className="flex gap-2">
                    {isContractLocked && (
                      <button onClick={() => window.print()} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-2 border border-slate-200">
                        <FileDown size={14} /> Xuất PDF
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex justify-center">
                  <div className="w-full max-w-3xl">
                    <DraftContractTable terms={contractDraft} onChange={setContractDraft} isLocked={isContractLocked} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* 🟠 TAB 3: GIAO NHẬN & THANH TOÁN */}
      {activeTab === 'delivery' && (
        <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-6 h-[calc(100vh-120px)] flex flex-col">
          {!activeDeliveryId ? (
            // DANH SÁCH HÀNG ĐANG GIAO
            <div className="animate-fade-in-up">
              <h1 className="text-2xl font-black text-slate-900 mb-6">Theo dõi Giao Nhận</h1>
              <div className="space-y-4">
                {negotiations.filter(n => n.status === 'da_chot').length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
                    <Truck size={40} className="mx-auto mb-4 opacity-20" />
                    <p>Chưa có hợp đồng nào đang giao hàng.</p>
                  </div>
                ) : (
                  negotiations.filter(n => n.status === 'da_chot').map(nego => (
                    <div key={nego.id} onClick={() => openDelivery(nego)} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 cursor-pointer transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <Truck size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">{nego.title}</h3>
                          <p className="text-sm text-slate-500 mt-0.5">Tiến độ: Đang vận chuyển</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-[#15803D]">100% Tiền Đã Khóa</span>
                        <ChevronRight size={20} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            // CHI TIẾT GIAO NHẬN
            <div className="max-w-3xl mx-auto w-full animate-fade-in-up">
              <div className="mb-4">
                <button onClick={() => setActiveDeliveryId(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 font-bold mb-4">
                  <ChevronRight size={16} className="rotate-180" /> Quay lại danh sách
                </button>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
                
                <div className="text-center pb-6 border-b border-slate-100">
                  <PackageCheck size={48} className="mx-auto mb-4 text-[#15803D]" />
                  <h2 className="text-2xl font-black text-slate-900">Kiểm tra Hàng hóa</h2>
                  <p className="text-sm text-slate-500 mt-2">Xác nhận tình trạng lô hàng khi vận chuyển đến nơi.</p>
                </div>

                {deliveryStage === 0 && (
                  <div className="text-center space-y-4">
                    <p className="text-slate-700 font-bold">Hàng đã được giao tới kho của bạn chưa?</p>
                    <button onClick={() => setDeliveryStage(1)} className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md">
                      Xác nhận Hàng đã tới
                    </button>
                  </div>
                )}

                {deliveryStage === 1 && (
                  <div className="space-y-6 animate-fade-in-up">
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-center">
                      <p className="text-indigo-900 font-bold">Kiểm tra chất lượng hàng hóa</p>
                      <p className="text-xs text-indigo-700 mt-1">Hàng hóa có đúng cam kết trong Hợp đồng không?</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button 
                        onClick={handleFullDisbursement}
                        className="p-6 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex flex-col items-center justify-center gap-3 transition-colors group"
                      >
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                          <CheckCircle2 size={32} />
                        </div>
                        <div className="text-center">
                          <h4 className="font-bold text-emerald-900 text-lg">Đạt Chuẩn</h4>
                          <p className="text-xs text-emerald-700 mt-1">Giải ngân 100% cho Nông dân</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => { setIsDisputeModalOpen(true); setDisputeStage(0); setDisputeInput(''); }}
                        className="p-6 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex flex-col items-center justify-center gap-3 transition-colors group"
                      >
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-rose-600 shadow-sm group-hover:scale-110 transition-transform">
                          <AlertTriangle size={32} />
                        </div>
                        <div className="text-center">
                          <h4 className="font-bold text-rose-900 text-lg">Hàng Có Lỗi</h4>
                          <p className="text-xs text-rose-700 mt-1">Báo cáo để AI phân xử phạt</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </main>
      )}

      {/* MODAL TRỌNG TÀI AI */}
      {isDisputeModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scaleUp">
            <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2"><Scale size={18} /> Hệ Thống Phân Xử Kỹ Thuật Số</h3>
            </div>
            
            <div className="p-6">
              {disputeStage === 0 && (
                <form onSubmit={submitDispute} className="space-y-4">
                  <p className="text-sm text-slate-600 font-medium">Cung cấp bằng chứng cho hệ thống phân tích:</p>
                  <textarea 
                    value={disputeInput}
                    onChange={(e) => setDisputeInput(e.target.value)}
                    placeholder="Mô tả lỗi (Ví dụ: Lúa bị mốc, độ ẩm đo được 14.5%)"
                    className="w-full h-24 p-3 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none"
                    required
                  />
                  <div className="flex gap-2">
                    <button type="button" className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"><Camera size={14}/> Chụp ảnh</button>
                    <button type="button" className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"><Mic size={14}/> Đọc lỗi</button>
                  </div>
                  <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm shadow-md transition-colors">
                    Gửi cho Trọng Tài AI
                  </button>
                  <button type="button" onClick={() => setIsDisputeModalOpen(false)} className="w-full py-2 text-slate-500 hover:text-slate-900 font-bold text-xs transition-colors">Hủy</button>
                </form>
              )}

              {disputeStage === 1 && (
                <div className="py-8 flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-100 rounded-full border-t-indigo-600 animate-spin"></div>
                    <Scale className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Hệ thống AI đang phân tích...</h4>
                    <p className="text-xs text-slate-500 mt-2 max-w-[250px] mx-auto">Đang đối chiếu bằng chứng với các Điều khoản chất lượng đã ký quỹ trên Smart Contract.</p>
                  </div>
                </div>
              )}

              {disputeStage === 2 && disputeResult && (
                <div className="space-y-5 animate-fade-in-up">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Căn cứ pháp lý</span>
                      <p className="text-xs text-amber-900 font-medium">{disputeResult.can_cu}</p>
                    </div>
                    <div className="h-px w-full bg-amber-200/50"></div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Quyết định giải ngân</span>
                      <p className="text-sm font-bold text-emerald-800">{disputeResult.de_xuat}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-center text-[10px] text-slate-500 font-medium uppercase">YÊU CẦU 2 BÊN XÁC NHẬN ĐỂ THỰC THI SMART CONTRACT</p>
                    <div className="flex gap-3">
                      <button onClick={handleAIResolutionAgree} className="flex-1 py-3 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-50 font-bold rounded-xl text-sm transition-colors">
                        Nông dân Đồng ý
                      </button>
                      <button onClick={handleAIResolutionAgree} className="flex-1 py-3 bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-xl text-sm shadow-md transition-colors">
                        Thương lái Đồng ý
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
