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

    if (studentEmail && answersData) {
      const bySubject: Record<string, { correct: number; total: number }> = {};
      const byDifficulty: Record<string, { correct: number; total: number }> = {};
      const byTopic: Record<string, { correct: number; total: number }> = {};

      const questionsDetail = answersData.map((a: any) => {
        const subj = a.subject || 'UNSPECIFIED';
        const diff = a.difficulty_level || 'UNSPECIFIED';
        const topic = a.topic || 'General';

        if (!bySubject[subj]) bySubject[subj] = { correct: 0, total: 0 };
        bySubject[subj].total++;
        if (a.is_correct) bySubject[subj].correct++;

        if (!byDifficulty[diff]) byDifficulty[diff] = { correct: 0, total: 0 };
        byDifficulty[diff].total++;
        if (a.is_correct) byDifficulty[diff].correct++;

        if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 };
        byTopic[topic].total++;
        if (a.is_correct) byTopic[topic].correct++;

        return {
          question_index: a.question_index,
          question: a.question,
          question_type: a.question_type,
          subject: subj,
          difficulty_level: diff,
          topic,
          correct_answer: a.correct_answer,
          given_answer: a.given_answer,
          is_correct: a.is_correct,
          points: a.points || 1,
          points_earned: a.is_correct ? (a.points || 1) : 0,
        };
      });

      await adminClient.from('student_analytics').insert({
        application_id: applicationId,
        student_email: studentEmail,
        subject: 'COMBINED',
        score,
        mastery_level: masteryLevel,
        topic_performance: {
          by_subject: bySubject,
          by_difficulty: byDifficulty,
          by_topic: byTopic,
          questions: questionsDetail,
          total_questions: answersData.length,
          correct_count: answersData.filter((a: any) => a.is_correct).length,
          time_taken_minutes: timeTaken || 0,
        },
        time_taken_seconds: timeTaken * 60,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Entrance submit error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
