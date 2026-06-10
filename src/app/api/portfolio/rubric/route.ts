import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  try {
    const { studentId, rubrics: rubricUpdates } = await request.json()

    if (!studentId || !rubricUpdates || !Array.isArray(rubricUpdates)) {
      return NextResponse.json({ error: 'Missing required fields: studentId, rubrics (array)' }, { status: 400 })
    }

    const { data: session } = await supabase.from('academic_sessions').select('id').eq('is_current', true).single()
    const { data: term } = await supabase.from('terms').select('id').eq('is_current', true).single()

    if (!session || !term) {
      return NextResponse.json({ error: 'No active session or term' }, { status: 400 })
    }

    const validLevels = ['emerging', 'developing', 'secure', 'strong']
    let updated = 0

    for (const rubric of rubricUpdates) {
      if (!rubric.skill_id || !validLevels.includes(rubric.level)) continue

      const { error } = await supabase
        .from('student_skill_rubrics')
        .upsert({
          student_id: studentId,
          session_id: session.id,
          term_id: term.id,
          skill_id: rubric.skill_id,
          level: rubric.level,
          updated_by: rubric.updated_by || null,
        }, {
          onConflict: 'student_id,session_id,term_id,skill_id',
        })

      if (!error) updated++
    }

    return NextResponse.json({ message: 'Rubrics updated', count: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
