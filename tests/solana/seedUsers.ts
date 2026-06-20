import { seedDemoUsers } from '../../lib/supabase/queries/auth';

async function main() {
  console.log("Đang chèn dữ liệu tài khoản demo lên Supabase...");
  await seedDemoUsers();
  console.log("Hoàn tất chèn dữ liệu.");
}

main().catch((err) => {
  console.error("Lỗi khi chạy script:", err);
});
