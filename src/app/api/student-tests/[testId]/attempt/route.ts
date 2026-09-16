import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query } from '@/lib/neon';

export async function GET(req: NextRequest, { params }: { params: { testId: string } }) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testId } = params;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('student_id');

    if (!studentId) {
      return NextResponse.json({ attempt: null });
    }

    const [attemptResult, countResult, testResult] = await Promise.all([
      query(
        'SELECT id, score, passed, completed_at FROM test_attempts WHERE test_id = $1 AND student_id = $2 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1',
        [testId, studentId]
      ),
      query(
        'SELECT COUNT(*) as count FROM test_attempts WHERE test_id = $1 AND student_id = $2 AND completed_at IS NOT NULL',
        [testId, studentId]
      ),
      query(
        'SELECT max_attempts FROM tests WHERE id = $1',
        [testId]
      ),
    ]);

    const maxAttempts = testResult[0]?.max_attempts ?? 0;
    const attemptsCount = parseInt(countResult[0]?.count || '0', 10);

    return NextResponse.json({
      attempt: attemptResult[0] || null,
      attemptsCount,
      maxAttempts,
    });
  } catch (error: any) {
    console.error('Error checking attempt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
