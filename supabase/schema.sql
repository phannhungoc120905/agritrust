-- =====================================================================
-- AGRITRUST — CẤU TRÚC DATABASE (bản tiếng Việt, dễ đọc)
-- Dùng cho PostgreSQL / Supabase
-- Phiên bản: v2 (đã cập nhật)
--
-- LƯU Ý QUAN TRỌNG:
-- Đây là database "phụ" để lưu dữ liệu cho giao diện và AI dùng.
-- Tiền THẬT (đã khóa/đã giải ngân) luôn nằm trên Solana (on-chain),
-- do bạn P1 (Blockchain) quản lý. Database này chỉ ghi lại & đồng bộ
-- lại trạng thái cho khớp với on-chain, không tự ý chuyển tiền.
-- =====================================================================

-- ---------------------------------------------------------------------
-- CÁC LOẠI GIÁ TRỊ CỐ ĐỊNH (ENUM) — giống như danh sách lựa chọn có sẵn
-- ---------------------------------------------------------------------

-- Vai trò người dùng: nông dân hoặc thương lái
CREATE TYPE vai_tro AS ENUM ('nong_dan', 'thuong_lai');

-- Trạng thái hợp đồng — PHẢI khớp với trạng thái bên Smart Contract
CREATE TYPE trang_thai_hop_dong AS ENUM (
    'du_thao',          -- Draft: AI vừa tạo bảng hợp đồng nháp, chưa ai ký
    'da_khoa_tien',     -- Locked: 2 bên đã ký + khóa tiền vào PDA Vault
    'da_xac_nhan',      -- Confirmed: Kịch bản A - người mua xác nhận nhận hàng đủ
    'dang_tranh_chap',  -- Disputed: Kịch bản B - người mua khiếu nại, đang chờ xử lý
    'da_giai_quyet',    -- Resolved: Kịch bản B - đã giải ngân theo tỷ lệ thỏa thuận
    'qua_han'           -- TimedOut: Kịch bản C - người bán tự rút do người mua im lặng
);

-- Đèn cảnh báo giá khi đàm phán
CREATE TYPE den_canh_bao_gia AS ENUM ('binh_thuong', 'canh_bao_do');

-- Trạng thái xử lý 1 vụ tranh chấp
CREATE TYPE trang_thai_tranh_chap AS ENUM (
    'moi_gui',          -- submitted
    'dang_xem_xet',     -- under_review
    'da_dong_y',        -- agreed
    'da_giai_ngan'      -- settled
);

-- Tên 4 hàm trên Smart Contract
CREATE TYPE ten_ham_smart_contract AS ENUM (
    'initialize',
    'confirm_receipt',
    'resolve_partial',
    'claim_timeout'
);

-- Trạng thái 1 giao dịch gửi lên blockchain
CREATE TYPE trang_thai_giao_dich AS ENUM ('dang_xu_ly', 'thanh_cong', 'that_bai');


