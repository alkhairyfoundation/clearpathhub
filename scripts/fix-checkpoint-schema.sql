-- Fix checkpoint schema: correct_answer JSONB, question_type constraint, RLS disabled
-- Run this in Supabase SQL Editor after backing up.

-- 1. Drop old CHECK constraint on correct_answer (BETWEEN 0 AND 3)
ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_correct_answer_check;

-- 2. Change correct_answer to JSONB to support multiple types:
--    - integer for multiple_choice / true_false (e.g. 0)
--    - array for multiple_selection (e.g. [0, 2])
--    - string for fill_blank / short_answer (e.g. "photosynthesis")
ALTER TABLE quiz_questions ALTER COLUMN correct_answer TYPE JSONB USING to_jsonb(correct_answer);

-- 3. Drop old question_type CHECK constraint and add updated one with short_answer
ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_question_type_check;
ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_question_type_check
  CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'multiple_selection', 'short_answer'));

-- 4. Disable RLS on tables used by client-side video lesson flow
ALTER TABLE quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;

-- 5. Ensure lessons.session_id has ON DELETE CASCADE
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'lessons' AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.column_name = 'session_id' AND ccu.table_name = 'sessions'
  ) THEN
    -- Drop and recreate with CASCADE
    EXECUTE (
      SELECT 'ALTER TABLE lessons DROP CONSTRAINT ' || tc.constraint_name::text || ', ADD CONSTRAINT lessons_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;'
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'lessons' AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.column_name = 'session_id' AND ccu.table_name = 'sessions'
      LIMIT 1
    );
  ELSE
    ALTER TABLE lessons ADD CONSTRAINT lessons_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
  END IF;
END $$;
