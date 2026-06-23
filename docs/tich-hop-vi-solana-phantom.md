# 🦊 Hướng dẫn tích hợp kết nối Ví Solana (Phantom)

Tài liệu này giải thích cách AgriTrust tích hợp **Phantom Wallet** — ví Solana phổ biến nhất — để xác thực, ký giao dịch, và tương tác với Smart Contract Escrow.

---

## 1. Kiến trúc tổng quan

```
Layout (app/layout.tsx)
 └── WalletContextProvider      ← Bọc toàn bộ ứng dụng
      ├── ConnectionProvider     ← Kết nối RPC Solana Devnet
      ├── WalletProvider         ← Quản lý trạng thái ví
      │   └── WalletModalProvider ← Modal chọn ví (có sẵn UI)
      └── AuthProvider           ← Xác thực người dùng
           └── App Pages
                ├── ConnectWalletButton  ← Nút "Kết nối ví"
                ├── useWallet hook       ← Lấy publicKey, balance, sendTransaction
                └── WalletBalance        ← Hiển thị số dư SOL/USDC
```

### Luồng chi tiết khi nhấn "Kết nối ví"

```
1. User nhấn "Kết nối ví"
2. WalletModalProvider mở popup chọn ví (Phantom)
3. Phantom extension hiện ra → User phê duyệt
4. @solana/wallet-adapter-react cập nhật:
   - connected = true
   - publicKey = địa chỉ ví Phantom
5. ConnectWalletButton (useEffect) phát hiện connected == true
6. Gọi updateWalletAddress() → lưu địa chỉ ví lên Supabase
7. WalletBalance tự động fetch số dư SOL
8. Các component khác dùng useWallet() nhận được publicKey
```

---

## 2. Các package đã cài

```json
{
  "@solana/web3.js": "^1.98.4",
  "@solana/wallet-adapter-base": "^0.9.27",
  "@solana/wallet-adapter-react": "^0.15.39",
  "@solana/wallet-adapter-react-ui": "^0.9.39",
  "@solana/wallet-adapter-wallets": "^0.19.38",
  "@coral-xyz/anchor": "^0.32.1"
}
```

---

## 3. WalletContextProvider — Bọc ứng dụng

**File:** `components/shared/WalletContextProvider.tsx`

Đây là component root bọc toàn bộ ứng dụng. Nó thiết lập:

| Provider | Vai trò |
|---|---|
| `ConnectionProvider` | Kết nối đến RPC endpoint Solana (Devnet) |
| `WalletProvider` | Quản lý danh sách ví (ở đây chỉ Phantom) + autoConnect |
| `WalletModalProvider` | Cung cấp UI modal để người dùng chọn và kết nối ví |

```tsx
// Chỉ hỗ trợ Phantom
const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

// Mạng: Devnet
const network = WalletAdapterNetwork.Devnet;

// Endpoint: ưu tiên env, fallback về Devnet
const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network);
```

> **📌 Lưu ý:** Trong file `.env` bạn có thể set RPC riêng:
> ```
> NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
> ```

**Đăng ký trong `app/layout.tsx`:**

```tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WalletContextProvider>   {/* ← Bọc ở đây */}
          <AuthProvider>
            {children}
          </AuthProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
```

---

## 4. Hook useWallet

**File:** `hooks/useWallet.ts`

Wrapper xung quanh `useWallet()` của `@solana/wallet-adapter-react`, bổ sung:

```tsx
export function useWallet() {
  const {
    wallet,          // Đối tượng ví Phantom
    publicKey,       // PublicKey (địa chỉ ví)
    connected,       // boolean
    sendTransaction, // Hàm gửi giao dịch
    select,          // Chọn ví
    disconnect,      // Ngắt kết nối
    wallets,         // Danh sách ví hỗ trợ
  } = useSolanaWallet();

  const [balance, setBalance] = useState<number>(0);

  // Tự động fetch số dư SOL mỗi 10 giây
  useEffect(() => {
    if (!publicKey) return;
    const connection = getConnection();
    const fetchBalance = async () => {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / 1e9); // Lamports → SOL
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [publicKey]);

  return { wallet, publicKey, connected, balance, sendTransaction, select, disconnect, wallets };
}
```

---

## 5. ConnectWalletButton — Nút kết nối

**File:** `components/shared/ConnectWalletButton.tsx`

Giao diện nút có 2 trạng thái:

| Trạng thái | Giao diện |
|---|---|
| **Chưa kết nối** | Nút xanh "Kết nối ví" → onClick gọi `setVisible(true)` mở modal Phantom |
| **Đã kết nối** | Nút trắng-xanh hiển thị `0xAbc...DeF` + chấm xanh lá nhấp nháy |

