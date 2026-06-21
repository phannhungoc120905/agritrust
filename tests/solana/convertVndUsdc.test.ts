import assert from 'node:assert';
import { convertVndToUsdc, convertUsdcToVnd, EXCHANGE_RATE_VND_USDC } from '../../lib/solana/convertVndUsdc';

export function runConvertTests() {
  console.log("▶️ Đang kiểm tra tỷ giá và chuyển đổi VNĐ - USDC...");

  // Test 1: Kiểm tra hằng số tỷ giá
  assert.strictEqual(EXCHANGE_RATE_VND_USDC, 25000, "Tỷ giá mặc định phải là 25,000 VND = 1 USDC");

  // Test 2: Chuyển đổi từ VND sang USDC
  const usdcVal = convertVndToUsdc(100000); // 100,000 VND / 25,000 = 4 USDC
  assert.strictEqual(usdcVal, 4, "100,000 VND phải đổi được đúng 4 USDC");

  // Test 3: Làm tròn số thập phân tối đa 6 chữ số (chuẩn USDC decimals)
  const usdcValFraction = convertVndToUsdc(10000); // 10,000 VND / 25,000 = 0.4 USDC
  assert.strictEqual(usdcValFraction, 0.4, "10,000 VND phải đổi được đúng 0.4 USDC");

  // Test 4: Chuyển đổi ngược từ USDC sang VND
  const vndVal = convertUsdcToVnd(4);
  assert.strictEqual(vndVal, 100000, "4 USDC phải đổi được đúng 100,000 VND");

  // Test 5: Quy đổi chính xác số lượng lẻ
  const oddUsdc = convertVndToUsdc(25000 * 10.56789);
  assert.strictEqual(oddUsdc, 10.56789, "Số lượng lẻ lẻ phải giữ được 6 chữ số thập phân");

  console.log("✅ Hoàn tất kiểm tra chuyển đổi VNĐ - USDC.");
}
