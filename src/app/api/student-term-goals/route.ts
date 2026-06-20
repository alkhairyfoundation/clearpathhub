import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const studentIdsParam = searchParams.get('studentIds');
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    let goalQuery: string;
    let goalParams: any[];
    let idx: number;

    if (studentIdsParam) {
      const ids = studentIdsParam.split(',').filter(Boolean);
      if (ids.length === 0) { await pool.end(); return NextResponse.json({ goals: [] }); }
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
      goalQuery = `SELECT stg.*, 
        jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name) as student,
        jsonb_build_object('name', a.name) as archetype
        FROM student_term_goals stg
        LEFT JOIN profiles p ON stg.student_id = p.id
        LEFT JOIN archetypes a ON stg.archetype_id = a.id
        WHERE stg.student_id IN (${placeholders})`;
      goalParams = [...ids];
      idx = ids.length + 1;
    } else if (studentId) {
      goalQuery = 'SELECT * FROM student_term_goals WHERE student_id = $1';
      goalParams = [studentId];
      idx = 2;
    } else {
      goalQuery = 'SELECT * FROM student_term_goals ORDER BY created_at DESC';
      goalParams = [];
      idx = 1;
    }

    if (sessionId) {
      goalQuery += ` AND session_id = $${idx++}`;
      goalParams.push(sessionId);
    }
    if (termId) {
      goalQuery += ` AND term_id = $${idx++}`;
      goalParams.push(termId);
    }

    const goalResult = await pool.query(goalQuery, goalParams);
    const isBulk = !!(studentIdsParam || !studentId);
    if (isBulk) {
      const goals = goalResult.rows;
      for (const g of goals) {
        const gsResult = await pool.query(
          `SELECT gs.*, jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category) as skill
           FROM student_goal_skills gs LEFT JOIN skills s ON gs.skill_id = s.id
           WHERE gs.student_term_goal_id = $1 ORDER BY gs.order_index`,
          [g.id]
        );
        (g as any).goal_skills = gsResult.rows;
        if (g.archetype_id) {
          const archResult = await pool.query('SELECT * FROM archetypes WHERE id = $1', [g.archetype_id]);
          if (archResult.rows.length > 0) (g as any).archetype = archResult.rows[0];
        }
      }
      await pool.end();
      return NextResponse.json({ goals });
    }

    const goal = goalResult.rows[0] || null;
    let goalSkills: any[] = [];
    if (goal) {
      const gsResult = await pool.query(
        `SELECT gs.*, jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category) as skill
         FROM student_goal_skills gs LEFT JOIN skills s ON gs.skill_id = s.id
         WHERE gs.student_term_goal_id = $1 ORDER BY gs.order_index`,
        [goal.id]
      );
      goalSkills = gsResult.rows;
      if (goal.archetype_id) {
        const archResult = await pool.query('SELECT * FROM archetypes WHERE id = $1', [goal.archetype_id]);
        if (archResult.rows.length > 0) (goal as any).archetype = archResult.rows[0];
      }
    }
    (goal as any).goal_skills = goalSkills;
    await pool.end();
    return NextResponse.json({ goal });
  } catch (error: any) {
    console.error('Error fetching student term goals:', error);
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
    const { action, student_id, session_id, term_id, archetype_id, goal_statement_snapshot, skill_ids, goal_id } = body;

    if (!student_id || !session_id || !term_id || !archetype_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    if (action === 'update' && goal_id) {
      if (body.reflection_text !== undefined) {
        const result = await pool.query(
          'UPDATE student_term_goals SET reflection_text = $1 WHERE id = $2 RETURNING *',
          [body.reflection_text, goal_id]
        );
        await pool.end();
        return NextResponse.json({ goal: result.rows[0] });
      }
      if (body.approved_at !== undefined) {
        const result = await pool.query(
          'UPDATE student_term_goals SET status = $1, approved_at = $2, approved_by = $3 WHERE id = $4 RETURNING *',
          [body.status || 'active', body.approved_at, body.approved_by || null, goal_id]
        );
        await pool.end();
        return NextResponse.json({ goal: result.rows[0] });
      }
      const result = await pool.query(
        `UPDATE student_term_goals SET archetype_id = $1, goal_statement_snapshot = $2, status = COALESCE($3, status)
         WHERE id = $4 RETURNING *`,
        [archetype_id, goal_statement_snapshot, body.status || 'pending', goal_id]
      );

      if (skill_ids && Array.isArray(skill_ids)) {
        await pool.query('DELETE FROM student_goal_skills WHERE student_term_goal_id = $1', [goal_id]);
        if (skill_ids.length > 0) {
          const values = skill_ids.map((_: string, i: number) => {
            const offset = i * 3;
            return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
          }).join(', ');
          const params: any[] = [];
          skill_ids.forEach((sid: string, i: number) => {
            params.push(goal_id, sid, i);
          });
          await pool.query(
            `INSERT INTO student_goal_skills (student_term_goal_id, skill_id, order_index) VALUES ${values}`,
            params
          );
        }
      }

      await pool.end();
      return NextResponse.json({ goal: result.rows[0] });
    }

    const existingCheck = await pool.query(
      'SELECT id FROM student_term_goals WHERE student_id = $1 AND session_id = $2 AND term_id = $3',
      [student_id, session_id, term_id]
    );

    if (existingCheck.rows.length > 0) {
      await pool.end();
      return NextResponse.json({ error: 'Goal already exists for this term' }, { status: 409 });
    }

    const result = await pool.query(
      `INSERT INTO student_term_goals (student_id, session_id, term_id, archetype_id, goal_statement_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [student_id, session_id, term_id, archetype_id, goal_statement_snapshot]
    );

    const newGoal = result.rows[0];

    if (skill_ids && Array.isArray(skill_ids) && skill_ids.length > 0) {
      const values = skill_ids.map((_: string, i: number) => {
        const offset = i * 3;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
      }).join(', ');
      const params: any[] = [];
      skill_ids.forEach((sid: string, i: number) => {
        params.push(newGoal.id, sid, i);
      });
      await pool.query(
        `INSERT INTO student_goal_skills (student_term_goal_id, skill_id, order_index) VALUES ${values}`,
        params
      );
    }

    await pool.end();
    return NextResponse.json({ goal: newGoal }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating/updating student term goal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
