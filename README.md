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
Tạo một file `.env` nằm ở **thư mục gốc của dự án** (ngang hàng với `package.json`), dán toàn bộ cấu hình kết nối dưới đây vào. Đây là cấu hình dùng chung của dự án để chạy thực tế Agora Call (có Token) và Trích xuất AI (MiniMax-M3):

```env
# Supabase Config (Kết nối Database chung của team)
NEXT_PUBLIC_SUPABASE_URL=https://fjqbgxvzvmtvwhjkacsh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcWJneHZ6dm10dndoamthY3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTg0MTAsImV4cCI6MjA5NzUzNDQxMH0.5eYU2Wuz0z4MnItwQGWbP5ylx7N9Z8ZgtaayihihO64

# Agora Config (Bắt buộc phải có cả App ID và Certificate để tạo Token bảo mật động)
NEXT_PUBLIC_AGORA_APP_ID=9b0da7b192324a14942d007a4c9cae72
AGORA_APP_CERTIFICATE=46c68e38b8e045efa7a4a269d6377cb5

# OpenAI SDK Config (Gọi mô hình MiniMax-M3 qua TokenRouter - không cần nạp tiền OpenAI)
OPENAI_API_KEY=sk-WZbpTlPk76VPHeU6OZ41YrOb86L9HMvyksmIRt6B8eeyyYcl
NEXT_PUBLIC_AI_BASE_URL=https://api.tokenrouter.com/v1
AI_MODEL=MiniMax-M3
```

### 3. Cập nhật Database & Tạo Dữ liệu mẫu (Seed)
*   **Bước 1 (Chỉ cần 1 người chạy trên Supabase Dashboard):** 
    *   Chạy toàn bộ cấu trúc bảng trong `supabase/schema.sql` tại công cụ **SQL Editor** trên Supabase console.
    *   *Lưu ý sửa lỗi kết nối ví:* Nếu gặp lỗi ràng buộc khóa ngoại (foreign key constraint) khi đổi/kết nối ví, hãy chạy script SQL trong file `supabase/update_constraints.sql` tại SQL Editor để cập nhật cơ chế đồng bộ tự động `ON UPDATE CASCADE`.
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

## 💡 Tính năng Đàm phán Thông minh & AI (Đã hoàn thiện)

Dự án đã tích hợp hoàn tất các tính năng Đàm phán thông minh sau:
* **Speech-to-Text (STT) Tiếng Việt:** Tự động nhận diện giọng nói tiếng Việt thời gian thực bằng Web Speech API trên trình duyệt. Có chế độ fallback tự động sang kịch bản đàm thoại giả lập nếu thiếu thiết bị.
* **Trích xuất Hợp đồng bằng AI (MiniMax-M3):** Kết nối qua API Route bảo mật gọi mô hình MiniMax-M3 (TokenRouter) để phân tích transcript đàm thoại và lập bảng điều khoản nháp.
* **Cảnh báo Giá thông minh:** So sánh giá thương lượng thực tế với giá tham khảo nông sản trong khu vực (Lúa ST25: 8.5tr, Cà phê: 75tr, Sầu riêng: 120tr, Thanh long: 22tr) và cảnh báo đỏ nếu chênh lệch lệch quá 15%.
* **Định tuyến Escrow liền mạch:** Kết nối thẳng danh sách đàm phán đã khóa đến trang Escrow chi tiết `/contract/[id]` để ký quỹ và xử lý giao nhận/tranh chấp.
* **Tốc độ Giả lập Siêu tốc:** Cấu hình độ trễ hội thoại demo chỉ còn **0.6 giây** để quá trình chấm thử diễn ra nhanh chóng, mượt mà.

---

## 📂 Cấu trúc thư mục chính
*   `/app`: Các trang của ứng dụng Next.js (Đăng nhập, Đăng ký, Đàm phán Call, Hợp đồng, Profile).
*   `/components`: Các thành phần giao diện dùng chung (Nút Kết nối ví, Bảng điều khoản hợp đồng nháp, Form báo cáo tranh chấp).
*   `/hooks`: Quản lý ví Solana (`useWallet.ts`) và tương tác Smart Contract Escrow (`useEscrow.ts`).
*   `/lib`: Xử lý logic Supabase API, Agora Video Call, và Solana program provider.
*   `/supabase`: File cấu trúc database mẫu `schema.sql`.
*   `/programs`: Code Rust Smart Contract Solana Escrow (dành cho Blockchain dev).
