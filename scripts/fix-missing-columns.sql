-- ============================================================================
-- COMPREHENSIVE SCHEMA MIGRATION
-- Adds ALL columns & missing tables used by the application code
-- Safe to rerun (all ADD COLUMN / CREATE TABLE use IF NOT EXISTS)
-- Run this in Supabase SQL Editor after disable-all-rls.sql
-- ============================================================================

-- ============================================================================
-- 0. MISSING TABLES
-- ============================================================================

-- teacher_tasks: used by teacher/tasks page and admin task assignment
CREATE TABLE IF NOT EXISTS teacher_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id),
  task_type TEXT DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  submission_url TEXT,
  grade TEXT,
  admin_grade TEXT,
  feedback TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- teacher_evaluations: used by admin/evaluation page
CREATE TABLE IF NOT EXISTS teacher_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id),
  evaluation_type TEXT DEFAULT 'review',
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMP,
  score NUMERIC(5,2),
  admin_notes TEXT,
  evaluated_by UUID REFERENCES profiles(id),
  evaluated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- student_risk_predictions: used by analytics API
CREATE TABLE IF NOT EXISTS student_risk_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  prediction_date DATE DEFAULT CURRENT_DATE,
  risk_level TEXT DEFAULT 'low',
  risk_score NUMERIC(5,2),
  contributing_factors JSONB,
  predicted_outcome TEXT,
  confidence_score NUMERIC(5,2),
  model_version TEXT,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 1. announcements
-- ============================================================================
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES profiles(id);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachments TEXT[];

-- ============================================================================
-- 2. attendance
-- ============================================================================
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_id UUID;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS scan_method TEXT DEFAULT 'manual';

-- ============================================================================
-- 3. classes
-- ============================================================================
ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 50;

-- ============================================================================
-- 4. entrance_applications
-- ============================================================================
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS applied_class TEXT;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS admitted_class TEXT;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS previous_school TEXT;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS exam_score NUMERIC(5,2);
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS mastery_level TEXT;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS subject_scores JSONB;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS topic_mastery JSONB;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS security_events JSONB;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS answers JSONB;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS code_id UUID;

-- ============================================================================
-- 5. entrance_exams
-- ============================================================================
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS require_fullscreen BOOLEAN DEFAULT false;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS prevent_tab_switch BOOLEAN DEFAULT false;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS max_tab_switches INTEGER DEFAULT 3;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ============================================================================
-- 6. entrance_questions
-- ============================================================================
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS question_image TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 1;

-- ============================================================================
-- 7. exam_activity_logs
-- ============================================================================
ALTER TABLE exam_activity_logs ADD COLUMN IF NOT EXISTS attempt_id UUID;
ALTER TABLE exam_activity_logs ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE exam_activity_logs ADD COLUMN IF NOT EXISTS event_data JSONB;
ALTER TABLE exam_activity_logs ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';
ALTER TABLE exam_activity_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE exam_activity_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- ============================================================================
-- 8. homework
-- ============================================================================
ALTER TABLE homework ADD COLUMN IF NOT EXISTS homework_type TEXT DEFAULT 'general';
ALTER TABLE homework ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ============================================================================
-- 9. homework_submissions
-- ============================================================================
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS submission_url TEXT;
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS marks NUMERIC(5,2);
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT NOW();
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP;

-- ============================================================================
-- 10. invoices
-- ============================================================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- ============================================================================
-- 11. learning_streaks
-- ============================================================================
ALTER TABLE learning_streaks ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE learning_streaks ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE learning_streaks ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- ============================================================================
-- 12. lessons (session_id already exists from teacher lesson creation)
-- ============================================================================
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;

-- ============================================================================
-- 13. parent_students
-- ============================================================================
ALTER TABLE parent_students ADD COLUMN IF NOT EXISTS relationship TEXT;

-- ============================================================================
-- 14. practice_attempts
-- ============================================================================
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES practice_sessions(id);
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS question_source TEXT;
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS options TEXT[];
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS correct_answer INTEGER;
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS selected_answer INTEGER;
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS time_taken INTEGER;
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS subtopic TEXT;
ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS explanation TEXT;

-- ============================================================================
-- 15. practice_sessions
-- ============================================================================
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS goal_type TEXT;
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS answered_questions INTEGER DEFAULT 0;
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS correct_answers INTEGER DEFAULT 0;
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- ============================================================================
-- 16. profiles
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ============================================================================
-- 17. question_bank
-- ============================================================================
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS class_id UUID;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS term_id UUID;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS subtopic TEXT;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS options TEXT[];
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS option_images TEXT[];

-- ============================================================================
-- 18. quizzes
-- ============================================================================
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 30;

-- ============================================================================
-- 19. quiz_attempts (ensure all columns exist)
-- ============================================================================
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS time_taken INTEGER;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS device_info JSONB;

-- ============================================================================
-- 20. quiz_questions
-- ============================================================================
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_image TEXT;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS timestamp_seconds INTEGER DEFAULT 0;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS is_checkpoint BOOLEAN DEFAULT false;

