'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Users, GraduationCap, UserCheck, BarChart3, TrendingUp, Calendar, Bell, ArrowRight, BookOpen, Award, Activity, DollarSign, QrCode, Megaphone, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

interface StatsCard {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  icon: React.ReactNode;
  href: string;
  color: string;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ students: 0, teachers: 0, staff: 0, parents: 0, attendance: 0, avgScore: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchDashboard();
  }, [profile]);

  async function fetchDashboard() {
    const [studentsRes, teachersRes, staffRes, attendanceRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'teacher'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'accountant'),
      supabase.from('attendance').select('status, date').order('date', { ascending: false }).limit(7),
    ]);
    
    const present = attendanceRes.data?.filter(a => a.status === 'present').length || 0;
    const total = attendanceRes.data?.length || 0;
    
    setStats({
      students: studentsRes.count || studentsRes.data?.length || 0,
      teachers: teachersRes.count || teachersRes.data?.length || 0,
      staff: staffRes.count || staffRes.data?.length || 0,
      parents: 0,
      attendance: total > 0 ? Math.round((present / total) * 100) : 0,
      avgScore: 75
    });

    setRecentActivity([
      { id: 1, type: 'attendance', message: 'Morning attendance completed', time: '10 min ago', icon: <UserCheck size={16} /> },
      { id: 2, type: 'result', message: 'Grade 10 results uploaded', time: '1 hour ago', icon: <Award size={16} /> },
      { id: 3, type: 'announcement', message: 'New announcement posted', time: '2 hours ago', icon: <Megaphone size={16} /> },
      { id: 4, type: 'homework', message: 'Homework assigned to Grade 9', time: '3 hours ago', icon: <BookOpen size={16} /> },
    ]);

    // Mock attendance trend
    setAttendanceTrend([
      { day: 'Mon', attendance: 92 },
      { day: 'Tue', attendance: 88 },
      { day: 'Wed', attendance: 94 },
      { day: 'Thu', attendance: 91 },
      { day: 'Fri', attendance: 89 },
      { day: 'Sat', attendance: 85 },
      { day: 'Sun', attendance: 0 },
    ]);
  }

  const statsCards: StatsCard[] = [
    { title: 'Total Students', value: stats.students, icon: <GraduationCap size={24} />, href: '/admin/users?role=student', color: 'bg-blue-100 text-blue-600' },
    { title: 'Teachers', value: stats.teachers, icon: <BookOpen size={24} />, href: '/admin/users?role=teacher', color: 'bg-emerald-100 text-emerald-600' },
    { title: 'Staff', value: stats.staff, icon: <UserCheck size={24} />, href: '/admin/users?role=staff', color: 'bg-purple-100 text-purple-600' },
    { title: 'Attendance', value: `${stats.attendance}%`, change: '+2.5%', trend: 'up', icon: <TrendingUp size={24} />, href: '/admin/attendance', color: 'bg-green-100 text-green-600' },
  ];

  const quickActions = [
    { label: 'Generate ID Cards', href: '/admin/id-cards', icon: <Award size={20} />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Staff QR', href: '/admin/staff-qr', icon: <QrCode size={20} />, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Announcements', href: '/admin/announcements', icon: <Megaphone size={20} />, color: 'bg-purple-50 text-purple-600' },
    { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 size={20} />, color: 'bg-orange-50 text-orange-600' },
    { label: 'Settings', href: '/admin/settings', icon: <Settings size={20} />, color: 'bg-gray-100 text-gray-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1><p className="text-slate-500">Welcome back, {profile?.first_name}!</p></div>
        <div className="flex items-center gap-2 text-sm text-slate-500"><Calendar size={18} /><span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <Link key={index} href={card.href} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.color}`}>{card.icon}</div>
              {card.change && <div className={`flex items-center gap-1 text-sm ${card.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>{card.trend === 'up' ? <TrendingUp size={16} /> : null}<span>{card.change}</span></div>}
            </div>
            <h3 className="text-slate-600 text-sm">{card.title}</h3>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Attendance Trend</h2>
            <Link href="/admin/attendance" className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">View all <ArrowRight size={16} /></Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href} className={`p-4 rounded-lg hover:shadow-md transition-shadow ${action.color}`}>
                {action.icon}
                <h3 className="font-medium text-slate-800 mt-2 text-sm">{action.label}</h3>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">{activity.icon}</div>
                <div className="flex-1"><p className="font-medium text-slate-800">{activity.message}</p><p className="text-xs text-slate-500">{activity.time}</p></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Announcements</h2>
            <Link href="/admin/announcements" className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">View all <ArrowRight size={16} /></Link>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <div className="flex items-center justify-between mb-1"><h3 className="font-medium text-slate-800">Urgent: School Closing</h3><span className="text-xs text-red-600">Urgent</span></div>
              <p className="text-sm text-slate-600">School will be closed tomorrow due to...</p>
              <p className="text-xs text-slate-400 mt-2">2 hours ago</p>
            </div>
            <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
              <div className="flex items-center justify-between mb-1"><h3 className="font-medium text-slate-800">Exam Schedule</h3><span className="text-xs text-blue-600">High</span></div>
              <p className="text-sm text-slate-600">Mid-term examination schedule...</p>
              <p className="text-xs text-slate-400 mt-2">Yesterday</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}