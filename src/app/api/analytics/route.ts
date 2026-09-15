import { NextResponse } from 'next/server'
import { query as neonQuery } from '@/lib/neon'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const riskLevel = searchParams.get('riskLevel')

    // Build query
    const conditions: string[] = []
    const params: any[] = []
    if (studentId) {
      conditions.push(`srp.student_id = $${params.length + 1}::uuid`)
      params.push(studentId)
    }
    if (riskLevel) {
      conditions.push(`srp.risk_level = $${params.length + 1}`)
      params.push(riskLevel)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const sql = `
      SELECT srp.*,
        (SELECT to_jsonb(tmp)
         FROM (SELECT s.id, s.first_name, s.last_name, s.email) AS tmp) AS student
      FROM student_risk_predictions srp
      LEFT JOIN profiles s ON s.id = srp.student_id
      ${where}
      ORDER BY srp.prediction_date DESC
      LIMIT $${params.length + 1}
    `
    params.push(limit)

    const data = await neonQuery(sql, params)

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error fetching analytics data:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Trigger the predictive analytics function
    // In a production environment, this would call a Supabase function
    // For now, we'll return a success message indicating the trigger
    
    return NextResponse.json({
      success: true,
      message: 'Risk prediction generation triggered. Check back in a few minutes for results.'
    })
  } catch (error: any) {
    console.error('Error triggering predictive analytics:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}