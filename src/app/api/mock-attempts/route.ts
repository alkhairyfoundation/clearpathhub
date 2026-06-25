import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

function calculateMasteryLevel(score: number): string {
  if (score >= 90) return 'MASTERED';
  if (score >= 80) return 'PROFICIENT';
  if (score >= 70) return 'EXCELLENT';
  if (score >= 60) return 'GOOD';
  return 'POOR';
}

function calculatePathway(bySubject: Record<string, { correct: number; total: number }>, byTopic: Record<string, { correct: number; total: number }>): { pathway: string; reasoning: string } {
  const mathPct = bySubject['MATHEMATICS'] ? Math.round((bySubject['MATHEMATICS'].correct / bySubject['MATHEMATICS'].total) * 100) : 0;
  const englishPct = bySubject['ENGLISH'] ? Math.round((bySubject['ENGLISH'].correct / bySubject['ENGLISH'].total) * 100) : 0;
  const sciencePct = bySubject['BASIC SCIENCE'] ? Math.round((bySubject['BASIC SCIENCE'].correct / bySubject['BASIC SCIENCE'].total) * 100) : 0;

  const algebraTopics = Object.entries(byTopic).filter(([t]) => /algebra|equation|factor/i.test(t));
  const algebraPct = algebraTopics.length > 0 ? Math.round(algebraTopics.reduce((s, [_, d]) => s + (d.correct / d.total) * 100, 0) / algebraTopics.length) : 0;
  const readingTopics = Object.entries(byTopic).filter(([t]) => /reading|comprehension|summary/i.test(t));
  const readingPct = readingTopics.length > 0 ? Math.round(readingTopics.reduce((s, [_, d]) => s + (d.correct / d.total) * 100, 0) / readingTopics.length) : 0;

  const scienceTrack = mathPct > 70 && algebraPct > 65 && sciencePct > 65;
  const commercialTrack = mathPct > 70 && englishPct > 60;
  const artsTrack = englishPct > 75 && readingPct > 70;

  if (scienceTrack) {
    return { pathway: 'SCIENCE', reasoning: `Strong performance in Mathematics (${mathPct}%), Algebra (${algebraPct}%), and Basic Science (${sciencePct}%) indicates aptitude for Science-focused senior secondary studies.` };
  }
  if (commercialTrack) {
    return { pathway: 'COMMERCIAL', reasoning: `Strong performance in Mathematics (${mathPct}%) and English (${englishPct}%) indicates aptitude for Commercial/Business-focused senior secondary studies.` };
  }
  if (artsTrack) {
    return { pathway: 'ARTS', reasoning: `Strong performance in English (${englishPct}%) and Reading/Comprehension (${readingPct}%) indicates aptitude for Arts/Humanities-focused senior secondary studies.` };
  }

  const maxPct = Math.max(mathPct, englishPct, sciencePct);
  if (maxPct === mathPct) return { pathway: 'COMMERCIAL', reasoning: `Mathematics (${mathPct}%) is the strongest area suggesting Commercial track potential.` };
  if (maxPct === englishPct) return { pathway: 'ARTS', reasoning: `English (${englishPct}%) is the strongest area suggesting Arts track potential.` };
  return { pathway: 'SCIENCE', reasoning: `Basic Science (${sciencePct}%) is the strongest area suggesting Science track potential. Further development needed across all subjects.` };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    const adminClient = createSupabaseAdminClient();

    switch (action) {
      case 'start_attempt': {
        const { exam_id, student_id } = params;
        if (!exam_id || !student_id) {
          return NextResponse.json({ success: false, error: 'exam_id and student_id required' }, { status: 400 });
        }

        const { data: existingAttempts, error: countError } = await adminClient
          .from('mock_attempts')
          .select('id, attempt_number', { count: 'exact' })
          .eq('exam_id', exam_id)
          .eq('student_id', student_id);

        if (countError) return NextResponse.json({ success: false, error: countError.message }, { status: 500 });

        const { data: exam } = await adminClient.from('mock_exams').select('*').eq('id', exam_id).single();
        const maxAttempts = exam?.max_attempts || 0;
        const currentAttempts = existingAttempts?.length || 0;

        if (maxAttempts > 0 && currentAttempts >= maxAttempts) {
          return NextResponse.json({ success: false, error: 'Maximum attempts reached' }, { status: 403 });
        }

        const attemptNumber = currentAttempts + 1;
        const { data, error } = await adminClient.from('mock_attempts').insert({
          exam_id, student_id, attempt_number: attemptNumber,
          started_at: new Date().toISOString(),
        }).select().single();

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, attempt: data }, { status: 201 });
      }

      case 'submit_attempt': {
        const { attempt_id, answers, security_events, time_taken_seconds } = params;
        if (!attempt_id || !answers) {
          return NextResponse.json({ success: false, error: 'attempt_id and answers required' }, { status: 400 });
        }

        const { data: attempt, error: attemptError } = await adminClient
          .from('mock_attempts')
          .select('*, exam:mock_exams(*)')
          .eq('id', attempt_id)
          .single();

        if (attemptError || !attempt) return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });

        let totalPoints = 0;
        let earnedPoints = 0;
        const bySubject: Record<string, { correct: number; total: number }> = {};
        const byDifficulty: Record<string, { correct: number; total: number }> = {};
        const byTopic: Record<string, { correct: number; total: number }> = {};

        const answersDetail = (answers as any[]).map((a: any) => {
          const pts = a.points || 1;
          totalPoints += pts;
          const isCorrect = a.is_correct === true;
          if (isCorrect) earnedPoints += pts;

          const subj = a.subject || 'UNSPECIFIED';
          const diff = a.difficulty_level || 'UNSPECIFIED';
          const topic = a.topic || 'General';

          if (!bySubject[subj]) bySubject[subj] = { correct: 0, total: 0 };
          bySubject[subj].total++;
          if (isCorrect) bySubject[subj].correct++;

          if (!byDifficulty[diff]) byDifficulty[diff] = { correct: 0, total: 0 };
          byDifficulty[diff].total++;
          if (isCorrect) byDifficulty[diff].correct++;

          if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 };
          byTopic[topic].total++;
          if (isCorrect) byTopic[topic].correct++;

          return {
            question_index: a.question_index,
            question: a.question,
            question_type: a.question_type,
            subject: subj,
            difficulty_level: diff,
            topic,
            correct_answer: a.correct_answer,
            given_answer: a.given_answer,
            is_correct: isCorrect,
            points: pts,
            points_earned: isCorrect ? pts : 0,
            options: a.options,
            explanation: a.explanation,
          };
        });

        const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        const masteryLevel = calculateMasteryLevel(score);

        const { pathway, reasoning } = calculatePathway(bySubject, byTopic);

        const { error: updateError } = await adminClient
          .from('mock_attempts')
          .update({
            score,
            mastery_level: masteryLevel,
            answers: answersDetail,
            subject_scores: bySubject,
            topic_mastery: { by_subject: bySubject, by_difficulty: byDifficulty, by_topic: byTopic },
            security_events: security_events || [],
            time_taken_seconds: time_taken_seconds || 0,
            completed_at: new Date().toISOString(),
          })
          .eq('id', attempt_id);

        if (updateError) return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });

        const { data: allAttempts } = await adminClient
          .from('mock_attempts')
          .select('score, mastery_level')
          .eq('exam_id', attempt.exam_id)
          .eq('student_id', attempt.student_id)
          .order('created_at', { ascending: false });

        const scores = allAttempts?.map(a => a.score || 0) || [];
        const bestScore = scores.length > 0 ? Math.max(...scores) : score;
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : score;

        const weakest = Object.entries(bySubject)
          .filter(([_, d]) => d.total > 0)
          .sort(([_, a], [__, b]) => (a.correct / a.total) - (b.correct / b.total))
          .slice(0, 2)
          .map(([s]) => s);

        const strongest = Object.entries(bySubject)
          .filter(([_, d]) => d.total > 0)
          .sort(([_, a], [__, b]) => (b.correct / b.total) - (a.correct / a.total))
          .slice(0, 2)
          .map(([s]) => s);

        const { data: existingAnalytics } = await adminClient
          .from('mock_analytics')
          .select('id')
          .eq('student_id', attempt.student_id)
          .eq('exam_id', attempt.exam_id)
          .maybeSingle();

        if (existingAnalytics) {
          await adminClient.from('mock_analytics').update({
            total_attempts: scores.length,
            best_score: bestScore,
            average_score: avgScore,
            latest_score: score,
            mastery_level: masteryLevel,
            topic_performance: { by_subject: bySubject, by_difficulty: byDifficulty, by_topic: byTopic },
            weakest_subjects: weakest,
            strongest_subjects: strongest,
            recommended_pathway: pathway,
            pathway_reasoning: reasoning,
            updated_at: new Date().toISOString(),
          }).eq('id', existingAnalytics.id);
        } else {
          await adminClient.from('mock_analytics').insert({
            student_id: attempt.student_id,
            exam_id: attempt.exam_id,
            total_attempts: scores.length,
            best_score: bestScore,
            average_score: avgScore,
            latest_score: score,
            mastery_level: masteryLevel,
            topic_performance: { by_subject: bySubject, by_difficulty: byDifficulty, by_topic: byTopic },
            weakest_subjects: weakest,
            strongest_subjects: strongest,
            recommended_pathway: pathway,
            pathway_reasoning: reasoning,
          });
        }

        return NextResponse.json({
          success: true,
          score,
          masteryLevel,
          totalQuestions: totalPoints,
          correctCount: earnedPoints,
          pathway,
          pathwayReasoning: reasoning,
        });
      }

      case 'list_attempts': {
        const { exam_id, student_id } = params;
        let query = adminClient.from('mock_attempts').select('*, student:profiles!student_id(first_name, last_name, email)');
        if (exam_id) query = query.eq('exam_id', exam_id);
        if (student_id) query = query.eq('student_id', student_id);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, attempts: data });
      }

      case 'get_attempt': {
        const { id } = params;
        if (!id) return NextResponse.json({ success: false, error: 'Attempt ID required' }, { status: 400 });
        const { data, error } = await adminClient.from('mock_attempts').select('*, exam:mock_exams(*)').eq('id', id).single();
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, attempt: data });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
