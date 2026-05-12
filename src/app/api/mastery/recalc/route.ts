import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  try {
    const { studentId } = await request.json()
    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }

    // Get all unique topic+subject combinations from practice attempts
    const { data: topics, error: topicErr } = await supabase
      .from('practice_attempts')
      .select('topic, subtopic')
      .eq('student_id', studentId)
      .not('topic', 'is', null)
      .neq('topic', '')

    if (topicErr) throw topicErr

    if (!topics || topics.length === 0) {
      return NextResponse.json({ message: 'No practice data found', count: 0 })
    }

    // Deduplicate topics
    const seen = new Set<string>()
    const uniqueTopics = topics.filter(t => {
      const key = `${t.topic}|${t.subtopic || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Call the DB function for each topic
    let updated = 0
    for (const t of uniqueTopics) {
      const { error } = await supabase.rpc('recalc_topic_mastery', {
        p_student_id: studentId,
        p_subject_id: null,
        p_topic: t.topic,
        p_subtopic: t.subtopic || '',
      })
      if (!error) updated++
    }

    return NextResponse.json({ message: 'Mastery recalculated', topics_processed: updated, total_topics: uniqueTopics.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
