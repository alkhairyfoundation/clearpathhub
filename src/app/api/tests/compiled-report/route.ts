import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

function gradeQuestion(question: any, answer: any): boolean {
  if (answer === undefined || answer === null) return false;
  const ca = question.correct_answer;
  switch (question.question_type) {
    case 'multiple_choice':
    case 'true_false':
      return String(answer) === String(ca);
    case 'fill_blank': {
      const correct = question.options?.[ca];
      if (!correct) return false;
      return answer.toString().toLowerCase().trim() === correct.toString().toLowerCase().trim();
    }
    case 'multiple_selection': {
      const a = Array.isArray(answer) ? [...answer].sort() : [];
      const c = Array.isArray(ca) ? [...ca].sort() : [];
      return JSON.stringify(a) === JSON.stringify(c);
    }
    case 'short_answer':
      return false;
    default:
      return String(answer) === String(ca);
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const termId = searchParams.get('termId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    // Fetch all test attempts for the student with test/subject/class info
    let attemptQuery = `
      SELECT ta.*, t.title, t.description, t.subject_id, t.class_id, t.test_type,
             t.total_marks, t.passing_score, t.duration_minutes, t.exam_date,
             s.name AS subject_name, s.code AS subject_code, c.name AS class_name
      FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN classes c ON t.class_id = c.id
      WHERE ta.student_id = $1 AND ta.completed_at IS NOT NULL
    `;
    const attemptParams: any[] = [studentId];
    let paramIdx = 2;

    if (classId) {
      attemptQuery += ` AND t.class_id = $${paramIdx}`;
      attemptParams.push(classId);
      paramIdx++;
    }
    if (termId) {
      attemptQuery += ` AND t.term_id = $${paramIdx}`;
      attemptParams.push(termId);
      paramIdx++;
    }
    if (dateFrom) {
      attemptQuery += ` AND ta.completed_at >= $${paramIdx}`;
      attemptParams.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      attemptQuery += ` AND ta.completed_at <= $${paramIdx}`;
      attemptParams.push(dateTo);
      paramIdx++;
    }

    attemptQuery += ' ORDER BY ta.completed_at ASC';

    const attemptsRes = await pool.query(attemptQuery, attemptParams);
    const attempts = attemptsRes.rows;

    if (attempts.length === 0) {
      await pool.end();
      return NextResponse.json({
        success: true,
        data: {
          student: null,
          summary: { totalTests: 0, avgScore: 0, passRate: 0, highestScore: 0, lowestScore: 0, totalCorrect: 0, totalQuestions: 0 },
          scoreTrend: [],
          subjectPerformance: [],
          topicPerformance: [],
          subjectTopicBreakdown: [],
          difficultyBreakdown: [],
          questionPatterns: [],
          securitySummary: { totalTabSwitches: 0, totalFullscreenExits: 0, avgSecurityScore: 0 },
          insights: { strengths: [], needsImprovement: [], weakTopics: [], overall: 'No Data', subjectRecommendations: [], recommendations: [] },
          attempts: [],
        },
      });
    }

    // Get student info
    let studentName = '';
    let studentAdmission = '';
    let className = '';
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      const { data: sp } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', studentId)
        .single();
      if (sp) studentName = `${sp.first_name || ''} ${sp.last_name || ''}`.trim();

      const { data: st } = await supabase
        .from('students')
        .select('admission_number, class:classes!class_id(name)')
        .eq('profile_id', studentId)
        .maybeSingle();
      if (st) {
        studentAdmission = st.admission_number || '';
        className = (st as any).class?.name || '';
      }
    } catch (_) {}

    // Process each attempt
    const allSubjectData: Record<string, { correct: number; total: number }> = {};
    const allTopicData: Record<string, { correct: number; total: number }> = {};
    const allSubjectTopicData: Record<string, Record<string, { correct: number; total: number }>> = {};
    const allDifficultyData: Record<string, { correct: number; total: number }> = {};
    const allQuestionPatterns: Record<string, { question: string; subject: string; topic: string; difficulty: string; timesSeen: number; timesCorrect: number; testTitles: string[] }> = {};
    let totalCorrectAll = 0;
    let totalQuestionsAll = 0;
    let totalTabSwitches = 0;
    let totalFullscreenExits = 0;

    const processedAttempts = [];

    for (const attempt of attempts) {
      const questionsRes = await pool.query(
        'SELECT * FROM test_questions WHERE test_id = $1 ORDER BY order_index',
        [attempt.test_id]
      );
      const questions = questionsRes.rows;
      let answersObj: Record<string, any> = {};
      if (attempt.answers) {
        if (typeof attempt.answers === 'string') {
          try { answersObj = JSON.parse(attempt.answers); } catch { answersObj = {}; }
        } else if (typeof attempt.answers === 'object') {
          answersObj = attempt.answers;
        }
      }

      let attemptCorrect = 0;
      const testSubjectName = attempt.subject_name || '';

      questions.forEach((q: any, i: number) => {
        const studentAnswer = (answersObj as Record<string, any>)[i];
        const isCorrect = gradeQuestion(q, studentAnswer);

        const subj = q.subject || testSubjectName || 'General';
        const topic = q.topic || 'General';
        const difficulty = q.difficulty_level || 'Not Specified';

        if (isCorrect) {
          attemptCorrect++;
          totalCorrectAll++;
        }
        totalQuestionsAll++;

        // Subject aggregation
        if (!allSubjectData[subj]) allSubjectData[subj] = { correct: 0, total: 0 };
        allSubjectData[subj].total++;
        if (isCorrect) allSubjectData[subj].correct++;

        // Topic aggregation
        if (!allTopicData[topic]) allTopicData[topic] = { correct: 0, total: 0 };
        allTopicData[topic].total++;
        if (isCorrect) allTopicData[topic].correct++;

        // Subject-Topic aggregation
        if (!allSubjectTopicData[subj]) allSubjectTopicData[subj] = {};
        if (!allSubjectTopicData[subj][topic]) allSubjectTopicData[subj][topic] = { correct: 0, total: 0 };
        allSubjectTopicData[subj][topic].total++;
        if (isCorrect) allSubjectTopicData[subj][topic].correct++;

        // Difficulty aggregation
        if (!allDifficultyData[difficulty]) allDifficultyData[difficulty] = { correct: 0, total: 0 };
        allDifficultyData[difficulty].total++;
        if (isCorrect) allDifficultyData[difficulty].correct++;

        // Question patterns (key by question text to track across attempts)
        const qKey = q.question?.substring(0, 100) || `q_${i}`;
        if (!allQuestionPatterns[qKey]) {
          allQuestionPatterns[qKey] = {
            question: q.question,
            subject: subj,
            topic,
            difficulty,
            timesSeen: 0,
            timesCorrect: 0,
            testTitles: [],
          };
        }
        allQuestionPatterns[qKey].timesSeen++;
        if (isCorrect) allQuestionPatterns[qKey].timesCorrect++;
        if (!allQuestionPatterns[qKey].testTitles.includes(attempt.title)) {
          allQuestionPatterns[qKey].testTitles.push(attempt.title);
        }
      });

      const attemptScore = questions.length > 0 ? Math.round((attemptCorrect / questions.length) * 100) : 0;
      totalTabSwitches += attempt.tab_switches || 0;
      totalFullscreenExits += attempt.fullscreen_exits || 0;

      processedAttempts.push({
        id: attempt.id,
        testId: attempt.test_id,
        title: attempt.title,
        subjectName: attempt.subject_name || 'N/A',
        className: attempt.class_name || 'N/A',
        testType: attempt.test_type,
        score: attemptScore,
        passed: attemptScore >= (attempt.passing_score || 50),
        correctAnswers: attemptCorrect,
        totalQuestions: questions.length,
        timeTaken: attempt.time_taken || 0,
        durationMinutes: attempt.duration_minutes || 0,
        tabSwitches: attempt.tab_switches || 0,
        fullscreenExits: attempt.fullscreen_exits || 0,
        completedAt: attempt.completed_at,
      });
    }

    // Build compiled metrics
    const scores = processedAttempts.map(a => a.score);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const passRate = scores.length > 0 ? Math.round((processedAttempts.filter(a => a.passed).length / scores.length) * 100) : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    // Score trend
    const scoreTrend = processedAttempts.map(a => ({
      date: a.completedAt,
      score: a.score,
      testTitle: a.title,
      subjectName: a.subjectName,
    }));

    // Subject performance
    const subjectPerformance = Object.entries(allSubjectData).map(([name, data]) => ({
      name,
      correct: data.correct,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    })).sort((a, b) => b.percentage - a.percentage);

    // Topic performance
    const topicPerformance = Object.entries(allTopicData).map(([name, data]) => ({
      name,
      correct: data.correct,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    })).sort((a, b) => a.percentage - b.percentage);

    // Subject-topic breakdown
    const subjectTopicBreakdown = Object.entries(allSubjectTopicData).map(([subject, topics]) => ({
      subject,
      topics: Object.entries(topics).map(([topicName, data]) => ({
        name: topicName,
        correct: data.correct,
        total: data.total,
        percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      })).sort((a, b) => a.percentage - b.percentage),
    }));

    // Difficulty breakdown
    const difficultyBreakdown = Object.entries(allDifficultyData).map(([level, data]) => ({
      level,
      correct: data.correct,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    }));

    // Question patterns - find most frequently missed
    const questionPatterns = Object.values(allQuestionPatterns)
      .map(q => ({
        ...q,
        missRate: q.timesSeen > 0 ? Math.round(((q.timesSeen - q.timesCorrect) / q.timesSeen) * 100) : 0,
      }))
      .sort((a, b) => b.missRate - a.missRate);

    // Insights
    const strengths = subjectPerformance.filter(s => s.percentage >= 70).map(s => s.name);
    const needsImprovement = subjectPerformance.filter(s => s.percentage < 50).map(s => s.name);
    const weakTopics = topicPerformance.filter(t => t.percentage < 50).map(t => t.name);

    // Subject recommendations
    const subjectRecommendations = subjectPerformance.map((s: any) => {
      const subjTopics = topicPerformance.filter((t: any) => {
        return subjectTopicBreakdown.some((st: any) =>
          st.subject === s.name && st.topics.some((tt: any) => tt.name === t.name)
        );
      });
      const weakSubjTopics = subjTopics.filter((t: any) => t.percentage < 50);
      const strongSubjTopics = subjTopics.filter((t: any) => t.percentage >= 70);
      const assessment = s.percentage >= 80 ? 'Excellent' : s.percentage >= 70 ? 'Good' : s.percentage >= 50 ? 'Fair' : 'Weak';
      const recommendation = s.percentage >= 80
        ? `Continue maintaining this level. Consider exploring advanced topics.`
        : s.percentage >= 70
        ? `Good performance. Focus on ${weakSubjTopics.length > 0 ? weakSubjTopics.map((t: any) => t.name).join(', ') : 'weaker areas'} to reach excellence.`
        : s.percentage >= 50
        ? `Needs more practice. Prioritize ${weakSubjTopics.length > 0 ? weakSubjTopics.map((t: any) => t.name).join(', ') : 'key topics'} and seek additional support.`
        : `Critical area requiring immediate attention. Recommend extra tutoring and focused revision on all weak topics.`;
      return { subject: s.name, score: s.percentage, assessment, weakTopics: weakSubjTopics.map((t: any) => t.name), strongTopics: strongSubjTopics.map((t: any) => t.name), recommendation };
    });

    // General recommendations
    const recommendations: string[] = [];
    if (avgScore < 50) {
      recommendations.push('Schedule remedial sessions focusing on weak areas identified across all tests.');
      recommendations.push('Consider one-on-one tutoring for subjects below 50%.');
    } else if (avgScore < 70) {
      recommendations.push('Review topics where marks were consistently lost across multiple tests.');
      recommendations.push('Provide additional practice problems in weak subjects.');
    } else {
      recommendations.push('Challenge with advanced problems to maintain excellence.');
      recommendations.push('Encourage peer tutoring to reinforce learning.');
    }
    if (weakTopics.length > 0) {
      recommendations.push(`Prioritize revision of: ${weakTopics.slice(0, 5).join(', ')}`);
    }

    // Score trend direction
    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (scores.length >= 2) {
      const halfIdx = Math.floor(scores.length / 2);
      const firstHalfAvg = scores.slice(0, halfIdx).reduce((a, b) => a + b, 0) / halfIdx;
      const secondHalfAvg = scores.slice(halfIdx).reduce((a, b) => a + b, 0) / (scores.length - halfIdx);
      if (secondHalfAvg - firstHalfAvg > 5) trendDirection = 'improving';
      else if (firstHalfAvg - secondHalfAvg > 5) trendDirection = 'declining';
    }

    // Security summary
    const securitySummary = {
      totalTabSwitches,
      totalFullscreenExits,
      totalSecurityEvents: totalTabSwitches + totalFullscreenExits,
      testsWithEvents: processedAttempts.filter(a => (a.tabSwitches + a.fullscreenExits) > 0).length,
    };

    await pool.end();

    return NextResponse.json({
      success: true,
      data: {
        student: {
          name: studentName,
          admission: studentAdmission,
          className,
        },
        summary: {
          totalTests: processedAttempts.length,
          avgScore,
          passRate,
          highestScore,
          lowestScore,
          totalCorrect: totalCorrectAll,
          totalQuestions: totalQuestionsAll,
          trendDirection,
        },
        scoreTrend,
        subjectPerformance,
        topicPerformance,
        subjectTopicBreakdown,
        difficultyBreakdown,
        questionPatterns,
        securitySummary,
        insights: {
          strengths,
          needsImprovement,
          weakTopics,
          overall: avgScore >= 70 ? 'Good' : avgScore >= 50 ? 'Average' : 'Needs Improvement',
          subjectRecommendations,
          recommendations,
        },
        attempts: processedAttempts,
      },
    });
  } catch (error: any) {
    console.error('Error generating compiled report:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
