import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query } from '@/lib/neon';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('class_id');
    const subjectId = searchParams.get('subject_id');
    const term = searchParams.get('term');
    const academicYear = searchParams.get('academic_year');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const classFilter = classId ? ` AND EXISTS (SELECT 1 FROM student_classes sc WHERE sc.student_id = $1 AND sc.class_id = $1)` : '';
    const classFilterR = classId ? ` AND EXISTS (SELECT 1 FROM student_classes sc WHERE sc.student_id = $1 AND sc.class_id = $1)` : '';
    const classFilterWhere = classId ? ` WHERE EXISTS (SELECT 1 FROM student_classes sc WHERE sc.student_id = $1 AND sc.class_id = $1)` : '';
    const classFilterPs = classId ? ` AND EXISTS (SELECT 1 FROM student_classes sc WHERE sc.student_id = $1 AND sc.class_id = $1)` : '';

    const p = classId ? [classId] : [];

    const [
      studentCountResult,
      subjectCountResult,
      avgScoreResult,
      attendanceRateResult,
      masteryAvgResult,
      riskCountResult,
      activeTodayResult,
      streakStatsResult,
      classListResult,
      subjectListResult,
      gradeDistResult,
      subjectPerfResult,
      monthlyAttendanceResult,
    ] = await Promise.all([
      query(`SELECT COUNT(*) FROM profiles WHERE role = 'student'${classFilter}`, p),
      query(`SELECT COUNT(*) FROM subjects`),
      query(
        `SELECT ROUND(AVG(r.score), 1) as avg_score,
                COUNT(*) as total_results
         FROM results r
         WHERE r.score IS NOT NULL ${classFilterR}`, p
      ),
      query(
        `SELECT ROUND(
          (COUNT(*) FILTER (WHERE a.status IN ('present','excused')))::NUMERIC /
          NULLIF(COUNT(*), 0) * 100, 1
        ) as attendance_rate
        FROM attendance a${classFilterWhere}`, p
      ),
      query(`SELECT ROUND(AVG(mastery_score), 1) as avg_mastery FROM mastery_scores`),
      query(
        `SELECT COUNT(*) FROM student_risk_predictions srp
         WHERE srp.risk_level IN ('high','critical')
         AND srp.prediction_date = (SELECT MAX(prediction_date) FROM student_risk_predictions WHERE student_id = srp.student_id)`
      ),
      query(
        `SELECT COUNT(*) FROM practice_sessions ps
         WHERE ps.date = CURRENT_DATE${classFilterPs}`, p
      ),
      query(
        `SELECT ROUND(AVG(current_streak), 1) as avg_streak,
                MAX(current_streak) as max_streak
         FROM learning_streaks ls${classFilterWhere}`, p
      ),
      query(`SELECT id, name FROM classes ORDER BY name`),
      query(`SELECT id, name FROM subjects ORDER BY name`),
      query(
        `SELECT
          CASE
            WHEN r.score >= 80 THEN 'A'
            WHEN r.score >= 70 THEN 'B'
            WHEN r.score >= 60 THEN 'C'
            WHEN r.score >= 50 THEN 'D'
            ELSE 'F'
          END as grade,
          COUNT(*) as count
         FROM results r
         WHERE 1=1 ${classFilterR}
         GROUP BY grade
         ORDER BY grade`, p
      ),
      query(
        `SELECT sub.name,
                ROUND(AVG(r.score), 1) as avg_score,
                COUNT(*) as count
         FROM results r
         JOIN subjects sub ON sub.id = r.subject_id
         WHERE r.score IS NOT NULL ${classFilterR}
         GROUP BY sub.name ORDER BY sub.name`, p
      ),
      query(
        `SELECT TO_CHAR(a.date, 'YYYY-MM') as month,
                ROUND(
                  (COUNT(*) FILTER (WHERE a.status IN ('present','excused')))::NUMERIC /
                  NULLIF(COUNT(*), 0) * 100, 1
                ) as rate
         FROM attendance a
         WHERE 1=1 ${classFilterR}
         GROUP BY month ORDER BY month`, p
      ),
    ]);

    const studentListResult = await query(
      `SELECT DISTINCT ON (p.id)
              p.id, p.first_name, p.last_name,
              c.name as class_name,
              COALESCE(sl.total_xp, 0) as total_xp,
              COALESCE(sl.level, 1) as level,
              COALESCE(ls.current_streak, 0) as current_streak,
              (SELECT ROUND(AVG(r2.score), 1) FROM results r2 WHERE r2.student_id = p.id) as avg_score,
              (SELECT ROUND(
                (COUNT(*) FILTER (WHERE a2.status IN ('present','excused')))::NUMERIC /
                NULLIF(COUNT(*), 0) * 100, 1
              ) FROM attendance a2 WHERE a2.student_id = p.id) as attendance_rate,
              (SELECT COUNT(*) FROM practice_sessions ps2 WHERE ps2.student_id = p.id AND ps2.date = CURRENT_DATE) as practiced_today,
              (SELECT risk_level FROM student_risk_predictions srp2
               WHERE srp2.student_id = p.id
               ORDER BY srp2.prediction_date DESC LIMIT 1) as risk_level
       FROM profiles p
       LEFT JOIN student_classes sc ON sc.student_id = p.id
       LEFT JOIN classes c ON c.id = sc.class_id
       LEFT JOIN student_levels sl ON sl.student_id = p.id
       LEFT JOIN learning_streaks ls ON ls.student_id = p.id
       WHERE p.role = 'student'${classFilter}
       ORDER BY p.id, p.first_name, p.last_name`, p
    );

    return NextResponse.json({
      summary: {
        total_students: parseInt(studentCountResult[0]?.count || '0'),
        total_subjects: parseInt(subjectCountResult[0]?.count || '0'),
        avg_score: avgScoreResult[0]?.avg_score,
        total_results: parseInt(avgScoreResult[0]?.total_results || '0'),
        attendance_rate: attendanceRateResult[0]?.attendance_rate,
        avg_mastery: masteryAvgResult[0]?.avg_mastery,
        at_risk_count: parseInt(riskCountResult[0]?.count || '0'),
        active_today: parseInt(activeTodayResult[0]?.count || '0'),
        avg_streak: streakStatsResult[0]?.avg_streak,
        max_streak: streakStatsResult[0]?.max_streak,
      },
      filters: {
        classes: classListResult,
        subjects: subjectListResult,
      },
      grade_distribution: gradeDistResult,
      subject_performance: subjectPerfResult,
      attendance_trend: monthlyAttendanceResult,
      students: studentListResult.map((s: any) => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        class_name: s.class_name,
        total_xp: s.total_xp,
        level: s.level,
        current_streak: s.current_streak,
        avg_score: s.avg_score,
        attendance_rate: s.attendance_rate,
        practiced_today: s.practiced_today > 0,
        risk_level: s.risk_level || 'unknown',
      })),
    });
  } catch (error: any) {
    console.error('Analytics overview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
