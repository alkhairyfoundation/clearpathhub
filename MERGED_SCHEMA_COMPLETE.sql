-- ============================================================================
-- CLEARPATH EDU HUB - COMPLETE DATABASE SCHEMA (UPDATED)
-- ============================================================================
-- Safe to re-run: Uses IF NOT EXISTS for all tables, functions, triggers
-- Last Updated: May 14, 2026
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 1: CORE TABLES (Profiles, School Settings, Academic Structure)
-- ============================================================================

-- PROFILES (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'accountant')),
  avatar_url TEXT,
  last_read_announcements TIMESTAMP DEFAULT NOW(),
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
   primary_color TEXT DEFAULT '#b3922f',
   secondary_color TEXT DEFAULT '#063b29',
   accent_color TEXT DEFAULT '#10b981',
   academic_year TEXT,
   term TEXT DEFAULT 'First Term',
   session_start DATE,
   session_end DATE,
   current_session_id UUID,
   current_term_id UUID
);

-- ACADEMIC SESSIONS
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TERMS
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  current_week INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TERM WEEKS
CREATE TABLE IF NOT EXISTS term_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  label TEXT,
  UNIQUE(term_id, week_number)
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
  level TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  form_teacher_id UUID REFERENCES profiles(id),
  class_teacher_id UUID REFERENCES profiles(id),
  capacity INTEGER DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PARENT-STUDENT JUNCTION TABLE (New)
CREATE TABLE IF NOT EXISTS parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  relationship TEXT CHECK (relationship IN ('father', 'mother', 'guardian', 'other')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- STUDENTS (separate table for additional student-specific data)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admission_number TEXT UNIQUE NOT NULL,
  class_id UUID REFERENCES classes(id),
  parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
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

-- SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  department_id UUID REFERENCES departments(id),
  teacher_id UUID REFERENCES profiles(id),
  class_id UUID REFERENCES classes(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- STUDENT CLASS ALLOCATION
CREATE TABLE IF NOT EXISTS student_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  class_id UUID REFERENCES classes(id),
  academic_year TEXT NOT NULL,
  allocated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, class_id, academic_year)
);

-- STAFF
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  staff_id TEXT UNIQUE NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,
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
  class_id UUID REFERENCES classes(id),
  teacher_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_type TEXT DEFAULT 'youtube' CHECK (video_type IN ('youtube', 'upload')),
  duration INTEGER DEFAULT 30,
  is_published BOOLEAN DEFAULT false,
  term_id UUID REFERENCES terms(id),
  week_no INTEGER,
  topic TEXT,
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
  option_images TEXT[],
  options TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
  points INTEGER DEFAULT 1,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'multiple_selection')),
  order_index INTEGER DEFAULT 0,
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
  answers JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  time_taken INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT
);

-- LESSONS (Notes)
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  teacher_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT,
  attachments TEXT[],
  is_published BOOLEAN DEFAULT false,
  term_id UUID REFERENCES terms(id),
  week_no INTEGER,
  topic TEXT,
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
  term TEXT,
  academic_year TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- EXAM ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS exam_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('tab_switch', 'fullscreen_exit', 'copy_attempt', 'paste_attempt', 'screenshot', 'right_click', 'keyboard_shortcut', 'multiple_device', 'heartbeat_timeout')),
  event_data JSONB,
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address TEXT,
  user_agent TEXT,
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
  title TEXT,
  type TEXT DEFAULT 'general',
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  entered_by UUID REFERENCES profiles(id),
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
  shuffle_questions BOOLEAN DEFAULT false,
  require_fullscreen BOOLEAN DEFAULT false,
  prevent_tab_switch BOOLEAN DEFAULT false,
  max_tab_switches INTEGER DEFAULT 3,
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
   difficulty_level TEXT CHECK (difficulty_level IN ('EASY', 'MEDIUM', 'HARD', 'VERY_HARD')),
   topic TEXT,
   subtopic TEXT,
   explanation TEXT,
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
   admitted_class TEXT,
   previous_school TEXT,
   exam_score INTEGER,
   status TEXT DEFAULT 'pending',
   mastery_level TEXT CHECK (mastery_level IN ('POOR', 'GOOD', 'EXCELLENT', 'PROFICIENT', 'MASTERED')),
   subject_scores JSONB,
   topic_mastery JSONB,
   reviewed_by UUID REFERENCES profiles(id),
   reviewed_at TIMESTAMP,
   security_events JSONB,
   completed_at TIMESTAMP,
   created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 6: QUESTION BANK
