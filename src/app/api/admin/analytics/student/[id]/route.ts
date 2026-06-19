import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

interface QueryParams {
  term?: string;
  academic_year?: string;
  date_from?: string;
  date_to?: string;
  subject_id?: string;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const studentId = params.id;
    const { searchParams } = new URL(req.url);
    const q: QueryParams = {
      term: searchParams.get('term') || undefined,
      academic_year: searchParams.get('academic_year') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      subject_id: searchParams.get('subject_id') || undefined,
    };

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    const subjectFilter = q.subject_id ? `AND r.subject_id = $2` : '';
    const subjectParam = q.subject_id || '';
    const termFilter = q.term ? (q.subject_id ? `AND r.term = $3` : `AND r.term = $2`) : '';
    const termParam = q.term || '';
    const yearFilter = q.academic_year
      ? (q.term ? (q.subject_id ? `AND r.academic_year = $4` : `AND r.academic_year = $3`) : q.subject_id ? `AND r.academic_year = $3` : `AND r.academic_year = $2`)
      : '';

    const getParams = (base: string[], subjectVal?: string, termVal?: string, yearVal?: string): any[] => {
      const p = [...base];
      if (q.subject_id) p.push(subjectVal || q.subject_id);
      if (q.term) p.push(termVal || q.term);
      if (q.academic_year) p.push(yearVal || q.academic_year);
      return p;
    };

    const dateWhere = (tableAlias: string): string => {
      const clauses: string[] = [];
      const hasSubject = q.subject_id;
      const hasTerm = q.term;
      const hasYear = q.academic_year;
      let idx = 2;
      if (hasSubject) idx++;
      if (hasTerm) idx++;
      if (hasYear) idx++;
      if (q.date_from) { clauses.push(`${tableAlias}.date >= $${idx++}`); }
      if (q.date_to) { clauses.push(`${tableAlias}.date <= $${idx++}`); }
      return clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : '';
    };

    const dateParams = (): string[] => {
      const p: string[] = [];
      if (q.date_from) p.push(q.date_from);
      if (q.date_to) p.push(q.date_to);
      return p;
    };

