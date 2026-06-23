const fs = require('fs');
const path = require('path');

const dotenvContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const lines = dotenvContent.split('\n');
const env = {};
lines.forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
  }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

supabase.from('nguoi_dung').select('*').then(({data, error}) => {
  if (error) console.error(error);
  else console.log('Users:', data.map(u => ({
    ten_dang_nhap: u.ten_dang_nhap,
    dia_chi_vi: u.dia_chi_vi,
    vai_tro: u.vai_tro
  })));
});
