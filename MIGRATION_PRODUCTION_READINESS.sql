-- =============================================================
-- MIGRATION: Production Readiness - Schema Hardening
-- Apply this AFTER COMPLETE_SCHEMA.sql
-- =============================================================

-- 1. BEHAVIORAL REPORTS: Add missing columns for parent dashboard
ALTER TABLE behavioral_reports
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general' CHECK (type IN ('positive', 'warning', 'concern', 'general')),
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES profiles(id);

-- 2. PARENT-STUDENT JUNCTION TABLE (many-to-many support)
CREATE TABLE IF NOT EXISTS parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  relationship TEXT CHECK (relationship IN ('father', 'mother', 'guardian', 'other')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- 3. ADD ON DELETE SET NULL to students.parent_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'students_parent_id_fkey'
    AND table_name = 'students'
  ) THEN
    ALTER TABLE students DROP CONSTRAINT students_parent_id_fkey;
  END IF;
END $$;
ALTER TABLE students ADD FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 4. ADD UNIQUE constraint on students.profile_id
-- (cleanup duplicates first if any, keeping the earliest record)
DELETE FROM students a USING students b
  WHERE a.id < b.id AND a.profile_id = b.profile_id;
ALTER TABLE students ADD UNIQUE (profile_id);

-- 5. ADD ANNOUNCEMENT READ TRACKING
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(announcement_id, profile_id)
);

-- 6. ADD AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON students(profile_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_results_student_subject ON results(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_reports_student ON behavioral_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_class ON homework(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class ON sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_lessons_class ON lessons(class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(audience);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_activity_logs_student ON exam_activity_logs(student_id);

-- 8. ROW LEVEL SECURITY POLICIES
-- Note: RLS must already be enabled on these tables (see COMPLETE_SCHEMA.sql)

-- 8a. Students table
DROP POLICY IF EXISTS "Students view own record" ON students;
CREATE POLICY "Students view own record" ON students
  FOR SELECT USING (
    auth.uid() = profile_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
    OR parent_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can insert students" ON students;
CREATE POLICY "Admins can insert students" ON students
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

DROP POLICY IF EXISTS "Admins can update students" ON students;
CREATE POLICY "Admins can update students" ON students
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 8b. Attendance
DROP POLICY IF EXISTS "Students view own attendance" ON attendance;
CREATE POLICY "Students view own attendance" ON attendance
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Parents view children attendance" ON attendance;
CREATE POLICY "Parents view children attendance" ON attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students WHERE profile_id = attendance.student_id AND parent_id = auth.uid())
  );

DROP POLICY IF EXISTS "Teachers view class attendance" ON attendance;
CREATE POLICY "Teachers view class attendance" ON attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- 8c. Results
DROP POLICY IF EXISTS "Students view own results" ON results;
CREATE POLICY "Students view own results" ON results
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Parents view children results" ON results;
CREATE POLICY "Parents view children results" ON results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students WHERE profile_id = results.student_id AND parent_id = auth.uid())
  );

-- 8d. Behavioral reports
DROP POLICY IF EXISTS "Parents view children behavior" ON behavioral_reports;
CREATE POLICY "Parents view children behavior" ON behavioral_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students WHERE profile_id = behavioral_reports.student_id AND parent_id = auth.uid())
    OR student_id = auth.uid()
  );

-- 8e. Invoices
DROP POLICY IF EXISTS "Parents view children invoices" ON invoices;
CREATE POLICY "Parents view children invoices" ON invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students WHERE profile_id = invoices.student_id AND parent_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'accountant')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 8f. Parent-students junction
DROP POLICY IF EXISTS "Parents view own links" ON parent_students;
CREATE POLICY "Parents view own links" ON parent_students
  FOR SELECT USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "Admin manage parent links" ON parent_students;
CREATE POLICY "Admin manage parent links" ON parent_students
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 8g. Announcement reads
DROP POLICY IF EXISTS "Users manage own reads" ON announcement_reads;
CREATE POLICY "Users manage own reads" ON announcement_reads
  FOR ALL USING (profile_id = auth.uid());

-- 9. PROFILES: Restrict view to authenticated users only (not public)
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Authenticated users can view profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 10. ENTRANCE EXAM QUERY FIX: Add index for email lookup
CREATE INDEX IF NOT EXISTS idx_entrance_applications_email ON entrance_applications(email);
