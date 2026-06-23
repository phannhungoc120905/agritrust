-- =====================================================================
-- AGRITRUST MIGRATION: Bổ sung các trường thông tin B2B vào bảng nguoi_dung
-- Chạy file này trên Supabase SQL Editor
-- =====================================================================

ALTER TABLE public.nguoi_dung
  ADD COLUMN IF NOT EXISTS phuong_thuc_canh_tac TEXT,     -- Ví dụ: Hữu cơ, VietGAP, Truyền thống...
  ADD COLUMN IF NOT EXISTS san_luong_hang_nam TEXT,       -- Ví dụ: 50 tấn/năm, 100 tấn/vụ...
  ADD COLUMN IF NOT EXISTS phuong_thuc_van_chuyen TEXT;    -- Ví dụ: Tự vận chuyển, Bên mua tự vận chuyển, FOB...

COMMENT ON COLUMN public.nguoi_dung.phuong_thuc_canh_tac IS 'Phương thức canh tác nông nghiệp';
COMMENT ON COLUMN public.nguoi_dung.san_luong_hang_nam IS 'Sản lượng cung ứng hàng năm';
COMMENT ON COLUMN public.nguoi_dung.phuong_thuc_van_chuyen IS 'Phương thức vận chuyển, logistics giao hàng';
