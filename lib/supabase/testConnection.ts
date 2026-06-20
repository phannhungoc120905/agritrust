import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Đọc file .env thủ công để tránh phụ thuộc vào dotenv trong script chạy thử độc lập
const envPath = path.resolve(__dirname, '../../.env');
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
  const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.+)/);

  if (urlMatch && urlMatch[1]) supabaseUrl = urlMatch[1].trim();
  if (keyMatch && keyMatch[1]) supabaseAnonKey = keyMatch[1].trim();
} catch (err) {
  console.error("❌ Không tìm thấy hoặc không thể đọc file .env ở thư mục gốc.");
  process.exit(1);
}

console.log("--- THÔNG TIN KẾT NỐI ---");
console.log("URL:", supabaseUrl);
console.log("Anon Key:", supabaseAnonKey ? (supabaseAnonKey.includes("YOUR_") ? "Chưa điền (Vẫn đang là placeholder)" : "Đã nhập") : "Trống");
console.log("-------------------------\n");

if (!supabaseUrl || supabaseUrl.includes("YOUR_") || !supabaseAnonKey || supabaseAnonKey.includes("YOUR_")) {
  console.log("⚠️ CẢNH BÁO: Bạn chưa cấu hình đúng URL hoặc Anon Key trong file .env.");
  console.log("Vui lòng mở file /Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/.env và điền các thông tin từ Supabase của bạn trước.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log("⏳ Đang thử truy vấn bảng 'nguoi_dung' trên Supabase...");
  try {
    const { data, error } = await supabase
      .from('nguoi_dung')
      .select('*')
      .limit(1);

    if (error) {
      console.log("❌ Lỗi truy vấn database từ Supabase:");
      console.log(error);
    } else {
      console.log("✅ KẾT NỐI THÀNH CÔNG!");
      console.log("Dữ liệu nhận được:", data);
    }
  } catch (err) {
    console.log("❌ Gặp lỗi không xác định khi thực hiện kết nối:");
    console.error(err);
  }
}

testConnection();
