'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConnectWalletButton from '../../components/shared/ConnectWalletButton';
import WalletBalance from '../../components/shared/WalletBalance';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase/client';
import { encodeMeetingParams } from '../../lib/utils/url';
import {
  Video,
  FileText,
  LogOut,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShoppingBag,
  ArrowRight,
  Handshake
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

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [connections, setConnections] = useState<Listing[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);

  // Khởi tạo phiên làm việc
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load danh sách kết nối (từ tin đăng)
  useEffect(() => {
    if (!user) return;

    const storedListings = localStorage.getItem('agritrust_listings');
    if (storedListings) {
      const allListings: Listing[] = JSON.parse(storedListings);
      // Chỉ lấy các tin đăng có liên quan đến user hiện tại và KHÔNG phải trạng thái 'chua_ket_noi'
      // Đối với nông dân: Lấy tin của họ đã có người mua gửi yêu cầu
      // Đối với thương lái: Lấy tin mà họ đã gửi yêu cầu
      const myConnections = allListings.filter(l => {
        if (l.trang_thai === 'chua_ket_noi') return false;
        if (user.vai_tro === 'nong_dan') {
          return l.nong_dan_ten === user.ten_hien_thi;
        } else {
          return l.nguoi_mua_ten === user.ten_hien_thi;
        }
      });
      setConnections(myConnections);
    }

    loadDbContracts();
  }, [user]);

  // Tải danh sách hợp đồng thực tế từ Supabase
  const loadDbContracts = async () => {
    try {
      setLoadingContracts(true);
      const { data, error } = await supabase
        .from('hop_dong')
        .select('*')
        .order('ngay_tao', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setContracts([]);
      } else {
        const formattedDb = data.map((d: any) => ({
          id: d.id.slice(0, 8),
          dbId: d.id,
          san_pham: d.san_pham,
          so_luong: `${d.so_luong} ${d.don_vi_tinh}`,
          gia: `${(d.don_gia * d.so_luong).toLocaleString('vi-VN')} VNĐ`,
          trang_thai: d.trang_thai,
          doi_tac: user?.vai_tro === 'nong_dan' ? 'Thương lái Trần Thị Thương' : 'Nông dân Nguyễn Văn Ruộng',
        }));
        setContracts(formattedDb);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContracts(false);
    }
  };

  const handleAcceptConnection = (listingId: string) => {
    // Cập nhật localStorage
    const storedListings = localStorage.getItem('agritrust_listings');
    if (storedListings) {
      const allListings: Listing[] = JSON.parse(storedListings);
      const updated = allListings.map(l => {
        if (l.id === listingId) {
          return { ...l, trang_thai: 'da_ket_noi' as const };
        }
        return l;
      });
      localStorage.setItem('agritrust_listings', JSON.stringify(updated));

      // Cập nhật state nội bộ dashboard
      const myConnections = updated.filter(l => {
        if (l.trang_thai === 'chua_ket_noi') return false;
        if (user?.vai_tro === 'nong_dan') {
          return l.nong_dan_ten === user?.ten_hien_thi;
        } else {
          return l.nguoi_mua_ten === user?.ten_hien_thi;
        }
      });
      setConnections(myConnections);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-grow flex items-center justify-center bg-white text-neutral-400 min-h-screen gap-2">
        <Loader2 size={18} className="animate-spin text-[#15803D]" />
        <span className="text-sm font-semibold">Đang tải Dashboard...</span>
      </div>
    );
  }

  const isNongDan = user.vai_tro === 'nong_dan';

  const statusMap: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
    du_thao: { label: 'Dự thảo', class: 'badge-status-expired', icon: <FileText size={12} /> },
    da_khoa_tien: { label: 'Đã ký quỹ', class: 'badge-status-pending', icon: <Clock size={12} /> },
    da_xac_nhan: { label: 'Đã giải ngân', class: 'badge-status-success', icon: <CheckCircle2 size={12} /> },
    da_giai_quyet: { label: 'Đã phân xử', class: 'badge-status-success', icon: <CheckCircle2 size={12} /> },
    dang_tranh_chap: { label: 'Tranh chấp', class: 'badge-status-dispute', icon: <AlertCircle size={12} /> },
    qua_han: { label: 'Quá hạn', class: 'badge-status-expired', icon: <AlertCircle size={12} /> },
  };

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-[#FBFBFA]">

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#15803D] flex items-center justify-center text-white font-black text-sm shadow">
                A
              </div>
              <span className="text-sm font-extrabold tracking-tight text-neutral-900">AgriTrust</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1.5">
              <Link href="/" className="btn-ghost gap-1.5 text-[13px] py-1.5 px-3">
                <ShoppingBag size={14} /> Chợ Nông Sản B2B
              </Link>
              <Link href="/dashboard" className="btn-ghost gap-1.5 text-[13px] py-1.5 px-3 bg-neutral-100 text-neutral-900">
                <FileText size={14} /> Quản lý Hợp đồng & Kết nối
              </Link>
            </nav>
          </div>

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

      {/* MAIN CONTENT */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8 space-y-8">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Dashboard Quản lý</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* CỘT 1: QUẢN LÝ KẾT NỐI (CUỘC HẸN ĐÀM PHÁN) */}
          <div className="space-y-6">
            <div className="card-fintech bg-white border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Handshake size={15} className="text-indigo-600" />
                  <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Phiên đàm phán</h3>
                </div>
              </div>

              <div className="divide-y divide-neutral-100">
                {connections.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400">Không có phiên đàm phán nào.</div>
                ) : (
                  connections.map((c) => (
                    <div key={c.id} className="p-5 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-extrabold text-neutral-800 text-[13px] truncate">{c.san_pham}</h4>
                          {c.trang_thai === 'dang_cho_duyet' ? (
                            <span className="text-[9px] bg-amber-50 text-amber-600 font-bold uppercase px-2 py-0.5 rounded-full border border-amber-100">
                              Chờ duyệt
                            </span>
                          ) : (
                            <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold uppercase px-2 py-0.5 rounded-full border border-emerald-100">
                              Sẵn sàng
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500">Đối tác: {isNongDan ? c.nguoi_mua_ten : c.nong_dan_ten}</p>
                        <p className="text-[11px] text-neutral-500 font-mono mt-0.5">Giá dự kiến: {c.don_gia.toLocaleString('vi-VN')} VNĐ</p>
                      </div>

                      <div className="flex-shrink-0">
                        {isNongDan && c.trang_thai === 'dang_cho_duyet' && (
                          <button
                            onClick={() => handleAcceptConnection(c.id)}
                            className="btn-primary text-xs py-1.5 px-3 font-bold"
                          >
                            Đồng ý
                          </button>
                        )}
                        {(!isNongDan && c.trang_thai === 'dang_cho_duyet') && (
                          <span className="text-[11px] text-neutral-400 font-medium">Đang đợi nông dân...</span>
                        )}
                        {c.trang_thai === 'da_ket_noi' && (
                          <Link
                            href={`/call?p=${encodeMeetingParams({
                              channel: c.id,
                              scenario: 'A',
                              product: c.san_pham,
                              partner: isNongDan ? c.nguoi_mua_ten || 'Thương lái' : c.nong_dan_ten || 'Nông dân'
                            })}`}
                            className="btn-primary bg-indigo-600 hover:bg-indigo-750 text-xs py-1.5 px-3 font-bold gap-1.5"
                          >
                            <Video size={13} /> Vào phòng
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* CỘT 2: QUẢN LÝ HỢP ĐỒNG */}
          <div className="space-y-6">
            <div className="card-fintech bg-white border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-[#15803D]" />
                  <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Hồ sơ Hợp đồng</h3>
                </div>
              </div>

              <div className="divide-y divide-neutral-100">
                {loadingContracts ? (
                  <div className="p-6 text-center text-xs text-neutral-400">Đang tải hồ sơ...</div>
                ) : (
                  contracts.map((c) => {
                    const status = statusMap[c.trang_thai] || statusMap.du_thao;
                    const detailUrl = c.dbId
                      ? `/contract/${c.dbId}?scenario=${localStorage.getItem('agritrust_demo_scenario') || 'A'}`
                      : `/contract/dummy?scenario=${localStorage.getItem('agritrust_demo_scenario') || 'A'}`;
                    return (
                      <Link
                        key={c.id}
                        href={detailUrl}
                        className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-neutral-900 font-mono">#{c.id}</span>
                            <span className={`${status.class} gap-1 text-[10px]`}>
                              {status.icon}
                              {status.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-1 truncate">
                            {c.san_pham} · {c.so_luong}
                          </p>
                          <p className="text-[10px] text-neutral-450 mt-0.5 truncate">
                            Đối tác: {c.doi_tac}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="text-[12px] font-bold text-[#15803D] font-mono">{c.gia}</p>
                          <ArrowRight size={13} className="text-neutral-300 group-hover:text-[#15803D] transition-colors ml-auto mt-1" />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="bg-white border-t border-neutral-200 py-4 px-6 text-center text-xs text-neutral-400">
        AgriTrust B2B Escrow Engine · Solana Blockchain Integration
      </footer>

    </div>
  );
}
