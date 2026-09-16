import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query as dbQuery } from '@/lib/neon';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const subjectId = searchParams.get('subjectId');
    const topic = searchParams.get('topic');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    let sql = `
      SELECT mlp.*, s.name as subject_name, s.code as subject_code
      FROM mastery_learning_path mlp
      LEFT JOIN subjects s ON mlp.subject_id = s.id
      WHERE mlp.student_id = $1
    `;
    const params: any[] = [studentId];
    let idx = 2;

    if (subjectId) {
      sql += ` AND mlp.subject_id = $${idx++}`;
      params.push(subjectId);
    }
    if (topic) {
      sql += ` AND mlp.topic = $${idx++}`;
      params.push(topic);
    }

    sql += ' ORDER BY mlp.subject_id, mlp.topic, mlp.stage';

    const path = await dbQuery(sql, params);

    return NextResponse.json({ path });
  } catch (error: any) {
    console.error('Error fetching mastery path:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { student_id, subject_id, topic, action } = body;

    if (!student_id || !subject_id || !topic || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'initialize') {
      const stages = ['lesson', 'practice', 'challenge', 'mastery_verification', 'advancement'];
      const values = stages.map((stage, i) => {
        return `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6})`;
      }).join(', ');

      const flatParams: any[] = [];
      stages.forEach((stage, i) => {
        flatParams.push(student_id, subject_id, topic, stage, i === 0, 3);
      });

      await dbQuery(
        `INSERT INTO mastery_learning_path (student_id, subject_id, topic, stage, is_unlocked, max_attempts)
         VALUES ${values}
         ON CONFLICT (student_id, subject_id, topic, stage) DO NOTHING`,
        flatParams
      );

      const path = await dbQuery(
        'SELECT * FROM mastery_learning_path WHERE student_id = $1 AND subject_id = $2 AND topic = $3 ORDER BY stage',
        [student_id, subject_id, topic]
      );

      return NextResponse.json({ path }, { status: 201 });
    }

    if (action === 'complete_stage') {
      const { stage, score } = body;
      await dbQuery(
        `UPDATE mastery_learning_path SET
           is_completed = true,
           completed_at = NOW(),
           attempts_count = attempts_count + 1,
           score_on_completion = COALESCE($5, score_on_completion)
         WHERE student_id = $1 AND subject_id = $2 AND topic = $3 AND stage = $4`,
        [student_id, subject_id, topic, stage, score]
      );

      if (stage === 'lesson') {
        await dbQuery(
          `UPDATE mastery_learning_path SET is_unlocked = true
           WHERE student_id = $1 AND subject_id = $2 AND topic = $3 AND stage = 'practice'`,
          [student_id, subject_id, topic]
        );
      } else if (stage === 'practice') {
        await dbQuery(
          `UPDATE mastery_learning_path SET is_unlocked = true
           WHERE student_id = $1 AND subject_id = $2 AND topic = $3 AND stage = 'challenge'`,
          [student_id, subject_id, topic]
        );
      } else if (stage === 'challenge' && score && score >= 80) {
        await dbQuery(
          `UPDATE mastery_learning_path SET is_unlocked = true
           WHERE student_id = $1 AND subject_id = $2 AND topic = $3 AND stage = 'mastery_verification'`,
          [student_id, subject_id, topic]
        );
      } else if (stage === 'mastery_verification' && score && score >= 80) {
        await dbQuery(
          `UPDATE mastery_learning_path SET is_unlocked = true
           WHERE student_id = $1 AND subject_id = $2 AND topic = $3 AND stage = 'advancement'`,
          [student_id, subject_id, topic]
        );
      }

      if (score && score < 80) {
        await dbQuery(
          `UPDATE mastery_learning_path SET
             attempts_count = attempts_count + 1,
             score_on_completion = $5,
             teacher_intervention_required = (attempts_count >= max_attempts)
           WHERE student_id = $1 AND subject_id = $2 AND topic = $3 AND stage = $4`,
          [student_id, subject_id, topic, stage, score]
        );
      }

      const path = await dbQuery(
        'SELECT * FROM mastery_learning_path WHERE student_id = $1 AND subject_id = $2 AND topic = $3 ORDER BY stage',
        [student_id, subject_id, topic]
      );

      return NextResponse.json({ path });
    }

    if (action === 'request_intervention') {
      await dbQuery(
        `UPDATE mastery_learning_path SET teacher_intervention_required = true
         WHERE student_id = $1 AND subject_id = $2 AND topic = $3 AND stage = $4`,
        [student_id, subject_id, topic, body.stage]
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error managing mastery path:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