-- ============================================================================
-- 21. receipts
-- ============================================================================
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS created_by UUID;

-- ============================================================================
-- 22. results
-- ============================================================================
ALTER TABLE results ADD COLUMN IF NOT EXISTS term TEXT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS academic_year TEXT;

-- ============================================================================
-- 23. review_schedule
-- ============================================================================
ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS subtopic TEXT;
ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 1;
ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP;

-- ============================================================================
-- 24. scheme_of_work
-- ============================================================================
ALTER TABLE scheme_of_work ADD COLUMN IF NOT EXISTS class_id UUID;
ALTER TABLE scheme_of_work ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE scheme_of_work ADD COLUMN IF NOT EXISTS week_number INTEGER;

-- ============================================================================
-- 25. school_settings
-- ============================================================================
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS school_logo TEXT;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#1e3a5f';
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#b3922f';
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#063b29';
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS term TEXT;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS current_session_id UUID;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS current_term_id UUID;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS id_card_config JSONB;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS school_motto TEXT;

-- ============================================================================
-- 26. sessions
-- ============================================================================
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'youtube';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0;

-- ============================================================================
-- 27. staff
-- ============================================================================
ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary NUMERIC(12,2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_employment DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ============================================================================
-- 28. students
-- ============================================================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES profiles(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

-- ============================================================================
-- 29. subjects
-- ============================================================================
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES profiles(id);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS class_id UUID;

-- ============================================================================
-- 30. teacher_tasks
-- ============================================================================
ALTER TABLE teacher_tasks ADD COLUMN IF NOT EXISTS teacher_id UUID;
ALTER TABLE teacher_tasks ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE teacher_tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE teacher_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE teacher_tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE teacher_tasks ADD COLUMN IF NOT EXISTS submission_url TEXT;
ALTER TABLE teacher_tasks ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE teacher_tasks ADD COLUMN IF NOT EXISTS admin_grade TEXT;
ALTER TABLE teacher_tasks ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE teacher_tasks ADD COLUMN IF NOT EXISTS created_by UUID;

-- ============================================================================
-- 31. teacher_evaluations (ensure exists)
-- ============================================================================
ALTER TABLE teacher_evaluations ADD COLUMN IF NOT EXISTS teacher_id UUID;
ALTER TABLE teacher_evaluations ADD COLUMN IF NOT EXISTS evaluation_type TEXT;
ALTER TABLE teacher_evaluations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE teacher_evaluations ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE teacher_evaluations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE teacher_evaluations ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;
ALTER TABLE teacher_evaluations ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);
ALTER TABLE teacher_evaluations ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE teacher_evaluations ADD COLUMN IF NOT EXISTS evaluated_by UUID;
ALTER TABLE teacher_evaluations ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMP;

-- ============================================================================
-- 32. terms
-- ============================================================================
ALTER TABLE terms ADD COLUMN IF NOT EXISTS current_week INTEGER DEFAULT 1;

-- ============================================================================
-- 33. test_attempts
-- ============================================================================
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS time_taken INTEGER;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS device_info JSONB;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS tab_switches INTEGER DEFAULT 0;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS fullscreen_exits INTEGER DEFAULT 0;

-- ============================================================================
-- 34. test_questions
-- ============================================================================
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS question_image TEXT;
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS options_images TEXT[];
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- ============================================================================
-- 35. tests
-- ============================================================================
ALTER TABLE tests ADD COLUMN IF NOT EXISTS allow_image BOOLEAN DEFAULT false;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT false;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS require_fullscreen BOOLEAN DEFAULT false;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS prevent_tab_switch BOOLEAN DEFAULT false;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS max_tab_switches INTEGER DEFAULT 3;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS allow_camera BOOLEAN DEFAULT false;

-- ============================================================================
-- 36. transactions
-- ============================================================================
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recorded_by UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_number TEXT;

-- ============================================================================
-- 37. id_cards
-- ============================================================================
ALTER TABLE id_cards ADD COLUMN IF NOT EXISTS card_number TEXT;
ALTER TABLE id_cards ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE id_cards ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE id_cards ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP;
ALTER TABLE id_cards ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- ============================================================================
-- 38. entrance_codes
-- ============================================================================
ALTER TABLE entrance_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- ============================================================================
-- 39. behavioral_reports
-- ============================================================================
ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS week_start DATE;
ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS week_end DATE;
ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS punctuality INTEGER;
ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS class_participation INTEGER;
ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS homework_completion INTEGER;
ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS teacher_notes TEXT;

-- ============================================================================
-- 40. student_risk_predictions
-- ============================================================================
ALTER TABLE student_risk_predictions ADD COLUMN IF NOT EXISTS is_acknowledged BOOLEAN DEFAULT false;
ALTER TABLE student_risk_predictions ADD COLUMN IF NOT EXISTS acknowledged_by UUID;
ALTER TABLE student_risk_predictions ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;

-- ============================================================================
-- 41. announcements_messages
-- ============================================================================
ALTER TABLE announcements_messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES profiles(id);

-- ============================================================================
-- FINAL: Update schema version tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);
