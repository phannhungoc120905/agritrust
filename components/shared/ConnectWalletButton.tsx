'use client';

import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { Wallet } from 'lucide-react';

export default function ConnectWalletButton() {
  const { publicKey, connected, disconnect, select, wallets } = useWallet();

  const handleConnect = async () => {
    if (connected) {
      await disconnect();
    } else {
      const phantomWallet = wallets.find((w) => w.adapter.name === 'Phantom') || wallets[0];
      if (phantomWallet) {
        select(phantomWallet.adapter.name);
      } else {
        alert('Vui lòng cài đặt ví Phantom để tiếp tục sử dụng hệ thống.');
      }
    }
  };

  return (
    <button
      onClick={handleConnect}
      className={`btn-secondary text-[13px] ${
        connected
          ? 'gap-2 border-[#15803D] text-[#15803D] bg-[#f0fdf4]'
          : 'w-9 h-9 flex items-center justify-center p-0'
      }`}
      title={connected ? 'Ví đã kết nối' : 'Kết nối ví Phantom'}
    >
      <Wallet size={connected ? 15 : 18} />
      {connected && (
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]"></span>
          {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
        </span>
      )}
    </button>
  );
}
