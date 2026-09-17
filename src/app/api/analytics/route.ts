import { NextResponse } from 'next/server'
import { query as neonQuery } from '@/lib/neon'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const riskLevel = searchParams.get('riskLevel')

    // Build query
    const conditions: string[] = []
    const params: any[] = []
    if (studentId) {
      conditions.push(`srp.student_id = $${params.length + 1}::uuid`)
      params.push(studentId)
    }
    if (riskLevel) {
      conditions.push(`srp.risk_level = $${params.length + 1}`)
      params.push(riskLevel)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sql = `
      SELECT srp.*,
        (SELECT to_jsonb(tmp)
         FROM (SELECT s.id, s.first_name, s.last_name, s.email) AS tmp) AS student
      FROM student_risk_predictions srp
      LEFT JOIN profiles s ON s.id = srp.student_id
      ${where}
      ORDER BY srp.prediction_date DESC
      LIMIT $${params.length + 1}
    `
    params.push(limit)

    const data = await neonQuery(sql, params)

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error fetching analytics data:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetStudent = body?.studentId || null;

    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get('studentId') || targetStudent;

    const studentFilter = studentIdParam ? `WHERE s.profile_id = $1::uuid` : '';
    const params = studentIdParam ? [studentIdParam] : [];

    const students = await neonQuery(
      `SELECT s.profile_id AS student_id
       FROM students s
       ${studentFilter}`,
      params
    );

    if (!students.length) {
      return NextResponse.json({ success: true, message: 'No students found to analyze.' });
    }

    const results = await neonQuery(
      `SELECT
        student_id,
        attendance_rate,
        avg_score,
        avg_mastery,
        homework_rate,
        practice_rate,
        subjects_below_pass
       FROM (
         SELECT
           st.profile_id AS student_id,
           ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('present','excused')) / NULLIF(COUNT(*), 0), 1)
             AS attendance_rate,
           ROUND(AVG(r.score), 1) AS avg_score,
           ROUND(AVG(ms.mastery_score), 1) AS avg_mastery,
           ROUND(100.0 *
             (SELECT COUNT(*) FROM homework_submissions hs
              WHERE hs.student_id = st.profile_id AND hs.submitted_at IS NOT NULL)
             / NULLIF((SELECT COUNT(*) FROM homework h
                       JOIN student_classes sc ON sc.class_id = h.class_id
                       WHERE sc.student_id = st.profile_id), 0), 1) AS homework_rate,
           ROUND(100.0 *
(SELECT COUNT(*) FROM practice_sessions ps
               WHERE ps.student_id = st.profile_id AND ps.completed_at IS NOT NULL AND ps.duration_seconds > 60)
             / NULLIF((SELECT COUNT(*) FROM terms t WHERE t.is_current = true), 0) * (SELECT COUNT(*) FROM terms t WHERE t.is_current = true), 1) AS practice_rate,
           NULLIF(COUNT(*) FILTER (WHERE r.score < (SELECT passing_score FROM tests LIMIT 1)), 0) AS subjects_below_pass
         FROM students st
         LEFT JOIN attendance a ON a.student_id = st.profile_id
         LEFT JOIN results r ON r.student_id = st.profile_id
         LEFT JOIN mastery_scores ms ON ms.student_id = st.profile_id
         GROUP BY st.profile_id
       ) ranked`,
      []
    );

    let generated = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const row of results) {
      const attendance = row.attendance_rate != null ? Number(row.attendance_rate) : null;
      const avgScore = row.avg_score != null ? Number(row.avg_score) : null;
      const avgMastery = row.avg_mastery != null ? Number(row.avg_mastery) : null;
      const homework = row.homework_rate != null ? Number(row.homework_rate) : null;

      let score = 50;
      const factors: Record<string, unknown> = {};

      if (attendance != null) {
        if (attendance < 50) { score += 20; factors.attendance = 'critical'; }
        else if (attendance < 70) { score += 10; factors.attendance = 'warning'; }
        else if (attendance >= 90) { score -= 10; factors.attendance = 'good'; }
        else { factors.attendance = 'acceptable'; }
      }
      if (avgScore != null) {
        if (avgScore < 45) { score += 20; factors.academic = 'critical'; }
        else if (avgScore < 60) { score += 10; factors.academic = 'warning'; }
        else if (avgScore >= 75) { score -= 10; factors.academic = 'good'; }
        else { factors.academic = 'acceptable'; }
      }
      if (avgMastery != null) {
        if (avgMastery < 40) { score += 15; factors.mastery = 'critical'; }
        else if (avgMastery < 55) { score += 8; factors.mastery = 'warning'; }
        else if (avgMastery >= 70) { score -= 5; factors.mastery = 'good'; }
      }
      if (homework != null) {
        if (homework < 30) { score += 10; factors.homework = 'warning'; }
        else if (homework >= 80) { score -= 5; factors.homework = 'good'; }
      }

      score = Math.max(5, Math.min(95, score));
      const riskLevel = score >= 75 ? 'critical' : score >= 55 ? 'high' : score >= 35 ? 'medium' : 'low';
      const outcome = score >= 55 ? 'At risk of falling behind without intervention' : 'On track to meet academic expectations';

      const existing = await neonQuery(
        `SELECT id FROM student_risk_predictions
         WHERE student_id = $1 AND prediction_date = $2::date LIMIT 1`,
        [row.student_id, today]
      );

      if (existing.length > 0) {
        await neonQuery(
          `UPDATE student_risk_predictions
           SET risk_level = $1, risk_score = $2, contributing_factors = $3,
               predicted_outcome = $4, updated_at = NOW()
           WHERE id = $5`,
          [riskLevel, score, JSON.stringify(factors), outcome, existing[0].id]
        );
      } else {
        await neonQuery(
          `INSERT INTO student_risk_predictions
             (student_id, prediction_date, risk_level, risk_score, contributing_factors, predicted_outcome, confidence_score)
           VALUES ($1, $2::date, $3, $4, $5, $6, 0.8)`,
          [row.student_id, today, riskLevel, score, JSON.stringify(factors), outcome]
        );
      }
      generated++;
    }

    return NextResponse.json({
      success: true,
      message: `Risk predictions generated for ${generated} student${generated === 1 ? '' : 's'}.`,
      generated,
    });
  } catch (error: any) {
    console.error('Error triggering predictive analytics:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}