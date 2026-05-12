-- =============================================================
-- MIGRATION: Phase 2 - Standalone Question Bank
-- Run this after MIGRATION_PHASE1_SCHEME_OF_WORK.sql
-- =============================================================

-- 1. QUESTION BANK TABLE
CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  subtopic TEXT DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'multiple_selection')),
  question TEXT NOT NULL,
  question_image TEXT,
  options TEXT[] NOT NULL DEFAULT '{}',
  option_images TEXT[] DEFAULT '{}',
  correct_answer INTEGER NOT NULL,
  points INTEGER DEFAULT 1,
  explanation TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_question_bank_subject ON question_bank(subject_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_class ON question_bank(class_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_term ON question_bank(term_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_topic ON question_bank(topic);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_bank_status ON question_bank(status);
CREATE INDEX IF NOT EXISTS idx_question_bank_created_by ON question_bank(created_by);
CREATE INDEX IF NOT EXISTS idx_question_bank_tags ON question_bank USING GIN(tags);

-- 3. RLS
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

-- Teachers can view all published questions + their own drafts
CREATE POLICY "Teachers and admins can view question bank"
  ON question_bank FOR SELECT USING (
    status = 'published'
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Teachers can insert their own questions
CREATE POLICY "Teachers and admins can insert questions"
  ON question_bank FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- Teachers can update their own questions, admins can update any
CREATE POLICY "Users can update own questions"
  ON question_bank FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Teachers can delete their own draft questions, admins can delete any
CREATE POLICY "Users can delete own draft questions"
  ON question_bank FOR DELETE USING (
    (created_by = auth.uid() AND status = 'draft')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

SELECT 'Phase 2 migration completed successfully!' as status;
