-- =====================================================================
-- AGRITRUST - CẬP NHẬT RÀNG BUỘC DATABASE (ON UPDATE CASCADE)
-- Dùng để sửa lỗi: update or delete on table "nguoi_dung" violates foreign key constraint
-- =====================================================================

-- 1. Cập nhật bảng hop_dong (Hợp đồng)
ALTER TABLE hop_dong
DROP CONSTRAINT IF EXISTS hop_dong_vi_nguoi_ban_fkey,
DROP CONSTRAINT IF EXISTS hop_dong_vi_nguoi_mua_fkey;

ALTER TABLE hop_dong
ADD CONSTRAINT hop_dong_vi_nguoi_ban_fkey 
  FOREIGN KEY (vi_nguoi_ban) REFERENCES nguoi_dung(dia_chi_vi) 
  ON UPDATE CASCADE,
ADD CONSTRAINT hop_dong_vi_nguoi_mua_fkey 
  FOREIGN KEY (vi_nguoi_mua) REFERENCES nguoi_dung(dia_chi_vi) 
  ON UPDATE CASCADE;

-- 2. Cập nhật bảng tin_dang_cho (Tin đăng bán nông sản)
ALTER TABLE tin_dang_cho
DROP CONSTRAINT IF EXISTS tin_dang_cho_vi_nguoi_ban_fkey;

ALTER TABLE tin_dang_cho
ADD CONSTRAINT tin_dang_cho_vi_nguoi_ban_fkey
  FOREIGN KEY (vi_nguoi_ban) REFERENCES nguoi_dung(dia_chi_vi)
  ON UPDATE CASCADE ON DELETE CASCADE;

-- 3. Cập nhật bảng ban_ghi_dam_phan (Bản ghi đàm phán)
ALTER TABLE ban_ghi_dam_phan
DROP CONSTRAINT IF EXISTS ban_ghi_dam_phan_vi_nguoi_noi_fkey;

ALTER TABLE ban_ghi_dam_phan
ADD CONSTRAINT ban_ghi_dam_phan_vi_nguoi_noi_fkey
  FOREIGN KEY (vi_nguoi_noi) REFERENCES nguoi_dung(dia_chi_vi)
  ON UPDATE CASCADE;

-- 4. Cập nhật bảng nhat_ky_giao_dich (Nhật ký giao dịch)
ALTER TABLE nhat_ky_giao_dich
DROP CONSTRAINT IF EXISTS nhat_ky_giao_dich_nguoi_goi_fkey;

ALTER TABLE nhat_ky_giao_dich
ADD CONSTRAINT nhat_ky_giao_dich_nguoi_goi_fkey
  FOREIGN KEY (nguoi_goi) REFERENCES nguoi_dung(dia_chi_vi)
  ON UPDATE CASCADE;
