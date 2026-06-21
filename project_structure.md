# Cấu Trúc Chi Tiết Dự Án AgriTrust

AgriTrust là nền tảng trung gian bảo lãnh ký quỹ (Escrow) dành cho giao dịch nông sản B2B giữa **Nông dân/Hợp tác xã** và **Nhà thu mua**. Nền tảng kết hợp các công nghệ:
1. **Hội thoại AI & Trích xuất điều khoản (Agora STT & Gemini API)**
2. **Hợp đồng thông minh trên Blockchain (Solana Escrow Program)**
3. **Giao diện quản lý & Giám sát tranh chấp (Next.js & Supabase)**

Tài liệu này cung cấp bản đồ chi tiết về cấu trúc thư mục, chức năng của từng file và phân công nhiệm vụ cốt lõi trong hệ thống.

---

## 1. Sơ Đồ Cấu Trúc Thư Mục (Directory Tree)

```text
agritrust/
├── app/                           # Lớp giao diện chính & Routing (Next.js App Router)
│   ├── favicon.ico
│   ├── globals.css                # Thiết kế hệ thống (Design Tokens, Typography, Utility)
│   ├── layout.tsx                 # Root layout định nghĩa font, HTML/Body & Wallet Providers
│   ├── page.tsx                   # Trang chủ Dashboard (Tổng hợp đàm phán, hợp đồng, số dư ví)
│   ├── call/
│   │   └── page.tsx               # Phòng đàm phán cuộc gọi đúp thoại kèm Speech-to-Text & AI trích xuất hợp đồng
│   ├── contract/
│   │   └── [id]/
│   │       └── page.tsx           # Trang chi tiết hợp đồng, xử lý thanh toán, nghiệm thu hoặc báo cáo tranh chấp
│   └── login/
│       └── page.tsx               # Trang đăng nhập tối giản (B2B Fintech Style)
├── components/                    # Thành phần UI tái sử dụng chia theo tính năng
│   ├── dispute/                   # Component phục vụ quy trình xử lý tranh chấp (Dispute)
│   │   ├── AgreeButtons.tsx       # Phân xử đồng ý điều khoản hoặc giải quyết
│   │   ├── ApproveReportButtons.tsx
│   │   ├── DisputeReportForm.tsx  # Form điền báo cáo lỗi giao nhận/chất lượng nông sản
│   │   ├── SettlementProposal.tsx # Đề xuất hòa giải phân chia tỷ lệ tiền cọc
│   │   ├── TimeoutClaimButton.tsx # Nút đòi lại tiền khi quá hạn giao nhận (Timeout claim)
│   │   └── UploadEvidenceForm.tsx # Form tải hình ảnh/video bằng chứng tranh chấp
│   ├── negotiation/               # Component phục vụ đàm phán cuộc gọi & soạn thảo
│   │   ├── ConfirmContractButton.tsx
│   │   ├── DraftContractTable.tsx # Bảng hiển thị dự thảo hợp đồng thời gian thực
│   │   ├── PriceWarningBanner.tsx # Cảnh báo nếu giá thỏa thuận chênh lệch lớn với thị trường
│   │   └── TranscriptPanel.tsx    # Panel hiển thị hội thoại được chuyển từ giọng nói thành văn bản
│   └── shared/                    # Các component chia sẻ toàn hệ thống
│       ├── ConnectWalletButton.tsx# Nút kết nối ví Solana (Phantom, v.v.)
│       ├── VideoCallFrame.tsx     # Khung hình stream camera cuộc gọi (Agora)
│       ├── WalletBalance.tsx      # Hiển thị số dư SOL/USDC trong ví
│       ├── WalletContextProvider.tsx # Cấu hình mạng kết nối Solana
│       └── buttons/               # Các nút bấm cơ bản dùng chung
├── hooks/                         # React Custom Hooks quản lý logic trạng thái
│   ├── useAuth.tsx                # Quản lý phiên đăng nhập người dùng với Supabase
│   ├── useEscrow.ts               # Tương tác trực tiếp với Solana Escrow Program (Anchor client)
│   └── useWallet.ts               # Đọc thông tin kết nối ví, số dư SOL/USDC
├── lib/                           # Thư viện xử lý nghiệp vụ & dịch vụ tích hợp bên thứ ba
│   ├── agora/
│   │   └── sttClient.ts           # Client kết nối dịch vụ Speech-To-Text streaming cuộc gọi
│   ├── ai/
│   │   └── extractContractTerms.ts# Gọi Gemini API trích xuất điều khoản hợp đồng từ hội thoại
│   ├── settlement/
│   │   └── proposeSettlement.ts   # Thuật toán AI phân tích bằng chứng tranh chấp & đề xuất tỷ lệ hoàn trả
│   ├── solana/
│   │   ├── convertVndUsdc.ts      # Hàm chuyển đổi tỉ giá VND và USDC
│   │   ├── idl.json               # IDL của Solana Escrow Smart Contract
│   │   ├── program.ts             # Thiết lập kết nối Solana RPC & Anchor Program Instance
│   │   └── scripts/
│   ├── supabase/
│   │   ├── client.ts              # Khởi tạo Supabase client kết nối Backend
│   │   ├── testConnection.ts      # Script kiểm tra kết nối Supabase DB
│   │   └── queries/               # Các hàm truy vấn dữ liệu thô (Queries)
│   │       ├── auth.ts            # Đăng ký, đăng nhập, đăng xuất người dùng
│   │       ├── contracts.ts       # Đọc/ghi thông tin hợp đồng, trạng thái ký quỹ
│   │       ├── disputes.ts        # Quản lý đơn tranh chấp, bằng chứng, hòa giải
│   │       ├── transcripts.ts     # Lưu trữ lịch sử hội thoại Speech-To-Text
│   │       └── txLog.ts           # Lưu lịch sử giao dịch Blockchain
├── programs/                      # Hợp đồng thông minh Solana (Rust / Anchor)
│   └── agritrust_escrow/
│       ├── Cargo.toml
│       └── src/
│           ├── errors.rs          # Định nghĩa mã lỗi tùy chỉnh của Smart Contract
│           ├── lib.rs             # File entrypoint khai báo các hàm và cấu trúc chỉ lệnh chính
│           ├── state.rs           # Khai báo cấu trúc lưu trữ trạng thái của tài khoản Escrow trên chuỗi
│           └── instructions/      # Các chỉ lệnh (instructions) thực thi logic ký quỹ
│               ├── claim_timeout.rs   # Người mua rút lại tiền nếu người bán quá hạn giao hàng không xử lý
│               ├── confirm_receipt.rs # Xác nhận nhận hàng và giải ngân tiền cho người bán
│               ├── initialize.rs      # Người mua khởi tạo tài khoản Escrow và gửi tiền đặt cọc vào pool
│               ├── mod.rs             # Đăng ký module instructions
│               └── resolve_partial.rs # Giải quyết tranh chấp theo tỷ lệ phân chia đồng thuận
├── supabase/
│   └── schema.sql                 # File định nghĩa cơ sở dữ liệu quan hệ (Bảng Users, Contracts, Disputes...)
├── tests/                         # Thư mục kiểm thử tự động (Unit & Integration tests)
│   ├── escrow.test.ts             # Kiểm thử các chỉ lệnh của Solana Escrow Smart Contract
│   ├── runAll.ts                  # Script khởi chạy toàn bộ kịch bản kiểm thử
│   └── solana/
│       ├── convertVndUsdc.test.ts # Test hàm quy đổi VND/USDC
│       └── seedUsers.ts           # Tạo tài khoản giả lập ban đầu để test hệ thống
├── types/                         # Định nghĩa các kiểu dữ liệu dùng chung (Types & Interfaces)
│   ├── contract.ts                # Kiểu dữ liệu Hợp đồng nông sản
│   ├── disputeReport.ts           # Kiểu dữ liệu Đơn tranh chấp & Bằng chứng
│   └── escrowStatus.ts            # Kiểu trạng thái ví dụ: DRAFT, ESCROWED, SHIPPED, DISPUTED, COMPLETED...
├── .env                           # Biến môi trường local (chứa khóa bí mật API, Supabase URL)
├── .env.example                   # Bản mẫu cấu hình biến môi trường
├── README.md                      # Hướng dẫn cài đặt, chạy dự án ban đầu
└── package.json                   # Quản lý thư viện phụ thuộc (Dependencies) & câu lệnh chạy dev
```

