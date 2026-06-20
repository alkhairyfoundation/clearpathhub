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

export async function POST(req: NextRequest, { params }: { params: { testId: string } }) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testId } = params;
    const body = await req.json();
    const {
      student_id, answers, tab_switches, fullscreen_exits,
      time_taken, started_at, security_events
    } = body;

    if (!student_id || !answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    const testResult = await pool.query(
      'SELECT * FROM tests WHERE id = $1 AND is_published = true',
      [testId]
    );

    if (testResult.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const test = testResult.rows[0];

    const questionsResult = await pool.query(
      'SELECT * FROM test_questions WHERE test_id = $1 ORDER BY order_index',
      [testId]
    );
    const questions = questionsResult.rows;

    let correct = 0;
    const answersArr = typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
    questions.forEach((q: any, i: number) => {
      if (gradeQuestion(q, (answersArr as Record<string, any>)[i])) correct++;
    });
    const finalScore = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const passed = finalScore >= (test.passing_score || 50);

    const attemptResult = await pool.query(
      `INSERT INTO test_attempts (test_id, student_id, answers, score, passed, tab_switches, fullscreen_exits, time_taken, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        testId, student_id, JSON.stringify(answersArr), finalScore, passed,
        tab_switches || 0, fullscreen_exits || 0,
        time_taken || 0, started_at || new Date().toISOString(),
      ]
    );

    const attempt = attemptResult.rows[0];

    if (security_events && Array.isArray(security_events) && security_events.length > 0) {
      try {
        const logValues = security_events.map((_: any, i: number) => {
          const offset = i * 5;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
        }).join(', ');

        const logParams: any[] = [];
        security_events.forEach((e: any) => {
          const severity = e.type === 'tab_switch' || e.type === 'fullscreen_exit'
            ? ((e.count || 1) >= 3 ? 'high' : 'medium')
            : 'low';
          logParams.push(attempt.id, student_id, e.type || 'unknown', JSON.stringify({ key: e.key, count: e.count }), severity);
        });

        await pool.query(
          `INSERT INTO exam_activity_logs (attempt_id, student_id, event_type, event_data, severity) VALUES ${logValues}`,
          logParams
        );
      } catch (logErr) {
        console.error('Failed to log security events:', logErr);
      }
    }

    await pool.end();

    return NextResponse.json({
      attempt: {
        ...attempt,
        score: finalScore,
        passed,
        correct_answers: correct,
        total_questions: questions.length,
      }
    });
  } catch (error: any) {
    console.error('Error submitting test:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
