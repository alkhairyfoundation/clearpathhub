-- ============================================================================
-- CLEARPATH EDU HUB - MERGED SEED DATA
-- ============================================================================
-- SAFE TO RE-RUN: Uses INSERT ... ON CONFLICT DO NOTHING
-- Run AFTER running MERGED_SCHEMA_COMPLETE.sql
-- Last Updated: May 14, 2026
-- ============================================================================

-- ============================================================================
-- PART 0: ENSURE COLUMNS EXIST (idempotent - safe for existing tables)
-- ============================================================================

-- school_settings
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS school_name TEXT;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS school_motto TEXT;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS school_address TEXT;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS school_phone TEXT;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS school_email TEXT;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS secondary_color TEXT;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS accent_color TEXT;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS term TEXT;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS session_start DATE;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS session_end DATE;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS current_session_id UUID;
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS current_term_id UUID;

-- departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_id UUID;

-- subjects
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department_id UUID;

-- classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS form_teacher_id UUID;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 50;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_teacher_id UUID;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS department_id UUID;

-- entrance_exams
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS exam_date DATE;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS passing_score INTEGER;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS total_questions INTEGER;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS require_fullscreen BOOLEAN DEFAULT false;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS prevent_tab_switch BOOLEAN DEFAULT false;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS max_tab_switches INTEGER DEFAULT 3;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS created_by UUID;

-- entrance_codes
ALTER TABLE entrance_codes ADD COLUMN IF NOT EXISTS exam_id UUID;
ALTER TABLE entrance_codes ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE entrance_codes ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 100;
ALTER TABLE entrance_codes ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;
ALTER TABLE entrance_codes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE entrance_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- academic_sessions
ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;

-- terms
ALTER TABLE terms ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE terms ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE terms ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE terms ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE terms ADD COLUMN IF NOT EXISTS current_week INTEGER DEFAULT 1;
ALTER TABLE terms ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;

-- term_weeks
ALTER TABLE term_weeks ADD COLUMN IF NOT EXISTS term_id UUID;
ALTER TABLE term_weeks ADD COLUMN IF NOT EXISTS week_number INTEGER;
ALTER TABLE term_weeks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE term_weeks ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE term_weeks ADD COLUMN IF NOT EXISTS label TEXT;



-- ============================================================================
-- PART 1: BASIC INITIALIZATION DATA
-- ============================================================================

-- Ensure school settings exist (idempotent)
INSERT INTO school_settings (school_name, school_motto, school_address, school_phone, school_email, primary_color, secondary_color, accent_color, academic_year, term, session_start, session_end)
SELECT 'ClearPath Edu Hub', 'Excellence in Education', '123 School Street, City', '+1234567890', 'info@clearpatheduhub.com', '#2563eb', '#1e293b', '#10b981', '2025-2026', 'First Term', '2025-09-01'::DATE, '2026-06-30'::DATE
WHERE NOT EXISTS (SELECT 1 FROM school_settings);

-- ============================================================================
-- PART 2: DEPARTMENTS
-- ============================================================================

INSERT INTO departments (name, code, head_id, created_at)
VALUES 
  ('Science', 'SCI', NULL, NOW()),
  ('Arts', 'ART', NULL, NOW()),
  ('Commerce', 'COM', NULL, NOW()),
  ('Technology', 'TECH', NULL, NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 3: SUBJECTS
-- ============================================================================

INSERT INTO subjects (name, code, department_id, created_at)
SELECT 
  'English',
  'ENG',
  (SELECT id FROM departments WHERE code = 'ART' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'ENG')

UNION ALL

SELECT 
  'Mathematics',
  'MATH',
  (SELECT id FROM departments WHERE code = 'SCI' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'MATH')

UNION ALL

SELECT 
  'Physics',
  'PHY',
  (SELECT id FROM departments WHERE code = 'SCI' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'PHY')

UNION ALL

SELECT 
  'Chemistry',
  'CHEM',
  (SELECT id FROM departments WHERE code = 'SCI' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'CHEM')

UNION ALL

SELECT 
  'Biology',
  'BIO',
  (SELECT id FROM departments WHERE code = 'SCI' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'BIO')

UNION ALL

SELECT 
  'History',
  'HIST',
  (SELECT id FROM departments WHERE code = 'ART' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'HIST')

UNION ALL

SELECT 
  'Geography',
  'GEO',
  (SELECT id FROM departments WHERE code = 'ART' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'GEO')

UNION ALL

SELECT 
  'Economics',
  'ECON',
  (SELECT id FROM departments WHERE code = 'COM' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'ECON')

UNION ALL

SELECT 
  'Computer Science',
  'CS',
  (SELECT id FROM departments WHERE code = 'TECH' LIMIT 1),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE code = 'CS');

