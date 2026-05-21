'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Brain, Search, Trophy, Award, Zap, Clock, CheckCircle, BarChart3, Users, Filter, Loader2 } from 'lucide-react';

export default function AdminStudentPracticePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'streak' | 'score' | 'sessions'>('streak');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [studentsRes, classesRes] = await Promise.all([
      supabase.from('students').select('*, profile:profiles!profile_id(id, first_name, last_name, email), class:classes!class_id(id, name)'),
      supabase.from('classes').select('*').order('name'),
    ]);
    if (classesRes.data) setClasses(classesRes.data);
    if (!studentsRes.data) { setLoading(false); return; }

    const today = new Date().toISOString().split('T')[0];
    const enriched = await Promise.all(studentsRes.data.map(async (s) => {
      const [sessionsRes, streaksRes, goalsRes, badgesRes] = await Promise.all([
        supabase.from('practice_sessions').select('score, answered_questions, correct_answers, created_at').eq('student_id', s.profile_id).order('created_at', { ascending: false }),
        supabase.from('learning_streaks').select('*').eq('student_id', s.profile_id).maybeSingle(),
        supabase.from('daily_goals').select('*').eq('student_id', s.profile_id).eq('date', today).maybeSingle(),
        supabase.from('badges').select('*').eq('student_id', s.profile_id),
      ]);

      const sessions = sessionsRes.data || [];
      const totalSessions = sessions.length;
      const totalAnswered = sessions.reduce((sum: number, sess: any) => sum + (sess.answered_questions || 0), 0);
      const totalCorrect = sessions.reduce((sum: number, sess: any) => sum + (sess.correct_answers || 0), 0);
      const avgScore = totalSessions > 0 ? Math.round(sessions.reduce((sum: number, sess: any) => sum + (sess.score || 0), 0) / totalSessions) : 0;
      const streak = streaksRes.data;
      const todayGoal = goalsRes.data;
      const badges = badgesRes.data || [];

      const lastPractice = sessions.length > 0 ? sessions[0].created_at : null;
      const practicedToday = sessions.some((sess: any) => sess.created_at?.startsWith(today));

      return {
        id: s.id,
        profile_id: s.profile_id,
        name: `${s.profile?.first_name || ''} ${s.profile?.last_name || ''}`,
        email: s.profile?.email || '',
        admission_number: s.admission_number,
        class_name: s.class?.name || 'N/A',
        class_id: s.class_id,
        totalSessions,
        totalAnswered,
        totalCorrect,
        avgScore,
        currentStreak: streak?.current_streak || 0,
        longestStreak: streak?.longest_streak || 0,
        lastPractice,
        practicedToday,
        todayGoal: todayGoal?.status || 'not_started',
        goalCompleted: todayGoal?.status === 'completed',
        badges: badges.length,
      };
    }));
    setStudents(enriched);
    setLoading(false);
  }

  const filtered = students
    .filter(s => {
      if (classFilter && s.class_id !== classFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.admission_number?.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'streak') return b.currentStreak - a.currentStreak;
      if (sortBy === 'score') return b.avgScore - a.avgScore;
      return b.totalSessions - a.totalSessions;
    });

  const totalPracticedToday = filtered.filter(s => s.practicedToday).length;
  const avgScoreAll = filtered.length > 0 ? Math.round(filtered.reduce((sum, s) => sum + s.avgScore, 0) / filtered.length) : 0;
  const totalAllSessions = filtered.reduce((sum, s) => sum + s.totalSessions, 0);
  const streak3Plus = filtered.filter(s => s.currentStreak >= 3).length;

  return (
    <DashboardLayout title="Student Practice" subtitle="Track student daily practice, streaks, and performance">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Student Practice</h1>
            <p className="text-slate-500">Monitor student practice activity, streaks, and performance</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card">
            <div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Active Today</span><Users size={16} className="text-blue-600" /></div>
            <p className="text-2xl font-bold text-slate-900">{totalPracticedToday}<span className="text-sm text-slate-400 font-normal"> / {filtered.length}</span></p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Avg Score</span><BarChart3 size={16} className="text-primary-600" /></div>
            <p className="text-2xl font-bold text-slate-900">{avgScoreAll}%</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Total Sessions</span><Brain size={16} className="text-purple-600" /></div>
            <p className="text-2xl font-bold text-slate-900">{totalAllSessions}</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Streak 3+ Days</span><Zap size={16} className="text-amber-600" /></div>
            <p className="text-2xl font-bold text-amber-600">{streak3Plus}</p>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
            </div>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="input sm:w-48">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {(['streak', 'score', 'sessions'] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)} className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize ${sortBy === s ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'}`}>{s}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500"><Users size={48} className="mx-auto mb-4 opacity-50" /><p>No students found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Student</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Class</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">Streak</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">Sessions</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">Answered</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">Avg Score</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">Today</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600">Badges</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-600">Last Practice</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-700">
                            {s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{s.name}</p>
                            <p className="text-xs text-slate-400">{s.admission_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{s.class_name}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.currentStreak >= 7 ? 'bg-amber-100 text-amber-700' : s.currentStreak >= 3 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          <Zap size={12} /> {s.currentStreak}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-700">{s.totalSessions}</td>
                      <td className="py-3 px-4 text-center text-slate-700">{s.totalAnswered}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${s.avgScore >= 70 ? 'text-green-600' : s.avgScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {s.avgScore}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {s.practicedToday ? (
                          <CheckCircle size={16} className="text-green-500 mx-auto" />
                        ) : (
                          <Clock size={16} className="text-slate-300 mx-auto" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {s.badges > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <Award size={12} /> {s.badges}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-slate-400">
                        {s.lastPractice ? new Date(s.lastPractice).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
