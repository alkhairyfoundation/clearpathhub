require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
(async () => {
  const tables = [
    'profiles', 'students', 'staff', 'teacher_classes', 'homework', 'sessions', 'lessons',
    'teacher_tasks', 'teacher_evaluations', 'subjects', 'classes', 'departments', 'homework_submissions',
    'quiz_attempts', 'test_attempts', 'attendance', 'results', 'behavioral_reports', 'invoices',
    'transactions', 'id_cards', 'student_classes', 'student_risk_predictions', 'mastery_tracking',
    'mastery_scores', 'practice_sessions', 'review_schedule', 'ccr_responses', 'parent_students',
    'scheme_of_work', 'announcements', 'receipts', 'staff_attendance', 'test_questions', 'mock_questions',
    'entrance_applications', 'linked_accounts', 'sessions_logs', 'lesson_views', 'homework_grades',
  ];
  const res = await pool.query(
    `SELECT
       conrelid::regclass::text AS child_table,
       a.attname AS child_col,
       confrelid::regclass::text AS parent_table,
       f.attname AS parent_col,
       confdeltype AS on_delete
     FROM pg_constraint c
     JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
     JOIN pg_attribute f ON f.attrelid = c.confrelid AND f.attnum = ANY(c.confkey)
     WHERE c.contype = 'f'
       AND (
         c.conrelid::regclass::text IN (
           'profiles','students','staff','teacher_classes','homework','sessions','lessons',
           'teacher_tasks','teacher_evaluations','subjects','classes','departments','homework_submissions',
           'quiz_attempts','test_attempts','attendance','results','behavioral_reports','invoices',
           'transactions','id_cards','student_classes','student_risk_predictions','mastery_tracking',
           'mastery_scores','practice_sessions','review_schedule','ccr_responses','parent_students',
           'scheme_of_work','announcements','receipts','staff_attendance','test_questions','mock_questions',
           'entrance_applications','linked_accounts','sessions_logs','lesson_views','homework_grades'
         ) OR c.confrelid::regclass::text IN (
           'profiles','students','staff','teacher_classes','homework','sessions','lessons',
           'teacher_tasks','teacher_evaluations','subjects','classes','departments','homework_submissions',
           'quiz_attempts','test_attempts','attendance','results','behavioral_reports','invoices',
           'transactions','id_cards','student_classes','student_risk_predictions','mastery_tracking',
           'mastery_scores','practice_sessions','review_schedule','ccr_responses','parent_students',
           'scheme_of_work','announcements','receipts','staff_attendance','test_questions','mock_questions',
           'entrance_applications','linked_accounts','sessions_logs','lesson_views','homework_grades'
         )
       )
     ORDER BY 1, 2`
  );
  for (const r of res.rows) {
    console.log(
      `${r.child_table}.${r.child_col} -> ${r.parent_table}.${r.parent_col} (on_delete=${r.on_delete})`
    );
  }
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });