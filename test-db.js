const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from('hop_dong').select('*').limit(1);
  if (error) {
    console.error("Error fetching hop_dong:", error);
  } else {
    console.log("hop_dong columns:", data.length > 0 ? Object.keys(data[0]) : "No data, but request succeeded.");
  }
}

main();
