'use client';

import React, { useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../hooks/useAuth';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet } from 'lucide-react';
import { updateWalletAddress } from '../../lib/supabase/queries/auth';

export default function ConnectWalletButton() {
  const { publicKey, connected, disconnect, select, wallets } = useWallet();
  const { user, updateUser } = useAuth();

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
              alert('Ví Phantom này đã được liên kết với một tài khoản khác! \n\nCÁCH SỬA:\n1. Mở tiện ích Phantom ở góc phải trình duyệt.\n2. Bấm vào tên "Account 1" ở trên cùng để chọn sang "Account 2".\n3. Trình duyệt sẽ tự động cập nhật và liên kết thành công!');
            } else {
              console.error('Lỗi đồng bộ ví:', err);
            }
          });
      }
    }
  }, [connected, publicKey, user, updateUser]);

  const handleConnect = async () => {
    if (connected) {
      if (confirm('Bạn có muốn ngắt kết nối ví hiện tại để liên kết ví khác không?')) {
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

  return (
    <button
      onClick={handleConnect}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
        connected
          ? 'bg-emerald-50 text-[#15803D] border border-emerald-200 hover:bg-emerald-100'
          : 'bg-[#15803D] text-white hover:bg-[#166534] hover:shadow-md'
      }`}
      title={connected ? 'Ví đã kết nối' : 'Kết nối ví Phantom'}
    >
      <Wallet size={16} />
      {connected || user?.dia_chi_vi ? (
        <span className="flex items-center gap-1.5 font-mono text-[13px]">
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${connected && publicKey?.toBase58() === user?.dia_chi_vi ? 'bg-[#15803D]' : 'bg-amber-500'}`}></span>
          {user?.dia_chi_vi ? (
            <>{user.dia_chi_vi.slice(0, 4)}...{user.dia_chi_vi.slice(-4)}</>
          ) : publicKey ? (
            <>{publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}</>
          ) : 'Đang tải...'}
        </span>
      ) : (
        <span>Kết nối ví</span>
      )}
    </button>
  );
}
