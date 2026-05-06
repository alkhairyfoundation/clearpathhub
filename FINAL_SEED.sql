-- ============================================================================
-- CLEARPATH EDU HUB - FINAL SEED DATA
-- ============================================================================
-- Run this AFTER running COMPLETE_SCHEMA.sql and AUTH_STORAGE_SETUP.sql
-- ============================================================================

-- Sample departments
INSERT INTO departments (name, code, head_id, created_at)
VALUES 
  ('Science', 'SCI', NULL, NOW()),
  ('Arts', 'ART', NULL, NOW()),
  ('Commerce', 'COM', NULL, NOW()),
  ('Technology', 'TECH', NULL, NOW())
ON CONFLICT DO NOTHING;

-- Sample school settings if not already set
INSERT INTO school_settings (school_name, school_motto, school_address, school_phone, school_email, primary_color, secondary_color, accent_color, academic_year, term, session_start, session_end)
SELECT 'ClearPath Edu Hub', 'Excellence in Education', '123 School Street, City', '+1234567890', 'info@clearpatheduhub.com', '#2563eb', '#1e293b', '#10b981', '2025-2026', 'First Term', '2025-09-01', '2026-06-30'
WHERE NOT EXISTS (SELECT 1 FROM school_settings)
ON CONFLICT DO NOTHING;

-- Verify seed data
SELECT 
  (SELECT COUNT(*) FROM departments) as total_departments,
  (SELECT COUNT(*) FROM classes) as total_classes,
  (SELECT COUNT(*) FROM school_settings) as school_settings_exists,
  (SELECT COUNT(*) FROM profiles) as total_profiles;

-- Show any existing profiles (users who have signed up)
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.phone,
  CASE 
    WHEN p.role = 'admin' THEN '✓ Admin access'
    WHEN p.role = 'teacher' THEN '✓ Teacher access'
    WHEN p.role = 'student' THEN '✓ Student access'
    WHEN p.role = 'parent' THEN '✓ Parent access'
    WHEN p.role = 'accountant' THEN '✓ Accountant access'
  END as access_status
FROM profiles p
ORDER BY p.created_at
LIMIT 20;

-- ============================================================================
-- COMPLETE!
-- ============================================================================