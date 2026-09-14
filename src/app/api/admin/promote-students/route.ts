import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

async function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role } = token as any;
    if (role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { classIds } = body as { classIds?: string[] };
    const pool = await getPool();

    try {
      const result = await pool.query(`
        WITH students_to_promote AS (
          SELECT s.id AS student_id, s.profile_id, s.class_id,
                 c.id AS current_class_id, c.name AS current_class_name, c.level,
                 c.next_class_id
          FROM students s
          JOIN classes c ON c.id = s.class_id
          WHERE s.class_id IS NOT NULL
            ${classIds && classIds.length > 0 ? `AND s.class_id = ANY($1)` : `AND c.next_class_id IS NOT NULL`}
        ),
        promotions AS (
          UPDATE students s
          SET class_id = st.next_class_id
          FROM students_to_promote st
          WHERE s.id = st.student_id
            AND st.next_class_id IS NOT NULL
          RETURNING s.id, s.profile_id, st.current_class_name, st.level, st.next_class_id
        )
        SELECT
          (SELECT COUNT(*) FROM students_to_promote) AS total_eligible,
          (SELECT COUNT(*) FROM promotions) AS promoted_count,
          (SELECT COUNT(*) FROM students_to_promote WHERE next_class_id IS NULL) AS skipped_no_next_class,
          COALESCE(json_agg(json_build_object(
            'student_id', p.student_id,
            'current_class', p.current_class_name,
            'promoted_to_next_class', p.next_class_id IS NOT NULL
          )) FILTER (WHERE p.student_id IS NOT NULL), '[]') AS promoted_students
      `, classIds && classIds.length > 0 ? [classIds] : []);

      const row = result.rows[0];
      return NextResponse.json({
        success: true,
        total_eligible: parseInt(row.total_eligible),
        promoted_count: parseInt(row.promoted_count),
        skipped_no_next_class: parseInt(row.skipped_no_next_class),
        promoted_students: row.promoted_students,
      });
    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error('Promote students error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
