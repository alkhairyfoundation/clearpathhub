'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Users, CheckCircle, AlertCircle, Loader2, TrendingUp, BarChart3, GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default function AdminCcrPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ total: 0, submitted: 0, students: 0 });
  const [byType, setByType] = useState<Record<string, { total: number; submitted: number }>>({});
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: allSubs } = await supabase.from('ccr_responses').select('*');
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });

      const subs = allSubs || [];
      setStats({
        total: subs.length,
        submitted: subs.filter(s => s.is_submitted).length,
        students: studentCount || 0,
      });

      const grouped: Record<string, { total: number; submitted: number }> = {};
      for (const s of subs) {
        if (!grouped[s.respondent_type]) grouped[s.respondent_type] = { total: 0, submitted: 0 };
        grouped[s.respondent_type].total++;
        if (s.is_submitted) grouped[s.respondent_type].submitted++;
      }
      setByType(grouped);
      setRecentSubmissions(subs.filter(s => s.is_submitted).slice(-10).reverse());
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="CCR Administration" subtitle="Overview">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div>
      </DashboardLayout>
    );
  }

  const completionRate = stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0;

  return (
    <DashboardLayout
      title="CCR Administration"
      subtitle="ClearPath Child Review - System Overview"><div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary-600 dark:text-primary-400 dark:text-primary-400" />
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{stats.students}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Total Students</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-500 dark:text-blue-400 dark:text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{stats.total}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Total Responses</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{stats.submitted}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Submitted</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-amber-500 dark:text-amber-400 dark:text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{completionRate}%</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Completion Rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-4">By Respondent Type</h3>
          <div className="space-y-3">
            {Object.entries(byType).map(([type, data]) => {
              const rate = data.total > 0 ? Math.round((data.submitted / data.total) * 100) : 0;
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">{type.replace('_', ' ')}</span>
                    <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400">{data.submitted}/{data.total}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${rate}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-4">Recent Submissions</h3>
          {recentSubmissions.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm">No submissions yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentSubmissions.map((sub, i) => (
                <div key={sub.id || i} className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded">
                  <span className="text-slate-600 dark:text-slate-400 dark:text-slate-400 font-mono text-xs">{sub.student_id?.substring(0, 8)}...</span>
                  <span className="capitalize text-slate-700 dark:text-slate-300 dark:text-slate-300">{sub.respondent_type}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">{new Date(sub.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-center">
        <Link href="/admin/ccr/reports" className="btn-primary inline-flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> View Full Reports
        </Link>
      </div>
    </DashboardLayout>
  );
}

