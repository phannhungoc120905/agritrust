export const EXCHANGE_RATE_VND_USDC = 4000000; // 1 SOL = ~4,000,000 VND

/**
 * Quy đổi từ VNĐ sang SOL
 * @param vnd Số tiền bằng VNĐ
 * @returns Số tiền bằng USDC (lấy tối đa 6 chữ số thập phân, chuẩn USDC)
 */
export function convertVndToUsdc(vnd: number): number {
  const usdc = vnd / EXCHANGE_RATE_VND_USDC;
  return Math.round(usdc * 1000000) / 1000000;
}

/**
 * Quy đổi từ USDC sang VNĐ
 * @param usdc Số tiền bằng USDC
 * @returns Số tiền bằng VNĐ (làm tròn thành số nguyên)
 */
export function convertUsdcToVnd(usdc: number): number {
  return Math.round(usdc * EXCHANGE_RATE_VND_USDC);
}
