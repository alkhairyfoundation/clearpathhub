require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

const steps = [
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS description TEXT`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS video_url TEXT`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'youtube'`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false`,
  `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 50`,
  `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 30`,
  `CREATE TABLE IF NOT EXISTS quiz_questions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
     question TEXT NOT NULL,
     question_image TEXT,
     option_images TEXT[],
     options TEXT[] NOT NULL,
     correct_answer JSONB NOT NULL DEFAULT '0',
     points INTEGER DEFAULT 1,
     question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'multiple_selection', 'short_answer')),
     order_index INTEGER DEFAULT 0,
     timestamp_seconds INTEGER DEFAULT 0,
     is_checkpoint BOOLEAN DEFAULT false,
     created_at TIMESTAMP DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS report_remarks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     student_id UUID REFERENCES profiles(id) NOT NULL,
     term_id UUID REFERENCES terms(id) NOT NULL,
     teacher_remarks TEXT,
     principal_remarks TEXT,
     next_term_begins DATE,
     school_fees_paid BOOLEAN DEFAULT true,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(student_id, term_id)
   )`,
  `CREATE TABLE IF NOT EXISTS domain_grades (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     student_id UUID REFERENCES profiles(id) NOT NULL,
     term_id UUID REFERENCES terms(id) NOT NULL,
     cognitive_knowledge INTEGER CHECK (cognitive_knowledge BETWEEN 1 AND 5),
     cognitive_comprehension INTEGER CHECK (cognitive_comprehension BETWEEN 1 AND 5),
     cognitive_application INTEGER CHECK (cognitive_application BETWEEN 1 AND 5),
     cognitive_analysis INTEGER CHECK (cognitive_analysis BETWEEN 1 AND 5),
     cognitive_synthesis INTEGER CHECK (cognitive_synthesis BETWEEN 1 AND 5),
     cognitive_evaluation INTEGER CHECK (cognitive_evaluation BETWEEN 1 AND 5),
     affective_punctuality INTEGER CHECK (affective_punctuality BETWEEN 1 AND 5),
     affective_attitude INTEGER CHECK (affective_attitude BETWEEN 1 AND 5),
     affective_participation INTEGER CHECK (affective_participation BETWEEN 1 AND 5),
     affective_teamwork INTEGER CHECK (affective_teamwork BETWEEN 1 AND 5),
     affective_leadership INTEGER CHECK (affective_leadership BETWEEN 1 AND 5),
     affective_attentiveness INTEGER CHECK (affective_attentiveness BETWEEN 1 AND 5),
     psychomotor_handwriting INTEGER CHECK (psychomotor_handwriting BETWEEN 1 AND 5),
     psychomotor_verbal_fluency INTEGER CHECK (psychomotor_verbal_fluency BETWEEN 1 AND 5),
     psychomotor_sports INTEGER CHECK (psychomotor_sports BETWEEN 1 AND 5),
     psychomotor_creative_arts INTEGER CHECK (psychomotor_creative_arts BETWEEN 1 AND 5),
     psychomotor_practical_skills INTEGER CHECK (psychomotor_practical_skills BETWEEN 1 AND 5),
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(student_id, term_id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_report_remarks_student ON report_remarks(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_report_remarks_term ON report_remarks(term_id)`,
  `CREATE INDEX IF NOT EXISTS idx_domain_grades_student ON domain_grades(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_domain_grades_term ON domain_grades(term_id)`,
];

(async () => {
  for (const sql of steps) {
    await pool.query(sql);
    console.log(`OK: ${sql.split('\n')[0].slice(0, 90)}${sql.length > 90 ? '...' : ''}`);
  }

  const check = async (t) => {
    const r = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`,
      [t]
    );
    return r.rows.length ? `${t} (${r.rows.length}): ${r.rows.map(c => c.column_name).join(', ')}` : `${t}: MISSING`;
  };
  console.log('\n=== VERIFY ===');
  for (const t of ['sessions', 'quizzes', 'quiz_questions', 'report_remarks', 'domain_grades']) {
    console.log(await check(t));
  }
  await pool.end();
  console.log('\nMigration complete.');
})().catch((e) => { console.error(e); process.exit(1); });