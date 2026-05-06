'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Video, FileText, Award, UserCheck, Printer, Bell, TrendingUp } from 'lucide-react';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ sessions: 0, homework: 0, avgScore: 0, attendance: 0 });

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
  }, [profile]);

  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold text-slate-800">Student Dashboard</h1><p className="text-slate-500">Welcome back, {profile?.first_name}!</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6"><div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4"><Video className="text-blue-600" size={24} /></div><h3 className="text-slate-600 text-sm">Video Lessons</h3><p className="text-2xl font-bold text-slate-800">{stats.sessions}</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4"><FileText className="text-emerald-600" size={24} /></div><h3 className="text-slate-600 text-sm">Pending Homework</h3><p className="text-2xl font-bold text-slate-800">{stats.homework}</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4"><Award className="text-purple-600" size={24} /></div><h3 className="text-slate-600 text-sm">Average Score</h3><p className="text-2xl font-bold text-slate-800">{stats.avgScore}%</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4"><UserCheck className="text-orange-600" size={24} /></div><h3 className="text-slate-600 text-sm">Attendance</h3><p className="text-2xl font-bold text-slate-800">{stats.attendance}%</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6"><h2 className="text-lg font-semibold text-slate-800 mb-6">My Progress</h2><div className="space-y-4"><div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><span className="text-slate-600">Academic Performance</span><span className="font-semibold text-green-600">85%</span></div><div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><span className="text-slate-600">Homework Completion</span><span className="font-semibold text-green-600">92%</span></div><div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><span className="text-slate-600">Quiz Average</span><span className="font-semibold text-green-600">88%</span></div></div></div>
        <div className="bg-white rounded-xl shadow-md p-6"><h2 className="text-lg font-semibold text-slate-800 mb-6">Quick Links</h2><div className="grid grid-cols-2 gap-4"><a href="/student/sessions" className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"><Video className="text-blue-600" size={24} /><h3 className="font-medium text-slate-800 mt-2">Video Lessons</h3></a><a href="/student/homework" className="p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"><FileText className="text-emerald-600" size={24} /><h3 className="font-medium text-slate-800 mt-2">Homework</h3></a><a href="/student/results" className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"><Award className="text-purple-600" size={24} /><h3 className="font-medium text-slate-800 mt-2">Results</h3></a><a href="/student/id-card" className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"><Printer className="text-orange-600" size={24} /><h3 className="font-medium text-slate-800 mt-2">My ID Card</h3></a></div></div>
      </div>
    </div>
  );
}