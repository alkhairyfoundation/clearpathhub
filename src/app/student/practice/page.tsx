'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Brain, CheckCircle, XCircle, Clock, Loader2, ArrowLeft, Zap, Award, BarChart3, Star, RotateCcw } from 'lucide-react';
import Calculator from '@/components/Calculator';

export default function StudentPracticePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState('');
  const [todayGoal, setTodayGoal] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const sessionStartTimeRef = useRef<number>(0);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0, time: 0 });
  const timerRef = useRef<any>(null);

  const QUESTIONS_PER_SESSION = 10;

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    startPractice();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [profile]);

  async function startPractice() {
    setLoading(true);
    try {
      const { data: student } = await supabase.from('students').select('*, class:classes!class_id(name)').eq('profile_id', profile?.id).maybeSingle();
      const { data: term } = await supabase.from('terms').select('*').eq('is_current', true).maybeSingle();

      if (!student?.class_id) throw new Error('No class assigned');

      // Adaptive question selection based on mastery scores and spaced repetition
      let selectedQuestions: any[] = [];
      const [masteryRes, reviewRes] = await Promise.all([
        supabase.from('mastery_scores').select('subject_id, topic, mastery_score, level').eq('student_id', profile?.id),
        supabase.from('review_schedule').select('subject_id, topic, subtopic').eq('student_id', profile?.id).lte('next_review_date', new Date().toISOString().split('T')[0]),
      ]);
      const masteryData = masteryRes.data || [];
      const dueReviews = reviewRes.data || [];

      // Categorize topics for adaptive selection
      const weakTopics = masteryData.filter(m => m.mastery_score < 60).map(m => m.topic);
      const dueTopicSet = new Set(dueReviews.map(r => r.topic));
      const masteredTopics = masteryData.filter(m => m.mastery_score >= 80).map(m => m.topic);

      // Get current SOW topic
      let sowTopic: string | null = null;
      if (term && student.class_id) {
        const { data: sow } = await supabase.from('scheme_of_work')
          .select('topic').eq('term_id', term.id).eq('class_id', student.class_id)
          .eq('week_number', term.current_week).maybeSingle();
        if (sow?.topic) sowTopic = sow.topic;
      }

      // Build prioritized topic list
      const priorityTopics = new Set<string>();
      weakTopics.slice(0, 3).forEach(t => priorityTopics.add(t));
      Array.from(dueTopicSet).filter(t => !priorityTopics.has(t)).slice(0, 2).forEach(t => priorityTopics.add(t));
      if (sowTopic && !priorityTopics.has(sowTopic)) priorityTopics.add(sowTopic);
      masteredTopics.filter(t => !priorityTopics.has(t)).slice(0, 2).forEach(t => priorityTopics.add(t));

      if (priorityTopics.size > 0) {
        const { data: adaptiveQuestions, error: qErr } = await supabase
          .from('question_bank').select('*').in('status', ['published', 'active'])
          .in('topic', Array.from(priorityTopics)).limit(QUESTIONS_PER_SESSION);
        if (qErr) throw qErr;
        if (adaptiveQuestions) selectedQuestions = adaptiveQuestions;
      }

      // Fallback: any published question if not enough adaptive ones
      if (selectedQuestions.length < QUESTIONS_PER_SESSION) {
        const { data: fallback } = await supabase
          .from('question_bank').select('*').in('status', ['published', 'active'])
          .limit(QUESTIONS_PER_SESSION - selectedQuestions.length);
        if (fallback) selectedQuestions.push(...fallback);
      }

      // Deduplicate
      const seenIds = new Set<string>();
      const finalQuestions = selectedQuestions.filter(q => {
        if (seenIds.has(q.id)) return false;
        seenIds.add(q.id);
        return true;
      }).length ? selectedQuestions.filter((q, i, arr) => arr.findIndex(x => x.id === q.id) === i) : [
        { id: 'demo', question: 'Sample: What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], correct_answer: 1, question_type: 'multiple_choice', difficulty_level: 'easy', topic: 'Demo', subtopic: '', explanation: 'Paris is the capital of France.' },
        { id: 'demo2', question: 'Sample: 5 + 3 = ?', options: ['6', '7', '8', '9'], correct_answer: 2, question_type: 'multiple_choice', difficulty_level: 'easy', topic: 'Demo', subtopic: '', explanation: '5 + 3 = 8' },
      ];
      setQuestions(finalQuestions.slice(0, QUESTIONS_PER_SESSION));

      // Create practice session
      const { data: newSession, error: sErr } = await supabase.from('practice_sessions').insert({
        student_id: profile?.id, term_id: term?.id || null,
        date: new Date().toISOString().split('T')[0],
        goal_type: 'mixed', total_questions: finalQuestions.length, status: 'in_progress',
      }).select().single();
      if (sErr) throw sErr;
      setSession(newSession);
      sessionStartTimeRef.current = Date.now();
      setStartTime(Date.now());

      // Ensure daily goal exists
      const { data: goal } = await supabase.from('daily_goals').select('*')
        .eq('student_id', profile?.id).eq('date', new Date().toISOString().split('T')[0]).maybeSingle();
      if (!goal) {
        await supabase.from('daily_goals').insert({
          student_id: profile?.id, date: new Date().toISOString().split('T')[0],
          target_questions: QUESTIONS_PER_SESSION, target_score: 70,
        });
      } else { setTodayGoal(goal); }

      // Fetch streak
      const { data: streakData } = await supabase.from('learning_streaks').select('*').eq('student_id', profile?.id).maybeSingle();
      if (streakData) setStreak(streakData);

      // Fetch badges
      const { data: badgeData } = await supabase.from('badges').select('*').eq('student_id', profile?.id);
      if (badgeData) setBadges(badgeData);

    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  function handleAnswer(idx: number) {
    if (showFeedback) return;
    setSelectedAnswer(idx);
    setShowFeedback(true);
  }

  async function handleNext() {
    const q = questions[currentIdx];
    const isCorrect = selectedAnswer === q.correct_answer;

    const questionTime = Math.floor((Date.now() - startTime) / 1000);

    // Record attempt
    if (session) {
      try {
        const { error: attemptError } = await supabase.from('practice_attempts').insert({
          session_id: session.id, student_id: profile?.id,
          question_text: q.question, question_type: q.question_type || 'multiple_choice',
          options: q.options, correct_answer: q.correct_answer,
          selected_answer: selectedAnswer, is_correct: isCorrect,
          time_taken: questionTime,
          difficulty: q.difficulty_level || 'medium', topic: q.topic || '', subtopic: q.subtopic || '',
          explanation: q.explanation || null,
          question_source: 'bank', source_id: q.id,
        });
        if (attemptError) console.error('Failed to save practice attempt:', attemptError.message);
      } catch (err) {
        console.error('Failed to save practice attempt:', err);
      }
    }

    setSessionStats(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1, time: prev.time + questionTime }));

    if (currentIdx + 1 >= questions.length) {
      await finishSession(isCorrect);
    } else {
      setCurrentIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setStartTime(Date.now());
    }
  }

  async function finishSession(lastCorrect: boolean) {
    const finalCorrect = sessionStats.correct + (lastCorrect ? 1 : 0);
    const finalTotal = sessionStats.total + 1;
    const score = Math.round((finalCorrect / finalTotal) * 100);
    const duration = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

    if (session) {
      try {
        const { error: sessionError } = await supabase.from('practice_sessions').update({
          status: 'completed', completed_at: new Date().toISOString(),
          answered_questions: finalTotal, correct_answers: finalCorrect, score, duration_seconds: duration,
        }).eq('id', session.id);
        if (sessionError) console.error('Failed to update session:', sessionError.message);
      } catch (err) {
        console.error('Failed to update session:', err);
      }
    }

    // Update daily goal
    const today = new Date().toISOString().split('T')[0];
    const { data: goal } = await supabase.from('daily_goals').select('*')
      .eq('student_id', profile?.id).eq('date', today).maybeSingle();
    if (goal) {
      try {
        await supabase.from('daily_goals').update({
          completed_questions: finalTotal, achieved_score: score,
          status: score >= 70 ? 'completed' : 'missed',
        }).eq('id', goal.id);
      } catch (err) {
        console.error('Failed to update daily goal:', err);
      }
    }

    // Update streak
    await updateStreak();

    // Check badges
    await checkBadges(finalTotal, finalCorrect, score);

    // Update spaced repetition schedules
    await updateReviewSchedules();

    setFinished(true);
  }

  async function updateReviewSchedules() {
    if (!session) return;
    const { data: attempts } = await supabase
      .from('practice_attempts')
      .select('topic, subtopic, is_correct, difficulty')
      .eq('session_id', session.id);
    if (!attempts || attempts.length === 0) return;

    const topicGroups: Record<string, { total: number; correct: number; subtopics: Set<string> }> = {};
    for (const a of attempts) {
      if (!a.topic) continue;
      if (!topicGroups[a.topic]) topicGroups[a.topic] = { total: 0, correct: 0, subtopics: new Set() };
      topicGroups[a.topic].total++;
      if (a.is_correct) topicGroups[a.topic].correct++;
      if (a.subtopic) topicGroups[a.topic].subtopics.add(a.subtopic);
    }

    const practicedTopics = Object.keys(topicGroups);
    if (practicedTopics.length === 0) return;

    const { data: subjectMap } = await supabase
      .from('mastery_scores')
      .select('topic, subject_id')
      .eq('student_id', profile?.id)
      .in('topic', practicedTopics);
    const topicSubjectMap = new Map((subjectMap || []).map(s => [s.topic, s.subject_id]));

    for (const [topic, info] of Object.entries(topicGroups)) {
      const accuracy = info.total > 0 ? (info.correct / info.total) * 100 : 0;
      const subjectId = topicSubjectMap.get(topic);
      if (!subjectId) continue;

      let intervalDays = 1;
      if (accuracy >= 90) intervalDays = 7;
      else if (accuracy >= 70) intervalDays = 4;
      else if (accuracy >= 50) intervalDays = 2;

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + intervalDays);

      await supabase.from('review_schedule').upsert({
        student_id: profile?.id, subject_id: subjectId, topic,
        subtopic: Array.from(info.subtopics).join(', '),
        next_review_date: nextReview.toISOString().split('T')[0],
        interval_days: intervalDays, last_reviewed_at: new Date().toISOString(),
      }, { onConflict: 'student_id, subject_id, topic, subtopic' });
    }
  }

  async function updateStreak() {
    const { data: existing } = await supabase.from('learning_streaks').select('*').eq('student_id', profile?.id).maybeSingle();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (existing) {
      const lastDate = existing.last_activity_date;
      let newStreak = 1;
      if (lastDate === yesterday) newStreak = existing.current_streak + 1;
      else if (lastDate === today) newStreak = existing.current_streak;

      await supabase.from('learning_streaks').update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, existing.longest_streak),
        last_activity_date: today,
      }).eq('id', existing.id);
      setStreak((prev: any) => ({ ...prev, current_streak: newStreak, longest_streak: Math.max(newStreak, existing.longest_streak), last_activity_date: today }));
    } else {
      const { data: newStreak } = await supabase.from('learning_streaks').insert({
        student_id: profile?.id, current_streak: 1, longest_streak: 1, last_activity_date: today,
      }).select().single();
      if (newStreak) setStreak(newStreak);
    }
  }

  async function checkBadges(total: number, correct: number, score: number) {
    const existingTypes = badges.map(b => b.badge_type);
    const toAward: string[] = [];

    if (!existingTypes.includes('first_goal')) toAward.push('first_goal');

    const { data: s } = await supabase.from('learning_streaks').select('current_streak').eq('student_id', profile?.id).maybeSingle();
    const streakCount = s?.current_streak || 0;
    if (streakCount >= 3 && !existingTypes.includes('streak_3')) toAward.push('streak_3');
    if (streakCount >= 7 && !existingTypes.includes('streak_7')) toAward.push('streak_7');

    for (const badge of toAward) {
      await supabase.from('badges').insert({ student_id: profile?.id, badge_type: badge, badge_data: { score, total_questions: total, correct_answers: correct } });
    }
  }

  async function restartPractice() {
    setFinished(false);
    setQuestions([]);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setSessionStats({ correct: 0, total: 0, time: 0 });
    setSession(null);
    setError('');
    startPractice();
  }

  const currentQ = questions[currentIdx];
  const isCorrect = showFeedback && selectedAnswer === currentQ?.correct_answer;

  if (loading) return (
    <DashboardLayout title="Daily Practice" subtitle="Start your daily mastery practice">
      <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout title="Daily Practice" subtitle="Start your daily mastery practice">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
    </DashboardLayout>
  );

  if (finished) return (
    <DashboardLayout title="Practice Complete" subtitle="Great effort!">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="card text-center py-12">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${sessionStats.total > 0 && sessionStats.correct / sessionStats.total >= 0.7 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {sessionStats.total > 0 && sessionStats.correct / sessionStats.total >= 0.7
              ? <Award size={40} className="text-emerald-600" />
              : <Zap size={40} className="text-amber-600" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {sessionStats.total > 0 && sessionStats.correct / sessionStats.total >= 0.7 ? 'Well Done!' : 'Keep Practicing!'}
          </h2>
          <p className="text-slate-500 mb-6">Here's how you performed</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-900">{sessionStats.correct}/{sessionStats.total}</p>
              <p className="text-xs text-slate-500 mt-1">Correct</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-900">{sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}%</p>
              <p className="text-xs text-slate-500 mt-1">Score</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-900">{streak?.current_streak || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Day Streak</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={restartPractice} className="btn-primary flex items-center gap-2"><RotateCcw size={16} /> Practice Again</button>
            <Link href="/student/practice/history" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-2"><BarChart3 size={16} /> History</Link>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Star size={16} className="text-amber-500" /> Badges Earned</h3>
            <div className="flex flex-wrap gap-2">
              {badges.map(b => (
                <span key={b.id} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium">
                  {b.badge_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );

  if (!currentQ) return (
    <DashboardLayout title="Daily Practice" subtitle="Start your daily mastery practice">
      <div className="card text-center py-16">
        <Brain className="mx-auto text-slate-300 mb-4" size={48} />
        <p className="font-medium text-slate-500">No questions available</p>
        <p className="text-sm text-slate-400 mt-1 mb-4">Questions will appear here once added to the bank</p>
        <button onClick={restartPractice} className="btn-primary">Try Again</button>
      </div>
    </DashboardLayout>
  );

  return (
    <>
    <DashboardLayout title="Daily Practice" subtitle={`Question ${currentIdx + 1} of ${questions.length}`}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress Bar */}
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></Link>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-600">Progress</span>
              <span className="text-sm text-slate-500">{Math.round((currentIdx / questions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${(currentIdx / questions.length) * 100}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-slate-500"><Clock size={14} /> {Math.floor((Date.now() - startTime) / 1000)}s</div>
        </div>

        {/* Question Card */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${(currentQ.difficulty_level || 'medium') === 'easy' ? 'bg-green-100 text-green-700' : (currentQ.difficulty_level || 'medium') === 'hard' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
              {currentQ.difficulty_level || 'medium'}
            </span>
            {currentQ.topic && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{currentQ.topic}</span>}
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-6">{currentQ.question}</h2>

          <div className="space-y-3">
            {currentQ.options.map((opt: string, i: number) => {
              let btnClass = 'w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-medium ';
              if (!showFeedback) {
                btnClass += selectedAnswer === i ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 hover:border-slate-300 text-slate-700';
              } else {
                if (i === currentQ.correct_answer) btnClass += 'border-emerald-500 bg-emerald-50 text-emerald-700';
                else if (i === selectedAnswer) btnClass += 'border-red-500 bg-red-50 text-red-700';
                else btnClass += 'border-slate-200 text-slate-400';
              }
              return (
                <button key={i} onClick={() => handleAnswer(i)} disabled={showFeedback} className={btnClass}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0">
                      {showFeedback && i === currentQ.correct_answer ? <CheckCircle size={16} className="text-emerald-600" /> :
                       showFeedback && i === selectedAnswer ? <XCircle size={16} className="text-red-600" /> :
                       String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div className={`mt-6 p-4 rounded-xl ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? <CheckCircle size={20} className="text-emerald-600" /> : <XCircle size={20} className="text-red-600" />}
                <span className={`font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>{isCorrect ? 'Correct!' : 'Incorrect'}</span>
              </div>
              {currentQ.explanation && <p className="text-sm text-slate-600">{currentQ.explanation}</p>}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-slate-500 flex items-center gap-1">
              <Brain size={14} className="text-primary-500" />
              Score: {sessionStats.correct}/{sessionStats.total}
            </div>
            {showFeedback && (
              <button onClick={handleNext} className="btn-primary px-6">
                {currentIdx + 1 >= questions.length ? 'See Results' : 'Next Question'}
              </button>
            )}
          </div>
        </div>

        {/* Streak bar */}
        {streak && (
          <div className="card bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap size={24} />
                <div>
                  <p className="font-bold">{streak.current_streak} Day Streak</p>
                  <p className="text-sm text-white/80">Best: {streak.longest_streak} days</p>
                </div>
              </div>
              {badges.length > 0 && (
                <div className="flex items-center gap-1">
                  {badges.slice(0, 3).map(b => <Star key={b.id} size={20} className="text-yellow-200" />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
    <Calculator />
    </>
  );
}
