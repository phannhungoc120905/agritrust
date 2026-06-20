import { supabase } from '../client';

// Tạo báo cáo tranh chấp mới (Kịch bản B)
export async function createDisputeReport(disputeData: {
  id_hop_dong: string;
  so_luong_thuc_nhan: number;
  ghi_chu_chat_luong?: string;
  danh_sach_url_anh?: string[];
  url_video?: string;
  ty_le_giai_ngan_ai_de_xuat?: number;
  so_tien_giai_ngan_de_xuat?: number;
  so_tien_hoan_lai_de_xuat?: number;
}) {
  const { data, error } = await supabase
    .from('bao_cao_tranh_chap')
    .insert([disputeData])
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi tạo báo cáo tranh chấp:', error);
    throw error;
  }
  return data;
}

// Cập nhật sự đồng thuận của nông dân hoặc thương lái
export async function updateAgreement(
  disputeId: string,
  party: 'nguoi_mua_dong_y' | 'nguoi_ban_dong_y',
  agree: boolean
) {
  const updateData: Record<string, boolean> = {};
  updateData[party] = agree;

  const { data, error } = await supabase
    .from('bao_cao_tranh_chap')
    .update(updateData)
    .eq('id', disputeId)
    .select()
    .single();

  if (error) {
    console.error(`Lỗi khi cập nhật đồng thuận cho ${party}:`, error);
    throw error;
  }
  return data;
}

// Lấy báo cáo tranh chấp của một hợp đồng
export async function getDisputeByContractId(contractId: string) {
  const { data, error } = await supabase
    .from('bao_cao_tranh_chap')
    .select('*')
    .eq('id_hop_dong', contractId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 là mã khi không tìm thấy dòng nào
    console.error('Lỗi khi lấy báo cáo tranh chấp:', error);
    throw error;
  }
  return data || null;
}
