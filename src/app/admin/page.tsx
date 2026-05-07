'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Users, GraduationCap, UserCheck, BarChart3, TrendingUp, Calendar, ArrowRight,
  BookOpen, Award, Activity, DollarSign, QrCode, Megaphone, Settings, FileText,
  AlertTriangle, Clock, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

interface DashboardStats {
  students: number;
  teachers: number;
  parents: number;
  staff: number;
  attendanceRate: number;
  avgScore: number;
  totalClasses: number;
  totalSubjects: number;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    students: 0, teachers: 0, parents: 0, staff: 0,
    attendanceRate: 0, avgScore: 0, totalClasses: 0, totalSubjects: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchDashboard();
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, [profile]);

  async function fetchDashboard() {
    setLoading(true);

    const [
      studentsRes, teachersRes, parentsRes, staffRes,
      classesRes, subjectsRes, attendanceRes, resultsRes,
      announcementsRes, recentSessionsRes, recentResultsRes
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'accountant'),
      supabase.from('classes').select('id', { count: 'exact', head: true }),
      supabase.from('subjects').select('id', { count: 'exact', head: true }),
      supabase.from('attendance').select('status, date').order('date', { ascending: false }).limit(30),
      supabase.from('results').select('score').limit(100),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('sessions').select('*, teacher:profiles(first_name, last_name), subject:subjects(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('results').select('*, student:profiles(first_name, last_name), subject:subjects(name)').order('created_at', { ascending: false }).limit(5),
    ]);

    const presentCount = attendanceRes.data?.filter((a: { status: string }) => a.status === 'present').length || 0;
    const totalAttendance = attendanceRes.data?.length || 0;
    const avgScore = resultsRes.data?.length
      ? Math.round(resultsRes.data.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / resultsRes.data.length)
      : 0;

    setStats({
      students: studentsRes.count || 0,
      teachers: teachersRes.count || 0,
      parents: parentsRes.count || 0,
      staff: staffRes.count || 0,
      attendanceRate: totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0,
      avgScore,
      totalClasses: classesRes.count || 0,
      totalSubjects: subjectsRes.count || 0,
    });

    if (attendanceRes.data?.length) {
      const grouped: Record<string, { present: number; total: number }> = {};
      attendanceRes.data.forEach((a: { date: string; status: string }) => {
        if (!grouped[a.date]) grouped[a.date] = { present: 0, total: 0 };
        grouped[a.date].total++;
        if (a.status === 'present') grouped[a.date].present++;
      });
      const trendData = Object.entries(grouped).slice(0, 14).map(([date, d]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        attendance: Math.round((d.present / d.total) * 100),
      })).reverse();
      setAttendanceTrend(trendData);
    }

    const activities: any[] = [];
    if (recentSessionsRes.data?.length) {
      recentSessionsRes.data.forEach((s: any) => {
        activities.push({
          type: 'video',
          message: `New video lesson "${s.title}" added by ${s.teacher?.first_name || 'Unknown'}`,
          time: new Date(s.created_at).toLocaleDateString(),
          icon: <BookOpen size={16} />,
        });
      });
    }
    if (recentResultsRes.data?.length) {
      recentResultsRes.data.forEach((r: any) => {
        activities.push({
          type: 'result',
          message: `${r.student?.first_name || 'Student'} scored ${r.score}% in ${r.subject?.name || 'subject'}`,
          time: new Date(r.created_at).toLocaleDateString(),
          icon: <Award size={16} />,
        });
      });
    }
    if (activities.length === 0) {
      activities.push({
        type: 'info',
        message: 'No recent activity yet. Start by adding classes and subjects.',
        time: '',
        icon: <Clock size={16} />,
      });
    }
    setRecentActivity(activities.slice(0, 5));

    if (announcementsRes.data?.length) {
      setAnnouncements(announcementsRes.data);
    }

    if (resultsRes.data?.length) {
      const lowScores = resultsRes.data.filter((r: { score: number }) => r.score < 50);
      const uniqueStudents = new Set<string>();
      if (lowScores.length > 0) {
        const { data: studentData } = await supabase
          .from('results')
          .select('student_id, score, student:profiles(first_name, last_name)')
          .lt('score', 50)
          .limit(5);
        if (studentData) {
          setAtRiskStudents(studentData);
        }
      }
    }

    setLoading(false);
  }

  const statsCards = [
    { title: 'Total Students', value: stats.students, icon: <GraduationCap size={24} />, href: '/admin/users?role=student', bg: 'bg-blue-50', iconBg: 'bg-blue-600', text: 'text-blue-600' },
    { title: 'Teachers', value: stats.teachers, icon: <Users size={24} />, href: '/admin/users?role=teacher', bg: 'bg-emerald-50', iconBg: 'bg-emerald-600', text: 'text-emerald-600' },
    { title: 'Parents', value: stats.parents, icon: <UserCheck size={24} />, href: '/admin/users?role=parent', bg: 'bg-purple-50', iconBg: 'bg-purple-600', text: 'text-purple-600' },
    { title: 'Attendance Rate', value: `${stats.attendanceRate}%`, icon: <TrendingUp size={24} />, href: '/admin/attendance', bg: 'bg-amber-50', iconBg: 'bg-amber-600', text: 'text-amber-600' },
    { title: 'Avg Score', value: `${stats.avgScore}%`, icon: <BarChart3 size={24} />, href: '/admin/analytics', bg: 'bg-rose-50', iconBg: 'bg-rose-600', text: 'text-rose-600' },
    { title: 'Classes', value: stats.totalClasses, icon: <FileText size={24} />, href: '/admin/classes', bg: 'bg-cyan-50', iconBg: 'bg-cyan-600', text: 'text-cyan-600' },
    { title: 'Subjects', value: stats.totalSubjects, icon: <BookOpen size={24} />, href: '/admin/subjects', bg: 'bg-indigo-50', iconBg: 'bg-indigo-600', text: 'text-indigo-600' },
    { title: 'At Risk', value: atRiskStudents.length, icon: <AlertTriangle size={24} />, href: '/admin/analytics', bg: 'bg-red-50', iconBg: 'bg-red-600', text: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, {profile?.first_name} {profile?.last_name}!</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200">
          <Calendar size={16} />
          <span>{currentDate}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, index) => (
          <Link key={index} href={card.href} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all hover:border-slate-300">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                <span className="text-white">{card.icon}</span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-500">{card.title}</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Attendance Trend</h2>
            <Link href="/admin/attendance" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {attendanceTrend.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <div className="text-center">
                <TrendingUp size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No attendance data yet</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Manage Users', href: '/admin/users', icon: <Users size={18} />, color: 'text-blue-600 bg-blue-50' },
              { label: 'Manage Classes', href: '/admin/classes', icon: <GraduationCap size={18} />, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Announcements', href: '/admin/announcements', icon: <Megaphone size={18} />, color: 'text-purple-600 bg-purple-50' },
              { label: 'ID Cards', href: '/admin/id-cards', icon: <QrCode size={18} />, color: 'text-amber-600 bg-amber-50' },
              { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 size={18} />, color: 'text-rose-600 bg-rose-50' },
              { label: 'Settings', href: '/admin/settings', icon: <Settings size={18} />, color: 'text-slate-600 bg-slate-50' },
            ].map((action, index) => (
              <Link key={index} href={action.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${action.color}`}>
                  {action.icon}
                </div>
                <span className="font-medium text-slate-700 text-sm">{action.label}</span>
                <ChevronRight size={14} className="ml-auto text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Activity & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Clock size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity yet</p>
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{activity.message}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Announcements */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Announcements</h2>
            <Link href="/admin/announcements" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Megaphone size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No announcements yet</p>
              </div>
            ) : (
              announcements.map((announcement: any) => (
                <div key={announcement.id} className={`p-3 rounded-lg border-l-4 ${
                  announcement.priority === 'urgent' ? 'bg-red-50 border-red-500' :
                  announcement.priority === 'high' ? 'bg-amber-50 border-amber-500' :
                  'bg-blue-50 border-blue-500'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-slate-800 text-sm truncate">{announcement.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      announcement.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      announcement.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                      announcement.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>{announcement.priority}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{announcement.content}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(announcement.created_at).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* At Risk Students */}
      {atRiskStudents.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-red-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">Students Needing Attention</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {atRiskStudents.map((student: any, index: number) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-sm">
                  {student.student?.first_name?.[0] || '?'}{student.student?.last_name?.[0] || ''}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">
                    {student.student?.first_name} {student.student?.last_name}
                  </p>
                  <p className="text-xs text-red-600 font-medium">Score: {student.score}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
