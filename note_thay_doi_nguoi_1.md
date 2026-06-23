# 🔵 Hướng dẫn & Nhật ký bàn giao — Người 1 (Blockchain / Smart Contract Solana)

Tài liệu này tổng hợp toàn bộ các tệp tin đã hoàn thiện thuộc sở hữu của **Người 1**, hướng dẫn cài đặt môi trường cần thiết, và các bước kiểm thử chi tiết. Nhóm có thể ghép các tệp tin dưới đây vào nhánh chính mà không sợ ảnh hưởng đến mã nguồn của các thành viên khác (Người 2, 3, 4).

---

## 📂 1. Danh sách các file hoàn thành (100% thuộc sở hữu của Người 1)

Các tệp tin sau đây nằm trong phạm vi sở hữu của Người 1 và đã được xây dựng hoàn thiện:

*   **Cấu hình Workspace & Solana Program:**
    *   [Cargo.toml](file:///d:/Downloads/agritrust-main/agritrust-main/Cargo.toml) (Khai báo workspace và cấu hình tối ưu hóa release)
    *   [Anchor.toml](file:///d:/Downloads/agritrust-main/agritrust-main/Anchor.toml) (Cấu hình Anchor CLI cho localnet & devnet, script kiểm thử)
    *   [programs/agritrust_escrow/Cargo.toml](file:///d:/Downloads/agritrust-main/agritrust-main/programs/agritrust_escrow/Cargo.toml) (Các thư viện phụ thuộc của program như `anchor-lang` và `anchor-spl` phiên bản `0.32.1`)
*   **Mã nguồn Smart Contract (Rust):**
    *   [programs/agritrust_escrow/src/lib.rs](file:///d:/Downloads/agritrust-main/agritrust-main/programs/agritrust_escrow/src/lib.rs) (Khai báo entrypoint chính của chương trình `agritrust_escrow`)
    *   [programs/agritrust_escrow/src/state.rs](file:///d:/Downloads/agritrust-main/agritrust-main/programs/agritrust_escrow/src/state.rs) (Khai báo `EscrowAccount` lưu dữ liệu on-chain và enum trạng thái `EscrowStatus`)
    *   [programs/agritrust_escrow/src/errors.rs](file:///d:/Downloads/agritrust-main/agritrust-main/programs/agritrust_escrow/src/errors.rs) (Định nghĩa các mã lỗi nghiệp vụ, ví dụ: gọi trùng lặp, sai người bán, chưa đến hạn giải ngân)
    *   [programs/agritrust_escrow/src/instructions/mod.rs](file:///d:/Downloads/agritrust-main/agritrust-main/programs/agritrust_escrow/src/instructions/mod.rs) (Khai báo module các chỉ lệnh)
    *   [programs/agritrust_escrow/src/instructions/initialize.rs](file:///d:/Downloads/agritrust-main/agritrust-main/programs/agritrust_escrow/src/instructions/initialize.rs) (Khởi tạo tài khoản escrow PDA, tạo vault token account, chuyển tiền ký quỹ của người mua vào vault và đặt trạng thái là `Locked`)
    *   [programs/agritrust_escrow/src/instructions/confirm_receipt.rs](file:///d:/Downloads/agritrust-main/agritrust-main/programs/agritrust_escrow/src/instructions/confirm_receipt.rs) (Thương lái nhận đủ hàng, giải ngân 100% tiền trong vault cho người bán, đổi trạng thái sang `Resolved`)
    *   [programs/agritrust_escrow/src/instructions/resolve_partial.rs](file:///d:/Downloads/agritrust-main/agritrust-main/programs/agritrust_escrow/src/instructions/resolve_partial.rs) (Giải quyết khi giao thiếu hàng: chuyển tiền cho người bán theo số lượng thực tế `actual_qty * unit_price`, hoàn trả phần thừa cho thương lái, đổi trạng thái sang `Resolved`)
    *   [programs/agritrust_escrow/src/instructions/claim_timeout.rs](file:///d:/Downloads/agritrust-main/agritrust-main/programs/agritrust_escrow/src/instructions/claim_timeout.rs) (Nếu quá hạn `deadline` mà không có hành động nào, người bán được quyền rút toàn bộ 100% tiền ký quỹ, đổi trạng thái sang `TimedOut`)
*   **Mã nguồn Tương tác phía Giao diện & Test (TypeScript):**
    *   [types/escrowStatus.ts](file:///d:/Downloads/agritrust-main/agritrust-main/types/escrowStatus.ts) (Ánh xạ enum `EscrowStatus` sang TypeScript)
    *   [lib/solana/idl.json](file:///d:/Downloads/agritrust-main/agritrust-main/lib/solana/idl.json) (IDL tạm thời đồng bộ 100% với smart contract để Người 2 viết frontend)
    *   [lib/solana/program.ts](file:///d:/Downloads/agritrust-main/agritrust-main/lib/solana/program.ts) (Helper lấy kết nối Devnet và tạo instance Anchor Program)
    *   [lib/solana/scripts/seedDemoWallets.ts](file:///d:/Downloads/agritrust-main/agritrust-main/lib/solana/scripts/seedDemoWallets.ts) (Kịch bản airdrop SOL cho các ví demo Phantom trước buổi thuyết trình)
    *   [tests/escrow.test.ts](file:///d:/Downloads/agritrust-main/agritrust-main/tests/escrow.test.ts) (Bộ kiểm thử tự động toàn bộ 4 chức năng chính on-chain)

---

## 🛠️ 2. Yêu cầu Cài đặt Môi trường (Để Build & Test)

Do máy tính hiện tại chưa cài đặt bộ công cụ phát triển Solana/Rust, bạn cần cài đặt các công cụ sau để chạy thử nghiệm smart contract:

### Bước 1: Cài đặt Rust & Cargo (Trình biên dịch Rust)
1. Tải và cài đặt thông qua **Rustup**: [https://rustup.rs/](https://rustup.rs/) (chọn bản cài đặt cho Windows và làm theo hướng dẫn trên terminal).
2. Kiểm tra cài đặt thành công:
   ```bash
   rustc --version
   cargo --version
   ```

### Bước 2: Cài đặt Solana CLI (Bộ công cụ dòng lệnh Solana)
1. Mở PowerShell với quyền Administrator và chạy lệnh cài đặt phiên bản ổn định (v1.18 hoặc mới hơn):
   ```powershell
   cmd /c "curl -L https://release.solana.com/v1.18.15/solana-install-init.x86_64-pc-windows-msvc.exe --output %USERPROFILE%\.config\solana\install\solana-install-init.exe --create-dirs"
   # Thêm đường dẫn vào biến môi trường bằng cách chạy tiếp file installer:
   %USERPROFILE%\.config\solana\install\solana-install-init.exe v1.18.15
   ```
2. Khởi động lại terminal và kiểm tra cài đặt:
   ```bash
   solana --version
   ```

### Bước 3: Cài đặt Anchor CLI
1. Cài đặt Anchor CLI (phiên bản `0.30.1` hoặc mới nhất tương thích với `0.32.1` bằng Cargo):
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```
2. Kiểm tra cài đặt:
   ```bash
   anchor --version
   ```

### Bước 4: Cài đặt Node.js Dependencies (Cần thiết cho test file)
1. Đảm bảo bạn đã cài đặt đầy đủ các thư viện trong `package.json` bằng cách chạy ở thư mục gốc:
   ```bash
   npm install
   ```
2. Cài đặt thêm thư viện `@solana/spl-token` (thư viện Token SPL cần thiết riêng cho file kiểm thử của Người 1, được cài đặt riêng để tránh gây xung đột lockfile với các thành viên khác):
   ```bash
   npm install -D @solana/spl-token
   ```

---

## 📝 3. Hướng dẫn Test các Chức năng của Smart Contract

Sau khi cài đặt xong công cụ, bạn tiến hành kiểm thử theo thứ tự sau:

### Kịch bản 1: Kiểm thử Tự động bằng Mocha/Chai (Cách nhanh và chuẩn nhất)

Anchor đã cấu hình sẵn kịch bản chạy test cục bộ bằng cách tự động giả lập một blockchain Solana thu nhỏ (Localnet) và chạy file `tests/escrow.test.ts`.

1. Khởi chạy toàn bộ các bài test bằng một lệnh duy nhất:
   ```bash
   anchor test
   ```
2. Kết quả mong đợi trong terminal:
   ```text
   agritrust_escrow
     ✔ initialize locks buyer funds in the vault (xxx ms)
     ✔ confirm_receipt pays 100% to seller and blocks duplicate calls (xxx ms)
     ✔ resolve_partial pays seller by actual quantity and refunds buyer (xxx ms)
     ✔ claim_timeout pays seller after deadline and blocks duplicate calls (xxx ms)

     4 passing (x s)
   ```

### Kịch bản 2: Đưa lên Solana Devnet thực tế để chuẩn bị tích hợp Frontend

1. **Tạo ví Deploy:**
   Nếu bạn chưa có ví local, tạo mới bằng cách chạy:
   ```bash
   solana-keygen new -o ~/.config/solana/id.json
   ```
2. **Airdrop SOL trên Devnet để làm phí deploy:**
   ```bash
   solana airdrop 2 -u devnet
   ```
3. **Biên dịch Smart Contract:**
   ```bash
   anchor build
   ```
   *Lưu ý:* Lệnh này sẽ tạo ra file IDL chính thức tại `target/idl/agritrust_escrow.json`.
4. **Deploy Smart Contract lên Devnet:**
   ```bash
   anchor deploy --provider.cluster devnet
   ```
5. **Cập nhật IDL cho Frontend:**
   * Sau khi deploy thành công, terminal sẽ hiển thị địa chỉ **Program ID** thực tế của bạn.
   * Cập nhật lại Program ID vào file [Anchor.toml](file:///d:/Downloads/agritrust-main/agritrust-main/Anchor.toml) (ở mục `[programs.devnet]`) và dòng 9 của file [lib.rs](file:///d:/Downloads/agritrust-main/agritrust-main/programs/agritrust_escrow/src/lib.rs).
   * Copy file IDL mới sinh từ `target/idl/agritrust_escrow.json` đè lên file [lib/solana/idl.json](file:///d:/Downloads/agritrust-main/agritrust-main/lib/solana/idl.json). Cập nhật địa chỉ `"address": "YOUR_PROGRAM_ID"` ở đầu file đó để Người 2 kết nối trực tiếp.

### Kịch bản 3: Chạy Script Chuẩn bị ví Demo (Airdrop)

1. Mở file [lib/solana/scripts/seedDemoWallets.ts](file:///d:/Downloads/agritrust-main/agritrust-main/lib/solana/scripts/seedDemoWallets.ts).
2. Điền địa chỉ ví Phantom thực tế của Thương Lái và Nông Dân vào mảng `walletsToSeed` (dòng 11 và 12).
3. Chạy script để nạp sẵn SOL cho các ví demo Phantom trước khi quay clip/demo:
   ```bash
   npx tsx lib/solana/scripts/seedDemoWallets.ts
   ```

---

## 🔀 4. Lưu ý khi Ghép (Merge) code của Người 1

Vì bạn đang làm việc song song, khi ghép code lên nhánh chính hoặc ghép vào code của thành viên khác, bạn chỉ cần lấy các file sau:
1. Copy nguyên thư mục `programs/agritrust_escrow/` sang code của họ.
2. Cập nhật `Anchor.toml` và `Cargo.toml` ở thư mục gốc.
3. Cập nhật file `lib/solana/idl.json` (đây là file duy nhất kết nối logic của bạn với Frontend Người 2).
4. Các file `types/escrowStatus.ts`, `lib/solana/program.ts`, `tests/escrow.test.ts`.

Tuyệt đối **không** đè đè đè hoặc sửa đổi bất kỳ tệp tin nào thuộc `/app`, `/components/negotiation/`, `/components/dispute/`, `/lib/ai/`, `/lib/supabase/queries/` của Người 2, 3, 4 để tránh xung đột mã nguồn (merge conflict).
