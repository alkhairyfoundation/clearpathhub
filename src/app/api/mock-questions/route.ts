import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    const adminClient = createSupabaseAdminClient();

    switch (action) {
      case 'list_questions': {
        const { exam_id, subject, grade_level, exam_type } = params;
        let query = adminClient.from('mock_questions').select('*');
        if (exam_id) query = query.eq('exam_id', exam_id);
        if (subject) query = query.eq('subject', subject);
        if (grade_level) query = query.eq('grade_level', grade_level);
        if (exam_type) {
          let examGradeLevel = null;
          if (exam_type === 'JSS3_BECE') examGradeLevel = 'JSS3';
          else if (exam_type === 'SS3_WAEC') examGradeLevel = 'SS3';
          if (examGradeLevel) query = query.eq('grade_level', examGradeLevel);
        }
        const { data, error } = await query.order('created_at', { ascending: true });
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, questions: data });
      }

      case 'create_question': {
        const { exam_id, question, question_image, options, correct_answer, points, question_type, subject, difficulty_level, topic, subtopic, explanation, skill_tag, bloom_level, curriculum, grade_level } = params;
        if (!exam_id || !question || !options || correct_answer === undefined) {
          return NextResponse.json({ success: false, error: 'exam_id, question, options, and correct_answer are required' }, { status: 400 });
        }
        const { data, error } = await adminClient.from('mock_questions').insert({
          exam_id, question, question_image: question_image || null,
          options, correct_answer, points: points || 1,
          question_type: question_type || 'multiple_choice',
          subject: subject || null, difficulty_level: difficulty_level || null,
          topic: topic || null, subtopic: subtopic || null,
          explanation: explanation || null, skill_tag: skill_tag || null,
          bloom_level: bloom_level || null, curriculum: curriculum || null,
          grade_level: grade_level || null,
        }).select().single();
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, question: data }, { status: 201 });
      }

      case 'bulk_insert_questions': {
        const { exam_id, questions } = params;
        if (!exam_id || !questions || !Array.isArray(questions) || questions.length === 0) {
          return NextResponse.json({ success: false, error: 'exam_id and questions array required' }, { status: 400 });
        }
        const toInsert = questions.map((q: any) => ({
          exam_id,
          question: q.question,
          question_image: q.question_image || null,
          options: q.options || [''],
          correct_answer: q.correct_answer ?? 0,
          points: q.points || 1,
          question_type: q.question_type || 'multiple_choice',
          subject: q.subject || null,
          difficulty_level: q.difficulty_level || null,
          topic: q.topic || null,
          subtopic: q.subtopic || null,
          explanation: q.explanation || null,
          skill_tag: q.skill_tag || null,
          bloom_level: q.bloom_level || null,
          curriculum: q.curriculum || null,
          grade_level: q.grade_level || null,
        }));
        const { data, error } = await adminClient.from('mock_questions').insert(toInsert).select();
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, questions: data }, { status: 201 });
      }

      case 'update_question': {
        const { id, ...updates } = params;
        if (!id) return NextResponse.json({ success: false, error: 'Question ID required' }, { status: 400 });
        const { data, error } = await adminClient.from('mock_questions').update(updates).eq('id', id).select().single();
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, question: data });
      }

      case 'delete_question': {
        const { id } = params;
        if (!id) return NextResponse.json({ success: false, error: 'Question ID required' }, { status: 400 });
        const { error } = await adminClient.from('mock_questions').delete().eq('id', id);
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case 'add_from_bank': {
        const { exam_id, question_ids } = params;
        if (!exam_id || !question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
          return NextResponse.json({ success: false, error: 'exam_id and question_ids array required' }, { status: 400 });
        }

        const { data: bankQuestions, error: bankError } = await adminClient
          .from('question_bank')
          .select('*')
          .in('id', question_ids);

        if (bankError) return NextResponse.json({ success: false, error: bankError.message }, { status: 500 });
        if (!bankQuestions || bankQuestions.length === 0) {
          return NextResponse.json({ success: false, error: 'No questions found in bank' }, { status: 404 });
        }

        const { data: exam } = await adminClient.from('mock_exams').select('exam_type').eq('id', exam_id).single();
        const targetLevel = exam?.exam_type === 'JSS3_BECE' ? 'JSS3' : 'SS3';

        const toInsert = bankQuestions.map((q: any) => ({
          exam_id, question: q.question, question_image: q.question_image || null,
          options: q.options || [''], correct_answer: q.correct_answer ?? 0, points: q.points || 1,
          question_type: q.question_type === 'TRUE_FALSE' ? 'true_false' : q.question_type === 'FILL_IN_THE_GAP' || q.question_type === 'FILL_BLANK' ? 'fill_blank' : 'multiple_choice',
          subject: q.subject || 'General', difficulty_level: q.difficulty_level || 'MEDIUM',
          topic: q.topic || null, subtopic: q.subtopic || null, explanation: q.explanation || null,
          skill_tag: q.skill_tag || null, bloom_level: q.bloom_level || null,
          curriculum: q.curriculum || null, grade_level: targetLevel,
        }));

        const { data: inserted, error: insertError } = await adminClient.from('mock_questions').insert(toInsert).select();
        if (insertError) return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });

        return NextResponse.json({ success: true, count: inserted?.length || 0, questions: inserted });
      }

      case 'list_bank_for_class': {
        const { level, subject, difficulty, question_type, search } = params;
        let query = adminClient.from('question_bank').select('*');
        if (level) query = query.eq('level', level);
        if (subject) query = query.eq('subject', subject);
        if (difficulty) query = query.eq('difficulty_level', difficulty);
        if (question_type) query = query.eq('question_type', question_type);
        if (search) query = query.ilike('question', `%${search}%`);
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, questions: data });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
