import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

// Script này chạy bằng ts-node/tsx để tự động airdrop SOL và chuẩn bị token cho ví demo
async function seedDemo() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  console.log("Khởi chạy script chuẩn bị ví demo...");

  // Địa chỉ các ví demo (Thay thế bằng ví Phantom thực tế của bạn)
  const walletsToSeed = [
    "Vi_Nguoi_Ban_Phantom_Address_Here",
    "Vi_Nguoi_Mua_Phantom_Address_Here"
  ];

  for (const walletStr of walletsToSeed) {
    if (walletStr.includes("Address_Here")) {
      console.log(`Bỏ qua địa chỉ placeholder: ${walletStr}`);
      continue;
    }
    
    const pubkey = new PublicKey(walletStr);
    console.log(`Đang airdrop 2 SOL cho ví ${pubkey.toBase58()}...`);
    
    try {
      const signature = await connection.requestAirdrop(pubkey, 2 * LAMPORTS_PER_SOL);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        ...latestBlockhash
      });
      console.log(`Airdrop thành công! Tx signature: ${signature}`);
    } catch (err) {
      console.error(`Lỗi khi airdrop cho ví ${walletStr}:`, err);
    }
  }
}

seedDemo().then(() => {
  console.log("Script hoàn tất.");
}).catch((err) => {
  console.error("Script gặp lỗi:", err);
});
