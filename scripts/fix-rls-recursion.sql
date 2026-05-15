-- ============================================================================
-- FIX: Infinite RLS recursion caused by policies subquerying profiles table
-- ============================================================================
-- The root cause: policies like
--   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
-- trigger RLS on profiles, which runs the same policy again → infinite recursion → 500
--
-- Solution:
--   1. Create a SECURITY DEFINER function that queries profiles bypassing RLS
--   2. Drop all offending policies
--   3. Recreate them using the helper function
--   4. Re-enable RLS on all tables
-- ============================================================================

-- ============================================================================
-- STEP 0: Create helper function (bypasses RLS via SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================================
-- STEP 1: Drop ALL existing RLS policies that subquery profiles
-- ============================================================================

-- Profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Students
DROP POLICY IF EXISTS "Students can view own record" ON students;
DROP POLICY IF EXISTS "Teachers can view all students" ON students;
DROP POLICY IF EXISTS "Admins can manage students" ON students;

-- Classes
DROP POLICY IF EXISTS "Anyone can view classes" ON classes;
DROP POLICY IF EXISTS "Admins can manage classes" ON classes;

-- Subjects
DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;

-- Departments
DROP POLICY IF EXISTS "Anyone can view departments" ON departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

-- Sessions
DROP POLICY IF EXISTS "Published sessions are viewable" ON sessions;
DROP POLICY IF EXISTS "Teachers can manage own sessions" ON sessions;

-- Quizzes
DROP POLICY IF EXISTS "Students can attempt quizzes" ON quizzes;
DROP POLICY IF EXISTS "Teachers can manage quizzes" ON quizzes;

-- Quiz Attempts
DROP POLICY IF EXISTS "Students can view own attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Teachers can view all attempts" ON quiz_attempts;

-- Lessons
DROP POLICY IF EXISTS "Published lessons are viewable" ON lessons;
DROP POLICY IF EXISTS "Teachers can manage own lessons" ON lessons;

-- Homework
DROP POLICY IF EXISTS "Homework is viewable by students and teachers" ON homework;
DROP POLICY IF EXISTS "Teachers can manage homework" ON homework;

-- Homework Submissions
DROP POLICY IF EXISTS "Students can view own submissions" ON homework_submissions;
DROP POLICY IF EXISTS "Teachers can view all submissions" ON homework_submissions;

-- Attendance
DROP POLICY IF EXISTS "Students can view own attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can manage attendance" ON attendance;

-- Staff Attendance
DROP POLICY IF EXISTS "Staff can view own attendance" ON staff_attendance;
DROP POLICY IF EXISTS "Admins can manage staff attendance" ON staff_attendance;

-- Results
DROP POLICY IF EXISTS "Students can view own results" ON results;
DROP POLICY IF EXISTS "Teachers can manage results" ON results;

-- Behavioral Reports
DROP POLICY IF EXISTS "Students can view own reports" ON behavioral_reports;
DROP POLICY IF EXISTS "Teachers can manage reports" ON behavioral_reports;

-- Announcements
DROP POLICY IF EXISTS "Anyone can view announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;

-- Transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Accountants can manage transactions" ON transactions;

-- Invoices
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Accountants can manage invoices" ON invoices;

-- Receipts
DROP POLICY IF EXISTS "Users can view own receipts" ON receipts;
DROP POLICY IF EXISTS "Accountants can manage receipts" ON receipts;

-- ID Cards
DROP POLICY IF EXISTS "Users can view own ID cards" ON id_cards;
DROP POLICY IF EXISTS "Admins can manage ID cards" ON id_cards;

-- Entrance Exams
DROP POLICY IF EXISTS "Anyone can view entrance exams" ON entrance_exams;
DROP POLICY IF EXISTS "Admins can manage entrance exams" ON entrance_exams;

-- Entrance Questions
DROP POLICY IF EXISTS "Anyone can view entrance questions" ON entrance_questions;
DROP POLICY IF EXISTS "Admins can manage entrance questions" ON entrance_questions;

-- Entrance Codes
DROP POLICY IF EXISTS "Entrance codes viewable by all" ON entrance_codes;
DROP POLICY IF EXISTS "Admins can manage entrance codes" ON entrance_codes;

-- Entrance Applications
DROP POLICY IF EXISTS "Users can view own application" ON entrance_applications;
DROP POLICY IF EXISTS "Users can insert own application" ON entrance_applications;
DROP POLICY IF EXISTS "Admins can manage applications" ON entrance_applications;

-- Question Bank
DROP POLICY IF EXISTS "Question bank is viewable" ON question_bank;
DROP POLICY IF EXISTS "Teachers can manage question bank" ON question_bank;

-- Student Analytics
DROP POLICY IF EXISTS "Students can view own analytics" ON student_analytics;
DROP POLICY IF EXISTS "Teachers can view student analytics" ON student_analytics;

-- Mastery Tracking
DROP POLICY IF EXISTS "Students can view own mastery" ON mastery_tracking;
DROP POLICY IF EXISTS "Teachers can view student mastery" ON mastery_tracking;
DROP POLICY IF EXISTS "Students can insert own mastery" ON mastery_tracking;

-- Mastery Practice Logs
DROP POLICY IF EXISTS "Students can view own practice logs" ON mastery_practice_logs;
DROP POLICY IF EXISTS "Students can insert own practice logs" ON mastery_practice_logs;

-- Mastery Scores
DROP POLICY IF EXISTS "Students can view own scores" ON mastery_scores;
DROP POLICY IF EXISTS "Students can insert own scores" ON mastery_scores;

-- Scheme of Work
DROP POLICY IF EXISTS "Anyone can view scheme of work" ON scheme_of_work;
DROP POLICY IF EXISTS "Teachers can manage scheme of work" ON scheme_of_work;

-- Messages
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;

-- Practice Sessions
DROP POLICY IF EXISTS "Students can view own practice sessions" ON practice_sessions;
DROP POLICY IF EXISTS "Students can insert practice sessions" ON practice_sessions;

-- Practice Attempts
DROP POLICY IF EXISTS "Students can view own attempts" ON practice_attempts;
DROP POLICY IF EXISTS "Students can insert own attempts" ON practice_attempts;

-- Daily Goals
DROP POLICY IF EXISTS "Students can view own daily goals" ON daily_goals;
DROP POLICY IF EXISTS "Students can manage own daily goals" ON daily_goals;

-- Learning Streaks
DROP POLICY IF EXISTS "Students can view own streaks" ON learning_streaks;
DROP POLICY IF EXISTS "Students can update own streaks" ON learning_streaks;

-- Badges
DROP POLICY IF EXISTS "Students can view own badges" ON badges;

-- Review Schedule
DROP POLICY IF EXISTS "Students can view own review schedule" ON review_schedule;
DROP POLICY IF EXISTS "Students can manage own review schedule" ON review_schedule;

-- School Settings
DROP POLICY IF EXISTS "School settings viewable by all" ON school_settings;
DROP POLICY IF EXISTS "Admins can update school settings" ON school_settings;

-- Announcements Messages
DROP POLICY IF EXISTS "Users can view own announcement messages" ON announcements_messages;

-- ============================================================================
-- STEP 2: Disable RLS on all tables first (clean slate)
-- ============================================================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE terms DISABLE ROW LEVEL SECURITY;
ALTER TABLE term_weeks DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE homework DISABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE results DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE id_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE spaced_repetition_schedule DISABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_practice_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_of_work DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE practice_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_streaks DISABLE ROW LEVEL SECURITY;
ALTER TABLE badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE review_schedule DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Recreate all policies using get_user_role() helper
-- ============================================================================

-- Profile Policies (simpler — no recursive subquery)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (public.get_user_role() = 'admin');

-- Students Policies
CREATE POLICY "Students can view own record" ON students FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Teachers can view all students" ON students FOR SELECT USING (public.get_user_role() IN ('teacher', 'admin'));
CREATE POLICY "Admins can manage students" ON students FOR ALL USING (public.get_user_role() = 'admin');

-- Classes Policies
CREATE POLICY "Anyone can view classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Admins can manage classes" ON classes FOR ALL USING (public.get_user_role() = 'admin');

-- Subjects Policies
CREATE POLICY "Anyone can view subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Admins can manage subjects" ON subjects FOR ALL USING (public.get_user_role() = 'admin');

-- Departments Policies
CREATE POLICY "Anyone can view departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Admins can manage departments" ON departments FOR ALL USING (public.get_user_role() = 'admin');

-- Sessions Policies
CREATE POLICY "Published sessions are viewable" ON sessions FOR SELECT USING (is_published = true OR teacher_id = auth.uid() OR public.get_user_role() = 'admin');
CREATE POLICY "Teachers can manage own sessions" ON sessions FOR ALL USING (public.get_user_role() = 'teacher' AND teacher_id = auth.uid());

-- Quizzes Policies
CREATE POLICY "Students can attempt quizzes" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Teachers can manage quizzes" ON quizzes FOR ALL USING (public.get_user_role() IN ('teacher', 'admin'));

-- Quiz Attempts Policies
CREATE POLICY "Students can view own attempts" ON quiz_attempts FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Teachers can view all attempts" ON quiz_attempts FOR SELECT USING (public.get_user_role() IN ('teacher', 'admin'));

-- Lessons Policies
CREATE POLICY "Published lessons are viewable" ON lessons FOR SELECT USING (is_published = true OR teacher_id = auth.uid() OR public.get_user_role() = 'admin');
CREATE POLICY "Teachers can manage own lessons" ON lessons FOR ALL USING (public.get_user_role() = 'teacher' AND teacher_id = auth.uid());

-- Homework Policies
CREATE POLICY "Homework is viewable by students and teachers" ON homework FOR SELECT USING (true);
CREATE POLICY "Teachers can manage homework" ON homework FOR ALL USING (public.get_user_role() IN ('teacher', 'admin'));

-- Homework Submissions Policies
CREATE POLICY "Students can view own submissions" ON homework_submissions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Teachers can view all submissions" ON homework_submissions FOR SELECT USING (public.get_user_role() IN ('teacher', 'admin'));

-- Attendance Policies
CREATE POLICY "Students can view own attendance" ON attendance FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Teachers can manage attendance" ON attendance FOR ALL USING (public.get_user_role() IN ('teacher', 'admin'));

-- Staff Attendance Policies
CREATE POLICY "Staff can view own attendance" ON staff_attendance FOR SELECT USING (staff_id = auth.uid());
CREATE POLICY "Admins can manage staff attendance" ON staff_attendance FOR ALL USING (public.get_user_role() = 'admin');

-- Results Policies
CREATE POLICY "Students can view own results" ON results FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Teachers can manage results" ON results FOR ALL USING (public.get_user_role() IN ('teacher', 'admin'));

-- Behavioral Reports Policies
CREATE POLICY "Students can view own reports" ON behavioral_reports FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Teachers can manage reports" ON behavioral_reports FOR ALL USING (public.get_user_role() IN ('teacher', 'admin'));

-- Announcements Policies
CREATE POLICY "Anyone can view announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Admins can manage announcements" ON announcements FOR ALL USING (public.get_user_role() = 'admin');

-- Transactions Policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (student_id = auth.uid() OR parent_id = auth.uid());
CREATE POLICY "Accountants can manage transactions" ON transactions FOR ALL USING (public.get_user_role() IN ('accountant', 'admin'));

-- Invoices Policies
CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (student_id = auth.uid() OR parent_id = auth.uid());
CREATE POLICY "Accountants can manage invoices" ON invoices FOR ALL USING (public.get_user_role() IN ('accountant', 'admin'));

-- Receipts Policies
CREATE POLICY "Users can view own receipts" ON receipts FOR SELECT USING (student_id = auth.uid() OR parent_id = auth.uid());
CREATE POLICY "Accountants can manage receipts" ON receipts FOR ALL USING (public.get_user_role() IN ('accountant', 'admin'));

-- ID Cards Policies
CREATE POLICY "Users can view own ID cards" ON id_cards FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins can manage ID cards" ON id_cards FOR ALL USING (public.get_user_role() = 'admin');

-- Entrance Exams Policies
CREATE POLICY "Anyone can view entrance exams" ON entrance_exams FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage entrance exams" ON entrance_exams FOR ALL USING (public.get_user_role() = 'admin');

-- Entrance Questions Policies
CREATE POLICY "Anyone can view entrance questions" ON entrance_questions FOR SELECT USING (true);
CREATE POLICY "Admins can manage entrance questions" ON entrance_questions FOR ALL USING (public.get_user_role() = 'admin');

-- Entrance Codes Policies
CREATE POLICY "Entrance codes viewable by all" ON entrance_codes FOR SELECT USING (true);
CREATE POLICY "Admins can manage entrance codes" ON entrance_codes FOR ALL USING (public.get_user_role() = 'admin');

-- Entrance Applications Policies
CREATE POLICY "Users can view own application" ON entrance_applications FOR SELECT USING (email = auth.jwt()->>'email');
CREATE POLICY "Users can insert own application" ON entrance_applications FOR INSERT WITH CHECK (email = auth.jwt()->>'email');
CREATE POLICY "Admins can manage applications" ON entrance_applications FOR ALL USING (public.get_user_role() = 'admin');

-- Question Bank Policies
CREATE POLICY "Question bank is viewable" ON question_bank FOR SELECT USING (is_active = true OR public.get_user_role() IN ('teacher', 'admin'));
CREATE POLICY "Teachers can manage question bank" ON question_bank FOR ALL USING (public.get_user_role() IN ('teacher', 'admin'));

-- Student Analytics Policies
CREATE POLICY "Students can view own analytics" ON student_analytics FOR SELECT USING (student_email = auth.jwt()->>'email');
CREATE POLICY "Teachers can view student analytics" ON student_analytics FOR SELECT USING (public.get_user_role() IN ('teacher', 'admin'));

-- Mastery Tracking Policies
CREATE POLICY "Students can view own mastery" ON mastery_tracking FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Teachers can view student mastery" ON mastery_tracking FOR SELECT USING (public.get_user_role() IN ('teacher', 'admin'));
CREATE POLICY "Students can insert own mastery" ON mastery_tracking FOR INSERT WITH CHECK (student_id = auth.uid());

-- Mastery Practice Logs Policies
CREATE POLICY "Students can view own practice logs" ON mastery_practice_logs FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can insert own practice logs" ON mastery_practice_logs FOR INSERT WITH CHECK (student_id = auth.uid());

-- Mastery Scores Policies
CREATE POLICY "Students can view own scores" ON mastery_scores FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can insert own scores" ON mastery_scores FOR INSERT WITH CHECK (student_id = auth.uid());

-- Scheme of Work Policies
CREATE POLICY "Anyone can view scheme of work" ON scheme_of_work FOR SELECT USING (true);
CREATE POLICY "Teachers can manage scheme of work" ON scheme_of_work FOR ALL USING (public.get_user_role() IN ('teacher', 'admin'));

-- Messages Policies
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Practice Sessions Policies
CREATE POLICY "Students can view own practice sessions" ON practice_sessions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can insert practice sessions" ON practice_sessions FOR INSERT WITH CHECK (student_id = auth.uid());

-- Practice Attempts Policies
CREATE POLICY "Students can view own attempts" ON practice_attempts FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can insert own attempts" ON practice_attempts FOR INSERT WITH CHECK (student_id = auth.uid());

-- Daily Goals Policies
CREATE POLICY "Students can view own daily goals" ON daily_goals FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can manage own daily goals" ON daily_goals FOR ALL USING (student_id = auth.uid());

-- Learning Streaks Policies
CREATE POLICY "Students can view own streaks" ON learning_streaks FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can update own streaks" ON learning_streaks FOR UPDATE USING (student_id = auth.uid());

-- Badges Policies
CREATE POLICY "Students can view own badges" ON badges FOR SELECT USING (student_id = auth.uid());

-- Review Schedule Policies
CREATE POLICY "Students can view own review schedule" ON review_schedule FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can manage own review schedule" ON review_schedule FOR ALL USING (student_id = auth.uid());

-- School Settings Policies
CREATE POLICY "School settings viewable by all" ON school_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update school settings" ON school_settings FOR UPDATE USING (public.get_user_role() = 'admin');

-- Announcements Messages Policies
CREATE POLICY "Users can view own announcement messages" ON announcements_messages FOR SELECT USING (recipient_id = auth.uid());

-- ============================================================================
-- STEP 4: Enable RLS on all tables
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
-- STEP 5: Deploy the auth trigger (auto-create profile on signup)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- DONE
-- ============================================================================
