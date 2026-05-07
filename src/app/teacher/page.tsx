'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  GraduationCap, Video, ClipboardList, FileText, Award, UserCheck, Activity,
  QrCode, Bell, TrendingUp, ArrowRight, ChevronRight, Clock, Users,
  BookOpen, CheckCircle, AlertCircle, Megaphone
} from 'lucide-react';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ classes: 0, subjects: 0, pendingHomework: 0, pendingQuizzes: 0, sessions: 0, students: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchDashboard();
  }, [profile]);

  async function fetchDashboard() {
    setLoading(true);
    const [
      subjectsRes, classesRes, homeworkRes, quizzesRes, sessionsRes, announcementsRes
    ] = await Promise.all([
      supabase.from('subjects').select('id, name, class_id', { count: 'exact' }).eq('teacher_id', profile?.id),
      supabase.from('classes').select('id, name, level').order('level'),
      supabase.from('homework').select('id, title, due_date, class_id', { count: 'exact' }).eq('teacher_id', profile?.id).eq('is_active', true),
      supabase.from('quizzes').select('id, title, due_date', { count: 'exact' }).eq('teacher_id', profile?.id).eq('is_active', true),
      supabase.from('sessions').select('id, title, created_at, class:classes(name)').eq('teacher_id', profile?.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('announcements').select('*, creator:profiles(first_name, last_name)').in('audience', ['all', 'teachers', 'staff']).order('created_at', { ascending: false }).limit(5),
    ]);

    const myClassIds = subjectsRes.data?.map(s => s.class_id).filter(Boolean) || [];
    setStats({
      classes: myClassIds.length,
      subjects: subjectsRes.count || 0,
      pendingHomework: homeworkRes.count || 0,
      pendingQuizzes: quizzesRes.count || 0,
      sessions: sessionsRes.data?.length || 0,
      students: 0,
    });

    if (sessionsRes.data) setRecentActivity(sessionsRes.data);
    if (announcementsRes.data) setAnnouncements(announcementsRes.data);

    const uniqueClassIds = Array.from(new Set(myClassIds));
    if (uniqueClassIds.length > 0) {
      const { data: classData } = await supabase.from('classes').select('id, name, level').in('id', uniqueClassIds);
      if (classData) setMyClasses(classData);
    }

    setLoading(false);
  }

  const quickActions = [
    { label: 'Take Attendance', href: '/teacher/attendance', icon: <UserCheck size={18} />, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    { label: 'Scan Student ID', href: '/teacher/scan-id', icon: <QrCode size={18} />, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
    { label: 'Record Results', href: '/teacher/results', icon: <Award size={18} />, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
    { label: 'Behavior Report', href: '/teacher/behavior', icon: <Activity size={18} />, color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
  ];

  return (
    <DashboardLayout title="Teacher Dashboard" subtitle={`Bismillah! Welcome back, ${profile?.first_name} ${profile?.last_name}`}>
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'My Subjects', value: stats.subjects, icon: <BookOpen size={24} />, href: '/teacher/classes', bg: 'bg-blue-100', color: 'text-blue-600' },
              { title: 'Classes', value: stats.classes, icon: <GraduationCap size={24} />, href: '/teacher/classes', bg: 'bg-emerald-100', color: 'text-emerald-600' },
              { title: 'Video Lessons', value: stats.sessions, icon: <Video size={24} />, href: '/teacher/sessions', bg: 'bg-purple-100', color: 'text-purple-600' },
              { title: 'Pending Tasks', value: stats.pendingHomework + stats.pendingQuizzes, icon: <ClipboardList size={24} />, href: '/teacher/homework', bg: 'bg-amber-100', color: 'text-amber-600' },
            ].map((card, i) => (
              <Link key={i} href={card.href} className="card hover:shadow-md cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center ${card.color}`}>{card.icon}</div>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-500">{card.title}</h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Clock size={18} className="text-slate-400" />Recent Video Lessons</h2>
              {recentActivity.length === 0 ? (
                <div className="text-center py-12"><Video className="mx-auto text-slate-300 mb-3" size={40} /><p className="text-slate-500">No video lessons yet</p><Link href="/teacher/sessions" className="btn-primary mt-4 inline-block">Create First Lesson</Link></div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map(session => (
                    <div key={session.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Video size={20} className="text-blue-600" /></div>
                      <div className="flex-1 min-w-0"><p className="font-semibold text-slate-900 truncate">{session.title}</p><p className="text-xs text-slate-500">{session.class?.name || 'No class'} • {new Date(session.created_at).toLocaleDateString()}</p></div>
                      <Link href="/teacher/sessions" className="text-blue-600 hover:text-blue-700"><ArrowRight size={16} /></Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-slate-400" />Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action, i) => (
                  <Link key={i} href={action.href} className={`p-4 rounded-xl ${action.color} transition-all`}>
                    <div className="mb-2">{action.icon}</div>
                    <p className="text-sm font-semibold">{action.label}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {myClasses.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><GraduationCap size={18} className="text-slate-400" />My Classes</h2>
                <div className="space-y-2">
                  {myClasses.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><GraduationCap size={16} className="text-emerald-600" /></div>
                        <span className="font-semibold text-slate-900">{cls.name}</span>
                      </div>
                      <span className="text-xs text-slate-500">Level {cls.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
        </>
      )}
    </DashboardLayout>
  );
}
