'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ConnectWalletButton from '../components/shared/ConnectWalletButton';
import WalletBalance from '../components/shared/WalletBalance';
import VideoCallFrame from '../components/shared/VideoCallFrame';
import { useAuth } from '../hooks/useAuth';
import DraftContractTable from '../components/negotiation/DraftContractTable';
import { getFarmerProducts, getFarmerProductsByWallet } from '../lib/supabase/queries/listings';
import { getAllFarmerProfiles } from '../lib/supabase/queries/auth';
import { createDraftContract, updateContractStatus } from '../lib/supabase/queries/contracts';
import { getRequestsForFarmer, getRequestsForTrader, createContactRequest, acceptRequest, rejectRequest } from '../lib/supabase/queries/contactRequests';
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
  X,
  User,
  Award
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

  // --- TAB 1 STATE (Farmer listings & Contact Requests) ---
  const [farmerProfiles, setFarmerProfiles] = useState<any[]>([]);
  const [contactRequests, setContactRequests] = useState<any[]>([]);
  const [showFarmerModal, setShowFarmerModal] = useState<any>(null);
  const [selectedFarmerProducts, setSelectedFarmerProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [contactNote, setContactNote] = useState('');

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

  const loadTab1Data = async () => {
    if (!user) return;
    try {
      if (user.vai_tro === 'thuong_lai') {
        const profiles = await getAllFarmerProfiles();
        setFarmerProfiles(profiles || []);
        const reqs = await getRequestsForTrader(user.dia_chi_vi);
        setContactRequests(reqs || []);
      } else {
        const reqs = await getRequestsForFarmer(user.dia_chi_vi);
        setContactRequests(reqs || []);
      }
    } catch (err) {
      console.error('Error loading tab 1 data:', err);
    }
  };

  useEffect(() => {
    loadTab1Data();
  }, [user]);

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
              status: c.trang_thai === 'du_thao'
                ? (c.noi_dung_nhap_ai?.is_seller_online === true && c.noi_dung_nhap_ai?.is_buyer_online === true
                    ? 'dang_dam_phan'
                    : (c.noi_dung_nhap_ai?.is_seller_online === true || c.noi_dung_nhap_ai?.is_buyer_online === true
                        ? 'dang_lien_he'
                        : (c.don_gia > 0 || (c.dieu_khoan_chat_luong && c.dieu_khoan_chat_luong.length > 0) || c.noi_dung_nhap_ai?.buyerSignature || c.noi_dung_nhap_ai?.sellerSignature ? 'da_chot_nhap_tam_dung' : 'dam_phan_tam_dung')))
                : 'da_chot',
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
  const handleContactNegotiation = async (req: any) => {
    try {
      const soLuongSo = parseFloat(req.san_pham?.so_luong || '1') || 0;
      const donVi = req.san_pham?.don_vi_tinh || 'kg';

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
      const sellerWallet = req.vi_nong_dan || 'nong_dan_wallet_address_demo';
      const { error: upsertErr2 } = await supabase.from('nguoi_dung').insert({
        dia_chi_vi: sellerWallet,
        vai_tro: 'nong_dan',
        ten_dang_nhap: `seller_${sellerWallet.slice(0, 6)}_${Date.now()}`,
        mat_khau: '123456',
        ten_hien_thi: req.nong_dan?.ten_hien_thi || 'Nhà vườn (Khách)'
      });
      if (upsertErr2 && upsertErr2.code !== '23505') {
        console.error("Insert seller failed:", upsertErr2);
      }
      // -----------------------------------------------------------------------------------

      const dbContract = await createDraftContract({
        vi_nguoi_ban: user.dia_chi_vi, // Nông dân tạo phòng
        vi_nguoi_mua: req.vi_thuong_lai,
        san_pham: req.san_pham?.ten_san_pham || 'Nông sản',
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
        product: req.san_pham?.ten_san_pham || 'Nông sản',
        partner: req.thuong_lai?.ten_hien_thi || 'Thương lái'
      });
      router.push(`/call?p=${encoded}`);
    } catch (err) {
      console.error("Lỗi khởi tạo phòng đàm phán:", err);
      alert("Không thể khởi tạo phòng đàm phán. Vui lòng thử lại!");
    }
  };

  const handleAcceptRequest = async (req: any) => {
    try {
      await acceptRequest(req.id);
      alert('Đã chấp nhận liên hệ! Hệ thống sẽ chuyển sang tạo phòng đàm phán.');
      await handleContactNegotiation(req);
    } catch (e) {
      console.error(e);
      alert('Lỗi khi chấp nhận');
    }
  };

  const handleRejectRequest = async (id: string) => {
    await rejectRequest(id);
    loadTab1Data();
  };

  const openFarmerModal = async (farmer: any) => {
    setShowFarmerModal(farmer);
    setSelectedProductId(null);
    setSelectedFarmerProducts([]);
    try {
      const prods = await getFarmerProductsByWallet(farmer.dia_chi_vi);
      setSelectedFarmerProducts(prods || []);
    } catch(e) {
      console.error(e);
    }
  };

  const submitContactRequest = async () => {
    if (!showFarmerModal) return;
    try {
      const sp = selectedProductId ? selectedFarmerProducts.find(p => p.id === selectedProductId) : null;
      await createContactRequest({
        vi_thuong_lai: user.dia_chi_vi,
        vi_nong_dan: showFarmerModal.dia_chi_vi,
        id_san_pham: sp ? sp.id : undefined,
        ten_san_pham_snapshot: sp ? sp.ten_san_pham : 'Liên hệ chung',
        loi_nhan: contactNote,
        loai_lien_he: 'hen_lich'
      });
      setShowFarmerModal(null);
      setContactNote('');
      loadTab1Data();
      alert('Gửi yêu cầu liên hệ thành công! Vui lòng chờ Nông dân phản hồi.');
    } catch (e: any) {
      console.error(e);
      alert('Lỗi khi gửi yêu cầu liên hệ: ' + (e.message || JSON.stringify(e)));
    }
  };

  const openNegotiation = (nego: any) => {
    if (nego.status === 'da_chot') {
      router.push(`/contract/${nego.id}`);
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
            <ShoppingBag size={16} /> Kết nối Đối tác
          </button>
          <button onClick={() => { setActiveTab('negotiation'); setActiveNegotiationId(null); setActiveDeliveryId(null); }} className={`px-5 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'negotiation' ? 'border-[#15803D] text-[#15803D]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <MessageSquare size={16} /> Đàm phán & Hợp đồng
          </button>
          <button onClick={() => { setActiveTab('delivery'); setActiveNegotiationId(null); setActiveDeliveryId(null); }} className={`px-5 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'delivery' ? 'border-[#15803D] text-[#15803D]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Truck size={16} /> Giao nhận & Thanh toán
          </button>
        </div>
      </header>

      {/* 🟢 TAB 1: KẾT NỐI ĐỐI TÁC */}
      {activeTab === 'market' && (
        <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8 animate-fade-in-up">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Kết nối Đối tác</h1>
              <p className="text-sm text-slate-500 mt-1">
                {isNongDan 
                  ? 'Quản lý các yêu cầu liên hệ từ Thương lái quan tâm đến sản phẩm của bạn.' 
                  : 'Khám phá Nông dân và sản phẩm của họ. Gửi yêu cầu liên hệ để bắt đầu đàm phán.'}
              </p>
            </div>
            {isNongDan && (
              <Link href="/profile" className="px-5 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-md">
                Cập nhật Nông sản (Profile)
              </Link>
            )}
          </div>

          {isNongDan ? (
            /* DANH SÁCH YÊU CẦU LIÊN HỆ ĐẾN NÔNG DÂN */
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-slate-900 mb-4">Yêu cầu liên hệ ({contactRequests.length})</h3>
              {contactRequests.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 text-slate-500">
                  Chưa có yêu cầu liên hệ nào.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contactRequests.map(req => (
                    <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {req.thuong_lai?.anh_dai_dien ? (
                            <img src={req.thuong_lai.anh_dai_dien} alt={req.thuong_lai.ten_hien_thi} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-sm">
                              {(req.thuong_lai?.ten_hien_thi || 'T')[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-900 text-sm truncate">{req.thuong_lai?.ten_hien_thi || 'Thương lái'}</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Ví: {req.vi_thuong_lai.slice(0,5)}...{req.vi_thuong_lai.slice(-4)}</p>
                          </div>
                        </div>
                        {req.trang_thai === 'cho_phan_hoi' && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-blue-200 animate-pulse whitespace-nowrap shrink-0">Chờ phản hồi</span>}
                        {req.trang_thai === 'da_dong_y' && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-emerald-200 whitespace-nowrap shrink-0">Đã đồng ý</span>}
                        {req.trang_thai === 'tu_choi' && <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-rose-200 whitespace-nowrap shrink-0">Đã từ chối</span>}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100 flex-1 space-y-2 text-xs">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quan tâm:</span>
                          <span className="font-black text-[#15803D] truncate">{req.ten_san_pham_snapshot || req.san_pham?.ten_san_pham || 'Liên hệ chung'}</span>
                        </div>
                        
                        {/* Thông tin doanh nghiệp của Thương lái - Dạng bảng/inline gọn gàng */}
                        {req.thuong_lai && (req.thuong_lai.ten_cong_ty || req.thuong_lai.so_dien_thoai || req.thuong_lai.ho_ten) && (
                          <div className="pt-2 border-t border-slate-200/60 space-y-1 text-slate-500">
                            {req.thuong_lai.ho_ten && (
                              <p className="flex justify-between gap-2"><strong className="text-slate-650">Đại diện:</strong> <span className="text-slate-800 text-right truncate font-medium">{req.thuong_lai.ho_ten}</span></p>
                            )}
                            {req.thuong_lai.ten_cong_ty && (
                              <p className="flex justify-between gap-2"><strong className="text-slate-650">Công ty:</strong> <span className="text-slate-800 text-right truncate font-medium">{req.thuong_lai.ten_cong_ty}</span></p>
                            )}
                            {req.thuong_lai.so_dien_thoai && (
                              <p className="flex justify-between gap-2"><strong className="text-slate-650">SĐT:</strong> <span className="text-slate-800 font-mono font-medium">{req.thuong_lai.so_dien_thoai}</span></p>
                            )}
                            {req.thuong_lai.dia_chi && (
                              <p className="flex justify-between gap-2"><strong className="text-slate-650">Địa chỉ:</strong> <span className="text-slate-850 text-right truncate font-medium">{req.thuong_lai.dia_chi}</span></p>
                            )}
                          </div>
                        )}

                        {/* Lời nhắn / Ghi chú dạng khối nhỏ gọn */}
                        {req.loi_nhan && (
                          <div className="pt-2 border-t border-slate-200/60">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Lời nhắn:</p>
                            <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100 leading-relaxed">
                              "{req.loi_nhan}"
                            </p>
                          </div>
                        )}
                      </div>

                      {req.trang_thai === 'cho_phan_hoi' && (
                        <div className="flex gap-2 mt-auto">
                          <button onClick={() => handleRejectRequest(req.id)} className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors">
                            Từ chối
                          </button>
                          <button onClick={() => handleAcceptRequest(req)} className="flex-1 py-2 bg-[#15803D] hover:bg-[#166534] text-white rounded-xl text-xs font-bold transition-colors shadow-sm">
                            Đồng ý
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* DANH SÁCH SẢN PHẨM / NÔNG DÂN CHO THƯƠNG LÁI */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {farmerProfiles.map(farmer => {
                  const hasRequested = contactRequests.some(r => r.vi_nong_dan === farmer.dia_chi_vi && r.trang_thai !== 'tu_choi');
                  const requestStatus = contactRequests.find(r => r.vi_nong_dan === farmer.dia_chi_vi)?.trang_thai;
                  
                  return (
                    <div key={farmer.dia_chi_vi} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                      {/* Ảnh vườn ruộng (Sử dụng anh_bia thật sự của Nông dân, có fallback) */}
                      <div className="h-32 bg-slate-200 relative">
                        <img 
                          src={farmer.anh_bia || `https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`} 
                          alt="Farm Cover" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm text-slate-800 text-[11px] font-bold uppercase rounded-full flex items-center gap-1.5 shadow-sm">
                          <MapPin size={12} className="text-[#15803D]" /> {farmer.khu_vuc || 'Việt Nam'}
                        </div>
                      </div>

                      <div className="p-5 flex-1 -mt-6 relative">
                        {/* Ảnh Đại Diện tròn thật sự của Nông dân */}
                        <div className="bg-white rounded-full p-1 inline-block border-2 border-white shadow-sm mb-2">
                          {farmer.anh_dai_dien ? (
                            <img src={farmer.anh_dai_dien} alt={farmer.ten_hien_thi} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-[#15803D] rounded-full flex items-center justify-center text-white font-bold">
                              {(farmer.ten_hien_thi || farmer.ho_ten || 'A')[0]}
                            </div>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">{farmer.ten_hien_thi || farmer.ten_nong_trai || 'Nhà Nông'}</h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">{farmer.ho_ten}</p>
                        
                        <div className="mt-3 space-y-2">
                          {farmer.san_pham_chinh && (
                            <p className="text-xs text-slate-600 flex items-start gap-2">
                              <ShoppingBag size={14} className="text-[#15803D] flex-shrink-0 mt-0.5" />
                              <span>Sản phẩm chính: <strong>{farmer.san_pham_chinh}</strong></span>
                            </p>
                          )}
                          {(farmer.dien_tich || farmer.kinh_nghiem) && (
                            <p className="text-xs text-slate-600 flex items-start gap-2">
                              <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span>
                                {farmer.dien_tich && `Quy mô: ${farmer.dien_tich}`}
                                {farmer.dien_tich && farmer.kinh_nghiem && ' • '}
                                {farmer.kinh_nghiem && `Kinh nghiệm: ${farmer.kinh_nghiem}`}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100">
                        {hasRequested ? (
                          <div className="w-full py-2.5 bg-slate-200 text-slate-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-default">
                            {requestStatus === 'cho_phan_hoi' ? '⏳ Đã gửi yêu cầu' : '✅ Đã được chấp nhận'}
                          </div>
                        ) : (
                          <button
                            onClick={() => openFarmerModal(farmer)}
                            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                          >
                            <MessageSquare size={16} /> Xem Hồ Sơ & Liên hệ
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Chi tiết Hồ sơ Nông Dân */}
              {showFarmerModal && (
                <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-scaleUp flex flex-col md:flex-row">
                    
                    {/* Cột trái: Hình ảnh & Thông tin thiết kế đồng bộ đẹp */}
                    <div className="w-full md:w-5/12 bg-slate-50 border-r border-slate-100 flex flex-col">
                      <div className="h-40 relative">
                        <img 
                          src={showFarmerModal.anh_bia || `https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`} 
                          alt="Farm Cover" 
                          className="w-full h-full object-cover"
                        />
                        <button onClick={() => setShowFarmerModal(null)} className="md:hidden absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full"><X size={16} /></button>
                      </div>

                      {/* Avatar container overlapping in modal */}
                      <div className="px-6 -mt-8 relative z-10 flex flex-col">
                        <div className="bg-white rounded-full p-1 inline-block border-2 border-white shadow-md self-start">
                          {showFarmerModal.anh_dai_dien ? (
                            <img src={showFarmerModal.anh_dai_dien} alt={showFarmerModal.ten_hien_thi} className="w-16 h-16 rounded-full object-cover" />
                          ) : (
                            <div className="w-16 h-16 bg-[#15803D] rounded-full flex items-center justify-center text-white font-black text-xl">
                              {(showFarmerModal.ten_hien_thi || showFarmerModal.ho_ten || 'A')[0]}
                            </div>
                          )}
                        </div>
                        
                        <h3 className="font-black text-xl text-slate-900 mt-3">{showFarmerModal.ten_hien_thi}</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md self-start mt-1.5">
                          {showFarmerModal.vai_tro === 'nong_dan' ? 'Nông dân' : 'Thương lái'}
                        </p>
                        <p className="text-sm font-semibold text-[#15803D] mt-2 flex items-center gap-1">
                          <MapPin size={14} /> {showFarmerModal.khu_vuc || 'Việt Nam'}
                        </p>
                        
                        <div className="space-y-3 mt-4 pt-4 border-t border-slate-200/80 mb-6 text-sm">
                          <div className="flex items-center gap-3 text-slate-650">
                            <User size={16} className="text-slate-400 shrink-0" />
                            <span>Đại diện: <strong>{showFarmerModal.ho_ten}</strong></span>
                          </div>
                          {showFarmerModal.dien_tich && (
                            <div className="flex items-center gap-3 text-slate-650">
                              <ShieldCheck size={16} className="text-slate-400 shrink-0" />
                              <span>Quy mô: <strong>{showFarmerModal.dien_tich}</strong></span>
                            </div>
                          )}
                          {showFarmerModal.chung_nhan && (
                            <div className="flex items-center gap-3 text-slate-650">
                              <Award size={16} className="text-emerald-500 shrink-0" />
                              <span>Chứng nhận: <strong className="text-emerald-700">{showFarmerModal.chung_nhan}</strong></span>
                            </div>
                          )}
                          {showFarmerModal.kinh_nghiem && (
                            <div className="flex items-center gap-3 text-slate-650">
                              <ShieldCheck size={16} className="text-slate-400 shrink-0" />
                              <span>Kinh nghiệm: <strong>{showFarmerModal.kinh_nghiem}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cột phải: Sản phẩm & Liên hệ */}
                    <div className="w-full md:w-7/12 p-6 flex flex-col h-full max-h-[90vh]">
                      <div className="flex justify-between items-center mb-4 hidden md:flex">
                        <h3 className="font-bold text-lg text-slate-900">Danh sách Nông sản</h3>
                        <button onClick={() => setShowFarmerModal(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-2"><X size={16} /></button>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-6">
                        {selectedFarmerProducts.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                            Chưa có sản phẩm nào được đăng tải.
                          </div>
                        ) : (
                          selectedFarmerProducts.map(p => (
                            <div 
                              key={p.id} 
                              onClick={() => {
                                setSelectedProductId(p.id);
                                setContactNote(`Chào anh/chị, tôi là thương lái quan tâm tới sản phẩm ${p.ten_san_pham} của anh/chị và muốn liên hệ trao đổi chi tiết về giao dịch này.`);
                              }}
                              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex gap-3 items-center ${selectedProductId === p.id ? 'border-[#15803D] bg-[#f0fdf4] shadow-sm' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'}`}
                            >
                              {p.hinh_anh && p.hinh_anh.length > 0 ? (
                                <img src={p.hinh_anh[0]} alt={p.ten_san_pham} className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0" />
                              ) : (
                                <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                                  <ShoppingBag size={20} />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start gap-2">
                                  <h4 className="font-bold text-slate-900 text-sm truncate">{p.ten_san_pham}</h4>
                                  <span className="text-[10px] font-bold text-[#15803D] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0">{p.so_luong_uoc_tinh}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  {p.gia_tham_khao ? (
                                    <p className="text-xs font-extrabold text-[#15803D]">{p.gia_tham_khao}</p>
                                  ) : (
                                    <p className="text-[11px] text-slate-400 italic">Giá thương lượng</p>
                                  )}
                                  {p.mua_vu && (
                                    <p className="text-[10px] text-slate-500 font-medium">Vụ: {p.mua_vu}</p>
                                  )}
                                </div>
                                {p.mo_ta && <p className="text-[11px] text-slate-450 truncate mt-1">{p.mo_ta}</p>}
                              </div>
                            </div>
                          ))
                        )}
                        <div 
                          onClick={() => {
                            setSelectedProductId(null);
                            setContactNote('');
                          }}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center text-center ${selectedProductId === null && selectedFarmerProducts.length > 0 ? 'border-[#15803D] bg-[#f0fdf4] shadow-sm' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'}`}
                        >
                          <span className="text-xs font-bold text-slate-600">Tôi muốn liên hệ chung (không chọn SP cụ thể)</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lời nhắn / Đề xuất (Tuỳ chọn)</label>
                        <textarea
                          rows={2}
                          className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-[#15803D] focus:ring-1 focus:ring-[#15803D] outline-none resize-none"
                          placeholder="Xin chào, tôi muốn đàm phán mua lô hàng của bạn..."
                          value={contactNote}
                          onChange={(e) => setContactNote(e.target.value)}
                        />
                        <button 
                          onClick={submitContactRequest} 
                          className="w-full mt-3 py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          <MessageSquare size={18} /> Gửi Yêu Cầu Liên Hệ
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </>
          )}
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
                      {nego.status === 'da_chot' ? (
                        <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-200">Đã Chốt & Khóa</span>
                      ) : nego.status === 'dang_dam_phan' ? (
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-200 animate-pulse">Đang Đàm phán...</span>
                      ) : nego.status === 'dang_lien_he' ? (
                        <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-xs font-bold border border-amber-200 animate-pulse">Đang Liên hệ...</span>
                      ) : nego.status === 'da_chot_nhap_tam_dung' ? (
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold border border-blue-200">Đã chốt nháp (Tạm dừng)</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold border border-slate-300">Đàm phán tạm dừng</span>
                      )}
                      <ChevronRight size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            negotiations.find(n => n.id === activeNegotiationId)?.status === 'dam_phan_tam_dung' ||
            negotiations.find(n => n.id === activeNegotiationId)?.status === 'da_chot_nhap_tam_dung' ||
            negotiations.find(n => n.id === activeNegotiationId)?.status === 'dang_lien_he' ||
            negotiations.find(n => n.id === activeNegotiationId)?.status === 'dang_dam_phan'
          ) ? (
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
