'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import ConnectWalletButton from '../../components/shared/ConnectWalletButton';
import WalletBalance from '../../components/shared/WalletBalance';
import { useWallet } from '../../hooks/useWallet';
import { UserCircle, MapPin, Calendar, ShieldCheck, Mail, Wallet, ChevronLeft, ChevronRight, Loader2, Award, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { publicKey, connected: walletConnected, select, wallets } = useWallet();
  const [dbUser, setDbUser] = useState<any>(null);
  const [contractCount, setContractCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        // Lấy thông tin user
        const { data, error } = await supabase
          .from('nguoi_dung')
          .select('*')
          .eq('dia_chi_vi', user.dia_chi_vi)
          .single();
          
        if (data) {
          setDbUser(data);
        } else {
          console.warn("Không tìm thấy user trong DB:", error);
          setDbUser({
            dia_chi_vi: user.dia_chi_vi,
            vai_tro: user.vai_tro,
            ten_dang_nhap: user.ten_dang_nhap,
            ten_hien_thi: user.ten_hien_thi,
            ngay_tao: new Date().toISOString()
          });
        }

        // Lấy dữ liệu thật: Đếm tổng số hợp đồng của user này
        const isNongDan = user.vai_tro === 'nong_dan';
        const { count } = await supabase
          .from('hop_dong')
          .select('*', { count: 'exact', head: true })
          .eq(isNongDan ? 'vi_nguoi_ban' : 'vi_nguoi_mua', user.dia_chi_vi);
        
        setContractCount(count || 0);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    if (!authLoading) {
      if (user) {
        fetchProfile();
      } else {
        router.push('/login');
      }
    }
  }, [user, authLoading, supabase, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin text-[#15803D]" />
        <span className="font-semibold text-slate-500">Đang tải hồ sơ từ Database...</span>
      </div>
    );
  }

  if (!user || !dbUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500 font-bold">Vui lòng đăng nhập để xem hồ sơ.</p>
        <Link href="/" className="text-[#15803D] hover:underline font-semibold">Quay về trang chủ</Link>
      </div>
    );
  }

  const isNongDan = dbUser.vai_tro === 'nong_dan';
  const roleLabel = isNongDan ? 'NÔNG DÂN' : 'THƯƠNG LÁI';
  const roleColor = isNongDan ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200';
  const joinedDate = new Date(dbUser.ngay_tao).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* HEADER TƯƠNG THÍCH VỚI APP/PAGE.TSX */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors mr-1">
              <ChevronLeft size={20} />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-[#15803D] flex items-center justify-center text-white font-black text-lg shadow-md">A</div>
            <Link href="/" className="text-lg font-extrabold tracking-tight text-slate-900 hover:text-[#15803D] transition-colors">
              AgriTrust
            </Link>
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
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-8 animate-fade-in-up">
        {/* Cover & Avatar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
          {/* Cover background */}
          <div className="h-32 w-full bg-gradient-to-r from-[#15803D] to-emerald-400"></div>
          
          <div className="px-8 pb-8">
            <div className="relative flex justify-between items-end -mt-12 mb-4">
              <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
                <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200">
                  <UserCircle size={64} />
                </div>
              </div>
              
              <div className="pb-2">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${roleColor} shadow-sm`}>
                  {roleLabel}
                </span>
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                {dbUser.ten_hien_thi}
              </h1>
              <p className="text-slate-500 font-medium text-sm mt-1">Tài khoản: @{dbUser.ten_dang_nhap}</p>
            </div>
            
            <p className="mt-4 text-sm text-slate-600 max-w-2xl leading-relaxed">
              Thông tin hồ sơ được trích xuất trực tiếp từ Cơ sở dữ liệu AgriTrust.
            </p>

            <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                <Calendar size={16} className="text-slate-400" />
                Tham gia: {joinedDate}
              </div>
            </div>
          </div>
        </div>

        {/* Thông tin Database / Ví */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Wallet size={20} className="text-[#15803D]" />
                Thông tin Định danh
              </h2>
              
              <div className="space-y-4">
                <div className={`p-5 rounded-2xl border relative overflow-hidden transition-all duration-300 ${walletConnected ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/30 border-amber-200'}`}>
                  {walletConnected && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-100 to-transparent opacity-50 rounded-tr-2xl pointer-events-none"></div>
                  )}
                  
                  <div className="flex justify-between items-center mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <Wallet size={18} className={walletConnected ? 'text-emerald-600' : 'text-amber-500'} />
                      <p className={`text-xs font-black uppercase tracking-wider ${walletConnected ? 'text-emerald-800' : 'text-amber-800'}`}>
                        Địa chỉ ví Solana
                      </p>
                    </div>
                    {walletConnected && (
                       <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-200 shadow-sm">
                         Đã Kết Nối
                       </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-4 relative z-10">
                    <div className={`p-3 rounded-xl border ${walletConnected ? 'bg-white border-emerald-100 shadow-sm' : 'bg-white/60 border-amber-100'}`}>
                      <p className={`text-sm font-mono font-medium break-all ${walletConnected ? 'text-emerald-900' : 'text-slate-500 italic'}`}>
                        {walletConnected && publicKey ? (
                          <span className="flex items-center gap-2">
                            {publicKey.toBase58()}
                          </span>
                        ) : (
                          dbUser.dia_chi_vi
                        )}
                      </p>
                    </div>

                    {!walletConnected && (
                      <button 
                        onClick={() => {
                          const phantomWallet = wallets.find((w) => w.adapter.name === 'Phantom') || wallets[0];
                          if (phantomWallet) {
                            select(phantomWallet.adapter.name);
                          } else {
                            alert('Vui lòng cài đặt ví Phantom để kết nối.');
                          }
                        }} 
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border-2 border-amber-300 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-50 hover:border-amber-400 transition-all shadow-sm group"
                      >
                        Kết Nối Ví Phantom Thật
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Tên đăng nhập (Unique)</p>
                  <p className="text-sm text-slate-900 font-medium">{dbUser.ten_dang_nhap}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#15803D]" />
                Thống kê Dữ liệu
              </h2>
              
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-center items-center h-32">
                <p className="text-sm text-emerald-600 font-bold uppercase tracking-wider mb-2">Tổng Hợp Đồng Đã Tham Gia</p>
                <p className="text-4xl font-black text-emerald-900">{contractCount}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
