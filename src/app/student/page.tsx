'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, FileText, Award, UserCheck, Printer, Bell, TrendingUp, ArrowRight, ChevronRight, Calendar, Clock, BookOpen, CheckCircle, AlertCircle, Users, GraduationCap } from 'lucide-react';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ sessions: 0, homework: 0, avgScore: 0, attendance: 0, pendingHomework: 0, resultsCount: 0 });
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [recentHomework, setRecentHomework] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchDashboard();
  }, [profile]);

  async function fetchDashboard() {
    setLoading(true);

    const [studentRes, sessionsRes, homeworkRes, resultsRes, attendanceRes, announcementsRes] = await Promise.all([
      supabase.from('students').select('*, class:classes(name)').eq('profile_id', profile?.id).single(),
      supabase.from('sessions').select('id, title, description, created_at, class:classes(name), teacher:profiles(first_name, last_name)').eq('class_id', null).order('created_at', { ascending: false }).limit(5),
      supabase.from('homework').select('id, title, due_date, subject:subjects(name), class:classes(name)').eq('is_active', true).order('due_date', { ascending: true }).limit(5),
      supabase.from('results').select('score, subject:subjects(name)').eq('student_id', profile?.id),
      supabase.from('attendance').select('status').eq('student_id', profile?.id),
      supabase.from('announcements').select('*, creator:profiles(first_name, last_name)').in('audience', ['all', 'students']).order('created_at', { ascending: false }).limit(5),
    ]);

    if (studentRes.data) setStudentInfo(studentRes.data);

    if (sessionsRes.data) setRecentLessons(sessionsRes.data);
    if (homeworkRes.data) setRecentHomework(homeworkRes.data);

    const pendingHw = homeworkRes.data?.length || 0;
    const avg = resultsRes.data?.length
      ? Math.round(resultsRes.data.reduce((sum: number, r: any) => sum + r.score, 0) / resultsRes.data.length)
      : 0;

    const presentCount = attendanceRes.data?.filter(a => a.status === 'present').length || 0;
    const totalAttendance = attendanceRes.data?.length || 1;

    setStats({
      sessions: sessionsRes.data?.length || 0,
      homework: homeworkRes.data?.length || 0,
      pendingHomework: pendingHw,
      avgScore: avg,
      attendance: Math.round((presentCount / totalAttendance) * 100),
      resultsCount: resultsRes.data?.length || 0,
    });

    if (announcementsRes.data) setAnnouncements(announcementsRes.data);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Dashboard</h1>
          <p className="text-slate-500 mt-1">Bismillah! Welcome back, {profile?.first_name} {profile?.last_name}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200">
          <Calendar size={16} />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
      ) : (
        <>
          {studentInfo?.class && (
            <div className="card bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center font-bold text-xl">{profile?.first_name?.[0]}{profile?.last_name?.[0]}</div>
                <div>
                  <p className="text-blue-100 text-sm">Class</p>
                  <p className="text-xl font-bold">{studentInfo.class.name}</p>
                  {studentInfo.admission_number && <p className="text-blue-200 text-sm mt-1">ID: {studentInfo.admission_number}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Video Lessons', value: stats.sessions, icon: <Video size={24} />, href: '/student/sessions', bg: 'bg-blue-100', color: 'text-blue-600' },
              { title: 'Homework', value: stats.homework, icon: <FileText size={24} />, href: '/student/homework', bg: 'bg-emerald-100', color: 'text-emerald-600', badge: stats.pendingHomework > 0 ? `${stats.pendingHomework} pending` : '' },
              { title: 'Average Score', value: `${stats.avgScore}%`, icon: <Award size={24} />, href: '/student/results', bg: 'bg-purple-100', color: 'text-purple-600' },
              { title: 'Attendance', value: `${stats.attendance}%`, icon: <UserCheck size={24} />, href: '/student/attendance', bg: 'bg-amber-100', color: 'text-amber-600' },
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><BookOpen size={18} className="text-slate-400" />Recent Lessons</h2>
                <Link href="/student/lessons" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">View all <ArrowRight size={14} /></Link>
              </div>
              {recentLessons.length === 0 ? (
                <div className="text-center py-12"><Video className="mx-auto text-slate-300 mb-3" size={40} /><p className="text-slate-500">No lessons available yet</p></div>
              ) : (
                <div className="space-y-3">
                  {recentLessons.map(lesson => (
                    <div key={lesson.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Video size={20} className="text-blue-600" /></div>
                      <div className="flex-1 min-w-0"><p className="font-semibold text-slate-900 truncate">{lesson.title}</p><p className="text-xs text-slate-500">{lesson.teacher ? `${lesson.teacher.first_name} ${lesson.teacher.last_name}` : ''} • {new Date(lesson.created_at).toLocaleDateString()}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileText size={18} className="text-slate-400" />Homework</h2>
                <Link href="/student/homework" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">View all <ArrowRight size={14} /></Link>
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
                  { label: 'Results Recorded', value: stats.resultsCount.toString(), color: 'text-blue-600', bg: 'bg-blue-500' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-600">{item.label}</span><span className={`font-bold ${item.color}`}>{item.value}</span></div>
                    <div className="w-full bg-slate-200 rounded-full h-2"><div className={`${item.bg} h-2 rounded-full transition-all`} style={{ width: item.value }}></div></div>
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
                <div className="text-center py-8 text-slate-400"><Megaphone size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No new announcements</p></div>
              ) : (
                <div className="space-y-3">
                  {announcements.map(a => (
                    <div key={a.id} className={`p-3 rounded-lg border-l-4 ${a.priority === 'urgent' ? 'bg-red-50 border-red-500' : a.priority === 'high' ? 'bg-amber-50 border-amber-500' : 'bg-blue-50 border-blue-500'}`}>
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
                { label: 'Video Lessons', href: '/student/sessions', icon: <Video size={20} />, bg: 'bg-blue-50 text-blue-600' },
                { label: 'Homework', href: '/student/homework', icon: <FileText size={20} />, bg: 'bg-emerald-50 text-emerald-600' },
                { label: 'Results', href: '/student/results', icon: <Award size={20} />, bg: 'bg-purple-50 text-purple-600' },
                { label: 'My ID Card', href: '/student/id-card', icon: <Printer size={20} />, bg: 'bg-amber-50 text-amber-600' },
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
    </div>
  );
}

function Megaphone(props: any) { return <Bell {...props} />; }
