import { supabase } from '../lib/supabase/client';

async function check() {
  const { data } = await supabase
    .from('hop_dong')
    .select('*')
    .eq('id', '1f1d5bf4-2a85-498b-8b2b-3842ee0715ae')
    .single();
  console.log(data);
}

check();
