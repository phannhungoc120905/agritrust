# 📘 Tài liệu dành cho Người thứ 3 — AI Negotiation Lead

## 1. 🌾 AgriTrust là gì?

**AgriTrust** là nền tảng ký quỹ giao dịch nông sản B2B thông minh, kết nối trực tiếp **Nông dân (HTX)** và **Thương lái (Nhà thu mua)**.

### Luồng nghiệp vụ chính:

```
1. Chợ Nông Sản → 2. Video Call Đàm phán → 3. AI Lập Hợp đồng → 4. Ký quỹ Escrow → 5. Giao nhận → 6. Giải ngân / Tranh chấp
```

### Công nghệ:
- **Frontend:** Next.js 16 (React 19), Tailwind CSS 4
- **Blockchain:** Solana Devnet, Anchor Framework (Rust), Phantom Wallet
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenAI GPT-4o (trích xuất hợp đồng từ thoại)
- **Video Call:** Agora RTC + STT (Speech-to-Text)
- **Deployment:** Vercel

---

## 2. 🧑‍💼 Vai trò của bạn — Người thứ 3

Bạn là **AI Negotiation Lead** — chịu trách nhiệm toàn bộ phần **Đàm phán thông minh và Trích xuất AI**.

### Nhiệm vụ cụ thể:

1. **Tích hợp Speech-to-Text (STT)** — Chuyển giọng nói tiếng Việt trong cuộc gọi thành văn bản
2. **Trích xuất điều khoản hợp đồng bằng AI** — Gọi GPT-4o để biến hội thoại thành bảng điều khoản
3. **Hiển thị cảnh báo giá** — So sánh giá đàm phán với giá thị trường tham khảo
4. **Bảng hợp đồng nháp (Draft Contract)** — Hiển thị điều khoản đã trích xuất, cho phép chỉnh sửa
5. **Nút xác nhận hợp đồng** — Gọi hàm `lockUsdc()` của P2 khi 2 bên đồng ý
6. **Lưu transcript & hợp đồng xuống Supabase**

---

## 3. 📂 Các file BẠN sở hữu (P3)

### 3.1. `components/negotiation/` — Toàn bộ giao diện đàm phán

| File | Chức năng | Trạng thái |
|---|---|---|
| `TranscriptPanel.tsx` | Hiển thị lịch sử hội thoại STT dạng chat | ✅ Hoàn chỉnh |
| `PriceWarningBanner.tsx` | Banner cảnh báo giá chênh lệch > 15% | ✅ Hoàn chỉnh |
| `DraftContractTable.tsx` | Bảng hợp đồng nháp (kiểu văn bản pháp lý) | ✅ Hoàn chỉnh |
| `ConfirmContractButton.tsx` | Nút "Khóa tiền & Chốt" — gọi `lockUsdc()` | ✅ Hoàn chỉnh |

### 3.2. `lib/agora/sttClient.ts`

**Chức năng:** Kết nối Agora Real-time Speech-to-Text để chuyển giọng nói thành văn bản tiếng Việt trong cuộc gọi video.

**Trạng thái hiện tại:**
- ✅ Cấu trúc class `AgoraSTTClient` hoàn chỉnh
- ✅ Có `startSTT()`, `stopSTT()` methods
- ⚠️ **Đang dùng mock STT** (tự phát 4 câu hội thoại mẫu mỗi 8 giây)
- ❌ Cần tích hợp Agora STT SDK thật + API key thật

**Bạn cần làm:**
```
☐ Đăng ký Agora Console → lấy App ID
☐ Điền App ID vào file .env: NEXT_PUBLIC_AGORA_APP_ID=
☐ Tích hợp Agora STT SDK thật (thay thế mockSTT())
☐ Test với microphone thật
```

### 3.3. `lib/ai/extractContractTerms.ts`

**Chức năng:** Gọi **MiniMax-M3 qua TokenRouter** để phân tích hội thoại đàm phán → trích xuất JSON điều khoản hợp đồng.

**Cách hoạt động:** Dùng OpenAI SDK nhưng chuyển `baseURL` sang `https://api.tokenrouter.com/v1` và model `MiniMax-M3` — không cần OpenAI key thật.

