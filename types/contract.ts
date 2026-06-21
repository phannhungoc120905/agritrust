export interface QualityRule {
  tieu_chi: string;            // Ví dụ: 'ty_le_lep', 'do_am'
  nguong_phan_tram: number;     // Ví dụ: 10
  muc_phat: string;             // Ví dụ: 'Phạt 5%', 'Từ chối nhận hàng'
}

export type ContractStatus = 
  | 'du_thao'          // Draft: Mới khởi tạo bằng AI, chưa ký
  | 'da_khoa_tien'     // Locked: Tiền đã khóa on-chain
  | 'da_xac_nhan'      // Confirmed: Nhận hàng đủ, giải ngân 100%
  | 'dang_tranh_chap'  // Disputed: Thương lái khiếu nại chất lượng
  | 'da_giai_quyet'    // Resolved: Đã chia tiền theo thỏa thuận tranh chấp
  | 'qua_han';         // TimedOut: Quá hạn giao nhận, nông dân tự rút tiền

export interface Contract {
  id: string;
  vi_nguoi_ban: string;
  vi_nguoi_mua: string;
  san_pham: string;
  so_luong: number;
  don_vi_tinh: string;
  don_gia: number;
  han_giao_hang: string;
  noi_dung_nhap_ai?: {
    san_pham?: string;
    so_luong?: number;
    don_gia?: number;
    han_giao_hang?: string;
    [key: string]: any;
  };
  dieu_khoan_chat_luong?: QualityRule[];
  ty_gia_vnd_usdc: number;
  tong_tien_usdc_khoa?: number;
  dia_chi_vi_escrow?: string;
  trang_thai: ContractStatus;
  ngay_tao: string;
  ngay_xac_nhan?: string;
}
