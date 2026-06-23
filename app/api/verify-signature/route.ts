import { NextResponse } from 'next/server';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { publicKey, signature, message, contractData, signerName } = await req.json();

    if (!publicKey || !signature || !message || !contractData || !signerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Giải mã thông điệp và chữ ký
    const messageUint8 = new TextEncoder().encode(message);
    const signatureUint8 = bs58.decode(signature);
    const pubKeyUint8 = bs58.decode(publicKey);

    // Xác thực chữ ký bằng thuật toán Ed25519 (chuẩn của Solana)
    const isValid = nacl.sign.detached.verify(messageUint8, signatureUint8, pubKeyUint8);

    if (!isValid) {
      return NextResponse.json({ error: 'Chữ ký Solana không hợp lệ' }, { status: 401 });
    }

    // Tạo nội dung tổng hợp để băm (Hash)
    // Nội dung này bao gồm dữ liệu hợp đồng, tên người ký và địa chỉ ví, đảm bảo tính toàn vẹn và không thể chối cãi.
    const payloadToHash = JSON.stringify({
      contract: contractData,
      signerName: signerName,
      wallet: publicKey
    });

    // Băm bằng thuật toán SHA256
    const sha256Hash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

    return NextResponse.json({
      success: true,
      hash: sha256Hash,
      message: 'Xác thực chữ ký thành công và đã tạo mã băm hợp đồng'
    });
  } catch (error: any) {
    console.error('Error verifying signature:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống khi xác thực chữ ký' }, { status: 500 });
  }
}
