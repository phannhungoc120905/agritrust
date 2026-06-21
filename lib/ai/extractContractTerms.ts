import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface ExtractedTerms {
  san_pham: string;
  so_luong: number;
  don_vi_tinh: string;
  don_gia: number;
  han_giao_hang: string;
  dieu_khoan_chat_luong: Array<{
    tieu_chi: string;
    nguong_phan_tram: number;
    muc_phat: string;
  }>;
}

/**
 * Trích xuất điều khoản hợp đồng từ hội thoại đàm phán bằng GPT-4o
 * @param transcript Toàn bộ cuộc hội thoại ghi nhận được
 * @returns JSON chứa các điều khoản hợp đồng
 */
export async function extractContractTerms(transcript: string): Promise<ExtractedTerms> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("Chưa cấu hình OPENAI_API_KEY. Trả về kết quả mock.");
    return getMockTerms();
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Bạn là trợ lý AI chuyên nghiệp phân tích cuộc hội thoại thương lượng nông sản B2B. 
Hãy trích xuất thông tin hợp đồng thành cấu trúc JSON hợp lệ sau:
{
  "san_pham": "tên sản phẩm",
  "so_luong": số lượng (number),
  "don_vi_tinh": "kg/tấn/tạ...",
  "don_gia": đơn giá VNĐ trên một đơn vị (number),
  "han_giao_hang": "định dạng ISO 8601",
  "dieu_khoan_chat_luong": [
    {
      "tieu_chi": "tên tiêu chí phạt (ví dụ: ty_le_lep)",
      "nguong_phan_tram": ngưỡng phần trăm bắt đầu phạt (number),
      "muc_phat": mức phạt hoặc hình thức xử lý nếu vượt ngưỡng (string, ví dụ: 'Trừ 5% giá trị', 'Từ chối nhận hàng', 'Hủy hợp đồng')
    }
  ]
}`
        },
        {
          role: 'user',
          content: `Dưới đây là hội thoại đàm phán:\n\n${transcript}`
        }
      ]
    });

    const resultText = response.choices[0]?.message?.content || '{}';
    return JSON.parse(resultText) as ExtractedTerms;
  } catch (error) {
    console.error('Lỗi khi gọi GPT-4o trích xuất điều khoản:', error);
    return getMockTerms();
  }
}

function getMockTerms(): ExtractedTerms {
  return {
    san_pham: 'Lúa thơm ST25',
    so_luong: 10,
    don_vi_tinh: 'tấn',
    don_gia: 9000000, // 9,000,000 VND / tấn
    han_giao_hang: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 ngày nữa
    dieu_khoan_chat_luong: [
      {
        tieu_chi: 'ty_le_lep',
        nguong_phan_tram: 10,
        muc_phat: "Trừ 5% tổng giá trị thanh toán"
      },
      {
        tieu_chi: 'do_am',
        nguong_phan_tram: 14,
        muc_phat: "Từ chối nhận hàng"
      }
    ]
  };
}