---

## 2. Chi Tiết Nhiệm Vụ & Vai Trò Của Các File Cốt Lõi

### LỚP GIAO DIỆN (FRONTEND & PAGES - `app/`)
*   **[globals.css](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/app/globals.css)**: Định nghĩa bảng màu thương hiệu (Màu xanh nông nghiệp sạch, xanh bạc hà, sắc độ xám fintech), phông chữ hiển thị, các tiện ích bo góc, đổ bóng và các nút chuẩn (`btn-primary`, `btn-secondary`). Đóng vai trò là linh hồn thiết kế trực quan của dự án.
*   **[layout.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/app/layout.tsx)**: Khởi tạo cấu trúc HTML gốc, bọc ứng dụng trong `WalletContextProvider` giúp truyền thông tin kết nối ví Solana đi khắp các trang. Chuyển đổi nền giao diện nhất quán sang chế độ B2B light-theme sạch sẽ.
*   **[page.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/app/page.tsx)**: Trang chủ sau khi người dùng đăng nhập. Chia thành 3 khu vực trực quan:
    1.  *Khu vực đàm phán*: Theo dõi danh sách cuộc gọi đang mở hoặc yêu cầu đàm phán mới.
    2.  *Khu vực hợp đồng*: Xem nhanh tiến trình các hợp đồng hiện hữu (Đang dự thảo, Đã ký quỹ, Đang giao nhận, Đang tranh chấp).
    3.  *Ví điện tử*: Hiển thị nhanh số dư SOL, USDC phục vụ giao dịch trực tiếp.
