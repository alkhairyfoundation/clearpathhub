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
    const classId = searchParams.get('classId');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    let sql = `
      SELECT t.*, 
        jsonb_build_object('name', s.name) as subject,
        jsonb_build_object('name', c.name) as class
      FROM tests t
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN classes c ON t.class_id = c.id
      WHERE t.is_published = true
    `;
    const params: any[] = [];
    let idx = 1;

    if (classId) {
      sql += ` AND t.class_id = $${idx++}`;
      params.push(classId);
    }

    sql += ' ORDER BY t.created_at DESC';

    const tests = await dbQuery(sql, params);

    const attempts = await dbQuery(
      'SELECT * FROM test_attempts WHERE student_id = $1 ORDER BY completed_at DESC',
      [studentId]
    );

    const attemptsMap: Record<string, any> = {};
    const attemptsCount: Record<string, number> = {};
    attempts.forEach((a: any) => {
      if (!attemptsMap[a.test_id]) attemptsMap[a.test_id] = a;
      attemptsCount[a.test_id] = (attemptsCount[a.test_id] || 0) + 1;
    });

    return NextResponse.json({ tests, attempts: attemptsMap, attemptsCount });
  } catch (error: any) {
    console.error('Error fetching student tests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
