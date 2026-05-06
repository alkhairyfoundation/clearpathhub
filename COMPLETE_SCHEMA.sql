-- ============================================================================
-- ClearPath Edu Hub - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This file combines all SQL schemas for the ClearPath Edu Hub system
-- Run this entire file in your Supabase SQL Editor
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 1: CORE TABLES (Profiles, School Settings, Academic Structure)
-- ============================================================================

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

-- ============================================================================
-- PART 2: LEARNING MANAGEMENT TABLES
-- ============================================================================

-- SESSIONS (Video Lessons)
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
  created_at TIMESTAMP DEFAULT NOW()
);

-- QUIZ QUESTIONS
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_image TEXT,
  options TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
  points INTEGER DEFAULT 1,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank')),
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

-- ============================================================================
-- PART 3: ATTENDANCE & RESULTS
-- ============================================================================

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

-- ============================================================================
-- PART 4: FINANCIAL TABLES
-- ============================================================================

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

-- ============================================================================
-- PART 5: ENTRANCE EXAMS & ADMISSIONS
-- ============================================================================

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

-- ============================================================================
-- PART 6: TESTS & EXAMS
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

-- ============================================================================
-- PART 7: TEACHER EVALUATION & PERFORMANCE
-- ============================================================================

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

-- Performance Tables
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

-- ============================================================================
-- PART 8: PREDICTIVE ANALYTICS (NEW!)
-- ============================================================================

-- Student Risk Predictions
CREATE TABLE IF NOT EXISTS student_risk_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  prediction_date DATE NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score NUMERIC(3,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  contributing_factors JSONB,
  predicted_outcome TEXT,
  confidence_score NUMERIC(3,2),
  model_version TEXT,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Prediction Features
CREATE TABLE IF NOT EXISTS prediction_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID REFERENCES student_risk_predictions(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  feature_value NUMERIC,
  impact_score NUMERIC(3,2),
  feature_category TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Model Performance
CREATE TABLE IF NOT EXISTS model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  evaluation_date DATE NOT NULL,
  accuracy NUMERIC(3,2),
  precision_score NUMERIC(3,2),
  recall_score NUMERIC(3,2),
  f1_score NUMERIC(3,2),
  auc_roc NUMERIC(3,2),
  training_data_size INTEGER,
  feature_count INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Interventions
CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  prediction_id UUID REFERENCES student_risk_predictions(id),
  intervention_type TEXT NOT NULL,
  description TEXT,
  started_at DATE NOT NULL,
  ended_at DATE,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  effectiveness_score INTEGER,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 9: COMMUNICATION HUB (NEW!)
-- ============================================================================

-- Messages (Direct Communication)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Message Attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  in_app_notifications BOOLEAN DEFAULT true,
  announcement_emails BOOLEAN DEFAULT true,
  message_emails BOOLEAN DEFAULT true,
  attendance_alerts BOOLEAN DEFAULT true,
  grade_alerts BOOLEAN DEFAULT true,
  behavior_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('announcement', 'message', 'attendance', 'grade', 'behavior', 'system')),
  related_id UUID,
  related_type TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Communication Groups
CREATE TABLE IF NOT EXISTS communication_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL CHECK (group_type IN ('class', 'subject', 'team', 'club', 'custom')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Group Members
CREATE TABLE IF NOT EXISTS communication_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES communication_groups(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, profile_id)
);

-- Group Messages
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES communication_groups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachment_urls TEXT[],
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 10: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core Tables
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id);

-- Entrance Exams
CREATE INDEX IF NOT EXISTS idx_entrance_exams_level ON entrance_exams(level);
CREATE INDEX IF NOT EXISTS idx_entrance_codes_code ON entrance_codes(code);
CREATE INDEX IF NOT EXISTS idx_entrance_applications_email ON entrance_applications(email);

-- Tests
CREATE INDEX IF NOT EXISTS idx_tests_class ON tests(class_id);
CREATE INDEX IF NOT EXISTS idx_tests_published ON tests(is_published);
CREATE INDEX IF NOT EXISTS idx_test_attempts_student ON test_attempts(student_id);

-- Teacher
CREATE INDEX IF NOT EXISTS idx_teacher_tasks_teacher ON teacher_tasks(teacher_id);

