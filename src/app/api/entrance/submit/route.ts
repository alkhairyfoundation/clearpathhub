import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, score, status, masteryLevel, answersData, securityEvents, timeTaken, codeId, studentEmail } = body;

    if (!applicationId) {
      return NextResponse.json({ success: false, error: 'Missing applicationId' }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();

    const { error: updateError } = await adminClient
      .from('entrance_applications')
      .update({
        exam_score: score,
        status,
        mastery_level: masteryLevel,
        answers: answersData,
        security_events: securityEvents,
        completed_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    if (codeId) {
      const { error: codeError } = await adminClient
        .rpc('increment_code_usage', { p_code_id: codeId });

      if (codeError) {
        const { data: currentCode } = await adminClient
          .from('entrance_codes')
          .select('used_count')
          .eq('id', codeId)
          .single();

        await adminClient
          .from('entrance_codes')
          .update({ used_count: (currentCode?.used_count || 0) + 1 })
          .eq('id', codeId);
      }
    }

    if (studentEmail) {
      await adminClient.from('student_analytics').insert({
        application_id: applicationId,
        student_email: studentEmail,
        subject: 'COMBINED',
        score,
        mastery_level: masteryLevel,
        topic_performance: {},
        time_taken_seconds: timeTaken * 60,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Entrance submit error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
