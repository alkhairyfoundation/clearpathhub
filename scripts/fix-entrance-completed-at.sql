-- Comprehensive migration: Ensure all entrance exam table columns exist
-- Tables were initially created with CREATE TABLE IF NOT EXISTS,
-- so schema changes from later migrations were never applied.

-- ============================================================================
-- entrance_exams: ensure all columns exist
-- ============================================================================
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS require_fullscreen BOOLEAN DEFAULT false;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS prevent_tab_switch BOOLEAN DEFAULT false;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS max_tab_switches INTEGER DEFAULT 3;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS created_by UUID;

-- ============================================================================
-- entrance_questions: ensure all columns exist
-- ============================================================================
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS subtopic TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 1;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS question_image TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS option_images TEXT[];

-- ============================================================================
-- entrance_applications: ensure all columns exist
-- ============================================================================
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS exam_score INTEGER;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS mastery_level TEXT CHECK (mastery_level IN ('POOR', 'GOOD', 'EXCELLENT', 'PROFICIENT', 'MASTERED'));
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS subject_scores JSONB;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS topic_mastery JSONB;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS admitted_class TEXT;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS security_events JSONB;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS answers JSONB;
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- ============================================================================
-- entrance_codes: ensure all columns exist
-- ============================================================================
ALTER TABLE entrance_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- ============================================================================
-- student_analytics: ensure all columns exist
-- ============================================================================
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS mastery_level TEXT CHECK (mastery_level IN ('POOR', 'GOOD', 'EXCELLENT', 'PROFICIENT', 'MASTERED'));
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS topic_performance JSONB;
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS student_email TEXT;
ALTER TABLE student_analytics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
