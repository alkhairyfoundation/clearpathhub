-- ============================================================================
-- COMPREHENSIVE SCHEMA MIGRATION
-- Adds ALL missing tables & columns used by the application code
-- Every ALTER TABLE is wrapped with a table existence check so it NEVER
-- errors on missing tables. Safe to rerun.
-- Run this in Supabase SQL Editor.
-- ============================================================================

-- ============================================================================
-- 0. MISSING TABLES (tables that might not exist at all)
-- ============================================================================

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
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'announcements') THEN
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS creator_id UUID;
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by UUID;
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachments TEXT[];
END IF; END $$;

-- ============================================================================
-- 2. attendance
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'attendance') THEN
  ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_id UUID;
  ALTER TABLE attendance ADD COLUMN IF NOT EXISTS scan_method TEXT DEFAULT 'manual';
END IF; END $$;

-- ============================================================================
-- 3. classes
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'classes') THEN
  ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 50;
END IF; END $$;

-- ============================================================================
-- 4. entrance_applications
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'entrance_applications') THEN
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
END IF; END $$;

-- ============================================================================
-- 5. entrance_exams
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'entrance_exams') THEN
  ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false;
  ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS require_fullscreen BOOLEAN DEFAULT false;
  ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS prevent_tab_switch BOOLEAN DEFAULT false;
  ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS max_tab_switches INTEGER DEFAULT 3;
  ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS created_by UUID;
  ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
END IF; END $$;

-- ============================================================================
-- 6. entrance_questions
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'entrance_questions') THEN
  ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';
  ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS question_image TEXT;
  ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 1;
END IF; END $$;

-- ============================================================================
-- 7. exam_activity_logs
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'exam_activity_logs') THEN
  ALTER TABLE exam_activity_logs ADD COLUMN IF NOT EXISTS attempt_id UUID;
  ALTER TABLE exam_activity_logs ADD COLUMN IF NOT EXISTS event_type TEXT;
  ALTER TABLE exam_activity_logs ADD COLUMN IF NOT EXISTS event_data JSONB;
  ALTER TABLE exam_activity_logs ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';
  ALTER TABLE exam_activity_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
  ALTER TABLE exam_activity_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
END IF; END $$;

-- ============================================================================
-- 8. homework
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'homework') THEN
  ALTER TABLE homework ADD COLUMN IF NOT EXISTS homework_type TEXT DEFAULT 'general';
  ALTER TABLE homework ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
END IF; END $$;

-- ============================================================================
-- 9. homework_submissions
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'homework_submissions') THEN
  ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS submission_url TEXT;
  ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS marks NUMERIC(5,2);
  ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
  ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT NOW();
  ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP;
END IF; END $$;

-- ============================================================================
-- 10. invoices
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'invoices') THEN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date DATE;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
END IF; END $$;

-- ============================================================================
-- 11. learning_streaks
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'learning_streaks') THEN
  ALTER TABLE learning_streaks ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
  ALTER TABLE learning_streaks ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
  ALTER TABLE learning_streaks ADD COLUMN IF NOT EXISTS last_activity_date DATE;
END IF; END $$;

-- ============================================================================
-- 12. lessons
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'lessons') THEN
  ALTER TABLE lessons ADD COLUMN IF NOT EXISTS session_id UUID;
END IF; END $$;

-- ============================================================================
-- 13. parent_students
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'parent_students') THEN
  ALTER TABLE parent_students ADD COLUMN IF NOT EXISTS relationship TEXT;
END IF; END $$;

-- ============================================================================
-- 14. practice_attempts
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'practice_attempts') THEN
  ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS session_id UUID;
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
END IF; END $$;

-- ============================================================================
-- 15. practice_sessions
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'practice_sessions') THEN
  ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS goal_type TEXT;
  ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS answered_questions INTEGER DEFAULT 0;
  ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS correct_answers INTEGER DEFAULT 0;
  ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);
  ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
  ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';
  ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
END IF; END $$;

-- ============================================================================
-- 16. profiles
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles') THEN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
END IF; END $$;

-- ============================================================================
-- 17. question_bank
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'question_bank') THEN
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
END IF; END $$;

-- ============================================================================
-- 18. quizzes
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'quizzes') THEN
  ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 30;
END IF; END $$;

-- ============================================================================
-- 19. quiz_attempts
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'quiz_attempts') THEN
  ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS time_taken INTEGER;
  ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS ip_address TEXT;
  ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS user_agent TEXT;
  ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS device_info JSONB;
END IF; END $$;

-- ============================================================================
-- 20. quiz_questions
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'quiz_questions') THEN
  ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';
  ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_image TEXT;
  ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
  ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS timestamp_seconds INTEGER DEFAULT 0;
  ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS is_checkpoint BOOLEAN DEFAULT false;
END IF; END $$;

-- ============================================================================
-- 21. receipts
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'receipts') THEN
  ALTER TABLE receipts ADD COLUMN IF NOT EXISTS receipt_number TEXT;
  ALTER TABLE receipts ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2);
  ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payment_method TEXT;
  ALTER TABLE receipts ADD COLUMN IF NOT EXISTS reference_number TEXT;
  ALTER TABLE receipts ADD COLUMN IF NOT EXISTS created_by UUID;
END IF; END $$;

-- ============================================================================
-- 22. results
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'results') THEN
  ALTER TABLE results ADD COLUMN IF NOT EXISTS term TEXT;
  ALTER TABLE results ADD COLUMN IF NOT EXISTS academic_year TEXT;
END IF; END $$;

