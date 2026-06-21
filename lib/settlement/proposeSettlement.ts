import { Contract } from '../../types/contract';

interface ProposalResult {
  ty_le_giai_ngan: number;        // từ 0 đến 1.0
  tien_giai_ngan_usdc: number;    // trả cho người bán
  tien_hoan_usdc: number;        // trả về cho người mua
  ly_do: string;
}

/**
 * Tính toán đề xuất chia tiền dựa trên điều khoản hợp đồng và số lượng giao nhận thực tế
 * @param contract Hợp đồng gốc đã khóa tiền
 * @param actualQty Số lượng thực tế nhận được (tính theo đơn vị đo lường của hợp đồng)
 * @param qualityIssues Các thông tin phạt về chất lượng (ví dụ: { ty_le_lep: 12 }) để đối chiếu
 * @returns Đề xuất chia tiền bao gồm tỉ lệ giải ngân và số tiền tương ứng
 */
export function proposeSettlement(
  contract: Contract,
  actualQty: number,
  qualityIssues: Record<string, number> = {}
): ProposalResult {
  const expectedQty = contract.so_luong;
  const unitPriceVnd = contract.don_gia;
  const exchangeRate = contract.ty_gia_vnd_usdc;
  
  // Tổng tiền hàng theo hợp đồng tính bằng VND
  const totalValueVnd = expectedQty * unitPriceVnd;
  // Quy đổi sang USDC đã khóa (hoặc dùng cột có sẵn)
  const totalLockedUsdc = contract.tong_tien_usdc_khoa || (totalValueVnd / exchangeRate);

  // 1. Tính toán tỉ lệ hao hụt số lượng
  let quantityRatio = actualQty / expectedQty;
  if (quantityRatio > 1.0) quantityRatio = 1.0;
  if (quantityRatio < 0) quantityRatio = 0;

  // Giá trị hàng dựa trên số lượng thực nhận trước khi phạt chất lượng
  let basePayoutUsdc = totalLockedUsdc * quantityRatio;
  
  // 2. Tính toán các khoản phạt chất lượng dựa vào dieu_khoan_chat_luong trong hợp đồng
  let totalPenaltyPercent = 0;
  const penaltyDetails: string[] = [];

  if (contract.dieu_khoan_chat_luong && Array.isArray(contract.dieu_khoan_chat_luong)) {
    for (const rule of contract.dieu_khoan_chat_luong) {
      const issueValue = qualityIssues[rule.tieu_chi];
      if (issueValue !== undefined && issueValue > rule.nguong_phan_tram) {
        // Ví dụ: tỉ lệ lép 12% > ngưỡng 10%
        // Tính phần trăm phạt
        // Trích xuất số % phạt nếu có từ chuỗi (ví dụ: "Trừ 5% giá trị" -> 5)
        const mucPhatText = rule.muc_phat || "";
        const matchPercent = mucPhatText.match(/(\d+(?:\.\d+)?)%/);
        let penaltyPercent = 0;
        
        if (matchPercent && matchPercent[1]) {
          penaltyPercent = parseFloat(matchPercent[1]);
          totalPenaltyPercent += penaltyPercent;
          penaltyDetails.push(
            `Vi phạm [${rule.tieu_chi}]: thực tế ${issueValue} vượt ngưỡng ${rule.nguong_phan_tram}, phạt ${penaltyPercent}%`
          );
        } else {
          penaltyDetails.push(
            `Vi phạm [${rule.tieu_chi}]: thực tế ${issueValue} vượt ngưỡng ${rule.nguong_phan_tram}, áp dụng phạt: ${mucPhatText}`
          );
        }
      }
    }
  }

  // Tiền phạt tính trên giá trị phần hàng thực nhận
  const penaltyAmountUsdc = basePayoutUsdc * (totalPenaltyPercent / 100);
  
  // Số tiền thực nhận cuối cùng của người bán
  let payoutUsdc = basePayoutUsdc - penaltyAmountUsdc;
  if (payoutUsdc < 0) payoutUsdc = 0;

  // Số tiền hoàn trả cho người mua
  const refundUsdc = totalLockedUsdc - payoutUsdc;

  // Tỉ lệ giải ngân cuối cùng trên tổng số tiền đã khóa
  const finalPayoutRatio = totalLockedUsdc > 0 ? (payoutUsdc / totalLockedUsdc) : 0;

  let ly_do = `Nhận hàng thực tế ${actualQty} ${contract.don_vi_tinh} (đạt ${Math.round(quantityRatio * 100)}% số lượng).`;
  if (penaltyDetails.length > 0) {
    ly_do += ` Áp dụng các khoản phạt chất lượng: ${penaltyDetails.join('; ')}. Tổng phạt ${totalPenaltyPercent}%.`;
  } else {
    ly_do += ` Không phát hiện vi phạm chất lượng nào.`;
  }

  return {
    ty_le_giai_ngan: Math.round(finalPayoutRatio * 10000) / 10000,
    tien_giai_ngan_usdc: Math.round(payoutUsdc * 100) / 100,
    tien_hoan_usdc: Math.round(refundUsdc * 100) / 100,
    ly_do
  };
}
