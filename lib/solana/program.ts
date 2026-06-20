import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import idl from './idl.json';

// Cluster endpoint - Sử dụng Devnet cho Hackathon
const opts = {
  preflightCommitment: 'processed' as const,
};

export const programId = new PublicKey(idl.address);

// Hàm lấy kết nối Solana Devnet
export function getConnection() {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  return new Connection(endpoint, opts.preflightCommitment);
}

// Hàm khởi tạo Anchor Program từ ví và kết nối
export function getProgram(wallet: any) {
  const connection = getConnection();
  
  const provider = new AnchorProvider(
    connection,
    wallet,
    opts
  );

  return new Program(idl as any, provider);
}