**Luồng tự động lưu ví vào database:**

```tsx
useEffect(() => {
  if (connected && publicKey && user) {
    const newAddress = publicKey.toBase58();
    if (user.dia_chi_vi !== newAddress) {
      updateWalletAddress(user.ten_dang_nhap, newAddress)
        .then(() => {
          updateUser({ ...user, dia_chi_vi: newAddress });
        })
        .catch((err) => {
          if (err.code === '23505') { // duplicate key
            alert('Ví Phantom này đã được liên kết với tài khoản khác!');
          }
        });
    }
  }
}, [connected, publicKey, user]);
```

---

## 6. WalletBalance — Hiển thị số dư

**File:** `components/shared/WalletBalance.tsx`

```tsx
export default function WalletBalance() {
  const { connected, balance } = useWallet();
  if (!connected) return null;

  return (
    <div>
      <span>{balance.toFixed(4)}</span> {/* Số dư SOL */}
      <span>--</span>                    {/* Số dư USDC (chưa implement) */}
    </div>
  );
}
```

---

## 7. Gửi giao dịch lên Smart Contract

Khi user cần khóa tiền (Lock Funds) hoặc xác nhận (Confirm Receipt), dùng `sendTransaction` từ hook:

```tsx
const { sendTransaction, publicKey } = useWallet();

const handleLockFunds = async () => {
  const connection = getConnection();
  const { blockhash } = await connection.getLatestBlockhash();

  const transaction = new Transaction().add(
    // Các instruction từ Smart Contract Escrow
  );
  transaction.feePayer = publicKey;
  transaction.recentBlockhash = blockhash;

  const signature = await sendTransaction(transaction, connection);
  console.log('Transaction sent:', signature);
};
```

Hoặc dùng Anchor Program (đã có sẵn trong `lib/solana/program.ts`):

```tsx
import { getProgram } from '@/lib/solana/program';
import { useWallet } from '@/hooks/useWallet';

const { wallet } = useWallet();

const program = getProgram(wallet);
const tx = await program.methods
  .initialize(amount)
  .accounts({ /* PDA accounts */ })
  .rpc();
```

---

## 8. File .env cần thiết

```env
# Solana RPC (mặc định dùng Devnet nếu không set)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

---

## 9. Troubleshooting

| Vấn đề | Nguyên nhân | Cách sửa |
|---|---|---|
| Popup Phantom không hiện | Thiếu `WalletModalProvider` | Kiểm tra `WalletContextProvider` đã bọc đúng layout |
| "Invalid API key" | Anon key Supabase sai | Copy đúng key từ Supabase Dashboard → Project Settings → API |
| "Ví đã tồn tại" | Địa chỉ ví đã liên kết tài khoản khác | Đổi Account trong Phantom extension |
| `sendTransaction` lỗi | User chưa kết nối hoặc mạng sai | Kiểm tra `connected == true` và mạng là Devnet |
| Số dư hiển thị 0 | Chưa có SOL trên Devnet | Dùng faucet: `solana airdrop 2 <địa_chỉ_ví> --url devnet` |

---

## 10. Tóm tắt các bước tích hợp từ đầu

```bash
# Bước 1: Cài package
npm install @solana/web3.js @solana/wallet-adapter-base \
  @solana/wallet-adapter-react @solana/wallet-adapter-react-ui \
  @solana/wallet-adapter-wallets @coral-xyz/anchor

# Bước 2: Tạo WalletContextProvider (đã có sẵn trong dự án)
# Bước 3: Bọc vào layout.tsx
# Bước 4: Tạo ConnectWalletButton
# Bước 5: Tạo hook useWallet
# Bước 6: Thêm WalletBalance vào navigation
# Bước 7: Kết nối với Auth system (lưu địa chỉ ví vào Supabase)
```

---

## 11. Các file liên quan trong dự án

| File | Chức năng |
|---|---|
| `components/shared/WalletContextProvider.tsx` | Bọc Provider, cấu hình Devnet + Phantom |
| `components/shared/ConnectWalletButton.tsx` | Nút kết nối + đồng bộ DB |
| `components/shared/WalletBalance.tsx` | Hiển thị số dư SOL |
| `hooks/useWallet.ts` | Hook lấy publicKey, balance, sendTransaction |
| `lib/solana/program.ts` | Khởi tạo Anchor Program |
| `hooks/useAuth.tsx` | Auth context (lưu dia_chi_vi vào session) |
| `lib/supabase/queries/auth.ts` | updateWalletAddress() — lưu ví lên Supabase |
