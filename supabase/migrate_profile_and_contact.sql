-- =====================================================================
-- AGRITRUST — MIGRATION: Hồ sơ & Liên hệ Đàm phán
-- Chạy file này trên Supabase SQL Editor
-- An toàn chạy nhiều lần nhờ IF NOT EXISTS / IF EXISTS
-- =====================================================================

-- =============================================================
-- PHẦN 1: MỞ RỘNG BẢNG nguoi_dung (thêm trường profile)
-- =============================================================
ALTER TABLE nguoi_dung
  ADD COLUMN IF NOT EXISTS ho_ten TEXT,                     -- Họ tên đầy đủ (cho hợp đồng PDF)
  ADD COLUMN IF NOT EXISTS so_dien_thoai TEXT,              -- SĐT liên hệ
  ADD COLUMN IF NOT EXISTS dia_chi TEXT,                    -- Địa chỉ thường trú / trụ sở
  ADD COLUMN IF NOT EXISTS ngay_sinh DATE,                  -- Ngày sinh
  ADD COLUMN IF NOT EXISTS anh_dai_dien TEXT,               -- URL ảnh đại diện
  ADD COLUMN IF NOT EXISTS mo_ta_ban_than TEXT,             -- Mô tả ngắn
  -- Trạng thái xác thực hồ sơ
  ADD COLUMN IF NOT EXISTS trang_thai_xac_thuc TEXT NOT NULL DEFAULT 'chua_xac_thuc',
  -- Trường riêng cho Nông dân
  ADD COLUMN IF NOT EXISTS ten_nong_trai TEXT,              -- Tên nông trại / HTX
  ADD COLUMN IF NOT EXISTS khu_vuc TEXT,                    -- Vùng miền canh tác
  ADD COLUMN IF NOT EXISTS dien_tich TEXT,                  -- Diện tích (ví dụ: "5 ha")
  ADD COLUMN IF NOT EXISTS san_pham_chinh TEXT,             -- Liệt kê nông sản chính
  ADD COLUMN IF NOT EXISTS chung_nhan TEXT,                 -- VietGAP, GlobalGAP, Hữu cơ...
  ADD COLUMN IF NOT EXISTS kinh_nghiem TEXT,                -- Số năm kinh nghiệm
  -- Trường riêng cho Thương lái
  ADD COLUMN IF NOT EXISTS ten_cong_ty TEXT,                -- Tên công ty
  ADD COLUMN IF NOT EXISTS linh_vuc_thu_mua TEXT,           -- Lĩnh vực thu mua
  ADD COLUMN IF NOT EXISTS khu_vuc_thu_mua TEXT;            -- Khu vực hoạt động


