-- fix-all-schema-issues.sql
-- Run this in Supabase SQL Editor, then refresh schema cache (SQL Editor > Refresh Schema)

-- ============================================================
-- 1. HOMEWORK: add missing columns & disable RLS
-- ============================================================
ALTER TABLE homework ADD COLUMN IF NOT EXISTS homework_type TEXT DEFAULT 'assignment';
ALTER TABLE homework ADD COLUMN IF NOT EXISTS attachments TEXT[];
ALTER TABLE homework ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE homework DISABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. EXAM ACTIVITY LOGS: fix FK from quiz_attempts -> test_attempts
--    (the code passes test_attempts.id, not quiz_attempts.id)
-- ============================================================
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT con.conname INTO fk_name
  FROM pg_constraint con
  JOIN pg_class cls ON con.conrelid = cls.oid
  WHERE cls.relname = 'exam_activity_logs'
    AND con.contype = 'f'
    AND con.confrelid = (SELECT oid FROM pg_class WHERE relname = 'quiz_attempts')
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE exam_activity_logs DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE exam_activity_logs ADD CONSTRAINT fk_exam_activity_logs_attempt_id
  FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE;

-- ============================================================
-- 3. Ensure RLS is disabled on ALL exam/test/quiz/practice tables
--    (app uses NextAuth, not Supabase Auth)
-- ============================================================
ALTER TABLE IF EXISTS tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS test_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS test_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS practice_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS entrance_exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS entrance_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS entrance_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS entrance_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS entrance_security_events DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Refresh PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
