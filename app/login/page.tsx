'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../lib/useLanguage';
import { loginUser } from '../../lib/supabase/queries/auth';
import {
  User,
  Lock,
  ShieldCheck,
  LogIn,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const { login } = useAuth();
  const { isEnglish } = useLanguage();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg(isEnglish ? 'Please enter both username and password.' : 'Vui lòng điền đầy đủ Tên đăng nhập và Mật khẩu.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const user = await loginUser(username, password);

      if (user) {
        login({
          ...user,
          ten_hien_thi: user.ten_hien_thi || user.ten_dang_nhap,
        }, redirectPath || undefined);
      } else {
        setErrorMsg(isEnglish ? 'Incorrect username or password. Please try again.' : 'Sai Tên đăng nhập hoặc Mật khẩu. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(isEnglish ? 'A system connection error occurred. Please try again.' : 'Đã xảy ra lỗi kết nối với hệ thống. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-[#FAFAF9] text-neutral-900 antialiased font-sans px-4 py-12">
      <div className="w-full max-w-[480px] space-y-8 animate-fade-in">

        {/* Logo + Heading */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#15803D] flex items-center justify-center text-white font-black text-2xl shadow-lg hover:rotate-6 transition-transform">
            A
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              {isEnglish ? 'Sign in to AgriTrust' : 'Đăng nhập AgriTrust'}
            </h1>
            <p className="text-sm text-neutral-500 max-w-md leading-relaxed">
              {isEnglish ? 'Sign in to the secure B2B agriculture trading portal powered by Solana Blockchain.' : 'Đăng nhập cổng giao dịch nông sản B2B thông minh bảo mật bằng Solana Blockchain.'}
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-md space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-600 flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Input Tên đăng nhập */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                {isEnglish ? 'Username' : 'Tên đăng nhập'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isEnglish ? 'nongdan or thuonglai' : 'nongdan hoặc thuonglai'}
                  className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] transition-all outline-none"
                  disabled={isLoading}
                  suppressHydrationWarning
                />
              </div>
            </div>

            {/* Input Mật khẩu */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                {isEnglish ? 'Password' : 'Mật khẩu'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEnglish ? 'Enter password' : 'Nhập mật khẩu'}
                  className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-[#15803D]/20 focus:border-[#15803D] transition-all outline-none"
                  disabled={isLoading}
                  suppressHydrationWarning
                />
              </div>
            </div>

            {/* Nút Đăng nhập */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#15803D] hover:bg-[#166534] disabled:bg-slate-300 text-white rounded-2xl text-sm font-bold shadow-md shadow-emerald-900/10 hover:shadow-emerald-900/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>{isEnglish ? 'Sign in' : 'Đăng nhập'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Tips */}
          <div className="p-3.5 bg-amber-50/65 border border-amber-200/60 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
              <Sparkles size={13} />
              <span>{isEnglish ? 'Demo accounts for judges:' : 'Gợi ý tài khoản Demo cho giám khảo:'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-amber-700">
              <div>
                <p className="font-semibold">{isEnglish ? 'Farmer:' : 'Nông dân:'}</p>
                <code className="bg-amber-100/50 px-1 py-0.5 rounded text-[10px]">nongdan</code> / <code className="bg-amber-100/50 px-1 py-0.5 rounded text-[10px]">123</code>
              </div>
              <div>
                <p className="font-semibold">{isEnglish ? 'Trader:' : 'Thương lái:'}</p>
                <code className="bg-amber-100/50 px-1 py-0.5 rounded text-[10px]">thuonglai</code> / <code className="bg-amber-100/50 px-1 py-0.5 rounded text-[10px]">123</code>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-[12px] text-slate-500">
              {isEnglish ? 'No account yet? ' : 'Chưa có tài khoản? '}
              <Link href="/register" className="font-bold text-[#15803D] hover:underline">
                {isEnglish ? 'Register now' : 'Đăng ký ngay'}
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom info */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck size={14} className="text-slate-400" />
          <span>{isEnglish ? 'Secured by Solana Devnet Smart Contract' : 'Bảo mật giao dịch bằng Solana Devnet Smart Contract'}</span>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#FAFAF9] text-neutral-450 gap-2">
        <span className="w-5 h-5 border-2 border-[#15803D]/30 border-t-[#15803D] rounded-full animate-spin"></span>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
