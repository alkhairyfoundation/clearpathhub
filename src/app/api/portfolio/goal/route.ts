import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentId, archetypeId, skillIds, goalStatement, status } = await request.json()

    if (!studentId || !archetypeId || !skillIds || !goalStatement) {
      return NextResponse.json({ error: 'Missing required fields: studentId, archetypeId, skillIds, goalStatement' }, { status: 400 })
    }

    if (!Array.isArray(skillIds) || skillIds.length < 3 || skillIds.length > 5) {
      return NextResponse.json({ error: 'Must select between 3 and 5 skills' }, { status: 400 })
    }

    const { default: { Pool } } = await import('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL })

    const sessionRes = await pool.query("SELECT id FROM academic_sessions WHERE is_current = true LIMIT 1")
    const termRes = await pool.query("SELECT id FROM terms WHERE is_current = true LIMIT 1")

    if (sessionRes.rows.length === 0 || termRes.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'No active session or term' }, { status: 400 })
    }

    const sessionId = sessionRes.rows[0].id
    const termId = termRes.rows[0].id

    const existingRes = await pool.query(
      'SELECT id FROM student_term_goals WHERE student_id = $1 AND session_id = $2 AND term_id = $3',
      [studentId, sessionId, termId]
    )

    if (existingRes.rows.length > 0) {
      const goalId = existingRes.rows[0].id
      await pool.query(
        `UPDATE student_term_goals SET archetype_id = $1, goal_statement_snapshot = $2, status = $3 WHERE id = $4`,
        [archetypeId, goalStatement, status || 'pending', goalId]
      )

      await pool.query('DELETE FROM student_goal_skills WHERE student_term_goal_id = $1', [goalId])

      if (skillIds.length > 0) {
        const values = skillIds.map((_: string, i: number) => {
          const offset = i * 3
          return `($${offset + 1}, $${offset + 2}, $${offset + 3})`
        }).join(', ')
        const params: any[] = []
        skillIds.forEach((sid: string, i: number) => {
          params.push(goalId, sid, i)
        })
        await pool.query(
          `INSERT INTO student_goal_skills (student_term_goal_id, skill_id, order_index) VALUES ${values}`,
          params
        )
      }

      await pool.end()
      return NextResponse.json({ message: 'Goal updated', id: goalId })
    }

    const newGoalRes = await pool.query(
      `INSERT INTO student_term_goals (student_id, session_id, term_id, archetype_id, goal_statement_snapshot, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
      [studentId, sessionId, termId, archetypeId, goalStatement]
    )

    const newGoalId = newGoalRes.rows[0].id

    if (skillIds.length > 0) {
      const values = skillIds.map((_: string, i: number) => {
        const offset = i * 3
        return `($${offset + 1}, $${offset + 2}, $${offset + 3})`
      }).join(', ')
      const params: any[] = []
      skillIds.forEach((sid: string, i: number) => {
        params.push(newGoalId, sid, i)
      })
      await pool.query(
        `INSERT INTO student_goal_skills (student_term_goal_id, skill_id, order_index) VALUES ${values}`,
        params
      )
    }

    await pool.end()
    return NextResponse.json({ message: 'Goal created', id: newGoalId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
