import { supabase } from '../client';
import { UserProfile } from '../../../types/profile';

// Đăng nhập bằng tên đăng nhập và mật khẩu
export async function loginUser(ten_dang_nhap: string, mat_khau: string) {
  const { data, error } = await supabase
    .from('nguoi_dung')
    .select('*')
    .eq('ten_dang_nhap', ten_dang_nhap.trim())
    .eq('mat_khau', mat_khau)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Lỗi khi đăng nhập:', error.message);
    return null;
  }
  return data;
}

// Đăng ký tài khoản người dùng mới
export async function registerUser(userData: {
  dia_chi_vi: string;
  vai_tro: 'nong_dan' | 'thuong_lai';
  ten_dang_nhap: string;
  mat_khau: string;
  ten_hien_thi: string;
  ho_ten?: string;
  so_dien_thoai?: string;
  dia_chi?: string;
}) {
  const { data, error } = await supabase
    .from('nguoi_dung')
    .insert([userData])
    .select()
    .single();

  if (error) {
    console.error('Lỗi đăng ký:', error.message);
    throw error;
  }
  return data;
}

// Cập nhật thông tin profile người dùng
export async function updateUserProfile(dia_chi_vi: string, profileData: Partial<UserProfile>) {
  // Loại bỏ các trường không được phép update trực tiếp nếu có
  const { vai_tro, ten_dang_nhap, dia_chi_vi: _remove, ...safeData } = profileData as any;

  const { data, error } = await supabase
    .from('nguoi_dung')
    .update(safeData)
    .eq('dia_chi_vi', dia_chi_vi)
    .select()
    .single();

  if (error) {
    console.error('Lỗi cập nhật profile:', error.message);
    throw error;
  }
  return data;
}

// Lấy thông tin profile đầy đủ của một người dùng
export async function getUserProfile(dia_chi_vi: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('nguoi_dung')
    .select('*')
    .eq('dia_chi_vi', dia_chi_vi)
    .single();

  if (error) {
    console.error('Lỗi khi lấy profile:', error.message);
    return null;
  }
  return data;
}

// Lấy danh sách tất cả profile nông dân (cho Thương lái duyệt)
export async function getAllFarmerProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('nguoi_dung')
    .select('*')
    .eq('vai_tro', 'nong_dan')
    .order('ngay_tao', { ascending: false });

  if (error) {
    console.error('Lỗi khi lấy danh sách nông dân:', error.message);
    return [];
  }
  return data || [];
}

// Cập nhật địa chỉ ví của người dùng
export async function updateWalletAddress(ten_dang_nhap: string, dia_chi_vi: string) {
  const { data, error } = await supabase
    .from('nguoi_dung')
    .update({ dia_chi_vi })
    .eq('ten_dang_nhap', ten_dang_nhap)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      console.warn('Lỗi cập nhật ví: Trùng lặp địa chỉ ví (đã liên kết với tài khoản khác).');
    } else {
      console.error('Lỗi cập nhật ví:', error.message);
    }
    throw error;
  }
  return data;
}

