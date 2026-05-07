-- =====================================================
-- CLEANUP: Remove Seeded Users (Keep Admin Only)
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Delete behavioral reports for seeded students
DELETE FROM behavioral_reports WHERE student_id IN (
  SELECT id FROM students WHERE profile_id IN (
    SELECT id FROM profiles WHERE role = 'student' AND email != 'admin@clearpathhub.com'
  )
);

-- 2. Delete attendance records for seeded students
DELETE FROM attendance WHERE student_id IN (
  SELECT id FROM students WHERE profile_id IN (
    SELECT id FROM profiles WHERE role = 'student' AND email != 'admin@clearpathhub.com'
  )
);

-- 3. Delete homework submissions from seeded students
DELETE FROM homework_submissions WHERE student_id IN (
  SELECT id FROM students WHERE profile_id IN (
    SELECT id FROM profiles WHERE role = 'student' AND email != 'admin@clearpathhub.com'
  )
);

-- 4. Delete results for seeded students
DELETE FROM results WHERE student_id IN (
  SELECT id FROM students WHERE profile_id IN (
    SELECT id FROM profiles WHERE role = 'student' AND email != 'admin@clearpathhub.com'
  )
);

-- 5. Delete test attempts by seeded students
DELETE FROM test_attempts WHERE student_id IN (
  SELECT id FROM students WHERE profile_id IN (
    SELECT id FROM profiles WHERE role = 'student' AND email != 'admin@clearpathhub.com'
  )
);

-- 6. Delete student records (children of seeded users)
DELETE FROM students WHERE profile_id IN (
  SELECT id FROM profiles WHERE role = 'student' AND email != 'admin@clearpathhub.com'
);

-- 7. Delete invoices for seeded students
DELETE FROM invoices WHERE student_id IN (
  SELECT id FROM students WHERE profile_id IN (
    SELECT id FROM profiles WHERE role = 'student' AND email != 'admin@clearpathhub.com'
  )
);

-- 8. Delete ID cards for seeded students
DELETE FROM id_cards WHERE student_id IN (
  SELECT id FROM students WHERE profile_id IN (
    SELECT id FROM profiles WHERE role = 'student' AND email != 'admin@clearpathhub.com'
  )
);

-- 9. Delete staff records for seeded teachers/accountants
DELETE FROM staff WHERE profile_id IN (
  SELECT id FROM profiles WHERE role IN ('teacher', 'accountant') AND email != 'admin@clearpathhub.com'
);

-- 10. Delete sessions/lessons by seeded teachers
DELETE FROM sessions WHERE teacher_id IN (
  SELECT id FROM profiles WHERE role = 'teacher' AND email != 'admin@clearpathhub.com'
);

DELETE FROM lessons WHERE teacher_id IN (
  SELECT id FROM profiles WHERE role = 'teacher' AND email != 'admin@clearpathhub.com'
);

-- 11. Delete homework assigned by seeded teachers
DELETE FROM homework WHERE teacher_id IN (
  SELECT id FROM profiles WHERE role = 'teacher' AND email != 'admin@clearpathhub.com'
);

-- 12. Delete tests created by seeded teachers
DELETE FROM tests WHERE created_by IN (
  SELECT id FROM profiles WHERE role = 'teacher' AND email != 'admin@clearpathhub.com'
);

-- 13. Delete subjects assigned to seeded teachers
UPDATE subjects SET teacher_id = NULL WHERE teacher_id IN (
  SELECT id FROM profiles WHERE role = 'teacher' AND email != 'admin@clearpathhub.com'
);

-- 14. Delete teacher evaluations for seeded teachers
DELETE FROM teacher_evaluations WHERE teacher_id IN (
  SELECT id FROM profiles WHERE role = 'teacher' AND email != 'admin@clearpathhub.com'
);

-- 15. Delete teacher tasks for seeded teachers
DELETE FROM teacher_tasks WHERE teacher_id IN (
  SELECT id FROM profiles WHERE role = 'teacher' AND email != 'admin@clearpathhub.com'
);

-- 16. Delete transactions recorded by seeded accountants
DELETE FROM transactions WHERE recorded_by IN (
  SELECT id FROM profiles WHERE role = 'accountant' AND email != 'admin@clearpathhub.com'
);

-- 17. Delete messages involving seeded users
DELETE FROM messages WHERE sender_id IN (
  SELECT id FROM profiles WHERE email != 'admin@clearpathhub.com'
) OR recipient_id IN (
  SELECT id FROM profiles WHERE email != 'admin@clearpathhub.com'
);

-- 18. Delete notifications for seeded users
DELETE FROM notifications WHERE recipient_id IN (
  SELECT id FROM profiles WHERE email != 'admin@clearpathhub.com'
);

-- 19. Delete notification preferences for seeded users
DELETE FROM notification_preferences WHERE profile_id IN (
  SELECT id FROM profiles WHERE email != 'admin@clearpathhub.com'
);

-- 20. Finally, delete non-admin profiles
DELETE FROM profiles WHERE email != 'admin@clearpathhub.com';

-- 21. Delete auth users (requires service role, run via API or Supabase Dashboard > Authentication)
-- NOTE: This SQL won't delete auth users directly. Use the Admin API or manually delete from
-- Supabase Dashboard > Authentication > Users after running this script.

-- Verify only admin remains
SELECT email, role FROM profiles;
