require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Connecting to Supabase at:', supabaseUrl);
  
  try {
    const { data, error } = await supabase
      .from('question_bank')
      .select('level, subject, difficulty_level');
      
    if (error) {
      throw error;
    }
    
    console.log('Total questions found in Supabase:', data.length);
    
    const counts = {};
    for (const row of data) {
      const key = `${row.level} | ${row.subject} | ${row.difficulty_level}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    
    console.log('--- Supabase Question Counts ---');
    console.table(
      Object.keys(counts).sort().map(key => {
        const [level, subject, diff] = key.split(' | ');
        return { Level: level, Subject: subject, Difficulty: diff, Count: counts[key] };
      })
    );
  } catch (err) {
    console.error('Error querying Supabase:', err);
  }
}

run();
