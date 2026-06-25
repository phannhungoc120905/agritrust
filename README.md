# 🌾 AgriTrust — Intelligent B2B Agricultural Escrow Platform

AgriTrust is a smart B2B agricultural trading solution that connects Farmers (Cooperatives) and Traders (Buyers) directly. It ensures secure payment and automated dispute resolution via **Solana Blockchain Smart Contracts**, integrated seamlessly with real-time data synchronized on **Supabase**.

---

## 🛠️ Installation & Setup Guide (For Project Members)

Follow these steps to run the application locally and connect to the shared Supabase database:

### 1. Clone the Code and Install Dependencies
```bash
# Clone the repository (if not already cloned)
git clone https://github.com/phannhungoc120905/agritrust.git
cd agritrust

# Install all dependencies
npm install
```

### 2. Environment Configuration (`.env`)
Create a `.env` file in the **root directory** of the project (at the same level as `package.json`). Copy and paste the configuration below. This configuration is shared among the project members for running local Agora Video Calls (with Tokens) and AI contract extraction (Llama 3.3 via Groq):

```env
# Supabase Config (Team Shared Database Connection)
NEXT_PUBLIC_SUPABASE_URL=https://fjqbgxvzvmtvwhjkacsh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcWJneHZ6dm10dndoamthY3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTg0MTAsImV4cCI6MjA5NzUzNDQxMH0.5eYU2Wuz0z4MnItwQGWbP5ylx7N9Z8ZgtaayihihO64

# Agora Config (Required: Both App ID and Certificate to generate dynamic security tokens)
NEXT_PUBLIC_AGORA_APP_ID=3c858b4f728949838273a8f4396037a7
AGORA_APP_CERTIFICATE=0bfb63666c444bebb9b725b6adf6e6c8

# OpenAI/Groq SDK Config (Calling Llama-3.3-70b-versatile via Groq API)
OPENAI_API_KEY=gsk_YOUR_GROQ_API_KEY_PLACEHOLDER
NEXT_PUBLIC_AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
```

### 3. Database Update & Seed Demo Data
*   **Step 1 (Only one team member needs to execute on Supabase Dashboard):**
    *   Run the database structure queries in `supabase/schema.sql` inside the **SQL Editor** on the Supabase console.
    *   *Note on wallet connection error:* If you encounter a foreign key constraint error when changing or connecting a wallet, execute the SQL script in `supabase/update_constraints.sql` in the SQL Editor to update the constraint to `ON UPDATE CASCADE`.
*   **Step 2 (Insert Demo Data):** Run the following command in your terminal to automatically populate the database with demo accounts and sample listings:
    ```bash
    npm run seed:users
    ```

### 4. Launch the Development Server
```bash
npm run dev
```
Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to experience the app.

---

## 🔑 Demo Accounts for Testing (Common Password: `123`)

For evaluation and testing, please use these pre-funded demo accounts:

| Role | Username | System Display Name |
| :--- | :--- | :--- |
| **Trader** | `thuonglai` | Trader Tran Thi Thuong (Merchant) |
| **Farmer** | `nongdan` | Farmer Nguyen Van Ruong |
| **Farmer** | `vamco` | Vam Co Agricultural Cooperative |
| **Farmer** | `ythang` | Farmer Y Thang |
| **Farmer** | `uttroc` | Ut Troc Orchard |

---

## 💡 Completed Smart Negotiation & AI Features

The project has fully integrated the following intelligent negotiation capabilities:
*   **Vietnamese Speech-to-Text (STT):** Real-time Vietnamese speech recognition using the browser's Web Speech API. Supports automatic fallback to simulated dialog scripts if audio inputs/microphones are not available.
*   **AI Contract Extraction (Llama 3.3 via Groq):** Secure API Route processing using the Llama 3.3 model (via Groq API) to analyze call transcripts and establish draft contract terms.
*   **Smart Price Alerts:** Compares real-time negotiated prices with local market price databases (e.g., ST25 Rice: 8.5M/ton, Coffee: 75M/ton, Durian: 120M/ton, Dragon Fruit: 22M/ton) and triggers a warning banner if deviations exceed 15%.
*   **Seamless Escrow Routing:** Directs locked negotiations straight to the detailed Escrow contract page `/contract/[id]` for signature, deposit, and delivery/dispute management.
*   **Fast Demo Simulation Mode:** Conversation delay in demo simulation mode is configured to **0.6 seconds** for quick, smooth evaluations.

