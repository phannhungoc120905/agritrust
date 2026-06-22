import { supabase } from '../client';

// Thêm hợp đồng mới (ở dạng dự thảo)
export async function createDraftContract(contractData: {
  vi_nguoi_ban: string;
  vi_nguoi_mua: string;
  san_pham: string;
  so_luong: number;
  don_vi_tinh: string;
  don_gia: number;
  han_giao_hang: string;
  noi_dung_nhap_ai: any;
  dieu_khoan_chat_luong: any;
}) {
  const { data, error } = await supabase
    .from('hop_dong')
    .insert([contractData])
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi tạo hợp đồng nháp:', JSON.stringify(error, null, 2), error);
    throw error;
  }
  return data;
}

// Cập nhật trạng thái hợp đồng (ví dụ: da_khoa_tien, da_xac_nhan, dang_tranh_chap...)
export async function updateContractStatus(contractId: string, status: string, additionalFields: Record<string, any> = {}) {
  const { data, error } = await supabase
    .from('hop_dong')
    .update({
      trang_thai: status,
      ...additionalFields
    })
    .eq('id', contractId)
    .select()
    .single();

  if (error) {
    console.error(`Lỗi khi cập nhật trạng thái hợp đồng thành ${status}:`, error);
    throw error;
  }
  return data;
}

// Lấy thông tin chi tiết hợp đồng
export async function getContractById(contractId: string) {
  const { data, error } = await supabase
    .from('hop_dong')
    .select('*')
    .eq('id', contractId)
    .single();

  if (error) {
    console.error('Lỗi khi lấy chi tiết hợp đồng:', error);
    throw error;
  }
  return data;
}

// Cập nhật nội dung hợp đồng nháp (sau khi đàm phán)
export async function updateContractDraftData(contractId: string, contractData: {
  san_pham: string;
  so_luong: number;
  don_vi_tinh: string;
  don_gia: number;
  han_giao_hang: string;
  dieu_khoan_chat_luong: any;
  noi_dung_nhap_ai?: any;
}) {
  const { data, error } = await supabase
    .from('hop_dong')
    .update(contractData)
    .eq('id', contractId)
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi cập nhật hợp đồng nháp:', error);
    throw error;
  }
  return data;
}

// Xóa hợp đồng nháp (dọn dẹp nếu 2 bên rời phòng không chốt)
export async function deleteContract(contractId: string) {
  const { error } = await supabase
    .from('hop_dong')
    .delete()
    .eq('id', contractId);

  if (error) {
    console.error('Lỗi khi xóa hợp đồng:', error);
    throw error;
  }
  return true;
}
