'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Loader2, FileText, Check, X, ExternalLink, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';

export default function ParentTestsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [attemptsByChild, setAttemptsByChild] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    try {
      const { data: students } = await supabase
        .from('students')
        .select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(name)')
        .eq('parent_id', profile?.id);
      if (!students) { setLoading(false); return; }
      setChildren(students);

      const profileIds = students.map(s => s.profile_id);
      if (profileIds.length > 0) {
        const res = await fetch('/api/manage-tests', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list_attempts_by_students', student_ids: profileIds }),
        }).then(r => r.json());

        const grouped: Record<string, any[]> = {};
        (res.attempts || []).forEach((a: any) => {
          if (!grouped[a.student_id]) grouped[a.student_id] = [];
          grouped[a.student_id].push(a);
        });
        setAttemptsByChild(grouped);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Test Reports" subtitle="Children's test results">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Test Reports" subtitle="Review your children's diagnostic test results">
      {error && <div className="text-center py-4 text-red-500 dark:text-red-400 dark:text-red-400">{error}</div>}

      {children.length === 0 ? (
        <div className="text-center py-20 text-slate-500 dark:text-slate-400 dark:text-slate-400">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p>No children found linked to your account.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {children.map(child => {
            const pid = child.profile_id;
            const attempts = attemptsByChild[pid] || [];
            return (
              <div key={child.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-700/50">
                  <h3 className="font-semibold text-slate-900 dark:text-white dark:text-white dark:text-white">
                    {child.profile?.first_name} {child.profile?.last_name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400">
                    {child.class?.name} · {child.admission_number || 'No admission #'}
                  </p>
                </div>
                {attempts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 dark:text-slate-500 dark:text-slate-500 text-sm">No test attempts yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Test</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Score</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Passed</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Date</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Report</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {attempts.map((a: any) => (
                          <tr key={a.id} className="hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700/30">
                            <td className="py-3 px-4 font-medium text-slate-900 dark:text-white dark:text-white dark:text-white">{a.test?.title || 'Unknown Test'}</td>
                            <td className={`py-3 px-4 text-center font-semibold ${a.score >= (a.test?.passing_score || 50) ? 'text-green-600 dark:text-green-400 dark:text-green-400' : 'text-red-600 dark:text-red-400 dark:text-red-400'}`}>{a.score}%</td>
                            <td className="py-3 px-4 text-center">
                              {a.passed ? <Check size={16} className="text-green-500 inline" /> : <X size={16} className="text-red-500 dark:text-red-400 dark:text-red-400 inline" />}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400">{formatDate(a.created_at)}</td>
                            <td className="py-3 px-4 text-center">
                              <Link
                                href={`/student/tests/report/${a.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 dark:text-primary-300 text-xs font-semibold"
                              >
                                View <ExternalLink size={12} />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
