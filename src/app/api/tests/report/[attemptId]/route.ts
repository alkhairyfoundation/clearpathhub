import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

function gradeQuestion(question: any, answer: any): boolean {
  if (answer === undefined || answer === null) return false;
  switch (question.question_type) {
    case 'multiple_choice':
    case 'true_false':
      return answer === question.correct_answer;
    case 'fill_blank': {
      const correct = question.options?.[question.correct_answer];
      if (!correct) return false;
      return answer.toString().toLowerCase().trim() === correct.toString().toLowerCase().trim();
    }
    case 'multiple_selection': {
      const a = Array.isArray(answer) ? [...answer].sort() : [];
      const c = Array.isArray(question.correct_answer) ? [...question.correct_answer].sort() : [];
      return JSON.stringify(a) === JSON.stringify(c);
    }
    case 'short_answer':
      return false;
    default:
      return answer === question.correct_answer;
  }
}

export async function GET(req: NextRequest, { params }: { params: { attemptId: string } }) {
  try {
    const token = await getToken({ req });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { attemptId } = params;
    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    const attemptRes = await pool.query(
      `SELECT ta.*, t.title, t.description, t.subject_id, t.class_id, t.test_type, t.total_marks, t.passing_score, t.duration_minutes,
              s.name AS subject_name, s.code AS subject_code, c.name AS class_name
       FROM test_attempts ta
       JOIN tests t ON ta.test_id = t.id
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN classes c ON t.class_id = c.id
       WHERE ta.id = $1`,
      [attemptId]
    );

    if (attemptRes.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const attempt = attemptRes.rows[0];

    const questionsRes = await pool.query(
      'SELECT * FROM test_questions WHERE test_id = $1 ORDER BY order_index',
      [attempt.test_id]
    );
    const questions = questionsRes.rows;

    const answersObj = typeof attempt.answers === 'object' && attempt.answers ? attempt.answers : {};
    const questionDetails: any[] = [];
    const bySubject: Record<string, { correct: number; total: number }> = {};
    const byDifficulty: Record<string, { correct: number; total: number }> = {};
    const byTopic: Record<string, { correct: number; total: number }> = {};

    let correctCount = 0;
    questions.forEach((q: any, i: number) => {
      const studentAnswer = (answersObj as Record<string, any>)[i];
      const isCorrect = gradeQuestion(q, studentAnswer);
      if (isCorrect) correctCount++;

      const subj = q.subject || 'General';
      const diff = q.difficulty_level || 'Not Specified';
      const topic = q.topic || 'General';

      if (!bySubject[subj]) bySubject[subj] = { correct: 0, total: 0 };
      bySubject[subj].total++;
      if (isCorrect) bySubject[subj].correct++;

      if (!byDifficulty[diff]) byDifficulty[diff] = { correct: 0, total: 0 };
      byDifficulty[diff].total++;
      if (isCorrect) byDifficulty[diff].correct++;

      if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 };
      byTopic[topic].total++;
      if (isCorrect) byTopic[topic].correct++;

      questionDetails.push({
        index: i + 1,
        question: q.question,
        question_type: q.question_type,
        subject: subj,
        difficulty_level: diff,
        topic,
        options: q.options,
        correct_answer: q.correct_answer,
        given_answer: studentAnswer,
        is_correct: isCorrect,
        points: q.points || 1,
        points_earned: isCorrect ? (q.points || 1) : 0,
      });
    });

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= (attempt.passing_score || 50);

    const subjectPerformance = Object.entries(bySubject).map(([name, data]) => ({
      name,
      correct: data.correct,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    }));

    const difficultyBreakdown = Object.entries(byDifficulty).map(([level, data]) => ({
      level,
      correct: data.correct,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    }));

    const topicPerformance = Object.entries(byTopic).map(([name, data]) => ({
      name,
      correct: data.correct,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    })).sort((a, b) => a.percentage - b.percentage);

    const strengths = subjectPerformance.filter(s => s.percentage >= 70).map(s => s.name);
    const needsImprovement = subjectPerformance.filter(s => s.percentage < 50).map(s => s.name);
    const weakTopics = topicPerformance.filter(t => t.percentage < 50).map(t => t.name);

    let studentName = '';
    let studentAdmission = '';
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      const { data: sp } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', attempt.student_id)
        .single();
      if (sp) studentName = `${sp.first_name || ''} ${sp.last_name || ''}`.trim();
      const { data: st } = await supabase
        .from('students')
        .select('admission_number')
        .eq('profile_id', attempt.student_id)
        .maybeSingle();
      if (st) studentAdmission = st.admission_number || '';
    } catch (_) {}

    await pool.end();

    return NextResponse.json({
      success: true,
      data: {
        student: { name: studentName, admission: studentAdmission },
        attempt: {
          id: attempt.id,
          test_id: attempt.test_id,
          student_id: attempt.student_id,
          score,
          passed,
          correct_answers: correctCount,
          total_questions: totalQuestions,
          time_taken: attempt.time_taken,
          tab_switches: attempt.tab_switches,
          fullscreen_exits: attempt.fullscreen_exits,
          started_at: attempt.started_at,
          completed_at: attempt.completed_at,
        },
        test: {
          title: attempt.title,
          description: attempt.description,
          test_type: attempt.test_type,
          subject_name: attempt.subject_name,
          subject_code: attempt.subject_code,
          class_name: attempt.class_name,
          total_marks: attempt.total_marks,
          passing_score: attempt.passing_score,
          duration_minutes: attempt.duration_minutes,
        },
        questions: questionDetails,
        subjectPerformance,
        difficultyBreakdown,
        topicPerformance,
        insights: {
          strengths,
          needsImprovement,
          weakTopics,
          overall: score >= 70 ? 'Good' : score >= 50 ? 'Average' : 'Needs Improvement',
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching test report:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
