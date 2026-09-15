-- ============================================================================
-- ENSURE NEON TEACHER WORK TABLES EXIST
-- ============================================================================
-- Creates teacher_tasks and teacher_evaluations in Neon (source of truth)
-- and migrates existing Supabase rows. Safe to re-run.
-- Applied via scripts/migrate-teacher-work-rows.js (no psql required).
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  task_type TEXT,
  title TEXT,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  submission_url TEXT,
  grade TEXT,
  admin_grade INTEGER,
  feedback TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  evaluation_type TEXT,
  title TEXT,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMP,
  score NUMERIC(5,2),
  admin_notes TEXT,
  evaluated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  evaluated_at TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_tasks_teacher_id ON teacher_tasks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_tasks_status ON teacher_tasks(status);
CREATE INDEX IF NOT EXISTS idx_teacher_evaluations_teacher_id ON teacher_evaluations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_evaluations_status ON teacher_evaluations(status);