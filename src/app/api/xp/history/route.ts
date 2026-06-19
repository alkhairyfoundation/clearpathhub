import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('student_id');

    if (!studentId) return NextResponse.json({ error: 'student_id required' }, { status: 400 });

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    const txResult = await pool.query(
      `SELECT * FROM xp_transactions WHERE student_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [studentId]
    );

    const levelResult = await pool.query(
      `SELECT * FROM student_levels WHERE student_id = $1`,
      [studentId]
    );

    const streakResult = await pool.query(
      `SELECT current_streak, longest_streak, streak_type FROM learning_streaks WHERE student_id = $1`,
      [studentId]
    );

    await pool.end();

    return NextResponse.json({
      transactions: txResult.rows,
      level: levelResult.rows[0] || null,
      streak: streakResult.rows[0] || null,
    });
  } catch (error: any) {
    console.error('XP history error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
