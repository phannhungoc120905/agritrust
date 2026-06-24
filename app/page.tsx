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
import { getRequestsForFarmer, getRequestsForTrader, createContactRequest, acceptRequest, rejectRequest, connectRequest } from '../lib/supabase/queries/contactRequests';
import { supabase } from '../lib/supabase/client';
import { encodeMeetingParams } from '../lib/utils/url';
import { useLanguage, type Language } from '../lib/useLanguage';
import {
  ShoppingBag,
  FileSignature,
  Truck,
  ChevronRight,
  ChevronDown,
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
  Award,
  Search,
  Bell,
  Heart,
  Map,
  Grid,
  List,
  Languages
} from 'lucide-react';

import DisputeReportForm from '../components/dispute/DisputeReportForm';
import SettlementProposal from '../components/dispute/SettlementProposal';
import { DisputeReport } from '../types/disputeReport';

const UI_TEXT = {
  vi: {
    tagline: 'Nền tảng nông nghiệp tin cậy',
    notifications: 'Thông báo mới',
    markAllRead: 'Đánh dấu tất cả đã đọc',
    noNotifications: 'Chưa có thông báo mới nào.',
    profile: 'Hồ sơ',
    settings: 'Cài đặt',
    logout: 'Đăng xuất',
    farmer: 'Nông dân',
    trader: 'Thương lái',
    tabs: {
      market: 'Kết nối Đối tác',
      negotiation: 'Đàm phán & Hợp đồng',
      delivery: 'Giao nhận & Thanh toán',
      map: 'Bản đồ Nông trại'
    },
    marketTitle: 'Kết nối Đối tác',
    marketFarmerDesc: 'Quản lý các yêu cầu liên hệ từ Thương lái quan tâm đến sản phẩm của bạn.',
    marketTraderDesc: 'Khám phá Nông dân và sản phẩm của họ. Gửi yêu cầu liên hệ để bắt đầu đàm phán.',
    updateProducts: 'Cập nhật Nông sản (Profile)',
    requestStats: {
      new: 'yêu cầu mới',
      accepted: 'đã đồng ý',
      negotiating: 'đang đàm phán'
    },
    filters: {
      all: 'Tất cả',
      pending: 'Chờ phản hồi',
      accepted: 'Đã đồng ý',
      rejected: 'Đã từ chối'
    },
    emptyRequests: 'Chưa có yêu cầu liên hệ nào trong mục này.',
    searchFarmers: 'Tìm kiếm Nông dân hoặc Nông sản chính...',
    allRegions: 'Tất cả Vùng miền',
    allProducts: 'Tất cả Loại nông sản',
    mapTitle: 'Bản đồ Nông trại',
    mapDesc: 'Phân bố địa lý trực quan của các Nông trại và Nhà vườn trên bản đồ Việt Nam.',
    growerLocations: 'Vị trí Nhà vườn',
    growers: 'Nhà vườn',
    quickMapSearch: 'Tìm nhanh nhà vườn, tỉnh thành...',
    product: 'Sản phẩm',
    notUpdated: 'Chưa cập nhật',
    zoomIn: 'Phóng to',
    zoomOut: 'Thu nhỏ',
    myLocation: 'Vị trí của tôi',
    myLocationTitle: 'Định vị vị trí của tôi',
    onboardingTitle: 'Hướng dẫn dùng AgriTrust',
    onboardingDone: 'Bắt đầu khám phá ngay!',
    negotiationTitle: 'Quản lý Đàm phán & Hợp đồng',
    lockedEscrowTotal: 'Tổng tiền quỹ đang khóa'
  },
  en: {
    tagline: 'Trusted agriculture platform',
    notifications: 'New notifications',
    markAllRead: 'Mark all as read',
    noNotifications: 'No new notifications.',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Log out',
    farmer: 'Farmer',
    trader: 'Trader',
    tabs: {
      market: 'Partner Network',
      negotiation: 'Negotiation & Contracts',
      delivery: 'Delivery & Payment',
      map: 'Farm Map'
    },
    marketTitle: 'Partner Network',
    marketFarmerDesc: 'Manage contact requests from traders interested in your products.',
    marketTraderDesc: 'Discover farmers and their products. Send a contact request to start negotiating.',
    updateProducts: 'Update Products (Profile)',
    requestStats: {
      new: 'new requests',
      accepted: 'accepted',
      negotiating: 'negotiating'
    },
    filters: {
      all: 'All',
      pending: 'Pending',
      accepted: 'Accepted',
      rejected: 'Rejected'
    },
    emptyRequests: 'No contact requests in this section yet.',
    searchFarmers: 'Search farmers or main products...',
    allRegions: 'All Regions',
    allProducts: 'All Product Types',
    mapTitle: 'Farm Map',
    mapDesc: 'A visual geographic view of farms and growers across Vietnam.',
    growerLocations: 'Grower Locations',
    growers: 'Growers',
    quickMapSearch: 'Quick search by grower or province...',
    product: 'Product',
    notUpdated: 'Not updated',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    myLocation: 'My location',
    myLocationTitle: 'Locate me',
    onboardingTitle: 'AgriTrust Guide',
    onboardingDone: 'Start exploring',
    negotiationTitle: 'Negotiation & Contract Management',
    lockedEscrowTotal: 'Total funds locked in escrow'
  }
};

const STATIC_UI_EN: Record<string, string> = {
  'Ví:': 'Wallet:',
  'Quan tâm đến:': 'Interested in:',
  'Đại diện:': 'Representative:',
  'Công ty:': 'Company:',
  'SĐT:': 'Phone:',
  'Địa chỉ:': 'Address:',
  'Lời nhắn:': 'Message:',
  'Chờ phản hồi': 'Pending',
  'Đã đồng ý': 'Accepted',
  'Đã hẹn lịch': 'Scheduled',
  'Đang đàm phán': 'Negotiating',
  'Đã từ chối': 'Rejected',
  'Từ chối': 'Reject',
  'Bắt đầu đàm phán': 'Start Negotiation',
  'Vào phòng đàm phán': 'Enter Negotiation Room',
  'Tất cả': 'All',
  'Đã khóa': 'Locked',
  'Hoàn thành': 'Completed',
  'Chỉ Yêu Thích': 'Favorites Only',
  'Đang áp dụng:': 'Active filters:',
  'Mục yêu thích': 'Favorites',
  'Xóa tất cả bộ lọc': 'Clear all filters',
  'Không tìm thấy nông dân nào phù hợp với bộ lọc.': 'No farmers match the current filters.',
  'Chưa có đánh giá': 'No reviews yet',
  'Đang chờ phản hồi': 'Pending response',
  'Đang chờ': 'Pending',
  'Liên hệ thêm SP mới': 'Contact for another product',
  'Xem Hồ Sơ & Liên hệ': 'View Profile & Contact',
  'Liên hệ': 'Contact',
  'Xem Hồ Sơ': 'View Profile',
  'Nông dân': 'Farmer',
  'Thương lái': 'Trader',
  'Quy mô:': 'Scale:',
  'Chứng nhận:': 'Certification:',
  'Kinh nghiệm:': 'Experience:',
  'Đánh giá:': 'Rating:',
  'Danh sách Nông sản': 'Product List',
  'Chưa có sản phẩm nào được đăng tải.': 'No products have been posted yet.',
  'Giá thương lượng': 'Negotiable price',
  'Liên hệ chung, không chọn sản phẩm cụ thể': 'General contact, no specific product selected',
  'Lời nhắn / Đề xuất (Tuỳ chọn)': 'Message / Proposal (Optional)',
  'Gửi Yêu Cầu Liên Hệ': 'Send Contact Request',
  'Số SOL đang bị khóa trong smart contract, sẽ giải phóng sau khi giao nhận xong': 'SOL locked in the smart contract will be released after delivery is completed',
  'Chưa có cuộc đàm phán hay hợp đồng nào được tạo.': 'No negotiations or contracts have been created yet.',
  'Đã chốt tất cả': 'All finalized',
  'Đã Chốt & Khóa': 'Finalized & Locked',
  'Đang Đàm phán...': 'Negotiating...',
  'Đang Liên hệ...': 'Contacting...',
  'Chốt nháp (Tạm dừng)': 'Draft finalized (Paused)',
  'Tạm dừng': 'Paused',
  'Gửi yêu cầu': 'Send Request',
  'Đàm phán': 'Negotiation',
  'Chốt & Khóa': 'Finalize & Lock',
  'Giao nhận': 'Delivery',
  'Tổng thương vụ': 'Total Deals',
  'Tổng giá trị VNĐ': 'Total VND Value',
  'Đang chờ xử lý': 'Pending',
  'Phòng Đàm Phán:': 'Negotiation Room:',
  'Thoát phòng': 'Leave Room',
  'Hợp đồng nháp đã sẵn sàng!': 'Draft contract is ready!',
  'AI đã tự động lập điều khoản nông sản và phạt chất lượng từ cuộc đàm thoại. Bấm để xem lại và ký quỹ.': 'AI generated agricultural terms and quality penalties from the conversation. Click to review and escrow.',
  'Lịch sử Đàm Phán': 'Negotiation History',
  'Đã kết thúc': 'Ended',
  'ĐÃ KHÓA TRÊN SOLANA': 'LOCKED ON SOLANA',
  'Theo dõi Giao Nhận': 'Delivery Tracking',
  'Chưa có hợp đồng nào đang giao hàng.': 'No contracts are currently in delivery.',
  'Đang vận chuyển': 'In Transit',
  'Hàng đã tới - Chờ kiểm tra': 'Arrived - Awaiting Inspection',
  'Đã hoàn tất thanh toán': 'Payment Completed',
  '100% Tiền Đã Khóa': '100% Funds Locked',
  'Quay lại danh sách': 'Back to List',
  'Kiểm tra Hàng hóa': 'Inspect Goods',
  'Xác nhận tình trạng lô hàng khi vận chuyển đến nơi.': 'Confirm the shipment condition when it arrives.',
  'Hồ sơ nghiệm thu trực tuyến': 'Online Inspection Record',
  'Sao chép': 'Copy',
  'Xem chi tiết': 'View Details',
  'Kiểm tra chất lượng hàng hóa': 'Goods Quality Check',
  'Hàng hóa có đúng cam kết trong Hợp đồng không?': 'Do the goods match the contract commitments?',
  'Hàng đã tới nơi. Đang chờ Thương lái nghiệm thu...': 'Goods have arrived. Waiting for trader inspection...',
  'Thương lái sẽ tiến hành kiểm nghiệm thực tế và chọn xác nhận giải ngân 100% hoặc báo cáo lỗi nếu có hao hụt/sai sót.': 'The trader will inspect the goods and either confirm 100% release or report issues if there are shortages/defects.',
  'Đạt Chuẩn': 'Passed',
  'Giải ngân 100% cho Nông dân': 'Release 100% to Farmer',
  'Hàng Có Lỗi': 'Issue Found',
  'Báo cáo để AI phân xử phạt': 'Report for AI settlement',
  'Hệ Thống Phân Xử Kỹ Thuật Số': 'Digital Arbitration System',
  'Tạo Báo Cáo': 'Create Report',
  'Xác Nhận': 'Confirm',
  'Trọng Tài AI': 'AI Arbitration',
  'Thực Thi SC': 'Execute SC',
  'Thương lái đang điền Báo cáo Khiếu nại Chất lượng.': 'The trader is filling out the quality claim report.',
  'Vui lòng chờ Thương lái gửi báo cáo lên hệ thống để bạn xác nhận.': 'Please wait for the trader to submit the report for your confirmation.',
  'Demo: TL gửi báo cáo': 'Demo: Trader submits report',
  'Chờ Nông dân xác nhận báo cáo': 'Waiting for farmer report confirmation',
  'Thương lái đã gửi khiếu nại. Nông dân cần xác nhận tình trạng thực tế để AI phân xử.': 'The trader submitted a claim. The farmer must confirm the actual condition before AI arbitration.',
  'Số lượng thực nhận:': 'Actual quantity received:',
  'Chi tiết lỗi:': 'Issue details:',
  'Nông Dân Xác Nhận': 'Farmer Confirms',
  'Đang chờ Nông dân xác nhận': 'Waiting for farmer confirmation',
  'Hệ thống AI đang phân tích...': 'AI system is analyzing...',
  'Đang đối chiếu bằng chứng với các Điều khoản chất lượng đã ký quỹ trên Smart Contract.': 'Comparing evidence against the quality terms locked in the smart contract.',
  'YÊU CẦU 2 BÊN XÁC NHẬN ĐỂ THỰC THI SMART CONTRACT': 'BOTH PARTIES MUST CONFIRM TO EXECUTE THE SMART CONTRACT',
  'Nông dân Đồng ý': 'Farmer Agrees',
  'Thương lái Đồng ý': 'Trader Agrees',
  'Yêu cầu Đàm phán mới!': 'New Negotiation Request!',
  'Đang tải ứng dụng...': 'Loading app...'
};

