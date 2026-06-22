import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('ban_ghi_dam_phan').select('*');
  console.log('Error:', error);
  console.log('Data count:', data?.length);
  if (data?.length) {
    console.log('First record:', data[0]);
  }
}

check();