*   **[call/page.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/app/call/page.tsx)**: Giao diện phòng họp đàm phán trực tiếp giữa Nông dân và Nhà thu mua. Nơi Agora Stream hình ảnh kết hợp Speech-To-Text đổ văn bản đàm phán liên tục vào AI để tự động cập nhật bảng dự thảo hợp đồng (Draft Contract) theo thời gian thực.
*   **[contract/[id]/page.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/app/contract/%5Bid%5D/page.tsx)**: Trang hành động cốt lõi cho một hợp đồng cụ thể. Chứa các nút bấm tương tác: "Nạp tiền cọc" (ký quỹ on-chain), "Xác nhận đã nhận hàng" (giải ngân on-chain), "Báo cáo sự cố chất lượng" (khiếu nại tranh chấp).
*   **[login/page.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/app/login/page.tsx)**: Form đăng nhập tinh gọn phong cách fintech. Hỗ trợ đăng nhập tài khoản truyền thống bằng email/password kết hợp tùy chọn liên kết ví Web3 Phantom trực tiếp.

### LỚP COMPONENT CHỨC NĂNG (`components/`)
*   **[DisputeReportForm.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/dispute/DisputeReportForm.tsx)**: Cung cấp giao diện cho Nhà thu mua hoặc Nông dân khai báo lý do khiếu nại (Nông sản bị hỏng, sai khối lượng, giao hàng trễ) kèm theo mô tả chi tiết để làm dữ liệu đầu vào cho AI phân xử.
*   **[UploadEvidenceForm.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/dispute/UploadEvidenceForm.tsx)**: Xử lý phần tải lên bằng chứng trực quan (hình ảnh, video chất lượng nông sản tại điểm giao nhận), tự động lưu trữ vào Supabase Storage làm dữ liệu đối chứng pháp lý.
*   **[SettlementProposal.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/dispute/SettlementProposal.tsx)**: Hiển thị đề xuất tỷ lệ hoàn trả tiền cọc do AI tính toán hoặc tự thỏa thuận (Ví dụ: hoàn trả 30% cho Người mua, giải ngân 70% còn lại cho Người bán).
*   **[TimeoutClaimButton.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/dispute/TimeoutClaimButton.tsx)**: Kích hoạt rút tiền ký quỹ tự động từ tài khoản Escrow on-chain về lại ví Người mua nếu quá thời hạn giao nhận mà không có bất kỳ tương tác nào từ phía Người bán.
*   **[DraftContractTable.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/negotiation/DraftContractTable.tsx)**: Bảng thông tin động cập nhật liên tục các điều khoản chính: Tên nông sản, Đơn giá/kg, Số lượng tạ/tấn, Hạn giao hàng, Tỷ lệ cọc. Bảng tự động nhảy số khi AI trích xuất được từ giọng nói cuộc gọi.
*   **[PriceWarningBanner.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/negotiation/PriceWarningBanner.tsx)**: Banner cảnh báo thông minh so sánh giá đàm phán hiện tại với dữ liệu giá thị trường nông sản thời gian thực nhằm bảo vệ nông dân không bị ép giá sâu dưới mức trung bình.
*   **[VideoCallFrame.tsx](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/components/shared/VideoCallFrame.tsx)**: Xử lý logic kết nối WebRTC/Agora SDK, kết xuất camera local và camera của đối tác đàm phán lên màn hình.

