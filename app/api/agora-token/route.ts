import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channelName = searchParams.get('channelName');

  if (!channelName) {
    return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
  }

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || '';
  const appCertificate = process.env.AGORA_APP_CERTIFICATE || '';

  // Nếu không cấu hình App Certificate trong env, trả về token = null (thử chế độ App ID only)
  if (!appCertificate) {
    console.warn('[Agora Token API] AGORA_APP_CERTIFICATE is not configured. Returning null token.');
    return NextResponse.json({ token: null, message: 'No certificate configured' });
  }

  try {
    const uid = 0; // 0 cho phép mọi người kết nối
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600; // 1 giờ

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      expirationTimeInSeconds, // tokenExpire in seconds
      expirationTimeInSeconds  // privilegeExpire in seconds
    );

    console.log(`[Agora Token API] Đã sinh token cho kênh ${channelName}: ${token.substring(0, 10)}...`);
    return NextResponse.json({ token });
  } catch (err: any) {
    console.error('[Agora Token API] Lỗi sinh token:', err);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
