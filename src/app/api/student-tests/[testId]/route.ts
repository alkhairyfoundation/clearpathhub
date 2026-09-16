import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query } from '@/lib/neon';

export async function GET(req: NextRequest, { params }: { params: { testId: string } }) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testId } = params;

    const testResult = await query(
      `SELECT t.*, 
        jsonb_build_object('name', s.name) as subject,
        jsonb_build_object('name', c.name) as class
      FROM tests t
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN classes c ON t.class_id = c.id
      WHERE t.id = $1 AND t.is_published = true`,
      [testId]
    );

    if (testResult.length === 0) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const questions = await query(
      'SELECT * FROM test_questions WHERE test_id = $1 ORDER BY order_index',
      [testId]
    );

    return NextResponse.json({
      test: testResult[0],
      questions,
    });
  } catch (error: any) {
    console.error('Error fetching test:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
