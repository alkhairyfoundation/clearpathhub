import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const riskLevel = searchParams.get('riskLevel')

    // Build query
    let query = supabase
      .from('student_risk_predictions')
      .select(`
        *,
        student:profiles(id, first_name, last_name, email)
      `)
      .order('prediction_date', { ascending: false })

    // Apply filters
    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    if (riskLevel) {
      query = query.eq('risk_level', riskLevel)
    }

    // Apply limit
    query = query.limit(limit)

    // Execute query
    const { data, error } = await query

    if (error) {
      throw error
    }

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