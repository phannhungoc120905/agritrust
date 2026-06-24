'use client';

import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { type Adapter, WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import CSS cua Wallet Adapter UI.
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

export const WalletContextProvider: FC<Props> = ({ children }) => {
  // Dung Devnet cho demo Hackathon.
  const network = WalletAdapterNetwork.Devnet;

  // Uu tien RPC endpoint tu bien moi truong, fallback ve Devnet mac dinh.
  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network);
  }, [network]);

  // Phantom va cac vi Solana Standard se duoc WalletProvider tu phat hien.
  const wallets = useMemo<Adapter[]>(() => [], []);

  const onError = React.useCallback((error: any) => {
    console.log('Loi ket noi vi (co the do nguoi dung huy):', error.message);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
