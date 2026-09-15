import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { query as neonQuery } from '@/lib/neon';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, score, status, masteryLevel, answersData, securityEvents, timeTaken, codeId, studentEmail } = body;

    if (!applicationId) {
      return NextResponse.json({ success: false, error: 'Missing applicationId' }, { status: 400 });
    }

    // Write to Neon FIRST (primary data store)
    const completedAt = new Date().toISOString();
    await neonQuery(
      `UPDATE entrance_applications
       SET exam_score = $2, status = $3, mastery_level = $4, answers = $5::jsonb,
           security_events = $6::jsonb, completed_at = $7
       WHERE id = $1::uuid`,
      [applicationId, score, status, masteryLevel, JSON.stringify(answersData), JSON.stringify(securityEvents), completedAt]
    );

    let codeFallback = false;
    if (codeId) {
      try {
        await neonQuery('SELECT "increment_code_usage"("p_code_id" => $1::uuid)', [codeId]);
      } catch (codeError) {
        console.error('increment_code_usage failed, applying fallback:', codeError);
        codeFallback = true;
        const codeRows = await neonQuery('SELECT used_count FROM entrance_codes WHERE id = $1::uuid LIMIT 1', [codeId]);
        const currentCount = codeRows[0]?.used_count || 0;
        await neonQuery(
          'UPDATE entrance_codes SET used_count = $1 WHERE id = $2::uuid',
          [currentCount + 1, codeId]
        );
      }
    }

    let insertedAnalytics = false;
    const bySubject: Record<string, { correct: number; total: number }> = {};
    const byDifficulty: Record<string, { correct: number; total: number }> = {};
    const byTopic: Record<string, { correct: number; total: number }> = {};
    let questionsDetail: any[] = [];

    if (studentEmail && answersData) {
      questionsDetail = answersData.map((a: any) => {
        const subj = a.subject || 'General';
        const diff = a.difficulty_level || 'Not Specified';
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

      const topicPerformance = {
        by_subject: bySubject,
        by_difficulty: byDifficulty,
        by_topic: byTopic,
        questions: questionsDetail,
        total_questions: answersData.length,
        correct_count: answersData.filter((a: any) => a.is_correct).length,
        time_taken_minutes: timeTaken || 0,
      };
      await neonQuery(
        `INSERT INTO student_analytics (application_id, student_email, subject, score, mastery_level, topic_performance, time_taken_seconds)
         VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb, $7)`,
        [applicationId, studentEmail, 'COMBINED', score, masteryLevel, JSON.stringify(topicPerformance), timeTaken * 60]
      );
      insertedAnalytics = true;
    }

    // Mirror to Supabase (secondary store, best-effort)
    try {
      const adminClient = createSupabaseAdminClient();

      const { error: updateError } = await adminClient
        .from('entrance_applications')
        .update({
          exam_score: score,
          status,
          mastery_level: masteryLevel,
          answers: answersData,
          security_events: securityEvents,
          completed_at: completedAt
        })
        .eq('id', applicationId);
      if (updateError) console.error('Supabase entrance_applications mirror error:', updateError);

      if (codeId) {
        if (codeFallback) {
          const { data: currentCode } = await adminClient
            .from('entrance_codes')
            .select('used_count')
            .eq('id', codeId)
            .single();
          await adminClient
            .from('entrance_codes')
            .update({ used_count: (currentCode?.used_count || 0) + 1 })
            .eq('id', codeId);
        } else {
          await adminClient.rpc('increment_code_usage', { p_code_id: codeId });
        }
      }

      if (studentEmail && answersData && insertedAnalytics) {
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
    } catch (mirrorError) {
      console.error('Supabase entrance mirror error:', mirrorError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Entrance submit error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}