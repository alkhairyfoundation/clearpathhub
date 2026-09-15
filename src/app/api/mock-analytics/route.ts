import { NextResponse } from 'next/server';
import { query as neonQuery } from '@/lib/neon';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'exam_summary': {
        const { exam_id } = params;
        if (!exam_id) return NextResponse.json({ success: false, error: 'exam_id required' }, { status: 400 });

        const attempts = await neonQuery(
          'SELECT score, mastery_level, student_id, time_taken_seconds FROM mock_attempts WHERE exam_id = $1::uuid',
          [exam_id]
        );

        const total = attempts?.length || 0;
        const scores = attempts?.map(a => a.score || 0) || [];
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const worstScore = scores.length > 0 ? Math.min(...scores) : 0;
        const passed = scores.filter(s => s >= 50).length;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        const masteryDist: Record<string, number> = { POOR: 0, GOOD: 0, EXCELLENT: 0, PROFICIENT: 0, MASTERED: 0 };
        attempts?.forEach((a: any) => { if (a.mastery_level && masteryDist[a.mastery_level] !== undefined) masteryDist[a.mastery_level]++; });

        const avgTime = attempts?.filter((a: any) => a.time_taken_seconds).reduce((s, a: any) => s + (a.time_taken_seconds || 0), 0) || 0;
        const avgTimeSeconds = total > 0 ? Math.round(avgTime / total) : 0;

        return NextResponse.json({
          success: true,
          summary: { totalStudents: total, averageScore: avgScore, bestScore, worstScore, passRate, avgTimeSeconds, masteryDistribution: masteryDist },
        });
      }

      case 'student_analytics': {
        const { exam_id, student_id } = params;
        if (!student_id) return NextResponse.json({ success: false, error: 'student_id required' }, { status: 400 });

        const analyticsRows = await neonQuery(
          'SELECT * FROM mock_analytics WHERE student_id = $1::uuid AND exam_id = $2::uuid LIMIT 1',
          [student_id, exam_id]
        );
        const analytics = analyticsRows[0] || null;

        const attempts = await neonQuery(
          'SELECT * FROM mock_attempts WHERE student_id = $1::uuid AND exam_id = $2::uuid ORDER BY created_at DESC',
          [student_id, exam_id]
        );

        return NextResponse.json({ success: true, analytics, attempts });
      }

      case 'all_student_analytics': {
        const { exam_id } = params;
        const conds: string[] = [];
        const qParams: any[] = [];
        if (exam_id) {
          conds.push(`a.exam_id = $${qParams.length + 1}::uuid`);
          qParams.push(exam_id);
        }
        const sql = `SELECT a.*,
          (SELECT to_jsonb(tmp)
           FROM (SELECT p.first_name, p.last_name, p.email, p.id) AS tmp) AS student
          FROM mock_analytics a
          LEFT JOIN profiles p ON p.id = a.student_id
          ${conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : ''}
          ORDER BY a.average_score DESC`;
        const data = await neonQuery(sql, qParams);
        return NextResponse.json({ success: true, analytics: data });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}