    const [
      profileResult,
      subjectsResult,
      resultsResult,
      masteryResult,
      practiceSessionsResult,
      practiceAttemptsResult,
      quizzesResult,
      homeworkResult,
      attendanceResult,
      behaviorResult,
      goalsResult,
      gamificationResult,
      islamicResult,
      skillsResult,
      riskResult,
      promotionResult,
      retentionResult,
      learningPathResult,
      accountabilityResult,
    ] = await Promise.all([
      pool.query(
        `SELECT p.id, p.first_name, p.last_name, p.email, p.phone, p.avatar_url,
                s.admission_number, s.gender, s.date_of_birth,
                c.id as class_id, c.name as class_name,
                COALESCE(sl.level, 1) as level, COALESCE(sl.total_xp, 0) as total_xp
         FROM profiles p
         LEFT JOIN students s ON s.profile_id = p.id
         LEFT JOIN student_classes sc ON sc.student_id = p.id
         LEFT JOIN classes c ON c.id = sc.class_id
         LEFT JOIN student_levels sl ON sl.student_id = p.id
         WHERE p.id = $1`,
        [studentId]
      ),

      pool.query(
        `SELECT s.id, s.name, s.code
         FROM subjects s
         JOIN results r ON r.subject_id = s.id AND r.student_id = $1
         GROUP BY s.id, s.name, s.code
         ORDER BY s.name`,
        [studentId]
      ),

      pool.query(
        `SELECT r.id, r.subject_id, s.name as subject_name, r.exam_type, r.score, r.grade, r.term, r.academic_year, r.created_at
         FROM results r
         JOIN subjects s ON s.id = r.subject_id
         WHERE r.student_id = $1 ${subjectFilter} ${termFilter} ${yearFilter}
         ORDER BY r.created_at DESC`,
        getParams([studentId], q.subject_id, q.term, q.academic_year)
      ),

      pool.query(
        `SELECT ms.*, s.name as subject_name
         FROM mastery_scores ms
         JOIN subjects s ON s.id = ms.subject_id
         WHERE ms.student_id = $1 ${subjectFilter}
         ORDER BY s.name, ms.topic`,
        getParams([studentId], q.subject_id)
      ),

      pool.query(
        `SELECT ps.*
         FROM practice_sessions ps
         WHERE ps.student_id = $1 AND ps.status = 'completed'
         ORDER BY ps.date DESC`,
        [studentId]
      ),

      pool.query(
        `SELECT pa.difficulty, pa.topic, pa.subtopic, pa.is_correct, pa.time_taken, pa.created_at, pa.question_type
         FROM practice_attempts pa
         WHERE pa.student_id = $1
         ORDER BY pa.created_at DESC`,
        [studentId]
      ),

      pool.query(
        `SELECT qa.*, q.title as quiz_name
         FROM quiz_attempts qa
         LEFT JOIN quizzes q ON q.id = qa.quiz_id
         WHERE qa.student_id = $1
         ORDER BY qa.completed_at DESC`,
        [studentId]
      ),

      pool.query(
        `SELECT h.id, h.title, h.subject_id, s.name as subject_name, h.due_date, h.total_marks,
                hs.submitted_at, hs.marks, hs.feedback,
                CASE WHEN hs.submitted_at IS NOT NULL THEN true ELSE false END as is_submitted,
                CASE WHEN hs.submitted_at IS NOT NULL AND hs.submitted_at::date <= h.due_date THEN true ELSE false END as is_on_time
         FROM homework h
         JOIN subjects s ON s.id = h.subject_id
         LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = $1
         ORDER BY h.due_date DESC`,
        [studentId]
      ),

      pool.query(
        `SELECT a.date, a.status, a.scan_method
         FROM attendance a
         WHERE a.student_id = $1
         ORDER BY a.date DESC`,
        [studentId]
      ),

      pool.query(
        `SELECT br.*
         FROM behavioral_reports br
         WHERE br.student_id = $1
         ORDER BY br.week_start DESC`,
        [studentId]
      ),

      pool.query(
        `SELECT dg.* FROM daily_goals dg WHERE dg.student_id = $1 ORDER BY dg.date DESC`,
        [studentId]
      ),

      pool.query(
        `SELECT sl.*, ls.current_streak, ls.longest_streak, ls.last_activity_date,
                (SELECT COUNT(*) FROM badges b WHERE b.student_id = $1) as badge_count
         FROM student_levels sl
         LEFT JOIN learning_streaks ls ON ls.student_id = sl.student_id
         WHERE sl.student_id = $1`,
        [studentId, studentId]
      ),

      pool.query(
        `SELECT it.* FROM islamic_tracking it WHERE it.student_id = $1 ORDER BY it.date DESC`,
        [studentId]
      ),

      pool.query(
        `SELECT st.*, sk.name as skill_name
         FROM skills_tracking st
         LEFT JOIN skills sk ON sk.id = st.skill_id
         WHERE st.student_id = $1
         ORDER BY st.date DESC`,
        [studentId]
      ),

      pool.query(
        `SELECT srp.* FROM student_risk_predictions srp WHERE srp.student_id = $1 ORDER BY srp.prediction_date DESC`,
        [studentId]
      ),

      pool.query(
        `SELECT pr.*, c.name as next_class_name
         FROM promotion_readiness pr
         LEFT JOIN classes c ON c.id = pr.recommended_next_class::uuid
         WHERE pr.student_id = $1
         ORDER BY pr.created_at DESC LIMIT 1`,
        [studentId]
      ),

      pool.query(
        `SELECT rc.*, s.name as subject_name
         FROM retention_checks rc
         JOIN subjects s ON s.id = rc.subject_id
         WHERE rc.student_id = $1
         ORDER BY rc.check_date DESC`,
        [studentId]
      ),

      pool.query(
        `SELECT mlp.*, s.name as subject_name
         FROM mastery_learning_path mlp
         JOIN subjects s ON s.id = mlp.subject_id
         WHERE mlp.student_id = $1
         ORDER BY s.name, mlp.topic`,
        [studentId]
      ),

      pool.query(
        `SELECT * FROM daily_accountability WHERE student_id = $1 ORDER BY date DESC`,
        [studentId]
      ),
    ]);

