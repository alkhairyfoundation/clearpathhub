-- ============================================================================
-- Create teacher_classes junction table to support many-to-many
-- Teacher <-> Class relationships
-- ============================================================================

-- Create the junction table
CREATE TABLE IF NOT EXISTS teacher_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, class_id)
);

-- Add RLS
ALTER TABLE teacher_classes ENABLE ROW LEVEL SECURITY;

-- Allow admins full access
CREATE POLICY "Admins can manage teacher_classes"
  ON teacher_classes
  FOR ALL
  USING (public.get_user_role() = 'admin');

-- Teachers can view their own assignments
CREATE POLICY "Teachers can view own assignments"
  ON teacher_classes
  FOR SELECT
  USING (teacher_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE teacher_classes;

-- ============================================================================
-- Migrate existing form_teacher_id data into teacher_classes
-- ============================================================================
INSERT INTO teacher_classes (teacher_id, class_id)
  SELECT form_teacher_id, id FROM classes
  WHERE form_teacher_id IS NOT NULL
  ON CONFLICT (teacher_id, class_id) DO NOTHING;

-- Also migrate existing teacher_id from subjects into teacher_classes
-- (so teachers retain access to classes they were assigned subjects for)
INSERT INTO teacher_classes (teacher_id, class_id)
  SELECT DISTINCT teacher_id, class_id FROM subjects
  WHERE teacher_id IS NOT NULL AND class_id IS NOT NULL
  ON CONFLICT (teacher_id, class_id) DO NOTHING;
