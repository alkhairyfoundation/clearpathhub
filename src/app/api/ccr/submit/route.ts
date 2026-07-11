import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

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

    if (!['student', 'father', 'mother', 'teacher', 'subject_teacher'].includes(respondent_type)) {
      return NextResponse.json({ success: false, error: 'Invalid respondent_type' }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();

    const existing = await adminClient
      .from('ccr_responses')
      .select('id')
      .eq('student_id', student_id)
      .eq('respondent_type', respondent_type)
      .maybeSingle();

    const payload = {
      student_id,
      academic_session_id: academic_session_id || null,
      term_id: term_id || null,
      respondent_type,
      data: responses,
      is_submitted: is_submitted || false,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing.data?.id) {
      result = await adminClient.from('ccr_responses').update(payload).eq('id', existing.data.id).select().single();
    } else {
      result = await adminClient.from('ccr_responses').insert(payload).select().single();
    }

    if (result.error) throw result.error;
    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
