-- ============================================================================
-- FIX: Add topic/subtopic/difficulty_level columns to test_questions
-- Also backfill topics from question_bank where possible
-- ============================================================================

-- 1. Add missing columns to test_questions
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS subtopic TEXT;
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS difficulty_level TEXT;

-- 2. Add a difficulty_level check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'test_questions' AND constraint_name = 'test_questions_difficulty_level_check'
  ) THEN
    ALTER TABLE test_questions ADD CONSTRAINT test_questions_difficulty_level_check
      CHECK (difficulty_level IN ('EASY', 'MEDIUM', 'HARD', 'VERY_HARD'));
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3. Backfill subject for test_questions where NULL, using the test's subject
UPDATE test_questions tq
SET subject = UPPER(s.name)
FROM tests t
JOIN subjects s ON t.subject_id = s.id
WHERE tq.test_id = t.id AND (tq.subject IS NULL OR tq.subject = '');

-- 4. Backfill topic from question_bank where test_questions match by question text
UPDATE test_questions tq
SET topic = qb.topic,
    subtopic = qb.subtopic,
    difficulty_level = qb.difficulty_level
FROM question_bank qb
WHERE tq.topic IS NULL
  AND qb.question = tq.question
  AND qb.subject = tq.subject;

-- 5. For remaining questions with no topic, set to 'General'
UPDATE test_questions SET topic = 'General' WHERE topic IS NULL OR topic = '';

-- 6. Verify
SELECT COUNT(*) AS total_questions,
       COUNT(*) FILTER (WHERE subject IS NOT NULL AND subject != '') AS with_subject,
       COUNT(*) FILTER (WHERE topic IS NOT NULL AND topic != '') AS with_topic,
       COUNT(*) FILTER (WHERE difficulty_level IS NOT NULL) AS with_difficulty
FROM test_questions;