-- ============================================================================

CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL CHECK (subject IN ('ENGLISH', 'MATHEMATICS')),
    subject_id UUID REFERENCES subjects(id),
    level TEXT NOT NULL CHECK (level IN ('JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2')),
    class_id UUID REFERENCES classes(id),
    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('EASY', 'MEDIUM', 'HARD', 'VERY_HARD')),
    topic TEXT NOT NULL,
    subtopic TEXT,
    question TEXT NOT NULL,
    question_image TEXT,
    options TEXT[],
    option_images TEXT[],
    correct_answer INTEGER NOT NULL,
    explanation TEXT,
    question_type TEXT NOT NULL CHECK (question_type IN ('MCQ', 'FILL_IN_THE_GAP', 'TRUE_FALSE')),
    points INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    tags TEXT[],
    status TEXT DEFAULT 'active',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 7: STUDENT ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES entrance_applications(id) ON DELETE CASCADE,
    student_email TEXT NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    time_taken_seconds INTEGER,
    subject TEXT,
    mastery_level TEXT CHECK (mastery_level IN ('POOR', 'GOOD', 'EXCELLENT', 'PROFICIENT', 'MASTERED')),
    topic_performance JSONB,
    generated_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 8: MASTERY & SPACED REPETITION
-- ============================================================================

CREATE TABLE IF NOT EXISTS mastery_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    mastery_level TEXT NOT NULL CHECK (mastery_level IN ('NOVICE', 'BEGINNER', 'INTERMEDIATE', 'PROFICIENT', 'MASTERED')),
    attempts INTEGER DEFAULT 0,
    last_attempt_date TIMESTAMP,
    next_review_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spaced_repetition_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mastery_id UUID REFERENCES mastery_tracking(id) ON DELETE CASCADE,
    review_number INTEGER NOT NULL,
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    performance_score INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mastery_practice_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    questions_attempted INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    practice_date TIMESTAMP DEFAULT NOW(),
    performance_percentage NUMERIC(5,2)
);

-- MASTERY SCORES (new)
CREATE TABLE IF NOT EXISTS mastery_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id),
    topic TEXT NOT NULL,
    subtopic TEXT,
    mastery_score NUMERIC(5,2),
    accuracy NUMERIC(5,2),
    consistency NUMERIC(5,2),
    recency NUMERIC(5,2),
    difficulty_progress NUMERIC(5,2),
    level TEXT DEFAULT 'NOVICE',
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, subject_id, topic, subtopic)
);

-- ============================================================================
-- PART 9: SCHEME OF WORK & CURRICULUM
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheme_of_work (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id),
    academic_year TEXT NOT NULL,
    term TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    topic TEXT NOT NULL,
    subtopics TEXT[],
    learning_outcomes TEXT[],
    teaching_materials TEXT[],
    assessments TEXT[],
    learning_objectives TEXT[],
    resources TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 10: COMMUNICATION & MESSAGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 11: PRACTICE & GAMIFICATION
-- ============================================================================

-- PRACTICE SESSIONS
CREATE TABLE IF NOT EXISTS practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id),
    date DATE NOT NULL,
    goal_type TEXT,
    total_questions INTEGER DEFAULT 0,
    answered_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    score NUMERIC(5,2),
    duration_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'in_progress',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- PRACTICE ATTEMPTS
CREATE TABLE IF NOT EXISTS practice_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES practice_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    question_source TEXT,
    source_id UUID,
    question_text TEXT NOT NULL,
    question_type TEXT,
    options JSONB,
    correct_answer INTEGER NOT NULL,
    selected_answer INTEGER,
    is_correct BOOLEAN,
    time_taken INTEGER DEFAULT 0,
    difficulty TEXT,
    topic TEXT,
    subtopic TEXT,
    explanation TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- DAILY GOALS
CREATE TABLE IF NOT EXISTS daily_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    target_questions INTEGER DEFAULT 10,
    target_score INTEGER DEFAULT 80,
    completed_questions INTEGER DEFAULT 0,
    achieved_score INTEGER,
    status TEXT DEFAULT 'in_progress',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, date)
);

-- LEARNING STREAKS
CREATE TABLE IF NOT EXISTS learning_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id)
);

-- BADGES
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    badge_data JSONB,
    awarded_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, badge_type)
);