-- Performance
CREATE INDEX IF NOT EXISTS idx_student_performance_student ON student_performance(student_id);
CREATE INDEX IF NOT EXISTS idx_class_performance_class ON class_performance(class_id);

-- Predictive Analytics
CREATE INDEX IF NOT EXISTS idx_student_risk_predictions_student ON student_risk_predictions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_risk_predictions_date ON student_risk_predictions(prediction_date);
CREATE INDEX IF NOT EXISTS idx_student_risk_predictions_risk_level ON student_risk_predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_prediction_features_prediction ON prediction_features(prediction_id);
CREATE INDEX IF NOT EXISTS idx_interventions_student ON interventions(student_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);

-- Communication
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_communication_groups ON communication_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members ON communication_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages ON group_messages(group_id);

-- ============================================================================
-- PART 11: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 12: RLS POLICIES FOR CORE TABLES
-- ============================================================================

-- Profiles
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Published Content
CREATE POLICY "Anyone can view published sessions" ON sessions FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can view published lessons" ON lessons FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can view published quizzes" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Anyone can view published tests" ON tests FOR SELECT USING (is_published = true);

-- Predictive Analytics Policies
CREATE POLICY "Users can view own risk predictions" ON student_risk_predictions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers and admins can view risk predictions" ON student_risk_predictions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'accountant'))
);
CREATE POLICY "Users can insert own risk predictions" ON student_risk_predictions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Admins can update risk predictions" ON student_risk_predictions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view own prediction features" ON prediction_features FOR SELECT USING (
  EXISTS (SELECT 1 FROM student_risk_predictions srp WHERE srp.id = prediction_id AND srp.student_id = auth.uid())
);
CREATE POLICY "Teachers and admins can view prediction features" ON prediction_features FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'accountant'))
);

CREATE POLICY "Admins can view model performance" ON model_performance FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view own interventions" ON interventions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers and admins can view interventions" ON interventions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'accountant'))
);
CREATE POLICY "Users can insert own interventions" ON interventions FOR INSERT WITH CHECK (
  auth.uid() = student_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'accountant'))
);
CREATE POLICY "Admins can update interventions" ON interventions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Communication Policies
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can view their messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can update their messages" ON messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Users can delete their messages" ON messages FOR DELETE USING (auth.uid() = sender_id);

CREATE POLICY "Users can view their notification preferences" ON notification_preferences FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can update their notification preferences" ON notification_preferences FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Users can mark notifications as read" ON notifications FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "Users can view groups they belong to" ON communication_groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM communication_group_members cgm WHERE cgm.group_id = id AND cgm.profile_id = auth.uid())
);
CREATE POLICY "Users can create groups" ON communication_groups FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view group memberships" ON communication_group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM communication_groups cg WHERE cg.id = group_id AND EXISTS (SELECT 1 FROM communication_group_members cgm2 WHERE cgm2.group_id = cg.id AND cgm2.profile_id = auth.uid()))
);
CREATE POLICY "Users can join groups" ON communication_group_members FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can send messages to groups they belong to" ON group_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM communication_group_members cgm WHERE cgm.group_id = group_id AND cgm.profile_id = auth.uid())
);
CREATE POLICY "Users can view group messages" ON group_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM communication_group_members cgm WHERE cgm.group_id = group_id AND cgm.profile_id = auth.uid())
);
CREATE POLICY "Users can update their group messages" ON group_messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Users can delete their group messages" ON group_messages FOR DELETE USING (auth.uid() = sender_id);

-- ============================================================================
-- PART 13: SEED DATA
-- ============================================================================

-- Insert default school settings
INSERT INTO school_settings (school_name, primary_color, secondary_color, accent_color, academic_year, term)
VALUES ('ClearPath Edu Hub', '#2563eb', '#1e293b', '#10b981', '2024-2025', 'First Term')
ON CONFLICT DO NOTHING;

-- Insert default model performance record
INSERT INTO model_performance (model_name, model_version, evaluation_date, accuracy, precision_score, recall_score, f1_score, auc_roc, training_data_size, feature_count, notes)
VALUES ('risk_prediction_v1', '1.0.0', CURRENT_DATE, 0.85, 0.82, 0.88, 0.85, 0.89, 1000, 15, 'Initial model for student risk prediction')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
SELECT 'Database schema successfully installed!' as status;