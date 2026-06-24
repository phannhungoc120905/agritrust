import { NextRequest } from 'next/server';
import { extractContractTerms } from '../../../lib/ai/extractContractTerms';

/**
 * POST /api/extract-terms
 * Server-side endpoint gọi MiniMax-M3 (qua TokenRouter) để trích xuất điều khoản hợp đồng
 * từ transcript hội thoại đàm phán.
 * 
 * Body: { transcript: string }
 * Response: ExtractedTerms JSON
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, productName } = body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return Response.json(
        { error: 'Transcript không hợp lệ hoặc rỗng.' },
        { status: 400 }
      );
    }

    try {
      const terms = await extractContractTerms(transcript, productName);

      // If model returned low or missing confidence, surface partial terms but inform caller
      if (terms.confidence === null || typeof terms.confidence === 'number' && terms.confidence < 0.6) {
        console.warn('AI returned low or missing confidence:', terms.confidence);
        return Response.json(
          {
            success: false,
            error: 'AI đánh giá kết quả có độ tin cậy thấp — cần thêm thông tin hoặc xác nhận thủ công.',
            terms,
          },
          { status: 422 }
        );
      }

      return Response.json({ success: true, terms });
    } catch (err: any) {
      if (err?.message === 'INSUFFICIENT_DATA') {
        return Response.json({ success: false, error: 'Không đủ dữ liệu để trích xuất hợp đồng từ cuộc hội thoại.' }, { status: 422 });
      }
      if (err?.message === 'AI_NOT_CONFIGURED') {
        return Response.json({ success: false, error: 'AI chưa được cấu hình trên server (OPENAI_API_KEY chưa đặt).' }, { status: 500 });
      }
      if (err?.message === 'API_QUOTA_EXCEEDED') {
        return Response.json({ success: false, error: 'Tài khoản TokenRouter / Minimax đã hết tiền (Quota Exceeded). Vui lòng nạp thêm tiền hoặc đổi API Key khác trong .env.local' }, { status: 402 });
      }
      if (err?.message === 'AI_EXTRACTION_FAILED') {
        return Response.json({ success: false, error: 'Lỗi khi gọi dịch vụ AI — thử lại sau.' }, { status: 502 });
      }
      console.error('Unhandled error in /api/extract-terms:', err);
      throw err;
    }
  } catch (error: any) {
    console.error('API /api/extract-terms lỗi:', error);
    return Response.json(
      { error: error.message || 'Lỗi server khi trích xuất điều khoản.' },
      { status: 500 }
    );
  }
}
