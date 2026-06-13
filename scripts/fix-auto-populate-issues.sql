-- ============================================================================
-- FIX: Auto-populate issues — run in Supabase SQL Editor
-- ============================================================================

-- 1. Relax question_bank CHECK constraints so wider subjects & levels work
ALTER TABLE question_bank ALTER COLUMN subject DROP NOT NULL;
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_subject_check;

ALTER TABLE question_bank ALTER COLUMN level DROP NOT NULL;
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_level_check;

ALTER TABLE question_bank ALTER COLUMN difficulty_level DROP NOT NULL;
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_difficulty_level_check;

ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_question_type_check;
ALTER TABLE question_bank ADD CONSTRAINT question_bank_question_type_check
  CHECK (question_type IN (
    'MCQ', 'FILL_IN_THE_GAP', 'TRUE_FALSE',
    'multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'multiple_selection'
  ));

-- 2. Add total_questions column to tests table so the target count is persisted
ALTER TABLE tests ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 10;

-- 3. Refresh schema
NOTIFY pgrst, 'reload schema';
