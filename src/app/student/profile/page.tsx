'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Check, AlertCircle, Loader2, Shield, Calendar, BookOpen, Award, TrendingUp, GraduationCap, Hash, ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import type { Student, Class, Attendance, HomeworkSubmission, Result } from '@/types';

export default function StudentProfilePage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [studentInfo, setStudentInfo] = useState<Student | null>(null);
  const [studentClass, setStudentClass] = useState<Class | null>(null);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [homeworkStats, setHomeworkStats] = useState({ submitted: 0, total: 0 });
  const [averageScore, setAverageScore] = useState(0);
  const [recentResults, setRecentResults] = useState<any[]>([]);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchStudentData();
  }, [profile]);

  async function fetchStudentData() {
    if (!profile) return;

    const { data: student } = await supabase.from('students').select('*, class(name, level)').eq('profile_id', profile.id).limit(1).maybeSingle();
    if (student) {
      setStudentInfo(student);
      if (student.class) setStudentClass(student.class);
      if (student.class_id) {
        const [attendanceRes, homeworkRes, resultsRes] = await Promise.all([
          supabase.from('attendance').select('status').eq('student_id', profile!.id),
          supabase.from('homework_submissions').select('id').eq('student_id', profile!.id),
          supabase.from('results').select('*, subject:subjects(name)').eq('student_id', profile!.id).order('created_at', { ascending: false }).limit(5),
        ]);

        if (attendanceRes.data && attendanceRes.data.length > 0) {
          const present = attendanceRes.data.filter((a: any) => a.status === 'present' || a.status === 'late').length;
          setAttendanceRate(Math.round((present / attendanceRes.data.length) * 100));
        }

        const { count: totalHomework } = await supabase.from('homework').select('*', { count: 'exact', head: true }).eq('class_id', student.class_id);
        setHomeworkStats({ submitted: (homeworkRes.data || []).length, total: totalHomework || 0 });

        if (resultsRes.data) {
          setRecentResults(resultsRes.data);
          if (resultsRes.data.length > 0) {
            const avg = Math.round(resultsRes.data.reduce((sum: number, r: any) => sum + r.score, 0) / resultsRes.data.length);
            setAverageScore(avg);
          }
        }
      }
    }
  }

  if (!profile) return null;

  return (
    <DashboardLayout title="My Profile" subtitle="Manage your account and view your academic overview">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">My Profile</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Manage your account and view your academic overview</p>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-violet-600 to-violet-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">{profile.first_name[0]?.toUpperCase()}{profile.last_name[0]?.toUpperCase()}</span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white dark:text-white">{profile.first_name} {profile.last_name}</h2>
          <p className="text-sm text-violet-600 font-medium mt-1">Student</p>
          {studentInfo && <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1">{studentInfo.admission_number}</p>}
          {studentClass && <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">{studentClass.name}</p>}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-900/20 rounded-lg text-center">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400 dark:text-blue-400">{attendanceRate}%</p>
              <p className="text-xs text-blue-500 dark:text-blue-400 dark:text-blue-400">Attendance</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 rounded-lg text-center">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">{averageScore}%</p>
              <p className="text-xs text-emerald-500">Avg Score</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 dark:bg-amber-900/20 rounded-lg text-center">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 dark:text-amber-400">{homeworkStats.submitted}/{homeworkStats.total}</p>
              <p className="text-xs text-amber-500 dark:text-amber-400 dark:text-amber-400">Homework</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 dark:bg-purple-900/20 rounded-lg text-center">
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400 dark:text-purple-400">{recentResults.length}</p>
              <p className="text-xs text-purple-500 dark:text-purple-400 dark:text-purple-400">Results</p>
            </div>
          </div>

          <div className="mt-6 space-y-2 text-left">
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
              <Mail size={16} className="text-slate-400 dark:text-slate-500 dark:text-slate-500 flex-shrink-0" /><span className="truncate">{profile.email}</span>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
                <Phone size={16} className="text-slate-400 dark:text-slate-500 dark:text-slate-500 flex-shrink-0" /><span>{profile.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
              <Calendar size={16} className="text-slate-400 dark:text-slate-500 dark:text-slate-500 flex-shrink-0" /><span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {studentInfo && (
            <div className="card">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><GraduationCap size={20} className="text-violet-600" />Student Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Admission Number</p><p className="font-semibold text-slate-900 dark:text-white dark:text-white flex items-center gap-2"><Hash size={14} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />{studentInfo.admission_number}</p></div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Class</p><p className="font-semibold text-slate-900 dark:text-white dark:text-white flex items-center gap-2"><BookOpen size={14} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />{studentClass?.name || 'N/A'}</p></div>
                {studentInfo.gender && <div className="p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Gender</p><p className="font-semibold text-slate-900 dark:text-white dark:text-white">{studentInfo.gender}</p></div>}
                {studentInfo.date_of_birth && <div className="p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Date of Birth</p><p className="font-semibold text-slate-900 dark:text-white dark:text-white">{new Date(studentInfo.date_of_birth).toLocaleDateString()}</p></div>}
              </div>
            </div>
          )}

          {recentResults.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-violet-600" />Recent Results</h2>
              <div className="space-y-2">
                {recentResults.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white dark:text-white text-sm">{r.subject?.name || `Subject #${r.subject_id?.slice(0, 8)}`}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">{r.exam_type.toUpperCase()} • {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${r.score >= 50 ? 'bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30 text-red-700 dark:text-red-400 dark:text-red-400'}`}>{r.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  </DashboardLayout>
  );
}