-- ---------------------------------------------------------------------
-- BẢNG 1: NGƯỜI DÙNG  (do P2 - Wallet & Infra phụ trách)
-- ---------------------------------------------------------------------
CREATE TABLE nguoi_dung (
    dia_chi_vi      TEXT PRIMARY KEY,         -- địa chỉ ví Phantom, dùng làm ID
    vai_tro         vai_tro NOT NULL,
    ten_dang_nhap   TEXT UNIQUE,              -- Tên đăng nhập (nongdan, thuonglai)
    mat_khau        TEXT,                     -- Mật khẩu
    ten_hien_thi    TEXT,                     -- Tên hiển thị
    ngay_tao        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------
-- BẢNG PHỤ: TIN ĐĂNG BÁN TRÊN CHỢ NÔNG SẢN
-- ---------------------------------------------------------------------
CREATE TABLE tin_dang_cho (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vi_nguoi_ban    TEXT NOT NULL REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE ON DELETE CASCADE,
    ten_san_pham    TEXT NOT NULL,
    so_luong        TEXT NOT NULL,
    khu_vuc         TEXT NOT NULL,
    mo_ta           TEXT,
    ngay_tao        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------
-- BẢNG 2: HỢP ĐỒNG  (P3 tạo bằng AI, P1 đồng bộ trạng thái on-chain)
-- ---------------------------------------------------------------------
CREATE TABLE hop_dong (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vi_nguoi_ban            TEXT NOT NULL REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE,  -- nông dân
    vi_nguoi_mua            TEXT NOT NULL REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE,  -- thương lái

    san_pham                TEXT NOT NULL,            -- ví dụ: "Lúa"
    so_luong                NUMERIC(12,2) NOT NULL,    -- số lượng theo don_vi_tinh
    don_vi_tinh             TEXT NOT NULL DEFAULT 'kg', -- kg, tấn, tạ,...
    don_gia                 NUMERIC(14,2) NOT NULL,    -- đơn vị: VNĐ, tính trên 1 đơn vị don_vi_tinh
    han_giao_hang           TIMESTAMPTZ NOT NULL,

    noi_dung_nhap_ai        JSONB,
    dieu_khoan_chat_luong   JSONB,

    ty_gia_vnd_usdc         NUMERIC(10,2) NOT NULL DEFAULT 25000.00,  -- hardcode theo kế hoạch
    tong_tien_usdc_khoa     NUMERIC(14,2),             -- tổng USDC thực tế đã đẩy lên Smart Contract
    dia_chi_vi_escrow       TEXT,                      -- địa chỉ PDA Vault trên Solana

    trang_thai              trang_thai_hop_dong NOT NULL DEFAULT 'du_thao',

    ngay_tao                TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_xac_nhan           TIMESTAMPTZ,   -- thời điểm khóa tiền (chuyển sang da_khoa_tien)

    CONSTRAINT chk_escrow_bat_buoc_khi_da_khoa
        CHECK (trang_thai = 'du_thao' OR dia_chi_vi_escrow IS NOT NULL)
);

CREATE INDEX idx_hopdong_nguoiban ON hop_dong(vi_nguoi_ban);
CREATE INDEX idx_hopdong_nguoimua ON hop_dong(vi_nguoi_mua);
CREATE INDEX idx_hopdong_trangthai ON hop_dong(trang_thai);


-- ---------------------------------------------------------------------
-- BẢNG 3: BẢN GHI ĐÀM PHÁN (transcript)  (P3 - AI Đàm phán phụ trách)
-- ---------------------------------------------------------------------
CREATE TABLE ban_ghi_dam_phan (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_hop_dong     UUID REFERENCES hop_dong(id),   -- có thể để trống vì lúc đàm phán chưa chốt hợp đồng
    vi_nguoi_noi    TEXT NOT NULL REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE,
    noi_dung        TEXT NOT NULL,                   -- đoạn chữ do Agora STT chuyển ra
    den_canh_bao    den_canh_bao_gia NOT NULL DEFAULT 'binh_thuong',

    gia_thi_truong_luc_so_sanh  NUMERIC(14,2),
    thoi_gian_noi   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_banghi_hopdong_thoigian ON ban_ghi_dam_phan(id_hop_dong, thoi_gian_noi);


-- ---------------------------------------------------------------------
-- BẢNG 4: GIÁ THAM KHẢO (DỮ LIỆU GIẢ LẬP)  (P3 phụ trách)
-- ---------------------------------------------------------------------
CREATE TABLE gia_tham_khao_mock (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    khu_vuc         TEXT NOT NULL,
    san_pham        TEXT NOT NULL,
    gia_tham_khao   NUMERIC(14,2) NOT NULL,
    nhan_canh_bao   TEXT NOT NULL DEFAULT 'Dữ liệu demo, không đại diện giá thị trường thực'
);


-- ---------------------------------------------------------------------
-- BẢNG 5: BÁO CÁO TRANH CHẤP  (P4 - Tranh chấp & Giải ngân phụ trách)
-- ---------------------------------------------------------------------
CREATE TABLE bao_cao_tranh_chap (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_hop_dong                 UUID NOT NULL REFERENCES hop_dong(id),

    so_luong_thuc_nhan          NUMERIC(12,2) NOT NULL,   -- người mua khai báo
    ghi_chu_chat_luong          TEXT,                      -- mô tả tình trạng hàng
    danh_sach_url_anh           JSONB DEFAULT '[]'::jsonb, -- ảnh bằng chứng
    url_video                   TEXT,                       -- video bằng chứng (nếu có)

    nguoi_ban_da_duyet          BOOLEAN NOT NULL DEFAULT false,  -- nông dân xác nhận đã xem báo cáo

    ty_le_giai_ngan_ai_de_xuat  NUMERIC(5,4),               -- 0.0000 đến 1.0000
    so_tien_giai_ngan_de_xuat   NUMERIC(14,2),              -- trả cho người bán
    so_tien_hoan_lai_de_xuat    NUMERIC(14,2),              -- hoàn cho người mua

    nguoi_mua_dong_y            BOOLEAN NOT NULL DEFAULT false,
    nguoi_ban_dong_y            BOOLEAN NOT NULL DEFAULT false,

    ma_hash_bang_chung          TEXT,    -- lưu lên IPFS/Solana
    trang_thai                  trang_thai_tranh_chap NOT NULL DEFAULT 'moi_gui',

    ngay_tao                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_giai_quyet             TIMESTAMPTZ,

    CONSTRAINT rang_buoc_phai_dong_y_truoc_khi_giai_ngan
        CHECK (trang_thai != 'da_giai_ngan' OR (nguoi_mua_dong_y AND nguoi_ban_dong_y))
);

CREATE INDEX idx_tranhchap_hopdong ON bao_cao_tranh_chap(id_hop_dong);
CREATE INDEX idx_tranhchap_trangthai ON bao_cao_tranh_chap(trang_thai);


-- ---------------------------------------------------------------------
-- BẢNG 6: NHẬT KÝ GIAO DỊCH BLOCKCHAIN  (P1 - Blockchain phụ trách)
-- ---------------------------------------------------------------------
CREATE TABLE nhat_ky_giao_dich (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_hop_dong     UUID NOT NULL REFERENCES hop_dong(id),
    ten_ham         ten_ham_smart_contract NOT NULL,
    chu_ky_giao_dich TEXT,        -- transaction signature trả về từ Solana
    trang_thai      trang_thai_giao_dich NOT NULL DEFAULT 'dang_xu_ly',
    nguoi_goi        TEXT REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE,
    thoi_gian_goi    TIMESTAMPTZ NOT NULL DEFAULT now(),
    thoi_gian_xac_nhan TIMESTAMPTZ
);

CREATE INDEX idx_nhatky_hopdong ON nhat_ky_giao_dich(id_hop_dong);
CREATE INDEX idx_nhatky_tenham ON nhat_ky_giao_dich(ten_ham);
