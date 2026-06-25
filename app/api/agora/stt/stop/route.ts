import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || '';
    const customerId = process.env.AGORA_CUSTOMER_ID || '';
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET || '';

    if (!customerId || !customerSecret) {
      return NextResponse.json({
        error: 'RESTful Credentials are not configured.'
      }, { status: 400 });
    }

    // Tạo mã Basic Auth cho REST API của Agora
    const basicAuth = 'Basic ' + Buffer.from(`${customerId}:${customerSecret}`).toString('base64');

    console.log(`[Agora STT REST] Đang gọi leave cho Agent ID: ${agentId}`);

    // Gọi API của Agora để tắt Bot STT
    const response = await fetch(`https://api.agora.io/api/speech-to-text/v1/projects/${appId}/agents/${agentId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': basicAuth
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Agora STT REST] Agora API leave trả về lỗi: ${response.status} - ${errText}`);
      return NextResponse.json({
        error: `Agora Speech-to-Text service rejected leave request: ${errText}`,
        status: response.status
      }, { status: response.status });
    }

    console.log(`[Agora STT REST] Đã tắt thành công Agent ID: ${agentId}`);

    return NextResponse.json({
      success: true,
      message: 'STT agent left the channel successfully.'
    });

  } catch (err: any) {
    console.error('[Agora STT API] Gặp lỗi hệ thống khi stop:', err);
    return NextResponse.json({ error: err.message || 'System error stopping Agora STT' }, { status: 500 });
  }
}
