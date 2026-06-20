import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { student_id, session_id, term_id, evidence_type, text_snapshot, created_by } = body;

    if (!student_id || !text_snapshot) {
      return NextResponse.json({ error: 'student_id and text_snapshot are required' }, { status: 400 });
    }

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    const result = await pool.query(
      `INSERT INTO portfolio_evidence (student_id, session_id, term_id, evidence_type, text_snapshot, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [student_id, session_id || null, term_id || null, evidence_type || 'manual', text_snapshot, created_by || null]
    );

    await pool.end();
    return NextResponse.json({ evidence: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating portfolio evidence:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    let query = 'SELECT * FROM portfolio_evidence WHERE student_id = $1';
    const params: any[] = [studentId];
    let idx = 2;

    if (sessionId) {
      query += ` AND session_id = $${idx++}`;
      params.push(sessionId);
    }
    if (termId) {
      query += ` AND term_id = $${idx++}`;
      params.push(termId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    await pool.end();

    return NextResponse.json({ evidence: result.rows });
  } catch (error: any) {
    console.error('Error fetching portfolio evidence:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
