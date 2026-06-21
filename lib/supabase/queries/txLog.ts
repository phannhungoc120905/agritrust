import { supabase } from '../client';

// Thêm một nhật ký giao dịch blockchain mới ở trạng thái 'dang_xu_ly'
export async function createTransactionLog(logData: {
  id_hop_dong: string;
  ten_ham: 'initialize' | 'confirm_receipt' | 'resolve_partial' | 'claim_timeout';
  nguoi_goi?: string;
}) {
  const { data, error } = await supabase
    .from('nhat_ky_giao_dich')
    .insert([
      {
        ...logData,
        trang_thai: 'dang_xu_ly'
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi khởi tạo nhật ký giao dịch:', error);
    throw error;
  }
  return data;
}

// Cập nhật kết quả của giao dịch blockchain (thanh_cong / that_bai)
export async function updateTransactionLog(
  logId: string,
  updateData: {
    chu_ky_giao_dich?: string;
    trang_thai: 'thanh_cong' | 'that_bai';
    thoi_gian_xac_nhan?: string;
  }
) {
  const { data, error } = await supabase
    .from('nhat_ky_giao_dich')
    .update(updateData)
    .eq('id', logId)
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi cập nhật nhật ký giao dịch:', error);
    throw error;
  }
  return data;
}