    const profile = profileResult.rows[0];
    if (!profile) {
      await pool.end();
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const subjects = subjectsResult.rows;
    const results = resultsResult.rows;
    const masteryTopics = masteryResult.rows;
    const practiceSessions = practiceSessionsResult.rows;
    const practiceAttempts = practiceAttemptsResult.rows;
    const quizAttempts = quizzesResult.rows;
    const homeworkData = homeworkResult.rows;
    const attendanceData = attendanceResult.rows;
    const behaviorData = behaviorResult.rows;
    const goalsData = goalsResult.rows;
    const gamificationRow = gamificationResult.rows[0];
    const islamicData = islamicResult.rows;
    const skillsData = skillsResult.rows;
    const riskData = riskResult.rows;
    const promotionData = promotionResult.rows[0];
    const retentionData = retentionResult.rows;
    const learningPathData = learningPathResult.rows;
    const accountabilityData = accountabilityResult.rows;

    // ─── ACADEMIC ──────────────────────────────────────────────────────
    const resultsBySubject: Record<string, { scores: Record<string, number>; name: string }> = {};
    for (const r of results) {
      if (!resultsBySubject[r.subject_id]) {
        resultsBySubject[r.subject_id] = { scores: {}, name: r.subject_name };
      }
      resultsBySubject[r.subject_id].scores[r.exam_type] = r.score;
    }

    const academicSubjects = subjects.map((sub: any) => {
      const subResults = results.filter(r => r.subject_id === sub.id);
      const byType: Record<string, number> = {};
      for (const r of subResults) byType[r.exam_type] = r.score;
      const caScores = [byType['ca1'], byType['ca2'], byType['ca3']].filter(s => s != null);
      const examScore = byType['exam'];
      const totalCA = caScores.length > 0 ? caScores.reduce((a: number, b: number) => a + b, 0) / caScores.length : null;
      const total = totalCA != null && examScore != null ? Math.round((totalCA + examScore) / 2) :
                   totalCA != null ? Math.round(totalCA) : examScore != null ? Math.round(examScore) : null;
      return {
        subject_id: sub.id,
        subject_name: sub.name,
        ca1: byType['ca1'] ?? null,
        ca2: byType['ca2'] ?? null,
        ca3: byType['ca3'] ?? null,
        exam: examScore ?? null,
        total,
        grade: total != null ? (total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : total >= 50 ? 'D' : 'F') : null,
        trend: null,
      };
    });

    const validTotals = academicSubjects.filter((s: any) => s.total != null).map((s: any) => s.total);
    const avgScore = validTotals.length > 0 ? Math.round(validTotals.reduce((a: number, b: number) => a + b, 0) / validTotals.length) : null;
    const passCount = validTotals.filter((s: number) => s >= 50).length;
    const passRate = validTotals.length > 0 ? Math.round((passCount / validTotals.length) * 100) : null;

    const best = academicSubjects.reduce((best: any, s: any) => (s.total != null && (!best || s.total > best.total)) ? s : best, null);
    const worst = academicSubjects.reduce((worst: any, s: any) => (s.total != null && (!worst || s.total < worst.total)) ? s : worst, null);

    const scoresOverTime = results
      .filter(r => r.created_at)
      .map(r => ({ date: new Date(r.created_at).toISOString().split('T')[0], subject: r.subject_name, score: r.score, type: r.exam_type }));

    const gradeCount: Record<string, number> = {};
    for (const s of academicSubjects) {
      if (s.grade) { gradeCount[s.grade] = (gradeCount[s.grade] || 0) + 1; }
    }
    const gradeDistribution = Object.entries(gradeCount).map(([grade, count]) => ({ grade, count }));

    const academic = {
      summary: {
        total_subjects: academicSubjects.length,
        avg_score: avgScore,
        pass_rate: passRate,
        top_subject: best ? { name: best.subject_name, score: best.total } : null,
        weakest_subject: worst ? { name: worst.subject_name, score: worst.total } : null,
      },
      subjects: academicSubjects,
      scores_over_time: scoresOverTime,
      grade_distribution: gradeDistribution,
    };

    // ─── MASTERY ────────────────────────────────────────────────────────
    const avgMastery = masteryTopics.length > 0
      ? Math.round(masteryTopics.reduce((s: number, t: any) => s + (t.mastery_score || 0), 0) / masteryTopics.length)
      : null;
    const masteredCount = masteryTopics.filter((t: any) => (t.mastery_score || 0) >= 80).length;
    const developingCount = masteryTopics.filter((t: any) => (t.mastery_score || 0) >= 50 && (t.mastery_score || 0) < 80).length;
    const needsSupportCount = masteryTopics.filter((t: any) => (t.mastery_score || 0) < 50).length;

    const mastery = {
      summary: { avg_mastery_score: avgMastery, total_topics: masteryTopics.length, mastered: masteredCount, developing: developingCount, needs_support: needsSupportCount },
      topics: masteryTopics.map((t: any) => ({
        subject_id: t.subject_id, subject_name: t.subject_name, topic: t.topic,
        mastery_score: t.mastery_score, level: t.level, accuracy: t.accuracy,
        consistency: t.consistency, recency: t.recency, difficulty_progress: t.difficulty_progress,
        total_attempts: t.total_attempts, correct_attempts: t.correct_attempts,
      })),
      heatmap_data: masteryTopics.map((t: any) => ({
        subject: t.subject_name, topic: t.topic, score: t.mastery_score,
      })),
    };

    // ─── PRACTICE ───────────────────────────────────────────────────────
    const totalPracticeSessions = practiceSessions.length;
    const avgPracticeScore = totalPracticeSessions > 0
      ? Math.round(practiceSessions.reduce((s: number, ps: any) => s + (ps.score || 0), 0) / totalPracticeSessions)
      : null;
    const totalPracticeQuestions = practiceSessions.reduce((s: number, ps: any) => s + (ps.total_questions || 0), 0);
    const totalPracticeDuration = practiceSessions.reduce((s: number, ps: any) => s + (ps.duration_seconds || 0), 0);

    const sessionsByDateMap: Record<string, { date: string; sessions: number; total_score: number; total_questions: number }> = {};
    for (const ps of practiceSessions) {
      const d = ps.date ? new Date(ps.date).toISOString().split('T')[0] : '';
      if (!d) continue;
      if (!sessionsByDateMap[d]) sessionsByDateMap[d] = { date: d, sessions: 0, total_score: 0, total_questions: 0 };
      sessionsByDateMap[d].sessions++;
      sessionsByDateMap[d].total_score += ps.score || 0;
      sessionsByDateMap[d].total_questions += ps.total_questions || 0;
    }
    const sessionsByDate = Object.values(sessionsByDateMap).map((s: any) => ({
      date: s.date, sessions: s.sessions,
      avg_score: Math.round(s.total_score / s.sessions),
      total_questions: s.total_questions,
    }));

    const diffDist: Record<string, { count: number; correct: number }> = {};
    for (const pa of practiceAttempts) {
      const d = pa.difficulty || 'unknown';
      if (!diffDist[d]) diffDist[d] = { count: 0, correct: 0 };
      diffDist[d].count++;
      if (pa.is_correct) diffDist[d].correct++;
    }
    const difficultyDistribution = Object.entries(diffDist).map(([difficulty, data]) => ({
      difficulty, count: data.count, avg_score: data.count > 0 ? Math.round((data.correct / data.count) * 100) : 0,
    }));

    const topicAccMap: Record<string, { attempts: number; correct: number }> = {};
    for (const pa of practiceAttempts) {
      if (!pa.topic) continue;
      if (!topicAccMap[pa.topic]) topicAccMap[pa.topic] = { attempts: 0, correct: 0 };
      topicAccMap[pa.topic].attempts++;
      if (pa.is_correct) topicAccMap[pa.topic].correct++;
    }
    const topicAccuracy = Object.entries(topicAccMap).map(([topic, data]) => ({
      topic, attempts: data.attempts,
      correct: data.correct,
      accuracy: data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0,
    }));

    const practiceTrendMap: Record<string, { total_score: number; count: number }> = {};
    for (const ps of practiceSessions) {
      const d = ps.date ? new Date(ps.date).toISOString().split('T')[0] : '';
      if (!d) continue;
      if (!practiceTrendMap[d]) practiceTrendMap[d] = { total_score: 0, count: 0 };
      practiceTrendMap[d].total_score += ps.score || 0;
      practiceTrendMap[d].count++;
    }
    const practiceTrend = Object.entries(practiceTrendMap)
      .map(([date, data]) => ({ date, avg_score: Math.round(data.total_score / data.count) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const practice = {
      summary: {
        total_sessions: totalPracticeSessions,
        avg_score: avgPracticeScore,
        total_questions: totalPracticeQuestions,
        total_duration_seconds: totalPracticeDuration,
        avg_duration_seconds: totalPracticeSessions > 0 ? Math.round(totalPracticeDuration / totalPracticeSessions) : 0,
      },
      sessions_by_date: sessionsByDate,
      difficulty_distribution: difficultyDistribution,
      topic_accuracy: topicAccuracy,
      trend: practiceTrend,
    };

    // ─── QUIZZES ────────────────────────────────────────────────────────
    const quizPassCount = quizAttempts.filter((q: any) => q.passed).length;
    const quizAvgScore = quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((s: number, q: any) => s + (q.score || 0), 0) / quizAttempts.length)
      : null;

    const quizzes = {
      summary: {
        total_attempts: quizAttempts.length,
        pass_rate: quizAttempts.length > 0 ? Math.round((quizPassCount / quizAttempts.length) * 100) : null,
        avg_score: quizAvgScore,
      },
      attempts: quizAttempts.map((q: any) => ({
        quiz_name: q.quiz_name || 'Untitled Quiz', score: q.score, passed: q.passed,
        time_taken: q.time_taken, date: q.completed_at ? new Date(q.completed_at).toISOString().split('T')[0] : null,
      })),
    };

    // ─── HOMEWORK ───────────────────────────────────────────────────────
    const totalAssigned = homeworkData.length;
    const submittedCount = homeworkData.filter((h: any) => h.is_submitted).length;
    const onTimeCount = homeworkData.filter((h: any) => h.is_on_time).length;
    const marksList = homeworkData.filter((h: any) => h.marks != null).map((h: any) => h.marks);
    const avgMark = marksList.length > 0 ? Math.round(marksList.reduce((a: number, b: number) => a + b, 0) / marksList.length) : null;

    const homework = {
      summary: {
        total_assigned: totalAssigned,
        submitted: submittedCount,
        on_time: onTimeCount,
        completion_rate: totalAssigned > 0 ? Math.round((submittedCount / totalAssigned) * 100) : null,
        avg_mark: avgMark,
      },
      submissions: homeworkData.map((h: any) => ({
        subject: h.subject_name, title: h.title,
        submitted: h.is_submitted, marks: h.marks,
        on_time: h.is_on_time, due_date: h.due_date ? new Date(h.due_date).toISOString().split('T')[0] : null,
      })),
    };

    // ─── ATTENDANCE ─────────────────────────────────────────────────────
    const totalDays = attendanceData.length;
    const presentCount = attendanceData.filter((a: any) => a.status === 'present').length;
    const absentCount = attendanceData.filter((a: any) => a.status === 'absent').length;
    const lateCount = attendanceData.filter((a: any) => a.status === 'late').length;
    const excusedCount = attendanceData.filter((a: any) => a.status === 'excused').length;
    const attendanceRate = totalDays > 0 ? Math.round(((presentCount + excusedCount) / totalDays) * 100) : null;

    const monthlyAttendance: Record<string, { month: string; present: number; absent: number; late: number; total: number }> = {};
    for (const a of attendanceData) {
      const m = a.date ? new Date(a.date).toISOString().slice(0, 7) : '';
      if (!m) continue;
      if (!monthlyAttendance[m]) monthlyAttendance[m] = { month: m, present: 0, absent: 0, late: 0, total: 0 };
      monthlyAttendance[m].total++;
      if (a.status === 'present') monthlyAttendance[m].present++;
      else if (a.status === 'absent') monthlyAttendance[m].absent++;
      else if (a.status === 'late') monthlyAttendance[m].late++;
    }
    const attendanceMonthlyTrend = Object.values(monthlyAttendance).map(m => ({
      month: m.month,
      rate: Math.round(((m.present) / m.total) * 100),
      present: m.present,
      absent: m.absent,
      late: m.late,
    })).sort((a, b) => a.month.localeCompare(b.month));

    const attendance = {
      summary: { rate: attendanceRate, total_days: totalDays, present: presentCount, absent: absentCount, late: lateCount, excused: excusedCount },
      monthly_trend: attendanceMonthlyTrend,
    };

    // ─── BEHAVIOR ───────────────────────────────────────────────────────
    const avgBehaviorRating = behaviorData.length > 0
      ? Math.round((behaviorData.reduce((s: number, b: any) => s + (b.rating || 0), 0) / behaviorData.length) * 10) / 10
      : null;

    const behavior = {
      summary: { avg_rating: avgBehaviorRating, reports_count: behaviorData.length },
      weekly_trend: behaviorData.map((b: any) => ({
        week_start: b.week_start ? new Date(b.week_start).toISOString().split('T')[0] : null,
        rating: b.rating, participation: b.class_participation, punctuality: b.punctuality,
        homework_completion: b.homework_completion, severity: b.severity,
      })),
    };

    // ─── GOALS ──────────────────────────────────────────────────────────
    const totalGoals = goalsData.length;
    const completedGoals = goalsData.filter((g: any) => g.status === 'completed').length;
    const missedGoals = goalsData.filter((g: any) => g.status === 'missed' || (g.status === 'in_progress' && new Date(g.date) < new Date())).length;

    const goals = {
      summary: {
        total: totalGoals, completed: completedGoals, missed: missedGoals,
        completion_rate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : null,
      },
      recent: goalsData.slice(0, 20).map((g: any) => ({
        date: g.date ? new Date(g.date).toISOString().split('T')[0] : null,
        target_questions: g.target_questions, completed_questions: g.completed_questions,
        target_score: g.target_score, achieved_score: g.achieved_score, status: g.status,
      })),
    };

    // ─── GAMIFICATION ────────────────────────────────────────────────────
    const gamification = {
      level: gamificationRow?.level || 1,
      total_xp: gamificationRow?.total_xp || 0,
      current_xp: gamificationRow?.current_xp || 0,
      xp_to_next_level: gamificationRow?.xp_to_next_level || 1000,
      mastery_points: gamificationRow?.mastery_points || 0,
      current_streak: gamificationRow?.current_streak || 0,
      longest_streak: gamificationRow?.longest_streak || 0,
      last_activity_date: gamificationRow?.last_activity_date || null,
      badge_count: gamificationRow?.badge_count || 0,
    };

    // ─── ISLAMIC ────────────────────────────────────────────────────────
    const islamicDays = islamicData.length;
    const avgAdab = islamicDays > 0
      ? Math.round((islamicData.reduce((s: number, i: any) => s + (i.adab_rating || 0), 0) / islamicDays) * 10) / 10
      : null;
    const totalAyahs = islamicData.reduce((s: number, i: any) => s + (i.quran_memorized_ayahs || 0), 0);
    const totalRevisionAyahs = islamicData.reduce((s: number, i: any) => s + (i.quran_revision_ayahs || 0), 0);
    const perfectDays = islamicData.filter((i: any) =>
      i.salah_fajr && i.salah_dhuhr && i.salah_asr && i.salah_maghrib && i.salah_isha
    ).length;
    const salahCounts = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, total: 0 };
    for (const i of islamicData) {
      if (i.salah_fajr) salahCounts.fajr++;
      if (i.salah_dhuhr) salahCounts.dhuhr++;
      if (i.salah_asr) salahCounts.asr++;
      if (i.salah_maghrib) salahCounts.maghrib++;
      if (i.salah_isha) salahCounts.isha++;
      salahCounts.total++;
    }
    const salahConsistency = salahCounts.total > 0
      ? Math.round(((salahCounts.fajr + salahCounts.dhuhr + salahCounts.asr + salahCounts.maghrib + salahCounts.isha) / (salahCounts.total * 5)) * 100)
      : null;

    const islamic = {
      summary: {
        days_tracked: islamicDays, avg_adab: avgAdab,
        total_ayahs_memorized: totalAyahs, total_ayahs_revision: totalRevisionAyahs,
        salah_consistency: salahConsistency, perfect_days: perfectDays,
        salah_totals: salahCounts,
      },
      recent: islamicData.slice(0, 30).map((i: any) => ({
        date: i.date ? new Date(i.date).toISOString().split('T')[0] : null,
        salah: { fajr: i.salah_fajr, dhuhr: i.salah_dhuhr, asr: i.salah_asr, maghrib: i.salah_maghrib, isha: i.salah_isha },
        quran_memorized: i.quran_memorized_ayahs, quran_revision: i.quran_revision_ayahs,
        adab: i.adab_rating, dhikr: i.dhikr_completed,
      })),
    };

    // ─── SKILLS ─────────────────────────────────────────────────────────
    const skillCount = skillsData.length;
    const avgSkillRating = skillCount > 0
      ? Math.round((skillsData.reduce((s: number, sk: any) => s + (sk.self_rating || 0), 0) / skillCount) * 10) / 10
      : null;
    const totalSkillMinutes = skillsData.reduce((s: number, sk: any) => s + (sk.duration_minutes || 0), 0);
    const uniqueSkills = [...new Set(skillsData.map((sk: any) => sk.skill_name).filter(Boolean))];

    const bySkillMap: Record<string, { activities: number; total_rating: number; total_minutes: number }> = {};
    for (const sk of skillsData) {
      const name = sk.skill_name || 'Unknown';
      if (!bySkillMap[name]) bySkillMap[name] = { activities: 0, total_rating: 0, total_minutes: 0 };
      bySkillMap[name].activities++;
      bySkillMap[name].total_rating += sk.self_rating || 0;
      bySkillMap[name].total_minutes += sk.duration_minutes || 0;
    }
    const bySkill = Object.entries(bySkillMap).map(([skill_name, data]) => ({
      skill_name, activities: data.activities,
      avg_rating: data.activities > 0 ? Math.round((data.total_rating / data.activities) * 10) / 10 : 0,
      total_minutes: data.total_minutes,
    }));

    const skills = {
      summary: { total_activities: skillCount, avg_rating: avgSkillRating, total_minutes: totalSkillMinutes, unique_skills: uniqueSkills.length },
      by_skill: bySkill,
      recent: skillsData.slice(0, 20).map((sk: any) => ({
        date: sk.date ? new Date(sk.date).toISOString().split('T')[0] : null,
        skill: sk.skill_name, activity_type: sk.activity_type,
        duration: sk.duration_minutes, rating: sk.self_rating,
      })),
    };

    // ─── RISK ───────────────────────────────────────────────────────────
    const currentRisk = riskData[0] || null;
    const risk = {
      current: currentRisk ? {
        risk_level: currentRisk.risk_level, risk_score: currentRisk.risk_score,
        confidence: currentRisk.confidence_score, predicted_outcome: currentRisk.predicted_outcome,
        contributing_factors: currentRisk.contributing_factors,
        is_acknowledged: currentRisk.is_acknowledged,
      } : null,
      history: riskData.map((r: any) => ({
        prediction_date: r.prediction_date ? new Date(r.prediction_date).toISOString().split('T')[0] : null,
        risk_level: r.risk_level, risk_score: r.risk_score,
      })),
    };

    // ─── PROMOTION ──────────────────────────────────────────────────────
    const promotion = promotionData ? {
      academic_mastery_score: promotionData.academic_mastery_score,
      islamic_development_score: promotionData.islamic_development_score,
      skills_development_score: promotionData.skills_development_score,
      behavior_score: promotionData.behavior_score,
      attendance_score: promotionData.attendance_score,
      consistency_score: promotionData.consistency_score,
      leadership_score: promotionData.leadership_score,
      retention_score: promotionData.retention_score,
      overall_score: promotionData.overall_score,
      promotion_status: promotionData.promotion_status,
      recommended_next_class: promotionData.next_class_name || promotionData.recommended_next_class,
      supporting_evidence: promotionData.supporting_evidence,
      conditional_requirements: promotionData.conditional_requirements,
    } : null;

    // ─── RETENTION ──────────────────────────────────────────────────────
    const retentionChecks = retentionData.length;
    const retentionPassed = retentionData.filter((r: any) => r.passed === true).length;
    const retentionFailed = retentionData.filter((r: any) => r.passed === false).length;
    const retentionPending = retentionData.filter((r: any) => r.passed == null).length;

    const retention = {
      summary: { total_checks: retentionChecks, passed: retentionPassed, failed: retentionFailed, pending: retentionPending },
      checks: retentionData.map((r: any) => ({
        subject: r.subject_name, topic: r.topic, check_days: r.check_days,
        check_date: r.check_date ? new Date(r.check_date).toISOString().split('T')[0] : null,
        retest_score: r.retest_score, passed: r.passed,
        entered_reinforcement: r.entered_reinforcement,
      })),
    };

    // ─── LEARNING PATH ──────────────────────────────────────────────────
    const totalTopics = [...new Set(learningPathData.map((l: any) => l.topic))].length;
    const completedStages = learningPathData.filter((l: any) => l.is_completed).length;
    const interventionNeeded = learningPathData.filter((l: any) => l.teacher_intervention_required && !l.intervention_resolved_at).length;

    const pathBySubject: Record<string, { subject_name: string; stages: any[] }> = {};
    for (const l of learningPathData) {
      const sn = l.subject_name;
      if (!pathBySubject[sn]) pathBySubject[sn] = { subject_name: sn, stages: [] };
      pathBySubject[sn].stages.push({
        topic: l.topic, stage: l.stage, is_unlocked: l.is_unlocked,
        is_completed: l.is_completed, score: l.score_on_completion,
        attempts: l.attempts_count, intervention: l.teacher_intervention_required,
      });
    }

    const learning_path = {
      summary: { total_topics: totalTopics, completed_stages: completedStages, intervention_needed: interventionNeeded },
      subjects: Object.values(pathBySubject),
    };

    // ─── ACCOUNTABILITY ─────────────────────────────────────────────────
    const accDays = accountabilityData.length;
    const avgAccScore = accDays > 0
      ? Math.round(accountabilityData.reduce((s: number, a: any) => s + (a.total_score || 0), 0) / accDays)
      : null;
    const bestAccDay = accountabilityData.reduce((best: any, a: any) => (!best || (a.total_score || 0) > (best.total_score || 0)) ? a : best, null);
    const worstAccDay = accDays > 0
      ? accountabilityData.reduce((worst: any, a: any) => (!worst || (a.total_score || 0) < (worst.total_score || 0)) ? a : worst, null)
      : null;

    const accountability = {
      summary: {
        days_tracked: accDays, avg_score: avgAccScore,
        best_score: bestAccDay ? Math.round(bestAccDay.total_score) : null,
        worst_score: worstAccDay ? Math.round(worstAccDay.total_score) : null,
      },
      daily_trend: accountabilityData.map((a: any) => ({
        date: a.date ? new Date(a.date).toISOString().split('T')[0] : null,
        total_score: a.total_score, attendance_score: a.attendance_score,
        participation_score: a.participation_score, homework_completion_score: a.homework_completion_score,
        study_time_score: a.study_time_score, quran_score: a.quran_score,
        prayer_tracking_score: a.prayer_tracking_score, character_score: a.character_score,
        skill_activity_score: a.skill_activity_score, community_service_score: a.community_service_score,
        behavior_score: a.behavior_score, discipline_deductions: a.discipline_deductions,
      })),
    };

    // ─── INSIGHTS ENGINE ────────────────────────────────────────────────
    const insights = {
      strengths: [] as string[],
      weaknesses: [] as string[],
      improvements: [] as string[],
      declines: [] as string[],
      recommendations: [] as string[],
    };

    const classAvgScore = avgScore;
    for (const sub of academicSubjects) {
      if (sub.total && sub.total >= 75) {
        insights.strengths.push(`${sub.subject_name} (${sub.total}%) — strong performance`);
      }
      if (sub.total && sub.total < 50) {
        insights.weaknesses.push(`${sub.subject_name} (${sub.total}%) — needs significant improvement`);
      } else if (sub.total && sub.total < 60) {
        insights.weaknesses.push(`${sub.subject_name} (${sub.total}%) — below expected level`);
      }
    }

    if (mastery.summary.avg_mastery_score && mastery.summary.avg_mastery_score >= 75) {
      insights.strengths.push(`Mastery score: ${mastery.summary.avg_mastery_score}% — strong topic understanding`);
    } else if (mastery.summary.avg_mastery_score && mastery.summary.avg_mastery_score < 50) {
      insights.weaknesses.push(`Mastery score: ${mastery.summary.avg_mastery_score}% — weak topic retention`);
    }

    if (attendance.summary.rate && attendance.summary.rate >= 90) {
      insights.strengths.push(`Attendance: ${attendance.summary.rate}% — excellent attendance record`);
    } else if (attendance.summary.rate && attendance.summary.rate < 75) {
      insights.weaknesses.push(`Attendance: ${attendance.summary.rate}% — concerning absenteeism`);
    }

    if (practice.summary.total_sessions > 0) {
      if (practice.summary.total_sessions >= 20) {
        insights.strengths.push(`Practice sessions: ${practice.summary.total_sessions} completed — strong engagement`);
      } else if (practice.summary.total_sessions < 5) {
        insights.weaknesses.push(`Practice sessions: only ${practice.summary.total_sessions} completed — low practice engagement`);
      }
      if (practice.summary.avg_score && practice.summary.avg_score >= 75) {
        insights.strengths.push(`Practice accuracy: ${practice.summary.avg_score}% — effective practice habits`);
      } else if (practice.summary.avg_score && practice.summary.avg_score < 50) {
        insights.weaknesses.push(`Practice accuracy: ${practice.summary.avg_score}% — struggling with practice questions`);
      }
    }

    if (homework.summary.completion_rate != null) {
      if (homework.summary.completion_rate >= 80) {
        insights.strengths.push(`Homework completion: ${homework.summary.completion_rate}% — responsible and diligent`);
      } else if (homework.summary.completion_rate < 50) {
        insights.weaknesses.push(`Homework completion: ${homework.summary.completion_rate}% — missing assignments`);
      }
    }

    if (islamic.summary.salah_consistency != null) {
      if (islamic.summary.salah_consistency >= 80) {
        insights.strengths.push(`Salah consistency: ${islamic.summary.salah_consistency}% — strong spiritual discipline`);
      } else if (islamic.summary.salah_consistency < 50) {
        insights.weaknesses.push(`Salah consistency: ${islamic.summary.salah_consistency}% — needs to improve prayer regularity`);
      }
    }

    if (goals.summary.completion_rate != null) {
      if (goals.summary.completion_rate >= 70) {
        insights.strengths.push(`Goal completion: ${goals.summary.completion_rate}% — strong goal-setting discipline`);
      } else if (goals.summary.completion_rate < 40) {
        insights.weaknesses.push(`Goal completion: ${goals.summary.completion_rate}% — difficulty meeting daily targets`);
      }
    }

    if (behavior.summary.avg_rating != null) {
      if (behavior.summary.avg_rating >= 4) {
        insights.strengths.push(`Behavioral rating: ${behavior.summary.avg_rating}/5 — exemplary conduct`);
      } else if (behavior.summary.avg_rating < 3) {
        insights.weaknesses.push(`Behavioral rating: ${behavior.summary.avg_rating}/5 — behavioral concerns`);
      }
    }

    if (islamic.summary.perfect_days > 0 && islamic.summary.days_tracked > 0) {
      const pct = Math.round((islamic.summary.perfect_days / islamic.summary.days_tracked) * 100);
      if (pct >= 50) insights.strengths.push(`Perfect Islamic days: ${islamic.summary.perfect_days}/${islamic.summary.days_tracked} (${pct}%)`);
    }

    if (risk.current) {
      if (risk.current.risk_level === 'low') {
        insights.strengths.push(`Risk assessment: LOW — student is on track`);
      } else if (risk.current.risk_level === 'high' || risk.current.risk_level === 'critical') {
        insights.weaknesses.push(`Risk assessment: ${risk.current.risk_level.toUpperCase()} — immediate attention required`);
        insights.recommendations.push('Schedule parent-teacher meeting to discuss intervention plan');
      }
    }

    if (gamification.current_streak >= 7) {
      insights.strengths.push(`Learning streak: ${gamification.current_streak} days — remarkable consistency`);
    } else if (gamification.current_streak === 0) {
      insights.weaknesses.push('No active learning streak — encourage daily engagement');
    }

    if (learning_path.summary.intervention_needed > 0) {
      insights.weaknesses.push(`${learning_path.summary.intervention_needed} topic(s) flagged for teacher intervention`);
      insights.recommendations.push('Review flagged topics and provide additional support');
    }

    if (retention.summary.total_checks > 0 && retention.summary.failed > 0) {
      const failRate = Math.round((retention.summary.failed / retention.summary.total_checks) * 100);
      if (failRate > 30) {
        insights.weaknesses.push(`Knowledge retention: ${failRate}% failure rate — spaced repetition needed`);
        insights.recommendations.push('Implement structured revision schedule for weak retention topics');
      }
    }

    if (accountability.summary.avg_score != null) {
      if (accountability.summary.avg_score >= 75) {
        insights.strengths.push(`Daily accountability: ${accountability.summary.avg_score}% — well-rounded performance`);
      } else if (accountability.summary.avg_score < 50) {
        insights.weaknesses.push(`Daily accountability: ${accountability.summary.avg_score}% — low holistic engagement`);
      }
    }

    if (promotion) {
      if (promotion.promotion_status === 'ready') {
        insights.strengths.push(`Promotion status: READY — meets all criteria for advancement`);
      } else if (promotion.promotion_status === 'not_ready') {
        insights.weaknesses.push(`Promotion status: NOT READY — overall score ${Math.round(promotion.overall_score)}%`);
        insights.recommendations.push('Create targeted improvement plan across weak promotion dimensions');
      } else if (promotion.promotion_status === 'needs_intervention') {
        insights.recommendations.push('Intervention required across multiple dimensions for promotion readiness');
      }
    }

    if (skills.summary.total_activities > 0) {
      if (skills.summary.unique_skills >= 3) {
        insights.strengths.push(`Skills developed: ${skills.summary.unique_skills} different skills across ${skills.summary.total_activities} activities`);
      }
    }

    if (insights.strengths.length > 3) {
      insights.strengths = insights.strengths.slice(0, 5);
    }
    if (insights.weaknesses.length > 3) {
      insights.weaknesses = insights.weaknesses.slice(0, 5);
    }

    await pool.end();

    return NextResponse.json({
      profile: {
        id: profile.id, first_name: profile.first_name, last_name: profile.last_name,
        email: profile.email, phone: profile.phone, avatar_url: profile.avatar_url,
        admission_number: profile.admission_number, gender: profile.gender,
        date_of_birth: profile.date_of_birth,
        class_id: profile.class_id, class_name: profile.class_name,
        level: profile.level, total_xp: profile.total_xp,
      },
      academic,
      mastery,
      practice,
      quizzes,
      homework,
      attendance,
      behavior,
      goals,
      gamification,
      islamic,
      skills,
      risk,
      promotion,
      retention,
      learning_path,
      accountability,
      insights,
    });
  } catch (error: any) {
    console.error('Student analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
