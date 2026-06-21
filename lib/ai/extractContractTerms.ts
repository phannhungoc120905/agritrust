import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.NEXT_PUBLIC_AI_BASE_URL || 'https://api.tokenrouter.com/v1',
});

export interface ExtractedTerms {
  san_pham: string | null;
  so_luong: number | null;
  don_vi_tinh: string | null;
  don_gia: number | null;
  han_giao_hang: string | null;
  dieu_khoan_chat_luong: Array<{
    tieu_chi: string;
    nguong_phan_tram: number;
    muc_phat: string;
  }>;
}

export interface ExtractedTermsWithMeta extends ExtractedTerms {
  confidence?: number; // 0.0 - 1.0
  evidence?: string[]; // array of transcript snippets that justify fields
}

const AI_MODEL = process.env.AI_MODEL || 'MiniMax-M3';

/**
 * Trích xuất điều khoản hợp đồng từ hội thoại đàm phán bằng MiniMax-M3 (qua TokenRouter)
 * @param transcript Toàn bộ cuộc hội thoại ghi nhận được
 * @returns JSON chứa các điều khoản hợp đồng
 */
export async function extractContractTerms(transcript: string): Promise<ExtractedTermsWithMeta> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY chưa được cấu hình.');
    throw new Error('AI_NOT_CONFIGURED');
  }

  if (!transcript || transcript.trim().length < 20) {
    console.warn('Transcript quá ngắn, không đủ dữ liệu để trích xuất.');
    throw new Error('INSUFFICIENT_DATA');
  }

  // Heuristic quick score to see if transcript looks like negotiation
  const score = scoreTranscript(transcript);
  if (score < 2) {
    console.warn('Transcript có vẻ không đủ thông tin cần thiết (score=' + score + ').');
    throw new Error('INSUFFICIENT_DATA');
  }

  const todayISO = new Date().toISOString().split('T')[0];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `Bạn là trợ lý AI chuyên phân tích hội thoại thương lượng nông sản B2B tiếng Việt.

Nhiệm vụ: Trích xuất thông tin hợp đồng thành JSON TUYỆT ĐỐI theo schema đã định.

YÊU CẦU KĨ THUẬT:
- Tuyệt đối chỉ trả về 1 object JSON duy nhất trong nội dung trả về (KHÔNG có lời giải thích, không có markdown, không có đoạn văn khác).
- Bổ sung thêm các trường metadata: "confidence" (số từ 0.0 đến 1.0) và "evidence" (mảng chuỗi) giải thích cụ thể đoạn transcript nào hỗ trợ từng trường chính.
- Nếu bạn không chắc về một trường nào đó, đặt giá trị "null" cho trường đó và giảm "confidence" tổng thể.

QUY TẮC CHUYỂN ĐỔI SỐ:
- "9 triệu" => 9000000
- "9 triệu rưỡi" hoặc "9.5 triệu" => 9500000
- "500 nghìn" => 500000
- Đơn vị tiền luôn là VNĐ (trả giá là số nguyên tính bằng VNĐ)

QUY TẮC ĐƠN VỊ & SỐ LƯỢNG:
- "3 tấn rưỡi" => 3.5 (tính theo tấn)
- "nửa tấn" => 0.5
- Giữ đơn vị nếu đối thoại nêu rõ (tấn/kg/bao)

QUY TẮC THỜI GIAN:
- Chuyển các cụm như "5 ngày nữa", "tuần sau", "cuối tuần sau" thành ISO 8601 chính xác (tính từ ngày hôm nay ${todayISO}).

QUY TẮC CHẤT LƯỢNG:
- Tìm tất cả tiêu chí (ví dụ: độ ẩm, tỷ lệ lép, tạp chất). Mỗi tiêu chí phải có "tieu_chi", "nguong_phan_tram" (số) và "muc_phat" (mô tả).

OUTPUT (bắt buộc): JSON object với đúng cấu trúc sau (ví dụ minh hoạ):
{
  "san_pham": "Lúa thơm ST25",
  "so_luong": 10,
  "don_vi_tinh": "tấn",
  "don_gia": 9000000,
  "han_giao_hang": "2026-06-26T00:00:00.000Z",
  "dieu_khoan_chat_luong": [ { "tieu_chi": "do_am", "nguong_phan_tram": 14, "muc_phat": "Trừ 2% mỗi % vượt" } ],
  "confidence": 0.92,
  "evidence": ["Thương lái: Giá 9 triệu một tấn.", "Nông dân: Hạt lép dưới 10%"]
}

QUY TẮC XỬ LÝ KHI THIẾU DỮ LIỆU:
- Nếu transcript không chứa dấu hiệu rõ ràng về giá, số lượng hoặc thời hạn thì: trả "null" cho các trường đó và set "confidence" thấp (< 0.6).

HÃY TRẢ VỀ MỘT JSON HỢP LỆ DUY NHẤT.`
          },
          {
            role: 'user',
            content: `Dưới đây là hội thoại đàm phán giữa nông dân và thương lái:\n\n${transcript}`
          }
        ]
      });

      const resultText = response.choices?.[0]?.message?.content || '{}';
      console.debug('[AI] raw model output:', resultText?.slice ? resultText.slice(0, 2000) : resultText);
      const cleaned = extractJsonObject(resultText);
      let parsed: ExtractedTermsWithMeta;
      try {
        parsed = JSON.parse(cleaned) as ExtractedTermsWithMeta;
      } catch (e) {
        console.warn('Không thể parse JSON trả về từ AI. Raw cleaned output:', cleaned);
        throw new Error('AI_EXTRACTION_FAILED');
      }

      if (!Array.isArray(parsed.dieu_khoan_chat_luong)) {
        parsed.dieu_khoan_chat_luong = [] as any;
      }

      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : null;
      if (confidence === null) {
        console.warn('Model không trả trường "confidence" — sẽ trả về kết quả nhưng đánh dấu confidence=null');
      } else if (confidence < 0.6) {
        console.warn('Model trả confidence thấp:', confidence);
      } else {
        console.log('✅ Trích xuất AI có confidence cao (confidence=' + confidence + ')');
      }

      // Normalize only safe defaults; keep nulls for missing numeric fields so UI can surface them.
      if (!parsed.san_pham) parsed.san_pham = 'Nông sản chưa xác định';
      if (typeof parsed.so_luong !== 'number' || Number.isNaN(parsed.so_luong)) parsed.so_luong = null as any;
      if (typeof parsed.don_gia !== 'number' || Number.isNaN(parsed.don_gia)) parsed.don_gia = null as any;

      // Show parsed object for caller to decide on confidence
      console.debug('AI parsed result (truncated):', JSON.stringify({ ...parsed, evidence: parsed.evidence?.slice?.(0, 3) }, null, 2));
      return parsed;
    } catch (err: any) {
      console.error(`Lỗi trích xuất lần ${attempt + 1}:`, err);
      // If we explicitly know it's an expected control error, rethrow so caller can handle
      if (err?.message === 'INSUFFICIENT_DATA' || err?.message === 'LOW_CONFIDENCE') {
        throw err;
      }

      if (attempt === 0) {
        console.log('Thử lại lần 2...');
        continue;
      }

      console.warn('Cả 2 lần trích xuất đều thất bại.');
      throw new Error('AI_EXTRACTION_FAILED');
    }
  }
  throw new Error('AI_EXTRACTION_FAILED');
}


