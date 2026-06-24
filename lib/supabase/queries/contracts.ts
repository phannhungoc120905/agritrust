import { supabase } from '../client';

// Helper check UUID hợp lệ
const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

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
  if (!contractId || !isValidUUID(contractId)) return null;
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
  if (!contractId || !isValidUUID(contractId)) return null;
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
  if (!contractId || !isValidUUID(contractId)) return null;
  // Fix lỗi Date invalid: Nếu rỗng thì truyền null
  const payloadToUpdate: any = { ...contractData };
  if (!payloadToUpdate.han_giao_hang || payloadToUpdate.han_giao_hang === '') {
    // Để tránh lỗi NOT NULL, set default 7 ngày nếu null
    payloadToUpdate.han_giao_hang = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  
  if (payloadToUpdate.so_luong == null) {
    payloadToUpdate.so_luong = 0;
  }
  
  if (payloadToUpdate.don_gia == null) {
    payloadToUpdate.don_gia = 0;
  }
  
  if (!payloadToUpdate.san_pham || payloadToUpdate.san_pham.trim() === '') {
    payloadToUpdate.san_pham = 'Nông sản';
  }

  const { data, error } = await supabase
    .from('hop_dong')
    .update(payloadToUpdate)
    .eq('id', contractId)
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi cập nhật hợp đồng nháp:', JSON.stringify(error), error.message);
    throw error;
  }
  return data;
}

// Xóa hợp đồng nháp (dọn dẹp nếu 2 bên rời phòng không chốt)
export async function deleteContract(contractId: string) {
  if (!contractId || !isValidUUID(contractId)) return false;
  const { error } = await supabase
    .from('hop_dong')
    .delete()
    .eq('id', contractId);

  if (error) {
    // Dùng console.warn thay vì console.error để tránh Next.js hiển thị màn hình đỏ trong Dev mode
    console.warn('Lỗi khi xóa hợp đồng rác (có thể bỏ qua):', error.message);
    return false;
  }
  return true;
}