// Script tự động chèn tài khoản demo khi khởi chạy dự án
export async function seedDemoUsers() {
  const demoUsers = [
    {
      dia_chi_vi: 'nong_dan_wallet_address_demo',
      vai_tro: 'nong_dan' as const,
      ten_dang_nhap: 'nongdan',
      mat_khau: '123',
      ten_hien_thi: 'Nông dân Nguyễn Văn Ruộng',
      ho_ten: 'Nguyễn Văn Ruộng',
      so_dien_thoai: '0987654321',
      dia_chi: 'Ấp 1, Xã Tân Tập, Huyện Cần Giuộc, Long An',
      trang_thai_xac_thuc: 'da_xac_thuc_ho_so',
      ten_nong_trai: 'Vườn ông Ruộng',
      khu_vuc: 'Long An',
      dien_tich: '5 ha',
      san_pham_chinh: 'Lúa ST25, Lúa Đài Thơm 8',
      chung_nhan: 'VietGAP',
      kinh_nghiem: '15 năm',
      anh_dai_dien: 'https://api.dicebear.com/7.x/micah/svg?seed=nongdan',
      anh_bia: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1200&auto=format&fit=crop'
    },
    {
      dia_chi_vi: 'thuong_lai_wallet_address_demo',
      vai_tro: 'thuong_lai' as const,
      ten_dang_nhap: 'thuonglai',
      mat_khau: '123',
      ten_hien_thi: 'Thương lái Trần Thị Thương',
      ho_ten: 'Trần Thị Thương',
      so_dien_thoai: '0901234567',
      dia_chi: 'Quận 1, TP. Hồ Chí Minh',
      trang_thai_xac_thuc: 'da_xac_thuc_sdt',
      ten_cong_ty: 'Công ty TNHH Nông Sản Việt',
      linh_vuc_thu_mua: 'Lúa gạo, Trái cây xuất khẩu',
      khu_vuc_thu_mua: 'ĐBSCL, Đông Nam Bộ',
      anh_dai_dien: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop',
      anh_bia: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop'
    },
    {
      dia_chi_vi: 'nong_dan_wallet_address_vamco',
      vai_tro: 'nong_dan' as const,
      ten_dang_nhap: 'vamco',
      mat_khau: '123',
      ten_hien_thi: 'HTX Nông Nghiệp Vàm Cỏ',
      ho_ten: 'Nguyễn Minh Hùng (Chủ nhiệm)',
      so_dien_thoai: '0912345678',
      dia_chi: 'Xã Vĩnh Hưng, Long An',
      trang_thai_xac_thuc: 'da_xac_thuc_ho_so',
      ten_nong_trai: 'HTX Nông Nghiệp Vàm Cỏ',
      khu_vuc: 'Long An',
      dien_tich: '50 ha',
      san_pham_chinh: 'Lúa chất lượng cao',
      chung_nhan: 'GlobalGAP',
      kinh_nghiem: 'HTX thành lập 10 năm',
      anh_dai_dien: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=300&auto=format&fit=crop',
      anh_bia: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop'
    },
    {
      dia_chi_vi: 'nong_dan_wallet_address_ythang',
      vai_tro: 'nong_dan' as const,
      ten_dang_nhap: 'ythang',
      mat_khau: '123',
      ten_hien_thi: 'Nông dân Y Thắng',
      ho_ten: 'Y Thắng Êban',
      so_dien_thoai: '0933445566',
      dia_chi: "Xã Cư Suê, Cư M'gar, Đắk Lắk",
      trang_thai_xac_thuc: 'da_xac_thuc_ho_so',
      khu_vuc: 'Đắk Lắk',
      dien_tich: '3 ha',
      san_pham_chinh: 'Cà phê Robusta, Tiêu',
      kinh_nghiem: '20 năm canh tác',
      anh_dai_dien: 'https://api.dicebear.com/7.x/micah/svg?seed=ythang',
      anh_bia: 'https://images.unsplash.com/photo-1524350876685-274059332603?q=80&w=1200&auto=format&fit=crop'
    },
    {
      dia_chi_vi: 'nong_dan_wallet_address_uttroc',
      vai_tro: 'nong_dan' as const,
      ten_dang_nhap: 'uttroc',
      mat_khau: '123',
      ten_hien_thi: 'Nhà vườn Út Trọc',
      ho_ten: 'Lê Văn Trọc',
      so_dien_thoai: '0944556677',
      dia_chi: 'Cái Bè, Tiền Giang',
      trang_thai_xac_thuc: 'da_xac_thuc_sdt',
      khu_vuc: 'Tiền Giang',
      dien_tich: '2 ha',
      san_pham_chinh: 'Sầu riêng Ri6',
      chung_nhan: 'VietGAP',
      anh_dai_dien: 'https://api.dicebear.com/7.x/micah/svg?seed=uttroc',
      anh_bia: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop'
    },
  ];

  console.log('⚡ Đang kiểm tra và khởi tạo dữ liệu tài khoản demo...');
  for (const user of demoUsers) {
    try {
      const { data } = await supabase
        .from('nguoi_dung')
        .select('dia_chi_vi')
        .eq('ten_dang_nhap', user.ten_dang_nhap)
        .maybeSingle();

      if (!data) {
        const { error } = await supabase.from('nguoi_dung').insert([user]);
        if (error) {
          console.error(`Không thể chèn tài khoản ${user.ten_dang_nhap}:`, error.message);
        } else {
          console.log(`✅ Đã chèn tài khoản demo: ${user.ten_dang_nhap}`);
        }
      } else {
        // Cập nhật các trường nhưng giữ nguyên địa chỉ ví nếu đó là ví thật (ví dụ ví Phantom đã kết nối)
        const existingWallet = data.dia_chi_vi;
        const isRealWallet = existingWallet && 
                             !existingWallet.includes('_demo') && 
                             !existingWallet.includes('wallet_address');
        
        const updatePayload = { ...user };
        if (isRealWallet) {
          delete (updatePayload as any).dia_chi_vi;
        }

        const { error } = await supabase.from('nguoi_dung')
          .update(updatePayload)
          .eq('ten_dang_nhap', user.ten_dang_nhap);
          
        if (error) {
           console.error(`Không thể cập nhật tài khoản ${user.ten_dang_nhap}:`, error.message);
        } else {
           console.log(`ℹ️ Đã cập nhật toàn bộ thông tin cho tài khoản demo: ${user.ten_dang_nhap} (Giữ ví thật: ${isRealWallet ? 'Có' : 'Không'})`);
        }
      }
    } catch (err) {
      console.error('Lỗi khi chạy seed tài khoản demo:', err);
    }
  }
}
