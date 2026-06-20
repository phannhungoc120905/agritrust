import { supabase } from '../client';

// Đăng nhập bằng tên đăng nhập và mật khẩu
export async function loginUser(ten_dang_nhap: string, mat_khau: string) {
  const { data, error } = await supabase
    .from('nguoi_dung')
    .select('*')
    .eq('ten_dang_nhap', ten_dang_nhap.trim())
    .eq('mat_khau', mat_khau)
    .single();

  if (error) {
    console.error('Lỗi khi đăng nhập:', error.message);
    return null;
  }
  return data;
}

// Đăng ký tài khoản người dùng mới (đơn giản để demo)
export async function registerUser(userData: {
  dia_chi_vi: string;
  vai_tro: 'nong_dan' | 'thuong_lai';
  ten_dang_nhap: string;
  mat_khau: string;
  ten_hien_thi: string;
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

// Script tự động chèn 2 tài khoản demo khi khởi chạy dự án
export async function seedDemoUsers() {
  const demoUsers = [
    {
      dia_chi_vi: 'nong_dan_wallet_address_demo',
      vai_tro: 'nong_dan' as const,
      ten_dang_nhap: 'nongdan',
      mat_khau: '123',
      ten_hien_thi: 'Nông dân Nguyễn Văn Ruộng',
    },
    {
      dia_chi_vi: 'thuong_lai_wallet_address_demo',
      vai_tro: 'thuong_lai' as const,
      ten_dang_nhap: 'thuonglai',
      mat_khau: '123',
      ten_hien_thi: 'Thương lái Trần Thị Thương',
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
        console.log(`ℹ️ Tài khoản demo đã tồn tại: ${user.ten_dang_nhap}`);
      }
    } catch (err) {
      console.error('Lỗi khi chạy seed tài khoản demo:', err);
    }
  }
}
