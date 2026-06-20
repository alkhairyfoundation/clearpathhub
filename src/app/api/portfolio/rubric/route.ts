import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req })
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')
    const sessionId = searchParams.get('sessionId')
    const termId = searchParams.get('termId')

    const { default: { Pool } } = await import('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL })

    let query = `SELECT sr.*, jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category) as skill
                 FROM student_skill_rubrics sr
                 LEFT JOIN skills s ON sr.skill_id = s.id`
    const params: any[] = []
    let idx = 1

    if (studentId) {
      query += ` WHERE sr.student_id = $${idx++}`
      params.push(studentId)
    }

    if (sessionId) {
      query += ` AND sr.session_id = $${idx++}`
      params.push(sessionId)
    }
    if (termId) {
      query += ` AND sr.term_id = $${idx++}`
      params.push(termId)
    }

    query += ' ORDER BY s.name'

    const result = await pool.query(query, params)
    await pool.end()

    return NextResponse.json({ rubrics: result.rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentId, rubrics: rubricUpdates } = await request.json()

    if (!studentId || !rubricUpdates || !Array.isArray(rubricUpdates)) {
      return NextResponse.json({ error: 'Missing required fields: studentId, rubrics (array)' }, { status: 400 })
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
    const validLevels = ['emerging', 'developing', 'secure', 'strong']
    let updated = 0

    for (const rubric of rubricUpdates) {
      if (!rubric.skill_id || !validLevels.includes(rubric.level)) continue

      const existing = await pool.query(
        'SELECT id FROM student_skill_rubrics WHERE student_id = $1 AND session_id = $2 AND term_id = $3 AND skill_id = $4',
        [studentId, sessionId, termId, rubric.skill_id]
      )

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE student_skill_rubrics SET level = $1, updated_by = COALESCE($2, updated_by) WHERE id = $3`,
          [rubric.level, rubric.updated_by || null, existing.rows[0].id]
        )
      } else {
        await pool.query(
          `INSERT INTO student_skill_rubrics (student_id, session_id, term_id, skill_id, level, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [studentId, sessionId, termId, rubric.skill_id, rubric.level, rubric.updated_by || null]
        )
      }
      updated++
    }

    await pool.end()
    return NextResponse.json({ message: 'Rubrics updated', count: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
