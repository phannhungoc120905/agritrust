'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { loginUser } from '../../lib/supabase/queries/auth';
import {
  User,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  Wallet,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingRole, setLoadingRole] = useState<'nong_dan' | 'thuong_lai' | null>(null);

  const handleQuickLogin = async (role: 'nong_dan' | 'thuong_lai') => {
    setLoadingRole(role);
    setErrorMsg('');

    try {
      // Đăng nhập giả lập tương ứng với các user đã seed trong DB
      const username = role === 'nong_dan' ? 'nongdan' : 'thuonglai';
      const user = await loginUser(username, '123');
      
      if (user) {
        login({
          dia_chi_vi: user.dia_chi_vi,
          vai_tro: user.vai_tro,
          ten_dang_nhap: user.ten_dang_nhap,
          ten_hien_thi: user.ten_hien_thi || user.ten_dang_nhap,
        });
      } else {
        // Fallback tự sinh session nếu DB chưa seed hoặc lỗi kết nối
        login({
          dia_chi_vi: role === 'nong_dan' ? 'nong_dan_wallet_address_demo' : 'thuong_lai_wallet_address_demo',
          vai_tro: role,
          ten_dang_nhap: username,
          ten_hien_thi: role === 'nong_dan' ? 'Nông dân Nguyễn Văn Ruộng' : 'Thương lái Trần Thị Thương',
        });
      }
    } catch (err) {
      console.error(err);
      // Fallback
      login({
        dia_chi_vi: role === 'nong_dan' ? 'nong_dan_wallet_address_demo' : 'thuong_lai_wallet_address_demo',
        vai_tro: role,
        ten_dang_nhap: role === 'nong_dan' ? 'nongdan' : 'thuonglai',
        ten_hien_thi: role === 'nong_dan' ? 'Nông dân Nguyễn Văn Ruộng' : 'Thương lái Trần Thị Thương',
      });
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-[#FAFAF9] text-neutral-900 antialiased font-sans px-4">

      <div className="w-full max-w-[420px] space-y-8">

        {/* Logo + Heading */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#15803D] flex items-center justify-center text-white font-black text-xl shadow-md">
            A
          </div>
          <div className="text-center space-y-1.5">
            <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">
              Đăng nhập Cổng Giao Thương
            </h1>
            <p className="text-[13px] text-neutral-500 max-w-sm">
              Chọn vai trò kết nối trực tiếp ví để bắt đầu đàm phán ký quỹ nông sản thông minh trên Solana Blockchain.
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider text-center">
            Chọn vai trò truy cập hệ thống
          </h3>

          <div className="grid grid-cols-1 gap-3.5">
            
            {/* Lựa chọn Nông Dân */}
            <button
              onClick={() => handleQuickLogin('nong_dan')}
              disabled={loadingRole !== null}
              className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 hover:border-[#15803D] hover:bg-[#f0fdf4] text-left transition-all group active:scale-99 cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#15803D]/10 text-[#15803D] flex items-center justify-center group-hover:bg-[#15803D] group-hover:text-white transition-colors">
                  <User size={18} />
                </div>
                <div>
                  <span className="font-bold text-[14px] text-neutral-900 block leading-tight">
                    Nông dân / Hợp tác xã
                  </span>
                  <span className="text-[11px] text-neutral-450 mt-1 block">
                    Đăng bán nông sản, nhận tiền đặt cọc bảo đảm
                  </span>
                </div>
              </div>
              <ArrowRight size={16} className="text-neutral-350 group-hover:text-[#15803D] group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Lựa chọn Thương Lái */}
            <button
              onClick={() => handleQuickLogin('thuong_lai')}
              disabled={loadingRole !== null}
              className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 hover:border-indigo-600 hover:bg-indigo-50/50 text-left transition-all group active:scale-99 cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <User size={18} />
                </div>
                <div>
                  <span className="font-bold text-[14px] text-neutral-900 block leading-tight">
                    Thương lái / Nhà thu mua
                  </span>
                  <span className="text-[11px] text-neutral-450 mt-1 block">
                    Tìm kiếm sản phẩm, kết nối đàm thoại & nạp tiền ký quỹ
                  </span>
                </div>
              </div>
              <ArrowRight size={16} className="text-neutral-350 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </button>

          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-neutral-200"></div>
            <span className="flex-shrink mx-3 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Hoặc kết nối ví vật lý</span>
            <div className="flex-grow border-t border-neutral-200"></div>
          </div>

          {/* Kết nối ví thực tế */}
          <button
            onClick={() => handleQuickLogin('thuong_lai')} // Giả lập login Merchant khi nhấn ví
            disabled={loadingRole !== null}
            className="w-full py-3 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 rounded-xl text-[13px] font-bold text-neutral-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Wallet size={16} className="text-indigo-500" />
            <span>Kết nối Ví Phantom của bạn</span>
          </button>

        </div>

        {/* Bottom info */}
        <div className="text-center text-[11px] text-neutral-400">
          <ShieldCheck size={14} className="inline mr-1 text-neutral-400 align-text-bottom" />
          Bảo mật giao dịch bằng Solana Devnet Smart Contract
        </div>

      </div>
    </div>
  );
}
