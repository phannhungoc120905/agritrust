# AgriTrust — Bản cam kết giao diện kỹ thuật (Interface Contract)
*Bản chốt kỹ thuật Ngày 1 (19/06) - Dùng chung cho 4 thành viên nhóm*

---

## 1. Quy ước chung
- **Mạng chạy:** Solana Devnet.
- **Tỷ giá quy đổi:** Cố định `1 USDC = 25.000 VNĐ` (xử lý qua helper `lib/solana/convertVndUsdc.ts`). Không gọi Oracle thật để tránh chập chờn lúc demo.
- **Phí giao dịch (Gas):** SOL giả lập được airdrop trước qua script `seedDemoWallets.ts`.
- **Ví Demo:** Không sử dụng đăng ký tài khoản Email/Mật khẩu. Dùng trực tiếp địa chỉ ví Phantom của người dùng làm khóa chính (`dia_chi_vi`).

---

## 2. Ánh xạ giữa Frontend và Smart Contract (P1 - P2)
Frontend (P2) sẽ sử dụng hook `useEscrow()` để gọi các hàm tương ứng trên blockchain (P1) thông qua file `idl.json`.

| Hành động của người dùng | Tên hàm gọi ở Frontend (`useEscrow()`) | Tên hàm on-chain thực tế (Solana) | Trạng thái hợp đồng sau khi gọi |
| :--- | :--- | :--- | :--- |
| **Khóa tiền cọc** | `lockUsdc(...)` | `initialize(...)` | `da_khoa_tien` |
| **Nhận hàng đủ (Kịch bản A)** | `confirmReceipt(...)` | `confirm_receipt()` | `da_xac_nhan` |
| **Đồng ý chia tiền (Kịch bản B)** | `resolvePartial(...)` | `resolve_partial(actual_qty)` | `da_giai_quyet` |
| **Tự rút khi quá hạn (Kịch bản C)** | `claimTimeout(...)` | `claim_timeout()` | `qua_han` |

---

## 3. Khung Schema trao đổi dữ liệu (Types)

### Hợp đồng nháp (P3 chốt - `types/contract.ts`)
```typescript
export interface QualityRule {
  tieu_chi: string;            // Ví dụ: 'ty_le_lep', 'do_am'
  nguong_phan_tram: number;     // Ví dụ: 10
  muc_phat_phan_tram: number;   // Ví dụ: 5
}

export type ContractStatus = 'du_thao' | 'da_khoa_tien' | 'da_xac_nhan' | 'dang_tranh_chap' | 'da_giai_quyet' | 'qua_han';
```

### Báo cáo tranh chấp (P4 chốt - `types/disputeReport.ts`)
```typescript
export type DisputeStatus = 'moi_gui' | 'dang_xem_xet' | 'da_dong_y' | 'da_giai_ngan';
```

---

## 4. Tự động ghi nhật ký giao dịch (F9)
Hook `useEscrow()` tại `hooks/useEscrow.ts` có trách nhiệm tự động ghi nhận vào bảng `nhat_ky_giao_dich` trong Supabase:
1. Ghi một dòng trạng thái `dang_xu_ly` ngay trước khi gọi ví Phantom ký giao dịch.
2. Cập nhật lại thành `thanh_cong` hoặc `that_bai` kèm chữ ký giao dịch (`chu_ky_giao_dich`) và thời gian nhận xác nhận thực tế.
3. Đồng bộ trạng thái hợp đồng trong bảng `hop_dong` tương ứng.
