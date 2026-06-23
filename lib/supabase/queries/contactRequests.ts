import { supabase } from '../client';
import { ContactRequest, ProfileStats } from '../../../types/profile';

// =====================================================================
// YÊU CẦU LIÊN HỆ — Supabase Queries
// =====================================================================

// Tạo yêu cầu liên hệ mới (Thương lái gửi cho Nông dân)
export async function createContactRequest(data: {
  vi_thuong_lai: string;
  vi_nong_dan: string;
  id_san_pham?: string;
  ten_san_pham_snapshot: string;
  so_luong_du_kien?: string;
  loi_nhan?: string;
  loai_lien_he: 'goi_ngay' | 'hen_lich';
  thoi_gian_hen?: string;
}) {
  const { data: result, error } = await supabase
    .from('yeu_cau_lien_he')
    .insert([data])
    .select()
    .single();

  if (error) {
    // Unique index violation = đã có yêu cầu active
    if (error.code === '23505') {
      throw new Error('Bạn đã gửi yêu cầu liên hệ cho nông dân này. Vui lòng chờ phản hồi.');
    }
    console.error('Lỗi khi tạo yêu cầu liên hệ:', error.message);
    throw error;
  }
  return result;
}

// Lấy danh sách yêu cầu gửi tới Nông dân (kèm profile Thương lái)
export async function getRequestsForFarmer(vi_nong_dan: string) {
  const { data, error } = await supabase
    .from('yeu_cau_lien_he')
    .select(`
      *,
      thuong_lai:nguoi_dung!yeu_cau_lien_he_vi_thuong_lai_fkey (
        dia_chi_vi, ten_hien_thi, ho_ten, vai_tro,
        ten_cong_ty, linh_vuc_thu_mua, khu_vuc_thu_mua,
        anh_dai_dien, trang_thai_xac_thuc, so_dien_thoai
      ),
      san_pham:san_pham_nong_dan!yeu_cau_lien_he_id_san_pham_fkey (
        id, ten_san_pham, mo_ta, so_luong_uoc_tinh, gia_tham_khao
      )
    `)
    .eq('vi_nong_dan', vi_nong_dan)
    .order('ngay_tao', { ascending: false });

  if (error) {
    console.error('Lỗi khi lấy yêu cầu cho nông dân:', error.message);
    return [];
  }
  return data || [];
}

// Lấy danh sách yêu cầu đã gửi bởi Thương lái (kèm profile Nông dân)
export async function getRequestsForTrader(vi_thuong_lai: string) {
  const { data, error } = await supabase
    .from('yeu_cau_lien_he')
    .select(`
      *,
      nong_dan:nguoi_dung!yeu_cau_lien_he_vi_nong_dan_fkey (
        dia_chi_vi, ten_hien_thi, ho_ten, vai_tro,
        ten_nong_trai, khu_vuc, san_pham_chinh, chung_nhan, kinh_nghiem,
        anh_dai_dien, trang_thai_xac_thuc, so_dien_thoai
      ),
      san_pham:san_pham_nong_dan!yeu_cau_lien_he_id_san_pham_fkey (
        id, ten_san_pham, mo_ta, so_luong_uoc_tinh, gia_tham_khao
      )
    `)
    .eq('vi_thuong_lai', vi_thuong_lai)
    .order('ngay_tao', { ascending: false });

  if (error) {
    console.error('Lỗi khi lấy yêu cầu cho thương lái:', error.message);
    return [];
  }
  return data || [];
}

// Nông dân mở xem yêu cầu → đánh dấu "đã xem"
export async function markRequestAsSeen(requestId: string) {
  const { data, error } = await supabase
    .from('yeu_cau_lien_he')
    .update({
      trang_thai: 'da_xem',
      ngay_xem: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('trang_thai', 'cho_phan_hoi') // Chỉ chuyển nếu đang ở trạng thái chờ
    .select()
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Lỗi khi đánh dấu đã xem:', error.message);
  }
  return data;
}

// Nông dân đồng ý yêu cầu → gen room_id
export async function acceptRequest(requestId: string) {
  const roomId = `room_${requestId.slice(0, 8)}_${Date.now().toString(36)}`;

  const { data, error } = await supabase
    .from('yeu_cau_lien_he')
    .update({
      trang_thai: 'da_dong_y',
      room_id: roomId,
      ngay_phan_hoi: new Date().toISOString(),
    })
    .eq('id', requestId)
    .in('trang_thai', ['cho_phan_hoi', 'da_xem'])
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi chấp nhận yêu cầu:', error.message);
    throw error;
  }
  return data;
}

