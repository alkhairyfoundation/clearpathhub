-- ============================================================================
-- COMPREHENSIVE FIX: All exam/test/quiz database issues
-- Run this in your Supabase SQL editor.
-- ============================================================================

-- ============================================================================
-- PART 1: Create missing test-related tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  created_by UUID REFERENCES profiles(id),
  test_type TEXT DEFAULT 'class_test' CHECK (test_type IN ('class_test', 'weekly', 'monthly', 'term', 'practice')),
  exam_date DATE,
  duration_minutes INTEGER DEFAULT 30,
  total_marks INTEGER DEFAULT 100,
  passing_score INTEGER DEFAULT 50,
  is_published BOOLEAN DEFAULT false,
  allow_image BOOLEAN DEFAULT false,
  shuffle_questions BOOLEAN DEFAULT false,
  shuffle_options BOOLEAN DEFAULT false,
  require_fullscreen BOOLEAN DEFAULT false,
  prevent_tab_switch BOOLEAN DEFAULT false,
  max_tab_switches INTEGER DEFAULT 3,
  allow_camera BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_image TEXT,
  options TEXT[] NOT NULL,
  option_images TEXT[],
  correct_answer INTEGER NOT NULL,
  points INTEGER DEFAULT 1,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'multiple_selection')),
  subject TEXT,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  time_taken INTEGER,
  tab_switches INTEGER DEFAULT 0,
  fullscreen_exits INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT
);

-- ============================================================================
-- PART 2: Disable RLS on entrance tables for anonymous public access
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view entrance exams" ON entrance_exams;
DROP POLICY IF EXISTS "Admins can manage entrance exams" ON entrance_exams;
DROP POLICY IF EXISTS "Anyone can view entrance questions" ON entrance_questions;
DROP POLICY IF EXISTS "Admins can manage entrance questions" ON entrance_questions;
DROP POLICY IF EXISTS "Entrance codes viewable by all" ON entrance_codes;
DROP POLICY IF EXISTS "Admins can manage entrance codes" ON entrance_codes;
DROP POLICY IF EXISTS "Users can view own application" ON entrance_applications;
DROP POLICY IF EXISTS "Users can insert own application" ON entrance_applications;
DROP POLICY IF EXISTS "Admins can manage applications" ON entrance_applications;
DROP POLICY IF EXISTS "Anyone can insert applications" ON entrance_applications;
DROP POLICY IF EXISTS "Anyone can update applications" ON entrance_applications;
DROP POLICY IF EXISTS "Anyone can view applications" ON entrance_applications;
DROP POLICY IF EXISTS "Students can view own analytics" ON student_analytics;
DROP POLICY IF EXISTS "Teachers can view student analytics" ON student_analytics;

ALTER TABLE entrance_exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_analytics DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: Disable RLS on test/quiz/ practice tables for authenticated use
-- (RLS with NextAuth+Supabase dual auth causes silent failures)
-- ============================================================================

ALTER TABLE tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE practice_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank DISABLE ROW LEVEL SECURITY;
ALTER TABLE results DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: Create atomic code increment function
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_code_usage(p_code_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE entrance_codes SET used_count = used_count + 1 WHERE id = p_code_id;
END;
$$;

-- ============================================================================
-- PART 5: Verify the fix
-- ============================================================================

SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('profiles','entrance_exams','entrance_questions','entrance_codes','entrance_applications','student_analytics','tests','test_questions','test_attempts','quizzes','quiz_questions','quiz_attempts','practice_sessions','practice_attempts','question_bank','results');
