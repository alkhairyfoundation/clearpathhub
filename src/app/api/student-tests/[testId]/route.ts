import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest, { params }: { params: { testId: string } }) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testId } = params;

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    const testResult = await pool.query(
      `SELECT t.*, 
        jsonb_build_object('name', s.name) as subject,
        jsonb_build_object('name', c.name) as class
      FROM tests t
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN classes c ON t.class_id = c.id
      WHERE t.id = $1 AND t.is_published = true`,
      [testId]
    );

    if (testResult.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const questionsResult = await pool.query(
      'SELECT * FROM test_questions WHERE test_id = $1 ORDER BY order_index',
      [testId]
    );

    await pool.end();

    return NextResponse.json({
      test: testResult.rows[0],
      questions: questionsResult.rows,
    });
  } catch (error: any) {
    console.error('Error fetching test:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
