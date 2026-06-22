'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ConnectWalletButton from '../components/shared/ConnectWalletButton';
import WalletBalance from '../components/shared/WalletBalance';
import VideoCallFrame from '../components/shared/VideoCallFrame';
import { useAuth } from '../hooks/useAuth';
import DraftContractTable from '../components/negotiation/DraftContractTable';
import { getMarketListings, createMarketListing } from '../lib/supabase/queries/listings';
import { createDraftContract, updateContractStatus } from '../lib/supabase/queries/contracts';
import { supabase } from '../lib/supabase/client';
import { encodeMeetingParams } from '../lib/utils/url';
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
  FileText,
  X
} from 'lucide-react';

import DisputeReportForm from '../components/dispute/DisputeReportForm';
import SettlementProposal from '../components/dispute/SettlementProposal';
import { DisputeReport } from '../types/disputeReport';
function HomePageContent() {
  const searchParams = useSearchParams();
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'market' | 'negotiation' | 'delivery'>('market');
  const [toastMsg, setToastMsg] = useState<{ text: string; negoId?: string } | null>(null);

  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [activeNegotiationId, setActiveNegotiationId] = useState<string | null>(null);
  const [sttMessages, setSttMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contractDraft, setContractDraft] = useState<any>(null);
  const [isContractLocked, setIsContractLocked] = useState(false);

  const activeNego = negotiations.find(n => n.id === activeNegotiationId);



  // Read URL params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const negoIdParam = searchParams.get('negoId');
    if (tabParam) {
      setActiveTab(tabParam as any);
    }
    if (negoIdParam) {
      setActiveNegotiationId(negoIdParam);
    }
  }, [searchParams]);

  // Sync contractDraft when activeNegotiationId changes
  useEffect(() => {
    if (activeNegotiationId) {
      const nego = negotiations.find(n => n.id === activeNegotiationId);
      if (nego && nego.status === 'da_chot' && nego.contract) {
        setContractDraft(nego.contract.noi_dung_nhap_ai || nego.contract);
        setIsContractLocked(true);
      }
    }
  }, [activeNegotiationId, negotiations]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- TAB 1 STATE (Farmer listings) ---
  const [myListings, setMyListings] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newListing, setNewListing] = useState({ name: '', qty: '', location: '', desc: '' });

  // --- TAB 3 STATE (Delivery List & Detail) ---
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [deliveryStage, setDeliveryStage] = useState(0); // 0: Đang giao, 1: Hàng đã tới (chờ check), 2: Xong

  // Dispute State
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeStage, setDisputeStage] = useState(0); // 0: Form khiếu nại, 1: Nông dân xác nhận, 2: AI Loading, 3: Kết quả AI
  const [disputeInput, setDisputeInput] = useState('');
  const [disputeReport, setDisputeReport] = useState<DisputeReport | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [sttMessages]);

  useEffect(() => {
    async function loadListings() {
      try {
        const dbListings = await getMarketListings();
        if (dbListings) {
          const mapped = dbListings.map((l: any) => ({
            id: l.id,
            name: l.ten_san_pham,
            qty: l.so_luong,
            location: l.khu_vuc,
            desc: l.mo_ta || 'Nông sản chất lượng từ nông dân đã xác thực.',
            farmer: l.nguoi_dung?.ten_hien_thi || 'Nông dân AgriTrust',
            vi_nguoi_ban: l.vi_nguoi_ban || l.nong_dan_id
          }));
          setMyListings(mapped);
        }
      } catch (err) {
        console.error('Không thể tải tin đăng từ Supabase, dùng dữ liệu giả lập:', err);
      }
    }
    loadListings();
  }, []);

  // Helper bị loại bỏ vì đã lấy trực tiếp từ DB
  // const getPartnerName = (walletAddress: string) => { ... }

  useEffect(() => {
    if (!user) return;
    const userWallet = user.dia_chi_vi;

    async function loadDbContracts() {
      try {
        const { data: dbContracts, error } = await supabase
          .from('hop_dong')
          .select('*, nguoi_ban:nguoi_dung!hop_dong_vi_nguoi_ban_fkey(ten_hien_thi), nguoi_mua:nguoi_dung!hop_dong_vi_nguoi_mua_fkey(ten_hien_thi)')
          .or(`vi_nguoi_ban.eq.${userWallet},vi_nguoi_mua.eq.${userWallet}`);

        if (error) throw error;

        if (dbContracts) {
          const mappedContracts = dbContracts.map((c: any) => {
            const isSeller = c.vi_nguoi_ban === userWallet;
            const partnerAddress = isSeller ? c.vi_nguoi_mua : c.vi_nguoi_ban;
            const partnerInfo = isSeller ? c.nguoi_mua : c.nguoi_ban;
            const partnerName = partnerInfo?.ten_hien_thi || `${partnerAddress.slice(0, 6)}...${partnerAddress.slice(-4)}`;

            return {
              id: c.id,
              title: `Thương vụ: ${c.so_luong} ${c.don_vi_tinh} ${c.san_pham}`,
              partnerName: partnerName,
              status: c.trang_thai === 'du_thao' ? 'dang_dam_phan' : 'da_chot',
              deliveryStatus: c.trang_thai === 'da_khoa_tien' ? 'dang_van_chuyen' :
                c.trang_thai === 'dang_tranh_chap' ? 'cho_nghiem_thu' :
                  c.trang_thai === 'da_xac_nhan' || c.trang_thai === 'da_giai_quyet' ? 'da_hoan_thanh' : 'dang_van_chuyen',
              contract: c,
              stt: c.noi_dung_nhap_ai?.stt || [
                { sender: 'thuong_lai', text: 'Chào anh, tôi muốn thương lượng lô hàng này.' },
                { sender: 'nong_dan', text: 'Vâng chào anh, chúng ta cùng thống nhất điều khoản.' }
              ]
            };
          });

          setNegotiations(prev => {
            const filteredPrev = prev.filter(p => !mappedContracts.some((m: any) => m.id === p.id));
            return [...mappedContracts, ...filteredPrev];
          });
        }
      } catch (err) {
        console.error('Lỗi khi tải hợp đồng từ database:', err);
      }
    }

    loadDbContracts();

    // Đăng ký realtime lắng nghe thay đổi trên bảng hop_dong để cập nhật tức thời
    const channel = supabase
      .channel('homepage_contracts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hop_dong',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newDoc = payload.new as any;
            if (newDoc.vi_nguoi_ban === user.dia_chi_vi && newDoc.trang_thai === 'du_thao') {
              setToastMsg({ text: `Có Thương lái vừa yêu cầu đàm phán hợp đồng mua ${newDoc.san_pham}! Bấm để tham gia ngay.`, negoId: newDoc.id });
              setTimeout(() => setToastMsg(null), 8000); // Ẩn sau 8s
            }
          }
          loadDbContracts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Load Lịch sử Đàm Phán cho hợp đồng đang chọn (nếu là thật)
  useEffect(() => {
    if (activeNegotiationId) {
      const nego = negotiations.find(n => n.id === activeNegotiationId);
      if (nego) {
        if (nego.id === '1' || nego.id === '2' || nego.id.includes('demo')) {
          setSttMessages(nego.stt || []);
        } else {
          // Lấy thật từ database
          import('../lib/supabase/queries/transcripts').then(m => {
            m.getTranscriptsByContractId(nego.id).then(txs => {
              if (txs && txs.length > 0) {
                setSttMessages(txs.map(t => ({
                  sender: t.vi_nguoi_noi === nego.contract?.vi_nguoi_ban ? 'nong_dan' : 'thuong_lai',
                  text: t.noi_dung
                })));
              } else {
                setSttMessages([]);
              }
            }).catch(e => console.warn('Lỗi lấy STT thật:', e));
          });
        }
      }
    } else {
      setSttMessages([]);
    }
  }, [activeNegotiationId, negotiations]);

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
  const handleContactNegotiation = async (listing: any) => {
    try {
      const soLuongSo = parseFloat(listing.qty) || 0;
      const donVi = listing.qty.replace(/[0-9.]/g, '').trim() || 'kg';

      // --- HACKATHON FIX: Đảm bảo cả 2 ví đều tồn tại trong DB để tránh lỗi Foreign Key ---
      // 1. Insert ví người mua (người đang đăng nhập) - Bỏ qua nếu đã tồn tại (mã 23505)
      const { error: upsertErr1 } = await supabase.from('nguoi_dung').insert({
        dia_chi_vi: user.dia_chi_vi,
        vai_tro: user.vai_tro,
        ten_dang_nhap: `user_${user.dia_chi_vi.slice(0, 6)}_${Date.now()}`,
        mat_khau: '123456',
        ten_hien_thi: user.ten_hien_thi || 'Thương lái (Khách)'
      });
      if (upsertErr1 && upsertErr1.code !== '23505') {
        console.error("Insert buyer failed:", upsertErr1);
      }

      // 2. Insert ví người bán (chủ tin đăng) - Bỏ qua nếu đã tồn tại
      const sellerWallet = listing.vi_nguoi_ban || listing.nong_dan_id || 'nong_dan_wallet_address_demo';
      const { error: upsertErr2 } = await supabase.from('nguoi_dung').insert({
        dia_chi_vi: sellerWallet,
        vai_tro: 'nong_dan',
        ten_dang_nhap: `seller_${sellerWallet.slice(0, 6)}_${Date.now()}`,
        mat_khau: '123456',
        ten_hien_thi: listing.farmer || 'Nhà vườn (Khách)'
      });
      if (upsertErr2 && upsertErr2.code !== '23505') {
        console.error("Insert seller failed:", upsertErr2);
      }
      // -----------------------------------------------------------------------------------

      const dbContract = await createDraftContract({
        vi_nguoi_ban: sellerWallet,
        vi_nguoi_mua: user.dia_chi_vi,
        san_pham: listing.name,
        so_luong: soLuongSo,
        don_vi_tinh: donVi,
        don_gia: 0,
        han_giao_hang: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        noi_dung_nhap_ai: null,
        dieu_khoan_chat_luong: [],
      });

      const encoded = encodeMeetingParams({
        channel: dbContract.id,
        scenario: 'A',
        product: listing.name,
        partner: listing.farmer
      });
      router.push(`/call?p=${encoded}`);
    } catch (err) {
      console.error("Lỗi khởi tạo phòng đàm phán:", err);
      alert("Không thể khởi tạo phòng đàm phán. Vui lòng thử lại!");
    }
  };

  const openNegotiation = (nego: any) => {
    if (nego.status === 'da_chot') {
      setActiveNegotiationId(nego.id);
    } else {
      const encoded = encodeMeetingParams({
        channel: nego.id,
        scenario: 'A',
        product: nego.title.replace('Thương vụ: ', ''),
        partner: nego.partnerName
      });
      router.push(`/call?p=${encoded}`);
    }
  };

  const simulateLiveSTT = () => {
    if (isTyping) return;
    setIsTyping(true);
    const nego = negotiations.find(n => n.id === activeNegotiationId);
    const listingName = nego?.listingRef?.name || 'Nông sản';
    const listingQty = nego?.listingRef?.qty || '1 tấn';

    const msgs = [
      { sender: 'nong_dan', text: `Chào anh, tôi có ${listingName}, số lượng ${listingQty}. Liên hệ để thương lượng giá nhé.` },
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
        const soLuong = parseFloat(listingName.split(' ')[0]) || 1;
        const donViTinh = listingName.includes('Lúa') || listingName.includes('Cà') ? 'tấn' : 'kg';
        const donGia = 9000000; // Giá mặc định demo — sẽ do 2 bên thương lượng qua thoại
        const tongVnd = donGia * soLuong;
        const tongUsdc = Math.round((tongVnd / 4000000) * 1000) / 1000;
        const newContractId = crypto.randomUUID ? crypto.randomUUID() : `demo-${Date.now()}`;

        setContractDraft({
          id: newContractId,
          vi_nguoi_ban: nego?.listingRef?.vi_nguoi_ban || 'nong_dan_wallet_address_demo',
          vi_nguoi_mua: user?.dia_chi_vi || 'thuong_lai_wallet_address_demo',
          san_pham: listingName,
          so_luong: soLuong,
          don_vi_tinh: donViTinh,
          don_gia: donGia,
          han_giao_hang: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          noi_dung_nhap_ai: {
            san_pham: listingName,
            so_luong: soLuong,
            don_gia: donGia,
            nguon: 'Trích xuất từ đàm phán thoại AI',
            cac_cau_dam_phan: msgs.map(m => m.text)
          },
          dieu_khoan_chat_luong: [
            { tieu_chi: 'Độ ẩm > 14%', nguong_phan_tram: 14, muc_phat: 'Trừ 2% giá trị thanh toán' },
            { tieu_chi: 'Độ ẩm > 15%', nguong_phan_tram: 15, muc_phat: 'Trả hàng, hủy hợp đồng' }
          ],
          ty_gia_vnd_usdc: 4000000,
          tong_tien_usdc_khoa: tongUsdc,
          dia_chi_vi_escrow: null, // Sẽ được set khi initialize on-chain
          trang_thai: 'du_thao',
          ngay_tao: new Date().toISOString()
        });
      }
    }, 600); // Tốc độ siêu nhanh cho chế độ giả lập demo
  };

  const handleLockEscrow = async () => {
    if (!contractDraft) return;

    try {
      // 1. Tạo hợp đồng dạng dự thảo để lấy mã UUID thật từ database
      const dbContract = await createDraftContract({
        vi_nguoi_ban: contractDraft.vi_nguoi_ban || 'nong_dan_wallet_address_demo',
        vi_nguoi_mua: contractDraft.vi_nguoi_mua || 'thuong_lai_wallet_address_demo',
        san_pham: contractDraft.san_pham,
        so_luong: contractDraft.so_luong,
        don_vi_tinh: contractDraft.don_vi_tinh,
        don_gia: contractDraft.don_gia,
        han_giao_hang: contractDraft.han_giao_hang,
        noi_dung_nhap_ai: contractDraft.noi_dung_nhap_ai,
        dieu_khoan_chat_luong: contractDraft.dieu_khoan_chat_luong,
      });

      const now = new Date().toISOString();
      const escrowAddress = 'Solana_Escrow_PDA_' + Date.now().toString(36);

      // 2. Cập nhật trạng thái hợp đồng thành 'da_khoa_tien' on-chain (giả lập lưu DB)
      const lockedContract = await updateContractStatus(dbContract.id, 'da_khoa_tien', {
        dia_chi_vi_escrow: escrowAddress,
        tong_tien_usdc_khoa: contractDraft.tong_tien_usdc_khoa,
        ngay_xac_nhan: now,
      });

      setIsContractLocked(true);
      setContractDraft(lockedContract);

      // Đồng bộ ID hợp đồng mới tạo vào danh sách đàm phán để Tab Giao Nhận lấy đúng ID
      setNegotiations(prev => prev.map(n => n.id === activeNegotiationId ? {
        ...n,
        id: lockedContract.id,
        status: 'da_chot',
        deliveryStatus: 'dang_van_chuyen',
        contract: lockedContract,
        stt: sttMessages
      } : n));

      alert('Khóa tiền thành công! Hợp đồng đã được ghi nhận vào Database thật.');
    } catch (err) {
      console.error('Lỗi khi chốt hợp đồng trong database:', err);
      // Fallback cục bộ
      setIsContractLocked(true);
      const now = new Date().toISOString();
      const lockedDraft = { ...contractDraft, trang_thai: 'da_khoa_tien', ngay_xac_nhan: now, dia_chi_vi_escrow: 'Solana_Escrow_PDA_' + Date.now().toString(36) };
      setContractDraft(lockedDraft);
      setNegotiations(prev => prev.map(n => n.id === activeNegotiationId ? { ...n, status: 'da_chot', deliveryStatus: 'dang_van_chuyen', contract: lockedDraft, stt: sttMessages } : n));
      alert('Khóa tiền thành công! (Chế độ giả lập do lỗi DB)');
    }
  };

  // --- ACTIONS TAB 3 ---
  const openDelivery = (nego: any) => {
    router.push(`/contract/${nego.id}`);
  };

  const handleGoodsArrived = () => {
    setDeliveryStage(1);
    setNegotiations(prev => prev.map(n => n.id === activeDeliveryId ? { ...n, deliveryStatus: 'cho_nghiem_thu' } : n));
  };

  const handleDisputeSubmitted = (report: DisputeReport) => {
    setDisputeReport(report);
    // Chuyển sang bước Nông dân xác nhận (Stage 1)
    setDisputeStage(1);
  };

  const handleSellerConfirmReport = () => {
    // Nông dân xác nhận xong -> Chuyển sang AI xử lý (Stage 2)
    setDisputeStage(2);
    setTimeout(() => {
      // Sau 2.5s -> Hiện kết quả (Stage 3)
      setDisputeStage(3);
    }, 2500);
  };

  const handleAIResolutionAgree = () => {
    alert("Smart Contract Resolve Partial thực thi: Đã chia tiền theo phán quyết của AI!");
    setIsDisputeModalOpen(false);
    setActiveDeliveryId(null); // Back to list
    setNegotiations(prev => prev.map(n => n.id === activeDeliveryId ? { ...n, deliveryStatus: 'da_hoan_thanh' } : n));
  };

  const handleFullDisbursement = () => {
    alert("Giải ngân 100% thành công! Toàn bộ số tiền đã được chuyển cho Nông dân.");
    setActiveDeliveryId(null);
    setNegotiations(prev => prev.map(n => n.id === activeDeliveryId ? { ...n, deliveryStatus: 'da_hoan_thanh' } : n));
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
              <Link href="/profile" className="text-right group cursor-pointer flex items-center justify-center h-full">
                <p className="text-sm font-bold text-slate-700 group-hover:text-[#15803D] transition-colors">
                  {isNongDan ? 'Nông dân Nguyễn Văn Ruộng' : user.ten_hien_thi}
                </p>
              </Link>
              <button onClick={logout} className="p-1.5 ml-2 text-slate-400 hover:text-red-500 transition-colors">
                <LogOut size={16} />
              </button>
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
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Chợ Nông Sản B2B</h1>
              <p className="text-sm text-slate-500 mt-1">
                {isNongDan ? 'Đăng bán nông sản của bạn để Thương lái liên hệ đàm phán.' : 'Nguồn hàng nông sản chất lượng, sẵn sàng kết nối qua Smart Contract.'}
              </p>
            </div>
            {isNongDan && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-5 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-md"
              >
                {showAddForm ? 'Đóng' : '+ Đăng bán Nông sản'}
              </button>
            )}
          </div>

          {/* FORM ĐĂNG BÁN CHO NÔNG DÂN */}
          {isNongDan && showAddForm && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 animate-fade-in-up">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShoppingBag size={16} className="text-[#15803D]" /> Thêm nông sản của bạn
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên nông sản</label>
                  <input
                    type="text" placeholder="Ví dụ: 3 Tấn Lúa ST25" value={newListing.name}
                    onChange={e => setNewListing({ ...newListing, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#15803D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số lượng</label>
                  <input
                    type="text" placeholder="Ví dụ: 3 tấn" value={newListing.qty}
                    onChange={e => setNewListing({ ...newListing, qty: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#15803D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vùng miền</label>
                  <input
                    type="text" placeholder="Ví dụ: Long An" value={newListing.location}
                    onChange={e => setNewListing({ ...newListing, location: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#15803D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả chi tiết</label>
                  <input
                    type="text" placeholder="Độ ẩm, chất lượng, cam kết..." value={newListing.desc}
                    onChange={e => setNewListing({ ...newListing, desc: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#15803D] outline-none"
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!newListing.name || !newListing.qty) return alert('Vui lòng nhập tên và số lượng nông sản.');

                  const newListingData = {
                    vi_nguoi_ban: user?.dia_chi_vi || 'nong_dan_wallet_address_demo',
                    ten_san_pham: newListing.name,
                    so_luong: newListing.qty,
                    khu_vuc: newListing.location || 'Đồng bằng Sông Cửu Long',
                    mo_ta: newListing.desc || 'Nông sản chất lượng từ nông dân đã xác thực.'
                  };

                  try {
                    // Thử lưu vào Supabase
                    const saved = await createMarketListing(newListingData);
                    const item = {
                      id: saved.id,
                      name: saved.ten_san_pham,
                      qty: saved.so_luong,
                      location: saved.khu_vuc,
                      desc: saved.mo_ta || '',
                      farmer: user?.ten_hien_thi || 'Nông dân AgriTrust',
                      vi_nguoi_ban: saved.vi_nguoi_ban
                    };
                    setMyListings(prev => [item, ...prev]);
                  } catch (err) {
                    console.error('Lỗi khi lưu lên Supabase, lưu tạm vào state để demo:', err);
                    // Fallback sang local state để đảm bảo chương trình không bị gián đoạn khi demo
                    const item = {
                      id: `my-${Date.now()}`,
                      name: newListing.name,
                      qty: newListing.qty,
                      location: newListing.location || 'Đồng bằng Sông Cửu Long',
                      desc: newListing.desc || 'Nông sản chất lượng từ nông dân đã xác thực.',
                      farmer: user?.ten_hien_thi || 'Nông dân AgriTrust',
                      vi_nguoi_ban: user?.dia_chi_vi || 'nong_dan_wallet_address_demo'
                    };
                    setMyListings(prev => [item, ...prev]);
                  }

                  setNewListing({ name: '', qty: '', location: '', desc: '' });
                  setShowAddForm(false);
                }}
                className="mt-4 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Đăng lên Chợ
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myListings.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-5 flex-1">
                  <div className="inline-flex px-3 py-1.5 bg-blue-50 text-blue-700 text-[11px] font-bold uppercase rounded-full mb-3 items-center gap-1.5">
                    <MapPin size={12} /> {item.location}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
                  <p className="text-[#15803D] font-bold text-sm mt-2">Số lượng: {item.qty}</p>
                  <p className="text-xs text-slate-500 mt-3 line-clamp-2">{item.desc}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span className="text-xs font-medium text-slate-700">{item.farmer}</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  {isNongDan ? (
                    <div className="text-center text-xs text-slate-400 font-medium py-1">
                      Đang chờ Thương lái liên hệ
                    </div>
                  ) : (
                    <button
                      onClick={() => handleContactNegotiation(item)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Video size={16} /> Liên hệ Đàm phán
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* 🟡 TAB 2: ĐÀM PHÁN & HỢP ĐỒNG */}
      {activeTab === 'negotiation' && (
        <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-6 flex flex-col">
          {!activeNegotiationId ? (
            // DANH SÁCH THƯƠNG VỤ
            <div className="animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h1 className="text-2xl font-black text-slate-900">Quản lý Đàm phán & Hợp đồng</h1>

                {/* WIDGET TỔNG TIỀN ĐANG KHÓA */}
                <div className="bg-gradient-to-r from-emerald-600 to-[#15803D] p-4 rounded-2xl text-white shadow-lg flex items-center gap-4 border border-emerald-500/30">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <Lock size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-0.5">Tổng tiền quỹ đang khóa</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black">
                        {negotiations
                          .filter(n => n.status === 'da_chot' && n.contract?.tong_tien_usdc_khoa)
                          .reduce((sum, n) => sum + (n.contract.tong_tien_usdc_khoa || 0), 0)
                          .toLocaleString('en-US')} SOL
                      </span>
                      <span className="text-sm font-semibold text-emerald-200">
                        (~{negotiations
                          .filter(n => n.status === 'da_chot' && n.contract?.don_gia && n.contract?.so_luong)
                          .reduce((sum, n) => sum + (n.contract.don_gia * n.contract.so_luong), 0)
                          .toLocaleString('vi-VN')} VNĐ)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {negotiations.map(nego => (
                  <div key={nego.id} onClick={() => openNegotiation(nego)} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between group gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex flex-shrink-0 items-center justify-center ${nego.status === 'da_chot' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        {nego.status === 'da_chot' ? <Lock size={20} /> : <MessageSquare size={20} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg truncate max-w-[250px] sm:max-w-md">{nego.title}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">Đối tác: <span className="font-semibold text-slate-700">{nego.partnerName}</span></p>
                        {nego.status === 'da_chot' && nego.contract && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {(nego.contract.tong_tien_usdc_khoa || 0).toLocaleString()} SOL
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">
                              / {(nego.contract.don_gia * nego.contract.so_luong).toLocaleString('vi-VN')} VNĐ
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-0 border-slate-100 pt-3 md:pt-0 w-full md:w-auto">
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
                          <ShieldCheck size={16} className="inline mr-2" /> Khóa Tiền & Chốt
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                      {contractDraft ? (
                        <DraftContractTable
                          terms={contractDraft}
                          onChange={setContractDraft}
                          isLocked={false}
                          buyerName={
                            activeNego?.contract?.nguoi_mua?.ten_hien_thi ||
                            contractDraft?.buyerSignature?.name ||
                            (activeNego?.contract?.vi_nguoi_mua === user?.dia_chi_vi ? user?.ten_hien_thi : 'Thương lái')
                          }
                          sellerName={
                            activeNego?.contract?.nguoi_ban?.ten_hien_thi ||
                            contractDraft?.sellerSignature?.name ||
                            (activeNego?.contract?.vi_nguoi_ban === user?.dia_chi_vi ? user?.ten_hien_thi : 'Nông dân')
                          }
                          buyerSignature={contractDraft?.buyerSignature || activeNego?.contract?.noi_dung_nhap_ai?.buyerSignature || null}
                          sellerSignature={contractDraft?.sellerSignature || activeNego?.contract?.noi_dung_nhap_ai?.sellerSignature || null}
                        />
                      ) : (
                        <div className="flex justify-center items-center h-full text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // GIAO DIỆN CHIA ĐÔI CHO THƯƠNG VỤ ĐÃ CHỐT
            <div className="flex flex-1 h-[75vh] md:h-[700px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm animate-fade-in-up">

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
                    if (!msg) return null;
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
                    {contractDraft ? (
                      <DraftContractTable
                        terms={contractDraft}
                        onChange={setContractDraft}
                        isLocked={isContractLocked}
                        buyerName={
                          activeNego?.contract?.nguoi_mua?.ten_hien_thi ||
                          contractDraft?.buyerSignature?.name ||
                          (activeNego?.contract?.vi_nguoi_mua === user?.dia_chi_vi ? user?.ten_hien_thi : 'Thương lái')
                        }
                        sellerName={
                          activeNego?.contract?.nguoi_ban?.ten_hien_thi ||
                          contractDraft?.sellerSignature?.name ||
                          (activeNego?.contract?.vi_nguoi_ban === user?.dia_chi_vi ? user?.ten_hien_thi : 'Nông dân')
                        }
                        buyerSignature={contractDraft?.buyerSignature || activeNego?.contract?.noi_dung_nhap_ai?.buyerSignature || null}
                        sellerSignature={contractDraft?.sellerSignature || activeNego?.contract?.noi_dung_nhap_ai?.sellerSignature || null}
                      />
                    ) : (
                      <div className="flex justify-center items-center h-full text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    )}
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
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5 select-all">UUID: {nego.id}</p>
                          <p className="text-sm font-medium mt-1">
                            {nego.deliveryStatus === 'dang_van_chuyen' ? (
                              <span className="text-amber-600 flex items-center gap-1.5"><Truck size={14} /> Đang vận chuyển</span>
                            ) : nego.deliveryStatus === 'cho_nghiem_thu' ? (
                              <span className="text-indigo-600 flex items-center gap-1.5"><PackageCheck size={14} /> Hàng đã tới - Chờ kiểm tra</span>
                            ) : (
                              <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={14} /> Đã hoàn tất thanh toán</span>
                            )}
                          </p>
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
                  <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50/60 to-green-50/30 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 flex-shrink-0">
                        <FileText size={18} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Hồ sơ nghiệm thu trực tuyến</h5>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold text-[11px] text-emerald-700 bg-emerald-100/50 px-1.5 py-0.5 rounded select-all">{activeDeliveryId}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activeDeliveryId || '');
                              alert('Đã sao chép mã UUID hợp đồng!');
                            }}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold transition-all cursor-pointer shadow-sm active:scale-95 border-none"
                            type="button"
                          >
                            Sao chép
                          </button>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/contract/${activeDeliveryId}`}
                      target="_blank"
                      className="w-full sm:w-auto px-4.5 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-97 text-center flex items-center justify-center gap-1 cursor-pointer border border-transparent"
                    >
                      <span>Xem chi tiết</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl text-center">
                    <h4 className="text-indigo-900 font-extrabold text-xs uppercase tracking-wider">Kiểm tra chất lượng hàng hóa</h4>
                    <p className="text-[11px] text-indigo-700 mt-1">Hàng hóa có đúng cam kết trong Hợp đồng không?</p>
                  </div>

                  {isNongDan ? (
                    <div className="p-6 bg-white border border-slate-200 rounded-2xl text-center space-y-2">
                      <PackageCheck size={32} className="mx-auto text-indigo-400 animate-pulse" />
                      <p className="text-slate-700 font-bold text-sm">Hàng đã tới nơi. Đang chờ Thương lái nghiệm thu...</p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Thương lái sẽ tiến hành kiểm nghiệm thực tế và chọn xác nhận giải ngân 100% hoặc báo cáo lỗi nếu có hao hụt/sai sót.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Link
                        href={`/contract/${activeDeliveryId}?action=confirm`}
                        className="p-6 bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group active:scale-98 shadow-sm hover:shadow-md cursor-pointer text-center"
                      >
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-105 transition-transform border border-emerald-100">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-emerald-900 text-sm uppercase tracking-wider">Đạt Chuẩn</h4>
                          <p className="text-[11px] text-emerald-700 mt-1">Giải ngân 100% cho Nông dân</p>
                        </div>
                      </Link>

                      <Link
                        href={`/contract/${activeDeliveryId}?action=dispute`}
                        className="p-6 bg-rose-50/60 hover:bg-rose-50 border border-rose-200 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group active:scale-98 shadow-sm hover:shadow-md cursor-pointer text-center"
                      >
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-rose-600 shadow-sm group-hover:scale-105 transition-transform border border-rose-100">
                          <AlertTriangle size={24} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-rose-900 text-sm uppercase tracking-wider">Hàng Có Lỗi</h4>
                          <p className="text-[11px] text-rose-700 mt-1">Báo cáo để AI phân xử phạt</p>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </main>
      )}

      {/* MODAL TRỌNG TÀI AI */}
      {isDisputeModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scaleUp">
            <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2"><Scale size={18} /> Hệ Thống Phân Xử Kỹ Thuật Số</h3>
              <button onClick={() => setIsDisputeModalOpen(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Timeline Progress */}
              <div className="flex items-center justify-between mb-8 px-4 relative">
                <div className="absolute left-8 right-8 top-5 h-0.5 bg-slate-100 -z-10"></div>
                <div className="absolute left-8 right-8 top-5 h-0.5 bg-indigo-500 -z-10 transition-all duration-500" style={{ width: `${(disputeStage / 3) * 100}%` }}></div>

                <div className={`flex flex-col items-center gap-2 ${disputeStage >= 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 bg-white ${disputeStage >= 0 ? 'border-indigo-600' : 'border-slate-200'}`}>1</div>
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Tạo Báo Cáo</span>
                </div>
                <div className={`flex flex-col items-center gap-2 ${disputeStage >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 bg-white ${disputeStage >= 1 ? 'border-indigo-600' : 'border-slate-200'}`}>2</div>
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Xác Nhận</span>
                </div>
                <div className={`flex flex-col items-center gap-2 ${disputeStage >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 bg-white ${disputeStage >= 2 ? 'border-indigo-600' : 'border-slate-200'}`}>3</div>
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Trọng Tài AI</span>
                </div>
                <div className={`flex flex-col items-center gap-2 ${disputeStage >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 bg-white ${disputeStage >= 3 ? 'border-indigo-600' : 'border-slate-200'}`}>4</div>
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Thực Thi SC</span>
                </div>
              </div>

              {disputeStage === 0 && (
                <div className="animate-fade-in-up">
                  {isNongDan ? (
                    <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200 relative">
                      <AlertTriangle size={32} className="mx-auto mb-3 text-slate-400" />
                      <p className="font-bold text-slate-700">Thương lái đang điền Báo cáo Khiếu nại Chất lượng.</p>
                      <p className="text-sm text-slate-500 mt-2">Vui lòng chờ Thương lái gửi báo cáo lên hệ thống để bạn xác nhận.</p>
                      <button onClick={() => {
                        handleDisputeSubmitted({
                          id: 'mock-report-demo',
                          id_hop_dong: activeDeliveryId || 'demo',
                          so_luong_thuc_nhan: 1800,
                          ghi_chu_chat_luong: "Hàng bị ướt, hạt đen vỡ vượt quá 5% (tầm 8%). Độ ẩm cao.",
                          danh_sach_url_anh: [],
                          ty_le_giai_ngan_ai_de_xuat: 0.98,
                          so_tien_giai_ngan_de_xuat: 1764,
                          so_tien_hoan_lai_de_xuat: 36,
                          nguoi_ban_da_duyet: false,
                          nguoi_mua_dong_y: false,
                          nguoi_ban_dong_y: false,
                          trang_thai: 'moi_gui',
                          ngay_tao: new Date().toISOString()
                        });
                      }} className="absolute top-2 right-2 text-[10px] text-slate-300 hover:text-slate-500 underline">Demo: TL gửi báo cáo</button>
                    </div>
                  ) : (
                    <DisputeReportForm
                      contract={negotiations.find(n => n.id === activeDeliveryId)!}
                      onSubmitted={handleDisputeSubmitted}
                    />
                  )}
                </div>
              )}

              {disputeStage === 1 && disputeReport && (
                <div className="animate-fade-in-up bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-5">
                  <div className="text-center">
                    <h3 className="font-extrabold text-neutral-800 text-xs uppercase tracking-wider">Chờ Nông dân xác nhận báo cáo</h3>
                    <p className="text-[11px] text-neutral-450 mt-1">Thương lái đã gửi khiếu nại. Nông dân cần xác nhận tình trạng thực tế để AI phân xử.</p>
                  </div>

                  <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 space-y-3 text-sm">
                    <div className="flex justify-between border-b border-neutral-200 pb-2">
                      <span className="text-neutral-500 font-medium">Số lượng thực nhận:</span>
                      <span className="font-bold text-neutral-900">{disputeReport.so_luong_thuc_nhan} kg</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-medium block mb-1">Chi tiết lỗi:</span>
                      <p className="text-neutral-800 bg-white p-3 border border-neutral-200 rounded-lg">{disputeReport.ghi_chu_chat_luong}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setIsDisputeModalOpen(false)} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-sm transition-colors">
                      Đóng
                    </button>
                    {isNongDan ? (
                      <button onClick={handleSellerConfirmReport} className="flex-1 py-3 bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded-xl text-sm shadow-md transition-colors">
                        Nông Dân Xác Nhận
                      </button>
                    ) : (
                      <button disabled className="flex-1 py-3 bg-slate-100 text-slate-400 font-bold rounded-xl text-sm cursor-not-allowed">
                        Đang chờ Nông dân xác nhận
                      </button>
                    )}
                  </div>
                </div>
              )}

              {disputeStage === 2 && (
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

              {disputeStage === 3 && disputeReport && (
                <div className="space-y-5 animate-fade-in-up">

                  <SettlementProposal
                    proposedRatio={disputeReport.ty_le_giai_ngan_ai_de_xuat || 1}
                    payoutAmount={disputeReport.so_tien_giai_ngan_de_xuat || 0}
                    refundAmount={disputeReport.so_tien_hoan_lai_de_xuat || 0}
                    note={disputeReport.ghi_chu_chat_luong || 'Dựa trên hình ảnh và tỉ lệ lỗi được báo cáo.'}
                  />

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

      {/* TOAST NOTIFICATION CHO NÔNG DÂN */}
      {toastMsg && (
        <div
          onClick={() => {
            if (toastMsg.negoId) {
              const encoded = encodeMeetingParams({
                channel: toastMsg.negoId,
                scenario: 'A',
                product: 'Nông sản',
                partner: 'Thương lái'
              });
              router.push(`/call?p=${encoded}`);
            }
            setToastMsg(null);
          }}
          className={`fixed bottom-10 right-6 z-[9999] bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-fade-in-up ${toastMsg.negoId ? 'cursor-pointer hover:bg-emerald-700 transition-all' : ''}`}
        >
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <MessageSquare size={20} className="text-white" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Yêu cầu Đàm phán mới!</h4>
            <p className="text-xs text-emerald-100 mt-0.5">{toastMsg.text}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setToastMsg(null); }} className="ml-4 text-emerald-200 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center bg-white text-neutral-400 min-h-screen gap-2">
        <span className="text-sm font-semibold">Đang tải ứng dụng...</span>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