-- ============================================================================
-- 23. review_schedule
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'review_schedule') THEN
  ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS subject_id UUID;
  ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS topic TEXT;
  ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS subtopic TEXT;
  ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 1;
  ALTER TABLE review_schedule ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP;
END IF; END $$;

-- ============================================================================
-- 24. scheme_of_work
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'scheme_of_work') THEN
  ALTER TABLE scheme_of_work ADD COLUMN IF NOT EXISTS class_id UUID;
  ALTER TABLE scheme_of_work ADD COLUMN IF NOT EXISTS subject_id UUID;
  ALTER TABLE scheme_of_work ADD COLUMN IF NOT EXISTS week_number INTEGER;
END IF; END $$;

-- ============================================================================
-- 25. school_settings
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'school_settings') THEN
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
END IF; END $$;

-- ============================================================================
-- 26. sessions
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'sessions') THEN
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS video_url TEXT;
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'youtube';
  ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0;
END IF; END $$;

-- ============================================================================
-- 27. staff
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'staff') THEN
  ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_id TEXT;
  ALTER TABLE staff ADD COLUMN IF NOT EXISTS designation TEXT;
  ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary NUMERIC(12,2);
  ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_employment DATE;
  ALTER TABLE staff ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
END IF; END $$;

-- ============================================================================
-- 28. students
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'students') THEN
  ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_number TEXT;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id UUID;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_id UUID;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS date_of_birth DATE;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS gender TEXT;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name TEXT;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_email TEXT;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS blood_group TEXT;
  ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
END IF; END $$;

-- ============================================================================
-- 29. subjects
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'subjects') THEN
  ALTER TABLE subjects ADD COLUMN IF NOT EXISTS teacher_id UUID;
  ALTER TABLE subjects ADD COLUMN IF NOT EXISTS class_id UUID;
END IF; END $$;

-- ============================================================================
-- 30. teacher_tasks
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'teacher_tasks') THEN
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
END IF; END $$;

-- ============================================================================
-- 31. teacher_evaluations
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'teacher_evaluations') THEN
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
END IF; END $$;

-- ============================================================================
-- 32. terms
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'terms') THEN
  ALTER TABLE terms ADD COLUMN IF NOT EXISTS current_week INTEGER DEFAULT 1;
END IF; END $$;

-- ============================================================================
-- 33. test_attempts
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'test_attempts') THEN
  ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS time_taken INTEGER;
  ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS ip_address TEXT;
  ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS user_agent TEXT;
  ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS device_info JSONB;
  ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS tab_switches INTEGER DEFAULT 0;
  ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS fullscreen_exits INTEGER DEFAULT 0;
END IF; END $$;

-- ============================================================================
-- 34. test_questions
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'test_questions') THEN
  ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS question_image TEXT;
  ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS options_images TEXT[];
  ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';
  ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS subject TEXT;
  ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
END IF; END $$;

-- ============================================================================
-- 35. tests
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tests') THEN
  ALTER TABLE tests ADD COLUMN IF NOT EXISTS allow_image BOOLEAN DEFAULT false;
  ALTER TABLE tests ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false;
  ALTER TABLE tests ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT false;
  ALTER TABLE tests ADD COLUMN IF NOT EXISTS require_fullscreen BOOLEAN DEFAULT false;
  ALTER TABLE tests ADD COLUMN IF NOT EXISTS prevent_tab_switch BOOLEAN DEFAULT false;
  ALTER TABLE tests ADD COLUMN IF NOT EXISTS max_tab_switches INTEGER DEFAULT 3;
  ALTER TABLE tests ADD COLUMN IF NOT EXISTS allow_camera BOOLEAN DEFAULT false;
END IF; END $$;

-- ============================================================================
-- 36. transactions
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'transactions') THEN
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recorded_by UUID;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category TEXT;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_number TEXT;
END IF; END $$;

-- ============================================================================
-- 37. id_cards
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'id_cards') THEN
  ALTER TABLE id_cards ADD COLUMN IF NOT EXISTS card_number TEXT;
  ALTER TABLE id_cards ADD COLUMN IF NOT EXISTS qr_code TEXT;
  ALTER TABLE id_cards ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ALTER TABLE id_cards ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP;
  ALTER TABLE id_cards ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
END IF; END $$;

-- ============================================================================
-- 38. entrance_codes
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'entrance_codes') THEN
  ALTER TABLE entrance_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
END IF; END $$;

-- ============================================================================
-- 39. behavioral_reports
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'behavioral_reports') THEN
  ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS week_start DATE;
  ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS week_end DATE;
  ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS rating INTEGER;
  ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS punctuality INTEGER;
  ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS class_participation INTEGER;
  ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS homework_completion INTEGER;
  ALTER TABLE behavioral_reports ADD COLUMN IF NOT EXISTS teacher_notes TEXT;
END IF; END $$;

-- ============================================================================
-- 40. student_risk_predictions
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'student_risk_predictions') THEN
  ALTER TABLE student_risk_predictions ADD COLUMN IF NOT EXISTS is_acknowledged BOOLEAN DEFAULT false;
  ALTER TABLE student_risk_predictions ADD COLUMN IF NOT EXISTS acknowledged_by UUID;
  ALTER TABLE student_risk_predictions ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;
END IF; END $$;

-- ============================================================================
-- 41. announcements_messages
-- ============================================================================
DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'announcements_messages') THEN
  ALTER TABLE announcements_messages ADD COLUMN IF NOT EXISTS recipient_id UUID;
END IF; END $$;

-- ============================================================================
-- FINAL: Update schema version tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);