-- REVIEW SCHEDULE (Spaced Repetition)
CREATE TABLE IF NOT EXISTS review_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id),
    topic TEXT NOT NULL,
    subtopic TEXT,
    next_review_date DATE NOT NULL,
    interval_days INTEGER DEFAULT 1,
    last_reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, subject_id, topic, subtopic)
);

-- ============================================================================
-- PART 12: IDEMPOTENT COLUMN MIGRATIONS
-- ============================================================================
-- Ensures all columns exist even if CREATE TABLE IF NOT EXISTS skipped
-- because the table already existed from a prior schema version.
-- ============================================================================

-- question_bank: ensure subject column exists
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS subject TEXT;
DO $$ BEGIN
  ALTER TABLE question_bank ALTER COLUMN subject SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;
-- question_bank: subject_id
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS subject_id UUID;

-- question_bank: class_id
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS class_id UUID;

-- question_bank: subtopic
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS subtopic TEXT;

-- question_bank: question_image
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS question_image TEXT;

-- question_bank: option_images
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS option_images TEXT[];

-- question_bank: tags
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS tags TEXT[];

-- question_bank: status
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- question_bank: created_by
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS created_by UUID;

-- question_bank: updated_at
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS difficulty_level TEXT;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS topic TEXT;

-- entrance_questions: subject column
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS subtopic TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS explanation TEXT;

-- student_analytics: subject and other columns
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS topic_performance JSONB;
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- mastery_tracking: subject column
ALTER TABLE mastery_tracking ADD COLUMN IF NOT EXISTS subject TEXT;
DO $$ BEGIN
  ALTER TABLE mastery_tracking ALTER COLUMN subject SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- mastery_practice_logs: subject column
ALTER TABLE mastery_practice_logs ADD COLUMN IF NOT EXISTS subject TEXT;
DO $$ BEGIN
  ALTER TABLE mastery_practice_logs ALTER COLUMN subject SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;
ALTER TABLE mastery_practice_logs ADD COLUMN IF NOT EXISTS performance_percentage NUMERIC(5,2);

-- messages: subject column
ALTER TABLE messages ADD COLUMN IF NOT EXISTS subject TEXT;
DO $$ BEGIN
  ALTER TABLE messages ALTER COLUMN subject SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_parent_id_fkey;
ALTER TABLE students ADD FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_read_announcements TIMESTAMP DEFAULT NOW();

