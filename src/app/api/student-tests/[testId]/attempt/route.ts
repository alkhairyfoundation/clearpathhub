import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    const [attemptResult, countResult, testResult] = await Promise.all([
      pool.query(
        'SELECT id, score, passed, completed_at FROM test_attempts WHERE test_id = $1 AND student_id = $2 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1',
        [testId, studentId]
      ),
      pool.query(
        'SELECT COUNT(*) as count FROM test_attempts WHERE test_id = $1 AND student_id = $2 AND completed_at IS NOT NULL',
        [testId, studentId]
      ),
      pool.query(
        'SELECT max_attempts FROM tests WHERE id = $1',
        [testId]
      ),
    ]);

    await pool.end();

    const maxAttempts = testResult.rows[0]?.max_attempts ?? 0;
    const attemptsCount = parseInt(countResult.rows[0]?.count || '0', 10);

    return NextResponse.json({
      attempt: attemptResult.rows[0] || null,
      attemptsCount,
      maxAttempts,
    });
  } catch (error: any) {
    console.error('Error checking attempt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}