### LỚP LIÊN KẾT BLOCKCHAIN & DỮ LIỆU (HOOKS & LIBS - `hooks/` & `lib/`)
*   **[useEscrow.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/hooks/useEscrow.ts)**: Cầu nối JavaScript sang Solana Blockchain. Chứa các hàm tạo transaction ký bằng ví của user để:
    *   `initializeEscrow`: Khởi tạo tài khoản ký quỹ nông sản trên mạng Solana, chuyển tiền cọc vào tài khoản chương trình.
    *   `confirmReceipt`: Gửi chỉ lệnh xác nhận hoàn thành, giải ngân toàn bộ số tiền đang khóa trong Escrow cho Nông dân.
    *   `resolvePartial`: Gửi chỉ lệnh giải quyết tranh chấp theo tỷ lệ phân chia được đồng ý, tự động chia tiền và trả về ví hai bên.
*   **[extractContractTerms.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/ai/extractContractTerms.ts)**: Chứa logic gọi mô hình ngôn ngữ lớn (Gemini API) để phân tích đoạn transcript đàm phán dạng text, trả ra dữ liệu JSON chứa các thông số hợp đồng sạch để cập nhật UI.
*   **[proposeSettlement.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/settlement/proposeSettlement.ts)**: Nhận mô tả sự cố và hình ảnh/video bằng chứng tranh chấp, sử dụng AI phân tích mức độ thiệt hại thực tế, đề xuất tỷ lệ chia tiền hợp lý để hai bên thỏa thuận thay vì phải ra tòa.
*   **[program.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/solana/program.ts)**: Khởi tạo Anchor Provider sử dụng thông tin kết nối ví Phantom hiện tại và IDL đã tạo để gọi các hàm của smart contract trên môi trường Devnet/Localnet.
*   **[client.ts](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/lib/supabase/client.ts)**: Cung cấp client kết nối dữ liệu Supabase, đảm bảo đồng bộ hóa trạng thái giữa cơ sở dữ liệu tập trung (lưu trữ lịch sử chat, avatar, văn bản hợp đồng) và trạng thái on-chain trên blockchain.

### HỢP ĐỒNG THÔNG MINH ON-CHAIN (RUST/ANCHOR - `programs/`)
*   **[lib.rs](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/programs/agritrust_escrow/src/lib.rs)**: Khai báo chương trình Solana Anchor. Định nghĩa các entrypoint chính cho phép Next.js gọi lệnh khởi tạo, xác nhận, rút tiền quá hạn hoặc phân chia một phần.
*   **[state.rs](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/programs/agritrust_escrow/src/state.rs)**: Định nghĩa cấu trúc dữ liệu lưu trên Solana Ledger bao gồm: khóa công khai của người mua (buyer), người bán (seller), số lượng token ký quỹ, thời gian hết hạn (expiry), trạng thái hoàn tất hay đang xử lý.
*   **[initialize.rs](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/programs/agritrust_escrow/src/instructions/initialize.rs)**: Thực hiện chuyển token (USDC/SOL) từ ví của người mua vào tài khoản ví ký quỹ do Program kiểm soát và tạo tài khoản trạng thái tương ứng.
*   **[confirm_receipt.rs](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/programs/agritrust_escrow/src/instructions/confirm_receipt.rs)**: Thực thi lệnh giải ngân toàn bộ số tiền đang lưu trữ trong Escrow sang ví người bán khi người mua đã nhấn đồng ý xác nhận nhận hàng.
*   **[resolve_partial.rs](file:///Users/nguyenthanhhuyen/Pictures/tai_lieu/4FISH_HACKATHON/agritrust/programs/agritrust_escrow/src/instructions/resolve_partial.rs)**: Giải quyết tranh chấp. Phân chia số dư tài khoản ký quỹ theo tỷ lệ `B%` cho người mua và `S%` cho người bán sau đó tự động giải phóng tài khoản Escrow.

---

Tài liệu này sẽ giúp bạn dễ dàng nắm bắt vị trí của từng cấu phần logic khi phát triển các tính năng tiếp theo của dự án **AgriTrust**!
