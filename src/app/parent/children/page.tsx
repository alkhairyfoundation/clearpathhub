'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Award, UserCheck, DollarSign, Bell, BookOpen, TrendingUp, ArrowLeft } from 'lucide-react';

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
        for (const child of data) {
          const [resultsRes, attendanceRes] = await Promise.all([
            supabase.from('results').select('score, subject:subjects!subject_id(name)').eq('student_id', child.profile_id).order('created_at', { ascending: false }).limit(10),
            supabase.from('attendance').select('status').eq('student_id', child.profile_id).order('date', { ascending: false }).limit(30),
          ]);
          const avgScore = resultsRes.data?.length ? Math.round(resultsRes.data.reduce((s: number, r: any) => s + (r.score || 0), 0) / resultsRes.data.length) : 0;
          const attendanceRate = attendanceRes.data?.length ? Math.round((attendanceRes.data.filter((a: any) => a.status === 'present').length / attendanceRes.data.length) * 100) : 0;
          stats[child.id] = { avgScore, attendanceRate, totalResults: resultsRes.data?.length || 0, totalAttendance: attendanceRes.data?.length || 0 };
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

      {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : children.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center"><Users className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No children linked to your account</p><p className="text-sm text-slate-400 mt-1">Contact the school admin to link your children</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((child) => {
            const stats = childStats[child.id] || { avgScore: 0, attendanceRate: 0 };
            return (
              <div key={child.id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold">{child.profile?.first_name?.[0]}{child.profile?.last_name?.[0]}</div>
                  <div><h3 className="font-semibold text-slate-800 text-lg">{child.profile?.first_name} {child.profile?.last_name}</h3><p className="text-sm text-slate-500">{child.admission_number} &bull; {child.class?.name}</p></div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg"><TrendingUp className="mx-auto text-blue-600 mb-1" size={18} /><p className="text-lg font-bold text-slate-800">{stats.avgScore}%</p><p className="text-xs text-slate-500">Average</p></div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg"><UserCheck className="mx-auto text-green-600 mb-1" size={18} /><p className="text-lg font-bold text-slate-800">{stats.attendanceRate}%</p><p className="text-xs text-slate-500">Attendance</p></div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg"><BookOpen className="mx-auto text-purple-600 mb-1" size={18} /><p className="text-lg font-bold text-slate-800">{stats.totalResults}</p><p className="text-xs text-slate-500">Results</p></div>
                </div>
                
                <div className="flex gap-2">
                  <a href={`/parent/progress?child=${child.id}`} className="flex-1 btn-outline text-center py-2">Progress</a>
                  <a href={`/parent/behavior?child=${child.id}`} className="flex-1 btn-outline text-center py-2">Behavior</a>
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