---

## 📂 Core Folder Structure
*   `/app`: Next.js application routes (Login, Register, Negotiation Call, Contract Escrow, Profile).
*   `/components`: Shared UI components (Wallet Connection button, Draft Contract terms table, Dispute report forms).
*   `/hooks`: Solana wallet interactions (`useWallet.ts`) and Smart Contract Escrow execution (`useEscrow.ts`).
*   `/lib`: Core configurations and logic for Supabase API, Agora Video Call, and Solana program providers.
*   `/supabase`: Schema definitions `schema.sql` and database migration scripts.
*   `/programs`: Rust Smart Contract source code for Solana Escrow (Anchor framework).

---

## 🗄️ Unified Database Schema & Realtime Setup (SQL)

Copy and paste the following consolidated script directly into the **SQL Editor** on your Supabase console. This script establishes all base tables, updates B2B profiling properties, configures local storage buckets, and enables real-time synchronization:

```sql
-- =====================================================================
-- AGRITRUST — COMPLETE DATABASE SCHEMA (Supabase / PostgreSQL)
-- Combined: Base Schema + B2B Profiles + Contact Requests + Constraints + Realtime
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. DROP EXISTING CONSTRAINTS & TABLES (Clean Slate Setup)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS nhat_ky_giao_dich CASCADE;
DROP TABLE IF EXISTS bao_cao_tranh_chap CASCADE;
DROP TABLE IF EXISTS ban_ghi_dam_phan CASCADE;
DROP TABLE IF EXISTS yeu_cau_lien_he CASCADE;
DROP TABLE IF EXISTS hop_dong CASCADE;
DROP TABLE IF EXISTS san_pham_nong_dan CASCADE;
DROP TABLE IF EXISTS tin_dang_cho CASCADE;
DROP TABLE IF EXISTS gia_tham_khao_mock CASCADE;
DROP TABLE IF EXISTS nguoi_dung CASCADE;

DROP TYPE IF EXISTS vai_tro CASCADE;
DROP TYPE IF EXISTS trang_thai_hop_dong CASCADE;
DROP TYPE IF EXISTS den_canh_bao_gia CASCADE;
DROP TYPE IF EXISTS trang_thai_tranh_chap CASCADE;
DROP TYPE IF EXISTS ten_ham_smart_contract CASCADE;
DROP TYPE IF EXISTS trang_thai_giao_dich CASCADE;
DROP TYPE IF EXISTS trang_thai_yeu_cau CASCADE;

-- ---------------------------------------------------------------------
-- 2. CUSTOM TYPE DEFINITIONS (ENUMS)
-- ---------------------------------------------------------------------
CREATE TYPE vai_tro AS ENUM ('nong_dan', 'thuong_lai');
CREATE TYPE den_canh_bao_gia AS ENUM ('binh_thuong', 'canh_bao_do');
CREATE TYPE trang_thai_giao_dich AS ENUM ('dang_xu_ly', 'thanh_cong', 'that_bai');

CREATE TYPE trang_thai_hop_dong AS ENUM (
    'du_thao',          -- Draft (AI generated contract terms, unsigned)
    'da_khoa_tien',     -- Locked (Both parties signed, funds locked on-chain)
    'da_xac_nhan',      -- Confirmed (Buyer confirmed satisfactory delivery)
    'dang_tranh_chap',  -- Disputed (Buyer raised issue/claim, waiting review)
    'da_giai_quyet',    -- Resolved (Arbitration settled, funds dispersed)
    'qua_han'           -- TimedOut (Seller claimed funds after deadline inactivity)
);

CREATE TYPE trang_thai_tranh_chap AS ENUM (
    'moi_gui',          -- submitted
    'dang_xem_xet',     -- under_review
    'da_dong_y',        -- agreed
    'da_giai_ngan'      -- settled
);

CREATE TYPE ten_ham_smart_contract AS ENUM (
    'initialize',
    'confirm_receipt',
    'resolve_partial',
    'claim_timeout'
);

CREATE TYPE trang_thai_yeu_cau AS ENUM (
    'cho_phan_hoi',   -- Sent by merchant, waiting farmer response
    'da_xem',         -- Opened by farmer, pending decision
    'da_dong_y',      -- Farmer accepted contact inquiry
    'tu_choi',        -- Farmer declined contact inquiry
    'da_hen_lich',    -- Appointment scheduled
    'da_ket_noi',     -- Connected in call / negotiation room started
    'het_han'         -- Inquiry expired (no response in 7 days)
);

-- ---------------------------------------------------------------------
-- 3. TABLE DEFINITIONS & COLUMNS
-- ---------------------------------------------------------------------

-- Table 1: USER PROFILES
CREATE TABLE nguoi_dung (
    dia_chi_vi      TEXT PRIMARY KEY,                  -- Solana wallet address (Phantom)
    vai_tro         vai_tro NOT NULL,                  -- 'nong_dan' | 'thuong_lai'
    ten_dang_nhap   TEXT UNIQUE,                       -- Login username (e.g. nongdan, thuonglai)
    mat_khau        TEXT,                              -- Password hash or plain (demo only)
    ten_hien_thi    TEXT,                              -- Short display name
    ho_ten          TEXT,                              -- Full legal name (for contracts/PDF)
    so_dien_thoai   TEXT,                              -- Contact phone number
    dia_chi         TEXT,                              -- Permanent address / headquarters
    ngay_sinh       DATE,                              -- Date of birth
    anh_dai_dien    TEXT,                              -- Profile picture URL
    anh_bia         TEXT,                              -- Cover banner URL
    mo_ta_ban_than  TEXT,                              -- Self description / biography
    trang_thai_xac_thuc TEXT NOT NULL DEFAULT 'chua_xac_thuc', -- KYC verification state
    
    -- Farmer-specific fields
    ten_nong_trai   TEXT,                              -- Farm or Cooperative name
    khu_vuc         TEXT,                              -- Cultivation region / province
    dien_tich       TEXT,                              -- Farm size (e.g. "5 ha")
    san_pham_chinh  TEXT,                              -- Main crops / products
    chung_nhan      TEXT,                              -- VietGAP, GlobalGAP, Organic...
    kinh_nghiem     TEXT,                              -- Years of farming experience
    phuong_thuc_canh_tac TEXT,                         -- Farming method (Organic, Traditional...)
    san_luong_hang_nam TEXT,                           -- Annual supply capacity (e.g. "50 tons/year")
    
    -- Trader-specific fields
    ten_cong_ty     TEXT,                              -- Company name
    linh_vuc_thu_mua TEXT,                             -- Purchasing categories
    khu_vuc_thu_mua TEXT,                              -- Operating coverage area
    phuong_thuc_van_chuyen TEXT,                       -- Transport / Logistics term (e.g. FOB)
    
    ngay_tao        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 2: FARMER PRODUCTS (Replaces deprecated tin_dang_cho)
CREATE TABLE san_pham_nong_dan (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vi_nong_dan       TEXT NOT NULL REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE ON DELETE CASCADE,
    ten_san_pham      TEXT NOT NULL,                   -- e.g. "Lúa ST25", "Cà phê Robusta"
    mo_ta             TEXT,                            -- Product specifications & details
    so_luong_uoc_tinh TEXT,                            -- Estimated yield: "5 tons/harvest"
    gia_tham_khao     TEXT,                            -- Guide price: "8,000 VND/kg"
    hinh_anh          JSONB DEFAULT '[]'::jsonb,       -- Product image URL array
    mua_vu            TEXT,                            -- Crop season: "Summer-Autumn 2026"
    trang_thai        TEXT NOT NULL DEFAULT 'dang_ban',-- 'dang_ban' | 'tam_ngung' | 'het_hang'
    ngay_tao          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 3: CONTRACTS / ESCROW RECORDER
CREATE TABLE hop_dong (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vi_nguoi_ban            TEXT NOT NULL REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE,
    vi_nguoi_mua            TEXT NOT NULL REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE,
    san_pham                TEXT NOT NULL,                 -- Product description
    so_luong                NUMERIC(12,2) NOT NULL,        -- Cargo quantity
    don_vi_tinh             TEXT NOT NULL DEFAULT 'kg',    -- kg, ton, bag, etc.
    don_gia                 NUMERIC(14,2) NOT NULL,        -- Unit price (VND per unit)
    han_giao_hang           TIMESTAMPTZ NOT NULL,          -- Delivery deadline
    noi_dung_nhap_ai        JSONB,                         -- Raw LLM context payload
    dieu_khoan_chat_luong   JSONB,                         -- Extracted quality SLA parameters
    ty_gia_vnd_usdc         NUMERIC(10,2) NOT NULL DEFAULT 25000.00, -- VND-USDC/SOL rate
    tong_tien_usdc_khoa     NUMERIC(14,2),                 -- Actual locked funds (SOL/USDC)
    dia_chi_vi_escrow       TEXT,                          -- Solana PDA escrow address
    trang_thai              trang_thai_hop_dong NOT NULL DEFAULT 'du_thao',
    ngay_tao                TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_xac_nhan           TIMESTAMPTZ,                   -- Timestamp when deposit was finalized
    
    CONSTRAINT chk_escrow_bat_buoc_khi_da_khoa
        CHECK (trang_thai = 'du_thao' OR dia_chi_vi_escrow IS NOT NULL)
);

-- Table 4: CONTACT REQUESTS (Trade matching system)
CREATE TABLE yeu_cau_lien_he (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vi_thuong_lai         TEXT NOT NULL REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE,
    vi_nong_dan           TEXT NOT NULL REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE,
    id_san_pham           UUID REFERENCES san_pham_nong_dan(id) ON DELETE SET NULL,
    ten_san_pham_snapshot TEXT NOT NULL,
    so_luong_du_kien      TEXT,
    loi_nhan              TEXT,
    loai_lien_he          TEXT NOT NULL DEFAULT 'goi_ngay', -- 'goi_ngay' | 'hen_lich'
    thoi_gian_hen         TIMESTAMPTZ,
    room_id               TEXT,                            -- Agora call room ID
    trang_thai            trang_thai_yeu_cau NOT NULL DEFAULT 'cho_phan_hoi',
    ly_do_tu_choi         TEXT,
    id_hop_dong           UUID REFERENCES hop_dong(id),
    ngay_tao              TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_xem              TIMESTAMPTZ,
    ngay_phan_hoi         TIMESTAMPTZ
);

-- Table 5: TALK TRANSCRIPT LOGS (For STT & AI Parsing)
CREATE TABLE ban_ghi_dam_phan (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_hop_dong     UUID REFERENCES hop_dong(id),
    vi_nguoi_noi    TEXT NOT NULL REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE,
    noi_dung        TEXT NOT NULL,                         -- Speech-to-Text transcript segment
    den_canh_bao    den_canh_bao_gia NOT NULL DEFAULT 'binh_thuong',
    gia_thi_truong_luc_so_sanh  NUMERIC(14,2),
    thoi_gian_noi   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 6: REFERENCE/MOCK PRICES (Market price index)
CREATE TABLE gia_tham_khao_mock (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    khu_vuc         TEXT NOT NULL,
    san_pham        TEXT NOT NULL,
    gia_tham_khao   NUMERIC(14,2) NOT NULL,
    nhan_canh_bao   TEXT NOT NULL DEFAULT 'Dữ liệu demo, không đại diện giá thị trường thực'
);

-- Table 7: DISPUTE CLAIMS & ARBITRATION REPORTS
CREATE TABLE bao_cao_tranh_chap (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_hop_dong                 UUID NOT NULL REFERENCES hop_dong(id),
    so_luong_thuc_nhan          NUMERIC(12,2) NOT NULL,    -- Declared quantity received
    ghi_chu_chat_luong          TEXT,                      -- Detailed quality remarks
    danh_sach_url_anh           JSONB DEFAULT '[]'::jsonb, -- Evidence image URLs
    url_video                   TEXT,                      -- Evidence video URL
    nguoi_ban_da_duyet          BOOLEAN NOT NULL DEFAULT false, -- Farmer reviewed report
    ty_le_giai_ngan_ai_de_xuat  NUMERIC(5,4),              -- AI proposed release percentage (0.0000 to 1.0000)
    so_tien_giai_ngan_de_xuat   NUMERIC(14,2),             -- Suggested farmer payout (SOL)
    so_tien_hoan_lai_de_xuat    NUMERIC(14,2),             -- Suggested trader refund (SOL)
    nguoi_mua_dong_y            BOOLEAN NOT NULL DEFAULT false, -- Buyer signature
    nguoi_ban_dong_y            BOOLEAN NOT NULL DEFAULT false, -- Seller signature
    ma_hash_bang_chung          TEXT,                      -- IPFS metadata hash
    trang_thai                  trang_thai_tranh_chap NOT NULL DEFAULT 'moi_gui',
    ngay_tao                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_giai_quyet             TIMESTAMPTZ,
    
    CONSTRAINT rang_buoc_phai_dong_y_truoc_khi_giai_ngan
        CHECK (trang_thai != 'da_giai_ngan' OR (nguoi_mua_dong_y AND nguoi_ban_dong_y))
);

-- Table 8: BLOCKCHAIN TX LOGS
CREATE TABLE nhat_ky_giao_dich (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_hop_dong     UUID NOT NULL REFERENCES hop_dong(id),
    ten_ham         ten_ham_smart_contract NOT NULL,
    chu_ky_giao_dich TEXT,                                 -- Transaction signature
    trang_thai      trang_thai_giao_dich NOT NULL DEFAULT 'dang_xu_ly',
    nguoi_goi        TEXT REFERENCES nguoi_dung(dia_chi_vi) ON UPDATE CASCADE,
    thoi_gian_goi    TIMESTAMPTZ NOT NULL DEFAULT now(),
    thoi_gian_xac_nhan TIMESTAMPTZ
);

-- Table 9: DEPRECATED LISTINGS (Kept for backward compatibility)
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
-- 4. PERFORMANCE INDEXES
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sanpham_nongdan ON san_pham_nong_dan(vi_nong_dan);
CREATE INDEX IF NOT EXISTS idx_hopdong_nguoiban ON hop_dong(vi_nguoi_ban);
CREATE INDEX IF NOT EXISTS idx_hopdong_nguoimua ON hop_dong(vi_nguoi_mua);
CREATE INDEX IF NOT EXISTS idx_hopdong_trangthai ON hop_dong(trang_thai);
CREATE INDEX IF NOT EXISTS idx_banghi_hopdong_thoigian ON ban_ghi_dam_phan(id_hop_dong, thoi_gian_noi);
CREATE INDEX IF NOT EXISTS idx_tranhchap_hopdong ON bao_cao_tranh_chap(id_hop_dong);
CREATE INDEX IF NOT EXISTS idx_tranhchap_trangthai ON bao_cao_tranh_chap(trang_thai);
CREATE INDEX IF NOT EXISTS idx_nhatky_hopdong ON nhat_ky_giao_dich(id_hop_dong);
CREATE INDEX IF NOT EXISTS idx_nhatky_tenham ON nhat_ky_giao_dich(ten_ham);
CREATE INDEX IF NOT EXISTS idx_yeucau_thuonglai ON yeu_cau_lien_he(vi_thuong_lai);
CREATE INDEX IF NOT EXISTS idx_yeucau_nongdan ON yeu_cau_lien_he(vi_nong_dan);
CREATE INDEX IF NOT EXISTS idx_yeucau_trangthai ON yeu_cau_lien_he(trang_thai);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_request
  ON yeu_cau_lien_he (vi_thuong_lai, vi_nong_dan)
  WHERE trang_thai IN ('cho_phan_hoi', 'da_xem');

-- ---------------------------------------------------------------------
-- 5. STORAGE BUCKETS CONFIGURATION (Profile Photos & Cover Images)
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'profiles' );
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'profiles' );
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'profiles' );

-- ---------------------------------------------------------------------
-- 6. SUPABASE REALTIME CONFIGURATION (WebSocket Synced Tables)
-- ---------------------------------------------------------------------
-- Add tables to realtime publication channel
alter publication supabase_realtime add table yeu_cau_lien_he;
alter publication supabase_realtime add table hop_dong;
alter publication supabase_realtime add table ban_ghi_dam_phan;
alter publication supabase_realtime add table bao_cao_tranh_chap;
alter publication supabase_realtime add table nguoi_dung;

-- Set replica identity to full to receive previous state parameters in payload
alter table yeu_cau_lien_he replica identity full;
alter table hop_dong replica identity full;
alter table ban_ghi_dam_phan replica identity full;
alter table bao_cao_tranh_chap replica identity full;
alter table nguoi_dung replica identity full;
```


