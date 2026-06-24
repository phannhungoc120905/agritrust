import { Contract } from '../../types/contract';
import { proposeSettlement } from './proposeSettlement';

export interface GeminiProposalResult {
  ty_le_giai_ngan: number;        // từ 0 đến 1.0 (ví dụ: 0.85)
  tien_giai_ngan_usdc: number;    // trả cho người bán
  tien_hoan_usdc: number;        // trả về cho người mua
  ly_do: string;
}

/**
 * Chuyển đổi ảnh URL sang Base64 để gửi lên Gemini (nếu chạy trên Client/Server hỗ trợ)
 */
async function imageUrlToBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const split = base64data.split(',');
        const mimeType = split[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const data = split[1];
        resolve({ mimeType, data });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Không thể chuyển ảnh sang base64 (có thể do lỗi CORS):", e);
    return null;
  }
}

/**
 * Gọi API Gemini để phân xử tranh chấp (nằm trong phạm vi sở hữu của Người 4)
 * @param contract Hợp đồng gốc
 * @param actualQty Số lượng thực nhận
 * @param qualityNote Mô tả lỗi chất lượng từ thương lái
 * @param imageUrls Danh sách URL ảnh bằng chứng
 * @returns Đề xuất phân xử chứa tỷ lệ giải ngân và lý do giải trình của AI
 */
export async function resolveDisputeWithGemini(
  contract: Contract,
  actualQty: number,
  qualityNote: string,
  imageUrls: string[] = []
): Promise<GeminiProposalResult> {
  const expectedQty = contract.so_luong;
  const unitPriceVnd = contract.don_gia;
  const exchangeRate = contract.ty_gia_vnd_usdc;
  const totalValueVnd = expectedQty * unitPriceVnd;
  const totalLockedUsdc = contract.tong_tien_usdc_khoa || (totalValueVnd / exchangeRate);

  try {
    const response = await fetch('/api/resolve-dispute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contract,
        actualQty,
        qualityNote,
        imageUrls,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const resData = await response.json();
    if (!resData.success) {
      throw new Error(resData.error || 'Server-side AI dispute resolution failed.');
    }

    const parsedResult = resData.result;
    return {
      ty_le_giai_ngan: parsedResult.ty_le_giai_ngan,
      tien_giai_ngan_usdc: parsedResult.tien_giai_ngan_usdc,
      tien_hoan_usdc: parsedResult.tien_hoan_usdc,
      ly_do: parsedResult.ly_do
    };

  } catch (error) {
    console.error("Lỗi khi gọi API phân xử tranh chấp, tự động fallback sang thuật toán toán học:", error);
    
    const qualityIssues: Record<string, number> = {};
    const noteLower = qualityNote.toLowerCase();
    if (contract.dieu_khoan_chat_luong) {
      contract.dieu_khoan_chat_luong.forEach(rule => {
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
    return {
      ty_le_giai_ngan: localProposal.ty_le_giai_ngan,
      tien_giai_ngan_usdc: localProposal.tien_giai_ngan_usdc,
      tien_hoan_usdc: localProposal.tien_hoan_usdc,
      ly_do: `[Trọng tài toán học - Fallback do lỗi kết nối] ` + localProposal.ly_do
    };
  }
}
