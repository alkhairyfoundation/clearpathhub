'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  GraduationCap,
  Video,
  ClipboardList,
  FileText,
  Award,
  UserCheck,
  Activity,
  QrCode,
  CheckSquare,
  Bell,
  TrendingUp
} from 'lucide-react';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    classes: 0,
    pendingHomework: 0,
    pendingQuizzes: 0,
    sessions: 0,
  });

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') {
      router.push('/login');
      return;
    }
  }, [profile]);

  const quickActions = [
    { label: 'Take Attendance', href: '/teacher/attendance', icon: <UserCheck size={20} />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Scan Student ID', href: '/teacher/scan-id', icon: <QrCode size={20} />, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Record Results', href: '/teacher/results', icon: <Award size={20} />, color: 'bg-purple-50 text-purple-600' },
    { label: 'Behavior Report', href: '/teacher/behavior', icon: <Activity size={20} />, color: 'bg-orange-50 text-orange-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Teacher Dashboard</h1>
          <p className="text-slate-500">Welcome back, {profile?.first_name}!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="text-blue-600" size={24} />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm">My Classes</h3>
          <p className="text-2xl font-bold text-slate-800">{stats.classes}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <FileText className="text-emerald-600" size={24} />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm">Pending Homework</h3>
          <p className="text-2xl font-bold text-slate-800">{stats.pendingHomework}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="text-purple-600" size={24} />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm">Pending Quizzes</h3>
          <p className="text-2xl font-bold text-slate-800">{stats.pendingQuizzes}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Video className="text-orange-600" size={24} />
            </div>
          </div>
          <h3 className="text-slate-600 text-sm">Video Lessons</h3>
          <p className="text-2xl font-bold text-slate-800">{stats.sessions}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className={`p-4 rounded-lg hover:shadow-md transition-shadow ${action.color}`}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-white">
                  {action.icon}
                </div>
                <h3 className="font-medium text-slate-800">{action.label}</h3>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Recent Announcements</h2>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <h3 className="font-medium text-slate-800 mb-1">Urgent: Staff Meeting</h3>
              <p className="text-sm text-slate-600">Tomorrow at 9:00 AM</p>
              <p className="text-xs text-slate-400 mt-2">1 hour ago</p>
            </div>
            <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
              <h3 className="font-medium text-slate-800 mb-1">Exam Schedule</h3>
              <p className="text-sm text-slate-600">Mid-term exams start next week</p>
              <p className="text-xs text-slate-400 mt-2">Yesterday</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}