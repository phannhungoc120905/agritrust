import { seedDemoUsers } from '../../lib/supabase/queries/auth';
import { seedDemoProducts } from '../../lib/supabase/queries/listings';

async function main() {
  console.log("Đang chèn dữ liệu tài khoản demo lên Supabase...");
  await seedDemoUsers();
  console.log("Đang chèn dữ liệu Chợ Nông Sản demo...");
  await seedDemoProducts();
  console.log("Hoàn tất chèn dữ liệu.");
}

main().catch((err) => {
  console.error("Lỗi khi chạy script:", err);
});
