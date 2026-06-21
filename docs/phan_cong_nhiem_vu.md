# AgriTrust — Phân chia Tệp tin & Thư mục theo Nhiệm vụ
*Tài liệu phân công chi tiết cho 4 thành viên nhóm (Bản cập nhật)*

---

## 🔵 NGƯỜI 1 — Blockchain & Smart Contract (Solana)

### 📌 Thư mục & Tệp tin sở hữu:
- `programs/` (100% sở hữu)
  - [lib.rs](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/programs/agritrust_escrow/src/lib.rs)
  - [state.rs](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/programs/agritrust_escrow/src/state.rs)
  - [errors.rs](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/programs/agritrust_escrow/src/errors.rs)
  - [instructions/](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/programs/agritrust_escrow/src/instructions/) (initialize.rs, confirm_receipt.rs, resolve_partial.rs, claim_timeout.rs)
- `tests/`
  - [escrow.test.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/tests/escrow.test.ts)
- `lib/solana/`
  - [idl.json](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/solana/idl.json) (Xuất ra sau khi build program)
  - [program.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/solana/program.ts)
  - [seedDemoWallets.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/solana/scripts/seedDemoWallets.ts)
- `types/`
  - [escrowStatus.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/types/escrowStatus.ts)

### 📤 Sản phẩm bàn giao:
- Deploy Smart Contract lên Solana Devnet.
- Xuất file `idl.json` thực tế ghi đè lên idl tạm thời để P2 gọi.
- Script seeding SOL/Custom Token cho các ví demo trước giờ quay.

---

## 🟢 NGƯỜI 2 — Hạ tầng, Ví & Khung giao diện (Infra & UI Lead)

### 📌 Thư mục & Tệp tin sở hữu:
- `app/`
  - [page.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/app/page.tsx) (Trang chủ)
  - [layout.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/app/layout.tsx) (Root layout & providers)
  - `call/` & `contract/[id]/` (Thiết lập khung trang chung)
- `components/shared/` (100% sở hữu - P3/P4 chỉ sử dụng, không sửa đổi)
  - [ConnectWalletButton.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/shared/ConnectWalletButton.tsx)
  - [WalletBalance.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/shared/WalletBalance.tsx)
  - [VideoCallFrame.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/shared/VideoCallFrame.tsx) (Agora RTC WebRTC)
  - [WalletContextProvider.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/shared/WalletContextProvider.tsx)
  - [buttons/](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/shared/buttons/) (LockFundsButton.tsx, ConfirmReceiptButton.tsx, AgreeButton.tsx)
- `hooks/`
  - [useWallet.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/hooks/useWallet.ts)
  - [useEscrow.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/hooks/useEscrow.ts) (Lô-gíc blockchain + tự động ghi nhật ký giao dịch)
- `lib/solana/`
  - [convertVndUsdc.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/solana/convertVndUsdc.ts)
- `lib/supabase/`
  - [client.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/supabase/client.ts)
  - [queries/txLog.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/supabase/queries/txLog.ts)

### 📤 Sản phẩm bàn giao:
- Hooks kết nối ví `useWallet()` và `useEscrow()`.
- Layout khung của 3 trang chính.
- Khung Agora RTC kết nối camera/micro thật.
- Các nút giao diện dùng chung.

---

## 🟡 NGƯỜI 3 — Đàm phán & Trích xuất AI (AI Negotiation Lead)

### 📌 Thư mục & Tệp tin sở hữu:
- `components/negotiation/` (100% sở hữu)
  - [TranscriptPanel.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/negotiation/TranscriptPanel.tsx)
  - [PriceWarningBanner.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/negotiation/PriceWarningBanner.tsx)
  - [DraftContractTable.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/negotiation/DraftContractTable.tsx)
  - [ConfirmContractButton.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/negotiation/ConfirmContractButton.tsx)
- `lib/agora/`
  - [sttClient.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/agora/sttClient.ts) (Speech-to-Text)
- `lib/ai/`
  - [extractContractTerms.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/ai/extractContractTerms.ts) (Gọi GPT-4o)
- `lib/supabase/queries/`
  - [contracts.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/supabase/queries/contracts.ts)
  - [transcripts.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/supabase/queries/transcripts.ts)
- `types/`
  - [contract.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/types/contract.ts)

### 📤 Sản phẩm bàn giao:
- Tích hợp STT hội thoại tiếng Việt trong cuộc gọi của P2.
- Trích xuất dữ liệu giọng nói thành JSON bảng điều khoản hợp đồng.
- Nút Xác nhận hợp đồng (gọi hàm `lockUsdc()` của P2).
- Bảng hiển thị cảnh báo so sánh giá thị trường.

---

## 🟠 NGƯỜI 4 — Nghiệm thu, Tranh chấp & Giải ngân (Settlement Lead)

### 📌 Thư mục & Tệp tin sở hữu:
- `components/dispute/` (100% sở hữu)
  - [UploadEvidenceForm.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/dispute/UploadEvidenceForm.tsx)
  - [DisputeReportForm.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/dispute/DisputeReportForm.tsx)
  - [ApproveReportButtons.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/dispute/ApproveReportButtons.tsx)
  - [SettlementProposal.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/dispute/SettlementProposal.tsx)
  - [AgreeButtons.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/dispute/AgreeButtons.tsx)
  - [TimeoutClaimButton.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/dispute/TimeoutClaimButton.tsx)
- `lib/settlement/`
  - [proposeSettlement.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/settlement/proposeSettlement.ts) (Lô-gíc phạt AI đề xuất)
- `lib/supabase/queries/`
  - [disputes.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/supabase/queries/disputes.ts)
- `types/`
  - [disputeReport.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/types/disputeReport.ts)

### 📤 Sản phẩm bàn giao:
- Form nghiệm thu sai lệch (nhập số lượng thực nhận + ghi chú) và đăng tải bằng chứng.
- Thuật toán AI tính toán tỉ lệ phạt theo đúng điều khoản gốc.
- Hệ thống nút bấm xác nhận đồng thuận (đủ chữ ký 2 bên tự động kích hoạt `resolvePartial()` của P2).
- Nút tự động rút tiền giải ngân khi quá hạn deadlines (kết hợp `claimTimeout()` của P2).
