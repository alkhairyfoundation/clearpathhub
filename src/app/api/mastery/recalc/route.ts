import { NextResponse } from 'next/server'
import { query as neonQuery } from '@/lib/neon'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { studentId } = await request.json()
    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }

    // Get all unique topic+subject combinations from practice attempts
    const topics = await neonQuery(
      `SELECT topic, subtopic
       FROM practice_attempts
       WHERE student_id = $1::uuid AND topic IS NOT NULL AND topic <> ''`,
      [studentId]
    )

    if (!topics || topics.length === 0) {
      return NextResponse.json({ message: 'No practice data found', count: 0 })
    }

    // Deduplicate topics
    const seen = new Set<string>()
    const uniqueTopics = topics.filter((t: any) => {
      const key = `${t.topic}|${t.subtopic || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Call the DB function for each topic
    let updated = 0
    for (const t of uniqueTopics as any[]) {
      try {
        await neonQuery(
          'SELECT "recalc_topic_mastery"("p_student_id" => $1::uuid, "p_subject_id" => $2::uuid, "p_topic" => $3, "p_subtopic" => $4)',
          [studentId, null, t.topic, t.subtopic || '']
        )
        updated++
      } catch (e) {
        console.error('recalc_topic_mastery failed for', t.topic, t.subtopic, e)
      }
    }

    return NextResponse.json({ message: 'Mastery recalculated', topics_processed: updated, total_topics: uniqueTopics.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
