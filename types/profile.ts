// =====================================================================
// AGRITRUST — TypeScript Types: Profile, Sản phẩm, Yêu cầu liên hệ
// =====================================================================

// === PROFILE NGƯỜI DÙNG ===
export interface UserProfile {
  dia_chi_vi: string;
  vai_tro: 'nong_dan' | 'thuong_lai';
  ten_dang_nhap?: string;
  ten_hien_thi?: string;
  mat_khau?: string;
  ngay_tao?: string;

  // Thông tin cá nhân (cho hợp đồng PDF)
  ho_ten?: string;
  so_dien_thoai?: string;
  dia_chi?: string;
  ngay_sinh?: string;
  anh_dai_dien?: string;
  anh_bia?: string;
  mo_ta_ban_than?: string;

  // Xác thực hồ sơ
  trang_thai_xac_thuc: 'chua_xac_thuc' | 'da_xac_thuc_sdt' | 'da_xac_thuc_ho_so';

  // --- Nông dân ---
  ten_nong_trai?: string;     // Tên nông trại / HTX
  khu_vuc?: string;           // Vùng miền canh tác
  dien_tich?: string;         // Diện tích (ví dụ: "5 ha")
  san_pham_chinh?: string;    // Liệt kê nông sản chính
  chung_nhan?: string;        // VietGAP, GlobalGAP, Hữu cơ...
  kinh_nghiem?: string;       // Số năm kinh nghiệm

  // --- Thương lái ---
  ten_cong_ty?: string;       // Tên công ty
  linh_vuc_thu_mua?: string;  // Lĩnh vực thu mua
  khu_vuc_thu_mua?: string;   // Khu vực hoạt động
}

// === SẢN PHẨM NÔNG DÂN ===
export interface FarmerProduct {
  id: string;
  vi_nong_dan: string;
  ten_san_pham: string;
  mo_ta?: string;
  so_luong_uoc_tinh?: string;
  gia_tham_khao?: string;
  hinh_anh?: string[];
  mua_vu?: string;
  trang_thai: 'dang_ban' | 'tam_ngung' | 'het_hang';
  ngay_tao: string;
  // Joined data
  nguoi_dung?: {
    ten_hien_thi: string;
    khu_vuc?: string;
    chung_nhan?: string;
    anh_dai_dien?: string;
    trang_thai_xac_thuc?: string;
  };
}

// === YÊU CẦU LIÊN HỆ ===
export type ContactRequestStatus =
  | 'cho_phan_hoi'   // Thương lái vừa gửi, chờ nông dân
  | 'da_xem'         // Nông dân đã mở xem nhưng chưa quyết định
  | 'da_dong_y'      // Nông dân đồng ý liên hệ
  | 'tu_choi'        // Nông dân từ chối
  | 'da_hen_lich'    // Hai bên đã chọn thời gian hẹn
  | 'da_ket_noi'     // Đã vào phòng đàm phán / đã có hop_dong
  | 'het_han';       // Yêu cầu hết hạn (không phản hồi quá 7 ngày)

export interface ContactRequest {
  id: string;
  vi_thuong_lai: string;
  vi_nong_dan: string;

  // Sản phẩm (FK + snapshot)
  id_san_pham?: string;
  ten_san_pham_snapshot: string;

  // Form thương lái
  so_luong_du_kien?: string;
  loi_nhan?: string;
  loai_lien_he: 'goi_ngay' | 'hen_lich';
  thoi_gian_hen?: string;

  // Phòng đàm phán
  room_id?: string;

  // Trạng thái
  trang_thai: ContactRequestStatus;
  ly_do_tu_choi?: string;
  id_hop_dong?: string;

  // Timestamps
  ngay_tao: string;
  ngay_xem?: string;
  ngay_phan_hoi?: string;

  // Joined data (khi query kèm bảng nguoi_dung)
  thuong_lai?: UserProfile;
  nong_dan?: UserProfile;
  san_pham?: FarmerProduct;
}

// === THỐNG KÊ PROFILE ===
export interface ProfileStats {
  tong_yeu_cau: number;         // Tổng yêu cầu liên hệ nhận được
  da_dong_y: number;            // Số lần đồng ý
  da_dam_phan: number;          // Số phòng đàm phán đã vào
  hop_dong_thanh_cong: number;  // Số hợp đồng hoàn thành (da_xac_nhan + da_giai_quyet)
  ty_le_phan_hoi: number;       // % phản hồi
}
