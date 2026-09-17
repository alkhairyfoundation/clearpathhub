require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

const steps = [
  `ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_image TEXT`,
  `ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS option_images TEXT[]`,
  `ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0`,
  `ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS timestamp_seconds INTEGER DEFAULT 0`,
  `ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS is_checkpoint BOOLEAN DEFAULT false`,
  `ALTER TABLE quiz_questions ALTER COLUMN correct_answer TYPE JSONB USING to_jsonb(correct_answer)`,
];

(async () => {
  for (const sql of steps) {
    await pool.query(sql);
    console.log(`OK: ${sql}`);
  }
  const r = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='quiz_questions' ORDER BY ordinal_position`
  );
  console.log('\nquiz_questions now:');
  r.rows.forEach((c) => console.log(`  ${c.column_name} (${c.data_type})`));
  await pool.end();
  console.log('\nDone.');
})().catch((e) => { console.error(e); process.exit(1); });