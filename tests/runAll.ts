import { runConvertTests } from './solana/convertVndUsdc.test';

console.log("==========================================");
console.log("🛠️ KHỞI CHẠY BỘ KIỂM THỬ HẠ TẦNG (NGƯỜI SỐ 2)");
console.log("==========================================\n");

try {
  runConvertTests();
  
  console.log("\n==========================================");
  console.log("🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ THÀNH CÔNG!");
  console.log("==========================================");
} catch (error: any) {
  console.error("\n❌ BÀI KIỂM THỬ THẤT BẠI!");
  console.error("Chi tiết lỗi:", error.message || error);
  process.exit(1);
}
