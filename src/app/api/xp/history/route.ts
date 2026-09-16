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

    const txResult = await query(
      `SELECT * FROM xp_transactions WHERE student_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [studentId]
    );

    const levelResult = await query(
      `SELECT * FROM student_levels WHERE student_id = $1`,
      [studentId]
    );

    const streakResult = await query(
      `SELECT current_streak, longest_streak, streak_type FROM learning_streaks WHERE student_id = $1`,
      [studentId]
    );

    return NextResponse.json({
      transactions: txResult,
      level: levelResult[0] || null,
      streak: streakResult[0] || null,
    });
  } catch (error: any) {
    console.error('XP history error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