-- behavioral_reports: missing columns
ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium';
ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES profiles(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

-- classes: additional columns
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_teacher_id UUID;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS form_teacher_id UUID;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 50;

-- entrance_exams: level column
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS level TEXT;

-- question_bank: level and other columns
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS level TEXT;

-- mastery_scores: level column
ALTER TABLE mastery_scores ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'NOVICE';

-- entrance_applications: status and other columns
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS status TEXT;

-- student_analytics: student_email
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS student_email TEXT;

-- practice_sessions: date column
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS date TIMESTAMP;

-- daily_goals: date column
ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS date DATE;

-- review_schedule: next_review_date
ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS next_review_date TIMESTAMP;

-- lessons: additional columns
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS class_id UUID;

-- homework: additional columns
ALTER TABLE homework ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE homework ADD COLUMN IF NOT EXISTS class_id UUID;

-- sessions: additional columns
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS teacher_id UUID;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS class_id UUID;

-- results: additional columns
ALTER TABLE results ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE results ADD COLUMN IF NOT EXISTS exam_type TEXT;

-- transactions, invoices, receipts: parent_id and student_id for policies
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS student_id UUID;

-- attendance: additional columns for policies
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS student_id UUID;

-- quiz_attempts: student_id for policies
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS student_id UUID;

-- homework_submissions: student_id for policies
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS student_id UUID;

-- id_cards: student_id for policies
ALTER TABLE id_cards ADD COLUMN IF NOT EXISTS student_id UUID;

-- lessons: is_published and teacher_id for policies
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS teacher_id UUID;

-- sessions: is_published for policies
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- entrance_exams: is_published for policies
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- entrance_applications: email for policies
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS email TEXT;

-- messages: additional columns for policies
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id UUID;

-- announcements_messages: recipient_id for policies
ALTER TABLE announcements_messages ADD COLUMN IF NOT EXISTS recipient_id UUID;

-- staff_attendance: staff_id for policies
ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS staff_id UUID;

-- behavioral_reports: student_id for policies
ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS student_id UUID;

-- results: student_id for policies
ALTER TABLE results ADD COLUMN IF NOT EXISTS student_id UUID;

-- ============================================================================
-- PART 12b: COLUMN TYPE CORRECTIONS (fixes older schemas with wrong types)
-- Runs before indexes and policies to avoid "used in policy" errors
-- ============================================================================

-- classes: level, name, form_teacher_id, capacity
DO $$
DECLARE cons RECORD;
BEGIN
  FOR cons IN SELECT con.conname FROM pg_constraint con JOIN pg_class cls ON con.conrelid = cls.oid JOIN pg_attribute att ON att.attrelid = cls.oid AND att.attnum = ANY(con.conkey) WHERE cls.relname = 'classes' AND att.attname IN ('level','name','form_teacher_id','capacity') AND con.contype = 'c'
  LOOP EXECUTE 'ALTER TABLE classes DROP CONSTRAINT IF EXISTS ' || quote_ident(cons.conname); END LOOP;
  ALTER TABLE classes ALTER COLUMN level TYPE TEXT USING level::text;
  ALTER TABLE classes ALTER COLUMN name TYPE TEXT USING name::text;
  ALTER TABLE classes ALTER COLUMN form_teacher_id TYPE UUID USING form_teacher_id::uuid;
  ALTER TABLE classes ALTER COLUMN capacity TYPE INTEGER USING capacity::integer;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- departments: name, code, head_id
DO $$
DECLARE cons RECORD;
BEGIN
  FOR cons IN SELECT con.conname FROM pg_constraint con JOIN pg_class cls ON con.conrelid = cls.oid JOIN pg_attribute att ON att.attrelid = cls.oid AND att.attnum = ANY(con.conkey) WHERE cls.relname = 'departments' AND att.attname IN ('name','code','head_id') AND con.contype = 'c'
  LOOP EXECUTE 'ALTER TABLE departments DROP CONSTRAINT IF EXISTS ' || quote_ident(cons.conname); END LOOP;
  ALTER TABLE departments ALTER COLUMN name TYPE TEXT USING name::text;
  ALTER TABLE departments ALTER COLUMN code TYPE TEXT USING code::text;
  ALTER TABLE departments ALTER COLUMN head_id TYPE UUID USING head_id::uuid;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- subjects: name, code, department_id
DO $$
DECLARE cons RECORD;
BEGIN
  FOR cons IN SELECT con.conname FROM pg_constraint con JOIN pg_class cls ON con.conrelid = cls.oid JOIN pg_attribute att ON att.attrelid = cls.oid AND att.attnum = ANY(con.conkey) WHERE cls.relname = 'subjects' AND att.attname IN ('name','code','department_id') AND con.contype = 'c'
  LOOP EXECUTE 'ALTER TABLE subjects DROP CONSTRAINT IF EXISTS ' || quote_ident(cons.conname); END LOOP;
  ALTER TABLE subjects ALTER COLUMN name TYPE TEXT USING name::text;
  ALTER TABLE subjects ALTER COLUMN code TYPE TEXT USING code::text;
  ALTER TABLE subjects ALTER COLUMN department_id TYPE UUID USING department_id::uuid;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- school_settings: all text/date columns
DO $$
DECLARE cons RECORD;
BEGIN
  FOR cons IN SELECT con.conname FROM pg_constraint con JOIN pg_class cls ON con.conrelid = cls.oid JOIN pg_attribute att ON att.attrelid = cls.oid AND att.attnum = ANY(con.conkey) WHERE cls.relname = 'school_settings' AND att.attname IN ('school_name','school_motto','school_address','school_phone','school_email','primary_color','secondary_color','accent_color','academic_year','term','session_start','session_end') AND con.contype = 'c'
  LOOP EXECUTE 'ALTER TABLE school_settings DROP CONSTRAINT IF EXISTS ' || quote_ident(cons.conname); END LOOP;
  ALTER TABLE school_settings ALTER COLUMN school_name TYPE TEXT USING school_name::text;
  ALTER TABLE school_settings ALTER COLUMN school_motto TYPE TEXT USING school_motto::text;
  ALTER TABLE school_settings ALTER COLUMN school_address TYPE TEXT USING school_address::text;
  ALTER TABLE school_settings ALTER COLUMN school_phone TYPE TEXT USING school_phone::text;
  ALTER TABLE school_settings ALTER COLUMN school_email TYPE TEXT USING school_email::text;
  ALTER TABLE school_settings ALTER COLUMN primary_color TYPE TEXT USING primary_color::text;
  ALTER TABLE school_settings ALTER COLUMN secondary_color TYPE TEXT USING secondary_color::text;
  ALTER TABLE school_settings ALTER COLUMN accent_color TYPE TEXT USING accent_color::text;
  ALTER TABLE school_settings ALTER COLUMN academic_year TYPE TEXT USING academic_year::text;
  ALTER TABLE school_settings ALTER COLUMN term TYPE TEXT USING term::text;
  ALTER TABLE school_settings ALTER COLUMN session_start TYPE DATE USING session_start::date;
  ALTER TABLE school_settings ALTER COLUMN session_end TYPE DATE USING session_end::date;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- entrance_exams: all columns used in seed data
DO $$
DECLARE cons RECORD;
BEGIN
  FOR cons IN SELECT con.conname FROM pg_constraint con JOIN pg_class cls ON con.conrelid = cls.oid JOIN pg_attribute att ON att.attrelid = cls.oid AND att.attnum = ANY(con.conkey) WHERE cls.relname = 'entrance_exams' AND att.attname IN ('title','description','level','academic_year','exam_date','duration_minutes','passing_score','total_questions','shuffle_questions','require_fullscreen','prevent_tab_switch','max_tab_switches','is_published','is_active','created_by') AND con.contype = 'c'
  LOOP EXECUTE 'ALTER TABLE entrance_exams DROP CONSTRAINT IF EXISTS ' || quote_ident(cons.conname); END LOOP;
  ALTER TABLE entrance_exams ALTER COLUMN title TYPE TEXT USING title::text;
  ALTER TABLE entrance_exams ALTER COLUMN description TYPE TEXT USING description::text;
  ALTER TABLE entrance_exams ALTER COLUMN level TYPE TEXT USING level::text;
  ALTER TABLE entrance_exams ALTER COLUMN academic_year TYPE TEXT USING academic_year::text;
  ALTER TABLE entrance_exams ALTER COLUMN exam_date TYPE DATE USING exam_date::date;
  ALTER TABLE entrance_exams ALTER COLUMN duration_minutes TYPE INTEGER USING duration_minutes::integer;
  ALTER TABLE entrance_exams ALTER COLUMN passing_score TYPE INTEGER USING passing_score::integer;
  ALTER TABLE entrance_exams ALTER COLUMN total_questions TYPE INTEGER USING total_questions::integer;
  ALTER TABLE entrance_exams ALTER COLUMN shuffle_questions TYPE BOOLEAN USING shuffle_questions::boolean;
  ALTER TABLE entrance_exams ALTER COLUMN require_fullscreen TYPE BOOLEAN USING require_fullscreen::boolean;
  ALTER TABLE entrance_exams ALTER COLUMN prevent_tab_switch TYPE BOOLEAN USING prevent_tab_switch::boolean;
  ALTER TABLE entrance_exams ALTER COLUMN max_tab_switches TYPE INTEGER USING max_tab_switches::integer;
  ALTER TABLE entrance_exams ALTER COLUMN is_published TYPE BOOLEAN USING is_published::boolean;
  ALTER TABLE entrance_exams ALTER COLUMN is_active TYPE BOOLEAN USING is_active::boolean;
  ALTER TABLE entrance_exams ALTER COLUMN created_by TYPE UUID USING created_by::uuid;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- entrance_codes
DO $$
DECLARE cons RECORD;
BEGIN
  FOR cons IN SELECT con.conname FROM pg_constraint con JOIN pg_class cls ON con.conrelid = cls.oid JOIN pg_attribute att ON att.attrelid = cls.oid AND att.attnum = ANY(con.conkey) WHERE cls.relname = 'entrance_codes' AND att.attname IN ('exam_id','code','max_uses','used_count','is_active','expires_at') AND con.contype = 'c'
  LOOP EXECUTE 'ALTER TABLE entrance_codes DROP CONSTRAINT IF EXISTS ' || quote_ident(cons.conname); END LOOP;
  ALTER TABLE entrance_codes ALTER COLUMN exam_id TYPE UUID USING exam_id::uuid;
  ALTER TABLE entrance_codes ALTER COLUMN code TYPE TEXT USING code::text;
  ALTER TABLE entrance_codes ALTER COLUMN max_uses TYPE INTEGER USING max_uses::integer;
  ALTER TABLE entrance_codes ALTER COLUMN used_count TYPE INTEGER USING used_count::integer;
  ALTER TABLE entrance_codes ALTER COLUMN is_active TYPE BOOLEAN USING is_active::boolean;
  ALTER TABLE entrance_codes ALTER COLUMN expires_at TYPE TIMESTAMP USING expires_at::timestamp;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- academic_sessions
DO $$
DECLARE cons RECORD;
BEGIN
  FOR cons IN SELECT con.conname FROM pg_constraint con JOIN pg_class cls ON con.conrelid = cls.oid JOIN pg_attribute att ON att.attrelid = cls.oid AND att.attnum = ANY(con.conkey) WHERE cls.relname = 'academic_sessions' AND att.attname IN ('name','start_date','end_date','is_current') AND con.contype = 'c'
  LOOP EXECUTE 'ALTER TABLE academic_sessions DROP CONSTRAINT IF EXISTS ' || quote_ident(cons.conname); END LOOP;
  ALTER TABLE academic_sessions ALTER COLUMN name TYPE TEXT USING name::text;
  ALTER TABLE academic_sessions ALTER COLUMN start_date TYPE DATE USING start_date::date;
  ALTER TABLE academic_sessions ALTER COLUMN end_date TYPE DATE USING end_date::date;
  ALTER TABLE academic_sessions ALTER COLUMN is_current TYPE BOOLEAN USING is_current::boolean;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- terms
DO $$
DECLARE cons RECORD;
BEGIN
  FOR cons IN SELECT con.conname FROM pg_constraint con JOIN pg_class cls ON con.conrelid = cls.oid JOIN pg_attribute att ON att.attrelid = cls.oid AND att.attnum = ANY(con.conkey) WHERE cls.relname = 'terms' AND att.attname IN ('session_id','name','start_date','end_date','current_week','is_current') AND con.contype = 'c'
  LOOP EXECUTE 'ALTER TABLE terms DROP CONSTRAINT IF EXISTS ' || quote_ident(cons.conname); END LOOP;
  ALTER TABLE terms ALTER COLUMN session_id TYPE UUID USING session_id::uuid;
  ALTER TABLE terms ALTER COLUMN name TYPE TEXT USING name::text;
  ALTER TABLE terms ALTER COLUMN start_date TYPE DATE USING start_date::date;
  ALTER TABLE terms ALTER COLUMN end_date TYPE DATE USING end_date::date;
  ALTER TABLE terms ALTER COLUMN current_week TYPE INTEGER USING current_week::integer;
  ALTER TABLE terms ALTER COLUMN is_current TYPE BOOLEAN USING is_current::boolean;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- term_weeks
DO $$
DECLARE cons RECORD;
BEGIN
  FOR cons IN SELECT con.conname FROM pg_constraint con JOIN pg_class cls ON con.conrelid = cls.oid JOIN pg_attribute att ON att.attrelid = cls.oid AND att.attnum = ANY(con.conkey) WHERE cls.relname = 'term_weeks' AND att.attname IN ('term_id','week_number','start_date','end_date','label') AND con.contype = 'c'
  LOOP EXECUTE 'ALTER TABLE term_weeks DROP CONSTRAINT IF EXISTS ' || quote_ident(cons.conname); END LOOP;
  ALTER TABLE term_weeks ALTER COLUMN term_id TYPE UUID USING term_id::uuid;
  ALTER TABLE term_weeks ALTER COLUMN week_number TYPE INTEGER USING week_number::integer;
  ALTER TABLE term_weeks ALTER COLUMN start_date TYPE DATE USING start_date::date;
  ALTER TABLE term_weeks ALTER COLUMN end_date TYPE DATE USING end_date::date;
  ALTER TABLE term_weeks ALTER COLUMN label TYPE TEXT USING label::text;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- ============================================================================
-- PART 13: INDEXES FOR PERFORMANCE
-- ============================================================================


-- Authentication & Profile Indexes
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_students_profile_id ON students(profile_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number); EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Academic Structure Indexes
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_classes_department_id ON classes(department_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_student_classes_student_id ON student_classes(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_student_classes_class_id ON student_classes(class_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_subjects_department_id ON subjects(department_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_academic_sessions_is_current ON academic_sessions(is_current); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_terms_session_id ON terms(session_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_terms_is_current ON terms(is_current); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_term_weeks_term_id ON term_weeks(term_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Learning Management Indexes
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_sessions_subject_id ON sessions(subject_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_sessions_teacher_id ON sessions(teacher_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_sessions_class_id ON sessions(class_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_quizzes_session_id ON quizzes(session_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_homework_subject_id ON homework(subject_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_homework_class_id ON homework(class_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_lessons_subject_id ON lessons(subject_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_lessons_class_id ON lessons(class_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Attendance Indexes
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_id ON staff_attendance(staff_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(date); EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Results Indexes
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_results_subject_id ON results(subject_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_results_exam_type ON results(exam_type); EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Entrance Exam Indexes
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_entrance_exams_level ON entrance_exams(level); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_entrance_codes_exam_id ON entrance_codes(exam_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_entrance_codes_code ON entrance_codes(code); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_entrance_questions_exam_id ON entrance_questions(exam_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_entrance_applications_email ON entrance_applications(email); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_entrance_applications_status ON entrance_applications(status); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_entrance_applications_exam_id ON entrance_applications(exam_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Question Bank Indexes
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_question_bank_subject ON question_bank(subject); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_question_bank_level ON question_bank(level); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty_level); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_question_bank_topic ON question_bank(topic); EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Analytics Indexes
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_student_analytics_email ON student_analytics(student_email); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_mastery_tracking_student_id ON mastery_tracking(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_mastery_practice_logs_student_id ON mastery_practice_logs(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_mastery_scores_student_id ON mastery_scores(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Practice & Gamification Indexes
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_id ON practice_sessions(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_practice_sessions_date ON practice_sessions(date); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_practice_attempts_session_id ON practice_attempts(session_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_practice_attempts_student_id ON practice_attempts(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_daily_goals_student_id ON daily_goals(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_daily_goals_date ON daily_goals(date); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_learning_streaks_student_id ON learning_streaks(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_badges_student_id ON badges(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_review_schedule_student_id ON review_schedule(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_review_schedule_next_review_date ON review_schedule(next_review_date); EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Communication Indexes
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- ============================================================================
-- PART 14: ROW LEVEL SECURITY ENABLE
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_activity_logs ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaced_repetition_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_practice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_of_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_schedule ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 15: AUTH TRIGGER (Auto-create profile on user signup)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 16: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Profile Policies
DO $$ BEGIN CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Students Policies
DO $$ BEGIN CREATE POLICY "Students can view own record" ON students FOR SELECT USING (auth.uid() = profile_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can view all students" ON students FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage students" ON students FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Classes Policies
DO $$ BEGIN CREATE POLICY "Anyone can view classes" ON classes FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage classes" ON classes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Subjects Policies
DO $$ BEGIN CREATE POLICY "Anyone can view subjects" ON subjects FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage subjects" ON subjects FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Departments Policies
DO $$ BEGIN CREATE POLICY "Anyone can view departments" ON departments FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage departments" ON departments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sessions Policies
DO $$ BEGIN CREATE POLICY "Published sessions are viewable" ON sessions FOR SELECT USING (is_published = true OR teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can manage own sessions" ON sessions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher' AND teacher_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Quizzes Policies
DO $$ BEGIN CREATE POLICY "Students can attempt quizzes" ON quizzes FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can manage quizzes" ON quizzes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Quiz Attempts Policies
DO $$ BEGIN CREATE POLICY "Students can view own attempts" ON quiz_attempts FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can view all attempts" ON quiz_attempts FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lessons Policies
DO $$ BEGIN CREATE POLICY "Published lessons are viewable" ON lessons FOR SELECT USING (is_published = true OR teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can manage own lessons" ON lessons FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher' AND teacher_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Homework Policies
DO $$ BEGIN CREATE POLICY "Homework is viewable by students and teachers" ON homework FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can manage homework" ON homework FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Homework Submissions Policies
DO $$ BEGIN CREATE POLICY "Students can view own submissions" ON homework_submissions FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can view all submissions" ON homework_submissions FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Attendance Policies
DO $$ BEGIN CREATE POLICY "Students can view own attendance" ON attendance FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can manage attendance" ON attendance FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Staff Attendance Policies
DO $$ BEGIN CREATE POLICY "Staff can view own attendance" ON staff_attendance FOR SELECT USING (staff_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage staff attendance" ON staff_attendance FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Results Policies
DO $$ BEGIN CREATE POLICY "Students can view own results" ON results FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can manage results" ON results FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Behavioral Reports Policies
DO $$ BEGIN CREATE POLICY "Students can view own reports" ON behavioral_reports FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can manage reports" ON behavioral_reports FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Announcements Policies
DO $$ BEGIN CREATE POLICY "Anyone can view announcements" ON announcements FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage announcements" ON announcements FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Transactions Policies
DO $$ BEGIN CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (student_id = auth.uid() OR parent_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Accountants can manage transactions" ON transactions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('accountant', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Invoices Policies
DO $$ BEGIN CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (student_id = auth.uid() OR parent_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Accountants can manage invoices" ON invoices FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('accountant', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Receipts Policies
DO $$ BEGIN CREATE POLICY "Users can view own receipts" ON receipts FOR SELECT USING (student_id = auth.uid() OR parent_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Accountants can manage receipts" ON receipts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('accountant', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ID Cards Policies
DO $$ BEGIN CREATE POLICY "Users can view own ID cards" ON id_cards FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage ID cards" ON id_cards FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Entrance Exams Policies
DO $$ BEGIN CREATE POLICY "Anyone can view entrance exams" ON entrance_exams FOR SELECT USING (is_published = true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage entrance exams" ON entrance_exams FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Entrance Questions Policies
DO $$ BEGIN CREATE POLICY "Anyone can view entrance questions" ON entrance_questions FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage entrance questions" ON entrance_questions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Entrance Codes Policies
DO $$ BEGIN CREATE POLICY "Entrance codes viewable by all" ON entrance_codes FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage entrance codes" ON entrance_codes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Entrance Applications Policies
DO $$ BEGIN CREATE POLICY "Users can view own application" ON entrance_applications FOR SELECT USING (email = auth.jwt()->>'email'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own application" ON entrance_applications FOR INSERT WITH CHECK (email = auth.jwt()->>'email'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage applications" ON entrance_applications FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Question Bank Policies
DO $$ BEGIN CREATE POLICY "Question bank is viewable" ON question_bank FOR SELECT USING (is_active = true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can manage question bank" ON question_bank FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Student Analytics Policies
DO $$ BEGIN CREATE POLICY "Students can view own analytics" ON student_analytics FOR SELECT USING (student_email = auth.jwt()->>'email'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can view student analytics" ON student_analytics FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Mastery Tracking Policies
DO $$ BEGIN CREATE POLICY "Students can view own mastery" ON mastery_tracking FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can view student mastery" ON mastery_tracking FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students can insert own mastery" ON mastery_tracking FOR INSERT WITH CHECK (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Mastery Practice Logs Policies
DO $$ BEGIN CREATE POLICY "Students can view own practice logs" ON mastery_practice_logs FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students can insert own practice logs" ON mastery_practice_logs FOR INSERT WITH CHECK (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Mastery Scores Policies
DO $$ BEGIN CREATE POLICY "Students can view own scores" ON mastery_scores FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students can insert own scores" ON mastery_scores FOR INSERT WITH CHECK (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Scheme of Work Policies
DO $$ BEGIN CREATE POLICY "Anyone can view scheme of work" ON scheme_of_work FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can manage scheme of work" ON scheme_of_work FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Messages Policies
DO $$ BEGIN CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Practice Sessions Policies
DO $$ BEGIN CREATE POLICY "Students can view own practice sessions" ON practice_sessions FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students can insert practice sessions" ON practice_sessions FOR INSERT WITH CHECK (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Practice Attempts Policies
DO $$ BEGIN CREATE POLICY "Students can view own attempts" ON practice_attempts FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students can insert own attempts" ON practice_attempts FOR INSERT WITH CHECK (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Daily Goals Policies
DO $$ BEGIN CREATE POLICY "Students can view own daily goals" ON daily_goals FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students can manage own daily goals" ON daily_goals FOR ALL USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Learning Streaks Policies
DO $$ BEGIN CREATE POLICY "Students can view own streaks" ON learning_streaks FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students can update own streaks" ON learning_streaks FOR UPDATE USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Badges Policies
DO $$ BEGIN CREATE POLICY "Students can view own badges" ON badges FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Review Schedule Policies
DO $$ BEGIN CREATE POLICY "Students can view own review schedule" ON review_schedule FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students can manage own review schedule" ON review_schedule FOR ALL USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- School Settings Policies
DO $$ BEGIN CREATE POLICY "School settings viewable by all" ON school_settings FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can update school settings" ON school_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Announcements Messages Policies
DO $$ BEGIN CREATE POLICY "Users can view own announcement messages" ON announcements_messages FOR SELECT USING (recipient_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Schema creation complete!
-- ============================================================================
