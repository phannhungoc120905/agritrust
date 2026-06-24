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

---

## ⚠️ Danh sách Lỗi & Hạng mục Cần Tối Ưu Gấp (TODO Hackathon)

Dưới đây là các vấn đề về Trải nghiệm người dùng (UX) và kỹ thuật đang cần được ưu tiên xử lý:

### 1. Đồng bộ Dữ liệu Thời gian thực (Real-time Sync)
- **Vấn đề:** Tính năng Real-time qua Supabase Channel / Websocket ở nhiều màn hình chưa hoạt động ổn định. Người dùng đang phải tự nhấn F5 (tải lại trang) từ đầu rất phiền phức mới thấy được trạng thái thay đổi của đối tác.
- **Giải pháp:** Cần bọc lại các State quan trọng bằng `supabase.channel` xuyên suốt ở **tất cả các trang diễn ra luồng giao dịch**: từ Danh sách Đàm phán, Chi tiết Hợp đồng, cho đến các trang Chợ nông sản và Quản lý yêu cầu kết nối.

### 2. Logic Kết nối Đối tác (Matching / Contact Request)
- **Vấn đề:** Luồng kết nối đối tác đang bị lặp lại (loop). Khi Thương lái gửi yêu cầu, bên Nông dân không nhận được cập nhật trạng thái ngay lập tức (phải reload).
- **Giải pháp:** Kiểm tra lại bảng `yeu_cau_ket_noi` trên Supabase, bắt sự kiện Insert/Update và dùng Toaster (thông báo popup) để báo cho Nông dân biết có yêu cầu mới.

### 3. Giao diện Thẻ Hợp Đồng / Đàm Phán (UI/UX Cards)
- **Vấn đề:** Các thẻ (Cards) hiển thị danh sách đàm phán/hợp đồng đang quá sơ sài. Thiếu các thông tin quan trọng như: Thời hạn chốt (Deadline), Khối lượng, Trạng thái chi tiết (Đang chờ ai?), Thời gian đếm ngược.
- **Giải pháp:** Thiết kế lại Component `ContractCard` hiển thị đẩy đủ thông số: Sản phẩm, Thời hạn giao hàng, Trạng thái chữ ký của từng bên.

### 4. Thông báo Cuộc gọi (Video Call Notification)
- **Vấn đề:** Luồng gọi Video Call (Agora) đang thiếu cơ chế "Ringing/Báo cuộc gọi đến". Khi Thương lái bấm nút "Vào phòng họp đàm phán", bên Nông dân hoàn toàn không nhận được thông báo gì để bấm vào tham gia.
- **Giải pháp:** Bắn một thông báo Websocket `INCOMING_CALL` ngay khi có người tham gia phòng Agora, hiển thị Popup (Ringtone) ở góc màn hình của đối tác để họ nhấn "Chấp nhận".

### 5. Các điểm cần xem xét thêm (Technical Debt)
- **Quản lý Vòng đời Hợp đồng:** Cần đảm bảo Nông dân không thể bấm "Nghiệm thu" trước Deadline (đã xử lý phần Backend, nhưng UI cần hiển thị thời gian đếm ngược rõ ràng hơn).
- **Trải nghiệm AI (Trọng tài):** Đôi khi STT (Nhận diện giọng nói) có thể bắt nhầm từ ngữ. Cần làm rõ hơn tính năng "Xóa và sửa lại" để hai bên không bị kẹt với biên bản sai.
- **Xử lý Mạng kém:** Thêm cơ chế tự động reconnect (kết nối lại) nếu mạng bị rớt giữa chừng lúc đang Video Call.

### 6. Cảnh báo các Lỗ hổng Logic & Quản lý State (Dành cho Dev xử lý)
- **Lặp trạng thái Yêu cầu Kết nối:** Hiện tại hệ thống cho phép tạo nhiều dòng rác trong bảng `yeu_cau_lien_he` nếu Thương lái bấm gửi nhiều lần. Cần thêm hàm kiểm tra `if (exists)` trước khi gọi hàm Insert, hoặc chặn Nút "Gửi yêu cầu" ngay khi đã gửi.
- **Lỗi hỏng/Vỡ State (State Desync):** Frontend đang gặp hiện tượng "Stale State" (State cũ không được xóa bỏ). Ví dụ khi chuyển đổi qua lại giữa các Hợp đồng hoặc các Tab, biến `useState` vẫn lưu dữ liệu của đối tác cũ. Dev cần dọn dẹp State bằng hàm `cleanup` trong `useEffect` hoặc reset State về `null` mỗi khi đổi `activeNegotiationId`.
- **Kẹt State Đàm Phán (Video Call):** Khi 2 bên đang ở trạng thái đàm phán, nếu 1 bên thoát ngang giữa chừng hoặc rớt mạng mà chưa bấm "Lưu hợp đồng nháp", State của hệ thống không có luồng Hủy/Reset tự động (Timeout).
- **Lỗ hổng On-chain Escrow:** Lệnh rút tiền (Giải ngân/Hoàn trả) hiện đang dựa vào hàm Client-side gọi Solana Program. Cần làm rõ hiển thị "Giao dịch đang xử lý (Loading)" để tránh trường hợp người dùng click spam nút "Rút tiền" nhiều lần dẫn tới lỗi Network fee.
- **Dữ liệu Rác ở Chợ Nông Sản:** Chưa có tính năng "Đóng tin đăng / Ẩn tin" khi Nông dân đã bán hết hàng, dẫn đến Thương lái vẫn tiếp tục gửi yêu cầu vào một lô hàng đã chốt. Cần đồng bộ Logic: `Khi Hợp đồng được ký -> Giảm số lượng tồn kho của Lô hàng tương ứng xuống`.
