export type DisputeStatus = 
  | 'moi_gui'        // submitted: Vừa tạo báo cáo
  | 'dang_xem_xet'   // under_review: Nông dân đang xem xét
  | 'da_dong_y'      // agreed: 2 bên đồng ý phương án giải ngân đề xuất
  | 'da_giai_ngan';  // settled: Đã gọi hàm resolve_partial on-chain thành công

export interface DisputeReport {
  id: string;
  id_hop_dong: string;
  so_luong_thuc_nhan: number;
  ghi_chu_chat_luong?: string;
  danh_sach_url_anh: string[];
  url_video?: string;
  nguoi_ban_da_duyet: boolean;
  
  // AI tính toán dựa trên điều khoản chất lượng đã khóa
  ty_le_giai_ngan_ai_de_xuat?: number;
  so_tien_giai_ngan_de_xuat?: number;
  so_tien_hoan_lai_de_xuat?: number;
  
  nguoi_mua_dong_y: boolean;
  nguoi_ban_dong_y: boolean;
  ma_hash_bang_chung?: string;
  trang_thai: DisputeStatus;
  ngay_tao: string;
  ngay_giai_quyet?: string;
}
