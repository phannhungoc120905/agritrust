import { proposeSettlement } from '../lib/settlement/proposeSettlement';
import { Contract } from '../types/contract';

const mockContract: Contract = {
  id: 'test-contract-uuid',
  vi_nguoi_ban: 'nong_dan_wallet_address_demo',
  vi_nguoi_mua: 'thuong_lai_wallet_address_demo',
  san_pham: 'Lúa thơm ST25',
  so_luong: 100, // 100 tấn
  don_vi_tinh: 'tấn',
  don_gia: 100,  // 100 USDC/tấn
  han_giao_hang: new Date().toISOString(),
  trang_thai: 'da_khoa_tien',
  ty_gia_vnd_usdc: 25000,
  tong_tien_usdc_khoa: 10000, // 10,000 USDC
  dieu_khoan_chat_luong: [
    { tieu_chi: 'Độ ẩm', nguong_phan_tram: 14, muc_phat: 'Phạt 5% giá trị' },
    { tieu_chi: 'Hạt lép', nguong_phan_tram: 5, muc_phat: 'Phạt 2% giá trị' }
  ],
  ngay_tao: new Date().toISOString()
};

console.log('=== KHỞI CHẠY KIỂM THỬ THUẬT TOÁN ĐỀ XUẤT CHIA TIỀN ===\n');

// Test case 1: Hao hụt số lượng (chỉ nhận 90/100 tấn), chất lượng đạt chuẩn
const result1 = proposeSettlement(mockContract, 90, { 'Độ ẩm': 13, 'Hạt lép': 4 });
const passed1 = result1.tien_giai_ngan_usdc === 9000 && result1.tien_hoan_usdc === 1000;
console.log(`Test 1 (Hao hụt số lượng, chất lượng đạt): ${passed1 ? '✅ PASS' : '❌ FAIL'}`);
console.log(` -> Thực nhận: 90/100 tấn. Tiền giải ngân: ${result1.tien_giai_ngan_usdc} USDC, Hoàn trả: ${result1.tien_hoan_usdc} USDC`);
console.log(` -> Lý do: ${result1.ly_do}\n`);

// Test case 2: Đủ số lượng nhưng lỗi chất lượng (Độ ẩm 16% > 14%) -> phạt 5%
const result2 = proposeSettlement(mockContract, 100, { 'Độ ẩm': 16, 'Hạt lép': 3 });
const passed2 = result2.tien_giai_ngan_usdc === 9500 && result2.tien_hoan_usdc === 500;
console.log(`Test 2 (Đủ số lượng, vi phạm độ ẩm): ${passed2 ? '✅ PASS' : '❌ FAIL'}`);
console.log(` -> Thực nhận: 100/100 tấn. Tiền giải ngân: ${result2.tien_giai_ngan_usdc} USDC, Hoàn trả: ${result2.tien_hoan_usdc} USDC`);
console.log(` -> Lý do: ${result2.ly_do}\n`);

// Test case 3: Hao hụt số lượng (80 tấn) + vi phạm chất lượng cả hai (Độ ẩm 15% & Hạt lép 7%) -> phạt 5% + 2% = 7%
const result3 = proposeSettlement(mockContract, 80, { 'Độ ẩm': 15, 'Hạt lép': 7 });
// Lượng hàng thực tế trước phạt: 80 * 100 = 8000 USDC
// Phạt 7% của 8000 USDC = 560 USDC. Tiền giải ngân = 8000 - 560 = 7440 USDC. Tiền hoàn = 10000 - 7440 = 2560 USDC.
const passed3 = result3.tien_giai_ngan_usdc === 7440 && result3.tien_hoan_usdc === 2560;
console.log(`Test 3 (Hao hụt số lượng + vi phạm cả 2 tiêu chuẩn): ${passed3 ? '✅ PASS' : '❌ FAIL'}`);
console.log(` -> Thực nhận: 80/100 tấn. Tiền giải ngân: ${result3.tien_giai_ngan_usdc} USDC, Hoàn trả: ${result3.tien_hoan_usdc} USDC`);
console.log(` -> Lý do: ${result3.ly_do}\n`);

console.log('=== HOÀN TẤT KIỂM THỬ ===');
if (!passed1 || !passed2 || !passed3) {
  process.exit(1);
} else {
  process.exit(0);
}
