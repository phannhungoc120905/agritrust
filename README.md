# 🌾 AgriTrust — Nền Tảng Ký Quỹ Giao Dịch Nông Sản B2B Thông Minh

AgriTrust là giải pháp kết nối giao thương nông sản B2B trực tiếp giữa Nông dân (HTX) và Thương lái (Nhà thu mua), bảo đảm thanh toán và xử lý tranh chấp tự động thông qua **Solana Blockchain Smart Contract** kết hợp dữ liệu đồng bộ trên **Supabase**.

---

## 🛠️ Hướng dẫn Cài đặt & Chạy Dự án (Dành cho thành viên dự án)

Làm theo các bước dưới đây để chạy ứng dụng local kết nối trực tiếp vào Database Supabase chung của đội:

### 1. Tải code và Cài đặt thư viện
```bash
# Clone dự án (nếu chưa clone)
git clone https://github.com/phannhungoc120905/agritrust.git
cd agritrust

# Cài đặt toàn bộ dependencies
npm install
```

### 2. Cấu hình biến môi trường (`.env`)
Tạo một file `.env` nằm ở **thư mục gốc của dự án** (ngang hàng với `package.json`), dán toàn bộ cấu hình kết nối Database Supabase chung dưới đây vào:

```env
# Supabase Config (Kết nối Database chung của team)
NEXT_PUBLIC_SUPABASE_URL=https://fjqbgxvzvmtvwhjkacsh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcWJneHZ6dm10dndoamthY3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTg0MTAsImV4cCI6MjA5NzUzNDQxMH0.5eYU2Wuz0z4MnItwQGWbP5ylx7N9Z8ZgtaayihihO64

# Agora Config (Cho luồng Video Call đàm phán)
NEXT_PUBLIC_AGORA_APP_ID=YOUR_AGORA_APP_ID

# OpenAI Config (Nếu cần chạy trích xuất AI)
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

### 3. Cập nhật Database & Tạo Dữ liệu mẫu (Seed)
*   **Bước 1 (Chỉ cần 1 người chạy trên Supabase Dashboard):** Chạy đoạn script SQL trong file `supabase/schema.sql` (đặc biệt là bảng mới `tin_dang_cho` của Chợ Nông Sản) tại công cụ **SQL Editor** trên Supabase console.
*   **Bước 2 (Chèn dữ liệu demo):** Chạy lệnh dưới đây ở terminal máy của bạn để tự động tạo tài khoản demo và tin đăng bán mẫu trên Supabase:
    ```bash
    npm run seed:users
    ```

### 4. Khởi chạy Development Server
```bash
npm run dev
```
Mở trình duyệt truy cập vào [http://localhost:3000](http://localhost:3000) để trải nghiệm.

---

## 🔑 Danh sách Tài khoản Demo dùng thử (Mật khẩu chung: `123`)

Để phục vụ việc chạy demo và chấm thi, hãy dùng các tài khoản đã được nạp sẵn sau:

| Vai trò | Tên đăng nhập | Tên hiển thị trên hệ thống |
| :--- | :--- | :--- |
| **Thương lái** | `thuonglai` | Thương lái Trần Thị Thương |
| **Nông dân** | `nongdan` | Nông dân Nguyễn Văn Ruộng |
| **Nông dân** | `vamco` | HTX Nông Nghiệp Vàm Cỏ |
| **Nông dân** | `ythang` | Nông dân Y Thắng |
| **Nông dân** | `uttroc` | Nhà vườn Út Trọc |

---

## 📂 Cấu trúc thư mục chính
*   `/app`: Các trang của ứng dụng Next.js (Đăng nhập, Đăng ký, Đàm phán Call, Hợp đồng, Profile).
*   `/components`: Các thành phần giao diện dùng chung (Nút Kết nối ví, Bảng điều khoản hợp đồng nháp, Form báo cáo tranh chấp).
*   `/hooks`: Quản lý ví Solana (`useWallet.ts`) và tương tác Smart Contract Escrow (`useEscrow.ts`).
*   `/lib`: Xử lý logic Supabase API, Agora Video Call, và Solana program provider.
*   `/supabase`: File cấu trúc database mẫu `schema.sql`.
*   `/programs`: Code Rust Smart Contract Solana Escrow (dành cho Blockchain dev).
