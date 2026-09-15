import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { query as neonQuery } from '@/lib/neon';

async function getRemainingCapacity(examId: string) {
  const examRows = await neonQuery('SELECT total_questions FROM mock_exams WHERE id = $1::uuid LIMIT 1', [examId]);
  const exam = examRows[0];
  if (!exam) throw new Error('Exam not found');
  const countRows = await neonQuery('SELECT COUNT(*)::int AS total FROM mock_questions WHERE exam_id = $1::uuid', [examId]);
  return Math.max(0, (exam.total_questions || 0) - (countRows[0]?.total || 0));
}

async function insertMockQuestions(toInsert: any[]): Promise<any[]> {
  if (toInsert.length === 0) return [];
  const allKeys = Array.from(new Set(toInsert.flatMap((d) => Object.keys(d || {}))));
  const colList = allKeys.map((k) => `"${k}"`).join(', ');
  const valuePlaceholders: string[] = [];
  const flatValues: any[] = [];
  for (const row of toInsert) {
    const rowVals = allKeys.map((k) => (row ?? {})[k]);
    valuePlaceholders.push(`(${rowVals.map((_, i) => `$${flatValues.length + i + 1}`).join(', ')})`);
    flatValues.push(...rowVals);
  }
  return neonQuery(
    `INSERT INTO "mock_questions" (${colList}) VALUES ${valuePlaceholders.join(', ')} RETURNING *`,
    flatValues
  );
}

