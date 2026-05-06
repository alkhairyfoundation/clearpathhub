-- ClearPath Edu Hub - Enhanced Database Schema
-- Run this in your Supabase SQL Editor

-- ===== ENTRANCE EXAM TABLES =====

-- Entrance Exams
CREATE TABLE entrance_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL CHECK (level IN ('PRIMARY', 'JSS', 'SS1', 'SS2', 'SS3')),
  academic_year TEXT NOT NULL,
  exam_date DATE,
  duration_minutes INTEGER DEFAULT 60,
  passing_score INTEGER DEFAULT 50,
  total_questions INTEGER DEFAULT 10,
  is_published BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Entrance Questions (with image support)
CREATE TABLE entrance_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES entrance_exams(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_image TEXT,
  options TEXT[] NOT NULL,
  option_images TEXT[],
  correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
  points INTEGER DEFAULT 1,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank')),
  subject TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Entrance Codes
CREATE TABLE entrance_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES entrance_exams(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  max_uses INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Entrance Applications
CREATE TABLE entrance_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES entrance_exams(id),
  code_id UUID REFERENCES entrance_codes(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  applied_class TEXT,
  previous_school TEXT,
  exam_score INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'reviewed')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== CLASS TESTS & EXAMS TABLE =====

-- Tests/Exams
CREATE TABLE tests (
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
  allow_image BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Test Questions (with image support)
CREATE TABLE test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_image TEXT,
  options TEXT[],
  option_images TEXT[],
  correct_answer INTEGER NOT NULL,
  points INTEGER DEFAULT 1,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'short_answer')),
  subject TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Test Attempts
CREATE TABLE test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- ===== TEACHER EVALUATION TABLE =====

-- Teacher Tasks
CREATE TABLE teacher_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id),
  task_type TEXT NOT NULL CHECK (task_type IN ('reading', 'study', 'project', 'research', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
  submission_url TEXT,
  grade INTEGER,
  admin_grade INTEGER,
  feedback TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Teacher Evaluations
CREATE TABLE teacher_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id),
  evaluation_type TEXT NOT NULL CHECK (evaluation_type IN ('task', 'observation', 'review')),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'evaluated')),
  submitted_at TIMESTAMP,
  score INTEGER,
  admin_notes TEXT,
  evaluated_by UUID REFERENCES profiles(id),
  evaluated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== PERFORMANCE ANALYTICS TABLES =====

-- Student Performance
CREATE TABLE student_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  subject_id UUID REFERENCES subjects(id),
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  average_score NUMERIC(5,2),
  class_rank INTEGER,
  total_students INTEGER,
  improvement TEXT CHECK (improvement IN ('improving', 'declining', 'stable')),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Class Performance
CREATE TABLE class_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id),
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  average_score NUMERIC(5,2),
  top_scorer TEXT,
  pass_rate NUMERIC(5,2),
  total_students INTEGER
);

-- Department Performance
CREATE TABLE department_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id),
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  average_score NUMERIC(5,2),
  top_class TEXT,
  total_students INTEGER
);

-- ===== INDEXES FOR PERFORMANCE =====

CREATE INDEX idx_entrance_exams_level ON entrance_exams(level);
CREATE INDEX idx_entrance_codes_code ON entrance_codes(code);
CREATE INDEX idx_entrance_applications_email ON entrance_applications(email);
CREATE INDEX idx_tests_class ON tests(class_id);
CREATE INDEX idx_tests_published ON tests(is_published);
CREATE INDEX idx_test_attempts_student ON test_attempts(student_id);
CREATE INDEX idx_teacher_tasks_teacher ON teacher_tasks(teacher_id);
CREATE INDEX idx_student_performance_student ON student_performance(student_id);
CREATE INDEX idx_class_performance_class ON class_performance(class_id);

-- ===== SEED DATA FOR ADMIN =====

-- Insert default admin (change password through auth)
INSERT INTO profiles (id, email, first_name, last_name, role)
VALUES (
  gen_random_uuid(),
  'admin@clearpatheduhub.com',
  'Admin',
  'User',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Insert default school settings
INSERT INTO school_settings (school_name, primary_color, secondary_color, accent_color, academic_year, term)
VALUES (
  'ClearPath Edu Hub',
  '#2563eb',
  '#1e293b', 
  '#10b981',
  '2024-2025',
  'First Term'
) ON CONFLICT DO NOTHING;