import { supabase } from '../client';

export interface MarketListing {
  id: string;
  vi_nguoi_ban: string;
  ten_san_pham: string;
  so_luong: string;
  khu_vuc: string;
  mo_ta?: string;
  ngay_tao?: string;
  nguoi_dung?: {
    ten_hien_thi: string;
  };
}

// Lấy danh sách tin đăng bán kèm tên hiển thị của nông dân
export async function getMarketListings() {
  const { data, error } = await supabase
    .from('tin_dang_cho')
    .select(`
      *,
      nguoi_dung (
        ten_hien_thi
      )
    `)
    .order('ngay_tao', { ascending: false });

  if (error) {
    console.error('Lỗi khi lấy danh sách tin đăng:', error.message);
    return [];
  }
  return data || [];
}

// Tạo tin đăng bán nông sản mới
export async function createMarketListing(listingData: {
  vi_nguoi_ban: string;
  ten_san_pham: string;
  so_luong: string;
  khu_vuc: string;
  mo_ta?: string;
}) {
  const { data, error } = await supabase
    .from('tin_dang_cho')
    .insert([listingData])
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi tạo tin đăng bán:', error.message);
    throw error;
  }
  return data;
}

// Xóa tin đăng bán nông sản
export async function deleteMarketListing(id: string) {
  const { error } = await supabase
    .from('tin_dang_cho')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Lỗi khi xóa tin đăng bán:', error.message);
    throw error;
  }
  return true;
}

// Script tự động chèn dữ liệu Chợ Nông Sản demo vào database
export async function seedDemoListings() {
  const demoListings = [
    {
      vi_nguoi_ban: 'nong_dan_wallet_address_vamco',
      ten_san_pham: '5 Tấn Lúa ST25',
      so_luong: '5 tấn',
      khu_vuc: 'Long An',
      mo_ta: 'Lúa đẹp, độ ẩm <14%, cam kết thu hoạch đúng ngày.',
    },
    {
      vi_nguoi_ban: 'nong_dan_wallet_address_ythang',
      ten_san_pham: '2 Tấn Cà Phê Robusta',
      so_luong: '2 tấn',
      khu_vuc: 'Đắk Lắk',
      mo_ta: 'Cà phê nhân xô chế biến ướt, hạt sàn 18.',
    },
    {
      vi_nguoi_ban: 'nong_dan_wallet_address_uttroc',
      ten_san_pham: '1 Tấn Sầu Riêng Ri6',
      so_luong: '1 tấn',
      khu_vuc: 'Tiền Giang',
      mo_ta: 'Bao ăn, rụng cuống tự nhiên, cơm vàng hạt lép.',
    },
  ];

  console.log('⚡ Đang kiểm tra và khởi tạo dữ liệu Chợ Nông Sản demo...');
  for (const listing of demoListings) {
    try {
      const { data } = await supabase
        .from('tin_dang_cho')
        .select('id')
        .eq('vi_nguoi_ban', listing.vi_nguoi_ban)
        .eq('ten_san_pham', listing.ten_san_pham)
        .maybeSingle();

      if (!data) {
        const { error } = await supabase.from('tin_dang_cho').insert([listing]);
        if (error) {
          console.error(`Không thể chèn tin đăng ${listing.ten_san_pham}:`, error.message);
        } else {
          console.log(`✅ Đã chèn tin đăng demo: ${listing.ten_san_pham}`);
        }
      } else {
        console.log(`ℹ️ Tin đăng demo đã tồn tại: ${listing.ten_san_pham}`);
      }
    } catch (err) {
      console.error('Lỗi khi chạy seed tin đăng demo:', err);
    }
  }
}
