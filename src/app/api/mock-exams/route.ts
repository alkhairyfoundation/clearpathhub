import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { query as neonQuery } from '@/lib/neon';

const SUBJECT_WEIGHTS: Record<string, Record<string, number>> = {
  JSS3_BECE: { MATHEMATICS: 0.30, ENGLISH: 0.25, 'BASIC SCIENCE': 0.25, 'BASIC TECHNOLOGY': 0.20 },
  SS3_WAEC: { MATHEMATICS: 0.25, ENGLISH: 0.20, PHYSICS: 0.20, CHEMISTRY: 0.15, BIOLOGY: 0.10, GEOGRAPHY: 0.10 },
};

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

async function mirrorWrites(mirror: () => any) {
  try {
    await mirror();
  } catch (mirrorError) {
    console.error('Supabase mock-exams mirror error:', mirrorError);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('id');
    const examType = searchParams.get('exam_type');
    const published = searchParams.get('published');

    if (examId) {
      const rows = await neonQuery(
        `SELECT e.*,
          COALESCE((SELECT jsonb_agg("sq")
                    FROM (SELECT q.* FROM "mock_questions" q WHERE q.exam_id = e.id) AS "sq"), '[]'::jsonb) AS questions
         FROM mock_exams e
         WHERE e.id = $1::uuid
         LIMIT 1`,
        [examId]
      );
      const data = rows[0];
      if (!data) return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 500 });
      return NextResponse.json({ success: true, exam: data });
    }

    const conditions: string[] = [];
    const params: any[] = [];
    if (examType) {
      conditions.push(`exam_type = $${params.length + 1}`);
      params.push(examType);
    }
    if (published !== null) {
      conditions.push(`is_published = $${params.length + 1}`);
      params.push(published === 'true');
    }
    const sql = `SELECT * FROM mock_exams${conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''} ORDER BY created_at DESC`;
    const data = await neonQuery(sql, params);
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

        const rows = await neonQuery(
          `INSERT INTO mock_exams (title, description, exam_type, academic_year, exam_date, duration_minutes, passing_score, total_questions, shuffle_questions, require_fullscreen, prevent_tab_switch, max_tab_switches, max_attempts, is_published, created_by)
           VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::uuid)
           RETURNING *`,
          [title, description, exam_type, academic_year, exam_date || null, duration_minutes || 120, passing_score || 50, total_questions || 60, shuffle_questions ?? true, require_fullscreen ?? false, prevent_tab_switch ?? false, max_tab_switches || 3, max_attempts || 0, true, created_by]
        );
        const data = rows[0];
        await mirrorWrites(() => adminClient.from('mock_exams').insert({
          title, description, exam_type, academic_year, exam_date: exam_date || null,
          duration_minutes: duration_minutes || 120, passing_score: passing_score || 50,
          total_questions: total_questions || 60, shuffle_questions: shuffle_questions ?? true,
          require_fullscreen: require_fullscreen ?? false, prevent_tab_switch: prevent_tab_switch ?? false,
          max_tab_switches: max_tab_switches || 3, max_attempts: max_attempts || 0,
          is_published: true, created_by, class_level: classLevelValue,
        }));
        return NextResponse.json({ success: true, exam: data }, { status: 201 });
      }

      case 'update_exam': {
        const { id, title, description, exam_date, duration_minutes, passing_score, total_questions, shuffle_questions, require_fullscreen, prevent_tab_switch, max_tab_switches, max_attempts, is_published } = params;
        if (!id) return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 });
        const rows = await neonQuery(
          `UPDATE mock_exams
           SET title = $2, description = $3, exam_date = $4::date, duration_minutes = $5, passing_score = $6,
               total_questions = $7, shuffle_questions = $8, require_fullscreen = $9, prevent_tab_switch = $10,
               max_tab_switches = $11, max_attempts = $12, is_published = $13
           WHERE id = $1::uuid
           RETURNING *`,
          [id, title, description, exam_date || null, duration_minutes, passing_score, total_questions, shuffle_questions, require_fullscreen, prevent_tab_switch, max_tab_switches, max_attempts, is_published]
        );
        const data = rows[0];
        await mirrorWrites(() => adminClient.from('mock_exams').update({
          title, description, exam_date: exam_date || null,
          duration_minutes, passing_score, total_questions,
          shuffle_questions, require_fullscreen, prevent_tab_switch,
          max_tab_switches, max_attempts, is_published,
        }).eq('id', id));
        return NextResponse.json({ success: true, exam: data });
      }

      case 'populate_from_bank': {
        const { id: examId } = params;
        if (!examId) return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 });

        const examRows = await neonQuery('SELECT * FROM mock_exams WHERE id = $1::uuid LIMIT 1', [examId]);
        const exam = examRows[0];
        if (!exam) return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });

        // Check remaining capacity
        const countRows = await neonQuery('SELECT COUNT(*)::int AS total FROM mock_questions WHERE exam_id = $1::uuid', [examId]);
        const currentCount = countRows[0]?.total || 0;
        const totalQs = exam.total_questions || 60;
        const remainingCapacity = Math.max(0, totalQs - currentCount);
        if (remainingCapacity <= 0) {
          return NextResponse.json({ success: false, error: 'Exam has reached its total_questions capacity. No more questions can be added.' }, { status: 400 });
        }

        const targetLevel = exam.exam_type === 'JSS3_BECE' ? 'JSS3' : 'SS3';
        const targetSubjects = targetLevel === 'JSS3'
          ? ['MATHEMATICS', 'ENGLISH', 'BASIC SCIENCE', 'BASIC TECHNOLOGY']
          : ['MATHEMATICS', 'ENGLISH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'GEOGRAPHY'];

        const bankQuestions = await neonQuery(
          `SELECT * FROM question_bank
           WHERE status::text = ANY($1::text[]) AND level = $2 AND subject::text = ANY($3::text[])`,
          [['published', 'active'], targetLevel, targetSubjects]
        );

        if (!bankQuestions || bankQuestions.length === 0) {
          return NextResponse.json({ success: true, count: 0, message: 'No questions found in bank for this class level' });
        }

        // Fetch existing questions for this exam to avoid duplicates
        const existingRows = await neonQuery('SELECT question FROM mock_questions WHERE exam_id = $1::uuid', [examId]);
        const existingTexts = new Set((existingRows || []).map((r: any) => (r.question || '').trim().toLowerCase()));
        const seenTexts = new Set<string>();
        const filteredBank = bankQuestions.filter((q: any) => {
          const key = (q.question || '').trim().toLowerCase();
          if (!key || existingTexts.has(key) || seenTexts.has(key)) return false;
          seenTexts.add(key);
          return true;
        });
        if (filteredBank.length === 0) {
          return NextResponse.json({ success: true, count: 0, message: 'All available bank questions are already in this exam' });
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
          const subjectQs = filteredBank.filter((q: any) => q.subject === subject);
          const need = qsPerSubject[subject] || 0;
          if (subjectQs.length === 0 || need <= 0) continue;
          const veryHard = subjectQs.filter((q: any) => q.difficulty_level === 'VERY_HARD');
          const hard = subjectQs.filter((q: any) => q.difficulty_level === 'HARD');
          const medium = subjectQs.filter((q: any) => q.difficulty_level === 'MEDIUM');
          const easy = subjectQs.filter((q: any) => q.difficulty_level === 'EASY');
          const chosen = [
            ...veryHard.sort(() => Math.random() - 0.5).slice(0, Math.round(need * 0.3)),
            ...hard.sort(() => Math.random() - 0.5).slice(0, Math.round(need * 0.3)),
            ...medium.sort(() => Math.random() - 0.5).slice(0, Math.round(need * 0.25)),
            ...easy.sort(() => Math.random() - 0.5).slice(0, Math.round(need * 0.15)),
          ];
          if (chosen.length < need) {
            const remaining = subjectQs.filter((q: any) => !chosen.find((s) => s.id === q.id)).sort(() => Math.random() - 0.5).slice(0, need - chosen.length);
            selected = [...selected, ...chosen, ...remaining];
          } else {
            selected = [...selected, ...chosen];
          }
        }

        // Redistribute: if some subjects fell short, fill remaining capacity from
        // subjects that still have unused bank questions so the exam matches total_questions.
        if (selected.length < remainingCapacity) {
          const usedIds = new Set(selected.map((s: any) => s.id));
          let guard = 0;
          while (selected.length < remainingCapacity && guard < targetSubjects.length * 5) {
            guard++;
            let added = 0;
            for (const subject of targetSubjects) {
              if (selected.length >= remainingCapacity) break;
              const available = filteredBank.filter((q: any) => q.subject === subject && !usedIds.has(q.id)).sort(() => Math.random() - 0.5);
              if (available.length === 0) continue;
              selected.push(available[0]);
              usedIds.add(available[0].id);
              added++;
            }
            if (added === 0) break;
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

        const inserted = await insertMockQuestions(toInsert);
        await mirrorWrites(() => adminClient.from('mock_questions').insert(toInsert));

        return NextResponse.json({ success: true, count: inserted?.length || 0 });
      }

      case 'delete_exam': {
        const { id } = params;
        if (!id) return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 });
        await neonQuery('DELETE FROM mock_questions WHERE exam_id = $1::uuid', [id]);
        await neonQuery('DELETE FROM mock_exams WHERE id = $1::uuid', [id]);
        await mirrorWrites(async () => {
          await adminClient.from('mock_questions').delete().eq('exam_id', id);
          await adminClient.from('mock_exams').delete().eq('id', id);
        });
        return NextResponse.json({ success: true });
      }

      case 'list_exams': {
        const { exam_type, is_published, class_level } = params;
        const conditions: string[] = [];
        const qParams: any[] = [];
        if (exam_type) {
          conditions.push(`exam_type = $${qParams.length + 1}`);
          qParams.push(exam_type);
        }
        if (is_published !== undefined) {
          conditions.push(`is_published = $${qParams.length + 1}`);
          qParams.push(is_published);
        }
        if (class_level) {
          const examType = class_level === 'JSS3' ? 'JSS3_BECE' : 'SS3_WAEC';
          conditions.push(`exam_type = $${qParams.length + 1}`);
          qParams.push(examType);
        }
        const sql = `SELECT * FROM mock_exams${conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''} ORDER BY created_at DESC`;
        const data = await neonQuery(sql, qParams);
        return NextResponse.json({ success: true, exams: data });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}