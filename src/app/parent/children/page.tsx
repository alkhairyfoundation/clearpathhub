'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Users, Award, UserCheck, DollarSign, Bell, BookOpen, TrendingUp, ArrowLeft, Brain, FileText, GraduationCap } from 'lucide-react';

function groupBy<T extends Record<string, any>>(arr: T[], key: string): Record<string, T[]> {
  return arr.reduce((acc: Record<string, T[]>, item: T) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

export default function ParentChildrenPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [childStats, setChildStats] = useState<Record<string, any>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, profile:profiles!profile_id(first_name, last_name, email, phone), class:classes!class_id(name)')
        .eq('parent_id', profile?.id)
        .order('admission_number');
      if (error) throw new Error(error.message);
      
      if (data) {
        setChildren(data);
        const stats: Record<string, any> = {};
        const profileIds = data.map(c => c.profile_id);

        if (profileIds.length > 0) {
          const [resultsRes, attendanceRes, quizRes, testRes, homeworkRes] = await Promise.all([
            supabase.from('results').select('student_id, score').in('student_id', profileIds),
            supabase.from('attendance').select('student_id, status').in('student_id', profileIds),
            supabase.from('quiz_attempts').select('student_id, id, score').in('student_id', profileIds),
            supabase.from('test_attempts').select('student_id, id, score').in('student_id', profileIds),
            supabase.from('homework_submissions').select('student_id, id, marks').in('student_id', profileIds),
          ]);

          const resultsByChild = groupBy(resultsRes.data || [], 'student_id');
          const attendanceByChild = groupBy(attendanceRes.data || [], 'student_id');
          const quizByChild = groupBy(quizRes.data || [], 'student_id');
          const testByChild = groupBy(testRes.data || [], 'student_id');
          const homeworkByChild = groupBy(homeworkRes.data || [], 'student_id');

          for (const child of data) {
            const pid = child.profile_id;
            const childResults = resultsByChild[pid] || [];
            const childAttendance = attendanceByChild[pid] || [];
            const avgScore = childResults.length ? Math.round(childResults.reduce((s: number, r: any) => s + (r.score || 0), 0) / childResults.length) : 0;
            const attendanceRate = childAttendance.length ? Math.round((childAttendance.filter((a: any) => a.status === 'present').length / childAttendance.length) * 100) : 0;
            stats[child.id] = {
              avgScore,
              attendanceRate,
              totalResults: childResults.length,
              totalAttendance: childAttendance.length,
              totalQuizzes: (quizByChild[pid] || []).length,
              totalTests: (testByChild[pid] || []).length,
              totalHomework: (homeworkByChild[pid] || []).length,
            };
          }
        }
        setChildStats(stats);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <DashboardLayout title="My Children" subtitle="View your children's information and progress">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">My Children</h1>
              <p className="text-slate-500">View your children&apos;s information and progress</p>
            </div>
          </div>
        </div>

      {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div> : children.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center"><Users className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No children linked to your account</p><p className="text-sm text-slate-400 mt-1">Contact the school admin to link your children</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((child) => {
            const stats = childStats[child.id] || { avgScore: 0, attendanceRate: 0 };
            return (
              <div key={child.id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xl font-bold">{child.profile?.first_name?.[0]}{child.profile?.last_name?.[0]}</div>
                  <div><h3 className="font-semibold text-slate-800 text-lg">{child.profile?.first_name} {child.profile?.last_name}</h3><p className="text-sm text-slate-500">{child.admission_number} &bull; {child.class?.name}</p></div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-3 bg-primary-50 rounded-lg"><TrendingUp className="mx-auto text-primary-600 mb-1" size={18} /><p className="text-lg font-bold text-slate-800">{stats.avgScore}%</p><p className="text-xs text-slate-500">Average</p></div>
                  <div className="text-center p-3 bg-green-50 rounded-lg"><UserCheck className="mx-auto text-green-600 mb-1" size={18} /><p className="text-lg font-bold text-slate-800">{stats.attendanceRate}%</p><p className="text-xs text-slate-500">Attendance</p></div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg"><Brain className="mx-auto text-purple-600 mb-1" size={18} /><p className="text-lg font-bold text-slate-800">{stats.totalQuizzes}</p><p className="text-xs text-slate-500">Quizzes</p></div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg"><BookOpen className="mx-auto text-blue-600 mb-1" size={18} /><p className="text-lg font-bold text-slate-800">{stats.totalTests}</p><p className="text-xs text-slate-500">Tests</p></div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg"><FileText className="mx-auto text-amber-600 mb-1" size={18} /><p className="text-lg font-bold text-slate-800">{stats.totalHomework}</p><p className="text-xs text-slate-500">Homework</p></div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg"><GraduationCap className="mx-auto text-slate-600 mb-1" size={18} /><p className="text-lg font-bold text-slate-800">{stats.totalResults}</p><p className="text-xs text-slate-500">Results</p></div>
                </div>
                
                  <div className="flex gap-2">
                  <Link href={`/parent/progress?child=${child.id}`} className="flex-1 btn-outline text-center py-2">Progress</Link>
                  <Link href={`/parent/behavior?child=${child.id}`} className="flex-1 btn-outline text-center py-2">Behavior</Link>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
