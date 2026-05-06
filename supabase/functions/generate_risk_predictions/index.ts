import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.getenv('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.getenv('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Simple risk prediction algorithm (in a real implementation, this would use ML)
function calculateRiskScore(studentData: any): number {
  // Factors: attendance (30%), grades (40%), behavior (20%), engagement (10%)
  const attendanceFactor = studentData.attendanceRate || 0.8
  const gradeFactor = studentData.avgScore / 100 || 0.7
  const behaviorFactor = studentData.behaviorScore || 0.7
  const engagementFactor = studentData.engagementScore || 0.6
  
  // Weighted calculation
  const riskScore = 1 - (
    (attendanceFactor * 0.3) + 
    (gradeFactor * 0.4) + 
    (behaviorFactor * 0.2) + 
    (engagementFactor * 0.1)
  )
  
  return Math.max(0, Math.min(1, riskScore))
}

function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score < 0.3) return 'low'
  if (score < 0.5) return 'medium'
  if (score < 0.7) return 'high'
  return 'critical'
}

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // Get all students with their recent data
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        students (
          id,
          admission_number,
          date_of_birth,
          gender
        )
      `)
      .eq('role', 'student')

    if (studentsError) throw studentsError

    // For each student, get recent performance data
    const predictions = []

    for (const student of students) {
      // Get recent attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status, date')
        .eq('student_id', student.id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false })

      const attendanceRate = attendanceData?.filter(a => a.status === 'present').length / 
                           Math.max(1, attendanceData?.length || 1) || 0.8

      // Get recent grades
      const { data: resultsData } = await supabase
        .from('results')
        .select('score')
        .eq('student_id', student.id)
        .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      const avgScore = resultsData?.reduce((sum, r) => sum + r.score, 0) / 
                      Math.max(1, resultsData?.length || 1) || 75

      // Get recent behavior reports
      const { data: behaviorData } = await supabase
        .from('behavioral_reports')
        .select('rating, punctuality, class_participation, homework_completion')
        .eq('student_id', student.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      const behaviorScore = behaviorData?.reduce((sum, b) => 
        sum + (b.rating + b.punctuality + b.class_participation + b.homework_completion) / 4, 0) / 
        Math.max(1, behaviorData?.length || 1) || 3

      // Get homework completion rate
      const { data: homeworkData } = await supabase
        .from('homework_submissions')
        .select('marks, total_marks')
        .eq('student_id', student.id)
        .gte('submitted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      const homeworkCompletionRate = homeworkData?.reduce((sum, h) => 
        sum + (h.marks || 0) / (h.total_marks || 100), 0) / 
        Math.max(1, homeworkData?.length || 1) || 0.7

      // Compile student data for risk calculation
      const studentData = {
        attendanceRate,
        avgScore,
        behaviorScore: behaviorScore / 5, // Normalize to 0-1
        engagementScore: homeworkCompletionRate
      }

      // Calculate risk score
      const riskScore = calculateRiskScore(studentData)
      const riskLevel = getRiskLevel(riskScore)

      // Generate contributing factors
      const contributingFactors = {
        attendance: {
          value: attendanceRate,
          impact: attendanceRate < 0.8 ? -0.3 : 0.1
        },
        grades: {
          value: avgScore / 100,
          impact: avgScore < 60 ? -0.4 : 0.1
        },
        behavior: {
          value: behaviorScore / 5,
          impact: behaviorScore < 3 ? -0.2 : 0.1
        },
        engagement: {
          value: homeworkCompletionRate,
          impact: homeworkCompletionRate < 0.6 ? -0.1 : 0.05
        }
      }

      // Generate predicted outcome
      let predictedOutcome = ''
      if (riskLevel === 'critical') {
        predictedOutcome = 'High risk of academic failure without intervention'
      } else if (riskLevel === 'high') {
        predictedOutcome = 'Risk of falling behind in multiple subjects'
      } else if (riskLevel === 'medium') {
        predictedOutcome = 'May benefit from additional support in weak areas'
      } else {
        predictedOutcome = 'On track for academic success'
      }

      // Insert prediction into database
      const { data: predictionData, error: predictionError } = await supabase
        .from('student_risk_predictions')
        .insert({
          student_id: student.id,
          prediction_date: new Date().toISOString().split('T')[0],
          risk_level,
          risk_score,
          contributing_factors: JSON.stringify(contributingFactors),
          predicted_outcome,
          confidence_score: 0.8, // Placeholder
          model_version: '1.0.0'
        })
        .select()
        .single()

      if (predictionError) throw predictionError

      predictions.push({
        student: {
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          email: student.email
        },
        prediction: predictionData
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: predictions.length,
        predictions 
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error generating risk predictions:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})