**Input:** Transcript hội thoại (string)
**Output:** `ExtractedTerms` JSON:
```typescript
{
  san_pham: "Lúa thơm ST25",
  so_luong: 10,
  don_vi_tinh: "tấn",
  don_gia: 9000000,
  han_giao_hang: "2026-06-26T...",
  dieu_khoan_chat_luong: [
    { tieu_chi: "ty_le_lep", nguong_phan_tram: 10, muc_phat: "Trừ 5%..." },
    { tieu_chi: "do_am", nguong_phan_tram: 14, muc_phat: "Từ chối nhận hàng" }
  ]
}
```

**Trạng thái:**
- ✅ Đã chuyển sang MiniMax-M3 qua TokenRouter
- ✅ Đã có API key trong .env
- ✅ Fallback về mock data nếu API lỗi
- ✅ Prompt đã chỉnh để ép JSON, không markdown

**Bạn cần làm:**
```
☐ Test thử với vài kịch bản hội thoại khác nhau
☐ (Nâng cao) Prompt engineering để trích xuất chính xác hơn
```

### 3.4. `lib/supabase/queries/contracts.ts`

**Chức năng:** CRUD hợp đồng trên Supabase.

| Function | Mô tả |
|---|---|
| `createDraftContract(...)` | Tạo hợp đồng nháp mới |
| `updateContractStatus(...)` | Cập nhật trạng thái (P2 và P4 cũng gọi) |
| `getContractById(...)` | Lấy chi tiết hợp đồng |

✅ **Hoàn chỉnh** — không cần sửa.

### 3.5. `lib/supabase/queries/transcripts.ts`

**Chức năng:** Lưu/lấy lịch sử đàm phán.

| Function | Mô tả |
|---|---|
| `addTranscriptLine(...)` | Lưu 1 câu hội thoại mới (có cảnh báo giá) |
| `getTranscriptsByContractId(...)` | Lấy toàn bộ lịch sử của 1 hợp đồng |

✅ **Hoàn chỉnh** — không cần sửa.

### 3.6. `types/contract.ts`

```typescript
export interface QualityRule {
  tieu_chi: string;            // "ty_le_lep", "do_am", ...
  nguong_phan_tram: number;     // 10
  muc_phat: string;             // "Trừ 5% tổng giá trị"
}

export type ContractStatus = 
  | 'du_thao'
  | 'da_khoa_tien'
  | 'da_xac_nhan'
  | 'dang_tranh_chap'
  | 'da_giai_quyet'
  | 'qua_han';

export interface Contract {
  id: string;
  vi_nguoi_ban: string;      // Địa chỉ ví Nông dân
  vi_nguoi_mua: string;      // Địa chỉ ví Thương lái
  san_pham: string;
  so_luong: number;
  don_vi_tinh: string;
  don_gia: number;
  han_giao_hang: string;
  noi_dung_nhap_ai?: object;
  dieu_khoan_chat_luong?: QualityRule[];
  ty_gia_vnd_usdc: number;    // 25000
  tong_tien_usdc_khoa?: number;
  dia_chi_vi_escrow?: string;
  trang_thai: ContractStatus;
  ngay_tao: string;
  ngay_xac_nhan?: string;
}
```

✅ **Hoàn chỉnh** — P2 và P4 đều import từ file này.

---

## 4. 🔗 Cách bạn kết nối với các thành viên khác

### Với P2 (Infra & UI Lead):
```
Bạn gọi:  useEscrow().lockUsdc(...)     ← Khi 2 bên đồng ý hợp đồng
Bạn gọi:  useWallet().publicKey         ← Lấy địa chỉ ví người dùng
Bạn import:  WalletBalance              ← P2 đã tạo sẵn
Bạn import:  ConnectWalletButton         ← P2 đã tạo sẵn
```

### Với P4 (Settlement Lead):
```
P2 và P4 dùng: Contract.tong_tien_usdc_khoa  ← Bạn tính từ don_gia * so_luong
P4 dùng:   Contract.vi_nguoi_ban, vi_nguoi_mua  ← Bạn set khi tạo draft
```

### Với P1 (Blockchain):
```
Không gọi trực tiếp — P2 là cầu nối qua useEscrow hook
Bạn chỉ cần đảm bảo JSON trích xuất khớp với Smart Contract
```

