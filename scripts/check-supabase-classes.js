require('dotenv').config({ path: '.env.local' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
(async () => {
  const res = await fetch(`${url}/rest/v1/classes?select=id,name,level&order=level,name`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  console.log('status:', res.status);
  const body = await res.text();
  console.log(body.slice(0, 1500));
})();