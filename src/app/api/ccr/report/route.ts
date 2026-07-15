import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { computeSgiScore } from '@/lib/ccr-scoring';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id');
    const sessionId = url.searchParams.get('academic_session_id');
    const termId = url.searchParams.get('term_id');

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'student_id is required' }, { status: 400 });
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(studentId)) {
      return NextResponse.json({ success: false, error: 'Invalid student_id format' }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();
    let query = adminClient.from('ccr_responses').select('*').eq('student_id', studentId).eq('is_submitted', true);
    if (sessionId) query = query.eq('academic_session_id', sessionId);
    if (termId) query = query.eq('term_id', termId);

    const { data: responses, error } = await query;
    if (error) throw error;

    const studentRes = await adminClient
      .from('students')
      .select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(name)')
      .eq('profile_id', studentId)
      .single();

    const sgi = computeSgiScore(responses || []);

    return NextResponse.json({
      success: true,
      data: {
        student: studentRes.data || null,
        responses: responses || [],
        sgi,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
