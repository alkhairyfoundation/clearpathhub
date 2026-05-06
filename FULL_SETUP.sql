-- ClearPath Edu Hub - Complete Setup SQL
-- Run all of this in your Supabase SQL Editor

-- ===== EXISTING TABLES =====

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'accountant')),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- SCHOOL SETTINGS
CREATE TABLE IF NOT EXISTS school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL DEFAULT 'ClearPath Edu Hub',
  school_motto TEXT,
  school_address TEXT,
  school_phone TEXT,
  school_email TEXT,
  school_logo TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#1e293b',
  accent_color TEXT DEFAULT '#10b981',
  academic_year TEXT,
  term TEXT DEFAULT 'First Term',
  session_start DATE,
  session_end DATE
);

-- DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  head_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- CLASSES
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 12),
  department_id UUID REFERENCES departments(id),
  class_teacher_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  teacher_id UUID REFERENCES profiles(id),
  class_id UUID REFERENCES classes(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  admission_number TEXT UNIQUE NOT NULL,
  class_id UUID REFERENCES classes(id),
  parent_id UUID REFERENCES profiles(id),
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  blood_group TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- STAFF
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  staff_id TEXT UNIQUE NOT NULL,
  department_id UUID REFERENCES departments(id),
  designation TEXT,
  salary NUMERIC(10,2),
  date_of_employment DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- SESSIONS (Video Lessons) - Now with checkpoint support
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id),
  teacher_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_type TEXT DEFAULT 'youtube' CHECK (video_type IN ('youtube', 'upload')),
  duration INTEGER DEFAULT 30,
  is_published BOOLEAN DEFAULT false,
  has_checkpoint BOOLEAN DEFAULT false,
  checkpoint_timestamp INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- QUIZZES
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 50,
  time_limit INTEGER DEFAULT 30,
  is_checkpoint BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- QUIZ QUESTIONS - Now with timestamp for video checkpoints
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_image TEXT,
  options TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
  points INTEGER DEFAULT 1,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank')),
  timestamp_seconds INTEGER DEFAULT 0,
  is_checkpoint BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers INTEGER[],
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- LESSONS (Notes)
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id),
  teacher_id UUID REFERENCES profiles(id),
  session_id UUID REFERENCES sessions(id),
  title TEXT NOT NULL,
  content TEXT,
  attachments TEXT[],
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- HOMEWORK
CREATE TABLE IF NOT EXISTS homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  teacher_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  total_marks INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW()
);

-- HOMEWORK SUBMISSIONS
CREATE TABLE IF NOT EXISTS homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  submission_url TEXT,
  marks INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMP,
  graded_at TIMESTAMP
);

-- ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  class_id UUID REFERENCES classes(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by UUID REFERENCES profiles(id),
  marked_at TIMESTAMP,
  scan_method TEXT CHECK (scan_method IN ('manual', 'qr_scan')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- STAFF ATTENDANCE
CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES profiles(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  marked_by UUID REFERENCES profiles(id),
  marked_at TIMESTAMP,
  qr_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

-- RESULTS
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  subject_id UUID REFERENCES subjects(id),
  exam_type TEXT NOT NULL CHECK (exam_type IN ('ca1', 'ca2', 'ca3', 'exam')),
  score NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  grade TEXT,
  remarks TEXT,
  entered_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- BEHAVIORAL REPORTS
CREATE TABLE IF NOT EXISTS behavioral_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  punctuality INTEGER NOT NULL CHECK (punctuality BETWEEN 1 AND 5),
  class_participation INTEGER NOT NULL CHECK (class_participation BETWEEN 1 AND 5),
  homework_completion INTEGER NOT NULL CHECK (homework_completion BETWEEN 1 AND 5),
  behavior TEXT,
  teacher_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('all', 'students', 'teachers', 'parents', 'staff')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  attachments TEXT[],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  payment_method TEXT,
  reference_number TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  invoice_number TEXT UNIQUE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- RECEIPTS
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  receipt_number TEXT UNIQUE NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ID CARDS
CREATE TABLE IF NOT EXISTS id_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  card_number TEXT UNIQUE NOT NULL,
  qr_code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- ===== ENTRANCE EXAM TABLES =====

CREATE TABLE IF NOT EXISTS entrance_exams (
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

CREATE TABLE IF NOT EXISTS entrance_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES entrance_exams(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_image TEXT,
  options TEXT[] NOT NULL,
  option_images TEXT[],
  correct_answer INTEGER NOT NULL,
  points INTEGER DEFAULT 1,
  question_type TEXT DEFAULT 'multiple_choice',
  subject TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entrance_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES entrance_exams(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  max_uses INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entrance_applications (
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
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== CLASS TESTS =====

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
  allow_image BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_image TEXT,
  options TEXT[],
  option_images TEXT[],
  correct_answer INTEGER NOT NULL,
  points INTEGER DEFAULT 1,
  question_type TEXT DEFAULT 'multiple_choice',
  subject TEXT,
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
  completed_at TIMESTAMP
);

-- ===== TEACHER EVALUATION =====

CREATE TABLE IF NOT EXISTS teacher_tasks (
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

CREATE TABLE IF NOT EXISTS teacher_evaluations (
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

-- ===== PERFORMANCE =====

CREATE TABLE IF NOT EXISTS student_performance (
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

CREATE TABLE IF NOT EXISTS class_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id),
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  average_score NUMERIC(5,2),
  top_scorer TEXT,
  pass_rate NUMERIC(5,2),
  total_students INTEGER
);

-- ===== INDEXES =====

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_entrance_codes_code ON entrance_codes(code);
CREATE INDEX IF NOT EXISTS idx_tests_class ON tests(class_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_student ON test_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_tasks_teacher ON teacher_tasks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_timestamp ON quiz_questions(timestamp_seconds) WHERE is_checkpoint = true;

-- ===== ROW LEVEL SECURITY =====

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Anyone can view published sessions" ON sessions FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can view published lessons" ON lessons FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can view published quizzes" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Anyone can view published tests" ON tests FOR SELECT USING (is_published = true);

-- ===== SEED DATA =====

INSERT INTO school_settings (school_name, primary_color, secondary_color, accent_color, academic_year, term)
VALUES ('ClearPath Edu Hub', '#2563eb', '#1e293b', '#10b981', '2024-2025', 'First Term')
ON CONFLICT DO NOTHING;

-- Default admin user (create via Supabase Auth dashboard or use auth API)
-- INSERT INTO profiles (email, first_name, last_name, role)
-- VALUES ('admin@clearpatheduhub.com', 'Admin', 'User', 'admin')
-- ON CONFLICT DO NOTHING;

-- ===== COMPLETE =====