---

## 5. 🗺️ Luồng dữ liệu chi tiết của BẠN

```
User vào phòng Video Call (trang /call)
  │
  ▼
AgoraSTTClient.startSTT()   ← Bắt đầu nghe (mock hoặc thật)
  │
  ▼  (mỗi câu nói)
TranscriptPanel hiển thị transcript + PriceWarningBanner (so sánh giá)
  │
  ▼  (khi đàm phán xong)
extractContractTerms(transcript)   ← Gọi GPT-4o
  │
  ▼
DraftContractTable hiển thị bảng hợp đồng nháp
  │
  ▼  (2 bên xem và chỉnh sửa)
ConfirmContractButton: gọi lockUsdc() → chuyển cho P2/P1 xử lý on-chain
  │
  ▼
Lưu transcript + contract vào Supabase
```

---

## 6. ✅ Checklist công việc của bạn

### Việc cần làm NGAY:

- [x] **Lấy Agora App ID** — ✅ Đã có: `e5719dfb65534b999b81191709aa4f1b` (free 10.000 phút/tháng)
- [ ] **Lấy OpenAI API Key** — https://platform.openai.com/api-keys (bạn cần tự lấy)
- [ ] Điền nốt OpenAI key vào file `.env`:
  ```env
  OPENAI_API_KEY=sk-your_openai_api_key
  ```
- [ ] Chạy `npm run dev` → vào `http://localhost:3000` → đăng nhập → test luồng

### Việc cần code:

#### 1. Tích hợp Agora STT thật (thay mock)
- **File:** `lib/agora/sttClient.ts`
- Dùng Agora RTM SDK hoặc Agora Cloud Recording
- Hiện tại mock 4 câu cứng — cần gọi STT thật từ microphone

#### 2. Prompt engineering cho GPT-4o
- **File:** `lib/ai/extractContractTerms.ts`
- Hiện tại prompt cơ bản — bạn nên thêm:
  - Các định dạng số lượng khác nhau ("3 tấn rưỡi" → 3.5)
  - Ngày giao hàng dạng mơ hồ ("cuối tuần sau")
  - Nhiều điều khoản chất lượng phức tạp hơn

#### 3. Kiểm tra tất cả edge cases
- Transcript rỗng
- GPT-4o trả JSON không hợp lệ
- Agora chưa có App ID (vẫn chạy được với mock)
- Người dùng thoát phòng giữa chừng

---

## 7. 🧪 Cách test

```bash
# 1. Chạy dev server
npm run dev

# 2. Vào http://localhost:3000 → Đăng nhập (nongdan/123 hoặc thuonglai/123)

# 3. Vào Chợ Nông Sản → Bấm "Liên hệ Đàm phán"
#    → Vào phòng Video Call

# 4. Bấm "Giả lập Thoại thương lượng" → Xem transcript hiện ra

# 5. Sau 4 câu → Hợp đồng nháp tự động hiện → Bấm "Xem hợp đồng nháp"
```

---

## 8. 📋 Tổng quan database bạn cần biết

Bảng bạn đọc/ghi (đã có schema):

| Bảng | Bạn đọc | Bạn ghi |
|---|---|---|
| `ban_ghi_dam_phan` | ✅ `getTranscriptsByContractId` | ✅ `addTranscriptLine` |
| `hop_dong` | ✅ `getContractById` | ✅ `createDraftContract`, `updateContractStatus` |
| `gia_tham_khao_mock` | ✅ (để so sánh giá) | ❌ (P3/P4 khác) |
| `nguoi_dung` | ✅ (lấy tên, địa chỉ ví) | ❌ |

---

## 9. ⚡ Tips khi demo

1. **Luôn mở console browser (F12)** để xem log
2. Key `.env` chỉ cần đúng `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` là app chạy được — 2 key còn lại (Agora, OpenAI) có thể để placeholder, app vẫn dùng mock data
3. Script seed đã có 5 tài khoản demo + 3 tin đăng mẫu trên Supabase — không cần chạy lại
4. Nếu lỗi "Invalid API key" → kiểm tra `.env.local` có tồn tại không (xoá nó đi, chỉ dùng `.env`)
