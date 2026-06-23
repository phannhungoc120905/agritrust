-- 1. Thêm cột Ảnh Bìa (anh_bia) vào bảng nguoi_dung
ALTER TABLE public.nguoi_dung ADD COLUMN IF NOT EXISTS anh_bia TEXT;

-- 2. Khởi tạo Bucket "profiles" cho việc lưu trữ ảnh đại diện / ảnh bìa
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Cấp quyền truy cập Public (Ai cũng có thể xem ảnh)
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'profiles' );

-- 4. Cấp quyền Insert (Ai cũng có thể upload ảnh lên bucket profiles)
-- Lưu ý: Trong môi trường production, bạn nên thêm điều kiện auth.uid()
CREATE POLICY "Public Upload"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'profiles' );
  
-- 5. Cấp quyền Update (Cho phép sửa ảnh của chính mình nếu cần)
CREATE POLICY "Public Update"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'profiles' );
