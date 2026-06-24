'use client';

import React, { useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../lib/useLanguage';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet } from 'lucide-react';
import { updateWalletAddress } from '../../lib/supabase/queries/auth';

export default function ConnectWalletButton() {
  const { publicKey, connected, disconnect, balance } = useWallet();
  const { user, updateUser } = useAuth();
  const { isEnglish } = useLanguage();
  const { setVisible } = useWalletModal();

  // Lưu địa chỉ ví vào database khi kết nối thành công
  useEffect(() => {
    if (connected && publicKey && user) {
      const newAddress = publicKey.toBase58();
      // Chỉ cập nhật nếu địa chỉ ví thay đổi so với trong session
      if (user.dia_chi_vi !== newAddress) {
        updateWalletAddress(user.ten_dang_nhap, newAddress)
          .then(() => {
            console.log('Đã đồng bộ địa chỉ ví lên Database:', newAddress);
            updateUser({ ...user, dia_chi_vi: newAddress });
          })
          .catch((err) => {
            if (err.message?.includes('duplicate key') || err.code === '23505') {
              console.warn('Ví đã tồn tại trong DB, từ chối cập nhật.');
              alert(isEnglish
                ? 'This Phantom wallet is already linked to another account! \n\nFIX:\n1. Open the Phantom extension in the top-right of your browser.\n2. Click "Account 1" at the top and switch to "Account 2".\n3. The browser will refresh and link successfully.'
                : 'Ví Phantom này đã được liên kết với một tài khoản khác! \n\nCÁCH SỬA:\n1. Mở tiện ích Phantom ở góc phải trình duyệt.\n2. Bấm vào tên "Account 1" ở trên cùng để chọn sang "Account 2".\n3. Trình duyệt sẽ tự động cập nhật và liên kết thành công!');
            } else {
              console.error('Lỗi đồng bộ ví:', err);
            }
          });
      }
    }
  }, [connected, publicKey, user, updateUser]);

  const handleConnect = async () => {
    if (connected) {
      if (confirm(isEnglish ? 'Do you want to disconnect the current wallet to link another one?' : 'Bạn có muốn ngắt kết nối ví hiện tại để liên kết ví khác không?')) {
        try {
          await disconnect();
        } catch (err) {
          console.error('Lỗi khi ngắt kết nối ví:', err);
        }
      }
    } else {
      setVisible(true);
    }
  };

  const walletAddress = user?.dia_chi_vi || publicKey?.toBase58() || '';

  return (
    <button
      onClick={handleConnect}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm border cursor-pointer hover:shadow-md ${
        connected
          ? 'bg-slate-900 border-slate-800 text-white hover:bg-black'
          : 'bg-[#2e7d32] border-[#2e7d32] text-white hover:bg-[#1b5e20] hover:scale-[1.02] hover:shadow-md'
      }`}
      title={walletAddress ? (isEnglish ? `Full Address: ${walletAddress}` : `Địa chỉ đầy đủ: ${walletAddress}`) : (isEnglish ? 'Connect Phantom wallet' : 'Kết nối ví Phantom')}
    >
      <Wallet size={15} className={connected ? 'text-emerald-400' : 'text-white'} />
      {connected && walletAddress ? (
        <span className="flex items-center gap-1.5 font-mono">
          <span className="text-[#f9a825] font-black">{balance.toFixed(4)} SOL</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-200">
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </span>
        </span>
      ) : walletAddress ? (
        <span className="flex items-center gap-1.5 font-mono">
          <span className="text-slate-350">
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </span>
        </span>
      ) : (
        <span>{isEnglish ? 'Connect Wallet' : 'Kết nối ví'}</span>
      )}
    </button>
  );
}
