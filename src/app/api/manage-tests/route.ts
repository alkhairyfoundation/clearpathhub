import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

async function getPool() {
  const { default: { Pool } } = await import('pg');
  return new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;
    const pool = await getPool();

    try {
      switch (action) {
        case 'list_tests': {
          const { created_by } = body;
          let query = `SELECT t.*, jsonb_build_object('name', s.name) as subject, jsonb_build_object('name', c.name) as class
                       FROM tests t LEFT JOIN subjects s ON t.subject_id = s.id LEFT JOIN classes c ON t.class_id = c.id`;
          const params: any[] = [];
          if (created_by) {
            query += ' WHERE t.created_by = $1';
            params.push(created_by);
          }
          query += ' ORDER BY t.created_at DESC';
          const result = await pool.query(query, params);
          return NextResponse.json({ tests: result.rows });
        }

        case 'create_test': {
          const { title, description, subject_id, class_id, duration_minutes, passing_score, total_marks, shuffle_questions, created_by } = body;
          const result = await pool.query(
            `INSERT INTO tests (title, description, subject_id, class_id, duration_minutes, passing_score, total_marks, shuffle_questions, created_by, is_published)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false) RETURNING *`,
            [title, description || '', subject_id, class_id || null, duration_minutes || 30, passing_score || 50, total_marks || 0, shuffle_questions || false, created_by]
          );
          return NextResponse.json({ test: result.rows[0] }, { status: 201 });
        }

        case 'update_test': {
          const { id, title, description, subject_id, class_id, duration_minutes, passing_score, total_marks, shuffle_questions, is_published } = body;
          const sets: string[] = [];
          const params: any[] = [];
          let idx = 1;
          if (title !== undefined) { sets.push(`title = $${idx++}`); params.push(title); }
          if (description !== undefined) { sets.push(`description = $${idx++}`); params.push(description); }
          if (subject_id !== undefined) { sets.push(`subject_id = $${idx++}`); params.push(subject_id); }
          if (class_id !== undefined) { sets.push(`class_id = $${idx++}`); params.push(class_id); }
          if (duration_minutes !== undefined) { sets.push(`duration_minutes = $${idx++}`); params.push(duration_minutes); }
          if (passing_score !== undefined) { sets.push(`passing_score = $${idx++}`); params.push(passing_score); }
          if (total_marks !== undefined) { sets.push(`total_marks = $${idx++}`); params.push(total_marks); }
          if (shuffle_questions !== undefined) { sets.push(`shuffle_questions = $${idx++}`); params.push(shuffle_questions); }
          if (is_published !== undefined) { sets.push(`is_published = $${idx++}`); params.push(is_published); }
          params.push(id);
          const result = await pool.query(
            `UPDATE tests SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
            params
          );
          return NextResponse.json({ test: result.rows[0] });
        }

        case 'delete_test': {
          const { id } = body;
          await pool.query('DELETE FROM test_questions WHERE test_id = $1', [id]);
          await pool.query('DELETE FROM test_attempts WHERE test_id = $1', [id]);
          await pool.query('DELETE FROM tests WHERE id = $1', [id]);
          return NextResponse.json({ deleted: true });
        }

        case 'list_questions': {
          const { test_id } = body;
          const result = await pool.query('SELECT * FROM test_questions WHERE test_id = $1 ORDER BY order_index', [test_id]);
          return NextResponse.json({ questions: result.rows });
        }

        case 'create_question': {
          const { test_id, question, question_type, options, correct_answer, points, order_index } = body;
          const result = await pool.query(
            `INSERT INTO test_questions (test_id, question, question_type, options, correct_answer, points, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [test_id, question, question_type || 'multiple_choice', options || null, correct_answer, points || 1, order_index || 0]
          );
          return NextResponse.json({ question: result.rows[0] }, { status: 201 });
        }

        case 'update_question': {
          const { id, question, question_type, options, correct_answer, points, order_index } = body;
          const sets: string[] = [];
          const params: any[] = [];
          let idx = 1;
          if (question !== undefined) { sets.push(`question = $${idx++}`); params.push(question); }
          if (question_type !== undefined) { sets.push(`question_type = $${idx++}`); params.push(question_type); }
          if (options !== undefined) { sets.push(`options = $${idx++}`); params.push(options); }
          if (correct_answer !== undefined) { sets.push(`correct_answer = $${idx++}`); params.push(correct_answer); }
          if (points !== undefined) { sets.push(`points = $${idx++}`); params.push(points); }
          if (order_index !== undefined) { sets.push(`order_index = $${idx++}`); params.push(order_index); }
          params.push(id);
          const result = await pool.query(`UPDATE test_questions SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
          return NextResponse.json({ question: result.rows[0] });
        }

        case 'delete_question': {
          const { id } = body;
          await pool.query('DELETE FROM test_questions WHERE id = $1', [id]);
          return NextResponse.json({ deleted: true });
        }

        case 'bulk_insert_questions': {
          const { test_id, questions } = body;
          if (!questions || questions.length === 0) {
            return NextResponse.json({ error: 'No questions provided' }, { status: 400 });
          }
          const existing = await pool.query('SELECT COALESCE(MAX(order_index), 0) as max_order FROM test_questions WHERE test_id = $1', [test_id]);
          let startOrder = existing.rows[0].max_order + 1;
          const values = questions.map((_: any, i: number) => {
            const offset = i * 6;
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
          }).join(', ');
          const params: any[] = [];
          questions.forEach((q: any) => {
            params.push(test_id, q.question, q.question_type || 'multiple_choice', q.options ? JSON.stringify(q.options) : null, q.correct_answer, startOrder++);
          });
          await pool.query(
            `INSERT INTO test_questions (test_id, question, question_type, options, correct_answer, order_index) VALUES ${values}`,
            params
          );
          const result = await pool.query('SELECT * FROM test_questions WHERE test_id = $1 ORDER BY order_index', [test_id]);
          return NextResponse.json({ questions: result.rows });
        }

        case 'list_attempts': {
          const { test_id, student_id, limit: limitCount, date_from, date_to } = body;
          let query = `SELECT ta.*, jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name) as student,
                              jsonb_build_object('title', t.title) as test
                       FROM test_attempts ta 
                       LEFT JOIN profiles p ON ta.student_id = p.id
                       LEFT JOIN tests t ON ta.test_id = t.id`;
          const params: any[] = [];
          const conditions: string[] = [];
          if (test_id) { conditions.push(`ta.test_id = $${params.length + 1}`); params.push(test_id); }
          if (student_id) { conditions.push(`ta.student_id = $${params.length + 1}`); params.push(student_id); }
          if (date_from) { conditions.push(`ta.completed_at >= $${params.length + 1}`); params.push(date_from); }
          if (date_to) { conditions.push(`ta.completed_at < $${params.length + 1}`); params.push(date_to); }
          if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
          query += ' ORDER BY ta.created_at DESC';
          if (limitCount) query += ` LIMIT ${parseInt(limitCount)}`;
          const result = await pool.query(query, params);
          return NextResponse.json({ attempts: result.rows });
        }

        case 'list_attempts_by_students': {
          const { student_ids } = body;
          if (!student_ids || student_ids.length === 0) {
            return NextResponse.json({ attempts: [] });
          }
          const placeholders = student_ids.map((_: any, i: number) => `$${i + 1}`).join(',');
          const result = await pool.query(
            `SELECT ta.id, ta.student_id, ta.score, ta.passed, ta.completed_at, ta.tab_switches, ta.fullscreen_exits,
                    jsonb_build_object('title', t.title) as test
             FROM test_attempts ta LEFT JOIN tests t ON ta.test_id = t.id
             WHERE ta.student_id IN (${placeholders})
             ORDER BY ta.completed_at DESC`,
            student_ids
          );
          return NextResponse.json({ attempts: result.rows });
        }

        case 'list_exam_logs': {
          const { student_ids } = body;
          if (!student_ids || student_ids.length === 0) {
            return NextResponse.json({ logs: [] });
          }
          const placeholders = student_ids.map((_: any, i: number) => `$${i + 1}`).join(',');
          const result = await pool.query(
            `SELECT id, student_id, event_type, severity, created_at
             FROM exam_activity_logs
             WHERE student_id IN (${placeholders})
             ORDER BY created_at DESC`,
            student_ids
          );
          return NextResponse.json({ logs: result.rows });
        }

        default:
          return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error('Manage tests error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
