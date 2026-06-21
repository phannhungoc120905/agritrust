'use client';

import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import CSS của thư viện Wallet Adapter UI
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

export const WalletContextProvider: FC<Props> = ({ children }) => {
  // Đặt mạng mặc định là Devnet cho demo Hackathon
  const network = WalletAdapterNetwork.Devnet;

  // Sử dụng RPC endpoint của Devnet
  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network);
  }, [network]);

  // Danh sách các ví hỗ trợ, ở đây là Phantom
  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  );

  const onError = React.useCallback((error: any) => {
    console.log('Lỗi kết nối ví (Có thể do người dùng hủy):', error.message);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
