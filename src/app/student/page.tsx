'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Video, FileText, Award, UserCheck, Printer, Bell, TrendingUp, ArrowRight, ChevronRight, Clock, BookOpen, CheckCircle, AlertCircle, Users, GraduationCap, Brain, Zap, Star } from 'lucide-react';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ sessions: 0, homework: 0, avgScore: 0, attendance: 0, pendingHomework: 0, resultsCount: 0 });
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [recentHomework, setRecentHomework] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [thisWeekTopics, setThisWeekTopics] = useState<any[]>([]);
  const [currentWeekInfo, setCurrentWeekInfo] = useState<{ term: string; week: number } | null>(null);
  const [todayGoal, setTodayGoal] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [dueReviewsCount, setDueReviewsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

useEffect(() => {
     if (!profile) return;
     if (profile.role !== 'student') { router.push('/login'); return; }
     fetchDashboard();
   }, [profile]);

  async function fetchDashboard() {
    setLoading(true);
    try {
      let sessionsCount = 0;
      const [studentRes, homeworkRes, resultsRes, attendanceRes, announcementsRes] = await Promise.all([
        supabase.from('students').select('*, class:classes!class_id(name)').eq('profile_id', profile?.id).maybeSingle(),
        supabase.from('homework').select('id, title, due_date, subject:subjects!subject_id(name), class:classes!class_id(name)').eq('is_active', true).order('due_date', { ascending: true }).limit(5),
        supabase.from('results').select('score, subject:subjects!subject_id(name)').eq('student_id', profile?.id),
        supabase.from('attendance').select('status').eq('student_id', profile?.id),
        supabase.from('announcements').select('*, creator:profiles!created_by(first_name, last_name)').in('audience', ['all', 'students']).order('created_at', { ascending: false }).limit(5),
      ]);
      if (studentRes.error) throw new Error(studentRes.error.message);

      if (studentRes.data) {
        setStudentInfo(studentRes.data);
        const studentClassId = studentRes.data.class_id;

        // Fetch current term and this week's scheme of work
        const { data: currentTerm } = await supabase
          .from('terms')
          .select('*')
          .eq('is_current', true)
          .maybeSingle();
        if (currentTerm) {
          const termStart = new Date(currentTerm.start_date);
          const today = new Date();
          const diffDays = Math.floor((today.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24));
          const currentWeek = Math.max(Math.min(Math.ceil((diffDays + 1) / 7), 13), 1);
          setCurrentWeekInfo({ term: currentTerm.name, week: currentWeek });

          if (studentClassId) {
            const { data: sowData } = await supabase
              .from('scheme_of_work')
              .select('*, subject:subjects!subject_id(name, code)')
              .eq('term_id', currentTerm.id)
              .eq('class_id', studentClassId)
              .eq('week_number', currentWeek);
            if (sowData) setThisWeekTopics(sowData);
          }
        }
        let sessionsQuery = supabase
          .from('sessions')
          .select('id, title, description, created_at, class:classes!class_id(name), teacher:profiles!teacher_id(first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(5);
        if (studentClassId) {
          sessionsQuery = sessionsQuery.or(`class_id.eq.${studentClassId},class_id.is.null`);
        }
        const { data: sessionsData } = await sessionsQuery;
        if (sessionsData) {
          setRecentLessons(sessionsData);
          sessionsCount = sessionsData.length;
        }
      }
    if (homeworkRes.data) setRecentHomework(homeworkRes.data);

    const pendingHw = homeworkRes.data?.length || 0;
    const avg = resultsRes.data?.length
      ? Math.round(resultsRes.data.reduce((sum: number, r: any) => sum + r.score, 0) / resultsRes.data.length)
      : 0;

    const presentCount = attendanceRes.data?.filter(a => a.status === 'present').length || 0;
    const totalAttendance = attendanceRes.data?.length || 1;

    setStats({
      sessions: sessionsCount,
      homework: homeworkRes.data?.length || 0,
      pendingHomework: pendingHw,
      avgScore: avg,
      attendance: Math.round((presentCount / totalAttendance) * 100),
      resultsCount: resultsRes.data?.length || 0,
    });

      if (announcementsRes.data) setAnnouncements(announcementsRes.data);

      // Practice data
      const today = new Date().toISOString().split('T')[0];
      const [goalRes, streakRes, badgesRes, reviewRes] = await Promise.all([
        supabase.from('daily_goals').select('*').eq('student_id', profile?.id).eq('date', today).maybeSingle(),
        supabase.from('learning_streaks').select('*').eq('student_id', profile?.id).maybeSingle(),
        supabase.from('badges').select('*').eq('student_id', profile?.id),
        supabase.from('review_schedule').select('id', { count: 'exact', head: true }).eq('student_id', profile?.id).lte('next_review_date', today),
      ]);
      if (goalRes.data) setTodayGoal(goalRes.data);
      if (streakRes.data) setStreak(streakRes.data);
      if (badgesRes.data) setBadges(badgesRes.data);
      if (reviewRes.count) setDueReviewsCount(reviewRes.count);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <DashboardLayout title="Student Dashboard" subtitle={`Bismillah! Welcome back, ${profile?.first_name} ${profile?.last_name}`}>
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
      ) : (
        <>
          {studentInfo?.class && (
            <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center font-bold text-xl">{profile?.first_name?.[0]}{profile?.last_name?.[0]}</div>
                <div>
                  <p className="text-primary-100 text-sm">Class</p>
                  <p className="text-xl font-bold">{studentInfo.class.name}</p>
                  {studentInfo.admission_number && <p className="text-primary-200 text-sm mt-1">ID: {studentInfo.admission_number}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Today's Goal */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Link href="/student/practice" className="card bg-gradient-to-br from-primary-600 to-primary-700 text-white hover:shadow-lg transition-shadow lg:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain size={20} />
                  <span className="font-semibold">Today's Goal</span>
                </div>
                <ChevronRight size={16} className="text-white/60" />
              </div>
              {todayGoal ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{todayGoal.completed_questions || 0}</span>
                    <span className="text-white/70">/ {todayGoal.target_questions}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5 mt-2">
                    <div className="bg-white h-1.5 rounded-full" style={{ width: `${Math.min((todayGoal.completed_questions || 0) / todayGoal.target_questions * 100, 100)}%` }} />
                  </div>
                  <p className="text-xs text-white/70 mt-2">
                    {todayGoal.status === 'completed' ? 'Goal completed!' : todayGoal.status === 'missed' ? 'Missed yesterday, try again!' : 'Complete your daily goal'}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2"><span className="text-3xl font-bold">0</span><span className="text-white/70">/ 10</span></div>
                  <div className="w-full bg-white/20 rounded-full h-1.5 mt-2"><div className="bg-white h-1.5 rounded-full" style={{ width: '0%' }} /></div>
                  <p className="text-xs text-white/70 mt-2">Start your first practice session</p>
                </>
              )}
              {dueReviewsCount > 0 && (
                <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
                  <span className="text-xs text-white/80">{dueReviewsCount} topic{dueReviewsCount > 1 ? 's' : ''} due for review</span>
                </div>
              )}
            </Link>

            {[
              { title: 'Video Lessons', value: stats.sessions, icon: <Video size={24} />, href: '/student/sessions', bg: 'bg-primary-100', color: 'text-primary-600' },
              { title: 'Homework', value: stats.homework, icon: <FileText size={24} />, href: '/student/homework', bg: 'bg-emerald-100', color: 'text-emerald-600', badge: stats.pendingHomework > 0 ? `${stats.pendingHomework} pending` : '' },
              { title: 'Average Score', value: `${stats.avgScore}%`, icon: <Award size={24} />, href: '/student/results', bg: 'bg-purple-100', color: 'text-purple-600' },
            ].map((card, i) => (
              <Link key={i} href={card.href} className="card hover:shadow-md cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center ${card.color}`}>{card.icon}</div>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-500">{card.title}</h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                {card.badge && <p className="text-xs text-amber-600 font-medium mt-1">{card.badge}</p>}
              </Link>
            ))}
          </div>

          {/* This Week's Topics */}
          {thisWeekTopics.length > 0 && (
            <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen size={20} />This Week's Topics</h2>
                {currentWeekInfo && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    {currentWeekInfo.term} - Week {currentWeekInfo.week}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {thisWeekTopics.map(topic => (
                  <div key={topic.id} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen size={16} className="text-primary-200" />
                      <span className="text-xs font-medium text-primary-200">{topic.subject?.name || 'Subject'}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-1">{topic.topic}</h3>
                    {topic.subtopics?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {topic.subtopics.slice(0, 4).map((st: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-white/15 rounded text-xs text-primary-100">{st}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><BookOpen size={18} className="text-slate-400" />Recent Lessons</h2>
                <Link href="/student/lessons" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">View all <ArrowRight size={14} /></Link>
              </div>
              {recentLessons.length === 0 ? (
                <div className="text-center py-12"><Video className="mx-auto text-slate-300 mb-3" size={40} /><p className="text-slate-500">No lessons available yet</p></div>
              ) : (
                <div className="space-y-3">
                  {recentLessons.map(lesson => (
                    <div key={lesson.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"><Video size={20} className="text-primary-600" /></div>
                      <div className="flex-1 min-w-0"><p className="font-semibold text-slate-900 truncate">{lesson.title}</p><p className="text-xs text-slate-500">{lesson.teacher ? `${lesson.teacher.first_name} ${lesson.teacher.last_name}` : ''} • {new Date(lesson.created_at).toLocaleDateString()}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileText size={18} className="text-slate-400" />Homework</h2>
                <Link href="/student/homework" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">View all <ArrowRight size={14} /></Link>
              </div>
              {recentHomework.length === 0 ? (
                <div className="text-center py-12"><FileText className="mx-auto text-slate-300 mb-3" size={40} /><p className="text-slate-500">No homework assigned</p></div>
              ) : (
                <div className="space-y-3">
                  {recentHomework.map(hw => (
                    <div key={hw.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hw.due_date && new Date(hw.due_date) < new Date() ? 'bg-red-100' : 'bg-emerald-100'}`}>
                        <FileText size={20} className={hw.due_date && new Date(hw.due_date) < new Date() ? 'text-red-600' : 'text-emerald-600'} />
                      </div>
                      <div className="flex-1 min-w-0"><p className="font-semibold text-slate-900 truncate">{hw.title}</p><p className="text-xs text-slate-500">{hw.subject?.name || 'No subject'} • Due: {hw.due_date ? new Date(hw.due_date).toLocaleDateString() : 'No date'}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-slate-400" />My Progress</h2>
              <div className="space-y-4">
                {[
                  { label: 'Average Score', value: `${stats.avgScore}%`, color: stats.avgScore >= 70 ? 'text-green-600' : stats.avgScore >= 50 ? 'text-amber-600' : 'text-red-600', bg: stats.avgScore >= 70 ? 'bg-green-500' : stats.avgScore >= 50 ? 'bg-amber-500' : 'bg-red-500' },
                  { label: 'Attendance Rate', value: `${stats.attendance}%`, color: stats.attendance >= 80 ? 'text-green-600' : 'text-amber-600', bg: stats.attendance >= 80 ? 'bg-green-500' : 'bg-amber-500' },
                  { label: 'Results Recorded', value: stats.resultsCount.toString(), color: 'text-primary-600', bg: 'bg-primary-500' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-600">{item.label}</span><span className={`font-bold ${item.color}`}>{item.value}</span></div>
                    <div className="w-full bg-slate-200 rounded-full h-2"><div className={`${item.bg} h-2 rounded-full transition-all`} style={{ width: item.value.includes('%') ? item.value : `${item.value}%` }}></div></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Bell size={18} className="text-slate-400" />Announcements</h2>
                {announcements.length > 0 && <span className="badge badge-red">{announcements.length}</span>}
              </div>
              {announcements.length === 0 ? (
                <div className="text-center py-8 text-slate-400"><Bell size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No new announcements</p></div>
              ) : (
                <div className="space-y-3">
                  {announcements.map(a => (
                    <div key={a.id} className={`p-3 rounded-lg border-l-4 ${a.priority === 'urgent' ? 'bg-red-50 border-red-500' : a.priority === 'high' ? 'bg-amber-50 border-amber-500' : 'bg-primary-50 border-primary-500'}`}>
                      <p className="font-semibold text-sm text-slate-900">{a.title}</p>
                      <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{a.content}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Printer size={18} className="text-slate-400" />Quick Links</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Daily Practice', href: '/student/practice', icon: <Brain size={20} />, bg: 'bg-indigo-50 text-indigo-600' },
                { label: 'Video Lessons', href: '/student/sessions', icon: <Video size={20} />, bg: 'bg-primary-50 text-primary-600' },
                { label: 'Homework', href: '/student/homework', icon: <FileText size={20} />, bg: 'bg-emerald-50 text-emerald-600' },
                { label: 'Attendance', href: '/student/attendance', icon: <UserCheck size={20} />, bg: 'bg-amber-50 text-amber-600' },
                { label: 'Results', href: '/student/results', icon: <Award size={20} />, bg: 'bg-purple-50 text-purple-600' },
                { label: 'History', href: '/student/practice/history', icon: <Brain size={20} />, bg: 'bg-pink-50 text-pink-600' },
              ].map((link, i) => (
                <Link key={i} href={link.href} className={`p-4 rounded-xl ${link.bg} hover:opacity-80 transition-all text-center`}>
                  <div className="mb-2 flex justify-center">{link.icon}</div>
                  <p className="text-sm font-semibold">{link.label}</p>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
</DashboardLayout>
   );
  }
