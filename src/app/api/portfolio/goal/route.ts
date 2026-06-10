import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  try {
    const { studentId, archetypeId, skillIds, goalStatement, status } = await request.json()

    if (!studentId || !archetypeId || !skillIds || !goalStatement) {
      return NextResponse.json({ error: 'Missing required fields: studentId, archetypeId, skillIds, goalStatement' }, { status: 400 })
    }

    if (!Array.isArray(skillIds) || skillIds.length < 3 || skillIds.length > 5) {
      return NextResponse.json({ error: 'Must select between 3 and 5 skills' }, { status: 400 })
    }

    const { data: session } = await supabase.from('academic_sessions').select('id').eq('is_current', true).single()
    const { data: term } = await supabase.from('terms').select('id').eq('is_current', true).single()

    if (!session || !term) {
      return NextResponse.json({ error: 'No active session or term' }, { status: 400 })
    }

    const { data: existingGoal } = await supabase
      .from('student_term_goals')
      .select('id')
      .eq('student_id', studentId)
      .eq('session_id', session.id)
      .eq('term_id', term.id)
      .maybeSingle()

    if (existingGoal) {
      const { error: updateErr } = await supabase
        .from('student_term_goals')
        .update({
          archetype_id: archetypeId,
          goal_statement_snapshot: goalStatement,
          status: status || 'pending',
        })
        .eq('id', existingGoal.id)

      if (updateErr) throw updateErr

      await supabase.from('student_goal_skills').delete().eq('student_term_goal_id', existingGoal.id)

      const goalSkills = skillIds.map((sid: string, i: number) => ({
        student_term_goal_id: existingGoal.id,
        skill_id: sid,
        order_index: i,
      }))

      const { error: skillsErr } = await supabase.from('student_goal_skills').insert(goalSkills)
      if (skillsErr) throw skillsErr

      return NextResponse.json({ message: 'Goal updated', id: existingGoal.id })
    } else {
      const { data: newGoal, error: insertErr } = await supabase
        .from('student_term_goals')
        .insert({
          student_id: studentId,
          session_id: session.id,
          term_id: term.id,
          archetype_id: archetypeId,
          goal_statement_snapshot: goalStatement,
          status: 'pending',
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      const goalSkills = skillIds.map((sid: string, i: number) => ({
        student_term_goal_id: newGoal.id,
        skill_id: sid,
        order_index: i,
      }))

      const { error: skillsErr } = await supabase.from('student_goal_skills').insert(goalSkills)
      if (skillsErr) throw skillsErr

      return NextResponse.json({ message: 'Goal created', id: newGoal.id })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
