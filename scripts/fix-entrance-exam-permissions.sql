-- ============================================================================
-- FIX: Remove ALL RLS restrictions on entrance exam tables
-- This ensures anonymous public exam takers, students, and admins
-- can all interact with the entrance exam system without RLS blocking.
--
-- Run this in your Supabase SQL editor.
-- ============================================================================

-- Drop all existing policies on entrance-related tables
DROP POLICY IF EXISTS "Anyone can view entrance exams" ON entrance_exams;
DROP POLICY IF EXISTS "Admins can manage entrance exams" ON entrance_exams;
DROP POLICY IF EXISTS "Anyone can view entrance questions" ON entrance_questions;
DROP POLICY IF EXISTS "Admins can manage entrance questions" ON entrance_questions;
DROP POLICY IF EXISTS "Entrance codes viewable by all" ON entrance_codes;
DROP POLICY IF EXISTS "Admins can manage entrance codes" ON entrance_codes;
DROP POLICY IF EXISTS "Users can view own application" ON entrance_applications;
DROP POLICY IF EXISTS "Users can insert own application" ON entrance_applications;
DROP POLICY IF EXISTS "Admins can manage applications" ON entrance_applications;
DROP POLICY IF EXISTS "Anyone can insert applications" ON entrance_applications;
DROP POLICY IF EXISTS "Anyone can update applications" ON entrance_applications;
DROP POLICY IF EXISTS "Anyone can view applications" ON entrance_applications;
DROP POLICY IF EXISTS "Students can view own analytics" ON student_analytics;
DROP POLICY IF EXISTS "Teachers can view student analytics" ON student_analytics;

-- Disable RLS completely on all entrance-related tables
ALTER TABLE entrance_exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_analytics DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Create atomic code increment function (prevents race conditions)
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_code_usage(p_code_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE entrance_codes SET used_count = used_count + 1 WHERE id = p_code_id;
END;
$$;

-- ============================================================================
-- Verify the fix
-- ============================================================================
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('entrance_exams','entrance_questions','entrance_codes','entrance_applications','student_analytics');