-- ============================================================================
-- PART 4: CLASSES
-- ============================================================================

-- Ensure columns exist on classes table (idempotent)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS form_teacher_id UUID;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 50;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_teacher_id UUID;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS name TEXT;

INSERT INTO classes (name, level, form_teacher_id, capacity, created_at)
VALUES 
  ('Primary 1', 'PRIMARY', NULL, 40, NOW()),
  ('Primary 2', 'PRIMARY', NULL, 40, NOW()),
  ('Primary 3', 'PRIMARY', NULL, 40, NOW()),
  ('Primary 4', 'PRIMARY', NULL, 40, NOW()),
  ('Primary 5', 'PRIMARY', NULL, 40, NOW()),
  ('Primary 6', 'PRIMARY', NULL, 40, NOW()),
  ('JSS 1', 'JSS', NULL, 50, NOW()),
  ('JSS 2', 'JSS', NULL, 50, NOW()),
  ('JSS 3', 'JSS', NULL, 50, NOW()),
  ('SS 1', 'SS1', NULL, 50, NOW()),
  ('SS 2', 'SS2', NULL, 50, NOW()),
  ('SS 3', 'SS3', NULL, 50, NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 5: ENTRANCE EXAMS (Sample)
-- ============================================================================

INSERT INTO entrance_exams (title, description, level, academic_year, exam_date, duration_minutes, passing_score, total_questions, shuffle_questions, require_fullscreen, prevent_tab_switch, max_tab_switches, is_published, is_active, created_by, created_at)
VALUES 
  (
    'JSS 1 Entrance Examination',
    'Entrance examination for admission to JSS 1 (Junior Secondary School 1)',
    'JSS',
    '2025-2026',
    '2025-09-15'::DATE,
    90,
    50,
    40,
    true,
    false,
    false,
    3,
    true,
    true,
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
    NOW()
  ),
  (
    'SS 1 Entrance Examination',
    'Entrance examination for admission to SS 1 (Senior Secondary School 1)',
    'SS1',
    '2025-2026',
    '2025-09-16'::DATE,
    120,
    50,
    60,
    true,
    false,
    false,
    3,
    true,
    true,
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
    NOW()
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 6: ENTRANCE CODES (Sample)
-- ============================================================================

INSERT INTO entrance_codes (exam_id, code, max_uses, used_count, is_active, expires_at, created_at)
SELECT 
  id,
  'JSSEN' || SUBSTRING(gen_random_uuid()::TEXT, 1, 4),
  100,
  0,
  true,
  (NOW() + INTERVAL '90 days'),
  NOW()
FROM entrance_exams 
WHERE title = 'JSS 1 Entrance Examination'
  AND NOT EXISTS (SELECT 1 FROM entrance_codes WHERE exam_id = entrance_exams.id LIMIT 1)

UNION ALL

SELECT 
  id,
  'SSSEN' || SUBSTRING(gen_random_uuid()::TEXT, 1, 4),
  100,
  0,
  true,
  (NOW() + INTERVAL '90 days'),
  NOW()
FROM entrance_exams 
WHERE title = 'SS 1 Entrance Examination'
  AND NOT EXISTS (SELECT 1 FROM entrance_codes WHERE exam_id = entrance_exams.id LIMIT 1);

-- ============================================================================
-- PART 7: ACADEMIC SESSIONS
-- ============================================================================

INSERT INTO academic_sessions (name, start_date, end_date, is_current, created_at)
SELECT '2025-2026', '2025-09-01'::DATE, '2026-06-30'::DATE, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM academic_sessions WHERE name = '2025-2026');

-- ============================================================================
-- PART 8: TERMS
-- ============================================================================

INSERT INTO terms (session_id, name, start_date, end_date, current_week, is_current, created_at)
SELECT 
  (SELECT id FROM academic_sessions WHERE name = '2025-2026' LIMIT 1),
  'First Term',
  '2025-09-01'::DATE,
  '2025-12-15'::DATE,
  1,
  true,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM terms WHERE name = 'First Term' AND session_id = (SELECT id FROM academic_sessions WHERE name = '2025-2026' LIMIT 1))

