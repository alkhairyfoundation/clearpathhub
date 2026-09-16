import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query as dbQuery } from '@/lib/neon';

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

    let sql = 'SELECT ms.*';
    const params: any[] = [studentId];
    let idx = 2;

    if (withSubject) {
      sql += ', jsonb_build_object(\'name\', s.name, \'code\', s.code) as subject';
    }
    sql += ' FROM mastery_scores ms';
    if (withSubject) {
      sql += ' LEFT JOIN subjects s ON ms.subject_id = s.id';
    }
    sql += ' WHERE ms.student_id = $1';

    if (subjectId) {
      sql += ` AND ms.subject_id = $${idx++}`;
      params.push(subjectId);
    }
    if (topic) {
      sql += ` AND ms.topic = $${idx++}`;
      params.push(topic);
    }

    sql += ' ORDER BY ms.mastery_score DESC';

    const scores = await dbQuery(sql, params);

    return NextResponse.json({ scores });
  } catch (error: any) {
    console.error('Error fetching mastery scores:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
