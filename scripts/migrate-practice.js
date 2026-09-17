require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

const statements = [
  // ---- practice_sessions: align to canonical app design ----
  `ALTER TABLE practice_sessions DROP COLUMN IF EXISTS subject;`,
  `ALTER TABLE practice_sessions DROP COLUMN IF EXISTS topic;`,
  `ALTER TABLE practice_sessions RENAME COLUMN started_at TO created_at;`,
  `ALTER TABLE practice_sessions RENAME COLUMN ended_at TO completed_at;`,
  `ALTER TABLE practice_sessions RENAME COLUMN questions_attempted TO answered_questions;`,
  `ALTER TABLE practice_sessions RENAME COLUMN performance_percentage TO score;`,
  `ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id);`,
  `ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS "date" DATE;`,
  `ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS goal_type TEXT;`,
  `ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;`,
  `ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';`,

  // ---- practice_attempts: rename + add canonical columns ----
  `ALTER TABLE practice_attempts RENAME COLUMN practice_session_id TO session_id;`,
  `ALTER TABLE practice_attempts RENAME COLUMN time_taken_seconds TO time_taken;`,
  `ALTER TABLE practice_attempts RENAME COLUMN attempted_at TO created_at;`,
  `ALTER TABLE practice_attempts DROP COLUMN IF EXISTS points_awarded;`,
  `ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES profiles(id);`,
  `ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS question_source TEXT;`,
  `ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS source_id UUID;`,
  `ALTER TABLE practice_attempts ALTER COLUMN question_text DROP NOT NULL;`,
  `ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';`,
  `ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS options TEXT[];`,
  `ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS correct_answer INTEGER;`,
  `ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS difficulty TEXT;`,
  `ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS topic TEXT;`,
  `ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS subtopic TEXT;`,
  `ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS explanation TEXT;`,

  // ---- daily_goals: canonical columns ----
  `ALTER TABLE daily_goals RENAME COLUMN goal_date TO "date";`,
  `ALTER TABLE daily_goals DROP COLUMN IF EXISTS target_minutes;`,
  `ALTER TABLE daily_goals DROP COLUMN IF EXISTS completed_minutes;`,
  `ALTER TABLE daily_goals DROP COLUMN IF EXISTS achieved;`,
  `ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS target_score INTEGER DEFAULT 70;`,
  `ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS achieved_score INTEGER;`,
  `ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';`,

  // ---- learning_streaks: canonical columns ----
  `ALTER TABLE learning_streaks RENAME COLUMN streak_days TO current_streak;`,
  `ALTER TABLE learning_streaks RENAME COLUMN last_active_date TO last_activity_date;`,
  `ALTER TABLE learning_streaks ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;`,
  `ALTER TABLE learning_streaks ADD COLUMN IF NOT EXISTS streak_type TEXT DEFAULT 'practice';`,

  // ---- badges: canonical student-badge columns ----
  `ALTER TABLE badges DROP COLUMN IF EXISTS name;`,
  `ALTER TABLE badges DROP COLUMN IF EXISTS description;`,
  `ALTER TABLE badges DROP COLUMN IF EXISTS icon;`,
  `ALTER TABLE badges DROP COLUMN IF EXISTS criteria;`,
  `ALTER TABLE badges ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES profiles(id);`,
  `ALTER TABLE badges ADD COLUMN IF NOT EXISTS badge_type TEXT;`,
  `ALTER TABLE badges ADD COLUMN IF NOT EXISTS badge_data JSONB;`,
  `ALTER TABLE badges ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMP DEFAULT NOW();`,

  // ---- review_schedule: canonical columns ----
  `ALTER TABLE review_schedule RENAME COLUMN review_date TO next_review_date;`,
  `ALTER TABLE review_schedule DROP COLUMN IF EXISTS completed;`,
  `ALTER TABLE review_schedule DROP COLUMN IF EXISTS subject;`,
  `ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id);`,
  `ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS subtopic TEXT;`,
  `ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 1;`,
  `ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP;`,
  `ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`,

  // ---- unique constraints required by upserts ----
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_review_schedule_student_topic ON review_schedule(student_id, subject_id, topic, subtopic);`,
];

(async () => {
  try {
    for (const sql of statements) {
      try {
        await pool.query(sql);
        console.log('[OK]', sql.slice(0, 90));
      } catch (e) {
        console.log('[WARN]', sql.slice(0, 90), '->', e.message);
      }
    }

    // daily_goals + badges + learning_streaks unique constraints (guarded: duplicates may exist)
    for (const [name, sql] of [
      ['uq_daily_goals_student_date', `CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_goals_student_date ON daily_goals(student_id, "date");`],
      ['uq_streaks_student', `CREATE UNIQUE INDEX IF NOT EXISTS uq_streaks_student ON learning_streaks(student_id);`],
      ['uq_badges_student_type', `CREATE UNIQUE INDEX IF NOT EXISTS uq_badges_student_type ON badges(student_id, badge_type);`],
    ]) {
      try {
        await pool.query(sql);
        console.log('[OK]', name);
      } catch (e) {
        console.log('[WARN]', name, '->', e.message);
      }
    }

    const tables = ['practice_sessions', 'practice_attempts', 'daily_goals', 'learning_streaks', 'badges', 'review_schedule'];
    for (const t of tables) {
      const cols = await pool.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
        [t]
      );
      console.log(`\n=== ${t} ===`);
      for (const c of cols.rows) console.log(`  ${c.column_name}  ${c.data_type}`);
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();