-- =============================================================
-- PHẦN 2: BẢNG SẢN PHẨM NÔNG DÂN (thay cho tin_dang_cho)
-- =============================================================
CREATE TABLE IF NOT EXISTS san_pham_nong_dan (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vi_nong_dan       TEXT NOT NULL REFERENCES nguoi_dung(dia_chi_vi)
                        ON UPDATE CASCADE ON DELETE CASCADE,
    ten_san_pham      TEXT NOT NULL,              -- Tên nông sản: Lúa ST25, Cà phê Robusta
    mo_ta             TEXT,                       -- Mô tả chi tiết
    so_luong_uoc_tinh TEXT,                       -- Sản lượng ước tính: "5 tấn/vụ"
    gia_tham_khao     TEXT,                       -- Giá tham khảo: "8.000 VNĐ/kg"
    hinh_anh          JSONB DEFAULT '[]'::jsonb,  -- Danh sách URL ảnh sản phẩm
    mua_vu            TEXT,                       -- Mùa vụ: "Hè Thu 2026"
    trang_thai        TEXT NOT NULL DEFAULT 'dang_ban', -- dang_ban | tam_ngung | het_hang
    ngay_tao          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sanpham_nongdan ON san_pham_nong_dan(vi_nong_dan);


-- =============================================================
-- PHẦN 3: BẢNG YÊU CẦU LIÊN HỆ (core của luồng mới)
-- =============================================================

-- ENUM trạng thái yêu cầu liên hệ (7 trạng thái, có da_xem)
DO $$ BEGIN
  CREATE TYPE trang_thai_yeu_cau AS ENUM (
      'cho_phan_hoi',   -- Thương lái vừa gửi, chờ nông dân
      'da_xem',         -- Nông dân đã mở xem nhưng chưa quyết định
      'da_dong_y',      -- Nông dân đồng ý liên hệ
      'tu_choi',        -- Nông dân từ chối
      'da_hen_lich',    -- Hai bên đã chọn thời gian hẹn
      'da_ket_noi',     -- Đã vào phòng đàm phán / đã có hop_dong
      'het_han'         -- Yêu cầu hết hạn (không phản hồi quá 7 ngày)
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS yeu_cau_lien_he (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vi_thuong_lai         TEXT NOT NULL REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE,
    vi_nong_dan           TEXT NOT NULL REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE,

    -- Sản phẩm: liên kết ID + snapshot tên (chống lệch khi nông dân đổi tên SP)
    id_san_pham           UUID REFERENCES san_pham_nong_dan(id) ON DELETE SET NULL,
    ten_san_pham_snapshot TEXT NOT NULL,            -- Tên SP tại thời điểm gửi yêu cầu

    -- Thông tin form từ Thương lái
    so_luong_du_kien      TEXT,                    -- Số lượng dự kiến
    loi_nhan              TEXT,                    -- Lời nhắn cho nông dân
    loai_lien_he          TEXT NOT NULL DEFAULT 'goi_ngay', -- 'goi_ngay' | 'hen_lich'
    thoi_gian_hen         TIMESTAMPTZ,             -- Thời gian hẹn (nếu chọn hẹn lịch)

    -- Phòng đàm phán (chỉ gen khi nông dân đồng ý, KHÔNG tạo hop_dong)
    room_id               TEXT,                    -- ID phòng video call

    -- Trạng thái & phản hồi
    trang_thai            trang_thai_yeu_cau NOT NULL DEFAULT 'cho_phan_hoi',
    ly_do_tu_choi         TEXT,                    -- Lý do từ chối (nếu có)

    -- Liên kết sang hợp đồng (CHỈ set sau khi AI sinh draft contract)
    id_hop_dong           UUID REFERENCES hop_dong(id),

    ngay_tao              TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_xem              TIMESTAMPTZ,             -- Lúc nông dân mở xem
    ngay_phan_hoi         TIMESTAMPTZ              -- Lúc nông dân đồng ý/từ chối
);

-- Chống spam: 1 thương lái chỉ có 1 yêu cầu ACTIVE tới 1 nông dân
-- Khi yêu cầu cũ bị từ chối / hết hạn / đã kết nối → có thể gửi mới
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_request
  ON yeu_cau_lien_he (vi_thuong_lai, vi_nong_dan)
  WHERE trang_thai IN ('cho_phan_hoi', 'da_xem', 'da_dong_y', 'da_hen_lich');

CREATE INDEX IF NOT EXISTS idx_yeucau_thuonglai ON yeu_cau_lien_he(vi_thuong_lai);
CREATE INDEX IF NOT EXISTS idx_yeucau_nongdan ON yeu_cau_lien_he(vi_nong_dan);
CREATE INDEX IF NOT EXISTS idx_yeucau_trangthai ON yeu_cau_lien_he(trang_thai);


-- =============================================================
-- PHẦN 4: ĐÁNH DẤU BẢNG CŨ (không xóa, chỉ ghi chú)
-- =============================================================
-- Bảng tin_dang_cho vẫn giữ nguyên trong database để không ảnh hưởng
-- data cũ. Code frontend sẽ chuyển sang dùng san_pham_nong_dan.
-- Nếu muốn dọn dẹp sau hackathon:
-- DROP TABLE IF EXISTS tin_dang_cho;


-- =============================================================
-- HOÀN TẤT
-- =============================================================
-- Kiểm tra bằng cách chạy:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'nguoi_dung';
-- SELECT * FROM san_pham_nong_dan LIMIT 1;
-- SELECT * FROM yeu_cau_lien_he LIMIT 1;
