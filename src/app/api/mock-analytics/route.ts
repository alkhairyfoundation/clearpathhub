import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    const adminClient = createSupabaseAdminClient();

    switch (action) {
      case 'exam_summary': {
        const { exam_id } = params;
        if (!exam_id) return NextResponse.json({ success: false, error: 'exam_id required' }, { status: 400 });

        const { data: attempts, error } = await adminClient
          .from('mock_attempts')
          .select('score, mastery_level, student_id, time_taken_seconds')
          .eq('exam_id', exam_id);

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

        const total = attempts?.length || 0;
        const scores = attempts?.map(a => a.score || 0) || [];
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const worstScore = scores.length > 0 ? Math.min(...scores) : 0;
        const passed = scores.filter(s => s >= 50).length;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        const masteryDist: Record<string, number> = { POOR: 0, GOOD: 0, EXCELLENT: 0, PROFICIENT: 0, MASTERED: 0 };
        attempts?.forEach(a => { if (a.mastery_level && masteryDist[a.mastery_level] !== undefined) masteryDist[a.mastery_level]++; });

        const avgTime = attempts?.filter(a => a.time_taken_seconds).reduce((s, a) => s + (a.time_taken_seconds || 0), 0) || 0;
        const avgTimeSeconds = total > 0 ? Math.round(avgTime / total) : 0;

        return NextResponse.json({
          success: true,
          summary: { totalStudents: total, averageScore: avgScore, bestScore, worstScore, passRate, avgTimeSeconds, masteryDistribution: masteryDist },
        });
      }

      case 'student_analytics': {
        const { exam_id, student_id } = params;
        if (!student_id) return NextResponse.json({ success: false, error: 'student_id required' }, { status: 400 });

        const { data: analytics } = await adminClient
          .from('mock_analytics')
          .select('*')
          .eq('student_id', student_id)
          .eq('exam_id', exam_id)
          .maybeSingle();

        const { data: attempts } = await adminClient
          .from('mock_attempts')
          .select('*')
          .eq('student_id', student_id)
          .eq('exam_id', exam_id)
          .order('created_at', { ascending: false });

        return NextResponse.json({ success: true, analytics, attempts });
      }

      case 'all_student_analytics': {
        const { exam_id } = params;
        let query = adminClient.from('mock_analytics').select('*, student:profiles!student_id(first_name, last_name, email, id)');
        if (exam_id) query = query.eq('exam_id', exam_id);
        query = query.order('average_score', { ascending: false });
        const { data, error } = await query;
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, analytics: data });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
