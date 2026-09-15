import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { query as neonQuery } from '@/lib/neon';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id');
    const respondentType = url.searchParams.get('respondent_type');

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (studentId && !uuidRegex.test(studentId)) {
      return NextResponse.json({ success: false, error: 'Invalid student_id format' }, { status: 400 });
    }

    const conditions: string[] = [];
    const params: any[] = [];
    if (studentId) {
      conditions.push(`student_id = $${params.length + 1}::uuid`);
      params.push(studentId);
    }
    if (respondentType) {
      conditions.push(`respondent_type = $${params.length + 1}`);
      params.push(respondentType);
    }
    const sql = `SELECT * FROM ccr_responses${conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''}`;

    const data = await neonQuery(sql, params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