function extractJsonObject(rawText: string): string {
  const withoutMarkdown = rawText
    .replace(/```(?:json)?\s*/gi, '')
    .replace(/\s*```/gi, '')
    .trim();

  // Find the first balanced JSON object using a depth-counter to avoid
  // being confused by extra braces elsewhere in the text.
  let start = -1;
  let depth = 0;
  for (let i = 0; i < withoutMarkdown.length; i++) {
    const ch = withoutMarkdown[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        return withoutMarkdown.slice(start, i + 1);
      }
    }
  }

  // If no balanced object found, return the cleaned text as-is so caller can
  // attempt more tolerant parsing or fail with a helpful log.
  return withoutMarkdown;
}

function scoreTranscript(transcript: string): number {
  const txt = transcript.toLowerCase();
  let score = 0;

  if (/[0-9]+\s*(triệu|nghìn|đ|vnd|vnđ|tỷ|tấn|ton|kg|bao)/i.test(txt)) score += 2;
  if (/\b(tấn|kg|bao|tạ)\b/.test(txt)) score += 1;
  if (/\b(ngày|giao|giao hàng|hạn giao|tuần|tháng)\b/.test(txt)) score += 1;
  if (/\b(độ ẩm|lép|tạp chất|phạt|tỷ lệ|chất lượng)\b/.test(txt)) score += 1;

  const numbers = txt.match(/\d{1,3}(?:[.,]\d+)?/g);
  if (numbers && numbers.length >= 1) score += 1;

  return score;
}
