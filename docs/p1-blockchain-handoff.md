# P1 Blockchain Handoff Notes

Nguoi thuc hien: P1 - Blockchain / Smart Contract Solana.

Muc tieu: hoan thanh phan escrow on-chain rieng cua P1 theo file `nhiemvu.docx`, han che cham vao code P2/P3/P4.

## File P1 da thay doi hoac tao moi

- `programs/agritrust_escrow/src/state.rs`
  - Them `EscrowStatus`.
  - Mo rong `EscrowAccount` de luu buyer, seller, mint, token accounts, vault, unit_price, expected_qty, deadline, total_amount, bump.

- `programs/agritrust_escrow/src/errors.rs`
  - Them loi domain cho guard: `NotLocked`, `DeadlineNotPassed`, `InvalidQuantity`, `MathOverflow`, `SellerMismatch`.

- `programs/agritrust_escrow/src/instructions/initialize.rs`
  - Tao escrow PDA.
  - Tao vault token account.
  - Chuyen token tu buyer token account vao vault.
  - Set `status = Locked`.

- `programs/agritrust_escrow/src/instructions/confirm_receipt.rs`
  - Chi cho chay khi `status == Locked`.
  - Chuyen 100% token trong vault cho seller.
  - Set `status = Resolved`.

- `programs/agritrust_escrow/src/instructions/resolve_partial.rs`
  - Chi cho chay khi `status == Locked`.
  - Kiem tra `actual_qty <= expected_qty`.
  - Tinh `payout = unit_price * actual_qty`.
  - Chuyen payout cho seller, refund phan con lai cho buyer.
  - Set `status = Resolved`.

- `programs/agritrust_escrow/src/instructions/claim_timeout.rs`
  - Chi cho chay khi `status == Locked`.
  - Kiem tra `Clock::get()?.unix_timestamp >= deadline`.
  - Chuyen 100% token trong vault cho seller.
  - Set `status = TimedOut`.

- `programs/agritrust_escrow/Cargo.toml`
  - Them Cargo config rieng cho Anchor program.
  - Dung `anchor-lang = 0.32.1`, `anchor-spl = 0.32.1`.

- `Cargo.toml`
  - Them workspace Rust toi `programs/agritrust_escrow`.

- `Anchor.toml`
  - Them cau hinh Anchor localnet/devnet cho program `agritrust_escrow`.

- `tests/escrow.test.ts`
  - Viet test skeleton/implementation cho 4 ham P1.
  - Luu y: de chay test nay can cai them dev dependency test `@solana/spl-token` va co Anchor CLI/Rust/Cargo.

- `lib/solana/idl.json`
  - Cap nhat IDL tam theo interface moi cua smart contract.
  - File nay la san pham ban giao cua P1 cho P2. Khi P1 build/deploy that, nen thay bang IDL do `anchor build` sinh ra.

## File shared da tranh cham tiep

- Khong sua `hooks/useEscrow.ts`.
- Khong sua `app/*`.
- Khong sua `components/*`.
- Da go lai dependency/script da them trong `package.json` va `package-lock.json` de tranh conflict voi nguoi khac.

## Interface P2 can biet khi ghep

PDA escrow:

```ts
PublicKey.findProgramAddressSync(
  [
    Buffer.from("escrow"),
    buyer.toBuffer(),
    seller.toBuffer(),
    mint.toBuffer(),
  ],
  programId
)
```

PDA vault:

```ts
PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), escrowAccount.toBuffer()],
  programId
)
```

`initialize(unitPrice, expectedQty, deadline, seller)` can accounts:

- `buyer`
- `seller`
- `mint`
- `buyerTokenAccount`
- `sellerTokenAccount`
- `escrowAccount`
- `vault`
- `systemProgram`
- `tokenProgram`
- `rent`

`confirmReceipt()` can accounts:

- `buyer`
- `seller`
- `mint`
- `sellerTokenAccount`
- `vault`
- `escrowAccount`
- `tokenProgram`

`resolvePartial(actualQty)` can accounts:

- `buyer`
- `seller`
- `mint`
- `buyerTokenAccount`
- `sellerTokenAccount`
- `vault`
- `escrowAccount`
- `tokenProgram`

`claimTimeout()` can accounts:

- `seller`
- `buyer`
- `mint`
- `sellerTokenAccount`
- `vault`
- `escrowAccount`
- `tokenProgram`

## Viec P1 con can lam tren may co toolchain Solana

May hien tai chua co `anchor` va `cargo`, nen chua build/deploy/test duoc.

Lenh can chay sau khi cai toolchain:

```bash
anchor build
anchor test
anchor deploy --provider.cluster devnet
```

Sau deploy:

- Copy IDL that tu `target/idl/agritrust_escrow.json` sang `lib/solana/idl.json`.
- Ghi Program ID devnet vao note/README rieng cho P2.
- Neu Program ID thay doi, cap nhat `declare_id!()` trong `programs/agritrust_escrow/src/lib.rs` va `Anchor.toml`.

## Luu y merge

Neu team dang code song song, nen merge theo cach:

1. Lay nguyen thu muc `programs/agritrust_escrow`.
2. Lay `Anchor.toml` va `Cargo.toml` neu branch chinh chua co Anchor config.
3. Lay `lib/solana/idl.json` sau cung, vi P2 co the dang dung file nay.
4. Khong bat buoc lay `tests/escrow.test.ts` neu branch chinh chua setup Anchor test dependencies.
