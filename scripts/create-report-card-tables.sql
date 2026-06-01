-- ============================================================================
-- REPORT CARD SYSTEM TABLES
-- Run this in Supabase SQL Editor after fix-missing-columns.sql
-- ============================================================================

-- 1. Report Card Remarks — teacher & principal comments per student per term
CREATE TABLE IF NOT EXISTS report_remarks (
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
);

-- 2. Domain Grading — cognitive, affective, psychomotor scores per student per term
CREATE TABLE IF NOT EXISTS domain_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) NOT NULL,
  term_id UUID REFERENCES terms(id) NOT NULL,

  -- Cognitive Domain (ratings 1-5)
  cognitive_knowledge INTEGER CHECK (cognitive_knowledge BETWEEN 1 AND 5),
  cognitive_comprehension INTEGER CHECK (cognitive_comprehension BETWEEN 1 AND 5),
  cognitive_application INTEGER CHECK (cognitive_application BETWEEN 1 AND 5),
  cognitive_analysis INTEGER CHECK (cognitive_analysis BETWEEN 1 AND 5),
  cognitive_synthesis INTEGER CHECK (cognitive_synthesis BETWEEN 1 AND 5),
  cognitive_evaluation INTEGER CHECK (cognitive_evaluation BETWEEN 1 AND 5),

  -- Affective Domain (ratings 1-5)
  affective_punctuality INTEGER CHECK (affective_punctuality BETWEEN 1 AND 5),
  affective_attitude INTEGER CHECK (affective_attitude BETWEEN 1 AND 5),
  affective_participation INTEGER CHECK (affective_participation BETWEEN 1 AND 5),
  affective_teamwork INTEGER CHECK (affective_teamwork BETWEEN 1 AND 5),
  affective_leadership INTEGER CHECK (affective_leadership BETWEEN 1 AND 5),
  affective_attentiveness INTEGER CHECK (affective_attentiveness BETWEEN 1 AND 5),

  -- Psychomotor Domain (ratings 1-5)
  psychomotor_handwriting INTEGER CHECK (psychomotor_handwriting BETWEEN 1 AND 5),
  psychomotor_verbal_fluency INTEGER CHECK (psychomotor_verbal_fluency BETWEEN 1 AND 5),
  psychomotor_sports INTEGER CHECK (psychomotor_sports BETWEEN 1 AND 5),
  psychomotor_creative_arts INTEGER CHECK (psychomotor_creative_arts BETWEEN 1 AND 5),
  psychomotor_practical_skills INTEGER CHECK (psychomotor_practical_skills BETWEEN 1 AND 5),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, term_id)
);

-- 3. Enable RLS and add policies (will be disabled by disable-all-rls.sql)
ALTER TABLE report_remarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_grades ENABLE ROW LEVEL SECURITY;

-- Note: After running disable-all-rls.sql, RLS is already off for all tables.
-- If you run this before that script, add policies:
-- GRANT ALL ON report_remarks TO authenticated;
-- GRANT ALL ON domain_grades TO authenticated;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_remarks_student ON report_remarks(student_id);
CREATE INDEX IF NOT EXISTS idx_report_remarks_term ON report_remarks(term_id);
CREATE INDEX IF NOT EXISTS idx_domain_grades_student ON domain_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_domain_grades_term ON domain_grades(term_id);
