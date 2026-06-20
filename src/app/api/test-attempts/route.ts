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
      `SELECT ta.*, 
        jsonb_build_object('title', t.title, 'subject', jsonb_build_object('name', s.name)) as test
       FROM test_attempts ta
       LEFT JOIN tests t ON ta.test_id = t.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE ta.student_id = $1
       ORDER BY ta.completed_at DESC`,
      [studentId]
    );

    await pool.end();
    return NextResponse.json({ attempts: result.rows });
  } catch (error: any) {
    console.error('Error fetching test attempts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
