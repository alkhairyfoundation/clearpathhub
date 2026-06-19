import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'class_weekly';
    const studentId = searchParams.get('student_id');

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    if (type === 'class_weekly') {
      if (!studentId) {
        await pool.end();
        return NextResponse.json({ rankings: [] });
      }

      const classResult = await pool.query(
        `SELECT s.class_id FROM students s WHERE s.profile_id = $1`,
        [studentId]
      );
      const classId = classResult.rows[0]?.class_id;

      if (!classId) {
        await pool.end();
        return NextResponse.json({ rankings: [] });
      }

      const rankingsResult = await pool.query(
        `SELECT 
          p.id as student_id,
          CONCAT(p.first_name, ' ', p.last_name) as name,
          COALESCE(sl.total_xp, 0) as score,
          ROW_NUMBER() OVER (ORDER BY COALESCE(sl.total_xp, 0) DESC) as rank
         FROM students s
         JOIN profiles p ON p.id = s.profile_id
         LEFT JOIN student_levels sl ON sl.student_id = p.id
         WHERE s.class_id = $1
         ORDER BY score DESC
         LIMIT 50`,
        [classId]
      );

      const rankings = rankingsResult.rows.map((r: any, i: number) => ({
        student_id: r.student_id,
        name: r.name,
        score: r.score,
        rank: i + 1,
      }));

      const myRankRow = rankings.find((r: any) => r.student_id === studentId);

      await pool.end();
      return NextResponse.json({
        rankings,
        myRank: myRankRow ? { rank: myRankRow.rank, total: rankings.length, score: myRankRow.score } : null,
      });
    }

    if (type === 'school_monthly') {
      const rankingsResult = await pool.query(
        `SELECT 
          p.id as student_id,
          CONCAT(p.first_name, ' ', p.last_name) as name,
          COALESCE(SUM(xt.xp_amount), 0) as score
         FROM profiles p
         JOIN students s ON s.profile_id = p.id
         LEFT JOIN xp_transactions xt ON xt.student_id = p.id 
           AND xt.created_at >= date_trunc('month', CURRENT_DATE)
         GROUP BY p.id, p.first_name, p.last_name
         ORDER BY score DESC
         LIMIT 50`
      );

      const rankings = rankingsResult.rows.map((r: any, i: number) => ({
        student_id: r.student_id,
        name: r.name,
        score: r.score,
        rank: i + 1,
      }));

      const myRankRow = studentId ? rankings.find((r: any) => r.student_id === studentId) : null;

      await pool.end();
      return NextResponse.json({
        rankings,
        myRank: myRankRow ? { rank: myRankRow.rank, total: rankings.length, score: myRankRow.score } : null,
      });
    }

    if (type === 'islamic') {
      const rankingsResult = await pool.query(
        `SELECT 
          p.id as student_id,
          CONCAT(p.first_name, ' ', p.last_name) as name,
          COALESCE(SUM(
            (CASE WHEN it.salah_fajr THEN 10 ELSE 0 END) +
            (CASE WHEN it.salah_dhuhr THEN 10 ELSE 0 END) +
            (CASE WHEN it.salah_asr THEN 10 ELSE 0 END) +
            (CASE WHEN it.salah_maghrib THEN 10 ELSE 0 END) +
            (CASE WHEN it.salah_isha THEN 10 ELSE 0 END) +
            COALESCE(it.quran_memorized_ayahs, 0) * 5 +
            COALESCE(it.adab_rating, 0) * 10 +
            (CASE WHEN it.dhikr_completed THEN 20 ELSE 0 END)
          ), 0) as score
         FROM profiles p
         JOIN islamic_tracking it ON it.student_id = p.id
         GROUP BY p.id, p.first_name, p.last_name
         ORDER BY score DESC
         LIMIT 50`
      );

      const rankings = rankingsResult.rows.map((r: any, i: number) => ({
        student_id: r.student_id,
        name: r.name,
        score: r.score,
        rank: i + 1,
      }));

      const myRankRow = studentId ? rankings.find((r: any) => r.student_id === studentId) : null;

      await pool.end();
      return NextResponse.json({
        rankings,
        myRank: myRankRow ? { rank: myRankRow.rank, total: rankings.length, score: myRankRow.score } : null,
      });
    }

    if (type === 'skills') {
      const rankingsResult = await pool.query(
        `SELECT 
          p.id as student_id,
          CONCAT(p.first_name, ' ', p.last_name) as name,
          COALESCE(COUNT(st.id) * 10 + AVG(COALESCE(st.self_rating, 0)) * 20, 0) as score
         FROM profiles p
         JOIN skills_tracking st ON st.student_id = p.id
         GROUP BY p.id, p.first_name, p.last_name
         ORDER BY score DESC
         LIMIT 50`
      );

      const rankings = rankingsResult.rows.map((r: any, i: number) => ({
        student_id: r.student_id,
        name: r.name,
        score: Math.round(r.score),
        rank: i + 1,
      }));

      const myRankRow = studentId ? rankings.find((r: any) => r.student_id === studentId) : null;

      await pool.end();
      return NextResponse.json({
        rankings,
        myRank: myRankRow ? { rank: myRankRow.rank, total: rankings.length, score: myRankRow.score } : null,
      });
    }

    if (type === 'mastery') {
      const rankingsResult = await pool.query(
        `SELECT 
          p.id as student_id,
          CONCAT(p.first_name, ' ', p.last_name) as name,
          COALESCE(AVG(ms.mastery_score), 0) as score
         FROM profiles p
         JOIN mastery_scores ms ON ms.student_id = p.id
         GROUP BY p.id, p.first_name, p.last_name
         ORDER BY score DESC
         LIMIT 50`
      );

      const rankings = rankingsResult.rows.map((r: any, i: number) => ({
        student_id: r.student_id,
        name: r.name,
        score: Math.round(r.score),
        rank: i + 1,
      }));

      const myRankRow = studentId ? rankings.find((r: any) => r.student_id === studentId) : null;

      await pool.end();
      return NextResponse.json({
        rankings,
        myRank: myRankRow ? { rank: myRankRow.rank, total: rankings.length, score: myRankRow.score } : null,
      });
    }

    await pool.end();
    return NextResponse.json({ rankings: [] });
  } catch (error: any) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
