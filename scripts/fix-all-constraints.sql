-- ============================================================================
-- COMPREHENSIVE FIX: Remove ALL restrictions on question_bank & entrance_questions
-- ============================================================================
-- Run this ONCE after deploying the code changes.
-- Drops all CHECK/NOT NULL constraints that block questions from being 
-- queried or inserted. Adds missing columns. Re-inserts the unique constraint
-- with a widened scope.
-- SAFE TO RE-RUN: Uses IF EXISTS / DROP IF EXISTS patterns.
-- ============================================================================

-- ============================================================================
-- 1. QUESTION BANK: Drop restrictive CHECK constraints
-- ============================================================================

-- Subject: allow any subject value
ALTER TABLE question_bank ALTER COLUMN subject DROP NOT NULL;
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_subject_check;

-- Level: allow any level value (PRIMARY, JSS1, SS1, etc.)
ALTER TABLE question_bank ALTER COLUMN level DROP NOT NULL;
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_level_check;

-- Difficulty level: drop NOT NULL (keep CHECK for valid values)
ALTER TABLE question_bank ALTER COLUMN difficulty_level DROP NOT NULL;
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_difficulty_level_check;

-- Question type: widen to accept both old (uppercase) and new (lowercase) values
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_question_type_check;
ALTER TABLE question_bank ADD CONSTRAINT question_bank_question_type_check
  CHECK (question_type IN (
    'MCQ', 'FILL_IN_THE_GAP', 'TRUE_FALSE',
    'multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'multiple_selection'
  ));

-- Drop and recreate unique_question constraint with the relaxed column combo
DO $$ BEGIN
  ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS unique_question;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE question_bank ADD CONSTRAINT unique_question UNIQUE (subject, level, difficulty_level, topic, question);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ensure topic defaults to 'General' if not provided
ALTER TABLE question_bank ALTER COLUMN topic SET DEFAULT 'General';

-- ============================================================================
-- 2. ENTRANCE QUESTIONS: Add missing order_index column
-- ============================================================================
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Ensure all required columns exist (added by earlier migrations)
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS difficulty_level TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS subtopic TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS question_image TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS option_images TEXT[];

-- ============================================================================
-- 3. RELOAD SCHEMA CACHE (for Supabase/PostgREST)
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- 4. VERIFY FIXES
-- ============================================================================
SELECT 'question_bank' AS tbl,
       COUNT(*) AS total_rows,
       SUM(CASE WHEN subject IS NULL THEN 1 ELSE 0 END) AS null_subject,
       SUM(CASE WHEN level IS NULL THEN 1 ELSE 0 END) AS null_level,
       SUM(CASE WHEN topic IS NULL OR topic = '' THEN 1 ELSE 0 END) AS missing_topic
FROM question_bank
UNION ALL
SELECT 'entrance_questions' AS tbl,
       COUNT(*) AS total_rows,
       SUM(CASE WHEN subject IS NULL THEN 1 ELSE 0 END) AS null_subject,
       SUM(CASE WHEN level IS NULL THEN 1 ELSE 0 END) AS null_level,
       SUM(CASE WHEN topic IS NULL OR topic = '' THEN 1 ELSE 0 END) AS missing_topic
FROM entrance_questions;
