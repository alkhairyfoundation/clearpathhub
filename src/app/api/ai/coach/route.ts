import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { student_id, interaction_type, context } = body;

    if (!student_id || !interaction_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });

    const studentResult = await pool.query(
      `SELECT 
        p.first_name, p.last_name,
        s.class_id,
        c.name as class_name
       FROM profiles p
       LEFT JOIN students s ON s.profile_id = p.id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE p.id = $1`,
      [student_id]
    );
    const student = studentResult.rows[0];

    const masteryResult = await pool.query(
      `SELECT ms.topic, ms.mastery_score, ms.level, ms.total_attempts, ms.correct_attempts,
              sub.name as subject_name
       FROM mastery_scores ms
       LEFT JOIN subjects sub ON ms.subject_id = sub.id
       WHERE ms.student_id = $1
       ORDER BY ms.mastery_score ASC
       LIMIT 5`,
      [student_id]
    );
    const weakTopics = masteryResult.rows;

    const streakResult = await pool.query(
      `SELECT current_streak, longest_streak FROM learning_streaks WHERE student_id = $1`,
      [student_id]
    );
    const streak = streakResult.rows[0];

    const recentResult = await pool.query(
      `SELECT score, correct_answers, answered_questions, created_at
       FROM practice_sessions
       WHERE student_id = $1 AND status = 'completed'
       ORDER BY created_at DESC LIMIT 5`,
      [student_id]
    );
    const recentSessions = recentResult.rows;

    const goalResult = await pool.query(
      `SELECT goal_text, status, dimension FROM goal_hierarchy
       WHERE student_id = $1 AND period_type = 'daily' AND status = 'active'
       LIMIT 3`,
      [student_id]
    );
    const activeGoals = goalResult.rows;

    let responseText = '';
    let recommendations: any[] = [];

    if (interaction_type === 'motivation') {
      const avgScore = recentSessions.length > 0
        ? Math.round(recentSessions.reduce((s: number, r: any) => s + (r.score || 0), 0) / recentSessions.length)
        : 0;

      if (streak && streak.current_streak >= 3) {
        responseText = `Masha'Allah, ${student.first_name}! You're on a ${streak.current_streak}-day learning streak! Your consistency is building strong habits. Keep going - every day of practice brings you closer to mastery.`;
      } else if (avgScore >= 80) {
        responseText = `Excellent work, ${student.first_name}! Your recent scores averaging ${avgScore}% show you're mastering your topics. Challenge yourself with harder questions!`;
      } else if (weakTopics.length > 0) {
        responseText = `I can see you've been working hard, ${student.first_name}. Let's focus on strengthening ${weakTopics[0].topic} in ${weakTopics[0].subject_name}. Small daily improvements lead to big results!`;
      } else {
        responseText = `Assalamu Alaikum, ${student.first_name}! Ready for today's learning? Every journey begins with a single step. Let's make today productive!`;
      }

      recommendations.push({ type: 'practice', text: 'Complete your daily practice session', priority: 'high' });
      if (weakTopics.length > 0) {
        recommendations.push({ type: 'focus', text: `Review ${weakTopics[0].topic} - currently at ${Math.round(weakTopics[0].mastery_score)}%`, priority: 'high' });
      }
    } else if (interaction_type === 'gap_analysis') {
      if (weakTopics.length > 0) {
        responseText = `Here's your learning gap analysis, ${student.first_name}:\n\n`;
        weakTopics.forEach((t: any, i: number) => {
          responseText += `${i + 1}. ${t.subject_name} - ${t.topic}: ${Math.round(t.mastery_score)}% mastery (${t.level})\n`;
        });
        responseText += `\nI recommend focusing on these topics first. Would you like a study plan?`;
        recommendations = weakTopics.map((t: any) => ({
          type: 'study',
          text: `Create revision plan for ${t.topic}`,
          priority: t.mastery_score < 40 ? 'critical' : 'high',
        }));
      } else {
        responseText = `Masha'Allah! You're doing great across all topics, ${student.first_name}. Let's look at advanced topics to challenge you further.`;
        recommendations.push({ type: 'challenge', text: 'Try advanced challenges', priority: 'medium' });
      }
    } else if (interaction_type === 'revision_plan') {
      if (weakTopics.length > 0) {
        responseText = `Based on your performance, here's a personalized revision plan:\n\n`;
        weakTopics.forEach((t: any, i: number) => {
          const days = i + 1;
          responseText += `Day ${days}: Revise ${t.topic} (${t.subject_name}) - ${Math.round(t.mastery_score)}%\n`;
        });
        responseText += `\nSpend 20-30 minutes on each topic. Take the practice quiz after each revision.`;
        recommendations = weakTopics.map((t: any, i: number) => ({
          type: 'revision',
          text: `Day ${i + 1}: Revise ${t.topic}`,
          priority: 'high',
        }));
      } else {
        responseText = `You've mastered all your current topics! Let's explore what's coming next in your curriculum.`;
      }
    } else if (interaction_type === 'goal_suggestion') {
      if (activeGoals.length > 0) {
        responseText = `Here are your active goals:\n`;
        activeGoals.forEach((g: any) => {
          responseText += `• ${g.goal_text} (${g.status})\n`;
        });
        responseText += `\nKeep pushing forward! Every completed goal builds your future.`;
      } else {
        responseText = `${student.first_name}, have you set your daily goals? I recommend starting with:\n1. Complete 10 practice questions\n2. Read one lesson\n3. Track your salah\n4. Practice one skill`;
        recommendations = [
          { type: 'goal', text: 'Set daily practice goal (10 questions)', priority: 'high' },
          { type: 'goal', text: 'Track today\'s islamic development', priority: 'medium' },
          { type: 'goal', text: 'Log a skill activity', priority: 'medium' },
        ];
      }
    } else {
      responseText = `Assalamu Alaikum ${student.first_name}! I'm your AI Learning Coach. I can help you with:\n\n📚 Personalized study recommendations\n🎯 Learning gap analysis\n📅 Revision planning\n💪 Motivation and encouragement\n\nWhat would you like help with?`;
      recommendations = [
        { type: 'motivation', text: 'Give me motivation!', priority: 'medium' },
        { type: 'gap_analysis', text: 'Analyze my learning gaps', priority: 'medium' },
        { type: 'revision_plan', text: 'Create a revision plan', priority: 'medium' },
        { type: 'goal_suggestion', text: 'Suggest goals', priority: 'medium' },
      ];
    }

    await pool.query(
      `INSERT INTO ai_coach_interactions (student_id, interaction_type, prompt_text, response_text, recommendations, context)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [student_id, interaction_type, body.prompt || '', responseText, JSON.stringify(recommendations), JSON.stringify(context || {})]
    );

    const recentResult2 = await pool.query(
      `SELECT response_text, recommendations, interaction_type, created_at
       FROM ai_coach_interactions
       WHERE student_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [student_id]
    );

    await pool.end();

    return NextResponse.json({
      response: responseText,
      recommendations,
      history: recentResult2.rows,
      student: { name: `${student.first_name} ${student.last_name}`, className: student.class_name },
      weakTopics,
      streak,
      recentSessions,
    });
  } catch (error: any) {
    console.error('AI Coach error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
