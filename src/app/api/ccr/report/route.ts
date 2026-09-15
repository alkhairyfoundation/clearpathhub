import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { query as neonQuery } from '@/lib/neon';
import { computeSgiScore } from '@/lib/ccr-scoring';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id');
    const sessionId = url.searchParams.get('academic_session_id');
    const termId = url.searchParams.get('term_id');

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'student_id is required' }, { status: 400 });
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(studentId)) {
      return NextResponse.json({ success: false, error: 'Invalid student_id format' }, { status: 400 });
    }

    let responsesSql = `SELECT * FROM ccr_responses WHERE student_id = $1::uuid AND is_submitted = true`;
    const rParams: any[] = [studentId];
    if (sessionId) {
      responsesSql += ` AND academic_session_id = $${rParams.length + 1}::uuid`;
      rParams.push(sessionId);
    }
    if (termId) {
      responsesSql += ` AND term_id = $${rParams.length + 1}::uuid`;
      rParams.push(termId);
    }

    const responses = await neonQuery(responsesSql, rParams);

    const studentRows = await neonQuery(
      `SELECT st.*,
        (SELECT to_jsonb(tmp)
         FROM (SELECT p.first_name, p.last_name) AS tmp) AS profile,
        (SELECT to_jsonb(tmp)
         FROM (SELECT c.name) AS tmp) AS class
       FROM students st
       LEFT JOIN profiles p ON p.id = st.profile_id
       LEFT JOIN classes c ON c.id = st.class_id
       WHERE st.profile_id = $1::uuid
       LIMIT 1`,
      [studentId]
    );

    const sgi = computeSgiScore(responses || []);

    return NextResponse.json({
      success: true,
      data: {
        student: studentRows[0] || null,
        responses: responses || [],
        sgi,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
