-- Fix question_bank constraints that block inserts from admin/teacher pages.
-- The table has NOT NULL + CHECK constraints on old columns (subject, level, difficulty_level, question_type)
-- but new columns (subject_id, class_id, difficulty, status) were added by migrations.
-- App code now uses the new columns, so relax the old constraints.

ALTER TABLE question_bank ALTER COLUMN subject DROP NOT NULL;
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_subject_check;

ALTER TABLE question_bank ALTER COLUMN level DROP NOT NULL;
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_level_check;

ALTER TABLE question_bank ALTER COLUMN difficulty_level DROP NOT NULL;
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_difficulty_level_check;

-- Allow both uppercase (old) and lowercase (new) question_type values
ALTER TABLE question_bank DROP CONSTRAINT IF EXISTS question_bank_question_type_check;
ALTER TABLE question_bank ADD CONSTRAINT question_bank_question_type_check
  CHECK (question_type IN (
    'MCQ', 'FILL_IN_THE_GAP', 'TRUE_FALSE',
    'multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'multiple_selection'
  ));
