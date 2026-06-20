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

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    const result = await pool.query(
      `SELECT st.*, jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category) as skill
       FROM skills_tracking st
       LEFT JOIN skills s ON st.skill_id = s.id
       WHERE st.student_id = $1
       ORDER BY st.date DESC
       LIMIT 50`,
      [studentId]
    );

    await pool.end();
    return NextResponse.json({ tracking: result.rows });
  } catch (error: any) {
    console.error('Error fetching skills tracking:', error);
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
    const { student_id, skill_id, date, activity_type, activity_description, duration_minutes, self_rating } = body;

    if (!student_id || !skill_id) {
      return NextResponse.json({ error: 'student_id and skill_id are required' }, { status: 400 });
    }

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    const result = await pool.query(
      `INSERT INTO skills_tracking (student_id, skill_id, date, activity_type, activity_description, duration_minutes, self_rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        student_id, skill_id,
        date || new Date().toISOString().split('T')[0],
        activity_type || 'practice',
        activity_description || '',
        duration_minutes || 30,
        self_rating || 3,
      ]
    );

    await pool.end();
    return NextResponse.json({ tracking: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating skills tracking:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
