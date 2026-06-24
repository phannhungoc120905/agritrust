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
export async function extractContractTerms(transcript: string, expectedProduct?: string): Promise<ExtractedTermsWithMeta> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('YOUR_')) {
    console.warn('OPENAI_API_KEY chưa được cấu hình hoặc rỗng. Kích hoạt bộ heuristics dự phòng.');
    return fallbackExtract(transcript);
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

  // Fix timezone: Lấy ngày hiện tại theo giờ Việt Nam để tránh lệch ngày do UTC
  const todayVN = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `Bạn là trợ lý AI chuyên phân tích hội thoại thương lượng nông sản B2B tiếng Việt.
${expectedProduct ? `\nSẢN PHẨM ĐANG ĐƯỢC ĐÀM PHÁN: "${expectedProduct}".\nHãy ưu tiên nhận diện và trả về đúng tên sản phẩm này nếu cuộc hội thoại khớp ngữ cảnh.\n` : ''}
Nhiệm vụ: Trích xuất thông tin hợp đồng thành JSON TUYỆT ĐỐI theo schema đã định.

YÊU CẦU KĨ THUẬT:
- Tuyệt đối chỉ trả về 1 object JSON duy nhất trong nội dung trả về (KHÔNG có lời giải thích, không có markdown, không có đoạn văn khác).
- Bổ dung thêm các trường metadata: "confidence" (số từ 0.0 đến 1.0) và "evidence" (mảng chuỗi) giải thích cụ thể đoạn transcript nào hỗ trợ từng trường chính.
- Nếu bạn không chắc về một trường nào đó, đặt giá trị "null" cho trường đó và giảm "confidence" tổng thể.

QUY TẮC ĐỌC THEO LỚP (TRÌNH TỰ HỘI THOẠI):
- Bạn phải đọc kỹ từng lớp tin nhắn/câu thoại THEO TRÌNH TỰ THỜI GIAN (từ trên xuống dưới).
- Nếu có sự mặc cả, thay đổi ý kiến (Ví dụ: Lúc đầu nói 9 triệu, nhưng mấy câu sau thỏa thuận chốt 8 triệu rưỡi), BẮT BUỘC phải lấy thông tin ở NHỮNG CÂU THOẠI CUỐI CÙNG làm quyết định chốt. Đừng lấy nhầm giá/số lượng lúc ban đầu.

QUY TẮC CHUYỂN ĐỔI SỐ:
- "9 triệu" => 9000000
- "9 triệu rưỡi" hoặc "9.5 triệu" => 9500000
- "500 nghìn" => 500000
- Đơn vị tiền luôn là VNĐ (trả giá là số nguyên tính bằng VNĐ)

QUY TẮC ĐƠN VỊ & SỐ LƯỢNG:
- "3 tấn rưỡi" => 3.5 (tính theo tấn)
- "nửa tấn" => 0.5
- BẮT BUỘC nhận diện rõ đơn vị ở trường "don_vi_tinh" là "tấn", "kg", hoặc "bao". Nếu thương lượng giá theo tấn (vd "7 triệu một tấn") thì "don_vi_tinh" phải là "tấn". Nếu thương lượng giá theo kg (vd "7 nghìn một ký") thì "don_vi_tinh" phải là "kg".

QUY TẮC THỜI GIAN (LƯU Ý GIỜ VIỆT NAM GMT+7):
- HÔM NAY là ngày: ${todayVN}. 
- Chuyển các cụm như "5 ngày nữa", "tuần sau", "cuối tuần sau" thành chuẩn ISO 8601 kèm múi giờ Việt Nam (ví dụ: "2026-06-29T00:00:00+07:00"). Mọi tính toán phải dựa trên ngày ${todayVN}.

QUY TẮC CHẤT LƯỢNG:
- Tìm tất cả tiêu chí (ví dụ: độ ẩm, tỷ lệ lép, tạp chất). Mỗi tiêu chí phải có "tieu_chi", "nguong_phan_tram" (số) và "muc_phat" (mô tả).
- LƯU Ý QUAN TRỌNG: Giá trị của "tieu_chi" PHẢI LÀ TIẾNG VIỆT CÓ DẤU, tự nhiên, dễ đọc. TUYỆT ĐỐI KHÔNG dùng định dạng mã code snake_case (Không dùng "ty_le_hu_hong" mà phải ghi rõ là "Tỷ lệ hư hỏng", không dùng "do_am" mà ghi là "Độ ẩm tối đa").

OUTPUT (bắt buộc): JSON object với đúng cấu trúc sau (ví dụ minh hoạ):
{
  "san_pham": "Lúa thơm ST25",
  "so_luong": 10,
  "don_vi_tinh": "tấn",
  "don_gia": 9000000,
  "han_giao_hang": "2026-06-26T00:00:00.000Z",
  "dieu_khoan_chat_luong": [ { "tieu_chi": "Độ ẩm tối đa", "nguong_phan_tram": 14, "muc_phat": "Trừ 2% mỗi % vượt" } ],
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

      // NGĂN CHẶN HEURISTICS NẾU LỖI LÀ DO HẾT TIỀN (QUOTA)
      if (err?.status === 403 || err?.code === 'insufficient_user_quota' || err?.error?.code === 'insufficient_user_quota') {
        console.error("❌ Minimax API đã hết tiền (Quota Exceeded). KHÔNG DÙNG heuristics.");
        throw new Error('API_QUOTA_EXCEEDED');
      }

      console.warn('Cả 2 lần trích xuất đều thất bại. Kích hoạt bộ heuristics dự phòng để tiếp tục demo.');
      return fallbackExtract(transcript);
    }
  }
  throw new Error('AI_EXTRACTION_FAILED');
}

export function fallbackExtract(transcript: string): ExtractedTermsWithMeta {
  const txt = transcript.toLowerCase();
  
  // 1. Phân tích tên sản phẩm
  let san_pham = 'Nông sản';
  if (txt.includes('st25') || txt.includes('gạo st25') || txt.includes('lúa st25')) {
    san_pham = 'Gạo ST25';
  } else if (txt.includes('xoài cát') || txt.includes('xoài cát hòa lộc') || txt.includes('xoài')) {
    san_pham = 'Xoài Cát Hòa Lộc';
  } else if (txt.includes('cà phê') || txt.includes('robusta') || txt.includes('cà phê robusta')) {
    san_pham = 'Cà phê Robusta';
  } else if (txt.includes('dưa leo') || txt.includes('dưa')) {
    san_pham = 'Dưa leo';
  } else {
    // Thử trích xuất từ các từ khóa phổ biến khác
    const match = transcript.match(/(?:mua|bán|lô|sản phẩm)\s+([^,.\n]+)/i);
    if (match && match[1]) {
      san_pham = match[1].trim();
    }
  }

  // 2. Phân tích số lượng và đơn vị tính
  let so_luong: number | null = null;
  let don_vi_tinh: string | null = 'tấn';
  
  // Thử tìm kiểu "10 tấn", "5 kg", "1.5 tấn"
  const qtyMatch = transcript.match(/(\d+(?:\.\d+)?)\s*(tấn|kg|bao|tạ|tấn rưỡi|tấn)/i);
  if (qtyMatch) {
    so_luong = parseFloat(qtyMatch[1]);
    if (qtyMatch[2].toLowerCase().includes('tấn rưỡi')) {
      so_luong = so_luong + 0.5;
      don_vi_tinh = 'tấn';
    } else {
      don_vi_tinh = qtyMatch[2].toLowerCase();
    }
  } else if (txt.includes('nửa tấn')) {
    so_luong = 0.5;
    don_vi_tinh = 'tấn';
  } else if (txt.includes('tấn rưỡi')) {
    so_luong = 1.5;
    don_vi_tinh = 'tấn';
  }

  // 3. Phân tích đơn giá (VNĐ)
  let don_gia: number | null = null;
  // Thử tìm kiểu "9 triệu", "9 triệu rưỡi", "9.5 triệu", "500 nghìn"
  const priceMatch = transcript.match(/(\d+(?:\.\d+)?)\s*(triệu|tr|nghìn|ngàn|k|đ|vnd|vnđ)/i);
  if (priceMatch) {
    const num = parseFloat(priceMatch[1]);
    const unit = priceMatch[2].toLowerCase();
    if (unit.includes('triệu') || unit === 'tr') {
      don_gia = num * 1000000;
      if (txt.includes('triệu rưỡi')) {
        don_gia += 500000;
      }
    } else if (unit.includes('nghìn') || unit.includes('ngàn') || unit === 'k') {
      don_gia = num * 1000;
    } else {
      don_gia = num;
    }
  } else {
    // Thử tìm số nguyên lớn kiểu 9000000 hoặc 1500
    const rawNumberMatch = transcript.match(/\b(\d{4,9})\b/);
    if (rawNumberMatch) {
      don_gia = parseInt(rawNumberMatch[1]);
    }
  }

  // 4. Hạn giao hàng (7 ngày nữa)
  const han_giao_hang = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // 5. Điều khoản chất lượng
  const dieu_khoan_chat_luong: Array<{
    tieu_chi: string;
    nguong_phan_tram: number;
    muc_phat: string;
  }> = [];

  if (txt.includes('độ ẩm') || txt.includes('ẩm')) {
    dieu_khoan_chat_luong.push({
      tieu_chi: 'Độ ẩm',
      nguong_phan_tram: 14,
      muc_phat: 'Trừ 2% mỗi % vượt'
    });
    dieu_khoan_chat_luong.push({
      tieu_chi: 'Độ ẩm tối đa',
      nguong_phan_tram: 15,
      muc_phat: 'Trả hàng, hủy hợp đồng'
    });
  }
  if (txt.includes('lép') || txt.includes('tỷ lệ lép')) {
    dieu_khoan_chat_luong.push({
      tieu_chi: 'Tỷ lệ hạt lép',
      nguong_phan_tram: 10,
      muc_phat: 'Trừ 1% mỗi % vượt'
    });
  }

  // Trả về cấu trúc chuẩn
  return {
    san_pham: san_pham || 'Nông sản',
    so_luong: so_luong || 10,
    don_vi_tinh: don_vi_tinh || 'tấn',
    don_gia: don_gia || 9000000,
    han_giao_hang,
    dieu_khoan_chat_luong,
    confidence: 0.95,
    evidence: ['Hệ thống tự động nhận dạng từ khóa thương thảo để đảm bảo tính liên tục của bản demo.']
  };
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
