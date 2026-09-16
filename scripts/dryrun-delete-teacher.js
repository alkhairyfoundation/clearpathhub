require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

const NULL_REF_PAIRS = [
  ['subjects', 'teacher_id'],
  ['classes', 'form_teacher_id'],
  ['classes', 'class_teacher_id'],
  ['departments', 'head_id'],
  ['scheme_of_work', 'created_by'],
  ['teacher_tasks', 'teacher_id'],
  ['teacher_tasks', 'created_by'],
  ['teacher_evaluations', 'teacher_id'],
  ['teacher_evaluations', 'evaluated_by'],
  ['student_risk_predictions', 'acknowledged_by'],
  ['student_risk_predictions', 'student_id'],
  ['receipts', 'uploaded_by'],
  ['announcements', 'created_by'],
  ['results', 'entered_by'],
  ['results', 'student_id'],
  ['transactions', 'recorded_by'],
  ['attendance', 'marked_by'],
  ['attendance', 'student_id'],
  ['staff_attendance', 'marked_by'],
  ['staff_attendance', 'staff_id'],
  ['behavioral_reports', 'student_id'],
  ['homework_submissions', 'student_id'],
  ['quiz_attempts', 'student_id'],
  ['test_attempts', 'student_id'],
  ['invoices', 'student_id'],
  ['id_cards', 'student_id'],
  ['student_classes', 'student_id'],
  ['student_term_goals', 'approved_by'],
  ['student_skill_rubrics', 'updated_by'],
  ['islamic_tracking', 'verified_by'],
  ['class_term_frameworks', 'created_by'],
  ['messages', 'sender_id'],
  ['messages', 'recipient_id'],
  ['user_notifications', 'sender_id'],
  ['mock_exams', 'created_by'],
  ['tests', 'created_by'],
  ['question_bank', 'created_by'],
  ['portfolio_evidence', 'created_by'],
  ['exam_activity_logs', 'student_id'],
  ['mock_analytics', 'student_id'],
  ['mock_attempts', 'student_id'],
];

const childDeletesForRole = (role) => {
  if (role === 'teacher') {
    return [
      ['teacher_classes', 'teacher_id'],
      ['homework', 'teacher_id'],
      ['sessions', 'teacher_id'],
      ['lessons', 'teacher_id'],
      ['teacher_tasks', 'teacher_id'],
      ['teacher_evaluations', 'teacher_id'],
      ['staff', 'profile_id'],
    ];
  }
  if (role === 'student') {
    return [
      ['mastery_tracking', 'student_id'],
      ['mastery_scores', 'student_id'],
      ['mastery_practice_logs', 'student_id'],
      ['mastery_learning_path', 'student_id'],
      ['practice_sessions', 'student_id'],
      ['review_schedule', 'student_id'],
      ['retention_checks', 'student_id'],
      ['learning_streaks', 'student_id'],
      ['daily_goals', 'student_id'],
      ['goal_hierarchy', 'student_id'],
      ['daily_accountability', 'student_id'],
      ['skills_tracking', 'student_id'],
      ['student_levels', 'student_id'],
      ['promotion_readiness', 'student_id'],
      ['performance_colors', 'student_id'],
      ['spaced_repetition_schedule', 'student_id'],
      ['student_skill_rubrics', 'student_id'],
      ['student_term_goals', 'student_id'],
      ['xp_transactions', 'student_id'],
      ['ai_coach_interactions', 'student_id'],
      ['ccr_responses', 'student_id'],
      ['portfolio_evidence', 'student_id'],
      ['notification_preferences', 'profile_id'],
      ['parent_students', 'student_id'],
      ['students', 'profile_id'],
    ];
  }
  if (role === 'parent') return [['parent_students', 'parent_id']];
  if (role === 'accountant' || role === 'admin') return [['staff', 'profile_id']];
  return [];
};

(async () => {
  const roleRows = await pool.query("SELECT id, email, role FROM profiles WHERE role = 'teacher' LIMIT 5");
  console.log('candidate teachers:', roleRows.rows.map(r => r.id.slice(0, 8)).join(', '));
  const id = roleRows.rows[0]?.id;
  if (!id) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 15000');

    let savepointSeq = 0;
    const runIsolated = async (label, sql, params) => {
      savepointSeq++;
      const sp = `sp_${savepointSeq}`;
      await client.query(`SAVEPOINT ${sp}`);
      try {
        await client.query(sql, params);
        await client.query(`RELEASE SAVEPOINT ${sp}`);
        console.log('  OK  ', label);
      } catch (e) {
        try { await client.query(`ROLLBACK TO SAVEPOINT ${sp}`); } catch {}
        console.log('  SKIP', label, '=>', e.message.slice(0, 120));
      }
    };

    for (const [table, column] of NULL_REF_PAIRS) {
      await runIsolated(
        `NULL ${table}.${column}`,
        `UPDATE ${table} SET ${column} = NULL WHERE ${column} = $1`,
        [id]
      );
    }

    const role = (await client.query('SELECT role FROM profiles WHERE id = $1 LIMIT 1', [id])).rows[0]?.role;
    console.log('role:', role, 'id:', id);

    for (const [table, column] of childDeletesForRole(role)) {
      await runIsolated(
        `DEL ${table}.${column}`,
        `DELETE FROM ${table} WHERE ${column} = $1`,
        [id]
      );
    }

    if (role === 'parent') {
      await runIsolated('UPDATE students SET parent_id = NULL', 'UPDATE students SET parent_id = NULL WHERE parent_id = $1', [id]);
    }

    try {
      await client.query(`DELETE FROM profiles WHERE id = $1`, [id]);
      console.log('  OK  DELETE profiles');
    } catch (e) {
      console.log('  FAIL DELETE profiles =>', e.message);
    }

    await client.query('ROLLBACK');
    console.log('\nrolled back — teacher was NOT deleted');
  } catch (e) {
    console.error('outer error:', e.message);
    try { await client.query('ROLLBACK'); } catch {}
  } finally {
    client.release();
    await pool.end();
  }
})();