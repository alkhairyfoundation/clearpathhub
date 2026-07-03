import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('id');
    const examType = searchParams.get('exam_type');
    const published = searchParams.get('published');

    const adminClient = createSupabaseAdminClient();
    let query = adminClient.from('mock_exams').select('*, questions:mock_questions(*)');

    if (examId) {
      query = query.eq('id', examId);
      const { data, error } = await query.single();
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, exam: data });
    }

    if (examType) query = query.eq('exam_type', examType);
    if (published !== null) query = query.eq('is_published', published === 'true');
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, exams: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    const adminClient = createSupabaseAdminClient();

    switch (action) {
      case 'create_exam': {
        const { title, description, exam_type, class_level, academic_year, exam_date, duration_minutes, passing_score, total_questions, shuffle_questions, require_fullscreen, prevent_tab_switch, max_tab_switches, max_attempts, created_by } = params;
        if (!title || !exam_type || !academic_year) {
          return NextResponse.json({ success: false, error: 'Title, exam_type, and academic_year are required' }, { status: 400 });
        }
        let classLevelValue = null;
        if (exam_type === 'JSS3_BECE') {
          classLevelValue = 'JSS3';
        } else if (exam_type === 'SS3_WAEC') {
          classLevelValue = 'SS3';
        }
        
        const { data, error } = await adminClient.from('mock_exams').insert({
          title, description, exam_type, academic_year, exam_date: exam_date || null,
          duration_minutes: duration_minutes || 120, passing_score: passing_score || 50,
          total_questions: total_questions || 60, shuffle_questions: shuffle_questions ?? true,
          require_fullscreen: require_fullscreen ?? false, prevent_tab_switch: prevent_tab_switch ?? false,
          max_tab_switches: max_tab_switches || 3, max_attempts: max_attempts || 0,
          is_published: true, created_by, class_level: classLevelValue,
        }).select().single();
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, exam: data }, { status: 201 });
      }

      case 'update_exam': {
        const { id, ...updates } = params;
        if (!id) return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 });
        const { data, error } = await adminClient.from('mock_exams').update(updates).eq('id', id).select().single();
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, exam: data });
      }

      case 'delete_exam': {
        const { id } = params;
        if (!id) return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 });
        await adminClient.from('mock_questions').delete().eq('exam_id', id);
        const { error } = await adminClient.from('mock_exams').delete().eq('id', id);
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case 'list_exams': {
        const { exam_type, is_published, class_level } = params;
        let query = adminClient.from('mock_exams').select('*');
        if (exam_type) query = query.eq('exam_type', exam_type);
        if (is_published !== undefined) query = query.eq('is_published', is_published);
        if (class_level) {
          const examType = class_level === 'JSS3' ? 'JSS3_BECE' : 'SS3_WAEC';
          query = query.eq('exam_type', examType);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, exams: data });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
