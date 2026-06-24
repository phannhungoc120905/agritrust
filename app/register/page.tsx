'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { registerUser } from '../../lib/supabase/queries/auth';
import { Keypair } from '@solana/web3.js';
import {
  User,
  Lock,
  ShieldCheck,
  UserPlus,
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Phone,
  MapPin,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  // Step 1
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'nong_dan' | 'thuong_lai'>('nong_dan');
  
  // Step 2
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const nextStep = () => {
    if (!username.trim() || !password || !displayName.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const prevStep = () => {
    setStep(1);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setErrorMsg('Vui lòng điền Họ tên và Số điện thoại liên hệ.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      // Auto-generate a valid Solana public key for database compatibility
      const generatedWalletAddress = Keypair.generate().publicKey.toBase58();

      const newUser = await registerUser({
        dia_chi_vi: generatedWalletAddress,
        vai_tro: role,
        ten_dang_nhap: username.trim(),
        mat_khau: password,
        ten_hien_thi: displayName.trim(),
        ho_ten: fullName.trim(),
        so_dien_thoai: phone.trim(),
        dia_chi: address.trim(),
      });

      if (newUser) {
        login({
          ...newUser,
          ten_hien_thi: newUser.ten_hien_thi || newUser.ten_dang_nhap,
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('duplicate key')) {
        setErrorMsg('Tên đăng nhập đã tồn tại trong hệ thống.');
        setStep(1); // Quay lại step 1 để sửa username
      } else {
        setErrorMsg(err.message || 'Đã xảy ra lỗi đăng ký tài khoản. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-[#FAFAF9] text-neutral-900 antialiased font-sans px-4 py-12">
      <div className="w-full max-w-[520px] space-y-8 animate-fade-in">
        
        {/* Logo + Heading */}
        <div className="flex flex-col items-center space-y-3">
          <Link href="/login" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#15803D] transition-colors self-start mb-2">
            <ArrowLeft size={14} /> Quay lại Đăng nhập
          </Link>
          <div className="w-14 h-14 rounded-2xl bg-[#15803D] flex items-center justify-center text-white font-black text-2xl shadow-lg hover:rotate-6 transition-transform">
            A
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Đăng ký Tài khoản Mới
            </h1>
            <p className="text-sm text-neutral-500 max-w-md leading-relaxed">
              Tạo tài khoản để tham gia mạng lưới kết nối nông sản AgriTrust.
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-md space-y-6">
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`h-2 rounded-full flex-1 ${step >= 1 ? 'bg-[#15803D]' : 'bg-slate-200'}`}></div>
            <div className={`h-2 rounded-full flex-1 ${step >= 2 ? 'bg-[#15803D]' : 'bg-slate-200'}`}></div>
          </div>

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); nextStep(); } : handleSubmit} className="space-y-5">
            
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-600 flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                {/* Vai trò */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Vai trò của bạn <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('nong_dan')}
                      className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        role === 'nong_dan'
                          ? 'border-[#15803D] bg-[#f0fdf4] text-[#15803D] ring-2 ring-[#15803D]/10'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <User size={15} />
                      <span>Nông dân / HTX</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('thuong_lai')}
                      className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        role === 'thuong_lai'
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600 ring-2 ring-indigo-600/10'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Briefcase size={15} />
                      <span>Thương lái / Thu mua</span>
                    </button>
                  </div>
                </div>

                {/* Tên hiển thị */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Tên Doanh nghiệp / Trang trại (Tên hiển thị) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                      <Briefcase size={16} />
                    </span>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={role === 'nong_dan' ? "Ví dụ: HTX Lúa Chín, Vườn Anh Ruộng..." : "Ví dụ: Công ty Nông sản Xanh..."}
                      className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Tên đăng nhập */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Tên đăng nhập (Username) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nhập tên đăng nhập viết liền không dấu"
                      className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Mật khẩu */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                      <Lock size={16} />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu truy cập"
                      className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] transition-all outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  <span>Tiếp tục: Thông tin cá nhân</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <p className="text-sm text-slate-600 mb-2 font-medium">
                  Vui lòng cung cấp thông tin người đại diện thực tế để AI tự động điền vào <b>Hợp Đồng Điện Tử</b>.
                </p>

                {/* Họ tên */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Họ và tên người đại diện (Pháp lý) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] transition-all outline-none"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Số điện thoại */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Số điện thoại liên lạc <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                      <Phone size={16} />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09xx xxx xxx"
                      className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] transition-all outline-none"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Địa chỉ */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Địa chỉ (Tuỳ chọn)
                  </label>
                  <div className="relative">
                    <span className="absolute top-3.5 left-4 text-slate-400">
                      <MapPin size={16} />
                    </span>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      rows={2}
                      className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] transition-all outline-none resize-none"
                      disabled={isLoading}
                    ></textarea>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={isLoading}
                    className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-bold transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3.5 bg-[#15803D] hover:bg-[#166534] disabled:bg-slate-300 text-white rounded-2xl text-sm font-bold shadow-md shadow-emerald-900/10 hover:shadow-emerald-900/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        <span>Đăng ký tài khoản</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="text-center pt-2 border-t border-slate-100 mt-6">
            <p className="text-[12px] text-slate-500 mt-4">
              Đã có tài khoản?{' '}
              <Link href="/login" className="font-bold text-[#15803D] hover:underline">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom info */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck size={14} className="text-slate-400" />
          <span>Thông tin đồng bộ on-chain Solana Blockchain</span>
        </div>

      </div>
    </div>
  );
}
