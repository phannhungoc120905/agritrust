import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { proposeSettlement } from '../../../lib/settlement/proposeSettlement';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.NEXT_PUBLIC_AI_BASE_URL || 'https://api.tokenrouter.com/v1',
});

const AI_MODEL = process.env.AI_MODEL || 'MiniMax-M3';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contract, actualQty, qualityNote, imageUrls } = body;

    const expectedQty = contract.so_luong;
    const unitPriceVnd = contract.don_gia;
    const exchangeRate = contract.ty_gia_vnd_usdc;
    const totalValueVnd = expectedQty * unitPriceVnd;
    const totalLockedUsdc = contract.tong_tien_usdc_khoa || (totalValueVnd / exchangeRate);

    // Nếu không có API KEY, tự động fallback sang thuật toán phân xử toán học
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('YOUR_')) {
      const qualityIssues: Record<string, number> = {};
      const noteLower = qualityNote.toLowerCase();
      if (contract.dieu_khoan_chat_luong) {
        contract.dieu_khoan_chat_luong.forEach((rule: any) => {
          const keyword = rule.tieu_chi.toLowerCase().replace('tỉ lệ ', '').replace('độ ', '');
          if (noteLower.includes(keyword)) {
            const match = noteLower.match(/(\d+(?:\.\d+)?)%/);
            if (match && match[1]) {
              qualityIssues[rule.tieu_chi] = parseFloat(match[1]);
            }
          }
        });
      }
      const localProposal = proposeSettlement(contract, actualQty, qualityIssues);
      return Response.json({
        success: true,
        result: {
          ty_le_giai_ngan: localProposal.ty_le_giai_ngan,
          tien_giai_ngan_usdc: localProposal.tien_giai_ngan_usdc,
          tien_hoan_usdc: localProposal.tien_hoan_usdc,
          ly_do: `[Trọng tài toán học - Fallback] ` + localProposal.ly_do
        }
      });
    }

    const promptText = `
Bạn là một Trọng tài nông nghiệp kỹ thuật số (AI Dispute Arbitrator) hoạt động trên blockchain cho AgriTrust.
Nhiệm vụ của bạn là phân tích báo cáo nghiệm thu thực tế, đối chiếu với các Điều khoản chất lượng đã khóa trong Hợp đồng gốc để đưa ra tỷ lệ phân chia tiền ký quỹ (Escrow USDC) công bằng cho hai bên.

### THÔNG TIN HỢP ĐỒNG GỐC:
- Sản phẩm nông sản: ${contract.san_pham}
- Sản lượng cam kết: ${expectedQty} ${contract.don_vi_tinh}
- Đơn giá chốt: ${unitPriceVnd.toLocaleString('vi-VN')} đ / ${contract.don_vi_tinh}
- Tổng tiền cọc đang khóa trong Solana Escrow PDA: ${totalLockedUsdc} USDC
- Tỷ giá quy đổi: 1 USDC = ${exchangeRate} VND
- Các điều khoản chất lượng đã chốt:
${JSON.stringify(contract.dieu_khoan_chat_luong, null, 2)}

### THỰC TẾ GIAO NHẬN & NGHIỆM THU:
- Số lượng thực nhận tại kho: ${actualQty} ${contract.don_vi_tinh}
- Báo cáo lỗi chất lượng của Thương lái: "${qualityNote}"

### HƯỚNG DẪN TÍNH TOÁN PHÂN CHIA (Bắt buộc tuân thủ):
1. Hao hụt số lượng: 
   - Tỷ lệ nhận hàng = actualQty / expectedQty (giới hạn tối đa 1.0, tối thiểu 0).
   - Giá trị hàng cơ bản = Tổng tiền cọc đang khóa * Tỷ lệ nhận hàng.
   - Phần chênh lệch thiếu hụt (nếu giao thiếu) phải được hoàn trả lại cho Người mua.
2. Vi phạm chất lượng:
   - Phân tích văn bản báo cáo lỗi chất lượng của Thương lái và các hình ảnh đính kèm (nếu có).
   - Trích xuất xem có chỉ số nào vi phạm các tiêu chí trong Hợp đồng gốc hay không (ví dụ: độ ẩm thực tế đo được vượt quá ngưỡng phần trăm quy định).
   - Nếu vi phạm, hãy lấy tỷ lệ % phạt quy định trong hợp đồng để tính tổng mức phạt chất lượng.
   - Tiền phạt chất lượng = Giá trị hàng cơ bản * (Tổng % phạt chất lượng / 100).
3. Tính số tiền chuyển cho Người bán (Nông dân):
   - Tiền giải ngân cho Người bán = Giá trị hàng cơ bản - Tiền phạt chất lượng.
   - Giới hạn tối thiểu là 0 USDC.
4. Tính số tiền hoàn trả cho Người mua (Thương lái):
   - Tiền hoàn trả cho Người mua = Tổng tiền cọc đang khóa - Tiền giải ngân cho Người bán.
5. Tỷ lệ giải ngân cuối cùng = Tiền giải ngân cho Người bán / Tổng tiền cọc đang khóa (số thực từ 0.0 đến 1.0, làm tròn 4 chữ số thập phân).

### ĐẦU RA YÊU CẦU:
Hãy phân tích và trả về một đối tượng JSON hợp lệ duy nhất có định dạng sau (không chứa markdown \`\`\`json):
{
  "ty_le_giai_ngan": số thực từ 0 đến 1.0 (ví dụ: 0.85),
  "tien_giai_ngan_usdc": số tiền chuyển cho Nông dân (number),
  "tien_hoan_usdc": số tiền hoàn trả cho Thương lái (number),
  "ly_do": "Giải trình chi tiết bằng tiếng Việt: Nêu rõ lượng giao nhận thực tế (đạt bao nhiêu %), lỗi chất lượng phát hiện (độ ẩm bao nhiêu, tạp chất bao nhiêu, đối chiếu với điều khoản nào và phạt bao nhiêu %), và công thức tính ra số tiền cuối cùng cho mỗi bên."
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: promptText }
        ],
        temperature: 0.1,
      });

      const resultText = response.choices[0]?.message?.content || '{}';
      const cleanJsonStr = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedResult = JSON.parse(cleanJsonStr);

      return Response.json({
        success: true,
        result: {
          ty_le_giai_ngan: typeof parsedResult.ty_le_giai_ngan === 'number' ? parsedResult.ty_le_giai_ngan : (totalLockedUsdc > 0 ? (parsedResult.tien_giai_ngan_usdc / totalLockedUsdc) : 0),
          tien_giai_ngan_usdc: Math.round((parsedResult.tien_giai_ngan_usdc || 0) * 100) / 100,
          tien_hoan_usdc: Math.round((parsedResult.tien_hoan_usdc || 0) * 100) / 100,
          ly_do: parsedResult.ly_do || `AI phân xử giải ngân ${(parsedResult.ty_le_giai_ngan * 100).toFixed(2)}% cho Nông dân.`
        }
      });
    } catch (aiErr) {
      console.warn("Lỗi khi gọi OpenAI/Groq API, tự động fallback sang toán học:", aiErr);
      const qualityIssues: Record<string, number> = {};
      const noteLower = qualityNote.toLowerCase();
      if (contract.dieu_khoan_chat_luong) {
        contract.dieu_khoan_chat_luong.forEach((rule: any) => {
          const keyword = rule.tieu_chi.toLowerCase().replace('tỉ lệ ', '').replace('độ ', '');
          if (noteLower.includes(keyword)) {
            const match = noteLower.match(/(\d+(?:\.\d+)?)%/);
            if (match && match[1]) {
              qualityIssues[rule.tieu_chi] = parseFloat(match[1]);
            }
          }
        });
      }
      const localProposal = proposeSettlement(contract, actualQty, qualityIssues);
      return Response.json({
        success: true,
        result: {
          ty_le_giai_ngan: localProposal.ty_le_giai_ngan,
          tien_giai_ngan_usdc: localProposal.tien_giai_ngan_usdc,
          tien_hoan_usdc: localProposal.tien_hoan_usdc,
          ly_do: `[Trọng tài toán học - Fallback do lỗi AI] ` + localProposal.ly_do
        }
      });
    }

  } catch (error: any) {
    console.error('Lỗi ở API resolve-dispute:', error);
    return Response.json(
      { error: error.message || 'Lỗi server.' },
      { status: 500 }
    );
  }
}
