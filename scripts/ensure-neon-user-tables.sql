-- ============================================================================
-- ENSURE NEON USER-MANAGEMENT TABLES & COLUMNS EXIST
-- ============================================================================
-- Safe to re-run. Creates anything missing for the Neon-first user
-- management upgrade. Run against the Neon database:
--   psql "$NEON_DATABASE_URL" -f scripts/ensure-neon-user-tables.sql
-- ============================================================================

-- password_hash column on profiles (used for local credential fallback)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- last_read_announcements (kept in sync with Supabase profiles)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_read_announcements TIMESTAMP;

-- staff.status (drives the active/inactive badge in user management; default active)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

-- teacher_classes junction (many-to-many Teacher <-> Class)
CREATE TABLE IF NOT EXISTS teacher_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, class_id)
);

-- parent_students junction (Parent <-> Student)
CREATE TABLE IF NOT EXISTS parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship TEXT CHECK (relationship IN ('father', 'mother', 'guardian', 'other')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- Students: ensure profile_id is unique so upserts are deterministic
-- (newer schema declares it UNIQUE; older Neon instances may not)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'students'
      AND indexdef ILIKE '%(profile_id)%'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_profile_id_key UNIQUE (profile_id);
  END IF;
END $$;

-- Indexes for fast filtering / lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON students(profile_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_staff_profile_id ON staff(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_department_id ON staff(department_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher_id ON teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class_id ON teacher_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent_id ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student_id ON parent_students(student_id);

-- Migrate legacy teacher assignments into teacher_classes (idempotent)
INSERT INTO teacher_classes (teacher_id, class_id)
  SELECT form_teacher_id, id FROM classes
  WHERE form_teacher_id IS NOT NULL
  ON CONFLICT (teacher_id, class_id) DO NOTHING;

INSERT INTO teacher_classes (teacher_id, class_id)
  SELECT class_teacher_id, id FROM classes
  WHERE class_teacher_id IS NOT NULL
  ON CONFLICT (teacher_id, class_id) DO NOTHING;

INSERT INTO teacher_classes (teacher_id, class_id)
  SELECT DISTINCT teacher_id, class_id FROM subjects
  WHERE teacher_id IS NOT NULL AND class_id IS NOT NULL
  ON CONFLICT (teacher_id, class_id) DO NOTHING;

-- Migrate legacy student.parent_id into parent_students (idempotent)
INSERT INTO parent_students (parent_id, student_id, relationship)
  SELECT parent_id, profile_id, 'guardian' FROM students
  WHERE parent_id IS NOT NULL
  ON CONFLICT (parent_id, student_id) DO NOTHING;