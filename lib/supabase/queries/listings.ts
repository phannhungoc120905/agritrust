import { supabase } from '../client';
import { FarmerProduct } from '../../../types/profile';

// Lấy danh sách tất cả sản phẩm nông sản
export async function getFarmerProducts() {
  const { data, error } = await supabase
    .from('san_pham_nong_dan')
    .select(`
      *,
      nguoi_dung (
        ten_hien_thi, khu_vuc, chung_nhan, anh_dai_dien, trang_thai_xac_thuc
      )
    `)
    .order('ngay_tao', { ascending: false });

  if (error) {
    console.error('Lỗi khi lấy danh sách sản phẩm:', error.message);
    return [];
  }
  return data || [];
}

// Lấy danh sách sản phẩm của một nông dân cụ thể
export async function getFarmerProductsByWallet(vi_nong_dan: string) {
  const { data, error } = await supabase
    .from('san_pham_nong_dan')
    .select('*')
    .eq('vi_nong_dan', vi_nong_dan)
    .order('ngay_tao', { ascending: false });

  if (error) {
    console.error('Lỗi khi lấy danh sách sản phẩm của nông dân:', error.message);
    return [];
  }
  return data || [];
}

// Tạo sản phẩm nông sản mới
export async function createFarmerProduct(productData: {
  vi_nong_dan: string;
  ten_san_pham: string;
  mo_ta?: string;
  so_luong_uoc_tinh?: string;
  gia_tham_khao?: string;
  mua_vu?: string;
  hinh_anh?: string[];
}) {
  const { data, error } = await supabase
    .from('san_pham_nong_dan')
    .insert([productData])
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi tạo sản phẩm nông dân:', error.message);
    throw error;
  }
  return data;
}

// Xóa sản phẩm
export async function deleteFarmerProduct(id: string) {
  const { error } = await supabase
    .from('san_pham_nong_dan')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Lỗi khi xóa sản phẩm:', error.message);
    throw error;
  }
  return true;
}

// Script tự động chèn dữ liệu Sản Phẩm demo vào database
export async function seedDemoProducts() {
  const demoProducts = [
    {
      vi_nong_dan: 'nong_dan_wallet_address_vamco',
      ten_san_pham: 'Lúa ST25 (Lúa tươi)',
      so_luong_uoc_tinh: '5 tấn',
      gia_tham_khao: '8.500 VNĐ/kg',
      mua_vu: 'Đông Xuân 2026',
      mo_ta: 'Lúa đẹp, độ ẩm <14%, cam kết thu hoạch đúng ngày.',
      hinh_anh: ['https://images.unsplash.com/photo-1536630596251-b1260437a3a6?q=80&w=600&auto=format&fit=crop'],
      trang_thai: 'dang_ban',
    },
    {
      vi_nong_dan: 'nong_dan_wallet_address_ythang',
      ten_san_pham: 'Cà Phê Robusta Nhân Xô',
      so_luong_uoc_tinh: '2 tấn',
      gia_tham_khao: '85.000 VNĐ/kg',
      mua_vu: 'Vụ 2025-2026',
      mo_ta: 'Cà phê nhân xô chế biến ướt, hạt sàn 18.',
      hinh_anh: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop'],
      trang_thai: 'dang_ban',
    },
    {
      vi_nong_dan: 'nong_dan_wallet_address_uttroc',
      ten_san_pham: 'Sầu Riêng Ri6 Loại 1',
      so_luong_uoc_tinh: '1 tấn',
      gia_tham_khao: '80.000 VNĐ/kg',
      mua_vu: 'Tháng 6/2026',
      mo_ta: 'Bao ăn, rụng cuống tự nhiên, cơm vàng hạt lép.',
      hinh_anh: ['https://images.unsplash.com/photo-1621263764214-7d52a209ec16?q=80&w=600&auto=format&fit=crop'],
      trang_thai: 'dang_ban',
    },
    {
      vi_nong_dan: 'nong_dan_wallet_address_demo',
      ten_san_pham: 'Gạo ST25',
      mo_ta: 'Gạo sạch lúa tôm, chất lượng chuẩn xuất khẩu, đóng bao 10kg/25kg.',
      so_luong_uoc_tinh: '10 tấn',
      gia_tham_khao: '28.000 VNĐ/kg',
      hinh_anh: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=600&auto=format&fit=crop'],
      mua_vu: 'Đông Xuân 2026',
      trang_thai: 'dang_ban',
    },
    {
      vi_nong_dan: 'nong_dan_wallet_address_demo',
      ten_san_pham: 'Xoài Cát Hòa Lộc',
      mo_ta: 'Xoài giòn, ngọt tự nhiên, không dùng thuốc ép chín.',
      so_luong_uoc_tinh: '2 tấn',
      gia_tham_khao: '',
      hinh_anh: ['https://images.unsplash.com/photo-1553279768-865429fa0078?q=80&w=600&auto=format&fit=crop'],
      mua_vu: 'Hè 2026',
      trang_thai: 'dang_ban',
    },
  ];

  console.log('⚡ Đang kiểm tra và khởi tạo dữ liệu Sản Phẩm Nông Sản demo...');
  for (const product of demoProducts) {
    try {
      const { data } = await supabase
        .from('san_pham_nong_dan')
        .select('id')
        .eq('vi_nong_dan', product.vi_nong_dan)
        .eq('ten_san_pham', product.ten_san_pham)
        .maybeSingle();

      if (!data) {
        const { error } = await supabase.from('san_pham_nong_dan').insert([product]);
        if (error) {
          console.error(`Không thể chèn sản phẩm ${product.ten_san_pham}:`, error.message);
        } else {
          console.log(`✅ Đã chèn sản phẩm demo: ${product.ten_san_pham}`);
        }
      } else {
        const { error } = await supabase
          .from('san_pham_nong_dan')
          .update(product)
          .eq('id', data.id);
        if (error) {
          console.error(`Không thể cập nhật sản phẩm ${product.ten_san_pham}:`, error.message);
        } else {
          console.log(`ℹ️ Đã cập nhật sản phẩm demo: ${product.ten_san_pham}`);
        }
      }
    } catch (err) {
      console.error('Lỗi khi chạy seed sản phẩm demo:', err);
    }
  }
}
