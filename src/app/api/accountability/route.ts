import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query } from '@/lib/neon';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('student_id');

    if (!studentId) return NextResponse.json({ error: 'student_id required' }, { status: 400 });

    const todayResult = await query(
      `SELECT * FROM daily_accountability WHERE student_id = $1 AND date = CURRENT_DATE`,
      [studentId]
    );

    const historyResult = await query(
      `SELECT * FROM daily_accountability WHERE student_id = $1 ORDER BY date DESC LIMIT 30`,
      [studentId]
    );

    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_days,
        ROUND(AVG(total_score), 1) as avg_score,
        ROUND(AVG(total_score) FILTER (WHERE total_score >= 80), 1) as avg_good_score,
        COUNT(*) FILTER (WHERE total_score >= 80) as good_days,
        MAX(total_score) as best_score,
        MIN(total_score) FILTER (WHERE total_score > 0) as worst_score
       FROM daily_accountability
       WHERE student_id = $1`,
      [studentId]
    );

    return NextResponse.json({
      today: todayResult[0] || null,
      history: historyResult,
      stats: statsResult[0] || null,
    });
  } catch (error: any) {
    console.error('Accountability error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
