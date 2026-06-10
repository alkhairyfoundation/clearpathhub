-- ============================================================================
-- CLEARPATH EDU HUB - ADAPTED FOR NEON POSTGRESQL
-- ============================================================================
-- Modified to work with NextAuth (removed auth.users dependency)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 1: CORE TABLES (Profiles, School Settings, Academic Structure)
-- ============================================================================

-- PROFILES (Modified: removed reference to auth.users since we're using NextAuth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- STUDENTS (separate table for additional student-specific data)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
  created_at TIMESTAMP DEFAULT NOW()
);

-- SESSIONS (Learning sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID REFERENCES terms(id),
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  teacher_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- QUIZZES
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  title TEXT NOT NULL,
  description TEXT,
  total_marks INTEGER DEFAULT 100,
  duration_minutes INTEGER,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- QUIZ QUESTIONS
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL,
  points INTEGER DEFAULT 1,
  question_type TEXT DEFAULT 'multiple_choice',
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
   answers JSONB,
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
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 10: MESSAGING SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id),
    recipient_id UUID REFERENCES profiles(id),
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    sent_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 11: PRACTICE & REVIEW SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    questions_attempted INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    performance_percentage NUMERIC(5,2)
);

CREATE TABLE IF NOT EXISTS practice_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_session_id UUID REFERENCES practice_sessions(id) ON DELETE CASCADE,
    question_text TEXT,
    selected_answer INTEGER,
    is_correct BOOLEAN,
    points_awarded INTEGER DEFAULT 0,
    time_taken_seconds INTEGER,
    attempted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    goal_date DATE NOT NULL,
    target_questions INTEGER DEFAULT 0,
    target_minutes INTEGER DEFAULT 0,
    completed_questions INTEGER DEFAULT 0,
    completed_minutes INTEGER DEFAULT 0,
    achieved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    streak_days INTEGER DEFAULT 0,
    last_active_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    criteria JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    review_date DATE NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Row Level Security Policies (simplified for our use case)
-- We'll handle authorization in the application layer rather than database level
-- for simplicity with NextAuth

-- ============================================================================
-- PART 12: STUDENT GROWTH PORTFOLIO + IDENTITY BUILDER
-- ============================================================================

-- ARCHETYPES (Identity Cards)
CREATE TABLE IF NOT EXISTS archetypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SKILLS BANK
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ARCHETYPE -> SKILL RECOMMENDATION MAP
CREATE TABLE IF NOT EXISTS archetype_skill_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype_id UUID NOT NULL REFERENCES archetypes(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  recommendation_rank INTEGER DEFAULT 0,
  UNIQUE(archetype_id, skill_id)
);

-- CLASS TERM FRAMEWORKS (Admin-defined expectations per class + term)
CREATE TABLE IF NOT EXISTS class_term_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES academic_sessions(id),
  term_id UUID NOT NULL REFERENCES terms(id),
  class_level TEXT NOT NULL,
  published_at TIMESTAMP,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, term_id, class_level)
);

-- ACADEMIC COMPETENCIES within a framework
CREATE TABLE IF NOT EXISTS academic_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES class_term_frameworks(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  competency_text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  UNIQUE(framework_id, subject_id, order_index)
);

-- SKILL EXPECTATIONS within a framework
CREATE TABLE IF NOT EXISTS skill_expectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES class_term_frameworks(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id),
  expectation_text TEXT,
  order_index INTEGER DEFAULT 0,
  UNIQUE(framework_id, skill_id)
);

-- STUDENT TERM GOALS (core goal record)
CREATE TABLE IF NOT EXISTS student_term_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES academic_sessions(id),
  term_id UUID NOT NULL REFERENCES terms(id),
  archetype_id UUID NOT NULL REFERENCES archetypes(id),
  goal_statement_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'active', 'archived')),
  submitted_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES profiles(id),
  reflection_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, term_id)
);

-- STUDENT GOAL SKILLS (selected 3-5 skills per goal)
CREATE TABLE IF NOT EXISTS student_goal_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_term_goal_id UUID NOT NULL REFERENCES student_term_goals(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id),
  order_index INTEGER DEFAULT 0,
  UNIQUE(student_term_goal_id, skill_id)
);

-- STUDENT SKILL RUBRICS (teacher tracking per skill per term)
CREATE TABLE IF NOT EXISTS student_skill_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES academic_sessions(id),
  term_id UUID NOT NULL REFERENCES terms(id),
  skill_id UUID NOT NULL REFERENCES skills(id),
  level TEXT NOT NULL CHECK (level IN ('emerging', 'developing', 'secure', 'strong')),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, session_id, term_id, skill_id)
);

-- PORTFOLIO EVIDENCE (linked or manual evidence entries)
CREATE TABLE IF NOT EXISTS portfolio_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES academic_sessions(id),
  term_id UUID NOT NULL REFERENCES terms(id),
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('attendance', 'punctuality', 'incident', 'commendation', 'audit', 'assessment', 'manual')),
  reference_id UUID,
  text_snapshot TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- SKILL <-> EVIDENCE LINKS
CREATE TABLE IF NOT EXISTS skill_evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_skill_rubric_id UUID NOT NULL REFERENCES student_skill_rubrics(id) ON DELETE CASCADE,
  portfolio_evidence_id UUID NOT NULL REFERENCES portfolio_evidence(id) ON DELETE CASCADE,
  UNIQUE(student_skill_rubric_id, portfolio_evidence_id)
);

-- Indexes for portfolio module
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_student_term_goals_student ON student_term_goals(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_student_term_goals_term ON student_term_goals(term_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_student_term_goals_status ON student_term_goals(status); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_student_skill_rubrics_student ON student_skill_rubrics(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_portfolio_evidence_student ON portfolio_evidence(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_archetypes_active ON archetypes(is_active); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_skills_active ON skills(is_active); EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- ============================================================================
-- INDEXES (existing)
-- ============================================================================

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_students_profile_id ON students(profile_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_quizzes_session_id ON quizzes(session_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_entrance_exams_level ON entrance_exams(level); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_entrance_applications_exam_id ON entrance_applications(exam_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_question_bank_subject ON question_bank(subject); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_mastery_tracking_student_id ON mastery_tracking(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;