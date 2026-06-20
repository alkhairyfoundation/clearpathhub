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
    const subjectId = searchParams.get('subjectId');
    const topic = searchParams.get('topic');
    const withSubject = searchParams.get('withSubject') === 'true';

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    let query = 'SELECT ms.*';
    const params: any[] = [studentId];
    let idx = 2;

    if (withSubject) {
      query += ', jsonb_build_object(\'name\', s.name, \'code\', s.code) as subject';
    }
    query += ' FROM mastery_scores ms';
    if (withSubject) {
      query += ' LEFT JOIN subjects s ON ms.subject_id = s.id';
    }
    query += ' WHERE ms.student_id = $1';

    if (subjectId) {
      query += ` AND ms.subject_id = $${idx++}`;
      params.push(subjectId);
    }
    if (topic) {
      query += ` AND ms.topic = $${idx++}`;
      params.push(topic);
    }

    query += ' ORDER BY ms.mastery_score DESC';

    const result = await pool.query(query, params);
    await pool.end();

    return NextResponse.json({ scores: result.rows });
  } catch (error: any) {
    console.error('Error fetching mastery scores:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
