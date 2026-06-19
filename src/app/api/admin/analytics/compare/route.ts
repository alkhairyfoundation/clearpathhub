import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentIds = searchParams.get('student_ids')?.split(',').filter(Boolean) || [];
    if (studentIds.length < 2 || studentIds.length > 4) {
      return NextResponse.json({ error: 'Provide 2-4 student IDs' }, { status: 400 });
    }

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    const studentData = await Promise.all(studentIds.map(async (sid) => {
      const [prof, res, ms] = await Promise.all([
        pool.query(
          `SELECT p.id, p.first_name, p.last_name, c.name as class_name,
                  COALESCE(sl.level, 1) as level, COALESCE(sl.total_xp, 0) as total_xp
           FROM profiles p
           LEFT JOIN students s ON s.profile_id = p.id
           LEFT JOIN classes c ON c.id = s.class_id
           LEFT JOIN student_levels sl ON sl.student_id = p.id
           WHERE p.id = $1`, [sid]
        ),
        pool.query(
          `SELECT ROUND(AVG(score), 1) as avg_score FROM results WHERE student_id = $1`, [sid]
        ),
        pool.query(
          `SELECT 
            ROUND(AVG(mastery_score), 1) as avg_mastery,
            COUNT(*) as topics
           FROM mastery_scores WHERE student_id = $1`, [sid]
        ),
      ]);

      const att = await pool.query(
        `SELECT ROUND(
          (COUNT(*) FILTER (WHERE status IN ('present','excused')))::NUMERIC /
          NULLIF(COUNT(*), 0) * 100, 1
        ) as rate FROM attendance WHERE student_id = $1`, [sid]
      );

      const prac = await pool.query(
        `SELECT COUNT(*) as sessions,
                ROUND(AVG(score), 1) as avg_score
         FROM practice_sessions WHERE student_id = $1 AND status = 'completed'`, [sid]
      );

      const streak = await pool.query(
        `SELECT current_streak, longest_streak FROM learning_streaks WHERE student_id = $1`, [sid]
      );

      const hw = await pool.query(
        `SELECT ROUND(
          (COUNT(*) FILTER (WHERE hs.submitted_at IS NOT NULL))::NUMERIC /
          NULLIF(COUNT(*), 0) * 100, 1
        ) as completion_rate
        FROM homework h
        LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = $1`, [sid]
      );

      const pData = prof.rows[0];
      return {
        id: sid,
        name: pData ? `${pData.first_name} ${pData.last_name}` : 'Unknown',
        class_name: pData?.class_name || 'N/A',
        level: pData?.level || 1,
        total_xp: pData?.total_xp || 0,
        avg_score: res.rows[0]?.avg_score,
        avg_mastery: ms.rows[0]?.avg_mastery,
        topics_count: ms.rows[0]?.topics || 0,
        attendance_rate: att.rows[0]?.rate,
        practice_sessions: prac.rows[0]?.sessions || 0,
        practice_avg_score: prac.rows[0]?.avg_score,
        current_streak: streak.rows[0]?.current_streak || 0,
        longest_streak: streak.rows[0]?.longest_streak || 0,
        homework_completion: hw.rows[0]?.completion_rate,
      };
    }));

    await pool.end();

    // Build comparison dimensions
    const dimensions = [
      { key: 'avg_score', label: 'Avg Score', unit: '%' },
      { key: 'attendance_rate', label: 'Attendance', unit: '%' },
      { key: 'avg_mastery', label: 'Avg Mastery', unit: '%' },
      { key: 'practice_sessions', label: 'Practice Sessions', unit: '' },
      { key: 'practice_avg_score', label: 'Practice Avg', unit: '%' },
      { key: 'current_streak', label: 'Current Streak', unit: 'd' },
      { key: 'longest_streak', label: 'Longest Streak', unit: 'd' },
      { key: 'homework_completion', label: 'Homework', unit: '%' },
      { key: 'level', label: 'Level', unit: '' },
      { key: 'total_xp', label: 'Total XP', unit: '' },
    ];

    return NextResponse.json({ students: studentData, dimensions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
