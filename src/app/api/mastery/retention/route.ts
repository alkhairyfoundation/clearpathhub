import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    let query = `
      SELECT rc.*, s.name as subject_name, s.code as subject_code
      FROM retention_checks rc
      LEFT JOIN subjects s ON rc.subject_id = s.id
      WHERE rc.student_id = $1
    `;
    const params: any[] = [studentId];
    let idx = 2;

    if (status === 'due') {
      query += ` AND rc.check_date <= CURRENT_DATE AND rc.passed IS NULL`;
    } else if (status === 'passed') {
      query += ` AND rc.passed = true`;
    } else if (status === 'failed') {
      query += ` AND rc.passed = false`;
    }

    query += ' ORDER BY rc.check_date ASC';

    const result = await pool.query(query, params);
    await pool.end();

    return NextResponse.json({ checks: result.rows });
  } catch (error: any) {
    console.error('Error fetching retention checks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { check_id, retest_score, student_id } = body;

    if (!check_id || retest_score == null || !student_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const passed = retest_score >= 80;

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    await pool.query(
      `UPDATE retention_checks SET
         retest_score = $1,
         passed = $2,
         entered_reinforcement = NOT $2,
         updated_at = NOW()
       WHERE id = $3 AND student_id = $4`,
      [retest_score, passed, check_id, student_id]
    );

    const check = await pool.query(
      'SELECT * FROM retention_checks WHERE id = $1',
      [check_id]
    );

    if (!passed && check.rows[0]) {
      await pool.query(
        `UPDATE mastery_learning_path SET
           is_unlocked = true,
           teacher_intervention_required = false
         WHERE student_id = $1
           AND subject_id = $2
           AND topic = $3
           AND stage = 'practice'`,
        [student_id, check.rows[0].subject_id, check.rows[0].topic]
      );
    }

    await pool.end();
    return NextResponse.json({ check: { ...check.rows[0], retest_score, passed } });
  } catch (error: any) {
    console.error('Error updating retention check:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
