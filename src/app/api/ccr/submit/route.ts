import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { query as neonQuery } from '@/lib/neon';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { student_id, respondent_type, responses, academic_session_id, term_id, is_submitted } = body;

    if (!student_id || !respondent_type || !responses) {
      return NextResponse.json({ success: false, error: 'student_id, respondent_type, and responses are required' }, { status: 400 });
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(student_id)) {
      return NextResponse.json({ success: false, error: 'Invalid student_id format' }, { status: 400 });
    }

    if (!['student', 'father', 'mother', 'teacher', 'subject_teacher'].includes(respondent_type)) {
      return NextResponse.json({ success: false, error: 'Invalid respondent_type' }, { status: 400 });
    }

    const existingRows = await neonQuery(
      `SELECT id FROM ccr_responses
       WHERE student_id = $1::uuid AND respondent_type = $2
       LIMIT 1`,
      [student_id, respondent_type]
    );
    const existing = existingRows[0];

    const payload = {
      student_id,
      academic_session_id: academic_session_id || null,
      term_id: term_id || null,
      respondent_type,
      data: responses,
      is_submitted: is_submitted || false,
      updated_at: new Date().toISOString(),
    };

    let row: any;
    if (existing?.id) {
      const rows = await neonQuery(
        `UPDATE ccr_responses
         SET academic_session_id = $1::uuid, term_id = $2::uuid, respondent_type = $3,
             data = $4::jsonb, is_submitted = $5, updated_at = $6
         WHERE id = $7::uuid
         RETURNING *`,
        [payload.academic_session_id, payload.term_id, payload.respondent_type, JSON.stringify(payload.data), payload.is_submitted, payload.updated_at, existing.id]
      );
      row = rows[0];
    } else {
      const rows = await neonQuery(
        `INSERT INTO ccr_responses (student_id, academic_session_id, term_id, respondent_type, data, is_submitted, updated_at)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::jsonb, $6, $7)
         RETURNING *`,
        [payload.student_id, payload.academic_session_id, payload.term_id, payload.respondent_type, JSON.stringify(payload.data), payload.is_submitted, payload.updated_at]
      );
      row = rows[0];
    }

    // Mirror to Supabase (secondary store, best-effort)
    try {
      const adminClient = createSupabaseAdminClient();
      if (existing?.id) {
        await adminClient.from('ccr_responses').update(payload).eq('id', existing.id);
      } else {
        await adminClient.from('ccr_responses').insert(payload);
      }
    } catch (mirrorError) {
      console.error('Supabase ccr submit mirror error:', mirrorError);
    }

    return NextResponse.json({ success: true, data: row || null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}