UNION ALL

SELECT 
  (SELECT id FROM academic_sessions WHERE name = '2025-2026' LIMIT 1),
  'Second Term',
  '2026-01-10'::DATE,
  '2026-04-15'::DATE,
  1,
  false,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM terms WHERE name = 'Second Term' AND session_id = (SELECT id FROM academic_sessions WHERE name = '2025-2026' LIMIT 1))

UNION ALL

SELECT 
  (SELECT id FROM academic_sessions WHERE name = '2025-2026' LIMIT 1),
  'Third Term',
  '2026-04-20'::DATE,
  '2026-07-15'::DATE,
  1,
  false,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM terms WHERE name = 'Third Term' AND session_id = (SELECT id FROM academic_sessions WHERE name = '2025-2026' LIMIT 1));

-- ============================================================================
-- PART 9: TERM WEEKS (First Term)
-- ============================================================================

INSERT INTO term_weeks (term_id, week_number, start_date, end_date, label)
SELECT 
  (SELECT id FROM terms WHERE name = 'First Term' LIMIT 1),
  week_num,
  ('2025-09-01'::DATE + (week_num - 1) * 7),
  ('2025-09-01'::DATE + (week_num - 1) * 7 + 6),
  'Week ' || week_num
FROM generate_series(1, 16) AS week_num
WHERE NOT EXISTS (
  SELECT 1 FROM term_weeks 
  WHERE term_id = (SELECT id FROM terms WHERE name = 'First Term' LIMIT 1)
  AND week_number = week_num
);

-- ============================================================================
-- PART 10: UPDATE SCHOOL SETTINGS WITH CURRENT SESSION/TERM
-- ============================================================================

UPDATE school_settings 
SET 
  current_session_id = (SELECT id FROM academic_sessions WHERE is_current = true LIMIT 1),
  current_term_id = (SELECT id FROM terms WHERE is_current = true LIMIT 1)
WHERE current_session_id IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show initialization summary
SELECT 
  'TABLES INITIALIZED' as status,
  'All core tables created' as details
UNION ALL
SELECT 'DEPARTMENTS', COUNT(*) || ' departments created' FROM departments
UNION ALL
SELECT 'SUBJECTS', COUNT(*) || ' subjects created' FROM subjects
UNION ALL
SELECT 'CLASSES', COUNT(*) || ' classes created' FROM classes
UNION ALL
SELECT 'ACADEMIC_SESSIONS', COUNT(*) || ' sessions created' FROM academic_sessions
UNION ALL
SELECT 'TERMS', COUNT(*) || ' terms created' FROM terms
UNION ALL
SELECT 'ENTRANCE_EXAMS', COUNT(*) || ' sample exams created' FROM entrance_exams
UNION ALL
SELECT 'ENTRANCE_CODES', COUNT(*) || ' exam codes generated' FROM entrance_codes;

-- ============================================================================
-- COMPLETION
-- ============================================================================
