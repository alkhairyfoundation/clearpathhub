-- ============================================================================
-- CCR (ClearPath Child Review) - Questionnaire Responses Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ccr_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL,
  term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  respondent_type TEXT NOT NULL CHECK (respondent_type IN ('student', 'father', 'mother', 'teacher', 'subject_teacher')),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, academic_session_id, term_id, respondent_type)
);

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_ccr_responses_student_id ON ccr_responses(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_ccr_responses_respondent_type ON ccr_responses(respondent_type); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_ccr_responses_is_submitted ON ccr_responses(is_submitted); EXCEPTION WHEN undefined_column THEN NULL; END $$;
