import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const periodType = searchParams.get('periodType');
    const dimension = searchParams.get('dimension');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    let query = `
      SELECT 
        gh.*,
        parent_goal.goal_text as parent_goal_text,
        parent_goal.status as parent_goal_status
      FROM goal_hierarchy gh
      LEFT JOIN goal_hierarchy parent_goal ON gh.parent_goal_id = parent_goal.id
      WHERE gh.student_id = $1
    `;
    const params: any[] = [studentId];
    let paramIdx = 2;

    if (periodType) {
      query += ` AND gh.period_type = $${paramIdx++}`;
      params.push(periodType);
    }
    if (dimension) {
      query += ` AND gh.dimension = $${paramIdx++}`;
      params.push(dimension);
    }

    query += ' ORDER BY gh.period_start DESC, gh.created_at ASC';

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });
    const result = await pool.query(query, params);
    await pool.end();

    return NextResponse.json({ goals: result.rows });
  } catch (error: any) {
    console.error('Error fetching goals:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { student_id, period_type, dimension, period_start, period_end, goal_text, target_metric, target_value, parent_goal_id } = body;

    if (!student_id || !period_type || !dimension || !period_start || !period_end || !goal_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    const result = await pool.query(
      `INSERT INTO goal_hierarchy (student_id, period_type, dimension, period_start, period_end, goal_text, target_metric, target_value, parent_goal_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [student_id, period_type, dimension, period_start, period_end, goal_text, target_metric, target_value, parent_goal_id || null]
    );

    await pool.end();
    return NextResponse.json({ goal: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating goal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
