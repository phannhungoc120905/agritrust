'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConnectWalletButton from '../components/shared/ConnectWalletButton';
import WalletBalance from '../components/shared/WalletBalance';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';
import {
  Video,
  FileText,
  ClipboardCheck,
  LogOut,
  ChevronRight,
  Phone,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  PlusCircle,
  User,
  ShoppingBag,
  Bell,
  Sparkles,
} from 'lucide-react';

interface Listing {
  id: string;
  nong_dan_ten: string;
  san_pham: string;
  so_luong: number;
  don_vi_tinh: string;
  don_gia: number;
  mo_ta: string;
  trang_thai: 'chua_ket_noi' | 'dang_cho_duyet' | 'da_ket_noi';
  nguoi_mua_ten?: string;
}

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [listings, setListings] = useState<Listing[]>([]);

  // Form đăng bán nông sản
  const [newProductName, setNewProductName] = useState('');
  const [newQuantity, setNewQuantity] = useState(5);
  const [newUnit, setNewUnit] = useState('tấn');
  const [newPrice, setNewPrice] = useState(9000000);
  const [newDesc, setNewDesc] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Khởi tạo phiên làm việc & kiểm tra bảo mật
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load tin đăng từ localStorage hoặc khởi tạo tin đăng demo
  useEffect(() => {
    if (!user) return;

    const storedListings = localStorage.getItem('agritrust_listings');
    if (storedListings) {
      setListings(JSON.parse(storedListings));
    } else {
      const defaultListings: Listing[] = [
        {
          id: 'list-1',
          nong_dan_ten: 'Nông dân Nguyễn Văn Ruộng',
          san_pham: 'Lúa thơm ST25',
          so_luong: 10,
          don_vi_tinh: 'tấn',
          don_gia: 9000000,
          mo_ta: 'Lúa thơm vụ hè thu, hạt dài bóng, cam kết tỷ lệ ẩm dưới 14% và hạt lép dưới 10%.',
          trang_thai: 'chua_ket_noi',
        },
        {
          id: 'list-2',
          nong_dan_ten: 'Nông dân Nguyễn Văn Ruộng',
          san_pham: 'Xoài cát Hòa Lộc',
          so_luong: 3,
          don_vi_tinh: 'tấn',
          don_gia: 45000000,
          mo_ta: 'Xoài ngọt thơm, trái to đều từ 450g trở lên, không bầm dập.',
          trang_thai: 'da_ket_noi',
          nguoi_mua_ten: 'Thương lái Trần Thị Thương',
        },
        {
          id: 'list-3',
          nong_dan_ten: 'Nông dân Nguyễn Văn Thơm',
          san_pham: 'Cà phê Robusta',
          so_luong: 2.5,
          don_vi_tinh: 'tấn',
          don_gia: 75000000,
          mo_ta: 'Cà phê nhân xanh chế biến ướt, hạt sàn 18 đạt tiêu chuẩn xuất khẩu.',
          trang_thai: 'chua_ket_noi',
        }
      ];
      localStorage.setItem('agritrust_listings', JSON.stringify(defaultListings));
      setListings(defaultListings);
    }
  }, [user]);

  // Nông dân thêm tin đăng nông sản mới
  const handlePostListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newListing: Listing = {
      id: `list-${Date.now()}`,
      nong_dan_ten: user.ten_hien_thi,
      san_pham: newProductName,
      so_luong: newQuantity,
      don_vi_tinh: newUnit,
      don_gia: newPrice,
      mo_ta: newDesc,
      trang_thai: 'chua_ket_noi',
    };

    const updated = [newListing, ...listings];
    setListings(updated);
    localStorage.setItem('agritrust_listings', JSON.stringify(updated));

    // Reset Form
    setNewProductName('');
    setNewDesc('');
    setFormSuccess(true);
    setTimeout(() => setFormSuccess(false), 3000);
  };

  // Thương lái bấm gửi yêu cầu kết nối
  const handleRequestConnection = (listingId: string) => {
    if (!user) return;
    const updated = listings.map(l => {
      if (l.id === listingId) {
        return {
          ...l,
          trang_thai: 'dang_cho_duyet' as const,
          nguoi_mua_ten: user.ten_hien_thi,
        };
      }
      return l;
    });
    setListings(updated);
    localStorage.setItem('agritrust_listings', JSON.stringify(updated));
  };

  // Nông dân duyệt/chấp nhận kết nối cuộc gọi đàm thoại
  const handleAcceptConnection = (listingId: string) => {
    const updated = listings.map(l => {
      if (l.id === listingId) {
        return {
          ...l,
          trang_thai: 'da_ket_noi' as const,
        };
      }
      return l;
    });
    setListings(updated);
    localStorage.setItem('agritrust_listings', JSON.stringify(updated));
  };

  if (loading || !user) {
    return (
      <div className="flex-grow flex items-center justify-center bg-white text-neutral-400 min-h-screen gap-2">
        <Loader2 size={18} className="animate-spin text-[#15803D]" />
        <span className="text-sm font-semibold">Đang tải cấu hình cổng giao thương...</span>
      </div>
    );
  }

  const isNongDan = user.vai_tro === 'nong_dan';

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-[#FBFBFA]">
      
      {/* ═══════════════════════════════════════════
          HEADER - TỐI GIẢN PHONG CÁCH B2B FINTECH
          ═══════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#15803D] flex items-center justify-center text-white font-black text-sm shadow">
                A
              </div>
              <span className="text-sm font-extrabold tracking-tight text-neutral-900">AgriTrust</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1.5">
              <Link href="/" className="btn-ghost gap-1.5 text-[13px] py-1.5 px-3 bg-neutral-100 text-neutral-900">
                <ShoppingBag size={14} /> Chợ Nông Sản B2B
              </Link>
              <Link href="/dashboard" className="btn-ghost gap-1.5 text-[13px] py-1.5 px-3">
                <FileText size={14} /> Quản lý Hợp đồng & Kết nối
              </Link>
            </nav>
          </div>

          {/* Wallet balance + Wallet Connector + User session info */}
          <div className="flex items-center gap-3">
            <WalletBalance />
            <ConnectWalletButton />
            
            <div className="flex items-center gap-2.5 pl-3 border-l border-neutral-200">
              <div className="text-right">
                <p className="text-[12px] font-bold text-neutral-700 leading-none">{user.ten_hien_thi}</p>
                <p className={`text-[10px] mt-0.5 font-bold ${isNongDan ? 'text-[#15803D]' : 'text-indigo-650'}`}>
                  {isNongDan ? 'Nông Dân' : 'Thương Lái'}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-450 hover:text-red-600 transition-colors"
                title="Đổi vai trò / Đăng xuất"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          BẦU KHÔNG KHÍ PHÒNG GIAO DỊCH
          ═══════════════════════════════════════════ */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8 space-y-8">
        
        {/* Welcome banner & Stats */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              Xin chào, {user.ten_hien_thi} <Sparkles size={16} className="text-amber-500" />
            </h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-xl">
              {isNongDan 
                ? 'Đăng tải các lô nông sản của bạn lên chợ. Khi thương lái quan tâm, họ sẽ gửi yêu cầu kết nối cuộc gọi đàm phán video để cùng thảo luận trực tiếp.'
                : 'Tìm kiếm nguồn hàng nông sản tươi sạch uy tín. Kết nối trực tiếp với nông dân bằng đàm thoại thông qua AI trích xuất hợp đồng ký quỹ.'}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-[11px] font-bold bg-[#15803D]/10 text-[#15803D] px-3.5 py-1.5 rounded-full border border-[#15803D]/10">
              1 USDC = 25.000 VNĐ
            </span>
          </div>
        </div>

        {/* Cấu trúc Bố cục Giao thương */}
        <div className="max-w-4xl mx-auto">
          
          {/* CỘT PHÂN PHỐI TIN ĐĂNG / CHỢ NÔNG SẢN B2B */}
          <div className="space-y-6">
            
            {/* Vai trò Nông dân: Đăng bán nông sản */}
            {isNongDan && (
              <div className="card-fintech p-5 bg-white border-neutral-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                  <PlusCircle size={16} className="text-[#15803D]" />
                  <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Đăng Nông Sản Giao Dịch</h3>
                </div>

                {formSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">
                    ✓ Đăng bán nông sản thành công! Tin của bạn đã hiển thị trên Chợ Nông Sản B2B.
                  </div>
                )}

                <form onSubmit={handlePostListing} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-medium">
                  <div className="md:col-span-3">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Tên Nông sản</label>
                    <input 
                      type="text" 
                      value={newProductName} 
                      onChange={(e) => setNewProductName(e.target.value)} 
                      placeholder="Ví dụ: Lúa thơm ST25 vụ Hè Thu"
                      className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-lg text-xs outline-none focus:border-[#15803D] bg-neutral-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Số lượng</label>
                    <input 
                      type="number" 
                      value={newQuantity} 
                      onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-lg text-xs outline-none focus:border-[#15803D] bg-neutral-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Đơn vị tính</label>
                    <select 
                      value={newUnit} 
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-lg text-xs outline-none focus:border-[#15803D] bg-neutral-50"
                    >
                      <option value="tấn">Tấn</option>
                      <option value="kg">Kg</option>
                      <option value="tạ">Tạ</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Đơn giá đề xuất (VNĐ/Đơn vị)</label>
                    <input 
                      type="number" 
                      value={newPrice} 
                      onChange={(e) => setNewPrice(parseInt(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 border border-neutral-250 rounded-lg text-xs outline-none focus:border-[#15803D] bg-neutral-50"
                      required
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Mô tả cam kết chất lượng</label>
                    <textarea 
                      value={newDesc} 
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Mô tả độ ẩm, tỷ lệ hạt lép, phương thức vận chuyển..."
                      className="w-full h-20 px-3.5 py-2.5 border border-neutral-250 rounded-lg text-xs outline-none focus:border-[#15803D] bg-neutral-50 resize-none"
                    />
                  </div>
                  <div className="md:col-span-3 pt-2">
                    <button type="submit" className="btn-primary w-full text-xs font-bold py-2.5 gap-2">
                      <PlusCircle size={15} /> Đăng tải lên chợ nông sản
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Chợ nông sản hoặc bài đăng của tôi */}
            <div className="card-fintech p-5 bg-white border-neutral-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={16} className="text-neutral-500" />
                  <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    {isNongDan ? 'Bài đăng nông nghiệp của tôi' : 'Chợ Nông Sản B2B Việt Nam'}
                  </h3>
                </div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase">Tổng số: {listings.length} tin</span>
              </div>

              <div className="space-y-3.5">
                {listings.map((l) => {
                  const myListing = isNongDan && l.nong_dan_ten === user.ten_hien_thi;
                  return (
                    <div key={l.id} className="p-4 rounded-xl border border-neutral-200 bg-[#FCFDFD] space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-extrabold text-neutral-800 text-[14px]">{l.san_pham}</h4>
                          <span className="text-[10px] text-[#15803D] font-bold block mt-0.5">
                            Chủ nguồn hàng: {l.nong_dan_ten}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-neutral-900">
                            {l.don_gia.toLocaleString('vi-VN')} VNĐ / {l.don_vi_tinh}
                          </p>
                          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                            Quy mô: {l.so_luong} {l.don_vi_tinh}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-500 leading-relaxed">{l.mo_ta}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                        {/* Nhãn trạng thái */}
                        <div>
                          {l.trang_thai === 'chua_ket_noi' && (
                            <span className="text-[10px] bg-neutral-100 text-neutral-500 font-bold uppercase px-2.5 py-1 rounded-full">
                              Sẵn sàng kết nối
                            </span>
                          )}
                          {l.trang_thai === 'dang_cho_duyet' && (
                            <span className="text-[10px] bg-amber-50 text-amber-600 font-bold uppercase px-2.5 py-1 rounded-full border border-amber-100">
                              Đang đợi xác nhận
                            </span>
                          )}
                          {l.trang_thai === 'da_ket_noi' && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold uppercase px-2.5 py-1 rounded-full border border-emerald-100">
                              Đã kết nối cuộc gọi
                            </span>
                          )}
                        </div>

                        {/* Phím hành động theo vai trò */}
                        <div className="flex gap-2">
                          {/* Dành cho Thương lái */}
                          {!isNongDan && (
                            <>
                              {l.trang_thai === 'chua_ket_noi' && (
                                <button 
                                  onClick={() => handleRequestConnection(l.id)}
                                  className="btn-primary bg-indigo-600 hover:bg-indigo-750 text-xs py-1.5 px-4 font-bold"
                                >
                                  Gửi lời mời đàm phán
                                </button>
                              )}
                              {l.trang_thai === 'dang_cho_duyet' && (
                                <span className="text-[11px] text-neutral-400 font-medium">Đang đợi nông dân đồng ý...</span>
                              )}
                              {l.trang_thai === 'da_ket_noi' && (
                                <Link 
                                  href="/dashboard"
                                  className="btn-primary bg-indigo-600 hover:bg-indigo-750 text-xs py-1.5 px-4 font-bold gap-1.5"
                                >
                                  Đã kết nối. Vào phòng đàm phán <ArrowRight size={13} />
                                </Link>
                              )}
                            </>
                          )}

                          {/* Dành cho Nông dân quản lý tin của mình */}
                          {isNongDan && myListing && (
                            <>
                              {l.trang_thai === 'dang_cho_duyet' && (
                                <button 
                                  onClick={() => handleAcceptConnection(l.id)}
                                  className="btn-primary text-xs py-1.5 px-4 font-bold"
                                >
                                  Chấp nhận đàm thoại
                                </button>
                              )}
                              {l.trang_thai === 'da_ket_noi' && (
                                <Link 
                                  href="/dashboard"
                                  className="btn-primary text-xs py-1.5 px-4 font-bold gap-1.5"
                                >
                                  Đã kết nối. Vào phòng đàm phán <ArrowRight size={13} />
                                </Link>
                              )}
                              {l.trang_thai === 'chua_ket_noi' && (
                                <span className="text-[11px] text-neutral-400 font-medium">Đang chờ đối tác liên hệ...</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-4 px-6 text-center text-xs text-neutral-400">
        AgriTrust B2B Escrow Engine · Solana Blockchain Integration
      </footer>

    </div>
  );
}
