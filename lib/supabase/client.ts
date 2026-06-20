import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Cảnh báo: Supabase URL hoặc Anon Key chưa được điền trong file .env. Vui lòng thiết lập để ứng dụng hoạt động chính xác.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
