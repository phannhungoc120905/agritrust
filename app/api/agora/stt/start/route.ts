import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

export async function POST(request: NextRequest) {
  try {
    const { channelName } = await request.json();

    if (!channelName) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || '';
    const appCertificate = process.env.AGORA_APP_CERTIFICATE || '';
    const customerId = process.env.AGORA_CUSTOMER_ID || '';
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET || '';

    // Nếu không cấu hình RESTful Credentials, từ chối và yêu cầu fallback sang Web Speech API
    if (!customerId || !customerSecret) {
      console.warn('[Agora STT API] AGORA_CUSTOMER_ID or AGORA_CUSTOMER_SECRET is missing.');
      return NextResponse.json({
        error: 'RESTful Credentials are not configured. Fallback to client-side STT.',
        code: 'CREDENTIALS_MISSING'
      }, { status: 400 });
    }

    const botUid = 888; // Đặt UID cố định cho STT Bot
    const expirationTimeInSeconds = 3600; // 1 giờ

    // Sinh token cho STT Bot tham gia kênh đàm thoại
    const token = appCertificate
      ? RtcTokenBuilder.buildTokenWithUid(
          appId,
          appCertificate,
          channelName,
          botUid,
          RtcRole.PUBLISHER,
          expirationTimeInSeconds,
          expirationTimeInSeconds
        )
      : '';

    // Tạo mã Basic Auth cho REST API của Agora
    const basicAuth = 'Basic ' + Buffer.from(`${customerId}:${customerSecret}`).toString('base64');

    // Cấu hình request body theo đúng chuẩn v7.x của Agora STT
    const payload: any = {
      rtcConfig: {
        channelName: channelName,
        uid: String(botUid),
        token: token
      },
      asrConfig: {
        languages: ['vi-VN'],
        smartPunctuation: true
      }
    };

    // Tự động bổ sung cấu hình ghi đè lưu trữ S3 nếu có trong .env
    const s3Bucket = process.env.S3_BUCKET_NAME;
    const s3AccessKey = process.env.S3_ACCESS_KEY;
    const s3SecretKey = process.env.S3_SECRET_KEY;
    const s3Region = process.env.S3_REGION || 'ap-southeast-1';

    if (s3Bucket && s3AccessKey && s3SecretKey) {
      payload.captionConfig = {
        storageConfig: {
          vendor: 1, // Amazon S3
          region: s3Region,
          bucket: s3Bucket,
          accessKey: s3AccessKey,
          secretKey: s3SecretKey,
          fileNamePrefix: [`stt_${channelName}`]
        }
      };
    }

    console.log(`[Agora STT REST] Đang gọi join cho kênh: ${channelName}, Bot UID: ${botUid}`);

    const response = await fetch(`https://api.agora.io/api/speech-to-text/v1/projects/${appId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': basicAuth
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Agora STT REST] Agora API trả về lỗi: ${response.status} - ${errText}`);
      return NextResponse.json({
        error: `Agora Speech-to-Text service rejected request: ${errText}`,
        status: response.status
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`[Agora STT REST] Bật STT thành công cho kênh ${channelName}, Agent ID: ${data.agentId}`);

    return NextResponse.json({
      success: true,
      agentId: data.agentId,
      botUid: botUid
    });

  } catch (err: any) {
    console.error('[Agora STT API] Gặp lỗi hệ thống khi start:', err);
    return NextResponse.json({ error: err.message || 'System error starting Agora STT' }, { status: 500 });
  }
}