const STATIC_UI_EN_PATTERNS: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^(.+) giao dịch$/, (match) => `${match[1]} transactions`],
  [/^Xem thêm Nông dân \((.+) còn lại\)$/, (match) => `View more farmers (${match[1]} remaining)`],
  [/^(.+) thương vụ$/, (match) => `${match[1]} deals`],
  [/^Đã chốt tất cả \((.+)\)$/, (match) => `All finalized (${match[1]})`],
  [/^Đang đàm phán \((.+)\)$/, (match) => `Negotiating (${match[1]})`],
  [/^Vụ: (.+)$/, (match) => `Season: ${match[1]}`],
  [/^Sản phẩm chính: (.+)$/, (match) => `Main product: ${match[1]}`],
  [/^Quy mô: (.+)$/, (match) => `Scale: ${match[1]}`],
  [/^Kinh nghiệm: (.+)$/, (match) => `Experience: ${match[1]}`],
  [/^Đánh giá: (.+)$/, (match) => `Rating: ${match[1]}`]
];

function translateStaticUiToEnglish(root: HTMLElement) {
  const preserveSelector = '[data-preserve-language="true"], input, textarea, script, style';
  const translateValue = (value: string) => {
    const trimmed = value.trim();
    const direct = STATIC_UI_EN[trimmed];
    if (direct) return value.replace(trimmed, direct);

    for (const [pattern, replacer] of STATIC_UI_EN_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) return value.replace(trimmed, replacer(match));
    }

    return value;
  };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  for (const node of textNodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest(preserveSelector)) continue;
    node.nodeValue = translateValue(node.nodeValue || '');
  }

  root.querySelectorAll<HTMLElement>('[placeholder], [title], [aria-label]').forEach((element) => {
    if (element.closest('[data-preserve-language="true"]')) return;
    for (const attribute of ['placeholder', 'title', 'aria-label']) {
      const current = element.getAttribute(attribute);
      if (current) element.setAttribute(attribute, translateValue(current));
    }
  });
}

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
  const [activeTab, setActiveTab] = useState<'market' | 'negotiation' | 'delivery' | 'map'>('market');
  const { language, setLanguage } = useLanguage();
  const [toastMsg, setToastMsg] = useState<{ text: string; negoId?: string } | null>(null);
  const uiRootRef = useRef<HTMLDivElement>(null);
  const text = UI_TEXT[language];

  useEffect(() => {
    if (language !== 'en' || !uiRootRef.current) return;
    requestAnimationFrame(() => {
      if (uiRootRef.current) translateStaticUiToEnglish(uiRootRef.current);
    });
  });

  // Contact Requests Filters & Helpers
  const [contactFilter, setContactFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  const getTraderRating = (wallet: string) => {
    const sum = wallet.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rating = 4.5 + (sum % 6) * 0.1;
    return rating.toFixed(1);
  };

  const getProductEmoji = (name: string) => {
    const lowercase = name.toLowerCase();
    if (lowercase.includes('xoài')) return '🥭';
    if (lowercase.includes('cà phê')) return '☕';
    if (lowercase.includes('lúa') || lowercase.includes('gạo')) return '🌾';
    if (lowercase.includes('sầu riêng')) return '🍈';
    if (lowercase.includes('mít')) return '🍍';
    return '🌿';
  };

  const getFilteredContactRequests = () => {
    return contactRequests.filter(req => {
      if (contactFilter === 'pending') {
        return req.trang_thai === 'cho_phan_hoi' || req.trang_thai === 'da_xem';
      }
      if (contactFilter === 'accepted') {
        return req.trang_thai === 'da_dong_y' || req.trang_thai === 'da_hen_lich' || req.trang_thai === 'da_ket_noi';
      }
      if (contactFilter === 'rejected') {
        return req.trang_thai === 'tu_choi';
      }
      return true; // all
    });
  };

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
  const [expandedPartners, setExpandedPartners] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('');

  // Bộ lọc & Tìm kiếm cho Tab 2 (Đàm phán & Hợp đồng)
  const [negoSearchQuery, setNegoSearchQuery] = useState('');
  const [negoStatusFilter, setNegoStatusFilter] = useState<'all' | 'negotiating' | 'locked' | 'completed'>('all');

  // Cải tiến bộ lọc, yêu thích, chế độ xem, phân trang, và onboarding
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'txCount'>('newest');
  const [visibleCount, setVisibleCount] = useState(6);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Bản đồ Leaflet Map refs và states
  const mapRef = useRef<any>(null);
  const leafletLoadedRef = useRef<boolean>(false);
  const markersRef = useRef<{ [key: string]: { marker: any; coords: [number, number] } }>({});
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [hoveredFarmerId, setHoveredFarmerId] = useState<string | null>(null);
  const [selectedMapFarmerId, setSelectedMapFarmerId] = useState<string | null>(null);

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
        // Lấy tất cả hợp đồng từ database để đếm số giao dịch thành công thực tế của từng nông dân
        const { data: contractsData } = await supabase
          .from('hop_dong')
          .select('vi_nguoi_ban, trang_thai');

        const enrichedProfiles = (profiles || []).map(p => {
          const txs = (contractsData || []).filter(c => c.vi_nguoi_ban === p.dia_chi_vi && (c.trang_thai === 'da_xac_nhan' || c.trang_thai === 'da_giai_quyet'));
          const txCount = txs.length;
          // Tính rating ổn định, đẹp dựa trên ví
          const walletSum = p.dia_chi_vi.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
          const rating = 4.5 + (walletSum % 6) * 0.1;
          
          return {
            ...p,
            txCount,
            rating: Number(rating.toFixed(1))
          };
        });

        setFarmerProfiles(enrichedProfiles);
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

  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      if (isNongDan) {
        // Lấy các yêu cầu liên hệ chưa phản hồi (Nông dân nhận)
        const { data, error } = await supabase
          .from('yeu_cau_lien_he')
          .select(`
            *,
            thuong_lai:nguoi_dung!yeu_cau_lien_he_vi_thuong_lai_fkey (ten_hien_thi, anh_dai_dien)
          `)
          .eq('vi_nong_dan', user.dia_chi_vi)
          .eq('trang_thai', 'cho_phan_hoi')
          .order('ngay_tao', { ascending: false });

        if (!error && data) {
          setUnreadNotifications(data.map(item => ({
            id: item.id,
            title: 'Yêu cầu liên hệ mới',
            desc: `Thương lái ${item.thuong_lai?.ten_hien_thi || 'Khách'} quan tâm đến ${item.ten_san_pham_snapshot || 'nông sản của bạn'}.`,
            time: new Date(item.ngay_tao),
            type: 'contact_req',
            raw: item
          })));
        }
      } else {
        // Lấy các yêu cầu đã được phản hồi (Thương lái nhận)
        const { data, error } = await supabase
          .from('yeu_cau_lien_he')
          .select(`
            *,
            nong_dan:nguoi_dung!yeu_cau_lien_he_vi_nong_dan_fkey (ten_hien_thi, anh_dai_dien)
          `)
          .eq('vi_thuong_lai', user.dia_chi_vi)
          .in('trang_thai', ['da_dong_y', 'tu_choi'])
          .order('ngay_phan_hoi', { ascending: false });

        if (!error && data) {
          setUnreadNotifications(data.map(item => ({
            id: item.id,
            title: item.trang_thai === 'da_dong_y' ? 'Đã chấp nhận liên hệ' : 'Yêu cầu bị từ chối',
            desc: `Nhà vườn ${item.nong_dan?.ten_hien_thi || 'Nông dân'} đã ${item.trang_thai === 'da_dong_y' ? 'đồng ý' : 'từ chối'} liên hệ thương vụ ${item.ten_san_pham_snapshot}.`,
            time: new Date(item.ngay_phan_hoi || item.ngay_tao),
            type: 'contact_res',
            raw: item
          })));
        }
      }
    } catch (e) {
      console.error('Error loading notifications:', e);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    setIsNotificationOpen(false);
    if (isNongDan && notif.type === 'contact_req') {
      setActiveTab('market');
      alert(`Yêu cầu từ: ${notif.raw.thuong_lai?.ten_hien_thi || 'Thương lái'}\nLời nhắn: "${notif.raw.loi_nhan || 'Không có'}"`);
    } else if (!isNongDan && notif.type === 'contact_res') {
      if (notif.raw.trang_thai === 'da_dong_y') {
        alert(`Bắt đầu đàm phán cuộc hẹn! Phòng room: ${notif.raw.room_id}`);
        if (notif.raw.room_id) {
          const encoded = encodeMeetingParams({
            channel: notif.raw.id_hop_dong || notif.raw.room_id,
            scenario: 'A',
            product: notif.raw.ten_san_pham_snapshot || 'Nông sản',
            partner: notif.raw.nong_dan?.ten_hien_thi || 'Nông dân'
          });
          router.push(`/call?p=${encoded}`);
        }
      } else {
        alert(`Yêu cầu liên hệ sản phẩm ${notif.raw.ten_san_pham_snapshot} bị từ chối.`);
      }
    }
  };

  useEffect(() => {
    loadTab1Data();
    loadNotifications();

    // Check onboarding
    const onboarded = localStorage.getItem('agritrust_onboarded');
    if (!onboarded) {
      setShowOnboarding(true);
    }

    // Load favorites
    if (user) {
      const stored = localStorage.getItem(`agritrust_favorites_${user.dia_chi_vi}`);
      if (stored) {
        setFavorites(JSON.parse(stored));
      } else {
        setFavorites([]);
      }
    }
  }, [user]);

  const toggleFavorite = (wallet: string) => {
    if (!user) return;
    const next = favorites.includes(wallet)
      ? favorites.filter(w => w !== wallet)
      : [...favorites, wallet];
    setFavorites(next);
    localStorage.setItem(`agritrust_favorites_${user.dia_chi_vi}`, JSON.stringify(next));
  };

  // Khởi tạo bản đồ Leaflet Map và các bộ xử lý tương tác trực quan
  useEffect(() => {
    if (activeTab !== 'map') {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    const initLeafletMap = () => {
      const L = (window as any).L;
      if (!L) return;

      const mapContainer = document.getElementById('agritrust-leaflet-map');
      if (!mapContainer) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Khởi tạo map tại Việt Nam center: [16.0, 108.0], zoom: 6
      const map = L.map('agritrust-leaflet-map', {
        zoomControl: false
      }).setView([16.0, 108.0], 6);

      // Sử dụng bản đồ nền nhẹ nhàng, trang lịch, thuần Việt (Carto Light) giúp nổi bật marker xanh (Feedback 7)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      mapRef.current = map;

      // Định vị base coords theo khu vực (Feedback 2)
      const getBaseCoords = (khuVuc: string): [number, number] => {
        let base: [number, number] = [10.54, 106.40]; // Long An default
        if (khuVuc?.includes('Tiền Giang')) {
          base = [10.35, 106.36];
        } else if (khuVuc?.includes('Đắk Lắk') || khuVuc?.includes('Tây Nguyên')) {
          base = [12.66, 108.05];
        }
        return base;
      };

      // Thiết lập hàm mở chi tiết hồ sơ nông dân cho các nút trong popup
      (window as any).agriTrustOpenFarmer = (walletAddress: string) => {
        const farmer = farmerProfiles.find(f => f.dia_chi_vi === walletAddress);
        if (farmer) openFarmerModal(farmer);
      };

      markersRef.current = {};

      // Nhóm nông dân có cùng tọa độ cơ bản để thực hiện clustering (Feedback 2)
      const groups: { [key: string]: typeof farmerProfiles } = {};
      farmerProfiles.forEach(farmer => {
        const base = getBaseCoords(farmer.khu_vuc);
        const key = `${base[0].toFixed(3)},${base[1].toFixed(3)}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(farmer);
      });

      // Tạo các marker trên bản đồ
      Object.entries(groups).forEach(([key, groupFarmers]) => {
        const coords = key.split(',').map(Number) as [number, number];

        if (groupFarmers.length === 1) {
          const farmer = groupFarmers[0];
          const avatarUrl = farmer.anh_dai_dien || `https://api.dicebear.com/7.x/micah/svg?seed=${farmer.ten_hien_thi}`;
          
          // Custom avatar marker tròn có viền xanh lá 3px dày dặn và shadow rõ nét (Feedback 2)
          const markerHtml = `
            <div class="relative w-10 h-10 rounded-full border-[3px] border-[#2e7d32] bg-white shadow-lg overflow-hidden hover:scale-110 active:scale-95 transition-all duration-200" id="marker-${farmer.dia_chi_vi}">
              <img src="${avatarUrl}" class="w-full h-full object-cover rounded-full" />
              <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white"></div>
            </div>
          `;

          const customIcon = L.divIcon({
            html: markerHtml,
            className: 'bg-transparent border-none', // Override default Leaflet style
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });

          const marker = L.marker(coords, { icon: customIcon }).addTo(map);

          // Tooltip nổi khi hover hiển thị thông tin nhanh (Feedback 2)
          marker.bindTooltip(`<strong>${farmer.ten_hien_thi}</strong><br/>🌿 ${farmer.san_pham_chinh || 'Nông sản'}`, {
            direction: 'top',
            offset: [0, -20],
            className: 'custom-leaflet-tooltip'
          });

          // Popup chi tiết bo góc 12px, shadow 0 4px 20px (Feedback 3)
          const popupContent = document.createElement('div');
          popupContent.className = 'p-3 w-[220px] text-slate-800 font-sans flex flex-col gap-2';
          popupContent.innerHTML = `
            <div class="flex items-center gap-3">
              <img src="${avatarUrl}" class="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" />
              <div class="min-w-0 flex-1">
                <h5 class="font-extrabold text-sm text-slate-900 truncate leading-tight">${farmer.ten_hien_thi}</h5>
                <p class="text-[9px] text-[#2e7d32] font-bold flex items-center gap-0.5 mt-0.5">
                  <span class="inline-block w-1.5 h-1.5 rounded-full bg-[#2e7d32]/25 shrink-0"></span>${farmer.khu_vuc || 'Việt Nam'}
                </p>
              </div>
            </div>
            
            <div class="space-y-1 text-[10px] mt-1 border-t border-slate-100 pt-2 text-slate-650">
              <p class="truncate">🌿 Sản phẩm: <strong class="text-slate-800">${farmer.san_pham_chinh || 'Chưa cập nhật'}</strong></p>
              <p class="truncate">📐 Quy mô: <strong class="text-slate-800">${farmer.dien_tich || 'Chưa cập nhật'}</strong></p>
              <p class="truncate">⭐ Đánh giá: <strong class="text-slate-800">${farmer.rating || '4.8'} (${farmer.txCount || 0} GD)</strong></p>
            </div>
            
            <button class="w-full py-2 mt-1.5 bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-extrabold rounded-xl text-[10px] transition-colors shadow-md text-center cursor-pointer" id="popup-btn-${farmer.dia_chi_vi}">
              Xem hồ sơ & Liên hệ
            </button>
          `;

          marker.bindPopup(popupContent);

          marker.on('popupopen', () => {
            setTimeout(() => {
              const btn = document.getElementById(`popup-btn-${farmer.dia_chi_vi}`);
              if (btn) {
                btn.onclick = () => {
                  openFarmerModal(farmer);
                };
              }
            }, 50);
          });

          // Zoom in smooth và mở popup card khi click marker (Feedback 2)
          marker.on('click', () => {
            map.flyTo(coords, 13, { animate: true, duration: 1.2 });
          });

          markersRef.current[farmer.dia_chi_vi] = { marker, coords };
        } else {
          // Nhóm lại (Clustering) thành badge số khi trùng tọa độ (Feedback 2)
          const clusterHtml = `
            <div class="w-10 h-10 rounded-full border-3 border-[#2e7d32] bg-[#f0fdf4] shadow-lg flex items-center justify-center font-black text-xs text-[#2e7d32] hover:scale-110 active:scale-95 transition-all duration-200">
              🟢 ${groupFarmers.length}
            </div>
          `;

          const clusterIcon = L.divIcon({
            html: clusterHtml,
            className: 'bg-transparent border-none',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });

          const clusterMarker = L.marker(coords, { icon: clusterIcon }).addTo(map);

          clusterMarker.bindTooltip(`<strong>Khu vực có ${groupFarmers.length} nhà vườn</strong><br/>Click để xem chi tiết`, {
            direction: 'top',
            offset: [0, -20],
            className: 'custom-leaflet-tooltip'
          });

          const popupContent = document.createElement('div');
          popupContent.className = 'p-3 w-[240px] text-slate-800 font-sans flex flex-col gap-2.5';
          
          let listHtml = '';
          groupFarmers.forEach(f => {
            const av = f.anh_dai_dien || `https://api.dicebear.com/7.x/micah/svg?seed=${f.ten_hien_thi}`;
            listHtml += `
              <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-none last:pb-0">
                <div class="flex items-center gap-2 min-w-0">
                  <img src="${av}" class="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200" />
                  <div class="min-w-0">
                    <p class="font-bold text-[10px] text-slate-900 truncate leading-tight">${f.ten_hien_thi}</p>
                    <p class="text-[8px] text-[#2e7d32] font-semibold truncate mt-0.5">🌿 ${f.san_pham_chinh || 'Chưa cập nhật'}</p>
                  </div>
                </div>
                <button class="px-2 py-1 bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-bold rounded-lg text-[8px] transition-colors shrink-0 cursor-pointer" onclick="window.agriTrustOpenFarmer('${f.dia_chi_vi}')">
                  Hồ sơ
                </button>
              </div>
            `;
          });

          popupContent.innerHTML = `
            <h5 class="font-black text-xs text-slate-900 border-b border-slate-100 pb-1.5">Danh sách Nhà vườn (${groupFarmers.length})</h5>
            <div class="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
              ${listHtml}
            </div>
          `;

          clusterMarker.bindPopup(popupContent);

          clusterMarker.on('click', () => {
            map.flyTo(coords, 12, { animate: true, duration: 1.2 });
          });

          // Gán cluster marker cho toàn bộ nông dân trong cụm
          groupFarmers.forEach(f => {
            markersRef.current[f.dia_chi_vi] = { marker: clusterMarker, coords };
          });
        }
      });

      // Thêm các marker khẳng định chủ quyền đối với quần đảo Hoàng Sa và Trường Sa của Việt Nam (Đảm bảo độ rộng iconSize không bị tràn chữ)
      const islands = [
        { name: 'Quần đảo Hoàng Sa (Việt Nam)', coords: [16.5, 112.0] as [number, number] },
        { name: 'Quần đảo Trường Sa (Việt Nam)', coords: [8.63, 111.92] as [number, number] }
      ];

      islands.forEach(island => {
        const islandHtml = `
          <div class="flex items-center gap-1 bg-[#15803D]/95 text-white font-black text-[9px] tracking-wide px-2.5 py-1 rounded-full border border-white/80 shadow-md animate-pulse whitespace-nowrap">
            <span class="w-1.5 h-1.5 bg-yellow-400 rounded-full shrink-0"></span>
            ${island.name}
          </div>
        `;
        const islandIcon = L.divIcon({
          html: islandHtml,
          className: 'bg-transparent border-none',
          iconSize: [200, 26],
          iconAnchor: [100, 13]
        });
        L.marker(island.coords, { icon: islandIcon }).addTo(map)
          .bindPopup(`<div class="font-black text-xs text-slate-800 text-center p-1.5">${island.name}<br/><span class="text-[10px] text-[#2e7d32] font-black uppercase tracking-wider block mt-1">Lãnh thổ Việt Nam</span></div>`);
      });
    };

    // Kiểm tra và tải Leaflet CDN một cách an sau, tránh tải trùng lặp
    if ((window as any).L) {
      leafletLoadedRef.current = true;
      initLeafletMap();
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    let script = document.getElementById('leaflet-js') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        leafletLoadedRef.current = true;
        initLeafletMap();
      };
      document.body.appendChild(script);
    } else {
      const oldOnload = script.onload;
      script.onload = (e) => {
        if (oldOnload) (oldOnload as any)(e);
        leafletLoadedRef.current = true;
        initLeafletMap();
      };
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [activeTab, farmerProfiles]);

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleMapItemHover = (farmer: any, isHovered: boolean) => {
    setHoveredFarmerId(isHovered ? farmer.dia_chi_vi : null);
    const markerEl = document.getElementById(`marker-${farmer.dia_chi_vi}`);
    if (markerEl) {
      if (isHovered) {
        markerEl.classList.add('animate-pulse');
        markerEl.style.transform = 'scale(1.25)';
        markerEl.style.boxShadow = '0 0 15px #15803D';
        if (markerEl.parentElement) {
          markerEl.parentElement.style.zIndex = '9999';
        }
      } else {
        markerEl.classList.remove('animate-pulse');
        markerEl.style.transform = 'none';
        markerEl.style.boxShadow = 'none';
        if (markerEl.parentElement) {
          markerEl.parentElement.style.zIndex = 'auto';
        }
      }
    }
  };

  const handleMapItemClick = (farmer: any) => {
    setSelectedMapFarmerId(farmer.dia_chi_vi);
    const data = markersRef.current[farmer.dia_chi_vi];
    if (mapRef.current && data && data.coords) {
      mapRef.current.flyTo(data.coords, 13, {
        animate: true,
        duration: 1.5
      });
      if (data.marker) {
        setTimeout(() => {
          data.marker.openPopup();
        }, 1200);
      }
    }
  };

  const handleMyLocation = () => {
    if (!mapRef.current) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          mapRef.current.flyTo([latitude, longitude], 14, { animate: true, duration: 1.5 });
          
          const L = (window as any).L;
          if (L) {
            if ((window as any).myLocationMarker) {
              mapRef.current.removeLayer((window as any).myLocationMarker);
            }
            const myIcon = L.divIcon({
              html: `
                <div class="relative w-6 h-6 flex items-center justify-center">
                  <span class="absolute inline-flex h-full w-full rounded-full bg-blue-500/30 animate-ping"></span>
                  <div class="w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
                </div>
              `,
              className: 'bg-transparent border-none',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            (window as any).myLocationMarker = L.marker([latitude, longitude], { icon: myIcon })
              .addTo(mapRef.current)
              .bindPopup('<div class="font-bold text-xs text-slate-800 p-1 text-center">Vị trí của tôi</div>')
              .openPopup();
          }
        },
        (error) => {
          console.warn('Geolocation error, falling back to default HCMC:', error);
          mapRef.current.flyTo([10.776, 106.701], 13, { animate: true, duration: 1.5 });
          alert("Không thể định vị GPS, chuyển hướng về TP. Hồ Chí Minh.");
        }
      );
    } else {
      alert("Trình duyệt không hỗ trợ định vị GPS.");
    }
  };

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
              partnerAddress: partnerAddress,
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
          loadNotifications();
        }
      )
      .subscribe();

    const reqChannel = supabase
      .channel('homepage_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'yeu_cau_lien_he',
        },
        () => {
          loadNotifications();
          loadTab1Data();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(reqChannel);
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

  const getFilteredNegotiations = () => {
    return negotiations.filter(nego => {
      const cleanTitle = nego.title.replace(/^Thương vụ:\s*/i, '');
      const partnerName = nego.partnerName || '';
      const matchesSearch = 
        cleanTitle.toLowerCase().includes(negoSearchQuery.toLowerCase()) ||
        partnerName.toLowerCase().includes(negoSearchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (negoStatusFilter === 'negotiating') {
        return nego.status !== 'da_chot';
      }
      if (negoStatusFilter === 'locked') {
        return nego.status === 'da_chot' && nego.deliveryStatus !== 'da_hoan_thanh';
      }
      if (negoStatusFilter === 'completed') {
        return nego.deliveryStatus === 'da_hoan_thanh';
      }
      return true;
    });
  };

  // Group các cuộc đàm phán/hợp đồng theo đối tác kết nối
  const getGroupedNegotiations = () => {
    const groups: {
      [key: string]: {
        partnerName: string;
        partnerAddress: string;
        items: any[];
      };
    } = {};

    const filtered = getFilteredNegotiations();

    filtered.forEach((nego) => {
      const partnerKey = nego.partnerAddress || nego.partnerName || 'unknown_partner';
      if (!groups[partnerKey]) {
        groups[partnerKey] = {
          partnerName: nego.partnerName,
          partnerAddress: nego.partnerAddress || '',
          items: [],
        };
      }
      groups[partnerKey].items.push(nego);
    });

    return Object.values(groups);
  };

  const getNegoStepIndex = (nego: any) => {
    if (nego.deliveryStatus === 'da_hoan_thanh') return 4;
    if (nego.contract?.trang_thai === 'da_khoa_tien' || nego.deliveryStatus === 'dang_van_chuyen' || nego.deliveryStatus === 'cho_nghiem_thu') return 3;
    if (nego.status === 'da_chot' || nego.status === 'da_chot_nhap_tam_dung') return 2;
    if (nego.status === 'dang_dam_phan' || nego.status === 'dang_lien_he') return 1;
    return 0;
  };

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

      try {
        await connectRequest(req.id, dbContract.id);
      } catch (err) {
        console.warn('Lỗi khi liên kết đàm phán:', err);
      }

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
    } catch (e) {
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

  const countMarket = isNongDan 
    ? contactRequests.filter(r => r.trang_thai === 'cho_phan_hoi').length 
    : farmerProfiles.length;
  const countNegotiation = negotiations.filter(n => n.status !== 'da_chot').length;
  const countDelivery = negotiations.filter(n => n.status === 'da_chot' && n.deliveryStatus !== 'da_hoan_thanh').length;

  return (
    <div ref={uiRootRef} className="flex-grow flex flex-col min-h-screen bg-slate-50 font-sans">

      {/* HEADER & TABS */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-[8px] border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#15803D] flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">A</div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-slate-900 leading-none">AgriTrust</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">{text.tagline}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ConnectWalletButton />

            <div
              role="tablist"
              aria-label="Language"
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1"
            >
              <Languages size={15} className="ml-1 text-slate-500" />
              {(['vi', 'en'] as Language[]).map(option => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={language === option}
                  onClick={() => setLanguage(option)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    language === option
                      ? 'bg-white text-[#2e7d32] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-105 rounded-full transition-all relative cursor-pointer flex items-center justify-center"
              >
                <Bell size={20} />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-600 rounded-full border border-white animate-pulse" />
                )}
              </button>
              
              {/* Notification Box */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-scaleUp">
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-800">{text.notifications} ({unreadNotifications.length})</span>
                    {unreadNotifications.length > 0 && (
                      <button 
                        onClick={() => setUnreadNotifications([])}
                        className="text-[10px] text-[#2e7d32] hover:underline font-bold"
                      >
                        {text.markAllRead}
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto mt-2">
                    {unreadNotifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-400">
                        {text.noNotifications}
                      </div>
                    ) : (
                      unreadNotifications.map(notif => (
                        <div 
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className="px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 cursor-pointer flex gap-3 items-start transition-all"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[#2e7d32] mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-850 truncate">{notif.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{notif.desc}</p>
                            <span className="text-[9px] text-slate-400 block mt-1 font-medium">
                              {notif.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Custom User Dropdown Menu */}
            <div className="relative group/menu flex items-center gap-2 pl-4 border-l border-slate-200 cursor-pointer py-1.5">
              <div className="flex items-center gap-2">
                {user.anh_dai_dien ? (
                  <img src={user.anh_dai_dien} alt={user.ten_hien_thi} className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm" />
                ) : (
                  <div className="w-8 h-8 bg-[#2e7d32] rounded-full flex items-center justify-center text-white font-black text-sm shadow-sm">
                    {(user.ten_hien_thi || 'U')[0]}
                  </div>
                )}
                <div className="text-left flex flex-col hidden sm:flex">
                  <p className="text-xs font-black text-slate-800 leading-tight group-hover/menu:text-[#2e7d32] transition-colors">
                    {isNongDan ? 'Nông dân Nguyễn Văn Ruộng' : user.ten_hien_thi}
                  </p>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    {isNongDan ? text.farmer : text.trader}
                  </span>
                </div>
                <ChevronDown size={14} className="text-slate-400 group-hover/menu:rotate-180 transition-transform duration-200" />
              </div>
              
              {/* Dropdown Menu on hover */}
              <div className="absolute right-0 top-full pt-2 w-44 hidden group-hover/menu:block z-50 animate-scaleUp">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 flex flex-col overflow-hidden">
                  <Link href="/profile" className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#2e7d32] transition-all flex items-center gap-2.5">
                    <User size={14} className="text-slate-400" />
                    <span>{text.profile}</span>
                  </Link>
                  <Link href="/profile?tab=settings" className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#2e7d32] transition-all flex items-center gap-2.5">
                    <Award size={14} className="text-slate-400" />
                    <span>{text.settings}</span>
                  </Link>
                  <button onClick={logout} className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-2.5 border-t border-slate-100 cursor-pointer">
                    <LogOut size={14} className="text-rose-450" />
                    <span>{text.logout}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 flex border-b border-slate-100 relative">
          <button 
            onClick={() => { setActiveTab('market'); setActiveNegotiationId(null); setActiveDeliveryId(null); }} 
            className={`px-5 py-3 text-sm font-bold flex items-center gap-2 transition-all duration-200 relative rounded-t-xl hover:bg-black/[0.04] ${
              activeTab === 'market' 
                ? 'bg-[#2e7d32]/[0.08] text-[#2e7d32]' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag size={16} /> 
            <span>{text.tabs.market}</span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1 ${
              activeTab === 'market' 
                ? 'bg-[#2e7d32]/20 text-[#2e7d32]' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {countMarket}
            </span>
            <span className={`absolute bottom-0 left-0 right-0 h-[3px] bg-[#2e7d32] rounded-t-full transition-transform duration-300 ${activeTab === 'market' ? 'scale-x-100' : 'scale-x-0'}`} />
          </button>
          <button 
            onClick={() => { setActiveTab('negotiation'); setActiveNegotiationId(null); setActiveDeliveryId(null); }} 
            className={`px-5 py-3 text-sm font-bold flex items-center gap-2 transition-all duration-200 relative rounded-t-xl hover:bg-black/[0.04] ${
              activeTab === 'negotiation' 
                ? 'bg-[#2e7d32]/[0.08] text-[#2e7d32]' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare size={16} /> 
            <span>{text.tabs.negotiation}</span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1 ${
              activeTab === 'negotiation' 
                ? 'bg-[#2e7d32]/20 text-[#2e7d32]' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {countNegotiation}
            </span>
            <span className={`absolute bottom-0 left-0 right-0 h-[3px] bg-[#2e7d32] rounded-t-full transition-transform duration-300 ${activeTab === 'negotiation' ? 'scale-x-100' : 'scale-x-0'}`} />
          </button>
          <button 
            onClick={() => { setActiveTab('delivery'); setActiveNegotiationId(null); setActiveDeliveryId(null); }} 
            className={`px-5 py-3 text-sm font-bold flex items-center gap-2 transition-all duration-200 relative rounded-t-xl hover:bg-black/[0.04] ${
              activeTab === 'delivery' 
                ? 'bg-[#2e7d32]/[0.08] text-[#2e7d32]' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck size={16} /> 
            <span>{text.tabs.delivery}</span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1 ${
              activeTab === 'delivery' 
                ? 'bg-[#2e7d32]/20 text-[#2e7d32]' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {countDelivery}
            </span>
            <span className={`absolute bottom-0 left-0 right-0 h-[3px] bg-[#2e7d32] rounded-t-full transition-transform duration-300 ${activeTab === 'delivery' ? 'scale-x-100' : 'scale-x-0'}`} />
          </button>
          
          <button 
            onClick={() => { setActiveTab('map'); setActiveNegotiationId(null); setActiveDeliveryId(null); }} 
            className={`px-5 py-3 text-sm font-bold flex items-center gap-2 transition-all duration-200 relative rounded-t-xl hover:bg-black/[0.04] ${
              activeTab === 'map' 
                ? 'bg-[#2e7d32]/[0.08] text-[#2e7d32]' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Map size={16} /> 
            <span>{text.tabs.map}</span>
            <span className={`absolute bottom-0 left-0 right-0 h-[3px] bg-[#2e7d32] rounded-t-full transition-transform duration-300 ${activeTab === 'map' ? 'scale-x-100' : 'scale-x-0'}`} />
          </button>
        </div>
      </header>

      {/* 🟢 TAB 1: KẾT NỐI ĐỐI TÁC */}
      {activeTab === 'market' && (
        <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8 animate-fade-in-up">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900 border-l-4 border-[#2e7d32] pl-3">{text.marketTitle}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {isNongDan
                  ? text.marketFarmerDesc
                  : text.marketTraderDesc}
              </p>
            </div>
            {isNongDan && (
              <Link href="/profile" className="px-5 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-md">
                {text.updateProducts}
              </Link>
            )}
          </div>

          {isNongDan ? (
            /* DANH SÁCH YÊU CẦU LIÊN HỆ ĐẾN NÔNG DÂN */
            <div className="space-y-4">
              {/* Stats & Filter Bar */}
              {(() => {
                const countNewReqs = contactRequests.filter(r => r.trang_thai === 'cho_phan_hoi' || r.trang_thai === 'da_xem').length;
                const countAcceptedReqs = contactRequests.filter(r => r.trang_thai === 'da_dong_y' || r.trang_thai === 'da_hen_lich' || r.trang_thai === 'da_ket_noi').length;
                const countNegotiatingReqs = contactRequests.filter(r => r.trang_thai === 'da_ket_noi').length;
                const filtered = getFilteredContactRequests();

                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-bold">
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                          📬 {countNewReqs} {text.requestStats.new}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                          ✅ {countAcceptedReqs} {text.requestStats.accepted}
                        </span>
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                          ⏳ {countNegotiatingReqs} {text.requestStats.negotiating}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-center">
                        {[
                          { id: 'all', label: text.filters.all },
                          { id: 'pending', label: text.filters.pending },
                          { id: 'accepted', label: text.filters.accepted },
                          { id: 'rejected', label: text.filters.rejected }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setContactFilter(tab.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              contactFilter === tab.id
                                ? 'bg-white text-[#2e7d32] shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filtered.length === 0 ? (
                      <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 text-slate-500 font-bold">
                        {text.emptyRequests}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(req => {
                          const traderRating = getTraderRating(req.vi_thuong_lai);
                          return (
                            <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {req.thuong_lai?.anh_dai_dien ? (
                                    <img 
                                      src={req.thuong_lai.anh_dai_dien} 
                                      alt={req.thuong_lai.ten_hien_thi} 
                                      className="w-[52px] h-[52px] rounded-full object-cover border-2 border-[#2e7d32] shrink-0 shadow-sm" 
                                    />
                                  ) : (
                                    <div className="w-[52px] h-[52px] rounded-full bg-indigo-600 border-2 border-[#2e7d32] flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm">
                                      {(req.thuong_lai?.ten_hien_thi || 'T')[0]}
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h4 className="font-black text-slate-900 text-[15px] leading-tight truncate">
                                        {req.thuong_lai?.ten_hien_thi || 'Thương lái'}
                                      </h4>
                                      <span className="text-[10px] font-extrabold text-amber-500 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 shrink-0 flex items-center gap-0.5">
                                        ⭐ {traderRating}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-450 font-mono mt-1">
                                      Ví: {req.vi_thuong_lai.slice(0, 5)}...{req.vi_thuong_lai.slice(-4)}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100 flex-1 space-y-3.5 text-xs">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] text-slate-400 font-semibold shrink-0">Quan tâm đến:</span>
                                  <span className="bg-emerald-50 text-[#15803D] border border-emerald-250/50 px-2 py-0.5 rounded-full text-[11px] font-black tracking-wide flex items-center gap-1 shrink-0 shadow-sm">
                                    {getProductEmoji(req.ten_san_pham_snapshot || req.san_pham?.ten_san_pham || 'Liên hệ chung')}{' '}
                                    {req.ten_san_pham_snapshot || req.san_pham?.ten_san_pham || 'Liên hệ chung'}
                                  </span>
                                </div>

                                {/* Thông tin doanh nghiệp của Thương lái - Dạng bảng/inline gọn gàng */}
                                {req.thuong_lai && (req.thuong_lai.ten_cong_ty || req.thuong_lai.so_dien_thoai || req.thuong_lai.ho_ten) && (
                                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-slate-500">
                                    {req.thuong_lai.ho_ten && (
                                      <div className="flex justify-between gap-2 text-[11px]">
                                        <span className="text-slate-400 flex items-center gap-1 shrink-0 font-semibold">
                                          <span>👤</span> Đại diện:
                                        </span>
                                        <span className="text-slate-800 text-right truncate font-semibold">{req.thuong_lai.ho_ten}</span>
                                      </div>
                                    )}
                                    {req.thuong_lai.ten_cong_ty && (
                                      <div className="flex justify-between gap-2 text-[11px]">
                                        <span className="text-slate-400 flex items-center gap-1 shrink-0 font-semibold">
                                          <span>🏢</span> Công ty:
                                        </span>
                                        <span className="text-slate-800 text-right truncate font-semibold">{req.thuong_lai.ten_cong_ty}</span>
                                      </div>
                                    )}
                                    {req.thuong_lai.so_dien_thoai && (
                                      <div className="flex justify-between gap-2 text-[11px]">
                                        <span className="text-slate-400 flex items-center gap-1 shrink-0 font-semibold">
                                          <span>📞</span> SĐT:
                                        </span>
                                        <a
                                          href={`tel:${req.thuong_lai.so_dien_thoai}`}
                                          className="text-[#2e7d32] hover:text-[#1b5e20] underline decoration-[#2e7d32]/45 font-mono font-bold"
                                        >
                                          {req.thuong_lai.so_dien_thoai}
                                        </a>
                                      </div>
                                    )}
                                    {req.thuong_lai.dia_chi && (
                                      <div className="flex justify-between gap-2 text-[11px]">
                                        <span className="text-slate-400 flex items-center gap-1 shrink-0 font-semibold">
                                          <span>📍</span> Địa chỉ:
                                        </span>
                                        <span className="text-slate-755 text-right truncate font-medium">{req.thuong_lai.dia_chi}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Lời nhắn / Ghi chú dạng khối nhỏ gọn */}
                                {req.loi_nhan && (
                                  <div className="pt-2 border-t border-slate-200/60 space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                                      <span>💬</span> Lời nhắn:
                                    </span>
                                    <p 
                                      className="text-[11px] text-slate-600 italic p-2.5 rounded-lg border-l-[3px] border-l-[#2e7d32] leading-relaxed"
                                      style={{ backgroundColor: 'rgba(46,125,50,0.05)' }}
                                    >
                                      "{req.loi_nhan}"
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Trạng thái hiển thị */}
                              <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] text-slate-450 font-bold font-semibold">
                                  {new Date(req.ngay_tao).toLocaleDateString('vi-VN')}
                                </span>
                                <div className="flex items-center gap-2">
                                  {req.trang_thai === 'cho_phan_hoi' && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-blue-200 animate-pulse">Chờ phản hồi</span>}
                                  {req.trang_thai === 'da_dong_y' && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-emerald-200">Đã đồng ý</span>}
                                  {req.trang_thai === 'da_hen_lich' && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-emerald-200">Đã hẹn lịch</span>}
                                  {req.trang_thai === 'da_ket_noi' && <span className="bg-[#2e7d32]/10 text-[#2e7d32] px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-[#2e7d32]/20">Đang đàm phán</span>}
                                  {req.trang_thai === 'tu_choi' && <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-rose-200">Đã từ chối</span>}
                                </div>
                              </div>

                              {/* Nút hành động */}
                              {req.trang_thai === 'cho_phan_hoi' && (
                                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-150/60">
                                  <button
                                    onClick={() => handleRejectRequest(req.id)}
                                    className="px-3.5 py-2 border border-red-200 bg-red-50/20 hover:bg-red-50 text-red-600 rounded-xl text-[11px] font-bold transition-all duration-200 cursor-pointer animate-fadeIn"
                                  >
                                    ✗ Từ chối
                                  </button>
                                  <button
                                    onClick={() => handleAcceptRequest(req)}
                                    className="flex-1 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm flex items-center justify-center gap-1 cursor-pointer hover:shadow-md animate-fadeIn"
                                  >
                                    <span>💬</span> Bắt đầu đàm phán
                                  </button>
                                </div>
                              )}

                              {req.trang_thai === 'da_dong_y' && (
                                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-150/60">
                                  <button
                                    onClick={() => {
                                      if (req.room_id) {
                                        const encoded = encodeMeetingParams({
                                          channel: req.id_hop_dong || req.room_id,
                                          scenario: 'A',
                                          product: req.ten_san_pham_snapshot || 'Nông sản',
                                          partner: req.thuong_lai?.ten_hien_thi || 'Thương lái'
                                        });
                                        router.push(`/call?p=${encoded}`);
                                      } else {
                                        handleContactNegotiation(req);
                                      }
                                    }}
                                    className="w-full py-2.5 bg-[#2e7d32] hover:bg-[#1b5e20] text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm flex items-center justify-center gap-1 cursor-pointer animate-fadeIn"
                                  >
                                    <span>💬</span> Vào phòng đàm phán
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            /* DANH SÁCH SẢN PHẨM / NÔNG DÂN CHO THƯƠNG LÁI */
            <>
              {/* SEARCH & FILTER BAR */}
              <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                {/* Dòng 1: Tìm kiếm & Dropdowns chính */}
                <div className="flex flex-col lg:flex-row gap-4 items-center w-full">
                  <div className="flex-1 w-full relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={text.searchFarmers}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32] outline-none placeholder:text-slate-400/80 transition-all bg-slate-50/50"
                    />
                  </div>
                  <div className="w-full lg:w-48 relative">
                    <select
                      value={selectedLocation}
                      onChange={e => setSelectedLocation(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32] outline-none bg-white transition-all cursor-pointer text-slate-700"
                    >
                      <option value="">🗺️ {text.allRegions}</option>
                      {Array.from(new Set(farmerProfiles.map(f => f.khu_vuc).filter(Boolean))).map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full lg:w-48 relative">
                    <select
                      value={selectedProductType}
                      onChange={e => setSelectedProductType(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32] outline-none bg-white transition-all cursor-pointer text-slate-700"
                    >
                      <option value="">🌿 {text.allProducts}</option>
                      {Array.from(new Set(farmerProfiles.map(f => f.san_pham_chinh).filter(Boolean))).map(prod => (
                        <option key={prod} value={prod}>{prod}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dòng 2: Sắp xếp, Yêu thích & View Mode Toggle */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-slate-100 w-full">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Dropdown Sắp xếp */}
                    <div className="relative w-full sm:w-48">
                      <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32] outline-none bg-white transition-all cursor-pointer text-slate-650"
                      >
                        <option value="newest">📅 Sắp xếp: Mới nhất</option>
                        <option value="rating">⭐ Sắp xếp: Đánh giá cao</option>
                        <option value="txCount">🤝 Sắp xếp: Nhiều giao dịch</option>
                      </select>
                    </div>

                    {/* Toggle lọc yêu thích */}
                    <button
                      onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                        showOnlyFavorites 
                          ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                      }`}
                      title="Chỉ hiển thị nông dân yêu thích"
                    >
                      <Heart size={14} fill={showOnlyFavorites ? 'currentColor' : 'none'} className={showOnlyFavorites ? 'text-rose-500' : 'text-slate-400'} />
                      <span>Chỉ Yêu Thích</span>
                    </button>
                  </div>

                  {/* Toggle Grid/List View */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === 'grid' 
                          ? 'bg-white text-[#2e7d32] shadow-sm' 
                          : 'text-slate-400 hover:text-slate-650'
                      }`}
                      title="Chế độ xem lưới (Grid)"
                    >
                      <Grid size={16} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === 'list' 
                          ? 'bg-white text-[#2e7d32] shadow-sm' 
                          : 'text-slate-400 hover:text-slate-650'
                      }`}
                      title="Chế độ xem dòng (List)"
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>

                {/* Filter chip tags */}
                {(selectedLocation || selectedProductType || searchQuery || showOnlyFavorites) && (
                  <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-slate-100/85 animate-fade-in">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đang áp dụng:</span>
                    {searchQuery && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-[#2e7d32] border border-emerald-100/80 rounded-full text-xs font-semibold shadow-sm">
                        <span>🔍 {searchQuery}</span>
                        <X size={12} className="cursor-pointer text-[#2e7d32]/70 hover:text-[#2e7d32] ml-0.5" onClick={() => setSearchQuery('')} />
                      </span>
                    )}
                    {selectedLocation && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-[#2e7d32] border border-emerald-100/80 rounded-full text-xs font-semibold shadow-sm">
                        <span>🗺️ {selectedLocation}</span>
                        <X size={12} className="cursor-pointer text-[#2e7d32]/70 hover:text-[#2e7d32] ml-0.5" onClick={() => setSelectedLocation('')} />
                      </span>
                    )}
                    {selectedProductType && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-[#2e7d32] border border-emerald-100/80 rounded-full text-xs font-semibold shadow-sm">
                        <span>🌿 {selectedProductType}</span>
                        <X size={12} className="cursor-pointer text-[#2e7d32]/70 hover:text-[#2e7d32] ml-0.5" onClick={() => setSelectedProductType('')} />
                      </span>
                    )}
                    {showOnlyFavorites && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-xs font-semibold shadow-sm">
                        <span>❤️ Mục yêu thích</span>
                        <X size={12} className="cursor-pointer text-rose-500/70 hover:text-rose-600 ml-0.5" onClick={() => setShowOnlyFavorites(false)} />
                      </span>
                    )}
                    <button 
                      onClick={() => { setSearchQuery(''); setSelectedLocation(''); setSelectedProductType(''); setShowOnlyFavorites(false); }}
                      className="text-xs text-[#2e7d32] hover:text-[#1b5e20] transition-colors font-bold underline ml-1 cursor-pointer"
                    >
                      Xóa tất cả bộ lọc
                    </button>
                  </div>
                )}
              </div>

              {/* Grid or List dynamic layout map */}
              {(() => {
                const filteredAndSortedFarmers = farmerProfiles
                  .filter(farmer => {
                    const matchesSearch = searchQuery ? (
                      (farmer.ten_hien_thi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (farmer.san_pham_chinh || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (farmer.ho_ten || '').toLowerCase().includes(searchQuery.toLowerCase())
                    ) : true;
                    const matchesLocation = selectedLocation ? (
                      (farmer.khu_vuc || '').toLowerCase().includes(selectedLocation.toLowerCase())
                    ) : true;
                    const matchesProductType = selectedProductType ? (
                      (farmer.san_pham_chinh || '').toLowerCase().includes(selectedProductType.toLowerCase())
                    ) : true;
                    const matchesFavorites = showOnlyFavorites ? favorites.includes(farmer.dia_chi_vi) : true;
                    return matchesSearch && matchesLocation && matchesProductType && matchesFavorites;
                  })
                  .sort((a, b) => {
                    if (sortBy === 'rating') {
                      return (b.rating || 4.5) - (a.rating || 4.5);
                    }
                    if (sortBy === 'txCount') {
                      return (b.txCount || 0) - (a.txCount || 0);
                    }
                    const dateA = a.ngay_tao ? new Date(a.ngay_tao).getTime() : 0;
                    const dateB = b.ngay_tao ? new Date(b.ngay_tao).getTime() : 0;
                    return dateB - dateA;
                  });

                const paginatedFarmers = filteredAndSortedFarmers.slice(0, visibleCount);

                if (paginatedFarmers.length === 0) {
                  return (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 text-slate-500 font-bold">
                      Không tìm thấy nông dân nào phù hợp với bộ lọc.
                    </div>
                  );
                }

                return (
                  <>
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                      {paginatedFarmers.map(farmer => {
                        const farmerRequests = contactRequests.filter(r => r.vi_nong_dan === farmer.dia_chi_vi);
                        const hasPendingRequest = farmerRequests.some(r => r.trang_thai === 'cho_phan_hoi');
                        const hasAcceptedRequest = farmerRequests.some(r => r.trang_thai === 'da_chap_nhan');
                        const isFavorited = favorites.includes(farmer.dia_chi_vi);

                        if (viewMode === 'grid') {
                          return (
                            <div 
                              key={farmer.dia_chi_vi} 
                              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl"
                            >
                              {/* Cover photo block */}
                              <div className="bg-slate-200 relative overflow-hidden shrink-0 h-32 w-full">
                                <img
                                  src={farmer.anh_bia || `https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`}
                                  alt="Farm Cover"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0e2716]/80 via-transparent to-transparent pointer-events-none" />
                                
                                {/* Glassmorphism Location Tag */}
                                <div className="absolute top-3 left-3 px-3 py-1.5 bg-white/60 backdrop-blur-sm shadow-sm border border-white/30 text-[#1b5e20] text-[11px] font-extrabold rounded-full flex items-center gap-1.5">
                                  <MapPin size={14} className="text-[#1b5e20] shrink-0" /> {farmer.khu_vuc || 'Việt Nam'}
                                </div>

                                {/* Star Rating Badge */}
                                <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/55 backdrop-blur-sm text-white text-[10px] font-black rounded-md flex items-center gap-1">
                                  {farmer.txCount > 0 ? (
                                    <>
                                      <span>⭐ {farmer.rating || '4.8'}</span>
                                      <span className="text-white/60">•</span>
                                      <span>{farmer.txCount || 0} GD</span>
                                    </>
                                  ) : (
                                    <span className="text-white/80">Chưa có đánh giá</span>
                                  )}
                                </div>

                                {/* KYC Verified Badge */}
                                {farmer.trang_thai_xac_thuc === 'da_xac_thuc_ho_so' && (
                                  <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-md flex items-center gap-1 shadow-md border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping shrink-0" />
                                    <span>KYC</span>
                                  </div>
                                )}

                                {/* Favorite Heart Button */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(farmer.dia_chi_vi); }}
                                  className="absolute bottom-3 right-3 p-1.5 bg-white/80 hover:bg-white text-rose-600 rounded-full transition-all cursor-pointer shadow-sm hover:scale-110 active:scale-95 flex items-center justify-center"
                                  title={isFavorited ? "Bỏ yêu thích" : "Yêu thích"}
                                >
                                  <Heart size={14} fill={isFavorited ? 'currentColor' : 'none'} />
                                </button>
                              </div>

                              {/* Info card details block */}
                              <div className="p-5 flex-grow flex flex-col justify-between">
                                <div>
                                  {/* Avatar circular shadow overlap */}
                                  <div className="bg-white rounded-full p-0.5 inline-block border-[3px] border-[#2e7d32] shadow-md -mt-8 relative mb-2 shrink-0 z-10">
                                    {farmer.anh_dai_dien ? (
                                      <img src={farmer.anh_dai_dien} alt={farmer.ten_hien_thi} className="w-12 h-12 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-12 h-12 bg-[#2e7d32] rounded-full flex items-center justify-center text-white font-black text-sm">
                                        {(farmer.ten_hien_thi || farmer.ho_ten || 'A')[0]}
                                      </div>
                                    )}
                                  </div>

                                  <h3 className="text-xl font-black text-slate-900 leading-snug">{farmer.ten_hien_thi || farmer.ten_nong_trai || 'Nhà Nông'}</h3>
                                  <p className="text-xs text-slate-400 mt-0.5 font-bold">{farmer.ho_ten}</p>

                                  <div className="mt-3.5 space-y-2">
                                    {farmer.san_pham_chinh ? (
                                      <p className="text-xs text-slate-600 flex items-start gap-2">
                                        <ShoppingBag size={14} className="text-[#2e7d32] flex-shrink-0 mt-0.5" />
                                        <span>Sản phẩm chính: <strong>{farmer.san_pham_chinh}</strong></span>
                                      </p>
                                    ) : null}
                                    {(farmer.dien_tich || farmer.kinh_nghiem) ? (
                                      <p className="text-xs text-slate-600 flex items-start gap-2">
                                        <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                                        <span>
                                          {farmer.dien_tich && `Quy mô: ${farmer.dien_tich}`}
                                          {farmer.dien_tich && farmer.kinh_nghiem && ' • '}
                                          {farmer.kinh_nghiem && `Kinh nghiệm: ${farmer.kinh_nghiem}`}
                                        </span>
                                      </p>
                                    ) : null}
                                  </div>

                                  {/* Dynamic categories footer badges */}
                                  {(farmer.san_pham_chinh || farmer.dien_tich) ? (
                                    <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                                      {farmer.san_pham_chinh && (
                                        <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-200/50">
                                          {farmer.san_pham_chinh}
                                        </span>
                                      )}
                                      {farmer.dien_tich && (
                                        <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-slate-200/60">
                                          Quy mô: {farmer.dien_tich}
                                        </span>
                                      )}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="p-4 bg-slate-50/50 border-t border-slate-100/80 mt-4 rounded-xl">
                                  {hasPendingRequest ? (
                                    <div className="w-full py-2 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-default border border-slate-300/40">
                                      ⏳ Đang chờ phản hồi
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => openFarmerModal(farmer)}
                                      className="w-full py-2 bg-gradient-to-r from-[#2e7d32] to-[#43a047] hover:brightness-110 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-md"
                                    >
                                      <MessageSquare size={14} /> 
                                      <span>{hasAcceptedRequest ? 'Liên hệ thêm SP mới' : 'Xem Hồ Sơ & Liên hệ'}</span>
                                      <ChevronRight size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          // List view layout (5-column compact row format)
                          return (
                            <div 
                              key={farmer.dia_chi_vi} 
                              className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-row items-center p-3 gap-6 transition-all duration-200 border-l-[3px] border-l-transparent hover:border-l-[#2e7d32] hover:bg-[rgba(46,125,50,0.05)] hover:shadow-md animate-fadeIn"
                            >
                              {/* Column 1: Image 120x120 */}
                              <div className="w-[120px] h-[120px] rounded-xl overflow-hidden shrink-0 relative bg-slate-200">
                                <img
                                  src={farmer.anh_bia || `https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`}
                                  alt="Farm Cover"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0e2716]/60 via-transparent to-transparent pointer-events-none" />
                                
                                {/* Favorite Heart Button */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(farmer.dia_chi_vi); }}
                                  className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-white text-rose-600 rounded-full transition-all cursor-pointer shadow-sm hover:scale-110 active:scale-95 flex items-center justify-center shadow-md"
                                  title={isFavorited ? "Bỏ yêu thích" : "Yêu thích"}
                                >
                                  <Heart size={13} fill={isFavorited ? 'currentColor' : 'none'} />
                                </button>
                              </div>

                              {/* Column 2: Avatar + Tên + Tỉnh */}
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                {/* Avatar */}
                                <div className="bg-white rounded-full p-0.5 border-2 border-[#2e7d32] shadow-sm shrink-0">
                                  {farmer.anh_dai_dien ? (
                                    <img src={farmer.anh_dai_dien} alt={farmer.ten_hien_thi} className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 bg-[#2e7d32] rounded-full flex items-center justify-center text-white font-black text-xs">
                                      {(farmer.ten_hien_thi || farmer.ho_ten || 'A')[0]}
                                    </div>
                                  )}
                                </div>
                                {/* Name + Province */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-extrabold text-slate-900 truncate leading-snug" title={farmer.ten_hien_thi}>
                                      {farmer.ten_hien_thi || 'Nhà Nông'}
                                    </h3>
                                    {farmer.trang_thai_xac_thuc === 'da_xac_thuc_ho_so' && (
                                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded border border-emerald-200/50 flex items-center gap-0.5 shrink-0">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                                        <span>KYC</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{farmer.ho_ten}</p>
                                  <div className="flex items-center gap-1 text-[#1b5e20] text-xs font-bold mt-1">
                                    <MapPin size={13} className="shrink-0" />
                                    <span className="truncate">{farmer.khu_vuc || 'Việt Nam'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Column 3: Sản phẩm + Quy mô */}
                              <div className="w-48 shrink-0 flex flex-col gap-1.5">
                                {farmer.san_pham_chinh ? (
                                  <div className="flex items-center gap-1">
                                    <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-200/50 truncate max-w-full">
                                      🌿 {farmer.san_pham_chinh}
                                    </span>
                                  </div>
                                ) : null}
                                {farmer.dien_tich ? (
                                  <div className="flex items-center gap-1">
                                    <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-slate-200/60 truncate max-w-full">
                                      📐 {farmer.dien_tich}
                                    </span>
                                  </div>
                                ) : null}
                                {!farmer.san_pham_chinh && !farmer.dien_tich && (
                                  <span className="text-slate-400 font-medium text-xs pl-2">—</span>
                                )}
                              </div>

                              {/* Column 4: Rating */}
                              <div className="w-32 shrink-0 text-slate-700 font-bold text-xs">
                                {farmer.txCount > 0 ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1 text-amber-500 font-black">
                                      <span>⭐</span>
                                      <span>{farmer.rating || '4.8'}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                      {farmer.txCount || 0} giao dịch
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-medium text-xs">Chưa có đánh giá</span>
                                )}
                              </div>

                              {/* Column 5: Button */}
                              <div className="w-36 shrink-0 flex justify-end">
                                {hasPendingRequest ? (
                                  <div className="px-4 py-2 bg-slate-200 text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-default border border-slate-300/40 w-full text-center">
                                    ⏳ Đang chờ
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openFarmerModal(farmer)}
                                    className="px-4 py-2 bg-gradient-to-r from-[#2e7d32] to-[#43a047] hover:brightness-110 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-md w-full text-center"
                                  >
                                    <MessageSquare size={13} />
                                    <span>{hasAcceptedRequest ? 'Liên hệ' : 'Xem Hồ Sơ'}</span>
                                    <ChevronRight size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>

                    {/* Pagination load more button */}
                    {filteredAndSortedFarmers.length > visibleCount && (
                      <div className="flex justify-center mt-10">
                        <button
                          onClick={() => setVisibleCount(prev => prev + 6)}
                          className="px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:border-[#2e7d32] hover:text-[#2e7d32] rounded-xl text-sm font-bold shadow-sm transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                        >
                          Xem thêm Nông dân ({filteredAndSortedFarmers.length - visibleCount} còn lại)
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Modal Chi tiết Hồ sơ Nông Dân */}
              {showFarmerModal && (
                <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-scaleUp flex flex-col md:flex-row">
                    {/* Cột trái: Hình ảnh & Thông tin thiết kế đồng bộ đẹp */}
                    <div className="w-full md:w-5/12 relative flex flex-col justify-end text-white overflow-hidden min-h-[450px] md:min-h-0">
                      {/* Full cover background image */}
                      <img
                        src={showFarmerModal.anh_bia || `https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`}
                        alt="Farm Cover"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {/* Gradient overlay from transparent -> dark black/slate at the bottom */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/90 pointer-events-none" />
                      
                      {/* Close button for mobile inside the relative container */}
                      <button 
                        onClick={() => setShowFarmerModal(null)} 
                        className="md:hidden absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full z-20 hover:bg-black/80 transition-colors"
                      >
                        <X size={16} />
                      </button>

                      {/* Content overlay */}
                      <div className="relative z-10 p-6 flex flex-col items-center text-center">
                        {/* Avatar placed center-bottom of image, with white 3px border + shadow */}
                        <div className="bg-white rounded-full p-0.5 border-[3px] border-white shadow-xl mb-4 shrink-0">
                          {showFarmerModal.anh_dai_dien ? (
                            <img src={showFarmerModal.anh_dai_dien} alt={showFarmerModal.ten_hien_thi} className="w-20 h-20 rounded-full object-cover" />
                          ) : (
                            <div className="w-20 h-20 bg-[#15803D] rounded-full flex items-center justify-center text-white font-black text-2xl">
                              {(showFarmerModal.ten_hien_thi || showFarmerModal.ho_ten || 'A')[0]}
                            </div>
                          )}
                        </div>

                        <h3 className="font-black text-2xl text-white drop-shadow-md leading-tight">{showFarmerModal.ten_hien_thi}</h3>
                        <p className="text-xs text-white/95 font-bold uppercase tracking-wider bg-emerald-600/90 border border-emerald-500/30 px-3 py-1 rounded-full mt-2 drop-shadow-sm shadow-sm inline-block">
                          {showFarmerModal.vai_tro === 'nong_dan' ? 'Nông dân' : 'Thương lái'}
                        </p>
                        
                        <p className="text-sm font-semibold text-emerald-400 mt-2.5 flex items-center gap-1 drop-shadow-sm justify-center">
                          <MapPin size={14} className="shrink-0" /> {showFarmerModal.khu_vuc || 'Việt Nam'}
                        </p>

                        {/* Additional info section: Đại diện / Quy mô / Chứng nhận */}
                        <div className="space-y-2.5 mt-5 pt-4 border-t border-white/20 w-full text-sm text-left">
                          {/* Đại diện */}
                          <div className="flex items-center gap-3 text-white/90">
                            <User size={18} className="text-emerald-400 shrink-0" />
                            <span>Đại diện: <strong className="text-white font-extrabold">{showFarmerModal.ho_ten}</strong></span>
                          </div>
                          {/* Quy mô */}
                          {showFarmerModal.dien_tich && (
                            <div className="flex items-center gap-3 text-white/90">
                              <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                              <span>Quy mô: <strong className="text-white font-extrabold">{showFarmerModal.dien_tich}</strong></span>
                            </div>
                          )}
                          {/* Chứng nhận: VietGAP */}
                          {showFarmerModal.chung_nhan ? (
                            <div className="flex items-center gap-3 text-white/90">
                              <Award size={18} className="text-emerald-400 shrink-0" />
                              <div className="flex items-center gap-1.5">
                                <span>Chứng nhận:</span>
                                <span className="bg-emerald-600 text-white font-black text-[11px] px-2 py-0.5 rounded border border-emerald-500 shadow-sm uppercase tracking-wide">
                                  {showFarmerModal.chung_nhan}
                                </span>
                              </div>
                            </div>
                          ) : null}
                          {/* Kinh nghiệm */}
                          {showFarmerModal.kinh_nghiem && (
                            <div className="flex items-center gap-3 text-white/90">
                              <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                              <span>Kinh nghiệm: <strong className="text-white font-extrabold">{showFarmerModal.kinh_nghiem}</strong></span>
                            </div>
                          )}
                          {/* Rating / Đánh giá */}
                          <div className="flex items-center gap-3 text-white/90 pt-1.5">
                            <span className="text-amber-400 text-lg shrink-0">⭐</span>
                            {showFarmerModal.txCount > 0 ? (
                              <span>
                                Đánh giá: <strong className="text-white font-extrabold">{showFarmerModal.rating}</strong> ({showFarmerModal.txCount} giao dịch)
                              </span>
                            ) : (
                              <span className="text-white/70 italic text-xs font-semibold">Chưa có đánh giá</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cột phải: Sản phẩm & Liên hệ */}
                    <div className="w-full md:w-7/12 p-6 flex flex-col h-full max-h-[90vh]">
                      <div className="flex justify-between items-center mb-4 hidden md:flex shrink-0">
                        <h3 className="font-bold text-lg text-slate-900">Danh sách Nông sản</h3>
                        <button onClick={() => setShowFarmerModal(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-2"><X size={16} /></button>
                      </div>

                      {/* Scroll list with max-height for products */}
                      <div className="max-h-[280px] overflow-y-auto pr-2 space-y-3 mb-4 shrink-0">
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
                              className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex gap-3 items-center ${
                                selectedProductId === p.id 
                                  ? 'border-[#2e7d32] bg-emerald-50/40 shadow-sm ring-2 ring-[#2e7d32]/20' 
                                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                              }`}
                            >
                              {/* Fallback image if URL is missing or faulty */}
                              <img 
                                src={(p.hinh_anh && p.hinh_anh.length > 0 && p.hinh_anh[0] && p.hinh_anh[0].startsWith('http'))
                                  ? p.hinh_anh[0] 
                                  : 'https://images.unsplash.com/photo-1610341592772-55ad861d0f51?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
                                } 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610341592772-55ad861d0f51?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
                                }}
                                alt={p.ten_san_pham} 
                                className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0" 
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start gap-2">
                                  <h4 className="font-bold text-slate-900 text-sm truncate">{p.ten_san_pham}</h4>
                                  {/* Badge 1 tấn góc phải - đổi nền thành xanh lá nhạt thay vì xám */}
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                    {p.so_luong_uoc_tinh}
                                  </span>
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
                      </div>

                      {/* Checkbox Liên hệ chung */}
                      {selectedFarmerProducts.length > 0 && (
                        <div className="mb-3 shrink-0">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-slate-700 select-none hover:text-[#2e7d32] transition-colors">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-[#2e7d32] focus:ring-[#2e7d32] w-4 h-4 cursor-pointer accent-[#2e7d32]"
                              checked={selectedProductId === null}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProductId(null);
                                  setContactNote('');
                                } else {
                                  setSelectedProductId(selectedFarmerProducts[0].id);
                                  setContactNote(`Chào anh/chị, tôi là thương lái quan tâm tới sản phẩm ${selectedFarmerProducts[0].ten_san_pham} của anh/chị và muốn liên hệ trao đổi chi tiết về giao dịch này.`);
                                }
                              }}
                            />
                            <span>Liên hệ chung, không chọn sản phẩm cụ thể</span>
                          </label>
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-100 flex-1 flex flex-col justify-end min-h-0">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 shrink-0">Lời nhắn / Đề xuất (Tuỳ chọn)</label>
                        <textarea
                          rows={2}
                          className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32] outline-none resize-none flex-grow"
                          placeholder="Xin chào, tôi muốn đàm phán mua lô hàng của bạn..."
                          value={contactNote}
                          onChange={(e) => setContactNote(e.target.value)}
                        />
                        <button
                          onClick={submitContactRequest}
                          className="w-full mt-3 py-3.5 bg-gradient-to-r from-[#2e7d32] to-[#43a047] hover:brightness-110 text-white rounded-xl font-black transition-all shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shrink-0"
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

      {/* 🟢 TAB BẢN ĐỒ NÔNG TRẠI (Feedback 6) */}
      {activeTab === 'map' && (
        <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8 animate-fade-in-up">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900 border-l-4 border-[#2e7d32] pl-3">{text.mapTitle}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {text.mapDesc}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            {/* Cột trái: Danh sách các nhà vườn trên bản đồ có thanh tìm kiếm lọc nhanh (Feedback 3, 4, 6) */}
            <div className="lg:col-span-1 border-r border-slate-100 pr-0 lg:pr-6 max-h-[calc(100vh-220px)] overflow-y-auto space-y-3">
              {(() => {
                const filteredFarmers = farmerProfiles.filter(farmer => 
                  (farmer.ten_hien_thi || '').toLowerCase().includes(mapSearchQuery.toLowerCase()) ||
                  (farmer.khu_vuc || '').toLowerCase().includes(mapSearchQuery.toLowerCase()) ||
                  (farmer.san_pham_chinh || '').toLowerCase().includes(mapSearchQuery.toLowerCase())
                );

                return (
                  <>
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">{text.growerLocations}</h3>
                      <span className="text-[11px] font-black text-[#2e7d32] bg-[#2e7d32]/10 px-2.5 py-0.5 rounded-full">
                        {filteredFarmers.length} {text.growers}
                      </span>
                    </div>
                    
                    {/* Thanh tìm kiếm nhanh */}
                    <div className="relative mb-3.5">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder={text.quickMapSearch}
                        value={mapSearchQuery}
                        onChange={e => setMapSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32] outline-none transition-all bg-slate-50/50"
                      />
                    </div>

                    <div className="space-y-3">
                      {filteredFarmers.map(farmer => (
                        <div 
                          key={farmer.dia_chi_vi}
                          onClick={() => handleMapItemClick(farmer)}
                          onMouseEnter={() => handleMapItemHover(farmer, true)}
                          onMouseLeave={() => handleMapItemHover(farmer, false)}
                          className="p-3.5 rounded-2xl border cursor-pointer transition-all flex gap-3 items-center group/item"
                          style={{
                            backgroundColor: farmer.dia_chi_vi === selectedMapFarmerId ? 'rgba(46,125,50,0.08)' : '',
                            borderLeft: farmer.dia_chi_vi === selectedMapFarmerId ? '4px solid #2e7d32' : '1px solid #f1f5f9'
                          }}
                        >
                          {farmer.anh_dai_dien ? (
                            <img src={farmer.anh_dai_dien} alt={farmer.ten_hien_thi} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-10 h-10 bg-[#2e7d32] rounded-full flex items-center justify-center text-white font-bold text-xs">
                              {farmer.ten_hien_thi[0]}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs text-slate-850 truncate group-hover/item:text-[#2e7d32] transition-colors">{farmer.ten_hien_thi}</h4>
                            <p className="text-[11px] text-[#2e7d32] font-semibold mt-0.5 flex items-center gap-1">
                              <MapPin size={12} /> {farmer.khu_vuc || 'Việt Nam'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{text.product}: {farmer.san_pham_chinh || text.notUpdated}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Cột phải: Bản đồ Leaflet thực tế (Feedback 1, 5, 6) */}
            <div className="lg:col-span-2 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden relative h-[calc(100vh-220px)]">
              {/* Container chứa bản đồ Leaflet */}
              <div id="agritrust-leaflet-map" className="w-full h-full z-10" />

              {/* Nút điều khiển Zoom custom (Feedback 5) */}
              <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                <button
                  onClick={handleZoomIn}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-250 text-[#2e7d32] font-black text-xl hover:bg-[#e8f5e9] hover:text-[#1b5e20] flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
                  title={text.zoomIn}
                >
                  +
                </button>
                <button
                  onClick={handleZoomOut}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-250 text-[#2e7d32] font-black text-xl hover:bg-[#e8f5e9] hover:text-[#1b5e20] flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
                  title={text.zoomOut}
                >
                  -
                </button>
              </div>

              {/* Nút định vị "Vị trí của tôi" (Feedback 5) */}
              <button
                onClick={handleMyLocation}
                className="absolute bottom-4 right-4 z-[1000] px-4 py-2.5 bg-white border border-slate-200 text-[#2e7d32] hover:bg-[#e8f5e9] hover:text-[#1b5e20] rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer"
                title={text.myLocationTitle}
              >
                <span className="text-sm">📍</span> {text.myLocation}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Onboarding Tooltip (Feedback 7) */}
      {showOnboarding && (
        <div className="fixed bottom-6 right-6 z-[200] max-w-sm bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-emerald-500/30 animate-fadeIn flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <h5 className="font-extrabold text-sm text-emerald-400 flex items-center gap-1.5">
              🚀 {text.onboardingTitle}
            </h5>
            <button onClick={() => { setShowOnboarding(false); localStorage.setItem('agritrust_onboarded', 'true'); }} className="text-slate-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="text-xs text-slate-350 space-y-2 leading-relaxed">
            <p>1. 🔍 **Tìm kiếm & Lọc:** Nhập tên nông sản hoặc chọn khu vực/loại cây để tìm đối tác phù hợp.</p>
            <p>2. ❤️ **Yêu thích:** Nhấp vào trái tim ở góc card để thêm nhà vườn vào danh sách theo dõi nhanh.</p>
            <p>3. 🗺️ **Bản đồ:** Chuyển qua tab "Bản đồ Nông trại" để xem sự phân bố địa lý của nông dân.</p>
            <p>4. 🤝 **Đàm phán:** Bấm "Xem Hồ Sơ & Liên hệ" gửi yêu cầu mở phòng thương đàm AI call.</p>
          </div>
          <button
            onClick={() => { setShowOnboarding(false); localStorage.setItem('agritrust_onboarded', 'true'); }}
            className="w-full py-2.5 bg-gradient-to-r from-[#2e7d32] to-[#43a047] hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all text-center cursor-pointer mt-1"
          >
            {text.onboardingDone}
          </button>
        </div>
      )}

      {/* 🟡 TAB 2: ĐÀM PHÁN & HỢP ĐỒNG */}
      {activeTab === 'negotiation' && (
        <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-6 flex flex-col">
          {!activeNegotiationId ? (
            // DANH SÁCH THƯƠNG VỤ
            <div className="animate-fade-in-up flex flex-col flex-grow">
              <div className="flex flex-col gap-4 mb-6">
                <h1 className="text-2xl font-black text-slate-900">{text.negotiationTitle}</h1>

                {/* BANNER TỔNG TIỀN ĐANG KHÓA (Full-width Info Bar) */}
                <div className="group relative w-full bg-gradient-to-r from-emerald-600 to-[#15803D] p-3.5 rounded-2xl text-white shadow-md flex items-center justify-between border border-emerald-500/30 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner shrink-0">
                      <Lock size={18} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">{text.lockedEscrowTotal}</span>
                  </div>
                  
                  <div className="flex items-baseline gap-3">
                    <span className="text-xl font-black">
                      {negotiations
                        .filter(n => n.status === 'da_chot' && n.contract?.trang_thai === 'da_khoa_tien' && n.contract?.tong_tien_usdc_khoa)
                        .reduce((sum, n) => sum + (n.contract.tong_tien_usdc_khoa || 0), 0)
                        .toLocaleString('en-US')} SOL
                    </span>
                    <span className="text-xs font-semibold text-emerald-200">
                      (~{negotiations
                        .filter(n => n.status === 'da_chot' && n.contract?.trang_thai === 'da_khoa_tien' && n.contract?.tong_tien_usdc_khoa)
                        .reduce((sum, n) => sum + ((n.contract.tong_tien_usdc_khoa || 0) * 4000000), 0)
                        .toLocaleString('vi-VN')} VNĐ)
                    </span>
                  </div>

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 hidden group-hover:block bg-slate-900/95 backdrop-blur-sm text-white text-xs rounded-xl p-3 shadow-xl z-55 text-center border border-white/10 transition-all duration-300">
                    <p className="font-semibold leading-relaxed">Số SOL đang bị khóa trong smart contract, sẽ giải phóng sau khi giao nhận xong</p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                  </div>
                </div>
              </div>

              {/* SEARCH & FILTER BAR */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="relative flex-1 max-w-md w-full">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Tìm thương vụ theo tên nông sản hoặc nông dân..."
                    value={negoSearchQuery}
                    onChange={e => setNegoSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32] outline-none transition-all bg-slate-50/50"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'Tất cả' },
                    { value: 'negotiating', label: 'Đang đàm phán' },
                    { value: 'locked', label: 'Đã khóa' },
                    { value: 'completed', label: 'Hoàn thành' }
                  ].map(tab => (
                    <button
                      key={tab.value}
                      onClick={() => setNegoStatusFilter(tab.value as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        negoStatusFilter === tab.value
                          ? 'bg-[#2e7d32] border-[#2e7d32] text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-550 hover:bg-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {getGroupedNegotiations().length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                    Chưa có cuộc đàm phán hay hợp đồng nào được tạo.
                  </div>
                ) : (
                  getGroupedNegotiations().map((group) => {
                    const totalNego = group.items.length;
                    const lockedNego = group.items.filter(n => n.status === 'da_chot').length;
                    const allLocked = lockedNego === totalNego;

                    return (
                      <div key={group.partnerAddress || group.partnerName} className="bg-slate-50/50 border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-4">
                        {/* Partner Header */}
                        <div
                          onClick={() => {
                            const partnerKey = group.partnerAddress || group.partnerName;
                            setExpandedPartners(prev => ({
                              ...prev,
                              [partnerKey]: prev[partnerKey] === false ? true : false
                            }));
                          }}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 cursor-pointer select-none group/partnerHeader"
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar lookup */}
                            {(() => {
                              const partnerProfile = farmerProfiles.find(f => f.dia_chi_vi === group.partnerAddress);
                              if (partnerProfile?.anh_dai_dien) {
                                return (
                                  <img 
                                    src={partnerProfile.anh_dai_dien} 
                                    alt={group.partnerName} 
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" 
                                  />
                                );
                              }
                              return (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-[#15803D] text-white flex items-center justify-center font-black text-sm shadow-sm select-none shrink-0">
                                  {group.partnerName.slice(0, 2).toUpperCase()}
                                </div>
                              );
                            })()}
                            
                            <div className="flex flex-col justify-center leading-normal">
                              <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-slate-800 text-base group-hover/partnerHeader:text-[#15803D] transition-colors leading-snug">{group.partnerName}</h3>
                                <ChevronDown 
                                  size={15} 
                                  className={`text-slate-400 group-hover/partnerHeader:text-[#15803D] transition-transform duration-300 ${
                                    expandedPartners[group.partnerAddress || group.partnerName] !== false ? 'rotate-180' : 'rotate-0'
                                  }`} 
                                />
                              </div>
                              {group.partnerAddress && (
                                <p className="text-[11px] font-mono text-slate-400 mt-1 leading-none tracking-wide">{group.partnerAddress.slice(0, 8)}...{group.partnerAddress.slice(-8)}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="bg-blue-50 text-blue-700 border border-blue-150 px-2.5 py-1 rounded-full text-[11px] font-bold">
                              {totalNego} thương vụ
                            </span>
                            {allLocked ? (
                              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[11px] font-bold border border-emerald-250/60">
                                Đã chốt tất cả ({lockedNego}/{totalNego})
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-250/60 animate-pulse">
                                Đang đàm phán ({totalNego - lockedNego}/{totalNego})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* List of negotiations under this partner */}
                        {expandedPartners[group.partnerAddress || group.partnerName] !== false && (
                          <div className="space-y-3 pl-0 sm:pl-2 animate-fade-in">
                            {group.items.map((nego) => {
                              const cleanTitle = nego.title.replace(/^Thương vụ:\s*/i, '');
                              return (
                                <div
                                  key={nego.id}
                                  onClick={() => openNegotiation(nego)}
                                  className="bg-white py-3 px-4 rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/25 hover:shadow-sm cursor-pointer transition-all flex flex-col group gap-3"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                      {/* Lock icon container */}
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                                        nego.status === 'da_chot' 
                                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60' 
                                          : 'bg-amber-50 text-amber-600 border-amber-200/60'
                                      }`}>
                                        <Lock size={18} />
                                      </div>
                                      
                                      <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-slate-700 text-sm group-hover:text-emerald-800 transition-colors truncate">{cleanTitle}</h4>
                                        {/* SOL and VND Prices */}
                                        {nego.contract && (nego.contract.don_gia > 0 || nego.contract.tong_tien_usdc_khoa > 0) && (
                                          <div className="flex items-center gap-2 mt-1.5 font-mono text-[10.5px]">
                                            <span className="text-indigo-655 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded font-bold">
                                              {nego.contract.tong_tien_usdc_khoa 
                                                ? `${nego.contract.tong_tien_usdc_khoa.toLocaleString()} SOL` 
                                                : `${((nego.contract.don_gia * nego.contract.so_luong) / 4000000).toLocaleString(undefined, {maximumFractionDigits: 4})} SOL (ước tính)`}
                                            </span>
                                            <span className="text-slate-400 font-normal">•</span>
                                            <span className="text-slate-500 bg-slate-100/80 border border-slate-200/50 px-1.5 py-0.5 rounded font-semibold">
                                              {nego.contract.tong_tien_usdc_khoa
                                                ? (nego.contract.tong_tien_usdc_khoa * 4000000).toLocaleString('vi-VN')
                                                : (nego.contract.don_gia * nego.contract.so_luong).toLocaleString('vi-VN')} VNĐ
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-0 border-slate-105/60 shrink-0">
                                      {nego.status === 'da_chot' ? (
                                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-emerald-200/50">
                                          Đã Chốt & Khóa
                                        </span>
                                      ) : nego.status === 'dang_dam_phan' ? (
                                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-indigo-200/50 animate-pulse">
                                          Đang Đàm phán...
                                        </span>
                                      ) : nego.status === 'dang_lien_he' ? (
                                        <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-amber-200/50 animate-pulse">
                                          Đang Liên hệ...
                                        </span>
                                      ) : nego.status === 'da_chot_nhap_tam_dung' ? (
                                        <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-blue-200/50">
                                          Chốt nháp (Tạm dừng)
                                        </span>
                                      ) : (
                                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-slate-200">
                                          Tạm dừng
                                        </span>
                                      )}
                                      <ChevronRight size={16} className="text-slate-400 group-hover:text-emerald-600 transition-all transform group-hover:translate-x-[3px] duration-200" />
                                    </div>
                                  </div>

                                  {/* Mini Status Timeline - Horizontal flow shown on hover */}
                                  <div className="flex items-center justify-between w-full mt-3 pt-3 border-t border-slate-100 hidden group-hover:flex transition-all duration-305 animate-fadeIn">
                                    {['Gửi yêu cầu', 'Đàm phán', 'Chốt & Khóa', 'Giao nhận', 'Hoàn thành'].map((stepName, sIdx) => {
                                      const activeIdx = getNegoStepIndex(nego);
                                      const isCompleted = sIdx < activeIdx;
                                      const isCurrent = sIdx === activeIdx;
                                      
                                      return (
                                        <div key={stepName} className="flex-1 flex flex-col items-center relative">
                                          {/* Connection Line */}
                                          {sIdx < 4 && (
                                            <div className={`absolute top-2.5 left-1/2 right-[-50%] h-[3px] z-0 ${
                                              sIdx < activeIdx ? 'bg-emerald-500' : 'bg-slate-200'
                                            }`}></div>
                                          )}
                                          
                                          {/* Dot */}
                                          <div className={`w-5 h-5 rounded-full flex items-center justify-center z-10 transition-all ${
                                            isCurrent 
                                              ? 'bg-emerald-600 text-white ring-4 ring-emerald-150 animate-pulse' 
                                              : isCompleted 
                                                ? 'bg-emerald-500 text-white' 
                                                : 'bg-slate-200 text-slate-400'
                                          }`}>
                                            {isCompleted ? (
                                              <span className="text-[9px] font-bold">✓</span>
                                            ) : (
                                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                            )}
                                          </div>
                                          
                                          {/* Label */}
                                          <span className={`text-[9px] sm:text-[10px] mt-1.5 font-bold ${
                                            isCurrent ? 'text-emerald-700 font-black' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                                          }`}>
                                            {stepName}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sticky bottom summary bar */}
              <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg py-4.5 px-6 -mx-6 sm:-mx-8 mt-6">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-around gap-6 text-center">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600"><ShoppingBag size={18} /></span>
                    <div className="text-left">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng thương vụ</p>
                      <p className="text-base font-black text-slate-800">{getFilteredNegotiations().length}</p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">💸</span>
                    <div className="text-left">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng giá trị VNĐ</p>
                      <p className="text-base font-black text-slate-800">
                        {getFilteredNegotiations().reduce((sum, n) => sum + (n.contract?.don_gia * n.contract?.so_luong || 0), 0).toLocaleString('vi-VN')} VNĐ
                      </p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-amber-50 text-amber-600">⏳</span>
                    <div className="text-left">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đang chờ xử lý</p>
                      <p className="text-base font-black text-slate-800">
                        {getFilteredNegotiations().filter(n => n.status !== 'da_chot').length} thương vụ
                      </p>
                    </div>
                  </div>
                </div>
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
                        Review Draft Contract
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
                        <h2 className="font-black text-xl text-slate-900">Automated Escrow Contract</h2>
                        <p className="text-xs text-slate-500 mt-1">AI extracted the terms from the conversation successfully</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all">
                          Close
                        </button>
                        <button onClick={handleLockEscrow} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all">
                          <ShieldCheck size={16} className="inline mr-2" /> Lock Funds & Finalize
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
                    Escrow Contract
                    {isContractLocked && (
                      <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <Lock size={12} /> ĐÃ KHÓA TRÊN SOLANA
                      </span>
                    )}
                  </h2>
                  <div className="flex gap-2">
                    {isContractLocked && (
                      <button onClick={() => window.print()} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-2 border border-slate-200">
                        <FileDown size={14} /> Export PDF
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
                      Close
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
