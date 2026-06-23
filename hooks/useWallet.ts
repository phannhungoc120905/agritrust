import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import { getConnection } from '../lib/solana/program';

export function useWallet() {
  const { wallet, publicKey, connected, sendTransaction, select, disconnect, wallets } = useSolanaWallet();
  const [balance, setBalance] = useState<number>(0);

  // Cập nhật số dư ví SOL tự động khi kết nối
  useEffect(() => {
    if (!publicKey) {
      setBalance(0);
      return;
    }

    const connection = getConnection();
    
    const fetchBalance = async () => {
      try {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / 1e9); // Convert Lamports to SOL
      } catch (err) {
        console.error('Không thể lấy số dư ví SOL:', err);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // refresh sau mỗi 10 giây
    return () => clearInterval(interval);
  }, [publicKey]);

  return {
    wallet,
    publicKey,
    connected,
    balance,
    sendTransaction,
    select,
    disconnect,
    wallets,
  };
}
