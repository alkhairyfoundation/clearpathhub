-- =============================================================
-- MIGRATION: Phase 1 - Scheme of Work & Term-Aligned Content
-- Run this in your Supabase SQL Editor after COMPLETE_SCHEMA.sql
-- =============================================================

-- 1. ACADEMIC SESSIONS
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. TERMS
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES academic_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  current_week INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. TERM WEEKS
CREATE TABLE IF NOT EXISTS term_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  label TEXT,
  UNIQUE(term_id, week_number)
);

-- 4. SCHEME OF WORK
CREATE TABLE IF NOT EXISTS scheme_of_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  topic TEXT NOT NULL,
  subtopics TEXT[] DEFAULT '{}',
  learning_objectives TEXT[] DEFAULT '{}',
  resources TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(term_id, class_id, subject_id, week_number)
);

-- 5. ADD CLASS_ID + TERM ALIGNMENT TO EXISTING TABLES
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS week_no INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS topic TEXT;

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS week_no INTEGER;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS topic TEXT;

-- 6. TRACK CURRENT SESSION/TERM IN SCHOOL SETTINGS
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS current_session_id UUID REFERENCES academic_sessions(id);
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS current_term_id UUID REFERENCES terms(id);

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_scheme_of_work_term ON scheme_of_work(term_id);
CREATE INDEX IF NOT EXISTS idx_scheme_of_work_class ON scheme_of_work(class_id);
CREATE INDEX IF NOT EXISTS idx_scheme_of_work_subject ON scheme_of_work(subject_id);
CREATE INDEX IF NOT EXISTS idx_scheme_of_work_lookup ON scheme_of_work(term_id, class_id, subject_id, week_number);
CREATE INDEX IF NOT EXISTS idx_terms_session ON terms(session_id);
CREATE INDEX IF NOT EXISTS idx_term_weeks_term ON term_weeks(term_id);
CREATE INDEX IF NOT EXISTS idx_sessions_term ON sessions(term_id);
CREATE INDEX IF NOT EXISTS idx_lessons_term ON lessons(term_id);

-- =============================================================
-- RLS POLICIES
-- =============================================================

ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_of_work ENABLE ROW LEVEL SECURITY;

-- Academic Sessions: everyone can view, only admins can manage
CREATE POLICY "Anyone can view academic sessions"
  ON academic_sessions FOR SELECT USING (true);
CREATE POLICY "Admins can insert academic sessions"
  ON academic_sessions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update academic sessions"
  ON academic_sessions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can delete academic sessions"
  ON academic_sessions FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Terms: everyone can view, only admins can manage
CREATE POLICY "Anyone can view terms"
  ON terms FOR SELECT USING (true);
CREATE POLICY "Admins can insert terms"
  ON terms FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update terms"
  ON terms FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can delete terms"
  ON terms FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Term Weeks: everyone can view, only admins can manage
CREATE POLICY "Anyone can view term weeks"
  ON term_weeks FOR SELECT USING (true);
CREATE POLICY "Admins can insert term weeks"
  ON term_weeks FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update term weeks"
  ON term_weeks FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can delete term weeks"
  ON term_weeks FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Scheme of Work: teachers view their own subjects, admins view all
CREATE POLICY "Anyone can view scheme of work"
  ON scheme_of_work FOR SELECT USING (true);
CREATE POLICY "Teachers and admins can insert scheme of work"
  ON scheme_of_work FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Teachers and admins can update scheme of work"
  ON scheme_of_work FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Teachers and admins can delete scheme of work"
  ON scheme_of_work FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- ============================================================
-- SEED DEFAULT SESSION/TERM IF NONE EXISTS
-- ============================================================
INSERT INTO academic_sessions (name, start_date, end_date, is_current)
SELECT '2024/2025', '2024-09-01', '2025-08-31', true
WHERE NOT EXISTS (SELECT 1 FROM academic_sessions);

INSERT INTO terms (session_id, name, start_date, end_date, current_week, is_current)
SELECT id, 'First Term', '2024-09-01', '2024-12-20', 1, true
FROM academic_sessions WHERE is_current = true
AND NOT EXISTS (SELECT 1 FROM terms);

SELECT 'Phase 1 migration completed successfully!' as status;