async function mirrorMockQuestions(mirror: () => any) {
  try {
    await mirror();
  } catch (mirrorError) {
    console.error('Supabase mock-questions mirror error:', mirrorError);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    const adminClient = createSupabaseAdminClient();

    switch (action) {
      case 'list_questions': {
        const { exam_id, subject, grade_level, exam_type } = params;
        const conditions: string[] = [];
        const qParams: any[] = [];
        if (exam_id) {
          conditions.push(`exam_id = $${qParams.length + 1}::uuid`);
          qParams.push(exam_id);
        }
        if (subject) {
          conditions.push(`subject = $${qParams.length + 1}`);
          qParams.push(subject);
        }
        if (grade_level) {
          conditions.push(`grade_level = $${qParams.length + 1}`);
          qParams.push(grade_level);
        }
        if (exam_type) {
          let examGradeLevel = null;
          if (exam_type === 'JSS3_BECE') examGradeLevel = 'JSS3';
          else if (exam_type === 'SS3_WAEC') examGradeLevel = 'SS3';
          if (examGradeLevel) {
            conditions.push(`grade_level = $${qParams.length + 1}`);
            qParams.push(examGradeLevel);
          }
        }
        const sql = `SELECT * FROM mock_questions${conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''} ORDER BY created_at ASC`;
        const data = await neonQuery(sql, qParams);
        return NextResponse.json({ success: true, questions: data });
      }

      case 'create_question': {
        const { exam_id, question, question_image, options, correct_answer, points, question_type, subject, difficulty_level, topic, subtopic, explanation, skill_tag, bloom_level, curriculum, grade_level } = params;
        if (!exam_id || !question || !options || correct_answer === undefined) {
          return NextResponse.json({ success: false, error: 'exam_id, question, options, and correct_answer are required' }, { status: 400 });
        }
        const remaining = await getRemainingCapacity(exam_id);
        if (remaining < 1) {
          return NextResponse.json({ success: false, error: 'Exam has reached its total_questions capacity. No more questions can be added.' }, { status: 400 });
        }
        const rows = await neonQuery(
          `INSERT INTO mock_questions (exam_id, question, question_image, options, correct_answer, points, question_type, subject, difficulty_level, topic, subtopic, explanation, skill_tag, bloom_level, curriculum, grade_level)
           VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
          [exam_id, question, question_image || null, options, correct_answer, points || 1, question_type || 'multiple_choice', subject || null, difficulty_level || null, topic || null, subtopic || null, explanation || null, skill_tag || null, bloom_level || null, curriculum || null, grade_level || null]
        );
        const data = rows[0];
        await mirrorMockQuestions(() => adminClient.from('mock_questions').insert({
          exam_id, question, question_image: question_image || null,
          options, correct_answer, points: points || 1,
          question_type: question_type || 'multiple_choice',
          subject: subject || null, difficulty_level: difficulty_level || null,
          topic: topic || null, subtopic: subtopic || null,
          explanation: explanation || null, skill_tag: skill_tag || null,
          bloom_level: bloom_level || null, curriculum: curriculum || null,
          grade_level: grade_level || null,
        }));
        return NextResponse.json({ success: true, question: data }, { status: 201 });
      }

      case 'bulk_insert_questions': {
        const { exam_id, questions } = params;
        if (!exam_id || !questions || !Array.isArray(questions) || questions.length === 0) {
          return NextResponse.json({ success: false, error: 'exam_id and questions array required' }, { status: 400 });
        }
        const remaining = await getRemainingCapacity(exam_id);
        if (remaining < questions.length) {
          return NextResponse.json({ success: false, error: `Cannot add ${questions.length} question(s). Only ${remaining} slot(s) remaining out of the exam's total_questions capacity.` }, { status: 400 });
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
        const data = await insertMockQuestions(toInsert);
        await mirrorMockQuestions(() => adminClient.from('mock_questions').insert(toInsert));
        return NextResponse.json({ success: true, questions: data }, { status: 201 });
      }

      case 'update_question': {
        const { id, ...updates } = params;
        if (!id) return NextResponse.json({ success: false, error: 'Question ID required' }, { status: 400 });
        const keys = Object.keys(updates);
        if (keys.length === 0) return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 });
        const setSql = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
        const rows = await neonQuery(
          `UPDATE mock_questions SET ${setSql} WHERE id = $1::uuid RETURNING *`,
          [id, ...keys.map((k) => updates[k])]
        );
        const data = rows[0];
        await mirrorMockQuestions(() => adminClient.from('mock_questions').update(updates).eq('id', id));
        return NextResponse.json({ success: true, question: data });
      }

      case 'delete_question': {
        const { id } = params;
        if (!id) return NextResponse.json({ success: false, error: 'Question ID required' }, { status: 400 });
        await neonQuery('DELETE FROM mock_questions WHERE id = $1::uuid', [id]);
        await mirrorMockQuestions(() => adminClient.from('mock_questions').delete().eq('id', id));
        return NextResponse.json({ success: true });
      }

      case 'add_from_bank': {
        const { exam_id, question_ids } = params;
        if (!exam_id || !question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
          return NextResponse.json({ success: false, error: 'exam_id and question_ids array required' }, { status: 400 });
        }

        const remaining = await getRemainingCapacity(exam_id);
        if (remaining < question_ids.length) {
          return NextResponse.json({ success: false, error: `Cannot add ${question_ids.length} question(s). Only ${remaining} slot(s) remaining out of the exam's total_questions capacity.` }, { status: 400 });
        }

        const bankQuestions = await neonQuery(
          'SELECT * FROM question_bank WHERE id::text = ANY($1::text[])',
          [question_ids.map((x: any) => String(x))]
        );

        if (!bankQuestions || bankQuestions.length === 0) {
          return NextResponse.json({ success: false, error: 'No questions found in bank' }, { status: 404 });
        }

        const examRows = await neonQuery('SELECT exam_type FROM mock_exams WHERE id = $1::uuid LIMIT 1', [exam_id]);
        const exam = examRows[0];
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

        const inserted = await insertMockQuestions(toInsert);
        await mirrorMockQuestions(() => adminClient.from('mock_questions').insert(toInsert));

        return NextResponse.json({ success: true, count: inserted?.length || 0, questions: inserted });
      }

      case 'list_bank_for_class': {
        const { level, subject, difficulty, question_type, search } = params;
        const conditions: string[] = [];
        const qParams: any[] = [];
        if (level) {
          conditions.push(`level = $${qParams.length + 1}`);
          qParams.push(level);
        }
        if (subject) {
          conditions.push(`subject = $${qParams.length + 1}`);
          qParams.push(subject);
        }
        if (difficulty) {
          conditions.push(`difficulty_level = $${qParams.length + 1}`);
          qParams.push(difficulty);
        }
        if (question_type) {
          conditions.push(`question_type = $${qParams.length + 1}`);
          qParams.push(question_type);
        }
        if (search) {
          conditions.push(`question ILIKE $${qParams.length + 1}`);
          qParams.push(`%${search}%`);
        }
        const sql = `SELECT * FROM question_bank${conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''} ORDER BY created_at DESC`;
        const data = await neonQuery(sql, qParams);
        return NextResponse.json({ success: true, questions: data });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}