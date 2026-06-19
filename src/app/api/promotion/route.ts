import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('student_id');

    if (!studentId) return NextResponse.json({ error: 'student_id required' }, { status: 400 });

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    const result = await pool.query(
      `SELECT pr.*, 
        c.name as current_class_name,
        c.next_class_id,
        nc.name as next_class_name
       FROM promotion_readiness pr
       LEFT JOIN students s ON s.profile_id = pr.student_id
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN classes nc ON nc.id = c.next_class_id
       WHERE pr.student_id = $1
       ORDER BY pr.created_at DESC
       LIMIT 1`,
      [studentId]
    );

    await pool.end();

    return NextResponse.json({
      promotion: result.rows[0] || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
