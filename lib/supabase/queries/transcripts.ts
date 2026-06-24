import { supabase } from '../client';

const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

// Lưu câu đàm phán mới từ Agora STT
export async function addTranscriptLine(lineData: {
  id_hop_dong?: string;
  vi_nguoi_noi: string;
  noi_dung: string;
  den_canh_bao?: 'binh_thuong' | 'canh_bao_do';
  gia_thi_truong_luc_so_sanh?: number;
}) {
  // Bỏ qua lưu Database nếu đây là phòng Demo (ID không phải UUID hợp lệ)
  if (lineData.id_hop_dong && !isValidUUID(lineData.id_hop_dong)) {
    return { ...lineData, id: Date.now() }; // Trả về fake data để UI không lỗi
  }

  const { data, error } = await supabase
    .from('ban_ghi_dam_phan')
    .insert([lineData])
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi ghi nhận transcript:', error);
    throw error;
  }
  return data;
}

// Lấy lịch sử đàm phán của một hợp đồng
export async function getTranscriptsByContractId(contractId: string) {
  if (!contractId || !isValidUUID(contractId)) return [];
  const { data, error } = await supabase
    .from('ban_ghi_dam_phan')
    .select('*')
    .eq('id_hop_dong', contractId)
    .order('thoi_gian_noi', { ascending: true });

  if (error) {
    console.error('Lỗi khi tải lịch sử đàm phán:', error);
    throw error;
  }
  return data;
}
