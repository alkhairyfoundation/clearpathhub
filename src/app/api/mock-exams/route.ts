import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

const SUBJECT_WEIGHTS: Record<string, Record<string, number>> = {
  JSS3_BECE: { MATHEMATICS: 0.30, ENGLISH: 0.25, 'BASIC SCIENCE': 0.25, 'BASIC TECHNOLOGY': 0.20 },
  SS3_WAEC: { MATHEMATICS: 0.25, ENGLISH: 0.20, PHYSICS: 0.20, CHEMISTRY: 0.15, BIOLOGY: 0.10, GEOGRAPHY: 0.10 },
};

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
        const { id, title, description, exam_date, duration_minutes, passing_score, total_questions, shuffle_questions, require_fullscreen, prevent_tab_switch, max_tab_switches, max_attempts, is_published } = params;
        if (!id) return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 });
        const { data, error } = await adminClient.from('mock_exams').update({
          title, description, exam_date: exam_date || null,
          duration_minutes, passing_score, total_questions,
          shuffle_questions, require_fullscreen, prevent_tab_switch,
          max_tab_switches, max_attempts, is_published,
        }).eq('id', id).select().single();
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, exam: data });
      }

      case 'populate_from_bank': {
        const { id: examId } = params;
        if (!examId) return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 });

        const { data: exam, error: examError } = await adminClient.from('mock_exams').select('*').eq('id', examId).single();
        if (examError || !exam) return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });

        // Check remaining capacity
        const { count: currentCount } = await adminClient.from('mock_questions').select('*', { count: 'exact', head: true }).eq('exam_id', examId);
        const totalQs = exam.total_questions || 60;
        const remainingCapacity = Math.max(0, totalQs - (currentCount || 0));
        if (remainingCapacity <= 0) {
          return NextResponse.json({ success: false, error: 'Exam has reached its total_questions capacity. No more questions can be added.' }, { status: 400 });
        }

        const targetLevel = exam.exam_type === 'JSS3_BECE' ? 'JSS3' : 'SS3';
        const targetSubjects = targetLevel === 'JSS3'
          ? ['MATHEMATICS', 'ENGLISH', 'BASIC SCIENCE', 'BASIC TECHNOLOGY']
          : ['MATHEMATICS', 'ENGLISH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'GEOGRAPHY'];

        const { data: bankQuestions, error: bankError } = await adminClient
          .from('question_bank')
          .select('*')
          .eq('status', 'published')
          .eq('level', targetLevel)
          .in('subject', targetSubjects);

        if (bankError) return NextResponse.json({ success: false, error: bankError.message }, { status: 500 });
        if (!bankQuestions || bankQuestions.length === 0) {
          return NextResponse.json({ success: true, count: 0, message: 'No questions found in bank for this class level' });
        }

        const weights = SUBJECT_WEIGHTS[exam.exam_type] || {};
        let allocated = 0;
        const qsPerSubject: Record<string, number> = {};
        for (const subject of targetSubjects) {
          const weight = weights[subject] || (1 / targetSubjects.length);
          qsPerSubject[subject] = Math.floor(remainingCapacity * weight);
          allocated += qsPerSubject[subject];
        }
        let remainder = remainingCapacity - allocated;
        const sorted = [...targetSubjects].sort((a, b) => (weights[b] || 0) - (weights[a] || 0));
        let rIdx = 0;
        while (remainder > 0) {
          qsPerSubject[sorted[rIdx % sorted.length]]++;
          remainder--;
          rIdx++;
        }

        let selected: any[] = [];
        for (const subject of targetSubjects) {
          const subjectQs = bankQuestions.filter(q => q.subject === subject);
          const need = qsPerSubject[subject] || 0;
          if (subjectQs.length === 0 || need <= 0) continue;
          const veryHard = subjectQs.filter(q => q.difficulty_level === 'VERY_HARD');
          const hard = subjectQs.filter(q => q.difficulty_level === 'HARD');
          const medium = subjectQs.filter(q => q.difficulty_level === 'MEDIUM');
          const easy = subjectQs.filter(q => q.difficulty_level === 'EASY');
          const chosen = [
            ...veryHard.sort(() => Math.random() - 0.5).slice(0, Math.round(need * 0.3)),
            ...hard.sort(() => Math.random() - 0.5).slice(0, Math.round(need * 0.3)),
            ...medium.sort(() => Math.random() - 0.5).slice(0, Math.round(need * 0.25)),
            ...easy.sort(() => Math.random() - 0.5).slice(0, Math.round(need * 0.15)),
          ];
          if (chosen.length < need) {
            const remaining = subjectQs.filter(q => !chosen.find(s => s.id === q.id)).sort(() => Math.random() - 0.5).slice(0, need - chosen.length);
            selected = [...selected, ...chosen, ...remaining];
          } else {
            selected = [...selected, ...chosen];
          }
        }

        selected = selected.sort(() => Math.random() - 0.5).slice(0, remainingCapacity);

        const toInsert = selected.map((q: any) => ({
          exam_id: examId, question: q.question, question_image: q.question_image || null,
          options: q.options || [''], correct_answer: q.correct_answer ?? 0, points: q.points || 1,
          question_type: q.question_type === 'TRUE_FALSE' ? 'true_false' : q.question_type === 'FILL_IN_THE_GAP' || q.question_type === 'FILL_BLANK' ? 'fill_blank' : 'multiple_choice',
          subject: q.subject || 'General', difficulty_level: q.difficulty_level || 'MEDIUM',
          topic: q.topic || null, subtopic: q.subtopic || null, explanation: q.explanation || null,
          skill_tag: q.skill_tag || null, bloom_level: q.bloom_level || null,
          curriculum: q.curriculum || null, grade_level: targetLevel,
        }));

        const { data: inserted, error: insertError } = await adminClient.from('mock_questions').insert(toInsert).select();
        if (insertError) return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });

        return NextResponse.json({ success: true, count: inserted?.length || 0 });
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
