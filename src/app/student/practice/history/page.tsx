'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Brain, Clock, CheckCircle, XCircle, BarChart3, ArrowLeft, Star, Zap, Trophy, Calendar, TrendingUp } from 'lucide-react';

export default function PracticeHistoryPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [streak, setStreak] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSessions: 0, totalQuestions: 0, avgScore: 0, completionRate: 0 });

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [sessionsRes, goalsRes, streakRes, badgesRes] = await Promise.all([
      supabase.from('practice_sessions').select('*').eq('student_id', profile?.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('daily_goals').select('*').eq('student_id', profile?.id).order('date', { ascending: false }).limit(30),
      supabase.from('learning_streaks').select('*').eq('student_id', profile?.id).maybeSingle(),
      supabase.from('badges').select('*').eq('student_id', profile?.id).order('awarded_at', { ascending: false }),
    ]);

    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (goalsRes.data) setGoals(goalsRes.data);
    if (streakRes.data) setStreak(streakRes.data);
    if (badgesRes.data) setBadges(badgesRes.data);

    if (sessionsRes.data) {
      const completed = sessionsRes.data.filter(s => s.status === 'completed');
      const totalQ = completed.reduce((sum, s) => sum + (s.answered_questions || 0), 0);
      const scores = completed.filter(s => s.score != null);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length) : 0;
      setStats({
        totalSessions: sessionsRes.data.length,
        totalQuestions: totalQ,
        avgScore,
        completionRate: sessionsRes.data.length > 0
          ? Math.round((completed.length / sessionsRes.data.length) * 100) : 0,
      });
    }
    setLoading(false);
  }

  function goalStatusIcon(status: string) {
    switch (status) {
      case 'completed': return <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 dark:text-emerald-400" />;
      case 'missed': return <XCircle size={16} className="text-red-500 dark:text-red-400 dark:text-red-400" />;
      default: return <Clock size={16} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />;
    }
  }

  return (
    <DashboardLayout title="Practice History" subtitle="Track your daily practice journey">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student/practice" className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Practice History</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Track your daily practice journey</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Sessions', value: stats.totalSessions, icon: <Brain size={24} />, bg: 'bg-primary-100 dark:bg-primary-900/30 dark:bg-primary-900/30', color: 'text-primary-600 dark:text-primary-400 dark:text-primary-400' },
                { label: 'Questions Done', value: stats.totalQuestions, icon: <TrendingUp size={24} />, bg: 'bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400 dark:text-emerald-400' },
                { label: 'Avg Score', value: `${stats.avgScore}%`, icon: <BarChart3 size={24} />, bg: 'bg-purple-100 dark:bg-purple-900/30 dark:bg-purple-900/30', color: 'text-purple-600 dark:text-purple-400 dark:text-purple-400' },
                { label: 'Day Streak', value: streak?.current_streak || 0, icon: <Zap size={24} />, bg: 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400 dark:text-amber-400' },
              ].map((card, i) => (
                <div key={i} className="card">
                  <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center ${card.color} mb-3`}>{card.icon}</div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">{card.value}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Sessions */}
              <div className="lg:col-span-2 card">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><Brain size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" /> Recent Sessions</h2>
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 dark:text-slate-500 dark:text-slate-500">
                    <Brain size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No practice sessions yet</p>
                    <Link href="/student/practice" className="text-sm text-primary-600 dark:text-primary-400 dark:text-primary-400 font-medium mt-2 inline-block">Start practicing</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.slice(0, 10).map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.status === 'completed' ? (s.score && s.score >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30') : 'bg-slate-200'}`}>
                            {s.status === 'completed' ? <CheckCircle size={16} className={s.score && s.score >= 70 ? 'text-emerald-600 dark:text-emerald-400 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400 dark:text-amber-400'} /> : <Clock size={16} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white dark:text-white capitalize">{s.goal_type.replace(/_/g, ' ')} Practice</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{new Date(s.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {s.score != null && <p className={`text-sm font-bold ${s.score >= 70 ? 'text-emerald-600 dark:text-emerald-400 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400 dark:text-amber-400'}`}>{s.score}%</p>}
                          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{s.correct_answers}/{s.answered_questions} correct</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Badges & Streaks */}
              <div className="space-y-6">
                {/* Badges */}
                <div className="card">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><Star size={18} className="text-amber-500 dark:text-amber-400 dark:text-amber-400" /> Badges</h2>
                  {badges.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 text-center py-4">Complete goals to earn badges</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {badges.map(b => (
                        <div key={b.id} className="text-center p-2">
                          <div className="w-12 h-12 mx-auto bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-1">
                            <Trophy size={20} className="text-amber-600 dark:text-amber-400 dark:text-amber-400" />
                          </div>
                          <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 dark:text-slate-400">{b.badge_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Goals */}
                <div className="card">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><Calendar size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" /> Daily Goals</h2>
                  {goals.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 text-center py-4">No daily goals yet</p>
                  ) : (
                    <div className="space-y-2">
                      {goals.slice(0, 7).map(g => (
                        <div key={g.id} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2">
                            {goalStatusIcon(g.status)}
                            <span className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300">{new Date(g.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</span>
                          </div>
                          <span className={`text-xs font-medium ${g.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400 dark:text-emerald-400' : g.status === 'missed' ? 'text-red-500 dark:text-red-400 dark:text-red-400' : 'text-slate-400 dark:text-slate-500 dark:text-slate-500'}`}>
                            {g.completed_questions}/{g.target_questions}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