// Nông dân từ chối yêu cầu
export async function rejectRequest(requestId: string, lyDo?: string) {
  const { data, error } = await supabase
    .from('yeu_cau_lien_he')
    .update({
      trang_thai: 'tu_choi',
      ly_do_tu_choi: lyDo || null,
      ngay_phan_hoi: new Date().toISOString(),
    })
    .eq('id', requestId)
    .in('trang_thai', ['cho_phan_hoi', 'da_xem'])
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi từ chối yêu cầu:', error.message);
    throw error;
  }
  return data;
}

// Nông dân chọn hẹn lịch
export async function scheduleRequest(requestId: string, thoiGianHen: string) {
  const { data, error } = await supabase
    .from('yeu_cau_lien_he')
    .update({
      trang_thai: 'da_hen_lich',
      thoi_gian_hen: thoiGianHen,
      ngay_phan_hoi: new Date().toISOString(),
    })
    .eq('id', requestId)
    .in('trang_thai', ['cho_phan_hoi', 'da_xem', 'da_dong_y'])
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi hẹn lịch:', error.message);
    throw error;
  }
  return data;
}

// Liên kết yêu cầu với hợp đồng (sau khi AI sinh draft contract)
export async function connectRequest(requestId: string, idHopDong: string) {
  const { data, error } = await supabase
    .from('yeu_cau_lien_he')
    .update({
      trang_thai: 'da_ket_noi',
      id_hop_dong: idHopDong,
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi liên kết hợp đồng:', error.message);
    throw error;
  }
  return data;
}

// Kiểm tra xem thương lái đã có yêu cầu active tới nông dân này chưa
export async function hasActiveRequest(viThuongLai: string, viNongDan: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('yeu_cau_lien_he')
    .select('*', { count: 'exact', head: true })
    .eq('vi_thuong_lai', viThuongLai)
    .eq('vi_nong_dan', viNongDan)
    .in('trang_thai', ['cho_phan_hoi', 'da_xem', 'da_dong_y', 'da_hen_lich']);

  if (error) {
    console.error('Lỗi khi kiểm tra yêu cầu active:', error.message);
    return false;
  }
  return (count || 0) > 0;
}

// Thống kê profile nông dân (cải tiến #6)
export async function getProfileStats(diaChiVi: string): Promise<ProfileStats> {
  // Đếm tổng yêu cầu nhận được
  const { count: tongYeuCau } = await supabase
    .from('yeu_cau_lien_he')
    .select('*', { count: 'exact', head: true })
    .eq('vi_nong_dan', diaChiVi);

  // Đếm đã đồng ý (bao gồm cả đã kết nối)
  const { count: daDongY } = await supabase
    .from('yeu_cau_lien_he')
    .select('*', { count: 'exact', head: true })
    .eq('vi_nong_dan', diaChiVi)
    .in('trang_thai', ['da_dong_y', 'da_hen_lich', 'da_ket_noi']);

  // Đếm đã kết nối (đã vào phòng đàm phán)
  const { count: daDamPhan } = await supabase
    .from('yeu_cau_lien_he')
    .select('*', { count: 'exact', head: true })
    .eq('vi_nong_dan', diaChiVi)
    .eq('trang_thai', 'da_ket_noi');

  // Đếm hợp đồng hoàn thành (da_xac_nhan hoặc da_giai_quyet)
  const { count: hopDongOK } = await supabase
    .from('hop_dong')
    .select('*', { count: 'exact', head: true })
    .eq('vi_nguoi_ban', diaChiVi)
    .in('trang_thai', ['da_xac_nhan', 'da_giai_quyet']);

  const total = tongYeuCau || 0;
  const agreed = daDongY || 0;

  return {
    tong_yeu_cau: total,
    da_dong_y: agreed,
    da_dam_phan: daDamPhan || 0,
    hop_dong_thanh_cong: hopDongOK || 0,
    ty_le_phan_hoi: total > 0 ? Math.round((agreed / total) * 100) : 0,
  };
}
