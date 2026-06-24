import { LAMPORTS_PER_SOL } from '@solana/web3.js';

// Tỉ giá quy đổi (ước lượng cho hackathon demo)
// 1 SOL ≈ 4,000,000 VNĐ
export const VND_PER_SOL = 4_000_000;

// Giữ lại hằng số cũ cho backwards compat
export const EXCHANGE_RATE_VND_USDC = VND_PER_SOL;

/**
 * Quy đổi VNĐ sang SOL (số thực, 6 chữ số thập phân)
 * @deprecated Dùng convertVndToLamports để gọi on-chain
 */
export function convertVndToUsdc(vnd: number): number {
  const sol = vnd / VND_PER_SOL;
  return Math.round(sol * 1_000_000) / 1_000_000;
}

/**
 * Quy đổi SOL/USDC sang VNĐ
 */
export function convertUsdcToVnd(sol: number): number {
  return Math.round(sol * VND_PER_SOL);
}

/**
 * Quy đổi VNĐ sang lamports (đơn vị on-chain của SOL)
 * 1 SOL = 1,000,000,000 lamports
 * Đây là hàm cần dùng khi gọi smart contract
 */
export function convertVndToLamports(vnd: number): bigint {
  const sol = vnd / VND_PER_SOL;
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}

/**
 * Quy đổi lamports sang VNĐ (hiển thị UI)
 */
export function convertLamportsToVnd(lamports: bigint | number): number {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  return Math.round(sol * VND_PER_SOL);
}

/**
 * Format số SOL để hiển thị ra UI (ví dụ: "0.025 SOL")
 */
export function formatSol(lamports: bigint | number): string {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  return `${sol.toFixed(6)} SOL`;
}
